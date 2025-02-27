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
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
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

## Status-Logik
- **Tasks**: 
  - `improval` wird gesetzt, wenn eine Aufgabe von `quality_control` zurückgewiesen wird.
- **Requests**: 
  - `to_improve` wird gesetzt, wenn eine Anfrage von `approval` zurückgewiesen wird.

## Benachrichtigungen
Die Anwendung umfasst ein umfassendes Benachrichtigungssystem, das Benutzer über wichtige Ereignisse informiert.

### Notification-Modell
- Speichert individuelle Benachrichtigungen für jeden Benutzer
- Jede Benachrichtigung hat einen Typ, Titel und Nachricht
- Benachrichtigungen können als gelesen/ungelesen markiert werden
- Optional können Benachrichtigungen mit bestimmten Entitäten verknüpft werden (z.B. Task, Request)

### NotificationSettings-Modell
- Speichert systemweite Einstellungen für Benachrichtigungen
- Jede Einstellung ist standardmäßig aktiviert (true)
- Steuert, welche Ereignistypen systemweit Benachrichtigungen auslösen:
  - Erstellen, Bearbeiten und Löschen von Tasks, Requests, Benutzern und Rollen
  - Statusänderungen bei Tasks und Requests
  - Start und Stopp von Zeiterfassungen

### UserNotificationSettings-Modell
- Ermöglicht benutzerspezifische Überschreibungen der systemweiten Einstellungen
- Jeder Benutzer kann individuell entscheiden, welche Benachrichtigungen er erhalten möchte
- Null-Werte bedeuten, dass die systemweite Einstellung verwendet wird

### NotificationType-Enum
Kategorisiert Benachrichtigungen nach ihrem Ursprung:
- `task`: Benachrichtigungen im Zusammenhang mit Aufgaben
- `request`: Benachrichtigungen im Zusammenhang mit Anfragen
- `user`: Benachrichtigungen im Zusammenhang mit Benutzerverwaltung
- `role`: Benachrichtigungen im Zusammenhang mit Rollenverwaltung
- `worktime`: Benachrichtigungen im Zusammenhang mit Zeiterfassung
- `system`: Systembenachrichtigungen

## Rolle und Berechtigungen
- Ein Benutzer erhält bei der Anmeldung die zuletzt verwendete Rolle (Feld `lastUsed` in `UserRole`).
- Wenn für einen Benutzer kein Eintrag mit `lastUsed=true` in der Tabelle `userrole` gefunden wird, wird die Standard-Rolle mit der ID 999 zugewiesen.
- Die Rolle mit ID 999 ist eine Standard-Fallback-Rolle und darf nicht gelöscht werden.
- `Permission` steuert Berechtigungen pro Rolle und Seite mit den Werten: `read`, `write`, `both`, `none`.

### Erweiterte Funktionalität

#### Rollenverwaltung
- **Rollen erstellen:** Neue Rollen können mit Namen, Beschreibung und spezifischen Berechtigungen erstellt werden.
- **Rollen bearbeiten:** Bestehende Rollen können modifiziert werden, inklusive Änderung der zugewiesenen Berechtigungen.
- **Rollen löschen:** Transaktionsgesicherte Löschung von Rollen einschließlich zugehöriger Berechtigungen.
  - Bei Löschung einer Rolle werden automatisch alle zugehörigen Berechtigungen gelöscht.
  - Wenn ein Benutzer die gelöschte Rolle als `lastUsed` markiert hatte, wird ihm automatisch eine andere verfügbare Rolle als `lastUsed` zugewiesen.
  - Die Zuweisung erfolgt nach einer logischen Priorität: zuerst wird nach einer Rolle mit höherer ID gesucht, falls nicht vorhanden, wird die Rolle mit der niedrigsten verfügbaren ID gewählt.
  - Die Standard-Rolle (ID 999) kann nicht gelöscht werden.

#### Berechtigungsverwaltung
- **Zugriffsebenen:** Jede Berechtigung hat eine der vier Zugriffsebenen:
  - `none`: Kein Zugriff auf die Seite/Funktion
  - `read`: Nur lesender Zugriff
  - `write`: Nur schreibender Zugriff
  - `both`: Voller Zugriff (lesen und schreiben)
- **Seiten:** Berechtigungen werden pro Seite zugewiesen, einschließlich:
  - `dashboard`: Startseite der Anwendung
  - `requests`: Anfragen-Management
  - `tasks`: Aufgaben-Management
  - `users`: Benutzerverwaltung
  - `roles`: Rollenverwaltung
  - `settings`: Einstellungen
  - `worktracker`: Zeiterfassung

#### Benutzerzuweisung
- **Rollenzuweisung:** Benutzern können mehrere Rollen zugewiesen werden.
- **Aktive Rolle:** Eine Rolle pro Benutzer wird als `lastUsed` markiert und bestimmt die aktiven Berechtigungen.
- **Rollenwechsel:** Benutzer können zwischen zugewiesenen Rollen über ein Untermenü im Profilmenü der Topbar wechseln. Nach der Auswahl wird die neu ausgewählte Rolle als `lastUsed` markiert, während alle anderen Rollen des Benutzers auf `lastUsed=false` gesetzt werden.
- **Visuelle Rückmeldung:** Die aktuelle aktive Rolle wird im Profilmenü mit dem Rollennamen angezeigt und im Rollen-Untermenü farblich hervorgehoben.

#### Fehlerbehandlung
- **Transaktionssicherheit:** Alle kritischen Operationen (Erstellen, Bearbeiten, Löschen) werden in Transaktionen ausgeführt, um Datenkonsistenz zu gewährleisten.
- **Spezifische Fehlermeldungen:** Bei Datenbankfehlern werden präzise Fehlermeldungen generiert (z.B. Duplikate, nicht vorhandene Einträge).
- **Frontend-Validierung:** Eingaben werden vor dem Absenden validiert (z.B. Rollennamen müssen ausgefüllt sein, mindestens eine Berechtigung muss gewährt werden).

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
