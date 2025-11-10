# Server-Neustart erforderlich

## Problem

Die neuen LobbyPMS-Routen werden nicht gefunden (404 Fehler).

## Lösung

Der Backend-Server muss neu gestartet werden, damit die neuen Routen geladen werden.

### Schritt 1: TypeScript kompilieren

```bash
cd backend
npm run build
```

### Schritt 2: Server neu starten

**Option A: Wenn Server im Terminal läuft**
1. Stoppe den Server (Ctrl+C)
2. Starte neu:
   ```bash
   npm start
   # oder für Development:
   npm run dev
   ```

**Option B: Wenn Server als Service/Prozess läuft**
1. Finde den Prozess:
   ```bash
   # Windows
   netstat -ano | findstr :5000
   
   # Linux/Mac
   lsof -i :5000
   ```
2. Stoppe den Prozess
3. Starte neu:
   ```bash
   cd backend
   npm start
   ```

### Schritt 3: Test erneut durchführen

```bash
node scripts/test-lobbypms-connection.js 1
```

## Verifikation

Nach dem Neustart sollte die Route erreichbar sein:

```bash
curl -X GET http://localhost:5000/api/lobby-pms/validate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "message": "Verbindung erfolgreich"
}
```

**Oder wenn nicht konfiguriert:**
```json
{
  "success": false,
  "message": "LobbyPMS ist nicht für diese Organisation konfiguriert"
}
```


