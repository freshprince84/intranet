# Detaillierter Plan: Dashboard-Berechtigungen

## Status: VORBEREITUNG - NICHTS UMSETZEN

**Datum:** 2024
**Ziel:** Dashboard-Seite Berechtigungen implementieren - Dashboard & WorktimeStats immer sichtbar, Requests mit granularer Berechtigungslogik

---

## 1. AKTUELLER STAND - FAKTEN

### 1.1 Dashboard-Seite Struktur

**Datei:** `frontend/src/pages/Dashboard.tsx` (75 Zeilen)

**Layout:**
```
Dashboard
├── WorktimeStats (Zeile 55-57) - KEINE Berechtigungsprüfung
└── Requests Box (Zeile 61-63) - Berechtigungsprüfung vorhanden
└── AppDownload Box (Zeile 66-68) - KEINE Berechtigungsprüfung
```

**Berechtigungen aktuell:**
- Dashboard-Seite: Prüfung in Sidebar (`hasPermission('dashboard', 'read', 'page')`)
- WorktimeStats: KEINE Prüfung
- Requests: Prüfungen vorhanden (`hasPermission('requests', 'write', 'table')`, etc.)
- AppDownload: KEINE Prüfung

### 1.2 Requests-Komponente - Aktueller Stand

**Datei:** `frontend/src/components/Requests.tsx` (1767 Zeilen)

**Aktuelle Berechtigungsprüfungen:**
- Zeile 219: `const { hasPermission } = usePermissions();`
- Zeile 984: Create-Button - `hasPermission('requests', 'write', 'table')`
- Zeile 1375: Approve-Button - `hasPermission('requests', 'write', 'table')`
- Zeile 1412: To Improve-Button - `hasPermission('requests', 'write', 'table')`
- Zeile 1438: Deny-Button - `hasPermission('requests', 'write', 'table')`
- Zeile 1452: Edit-Button - `hasPermission('requests', 'write', 'table')`
- Zeile 1463: Delete-Button - `hasPermission('requests', 'both', 'table')`
- Zeile 1585, 1631, 1663, 1679: Status-Buttons in Cards - `hasPermission('requests', 'write', 'table')`
- Zeile 1696: Delete in Cards - `hasPermission('requests', 'both', 'table')`

**Backend-Filterlogik:**
- Datei: `backend/src/controllers/requestController.ts`
- Zeile 60-149: `getAllRequests`
- Aktuell: Filtert nach `isolationFilter` (Standalone vs. Organisation)
- Aktuell: Filtert nach `isPrivate` (private/öffentlich)
- Aktuell: Zeigt alle öffentlichen Requests der Organisation
- Aktuell: Zeigt private Requests nur wenn User requesterId ODER responsibleId ist

**Branch-Informationen:**
- Datei: `backend/src/middleware/organization.ts`
- Zeile 54-67: `req.branchId` wird aus `usersBranches` (lastUsed = true) gesetzt
- User kann mehrere Branches haben
- Aktive Branch wird in `req.branchId` gesetzt

### 1.3 Neue Berechtigungslogik für Requests

**Anforderungen:**
1. **Nur eigene Requests sehen:**
   - User-Rolle: Nur Requests wo `requestedBy.id = userId` ODER `responsible.id = userId`
   - Entity: `requests_own`
   - EntityType: `table`
   - AccessLevel: `read` (nur sehen) oder `write` (sehen + Buttons)

2. **Alle Requests im Branch sehen:**
   - Branch-Level: Alle Requests wo `request.branch.id = req.branchId`
   - Entity: `requests_branch`
   - EntityType: `table`
   - AccessLevel: `read` (nur sehen) oder `write` (sehen + Buttons)

3. **Alle Requests der Organisation sehen:**
   - Admin-Rolle: Alle Requests der Organisation
   - Entity: `requests_organization`
   - EntityType: `table`
   - AccessLevel: `read` (nur sehen) oder `write` (sehen + Buttons)

4. **Button-Sichtbarkeit:**
   - Read-only: Nur sehen, keine Buttons (Status-Shift, Bearbeiten, Create)
   - Write: Buttons sichtbar, aber NUR für eigene Requests (requestedBy ODER responsible = userId)
   - Buttons für nicht-eigene Requests: IMMER ausgeblendet (auch bei write-Berechtigung)

---

## 2. ZU IMPLEMENTIERENDE ÄNDERUNGEN

### 2.1 Dashboard-Seite: Berechtigungsprüfungen entfernen

**Datei:** `frontend/src/pages/Dashboard.tsx`

**Änderung 1: Dashboard-Seite selbst**
- Status: ✅ Keine Änderung erforderlich
- Dashboard-Seite hat keine eigene Berechtigungsprüfung
- Prüfung erfolgt nur in Sidebar (bleibt bestehen, aber Dashboard ist in `alwaysVisiblePages`)

**Änderung 2: WorktimeStats**
- Status: ✅ Keine Änderung erforderlich
- WorktimeStats hat keine Berechtigungsprüfung
- Soll immer sichtbar sein (keine Änderung nötig)

**Änderung 3: AppDownload**
- Status: ✅ Keine Änderung erforderlich
- AppDownload hat keine Berechtigungsprüfung
- Soll immer sichtbar sein (keine Änderung nötig)

**Änderung 4: Requests Box**
- Status: ✅ Keine Änderung an Dashboard.tsx erforderlich
- Requests-Komponente wird weiterhin gerendert
- Berechtigungslogik wird in Requests-Komponente selbst implementiert

### 2.2 Neue Berechtigungen definieren

**Datei:** `frontend/src/components/RoleManagementTab.tsx`

**Änderung 1: Neue Request-Berechtigungen zu defaultTables hinzufügen**
- Zeile: 41-58
- Aktuell: `'requests'` in defaultTables
- Neu: `'requests'` ENTFERNEN, stattdessen hinzufügen:
  - `'requests_own'`
  - `'requests_branch'`
  - `'requests_organization'`

**Datei:** `backend/prisma/seed.ts`

**Änderung 1: ALL_TABLES Array aktualisieren**
- Zeile: 33-50
- Aktuell: `'requests'` in ALL_TABLES
- Neu: `'requests'` ENTFERNEN, stattdessen hinzufügen:
  - `'requests_own'`
  - `'requests_branch'`
  - `'requests_organization'`

**Änderung 2: Standardberechtigungssets aktualisieren**

**Admin (ID 1):**
- `table_requests_organization` = `'both'` (alle Requests der Organisation sehen + bearbeiten)

**User (ID 2):**
- `table_requests_own` = `'both'` (nur eigene Requests sehen + bearbeiten)
- `table_requests_branch` = `'none'` (keine Branch-Level Berechtigung)
- `table_requests_organization` = `'none'` (keine Organisation-Level Berechtigung)

**Hamburger (ID 999):**
- `table_requests_own` = `'read'` (nur eigene Requests sehen, keine Buttons)
- `table_requests_branch` = `'none'`
- `table_requests_organization` = `'none'`

### 2.3 Backend: Request-Filterlogik anpassen

**Datei:** `backend/src/controllers/requestController.ts`

**Änderung 1: getAllRequests - Filterlogik basierend auf Berechtigungen**
- Zeile: 60-149
- Aktuell: Filtert nach `isolationFilter` und `isPrivate`
- Neu: Filterlogik erweitern:
  1. Prüfe Berechtigungen des Users:
     - `requests_organization` (read/write/both) → Zeige alle Requests der Organisation
     - `requests_branch` (read/write/both) → Zeige alle Requests des Branches
     - `requests_own` (read/write/both) → Zeige nur eigene Requests
  2. Kombiniere Filter logisch (OR):
     - Wenn `requests_organization`: Alle Requests der Organisation
     - Wenn `requests_branch`: Alle Requests des Branches (req.branchId)
     - Wenn `requests_own`: Nur eigene Requests (requesterId = userId OR responsibleId = userId)
  3. Priorität: `organization` > `branch` > `own`
  4. Wenn mehrere Berechtigungen vorhanden: Union (OR) der Filter

**Code-Struktur:**
```typescript
// Hole Berechtigungen des Users
const roleId = parseInt(req.roleId as string, 10);
const role = await prisma.role.findUnique({
  where: { id: roleId },
  include: { permissions: true }
});

// Prüfe welche Request-Berechtigungen vorhanden sind
const hasOrgPermission = role.permissions.some(p => 
  p.entity === 'requests_organization' && 
  p.entityType === 'table' && 
  ['read', 'write', 'both'].includes(p.accessLevel)
);
const hasBranchPermission = role.permissions.some(p => 
  p.entity === 'requests_branch' && 
  p.entityType === 'table' && 
  ['read', 'write', 'both'].includes(p.accessLevel)
);
const hasOwnPermission = role.permissions.some(p => 
  p.entity === 'requests_own' && 
  p.entityType === 'table' && 
  ['read', 'write', 'both'].includes(p.accessLevel)
);

// Baue Filter basierend auf Berechtigungen
const permissionFilters: Prisma.RequestWhereInput[] = [];

if (hasOrgPermission && organizationId) {
  permissionFilters.push({ organizationId });
}

if (hasBranchPermission && req.branchId) {
  permissionFilters.push({ branchId: req.branchId });
}

if (hasOwnPermission) {
  permissionFilters.push({
    OR: [
      { requesterId: userId },
      { responsibleId: userId }
    ]
  });
}

// Kombiniere mit isolationFilter und isPrivate-Logik
const whereClause: Prisma.RequestWhereInput = {
  AND: [
    isolationFilter,
    {
      OR: [
        ...permissionFilters,
        // Private Requests: Nur wenn User requesterId ODER responsibleId ist
        {
          isPrivate: true,
          OR: [
            { requesterId: userId },
            { responsibleId: userId }
          ]
        }
      ]
    }
  ]
};
```

**Änderung 2: getRequestById - Filterlogik anpassen**
- Zeile: 152-220
- Gleiche Logik wie getAllRequests anwenden

**Änderung 3: updateRequest - Berechtigungsprüfung hinzufügen**
- Zeile: 222-350
- Prüfe ob User write-Berechtigung hat
- Prüfe ob Request zu User gehört (requesterId ODER responsibleId = userId)
- Nur wenn beides zutrifft: Update erlauben

**Änderung 4: deleteRequest - Berechtigungsprüfung hinzufügen**
- Zeile: 352-400
- Prüfe ob User both-Berechtigung hat
- Prüfe ob Request zu User gehört (requesterId ODER responsibleId = userId)
- Nur wenn beides zutrifft: Delete erlauben

**Änderung 5: createRequest - Berechtigungsprüfung hinzufügen**
- Zeile: 402-500
- Prüfe ob User write-Berechtigung hat (requests_own, requests_branch, oder requests_organization)
- Erstelle Request (keine weitere Prüfung nötig, da User Request erstellt)

### 2.4 Frontend: Requests-Komponente anpassen

**Datei:** `frontend/src/components/Requests.tsx`

**Änderung 1: Neue Berechtigungsprüfungen implementieren**
- Zeile: 219
- Aktuell: `const { hasPermission } = usePermissions();`
- Neu: Helper-Funktionen hinzufügen:
```typescript
// Prüfe welche Request-Berechtigungen vorhanden sind
const hasRequestsOwnRead = hasPermission('requests_own', 'read', 'table');
const hasRequestsOwnWrite = hasPermission('requests_own', 'write', 'table');
const hasRequestsBranchRead = hasPermission('requests_branch', 'read', 'table');
const hasRequestsBranchWrite = hasPermission('requests_branch', 'write', 'table');
const hasRequestsOrgRead = hasPermission('requests_organization', 'read', 'table');
const hasRequestsOrgWrite = hasPermission('requests_organization', 'write', 'table');

// Kombinierte Prüfungen
const canViewRequests = hasRequestsOwnRead || hasRequestsBranchRead || hasRequestsOrgRead;
const canWriteRequests = hasRequestsOwnWrite || hasRequestsBranchWrite || hasRequestsOrgWrite;

// Prüfe ob Request "eigen" ist (requestedBy ODER responsible = userId)
const isOwnRequest = (request: Request): boolean => {
  return request.requestedBy.id === user?.id || request.responsible.id === user?.id;
};
```

**Änderung 2: Create-Button Berechtigungsprüfung**
- Zeile: 984
- Aktuell: `hasPermission('requests', 'write', 'table')`
- Neu: `canWriteRequests` (kombinierte Prüfung)

**Änderung 3: Status-Buttons Berechtigungsprüfung**
- Zeile: 1375, 1412, 1438, 1585, 1631, 1663, 1679
- Aktuell: `hasPermission('requests', 'write', 'table')`
- Neu: `canWriteRequests && isOwnRequest(request)` (nur für eigene Requests)

**Änderung 4: Edit-Button Berechtigungsprüfung**
- Zeile: 1452, 1679
- Aktuell: `hasPermission('requests', 'write', 'table')`
- Neu: `canWriteRequests && isOwnRequest(request)` (nur für eigene Requests)

**Änderung 5: Delete-Button Berechtigungsprüfung**
- Zeile: 1463, 1696
- Aktuell: `hasPermission('requests', 'both', 'table')`
- Neu: `canWriteRequests && isOwnRequest(request)` (nur für eigene Requests, both nicht mehr nötig)

**Änderung 6: Requests-Box Sichtbarkeit**
- Zeile: 61-63 (in Dashboard.tsx)
- Status: ✅ Keine Änderung erforderlich
- Requests-Box wird immer gerendert
- Wenn keine Berechtigung: Leere Liste (Backend filtert bereits)

### 2.5 usePermissions Hook: Helper-Funktionen hinzufügen

**Datei:** `frontend/src/hooks/usePermissions.ts`

**Änderung 1: Request-Berechtigungs-Helper hinzufügen**
- Nach Zeile: 366 (vor return)
- Neu: Helper-Funktionen für Requests:
```typescript
// Request-Berechtigungen
const canViewRequestsOwn = (): boolean => {
  return hasPermission('requests_own', 'read', 'table') || 
         hasPermission('requests_own', 'write', 'table') || 
         hasPermission('requests_own', 'both', 'table');
};

const canWriteRequestsOwn = (): boolean => {
  return hasPermission('requests_own', 'write', 'table') || 
         hasPermission('requests_own', 'both', 'table');
};

const canViewRequestsBranch = (): boolean => {
  return hasPermission('requests_branch', 'read', 'table') || 
         hasPermission('requests_branch', 'write', 'table') || 
         hasPermission('requests_branch', 'both', 'table');
};

const canWriteRequestsBranch = (): boolean => {
  return hasPermission('requests_branch', 'write', 'table') || 
         hasPermission('requests_branch', 'both', 'table');
};

const canViewRequestsOrganization = (): boolean => {
  return hasPermission('requests_organization', 'read', 'table') || 
         hasPermission('requests_organization', 'write', 'table') || 
         hasPermission('requests_organization', 'both', 'table');
};

const canWriteRequestsOrganization = (): boolean => {
  return hasPermission('requests_organization', 'write', 'table') || 
         hasPermission('requests_organization', 'both', 'table');
};

// Kombinierte Prüfungen
const canViewAnyRequests = (): boolean => {
  return canViewRequestsOwn() || canViewRequestsBranch() || canViewRequestsOrganization();
};

const canWriteAnyRequests = (): boolean => {
  return canWriteRequestsOwn() || canWriteRequestsBranch() || canWriteRequestsOrganization();
};
```

**Änderung 2: Return-Statement erweitern**
- Zeile: 343-366
- Neu: Helper-Funktionen zu return hinzufügen:
```typescript
return {
  // ... bestehende returns ...
  // Request-Berechtigungen
  canViewRequestsOwn,
  canWriteRequestsOwn,
  canViewRequestsBranch,
  canWriteRequestsBranch,
  canViewRequestsOrganization,
  canWriteRequestsOrganization,
  canViewAnyRequests,
  canWriteAnyRequests
};
```

---

## 3. DETAILLIERTE IMPLEMENTIERUNGSSCHRITTE

### Schritt 1: Seed-Datei aktualisieren

**Datei:** `backend/prisma/seed.ts`

**1.1 ALL_TABLES Array aktualisieren**
- Zeile: 33-50
- Änderung: `'requests'` → `'requests_own'`, `'requests_branch'`, `'requests_organization'`
- Code:
```typescript
const ALL_TABLES = [
  'requests_own',           // NEU: Nur eigene Requests
  'requests_branch',        // NEU: Alle Requests im Branch
  'requests_organization', // NEU: Alle Requests der Organisation
  'tasks',
  'reservations',
  // ... rest bleibt gleich
];
```

**1.2 Admin-Berechtigungen aktualisieren**
- Zeile: 300-314
- Änderung: `table_requests` entfernen, stattdessen:
```typescript
adminPermissionMap['table_requests_organization'] = 'both';
adminPermissionMap['table_requests_branch'] = 'both';
adminPermissionMap['table_requests_own'] = 'both';
```

**1.3 User-Berechtigungen aktualisieren**
- Zeile: 316-367
- Änderung: `table_requests` entfernen, stattdessen:
```typescript
userPermissionMap['table_requests_own'] = 'both';
// requests_branch und requests_organization bleiben 'none' (Standard)
```

**1.4 Hamburger-Berechtigungen aktualisieren**
- Zeile: 369-390
- Änderung: Neue Berechtigung hinzufügen:
```typescript
hamburgerPermissionMap['table_requests_own'] = 'read';
// requests_branch und requests_organization bleiben 'none' (Standard)
```

### Schritt 2: RoleManagementTab aktualisieren

**Datei:** `frontend/src/components/RoleManagementTab.tsx`

**2.1 defaultTables Array aktualisieren**
- Zeile: 41-58
- Änderung: `'requests'` → `'requests_own'`, `'requests_branch'`, `'requests_organization'`
- Code:
```typescript
const defaultTables = [
  'requests_own',           // NEU
  'requests_branch',        // NEU
  'requests_organization',  // NEU
  'tasks',
  // ... rest bleibt gleich
];
```

**2.2 tableDisplayNames aktualisieren**
- Zeile: 410-427
- Änderung: Neue Display-Namen hinzufügen:
```typescript
const tableDisplayNames = useMemo(() => ({
  'requests_own': t('roles.tables.requests_own'),
  'requests_branch': t('roles.tables.requests_branch'),
  'requests_organization': t('roles.tables.requests_organization'),
  // ... rest bleibt gleich
}), [t]);
```

**2.3 Übersetzungen hinzufügen**
- Datei: `frontend/src/i18n/locales/de.json`
- Zeile: ~688-705 (in roles.tables)
- Neu: Übersetzungen hinzufügen:
```json
"requests_own": "Eigene Requests",
"requests_branch": "Branch Requests",
"requests_organization": "Organisation Requests"
```

### Schritt 3: Backend Request-Controller anpassen

**Datei:** `backend/src/controllers/requestController.ts`

**3.1 Helper-Funktion für Berechtigungsprüfung**
- Nach Zeile: 58 (vor getAllRequests)
- Neu: Funktion hinzufügen:
```typescript
// Helper-Funktion: Prüfe Request-Berechtigungen eines Users
async function getRequestPermissions(roleId: number): Promise<{
  hasOrg: boolean;
  hasBranch: boolean;
  hasOwn: boolean;
  orgLevel: 'read' | 'write' | 'both' | 'none';
  branchLevel: 'read' | 'write' | 'both' | 'none';
  ownLevel: 'read' | 'write' | 'both' | 'none';
}> {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: true }
  });

  if (!role) {
    return {
      hasOrg: false,
      hasBranch: false,
      hasOwn: false,
      orgLevel: 'none',
      branchLevel: 'none',
      ownLevel: 'none'
    };
  }

  const orgPerm = role.permissions.find(p => 
    p.entity === 'requests_organization' && p.entityType === 'table'
  );
  const branchPerm = role.permissions.find(p => 
    p.entity === 'requests_branch' && p.entityType === 'table'
  );
  const ownPerm = role.permissions.find(p => 
    p.entity === 'requests_own' && p.entityType === 'table'
  );

  return {
    hasOrg: !!orgPerm && ['read', 'write', 'both'].includes(orgPerm.accessLevel),
    hasBranch: !!branchPerm && ['read', 'write', 'both'].includes(branchPerm.accessLevel),
    hasOwn: !!ownPerm && ['read', 'write', 'both'].includes(ownPerm.accessLevel),
    orgLevel: (orgPerm?.accessLevel as any) || 'none',
    branchLevel: (branchPerm?.accessLevel as any) || 'none',
    ownLevel: (ownPerm?.accessLevel as any) || 'none'
  };
}
```

**3.2 getAllRequests Filterlogik anpassen**
- Zeile: 60-149
- Änderung: Filterlogik komplett ersetzen:
```typescript
export const getAllRequests = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.userId as string, 10);
        const roleId = parseInt(req.roleId as string, 10);
        const organizationId = (req as any).organizationId;
        const branchId = (req as any).branchId;
        
        // Basis-Filter: Datenisolation (Standalone vs. Organisation)
        const isolationFilter = getDataIsolationFilter(req as any, 'request');
        
        // Hole Berechtigungen
        const permissions = await getRequestPermissions(roleId);
        
        // Baue Filter basierend auf Berechtigungen
        const permissionFilters: Prisma.RequestWhereInput[] = [];
        
        // Organisation-Level: Alle Requests der Organisation
        if (permissions.hasOrg && organizationId) {
            permissionFilters.push({ organizationId });
        }
        
        // Branch-Level: Alle Requests des Branches
        if (permissions.hasBranch && branchId) {
            permissionFilters.push({ branchId });
        }
        
        // Own-Level: Nur eigene Requests
        if (permissions.hasOwn) {
            permissionFilters.push({
                OR: [
                    { requesterId: userId },
                    { responsibleId: userId }
                ]
            });
        }
        
        // Wenn keine Berechtigung: Leere Liste zurückgeben
        if (permissionFilters.length === 0) {
            return res.json([]);
        }
        
        // Kombiniere mit isolationFilter und isPrivate-Logik
        const whereClause: Prisma.RequestWhereInput = {
            AND: [
                isolationFilter,
                {
                    OR: [
                        // Öffentliche Requests (isPrivate = false) mit Berechtigungen
                        {
                            isPrivate: false,
                            OR: permissionFilters
                        },
                        // Private Requests: Nur wenn User requesterId ODER responsibleId ist
                        {
                            isPrivate: true,
                            OR: [
                                { requesterId: userId },
                                { responsibleId: userId }
                            ]
                        }
                    ]
                }
            ]
        };
        
        // ... rest bleibt gleich (findMany, format, return)
    } catch (error) {
        // ... error handling
    }
};
```

**3.3 updateRequest Berechtigungsprüfung**
- Zeile: 222-350
- Änderung: Prüfung hinzufügen:
```typescript
// Prüfe Berechtigungen
const permissions = await getRequestPermissions(roleId);
const canWrite = permissions.hasOrg || permissions.hasBranch || permissions.hasOwn;

if (!canWrite) {
    return res.status(403).json({ message: 'Keine Berechtigung zum Bearbeiten von Requests' });
}

// Prüfe ob Request "eigen" ist
const existingRequest = await prisma.request.findUnique({
    where: { id: parseInt(id) },
    select: { requesterId: true, responsibleId: true }
});

if (!existingRequest) {
    return res.status(404).json({ message: 'Request nicht gefunden' });
}

const isOwn = existingRequest.requesterId === userId || existingRequest.responsibleId === userId;

if (!isOwn) {
    return res.status(403).json({ message: 'Nur eigene Requests können bearbeitet werden' });
}

// ... rest bleibt gleich
```

**3.4 deleteRequest Berechtigungsprüfung**
- Zeile: 352-400
- Änderung: Gleiche Logik wie updateRequest

**3.5 createRequest Berechtigungsprüfung**
- Zeile: 402-500
- Änderung: Prüfung hinzufügen:
```typescript
// Prüfe Berechtigungen
const permissions = await getRequestPermissions(roleId);
const canWrite = permissions.hasOrg || permissions.hasBranch || permissions.hasOwn;

if (!canWrite) {
    return res.status(403).json({ message: 'Keine Berechtigung zum Erstellen von Requests' });
}

// ... rest bleibt gleich
```

### Schritt 4: Frontend Requests-Komponente anpassen

**Datei:** `frontend/src/components/Requests.tsx`

**4.1 Helper-Funktionen hinzufügen**
- Nach Zeile: 219
- Neu: Helper-Funktionen:
```typescript
// Prüfe welche Request-Berechtigungen vorhanden sind
const hasRequestsOwnRead = hasPermission('requests_own', 'read', 'table');
const hasRequestsOwnWrite = hasPermission('requests_own', 'write', 'table');
const hasRequestsBranchRead = hasPermission('requests_branch', 'read', 'table');
const hasRequestsBranchWrite = hasPermission('requests_branch', 'write', 'table');
const hasRequestsOrgRead = hasPermission('requests_organization', 'read', 'table');
const hasRequestsOrgWrite = hasPermission('requests_organization', 'write', 'table');

// Kombinierte Prüfungen
const canViewRequests = hasRequestsOwnRead || hasRequestsBranchRead || hasRequestsOrgRead;
const canWriteRequests = hasRequestsOwnWrite || hasRequestsBranchWrite || hasRequestsOrgWrite;

// Prüfe ob Request "eigen" ist
const isOwnRequest = useCallback((request: Request): boolean => {
  if (!user) return false;
  return request.requestedBy.id === user.id || request.responsible.id === user.id;
}, [user]);
```

**4.2 Create-Button anpassen**
- Zeile: 984
- Änderung: `hasPermission('requests', 'write', 'table')` → `canWriteRequests`

**4.3 Status-Buttons anpassen**
- Zeile: 1375, 1412, 1438
- Änderung: `hasPermission('requests', 'write', 'table')` → `canWriteRequests && isOwnRequest(request)`

**4.4 Edit-Button anpassen**
- Zeile: 1452
- Änderung: `hasPermission('requests', 'write', 'table')` → `canWriteRequests && isOwnRequest(request)`

**4.5 Delete-Button anpassen**
- Zeile: 1463
- Änderung: `hasPermission('requests', 'both', 'table')` → `canWriteRequests && isOwnRequest(request)`

**4.6 Card-Ansicht Buttons anpassen**
- Zeile: 1585, 1631, 1663, 1679, 1696
- Änderung: Gleiche Logik wie Tabellen-Ansicht

### Schritt 5: usePermissions Hook erweitern

**Datei:** `frontend/src/hooks/usePermissions.ts`

**5.1 Helper-Funktionen hinzufügen**
- Nach Zeile: 225 (nach canViewInvitations)
- Neu: Request-Helper-Funktionen (siehe 2.5)

**5.2 Return-Statement erweitern**
- Zeile: 343-366
- Neu: Helper-Funktionen zu return hinzufügen

### Schritt 6: Übersetzungen hinzufügen

**Datei:** `frontend/src/i18n/locales/de.json`

**6.1 roles.tables erweitern**
- Zeile: ~688-705
- Neu: Übersetzungen hinzufügen:
```json
"requests_own": "Eigene Requests",
"requests_branch": "Branch Requests",
"requests_organization": "Organisation Requests"
```

**Datei:** `frontend/src/i18n/locales/en.json`

**6.2 roles.tables erweitern**
- Gleiche Struktur wie de.json
- Übersetzungen:
```json
"requests_own": "Own Requests",
"requests_branch": "Branch Requests",
"requests_organization": "Organization Requests"
```

**Datei:** `frontend/src/i18n/locales/es.json`

**6.3 roles.tables erweitern**
- Gleiche Struktur
- Übersetzungen:
```json
"requests_own": "Solicitudes Propias",
"requests_branch": "Solicitudes de Sucursal",
"requests_organization": "Solicitudes de Organización"
```

---

## 4. TEST-PLAN

### 4.1 Dashboard-Sichtbarkeit

**Test 1: Dashboard-Seite**
- Voraussetzung: Alle Standardrollen
- Erwartung: Dashboard immer sichtbar (in Sidebar)

**Test 2: WorktimeStats**
- Voraussetzung: Alle Standardrollen
- Erwartung: WorktimeStats immer sichtbar auf Dashboard

**Test 3: AppDownload**
- Voraussetzung: Alle Standardrollen
- Erwartung: AppDownload immer sichtbar auf Dashboard

### 4.2 Requests-Berechtigungen

**Test 1: User-Rolle - requests_own (both)**
- Voraussetzung: User mit `requests_own` (table, both)
- Erwartung: 
  - Nur eigene Requests sichtbar (requestedBy ODER responsible = userId)
  - Create-Button sichtbar
  - Status-Buttons sichtbar NUR für eigene Requests
  - Edit-Button sichtbar NUR für eigene Requests
  - Delete-Button sichtbar NUR für eigene Requests

**Test 2: User-Rolle - requests_own (read)**
- Voraussetzung: User mit `requests_own` (table, read)
- Erwartung:
  - Nur eigene Requests sichtbar
  - Create-Button NICHT sichtbar
  - Status-Buttons NICHT sichtbar
  - Edit-Button NICHT sichtbar
  - Delete-Button NICHT sichtbar

**Test 3: Admin-Rolle - requests_organization (both)**
- Voraussetzung: Admin mit `requests_organization` (table, both)
- Erwartung:
  - Alle Requests der Organisation sichtbar
  - Create-Button sichtbar
  - Status-Buttons sichtbar NUR für eigene Requests
  - Edit-Button sichtbar NUR für eigene Requests
  - Delete-Button sichtbar NUR für eigene Requests

**Test 4: Branch-Manager - requests_branch (both)**
- Voraussetzung: User mit `requests_branch` (table, both) und branchId gesetzt
- Erwartung:
  - Alle Requests des Branches sichtbar
  - Create-Button sichtbar
  - Status-Buttons sichtbar NUR für eigene Requests
  - Edit-Button sichtbar NUR für eigene Requests
  - Delete-Button sichtbar NUR für eigene Requests

**Test 5: Hamburger-Rolle - requests_own (read)**
- Voraussetzung: Hamburger mit `requests_own` (table, read)
- Erwartung:
  - Nur eigene Requests sichtbar
  - Create-Button NICHT sichtbar
  - Status-Buttons NICHT sichtbar
  - Edit-Button NICHT sichtbar
  - Delete-Button NICHT sichtbar

**Test 6: Keine Request-Berechtigung**
- Voraussetzung: User ohne Request-Berechtigungen
- Erwartung:
  - Requests-Box leer (Backend gibt leere Liste zurück)
  - Create-Button NICHT sichtbar

### 4.3 Button-Sichtbarkeit für nicht-eigene Requests

**Test 1: Admin sieht fremden Request**
- Voraussetzung: Admin mit `requests_organization` (both), Request von anderem User
- Erwartung:
  - Request sichtbar
  - Status-Buttons NICHT sichtbar (nicht eigen)
  - Edit-Button NICHT sichtbar (nicht eigen)
  - Delete-Button NICHT sichtbar (nicht eigen)

**Test 2: Admin sieht eigenen Request**
- Voraussetzung: Admin mit `requests_organization` (both), Request von Admin selbst
- Erwartung:
  - Request sichtbar
  - Status-Buttons sichtbar (eigen)
  - Edit-Button sichtbar (eigen)
  - Delete-Button sichtbar (eigen)

---

## 5. RISIKEN UND ABHÄNGIGKEITEN

### 5.1 Risiken

**Risiko 1: Keine Berechtigung vorhanden**
- Problem: Wenn User keine Request-Berechtigung hat, wird leere Liste angezeigt
- Lösung: Backend gibt leere Liste zurück (bereits implementiert)

**Risiko 2: BranchId nicht gesetzt**
- Problem: Wenn `req.branchId` undefined ist, funktioniert `requests_branch` nicht
- Lösung: Prüfung in Backend: `if (hasBranchPermission && branchId)`

**Risiko 3: Mehrere Berechtigungen gleichzeitig**
- Problem: User hat z.B. `requests_own` und `requests_branch`
- Lösung: OR-Logik im Filter (Union aller berechtigten Requests)

**Risiko 4: Private Requests**
- Problem: Private Requests müssen weiterhin korrekt gefiltert werden
- Lösung: isPrivate-Logik bleibt bestehen, wird mit Berechtigungslogik kombiniert

### 5.2 Abhängigkeiten

**Abhängigkeit 1: req.roleId im Request**
- Status: ✅ Bereits vorhanden (wird von authMiddleware gesetzt)
- Prüfen: `backend/src/middleware/auth.ts`

**Abhängigkeit 2: req.branchId im Request**
- Status: ✅ Bereits vorhanden (wird von organizationMiddleware gesetzt)
- Prüfen: `backend/src/middleware/organization.ts` Zeile 54-67

**Abhängigkeit 3: user.id im Frontend**
- Status: ✅ Bereits vorhanden (useAuth Hook)
- Prüfen: `frontend/src/hooks/useAuth.tsx`

---

## 6. CHECKLISTE VOR UMSETZUNG

- [x] Alle Code-Stellen identifiziert
- [x] Alle Zeilennummern verifiziert
- [x] Alle Berechtigungen definiert
- [x] Backend-Filterlogik definiert
- [x] Frontend-Button-Logik definiert
- [x] Test-Plan erstellt
- [x] Risiken identifiziert
- [x] Lösungen für Risiken definiert
- [x] Übersetzungen definiert
- [x] Keine offenen Fragen

---

## 7. ZUSAMMENFASSUNG

**Zu ändernde Dateien:**
1. `backend/prisma/seed.ts` - Neue Berechtigungen hinzufügen, Standardrollen aktualisieren
2. `frontend/src/components/RoleManagementTab.tsx` - defaultTables aktualisieren
3. `backend/src/controllers/requestController.ts` - Filterlogik anpassen
4. `frontend/src/components/Requests.tsx` - Button-Logik anpassen
5. `frontend/src/hooks/usePermissions.ts` - Helper-Funktionen hinzufügen
6. `frontend/src/i18n/locales/de.json` - Übersetzungen hinzufügen
7. `frontend/src/i18n/locales/en.json` - Übersetzungen hinzufügen
8. `frontend/src/i18n/locales/es.json` - Übersetzungen hinzufügen

**Nicht zu ändernde Dateien:**
- `frontend/src/pages/Dashboard.tsx` - Keine Änderung erforderlich
- `frontend/src/components/WorktimeStats.tsx` - Keine Änderung erforderlich
- `frontend/src/components/AppDownload.tsx` - Keine Änderung erforderlich

**Neue Berechtigungen:**
- `requests_own` (table) - Nur eigene Requests
- `requests_branch` (table) - Alle Requests im Branch
- `requests_organization` (table) - Alle Requests der Organisation

**Entfernte Berechtigungen:**
- `requests` (table) - Wird durch neue Berechtigungen ersetzt

**Standardberechtigungssets:**
- Admin: `requests_organization` = `both`
- User: `requests_own` = `both`
- Hamburger: `requests_own` = `read`

---

**ENDE DES PLANS - BEREIT FÜR UMSETZUNG**


