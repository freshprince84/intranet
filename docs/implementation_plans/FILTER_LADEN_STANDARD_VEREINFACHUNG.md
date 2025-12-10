# Filter-Laden Standard: Vereinfachung und Langfristige Lösung

**Datum:** 2025-02-01  
**Problem:** Filter funktionieren erst beim 2. Laden, Workarounds mit Timeouts, Race Conditions  
**Ziel:** Einfacher Standard für Filter-Laden ohne Workarounds

## Problem-Analyse

### Aktuelles Problem
- **Race Condition:** `loading` wird `false`, bevor `filters` im State sind
- **Workarounds:** 800ms Timeouts in Requests.tsx
- **Komplexität:** Mehrere useEffect-Hooks, Refs, State-Management
- **Ziel verfehlt:** Wir wollen nur Daten aus DB laden, optional mit Filtern

### Warum ist es so kompliziert?
- FilterContext lädt Filter asynchron
- SavedFilterTags wartet auf Filter-Load-State
- Komponenten warten auf Filter-Load-State
- Race Conditions überall
- Workarounds mit Timeouts

## Standard: Einfache Reihenfolge

### Was soll passieren?
1. **Filter laden** (wenn nötig) - async
2. **Default-Filter anwenden** (wenn vorhanden) - nach Filter-Laden
3. **Daten laden** (mit oder ohne Filter) - nach Filter-Anwendung
4. **Fertig**

### Standard-Definition

**Regel 1: Filter laden**
- Komponente ruft `loadFilters(tableId)` auf
- Wartet auf `await loadFilters(tableId)` oder prüft `filters[tableId]` im State
- Keine Race Conditions, weil wir auf tatsächliche Filter warten

**Regel 2: Default-Filter anwenden**
- Nach Filter-Laden: Prüfe ob Default-Filter existiert
- Wenn ja: Wende an → Daten mit Filter laden
- Wenn nein: Daten ohne Filter laden

**Regel 3: Daten laden**
- Immer nach Filter-Anwendung (oder wenn kein Default-Filter)
- Einfach: `fetchData(filterId, filterConditions)`
- Keine Timeouts, keine Workarounds

## Implementierungsplan

### Phase 1: FilterContext vereinfachen

**Problem:** `setLoading(false)` wird aufgerufen, bevor `setFilters` den State aktualisiert hat

**Lösung:** `loadFilters` gibt Promise zurück, das erst resolved wird, wenn Filter im State sind

```typescript
const loadFilters = useCallback(async (tableId: string): Promise<SavedFilter[]> => {
  // Wenn bereits geladen, sofort zurückgeben
  if (filtersRef.current[tableId]) {
    return filtersRef.current[tableId];
  }
  
  // Wenn bereits am Laden, warte auf bestehenden Promise
  if (loadingPromises.current[tableId]) {
    return loadingPromises.current[tableId];
  }
  
  // Neuer Promise für Laden
  const promise = (async () => {
    try {
      setLoading(prev => ({ ...prev, [tableId]: true }));
      
      const [filtersResponse, groupsResponse] = await Promise.all([
        axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)),
        axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.GROUPS.BY_TABLE(tableId))
      ]);
      
      const filtersData = Array.isArray(filtersResponse.data) 
        ? filtersResponse.data.filter(f => f != null) 
        : [];
      const groupsData = Array.isArray(groupsResponse.data) 
        ? groupsResponse.data.filter(g => g != null) 
        : [];
      
      // ✅ WICHTIG: State-Update und dann warten auf nächsten Render-Zyklus
      setFilters(prev => ({ ...prev, [tableId]: filtersData }));
      setFilterGroups(prev => ({ ...prev, [tableId]: groupsData }));
      
      // ✅ Warte auf State-Update (useEffect würde das automatisch machen, aber wir wollen Promise)
      await new Promise(resolve => setTimeout(resolve, 0)); // Nächster Render-Zyklus
      
      return filtersData;
    } catch (error) {
      setErrors(prev => ({ ...prev, [tableId]: 'Fehler beim Laden der Filter' }));
      return [];
    } finally {
      setLoading(prev => ({ ...prev, [tableId]: false }));
      delete loadingPromises.current[tableId];
    }
  })();
  
  loadingPromises.current[tableId] = promise;
  return promise;
}, []);
```

### Phase 2: Komponenten vereinfachen

**Standard-Pattern für alle Komponenten:**

```typescript
// 1. Filter laden (wenn nötig)
useEffect(() => {
  const initializeFilters = async () => {
    const filters = await loadFilters(TABLE_ID);
    
    // 2. Default-Filter anwenden (wenn vorhanden)
    if (defaultFilterName && filters.length > 0) {
      const defaultFilter = filters.find(f => f.name === defaultFilterName);
      if (defaultFilter) {
        handleFilterChange(defaultFilter.name, defaultFilter.id, defaultFilter.conditions, defaultFilter.operators);
        return; // Daten werden durch handleFilterChange geladen
      }
    }
    
    // 3. Daten ohne Filter laden (wenn kein Default-Filter)
    fetchData(undefined, undefined);
  };
  
  initializeFilters();
}, []);
```

**Vorteile:**
- ✅ Keine Race Conditions (await auf Filter-Laden)
- ✅ Keine Timeouts (direkte Reihenfolge)
- ✅ Keine Workarounds (einfache Logik)
- ✅ Einheitlich (alle Komponenten gleich)

### Phase 3: SavedFilterTags vereinfachen

**Problem:** SavedFilterTags wendet Default-Filter an, aber Komponenten wissen nicht, wann das passiert

**Lösung:** SavedFilterTags wird optional - Komponenten können Default-Filter selbst anwenden

**Oder:** SavedFilterTags gibt Callback zurück, wenn Default-Filter angewendet wurde

**Oder:** SavedFilterTags wird entfernt - Komponenten wenden Default-Filter selbst an

### Phase 4: Workarounds entfernen

**Zu entfernen:**
- ✅ 800ms Timeout in Requests.tsx (Zeile 571)
- ✅ `initialLoadAttemptedRef` in Requests.tsx
- ✅ Komplexe useEffect-Logik in Requests.tsx
- ✅ `filterLoadState` in SavedFilterTags
- ✅ Alle Race-Condition-Workarounds

## Implementierungsreihenfolge

1. ✅ FilterContext: `loadFilters` gibt Promise zurück
2. ✅ Requests.tsx: Vereinfachen nach Standard-Pattern
3. ✅ Worktracker.tsx: Vereinfachen nach Standard-Pattern
4. ✅ Cerebro.tsx: Vereinfachen nach Standard-Pattern
5. ✅ Alle anderen Komponenten: Standard-Pattern anwenden
6. ✅ SavedFilterTags: Vereinfachen oder entfernen
7. ✅ Workarounds entfernen

## Standard-Pattern (Final)

```typescript
// Standard-Pattern für alle Komponenten mit Filtern
useEffect(() => {
  const initialize = async () => {
    // 1. Filter laden
    const filters = await loadFilters(TABLE_ID);
    
    // 2. Default-Filter anwenden (wenn vorhanden)
    if (defaultFilterName) {
      const defaultFilter = filters.find(f => f.name === defaultFilterName);
      if (defaultFilter) {
        await handleFilterChange(defaultFilter.name, defaultFilter.id, defaultFilter.conditions, defaultFilter.operators);
        return; // Daten werden geladen
      }
    }
    
    // 3. Daten ohne Filter laden
    await fetchData(undefined, undefined);
  };
  
  initialize();
}, []);
```

**Das ist alles.** Keine Timeouts, keine Workarounds, keine Race Conditions.

