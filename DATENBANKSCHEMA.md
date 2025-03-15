# DATENBANKSCHEMA

Diese Dokumentation beschreibt das vollständige Datenbankschema des Intranet-Systems, einschließlich aller Tabellen, Beziehungen und Constraints.

## Inhaltsverzeichnis

1. [Einführung](#einführung)
2. [Entity-Relationship-Diagramm](#entity-relationship-diagramm)
3. [Tabellenbeschreibungen](#tabellenbeschreibungen)
   - [User](#user)
   - [Role](#role)
   - [Permission](#permission)
   - [RolePermission](#rolepermission)
   - [Branch](#branch)
   - [WorkTime](#worktime)
   - [Task](#task)
   - [Request](#request)
   - [Notification](#notification)
   - [CerebroArticle](#cerebroarticle)
   - [CerebroCategory](#cerebrocategory)
   - [Settings](#settings)
   - [PayrollData](#payrolldata)
4. [Datentypen](#datentypen)
5. [Beziehungen](#beziehungen)
6. [Indizes](#indizes)
7. [Constraints](#constraints)
8. [Migrationen](#migrationen)
9. [Seed-Daten](#seed-daten)

## Einführung

Das Datenbankschema basiert auf PostgreSQL und wird mit Prisma ORM verwaltet. Die Hauptdatei für die Schemadefinition ist `prisma/schema.prisma`. 

Die Datenbank unterstützt alle Funktionen des Intranet-Systems, einschließlich:
- Benutzerverwaltung und Authentifizierung
- Rollen- und Berechtigungssystem
- Zeiterfassung
- Aufgabenverwaltung
- Anfragen- und Genehmigungsworkflow
- Benachrichtigungssystem
- Cerebro Wiki
- Einstellungen
- Lohnabrechnung

## Entity-Relationship-Diagramm

```
User (1) --- (*) WorkTime
User (1) --- (*) Task (assignedTo)
User (1) --- (*) Task (createdBy)
User (1) --- (*) Request
User (1) --- (*) Notification
User (1) --- (*) CerebroArticle
User (1) --- (1) Role
Role (1) --- (*) RolePermission
Permission (1) --- (*) RolePermission
Branch (1) --- (*) WorkTime
CerebroCategory (1) --- (*) CerebroArticle
User (1) --- (*) PayrollData
```

## Tabellenbeschreibungen

### User

Die `User`-Tabelle speichert alle Benutzerinformationen.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| username | String | Benutzername | @unique |
| passwordHash | String | Gehashtes Passwort | |
| firstName | String | Vorname | |
| lastName | String | Nachname | |
| email | String | E-Mail-Adresse | @unique |
| roleId | Int | Referenz zur Rolle | @foreign key |
| branchId | Int | Referenz zur Niederlassung | @foreign key |
| settings | Json | Benutzerspezifische Einstellungen | @default({}) |
| hourlyRate | Float | Stundensatz für Lohnberechnung | @default(0) |
| isActive | Boolean | Aktiv-Status | @default(true) |
| lastLogin | DateTime | Zeitpunkt der letzten Anmeldung | @nullable |
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
| code | String | Berechtigungscode | @unique |
| description | String | Beschreibung der Berechtigung | |
| module | String | Zugehöriges Modul | |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### RolePermission

Die `RolePermission`-Tabelle verbindet Rollen mit Berechtigungen (N:M-Beziehung).

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| roleId | Int | Referenz zur Rolle | @foreign key |
| permissionId | Int | Referenz zur Berechtigung | @foreign key |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### Branch

Die `Branch`-Tabelle speichert Informationen zu Unternehmensniederlassungen.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| name | String | Name der Niederlassung | @unique |
| address | String | Adresse | @nullable |
| phone | String | Telefonnummer | @nullable |
| email | String | E-Mail-Kontakt | @nullable |
| isActive | Boolean | Aktiv-Status | @default(true) |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### WorkTime

Die `WorkTime`-Tabelle protokolliert die Arbeitszeiterfassung.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| userId | Int | Benutzer-ID | @foreign key |
| startTime | DateTime | Startzeitpunkt | |
| endTime | DateTime | Endzeitpunkt | @nullable |
| startComment | String | Kommentar beim Start | @nullable |
| endComment | String | Kommentar beim Ende | @nullable |
| branchId | Int | Niederlassungs-ID | @foreign key |
| manual | Boolean | Manuell erstellt | @default(false) |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### Task

Die `Task`-Tabelle verwaltet Aufgaben.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| title | String | Aufgabentitel | |
| description | String | Aufgabenbeschreibung | @nullable |
| status | String | Status (z.B. open, in_progress, completed) | @default("open") |
| priority | String | Priorität (z.B. low, medium, high) | @default("medium") |
| dueDate | DateTime | Fälligkeitsdatum | @nullable |
| assignedToId | Int | Zugewiesener Benutzer | @foreign key @nullable |
| createdById | Int | Ersteller der Aufgabe | @foreign key |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### Request

Die `Request`-Tabelle verwaltet Anfragen und Genehmigungen.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| title | String | Anfragentitel | |
| description | String | Beschreibung | @nullable |
| status | String | Status (z.B. pending, approved, rejected) | @default("pending") |
| priority | String | Priorität | @default("medium") |
| userId | Int | Anfragender Benutzer | @foreign key |
| assignedToId | Int | Zuständiger Benutzer | @foreign key @nullable |
| comment | String | Kommentar zur Anfrage | @nullable |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### Notification

Die `Notification`-Tabelle speichert Benutzerbenachrichtigungen.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| userId | Int | Empfänger-Benutzer | @foreign key |
| type | String | Benachrichtigungstyp | |
| title | String | Titel | |
| message | String | Nachrichteninhalt | |
| read | Boolean | Gelesen-Status | @default(false) |
| entityId | Int | ID der referenzierten Entität | @nullable |
| entityType | String | Typ der referenzierten Entität | @nullable |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### CerebroArticle

Die `CerebroArticle`-Tabelle speichert Wiki-Artikel.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| title | String | Artikeltitel | |
| slug | String | URL-freundlicher Slug | @unique |
| content | String | Artikelinhalt (Markdown) | |
| categoryId | Int | Kategorie-ID | @foreign key |
| authorId | Int | Autor-ID | @foreign key |
| views | Int | Anzahl der Aufrufe | @default(0) |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### CerebroCategory

Die `CerebroCategory`-Tabelle definiert Kategorien für Wiki-Artikel.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| name | String | Kategorienname | @unique |
| slug | String | URL-freundlicher Slug | @unique |
| description | String | Beschreibung | @nullable |
| parentId | Int | Übergeordnete Kategorie-ID | @foreign key @nullable |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### Settings

Die `Settings`-Tabelle speichert systemweite Einstellungen.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| key | String | Einstellungsschlüssel | @unique |
| value | Json | Einstellungswert | |
| description | String | Beschreibung | @nullable |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

### PayrollData

Die `PayrollData`-Tabelle speichert Daten zur Lohnabrechnung.

| Spalte | Typ | Beschreibung | Constraints |
|--------|-----|--------------|------------|
| id | Int | Eindeutige ID | @id @default(autoincrement()) |
| userId | Int | Benutzer-ID | @foreign key |
| month | Int | Monat (1-12) | |
| year | Int | Jahr | |
| regularHours | Float | Reguläre Arbeitsstunden | @default(0) |
| overtimeHours | Float | Überstunden | @default(0) |
| totalPay | Float | Gesamtvergütung | @default(0) |
| deductions | Json | Abzüge (Steuern, Sozialversicherung) | @default({}) |
| netPay | Float | Nettolohn | @default(0) |
| status | String | Status (z.B. draft, finalized) | @default("draft") |
| notes | String | Anmerkungen | @nullable |
| createdAt | DateTime | Erstellungszeitpunkt | @default(now()) |
| updatedAt | DateTime | Aktualisierungszeitpunkt | @updatedAt |

## Datentypen

Das Schema verwendet folgende Datentypen:

- **Int**: Ganze Zahlen
- **String**: Zeichenketten
- **Boolean**: Wahrheitswerte (true/false)
- **DateTime**: Datum und Uhrzeit (ISO 8601)
- **Float**: Gleitkommazahlen
- **Json**: JSON-Daten (unterstützt komplexe Strukturen)

## Beziehungen

### 1:N Beziehungen

- **Role → User**: Eine Rolle kann vielen Benutzern zugewiesen sein
- **Branch → User**: Eine Niederlassung kann viele Benutzer haben
- **Branch → WorkTime**: Eine Niederlassung kann viele Arbeitszeiteinträge haben
- **User → WorkTime**: Ein Benutzer kann viele Arbeitszeiteinträge haben
- **User → Task (createdBy)**: Ein Benutzer kann viele Aufgaben erstellen
- **User → Task (assignedTo)**: Einem Benutzer können viele Aufgaben zugewiesen sein
- **User → Request**: Ein Benutzer kann viele Anfragen stellen
- **User → Notification**: Ein Benutzer kann viele Benachrichtigungen erhalten
- **User → CerebroArticle**: Ein Benutzer kann viele Artikel verfassen
- **CerebroCategory → CerebroArticle**: Eine Kategorie kann viele Artikel enthalten
- **CerebroCategory → CerebroCategory**: Eine Kategorie kann viele Unterkategorien haben (Hierarchie)
- **User → PayrollData**: Ein Benutzer kann viele Lohnabrechnungen haben

### N:M Beziehungen

- **Role ↔ Permission**: Über die Tabelle `RolePermission` realisiert

## Indizes

Folgende Indizes sind definiert, um Abfragen zu optimieren:

1. **Primary Key Indizes** für alle Tabellen auf der `id`-Spalte
2. **Unique Indizes** für:
   - `User.username`
   - `User.email`
   - `Role.name`
   - `Permission.code`
   - `Branch.name`
   - `CerebroArticle.slug`
   - `CerebroCategory.name`
   - `CerebroCategory.slug`
   - `Settings.key`
3. **Foreign Key Indizes** für alle Fremdschlüsselbeziehungen
4. **Zusammengesetzte Indizes** für:
   - `WorkTime`: `(userId, startTime)` für schnelle Arbeitszeitabfragen
   - `Task`: `(assignedToId, status)` für schnelle Aufgabenfilterung
   - `PayrollData`: `(userId, year, month)` für effiziente Lohnabrechnungssuche

## Constraints

Folgende Constraints stellen die Datenintegrität sicher:

1. **NOT NULL Constraints** für erforderliche Felder
2. **Unique Constraints** wie oben unter Indizes beschrieben
3. **Foreign Key Constraints** mit Referential Actions:
   - `ON DELETE CASCADE` für abhängige Daten (z.B. Benachrichtigungen bei Benutzerlöschung)
   - `ON DELETE SET NULL` für optionale Beziehungen
4. **Check Constraints** für:
   - `PayrollData.month` zwischen 1 und 12
   - `PayrollData.year` größer als 2000

## Migrationen

Das Schema wird mit Prisma Migrate verwaltet. Migrationen werden im Verzeichnis `prisma/migrations` gespeichert und enthalten:

- SQL-Änderungen zur Aktualisierung der Datenbankstruktur
- Metadaten zu jeder Migration
- Migrationszeitstempel

Um eine neue Migration zu erstellen:

```bash
npx prisma migrate dev --name migration_name
```

Um Migrationen in der Produktionsumgebung anzuwenden:

```bash
npx prisma migrate deploy
```

## Seed-Daten

Die Datei `prisma/seed.ts` enthält Seed-Daten für:

- Standard-Rollen und -Berechtigungen
- Admin-Benutzer
- Standard-Niederlassungen
- Standard-Einstellungen
- Beispiel-Wiki-Kategorien

Um Seed-Daten anzuwenden:

```bash
npx prisma db seed
```

Die Seed-Daten stellen sicher, dass neue Installationen mit einer Grundkonfiguration beginnen.

---

Diese Dokumentation bietet einen umfassenden Überblick über das Datenbankschema des Intranet-Systems. Bei Änderungen am Schema sollte diese Dokumentation aktualisiert werden. 