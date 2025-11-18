# Queue-System: Hetzner Server Setup

## Übersicht

Diese Anleitung beschreibt die vollständige Einrichtung des Queue-Systems auf dem Hetzner Server (Produktivumgebung).

**Server**: Hetzner (65.109.228.106)  
**Pfad**: `/var/www/intranet`

---

## Schritt-für-Schritt Anleitung

### Schritt 1: SSH-Verbindung zum Server

```bash
ssh root@65.109.228.106
```

---

### Schritt 2: Redis installieren

**Option A: Automatisches Setup-Skript (Empfohlen)**

```bash
# Skript ausführen
cd /var/www/intranet
chmod +x scripts/setup-redis-on-server.sh
./scripts/setup-redis-on-server.sh
```

**Option B: Manuelle Installation**

```bash
# Redis installieren
sudo apt-get update
sudo apt-get install redis-server -y

# Redis starten
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Status prüfen
sudo systemctl status redis-server
redis-cli ping  # Sollte "PONG" zurückgeben
```

---

### Schritt 3: Redis-Verbindung testen

```bash
# Redis-CLI testen
redis-cli ping
# Erwartete Antwort: PONG

# Redis-Info anzeigen
redis-cli info server | head -10
```

---

### Schritt 4: .env Datei aktualisieren

**WICHTIG**: Die `.env` Datei ist **NICHT** im Git enthalten und muss **manuell** aktualisiert werden!

```bash
# .env Datei bearbeiten
cd /var/www/intranet/backend
nano .env
```

**Hinzufügen am Ende der Datei:**

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

**Speichern**: Ctrl+X, dann Y, dann Enter

**Prüfen**:
```bash
# Prüfen ob Einstellungen vorhanden sind
grep -E "QUEUE_ENABLED|REDIS_HOST" .env
```

---

### Schritt 5: Server neu starten

**WICHTIG**: Nach Rücksprache mit dem Benutzer!

```bash
# Backend neu starten
pm2 restart intranet-backend

# Logs prüfen
pm2 logs intranet-backend | grep -i queue
```

**Erwartete Logs:**
```
[Queue Service] ✅ Redis-Verbindung hergestellt
[Queue] ✅ Workers gestartet
[Queue] Concurrency: 5 Jobs parallel
```

---

## Verifizierung

### 1. Redis-Status prüfen

```bash
# Redis läuft?
systemctl is-active redis-server
# Sollte "active" zurückgeben

# Redis-Verbindung?
redis-cli ping
# Sollte "PONG" zurückgeben
```

### 2. Queue-System prüfen

```bash
# Backend-Logs prüfen
pm2 logs intranet-backend --lines 50 | grep -i queue

# Erwartete Ausgabe:
# [Queue Service] ✅ Redis-Verbindung hergestellt
# [Queue] ✅ Workers gestartet
```

### 3. Test: Reservierung erstellen

1. Im Frontend eine Reservierung erstellen
2. Response sollte sofort kommen (<100ms statt 2-6 Sekunden)
3. Logs prüfen: `pm2 logs intranet-backend | grep -i "reservation worker"`

---

## Troubleshooting

### Problem: Redis startet nicht

**Symptom:**
```
Failed to start redis-server.service
```

**Lösung:**
```bash
# Redis-Logs prüfen
sudo journalctl -u redis-server -n 50

# Redis-Konfiguration prüfen
sudo nano /etc/redis/redis.conf

# Redis neu starten
sudo systemctl restart redis-server
```

### Problem: Redis-Verbindung fehlgeschlagen

**Symptom:**
```
[Queue Service] Redis-Verbindungsfehler: connect ECONNREFUSED
```

**Lösung:**
```bash
# Prüfen ob Redis läuft
systemctl status redis-server

# Redis starten
sudo systemctl start redis-server

# Port prüfen
netstat -tuln | grep 6379
```

### Problem: Queue-System startet nicht

**Symptom:**
```
[Queue] Queue-System ist deaktiviert (QUEUE_ENABLED=false)
```

**Lösung:**
```bash
# .env Datei prüfen
cd /var/www/intranet/backend
grep QUEUE_ENABLED .env

# Falls nicht vorhanden oder false:
nano .env
# QUEUE_ENABLED=true hinzufügen

# Server neu starten
pm2 restart intranet-backend
```

### Problem: Workers starten nicht

**Symptom:**
```
[Queue] ⚠️ Redis nicht verfügbar - Workers werden nicht gestartet
```

**Lösung:**
1. Redis-Status prüfen: `systemctl status redis-server`
2. Redis starten: `sudo systemctl start redis-server`
3. Verbindung testen: `redis-cli ping`
4. Server neu starten: `pm2 restart intranet-backend`

---

## Monitoring

### Redis-Status regelmäßig prüfen

```bash
# Redis-Info
redis-cli info

# Anzahl verbundener Clients
redis-cli info clients

# Speicher-Info
redis-cli info memory

# Queue-Keys (BullMQ)
redis-cli keys "*queue*"
```

### Backend-Logs überwachen

```bash
# Queue-Logs live anzeigen
pm2 logs intranet-backend --lines 0 | grep -i queue

# Alle Logs
pm2 logs intranet-backend
```

---

## Wartung

### Redis neu starten

```bash
# Redis neu starten
sudo systemctl restart redis-server

# Backend muss NICHT neu gestartet werden (automatische Reconnection)
```

### Redis-Update

```bash
# Redis aktualisieren
sudo apt-get update
sudo apt-get upgrade redis-server

# Redis neu starten
sudo systemctl restart redis-server
```

### Redis-Backup (optional)

```bash
# RDB-Datei kopieren
sudo cp /var/lib/redis/dump.rdb /backup/redis-$(date +%Y%m%d).rdb

# WICHTIG: Queue-Jobs sind temporär (werden nach 24h gelöscht)
# Kein Backup nötig für Queue-Daten
```

---

## Sicherheit

### Redis-Passwort setzen (empfohlen für Produktion)

```bash
# Redis-Konfiguration bearbeiten
sudo nano /etc/redis/redis.conf

# Passwort setzen
requirepass dein-sicheres-passwort

# Redis neu starten
sudo systemctl restart redis-server

# .env Datei aktualisieren
cd /var/www/intranet/backend
nano .env
# REDIS_PASSWORD=dein-sicheres-passwort hinzufügen

# Server neu starten
pm2 restart intranet-backend
```

### Firewall (falls aktiv)

Redis läuft standardmäßig nur auf `localhost` (127.0.0.1), daher ist keine Firewall-Regel nötig.

---

## Zusammenfassung

### Checkliste

- [ ] Redis installiert
- [ ] Redis läuft (`systemctl status redis-server`)
- [ ] Redis-Verbindung funktioniert (`redis-cli ping`)
- [ ] `.env` Datei aktualisiert (QUEUE_ENABLED=true)
- [ ] Server neu gestartet (`pm2 restart intranet-backend`)
- [ ] Logs prüfen (Queue-System aktiv)
- [ ] Test: Reservierung erstellen (schnelle Response)

### Erwartete Performance-Verbesserung

- **Vorher**: 2-6 Sekunden Blockierung beim Erstellen einer Reservierung
- **Nachher**: <100ms Response-Zeit (99% schneller)

### Fallback-Verhalten

Falls Redis nicht verfügbar ist:
- System läuft automatisch mit alter synchroner Logik
- Keine Funktionalität geht verloren
- Warnung in Logs: `[Queue] ⚠️ Redis nicht verfügbar`

---

## Nächste Schritte

1. **Redis installieren** (siehe Schritt 2)
2. **`.env` Datei aktualisieren** (siehe Schritt 4)
3. **Server neu starten** (nach Rücksprache)
4. **Verifizierung** (siehe Verifizierung)
5. **Monitoring** (siehe Monitoring)

---

## Weitere Dokumentation

- **Allgemeine Deployment-Anleitung**: `docs/technical/QUEUE_SYSTEM_DEPLOYMENT.md`
- **Lokale Setup-Anleitung**: `docs/technical/QUEUE_SYSTEM_SETUP_LOCAL.md`
- **Performance-Verbesserungen**: `docs/technical/QUEUE_PERFORMANCE_VERBESSERUNGEN.md`
- **Queue-System Übersicht**: `docs/technical/QUEUE_SYSTEM.md`

