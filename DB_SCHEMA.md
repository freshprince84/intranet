# Datenbank-Schema

Dieses Dokument beschreibt die Struktur der Datenbank für das Intranet-Projekt. Das Schema wird mit Prisma verwaltet und befindet sich in `backend/prisma/schema.prisma`.

## Prisma Schema

```prisma
model User {
  id            Int       @id @default(autoincrement())
  username      String    @unique
  email         String    @unique
  password      String
  firstName     String
  lastName      String
  birthday      DateTime?
  bankDetails   String?
  contract      String?
  salary        Float?
  roles         UserRole[]
  branches      UsersBranches[]
  workTimes     WorkTime[]
  tasksResponsible Task[] @relation("responsible")
  tasksQualityControl Task[] @relation("quality_control")
  requestsRequester Request[] @relation("requester")
  requestsResponsible Request[] @relation("responsible")
  settings      Settings?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
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

model Permission {
  id          Int      @id @default(autoincrement())
  page        String
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
  startTime DateTime
  endTime   DateTime?
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
```

## Status-Logik
- **Tasks**: 
  - `improval` wird gesetzt, wenn eine Aufgabe von `quality_control` zurückgewiesen wird.
- **Requests**: 
  - `to_improve` wird gesetzt, wenn eine Anfrage von `approval` zurückgewiesen wird.

## Rolle und Berechtigungen
- Ein Benutzer erhält bei der Anmeldung die zuletzt verwendete Rolle (Feld `lastUsed` in `UserRole`).
- `Permission` steuert Berechtigungen pro Rolle und Seite mit den Werten: `read`, `write`, `both`, `none`.

## Beziehungen
Alle Beziehungen sind im Prisma-Schema mit den entsprechenden Relationen definiert:
- `User` ↔ `Role`: Viele-zu-viele über `UserRole`
- `User` ↔ `Branch`: Viele-zu-viele über `UsersBranches`
- `Task` und `Request` haben Beziehungen zu `User` (für Verantwortliche, Anfragende) und `Branch`
- `WorkTime` verknüpft `User` mit `Branch`

## Datenbank-Verwaltung

### Migration erstellen
```bash
npx prisma migrate dev --name <migration_name>
```

### Datenbank zurücksetzen
```bash
npx prisma migrate reset
```

### Seed-Daten laden
```bash
npx prisma db seed
```
