# Worktracker Sortierung & Filter Fix - Implementierungsplan

**Datum:** 2025-01-31  
**Status:** Geplant  
**Priorität:** Hoch

## Problem-Zusammenfassung

Drei identifizierte Probleme in `frontend/src/pages/Worktracker.tsx`:

1. **ToDos - Zweiter Sortier-Klick funktioniert nicht:** `handleSort` verwendet veraltete `tableSortConfig`-Referenz (Closure-Problem)
2. **ToDos - Pfeil wird nach Klick nicht angezeigt:** Table-Header zeigt immer `ArrowsUpDownIcon`, keine Logik für aktive Sortierung
3. **TourBookings zeigt Reservations-Filter:** Fehlende Bedingung für `activeTab === 'tourBookings'` in FilterPane und SavedFilterTags

---

## Problem 1: handleSort verwendet veraltete tableSortConfig-Referenz

### Fakten aus Code-Analyse

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Aktueller Code (Zeile 1160-1164):**
```typescript
const handleSort = (key: SortConfig['key']) => {
    // Table-Header-Sortierung: Aktualisiert Hauptsortierung direkt (synchron für Table & Cards)
    const newDirection = tableSortConfig.key === key && tableSortConfig.direction === 'asc' ? 'desc' : 'asc';
    updateTasksSortConfig({ key, direction: newDirection });
};
```

**Problem:**
- `handleSort` ist nicht mit `useCallback` definiert
- Liest `tableSortConfig` aus Closure (Zeile 439: `const tableSortConfig: SortConfig = tasksSettings.sortConfig || { key: 'dueDate', direction: 'asc' };`)
- Wenn `tableSortConfig` sich ändert, wird `handleSort` nicht neu erstellt
- Verwendet daher veraltete `tableSortConfig`-Referenz beim zweiten Klick

**Vergleich mit Reservations (funktioniert):**
- Zeile 1166-1170: `handleReservationSort` hat gleiches Problem, aber wird nicht verwendet (Reservations nutzt `handleMainSortChange` über TableColumnConfig)

**Vergleich mit Requests.tsx (funktioniert):**
- Requests verwendet `handleMainSortChange` über TableColumnConfig, nicht `handleSort` im Table-Header

### Lösung

**Schritt 1.1: handleSort mit useCallback stabilisieren**

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 1160-1164

**Änderung:**
```typescript
// VORHER:
const handleSort = (key: SortConfig['key']) => {
    const newDirection = tableSortConfig.key === key && tableSortConfig.direction === 'asc' ? 'desc' : 'asc';
    updateTasksSortConfig({ key, direction: newDirection });
};

// NACHHER:
const handleSort = useCallback((key: SortConfig['key']) => {
    // ✅ FIX: Verwende tasksSettings.sortConfig direkt (aktueller Wert)
    const currentSortConfig = tasksSettings.sortConfig || { key: 'dueDate', direction: 'asc' };
    const newDirection = currentSortConfig.key === key && currentSortConfig.direction === 'asc' ? 'desc' : 'asc';
    updateTasksSortConfig({ key, direction: newDirection });
}, [tasksSettings.sortConfig, updateTasksSortConfig]);
```

**Begründung:**
- `useCallback` mit `tasksSettings.sortConfig` als Dependency stellt sicher, dass `handleSort` neu erstellt wird, wenn sich die Sortierung ändert
- Verwendet `tasksSettings.sortConfig` direkt statt Closure-Variable `tableSortConfig`
- `updateTasksSortConfig` als Dependency (stabil, aber für Vollständigkeit)

---

## Problem 2: Pfeil wird nach Klick nicht angezeigt

### Fakten aus Code-Analyse

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Aktueller Code (Zeile 2418-2424):**
```typescript
{columnId !== 'actions' && (
    <button 
        onClick={() => handleSort(columnId as keyof Task)}
        className="ml-1 focus:outline-none"
    >
        <ArrowsUpDownIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
    </button>
)}
```

**Problem:**
- Immer `ArrowsUpDownIcon` (Doppelpfeil), unabhängig von aktiver Sortierung
- Keine Logik, die prüft ob `tableSortConfig.key === columnId`
- Keine Anzeige von `ArrowUpIcon` oder `ArrowDownIcon` basierend auf `tableSortConfig.direction`

**Vergleich mit TableColumnConfig.tsx (funktioniert):**
- Zeile 86-92: Zeigt `ArrowUpIcon` (asc), `ArrowDownIcon` (desc) oder `ArrowsUpDownIcon` (nicht aktiv)
- Zeile 69-73: Prüft `isMainSort && sortDirection !== undefined`

### Lösung

**Schritt 2.1: Pfeil-Icons importieren**

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 9 (Import-Statement)

**Aktueller Import:**
```typescript
import { PencilIcon, TrashIcon, PlusIcon, ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, ArrowsUpDownIcon, FunnelIcon, XMarkIcon, DocumentDuplicateIcon, InformationCircleIcon, ClipboardDocumentListIcon, ArrowPathIcon, Squares2X2Icon, TableCellsIcon, UserIcon, BuildingOfficeIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, HomeIcon, EnvelopeIcon, PhoneIcon, LinkIcon, CurrencyDollarIcon, ClockIcon, KeyIcon, PaperAirplaneIcon, MapIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
```

**Änderung:**
```typescript
// ArrowUpIcon und ArrowDownIcon hinzufügen
import { PencilIcon, TrashIcon, PlusIcon, ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, ArrowsUpDownIcon, ArrowUpIcon, ArrowDownIcon, FunnelIcon, XMarkIcon, DocumentDuplicateIcon, InformationCircleIcon, ClipboardDocumentListIcon, ArrowPathIcon, Squares2X2Icon, TableCellsIcon, UserIcon, BuildingOfficeIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, HomeIcon, EnvelopeIcon, PhoneIcon, LinkIcon, CurrencyDollarIcon, ClockIcon, KeyIcon, PaperAirplaneIcon, MapIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
```

**Schritt 2.2: Pfeil-Anzeige-Logik im Table-Header hinzufügen**

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 2418-2424

**Änderung:**
```typescript
// VORHER:
{columnId !== 'actions' && (
    <button 
        onClick={() => handleSort(columnId as keyof Task)}
        className="ml-1 focus:outline-none"
    >
        <ArrowsUpDownIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
    </button>
)}

// NACHHER:
{columnId !== 'actions' && (
    <button 
        onClick={() => handleSort(columnId as keyof Task)}
        className={`ml-1 focus:outline-none ${
            tableSortConfig.key === columnId
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-400 dark:text-gray-500'
        }`}
    >
        {tableSortConfig.key === columnId && tableSortConfig.direction === 'asc' ? (
            <ArrowUpIcon className="h-4 w-4" />
        ) : tableSortConfig.key === columnId && tableSortConfig.direction === 'desc' ? (
            <ArrowDownIcon className="h-4 w-4" />
        ) : (
            <ArrowsUpDownIcon className="h-4 w-4" />
        )}
    </button>
)}
```

**Begründung:**
- Prüft ob `tableSortConfig.key === columnId` (aktive Sortierung)
- Zeigt `ArrowUpIcon` wenn `direction === 'asc'`
- Zeigt `ArrowDownIcon` wenn `direction === 'desc'`
- Zeigt `ArrowsUpDownIcon` wenn nicht aktiv
- Farbänderung für aktive Sortierung (blau statt grau)

**Hinweis:** Es gibt zwei Table-Header (eine für Table-View, eine für Card-View). Beide müssen angepasst werden:
- Zeile 2418-2424 (Table-View für todos)
- Zeile 3743-3749 (Table-View für todos, zweite Instanz)

---

## Problem 3: TourBookings zeigt Reservations-Filter

### Fakten aus Code-Analyse

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Aktueller Code (Zeile 3677-3702):**
```typescript
{activeTab === 'todos' ? (
    <FilterPane
        columns={[...availableColumns, ...filterOnlyColumns]}
        onApply={applyFilterConditions}
        onReset={resetFilterConditions}
        savedConditions={filterConditions}
        savedOperators={filterLogicalOperators}
        tableId={TODOS_TABLE_ID}
    />
) : (
    <FilterPane
        columns={[...]}
        onApply={applyReservationFilterConditions}
        onReset={resetReservationFilterConditions}
        savedConditions={reservationFilterConditions}
        savedOperators={reservationFilterLogicalOperators}
        tableId={RESERVATIONS_TABLE_ID}
    />
)}
```

**Problem:**
- Bedingung prüft nur `activeTab === 'todos'` vs. `nicht-todos`
- Wenn `activeTab === 'tourBookings'`, wird Reservations-FilterPane gerendert
- Keine Bedingung für `activeTab === 'tourBookings'`

**Aktueller Code (Zeile 3707-3715):**
```typescript
<SavedFilterTags
    tableId={activeTab === 'todos' ? TODOS_TABLE_ID : RESERVATIONS_TABLE_ID}
    onSelectFilter={activeTab === 'todos' ? applyFilterConditions : applyReservationFilterConditions}
    onReset={activeTab === 'todos' ? resetFilterConditions : resetReservationFilterConditions}
    activeFilterName={activeTab === 'todos' ? activeFilterName : reservationActiveFilterName}
    selectedFilterId={activeTab === 'todos' ? selectedFilterId : reservationSelectedFilterId}
    onFilterChange={activeTab === 'todos' ? handleFilterChange : handleReservationFilterChange}
    defaultFilterName={activeTab === 'todos' ? 'Aktuell' : 'Hoy'}
/>
```

**Problem:**
- Gleiche Logik: `todos` vs. `nicht-todos`
- Bei `tourBookings` wird Reservations-FilterTags angezeigt

**Fakt:** TourBookings hat keine Filter-Funktionalität implementiert (keine Filter-States, keine Filter-Funktionen)

### Lösung

**Schritt 3.1: FilterPane-Bedingung erweitern**

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 3677-3702

**Änderung:**
```typescript
// VORHER:
{activeTab === 'todos' ? (
    <FilterPane ... />
) : (
    <FilterPane ... />
)}

// NACHHER:
{activeTab === 'todos' ? (
    <FilterPane
        columns={[...availableColumns, ...filterOnlyColumns]}
        onApply={applyFilterConditions}
        onReset={resetFilterConditions}
        savedConditions={filterConditions}
        savedOperators={filterLogicalOperators}
        tableId={TODOS_TABLE_ID}
    />
) : activeTab === 'reservations' ? (
    <FilterPane
        columns={[
            { id: 'checkInDate', label: t('reservations.columns.checkInDate', 'Check-in') },
            { id: 'checkOutDate', label: t('reservations.columns.checkOutDate', 'Check-out') },
            { id: 'roomNumber', label: t('reservations.columns.roomNumber', 'Zimmer') },
            { id: 'status', label: t('reservations.columns.status', 'Status') },
            { id: 'paymentStatus', label: t('reservations.columns.paymentStatus', 'Zahlungsstatus') },
            { id: 'branch', label: t('reservations.columns.branch', 'Niederlassung') },
        ]}
        onApply={applyReservationFilterConditions}
        onReset={resetReservationFilterConditions}
        savedConditions={reservationFilterConditions}
        savedOperators={reservationFilterLogicalOperators}
        tableId={RESERVATIONS_TABLE_ID}
    />
) : null}
```

**Begründung:**
- Explizite Bedingung für `activeTab === 'reservations'`
- `null` wenn `activeTab === 'tourBookings'` (kein FilterPane für TourBookings)

**Schritt 3.2: SavedFilterTags-Bedingung erweitern**

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 3707-3715

**Änderung:**
```typescript
// VORHER:
<SavedFilterTags
    tableId={activeTab === 'todos' ? TODOS_TABLE_ID : RESERVATIONS_TABLE_ID}
    onSelectFilter={activeTab === 'todos' ? applyFilterConditions : applyReservationFilterConditions}
    onReset={activeTab === 'todos' ? resetFilterConditions : resetReservationFilterConditions}
    activeFilterName={activeTab === 'todos' ? activeFilterName : reservationActiveFilterName}
    selectedFilterId={activeTab === 'todos' ? selectedFilterId : reservationSelectedFilterId}
    onFilterChange={activeTab === 'todos' ? handleFilterChange : handleReservationFilterChange}
    defaultFilterName={activeTab === 'todos' ? 'Aktuell' : 'Hoy'}
/>

// NACHHER:
{activeTab === 'todos' || activeTab === 'reservations' ? (
    <SavedFilterTags
        tableId={activeTab === 'todos' ? TODOS_TABLE_ID : RESERVATIONS_TABLE_ID}
        onSelectFilter={activeTab === 'todos' ? applyFilterConditions : applyReservationFilterConditions}
        onReset={activeTab === 'todos' ? resetFilterConditions : resetReservationFilterConditions}
        activeFilterName={activeTab === 'todos' ? activeFilterName : reservationActiveFilterName}
        selectedFilterId={activeTab === 'todos' ? selectedFilterId : reservationSelectedFilterId}
        onFilterChange={activeTab === 'todos' ? handleFilterChange : handleReservationFilterChange}
        defaultFilterName={activeTab === 'todos' ? 'Aktuell' : 'Hoy'}
    />
) : null}
```

**Begründung:**
- Explizite Bedingung: nur rendern wenn `activeTab === 'todos'` oder `activeTab === 'reservations'`
- `null` wenn `activeTab === 'tourBookings'` (keine FilterTags für TourBookings)

**Hinweis:** Es gibt zwei Instanzen von FilterPane und SavedFilterTags (eine für Table-View, eine für Card-View). Beide müssen angepasst werden:
- Zeile 2348-2376 (FilterPane, Table-View)
- Zeile 2382-2390 (SavedFilterTags, Table-View)
- Zeile 3677-3702 (FilterPane, Card-View)
- Zeile 3707-3715 (SavedFilterTags, Card-View)

---

## Implementierungsreihenfolge

1. **Problem 1:** `handleSort` mit `useCallback` stabilisieren (Zeile 1160-1164)
2. **Problem 2:** Pfeil-Icons importieren (Zeile 9) und Pfeil-Anzeige-Logik hinzufügen (Zeile 2418-2424, Zeile 3743-3749)
3. **Problem 3:** FilterPane- und SavedFilterTags-Bedingungen erweitern (Zeile 3677-3702, Zeile 3707-3715, weitere Instanzen prüfen)

---

## Test-Checkliste

### Problem 1 - Sortierung
- [ ] Erster Klick auf Sortier-Spalte in ToDos funktioniert
- [ ] Zweiter Klick (Umkehrung) funktioniert
- [ ] Sortierung wird in Table-View angewendet
- [ ] Sortierung wird in Card-View angewendet (synchron)

### Problem 2 - Pfeil-Anzeige
- [ ] Doppelpfeil wird angezeigt wenn Spalte nicht sortiert
- [ ] Pfeil nach oben wird angezeigt wenn Spalte aufsteigend sortiert
- [ ] Pfeil nach unten wird angezeigt wenn Spalte absteigend sortiert
- [ ] Pfeil ist blau wenn aktiv, grau wenn nicht aktiv
- [ ] Funktioniert in Table-View
- [ ] Funktioniert in Card-View (falls Table-Header vorhanden)

### Problem 3 - TourBookings Filter
- [ ] FilterPane wird nicht angezeigt wenn `activeTab === 'tourBookings'`
- [ ] SavedFilterTags werden nicht angezeigt wenn `activeTab === 'tourBookings'`
- [ ] FilterPane wird korrekt angezeigt für `activeTab === 'todos'`
- [ ] FilterPane wird korrekt angezeigt für `activeTab === 'reservations'`
- [ ] SavedFilterTags werden korrekt angezeigt für `activeTab === 'todos'`
- [ ] SavedFilterTags werden korrekt angezeigt für `activeTab === 'reservations'`

---

## Risiken

- **Niedrig:** Änderungen sind isoliert und betreffen nur Worktracker
- **handleSort useCallback:** Muss Dependencies korrekt setzen (tasksSettings.sortConfig, updateTasksSortConfig)
- **Pfeil-Anzeige:** Muss beide Table-Header-Instanzen anpassen (Table-View, Card-View)
- **Filter-Bedingungen:** Muss alle Instanzen von FilterPane und SavedFilterTags prüfen und anpassen

---

## Abhängigkeiten

- Keine externen Abhängigkeiten
- Alle benötigten Icons sind bereits in `@heroicons/react/24/outline` verfügbar
- `useCallback` ist bereits importiert (Zeile 1)

---

## Referenzen

- `frontend/src/components/Requests.tsx` - Beispiel für korrekte Sortierung (verwendet handleMainSortChange über TableColumnConfig)
- `frontend/src/components/TableColumnConfig.tsx` - Beispiel für Pfeil-Anzeige-Logik (Zeile 86-92)
- `frontend/src/pages/Worktracker.tsx` - Aktuelle Implementierung (Zeile 1160-1170, 2418-2424, 3677-3715)

