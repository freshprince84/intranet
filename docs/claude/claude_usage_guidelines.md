# Claude-Tool-Nutzungsrichtlinien

Diese Richtlinien definieren, wann und wie Claude die verfügbaren Tools automatisch nutzen soll.

## Verfügbare Tools

### 1. MCP-Datenbankzugriff (Primär)
- **Automatisch verfügbar** über SQL-Abfragen
- **Nutze wenn:** Datenbankanalyse, Debugging von Datenproblemen, Benutzer-/Content-Statistiken benötigt werden
- **Beispiele:** User-Counts, aktive Arbeitszeiten, Task-Status, Performance-Metriken

### 2. REST-API Datenbankzugriff (Fallback)
- **Nutze wenn:** MCP nicht verfügbar oder für spezielle Abfragen
- **Endpunkt:** `http://localhost:5000/api/claude/*`
- **Authentifizierung:** `Authorization: Bearer claude-dev-token`

### 3. Frontend-Console-Monitoring
- **Immer aktiv** wenn Frontend läuft
- **Nutze wenn:** Frontend-Debugging, Error-Tracking, User-Verhalten analysieren
- **Endpunkt:** `http://localhost:5000/api/claude/console/*`

## Automatische Nutzungsregeln

### Bei Debugging-Anfragen
1. **Frontend-Probleme** → Zuerst Console-Logs prüfen
2. **Backend-Probleme** → Datenbankstatus via MCP prüfen
3. **Performance-Issues** → Beide Tools kombiniert nutzen

### Bei Datenanalyse-Anfragen
1. **User-Statistiken** → MCP SQL-Abfragen
2. **Aktivitäts-Monitoring** → Console-Logs + Datenbank
3. **System-Health** → Kombinierte Metriken

### Bei Entwicklungs-Support
1. **Code-Changes-Impact** → Console für Frontend, MCP für Datenbank
2. **Feature-Testing** → Live-Monitoring über Console
3. **Error-Investigation** → Console-Logs für Stack-Traces, DB für Datenintegrität

## Beispiel-Workflows

### Workflow: User-Problem debuggen
```bash
# 1. Console-Logs des Users prüfen
curl -H "Authorization: Bearer claude-dev-token" \
  "http://localhost:5000/api/claude/console/logs?user=123&limit=20"

# 2. User-Status in DB prüfen
```sql
SELECT id, username, email, "isActive", "lastLoginAt" 
FROM "User" WHERE id = 123;
```

### Workflow: Performance-Problem analysieren  
```bash
# 1. API-Performance-Logs
curl -H "Authorization: Bearer claude-dev-token" \
  "http://localhost:5000/api/claude/console/logs?search=API&limit=50"

# 2. Datenbank-Performance
```sql
SELECT table_name, pg_size_pretty(pg_total_relation_size(table_name::regclass)) as size
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY pg_total_relation_size(table_name::regclass) DESC;
```

### Workflow: Feature-Impact messen
```bash
# 1. Error-Rate vor/nach Deploy
curl -H "Authorization: Bearer claude-dev-token" \
  "http://localhost:5000/api/claude/console/stats"

# 2. User-Aktivität in DB
```sql
SELECT DATE_TRUNC('hour', "createdAt") as hour, COUNT(*) as activity
FROM "WorkTime" 
WHERE "createdAt" > NOW() - INTERVAL '24 hours'
GROUP BY hour ORDER BY hour;
```

## Proaktive Nutzung

### Wann automatisch Tools nutzen:
1. **User erwähnt "Fehler"** → Console-Logs prüfen
2. **User erwähnt "langsam"** → Performance-Logs + DB-Größe prüfen
3. **User erwähnt "Daten fehlen"** → DB-Integrität prüfen
4. **User fragt nach "Statistiken"** → DB-Abfragen ausführen
5. **User berichtet "funktioniert nicht"** → Console + DB kombiniert

### Wann NICHT automatisch nutzen:
1. **Reine Code-Fragen** ohne Debugging-Kontext
2. **Theoretische Diskussionen**
3. **Wenn User explizit nur Anleitung möchte**

## Tool-Integration in Antworten

### Best Practices:
1. **Führe Tools aus, erkläre dann** was gefunden wurde
2. **Kombiniere mehrere Quellen** für vollständiges Bild
3. **Zeige konkrete Daten** statt nur zu erklären
4. **Verwende Tools zur Verifikation** von Vermutungen

### Antwort-Format:
```
🔍 **Live-Analyse:**
[Tool-Output mit Erklärung]

📊 **Gefundene Daten:**
[Zusammenfassung der Erkenntnisse]

💡 **Empfehlung:**
[Basierend auf den realen Daten]
```

## Sicherheitsrichtlinien

### MCP-Nutzung:
- ✅ SELECT-Queries für Analyse
- ✅ Aggregations-Funktionen
- ❌ NIEMALS INSERT/UPDATE/DELETE
- ❌ Keine Passwort-/Token-Felder abfragen

### Console-API-Nutzung:
- ✅ Logs für Debugging abrufen
- ✅ Statistiken analysieren
- ❌ Keine sensitiven User-Daten ausgeben
- ❌ Logs nicht modifizieren

Diese Richtlinien stellen sicher, dass Claude die verfügbaren Tools optimal und sicher nutzt, um bestmöglichen Support zu bieten. 