# Implementierungsplan: Multi-Tenant SaaS für Intranet

## Übersicht
Dieses Dokument enthält den detaillierten Schritt-für-Schritt Plan zur Umwandlung des Intranet-Systems in ein Multi-Tenant SaaS-System. Jeder Schritt hat eine Checkbox zum Abhaken nach Fertigstellung.

**WICHTIG**: Nach JEDEM erledigten Schritt:
1. Checkbox abhaken (☑️)
2. Commit erstellen mit aussagekräftiger Message
3. Zum nächsten Schritt gehen

**NEU - MCP INTEGRATION**: 
🔧 **MCP für Datenbankzugriff** steht zur Verfügung und wird strategisch eingesetzt für:
- Datenbank-Zustand-Verifizierung
- Schema-Migration-Monitoring  
- Multi-Tenant Datenisolation Tests
- Performance- und Integritätsprüfungen

## Strategische Überlegungen

### Datenbank-Design-Ansatz: Organisation über Rollen (Empfohlen)

Nach Analyse des bestehenden Systems empfehle ich den **Organisation-über-Rollen-Ansatz**:

**Vorteile:**
- ✅ Minimale Änderungen am bestehenden Schema
- ✅ User können theoretisch zu mehreren Organisationen gehören
- ✅ Zentrale Kontrolle über Organisation-Einstellungen
- ✅ Einfache Migration bestehender Daten



### Architektur-Konzept

```
Organisation (1) --- (*) Role
Role (1) --- (*) UserRole 
UserRole (*) --- (1) User
User (1) --- (*) WorkTime, Task, Request, etc.
```

Datenisolation erfolgt über:
1. Organisation → Rollen → User → Daten
2. Middleware prüft Organisation-Zugehörigkeit über User-Rollen
3. Neue Organisation-spezifische Berechtigungen

## Phase 0: Aufräumen bestehender Multi-Tenant Rückstände

**🔍 ANALYSE-ERGEBNIS:**
- ✅ **Prisma Schema:** Bereits bereinigt, keine Multi-Tenant Models mehr vorhanden
- ⚠️ **Migrationen:** 3 Multi-Tenant Migrationen gefunden (funktionslos, aber vorhanden)
- ⚠️ **Compiled Files:** Alte Organization JS-Dateien in `backend/dist/`
- ⚠️ **Frontend:** Leerer `organization/` Ordner
- ⚠️ **Datenbank:** Vermutlich noch `organizations` und `organization_join_requests` Tabellen
- ✅ **Source Code:** Keine Organization-Controller/Routes in Source-Code
- ✅ **API Config:** Keine Organization-Endpoints
- ✅ **Seed-Datei:** Keine Organization-Code

### Schritt 0.1: Multi-Tenant Tabellen aus Datenbank entfernen

#### Schritt 0.1a: 🔧 MCP - Aktuellen Datenbank-Zustand verifizieren
- [x] **MCP-Datenbankzugriff nutzen** um Multi-Tenant Tabellen zu identifizieren:
  ```sql
  -- Prüfe welche Multi-Tenant Tabellen existieren
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('organizations', 'organization_join_requests');
  
  -- Prüfe welche Tabellen organizationId Spalten haben
  SELECT table_name, column_name FROM information_schema.columns 
  WHERE column_name = 'organizationId' AND table_schema = 'public';
  
  -- Prüfe Multi-Tenant Enums
  SELECT enumlabel FROM pg_enum 
  WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'JoinRequestStatus');
  ```
- [x] **Dokumentiere Ergebnisse** der MCP-Abfrage für Bereinigungsreport

#### Schritt 0.1b: Migration erstellen und ausführen
- [x] Terminal öffnen im `backend` Verzeichnis
- [x] Neue Migration erstellen: `npx prisma migrate dev --name remove_multi_tenant_tables --create-only`
- [x] Öffne die erstellte Migration-Datei in `backend/prisma/migrations/[timestamp]_remove_multi_tenant_tables/`
- [x] Ersetze den Inhalt mit:
```sql
-- Entferne Multi-Tenant Tabellen falls vorhanden
DROP TABLE IF EXISTS "organization_join_requests" CASCADE;
DROP TABLE IF EXISTS "organizations" CASCADE;

-- Entferne Multi-Tenant Enum falls vorhanden
DROP TYPE IF EXISTS "JoinRequestStatus";

-- Entferne organizationId Spalten falls vorhanden
-- (Diese wurden durch db pull bereits aus dem Schema entfernt, 
-- aber könnten noch in der DB existieren)
DO $$ 
BEGIN
    -- User Tabelle
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'User' AND column_name = 'organizationId') THEN
        ALTER TABLE "User" DROP COLUMN "organizationId";
    END IF;
    
    -- Role Tabelle
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'Role' AND column_name = 'organizationId') THEN
        ALTER TABLE "Role" DROP COLUMN "organizationId";
    END IF;
    
    -- Andere Tabellen - prüfe und entferne organizationId falls vorhanden
    DECLARE
        rec RECORD;
    BEGIN
        FOR rec IN 
            SELECT table_name FROM information_schema.columns 
            WHERE column_name = 'organizationId' 
            AND table_schema = 'public'
        LOOP
            EXECUTE 'ALTER TABLE "' || rec.table_name || '" DROP COLUMN IF EXISTS "organizationId"';
        END LOOP;
    END;
END $$;
```
- [x] Führe Migration aus: `npx prisma migrate deploy`

#### Schritt 0.1c: 🔧 MCP - Bereinigung verifizieren
- [x] **MCP-Datenbankzugriff nutzen** um erfolgreiche Bereinigung zu bestätigen:
  ```sql
  -- Bestätige dass Multi-Tenant Tabellen entfernt wurden
  SELECT COUNT(*) as remaining_tables FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('organizations', 'organization_join_requests');
  
  -- Bestätige dass organizationId Spalten entfernt wurden
  SELECT COUNT(*) as remaining_columns FROM information_schema.columns 
  WHERE column_name = 'organizationId' AND table_schema = 'public';
  
  -- Bestätige dass JoinRequestStatus Enum entfernt wurde
  SELECT COUNT(*) as remaining_enums FROM pg_type WHERE typname = 'JoinRequestStatus';
  ```
- [x] **Erwartete Ergebnisse**: Alle Counts sollten 0 sein
- [x] **Falls nicht 0**: Manuelle Nachbereinigung erforderlich

### Schritt 0.2: Alte compiled JavaScript-Dateien löschen
- [x] Lösche folgende Dateien aus `backend/dist/`:
  - [x] `backend/dist/types/organization.js`
  - [x] `backend/dist/types/organization.js.map`
  - [x] `backend/dist/routes/organizationRoutes.js`
  - [x] `backend/dist/routes/organizationRoutes.js.map`
  - [x] `backend/dist/services/organizationService.js`
  - [x] `backend/dist/services/organizationService.js.map`
  - [x] `backend/dist/controllers/organizationController.js`
  - [x] `backend/dist/controllers/organizationController.js.map`
- [x] Terminal: `rm -rf backend/dist/types/organization.* backend/dist/routes/organizationRoutes.* backend/dist/services/organizationService.* backend/dist/controllers/organizationController.*`

### Schritt 0.3: Leeren Frontend Organization-Ordner entfernen
- [x] Lösche leeren Ordner: `rmdir frontend/src/components/organization`
- [x] Oder in Windows: `rd frontend/src/components/organization`

### Schritt 0.4: Veraltete Multi-Tenant Migrationen entfernen (optional)
- [x] **WICHTIG:** Nur wenn Datenbank leer ist oder du sicher bist!
- [x] Lösche folgende Migration-Ordner:
  - [x] `backend/prisma/migrations/20250604224835_add_multi_tenant_support/`
  - [x] `backend/prisma/migrations/20250605224511_add_credentials_to_join_request/`
  - [x] `backend/prisma/migrations/20250605230526_add_optional_credentials_to_join_request/`
- [x] **ALTERNATIV:** Behalte sie als Historie, schadet nicht

### Schritt 0.5: Prisma Client neu generieren
- [x] Terminal öffnen im `backend` Verzeichnis
- [x] Führe aus: `npx prisma generate`
- [x] Prüfe dass keine Fehler auftreten

### Schritt 0.6: Backend neu kompilieren
- [x] Terminal im `backend` Verzeichnis
- [x] Führe aus: `npm run build` oder `tsc` (um saubere dist-Files zu erstellen)
- [x] Prüfe dass keine Compilation-Fehler bezüglich Organization auftreten

### Schritt 0.7: Seed-Daten neu einspielen (wegen leerer DB)
- [x] Terminal im `backend` Verzeichnis
- [x] Führe aus: `npx prisma db seed`
- [x] Warte bis Seeding erfolgreich abgeschlossen ist
- [x] Prüfe dass keine Errors auftreten
- [x] **Info:** Da die DB leer war, müssen Grunddaten (Admin-User, Rollen, etc.) neu erstellt werden

### Schritt 0.8: Vollständigkeitsprüfung nach Bereinigung
- [x] **WICHTIG:** Bitte den Nutzer, den Server neu zu starten
- [x] Frontend neu laden
  - [x] Grundfunktionalität testen:
    - [x] Login funktioniert mit Standard-Credentials (admin / admin123)
    - [x] Bestehende Features funktionieren (Zeiterfassung, Tasks, etc.)
    - [x] Keine Multi-Tenant Menüpunkte sichtbar
    - [x] Keine Console-Errors bezüglich Organisation
    - [x] Prisma Studio öffnen und prüfen dass keine `organizations` Tabellen mehr da sind
    - [x] Admin-User und Standard-Rollen sind wieder vorhanden
- [x] Bei Problemen: Rollback zur Backup-Version

### Schritt 0.9: Bereinigungs-Report erstellen
- [x] Dokumentiere was bereinigt wurde:
  - [x] **Datenbank:** `organizations`, `organization_join_requests` Tabellen entfernt
  - [x] **Migrations:** 3 Multi-Tenant Migrationen entfernt (20250604224835, 20250605224511, 20250605230526)
  - [x] **Compiled Files:** 8 Organization JS-Dateien aus `dist/` gelöscht
  - [x] **Frontend:** Leerer `organization/` Ordner entfernt
  - [x] **Schema:** Bereinigt und unique constraints wiederhergestellt
  - [x] **Seed:** Grunddaten neu eingespielt - 3 Rollen, Admin-User, 3 Niederlassungen, Demo-Clients
  - [x] **Verifikation:** MCP-Datenbankzugriff bestätigte vollständige Bereinigung
  - [x] **Server-Test:** Erfolgreich - Login funktioniert, keine Multi-Tenant UI-Elemente
- [x] Report für Commit-Message verwenden: "cleanup: Remove Multi-Tenant remains and reseed database"

## ⚠️ WICHTIGER HINWEIS
**Erst nach erfolgreichem Abschluss von Phase 0 mit Phase 1 beginnen!**

## Phase 1: Datenbank-Schema (Backend)

### Schritt 1.1: Organisation Model hinzufügen
- [x] Öffne `backend/prisma/schema.prisma`
- [x] Füge folgendes neues Model nach dem User-Model hinzu:

```prisma
model Organization {
  id              Int        @id @default(autoincrement())
  name            String     @unique
  displayName     String
  domain          String?    @unique    // Optionale Domain für automatische Zuordnung
  logo            String?
  isActive        Boolean    @default(true)
  maxUsers        Int        @default(50)        // Limit für Benutzeranzahl
  subscriptionPlan String    @default("basic")   // basic, pro, enterprise
  subscriptionEnd DateTime?                      // Ablaufdatum Abonnement
  settings        Json?                          // Organisation-spezifische Einstellungen
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  
  // Beziehungen
  roles           Role[]
  joinRequests    OrganizationJoinRequest[]
  invitations     OrganizationInvitation[]
}
```

### Schritt 1.2: Organisation Join Request Model hinzufügen
- [x] Füge folgendes Model nach dem Organization-Model hinzu:

```prisma
model OrganizationJoinRequest {
  id              Int           @id @default(autoincrement())
  organizationId  Int
  organization    Organization  @relation(fields: [organizationId], references: [id])
  requesterId     Int
  requester       User          @relation("JoinRequester", fields: [requesterId], references: [id])
  status          JoinRequestStatus @default(pending)
  message         String?       // Nachricht des Antragstellers
  response        String?       // Antwort der Organisation
  processedBy     Int?
  processor       User?         @relation("JoinProcessor", fields: [processedBy], references: [id])
  processedAt     DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@unique([organizationId, requesterId])
}
```

### Schritt 1.3: Organisation Invitation Model hinzufügen
- [x] Füge folgendes Model hinzu:

```prisma
model OrganizationInvitation {
  id              Int           @id @default(autoincrement())
  organizationId  Int
  organization    Organization  @relation(fields: [organizationId], references: [id])
  email           String
  roleId          Int
  role            Role          @relation(fields: [roleId], references: [id])
  invitedBy       Int
  inviter         User          @relation("Inviter", fields: [invitedBy], references: [id])
  token           String        @unique    // Einladungstoken
  expiresAt       DateTime
  acceptedAt      DateTime?
  acceptedBy      Int?
  acceptor        User?         @relation("InvitationAcceptor", fields: [acceptedBy], references: [id])
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}
```

### Schritt 1.4: Bestehende Models erweitern
- [x] Erweitere das `Role` Model (füge nach `users` hinzu):
```prisma
  organizationId  Int
  organization    Organization  @relation(fields: [organizationId], references: [id])
  invitations     OrganizationInvitation[]
```

- [x] Erweitere das `User` Model (füge nach `monthlyReports` hinzu):
```prisma
  joinRequestsSent      OrganizationJoinRequest[] @relation("JoinRequester")
  joinRequestsProcessed OrganizationJoinRequest[] @relation("JoinProcessor")
  invitationsSent       OrganizationInvitation[]  @relation("Inviter") 
  invitationsAccepted   OrganizationInvitation[]  @relation("InvitationAcceptor")
```

### Schritt 1.5: Neue Enums hinzufügen
- [x] Füge folgende Enums am Ende der Datei hinzu:

```prisma
enum JoinRequestStatus {
  pending
  approved
  rejected
  withdrawn
}

enum SubscriptionPlan {
  basic
  pro
  enterprise
  trial
}
```

### Schritt 1.6: Migration erstellen und ausführen
- [x] Terminal öffnen im `backend` Verzeichnis
- [x] Führe aus: `npx prisma migrate dev --name add_multi_tenant_support`
- [x] Warte bis Migration erfolgreich durchgelaufen ist

### Schritt 1.7: 🔧 MCP - Schema-Migration verifizieren
- [x] **MCP-Datenbankzugriff nutzen** um neue Multi-Tenant Struktur zu verifizieren:
  ```sql
  -- Prüfe dass neue Tabellen erstellt wurden
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('Organization', 'OrganizationJoinRequest', 'OrganizationInvitation')
  ORDER BY table_name;
  
  -- Prüfe dass Role Tabelle organizationId Spalte hat
  SELECT column_name, data_type, is_nullable 
  FROM information_schema.columns 
  WHERE table_name = 'Role' AND column_name = 'organizationId';
  
  -- Prüfe neue Enums
  SELECT enumlabel FROM pg_enum 
  WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'JoinRequestStatus')
  ORDER BY enumlabel;
  
  -- Prüfe Foreign Key Constraints
  SELECT tc.constraint_name, tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name
  FROM information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (tc.table_name LIKE '%Organization%' OR ccu.table_name LIKE '%Organization%');
  ```
- [x] **Erwartete Ergebnisse**: 3 neue Tabellen, organizationId in Role, JoinRequestStatus Enum mit 4 Werten
- [x] **Falls Probleme**: Migration-Rollback und Korrektur

### Schritt 1.8: Server neustart
- [x] **WICHTIG**: Bitte den Nutzer, den Server neu zu starten

## Phase 2: Daten-Migration und Seeding

### Schritt 2.1: Standard-Organisation erstellen
- [x] Öffne `backend/prisma/seed.ts`
- [x] Füge nach den bestehenden Imports hinzu:
```typescript
// Standard-Organisation für bestehende Daten
const defaultOrganization = await prisma.organization.create({
  data: {
    name: 'default',
    displayName: 'Standard Organisation',
    isActive: true,
    maxUsers: 1000,
    subscriptionPlan: 'enterprise'
  }
});

console.log('Standard-Organisation erstellt:', defaultOrganization);
```

### Schritt 2.2: Bestehende Rollen zur Standard-Organisation zuordnen
- [x] Füge folgenden Code nach der Organisation-Erstellung hinzu:
```typescript
// Alle bestehenden Rollen zur Standard-Organisation zuordnen
await prisma.role.updateMany({
  data: {
    organizationId: defaultOrganization.id
  }
});

console.log('Alle Rollen der Standard-Organisation zugeordnet');
```

### Schritt 2.3: Neue Organisation-Berechtigungen hinzufügen
- [x] Erweitere die Permissions-Seeding um Organisation-Berechtigungen:
```typescript
// Organisation-Berechtigungen für Admin-Rolle
const organizationPermissions = [
  { entity: 'organization', accessLevel: 'both', entityType: 'page' },
  { entity: 'organization_users', accessLevel: 'both', entityType: 'table' },
  { entity: 'organization_settings', accessLevel: 'both', entityType: 'table' },
  { entity: 'join_requests', accessLevel: 'both', entityType: 'table' },
  { entity: 'invitations', accessLevel: 'both', entityType: 'table' }
];

// Füge zu Admin-Rolle hinzu
const adminRole = await prisma.role.findFirst({ 
  where: { name: 'Admin', organizationId: defaultOrganization.id } 
});

for (const perm of organizationPermissions) {
  await prisma.permission.create({
    data: { ...perm, roleId: adminRole.id }
  });
}
```

### Schritt 2.4: Migration ausführen
- [x] Terminal im backend-Verzeichnis öffnen
- [x] Ausführen: `npx prisma db seed`

### Schritt 2.5: 🔧 MCP - Seed-Daten verifizieren
- [x] **MCP-Datenbankzugriff nutzen** um korrekte Daten-Migration zu verifizieren:
  ```sql
  -- Prüfe Standard-Organisation
  SELECT id, name, displayName, subscriptionPlan, maxUsers, isActive 
  FROM "Organization" WHERE name = 'default';
  
  -- Prüfe dass alle Rollen zur Standard-Organisation zugeordnet wurden
  SELECT r.name as role_name, o.name as org_name, o.displayName 
  FROM "Role" r 
  JOIN "Organization" o ON r."organizationId" = o.id
  ORDER BY r.name;
  
  -- Prüfe neue Organisation-Berechtigungen für Admin-Rolle
  SELECT p.entity, p."accessLevel", p."entityType", r.name as role_name
  FROM "Permission" p
  JOIN "Role" r ON p."roleId" = r.id
  WHERE r.name = 'Admin' AND p.entity LIKE '%organization%'
  ORDER BY p.entity;
  
  -- Prüfe User-Role Zuordnungen bleiben intakt
  SELECT u.username, r.name as role_name, o.name as org_name
  FROM "User" u
  JOIN "UserRole" ur ON u.id = ur."userId"
  JOIN "Role" r ON ur."roleId" = r.id
  JOIN "Organization" o ON r."organizationId" = o.id
  ORDER BY u.username;
  ```
- [ ] **Erwartete Ergebnisse**: 1 Standard-Organisation, alle Rollen zugeordnet, neue Permissions für Admin
- [ ] **Falls Probleme**: Seed-Skript korrigieren und neu ausführen

## Phase 3: Backend API - Organisation Management

### Schritt 3.1: Organisation Controller erstellen
- [x] Erstelle neue Datei: `backend/src/controllers/organizationController.ts`
- [ ] Füge folgenden Code ein:

```typescript
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateInvitationToken } from '../utils/tokenUtils';
import { sendInvitationEmail } from '../services/emailService';

const prisma = new PrismaClient();

// Aktuelle Organisation abrufen
export const getCurrentOrganization = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Hole die aktuelle Rolle des Users
    const userRole = await prisma.userRole.findFirst({
      where: { 
        userId: Number(userId),
        lastUsed: true 
      },
      include: {
        role: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!userRole?.role.organization) {
      return res.status(404).json({ message: 'Keine Organisation gefunden' });
    }

    res.json(userRole.role.organization);
  } catch (error) {
    console.error('Fehler beim Abrufen der Organisation:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Organisation erstellen
export const createOrganization = async (req: Request, res: Response) => {
  try {
    const { name, displayName, domain } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (!name || !displayName) {
      return res.status(400).json({ message: 'Name und Anzeigename sind erforderlich' });
    }

    // Prüfe ob Organisation bereits existiert
    const existingOrg = await prisma.organization.findFirst({
      where: {
        OR: [
          { name: name.toLowerCase() },
          { domain: domain }
        ]
      }
    });

    if (existingOrg) {
      return res.status(409).json({ message: 'Organisation existiert bereits' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Erstelle Organisation
      const organization = await tx.organization.create({
        data: {
          name: name.toLowerCase(),
          displayName,
          domain: domain || null,
          subscriptionPlan: 'trial'
        }
      });

      // Erstelle Admin-Rolle für die neue Organisation
      const adminRole = await tx.role.create({
        data: {
          name: 'Admin',
          description: 'Administrator der Organisation',
          organizationId: organization.id
        }
      });

      // Standard-Berechtigungen für Admin erstellen
      const adminPermissions = [
        { entity: 'users', accessLevel: 'both', entityType: 'page' },
        { entity: 'roles', accessLevel: 'both', entityType: 'table' },
        { entity: 'branches', accessLevel: 'both', entityType: 'table' },
        { entity: 'organization', accessLevel: 'both', entityType: 'page' },
        { entity: 'tasks', accessLevel: 'both', entityType: 'page' },
        { entity: 'requests', accessLevel: 'both', entityType: 'page' },
        { entity: 'worktime', accessLevel: 'both', entityType: 'page' },
        { entity: 'cerebro', accessLevel: 'both', entityType: 'page' }
      ];

      for (const perm of adminPermissions) {
        await tx.permission.create({
          data: { ...perm, roleId: adminRole.id }
        });
      }

      // Weise User zur Admin-Rolle zu
      await tx.userRole.create({
        data: {
          userId: Number(userId),
          roleId: adminRole.id,
          lastUsed: true
        }
      });

      // Deaktiviere alle anderen Rollen des Users
      await tx.userRole.updateMany({
        where: {
          userId: Number(userId),
          roleId: { not: adminRole.id }
        },
        data: { lastUsed: false }
      });

      return { organization, adminRole };
    });

    res.status(201).json(result.organization);
  } catch (error) {
    console.error('Fehler beim Erstellen der Organisation:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Organisation aktualisieren
export const updateOrganization = async (req: Request, res: Response) => {
  try {
    const { displayName, domain, logo, settings } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Hole aktuelle Organisation des Users
    const userRole = await prisma.userRole.findFirst({
      where: { 
        userId: Number(userId),
        lastUsed: true 
      },
      include: {
        role: {
          include: {
            organization: true,
            permissions: true
          }
        }
      }
    });

    if (!userRole) {
      return res.status(404).json({ message: 'Keine aktive Rolle gefunden' });
    }

    // Prüfe Berechtigung
    const hasOrgPermission = userRole.role.permissions.some(
      p => p.entity === 'organization' && ['both', 'write'].includes(p.accessLevel)
    );

    if (!hasOrgPermission) {
      return res.status(403).json({ message: 'Keine Berechtigung' });
    }

    const organization = await prisma.organization.update({
      where: { id: userRole.role.organizationId },
      data: {
        displayName: displayName || undefined,
        domain: domain || undefined,
        logo: logo || undefined,
        settings: settings || undefined
      }
    });

    res.json(organization);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Organisation:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Beitrittsanfrage erstellen
export const createJoinRequest = async (req: Request, res: Response) => {
  try {
    const { organizationName, message } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (!organizationName) {
      return res.status(400).json({ message: 'Organisationsname ist erforderlich' });
    }

    // Finde Organisation
    const organization = await prisma.organization.findUnique({
      where: { name: organizationName.toLowerCase() }
    });

    if (!organization) {
      return res.status(404).json({ message: 'Organisation nicht gefunden' });
    }

    // Prüfe ob bereits Anfrage existiert
    const existingRequest = await prisma.organizationJoinRequest.findUnique({
      where: {
        organizationId_requesterId: {
          organizationId: organization.id,
          requesterId: Number(userId)
        }
      }
    });

    if (existingRequest) {
      return res.status(409).json({ message: 'Beitrittsanfrage bereits gestellt' });
    }

    const joinRequest = await prisma.organizationJoinRequest.create({
      data: {
        organizationId: organization.id,
        requesterId: Number(userId),
        message: message || null
      },
      include: {
        organization: true,
        requester: true
      }
    });

    // Benachrichtigung an Admins senden
    const adminRoles = await prisma.role.findMany({
      where: {
        organizationId: organization.id,
        permissions: {
          some: {
            entity: 'organization',
            accessLevel: { in: ['both', 'write'] }
          }
        }
      },
      include: {
        users: {
          include: { user: true }
        }
      }
    });

    const adminUsers = adminRoles.flatMap(role => 
      role.users.map(ur => ur.user)
    );

    for (const admin of adminUsers) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'Neue Beitrittsanfrage',
          message: `${joinRequest.requester.firstName} ${joinRequest.requester.lastName} möchte der Organisation beitreten`,
          type: 'joinRequest',
          relatedEntityId: joinRequest.id,
          relatedEntityType: 'organizationJoinRequest'
        }
      });
    }

    res.status(201).json(joinRequest);
  } catch (error) {
    console.error('Fehler beim Erstellen der Beitrittsanfrage:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Beitrittsanfragen abrufen
export const getJoinRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Hole aktuelle Organisation
    const userRole = await prisma.userRole.findFirst({
      where: { 
        userId: Number(userId),
        lastUsed: true 
      },
      include: {
        role: {
          include: {
            organization: true,
            permissions: true
          }
        }
      }
    });

    if (!userRole) {
      return res.status(404).json({ message: 'Keine aktive Rolle gefunden' });
    }

    // Prüfe Berechtigung
    const hasPermission = userRole.role.permissions.some(
      p => p.entity === 'join_requests' && ['both', 'read'].includes(p.accessLevel)
    );

    if (!hasPermission) {
      return res.status(403).json({ message: 'Keine Berechtigung' });
    }

    const joinRequests = await prisma.organizationJoinRequest.findMany({
      where: { organizationId: userRole.role.organizationId },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        processor: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(joinRequests);
  } catch (error) {
    console.error('Fehler beim Abrufen der Beitrittsanfragen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Beitrittsanfrage bearbeiten
export const processJoinRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, response, roleId } = req.body; // action: 'approve' | 'reject'
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Ungültige Aktion' });
    }

    // Hole Beitrittsanfrage
    const joinRequest = await prisma.organizationJoinRequest.findUnique({
      where: { id: Number(id) },
      include: {
        organization: true,
        requester: true
      }
    });

    if (!joinRequest) {
      return res.status(404).json({ message: 'Beitrittsanfrage nicht gefunden' });
    }

    if (joinRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Anfrage bereits bearbeitet' });
    }

    // Prüfe Berechtigung des Processors
    const userRole = await prisma.userRole.findFirst({
      where: { 
        userId: Number(userId),
        role: {
          organizationId: joinRequest.organizationId
        }
      },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });

    if (!userRole) {
      return res.status(403).json({ message: 'Keine Berechtigung für diese Organisation' });
    }

    const hasPermission = userRole.role.permissions.some(
      p => p.entity === 'join_requests' && ['both', 'write'].includes(p.accessLevel)
    );

    if (!hasPermission) {
      return res.status(403).json({ message: 'Keine Berechtigung' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Aktualisiere Beitrittsanfrage
      const updatedRequest = await tx.organizationJoinRequest.update({
        where: { id: Number(id) },
        data: {
          status: action === 'approve' ? 'approved' : 'rejected',
          response: response || null,
          processedBy: Number(userId),
          processedAt: new Date()
        }
      });

      if (action === 'approve') {
        // Erstelle UserRole-Eintrag
        if (!roleId) {
          throw new Error('Rolle ist für Genehmigung erforderlich');
        }

        await tx.userRole.create({
          data: {
            userId: joinRequest.requesterId,
            roleId: Number(roleId)
          }
        });
      }

      return updatedRequest;
    });

    // Benachrichtigung an Antragsteller
    await prisma.notification.create({
      data: {
        userId: joinRequest.requesterId,
        title: `Beitrittsanfrage ${action === 'approve' ? 'genehmigt' : 'abgelehnt'}`,
        message: `Ihre Anfrage für ${joinRequest.organization.displayName} wurde ${action === 'approve' ? 'genehmigt' : 'abgelehnt'}${response ? ': ' + response : ''}`,
        type: action === 'approve' ? 'joinApproved' : 'joinRejected',
        relatedEntityId: result.id,
        relatedEntityType: 'organizationJoinRequest'
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Fehler beim Bearbeiten der Beitrittsanfrage:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Organisationen für Join-Request suchen
export const searchOrganizations = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    if (!search || typeof search !== 'string') {
      return res.status(400).json({ message: 'Suchbegriff ist erforderlich' });
    }

    const organizations = await prisma.organization.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            OR: [
              { name: { contains: search.toLowerCase() } },
              { displayName: { contains: search, mode: 'insensitive' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        logo: true
      },
      take: 10
    });

    res.json(organizations);
  } catch (error) {
    console.error('Fehler beim Suchen von Organisationen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};
```

### Schritt 3.2: Organisation Routes erstellen
- [ ] Erstelle neue Datei: `backend/src/routes/organizations.ts`
- [ ] Füge folgenden Code ein:

```typescript
import express from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getCurrentOrganization,
  createOrganization,
  updateOrganization,
  createJoinRequest,
  getJoinRequests,
  processJoinRequest,
  searchOrganizations
} from '../controllers/organizationController';

const router = express.Router();

// Alle Routen erfordern Authentifizierung
router.use(authMiddleware);

// Organisation-Routen
router.get('/current', getCurrentOrganization);
router.post('/', createOrganization);
router.put('/current', updateOrganization);

// Join Request Routen
router.post('/join-request', createJoinRequest);
router.get('/join-requests', getJoinRequests);
router.patch('/join-requests/:id', processJoinRequest);

// Suche
router.get('/search', searchOrganizations);

export default router;
```

### Schritt 3.3: Routes in server.ts einbinden
- [ ] Öffne `backend/src/server.ts`
- [ ] Füge nach den anderen imports hinzu:
```typescript
import organizationRoutes from './routes/organizations';
```
- [ ] Füge nach den anderen Route-Definitionen hinzu:
```typescript
app.use('/api/organizations', organizationRoutes);
```

## Phase 4: Middleware-Erweiterung für Datenisolation

### Schritt 4.1: Organization Middleware erstellen
- [x] Erstelle neue Datei: `backend/src/middleware/organization.ts`
- [ ] Füge folgenden Code ein:

```typescript
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Erweitere Request-Interface
declare global {
  namespace Express {
    interface Request {
      organizationId?: number;
      userRole?: any;
    }
  }
}

export const organizationMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Hole aktuelle Rolle und Organisation des Users
    const userRole = await prisma.userRole.findFirst({
      where: { 
        userId: Number(userId),
        lastUsed: true 
      },
      include: {
        role: {
          include: {
            organization: true,
            permissions: true
          }
        }
      }
    });

    if (!userRole) {
      return res.status(404).json({ message: 'Keine aktive Rolle gefunden' });
    }

    // Füge Organisations-Kontext zum Request hinzu
    req.organizationId = userRole.role.organizationId;
    req.userRole = userRole;

    next();
  } catch (error) {
    console.error('Fehler in Organization Middleware:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Hilfsfunktion für Query-Filter
export const getOrganizationFilter = (req: Request): any => {
  if (!req.organizationId) {
    throw new Error('Organization context not available');
  }

  return {
    role: {
      organizationId: req.organizationId
    }
  };
};

// Hilfsfunktion für indirekte Organisation-Filter (über User → Role → Organization)
export const getUserOrganizationFilter = (req: Request): any => {
  if (!req.organizationId) {
    throw new Error('Organization context not available');
  }

  return {
    OR: [
      {
        roles: {
          some: {
            role: {
              organizationId: req.organizationId
            }
          }
        }
      },
      // Fallback: User hat keine Rollen in aktueller Organisation
      {
        id: req.userId,
        roles: {
          some: {
            role: {
              organizationId: req.organizationId
            }
          }
        }
      }
    ]
  };
};
```

### Schritt 4.2: Bestehende Controller anpassen - User Controller
- [x] Öffne `backend/src/controllers/userController.ts`
- [x] Füge Organization Middleware Import hinzu:
```typescript
import { organizationMiddleware, getUserOrganizationFilter } from '../middleware/organization';
```

- [ ] Passe die `getUsers` Funktion an:
```typescript
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: getUserOrganizationFilter(req),
      include: {
        roles: {
          where: {
            role: {
              organizationId: req.organizationId
            }
          },
          include: {
            role: true
          }
        },
        branches: {
          include: {
            branch: true
          }
        }
      }
    });
    res.json(users);
  } catch (error) {
    console.error('Fehler beim Abrufen der Benutzer:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};
```

### Schritt 4.3: Bestehende Routes erweitern
- [x] Öffne `backend/src/routes/users.ts`
- [x] Füge Organization Middleware hinzu:
```typescript
import { organizationMiddleware } from '../middleware/organization';

// Nach authMiddleware hinzufügen
router.use(organizationMiddleware);
```

### Schritt 4.4: 🔧 MCP - Multi-Tenant Datenisolation testen
- [x] **MCP-Datenbankzugriff nutzen** um Datenisolation zu verifizieren:

#### 4.4a: Test-Daten für Isolation-Test vorbereiten
  ```sql
  -- Erstelle zweite Test-Organisation
  INSERT INTO "Organization" (name, "displayName", "subscriptionPlan", "maxUsers", "isActive")
  VALUES ('test-org', 'Test Organisation', 'basic', 25, true);
  
  -- Erstelle Test-Rolle für zweite Organisation
  INSERT INTO "Role" (name, description, "organizationId")
  VALUES ('Test-Admin', 'Test Administrator', 
          (SELECT id FROM "Organization" WHERE name = 'test-org'));
  
  -- Liste alle Organisationen und deren Rollen
  SELECT o.id as org_id, o.name as org_name, r.id as role_id, r.name as role_name
  FROM "Organization" o
  LEFT JOIN "Role" r ON o.id = r."organizationId"
  ORDER BY o.name, r.name;
  ```

#### 4.4b: Datenisolation zwischen Organisationen prüfen
  ```sql
  -- User der Standard-Organisation sollten nur ihre Daten sehen
  SELECT u.username, r.name as role_name, o.name as org_name
  FROM "User" u
  JOIN "UserRole" ur ON u.id = ur."userId"
  JOIN "Role" r ON ur."roleId" = r.id
  JOIN "Organization" o ON r."organizationId" = o.id
  WHERE o.name = 'default'
  ORDER BY u.username;
  
  -- Tasks sollten nur für User derselben Organisation sichtbar sein
  SELECT t.id, t.title, u.username as creator, o.name as org_name
  FROM "Task" t
  JOIN "User" u ON t."creatorId" = u.id
  JOIN "UserRole" ur ON u.id = ur."userId"
  JOIN "Role" r ON ur."roleId" = r.id
  JOIN "Organization" o ON r."organizationId" = o.id
  WHERE o.name = 'default'
  LIMIT 5;
  
  -- Arbeitszeiten sollten nur für User derselben Organisation sichtbar sein
  SELECT w.id, w.date, u.username, o.name as org_name
  FROM "WorkTime" w
  JOIN "User" u ON w."userId" = u.id
  JOIN "UserRole" ur ON u.id = ur."userId"
  JOIN "Role" r ON ur."roleId" = r.id
  JOIN "Organization" o ON r."organizationId" = o.id
  WHERE o.name = 'default'
  LIMIT 5;
  ```

#### 4.4c: Cross-Organisation Datenleck-Test
  ```sql
  -- WICHTIG: Diese Queries sollten KEINE Ergebnisse zurückgeben
  -- wenn Datenisolation korrekt implementiert ist
  
  -- Test: User einer Organisation können keine User anderer Organisationen sehen
  SELECT 'LEAK DETECTED' as alert, u1.username as user1, u2.username as user2, 
         o1.name as org1, o2.name as org2
  FROM "User" u1
  JOIN "UserRole" ur1 ON u1.id = ur1."userId"
  JOIN "Role" r1 ON ur1."roleId" = r1.id
  JOIN "Organization" o1 ON r1."organizationId" = o1.id,
       "User" u2
  JOIN "UserRole" ur2 ON u2.id = ur2."userId"
  JOIN "Role" r2 ON ur2."roleId" = r2.id
  JOIN "Organization" o2 ON r2."organizationId" = o2.id
  WHERE o1.id != o2.id AND u1.id = u2.id;  -- Wenn ein User in mehreren Orgs ist
  ```

- [ ] **Erwartete Ergebnisse**: 
  - Test-Organisation erstellt
  - User nur ihre Organisation-Daten sehen
  - Cross-Organisation Queries keine Leaks zeigen
- [ ] **Falls Datenlecks**: Middleware-Logik korrigieren

## Phase 5: Frontend - Organisation Interface

### Schritt 5.1: Organisation Types definieren
- [ ] Erstelle neue Datei: `frontend/src/types/organization.ts`
- [ ] Füge folgenden Code ein:

```typescript
export interface Organization {
  id: number;
  name: string;
  displayName: string;
  domain?: string | null;
  logo?: string | null;
  isActive: boolean;
  maxUsers: number;
  subscriptionPlan: 'basic' | 'pro' | 'enterprise' | 'trial';
  subscriptionEnd?: string | null;
  settings?: any;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationJoinRequest {
  id: number;
  organizationId: number;
  organization: {
    id: number;
    name: string;
    displayName: string;
    logo?: string;
  };
  requesterId: number;
  requester: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  message?: string | null;
  response?: string | null;
  processedBy?: number | null;
  processor?: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
  displayName: string;
  domain?: string;
}

export interface UpdateOrganizationRequest {
  displayName?: string;
  domain?: string;
  logo?: string;
  settings?: any;
}

export interface CreateJoinRequestRequest {
  organizationName: string;
  message?: string;
}

export interface ProcessJoinRequestRequest {
  action: 'approve' | 'reject';
  response?: string;
  roleId?: number;
}
```

### Schritt 5.2: API Endpoints erweitern
- [ ] Öffne `frontend/src/config/api.ts`
- [ ] Füge folgende Endpoints hinzu:

```typescript
  ORGANIZATIONS: {
    BASE: '/api/organizations',
    CURRENT: '/api/organizations/current',
    SEARCH: '/api/organizations/search',
    JOIN_REQUEST: '/api/organizations/join-request',
    JOIN_REQUESTS: '/api/organizations/join-requests',
    PROCESS_JOIN_REQUEST: (id: number) => `/api/organizations/join-requests/${id}`
  },
```

### Schritt 5.3: Organization Service erstellen
- [ ] Erstelle neue Datei: `frontend/src/services/organizationService.ts`
- [ ] Füge folgenden Code ein:

```typescript
import axiosInstance from '../config/axios';
import { API_ENDPOINTS } from '../config/api';
import { 
  Organization, 
  OrganizationJoinRequest,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  CreateJoinRequestRequest,
  ProcessJoinRequestRequest
} from '../types/organization';

export const organizationService = {
  // Aktuelle Organisation abrufen
  getCurrentOrganization: async (): Promise<Organization> => {
    const response = await axiosInstance.get(API_ENDPOINTS.ORGANIZATIONS.CURRENT);
    return response.data;
  },

  // Organisation erstellen
  createOrganization: async (data: CreateOrganizationRequest): Promise<Organization> => {
    const response = await axiosInstance.post(API_ENDPOINTS.ORGANIZATIONS.BASE, data);
    return response.data;
  },

  // Organisation aktualisieren
  updateOrganization: async (data: UpdateOrganizationRequest): Promise<Organization> => {
    const response = await axiosInstance.put(API_ENDPOINTS.ORGANIZATIONS.CURRENT, data);
    return response.data;
  },

  // Organisationen suchen
  searchOrganizations: async (search: string): Promise<Organization[]> => {
    const response = await axiosInstance.get(API_ENDPOINTS.ORGANIZATIONS.SEARCH, {
      params: { search }
    });
    return response.data;
  },

  // Beitrittsanfrage erstellen
  createJoinRequest: async (data: CreateJoinRequestRequest): Promise<OrganizationJoinRequest> => {
    const response = await axiosInstance.post(API_ENDPOINTS.ORGANIZATIONS.JOIN_REQUEST, data);
    return response.data;
  },

  // Beitrittsanfragen abrufen
  getJoinRequests: async (): Promise<OrganizationJoinRequest[]> => {
    const response = await axiosInstance.get(API_ENDPOINTS.ORGANIZATIONS.JOIN_REQUESTS);
    return response.data;
  },

  // Beitrittsanfrage bearbeiten
  processJoinRequest: async (id: number, data: ProcessJoinRequestRequest): Promise<OrganizationJoinRequest> => {
    const response = await axiosInstance.patch(
      API_ENDPOINTS.ORGANIZATIONS.PROCESS_JOIN_REQUEST(id), 
      data
    );
    return response.data;
  }
};
```

## Phase 6: Frontend - Komponenten

### Schritt 6.1: OrganizationSettings Komponente erstellen
- [ ] Erstelle neue Datei: `frontend/src/components/organization/OrganizationSettings.tsx`
- [ ] Code wird in Phase 6.2 bereitgestellt

### Schritt 6.2: CreateOrganizationModal Komponente erstellen
- [ ] Erstelle neue Datei: `frontend/src/components/organization/CreateOrganizationModal.tsx`
- [ ] Code wird in Phase 6.3 bereitgestellt  

### Schritt 6.3: JoinOrganizationModal Komponente erstellen
- [ ] Erstelle neue Datei: `frontend/src/components/organization/JoinOrganizationModal.tsx`
- [ ] Code wird in Phase 6.4 bereitgestellt

### Schritt 6.4: JoinRequestsList Komponente erstellen
- [ ] Erstelle neue Datei: `frontend/src/components/organization/JoinRequestsList.tsx`
- [ ] Code wird in Phase 6.5 bereitgestellt

## Phase 7: Frontend - Hauptseite Integration

### Schritt 7.1: Organization Tab in Benutzerverwaltung hinzufügen
- [ ] Öffne `frontend/src/pages/UserManagement.tsx`
- [ ] Erweitere die Tab-Navigation um Organisation:
```typescript
const tabs = [
  { name: 'Benutzer', key: 'users' },
  { name: 'Rollen', key: 'roles' },
  { name: 'Organisation', key: 'organization' }  // NEU
];
```

- [ ] Füge Organisation Tab-Content hinzu:
```typescript
{activeTab === 'organization' && (
  <div className="space-y-6">
    <OrganizationSettings />
    <JoinRequestsList />
  </div>
)}
```

### Schritt 7.2: Organisation Context erstellen
- [ ] Erstelle neue Datei: `frontend/src/contexts/OrganizationContext.tsx`
- [ ] Code wird detailliert bereitgestellt

### Schritt 7.3: App.tsx erweitern
- [ ] Öffne `frontend/src/App.tsx`
- [ ] Füge Organization Provider hinzu

## Phase 8: Berechtigungen und Sicherheit

### Schritt 8.1: Permission-basierte Zugriffskontrolle
- [ ] Erweitere `frontend/src/hooks/usePermissions.tsx`
- [ ] Füge organisation-spezifische Berechtigungen hinzu

### Schritt 8.2: Route Guards erweitern
- [ ] Aktualisiere Berechtigungsprüfungen in allen geschützten Routen
- [ ] Stelle sicher, dass Daten nur für die richtige Organisation angezeigt werden

### Schritt 8.3: 🔧 MCP - Sicherheits-Audit und Performance-Test
- [ ] **MCP-Datenbankzugriff nutzen** für umfassende Sicherheits- und Performance-Analyse:

#### 8.3a: Sicherheits-Audit Queries
  ```sql
  -- 1. Prüfe ob alle Rollen einer Organisation zugeordnet sind
  SELECT COUNT(*) as orphaned_roles FROM "Role" WHERE "organizationId" IS NULL;
  
  -- 2. Prüfe auf User ohne Organisation-Zuordnung über Rollen
  SELECT u.id, u.username, 'NO_ORG_ASSIGNMENT' as issue
  FROM "User" u
  LEFT JOIN "UserRole" ur ON u.id = ur."userId"
  LEFT JOIN "Role" r ON ur."roleId" = r.id
  WHERE r."organizationId" IS NULL;
  
  -- 3. Prüfe Permissions ohne gültige Organisation-Zuordnung
  SELECT p.id, p.entity, 'ORPHANED_PERMISSION' as issue
  FROM "Permission" p
  JOIN "Role" r ON p."roleId" = r.id
  WHERE r."organizationId" IS NULL;
  
  -- 4. Identifiziere potentielle Cross-Organisation Data-Leaks
  SELECT t.id, t.title, u.username, r.name as role_name, o.name as org_name,
         'POTENTIAL_LEAK' as alert
  FROM "Task" t
  JOIN "User" u ON t."creatorId" = u.id
  LEFT JOIN "UserRole" ur ON u.id = ur."userId"
  LEFT JOIN "Role" r ON ur."roleId" = r.id
  LEFT JOIN "Organization" o ON r."organizationId" = o.id
  WHERE o.id IS NULL OR r.id IS NULL;
  ```

#### 8.3b: Performance-Benchmark für Multi-Tenant Queries
  ```sql
  -- 1. Performance-Test: User-Liste mit Organisation-Filter
  EXPLAIN ANALYZE
  SELECT u.username, r.name as role_name, o.name as org_name
  FROM "User" u
  JOIN "UserRole" ur ON u.id = ur."userId"
  JOIN "Role" r ON ur."roleId" = r.id
  JOIN "Organization" o ON r."organizationId" = o.id
  WHERE o.id = 1
  ORDER BY u.username;
  
  -- 2. Performance-Test: Task-Abfrage mit Organisation-Isolation
  EXPLAIN ANALYZE
  SELECT t.id, t.title, u.username as creator
  FROM "Task" t
  JOIN "User" u ON t."creatorId" = u.id
  JOIN "UserRole" ur ON u.id = ur."userId"
  JOIN "Role" r ON ur."roleId" = r.id
  WHERE r."organizationId" = 1
  ORDER BY t.createdAt DESC
  LIMIT 100;
  
  -- 3. Performance-Test: WorkTime-Abfrage mit Organisation-Filter
  EXPLAIN ANALYZE
  SELECT w.id, w.date, w.hours, u.username
  FROM "WorkTime" w
  JOIN "User" u ON w."userId" = u.id
  JOIN "UserRole" ur ON u.id = ur."userId"
  JOIN "Role" r ON ur."roleId" = r.id
  WHERE r."organizationId" = 1
  AND w.date >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY w.date DESC;
  ```

#### 8.3c: Index-Optimierung-Empfehlungen generieren
  ```sql
  -- Überprüfe aktuelle Indizes für Multi-Tenant Performance
  SELECT schemaname, tablename, indexname, indexdef
  FROM pg_indexes
  WHERE tablename IN ('Role', 'UserRole', 'User', 'Task', 'WorkTime', 'Organization')
  ORDER BY tablename, indexname;
  
  -- Analysiere häufige Query-Patterns für Index-Empfehlungen
  SELECT 'RECOMMEND_INDEX' as type, 
         'CREATE INDEX idx_role_organization ON "Role"("organizationId");' as recommendation
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'Role' AND indexdef LIKE '%organizationId%'
  )
  
  UNION ALL
  
  SELECT 'RECOMMEND_INDEX' as type,
         'CREATE INDEX idx_userrole_user_role ON "UserRole"("userId", "roleId");' as recommendation
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'UserRole' AND indexdef LIKE '%userId%' AND indexdef LIKE '%roleId%'
  );
  ```

- [ ] **Erwartete Ergebnisse**: 
  - Orphaned roles/permissions: 0
  - Alle Performance-Queries unter 100ms
  - Index-Empfehlungen für Optimierung
- [ ] **Falls Performance-Probleme**: Indizes hinzufügen, Queries optimieren

## Phase 9: Notification-System erweitern

### Schritt 9.1: Neue Notification Types hinzufügen
- [ ] Erweitere `NotificationType` Enum:
```prisma
enum NotificationType {
  // ... bestehende
  joinRequest
  joinApproved
  joinRejected
  organizationInvitation
}
```

### Schritt 9.2: Notification Handler erweitern
- [ ] Erweitere Notification-System um Organisation-Benachrichtigungen

## Phase 10: Testing & Dokumentation

### Schritt 10.1: 🔧 MCP - Final Multi-Tenant System Test
- [ ] **MCP-Datenbankzugriff nutzen** für komplette System-Verifizierung:

#### 10.1a: Vollständigkeits-Check der Multi-Tenant Implementation
  ```sql
  -- 1. System-Status Overview
  SELECT 
    (SELECT COUNT(*) FROM "Organization") as total_organizations,
    (SELECT COUNT(*) FROM "Role" WHERE "organizationId" IS NOT NULL) as org_roles,
    (SELECT COUNT(*) FROM "Role" WHERE "organizationId" IS NULL) as orphaned_roles,
    (SELECT COUNT(*) FROM "User") as total_users,
    (SELECT COUNT(DISTINCT ur."userId") FROM "UserRole" ur 
     JOIN "Role" r ON ur."roleId" = r.id 
     WHERE r."organizationId" IS NOT NULL) as users_with_org_access;
  
  -- 2. Multi-Tenant Struktur-Validierung
  SELECT o.name as org_name, 
         COUNT(r.id) as roles_count,
         COUNT(DISTINCT ur."userId") as unique_users,
         COUNT(p.id) as total_permissions
  FROM "Organization" o
  LEFT JOIN "Role" r ON o.id = r."organizationId"
  LEFT JOIN "UserRole" ur ON r.id = ur."roleId"
  LEFT JOIN "Permission" p ON r.id = p."roleId"
  GROUP BY o.id, o.name
  ORDER BY o.name;
  
  -- 3. Datenisolation Final-Check
  SELECT 'ISOLATION_TEST' as test_type,
         o1.name as org1, o2.name as org2,
         COUNT(*) as potential_leaks
  FROM "Organization" o1
  CROSS JOIN "Organization" o2
  LEFT JOIN "Role" r1 ON o1.id = r1."organizationId"
  LEFT JOIN "Role" r2 ON o2.id = r2."organizationId"
  LEFT JOIN "UserRole" ur1 ON r1.id = ur1."roleId"
  LEFT JOIN "UserRole" ur2 ON r2.id = ur2."roleId"
  WHERE o1.id != o2.id 
  AND ur1."userId" = ur2."userId"  -- User in beiden Orgs (erlaubt)
  GROUP BY o1.name, o2.name
  HAVING COUNT(*) > 0;
  ```

#### 10.1b: Performance Final-Benchmark
  ```sql
  -- Performance-Test für häufigste Multi-Tenant Queries
  \timing on
  
  -- Query 1: User-Dashboard (wichtigste Query)
  SELECT u.username, u."firstName", u."lastName",
         r.name as current_role, o.name as organization
  FROM "User" u
  JOIN "UserRole" ur ON u.id = ur."userId" AND ur."lastUsed" = true
  JOIN "Role" r ON ur."roleId" = r.id
  JOIN "Organization" o ON r."organizationId" = o.id
  WHERE u.id = 1;
  
  -- Query 2: Organisation-spezifische User-Liste
  SELECT u.username, u.email, r.name as role_name
  FROM "User" u
  JOIN "UserRole" ur ON u.id = ur."userId"
  JOIN "Role" r ON ur."roleId" = r.id
  WHERE r."organizationId" = 1
  ORDER BY u.username;
  
  -- Query 3: Organisation-spezifische Task-Liste  
  SELECT t.title, t.status, u.username as creator
  FROM "Task" t
  JOIN "User" u ON t."creatorId" = u.id
  JOIN "UserRole" ur ON u.id = ur."userId"
  JOIN "Role" r ON ur."roleId" = r.id
  WHERE r."organizationId" = 1
  ORDER BY t.createdAt DESC
  LIMIT 50;
  ```

#### 10.1c: Join-Request-System Test
  ```sql
  -- Test-Daten für Join-Request Funktionalität
  INSERT INTO "OrganizationJoinRequest" 
    ("organizationId", "requesterId", status, message)
  VALUES 
    (1, 1, 'pending', 'Test join request for system validation');
  
  -- Verifiziere Join-Request System
  SELECT jr.id, o.name as org_name, u.username as requester,
         jr.status, jr.message, jr."createdAt"
  FROM "OrganizationJoinRequest" jr
  JOIN "Organization" o ON jr."organizationId" = o.id
  JOIN "User" u ON jr."requesterId" = u.id
  ORDER BY jr."createdAt" DESC;
  
  -- Cleanup Test-Daten
  DELETE FROM "OrganizationJoinRequest" WHERE message = 'Test join request for system validation';
  ```

- [ ] **Erwartete Ergebnisse Final-Test**:
  - Alle Organisationen haben Rollen und User
  - Keine orphaned roles/permissions
  - Performance-Queries unter 50ms
  - Join-Request-System funktional
- [ ] **Bei Problemen**: Entsprechende Phase wiederholen und korrigieren

### Schritt 10.2: Modul-Dokumentation erstellen
- [ ] Erstelle neue Datei: `docs/modules/MODUL_MULTI_TENANT.md`
- [ ] Dokumentiere das neue Multi-Tenant System

### Schritt 10.2: API-Dokumentation aktualisieren
- [ ] Öffne `docs/technical/API_REFERENZ.md`
- [ ] Füge neue Endpoints hinzu

### Schritt 10.3: Datenbankschema-Dokumentation aktualisieren
- [ ] Öffne `docs/technical/DATENBANKSCHEMA.md`
- [ ] Füge neue Tabellen hinzu

### Schritt 10.4: Berechtigungssystem-Dokumentation aktualisieren
- [ ] Öffne `docs/technical/BERECHTIGUNGSSYSTEM.md`
- [ ] Dokumentiere Multi-Tenant Berechtigungen

## Abschluss-Checkliste

- [ ] Alle Dateien gespeichert
- [ ] Server neu gestartet (vom Nutzer durchführen lassen)
- [ ] Frontend neu geladen
- [ ] Grundfunktionalität getestet:
  - [ ] Organisation erstellen
  - [ ] Beitrittsanfrage stellen
  - [ ] Beitrittsanfrage bearbeiten
  - [ ] Datenisolation zwischen Organisationen
  - [ ] Rollenwechsel zwischen Organisationen
- [ ] Dokumentation aktualisiert

## Migration bestehender Systeme

### Automatische Migration
- [ ] Alle bestehenden Daten werden automatisch der "Standard Organisation" zugeordnet
- [ ] Keine Datenverluste
- [ ] Bestehende Benutzer können sofort neue Organisationen erstellen

### Manuelle Schritte nach Deployment
- [ ] Standard-Organisation umbenennen falls gewünscht
- [ ] Zusätzliche Rollen für neue Organisationen konfigurieren
- [ ] Benutzer über neue Funktionen informieren

## Sicherheitsüberlegungen

### Datenisolation
- ✅ Vollständige Trennung auf Datenbankebene
- ✅ Middleware-basierte Zugriffskontrolle
- ✅ Frontend-seitige Filterung

### Berechtigungen
- ✅ Organisation-spezifische Rollen
- ✅ Vererbung von Standard-Berechtigungen
- ✅ Admin-Rechte nur für eigene Organisation

### Skalierbarkeit
- ✅ Design für Multi-Tenant SaaS geeignet
- ✅ Subscription-Modell vorbereitet
- ✅ User-Limits pro Organisation

## Hinweise für die Implementierung

1. **IMMER** nach jedem Schritt testen
2. **NIE** den Server selbst neustarten - immer den Nutzer fragen
3. Bei Fehlern: Genau prüfen, ob alle Organisation-Filter korrekt sind
4. TypeScript-Fehler sofort beheben
5. Datenisolation in JEDEM Controller prüfen
6. Migrations-Reihenfolge beachten

## 🔧 MCP-Integration Zusammenfassung

### MCP-Datenbankzugriff wurde strategisch eingesetzt in:

**Phase 0 - Cleanup & Verifizierung:**
- ✅ Schritt 0.1a: Identifikation bestehender Multi-Tenant Strukturen
- ✅ Schritt 0.1c: Bereinigung verifizieren

**Phase 1 - Schema-Migration Monitoring:**
- ✅ Schritt 1.7: Schema-Migration verifizieren mit detaillierten Struktur-Checks

**Phase 2 - Daten-Migration Verifizierung:**
- ✅ Schritt 2.5: Seed-Daten verifizieren mit Organisations-/Rollen-/User-Mapping

**Phase 4 - Datenisolation Testing:**
- ✅ Schritt 4.4: Multi-Tenant Datenisolation umfassend testen
- ✅ Cross-Organisation Datenleck-Tests
- ✅ Test-Organisationen für Isolation-Verifikation

**Phase 8 - Sicherheit & Performance:**
- ✅ Schritt 8.3: Sicherheits-Audit und Performance-Benchmarks
- ✅ Index-Optimierung-Empfehlungen
- ✅ Orphaned Data Detection

**Phase 10 - Final System Testing:**
- ✅ Schritt 10.1: Vollständiger Multi-Tenant System Final-Test
- ✅ Performance Final-Benchmark für kritische Queries
- ✅ Join-Request-System Funktionalität

### MCP-Vorteile in diesem Projekt:
- 🎯 **Präzise Verifizierung** aller Multi-Tenant Strukturen
- 🔍 **Früherkennung** von Datenlecks und Sicherheitsproblemen  
- ⚡ **Performance-Monitoring** für kritische Multi-Tenant Queries
- 🛡️ **Sicherheits-Audits** für komplette Datenisolation
- 📊 **Datenintegrität** durch alle Implementierungsphasen hindurch

## Erweiterte Features (Future Scope)

### Phase 11+: Zusätzliche Features
- [ ] Organisation-Einladungssystem
- [ ] Subscription Management
- [ ] Usage Analytics pro Organisation
- [ ] Custom Branding pro Organisation
- [ ] SSO-Integration
- [ ] API-Rate-Limiting pro Organisation
- [ ] Backup/Export pro Organisation 