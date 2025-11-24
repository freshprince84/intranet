# Passwort-Manager Implementierungsplan

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

**Verschlüsselung:**
- Datei: `backend/src/utils/encryption.ts`
- Algorithmus: AES-256-GCM
- Funktionen: `encryptSecret()`, `decryptSecret()`
- Format: `iv:authTag:encrypted`
- Verwendet: `process.env.ENCRYPTION_KEY` (64 hex characters = 32 bytes)

**Berechtigungssystem:**
- Model: `Permission` mit `entity`, `entityType`, `accessLevel`
- AccessLevels: `'none'`, `'read'`, `'write'`, `'both'`
- EntityTypes: `'page'`, `'table'`, `'button'`
- Frontend Hook: `usePermissions()` in `frontend/src/hooks/usePermissions.ts`
- Backend Middleware: `checkPermission()` in `backend/src/middleware/permissionMiddleware.ts`
- Seed-File: `backend/prisma/seed.ts` mit `ALL_PAGES`, `ALL_TABLES`, `ALL_BUTTONS`

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

### 2.4 Relations in bestehenden Models

**User Model erweitern:**
```prisma
model User {
  // ... bestehende Felder
  passwordEntriesCreated PasswordEntry[] @relation("PasswordEntryCreator")
  passwordEntryPermissions PasswordEntryUserPermission[]
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
1. `getAllPasswordEntries(req, res)` - Alle Einträge für aktuellen User/Rolle
2. `getPasswordEntry(req, res)` - Einzelnen Eintrag abrufen (mit Berechtigungsprüfung)
3. `createPasswordEntry(req, res)` - Neuen Eintrag erstellen
4. `updatePasswordEntry(req, res)` - Eintrag aktualisieren
5. `deletePasswordEntry(req, res)` - Eintrag löschen
6. `getPasswordEntryPermissions(req, res)` - Berechtigungen für Eintrag abrufen
7. `updatePasswordEntryPermissions(req, res)` - Berechtigungen für Eintrag aktualisieren

**Verschlüsselung:**
- Passwort wird mit `encryptSecret()` verschlüsselt vor dem Speichern
- Passwort wird mit `decryptSecret()` entschlüsselt beim Abrufen
- Nur wenn User/Rolle `canView` Berechtigung hat

**Berechtigungsprüfung:**
- Jede Funktion prüft Berechtigungen mit `checkPermission()` Middleware
- Zusätzliche Prüfung auf Eintrag-Ebene (Role/User Permissions)

### 3.2 Routes: `passwordManager.ts`

**Datei:** `backend/src/routes/passwordManager.ts`

**Endpunkte:**
- `GET /api/password-manager` - Alle Einträge
- `GET /api/password-manager/:id` - Einzelner Eintrag
- `POST /api/password-manager` - Neuen Eintrag erstellen
- `PUT /api/password-manager/:id` - Eintrag aktualisieren
- `DELETE /api/password-manager/:id` - Eintrag löschen
- `GET /api/password-manager/:id/permissions` - Berechtigungen abrufen
- `PUT /api/password-manager/:id/permissions` - Berechtigungen aktualisieren

**Middleware:**
- `authenticate` - JWT-Authentifizierung
- `checkPermission('password_manager', 'read', 'page')` - Seiten-Berechtigung

### 3.3 Berechtigungen in Seed-File

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
};

// Berechtigungen für User
const userPermissionMap: Record<string, AccessLevel> = {
  // ... bestehende Berechtigungen
  'page_password_manager': 'read', // Nur lesen
  'table_password_entries': 'read',
  'button_password_entry_view': 'both', // Kann eigene Einträge anzeigen
  // Keine Create/Edit/Delete für Standard-User (nur eigene Einträge über Eintrag-Berechtigungen)
};

// Berechtigungen für Hamburger
const hamburgerPermissionMap: Record<string, AccessLevel> = {
  // ... bestehende Berechtigungen
  'page_password_manager': 'read',
  'table_password_entries': 'read',
  'button_password_entry_view': 'both',
};
```

### 3.4 Verschlüsselung erweitern

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
1. Tab-Type erweitern: `'personal' | 'notifications' | 'system' | 'password_manager'`
2. Tab-State erweitern: `useState<'personal' | 'notifications' | 'system' | 'password_manager'>('personal')`
3. Neuer Tab-Button hinzufügen (Zeilen 246-282)
4. Neuer Tab-Content hinzufügen (nach Zeile 551)

**Tab-Button:**
```tsx
<button
  className={`${
    activeTab === 'password_manager'
      ? 'border-blue-500 text-blue-600'
      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
  onClick={() => handleTabChange('password_manager')}
>
  <KeyIcon className="h-4 w-4 mr-2" />
  {t('settings.passwordManager')}
</button>
```

**Tab-Content:**
```tsx
{activeTab === 'password_manager' && (
  <PasswordManagerTab />
)}
```

### 4.2 Neue Komponente: `PasswordManagerTab.tsx`

**Datei:** `frontend/src/components/PasswordManagerTab.tsx`

**Funktionalität:**
1. Liste aller Passwort-Einträge anzeigen
2. Neuen Eintrag erstellen (Modal)
3. Eintrag bearbeiten (Modal)
4. Eintrag löschen (mit Bestätigung)
5. Passwort anzeigen/verstecken (Toggle)
6. Berechtigungen verwalten (Modal)
7. Filter/Suche nach Titel/URL

**Komponenten-Struktur:**
- Haupt-Container mit Liste
- Card für jeden Eintrag
- Modal für Create/Edit
- Modal für Berechtigungen
- Button für Passwort anzeigen/verstecken

**Berechtigungen:**
- `usePermissions()` Hook verwenden
- Prüfen: `hasPermission('password_manager', 'read', 'page')`
- Prüfen: `hasPermission('password_entry_create', 'write', 'button')`
- Prüfen: `hasPermission('password_entry_edit', 'write', 'button')`
- Prüfen: `hasPermission('password_entry_delete', 'write', 'button')`

### 4.3 API-Client

**Datei:** `frontend/src/config/api.ts`

**Hinzufügen:**
```typescript
export const API_ENDPOINTS = {
  // ... bestehende Endpunkte
  PASSWORD_MANAGER: {
    BASE: '/api/password-manager',
    BY_ID: (id: number) => `/api/password-manager/${id}`,
    PERMISSIONS: (id: number) => `/api/password-manager/${id}/permissions`,
  },
};
```

### 4.4 Übersetzungen

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
    "permissions": "Berechtigungen",
    "managePermissions": "Berechtigungen verwalten",
    "save": "Speichern",
    "cancel": "Abbrechen",
    "search": "Suchen",
    "filter": "Filter"
  }
}
```

---

## 5. SICHERHEIT

### 5.1 Verschlüsselung

- **Passwörter werden IMMER verschlüsselt gespeichert** (AES-256-GCM)
- **Passwörter werden NUR entschlüsselt**, wenn User/Rolle `canView` Berechtigung hat
- **ENCRYPTION_KEY** muss in `.env` gesetzt sein (64 hex characters)

### 5.2 Berechtigungen

- **Zwei Ebenen:**
  1. **Seiten-Berechtigung:** Zugriff auf Passwort-Manager-Seite
  2. **Eintrag-Berechtigung:** Zugriff auf einzelnen Eintrag (Rolle/User)

- **Backend prüft IMMER beide Ebenen**
- **Frontend zeigt nur sichtbare Einträge**

### 5.3 Validierung

- **URL-Validierung:** Nur gültige URLs erlauben
- **Input-Sanitization:** XSS-Schutz
- **Passwort-Stärke:** Optional (nicht explizit gefordert)

---

## 6. IMPLEMENTIERUNGSREIHENFOLGE

### Phase 1: Datenbank-Schema
1. Prisma Schema erweitern (`PasswordEntry`, `PasswordEntryRolePermission`, `PasswordEntryUserPermission`)
2. Relations in bestehenden Models hinzufügen
3. Migration erstellen: `npx prisma migrate dev --name add_password_manager`
4. Prisma Client generieren: `npx prisma generate`

### Phase 2: Backend
1. Controller erstellen (`passwordManagerController.ts`)
2. Routes erstellen (`passwordManager.ts`)
3. Routes in `backend/src/index.ts` registrieren
4. Seed-File aktualisieren (Berechtigungen)
5. Seed ausführen: `npx prisma db seed`

### Phase 3: Frontend
1. Übersetzungen hinzufügen (de, en, es)
2. API-Endpunkte in `api.ts` hinzufügen
3. `PasswordManagerTab.tsx` Komponente erstellen
4. Settings-Seite erweitern (Tab hinzufügen)
5. Berechtigungen prüfen (Frontend + Backend)

### Phase 4: Testing
1. In allen 3 Sprachen testen (de, en, es)
2. Berechtigungen testen (Admin, User, Hamburger)
3. Verschlüsselung testen
4. CRUD-Operationen testen

---

## 7. OFFENE FRAGEN / ENTSCHEIDUNGEN

1. **Änderungshistorie:** Soll es eine Historie geben, wenn Passwörter geändert werden?
   - **Aktuell:** Nicht explizit gefordert, daher nicht implementieren

2. **Passwort-Generierung:** Soll es eine Funktion zum Generieren sicherer Passwörter geben?
   - **Aktuell:** Nicht explizit gefordert, daher nicht implementieren

3. **Import/Export:** Soll es eine Funktion zum Importieren/Exportieren von Passwörtern geben?
   - **Aktuell:** Nicht explizit gefordert, daher nicht implementieren

4. **Kategorien/Tags:** Sollen Einträge kategorisiert werden können?
   - **Aktuell:** Nicht explizit gefordert, daher nicht implementieren

5. **Organisation vs. User-spezifisch:** Sollen Einträge organisationsweit oder nur user-spezifisch sein?
   - **Aktuell:** Beides unterstützen (optional `organizationId`)

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

### Frontend
- [ ] Übersetzungen hinzugefügt (de, en, es)
- [ ] API-Endpunkte definiert
- [ ] `PasswordManagerTab.tsx` Komponente erstellt
- [ ] Settings-Seite erweitert (Tab hinzugefügt)
- [ ] Berechtigungen geprüft (Frontend)
- [ ] UI/UX getestet

### Testing
- [ ] In allen 3 Sprachen getestet
- [ ] Berechtigungen getestet
- [ ] Verschlüsselung getestet
- [ ] CRUD-Operationen getestet

---

## 9. REFERENZEN

- **Settings-Seite:** `frontend/src/pages/Settings.tsx`
- **Verschlüsselung:** `backend/src/utils/encryption.ts`
- **Berechtigungssystem:** `docs/technical/BERECHTIGUNGSSYSTEM.md`
- **Seed-File:** `backend/prisma/seed.ts`
- **Implementierungs-Checkliste:** `docs/core/IMPLEMENTATION_CHECKLIST.md`
- **Coding-Standards:** `docs/core/CODING_STANDARDS.md`

---

**WICHTIG:** Dieser Plan ist nur eine VORBEREITUNG. Nichts wird umgesetzt, bis der User den Plan ausdrücklich bestätigt!

