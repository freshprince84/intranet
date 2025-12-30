# Performance-Analyse: Zusammenfassung (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔴 KRITISCH - System extrem langsam  
**Problem:** Selbst mit 1 Benutzer dauert alles extrem lange

---

## 🔍 DURCHGEFÜHRTE ANALYSEN

### 1. Browser-Test ✅

**URL:** `https://65.109.228.106.nip.io/worktracker`

**Ergebnisse:**
- ✅ Seite lädt erfolgreich
- ✅ `/api/tasks?limit=20&offset=0` wird aufgerufen (Status 200)
- ✅ Alle anderen API-Calls haben Status 200
- ⚠️ **ABER:** Keine Timing-Informationen im Browser sichtbar

**Nächster Schritt:** Server-Logs prüfen für tatsächliche Query-Zeiten

---

## 🔴 IDENTIFIZIERTE PROBLEME

### Problem 1: OR-Bedingungen in WHERE-Klausel ⚠️ KRITISCH

**Aktuelle WHERE-Klausel (`getAllTasks`):**
```typescript
taskFilter.OR = [
    { responsibleId: userId },
    { qualityControlId: userId },
    { roleId: userRoleId }
];
```

**Problem:**
- PostgreSQL kann bei `OR`-Bedingungen **nicht alle Indizes optimal nutzen**
- Muss **alle 3 Bedingungen prüfen**, auch wenn Indizes vorhanden sind
- **Sehr langsam**, auch mit Indizes!

**Indizes vorhanden:**
- ✅ `@@index([responsibleId])`
- ✅ `@@index([qualityControlId])`
- ✅ `@@index([roleId])`
- ✅ `@@index([organizationId, status, createdAt(sort: Desc)])`

**Aber:** Bei `OR`-Bedingungen nutzt PostgreSQL diese Indizes **nicht optimal**!

### Problem 2: Komplexe WHERE-Klausel

**Aktuelle Struktur:**
```typescript
{
    organizationId: organizationId,
    OR: [
        { responsibleId: userId },
        { qualityControlId: userId },
        { roleId: userRoleId }
    ]
}
```

**Problem:**
- `AND` + `OR` kombiniert = **sehr komplexe Query**
- PostgreSQL muss **alle Kombinationen prüfen**
- **Sehr langsam**, auch mit Indizes!

### Problem 3: Mögliche N+1 Queries

**Aktuelle Query:**
```typescript
const tasks = await prisma.task.findMany({
    include: {
        responsible: { select: userSelect },
        role: { select: roleSelect },
        qualityControl: { select: userSelect },
        branch: { select: branchSelect }
    }
});
```

**Mögliches Problem:**
- Prisma könnte für jeden Task separate Queries machen
- Statt 1 Query mit Joins → 20+ Queries

**Zu prüfen:** Server-Logs auf viele einzelne Queries

---

## 📊 ZU PRÜFEN (Server-Logs)

### 1. Query-Zeiten prüfen

```bash
cd /var/www/intranet
pm2 logs intranet-backend --lines 500 --nostream | grep -E "Query abgeschlossen|getAllTasks|getAllRequests"
```

**Erwartet:**
- `[getAllTasks] ✅ Query abgeschlossen: X Tasks in Yms`
- **Wenn Y > 2000ms → Problem bestätigt!**

### 2. Fehler prüfen

```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -E "ERROR|Error|error|PrismaClientKnownRequestError|P1001|P1008|Connection Pool|Timed out"
```

### 3. DB-Verbindungen prüfen

```bash
psql -U intranetuser -d intranet -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'intranet';"
```

**Erwartet:**
- < 30 Verbindungen
- **Wenn = 30 → Connection Pool voll!**

### 4. Lange laufende Queries prüfen

```bash
psql -U intranetuser -d intranet -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds' AND datname = 'intranet';"
```

---

## 💡 MÖGLICHE LÖSUNGEN

### Lösung 1: OR-Bedingungen durch UNION ersetzen ⭐ PRIORITÄT 1

**Problem:** `OR`-Bedingungen sind langsam

**Lösung:** Separate Queries mit UNION

```typescript
// Statt OR:
const tasks1 = await prisma.task.findMany({
    where: { organizationId, responsibleId: userId },
    include: { ... }
});
const tasks2 = await prisma.task.findMany({
    where: { organizationId, qualityControlId: userId },
    include: { ... }
});
const tasks3 = await prisma.task.findMany({
    where: { organizationId, roleId: userRoleId },
    include: { ... }
});

// Merge und deduplizieren (nach ID)
const allTasks = [...tasks1, ...tasks2, ...tasks3];
const uniqueTasks = Array.from(new Map(allTasks.map(t => [t.id, t])).values());
```

**Vorteile:**
- ✅ Jede Query nutzt optimal ihren Index
- ✅ Viel schneller als OR-Bedingungen
- ✅ Einfach zu implementieren

**Nachteile:**
- ⚠️ 3 Queries statt 1 (aber schneller!)
- ⚠️ Deduplizierung nötig

### Lösung 2: Composite Index hinzufügen

**Problem:** Kein Index für die kombinierte WHERE-Klausel

**Lösung:** Composite Index

```prisma
@@index([organizationId, responsibleId])
@@index([organizationId, qualityControlId])
@@index([organizationId, roleId])
```

**Vorteile:**
- ✅ Optimiert für die tatsächliche Query-Struktur
- ✅ Kann bei OR-Bedingungen helfen

**Nachteile:**
- ⚠️ Mehr Indizes = mehr Speicher
- ⚠️ Langsamer bei INSERT/UPDATE

### Lösung 3: Query mit UNION in SQL

**Problem:** Prisma OR-Bedingungen sind langsam

**Lösung:** Raw SQL mit UNION

```typescript
const tasks = await prisma.$queryRaw`
    SELECT DISTINCT t.* FROM "Task" t
    WHERE t."organizationId" = ${organizationId}
    AND (
        t."responsibleId" = ${userId}
        OR t."qualityControlId" = ${userId}
        OR t."roleId" = ${userRoleId}
    )
    ORDER BY t."createdAt" DESC
    LIMIT ${limit}
    OFFSET ${offset}
`;
```

**Vorteile:**
- ✅ PostgreSQL kann Query optimieren
- ✅ Kann schneller sein als Prisma OR

**Nachteile:**
- ⚠️ Raw SQL = weniger Type-Safety
- ⚠️ Manuelles Mapping nötig

---

## ✅ EMPFOHLENE REIHENFOLGE

1. **Server-Logs prüfen** → Query-Zeiten identifizieren
2. **Lösung 1 implementieren** → OR durch separate Queries ersetzen
3. **Testen** → Performance verbessert?
4. **Falls nicht:** Lösung 2 oder 3 versuchen

---

## 📋 NÄCHSTE SCHRITTE

1. **Server-Logs prüfen** (siehe Befehle oben)
2. **Query-Zeiten dokumentieren**
3. **Root Cause bestätigen**
4. **Lösung implementieren**

---

**Erstellt:** 2025-01-26  
**Status:** 🔴 Analyse läuft  
**Nächster Schritt:** Server-Logs prüfen → Query-Zeiten identifizieren

