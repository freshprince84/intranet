# Tours Loop-Problem - Detaillierte Analyse

**Datum:** 2025-02-02  
**Status:** 🔍 ANALYSE ABGESCHLOSSEN  
**Priorität:** 🔴 KRITISCH

---

## 🔴 IDENTIFIZIERTES PROBLEM

### Symptome (aus Browser-Console):
- **562+ XHR Requests** zu `/api/tours?filterId=76446`
- Tours blinken / werden in einem Loop geladen
- Einträge scheinen kontinuierlich neu geladen zu werden

---

## 📊 ROOT CAUSE ANALYSE

### Problem 1: `handleTourFilterChange` ist NICHT stabilisiert

**Datei:** `frontend/src/components/tours/ToursTab.tsx:244-252`

**Aktueller Code:**
```typescript
const handleTourFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setTourSelectedFilterId(id);
    setTourActiveFilterName(name);
    if (id) {
        await loadTours(id);
    } else {
        await applyTourFilterConditions(conditions, operators);
    }
};
```

**Problem:**
- Funktion wird bei **jedem Render neu erstellt** (nicht mit `useCallback` stabilisiert)
- Neue Referenz bei jedem Render → `useEffect` sieht Änderung → läuft erneut

---

### Problem 2: useEffect mit instabilen Dependencies

**Datei:** `frontend/src/components/tours/ToursTab.tsx:258-284`

**Aktueller Code:**
```typescript
useEffect(() => {
    const initialize = async () => {
        if (!hasPermission('tours', 'read', 'table')) {
            return;
        }
        
        // 1. Filter laden (wartet auf State-Update)
        const filters = await loadFilters(TOURS_TABLE_ID);
        
        // 2. Default-Filter anwenden (IMMER vorhanden!)
        const defaultFilter = filters.find(f => f.name === 'Aktuell');
        if (defaultFilter) {
            await handleTourFilterChange(
                defaultFilter.name,
                defaultFilter.id,
                defaultFilter.conditions,
                defaultFilter.operators
            );
            return; // Daten werden durch handleTourFilterChange geladen
        }
        
        // 3. Fallback: Daten ohne Filter laden (sollte nie passieren)
        await loadTours();
    };
    
    initialize();
}, [hasPermission, loadFilters, handleTourFilterChange, loadTours]);
```

**Problem:**
- `handleTourFilterChange` ist in Dependencies → wird bei jedem Render neu erstellt → `useEffect` läuft erneut
- `loadTours` ist in Dependencies → könnte sich auch ändern (hat `tourFilterLogicalOperators` als Dependency)

---

### Problem 3: Endlosschleife-Zyklus

**Ablauf der Endlosschleife:**

1. **Initial Render:**
   - `handleTourFilterChange` wird erstellt (nicht stabilisiert)
   - `useEffect` läuft → ruft `handleTourFilterChange` auf
   - `handleTourFilterChange` ruft `loadTours(id)` auf (mit `filterId=76446`)

2. **loadTours setzt State:**
   - `setTours(toursData)` (Zeile 196)
   - `setToursLoading(false)` (Zeile 214)
   - → **Re-Render wird ausgelöst**

3. **Re-Render:**
   - `handleTourFilterChange` wird **neu erstellt** (neue Referenz)
   - `useEffect` sieht neue Referenz → **läuft erneut**
   - → **Schleife beginnt von vorne**

4. **Ergebnis:**
   - Kontinuierliche API-Calls zu `/api/tours?filterId=76446`
   - Tours blinken (werden ständig neu geladen)
   - Performance-Problem

---

## ✅ VERGLEICH MIT ANDEREN KOMPONENTEN

### Requests.tsx (KORREKT implementiert)

**Datei:** `frontend/src/components/Requests.tsx:697-714`

**Korrekte Implementierung:**
```typescript
// ✅ FIX: Mit useCallback stabilisieren (verhindert Endlosschleife in useEffect)
const handleFilterChange = useCallback(async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setActiveFilterName(name);
    setSelectedFilterId(id);
    // Table-Header-Sortierung zurücksetzen
    updateSortConfig({ key: 'dueDate', direction: 'asc' });
    
    if (id) {
        setFilterConditions(conditions);
        setFilterLogicalOperators(operators);
        await fetchRequests(id, undefined, false, 20, 0);
    } else {
        await applyFilterConditions(conditions, operators);
    }
}, [fetchRequests, updateSortConfig, applyFilterConditions]);
```

**Unterschied:**
- ✅ `useCallback` stabilisiert die Funktion
- ✅ Dependencies sind korrekt definiert
- ✅ Keine Endlosschleife

---

### Worktracker.tsx (KORREKT implementiert)

**Datei:** `frontend/src/pages/Worktracker.tsx:825-859`

**Korrekte Implementierung:**
```typescript
const handleFilterChange = useCallback(async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    // ... Logik ...
}, [activeTab, applyFilterConditions, loadTasks, loadReservations, applyReservationFilterConditions]);
```

**Unterschied:**
- ✅ `useCallback` stabilisiert die Funktion
- ✅ Dependencies sind korrekt definiert
- ✅ Keine Endlosschleife

---

## 📋 DOKUMENTATION ZU ÄHNLICHEN PROBLEMEN

### PERFORMANCE_ENDSCHLEIFE_WORKTRACKER_FIX_2025-01-29.md

**Root Cause (aus Dokumentation):**
1. **`handleFilterChange` war NICHT als `useCallback` definiert:**
   - Wurde bei jedem Render neu erstellt
   - Neue Referenz → `SavedFilterTags` sieht Änderung → `useEffect` läuft erneut

2. **`SavedFilterTags` useEffect verwendete `onFilterChange` ohne korrekte Dependencies:**
   - `useEffect` verwendete `onFilterChange`, `onSelectFilter`, `defaultFilterName`, `activeFilterName`
   - Aber nur `[tableId]` war in den Dependencies
   - Wenn `onFilterChange` aufgerufen wurde → State wurde gesetzt → Re-Render → `handleFilterChange` wurde neu erstellt → `useEffect` lief erneut → Endlosschleife

**Lösung:**
- `handleFilterChange` als `useCallback` definiert
- Korrekte Dependencies

---

## 🔍 ZUSÄTZLICHE PROBLEME

### Problem 4: `loadTours` hat `tourFilterLogicalOperators` als Dependency

**Datei:** `frontend/src/components/tours/ToursTab.tsx:167-217`

**Aktueller Code:**
```typescript
const loadTours = useCallback(async (filterId?: number, filterConditions?: any[], background = false) => {
    // ... Logik ...
}, [tourFilterLogicalOperators, t, showMessage]);
```

**Problem:**
- Wenn `tourFilterLogicalOperators` sich ändert, wird `loadTours` neu erstellt
- `useEffect` sieht neue Referenz → läuft erneut
- **Kann zusätzliche Loops verursachen**

**Lösung:**
- `tourFilterLogicalOperators` sollte NICHT als Dependency sein, wenn es nur in `loadTours` verwendet wird
- Oder: `loadTours` sollte `tourFilterLogicalOperators` als Parameter erhalten (nicht aus Closure)

---

### Problem 5: `applyTourFilterConditions` ist nicht stabilisiert

**Datei:** `frontend/src/components/tours/ToursTab.tsx:230-234`

**Aktueller Code:**
```typescript
const applyTourFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setTourFilterConditions(conditions);
    setTourFilterLogicalOperators(operators);
    loadTours(undefined, conditions, false);
};
```

**Problem:**
- Funktion wird bei jedem Render neu erstellt
- Wird in `handleTourFilterChange` verwendet
- **Kann zusätzliche Loops verursachen**

**Lösung:**
- Mit `useCallback` stabilisieren

---

## 📊 ZUSAMMENFASSUNG

### Hauptproblem:
1. **`handleTourFilterChange` ist NICHT mit `useCallback` stabilisiert**
   - Wird bei jedem Render neu erstellt
   - `useEffect` sieht neue Referenz → läuft erneut
   - → **Endlosschleife**

### Zusätzliche Probleme:
2. **`loadTours` hat `tourFilterLogicalOperators` als Dependency**
   - Kann zusätzliche Loops verursachen

3. **`applyTourFilterConditions` ist nicht stabilisiert**
   - Kann zusätzliche Loops verursachen

### Lösung (geplant):
1. **`handleTourFilterChange` mit `useCallback` stabilisieren**
   - Dependencies: `[loadTours, applyTourFilterConditions]`

2. **`applyTourFilterConditions` mit `useCallback` stabilisieren**
   - Dependencies: `[loadTours]` (oder leer, wenn `loadTours` stabil ist)

3. **`loadTours` Dependency prüfen**
   - `tourFilterLogicalOperators` sollte NICHT als Dependency sein, wenn es nur in `loadTours` verwendet wird
   - Oder: `loadTours` sollte `tourFilterLogicalOperators` als Parameter erhalten

4. **`useEffect` Dependencies prüfen**
   - `handleTourFilterChange` und `loadTours` sollten stabil sein
   - Oder: Ref-Pattern verwenden (wie in Worktracker.tsx)

---

## 🔗 REFERENZEN

- **Requests.tsx:** Zeile 697-714 (korrekte Implementierung)
- **Worktracker.tsx:** Zeile 825-859 (korrekte Implementierung)
- **PERFORMANCE_ENDSCHLEIFE_WORKTRACKER_FIX_2025-01-29.md:** Dokumentation zu ähnlichem Problem

---

## ⚠️ WICHTIG

**Status:** 🔍 ANALYSE ABGESCHLOSSEN - **NOCH NICHTS GEÄNDERT**

**Nächste Schritte:**
1. Fix implementieren (nach Zustimmung)
2. Testen auf Produktivserver
3. Browser-Console prüfen (sollte keine Loops mehr zeigen)

