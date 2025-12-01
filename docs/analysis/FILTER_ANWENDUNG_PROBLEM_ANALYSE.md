# Filter-Anwendungsproblem - Detaillierte Analyse

**Datum:** 2025-01-26  
**Problem:** Filter werden nicht mehr angewendet, wenn ein gespeicherter Filter im FilterPane erweitert wird (weitere Filterzeile hinzufügen) und dann angewendet wird.

## Problembeschreibung

### Szenario
1. Benutzer lädt einen gespeicherten Filter (z.B. über SavedFilterTags)
2. Benutzer erweitert den Filter (fügt eine weitere Filterzeile hinzu)
3. Benutzer klickt auf "Anwenden" (Checkmark-Button)
4. **Erwartung:** Filter wird angewendet und Daten werden gefiltert
5. **Tatsächliches Verhalten:** Nichts passiert, Filter wird nicht angewendet

## Technische Analyse

### 1. Filter-Ladevorgang (funktioniert)

**Datei:** `frontend/src/components/Requests.tsx` (Zeile 760-776)

```typescript
const handleFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<...>) => {
  setActiveFilterName(name);
  setSelectedFilterId(id);
  applyFilterConditions(conditions, operators, sortDirections);
  setSortConfig({ key: 'dueDate', direction: 'asc' });
  
  // ✅ PAGINATION: Filter zurücksetzen - lade erste 20 Items
  if (id) {
    await fetchRequests(id, undefined, false, 20, 0);
  } else if (conditions.length > 0) {
    await fetchRequests(undefined, conditions, false, 20, 0);
  } else {
    await fetchRequests(undefined, undefined, false, 20, 0);
  }
};
```

**Funktioniert korrekt:** Wenn ein gespeicherter Filter geladen wird, wird `handleFilterChange` aufgerufen, das:
- States setzt (`setActiveFilterName`, `setSelectedFilterId`, `applyFilterConditions`)
- Daten neu lädt (`fetchRequests`)

### 2. Filter-Erweiterung (funktioniert)

**Datei:** `frontend/src/components/FilterPane.tsx` (Zeile 208-215)

```typescript
const handleAddCondition = () => {
  setConditions([...conditions, { column: '', operator: 'equals', value: null }]);
  
  // Füge standardmäßig einen AND-Operator hinzu
  if (conditions.length > 0) {
    setLogicalOperators([...logicalOperators, 'AND']);
  }
};
```

**Funktioniert korrekt:** Neue Filterzeile wird zum lokalen State hinzugefügt.

### 3. Filter-Anwendung (PROBLEM)

**Datei:** `frontend/src/components/FilterPane.tsx` (Zeile 318-322)

```typescript
const handleApplyFilters = () => {
  // Nur gültige Bedingungen senden (bei denen mindestens eine Spalte ausgewählt ist)
  const validConditions = conditions.filter(c => c.column !== '');
  onApply(validConditions, logicalOperators);
};
```

**Problem:** `onApply` wird aufgerufen, aber:

**Datei:** `frontend/src/components/Requests.tsx` (Zeile 741-749)

```typescript
const applyFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<...>) => {
  setFilterConditions(conditions);
  setFilterLogicalOperators(operators);
  if (sortDirections !== undefined) {
    const validSortDirections = Array.isArray(sortDirections) ? sortDirections : [];
    setFilterSortDirections(validSortDirections);
  }
};
```

**Problem identifiziert:**
1. `applyFilterConditions` setzt nur die States (`setFilterConditions`, `setFilterLogicalOperators`, `setFilterSortDirections`)
2. **KEIN** `fetchRequests` wird aufgerufen
3. **KEIN** `setSelectedFilterId(null)` wird aufgerufen (wichtig!)
4. **KEIN** `useEffect` reagiert auf Änderungen von `filterConditions` und lädt Daten neu

### 4. Datenfilterung (PROBLEM)

**Datei:** `frontend/src/components/Requests.tsx` (Zeile 782-806)

```typescript
const filteredAndSortedRequests = useMemo(() => {
  // ✅ FAKT: Wenn selectedFilterId gesetzt ist, wurden Requests bereits server-seitig gefiltert
  // ✅ FAKT: Wenn filterConditions gesetzt sind (ohne selectedFilterId), wurden Requests bereits server-seitig gefiltert
  // ✅ NUR searchTerm wird client-seitig gefiltert (nicht server-seitig)
  const requestsToFilter = requests;
  
  return requestsToFilter
    .filter(request => {
      // ✅ NUR Globale Suchfunktion (searchTerm) wird client-seitig angewendet
      if (searchTerm) {
        // ... searchTerm-Filterung ...
      }
      
      // ❌ ENTFERNEN: Client-seitige Filterung wenn selectedFilterId oder filterConditions gesetzt sind
      // ✅ Server hat bereits gefiltert, keine doppelte Filterung mehr
      
      return true;
    })
    // ... Sortierung ...
}, [requests, selectedFilterId, searchTerm, sortConfig, filterSortDirections, viewMode, ...]);
```

**Problem identifiziert:**
- `filteredAndSortedRequests` geht davon aus, dass wenn `selectedFilterId` gesetzt ist, die Daten bereits server-seitig gefiltert wurden
- **ABER:** Wenn ein Filter erweitert wird:
  - `selectedFilterId` bleibt gesetzt (z.B. `5`)
  - `filterConditions` wird aktualisiert (mit neuer Zeile)
  - **ABER:** `fetchRequests` wurde NICHT aufgerufen
  - **ERGEBNIS:** Die Daten wurden NICHT neu geladen, aber `filteredAndSortedRequests` denkt, sie wurden bereits gefiltert

## Root Cause

**Hauptproblem:** Wenn ein gespeicherter Filter erweitert wird und dann angewendet wird:

1. `handleApplyFilters` ruft `onApply(validConditions, logicalOperators)` auf
2. `onApply` ist `applyFilterConditions`, das nur States setzt
3. `selectedFilterId` bleibt gesetzt (z.B. `5`)
4. `fetchRequests` wird NICHT aufgerufen
5. `filteredAndSortedRequests` denkt, Daten wurden bereits gefiltert (wegen `selectedFilterId`)
6. **ERGEBNIS:** Keine neuen Daten werden geladen, keine Filterung findet statt

## Betroffene Dateien

### Frontend
1. **`frontend/src/components/FilterPane.tsx`**
   - Zeile 318-322: `handleApplyFilters` ruft nur `onApply` auf
   - Problem: Keine Unterscheidung zwischen "gespeichertem Filter" und "erweitertem Filter"

2. **`frontend/src/components/Requests.tsx`**
   - Zeile 741-749: `applyFilterConditions` setzt nur States, lädt keine Daten
   - Zeile 760-776: `handleFilterChange` lädt Daten, wird aber nicht aufgerufen
   - Zeile 782-806: `filteredAndSortedRequests` geht von bereits gefilterten Daten aus

3. **`frontend/src/pages/Worktracker.tsx`**
   - Zeile 1292-1300: `applyFilterConditions` (gleiches Problem wie Requests.tsx)
   - Zeile 1329-1361: `handleFilterChange` (gleiches Problem wie Requests.tsx)

## Änderungen der letzten 7 Tage

### Relevante Commits
1. **`776203d`** (2025-11-29): "feat: implement infinite scroll and filter fix"
   - Änderungen in `Requests.tsx`: Pagination-Implementierung
   - Möglicherweise Zusammenhang mit Filter-Problem

2. **`e9fbd74`** (2025-11-28): "feat: implement infinite scroll and filter fix"
   - Änderungen in `Worktracker.tsx`: Pagination-Implementierung

### Möglicher Zusammenhang
Die Pagination-Änderungen haben möglicherweise die Filter-Logik beeinflusst:
- Vorher: Alle Daten wurden geladen, client-seitig gefiltert
- Nachher: Pagination mit server-seitiger Filterung
- **Problem:** Wenn Filter erweitert wird, wird `fetchRequests` nicht aufgerufen

## Fehlerstellen

### Fehler 1: `applyFilterConditions` lädt keine Daten
**Datei:** `frontend/src/components/Requests.tsx` (Zeile 741-749)  
**Problem:** Setzt nur States, ruft kein `fetchRequests` auf

### Fehler 2: `handleApplyFilters` unterscheidet nicht zwischen gespeichertem und erweitertem Filter
**Datei:** `frontend/src/components/FilterPane.tsx` (Zeile 318-322)  
**Problem:** Ruft immer nur `onApply` auf, unabhängig davon, ob Filter erweitert wurde

### Fehler 3: `selectedFilterId` wird nicht zurückgesetzt
**Datei:** `frontend/src/components/Requests.tsx` (Zeile 741-749)  
**Problem:** Wenn Filter erweitert wird, sollte `selectedFilterId` auf `null` gesetzt werden, damit `filteredAndSortedRequests` weiß, dass Daten neu geladen werden müssen

### Fehler 4: Kein `useEffect` reagiert auf Filter-Änderungen
**Datei:** `frontend/src/components/Requests.tsx`  
**Problem:** Kein `useEffect` überwacht `filterConditions` und lädt Daten neu, wenn Filter geändert werden

## Zusammenfassung

**Hauptproblem:**
Wenn ein gespeicherter Filter erweitert wird und dann angewendet wird, wird `applyFilterConditions` aufgerufen, das nur States setzt, aber keine Daten neu lädt. `selectedFilterId` bleibt gesetzt, wodurch `filteredAndSortedRequests` denkt, die Daten wurden bereits gefiltert, obwohl sie es nicht wurden.

**Lösungsansatz:**
1. `applyFilterConditions` sollte prüfen, ob Filter erweitert wurde (z.B. durch Vergleich mit `savedConditions`)
2. Wenn Filter erweitert wurde, sollte `selectedFilterId` auf `null` gesetzt werden
3. `fetchRequests` sollte mit den neuen `conditions` aufgerufen werden (ohne `id`)
4. Alternativ: `handleApplyFilters` sollte direkt `handleFilterChange` aufrufen (mit `id = null`)

**Betroffene Komponenten:**
- `Requests.tsx` - Hauptkomponente für Requests
- `Worktracker.tsx` - Tasks und Reservations (2 FilterPane-Instanzen)
- `Cerebro.tsx` - Wiki-Artikel
- `ConsultationList.tsx` - Beratungsstunden
- `InvoiceManagementTab.tsx` - Rechnungen
- `PasswordManagerTab.tsx` - Passwort-Manager
- `BranchManagementTab.tsx` - Filialverwaltung
- `RoleManagementTab.tsx` - Rollenverwaltung
- `ActiveUsersList.tsx` - Aktive Benutzer
- `TodoAnalyticsTab.tsx` - Task-Analytics
- `RequestAnalyticsTab.tsx` - Request-Analytics
- `MyJoinRequestsList.tsx` - Eigene Beitrittsanfragen
- `JoinRequestsList.tsx` - Beitrittsanfragen

**Gesamt:** 14 Komponenten verwenden `FilterPane` mit `onApply={applyFilterConditions}`, alle sind betroffen.

