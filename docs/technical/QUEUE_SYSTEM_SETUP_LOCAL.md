# Queue-System: Lokale Setup-Anleitung (Windows)

## Übersicht

Für die lokale Entwicklungsumgebung auf Windows gibt es mehrere Optionen, Redis zu installieren und zu starten.

---

## Option 1: Memurai (Windows-native Redis)

**Vorteil**: Läuft nativ auf Windows, keine Docker/WSL nötig.

### Installation

1. **Download**: https://www.memurai.com/get-memurai
2. **Installation**: Installer ausführen
3. **Service starten**: Memurai läuft automatisch als Windows-Service

### Prüfung

```bash
# Memurai-CLI testen
memurai-cli ping
# Erwartete Antwort: PONG
```

### Konfiguration

Memurai verwendet standardmäßig Port 6379, genau wie Redis. Die `.env` Datei funktioniert ohne Änderungen:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Option 2: Docker Desktop

**Vorteil**: Läuft in Container, isoliert vom System.

### Installation

1. **Download**: https://www.docker.com/products/docker-desktop
2. **Installation**: Docker Desktop installieren
3. **Docker starten**: Docker Desktop öffnen

### Redis Container starten

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

### Prüfung

```bash
# Redis-Verbindung testen (mit Docker)
docker exec -it redis-queue redis-cli ping
# Erwartete Antwort: PONG
```

---

## Option 3: WSL2 (Windows Subsystem for Linux)

**Vorteil**: Native Linux-Umgebung, identisch mit Server-Setup.

### Installation

1. **WSL2 installieren**:
   ```powershell
   wsl --install
   ```

2. **Ubuntu installieren** (oder andere Distribution)

3. **In WSL2 Terminal**:
   ```bash
   sudo apt-get update
   sudo apt-get install redis-server
   sudo service redis-server start
   ```

### Prüfung

```bash
# In WSL2 Terminal
redis-cli ping
# Erwartete Antwort: PONG
```

### Konfiguration

Die `.env` Datei muss auf `localhost` zeigen (funktioniert automatisch mit WSL2).

---

## Empfehlung

**Für Windows-Entwicklung**: **Memurai** (Option 1)
- Einfachste Installation
- Läuft als Windows-Service
- Keine Docker/WSL nötig
- Identisches Verhalten wie Redis

**Für Docker-Umgebung**: **Docker Desktop** (Option 2)
- Isoliert vom System
- Einfach zu entfernen
- Identisch mit Produktions-Setup

---

## Verifizierung

Nach der Installation:

1. **Redis/Memurai läuft:**
   ```bash
   # Memurai
   memurai-cli ping
   
   # Docker
   docker exec -it redis-queue redis-cli ping
   
   # WSL2
   redis-cli ping
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

---

## Troubleshooting

### Problem: "Connection refused"

**Lösung:**
- Prüfen ob Redis/Memurai läuft
- Port 6379 prüfen: `netstat -an | findstr 6379`
- Firewall-Regel prüfen

### Problem: "Command not found"

**Lösung:**
- Memurai: Installer ausführen
- Docker: Docker Desktop starten
- WSL2: Redis in WSL2 installieren

---

## Nächste Schritte

1. Redis/Memurai installieren und starten
2. Server starten: `npm run dev`
3. Logs prüfen, ob Queue-System aktiv ist
4. Test: Reservierung erstellen und Response-Zeit prüfen

