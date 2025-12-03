# KRITISCH: Requests laden nicht mehr - Fix

**Datum:** 2025-01-30
**Status:** ✅ BEHOBEN
**Priorität:** 🔴🔴🔴 KRITISCH

---

## 🔴 IDENTIFIZIERTE PROBLEME

### Problem 1: `handleFilterChange` akzeptiert keinen `sortDirections` Parameter mehr

**Datei:** `frontend/src/components/Requests.tsx:649`

**Problem:**
- `SavedFilterTags` ruft `onFilterChange` mit `sortDirections` Parameter auf (Zeile 289)
- `handleFilterChange` akzeptiert keinen `sortDirections` Parameter mehr (nach Phase 1)
- TypeScript-Fehler: Parameter-Anzahl stimmt nicht überein

**Lösung:**
- `sortDirections` Parameter zu `handleFilterChange` hinzugefügt (wird ignoriert, aber für Kompatibilität nötig)

**Code-Änderung:**
```typescript
// Vorher:
const handleFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {

// Nachher:
const handleFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: any) => {
```

---

### Problem 2: Initiales Laden von Requests fehlt

**Datei:** `frontend/src/components/Requests.tsx:508-509`

**Problem:**
- Fallback-Timeout wurde in Phase 3 entfernt (Zeile 508)
- Kein initiales `useEffect`, das Requests lädt, wenn Komponente mountet
- Requests werden nur geladen, wenn ein Filter angewendet wird
- Wenn keine Filter existieren oder Default-Filter nicht gefunden wird, werden keine Requests geladen

**Lösung:**
- Initiales Laden hinzugefügt: Warte auf Filter-Load, dann Fallback wenn kein Filter angewendet wurde

**Code-Änderung:**
```typescript
// ✅ FIX: Initiales Laden von Requests (wenn keine Filter existieren oder wenn Filter geladen wurden)
const filterContext = useFilterContext();
const filtersLoading = filterContext.isLoading(REQUESTS_TABLE_ID);

useEffect(() => {
  // Lade Filter für Requests-Tabelle
  filterContext.loadFilters(REQUESTS_TABLE_ID);
}, [filterContext]);

// ✅ FIX: Initiales Laden von Requests (wenn Filter geladen wurden, aber kein Default-Filter angewendet wurde)
useEffect(() => {
  // Nur ausführen, wenn:
  // 1. Filter nicht mehr am Laden sind
  // 2. Keine Requests geladen wurden (requests.length === 0)
  // 3. Nicht bereits am Laden (loading === false)
  // 4. Kein Filter ausgewählt wurde (selectedFilterId === null)
  if (!filtersLoading && requests.length === 0 && !loading && selectedFilterId === null && filterConditions.length === 0) {
    // Warte 500ms, damit SavedFilterTags Zeit hat, Default-Filter anzuwenden
    const timeoutId = setTimeout(() => {
      // Prüfe nochmal, ob inzwischen ein Filter angewendet wurde
      if (selectedFilterId === null && filterConditions.length === 0 && requests.length === 0) {
        // Fallback: Lade Requests ohne Filter
        fetchRequests(undefined, undefined, false, 20, 0);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }
}, [filtersLoading, requests.length, loading, selectedFilterId, filterConditions.length, fetchRequests]);
```

---

## ✅ BEHOBEN

1. ✅ `handleFilterChange` akzeptiert jetzt `sortDirections` Parameter (wird ignoriert)
2. ✅ Initiales Laden von Requests hinzugefügt (Fallback nach 500ms)
3. ✅ Filter werden automatisch geladen beim Mount

---

## 📋 IMPLEMENTIERUNGS-CHECKLISTE

- [x] `sortDirections` Parameter zu `handleFilterChange` hinzugefügt
- [x] `useFilterContext` importiert
- [x] Initiales Laden von Requests hinzugefügt
- [x] Filter werden automatisch geladen
- [x] Linter-Checks: Keine Fehler

---

## ⚠️ RISIKEN UND MITIGATION

### Risiko 1: Doppeltes Laden von Requests

**Problem:** Fallback könnte Requests laden, während SavedFilterTags bereits einen Filter anwendet

**Mitigation:**
- 500ms Wartezeit gibt SavedFilterTags Zeit, Default-Filter anzuwenden
- Prüfung auf `selectedFilterId === null` und `filterConditions.length === 0` verhindert doppeltes Laden
- Prüfung auf `requests.length === 0` verhindert Laden, wenn bereits Daten vorhanden sind

### Risiko 2: Race Condition zwischen Filter-Load und Requests-Load

**Problem:** Requests könnten geladen werden, bevor Filter geladen wurden

**Mitigation:**
- Prüfung auf `!filtersLoading` verhindert Laden, während Filter noch geladen werden
- SavedFilterTags wendet Default-Filter an, sobald Filter geladen wurden

---

**Erstellt:** 2025-01-30
**Status:** ✅ BEHOBEN

