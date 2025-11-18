# Queue-System: Dokumentations-Übersicht

## Übersicht

Das Queue-System verwendet **BullMQ** mit **Redis** für asynchrone Background-Jobs. Dies ermöglicht **99% schnellere Frontend-Responses** bei Reservierungs-Erstellung und Guest Contact Updates.

**Performance-Verbesserung:**
- **Vorher**: 2-8 Sekunden Blockierung
- **Nachher**: <100ms Response-Zeit

---

## Dokumentations-Struktur

### 1. Übersicht und Einstieg
- **[QUEUE_SYSTEM.md](QUEUE_SYSTEM.md)** - Hauptdokumentation mit Übersicht, Setup und Funktionsweise
- **[QUEUE_PERFORMANCE_VERBESSERUNGEN.md](QUEUE_PERFORMANCE_VERBESSERUNGEN.md)** - Detaillierte Performance-Analyse

### 2. Setup-Anleitungen
- **[QUEUE_SYSTEM_SETUP_LOCAL.md](QUEUE_SYSTEM_SETUP_LOCAL.md)** - Lokale Entwicklungsumgebung (Windows)
- **[QUEUE_SYSTEM_DEPLOYMENT.md](QUEUE_SYSTEM_DEPLOYMENT.md)** - Deployment für lokale und Server-Umgebung
- **[QUEUE_SYSTEM_HETZNER_SETUP.md](QUEUE_SYSTEM_HETZNER_SETUP.md)** - Vollständige Hetzner Server Setup-Anleitung

### 3. Implementation
- **[QUEUE_SYSTEM_IMPLEMENTATION.md](../implementation_plans/QUEUE_SYSTEM_IMPLEMENTATION.md)** - Detaillierter Implementation Plan

---

## Quick Start

### Lokal (Windows)

1. **Memurai installieren** (Redis-kompatibel für Windows)
   - Download: https://www.memurai.com/get-memurai
   - Installer ausführen
   - Prüfung: `memurai-cli ping` → `PONG`

2. **`.env` Datei konfigurieren** (bereits gesetzt):
   ```env
   QUEUE_ENABLED=true
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

3. **Server starten**:
   ```bash
   cd backend
   npm run dev
   ```

### Hetzner Server

1. **Redis installieren**:
   ```bash
   ssh root@65.109.228.106
   cd /var/www/intranet
   chmod +x scripts/setup-redis-on-server.sh
   ./scripts/setup-redis-on-server.sh
   ```

2. **`.env` Datei aktualisieren** (manuell):
   ```bash
   cd /var/www/intranet/backend
   nano .env
   # Queue-Einstellungen hinzufügen (siehe QUEUE_SYSTEM_HETZNER_SETUP.md)
   ```

3. **Server neu starten**:
   ```bash
   pm2 restart intranet-backend
   ```

---

## Verwendete Stellen

### Aktuell implementiert

1. **Reservation-Erstellung** (`POST /api/reservations`)
   - Performance: 2-6s → <100ms (99% schneller)
   - Worker: `reservationWorker.ts`

2. **Guest Contact Update** (`PUT /api/reservations/:id/guest-contact`)
   - Performance: 3-8s → <100ms (99% schneller)
   - Worker: `updateGuestContactWorker.ts`

### Geplant

- Check-in-Bestätigung
- Scheduled Jobs (späte Check-in-Einladungen)
- SIRE-Registrierung
- Monatsabrechnungen

Siehe: `docs/technical/QUEUE_ANALYSE_ALLE_STELLEN.md` für vollständige Analyse.

---

## Wichtige Hinweise

### Fallback-Verhalten

Falls Redis nicht verfügbar ist:
- System läuft automatisch mit alter synchroner Logik
- Keine Funktionalität geht verloren
- Warnung in Logs: `[Queue] ⚠️ Redis nicht verfügbar`

### .env Dateien

- **NICHT** im Git enthalten (`.gitignore`)
- **Müssen manuell** auf Server gesetzt werden
- Lokal: bereits konfiguriert
- Server: siehe `QUEUE_SYSTEM_HETZNER_SETUP.md`

---

## Troubleshooting

### Problem: Redis-Verbindung fehlgeschlagen (IPv6 vs IPv4)

**Symptom:**
```
[Queue Service] Redis-Verbindungsfehler: connect ECONNREFUSED ::1:6379
```

**Lösung:**
- **Fix bereits implementiert**: `family: 4` in `queueService.ts` erzwingt IPv4
- **Siehe**: `QUEUE_SYSTEM_IPV4_FIX.md` für detaillierte Erklärung

### Problem: Redis-Verbindung fehlgeschlagen (allgemein)

**Lösung:**
1. Prüfen ob Redis läuft: `redis-cli ping` (sollte `PONG` zurückgeben)
2. Redis starten: `sudo systemctl start redis-server` (Linux) oder Memurai starten (Windows)
3. `.env` Datei prüfen: `REDIS_HOST=localhost`, `REDIS_PORT=6379`
4. IPv4/IPv6-Problem prüfen (siehe oben)

### Problem: Queue-System startet nicht

**Lösung:**
1. `.env` Datei prüfen: `QUEUE_ENABLED=true`
2. Redis-Status prüfen: `systemctl status redis-server` (Linux)
3. Server neu starten: `pm2 restart intranet-backend` (Server) oder `npm run dev` (lokal)

### Weitere Probleme

Siehe:
- `QUEUE_SYSTEM_IPV4_FIX.md` - IPv4/IPv6-Verbindungsproblem (wichtig!)
- `QUEUE_SYSTEM_DEPLOYMENT.md` → Abschnitt "Troubleshooting"
- `QUEUE_SYSTEM_HETZNER_SETUP.md` → Abschnitt "Troubleshooting"

---

## Monitoring

### Logs prüfen

**Lokal:**
```bash
# Backend-Logs
npm run dev
# Suche nach: [Queue] ✅ Workers gestartet
```

**Server:**
```bash
# Backend-Logs
pm2 logs intranet-backend | grep -i queue

# Erwartete Ausgabe:
# [Queue Service] ✅ Redis-Verbindung hergestellt
# [Queue] ✅ Workers gestartet
# [Queue] Concurrency: 5 Jobs parallel
```

### Redis-Status

```bash
# Redis-Info
redis-cli info

# Verbindung testen
redis-cli ping  # Sollte "PONG" zurückgeben
```

---

## Nächste Schritte

1. **Lokal**: Redis/Memurai installieren und testen
2. **Server**: Redis installieren und `.env` aktualisieren
3. **Verifizierung**: Logs prüfen, Performance testen
4. **Monitoring**: Redis-Status regelmäßig prüfen

---

## Weitere Ressourcen

- **BullMQ Dokumentation**: https://docs.bullmq.io/
- **Redis Dokumentation**: https://redis.io/docs/
- **Memurai (Windows)**: https://www.memurai.com/

