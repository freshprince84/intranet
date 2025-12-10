# Filter-Laden Analyse - FAKTEN (keine Vermutungen)

**Datum:** 2025-02-01  
**Ziel:** Vollständige Analyse des aktuellen Codes - nur Fakten, keine Vermutungen

---

## 1. FilterContext.tsx - FAKTEN

### Aktuelle Implementierung (Zeile 95-147)

**Fakt 1:** `loadFilters` gibt `Promise<void>` zurück (Zeile 43, 95)
```typescript
const loadFilters = useCallback(async (tableId: string) => {
  // ...
}, []);
```

**Fakt 2:** `loadFilters` setzt `setLoading(false)` im `finally` Block (Zeile 145)
```typescript
} finally {
  loadedTablesRef.current.delete(tableId);
  setLoading(prev => ({ ...prev, [tableId]: false })); // ← HIER
}
```

**Fakt 3:** `setFilters` wird VOR dem `finally` Block aufgerufen (Zeile 132)
```typescript
setFilters(prev => ({ ...prev, [tableId]: filtersData }));
setFilterGroups(prev => ({ ...prev, [tableId]: groupsData }));
// ...
} finally {
  setLoading(prev => ({ ...prev, [tableId]: false })); // ← DANACH
}
```

**Fakt 4:** React State-Updates sind asynchron
- `setFilters` triggert einen Re-Render, aber der State ist nicht sofort verfügbar
- `setLoading(false)` wird im `finally` Block aufgerufen, BEVOR der Re-Render mit `filters` State abgeschlossen ist

**Fakt 5:** Es gibt KEINEN Promise, der resolved wird, wenn Filter im State sind
- `loadFilters` gibt `Promise<void>` zurück, das sofort resolved wird, wenn API-Call fertig ist
- Es gibt KEINEN `loadingPromises` Ref

**Fakt 6:** `getFilters` gibt `filters[tableId] || []` zurück (Zeile 292-296)
```typescript
const getFilters = useCallback((tableId: string): SavedFilter[] => {
  return filters[tableId] || [];
}, [filters]);
```

---

## 2. SavedFilterTags.tsx - FAKTEN

### Aktuelle Implementierung

**Fakt 7:** `savedFilters` kommt aus `filterContext.getFilters(tableId)` (Zeile 89)
```typescript
const savedFilters = filterContext.getFilters(tableId);
```

**Fakt 8:** `loadFilters` wird in `useEffect` aufgerufen (Zeile 212-219)
```typescript
useEffect(() => {
  defaultFilterAppliedRef.current = false;
  setFilterLoadState('idle');
  loadFilters(tableId);
}, [tableId, loadFilters]);
```

**Fakt 9:** `filterLoadState` wird auf 'loaded' gesetzt, wenn `loading === false` (Zeile 222-232)
```typescript
useEffect(() => {
  if (loading) {
    setFilterLoadState('loading');
  } else if (error) {
    setFilterLoadState('error');
  } else {
    setFilterLoadState('loaded'); // ← HIER
  }
}, [loading, error]);
```

**Fakt 10:** Default-Filter wird angewendet, wenn `filterLoadState === 'loaded'` UND `savedFilters.length > 0` (Zeile 236-300)
```typescript
useEffect(() => {
  if (defaultFilterName && !defaultFilterAppliedRef.current && filterLoadState === 'loaded') {
    if (savedFilters.length === 0) {
      // Fallback: onFilterChange('', null, [], [], undefined);
      return;
    }
    // Suche Default-Filter...
  }
}, [defaultFilterName, filterLoadState, savedFilters, onFilterChange, onSelectFilter]);
```

**PROBLEM (Race Condition):**
- `loading === false` bedeutet NICHT, dass `filters[tableId]` im State ist
- `setLoading(false)` wird im `finally` Block aufgerufen, BEVOR `setFilters` den State aktualisiert hat
- Wenn `filterLoadState === 'loaded'` aber `savedFilters.length === 0`, dann wird Fallback ausgeführt
- ABER: `savedFilters.length === 0` kann bedeuten:
  1. Filter sind noch nicht im State (Race Condition) → FALSCHER Fallback
  2. Filter existieren wirklich nicht in DB → RICHTIGER Fallback

**Fakt 11:** `defaultFilterAppliedRef` verhindert mehrfache Anwendung (Zeile 96, 277, 294)

---

## 3. Requests.tsx - FAKTEN

### Aktuelle Implementierung

**Fakt 12:** `loadFilters` wird in `useEffect` aufgerufen (Zeile 555-558)
```typescript
useEffect(() => {
  loadFilters(REQUESTS_TABLE_ID);
}, [loadFilters]);
```

**Fakt 13:** 800ms Timeout-Workaround (Zeile 561-583)
```typescript
useEffect(() => {
  if (!filtersLoading && requests.length === 0 && !initialLoadAttemptedRef.current && selectedFilterId === null && filterConditions.length === 0) {
    const timeoutId = setTimeout(() => {
      if (selectedFilterId === null && filterConditions.length === 0 && requests.length === 0 && !initialLoadAttemptedRef.current) {
        initialLoadAttemptedRef.current = true;
        fetchRequests(undefined, undefined, false, 20, 0); // Fallback
      }
    }, 800); // ← WORKAROUND
    return () => clearTimeout(timeoutId);
  }
}, [filtersLoading, requests.length, selectedFilterId, filterConditions.length, fetchRequests]);
```

**Fakt 14:** `initialLoadAttemptedRef` verhindert doppeltes Laden (Zeile 553, 575)

**Fakt 15:** `SavedFilterTags` wird mit `defaultFilterName="Aktuell"` verwendet (Zeile 1181-1189)
```typescript
<SavedFilterTags
  tableId={REQUESTS_TABLE_ID}
  onFilterChange={(name, id, conditions, operators) => handleFilterChange(name, id, conditions, operators)}
  defaultFilterName="Aktuell"
/>
```

**Fakt 16:** `handleFilterChange` ist `async` und lädt Daten (Zeile 726-743)
```typescript
const handleFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
  // ...
  if (id) {
    await fetchRequests(id, undefined, false, 20, 0);
  } else {
    await applyFilterConditions(conditions, operators);
  }
};
```

---

## 4. Worktracker.tsx - FAKTEN

**Fakt 17:** `SavedFilterTags` wird mit `defaultFilterName` verwendet (Zeile 2320-2328, 3645-3653)
```typescript
<SavedFilterTags
  tableId={activeTab === 'todos' ? TODOS_TABLE_ID : RESERVATIONS_TABLE_ID}
  onFilterChange={activeTab === 'todos' ? handleFilterChange : handleReservationFilterChange}
  defaultFilterName={activeTab === 'todos' ? 'Aktuell' : 'Hoy'}
/>
```

**Fakt 18:** Kommentare deaktivieren initialen Filter-Load (Zeile 892-896, 1022-1026)
```typescript
// ✅ Initialer Filter-Load für Reservations - DEAKTIVIERT, da SavedFilterTags den Default-Filter bereits anwendet
// useEffect(() => {
//     // SavedFilterTags übernimmt die Anwendung des Default-Filters
// }, [activeTab]);
```

**Fakt 19:** KEINE explizite `loadFilters`-Aufrufe sichtbar in den ersten 200 Zeilen

---

## 5. Cerebro.tsx - FAKTEN

**Fakt 20:** `SavedFilterTags` wird mit `defaultFilterName="Alle Artikel"` verwendet (Zeile 223-231)
```typescript
<SavedFilterTags
  tableId={CEREBRO_TABLE_ID}
  onFilterChange={handleFilterChange}
  defaultFilterName="Alle Artikel"
/>
```

**Fakt 21:** KEINE explizite `loadFilters`-Aufrufe sichtbar

---

## 6. ConsultationList.tsx - FAKTEN

**Fakt 22:** `SavedFilterTags` wird OHNE `defaultFilterName` verwendet (Zeile 983-990)
```typescript
<SavedFilterTags
  tableId={CONSULTATIONS_TABLE_ID}
  onFilterChange={handleFilterChange}
  // KEIN defaultFilterName
/>
```

**Fakt 23:** Hat eigenen `setInitialFilter` useEffect (Zeile 140-151), der direkt API aufruft
```typescript
const setInitialFilter = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(CONSULTATIONS_TABLE_ID));
    const filters = response.data;
    const heuteFilter = filters.find((f: any) => f.name === t('consultations.filters.today'));
    if (heuteFilter) {
      setActiveFilterName(t('consultations.filters.today'));
      setSelectedFilterId(heuteFilter.id);
      applyFilterConditions(heuteFilter.conditions, heuteFilter.operators);
    }
  } catch (error) {
    console.error('Fehler beim Setzen des initialen Filters:', error);
  }
};
```

---

## PROBLEM-ANALYSE

### Hauptproblem: Race Condition

**Fakt 24:** `FilterContext.loadFilters`:
1. Ruft API auf
2. Setzt `setFilters` (asynchron, triggert Re-Render)
3. Setzt `setLoading(false)` im `finally` Block (BEVOR Re-Render abgeschlossen)

**Fakt 25:** `SavedFilterTags`:
1. Ruft `loadFilters` auf
2. Überwacht `loading` State
3. Wenn `loading === false`, setzt `filterLoadState = 'loaded'`
4. Prüft `savedFilters.length` (kommt aus `getFilters`, das `filters[tableId] || []` zurückgibt)
5. **PROBLEM:** `loading === false` bedeutet NICHT, dass `filters[tableId]` im State ist!

**Fakt 26:** `Requests.tsx`:
1. Ruft `loadFilters` auf
2. Wartet auf `filtersLoading === false`
3. Hat 800ms Timeout-Workaround, um auf `SavedFilterTags` zu warten
4. Fallback lädt Daten ohne Filter, wenn nach 800ms kein Filter angewendet wurde

**Fakt 27:** `Worktracker.tsx`, `Cerebro.tsx`:
- Verlassen sich komplett auf `SavedFilterTags` für Default-Filter-Anwendung
- Keine eigenen Workarounds

---

## WAS WURDE ÜBERSEHEN?

### 1. FilterContext gibt keinen Promise zurück, der auf State-Update wartet

**Fakt:** `loadFilters` gibt `Promise<void>` zurück, das sofort resolved wird, wenn API-Call fertig ist. Es wartet NICHT auf State-Update.

**Problem:** Komponenten können nicht auf tatsächliches Laden warten.

**Lösung:** `loadFilters` muss Promise zurückgeben, das resolved wird, wenn Filter im State sind.

### 2. SavedFilterTags prüft `loading === false` statt `filters[tableId]` im State

**Fakt:** `filterLoadState` wird auf 'loaded' gesetzt, wenn `loading === false`, aber `savedFilters` kann noch leer sein.

**Problem:** Race Condition - `loading === false` bedeutet NICHT, dass Filter im State sind.

**Lösung:** Prüfe `savedFilters.length > 0` ODER warte auf Promise von `loadFilters`.

### 3. Requests.tsx hat 800ms Timeout-Workaround

**Fakt:** 800ms Timeout wartet darauf, dass `SavedFilterTags` Default-Filter anwendet.

**Problem:** Workaround, keine langfristige Lösung.

**Lösung:** Standard-Pattern mit `await loadFilters()`.

### 4. ConsultationList.tsx macht eigenen API-Call

**Fakt:** `setInitialFilter` ruft direkt API auf, statt `FilterContext` zu verwenden.

**Problem:** Inkonsistent - andere Komponenten verwenden `FilterContext`.

**Lösung:** Auch `FilterContext` verwenden.

### 5. Worktracker.tsx und Cerebro.tsx haben keine explizite Filter-Load-Logik

**Fakt:** Verlassen sich komplett auf `SavedFilterTags`.

**Problem:** Wenn `SavedFilterTags` Race Condition hat, funktioniert es nicht.

**Lösung:** Standard-Pattern mit `await loadFilters()`.

---

## WAS IST FALSCH GEPLANT?

### 1. Plan sagt: "`loadFilters` gibt Promise zurück"

**Fakt:** Aktuell gibt `loadFilters` `Promise<void>` zurück, aber es resolved sofort, wenn API-Call fertig ist. Es wartet NICHT auf State-Update.

**Korrektur:** `loadFilters` muss Promise zurückgeben, das resolved wird, wenn Filter im State sind (nächster Render-Zyklus).

### 2. Plan sagt: "Standard-Pattern mit `await loadFilters()`"

**Fakt:** Aktuell können Komponenten nicht auf tatsächliches Laden warten, weil `loadFilters` nicht auf State-Update wartet.

**Korrektur:** `loadFilters` muss Promise zurückgeben, das resolved wird, wenn Filter im State sind.

### 3. Plan sagt: "SavedFilterTags vereinfachen"

**Fakt:** `SavedFilterTags` hat Race Condition, weil es `loading === false` prüft statt `filters[tableId]` im State.

**Korrektur:** `SavedFilterTags` sollte auch auf Promise von `loadFilters` warten ODER `savedFilters.length > 0` prüfen.

### 4. Plan sagt: "Workarounds entfernen"

**Fakt:** Workarounds sind nötig, weil Race Condition existiert.

**Korrektur:** Zuerst Race Condition beheben (FilterContext Promise), dann Workarounds entfernen.

---

## KORREKTE LÖSUNG

### Phase 1: FilterContext - Promise zurückgeben, das auf State-Update wartet

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
      
      // ✅ WICHTIG: Prüfe, ob Filter jetzt im State sind
      // Warte maximal 100ms auf State-Update
      let attempts = 0;
      while (attempts < 10 && !filtersRef.current[tableId]) {
        await new Promise(resolve => setTimeout(resolve, 10));
        attempts++;
      }
      
      return filtersRef.current[tableId] || filtersData;
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

**Interface-Änderung:**
```typescript
interface FilterContextType {
  loadFilters: (tableId: string) => Promise<SavedFilter[]>; // ← GEÄNDERT
  // ...
}
```

### Phase 2: Komponenten - Standard-Pattern

**Standard-Pattern:**
```typescript
useEffect(() => {
  const initialize = async () => {
    // 1. Filter laden (wartet auf State-Update)
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
      return; // Daten werden geladen
    }
    
    // 3. Fallback (sollte nie passieren)
    await fetchData(undefined, undefined);
  };
  
  initialize();
}, []);
```

### Phase 3: SavedFilterTags - Vereinfachen

**Option A:** SavedFilterTags bleibt, aber verwendet auch `await loadFilters()`
**Option B:** SavedFilterTags wird optional - Komponenten wenden Default-Filter selbst an

**Empfehlung: Option B** - Klarere Trennung

### Phase 4: Workarounds entfernen

**Zu entfernen:**
1. ✅ 800ms Timeout in Requests.tsx (Zeile 571)
2. ✅ `initialLoadAttemptedRef` in Requests.tsx (Zeile 553)
3. ✅ Komplexe useEffect-Logik in Requests.tsx (Zeile 561-583)
4. ✅ `filterLoadState` in SavedFilterTags (Zeile 100, 222-232)
5. ✅ `setInitialFilter` in ConsultationList.tsx (Zeile 140-151)

---

## ZUSAMMENFASSUNG

**Was wurde übersehen:**
1. `loadFilters` gibt Promise zurück, aber wartet NICHT auf State-Update
2. `SavedFilterTags` prüft `loading === false` statt `filters[tableId]` im State
3. `ConsultationList.tsx` macht eigenen API-Call
4. Race Condition existiert zwischen `setLoading(false)` und `setFilters`

**Was ist falsch geplant:**
1. Plan sagt "Promise zurückgeben", aber nicht "auf State-Update warten"
2. Plan sagt "Standard-Pattern", aber `loadFilters` wartet nicht auf State-Update
3. Plan sagt "Workarounds entfernen", aber Race Condition muss zuerst behoben werden

**Korrekte Lösung:**
1. `loadFilters` muss Promise zurückgeben, das auf State-Update wartet
2. Komponenten verwenden Standard-Pattern mit `await loadFilters()`
3. SavedFilterTags wird optional oder verwendet auch `await loadFilters()`
4. Workarounds entfernen, nachdem Race Condition behoben ist

