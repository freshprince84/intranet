# Schritt 2: LobbyPMS-Verbindung testen

## Test durchführen

### Option 1: Einfaches Test-Script (Empfohlen)

```bash
cd backend
node scripts/test-lobbypms-simple.js <username> <password> [organizationId]
```

**Beispiel:**
```bash
node scripts/test-lobbypms-simple.js admin password123 1
```

**Was passiert:**
1. Login mit deinen Credentials
2. Testet LobbyPMS-Verbindung
3. Zeigt Ergebnis und Fehlermeldungen mit Lösungsvorschlägen

### Option 2: Interaktives Test-Script

```bash
cd backend
node scripts/test-lobbypms-connection.js 1
```

Das Script fragt interaktiv nach Login-Daten.

### Option 3: Manuell mit curl

**1. Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "dein-username", "password": "dein-passwort"}'
```

**2. Token kopieren und testen:**
```bash
export TOKEN="<token-aus-login-response>"

curl -X GET http://localhost:5000/api/lobby-pms/validate \
  -H "Authorization: Bearer $TOKEN"
```

## Erwartete Ergebnisse

### ✅ Erfolg (wenn LobbyPMS konfiguriert ist):
```json
{
  "success": true,
  "message": "Verbindung erfolgreich"
}
```

### ⚠️ Nicht konfiguriert:
```json
{
  "success": false,
  "message": "LobbyPMS ist nicht für diese Organisation konfiguriert"
}
```

**Lösung:**
1. Frontend öffnen
2. Organisation bearbeiten
3. Tab "API" öffnen
4. LobbyPMS konfigurieren:
   - API Token eintragen
   - Property ID eintragen
   - Synchronisation aktivieren
5. Speichern

### ❌ Fehler: "LobbyPMS API Key ist nicht konfiguriert"
```json
{
  "success": false,
  "message": "LobbyPMS API Key ist nicht für Organisation 1 konfiguriert"
}
```

**Lösung:** Siehe oben - API Token in Organisation Settings eintragen.

### ❌ Fehler: "ENCRYPTION_KEY environment variable is not set"
```json
{
  "error": "ENCRYPTION_KEY environment variable is not set"
}
```

**Lösung:**
1. Encryption Key generieren:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. In `backend/.env` hinzufügen:
   ```
   ENCRYPTION_KEY=<generierter-key>
   ```
3. Backend neu starten

## Nächste Schritte

Nach erfolgreichem Verbindungstest:

**Schritt 3:** Reservierungen synchronisieren
**Schritt 4:** Check-in-Einladungen testen
**Schritt 5:** Check-in durchführen
**Schritt 6:** SIRE-Registrierung testen


