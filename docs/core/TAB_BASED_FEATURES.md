# Tab-basierte Features - Implementierungsrichtlinien

## ⚠️ KRITISCH: Diese Regeln sind VERBINDLICH

Wenn eine Seite/Box Tabs verwendet (z.B. "Tareas" und "Reservaciones"), müssen **ALLE Funktionen für ALLE Tabs funktionieren**.

## Grundregel: Vollständige Funktionalität für alle Tabs

**🚨 WICHTIGSTE REGEL:**
- **JEDE Funktion, die für Tab 1 existiert, MUSS auch für Tab 2 funktionieren**
- **JEDE Funktion, die für Tab 2 existiert, MUSS auch für Tab 1 funktionieren**
- **Ausnahmen sind NUR erlaubt, wenn explizit dokumentiert und begründet**

## Checkliste für Tab-basierte Features

### 1. ✅ Filter-System

**MUSS für ALLE Tabs funktionieren:**

- [ ] **FilterPane wird für ALLE Tabs angezeigt**
  - ❌ FALSCH: `{isFilterModalOpen && activeTab === 'todos' && (`
  - ✅ RICHTIG: `{isFilterModalOpen && (activeTab === 'todos' || activeTab === 'reservations') && (`
  - ✅ ODER: Separate FilterPane für jeden Tab

- [ ] **Filter-States existieren für ALLE Tabs**
  - Für Tab 1: `filterConditions`, `filterLogicalOperators`
  - Für Tab 2: `reservationFilterConditions`, `reservationFilterLogicalOperators`
  - **Beide müssen verwendet werden!**

- [ ] **Filter-Funktionen existieren für ALLE Tabs**
  - Für Tab 1: `applyFilterConditions`, `resetFilterConditions`
  - Für Tab 2: `applyReservationFilterConditions`, `resetReservationFilterConditions`
  - **Beide müssen verwendet werden!**

- [ ] **Filter-Spalten definiert für ALLE Tabs**
  - Für Tab 1: `availableColumns`, `filterOnlyColumns`
  - Für Tab 2: `availableReservationColumns`, `reservationFilterOnlyColumns`
  - **Beide müssen verwendet werden!**

- [ ] **`getActiveFilterCount` berücksichtigt ALLE Tabs**
  ```tsx
  // ❌ FALSCH: Nur für einen Tab
  const getActiveFilterCount = () => {
    return filterConditions.length;
  };
  
  // ✅ RICHTIG: Für alle Tabs
  const getActiveFilterCount = () => {
    if (activeTab === 'todos') {
      return filterConditions.length;
    } else {
      return reservationFilterConditions.length;
    }
  };
  ```

### 2. ✅ Suche

**MUSS für ALLE Tabs funktionieren:**

- [ ] **Suchfeld funktioniert für ALLE Tabs**
  - Separate States: `searchTerm` für Tab 1, `reservationSearchTerm` für Tab 2
  - Oder: Ein State mit Tab-Abhängigkeit

- [ ] **Suchfeld ist responsive (Mobile + Desktop)**
  - ❌ FALSCH: `w-[200px]` (feste Breite)
  - ✅ RICHTIG: `w-full sm:w-[200px]` (responsive)

- [ ] **Suche filtert korrekt für ALLE Tabs**
  - Tab 1: Filtert Tasks
  - Tab 2: Filtert Reservations

### 3. ✅ View-Mode Toggle

**MUSS für ALLE Tabs funktionieren:**

- [ ] **View-Mode Toggle funktioniert für ALLE Tabs**
  - Tabelle-Ansicht für Tab 1 UND Tab 2
  - Cards-Ansicht für Tab 1 UND Tab 2

- [ ] **View-Mode wird pro Tab gespeichert**
  - Separate Settings für Tab 1 und Tab 2
  - Oder: Gemeinsame Settings mit Tab-Abhängigkeit

### 4. ✅ Spalten-Konfiguration (TableColumnConfig)

**MUSS für ALLE Tabs funktionieren:**

- [ ] **TableColumnConfig zeigt korrekte Spalten für ALLE Tabs**
  - Tab 1: `availableColumns` oder Card-Metadaten
  - Tab 2: `availableReservationColumns` oder Card-Metadaten

- [ ] **Card-Metadaten-Mapping existiert für ALLE Tabs**
  - Tab 1: `cardToTableMapping`, `tableToCardMapping`
  - Tab 2: `reservationCardToTableMapping`, `reservationTableToCardMapping`
  - **Beide müssen existieren!**

- [ ] **Mapping-Funktionen existieren für ALLE Tabs**
  - Tab 1: `getCardMetadataFromColumnOrder`, `getHiddenCardMetadata`
  - Tab 2: `getReservationCardMetadataFromColumnOrder`, `getReservationHiddenCardMetadata`
  - **Beide müssen existieren!**

- [ ] **`onToggleColumnVisibility` funktioniert für ALLE Tabs**
  - Verwendet korrektes Mapping für aktuellen Tab
  - Prüft `activeTab` und verwendet entsprechendes Mapping

- [ ] **`visibleColumns` wird korrekt berechnet für ALLE Tabs**
  - Tab 1: `visibleColumnIds` oder `Array.from(visibleCardMetadata)`
  - Tab 2: `visibleReservationColumnIds` oder `Array.from(visibleReservationCardMetadata)`

### 5. ✅ Buttons und Aktionen

**MUSS für ALLE Tabs funktionieren:**

- [ ] **Create-Button funktioniert für ALLE Tabs**
  - Tab 1: Create Task Button
  - Tab 2: Create Reservation Button
  - **Beide müssen sichtbar sein (bei Berechtigung)**

- [ ] **Sync-Button funktioniert für ALLE Tabs (falls vorhanden)**
  - Tab 1: Sync Tasks (falls vorhanden)
  - Tab 2: Sync Reservations
  - **Beide müssen sichtbar sein (bei Mobile UND Desktop)**

- [ ] **Alle Buttons sind responsive**
  - Sichtbar bei Mobile UND Desktop
  - Responsive Klassen: `hidden sm:block` nur wenn explizit gewünscht

### 6. ✅ Responsive Design

**MUSS für ALLE Tabs funktionieren:**

- [ ] **Mobile-Ansicht funktioniert für ALLE Tabs**
  - Suche funktioniert
  - Filter funktioniert
  - Buttons sind sichtbar
  - Cards/Tabellen werden korrekt angezeigt

- [ ] **Desktop-Ansicht funktioniert für ALLE Tabs**
  - Alle Funktionen wie bei Mobile
  - Zusätzliche Features (falls vorhanden)

- [ ] **Tab-Navigation ist konsistent**
  - Gleiche Schriftgrößen für alle Tabs
  - Gleiche responsive Klassen: `text-xs sm:text-sm`
  - Gleiche `flex-shrink-0` Klasse

### 7. ✅ Daten-Laden

**MUSS für ALLE Tabs funktionieren:**

- [ ] **Daten werden für ALLE Tabs geladen**
  - Tab 1: `loadTasks()` wird aufgerufen
  - Tab 2: `loadReservations()` wird aufgerufen
  - **Beide müssen implementiert sein!**

- [ ] **Loading-States existieren für ALLE Tabs**
  - Tab 1: `loading`, `error`
  - Tab 2: `reservationsLoading`, `reservationsError`
  - **Beide müssen verwendet werden!**

### 8. ✅ Rendering

**MUSS für ALLE Tabs funktionieren:**

- [ ] **Rendering-Logik existiert für ALLE Tabs**
  - Tab 1: Tasks werden gerendert (Tabelle oder Cards)
  - Tab 2: Reservations werden gerendert (Tabelle oder Cards)
  - **Beide müssen implementiert sein!**

- [ ] **Card-Metadaten werden korrekt für ALLE Tabs generiert**
  - Tab 1: Task-Metadaten
  - Tab 2: Reservation-Metadaten
  - **Beide müssen korrekt sein!**

## Häufige Fehler

### ❌ FALSCH: Filter nur für einen Tab

```tsx
{isFilterModalOpen && activeTab === 'todos' && (
  <FilterPane ... />
)}
```

### ✅ RICHTIG: Filter für alle Tabs

```tsx
{isFilterModalOpen && (
  <FilterPane
    columns={activeTab === 'todos' 
      ? [...availableColumns, ...filterOnlyColumns]
      : [...availableReservationColumns, ...reservationFilterOnlyColumns]}
    onApply={activeTab === 'todos' 
      ? applyFilterConditions 
      : applyReservationFilterConditions}
    onReset={activeTab === 'todos' 
      ? resetFilterConditions 
      : resetReservationFilterConditions}
    savedConditions={activeTab === 'todos' 
      ? filterConditions 
      : reservationFilterConditions}
    savedOperators={activeTab === 'todos' 
      ? filterLogicalOperators 
      : reservationFilterLogicalOperators}
    tableId={activeTab === 'todos' ? TODOS_TABLE_ID : RESERVATIONS_TABLE_ID}
  />
)}
```

### ❌ FALSCH: Mapping nur für einen Tab

```tsx
const cardToTableMapping: Record<string, string> = {
  'title': 'title',
  'status': 'status',
  // ... nur für Tab 1
};
```

### ✅ RICHTIG: Mapping für alle Tabs

```tsx
// Tab 1 Mapping
const cardToTableMapping: Record<string, string> = {
  'title': 'title',
  'status': 'status',
  // ...
};

// Tab 2 Mapping
const reservationCardToTableMapping: Record<string, string> = {
  'guestName': 'guestName',
  'status': 'status',
  // ...
};

// In onToggleColumnVisibility:
const tableColumn = activeTab === 'todos' 
  ? cardToTableMapping[columnId]
  : reservationCardToTableMapping[columnId];
```

### ❌ FALSCH: Feste Breite ohne responsive

```tsx
<input className="w-[200px] ..." />
```

### ✅ RICHTIG: Responsive Breite

```tsx
<input className="w-full sm:w-[200px] ..." />
```

## Test-Checkliste

Vor jedem Commit prüfen:

1. **Filter funktioniert für Tab 1?** → ✅
2. **Filter funktioniert für Tab 2?** → ✅
3. **Suche funktioniert für Tab 1?** → ✅
4. **Suche funktioniert für Tab 2?** → ✅
5. **View-Mode Toggle funktioniert für Tab 1?** → ✅
6. **View-Mode Toggle funktioniert für Tab 2?** → ✅
7. **Spalten-Konfiguration funktioniert für Tab 1?** → ✅
8. **Spalten-Konfiguration funktioniert für Tab 2?** → ✅
9. **Mobile-Ansicht funktioniert für Tab 1?** → ✅
10. **Mobile-Ansicht funktioniert für Tab 2?** → ✅
11. **Desktop-Ansicht funktioniert für Tab 1?** → ✅
12. **Desktop-Ansicht funktioniert für Tab 2?** → ✅

## Weitere Ressourcen

- [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md) - Vollständige Implementierungs-Checkliste
- [DESIGN_STANDARDS.md](DESIGN_STANDARDS.md) - Responsive Design Standards
- [RESPONSIVE_TESTING.md](RESPONSIVE_TESTING.md) - Mobile & Desktop Testing Checkliste

---

**WICHTIG:** Diese Richtlinien sind VERBINDLICH. Tab-basierte Features ohne vollständige Funktionalität für alle Tabs werden NICHT akzeptiert!

