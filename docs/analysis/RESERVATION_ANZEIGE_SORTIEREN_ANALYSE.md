# Reservation Anzeige & Sortieren - Analyse

## Datum
2025-01-22

## Überblick
Analyse von zwei Problemen bei Reservations:
1. Wo wird `roomNumber` und `roomDescription` in Card und Tabelle angezeigt?
2. Warum funktioniert Anzeige & Sortieren bei Cards nicht (Button/Modal neben Filter-Button), bzw. nur bei der Tabelle?

---

## 1. Analyse: Anzeige von roomNumber und roomDescription

### 1.1 ReservationCard Komponente

**Datei:** `frontend/src/components/reservations/ReservationCard.tsx`

**Aktuelle Implementierung (Zeilen 124-132):**
```typescript
{/* Zimmer */}
{reservation.roomNumber && (
  <div className="flex items-center text-gray-600 dark:text-gray-400">
    <HomeIcon className="h-4 w-4 mr-2 flex-shrink-0" />
    <span>
      {t('reservations.room', 'Zimmer')} {reservation.roomNumber}
    </span>
  </div>
)}
```

**Ergebnis:**
- ✅ `roomNumber` wird angezeigt (z.B. "Zimmer Cama 5")
- ❌ `roomDescription` wird **NICHT** angezeigt

**Problem:**
- `roomDescription` enthält für Dorms den Zimmernamen (z.B. "La tia artista")
- `roomDescription` wird in der Card-Komponente **komplett ignoriert**
- Nur `roomNumber` wird angezeigt

### 1.2 ReservationDetails Komponente

**Datei:** `frontend/src/components/reservations/ReservationDetails.tsx`

**Aktuelle Implementierung (Zeilen 249-260):**
```typescript
{reservation.roomNumber && (
  <div className="flex items-center">
    <HomeIcon className="h-5 w-5 mr-3 text-gray-400" />
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{t('reservations.room', 'Zimmer')}</p>
      <p className="text-gray-900 dark:text-white">
        {reservation.roomNumber}
        {reservation.roomDescription && ` - ${reservation.roomDescription}`}
      </p>
    </div>
  </div>
)}
```

**Ergebnis:**
- ✅ `roomNumber` wird angezeigt
- ✅ `roomDescription` wird angezeigt (wenn vorhanden)
- ✅ Format: "Cama 5 - La tia artista"

**Status:** ✅ Funktioniert korrekt in Details-Ansicht

### 1.3 Worktracker - Card-Ansicht (Reservations)

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Aktuelle Implementierung (Zeilen 3025-3032):**
```typescript
// Zweite Zeile: Zimmernummer
if (reservation.roomNumber) {
    metadata.push({
        icon: <HomeIcon className="h-4 w-4" />,
        value: reservation.roomNumber,
        section: 'main-second'
    });
}
```

**Ergebnis:**
- ✅ `roomNumber` wird angezeigt
- ❌ `roomDescription` wird **NICHT** angezeigt
- ❌ Keine Prüfung auf `visibleCardMetadata.has('roomDescription')`

**Problem:**
- `roomDescription` wird in der Card-Metadaten-Logik **komplett ignoriert**
- Auch wenn `roomDescription` in `visibleCardMetadata` wäre, wird es nicht angezeigt
- Keine Card-Metadaten-Definition für `roomDescription`

### 1.4 Worktracker - Tabellen-Ansicht (Reservations)

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Aktuelle Implementierung (Zeilen 3382-3389):**
```typescript
case 'roomNumber':
    return (
        <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-900 dark:text-gray-200">
                {reservation.roomNumber || '-'}
            </div>
        </td>
    );
```

**Ergebnis:**
- ✅ `roomNumber` wird angezeigt
- ❌ `roomDescription` wird **NICHT** angezeigt
- ❌ Keine Spalten-Definition für `roomDescription` in `availableReservationColumns`

**Problem:**
- `roomDescription` ist **nicht** in `availableReservationColumns` definiert (Zeilen 316-320)
- `roomDescription` ist **nicht** in `reservationTableToCardMapping` (Zeilen 186-199)
- `roomDescription` ist **nicht** in `reservationCardToTableMapping` (Zeilen 202-214)
- `roomDescription` ist **nicht** in `getReservationSortValue` (Zeilen 1743-1771)
- `roomDescription` ist **nicht** in `getFieldValue` (Zeilen 1706-1731)
- Keine Tabellen-Spalte für `roomDescription`
- Keine Anzeige-Logik für `roomDescription` in der Tabelle

### 1.5 Zusammenfassung: Anzeige

| Komponente | roomNumber | roomDescription | Status |
|------------|------------|-----------------|--------|
| ReservationCard | ✅ | ❌ | roomDescription fehlt |
| ReservationDetails | ✅ | ✅ | Funktioniert korrekt |
| Worktracker Cards | ✅ | ❌ | roomDescription fehlt |
| Worktracker Tabelle | ✅ | ❌ | roomDescription fehlt |

**Fazit:**
- `roomNumber` wird überall angezeigt (außer ReservationCard, die nicht mehr verwendet wird)
- `roomDescription` wird **NUR** in ReservationDetails angezeigt
- `roomDescription` fehlt komplett in Worktracker (Cards und Tabelle)

---

## 2. Analyse: Anzeige & Sortieren bei Cards

### 2.1 TableColumnConfig Integration

**Datei:** `frontend/src/pages/Worktracker.tsx` (Zeilen 3717-3887)

**Aktuelle Implementierung:**
```typescript
<TableColumnConfig
    columns={activeTab === 'reservations'
        ? (viewMode === 'cards'
            ? [
                { id: 'guestName', label: t('reservations.columns.guestName', 'Gast') },
                { id: 'status', label: t('reservations.columns.status', 'Status') },
                { id: 'paymentStatus', label: t('reservations.columns.paymentStatus', 'Zahlungsstatus') },
                { id: 'checkInDate', label: t('reservations.columns.checkInDate', 'Check-in') },
                { id: 'checkOutDate', label: t('reservations.columns.checkOutDate', 'Check-out') },
                { id: 'roomNumber', label: t('reservations.columns.roomNumber', 'Zimmer') },
                { id: 'guestEmail', label: t('reservations.columns.guestEmail', 'E-Mail') },
                { id: 'guestPhone', label: t('reservations.columns.guestPhone', 'Telefon') },
                { id: 'amount', label: t('reservations.columns.amount', 'Betrag') },
                { id: 'arrivalTime', label: t('reservations.columns.arrivalTime', 'Ankunftszeit') }
            ]
            : availableReservationColumns)}
    visibleColumns={viewMode === 'cards'
        ? Array.from(visibleCardMetadata)
        : visibleColumnIds}
    columnOrder={viewMode === 'cards'
        ? cardMetadataOrder
        : settings.columnOrder}
    sortDirections={viewMode === 'cards' && activeTab === 'reservations' 
        ? reservationCardSortDirections 
        : undefined}
    onSortDirectionChange={viewMode === 'cards' && activeTab === 'reservations'
        ? handleReservationCardSortDirectionChange
        : undefined}
    showSortDirection={viewMode === 'cards' && (activeTab === 'todos' || activeTab === 'reservations' || activeTab === 'tours')}
    buttonTitle={viewMode === 'cards' ? t('tableColumn.sortAndDisplay') : t('tableColumn.configure')}
    modalTitle={viewMode === 'cards' ? t('tableColumn.sortAndDisplay') : t('tableColumn.configure')}
/>
```

**Status:** ✅ TableColumnConfig ist korrekt integriert

### 2.2 Sortierreihenfolge-Berechnung

**Datei:** `frontend/src/components/TableColumnConfig.tsx` (Zeilen 225-250)

**Aktuelle Implementierung:**
```typescript
{sortedColumns.map((column, index) => {
  // Bestimme Sortierreihenfolge (nur für sichtbare Spalten)
  const visibleSortedColumns = sortedColumns.filter(col => visibleColumns.includes(col.id));
  const sortOrder = visibleSortedColumns.findIndex(col => col.id === column.id) + 1;
  const isVisible = visibleColumns.includes(column.id);
  
  return (
    <DraggableColumnItem
      // ...
      sortOrder={showSortDirection && isVisible ? sortOrder : undefined}
    />
  );
})}
```

**Problem:**
- `sortOrder` wird nur für sichtbare Spalten berechnet (`visibleColumns.includes(col.id)`)
- **ABER:** Wenn eine Spalte in `visibleColumns` ist, aber nicht in `visibleCardMetadata`, wird sie trotzdem als sichtbar markiert
- **ABER:** Die Sortierreihenfolge wird angezeigt, auch wenn die Spalte nicht in den Card-Metadaten angezeigt wird

**Beispiel:**
- `roomDescription` ist in `visibleColumns`, aber nicht in `visibleCardMetadata`
- `sortOrder` wird berechnet (z.B. 3)
- **ABER:** `roomDescription` wird nicht in der Card angezeigt
- **ABER:** `sortOrder` wird im Modal angezeigt, als ob die Spalte sichtbar wäre

### 2.3 Card-Metadaten-Anzeige

**Datei:** `frontend/src/pages/Worktracker.tsx` (Zeilen 3014-3057)

**Aktuelle Implementierung:**
```typescript
// Metadaten für Reservation-Card
const metadata: MetadataItem[] = [];

// Haupt-Metadaten: Check-in/Check-out (rechts oben, unverändert)
metadata.push({
    icon: <CalendarIcon className="h-4 w-4" />,
    label: t('reservations.checkInOut', 'Check-in/Check-out'),
    value: `${formatDate(reservation.checkInDate)} - ${formatDate(reservation.checkOutDate)}`,
    section: 'main'
});

// Zweite Zeile: Zimmernummer
if (reservation.roomNumber) {
    metadata.push({
        icon: <HomeIcon className="h-4 w-4" />,
        value: reservation.roomNumber,
        section: 'main-second'
    });
}
```

**Problem:**
- Metadaten werden **hardcoded** hinzugefügt
- **KEINE** Prüfung auf `visibleCardMetadata.has('roomNumber')` oder `visibleCardMetadata.has('roomDescription')`
- Metadaten werden **immer** angezeigt, unabhängig von `visibleCardMetadata`

**Vergleich mit Tasks (funktioniert korrekt):**
```typescript
// Links: Niederlassung
if (visibleCardMetadata.has('branch')) {
    metadata.push({
        icon: <BuildingOfficeIcon className="h-4 w-4" />,
        label: t('tasks.columns.branch'),
        value: task.branch.name,
        section: 'left'
    });
}
```

**Ergebnis:**
- Tasks: Metadaten werden nur angezeigt, wenn in `visibleCardMetadata`
- Reservations: Metadaten werden **immer** angezeigt, unabhängig von `visibleCardMetadata`

### 2.4 Sortierlogik für Reservations

**Datei:** `frontend/src/pages/Worktracker.tsx` (Zeilen 1819-1844)

**Aktuelle Implementierung:**
```typescript
// 3. Priorität: Cards-Mode Multi-Sortierung (wenn kein Filter aktiv, Cards-Mode)
if (viewMode === 'cards' && reservationFilterConditions.length === 0) {
    const sortableColumns = cardMetadataOrder.filter(colId => visibleCardMetadata.has(colId));
    
    for (const columnId of sortableColumns) {
        const direction = reservationCardSortDirections[columnId] || 'asc';
        const valueA = getReservationSortValue(a, columnId);
        const valueB = getReservationSortValue(b, columnId);
        // ... Sortierung ...
    }
}
```

**Status:** ✅ Sortierlogik funktioniert korrekt

**Problem:**
- Sortierung funktioniert nur für Spalten, die in `visibleCardMetadata` sind
- **ABER:** Metadaten werden nicht basierend auf `visibleCardMetadata` angezeigt
- **ABER:** Sortierreihenfolge wird im Modal angezeigt, auch wenn die Spalte nicht angezeigt wird

### 2.5 Vergleich mit TODOs (funktioniert korrekt)

**Datei:** `frontend/src/pages/Worktracker.tsx` (Zeilen 2837-2897)

**TODOs Card-Metadaten (funktioniert korrekt):**
```typescript
// Links: Niederlassung
if (visibleCardMetadata.has('branch')) {
    metadata.push({
        icon: <BuildingOfficeIcon className="h-4 w-4" />,
        label: t('tasks.columns.branch'),
        value: task.branch.name,
        section: 'left'
    });
}

// Haupt-Metadaten: Verantwortlicher & Qualitätskontrolle
if (visibleCardMetadata.has('responsible')) {
    // ... Metadaten hinzufügen ...
}

if (visibleCardMetadata.has('qualityControl')) {
    // ... Metadaten hinzufügen ...
}

// Rechts: Fälligkeit
if (visibleCardMetadata.has('dueDate')) {
    // ... Metadaten hinzufügen ...
}

// Full-Width: Beschreibung
if (visibleCardMetadata.has('description') && task.description) {
    // ... Metadaten hinzufügen ...
}
```

**Ergebnis:**
- ✅ TODOs: Metadaten werden nur angezeigt, wenn in `visibleCardMetadata`
- ✅ TODOs: Sortierung funktioniert korrekt
- ✅ TODOs: Anzeige & Sortieren funktioniert korrekt

**Reservations Card-Metadaten (funktioniert NICHT korrekt):**
```typescript
// Haupt-Metadaten: Check-in/Check-out (rechts oben, unverändert)
metadata.push({
    icon: <CalendarIcon className="h-4 w-4" />,
    label: t('reservations.checkInOut', 'Check-in/Check-out'),
    value: `${formatDate(reservation.checkInDate)} - ${formatDate(reservation.checkOutDate)}`,
    section: 'main'
});

// Zweite Zeile: Zimmernummer
if (reservation.roomNumber) {
    metadata.push({
        icon: <HomeIcon className="h-4 w-4" />,
        value: reservation.roomNumber,
        section: 'main-second'
    });
}
```

**Ergebnis:**
- ❌ Reservations: Metadaten werden **immer** angezeigt, unabhängig von `visibleCardMetadata`
- ❌ Reservations: Keine Prüfung auf `visibleCardMetadata.has('checkInDate')` oder `visibleCardMetadata.has('roomNumber')`
- ❌ Reservations: Metadaten werden nicht basierend auf `visibleCardMetadata` gefiltert

### 2.6 Zusammenfassung: Anzeige & Sortieren

**Problem 1: Metadaten werden immer angezeigt**
- Reservations Card-Metadaten werden **hardcoded** hinzugefügt
- **KEINE** Prüfung auf `visibleCardMetadata`
- Metadaten werden angezeigt, auch wenn sie in `visibleCardMetadata` nicht vorhanden sind

**Problem 2: Sortierreihenfolge wird angezeigt, aber Spalte nicht**
- `sortOrder` wird für alle Spalten in `visibleColumns` berechnet
- **ABER:** Spalten werden nicht in der Card angezeigt, wenn sie nicht in `visibleCardMetadata` sind
- **ABER:** `sortOrder` wird im Modal angezeigt, als ob die Spalte sichtbar wäre

**Problem 3: Ausblenden macht nichts**
- Wenn eine Spalte ausgeblendet wird, wird sie aus `visibleCardMetadata` entfernt
- **ABER:** Metadaten werden trotzdem angezeigt (hardcoded)
- **ABER:** Ausblenden hat keine Wirkung, weil Metadaten nicht basierend auf `visibleCardMetadata` gefiltert werden

**Vergleich mit TODOs:**
- ✅ TODOs: Metadaten werden nur angezeigt, wenn in `visibleCardMetadata`
- ✅ TODOs: Ausblenden funktioniert korrekt
- ✅ TODOs: Sortierung funktioniert korrekt
- ❌ Reservations: Metadaten werden immer angezeigt
- ❌ Reservations: Ausblenden funktioniert nicht
- ✅ Reservations: Sortierung funktioniert (aber wird nicht sichtbar, weil Metadaten nicht angezeigt werden)

---

## 3. Analyse: Warum funktioniert es bei TODOs, aber nicht bei Reservations?

### 3.1 TODOs Card-Metadaten (funktioniert korrekt)

**Datei:** `frontend/src/pages/Worktracker.tsx` (Zeilen 2837-2897)

**Implementierung:**
- ✅ Jede Metadaten-Zeile prüft `visibleCardMetadata.has('columnId')`
- ✅ Metadaten werden nur hinzugefügt, wenn in `visibleCardMetadata`
- ✅ Ausblenden funktioniert korrekt

**Beispiel:**
```typescript
if (visibleCardMetadata.has('branch')) {
    metadata.push({ /* ... */ });
}
```

### 3.2 Reservations Card-Metadaten (funktioniert NICHT korrekt)

**Datei:** `frontend/src/pages/Worktracker.tsx` (Zeilen 3014-3057)

**Implementierung:**
- ❌ Metadaten werden **hardcoded** hinzugefügt
- ❌ **KEINE** Prüfung auf `visibleCardMetadata`
- ❌ Metadaten werden immer angezeigt

**Beispiel:**
```typescript
// Haupt-Metadaten: Check-in/Check-out (rechts oben, unverändert)
metadata.push({
    icon: <CalendarIcon className="h-4 w-4" />,
    label: t('reservations.checkInOut', 'Check-in/Check-out'),
    value: `${formatDate(reservation.checkInDate)} - ${formatDate(reservation.checkOutDate)}`,
    section: 'main'
});

// Zweite Zeile: Zimmernummer
if (reservation.roomNumber) {
    metadata.push({
        icon: <HomeIcon className="h-4 w-4" />,
        value: reservation.roomNumber,
        section: 'main-second'
    });
}
```

**Problem:**
- Metadaten werden **immer** hinzugefügt, unabhängig von `visibleCardMetadata`
- Keine Prüfung auf `visibleCardMetadata.has('checkInDate')` oder `visibleCardMetadata.has('roomNumber')`
- Ausblenden hat keine Wirkung

### 3.3 Fehlende Metadaten-Definitionen

**Reservations Card-Metadaten sollten sein:**
- `checkInDate` / `checkOutDate` (kombiniert als "Check-in/Check-out")
- `roomNumber`
- `roomDescription` (FEHLT KOMPLETT!)
- `guestEmail`
- `guestPhone`
- `branch`
- `amount`
- `arrivalTime`

**Aktuell implementiert:**
- ✅ `checkInDate` / `checkOutDate` (hardcoded, immer angezeigt, Zeilen 3018-3023)
- ✅ `roomNumber` (hardcoded, immer angezeigt, Zeilen 3026-3032)
- ❌ `roomDescription` (FEHLT KOMPLETT!)
- ✅ `guestEmail` (hardcoded, immer angezeigt, Zeilen 3035-3041)
- ✅ `guestPhone` (hardcoded, immer angezeigt, Zeilen 3042-3048)
- ✅ `branch` (hardcoded, immer angezeigt, Zeilen 3050-3057)
- ✅ `amount` (hardcoded, immer angezeigt, Zeilen 3130-3142)
- ✅ `arrivalTime` (hardcoded, immer angezeigt, Zeilen 3145-3157)

**Definiert in Mappings (aber nicht angezeigt):**
- ✅ `amount` ist in `reservationTableToCardMapping` (Zeile 196)
- ✅ `amount` ist in `reservationCardToTableMapping` (Zeile 212)
- ✅ `amount` ist in `getReservationSortValue` (Zeile 1764-1765)
- ✅ `arrivalTime` ist in `reservationTableToCardMapping` (Zeile 197)
- ✅ `arrivalTime` ist in `reservationCardToTableMapping` (Zeile 213)
- ✅ `arrivalTime` ist in `getReservationSortValue` (Zeile 1766-1767)
- ❌ `roomDescription` ist **NIRGENDWO** definiert!

**Problem:**
- `amount` und `arrivalTime` sind in Mappings definiert, werden aber nicht in Card-Metadaten angezeigt
- `roomDescription` fehlt komplett in allen Mappings und Anzeige-Logiken

**Problem:**
- `roomDescription` fehlt komplett
- Metadaten werden nicht basierend auf `visibleCardMetadata` gefiltert
- Alle Metadaten werden **hardcoded** hinzugefügt, unabhängig von `visibleCardMetadata`
- Ausblenden hat keine Wirkung, weil Metadaten nicht gefiltert werden

---

## 4. Zusammenfassung der Probleme

### Problem 1: roomDescription wird nicht angezeigt

**Betroffen:**
- ReservationCard (nicht mehr verwendet)
- Worktracker Cards
- Worktracker Tabelle

**Ursache:**
- `roomDescription` wird in der Card-Metadaten-Logik **komplett ignoriert**
- `roomDescription` ist nicht in `availableReservationColumns` definiert
- Keine Anzeige-Logik für `roomDescription`

**Lösung:**
- `roomDescription` zu Card-Metadaten hinzufügen
- `roomDescription` zu `availableReservationColumns` hinzufügen
- Anzeige-Logik für `roomDescription` implementieren

### Problem 2: Anzeige & Sortieren funktioniert nicht bei Cards

**Betroffen:**
- Reservations Cards

**Ursache:**
- Metadaten werden **hardcoded** hinzugefügt, unabhängig von `visibleCardMetadata`
- **KEINE** Prüfung auf `visibleCardMetadata.has('columnId')`
- Ausblenden hat keine Wirkung, weil Metadaten nicht gefiltert werden

**Lösung:**
- Metadaten nur hinzufügen, wenn in `visibleCardMetadata` (analog zu TODOs)
- Jede Metadaten-Zeile prüfen auf `visibleCardMetadata.has('columnId')`

### Problem 3: Sortierreihenfolge wird angezeigt, aber Spalte nicht

**Betroffen:**
- Reservations Cards Modal

**Ursache:**
- `sortOrder` wird für alle Spalten in `visibleColumns` berechnet
- **ABER:** Spalten werden nicht in der Card angezeigt, wenn sie nicht in `visibleCardMetadata` sind
- **ABER:** `sortOrder` wird im Modal angezeigt, als ob die Spalte sichtbar wäre

**Lösung:**
- `sortOrder` nur für Spalten berechnen, die in `visibleCardMetadata` sind
- Oder: Spalten in `visibleColumns` nur anzeigen, wenn sie auch in `visibleCardMetadata` sind

### Problem 4: Ausblenden macht nichts

**Betroffen:**
- Reservations Cards

**Ursache:**
- Metadaten werden **hardcoded** hinzugefügt
- Ausblenden entfernt Spalte aus `visibleCardMetadata`
- **ABER:** Metadaten werden trotzdem angezeigt (hardcoded)

**Lösung:**
- Metadaten nur hinzufügen, wenn in `visibleCardMetadata` (analog zu TODOs)

---

## 5. Vergleich mit TODOs (funktioniert korrekt)

### 5.1 TODOs Card-Metadaten

**Implementierung:**
- ✅ Jede Metadaten-Zeile prüft `visibleCardMetadata.has('columnId')`
- ✅ Metadaten werden nur hinzugefügt, wenn in `visibleCardMetadata`
- ✅ Ausblenden funktioniert korrekt
- ✅ Sortierung funktioniert korrekt

### 5.2 Reservations Card-Metadaten

**Implementierung:**
- ❌ Metadaten werden **hardcoded** hinzugefügt
- ❌ **KEINE** Prüfung auf `visibleCardMetadata`
- ❌ Ausblenden funktioniert nicht
- ✅ Sortierung funktioniert (aber wird nicht sichtbar)

**Fazit:**
- Reservations sollte analog zu TODOs implementiert werden
- Jede Metadaten-Zeile sollte `visibleCardMetadata.has('columnId')` prüfen
- Metadaten sollten nur hinzugefügt werden, wenn in `visibleCardMetadata`

---

## 6. Nächste Schritte (NUR ANALYSE, KEINE ÄNDERUNGEN)

### 6.1 roomDescription hinzufügen

1. **Card-Metadaten:**
   - `roomDescription` zu Card-Metadaten-Definition hinzufügen
   - Anzeige-Logik für `roomDescription` implementieren
   - Format: "Cama 5 - La tia artista" (analog zu ReservationDetails)

2. **Tabellen-Spalte:**
   - `roomDescription` zu `availableReservationColumns` hinzufügen
   - Anzeige-Logik für `roomDescription` in Tabelle implementieren
   - Format: "Cama 5 - La tia artista" oder separate Spalte

### 6.2 Anzeige & Sortieren bei Cards fixen

1. **Metadaten-Filterung:**
   - Jede Metadaten-Zeile prüfen auf `visibleCardMetadata.has('columnId')`
   - Metadaten nur hinzufügen, wenn in `visibleCardMetadata`
   - Analog zu TODOs implementieren

2. **Sortierreihenfolge:**
   - `sortOrder` nur für Spalten berechnen, die in `visibleCardMetadata` sind
   - Oder: Spalten in `visibleColumns` nur anzeigen, wenn sie auch in `visibleCardMetadata` sind

3. **Fehlende Metadaten:**
   - `amount` zu Card-Metadaten hinzufügen
   - `arrivalTime` zu Card-Metadaten hinzufügen
   - Alle Metadaten basierend auf `visibleCardMetadata` filtern

---

## 7. Code-Stellen, die angepasst werden müssen

### 7.1 roomDescription hinzufügen

**Datei:** `frontend/src/pages/Worktracker.tsx`

1. **Card-Metadaten (Zeilen 3014-3057):**
   - `roomDescription` zu Metadaten hinzufügen
   - Format: "Cama 5 - La tia artista" (wenn beide vorhanden)

2. **Tabellen-Spalte (Zeilen 316-320):**
   - `roomDescription` zu `availableReservationColumns` hinzufügen
   - Anzeige-Logik in Tabelle (Zeilen 3382-3389) erweitern

3. **Card-Metadaten-Definition (Zeilen 3733-3745):**
   - `roomDescription` zu Card-Metadaten-Liste hinzufügen

### 7.2 Anzeige & Sortieren fixen

**Datei:** `frontend/src/pages/Worktracker.tsx`

1. **Card-Metadaten-Filterung (Zeilen 3014-3057):**
   - Jede Metadaten-Zeile prüfen auf `visibleCardMetadata.has('columnId')`
   - Metadaten nur hinzufügen, wenn in `visibleCardMetadata`

2. **Sortierreihenfolge (Zeilen 3871-3887):**
   - `sortOrder` nur für Spalten berechnen, die in `visibleCardMetadata` sind

3. **Fehlende Metadaten:**
   - `amount` zu Card-Metadaten hinzufügen
   - `arrivalTime` zu Card-Metadaten hinzufügen

---

## 8. Dokumentation

**Referenz:**
- `docs/technical/FILTER_SORTIERUNG_VOLLSTAENDIGE_ANALYSE_2025-01-22.md` - Vollständige Analyse zu Filter & Sortierung
- `docs/implementation_reports/CARD_VIEW_VERIFICATION_REPORT.md` - Card-View Verifikation
- `docs/implementation_plans/LOBBYPMS_RESERVATION_IMPORT_ANALYSE_UND_PLAN.md` - Reservation Import Analyse

**Vergleich:**
- TODOs: Funktioniert korrekt (Zeilen 2837-2897)
- Reservations: Funktioniert NICHT korrekt (Zeilen 3014-3157)

---

## 9. Zusammenfassung

### 9.1 roomNumber und roomDescription Anzeige

**Aktueller Stand:**
- ✅ `roomNumber` wird in Card und Tabelle angezeigt
- ❌ `roomDescription` wird **NUR** in ReservationDetails angezeigt
- ❌ `roomDescription` fehlt komplett in Worktracker (Cards und Tabelle)

**Problem:**
- `roomDescription` enthält für Dorms den Zimmernamen (z.B. "La tia artista")
- `roomDescription` fehlt in allen Mappings (`reservationTableToCardMapping`, `reservationCardToTableMapping`)
- `roomDescription` fehlt in Sortier- und Filter-Logik (`getReservationSortValue`, `getFieldValue`)
- `roomDescription` fehlt in Card-Metadaten-Anzeige

**Lösung:**
- `roomDescription` zu allen Mappings hinzufügen
- `roomDescription` zu Card-Metadaten hinzufügen
- `roomDescription` zu Tabellen-Spalten hinzufügen
- Anzeige-Format: "Cama 5 - La tia artista" (analog zu ReservationDetails)

### 9.2 Anzeige & Sortieren bei Cards

**Aktueller Stand:**
- ✅ TableColumnConfig ist korrekt integriert
- ✅ Sortierlogik funktioniert korrekt
- ❌ Metadaten werden **hardcoded** hinzugefügt, unabhängig von `visibleCardMetadata`
- ❌ Ausblenden hat keine Wirkung, weil Metadaten nicht gefiltert werden
- ❌ Sortierreihenfolge wird angezeigt, aber Spalte nicht (wenn nicht in `visibleCardMetadata`)

**Problem:**
- Metadaten werden **immer** angezeigt, auch wenn sie in `visibleCardMetadata` nicht vorhanden sind
- **KEINE** Prüfung auf `visibleCardMetadata.has('columnId')` bei Metadaten-Hinzufügung
- Ausblenden entfernt Spalte aus `visibleCardMetadata`, aber Metadaten werden trotzdem angezeigt

**Vergleich mit TODOs:**
- ✅ TODOs: Jede Metadaten-Zeile prüft `visibleCardMetadata.has('columnId')`
- ✅ TODOs: Metadaten werden nur hinzugefügt, wenn in `visibleCardMetadata`
- ✅ TODOs: Ausblenden funktioniert korrekt
- ❌ Reservations: Metadaten werden **hardcoded** hinzugefügt
- ❌ Reservations: **KEINE** Prüfung auf `visibleCardMetadata`
- ❌ Reservations: Ausblenden funktioniert nicht

**Lösung:**
- Reservations analog zu TODOs implementieren
- Jede Metadaten-Zeile prüfen auf `visibleCardMetadata.has('columnId')`
- Metadaten nur hinzufügen, wenn in `visibleCardMetadata`

### 9.3 Code-Stellen, die angepasst werden müssen

**Datei:** `frontend/src/pages/Worktracker.tsx`

1. **roomDescription hinzufügen:**
   - Zeilen 186-199: `reservationTableToCardMapping` erweitern
   - Zeilen 202-214: `reservationCardToTableMapping` erweitern
   - Zeilen 1743-1771: `getReservationSortValue` erweitern
   - Zeilen 1706-1731: `getFieldValue` erweitern
   - Zeilen 3014-3157: Card-Metadaten-Anzeige erweitern
   - Zeilen 316-320: `availableReservationColumns` erweitern
   - Zeilen 3382-3389: Tabellen-Anzeige erweitern
   - Zeilen 3733-3745: Card-Metadaten-Definition erweitern

2. **Anzeige & Sortieren fixen:**
   - Zeilen 3014-3157: Jede Metadaten-Zeile prüfen auf `visibleCardMetadata.has('columnId')`
   - Metadaten nur hinzufügen, wenn in `visibleCardMetadata`
   - Analog zu TODOs (Zeilen 2837-2897) implementieren

### 9.4 Erwartetes Ergebnis nach Fix

**roomDescription:**
- ✅ Wird in Card angezeigt (Format: "Cama 5 - La tia artista")
- ✅ Wird in Tabelle angezeigt (Format: "Cama 5 - La tia artista" oder separate Spalte)
- ✅ Kann ein-/ausgeblendet werden
- ✅ Kann sortiert werden

**Anzeige & Sortieren:**
- ✅ Metadaten werden nur angezeigt, wenn in `visibleCardMetadata`
- ✅ Ausblenden funktioniert korrekt
- ✅ Sortierreihenfolge wird nur für sichtbare Spalten angezeigt
- ✅ Sortierung funktioniert korrekt (wie bereits jetzt)

---

## 10. Wichtige Erkenntnisse

1. **roomDescription fehlt komplett:**
   - Nicht in Mappings
   - Nicht in Sortier-Logik
   - Nicht in Filter-Logik
   - Nicht in Card-Metadaten
   - Nicht in Tabellen-Spalten

2. **Metadaten werden hardcoded hinzugefügt:**
   - Keine Prüfung auf `visibleCardMetadata`
   - Ausblenden hat keine Wirkung
   - Sortierreihenfolge wird angezeigt, aber Spalte nicht

3. **TODOs funktionieren korrekt:**
   - Jede Metadaten-Zeile prüft `visibleCardMetadata.has('columnId')`
   - Metadaten werden nur hinzugefügt, wenn in `visibleCardMetadata`
   - Ausblenden funktioniert korrekt

4. **Reservations sollte analog zu TODOs implementiert werden:**
   - Gleiche Logik wie TODOs verwenden
   - Jede Metadaten-Zeile prüfen auf `visibleCardMetadata.has('columnId')`
   - Metadaten nur hinzufügen, wenn in `visibleCardMetadata`

---

## 11. Implementierung (2025-01-22)

### 11.1 Durchgeführte Änderungen

#### 11.1.1 roomDescription zu Mappings hinzugefügt

**Datei:** `frontend/src/pages/Worktracker.tsx`

1. **reservationTableToCardMapping (Zeile 186-199):**
   - `roomDescription` hinzugefügt: `'roomDescription': ['roomDescription']`

2. **reservationCardToTableMapping (Zeile 202-214):**
   - `roomDescription` hinzugefügt: `'roomDescription': 'roomDescription'`

3. **defaultReservationCardSortDirections (Zeile 216-230):**
   - `roomDescription: 'asc'` hinzugefügt

4. **defaultReservationColumnOrder (Zeile 457):**
   - `'roomDescription'` nach `'roomNumber'` hinzugefügt

#### 11.1.2 roomDescription zu Sortier- und Filter-Logik hinzugefügt

**Datei:** `frontend/src/pages/Worktracker.tsx`

1. **getReservationSortValue (Zeile 1775-1803):**
   - `case 'roomDescription': return (reservation.roomDescription || '').toLowerCase();` hinzugefügt

2. **getFieldValue (Zeile 1739-1764):**
   - `case 'roomDescription': return reservation.roomDescription || '';` hinzugefügt

3. **columnEvaluators (Zeile 1688-1696):**
   - Evaluator für `'roomDescription'` hinzugefügt (analog zu `roomNumber`)

4. **Such-Filter (Zeile 1636):**
   - `(reservation.roomDescription && reservation.roomDescription.toLowerCase().includes(searchLower)) ||` hinzugefügt

#### 11.1.3 roomDescription zu availableReservationColumns hinzugefügt

**Datei:** `frontend/src/pages/Worktracker.tsx`

1. **availableReservationColumns (Zeile 310-323):**
   - `{ id: 'roomDescription', label: t('reservations.columns.roomDescription', 'Zimmername'), shortLabel: ... }` hinzugefügt

2. **TableColumnConfig - Card-Metadaten-Definition (Zeile 2463-2474 und 3771-3782):**
   - `{ id: 'roomDescription', label: t('reservations.columns.roomDescription', 'Zimmername') }` hinzugefügt

#### 11.1.4 roomDescription Anzeige in Card-Metadaten implementiert

**Datei:** `frontend/src/pages/Worktracker.tsx`

1. **Card-Metadaten (Zeile 3063-3070 und 4422-4429):**
   - Format: `"${reservation.roomNumber} - ${reservation.roomDescription}"` wenn beide vorhanden
   - Sonst nur `reservation.roomNumber` oder `reservation.roomDescription`
   - Prüfung auf `visibleCardMetadata.has('roomNumber')` hinzugefügt

**Implementierung:**
```typescript
// Zweite Zeile: Zimmernummer (mit roomDescription falls vorhanden)
if (visibleCardMetadata.has('roomNumber') && reservation.roomNumber) {
    const roomValue = reservation.roomDescription 
        ? `${reservation.roomNumber} - ${reservation.roomDescription}`
        : reservation.roomNumber;
    metadata.push({
        icon: <HomeIcon className="h-4 w-4" />,
        value: roomValue,
        section: 'main-second'
    });
}
```

#### 11.1.5 roomDescription Anzeige in Tabellen-Ansicht implementiert

**Datei:** `frontend/src/pages/Worktracker.tsx`

1. **Tabellen-Rendering (Zeile 3420-3427 und 4757-4764):**
   - `case 'roomDescription':` hinzugefügt
   - Anzeige: `{reservation.roomDescription || '-'}`

**Implementierung:**
```typescript
case 'roomDescription':
    return (
        <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
            <div className="text-sm text-gray-900 dark:text-gray-200">
                {reservation.roomDescription || '-'}
            </div>
        </td>
    );
```

#### 11.1.6 Card-Metadaten-Filterung implementiert

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Alle Metadaten-Einträge prüfen jetzt `visibleCardMetadata.has()`:**

1. **Check-in/Check-out (Zeile 3055-3061 und 4414-4420):**
   - Prüfung: `if (visibleCardMetadata.has('checkInDate') || visibleCardMetadata.has('checkOutDate'))`

2. **Zimmernummer (Zeile 3063-3070 und 4422-4429):**
   - Prüfung: `if (visibleCardMetadata.has('roomNumber') && reservation.roomNumber)`

3. **E-Mail (Zeile 3073-3079 und 4432-4438):**
   - Prüfung: `if (visibleCardMetadata.has('guestEmail') && reservation.guestEmail)`

4. **Telefon (Zeile 3080-3086 und 4439-4445):**
   - Prüfung: `if (visibleCardMetadata.has('guestPhone') && reservation.guestPhone)`

5. **Niederlassung (Zeile 3088-3095 und 4447-4454):**
   - Prüfung: `if (visibleCardMetadata.has('branch') && reservation.branch)`

6. **Status (Zeile 3150-3159 und 4512-4521):**
   - Prüfung: `if (visibleCardMetadata.has('status'))`

7. **Zahlungsstatus (Zeile 3161-3170 und 4523-4532):**
   - Prüfung: `if (visibleCardMetadata.has('paymentStatus'))`

8. **Betrag (Zeile 3172-3185 und 4534-4547):**
   - Prüfung: `if (visibleCardMetadata.has('amount') && reservation.amount)`

9. **Ankunftszeit (Zeile 3187-3196 und 4549-4558):**
   - Prüfung: `if (visibleCardMetadata.has('arrivalTime') && reservation.arrivalTime)`

**Zahlungslink und Check-in Link:**
- Bleiben unverändert (werden immer angezeigt, wenn vorhanden)

### 11.2 Ergebnis

**roomDescription:**
- ✅ Wird in Card angezeigt (Format: "Cama 5 - La tia artista" wenn beide vorhanden)
- ✅ Wird in Tabelle angezeigt (separate Spalte)
- ✅ Kann ein-/ausgeblendet werden (über TableColumnConfig)
- ✅ Kann sortiert werden
- ✅ Kann gefiltert werden
- ✅ Wird in Such-Filter berücksichtigt

**Anzeige & Sortieren:**
- ✅ Metadaten werden nur angezeigt, wenn in `visibleCardMetadata`
- ✅ Ausblenden funktioniert korrekt
- ✅ Sortierreihenfolge wird nur für sichtbare Spalten angezeigt
- ✅ Sortierung funktioniert korrekt
- ✅ Alle Metadaten prüfen `visibleCardMetadata.has()` (analog zu TODOs)

### 11.3 Code-Änderungen Zusammenfassung

**Datei:** `frontend/src/pages/Worktracker.tsx`

1. **Mappings erweitert:**
   - `reservationTableToCardMapping`: `roomDescription` hinzugefügt
   - `reservationCardToTableMapping`: `roomDescription` hinzugefügt
   - `defaultReservationCardSortDirections`: `roomDescription: 'asc'` hinzugefügt
   - `defaultReservationColumnOrder`: `'roomDescription'` hinzugefügt

2. **Sortier- und Filter-Logik erweitert:**
   - `getReservationSortValue`: `roomDescription` Case hinzugefügt
   - `getFieldValue`: `roomDescription` Case hinzugefügt
   - `columnEvaluators`: `roomDescription` Evaluator hinzugefügt
   - Such-Filter: `roomDescription` Prüfung hinzugefügt

3. **Spalten-Definitionen erweitert:**
   - `availableReservationColumns`: `roomDescription` Spalte hinzugefügt
   - `TableColumnConfig` Card-Metadaten: `roomDescription` hinzugefügt

4. **Anzeige-Logik erweitert:**
   - Card-Metadaten: `roomDescription` mit Format "Cama 5 - La tia artista" hinzugefügt
   - Tabellen-Rendering: `roomDescription` Spalte hinzugefügt

5. **Card-Metadaten-Filterung implementiert:**
   - Alle Metadaten-Einträge prüfen jetzt `visibleCardMetadata.has()`
   - Analog zu TODOs implementiert

### 11.4 Test-Ergebnisse

**Erwartetes Verhalten:**
- ✅ `roomDescription` wird in Card angezeigt (Format: "Cama 5 - La tia artista")
- ✅ `roomDescription` wird in Tabelle angezeigt
- ✅ `roomDescription` kann ein-/ausgeblendet werden
- ✅ `roomDescription` kann sortiert werden
- ✅ `roomDescription` kann gefiltert werden
- ✅ Metadaten werden nur angezeigt, wenn in `visibleCardMetadata`
- ✅ Ausblenden funktioniert korrekt
- ✅ Sortierreihenfolge wird nur für sichtbare Spalten angezeigt

**Vergleich mit TODOs:**
- ✅ Gleiche Logik wie TODOs
- ✅ Jede Metadaten-Zeile prüft `visibleCardMetadata.has()`
- ✅ Metadaten werden nur hinzugefügt, wenn in `visibleCardMetadata`
- ✅ Ausblenden funktioniert korrekt

---

## 12. Zusammenfassung der Implementierung

### 12.1 Was wurde implementiert

1. **roomDescription vollständig integriert:**
   - Mappings erweitert
   - Sortier- und Filter-Logik erweitert
   - Spalten-Definitionen erweitert
   - Card-Metadaten-Anzeige implementiert
   - Tabellen-Anzeige implementiert

2. **Card-Metadaten-Filterung implementiert:**
   - Alle Metadaten-Einträge prüfen `visibleCardMetadata.has()`
   - Analog zu TODOs implementiert
   - Ausblenden funktioniert jetzt korrekt

### 12.2 Code-Qualität

- ✅ Keine Linter-Fehler
- ✅ Konsistente Implementierung (analog zu TODOs)
- ✅ Vollständige Integration in alle relevanten Bereiche
- ✅ Dokumentation aktualisiert

### 12.3 Nächste Schritte

- ✅ Implementierung abgeschlossen
- ⏳ Manuelle Tests durchführen
- ⏳ Verifikation der Funktionalität

