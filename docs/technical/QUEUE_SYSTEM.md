# Queue-System Dokumentation

## Überblick

Das Queue-System verwendet **BullMQ** mit **Redis** für asynchrone Background-Jobs. Dies ermöglicht schnelle API-Responses und zuverlässige Verarbeitung von zeitaufwändigen Operationen im Hintergrund.

## Setup

### 1. Redis installieren

**Windows:**
- **Option A: Memurai** (Windows-native, empfohlen)
  - Download: https://www.memurai.com/get-memurai
  - Installer ausführen, läuft automatisch als Service
  - Prüfung: `memurai-cli ping` → `PONG`
- **Option B: Docker**
  ```bash
  docker run -d -p 6379:6379 redis:7-alpine
  ```
- **Option C: WSL2**
  ```bash
  sudo apt-get update
  sudo apt-get install redis-server
  sudo service redis-server start
  ```
  
  **Siehe**: `docs/technical/QUEUE_SYSTEM_SETUP_LOCAL.md` für detaillierte Windows-Anleitung

**Linux (Server):**
```bash
sudo apt-get update
sudo apt-get install redis-server -y
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**Mac:**
```bash
brew install redis
brew services start redis
```

**Hetzner Server:**
- **Automatisches Setup**: `scripts/setup-redis-on-server.sh`
- **Manuelle Installation**: Siehe `docs/technical/QUEUE_SYSTEM_HETZNER_SETUP.md`

### 2. Environment-Variablen

Füge folgende Variablen zur `.env` Datei hinzu:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional, nur wenn Redis Passwort hat
REDIS_DB=0  # Standard: 0

# Queue Configuration
QUEUE_ENABLED=false  # Setze auf 'true' um Queue zu aktivieren
QUEUE_CONCURRENCY=5  # Anzahl paralleler Worker-Jobs
```

**WICHTIG**: 
- `QUEUE_ENABLED=false` → System läuft mit alter synchroner Logik (Fallback)
- `QUEUE_ENABLED=true` → Queue-System aktiv, schnelle Responses

### 3. Server starten

```bash
cd backend
npm run dev
```

Die Workers starten automatisch beim Server-Start (wenn `QUEUE_ENABLED=true`).

## Funktionsweise

### Aktuell (ohne Queue)
```
Frontend → Controller → Service → External API → DB Update → Response
         [2-6 Sekunden blockiert]
```

### Mit Queue
```
Frontend → Controller → Queue.add() → Response (<50ms)
                                    ↓
                              Worker → Service → External API → DB Update
                              [läuft im Hintergrund]
```

## Verwendete Stellen

### 1. Reservation-Erstellung
**Datei**: `backend/src/controllers/reservationController.ts` → `createReservation()`

**Vorteil**: 
- Frontend erhält Antwort in <50ms (statt 2-6 Sekunden)
- Payment-Link und WhatsApp-Nachricht laufen parallel im Hintergrund

### 2. Guest Contact Update
**Datei**: `backend/src/controllers/reservationController.ts` → `updateGuestContact()`

**Vorteil**:
- Frontend erhält Antwort in <100ms (statt 3-8 Sekunden)
- Payment-Link, TTLock Passcode und WhatsApp-Nachricht laufen parallel im Hintergrund

---

## Dokumentation

- **Deployment-Anleitung**: `docs/technical/QUEUE_SYSTEM_DEPLOYMENT.md`
- **Hetzner Server Setup**: `docs/technical/QUEUE_SYSTEM_HETZNER_SETUP.md`
- **Lokale Setup (Windows)**: `docs/technical/QUEUE_SYSTEM_SETUP_LOCAL.md`
- **Performance-Verbesserungen**: `docs/technical/QUEUE_PERFORMANCE_VERBESSERUNGEN.md`
- **Implementation Plan**: `docs/implementation_plans/QUEUE_SYSTEM_IMPLEMENTATION.md`

**Job-Typ**: `process-reservation`

### Weitere Stellen (geplant)
- Check-in-Bestätigung
- Guest Contact Update
- Scheduled Jobs (späte Check-in-Einladungen)
- SIRE-Registrierung
- Monatsabrechnungen

## Monitoring

### Queue-Status prüfen

**In der Konsole:**
```
[Queue] ✅ Workers gestartet
[Queue] Concurrency: 5 Jobs parallel
[Queue] ✅ Job reservation-123 erfolgreich abgeschlossen
```

### Health-Check

Die Queue prüft automatisch die Redis-Verbindung beim Start. Falls Redis nicht verfügbar ist:
- Workers starten nicht
- System läuft mit Fallback (synchrone Logik)
- Keine Fehler, System bleibt funktionsfähig

## Fehlerbehandlung

### Automatische Retries
- **3 Versuche** bei Fehlern
- **Exponential Backoff**: 2s, 4s, 8s
- Fehlgeschlagene Jobs bleiben 7 Tage in Queue für Debugging

### Fallback-Mechanismus
Wenn Queue nicht verfügbar ist:
- Automatischer Fallback auf synchrone Logik
- Keine Funktionalitätsverluste
- System bleibt vollständig funktionsfähig

## Troubleshooting

### Problem: Workers starten nicht

**Lösung:**
1. Prüfe ob Redis läuft: `redis-cli ping` (sollte "PONG" zurückgeben)
2. Prüfe Environment-Variablen (`REDIS_HOST`, `REDIS_PORT`)
3. Prüfe Logs: `[Queue] ⚠️ Redis nicht verfügbar`

### Problem: Jobs werden nicht verarbeitet

**Lösung:**
1. Prüfe ob `QUEUE_ENABLED=true` gesetzt ist
2. Prüfe ob Workers gestartet sind (siehe Logs)
3. Prüfe Redis-Verbindung

### Problem: Jobs schlagen fehl

**Lösung:**
1. Prüfe Logs für Fehlermeldungen
2. Jobs werden automatisch retried (3 Versuche)
3. Fehlgeschlagene Jobs bleiben 7 Tage in Queue

## Deaktivierung

Um das Queue-System zu deaktivieren:

```env
QUEUE_ENABLED=false
```

Das System läuft dann mit der alten synchronen Logik (vollständiger Fallback).

## Weitere Informationen

Siehe: `docs/implementation_plans/QUEUE_SYSTEM_IMPLEMENTATION.md` für detaillierte Implementierungs-Dokumentation.

