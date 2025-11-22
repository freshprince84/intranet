# Server Performance Fix Plan

## Übersicht

Dieses Dokument beschreibt den detaillierten Plan zur Behebung der Performance-Probleme auf dem Hetzner Server (65.109.228.106).

**Datum der Analyse**: 2025-11-22  
**Server**: Hetzner (65.109.228.106)  
**Pfad**: `/var/www/intranet`

---

## Gefundene Probleme

### 1. Redis läuft nicht (KRITISCH)
- **Status**: Redis-Server ist nicht installiert oder läuft nicht
- **Port 6379**: Nicht offen
- **Impact**: Queue-System kann nicht arbeiten, System läuft im langsamen synchronen Fallback-Modus

### 2. Queue-System nicht konfiguriert
- **Status**: `QUEUE_ENABLED` fehlt in `.env` Datei
- **Impact**: System verwendet nicht das asynchrone Queue-System

### 3. Kein Swap-Space konfiguriert
- **Status**: 0B Swap-Space vorhanden
- **System-RAM**: 3.7GB total, 2.1GB verwendet (57%)
- **Impact**: Bei RAM-Engpässen kann System nicht ausweichen

### 4. Hoher RAM-Verbrauch
- **Backend-Prozess**: 973.5MB (25% des Systems)
- **Prisma Studio**: 63.8MB (sollte in Produktion nicht laufen)
- **Impact**: Wenig Puffer für Lastspitzen

---

## Fix-Plan: Schritt für Schritt

### Phase 1: Redis Installation und Konfiguration (KRITISCH)

#### Schritt 1.1: Redis installieren

**Option A: Automatisches Setup-Skript (Empfohlen)**

```bash
# SSH-Verbindung zum Server
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106

# Ins Projektverzeichnis wechseln
cd /var/www/intranet

# Skript ausführbar machen (falls nicht bereits)
chmod +x scripts/setup-redis-on-server.sh

# Skript ausführen
./scripts/setup-redis-on-server.sh
```

**Option B: Manuelle Installation**

```bash
# SSH-Verbindung zum Server
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106

# Redis installieren
sudo apt-get update
sudo apt-get install redis-server -y

# Redis starten
sudo systemctl start redis-server

# Redis für automatischen Start aktivieren
sudo systemctl enable redis-server

# Status prüfen
sudo systemctl status redis-server
```

#### Schritt 1.2: Redis-Verbindung testen

```bash
# Redis-CLI testen
redis-cli ping
# Erwartete Antwort: PONG

# Redis-Info anzeigen
redis-cli info server | head -10

# Port prüfen
netstat -tuln | grep 6379
# Sollte zeigen: tcp 0 0 127.0.0.1:6379
```

#### Schritt 1.3: Redis-Konfiguration prüfen (optional)

```bash
# Redis-Konfiguration anzeigen
sudo nano /etc/redis/redis.conf

# Wichtige Einstellungen prüfen:
# - bind 127.0.0.1 (sollte auf IPv4 gebunden sein)
# - #bind ::1 (IPv6 sollte auskommentiert sein, optional)

# Falls geändert: Redis neu starten
sudo systemctl restart redis-server
```

---

### Phase 2: .env Datei aktualisieren (KRITISCH)

#### Schritt 2.1: .env Datei bearbeiten

```bash
# SSH-Verbindung zum Server
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106

# Ins Backend-Verzeichnis wechseln
cd /var/www/intranet/backend

# .env Datei bearbeiten
nano .env
```

#### Schritt 2.2: Queue-Einstellungen hinzufügen

**Am Ende der `.env` Datei hinzufügen:**

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

**Speichern**: `Ctrl+X`, dann `Y`, dann `Enter`

#### Schritt 2.3: Einstellungen prüfen

```bash
# Prüfen ob Einstellungen vorhanden sind
grep -E "QUEUE_ENABLED|REDIS_HOST" .env

# Erwartete Ausgabe:
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=
# REDIS_DB=0
# QUEUE_ENABLED=true
# QUEUE_CONCURRENCY=5
```

---

### Phase 3: Prisma Studio deaktivieren (OPTIONAL, aber empfohlen)

#### Schritt 3.1: Prisma Studio stoppen

```bash
# SSH-Verbindung zum Server
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106

# Prisma Studio stoppen
pm2 stop prisma-studio

# Prisma Studio aus PM2 entfernen (optional, verhindert automatischen Start)
pm2 delete prisma-studio
```

**Hinweis**: Prisma Studio sollte nur in der Entwicklungsumgebung laufen, nicht in Produktion.

---

### Phase 4: Swap-Space hinzufügen (OPTIONAL, aber empfohlen)

#### Schritt 4.1: Swap-Datei erstellen

```bash
# SSH-Verbindung zum Server
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106

# 2GB Swap-Datei erstellen (angepasst an 4GB RAM-System)
sudo fallocate -l 2G /swapfile

# Berechtigungen setzen
sudo chmod 600 /swapfile

# Swap-Datei formatieren
sudo mkswap /swapfile

# Swap aktivieren
sudo swapon /swapfile

# Swap dauerhaft aktivieren
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### Schritt 4.2: Swap-Verhalten optimieren (optional)

```bash
# Swappiness anpassen (Standard: 60, für Server: 10-20)
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

# Cache-Pressure anpassen
echo 'vm.vfs_cache_pressure=50' | sudo tee -a /etc/sysctl.conf

# Änderungen anwenden
sudo sysctl -p
```

#### Schritt 4.3: Swap-Status prüfen

```bash
# Swap-Status anzeigen
swapon --show

# Memory-Status anzeigen
free -h

# Erwartete Ausgabe sollte Swap zeigen:
# Swap: 2.0Gi  0B  2.0Gi
```

---

### Phase 5: Backend neu starten (NACH RÜCKSPRACHE)

#### Schritt 5.1: Backend neu starten

**⚠️ WICHTIG: Nur nach ausdrücklicher Rücksprache mit dem Benutzer!**

```bash
# SSH-Verbindung zum Server
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106

# Backend neu starten
pm2 restart intranet-backend

# Status prüfen
pm2 status
```

#### Schritt 5.2: Logs prüfen

```bash
# Queue-Logs prüfen
pm2 logs intranet-backend --lines 50 | grep -i queue

# Erwartete Logs:
# [Queue Service] ✅ Redis-Verbindung hergestellt
# [Queue Service] ✅ Redis bereit
# [Queue] ✅ Workers gestartet
# [Queue] Concurrency: 5 Jobs parallel
```

#### Schritt 5.3: Verifizierung

```bash
# Redis-Status prüfen
systemctl is-active redis-server
# Sollte "active" zurückgeben

# Redis-Verbindung prüfen
redis-cli ping
# Sollte "PONG" zurückgeben

# PM2-Status prüfen
pm2 list

# Erwartete Ausgabe:
# intranet-backend sollte "online" sein
```

---

## Erwartete Verbesserungen

### Performance-Verbesserung

- **Vorher**: 2-6 Sekunden Blockierung bei Queue-Operationen (z.B. Reservierung erstellen)
- **Nachher**: <100ms Response-Zeit (asynchron)
- **Performance-Gewinn**: ~99% schneller bei Queue-Operationen

### System-Stabilität

- **RAM**: Mit Swap-Space mehr Puffer für Lastspitzen
- **Redis**: Asynchrone Verarbeitung entlastet Backend
- **Queue-System**: Zuverlässige Background-Job-Verarbeitung

---

## Verifizierung nach Fix

### 1. Redis-Status

```bash
# Redis läuft?
systemctl is-active redis-server
# Sollte "active" zurückgeben

# Redis-Verbindung?
redis-cli ping
# Sollte "PONG" zurückgeben

# Redis-Info
redis-cli info server | head -5
```

### 2. Queue-System

```bash
# Backend-Logs prüfen
pm2 logs intranet-backend --lines 50 | grep -i queue

# Erwartete Ausgabe:
# [Queue Service] ✅ Redis-Verbindung hergestellt
# [Queue] ✅ Workers gestartet
```

### 3. System-Ressourcen

```bash
# Memory-Status
free -h

# Swap-Status
swapon --show

# CPU-Load
uptime

# PM2-Status
pm2 list
```

### 4. Funktionstest

1. **Im Frontend eine Reservierung erstellen**
2. **Response sollte sofort kommen** (<100ms statt 2-6 Sekunden)
3. **Logs prüfen**: `pm2 logs intranet-backend | grep -i "reservation worker"`

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

# Redis-Verbindung testen
redis-cli ping  # Sollte "PONG" zurückgeben
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

# Server neu starten (nach Rücksprache)
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

## Checkliste

### Vorbereitung
- [ ] SSH-Zugriff zum Server vorhanden
- [ ] Backup der aktuellen `.env` Datei erstellt (optional, aber empfohlen)
- [ ] Benutzer informiert über geplante Änderungen

### Phase 1: Redis Installation
- [ ] Redis installiert
- [ ] Redis läuft (`systemctl status redis-server`)
- [ ] Redis-Verbindung funktioniert (`redis-cli ping`)
- [ ] Redis für automatischen Start aktiviert (`systemctl is-enabled redis-server`)

### Phase 2: .env Konfiguration
- [ ] `.env` Datei bearbeitet
- [ ] `QUEUE_ENABLED=true` hinzugefügt
- [ ] `REDIS_HOST=localhost` hinzugefügt
- [ ] `REDIS_PORT=6379` hinzugefügt
- [ ] `REDIS_DB=0` hinzugefügt
- [ ] `QUEUE_CONCURRENCY=5` hinzugefügt
- [ ] Einstellungen verifiziert (`grep -E "QUEUE_ENABLED|REDIS_HOST" .env`)

### Phase 3: Prisma Studio (optional)
- [ ] Prisma Studio gestoppt (`pm2 stop prisma-studio`)
- [ ] Prisma Studio aus PM2 entfernt (optional)

### Phase 4: Swap-Space (optional)
- [ ] Swap-Datei erstellt (2GB)
- [ ] Swap aktiviert (`swapon --show`)
- [ ] Swap dauerhaft aktiviert (`/etc/fstab`)
- [ ] Swappiness optimiert (optional)

### Phase 5: Backend-Neustart
- [ ] **Rücksprache mit Benutzer erfolgt** ⚠️
- [ ] Backend neu gestartet (`pm2 restart intranet-backend`)
- [ ] Logs geprüft (Queue-System aktiv)
- [ ] Verifizierung erfolgreich

### Nach Fix
- [ ] Redis-Status: ✅
- [ ] Queue-System: ✅
- [ ] System-Ressourcen: ✅
- [ ] Funktionstest: ✅

---

## Zusammenfassung

### Hauptursache der Performance-Probleme

**Redis läuft nicht** → System läuft im langsamen synchronen Fallback-Modus

### Lösung

1. **Redis installieren und starten** (Phase 1)
2. **Queue-System in `.env` aktivieren** (Phase 2)
3. **Backend neu starten** (Phase 5, nach Rücksprache)

### Zusätzliche Optimierungen (optional)

- Prisma Studio deaktivieren (Phase 3)
- Swap-Space hinzufügen (Phase 4)

### Erwartete Verbesserung

- **99% schneller** bei Queue-Operationen
- **Stabileres System** mit mehr RAM-Puffer
- **Zuverlässigere** Background-Job-Verarbeitung

---

## Weitere Dokumentation

- **Queue-System Übersicht**: `docs/technical/QUEUE_SYSTEM.md`
- **Hetzner Server Setup**: `docs/technical/QUEUE_SYSTEM_HETZNER_SETUP.md`
- **Deployment-Anleitung**: `docs/technical/QUEUE_SYSTEM_DEPLOYMENT.md`
- **IPv4/IPv6 Fix**: `docs/technical/QUEUE_SYSTEM_IPV4_FIX.md`
- **Performance-Verbesserungen**: `docs/technical/QUEUE_PERFORMANCE_VERBESSERUNGEN.md`

---

## Wichtige Hinweise

- ⚠️ **Server-Neustart nur nach Rücksprache** - niemals selbständig Server oder PM2-Prozesse neustarten
- ⚠️ **Backup empfohlen** - `.env` Datei vor Änderungen sichern (optional)
- ⚠️ **Schritt-für-Schritt** - Jeden Schritt verifizieren bevor zum nächsten übergegangen wird
- ⚠️ **Logs prüfen** - Nach jedem Schritt Logs prüfen um Probleme früh zu erkennen

---

**Erstellt**: 2025-11-22  
**Status**: Planungsdokument - Bereit zur Umsetzung nach Bestätigung

