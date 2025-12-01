# Performance-Problem: Fundamentale Analyse (2025-01-26)

**Datum:** 2025-01-26  
**Status:** ✅ GELÖST (2025-01-29) - Hauptproblem identifiziert und behoben  
**Problem:** Selbst mit 1 Benutzer dauert alles extrem lange

## ⚠️ WICHTIG: HAUPTPROBLEM GELÖST (2025-01-29)

**✅ Das Hauptproblem wurde identifiziert und behoben:**
- **Problem:** Organization Settings waren 63 MB groß (sollten < 10 KB sein)
- **Ursache:** Mehrfache Verschlüsselung von `lobbyPms.apiKey` (jedes Speichern = erneute Verschlüsselung)
- **Lösung:** Verschlüsselungs-Check implementiert - prüft ob bereits verschlüsselt
- **Ergebnis:** System läuft wieder deutlich schneller (5.5 Sekunden → 50ms)

**Siehe:** `docs/technical/PERFORMANCE_PROBLEM_GELOEST_2025-01-29.md` für vollständige Dokumentation.

---

---

## 🔍 BEOBACHTUNGEN

### Browser-Test (2025-01-26)

**URL:** `https://65.109.228.106.nip.io/worktracker`

**Network-Requests:**
- ✅ `/api/tasks?limit=20&offset=0` - Status 200 (aufgerufen)
- ✅ `/api/worktime/active` - Status 200
- ✅ `/api/organizations/current` - Status 200
- ✅ `/api/users/profile` - Status 200
- ✅ `/api/branches/user` - Status 200
- ✅ `/api/notifications/unread/count` - Status 200
- ✅ `/api/table-settings/*` - Status 200
- ✅ `/api/saved-filters/*` - Status 200

**Beobachtung:**
- Alle Requests haben Status 200 (keine Fehler)
- Aber: Keine Timing-Informationen im Browser
- **Nächster Schritt:** Server-Logs prüfen für Query-Zeiten

---

## 🔴 MÖGLICHE ROOT CAUSES

### 1. Lange Query-Zeiten in `getAllTasks`

**Aktuelle Query:**
```typescript
const tasks = await prisma.task.findMany({
    where: whereClause,
    limit: 20,
    offset: 0,
    orderBy: { createdAt: 'desc' },
    include: {
        responsible: { select: userSelect },
        role: { select: roleSelect },
        qualityControl: { select: userSelect },
        branch: { select: branchSelect }
    }
});
```

**Mögliche Probleme:**
- `whereClause` könnte sehr komplex sein (viele OR-Bedingungen)
- Kein Index auf Filter-Feldern
- `orderBy createdAt` ohne Index könnte langsam sein
- Zu viele Joins in einer Query

### 2. N+1 Query Problem

**Mögliches Problem:**
- Prisma könnte für jeden Task separate Queries für User/Role/Branch machen
- Statt 1 Query mit Joins → 20+ Queries

**Zu prüfen:**
- Server-Logs auf viele einzelne Queries prüfen
- Prisma Query-Logs aktivieren

### 3. Connection Pool voll

**Mögliches Problem:**
- Connection Pool (30) ist voll
- Neue Requests warten auf freie Verbindungen
- Timeouts verschlimmern das Problem

**Zu prüfen:**
- Aktive DB-Verbindungen prüfen
- Connection Pool Status prüfen

### 4. Komplexe WHERE-Klausel

**Aktuelle WHERE-Klausel (getAllTasks):**
```typescript
const baseWhereConditions: any[] = [];

if (organizationId) {
    const taskFilter: any = {
        organizationId: organizationId
    };
    
    if (userRoleId) {
        taskFilter.OR = [
            { responsibleId: userId },
            { qualityControlId: userId },
            { roleId: userRoleId }
        ];
    } else {
        taskFilter.OR = [
            { responsibleId: userId },
            { qualityControlId: userId }
        ];
    }
    
    baseWhereConditions.push(taskFilter);
}

// + Filter-Bedingungen (falls vorhanden)
if (Object.keys(filterWhereClause).length > 0) {
    baseWhereConditions.push(filterWhereClause);
}

const whereClause = baseWhereConditions.length === 1
    ? baseWhereConditions[0]
    : { AND: baseWhereConditions };
```

**Mögliche Probleme:**
- `OR`-Bedingungen sind schwer zu optimieren
- Kein Index auf `responsibleId`, `qualityControlId`, `roleId`
- `AND` + `OR` kombiniert = komplexe Query

### 5. Zu viele gleichzeitige Requests

**Beobachtung:**
- Frontend macht viele parallel Requests beim Seitenaufruf:
  - `/api/tasks`
  - `/api/worktime/active`
  - `/api/organizations/current`
  - `/api/users/profile`
  - `/api/branches/user`
  - `/api/notifications/unread/count`
  - `/api/table-settings/*` (mehrere)
  - `/api/saved-filters/*` (mehrere)

**Mögliches Problem:**
- Jeder Request braucht DB-Verbindung
- Bei 8-12 parallel Requests = 8-12 DB-Verbindungen
- Connection Pool (30) könnte voll sein

---

## 📊 ZU PRÜFEN

### 1. Server-Logs - Query-Zeiten

```bash
cd /var/www/intranet
pm2 logs intranet-backend --lines 500 --nostream | grep -E "Query abgeschlossen|getAllTasks|getAllRequests"
```

**Erwartet:**
- `[getAllTasks] ✅ Query abgeschlossen: X Tasks in Yms`
- Wenn Y > 2000ms → Problem!

### 2. Server-Logs - Fehler

```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -E "ERROR|Error|error|PrismaClientKnownRequestError|P1001|P1008|Connection Pool|Timed out"
```

### 3. Datenbank - Aktive Verbindungen

```bash
psql -U intranetuser -d intranet -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'intranet';"
```

**Erwartet:**
- < 30 Verbindungen
- Wenn = 30 → Connection Pool voll!

### 4. Datenbank - Lange laufende Queries

```bash
psql -U intranetuser -d intranet -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds' AND datname = 'intranet';"
```

**Erwartet:**
- Keine Queries > 5 Sekunden
- Wenn vorhanden → Problem!

### 5. Datenbank - Indizes prüfen

```bash
psql -U intranetuser -d intranet -c "\d task"
psql -U intranetuser -d intranet -c "\d request"
```

**Zu prüfen:**
- Index auf `createdAt`?
- Index auf `responsibleId`?
- Index auf `qualityControlId`?
- Index auf `roleId`?
- Index auf `organizationId`?

---

## 💡 MÖGLICHE LÖSUNGEN

### Lösung 1: Indizes hinzufügen

**Wenn fehlend:**
- Index auf `task.createdAt`
- Index auf `task.responsibleId`
- Index auf `task.qualityControlId`
- Index auf `task.roleId`
- Index auf `task.organizationId`
- Composite Index auf `(organizationId, createdAt)`

### Lösung 2: Query optimieren

**Problem:** `OR`-Bedingungen sind langsam

**Lösung:** Separate Queries oder UNION

```typescript
// Statt OR:
const tasks1 = await prisma.task.findMany({
    where: { organizationId, responsibleId: userId }
});
const tasks2 = await prisma.task.findMany({
    where: { organizationId, qualityControlId: userId }
});
const tasks3 = await prisma.task.findMany({
    where: { organizationId, roleId: userRoleId }
});
// Merge und deduplizieren
```

### Lösung 3: Connection Pool erhöhen

**Aktuell:** 30

**Vorschlag:** 50-100 (je nach Server-Ressourcen)

### Lösung 4: Parallel Requests reduzieren

**Problem:** Zu viele parallel Requests

**Lösung:** Requests sequenziell machen oder batching

### Lösung 5: Caching erweitern

**Aktuell:**
- UserCache: 5 Minuten
- OrganizationCache: 10 Minuten
- WorktimeCache: 30 Sekunden

**Vorschlag:**
- Tasks/Requests Cache (kurz, 30 Sekunden)
- Filter Cache (bereits vorhanden)

---

## ✅ NÄCHSTE SCHRITTE

1. **Server-Logs prüfen** → Query-Zeiten identifizieren
2. **DB-Verbindungen prüfen** → Connection Pool Status
3. **Indizes prüfen** → Fehlende Indizes identifizieren
4. **Root Cause identifizieren** → Was ist das Problem?
5. **Lösung implementieren** → Fix für das Problem

---

**Erstellt:** 2025-01-26  
**Status:** 🔴 Analyse läuft  
**Nächster Schritt:** Server-Logs prüfen

