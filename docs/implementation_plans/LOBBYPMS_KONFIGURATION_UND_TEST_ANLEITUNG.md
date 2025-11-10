# LobbyPMS Integration - Konfiguration & Test-Anleitung

## 📋 Übersicht

Diese Anleitung führt Schritt für Schritt durch die Konfiguration und das Testen aller Komponenten der LobbyPMS Integration.

## 🔧 Schritt 1: Organisation öffnen

1. **Frontend öffnen**: `http://localhost:3000` (oder Produktions-URL)
2. **Organisation auswählen**: "La Familia Hostel" (ID: 1)
3. **Organisation bearbeiten**: Klick auf "Bearbeiten" oder "Edit"
4. **API-Tab öffnen**: Klick auf "API" Tab (nur sichtbar für Organisationen aus Kolumbien)

## 🔑 Schritt 2: LobbyPMS konfigurieren

### Erforderliche Felder:
- ✅ **API Key**: LobbyPMS API Token (wird automatisch verschlüsselt)
- ✅ **Property ID**: LobbyPMS Property ID (z.B. "13543")
- ✅ **Sync aktiviert**: Checkbox aktivieren
- ✅ **Späte Check-in-Schwelle**: Standard "22:00"
- ✅ **Benachrichtigungskanäle**: E-Mail und/oder WhatsApp auswählen

### Konfiguration:
```
API Key: [Ihr LobbyPMS API Token]
Property ID: 13543
Sync aktiviert: ✅
Späte Check-in-Schwelle: 22:00
Benachrichtigungskanäle: ☑ E-Mail ☑ WhatsApp
```

### Test:
1. **Speichern** klicken
2. **Verbindung testen**: Klick auf "Verbindung testen" Button (falls vorhanden)
3. **Oder manuell testen**: `POST /api/lobby-pms/validate`

## 💳 Schritt 3: Bold Payment konfigurieren

### Erforderliche Felder:
- ✅ **API Key**: Bold Payment API Key
- ✅ **Merchant ID**: Bold Payment Merchant ID
- ✅ **Environment**: Sandbox oder Production

### Konfiguration:
```
API Key: [Ihr Bold Payment API Key]
Merchant ID: [Ihre Merchant ID]
Environment: Sandbox (für Tests) / Production
```

### Webhook konfigurieren (in Bold Payment Dashboard):
1. **Webhook URL**: `https://your-domain.com/api/bold-payment/webhook`
2. **Events auswählen**:
   - `payment.paid`
   - `payment.completed`
   - `payment.partially_paid`
   - `payment.refunded`
   - `payment.failed`
   - `payment.cancelled`

### Test:
1. **Speichern** klicken
2. **Test-Payment-Link erstellen** (über Test-Reservierung)

## 🔐 Schritt 4: TTLock (Türsystem) konfigurieren

### Erforderliche Felder:
- ✅ **Client ID**: TTLock Client ID
- ✅ **Client Secret**: TTLock Client Secret
- ✅ **API URL**: Standard `https://open.ttlock.com` (kann geändert werden)
- ✅ **Lock IDs**: Array von Lock IDs (optional)

### Konfiguration:
```
Client ID: [Ihre TTLock Client ID]
Client Secret: [Ihr TTLock Client Secret]
API URL: https://open.ttlock.com
Lock IDs: ["lock-id-1", "lock-id-2"] (optional)
```

### Test:
1. **Speichern** klicken
2. **Locks abrufen**: `GET /api/ttlock/locks`
3. **Passcode erstellen**: `POST /api/ttlock/passcodes`

## 📱 Schritt 5: WhatsApp konfigurieren

### Option A: Twilio
- ✅ **Provider**: Twilio
- ✅ **API Key**: Twilio Account SID
- ✅ **API Secret**: Twilio Auth Token
- ✅ **Phone Number ID**: Twilio WhatsApp Phone Number

### Option B: WhatsApp Business API
- ✅ **Provider**: WhatsApp Business API
- ✅ **API Key**: WhatsApp Business API Key
- ✅ **API Secret**: WhatsApp Business API Secret
- ✅ **Phone Number ID**: WhatsApp Business Phone Number ID

### Konfiguration (Twilio):
```
Provider: Twilio
API Key: [Twilio Account SID]
API Secret: [Twilio Auth Token]
Phone Number ID: [WhatsApp Phone Number]
```

### Test:
1. **Speichern** klicken
2. **Test-Nachricht senden** (über Test-Reservierung)

## 🏛️ Schritt 6: SIRE konfigurieren

### Erforderliche Felder:
- ✅ **Aktiviert**: Checkbox aktivieren
- ✅ **Automatische Registrierung**: Checkbox aktivieren (beim Check-in)
- ✅ **API URL**: SIRE API URL
- ✅ **API Key**: SIRE API Key
- ✅ **API Secret**: SIRE API Secret (optional)
- ✅ **Property Code**: SIRE Property Code

### Konfiguration:
```
Aktiviert: ✅
Automatische Registrierung: ✅
API URL: [SIRE API URL]
API Key: [SIRE API Key]
API Secret: [SIRE API Secret]
Property Code: [SIRE Property Code]
```

### Test:
1. **Speichern** klicken
2. **Manuelle Registrierung testen**: `POST /api/lobby-pms/reservations/:id/register-sire`
3. **Status abfragen**: `GET /api/lobby-pms/reservations/:id/sire-status`

## ✅ Schritt 7: Konfiguration speichern

1. **Alle Tabs durchgehen** und Felder ausfüllen
2. **Speichern** klicken
3. **Erfolgsmeldung prüfen**
4. **Bei Fehlern**: Fehlermeldung lesen und korrigieren

## 🧪 Schritt 8: Tests durchführen

### Test 1: LobbyPMS Verbindung
```bash
# Backend Terminal
curl -X GET http://localhost:5000/api/lobby-pms/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Organization-Id: 1"
```

**Erwartetes Ergebnis**: `{ "success": true, "message": "Verbindung erfolgreich" }`

### Test 2: Reservierungen synchronisieren
```bash
curl -X POST http://localhost:5000/api/lobby-pms/sync \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Organization-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  }'
```

**Erwartetes Ergebnis**: `{ "success": true, "synced": 5 }`

### Test 3: TTLock Locks abrufen
```bash
curl -X GET http://localhost:5000/api/ttlock/locks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Organization-Id: 1"
```

**Erwartetes Ergebnis**: `{ "success": true, "locks": [...] }`

### Test 4: Check-in-Einladungen manuell auslösen
```bash
curl -X POST http://localhost:5000/api/admin/trigger-check-in-invitations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Erwartetes Ergebnis**: `{ "success": true, "message": "Check-in-Einladungen erfolgreich versendet" }`

### Test 5: Mock-Daten erstellen (für Tests ohne LobbyPMS API)
```bash
cd backend
npx ts-node scripts/create-mock-reservations.ts 1
```

**Erwartetes Ergebnis**: 3 Mock-Reservierungen erstellt

### Test 6: Frontend - Reservierungen anzeigen
1. **Frontend öffnen**: `http://localhost:3000/reservations`
2. **Reservierungen sollten angezeigt werden**
3. **Filter testen**: Status, Zahlungsstatus
4. **Suche testen**: Gast, E-Mail, Telefon, Zimmer

### Test 7: Frontend - Check-in durchführen
1. **Reservierung auswählen**
2. **"Check-in" Button klicken**
3. **Zimmernummer eingeben**
4. **Zimmerbeschreibung eingeben**
5. **"Check-in durchführen" klicken**
6. **Erfolg prüfen**: Status sollte "checked_in" sein

### Test 8: SIRE-Registrierung testen
```bash
curl -X POST http://localhost:5000/api/lobby-pms/reservations/1/register-sire \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Organization-Id: 1"
```

**Erwartetes Ergebnis**: `{ "success": true, "message": "Gast erfolgreich bei SIRE registriert" }`

## 🔍 Schritt 9: Logs prüfen

### Backend Logs
```bash
# Server-Logs prüfen
tail -f backend/logs/app.log  # Falls Logging konfiguriert
# Oder Console-Output prüfen
```

**Zu prüfen**:
- ✅ API-Calls erfolgreich
- ✅ Keine Fehler
- ✅ Webhooks empfangen
- ✅ Automatisierungen laufen

### Frontend Console
1. **Browser DevTools öffnen** (F12)
2. **Console-Tab prüfen**
3. **Network-Tab prüfen** (API-Calls)

## ⚠️ Häufige Probleme

### Problem 1: "API Key ist nicht konfiguriert"
**Lösung**: 
- Prüfe ob API Key eingegeben wurde
- Prüfe ob Organisation korrekt ausgewählt ist
- Prüfe ob Settings gespeichert wurden

### Problem 2: "Verbindung fehlgeschlagen"
**Lösung**:
- Prüfe API Key
- Prüfe API URL
- Prüfe Netzwerkverbindung
- Prüfe Firewall/Proxy

### Problem 3: "Webhook nicht empfangen"
**Lösung**:
- Prüfe Webhook URL in externem Dashboard
- Prüfe ob Server öffentlich erreichbar ist (HTTPS erforderlich)
- Prüfe Webhook-Secret (falls konfiguriert)

### Problem 4: "Reservierungen nicht synchronisiert"
**Lösung**:
- Prüfe LobbyPMS API-Zugriff
- Prüfe Property ID
- Prüfe Sync-Einstellungen
- Prüfe Logs für Fehlermeldungen

## 📊 Checkliste

### Konfiguration
- [ ] LobbyPMS API Key eingegeben
- [ ] LobbyPMS Property ID eingegeben
- [ ] Bold Payment API Key eingegeben
- [ ] Bold Payment Merchant ID eingegeben
- [ ] TTLock Client ID eingegeben
- [ ] TTLock Client Secret eingegeben
- [ ] WhatsApp Provider konfiguriert
- [ ] SIRE API Key eingegeben
- [ ] Alle Settings gespeichert

### Tests
- [ ] LobbyPMS Verbindung getestet
- [ ] Reservierungen synchronisiert
- [ ] TTLock Locks abgerufen
- [ ] Check-in-Einladungen getestet
- [ ] Check-in durchgeführt
- [ ] SIRE-Registrierung getestet
- [ ] Frontend funktioniert
- [ ] Logs geprüft

### Webhooks
- [ ] Bold Payment Webhook konfiguriert
- [ ] LobbyPMS Webhook konfiguriert (wenn verfügbar)
- [ ] Webhook-Secret gesetzt (optional)

## 🎯 Nächste Schritte

Nach erfolgreicher Konfiguration und Tests:

1. **Produktion aktivieren**
2. **Scheduler starten** (läuft automatisch)
3. **Monitoring einrichten**
4. **Dokumentation aktualisieren**

## 📞 Support

Bei Problemen:
1. Logs prüfen
2. Dokumentation konsultieren
3. API-Dokumentationen prüfen
4. Support kontaktieren

