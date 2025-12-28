# BERECHTIGUNGSSYSTEM

Diese Dokumentation beschreibt das Berechtigungssystem des Intranet-Systems, einschließlich der Rollen, Berechtigungen und deren Implementierung.

**Letzte Aktualisierung:** 2024-12-28

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Rollen und Berechtigungen](#rollen-und-berechtigungen)
   - [Standardrollen](#standardrollen)
   - [Berechtigungsstruktur](#berechtigungsstruktur)
   - [AccessLevel-Format](#accesslevel-format)
   - [EntityType-Hierarchie](#entitytype-hierarchie)
3. [Datenmodell](#datenmodell)
4. [Implementierung](#implementierung)
   - [Backend-Implementierung](#backend-implementierung)
   - [Frontend-Implementierung](#frontend-implementierung)
5. [Berechtigungsprüfung](#berechtigungsprüfung)
   - [API-Endpunkte](#api-endpunkte)
   - [Frontend-Components](#frontend-components)
   - [Row-Level-Isolation](#row-level-isolation)
6. [Administration](#administration)
   - [Rollenverwaltung](#rollenverwaltung)
   - [Berechtigungsverwaltung](#berechtigungsverwaltung)
7. [Bewährte Methoden](#bewährte-methoden)
8. [Fehlerbehebung](#fehlerbehebung)

## Übersicht

Das Intranet-System verwendet ein rollenbasiertes Zugriffssteuerungssystem (RBAC), das Benutzern bestimmte Rollen zuweist, die wiederum mit spezifischen Berechtigungen verbunden sind. Dieses System ermöglicht eine granulare Kontrolle über die Zugriffsrechte verschiedener Benutzergruppen im System.

Die Hauptkomponenten des Berechtigungssystems sind:

- **Benutzer**: Individuelle Systembenutzer
- **Rollen**: Definierte Funktionen oder Arbeitsbereiche im System (z.B. Administrator, User, Hamburger)
- **Berechtigungen**: Spezifische Zugriffsrechte auf Pages, Boxes, Tabs und Buttons
- **Organisationen**: Multi-Tenancy-Isolation (Daten werden pro Organisation isoliert)

Das Berechtigungssystem ist sowohl im Backend (für API-Zugriffskontrolle und Row-Level-Isolation) als auch im Frontend (für UI-Elementsteuerung) implementiert.

## Rollen und Berechtigungen

### Standardrollen

Das System enthält die folgenden vordefinierten Standardrollen:

#### 1. **Administrator**
- **AccessLevel:** `all_both` für alle Entities
- Vollständiger Zugriff auf alle Systembereiche
- Kann Benutzer, Rollen und Berechtigungen verwalten
- Kann Systemeinstellungen konfigurieren
- Kann Organisationen erstellen und verwalten
- Sieht alle Daten aller Benutzer innerhalb der Organisation

#### 2. **User** (Standard-Benutzer)
- **Wird automatisch neuen Benutzern bei der Registrierung zugewiesen** (ohne Organisation)
- **Nach Beitritt zu einer Organisation:** Erhält zusätzlich eine organisations-spezifische Rolle (z.B. Hamburger, User oder Admin)
- **AccessLevel:** Selektiv `own_both`/`all_both` je nach Entity
- Kann eigene Arbeitszeit erfassen (`own_both`)
- Kann eigene Aufgaben einsehen und verwalten (`own_both` für `todos` Tab)
- Kann Anfragen stellen (`own_both` für `requests` Box)
- Kann Wiki-Artikel lesen und bearbeiten (`all_both` für `cerebro` Page)
- **Kein Zugriff auf:** Workcenter (`team_worktime_control`), Organisation (`organization_management`), Preisanalyse (`price_analysis`)

#### 3. **Hamburger** (Basis-Rolle für neue Benutzer in Organisationen)
- **Wird Benutzern zugewiesen, die einer Organisation beitreten** (ohne spezifische Rolle)
- **AccessLevel:** Minimal, meist `all_read` oder `none`
- Basis-Berechtigungen für grundlegende Funktionen:
  - Dashboard anzeigen (`all_read`)
  - Einstellungen und Profil verwalten (`all_both`)
  - Cerebro Wiki lesen (`all_read`)
  - Benachrichtigungen anzeigen
- **KEINE Zugriff auf Organisation-Seite** (`organization_management` = `none`)
- Die Hamburger-Rolle existiert nur innerhalb von Organisationen

**Hinweis:** 
- Neue Registrierungen erhalten automatisch die **User-Rolle** (ohne Organisation)
- Beim Gründen einer Organisation erhält der Gründer die **Admin-Rolle** der neuen Organisation (User-Rolle bleibt bestehen)
- Beim Beitritt zu einer Organisation erhält der Benutzer die **Hamburger-Rolle** der Organisation (User-Rolle bleibt bestehen)

### Berechtigungsstruktur

Das Berechtigungssystem verwendet eine hierarchische Struktur:

```
PAGE (Seitenebene - Sidebar/Footer)
  └── BOX (Container auf Seiten)
        └── TAB (Tabs innerhalb von Seiten)
              └── BUTTON (Aktions-Buttons)
```

Jede Berechtigung besteht aus drei Komponenten:

1. **Entity**: Name des Objekts (z.B. `'dashboard'`, `'todos'`, `'task_create'`)
2. **EntityType**: Art des Objekts (`'page'`, `'box'`, `'tab'`, `'button'`)
3. **AccessLevel**: Zugriffsebene (`'none'`, `'own_read'`, `'own_both'`, `'all_read'`, `'all_both'`)

### AccessLevel-Format

Das System verwendet ein neues AccessLevel-Format mit fünf Stufen:

| AccessLevel | Bedeutung | Beschreibung |
|-------------|-----------|--------------|
| `none` | Kein Zugriff | Element ist nicht sichtbar/nicht erlaubt |
| `own_read` | Nur eigene Daten lesen | User kann nur eigene Daten lesen (basierend auf Ownership-Feldern) |
| `own_both` | Eigene Daten lesen und bearbeiten | User kann eigene Daten lesen und bearbeiten |
| `all_read` | Alle Daten lesen | User kann alle Daten innerhalb der Organisation/Branch lesen |
| `all_both` | Alle Daten lesen und bearbeiten | User kann alle Daten innerhalb der Organisation/Branch lesen und bearbeiten (Admin) |

**Legacy-Support:**
Das System unterstützt auch das alte AccessLevel-Format für Abwärtskompatibilität:
- `'read'` → wird konvertiert zu `'all_read'`
- `'write'` → wird konvertiert zu `'own_both'`
- `'both'` → wird konvertiert zu `'all_both'`
- `'none'` → bleibt `'none'`

### EntityType-Hierarchie

Die EntityType-Hierarchie definiert die Struktur der Berechtigungen:

- **`page`**: Seitenebene (Sidebar/Footer Menü)
  - Beispiel: `entity: 'dashboard'`, `entityType: 'page'`
- **`box`**: Container auf Seiten
  - Beispiel: `entity: 'requests'`, `entityType: 'box'`, `parent: 'dashboard'`
- **`tab`**: Tabs innerhalb von Seiten
  - Beispiel: `entity: 'todos'`, `entityType: 'tab'`, `parent: 'worktracker'`
  - **Hinweis:** `'table'` ist veraltet und wird automatisch zu `'tab'` konvertiert
- **`button`**: Aktions-Buttons
  - Beispiel: `entity: 'task_create'`, `entityType: 'button'`, `parent: 'todos'`

**Wichtige Regel:** Wenn eine Page auf `none` gesetzt ist, sind alle untergeordneten Boxes, Tabs und Buttons automatisch nicht zugänglich.

## Datenmodell

Das Berechtigungssystem basiert auf den folgenden Datenbankmodellen:

### User

```prisma
model User {
  id           Int      @id @default(autoincrement())
  username     String   @unique
  passwordHash String
  firstName    String
  lastName     String
  email        String   @unique
  roles        UserRole[] // Mehrere Rollen pro User möglich
  // Weitere Felder...
}
```

### Role

```prisma
model Role {
  id           Int             @id @default(autoincrement())
  name         String          @unique
  description  String?
  organizationId Int?           // NULL = Standard-Rolle, sonst organisations-spezifisch
  users        UserRole[]
  permissions  Permission[]
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
}
```

### Permission

Das Berechtigungssystem verwendet ein flexibles Modell mit `entity`, `entityType` und `accessLevel`:

```prisma
model Permission {
  id          Int      @id @default(autoincrement())
  roleId      Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  accessLevel String   // "none", "own_read", "own_both", "all_read", "all_both" (oder Legacy: "read", "write", "both")
  entity      String   // z.B. "dashboard", "todos", "task_create"
  entityType  String   @default("page") // "page", "box", "tab", "button"
  role        Role     @relation(fields: [roleId], references: [id])
}
```

**Beispiele für Berechtigungen:**
- `entity: "dashboard"`, `entityType: "page"`, `accessLevel: "all_both"` - Vollzugriff auf Dashboard-Seite
- `entity: "todos"`, `entityType: "tab"`, `accessLevel: "own_both"` - Zugriff auf To-Dos Tab, nur eigene Tasks
- `entity: "task_create"`, `entityType: "button"`, `accessLevel: "all_both"` - Zugriff auf "Task erstellen" Button

### Permission-Struktur-Definition

Die vollständige Permission-Struktur ist zentral definiert in:
- **Backend:** `backend/src/config/permissions.ts`
- **Frontend:** `frontend/src/config/permissions.ts`
- **Permission-Struktur (UI):** `frontend/src/config/permissionStructure.ts`

Diese Dateien enthalten alle verfügbaren Pages, Boxes, Tabs und Buttons mit ihren Ownership-Feldern.

## Implementierung

### Backend-Implementierung

#### Middleware für Berechtigungsprüfung

Die Berechtigungsprüfung im Backend erfolgt durch die `checkPermission` Middleware:

```typescript
// src/middleware/permissionMiddleware.ts

import { checkPermission } from '../middleware/permissionMiddleware';

// Verwendung in API-Routen
router.get(
  '/api/tasks',
  authenticate,
  checkPermission('todos', 'read', 'tab'),
  taskController.getAllTasks
);

router.post(
  '/api/tasks',
  authenticate,
  checkPermission('task_create', 'write', 'button'),
  taskController.createTask
);
```

**Funktionsweise:**
1. Die Middleware prüft die Berechtigung des Users für die angegebene Entity
2. Sie setzt `req.permissionContext` mit folgenden Informationen:
   - `accessLevel`: Das AccessLevel des Users für diese Entity
   - `isOwnershipRequired`: Ob Ownership-Check nötig ist (`own_read` oder `own_both`)
   - `ownershipFields`: Die DB-Felder für Ownership-Prüfung (z.B. `['responsibleId', 'qualityControlId']`)
3. Controller können dann `getDataIsolationFilter(req, entity)` verwenden, um Daten zu filtern

#### Row-Level-Isolation

Die Row-Level-Isolation wird durch `getDataIsolationFilter()` in `organization.ts` implementiert:

```typescript
// src/middleware/organization.ts

import { getDataIsolationFilter } from '../middleware/organization';

// In Controller:
const filter = getDataIsolationFilter(req, 'task');
const tasks = await prisma.task.findMany({
  where: {
    ...filter,
    // Weitere Filter...
  }
});
```

**Funktionsweise:**
- Wenn `permissionContext.accessLevel === 'all_both'` oder `'all_read'`: Nur nach `organizationId` filtern
- Wenn `permissionContext.accessLevel === 'own_both'` oder `'own_read'`: Nach `organizationId` UND Ownership-Feldern filtern
- Ownership-Felder werden aus `OWNERSHIP_FIELDS[entity]` geladen (z.B. `['responsibleId', 'qualityControlId']` für Tasks)

**Wichtige Regel:** Bei `own_both` für Tasks wird `roleId` NICHT als Ownership-Feld verwendet. Nur `responsibleId` und `qualityControlId` werden verwendet, um sicherzustellen, dass User nur ihre direkt zugewiesenen Tasks sehen.

#### Ownership-Felder

Ownership-Felder definieren, welche DB-Felder für "eigene" Daten verwendet werden:

```typescript
// src/middleware/permissionMiddleware.ts

const OWNERSHIP_FIELDS: Record<string, string[]> = {
  'todos': ['responsibleId', 'qualityControlId'], // ✅ roleId NICHT enthalten
  'task_edit': ['responsibleId', 'qualityControlId'],
  'requests': ['requesterId', 'responsibleId'],
  'reservations': ['branchId'], // Branch-basiert
  'worktime': ['userId'],
  // ...
};
```

### Frontend-Implementierung

#### usePermissions Hook

Im Frontend wird der `usePermissions()` Hook verwendet, um Berechtigungen zu prüfen:

```tsx
// src/hooks/usePermissions.ts

import { usePermissions } from '../hooks/usePermissions';

const MyComponent = () => {
  const { hasPermission, canView, getAccessLevel, canSeeAllData } = usePermissions();
  
  // Prüft ob User Berechtigung hat (read oder write)
  const canEdit = hasPermission('task_edit', 'write', 'button');
  
  // Prüft ob Element sichtbar ist (AccessLevel != 'none')
  const showTab = canView('todos', 'tab');
  
  // Holt das AccessLevel für eine Entity
  const accessLevel = getAccessLevel('payroll_reports', 'tab');
  
  // Prüft ob User alle Daten sehen darf (all_both oder all_read)
  const seeAllUsers = canSeeAllData('payroll_reports', 'tab');
  
  return (
    <div>
      {showTab && <TodosTab />}
      {canEdit && <EditButton />}
      {seeAllUsers ? <UserDropdown /> : <OwnPayroll />}
    </div>
  );
};
```

**Verfügbare Funktionen:**

1. **`hasPermission(entity, requiredAccess, entityType)`**
   - Prüft ob User die erforderliche Berechtigung hat
   - `requiredAccess`: `'read'` oder `'write'`
   - Gibt `true` zurück wenn AccessLevel ausreichend ist

2. **`canView(entity, entityType)`**
   - Prüft ob Element sichtbar ist (AccessLevel != `'none'`)
   - Wird verwendet für Tab-Sichtbarkeit, Sidebar-Menü, etc.

3. **`getAccessLevel(entity, entityType)`**
   - Gibt das AccessLevel für eine Entity zurück
   - Rückgabewert: `'none' | 'own_read' | 'own_both' | 'all_read' | 'all_both'`

4. **`canSeeAllData(entity, entityType)`**
   - Prüft ob User alle Daten sehen darf (nicht nur eigene)
   - Gibt `true` zurück wenn AccessLevel `'all_both'` oder `'all_read'` ist

#### Tab-Filterung

Tabs werden basierend auf `canView()` gefiltert:

```tsx
// Beispiel: Payroll.tsx

const Payroll = () => {
  const { canView } = usePermissions();
  
  const allTabs = [
    { entity: 'consultation_invoices', label: 'Beratungsrechnungen' },
    { entity: 'monthly_reports', label: 'Monatsrechnungen' },
    { entity: 'payroll_reports', label: 'Lohnabrechnungen' },
  ];
  
  // Filtere Tabs basierend auf Berechtigungen
  const visibleTabs = allTabs.filter(tab => canView(tab.entity, 'tab'));
  
  return (
    <div>
      {visibleTabs.map(tab => (
        <TabButton key={tab.entity}>{tab.label}</TabButton>
      ))}
    </div>
  );
};
```

#### Permission-Initialisierung

Bei Formularen/Sidepanes, die Permissions laden, muss `initializePermissions()` verwendet werden:

```typescript
// src/components/RoleManagementTab.tsx

import { initializePermissions } from '../config/permissionStructure';

const handleEdit = (role: Role) => {
  // ✅ RICHTIG: Initialisiere ALLE Permissions aus Struktur, übernehme dann gespeicherte Werte
  const allPermissions = initializePermissions(role.permissions).map(p => ({
    ...p,
    accessLevel: p.accessLevel as AccessLevel
  }));
  
  setFormData({
    name: role.name,
    description: role.description || '',
    permissions: allPermissions
  });
};
```

**Wichtig:** Nicht nur gespeicherte Permissions übernehmen, sondern ALLE aus `PERMISSION_STRUCTURE` initialisieren, damit fehlende Permissions auch angezeigt werden.

## Berechtigungsprüfung

### API-Endpunkte

Berechtigungen werden bei API-Anfragen auf folgende Weise geprüft:

1. Der Client sendet das JWT-Token im Authorization-Header
2. Die `authenticate` Middleware verifiziert das Token und extrahiert `userId` und `roleId`
3. Die `checkPermission` Middleware prüft die Berechtigung:
   - Lädt User und aktive Rolle aus Cache
   - Prüft ob Admin-Rolle (Bypass)
   - Sucht nach Permission für Entity + EntityType
   - Evaluiert ob AccessLevel ausreichend ist
   - Setzt `req.permissionContext` für Row-Level-Isolation
4. Bei erfolgreicher Prüfung wird die Anfrage an den Controller weitergeleitet, andernfalls wird ein 403-Fehler zurückgegeben

### Frontend-Components

Im Frontend werden Berechtigungen verwendet, um:

1. **UI-Elemente bedingt zu rendern** (mit `canView()`)
   - Tabs werden komplett ausgeblendet wenn `canView(tabEntity, 'tab') === false`
   - Buttons werden nur angezeigt wenn `hasPermission(buttonEntity, 'write', 'button') === true`

2. **Datenfilterung** (mit `getAccessLevel()` und `canSeeAllData()`)
   - Bei `own_both`: Nur eigene Daten anzeigen, kein Dropdown für User-Auswahl
   - Bei `all_both`: Alle Daten anzeigen, Dropdown für User-Auswahl

3. **Formular-Sichtbarkeit** (mit `canSeeAllData()`)
   - Bei `own_both`: Nur bestehende Einträge anzeigen, kein Formular zum Erstellen
   - Bei `all_both`: Formular zum Erstellen anzeigen

### Row-Level-Isolation

Die Row-Level-Isolation stellt sicher, dass User nur die Daten sehen, für die sie berechtigt sind:

**Beispiel: Tasks (todos Tab)**

- **`all_both`**: Alle Tasks der Organisation werden angezeigt
- **`own_both`**: Nur Tasks wo User in `responsibleId` ODER `qualityControlId` ist
  - **Wichtig:** `roleId` wird NICHT verwendet (nur direkte Zuweisung)

**Beispiel: Reservations**

- **`all_both`**: Alle Reservations der Organisation werden angezeigt
- **`own_both`**: Nur Reservations der aktiven Branch (`branchId`)

**Beispiel: Payroll**

- **`all_both`**: Alle Lohnabrechnungen werden angezeigt, User-Dropdown sichtbar, Formular zum Erstellen sichtbar
- **`own_both`**: Nur eigene Lohnabrechnungen werden angezeigt, kein User-Dropdown, kein Formular zum Erstellen

## Administration

### Rollenverwaltung

Administratoren können Rollen über die Organisation-Seite verwalten:

1. **Neue Rollen erstellen**
   - Navigieren Sie zu Organisation → Roles Tab
   - Klicken Sie auf "Rolle erstellen"
   - Geben Sie Name und Beschreibung ein
   - Setzen Sie Berechtigungen für alle Pages/Boxes/Tabs/Buttons
   - Klicken Sie auf "Speichern"

2. **Bestehende Rollen bearbeiten**
   - Navigieren Sie zu Organisation → Roles Tab
   - Klicken Sie auf "Bearbeiten" bei der gewünschten Rolle
   - Ändern Sie Name, Beschreibung oder Berechtigungen
   - Klicken Sie auf "Speichern"

3. **Rollen kopieren**
   - Navigieren Sie zu Organisation → Roles Tab
   - Klicken Sie auf "Kopieren" bei der gewünschten Rolle
   - Die neue Rolle übernimmt alle Berechtigungen der kopierten Rolle
   - Sie können dann die Berechtigungen anpassen

4. **Rollen löschen**
   - Navigieren Sie zu Organisation → Roles Tab
   - Klicken Sie auf "Löschen" bei der gewünschten Rolle
   - **Warnung:** Rollen können nur gelöscht werden, wenn sie nicht verwendet werden

**API-Endpunkte:**
- `GET /api/organizations/current/roles`: Alle Rollen der aktuellen Organisation abrufen
- `GET /api/organizations/current/roles/:id`: Eine bestimmte Rolle abrufen
- `POST /api/organizations/current/roles`: Neue Rolle erstellen
- `PUT /api/organizations/current/roles/:id`: Rolle aktualisieren
- `DELETE /api/organizations/current/roles/:id`: Rolle löschen
- `POST /api/organizations/current/roles/:id/copy`: Rolle kopieren

### Berechtigungsverwaltung

Berechtigungen werden über die Permission-Struktur definiert:

- **Zentrale Definition:** `backend/src/config/permissions.ts` und `frontend/src/config/permissionStructure.ts`
- **Seed-File:** `backend/prisma/seed.ts` definiert Standard-Berechtigungen für Admin, User, Hamburger
- **UI-Editor:** Organisation → Roles Tab → Rolle bearbeiten → Permission Editor

**Neue Berechtigungen hinzufügen:**

1. Entity zu `ALL_PAGES`, `ALL_BOXES`, `ALL_TABS` oder `ALL_BUTTONS` in `permissions.ts` hinzufügen
2. Ownership-Felder definieren (falls `own_both`/`own_read` verwendet wird)
3. Seed-File aktualisieren (Standard-Berechtigungen für Rollen)
4. Frontend-Komponenten aktualisieren (Berechtigungsprüfung hinzufügen)
5. Backend-Routen aktualisieren (`checkPermission` Middleware hinzufügen)

## Bewährte Methoden

Folgende Best Practices sollten bei der Arbeit mit dem Berechtigungssystem beachtet werden:

1. **Prinzip der geringsten Berechtigung**: Weisen Sie Benutzern nur die Berechtigungen zu, die sie für ihre Aufgaben benötigen.

2. **Funktionale Rollen**: Erstellen Sie Rollen basierend auf funktionalen Anforderungen und Arbeitsbereichen.

3. **Konsistente Benennung**: Verwenden Sie konsistente Namenskonventionen für Entities (z.B. `task_create`, `request_edit`).

4. **Granulare Berechtigungen**: Definieren Sie spezifische Berechtigungen für einzelne Aktionen (Buttons), anstatt allgemeine Zugriffsrechte.

5. **Frontend-Validierung**: Auch wenn UI-Elemente basierend auf Berechtigungen ausgeblendet werden, stellen Sie sicher, dass alle API-Anfragen auf Serverseite überprüft werden.

6. **Row-Level-Isolation**: Verwenden Sie immer `getDataIsolationFilter()` im Backend, um sicherzustellen, dass User nur die Daten sehen, für die sie berechtigt sind.

7. **Tab-Filterung**: Verwenden Sie `canView()` für Tab-Sichtbarkeit, nicht `hasPermission()`.

8. **Permission-Initialisierung**: Verwenden Sie immer `initializePermissions()` bei Formularen/Sidepanes, die Permissions laden.

9. **Ownership-Felder**: Bei `own_both` für Tasks wird `roleId` NICHT verwendet. Nur `responsibleId` und `qualityControlId` werden verwendet.

10. **Regelmäßige Überprüfung**: Überprüfen Sie regelmäßig die Rollenzuweisungen und Berechtigungen, um sicherzustellen, dass sie aktuell und angemessen sind.

## Fehlerbehebung

### Häufige Probleme und Lösungen

1. **Benutzer kann auf bestimmte Funktionen nicht zugreifen**
   - Überprüfen Sie die Rollenzuweisung des Benutzers (aktive Rolle)
   - Überprüfen Sie, ob die Rolle die erforderlichen Berechtigungen enthält
   - Überprüfen Sie die Frontend-Implementierung der Berechtigungsprüfung (`canView()`, `hasPermission()`)
   - Prüfen Sie Browser-Console auf Fehler

2. **Berechtigungsfehler bei API-Anfragen (403)**
   - Überprüfen Sie das JWT-Token (Gültigkeit, Ablauf)
   - Überprüfen Sie die Berechtigungen der Benutzerrolle in der Datenbank
   - Überprüfen Sie die korrekte Implementierung der `checkPermission` Middleware
   - Prüfen Sie Server-Logs für Details

3. **Tabs werden nicht angezeigt**
   - Überprüfen Sie ob `canView(tabEntity, 'tab')` verwendet wird
   - Überprüfen Sie ob die Berechtigung für den Tab auf `none` gesetzt ist
   - Überprüfen Sie ob die Page-Berechtigung ausreichend ist

4. **User sieht alle Daten statt nur eigene**
   - Überprüfen Sie ob `getDataIsolationFilter(req, entity)` im Controller verwendet wird
   - Überprüfen Sie ob `permissionContext` von `checkPermission` gesetzt wird
   - Überprüfen Sie ob Ownership-Felder korrekt definiert sind

5. **Permissions werden beim Laden nicht angezeigt**
   - Überprüfen Sie ob `initializePermissions()` verwendet wird
   - Überprüfen Sie ob alle Permissions aus `PERMISSION_STRUCTURE` initialisiert werden

### Logging und Debugging

Bei Berechtigungsproblemen können folgende Logs hilfreich sein:

- **Authentifizierungslogs**: Informationen über erfolgreiche/fehlgeschlagene Anmeldeversuche
- **Berechtigungslogs**: Informationen über verweigerte Zugriffe mit Details zu fehlenden Berechtigungen (in `checkPermission` Middleware)
- **API-Zugriffslogs**: Vollständige Informationen über API-Anfragen und -Antworten
- **Browser-Console**: Frontend-Fehler und Berechtigungsprüfungen

**Debug-Modus aktivieren:**
Setzen Sie `PERMISSION_DEBUG=true` in der `.env` Datei, um detaillierte Logs zu erhalten.

---

**Letzte Aktualisierung:** 2024-12-28  
Diese Dokumentation bietet einen umfassenden Überblick über das Berechtigungssystem des Intranet-Systems. Bei Änderungen am Berechtigungsmodell sollte diese Dokumentation aktualisiert werden.
