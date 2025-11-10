# LobbyPMS Integration - Test & Konfiguration

## Übersicht

Dieses Dokument beschreibt die Schritte zur Konfiguration und zum Testen der LobbyPMS-Integration.

## Konfigurations-Checkliste

### 1. Datenbank-Migration
- [ ] Migration ausgeführt: `npx prisma migrate deploy`
- [ ] Prisma Client neu generiert: `npx prisma generate`
- [ ] Tabellen `Reservation` und `ReservationSyncHistory` existieren

### 2. Organisation Settings (API-Konfiguration)

#### LobbyPMS
- [ ] API Key konfiguriert
- [ ] Property ID konfiguriert
- [ ] Synchronisation aktiviert (`syncEnabled: true`)
- [ ] Automatische Task-Erstellung aktiviert (`autoCreateTasks: true`)
- [ ] Späte Check-in Zeit konfiguriert (`lateCheckInThreshold: "22:00"`)

#### WhatsApp (optional)
- [ ] Provider ausgewählt (Twilio oder WhatsApp Business API)
- [ ] API Key konfiguriert
- [ ] API Secret konfiguriert (falls erforderlich)
- [ ] Phone Number ID konfiguriert (für WhatsApp Business API)

#### Bold Payment (optional)
- [ ] API Key konfiguriert
- [ ] Merchant ID konfiguriert
- [ ] Environment ausgewählt (sandbox oder production)

#### TTLock (optional)
- [ ] Client ID konfiguriert
- [ ] Client Secret konfiguriert
- [ ] Lock IDs konfiguriert

#### SIRE (optional)
- [ ] API URL konfiguriert
- [ ] API Key konfiguriert
- [ ] API Secret konfiguriert (falls erforderlich)
- [ ] Property Code konfiguriert
- [ ] Automatische Registrierung aktiviert (`autoRegisterOnCheckIn: true`)

### 3. Umgebungsvariablen

- [ ] `ENCRYPTION_KEY` gesetzt (für API-Key-Verschlüsselung)
- [ ] `FRONTEND_URL` gesetzt (für Check-in-Links)
- [ ] `APP_URL` gesetzt (für Webhook-Callbacks)

## Test-Schritte

### Schritt 1: API-Verbindungen testen

#### LobbyPMS API testen
```bash
POST /api/lobby-pms/validate
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "message": "Verbindung erfolgreich"
}
```

#### SIRE API testen (falls konfiguriert)
```bash
GET /api/lobby-pms/reservations/:id/sire-status
```

### Schritt 2: Reservierungen synchronisieren

#### Manuelle Synchronisation
```bash
POST /api/lobby-pms/sync
Content-Type: application/json

{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "syncedCount": 5
}
```

#### Reservierungen abrufen
```bash
GET /api/lobby-pms/reservations?startDate=2024-01-01&endDate=2024-01-31
```

### Schritt 3: Check-in-Einladungen testen

#### Manueller Trigger
```bash
POST /api/admin/trigger-check-in-invitations
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "message": "Check-in-Einladungen erfolgreich versendet"
}
```

### Schritt 4: Check-in durchführen

#### Check-in für Reservierung
```bash
PUT /api/lobby-pms/reservations/:id/check-in
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "checked_in",
    "onlineCheckInCompleted": true,
    "doorPin": "1234",
    "doorAppName": "TTLock"
  }
}
```

### Schritt 5: SIRE-Registrierung testen

#### Manuelle SIRE-Registrierung
```bash
POST /api/lobby-pms/reservations/:id/register-sire
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "registrationId": "SIRE-12345",
  "message": "Gast erfolgreich bei SIRE registriert"
}
```

#### SIRE-Status abrufen
```bash
GET /api/lobby-pms/reservations/:id/sire-status
```

## Häufige Probleme & Lösungen

### Problem 1: "LobbyPMS ist nicht für diese Organisation konfiguriert"

**Lösung:**
1. Prüfe ob Organisation Settings korrekt gesetzt sind
2. Prüfe ob `lobbyPms.syncEnabled` auf `true` gesetzt ist
3. Prüfe ob API Key und Property ID vorhanden sind

### Problem 2: "ENCRYPTION_KEY environment variable is not set"

**Lösung:**
1. Generiere einen Encryption Key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Füge ihn zur `.env` Datei hinzu:
   ```
   ENCRYPTION_KEY=<generierter-key>
   ```

### Problem 3: "SIRE-Registrierung fehlgeschlagen: Fehlende erforderliche Daten"

**Lösung:**
1. Prüfe ob alle erforderlichen Felder in der Reservierung vorhanden sind:
   - `guestNationality`
   - `guestPassportNumber`
   - `guestBirthDate`
   - `roomNumber`
2. Aktualisiere Reservierung mit fehlenden Daten

### Problem 4: "Task wird nicht erstellt"

**Lösung:**
1. Prüfe ob `lobbyPms.autoCreateTasks` auf `true` gesetzt ist
2. Prüfe ob eine "Rezeption"-Rolle in der Organisation existiert
3. Prüfe ob mindestens eine Branch in der Organisation existiert

### Problem 5: "WhatsApp-Nachricht wird nicht versendet"

**Lösung:**
1. Prüfe WhatsApp-Konfiguration in Organisation Settings
2. Prüfe ob `notificationChannels` "whatsapp" enthält
3. Prüfe ob `guestPhone` in der Reservierung vorhanden ist
4. Prüfe Twilio/WhatsApp Business API Credentials

## Test-Daten

### Beispiel-Reservierung für Tests

```json
{
  "lobbyReservationId": "TEST-001",
  "guestName": "Max Mustermann",
  "guestEmail": "max@example.com",
  "guestPhone": "+573001234567",
  "checkInDate": "2024-01-15T14:00:00Z",
  "checkOutDate": "2024-01-20T11:00:00Z",
  "arrivalTime": "2024-01-15T22:30:00Z",
  "roomNumber": "101",
  "roomDescription": "Einzelzimmer mit Bad",
  "guestNationality": "DE",
  "guestPassportNumber": "C12345678",
  "guestBirthDate": "1990-01-01T00:00:00Z"
}
```

## Monitoring & Logging

### Wichtige Log-Messages

- `[LobbyPMS]` - LobbyPMS API-Requests
- `[WhatsApp]` - WhatsApp-Versand
- `[Bold Payment]` - Bold Payment API-Requests
- `[TTLock]` - TTLock API-Requests
- `[SIRE]` - SIRE API-Requests
- `[ReservationNotification]` - Benachrichtigungsversand
- `[TaskAutomation]` - Automatische Task-Erstellung
- `[ReservationScheduler]` - Scheduler-Ausführung

### Prüfen der Logs

```bash
# Backend-Logs anzeigen
tail -f logs/backend.log

# Oder in der Konsole, wenn Server läuft
```

## Nächste Schritte nach erfolgreicher Konfiguration

1. **Produktions-Checkliste:**
   - [ ] Alle API-Keys in Produktionsumgebung gesetzt
   - [ ] Encryption Key sicher gespeichert
   - [ ] Webhook-URLs korrekt konfiguriert
   - [ ] Scheduler läuft (täglich 20:00 Uhr)

2. **Monitoring einrichten:**
   - [ ] Error-Tracking aktiviert
   - [ ] Log-Aggregation konfiguriert
   - [ ] Alerts für fehlgeschlagene Registrierungen

3. **Dokumentation:**
   - [ ] Team-Schulung durchgeführt
   - [ ] Prozess-Dokumentation erstellt
   - [ ] Notfall-Prozeduren dokumentiert


