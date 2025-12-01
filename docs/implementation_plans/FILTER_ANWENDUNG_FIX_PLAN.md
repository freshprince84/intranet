# Filter-Anwendungsproblem - Korrekturplan

**Datum:** 2025-01-26  
**Problem:** Filter werden nicht angewendet, wenn ein gespeicherter Filter erweitert wird  
**Ziel:** Filter funktionieren wieder, Performance bleibt gleich oder verbessert sich

## Fakten (nur was im Code steht)

### Fakt 1: FilterPane Schnittstelle
**Datei:** `frontend/src/components/FilterPane.tsx` Zeile 24
- `onApply: (conditions: FilterCondition[], logicalOperators: ('AND' | 'OR')[]) => void`
- **Fakt:** `onApply` hat KEINEN `sortDirections` Parameter

### Fakt 2: handleApplyFilters ruft onApply auf
**Datei:** `frontend/src/components/FilterPane.tsx` Zeile 318-322
```typescript
const handleApplyFilters = () => {
  const validConditions = conditions.filter(c => c.column !== '');
  onApply(validConditions, logicalOperators);
};
```
- **Fakt:** Ruft `onApply` mit nur 2 Parametern auf
- **Fakt:** `sortDirections` wird NICHT übergeben (obwohl im lokalen State vorhanden)

### Fakt 3: applyFilterConditions setzt nur States
**Datei:** `frontend/src/components/Requests.tsx` Zeile 741-749
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
- **Fakt:** Setzt nur States (`setFilterConditions`, `setFilterLogicalOperators`, `setFilterSortDirections`)
- **Fakt:** Ruft KEIN `fetchRequests` auf
- **Fakt:** Ruft KEIN `setSelectedFilterId(null)` auf

### Fakt 4: handleFilterChange lädt Daten
**Datei:** `frontend/src/components/Requests.tsx` Zeile 760-776
```typescript
const handleFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<...>) => {
  setActiveFilterName(name);
  setSelectedFilterId(id);
  applyFilterConditions(conditions, operators, sortDirections);
  setSortConfig({ key: 'dueDate', direction: 'asc' });
  
  if (id) {
    await fetchRequests(id, undefined, false, 20, 0);
  } else if (conditions.length > 0) {
    await fetchRequests(undefined, conditions, false, 20, 0);
  } else {
    await fetchRequests(undefined, undefined, false, 20, 0);
  }
};
```
- **Fakt:** Ruft `applyFilterConditions` UND `fetchRequests` auf
- **Fakt:** Setzt `setSelectedFilterId(id)` - wenn `id` null ist, wird es auf null gesetzt

### Fakt 5: onApply ist applyFilterConditions
**Datei:** `frontend/src/components/Requests.tsx` Zeile 1289
- **Fakt:** `onApply={applyFilterConditions}` - ruft nur `applyFilterConditions` auf, nicht `handleFilterChange`

### Fakt 6: filteredAndSortedRequests Logik
**Datei:** `frontend/src/components/Requests.tsx` Zeile 783-785
```typescript
// ✅ FAKT: Wenn selectedFilterId gesetzt ist, wurden Requests bereits server-seitig gefiltert
// ✅ FAKT: Wenn filterConditions gesetzt sind (ohne selectedFilterId), wurden Requests bereits server-seitig gefiltert
```
- **Fakt:** Kommentar sagt, dass wenn `selectedFilterId` gesetzt ist, Daten bereits gefiltert wurden
- **Fakt:** Wenn Filter erweitert wird, bleibt `selectedFilterId` gesetzt, aber Daten wurden NICHT neu geladen

### Fakt 7: SavedFilterTags verwendet beide Funktionen
**Datei:** `frontend/src/components/Requests.tsx` Zeile 1304-1308
- **Fakt:** `onSelectFilter` ruft `applyFilterConditions` auf (ohne Daten zu laden)
- **Fakt:** `onFilterChange` ruft `handleFilterChange` auf (mit Daten laden)

## Root Cause (basierend auf Fakten)

**Problem:** Wenn ein gespeicherter Filter erweitert wird und dann angewendet wird:
1. `handleApplyFilters` ruft `onApply(validConditions, logicalOperators)` auf
2. `onApply` ist `applyFilterConditions`, das nur States setzt
3. `selectedFilterId` bleibt gesetzt (z.B. `5`)
4. `fetchRequests` wird NICHT aufgerufen
5. `filteredAndSortedRequests` denkt, Daten wurden bereits gefiltert (wegen `selectedFilterId`)
6. **Ergebnis:** Keine neuen Daten werden geladen, keine Filterung findet statt

## Lösung

### Option 1: onApply erweitern (empfohlen - Performance-optimal)

**Vorteile:**
- Minimal-invasive Änderung
- Performance bleibt gleich (keine zusätzlichen API-Calls)
- Klare Trennung zwischen "Filter setzen" und "Filter anwenden"

**Nachteile:**
- FilterPane Schnittstelle muss erweitert werden
- Alle 14 Komponenten müssen angepasst werden

**Implementierung:**
1. `FilterPaneProps.onApply` erweitern um optionalen Callback für "Daten laden"
2. Oder: `onApply` erweitern um `sortDirections` Parameter
3. `handleApplyFilters` muss prüfen, ob Filter erweitert wurde
4. Wenn erweitert: `selectedFilterId` auf `null` setzen + `fetchRequests` aufrufen

### Option 2: applyFilterConditions erweitern (einfacher, aber weniger flexibel)

**Vorteile:**
- Weniger Änderungen nötig
- FilterPane bleibt unverändert

**Nachteile:**
- `applyFilterConditions` wird komplexer
- Mögliche Performance-Probleme (immer Daten laden, auch wenn nicht nötig)

**Implementierung:**
1. `applyFilterConditions` prüft, ob `selectedFilterId` gesetzt ist
2. Wenn gesetzt UND Filter geändert: `setSelectedFilterId(null)` + `fetchRequests` aufrufen
3. Problem: Wie erkennt man, ob Filter geändert wurde?

### Option 3: handleApplyFilters direkt handleFilterChange aufrufen (beste Lösung)

**Vorteile:**
- Klare Logik: "Anwenden" = "Daten laden"
- Keine Schnittstellenänderungen nötig
- Performance bleibt gleich (nur ein API-Call)

**Nachteile:**
- FilterPane muss Zugriff auf `handleFilterChange` haben
- Oder: `onApply` muss erweitert werden um Callback für Daten laden

## Empfohlene Lösung: Option 3 (modifiziert)

### Schritt 1: FilterPaneProps erweitern

**Datei:** `frontend/src/components/FilterPane.tsx`

**Änderung 1:** `onApply` erweitern um optionalen Callback
```typescript
interface FilterPaneProps {
  columns: TableColumn[];
  onApply: (conditions: FilterCondition[], logicalOperators: ('AND' | 'OR')[]) => void;
  onApplyWithData?: (conditions: FilterCondition[], logicalOperators: ('AND' | 'OR')[], sortDirections?: SortDirection[]) => Promise<void>; // NEU
  onReset: () => void;
  savedConditions?: FilterCondition[];
  savedOperators?: ('AND' | 'OR')[];
  savedSortDirections?: SortDirection[];
  onSortDirectionsChange?: (sortDirections: SortDirection[]) => void;
  tableId: string;
}
```

**Änderung 2:** `handleApplyFilters` erweitern
```typescript
const handleApplyFilters = async () => {
  const validConditions = conditions.filter(c => c.column !== '');
  
  // Prüfe, ob Filter erweitert wurde (durch Vergleich mit savedConditions)
  const filterWasExtended = savedConditions && (
    validConditions.length !== savedConditions.length ||
    JSON.stringify(validConditions) !== JSON.stringify(savedConditions) ||
    JSON.stringify(logicalOperators) !== JSON.stringify(savedOperators || [])
  );
  
  // Wenn onApplyWithData vorhanden UND Filter erweitert wurde: Daten laden
  if (onApplyWithData && filterWasExtended) {
    await onApplyWithData(validConditions, logicalOperators, sortDirections);
  } else {
    // Standard: Nur States setzen
    onApply(validConditions, logicalOperators);
    // Sortierrichtungen auch übergeben (falls onSortDirectionsChange vorhanden)
    if (onSortDirectionsChange) {
      onSortDirectionsChange(sortDirections);
    }
  }
};
```

### Schritt 2: Requests.tsx anpassen

**Datei:** `frontend/src/components/Requests.tsx`

**Änderung:** `onApplyWithData` Callback hinzufügen
```typescript
<FilterPane
  columns={[...]}
  onApply={applyFilterConditions}
  onApplyWithData={async (conditions, operators, sortDirections) => {
    // Filter erweitert: selectedFilterId zurücksetzen + Daten laden
    setSelectedFilterId(null);
    setActiveFilterName('');
    applyFilterConditions(conditions, operators, sortDirections);
    setSortConfig({ key: 'dueDate', direction: 'asc' });
    
    // Daten laden
    if (conditions.length > 0) {
      await fetchRequests(undefined, conditions, false, 20, 0);
    } else {
      await fetchRequests(undefined, undefined, false, 20, 0);
    }
  }}
  onReset={resetFilterConditions}
  savedConditions={filterConditions}
  savedOperators={filterLogicalOperators}
  savedSortDirections={filterSortDirections}
  onSortDirectionsChange={setFilterSortDirections}
  tableId={REQUESTS_TABLE_ID}
/>
```

### Schritt 3: Worktracker.tsx anpassen

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Änderung:** Gleiche Anpassung für Tasks und Reservations
- Zeile 2426-2433: Tasks FilterPane
- Zeile 3731-3738: Tasks FilterPane (dupliziert)
- Zeile 2437-2444: Reservations FilterPane
- Zeile 3742-3749: Reservations FilterPane (dupliziert)

### Schritt 4: Alle anderen Komponenten anpassen

**Betroffene Komponenten:**
1. `Cerebro.tsx` - Zeile 185
2. `ConsultationList.tsx` - Zeile 969
3. `InvoiceManagementTab.tsx` - Zeile 1281
4. `PasswordManagerTab.tsx` - Zeile 420
5. `BranchManagementTab.tsx` - Zeile 656
6. `RoleManagementTab.tsx` - Zeile 1460
7. `ActiveUsersList.tsx` - Zeile 1086
8. `TodoAnalyticsTab.tsx` - Zeile 444
9. `RequestAnalyticsTab.tsx` - Zeile 325
10. `MyJoinRequestsList.tsx` - Zeile 410
11. `JoinRequestsList.tsx` - Zeile 451

**Für jede Komponente:**
- Prüfen, ob `handleFilterChange` existiert
- Wenn ja: `onApplyWithData` mit `handleFilterChange` verbinden
- Wenn nein: `onApplyWithData` implementieren (analog zu Requests.tsx)

## Performance-Überlegungen

### Aktueller Zustand
- **Filter laden:** 1 API-Call (`fetchRequests` mit `id`)
- **Filter erweitern + anwenden:** 0 API-Calls (Problem!)

### Nach Fix
- **Filter laden:** 1 API-Call (`fetchRequests` mit `id`)
- **Filter erweitern + anwenden:** 1 API-Call (`fetchRequests` mit `conditions`)

**Performance:** Gleich oder besser (keine zusätzlichen Calls, nur wenn nötig)

### Optimierungen
1. **Debouncing:** Nicht nötig, da nur bei Button-Click
2. **Caching:** Bereits vorhanden (Backend-Cache)
3. **Pagination:** Bereits vorhanden (limit=20, offset=0)

## Implementierungsreihenfolge

1. **FilterPane.tsx** - Schnittstelle erweitern
2. **Requests.tsx** - Implementierung testen
3. **Worktracker.tsx** - Tasks und Reservations
4. **Alle anderen Komponenten** - Schritt für Schritt

## Test-Szenarien

### Test 1: Gespeicherter Filter erweitern
1. Gespeicherten Filter laden (z.B. "Aktuell")
2. Filterzeile hinzufügen
3. Neue Filterzeile ausfüllen
4. "Anwenden" klicken
5. **Erwartung:** Filter wird angewendet, Daten werden gefiltert

### Test 2: Gespeicherter Filter ohne Erweiterung
1. Gespeicherten Filter laden
2. "Anwenden" klicken (ohne Änderungen)
3. **Erwartung:** Kein zusätzlicher API-Call (Performance)

### Test 3: Neuer Filter erstellen
1. FilterPane öffnen
2. Filterzeilen ausfüllen
3. "Anwenden" klicken
4. **Erwartung:** Filter wird angewendet, Daten werden gefiltert

## Risiken

### Risiko 1: Filter-Erkennung zu aggressiv
**Problem:** `filterWasExtended` erkennt Änderungen, die keine sind  
**Lösung:** Exakter Vergleich (JSON.stringify)

### Risiko 2: Performance bei vielen Filterzeilen
**Problem:** JSON.stringify bei großen Arrays  
**Lösung:** Nur bei Button-Click, nicht bei jeder Änderung

### Risiko 3: Inkonsistente Implementierung
**Problem:** Nicht alle Komponenten gleich angepasst  
**Lösung:** Schrittweise Implementierung, Tests nach jeder Komponente

## Alternative: Einfacherer Fix (wenn Option 3 zu komplex)

### Option 4: applyFilterConditions erweitern (einfachste Lösung)

**Vorteile:**
- Minimal-invasive Änderung (nur 1 Datei pro Komponente)
- Keine Schnittstellenänderungen
- Funktioniert sofort

**Nachteile:**
- Immer API-Call, auch wenn Filter nicht geändert wurde (Performance)
- `applyFilterConditions` wird komplexer

**Implementierung:**

**Datei:** `frontend/src/components/Requests.tsx` Zeile 741-749

**Vorher:**
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

**Nachher:**
```typescript
const applyFilterConditions = async (conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<...>) => {
  // Prüfe, ob Filter erweitert wurde (selectedFilterId gesetzt, aber Filter geändert)
  const filterWasExtended = selectedFilterId !== null && (
    conditions.length !== filterConditions.length ||
    JSON.stringify(conditions) !== JSON.stringify(filterConditions) ||
    JSON.stringify(operators) !== JSON.stringify(filterLogicalOperators)
  );
  
  setFilterConditions(conditions);
  setFilterLogicalOperators(operators);
  if (sortDirections !== undefined) {
    const validSortDirections = Array.isArray(sortDirections) ? sortDirections : [];
    setFilterSortDirections(validSortDirections);
  }
  
  // Wenn Filter erweitert wurde: selectedFilterId zurücksetzen + Daten laden
  if (filterWasExtended) {
    setSelectedFilterId(null);
    setActiveFilterName('');
    setSortConfig({ key: 'dueDate', direction: 'asc' });
    
    if (conditions.length > 0) {
      await fetchRequests(undefined, conditions, false, 20, 0);
    } else {
      await fetchRequests(undefined, undefined, false, 20, 0);
    }
  }
};
```

**Problem:** `onApply` ist nicht `async`, aber `applyFilterConditions` wird `async`
- **Lösung:** `onApply` kann `async` sein, wird aber nicht `await`ed in FilterPane
- **Lösung 2:** `applyFilterConditions` nicht `async` machen, `fetchRequests` ohne `await` aufrufen

**Bessere Lösung:** `onApply` erweitern um optionalen Callback
```typescript
// In FilterPane.tsx
const handleApplyFilters = async () => {
  const validConditions = conditions.filter(c => c.column !== '');
  await onApply(validConditions, logicalOperators); // Kann async sein
};
```

**Performance:** Schlechter (immer API-Call wenn `selectedFilterId` gesetzt), aber funktioniert

### Option 5: Immer handleFilterChange aufrufen (einfachste, aber schlechteste Performance)

**Änderung:** `onApply` immer `handleFilterChange` aufrufen lassen
- **Vorteil:** Einfachste Lösung, nur 1 Zeile ändern
- **Nachteil:** Immer API-Call, auch wenn Filter nicht geändert wurde

**Implementierung:**
```typescript
// In Requests.tsx
<FilterPane
  onApply={(conditions, operators) => {
    handleFilterChange('', null, conditions, operators, filterSortDirections);
  }}
  ...
/>
```

**Performance:** Schlechteste Option (immer API-Call), aber funktioniert

## Empfehlung

**Option 3 (modifiziert)** ist die beste Lösung:
- Performance bleibt optimal
- Klare Logik
- Minimal-invasive Änderungen
- Funktioniert für alle Szenarien

