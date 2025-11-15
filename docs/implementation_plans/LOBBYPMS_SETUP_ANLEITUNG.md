# LobbyPMS Integration - Setup-Anleitung

## 🚀 Quick Start

### Schritt 1: ENCRYPTION_KEY setzen (wichtig!)

```bash
cd backend
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Kopiere den generierten Key und füge ihn zur `.env` Datei hinzu:**
```env
ENCRYPTION_KEY=<generierter-key>
```

**Wichtig:** Dieser Key muss sicher gespeichert werden! Bei Verlust können verschlüsselte API-Keys nicht mehr entschlüsselt werden.

### Schritt 2: Frontend öffnen und konfigurieren

1. **Frontend starten** (falls nicht läuft):
   ```bash
   cd frontend
   npm start
   ```

2. **Organisation öffnen**:
   - Gehe zu `http://localhost:3000`
   - Öffne "Organisationen"
   - Wähle "La Familia Hostel" (ID: 1)
   - Klicke auf "Bearbeiten"
   - Gehe zum Tab **"API"**

3. **API-Keys eintragen** (siehe detaillierte Konfiguration unten)

4. **Speichern** klicken

### Schritt 3: Alle Integrationen testen

```bash
cd backend
npx ts-node scripts/test-all-integrations.ts 1
```

**Erwartetes Ergebnis**: Alle Tests erfolgreich ✅

---

## 📋 Detaillierte Konfiguration

### Schritt 1: Umgebungsvariablen prüfen

#### ENCRYPTION_KEY generieren und setzen

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

#### Weitere Umgebungsvariablen (optional)

```env
FRONTEND_URL=http://localhost:3000
APP_URL=http://localhost:5000
```

### Schritt 2: Organisation öffnen und API-Tab konfigurieren

#### 2.1 Organisation öffnen

1. Gehe zu **Organisationen** im Frontend
2. Wähle die Organisation (z.B. "La Familia Hostel", ID: 1)
3. Klicke auf **Bearbeiten**
4. Gehe zum Tab **API**

**Hinweis:** Der API-Tab ist nur sichtbar, wenn die Organisation aus Kolumbien (`country: 'CO'`) ist.

#### 2.2 LobbyPMS konfigurieren

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

#### 2.3 WhatsApp konfigurieren (für Benachrichtigungen)

- Provider: Twilio oder WhatsApp Business API
- API Key: Dein Twilio Account SID oder WhatsApp Business API Token
- API Secret: Dein Twilio Auth Token oder WhatsApp Business API Secret
- Phone Number ID: Deine WhatsApp-Nummer (für WhatsApp Business API)

#### 2.4 Bold Payment konfigurieren (für Zahlungslinks)

- API Key: Dein Bold Payment API Key (Llave secreta)
- Merchant ID: Deine Merchant ID (Llave de identidad)
- Environment: sandbox oder production

#### 2.5 TTLock konfigurieren (für Türsystem-PINs)

- Client ID: Deine TTLock Client ID
- Client Secret: Dein TTLock Client Secret
- API URL: https://open.ttlock.com (Standard)
- Lock IDs: Komma-separierte Liste der Lock-IDs

#### 2.6 SIRE konfigurieren (für Gästeregistrierung)

- API URL: Deine SIRE API URL
- API Key: Dein SIRE API Key
- API Secret: Dein SIRE API Secret (falls erforderlich)
- Property Code: Dein Property Code für SIRE
- ✅ **Aktiviert**: Aktivieren
- ✅ **Automatisch registrieren beim Check-in**: Aktivieren

#### 2.7 Speichern

Klicke auf **Speichern**. Die API-Keys werden automatisch verschlüsselt gespeichert.

---

## 🧪 Tests durchführen

### Test 1: LobbyPMS-Verbindung testen

**Option A: Über Test-Script (Empfohlen)**

```bash
cd backend
npx ts-node scripts/test-integration-single.ts lobbypms 1
```

**Option B: Manuell über API**

```bash
# 1. Login und Token erhalten
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dein-username",
    "password": "dein-passwort"
  }'

# 2. LobbyPMS-Verbindung testen
curl -X GET http://localhost:5000/api/lobby-pms/validate \
  -H "Authorization: Bearer DEIN_TOKEN" \
  -H "X-Organization-Id: 1"
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "message": "Verbindung erfolgreich"
}
```

### Test 2: Reservierungen synchronisieren

```bash
curl -X POST http://localhost:5000/api/lobby-pms/sync \
  -H "Authorization: Bearer DEIN_TOKEN" \
  -H "X-Organization-Id: 1" \
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

### Test 3: Einzelne Integrationen testen

```bash
# TTLock
npx ts-node scripts/test-integration-single.ts ttlock 1

# Bold Payment
npx ts-node scripts/test-integration-single.ts boldpayment 1

# WhatsApp
npx ts-node scripts/test-integration-single.ts whatsapp 1

# SIRE
npx ts-node scripts/test-integration-single.ts sire 1
```

### Test 4: Mock-Daten erstellen (optional)

Falls LobbyPMS API noch nicht verfügbar:

```bash
cd backend
npx ts-node scripts/create-mock-reservations.ts 1
```

**Erstellt 3 Test-Reservierungen** für Tests.

### Test 5: Frontend testen

1. **Reservierungen anzeigen**:
   - Gehe zu `http://localhost:3000/reservations`
   - Reservierungen sollten angezeigt werden

2. **Check-in durchführen**:
   - Klicke auf eine Reservierung
   - Klicke auf "Check-in"
   - Fülle Formular aus
   - Klicke auf "Check-in durchführen"

3. **Synchronisation testen**:
   - Klicke auf "Synchronisieren" Button
   - Prüfe ob neue Reservierungen erscheinen

### Test 6: Automatisierung testen

```bash
# Check-in-Einladungen manuell auslösen
curl -X POST http://localhost:5000/api/admin/trigger-check-in-invitations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Erwartetes Ergebnis**: 
- Reservierungen für morgen nach 22:00 gefunden
- E-Mail/WhatsApp-Nachrichten versendet
- Zahlungslinks erstellt
- Tasks erstellt

---

## ✅ Test-Checkliste

### Konfiguration
- [ ] ENCRYPTION_KEY gesetzt
- [ ] LobbyPMS konfiguriert
- [ ] Bold Payment konfiguriert
- [ ] TTLock konfiguriert
- [ ] WhatsApp konfiguriert
- [ ] SIRE konfiguriert

### Backend-Tests
- [ ] Alle Integrationen getestet (`test-all-integrations.ts`)
- [ ] LobbyPMS Verbindung erfolgreich
- [ ] TTLock Locks abgerufen
- [ ] Reservierungen synchronisiert
- [ ] Mock-Daten erstellt (falls nötig)

### Frontend-Tests
- [ ] Reservierungen werden angezeigt
- [ ] Filter funktionieren (Status, Zahlungsstatus)
- [ ] Suche funktioniert (Gast, E-Mail, Telefon, Zimmer)
- [ ] Check-in funktioniert
- [ ] Synchronisation funktioniert

### Automatisierung
- [ ] Scheduler läuft (prüfe Logs)
- [ ] Check-in-Einladungen funktionieren
- [ ] Webhooks empfangen (Bold Payment)

### E-Mail/WhatsApp
- [ ] Check-in-Einladung erhalten
- [ ] Inhalt korrekt (Gast, Check-in-Link, Zahlungslink)
- [ ] Links funktionieren
- [ ] Check-in-Bestätigung erhalten (nach Check-in)
- [ ] Inhalt korrekt (PIN, App-Name, Zimmerbeschreibung)

### Payment
- [ ] Payment-Link wird erstellt
- [ ] Link funktioniert
- [ ] Zahlung durchführen (Test)
- [ ] Webhook empfangen
- [ ] Status aktualisiert auf "paid"

### TTLock
- [ ] Passcode wird generiert
- [ ] Passcode in Reservierung gespeichert
- [ ] Passcode funktioniert am Lock

### SIRE
- [ ] Automatische Registrierung beim Check-in
- [ ] Registrierungs-ID gespeichert
- [ ] Status: "sireRegistered: true"

---

## ⚠️ Häufige Probleme

### "ENCRYPTION_KEY nicht gesetzt"
→ Schritt 1 ausführen

### "API Key ist nicht konfiguriert"
→ Schritt 2: API-Keys im Frontend eintragen

### "Verbindung fehlgeschlagen"
→ Prüfe API-Keys und Netzwerkverbindung

### "LobbyPMS ist nicht für diese Organisation konfiguriert"
→ Prüfe ob Organisation Settings korrekt gesetzt sind
→ Prüfe ob `lobbyPms.syncEnabled` auf `true` gesetzt ist
→ Prüfe ob API Key und Property ID vorhanden sind

### "SIRE-Registrierung fehlgeschlagen: Fehlende erforderliche Daten"
→ Prüfe ob alle erforderlichen Felder in der Reservierung vorhanden sind:
  - `guestNationality`
  - `guestPassportNumber`
  - `guestBirthDate`
  - `roomNumber`
→ Aktualisiere Reservierung mit fehlenden Daten

### "Task wird nicht erstellt"
→ Prüfe ob `lobbyPms.autoCreateTasks` auf `true` gesetzt ist
→ Prüfe ob eine "Rezeption"-Rolle in der Organisation existiert
→ Prüfe ob mindestens eine Branch in der Organisation existiert

### Server läuft nicht
→ `cd backend && npm start` oder `npm run dev`

### Token abgelaufen
→ Neu einloggen und neuen Token holen

### CORS-Fehler
→ Prüfe CORS-Konfiguration in `backend/src/app.ts`

---

## 📊 Datenbank prüfen

### Reservierungen in Datenbank prüfen

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

### Tasks prüfen

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

### Sync-History prüfen

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

---

## 🔍 Logs prüfen

### Backend-Logs

Der Scheduler läuft automatisch und prüft täglich um 20:00 Uhr nach Reservierungen für morgen.

**Manueller Test:**
```bash
POST /api/admin/trigger-check-in-invitations
```

**Logs prüfen:**
- `[ReservationScheduler] Starte tägliche Check-in-Einladungen...`
- `[ReservationNotification] Gefunden: X Reservierungen`
- `[ReservationNotification] Einladung versendet für Reservierung X`
- `[Bold Payment] Payment-Link erfolgreich erstellt`
- `[WhatsApp] Nachricht versendet`
- `[SIRE] Registrierung erfolgreich`
- `[TTLock] Passcode erstellt`

### Frontend-Console
- Keine Fehler
- API-Calls erfolgreich
- Keine Warnungen

---

## 🎯 Nächste Schritte

Nach erfolgreicher Konfiguration:

1. **Produktion vorbereiten**
   - [ ] Alle API-Keys in Produktionsumgebung gesetzt
   - [ ] Encryption Key sicher gespeichert
   - [ ] Webhook-URLs korrekt konfiguriert
   - [ ] Scheduler läuft (täglich 20:00 Uhr)

2. **Monitoring einrichten**
   - [ ] Error-Tracking aktiviert
   - [ ] Log-Aggregation konfiguriert
   - [ ] Alerts für fehlgeschlagene Registrierungen

3. **Team schulen**
   - [ ] Prozess-Dokumentation erstellt
   - [ ] Team-Schulung durchgeführt

---

## 📚 Weitere Dokumentation

- **[LOBBYPMS_INTEGRATION.md](LOBBYPMS_INTEGRATION.md)** - Vollständiger Implementierungsplan
- **[LOBBYPMS_USE_CASES_UND_PROZESSE.md](LOBBYPMS_USE_CASES_UND_PROZESSE.md)** - Detaillierte Use Cases und Prozess-Flows
- **[LOBBYPMS_WO_IM_SYSTEM_SEHEN.md](LOBBYPMS_WO_IM_SYSTEM_SEHEN.md)** - Wo im System Use Cases zu finden sind
- **[LOBBYPMS_MOCK_DATEN.md](LOBBYPMS_MOCK_DATEN.md)** - Mock-Daten für Tests ohne echte API

