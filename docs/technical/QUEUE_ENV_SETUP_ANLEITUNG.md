# Queue-Einstellungen zur .env hinzufügen - Anleitung

## Problem
Die Queue-Einstellungen fehlen in der `.env`-Datei auf dem Server, obwohl das Queue-System bereits implementiert ist.

## Lösung

### Option 1: Automatisches Skript (Empfohlen)

**Auf dem Server ausführen:**
```bash
cd /var/www/intranet
git pull  # Falls das Skript noch nicht auf dem Server ist
chmod +x scripts/add_queue_env_vars.sh
bash scripts/add_queue_env_vars.sh
```

Das Skript:
- Prüft, ob die Einstellungen bereits vorhanden sind
- Fügt nur fehlende Einstellungen hinzu
- Überschreibt keine bestehenden Werte

### Option 2: Manuell

**SSH auf Server:**
```bash
ssh root@65.109.228.106
cd /var/www/intranet/backend
nano .env
```

**Am Ende der Datei hinzufügen:**
```env
# Redis Configuration (für Queue-System)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Queue Configuration
QUEUE_ENABLED=true
QUEUE_CONCURRENCY=5
```

**Speichern:** Ctrl+X, dann Y, dann Enter

### Nach dem Hinzufügen

**Server neu starten (nach Rücksprache):**
```bash
pm2 restart intranet-backend
```

**Prüfen, ob Queue aktiv ist:**
```bash
pm2 logs intranet-backend | grep -i queue
```

Erwartete Ausgabe:
```
[Queue Service] ✅ Redis-Verbindung hergestellt
[Queue Service] ✅ Redis bereit
[Queue] ✅ Workers gestartet
```

## Warum ist das wichtig?

- **QUEUE_ENABLED=true**: Aktiviert das Queue-System für schnelle API-Responses
- **REDIS_HOST/PORT**: Verbindung zu Redis (läuft bereits auf dem Server)
- **QUEUE_CONCURRENCY=5**: Anzahl paralleler Worker-Jobs

Ohne diese Einstellungen läuft das System im synchronen Modus (langsamere Responses).

