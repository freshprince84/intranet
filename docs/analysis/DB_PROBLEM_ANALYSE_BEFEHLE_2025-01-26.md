# DB-Problem Analyse-Befehle (2025-01-26)

**Datum:** 2025-01-26  
**Problem:** DB scheint teilweise nicht erreichbar oder nicht zu laufen  
**Zweck:** Alle Symptome seit Tagen erklären

---

## 🔍 DB-STATUS PRÜFEN

### 1. Prüfe ob PostgreSQL läuft

**Befehl:**
```bash
systemctl status postgresql
```

**Oder:**
```bash
service postgresql status
```

**Erwartetes Ergebnis:**
- Status sollte "active (running)" sein
- Falls "inactive" oder "failed" → **DB läuft nicht!**

---

### 2. Prüfe PostgreSQL-Prozesse

**Befehl:**
```bash
ps aux | grep postgres
```

**Erwartetes Ergebnis:**
- Mehrere PostgreSQL-Prozesse sollten laufen
- Falls keine Prozesse → **DB läuft nicht!**

---

### 3. Prüfe PostgreSQL-Logs

**Befehl 1: System-Logs prüfen**
```bash
journalctl -u postgresql -n 100 --no-pager
```

**Befehl 2: PostgreSQL-Log-Datei prüfen (falls vorhanden)**
```bash
tail -100 /var/log/postgresql/postgresql-*.log
```

**Oder:**
```bash
find /var/log -name "*postgresql*" -type f 2>/dev/null | head -5
```

**Was zu prüfen:**
- Fehler-Meldungen
- Connection-Probleme
- Timeouts
- Memory-Probleme

---

### 4. Prüfe DB-Verbindung direkt

**Befehl 1: Prüfe ob DB-Port erreichbar ist**
```bash
netstat -tuln | grep 5432
```

**Oder:**
```bash
ss -tuln | grep 5432
```

**Erwartetes Ergebnis:**
- Port 5432 sollte "LISTEN" sein
- Falls nicht → **DB läuft nicht oder Port ist falsch!**

**Befehl 2: Teste DB-Verbindung**
```bash
cd /var/www/intranet/backend
cat .env | grep DATABASE_URL
```

**Dann DB-Verbindung testen (falls psql installiert ist):**
```bash
# Extrahiere DB-Daten aus DATABASE_URL
# Dann teste Verbindung
psql -h localhost -U postgres -d intranet -c "SELECT 1;"
```

---

### 5. Prüfe DB-Performance

**Befehl 1: Aktive DB-Verbindungen**
```bash
netstat -an | grep :5432 | wc -l
```

**Befehl 2: DB-Verbindungen nach Status**
```bash
netstat -an | grep :5432 | grep ESTABLISHED | wc -l
netstat -an | grep :5432 | grep TIME_WAIT | wc -l
netstat -an | grep :5432 | grep CLOSE_WAIT | wc -l
```

**Was zu prüfen:**
- Viele TIME_WAIT → **Viele Verbindungen werden nicht richtig geschlossen**
- Viele CLOSE_WAIT → **DB schließt Verbindungen, aber Client wartet noch**

---

### 6. Prüfe DB-Ressourcen

**Befehl 1: PostgreSQL Memory-Verbrauch**
```bash
ps aux | grep postgres | grep -v grep | awk '{sum+=$6} END {print sum/1024 " MB"}'
```

**Befehl 2: PostgreSQL CPU-Verbrauch**
```bash
top -b -n 1 | grep postgres
```

**Befehl 3: Disk I/O**
```bash
iostat -x 1 5 | grep -A 5 "Device"
```

**Was zu prüfen:**
- Hoher Memory-Verbrauch → **DB könnte Memory-Probleme haben**
- Hoher CPU-Verbrauch → **DB könnte überlastet sein**
- Hoher Disk I/O → **DB könnte langsam sein**

---

### 7. Prüfe DB-Konfiguration

**Befehl 1: PostgreSQL-Konfiguration prüfen**
```bash
sudo -u postgres psql -c "SHOW max_connections;"
sudo -u postgres psql -c "SHOW shared_buffers;"
sudo -u postgres psql -c "SHOW work_mem;"
```

**Befehl 2: Aktuelle Verbindungen**
```bash
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
```

**Befehl 3: Aktive Queries**
```bash
sudo -u postgres psql -c "SELECT pid, state, query FROM pg_stat_activity WHERE state != 'idle';"
```

**Was zu prüfen:**
- `max_connections` sollte ausreichend sein (normalerweise 100+)
- Viele aktive Queries → **DB könnte überlastet sein**
- Viele "waiting" Queries → **DB könnte blockiert sein**

---

### 8. Prüfe DB-Locks

**Befehl:**
```bash
sudo -u postgres psql -c "SELECT * FROM pg_locks WHERE NOT granted;"
```

**Was zu prüfen:**
- Viele Locks → **DB könnte blockiert sein**
- Locks die nicht granted sind → **Deadlocks möglich**

---

### 9. Prüfe DB-Performance-Statistiken

**Befehl:**
```bash
sudo -u postgres psql -c "SELECT * FROM pg_stat_database WHERE datname = 'intranet';"
```

**Was zu prüfen:**
- `numbackends` → Anzahl aktiver Verbindungen
- `xact_commit` / `xact_rollback` → Transaction-Statistiken
- `blks_read` / `blks_hit` → Cache-Hit-Rate

---

### 10. Prüfe DB-Logs für Fehler

**Befehl 1: System-Logs nach PostgreSQL-Fehlern**
```bash
journalctl -u postgresql --since "1 hour ago" | grep -i "error\|fatal\|panic"
```

**Befehl 2: PostgreSQL-Log-Datei nach Fehlern**
```bash
grep -i "error\|fatal\|panic" /var/log/postgresql/*.log | tail -50
```

**Was zu prüfen:**
- "connection refused" → **DB läuft nicht oder Port falsch**
- "out of memory" → **DB hat Memory-Probleme**
- "too many connections" → **Connection Pool ist voll**
- "deadlock" → **Deadlocks in der DB**

---

## 🔍 MÖGLICHE PROBLEME

### Problem 1: PostgreSQL läuft nicht

**Symptome:**
- `systemctl status postgresql` zeigt "inactive" oder "failed"
- Keine PostgreSQL-Prozesse
- Port 5432 nicht im LISTEN

**Lösung:**
```bash
systemctl start postgresql
systemctl status postgresql
```

---

### Problem 2: PostgreSQL läuft, aber Port ist nicht erreichbar

**Symptome:**
- PostgreSQL läuft, aber Port 5432 nicht im LISTEN
- Connection refused Fehler

**Lösung:**
```bash
# Prüfe PostgreSQL-Konfiguration
sudo -u postgres psql -c "SHOW listen_addresses;"
sudo -u postgres psql -c "SHOW port;"

# Prüfe postgresql.conf
cat /etc/postgresql/*/main/postgresql.conf | grep listen_addresses
cat /etc/postgresql/*/main/postgresql.conf | grep port
```

---

### Problem 3: PostgreSQL ist überlastet

**Symptome:**
- Viele aktive Queries
- Hoher CPU-Verbrauch
- Hoher Memory-Verbrauch
- Langsame Queries

**Lösung:**
- `max_connections` erhöhen
- `shared_buffers` erhöhen
- Langsame Queries optimieren

---

### Problem 4: Connection Pool ist voll

**Symptome:**
- Viele aktive Verbindungen (nahe am Limit)
- "too many connections" Fehler
- Connection Pool Timeouts

**Lösung:**
- `max_connections` in PostgreSQL erhöhen
- `connection_limit` in DATABASE_URL erhöhen
- Verbindungen richtig schließen

---

### Problem 5: PostgreSQL hat Memory-Probleme

**Symptome:**
- Hoher Memory-Verbrauch
- "out of memory" Fehler
- System wird langsam

**Lösung:**
- `shared_buffers` reduzieren
- `work_mem` reduzieren
- System-Memory erhöhen

---

### Problem 6: PostgreSQL hat Disk I/O-Probleme

**Symptome:**
- Hoher Disk I/O
- Langsame Queries
- System wird langsam

**Lösung:**
- Disk-Performance prüfen
- Indexes optimieren
- VACUUM durchführen

---

## 📋 ANALYSE-CHECKLISTE

### Was zu prüfen ist:

1. ✅ **PostgreSQL läuft?** - `systemctl status postgresql`
2. ✅ **Port 5432 erreichbar?** - `netstat -tuln | grep 5432`
3. ✅ **DB-Verbindung funktioniert?** - `psql -c "SELECT 1;"`
4. ✅ **Aktive Verbindungen?** - `netstat -an | grep :5432 | wc -l`
5. ✅ **DB-Logs prüfen?** - `journalctl -u postgresql -n 100`
6. ✅ **DB-Performance?** - `ps aux | grep postgres`
7. ✅ **DB-Konfiguration?** - `psql -c "SHOW max_connections;"`
8. ✅ **DB-Locks?** - `psql -c "SELECT * FROM pg_locks WHERE NOT granted;"`
9. ✅ **DB-Fehler?** - `journalctl -u postgresql | grep -i error`

---

## 🆘 BEI PROBLEMEN

**Falls PostgreSQL nicht läuft:**
```bash
systemctl start postgresql
systemctl status postgresql
```

**Falls PostgreSQL nicht startet:**
```bash
journalctl -u postgresql -n 100
# Prüfe Logs auf Fehler
```

**Falls Connection-Probleme:**
```bash
# Prüfe PostgreSQL-Konfiguration
sudo -u postgres psql -c "SHOW listen_addresses;"
sudo -u postgres psql -c "SHOW max_connections;"
```

---

**Erstellt:** 2025-01-26  
**Status:** 🔍 DB-Problem Analyse  
**Nächster Schritt:** Befehle ausführen und Ergebnisse analysieren

