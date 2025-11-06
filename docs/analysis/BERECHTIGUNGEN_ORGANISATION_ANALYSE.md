# Analyse: Berechtigungen für Organisation-Seite

**Datum:** $(date)
**Zweck:** Aufräumen der Berechtigungen für die Organisation-Seite (früher UserManagement)

## Aktueller Stand im Code (SOLL-Zustand)

### 1. Seite "Organisation"
- **Route:** `/users`
- **Komponente:** `frontend/src/pages/UserManagement.tsx`
- **Anzeige:** In Sidebar als "Organisation" angezeigt (`Sidebar.tsx:134`)
- **Früherer Name:** UserManagement (nicht mehr verwendet)

### 2. Berechtigungen im Code

#### Frontend (`UserManagement.tsx`):
- Zeile 25: `hasPermission('usermanagement', 'read', 'page')` - Prüft Zugriff auf die Seite
- Zeile 26: `hasPermission('users', 'read', 'table')` - Prüft Zugriff auf Users-Tab
- Zeile 27: `hasPermission('roles', 'read', 'table')` - Prüft Zugriff auf Roles-Tab
- Zeile 28: `canViewOrganization()` - Prüft Zugriff auf Organization-Tab

#### Frontend (`usePermissions.ts`):
- Zeile 148-149: `canManageOrganization()` - prüft `organization_management` (page) mit 'both' oder 'write'
- Zeile 152-153: `canViewOrganization()` - prüft `organization_management` (page) mit 'read', 'both' oder 'write'

#### Backend (`routes/roles.ts`):
- Zeile 20: Prüft `permission.entity === 'usermanagement'` für Rollen-Zugriff
- Zeile 40: Prüft `permission.entity === 'usermanagement'` für Rollen-Schreibzugriff

#### Seed (`backend/prisma/seed.ts`):
- Zeile 26: `'usermanagement'` in ALL_PAGES definiert
- Zeile 27: `'organization_management'` in ALL_PAGES definiert
- Zeile 37: `'users'` in ALL_TABLES definiert
- Zeile 38: `'roles'` in ALL_TABLES definiert
- Zeile 39: `'organization'` in ALL_TABLES definiert
- Zeile 326: User-Rolle erhält `page_usermanagement` = 'both'
- Zeile 327: User-Rolle erhält `page_organization_management` = 'both'

### 3. Berechtigungslogik

**Für die Seite selbst:**
- `usermanagement` (page) - bestimmt ob die Seite sichtbar/aufrufbar ist

**Für die Tabs:**
- `users` (table) - bestimmt ob Users-Tab aktiv ist
- `roles` (table) - bestimmt ob Roles-Tab aktiv ist  
- `organization_management` (page) - bestimmt ob Organization-Tab aktiv ist

**Problem:** Es gibt zwei verschiedene Berechtigungen für die Seite:
1. `usermanagement` (page) - für die Seite
2. `organization_management` (page) - für den Tab "organization"

## Vermuteter IST-Zustand in der DB

Es ist wahrscheinlich, dass in der Datenbank beide Varianten existieren:
- `usermanagement` (page) - alte Berechtigung
- `organization_management` (page) - neue Berechtigung
- Möglicherweise auch verschiedene Schreibweisen oder Variationen

## Probleme identifiziert

1. **Doppelte Berechtigungen:** Sowohl `usermanagement` als auch `organization_management` werden verwendet
2. **Inkonsistente Namensgebung:** Die Seite heißt "Organisation", aber die Berechtigung heißt `usermanagement`
3. **Verwirrung:** Zwei verschiedene Berechtigungen für eine Seite
4. **Backend-Routen:** `routes/roles.ts` prüft nur `usermanagement`, nicht `organization_management`

## Empfohlene Lösung

### Option 1: Alles auf `organization_management` umstellen (EMPFOHLEN)
- **Vorteil:** Konsistent mit dem Namen "Organisation"
- **Nachteil:** Mehr Änderungen nötig

### Option 2: Alles auf `usermanagement` umstellen
- **Vorteil:** Weniger Änderungen, da Backend bereits `usermanagement` verwendet
- **Nachteil:** Inkonsistent mit dem Namen "Organisation"

### Option 3: Hybrid (aktueller Stand)
- `usermanagement` (page) - für die Seite
- `organization_management` (page) - nur für den Tab
- **Nachteil:** Verwirrend und inkonsistent

## Durchgeführte Bereinigung

1. ✅ Code analysiert
2. ✅ DB-Berechtigungen geprüft
3. ✅ Bereinigungsplan erstellt
4. ✅ Plan bestätigt und umgesetzt
5. ✅ Migration durchgeführt (4 Dopplungen gelöscht)
6. ✅ Alte Scripts entfernt
7. ✅ Dokumentation aktualisiert

**Ergebnis:** Alle Berechtigungen wurden erfolgreich von `usermanagement` auf `organization_management` umgestellt. Die Datenbank ist bereinigt und enthält nur noch `organization_management` (page) Berechtigungen.

