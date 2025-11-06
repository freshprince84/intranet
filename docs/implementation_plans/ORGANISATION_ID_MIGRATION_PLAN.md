# Implementierungsplan: organizationId für Task, Request, WorkTime, Client, Branch

## Überblick

Alle betroffenen Tabellen erhalten eine `organizationId Int?` Spalte (optional, kann NULL sein für Standalone-User oder bestehende Daten).

**Reihenfolge der Migration:**
1. Task
2. Request
3. WorkTime
4. Client
5. Branch

## Schema-Änderungen

### 1. Task
```prisma
model Task {
  id               Int          @id @default(autoincrement())
  title            String
  description      String?
  status           TaskStatus   @default(open)
  responsibleId    Int?
  qualityControlId Int
  branchId         Int
  dueDate          DateTime?
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  roleId           Int?
  organizationId   Int?         // NEU: Optional für Migration
  organization     Organization? @relation(fields: [organizationId], references: [id])  // NEU
  branch           Branch       @relation(fields: [branchId], references: [id])
  qualityControl   User         @relation("quality_control", fields: [qualityControlId], references: [id])
  responsible      User?        @relation("responsible", fields: [responsibleId], references: [id])
  role             Role?        @relation(fields: [roleId], references: [id])
  attachments      TaskAttachment[]
  carticles        TaskCerebroCarticle[]
  workTimeLinks    WorkTimeTask[]
  statusHistory    TaskStatusHistory[]
}
```

### 2. Request
```prisma
model Request {
  id               Int          @id @default(autoincrement())
  title            String
  description      String?
  status           RequestStatus @default(approval)
  requesterId      Int
  responsibleId    Int
  branchId         Int
  dueDate          DateTime?
  createTodo       Boolean      @default(false)
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  organizationId   Int?         // NEU: Optional für Migration
  organization     Organization? @relation(fields: [organizationId], references: [id])  // NEU
  branch           Branch       @relation(fields: [branchId], references: [id])
  requester        User         @relation("requester", fields: [requesterId], references: [id])
  responsible      User         @relation("responsible", fields: [responsibleId], references: [id])
  attachments      RequestAttachment[]
  carticles        RequestCerebroCarticle[]
}
```

### 3. WorkTime
```prisma
model WorkTime {
  id              Int                        @id @default(autoincrement())
  userId          Int
  branchId        Int
  startTime       DateTime
  endTime         DateTime?
  createdAt       DateTime                   @default(now())
  updatedAt       DateTime                   @updatedAt
  timezone        String?
  clientId        Int?
  notes           String?
  monthlyReportId Int?
  organizationId  Int?                       // NEU: Optional für Migration
  organization    Organization?              @relation(fields: [organizationId], references: [id])  // NEU
  branch          Branch                     @relation(fields: [branchId], references: [id])
  client          Client?                    @relation(fields: [clientId], references: [id])
  monthlyReport   MonthlyConsultationReport? @relation(fields: [monthlyReportId], references: [id])
  user            User                       @relation(fields: [userId], references: [id])
  taskLinks       WorkTimeTask[]
}
```

### 4. Client
```prisma
model Client {
  id                   Int                             @id @default(autoincrement())
  name                 String
  company              String?
  email                String?
  phone                String?
  address              String?
  notes                String?
  isActive             Boolean                         @default(true)
  createdAt            DateTime                        @default(now())
  updatedAt            DateTime                        @updatedAt
  organizationId       Int?                           // NEU: Optional für Migration
  organization         Organization?                   @relation(fields: [organizationId], references: [id])  // NEU
  consultationInvoices ConsultationInvoice[]
  monthlyReportItems   MonthlyConsultationReportItem[]
  workTimes            WorkTime[]
}
```

### 5. Branch
```prisma
model Branch {
  id                Int                 @id @default(autoincrement())
  name              String              @unique
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  organizationId    Int?                // NEU: Optional für Migration
  organization      Organization?        @relation(fields: [organizationId], references: [id])  // NEU
  requests          Request[]
  tasks             Task[]
  users             UsersBranches[]
  workTimes         WorkTime[]
  taskStatusChanges TaskStatusHistory[]
}
```

**WICHTIG:** `Organization`-Modell muss auch erweitert werden:
```prisma
model Organization {
  id               Int                       @id @default(autoincrement())
  name             String                    @unique
  displayName      String
  domain           String?                   @unique
  logo             String?
  isActive         Boolean                   @default(true)
  maxUsers         Int                       @default(50)
  subscriptionPlan String                    @default("basic")
  subscriptionEnd  DateTime?
  settings         Json?
  createdAt        DateTime                  @default(now())
  updatedAt        DateTime                  @updatedAt
  invitations      OrganizationInvitation[]
  joinRequests     OrganizationJoinRequest[]
  roles            Role[]
  tasks            Task[]                    // NEU
  requests         Request[]                 // NEU
  workTimes        WorkTime[]                // NEU
  clients          Client[]                  // NEU
  branches         Branch[]                  // NEU
}
```

## Migration-Schritte

### Schritt 1: Schema anpassen
- `backend/prisma/schema.prisma` mit allen oben genannten Änderungen aktualisieren
- `Organization`-Modell erweitern mit Relationen zu allen neuen Tabellen

### Schritt 2: Migration erstellen
```bash
cd backend
npx prisma migrate dev --name add_organization_id_to_all_tables
```

**WICHTIG:** Die Migration wird automatisch `organizationId` als nullable hinzufügen. Bestehende Einträge bleiben ohne `organizationId` (NULL), was korrekt ist für Standalone-User.

### Schritt 3: Prisma Client generieren
```bash
npx prisma generate
```

## Controller-Anpassungen

### 1. TaskController (`backend/src/controllers/taskController.ts`)

**Änderung in `createTask`:**
```typescript
export const createTask = async (req: Request<{}, {}, TaskData>, res: Response) => {
    try {
        // ... bestehende Validierung ...
        
        const taskCreateData: any = {
            title: taskData.title,
            description: taskData.description || '',
            status: taskData.status || 'open',
            qualityControlId: taskData.qualityControlId,
            branchId: taskData.branchId,
            dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
            organizationId: req.organizationId || null  // NEU: Setze organizationId wenn vorhanden
        };
        
        // ... rest bleibt gleich ...
    }
}
```

### 2. RequestController (`backend/src/controllers/requestController.ts`)

**Änderung in `createRequest`:**
```typescript
export const createRequest = async (req: Request<{}, {}, CreateRequestBody>, res: Response) => {
    try {
        // ... bestehende Validierung ...
        
        const request = await prisma.request.create({
            data: {
                title,
                description,
                requesterId,
                responsibleId,
                branchId: branchId,
                status,
                dueDate: dueDate ? new Date(dueDate) : null,
                createTodo,
                organizationId: req.organizationId || null  // NEU: Setze organizationId wenn vorhanden
            },
            // ... rest bleibt gleich ...
        });
    }
}
```

### 3. WorkTimeController (`backend/src/controllers/worktimeController.ts`)

**Änderung in `startWorktime`:**
```typescript
export const startWorktime = async (req: Request, res: Response) => {
    try {
        // ... bestehende Validierung ...
        
        const worktime = await prisma.workTime.create({
            data: {
                startTime: now,
                userId: Number(userId),
                branchId: Number(branchId),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                organizationId: req.organizationId || null  // NEU: Setze organizationId wenn vorhanden
            },
            // ... rest bleibt gleich ...
        });
    }
}
```

**Änderung in `startConsultation` (`backend/src/controllers/consultationController.ts`):**
```typescript
export const startConsultation = async (req: Request, res: Response) => {
    try {
        // ... bestehende Validierung ...
        
        const consultation = await prisma.workTime.create({
            data: {
                startTime: now,
                userId: Number(userId),
                branchId: Number(branchId),
                clientId: Number(clientId),
                notes: notes || null,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                organizationId: req.organizationId || null  // NEU: Setze organizationId wenn vorhanden
            },
            // ... rest bleibt gleich ...
        });
    }
}
```

### 4. ClientController (`backend/src/controllers/clientController.ts`)

**Änderung in `createClient`:**
```typescript
export const createClient = async (req: Request, res: Response) => {
    try {
        const { name, company, email, phone, address, notes } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: 'Name ist erforderlich' });
        }
        
        const client = await prisma.client.create({
            data: {
                name,
                company,
                email,
                phone,
                address,
                notes,
                organizationId: req.organizationId || null  // NEU: Setze organizationId wenn vorhanden
            }
        });
        
        res.status(201).json(client);
    }
}
```

### 5. BranchController (`backend/src/controllers/branchController.ts`)

**Prüfung:** Wenn `createBranch` existiert, muss es angepasst werden. Falls nicht, ist das ok, da Branches wahrscheinlich nur über Seeding erstellt werden.

**Falls `createBranch` existiert:**
```typescript
export const createBranch = async (req: Request, res: Response) => {
    try {
        // ... bestehende Validierung ...
        
        const branch = await prisma.branch.create({
            data: {
                name,
                organizationId: req.organizationId || null  // NEU: Setze organizationId wenn vorhanden
            }
        });
    }
}
```

## Filterlogik anpassen

### `backend/src/middleware/organization.ts`

**Vereinfachung der `getDataIsolationFilter` Funktion:**

```typescript
export const getDataIsolationFilter = (req: Request, entity: string): any => {
    const userId = Number(req.userId);
    
    if (isNaN(userId)) {
        console.error('Invalid userId in request:', req.userId);
        return {};
    }

    // Standalone User (ohne Organisation) - nur eigene Daten
    if (!req.organizationId) {
        switch (entity) {
            case 'task':
                return {
                    OR: [
                        { responsibleId: userId },
                        { qualityControlId: userId }
                    ]
                };
            
            case 'request':
                return {
                    OR: [
                        { requesterId: userId },
                        { responsibleId: userId }
                    ]
                };
            
            case 'worktime':
                return { userId: userId };
            
            case 'client':
                return {
                    workTimes: {
                        some: { userId: userId }
                    }
                };
            
            case 'branch':
                return {
                    users: {
                        some: { userId: userId }
                    }
                };
            
            case 'role':
                return {
                    users: {
                        some: { userId: userId }
                    }
                };
            
            default:
                return {};
        }
    }

    // User mit Organisation - Filter nach organizationId
    console.log(`[getDataIsolationFilter] entity: ${entity}, userId: ${userId}, organizationId: ${req.organizationId}`);
    
    switch (entity) {
        case 'task':
        case 'request':
        case 'worktime':
        case 'client':
        case 'branch':
            // Einfache Filterung nach organizationId
            return {
                organizationId: req.organizationId
            };
        
        case 'user':
            // User-Filterung bleibt komplex (über UserRole)
            return {
                roles: {
                    some: {
                        role: {
                            organizationId: req.organizationId
                        }
                    }
                }
            };
        
        case 'role':
            return {
                organizationId: req.organizationId
            };
        
        default:
            return {};
    }
};
```

## Test-Plan

### 1. Task-Erstellung
- [ ] Als User mit Organisation: Task erstellen, `organizationId` muss gesetzt sein
- [ ] Als Standalone-User: Task erstellen, `organizationId` muss NULL sein
- [ ] Tasks werden nur für die aktive Organisation angezeigt

### 2. Request-Erstellung
- [ ] Als User mit Organisation: Request erstellen, `organizationId` muss gesetzt sein
- [ ] Als Standalone-User: Request erstellen, `organizationId` muss NULL sein
- [ ] Requests werden nur für die aktive Organisation angezeigt

### 3. WorkTime-Erstellung
- [ ] Als User mit Organisation: WorkTime erstellen, `organizationId` muss gesetzt sein
- [ ] Als Standalone-User: WorkTime erstellen, `organizationId` muss NULL sein
- [ ] WorkTimes werden nur für die aktive Organisation angezeigt

### 4. Client-Erstellung
- [ ] Als User mit Organisation: Client erstellen, `organizationId` muss gesetzt sein
- [ ] Als Standalone-User: Client erstellen, `organizationId` muss NULL sein
- [ ] Clients werden nur für die aktive Organisation angezeigt

### 5. Branch-Erstellung (falls möglich)
- [ ] Als User mit Organisation: Branch erstellen, `organizationId` muss gesetzt sein
- [ ] Als Standalone-User: Branch erstellen, `organizationId` muss NULL sein
- [ ] Branches werden nur für die aktive Organisation angezeigt

### 6. Bestehende Daten
- [ ] Bestehende Tasks/Requests/WorkTimes/Clients/Branches haben `organizationId = NULL`
- [ ] Standalone-User sehen ihre eigenen Daten (Filter funktioniert)
- [ ] User mit Organisation sehen nur Daten ihrer Organisation

## Wichtige Hinweise

1. **Bestehende Daten bleiben unverändert**: Alle bestehenden Einträge haben `organizationId = NULL`, was korrekt ist für Standalone-User oder alte Daten.

2. **NULL-Werte erlaubt**: `organizationId` ist optional (`Int?`), damit:
   - Standalone-User (ohne Organisation) weiterhin funktionieren
   - Bestehende Daten nicht migriert werden müssen
   - Neue Einträge ohne Organisation möglich sind

3. **Filterlogik**: 
   - Mit Organisation: `WHERE organizationId = ?`
   - Standalone: Bestehende Filterlogik (userId-basiert)

4. **Performance**: Nach Migration wird die Filterung deutlich schneller sein (Index-Scan statt komplexer JOINs).

## Reihenfolge der Implementierung

1. ✅ Schema-Analyse (ERLEDIGT)
2. ⏳ Schema anpassen
3. ⏳ Migration erstellen
4. ⏳ Controller anpassen
5. ⏳ Filterlogik vereinfachen
6. ⏳ Tests durchführen


