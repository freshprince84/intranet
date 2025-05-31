# DATENBANKSCHEMA

Diese Dokumentation beschreibt das vollständige Datenbankschema des Intranet-Systems, einschließlich aller Tabellen, Beziehungen und Constraints.

## Inhaltsverzeichnis

1. [Einführung](#einführung)
2. [Entity-Relationship-Diagramm](#entity-relationship-diagramm)
3. [Prisma Schema](#prisma-schema)
4. [Tabellenbeschreibungen](#tabellenbeschreibungen)
   - [User](#user)
   - [Role](#role)
   - [Permission](#permission)
   - [UserRole](#userrole)
   - [Branch](#branch)
   - [UsersBranches](#usersbranches)
   - [WorkTime](#worktime)
   - [Client](#client)
   - [WorkTimeTask](#worktimetask)
   - [Task](#task)
   - [Request](#request)
   - [Settings](#settings)
   - [Notification](#notification)
   - [NotificationSettings](#notificationsettings)
   - [UserNotificationSettings](#usernotificationsettings)
   - [CerebroCarticle](#cerebrocarticle)
   - [CerebroExternalLink](#cerebroexternallink)
   - [CerebroMedia](#cerebromedia)
   - [UserTableSettings](#usertablesettings)
   - [IdentificationDocument](#identificationdocument)
   - [SavedFilter](#savedfilter)
   - [TaskAttachment](#taskattachment)
   - [RequestAttachment](#requestattachment)
5. [Enums](#enums)
6. [Beziehungen](#beziehungen)
7. [Indices und Constraints](#indices-und-constraints)
8. [Migrationen](#migrationen)
9. [Seed-Daten](#seed-daten)
10. [Wichtige Hinweise](#wichtige-hinweise)

## Einführung

Das Datenbankschema basiert auf PostgreSQL und wird mit Prisma ORM verwaltet. Die Hauptdatei für die Schemadefinition ist `backend/prisma/schema.prisma`. 

Die Datenbank unterstützt alle Funktionen des Intranet-Systems, einschließlich:
- Benutzerverwaltung und Authentifizierung
- Rollen- und Berechtigungssystem
- Zeiterfassung
- Kundenberatungen und Client-Verwaltung
- Aufgabenverwaltung
- Anfragen- und Genehmigungsworkflow
- Benachrichtigungssystem
- Cerebro Wiki
- Einstellungen
- Lohnabrechnung

## Entity-Relationship-Diagramm

```
User (1) --- (*) WorkTime
User (1) --- (*) Task (responsible)
User (1) --- (*) Task (qualityControl)
User (1) --- (*) Request (requester)
User (1) --- (*) Request (responsible)
User (1) --- (*) Notification
User (1) --- (*) CerebroCarticle
User (1) --- (*) UserRole
User (1) --- (*) SavedFilter
Role (1) --- (*) UserRole
Role (1) --- (*) Permission
Branch (1) --- (*) WorkTime
Branch (1) --- (*) Task
Branch (1) --- (*) Request
Branch (1) --- (*) UsersBranches
User (1) --- (*) UsersBranches
User (1) --- (1) Settings
User (1) --- (1) UserTableSettings
User (1) --- (1) UserNotificationSettings
```

## Prisma Schema

Das vollständige Prisma-Schema wird in der Datei `backend/prisma/schema.prisma` definiert:

```prisma
model User {
  id                 Int       @id @default(autoincrement())
  username           String    @unique
  email              String    @unique
  password           String
  firstName          String
  lastName           String
  birthday           DateTime?
  bankDetails        String?
  contract           String?
  salary             Float?
  normalWorkingHours Float     @default(7.6)  // Standard: 7,6h für Kolumbien
  country            String    @default("CO") // Standard: Kolumbien
  language           String    @default("es") // Standard: Spanisch
  roles              UserRole[]
  branches           UsersBranches[]
  workTimes          WorkTime[]
  tasksResponsible   Task[]    @relation("responsible")
  tasksQualityControl Task[]   @relation("quality_control")
  requestsRequester  Request[] @relation("requester")
  requestsResponsible Request[] @relation("responsible")
  settings           Settings?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  cerebroCarticles   CerebroCarticle[]
  cerebroExternalLinks CerebroExternalLink[]
  notifications      Notification[]
  userTableSettings  UserTableSettings[]
  userNotificationSettings UserNotificationSettings?
}

model Role {
  id          Int       @id @default(autoincrement())
  name        String    @unique
  description String?
  users       UserRole[]
  permissions Permission[]
}

model UserRole {
  id        Int      @id @default(autoincrement())
  user      User     @relation(fields: [userId], references: [id])
  userId    Int
  role      Role     @relation(fields: [roleId], references: [id])
  roleId    Int
  lastUsed  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, roleId])
}

model UserTableSettings {
  id           Int      @id @default(autoincrement())
  userId       Int
  tableId      String   // Identifier für die Tabelle (z.B. "worktracker_tasks", "requests")
  columnOrder  String   // JSON-String mit der Reihenfolge der Spalten
  hiddenColumns String   // JSON-String mit versteckten Spalten
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id])

  @@unique([userId, tableId])
}

model Permission {
  id          Int      @id @default(autoincrement())
  entity      String   // Früher 'page', jetzt für Seiten und Tabellen
  entityType  String   @default("page") // "page" oder "table"
  accessLevel String
  role        Role     @relation(fields: [roleId], references: [id])
  roleId      Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Branch {
  id        Int             @id @default(autoincrement())
  name      String         @unique
  users     UsersBranches[]
  workTimes WorkTime[]
  tasks     Task[]
  requests  Request[]
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
}

model UsersBranches {
  id        Int      @id @default(autoincrement())
  user      User     @relation(fields: [userId], references: [id])
  userId    Int
  branch    Branch   @relation(fields: [branchId], references: [id])
  branchId  Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, branchId])
}

model WorkTime {
  id        Int       @id @default(autoincrement())
  user      User      @relation(fields: [userId], references: [id])
  userId    Int
  branch    Branch    @relation(fields: [branchId], references: [id])
  branchId  Int
  startTime DateTime  // Enthält die lokale Systemzeit des Benutzers ohne UTC-Konvertierung 
  endTime   DateTime? // Enthält die lokale Systemzeit des Benutzers ohne UTC-Konvertierung
  timezone  String?   // Speichert die Zeitzone des Benutzers, z.B. "America/Bogota"
  clientId  Int?      // Client-ID für Beratungen
  notes     String?   // Notizen zur Beratung
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Task {
  id               Int       @id @default(autoincrement())
  title           String
  description     String?
  status          TaskStatus @default(open)
  responsible     User       @relation("responsible", fields: [responsibleId], references: [id])
  responsibleId   Int
  qualityControl  User       @relation("quality_control", fields: [qualityControlId], references: [id])
  qualityControlId Int
  branch          Branch     @relation(fields: [branchId], references: [id])
  branchId        Int
  dueDate         DateTime?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
}

model Request {
  id             Int           @id @default(autoincrement())
  title         String
  description   String?
  status        RequestStatus  @default(approval)
  requester     User          @relation("requester", fields: [requesterId], references: [id])
  requesterId   Int
  responsible   User          @relation("responsible", fields: [responsibleId], references: [id])
  responsibleId Int
  branch        Branch        @relation(fields: [branchId], references: [id])
  branchId      Int
  dueDate       DateTime?
  createTodo    Boolean       @default(false)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model Settings {
  id         Int      @id @default(autoincrement())
  user       User     @relation(fields: [userId], references: [id])
  userId     Int      @unique
  companyLogo String?
  darkMode   Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model Notification {
  id               Int              @id @default(autoincrement())
  user             User             @relation(fields: [userId], references: [id])
  userId           Int
  title            String
  message          String
  type             NotificationType
  read             Boolean          @default(false)
  relatedEntityId  Int?
  relatedEntityType String?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
}

model NotificationSettings {
  id                Int       @id @default(autoincrement())
  taskCreate        Boolean   @default(true)
  taskUpdate        Boolean   @default(true)
  taskDelete        Boolean   @default(true)
  taskStatusChange  Boolean   @default(true)
  requestCreate     Boolean   @default(true)
  requestUpdate     Boolean   @default(true)
  requestDelete     Boolean   @default(true)
  requestStatusChange Boolean  @default(true)
  userCreate        Boolean   @default(true)
  userUpdate        Boolean   @default(true)
  userDelete        Boolean   @default(true)
  roleCreate        Boolean   @default(true)
  roleUpdate        Boolean   @default(true)
  roleDelete        Boolean   @default(true)
  worktimeStart     Boolean   @default(true)
  worktimeStop      Boolean   @default(true)
  worktimeAutoStop  Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model UserNotificationSettings {
  id                Int       @id @default(autoincrement())
  user              User      @relation(fields: [userId], references: [id])
  userId            Int       @unique
  taskCreate        Boolean?
  taskUpdate        Boolean?
  taskDelete        Boolean?
  taskStatusChange  Boolean?
  requestCreate     Boolean?
  requestUpdate     Boolean?
  requestDelete     Boolean?
  requestStatusChange Boolean?
  userCreate        Boolean?
  userUpdate        Boolean?
  userDelete        Boolean?
  roleCreate        Boolean?
  roleUpdate        Boolean?
  roleDelete        Boolean?
  worktimeStart     Boolean?
  worktimeStop      Boolean?
  worktimeAutoStop  Boolean?  @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model CerebroCarticle {
  id            Int      @id @default(autoincrement())
  title         String
  slug          String   @unique
  content       String
  position      Int?
  isPublished   Boolean  @default(false)
  parent        CerebroCarticle?  @relation("CerebroCarticleRelation", fields: [parentId], references: [id])
  parentId      Int?
  children      CerebroCarticle[] @relation("CerebroCarticleRelation")
  createdBy     User     @relation(fields: [createdById], references: [id])
  createdById   Int
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  githubPath    String?
  links         CerebroExternalLink[]
  media         CerebroMedia[]
}

model CerebroExternalLink {
  id          Int      @id @default(autoincrement())
  url         String
  title       String
  type        String
  carticle    CerebroCarticle @relation(fields: [carticleId], references: [id])
  carticleId  Int
  createdBy   User     @relation(fields: [createdById], references: [id])
  createdById Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model CerebroMedia {
  id          Int      @id @default(autoincrement())
  filename    String
  mimetype    String
  url         String
  carticle    CerebroCarticle @relation(fields: [carticleId], references: [id])
  carticleId  Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model IdentificationDocument {
  id               Int       @id @default(autoincrement())
  userId           Int
  documentType     String
  documentNumber   String
  issueDate        DateTime?
  expiryDate       DateTime?
  issuingCountry   String
  issuingAuthority String?
  documentFile     String?
  isVerified       Boolean   @default(false)
  verificationDate DateTime?
  verifiedBy       Int?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  
  user       User  @relation(fields: [userId], references: [id])
  verifier   User? @relation("DocumentVerifier", fields: [verifiedBy], references: [id])
}

model SavedFilter {
  id          Int       @id @default(autoincrement())
  userId      Int
  tableId     String
  name        String
  conditions  String
  operators   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model TaskAttachment {
  id        Int       @id @default(autoincrement())
  taskId    Int
  fileName  String
  fileType  String
  fileSize  Int
  filePath  String
  uploadedAt DateTime @default(now())
}

model RequestAttachment {
  id        Int       @id @default(autoincrement())
  requestId Int
  fileName  String
  fileType  String
  fileSize  Int
  filePath  String
  uploadedAt DateTime @default(now())
}

enum TaskStatus {
  open
  in_progress
  improval
  quality_control
  done
}

enum RequestStatus {
  approval
  approved
  to_improve
  denied
}

enum NotificationType {
  task
  request
  user
  role
  worktime
  system
}
```

## Tabellenbeschreibungen

### User

Die `User`-Tabelle speichert alle Benutzerinformationen.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| username | String | Benutzername | @unique |
| email | String | E-Mail-Adresse | @unique |
| password | String | Gehashtes Passwort | |
| firstName | String | Vorname | |
| lastName | String | Nachname | |
| birthday | DateTime | Geburtstag | @nullable |
| bankDetails | String | Bankverbindung | @nullable |
| contract | String | Vertragsinformationen | @nullable |
| salary | Float | Gehalt | @nullable |
| normalWorkingHours | Float | Normale Arbeitszeit pro Tag | @default(7.6) |
| country | String | Land | @default("CO") |
| language | String | Sprache | @default("es") |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### Role

Die `Role`-Tabelle definiert Benutzerrollen mit zugehörigen Berechtigungen.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| name | String | Rollenname | @unique |
| description | String | Beschreibung der Rolle | @nullable |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### Permission

Die `Permission`-Tabelle definiert verfügbare System-Berechtigungen.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| entity | String | Entität, für die Berechtigung gilt | |
| entityType | String | Typ der Entität (page, table) | @default("page") |
| accessLevel | String | Zugriffsebene | |
| roleId | Int | Referenz zur Rolle | @foreign key |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### UserRole

Die `UserRole`-Tabelle verbindet Benutzer mit Rollen (N:M-Beziehung).

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| userId | Int | Referenz zum Benutzer | @foreign key |
| roleId | Int | Referenz zur Rolle | @foreign key |
| lastUsed | Boolean | Ob diese Rolle zuletzt genutzt wurde | @default(false) |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### Branch

Die `Branch`-Tabelle speichert Informationen zu Unternehmensniederlassungen.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| name | String | Name der Niederlassung | @unique |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### UsersBranches

Die `UsersBranches`-Tabelle verbindet Benutzer mit Niederlassungen (N:M-Beziehung).

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| userId | Int | Referenz zum Benutzer | @foreign key |
| branchId | Int | Referenz zur Niederlassung | @foreign key |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### WorkTime

Die `WorkTime`-Tabelle protokolliert die Arbeitszeiterfassung und wurde für Beratungen erweitert.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| userId | Int | Benutzer-ID | @foreign key |
| branchId | Int | Niederlassungs-ID | @foreign key |
| startTime | DateTime | Startzeitpunkt | |
| endTime | DateTime | Endzeitpunkt | @nullable |
| timezone | String | Zeitzone des Benutzers | @nullable |
| clientId | Int | Client-ID für Beratungen | @foreign key @nullable |
| notes | String | Notizen zur Beratung | @nullable |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

#### Beziehungen
- `user`: Many-to-One zu User
- `branch`: Many-to-One zu Branch  
- `client`: Many-to-One zu Client (für Beratungen)
- `taskLinks`: One-to-Many zu WorkTimeTask

### Client

Die `Client`-Tabelle speichert Informationen über Kunden für Beratungen.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|-------------|
| id | Int | Primärschlüssel | PK, Auto-increment |
| name | String | Name des Clients | NOT NULL |
| company | String | Firmenname | @nullable |
| email | String | E-Mail-Adresse | @nullable |
| phone | String | Telefonnummer | @nullable |
| address | String | Adresse | @nullable |
| notes | String | Allgemeine Notizen | Text @nullable |
| isActive | Boolean | Aktiv-Status | DEFAULT true |
| createdAt | DateTime | Erstellungszeitpunkt | DEFAULT now() |
| updatedAt | DateTime | Letztes Update | @updatedAt |

#### Beziehungen
- `workTimes`: One-to-Many zu WorkTime (alle Beratungen mit diesem Client)

### WorkTimeTask

Verknüpfungstabelle zwischen WorkTime (Beratungen) und Tasks.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|-------------|
| id | Int | Primärschlüssel | PK, Auto-increment |
| workTimeId | Int | Verweis auf WorkTime | FK zu WorkTime |
| taskId | Int | Verweis auf Task | FK zu Task |
| createdAt | DateTime | Erstellungszeitpunkt | DEFAULT now() |

#### Constraints
- Unique Index auf (workTimeId, taskId)

#### Beziehungen
- `workTime`: Many-to-One zu WorkTime
- `task`: Many-to-One zu Task

### Task

Die `Task`-Tabelle verwaltet Aufgaben und wurde für Beratungsverknüpfungen erweitert.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| title | String | Aufgabentitel | |
| description | String | Aufgabenbeschreibung | @nullable |
| status | TaskStatus | Status (z.B. open, in_progress) | @default(open) |
| responsibleId | Int | Verantwortlicher Benutzer | @foreign key |
| qualityControlId | Int | Qualitätskontrolle Benutzer | @foreign key |
| branchId | Int | Niederlassungs-ID | @foreign key |
| dueDate | DateTime | Fälligkeitsdatum | @nullable |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

#### Neue Beziehungen
- `workTimeLinks`: One-to-Many zu WorkTimeTask (Verknüpfungen mit Beratungen)

### Request

Die `Request`-Tabelle verwaltet Anfragen und Genehmigungen.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| title | String | Anfragentitel | |
| description | String | Beschreibung | @nullable |
| status | RequestStatus | Status (z.B. approval, approved) | @default(approval) |
| requesterId | Int | Anfragender Benutzer | @foreign key |
| responsibleId | Int | Zuständiger Benutzer | @foreign key |
| branchId | Int | Niederlassungs-ID | @foreign key |
| dueDate | DateTime | Fälligkeitsdatum | @nullable |
| createTodo | Boolean | Ob Task erstellt werden soll | @default(false) |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### Settings

Die `Settings`-Tabelle speichert benutzerspezifische Einstellungen.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| userId | Int | Benutzer-ID | @foreign key @unique |
| companyLogo | String | Logo-Pfad | @nullable |
| darkMode | Boolean | Dark Mode aktiviert | @default(false) |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### Notification

Die `Notification`-Tabelle speichert Benutzerbenachrichtigungen.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| userId | Int | Empfänger-Benutzer | @foreign key |
| title | String | Titel | |
| message | String | Nachrichteninhalt | |
| type | NotificationType | Typ der Benachrichtigung | |
| read | Boolean | Gelesen-Status | @default(false) |
| relatedEntityId | Int | ID der referenzierten Entität | @nullable |
| relatedEntityType | String | Typ der referenzierten Entität | @nullable |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### NotificationSettings

Die `NotificationSettings`-Tabelle definiert globale Benachrichtigungseinstellungen.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| taskCreate | Boolean | Bei Task-Erstellung | @default(true) |
| taskUpdate | Boolean | Bei Task-Aktualisierung | @default(true) |
| taskDelete | Boolean | Bei Task-Löschung | @default(true) |
| taskStatusChange | Boolean | Bei Task-Statusänderung | @default(true) |
| requestCreate | Boolean | Bei Request-Erstellung | @default(true) |
| requestUpdate | Boolean | Bei Request-Aktualisierung | @default(true) |
| requestDelete | Boolean | Bei Request-Löschung | @default(true) |
| requestStatusChange | Boolean | Bei Request-Statusänderung | @default(true) |
| userCreate | Boolean | Bei Benutzer-Erstellung | @default(true) |
| userUpdate | Boolean | Bei Benutzer-Aktualisierung | @default(true) |
| userDelete | Boolean | Bei Benutzer-Löschung | @default(true) |
| roleCreate | Boolean | Bei Rollen-Erstellung | @default(true) |
| roleUpdate | Boolean | Bei Rollen-Aktualisierung | @default(true) |
| roleDelete | Boolean | Bei Rollen-Löschung | @default(true) |
| worktimeStart | Boolean | Bei Arbeitszeitbeginn | @default(true) |
| worktimeStop | Boolean | Bei Arbeitszeitende | @default(true) |
| worktimeAutoStop | Boolean | Bei automatischem Arbeitszeitende | @default(true) |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### UserNotificationSettings

Die `UserNotificationSettings`-Tabelle speichert benutzerspezifische Benachrichtigungseinstellungen.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| userId | Int | Benutzer-ID | @foreign key @unique |
| taskCreate | Boolean | Bei Task-Erstellung | @nullable |
| taskUpdate | Boolean | Bei Task-Aktualisierung | @nullable |
| taskDelete | Boolean | Bei Task-Löschung | @nullable |
| taskStatusChange | Boolean | Bei Task-Statusänderung | @nullable |
| requestCreate | Boolean | Bei Request-Erstellung | @nullable |
| requestUpdate | Boolean | Bei Request-Aktualisierung | @nullable |
| requestDelete | Boolean | Bei Request-Löschung | @nullable |
| requestStatusChange | Boolean | Bei Request-Statusänderung | @nullable |
| userCreate | Boolean | Bei Benutzer-Erstellung | @nullable |
| userUpdate | Boolean | Bei Benutzer-Aktualisierung | @nullable |
| userDelete | Boolean | Bei Benutzer-Löschung | @nullable |
| roleCreate | Boolean | Bei Rollen-Erstellung | @nullable |
| roleUpdate | Boolean | Bei Rollen-Aktualisierung | @nullable |
| roleDelete | Boolean | Bei Rollen-Löschung | @nullable |
| worktimeStart | Boolean | Bei Arbeitszeitbeginn | @nullable |
| worktimeStop | Boolean | Bei Arbeitszeitende | @nullable |
| worktimeAutoStop | Boolean | Bei automatischem Arbeitszeitende | @default(true) |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### CerebroCarticle

Die `CerebroCarticle`-Tabelle speichert Wiki-Artikel.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| title | String | Artikeltitel | |
| slug | String | URL-freundlicher Slug | @unique |
| content | String | Artikelinhalt (Markdown) | |
| position | Int | Position im Menü | @nullable |
| isPublished | Boolean | Veröffentlichungsstatus | @default(false) |
| parentId | Int | Übergeordneter Artikel | @foreign key @nullable |
| createdById | Int | Autor-ID | @foreign key |
| githubPath | String | Pfad zur GitHub-Datei | @nullable |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### CerebroExternalLink

Die `CerebroExternalLink`-Tabelle speichert externe Links für Wiki-Artikel.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| url | String | Link-URL | |
| title | String | Link-Titel | |
| type | String | Link-Typ | |
| carticleId | Int | Artikel-ID | @foreign key |
| createdById | Int | Ersteller-ID | @foreign key |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### CerebroMedia

Die `CerebroMedia`-Tabelle speichert Medien für Wiki-Artikel.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| filename | String | Dateiname | |
| mimetype | String | MIME-Typ | |
| url | String | Datei-URL | |
| carticleId | Int | Artikel-ID | @foreign key |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### UserTableSettings

Die `UserTableSettings`-Tabelle speichert benutzerspezifische Tabelleneinstellungen.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| userId | Int | Benutzer-ID | @foreign key |
| tableId | String | Tabellen-Identifier | |
| columnOrder | String | Spaltenreihenfolge (JSON) | |
| hiddenColumns | String | Versteckte Spalten (JSON) | |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### IdentificationDocument

Speichert Informationen über Ausweisdokumente der Benutzer.

| Feld | Typ | Beschreibung | Constraints |
|------|-----|--------------|-------------|
| id | Integer | Eindeutige ID | @id @default(autoincrement()) |
| userId | Integer | ID des Benutzers | @relation(fields: [userId], references: [id]) |
| documentType | String | Typ des Dokuments (z.B. "passport") | |
| documentNumber | String | Dokumentnummer | |
| issueDate | DateTime? | Ausstellungsdatum | Nullable |
| expiryDate | DateTime? | Ablaufdatum | Nullable |
| issuingCountry | String | Ausstellungsland | |
| issuingAuthority | String? | Ausstellungsbehörde | Nullable |
| documentFile | String? | Pfad zur gespeicherten Datei | Nullable |
| isVerified | Boolean | Verifizierungsstatus | @default(false) |
| verificationDate | DateTime? | Datum der Verifizierung | Nullable |
| verifiedBy | Integer? | ID des verifizierenden Administrators | Nullable, @relation("DocumentVerifier") |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Letzter Aktualisierungszeitpunkt | @updatedAt |

### SavedFilter

Die `SavedFilter`-Tabelle speichert gespeicherte Filtereinstellungen für verschiedene Tabellen im System.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| userId | Int | ID des Benutzers, dem der Filter gehört | Foreign Key zu User |
| tableId | String | Identifier der Tabelle, zu der der Filter gehört | |
| name | String | Name des gespeicherten Filters | |
| conditions | String | JSON-String mit den Filterbedingungen | |
| operators | String | JSON-String mit den Filteroperatoren (AND/OR) | |
| createdAt | DateTime | Erstellungsdatum | @default(now()) |
| updatedAt | DateTime | Datum der letzten Aktualisierung | @updatedAt |

Die Tabelle ermöglicht Benutzern das Speichern und Wiederverwenden komplexer Filtereinstellungen in verschiedenen Tabellendarstellungen des Systems. Die Filterbedingungen und Operatoren werden als JSON-Strings gespeichert und beim Laden deserialisiert.

### TaskAttachment

Die `TaskAttachment`-Tabelle speichert Dateianhänge für Tasks.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| taskId | Int | Task-ID | @foreign key |
| fileName | String | Originaler Dateiname | |
| fileType | String | MIME-Typ der Datei | |
| fileSize | Int | Dateigröße in Bytes | |
| filePath | String | Pfad zur gespeicherten Datei | |
| uploadedAt | DateTime | Zeitpunkt des Uploads | @default(now()) |

Die Tabelle hat eine Beziehung zu `Task` mit einer Cascade-Delete-Funktionalität, d.h. wenn ein Task gelöscht wird, werden auch alle zugehörigen Anhänge entfernt.

### RequestAttachment

Die `RequestAttachment`-Tabelle speichert Dateianhänge für Requests.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| requestId | Int | Request-ID | @foreign key |
| fileName | String | Originaler Dateiname | |
| fileType | String | MIME-Typ der Datei | |
| fileSize | Int | Dateigröße in Bytes | |
| filePath | String | Pfad zur gespeicherten Datei | |
| uploadedAt | DateTime | Zeitpunkt des Uploads | @default(now()) |

Die Tabelle hat eine Beziehung zu `Request` mit einer Cascade-Delete-Funktionalität, d.h. wenn ein Request gelöscht wird, werden auch alle zugehörigen Anhänge entfernt.

## Enums

### TaskStatus
- `open` - Offen
- `in_progress` - In Bearbeitung
- `improval` - Verbesserung notwendig
- `quality_control` - In Qualitätskontrolle
- `done` - Abgeschlossen

### RequestStatus
- `approval` - Genehmigung erforderlich
- `approved` - Genehmigt
- `to_improve` - Verbesserung notwendig
- `denied` - Abgelehnt

### NotificationType
- `task` - Aufgabenbezogen
- `request` - Anfragebezogen
- `user` - Benutzerbezogen
- `role` - Rollenbezogen
- `worktime` - Arbeitszeitbezogen
- `system` - Systembezogen

## Beziehungen

### Hauptbeziehungen

1. **Benutzer-Rollen**: N:M-Beziehung über die `UserRole`-Tabelle
2. **Benutzer-Niederlassungen**: N:M-Beziehung über die `UsersBranches`-Tabelle
3. **Aufgaben-Verantwortlichkeiten**: Zwei 1:N-Beziehungen zwischen `User` und `Task` (responsible und qualityControl)
4. **Anfragen-Verantwortlichkeiten**: Zwei 1:N-Beziehungen zwischen `User` und `Request` (requester und responsible)
5. **Hierarchische Artikel**: Selbst-referenzierende 1:N-Beziehung in `CerebroCarticle` (parent-children)

- **User ←→ IdentificationDocument**: Ein Benutzer kann mehrere Ausweisdokumente haben (1:n)
- **User ←→ IdentificationDocument (Verifier)**: Ein Administrator kann viele Dokumente verifizieren (1:n, über verifiedBy)

## Indices und Constraints

Folgende Unique-Constraints sind im Schema definiert:
- `User.username` und `User.email` müssen eindeutig sein
- `Role.name` muss eindeutig sein
- `Branch.name` muss eindeutig sein
- `CerebroCarticle.slug` muss eindeutig sein
- `[userId, roleId]` in der `UserRole`-Tabelle
- `[userId, branchId]` in der `UsersBranches`-Tabelle
- `[userId, tableId]` in der `UserTableSettings`-Tabelle

## Migrationen

Bei Schemaänderungen werden Prisma-Migrationen verwendet:

```bash
# Migration erstellen
npx prisma migrate dev --name migration_name

# Migration in Produktion anwenden
npx prisma migrate deploy
```

## Seed-Daten

Die Datenbank wird mit Standarddaten über die Seed-Funktion befüllt. Der Seed-Code befindet sich in `backend/prisma/seed.ts` und erstellt:

- Standard-Rollen (Admin, User, Hamburger)
- Berechtigungen für jede Rolle
- Admin-Benutzer
- Standardeinstellungen
- Niederlassungen
- Cerebro Markdown-Dateien

## Wichtige Hinweise

Bei Änderungen am Datenbankschema:

- **Vor** Änderungen am Schema immer ein Backup der Daten erstellen
- Bei Umbenennungen von Spalten gehen Daten standardmäßig verloren, wenn nicht manuell migriert wird
- Zeitstempel (`createdAt`, `updatedAt`) werden automatisch verwaltet
- Bei Fremdschlüsseln darauf achten, dass Eltern-Entitäten vor Kind-Entitäten existieren
- Die Prisma-Dokumentation zu Rate ziehen: https://www.prisma.io/docs/ 