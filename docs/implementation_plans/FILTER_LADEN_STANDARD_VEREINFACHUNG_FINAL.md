# Filter-Laden Standard: Vereinfachung - Finaler Plan

**Datum:** 2025-02-01  
**Problem:** Filter funktionieren erst beim 2. Laden, Workarounds mit Timeouts, Race Conditions  
**Ziel:** Einfacher Standard für Filter-Laden ohne Workarounds  
**WICHTIG:** Default-Filter sind IMMER vorhanden!

---

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

---

## Standard: Einfache Reihenfolge

### Was soll passieren?
1. **Filter laden** (wenn nötig) - async, warten auf `await loadFilters()`
2. **Default-Filter anwenden** (wenn vorhanden) - nach Filter-Laden
3. **Daten laden** (mit oder ohne Filter) - nach Filter-Anwendung
4. **Fertig**

**WICHTIG:** Default-Filter sind IMMER vorhanden → Schritt 2 passiert immer → Schritt 3 passiert immer

---

## Geplante Entfernungen - Analyse

### 1. 800ms Timeout in Requests.tsx (Zeile 571)

**Wann & wofür eingebaut:**
- Datum: 2025-01-30 (REQUESTS_LADEN_FIX_V2)
- Problem: Race Condition - Fallback lädt Daten, bevor SavedFilterTags Default-Filter anwenden kann
- Lösung: 800ms Wartezeit, damit SavedFilterTags Default-Filter anwenden kann

**Wenn entfernt - wie wird das Problem gelöst:**
- Standard: `await loadFilters(tableId)` - warten, bis Filter tatsächlich geladen sind
- Danach Default-Filter anwenden → Daten laden
- Kein Timeout nötig, weil wir auf tatsächliches Laden warten

---

### 2. initialLoadAttemptedRef in Requests.tsx (Zeile 553)

**Wann & wofür eingebaut:**
- Datum: 2025-01-30 (REQUESTS_LADEN_FIX_IMPLEMENTIERT)
- Problem: Doppeltes Laden - Fallback und SavedFilterTags rufen beide `fetchRequests` auf
- Lösung: Ref verhindert, dass Fallback mehrfach ausgelöst wird

**Wenn entfernt - wie wird das Problem gelöst:**
- Standard: Klare Reihenfolge - Filter laden → Default-Filter anwenden → Daten laden
- Default-Filter ist IMMER vorhanden → wird IMMER angewendet → Daten werden geladen
- Kein Fallback nötig → kein doppeltes Laden möglich

---

### 3. Komplexe useEffect-Logik in Requests.tsx (Zeile 561-583)

**Wann & wofür eingebaut:**
- Datum: 2025-01-30 (REQUESTS_LADEN_FIX_IMPLEMENTIERT)
- Problem: Wenn SavedFilterTags keinen Filter anwendet, werden keine Daten geladen
- Lösung: Fallback lädt Daten ohne Filter, wenn nach 800ms kein Filter angewendet wurde

**Wenn entfernt - wie wird das Problem gelöst:**
- Standard: Default-Filter ist IMMER vorhanden → wird IMMER angewendet → Daten werden geladen
- Kein Fallback nötig, weil Default-Filter immer existiert

---

### 4. filterLoadState in SavedFilterTags.tsx (Zeile 100, 222-232)

**Wann & wofür eingebaut:**
- Datum: 2025-01-26 (FILTER_LOAD_LOGIC_KORREKTUR_PLAN)
- Problem: Race Conditions - keine klaren Zustände, Timeout-Workarounds
- Lösung: Zustandsmaschine mit klaren Zuständen ('idle' → 'loading' → 'loaded')

**Wenn entfernt - wie wird das Problem gelöst:**
- Standard: `await loadFilters(tableId)` - warten, bis Filter geladen sind
- Danach Default-Filter anwenden
- Keine Zustandsmaschine nötig, weil wir direkt auf Laden warten

---

## Implementierungsplan

### Phase 1: FilterContext - Promise zurückgeben

**Problem:** `loadFilters` gibt nichts zurück, Komponenten können nicht warten

**Lösung:** `loadFilters` gibt Promise zurück, das resolved wird, wenn Filter im State sind

**Änderung:**
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
      
      // State-Update
      setFilters(prev => ({ ...prev, [tableId]: filtersData }));
      setFilterGroups(prev => ({ ...prev, [tableId]: groupsData }));
      
      // ✅ WICHTIG: Warte auf State-Update (nächster Render-Zyklus)
      await new Promise(resolve => setTimeout(resolve, 0));
      
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

**Hinzufügen:**
```typescript
const loadingPromises = useRef<Record<string, Promise<SavedFilter[]>>>({});
```

---

### Phase 2: Komponenten vereinfachen - Standard-Pattern

**Standard-Pattern für ALLE Komponenten:**

```typescript
useEffect(() => {
  const initialize = async () => {
    // 1. Filter laden
    const filters = await loadFilters(TABLE_ID);
    
    // 2. Default-Filter anwenden (IMMER vorhanden!)
    const defaultFilter = filters.find(f => f.name === defaultFilterName);
    if (defaultFilter) {
      await handleFilterChange(
        defaultFilter.name, 
        defaultFilter.id, 
        defaultFilter.conditions, 
        defaultFilter.operators
      );
      // Daten werden durch handleFilterChange geladen
      return;
    }
    
    // 3. Fallback: Daten ohne Filter laden (sollte nie passieren, weil Default-Filter IMMER vorhanden)
    await fetchData(undefined, undefined);
  };
  
  initialize();
}, []);
```

**Vorteile:**
- ✅ Keine Race Conditions (await auf Filter-Laden)
- ✅ Keine Timeouts (direkte Reihenfolge)
- ✅ Keine Workarounds (einfache Logik)
- ✅ Einheitlich (alle Komponenten gleich)

---

### Phase 3: SavedFilterTags vereinfachen

**Option A: SavedFilterTags bleibt, aber vereinfacht**
- Entferne `filterLoadState` - nicht nötig, wenn Komponenten auf `await loadFilters()` warten
- Default-Filter-Anwendung bleibt in SavedFilterTags
- Komponenten warten auf Filter-Laden, dann wird Default-Filter automatisch angewendet

**Option B: SavedFilterTags wird optional**
- Komponenten wenden Default-Filter selbst an (nach `await loadFilters()`)
- SavedFilterTags nur für UI (Filter-Tags anzeigen)
- Klarere Trennung: Komponenten = Logik, SavedFilterTags = UI

**Empfehlung: Option B** - Klarere Trennung, einfacher zu verstehen

---

### Phase 4: Workarounds entfernen

**Zu entfernen:**
1. ✅ 800ms Timeout in Requests.tsx (Zeile 571)
2. ✅ `initialLoadAttemptedRef` in Requests.tsx (Zeile 553)
3. ✅ Komplexe useEffect-Logik in Requests.tsx (Zeile 561-583)
4. ✅ `filterLoadState` in SavedFilterTags (Zeile 100, 222-232)
5. ✅ Alle Race-Condition-Workarounds

**Ersetzen durch:**
- Standard-Pattern mit `await loadFilters()`
- Klare Reihenfolge: Filter laden → Default-Filter anwenden → Daten laden

---

## Implementierungsreihenfolge

1. ✅ **FilterContext:** `loadFilters` gibt Promise zurück
2. ✅ **Requests.tsx:** Standard-Pattern anwenden, Workarounds entfernen
3. ✅ **Worktracker.tsx:** Standard-Pattern anwenden
4. ✅ **Cerebro.tsx:** Standard-Pattern anwenden
5. ✅ **Alle anderen Komponenten:** Standard-Pattern anwenden
6. ✅ **SavedFilterTags:** Vereinfachen (Option B - nur UI)
7. ✅ **Tests:** Alle Komponenten testen

---

## Standard-Pattern (Final)

```typescript
// Standard-Pattern für ALLE Komponenten mit Filtern
useEffect(() => {
  const initialize = async () => {
    // 1. Filter laden
    const filters = await loadFilters(TABLE_ID);
    
    // 2. Default-Filter anwenden (IMMER vorhanden!)
    const defaultFilter = filters.find(f => f.name === defaultFilterName);
    if (defaultFilter) {
      await handleFilterChange(
        defaultFilter.name, 
        defaultFilter.id, 
        defaultFilter.conditions, 
        defaultFilter.operators
      );
      return; // Daten werden durch handleFilterChange geladen
    }
    
    // 3. Fallback (sollte nie passieren)
    await fetchData(undefined, undefined);
  };
  
  initialize();
}, []);
```

**Das ist alles.** Keine Timeouts, keine Workarounds, keine Race Conditions.

---

## Vorteile

1. ✅ **Einfach:** Klare Reihenfolge, leicht verständlich
2. ✅ **Robust:** Keine Race Conditions, weil wir auf tatsächliches Laden warten
3. ✅ **Einheitlich:** Alle Komponenten verwenden dasselbe Pattern
4. ✅ **Wartbar:** Keine komplexe Logik, keine Workarounds
5. ✅ **Standard-konform:** Folgt React Best Practices (async/await)

---

## Risiken und Mitigation

### Risiko 1: `loadFilters` wird mehrfach aufgerufen

**Problem:** Mehrere Komponenten rufen `loadFilters` gleichzeitig auf

**Mitigation:**
- `loadingPromises` Ref speichert laufende Promises
- Wenn bereits am Laden, wird bestehender Promise zurückgegeben
- Kein doppeltes Laden

### Risiko 2: Default-Filter nicht gefunden

**Problem:** Default-Filter existiert nicht in DB (sollte nie passieren)

**Mitigation:**
- Fallback: Daten ohne Filter laden
- Warnung in Development
- Backend-Garantie: Default-Filter sind IMMER vorhanden

---

## Zusammenfassung

**Was wird geändert:**
1. FilterContext: `loadFilters` gibt Promise zurück
2. Alle Komponenten: Standard-Pattern mit `await loadFilters()`
3. SavedFilterTags: Vereinfacht (nur UI)
4. Alle Workarounds entfernt

**Was bleibt gleich:**
- Filter-Load-Logik über FilterContext
- Default-Filter-Anwendung
- Daten-Load über `handleFilterChange` → `fetchData`
- Infinite Scroll funktioniert weiterhin

**Ergebnis:**
- ✅ Keine Race Conditions
- ✅ Keine Workarounds
- ✅ Einfache, klare Logik
- ✅ Einheitlicher Standard für alle Komponenten

