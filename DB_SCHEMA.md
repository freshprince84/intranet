# Datenbank-Schema

Dieses Dokument beschreibt die Struktur der Datenbank für das Intranet-Projekt. Das Schema wird mit Prisma verwaltet und befindet sich in `backend/prisma/schema.prisma`.

## Prisma Schema

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

## Wichtige Hinweise bei Schemaänderungen

Bei Änderungen am Datenbankschema:

- **Vor** Änderungen am Schema immer ein Backup der Daten erstellen
- Bei Umbenennungen von Spalten gehen Daten standardmäßig verloren, wenn nicht manuell migriert wird
- Nach Änderungen am Prisma Schema:
  1. Die Datenbank aktualisieren: `npx prisma db push` oder `npx prisma migrate dev`
  2. Die Seed-Dateien entsprechend anpassen
  3. Bei Bedarf Daten neu einspielen: `npx ts-node prisma/seed.ts`
  4. **Server und Prisma Studio neustarten**
- Bei Produktivumgebungen statt `--accept-data-loss` besser manuelle SQL-Migrationen verwenden:
  ```sql
  ALTER TABLE "Permission" RENAME COLUMN "page" TO "entity";
  ALTER TABLE "Permission" ADD COLUMN "entityType" TEXT NOT NULL DEFAULT 'page';
  ```

### Aktuelle Konfiguration
- Schema.prisma befindet sich in backend/prisma
- Prisma Studio läuft auf Port 5555 (http://localhost:5555)

## Status-Logik
- **Tasks**: 
  - `improval` wird gesetzt, wenn eine Aufgabe von `quality_control` zurückgewiesen wird.
- **Requests**: 
  - `to_improve` wird gesetzt, wenn eine Anfrage von `approval` zurückgewiesen wird.

## Berechtigungsstruktur
Das System verwendet eine erweiterte Berechtigungsstruktur, die sowohl Seiten- als auch Tabellenzugriffe steuert:

### Permission-Modell
- `entity`: Identifiziert die Entität (Seite oder Tabelle), für die die Berechtigung gilt
- `entityType`: Unterscheidet zwischen 'page' und 'table' Berechtigungen
- `accessLevel`: Definiert die Zugriffsebene ('read', 'write', 'both', 'none')

### Implementierte Berechtigungen
- **Seitenberechtigungen** (`entityType: 'page'`):
  - Steuern den Zugriff auf UI-Komponenten und Seiten
  - Beispiele: 'dashboard', 'settings', 'worktracker', 'roles', 'users'

- **Tabellenberechtigungen** (`entityType: 'table'`):
  - Steuern den Zugriff auf Datenbankoperationen für bestimmte Tabellen
  - Implementiert für 'requests' und 'tasks'
  - Ermöglichen granulare Kontrolle über Aktionen wie Erstellen, Bearbeiten und Statusänderungen

### Wichtige Hinweise bei Schemaänderungen
Bei Änderungen am Datenbankschema, insbesondere bei Umbenennungen von Spalten:
- Immer ein Backup der Daten erstellen
- Bei Produktivumgebungen manuelle SQL-Migrationen verwenden:
  ```sql
  ALTER TABLE "Permission" RENAME COLUMN "page" TO "entity";
  ALTER TABLE "Permission" ADD COLUMN "entityType" TEXT NOT NULL DEFAULT 'page';
  ```
- Seed-Dateien entsprechend anpassen
- Nach Schemaänderungen Server und Prisma Studio neustarten

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
  - Start, Stopp und automatisches Stoppen von Zeiterfassungen

### UserNotificationSettings-Modell
- Ermöglicht benutzerspezifische Überschreibungen der systemweiten Einstellungen
- Jeder Benutzer kann individuell entscheiden, welche Benachrichtigungen er erhalten möchte
- Neue Benachrichtigungstypen:
  - `worktimeAutoStop`: Benachrichtigung bei automatischem Stoppen der Zeiterfassung bei Erreichen der täglichen Arbeitszeit
- Neue Funktionalitäten in der Benutzeroberfläche:
  - Globaler "Alle Benachrichtigungen" Toggle zum Ein-/Ausschalten aller Benachrichtigungen
  - Pro Kategorie (Aufgaben, Anfragen, Benutzer, Rollen, Arbeitszeit) ein "Alle" Toggle
  - Direkte Speicherung bei jeder Änderung ohne separaten Speichern-Button
  - Optimistische Updates mit Fehlerbehandlung und Rollback bei Fehlern

### Best Practices bei der Integration

1. **Direkte Speicherung**:
   - Jede Änderung wird sofort an den Server gesendet
   - Optimistische Updates für bessere Benutzerfreundlichkeit
   - Rollback bei Fehlern mit entsprechender Benachrichtigung

2. **Kategorien-Management**:
   - Gruppierung von Einstellungen in logische Kategorien
   - Möglichkeit zum Ein-/Ausschalten aller Einstellungen einer Kategorie
   - Konsistente Statusanzeige basierend auf Untereinstellungen

3. **Fehlerbehandlung**:
   - Robuste Fehlerbehandlung bei Netzwerkproblemen
   - Benutzerfreundliche Fehlermeldungen
   - Automatischer Rollback bei fehlgeschlagenen Aktualisierungen

4. **UI/UX-Richtlinien**:
   - Klare visuelle Hierarchie mit Hauptschalter und Kategorieschaltern
   - Konsistente Darstellung von Schaltern und Labels
   - Sofortiges visuelles Feedback bei Änderungen
   - Deaktivierung der Schalter während des Speichervorgangs

## Rolle und Berechtigungen
- Ein Benutzer erhält bei der Anmeldung die zuletzt verwendete Rolle (Feld `lastUsed` in `UserRole`).
- Wenn für einen Benutzer kein Eintrag mit `lastUsed=true` in der Tabelle `userrole` gefunden wird, wird die Standard-Rolle mit der ID 999 zugewiesen.
- Die Rolle mit ID 999 ist eine Standard-Fallback-Rolle und darf nicht gelöscht werden.
- Die Admin-Rolle hat immer die ID 1 und verfügt über volle Berechtigungen auf alle Funktionalitäten. Diese Rolle sollte nicht gelöscht oder ihre Grundberechtigungen eingeschränkt werden.
- `Permission` steuert Berechtigungen pro Rolle und Seite mit den Werten: `read`, `write`, `both`, `none`.
- Benutzer können zwischen ihren zugewiesenen Rollen wechseln (über das Topmenü), wodurch die aktuellen Berechtigungen und angezeigten Menüelemente entsprechend angepasst werden.

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

## Rollenverwaltung und Berechtigungen

Die Rollenverwaltung ist ein zentraler Bestandteil des Systems und steuert den Zugriff auf die verschiedenen Funktionen der Anwendung. Das System unterstützt mehrere Rollen pro Benutzer, wobei immer nur eine Rolle aktiv sein kann.

### Modelle

- **Role**: Definiert eine Rolle im System (z.B. Admin, User, HR, etc.)
- **Permission**: Definiert Zugriffsrechte für bestimmte Entitäten und Aktionen
- **UserRole**: Verknüpft Benutzer mit Rollen und speichert den aktiven Status (lastUsed)

### Spezialfälle

Die Admin-Rolle (ID: 1) hat standardmäßig vollen Zugriff auf alle Funktionen des Systems. Diese Rolle sollte nicht gelöscht werden.

### Rollenwechsel

Der Rollenwechsel erfolgt über den Endpunkt `/api/users/switch-role` und aktualisiert das Feld `lastUsed` in der `UserRole`-Tabelle. Nach einem Rollenwechsel wird das Backend automatisch die Berechtigungen des Benutzers entsprechend der neuen Rolle anpassen.

### Optimierungen

1. **Reduzierte Debug-Ausgaben**: Unnötige Debug-Ausgaben wurden entfernt, um die Performance zu verbessern und die Logdateien übersichtlich zu halten. Dies betrifft folgende Komponenten:
   - `permissionMiddleware.ts`: Reduzierung der Debug-Logs bei Berechtigungsprüfungen
   - `notificationController.ts`: Entfernung übermäßiger Protokollierung
   - `usePermissions.ts`: Entfernung von console.log-Ausgaben bei der Berechtigungsprüfung

2. **Effiziente Berechtigungsprüfung**: Die Berechtigungsprüfung erfolgt effizient über den `authMiddleware`-Mechanismus, der die aktive Rolle und ihre Berechtigungen aus dem JWT-Token ermittelt und in der Request-Objekt speichert.

3. **Robuste Fehlerbehandlung**: Die Rollenverwaltung implementiert umfassende Fehlerbehandlung, um fehlende Berechtigungen oder ungültige Rollen zu erkennen und entsprechende Fehlermeldungen zurückzugeben.
