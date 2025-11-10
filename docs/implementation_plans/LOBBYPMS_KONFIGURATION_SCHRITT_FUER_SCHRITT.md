# LobbyPMS Integration - Schritt-für-Schritt Konfiguration

## Schritt 1: Umgebungsvariablen prüfen

### ENCRYPTION_KEY generieren und setzen

Der Encryption Key wird benötigt, um API-Keys sicher zu verschlüsseln.

**Generierung:**
```bash
cd backend
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Beispiel-Output:**
```
f8795f99bb9aa67acae0c6bc5ab09bec6c7b75ff3616cff84e1c8e622eabe318
```

**In `.env` Datei hinzufügen:**
```env
ENCRYPTION_KEY=f8795f99bb9aa67acae0c6bc5ab09bec6c7b75ff3616cff84e1c8e622eabe318
```

**Wichtig:** Dieser Key muss sicher gespeichert werden! Bei Verlust können verschlüsselte API-Keys nicht mehr entschlüsselt werden.

### Weitere Umgebungsvariablen (optional)

```env
FRONTEND_URL=http://localhost:3000
APP_URL=http://localhost:5000
```

## Schritt 2: Organisation öffnen und API-Tab konfigurieren

### 2.1 Organisation öffnen

1. Gehe zu **Organisationen** im Frontend
2. Wähle die Organisation (z.B. "La Familia Hostel", ID: 1)
3. Klicke auf **Bearbeiten**
4. Gehe zum Tab **API**

**Hinweis:** Der API-Tab ist nur sichtbar, wenn die Organisation aus Kolumbien (`country: 'CO'`) ist.

### 2.2 LobbyPMS konfigurieren

**Pflichtfelder:**
- ✅ **API Token**: Dein LobbyPMS API Token
- ✅ **Property ID**: Die Property ID aus LobbyPMS
- ✅ **Synchronisation aktivieren**: Aktivieren
- ✅ **Automatisch Tasks erstellen**: Aktivieren (optional)
- ✅ **Späte Check-in Zeit**: z.B. "22:00"

**Beispiel:**
```
API Token: abc123xyz789...
Property ID: PROP-001
Synchronisation aktivieren: ✅
Automatisch Tasks erstellen: ✅
Späte Check-in Zeit: 22:00
```

### 2.3 Weitere APIs konfigurieren (optional)

#### WhatsApp (für Benachrichtigungen)
- Provider: Twilio oder WhatsApp Business API
- API Key: Dein Twilio Account SID oder WhatsApp Business API Token
- API Secret: Dein Twilio Auth Token oder WhatsApp Business API Secret
- Phone Number ID: Deine WhatsApp-Nummer (für WhatsApp Business API)

#### Bold Payment (für Zahlungslinks)
- API Key: Dein Bold Payment API Key
- Merchant ID: Deine Merchant ID
- Environment: sandbox oder production

#### TTLock (für Türsystem-PINs)
- Client ID: Deine TTLock Client ID
- Client Secret: Dein TTLock Client Secret
- API URL: https://open.ttlock.com (Standard)

#### SIRE (für Gästeregistrierung)
- API URL: Deine SIRE API URL
- API Key: Dein SIRE API Key
- API Secret: Dein SIRE API Secret (falls erforderlich)
- Property Code: Dein Property Code für SIRE
- ✅ **Aktiviert**: Aktivieren
- ✅ **Automatisch registrieren beim Check-in**: Aktivieren

### 2.4 Speichern

Klicke auf **Speichern**. Die API-Keys werden automatisch verschlüsselt gespeichert.

## Schritt 3: Erste Tests durchführen

### 3.1 LobbyPMS-Verbindung testen

**API-Endpoint:**
```bash
GET /api/lobby-pms/validate
```

**Mit curl:**
```bash
curl -X GET http://localhost:5000/api/lobby-pms/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "message": "Verbindung erfolgreich"
}
```

### 3.2 Reservierungen synchronisieren

**API-Endpoint:**
```bash
POST /api/lobby-pms/sync
Content-Type: application/json

{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**Mit curl:**
```bash
curl -X POST http://localhost:5000/api/lobby-pms/sync \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }'
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "syncedCount": 5
}
```

### 3.3 Reservierungen abrufen

**API-Endpoint:**
```bash
GET /api/lobby-pms/reservations?startDate=2024-01-01&endDate=2024-01-31
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "data": [
    {
      "id": "RES-001",
      "guest_name": "Max Mustermann",
      "check_in_date": "2024-01-15",
      "check_out_date": "2024-01-20",
      "status": "confirmed",
      "synced": true,
      "localId": 1
    }
  ],
  "count": 1
}
```

## Schritt 4: Automatische Funktionen testen

### 4.1 Check-in-Einladungen manuell auslösen

**API-Endpoint:**
```bash
POST /api/admin/trigger-check-in-invitations
```

**Mit curl:**
```bash
curl -X POST http://localhost:5000/api/admin/trigger-check-in-invitations
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "message": "Check-in-Einladungen erfolgreich versendet"
}
```

**Was passiert:**
1. System sucht Reservierungen für morgen mit Ankunft nach 22:00
2. Erstellt Zahlungslink (Bold Payment)
3. Sendet E-Mail/WhatsApp mit Check-in-Link und Zahlungslink

### 4.2 Check-in durchführen

**API-Endpoint:**
```bash
PUT /api/lobby-pms/reservations/:id/check-in
```

**Mit curl:**
```bash
curl -X PUT http://localhost:5000/api/lobby-pms/reservations/1/check-in \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Was passiert:**
1. Status wird in LobbyPMS aktualisiert
2. Lokale Reservierung wird aktualisiert
3. Task wird abgeschlossen
4. TTLock Passcode wird erstellt (falls konfiguriert)
5. SIRE-Registrierung wird durchgeführt (falls aktiviert)
6. Check-in-Bestätigung wird versendet

### 4.3 SIRE-Registrierung testen

**Manuelle Registrierung:**
```bash
POST /api/lobby-pms/reservations/:id/register-sire
```

**Status abrufen:**
```bash
GET /api/lobby-pms/reservations/:id/sire-status
```

## Schritt 5: Datenbank prüfen

### 5.1 Reservierungen in Datenbank prüfen

```sql
SELECT 
  id,
  "guestName",
  "checkInDate",
  "checkOutDate",
  status,
  "sireRegistered",
  "sireRegistrationId",
  "paymentLink",
  "doorPin"
FROM "Reservation"
WHERE "organizationId" = 1
ORDER BY "checkInDate" DESC;
```

### 5.2 Tasks prüfen

```sql
SELECT 
  t.id,
  t.title,
  t.status,
  t."reservationId",
  r."guestName"
FROM "Task" t
LEFT JOIN "Reservation" r ON t."reservationId" = r.id
WHERE t."organizationId" = 1
ORDER BY t."createdAt" DESC;
```

### 5.3 Sync-History prüfen

```sql
SELECT 
  rsh.id,
  rsh."syncType",
  rsh."syncedAt",
  rsh."errorMessage",
  r."guestName"
FROM "ReservationSyncHistory" rsh
JOIN "Reservation" r ON rsh."reservationId" = r.id
WHERE r."organizationId" = 1
ORDER BY rsh."syncedAt" DESC
LIMIT 10;
```

## Schritt 6: Scheduler prüfen

Der Scheduler läuft automatisch und prüft täglich um 20:00 Uhr nach Reservierungen für morgen.

**Manueller Test:**
```bash
POST /api/admin/trigger-check-in-invitations
```

**Logs prüfen:**
```bash
# Im Backend-Log nach folgenden Messages suchen:
[ReservationScheduler] Starte tägliche Check-in-Einladungen...
[ReservationNotification] Gefunden: X Reservierungen
[ReservationNotification] Einladung versendet für Reservierung X
```

## Häufige Probleme

### Problem: "LobbyPMS ist nicht für diese Organisation konfiguriert"

**Lösung:**
1. Prüfe ob Organisation Settings korrekt gesetzt sind
2. Prüfe ob `lobbyPms.syncEnabled` auf `true` gesetzt ist
3. Prüfe ob API Key und Property ID vorhanden sind

### Problem: "ENCRYPTION_KEY environment variable is not set"

**Lösung:**
1. Generiere einen Encryption Key (siehe Schritt 1)
2. Füge ihn zur `.env` Datei hinzu
3. Starte Backend neu

### Problem: "SIRE-Registrierung fehlgeschlagen: Fehlende erforderliche Daten"

**Lösung:**
1. Prüfe ob alle erforderlichen Felder in der Reservierung vorhanden sind:
   - `guestNationality`
   - `guestPassportNumber`
   - `guestBirthDate`
   - `roomNumber`
2. Aktualisiere Reservierung mit fehlenden Daten

### Problem: "Task wird nicht erstellt"

**Lösung:**
1. Prüfe ob `lobbyPms.autoCreateTasks` auf `true` gesetzt ist
2. Prüfe ob eine "Rezeption"-Rolle in der Organisation existiert
3. Prüfe ob mindestens eine Branch in der Organisation existiert

## Nächste Schritte

Nach erfolgreicher Konfiguration:

1. **Produktions-Checkliste:**
   - [ ] Alle API-Keys in Produktionsumgebung gesetzt
   - [ ] Encryption Key sicher gespeichert
   - [ ] Webhook-URLs korrekt konfiguriert
   - [ ] Scheduler läuft (täglich 20:00 Uhr)

2. **Monitoring:**
   - [ ] Error-Tracking aktiviert
   - [ ] Log-Aggregation konfiguriert
   - [ ] Alerts für fehlgeschlagene Registrierungen

3. **Dokumentation:**
   - [ ] Team-Schulung durchgeführt
   - [ ] Prozess-Dokumentation erstellt


