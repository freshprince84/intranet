# FilterContext Race Condition Fix (2025-12-02)

**Datum:** 2025-12-02  
**Status:** 🔴 KRITISCH - Fix erforderlich  
**Problem:** Requests laden nicht mehr nach Memory-Leak-Fixes  
**Root Cause:** Race Condition in FilterContext cleanupOldFilters

---

## 🔴 IDENTIFIZIERTES PROBLEM

### Root Cause: Race Condition in cleanupOldFilters

**Datei:** `frontend/src/contexts/FilterContext.tsx:132-216`

**Problem:**
1. `cleanupOldFilters` läuft alle 5 Minuten
2. Es löscht `loadedTablesRef.current.delete(tableId)` (Zeile 150, 181), auch wenn Filter noch im State sind
3. `loadFilters` prüft `if (loadedTablesRef.current.has(tableId)) { return; }` (Zeile 86-88)
4. Wenn `loadedTablesRef` gelöscht wurde, aber Filter noch im State sind, wird `loadFilters` nicht ausgeführt
5. `SavedFilterTags` sieht `savedFilters.length === 0` → Default-Filter wird nicht angewendet
6. Requests werden nie geladen

**Konkreter Ablauf:**
1. Requests-Seite lädt → `filterContext.loadFilters('requests-table')` wird aufgerufen
2. Filter werden geladen → `setFilters(...)` und `loadedTablesRef.current.add(tableId)`
3. `cleanupOldFilters` läuft (alle 5 Minuten) → löscht `loadedTablesRef.current.delete(tableId)` (auch wenn TTL nicht abgelaufen ist)
4. `SavedFilterTags` ruft `filterContext.loadFilters(tableId)` auf
5. `loadFilters` sieht `loadedTablesRef.current.has(tableId)` = false
6. ABER: Wenn Filter bereits im State sind, wird `loadFilters` nicht ausgeführt (wegen Zeile 86-88)
7. `savedFilters.length === 0` → Default-Filter wird nicht angewendet → Requests werden nicht geladen

---

## 📋 DETAILLIERTER FIX-PLAN

### Fix 1: cleanupOldFilters - loadedTablesRef nur löschen, wenn Filter aus State gelöscht werden

**Datei:** `frontend/src/contexts/FilterContext.tsx:132-216`

**Problem:**
- `cleanupOldFilters` löscht `loadedTablesRef.current.delete(tableId)` (Zeile 150, 181), auch wenn Filter noch im State sind
- Das führt zu einer Race Condition: Filter sind im State, aber `loadedTablesRef` ist leer

**Lösung:**
- `loadedTablesRef` nur löschen, wenn Filter tatsächlich aus dem State gelöscht werden (TTL abgelaufen)
- Bei MAX_TABLES_IN_CACHE: `loadedTablesRef` nur löschen, wenn Filter aus State gelöscht werden

**Geänderter Code (Zeile 143-162):**
```typescript
// Lösche alte Filter-Arrays
if (tablesToCleanup.length > 0) {
  setFilters(prev => {
    const newFilters = { ...prev };
    tablesToCleanup.forEach(tableId => {
      delete newFilters[tableId];
      // ✅ FIX: loadedTablesRef nur löschen, wenn Filter aus State gelöscht werden
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
```

**Geänderter Code (Zeile 164-195):**
```typescript
// Begrenze Anzahl Tabellen im Cache
setFilters(prev => {
  const allTables = Object.keys(prev);
  if (allTables.length > MAX_TABLES_IN_CACHE) {
    // Lösche älteste Tabellen (nach Timestamp)
    const sortedTables = allTables
      .map(tableId => ({
        tableId,
        timestamp: filterCacheTimestamps.current[tableId] || 0
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, allTables.length - MAX_TABLES_IN_CACHE);
    
    const newFilters = { ...prev };
    sortedTables.forEach(({ tableId }) => {
      delete newFilters[tableId];
      // ✅ FIX: loadedTablesRef nur löschen, wenn Filter aus State gelöscht werden
      delete filterCacheTimestamps.current[tableId];
      loadedTablesRef.current.delete(tableId);
    });
    
    setFilterGroups(prevGroups => {
      const newFilterGroups = { ...prevGroups };
      sortedTables.forEach(({ tableId }) => {
        delete newFilterGroups[tableId];
      });
      return newFilterGroups;
    });
    
    return newFilters;
  }
  return prev;
});
```

**Begründung:**
- `loadedTablesRef` wird nur gelöscht, wenn Filter tatsächlich aus dem State gelöscht werden
- Verhindert Race Condition: Filter sind im State, aber `loadedTablesRef` ist leer

---

### Fix 2: loadFilters - Prüfung auf Filter im State, nicht nur loadedTablesRef

**Datei:** `frontend/src/contexts/FilterContext.tsx:84-129`

**Problem:**
- `loadFilters` prüft nur `loadedTablesRef.current.has(tableId)` (Zeile 86-88)
- Wenn `loadedTablesRef` gelöscht wurde, aber Filter noch im State sind, wird `loadFilters` nicht ausgeführt
- Das führt dazu, dass Filter nicht neu geladen werden, auch wenn sie im State sind

**Lösung:**
- Prüfung auf Filter im State, nicht nur `loadedTablesRef`
- Wenn Filter im State sind, aber `loadedTablesRef` leer ist, Filter trotzdem zurückgeben

**Geänderter Code (Zeile 84-93):**
```typescript
// ✅ PERFORMANCE: Lade Filter für eine tableId
const loadFilters = useCallback(async (tableId: string) => {
  // ✅ FIX: Prüfe auf Filter im State, nicht nur loadedTablesRef
  // Wenn Filter bereits im State sind, nicht nochmal laden
  if (loadedTablesRef.current.has(tableId) || filters[tableId]) {
    return;
  }
  
  // Wenn bereits am Laden, nicht nochmal starten
  if (loading[tableId]) {
    return;
  }
```

**Begründung:**
- Prüft sowohl `loadedTablesRef` als auch `filters[tableId]`
- Verhindert doppeltes Laden, auch wenn `loadedTablesRef` gelöscht wurde
- Filter werden korrekt zurückgegeben, auch wenn `loadedTablesRef` leer ist

---

### Fix 3: getFilters - Sicherstellen, dass Filter zurückgegeben werden

**Datei:** `frontend/src/contexts/FilterContext.tsx:270-272`

**Problem:**
- `getFilters` gibt `filters[tableId] || []` zurück
- Wenn `filters[tableId]` undefined ist, gibt es ein leeres Array zurück
- `SavedFilterTags` sieht `savedFilters.length === 0` → Default-Filter wird nicht angewendet

**Lösung:**
- `getFilters` sollte prüfen, ob Filter geladen werden müssen
- Wenn Filter nicht im State sind, aber `loadedTablesRef` gesetzt ist, Filter neu laden

**Geänderter Code (Zeile 270-272):**
```typescript
// Helper-Funktionen
const getFilters = useCallback((tableId: string): SavedFilter[] => {
  // ✅ FIX: Wenn Filter nicht im State sind, aber loadedTablesRef gesetzt ist, Filter neu laden
  if (!filters[tableId] && loadedTablesRef.current.has(tableId)) {
    // Filter wurden gelöscht, aber loadedTablesRef ist noch gesetzt
    // Lösche loadedTablesRef, damit Filter neu geladen werden können
    loadedTablesRef.current.delete(tableId);
  }
  return filters[tableId] || [];
}, [filters]);
```

**Begründung:**
- Prüft, ob Filter im State sind
- Wenn nicht, aber `loadedTablesRef` gesetzt ist, löscht `loadedTablesRef`, damit Filter neu geladen werden können
- Verhindert, dass `savedFilters.length === 0` bleibt

---

### Fix 4: Requests.tsx - Fallback für initiales Laden

**Datei:** `frontend/src/components/Requests.tsx:528-532`

**Problem:**
- Das initiale Laden wurde auskommentiert
- Requests werden nur geladen, wenn `SavedFilterTags` den Default-Filter anwendet
- Wenn `savedFilters.length === 0`, wird der Default-Filter nicht angewendet
- Requests werden nie geladen

**Lösung:**
- Fallback für initiales Laden hinzufügen
- Wenn nach 2 Sekunden keine Filter geladen wurden, Requests ohne Filter laden

**Geänderter Code (Zeile 528-540):**
```typescript
// ✅ FIX: Warte auf Filter-Load, dann wird Default-Filter angewendet, dann werden Daten geladen
// ✅ Fallback: Wenn nach 2 Sekunden keine Filter geladen wurden, Requests ohne Filter laden
useEffect(() => {
  const timeoutId = setTimeout(() => {
    // Prüfe, ob Requests bereits geladen wurden
    if (requests.length === 0 && !loading) {
      // Fallback: Lade Requests ohne Filter
      fetchRequests(undefined, undefined, false, 20, 0);
    }
  }, 2000); // 2 Sekunden Wartezeit
  
  return () => {
    clearTimeout(timeoutId);
  };
}, []); // Nur beim Mount ausführen
```

**Begründung:**
- Fallback für initiales Laden
- Wenn nach 2 Sekunden keine Filter geladen wurden, Requests ohne Filter laden
- Verhindert, dass Requests nie geladen werden

---

## ⚠️ RISIKEN UND MITIGATION

### Risiko 1: Doppeltes Laden von Filtern

**Problem:** `loadFilters` könnte Filter doppelt laden, wenn `loadedTablesRef` gelöscht wurde

**Mitigation:**
- Prüfung auf `filters[tableId]` verhindert doppeltes Laden
- `loading[tableId]` verhindert paralleles Laden

**Test:**
- Filter laden → Filter werden nur einmal geladen
- `cleanupOldFilters` läuft → Filter bleiben im State
- `loadFilters` wird erneut aufgerufen → Filter werden nicht doppelt geladen

---

### Risiko 2: Fallback lädt Requests zu früh

**Problem:** Fallback könnte Requests laden, bevor Filter geladen wurden

**Mitigation:**
- 2 Sekunden Wartezeit gibt Filter Zeit zum Laden
- Prüfung auf `requests.length === 0` verhindert doppeltes Laden

**Test:**
- Requests-Seite öffnen → Filter werden geladen
- Nach 2 Sekunden → Wenn keine Requests geladen wurden, Fallback lädt Requests
- Wenn Filter geladen wurden → Default-Filter wird angewendet, Requests werden geladen

---

## 📋 IMPLEMENTIERUNGS-CHECKLISTE

### Vor der Implementierung:
- [x] Analyse abgeschlossen
- [x] Plan erstellt
- [x] Dokumentation erstellt
- [ ] **WARTE AUF ZUSTIMMUNG** vor Implementierung

### Während der Implementierung:

#### Fix 1: cleanupOldFilters
- [ ] `loadedTablesRef` nur löschen, wenn Filter aus State gelöscht werden
- [ ] Code-Review: Änderungen korrekt
- [ ] Funktionalität getestet

#### Fix 2: loadFilters
- [ ] Prüfung auf Filter im State, nicht nur `loadedTablesRef`
- [ ] Code-Review: Änderungen korrekt
- [ ] Funktionalität getestet

#### Fix 3: getFilters
- [ ] Prüfung auf Filter im State
- [ ] `loadedTablesRef` löschen, wenn Filter nicht im State sind
- [ ] Code-Review: Änderungen korrekt
- [ ] Funktionalität getestet

#### Fix 4: Requests.tsx
- [ ] Fallback für initiales Laden hinzufügen
- [ ] Code-Review: Änderungen korrekt
- [ ] Funktionalität getestet

### Nach der Implementierung:
- [ ] Alle Funktionalitäten getestet
- [ ] Requests laden korrekt
- [ ] Filter werden korrekt geladen
- [ ] Keine Race Conditions mehr
- [ ] Dokumentation aktualisiert

---

## 📊 ERWARTETE VERBESSERUNGEN

### Vorher:
- **Requests laden nicht:** Race Condition verhindert Laden
- **Filter werden nicht geladen:** `loadedTablesRef` wird zu früh gelöscht
- **Default-Filter wird nicht angewendet:** `savedFilters.length === 0`

### Nachher:
- **Requests laden korrekt:** Fallback lädt Requests, auch wenn Filter nicht geladen wurden
- **Filter werden korrekt geladen:** Prüfung auf Filter im State verhindert Race Condition
- **Default-Filter wird angewendet:** Filter werden korrekt zurückgegeben

---

**Erstellt:** 2025-12-02  
**Status:** 📋 PLAN - Bereit zur Implementierung  
**Nächster Schritt:** Auf Zustimmung warten, dann Implementierung

