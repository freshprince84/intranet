# LobbyPMS Integration - Wo im System sehen/nachvollziehen/verändern?

## Übersicht

Dieses Dokument zeigt dir für jeden Use Case, wo du ihn im System sehen, nachvollziehen und verändern kannst.

---

## 🎯 Use Case 1: Automatischer Check-in-Einladungsversand (täglich 20:00 Uhr)

### 👁️ **SEHEN im System:**

**Frontend:**
- **Reservierungen-Liste**: `/reservations`
  - Siehst alle Reservierungen mit Status
  - Feld `invitationSentAt` zeigt, wann Einladung versendet wurde
  - Datei: `frontend/src/pages/ReservationsPage.tsx`
  - Komponente: `frontend/src/components/reservations/ReservationList.tsx`

**Backend-Logs:**
- Server-Logs zeigen täglich um 20:00 Uhr:
  - `[ReservationScheduler] Starte tägliche Check-in-Einladungen...`
  - `[ReservationNotification] Gefunden: X Reservierungen`
  - `[ReservationNotification] Einladung versendet für Reservierung X`

**Datenbank:**
- Tabelle `Reservation`:
  - Feld `invitationSentAt` (TIMESTAMP) - zeigt wann versendet
  - Feld `paymentLink` (TEXT) - enthält den generierten Zahlungslink

### 🔍 **NACHVOLLZIEHEN:**

**Backend-Code:**
- **Scheduler**: `backend/src/services/reservationScheduler.ts`
  - Zeile 18-42: `start()` Methode - prüft alle 10 Minuten ob 20:00 Uhr
  - Zeile 59-68: `triggerManually()` - für manuelle Tests
  
- **Notification Service**: `backend/src/services/reservationNotificationService.ts`
  - Zeile 23-125: `sendLateCheckInInvitations()` - Hauptlogik
  - Zeile 69-78: Bold Payment Link-Erstellung
  - Zeile 84-100: E-Mail/WhatsApp-Versand

**API-Endpunkte:**
- Kein direkter Endpoint (läuft automatisch)
- Manueller Test: Script `backend/scripts/test-all-integrations.ts`

### ⚙️ **VERÄNDERN/KONFIGURIEREN:**

**Frontend (API-Konfiguration):**
- **Organisation bearbeiten** → Tab "API" (nur für CO)
  - Route: `/organizations` → Organisation klicken → "Bearbeiten"
  - Datei: `frontend/src/components/organization/ApiConfigurationTab.tsx`
  - Konfigurierbar:
    - **LobbyPMS**: API URL, API Key, Property ID
    - **WhatsApp**: Provider, API Key, API Secret, Phone Number ID
    - **Bold Payment**: API Key (Llave secreta), Merchant ID (Llave de identidad), Environment
    - **SIRE**: API URL, API Key, Auto-Registrierung
    - **TTLock**: Client ID, Client Secret, Lock IDs

**Backend (Settings):**
- Organisation Settings JSON-Struktur:
  - `organization.settings.lobbyPms.lateCheckInThreshold` - z.B. "22:00"
  - `organization.settings.lobbyPms.notificationChannels` - ["email", "whatsapp"]
  - `organization.settings.lobbyPms.syncEnabled` - true/false

**Backend (Code-Änderungen):**
- **Zeitpunkt ändern**: `backend/src/services/reservationScheduler.ts`
  - Zeile 31: `if (currentHour === 20` - ändere auf andere Stunde
- **Betrag ändern**: `backend/src/services/reservationNotificationService.ts`
  - Zeile 72: `const amount = 100000;` - aktuell Placeholder
  - TODO: Betrag aus LobbyPMS extrahieren

---

## 🎯 Use Case 2: Online-Check-in durch Gast

### 👁️ **SEHEN im System:**

**Frontend (für Gast):**
- **Check-in-Formular**: `/check-in/:id`
  - Öffentliche Route (kein Login nötig)
  - Datei: `frontend/src/components/reservations/CheckInForm.tsx`
  - Zeigt Formular mit:
    - Persönliche Daten
    - SIRE-Daten (Nationalität, Passnummer, Geburtsdatum)
    - Zahlungsbestätigung

**Frontend (für Mitarbeiter):**
- **Reservierungsdetails**: `/reservations/:id`
  - Route: `/reservations` → Reservierung klicken
  - Datei: `frontend/src/components/reservations/ReservationDetails.tsx`
  - Zeigt:
    - Check-in-Status (`onlineCheckInCompleted`)
    - SIRE-Registrierungsstatus (`sireRegistered`)
    - TTLock PIN (`doorPin`)
    - Zahlungsstatus (`paymentStatus`)

**Datenbank:**
- Tabelle `Reservation`:
  - `status` = 'checked_in'
  - `onlineCheckInCompleted` = true
  - `onlineCheckInCompletedAt` = TIMESTAMP
  - `sireRegistered` = true
  - `sireRegistrationId` = STRING
  - `doorPin` = STRING
  - `paymentStatus` = 'paid'

### 🔍 **NACHVOLLZIEHEN:**

**Frontend-Code:**
- **Check-in-Formular**: `frontend/src/components/reservations/CheckInForm.tsx`
  - Zeile 1-319: Komplettes Formular
  - Zeile 150-200: Submit-Handler

**Backend-Code:**
- **Controller**: `backend/src/controllers/lobbyPmsController.ts`
  - Zeile 200-350: `checkInReservation()` - Hauptlogik
  - Zeile 250-280: SIRE-Registrierung
  - Zeile 280-300: TTLock Passcode
  - Zeile 300-320: Task-Update
  - Zeile 320-340: Check-in-Bestätigung

**API-Endpunkt:**
- `PUT /api/lobby-pms/reservations/:id/check-in`
- Datei: `backend/src/routes/lobbyPms.ts`

### ⚙️ **VERÄNDERN/KONFIGURIEREN:**

**Frontend (Formular anpassen):**
- **Check-in-Formular**: `frontend/src/components/reservations/CheckInForm.tsx`
  - Felder hinzufügen/entfernen
  - Validierung anpassen
  - Layout ändern

**Backend (SIRE-Registrierung):**
- **Auto-Registrierung aktivieren/deaktivieren**:
  - Frontend: Organisation → API Tab → SIRE → "Auto-Registrierung beim Check-in"
  - Backend: `organization.settings.sire.autoRegisterOnCheckIn` = true/false

**Backend (TTLock Passcode):**
- **Lock-IDs konfigurieren**:
  - Frontend: Organisation → API Tab → TTLock → Lock IDs
  - Backend: `organization.settings.doorSystem.lockIds` = ["lock1", "lock2"]

**Backend (Code-Änderungen):**
- **Check-in-Logik anpassen**: `backend/src/controllers/lobbyPmsController.ts`
  - Zeile 200-350: `checkInReservation()` Methode

---

## 🎯 Use Case 3: Manueller Check-in durch Mitarbeiter

### 👁️ **SEHEN im System:**

**Frontend:**
- **Reservierungsdetails**: `/reservations/:id`
  - Route: `/reservations` → Reservierung klicken
  - Datei: `frontend/src/components/reservations/ReservationDetails.tsx`
  - Button: "Check-in durchführen" (wenn Status = 'confirmed')
  - Zeigt nach Check-in:
    - Status = 'checked_in'
    - WorkTime für Mitarbeiter (falls erfasst)

**Tasks:**
- **Task-Liste**: `/tasks` (falls Task-System vorhanden)
  - Task mit Titel "Check-in: {guestName} - {checkInDate}"
  - Status ändert sich: open → in_progress → done
  - Verknüpft mit Reservierung (`reservationId`)

**Datenbank:**
- Tabelle `Task`:
  - `reservationId` = INT (verknüpft mit Reservation)
  - `status` = 'in_progress' oder 'done'
  - `responsibleId` = INT (Mitarbeiter-ID)

### 🔍 **NACHVOLLZIEHEN:**

**Frontend-Code:**
- **Reservierungsdetails**: `frontend/src/components/reservations/ReservationDetails.tsx`
  - Zeile 200-250: Check-in-Button und Handler

**Backend-Code:**
- **Controller**: `backend/src/controllers/lobbyPmsController.ts`
  - Zeile 200-350: `checkInReservation()` - gleiche Logik wie Online-Check-in
  - Zeile 300-320: Task-Update mit `userId`
  
- **Task Service**: `backend/src/services/reservationTaskService.ts`
  - Zeile 19-75: `updateTaskOnCheckIn()` - aktualisiert Task-Status
  - Zeile 46-48: WorkTime-Erfassung (TODO)

**API-Endpunkt:**
- `PUT /api/lobby-pms/reservations/:id/check-in` (mit `userId` im Body)

### ⚙️ **VERÄNDERN/KONFIGURIEREN:**

**Frontend (Button/UI):**
- **Reservierungsdetails**: `frontend/src/components/reservations/ReservationDetails.tsx`
  - Check-in-Button anpassen
  - WorkTime-Anzeige hinzufügen

**Backend (WorkTime-Erfassung):**
- **Task Service**: `backend/src/services/reservationTaskService.ts`
  - Zeile 46-48: TODO - WorkTime-Erfassung implementieren
  - Zeile 115-118: TODO - WorkTime-Ende implementieren

---

## 🎯 Use Case 4: Automatische Task-Erstellung

### 👁️ **SEHEN im System:**

**Frontend:**
- **Task-Liste**: `/tasks` (falls Task-System vorhanden)
  - Tasks mit Titel "Check-in: {guestName} - {checkInDate}"
  - Status: "open"
  - Due Date: Check-in-Datum
  - Verknüpft mit Reservierung

**Datenbank:**
- Tabelle `Task`:
  - `reservationId` = INT (verknüpft mit Reservation)
  - `title` = "Check-in: {guestName} - {checkInDate}"
  - `status` = 'open'
  - `dueDate` = Check-in-Datum

### 🔍 **NACHVOLLZIEHEN:**

**Backend-Code:**
- **LobbyPMS Service**: `backend/src/services/lobbyPmsService.ts`
  - `syncReservation()` - ruft automatisch Task-Erstellung auf
  
- **Task Automation Service**: `backend/src/services/taskAutomationService.ts`
  - `createReservationTask()` - erstellt Task für Reservierung

**Wann wird aufgerufen:**
- Bei `syncReservation()` (automatisch)
- Bei manueller Synchronisation
- Bei Check-in-Einladungsversand

### ⚙️ **VERÄNDERN/KONFIGURIEREN:**

**Backend (Task-Erstellung):**
- **Task Automation Service**: `backend/src/services/taskAutomationService.ts`
  - `createReservationTask()` - Task-Titel, Beschreibung, Zuständigkeit anpassen

**Backend (Auto-Erstellung aktivieren/deaktivieren):**
- Organisation Settings:
  - `organization.settings.lobbyPms.autoCreateTasks` = true/false

---

## 🎯 Use Case 5: Zahlungslink-Generierung (Bold Payment)

### 👁️ **SEHEN im System:**

**Frontend:**
- **Reservierungsdetails**: `/reservations/:id`
  - Zeigt `paymentLink` (URL)
  - Zeigt `paymentStatus` (pending/paid)

**Datenbank:**
- Tabelle `Reservation`:
  - `paymentLink` = TEXT (URL zum Zahlungslink)
  - `paymentStatus` = 'pending' | 'paid' | 'partially_paid' | 'refunded'

**E-Mail/WhatsApp:**
- Gast erhält Zahlungslink in Einladung
- Link führt zu Bold Payment Checkout

### 🔍 **NACHVOLLZIEHEN:**

**Backend-Code:**
- **Bold Payment Service**: `backend/src/services/boldPaymentService.ts`
  - Zeile 157-246: `createPaymentLink()` - Hauptlogik
  - Zeile 183-196: Payload-Erstellung
  - Zeile 198-208: API-Request an Bold Payment
  - Zeile 211-224: Response-Verarbeitung

**API-Endpunkt:**
- Wird intern aufgerufen (nicht direkt)
- Bold Payment API: `https://integrations.api.bold.co/online/link/v1`

**Logs:**
- `[Bold Payment] POST /online/link/v1`
- `[Bold Payment] Payment-Link erfolgreich erstellt`

### ⚙️ **VERÄNDERN/KONFIGURIEREN:**

**Frontend (API-Konfiguration):**
- **Organisation → API Tab → Bold Payment**:
  - API Key (Llave secreta)
  - Merchant ID (Llave de identidad)
  - Environment (sandbox/production)
  - Datei: `frontend/src/components/organization/ApiConfigurationTab.tsx`

**Backend (Betrag):**
- **Notification Service**: `backend/src/services/reservationNotificationService.ts`
  - Zeile 72: `const amount = 100000;` - aktuell Placeholder
  - TODO: Betrag aus LobbyPMS extrahieren

**Backend (Payload anpassen):**
- **Bold Payment Service**: `backend/src/services/boldPaymentService.ts`
  - Zeile 183-196: Payload-Struktur anpassen
  - Zeile 194: `callback_url` anpassen

---

## 🎯 Use Case 6: WhatsApp-Versand

### 👁️ **SEHEN im System:**

**Frontend:**
- **Reservierungsdetails**: `/reservations/:id`
  - Zeigt ob WhatsApp versendet wurde
  - Zeigt `invitationSentAt` (wann versendet)

**Datenbank:**
- Tabelle `Reservation`:
  - `invitationSentAt` = TIMESTAMP (wann versendet)

**WhatsApp:**
- Gast erhält Nachricht auf WhatsApp
- Mit Check-in-Link und Zahlungslink

### 🔍 **NACHVOLLZIEHEN:**

**Backend-Code:**
- **WhatsApp Service**: `backend/src/services/whatsappService.ts`
  - Zeile 94-116: `sendMessage()` - Hauptlogik
  - Zeile 121-154: `sendViaTwilio()` - Twilio-Implementierung
  - Zeile 159-194: `sendViaWhatsAppBusiness()` - WhatsApp Business API
  - Zeile 220-240: `sendCheckInInvitation()` - Check-in-Einladung
  - Zeile 253-276: `sendCheckInConfirmation()` - Check-in-Bestätigung

**Notification Service:**
- `backend/src/services/reservationNotificationService.ts`
  - Zeile 92-100: WhatsApp-Versand bei Check-in-Einladung
  - Zeile 195-205: WhatsApp-Versand bei Check-in-Bestätigung

**API-Endpunkte:**
- Twilio: `https://api.twilio.com/2010-04-01/Accounts/{accountSid}/Messages.json`
- WhatsApp Business: `https://graph.facebook.com/v18.0/{phoneNumberId}/messages`

### ⚙️ **VERÄNDERN/KONFIGURIEREN:**

**Frontend (API-Konfiguration):**
- **Organisation → API Tab → WhatsApp**:
  - Provider (Twilio / WhatsApp Business API)
  - API Key
  - API Secret
  - Phone Number ID
  - Datei: `frontend/src/components/organization/ApiConfigurationTab.tsx`

**Backend (Nachrichten anpassen):**
- **WhatsApp Service**: `backend/src/services/whatsappService.ts`
  - Zeile 226-238: Check-in-Einladung Text anpassen
  - Zeile 261-274: Check-in-Bestätigung Text anpassen

**Backend (Provider wechseln):**
- Organisation Settings:
  - `organization.settings.whatsapp.provider` = "twilio" | "whatsapp-business-api"

---

## 🎯 Use Case 7: SIRE-Registrierung (automatisch beim Check-in)

### 👁️ **SEHEN im System:**

**Frontend:**
- **Reservierungsdetails**: `/reservations/:id`
  - Zeigt `sireRegistered` (true/false)
  - Zeigt `sireRegistrationId` (ID der Registrierung)
  - Zeigt `sireRegisteredAt` (wann registriert)
  - Zeigt `sireRegistrationError` (Fehlermeldung falls Fehler)

**Datenbank:**
- Tabelle `Reservation`:
  - `sireRegistered` = BOOLEAN
  - `sireRegistrationId` = STRING
  - `sireRegisteredAt` = TIMESTAMP
  - `sireRegistrationError` = TEXT

### 🔍 **NACHVOLLZIEHEN:**

**Backend-Code:**
- **SIRE Service**: `backend/src/services/sireService.ts`
  - `registerGuest()` - Hauptlogik für Registrierung
  
- **Controller**: `backend/src/controllers/lobbyPmsController.ts`
  - Zeile 250-280: SIRE-Registrierung beim Check-in

**API-Endpunkt:**
- Wird intern aufgerufen (nicht direkt)
- SIRE API: Konfigurierbar in Settings

### ⚙️ **VERÄNDERN/KONFIGURIEREN:**

**Frontend (API-Konfiguration):**
- **Organisation → API Tab → SIRE**:
  - API URL
  - API Key
  - Auto-Registrierung beim Check-in (Checkbox)
  - Property Code
  - Datei: `frontend/src/components/organization/ApiConfigurationTab.tsx`

**Backend (Auto-Registrierung aktivieren/deaktivieren):**
- Organisation Settings:
  - `organization.settings.sire.autoRegisterOnCheckIn` = true/false
  - `organization.settings.sire.enabled` = true/false

**Backend (Code anpassen):**
- **SIRE Service**: `backend/src/services/sireService.ts`
  - `registerGuest()` - Registrierungslogik anpassen

---

## 🎯 Use Case 8: TTLock Passcode-Generierung

### 👁️ **SEHEN im System:**

**Frontend:**
- **Reservierungsdetails**: `/reservations/:id`
  - Zeigt `doorPin` (PIN für Türsystem)
  - Zeigt `doorAppName` (App-Name, z.B. "TTLock")
  - Zeigt `ttlLockId` (Lock ID)

**Datenbank:**
- Tabelle `Reservation`:
  - `doorPin` = STRING
  - `doorAppName` = STRING
  - `ttlLockId` = STRING
  - `ttlLockPassword` = STRING

**E-Mail/WhatsApp:**
- Gast erhält PIN in Check-in-Bestätigung

### 🔍 **NACHVOLLZIEHEN:**

**Backend-Code:**
- **TTLock Service**: `backend/src/services/ttlockService.ts`
  - `createTemporaryPasscode()` - erstellt Passcode
  - `getAccessToken()` - OAuth 2.0 Authentifizierung
  
- **Notification Service**: `backend/src/services/reservationNotificationService.ts`
  - Zeile 150-184: TTLock Passcode-Erstellung beim Check-in

**API-Endpunkt:**
- TTLock API: `https://open.ttlock.com`
- OAuth: `/oauth2/token`
- Passcode: `/v3/keyboardPwd/add`

### ⚙️ **VERÄNDERN/KONFIGURIEREN:**

**Frontend (API-Konfiguration):**
- **Organisation → API Tab → TTLock**:
  - Client ID
  - Client Secret
  - Lock IDs (Array)
  - Datei: `frontend/src/components/organization/ApiConfigurationTab.tsx`

**Backend (Code anpassen):**
- **TTLock Service**: `backend/src/services/ttlockService.ts`
  - `createTemporaryPasscode()` - Passcode-Parameter anpassen

---

## 🎯 Use Case 9: Reservierungs-Synchronisation (LobbyPMS → Intranet)

### 👁️ **SEHEN im System:**

**Frontend:**
- **Reservierungen-Liste**: `/reservations`
  - Button "Synchronisieren" (oben rechts)
  - Zeigt Sync-Status
  - Datei: `frontend/src/components/reservations/ReservationList.tsx`
  - Zeile 45-60: `handleSync()` Funktion

**Datenbank:**
- Tabelle `Reservation`:
  - `lobbyReservationId` = STRING (ID aus LobbyPMS)
  - `syncHistory` = Relation zu `ReservationSyncHistory`

- Tabelle `ReservationSyncHistory`:
  - `syncType` = 'created' | 'updated' | 'status_changed'
  - `syncData` = JSON (vollständige Daten)
  - `syncedAt` = TIMESTAMP

### 🔍 **NACHVOLLZIEHEN:**

**Frontend-Code:**
- **Reservierungsliste**: `frontend/src/components/reservations/ReservationList.tsx`
  - Zeile 45-60: `handleSync()` - manuelle Synchronisation

**Backend-Code:**
- **LobbyPMS Service**: `backend/src/services/lobbyPmsService.ts`
  - `fetchReservations()` - holt Reservierungen von LobbyPMS
  - `syncReservation()` - synchronisiert einzelne Reservierung
  
- **Controller**: `backend/src/controllers/lobbyPmsController.ts`
  - Zeile 148-200: `syncReservations()` - manuelle Synchronisation

**API-Endpunkt:**
- `POST /api/lobby-pms/sync`
- Datei: `backend/src/routes/lobbyPms.ts`

### ⚙️ **VERÄNDERN/KONFIGURIEREN:**

**Frontend (Synchronisation):**
- **Reservierungsliste**: `frontend/src/components/reservations/ReservationList.tsx`
  - Sync-Button anpassen
  - Sync-Status anzeigen

**Backend (Auto-Synchronisation):**
- **Scheduler**: `backend/src/services/reservationScheduler.ts`
  - TODO: Stündliche Synchronisation implementieren

**Backend (API-Konfiguration):**
- **Organisation → API Tab → LobbyPMS**:
  - API URL
  - API Key
  - Property ID
  - Sync aktiviert (Checkbox)
  - Datei: `frontend/src/components/organization/ApiConfigurationTab.tsx`

---

## 🎯 Use Case 10: Payment-Status-Update (Webhook)

### 👁️ **SEHEN im System:**

**Frontend:**
- **Reservierungsdetails**: `/reservations/:id`
  - Zeigt `paymentStatus` (pending → paid)
  - Aktualisiert sich automatisch nach Zahlung

**Datenbank:**
- Tabelle `Reservation`:
  - `paymentStatus` = 'pending' | 'paid' | 'partially_paid' | 'refunded'

**Backend-Logs:**
- `[Bold Payment Webhook] Event: payment.completed`
- `[Bold Payment Webhook] Reservierung X Status aktualisiert`

### 🔍 **NACHVOLLZIEHEN:**

**Backend-Code:**
- **Bold Payment Service**: `backend/src/services/boldPaymentService.ts`
  - Zeile 276-340: `handleWebhook()` - Webhook-Verarbeitung
  
- **Controller**: `backend/src/controllers/boldPaymentController.ts`
  - `handleWebhook()` - Webhook-Endpoint

**API-Endpunkt:**
- `POST /api/bold-payment/webhook`
- Datei: `backend/src/routes/boldPayment.ts`

### ⚙️ **VERÄNDERN/KONFIGURIEREN:**

**Backend (Webhook-URL):**
- **Bold Payment Service**: `backend/src/services/boldPaymentService.ts`
  - Zeile 194: `callback_url` - Webhook-URL anpassen
  - Muss öffentlich erreichbar sein (HTTPS)

**Backend (Webhook-Verarbeitung):**
- **Bold Payment Service**: `backend/src/services/boldPaymentService.ts`
  - Zeile 276-340: `handleWebhook()` - Logik anpassen

**Backend (Signatur-Validierung):**
- TODO: Implementieren Signatur-Validierung für Webhooks

---

## 📍 **Zentrale Konfiguration (Alle Use Cases)**

### **Frontend: API-Konfiguration**

**Route:**
- `/organizations` → Organisation klicken → "Bearbeiten" → Tab "API"

**Datei:**
- `frontend/src/components/organization/ApiConfigurationTab.tsx`

**Konfigurierbar:**
- LobbyPMS: API URL, API Key, Property ID, Sync aktiviert, Threshold, Channels
- WhatsApp: Provider, API Key, API Secret, Phone Number ID
- Bold Payment: API Key, Merchant ID, Environment
- SIRE: API URL, API Key, Auto-Registrierung, Property Code
- TTLock: Client ID, Client Secret, Lock IDs

**Berechtigungen:**
- Nur für Organisationen mit Land = 'CO' (Kolumbien)
- Nur Administratoren können ändern

---

## 🔍 **Backend-Logs (Alle Use Cases)**

**Server-Logs zeigen:**
- `[ReservationScheduler]` - Scheduler-Aktivitäten
- `[ReservationNotification]` - Benachrichtigungen
- `[Bold Payment]` - Zahlungslink-Erstellung
- `[WhatsApp]` - WhatsApp-Versand
- `[SIRE]` - SIRE-Registrierung
- `[TTLock]` - Passcode-Erstellung
- `[LobbyPMS]` - Synchronisation

**Logs finden:**
- Server-Console (wenn Server läuft)
- Log-Dateien (falls konfiguriert)

---

## 🗄️ **Datenbank (Alle Use Cases)**

**Haupttabellen:**
- `Reservation` - Alle Reservierungsdaten
- `Task` - Tasks für Check-ins
- `ReservationSyncHistory` - Sync-Historie
- `Organization` - Settings (JSON-Feld)

**Prisma Studio:**
- `npx prisma studio`
- Öffnet Browser-Interface für Datenbank
- Route: `http://localhost:5555`

---

## 📝 **Zusammenfassung: Schnellzugriff**

| Use Case | Frontend sehen | Backend Code | Konfiguration |
|----------|---------------|--------------|---------------|
| 1. Check-in-Einladung | `/reservations` | `reservationScheduler.ts`<br>`reservationNotificationService.ts` | Organisation → API Tab |
| 2. Online-Check-in | `/check-in/:id` | `lobbyPmsController.ts` | Organisation → API Tab |
| 3. Manueller Check-in | `/reservations/:id` | `lobbyPmsController.ts`<br>`reservationTaskService.ts` | - |
| 4. Task-Erstellung | `/tasks` | `taskAutomationService.ts` | Organisation → API Tab |
| 5. Zahlungslink | `/reservations/:id` | `boldPaymentService.ts` | Organisation → API Tab → Bold |
| 6. WhatsApp | `/reservations/:id` | `whatsappService.ts` | Organisation → API Tab → WhatsApp |
| 7. SIRE | `/reservations/:id` | `sireService.ts` | Organisation → API Tab → SIRE |
| 8. TTLock | `/reservations/:id` | `ttlockService.ts` | Organisation → API Tab → TTLock |
| 9. Synchronisation | `/reservations` (Button) | `lobbyPmsService.ts` | Organisation → API Tab → LobbyPMS |
| 10. Payment-Webhook | `/reservations/:id` | `boldPaymentService.ts` | Backend Code |


