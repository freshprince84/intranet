# LobbyPMS Integration - Use Cases & Prozesse

## Übersicht

Dieses Dokument beschreibt alle implementierten Use Cases, Prozesse und Rollen im System für die LobbyPMS-Integration.

---

## 🎯 Haupt-Use Cases

### 1. Automatischer Check-in-Einladungsversand (täglich 20:00 Uhr)

**Ziel**: Gäste mit Ankunft am nächsten Tag nach 22:00 Uhr erhalten automatisch eine Einladung zum Online-Check-in und einen Zahlungslink.

**Prozess**:
1. **Scheduler** (`ReservationScheduler`) prüft täglich um 20:00 Uhr
2. **ReservationNotificationService** wird ausgelöst
3. Für jede Organisation mit aktivierter LobbyPMS-Synchronisation:
   - **LobbyPmsService** holt Reservierungen für morgen mit Ankunft nach 22:00
   - Für jede Reservierung:
     - Synchronisiert Reservierung in lokale DB (erstellt Task automatisch)
     - Prüft ob bereits Einladung versendet wurde
     - **BoldPaymentService** erstellt Zahlungslink (Betrag aus LobbyPMS - aktuell Placeholder)
     - Erstellt Check-in-Link
     - Versendet E-Mail/WhatsApp (je nach Konfiguration)
     - Markiert als versendet (`invitationSentAt`)

**Rollen**:
- **System (Scheduler)**: Automatische Ausführung
- **ReservationNotificationService**: Orchestriert den Prozess
- **LobbyPmsService**: Holt Reservierungen
- **BoldPaymentService**: Erstellt Zahlungslink
- **WhatsAppService / EmailService**: Versendet Nachrichten

**Technische Details**:
- Endpoint: Automatisch via Scheduler (kein manueller Aufruf nötig)
- Cron: Täglich 20:00 Uhr
- Datei: `backend/src/services/reservationScheduler.ts`
- Datei: `backend/src/services/reservationNotificationService.ts`

---

### 2. Online-Check-in durch Gast

**Ziel**: Gast führt selbstständig den Check-in durch, bezahlt und erhält Zugangsinformationen.

**Prozess**:
1. **Gast** öffnet Check-in-Link (aus E-Mail/WhatsApp)
2. **Frontend** zeigt Check-in-Formular (`CheckInForm.tsx`)
3. Gast füllt Formular aus:
   - Persönliche Daten (falls nicht vorhanden)
   - SIRE-Daten (Nationalität, Passnummer, Geburtsdatum)
   - Bestätigt Zahlung
4. **Frontend** sendet `POST /api/lobby-pms/reservations/:id/check-in`
5. **Backend** (`lobbyPmsController.checkInReservation`):
   - Validiert Daten
   - Aktualisiert Reservierung in lokaler DB
   - Aktualisiert Status in LobbyPMS
   - **SIRE-Registrierung** (automatisch, wenn aktiviert):
     - **SireService** registriert Gast bei SIRE
     - Speichert Registrierungs-ID
   - **TTLock Passcode** (automatisch, wenn konfiguriert):
     - **TTLockService** erstellt temporären Passcode
     - Speichert PIN in Reservierung
   - **Task-Update**:
     - **ReservationTaskService** aktualisiert Task-Status
     - Erfasst WorkTime für Mitarbeiter (falls manuell durchgeführt)
   - **Check-in-Bestätigung**:
     - **ReservationNotificationService** versendet E-Mail/WhatsApp mit:
       - Zimmernummer
       - Zimmerbeschreibung
       - Tür-PIN
       - App-Name (TTLock)

**Rollen**:
- **Gast**: Führt Check-in durch
- **System**: Verarbeitet Check-in, registriert bei SIRE, erstellt PIN
- **ReservationTaskService**: Aktualisiert Task
- **SireService**: Registriert bei SIRE
- **TTLockService**: Erstellt Passcode
- **ReservationNotificationService**: Versendet Bestätigung

**Technische Details**:
- Endpoint: `PUT /api/lobby-pms/reservations/:id/check-in`
- Datei: `backend/src/controllers/lobbyPmsController.ts`
- Datei: `frontend/src/components/reservations/CheckInForm.tsx`

---

### 3. Manueller Check-in durch Mitarbeiter

**Ziel**: Mitarbeiter führt Check-in für Gast durch (z.B. bei Ankunft vor 22:00 Uhr).

**Prozess**:
1. **Mitarbeiter** öffnet Reservierungsdetails im Frontend
2. Klickt auf "Check-in durchführen"
3. **Frontend** sendet `PUT /api/lobby-pms/reservations/:id/check-in` mit `userId`
4. **Backend** (`lobbyPmsController.checkInReservation`):
   - Gleicher Prozess wie Online-Check-in
   - **Zusätzlich**: Erfasst WorkTime für Mitarbeiter
   - **ReservationTaskService**:
     - Findet Task zur Reservierung
     - Aktualisiert Status auf "in_progress" oder "completed"
     - Erfasst Zeit für Mitarbeiter

**Rollen**:
- **Mitarbeiter (Rezeption)**: Führt Check-in durch
- **System**: Verarbeitet Check-in, erfasst Zeit
- **ReservationTaskService**: Aktualisiert Task und WorkTime

**Technische Details**:
- Endpoint: `PUT /api/lobby-pms/reservations/:id/check-in`
- Datei: `backend/src/services/reservationTaskService.ts`

---

### 4. Automatische Task-Erstellung

**Ziel**: Jede Reservierung erhält automatisch einen Task für den Mitarbeiter.

**Prozess**:
1. **LobbyPmsService.syncReservation** wird aufgerufen (bei Synchronisation)
2. **TaskAutomationService.createReservationTask** wird automatisch aufgerufen
3. Task wird erstellt:
   - Titel: "Check-in: {guestName} - {checkInDate}"
   - Beschreibung: Reservierungsdetails
   - Status: "open"
   - Due Date: Check-in-Datum
   - Zuständige Rolle: "Rezeption" (konfigurierbar)
   - Verknüpft mit Reservierung (`reservationId`)

**Rollen**:
- **System**: Erstellt Task automatisch
- **TaskAutomationService**: Erstellt Task
- **Mitarbeiter**: Erhält Task in Task-Liste

**Technische Details**:
- Datei: `backend/src/services/taskAutomationService.ts`
- Wird automatisch bei `syncReservation` aufgerufen

---

### 5. Zahlungslink-Generierung (Bold Payment)

**Ziel**: Automatische Erstellung von Zahlungslinks für Reservierungen.

**Prozess**:
1. **BoldPaymentService.createPaymentLink** wird aufgerufen
2. Service lädt Settings aus Organisation (lazy loading)
3. Erstellt Request an Bold Payment "API Link de pagos":
   - URL: `https://integrations.api.bold.co/online/link/v1`
   - Authentifizierung: `Authorization: x-api-key <llave_de_identidad>`
   - Payload:
     ```json
     {
       "amount_type": "CLOSE",
       "amount": {
         "currency": "COP",
         "total_amount": 100000,
         "subtotal": 100000,
         "taxes": [],
         "tip_amount": 0
       },
       "reference": "RES-1-1234567890",
       "description": "Reservierung Test Gast",
       "callback_url": "https://..."
     }
     ```
4. Speichert Payment Link in Reservierung (`paymentLink`)
5. Gibt URL zurück (wird in E-Mail/WhatsApp eingefügt)

**Rollen**:
- **BoldPaymentService**: Erstellt Zahlungslink
- **Bold Payment API**: Generiert Link
- **Gast**: Erhält Link per E-Mail/WhatsApp

**Technische Details**:
- Datei: `backend/src/services/boldPaymentService.ts`
- API: Bold Payment "API Link de pagos"
- Authentifizierung: `x-api-key` Header

**Wichtig**: 
- Betrag kommt aktuell aus Placeholder (100.000 COP)
- TODO: Betrag aus LobbyPMS-Reservierung extrahieren (sobald API-Dokumentation verfügbar)

---

### 6. WhatsApp-Versand

**Ziel**: Versand von WhatsApp-Nachrichten an Gäste.

**Prozess**:
1. **WhatsAppService** wird initialisiert mit `organizationId`
2. Service lädt Settings (lazy loading):
   - Provider: `twilio` oder `whatsapp-business-api`
   - API Key, API Secret, Phone Number ID
3. **sendMessage** wird aufgerufen:
   - Normalisiert Telefonnummer (fügt + hinzu)
   - Je nach Provider:
     - **Twilio**: 
       - URL: `https://api.twilio.com/2010-04-01/Accounts/{accountSid}/Messages.json`
       - Auth: Basic Auth (API Key = Account SID, API Secret = Auth Token)
     - **WhatsApp Business API**:
       - URL: `https://graph.facebook.com/v18.0/{phoneNumberId}/messages`
       - Auth: Bearer Token (API Key)
4. Nachricht wird versendet
5. Erfolg/Fehler wird zurückgegeben

**Spezielle Methoden**:
- **sendCheckInInvitation**: Versendet Check-in-Einladung mit Links
- **sendCheckInConfirmation**: Versendet Check-in-Bestätigung mit PIN

**Rollen**:
- **WhatsAppService**: Versendet Nachrichten
- **Twilio / WhatsApp Business API**: Verarbeitet Nachrichten
- **Gast**: Erhält Nachricht

**Technische Details**:
- Datei: `backend/src/services/whatsappService.ts`
- Unterstützt: Twilio und WhatsApp Business API
- Templates: Optional (für WhatsApp Business API)

---

### 7. SIRE-Registrierung (automatisch beim Check-in)

**Ziel**: Automatische Registrierung von Gästen bei SIRE (Kolumbien Migration).

**Prozess**:
1. **SireService.registerGuest** wird automatisch beim Check-in aufgerufen
2. Service validiert erforderliche Daten:
   - Name, Nationalität, Passnummer, Geburtsdatum
   - Ankunftsdatum, Abreisedatum, Zimmernummer
3. Erstellt SIRE-Registrierungsanfrage
4. Sendet an SIRE API
5. Speichert Registrierungs-ID in Reservierung
6. Aktualisiert Status (`sireRegistered`, `sireRegisteredAt`)

**Fehlerbehandlung**:
- Bei Fehler: Speichert Fehlermeldung (`sireRegistrationError`)
- Check-in wird **nicht** blockiert (nur protokolliert)

**Rollen**:
- **SireService**: Registriert Gast
- **SIRE API**: Verarbeitet Registrierung
- **System**: Speichert Status

**Technische Details**:
- Datei: `backend/src/services/sireService.ts`
- Wird automatisch bei Check-in aufgerufen (wenn aktiviert)
- Konfiguration: `organization.settings.sire.autoRegisterOnCheckIn`

---

### 8. TTLock Passcode-Generierung

**Ziel**: Automatische Erstellung von temporären Passcodes für Türsystem.

**Prozess**:
1. **TTLockService.createTemporaryPasscode** wird beim Check-in aufgerufen
2. Service authentifiziert bei TTLock (OAuth 2.0):
   - Client ID, Client Secret aus Settings
   - Erhält Access Token (wird automatisch erneuert)
3. Erstellt temporären Passcode:
   - Start: Check-in-Datum
   - Ende: Check-out-Datum
   - Beschreibung: "Guest: {guestName}"
4. Speichert Passcode in Reservierung (`doorPin`, `ttlLockPassword`)
5. Bei Check-out: Passcode wird gelöscht

**Rollen**:
- **TTLockService**: Erstellt Passcode
- **TTLock API**: Verarbeitet Passcode
- **Gast**: Erhält PIN per E-Mail/WhatsApp

**Technische Details**:
- Datei: `backend/src/services/ttlockService.ts`
- API: `https://open.ttlock.com`
- Authentifizierung: OAuth 2.0
- Passcode wird automatisch bei Check-in erstellt

---

### 9. Reservierungs-Synchronisation (LobbyPMS → Intranet)

**Ziel**: Synchronisation von Reservierungen aus LobbyPMS in lokale DB.

**Prozess**:
1. **LobbyPmsService.fetchReservations** holt Reservierungen von LobbyPMS
2. Für jede Reservierung:
   - **syncReservation** wird aufgerufen
   - Prüft ob Reservierung bereits existiert (`lobbyReservationId`)
   - Erstellt oder aktualisiert Reservierung in lokaler DB
   - Erstellt Task automatisch (wenn nicht vorhanden)
   - Speichert Sync-Historie (`ReservationSyncHistory`)

**Manuelle Synchronisation**:
- Endpoint: `POST /api/lobby-pms/sync`
- Frontend: Button "Synchronisieren" in Reservierungsliste

**Automatische Synchronisation**:
- TODO: Stündlich via Scheduler (noch nicht implementiert)

**Rollen**:
- **LobbyPmsService**: Synchronisiert Reservierungen
- **LobbyPMS API**: Liefert Reservierungen
- **System**: Speichert in lokaler DB

**Technische Details**:
- Datei: `backend/src/services/lobbyPmsService.ts`
- Endpoint: `POST /api/lobby-pms/sync`
- Erstellt automatisch Tasks via `TaskAutomationService`

---

### 10. Payment-Status-Update (Webhook)

**Ziel**: Automatische Aktualisierung des Zahlungsstatus bei Zahlung.

**Prozess**:
1. **Gast** zahlt über Bold Payment Link
2. **Bold Payment** sendet Webhook an `POST /api/bold-payment/webhook`
3. **BoldPaymentService.handleWebhook** verarbeitet Webhook:
   - Findet Reservierung basierend auf `reference` oder `metadata`
   - Aktualisiert `paymentStatus` (pending → paid)
   - Optional: Sendet Bestätigung

**Rollen**:
- **Bold Payment**: Sendet Webhook
- **BoldPaymentService**: Verarbeitet Webhook
- **System**: Aktualisiert Status

**Technische Details**:
- Endpoint: `POST /api/bold-payment/webhook`
- Datei: `backend/src/services/boldPaymentService.ts`
- Webhook-URL: Konfigurierbar in `callback_url` beim Erstellen des Links

---

## 🔄 Komplette Prozess-Flows

### Flow 1: Späte Check-in-Einladung (täglich 20:00 Uhr)

```
1. ReservationScheduler (20:00 Uhr)
   ↓
2. ReservationNotificationService.sendLateCheckInInvitations()
   ↓
3. Für jede Organisation:
   ↓
4. LobbyPmsService.fetchTomorrowReservations()
   ↓
5. Für jede Reservierung (Ankunft > 22:00):
   ↓
6. syncReservation() → Erstellt Task automatisch
   ↓
7. BoldPaymentService.createPaymentLink()
   ↓
8. WhatsAppService.sendCheckInInvitation() ODER EmailService
   ↓
9. Markiere invitationSentAt = jetzt
```

### Flow 2: Online-Check-in durch Gast

```
1. Gast öffnet Check-in-Link (aus E-Mail/WhatsApp)
   ↓
2. Frontend: CheckInForm.tsx
   ↓
3. Gast füllt Formular aus
   ↓
4. POST /api/lobby-pms/reservations/:id/check-in
   ↓
5. Backend: lobbyPmsController.checkInReservation()
   ↓
6. Parallele Prozesse:
   ├─→ SireService.registerGuest() (wenn aktiviert)
   ├─→ TTLockService.createTemporaryPasscode() (wenn konfiguriert)
   ├─→ ReservationTaskService.updateTaskOnCheckIn()
   └─→ LobbyPmsService.updateReservationStatus()
   ↓
7. ReservationNotificationService.sendCheckInConfirmation()
   ↓
8. Gast erhält E-Mail/WhatsApp mit PIN und Zimmerinfo
```

### Flow 3: Manueller Check-in durch Mitarbeiter

```
1. Mitarbeiter öffnet Reservierungsdetails
   ↓
2. Klickt "Check-in durchführen"
   ↓
3. PUT /api/lobby-pms/reservations/:id/check-in (mit userId)
   ↓
4. Backend: lobbyPmsController.checkInReservation()
   ↓
5. Gleiche Prozesse wie Online-Check-in
   ↓
6. ZUSÄTZLICH: ReservationTaskService.updateTaskOnCheckIn()
   - Erfasst WorkTime für Mitarbeiter
   - Aktualisiert Task-Status
```

---

## 👥 Rollen und Verantwortlichkeiten

### System (Automatisch)
- **ReservationScheduler**: Führt täglich um 20:00 Uhr Check-in-Einladungen aus
- **LobbyPmsService**: Synchronisiert Reservierungen
- **BoldPaymentService**: Erstellt Zahlungslinks
- **WhatsAppService / EmailService**: Versendet Nachrichten
- **SireService**: Registriert Gäste bei SIRE
- **TTLockService**: Erstellt Passcodes
- **TaskAutomationService**: Erstellt Tasks automatisch

### Gast
- Erhält Check-in-Einladung per E-Mail/WhatsApp
- Führt Online-Check-in durch
- Bezahlt über Bold Payment Link
- Erhält Check-in-Bestätigung mit PIN und Zimmerinfo

### Mitarbeiter (Rezeption)
- Sieht Tasks für anstehende Check-ins
- Führt manuelle Check-ins durch
- WorkTime wird automatisch erfasst
- Sieht Reservierungsdetails im Frontend

### Administrator
- Konfiguriert API-Keys im Frontend (API Configuration Tab)
- Aktiviert/deaktiviert Features (LobbyPMS, WhatsApp, Bold Payment, SIRE, TTLock)
- Sieht Audit-Logs für API-Änderungen

---

## 🔧 Technische Komponenten

### Backend Services

1. **LobbyPmsService** (`backend/src/services/lobbyPmsService.ts`)
   - Synchronisiert Reservierungen
   - Holt Reservierungen von LobbyPMS
   - Aktualisiert Status in LobbyPMS

2. **BoldPaymentService** (`backend/src/services/boldPaymentService.ts`)
   - Erstellt Zahlungslinks
   - Verarbeitet Webhooks
   - Prüft Zahlungsstatus

3. **WhatsAppService** (`backend/src/services/whatsappService.ts`)
   - Versendet WhatsApp-Nachrichten
   - Unterstützt Twilio und WhatsApp Business API
   - Template-basierte Nachrichten

4. **SireService** (`backend/src/services/sireService.ts`)
   - Registriert Gäste bei SIRE
   - Aktualisiert Registrierungen
   - Prüft Status

5. **TTLockService** (`backend/src/services/ttlockService.ts`)
   - Erstellt temporäre Passcodes
   - Verwaltet Locks
   - OAuth 2.0 Authentifizierung

6. **ReservationNotificationService** (`backend/src/services/reservationNotificationService.ts`)
   - Orchestriert Benachrichtigungen
   - Sendet Check-in-Einladungen
   - Sendet Check-in-Bestätigungen

7. **ReservationTaskService** (`backend/src/services/reservationTaskService.ts`)
   - Aktualisiert Tasks bei Check-in
   - Erfasst WorkTime
   - Synchronisiert Task-Status

8. **ReservationScheduler** (`backend/src/services/reservationScheduler.ts`)
   - Führt täglich Check-in-Einladungen aus
   - Prüft alle 10 Minuten ob 20:00 Uhr

### Frontend Komponenten

1. **ApiConfigurationTab** (`frontend/src/components/organization/ApiConfigurationTab.tsx`)
   - Konfiguriert API-Keys für alle Services
   - Nur für Organisationen mit Land = 'CO'

2. **ReservationsPage** (`frontend/src/pages/ReservationsPage.tsx`)
   - Liste aller Reservierungen
   - Filter, Suche, Synchronisation

3. **CheckInForm** (`frontend/src/components/reservations/CheckInForm.tsx`)
   - Formular für Online-Check-in
   - Eingabe von SIRE-Daten

---

## 📊 Datenfluss

### Reservierungsdaten
```
LobbyPMS API
   ↓
LobbyPmsService
   ↓
Lokale DB (Reservation)
   ↓
Frontend (ReservationsPage)
```

### Zahlungslinks
```
BoldPaymentService
   ↓
Bold Payment API
   ↓
Payment Link URL
   ↓
E-Mail/WhatsApp
   ↓
Gast
```

### WhatsApp-Nachrichten
```
ReservationNotificationService
   ↓
WhatsAppService
   ↓
Twilio / WhatsApp Business API
   ↓
Gast (WhatsApp)
```

### SIRE-Registrierung
```
Check-in (Frontend/Backend)
   ↓
SireService
   ↓
SIRE API
   ↓
Reservation (sireRegistered = true)
```

### TTLock Passcodes
```
Check-in (Frontend/Backend)
   ↓
TTLockService
   ↓
TTLock API
   ↓
Reservation (doorPin)
   ↓
E-Mail/WhatsApp
```

---

## ⚙️ Konfiguration

### Organisation Settings (JSON)

```typescript
{
  lobbyPms: {
    apiUrl: string;
    apiKey: string;
    propertyId: string;
    syncEnabled: boolean;
    lateCheckInThreshold: "22:00";
    notificationChannels: ["email", "whatsapp"];
  },
  whatsapp: {
    provider: "twilio" | "whatsapp-business-api";
    apiKey: string;
    apiSecret: string;
    phoneNumberId: string;
  },
  boldPayment: {
    apiKey: string; // Llave secreta
    merchantId: string; // Llave de identidad
    environment: "sandbox" | "production";
  },
  doorSystem: {
    provider: "ttlock";
    clientId: string;
    clientSecret: string;
    lockIds: string[];
  },
  sire: {
    apiUrl: string;
    apiKey: string;
    enabled: boolean;
    autoRegisterOnCheckIn: boolean;
  }
}
```

### Verschlüsselung

- Alle API-Keys werden mit AES-256-GCM verschlüsselt
- Verschlüsselung: `backend/src/utils/encryption.ts`
- Keys werden nur beim Laden entschlüsselt (lazy loading)

---

## 🔐 Sicherheit

1. **API-Keys**: Verschlüsselt in DB gespeichert
2. **URL-Validierung**: Whitelist-basierte Validierung
3. **Audit-Logs**: Alle API-Änderungen werden protokolliert
4. **Berechtigungen**: Nur Administratoren können API-Keys ändern
5. **Webhooks**: Signatur-Validierung (TODO)

---

## 📝 Offene Punkte / TODOs

1. **Betrag aus LobbyPMS**: Aktuell Placeholder (100.000 COP)
   - Muss aus LobbyPMS API Response extrahiert werden
   - Wartet auf API-Dokumentation

2. **Automatische Synchronisation**: Stündlich via Scheduler
   - TODO: Implementieren in `ReservationScheduler`

3. **Webhook-Signatur-Validierung**: Bold Payment Webhooks
   - TODO: Implementieren Signatur-Validierung

4. **LobbyPMS API Endpoints**: Korrekte Pfade
   - Wartet auf API-Dokumentation

---

## 🎯 Zusammenfassung

Das System automatisiert den kompletten Check-in-Prozess:

1. **Automatisch** (täglich 20:00 Uhr):
   - Reservierungen für morgen werden identifiziert
   - Zahlungslinks werden erstellt
   - Einladungen werden per E-Mail/WhatsApp versendet

2. **Beim Check-in** (Online oder manuell):
   - SIRE-Registrierung (automatisch)
   - TTLock Passcode (automatisch)
   - Task-Update (automatisch)
   - Bestätigung per E-Mail/WhatsApp (automatisch)

3. **Bei Zahlung**:
   - Webhook aktualisiert Status (automatisch)

**Alle Prozesse sind vollständig automatisiert** - Mitarbeiter müssen nur noch manuelle Check-ins durchführen, wenn nötig.


