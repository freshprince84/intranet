# Plan: Organisation-Filterung - Vollständige Prüfung und Anpassung (AKTUALISIERT)

**Erstellt:** 2024  
**Status:** Planungsphase  
**Priorität:** HOCH  
**Letzte Aktualisierung:** Nach vollständiger Code-Prüfung

## Ziel

Sicherstellen, dass **ALLE** Daten (Requests, Tasks, User, Rollen, etc.) **IMMER nur pro Organisation** angezeigt werden.

## KRITISCHE ERWEITERTE ANALYSE

### ✅ Was bereits funktioniert:

1. **getDataIsolationFilter** ist implementiert und funktioniert für:
   - ✅ Tasks (`getAllTasks` in taskController.ts)
   - ✅ Requests (`getAllRequests`, `getRequestById` in requestController.ts)
   - ✅ Roles (`getAllRoles` in roleController.ts)
   - ✅ Clients (`getAllClients` in clientController.ts)
   - ✅ Branches (`getAllBranches` in branchController.ts)
   - ✅ Users (`getAllUsers` verwendet `getUserOrganizationFilter`)
   - ✅ Consultations (`getConsultations` verwendet `getDataIsolationFilter`)

2. **organizationMiddleware** wird verwendet in:
   - ✅ `/users` Route (userController.ts)
   - ✅ `/organizations` Route (organizationController.ts)

### ❌ KRITISCHE PROBLEME GEFUNDEN:

#### Problem 1: Routes ohne `organizationMiddleware` ⚠️ SEHR KRITISCH

**Folgende Routes verwenden KEINE `organizationMiddleware`:**
- ❌ `/tasks` Route - `req.organizationId` nicht verfügbar
- ❌ `/requests` Route - `req.organizationId` nicht verfügbar
- ❌ `/worktime` Route - `req.organizationId` nicht verfügbar
- ❌ `/roles` Route - `req.organizationId` nicht verfügbar
- ❌ `/clients` Route - `req.organizationId` nicht verfügbar
- ❌ `/branches` Route - `req.organizationId` nicht verfügbar (zudem KEINE authMiddleware!)
- ❌ `/consultations` Route - `req.organizationId` nicht verfügbar
- ❌ `/team-worktime` Route - `req.organizationId` nicht verfügbar

**Folge:** `getDataIsolationFilter` und `getUserOrganizationFilter` können nicht richtig funktionieren, da `req.organizationId` undefined ist!

#### Problem 2: `getAllUsersForDropdown` - KEINE Organisation-Filterung
**Datei:** `backend/src/controllers/userController.ts:102-137`
**Route:** `GET /users/dropdown`
**Problem:** Zeigt ALLE User im System, nicht nur die der Organisation

#### Problem 3: `getRolePermissions` - KEINE Organisation-Validierung
**Datei:** `backend/src/controllers/roleController.ts:513-532`
**Route:** `GET /roles/:id/permissions`
**Problem:** Kann Permissions von Rollen anderer Organisationen abrufen

#### Problem 4: `updateUserRoles` - KEINE Rollen-Organisation-Validierung
**Datei:** `backend/src/controllers/userController.ts:502-508`
**Problem:** Prüft nicht ob Rollen zur Organisation gehören

#### Problem 5: Admin-Abfragen ohne Organisation-Filter
**Gefunden in mehreren Controllern:**
- `roleController.ts:178, 319, 343, 422, 449` - Admin-Abfragen
- `userController.ts:613, 1065, 1183, 1270` - Admin-Abfragen
- `notificationController.ts:629` - Org-Admin-Abfrage

#### Problem 6: `teamWorktimeController.ts` - KOMPLETT ohne Organisation-Filterung ⚠️ KRITISCH
**Datei:** `backend/src/controllers/teamWorktimeController.ts`

**Alle Funktionen zeigen ALLE Daten im System:**
- ❌ `getActiveTeamWorktimes` - Zeigt alle aktiven WorkTimes aller Organisationen
- ❌ `getUserWorktimesByDay` - Zeigt alle WorkTimes aller Organisationen
- ❌ `stopUserWorktime` - Kann WorkTimes aller Organisationen stoppen
- ❌ `updateUserWorktime` - Kann WorkTimes aller Organisationen ändern
- ❌ `updateApprovedOvertimeHours` - Kann User aller Organisationen ändern

#### Problem 7: `worktimeController.ts` - Teilweise ohne Organisation-Filterung
**Datei:** `backend/src/controllers/worktimeController.ts`

**Probleme:**
- ❌ `getWorktimes` (Zeile 258) - Verwendet nur `userId: Number(userId)` statt `getDataIsolationFilter`
- ❌ `deleteWorktime` (Zeile 275) - Prüft nur `worktime.userId !== Number(userId)` statt Organisation
- ❌ `updateWorktime` (Zeile 307) - Prüft nur `worktime.userId !== Number(userId)` statt Organisation

#### Problem 8: `taskController.ts` - Update/Delete ohne Organisation-Filterung ⚠️ KRITISCH
**Datei:** `backend/src/controllers/taskController.ts`

**Probleme:**
- ❌ `updateTask` (Zeile 211) - Verwendet `findUnique` ohne Organisation-Filterung vor Update
- ❌ `deleteTask` (Zeile 400) - Verwendet `findUnique` ohne Organisation-Filterung vor Delete
- ❌ `getTaskCarticles` (Zeile 470) - Verwendet `findUnique` ohne Organisation-Filterung
- ❌ `linkTaskToCarticle` (Zeile 529) - Verwendet `findUnique` ohne Organisation-Filterung

#### Problem 9: `requestController.ts` - Update/Delete ohne Organisation-Filterung ⚠️ KRITISCH
**Datei:** `backend/src/controllers/requestController.ts`

**Probleme:**
- ❌ `updateRequest` (Zeile 257) - Verwendet `findUnique` ohne Organisation-Filterung vor Update
- ❌ `deleteRequest` (Zeile 452) - Verwendet `findUnique` ohne Organisation-Filterung vor Delete

#### Problem 10: Create/Update Operationen ohne Validierung ⚠️ SEHR KRITISCH

**Problem:** Bei Create/Update werden User-IDs nicht geprüft ob sie zur Organisation gehören

**Betroffen:**
- ❌ `createTask` - Prüft nicht ob `responsibleId`, `qualityControlId` zur Organisation gehören
- ❌ `updateTask` - Prüft nicht ob `responsibleId`, `qualityControlId` zur Organisation gehören
- ❌ `createRequest` - Prüft nicht ob `requesterId`, `responsibleId` zur Organisation gehören
- ❌ `updateRequest` - Prüft nicht ob `requesterId`, `responsibleId` zur Organisation gehören
- ❌ `createConsultation` - Prüft nicht ob `clientId` zur Organisation gehört

#### Problem 11: `/branches` Route - KEINE Authentifizierung ⚠️ SEHR KRITISCH
**Datei:** `backend/src/routes/branches.ts`

**Problem:** Route verwendet KEINE `authMiddleware` und KEINE `organizationMiddleware`
- Zeigt ALLE Branches im System ohne Authentifizierung!

## Detaillierter Implementierungsplan

### Phase 0: Routes um `organizationMiddleware` erweitern ⚠️ KRITISCH

**Dies muss ZUERST gemacht werden, damit alle anderen Filter funktionieren!**

#### Schritt 0.1: `/tasks` Route
**Datei:** `backend/src/routes/tasks.ts`

```typescript
import { organizationMiddleware } from '../middleware/organization';

router.use(authMiddleware);
router.use(organizationMiddleware); // HINZUFÜGEN
```

#### Schritt 0.2: `/requests` Route
**Datei:** `backend/src/routes/requests.ts`

```typescript
import { organizationMiddleware } from '../middleware/organization';

router.use(authMiddleware);
router.use(organizationMiddleware); // HINZUFÜGEN
```

#### Schritt 0.3: `/worktime` Route
**Datei:** `backend/src/routes/worktime.ts`

```typescript
import { organizationMiddleware } from '../middleware/organization';

router.use(authMiddleware);
router.use(organizationMiddleware); // HINZUFÜGEN
```

#### Schritt 0.4: `/roles` Route
**Datei:** `backend/src/routes/roles.ts`

```typescript
import { organizationMiddleware } from '../middleware/organization';

router.use(authMiddleware);
router.use(organizationMiddleware); // HINZUFÜGEN
```

#### Schritt 0.5: `/clients` Route
**Datei:** `backend/src/routes/clients.ts`

```typescript
import { organizationMiddleware } from '../middleware/organization';

router.use(authMiddleware);
router.use(organizationMiddleware); // HINZUFÜGEN
```

#### Schritt 0.6: `/branches` Route ⚠️ SEHR KRITISCH
**Datei:** `backend/src/routes/branches.ts`

```typescript
import { organizationMiddleware } from '../middleware/organization';

router.use(authMiddleware); // HINZUFÜGEN
router.use(organizationMiddleware); // HINZUFÜGEN
```

#### Schritt 0.7: `/consultations` Route
**Datei:** `backend/src/routes/consultations.ts`

```typescript
import { organizationMiddleware } from '../middleware/organization';

router.use(authMiddleware);
router.use(organizationMiddleware); // HINZUFÜGEN
```

#### Schritt 0.8: `/team-worktime` Route finden und anpassen
**Datei:** Route-Datei finden (evtl. `backend/src/routes/teamWorktime.ts` oder ähnlich)

```typescript
import { organizationMiddleware } from '../middleware/organization';

router.use(authMiddleware);
router.use(organizationMiddleware); // HINZUFÜGEN
```

### Phase 1: Backend Controller-Anpassungen

#### Schritt 1.1: `getAllUsersForDropdown` anpassen
**Datei:** `backend/src/controllers/userController.ts`

**Anpassung:**
```typescript
export const getAllUsersForDropdown = async (req: Request, res: Response) => {
    try {
        const userFilter = getUserOrganizationFilter(req);
        const users = await prisma.user.findMany({
            where: userFilter,
            select: { ... },
            orderBy: [...]
        });
        res.json(users);
    }
}
```

#### Schritt 1.2: `getRolePermissions` anpassen
**Datei:** `backend/src/controllers/roleController.ts`

**Anpassung:**
```typescript
export const getRolePermissions = async (req: Request<RoleParams>, res: Response) => {
    const roleId = parseInt(req.params.id, 10);
    
    const hasAccess = await belongsToOrganization(req as any, 'role', roleId);
    if (!hasAccess) {
        return res.status(403).json({ message: 'Zugriff auf diese Rolle verweigert' });
    }
    
    const permissions = await prisma.permission.findMany({
        where: { roleId: roleId }
    });
    res.json(permissions);
}
```

#### Schritt 1.3: `updateUserRoles` anpassen
**Datei:** `backend/src/controllers/userController.ts:490-530`

**Anpassung:**
```typescript
const roleFilter = getDataIsolationFilter(req as any, 'role');
const existingRoles = await prisma.role.findMany({
    where: {
        id: { in: roleIds },
        ...roleFilter
    }
});

if (existingRoles.length !== roleIds.length) {
    return res.status(400).json({ 
        message: 'Eine oder mehrere Rollen wurden nicht gefunden oder gehören nicht zu Ihrer Organisation' 
    });
}
```

#### Schritt 1.4: `teamWorktimeController.ts` komplett anpassen ⚠️ KRITISCH

**Alle Funktionen müssen `getDataIsolationFilter` verwenden:**

**1.4.1: `getActiveTeamWorktimes`**
```typescript
import { getDataIsolationFilter } from '../middleware/organization';

const worktimeFilter = getDataIsolationFilter(req as any, 'worktime');
const activeWorktimes = await prisma.workTime.findMany({
    where: {
        ...worktimeFilter,
        endTime: null
    },
    // ... rest
});
```

**1.4.2: `getUserWorktimesByDay`**
```typescript
const worktimeFilter = getDataIsolationFilter(req as any, 'worktime');
const worktimes = await prisma.workTime.findMany({
    where: {
        ...worktimeFilter,
        ...(userId ? { userId: Number(userId) } : {}),
        startTime: { gte: dayStart, lte: dayEnd }
    },
    // ... rest
});
```

**1.4.3: `stopUserWorktime`**
```typescript
const worktimeFilter = getDataIsolationFilter(req as any, 'worktime');
const activeWorktime = await prisma.workTime.findFirst({
    where: {
        ...worktimeFilter,
        userId: Number(userId),
        endTime: null
    },
    // ... rest
});
```

**1.4.4: `updateUserWorktime`**
```typescript
const worktimeFilter = getDataIsolationFilter(req as any, 'worktime');
const worktime = await prisma.workTime.findFirst({
    where: {
        ...worktimeFilter,
        id: Number(id)
    },
    // ... rest
});
```

**1.4.5: `updateApprovedOvertimeHours`**
```typescript
import { getUserOrganizationFilter } from '../middleware/organization';

const userFilter = getUserOrganizationFilter(req);
const user = await prisma.user.findFirst({
    where: {
        ...userFilter,
        id: Number(userId)
    }
});

if (!user) {
    return res.status(404).json({ message: 'Benutzer nicht gefunden oder gehört nicht zu Ihrer Organisation' });
}
```

#### Schritt 1.5: `worktimeController.ts` anpassen

**1.5.1: `getWorktimes`**
```typescript
import { getDataIsolationFilter } from '../middleware/organization';

const worktimeFilter = getDataIsolationFilter(req as any, 'worktime');
let whereClause: Prisma.WorkTimeWhereInput = {
    ...worktimeFilter
};

// Wenn date angegeben, zusätzlich filtern
if (date) {
    whereClause = {
        ...whereClause,
        startTime: {
            gte: compensatedStartOfDay,
            lte: compensatedEndOfDay
        }
    };
}
```

**1.5.2: `deleteWorktime`**
```typescript
import { getDataIsolationFilter } from '../middleware/organization';

const worktimeFilter = getDataIsolationFilter(req as any, 'worktime');
const worktime = await prisma.workTime.findFirst({
    where: {
        ...worktimeFilter,
        id: Number(id)
    }
});

if (!worktime) {
    return res.status(404).json({ message: 'Zeiterfassung nicht gefunden' });
}
```

**1.5.3: `updateWorktime`**
```typescript
import { getDataIsolationFilter } from '../middleware/organization';

const worktimeFilter = getDataIsolationFilter(req as any, 'worktime');
const worktime = await prisma.workTime.findFirst({
    where: {
        ...worktimeFilter,
        id: Number(id)
    }
});

if (!worktime) {
    return res.status(404).json({ message: 'Zeiterfassung nicht gefunden' });
}
```

#### Schritt 1.6: `taskController.ts` anpassen ⚠️ KRITISCH

**1.6.1: `updateTask`**
```typescript
// Ersetze Zeile 211-221
const isolationFilter = getDataIsolationFilter(req as any, 'task');
const currentTask = await prisma.task.findFirst({
    where: {
        id: taskId,
        ...isolationFilter
    },
    // ... rest
});

if (!currentTask) {
    return res.status(404).json({ error: 'Task nicht gefunden' });
}
```

**1.6.2: `deleteTask`**
```typescript
// Ersetze Zeile 400-414
const isolationFilter = getDataIsolationFilter(req as any, 'task');
const task = await prisma.task.findFirst({
    where: {
        id: taskId,
        ...isolationFilter
    },
    // ... rest
});

if (!task) {
    return res.status(404).json({ error: 'Task nicht gefunden' });
}
```

**1.6.3: `getTaskCarticles`**
```typescript
// Ersetze Zeile 470-495
const isolationFilter = getDataIsolationFilter(req as any, 'task');
const task = await prisma.task.findFirst({
    where: {
        id: taskId,
        ...isolationFilter
    },
    // ... rest
});

if (!task) {
    return res.status(404).json({ error: 'Task nicht gefunden' });
}
```

**1.6.4: `linkTaskToCarticle`**
```typescript
// Ersetze Zeile 529-532
const isolationFilter = getDataIsolationFilter(req as any, 'task');
const task = await prisma.task.findFirst({
    where: {
        id: taskId,
        ...isolationFilter
    }
});

if (!task) {
    return res.status(404).json({ error: 'Task nicht gefunden' });
}
```

#### Schritt 1.7: `requestController.ts` anpassen ⚠️ KRITISCH

**1.7.1: `updateRequest`**
```typescript
// Ersetze Zeile 257-274
const isolationFilter = getDataIsolationFilter(req as any, 'request');
const existingRequest = await prisma.request.findFirst({
    where: {
        id: parseInt(id),
        ...isolationFilter
    },
    // ... rest
});

if (!existingRequest) {
    return res.status(404).json({ message: 'Request nicht gefunden' });
}
```

**1.7.2: `deleteRequest`**
```typescript
// Ersetze Zeile 452-466
const isolationFilter = getDataIsolationFilter(req as any, 'request');
const request = await prisma.request.findFirst({
    where: {
        id: parseInt(id),
        ...isolationFilter
    },
    // ... rest
});

if (!request) {
    return res.status(404).json({ message: 'Request nicht gefunden' });
}
```

#### Schritt 1.8: Admin-Abfragen anpassen

**Siehe Original-Plan Schritt 1.5, 1.6, 1.7**

### Phase 2: Validierung bei Create/Update Operationen ⚠️ SEHR KRITISCH

#### Schritt 2.1: `createTask` validieren
**Datei:** `backend/src/controllers/taskController.ts`

```typescript
import { getUserOrganizationFilter } from '../middleware/organization';

// Vor Zeile 142 (task.create)
if (taskData.responsibleId) {
    const userFilter = getUserOrganizationFilter(req);
    const responsibleUser = await prisma.user.findFirst({
        where: {
            ...userFilter,
            id: taskData.responsibleId
        }
    });
    if (!responsibleUser) {
        return res.status(400).json({ error: 'Verantwortlicher Benutzer gehört nicht zu Ihrer Organisation' });
    }
}

if (taskData.qualityControlId) {
    const userFilter = getUserOrganizationFilter(req);
    const qualityControlUser = await prisma.user.findFirst({
        where: {
            ...userFilter,
            id: taskData.qualityControlId
        }
    });
    if (!qualityControlUser) {
        return res.status(400).json({ error: 'Qualitätskontrolle-Benutzer gehört nicht zu Ihrer Organisation' });
    }
}
```

#### Schritt 2.2: `updateTask` validieren
**Datei:** `backend/src/controllers/taskController.ts`

**Gleiche Validierung wie bei createTask für `updateData.responsibleId` und `updateData.qualityControlId`**

#### Schritt 2.3: `createRequest` validieren
**Datei:** `backend/src/controllers/requestController.ts`

```typescript
import { getUserOrganizationFilter } from '../middleware/organization';

// Vor Zeile 173 (request.create)
const userFilter = getUserOrganizationFilter(req);

const requesterUser = await prisma.user.findFirst({
    where: {
        ...userFilter,
        id: requesterId
    }
});
if (!requesterUser) {
    return res.status(400).json({ message: 'Antragsteller gehört nicht zu Ihrer Organisation' });
}

const responsibleUser = await prisma.user.findFirst({
    where: {
        ...userFilter,
        id: responsibleId
    }
});
if (!responsibleUser) {
    return res.status(400).json({ message: 'Verantwortlicher gehört nicht zu Ihrer Organisation' });
}
```

#### Schritt 2.4: `updateRequest` validieren
**Datei:** `backend/src/controllers/requestController.ts`

**Gleiche Validierung wie bei createRequest für `req.body.requested_by_id` und `req.body.responsible_id`**

#### Schritt 2.5: `createConsultation` validieren
**Datei:** `backend/src/controllers/consultationController.ts`

```typescript
import { getDataIsolationFilter } from '../middleware/organization';

// Vor Zeile 35 (workTime.create)
if (clientId) {
    const clientFilter = getDataIsolationFilter(req as any, 'client');
    const client = await prisma.client.findFirst({
        where: {
            ...clientFilter,
            id: Number(clientId)
        }
    });
    if (!client) {
        return res.status(400).json({ message: 'Client gehört nicht zu Ihrer Organisation' });
    }
}
```

## Zusammenfassung der Änderungen

### Backend-Routes zu ändern (Phase 0 - ZUERST!):

1. ✅ `backend/src/routes/tasks.ts` - `organizationMiddleware` hinzufügen
2. ✅ `backend/src/routes/requests.ts` - `organizationMiddleware` hinzufügen
3. ✅ `backend/src/routes/worktime.ts` - `organizationMiddleware` hinzufügen
4. ✅ `backend/src/routes/roles.ts` - `organizationMiddleware` hinzufügen
5. ✅ `backend/src/routes/clients.ts` - `organizationMiddleware` hinzufügen
6. ✅ `backend/src/routes/branches.ts` - `authMiddleware` UND `organizationMiddleware` hinzufügen
7. ✅ `backend/src/routes/consultations.ts` - `organizationMiddleware` hinzufügen
8. ✅ `backend/src/routes/team-worktime.ts` (oder ähnlich) - `organizationMiddleware` hinzufügen

### Backend-Controller zu ändern:

1. ✅ `backend/src/controllers/userController.ts`
   - `getAllUsersForDropdown` - Filter hinzufügen
   - `updateUserRoles` - Rollen-Organisation-Validierung
   - Admin-Abfragen (4 Stellen) - Filter hinzufügen

2. ✅ `backend/src/controllers/roleController.ts`
   - `getRolePermissions` - Organisation-Validierung hinzufügen
   - Admin-Abfragen (3 Stellen) - Filter hinzufügen
   - `usersWithRole` Abfragen (2 Stellen) - Filter hinzufügen

3. ✅ `backend/src/controllers/teamWorktimeController.ts`
   - **ALLE** Funktionen (5) - Organisation-Filterung hinzufügen

4. ✅ `backend/src/controllers/worktimeController.ts`
   - `getWorktimes` - Filter hinzufügen
   - `deleteWorktime` - Filter hinzufügen
   - `updateWorktime` - Filter hinzufügen

5. ✅ `backend/src/controllers/taskController.ts`
   - `updateTask` - Filter hinzufügen
   - `deleteTask` - Filter hinzufügen
   - `getTaskCarticles` - Filter hinzufügen
   - `linkTaskToCarticle` - Filter hinzufügen
   - `createTask` - User-Validierung hinzufügen
   - `updateTask` - User-Validierung hinzufügen

6. ✅ `backend/src/controllers/requestController.ts`
   - `updateRequest` - Filter hinzufügen
   - `deleteRequest` - Filter hinzufügen
   - `createRequest` - User-Validierung hinzufügen
   - `updateRequest` - User-Validierung hinzufügen

7. ✅ `backend/src/controllers/consultationController.ts`
   - `createConsultation` - Client-Validierung hinzufügen

8. ✅ `backend/src/controllers/notificationController.ts`
   - Org-Admin-Abfrage - Filter hinzufügen

## Prioritäten

### 🔴 KRITISCH (sofort, muss ZUERST gemacht werden):
1. **Phase 0: Routes um `organizationMiddleware` erweitern** - OHNE DIESES FUNKTIONIERT NICHTS!
   - Alle 8 Routes müssen angepasst werden
   - Besonders kritisch: `/branches` Route braucht auch `authMiddleware`!

### 🟡 KRITISCH (nach Phase 0):
2. `getAllUsersForDropdown` - Filter hinzufügen
3. `teamWorktimeController.ts` - Komplette Anpassung
4. `worktimeController.ts` - Teilweise Anpassung
5. `taskController.ts` - Update/Delete/Validierung
6. `requestController.ts` - Update/Delete/Validierung

### 🟢 WICHTIG (nach kritischen):
7. `updateUserRoles` - Rollen-Organisation-Validierung
8. `getRolePermissions` - Organisation-Validierung
9. Admin-Abfragen - Filter hinzufügen (Sicherheit)

### 🟢 OPTIONAL (später):
10. Erweiterte Validierungen bei Create/Update
11. Unit-Tests

## Risiken

1. **Breaking Changes:** Nach Hinzufügen von `organizationMiddleware` könnte Frontend brechen wenn keine Organisation vorhanden
   - **Lösung:** `organizationMiddleware` behandelt bereits Standalone-User korrekt

2. **Performance:** Zusätzliche Filter könnten Queries langsamer machen
   - **Lösung:** Indizes auf `organizationId` prüfen

3. **Bestehende Daten:** Wenn bereits Daten ohne Organisation existieren
   - **Lösung:** `getDataIsolationFilter` behandelt Standalone-User korrekt

## Nächste Schritte

1. ✅ **Plan erstellt** (HIER - AKTUALISIERT)
2. ⏳ **Plan bestätigen lassen**
3. ⏳ **Phase 0 umsetzen** (Routes - KRITISCH!)
4. ⏳ **Phase 1 umsetzen** (Controller-Anpassungen)
5. ⏳ **Phase 2 umsetzen** (Validierungen)
6. ⏳ **Testing**
