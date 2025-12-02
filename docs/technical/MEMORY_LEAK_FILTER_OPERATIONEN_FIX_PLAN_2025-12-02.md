# Memory Leak Fix-Plan: Filter-Operationen (2025-12-02)

**Datum:** 2025-12-02  
**Status:** 📋 PLAN - Bereit zur Implementierung  
**Priorität:** 🔴🔴🔴 KRITISCH  
**Problem:** RAM-Verbrauch > 2.1GB bei Filter-Tag-Klicks und Filter-Erstellung  
**Zweck:** Detaillierter Fix-Plan für alle Memory-Leak-Probleme bei Filter-Operationen

---

## 🔴 IDENTIFIZIERTE KRITISCHE PROBLEME

### Problem 1: FilterContext speichert alle Filter dauerhaft (kein Cleanup)

**Datei:** `frontend/src/contexts/FilterContext.tsx`  
**Zeile:** 67-68, 110-111, 146-147

**Problem:**
- `filters` und `filterGroups` sind `Record<string, SavedFilter[]>` → wachsen kontinuierlich
- Bei jedem `refreshFilters()` werden neue Filter-Arrays gespeichert, alte bleiben im Memory
- Kein Cleanup, keine Limits, keine TTL
- Bei vielen Filter-Tag-Klicks: viele `refreshFilters()`-Aufrufe → viele Filter-Arrays im Memory

**Impact:**
- Jeder Filter enthält `conditions[]`, `operators[]`, `sortDirections[]` → kann groß sein
- Bei 10 Tabellen × 20 Filter = 200 Filter-Objekte im Memory
- Jedes Filter-Objekt kann 10-50KB sein → 2-10MB nur für Filter
- Bei vielen Klicks: Filter-Arrays werden mehrfach gespeichert → 20-50MB+ möglich

---

### Problem 2: SavedFilterTags hat 19 console.log Statements (nicht gewrappt)

**Datei:** `frontend/src/components/SavedFilterTags.tsx`  
**Zeile:** 166, 170, 176, 185, 285, 299, 303, und weitere

**Problem:**
- 19 `console.log` Statements (laut grep)
- **NICHT** mit `process.env.NODE_ENV === 'development'` gewrappt
- Browser speichert alle Console-Logs im Memory
- Bei vielen Filter-Tag-Klicks: viele Logs → Memory wächst kontinuierlich

**Impact:**
- Jeder Log-Eintrag bleibt im Memory
- Bei 100 Filter-Klicks: 100+ Log-Einträge → 10-50MB Memory
- Wächst kontinuierlich → kann zu > 100MB werden

---

### Problem 3: FilterPane erstellt viele temporäre Arrays/Strings

**Datei:** `frontend/src/components/FilterPane.tsx`  
**Zeile:** 104-133

**Problem:**
- `useEffect` (Zeile 104-133) verwendet `JSON.stringify()` bei jedem Render
- `JSON.stringify()` erstellt neue Strings → Memory-Leak
- `conditions`, `logicalOperators`, `sortDirections` werden im State gespeichert
- Alte Arrays bleiben im Memory (React State-History)

**Impact:**
- Jede Filter-Änderung erstellt neue Arrays
- Alte Arrays bleiben im Memory (React State-History)
- `JSON.stringify()` erstellt temporäre Strings → Memory-Leak
- Bei vielen Filter-Änderungen: 1-5MB Memory-Leak

---

### Problem 4: Worktracker Cleanup ist unvollständig

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 405-421

**Problem:**
- Cleanup löscht nur `filterConditions` und `reservationFilterConditions`
- **FEHLT:** `filterLogicalOperators`, `filterSortDirections`
- **FEHLT:** `reservationFilterLogicalOperators`, `reservationFilterSortDirections`
- **FEHLT:** `tourFilterConditions`, `tourFilterLogicalOperators`, `tourFilterSortDirections`

**Impact:**
- Filter-States bleiben teilweise im Memory
- Bei vielen Filter-Klicks: Filter-States akkumulieren → 50-200MB Memory-Leak

---

### Problem 5: Keine Limits/TTL für Filter-Cache

**Datei:** `frontend/src/contexts/FilterContext.tsx`  
**Zeile:** 67-68, 73

**Problem:**
- `loadedTablesRef` speichert geladene Tabellen, aber nie Cleanup
- Keine Limits für Anzahl Filter pro Tabelle
- Keine TTL für Filter-Cache
- Filter-Arrays wachsen kontinuierlich

**Impact:**
- Filter-Arrays wachsen kontinuierlich
- Bei vielen Tabellen: viele Filter-Arrays bleiben im Memory
- Kein automatisches Cleanup → Memory-Leak

---

## 📋 DETAILLIERTER IMPLEMENTIERUNGSPLAN

### PHASE 1: FilterContext - Cleanup und Limits hinzufügen

#### Schritt 1.1: TTL und Limits für Filter-Cache

**Datei:** `frontend/src/contexts/FilterContext.tsx`  
**Zeile:** Nach Zeile 73 (nach `loadedTablesRef`)

**Neuer Code (einfügen):**
```typescript
// ✅ MEMORY: TTL und Limits für Filter-Cache
const FILTER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 Minuten
const MAX_FILTERS_PER_TABLE = 50; // Max 50 Filter pro Tabelle
const MAX_TABLES_IN_CACHE = 20; // Max 20 Tabellen im Cache

// Cache-Timestamps für TTL
const filterCacheTimestamps = useRef<Record<string, number>>({});
```

**Begründung:**
- TTL verhindert, dass alte Filter-Arrays ewig im Memory bleiben
- Limits verhindern, dass Filter-Arrays zu groß werden
- Automatisches Cleanup nach TTL

---

#### Schritt 1.2: Cleanup-Funktion für alte Filter

**Datei:** `frontend/src/contexts/FilterContext.tsx`  
**Zeile:** Nach `loadFilters` (nach Zeile 119)

**Neuer Code (einfügen):**
```typescript
// ✅ MEMORY: Cleanup-Funktion für alte Filter
const cleanupOldFilters = useCallback(() => {
  const now = Date.now();
  const tablesToCleanup: string[] = [];
  
  // Finde Tabellen, deren TTL abgelaufen ist
  Object.entries(filterCacheTimestamps.current).forEach(([tableId, timestamp]) => {
    if (now - timestamp > FILTER_CACHE_TTL_MS) {
      tablesToCleanup.push(tableId);
    }
  });
  
  // Lösche alte Filter-Arrays
  if (tablesToCleanup.length > 0) {
    setFilters(prev => {
      const newFilters = { ...prev };
      tablesToCleanup.forEach(tableId => {
        delete newFilters[tableId];
        delete filterCacheTimestamps.current[tableId];
        loadedTablesRef.current.delete(tableId);
      });
      return newFilters;
    });
    
    setFilterGroups(prev => {
      const newFilterGroups = { ...prev };
      tablesToCleanup.forEach(tableId => {
        delete newFilterGroups[tableId];
      });
      return newFilterGroups;
    });
  }
  
  // Begrenze Anzahl Tabellen im Cache
  const allTables = Object.keys(filters);
  if (allTables.length > MAX_TABLES_IN_CACHE) {
    // Lösche älteste Tabellen (nach Timestamp)
    const sortedTables = allTables
      .map(tableId => ({
        tableId,
        timestamp: filterCacheTimestamps.current[tableId] || 0
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, allTables.length - MAX_TABLES_IN_CACHE);
    
    sortedTables.forEach(({ tableId }) => {
      setFilters(prev => {
        const newFilters = { ...prev };
        delete newFilters[tableId];
        return newFilters;
      });
      
      setFilterGroups(prev => {
        const newFilterGroups = { ...prev };
        delete newFilterGroups[tableId];
        return newFilterGroups;
      });
      
      delete filterCacheTimestamps.current[tableId];
      loadedTablesRef.current.delete(tableId);
    });
  }
  
  // Begrenze Anzahl Filter pro Tabelle
  Object.entries(filters).forEach(([tableId, tableFilters]) => {
    if (tableFilters.length > MAX_FILTERS_PER_TABLE) {
      // Behalte nur die neuesten Filter (nach createdAt)
      const sortedFilters = [...tableFilters]
        .sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime; // Neueste zuerst
        })
        .slice(0, MAX_FILTERS_PER_TABLE);
      
      setFilters(prev => ({
        ...prev,
        [tableId]: sortedFilters
      }));
    }
  });
}, [filters]);
```

**Begründung:**
- Automatisches Cleanup für alte Filter-Arrays
- Begrenzt Anzahl Tabellen und Filter pro Tabelle
- Verhindert kontinuierliches Wachstum

---

#### Schritt 1.3: Cleanup-Timer einrichten

**Datei:** `frontend/src/contexts/FilterContext.tsx`  
**Zeile:** Nach `cleanupOldFilters` (neuer useEffect)

**Neuer Code (einfügen):**
```typescript
// ✅ MEMORY: Cleanup-Timer für alte Filter
useEffect(() => {
  // Cleanup alle 5 Minuten
  const cleanupInterval = setInterval(() => {
    cleanupOldFilters();
  }, 5 * 60 * 1000); // 5 Minuten
  
  return () => {
    clearInterval(cleanupInterval);
  };
}, [cleanupOldFilters]);
```

**Begründung:**
- Automatisches Cleanup alle 5 Minuten
- Verhindert, dass Filter-Arrays ewig im Memory bleiben

---

#### Schritt 1.4: Timestamps bei loadFilters und refreshFilters setzen

**Datei:** `frontend/src/contexts/FilterContext.tsx`  
**Zeile:** 110-111 (nach `setFilters` und `setFilterGroups`)

**Geänderter Code:**
```typescript
setFilters(prev => ({ ...prev, [tableId]: filtersData }));
setFilterGroups(prev => ({ ...prev, [tableId]: groupsData }));
// ✅ MEMORY: Timestamp für TTL setzen
filterCacheTimestamps.current[tableId] = Date.now();
loadedTablesRef.current.add(tableId);
```

**Zeile:** 146-147 (nach `setFilters` und `setFilterGroups` in `refreshFilters`)

**Geänderter Code:**
```typescript
setFilters(prev => ({ ...prev, [tableId]: filtersData }));
setFilterGroups(prev => ({ ...prev, [tableId]: groupsData }));
// ✅ MEMORY: Timestamp für TTL aktualisieren
filterCacheTimestamps.current[tableId] = Date.now();
// ✅ Cache zurücksetzen, damit Filter neu geladen werden können
loadedTablesRef.current.delete(tableId);
```

**Begründung:**
- Timestamps ermöglichen TTL-Cleanup
- Aktualisiert Timestamp bei jedem Refresh

---

### PHASE 2: SavedFilterTags - Console.log Statements wrappen

#### Schritt 2.1: Alle console.log Statements wrappen

**Datei:** `frontend/src/components/SavedFilterTags.tsx`  
**Zeile:** 166, 170, 176, 185, 285, 299, 303, und alle weiteren

**Geänderter Code (Beispiel für Zeile 166):**
```typescript
// Vorher:
console.log('🔄 SavedFilterTags: Loading recent clients...');

// Nachher:
if (process.env.NODE_ENV === 'development') {
  console.log('🔄 SavedFilterTags: Loading recent clients...');
}
```

**Alle betroffenen Zeilen:**
- Zeile 166: `console.log('🔄 SavedFilterTags: Loading recent clients...');`
- Zeile 170: `console.log('📋 SavedFilterTags: Recent client names:', clientNames);`
- Zeile 176: `console.error('❌ SavedFilterTags: Error loading recent clients:', error);`
- Zeile 185: `console.log('🔔 SavedFilterTags: Received consultationChanged event');`
- Zeile 285: `console.log('🔄 SavedFilterTags: handleSelectFilter called', {...});`
- Zeile 299: `console.log('📋 SavedFilterTags: Calling onFilterChange (controlled)');`
- Zeile 303: `console.log('📋 SavedFilterTags: Calling onSelectFilter (uncontrolled)');`
- **Und alle weiteren console.log/console.error Statements in der Datei**

**Begründung:**
- Console-Logs werden nur in Development ausgeführt
- Verhindert Memory-Leak durch Console-History in Production
- Reduziert Memory-Verbrauch um 10-50MB

---

### PHASE 3: FilterPane - JSON.stringify optimieren

#### Schritt 3.1: useRef für vorherige Werte verwenden

**Datei:** `frontend/src/components/FilterPane.tsx`  
**Zeile:** 101-102 (vor dem useEffect)

**Geänderter Code:**
```typescript
// Vorher:
const prevSavedConditionsRef = useRef<FilterCondition[] | undefined>(savedConditions);
const prevSavedOperatorsRef = useRef<('AND' | 'OR')[] | undefined>(savedOperators);
const prevSavedSortDirectionsRef = useRef<SortDirection[] | undefined>(savedSortDirections);

// Nachher:
const prevSavedConditionsRef = useRef<FilterCondition[] | undefined>(savedConditions);
const prevSavedOperatorsRef = useRef<('AND' | 'OR')[] | undefined>(savedOperators);
const prevSavedSortDirectionsRef = useRef<SortDirection[] | undefined>(savedSortDirections);

// ✅ MEMORY: Verwende shallow comparison statt JSON.stringify
const areConditionsEqual = (a: FilterCondition[] | undefined, b: FilterCondition[] | undefined): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    return item.column === other.column && 
           item.operator === other.operator && 
           item.value === other.value;
  });
};

const areOperatorsEqual = (a: ('AND' | 'OR')[] | undefined, b: ('AND' | 'OR')[] | undefined): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
};

const areSortDirectionsEqual = (a: SortDirection[] | undefined, b: SortDirection[] | undefined): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    return item.column === other.column && 
           item.direction === other.direction && 
           item.priority === other.priority && 
           item.conditionIndex === other.conditionIndex;
  });
};
```

**Begründung:**
- Shallow comparison statt JSON.stringify → keine temporären Strings
- Verhindert Memory-Leak durch JSON.stringify
- Schneller als JSON.stringify

---

#### Schritt 3.2: useEffect mit shallow comparison

**Datei:** `frontend/src/components/FilterPane.tsx`  
**Zeile:** 104-133 (useEffect)

**Geänderter Code:**
```typescript
useEffect(() => {
  // ✅ MEMORY: Verwende shallow comparison statt JSON.stringify
  const conditionsChanged = !areConditionsEqual(prevSavedConditionsRef.current, savedConditions);
  const operatorsChanged = !areOperatorsEqual(prevSavedOperatorsRef.current, savedOperators);
  const sortDirectionsChanged = !areSortDirectionsEqual(prevSavedSortDirectionsRef.current, savedSortDirections);
  
  if (conditionsChanged && savedConditions) {
    if (savedConditions.length > 0) {
      setConditions(savedConditions);
    } else if (savedConditions.length === 0) {
      // Reset: Setze auf Standard
      setConditions([{ column: '', operator: 'equals', value: null }]);
    }
    prevSavedConditionsRef.current = savedConditions;
  }
  
  if (operatorsChanged && savedOperators !== undefined) {
    setLogicalOperators(savedOperators);
    prevSavedOperatorsRef.current = savedOperators;
  }
  
  if (sortDirectionsChanged && savedSortDirections !== undefined) {
    // Sicherstellen, dass savedSortDirections ein Array ist
    const validSortDirections = Array.isArray(savedSortDirections) 
      ? savedSortDirections 
      : [];
    setSortDirections(validSortDirections);
    prevSavedSortDirectionsRef.current = validSortDirections;
  }
}, [savedConditions, savedOperators, savedSortDirections]);
```

**Begründung:**
- Keine JSON.stringify → keine temporären Strings
- Shallow comparison ist schneller und speichereffizienter
- Verhindert Memory-Leak

---

### PHASE 4: Worktracker - Cleanup vervollständigen

#### Schritt 4.1: Alle Filter-States im Cleanup löschen

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 405-421 (useEffect Cleanup)

**Geänderter Code:**
```typescript
// ✅ MEMORY: Cleanup - Alle großen Arrays beim Unmount löschen
useEffect(() => {
    return () => {
        // Tasks
        setTasks([]);
        
        // Reservations
        setReservations([]);
        
        // Tour Bookings
        setTourBookings([]);
        
        // ✅ MEMORY: Alle Filter-States löschen (vollständig)
        // Tasks Filter
        setFilterConditions([]);
        setFilterLogicalOperators([]);
        setFilterSortDirections([]);
        setActiveFilterName('');
        setSelectedFilterId(null);
        
        // Reservations Filter
        setReservationFilterConditions([]);
        setReservationFilterLogicalOperators([]);
        setReservationFilterSortDirections([]);
        setReservationActiveFilterName('');
        setReservationSelectedFilterId(null);
        
        // Tours Filter (falls vorhanden)
        // Prüfen ob tourFilterConditions existiert, falls ja:
        // setTourFilterConditions([]);
        // setTourFilterLogicalOperators([]);
        // setTourFilterSortDirections([]);
    };
}, []); // Nur beim Unmount ausführen
```

**Begründung:**
- Alle Filter-States werden beim Unmount gelöscht
- Verhindert Memory-Leak durch akkumulierte Filter-States
- Vollständiges Cleanup

---

### PHASE 5: Validierung und Tests

#### Schritt 5.1: Funktionalität prüfen

**Tests:**
1. **FilterContext:**
   - ✅ Filter laden → Filter werden im Cache gespeichert
   - ✅ Filter nach 10 Minuten → Filter werden automatisch gelöscht
   - ✅ Mehr als 20 Tabellen → Älteste Tabellen werden gelöscht
   - ✅ Mehr als 50 Filter pro Tabelle → Älteste Filter werden gelöscht

2. **SavedFilterTags:**
   - ✅ Filter-Tag klicken → Funktioniert weiterhin
   - ✅ Console-Logs → Nur in Development sichtbar
   - ✅ Memory-Verbrauch → Deutlich niedriger

3. **FilterPane:**
   - ✅ Filter erstellen → Funktioniert weiterhin
   - ✅ Filter ändern → Funktioniert weiterhin
   - ✅ Memory-Verbrauch → Keine temporären Strings mehr

4. **Worktracker:**
   - ✅ Filter anwenden → Funktioniert weiterhin
   - ✅ Tab wechseln → Filter-States werden gelöscht
   - ✅ Memory-Verbrauch → Deutlich niedriger

---

#### Schritt 5.2: Memory-Verbrauch prüfen

**Browser DevTools:**
1. Chrome DevTools → Performance → Memory
2. Vor Änderungen: Memory-Snapshot
3. Nach Änderungen: Memory-Snapshot
4. Vergleich: Memory sollte deutlich niedriger sein

**Erwartete Verbesserung:**
- **Vorher:** > 2.1GB RAM bei vielen Filter-Klicks
- **Nachher:** < 500MB RAM (auch bei vielen Filter-Klicks)
- **Reduktion:** ~75% weniger Memory-Verbrauch

---

## ⚠️ RISIKEN UND MITIGATION

### Risiko 1: Filter werden zu früh gelöscht

**Problem:** TTL von 10 Minuten könnte zu kurz sein

**Mitigation:**
- TTL auf 10 Minuten setzen (ausreichend für normale Nutzung)
- Bei Bedarf auf 15-20 Minuten erhöhen
- Cleanup nur für nicht-aktive Tabellen

**Test:**
- Filter laden → Filter bleiben 10 Minuten im Cache
- Nach 10 Minuten → Filter werden automatisch gelöscht
- Beim nächsten Zugriff → Filter werden neu geladen

---

### Risiko 2: Funktionalität wird beeinträchtigt

**Problem:** Cleanup könnte Filter löschen, die noch benötigt werden

**Mitigation:**
- Cleanup nur für nicht-aktive Tabellen
- Filter werden beim nächsten Zugriff neu geladen
- Funktionalität bleibt identisch

**Test:**
- Alle Filter-Funktionen manuell testen
- Prüfen ob Filter korrekt geladen werden

---

### Risiko 3: Shallow comparison ist zu strikt

**Problem:** Shallow comparison könnte Änderungen übersehen

**Mitigation:**
- Shallow comparison prüft alle relevanten Felder
- Bei Bedarf auf deep comparison erweitern
- Testen ob alle Änderungen erkannt werden

**Test:**
- Filter ändern → Änderungen werden erkannt
- Filter anwenden → Funktioniert korrekt

---

## 📋 IMPLEMENTIERUNGS-CHECKLISTE

### Vor der Implementierung:
- [x] Analyse abgeschlossen
- [x] Plan erstellt
- [x] Dokumentation erstellt
- [ ] **WARTE AUF ZUSTIMMUNG** vor Implementierung

### Während der Implementierung:

#### Phase 1: FilterContext
- [ ] Schritt 1.1: TTL und Limits für Filter-Cache hinzufügen
- [ ] Schritt 1.2: Cleanup-Funktion für alte Filter erstellen
- [ ] Schritt 1.3: Cleanup-Timer einrichten
- [ ] Schritt 1.4: Timestamps bei loadFilters und refreshFilters setzen
- [ ] Code-Review: Änderungen korrekt
- [ ] Funktionalität getestet

#### Phase 2: SavedFilterTags
- [ ] Schritt 2.1: Alle console.log Statements wrappen
- [ ] Code-Review: Änderungen korrekt
- [ ] Funktionalität getestet

#### Phase 3: FilterPane
- [ ] Schritt 3.1: useRef für vorherige Werte verwenden
- [ ] Schritt 3.2: useEffect mit shallow comparison
- [ ] Code-Review: Änderungen korrekt
- [ ] Funktionalität getestet

#### Phase 4: Worktracker
- [ ] Schritt 4.1: Alle Filter-States im Cleanup löschen
- [ ] Code-Review: Änderungen korrekt
- [ ] Funktionalität getestet

### Nach der Implementierung:
- [ ] Alle Funktionalitäten getestet
- [ ] Memory-Verbrauch gemessen (vorher/nachher)
- [ ] Browser DevTools: Memory-Snapshots verglichen
- [ ] Dokumentation aktualisiert

---

## 📊 ERWARTETE VERBESSERUNGEN

### Vorher:
- **RAM-Verbrauch:** > 2.1GB bei vielen Filter-Klicks
- **FilterContext:** 20-50MB+ (wächst kontinuierlich)
- **Console-Logs:** 10-50MB (wächst kontinuierlich)
- **FilterPane:** 1-5MB (temporäre Strings)
- **Worktracker:** 50-200MB (unvollständiges Cleanup)

### Nachher:
- **RAM-Verbrauch:** < 500MB (auch bei vielen Filter-Klicks)
- **FilterContext:** 2-10MB (mit TTL und Limits)
- **Console-Logs:** 0MB (nur in Development)
- **FilterPane:** < 1MB (keine temporären Strings)
- **Worktracker:** < 50MB (vollständiges Cleanup)

**Reduktion:**
- **Memory-Verbrauch:** Von > 2.1GB → < 500MB (75% Reduktion)
- **FilterContext:** Von 20-50MB+ → 2-10MB (80% Reduktion)
- **Console-Logs:** Von 10-50MB → 0MB (100% Reduktion)
- **FilterPane:** Von 1-5MB → < 1MB (80% Reduktion)
- **Worktracker:** Von 50-200MB → < 50MB (75% Reduktion)

---

## 📝 DETAILLIERTE CODE-ÄNDERUNGEN

### Änderung 1: FilterContext - TTL und Limits

**Datei:** `frontend/src/contexts/FilterContext.tsx`  
**Zeile:** Nach Zeile 73

**Neuer Code:**
```typescript
// ✅ MEMORY: TTL und Limits für Filter-Cache
const FILTER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 Minuten
const MAX_FILTERS_PER_TABLE = 50; // Max 50 Filter pro Tabelle
const MAX_TABLES_IN_CACHE = 20; // Max 20 Tabellen im Cache

// Cache-Timestamps für TTL
const filterCacheTimestamps = useRef<Record<string, number>>({});
```

---

### Änderung 2: FilterContext - Cleanup-Funktion

**Datei:** `frontend/src/contexts/FilterContext.tsx`  
**Zeile:** Nach `loadFilters` (nach Zeile 119)

**Neuer Code:**
```typescript
// ✅ MEMORY: Cleanup-Funktion für alte Filter
const cleanupOldFilters = useCallback(() => {
  // ... (siehe Schritt 1.2)
}, [filters]);
```

---

### Änderung 3: FilterContext - Cleanup-Timer

**Datei:** `frontend/src/contexts/FilterContext.tsx`  
**Zeile:** Nach `cleanupOldFilters` (neuer useEffect)

**Neuer Code:**
```typescript
// ✅ MEMORY: Cleanup-Timer für alte Filter
useEffect(() => {
  const cleanupInterval = setInterval(() => {
    cleanupOldFilters();
  }, 5 * 60 * 1000); // 5 Minuten
  
  return () => {
    clearInterval(cleanupInterval);
  };
}, [cleanupOldFilters]);
```

---

### Änderung 4: SavedFilterTags - Console.log wrappen

**Datei:** `frontend/src/components/SavedFilterTags.tsx`  
**Zeile:** 166, 170, 176, 185, 285, 299, 303, und alle weiteren

**Geänderter Code (Beispiel):**
```typescript
// Vorher:
console.log('🔄 SavedFilterTags: Loading recent clients...');

// Nachher:
if (process.env.NODE_ENV === 'development') {
  console.log('🔄 SavedFilterTags: Loading recent clients...');
}
```

---

### Änderung 5: FilterPane - Shallow comparison

**Datei:** `frontend/src/components/FilterPane.tsx`  
**Zeile:** 101-102, 104-133

**Geänderter Code:**
```typescript
// Vorher:
const conditionsChanged = JSON.stringify(prevSavedConditionsRef.current) !== JSON.stringify(savedConditions);

// Nachher:
const conditionsChanged = !areConditionsEqual(prevSavedConditionsRef.current, savedConditions);
```

---

### Änderung 6: Worktracker - Cleanup vervollständigen

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 405-421

**Geänderter Code:**
```typescript
// ✅ MEMORY: Cleanup - Alle großen Arrays beim Unmount löschen
useEffect(() => {
    return () => {
        // ... (siehe Schritt 4.1)
    };
}, []);
```

---

## ✅ VALIDIERUNG

### Test 1: FilterContext Funktionalität

**Schritte:**
1. Filter laden → Filter werden im Cache gespeichert
2. Nach 10 Minuten → Filter werden automatisch gelöscht
3. Filter erneut laden → Filter werden neu geladen

**Erwartetes Ergebnis:**
- ✅ Alle Schritte funktionieren
- ✅ Filter werden korrekt gelöscht und neu geladen
- ✅ Funktionalität bleibt identisch

---

### Test 2: SavedFilterTags Funktionalität

**Schritte:**
1. Filter-Tag klicken → Filter wird angewendet
2. Console öffnen → Keine Logs in Production
3. Memory prüfen → Deutlich niedriger

**Erwartetes Ergebnis:**
- ✅ Alle Schritte funktionieren
- ✅ Console-Logs nur in Development
- ✅ Memory-Verbrauch deutlich niedriger

---

### Test 3: FilterPane Funktionalität

**Schritte:**
1. Filter erstellen → Filter wird erstellt
2. Filter ändern → Änderungen werden erkannt
3. Memory prüfen → Keine temporären Strings

**Erwartetes Ergebnis:**
- ✅ Alle Schritte funktionieren
- ✅ Filter werden korrekt erstellt und geändert
- ✅ Memory-Verbrauch deutlich niedriger

---

### Test 4: Worktracker Funktionalität

**Schritte:**
1. Filter anwenden → Filter wird angewendet
2. Tab wechseln → Filter-States werden gelöscht
3. Zurück zum Tab → Filter werden neu geladen

**Erwartetes Ergebnis:**
- ✅ Alle Schritte funktionieren
- ✅ Filter-States werden korrekt gelöscht
- ✅ Funktionalität bleibt identisch

---

### Test 5: Memory-Verbrauch

**Schritte:**
1. Chrome DevTools → Performance → Memory
2. Vor Änderungen: Memory-Snapshot erstellen
3. Viele Filter-Klicks durchführen
4. Nach Änderungen: Memory-Snapshot erstellen
5. Vergleich: Memory sollte deutlich niedriger sein

**Erwartetes Ergebnis:**
- ✅ Memory-Verbrauch < 500MB (vorher: > 2.1GB)
- ✅ Reduktion: ~75% weniger Memory-Verbrauch

---

**Erstellt:** 2025-12-02  
**Status:** 📋 PLAN - Bereit zur Implementierung  
**Nächster Schritt:** Auf Zustimmung warten, dann Implementierung

