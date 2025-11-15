# Reservations in To Do's Box Integration - Implementierungsplan

## Übersicht

Die Reservations-Funktionalität soll in die To Do's Box auf der Worktracker-Seite integriert werden. Statt einer separaten Reservations-Seite werden Reservations als Tab innerhalb der To Do's Box angezeigt, wobei das Standard-Design (To Do Cards) verwendet wird.

## Analyse der aktuellen Implementierung

### Reservations-Seite (aktuell)
- **Datei**: `frontend/src/pages/ReservationsPage.tsx`
- **Komponente**: `frontend/src/components/reservations/ReservationList.tsx`
- **Card-Komponente**: `frontend/src/components/reservations/ReservationCard.tsx`
- **Create-Modal**: `frontend/src/components/reservations/CreateReservationModal.tsx`
- **Struktur**: Eigene Box mit Grid-Layout (3 Spalten), Toolbar mit Suche, Filter, Sync-Button

### To Do's Box (aktuell)
- **Datei**: `frontend/src/pages/Worktracker.tsx`
- **Struktur**: Box mit Titelzeile, Toggle zwischen Tabelle/Cards, Filter, Suche, Spalten-Konfiguration
- **Cards**: Verwendet `DataCard` und `CardGrid` Komponenten
- **Create-Button**: Plus-Icon Button (analog zu CreateTaskModal als Sidepane)

## Anforderungen

1. **Tabs in To Do's Box**: Zwei Tabs - "To Do's" und "Reservations" (nur für berechtigte Rollen)
2. **Standard-Design**: Reservations verwenden To Do Cards (DataCard), nicht ReservationCard
3. **Create Reservation**: Als Sidepane (analog zu CreateTaskModal), nicht als Modal
4. **Schnelles Umschalten**: Tab-Wechsel lädt nur die entsprechenden Daten
5. **Berechtigungen**: Reservations-Tab nur anzeigen, wenn Berechtigung vorhanden

## Implementierungsplan

### 1. Berechtigungen prüfen

**Ziel**: Prüfen, welche Berechtigungen für Reservations benötigt werden

**Schritte**:
- Prüfe Backend-Routes für Reservations (`backend/src/routes/reservations.ts`)
- Prüfe, ob es eine `reservations` Entity in den Permissions gibt
- Falls nicht vorhanden: Entity `reservations` mit `entityType: 'table'` verwenden (analog zu `tasks`)

**Erwartete Berechtigung**:
- `reservations` mit `entityType: 'table'` für Lese-Zugriff
- `reservations` mit `entityType: 'table'` und `accessLevel: 'write'` für Schreib-Zugriff

### 2. Tab-Navigation in To Do's Box hinzufügen

**Datei**: `frontend/src/pages/Worktracker.tsx`

**Änderungen**:
- State für aktiven Tab hinzufügen: `const [activeTab, setActiveTab] = useState<'todos' | 'reservations'>('todos');`
- Tab-Navigation nach der Titelzeile einfügen (vor dem Filter-Pane)
- Tab-Design: Standard-Tab-Design aus `TeamWorktimeControl.tsx` verwenden
- Reservations-Tab nur anzeigen, wenn `hasPermission('reservations', 'read', 'table')` true ist

**Tab-Struktur**:
```tsx
{/* Tab-Navigation */}
<div className="border-b border-gray-200 dark:border-gray-700 mb-6">
  <nav className="-mb-px flex space-x-8">
    <button
      onClick={() => setActiveTab('todos')}
      className={`py-2 px-1 border-b-2 font-medium text-sm ${
        activeTab === 'todos'
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
      }`}
    >
      {t('tasks.title', 'To Do's')}
    </button>
    {hasPermission('reservations', 'read', 'table') && (
      <button
        onClick={() => setActiveTab('reservations')}
        className={`py-2 px-1 border-b-2 font-medium text-sm ${
          activeTab === 'reservations'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
        }`}
      >
        {t('reservations.title', 'Reservations')}
      </button>
    )}
  </nav>
</div>
```

### 3. Reservations-Daten laden

**Datei**: `frontend/src/pages/Worktracker.tsx`

**Änderungen**:
- State für Reservations: `const [reservations, setReservations] = useState<Reservation[]>([]);`
- State für Loading/Error: `const [reservationsLoading, setReservationsLoading] = useState(false);`
- Funktion `loadReservations()` hinzufügen (analog zu `loadTasks()`)
- `useEffect` zum Laden der Reservations, wenn Tab aktiv ist

**API-Integration**:
- Verwende `API_ENDPOINTS.RESERVATION.BASE` aus `frontend/src/config/api.ts`
- Verwende `axiosInstance` für API-Calls

### 4. Reservations in To Do Cards rendern

**Datei**: `frontend/src/pages/Worktracker.tsx`

**Änderungen**:
- Wenn `activeTab === 'reservations'`: Reservations statt Tasks rendern
- Verwende `DataCard` Komponente (nicht `ReservationCard`)
- Mappe Reservation-Daten auf DataCard-Metadaten:
  - **Titel**: `reservation.guestName`
  - **Status**: Reservation-Status (mit Status-Badge)
  - **Metadaten**:
    - Check-in/Check-out Datum (mit CalendarIcon)
    - Zimmernummer (mit HomeIcon)
    - E-Mail (mit EnvelopeIcon)
    - Telefon (mit PhoneIcon)
    - LobbyPMS ID (optional)
  - **Action-Buttons**: 
    - Bearbeiten (wenn Berechtigung vorhanden)
    - Details anzeigen (Navigation zu `/reservations/${id}`)

**Card-Metadaten-Mapping**:
```tsx
const metadata: MetadataItem[] = [
  {
    icon: <CalendarIcon className="h-4 w-4" />,
    label: t('reservations.checkInOut', 'Check-in/Check-out'),
    value: `${formatDate(reservation.checkInDate)} - ${formatDate(reservation.checkOutDate)}`,
    section: 'main'
  },
  {
    icon: <HomeIcon className="h-4 w-4" />,
    label: t('reservations.room', 'Zimmer'),
    value: reservation.roomNumber || '-',
    section: 'main-second'
  },
  {
    icon: <EnvelopeIcon className="h-4 w-4" />,
    label: t('reservations.email', 'E-Mail'),
    value: reservation.guestEmail || '-',
    section: 'right'
  },
  {
    icon: <PhoneIcon className="h-4 w-4" />,
    label: t('reservations.phone', 'Telefon'),
    value: reservation.guestPhone || '-',
    section: 'right'
  }
];
```

### 5. Create Reservation als Sidepane

**Datei**: `frontend/src/components/reservations/CreateReservationModal.tsx`

**Änderungen**:
- Umstellen von Modal auf Sidepane (analog zu `CreateTaskModal.tsx`)
- Verwende `useSidepane` Hook
- Responsive Verhalten: Mobile = Modal, Desktop = Sidepane
- Standard-Sidepane-Pattern verwenden (siehe DESIGN_STANDARDS.md)

**Create-Button in To Do's Box**:
- Wenn `activeTab === 'reservations'`: Create-Reservation-Button anzeigen
- Button-Design: Gleicher Plus-Icon Button wie für Tasks
- Nur anzeigen, wenn `hasPermission('reservations', 'write', 'table')`

### 6. Filter und Suche für Reservations

**Datei**: `frontend/src/pages/Worktracker.tsx`

**Änderungen**:
- Separate Filter-States für Reservations (Status, Payment-Status)
- Suche für Reservations (Gast-Name, E-Mail, Telefon, Zimmernummer)
- Filter-Pane erweitern: Wenn `activeTab === 'reservations'`, Reservations-spezifische Filter anzeigen
- Filter-Logik: Reservations filtern statt Tasks

**Filter-Optionen**:
- Status-Filter: Bestätigt, Eingecheckt, Ausgecheckt, Storniert, Nicht erschienen
- Payment-Status-Filter: Ausstehend, Bezahlt, Teilweise bezahlt, Erstattet
- Such-Filter: Gast-Name, E-Mail, Telefon, Zimmernummer, LobbyPMS ID

### 7. Sync-Button für Reservations

**Datei**: `frontend/src/pages/Worktracker.tsx`

**Änderungen**:
- Sync-Button in der Titelzeile anzeigen, wenn `activeTab === 'reservations'`
- Button-Design: Icon-only Button (ArrowPathIcon) mit Tooltip
- Funktion: `handleSyncReservations()` implementieren
- API-Endpoint: `API_ENDPOINTS.RESERVATIONS.SYNC`

### 8. View-Mode Toggle für Reservations

**Datei**: `frontend/src/pages/Worktracker.tsx`

**Änderungen**:
- View-Mode Toggle funktioniert auch für Reservations
- Wenn `activeTab === 'reservations'`:
  - Tabelle-Ansicht: Reservations-Tabelle (falls gewünscht, optional)
  - Cards-Ansicht: Reservations als DataCards (Standard)

**Hinweis**: Reservations werden primär als Cards angezeigt. Tabellen-Ansicht ist optional.

### 9. Navigation zu Reservation-Details

**Datei**: `frontend/src/pages/Worktracker.tsx`

**Änderungen**:
- Beim Klick auf Reservation-Card: Navigation zu `/reservations/${id}`
- Verwende `useNavigate` Hook
- Card ist klickbar (cursor-pointer, onClick-Handler)

### 10. Cleanup: Alte Reservations-Seite

**Datei**: `frontend/src/pages/ReservationsPage.tsx`

**Status**: Behalten (für direkte Navigation zu Reservation-Details)
- Die Seite bleibt für direkte Navigation zu `/reservations/:id` erhalten
- `ReservationList` Komponente kann optional entfernt werden (wenn nicht mehr benötigt)

## Technische Details

### Imports hinzufügen

```tsx
import { Reservation, ReservationStatus, PaymentStatus } from '../types/reservation.ts';
import CreateReservationModal from '../components/reservations/CreateReservationModal.tsx';
import { API_ENDPOINTS } from '../config/api.ts';
import {
  CalendarIcon,
  HomeIcon,
  EnvelopeIcon,
  PhoneIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
```

### State-Management

```tsx
// Tab-State
const [activeTab, setActiveTab] = useState<'todos' | 'reservations'>('todos');

// Reservations-States
const [reservations, setReservations] = useState<Reservation[]>([]);
const [reservationsLoading, setReservationsLoading] = useState(false);
const [reservationsError, setReservationsError] = useState<string | null>(null);
const [reservationFilterStatus, setReservationFilterStatus] = useState<ReservationStatus | 'all'>('all');
const [reservationFilterPaymentStatus, setReservationFilterPaymentStatus] = useState<PaymentStatus | 'all'>('all');
const [reservationSearchTerm, setReservationSearchTerm] = useState('');
const [isCreateReservationModalOpen, setIsCreateReservationModalOpen] = useState(false);
const [syncingReservations, setSyncingReservations] = useState(false);
```

### Daten-Laden

```tsx
const loadReservations = async () => {
  try {
    setReservationsLoading(true);
    setReservationsError(null);
    const response = await axiosInstance.get(API_ENDPOINTS.RESERVATION.BASE);
    const reservations = response.data?.data || response.data || [];
    setReservations(reservations);
  } catch (err: any) {
    console.error('Fehler beim Laden der Reservations:', err);
    setReservationsError(err.response?.data?.message || t('reservations.loadError', 'Fehler beim Laden der Reservations'));
    showMessage(err.response?.data?.message || t('reservations.loadError', 'Fehler beim Laden der Reservations'), 'error');
  } finally {
    setReservationsLoading(false);
  }
};

useEffect(() => {
  if (activeTab === 'reservations') {
    loadReservations();
  }
}, [activeTab]);
```

## Design-Standards

### Tab-Design
- Standard-Tab-Design aus `TeamWorktimeControl.tsx` verwenden
- Border-bottom für aktiven Tab: `border-blue-500`
- Text-Farbe: `text-blue-600 dark:text-blue-400` (aktiv), `text-gray-500` (inaktiv)

### Card-Design
- Verwende `DataCard` Komponente (nicht `ReservationCard`)
- Metadaten-Layout: Analog zu To Do Cards
- Status-Badge: Reservation-Status mit entsprechenden Farben
- Action-Buttons: Icon-only Buttons (Bearbeiten, Details)

### Button-Design
- Create-Button: Plus-Icon Button (analog zu CreateTask)
- Sync-Button: ArrowPathIcon Button (Icon-only)
- Alle Buttons: Icon-only mit Tooltip (siehe DESIGN_STANDARDS.md)

## Testing

### Test-Szenarien

1. **Tab-Navigation**:
   - Tab "To Do's" zeigt Tasks
   - Tab "Reservations" zeigt Reservations (nur bei Berechtigung)
   - Tab-Wechsel lädt entsprechende Daten

2. **Berechtigungen**:
   - Reservations-Tab nur sichtbar bei `hasPermission('reservations', 'read', 'table')`
   - Create-Button nur sichtbar bei `hasPermission('reservations', 'write', 'table')`

3. **Cards-Rendering**:
   - Reservations werden als DataCards gerendert
   - Metadaten korrekt angezeigt
   - Status-Badges korrekt gefärbt

4. **Filter und Suche**:
   - Filter funktionieren für Reservations
   - Suche funktioniert für Reservations

5. **Create Reservation**:
   - Sidepane öffnet sich korrekt
   - Responsive Verhalten (Mobile = Modal, Desktop = Sidepane)

6. **Sync-Funktion**:
   - Sync-Button synchronisiert Reservations
   - Loading-State wird angezeigt

## Offene Fragen

1. **Berechtigungen**: Welche Entity wird für Reservations verwendet? (`reservations` mit `entityType: 'table'`?)
2. **Tabellen-Ansicht**: Soll es eine Tabellen-Ansicht für Reservations geben, oder nur Cards?
3. **Filter-Persistenz**: Sollen Filter für Reservations gespeichert werden (analog zu Tasks)?

## Nächste Schritte

1. ✅ Plan erstellen und prüfen
2. ⏳ Plan vom Benutzer bestätigen lassen
3. ⏳ Implementierung starten
4. ⏳ Testing durchführen
5. ⏳ Dokumentation aktualisieren

