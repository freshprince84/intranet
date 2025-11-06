# VOLLSTÄNDIGE Analyse: organizationId für ALLE Tabellen

## Status-Übersicht aller Entitäten

### ✅ Bereits mit organizationId:
- `OrganizationJoinRequest` - hat `organizationId`
- `OrganizationInvitation` - hat `organizationId`
- `Role` - hat `organizationId?` (optional)

### ❌ Benötigen organizationId (KRITISCH):
- `Task` - ❌ Filterung über komplexe JOINs
- `Request` - ❌ Filterung über komplexe JOINs
- `WorkTime` - ❌ Filterung über User → UserRole → Role
- `Client` - ❌ Filterung über WorkTime → User → UserRole → Role
- `Branch` - ❌ Filterung über UsersBranches → User → UserRole → Role

### ⚠️ Benötigen organizationId (WICHTIG):
- `ConsultationInvoice` - Aktuell nur `userId`-Filter, sollte organisations-spezifisch sein
- `MonthlyConsultationReport` - Aktuell nur `userId`-Filter, sollte organisations-spezifisch sein

### ✅ Brauchen KEIN organizationId (user-spezifisch):
- `User` - Wird über UserRole → Role → Organization gefiltert (indirekt)
- `UserRole` - Verbindet User mit Role (Role hat organizationId)
- `Permission` - Verbindet Role mit Entity (Role hat organizationId)
- `Settings` - User-spezifisch (`userId` unique)
- `UserNotificationSettings` - User-spezifisch (`userId` unique)
- `UserTableSettings` - User-spezifisch (`userId` + `tableId`)
- `SavedFilter` - User-spezifisch (`userId` + `tableId` + `name`)
- `Notification` - User-spezifisch (`userId`)
- `InvoiceSettings` - User-spezifisch (`userId` unique)
- `IdentificationDocument` - User-spezifisch (`userId` + `documentType`)
- `EmployeePayroll` - User-spezifisch (`userId`)

### ✅ Brauchen KEIN organizationId (globale/indirekte Zuordnung):
- `CerebroCarticle` - Knowledge Base, global (nicht organisations-spezifisch)
- `CerebroMedia` - Gehört zu CerebroCarticle
- `CerebroExternalLink` - Gehört zu CerebroCarticle
- `CerebroTag` - Global, nicht organisations-spezifisch
- `TaskCerebroCarticle` - Verbindet Task (hat organizationId) mit CerebroCarticle
- `RequestCerebroCarticle` - Verbindet Request (hat organizationId) mit CerebroCarticle
- `TaskAttachment` - Gehört zu Task (hat organizationId)
- `RequestAttachment` - Gehört zu Request (hat organizationId)
- `WorkTimeTask` - Verbindet WorkTime (hat organizationId) mit Task (hat organizationId)
- `TaskStatusHistory` - Gehört zu Task (hat organizationId)
- `ConsultationInvoiceItem` - Gehört zu ConsultationInvoice (hat organizationId)
- `InvoicePayment` - Gehört zu ConsultationInvoice (hat organizationId)
- `MonthlyConsultationReportItem` - Gehört zu MonthlyConsultationReport (hat organizationId)
- `UsersBranches` - Verbindet User mit Branch (Branch hat organizationId)
- `NotificationSettings` - Global, keine User-Zuordnung

## Erweiterte Migrations-Liste

### Phase 1: Kritische Entitäten (bereits geplant)
1. ✅ Task
2. ✅ Request
3. ✅ WorkTime
4. ✅ Client
5. ✅ Branch

### Phase 2: Wichtige Entitäten (NEU!)
6. ⚠️ ConsultationInvoice
7. ⚠️ MonthlyConsultationReport

## Schema-Änderungen Phase 2

### 6. ConsultationInvoice
```prisma
model ConsultationInvoice {
  id            Int                       @id @default(autoincrement())
  invoiceNumber String
  clientId      Int
  userId        Int
  issueDate     DateTime                  @default(now())
  dueDate       DateTime
  status        InvoiceStatus             @default(DRAFT)
  subtotal      Decimal                   @db.Decimal(10, 2)
  vatRate       Decimal?                  @db.Decimal(5, 2)
  vatAmount     Decimal?                  @db.Decimal(10, 2)
  total         Decimal                   @db.Decimal(10, 2)
  currency      String                    @default("CHF")
  paymentTerms  String                    @default("30 Tage netto")
  notes         String?
  pdfPath       String?
  qrReference   String?
  createdAt     DateTime                  @default(now())
  updatedAt     DateTime                  @updatedAt
  organizationId Int?                     // NEU: Optional für Migration
  organization  Organization?             @relation(fields: [organizationId], references: [id])  // NEU
  client        Client                    @relation(fields: [clientId], references: [id])
  user          User                      @relation(fields: [userId], references: [id])
  items         ConsultationInvoiceItem[]
  payments      InvoicePayment[]
}
```

### 7. MonthlyConsultationReport
```prisma
model MonthlyConsultationReport {
  id           Int                             @id @default(autoincrement())
  userId       Int
  reportNumber String
  periodStart  DateTime
  periodEnd    DateTime
  recipient    String
  totalHours   Decimal                          @db.Decimal(10, 2)
  totalAmount  Decimal?                         @db.Decimal(10, 2)
  currency     String                           @default("CHF")
  pdfPath      String?
  status       MonthlyReportStatus              @default(GENERATED)
  generatedAt  DateTime                         @default(now())
  createdAt    DateTime                         @default(now())
  updatedAt    DateTime                         @updatedAt
  organizationId Int?                           // NEU: Optional für Migration
  organization   Organization?                   @relation(fields: [organizationId], references: [id])  // NEU
  user         User                             @relation(fields: [userId], references: [id])
  items        MonthlyConsultationReportItem[]
  workTimes    WorkTime[]
}
```

## Controller-Anpassungen Phase 2

### ConsultationInvoiceController (`backend/src/controllers/consultationInvoiceController.ts`)

**Änderung in `createInvoiceFromConsultations`:**
```typescript
export const createInvoiceFromConsultations = async (req: Request, res: Response) => {
    try {
        // ... bestehende Validierung ...
        
        const invoice = await prisma.consultationInvoice.create({
            data: {
                invoiceNumber,
                clientId: Number(clientId),
                userId: Number(userId),
                issueDate: new Date(issueDate),
                dueDate: new Date(dueDate),
                status: 'DRAFT',
                subtotal,
                vatRate: vatRate || null,
                vatAmount: vatAmount || null,
                total,
                currency: currency || 'CHF',
                paymentTerms: paymentTerms || '30 Tage netto',
                notes: notes || null,
                organizationId: req.organizationId || null  // NEU: Setze organizationId wenn vorhanden
            },
            // ... rest bleibt gleich ...
        });
    }
}
```

**Änderung in `getInvoices`:**
```typescript
export const getInvoices = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const { status, clientId, from, to } = req.query;

        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }

        // NEU: Verwende getDataIsolationFilter für organisations-spezifische Filterung
        const invoiceFilter = getDataIsolationFilter(req as any, 'invoice');
        
        let whereClause: any = {
            ...invoiceFilter,  // NEU: Filter nach organizationId oder userId
        };

        // ... rest bleibt gleich ...
    }
}
```

### MonthlyConsultationReportController (`backend/src/controllers/monthlyConsultationReportController.ts`)

**Änderung in `generateMonthlyReport`:**
```typescript
export const generateMonthlyReport = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // ... bestehende Validierung ...
        
        const report = await prisma.monthlyConsultationReport.create({
            data: {
                userId,
                reportNumber,
                periodStart: startDate,
                periodEnd: endDate,
                recipient,
                totalHours,
                totalAmount: totalAmount || null,
                currency: currency || 'CHF',
                status: 'GENERATED',
                organizationId: req.organizationId || null  // NEU: Setze organizationId wenn vorhanden
            },
            // ... rest bleibt gleich ...
        });
    }
}
```

**Änderung in `getMonthlyReports`:**
```typescript
export const getMonthlyReports = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = parseInt(req.userId, 10);
        
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }

        // NEU: Verwende getDataIsolationFilter für organisations-spezifische Filterung
        const reportFilter = getDataIsolationFilter(req as any, 'monthlyReport');
        
        const reports = await prisma.monthlyConsultationReport.findMany({
            where: reportFilter,  // NEU: Filter nach organizationId oder userId
            include: {
                items: {
                    include: {
                        client: true
                    }
                }
            },
            orderBy: { periodStart: 'desc' }
        });

        res.json(reports);
    }
}
```

## Filterlogik-Erweiterung

### `backend/src/middleware/organization.ts`

**Erweiterung der `getDataIsolationFilter` Funktion:**

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
            
            case 'invoice':
            case 'consultationInvoice':
                return { userId: userId };
            
            case 'monthlyReport':
            case 'monthlyConsultationReport':
                return { userId: userId };
            
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
        case 'invoice':
        case 'consultationInvoice':
        case 'monthlyReport':
        case 'monthlyConsultationReport':
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

## Vollständige Migrations-Liste (Final)

### Phase 1: Kritische Entitäten (bereits geplant)
1. Task
2. Request
3. WorkTime
4. Client
5. Branch

### Phase 2: Wichtige Entitäten (NEU!)
6. ConsultationInvoice
7. MonthlyConsultationReport

## Zusammenfassung

### Benötigen organizationId:
- ✅ Task, Request, WorkTime, Client, Branch (Phase 1)
- ✅ ConsultationInvoice, MonthlyConsultationReport (Phase 2)

### Brauchen KEIN organizationId:
- User-spezifische Entitäten: Settings, UserNotificationSettings, UserTableSettings, SavedFilter, Notification, InvoiceSettings, IdentificationDocument, EmployeePayroll
- Globale Entitäten: CerebroCarticle, CerebroMedia, CerebroExternalLink, CerebroTag, NotificationSettings
- Indirekte Zuordnung: UserRole, Permission, TaskAttachment, RequestAttachment, WorkTimeTask, TaskStatusHistory, ConsultationInvoiceItem, InvoicePayment, MonthlyConsultationReportItem, UsersBranches, TaskCerebroCarticle, RequestCerebroCarticle

### Bereits mit organizationId:
- OrganizationJoinRequest, OrganizationInvitation, Role

## Aktion erforderlich

Der Plan muss erweitert werden um:
1. ConsultationInvoice mit organizationId
2. MonthlyConsultationReport mit organizationId
3. Controller-Anpassungen für beide Entitäten
4. Filterlogik-Erweiterung für 'invoice' und 'monthlyReport'


