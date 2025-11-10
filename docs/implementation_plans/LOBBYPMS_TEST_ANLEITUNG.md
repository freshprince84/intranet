# LobbyPMS Integration - Test-Anleitung

## Schritt 2: LobbyPMS-Verbindung testen

### Option A: Über Test-Script (Empfohlen)

Ich habe ein Test-Script erstellt, das dich durch den Test führt:

```bash
cd backend
node scripts/test-lobbypms-connection.js 1
```

**Was das Script macht:**
1. Fragt nach Login-Daten
2. Testet die LobbyPMS-Verbindung
3. Zeigt Fehlermeldungen mit Lösungsvorschlägen
4. Optional: Ruft Reservierungen ab

### Option B: Manuell über API

#### 1. Login und Token erhalten

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dein-username",
    "password": "dein-passwort"
  }'
```

**Antwort:**
```json
{
  "message": "Login erfolgreich",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

#### 2. LobbyPMS-Verbindung testen

```bash
curl -X GET http://localhost:5000/api/lobby-pms/validate \
  -H "Authorization: Bearer DEIN_TOKEN"
```

**Erwartete Antwort (Erfolg):**
```json
{
  "success": true,
  "message": "Verbindung erfolgreich"
}
```

**Mögliche Fehler:**

**Fehler 1: "LobbyPMS ist nicht für diese Organisation konfiguriert"**
```json
{
  "success": false,
  "message": "LobbyPMS ist nicht für diese Organisation konfiguriert"
}
```
**Lösung:** 
- Prüfe ob Organisation Settings korrekt gesetzt sind
- Prüfe ob `lobbyPms.syncEnabled` auf `true` gesetzt ist

**Fehler 2: "LobbyPMS API Key ist nicht konfiguriert"**
```json
{
  "success": false,
  "message": "LobbyPMS API Key ist nicht für Organisation 1 konfiguriert"
}
```
**Lösung:**
- Öffne Organisation im Frontend
- Gehe zum Tab "API"
- Trage API Token ein
- Speichern

**Fehler 3: "ENCRYPTION_KEY environment variable is not set"**
```json
{
  "success": false,
  "message": "ENCRYPTION_KEY environment variable is not set"
}
```
**Lösung:**
- Füge `ENCRYPTION_KEY` zur `.env` Datei hinzu
- Starte Backend neu

### Option C: Über Frontend (wenn verfügbar)

1. Öffne Frontend
2. Gehe zu Organisationen
3. Wähle Organisation
4. Prüfe ob API-Tab sichtbar ist
5. Teste Verbindung (falls Button vorhanden)

## Schritt 3: Reservierungen synchronisieren

### Manuelle Synchronisation

```bash
curl -X POST http://localhost:5000/api/lobby-pms/sync \
  -H "Authorization: Bearer DEIN_TOKEN" \
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

### Reservierungen abrufen

```bash
curl -X GET "http://localhost:5000/api/lobby-pms/reservations?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer DEIN_TOKEN"
```

## Schritt 4: Check-in-Einladungen testen

### Manueller Trigger

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

## Schritt 5: Check-in durchführen

```bash
curl -X PUT http://localhost:5000/api/lobby-pms/reservations/1/check-in \
  -H "Authorization: Bearer DEIN_TOKEN"
```

## Schritt 6: SIRE-Registrierung testen

### Manuelle Registrierung

```bash
curl -X POST http://localhost:5000/api/lobby-pms/reservations/1/register-sire \
  -H "Authorization: Bearer DEIN_TOKEN"
```

### Status abrufen

```bash
curl -X GET http://localhost:5000/api/lobby-pms/reservations/1/sire-status \
  -H "Authorization: Bearer DEIN_TOKEN"
```

## Troubleshooting

### Server läuft nicht

**Symptom:** `curl: (7) Failed to connect to localhost port 5000`

**Lösung:**
```bash
cd backend
npm start
# oder
npm run dev
```

### Token abgelaufen

**Symptom:** `401 Unauthorized`

**Lösung:** Neu einloggen und neuen Token holen

### CORS-Fehler

**Symptom:** CORS-Fehler im Browser

**Lösung:** Prüfe CORS-Konfiguration in `backend/src/app.ts`


