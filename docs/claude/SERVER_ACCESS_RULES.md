# Server-Zugriff Regeln für Claude

## 🚨 KRITISCH: SSH DIREKT IST STRENGSTENS VERBOTEN!

**⚠️ ABSOLUTE REGEL - KEINE AUSNAHMEN:**
- **SSH-Befehle können NICHT direkt ausgeführt werden** - SSH erfordert Key + Passwort, das interaktiv eingegeben werden muss
- **Claude kann keine interaktiven Passwörter eingeben** - Daher funktionieren direkte SSH-Befehle nicht
- **NUR MCP-Tools verwenden** - Für alle Server-Operationen müssen MCP-Tools verwendet werden

## Verfügbare MCP-Tools

### 1. Server-Verbindung prüfen
```typescript
mcp_intranet-deployment_check_server_connection()
```
- Prüft die SSH-Verbindung zum Produktivserver
- Gibt Server-Info zurück (uname -a, etc.)

### 2. Deployment ausführen
```typescript
mcp_intranet-deployment_deploy_to_production({ confirm: true })
```
- Führt vollständiges Deployment auf dem Server aus
- Führt `deploy_to_server.sh` auf dem Server aus
- Beinhaltet: Git Pull, Migrationen, Builds, etc.

## Server-Konfiguration

**WICHTIG: Korrekte Server-Pfade verwenden!**

- **Server IP**: `65.109.228.106`
- **Server-Pfad**: `/var/www/intranet` ⚠️ **NICHT `/root/intranet-backend`!**
- **Backend-Pfad**: `/var/www/intranet/backend`
- **Frontend-Pfad**: `/var/www/intranet/frontend`
- **Backend .env**: `/var/www/intranet/backend/.env`

## Verbotene Befehle

❌ **STRENGSTENS VERBOTEN:**
```bash
# Diese Befehle funktionieren NICHT:
ssh root@65.109.228.106 "command"
ssh -i ~/.ssh/key root@65.109.228.106 "command"
run_terminal_cmd("ssh root@...")
```

## Erlaubte Methoden

✅ **ERLAUBT:**
```typescript
// MCP-Tool verwenden
mcp_intranet-deployment_check_server_connection()

// Oder für Deployment
mcp_intranet-deployment_deploy_to_production({ confirm: true })
```

## Beispiel: Prüfen ob OPENAI_API_KEY gesetzt ist

**FALSCH (funktioniert nicht):**
```bash
ssh root@65.109.228.106 "grep OPENAI_API_KEY /var/www/intranet/backend/.env"
```

**RICHTIG:**
- MCP-Tool verwenden, um auf Server zuzugreifen
- Oder: User bitten, den Key zu prüfen
- Oder: In den Backend-Logs nach Fehlern suchen

## Checkliste vor Server-Zugriff

- [ ] Gibt es ein MCP-Tool für diese Operation?
- [ ] Wenn ja: MCP-Tool verwenden
- [ ] Wenn nein: User fragen, ob er die Operation ausführen kann
- [ ] Server-Pfad ist `/var/www/intranet` (nicht `/root/` oder andere)
- [ ] Keine direkten SSH-Befehle verwenden

## Weitere Informationen

- Siehe: `mcp-servers/deployment/README.md` - MCP Deployment Server Dokumentation
- Siehe: `docs/claude/README.md` - Claude-spezifische Regeln
- Siehe: `docs/technical/DEPLOYMENT.md` - Deployment-Dokumentation

