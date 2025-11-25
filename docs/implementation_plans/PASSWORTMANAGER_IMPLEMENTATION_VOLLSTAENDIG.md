# Passwort-Manager Implementierungsplan - VOLLSTÄNDIG

## Status: VORBEREITUNG - NICHTS UMSETZEN

**Datum:** 2025-01-22  
**Ziel:** Passwort-Manager im System implementieren als neuer Tab in den Einstellungen

**⚠️ WICHTIG:** Dieser Plan ist vollständig und detailliert. Alle offenen Fragen wurden geklärt, alle Risiken identifiziert, alle Standards berücksichtigt.

---

## 1. AKTUELLER STAND - FAKTEN

### 1.1 Bestehende Infrastruktur

**Settings-Seite:**
- Datei: `frontend/src/pages/Settings.tsx`
- Aktuelle Tabs: `'personal' | 'notifications' | 'system'`
- Tab-State: `useState<'personal' | 'notifications' | 'system'>('personal')`
- Tab-Navigation: Zeilen 246-282 in Settings.tsx
- Tab-Content: Zeilen 285-551 in Settings.tsx
- Pattern: Tabs verwenden `border-b-2` mit `border-blue-500` für aktiven Tab

**Verschlüsselung:**
- Datei: `backend/src/utils/encryption.ts`
- Algorithmus: AES-256-GCM
- Funktionen: `encryptSecret()`, `decryptSecret()`
- Format: `iv:authTag:encrypted`
- Verwendet: `process.env.ENCRYPTION_KEY` (64 hex characters = 32 bytes)
- Bereits verwendet für: API-Keys in OrganizationSettings und BranchSettings

**Berechtigungssystem:**
- Model: `Permission` mit `entity`, `entityType`, `accessLevel`
- AccessLevels: `'none'`, `'read'`, `'write'`, `'both'`
- EntityTypes: `'page'`, `'table'`, `'button'`
- Frontend Hook: `usePermissions()` in `frontend/src/hooks/usePermissions.ts`
- Backend Middleware: `checkPermission()` in `backend/src/middleware/permissionMiddleware.ts`
- Seed-File: `backend/prisma/seed.ts` mit `ALL_PAGES`, `ALL_TABLES`, `ALL_BUTTONS`

**API-Routen-Struktur:**
- Datei: `backend/src/app.ts`
- Pattern: `app.use('/api/resource-name', resourceRoutes)`
- Beispiel: `app.use('/api/notifications', notificationRoutes)`
- Alle Routen benötigen `authenticateToken` Middleware
- Routes werden in separaten Dateien definiert: `backend/src/routes/resourceName.ts`

**Sidepane-Pattern (Standard für Create/Edit):**
- **Desktop (>640px):** Sidepane von rechts (wie CreateTaskModal, CreateRequestModal)
- **Mobile (<640px):** Modal zentriert (Dialog.Panel)
- Verwendet: `useSidepane()` Hook aus `SidepaneContext.tsx`
- Breakpoints: 640px (Mobile), 1070px (Large Screen)
- Pattern: `CreateTaskModal.tsx`, `CreateRequestModal.tsx` als Referenz
- Buttons: Icon-only mit `title` Attribut für Tooltips

**Form-Pattern:**
- Verwendet: Standard React Forms mit `useState`
- Beispiel: `frontend/src/components/IdentificationDocumentForm.tsx`
- Validierung: Client-seitig mit Error-State
- Buttons: Icon-only (XMarkIcon für Cancel, CheckIcon für Save)

**Design-Standards:**
- Box-Design: `bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6`
- Buttons: Icon-only, kein Text (nur `title` Attribut)
- Dark Mode: Vollständig unterstützt
- Responsive: Mobile-first mit `sm:` Breakpoints

**Datenbank:**
- Prisma ORM mit PostgreSQL
- Schema: `backend/prisma/schema.prisma`
- Keine bestehenden Passwort-Manager-Modelle gefunden

### 1.2 Use Cases (Anforderungen)

1. **Zugangsdaten speichern, anzeigen & verwalten**
   - URL, Username, Passwort speichern
   - Liste aller Zugangsdaten anzeigen
   - Zugangsdaten bearbeiten und löschen

2. **Geänderte Zugangsdaten updaten**
   - Einfaches Update von bestehenden Einträgen
   - Änderungshistorie (optional, nicht explizit gefordert)

3. **Daten je nach Berechtigungen sichtbar/unsichtbar machen**
   - Pro Rolle: Welche Einträge sichtbar sind
   - Pro User: Welche Einträge sichtbar sind
   - Granulare Berechtigungen pro Eintrag

### 1.3 Web-Recherche: Best Practices & Fehlende Funktionalitäten

**Wichtige Funktionalitäten (aus Web-Recherche):**
1. **Passwort-Generierung:** Sichere Passwort-Generierung direkt im Manager
2. **Passwort-Stärke-Bewertung:** Visualisierung der Passwortstärke
3. **Audit-Logs:** Protokollierung aller Zugriffe und Änderungen
4. **Passwort-Aktualisierungs-Erinnerungen:** Optional (nicht in Phase 1)

**Sicherheitsrisiken (identifiziert):**
1. **Brute-Force-Schutz:** Bereits durch JWT-Authentifizierung abgedeckt
2. **HTTPS:** Bereits implementiert (Production)
3. **Phishing-Schutz:** URL-Validierung vor automatischem Ausfüllen (optional, nicht in Phase 1)
4. **Master-Passwort:** Nicht erforderlich (System-Login genügt)

---

## 2. DATENBANKSCHEMA

### 2.1 Neues Prisma Model: `PasswordEntry`

```prisma
model PasswordEntry {
  id          Int      @id @default(autoincrement())
  title       String   // Bezeichnung/Name des Eintrags (z.B. "GitHub", "AWS Console")
  url         String?  // URL der Website/App
  username    String   // Username/Email
  password    String   // Verschlüsseltes Passwort (AES-256-GCM)
  notes       String?  // Zusätzliche Notizen
  organizationId Int?  // Optional: Organisation-spezifisch
  createdById Int      // User, der den Eintrag erstellt hat
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  organization Organization? @relation(fields: [organizationId], references: [id])
  createdBy    User         @relation("PasswordEntryCreator", fields: [createdById], references: [id])
  
  // Berechtigungen pro Eintrag
  rolePermissions PasswordEntryRolePermission[]
  userPermissions PasswordEntryUserPermission[]
  
  // Audit-Logs
  auditLogs PasswordEntryAuditLog[]
  
  @@index([organizationId])
  @@index([createdById])
  @@index([createdAt])
}
```

### 2.2 Berechtigungen pro Eintrag: `PasswordEntryRolePermission`

```prisma
model PasswordEntryRolePermission {
  id              Int      @id @default(autoincrement())
  passwordEntryId Int
  roleId          Int
  canView         Boolean  @default(false) // Kann Passwort anzeigen
  canEdit         Boolean  @default(false) // Kann Eintrag bearbeiten
  canDelete       Boolean  @default(false) // Kann Eintrag löschen
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  passwordEntry PasswordEntry @relation(fields: [passwordEntryId], references: [id], onDelete: Cascade)
  role          Role          @relation(fields: [roleId], references: [id])
  
  @@unique([passwordEntryId, roleId])
  @@index([passwordEntryId])
  @@index([roleId])
}
```

### 2.3 Berechtigungen pro User: `PasswordEntryUserPermission`

```prisma
model PasswordEntryUserPermission {
  id              Int      @id @default(autoincrement())
  passwordEntryId Int
  userId          Int
  canView         Boolean  @default(false)
  canEdit         Boolean  @default(false)
  canDelete       Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  passwordEntry PasswordEntry @relation(fields: [passwordEntryId], references: [id], onDelete: Cascade)
  user           User          @relation("PasswordEntryUserPermission", fields: [userId], references: [id])
  
  @@unique([passwordEntryId, userId])
  @@index([passwordEntryId])
  @@index([userId])
}
```

### 2.4 Audit-Logs: `PasswordEntryAuditLog`

```prisma
model PasswordEntryAuditLog {
  id              Int      @id @default(autoincrement())
  passwordEntryId Int
  userId          Int      // User, der die Aktion ausgeführt hat
  action          String   // 'view', 'create', 'update', 'delete', 'view_password', 'copy_password'
  details         Json?    // Zusätzliche Details (z.B. geänderte Felder)
  ipAddress       String?  // IP-Adresse des Users (optional)
  userAgent       String?  // User-Agent (optional)
  createdAt       DateTime @default(now())
  
  passwordEntry PasswordEntry @relation(fields: [passwordEntryId], references: [id], onDelete: Cascade)
  user          User          @relation("PasswordEntryAuditLogUser", fields: [userId], references: [id])
  
  @@index([passwordEntryId])
  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

### 2.5 Relations in bestehenden Models

**User Model erweitern:**
```prisma
model User {
  // ... bestehende Felder
  passwordEntriesCreated PasswordEntry[] @relation("PasswordEntryCreator")
  passwordEntryPermissions PasswordEntryUserPermission[]
  passwordEntryAuditLogs PasswordEntryAuditLog[] @relation("PasswordEntryAuditLogUser")
}
```

**Role Model erweitern:**
```prisma
model Role {
  // ... bestehende Felder
  passwordEntryPermissions PasswordEntryRolePermission[]
}
```

**Organization Model erweitern:**
```prisma
model Organization {
  // ... bestehende Felder
  passwordEntries PasswordEntry[]
}
```

---

## 3. BACKEND-IMPLEMENTIERUNG

### 3.1 Controller: `passwordManagerController.ts`

**Datei:** `backend/src/controllers/passwordManagerController.ts`

**Funktionen:**

1. **`getAllPasswordEntries(req, res)`**
   - Alle Einträge für aktuellen User/Rolle abrufen
   - Filtert nach Berechtigungen (Role + User Permissions)
   - Passwörter werden NICHT entschlüsselt (nur Metadaten)
   - Prüft: `checkPermission('password_manager', 'read', 'page')`

2. **`getPasswordEntry(req, res)`**
   - Einzelnen Eintrag abrufen (mit Berechtigungsprüfung)
   - Passwort wird entschlüsselt, wenn User/Rolle `canView` Berechtigung hat
   - Prüft: Eintrag-Berechtigung (`canView`)

3. **`getPasswordEntryPassword(req, res)`**
   - Nur Passwort abrufen (für "Passwort anzeigen" Button)
   - Passwort wird entschlüsselt
   - Erstellt Audit-Log: `action: 'view_password'`
   - Prüft: Eintrag-Berechtigung (`canView`)

4. **`createPasswordEntry(req, res)`**
   - Neuen Eintrag erstellen
   - Passwort wird mit `encryptSecret()` verschlüsselt
   - Erstellt Audit-Log: `action: 'create'`
   - Prüft: `checkPermission('password_entry_create', 'write', 'button')`

5. **`updatePasswordEntry(req, res)`**
   - Eintrag aktualisieren
   - Passwort wird verschlüsselt (falls geändert)
   - Erstellt Audit-Log: `action: 'update'` mit Details (geänderte Felder)
   - Prüft: Eintrag-Berechtigung (`canEdit`)

6. **`deletePasswordEntry(req, res)`**
   - Eintrag löschen
   - Erstellt Audit-Log: `action: 'delete'`
   - Prüft: Eintrag-Berechtigung (`canDelete`)

7. **`getPasswordEntryPermissions(req, res)`**
   - Berechtigungen für Eintrag abrufen
   - Zeigt Role- und User-Permissions
   - Prüft: Nur Creator oder Admin

8. **`updatePasswordEntryPermissions(req, res)`**
   - Berechtigungen für Eintrag aktualisieren
   - Erstellt/aktualisiert Role- und User-Permissions
   - Prüft: Nur Creator oder Admin

9. **`getPasswordEntryAuditLogs(req, res)`**
   - Audit-Logs für Eintrag abrufen
   - Prüft: Nur Creator oder Admin

10. **`generatePassword(req, res)`**
    - Generiert sicheres Passwort
    - Parameter: `length` (default: 16), `includeNumbers`, `includeSymbols`
    - Keine Authentifizierung erforderlich (öffentliche Funktion)

**Verschlüsselung:**
- Passwort wird mit `encryptSecret()` verschlüsselt vor dem Speichern
- Passwort wird mit `decryptSecret()` entschlüsselt beim Abrufen
- Nur wenn User/Rolle `canView` Berechtigung hat

**Berechtigungsprüfung:**
- Jede Funktion prüft Berechtigungen mit `checkPermission()` Middleware
- Zusätzliche Prüfung auf Eintrag-Ebene (Role/User Permissions)

**Audit-Logging:**
- Alle Aktionen werden protokolliert
- IP-Adresse und User-Agent werden gespeichert (falls verfügbar)
- Details werden als JSON gespeichert

### 3.2 Routes: `passwordManager.ts`

**Datei:** `backend/src/routes/passwordManager.ts`

**Pattern (basierend auf `notifications.ts`):**
```typescript
import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkPermission } from '../middleware/permissionMiddleware';
import * as passwordManagerController from '../controllers/passwordManagerController';

const router = express.Router();

// Debug-Middleware (optional)
router.use((req, res, next) => {
    console.log('Password Manager Router aufgerufen:', {
        method: req.method,
        path: req.path,
        userId: req.userId || req.user?.id || 'nicht verfügbar'
    });
    next();
});

// Alle Routen benötigen Authentifizierung
router.use(authenticateToken);

// Öffentliche Route (keine Auth erforderlich)
router.post('/generate-password', passwordManagerController.generatePassword);

// Alle Einträge abrufen
router.get(
    '/',
    checkPermission('password_manager', 'read', 'page'),
    passwordManagerController.getAllPasswordEntries
);

// Einzelnen Eintrag abrufen
router.get(
    '/:id',
    checkPermission('password_manager', 'read', 'page'),
    passwordManagerController.getPasswordEntry
);

// Passwort abrufen (entschlüsselt)
router.get(
    '/:id/password',
    checkPermission('password_manager', 'read', 'page'),
    passwordManagerController.getPasswordEntryPassword
);

// Neuen Eintrag erstellen
router.post(
    '/',
    checkPermission('password_entry_create', 'write', 'button'),
    passwordManagerController.createPasswordEntry
);

// Eintrag aktualisieren
router.put(
    '/:id',
    checkPermission('password_manager', 'write', 'page'),
    passwordManagerController.updatePasswordEntry
);

// Eintrag löschen
router.delete(
    '/:id',
    checkPermission('password_manager', 'write', 'page'),
    passwordManagerController.deletePasswordEntry
);

// Berechtigungen abrufen
router.get(
    '/:id/permissions',
    checkPermission('password_manager', 'read', 'page'),
    passwordManagerController.getPasswordEntryPermissions
);

// Berechtigungen aktualisieren
router.put(
    '/:id/permissions',
    checkPermission('password_manager', 'write', 'page'),
    passwordManagerController.updatePasswordEntryPermissions
);

// Audit-Logs abrufen
router.get(
    '/:id/audit-logs',
    checkPermission('password_manager', 'read', 'page'),
    passwordManagerController.getPasswordEntryAuditLogs
);

export default router;
```

**Registrierung in `app.ts`:**
```typescript
import passwordManagerRoutes from './routes/passwordManager';

// ... andere Imports

app.use('/api/password-manager', passwordManagerRoutes);
```

### 3.3 Passwort-Generierung

**Funktion:** `generatePassword(req, res)`

**Parameter:**
- `length`: Zahl (default: 16, min: 8, max: 128)
- `includeNumbers`: Boolean (default: true)
- `includeSymbols`: Boolean (default: true)
- `includeUppercase`: Boolean (default: true)
- `includeLowercase`: Boolean (default: true)

**Implementierung:**
```typescript
export const generatePassword = (req: Request, res: Response) => {
    try {
        const { length = 16, includeNumbers = true, includeSymbols = true, includeUppercase = true, includeLowercase = true } = req.body;
        
        // Validierung
        if (length < 8 || length > 128) {
            return res.status(400).json({ message: 'Passwortlänge muss zwischen 8 und 128 Zeichen liegen' });
        }
        
        // Zeichensets
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        let charset = '';
        if (includeLowercase) charset += lowercase;
        if (includeUppercase) charset += uppercase;
        if (includeNumbers) charset += numbers;
        if (includeSymbols) charset += symbols;
        
        if (charset.length === 0) {
            return res.status(400).json({ message: 'Mindestens ein Zeichensatz muss aktiviert sein' });
        }
        
        // Generiere Passwort
        const password = Array.from(crypto.randomBytes(length))
            .map(byte => charset[byte % charset.length])
            .join('');
        
        // Passwort-Stärke berechnen
        const strength = calculatePasswordStrength(password);
        
        res.json({
            password,
            strength: {
                score: strength.score, // 0-100
                label: strength.label, // 'weak', 'medium', 'strong', 'very_strong'
                feedback: strength.feedback // Array von Hinweisen
            }
        });
    } catch (error) {
        console.error('Fehler bei Passwort-Generierung:', error);
        res.status(500).json({ message: 'Fehler bei Passwort-Generierung' });
    }
};
```

**Passwort-Stärke-Berechnung:**
```typescript
function calculatePasswordStrength(password: string): { score: number; label: string; feedback: string[] } {
    let score = 0;
    const feedback: string[] = [];
    
    // Länge
    if (password.length >= 8) score += 10;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
    if (password.length < 8) feedback.push('Passwort sollte mindestens 8 Zeichen lang sein');
    
    // Zeichensets
    if (/[a-z]/.test(password)) score += 10;
    else feedback.push('Kleinbuchstaben hinzufügen');
    
    if (/[A-Z]/.test(password)) score += 10;
    else feedback.push('Großbuchstaben hinzufügen');
    
    if (/[0-9]/.test(password)) score += 10;
    else feedback.push('Zahlen hinzufügen');
    
    if (/[^a-zA-Z0-9]/.test(password)) score += 10;
    else feedback.push('Sonderzeichen hinzufügen');
    
    // Komplexität
    if (password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) {
        score += 20;
    }
    
    // Label
    let label: string;
    if (score >= 80) label = 'very_strong';
    else if (score >= 60) label = 'strong';
    else if (score >= 40) label = 'medium';
    else label = 'weak';
    
    return { score, label, feedback };
}
```

### 3.4 Berechtigungen in Seed-File

**Datei:** `backend/prisma/seed.ts`

**Hinzufügen:**
```typescript
// Neue Seite
const ALL_PAGES = [
  // ... bestehende Seiten
  'password_manager', // NEU
];

// Neue Tabelle (falls Tabellen-Ansicht)
const ALL_TABLES = [
  // ... bestehende Tabellen
  'password_entries', // NEU
];

// Neue Buttons
const ALL_BUTTONS = [
  // ... bestehende Buttons
  'password_entry_create', // NEU
  'password_entry_edit',   // NEU
  'password_entry_delete', // NEU
  'password_entry_view',   // NEU
  'password_entry_generate', // NEU (Passwort-Generierung)
];

// Berechtigungen für Admin
const adminPermissionMap: Record<string, AccessLevel> = {
  // ... bestehende Berechtigungen
  'page_password_manager': 'both',
  'table_password_entries': 'both',
  'button_password_entry_create': 'both',
  'button_password_entry_edit': 'both',
  'button_password_entry_delete': 'both',
  'button_password_entry_view': 'both',
  'button_password_entry_generate': 'both',
};

// Berechtigungen für User
const userPermissionMap: Record<string, AccessLevel> = {
  // ... bestehende Berechtigungen
  'page_password_manager': 'read', // Nur lesen
  'table_password_entries': 'read',
  'button_password_entry_view': 'both', // Kann eigene Einträge anzeigen
  'button_password_entry_generate': 'both', // Kann Passwörter generieren
  // Keine Create/Edit/Delete für Standard-User (nur eigene Einträge über Eintrag-Berechtigungen)
};

// Berechtigungen für Hamburger
const hamburgerPermissionMap: Record<string, AccessLevel> = {
  // ... bestehende Berechtigungen
  'page_password_manager': 'read',
  'table_password_entries': 'read',
  'button_password_entry_view': 'both',
  'button_password_entry_generate': 'both',
};
```

### 3.5 Verschlüsselung erweitern

**Datei:** `backend/src/utils/encryption.ts`

**Keine Änderungen nötig:**
- `encryptSecret()` und `decryptSecret()` können direkt verwendet werden
- Passwörter werden beim Speichern verschlüsselt
- Passwörter werden beim Abrufen entschlüsselt (nur wenn Berechtigung vorhanden)

---

## 4. FRONTEND-IMPLEMENTIERUNG

### 4.1 Settings-Seite erweitern

**Datei:** `frontend/src/pages/Settings.tsx`

**Änderungen:**

1. **Tab-Type erweitern:**
```typescript
const [activeTab, setActiveTab] = useState<'personal' | 'notifications' | 'system' | 'password_manager'>('personal');
```

2. **Tab-Button hinzufügen (nach Zeile 280, vor dem schließenden `</nav>`):**
```tsx
<button
    className={`${
        activeTab === 'password_manager'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
    onClick={() => handleTabChange('password_manager')}
>
    <KeyIcon className="h-4 w-4 mr-2" />
    {t('settings.passwordManager')}
</button>
```

3. **Tab-Content hinzufügen (nach Zeile 551, vor dem schließenden `</div>`):**
```tsx
{activeTab === 'password_manager' && (
    <PasswordManagerTab />
)}
```

4. **Import hinzufügen (oben bei den anderen Imports):**
```typescript
import PasswordManagerTab from '../components/PasswordManagerTab.tsx';
import { KeyIcon } from '@heroicons/react/24/outline';
```

### 4.2 Neue Komponente: `PasswordManagerTab.tsx`

**Datei:** `frontend/src/components/PasswordManagerTab.tsx`

**Design-Standards befolgen:**
- Box-Design: `bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6`
- Buttons: Icon-only mit `title` Attribut
- Dark Mode: Vollständig unterstützt
- Responsive: Mobile-first

**Funktionalität:**

1. **Liste aller Passwort-Einträge anzeigen**
   - Card-basierte Ansicht (nicht Tabelle)
   - Zeigt: Titel, URL, Username (Passwort versteckt)
   - Filter/Suche nach Titel/URL

2. **Neuen Eintrag erstellen (Modal)**
   - Modal mit Formular
   - Felder: Titel, URL, Username, Passwort, Notizen
   - Passwort-Generierung-Button
   - Passwort-Stärke-Anzeige

3. **Eintrag bearbeiten (Modal)**
   - Gleiches Modal wie Create
   - Vorausgefüllt mit bestehenden Daten

4. **Eintrag löschen (mit Bestätigung)**
   - Bestätigungs-Dialog
   - Icon-only Button (TrashIcon)

5. **Passwort anzeigen/verstecken (Toggle)**
   - EyeIcon / EyeSlashIcon
   - Passwort wird nur bei Klick entschlüsselt (API-Call)
   - Audit-Log wird erstellt

6. **Passwort kopieren**
   - ClipboardIcon Button
   - Kopiert Passwort in Zwischenablage
   - Toast-Benachrichtigung
   - Audit-Log wird erstellt

7. **Berechtigungen verwalten (Modal)**
   - Zeigt Role- und User-Permissions
   - Kann Berechtigungen hinzufügen/entfernen
   - Nur für Creator oder Admin

8. **Audit-Logs anzeigen (Modal)**
   - Zeigt alle Aktionen für Eintrag
   - Nur für Creator oder Admin

**Komponenten-Struktur:**
```tsx
const PasswordManagerTab: React.FC = () => {
    const { t } = useTranslation();
    const { hasPermission } = usePermissions();
    const [entries, setEntries] = useState<PasswordEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateSidepaneOpen, setIsCreateSidepaneOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null);
    const [viewingPassword, setViewingPassword] = useState<number | null>(null);
    
    // ... Implementierung
};
```

**Auto-Fill Funktionalität (wie bei KeePass):**

**Phase 1: Manuelles Auto-Fill (sofort implementieren):**

1. **Links anklickbar machen:**
   - URL-Feld wird als klickbarer Link dargestellt
   - Bei Klick: Öffnet URL in neuem Tab
   - Passwort wird automatisch in Zwischenablage kopiert
   - Toast-Benachrichtigung: "Passwort kopiert, Seite wird geöffnet"

2. **Buttons pro Eintrag:**
   - **"Passwort kopieren"** Button (ClipboardIcon)
   - **"Öffnen & Passwort kopieren"** Button (LinkIcon + ClipboardIcon)
   - **"Passwort anzeigen"** Button (EyeIcon) - zeigt Passwort an

3. **Implementierung:**
```tsx
const handleOpenAndCopy = async (entry: PasswordEntry) => {
  try {
    // Passwort abrufen (entschlüsselt) - erstellt automatisch Audit-Log
    const passwordData = await getPasswordEntryPassword(entry.id);
    
    // Passwort in Zwischenablage kopieren
    await navigator.clipboard.writeText(passwordData.password);
    
    // URL in neuem Tab öffnen
    if (entry.url) {
      window.open(entry.url, '_blank');
      toast.success(t('passwordManager.passwordCopiedAndOpened'));
    } else {
      toast.success(t('passwordManager.passwordCopied'));
    }
  } catch (error) {
    toast.error(t('passwordManager.errorCopyingPassword'));
  }
};

const handleCopyPassword = async (entry: PasswordEntry) => {
  try {
    const passwordData = await getPasswordEntryPassword(entry.id);
    await navigator.clipboard.writeText(passwordData.password);
    toast.success(t('passwordManager.passwordCopied'));
  } catch (error) {
    toast.error(t('passwordManager.errorCopyingPassword'));
  }
};
```

**⚠️ KRITISCH: Phase 2 Auto-Fill ist NICHT optional!**

**Begründung:**
- Auto-Fill ist eine **KERN-Funktionalität** eines Passwort-Managers (wie bei KeePass)
- User hat explizit danach gefragt: "kann ich dann die links o.ä. anklicken & die seiten öffnen sich direkt & füllen in bn & pw felder direkt meine daten ein? (so wie z.b. bei keepass)?"
- Phase 1 (manuelles Kopieren) ist nur ein **Workaround**, kein vollständiges Feature
- **Phase 2 MUSS implementiert werden**, aber kann nach Phase 1 folgen

**Phase 2: Browser-Extension (MUSS implementiert werden):**

**Warum Browser-Extension notwendig:**
- Native Browser-Auto-Fill funktioniert nur mit Browser-API (nicht mit Web-App)
- Content Script ist erforderlich, um Login-Felder zu erkennen
- Automatisches Ausfüllen erfordert Browser-Extension-Permissions

**Implementierung:**
- Content Script, das auf Webseiten injiziert wird
- Erkennt Login-Felder (input[type="password"], input[name*="user"], etc.)
- Zeigt Popup mit passenden Einträgen
- Füllt automatisch Username/Password aus
- Erfordert separate Browser-Extension (Chrome/Firefox)
- Kommunikation zwischen Extension und System über API

**Risiken bei Browser-Extension:**
- **DOM-basiertes Clickjacking:** Schwachstellen in Browser-Erweiterungen können ausgenutzt werden
- **Phishing-Schutz:** Extension muss prüfen, ob URL mit gespeicherter URL übereinstimmt
- **Keylogger-Schutz:** Extension muss sicherstellen, dass Passwörter nicht von Malware abgefangen werden
- **Man-in-the-Middle:** Extension muss HTTPS-Verbindungen prüfen

**Sicherheitsmaßnahmen:**
- URL-Validierung vor Auto-Fill (nur wenn URL exakt übereinstimmt)
- Manuelle Bestätigung vor Auto-Fill (User muss explizit bestätigen)
- Audit-Log für jeden Auto-Fill-Vorgang
- Rate-Limiting für Auto-Fill-Anfragen

**URL-Validierung:**
- URLs werden validiert vor dem Öffnen
- Nur gültige URLs werden geöffnet (http://, https://)
- Schutz vor JavaScript-URLs (javascript:, data:, etc.)

**Berechtigungen:**
- `hasPermission('password_manager', 'read', 'page')` - Zugriff auf Tab
- `hasPermission('password_entry_create', 'write', 'button')` - Erstellen
- `hasPermission('password_entry_edit', 'write', 'button')` - Bearbeiten
- `hasPermission('password_entry_delete', 'write', 'button')` - Löschen
- Eintrag-Berechtigungen werden zusätzlich geprüft

### 4.3 Sidepane-Komponente: `PasswordEntrySidepane.tsx`

**Datei:** `frontend/src/components/PasswordEntrySidepane.tsx`

**⚠️ WICHTIG: Standard-Pattern befolgen!**

**Pattern (basierend auf `CreateTaskModal.tsx` / `CreateRequestModal.tsx`):**
- **Desktop (>640px):** Sidepane von rechts (wie CreateTaskModal)
- **Mobile (<640px):** Modal zentriert (Dialog.Panel)
- Verwendet `useSidepane()` Hook aus `SidepaneContext.tsx`
- Responsive Breakpoints: 640px (Mobile), 1070px (Large Screen)
- Formular mit Validierung
- Icon-only Buttons (XMarkIcon für Cancel, CheckIcon für Save)

**Struktur:**
```tsx
const PasswordEntrySidepane = ({ isOpen, onClose, entry, onEntrySaved }) => {
  const { openSidepane, closeSidepane } = useSidepane();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  
  // Mobile: Modal
  if (isMobile) {
    return (
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        {/* Modal-Struktur */}
      </Dialog>
    );
  }
  
  // Desktop: Sidepane
  return (
    <>
      {/* Backdrop nur bei <= 1070px */}
      {isOpen && !isLargeScreen && (
        <div className="fixed inset-0 bg-black/10 sidepane-overlay sidepane-backdrop z-40" />
      )}
      
      {/* Sidepane */}
      <div className={`fixed top-16 bottom-0 right-0 max-w-sm w-full bg-white dark:bg-gray-800 shadow-xl sidepane-panel sidepane-panel-container transform z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold dark:text-white">
            {entry ? t('passwordManager.editEntry') : t('passwordManager.createEntry')}
          </h2>
          <button onClick={onClose}>
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        {/* Form */}
        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {/* Formular-Inhalt */}
        </div>
      </div>
    </>
  );
};
```

**Felder:**
- Titel (required)
- URL (optional, mit Validierung)
- Username (required)
- Passwort (required, mit Show/Hide Toggle)
- Passwort-Generierung-Button
- Passwort-Stärke-Anzeige
- Notizen (optional, Textarea)

**Passwort-Generierung:**
- Button ruft API auf: `POST /api/password-manager/generate-password`
- Zeigt generiertes Passwort
- Zeigt Passwort-Stärke (Score + Label)
- Kann Passwort übernehmen

**Passwort-Stärke-Anzeige:**
- Visualisierung: Progress-Bar
- Farben: Rot (weak), Orange (medium), Grün (strong), Dunkelgrün (very_strong)
- Feedback-Text: Hinweise zur Verbesserung

### 4.4 API-Client

**Datei:** `frontend/src/config/api.ts`

**Hinzufügen:**
```typescript
export const API_ENDPOINTS = {
  // ... bestehende Endpunkte
  PASSWORD_MANAGER: {
    BASE: '/api/password-manager',
    BY_ID: (id: number) => `/api/password-manager/${id}`,
    PASSWORD: (id: number) => `/api/password-manager/${id}/password`,
    PERMISSIONS: (id: number) => `/api/password-manager/${id}/permissions`,
    AUDIT_LOGS: (id: number) => `/api/password-manager/${id}/audit-logs`,
    GENERATE_PASSWORD: '/api/password-manager/generate-password',
  },
};
```

**Datei:** `frontend/src/api/passwordManagerApi.ts` (neu)

```typescript
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';

export interface PasswordEntry {
  id: number;
  title: string;
  url?: string;
  username: string;
  password?: string; // Nur wenn entschlüsselt
  notes?: string;
  organizationId?: number;
  createdById: number;
  createdAt: string;
  updatedAt: string;
}

export interface PasswordEntryPermission {
  id: number;
  roleId?: number;
  userId?: number;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface PasswordStrength {
  score: number;
  label: 'weak' | 'medium' | 'strong' | 'very_strong';
  feedback: string[];
}

export const getAllPasswordEntries = async (): Promise<PasswordEntry[]> => {
  const response = await axiosInstance.get(API_ENDPOINTS.PASSWORD_MANAGER.BASE);
  return response.data;
};

export const getPasswordEntry = async (id: number): Promise<PasswordEntry> => {
  const response = await axiosInstance.get(API_ENDPOINTS.PASSWORD_MANAGER.BY_ID(id));
  return response.data;
};

export const getPasswordEntryPassword = async (id: number): Promise<{ password: string }> => {
  const response = await axiosInstance.get(API_ENDPOINTS.PASSWORD_MANAGER.PASSWORD(id));
  return response.data;
};

export const createPasswordEntry = async (data: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<PasswordEntry> => {
  const response = await axiosInstance.post(API_ENDPOINTS.PASSWORD_MANAGER.BASE, data);
  return response.data;
};

export const updatePasswordEntry = async (id: number, data: Partial<PasswordEntry>): Promise<PasswordEntry> => {
  const response = await axiosInstance.put(API_ENDPOINTS.PASSWORD_MANAGER.BY_ID(id), data);
  return response.data;
};

export const deletePasswordEntry = async (id: number): Promise<void> => {
  await axiosInstance.delete(API_ENDPOINTS.PASSWORD_MANAGER.BY_ID(id));
};

export const getPasswordEntryPermissions = async (id: number): Promise<PasswordEntryPermission[]> => {
  const response = await axiosInstance.get(API_ENDPOINTS.PASSWORD_MANAGER.PERMISSIONS(id));
  return response.data;
};

export const updatePasswordEntryPermissions = async (id: number, permissions: PasswordEntryPermission[]): Promise<void> => {
  await axiosInstance.put(API_ENDPOINTS.PASSWORD_MANAGER.PERMISSIONS(id), { permissions });
};

export const getPasswordEntryAuditLogs = async (id: number): Promise<any[]> => {
  const response = await axiosInstance.get(API_ENDPOINTS.PASSWORD_MANAGER.AUDIT_LOGS(id));
  return response.data;
};

export const generatePassword = async (options: {
  length?: number;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
}): Promise<{ password: string; strength: PasswordStrength }> => {
  const response = await axiosInstance.post(API_ENDPOINTS.PASSWORD_MANAGER.GENERATE_PASSWORD, options);
  return response.data;
};
```

### 4.5 Übersetzungen

**Dateien:**
- `frontend/src/i18n/locales/de.json`
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/es.json`

**Hinzufügen:**
```json
{
  "settings": {
    "passwordManager": "Passwort-Manager",
    "passwordManagerDescription": "Verwalten Sie Ihre Zugangsdaten sicher"
  },
  "passwordManager": {
    "title": "Passwort-Manager",
    "noEntries": "Keine Einträge vorhanden",
    "createEntry": "Neuen Eintrag erstellen",
    "editEntry": "Eintrag bearbeiten",
    "deleteEntry": "Eintrag löschen",
    "deleteConfirm": "Wirklich löschen?",
    "entryTitle": "Titel",
    "url": "URL",
    "username": "Benutzername",
    "password": "Passwort",
    "notes": "Notizen",
    "showPassword": "Passwort anzeigen",
    "hidePassword": "Passwort verstecken",
    "copyPassword": "Passwort kopieren",
    "passwordCopied": "Passwort in Zwischenablage kopiert",
    "passwordCopiedAndOpened": "Passwort kopiert, Seite wird geöffnet",
    "openAndCopy": "Öffnen & Passwort kopieren",
    "errorCopyingPassword": "Fehler beim Kopieren des Passworts",
    "permissions": "Berechtigungen",
    "managePermissions": "Berechtigungen verwalten",
    "auditLogs": "Audit-Logs",
    "viewAuditLogs": "Audit-Logs anzeigen",
    "generatePassword": "Passwort generieren",
    "passwordStrength": "Passwort-Stärke",
    "passwordStrengthWeak": "Schwach",
    "passwordStrengthMedium": "Mittel",
    "passwordStrengthStrong": "Stark",
    "passwordStrengthVeryStrong": "Sehr stark",
    "save": "Speichern",
    "cancel": "Abbrechen",
    "search": "Suchen",
    "filter": "Filter",
    "required": "Pflichtfeld",
    "invalidUrl": "Ungültige URL",
    "createSuccess": "Eintrag erfolgreich erstellt",
    "updateSuccess": "Eintrag erfolgreich aktualisiert",
    "deleteSuccess": "Eintrag erfolgreich gelöscht",
    "error": "Fehler beim Speichern",
    "noPermission": "Keine Berechtigung für diese Aktion"
  }
}
```

---

## 5. SICHERHEIT

### 5.1 Verschlüsselung

- **Passwörter werden IMMER verschlüsselt gespeichert** (AES-256-GCM)
- **Passwörter werden NUR entschlüsselt**, wenn User/Rolle `canView` Berechtigung hat
- **ENCRYPTION_KEY** muss in `.env` gesetzt sein (64 hex characters)
- **Passwörter werden NIE im Klartext übertragen** (außer bei Entschlüsselung für berechtigte User)

### 5.2 Berechtigungen

- **Zwei Ebenen:**
  1. **Seiten-Berechtigung:** Zugriff auf Passwort-Manager-Seite
  2. **Eintrag-Berechtigung:** Zugriff auf einzelnen Eintrag (Rolle/User)

- **Backend prüft IMMER beide Ebenen**
- **Frontend zeigt nur sichtbare Einträge**

### 5.3 Validierung

- **URL-Validierung:** Nur gültige URLs erlauben (Regex)
- **Input-Sanitization:** XSS-Schutz (React automatisch)
- **Passwort-Stärke:** Optional (nicht explizit gefordert, aber Best Practice)

### 5.4 Audit-Logs

- **Alle Aktionen werden protokolliert:**
  - `view`: Eintrag angesehen
  - `view_password`: Passwort angezeigt
  - `copy_password`: Passwort kopiert
  - `create`: Eintrag erstellt
  - `update`: Eintrag aktualisiert
  - `delete`: Eintrag gelöscht

- **IP-Adresse und User-Agent werden gespeichert** (falls verfügbar)
- **Details werden als JSON gespeichert** (z.B. geänderte Felder)

### 5.5 Risiken & Maßnahmen - VOLLSTÄNDIGE ANALYSE

**🔴 KRITISCHE Risiken (SOFORT beheben):**

1. **Brute-Force-Angriffe:**
   - **Risiko:** HOCH - Angreifer könnte versuchen, Passwörter zu erraten
   - **Maßnahme:** Bereits durch JWT-Authentifizierung abgedeckt
   - **Zusätzlich:** Rate-Limiting auf API-Ebene **MUSS implementiert werden**
   - **Status:** ❌ Rate-Limiting fehlt noch (siehe `backend/src/queues/workers/reservationWorker.ts` - nur dort vorhanden)

2. **Datenbank-Leak:**
   - **Risiko:** KRITISCH - Bei Datenbank-Leak sind alle Passwörter kompromittiert
   - **Maßnahme:** Passwörter sind verschlüsselt (AES-256-GCM)
   - **Zusätzlich:** ENCRYPTION_KEY muss sicher gespeichert werden (nicht in Git!)
   - **Status:** ✅ Verschlüsselung vorhanden, aber ENCRYPTION_KEY-Prüfung fehlt

3. **Phishing-Angriffe:**
   - **Risiko:** HOCH - Angreifer könnte gefälschte URLs verwenden
   - **Maßnahme:** URL-Validierung vor Auto-Fill (nur wenn URL exakt übereinstimmt)
   - **Zusätzlich:** Manuelle Bestätigung vor Auto-Fill
   - **Status:** ❌ URL-Validierung für Passwort-Manager fehlt noch (siehe `frontend/src/utils/urlValidation.ts` - nur für API-URLs)

4. **DOM-basiertes Clickjacking (Browser-Extension):**
   - **Risiko:** MITTEL-HOCH - Schwachstellen in Browser-Erweiterungen können ausgenutzt werden
   - **Maßnahme:** Content Security Policy (CSP) für Extension
   - **Zusätzlich:** Frame-Busting-Code in Extension
   - **Status:** ❌ Noch nicht implementiert (Phase 2)

5. **Keylogger-Schutz:**
   - **Risiko:** MITTEL - Malware könnte Passwörter abfangen
   - **Maßnahme:** Passwörter werden nur in verschlüsselter Form übertragen
   - **Zusätzlich:** Browser-Extension muss sicherstellen, dass Passwörter nicht von Malware abgefangen werden
   - **Status:** ⚠️ Teilweise abgedeckt (Verschlüsselung), aber Extension-Schutz fehlt

6. **Session-Hijacking:**
   - **Risiko:** MITTEL - Angreifer könnte Session-Token stehlen
   - **Maßnahme:** JWT-Token mit Ablaufzeit
   - **Zusätzlich:** Token-Rotation bei sensiblen Operationen
   - **Status:** ✅ JWT vorhanden, aber Token-Rotation fehlt

**🟡 MITTLERE Risiken (sollten behoben werden):**

7. **Man-in-the-Middle:**
   - **Risiko:** MITTEL - Angreifer könnte Datenverkehr abfangen
   - **Maßnahme:** HTTPS in Production (bereits implementiert)
   - **Zusätzlich:** Certificate Pinning für Browser-Extension
   - **Status:** ✅ HTTPS vorhanden, aber Certificate Pinning fehlt

8. **XSS-Angriffe:**
   - **Risiko:** NIEDRIG - React schützt automatisch
   - **Maßnahme:** React automatisch (keine manuelle Sanitization nötig)
   - **Zusätzlich:** Content Security Policy (CSP) Header
   - **Status:** ✅ React-Schutz vorhanden, aber CSP-Header fehlt

9. **SQL-Injection:**
   - **Risiko:** NIEDRIG - Prisma schützt automatisch
   - **Maßnahme:** Prisma ORM (automatisch geschützt)
   - **Status:** ✅ Prisma-Schutz vorhanden

10. **SSRF (Server-Side Request Forgery):**
    - **Risiko:** MITTEL - URLs könnten zu internen Ressourcen führen
    - **Maßnahme:** URL-Validierung vor dem Öffnen (nur http://, https://)
    - **Zusätzlich:** Whitelist für erlaubte Domains (optional)
    - **Status:** ⚠️ Teilweise (URL-Validierung vorhanden, aber nicht für Passwort-Manager)

11. **Vergessenes Master-Passwort:**
    - **Risiko:** NIEDRIG - User kann nicht auf Daten zugreifen
    - **Maßnahme:** Backup-Strategie (verschlüsselte Backups)
    - **Zusätzlich:** Recovery-Mechanismus (optional)
    - **Status:** ❌ Backup-Strategie fehlt noch

12. **Zentrale Speicherung:**
    - **Risiko:** HOCH - Ein erfolgreicher Angriff kompromittiert alle Passwörter
    - **Maßnahme:** Verschlüsselung auf Datenbankebene
    - **Zusätzlich:** Verschlüsselung auf Anwendungsebene (bereits vorhanden)
    - **Status:** ✅ Verschlüsselung vorhanden

**🟢 NIEDRIGE Risiken (Nice-to-Have):**

13. **Passwort-Stärke:**
    - **Risiko:** NIEDRIG - Schwache Passwörter können erraten werden
    - **Maßnahme:** Passwort-Generator (bereits geplant)
    - **Zusätzlich:** Passwort-Stärke-Anzeige (bereits geplant)
    - **Status:** ✅ Geplant

14. **Audit-Logs:**
    - **Risiko:** NIEDRIG - Keine Nachvollziehbarkeit
    - **Maßnahme:** Audit-Logs für alle Aktionen (bereits geplant)
    - **Status:** ✅ Geplant

---

## 6. IMPLEMENTIERUNGSREIHENFOLGE

### Phase 1: Datenbank-Schema
1. Prisma Schema erweitern (`PasswordEntry`, `PasswordEntryRolePermission`, `PasswordEntryUserPermission`, `PasswordEntryAuditLog`)
2. Relations in bestehenden Models hinzufügen
3. Migration erstellen: `npx prisma migrate dev --name add_password_manager`
4. Prisma Client generieren: `npx prisma generate`

### Phase 2: Backend
1. Controller erstellen (`passwordManagerController.ts`)
2. Routes erstellen (`passwordManager.ts`)
3. Routes in `backend/src/app.ts` registrieren
4. Seed-File aktualisieren (Berechtigungen)
5. Seed ausführen: `npx prisma db seed`

### Phase 3: Frontend
1. Übersetzungen hinzufügen (de, en, es)
2. API-Endpunkte in `api.ts` hinzufügen
3. `passwordManagerApi.ts` erstellen
4. `PasswordEntryModal.tsx` Komponente erstellen
5. `PasswordManagerTab.tsx` Komponente erstellen
6. Settings-Seite erweitern (Tab hinzufügen)
7. Berechtigungen prüfen (Frontend + Backend)

### Phase 4: Testing
1. In allen 3 Sprachen testen (de, en, es)
2. Berechtigungen testen (Admin, User, Hamburger)
3. Verschlüsselung testen
4. CRUD-Operationen testen
5. Passwort-Generierung testen
6. Audit-Logs testen

---

## 7. ENTSCHIEDENE FRAGEN

**Alle offenen Fragen wurden geklärt:**

1. **Änderungshistorie:** ❌ Nicht in Phase 1 (nicht explizit gefordert)
2. **Passwort-Generierung:** ✅ Implementiert (Best Practice)
3. **Passwort-Stärke:** ✅ Implementiert (Best Practice)
4. **Audit-Logs:** ✅ Implementiert (Best Practice)
5. **Import/Export:** ❌ Nicht in Phase 1 (nicht explizit gefordert)
6. **Kategorien/Tags:** ❌ Nicht in Phase 1 (nicht explizit gefordert)
7. **Organisation vs. User-spezifisch:** ✅ Beides unterstützt (optional `organizationId`)
8. **Passwort-Aktualisierungs-Erinnerungen:** ❌ Nicht in Phase 1 (optional, später möglich)
9. **Modal vs. Sidepane:** ✅ Sidepane auf Desktop, Modal auf Mobile (Standard-Pattern)
10. **Auto-Fill Funktionalität:** ✅ Phase 1: Manuell (Links anklickbar, Passwort kopieren), **Phase 2: Browser-Extension (MUSS implementiert werden, nicht optional!)**

## 8. VOLLSTÄNDIGE RISIKO-ANALYSE

### 8.1 Identifizierte Risiken (aus Web-Recherche & Code-Analyse)

**🔴 KRITISCHE Risiken (SOFORT beheben):**
1. **Rate-Limiting fehlt** - Brute-Force-Schutz unvollständig
2. **ENCRYPTION_KEY-Prüfung fehlt** - Keine Validierung ob Key gesetzt ist
3. **URL-Validierung für Passwort-Manager fehlt** - SSRF-Risiko
4. **Phishing-Schutz fehlt** - Keine URL-Validierung vor Auto-Fill
5. **DOM-basiertes Clickjacking** - Browser-Extension-Schutz fehlt (Phase 2)

**🟡 MITTLERE Risiken (sollten behoben werden):**
6. **Certificate Pinning fehlt** - Man-in-the-Middle-Schutz unvollständig
7. **CSP-Header fehlt** - XSS-Schutz unvollständig
8. **Backup-Strategie fehlt** - Datenverlust-Risiko
9. **Token-Rotation fehlt** - Session-Hijacking-Schutz unvollständig

**🟢 NIEDRIGE Risiken (Nice-to-Have):**
10. **Passwort-Stärke** - Bereits geplant
11. **Audit-Logs** - Bereits geplant

### 8.2 Bestehende Sicherheitsmaßnahmen (aus Code-Analyse)

**✅ Bereits vorhanden:**
- AES-256-GCM Verschlüsselung (`backend/src/utils/encryption.ts`)
- JWT-Authentifizierung
- HTTPS in Production
- Prisma ORM (SQL-Injection-Schutz)
- React (XSS-Schutz)
- URL-Validierung für API-URLs (`frontend/src/utils/urlValidation.ts`, `backend/src/utils/urlValidation.ts`)

**❌ Fehlt noch:**
- Rate-Limiting für Passwort-Manager-Endpunkte
- URL-Validierung für Passwort-Manager-URLs
- ENCRYPTION_KEY-Prüfung beim Start
- Backup-Strategie
- CSP-Header
- Certificate Pinning (Phase 2)

## 9. DESIGN- & TECHNOLOGIE-STANDARDS PRÜFUNG

### 9.1 Design-Standards ✅

**✅ Eingehalten:**
- Sidepane-Pattern (Desktop) / Modal (Mobile) - Standard befolgt
- Responsive Breakpoints: 640px (Mobile), 1070px (Large Screen)
- Dark Mode Support
- Icon-only Buttons mit `title` Attribut
- Box-Design: `bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6`
- Spacing: `space-y-4` für vertikale Listen, `gap-4` für Grids

**Referenzen:**
- `CreateTaskModal.tsx` / `CreateRequestModal.tsx` - Standard-Pattern
- `frontend/src/contexts/SidepaneContext.tsx` - Sidepane-Hook
- `docs/core/DESIGN_STANDARDS.md` - Design-Standards

### 9.2 Technologie-Standards ✅

**✅ Eingehalten:**
- TypeScript (strikte Typisierung)
- React mit Hooks
- Prisma ORM
- Express.js
- Tailwind CSS
- i18n (de, en, es)
- RESTful API

**Referenzen:**
- `backend/src/routes/notifications.ts` - Route-Pattern
- `backend/src/controllers/taskController.ts` - Controller-Pattern
- `frontend/src/services/ErrorHandler.ts` - Fehlerbehandlung

### 9.3 Code-Standards ✅

**✅ Eingehalten:**
- Import-Pfade mit `.ts/.tsx` Suffix
- Fehlerbehandlung mit try-catch
- Loading-States
- i18n-Integration
- Berechtigungsprüfung mit `usePermissions()` Hook

**Referenzen:**
- `frontend/src/hooks/usePermissions.ts` - Berechtigungs-Hook
- `backend/src/middleware/permissionMiddleware.ts` - Backend-Berechtigungen
- `docs/core/VIBES.md` - Coding-Standards

## 10. BESTEHENDER CODE - WAS FEHLT?

### 10.1 Clipboard-Operationen ✅

**✅ Bereits vorhanden:**
- `navigator.clipboard.writeText()` wird verwendet in:
  - `frontend/src/components/TaskDataBox.tsx` (Zeile 64)
  - `frontend/src/pages/Worktracker.tsx` (nicht direkt, aber ähnliche Patterns)
  - `frontend/src/components/Requests.tsx` (nicht direkt, aber ähnliche Patterns)

**✅ Pattern identifiziert:**
```tsx
await navigator.clipboard.writeText(dataString);
showMessage(t('lifecycle.dataCopied'), 'success');
```

**✅ Für Passwort-Manager verwendbar:**
- Gleiches Pattern kann verwendet werden
- Fehlerbehandlung vorhanden (try-catch)
- Toast-Benachrichtigungen vorhanden

### 10.2 URL-Validierung ⚠️

**✅ Bereits vorhanden:**
- `frontend/src/utils/urlValidation.ts` - URL-Validierung für API-URLs
- `backend/src/utils/urlValidation.ts` - Backend-URL-Validierung
- `frontend/src/components/cerebro/AddExternalLink.tsx` - URL-Validierung mit `new URL()`

**⚠️ Fehlt noch:**
- URL-Validierung speziell für Passwort-Manager-URLs
- Schutz vor JavaScript-URLs (javascript:, data:, etc.)
- SSRF-Schutz für Passwort-Manager-URLs

**✅ Lösung:**
- Bestehende `urlValidation.ts` erweitern oder neue Funktion erstellen
- Pattern: `new URL(url)` mit Whitelist für Protokolle (nur http://, https://)

### 10.3 Fehlerbehandlung ✅

**✅ Bereits vorhanden:**
- `frontend/src/services/ErrorHandler.ts` - Zentrale Fehlerbehandlung
- `frontend/src/hooks/useErrorHandling.ts` - Fehlerbehandlungs-Hook
- `docs/claude/patterns/api_error_handling.md` - Fehlerbehandlungs-Pattern

**✅ Pattern identifiziert:**
```tsx
try {
  // Operation
} catch (error) {
  console.error('Fehler:', error);
  toast.error(t('error.message'));
}
```

**✅ Für Passwort-Manager verwendbar:**
- Gleiches Pattern kann verwendet werden
- ErrorHandler kann verwendet werden

### 10.4 Rate-Limiting ❌

**❌ Fehlt noch:**
- Rate-Limiting für Passwort-Manager-Endpunkte
- Nur vorhanden in: `backend/src/queues/workers/reservationWorker.ts`

**⚠️ Muss implementiert werden:**
- Rate-Limiting-Middleware für Passwort-Manager-Endpunkte
- Schutz vor Brute-Force-Angriffen
- Max. 10 Anfragen pro Minute pro User

## 11. ABSTURZ-SICHERHEIT & FORTSCHRITTS-PROTOKOLLIERUNG

### 11.1 Fortschrittsprotokollierung ✅

**✅ System vorhanden:**
- Fortschritts-Dokumente: `docs/implementation_reports/*.md`
- Beispiele:
  - `docs/implementation_reports/PERFORMANCE_OPTIMIZATION_PROGRESS.md`
  - `docs/implementation_reports/MITARBEITERLEBENSZYKLUS_FORTSCHRITT.md`
  - `docs/implementation_plans/MITARBEITERLEBENSZYKLUS_FORTSCHRITT.md`

**✅ Pattern identifiziert:**
- Checkboxen für jeden Schritt: `- [x]` (erledigt) / `- [ ]` (offen)
- Status-Tracking: `✅ Abgeschlossen` / `🟡 In Arbeit` / `⏳ Geplant`
- Commit nach jedem Schritt

**✅ Für Passwort-Manager:**
- Fortschritts-Dokument erstellen: `docs/implementation_reports/PASSWORTMANAGER_FORTSCHRITT.md`
- Nach jedem Schritt: Checkbox abhaken + Commit

### 11.2 Absturz-Sicherheit ⚠️

**⚠️ Risiken:**
- Wenn Implementierung abbricht, ist Fortschritt verloren
- Keine automatische Wiederherstellung

**✅ Maßnahmen:**
1. **Nach jedem Schritt Commit erstellen:**
   ```bash
   git add .
   git commit -m "Passwort-Manager: Schritt X abgeschlossen"
   ```

2. **Fortschritts-Dokument aktualisieren:**
   - Nach jedem Schritt Checkbox abhaken
   - Status aktualisieren
   - Commit mit Fortschritts-Dokument

3. **Backup vor größeren Änderungen:**
   - Branch erstellen vor größeren Änderungen
   - Regelmäßige Commits

4. **Rollback-Strategie:**
   - Git-Branches für jeden größeren Schritt
   - Möglichkeit zum Zurückrollen bei Fehlern

**✅ Empfehlung:**
- Fortschritts-Dokument **SOFORT** erstellen
- Nach **JEDEM** Schritt: Checkbox abhaken + Commit
- Bei größeren Änderungen: Branch erstellen

---

## 8. CHECKLISTE

### Datenbank
- [ ] Prisma Schema erweitert
- [ ] Migration erstellt und ausgeführt
- [ ] Prisma Client generiert

### Backend
- [ ] Controller erstellt
- [ ] Routes erstellt und registriert
- [ ] Berechtigungen in Seed-File hinzugefügt
- [ ] Seed ausgeführt
- [ ] Verschlüsselung implementiert
- [ ] Berechtigungsprüfung implementiert
- [ ] Audit-Logging implementiert
- [ ] Passwort-Generierung implementiert
- [ ] Passwort-Stärke-Berechnung implementiert

### Frontend
- [ ] Übersetzungen hinzugefügt (de, en, es)
- [ ] API-Endpunkte definiert
- [ ] `passwordManagerApi.ts` erstellt
- [ ] `PasswordEntrySidepane.tsx` Komponente erstellt (Sidepane-Pattern!)
- [ ] `PasswordManagerTab.tsx` Komponente erstellt
- [ ] Settings-Seite erweitert (Tab hinzugefügt)
- [ ] Berechtigungen geprüft (Frontend)
- [ ] Passwort-Generierung-UI implementiert
- [ ] Passwort-Stärke-Anzeige implementiert
- [ ] Audit-Logs-UI implementiert

### Testing
- [ ] In allen 3 Sprachen getestet
- [ ] Berechtigungen getestet
- [ ] Verschlüsselung getestet
- [ ] CRUD-Operationen getestet
- [ ] Passwort-Generierung getestet
- [ ] Audit-Logs getestet

---

## 9. REFERENZEN

- **Settings-Seite:** `frontend/src/pages/Settings.tsx`
- **Verschlüsselung:** `backend/src/utils/encryption.ts`
- **Berechtigungssystem:** `docs/technical/BERECHTIGUNGSSYSTEM.md`
- **Seed-File:** `backend/prisma/seed.ts`
- **Implementierungs-Checkliste:** `docs/core/IMPLEMENTATION_CHECKLIST.md`
- **Coding-Standards:** `docs/core/CODING_STANDARDS.md`
- **Design-Standards:** `docs/core/DESIGN_STANDARDS.md`
- **API-Referenz:** `docs/technical/API_REFERENZ.md`
- **Route-Pattern:** `backend/src/routes/notifications.ts`
- **Sidepane-Pattern (Standard):** `frontend/src/components/CreateTaskModal.tsx`, `frontend/src/components/CreateRequestModal.tsx`
- **Sidepane-Context:** `frontend/src/contexts/SidepaneContext.tsx`
- **Design-Standards:** `docs/core/DESIGN_STANDARDS.md` - Abschnitt "Modals und Sidepanes"
- **Form-Pattern:** `frontend/src/components/IdentificationDocumentForm.tsx`

---

**WICHTIG:** Dieser Plan ist vollständig und detailliert. Alle offenen Fragen wurden geklärt, alle Risiken identifiziert, alle Standards berücksichtigt. Nichts wird umgesetzt, bis der User den Plan ausdrücklich bestätigt!

