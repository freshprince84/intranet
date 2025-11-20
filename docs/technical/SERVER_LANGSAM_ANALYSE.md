# Server-Langsam-Analyse: Hetzner Server (65.109.228.106)

## Datum der Analyse
Nach Prisma-Instanzen-Refactoring - Server lädt extrem langsam

## Server-Zugangsdaten

- **Server IP**: `65.109.228.106`
- **SSH User**: `root`
- **SSH Key**: `~/.ssh/intranet_rsa`
- **Server-Pfad**: `/var/www/intranet`
- **Backend-Pfad**: `/var/www/intranet/backend`
- **Frontend-Pfad**: `/var/www/intranet/frontend`

## 🔴🔴 KRITISCH: Zu prüfende Probleme

### 1. Server läuft noch mit altem Code (Prisma-Refactoring nicht aktiv)

**Problem:**
- Prisma-Refactoring wurde lokal durchgeführt (71 Dateien auf zentrale Instanz umgestellt)
- **Server wurde NICHT neu gestartet** → läuft noch mit altem Code
- Alte 71 Prisma-Instanzen laufen noch parallel

**Zu prüfen auf Server:**
```bash
# SSH zum Server
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106

# Prüfe ob neuer Code deployed wurde
cd /var/www/intranet
git log --oneline -5  # Prüfe letzte Commits

# Prüfe ob zentrale Prisma-Instanz existiert
ls -la backend/src/utils/prisma.ts

# Prüfe PM2-Prozess (läuft noch mit altem Code?)
pm2 list
pm2 logs intranet-backend --lines 50 | grep -i "prisma\|connection"
```

**Lösung:**
- **Server muss neu gestartet werden** (`pm2 restart intranet-backend`)
- **WICHTIG**: Nach Rücksprache mit Benutzer!

---

### 2. Connection Pool fehlt in DATABASE_URL

**Problem:**
- Zentrale Prisma-Instanz verwendet Standardwerte:
  - `connection_limit: 5` (nur 5 Verbindungen!)
  - `pool_timeout: 10` (10 Sekunden Timeout)
- Bei mehr als 5 gleichzeitigen Requests → Timeouts

**Zu prüfen auf Server:**
```bash
# Prüfe DATABASE_URL in .env
cd /var/www/intranet/backend
cat .env | grep DATABASE_URL

# Erwartet: Sollte `?connection_limit=20&pool_timeout=20` enthalten
# Aktuell: Wahrscheinlich NICHT vorhanden
```

**Aktueller Zustand (vermutet):**
```
DATABASE_URL="postgresql://user:password@host:port/database"
# FEHLT: ?connection_limit=20&pool_timeout=20
```

**Lösung:**
```bash
# .env Datei bearbeiten
nano /var/www/intranet/backend/.env

# DATABASE_URL anpassen:
DATABASE_URL="postgresql://user:password@host:port/database?connection_limit=20&pool_timeout=20"
```

**WICHTIG**: Nach Änderung → Server neu starten!

---

### 3. Mehrere PM2-Prozesse laufen parallel

**Problem:**
- Möglicherweise laufen mehrere Backend-Prozesse parallel
- Jeder Prozess erstellt eigene Prisma-Instanzen
- Ressourcen werden mehrfach belegt

**Zu prüfen auf Server:**
```bash
# Prüfe alle PM2-Prozesse
pm2 list

# Prüfe alle Node-Prozesse
ps aux | grep node | grep -v grep

# Prüfe Port 5000 (Backend)
netstat -tuln | grep 5000
# Oder:
lsof -i :5000

# Prüfe Memory-Verbrauch
pm2 monit
# Oder:
free -h
```

**Erwartete Prozesse:**
- `intranet-backend` (1x)
- `intranet-frontend` (optional, wenn über PM2)

**Problematisch:**
- Mehrere `intranet-backend` Prozesse
- Mehrere Node-Prozesse auf Port 5000
- Hoher Memory-Verbrauch (>2GB für Backend)

**Lösung:**
```bash
# Alle Backend-Prozesse stoppen
pm2 stop intranet-backend
pm2 delete intranet-backend

# Prüfe ob noch andere Node-Prozesse laufen
ps aux | grep node | grep -v grep

# Falls ja: Manuell beenden (VORSICHT!)
# kill <PID>

# Dann neu starten
cd /var/www/intranet/backend
pm2 start npm --name "intranet-backend" -- run start
# Oder falls ecosystem.config.js existiert:
pm2 start ecosystem.config.js
```

---

### 4. Redis läuft nicht oder hat Probleme

**Problem:**
- Queue-System benötigt Redis
- Falls Redis nicht läuft → Fallback auf synchrone Logik (langsam)
- Falls Redis Probleme hat → Verbindungsfehler

**Zu prüfen auf Server:**
```bash
# Prüfe Redis-Status
systemctl status redis-server

# Prüfe Redis-Verbindung
redis-cli ping
# Erwartet: PONG

# Prüfe Redis-Logs
journalctl -u redis-server -n 50 --no-pager

# Prüfe ob Redis-Port offen ist
netstat -tuln | grep 6379
# Oder:
lsof -i :6379
```

**Problematisch:**
- Redis läuft nicht (`inactive` oder `failed`)
- `redis-cli ping` gibt Fehler
- Port 6379 ist nicht offen

**Lösung:**
```bash
# Redis starten
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Prüfen
redis-cli ping  # Sollte "PONG" zurückgeben
```

**WICHTIG**: Nach Redis-Start → Backend neu starten!

---

### 5. Datenbank-Verbindungsprobleme

**Problem:**
- Datenbank ist überlastet
- Zu viele offene Verbindungen
- Langsame Queries

**Zu prüfen auf Server:**
```bash
# Prüfe PostgreSQL-Status
sudo systemctl status postgresql

# Prüfe aktive Datenbank-Verbindungen
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Prüfe langsame Queries (falls aktiviert)
sudo -u postgres psql -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds';"

# Prüfe Datenbank-Logs
sudo journalctl -u postgresql -n 100 --no-pager | grep -i error
```

**Problematisch:**
- Viele aktive Verbindungen (>50)
- Langsame Queries (>5 Sekunden)
- Connection Pool Timeouts in Logs

---

### 6. Alte Prisma-Instanzen laufen noch (Hot Reload Problem)

**Problem:**
- In Development: Hot Reload kann alte Instanzen nicht beenden
- Mehrere Prisma-Instanzen laufen parallel
- Jede Instanz hat eigenen Connection Pool

**Zu prüfen auf Server:**
```bash
# Prüfe Backend-Logs auf Prisma-Fehler
pm2 logs intranet-backend --lines 200 | grep -i "prisma\|connection\|timeout"

# Prüfe auf "Timed out fetching a new connection" Fehler
pm2 logs intranet-backend --lines 500 | grep -i "timed out"

# Prüfe auf Connection Pool Warnungen
pm2 logs intranet-backend --lines 500 | grep -i "pool"
```

**Erwartete Fehler (falls Problem vorhanden):**
```
Timed out fetching a new connection from the connection pool
Can't reach database server
Connection pool timeout
```

---

### 7. Frontend lädt zu viele Daten (Client-seitiges Filtering)

**Problem:**
- Backend liefert ALLE Requests/Tasks (kann 1000+ sein)
- Frontend filtert clientseitig
- Große JSON-Responses (mehrere MB)

**Zu prüfen auf Server:**
```bash
# Prüfe Backend-Logs auf große Responses
pm2 logs intranet-backend --lines 200 | grep -i "GET.*requests\|GET.*tasks"

# Prüfe Response-Größen (falls Logging aktiviert)
# Sollte in Logs sichtbar sein, falls implementiert
```

**Problematisch:**
- Responses >1MB
- Viele Requests werden gleichzeitig geladen
- Frontend filtert nach dem Laden

**Lösung:**
- Server-seitiges Filtering implementieren (nicht sofort, erst nach anderen Fixes)

---

### 8. Nginx/Reverse Proxy Probleme

**Problem:**
- Nginx könnte Probleme haben
- Timeouts zu kurz konfiguriert
- Buffer zu klein

**Zu prüfen auf Server:**
```bash
# Prüfe Nginx-Status
sudo systemctl status nginx

# Prüfe Nginx-Logs
sudo tail -n 100 /var/log/nginx/error.log
sudo tail -n 100 /var/log/nginx/access.log | grep -i "timeout\|error\|50[0-9]"

# Prüfe Nginx-Konfiguration
sudo cat /etc/nginx/sites-available/intranet | grep -i "timeout\|buffer"
```

**Problematisch:**
- Nginx-Fehler in Logs
- Timeout-Werte zu niedrig (<60s)
- Buffer zu klein (<8k)

---

## ✅ PRÜFUNG DURCHGEFÜHRT (20.11.2025)

### Ergebnisse der Server-Prüfung:

#### ✅ POSITIV:
1. **Zentrale Prisma-Instanz existiert**: `backend/src/utils/prisma.ts` vorhanden
2. **Code wurde gebaut**: `dist/utils/prisma.js` existiert (20:00 Uhr)
3. **Keine alten Prisma-Instanzen**: 0 `new PrismaClient()` im dist-Ordner gefunden
4. **DATABASE_URL korrekt konfiguriert**: `connection_limit=20&pool_timeout=20` bereits vorhanden
5. **PM2 läuft**: `intranet-backend` ist online (seit 25 Minuten)
6. **PostgreSQL-Verbindungen**: 15 aktive Verbindungen (OK, Limit ist 20)
7. **Memory**: 2.6GB verfügbar (ausreichend)
8. **Port 5000**: Läuft auf IPv6

#### ⚠️ PROBLEME GEFUNDEN:
1. **Server-Uptime**: 25 Minuten - Server wurde kürzlich neu gestartet
2. **Prisma-Validierungsfehler**: In Logs gefunden (LobbyPMS Reservation upsert)
3. **Redis nicht installiert**: Aber das ist OK, wenn Queue-System nicht aktiv ist
4. **Prisma Studio läuft**: Könnte Ressourcen verbrauchen (optional beenden)

#### 🔍 WICHTIGE ERKENNTNISSE:
- **Der Code ist korrekt**: Zentrale Prisma-Instanz wird verwendet
- **Connection Pool ist konfiguriert**: Kein Problem hier
- **Keine Connection Pool Timeouts** in den Logs gefunden
- **Server läuft mit neuem Code**: Keine alten Instanzen mehr

### Mögliche Ursachen für Langsamkeit:
1. **Prisma-Validierungsfehler** könnten Queries verlangsamen
2. **Prisma Studio** läuft parallel (könnte Ressourcen verbrauchen)
3. **Server wurde erst vor 25 Minuten neu gestartet** - könnte noch "warmlaufen"
4. **Frontend-Problem**: Client-seitiges Filtering (siehe PERFORMANCE_ANALYSE_AKTUELL.md)

---

## 📋 Checkliste: Was auf dem Server zu prüfen ist

### Schritt 1: SSH zum Server
```bash
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106
```

### Schritt 2: Prüfe Git-Status (neuer Code deployed?)
```bash
cd /var/www/intranet
git status
git log --oneline -5
```

### Schritt 3: Prüfe PM2-Prozesse
```bash
pm2 list
pm2 logs intranet-backend --lines 100
```

### Schritt 4: Prüfe Node-Prozesse
```bash
ps aux | grep node | grep -v grep
netstat -tuln | grep 5000
```

### Schritt 5: Prüfe DATABASE_URL
```bash
cd /var/www/intranet/backend
cat .env | grep DATABASE_URL
```

### Schritt 6: Prüfe Redis
```bash
systemctl status redis-server
redis-cli ping
```

### Schritt 7: Prüfe PostgreSQL
```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
```

### Schritt 8: Prüfe Logs auf Fehler
```bash
pm2 logs intranet-backend --lines 500 | grep -i "error\|timeout\|connection\|prisma"
```

### Schritt 9: Prüfe Memory/CPU
```bash
free -h
top -bn1 | head -20
```

### Schritt 10: Prüfe Nginx (falls verwendet)
```bash
sudo systemctl status nginx
sudo tail -n 50 /var/log/nginx/error.log
```

---

## 🔧 Empfohlene Lösungen (basierend auf Prüfung)

### Lösung 1: Prisma Studio beenden (OPTIONAL)

**Prisma Studio verbraucht Ressourcen und wird nicht benötigt:**

```bash
pm2 stop prisma-studio
pm2 delete prisma-studio
```

**Erwartete Verbesserung:**
- Weniger Memory-Verbrauch
- Weniger CPU-Last

---

### Lösung 2: Prisma-Validierungsfehler beheben

**Problem**: LobbyPMS Reservation upsert hat Validierungsfehler

**Zu prüfen:**
```bash
# Logs genauer ansehen
pm2 logs intranet-backend --lines 200 | grep -i "LobbyPMS\|reservation\|validation"
```

**Mögliche Ursache:**
- Falsche Datenstruktur bei Reservation upsert
- Fehlende oder falsche Felder

**Lösung:**
- Code in `lobbyPmsController.ts` prüfen
- Reservation-Modell prüfen

---

### Lösung 3: Server neu starten (falls nötig)

**Falls Performance-Probleme weiterhin bestehen:**

```bash
# Backend neu starten
pm2 restart intranet-backend

# Logs prüfen
pm2 logs intranet-backend --lines 50
```

**Erwartete Verbesserung:**
- Alle Prozesse werden neu initialisiert
- Connection Pool wird neu aufgebaut

```bash
# Alle Backend-Prozesse stoppen
pm2 stop all
pm2 delete all

# Prüfe ob noch andere Node-Prozesse laufen
ps aux | grep node | grep -v grep

# Falls ja: Manuell beenden (VORSICHT - nur wenn sicher!)
# kill <PID>

# Neu starten
cd /var/www/intranet/backend
pm2 start npm --name "intranet-backend" -- run start
pm2 save
```

---

### Lösung 4: Frontend-Problem prüfen (Client-seitiges Filtering)

**Problem**: Backend liefert ALLE Daten, Frontend filtert clientseitig

**Siehe**: `docs/technical/PERFORMANCE_ANALYSE_AKTUELL.md` - Abschnitt "Client-seitiges Filtering"

**Lösung**: Server-seitiges Filtering implementieren (nicht sofort, erst nach anderen Fixes)

```bash
# Redis starten
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Prüfen
redis-cli ping  # Sollte "PONG" zurückgeben

# Backend neu starten
pm2 restart intranet-backend
```

---

## 📊 Aktueller Zustand (nach Prüfung)

### ✅ BEREITS GUT:
- **1 Prisma-Instanz** (zentral) ✅
- **Connection Pool: 20 Verbindungen** ✅
- **Keine Connection Pool Timeouts** in Logs ✅
- **Code ist korrekt deployed** ✅

### ⚠️ MÖGLICHE PROBLEME:
- **Prisma-Validierungsfehler** (LobbyPMS)
- **Prisma Studio läuft** (kann beendet werden)
- **Frontend-Problem**: Client-seitiges Filtering (siehe PERFORMANCE_ANALYSE_AKTUELL.md)

### 🔍 FAZIT:
**Der Server-Code ist korrekt!** Die Langsamkeit könnte von:
1. Prisma-Validierungsfehlern kommen (wiederholte Fehler verlangsamen)
2. Frontend-Problem (client-seitiges Filtering)
3. Anderen Faktoren (Netzwerk, Browser-Cache, etc.)

**Empfehlung**: 
1. Prisma Studio beenden (optional)
2. Prisma-Validierungsfehler beheben
3. Frontend-Problem prüfen (siehe PERFORMANCE_ANALYSE_AKTUELL.md)

---

## ⚠️ WICHTIG: Nichts ändern ohne Rücksprache!

**Diese Analyse dient nur zur Prüfung!**

**Vor Änderungen:**
1. ✅ Alle Punkte prüfen (Checkliste durchgehen)
2. ✅ Logs analysieren
3. ✅ Probleme identifizieren
4. ✅ Lösungsplan vorlegen
5. ✅ **NUR nach ausdrücklicher Bestätigung des Benutzers umsetzen!**

---

## Nächste Schritte

1. **Prüfung durchführen** (Checkliste oben)
2. **Logs analysieren** (Fehler identifizieren)
3. **Probleme dokumentieren** (was gefunden wurde)
4. **Lösungsplan vorlegen** (was zu tun ist)
5. **Nach Bestätigung umsetzen** (nur mit Erlaubnis!)

---

## Referenzen

- **Performance-Analyse**: `docs/technical/PERFORMANCE_ANALYSE_AKTUELL.md`
- **Prisma-Refactoring-Plan**: `docs/technical/PRISMA_INSTANZEN_REFACTORING_PLAN.md`
- **Queue-System Setup**: `docs/technical/QUEUE_SYSTEM_HETZNER_SETUP.md`
- **Server-Update-Anleitung**: `docs/technical/SERVER_UPDATE.md`

