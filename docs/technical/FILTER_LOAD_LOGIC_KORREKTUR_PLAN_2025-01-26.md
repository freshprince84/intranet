# Filter-Load-Logik Korrekturplan (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 📋 PLAN - Noch nicht umgesetzt  
**Problem:** Race Conditions und falsche Ladereihenfolge bei Filter-Load  
**Ziel:** Garantierte korrekte Reihenfolge: Filter laden → Default-Filter anwenden → Daten laden

---

## 🔴 IDENTIFIZIERTE PROBLEME

### Problem 1: FilterContext.loadFilters - Inkonsistente Prüfung

**Datei:** `frontend/src/contexts/FilterContext.tsx:84-130`

**Aktueller Code:**
```typescript
const loadFilters = useCallback(async (tableId: string) => {
  // ✅ FIX: Prüfe auf Filter im State, nicht nur loadedTablesRef
  if (loadedTablesRef.current.has(tableId) || filters[tableId]) {
    return; // ❌ PROBLEM: Wenn filters[tableId] existiert, wird nicht geladen
  }
  // ...
}, [loading, filters]);
```

**Problem:**
- Wenn `cleanupOldFilters` Filter aus State löscht, aber `loadedTablesRef` noch gesetzt ist → `loadFilters` wird nicht ausgeführt
- Wenn Filter im State sind, aber `loadedTablesRef` gelöscht wurde → `loadFilters` wird nicht ausgeführt (gut, aber inkonsistent)
- `loadedTablesRef` wird sowohl als "wird gerade geladen" als auch als "wurde geladen" verwendet → Verwirrung

**Root Cause:**
- `loadedTablesRef` wird in `cleanupOldFilters` gelöscht (Zeile 151, 182), auch wenn Filter noch im State sind
- `getFilters` hat bereits einen Fix (Zeile 272-277), aber `loadFilters` prüft nicht konsistent

---

### Problem 2: SavedFilterTags - Fallback-Logik ist fehleranfällig

**Datei:** `frontend/src/components/SavedFilterTags.tsx:224-293`

**Aktueller Code:**
```typescript
useEffect(() => {
  if (defaultFilterName && !defaultFilterAppliedRef.current) {
    // ✅ FIX: Wenn Filter noch laden, warte max 3 Sekunden, dann Fallback
    if (loading) {
      const timeoutId = setTimeout(() => {
        // Nach 3 Sekunden: Fallback ausführen, auch wenn loading noch true ist
        if (!defaultFilterAppliedRef.current && onFilterChange) {
          defaultFilterAppliedRef.current = true;
          onFilterChange('', null, [], [], undefined); // ❌ PROBLEM: Leerer Filter
        }
      }, 3000);
      // ...
    }
    
    // ✅ FIX: Wenn keine Filter geladen wurden, Fallback ausführen
    if (savedFilters.length === 0) {
      // Keine Filter geladen → Fallback: Lade Daten ohne Filter
      if (onFilterChange) {
        defaultFilterAppliedRef.current = true;
        onFilterChange('', null, [], [], undefined); // ❌ PROBLEM: Leerer Filter
      }
      return;
    }
    // ...
  }
}, [loading, savedFilters, defaultFilterName, onFilterChange, onSelectFilter]);
```

**Probleme:**
1. **Timeout von 3 Sekunden:** Workaround, keine Lösung
2. **Fallback bei `savedFilters.length === 0`:** Wird ausgeführt, auch wenn Filter noch laden
3. **Leerer Filter wird angewendet:** `onFilterChange('', null, [], [], undefined)` → lädt ALLE Daten
4. **Keine Garantie:** Es gibt keine Garantie, dass Default-Filter immer angewendet wird

**Root Cause:**
- Keine klare Zustandsmaschine für Filter-Load-Prozess
- Keine Unterscheidung zwischen "Filter laden" und "Filter geladen, aber leer"
- Timeout ist ein Workaround für Race Conditions

---

### Problem 3: Requests.tsx - Keine Garantie für Filter-Anwendung

**Datei:** `frontend/src/components/Requests.tsx:529-530`

**Aktueller Code:**
```typescript
// ✅ FIX: Kein Fallback nötig - SavedFilterTags wendet immer einen Standardfilter an
// ✅ Nur wenn Filter im FilterPane zurückgesetzt wird, werden alle Resultate geladen (dann mit Infinite Scroll)
```

**Problem:**
- Keine Garantie, dass SavedFilterTags den Default-Filter anwendet
- Wenn SavedFilterTags fehlschlägt, werden keine Daten geladen
- Keine Fehlerbehandlung

**Root Cause:**
- Abhängigkeit von SavedFilterTags ohne Fallback
- Keine Zustandsüberwachung für Filter-Anwendung

---

## 📋 KORREKTURPLAN

### Phase 1: FilterContext - Konsistente Prüfung und klare Zustände

#### Schritt 1.1: loadedTablesRef nur als "wird gerade geladen" Flag verwenden

**Ziel:** `loadedTablesRef` sollte nur während des Ladens gesetzt sein, nicht als "wurde geladen" Cache

**Geänderter Code:**
```typescript
const loadFilters = useCallback(async (tableId: string) => {
  // ✅ FIX: Prüfe nur auf Filter im State (Source of Truth)
  // loadedTablesRef wird nur während des Ladens verwendet
  if (filters[tableId]) {
    return; // Filter bereits im State
  }
  
  // Wenn bereits am Laden, nicht nochmal starten
  if (loading[tableId] || loadedTablesRef.current.has(tableId)) {
    return; // Wird bereits geladen
  }
  
  try {
    loadedTablesRef.current.add(tableId); // ✅ Setze Flag: Wird geladen
    setLoading(prev => ({ ...prev, [tableId]: true }));
    setErrors(prev => ({ ...prev, [tableId]: null }));
    
    // ... API-Call ...
    
    setFilters(prev => ({ ...prev, [tableId]: filtersData }));
    setFilterGroups(prev => ({ ...prev, [tableId]: groupsData }));
    filterCacheTimestamps.current[tableId] = Date.now();
    
    // ✅ WICHTIG: loadedTablesRef NICHT hier setzen (nur während Laden)
    // Filter im State sind Source of Truth
  } catch (error) {
    // ...
  } finally {
    loadedTablesRef.current.delete(tableId); // ✅ Entferne Flag: Laden abgeschlossen
    setLoading(prev => ({ ...prev, [tableId]: false }));
  }
}, [loading, filters]);
```

**Begründung:**
- `filters[tableId]` ist Source of Truth
- `loadedTablesRef` wird nur als "wird gerade geladen" Flag verwendet
- Keine Inkonsistenzen mehr zwischen State und Ref

---

#### Schritt 1.2: cleanupOldFilters - loadedTablesRef nicht löschen

**Ziel:** `cleanupOldFilters` sollte `loadedTablesRef` nicht löschen, da es nur während des Ladens verwendet wird

**Geänderter Code:**
```typescript
const cleanupOldFilters = useCallback(() => {
  // ... TTL-Check ...
  
  if (tablesToCleanup.length > 0) {
    setFilters(prev => {
      const newFilters = { ...prev };
      tablesToCleanup.forEach(tableId => {
        delete newFilters[tableId];
        delete filterCacheTimestamps.current[tableId];
        // ✅ FIX: loadedTablesRef NICHT löschen (wird nur während Laden verwendet)
        // Wenn Filter gelöscht werden, wird loadedTablesRef automatisch beim nächsten loadFilters gesetzt
      });
      return newFilters;
    });
    // ...
  }
  
  // ... MAX_TABLES_IN_CACHE ...
  // ✅ FIX: loadedTablesRef NICHT löschen (wird nur während Laden verwendet)
}, []);
```

**Begründung:**
- `loadedTablesRef` wird nur während des Ladens verwendet
- Wenn Filter gelöscht werden, wird `loadedTablesRef` automatisch beim nächsten `loadFilters` gesetzt
- Keine Race Conditions mehr

---

#### Schritt 1.3: getFilters - Vereinfachen

**Ziel:** `getFilters` sollte einfacher sein, da `loadFilters` jetzt konsistent prüft

**Geänderter Code:**
```typescript
const getFilters = useCallback((tableId: string): SavedFilter[] => {
  // ✅ FIX: Vereinfacht - filters[tableId] ist Source of Truth
  // loadedTablesRef wird nur während Laden verwendet, nicht als Cache
  return filters[tableId] || [];
}, [filters]);
```

**Begründung:**
- `loadFilters` prüft jetzt konsistent auf `filters[tableId]`
- `loadedTablesRef` wird nicht mehr als Cache verwendet
- Einfacher und klarer

---

### Phase 2: SavedFilterTags - Klare Zustandsmaschine

#### Schritt 2.1: Zustandsmaschine für Filter-Load-Prozess

**Ziel:** Klare Zustände: "loading" → "loaded" → "defaultFilterApplied"

**Geänderter Code:**
```typescript
// ✅ FIX: Zustandsmaschine für Filter-Load-Prozess
type FilterLoadState = 'idle' | 'loading' | 'loaded' | 'error';

const [filterLoadState, setFilterLoadState] = useState<FilterLoadState>('idle');

useEffect(() => {
  defaultFilterAppliedRef.current = false;
  setFilterLoadState('idle');
  filterContext.loadFilters(tableId);
}, [tableId, filterContext]);

// ✅ FIX: Überwache Filter-Load-Status
useEffect(() => {
  if (loading) {
    setFilterLoadState('loading');
  } else if (error) {
    setFilterLoadState('error');
  } else if (savedFilters.length > 0 || !loading) {
    setFilterLoadState('loaded');
  }
}, [loading, error, savedFilters.length]);
```

**Begründung:**
- Klare Zustände statt Timeout-Workarounds
- Einfacher zu debuggen und zu testen
- Keine Race Conditions mehr

---

#### Schritt 2.2: Default-Filter anwenden - Nur wenn geladen

**Ziel:** Default-Filter nur anwenden, wenn Filter geladen wurden (nicht während Laden)

**Geänderter Code:**
```typescript
// ✅ FIX: Default-Filter nur anwenden, wenn Filter geladen wurden
useEffect(() => {
  // Nur ausführen, wenn:
  // 1. Default-Filter definiert ist
  // 2. Noch nicht angewendet wurde
  // 3. Filter geladen wurden (nicht während Laden)
  if (defaultFilterName && !defaultFilterAppliedRef.current && filterLoadState === 'loaded') {
    // ✅ FIX: Wenn keine Filter geladen wurden, aber State ist "loaded"
    // → Filter existieren nicht in DB → Kein Fallback, einfach keine Filter anwenden
    if (savedFilters.length === 0) {
      // ✅ FIX: Kein Fallback - wenn keine Filter existieren, werden keine angewendet
      // Daten werden ohne Filter geladen (nur wenn explizit zurückgesetzt)
      defaultFilterAppliedRef.current = true;
      return; // Keine Filter → Keine Anwendung
    }
    
    // ✅ Suche nach Default-Filter
    const defaultFilter = savedFilters.find((filter: SavedFilter) => {
      if (!filter || !filter.name) return false;
      if (filter.name === defaultFilterName) return true;
      if (defaultFilterName === 'Aktuell' && (filter.name === 'tasks.filters.current' || filter.name === 'requests.filters.aktuell')) return true;
      if (defaultFilterName === 'Hoy' && (filter.name === 'Heute' || filter.name === 'common.today')) return true;
      return false;
    });
    
    if (defaultFilter) {
      // ✅ Markiere als angewendet, BEVOR onFilterChange aufgerufen wird
      defaultFilterAppliedRef.current = true;
      
      const validSortDirections = Array.isArray(defaultFilter.sortDirections) ? defaultFilter.sortDirections : [];
      if (onFilterChange) {
        onFilterChange(defaultFilter.name, defaultFilter.id, defaultFilter.conditions, defaultFilter.operators, validSortDirections);
      } else {
        onSelectFilter(defaultFilter.conditions, defaultFilter.operators, validSortDirections);
      }
    } else if (defaultFilterName) {
      // ✅ FIX: Wenn Default-Filter nicht gefunden wurde, warnen aber nicht Fallback
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[SavedFilterTags] Default-Filter "${defaultFilterName}" nicht gefunden. Verfügbare Filter:`, savedFilters.map(f => f?.name));
      }
      // ✅ FIX: Kein Fallback - wenn Default-Filter nicht existiert, werden keine angewendet
      // Daten werden ohne Filter geladen (nur wenn explizit zurückgesetzt)
      defaultFilterAppliedRef.current = true;
    }
  }
}, [defaultFilterName, filterLoadState, savedFilters, onFilterChange, onSelectFilter]);
```

**Begründung:**
- Keine Timeouts mehr
- Klare Zustandsprüfung: Nur wenn `filterLoadState === 'loaded'`
- Keine Fallbacks, die alle Daten laden
- Wenn keine Filter existieren → keine Anwendung (nicht alle Daten laden)

---

### Phase 3: Requests.tsx - Garantie für Filter-Anwendung

#### Schritt 3.1: Überwachung der Filter-Anwendung

**Ziel:** Überwache, ob Default-Filter angewendet wurde, und lade Daten nur dann

**Geänderter Code:**
```typescript
// ✅ FIX: Überwache Filter-Anwendung
const [filterApplied, setFilterApplied] = useState(false);

// ✅ FIX: Überwache, ob Filter angewendet wurde
useEffect(() => {
  // Wenn selectedFilterId oder filterConditions gesetzt sind, wurde Filter angewendet
  if (selectedFilterId !== null || filterConditions.length > 0) {
    setFilterApplied(true);
  }
}, [selectedFilterId, filterConditions.length]);

// ✅ FIX: Lade Daten nur, wenn Filter angewendet wurde ODER explizit zurückgesetzt
// ABER: SavedFilterTags sollte immer einen Default-Filter anwenden
// Wenn nach 5 Sekunden kein Filter angewendet wurde, warnen (nur in Development)
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    const timeoutId = setTimeout(() => {
      if (!filterApplied && requests.length === 0) {
        console.warn('[Requests] Kein Filter wurde angewendet nach 5 Sekunden. Möglicherweise fehlt Default-Filter in SavedFilterTags.');
      }
    }, 5000);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }
}, [filterApplied, requests.length]);
```

**Begründung:**
- Keine automatischen Fallbacks mehr
- Nur Warnung in Development, wenn Filter nicht angewendet wurde
- SavedFilterTags sollte immer einen Default-Filter anwenden

---

## ✅ ERGEBNIS NACH KORREKTUR

### Korrekte Reihenfolge:

1. **SavedFilterTags mountet** → `filterContext.loadFilters(tableId)` wird aufgerufen
2. **FilterContext lädt Filter** → `setFilters(...)` → `filterLoadState = 'loaded'`
3. **SavedFilterTags erkennt "loaded"** → Sucht Default-Filter → Wendet an → `onFilterChange(...)`
4. **Requests.tsx erhält Filter-Change** → `handleFilterChange(...)` → `fetchRequests(...)` mit Filter
5. **Daten werden geladen** → Nur gefilterte Daten

### Keine Race Conditions mehr:

- ✅ Keine Timeouts mehr
- ✅ Klare Zustandsmaschine
- ✅ Keine Fallbacks, die alle Daten laden
- ✅ Konsistente Prüfung in FilterContext

### Fehlerbehandlung:

- ✅ Wenn keine Filter existieren → Keine Anwendung (nicht alle Daten laden)
- ✅ Wenn Default-Filter nicht gefunden → Warnung (nur Development), keine Anwendung
- ✅ Wenn Filter-Load fehlschlägt → Error-State, keine Anwendung

---

## ⚠️ RISIKEN UND MITIGATION

### Risiko 1: Wenn keine Filter existieren, werden keine Daten geladen

**Problem:** Wenn `savedFilters.length === 0`, wird kein Filter angewendet → Keine Daten werden geladen

**Mitigation:**
- ✅ **KORREKT:** Wenn keine Filter existieren, sollten Daten explizit über FilterPane zurückgesetzt werden
- ✅ **KORREKT:** Default-Filter sollte immer in DB existieren (Backend-Garantie)
- ✅ **FALLBACK:** Nur wenn explizit zurückgesetzt, werden alle Daten geladen (mit Infinite Scroll)

**Test:**
- Filter existieren → Default-Filter wird angewendet → Daten werden geladen ✅
- Keine Filter existieren → Keine Anwendung → Keine Daten (korrekt) ✅
- Filter zurückgesetzt → Alle Daten werden geladen (mit Infinite Scroll) ✅

---

### Risiko 2: Wenn Default-Filter nicht gefunden wird, werden keine Daten geladen

**Problem:** Wenn Default-Filter nicht in `savedFilters` gefunden wird, wird kein Filter angewendet → Keine Daten werden geladen

**Mitigation:**
- ✅ **KORREKT:** Default-Filter sollte immer in DB existieren (Backend-Garantie)
- ✅ **WARNUNG:** Nur in Development warnen, nicht in Production
- ✅ **FALLBACK:** Nur wenn explizit zurückgesetzt, werden alle Daten geladen

**Test:**
- Default-Filter existiert → Wird angewendet → Daten werden geladen ✅
- Default-Filter fehlt → Warnung (Development) → Keine Anwendung → Keine Daten (korrekt) ✅

---

## 📝 ZUSAMMENFASSUNG

### Was wird geändert:

1. **FilterContext.tsx:**
   - `loadedTablesRef` wird nur als "wird gerade geladen" Flag verwendet
   - `loadFilters` prüft nur auf `filters[tableId]` (Source of Truth)
   - `cleanupOldFilters` löscht `loadedTablesRef` nicht mehr

2. **SavedFilterTags.tsx:**
   - Zustandsmaschine für Filter-Load-Prozess
   - Keine Timeouts mehr
   - Keine Fallbacks, die alle Daten laden
   - Default-Filter wird nur angewendet, wenn Filter geladen wurden

3. **Requests.tsx:**
   - Keine automatischen Fallbacks mehr
   - Nur Warnung in Development, wenn Filter nicht angewendet wurde

### Was bleibt gleich:

- ✅ Filter-Load-Logik über FilterContext
- ✅ Default-Filter-Anwendung über SavedFilterTags
- ✅ Daten-Load über `handleFilterChange` → `fetchRequests`
- ✅ Infinite Scroll funktioniert weiterhin

### Vorteile:

- ✅ Keine Race Conditions mehr
- ✅ Klare Zustandsmaschine
- ✅ Keine unnötigen API-Calls
- ✅ Keine unnötige Datenübertragung
- ✅ Bessere Fehlerbehandlung
- ✅ Einfacher zu debuggen und zu testen

---

**Nächste Schritte:**
1. Plan prüfen und bestätigen
2. Umsetzung in 3 Phasen
3. Tests durchführen
4. Dokumentation aktualisieren

