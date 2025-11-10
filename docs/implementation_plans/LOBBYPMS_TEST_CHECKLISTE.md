# LobbyPMS Integration - Test-Checkliste

## 🎯 Übersicht

Diese Checkliste führt durch alle Tests für die LobbyPMS Integration.

## 📋 Vorbereitung

### 1. Server starten
```bash
cd backend
npm run dev
```

### 2. Frontend starten
```bash
cd frontend
npm start
```

### 3. Organisation öffnen
- Frontend: `http://localhost:3000`
- Organisation: "La Familia Hostel" (ID: 1)
- Tab: "API"

## ✅ Konfiguration prüfen

### LobbyPMS
- [ ] API Key eingegeben
- [ ] Property ID eingegeben
- [ ] Sync aktiviert
- [ ] Späte Check-in-Schwelle: 22:00
- [ ] Benachrichtigungskanäle ausgewählt

### Bold Payment
- [ ] API Key eingegeben
- [ ] Merchant ID eingegeben
- [ ] Environment ausgewählt (Sandbox/Production)
- [ ] Webhook URL konfiguriert (in Bold Payment Dashboard)

### TTLock
- [ ] Client ID eingegeben
- [ ] Client Secret eingegeben
- [ ] API URL korrekt (Standard: https://open.ttlock.com)
- [ ] Lock IDs eingegeben (optional)

### WhatsApp
- [ ] Provider ausgewählt (Twilio/WhatsApp Business API)
- [ ] API Key eingegeben
- [ ] API Secret eingegeben
- [ ] Phone Number ID eingegeben

### SIRE
- [ ] Aktiviert
- [ ] Automatische Registrierung aktiviert
- [ ] API URL eingegeben
- [ ] API Key eingegeben
- [ ] Property Code eingegeben

## 🧪 Backend-Tests

### Test 1: Alle Integrationen testen
```bash
cd backend
npx ts-node scripts/test-all-integrations.ts 1
```

**Erwartetes Ergebnis**: Alle Tests erfolgreich

### Test 2: LobbyPMS Verbindung
```bash
npx ts-node scripts/test-integration-single.ts lobbypms 1
```

**Erwartetes Ergebnis**: Verbindung erfolgreich

### Test 3: TTLock
```bash
npx ts-node scripts/test-integration-single.ts ttlock 1
```

**Erwartetes Ergebnis**: Locks gefunden

### Test 4: API-Endpoints testen

#### LobbyPMS Validierung
```bash
curl -X GET http://localhost:5000/api/lobby-pms/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Organization-Id: 1"
```

#### Reservierungen synchronisieren
```bash
curl -X POST http://localhost:5000/api/lobby-pms/sync \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Organization-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2025-01-01", "endDate": "2025-01-31"}'
```

#### TTLock Locks
```bash
curl -X GET http://localhost:5000/api/ttlock/locks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Organization-Id: 1"
```

### Test 5: Mock-Daten erstellen
```bash
npx ts-node scripts/create-mock-reservations.ts 1
```

**Erwartetes Ergebnis**: 3 Mock-Reservierungen erstellt

## 🖥️ Frontend-Tests

### Test 1: Reservierungen anzeigen
- [ ] Öffne `/reservations`
- [ ] Reservierungen werden angezeigt
- [ ] Filter funktionieren (Status, Zahlungsstatus)
- [ ] Suche funktioniert (Gast, E-Mail, Telefon, Zimmer)
- [ ] Pagination funktioniert

### Test 2: Reservierungsdetails
- [ ] Klick auf Reservierung
- [ ] Details werden angezeigt
- [ ] Alle Felder korrekt
- [ ] Status korrekt

### Test 3: Check-in durchführen
- [ ] Öffne Check-in-Formular
- [ ] Zimmernummer eingeben
- [ ] Zimmerbeschreibung eingeben
- [ ] Check-in durchführen
- [ ] Status aktualisiert auf "checked_in"
- [ ] Task-Status aktualisiert
- [ ] SIRE-Registrierung durchgeführt (wenn aktiviert)
- [ ] TTLock PIN generiert (wenn aktiviert)

### Test 4: Synchronisation
- [ ] Klick auf "Synchronisieren" Button
- [ ] Reservierungen werden synchronisiert
- [ ] Neue Reservierungen erscheinen
- [ ] Aktualisierte Reservierungen werden aktualisiert

## 🤖 Automatisierungs-Tests

### Test 1: Check-in-Einladungen manuell auslösen
```bash
curl -X POST http://localhost:5000/api/admin/trigger-check-in-invitations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Erwartetes Ergebnis**: 
- Reservierungen für morgen nach 22:00 gefunden
- E-Mail/WhatsApp-Nachrichten versendet
- Zahlungslinks erstellt
- Tasks erstellt

### Test 2: Scheduler prüfen
- [ ] Scheduler läuft (prüfe Logs)
- [ ] Täglich um 20:00 Uhr: Check-in-Einladungen
- [ ] Automatische Synchronisation

## 📧 E-Mail/WhatsApp-Tests

### Test 1: Check-in-Einladung
- [ ] E-Mail/WhatsApp-Nachricht erhalten
- [ ] Inhalt korrekt (Gast, Check-in-Link, Zahlungslink)
- [ ] Links funktionieren

### Test 2: Check-in-Bestätigung
- [ ] Nach Check-in: E-Mail/WhatsApp-Nachricht erhalten
- [ ] Inhalt korrekt (PIN, App-Name, Zimmerbeschreibung)
- [ ] PIN funktioniert

## 💳 Payment-Tests

### Test 1: Payment-Link erstellen
- [ ] Payment-Link wird erstellt
- [ ] Link funktioniert
- [ ] Link in Reservierung gespeichert

### Test 2: Payment-Status
- [ ] Zahlung durchführen (Test)
- [ ] Webhook empfangen
- [ ] Status aktualisiert auf "paid"

## 🔐 TTLock-Tests

### Test 1: Passcode erstellen
- [ ] Passcode wird generiert
- [ ] Passcode in Reservierung gespeichert
- [ ] Passcode funktioniert am Lock

### Test 2: Passcode löschen
- [ ] Bei Check-out: Passcode wird gelöscht
- [ ] Passcode funktioniert nicht mehr

## 🏛️ SIRE-Tests

### Test 1: Automatische Registrierung
- [ ] Bei Check-in: SIRE-Registrierung automatisch
- [ ] Registrierungs-ID gespeichert
- [ ] Status: "sireRegistered: true"

### Test 2: Manuelle Registrierung
```bash
curl -X POST http://localhost:5000/api/lobby-pms/reservations/1/register-sire \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Organization-Id: 1"
```

**Erwartetes Ergebnis**: Registrierung erfolgreich

### Test 3: Status abfragen
```bash
curl -X GET http://localhost:5000/api/lobby-pms/reservations/1/sire-status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Organization-Id: 1"
```

**Erwartetes Ergebnis**: Status-Informationen

## 🔍 Logs prüfen

### Backend-Logs
- [ ] Keine Fehler
- [ ] API-Calls erfolgreich
- [ ] Webhooks empfangen
- [ ] Automatisierungen laufen

### Frontend-Console
- [ ] Keine Fehler
- [ ] API-Calls erfolgreich
- [ ] Keine Warnungen

## ⚠️ Fehlerbehandlung

### Test 1: Fehlende Konfiguration
- [ ] Fehlermeldung bei fehlendem API Key
- [ ] Fehlermeldung bei fehlender Konfiguration

### Test 2: API-Fehler
- [ ] Fehlermeldung bei API-Fehler
- [ ] Fehler wird geloggt
- [ ] System bleibt stabil

### Test 3: Netzwerk-Fehler
- [ ] Timeout-Handling
- [ ] Retry-Logik (falls implementiert)

## 📊 Zusammenfassung

### Erfolgreich getestet
- [ ] LobbyPMS Verbindung
- [ ] Reservierungen synchronisieren
- [ ] Check-in durchführen
- [ ] E-Mail/WhatsApp-Versand
- [ ] Payment-Links
- [ ] TTLock PINs
- [ ] SIRE-Registrierung
- [ ] Automatisierungen
- [ ] Frontend-Funktionalität

### Probleme gefunden
- [ ] Problem 1: ...
- [ ] Problem 2: ...
- [ ] Problem 3: ...

### Nächste Schritte
- [ ] Probleme beheben
- [ ] Produktion vorbereiten
- [ ] Monitoring einrichten

