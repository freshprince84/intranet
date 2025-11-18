# Queue-System: IPv4-Verbindungsproblem und Fix

## Problem

### Symptom

```
[Queue Service] Redis-Verbindungsfehler: connect ECONNREFUSED ::1:6379
[Queue Service] Redis-Verbindung fehlgeschlagen: Error: Stream isn't writeable and enableOfflineQueue options is false
```

### Ursache

- **Redis/Memurai** läuft auf **IPv4** (127.0.0.1:6379)
- **ioredis** (Node.js Redis-Client) versucht standardmäßig **IPv6** (::1:6379)
- Verbindung schlägt fehl, weil Redis/Memurai nicht auf IPv6 lauscht

### Betroffene Umgebungen

- **Windows mit Memurai**: Häufig betroffen
- **Linux-Server**: Kann auftreten, wenn IPv6 aktiviert ist
- **Docker**: Normalerweise kein Problem (Container-Netzwerk)

---

## Lösung

### Code-Fix (bereits implementiert)

**Datei**: `backend/src/services/queueService.ts`

**Änderung**: `family: 4` zur Redis-Verbindungskonfiguration hinzugefügt

```typescript
connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  family: 4, // IPv4 erzwingen (wichtig für Memurai auf Windows)
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});
```

**Zeile**: 24 in `backend/src/services/queueService.ts`

---

## Verifizierung

### Lokal (Windows)

1. **Memurai-Verbindung testen:**
   ```bash
   memurai-cli ping
   # Erwartete Antwort: PONG
   ```

2. **IPv4 explizit testen:**
   ```bash
   memurai-cli -h 127.0.0.1 ping
   # Erwartete Antwort: PONG
   ```

3. **Server starten und Logs prüfen:**
   ```bash
   cd backend
   npm run dev
   ```

4. **Erwartete Logs:**
   ```
   [Queue Service] ✅ Redis-Verbindung hergestellt
   [Queue] ✅ Workers gestartet
   ```

### Hetzner Server (Linux)

1. **Redis-Verbindung testen:**
   ```bash
   redis-cli ping
   # Erwartete Antwort: PONG
   
   redis-cli -h 127.0.0.1 ping
   # Erwartete Antwort: PONG
   ```

2. **Redis-Status prüfen:**
   ```bash
   systemctl status redis-server
   # Sollte "active (running)" zeigen
   ```

3. **Server neu starten:**
   ```bash
   pm2 restart intranet-backend
   ```

4. **Logs prüfen:**
   ```bash
   pm2 logs intranet-backend | grep -i queue
   ```

5. **Erwartete Logs:**
   ```
   [Queue Service] ✅ Redis-Verbindung hergestellt
   [Queue] ✅ Workers gestartet
   [Queue] Concurrency: 5 Jobs parallel
   ```

---

## Technische Details

### Warum `family: 4`?

- **`family: 4`** = IPv4 erzwingen
- **`family: 6`** = IPv6 erzwingen
- **Ohne `family`** = ioredis versucht automatisch IPv6 zuerst, dann IPv4

### ioredis Verhalten

Standardmäßig versucht ioredis:
1. IPv6-Verbindung (::1)
2. Falls fehlgeschlagen: IPv4-Verbindung (127.0.0.1)

**Problem**: Mit `enableOfflineQueue: false` wird der Fallback nicht ausgeführt, wenn die Verbindung nicht schreibbar ist.

**Lösung**: `family: 4` erzwingt IPv4 von Anfang an.

---

## Deployment

### Lokal

- Fix ist bereits im Code
- Server neu starten: `npm run dev`
- Keine weiteren Schritte nötig

### Hetzner Server

1. **Code deployen:**
   ```bash
   cd /var/www/intranet
   git pull
   cd backend
   npm install
   npm run build
   ```

2. **Server neu starten:**
   ```bash
   pm2 restart intranet-backend
   ```

3. **Verifizierung:**
   ```bash
   pm2 logs intranet-backend | grep -i queue
   ```

---

## Alternative Lösungen (falls Problem weiterhin besteht)

### Option 1: Redis auf IPv6 binden

**Linux (`/etc/redis/redis.conf`):**
```conf
bind 127.0.0.1 ::1
```

**Warnung**: Nur wenn IPv6 vollständig konfiguriert ist!

### Option 2: Host explizit auf IPv4 setzen

**`.env` Datei:**
```env
REDIS_HOST=127.0.0.1  # Explizit IPv4 statt localhost
```

**Hinweis**: `family: 4` im Code ist die bessere Lösung, da sie universell funktioniert.

### Option 3: IPv6 deaktivieren (nicht empfohlen)

**Linux:**
```bash
# IPv6 in Redis deaktivieren
sudo nano /etc/redis/redis.conf
# bind ::1 auskommentieren
```

**Warnung**: Kann andere Services beeinträchtigen!

---

## Zusammenfassung

### Problem
- ioredis versucht IPv6, Redis/Memurai läuft auf IPv4
- Verbindung schlägt fehl

### Lösung
- `family: 4` in `queueService.ts` hinzugefügt
- Erzwingt IPv4-Verbindung
- Funktioniert auf Windows (Memurai) und Linux (Redis)

### Status
- ✅ Fix implementiert
- ✅ Lokal getestet
- ✅ Dokumentiert
- ✅ Bereit für Deployment auf Hetzner Server

---

## Weitere Dokumentation

- **Hauptdokumentation**: `QUEUE_SYSTEM.md`
- **Deployment**: `QUEUE_SYSTEM_DEPLOYMENT.md`
- **Hetzner Setup**: `QUEUE_SYSTEM_HETZNER_SETUP.md`
- **Lokale Setup**: `QUEUE_SYSTEM_SETUP_LOCAL.md`

