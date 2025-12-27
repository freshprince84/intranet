# MCP Deployment Server

MCP Server für automatisches Deployment auf den Produktivserver.

## Funktionalität

Dieser MCP Server ermöglicht es, automatisch Deployments auf den Hetzner-Produktivserver auszuführen.

### Verfügbare Tools

1. **deploy_to_production**
   - Führt vollständiges Deployment auf dem Server aus
   - Führt `deploy_to_server.sh` auf dem Server aus
   - Beinhaltet: Git Pull, Migrationen, Builds, etc.
   - ⚠️ **WICHTIG**: Server-Neustart muss manuell durchgeführt werden

2. **check_server_connection**
   - Prüft die SSH-Verbindung zum Server
   - Nützlich zum Testen der Verbindung

## Setup

### 1. Dependencies installieren

```bash
cd mcp-servers/deployment
npm install
```

### 2. Build

```bash
npm run build
```

### 3. Konfiguration

Die Konfiguration erfolgt über Umgebungsvariablen in `mcp.json`:

- `DEPLOY_SERVER_HOST`: Server-IP (Standard: 65.109.228.106)
- `DEPLOY_SERVER_USER`: SSH-User (Standard: root)
- `DEPLOY_SSH_KEY_PATH`: Pfad zum SSH-Private-Key (Standard: ~/.ssh/intranet_rsa)
- `DEPLOY_SSH_KEY_PASSPHRASE`: Passwort für den SSH-Key (optional, falls Key passwortgeschützt ist)
- `DEPLOY_SERVER_PATH`: Pfad auf dem Server (Standard: /var/www/intranet)
- `DEPLOY_SCRIPT_PATH`: Pfad zum Deployment-Skript (Standard: /var/www/intranet/deploy_to_server.sh)

### 4. MCP Server in Cursor aktivieren

Der Server ist bereits in `mcp.json` konfiguriert. Nach dem Build sollte er automatisch verfügbar sein.

## Verwendung

### Automatisch durch AI-Assistent

Der AI-Assistent kann automatisch das Deployment auslösen, nachdem Änderungen committed und gepusht wurden:

```
Ich habe die Änderungen committed und gepusht. Bitte führe das Deployment aus.
```

### Manuell

Das Tool kann auch manuell über den AI-Assistenten aufgerufen werden:

```
Bitte führe ein Deployment auf den Produktivserver aus.
```

## Voraussetzungen

1. **SSH-Key**: Der SSH-Private-Key muss unter `~/.ssh/intranet_rsa` vorhanden sein
2. **Server-Zugriff**: SSH-Zugriff zum Server muss funktionieren
3. **Deployment-Skript**: Das Skript `deploy_to_server.sh` muss auf dem Server vorhanden sein

## Fehlerbehandlung

Bei Fehlern:
1. Prüfe die SSH-Verbindung mit `check_server_connection`
2. Prüfe, ob der SSH-Key korrekt ist
3. Prüfe die Server-Logs auf dem Server

## Wichtige Hinweise

- ⚠️ **Server-Neustart**: Nach dem Deployment muss der Server manuell neu gestartet werden:
  - `pm2 restart intranet-backend`
  - `sudo systemctl restart nginx`
- ⚠️ **Deployment-Dauer**: Das Deployment kann mehrere Minuten dauern (Builds, Migrationen, etc.)
- ⚠️ **Timeout**: Das Deployment hat ein Timeout von 10 Minuten


