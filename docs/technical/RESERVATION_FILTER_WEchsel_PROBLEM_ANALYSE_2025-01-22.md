# Reservation Filter - Wechsel-Problem Analyse (2025-01-22)

## Übersicht

**Problem:** Filter funktionieren bei Reservierungen nicht richtig. Wenn ein Filter angeklickt wird (z.B. "filterag"), funktioniert es (Liste filtert richtig). Aber wenn dann ein anderer Filter angeklickt wird, passiert nichts mehr.

**Status:** NUR PRÜFUNG - KEINE ÄNDERUNGEN

---

## Problem-Beschreibung

### Symptome
1. **Erster Filter-Klick:** Funktioniert korrekt
   - Filter wird angewendet
   - Liste wird korrekt gefiltert
   - Filter-Tag wird als aktiv markiert

2. **Zweiter Filter-Klick:** Funktioniert NICHT
   - Filter wird angeklickt
   - **ABER:** Liste ändert sich nicht
   - Filter-Tag wird möglicherweise als aktiv markiert, aber Filterung bleibt beim ersten Filter

### Erwartetes Verhalten
- Beim Klick auf einen Filter sollte die Liste sofort aktualisiert werden
- Beim Wechsel zu einem anderen Filter sollte die Liste mit den neuen Filter-Bedingungen aktualisiert werden

---

## Code-Analyse

### Betroffene Dateien
- `frontend/src/pages/Worktracker.tsx` - Hauptkomponente für Reservierungen
- `frontend/src/components/SavedFilterTags.tsx` - Filter-Tags Komponente

### Filter-Flow

**1. Filter-Klick in SavedFilterTags.tsx (Zeile 271-293):**
```typescript
const handleSelectFilter = (filter: SavedFilter) => {
    console.log('🔄 SavedFilterTags: handleSelectFilter called', {
        filterName: filter.name,
        filterId: filter.id,
        conditionsCount: filter.conditions?.length || 0,
        operatorsCount: filter.operators?.length || 0,
        sortDirectionsCount: filter.sortDirections?.length || 0,
        hasOnFilterChange: !!onFilterChange
    });
    
    const validSortDirections = Array.isArray(filter.sortDirections) ? filter.sortDirections : undefined;
    
    if (onFilterChange) {
        // Controlled component
        console.log('📋 SavedFilterTags: Calling onFilterChange (controlled)');
        onFilterChange(filter.name, filter.id, filter.conditions, filter.operators, validSortDirections);
    } else {
        // Backward compatibility - uncontrolled component
        console.log('📋 SavedFilterTags: Calling onSelectFilter (uncontrolled)');
        onSelectFilter(filter.conditions, filter.operators, validSortDirections);
    }
};
```

**2. handleFilterChange in Worktracker.tsx (Zeile 940-972):**
```typescript
const handleFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>) => {
    console.log('🔄 handleFilterChange called:', {
        activeTab,
        name,
        id,
        conditionsCount: conditions.length,
        operatorsCount: operators.length,
        sortDirectionsCount: sortDirections?.length || 0
    });
    
    if (activeTab === 'todos') {
        // ... Tasks-Logik ...
    } else {
        console.log('📋 handleFilterChange: Setting reservation filter states');
        setReservationActiveFilterName(name);
        setReservationSelectedFilterId(id);
        applyReservationFilterConditions(conditions, operators, sortDirections);
        // Table-Header-Sortierung zurücksetzen, damit Filter-Sortierung übernimmt
        setReservationTableSortConfig({ key: 'checkInDate', direction: 'desc' });
        console.log('✅ handleFilterChange: Reservation filter states set');
    }
};
```

**3. applyReservationFilterConditions in Worktracker.tsx (Zeile 914-929):**
```typescript
const applyReservationFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>) => {
    console.log('🔄 applyReservationFilterConditions called:', {
        conditionsCount: conditions.length,
        operatorsCount: operators.length,
        sortDirectionsCount: sortDirections?.length || 0,
        conditions,
        operators,
        sortDirections
    });
    setReservationFilterConditions(conditions);
    setReservationFilterLogicalOperators(operators);
    // WICHTIG: Sortierungen immer setzen, auch wenn undefined (zurücksetzen)
    const validSortDirections = sortDirections !== undefined && Array.isArray(sortDirections) ? sortDirections : [];
    setReservationFilterSortDirections(validSortDirections);
    console.log('✅ applyReservationFilterConditions: States updated');
};
```

**4. filteredAndSortedReservations useMemo (Zeile 1310-1611):**
```typescript
const filteredAndSortedReservations = useMemo(() => {
    console.log('🔄 filteredAndSortedReservations: useMemo triggered', {
        reservationsCount: reservations.length,
        filterConditionsCount: reservationFilterConditions.length,
        filterOperatorsCount: reservationFilterLogicalOperators.length,
        sortDirectionsCount: reservationFilterSortDirections.length,
        filterConditions: reservationFilterConditions,
        filterOperators: reservationFilterLogicalOperators
    });
    // ... Filter-Logik ...
    return sorted;
}, [reservations, reservationFilterStatus, reservationFilterPaymentStatus, reservationSearchTerm, reservationFilterConditions, reservationFilterLogicalOperators, reservationFilterSortDirections, viewMode, cardMetadataOrder, visibleCardMetadata, reservationCardSortDirections, reservationTableSortConfig]);
```

---

## Mögliche Ursachen

### 1. Referenz-Gleichheit Problem
**Vermutung:** Die Filter-Bedingungen könnten die gleiche Referenz haben, auch wenn sie unterschiedlich sind.

**Prüfung:**
- `filter.conditions` kommt direkt aus der Datenbank
- `setReservationFilterConditions(conditions)` setzt die Bedingungen
- `useMemo` sollte neu berechnen, wenn sich `reservationFilterConditions` ändert

**Problem:** Wenn `conditions` die gleiche Referenz hat (z.B. leeres Array `[]`), könnte React denken, dass sich nichts geändert hat.

### 2. State-Update nicht erkannt
**Vermutung:** React erkennt möglicherweise nicht, dass sich der State geändert hat.

**Prüfung:**
- `setReservationFilterConditions` wird aufgerufen
- `useMemo` Dependency-Array enthält `reservationFilterConditions`
- React sollte neu berechnen, wenn sich der State ändert

**Problem:** Wenn die Filter-Bedingungen strukturell gleich sind (z.B. beide leere Arrays), könnte React denken, dass sich nichts geändert hat.

### 3. Filter-Bedingungen werden nicht korrekt zurückgesetzt
**Vermutung:** Beim Wechsel zu einem neuen Filter werden die alten Filter-Bedingungen nicht zurückgesetzt.

**Prüfung:**
- `applyReservationFilterConditions` setzt die neuen Bedingungen
- Die alten Bedingungen sollten überschrieben werden

**Problem:** Wenn die neuen Filter-Bedingungen die gleichen sind wie die alten, könnte React denken, dass sich nichts geändert hat.

### 4. useMemo Dependency-Array Problem
**Vermutung:** `useMemo` wird möglicherweise nicht neu berechnet, weil eine Dependency fehlt oder falsch ist.

**Prüfung:**
- Dependency-Array enthält: `reservationFilterConditions`, `reservationFilterLogicalOperators`, `reservationFilterSortDirections`
- Alle relevanten States sind enthalten

**Problem:** Wenn eine Dependency fehlt oder falsch ist, könnte `useMemo` nicht neu berechnen.

### 5. Console-Logs zeigen das Problem
**Vermutung:** Die Console-Logs sollten zeigen, ob `handleFilterChange` und `applyReservationFilterConditions` aufgerufen werden.

**Prüfung:**
- Console-Logs sind vorhanden
- Sollten zeigen, wenn Filter geändert werden

**Problem:** Wenn die Logs nicht erscheinen, wird `handleFilterChange` möglicherweise nicht aufgerufen.

---

## Test-Plan

### 1. Browser-Console prüfen
- Öffne Browser-Console auf Produktivserver
- Klicke auf ersten Filter
- Prüfe Console-Logs:
  - Wird `handleSelectFilter` aufgerufen?
  - Wird `handleFilterChange` aufgerufen?
  - Wird `applyReservationFilterConditions` aufgerufen?
  - Wird `filteredAndSortedReservations` useMemo neu berechnet?

### 2. Zweiten Filter klicken
- Klicke auf zweiten Filter
- Prüfe Console-Logs:
  - Werden die gleichen Logs ausgegeben?
  - Ändern sich die Filter-Bedingungen?
  - Wird `useMemo` neu berechnet?

### 3. State-Änderungen prüfen
- Prüfe React DevTools:
  - Ändert sich `reservationFilterConditions`?
  - Ändert sich `reservationFilterLogicalOperators`?
  - Ändert sich `reservationSelectedFilterId`?

### 4. Filter-Bedingungen vergleichen
- Prüfe, ob die Filter-Bedingungen unterschiedlich sind:
  - Erster Filter: Welche Bedingungen?
  - Zweiter Filter: Welche Bedingungen?
  - Sind sie strukturell gleich?

---

## Vergleich: Tasks vs Reservations

| Aspekt | Tasks | Reservations | Status |
|--------|-------|--------------|--------|
| `handleFilterChange` wird aufgerufen | ✅ | ✅ | ✅ |
| `applyFilterConditions` wird aufgerufen | ✅ | ✅ (`applyReservationFilterConditions`) | ✅ |
| State wird gesetzt | ✅ | ✅ | ✅ |
| `useMemo` Dependency-Array | ✅ Enthält alle States | ✅ Enthält alle States | ✅ |
| Filter funktioniert beim ersten Klick | ✅ | ✅ | ✅ |
| Filter funktioniert beim zweiten Klick | ✅ | ❌ **PROBLEM** | ❌ |

---

## Nächste Schritte

1. **Browser-Console prüfen** (auf Produktivserver)
   - Logs beim ersten Filter-Klick
   - Logs beim zweiten Filter-Klick
   - Vergleich der Filter-Bedingungen

2. **React DevTools prüfen**
   - State-Änderungen beim ersten Filter-Klick
   - State-Änderungen beim zweiten Filter-Klick

3. **Filter-Bedingungen vergleichen**
   - Erster Filter: Welche Bedingungen?
   - Zweiter Filter: Welche Bedingungen?
   - Sind sie unterschiedlich?

4. **Code-Debugging**
   - Breakpoints in `handleFilterChange`
   - Breakpoints in `applyReservationFilterConditions`
   - Breakpoints in `filteredAndSortedReservations` useMemo

---

**Datum:** 2025-01-22  
**Status:** Analyse in Arbeit - NUR PRÜFUNG, KEINE ÄNDERUNGEN

