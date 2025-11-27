# DB-Problem Root Cause Analyse (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔴🔴🔴 KRITISCH - DB scheint teilweise nicht erreichbar  
**Problem:** Alle Symptome seit Tagen könnten durch DB-Problem erklärt werden

---

## 🔴🔴🔴 MÖGLICHE ROOT CAUSES

### Root Cause 1: PostgreSQL läuft nicht richtig

**Symptome:**
- ✅ Viele DB-Verbindungsfehler (23 in 500 Zeilen)
- ✅ Ein Fehler erreicht attempt 3/3 → Alle Retries fehlgeschlagen
- ✅ System extrem langsam
- ✅ Connection Pool fast voll (16 von 20)
- ✅ Timeouts

**Prüfung:**
```bash
systemctl status postgresql
ps aux | grep postgres
netstat -tuln | grep 5432
```

**Mögliche Ursachen:**
- PostgreSQL wurde gestoppt
- PostgreSQL ist abgestürzt
- PostgreSQL startet nicht richtig
- PostgreSQL läuft, aber Port ist nicht erreichbar

---

### Root Cause 2: PostgreSQL ist überlastet

**Symptome:**
- ✅ Viele DB-Verbindungsfehler
- ✅ System Load erhöht (2.15)
- ✅ Connection Pool fast voll
- ✅ Langsame Queries

**Prüfung:**
```bash
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
sudo -u postgres psql -c "SELECT pid, state, query FROM pg_stat_activity WHERE state != 'idle';"
ps aux | grep postgres | grep -v grep | awk '{sum+=$6} END {print sum/1024 " MB"}'
```

**Mögliche Ursachen:**
- Zu viele gleichzeitige Verbindungen
- Langsame Queries blockieren DB
- DB hat Memory-Probleme
- DB hat Disk I/O-Probleme

---

### Root Cause 3: Connection Pool ist voll / blockiert

**Symptome:**
- ✅ Connection Pool zu 80% ausgelastet (16 von 20)
- ✅ Viele DB-Verbindungsfehler
- ✅ Timeouts
- ✅ System langsam

**Prüfung:**
```bash
netstat -an | grep :5432 | wc -l
netstat -an | grep :5432 | grep ESTABLISHED | wc -l
netstat -an | grep :5432 | grep TIME_WAIT | wc -l
sudo -u postgres psql -c "SHOW max_connections;"
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
```

**Mögliche Ursachen:**
- `max_connections` zu niedrig
- Verbindungen werden nicht richtig geschlossen
- Viele hängende Verbindungen
- Connection Pool Timeout

---

### Root Cause 4: PostgreSQL hat Memory-Probleme

**Symptome:**
- ✅ System langsam
- ✅ DB-Verbindungsfehler
- ✅ Hoher Memory-Verbrauch (600MB-3GB im Frontend?)

**Prüfung:**
```bash
ps aux | grep postgres | grep -v grep | awk '{sum+=$6} END {print sum/1024 " MB"}'
sudo -u postgres psql -c "SHOW shared_buffers;"
sudo -u postgres psql -c "SHOW work_mem;"
free -h
```

**Mögliche Ursachen:**
- `shared_buffers` zu hoch
- `work_mem` zu hoch
- System hat nicht genug Memory
- Memory Leaks in PostgreSQL

---

### Root Cause 5: PostgreSQL hat Disk I/O-Probleme

**Symptome:**
- ✅ Langsame Queries
- ✅ System langsam
- ✅ DB-Verbindungsfehler

**Prüfung:**
```bash
iostat -x 1 5
df -h
sudo -u postgres psql -c "SELECT * FROM pg_stat_database WHERE datname = 'intranet';"
```

**Mögliche Ursachen:**
- Disk ist voll
- Disk I/O ist langsam
- Viele langsame Queries
- Indexes fehlen

---

### Root Cause 6: PostgreSQL hat Locks / Deadlocks

**Symptome:**
- ✅ Langsame Queries
- ✅ DB-Verbindungsfehler
- ✅ Timeouts

**Prüfung:**
```bash
sudo -u postgres psql -c "SELECT * FROM pg_locks WHERE NOT granted;"
sudo -u postgres psql -c "SELECT pid, locktype, mode, granted FROM pg_locks WHERE NOT granted;"
```

**Mögliche Ursachen:**
- Viele Locks
- Deadlocks
- Lange laufende Transaktionen
- Queries blockieren sich gegenseitig

---

### Root Cause 7: DATABASE_URL ist falsch / Connection-Problem

**Symptome:**
- ✅ DB-Verbindungsfehler
- ✅ Teilweise funktioniert es, teilweise nicht

**Prüfung:**
```bash
cd /var/www/intranet/backend
cat .env | grep DATABASE_URL
# Prüfe ob connection_limit und pool_timeout vorhanden sind
```

**Mögliche Ursachen:**
- `DATABASE_URL` ist falsch
- `connection_limit` fehlt oder zu niedrig
- `pool_timeout` fehlt oder zu niedrig
- PM2 verwendet alte Environment-Variablen

---

## 📋 ANALYSE-BEFEHLE (ALLE AUSFÜHREN)

### Schritt 1: PostgreSQL-Status prüfen

```bash
# 1. PostgreSQL-Status
systemctl status postgresql

# 2. PostgreSQL-Prozesse
ps aux | grep postgres

# 3. Port 5432 prüfen
netstat -tuln | grep 5432
```

---

### Schritt 2: DB-Verbindung testen

```bash
# 1. DATABASE_URL prüfen
cd /var/www/intranet/backend
cat .env | grep DATABASE_URL

# 2. DB-Verbindung testen (falls psql installiert)
# Extrahiere DB-Daten aus DATABASE_URL und teste:
psql -h localhost -U intranetuser -d intranet -c "SELECT 1;"
```

---

### Schritt 3: DB-Performance prüfen

```bash
# 1. Aktive Verbindungen
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# 2. Aktive Queries
sudo -u postgres psql -c "SELECT pid, state, query FROM pg_stat_activity WHERE state != 'idle';"

# 3. DB-Konfiguration
sudo -u postgres psql -c "SHOW max_connections;"
sudo -u postgres psql -c "SHOW shared_buffers;"
```

---

### Schritt 4: DB-Logs prüfen

```bash
# 1. PostgreSQL-System-Logs
journalctl -u postgresql -n 100 --no-pager

# 2. PostgreSQL-Log-Datei (falls vorhanden)
tail -100 /var/log/postgresql/postgresql-*.log

# 3. Fehler in Logs
journalctl -u postgresql --since "1 hour ago" | grep -i "error\|fatal\|panic"
```

---

### Schritt 5: DB-Ressourcen prüfen

```bash
# 1. PostgreSQL Memory
ps aux | grep postgres | grep -v grep | awk '{sum+=$6} END {print sum/1024 " MB"}'

# 2. PostgreSQL CPU
top -b -n 1 | grep postgres

# 3. System Memory
free -h
```

---

## 🔍 WAS ALLE SYMPTOME ERKLÄREN WÜRDE

### Symptom 1: System extrem langsam

**Erklärung:**
- DB-Verbindungsfehler → executeWithRetry → Retries → Delays → System langsam
- Connection Pool voll → Requests warten → System langsam
- Langsame DB-Queries → System langsam

---

### Symptom 2: Viele DB-Verbindungsfehler

**Erklärung:**
- PostgreSQL läuft nicht richtig → DB-Verbindungsfehler
- Connection Pool ist voll → DB-Verbindungsfehler
- PostgreSQL ist überlastet → DB-Verbindungsfehler

---

### Symptom 3: Connection Pool fast voll

**Erklärung:**
- PostgreSQL ist überlastet → Viele Verbindungen
- Verbindungen werden nicht richtig geschlossen → Connection Pool voll
- `max_connections` zu niedrig → Connection Pool voll

---

### Symptom 4: System Load erhöht

**Erklärung:**
- PostgreSQL ist überlastet → Hoher CPU-Verbrauch
- Viele Retries → Hoher CPU-Verbrauch
- Viele parallele Requests → Hoher CPU-Verbrauch

---

### Symptom 5: RAM-Verbrauch 600MB-3GB

**Erklärung:**
- PostgreSQL hat Memory-Probleme → Hoher Memory-Verbrauch
- Viele Promise-Objekte durch Retries → Hoher Memory-Verbrauch
- Frontend Memory Leaks (Browser) → Hoher Memory-Verbrauch

---

## 💡 MÖGLICHE LÖSUNGEN

### Lösung 1: PostgreSQL neu starten

**Falls PostgreSQL nicht richtig läuft:**
```bash
systemctl restart postgresql
systemctl status postgresql
```

---

### Lösung 2: Connection Pool erhöhen

**Falls Connection Pool zu klein ist:**
```bash
# In .env: connection_limit von 20 auf 30-40 erhöhen
# Dann Server neu starten
```

---

### Lösung 3: PostgreSQL max_connections erhöhen

**Falls PostgreSQL max_connections zu niedrig ist:**
```bash
sudo -u postgres psql -c "SHOW max_connections;"
# Falls zu niedrig: In postgresql.conf erhöhen
```

---

### Lösung 4: Langsame Queries optimieren

**Falls langsame Queries das Problem sind:**
```bash
sudo -u postgres psql -c "SELECT pid, now() - query_start as duration, query FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 seconds' ORDER BY duration DESC;"
```

---

## 📋 ZUSAMMENFASSUNG

### Mögliche Root Causes:

1. ✅ **PostgreSQL läuft nicht richtig** - Erklärt alle Symptome
2. ✅ **PostgreSQL ist überlastet** - Erklärt alle Symptome
3. ✅ **Connection Pool ist voll** - Erklärt alle Symptome
4. ✅ **PostgreSQL hat Memory-Probleme** - Erklärt RAM-Verbrauch
5. ✅ **PostgreSQL hat Disk I/O-Probleme** - Erklärt Langsamkeit
6. ✅ **PostgreSQL hat Locks** - Erklärt Timeouts
7. ✅ **DATABASE_URL ist falsch** - Erklärt Verbindungsfehler

### Nächste Schritte:

1. ✅ **PostgreSQL-Status prüfen** - Läuft PostgreSQL?
2. ✅ **DB-Verbindung testen** - Funktioniert die Verbindung?
3. ✅ **DB-Performance prüfen** - Ist PostgreSQL überlastet?
4. ✅ **DB-Logs prüfen** - Gibt es Fehler in den Logs?
5. ✅ **DB-Ressourcen prüfen** - Hat PostgreSQL genug Ressourcen?

---

**Erstellt:** 2025-01-26  
**Status:** 🔍 DB-Problem Analyse  
**Nächster Schritt:** Befehle ausführen und Ergebnisse analysieren

