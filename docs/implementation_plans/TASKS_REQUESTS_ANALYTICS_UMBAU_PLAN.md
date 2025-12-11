# Tasks & Requests Analytics Umbau - Detaillierter Implementierungsplan

## Ziel

Zwei spezifische Analysen ermöglichen:

1. **User-zentriert**: Wer hat in einem Zeitraum (heute, diese Woche, diesen Monat, von Datum bis Datum) wann genau welche To-Dos erstellt, wann Status geshiftet & wann genau welche To-Dos gelöscht
2. **To-Do-zentriert**: Welche To-Dos wurden in einem Zeitraum von wem, wann genau erstellt, wann genau Status geshiftet & wann genau gelöscht

Gleiches für Requests.

## Aktuelle Situation - Analyse

### Tasks

**Vorhanden:**
- ✅ `createdAt` - wann erstellt
- ✅ `TaskStatusHistory` - Status-Änderungen mit `changedAt`, `userId`, `oldStatus`, `newStatus`
- ✅ Status-Historie wird bei Statusänderungen gespeichert (siehe `updateTask` Controller)

**Fehlt:**
- ❌ `createdById` - Es gibt kein Feld, das speichert, wer den Task erstellt hat
- ❌ `deletedAt` - Tasks werden hard-deleted (siehe `deleteTask` Controller)
- ❌ Keine Historie für Löschungen

### Requests

**Vorhanden:**
- ✅ `createdAt` - wann erstellt
- ✅ `requesterId` - wer erstellt hat
- ✅ Status-Änderungen werden im `updateRequest` Controller verarbeitet

**Fehlt:**
- ❌ `RequestStatusHistory` - Es gibt keine Tabelle für Status-Historie
- ❌ `deletedAt` - Requests werden hard-deleted (siehe `deleteRequest` Controller)
- ❌ Keine Historie für Löschungen

## Datenbank-Erweiterungen

### Phase 1: Schema-Erweiterungen

#### 1.1 Task-Modell erweitern

```prisma
model Task {
  // ... bestehende Felder
  createdById    Int?  // NEU: Wer hat den Task erstellt
  deletedAt      DateTime?  // NEU: Soft Delete
  deletedById    Int?  // NEU: Wer hat den Task gelöscht
  createdBy      User? @relation("TaskCreator", fields: [createdById], references: [id])
  deletedBy      User? @relation("TaskDeleter", fields: [deletedById], references: [id])
  
  // ... bestehende Relations
}

model User {
  // ... bestehende Felder
  tasksCreated   Task[] @relation("TaskCreator")
  tasksDeleted   Task[] @relation("TaskDeleter")
  // ... bestehende Relations
}
```

**Indizes hinzufügen:**
```prisma
@@index([createdById, createdAt(sort: Desc)])
@@index([deletedAt])
@@index([deletedById])
```

#### 1.2 Request-Modell erweitern

```prisma
model Request {
  // ... bestehende Felder
  deletedAt      DateTime?  // NEU: Soft Delete
  deletedById    Int?  // NEU: Wer hat den Request gelöscht
  deletedBy      User? @relation("RequestDeleter", fields: [deletedById], references: [id])
  statusHistory  RequestStatusHistory[]  // NEU: Status-Historie
  
  // ... bestehende Relations
}

model User {
  // ... bestehende Felder
  requestsDeleted Request[] @relation("RequestDeleter")
  requestStatusChanges RequestStatusHistory[] @relation("request_status_changes")
  // ... bestehende Relations
}
```

**Indizes hinzufügen:**
```prisma
@@index([deletedAt])
@@index([deletedById])
@@index([requesterId, createdAt(sort: Desc)])  // Bereits vorhanden, aber für Analytics wichtig
```

#### 1.3 RequestStatusHistory-Modell erstellen

```prisma
model RequestStatusHistory {
  id        Int           @id @default(autoincrement())
  requestId Int
  userId    Int
  oldStatus RequestStatus?
  newStatus RequestStatus
  changedAt DateTime      @default(now())
  branchId  Int
  request   Request       @relation(fields: [requestId], references: [id], onDelete: Cascade)
  user      User          @relation("request_status_changes", fields: [userId], references: [id])
  branch    Branch        @relation(fields: [branchId], references: [id])

  @@index([requestId])
  @@index([userId])
  @@index([changedAt])
  @@index([branchId])
}
```

#### 1.4 TaskDeleteHistory-Modell (Optional - für vollständige Historie)

**Alternative:** Statt `deletedAt` auf Task, separate Tabelle für bessere Historie:

```prisma
model TaskDeleteHistory {
  id        Int      @id @default(autoincrement())
  taskId    Int      // Referenz auf gelöschten Task (kann NULL sein, wenn Task komplett gelöscht)
  taskTitle String   // Titel zum Zeitpunkt der Löschung (für Historie)
  deletedBy Int
  deletedAt DateTime @default(now())
  branchId  Int
  organizationId Int?
  user      User     @relation("TaskDeleter", fields: [deletedBy], references: [id])
  branch    Branch   @relation(fields: [branchId], references: [id])

  @@index([deletedBy])
  @@index([deletedAt])
  @@index([branchId])
  @@index([organizationId])
}
```

**Entscheidung:** Soft Delete (`deletedAt`) ist einfacher und ausreichend. Separate Tabelle nur wenn vollständige Historie auch nach Hard-Delete nötig ist.

#### 1.5 RequestDeleteHistory-Modell (Optional - analog zu Task)

**Entscheidung:** Soft Delete (`deletedAt`) ist ausreichend.

### Phase 2: Migration erstellen

**Migration-Datei:** `YYYYMMDDHHMMSS_add_analytics_fields/migration.sql`

**Schritte:**
1. `Task.createdById` hinzufügen (nullable)
2. `Task.deletedAt` hinzufügen (nullable)
3. `Task.deletedById` hinzufügen (nullable)
4. Foreign Keys für `createdBy` und `deletedBy` hinzufügen
5. Indizes hinzufügen
6. `Request.deletedAt` hinzufügen (nullable)
7. `Request.deletedById` hinzufügen (nullable)
8. Foreign Key für `deletedBy` hinzufügen
9. Indizes hinzufügen
10. `RequestStatusHistory` Tabelle erstellen
11. Foreign Keys und Indizes für `RequestStatusHistory` hinzufügen

**WICHTIG:** Migration muss rückwärtskompatibel sein (alle neuen Felder nullable).

## Backend-Implementierung

### Phase 3: Controller-Anpassungen

#### 3.1 Task-Controller: `createTask` erweitern

**Datei:** `backend/src/controllers/taskController.ts`

**Änderung:**
```typescript
export const createTask = async (req: Request<{}, {}, TaskData>, res: Response) => {
    // ... bestehender Code ...
    
    const taskCreateData: any = {
        title: taskData.title,
        description: taskData.description || '',
        status: taskData.status || 'open',
        qualityControlId: taskData.qualityControlId,
        branchId: taskData.branchId,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
        organizationId: req.organizationId || null,
        createdById: req.userId ? Number(req.userId) : null  // NEU
    };
    
    // ... rest des Codes ...
};
```

#### 3.2 Task-Controller: `deleteTask` auf Soft Delete umstellen

**Datei:** `backend/src/controllers/taskController.ts`

**Änderung:**
```typescript
export const deleteTask = async (req: Request<TaskParams>, res: Response) => {
    try {
        const taskId = parseInt(req.params.id, 10);
        // ... bestehende Validierung ...
        
        // ✅ SOFT DELETE: Statt hard delete, setze deletedAt
        await prisma.task.update({
            where: { id: taskId },
            data: {
                deletedAt: new Date(),
                deletedById: req.userId ? Number(req.userId) : null
            }
        });
        
        // ✅ OPTIONAL: Abhängige Datensätze können bleiben (Cascade Delete wird nicht ausgelöst)
        // Oder: Abhängige Datensätze auch soft-deleten (falls nötig)
        
        // ... Benachrichtigungen ...
    } catch (error) {
        // ... Fehlerbehandlung ...
    }
};
```

**WICHTIG:** Alle Queries müssen `deletedAt IS NULL` Filter enthalten!

#### 3.3 Request-Controller: `updateRequest` erweitern

**Datei:** `backend/src/controllers/requestController.ts`

**Änderung:**
```typescript
export const updateRequest = async (req: Request<{ id: string }, {}, UpdateRequestBody>, res: Response) => {
    // ... bestehender Code ...
    
    // ✅ STATUS-HISTORIE: Speichere Status-Änderungen
    if (status && status !== existingRequest.status) {
        await prisma.requestStatusHistory.create({
            data: {
                requestId: parseInt(id),
                userId: Number(req.userId),
                oldStatus: existingRequest.status,
                newStatus: status as RequestStatus,
                branchId: existingRequest.branchId,
                changedAt: new Date()
            }
        });
    }
    
    // ... rest des Codes ...
};
```

#### 3.4 Request-Controller: `deleteRequest` auf Soft Delete umstellen

**Datei:** `backend/src/controllers/requestController.ts`

**Änderung:**
```typescript
export const deleteRequest = async (req: Request<{ id: string }>, res: Response) => {
    try {
        // ... bestehende Validierung ...
        
        // ✅ SOFT DELETE: Statt hard delete, setze deletedAt
        await prisma.request.update({
            where: { id: parseInt(id) },
            data: {
                deletedAt: new Date(),
                deletedById: req.userId ? Number(req.userId) : null
            }
        });
        
        // ... Benachrichtigungen ...
    } catch (error) {
        // ... Fehlerbehandlung ...
    }
};
```

#### 3.5 Alle Task/Request Queries erweitern

**WICHTIG:** Alle Queries müssen `deletedAt IS NULL` Filter enthalten!

**Dateien zu prüfen:**
- `backend/src/controllers/taskController.ts` - Alle `findMany`, `findFirst`, `findUnique`
- `backend/src/controllers/requestController.ts` - Alle `findMany`, `findFirst`, `findUnique`
- `backend/src/controllers/analyticsController.ts` - Alle Queries
- Alle anderen Controller, die Tasks/Requests abfragen

**Helper-Funktion erstellen:**
```typescript
// backend/src/utils/prisma.ts oder neue Datei
export const getNotDeletedFilter = () => ({
    deletedAt: null
});

// Verwendung:
const tasks = await prisma.task.findMany({
    where: {
        ...getNotDeletedFilter(),
        // ... andere Filter ...
    }
});
```

### Phase 4: Analytics-Controller erweitern

#### 4.1 Neue Endpunkte für User-zentrierte Analyse

**Datei:** `backend/src/controllers/analyticsController.ts`

**Neue Funktionen:**

```typescript
// User-zentriert: Tasks
export const getUserTasksActivity = async (req: Request, res: Response) => {
    // Query-Parameter:
    // - userId (optional, falls leer: alle User)
    // - startDate, endDate (oder period: 'today'|'week'|'month'|'year')
    // - branchId (optional)
    
    // Rückgabe:
    // - User-Liste mit:
    //   - Tasks erstellt (mit createdAt, createdBy)
    //   - Status-Änderungen (aus TaskStatusHistory, mit changedAt, userId, oldStatus, newStatus)
    //   - Tasks gelöscht (mit deletedAt, deletedById)
    // - Alle chronologisch sortiert
};

// User-zentriert: Requests
export const getUserRequestsActivity = async (req: Request, res: Response) => {
    // Analog zu getUserTasksActivity
    // - Requests erstellt (mit createdAt, requesterId)
    // - Status-Änderungen (aus RequestStatusHistory)
    // - Requests gelöscht (mit deletedAt, deletedById)
};
```

#### 4.2 Neue Endpunkte für Task/Request-zentrierte Analyse

```typescript
// Task-zentriert
export const getTasksActivity = async (req: Request, res: Response) => {
    // Query-Parameter:
    // - startDate, endDate (oder period)
    // - branchId (optional)
    // - userId (optional, Filter nach createdBy)
    
    // Rückgabe:
    // - Task-Liste mit:
    //   - createdAt, createdBy (User)
    //   - Status-Änderungen (aus TaskStatusHistory, chronologisch)
    //   - deletedAt, deletedBy (falls gelöscht)
    // - Chronologisch nach createdAt sortiert
};

// Request-zentriert
export const getRequestsActivity = async (req: Request, res: Response) => {
    // Analog zu getTasksActivity
};
```

#### 4.3 Zeitraum-Helper-Funktionen

```typescript
// backend/src/utils/dateHelpers.ts
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from 'date-fns';

export const getDateRange = (period: 'today' | 'week' | 'month' | 'year' | 'custom', startDate?: string, endDate?: string) => {
    const now = new Date();
    
    switch (period) {
        case 'today':
            return {
                start: startOfDay(now),
                end: endOfDay(now)
            };
        case 'week':
            return {
                start: startOfWeek(now, { weekStartsOn: 1 }),
                end: endOfWeek(now, { weekStartsOn: 1 })
            };
        case 'month':
            return {
                start: startOfMonth(now),
                end: endOfMonth(now)
            };
        case 'year':
            return {
                start: startOfYear(now),
                end: endOfYear(now)
            };
        case 'custom':
            if (!startDate || !endDate) {
                throw new Error('startDate und endDate erforderlich für custom period');
            }
            return {
                start: startOfDay(parseISO(startDate)),
                end: endOfDay(parseISO(endDate))
            };
        default:
            throw new Error(`Unbekannte Periode: ${period}`);
    }
};
```

### Phase 5: Routes erweitern

**Datei:** `backend/src/routes/teamWorktimeRoutes.ts`

**Neue Routes:**
```typescript
// User-zentriert
router.get('/analytics/user-tasks-activity', getUserTasksActivity);
router.get('/analytics/user-requests-activity', getUserRequestsActivity);

// Task/Request-zentriert
router.get('/analytics/tasks-activity', getTasksActivity);
router.get('/analytics/requests-activity', getRequestsActivity);
```

**Datei:** `frontend/src/config/api.ts`

**Neue Endpunkte:**
```typescript
TEAM_WORKTIME: {
    // ... bestehende Endpunkte ...
    ANALYTICS: {
        // ... bestehende Endpunkte ...
        USER_TASKS_ACTIVITY: '/team-worktime/analytics/user-tasks-activity',
        USER_REQUESTS_ACTIVITY: '/team-worktime/analytics/user-requests-activity',
        TASKS_ACTIVITY: '/team-worktime/analytics/tasks-activity',
        REQUESTS_ACTIVITY: '/team-worktime/analytics/requests-activity'
    }
}
```

## Frontend-Implementierung

### Phase 6: Gemeinsame Hooks/Komponenten (Performance-Optimierung)

#### 6.1 Hook: `useDateRange`

**Datei:** `frontend/src/hooks/useDateRange.ts`

```typescript
import { useState, useMemo } from 'react';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';

type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

export const useDateRange = () => {
    const [period, setPeriod] = useState<Period>('today');
    const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    
    const dateRange = useMemo(() => {
        const now = new Date();
        
        switch (period) {
            case 'today':
                return {
                    start: format(startOfDay(now), 'yyyy-MM-dd'),
                    end: format(endOfDay(now), 'yyyy-MM-dd')
                };
            case 'week':
                return {
                    start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                    end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
                };
            case 'month':
                return {
                    start: format(startOfMonth(now), 'yyyy-MM-dd'),
                    end: format(endOfMonth(now), 'yyyy-MM-dd')
                };
            case 'year':
                return {
                    start: format(startOfYear(now), 'yyyy-MM-dd'),
                    end: format(endOfYear(now), 'yyyy-MM-dd')
                };
            case 'custom':
                return {
                    start: startDate,
                    end: endDate
                };
        }
    }, [period, startDate, endDate]);
    
    return {
        period,
        setPeriod,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        dateRange
    };
};
```

#### 6.2 Komponente: `DateRangeSelector`

**Datei:** `frontend/src/components/analytics/DateRangeSelector.tsx`

```typescript
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDateRange } from '../../hooks/useDateRange';

export const DateRangeSelector: React.FC = () => {
    const { t } = useTranslation();
    const { period, setPeriod, startDate, setStartDate, endDate, setEndDate } = useDateRange();
    
    return (
        <div className="flex items-center gap-4">
            <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="..."
            >
                <option value="today">{t('analytics.period.today')}</option>
                <option value="week">{t('analytics.period.week')}</option>
                <option value="month">{t('analytics.period.month')}</option>
                <option value="year">{t('analytics.period.year')}</option>
                <option value="custom">{t('analytics.period.custom')}</option>
            </select>
            
            {period === 'custom' && (
                <>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="..."
                    />
                    <span>{t('common.to')}</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="..."
                    />
                </>
            )}
        </div>
    );
};
```

#### 6.3 Hook: `useActivityData` (Caching)

**Datei:** `frontend/src/hooks/useActivityData.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../config/axios';
import { API_ENDPOINTS } from '../config/api';

type ActivityType = 'user-tasks' | 'user-requests' | 'tasks' | 'requests';

interface UseActivityDataOptions {
    type: ActivityType;
    period: string;
    startDate?: string;
    endDate?: string;
    userId?: number;
    branchId?: number;
    cacheKey?: string; // Für manuelles Cache-Invalidierung
}

export const useActivityData = (options: UseActivityDataOptions) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    // ✅ CACHING: Cache-Key basierend auf Parametern
    const cacheKey = options.cacheKey || `${options.type}-${options.period}-${options.startDate}-${options.endDate}-${options.userId}-${options.branchId}`;
    
    const fetchData = useCallback(async () => {
        // ✅ CACHING: Prüfe lokalen Cache (sessionStorage)
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            const cachedData = JSON.parse(cached);
            const cacheAge = Date.now() - cachedData.timestamp;
            // Cache gültig für 5 Minuten
            if (cacheAge < 5 * 60 * 1000) {
                setData(cachedData.data);
                return;
            }
        }
        
        setLoading(true);
        setError(null);
        
        try {
            const params: any = {
                period: options.period
            };
            
            if (options.startDate) params.startDate = options.startDate;
            if (options.endDate) params.endDate = options.endDate;
            if (options.userId) params.userId = options.userId;
            if (options.branchId) params.branchId = options.branchId;
            
            let endpoint = '';
            switch (options.type) {
                case 'user-tasks':
                    endpoint = API_ENDPOINTS.TEAM_WORKTIME.ANALYTICS.USER_TASKS_ACTIVITY;
                    break;
                case 'user-requests':
                    endpoint = API_ENDPOINTS.TEAM_WORKTIME.ANALYTICS.USER_REQUESTS_ACTIVITY;
                    break;
                case 'tasks':
                    endpoint = API_ENDPOINTS.TEAM_WORKTIME.ANALYTICS.TASKS_ACTIVITY;
                    break;
                case 'requests':
                    endpoint = API_ENDPOINTS.TEAM_WORKTIME.ANALYTICS.REQUESTS_ACTIVITY;
                    break;
            }
            
            const response = await axiosInstance.get(endpoint, { params });
            
            // ✅ CACHING: Speichere in sessionStorage
            sessionStorage.setItem(cacheKey, JSON.stringify({
                data: response.data,
                timestamp: Date.now()
            }));
            
            setData(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    }, [cacheKey, options]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    return {
        data,
        loading,
        error,
        refetch: fetchData
    };
};
```

### Phase 7: Neue Tab-Komponenten

#### 7.1 User-zentrierte Tabs

**Datei:** `frontend/src/components/teamWorktime/UserTasksActivityTab.tsx`

**Features:**
- DateRangeSelector
- User-Liste (optional: Filter nach User)
- Pro User:
  - Tasks erstellt (chronologisch, mit createdAt, createdBy)
  - Status-Änderungen (chronologisch, mit changedAt, userId, oldStatus, newStatus)
  - Tasks gelöscht (chronologisch, mit deletedAt, deletedBy)
- Expandierbare Details pro User
- Filter nach Branch

**Datei:** `frontend/src/components/teamWorktime/UserRequestsActivityTab.tsx`

**Analog zu UserTasksActivityTab, aber für Requests**

#### 7.2 Task/Request-zentrierte Tabs

**Datei:** `frontend/src/components/teamWorktime/TasksActivityTab.tsx`

**Features:**
- DateRangeSelector
- Task-Liste (chronologisch nach createdAt)
- Pro Task:
  - Erstellt: createdAt, createdBy (User)
  - Status-Änderungen (chronologisch, expandierbar)
  - Gelöscht: deletedAt, deletedBy (falls gelöscht)
- Filter nach Branch, User (createdBy)
- Table/Card-View-Mode

**Datei:** `frontend/src/components/teamWorktime/RequestsActivityTab.tsx`

**Analog zu TasksActivityTab, aber für Requests**

### Phase 8: TeamWorktimeControl erweitern

**Datei:** `frontend/src/pages/TeamWorktimeControl.tsx`

**Änderungen:**
- Neue Tabs hinzufügen:
  - `user-tasks` - UserTasksActivityTab
  - `user-requests` - UserRequestsActivityTab
  - `tasks-activity` - TasksActivityTab
  - `requests-activity` - RequestsActivityTab

**Tab-Struktur:**
```
Tab 1: Arbeitszeiten (bestehend)
Tab 2: Schichten (bestehend)
Tab 3: To-Do-Auswertungen (bestehend, bleibt)
Tab 4: Request-Auswertungen (bestehend, bleibt)
Tab 5: User Tasks Aktivität (NEU)
Tab 6: User Requests Aktivität (NEU)
Tab 7: Tasks Aktivität (NEU)
Tab 8: Requests Aktivität (NEU)
```

**ODER:** Bestehende Tabs erweitern mit neuen Views:

```
Tab 3: To-Do-Auswertungen
  - Sub-Tab 1: Chronologisch (bestehend)
  - Sub-Tab 2: User-Aktivität (NEU)
  - Sub-Tab 3: Task-Aktivität (NEU)
```

**Empfehlung:** Neue Tabs, da bestehende Tabs bereits komplex sind.

## Performance-Optimierungen

### Phase 9: Backend-Optimierungen

#### 9.1 Query-Optimierungen

**Problem:** Große Datenmengen bei langen Zeiträumen

**Lösungen:**
1. **Pagination** für große Result-Sets
2. **Select nur benötigte Felder** (bereits implementiert)
3. **Indizes** für häufig gefilterte Felder (bereits vorhanden)
4. **Aggregationen** statt einzelne Queries

**Beispiel:**
```typescript
// Statt mehrere Queries:
const tasks = await prisma.task.findMany(...);
const statusChanges = await prisma.taskStatusHistory.findMany(...);
const deletedTasks = await prisma.task.findMany({ where: { deletedAt: { not: null } } });

// Besser: Eine Query mit Aggregationen
const result = await prisma.$queryRaw`
    SELECT 
        t.id,
        t.title,
        t.createdAt,
        t.createdById,
        t.deletedAt,
        t.deletedById,
        COUNT(tsh.id) as statusChangeCount
    FROM "Task" t
    LEFT JOIN "TaskStatusHistory" tsh ON t.id = tsh."taskId"
    WHERE t."deletedAt" IS NULL
        AND t."createdAt" >= ${startDate}
        AND t."createdAt" <= ${endDate}
    GROUP BY t.id
    ORDER BY t."createdAt" DESC
    LIMIT ${limit} OFFSET ${offset}
`;
```

#### 9.2 Caching-Strategie

**Backend-Caching:**
- Redis für häufig abgerufene Daten
- Cache-Key: `analytics:user-tasks:{userId}:{period}:{startDate}:{endDate}`
- TTL: 5 Minuten
- Cache-Invalidierung bei:
  - Task erstellt/aktualisiert/gelöscht
  - Request erstellt/aktualisiert/gelöscht
  - Status-Änderung

**Frontend-Caching:**
- sessionStorage (bereits in `useActivityData` Hook)
- Cache-Key basierend auf Parametern
- TTL: 5 Minuten

### Phase 10: Code-Duplikation reduzieren

#### 10.1 Gemeinsame Komponenten

**Datei:** `frontend/src/components/analytics/ActivityTimeline.tsx`

**Wiederverwendbare Timeline-Komponente für:**
- Tasks erstellt
- Status-Änderungen
- Tasks gelöscht
- Requests erstellt
- Requests gelöscht

**Props:**
```typescript
interface ActivityTimelineProps {
    activities: Array<{
        type: 'created' | 'status_changed' | 'deleted';
        timestamp: Date;
        user: User;
        entity: Task | Request;
        oldStatus?: string;
        newStatus?: string;
    }>;
    onEntityClick?: (entityId: number) => void;
}
```

#### 10.2 Gemeinsame Hooks

**Bereits erstellt:**
- `useDateRange` - Zeitraum-Verwaltung
- `useActivityData` - Daten-Abruf mit Caching

**Zusätzlich:**
- `useActivityFilters` - Filter-Logik (Branch, User, etc.)

## Implementierungsreihenfolge

### Schritt 1: Datenbank-Erweiterungen
1. Schema-Änderungen in `schema.prisma`
2. Migration erstellen
3. Migration testen (lokal)
4. Migration auf Server anwenden

### Schritt 2: Backend-Controller-Anpassungen
1. `createTask` erweitern (createdById)
2. `deleteTask` auf Soft Delete umstellen
3. `updateRequest` erweitern (Status-Historie)
4. `deleteRequest` auf Soft Delete umstellen
5. Alle Queries erweitern (deletedAt Filter)

### Schritt 3: Analytics-Controller
1. Neue Endpunkte implementieren
2. Routes registrieren
3. API-Endpunkte in Frontend config hinzufügen

### Schritt 4: Frontend-Grundlagen
1. `useDateRange` Hook erstellen
2. `DateRangeSelector` Komponente erstellen
3. `useActivityData` Hook erstellen
4. Gemeinsame Komponenten erstellen

### Schritt 5: Frontend-Tabs
1. UserTasksActivityTab erstellen
2. UserRequestsActivityTab erstellen
3. TasksActivityTab erstellen
4. RequestsActivityTab erstellen
5. TeamWorktimeControl erweitern

### Schritt 6: Performance-Optimierungen
1. Backend-Query-Optimierungen
2. Caching implementieren
3. Code-Duplikation reduzieren

### Schritt 7: Testing
1. Unit-Tests für Backend
2. Integration-Tests für API-Endpunkte
3. Frontend-Tests für Komponenten
4. E2E-Tests für User-Flows

## Offene Fragen / Entscheidungsbedarf

1. **Soft Delete vs. Hard Delete:**
   - Soft Delete: Einfacher, aber Daten bleiben in DB
   - Hard Delete: Sauberer, aber Historie verloren
   - **Empfehlung:** Soft Delete für Analytics, Hard Delete optional nach X Tagen

2. **Separate Delete-Historie-Tabellen:**
   - Pro: Vollständige Historie auch nach Hard-Delete
   - Contra: Zusätzliche Komplexität
   - **Empfehlung:** Erst Soft Delete, später optional erweitern

3. **Tab-Struktur:**
   - Viele Tabs vs. Sub-Tabs
   - **Empfehlung:** Neue Tabs, da bestehende bereits komplex

4. **Caching-Strategie:**
   - Redis vs. In-Memory
   - **Empfehlung:** Redis für Production, In-Memory für Development

5. **Pagination:**
   - Infinite Scroll vs. Page-based
   - **Empfehlung:** Infinite Scroll für bessere UX

## Zusammenfassung

**Datenbank-Änderungen:**
- `Task.createdById`, `Task.deletedAt`, `Task.deletedById`
- `Request.deletedAt`, `Request.deletedById`
- `RequestStatusHistory` Tabelle

**Backend-Änderungen:**
- Controller-Anpassungen für Soft Delete
- Status-Historie für Requests
- 4 neue Analytics-Endpunkte

**Frontend-Änderungen:**
- 4 neue Tab-Komponenten
- Gemeinsame Hooks/Komponenten
- Caching-Implementierung

**Performance:**
- Query-Optimierungen
- Caching (Backend + Frontend)
- Code-Duplikation reduzieren

**Geschätzter Aufwand:**
- Datenbank: 2-3 Stunden
- Backend: 8-10 Stunden
- Frontend: 12-15 Stunden
- Testing: 4-6 Stunden
- **Gesamt: 26-34 Stunden**

