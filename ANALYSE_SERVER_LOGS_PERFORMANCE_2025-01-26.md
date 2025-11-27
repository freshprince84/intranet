# Server-Logs Performance-Analyse (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔴 KRITISCH - System extrem langsam  
**Problem:** Selbst mit 1 Benutzer dauert alles extrem lange

---

## 🔍 ZU PRÜFEN

### 1. Query-Zeiten in Server-Logs

**Befehle für SSH:**
```bash
cd /var/www/intranet

# PM2 Logs prüfen (letzte 100 Zeilen)
pm2 logs intranet-backend --lines 100 --nostream

# Nach Query-Zeiten suchen
pm2 logs intranet-backend --lines 500 --nostream | grep -E "Query abgeschlossen|getAllTasks|getAllRequests"

# Nach Fehlern suchen
pm2 logs intranet-backend --lines 500 --nostream | grep -E "ERROR|Error|error|PrismaClientKnownRequestError|P1001|P1008"

# Nach Connection Pool Timeouts suchen
pm2 logs intranet-backend --lines 500 --nostream | grep -E "Connection Pool|connection pool|Timed out fetching"
```

### 2. Datenbank-Verbindungen prüfen

```bash
# Aktive Verbindungen
psql -U intranetuser -d intranet -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'intranet';"

# Lange laufende Queries
psql -U intranetuser -d intranet -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds' AND datname = 'intranet';"

# Connection Pool Status
psql -U intranetuser -d intranet -c "SELECT count(*), state FROM pg_stat_activity WHERE datname = 'intranet' GROUP BY state;"
```

### 3. System-Ressourcen prüfen

```bash
# CPU und Memory
top -bn1 | head -20

# Disk I/O
iostat -x 1 5

# Network
netstat -an | grep :5432 | wc -l
```

---

## 📊 ERWARTETE PROBLEME

### Problem 1: Lange Query-Zeiten
- `getAllTasks` sollte < 500ms dauern
- `getAllRequests` sollte < 500ms dauern
- Wenn > 2 Sekunden → Problem!

### Problem 2: Connection Pool voll
- 30/30 Verbindungen belegt
- Timeouts beim Abrufen von Verbindungen
- Retries verschlimmern das Problem

### Problem 3: N+1 Queries
- Viele einzelne Queries statt Joins
- Jeder Task/Request macht separate Queries für User/Role/Branch

### Problem 4: Komplexe Joins
- Zu viele `include`s in einer Query
- Zu viele Daten werden geladen

---

## 🔴 KRITISCHE STELLEN

### 1. `getAllTasks` Query

**Aktuell:**
```typescript
const tasks = await prisma.task.findMany({
    where: whereClause,
    include: {
        responsible: { select: userSelect },
        role: { select: roleSelect },
        qualityControl: { select: userSelect },
        branch: { select: branchSelect }
    }
});
```

**Mögliche Probleme:**
- `whereClause` könnte komplex sein (viele OR-Bedingungen)
- Kein Index auf Filter-Feldern
- Zu viele Tasks werden geladen (kein Limit?)

### 2. `getAllRequests` Query

**Aktuell:**
```typescript
const requests = await prisma.request.findMany({
    where: whereClause,
    include: {
        requester: { select: userSelect },
        responsible: { select: userSelect },
        branch: { select: branchSelect }
    }
});
```

**Mögliche Probleme:**
- Gleiche wie bei Tasks
- Kein Index auf Filter-Feldern

### 3. Middleware-Kette

**Jeder Request:**
1. `authMiddleware` → UserCache (gut!)
2. `organizationMiddleware` → OrganizationCache (gut!)
3. Controller → DB-Query

**Mögliche Probleme:**
- Cache-Misses führen zu DB-Queries
- Zu viele gleichzeitige Requests

---

## ✅ NÄCHSTE SCHRITTE

1. **Server-Logs prüfen** → Query-Zeiten identifizieren
2. **DB-Verbindungen prüfen** → Connection Pool Status
3. **System-Ressourcen prüfen** → CPU, Memory, Disk I/O
4. **Root Cause identifizieren** → Was ist das Problem?
5. **Lösung implementieren** → Fix für das Problem

---

**Erstellt:** 2025-01-26  
**Status:** 🔴 Analyse läuft  
**Nächster Schritt:** Server-Logs prüfen

