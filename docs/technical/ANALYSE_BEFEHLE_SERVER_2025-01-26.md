# Analyse-Befehle für Server (2025-01-26)

**Datum:** 2025-01-26  
**Zweck:** Performance-Probleme analysieren - System extrem langsam, RAM-Verbrauch 600MB-3GB+

---

## 🔌 SSH-VERBINDUNG ZUM SERVER

### Schritt 1: SSH-Verbindung herstellen

**Befehl:**
```bash
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106
```

**Falls der SSH-Key woanders liegt:**
```bash
ssh -i /pfad/zum/key root@65.109.228.106
```

**Falls kein SSH-Key verwendet wird:**
```bash
ssh root@65.109.228.106
```

**Nach erfolgreicher Verbindung:**
- Du solltest eine Eingabeaufforderung sehen: `root@server:~#`
- Du bist jetzt auf dem Server

---

## 📊 ANALYSE-BEFEHLE

### 1. Server-Logs prüfen - executeWithRetry Retries

**Befehl 1: Letzte 200 Log-Zeilen prüfen**
```bash
pm2 logs intranet-backend --lines 200 --nostream | grep -i "prisma\|retry\|error\|timeout"
```

**Befehl 2: Alle Retry-Meldungen zählen**
```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -i "retry" | wc -l
```

**Befehl 3: DB-Verbindungsfehler prüfen**
```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -i "DB connection error"
```

**Befehl 4: Prisma-Fehler prüfen**
```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -i "prisma" | tail -50
```

**Befehl 5: Timeout-Fehler prüfen**
```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -i "timeout"
```

**Erwartete Ausgabe:**
- `[Prisma] DB connection error (attempt X/3):` - Zeigt Retries
- `[Prisma] Retrying after X attempt(s)` - Zeigt Retry-Logik
- `Operations timed out` - Zeigt Timeouts

---

### 2. Memory-Verbrauch prüfen

**Befehl 1: Aktueller Memory-Verbrauch**
```bash
pm2 status
```

**Befehl 2: Detaillierter Memory-Verbrauch**
```bash
pm2 describe intranet-backend | grep -i "memory\|cpu"
```

**Befehl 3: System-weiter Memory-Verbrauch**
```bash
free -h
```

**Befehl 4: Top-Prozesse nach Memory**
```bash
ps aux --sort=-%mem | head -20
```

**Befehl 5: Node.js Memory-Verbrauch**
```bash
ps aux | grep node | grep -v grep
```

**Erwartete Ausgabe:**
- Memory-Verbrauch sollte normalerweise **100-500MB** sein
- **600MB-3GB+** deutet auf Memory Leaks hin

---

### 3. Connection Pool Status prüfen

**Befehl 1: Aktive Datenbank-Verbindungen prüfen**
```bash
cd /var/www/intranet/backend
cat .env | grep DATABASE_URL
```

**Befehl 2: Connection Pool Einstellungen prüfen**
```bash
cd /var/www/intranet/backend
cat .env | grep -E "connection_limit|pool_timeout"
```

**Befehl 3: Prisma Query Logging aktivieren (temporär)**
```bash
cd /var/www/intranet/backend
# Prüfe ob ENABLE_QUERY_LOGGING gesetzt ist
cat .env | grep ENABLE_QUERY_LOGGING
```

**Erwartete Ausgabe:**
- `connection_limit=20` sollte vorhanden sein
- `pool_timeout=20` sollte vorhanden sein

---

### 4. Performance-Metriken prüfen

**Befehl 1: PM2 Status und Metriken**
```bash
pm2 status
pm2 monit
```

**Befehl 2: CPU-Verbrauch prüfen**
```bash
top -b -n 1 | head -20
```

**Befehl 3: I/O-Statistiken**
```bash
iostat -x 1 5
```

**Befehl 4: Netzwerk-Verbindungen prüfen**
```bash
netstat -an | grep :5432 | wc -l
```

**Befehl 5: Aktive HTTP-Verbindungen**
```bash
netstat -an | grep :5000 | wc -l
```

---

### 5. Logs nach spezifischen Fehlern durchsuchen

**Befehl 1: Alle Fehler der letzten Stunde**
```bash
pm2 logs intranet-backend --lines 1000 --nostream | grep -i "error" | tail -100
```

**Befehl 2: Fehler nach Häufigkeit sortieren**
```bash
pm2 logs intranet-backend --lines 1000 --nostream | grep -i "error" | sort | uniq -c | sort -rn | head -20
```

**Befehl 3: Langsame Queries prüfen (falls Query-Logging aktiviert)**
```bash
pm2 logs intranet-backend --lines 1000 --nostream | grep -i "query" | tail -50
```

**Befehl 4: createTask-spezifische Fehler**
```bash
pm2 logs intranet-backend --lines 1000 --nostream | grep -i "createTask\|task.create" | tail -50
```

---

### 6. System-Ressourcen prüfen

**Befehl 1: System-Load**
```bash
uptime
```

**Befehl 2: Disk-Space**
```bash
df -h
```

**Befehl 3: Inode-Verbrauch**
```bash
df -i
```

**Befehl 4: System-Logs prüfen**
```bash
dmesg | tail -50
```

---

### 7. Node.js-spezifische Metriken

**Befehl 1: Node.js Version**
```bash
node --version
```

**Befehl 2: PM2 Version**
```bash
pm2 --version
```

**Befehl 3: PM2 Prozess-Info**
```bash
pm2 info intranet-backend
```

**Befehl 4: PM2 Logs in Echtzeit (Strg+C zum Beenden)**
```bash
pm2 logs intranet-backend
```

---

## 📊 ERSTE ERGEBNISSE (2025-01-26)

### Ausgeführte Befehle und Ergebnisse:

**1. Retry-Zähler:** `16` (in 500 Zeilen)
- ⚠️ Relativ niedrig, aber es gibt mehrere Prisma Retries

**2. DB-Verbindungsfehler:** `23` (in 500 Zeilen)
- 🔴 **RELATIV HOCH** - DB-Verbindung ist instabil!

**3. Memory-Verbrauch:** `57.7mb`
- ✅ **SEHR GUT** - Nicht das Problem (User berichtet 600MB-3GB, möglicherweise Frontend)

**4. Aktive DB-Verbindungen:** `16` (von 20)
- ⚠️ **80% AUSGELASTET** - Connection Pool ist fast voll!

**5. Retry-Meldungen:**
- Mehrere "[Prisma] Retrying after 1 attempt(s)" Meldungen
- executeWithRetry wird oft aufgerufen

### Hauptproblem identifiziert:

**Instabile DB-Verbindung** → **Viele DB-Fehler** → **Viele executeWithRetry Aufrufe** → **Connection Pool wird voll** → **Timeouts** → **System wird langsam**

---

## 📋 ANALYSE-CHECKLISTE

### Was zu prüfen ist:

1. ✅ **Wie oft wird retried?**
   - Befehl: `pm2 logs intranet-backend --lines 500 --nostream | grep -i "retry" | wc -l`
   - Erwartung: Sollte nicht zu hoch sein (< 100 in 500 Zeilen)

2. ✅ **Gibt es viele DB-Verbindungsfehler?**
   - Befehl: `pm2 logs intranet-backend --lines 500 --nostream | grep -i "DB connection error"`
   - Erwartung: Sollte selten sein

3. ✅ **Wie hoch ist der Memory-Verbrauch?**
   - Befehl: `pm2 status`
   - Erwartung: Sollte < 500MB sein

4. ✅ **Gibt es Timeouts?**
   - Befehl: `pm2 logs intranet-backend --lines 500 --nostream | grep -i "timeout"`
   - Erwartung: Sollte selten sein

5. ✅ **Wie viele parallele DB-Verbindungen?**
   - Befehl: `netstat -an | grep :5432 | wc -l`
   - Erwartung: Sollte < 20 sein (Connection Pool Limit)

---

## 🔍 WEITERE ANALYSE-BEFEHLE (NACH ERSTEN ERGEBNISSEN)

### Zusätzliche Befehle für detaillierte Analyse:

**Befehl 1: Nur Prisma Retries zählen (ohne BullMQ)**
```bash
pm2 logs intranet-backend --lines 1000 --nostream | grep -c "\[Prisma\] Retrying"
```

**Befehl 2: DB-Verbindungsfehler Details anzeigen**
```bash
pm2 logs intranet-backend --lines 500 --nostream | grep "DB connection error" | tail -20
```

**Befehl 3: Timeout-Fehler prüfen**
```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -i "timeout" | wc -l
```

**Befehl 4: Aktive HTTP-Verbindungen prüfen**
```bash
netstat -an | grep :5000 | wc -l
```

**Befehl 5: System Load prüfen**
```bash
uptime
```

**Befehl 6: CPU-Verbrauch prüfen**
```bash
top -b -n 1 | head -20
```

**Befehl 7: Alle Prisma Retries der letzten Stunde**
```bash
pm2 logs intranet-backend --lines 2000 --nostream | grep "\[Prisma\] Retrying" | tail -50
```

**Befehl 8: DB-Verbindungsfehler nach Häufigkeit**
```bash
pm2 logs intranet-backend --lines 1000 --nostream | grep "DB connection error" | cut -d: -f4- | sort | uniq -c | sort -rn | head -10
```

---

## 🔍 WICHTIGE BEFEHLE FÜR DETAILLIERTE ANALYSE

### Alle Befehle in einem Script ausführen

**Befehl: Analyseskript erstellen und ausführen**
```bash
cd /var/www/intranet
cat > analyse_performance.sh << 'EOF'
#!/bin/bash
echo "=== PM2 Status ==="
pm2 status
echo ""
echo "=== Memory-Verbrauch ==="
free -h
echo ""
echo "=== Retry-Zähler (letzte 500 Zeilen) ==="
pm2 logs intranet-backend --lines 500 --nostream | grep -i "retry" | wc -l
echo ""
echo "=== DB-Verbindungsfehler (letzte 500 Zeilen) ==="
pm2 logs intranet-backend --lines 500 --nostream | grep -i "DB connection error" | wc -l
echo ""
echo "=== Timeout-Fehler (letzte 500 Zeilen) ==="
pm2 logs intranet-backend --lines 500 --nostream | grep -i "timeout" | wc -l
echo ""
echo "=== Aktive DB-Verbindungen ==="
netstat -an | grep :5432 | wc -l
echo ""
echo "=== Aktive HTTP-Verbindungen ==="
netstat -an | grep :5000 | wc -l
echo ""
echo "=== System Load ==="
uptime
EOF
chmod +x analyse_performance.sh
./analyse_performance.sh
```

---

## 📊 ERGEBNISSE INTERPRETIEREN

### Was die Ergebnisse bedeuten:

**1. Retry-Zähler:**
- **< 10:** Normal
- **10-50:** Erhöht, aber akzeptabel
- **> 50:** Problem - zu viele Retries

**2. DB-Verbindungsfehler:**
- **0:** Perfekt
- **1-5:** Normal bei instabiler Verbindung
- **> 5:** Problem - DB-Verbindung ist instabil

**3. Memory-Verbrauch:**
- **< 500MB:** Normal
- **500MB-1GB:** Erhöht, aber akzeptabel
- **> 1GB:** Problem - mögliche Memory Leaks

**4. Timeout-Fehler:**
- **0:** Perfekt
- **1-5:** Normal bei hoher Last
- **> 5:** Problem - System ist überlastet

**5. Aktive DB-Verbindungen:**
- **< 10:** Normal
- **10-20:** Erhöht, aber akzeptabel (Connection Pool Limit)
- **> 20:** Problem - Connection Pool ist überlastet

---

## 🆘 BEI PROBLEMEN

**Falls SSH-Verbindung fehlschlägt:**
```bash
# Prüfe ob SSH-Key vorhanden ist
ls -la ~/.ssh/

# Prüfe SSH-Key-Berechtigungen
chmod 600 ~/.ssh/intranet_rsa
```

**Falls PM2 nicht verfügbar ist:**
```bash
# PM2 installieren
npm install -g pm2
```

**Falls Logs nicht verfügbar sind:**
```bash
# PM2 Logs-Verzeichnis prüfen
pm2 describe intranet-backend | grep "log path"
```

---

**Erstellt:** 2025-01-26  
**Status:** ✅ Bereit zur Ausführung  
**Nächster Schritt:** SSH-Verbindung herstellen und Befehle ausführen

