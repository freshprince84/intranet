# Analyse Server Logs - Anleitung (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔴🔴🔴 KRITISCH - System immer noch extrem langsam  
**Problem:** Connection Pool erhöhen hat nicht geholfen

---

## 🔍 ANALYSE-BEFEHLE FÜR SERVER

### 1. Langsame Requests identifizieren

```bash
cd /var/www/intranet/backend
pm2 logs intranet-backend --lines 500 --nostream | grep -E "GET|POST|PUT|DELETE" | tail -50
```

**Ziel:** Sehen, welche Endpoints aufgerufen werden

---

### 2. Response-Zeiten prüfen

```bash
pm2 logs intranet-backend --lines 1000 --nostream | grep -E "duration|ms|seconds" | tail -50
```

**Ziel:** Sehen, welche Requests langsam sind

---

### 3. DB-Queries prüfen

```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -i "prisma\|query\|database" | tail -50
```

**Ziel:** Sehen, welche DB-Queries langsam sind

---

### 4. Cache-Misses prüfen

```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -i "cache.*miss\|cache.*hit" | tail -50
```

**Ziel:** Sehen, ob Caches funktionieren

---

### 5. executeWithRetry Retries prüfen

```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -i "retry\|attempt" | tail -50
```

**Ziel:** Sehen, ob zu viele Retries gemacht werden

---

### 6. Connection Pool Status prüfen

```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -i "connection pool\|timeout" | tail -50
```

**Ziel:** Sehen, ob Connection Pool Timeouts noch auftreten

---

### 7. Fehler prüfen

```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -i "error\|warn\|failed" | tail -50
```

**Ziel:** Sehen, ob es Fehler gibt, die Performance beeinträchtigen

---

### 8. Aktive DB-Verbindungen prüfen

```bash
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE state != 'idle';"
netstat -an | grep :5432 | grep ESTABLISHED | wc -l
```

**Ziel:** Sehen, wie viele DB-Verbindungen aktiv sind

---

## 📋 WAS ZU PRÜFEN IST

1. **Cache-TTLs sind zu kurz:**
   - UserCache: 30 Sekunden → Bei jedem Request Cache-Miss nach 30s
   - OrganizationCache: 2 Minuten → Besser, aber könnte länger sein

2. **Zu viele parallele Requests:**
   - Frontend macht 8-12 parallele Requests beim Laden
   - Jeder Request braucht DB-Verbindung

3. **Langsame Queries:**
   - Komplexe Queries mit vielen JOINs
   - Fehlende Indizes

4. **executeWithRetry macht zu viele Retries:**
   - Jeder Retry = Neuer Request
   - Mehr Requests = Pool wird voller

---

**Erstellt:** 2025-01-26  
**Status:** 🔴🔴🔴 KRITISCH - System immer noch extrem langsam  
**Nächster Schritt:** Server Logs analysieren

