# Worktracker.tsx - Detaillierter Ersetzungsplan für title= Attribute

## Übersicht

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Anzahl title= Attribute:** 21 (davon sind einige DataCard props, die nicht ersetzt werden müssen)  
**Tatsächliche title= Attribute zu ersetzen:** 15

## Identifizierte title= Attribute

### Gruppe 1: View-Mode Toggle Buttons (2x)

#### 1.1 Erste Instanz - Zeile 1188
**Kontext:** View-Mode Toggle Button im Header-Bereich (Tasks-Tab)
**Eindeutiger Kontext:**
- Vorher: `{/* View-Mode Toggle */}`
- Nachher: `{/* Filter-Button */}`
- In: `<div className="flex items-center gap-1.5">` nach dem Search-Input

**Aktueller Code:**
```tsx
{/* View-Mode Toggle */}
<button
    className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
        viewMode === 'cards' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''
    }`}
    onClick={() => updateViewMode(viewMode === 'table' ? 'cards' : 'table')}
    title={viewMode === 'table' ? t('common.viewAsCards') : t('common.viewAsTable')}
>
    {viewMode === 'table' ? (
        <Squares2X2Icon className="h-5 w-5" />
    ) : (
        <TableCellsIcon className="h-5 w-5" />
    )}
</button>
```

**Ersetzung:**
```tsx
{/* View-Mode Toggle */}
<div className="relative group">
    <button
        className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
            viewMode === 'cards' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''
        }`}
        onClick={() => updateViewMode(viewMode === 'table' ? 'cards' : 'table')}
    >
        {viewMode === 'table' ? (
            <Squares2X2Icon className="h-5 w-5" />
        ) : (
            <TableCellsIcon className="h-5 w-5" />
        )}
    </button>
    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
        {viewMode === 'table' ? t('common.viewAsCards') : t('common.viewAsTable')}
    </div>
</div>
```

#### 1.2 Zweite Instanz - Zeile 2166
**Kontext:** View-Mode Toggle Button im Header-Bereich (Reservations-Tab)
**Eindeutiger Kontext:**
- Vorher: Sync-Button (wenn activeTab === 'reservations')
- Nachher: `{/* Filter-Button */}`
- In: `<div className="flex items-center gap-1.5">` nach dem Search-Input

**Aktueller Code:** (identisch mit 1.1)

**Ersetzung:** (identisch mit 1.1)

---

### Gruppe 2: Filter Buttons (2x)

#### 2.1 Erste Instanz - Zeile 1201
**Kontext:** Filter-Button im Header-Bereich (Tasks-Tab)
**Eindeutiger Kontext:**
- Vorher: View-Mode Toggle Button
- Nachher: Status-Filter oder Spalten-Konfiguration
- In: `<div className="flex items-center gap-1.5">`
- Hat: `ml-1 relative` Klassen
- Hat: Badge mit `getActiveFilterCount()` wenn > 0

**Aktueller Code:**
```tsx
{/* Filter-Button */}
<button
    className={`p-2 rounded-md ${getActiveFilterCount() > 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} ml-1 relative`}
    onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
    title={t('common.filter')}
>
    <FunnelIcon className="w-5 h-5" />
    {getActiveFilterCount() > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
            {getActiveFilterCount()}
        </span>
    )}
</button>
```

**Ersetzung:**
```tsx
{/* Filter-Button */}
<div className="relative group ml-1">
    <button
        className={`p-2 rounded-md ${getActiveFilterCount() > 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} relative`}
        onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
    >
        <FunnelIcon className="w-5 h-5" />
        {getActiveFilterCount() > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
                {getActiveFilterCount()}
            </span>
        )}
    </button>
    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
        {t('common.filter')}
    </div>
</div>
```

#### 2.2 Zweite Instanz - Zeile 2179
**Kontext:** Filter-Button im Header-Bereich (Reservations-Tab)
**Eindeutiger Kontext:**
- Vorher: View-Mode Toggle Button
- Nachher: Status-Filter oder Spalten-Konfiguration
- In: `<div className="flex items-center gap-1.5">`
- Hat: `ml-1 relative` Klassen
- Hat: Badge mit `getActiveFilterCount()` wenn > 0

**Aktueller Code:** (identisch mit 2.1)

**Ersetzung:** (identisch mit 2.1)

---

### Gruppe 3: Show Description Buttons (2x)

#### 3.1 Erste Instanz - Zeile 1447
**Kontext:** Info-Button für Task-Beschreibung in Table-View
**Eindeutiger Kontext:**
- In: `<td>` Element in Table-View
- Vorher: `{task.title}`
- Nachher: Großer Tooltip mit MarkdownPreview
- Hat bereits: `relative group` div
- Button hat: `InformationCircleIcon`

**Aktueller Code:**
```tsx
{task.description && (
    <div className="ml-2 relative group">
        <button 
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            title={t('tasks.showDescription')}
        >
            <InformationCircleIcon className="h-5 w-5" />
        </button>
        <div className="absolute left-0 mt-2 p-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 w-144 max-h-96 overflow-y-auto min-w-[36rem] z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <MarkdownPreview content={task.description} showImagePreview={true} />
        </div>
    </div>
)}
```

**Ersetzung:**
```tsx
{task.description && (
    <div className="ml-2 relative group">
        <button 
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
            <InformationCircleIcon className="h-5 w-5" />
        </button>
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
            {t('tasks.showDescription')}
        </div>
        <div className="absolute left-0 mt-2 p-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 w-144 max-h-96 overflow-y-auto min-w-[36rem] z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <MarkdownPreview content={task.description} showImagePreview={true} />
        </div>
    </div>
)}
```

#### 3.2 Zweite Instanz - Zeile 2418
**Kontext:** Info-Button für Task-Beschreibung in Table-View (zweite Instanz)
**Eindeutiger Kontext:**
- In: `<td>` Element in Table-View (zweiter Bereich)
- Vorher: `{task.title}`
- Nachher: Großer Tooltip mit MarkdownPreview
- Hat bereits: `relative group` div
- Button hat: `InformationCircleIcon`

**Aktueller Code:** (identisch mit 3.1)

**Ersetzung:** (identisch mit 3.1)

---

### Gruppe 4: Copy Task Buttons (2x)

#### 4.1 Erste Instanz - Zeile 1680
**Kontext:** Copy-Button in Card-View Actions (Tasks)
**Eindeutiger Kontext:**
- In: `<div className="flex items-center space-x-2">` (actionButtons)
- Vorher: Edit-Button (wenn `hasPermission('tasks', 'write', 'table')`)
- Nachher: `</div>` und `return <DataCard>`
- Button hat: `DocumentDuplicateIcon`
- Hat: `handleCopyTask(task)` onClick

**Aktueller Code:**
```tsx
{hasPermission('tasks', 'both', 'table') && (
    <button
        onClick={(e) => {
            e.stopPropagation();
            handleCopyTask(task);
        }}
        className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
        title={t('tasks.actions.copy')}
    >
        <DocumentDuplicateIcon className="h-4 w-4" />
    </button>
)}
```

**Ersetzung:**
```tsx
{hasPermission('tasks', 'both', 'table') && (
    <div className="relative group">
        <button
            onClick={(e) => {
                e.stopPropagation();
                handleCopyTask(task);
            }}
            className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
        >
            <DocumentDuplicateIcon className="h-4 w-4" />
        </button>
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
            {t('tasks.actions.copy')}
        </div>
    </div>
)}
```

#### 4.2 Zweite Instanz - Zeile 2651
**Kontext:** Copy-Button in Card-View Actions (Tasks, zweite Instanz)
**Eindeutiger Kontext:**
- In: `<div className="flex items-center space-x-2">` (actionButtons)
- Vorher: Edit-Button (wenn `hasPermission('tasks', 'write', 'table')`)
- Nachher: `</div>` und `return <DataCard>`
- Button hat: `DocumentDuplicateIcon`
- Hat: `handleCopyTask(task)` onClick

**Aktueller Code:** (identisch mit 4.1)

**Ersetzung:** (identisch mit 4.1)

---

### Gruppe 5: View Details Buttons (4x)

#### 5.1 Erste Instanz - Zeile 1897
**Kontext:** View Details Button für Reservations in Card-View
**Eindeutiger Kontext:**
- In: `<div className="flex items-center space-x-2">` (actionButtons für Reservations)
- Vorher: `{hasPermission('reservations', 'write', 'table') && (`
- Nachher: `)}` und `</div>`
- Button hat: `InformationCircleIcon`
- Hat: `navigate(\`/reservations/${reservation.id}\`)` onClick

**Aktueller Code:**
```tsx
{hasPermission('reservations', 'write', 'table') && (
    <button
        onClick={(e) => {
            e.stopPropagation();
            navigate(`/reservations/${reservation.id}`);
        }}
        className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        title={t('common.viewDetails', 'Details anzeigen')}
    >
        <InformationCircleIcon className="h-4 w-4" />
    </button>
)}
```

**Ersetzung:**
```tsx
{hasPermission('reservations', 'write', 'table') && (
    <div className="relative group">
        <button
            onClick={(e) => {
                e.stopPropagation();
                navigate(`/reservations/${reservation.id}`);
            }}
            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
            <InformationCircleIcon className="h-4 w-4" />
        </button>
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
            {t('common.viewDetails', 'Details anzeigen')}
        </div>
    </div>
)}
```

#### 5.2 Zweite Instanz - Zeile 2036
**Kontext:** View Details Button für Reservations (zweite Instanz)
**Eindeutiger Kontext:**
- In: Reservations-Bereich, zweite Instanz
- Button hat: `InformationCircleIcon`
- Hat: `navigate(\`/reservations/${reservation.id}\`)` onClick

**Aktueller Code:** (identisch mit 5.1)

**Ersetzung:** (identisch mit 5.1)

#### 5.3 Dritte Instanz - Zeile 2868
**Kontext:** View Details Button für Reservations (dritte Instanz)
**Eindeutiger Kontext:**
- In: Reservations-Bereich, dritte Instanz
- Button hat: `InformationCircleIcon`
- Hat: `navigate(\`/reservations/${reservation.id}\`)` onClick

**Aktueller Code:** (identisch mit 5.1)

**Ersetzung:** (identisch mit 5.1)

#### 5.4 Vierte Instanz - Zeile 3007
**Kontext:** View Details Button für Reservations (vierte Instanz)
**Eindeutiger Kontext:**
- In: Reservations-Bereich, vierte Instanz
- Button hat: `InformationCircleIcon`
- Hat: `navigate(\`/reservations/${reservation.id}\`)` onClick

**Aktueller Code:** (identisch mit 5.1)

**Ersetzung:** (identisch mit 5.1)

---

### Gruppe 6: Create Buttons (2x)

#### 6.1 Create Task Button - Zeile 2089
**Kontext:** Create Task Button im Header
**Eindeutiger Kontext:**
- In: Header-Bereich
- Vorher: `{!readOnly && hasPermission('tasks', 'write', 'table') && (`
- Nachher: Create Reservation Button
- Button hat: `PlusIcon`

**Aktueller Code:**
```tsx
{!readOnly && hasPermission('tasks', 'write', 'table') && (
    <button
        onClick={() => setIsCreateModalOpen(true)}
        className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
        title={t('tasks.createTask')}
    >
        <PlusIcon className="h-5 w-5" />
    </button>
)}
```

**Ersetzung:**
```tsx
{!readOnly && hasPermission('tasks', 'write', 'table') && (
    <div className="relative group">
        <button
            onClick={() => setIsCreateModalOpen(true)}
            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
        >
            <PlusIcon className="h-5 w-5" />
        </button>
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
            {t('tasks.createTask')}
        </div>
    </div>
)}
```

#### 6.2 Create Reservation Button - Zeile 2101
**Kontext:** Create Reservation Button im Header
**Eindeutiger Kontext:**
- In: Header-Bereich
- Vorher: Create Task Button
- Nachher: Sync Button (wenn activeTab === 'reservations')
- Button hat: `PlusIcon`

**Aktueller Code:**
```tsx
{!readOnly && hasPermission('reservations', 'write', 'table') && activeTab === 'reservations' && (
    <button
        onClick={() => setIsCreateReservationModalOpen(true)}
        className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
        title={t('reservations.createReservation.button', 'Neue Reservierung')}
    >
        <PlusIcon className="h-5 w-5" />
    </button>
)}
```

**Ersetzung:**
```tsx
{!readOnly && hasPermission('reservations', 'write', 'table') && activeTab === 'reservations' && (
    <div className="relative group">
        <button
            onClick={() => setIsCreateReservationModalOpen(true)}
            className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
        >
            <PlusIcon className="h-5 w-5" />
        </button>
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
            {t('reservations.createReservation.button', 'Neue Reservierung')}
        </div>
    </div>
)}
```

---

### Gruppe 7: Sync Button (1x)

#### 7.1 Sync Reservations Button - Zeile 2154
**Kontext:** Sync Reservations Button im Header
**Eindeutiger Kontext:**
- In: Header-Bereich
- Vorher: Create Reservation Button
- Nachher: View-Mode Toggle
- Button hat: `ArrowPathIcon` mit `animate-spin` wenn syncing
- Hat: `disabled={syncingReservations}`

**Aktueller Code:**
```tsx
{activeTab === 'reservations' && (
    <button
        onClick={handleSyncReservations}
        disabled={syncingReservations}
        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        title={syncingReservations ? t('reservations.syncing', 'Synchronisiere...') : t('reservations.sync', 'Synchronisieren')}
    >
        <ArrowPathIcon className={`h-5 w-5 ${syncingReservations ? 'animate-spin' : ''}`} />
    </button>
)}
```

**Ersetzung:**
```tsx
{activeTab === 'reservations' && (
    <div className="relative group">
        <button
            onClick={handleSyncReservations}
            disabled={syncingReservations}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <ArrowPathIcon className={`h-5 w-5 ${syncingReservations ? 'animate-spin' : ''}`} />
        </button>
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
            {syncingReservations ? t('reservations.syncing', 'Synchronisiere...') : t('reservations.sync', 'Synchronisieren')}
        </div>
    </div>
)}
```

---

## Zusammenfassung

**Zu ersetzende title= Attribute:** 15

1. ✅ View-Mode Toggle (2x): Zeilen 1188, 2166
2. ✅ Filter Button (2x): Zeilen 1201, 2179
3. ✅ Show Description (2x): Zeilen 1447, 2418
4. ✅ Copy Task (2x): Zeilen 1680, 2651
5. ✅ View Details (4x): Zeilen 1897, 2036, 2868, 3007
6. ✅ Create Task (1x): Zeile 2089
7. ✅ Create Reservation (1x): Zeile 2101
8. ✅ Sync Reservations (1x): Zeile 2154

**NICHT zu ersetzen (DataCard props):**
- Zeile 1691: `title={task.title}` - DataCard prop
- Zeile 1908: `title={reservation.guestName}` - DataCard prop
- Zeile 1909: `subtitle={...}` - DataCard prop
- Zeile 2662: `title={task.title}` - DataCard prop
- Zeile 2879: `title={reservation.guestName}` - DataCard prop
- Zeile 2880: `subtitle={...}` - DataCard prop

## Vorgehensweise

1. **Systematisch jede Gruppe abarbeiten**
2. **Jede Ersetzung einzeln durchführen**
3. **Nach jeder Ersetzung Linter prüfen**
4. **Bei Fehlern sofort beheben**

## Reihenfolge der Umsetzung

1. Gruppe 1: View-Mode Toggle (2x)
2. Gruppe 2: Filter Button (2x)
3. Gruppe 3: Show Description (2x)
4. Gruppe 4: Copy Task (2x)
5. Gruppe 5: View Details (4x)
6. Gruppe 6: Create Buttons (2x)
7. Gruppe 7: Sync Button (1x)

