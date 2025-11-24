# Automatisches Deployment - Implementierungsplan

## Übersicht

Dieses Dokument beschreibt verschiedene Optionen für die Einrichtung automatischer Deployments auf den Produktivserver.

## Aktuelle Situation

- **Repository**: `https://github.com/freshprince84/intranet.git`
- **Server**: Hetzner (65.109.228.106)
- **Server-Pfad**: `/var/www/intranet`
- **SSH-Key**: `~/.ssh/intranet_rsa`
- **Bestehendes Deployment-Skript**: `deploy_to_server.sh` (auf Server vorhanden)

## Optionen für automatische Deployments

### Option 1: GitHub Actions (CI/CD Pipeline) ⭐ EMPFOHLEN

**Vorteile:**
- Automatisches Deployment bei jedem Push auf `main` Branch
- Tests vor Deployment möglich
- Deployment-Status sichtbar in GitHub
- Keine Server-Konfiguration nötig (nur SSH-Key als Secret)
- Rollback möglich durch Git-Tags

**Nachteile:**
- Erfordert GitHub Secrets Setup
- Deployment läuft auf GitHub-Servern (nicht lokal)

**Implementierung:**
- GitHub Actions Workflow erstellen (`.github/workflows/deploy.yml`)
- SSH-Key als GitHub Secret hinterlegen
- Workflow triggert bei Push auf `main` Branch
- Führt `deploy_to_server.sh` auf Server aus

**Benötigte Schritte:**
1. GitHub Actions Workflow erstellen
2. SSH-Private-Key als GitHub Secret hinzufügen
3. Server-IP und User als Secrets hinzufügen (optional)
4. Workflow testen

---

### Option 2: Git Hooks (post-receive auf Server)

**Vorteile:**
- Läuft direkt auf dem Server
- Keine externen Dependencies
- Sehr schnell

**Nachteile:**
- Erfordert Bare Repository auf Server
- Oder: Webhook-Server auf Server
- Manuelles Setup auf Server nötig

**Implementierung:**
- Bare Repository auf Server einrichten
- `post-receive` Hook erstellen
- Hook führt `deploy_to_server.sh` aus

**Benötigte Schritte:**
1. Bare Repository auf Server einrichten
2. `post-receive` Hook erstellen
3. Git Remote auf lokalem Rechner anpassen

---

### Option 3: Webhook-basiertes Deployment

**Vorteile:**
- Flexibel konfigurierbar
- Kann auf bestimmte Branches/Tags reagieren
- Kann zusätzliche Checks durchführen

**Nachteile:**
- Erfordert Webhook-Server auf Server
- Erfordert Port-Öffnung (oder Tunnel)

**Implementierung:**
- Webhook-Server auf Server (z.B. mit Node.js)
- GitHub Webhook konfigurieren
- Webhook führt `deploy_to_server.sh` aus

**Benötigte Schritte:**
1. Webhook-Server auf Server installieren
2. GitHub Webhook konfigurieren
3. Webhook-Server starten (z.B. mit PM2)

---

### Option 4: MCP Server für Deployment ⭐ EMPFOHLEN

**Vorteile:**
- ✅ **Vollautomatisch**: AI-Assistent kann Deployment automatisch auslösen nach Commit/Push
- ✅ **Einfachste Lösung**: Keine GitHub Secrets, keine GitHub Actions Konfiguration
- ✅ **Direkt aus Cursor steuerbar**: Alles in einer Umgebung
- ✅ **Bestehende Infrastruktur nutzen**: SSH-Key bereits vorhanden, Deployment-Skript bereits auf Server
- ✅ **Flexibel**: Kann manuell getriggert werden oder automatisch
- ✅ **Schnell**: Keine externe CI/CD-Pipeline, direkte SSH-Verbindung

**Nachteile:**
- Erfordert MCP Server Setup (einmalig)
- Deployment läuft lokal (nicht auf GitHub-Servern)

**Implementierung:**
- MCP Server erstellen mit Deployment-Funktionen
- SSH-Verbindung zum Server über vorhandenen SSH-Key
- Deployment-Skript auf Server ausführen (`deploy_to_server.sh`)
- AI-Assistent kann automatisch Deployment auslösen nach erfolgreichem Push

**Benötigte Schritte:**
1. MCP Server erstellen (Node.js-basiert)
2. Deployment-Funktionen implementieren (SSH + Skript-Ausführung)
3. In `mcp.json` konfigurieren (neben bestehendem Postgres-MCP)
4. AI-Assistent kann dann automatisch Deployment auslösen

---

### Option 5: Cron-Job (periodisches Pull)

**Vorteile:**
- Einfach zu implementieren
- Keine externe Konfiguration nötig

**Nachteile:**
- Nicht sofort nach Commit (Verzögerung)
- Läuft auch wenn keine Änderungen vorhanden
- Kann zu Konflikten führen wenn mehrere Deployments gleichzeitig

**Implementierung:**
- Cron-Job auf Server einrichten
- Führt regelmäßig `git pull` und `deploy_to_server.sh` aus

**Benötigte Schritte:**
1. Cron-Job auf Server einrichten
2. Deployment-Skript anpassen (idempotent machen)

---

## Empfehlung: Option 4 (MCP Server) ⭐

**Warum MCP Server?**
- ✅ **Einfachste Lösung**: Keine externe Konfiguration nötig
- ✅ **Vollautomatisch**: AI-Assistent kann Deployment automatisch auslösen
- ✅ **Bestehende Infrastruktur nutzen**: SSH-Key und Deployment-Skript bereits vorhanden
- ✅ **Direkt aus Cursor**: Alles in einer Umgebung, keine GitHub-Konfiguration
- ✅ **Schnell**: Direkte SSH-Verbindung, keine CI/CD-Pipeline-Wartezeit
- ✅ **Flexibel**: Kann manuell oder automatisch getriggert werden

**Vergleich mit GitHub Actions:**
- MCP: Einfacher Setup, direkter Zugriff, automatisch durch AI-Assistent
- GitHub Actions: Mehr Konfiguration, externe Abhängigkeit, aber sichtbar in GitHub

## Implementierungsplan für MCP Server ✅ ABGESCHLOSSEN

### Phase 1: MCP Server erstellen ✅

1. **MCP Server Projektstruktur** ✅
   - Neues Verzeichnis: `mcp-servers/deployment/` ✅
   - Node.js-basierter MCP Server ✅
   - Verwendet `@modelcontextprotocol/sdk` ✅

2. **Deployment-Funktionen implementieren** ✅
   - `deploy_to_production`: Führt Deployment auf Server aus ✅
   - SSH-Verbindung über vorhandenen SSH-Key (`~/.ssh/intranet_rsa`) ✅
   - Führt `deploy_to_server.sh` auf Server aus ✅
   - Gibt Deployment-Logs zurück ✅
   - `check_server_connection`: Prüft SSH-Verbindung ✅

3. **MCP Server konfigurieren** ✅
   - Tools definieren: `deploy_to_production`, `check_server_connection` ✅
   - SSH-Verbindung konfigurieren ✅
   - Server-Details: IP, User, Pfad ✅

### Phase 2: MCP Server in Cursor konfigurieren ✅

1. **mcp.json aktualisieren** ✅
   - Neuen MCP Server hinzugefügt ✅
   - Neben bestehendem `postgres-intranet` Server ✅
   - Konfiguration für Deployment-Server ✅

2. **MCP Server builden** ✅
   - Dependencies installiert ✅
   - TypeScript kompiliert ✅
   - Build erfolgreich ✅

### Phase 3: Automatisches Deployment einrichten ✅

1. **AI-Assistent konfigurieren** ✅
   - MCP Server ist bereit für automatisches Deployment ✅
   - AI-Assistent kann `deploy_to_production` Tool aufrufen ✅
   - Deployment-Status wird zurückgegeben ✅

2. **Dokumentation aktualisieren** ✅
   - DEPLOYMENT.md aktualisiert mit MCP-Abschnitt ✅
   - MCP Server README erstellt ✅
   - Automatisches Deployment beschrieben ✅

## Verwendung

### Automatisch durch AI-Assistent

Nach dem Commit und Push kann der AI-Assistent automatisch das Deployment auslösen:

```
Ich habe die Änderungen committed und gepusht. Bitte führe das Deployment aus.
```

### Manuell

Das Tool kann auch manuell über den AI-Assistenten aufgerufen werden:

```
Bitte führe ein Deployment auf den Produktivserver aus.
```

### Server-Verbindung testen

```
Bitte prüfe die Server-Verbindung.
```

## Nächste Schritte

1. **Entscheidung treffen**: Welche Option soll implementiert werden?
2. **Plan bestätigen**: Soll ich mit der Implementierung beginnen?
3. **Umsetzung**: Workflow/Skript erstellen und testen

## Wichtige Hinweise

- ⚠️ **Server-Neustart**: Wie in den Regeln festgelegt, darf ich Server nicht neu starten. Das Deployment-Skript sollte den Server-Neustart als separaten Schritt dokumentieren, der manuell ausgeführt wird.
- ⚠️ **Tests**: Vor automatischem Deployment sollten Tests durchgeführt werden (falls vorhanden).
- ⚠️ **Rollback**: Bei Problemen sollte ein Rollback-Mechanismus vorhanden sein (z.B. Git-Tags für bekannte gute Versionen).

