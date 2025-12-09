# Login-Problem alvillat - Lösung

**Datum:** 2025-01-31  
**Status:** 🔴 ROOT CAUSE IDENTIFIZIERT  
**Problem:** PostgreSQL-Server ist intermittierend nicht erreichbar

---

## 🔴 ROOT CAUSE IDENTIFIZIERT

### Problem:
**PostgreSQL-Server ist intermittierend nicht erreichbar** (`Can't reach database server at localhost:5432`)

### Beweis aus Logs:
```
[LOGIN] ✅ Cache-Warming abgeschlossen für User 50  ← Login funktioniert
prisma:error
Can't reach database server at `localhost:5432`     ← Danach: DB nicht erreichbar
Please make sure your database server is running at `localhost:5432`.
```

### Warum nur von bestimmten Geräten?
- **Timing-Problem**: Wenn die Benutzerin sich einloggt, ist PostgreSQL gerade nicht erreichbar
- **Von anderen Geräten funktioniert es**: Timing - PostgreSQL ist gerade erreichbar
- **Intermittierend**: Manchmal funktioniert es, manchmal nicht

---

## 🔍 DIAGNOSE-BEFEHLE

### 1. PostgreSQL-Status prüfen

```bash
# Prüfe ob PostgreSQL läuft
systemctl status postgresql

# Prüfe PostgreSQL-Prozesse
ps aux | grep postgres

# Prüfe ob PostgreSQL auf Port 5432 lauscht
netstat -tulpn | grep 5432
# oder
ss -tulpn | grep 5432
```

### 2. PostgreSQL-Logs prüfen

```bash
# PostgreSQL-Logs prüfen (Ubuntu/Debian)
tail -n 100 /var/log/postgresql/postgresql-*-main.log

# Oder alle PostgreSQL-Logs
journalctl -u postgresql -n 100 --no-pager
```

### 3. PostgreSQL-Verbindung testen

```bash
# Direkte Verbindung testen
sudo -u postgres psql -d intranet -c "SELECT version();"

# Prüfe aktive Verbindungen
sudo -u postgres psql -d intranet -c "SELECT count(*) FROM pg_stat_activity;"

# Prüfe maximale Verbindungen
sudo -u postgres psql -d intranet -c "SHOW max_connections;"
```

### 4. System-Ressourcen prüfen

```bash
# Memory-Verbrauch
free -h

# CPU-Verbrauch
top -bn1 | head -20

# Disk-Space
df -h

# PostgreSQL-spezifische Ressourcen
sudo -u postgres psql -d intranet -c "SELECT * FROM pg_stat_database WHERE datname = 'intranet';"
```

---

## 🔧 LÖSUNGEN

### Lösung 1: PostgreSQL neu starten (SOFORT)

```bash
# PostgreSQL neu starten
sudo systemctl restart postgresql

# Status prüfen
sudo systemctl status postgresql
```

### Lösung 2: PostgreSQL-Konfiguration prüfen

```bash
# Prüfe PostgreSQL-Konfiguration
sudo -u postgres psql -d intranet -c "SHOW listen_addresses;"
sudo -u postgres psql -d intranet -c "SHOW max_connections;"
sudo -u postgres psql -d intranet -c "SHOW shared_buffers;"
```

### Lösung 3: PostgreSQL-Logs auf Fehler prüfen

```bash
# Suche nach Fehlern in PostgreSQL-Logs
grep -i "error\|fatal\|panic" /var/log/postgresql/postgresql-*-main.log | tail -50

# Prüfe ob PostgreSQL abgestürzt ist
journalctl -u postgresql --since "1 hour ago" | grep -i "error\|fatal\|panic" | tail -50
```

### Lösung 4: PostgreSQL-Verbindungslimit prüfen (WICHTIG!)

```bash
# Prüfe aktive Verbindungen vs. Limit
sudo -u postgres psql -d intranet -c "
SELECT 
    count(*) as active_connections,
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') - count(*) as available_connections
FROM pg_stat_activity
WHERE datname = 'intranet';
"

# Prüfe alle aktiven Verbindungen (DETAILS)
sudo -u postgres psql -d intranet -c "
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    wait_event_type,
    wait_event,
    query_start,
    now() - query_start as query_duration,
    LEFT(query, 100) as query_preview
FROM pg_stat_activity
WHERE datname = 'intranet'
ORDER BY query_start;
"

# Prüfe blockierende Queries
sudo -u postgres psql -d intranet -c "
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
"
```

### Lösung 5: Prisma Connection Pool prüfen (WICHTIG!)

```bash
# Prüfe DATABASE_URL in .env
cd /var/www/intranet/backend
cat .env | grep DATABASE_URL

# Erwartet: Sollte connection_limit enthalten, z.B.:
# DATABASE_URL="postgresql://user:password@localhost:5432/intranet?connection_limit=20&pool_timeout=20"
```

### Lösung 6: PostgreSQL automatischen Neustart aktivieren

```bash
# Prüfe ob PostgreSQL automatisch startet
systemctl is-enabled postgresql

# Falls nicht, aktivieren:
sudo systemctl enable postgresql
```

---

## 🎯 SOFORTMASSNAHME

**1. DATABASE_URL prüfen (WICHTIG!):**
```bash
cd /var/www/intranet/backend
cat .env | grep DATABASE_URL
```

**2. Prisma Connection Pool Status prüfen:**
```bash
# Prüfe ob Prisma-Pools voll sind (in Backend-Logs)
cd /var/www/intranet/backend
pm2 logs intranet-backend --lines 500 --nostream | grep -iE "prisma.*pool|connection.*pool|Timed out fetching" | tail -50
```

**3. PostgreSQL-Status prüfen (bereits gemacht - OK):**
- ✅ 19 aktive Verbindungen von 100 max
- ✅ PostgreSQL lauscht auf 127.0.0.1:5432

**4. Falls DATABASE_URL keine connection_limit hat, prüfe Backend-Code:**
```bash
# Prisma-Konfiguration prüfen
cd /var/www/intranet/backend
grep -A 20 "createPrismaClient\|connectionLimit\|NUM_POOLS" src/utils/prisma.ts | head -30
```

**5. Backend-Server neu starten (nach Absprache!):**
```bash
pm2 restart intranet-backend
```

---

## 📊 ERWARTETE ERGEBNISSE

### Nach Lösung sollte sein:
- ✅ PostgreSQL läuft: `systemctl status postgresql` zeigt `active (running)`
- ✅ PostgreSQL ist erreichbar: `psql`-Befehle funktionieren
- ✅ Keine `Can't reach database server` Fehler mehr in Logs
- ✅ Login funktioniert von allen Geräten

---

## ✅ DIAGNOSE-ERGEBNISSE (2025-01-31)

### PostgreSQL-Status:
- ✅ PostgreSQL läuft: `active (exited)` seit 1 Woche
- ✅ PostgreSQL ist erreichbar: `SELECT version()` funktioniert
- ✅ PostgreSQL 16.11 läuft
- ✅ **19 aktive Verbindungen von 100 max** - Connection Pool ist NICHT voll (81 verfügbar)
- ✅ PostgreSQL lauscht auf `127.0.0.1:5432` - korrekt
- ⚠️ Nur 3 Fehler in Logs (nicht kritisch):
  - 1x `duplicate key value violates unique constraint` (UserTableSettings) - nicht kritisch
  - 2x `Peer authentication failed` - nur bei fehlgeschlagenen psql-Versuchen

### Problem:
PostgreSQL läuft und hat freie Verbindungen, aber Backend kann intermittierend nicht verbinden. **Mögliche Ursachen:**
1. **Prisma Connection Pool ist voll** - Prisma's interner Pool (nicht PostgreSQL!)
2. **Prisma kann keine Verbindung aus dem Pool bekommen** - Obwohl PostgreSQL Verbindungen frei hat
3. **DATABASE_URL Konfiguration** - Connection Pool Settings fehlen oder sind falsch
4. **Netzwerk-Problem** - Intermittierende Verbindungsprobleme zwischen Prisma und PostgreSQL

---

## 🔍 WENN PROBLEM PERSISTIERT

### Weitere Prüfungen:

1. **Firewall prüfen:**
```bash
sudo ufw status
sudo iptables -L -n | grep 5432
```

2. **PostgreSQL-Konfiguration prüfen:**
```bash
# Prüfe pg_hba.conf
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -v "^#" | grep -v "^$"

# Prüfe postgresql.conf
sudo grep -E "listen_addresses|port" /etc/postgresql/*/main/postgresql.conf
```

3. **System-Logs prüfen:**
```bash
# System-Logs auf PostgreSQL-Fehler prüfen
journalctl -xe | grep -i postgres | tail -50
```

---

## ⚠️ WICHTIGE HINWEISE

- **Server-Neustart nur nach Absprache**
- **PostgreSQL-Neustart kann kurz dauern** (1-2 Sekunden)
- **Aktive Verbindungen werden getrennt** beim Neustart
- **Backend sollte automatisch reconnecten** nach Neustart

