# Claude-Datenbankzugriff

Dieses Dokument beschreibt die verschiedenen Methoden, die Claude verwenden kann, um direkten Zugriff auf die Intranet-Datenbank zu erhalten.

## 1. MCP (Model Context Protocol) - Primäre Methode

### Konfiguration

Die MCP-Konfiguration für Cursor ist in `mcp.json` gespeichert:

```json
{
  "mcpServers": {
    "postgres-intranet": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres:your_password@localhost:5432/intranet"
      ]
    }
  }
}
```

**Wichtig:** Die Datenbank-URL muss als Kommandozeilenargument übergeben werden, nicht als Umgebungsvariable.

### Nutzung

Mit aktiviertem MCP kann Claude direkten SQL-Zugriff verwenden:

```sql
-- Benutzer anzeigen
SELECT id, username, email, "firstName", "lastName" FROM "User" LIMIT 10;

-- Aktive Arbeitszeiten
SELECT u.username, w."startTime", w."endTime" 
FROM "WorkTime" w 
JOIN "User" u ON w."userId" = u.id 
WHERE w."endTime" IS NULL;

-- Aufgabenübersicht
SELECT t.title, t.status, u.username as assigned_to
FROM "Task" t
LEFT JOIN "User" u ON t."responsibleId" = u.id
ORDER BY t."createdAt" DESC
LIMIT 20;
```

## 2. Fallback: REST-API-Endpunkte

Für Fälle, wo MCP nicht verfügbar ist, bietet das Backend spezielle Claude-Endpunkte:

### Authentifizierung

Alle Endpunkte erfordern ein Bearer-Token:

```
Authorization: Bearer claude-dev-token
```

Der Token wird über die Umgebungsvariable `CLAUDE_API_TOKEN` konfiguriert.

### Verfügbare Endpunkte

#### Datenbankschema
```http
GET /api/claude/tables
```

Liefert eine Übersicht aller Tabellen mit Spalteninformationen.

#### Sichere SQL-Abfragen
```http
POST /api/claude/query
Content-Type: application/json

{
  "query": "SELECT id, username, email FROM \"User\" WHERE \"isActive\" = true LIMIT 10"
}
```

Erlaubt nur SELECT-Queries. Gefährliche Keywords werden blockiert.

#### Statistiken
```http
GET /api/claude/stats
```

Liefert grundlegende Datenbankstatistiken:
```json
{
  "users": 25,
  "tasks": 156,
  "workTimes": 892,
  "requests": 43,
  "timestamp": "2025-01-21T10:30:00.000Z"
}
```

#### Tabellendaten mit Pagination
```http
GET /api/claude/table/User?limit=10&offset=0
```

Erlaubte Tabellen (Whitelist):
- User
- Task
- Request
- WorkTime
- Role
- Permission
- Branch
- Settings
- Notification
- CerebroCarticle
- Client
- ConsultationInvoice

## 3. Sicherheitsmaßnahmen

### MCP-Server
- Nur Lese-Zugriff empfohlen
- Verbindung über localhost
- Umgebungsvariablen für Credentials

### REST-API
- Bearer-Token-Authentifizierung
- Nur SELECT-Queries erlaubt
- Keyword-Filtering gegen gefährliche Operationen
- Query-Länge begrenzt (max. 2000 Zeichen)
- Whitelist für erlaubte Tabellen
- Pagination mit maximaler Anzahl von Einträgen

## 4. Verwendungsbeispiele

### Datenanalyse
```sql
-- Arbeitszeit-Trends
SELECT 
    DATE_TRUNC('week', "startTime") as week,
    COUNT(*) as sessions,
    AVG(EXTRACT(EPOCH FROM ("endTime" - "startTime"))/3600) as avg_hours
FROM "WorkTime" 
WHERE "endTime" IS NOT NULL
GROUP BY week
ORDER BY week DESC
LIMIT 10;
```

### Debugging von Problemen
```sql
-- Finde Benutzer ohne Arbeitszeiten
SELECT u.id, u.username, u.email
FROM "User" u
LEFT JOIN "WorkTime" w ON u.id = w."userId"
WHERE w.id IS NULL
  AND u."isActive" = true;
```

### Datenintegrität prüfen
```sql
-- Finde Arbeitszeiten ohne Endzeit (potenzielle Leaks)
SELECT 
    u.username,
    w."startTime",
    w."startComment"
FROM "WorkTime" w
JOIN "User" u ON w."userId" = u.id
WHERE w."endTime" IS NULL
  AND w."startTime" < NOW() - INTERVAL '24 hours';
```

## 5. Einschränkungen

### MCP
- Erfordert lokale PostgreSQL-Verbindung
- Nur verfügbar wenn Cursor MCP unterstützt
- Kann Performance-Auswirkungen haben

### REST-API
- Nur Lese-Zugriff
- Begrenzte Query-Komplexität
- Rate-Limiting möglich
- Erfordert laufenden Server

## 6. Konfiguration anpassen

### Datenbankverbindung ändern
```bash
# In mcp.json - Die URL muss als Argument übergeben werden:
"args": [
  "@modelcontextprotocol/server-postgres",
  "postgresql://username:password@host:port/database"
]
```

### Sicherheits-Token ändern
```bash
# In backend/.env
CLAUDE_API_TOKEN=your-secure-token-here
```

### Neue Tabellen freischalten
```typescript
// In backend/src/routes/claudeRoutes.ts
const allowedTables = [
  'User', 'Task', 'Request', 'WorkTime', 'Role', 'Permission',
  'Branch', 'Settings', 'Notification', 'CerebroCarticle',
  'Client', 'ConsultationInvoice',
  'YourNewTable' // Hier hinzufügen
];
```

## 7. Troubleshooting

### MCP funktioniert nicht
1. Prüfe ob `@modelcontextprotocol/server-postgres` installiert ist
2. Verifiziere Datenbankverbindung
3. Prüfe Cursor-MCP-Konfiguration

### REST-API Fehler 401
- Prüfe Authorization-Header
- Verifiziere Token in .env

### REST-API Fehler 403
- Query enthält gefährliche Keywords
- Tabelle nicht in Whitelist
- Query zu lang

### Performance-Probleme
- Limitiere große Abfragen
- Verwende Indizes
- Nutze Pagination für große Datensätze

## 3. Frontend Console Bridge - Browser Developer Tools Zugriff

Zusätzlich zum Datenbankzugriff kannst du nun auch auf Frontend-Console-Logs zugreifen:

### Wie es funktioniert

1. **Automatische Log-Weiterleitung**: Alle `console.log`, `console.error`, etc. im Frontend werden automatisch an das Backend weitergeleitet
2. **WebSocket-Verbindung**: Live-Stream der Frontend-Logs im Backend-Terminal
3. **Strukturierte Logs**: Inklusive Zeitstempel, Benutzer-ID, URL und Stack-Traces

### Verfügbare Console-Endpunkte

#### Aktuelle Frontend-Logs abrufen
```http
GET /api/claude/console/logs?limit=50
GET /api/claude/console/logs?level=error&limit=20
GET /api/claude/console/logs?user=123&limit=30
GET /api/claude/console/logs?search=api&limit=25
```

#### Console-Statistiken
```http
GET /api/claude/console/stats
```

Beispiel-Response:
```json
{
  "total": 1250,
  "byLevel": {
    "log": 800,
    "error": 45,
    "warn": 150,
    "info": 255
  },
  "byUser": {
    "user123": 400,
    "user456": 850
  },
  "lastHour": 89
}
```

#### Logs nach Zeitraum
```http
GET /api/claude/console/timerange?start=2025-01-21T08:00:00Z&end=2025-01-21T18:00:00Z
```

### Automatische Integration

Die Claude Console Bridge wird automatisch aktiviert, wenn das Frontend geladen wird:

```typescript
// Automatisch in App.tsx integriert
useEffect(() => {
  initClaudeConsole();
  console.log('🔍 Claude Console Bridge initialized');
}, []);
```

### Live-Ausgabe im Backend

Wenn Frontend-Logs ausgeführt werden, siehst du sie sofort im Backend-Terminal:

```
2025-01-21 10:30:15 📝 LOG [User: 123] [/worktracker]: Zeiterfassung gestartet
2025-01-21 10:30:16 🚨 ERROR [User: 123] [/worktracker]: API request failed
Arguments: [{ status: 500, message: "Server Error" }]
```

### Erweiterte Features

- **Performance-Monitoring**: Automatische Erfassung von API-Request-Zeiten
- **Error-Tracking**: Globale Error- und Promise-Rejection-Handler
- **User-Context**: Automatische Zuordnung zu angemeldeten Benutzern
- **Offline-Pufferung**: Logs werden gespeichert, falls WebSocket getrennt ist

### Verwendungsbeispiele

```typescript
// Standard Console-Logs (werden automatisch weitergeleitet)
console.log('Benutzer hat sich angemeldet');
console.error('API-Fehler:', error);

// Spezielle Claude-Logs
import { getClaudeConsole } from './utils/claudeConsole';
const claude = getClaudeConsole();

claude?.claudeLog('Debug-Information für Claude', { userId: 123, action: 'login' });
claude?.logPerformance('API-Request', 250);
claude?.logApiRequest('POST', '/api/auth/login', 200, 180);
``` 