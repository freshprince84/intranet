# Performance-Analyse: Vollständige Analyse und Lösungsvorschläge

**Datum:** 2025-01-21  
**Status:** ✅ Vollständig analysiert  
**Priorität:** 🔴 KRITISCH

> **⚠️ WICHTIG:** Für die neuesten Memory Leak und Performance Fixes (2025-12-11) siehe:  
> **[MEMORY_LEAKS_UND_PERFORMANCE_FIXES_2025-12-11.md](./MEMORY_LEAKS_UND_PERFORMANCE_FIXES_2025-12-11.md)**  
> Dieses Dokument enthält alle kritischen Fixes und **Checklisten für zukünftige Implementierungen**!

---

## 📊 EXECUTIVE SUMMARY

### Hauptprobleme identifiziert:

1. **🔴 KRITISCH: `/api/requests` Endpoint - 30+ Sekunden Ladezeit**
   - Komplexe Filter-Logik mit verschachtelten AND/OR-Bedingungen
   - Keine Pagination (lädt alle Requests auf einmal)
   - Zusätzliche DB-Query für Filter-Laden (N+1 Problem bei Filter)

2. **🟡 HOCH: Häufiges Polling**
   - `/api/worktime/active`: Alle 30 Sekunden (WorktimeContext)
   - `/api/worktime/active`: Alle 10 Sekunden (Mobile App)
   - `/api/notifications/unread/count`: Alle 60 Sekunden
   - `/api/team/worktime/active-users`: Alle 30 Sekunden

3. **🟡 MITTEL: Komplexe Datenbankabfragen**
   - Viele Joins (requester, responsible, branch, attachments)
   - Verschachtelte OR/AND-Bedingungen
   - Keine Indizes auf häufig gefilterten Feldern

4. **🟡 MITTEL: Keine Caching-Strategie**
   - Jeder Request geht zur Datenbank
   - Keine In-Memory-Caches für häufig abgerufene Daten

---

## 🔍 DETAILLIERTE ANALYSE

### 1. `/api/requests` Endpoint - Performance-Probleme

#### Aktuelle Implementierung

**Datei:** `backend/src/controllers/requestController.ts`

**Probleme:**

1. **Zusätzliche DB-Query für Filter (Zeile 81-83)**
   ```typescript
   const savedFilter = await prisma.savedFilter.findUnique({
       where: { id: parseInt(filterId, 10) }
   });
   ```
   - **Impact:** +1 DB-Query pro Request
   - **Lösung:** Filter cachen oder in einem Query mitladen

2. **Keine Pagination (Zeile 138-160)**
   ```typescript
   const requests = await prisma.request.findMany({
       where: whereClause,
       ...(limit ? { take: limit } : {}),  // Optional, nicht standardmäßig
       include: { ... }
   });
   ```
   - **Impact:** Lädt ALLE Requests auf einmal
   - **Problem:** Bei 1000+ Requests = sehr große Response (mehrere MB)
   - **Lösung:** Standard-Pagination implementieren (z.B. 50 pro Seite)

3. **Komplexe Filter-Logik (Zeile 107-136)**
   ```typescript
   const baseWhereConditions: any[] = [
       isolationFilter,
       {
           OR: [
               { isPrivate: false, ...organizationId },
               { isPrivate: true, OR: [{ requesterId }, { responsibleId }] }
           ]
       }
   ];
   ```
   - **Impact:** Verschachtelte OR/AND-Bedingungen = langsame Queries
   - **Problem:** PostgreSQL muss komplexe Query-Pläne erstellen
   - **Lösung:** Indizes auf `isPrivate`, `organizationId`, `requesterId`, `responsibleId`

4. **Viele Joins (Zeile 141-155)**
   ```typescript
   include: {
       requester: { select: userSelect },
       responsible: { select: userSelect },
       branch: { select: branchSelect },
       attachments: { orderBy: { uploadedAt: 'desc' } }
   }
   ```
   - **Impact:** 4 Joins pro Request
   - **Problem:** Bei 100 Requests = 400 Join-Operationen
   - **Lösung:** ✅ Attachments werden bereits mitgeladen (gut!)

#### Geschätzte Performance-Verbesserung

- **Aktuell:** ~30 Sekunden (264 Sekunden laut Dokumentation)
- **Mit Optimierungen:** ~1-2 Sekunden
- **Verbesserung:** 90-95% schneller

---

### 2. Polling-Verhalten - Vollständige Analyse

#### Identifizierte Polling-Stellen

| Komponente | Endpoint | Intervall | Datei |
|------------|----------|-----------|-------|
| WorktimeContext | `/api/worktime/active` | 30s | `frontend/src/contexts/WorktimeContext.tsx:52` |
| TeamWorktimeControl | `/api/team/worktime/active-users` | 30s | `frontend/src/pages/TeamWorktimeControl.tsx:128` |
| NotificationBell | `/api/notifications/unread/count` | 60s | `frontend/src/components/NotificationBell.tsx:172` |
| Mobile App | `/api/worktime/active` | 10s | `IntranetMobileApp/src/screens/WorktimeScreen.tsx:88` |
| WorktimeTracker | UI-Update (kein API-Call) | 1s | `frontend/src/components/WorktimeTracker.tsx:169` |

#### Impact-Analyse

**Bei 10 gleichzeitigen Benutzern:**
- `/api/worktime/active`: 10 Benutzer × 2 Requests/Min = **20 Requests/Min**
- `/api/team/worktime/active-users`: 1 Admin × 2 Requests/Min = **2 Requests/Min**
- `/api/notifications/unread/count`: 10 Benutzer × 1 Request/Min = **10 Requests/Min**
- **Gesamt:** ~32 Requests/Min = **~0.5 Requests/Sekunde**

**Problem:** Jeder Request macht eine DB-Query ohne Cache!

#### Lösungsvorschläge

1. **Caching für `/api/worktime/active`**
   - Cache mit TTL: 5-10 Sekunden
   - Nur bei Status-Änderung invalidieren
   - **Erwartete Verbesserung:** 80-90% weniger DB-Queries

2. **Polling-Intervalle erhöhen**
   - WorktimeContext: 30s → 60s (weniger kritisch)
   - Mobile App: 10s → 30s (ausreichend für UI)
   - **Erwartete Verbesserung:** 50% weniger Requests

3. **WebSocket für Echtzeit-Updates**
   - Statt Polling: Server pusht Updates bei Änderungen
   - **Erwartete Verbesserung:** 95% weniger Requests

---

### 3. Datenbankabfragen - Detaillierte Analyse

#### `/api/requests` Query-Komplexität

**Aktuelle Query-Struktur:**
```sql
SELECT 
  r.*,
  u1.*,  -- requester
  u2.*,  -- responsible
  b.*,   -- branch
  a.*    -- attachments
FROM Request r
LEFT JOIN User u1 ON r.requesterId = u1.id
LEFT JOIN User u2 ON r.responsibleId = u2.id
LEFT JOIN Branch b ON r.branchId = b.id
LEFT JOIN Attachment a ON a.requestId = r.id
WHERE (
  (r.isPrivate = false AND r.organizationId = ?)
  OR
  (r.isPrivate = true AND (r.requesterId = ? OR r.responsibleId = ?))
)
AND [isolationFilter]
AND [filterConditions]
ORDER BY r.createdAt DESC
```

**Probleme:**

1. **Keine Indizes auf Filter-Feldern**
   - `isPrivate`, `organizationId`, `requesterId`, `responsibleId`
   - **Impact:** Full Table Scan bei großen Datenmengen
   - **Lösung:** Composite Index erstellen

2. **Verschachtelte OR-Bedingungen**
   - PostgreSQL muss beide Bedingungen prüfen
   - **Impact:** Langsamere Query-Execution
   - **Lösung:** Query optimieren oder Materialized Views

3. **Attachments werden für ALLE Requests geladen**
   - Auch wenn nicht benötigt
   - **Impact:** Große Response-Größe
   - **Lösung:** Optional `?includeAttachments=false` Parameter

#### Empfohlene Indizes

```sql
-- Composite Index für häufig gefilterte Felder
CREATE INDEX idx_request_org_private ON Request(organizationId, isPrivate, createdAt DESC);

-- Index für requester/responsible Filter
CREATE INDEX idx_request_requester ON Request(requesterId, isPrivate);
CREATE INDEX idx_request_responsible ON Request(responsibleId, isPrivate);

-- Index für Attachments (bereits vorhanden?)
CREATE INDEX idx_attachment_request ON Attachment(requestId, uploadedAt DESC);
```

**Erwartete Verbesserung:** 50-70% schnellere Queries

---

### 4. Caching-Strategie

#### Aktueller Status: ❌ Kein Caching

**Probleme:**
- Jeder Request geht zur Datenbank
- Häufig abgerufene Daten werden nicht gecacht
- Filter werden bei jedem Request neu geladen

#### Empfohlene Caching-Strategie

1. **In-Memory-Cache für häufig abgerufene Daten**
   - `/api/worktime/active`: TTL 5-10 Sekunden
   - `/api/notifications/unread/count`: TTL 30 Sekunden
   - Saved Filters: TTL 5 Minuten
   - Organization Settings: TTL 10 Minuten

2. **Cache-Invalidierung**
   - Bei Status-Änderungen (Worktime start/stop)
   - Bei neuen Notifications
   - Bei Filter-Änderungen

3. **Redis für verteilte Caches** (optional)
   - Falls mehrere Backend-Instanzen
   - Aktuell: Single-Instance → In-Memory reicht

**Erwartete Verbesserung:** 80-90% weniger DB-Queries

---

## 🎯 KONKRETE LÖSUNGSVORSCHLÄGE

### Priorität 1: Sofort umsetzbar (hoher Impact, niedriges Risiko)

#### 1.1 Pagination für `/api/requests`

**Datei:** `backend/src/controllers/requestController.ts`

**Änderung:**
```typescript
// Zeile 73-75: Standard-Limit hinzufügen
const limit = req.query.limit 
    ? parseInt(req.query.limit as string, 10) 
    : 50;  // Standard: 50 Requests pro Seite

const offset = req.query.offset 
    ? parseInt(req.query.offset as string, 10) 
    : 0;

// Zeile 138: Pagination hinzufügen
const requests = await prisma.request.findMany({
    where: whereClause,
    take: limit,
    skip: offset,
    include: { ... }
});

// Zeile 187: Total-Count für Frontend
const total = await prisma.request.count({ where: whereClause });
res.json({
    data: formattedRequests,
    pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
    }
});
```

**Impact:** 90% kleinere Response-Größe, 80% schnellere Ladezeit

---

#### 1.2 Filter-Caching

**Datei:** `backend/src/controllers/requestController.ts`

**Änderung:**
```typescript
// Zeile 78-92: Filter cachen
import NodeCache from 'node-cache';
const filterCache = new NodeCache({ stdTTL: 300 }); // 5 Minuten

let filterWhereClause: any = {};
if (filterId) {
    // Prüfe Cache
    const cacheKey = `filter_${filterId}`;
    let savedFilter = filterCache.get(cacheKey);
    
    if (!savedFilter) {
        savedFilter = await prisma.savedFilter.findUnique({
            where: { id: parseInt(filterId, 10) }
        });
        if (savedFilter) {
            filterCache.set(cacheKey, savedFilter);
        }
    }
    
    if (savedFilter) {
        const conditions = JSON.parse(savedFilter.conditions);
        const operators = JSON.parse(savedFilter.operators);
        filterWhereClause = convertFilterConditionsToPrismaWhere(
            conditions,
            operators,
            'request'
        );
    }
}
```

**Impact:** 1 DB-Query weniger pro Request

---

#### 1.3 Polling-Intervalle erhöhen

**Dateien:**
- `frontend/src/contexts/WorktimeContext.tsx:52`
- `IntranetMobileApp/src/screens/WorktimeScreen.tsx:88`

**Änderung:**
```typescript
// WorktimeContext: 30s → 60s
const intervalId = setInterval(() => {
    checkTrackingStatus();
}, 60000);  // 60 Sekunden statt 30

// Mobile App: 10s → 30s
const statusInterval = setInterval(async () => {
    await checkRunningTimer();
}, 30000);  // 30 Sekunden statt 10
```

**Impact:** 50% weniger Requests

---

### Priorität 2: Mittelfristig (hoher Impact, mittleres Risiko)

#### 2.1 Caching für `/api/worktime/active`

**Datei:** `backend/src/controllers/worktimeController.ts`

**Änderung:**
```typescript
import NodeCache from 'node-cache';
const worktimeCache = new NodeCache({ stdTTL: 10 }); // 10 Sekunden

export const getActiveWorktime = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.userId as string, 10);
        const cacheKey = `active_worktime_${userId}`;
        
        // Prüfe Cache
        const cached = worktimeCache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }
        
        // DB-Query
        const activeWorktime = await prisma.workTime.findFirst({
            where: {
                userId,
                endTime: null
            },
            include: { branch: true }
        });
        
        const result = activeWorktime ? { active: true, ...activeWorktime } : { active: false };
        
        // Cache setzen
        worktimeCache.set(cacheKey, result);
        
        res.json(result);
    } catch (error) {
        console.error('Error fetching active worktime:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der aktiven Zeiterfassung' });
    }
};
```

**Cache-Invalidierung bei Start/Stop:**
```typescript
// In startWorktime und stopWorktime
worktimeCache.del(`active_worktime_${userId}`);
```

**Impact:** 90% weniger DB-Queries für `/api/worktime/active`

---

#### 2.2 Datenbank-Indizes erstellen

**Migration erstellen:**
```sql
-- Prisma Migration
-- backend/prisma/migrations/YYYYMMDDHHMMSS_add_request_indexes/migration.sql

CREATE INDEX IF NOT EXISTS "idx_request_org_private" 
ON "Request"("organizationId", "isPrivate", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_request_requester" 
ON "Request"("requesterId", "isPrivate");

CREATE INDEX IF NOT EXISTS "idx_request_responsible" 
ON "Request"("responsibleId", "isPrivate");
```

**Impact:** 50-70% schnellere Queries

---

### Priorität 3: Langfristig (sehr hoher Impact, höheres Risiko)

#### 3.1 WebSocket für Echtzeit-Updates

**Statt Polling:** Server pusht Updates bei Änderungen

**Vorteile:**
- 95% weniger Requests
- Echtzeit-Updates
- Bessere User Experience

**Nachteile:**
- Komplexere Implementierung
- WebSocket-Verbindungen verwalten
- Höherer Entwicklungsaufwand

---

#### 3.2 Query-Optimierung: Materialized Views

**Für komplexe Filter-Queries:**
- Materialized View für häufig gefilterte Requests
- Regelmäßig aktualisieren (z.B. alle 5 Minuten)
- **Impact:** 80-90% schnellere Queries für Filter-Requests

---

## 📈 ERWARTETE PERFORMANCE-VERBESSERUNGEN

### Aktuelle Performance (gemessen)

| Endpoint | Aktuelle Zeit | Requests/Min |
|----------|---------------|--------------|
| `/api/requests` | 30-264s | - |
| `/api/worktime/active` | 1.1s | 20 |
| `/api/notifications/unread/count` | <1s | 10 |
| `/api/team/worktime/active-users` | <1s | 2 |

### Nach Optimierungen (geschätzt)

| Endpoint | Optimierte Zeit | Verbesserung |
|----------|-----------------|--------------|
| `/api/requests` | 1-2s | **90-95%** |
| `/api/worktime/active` | 0.1s (Cache) | **90%** |
| `/api/notifications/unread/count` | 0.1s (Cache) | **90%** |
| `/api/team/worktime/active-users` | 0.1s (Cache) | **90%** |

### Gesamt-Impact

- **DB-Queries:** 80-90% Reduktion
- **Response-Zeiten:** 85-95% Verbesserung
- **Server-Last:** 70-80% Reduktion
- **User Experience:** Deutlich schnelleres Laden

---

## 🚀 IMPLEMENTIERUNGSPLAN

### Phase 1: Quick Wins (1-2 Tage)

1. ✅ Pagination für `/api/requests`
2. ✅ Filter-Caching
3. ✅ Polling-Intervalle erhöhen

**Erwartete Verbesserung:** 50-60% schneller

---

### Phase 2: Caching (2-3 Tage)

1. ✅ Caching für `/api/worktime/active`
2. ✅ Caching für `/api/notifications/unread/count`
3. ✅ Cache-Invalidierung implementieren

**Erwartete Verbesserung:** +20-30% (gesamt 70-80%)

---

### Phase 3: Datenbank-Optimierung (1-2 Tage)

1. ✅ Indizes erstellen
2. ✅ Query-Analyse mit EXPLAIN
3. ✅ Weitere Optimierungen basierend auf Analyse

**Erwartete Verbesserung:** +10-15% (gesamt 80-90%)

---

### Phase 4: Langfristige Optimierungen (1-2 Wochen)

1. ⏸️ WebSocket-Implementierung
2. ⏸️ Materialized Views
3. ⏸️ Weitere Advanced-Optimierungen

**Erwartete Verbesserung:** +5-10% (gesamt 90-95%)

---

## 📝 NÄCHSTE SCHRITTE

1. **Code-Änderungen implementieren** (Phase 1)
2. **Testing auf Staging-Server**
3. **Performance-Messungen vor/nach**
4. **Rollout auf Produktion**
5. **Monitoring und weitere Optimierungen**

---

**Erstellt:** 2025-01-21  
**Status:** ✅ Vollständig analysiert, bereit für Implementierung

