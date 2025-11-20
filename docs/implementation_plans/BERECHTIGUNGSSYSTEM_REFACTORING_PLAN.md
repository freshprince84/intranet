# Detaillierter Plan: Berechtigungssystem Refactoring

## Status: VORBEREITUNG - NICHTS UMSETZEN

**Datum:** 2024
**Ziel:** Berechtigungssystem auf Vordermann bringen, Requests-Berechtigungen implementieren, Tab-Sichtbarkeit implementieren, Standardberechtigungssets definieren

## WICHTIG: Umsetzungsreihenfolge

1. **Dashboard-Seite** (diese Datei)
2. **Worktracker-Seite** (separate Datei)
3. Weitere Seiten (nach Anweisung)

---

## 1. AKTUELLER STAND - FAKTEN

### 1.1 Berechtigungssystem-Architektur

**Datenmodell (Prisma Schema):**
- `Permission` Model: `id`, `roleId`, `entity` (String), `entityType` (String, default: "page"), `accessLevel` (String)
- `Role` Model: `id`, `name`, `description`, `organizationId` (nullable), `permissions` (Relation)
- `UserRole` Model: `userId`, `roleId`, `lastUsed` (Boolean)
- AccessLevels: `'none'`, `'read'`, `'write'`, `'both'`
- EntityTypes: `'page'`, `'table'`, `'button'`, `'cerebro'`

**Backend Middleware:**
- Datei: `backend/src/middleware/permissionMiddleware.ts`
- Funktion: `checkPermission(entity, requiredAccess, entityType)`
- Funktion: `checkUserPermission(userId, roleId, entity, requiredAccess, entityType)`
- Verwendet in: `backend/src/routes/cerebro.ts` (Zeilen 58-85)

**Frontend Hook:**
- Datei: `frontend/src/hooks/usePermissions.ts`
- Funktion: `hasPermission(entity, requiredLevel, entityType)`
- Verwendet in: 30+ Komponenten

### 1.2 Standardrollen (aus seed.ts)

**Admin (ID 1):**
- Alle Seiten: `'both'`
- Alle Tabellen: `'both'`
- Alle Buttons: `'both'`
- Cerebro: `'both'` (entityType: 'cerebro')

**User (ID 2):**
- Seiten: `dashboard`, `worktracker`, `consultations`, `payroll`, `cerebro`, `settings`, `profile` = `'both'`
- Seiten: `organization_management` = `'read'` (nur ohne Organisation)
- Tabellen: `requests`, `clients`, `consultation_invoices`, `notifications`, `monthly_reports`, `reservations` = `'both'`
- Buttons: Invoice-, Consultation-, Client-, Settings-Buttons (außer system), Worktime start/stop = `'both'`
- Cerebro: `'both'` (entityType: 'cerebro')

**Hamburger (ID 999):**
- Seiten: `dashboard`, `settings`, `profile`, `cerebro` = `'both'`
- Tabellen: `notifications` = `'both'`
- Buttons: `cerebro`, `settings_profile` = `'both'`
- Cerebro: `'both'` (entityType: 'cerebro')

### 1.3 Alle definierten Entitäten

**Seiten (9):** `dashboard`, `worktracker`, `consultations`, `team_worktime_control`, `payroll`, `organization_management`, `cerebro`, `settings`, `profile`

**Tabellen (16):** `requests`, `tasks`, `reservations`, `users`, `roles`, `organization`, `team_worktime`, `worktime`, `clients`, `consultation_invoices`, `branches`, `notifications`, `settings`, `monthly_reports`, `organization_join_requests`, `organization_users`

**Buttons (40):** `database_reset_table`, `database_logs`, `invoice_create`, `invoice_download`, `invoice_mark_paid`, `invoice_settings`, `todo_create`, `todo_edit`, `todo_delete`, `task_create`, `task_edit`, `task_delete`, `user_create`, `user_edit`, `user_delete`, `role_assign`, `role_create`, `role_edit`, `role_delete`, `organization_create`, `organization_edit`, `organization_delete`, `worktime_start`, `worktime_stop`, `worktime_edit`, `worktime_delete`, `cerebro`, `consultation_start`, `consultation_stop`, `consultation_edit`, `client_create`, `client_edit`, `client_delete`, `settings_system`, `settings_notifications`, `settings_profile`, `payroll_generate`, `payroll_export`, `payroll_edit`

### 1.4 Tab-Stellen im System

**1. Worktracker (`frontend/src/pages/Worktracker.tsx`):**
- Zeile 1421-1443: Tab-Navigation
- Tab `todos`: Immer sichtbar (keine Prüfung)
- Tab `reservations`: Mit Prüfung `hasPermission('reservations', 'read', 'table')` (Zeile 1431)

**2. Team Worktime Control (`frontend/src/pages/TeamWorktimeControl.tsx`):**
- Zeile 174-217: Tab-Navigation
- Tab `worktimes`: Keine Prüfung (Zeile 176-185)
- Tab `shifts`: Keine Prüfung (Zeile 186-195)
- Tab `todos`: Keine Prüfung (Zeile 196-205)
- Tab `requests`: Keine Prüfung (Zeile 206-215)

**3. Payroll (`frontend/src/pages/Payroll.tsx`):**
- Zeile 70-90: Tab-Navigation
- Tab `invoices`: Keine Prüfung (Zeile 72-88)
- Tab `monthly-reports`: Keine Prüfung (Zeile 72-88)
- Tab `payroll`: Keine Prüfung (Zeile 72-88)

**4. Organisation (`frontend/src/pages/Organisation.tsx`):**
- Zeile 104-184: Tab-Navigation
- Tab `users`: Mit Prüfung `hasPermission('users', 'read', 'table')` (Zeile 29, 107-125)
- Tab `roles`: Mit Prüfung `hasPermission('roles', 'read', 'table')` (Zeile 29, 128-146)
- Tab `branches`: Mit Prüfung `hasPermission('branches', 'read', 'table')` (Zeile 30, 149-167)
- Tab `organization`: Mit Prüfung `canViewOrganization()` (Zeile 31, 170-182)

**5. Profile (`frontend/src/pages/Profile.tsx`):**
- Zeile 266-313: Tab-Navigation
- Tab `profile`: Keine Prüfung (Zeile 268-278)
- Tab `documents`: Keine Prüfung (Zeile 279-289)
- Tab `lifecycle`: Keine Prüfung (Zeile 290-300)
- Tab `myDocuments`: Keine Prüfung (Zeile 301-311)

**6. Branch Management (`frontend/src/components/BranchManagementTab.tsx`):**
- Zeile 751-768: Settings-Tabs (nur beim Bearbeiten)
- Tabs: `whatsapp`, `lobbypms`, `boldpayment`, `doorsystem`, `sire`, `email` - Keine Prüfung

### 1.5 Widersprüche Code vs. Dokumentation

**1. BERECHTIGUNGSSYSTEM.md:**
- Zeile 150-171: Beschreibt aktuelles System korrekt (entity, entityType, accessLevel)
- Zeile 176-262: Zeigt veraltete Middleware-Beispiele (authenticate, hasPermission mit Permission.code)
- Zeile 294-395: Zeigt veraltete Frontend-Implementierung (AuthContext mit Permission.code)

**2. DATENBANKSCHEMA.md:**
- Zeile 454: `Role.name` als `@unique` dokumentiert
- Faktisch: `Role.name` ist `@unique([name, organizationId])` (organisationsspezifisch)

**3. Standardrollen:**
- Dokumentation: Beschreibt Admin, User, Hamburger korrekt
- Code: Seed-Datei implementiert korrekt, aber Dokumentation fehlt Details

---

## 2. ZU IMPLEMENTIERENDE ÄNDERUNGEN

### 2.1 Tab-Berechtigungen hinzufügen

#### 2.1.1 Team Worktime Control Tabs

**Datei:** `frontend/src/pages/TeamWorktimeControl.tsx`

**Änderung 1: Tab `worktimes`**
- Zeile: 176-185
- Aktuell: Keine Prüfung
- Neu: `hasPermission('team_worktime', 'read', 'table')` Prüfung hinzufügen
- Tab soll nur sichtbar sein wenn Berechtigung vorhanden

**Änderung 2: Tab `shifts`**
- Zeile: 186-195
- Aktuell: Keine Prüfung
- Neu: `hasPermission('team_worktime_control', 'read', 'page')` Prüfung hinzufügen
- Tab soll nur sichtbar sein wenn Berechtigung vorhanden
- Begründung: Shifts sind Teil der Team Worktime Control Seite

**Änderung 3: Tab `todos`**
- Zeile: 196-205
- Aktuell: Keine Prüfung
- Neu: `hasPermission('tasks', 'read', 'table')` Prüfung hinzufügen
- Tab soll nur sichtbar sein wenn Berechtigung vorhanden

**Änderung 4: Tab `requests`**
- Zeile: 206-215
- Aktuell: Keine Prüfung
- Neu: `hasPermission('requests', 'read', 'table')` Prüfung hinzufügen
- Tab soll nur sichtbar sein wenn Berechtigung vorhanden

**Änderung 5: Tab-Content Rendering**
- Zeile: 220-241
- Aktuell: Tab-Content wird immer gerendert
- Neu: Tab-Content nur rendern wenn entsprechende Berechtigung vorhanden
- `worktimes`: Prüfung `hasPermission('team_worktime', 'read', 'table')`
- `shifts`: Prüfung `hasPermission('team_worktime_control', 'read', 'page')`
- `todos`: Prüfung `hasPermission('tasks', 'read', 'table')`
- `requests`: Prüfung `hasPermission('requests', 'read', 'table')`

#### 2.1.2 Payroll Tabs

**Datei:** `frontend/src/pages/Payroll.tsx`

**Änderung 1: Tab `invoices`**
- Zeile: 72-88 (in tabs.map)
- Aktuell: Keine Prüfung
- Neu: `hasPermission('consultation_invoices', 'read', 'table')` Prüfung hinzufügen
- Tab soll nur sichtbar sein wenn Berechtigung vorhanden

**Änderung 2: Tab `monthly-reports`**
- Zeile: 72-88 (in tabs.map)
- Aktuell: Keine Prüfung
- Neu: `hasPermission('monthly_reports', 'read', 'table')` Prüfung hinzufügen
- Tab soll nur sichtbar sein wenn Berechtigung vorhanden

**Änderung 3: Tab `payroll`**
- Zeile: 72-88 (in tabs.map)
- Aktuell: Keine Prüfung
- Neu: `hasPermission('payroll', 'read', 'page')` Prüfung hinzufügen
- Tab soll nur sichtbar sein wenn Berechtigung vorhanden

**Änderung 4: Tab-Content Rendering**
- Zeile: 93-95
- Aktuell: Tab-Content wird immer gerendert
- Neu: Tab-Content nur rendern wenn entsprechende Berechtigung vorhanden
- `invoices`: Prüfung `hasPermission('consultation_invoices', 'read', 'table')`
- `monthly-reports`: Prüfung `hasPermission('monthly_reports', 'read', 'table')`
- `payroll`: Prüfung `hasPermission('payroll', 'read', 'page')`

**Änderung 5: Default Tab setzen**
- Zeile: 14
- Aktuell: `useState<TabType>('invoices')`
- Neu: Default Tab basierend auf verfügbaren Berechtigungen setzen
- Reihenfolge: `invoices` → `monthly-reports` → `payroll`
- Fallback: Erster verfügbarer Tab

#### 2.1.3 Profile Tabs

**Datei:** `frontend/src/pages/Profile.tsx`

**Entscheidung:** Profile-Tabs benötigen KEINE Berechtigungsprüfung
- Begründung: Profile-Seite ist immer sichtbar (alwaysVisiblePages)
- Alle Tabs sind Teil des eigenen Profils
- Keine Änderung erforderlich

#### 2.1.4 Branch Management Settings Tabs

**Datei:** `frontend/src/components/BranchManagementTab.tsx`

**Entscheidung:** Settings-Tabs benötigen KEINE separate Berechtigungsprüfung
- Begründung: Tabs sind nur beim Bearbeiten sichtbar (Zeile 748: `{editingBranch && ...}`)
- Berechtigung wird bereits auf Branch-Ebene geprüft
- Keine Änderung erforderlich

### 2.2 Seed-Datei: Standardberechtigungssets aktualisieren

**Datei:** `backend/prisma/seed.ts`

**Änderung 1: Admin-Berechtigungen**
- Zeile: 300-314
- Aktuell: Alle Berechtigungen = `'both'`
- Status: ✅ Korrekt, keine Änderung erforderlich

**Änderung 2: User-Berechtigungen**
- Zeile: 316-367
- Aktuell: Selektive Berechtigungen
- Status: ✅ Korrekt, keine Änderung erforderlich
- Hinweis: User hat bereits `table_requests` = `'both'` (Zeile 337)
- Hinweis: User hat bereits `table_tasks` = `'none'` (Zeile 343)
- Hinweis: User hat bereits `table_monthly_reports` = `'both'` (Zeile 341)
- Hinweis: User hat bereits `table_consultation_invoices` = `'both'` (Zeile 339)
- Hinweis: User hat bereits `page_payroll` = `'both'` (Zeile 329)
- Hinweis: User hat bereits `page_team_worktime_control` = `'none'` (Zeile 334)

**Änderung 3: Hamburger-Berechtigungen**
- Zeile: 369-390
- Aktuell: Basis-Berechtigungen
- Status: ✅ Korrekt, keine Änderung erforderlich

**Änderung 4: Neue Tab-Berechtigungen für Standardrollen**
- Keine neuen Berechtigungen erforderlich
- Alle benötigten Berechtigungen sind bereits vorhanden:
  - `team_worktime` (Tabelle) - bereits in ALL_TABLES
  - `team_worktime_control` (Seite) - bereits in ALL_PAGES
  - `tasks` (Tabelle) - bereits in ALL_TABLES
  - `requests` (Tabelle) - bereits in ALL_TABLES
  - `consultation_invoices` (Tabelle) - bereits in ALL_TABLES
  - `monthly_reports` (Tabelle) - bereits in ALL_TABLES
  - `payroll` (Seite) - bereits in ALL_PAGES

### 2.3 Dokumentation aktualisieren

**Datei:** `docs/technical/BERECHTIGUNGSSYSTEM.md`

**Änderung 1: Veraltete Middleware-Beispiele entfernen**
- Zeile: 176-262
- Aktuell: Zeigt veraltete `authenticate` und `hasPermission` Middleware
- Neu: Ersetzen durch aktuelle `checkPermission` Middleware aus `permissionMiddleware.ts`
- Beispiel-Code aktualisieren mit korrekter Signatur

**Änderung 2: Veraltete Frontend-Beispiele entfernen**
- Zeile: 294-395
- Aktuell: Zeigt veralteten AuthContext mit Permission.code
- Neu: Ersetzen durch aktuellen `usePermissions` Hook
- Beispiel-Code aktualisieren mit korrekter Signatur

**Änderung 3: Tab-Berechtigungen dokumentieren**
- Neu: Abschnitt "Tab-Berechtigungen" hinzufügen
- Dokumentiere alle Tab-Stellen mit ihren Berechtigungsprüfungen
- Liste: Worktracker, Team Worktime Control, Payroll, Organisation, Profile

**Änderung 4: Standardberechtigungssets dokumentieren**
- Neu: Abschnitt "Standardberechtigungssets" hinzufügen
- Vollständige Liste aller Berechtigungen für Admin, User, Hamburger
- Referenz auf seed.ts

**Datei:** `docs/technical/DATENBANKSCHEMA.md`

**Änderung 1: Role.name Constraint korrigieren**
- Zeile: 454
- Aktuell: `@unique` dokumentiert
- Neu: `@unique([name, organizationId])` dokumentieren
- Hinweis: Rollennamen sind organisationsspezifisch

### 2.4 RoleManagementTab: Tab-Berechtigungen hinzufügen

**Datei:** `frontend/src/components/RoleManagementTab.tsx`

**Entscheidung:** KEINE Änderung erforderlich
- Begründung: Tab-Berechtigungen sind keine neuen EntityTypes
- Tabs verwenden bestehende Berechtigungen (Seiten/Tabellen)
- Keine neuen Berechtigungstypen erforderlich

---

## 3. DETAILLIERTE IMPLEMENTIERUNGSSCHRITTE

### Schritt 1: Team Worktime Control Tabs

**Datei:** `frontend/src/pages/TeamWorktimeControl.tsx`

**1.1 Import usePermissions (falls nicht vorhanden)**
- Zeile: 11
- Prüfen: `import { usePermissions } from '../hooks/usePermissions.ts';` vorhanden
- Status: ✅ Bereits vorhanden (Zeile 11)

**1.2 hasPermission Hook verwenden**
- Zeile: 17
- Prüfen: `const { hasPermission } = usePermissions();` vorhanden
- Status: ✅ Bereits vorhanden (Zeile 17)

**1.3 Tab `worktimes` Berechtigungsprüfung**
- Zeile: 176-185
- Änderung: Button mit Conditional Rendering umschließen
- Code:
```tsx
{hasPermission('team_worktime', 'read', 'table') && (
  <button
    onClick={() => setActiveTab('worktimes')}
    className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 ${
      activeTab === 'worktimes'
        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
    }`}
  >
    {t('teamWorktime.tabs.worktimes')}
  </button>
)}
```

**1.4 Tab `shifts` Berechtigungsprüfung**
- Zeile: 186-195
- Änderung: Button mit Conditional Rendering umschließen
- Code:
```tsx
{hasPermission('team_worktime_control', 'read', 'page') && (
  <button
    onClick={() => setActiveTab('shifts')}
    className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 ${
      activeTab === 'shifts'
        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
    }`}
  >
    {t('teamWorktime.tabs.shifts')}
  </button>
)}
```

**1.5 Tab `todos` Berechtigungsprüfung**
- Zeile: 196-205
- Änderung: Button mit Conditional Rendering umschließen
- Code:
```tsx
{hasPermission('tasks', 'read', 'table') && (
  <button
    onClick={() => setActiveTab('todos')}
    className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 ${
      activeTab === 'todos'
        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
    }`}
  >
    {t('teamWorktime.tabs.todos')}
  </button>
)}
```

**1.6 Tab `requests` Berechtigungsprüfung**
- Zeile: 206-215
- Änderung: Button mit Conditional Rendering umschließen
- Code:
```tsx
{hasPermission('requests', 'read', 'table') && (
  <button
    onClick={() => setActiveTab('requests')}
    className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 ${
      activeTab === 'requests'
        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
    }`}
  >
    {t('teamWorktime.tabs.requests')}
  </button>
)}
```

**1.7 Tab-Content Rendering mit Berechtigungsprüfung**
- Zeile: 220-241
- Änderung: Tab-Content nur rendern wenn Berechtigung vorhanden
- Code:
```tsx
{activeTab === 'worktimes' && hasPermission('team_worktime', 'read', 'table') && (
  <ActiveUsersList
    activeUsers={activeUsers}
    allWorktimes={allWorktimes}
    loading={loading}
    selectedDate={selectedDate}
    onDateChange={setSelectedDate}
    onStopWorktime={stopUserWorktime}
    onRefresh={fetchActiveUsers}
    showTodos={true}
    showRequests={true}
  />
)}
{activeTab === 'shifts' && hasPermission('team_worktime_control', 'read', 'page') && (
  <ShiftPlannerTab selectedDate={selectedDate} />
)}
{activeTab === 'todos' && hasPermission('tasks', 'read', 'table') && (
  <TodoAnalyticsTab selectedDate={selectedDate} />
)}
{activeTab === 'requests' && hasPermission('requests', 'read', 'table') && (
  <RequestAnalyticsTab selectedDate={selectedDate} />
)}
```

**1.8 Default Tab setzen basierend auf Berechtigungen**
- Zeile: 28
- Aktuell: `const [activeTab, setActiveTab] = useState<TabType>('worktimes');`
- Änderung: useEffect hinzufügen um Default Tab basierend auf Berechtigungen zu setzen
- Code:
```tsx
useEffect(() => {
  if (hasPermission('team_worktime', 'read', 'table')) {
    setActiveTab('worktimes');
  } else if (hasPermission('team_worktime_control', 'read', 'page')) {
    setActiveTab('shifts');
  } else if (hasPermission('tasks', 'read', 'table')) {
    setActiveTab('todos');
  } else if (hasPermission('requests', 'read', 'table')) {
    setActiveTab('requests');
  }
}, [hasPermission]);
```

### Schritt 2: Payroll Tabs

**Datei:** `frontend/src/pages/Payroll.tsx`

**2.1 Import usePermissions**
- Zeile: 1-7
- Prüfen: `import { usePermissions } from '../hooks/usePermissions.ts';` vorhanden
- Status: ❌ Nicht vorhanden - HINZUFÜGEN

**2.2 hasPermission Hook verwenden**
- Zeile: 11-16
- Änderung: `const { hasPermission } = usePermissions();` hinzufügen
- Nach Zeile: 13 (nach `const location = useLocation();`)

**2.3 Tabs Array mit Berechtigungsprüfung filtern**
- Zeile: 44-63
- Änderung: Tabs Array mit `.filter()` filtern basierend auf Berechtigungen
- Code:
```tsx
const { hasPermission } = usePermissions();

const allTabs = [
  {
    id: 'invoices' as TabType,
    name: t('payroll.tabs.invoices'),
    icon: DocumentTextIcon,
    component: <InvoiceManagementTab />,
    requiredPermission: { entity: 'consultation_invoices', level: 'read', type: 'table' }
  },
  {
    id: 'monthly-reports' as TabType,
    name: t('payroll.tabs.monthlyReports'),
    icon: ClipboardDocumentListIcon,
    component: <MonthlyReportsTab />,
    requiredPermission: { entity: 'monthly_reports', level: 'read', type: 'table' }
  },
  {
    id: 'payroll' as TabType,
    name: t('payroll.tabs.payroll'),
    icon: CalculatorIcon,
    component: <PayrollComponent />,
    requiredPermission: { entity: 'payroll', level: 'read', type: 'page' }
  }
];

const tabs = allTabs.filter(tab => 
  hasPermission(tab.requiredPermission.entity, tab.requiredPermission.level, tab.requiredPermission.type)
);
```

**2.4 Default Tab setzen basierend auf verfügbaren Tabs**
- Zeile: 14
- Änderung: useEffect hinzufügen um Default Tab basierend auf verfügbaren Tabs zu setzen
- Code:
```tsx
useEffect(() => {
  if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
    setActiveTab(tabs[0].id);
  }
}, [tabs, activeTab]);
```

**2.5 Tab-Content Rendering**
- Zeile: 93-95
- Status: ✅ Bereits korrekt - verwendet `tabs.find(tab => tab.id === activeTab)?.component`
- Keine Änderung erforderlich

### Schritt 3: Dokumentation aktualisieren

**Datei:** `docs/technical/BERECHTIGUNGSSYSTEM.md`

**3.1 Middleware-Beispiele aktualisieren**
- Zeile: 176-262
- Ersetzen durch:
```markdown
#### Middleware für Berechtigungsprüfung

Die Berechtigungsprüfung im Backend erfolgt durch eine Express-Middleware:

```typescript
// src/middleware/permissionMiddleware.ts

import { checkPermission } from '../middleware/permissionMiddleware';

// Verwendung in Routen
router.post('/articles', 
  authenticateToken, 
  checkPermission('cerebro', 'write', 'cerebro'), 
  cerebroController.createArticle
);

router.get('/users', 
  authenticateToken, 
  checkPermission('users', 'read', 'table'), 
  userController.getAllUsers
);
```

**3.2 Frontend-Beispiele aktualisieren**
- Zeile: 294-395
- Ersetzen durch:
```markdown
#### usePermissions Hook

Im Frontend wird der `usePermissions` Hook verwendet:

```tsx
// src/hooks/usePermissions.ts

import { usePermissions } from '../hooks/usePermissions';

const MyComponent = () => {
  const { hasPermission } = usePermissions();
  
  if (!hasPermission('users', 'read', 'table')) {
    return <div>Keine Berechtigung</div>;
  }
  
  return <UserList />;
};
```

**3.3 Tab-Berechtigungen Abschnitt hinzufügen**
- Nach Zeile: 515 (nach "Bewährte Methoden")
- Neu: Abschnitt "Tab-Berechtigungen" hinzufügen
- Inhalt: Liste aller Tab-Stellen mit ihren Berechtigungsprüfungen

**3.4 Standardberechtigungssets Abschnitt hinzufügen**
- Nach Zeile: 515 (nach "Bewährte Methoden")
- Neu: Abschnitt "Standardberechtigungssets" hinzufügen
- Inhalt: Vollständige Liste aller Berechtigungen für Admin, User, Hamburger
- Referenz: Siehe `backend/prisma/seed.ts` für Implementierung

**Datei:** `docs/technical/DATENBANKSCHEMA.md`

**3.5 Role.name Constraint korrigieren**
- Zeile: 454
- Änderung: `@unique` → `@unique([name, organizationId])`
- Hinweis hinzufügen: "Rollenname ist organisationsspezifisch"

---

## 4. TEST-PLAN

### 4.1 Team Worktime Control Tabs

**Test 1: Tab `worktimes`**
- Voraussetzung: User mit `team_worktime` (table, read) Berechtigung
- Erwartung: Tab sichtbar und funktional
- Voraussetzung: User ohne `team_worktime` Berechtigung
- Erwartung: Tab nicht sichtbar

**Test 2: Tab `shifts`**
- Voraussetzung: User mit `team_worktime_control` (page, read) Berechtigung
- Erwartung: Tab sichtbar und funktional
- Voraussetzung: User ohne `team_worktime_control` Berechtigung
- Erwartung: Tab nicht sichtbar

**Test 3: Tab `todos`**
- Voraussetzung: User mit `tasks` (table, read) Berechtigung
- Erwartung: Tab sichtbar und funktional
- Voraussetzung: User ohne `tasks` Berechtigung
- Erwartung: Tab nicht sichtbar

**Test 4: Tab `requests`**
- Voraussetzung: User mit `requests` (table, read) Berechtigung
- Erwartung: Tab sichtbar und funktional
- Voraussetzung: User ohne `requests` Berechtigung
- Erwartung: Tab nicht sichtbar

**Test 5: Default Tab**
- Voraussetzung: User mit nur `worktimes` Berechtigung
- Erwartung: Default Tab = `worktimes`
- Voraussetzung: User mit nur `shifts` Berechtigung
- Erwartung: Default Tab = `shifts`

### 4.2 Payroll Tabs

**Test 1: Tab `invoices`**
- Voraussetzung: User mit `consultation_invoices` (table, read) Berechtigung
- Erwartung: Tab sichtbar und funktional
- Voraussetzung: User ohne `consultation_invoices` Berechtigung
- Erwartung: Tab nicht sichtbar

**Test 2: Tab `monthly-reports`**
- Voraussetzung: User mit `monthly_reports` (table, read) Berechtigung
- Erwartung: Tab sichtbar und funktional
- Voraussetzung: User ohne `monthly_reports` Berechtigung
- Erwartung: Tab nicht sichtbar

**Test 3: Tab `payroll`**
- Voraussetzung: User mit `payroll` (page, read) Berechtigung
- Erwartung: Tab sichtbar und funktional
- Voraussetzung: User ohne `payroll` Berechtigung
- Erwartung: Tab nicht sichtbar

**Test 4: Default Tab**
- Voraussetzung: User mit nur `invoices` Berechtigung
- Erwartung: Default Tab = `invoices`
- Voraussetzung: User mit nur `monthly-reports` Berechtigung
- Erwartung: Default Tab = `monthly-reports`

### 4.3 Standardrollen

**Test 1: Admin-Rolle**
- Voraussetzung: User mit Admin-Rolle
- Erwartung: Alle Tabs sichtbar

**Test 2: User-Rolle**
- Voraussetzung: User mit User-Rolle
- Erwartung: 
  - Payroll: `invoices`, `monthly-reports`, `payroll` sichtbar (alle `both`)
  - Team Worktime Control: Keine Tabs sichtbar (keine Berechtigungen)

**Test 3: Hamburger-Rolle**
- Voraussetzung: User mit Hamburger-Rolle
- Erwartung:
  - Payroll: Keine Tabs sichtbar (keine Berechtigungen)
  - Team Worktime Control: Keine Tabs sichtbar (keine Berechtigungen)

---

## 5. RISIKEN UND ABHÄNGIGKEITEN

### 5.1 Risiken

**Risiko 1: Default Tab nicht verfügbar**
- Problem: Wenn Default Tab keine Berechtigung hat, wird nichts angezeigt
- Lösung: useEffect implementieren um ersten verfügbaren Tab zu setzen

**Risiko 2: Tab-Wechsel zu nicht verfügbarem Tab**
- Problem: URL-Parameter könnte zu nicht verfügbarem Tab führen
- Lösung: useEffect in Payroll.tsx prüft verfügbare Tabs und setzt Default

**Risiko 3: Berechtigungen nicht geladen**
- Problem: hasPermission gibt false zurück während Laden
- Lösung: permissionsLoading State prüfen (bereits in usePermissions implementiert)

### 5.2 Abhängigkeiten

**Abhängigkeit 1: usePermissions Hook**
- Status: ✅ Bereits implementiert
- Datei: `frontend/src/hooks/usePermissions.ts`

**Abhängigkeit 2: Berechtigungen in Datenbank**
- Status: ✅ Bereits vorhanden
- Alle benötigten Berechtigungen sind in seed.ts definiert

**Abhängigkeit 3: Übersetzungen**
- Status: ✅ Bereits vorhanden
- Tab-Namen sind bereits übersetzt

---

## 6. CHECKLISTE VOR UMSETZUNG

- [ ] Alle Code-Stellen identifiziert
- [ ] Alle Zeilennummern verifiziert
- [ ] Alle Berechtigungen verifiziert
- [ ] Alle Abhängigkeiten geprüft
- [ ] Test-Plan erstellt
- [ ] Risiken identifiziert
- [ ] Lösungen für Risiken definiert
- [ ] Dokumentations-Updates definiert
- [ ] Keine offenen Fragen

---

## 7. ZUSAMMENFASSUNG

**Zu ändernde Dateien:**
1. `frontend/src/pages/TeamWorktimeControl.tsx` - Tab-Berechtigungen hinzufügen
2. `frontend/src/pages/Payroll.tsx` - Tab-Berechtigungen hinzufügen
3. `docs/technical/BERECHTIGUNGSSYSTEM.md` - Dokumentation aktualisieren
4. `docs/technical/DATENBANKSCHEMA.md` - Role.name Constraint korrigieren

**Nicht zu ändernde Dateien:**
- `backend/prisma/seed.ts` - Berechtigungen bereits korrekt
- `frontend/src/pages/Profile.tsx` - Tabs benötigen keine Berechtigungen
- `frontend/src/components/BranchManagementTab.tsx` - Settings-Tabs benötigen keine Berechtigungen
- `frontend/src/components/RoleManagementTab.tsx` - Keine neuen EntityTypes erforderlich

**Neue Berechtigungen:**
- Keine neuen Berechtigungen erforderlich
- Alle benötigten Berechtigungen sind bereits vorhanden

**Standardberechtigungssets:**
- Keine Änderungen erforderlich
- Alle Standardrollen haben bereits korrekte Berechtigungen

---

**ENDE DES PLANS - BEREIT FÜR UMSETZUNG**

