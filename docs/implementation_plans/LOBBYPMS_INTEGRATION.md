# LobbyPMS Integration - Implementierungsplan

## Überblick

Dieses Dokument beschreibt die Integration von LobbyPMS (Property Management System) mit dem Intranet-System für die Organisation "La Familia Hostel" (Organisation ID: 1). Ziel ist die Automatisierung von Check-in-Prozessen, Kommunikation mit Gästen und Task-Management.

## Anforderungen

### 1. Automatischer E-Mail/WhatsApp-Versand
- **Zielgruppe**: Gäste mit Ankunft am nächsten Tag nach 22:00 Uhr
- **Inhalt**:
  - Einladung zum Online-Check-in
  - Zahlungslink von Bold
  - Nach erfolgreichem Check-in: PIN vom Türsystem, App-Name (ttcode), Zimmerbeschreibung

### 2. Check-ins als To-Do's
- Jede Reservierung wird automatisch als Task angelegt
- Bei Check-in: Status automatisch aktualisieren
- Zeitmessung für den Mitarbeiter/User

### 3. SIRE-Registrierung
- **Automatische Registrierung beim Check-in**: Gäste müssen bei SIRE (Plataforma de la migración, Kolumbien) registriert werden
- **Integration mit SIRE API**: Automatische Übermittlung von Gästedaten an SIRE
- **Status-Tracking**: Verfolgung des Registrierungsstatus

### 4. Weitere Automatisierungen
- Synchronisation von Reservierungsdaten
- Automatische Status-Updates
- Integration mit Zahlungssystem (Bold)

## Aktueller Stand

### ✅ Implementiert (Stand: 2025-01-XX)

#### Backend Services
- ✅ **LobbyPmsService** - Grundstruktur implementiert (wartet auf API-Dokumentation für Endpoints)
- ✅ **WhatsAppService** - Vollständig implementiert (Twilio & WhatsApp Business API)
- ✅ **BoldPaymentService** - Vollständig implementiert (Payment Links, Webhooks)
- ✅ **SireService** - Vollständig implementiert (Registrierung, Status-Tracking)
- ✅ **TTLockService** - Vollständig implementiert (OAuth, Passcodes, Locks)
- ✅ **ReservationNotificationService** - Vollständig implementiert (E-Mail/WhatsApp-Versand)
- ✅ **ReservationScheduler** - Vollständig implementiert (tägliche Ausführung)
- ✅ **ReservationTaskService** - Vollständig implementiert (Task-Management)
- ✅ **MockLobbyPmsService** - Mock-Service für Tests

#### Datenbank
- ✅ **Reservation Model** - Vollständig implementiert (inkl. invitationSentAt)
- ✅ **Task Model** - Erweitert (reservationId)
- ✅ **Organization Settings** - Erweitert (API-Konfiguration)
- ✅ **ReservationSyncHistory** - Implementiert

#### Frontend
- ✅ **API Configuration Tab** - Vollständig implementiert
- ✅ **ReservationsPage** - Implementiert
- ✅ **ReservationList** - Implementiert (Filter, Suche, Sync)
- ✅ **ReservationCard** - Implementiert
- ✅ **ReservationDetails** - Implementiert
- ✅ **CheckInForm** - Implementiert
- ✅ **Routen** - Konfiguriert (/reservations, /reservations/:id)
- ✅ **i18n** - Übersetzungen (DE/ES/EN)

#### Dokumentation
- ✅ Implementierungsplan
- ✅ API-Recherche
- ✅ Mock-Daten-Anleitung
- ✅ Wartezeit-Plan

### ⚠️ Ausstehend

#### Wartet auf API-Dokumentation
- ⚠️ **LobbyPMS API Endpoints** - Korrekte Pfade und Authentifizierung
- ⚠️ **Betrag aus LobbyPMS** - Feld in API Response identifizieren

#### Optional
- [ ] Unit-Tests für Services
- [ ] Integration-Tests
- [ ] E2E-Tests

## Phase 1: Datenbank-Schema

### Reservierungs-Modell

```prisma
model Reservation {
  id                    Int                 @id @default(autoincrement())
  lobbyReservationId    String?             @unique // ID aus LobbyPMS
  guestName             String
  guestEmail            String?
  guestPhone            String?
  checkInDate           DateTime
  checkOutDate          DateTime
  arrivalTime           DateTime?           // Geschätzte Ankunftszeit
  roomNumber            String?
  roomDescription       String?
  status                ReservationStatus   @default(confirmed)
  paymentStatus         PaymentStatus       @default(pending)
  paymentLink           String?             // Bold Payment Link
  doorPin               String?             // PIN für Türsystem
  doorAppName           String?             // App-Name (z.B. "TTLock")
  ttlLockId             String?             // TTLock Lock ID
  ttlLockPassword       String?             // TTLock Passcode/Password
  onlineCheckInCompleted Boolean            @default(false)
  onlineCheckInCompletedAt DateTime?
  sireRegistered        Boolean             @default(false)
  sireRegistrationId    String?             // ID der SIRE-Registrierung
  sireRegisteredAt      DateTime?
  sireRegistrationError String?             // Fehlermeldung bei fehlgeschlagener Registrierung
  guestNationality      String?             // Nationalität des Gastes (für SIRE)
  guestPassportNumber   String?             // Passnummer (für SIRE)
  guestBirthDate        DateTime?           // Geburtsdatum (für SIRE)
  organizationId        Int
  organization          Organization        @relation(fields: [organizationId], references: [id])
  taskId                Int?                // Verknüpfter Task
  task                  Task?               @relation(fields: [taskId], references: [id])
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  syncHistory           ReservationSyncHistory[]
  
  @@index([organizationId])
  @@index([checkInDate])
  @@index([status])
  @@index([lobbyReservationId])
}

enum ReservationStatus {
  confirmed
  checked_in
  checked_out
  cancelled
  no_show
}

enum PaymentStatus {
  pending
  paid
  partially_paid
  refunded
}

model ReservationSyncHistory {
  id            Int         @id @default(autoincrement())
  reservationId Int
  reservation   Reservation @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  syncType      String      // 'created', 'updated', 'status_changed'
  syncData      Json?       // Vollständige Daten zum Zeitpunkt der Synchronisation
  syncedAt      DateTime    @default(now())
  errorMessage  String?
  
  @@index([reservationId])
  @@index([syncedAt])
}
```

### Erweiterung Task-Modell

```prisma
model Task {
  // ... bestehende Felder ...
  reservationId Int?
  reservation Reservation?
  
  @@index([reservationId])
}
```

### Organisation-Settings Erweiterung

Die `Organization.settings` JSON-Struktur wird erweitert:

```typescript
interface OrganizationSettings {
  // ... bestehende Settings ...
  lobbyPms?: {
    apiUrl: string;
    apiKey: string;
    propertyId: string;
    webhookSecret?: string;
    syncEnabled: boolean;
    autoCreateTasks: boolean;
    lateCheckInThreshold: string; // z.B. "22:00"
    notificationChannels: ('email' | 'whatsapp')[];
  };
  whatsapp?: {
    provider: 'twilio' | 'whatsapp-business-api' | 'other';
    apiKey: string;
    apiSecret: string;
    phoneNumberId?: string;
    businessAccountId?: string;
  };
  boldPayment?: {
    apiKey: string;
    merchantId: string;
    environment: 'sandbox' | 'production';
  };
  doorSystem?: {
    provider: string; // "ttlock"
    apiUrl: string; // https://open.ttlock.com
    clientId: string; // TTLock Client ID
    clientSecret: string; // TTLock Client Secret
    accessToken?: string; // TTLock Access Token (wird automatisch erneuert)
    lockIds?: string[]; // IDs der verfügbaren Locks
  };
  sire?: {
    apiUrl: string;
    apiKey: string;
    apiSecret?: string;
    enabled: boolean;
    autoRegisterOnCheckIn: boolean;
    propertyCode?: string; // Property-Code für SIRE
  };
}
```

## Phase 2: LobbyPMS API-Integration

### Service: `lobbyPmsService.ts`

**Funktionen:**
1. **Authentifizierung**: API-Key-basierte Authentifizierung
2. **Reservierungen abrufen**: 
   - Alle Reservierungen für einen Zeitraum
   - Reservierungen mit Ankunft am nächsten Tag
   - Reservierungen nach Status filtern
3. **Reservierungsdetails abrufen**: Vollständige Details einer Reservierung
4. **Check-in-Status aktualisieren**: Status in LobbyPMS aktualisieren
5. **Webhook-Handler**: Empfang von Webhooks von LobbyPMS

**Typische API-Endpunkte (zu verifizieren mit LobbyPMS-Dokumentation):**
- `GET /api/reservations` - Liste aller Reservierungen
- `GET /api/reservations/:id` - Reservierungsdetails
- `PUT /api/reservations/:id/status` - Status aktualisieren
- `POST /api/webhooks` - Webhook-Empfang

**Implementierung:**
```typescript
// backend/src/services/lobbyPmsService.ts
export class LobbyPmsService {
  private apiUrl: string;
  private apiKey: string;
  private propertyId: string;

  constructor(organizationId: number) {
    // Lade Settings aus Organisation
  }

  async fetchReservations(startDate: Date, endDate: Date): Promise<Reservation[]>
  async fetchReservationById(reservationId: string): Promise<Reservation>
  async updateReservationStatus(reservationId: string, status: string): Promise<void>
  async syncReservation(lobbyReservation: any): Promise<Reservation>
}
```

### Controller: `lobbyPmsController.ts`

**Endpoints:**
- `GET /api/lobby-pms/reservations` - Reservierungen abrufen
- `GET /api/lobby-pms/reservations/:id` - Reservierungsdetails
- `POST /api/lobby-pms/sync` - Manuelle Synchronisation
- `POST /api/lobby-pms/webhook` - Webhook-Empfang von LobbyPMS
- `PUT /api/lobby-pms/reservations/:id/check-in` - Check-in durchführen

## Phase 3: Automatischer E-Mail/WhatsApp-Versand

### Service: `whatsappService.ts`

**Funktionen:**
- WhatsApp-Nachrichten über Twilio oder WhatsApp Business API versenden
- Template-basierte Nachrichten
- Status-Tracking

**Implementierung:**
```typescript
// backend/src/services/whatsappService.ts
export class WhatsAppService {
  async sendMessage(to: string, message: string, template?: string): Promise<boolean>
  async sendCheckInInvitation(reservation: Reservation): Promise<boolean>
  async sendCheckInConfirmation(reservation: Reservation): Promise<boolean>
}
```

### Service: `reservationNotificationService.ts`

**Funktionen:**
1. **Späte Check-ins identifizieren**: Reservierungen mit Ankunft am nächsten Tag nach 22:00
2. **E-Mail-Versand**: Über bestehenden `emailService.ts`
3. **WhatsApp-Versand**: Über neuen `whatsappService.ts`
4. **Nach Check-in**: PIN, App-Info, Zimmerbeschreibung versenden

**Scheduler:**
- Täglich um 20:00 Uhr: Prüfe Reservierungen für nächsten Tag
- Versende Einladungen an Gäste mit Ankunft nach 22:00

**Implementierung:**
```typescript
// backend/src/services/reservationNotificationService.ts
export class ReservationNotificationService {
  async sendLateCheckInInvitations(): Promise<void> {
    // 1. Hole Reservierungen für nächsten Tag mit Ankunft nach 22:00
    // 2. Prüfe ob bereits versendet
    // 3. Versende E-Mail/WhatsApp mit:
    //    - Online-Check-in-Einladung
    //    - Bold Payment-Link
  }

  async sendCheckInConfirmation(reservationId: number): Promise<void> {
    // Nach erfolgreichem Check-in:
    // - PIN vom Türsystem
    // - App-Name (ttcode)
    // - Zimmerbeschreibung
  }
}
```

### E-Mail/WhatsApp-Templates

**Template 1: Check-in-Einladung (vor Ankunft)**
```
Betreff: Willkommen bei La Familia Hostel - Online Check-in

Hallo {guestName},

wir freuen uns, Sie bald bei uns begrüßen zu dürfen!

Da Sie nach 22:00 Uhr ankommen, können Sie bereits jetzt den Online-Check-in durchführen:

[Online Check-in Link]

Bitte zahlen Sie auch bereits im Voraus:
[Zahlungslink von Bold]

Wir sehen uns morgen!
```

**Template 2: Check-in-Bestätigung (nach erfolgreichem Check-in)**
```
Betreff: Ihr Check-in ist abgeschlossen - Zimmerinformationen

Hallo {guestName},

Ihr Check-in ist erfolgreich abgeschlossen!

Ihre Zimmerinformationen:
- Zimmer: {roomNumber}
- Beschreibung: {roomDescription}

Zugang:
- Tür-PIN: {doorPin}
- App: {doorAppName} (Download-Link)

Wir wünschen Ihnen einen angenehmen Aufenthalt!
```

## Phase 4: Bold Payment-Integration

### Service: `boldPaymentService.ts`

**Funktionen:**
- Payment-Links generieren
- Payment-Status abfragen
- Webhook-Handler für Payment-Updates

**Implementierung:**
```typescript
// backend/src/services/boldPaymentService.ts
export class BoldPaymentService {
  async createPaymentLink(reservation: Reservation, amount: number): Promise<string>
  async getPaymentStatus(paymentId: string): Promise<PaymentStatus>
  async handleWebhook(payload: any): Promise<void>
}
```

## Phase 5: Automatische Task-Erstellung

### Erweiterung: `taskAutomationService.ts`

**Neue Funktion:**
```typescript
// In backend/src/services/taskAutomationService.ts
static async createReservationTask(reservation: Reservation, organizationId: number): Promise<Task> {
  // 1. Bestimme zuständige Rolle (z.B. "Rezeption")
  // 2. Erstelle Task mit:
  //    - Titel: "Check-in: {guestName} - {checkInDate}"
  //    - Beschreibung: Reservierungsdetails
  //    - Status: "open"
  //    - Due Date: Check-in-Datum
  // 3. Verknüpfe mit Reservation
  // 4. Erstelle Benachrichtigung
}
```

### Automatische Status-Updates

**Service: `reservationTaskService.ts`**
```typescript
export class ReservationTaskService {
  async updateTaskOnCheckIn(reservationId: number, userId: number): Promise<void> {
    // 1. Finde Task zur Reservation
    // 2. Aktualisiere Status auf "in_progress" oder "completed"
    // 3. Erfasse WorkTime für User
    // 4. Aktualisiere Reservation-Status
  }
}
```

## Phase 6: SIRE-Integration

### Service: `sireService.ts`

**Funktionen:**
1. **Gästeregistrierung**: Automatische Registrierung von Gästen bei SIRE
2. **Datenübermittlung**:**: Übermittlung aller erforderlichen Gästedaten
3. **Status-Tracking**: Verfolgung des Registrierungsstatus
4. **Fehlerbehandlung**: Retry-Logik bei fehlgeschlagener Registrierung

**Erforderliche Gästedaten für SIRE:**
- Name (Vor- und Nachname)
- Nationalität
- Passnummer / Ausweisdokument
- Geburtsdatum
- Ankunftsdatum
- Abreisedatum
- Zimmernummer
- Kontaktdaten (E-Mail, Telefon)

**Implementierung:**
```typescript
// backend/src/services/sireService.ts
export class SireService {
  private apiUrl: string;
  private apiKey: string;
  private apiSecret?: string;
  private propertyCode?: string;

  constructor(organizationId: number) {
    // Lade Settings aus Organisation
  }

  /**
   * Registriert einen Gast bei SIRE
   * Wird automatisch beim Check-in aufgerufen
   */
  async registerGuest(reservation: Reservation): Promise<{
    success: boolean;
    registrationId?: string;
    error?: string;
  }> {
    // 1. Validiere erforderliche Daten
    // 2. Erstelle SIRE-Registrierungsanfrage
    // 3. Sende an SIRE API
    // 4. Speichere Registrierungs-ID
    // 5. Aktualisiere Reservation-Status
  }

  /**
   * Aktualisiert eine bestehende SIRE-Registrierung
   */
  async updateRegistration(
    registrationId: string,
    reservation: Reservation
  ): Promise<boolean>

  /**
   * Meldet einen Gast bei SIRE ab (bei Check-out)
   */
  async unregisterGuest(registrationId: string): Promise<boolean>

  /**
   * Prüft den Status einer Registrierung
   */
  async getRegistrationStatus(registrationId: string): Promise<{
    status: 'registered' | 'pending' | 'error';
    lastUpdated: Date;
  }>
}
```

### Controller-Erweiterung: `lobbyPmsController.ts`

**Neue Endpoints:**
- `POST /api/lobby-pms/reservations/:id/register-sire` - Manuelle SIRE-Registrierung
- `GET /api/lobby-pms/reservations/:id/sire-status` - SIRE-Registrierungsstatus abrufen

### Automatische SIRE-Registrierung beim Check-in

**Integration in Check-in-Prozess:**
```typescript
// In reservationTaskService.ts oder lobbyPmsController.ts
async performCheckIn(reservationId: number, userId: number) {
  // 1. Check-in in LobbyPMS durchführen
  // 2. Task-Status aktualisieren
  // 3. WorkTime erfassen
  // 4. **Automatische SIRE-Registrierung** (wenn aktiviert)
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId }
  });
  
  const orgSettings = await getOrganizationSettings(reservation.organizationId);
  
  if (orgSettings.sire?.autoRegisterOnCheckIn && orgSettings.sire?.enabled) {
    const sireService = new SireService(reservation.organizationId);
    const result = await sireService.registerGuest(reservation);
    
    if (result.success) {
      await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          sireRegistered: true,
          sireRegistrationId: result.registrationId,
          sireRegisteredAt: new Date()
        }
      });
    } else {
      // Fehler protokollieren, aber Check-in nicht blockieren
      await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          sireRegistrationError: result.error
        }
      });
    }
  }
  
  // 5. PIN generieren
  // 6. Bestätigungs-E-Mail/WhatsApp versenden
}
```

## Phase 7: TTLock-Integration (Türsystem)

### Service: `ttlockService.ts`

**TTLock API-Übersicht:**
- **Base URL**: https://open.ttlock.com
- **Authentifizierung**: OAuth 2.0 mit Client ID und Client Secret
- **Access Token**: Wird automatisch erneuert

**Funktionen:**
1. **Authentifizierung**: OAuth 2.0 Token-Management
2. **PIN/Passcode-Generierung**: Temporäre Zugangscodes für Reservierungen
3. **Lock-Verwaltung**: Lock-Status abrufen, Lock-Informationen
4. **Passcode-Verwaltung**: Passcodes hinzufügen, löschen, aktualisieren

**Implementierung:**
```typescript
// backend/src/services/ttlockService.ts
export class TTLockService {
  private clientId: string;
  private clientSecret: string;
  private accessToken?: string;
  private tokenExpiresAt?: Date;

  constructor(organizationId: number) {
    // Lade Settings aus Organisation
  }

  /**
   * Authentifiziert bei TTLock und holt Access Token
   */
  private async authenticate(): Promise<string> {
    // POST /oauth2/token
    // Erneuert Token automatisch wenn abgelaufen
  }

  /**
   * Generiert einen temporären Passcode für eine Reservierung
   */
  async generatePasscode(
    lockId: string,
    reservation: Reservation
  ): Promise<{
    passcode: string;
    keyboardPwdId: number;
    startDate: Date;
    endDate: Date;
  }> {
    // POST /v3/keyboardPwd/add
    // Erstellt temporären Passcode für Check-in bis Check-out
  }

  /**
   * Löscht einen Passcode (bei Check-out)
   */
  async deletePasscode(keyboardPwdId: number, lockId: string): Promise<boolean> {
    // POST /v3/keyboardPwd/delete
  }

  /**
   * Ruft Lock-Informationen ab
   */
  async getLockInfo(lockId: string): Promise<{
    lockName: string;
    lockAlias: string;
    lockMac: string;
    battery: number;
  }> {
    // GET /v3/lock/query
  }

  /**
   * Ruft Liste aller verfügbaren Locks ab
   */
  async listLocks(): Promise<Array<{
    lockId: string;
    lockName: string;
    lockAlias: string;
  }>> {
    // GET /v3/lock/list
  }

  /**
   * Gibt App-Informationen zurück
   */
  getAppInfo(): { name: string; downloadLink: string } {
    return {
      name: 'TTLock',
      downloadLink: 'https://www.ttlock.com/download'
    };
  }
}
```

### Controller-Erweiterung: `lobbyPmsController.ts`

**Neue Endpoints:**
- `GET /api/lobby-pms/ttlock/locks` - Liste aller TTLock Locks
- `POST /api/lobby-pms/reservations/:id/generate-passcode` - Passcode für Reservierung generieren
- `DELETE /api/lobby-pms/reservations/:id/passcode` - Passcode löschen

## Phase 8: Scheduler und Automatisierung

### Scheduler: `reservationScheduler.ts`

**Cron-Jobs:**
1. **Täglich 20:00 Uhr**: Späte Check-in-Einladungen versenden
2. **Stündlich**: Reservierungen von LobbyPMS synchronisieren
3. **Täglich 00:00 Uhr**: Tasks für anstehende Check-ins erstellen
4. **Alle 15 Minuten**: Payment-Status prüfen und aktualisieren

**Implementierung:**
```typescript
// backend/src/services/reservationScheduler.ts
import cron from 'node-cron';

export class ReservationScheduler {
  static start() {
    // Täglich um 20:00 Uhr
    cron.schedule('0 20 * * *', async () => {
      await ReservationNotificationService.sendLateCheckInInvitations();
    });

    // Stündlich
    cron.schedule('0 * * * *', async () => {
      await LobbyPmsService.syncReservations();
    });

    // Täglich um 00:00 Uhr
    cron.schedule('0 0 * * *', async () => {
      await TaskAutomationService.createReservationTasksForTomorrow();
    });
  }
}
```

## Phase 9: Frontend-Integration

### Status: 🟡 TEILWEISE IMPLEMENTIERT

**Siehe detaillierten Status:** `LOBBYPMS_INTEGRATION_API_TAB_STATUS.md`

### Implementiert
- ✅ `ApiConfigurationTab.tsx` Komponente
- ✅ Integration in `EditOrganizationModal.tsx` (nur für CO)
- ✅ i18n-Übersetzungen (de, es, en)
- ✅ Secret-Input-Komponente
- ✅ Formular für alle 4 APIs

### Fehlt (KRITISCH)
- ❌ Backend-Berechtigungsprüfung
- ❌ Verschlüsselung der API-Keys
- ❌ URL-Validierung
- ❌ Frontend-Validierung
- ❌ Audit-Logs
- ❌ TypeScript-Typisierung

**Nächste Schritte:** Siehe `LOBBYPMS_INTEGRATION_API_TAB_STATUS.md` Phase 1-3

## Phase 9: Frontend-Integration (Original)

### Neue Seiten/Komponenten

1. **Reservierungsübersicht**: `ReservationsPage.tsx`
   - Liste aller Reservierungen
   - Filter nach Status, Datum
   - Check-in-Button

2. **Reservierungsdetails**: `ReservationDetailPage.tsx`
   - Vollständige Reservierungsinformationen
   - Payment-Status
   - Check-in-Formular
   - Verknüpfter Task

3. **LobbyPMS-Einstellungen**: `LobbyPmsSettingsTab.tsx`
   - API-Konfiguration
   - Webhook-Einstellungen
   - Synchronisation steuern

4. **WhatsApp-Einstellungen**: `WhatsAppSettingsTab.tsx`
   - Provider-Konfiguration
   - Template-Verwaltung

5. **Bold Payment-Einstellungen**: `BoldPaymentSettingsTab.tsx`
   - API-Konfiguration
   - Payment-Link-Templates

6. **SIRE-Einstellungen**: `SireSettingsTab.tsx`
   - API-Konfiguration
   - Auto-Registrierung aktivieren/deaktivieren
   - Property-Code konfigurieren

### API-Endpunkte (Frontend)

```typescript
// In frontend/src/config/api.ts
LOBBY_PMS: {
  BASE: '/lobby-pms',
  RESERVATIONS: '/lobby-pms/reservations',
  RESERVATION_BY_ID: (id: number) => `/lobby-pms/reservations/${id}`,
  SYNC: '/lobby-pms/sync',
  CHECK_IN: (id: number) => `/lobby-pms/reservations/${id}/check-in`,
  SEND_INVITATION: (id: number) => `/lobby-pms/reservations/${id}/send-invitation`,
  SETTINGS: '/lobby-pms/settings'
}
```

## Implementierungsreihenfolge

### Schritt 1: Datenbank-Schema
- [ ] Prisma-Schema erweitern (Reservation, ReservationSyncHistory)
- [ ] Migration erstellen und ausführen
- [ ] Seed-Daten für Test-Reservierungen

### Schritt 2: LobbyPMS API-Integration
- [ ] `lobbyPmsService.ts` erstellen
- [ ] API-Endpunkte implementieren
- [ ] Controller erstellen
- [ ] Routes registrieren
- [ ] Tests mit LobbyPMS API

### Schritt 3: Datenmodell und Basis-Funktionen
- [ ] Reservation-Model in Prisma implementieren
- [ ] CRUD-Operationen für Reservierungen
- [ ] Synchronisation mit LobbyPMS

### Schritt 4: WhatsApp-Integration
- [ ] `whatsappService.ts` erstellen
- [ ] Provider-Konfiguration (Twilio/WhatsApp Business API)
- [ ] Template-System
- [ ] Tests

### Schritt 5: Bold Payment-Integration
- [ ] `boldPaymentService.ts` erstellen
- [ ] Payment-Link-Generierung
- [ ] Webhook-Handler
- [ ] Status-Synchronisation

### Schritt 6: Automatische Task-Erstellung
- [ ] `taskAutomationService.ts` erweitern
- [ ] Task-Erstellung bei neuer Reservierung
- [ ] Task-Status-Updates bei Check-in

### Schritt 7: Benachrichtigungssystem
- [ ] `reservationNotificationService.ts` erstellen
- [ ] E-Mail-Templates
- [ ] WhatsApp-Templates
- [ ] Scheduler-Integration

### Schritt 8: SIRE-Integration
- [ ] `sireService.ts` erstellen
- [ ] SIRE API-Endpunkte implementieren
- [ ] Automatische Registrierung beim Check-in
- [ ] Status-Tracking
- [ ] Fehlerbehandlung und Retry-Logik
- [ ] Tests mit SIRE API (falls verfügbar)

### Schritt 9: TTLock-Integration
- [ ] `ttlockService.ts` erstellen
- [ ] OAuth 2.0 Authentifizierung implementieren
- [ ] Passcode-Generierung implementieren
- [ ] Passcode-Verwaltung (Löschen, Aktualisieren)
- [ ] Lock-Informationen abrufen
- [ ] Token-Erneuerung automatisch
- [ ] App-Informationen bereitstellen

### Schritt 10: Scheduler
- [ ] `reservationScheduler.ts` erstellen
- [ ] Cron-Jobs konfigurieren
- [ ] In `app.ts` starten

### Schritt 11: Frontend
- [ ] Reservierungsübersicht
- [ ] Reservierungsdetails
- [ ] Einstellungsseiten
- [ ] Check-in-Formular

### Schritt 12: Testing
- [ ] Unit-Tests für Services
- [ ] Integration-Tests für API
- [ ] End-to-End-Tests für Workflows

### Schritt 13: Dokumentation
- [ ] API-Dokumentation aktualisieren
- [ ] Benutzerhandbuch erweitern
- [ ] Admin-Handbuch erweitern

## API-Dokumentationen und Zugangslinks

### 1. LobbyPMS API

**Dokumentation:**
- **API-Dokumentation**: https://app.lobbypms.com/api-docs
- **Support-Artikel**: https://soporte.lobbypms.com/hc/es/articles/1500002760802-Usuarios-permisos-y-API

**Authentifizierung:**
- API-Token erforderlich
- Token kann im LobbyPMS-System unter "Benutzer, Berechtigungen und API" abgerufen werden
- IP-Beschränkungen können für den API-Zugriff festgelegt werden

**Typische Endpunkte (zu verifizieren in der Dokumentation):**
- `GET /api/reservations` - Reservierungen abrufen
- `GET /api/reservations/:id` - Reservierungsdetails
- `PUT /api/reservations/:id` - Reservierung aktualisieren
- `POST /api/webhooks` - Webhook-Konfiguration

**Nächste Schritte:**
- API-Token im LobbyPMS-Konto generieren
- API-Dokumentation unter https://app.lobbypms.com/api-docs durchgehen
- Test-Zugang einrichten

### 2. TTLock API (Türsystem)

**Dokumentation:**
- **Offizielle API-Dokumentation**: https://open.ttlock.com/doc
- **Registrierung erforderlich**: Ja, für API-Zugang

**Funktionen:**
- Smart Lock Management
- PIN/Passcode-Verwaltung
- Temporäre Zugangscodes
- Lock-Status abrufen

**Typische Endpunkte (zu verifizieren in der Dokumentation):**
- `POST /v3/lock/initialize` - Lock initialisieren
- `POST /v3/lock/add` - Lock hinzufügen
- `POST /v3/keyboardPwd/add` - PIN/Passcode hinzufügen
- `POST /v3/keyboardPwd/delete` - PIN/Passcode löschen
- `GET /v3/lock/list` - Liste aller Locks

**Nächste Schritte:**
- Registrierung auf https://open.ttlock.com
- API-Key und Client Secret erhalten
- Dokumentation durchgehen

### 3. SIRE API (Kolumbien Migration)

**Hinweis:** Es gibt zwei verschiedene SIRE-Systeme:
1. **SIRE (OCIMF)** - Für Schifffahrt/Ölindustrie (nicht relevant)
2. **SIRE Kolumbien** - Plataforma de la migración für Touristenregistrierung

**Für Kolumbien Migration:**
- **Status**: API-Dokumentation möglicherweise nicht öffentlich verfügbar
- **Zugang**: Direkter Kontakt mit SIRE-Support in Kolumbien erforderlich
- **Alternative**: Möglicherweise über LobbyPMS integriert oder manuelle Registrierung

**Erforderliche Informationen:**
- API-Endpunkte für Gästeregistrierung
- Authentifizierungsmethode
- Erforderliche Datenfelder
- Registrierungsprozess

**Nächste Schritte:**
- Kontakt mit SIRE-Support in Kolumbien aufnehmen
- API-Zugang beantragen (falls verfügbar)
- Alternativ: Prüfen ob LobbyPMS bereits SIRE-Integration bietet

### 4. Bold Payment API

**Status:** 
- Spezifische API-Dokumentation für "Bold Payment" nicht eindeutig gefunden
- Mögliche Verwechslung mit "Bold Commerce" (E-Commerce-Plattform)

**Mögliche Optionen:**
- Bold Payment könnte ein lokaler Payment-Provider in Kolumbien sein
- Möglicherweise über LobbyPMS integriert
- Oder separater Payment-Gateway

**Nächste Schritte:**
- Direkter Kontakt mit Bold Payment (falls bekannt)
- Prüfen ob Zahlungslink-Generierung über LobbyPMS möglich ist
- Alternative Payment-Provider evaluieren falls nötig

### 5. WhatsApp-Integration

**Optionen:**
- **Twilio WhatsApp API**: https://www.twilio.com/docs/whatsapp
- **WhatsApp Business API**: https://developers.facebook.com/docs/whatsapp
- **Andere Provider**: z.B. MessageBird, 360dialog

**Nächste Schritte:**
- Provider wählen basierend auf Kosten und Features
- API-Zugang einrichten
- Template-Approval-Prozess durchlaufen (für WhatsApp Business API)

## Offene Fragen / Zu klären

1. **LobbyPMS API**: 
   - ✅ Dokumentation gefunden: https://app.lobbypms.com/api-docs
   - ⚠️ API-Token muss generiert werden
   - ⚠️ Verfügbare Webhooks prüfen
   - ⚠️ Datenstruktur der Reservierungen dokumentieren

2. **TTLock API**:
   - ✅ Dokumentation gefunden: https://open.ttlock.com/doc
   - ⚠️ Registrierung und API-Key erforderlich
   - ⚠️ Lock-ID und Zugangsdaten beschaffen
   - ⚠️ PIN-Generierungsprozess dokumentieren

3. **SIRE API (Kolumbien)**:
   - ⚠️ API-Dokumentation möglicherweise nicht öffentlich
   - ⚠️ Direkter Kontakt mit SIRE-Support erforderlich
   - ⚠️ Prüfen ob über LobbyPMS integriert
   - ⚠️ Erforderliche Datenfelder klären

4. **Bold Payment API**:
   - ⚠️ Spezifische Dokumentation nicht gefunden
   - ⚠️ Kontakt mit Bold Payment erforderlich
   - ⚠️ Prüfen ob über LobbyPMS integriert
   - ⚠️ Alternative Payment-Provider evaluieren

5. **WhatsApp-Provider**:
   - ⚠️ Provider wählen (Twilio, WhatsApp Business API, andere)
   - ⚠️ Kosten und Limits vergleichen
   - ⚠️ Template-Approval-Prozess berücksichtigen

6. **Business-Logik**:
   - Welche Rolle soll für Check-in-Tasks zuständig sein?
   - Welche Zeitzone für 22:00-Uhr-Check?
   - Wann genau sollen Einladungen versendet werden?

## Nächste Schritte

1. **API-Zugänge einrichten** ✅ (Dokumentationen gefunden)
   - ✅ LobbyPMS: API-Token generieren unter "Benutzer, Berechtigungen und API"
   - ✅ TTLock: Registrierung auf https://open.ttlock.com und API-Key erhalten
   - ⚠️ SIRE: Kontakt mit SIRE-Support in Kolumbien aufnehmen
   - ⚠️ Bold Payment: Kontakt aufnehmen oder über LobbyPMS prüfen

2. **API-Dokumentationen durchgehen**
   - ✅ LobbyPMS API-Dokumentation: https://app.lobbypms.com/api-docs
   - ✅ TTLock API-Dokumentation: https://open.ttlock.com/doc
   - ⚠️ SIRE: API-Dokumentation beschaffen (falls verfügbar)
   - ⚠️ Bold Payment: API-Dokumentation beschaffen

3. **Anforderungen präzisieren**
   - WhatsApp-Provider wählen (Twilio oder WhatsApp Business API)
   - Lock-IDs und Zugangsdaten für TTLock beschaffen
   - SIRE-Registrierungsprozess klären
   - Payment-Link-Generierung klären

4. **Prototyp erstellen**
   - Einfache LobbyPMS-Synchronisation
   - TTLock PIN-Generierung testen
   - Test-Reservierung anlegen
   - Basis-Funktionalität testen

## Wichtige Hinweise

- ⚠️ **Server-Neustart**: Nach Schema-Änderungen muss der Server neu gestartet werden (nur nach Absprache!)
- ⚠️ **API-Keys**: Alle API-Keys müssen sicher in Umgebungsvariablen oder Organisation-Settings gespeichert werden
- ⚠️ **Webhooks**: Webhook-Endpunkte müssen öffentlich erreichbar sein (HTTPS erforderlich)
- ⚠️ **Datenschutz**: Gäste-Daten müssen DSGVO-konform behandelt werden
- ⚠️ **Fehlerbehandlung**: Robuste Fehlerbehandlung für alle externen API-Calls

## Referenzen

### API-Dokumentationen
- **LobbyPMS API**: https://app.lobbypms.com/api-docs
- **LobbyPMS Support**: https://soporte.lobbypms.com
- **LobbyPMS API Setup**: https://soporte.lobbypms.com/hc/es/articles/1500002760802-Usuarios-permisos-y-API
- **TTLock API**: https://open.ttlock.com/doc
- **Twilio WhatsApp API**: https://www.twilio.com/docs/whatsapp
- **WhatsApp Business API**: https://developers.facebook.com/docs/whatsapp

### SIRE (Hinweis)
- **SIRE OCIMF** (Schifffahrt - nicht relevant): https://support.ocimf.org/hc/en-gb/articles/17821827069085-SIRE-2-0-API-Access
- **SIRE Kolumbien** (Migration): Direkter Kontakt erforderlich

### Code-Referenzen
- Bestehende Services: `emailService.ts`, `taskAutomationService.ts`
- Organisation-Settings: `Organization.settings` JSON-Feld

