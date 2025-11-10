# LobbyPMS Integration - Schnellstart

## Schritt 2: LobbyPMS-Verbindung testen

### Voraussetzungen prüfen

1. **Backend-Server läuft?**
   ```bash
   curl http://localhost:5000/api/test-route
   ```
   
   **Wenn nicht:**
   ```bash
   cd backend
   npm start
   # oder für Development:
   npm run dev
   ```

2. **ENCRYPTION_KEY gesetzt?**
   ```bash
   # Prüfe .env Datei
   grep ENCRYPTION_KEY backend/.env
   ```

### Test durchführen

#### Option 1: Test-Script (Einfachste Methode)

```bash
cd backend
node scripts/test-lobbypms-connection.js 1
```

Das Script führt dich durch:
1. Login
2. LobbyPMS-Verbindungstest
3. Optional: Reservierungen abrufen

#### Option 2: Manuell mit curl

**1. Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "dein-username", "password": "dein-passwort"}'
```

**2. Token speichern:**
```bash
# Kopiere den Token aus der Antwort
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**3. LobbyPMS-Verbindung testen:**
```bash
curl -X GET http://localhost:5000/api/lobby-pms/validate \
  -H "Authorization: Bearer $TOKEN"
```

### Erwartete Ergebnisse

#### ✅ Erfolg:
```json
{
  "success": true,
  "message": "Verbindung erfolgreich"
}
```

#### ❌ Fehler: "LobbyPMS ist nicht konfiguriert"
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

#### ❌ Fehler: "ENCRYPTION_KEY nicht gesetzt"
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

### Nächste Schritte

Nach erfolgreichem Verbindungstest:

**Schritt 3:** Reservierungen synchronisieren
```bash
curl -X POST http://localhost:5000/api/lobby-pms/sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2024-01-01", "endDate": "2024-01-31"}'
```

**Schritt 4:** Check-in-Einladungen testen
```bash
curl -X POST http://localhost:5000/api/admin/trigger-check-in-invitations
```

**Schritt 5:** Check-in durchführen
```bash
curl -X PUT http://localhost:5000/api/lobby-pms/reservations/1/check-in \
  -H "Authorization: Bearer $TOKEN"
```

**Schritt 6:** SIRE-Registrierung testen
```bash
curl -X POST http://localhost:5000/api/lobby-pms/reservations/1/register-sire \
  -H "Authorization: Bearer $TOKEN"
```


