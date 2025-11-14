# User-Onboarding-Prozess Verfeinerung - Implementierungsplan

## ⚠️ WICHTIG: Vor der Implementierung lesen

Dieser Plan wurde basierend auf einer detaillierten Code-Analyse erstellt und berücksichtigt:
- Bestehende Strukturen und Technologien
- Design-Standards (DESIGN_STANDARDS.md, CODING_STANDARDS.md)
- Berechtigungssystem (BERECHTIGUNGSSYSTEM.md)
- Risiken und Migrationen
- Kompatibilität mit bestehendem System

## Übersicht

Dieser Plan beschreibt die Verfeinerung des User-Onboarding-Prozesses in 3 Hauptphasen:

1. **Phase 1: Profilvollständigkeit nach Registrierung** - User muss Basis-Profilinfos ausfüllen
2. **Phase 2: Dokumenten-Upload nach Organisation-Beitritt (Kolumbien)** - Dokument hochladen, automatische Extraktion, Admin-To-Do
3. **Phase 3: Lebenszyklus-Start nach Admin-To-Do** - Automatische Rollenzuweisung und Berechtigungsaktivierung

## Bestehende Strukturen, die genutzt werden

### Bereits vorhanden:
- ✅ `isProfileIncomplete()` in `Profile.tsx` (muss angepasst werden)
- ✅ `onboardingCompleted` Feld im User-Model (kann für andere Zwecke verwendet werden)
- ✅ `LifecycleService.createLifecycle()` - Lebenszyklus-Erstellung
- ✅ `TaskAutomationService.createOnboardingTasks()` - Task-Automatisierung
- ✅ `IdentificationDocument` Model - Dokumentenverwaltung
- ✅ `recognizeDocumentWithAI()` - KI-basierte Dokumentenerkennung
- ✅ `alwaysVisiblePages` Konzept in Sidebar
- ✅ Berechtigungssystem mit `entity` und `entityType`
- ✅ `processJoinRequest` - Organisation-Beitritt (weist Hamburger-Rolle zu)

### Zu beachten:
- ⚠️ `identificationNumber` existiert im User-Model (Zeile 32) - **NICHT entfernen**, da verwendet
- ⚠️ `identificationType`, `identificationExpiryDate`, `identificationIssuingCountry` existieren **NICHT** im User-Model
- ⚠️ Organisation-Beitritt weist standardmäßig **Hamburger-Rolle** zu (nicht User-Rolle)
- ⚠️ `alwaysVisiblePages` in Sidebar: `['dashboard', 'settings']` - muss "profile" hinzugefügt werden

---

## PHASE 1: Profilvollständigkeit nach Registrierung

### Anforderungen

**Pflichtfelder nach Registrierung:**
- Username (sollte bereits vorhanden sein)
- Email (sollte bereits vorhanden sein)
- Land (country)
- Sprache (language)

**Restriktionen bei unvollständigem Profil:**
- User darf nur Profil-Seite sehen, aber nichts nutzen können
- Keine Requests anlegen, sehen oder bearbeiten
- Keine Zeiterfassung starten
- Keine Tasks sehen oder bearbeiten
- Keine Organisationen verwalten
- Von allen sichtbaren Seiten aus auf Profil-Seite verwiesen werden

### Implementierungsschritte

#### 1.1 Datenbank-Schema

**Bestehende Felder (keine Änderung nötig):**
- `User.username` (String, unique, required) ✅
- `User.email` (String, unique, required) ✅
- `User.country` (String, default: "CO") ✅
- `User.language` (String, default: "es") ✅

**Neues Feld hinzufügen:**
```prisma
model User {
  // ... bestehende Felder (Zeile 10-73)
  profileComplete Boolean @default(false) // NEU: Profilvollständigkeit nach Registrierung
}
```

**⚠️ Migration erforderlich:**
- Erstelle Migration: `add_profile_complete_to_user`
- Setze `profileComplete = false` für alle bestehenden User (Standard)
- Nach Migration: Bestehende User müssen Profil vervollständigen

**Hinweis:** `onboardingCompleted` (Zeile 68) existiert bereits, wird aber für andere Zwecke verwendet (Onboarding-Tour). `profileComplete` ist spezifisch für Profilvollständigkeit nach Registrierung.

#### 1.2 Backend-Validierung

**Datei:** `backend/src/controllers/userController.ts`

**Funktion:** `updateProfile` erweitern
- Prüfe nach Update, ob alle Pflichtfelder ausgefüllt sind
- Setze `profileComplete = true` wenn alle Felder vorhanden sind

**Neue Funktion:** `isProfileComplete(userId: number): Promise<boolean>`
```typescript
// Datei: backend/src/controllers/userController.ts
// Nutze bestehende Struktur (ähnlich wie updateProfile)

export const isProfileComplete = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    if (isNaN(userId)) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        email: true,
        country: true,
        language: true,
        profileComplete: true // Nutze Feld, falls bereits gesetzt
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    // Prüfe Felder
    const missingFields: string[] = [];
    if (!user.username) missingFields.push('username');
    if (!user.email) missingFields.push('email');
    if (!user.country) missingFields.push('country');
    if (!user.language) missingFields.push('language');

    const complete = missingFields.length === 0;

    // Update profileComplete, falls noch nicht gesetzt
    if (complete && !user.profileComplete) {
      await prisma.user.update({
        where: { id: userId },
        data: { profileComplete: true }
      });
    }

    return res.json({
      complete,
      missingFields
    });
  } catch (error) {
    console.error('Error in isProfileComplete:', error);
    res.status(500).json({
      message: 'Fehler bei der Profilprüfung',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};
```

**Neuer Endpoint:** `GET /users/profile/complete`
- Gibt zurück: `{ complete: boolean, missingFields: string[] }`

#### 1.3 Backend-Berechtigungsprüfung

**Datei:** `backend/src/middleware/permissionMiddleware.ts`

**Middleware erweitern:** `checkPermission`
- Vor jeder Berechtigungsprüfung prüfen, ob `profileComplete === true`
- Falls nicht: 403 Forbidden mit Message "Profil muss zuerst vervollständigt werden"
- Ausnahme: Profil-Seite selbst (`/profile`) und `/users/profile/complete`

**Neue Middleware:** `requireCompleteProfile`
```typescript
export const requireCompleteProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = parseInt(req.userId, 10);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profileComplete: true }
  });
  
  if (!user?.profileComplete) {
    return res.status(403).json({
      message: 'Profil muss zuerst vervollständigt werden',
      redirectTo: '/profile'
    });
  }
  
  next();
};
```

**Anwenden auf alle relevanten Routes:**
- `/api/requests/*` (außer GET für Liste ohne Details)
- `/api/tasks/*` (außer GET für Liste ohne Details)
- `/api/worktime/*` (alle außer GET für aktive Zeiterfassung)
- `/api/organization/*` (außer GET `/api/organization` für Liste)
- `/api/users/*` (außer GET `/users/profile` und GET `/users/profile/complete`)

**⚠️ WICHTIG:** Profil-Seite selbst (`/api/users/profile`) und Prüf-Endpoint (`/api/users/profile/complete`) müssen **AUSGENOMMEN** werden, damit User sein Profil vervollständigen kann!

#### 1.4 Frontend-Profilprüfung

**Datei:** `frontend/src/pages/Profile.tsx`

**⚠️ WICHTIG:** Bestehende `isProfileIncomplete()` Funktion existiert bereits (Zeile 208-210), prüft aber andere Felder:
- Aktuell: `birthday`, `bankDetails`, `contract`, `salary`, `normalWorkingHours`
- Neu: `username`, `email`, `country`, `language`

**Funktion ersetzen:**
```typescript
// Ersetze bestehende isProfileIncomplete() Funktion (Zeile 208-210)
const isProfileIncomplete = () => {
  if (!user) return true;
  return !(
    user.username &&
    user.email &&
    user.country &&
    user.language
  );
};
```

**Warnung anzeigen (bestehende Struktur erweitern):**
- Bestehende Warnung existiert bereits (Zeile 216-231)
- **Anpassen:** Text ändern zu: "Bitte vervollständigen Sie Ihr Profil: Username, Email, Land und Sprache sind erforderlich"
- **Design-Standard:** Nutze bestehende Warnung-Struktur (gelber Hintergrund, border-l-4)
- **Übersetzungen:** Nutze `t('profile.profileIncomplete')` und `t('profile.completeProfile')` (bereits vorhanden in i18n)

**Feld-Reihenfolge anpassen:**
1. Username (readonly, bereits vorhanden)
2. Email (readonly, bereits vorhanden)
3. Land (required)
4. Sprache (required)
5. Alle anderen Felder (optional)

#### 1.5 Frontend-Berechtigungsprüfung

**Datei:** `frontend/src/hooks/usePermissions.ts`

**Neue Funktion:** `isProfileComplete(): boolean`
- Prüft `user.profileComplete` oder ruft `/users/profile/complete` auf
- Wird in `useAuth` oder `usePermissions` integriert

**Datei:** `frontend/src/components/ProtectedRoute.tsx`

**Erweitern:**
- Prüfe `isProfileComplete()` vor Berechtigungsprüfung
- Falls nicht: Redirect zu `/profile` mit Message

**Datei:** `frontend/src/components/Sidebar.tsx`

**⚠️ WICHTIG:** Bestehende `alwaysVisiblePages` existiert (Zeile 33): `['dashboard', 'settings']`
- **Erweitern:** Füge `'profile'` hinzu: `['dashboard', 'settings', 'profile']`
- **Erweitern:** Prüfe `isProfileComplete()` vor Rendering
- Alle Menü-Items außer "Profil" deaktivieren, wenn Profil unvollständig
- **Design-Standard:** Nutze `disabled` Klasse und `cursor-not-allowed` für deaktivierte Items
- Tooltip: "Bitte vervollständigen Sie zuerst Ihr Profil" (via `title` Attribut)

**Implementierung:**
```typescript
// In Sidebar.tsx, nach Zeile 33
const alwaysVisiblePages: PageName[] = ['dashboard', 'settings', 'profile']; // NEU: 'profile' hinzugefügt

// In Sidebar-Komponente, nach Zeile 36
const { isProfileComplete } = usePermissions();

// In authorizedMenuItems Filter (Zeile 152-158)
const authorizedMenuItems = [
  ...baseMenuItems.filter(item => {
    // Profil-Seite immer sichtbar
    if (item.page === 'profile') return true;
    // Wenn Profil unvollständig: Nur alwaysVisiblePages erlauben
    if (!isProfileComplete() && !alwaysVisiblePages.includes(item.page)) {
      return false;
    }
    return alwaysVisiblePages.includes(item.page) || hasPermission(item.page);
  }),
  settingsItem
].map(item => ({
  ...item,
  disabled: !isProfileComplete() && item.page !== 'profile' && !alwaysVisiblePages.includes(item.page)
}));
```

#### 1.6 Frontend-Redirects

**Datei:** `frontend/src/pages/*.tsx` (alle Seiten außer Profile)

**Prüfung am Seitenanfang:**
```typescript
const { user } = useAuth();
const { isProfileComplete } = usePermissions();

useEffect(() => {
  if (user && !isProfileComplete()) {
    navigate('/profile', { 
      state: { 
        message: 'Bitte vervollständigen Sie zuerst Ihr Profil' 
      } 
    });
  }
}, [user, isProfileComplete, navigate]);
```

**Betroffene Seiten:**
- `Requests.tsx`
- `Tasks.tsx` (WorkTracker)
- `WorkTime.tsx`
- `Organization.tsx`
- Alle anderen Seiten außer Profile

---

## PHASE 2: Dokumenten-Upload nach Organisation-Beitritt (Kolumbien)

### Anforderungen

**Trigger:** User tritt Organisation in Kolumbien bei (Organisation.country === "CO")

**Pflichtfelder:**
- Dokument (Cédula Colombia oder Pasaporte) hochladen
- Automatische Extraktion:
  - Geburtsdatum (birthday)
  - Vorname (firstName)
  - Nachname (lastName)
  - Genero (gender, falls möglich)
  - Tipo de identificacion (identificationType)
  - Numero de identificacion (identificationNumber)
  - Pais emisor (identificationIssuingCountry)
  - Fecha de vencimiento (identificationExpiryDate)

**UI-Anforderung:**
- Button für Dokumenten-Upload direkt im Profil sichtbar
- Upload zuerst möglich, dann Felder automatisch ausfüllen
- Nicht: Erst alle Felder ausfüllen, dann Upload

**Admin-To-Do:**
- Automatisches To-Do für Admin-Rolle der Organisation
- Felder für Admin ausfüllen:
  - Contrato (contract)
  - Salario (salary)
  - Horas normales de trabajo (normalWorkingHours)
- Link aus To-Do direkt auf Organisation -> User Management mit richtigem User im Dropdown

**Profil-Feld-Anordnung:**
1. Username
2. Email
3. Land
4. Sprache
5. **Dokumenten-Upload (NEU - prominent)**
6. Automatisch extrahierte Felder (nach Upload)
7. Alle anderen Felder entfernen (nicht mehr anzeigen)

**Feld-Vereinheitlichung:**
- Felder bzgl. ID-Dokument nicht doppelt führen
- Entweder in Profildaten ODER in Identifikationsdokument
- Entscheidung: Alle ID-Felder in `IdentificationDocument` führen, nicht in `User`

### Implementierungsschritte

#### 2.1 Datenbank-Schema

**Keine Schema-Änderungen nötig** - `IdentificationDocument` existiert bereits

**⚠️ KRITISCH: Prüfung der bestehenden Felder**

**Aktueller Stand im Schema (Zeile 32):**
- ✅ `User.identificationNumber` → **EXISTIERT** (String?) - **NICHT entfernen**, da möglicherweise verwendet
- ❌ `User.identificationType` → **EXISTIERT NICHT** im Schema
- ❌ `User.identificationExpiryDate` → **EXISTIERT NICHT** im Schema
- ❌ `User.identificationIssuingCountry` → **EXISTIERT NICHT** im Schema

**Entscheidung:**
- `identificationNumber` im User-Model **BEHALTEN** (für Rückwärtskompatibilität)
- Alle anderen ID-Felder sind bereits nur in `IdentificationDocument` (Zeile 548-566)
- **Keine Migration nötig** - Felder existieren bereits nur in `IdentificationDocument`

**Hinweis:** `IdentificationDocument` Model (Zeile 548-566) enthält bereits alle benötigten Felder:
- `documentType` (entspricht identificationType)
- `documentNumber` (entspricht identificationNumber)
- `expiryDate` (entspricht identificationExpiryDate)
- `issuingCountry` (entspricht identificationIssuingCountry)

#### 2.2 Backend-Dokumenten-Upload

**Datei:** `backend/src/controllers/identificationDocumentController.ts`

**Funktion erweitern:** `addDocument`
- Nach Upload: Automatische Extraktion starten
- Extrahiere Felder aus Dokument
- Update `User` mit extrahierten Feldern:
  - `birthday` (aus Dokument)
  - `firstName` (aus Dokument)
  - `lastName` (aus Dokument)
  - `gender` (aus Dokument, falls möglich)

**Neue Funktion:** `extractDocumentData(documentFile: string)`
- Nutzt bestehende `recognizeDocumentWithAI` Funktion
- Extrahiert alle benötigten Felder

**Datei:** `backend/src/utils/documentRecognition.ts`

**Erweitern:** `extractColombianID`
- Extrahiere zusätzlich:
  - `birthday` (Geburtsdatum)
  - `firstName` (Vorname)
  - `lastName` (Nachname)
  - `gender` (Genero, falls möglich)

#### 2.3 Backend-Admin-To-Do-Erstellung

**Datei:** `backend/src/services/taskAutomationService.ts`

**Neue Funktion:** `createAdminOnboardingTask(userId: number, organizationId: number)`
```typescript
// Datei: backend/src/services/taskAutomationService.ts
// Nutze bestehende Struktur (ähnlich wie createOnboardingTasks, Zeile 15-588)

static async createAdminOnboardingTask(
  userId: number, 
  organizationId: number
) {
  try {
    // Prüfe: Organisation in Kolumbien?
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { country: true, settings: true }
    });
    
    if (organization?.country !== 'CO') {
      console.log(`[createAdminOnboardingTask] Organisation ${organizationId} ist nicht in Kolumbien, überspringe Task-Erstellung`);
      return; // Nur für Kolumbien
    }
    
    // Hole User-Daten
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        branches: {
          take: 1,
          include: { branch: true }
        }
      }
    });
    
    if (!user) {
      throw new Error('User nicht gefunden');
    }
    
    // Hole Admin-Rolle (nutze bestehende Logik aus createOnboardingTasks)
    const settings = organization.settings as any;
    const lifecycleRoles = settings?.lifecycleRoles;
    let adminRoleId: number | null = lifecycleRoles?.adminRoleId || null;
    
    // Fallback: Suche nach Admin-Rolle
    if (!adminRoleId) {
      const adminRole = await prisma.role.findFirst({
        where: {
          organizationId: organizationId,
          name: { contains: 'Admin', mode: 'insensitive' }
        }
      });
      if (adminRole) {
        adminRoleId = adminRole.id;
      }
    }
    
    if (!adminRoleId) {
      console.warn(`[createAdminOnboardingTask] Keine Admin-Rolle gefunden für Organisation ${organizationId}`);
      return;
    }
    
    // Hole Admin-User für QC (nutze bestehende Logik)
    let adminUserId: number | null = null;
    if (adminRoleId) {
      const adminUser = await prisma.user.findFirst({
        where: {
          roles: {
            some: {
              roleId: adminRoleId,
              lastUsed: true
            }
          }
        }
      });
      if (adminUser) {
        adminUserId = adminUser.id;
      }
    }
    
    // Hole Branch (nutze bestehende Logik)
    let userBranch = user.branches[0]?.branch;
    if (!userBranch) {
      const firstOrgBranch = await prisma.branch.findFirst({
        where: { organizationId },
        orderBy: { id: 'asc' }
      });
      if (!firstOrgBranch) {
        throw new Error('Organisation hat keine Niederlassung');
      }
      userBranch = firstOrgBranch;
    }
    
    // Erstelle Task für Admin
    const task = await prisma.task.create({
      data: {
        title: `Profil vervollständigen: ${user.firstName || ''} ${user.lastName || ''}`.trim() || `Profil vervollständigen: User ${userId}`,
        description: `Bitte vervollständigen Sie das Profil für ${user.firstName || ''} ${user.lastName || ''}:\n- Contrato\n- Salario\n- Horas normales de trabajo\n\nLink: /organization?tab=users&userId=${userId}`,
        status: 'open',
        roleId: adminRoleId, // Zugewiesen an Admin-Rolle
        qualityControlId: adminUserId || userId, // QC = Admin (Fallback: User selbst)
        branchId: userBranch.id,
        organizationId: organizationId
      }
    });
    
    // Notification an Admin (nutze bestehende Funktion)
    if (adminUserId) {
      await createNotificationIfEnabled({
        userId: adminUserId,
        title: 'Neues Onboarding-To-Do',
        message: `Profil vervollständigen für ${user.firstName || ''} ${user.lastName || ''}`,
        type: NotificationType.task,
        relatedEntityId: task.id,
        relatedEntityType: 'task'
      });
    }
    
    console.log(`[createAdminOnboardingTask] Admin-Onboarding-Task erstellt: Task ID ${task.id} für User ${userId}`);
    return task;
  } catch (error) {
    console.error('[createAdminOnboardingTask] Fehler:', error);
    // Logge Fehler, aber breche nicht ab
    throw error;
  }
}
```

**⚠️ WICHTIG:** 
- Nutze bestehende Struktur aus `createOnboardingTasks` (Zeile 15-588)
- Nutze bestehende Fehlerbehandlung (try-catch, Logging)
- Nutze bestehende Notification-Funktion `createNotificationIfEnabled`

**Trigger:** Nach erfolgreichem Dokumenten-Upload
- In `addDocument` Controller: Nach erfolgreichem Upload `createAdminOnboardingTask` aufrufen

#### 2.4 Frontend-Dokumenten-Upload im Profil

**Datei:** `frontend/src/pages/Profile.tsx`

**Neue Sektion:** Dokumenten-Upload (prominent, oben)
- **Box:** "Identifikationsdokument hochladen"
- **Button:** "Dokument hochladen" (groß, prominent)
- **Hinweis:** "Bitte laden Sie Ihr Identifikationsdokument (Cédula oder Pasaporte) hoch"
- **Nach Upload:**
  - Automatische Extraktion starten
  - Felder automatisch ausfüllen
  - Erfolgs-Message anzeigen

**Komponente:** `IdentificationDocumentForm.tsx` (bestehend)
- **Datei:** `frontend/src/components/IdentificationDocumentForm.tsx`
- **Bestehende Funktionen nutzen:**
  - `handleAutoRecognize()` (Zeile 73-142) - Automatische Erkennung
  - `recognizeDocumentWithAI()` - KI-basierte Erkennung
- In Profil-Seite integrieren (neue Sektion oben, prominent)
- Nach Upload: Automatisch Felder ausfüllen
- **Design-Standard:** Nutze Standard-Box-Struktur (`bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6`)
- **Button-Standard:** Icon-only Button (kein Text), Text im `title` Attribut

**Feld-Reihenfolge anpassen:**
1. Username (readonly)
2. Email (readonly)
3. Land (required)
4. Sprache (required)
5. **Dokumenten-Upload (NEU - prominent)**
6. Automatisch extrahierte Felder (nach Upload, readonly):
   - Geburtsdatum
   - Vorname
   - Nachname
   - Genero
   - Tipo de identificacion
   - Numero de identificacion
   - Pais emisor
   - Fecha de vencimiento

**Entfernen:**
- Alle anderen Felder, die nicht in Anforderung stehen
- `bankDetails`, `contract`, `salary`, `normalWorkingHours` → Nur für Admin sichtbar (später)

#### 2.5 Frontend-Admin-To-Do-Link

**Datei:** `frontend/src/components/TaskDetail.tsx` oder `EditTaskModal.tsx`

**⚠️ HINWEIS:** Task-Model hat kein `metadata` Feld im Schema. Alternative Lösungen:

**Option 1: Task-Beschreibung parsen (empfohlen)**
- Prüfe `task.description` auf Link-Pattern: `/organization?tab=users&userId=`
- Extrahiere `userId` aus Beschreibung
- Zeige Button mit Link

**Option 2: Task-Titel prüfen**
- Prüfe `task.title` auf "Profil vervollständigen"
- Extrahiere User-Name aus Titel
- Suche User und generiere Link

**Implementierung (Option 1):**
```typescript
// In TaskDetail.tsx oder EditTaskModal.tsx
const isAdminOnboardingTask = (task: Task) => {
  return task.title?.includes('Profil vervollständigen') || 
         task.description?.includes('Contrato') ||
         task.description?.includes('Salario');
};

const extractUserIdFromDescription = (description: string): number | null => {
  const match = description.match(/userId=(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

// In Komponente:
{isAdminOnboardingTask(task) && (
  <button
    onClick={() => {
      const userId = extractUserIdFromDescription(task.description || '');
      if (userId) {
        navigate(`/organization?tab=users&userId=${userId}`);
      }
    }}
    className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
    title="Zu User Management"
  >
    <UserIcon className="h-4 w-4" />
  </button>
)}
```

**Design-Standard:** Button Icon-only (kein Text), Text im `title` Attribut

**Datei:** `frontend/src/pages/Organization.tsx`

**Erweitern:**
- Prüfe URL-Parameter `userId` beim Laden
- Falls vorhanden: Öffne User-Management-Tab
- Setze Dropdown auf entsprechenden User

---

## PHASE 3: Lebenszyklus-Start nach Admin-To-Do

### Anforderungen

**Trigger:** Admin-To-Do wird auf Status "done" gesetzt (nach QC-Prüfung)

**QC-Status:**
- Status "qc" (quality_control): Prüft automatisch Felder / validiert
- Status "done": Erst wenn alle Felder ausgefüllt sind & passen

**Automatische Aktionen:**
1. Lebenszyklus starten (`EmployeeLifecycle` erstellen)
2. Rolle "User" zur Organisation hinzufügen (neben "Hamburger")
3. Berechtigungen aktivieren

**⚠️ WICHTIG:** 
- User hat bereits **Hamburger-Rolle** nach Organisation-Beitritt (siehe `processJoinRequest`, Zeile 924-937)
- **User-Rolle** wird **zusätzlich** hinzugefügt (nicht ersetzt)
- User kann zwischen Rollen wechseln (via Role-Switch im Topmenu)

**Berechtigungen für User-Rolle:**
- **Requests:**
  - Erstellen & Bearbeiten (eigene)
  - Sehen (andere)
  - Status-Shift nur erlaubt: "to improve" → "to approve"
- **Tasks (To-Dos):**
  - Sehen (eigene & eigene Rolle "user")
  - Status-Shift (eigene & eigene Rolle "user")
- **Zeiterfassung:**
  - Starten erlaubt
- **Seiten sichtbar:**
  - Nomina (payroll)
  - Cerebro
  - Configuracion (settings)
  - Profile (topmenu)
- **Seiten nicht sichtbar:**
  - Alle anderen Seiten nicht berechtigt

**Seitenmenü/Footer:**
- Organisation-Seite muss für Rolle "User" immer sichtbar sein

### Implementierungsschritte

#### 3.1 Backend-Task-Status-Listener

**Datei:** `backend/src/controllers/taskController.ts`

**Funktion erweitern:** `updateTaskStatus` oder `updateTask`
- Prüfe: Ist Task vom Typ `admin_onboarding`? (via Titel: "Profil vervollständigen")
- Prüfe: Wird Status auf "done" gesetzt?
- Prüfe: Ist QC-Status "done"? (quality_control → done)
- Falls ja: Starte Lebenszyklus

**⚠️ WICHTIG:** 
- Nutze bestehende Task-Status-Enum: `'open' | 'in_progress' | 'improval' | 'quality_control' | 'done'`
- QC-Status ist `'quality_control'` (nicht `'qc'`)
- Status "done" bedeutet: Alle Felder ausgefüllt und validiert

**Neue Funktion:** `startLifecycleAfterOnboarding(userId: number, organizationId: number)`
```typescript
// Datei: backend/src/services/taskAutomationService.ts
// Nutze bestehende Struktur (ähnlich wie createOnboardingTasks)

static async startLifecycleAfterOnboarding(
  userId: number,
  organizationId: number
) {
  try {
    // 1. Prüfe: Alle Admin-Felder ausgefüllt?
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        contract: true,
        salary: true,
        normalWorkingHours: true
      }
    });
    
    if (!user?.contract || !user?.salary || !user?.normalWorkingHours) {
      throw new Error('Admin-Felder noch nicht vollständig ausgefüllt. Bitte füllen Sie Contrato, Salario und Horas normales de trabajo aus.');
    }
    
    // 2. Prüfe: Existiert bereits Lebenszyklus?
    const existingLifecycle = await prisma.employeeLifecycle.findUnique({
      where: { userId }
    });
    
    if (existingLifecycle) {
      console.log(`[startLifecycleAfterOnboarding] Lebenszyklus existiert bereits für User ${userId}`);
      // Aktualisiere Status auf 'active', falls noch 'onboarding'
      if (existingLifecycle.status === 'onboarding') {
        await LifecycleService.updateStatus(userId, 'active', {
          contractStartDate: new Date(),
          contractType: user.contract
        });
      }
    } else {
      // 3. Erstelle Lebenszyklus (nutze bestehende Funktion)
      await LifecycleService.createLifecycle(userId, organizationId);
    }
    
    // 4. Prüfe: Hat User bereits User-Rolle?
    const userRole = await prisma.role.findFirst({
      where: {
        organizationId: organizationId,
        name: 'User'
      }
    });
    
    if (userRole) {
      const existingUserRole = await prisma.userRole.findUnique({
        where: {
          userId_roleId: {
            userId: userId,
            roleId: userRole.id
          }
        }
      });
      
      if (!existingUserRole) {
        // Füge User-Rolle hinzu (neben Hamburger)
        await prisma.userRole.create({
          data: {
            userId: userId,
            roleId: userRole.id,
            lastUsed: false // Nicht als aktiv setzen (Hamburger bleibt aktiv)
          }
        });
        console.log(`[startLifecycleAfterOnboarding] User-Rolle hinzugefügt für User ${userId}`);
      }
    } else {
      console.warn(`[startLifecycleAfterOnboarding] User-Rolle nicht gefunden für Organisation ${organizationId}`);
    }
    
    // 5. Berechtigungen sind bereits bei Rollenerstellung gesetzt (siehe createOrganization, Zeile 336-362)
    
    return { success: true };
  } catch (error) {
    console.error('[startLifecycleAfterOnboarding] Fehler:', error);
    throw error;
  }
}
```

#### 3.2 Backend-Berechtigungen für User-Rolle

**Datei:** `backend/src/controllers/organizationController.ts`

**⚠️ WICHTIG:** User-Rolle wird bereits bei `createOrganization` erstellt (Zeile 336-362)
- **Erweitern:** Berechtigungen für User-Rolle anpassen (falls nötig)
- **Nutze bestehende Struktur:** Ähnlich wie Hamburger-Rolle (Zeile 409-461)

**Berechtigungen für User-Rolle (nach Lebenszyklus-Start):**
```typescript
// In createOrganization, nach Zeile 362 (User-Rolle-Erstellung)
// Erweitere User-Rolle-Berechtigungen

const userPermissions = [
  // Requests
  { entity: 'requests', entityType: 'page', accessLevel: 'read' },
  { entity: 'requests', entityType: 'table', accessLevel: 'read' },
  { entity: 'request_create', entityType: 'button', accessLevel: 'write' }, // Nur eigene (wird in Controller geprüft)
  { entity: 'request_edit', entityType: 'button', accessLevel: 'write' }, // Nur eigene (wird in Controller geprüft)
  
  // Tasks
  { entity: 'worktracker', entityType: 'page', accessLevel: 'read' },
  { entity: 'tasks', entityType: 'table', accessLevel: 'read' },
  { entity: 'task_status_shift', entityType: 'button', accessLevel: 'write' }, // Nur eigene/Rolle (wird in Controller geprüft)
  
  // Zeiterfassung
  { entity: 'worktime', entityType: 'page', accessLevel: 'write' },
  { entity: 'worktime_start', entityType: 'button', accessLevel: 'write' },
  
  // Seiten (immer sichtbar)
  { entity: 'payroll', entityType: 'page', accessLevel: 'read' },
  { entity: 'cerebro', entityType: 'page', accessLevel: 'read' },
  { entity: 'settings', entityType: 'page', accessLevel: 'read' },
  { entity: 'profile', entityType: 'page', accessLevel: 'both' },
  { entity: 'organization_management', entityType: 'page', accessLevel: 'read' }, // Immer sichtbar (siehe Anforderung)
];
```

**⚠️ HINWEIS:** 
- Berechtigungen werden bei Rollenerstellung gesetzt
- Spezifische Prüfungen (z.B. "nur eigene Requests") erfolgen in den Controllern (siehe 3.3, 3.4)

#### 3.3 Backend-Request-Berechtigungen

**Datei:** `backend/src/controllers/requestController.ts`

**Erweitern:** `createRequest`, `updateRequest`, `updateRequestStatus`
- Prüfe: User kann nur eigene Requests erstellen/bearbeiten
- Prüfe: Status-Shift nur "to improve" → "to approve" erlaubt

**Middleware:** `canModifyRequest`
```typescript
export const canModifyRequest = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = parseInt(req.userId, 10);
  const requestId = parseInt(req.params.id, 10);
  
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: { requesterId: true }
  });
  
  // Admin kann alles
  if (isAdmin(req)) {
    return next();
  }
  
  // User kann nur eigene Requests bearbeiten
  if (request?.requesterId !== userId) {
    return res.status(403).json({
      message: 'Sie können nur eigene Requests bearbeiten'
    });
  }
  
  next();
};
```

#### 3.4 Backend-Task-Berechtigungen

**Datei:** `backend/src/controllers/taskController.ts`

**Erweitern:** `updateTaskStatus`
- Prüfe: User kann nur Tasks der eigenen Rolle "user" status-shiften
- Prüfe: User kann nur eigene Tasks status-shiften

**Middleware:** `canModifyTask`
```typescript
export const canModifyTask = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = parseInt(req.userId, 10);
  const taskId = parseInt(req.params.id, 10);
  
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      role: true,
      responsible: true
    }
  });
  
  // Admin kann alles
  if (isAdmin(req)) {
    return next();
  }
  
  // User kann nur Tasks der eigenen Rolle oder eigene Tasks bearbeiten
  const userRole = await getUserRole(userId);
  if (
    task?.roleId === userRole?.id ||
    task?.responsibleId === userId
  ) {
    return next();
  }
  
  return res.status(403).json({
    message: 'Sie können nur Tasks Ihrer Rolle oder eigene Tasks bearbeiten'
  });
};
```

#### 3.5 Frontend-Berechtigungsprüfung

**Datei:** `frontend/src/components/Sidebar.tsx`

**⚠️ WICHTIG:** Bestehende `alwaysVisiblePages` erweitern
- **Aktuell:** `['dashboard', 'settings']` (Zeile 33)
- **Erweitern:** `['dashboard', 'settings', 'profile', 'organization_management']`
- Organisation-Seite (`organization_management`) muss für User-Rolle immer sichtbar sein (siehe Anforderung)
- Andere Seiten basierend auf Berechtigungen

**Implementierung:**
```typescript
// In Sidebar.tsx, Zeile 33
const alwaysVisiblePages: PageName[] = ['dashboard', 'settings', 'profile', 'organization_management'];
// NEU: 'profile' und 'organization_management' hinzugefügt
```

**Datei:** `frontend/src/pages/Requests.tsx`

**Erweitern:**
- Button "Request erstellen" nur für eigene Requests
- Status-Shift nur "to improve" → "to approve" erlauben

**Datei:** `frontend/src/pages/Tasks.tsx`

**Erweitern:**
- Status-Shift nur für eigene Tasks oder Tasks der eigenen Rolle "user"

---

## Zusammenfassung der Änderungen

### Datenbank-Schema

1. **User-Model:**
   - `profileComplete Boolean @default(false)` (NEU)

2. **User-Model (Felder prüfen):**
   - ⚠️ `identificationNumber` → **BEHALTEN** (existiert im Schema, wird verwendet)
   - ✅ `identificationType` → **NICHT im Schema** (nur in IdentificationDocument)
   - ✅ `identificationExpiryDate` → **NICHT im Schema** (nur in IdentificationDocument)
   - ✅ `identificationIssuingCountry` → **NICHT im Schema** (nur in IdentificationDocument)
   
   **Ergebnis:** Keine Felder entfernen nötig - alle ID-Felder außer `identificationNumber` sind bereits nur in `IdentificationDocument`

### Backend-Änderungen

1. **Middleware:**
   - `requireCompleteProfile` (NEU)
   - `canModifyRequest` (NEU)
   - `canModifyTask` (NEU)

2. **Controller:**
   - `userController.ts`: `isProfileComplete`, `updateProfile` erweitern
   - `identificationDocumentController.ts`: Automatische Extraktion nach Upload
   - `taskController.ts`: Lebenszyklus-Start nach Admin-To-Do
   - `requestController.ts`: Berechtigungsprüfung für eigene Requests
   - `taskAutomationService.ts`: `createAdminOnboardingTask` (NEU)

3. **Services:**
   - `documentRecognition.ts`: Erweiterte Extraktion für kolumbianische Dokumente

### Frontend-Änderungen

1. **Seiten:**
   - `Profile.tsx`: Feld-Reihenfolge, Dokumenten-Upload prominent
   - `Requests.tsx`: Berechtigungsprüfung
   - `Tasks.tsx`: Berechtigungsprüfung
   - Alle Seiten: Redirect bei unvollständigem Profil

2. **Komponenten:**
   - `ProtectedRoute.tsx`: Profilvollständigkeits-Prüfung
   - `Sidebar.tsx`: Menü-Items deaktivieren bei unvollständigem Profil
   - `TaskDetail.tsx`: Link zu User Management für Admin-To-Do

3. **Hooks:**
   - `usePermissions.ts`: `isProfileComplete` (NEU)

### Berechtigungen

**User-Rolle (nach Lebenszyklus-Start):**
- Requests: Erstellen/Bearbeiten (eigene), Sehen (andere), Status-Shift nur "to improve" → "to approve"
- Tasks: Sehen (eigene/Rolle), Status-Shift (eigene/Rolle)
- Zeiterfassung: Starten
- Seiten: Nomina, Cerebro, Configuracion, Profile, Organisation (immer sichtbar)

---

## Testfälle

### Phase 1: Profilvollständigkeit
1. ✅ User registriert sich → Profil unvollständig
2. ✅ User versucht auf Requests zuzugreifen → Redirect zu Profil
3. ✅ User füllt Land und Sprache aus → Profil vollständig
4. ✅ User kann jetzt auf Requests zugreifen

### Phase 2: Dokumenten-Upload
1. ✅ User tritt Organisation in Kolumbien bei
2. ✅ User lädt Dokument hoch → Automatische Extraktion
3. ✅ Admin-To-Do wird erstellt
4. ✅ Admin klickt auf To-Do → Link zu User Management

### Phase 3: Lebenszyklus-Start
1. ✅ Admin füllt Contrato, Salario, Horas aus
2. ✅ Admin setzt To-Do auf "done"
3. ✅ Lebenszyklus startet automatisch
4. ✅ User-Rolle wird hinzugefügt
5. ✅ User kann Requests erstellen (eigene)
6. ✅ User kann Tasks sehen (eigene/Rolle)
7. ✅ User kann Zeiterfassung starten

---

## Risiken und Migrationen

### Risiken

1. **Breaking Change: `profileComplete` Feld**
   - ⚠️ Alle bestehenden User haben `profileComplete = false` nach Migration
   - ⚠️ Bestehende User müssen Profil vervollständigen, bevor sie System nutzen können
   - ✅ **Lösung:** Migration mit Default `false`, User werden beim nächsten Login darauf hingewiesen

2. **Bestehende `isProfileIncomplete()` Logik**
   - ⚠️ Aktuell prüft andere Felder (birthday, bankDetails, etc.)
   - ✅ **Lösung:** Funktion ersetzen, nicht erweitern

3. **Organisation-Beitritt: Hamburger vs. User-Rolle**
   - ⚠️ System weist standardmäßig Hamburger-Rolle zu
   - ✅ **Lösung:** User-Rolle wird zusätzlich hinzugefügt (nicht ersetzt)

4. **Task-Metadata**
   - ⚠️ Task-Model hat kein `metadata` Feld
   - ✅ **Lösung:** User-ID aus Task-Beschreibung extrahieren

5. **AlwaysVisiblePages**
   - ⚠️ Muss in mehreren Dateien konsistent sein
   - ✅ **Lösung:** Zentrale Konstante verwenden oder in allen Dateien aktualisieren

### Migrationen

1. **Migration: `add_profile_complete_to_user`**
   ```sql
   ALTER TABLE "User" ADD COLUMN "profileComplete" BOOLEAN NOT NULL DEFAULT false;
   ```
   - Setze `profileComplete = false` für alle bestehenden User
   - Bestehende User müssen Profil vervollständigen

2. **Keine Migration für ID-Felder nötig**
   - Felder existieren bereits nur in `IdentificationDocument`
   - `identificationNumber` im User-Model bleibt erhalten (Rückwärtskompatibilität)

## Design-Standards Compliance

### Buttons
- ✅ **Icon-only:** Alle Buttons ohne sichtbaren Text
- ✅ **Tooltip:** Text im `title` Attribut
- ✅ **Standard-Icons:** CheckIcon, XMarkIcon, PencilIcon, etc.

### Übersetzungen
- ✅ **Alle Sprachen:** de.json, en.json, es.json
- ✅ **Verwendung:** `t('key', { defaultValue: 'Fallback' })`
- ✅ **Bestehende Keys nutzen:** `profile.profileIncomplete`, `profile.completeProfile`

### Box-Struktur
- ✅ **Standard-Box:** `bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6`
- ✅ **Container:** `min-h-screen dark:bg-gray-900` mit `max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6`

### Sidepane-Pattern
- ✅ **Create/Edit-Komponenten:** Standard Sidepane-Pattern (wie CreateTaskModal.tsx)
- ✅ **Mobile:** Automatisch als Modal
- ✅ **Desktop:** Sidepane mit/ohne Overlay (abhängig von Bildschirmgröße)

## Technologie-Stack

### Backend
- ✅ **Prisma ORM:** Für Datenbankzugriff
- ✅ **Express:** Für API-Routen
- ✅ **TypeScript:** Für Typsicherheit
- ✅ **JWT:** Für Authentifizierung

### Frontend
- ✅ **React:** Für UI-Komponenten
- ✅ **TypeScript:** Für Typsicherheit
- ✅ **Tailwind CSS:** Für Styling
- ✅ **React Router:** Für Navigation
- ✅ **i18next:** Für Übersetzungen
- ✅ **axios:** Für API-Aufrufe (via axiosInstance)

## Kompatibilität mit bestehendem System

### Berechtigungssystem
- ✅ Nutzt bestehendes System mit `entity` und `entityType`
- ✅ Nutzt bestehende `hasPermission()` Funktion
- ✅ Nutzt bestehende `alwaysVisiblePages` Konzept

### Lebenszyklus-System
- ✅ Nutzt bestehende `LifecycleService.createLifecycle()`
- ✅ Nutzt bestehende `TaskAutomationService.createOnboardingTasks()`
- ✅ Nutzt bestehende `EmployeeLifecycle` Model

### Dokumentenerkennung
- ✅ Nutzt bestehende `recognizeDocumentWithAI()` Funktion
- ✅ Nutzt bestehende `IdentificationDocument` Model
- ✅ Nutzt bestehende `extractColombianID()` Funktion

---

**Ende des Implementierungsplans**

