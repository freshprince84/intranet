# Tasks & Requests Analytics Umbau - Detaillierter Implementierungsplan

**Aktualisiert:** 2025-02-02  
**Status:** Implementiert - Platzhalter-System für Datumsfilter hinzugefügt

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

**Änderungen:**
1. `createdById` hinzufügen
2. Initiale Status-Historie erstellen

```typescript
export const createTask = async (req: Request<{}, {}, TaskData>, res: Response) => {
    // ... bestehender Code ...
    
    const taskStatus = taskData.status || 'open';
    
    const taskCreateData: any = {
        title: taskData.title,
        description: taskData.description || '',
        status: taskStatus,
        qualityControlId: taskData.qualityControlId,
        branchId: taskData.branchId,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
        organizationId: req.organizationId || null,
        createdById: req.userId ? Number(req.userId) : null  // NEU
    };
    
    // ... rest des Codes zum Erstellen des Tasks ...
    
    // ✅ INITIAL STATUS-HISTORIE: Erstelle initiale Status-Historie
    if (req.userId) {
        await prisma.taskStatusHistory.create({
            data: {
                taskId: task.id,
                userId: Number(req.userId),
                oldStatus: null, // Initial: kein alter Status
                newStatus: taskStatus,
                branchId: taskData.branchId,
                changedAt: new Date()
            }
        });
    }
    
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
        
        // ✅ NOTIFICATIONS: Benachrichtigungen bei Soft Delete (bereits vorhanden, bleibt gleich)
        // Benachrichtigung für den Verantwortlichen
        if (task.responsibleId) {
            const userLang = await getUserLanguage(task.responsibleId);
            const notificationText = getTaskNotificationText(userLang, 'deleted', task.title);
            await createNotificationIfEnabled({
                userId: task.responsibleId,
                title: notificationText.title,
                message: notificationText.message,
                type: NotificationType.task,
                relatedEntityId: taskId,
                relatedEntityType: 'delete' // ✅ WICHTIG: 'delete' für Soft Delete
            });
        }
        
        // Benachrichtigung für die Qualitätskontrolle
        if (task.qualityControlId && task.qualityControlId !== task.responsibleId) {
            const userLang = await getUserLanguage(task.qualityControlId);
            const notificationText = getTaskNotificationText(userLang, 'deleted', task.title);
            await createNotificationIfEnabled({
                userId: task.qualityControlId,
                title: notificationText.title,
                message: notificationText.message,
                type: NotificationType.task,
                relatedEntityId: taskId,
                relatedEntityType: 'delete' // ✅ WICHTIG: 'delete' für Soft Delete
            });
        }
    } catch (error) {
        // ... Fehlerbehandlung ...
    }
};
```

**WICHTIG:** Alle Queries müssen `deletedAt IS NULL` Filter enthalten!

#### 3.3 Request-Controller: `createRequest` erweitern (Initial Status-Historie)

**Datei:** `backend/src/controllers/requestController.ts`

**Änderung:** Initiale Status-Historie beim Erstellen

```typescript
export const createRequest = async (req: Request<{}, {}, RequestData>, res: Response) => {
    // ... bestehender Code zum Erstellen des Requests ...
    
    const requestStatus = req.body.status || 'approval';
    
    // ... Request erstellen ...
    
    // ✅ INITIAL STATUS-HISTORIE: Erstelle initiale Status-Historie
    if (req.userId) {
        await prisma.requestStatusHistory.create({
            data: {
                requestId: request.id,
                userId: Number(req.userId),
                oldStatus: null, // Initial: kein alter Status
                newStatus: requestStatus as RequestStatus,
                branchId: request.branchId,
                changedAt: new Date()
            }
        });
    }
    
    // ... rest des Codes ...
};
```

#### 3.4 Request-Controller: `updateRequest` erweitern

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

#### 3.5 Request-Controller: `deleteRequest` auf Soft Delete umstellen

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
        
        // ✅ NOTIFICATIONS: Benachrichtigungen bei Soft Delete
        // Benachrichtigung für den Requester
        if (existingRequest.requesterId) {
            const userLang = await getUserLanguage(existingRequest.requesterId);
            const notificationText = getRequestNotificationText(userLang, 'deleted', existingRequest.title);
            await createNotificationIfEnabled({
                userId: existingRequest.requesterId,
                title: notificationText.title,
                message: notificationText.message,
                type: NotificationType.request,
                relatedEntityId: parseInt(id),
                relatedEntityType: 'delete' // ✅ WICHTIG: 'delete' für Soft Delete
            });
        }
        
        // Benachrichtigung für den Verantwortlichen
        if (existingRequest.responsibleId && existingRequest.responsibleId !== existingRequest.requesterId) {
            const userLang = await getUserLanguage(existingRequest.responsibleId);
            const notificationText = getRequestNotificationText(userLang, 'deleted', existingRequest.title);
            await createNotificationIfEnabled({
                userId: existingRequest.responsibleId,
                title: notificationText.title,
                message: notificationText.message,
                type: NotificationType.request,
                relatedEntityId: parseInt(id),
                relatedEntityType: 'delete' // ✅ WICHTIG: 'delete' für Soft Delete
            });
        }
    } catch (error) {
        // ... Fehlerbehandlung ...
    }
};
```

#### 3.6 Alle Task/Request Queries erweitern

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

**⚠️ WICHTIG:** 
- Pagination implementieren
- `deletedAt IS NULL` Filter verwenden
- Nur benötigte Felder selektieren (keine Attachments!)

**Neue Funktionen:**

```typescript
// User-zentriert: Tasks
export const getUserTasksActivity = async (req: Request, res: Response) => {
    // ✅ PAGINATION: Query-Parameter
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    
    // Query-Parameter:
    // - userId (optional, falls leer: alle User)
    // - startDate, endDate (oder period: 'today'|'week'|'month'|'year')
    // - branchId (optional)
    
    const { start, end } = getDateRange(
        req.query.period as any || 'today',
        req.query.startDate as string,
        req.query.endDate as string
    );
    
    const isolationFilter = getDataIsolationFilter(req as any, 'task');
    
    // ✅ PERFORMANCE: Nur benötigte Felder selektieren (keine Attachments!)
    const tasks = await prisma.task.findMany({
        where: {
            ...isolationFilter,
            ...getNotDeletedFilter(), // ✅ WICHTIG: deletedAt IS NULL
            createdAt: { gte: start, lte: end },
            ...(req.query.userId ? { createdById: parseInt(req.query.userId as string, 10) } : {}),
            ...(req.query.branchId ? { branchId: parseInt(req.query.branchId as string, 10) } : {})
        },
        select: {
            id: true,
            title: true,
            createdAt: true,
            createdById: true,
            deletedAt: true,
            deletedById: true,
            _count: {
                select: { attachments: true } // Nur Count, keine Binary-Daten!
            },
            createdBy: {
                select: { id: true, firstName: true, lastName: true }
            },
            deletedBy: {
                select: { id: true, firstName: true, lastName: true }
            }
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' }
    });
    
    // Status-Änderungen für diese Tasks
    const taskIds = tasks.map(t => t.id);
    const statusChanges = await prisma.taskStatusHistory.findMany({
        where: {
            taskId: { in: taskIds },
            changedAt: { gte: start, lte: end }
        },
        select: {
            taskId: true,
            userId: true,
            oldStatus: true,
            newStatus: true,
            changedAt: true,
            user: {
                select: { id: true, firstName: true, lastName: true }
            }
        },
        orderBy: { changedAt: 'desc' }
    });
    
    const totalCount = await prisma.task.count({
        where: {
            ...isolationFilter,
            ...getNotDeletedFilter(),
            createdAt: { gte: start, lte: end }
        }
    });
    
    // Gruppiere nach User
    const userActivity: Record<number, any> = {};
    
    tasks.forEach(task => {
        if (task.createdById) {
            if (!userActivity[task.createdById]) {
                userActivity[task.createdById] = {
                    user: task.createdBy,
                    tasksCreated: [],
                    tasksDeleted: [],
                    statusChanges: []
                };
            }
            userActivity[task.createdById].tasksCreated.push(task);
        }
        
        if (task.deletedAt && task.deletedById) {
            if (!userActivity[task.deletedById]) {
                userActivity[task.deletedById] = {
                    user: task.deletedBy,
                    tasksCreated: [],
                    tasksDeleted: [],
                    statusChanges: []
                };
            }
            userActivity[task.deletedById].tasksDeleted.push(task);
        }
    });
    
    statusChanges.forEach(change => {
        if (!userActivity[change.userId]) {
            userActivity[change.userId] = {
                user: change.user,
                tasksCreated: [],
                tasksDeleted: [],
                statusChanges: []
            };
        }
        userActivity[change.userId].statusChanges.push(change);
    });
    
    res.json({
        data: Object.values(userActivity),
        totalCount,
        hasMore: offset + tasks.length < totalCount
    });
};

// User-zentriert: Requests
export const getUserRequestsActivity = async (req: Request, res: Response) => {
    // Analog zu getUserTasksActivity, aber für Requests
    // - Requests erstellt (mit createdAt, requesterId)
    // - Status-Änderungen (aus RequestStatusHistory)
    // - Requests gelöscht (mit deletedAt, deletedById)
};
```

#### 4.2 Neue Endpunkte für Task/Request-zentrierte Analyse

**⚠️ WICHTIG:** 
- Pagination implementieren
- `deletedAt IS NULL` Filter verwenden (oder explizit gelöschte anzeigen)
- Nur benötigte Felder selektieren (keine Attachments!)

```typescript
// Task-zentriert
export const getTasksActivity = async (req: Request, res: Response) => {
    // ✅ PAGINATION: Query-Parameter
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    
    // Query-Parameter:
    // - startDate, endDate (oder period)
    // - branchId (optional)
    // - userId (optional, Filter nach createdBy)
    // - includeDeleted (optional, boolean - zeigt auch gelöschte Tasks)
    
    const { start, end } = getDateRange(
        req.query.period as any || 'today',
        req.query.startDate as string,
        req.query.endDate as string
    );
    
    const isolationFilter = getDataIsolationFilter(req as any, 'task');
    const includeDeleted = req.query.includeDeleted === 'true';
    
    // ✅ PERFORMANCE: Nur benötigte Felder selektieren (keine Attachments!)
    const tasks = await prisma.task.findMany({
        where: {
            ...isolationFilter,
            ...(includeDeleted ? {} : getNotDeletedFilter()), // Optional: gelöschte anzeigen
            createdAt: { gte: start, lte: end },
            ...(req.query.userId ? { createdById: parseInt(req.query.userId as string, 10) } : {}),
            ...(req.query.branchId ? { branchId: parseInt(req.query.branchId as string, 10) } : {})
        },
        select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            createdById: true,
            deletedAt: true,
            deletedById: true,
            _count: {
                select: { attachments: true, statusHistory: true } // Nur Count!
            },
            createdBy: {
                select: { id: true, firstName: true, lastName: true }
            },
            deletedBy: {
                select: { id: true, firstName: true, lastName: true }
            }
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' }
    });
    
    // Status-Historie für diese Tasks
    const taskIds = tasks.map(t => t.id);
    const statusHistory = await prisma.taskStatusHistory.findMany({
        where: {
            taskId: { in: taskIds }
        },
        select: {
            taskId: true,
            userId: true,
            oldStatus: true,
            newStatus: true,
            changedAt: true,
            user: {
                select: { id: true, firstName: true, lastName: true }
            }
        },
        orderBy: { changedAt: 'asc' } // Chronologisch
    });
    
    // Gruppiere Status-Historie nach Task
    const statusHistoryByTask: Record<number, any[]> = {};
    statusHistory.forEach(change => {
        if (!statusHistoryByTask[change.taskId]) {
            statusHistoryByTask[change.taskId] = [];
        }
        statusHistoryByTask[change.taskId].push(change);
    });
    
    // Kombiniere Tasks mit Status-Historie
    const tasksWithHistory = tasks.map(task => ({
        ...task,
        statusHistory: statusHistoryByTask[task.id] || []
    }));
    
    const totalCount = await prisma.task.count({
        where: {
            ...isolationFilter,
            ...(includeDeleted ? {} : getNotDeletedFilter()),
            createdAt: { gte: start, lte: end }
        }
    });
    
    res.json({
        data: tasksWithHistory,
        totalCount,
        hasMore: offset + tasks.length < totalCount
    });
};

// Request-zentriert
export const getRequestsActivity = async (req: Request, res: Response) => {
    // Analog zu getTasksActivity, aber für Requests
    // - Requests erstellt (mit createdAt, requesterId)
    // - Status-Änderungen (aus RequestStatusHistory, chronologisch)
    // - deletedAt, deletedBy (falls gelöscht)
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

#### 6.3 Hook: `useActivityData` (Caching) - KORRIGIERT

**Datei:** `frontend/src/hooks/useActivityData.ts`

**⚠️ WICHTIG: Memory Leak Prevention!**

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
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
    
    // ✅ MEMORY: Ref für options, um Memory Leak zu vermeiden
    const optionsRef = useRef(options);
    useEffect(() => {
        optionsRef.current = options;
    }, [options]);
    
    // ✅ CACHING: Cache-Key basierend auf Parametern
    const cacheKey = options.cacheKey || `${options.type}-${options.period}-${options.startDate}-${options.endDate}-${options.userId}-${options.branchId}`;
    
    // ✅ MEMORY: fetchData ohne options-Dependency (verwendet Ref)
    const fetchData = useCallback(async () => {
        const opts = optionsRef.current; // Ref verwenden!
        
        // ✅ CACHING: Prüfe lokalen Cache (sessionStorage)
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            try {
                const cachedData = JSON.parse(cached);
                const cacheAge = Date.now() - cachedData.timestamp;
                // Cache gültig für 5 Minuten
                if (cacheAge < 5 * 60 * 1000) {
                    setData(cachedData.data);
                    return;
                }
            } catch (e) {
                // Cache invalid, weiter mit Fetch
            }
        }
        
        setLoading(true);
        setError(null);
        
        try {
            const params: any = {
                period: opts.period
            };
            
            if (opts.startDate) params.startDate = opts.startDate;
            if (opts.endDate) params.endDate = opts.endDate;
            if (opts.userId) params.userId = opts.userId;
            if (opts.branchId) params.branchId = opts.branchId;
            
            let endpoint = '';
            switch (opts.type) {
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
            try {
                sessionStorage.setItem(cacheKey, JSON.stringify({
                    data: response.data,
                    timestamp: Date.now()
                }));
            } catch (e) {
                // sessionStorage voll oder nicht verfügbar, ignoriere
            }
            
            setData(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    }, [cacheKey]); // Nur cacheKey als Dependency!
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    // ✅ MEMORY: Optional: Cleanup für Cache beim Unmount
    useEffect(() => {
        return () => {
            // Optional: Cache löschen beim Unmount
            // sessionStorage.removeItem(cacheKey);
        };
    }, [cacheKey]);
    
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

## ⚠️ KRITISCHE FEHLENDE PUNKTE - MÜSSEN ERGÄNZT WERDEN

### 1. Initial Status-Historie beim Erstellen

**Problem:** Beim Erstellen von Tasks/Requests wird keine initiale Status-Historie erstellt.

**Lösung:**
- **Tasks:** Beim `createTask` initiale Status-Historie mit `oldStatus: null`, `newStatus: 'open'` (oder übergebenem Status) erstellen
- **Requests:** Beim `createRequest` initiale Status-Historie mit `oldStatus: null`, `newStatus: 'approval'` (oder übergebenem Status) erstellen

**Dateien:**
- `backend/src/controllers/taskController.ts` - `createTask` erweitern
- `backend/src/controllers/requestController.ts` - `createRequest` erweitern

### 2. Alle Queries mit deletedAt Filter erweitern

**Problem:** 45 Controller-Dateien müssen geprüft werden, ob sie Tasks/Requests abfragen.

**Vollständige Liste der zu prüfenden Dateien:**
- `backend/src/controllers/taskController.ts` - Alle Queries
- `backend/src/controllers/requestController.ts` - Alle Queries
- `backend/src/controllers/analyticsController.ts` - Alle Queries
- `backend/src/controllers/branchController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/reservationController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/userController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/lobbyPmsController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/authController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/whatsappController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/organizationController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/worktimeController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/userAvailabilityController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/urlMetadataController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/ttlockController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/tourReservationController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/tourProviderController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/tourController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/tourBookingController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/teamWorktimeController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/taskAttachmentController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/tableSettingsController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/shiftTemplateController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/shiftSwapController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/shiftController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/settingsController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/savedFilterController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/roleController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/requestAttachmentController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/payrollController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/passwordManagerController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/notificationController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/monthlyConsultationReportController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/lifecycleController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/joinRequestController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/invoiceSettingsController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/identificationDocumentController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/emailReservationController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/databaseController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/consultationInvoiceController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/consultationController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/clientController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/cerebroMediaController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/cerebroExternalLinksController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/cerebroController.ts` - Prüfen ob Tasks/Requests abgefragt werden
- `backend/src/controllers/boldPaymentController.ts` - Prüfen ob Tasks/Requests abgefragt werden

**Helper-Funktion:**
```typescript
// backend/src/utils/prisma.ts
export const getNotDeletedFilter = () => ({
    deletedAt: null
});

// Verwendung in ALLEN Queries:
const tasks = await prisma.task.findMany({
    where: {
        ...getNotDeletedFilter(),
        // ... andere Filter ...
    }
});
```

### 3. Memory Leaks in useActivityData Hook

**Problem:** `useActivityData` Hook hat Memory Leak durch `useEffect` mit `fetchData` als Dependency.

**Lösung:**
```typescript
// ❌ VORHER (FALSCH - Memory Leak):
const fetchData = useCallback(async () => {
    // ...
}, [cacheKey, options]); // options ist Objekt → wird bei jedem Render neu erstellt!

useEffect(() => {
    fetchData();
}, [fetchData]); // fetchData wird bei jedem Render neu erstellt → Memory Leak!

// ✅ NACHHER (RICHTIG):
const optionsRef = useRef(options);
useEffect(() => {
    optionsRef.current = options;
}, [options]);

const fetchData = useCallback(async () => {
    const opts = optionsRef.current; // Ref verwenden!
    // ...
}, []); // Keine Dependencies!

useEffect(() => {
    fetchData();
}, [fetchData]); // fetchData ist jetzt stabil
```

**Zusätzlich:** Cleanup für sessionStorage Cache beim Unmount:
```typescript
useEffect(() => {
    return () => {
        // Optional: Cache löschen beim Unmount (oder bei Tab-Wechsel)
        // sessionStorage.removeItem(cacheKey);
    };
}, [cacheKey]);
```

### 4. Pagination für Analytics-Endpunkte

**Problem:** Keine Pagination in Analytics-Endpunkten → kann bei großen Datenmengen zu Performance-Problemen führen.

**Lösung:**
- Alle Analytics-Endpunkte müssen Pagination unterstützen
- Query-Parameter: `limit` (default: 50), `offset` (default: 0)
- Rückgabe: `{ data: [...], totalCount: number, hasMore: boolean }`

**Beispiel:**
```typescript
export const getUserTasksActivity = async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    
    // ... Query mit take/skip ...
    
    const totalCount = await prisma.task.count({ where: { ... } });
    
    res.json({
        data: results,
        totalCount,
        hasMore: offset + results.length < totalCount
    });
};
```

### 5. Berechtigungen für neue Tabs

**Problem:** Neue Tabs brauchen Berechtigungen.

**Lösung:**
- **Seed-File:** Keine neuen Berechtigungen nötig (Tabs sind Teil von `team_worktime_control` Page)
- **Frontend:** Prüfe `team_worktime_control` Page-Berechtigung (bereits vorhanden)
- **Backend:** Prüfe `isTeamManager` Middleware (bereits vorhanden)

**Dateien:**
- `backend/prisma/seed.ts` - Keine Änderung nötig
- `frontend/src/pages/TeamWorktimeControl.tsx` - Bereits vorhanden
- `backend/src/routes/teamWorktimeRoutes.ts` - Bereits vorhanden

### 6. Übersetzungen (I18N)

**Problem:** Alle neuen Texte müssen übersetzt werden.

**Lösung:**
- Alle Texte in neuen Komponenten müssen `t()` verwenden
- Übersetzungskeys in `de.json`, `en.json`, `es.json` hinzufügen

**Benötigte Übersetzungskeys:**
```json
{
  "analytics": {
    "period": {
      "today": "Heute",
      "week": "Diese Woche",
      "month": "Diesen Monat",
      "year": "Dieses Jahr",
      "custom": "Benutzerdefiniert"
    },
    "userActivity": {
      "title": "User-Aktivität",
      "tasksCreated": "Tasks erstellt",
      "tasksDeleted": "Tasks gelöscht",
      "statusChanges": "Status-Änderungen"
    },
    "taskActivity": {
      "title": "Task-Aktivität",
      "createdBy": "Erstellt von",
      "deletedBy": "Gelöscht von",
      "statusHistory": "Status-Historie"
    }
  }
}
```

**Dateien:**
- `frontend/src/i18n/locales/de.json`
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/es.json`

### 7. Notifications bei Soft Delete

**Problem:** Bei Soft Delete müssen Notifications gesendet werden.

**Lösung:**
- `deleteTask` und `deleteRequest` müssen `createNotificationIfEnabled` aufrufen
- `relatedEntityType: 'delete'` verwenden
- Übersetzungen in `backend/src/utils/translations.ts` prüfen (bereits vorhanden: `getTaskNotificationText`, `getRequestNotificationText`)

**Dateien:**
- `backend/src/controllers/taskController.ts` - `deleteTask` erweitern
- `backend/src/controllers/requestController.ts` - `deleteRequest` erweitern

### 8. Filter-System Integration

**Problem:** Neue Analytics-Tabs müssen Filter-System unterstützen.

**Lösung:**
- `FilterPane` Komponente verwenden (bereits vorhanden)
- `SavedFilterTags` Komponente verwenden (bereits vorhanden)
- Filter-Logik in Backend-Endpunkten implementieren

**Dateien:**
- `frontend/src/components/teamWorktime/UserTasksActivityTab.tsx` - FilterPane integrieren
- `frontend/src/components/teamWorktime/UserRequestsActivityTab.tsx` - FilterPane integrieren
- `frontend/src/components/teamWorktime/TasksActivityTab.tsx` - FilterPane integrieren
- `frontend/src/components/teamWorktime/RequestsActivityTab.tsx` - FilterPane integrieren

### 8.1. Standard-Filter-Verhalten

**Verhalten beim Laden der Analytics-Tabs:**

Beim Laden der `TodoAnalyticsTab` und `RequestAnalyticsTab` wird automatisch der Filter für den aktuellen Benutzer angewendet:

1. **Filter-Name:** Der Filter wird nach dem Namen des aktuellen Benutzers gesucht:
   - Format: `${user.firstName} ${user.lastName}` (z.B. "Patrick Ammann")
   - Fallback: `user.username` falls Name leer ist

2. **Filter-Erstellung:**
   - Filter werden im Seed für jeden Benutzer erstellt (Gruppe "Benutzer")
   - Für `todo-analytics-table`: Filter mit `responsible = user-{id} OR qualityControl = user-{id} AND time >= __WEEK_START__ AND time <= __WEEK_END__`
   - Für `request-analytics-table`: Filter mit `requestedBy = user-{id} OR responsible = user-{id} AND time >= __WEEK_START__ AND time <= __WEEK_END__`
   - Rollen-Filter für `todo-analytics-table`: `responsible = role-{id} AND time >= __WEEK_START__ AND time <= __WEEK_END__`

3. **Fallback:**
   - Falls kein Benutzer-Filter gefunden wird, wird der Filter "Alle" angewendet
   - "Alle" Filter ist immer vorhanden (wird im Seed erstellt)

4. **Datumsfilterung:**
   - Benutzer- und Rollen-Filter enthalten automatisch die Datumsfilterung "Diese Woche" (`time >= __WEEK_START__ AND time <= __WEEK_END__`)
   - Die Platzhalter `__WEEK_START__` und `__WEEK_END__` werden dynamisch aufgelöst (aktueller Wochenanfang/-ende)
   - Benutzer können die Datumsfilterung im FilterPane anpassen (Platzhalter-Dropdown: Heute, Diese Woche, Dieser Monat, Dieses Jahr, Benutzerdefiniert)

**Implementierung:**
- `TodoAnalyticsTab.tsx`: Verwendet `useAuth()` Hook, sucht Filter nach Benutzer-Name
- `RequestAnalyticsTab.tsx`: Verwendet `useAuth()` Hook, sucht Filter nach Benutzer-Name
- `backend/prisma/seed.ts`: Erstellt Benutzer-Filter in Gruppe "Benutzer" (nicht mehr "Eigene Aufgaben/Requests - Diese Woche")

### 9. Table Settings Integration

**Problem:** Neue Analytics-Tabs müssen Table Settings unterstützen.

**Lösung:**
- `useTableSettings` Hook verwenden (bereits vorhanden)
- Spalten-Reihenfolge, versteckte Spalten, View-Mode speichern

**Dateien:**
- Alle neuen Tab-Komponenten müssen `useTableSettings` verwenden

### 10. Rückwärtskompatibilität

**Problem:** Bestehende Tasks/Requests haben `createdById = null`.

**Lösung:**
- Migration muss `createdById` als nullable hinzufügen
- Bestehende Daten bleiben `null` (OK für Analytics)
- Neue Tasks/Requests bekommen `createdById` gesetzt

### 11. Performance-Risiken

**Risiken:**
1. **Soft Delete wächst DB:** Gelöschte Tasks/Requests bleiben in DB
   - **Lösung:** Optionales Cleanup-Script nach X Tagen (später implementieren)
2. **Performance bei vielen gelöschten Einträgen:** Queries werden langsamer
   - **Lösung:** Indizes auf `deletedAt` (bereits geplant)
3. **Migration kann lange dauern:** Bei vielen Daten
   - **Lösung:** Migration in Schritten, Indizes nach Migration erstellen
4. **Breaking Changes:** Bestehende Queries müssen angepasst werden
   - **Lösung:** Helper-Funktion `getNotDeletedFilter()` verwenden

### 12. Memory Leak Prevention

**Regeln:**
1. **JEDER `setTimeout`/`setInterval` MUSS Cleanup haben:**
   ```typescript
   useEffect(() => {
       const timeoutId = setTimeout(() => {}, 100);
       return () => clearTimeout(timeoutId);
   }, []);
   ```
2. **useCallback mit Objekt-Dependencies vermeiden:**
   ```typescript
   // ❌ FALSCH:
   const fetchData = useCallback(() => {}, [options]); // options ist Objekt!
   
   // ✅ RICHTIG:
   const optionsRef = useRef(options);
   useEffect(() => { optionsRef.current = options; }, [options]);
   const fetchData = useCallback(() => {
       const opts = optionsRef.current; // Ref verwenden!
   }, []);
   ```
3. **sessionStorage Cache Cleanup:** Optional beim Unmount oder Tab-Wechsel

## Offene Fragen / Entscheidungsbedarf

1. **Soft Delete vs. Hard Delete:**
   - Soft Delete: Einfacher, aber Daten bleiben in DB
   - Hard Delete: Sauberer, aber Historie verloren
   - **Entscheidung:** Soft Delete für Analytics, Hard Delete optional nach X Tagen

2. **Separate Delete-Historie-Tabellen:**
   - Pro: Vollständige Historie auch nach Hard-Delete
   - Contra: Zusätzliche Komplexität
   - **Entscheidung:** Erst Soft Delete, später optional erweitern

3. **Tab-Struktur:**
   - Viele Tabs vs. Sub-Tabs
   - **Entscheidung:** Neue Tabs, da bestehende bereits komplex

4. **Caching-Strategie:**
   - Redis vs. In-Memory
   - **Entscheidung:** Redis für Production, In-Memory für Development

5. **Pagination:**
   - Infinite Scroll vs. Page-based
   - **Entscheidung:** Infinite Scroll für bessere UX

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
- Backend: 12-15 Stunden (inkl. alle Queries prüfen, Pagination, Notifications)
- Frontend: 15-18 Stunden (inkl. Memory Leak Fixes, Übersetzungen, Filter-Integration)
- Testing: 6-8 Stunden
- **Gesamt: 35-44 Stunden**

## ✅ CHECKLISTE FÜR IMPLEMENTIERUNG

### Datenbank
- [ ] Schema-Änderungen in `schema.prisma`
- [ ] Migration erstellen (rückwärtskompatibel!)
- [ ] Indizes hinzufügen
- [ ] Migration testen (lokal)
- [ ] Migration auf Server anwenden

### Backend - Controller-Anpassungen
- [ ] `createTask` erweitern (`createdById` + Initial Status-Historie)
- [ ] `createRequest` erweitern (Initial Status-Historie)
- [ ] `deleteTask` auf Soft Delete umstellen + Notifications
- [ ] `deleteRequest` auf Soft Delete umstellen + Notifications
- [ ] `updateRequest` erweitern (Status-Historie)
- [ ] **ALLE 45 Controller-Dateien prüfen** auf Task/Request Queries
- [ ] `getNotDeletedFilter()` Helper-Funktion erstellen
- [ ] Alle Queries mit `deletedAt IS NULL` Filter erweitern

### Backend - Analytics-Controller
- [ ] `getUserTasksActivity` implementieren (mit Pagination!)
- [ ] `getUserRequestsActivity` implementieren (mit Pagination!)
- [ ] `getTasksActivity` implementieren (mit Pagination!)
- [ ] `getRequestsActivity` implementieren (mit Pagination!)
- [ ] `getDateRange` Helper-Funktion erstellen
- [ ] Routes registrieren
- [ ] API-Endpunkte in Frontend config hinzufügen

### Frontend - Hooks/Komponenten
- [ ] `useDateRange` Hook erstellen
- [ ] `DateRangeSelector` Komponente erstellen
- [ ] `useActivityData` Hook erstellen (**Memory Leak Fix!**)
- [ ] `ActivityTimeline` Komponente erstellen
- [ ] `useActivityFilters` Hook erstellen

### Frontend - Tab-Komponenten
- [ ] `UserTasksActivityTab.tsx` erstellen
- [ ] `UserRequestsActivityTab.tsx` erstellen
- [ ] `TasksActivityTab.tsx` erstellen
- [ ] `RequestsActivityTab.tsx` erstellen
- [ ] Filter-System integrieren (FilterPane, SavedFilterTags)
- [ ] Table Settings integrieren (useTableSettings)
- [ ] **Übersetzungen hinzufügen** (de.json, en.json, es.json)

### Frontend - TeamWorktimeControl
- [ ] Neue Tabs hinzufügen
- [ ] Tab-Navigation erweitern
- [ ] Berechtigungen prüfen (bereits vorhanden)

### Performance & Memory Leaks
- [ ] Memory Leak Fix in `useActivityData` (useRef statt useCallback)
- [ ] Cleanup für sessionStorage Cache
- [ ] Pagination in allen Analytics-Endpunkten
- [ ] Nur benötigte Felder selektieren (keine Attachments!)
- [ ] Indizes auf `deletedAt` prüfen

### Testing
- [ ] Unit-Tests für Backend
- [ ] Integration-Tests für API-Endpunkte
- [ ] Frontend-Tests für Komponenten
- [ ] E2E-Tests für User-Flows
- [ ] Memory Leak Tests (React DevTools Profiler)
- [ ] Performance-Tests (große Datenmengen)

### Dokumentation
- [ ] Implementation Report erstellen
- [ ] API-Dokumentation aktualisieren
- [ ] User-Dokumentation aktualisieren

