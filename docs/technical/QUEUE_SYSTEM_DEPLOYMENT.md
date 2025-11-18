# Queue-System: Deployment-Anleitung

## Übersicht

Das Queue-System benötigt **Redis** als Message Broker. Diese Anleitung beschreibt die Installation und Konfiguration für:
- Lokale Entwicklungsumgebung
- Hetzner Server (Produktivumgebung)

---

## 1. Lokale Entwicklungsumgebung

### Windows

**Option A: Docker (Empfohlen)**
```bash
# Redis Container starten
docker run -d -p 6379:6379 --name redis-queue redis:7-alpine

# Container-Status prüfen
docker ps | grep redis

# Container stoppen (falls nötig)
docker stop redis-queue

# Container starten (falls gestoppt)
docker start redis-queue
```

**Option B: WSL2 (Windows Subsystem for Linux)**
```bash
# In WSL2 Terminal
sudo apt-get update
sudo apt-get install redis-server
sudo service redis-server start
```

### Linux/Mac

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Mac (Homebrew)
brew install redis
brew services start redis
```

### Prüfung

```bash
# Redis-Verbindung testen
redis-cli ping
# Erwartete Antwort: PONG
```

---

## 2. Hetzner Server (Produktivumgebung)

**Siehe**: `docs/technical/QUEUE_SYSTEM_HETZNER_SETUP.md` für vollständige Anleitung

### Installation (Kurzfassung)

**Option A: Automatisches Setup-Skript (Empfohlen)**
```bash
# SSH auf Server
ssh root@65.109.228.106

# Skript ausführen
cd /var/www/intranet
chmod +x scripts/setup-redis-on-server.sh
./scripts/setup-redis-on-server.sh
```

**Option B: Manuelle Installation**
```bash
# SSH auf Server
ssh root@65.109.228.106

# Redis installieren
sudo apt-get update
sudo apt-get install redis-server -y

# Redis als Service starten
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Status prüfen
sudo systemctl status redis-server
```

### Konfiguration

**Redis-Konfiguration anpassen (optional):**
```bash
sudo nano /etc/redis/redis.conf
```

Wichtige Einstellungen:
```conf
# Bind nur auf localhost (Sicherheit)
bind 127.0.0.1

# Passwort setzen (empfohlen für Produktion)
requirepass dein-sicheres-passwort

# Persistenz aktivieren
save 900 1
save 300 10
save 60 10000
```

**Redis neu starten nach Konfigurationsänderungen:**
```bash
sudo systemctl restart redis-server
```

### Firewall (falls aktiv)

```bash
# Redis läuft standardmäßig nur auf localhost (Port 6379)
# Keine Firewall-Regel nötig, da nur lokal erreichbar
```

### Prüfung

```bash
# Redis-Verbindung testen
redis-cli ping
# Erwartete Antwort: PONG

# Mit Passwort (falls gesetzt)
redis-cli -a dein-sicheres-passwort ping
```

---

## 3. Environment-Variablen

### Lokale `.env` Datei

Die `.env` Datei ist **NICHT** im Git enthalten (siehe `.gitignore`). Sie muss **manuell** konfiguriert werden.

**Lokal (bereits gesetzt):**
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

### Hetzner Server `.env` Datei

**WICHTIG**: Die `.env` Datei muss **manuell** auf dem Server aktualisiert werden!

**Schritt 1: SSH auf Server**
```bash
ssh root@65.109.228.106
```

**Schritt 2: `.env` Datei bearbeiten**
```bash
cd /var/www/intranet/backend
nano .env
```

**Schritt 3: Queue-Einstellungen hinzufügen**
```env
# Redis Configuration (für Queue-System)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Falls Redis-Passwort gesetzt wurde
REDIS_DB=0

# Queue Configuration
QUEUE_ENABLED=true
QUEUE_CONCURRENCY=5
```

**Schritt 4: Speichern** (Ctrl+X, dann Y, dann Enter)

**Schritt 5: Server neu starten** (nach Rücksprache mit Benutzer)
```bash
pm2 restart intranet-backend
```

---

## 4. Deployment-Skript aktualisieren

Das Deployment-Skript `deploy_to_server.sh` wurde aktualisiert und prüft automatisch, ob Redis läuft.

**Manuelle Prüfung auf Server:**
```bash
# Redis-Status prüfen
sudo systemctl status redis-server

# Falls nicht aktiv:
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

---

## 5. Verifizierung

### Lokal

1. **Redis läuft:**
   ```bash
   redis-cli ping
   # Sollte "PONG" zurückgeben
   ```

2. **Server starten:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Logs prüfen:**
   ```
   [Queue Service] ✅ Redis-Verbindung hergestellt
   [Queue] ✅ Workers gestartet
   ```

### Hetzner Server

1. **Redis läuft:**
   ```bash
   redis-cli ping
   # Sollte "PONG" zurückgeben
   ```

2. **Backend-Logs prüfen:**
   ```bash
   pm2 logs intranet-backend | grep -i queue
   ```

3. **Erwartete Logs:**
   ```
   [Queue Service] ✅ Redis-Verbindung hergestellt
   [Queue] ✅ Workers gestartet
   [Queue] Concurrency: 5 Jobs parallel
   ```

---

## 6. Fallback-Verhalten

**WICHTIG**: Falls Redis nicht verfügbar ist, fällt das System automatisch auf die alte synchrone Logik zurück.

**Verhalten:**
- `QUEUE_ENABLED=false` → Alte synchrone Logik (keine Performance-Verbesserung)
- `QUEUE_ENABLED=true` + Redis nicht erreichbar → Fallback auf synchrone Logik + Warnung in Logs
- `QUEUE_ENABLED=true` + Redis erreichbar → Queue-System aktiv (99% schnellere Responses)

**Logs bei Fallback:**
```
[Queue] ⚠️ Redis nicht verfügbar - Workers werden nicht gestartet
[Queue] Stelle sicher, dass Redis läuft und die Verbindung korrekt konfiguriert ist
[Reservation] Fehler beim Hinzufügen zur Queue, verwende Fallback
```

---

## 7. Troubleshooting

### Problem: Redis-Verbindung fehlgeschlagen (IPv6 vs IPv4)

**Symptom:**
```
[Queue Service] Redis-Verbindungsfehler: connect ECONNREFUSED ::1:6379
[Queue Service] Redis-Verbindung fehlgeschlagen: Error: Stream isn't writeable
```

**Ursache:**
- Redis/Memurai läuft auf IPv4 (127.0.0.1), aber ioredis versucht IPv6 (::1)
- Häufig auf Windows mit Memurai, kann aber auch auf Linux auftreten

**Lösung:**
1. **Code-Fix** (bereits implementiert):
   - `family: 4` in `queueService.ts` erzwingt IPv4-Verbindung
   - Siehe: `backend/src/services/queueService.ts` Zeile 24

2. **Redis/Memurai prüfen:**
   ```bash
   # Windows (Memurai)
   memurai-cli ping  # Sollte "PONG" zurückgeben
   
   # Linux (Redis)
   redis-cli ping  # Sollte "PONG" zurückgeben
   ```

3. **Verbindung testen:**
   ```bash
   # IPv4 explizit testen
   redis-cli -h 127.0.0.1 ping
   ```

4. **Falls Problem weiterhin besteht:**
   - Prüfen ob Redis/Memurai auf IPv4 läuft: `netstat -an | grep 6379`
   - Redis-Konfiguration prüfen: `/etc/redis/redis.conf` (Linux)
   - Memurai-Konfiguration prüfen (Windows)

### Problem: Redis-Verbindung fehlgeschlagen (allgemein)

**Symptom:**
```
[Queue Service] Redis-Verbindungsfehler: connect ECONNREFUSED
```

**Lösung:**
1. Prüfen ob Redis läuft: `sudo systemctl status redis-server` (Linux) oder Memurai-Service (Windows)
2. Redis starten: `sudo systemctl start redis-server` (Linux)
3. Port prüfen: `netstat -tuln | grep 6379` (Linux) oder `netstat -an | findstr 6379` (Windows)
4. Firewall prüfen (falls aktiv)

### Problem: Redis-Passwort falsch

**Symptom:**
```
[Queue Service] Redis-Verbindungsfehler: NOAUTH Authentication required
```

**Lösung:**
1. Passwort in `.env` prüfen: `REDIS_PASSWORD=...`
2. Passwort in Redis-Konfiguration prüfen: `/etc/redis/redis.conf`
3. Redis neu starten: `sudo systemctl restart redis-server`

### Problem: Workers starten nicht

**Symptom:**
```
[Queue] Queue-System ist deaktiviert (QUEUE_ENABLED=false)
```

**Lösung:**
1. `.env` Datei prüfen: `QUEUE_ENABLED=true`
2. Server neu starten: `pm2 restart intranet-backend`

---

## 8. Monitoring

### Redis-Status prüfen

```bash
# Redis-Info
redis-cli info

# Anzahl verbundener Clients
redis-cli info clients

# Speicher-Info
redis-cli info memory
```

### Queue-Status (BullMQ)

Die Queue-Jobs werden in Redis gespeichert. Prüfen mit:
```bash
# Alle Keys anzeigen
redis-cli keys "*queue*"

# Queue-Statistiken (wenn BullMQ Dashboard installiert)
# Siehe: https://github.com/taskforcesh/bullmq-pro
```

---

## 9. Backup & Wartung

### Redis-Persistenz

Redis speichert Daten standardmäßig auf Disk:
- **RDB**: Snapshot alle X Sekunden
- **AOF**: Append-Only-File (jede Änderung)

**Backup erstellen:**
```bash
# RDB-Datei kopieren
sudo cp /var/lib/redis/dump.rdb /backup/redis-$(date +%Y%m%d).rdb
```

**WICHTIG**: Queue-Jobs sind temporär (werden nach 24h gelöscht). Kein Backup nötig für Queue-Daten.

### Redis-Neustart

```bash
# Redis neu starten
sudo systemctl restart redis-server

# Backend muss NICHT neu gestartet werden (automatische Reconnection)
```

---

## 10. Zusammenfassung

### Lokal
- ✅ Redis mit Docker starten: `docker run -d -p 6379:6379 redis:7-alpine`
- ✅ `.env` Datei enthält bereits Queue-Einstellungen
- ✅ Server starten: `npm run dev`

### Hetzner Server
- ✅ Redis installieren: `sudo apt-get install redis-server`
- ✅ Redis starten: `sudo systemctl start redis-server && sudo systemctl enable redis-server`
- ✅ `.env` Datei auf Server aktualisieren (manuell!)
- ✅ Server neu starten: `pm2 restart intranet-backend`

### Wichtig
- `.env` Dateien sind **NICHT** im Git (`.gitignore`)
- Queue-Einstellungen müssen **manuell** auf Server gesetzt werden
- Fallback funktioniert automatisch, wenn Redis nicht verfügbar ist

---

## Nächste Schritte

1. **Lokal**: Redis starten und testen
2. **Server**: Redis installieren und `.env` aktualisieren
3. **Verifizierung**: Logs prüfen, ob Queue-System aktiv ist
4. **Monitoring**: Redis-Status regelmäßig prüfen

