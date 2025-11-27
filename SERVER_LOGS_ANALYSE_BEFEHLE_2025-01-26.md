# Server Logs Analyse - Befehle (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔴🔴🔴 KRITISCH - System immer noch extrem langsam  
**Ziel:** Server Logs analysieren um weitere Performance-Probleme zu finden

---

## 🔍 ANALYSE-BEFEHLE

### 1. Langsame Requests identifizieren

```bash
cd /var/www/intranet/backend
pm2 logs intranet-backend --lines 1000 --nostream | grep -E "GET|POST|PUT|DELETE" | tail -100
```

**Ziel:** Sehen, welche Endpoints aufgerufen werden und wie häufig

---

### 2. Response-Zeiten prüfen

```bash
pm2 logs intranet-backend --lines 1000 --nostream | grep -E "duration|ms|seconds|Query abgeschlossen" | tail -100
```

**Ziel:** Sehen, welche Requests langsam sind (>1 Sekunde)

---

### 3. Cache-Status prüfen

```bash
pm2 logs intranet-backend --lines 1000 --nostream | grep -i "cache.*miss\|cache.*hit\|Cache-Miss\|Cache-Hit" | tail -100
```

**Ziel:** Sehen, ob Caches funktionieren oder zu viele Cache-Misses

---

### 4. DB-Queries prüfen

```bash
pm2 logs intranet-backend --lines 1000 --nostream | grep -i "prisma\|query\|database\|executeWithRetry" | tail -100
```

**Ziel:** Sehen, welche DB-Queries langsam sind

---

### 5. executeWithRetry Retries prüfen

```bash
pm2 logs intranet-backend --lines 1000 --nostream | grep -i "retry\|attempt\|Retrying" | tail -100
```

**Ziel:** Sehen, ob zu viele Retries gemacht werden

---

### 6. Connection Pool Status prüfen

```bash
pm2 logs intranet-backend --lines 1000 --nostream | grep -i "connection pool\|timeout\|Connection Pool" | tail -100
```

**Ziel:** Sehen, ob Connection Pool Timeouts noch auftreten

---

### 7. Fehler prüfen

```bash
pm2 logs intranet-backend --lines 1000 --nostream | grep -i "error\|warn\|failed\|Fehler" | tail -100
```

**Ziel:** Sehen, ob es Fehler gibt, die Performance beeinträchtigen

---

### 8. Häufigste Endpoints

```bash
pm2 logs intranet-backend --lines 2000 --nostream | grep -E "GET|POST" | awk '{print $NF}' | sort | uniq -c | sort -rn | head -20
```

**Ziel:** Sehen, welche Endpoints am häufigsten aufgerufen werden

---

### 9. Aktive DB-Verbindungen prüfen

```bash
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE state != 'idle';"
netstat -an | grep :5432 | grep ESTABLISHED | wc -l
```

**Ziel:** Sehen, wie viele DB-Verbindungen aktiv sind

---

### 10. Langsame Queries in PostgreSQL

```bash
sudo -u postgres psql -c "SELECT pid, now() - query_start as duration, state, LEFT(query, 100) as query FROM pg_stat_activity WHERE state != 'idle' AND now() - query_start > interval '1 second' ORDER BY duration DESC LIMIT 10;"
```

**Ziel:** Sehen, welche Queries in PostgreSQL langsam sind (>1 Sekunde)

---

## 📋 WAS ZU PRÜFEN IST

1. **Cache-Misses:**
   - Zu viele Cache-Misses → Cache-TTLs zu kurz
   - Lösung: Cache-TTLs erhöhen (bereits gemacht)

2. **Häufige Endpoints:**
   - Welche Endpoints werden am häufigsten aufgerufen?
   - Haben diese Endpoints Caching?

3. **Langsame Queries:**
   - Welche Queries sind langsam (>1 Sekunde)?
   - Können diese optimiert werden?

4. **Retries:**
   - Werden zu viele Retries gemacht?
   - Können Retries reduziert werden?

5. **Connection Pool:**
   - Treten noch Connection Pool Timeouts auf?
   - Ist Connection Pool ausreichend groß?

---

**Erstellt:** 2025-01-26  
**Status:** 🔴🔴🔴 KRITISCH - System immer noch extrem langsam  
**Nächster Schritt:** Server Logs analysieren + Cache-TTLs erhöhen (bereits gemacht)

