# Touren-Verwaltung - Implementierungsplan

## Status: VORBEREITUNG - NICHTS UMSETZEN

**Datum:** 2025-01-22  
**Ziel:** Touren-Verwaltungssystem im Intranet implementieren als neuer Tab in den Einstellungen (analog zum Passwortmanager)

---

## 1. AKTUELLER STAND - FAKTEN

### 1.1 Bestehende Infrastruktur

**Settings-Seite:**
- Datei: `frontend/src/pages/Settings.tsx`
- Aktuelle Tabs: `'personal' | 'notifications' | 'system'`
- Tab-State: `useState<'personal' | 'notifications' | 'system'>('personal')` (Zeile 39)
- Tab-Navigation: Zeilen 246-282 in Settings.tsx
- Tab-Content: Zeilen 285-551 in Settings.tsx

**Bestehende ähnliche Module:**
- **Requests:** `backend/src/controllers/requestController.ts`, `frontend/src/components/Requests.tsx`
- **Tasks/Todos:** `backend/src/controllers/taskController.ts`, `frontend/src/components/Tasks.tsx`
- **Reservierungen:** `backend/src/controllers/reservationController.ts`, `frontend/src/types/reservation.ts`
- **Passwortmanager-Plan:** `docs/implementation_plans/PASSWORTMANAGER_IMPLEMENTATION.md` (als Referenz für Tab-Implementierung)

**Datenbank:**
- Prisma ORM mit PostgreSQL
- Schema: `backend/prisma/schema.prisma`
- Reservation-Model existiert bereits (Zeilen 1091-1140)
- Request-Model existiert bereits (Zeilen 303-334)
- Task-Model existiert bereits (Zeilen 266-301)

**Zahlungsstruktur (Reservation):**
- `amount`: Decimal (Gesamtpreis)
- `currency`: String (COP, USD, EUR, etc.)
- `paymentStatus`: PaymentStatus Enum ('pending', 'paid', 'partially_paid', 'refunded')
- Keine separate Aufschlüsselung zwischen Tourpreis und Bettenpreis vorhanden

**WhatsApp-Integration:**
- WhatsApp Service: `backend/src/services/whatsappService.ts`
- WhatsApp Controller: `backend/src/controllers/whatsappController.ts`
- WhatsApp Message Handler: `backend/src/services/whatsappMessageHandler.ts`
- WhatsApp Function Handlers: `backend/src/services/whatsappFunctionHandlers.ts`
- Webhook-Endpoint: `/api/whatsapp/webhook` (POST)
- Unterstützt: Twilio und WhatsApp Business API
- Branch-basierte WhatsApp-Integration vorhanden

**Kommissions-Tracking:**
- Keine bestehende Kommissions-Struktur im System gefunden
- Email-Reservation-Parser extrahiert Kommission aus E-Mails (`backend/src/services/emailReservationParser.ts`, Zeile 453-460)
- Kommission wird in `emailReservationController.ts` (Zeile 144) gespeichert, aber nicht in Datenbank-Modell
- Keine Mitarbeiter-Statistiken für Kommissionen vorhanden

**Mitarbeiter-Statistiken:**
- WorktimeStats: `frontend/src/components/WorktimeStats.tsx`
- Worktime Controller: `backend/src/controllers/worktimeController.ts`
- API-Endpoint: `/api/worktime/stats` (GET)
- Zeigt: Gesamtstunden, Durchschnitt pro Tag, Arbeitstage

### 1.2 Use Cases (Anforderungen)

1. **Eigene & externe Events & Tours erfassen und verwalten**
   - Ähnlich wie Requests oder To-Dos
   - CRUD-Operationen (Create, Read, Update, Delete)
   - Filter und Suche

2. **Geänderte Tourdaten einfach & zentral updaten**
   - Zentrale Datenbank als Single Source of Truth
   - Updates werden automatisch an alle Kanäle weitergegeben

3. **Daten für Anzeige und Buchung verwenden**
   - Website-Integration
   - Soziale Medien
   - WhatsApp Bot
   - API-Endpunkte für externe Systeme

4. **Tour mit Reservationen verknüpfen**
   - Eine Tour kann mehreren Reservationen zugeordnet werden
   - Preisaufschlüsselung: Tourpreis vs. Bettenpreis
   - Zahlungsstatus-Tracking (was bereits bezahlt wurde, was nicht)

5. **Mitarbeiter-Kommissionen tracken**
   - Wer hat welche Tour gebucht
   - Kommissionsberechnung (Teil der Gesamtkommission)
   - Anzeige in Mitarbeiter-Statistiken

6. **Externe Tour-Buchung via WhatsApp automatisieren**
   - Kunde wählt Tour auf Website/Soziale Medien
   - Gibt Daten an (Tourdatum, Anzahl Personen, etc.)
   - Automatische WhatsApp-Nachricht an Tour-Anbieter
   - Antwort des Anbieters wird verarbeitet
   - Bestätigung/Zahlungslink oder Absage/Alternativen an Kunden

### 1.3 Web-Recherche-Ergebnisse

**Bestehende Tour-Management-Systeme:**
- **Regiondo:** Anpassbares Buchungssystem, Online-Ticketshop, OTA-Integration, Ressourcenmanagement
- **TrekkSoft:** Verkauf über verschiedene OTAs, automatische Synchronisation über alle Vertriebskanäle
- **Tickyt:** Verwaltung von Führungen, Online-Ticketshop, Termin- und Teilnehmermanagement
- **edoobox:** Online-Buchungssystem für Freizeitangebote, Teilnehmerverwaltung, Rechnungsintegration

**Best Practices:**
- Zentrale Datenbank als Single Source of Truth
- Multi-Channel-Synchronisation (Website, Soziale Medien, WhatsApp)
- Preisaufschlüsselung (Tourpreis, Bettenpreis, Kommissionen)
- Automatisierte Kommunikation via WhatsApp
- Mitarbeiter-Kommissions-Tracking
- Integration mit externen Tour-Anbietern

---

## 2. DATENBANK-DESIGN

### 2.1 Neue Models

#### 2.1.1 Tour Model

```prisma
model Tour {
  id                Int              @id @default(autoincrement())
  title             String
  description       String?
  type              TourType          @default(own) // 'own' oder 'external'
  status            TourStatus        @default(active) // 'active', 'inactive', 'archived'
  
  // Tour-Details
  duration          Int?              // Dauer in Stunden
  maxParticipants   Int?             // Maximale Teilnehmeranzahl
  minParticipants   Int?              // Minimale Teilnehmeranzahl
  price             Decimal?          @db.Decimal(10, 2) // Preis pro Person
  currency          String?           @default("COP")
  location          String?           // Ort/Startpunkt
  meetingPoint      String?           // Treffpunkt
  includes          String?           // Was ist inkludiert (JSON oder Text)
  excludes          String?           // Was ist nicht inkludiert
  requirements      String?           // Anforderungen (z.B. Fitness-Level)
  
  // Externe Tour-Informationen
  externalProviderId String?          // ID des externen Anbieters
  externalProviderName String?        // Name des externen Anbieters
  externalProviderPhone String?       // WhatsApp-Nummer des Anbieters
  externalProviderEmail String?       // E-Mail des Anbieters
  externalBookingUrl String?          // URL für externe Buchung
  
  // Bilder/Medien
  imageUrl          String?           // Hauptbild
  galleryUrls       Json?             // Array von Bild-URLs
  
  // Verfügbarkeit
  availableFrom     DateTime?         // Verfügbar ab
  availableTo       DateTime?         // Verfügbar bis
  recurringSchedule Json?             // Wiederkehrende Termine (z.B. täglich, wöchentlich)
  
  // Organisation & Branch
  organizationId    Int
  organization      Organization      @relation(fields: [organizationId], references: [id])
  branchId          Int?
  branch            Branch?            @relation(fields: [branchId], references: [id])
  
  // Metadaten
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  createdById       Int?              // User, der die Tour erstellt hat
  createdBy         User?             @relation("TourCreator", fields: [createdById], references: [id])
  
  // Relations
  bookings          TourBooking[]
  reservations      TourReservation[]
  
  @@index([organizationId])
  @@index([branchId])
  @@index([type])
  @@index([status])
  @@index([title]) // Für Suche
}
```

#### 2.1.2 TourBooking Model

```prisma
model TourBooking {
  id                Int              @id @default(autoincrement())
  tourId            Int
  tour              Tour              @relation(fields: [tourId], references: [id], onDelete: Cascade)
  
  // Buchungsdetails
  bookingDate       DateTime          // Wann wurde gebucht
  tourDate          DateTime          // Wann findet die Tour statt
  numberOfParticipants Int           // Anzahl Teilnehmer
  totalPrice        Decimal           @db.Decimal(10, 2) // Gesamtpreis (Tourpreis * Teilnehmer)
  currency          String            @default("COP")
  
  // Kundeninformationen
  customerName      String
  customerEmail     String?
  customerPhone     String?
  customerNotes     String?           // Spezielle Anforderungen des Kunden
  
  // Zahlungsstatus
  paymentStatus     PaymentStatus     @default(pending)
  amountPaid        Decimal?          @db.Decimal(10, 2) // Bereits bezahlter Betrag
  amountPending     Decimal?          @db.Decimal(10, 2) // Noch ausstehender Betrag
  paymentLink       String?           // Zahlungslink (Bold Payment)
  
  // Mitarbeiter-Kommission
  bookedById        Int?              // User, der die Tour gebucht hat
  bookedBy          User?             @relation("TourBooker", fields: [bookedById], references: [id])
  commissionAmount  Decimal?          @db.Decimal(10, 2) // Kommissionsbetrag
  commissionPercent Decimal?          @db.Decimal(5, 2) // Kommissionsprozentsatz
  
  // Status
  status            TourBookingStatus @default(confirmed) // 'confirmed', 'cancelled', 'completed', 'no_show'
  
  // Externe Tour-Buchung
  isExternal        Boolean           @default(false)
  externalBookingId String?           // ID bei externem Anbieter
  externalStatus    String?           // Status bei externem Anbieter
  externalMessage   String?           // Letzte Nachricht vom Anbieter
  
  // Organisation & Branch
  organizationId    Int
  organization      Organization      @relation(fields: [organizationId], references: [id])
  branchId          Int?
  branch            Branch?           @relation(fields: [branchId], references: [id])
  
  // Metadaten
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  
  // Relations
  reservations      TourReservation[]
  whatsappMessages  TourWhatsAppMessage[]
  
  @@index([tourId])
  @@index([organizationId])
  @@index([branchId])
  @@index([bookedById])
  @@index([bookingDate])
  @@index([tourDate])
  @@index([status])
}
```

#### 2.1.3 TourReservation Model (Verknüpfung Tour <-> Reservation)

```prisma
model TourReservation {
  id                Int              @id @default(autoincrement())
  tourId            Int
  tour              Tour              @relation(fields: [tourId], references: [id], onDelete: Cascade)
  bookingId         Int
  booking           TourBooking      @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  reservationId     Int
  reservation       Reservation      @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  
  // Preisaufschlüsselung
  tourPrice         Decimal          @db.Decimal(10, 2) // Anteil Tourpreis
  accommodationPrice Decimal         @db.Decimal(10, 2) // Anteil Bettenpreis
  currency          String           @default("COP")
  
  // Zahlungsstatus
  tourPricePaid     Decimal?         @db.Decimal(10, 2) // Bereits bezahlter Tourpreis
  tourPricePending  Decimal?         @db.Decimal(10, 2) // Ausstehender Tourpreis
  accommodationPaid Decimal?         @db.Decimal(10, 2) // Bereits bezahlter Bettenpreis
  accommodationPending Decimal?      @db.Decimal(10, 2) // Ausstehender Bettenpreis
  
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  
  @@unique([reservationId, bookingId]) // Eine Reservation kann nur einmal pro Booking verknüpft sein
  @@index([tourId])
  @@index([bookingId])
  @@index([reservationId])
}
```

#### 2.1.4 TourWhatsAppMessage Model (Kommunikation mit externen Anbietern)

```prisma
model TourWhatsAppMessage {
  id                Int              @id @default(autoincrement())
  bookingId         Int
  booking           TourBooking      @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  
  // Nachrichtendetails
  direction         MessageDirection @default(outgoing) // 'outgoing' oder 'incoming'
  message           String           // Nachrichtentext
  phoneNumber       String           // Telefonnummer (Anbieter oder Kunde)
  sentAt            DateTime         @default(now())
  
  // Status
  status            MessageStatus    @default(sent) // 'sent', 'delivered', 'read', 'failed'
  errorMessage      String?          // Fehlermeldung bei Fehlern
  
  // Verarbeitung
  processed         Boolean          @default(false) // Wurde die Nachricht verarbeitet?
  processedAt       DateTime?
  action            String?          // Aktion (z.B. 'booking_confirmed', 'booking_cancelled', 'payment_link_sent')
  
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  
  @@index([bookingId])
  @@index([phoneNumber])
  @@index([sentAt])
  @@index([status])
}
```

### 2.2 Enums

```prisma
enum TourType {
  own        // Eigene Tour
  external   // Externe Tour
}

enum TourStatus {
  active
  inactive
  archived
}

enum TourBookingStatus {
  confirmed
  cancelled
  completed
  no_show
}

enum MessageDirection {
  outgoing
  incoming
}

enum MessageStatus {
  sent
  delivered
  read
  failed
}
```

### 2.3 Erweiterungen bestehender Models

#### 2.3.1 Reservation Model erweitern

```prisma
model Reservation {
  // ... bestehende Felder ...
  
  // NEU: Verknüpfung mit Touren
  tourReservations  TourReservation[]
}
```

#### 2.3.2 User Model erweitern

```prisma
model User {
  // ... bestehende Felder ...
  
  // NEU: Verknüpfung mit Touren
  toursCreated      Tour[]            @relation("TourCreator")
  toursBooked       TourBooking[]     @relation("TourBooker")
}
```

---

## 3. BACKEND-IMPLEMENTIERUNG

### 3.1 Controller: `tourController.ts`

**Datei:** `backend/src/controllers/tourController.ts`

**Endpunkte:**
- `GET /api/tours` - Alle Touren (mit Filtern)
- `GET /api/tours/:id` - Einzelne Tour
- `POST /api/tours` - Neue Tour erstellen
- `PUT /api/tours/:id` - Tour aktualisieren
- `DELETE /api/tours/:id` - Tour löschen
- `GET /api/tours/:id/bookings` - Buchungen einer Tour
- `GET /api/tours/export` - Export für Website/Soziale Medien (JSON)

**Berechtigungen:**
- `checkPermission('tour_management', 'read', 'page')` - Seiten-Berechtigung
- `checkPermission('tour_create', 'write', 'button')` - Erstellen
- `checkPermission('tour_edit', 'write', 'button')` - Bearbeiten
- `checkPermission('tour_delete', 'write', 'button')` - Löschen

### 3.2 Controller: `tourBookingController.ts`

**Datei:** `backend/src/controllers/tourBookingController.ts`

**Endpunkte:**
- `GET /api/tour-bookings` - Alle Buchungen (mit Filtern)
- `GET /api/tour-bookings/:id` - Einzelne Buchung
- `POST /api/tour-bookings` - Neue Buchung erstellen
- `PUT /api/tour-bookings/:id` - Buchung aktualisieren
- `DELETE /api/tour-bookings/:id` - Buchung löschen
- `POST /api/tour-bookings/:id/cancel` - Buchung stornieren
- `POST /api/tour-bookings/:id/complete` - Buchung als abgeschlossen markieren
- `GET /api/tour-bookings/user/:userId` - Buchungen eines Mitarbeiters (für Statistiken)
- `GET /api/tour-bookings/user/:userId/commissions` - Kommissionen eines Mitarbeiters

### 3.3 Controller: `tourReservationController.ts`

**Datei:** `backend/src/controllers/tourReservationController.ts`

**Endpunkte:**
- `POST /api/tour-reservations` - Tour mit Reservation verknüpfen
- `PUT /api/tour-reservations/:id` - Verknüpfung aktualisieren
- `DELETE /api/tour-reservations/:id` - Verknüpfung löschen
- `GET /api/tour-reservations/reservation/:reservationId` - Verknüpfungen einer Reservation
- `GET /api/tour-reservations/booking/:bookingId` - Verknüpfungen einer Buchung

### 3.4 Service: `tourWhatsAppService.ts`

**Datei:** `backend/src/services/tourWhatsAppService.ts`

**Funktionen:**
- `sendBookingRequestToProvider(bookingId: number)` - Sendet Buchungsanfrage an externen Anbieter
- `processProviderResponse(messageId: number, response: string)` - Verarbeitet Antwort des Anbieters
- `sendConfirmationToCustomer(bookingId: number)` - Sendet Bestätigung an Kunden
- `sendPaymentLinkToCustomer(bookingId: number, paymentLink: string)` - Sendet Zahlungslink an Kunden
- `sendCancellationToCustomer(bookingId: number, reason: string)` - Sendet Stornierung an Kunden

### 3.5 Routes: `tourRoutes.ts`

**Datei:** `backend/src/routes/tourRoutes.ts`

**Registrierung in `backend/src/index.ts`:**
```typescript
import tourRoutes from './routes/tourRoutes';
app.use('/api/tours', tourRoutes);
app.use('/api/tour-bookings', tourBookingRoutes);
app.use('/api/tour-reservations', tourReservationRoutes);
```

### 3.6 WhatsApp-Integration erweitern

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Erweiterungen:**
- Keyword-Erkennung für Tour-Buchungen (z.B. "tour booking", "book tour")
- Funktion: `handleTourBookingRequest(phoneNumber, messageText, branchId)`
- Funktion: `handleTourProviderResponse(phoneNumber, messageText, branchId)`

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts`

**Neue Funktion:**
- `get_tours(args, userId, roleId, branchId)` - Holt verfügbare Touren
- `book_tour(args, userId, roleId, branchId)` - Bucht eine Tour

### 3.7 Kommissions-Berechnung

**Datei:** `backend/src/services/commissionService.ts`

**Funktionen:**
- `calculateCommission(bookingId: number)` - Berechnet Kommission für eine Buchung
- `getUserCommissions(userId: number, startDate: Date, endDate: Date)` - Holt Kommissionen eines Mitarbeiters
- `getUserCommissionStats(userId: number, period: string)` - Statistiken für Mitarbeiter

---

## 4. FRONTEND-IMPLEMENTIERUNG

### 4.1 Settings-Seite erweitern

**Datei:** `frontend/src/pages/Settings.tsx`

**Änderungen:**
1. Tab-Type erweitern: `'personal' | 'notifications' | 'system' | 'tours'`
2. Tab-State erweitern: `useState<'personal' | 'notifications' | 'system' | 'tours'>('personal')`
3. Neuer Tab-Button hinzufügen (Zeilen 246-282)
4. Neuer Tab-Content hinzufügen (nach Zeile 551)

**Tab-Button:**
```tsx
<button
  className={`${
    activeTab === 'tours'
      ? 'border-blue-500 text-blue-600'
      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
  onClick={() => handleTabChange('tours')}
>
  <MapIcon className="h-4 w-4 mr-2" />
  {t('settings.tours')}
</button>
```

**Tab-Content:**
```tsx
{activeTab === 'tours' && (
  <ToursManagementTab />
)}
```

### 4.2 Neue Komponente: `ToursManagementTab.tsx`

**Datei:** `frontend/src/components/ToursManagementTab.tsx`

**Funktionalität:**
1. Liste aller Touren anzeigen (Card-View oder Table-View)
2. Neue Tour erstellen (Modal)
3. Tour bearbeiten (Modal)
4. Tour löschen (mit Bestätigung)
5. Tour-Details anzeigen
6. Buchungen einer Tour anzeigen
7. Filter/Suche (nach Titel, Typ, Status, Branch)
8. Export-Funktion (für Website/Soziale Medien)

**Komponenten-Struktur:**
- Haupt-Container mit Liste
- Card für jede Tour
- Modal für Create/Edit (`TourModal.tsx`)
- Modal für Tour-Details (`TourDetailsModal.tsx`)
- Modal für Buchungen (`TourBookingsModal.tsx`)
- Filter-Komponente

**Berechtigungen:**
- `usePermissions()` Hook verwenden
- Prüfen: `hasPermission('tour_management', 'read', 'page')`
- Prüfen: `hasPermission('tour_create', 'write', 'button')`
- Prüfen: `hasPermission('tour_edit', 'write', 'button')`
- Prüfen: `hasPermission('tour_delete', 'write', 'button')`

### 4.3 Neue Komponente: `TourBookingsTab.tsx`

**Datei:** `frontend/src/components/TourBookingsTab.tsx`

**Funktionalität:**
1. Liste aller Buchungen anzeigen
2. Neue Buchung erstellen (Modal)
3. Buchung bearbeiten (Modal)
4. Buchung stornieren
5. Buchung als abgeschlossen markieren
6. Verknüpfung mit Reservationen anzeigen/verwalten
7. Preisaufschlüsselung anzeigen (Tourpreis vs. Bettenpreis)
8. Zahlungsstatus anzeigen
9. Filter/Suche (nach Tour, Kunde, Mitarbeiter, Datum, Status)

### 4.4 Neue Komponente: `TourReservationLink.tsx`

**Datei:** `frontend/src/components/TourReservationLink.tsx`

**Funktionalität:**
1. Tour mit Reservation verknüpfen
2. Preisaufschlüsselung eingeben (Tourpreis, Bettenpreis)
3. Verknüpfung bearbeiten
4. Verknüpfung lösen

### 4.5 Erweiterung: `WorktimeStats.tsx`

**Datei:** `frontend/src/components/WorktimeStats.tsx`

**Erweiterungen:**
1. Neuer Tab "Kommissionen" hinzufügen
2. Kommissionen-Statistiken anzeigen:
   - Gesamtkommissionen (Zeitraum)
   - Anzahl gebuchter Touren
   - Durchschnittliche Kommission pro Tour
   - Kommissionen pro Tour-Typ
3. Liste aller Buchungen mit Kommissionen

### 4.6 API-Client

**Datei:** `frontend/src/config/api.ts`

**Hinzufügen:**
```typescript
export const API_ENDPOINTS = {
  // ... bestehende Endpunkte ...
  TOURS: {
    BASE: '/api/tours',
    BY_ID: (id: number) => `/api/tours/${id}`,
    BOOKINGS: (id: number) => `/api/tours/${id}/bookings`,
    EXPORT: '/api/tours/export',
  },
  TOUR_BOOKINGS: {
    BASE: '/api/tour-bookings',
    BY_ID: (id: number) => `/api/tour-bookings/${id}`,
    USER: (userId: number) => `/api/tour-bookings/user/${userId}`,
    COMMISSIONS: (userId: number) => `/api/tour-bookings/user/${userId}/commissions`,
    CANCEL: (id: number) => `/api/tour-bookings/${id}/cancel`,
    COMPLETE: (id: number) => `/api/tour-bookings/${id}/complete`,
  },
  TOUR_RESERVATIONS: {
    BASE: '/api/tour-reservations',
    BY_ID: (id: number) => `/api/tour-reservations/${id}`,
    BY_RESERVATION: (reservationId: number) => `/api/tour-reservations/reservation/${reservationId}`,
    BY_BOOKING: (bookingId: number) => `/api/tour-reservations/booking/${bookingId}`,
  },
};
```

### 4.7 TypeScript-Typen

**Datei:** `frontend/src/types/tour.ts`

**Neue Datei mit allen Tour-bezogenen Typen:**
- `Tour`
- `TourBooking`
- `TourReservation`
- `TourWhatsAppMessage`
- `TourType`
- `TourStatus`
- `TourBookingStatus`
- etc.

---

## 5. BEREchtigungen

### 5.1 Seed-File aktualisieren

**Datei:** `backend/prisma/seed.ts`

**Hinzufügen:**
```typescript
// Neue Seite
const ALL_PAGES = [
  // ... bestehende Seiten ...
  'tour_management', // NEU
];

// Neue Tabelle
const ALL_TABLES = [
  // ... bestehende Tabellen ...
  'tours', // NEU
  'tour_bookings', // NEU
];

// Neue Buttons
const ALL_BUTTONS = [
  // ... bestehende Buttons ...
  'tour_create', // NEU
  'tour_edit',   // NEU
  'tour_delete', // NEU
  'tour_view',   // NEU
  'tour_booking_create', // NEU
  'tour_booking_edit',   // NEU
  'tour_booking_cancel', // NEU
];

// Berechtigungen für Admin
const adminPermissionMap: Record<string, AccessLevel> = {
  // ... bestehende Berechtigungen ...
  'page_tour_management': 'both',
  'table_tours': 'both',
  'table_tour_bookings': 'both',
  'button_tour_create': 'both',
  'button_tour_edit': 'both',
  'button_tour_delete': 'both',
  'button_tour_view': 'both',
  'button_tour_booking_create': 'both',
  'button_tour_booking_edit': 'both',
  'button_tour_booking_cancel': 'both',
};

// Berechtigungen für User
const userPermissionMap: Record<string, AccessLevel> = {
  // ... bestehende Berechtigungen ...
  'page_tour_management': 'read',
  'table_tours': 'read',
  'table_tour_bookings': 'read',
  'button_tour_view': 'both',
  'button_tour_booking_create': 'both', // User können Touren buchen
  // Keine Create/Edit/Delete für Standard-User
};

// Berechtigungen für Hamburger
const hamburgerPermissionMap: Record<string, AccessLevel> = {
  // ... bestehende Berechtigungen ...
  'page_tour_management': 'read',
  'table_tours': 'read',
  'table_tour_bookings': 'read',
  'button_tour_view': 'both',
  'button_tour_booking_create': 'both',
};
```

---

## 6. ÜBERSETZUNGEN (I18N)

### 6.1 Frontend-Übersetzungen

**Datei:** `frontend/src/i18n/locales/de.json`

**Hinzufügen:**
```json
{
  "settings": {
    "tours": "Touren-Verwaltung"
  },
  "tours": {
    "title": "Touren-Verwaltung",
    "create": "Neue Tour erstellen",
    "edit": "Tour bearbeiten",
    "delete": "Tour löschen",
    "deleteConfirm": "Möchten Sie diese Tour wirklich löschen?",
    "name": "Titel",
    "description": "Beschreibung",
    "type": "Typ",
    "typeOwn": "Eigene Tour",
    "typeExternal": "Externe Tour",
    "status": "Status",
    "statusActive": "Aktiv",
    "statusInactive": "Inaktiv",
    "statusArchived": "Archiviert",
    "price": "Preis",
    "currency": "Währung",
    "duration": "Dauer (Stunden)",
    "maxParticipants": "Max. Teilnehmer",
    "minParticipants": "Min. Teilnehmer",
    "location": "Ort",
    "meetingPoint": "Treffpunkt",
    "noTours": "Keine Touren vorhanden",
    "bookings": "Buchungen",
    "export": "Exportieren"
  },
  "tourBookings": {
    "title": "Tour-Buchungen",
    "create": "Neue Buchung erstellen",
    "edit": "Buchung bearbeiten",
    "cancel": "Buchung stornieren",
    "complete": "Als abgeschlossen markieren",
    "customerName": "Kundenname",
    "customerEmail": "Kunden-E-Mail",
    "customerPhone": "Kunden-Telefon",
    "bookingDate": "Buchungsdatum",
    "tourDate": "Tour-Datum",
    "numberOfParticipants": "Anzahl Teilnehmer",
    "totalPrice": "Gesamtpreis",
    "paymentStatus": "Zahlungsstatus",
    "amountPaid": "Bereits bezahlt",
    "amountPending": "Ausstehend",
    "commission": "Kommission",
    "noBookings": "Keine Buchungen vorhanden"
  },
  "tourReservations": {
    "title": "Tour-Reservationen",
    "link": "Tour mit Reservation verknüpfen",
    "tourPrice": "Tourpreis",
    "accommodationPrice": "Bettenpreis",
    "tourPricePaid": "Tourpreis bezahlt",
    "tourPricePending": "Tourpreis ausstehend",
    "accommodationPaid": "Bettenpreis bezahlt",
    "accommodationPending": "Bettenpreis ausstehend"
  },
  "commissions": {
    "title": "Kommissionen",
    "total": "Gesamtkommissionen",
    "perTour": "Pro Tour",
    "average": "Durchschnitt",
    "byType": "Nach Tour-Typ"
  }
}
```

**Datei:** `frontend/src/i18n/locales/en.json` und `es.json`
- Gleiche Struktur, übersetzt in Englisch/Spanisch

### 6.2 Backend-Übersetzungen

**Datei:** `backend/src/utils/translations.ts`

**Hinzufügen:**
- `getTourNotificationText()` - Für Tour-Notifications
- `getTourBookingNotificationText()` - Für Buchungs-Notifications

---

## 7. WHATSAPP-AUTOMATISIERUNG

### 7.1 Externe Tour-Buchung Flow

**Schritt 1: Kunde wählt Tour**
- Kunde wählt Tour auf Website/Soziale Medien
- Gibt Daten ein: Tourdatum, Anzahl Personen, Kontaktdaten
- System erstellt `TourBooking` mit `isExternal: true`

**Schritt 2: WhatsApp-Nachricht an Anbieter**
- System sendet WhatsApp-Nachricht an `tour.externalProviderPhone`
- Nachricht enthält: Tour-Details, Kunden-Daten, gewünschtes Datum
- Nachricht wird in `TourWhatsAppMessage` gespeichert

**Schritt 3: Anbieter antwortet**
- Anbieter antwortet via WhatsApp
- System erkennt Antwort (via WhatsApp Webhook)
- System verarbeitet Antwort:
  - Bestätigung → Status auf "confirmed", sendet Bestätigung + Zahlungslink an Kunde
  - Absage → Status auf "cancelled", sendet Absage + Alternativen an Kunde
  - Alternative → Status bleibt "pending", sendet Alternative an Kunde

**Schritt 4: Kunde erhält Antwort**
- System sendet WhatsApp-Nachricht an Kunde
- Nachricht enthält: Bestätigung/Absage/Alternative + Zahlungslink (falls bestätigt)

### 7.2 WhatsApp-Nachrichten-Templates

**Templates für externe Anbieter:**
- Buchungsanfrage
- Bestätigung
- Absage
- Alternative

**Templates für Kunden:**
- Buchungsbestätigung
- Zahlungslink
- Stornierung
- Alternative Vorschläge

---

## 8. KOMMISSIONS-TRACKING

### 8.1 Kommissions-Berechnung

**Logik:**
- Jede Tour hat einen konfigurierbaren Kommissionsprozentsatz
- Kommission wird berechnet: `totalPrice * commissionPercent / 100`
- Kommission wird dem `bookedBy` User zugeordnet

### 8.2 Mitarbeiter-Statistiken

**Erweiterung von WorktimeStats:**
- Neuer Tab "Kommissionen"
- Zeigt:
  - Gesamtkommissionen (Zeitraum)
  - Anzahl gebuchter Touren
  - Durchschnittliche Kommission pro Tour
  - Kommissionen nach Tour-Typ
  - Liste aller Buchungen mit Kommissionen

**API-Endpunkt:**
- `GET /api/tour-bookings/user/:userId/commissions?startDate=...&endDate=...`

---

## 9. EXPORT FÜR WEBSITE/SOZIALE MEDIEN

### 9.1 API-Endpunkt

**Endpoint:** `GET /api/tours/export`

**Parameter:**
- `status`: Nur aktive Touren
- `type`: Nur eigene oder externe Touren
- `branchId`: Nur Touren eines Branches

**Response:**
```json
{
  "tours": [
    {
      "id": 1,
      "title": "Tour-Titel",
      "description": "Beschreibung",
      "price": 100.00,
      "currency": "COP",
      "duration": 4,
      "location": "Ort",
      "imageUrl": "https://...",
      "availableFrom": "2025-01-01",
      "availableTo": "2025-12-31"
    }
  ]
}
```

### 9.2 Verwendung

- Website kann diese API aufrufen und Touren anzeigen
- Soziale Medien können diese API nutzen für automatische Posts
- WhatsApp Bot kann diese API nutzen für Tour-Auswahl

---

## 10. IMPLEMENTIERUNGS-SCHRITTE

### Phase 1: Datenbank & Backend-Grundlagen
1. Prisma Schema erweitern (Tour, TourBooking, TourReservation, TourWhatsAppMessage Models)
2. Migration erstellen: `npx prisma migrate dev --name add_tour_management`
3. Seed-File aktualisieren (Berechtigungen)
4. Controller erstellen (`tourController.ts`)
5. Routes erstellen (`tourRoutes.ts`)
6. API-Endpunkte testen

### Phase 2: Frontend-Grundlagen
1. Settings-Seite erweitern (Tab hinzufügen)
2. `ToursManagementTab.tsx` Komponente erstellen
3. `TourModal.tsx` Komponente erstellen (Create/Edit)
4. API-Client erweitern
5. TypeScript-Typen erstellen
6. Übersetzungen hinzufügen (de, en, es)

### Phase 3: Buchungen
1. `TourBookingsTab.tsx` Komponente erstellen
2. `TourBookingModal.tsx` Komponente erstellen
3. Controller erweitern (`tourBookingController.ts`)
4. Buchungen-Liste anzeigen
5. Buchungen erstellen/bearbeiten

### Phase 4: Reservation-Verknüpfung
1. `TourReservationLink.tsx` Komponente erstellen
2. Controller erstellen (`tourReservationController.ts`)
3. Preisaufschlüsselung implementieren
4. Zahlungsstatus-Tracking

### Phase 5: WhatsApp-Automatisierung
1. `tourWhatsAppService.ts` Service erstellen
2. WhatsApp-Integration erweitern
3. Templates erstellen
4. Flow testen

### Phase 6: Kommissions-Tracking
1. `commissionService.ts` Service erstellen
2. Kommissions-Berechnung implementieren
3. WorktimeStats erweitern (Kommissionen-Tab)
4. Statistiken anzeigen

### Phase 7: Export & Integration
1. Export-API implementieren
2. Dokumentation für Website-Integration
3. Testing

---

## 11. WICHTIGE HINWEISE

### 11.1 Berechtigungen
- Alle neuen Seiten/Tabellen/Buttons müssen in `seed.ts` hinzugefügt werden
- Frontend UND Backend müssen Berechtigungen prüfen
- Seed-File testen: `npx prisma db seed`

### 11.2 Übersetzungen
- ALLE Texte müssen übersetzt sein (de, en, es)
- Keine hardcoded Texte im Code
- `t()` Funktion verwenden

### 11.3 Notifications
- Bei wichtigen Aktionen Notifications erstellen
- Backend-Übersetzungen in `translations.ts` hinzufügen
- Frontend-Übersetzungen in i18n-Locales hinzufügen

### 11.4 WhatsApp-Integration
- Branch-basierte WhatsApp-Integration beachten
- Templates für Nachrichten verwenden
- Fehlerbehandlung implementieren

### 11.5 Preisaufschlüsselung
- Tourpreis und Bettenpreis getrennt tracken
- Zahlungsstatus für beide Preise separat
- In Reservation-Details anzeigen

---

## 12. TESTING-CHECKLISTE

- [ ] Touren erstellen/bearbeiten/löschen
- [ ] Buchungen erstellen/bearbeiten/stornieren
- [ ] Tour mit Reservation verknüpfen
- [ ] Preisaufschlüsselung korrekt
- [ ] Zahlungsstatus korrekt
- [ ] Kommissions-Berechnung korrekt
- [ ] WhatsApp-Nachrichten werden gesendet
- [ ] WhatsApp-Antworten werden verarbeitet
- [ ] Export-API funktioniert
- [ ] Berechtigungen funktionieren (Frontend + Backend)
- [ ] Übersetzungen funktionieren (de, en, es)
- [ ] Notifications werden erstellt
- [ ] Mitarbeiter-Statistiken zeigen Kommissionen

---

## 13. NÄCHSTE SCHRITTE

1. **Dokumentation prüfen** - Dieser Plan muss vom User bestätigt werden
2. **Datenbank-Schema finalisieren** - Eventuelle Anpassungen nach User-Feedback
3. **Implementierung starten** - Schritt für Schritt gemäß Phase 1-7
4. **Testing** - Umfassendes Testing aller Features
5. **Dokumentation aktualisieren** - Detaillierte Dokumentation in `docs/modules/MODUL_TOUREN_VERWALTUNG.md`

---

**WICHTIG:** Dieser Plan ist nur eine VORBEREITUNG. NICHTS wird umgesetzt, bis der User diesen Plan ausdrücklich bestätigt hat!

