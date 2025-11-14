# Analyse: Role-Branch-Verknüpfung und Branch-Switch

## Problemstellung

Der Benutzer hat festgestellt, dass:
1. **Rollen sind pro Branch** (z.B. "Recepcion Manila" und "Recepcion Poblado" sind verschiedene Rollen)
2. **Eine Rolle kann aber auch für mehrere Branches gelten** (z.B. "Admin für alle Branches")
3. **Benutzer müssen zwischen Branches switchen können** (bereits implementiert im Header)
4. **Benutzer müssen zwischen Rollen switchen können** (bereits implementiert im Header)

## Aktueller Stand - Analyse

### Datenbank-Schema (backend/prisma/schema.prisma)

**Role:**
```prisma
model Role {
  id             Int                      @id @default(autoincrement())
  name           String
  description    String?
  organizationId Int?                     // Rollen sind pro Organisation
  invitations    OrganizationInvitation[]
  permissions    Permission[]
  organization   Organization?            @relation(fields: [organizationId], references: [id])
  tasks          Task[]
  users          UserRole[]

  @@unique([name, organizationId])
}
```
**Status:** Rollen sind nur pro Organisation, NICHT pro Branch

**Branch:**
```prisma
model Branch {
  id                Int                 @id @default(autoincrement())
  name              String              @unique
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  organizationId    Int?                // Branches sind pro Organisation
  organization      Organization?       @relation(fields: [organizationId], references: [id])
  requests          Request[]
  tasks             Task[]
  users             UsersBranches[]
  workTimes         WorkTime[]
  taskStatusChanges TaskStatusHistory[]
}
```
**Status:** Branches sind pro Organisation, aber NICHT mit Rollen verknüpft

**UserRole:**
```prisma
model UserRole {
  id        Int      @id @default(autoincrement())
  userId    Int
  roleId    Int
  lastUsed  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  role      Role     @relation(fields: [roleId], references: [id])
  user      User     @relation(fields: [userId], references: [id])

  @@unique([userId, roleId])
}
```
**Status:** Verbindet User mit Role, aber keine Branch-Information

**UsersBranches:**
```prisma
model UsersBranches {
  id        Int      @id @default(autoincrement())
  userId    Int
  branchId  Int
  lastUsed  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  branch    Branch   @relation(fields: [branchId], references: [id])
  user      User     @relation(fields: [userId], references: [id])

  @@unique([userId, branchId])
}
```
**Status:** Verbindet User mit Branch, aber keine Role-Information

**FEHLT:** Verknüpfung zwischen Role und Branch

### Backend-Implementierung

**Aktuell:**
- `switchUserRole` (backend/src/controllers/userController.ts) - Wechselt die aktive Rolle
- `switchUserBranch` (backend/src/controllers/branchController.ts) - Wechselt die aktive Branch
- `updateUserRoles` - Weist Rollen zu (ohne Branch-Bezug)
- `updateUserBranches` - Weist Branches zu (ohne Role-Bezug)

**Problem:**
- Rollen und Branches sind unabhängig voneinander
- Keine Filterung der Rollen nach aktiver Branch
- Keine Filterung der Branches nach aktiver Rolle

### Frontend-Implementierung

**Header.tsx:**
- `handleRoleSwitch` - Wechselt Rolle und lädt Branches neu
- `handleBranchSwitch` - Wechselt Branch
- Zeigt alle Rollen des Users an (unabhängig von Branch)
- Zeigt alle Branches des Users an (unabhängig von Rolle)

**Problem:**
- Rollenauswahl zeigt alle Rollen, nicht nur die für die aktive Branch
- Branch-Auswahl zeigt alle Branches, nicht nur die für die aktive Rolle

**UserManagementTab.tsx:**
- `toggleRole` - Weist Rollen zu (ohne Branch-Bezug)
- `toggleBranch` - Weist Branches zu (ohne Role-Bezug)

**Problem:**
- Rollen-Zuweisung berücksichtigt keine Branches
- Branch-Zuweisung berücksichtigt keine Rollen

## Was fehlt / Was muss geändert werden

### 1. Datenbank-Schema Änderungen

**Option A: RoleBranch-Verknüpfungstabelle (N:M)**
```prisma
model RoleBranch {
  id        Int      @id @default(autoincrement())
  roleId    Int
  branchId  Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  role      Role     @relation(fields: [roleId], references: [id])
  branch    Branch   @relation(fields: [branchId], references: [id])

  @@unique([roleId, branchId])
}

model Role {
  // ... bestehende Felder
  branches  RoleBranch[]  // NEU
}

model Branch {
  // ... bestehende Felder
  roles     RoleBranch[]  // NEU
}
```

**Option B: Role.allBranches Flag + RoleBranch für spezifische Branches**
```prisma
model Role {
  // ... bestehende Felder
  allBranches Boolean  @default(false)  // NEU: Wenn true, gilt für alle Branches
  branches    RoleBranch[]              // NEU: Spezifische Branch-Zuweisungen
}
```

**Empfehlung:** Option B, da sie flexibler ist:
- `allBranches = true` → Rolle gilt für alle Branches der Organisation
- `allBranches = false` + `RoleBranch` Einträge → Rolle gilt nur für spezifische Branches
- `allBranches = false` + keine `RoleBranch` Einträge → Rolle gilt für keine Branches (kann gelöscht werden)

### 2. Backend-Änderungen

**2.1 Role-Controller:**
- `createRole` - Muss `allBranches` und `branchIds` Parameter unterstützen
- `updateRole` - Muss `allBranches` und `branchIds` Parameter unterstützen
- `getAllRoles` - Muss nach aktiver Branch filtern (wenn `req.branchId` vorhanden)
- `getRoleById` - Muss `branches` Relation laden

**2.2 User-Controller:**
- `switchUserRole` - Muss prüfen, ob Rolle für aktive Branch verfügbar ist
- `updateUserRoles` - Muss prüfen, ob Rollen für zugewiesene Branches verfügbar sind
- `getUserById` - Muss Rollen mit Branch-Informationen laden

**2.3 Branch-Controller:**
- `switchUserBranch` - Muss prüfen, ob aktive Rolle für neue Branch verfügbar ist
- `getUserBranches` - Muss Branches nach aktiver Rolle filtern
- `getAllBranches` - Muss nach aktiver Rolle filtern

**2.4 Organization-Middleware:**
- Muss `req.branchId` setzen (aus `UsersBranches` mit `lastUsed = true`)
- Muss `req.roleId` setzen (aus `UserRole` mit `lastUsed = true`)
- Data-Isolation-Filter muss beide berücksichtigen

### 3. Frontend-Änderungen

**3.1 Header.tsx:**
- `handleRoleSwitch` - Muss prüfen, ob Rolle für aktive Branch verfügbar ist
- `handleBranchSwitch` - Muss prüfen, ob aktive Rolle für neue Branch verfügbar ist
- Rollenauswahl - Muss nur Rollen anzeigen, die für aktive Branch verfügbar sind
- Branch-Auswahl - Muss nur Branches anzeigen, die für aktive Rolle verfügbar sind

**3.2 UserManagementTab.tsx:**
- Rollen-Zuweisung - Muss Branch-Kontext berücksichtigen (welche Rollen sind für welche Branches verfügbar?)
- Branch-Zuweisung - Muss Role-Kontext berücksichtigen (welche Branches sind für welche Rollen verfügbar?)

**3.3 RoleManagementTab.tsx (falls vorhanden):**
- Rollen-Erstellung - Muss `allBranches` Checkbox und Branch-Auswahl haben
- Rollen-Bearbeitung - Muss `allBranches` Checkbox und Branch-Auswahl haben
- Rollen-Liste - Muss anzeigen, für welche Branches die Rolle gilt

**3.4 BranchManagementTab.tsx (falls vorhanden):**
- Branch-Liste - Muss anzeigen, welche Rollen für die Branch verfügbar sind

### 4. API-Änderungen

**Neue Endpunkte:**
- `GET /roles?branchId=X` - Rollen für eine bestimmte Branch
- `GET /branches?roleId=X` - Branches für eine bestimmte Rolle
- `PUT /roles/:id/branches` - Branches einer Rolle zuweisen
- `GET /roles/:id/branches` - Branches einer Rolle abrufen

**Geänderte Endpunkte:**
- `GET /roles` - Optional: Filter nach `branchId`
- `GET /branches` - Optional: Filter nach `roleId`
- `PUT /users/:id/roles` - Muss prüfen, ob Rollen für zugewiesene Branches verfügbar sind
- `PUT /users/:id/branches` - Muss prüfen, ob Branches für zugewiesene Rollen verfügbar sind

## Implementierungsplan

### Phase 1: Datenbank-Schema

1. **Schema erweitern:**
   - `Role.allBranches` Boolean-Feld hinzufügen
   - `RoleBranch` Tabelle erstellen
   - Relationen in `Role` und `Branch` hinzufügen

2. **Migration erstellen:**
   - `npx prisma migrate dev --name add_role_branch_relation`
   - Seed-Daten aktualisieren (bestehende Rollen auf `allBranches = true` setzen)

### Phase 2: Backend - Role-Controller

1. **Role-Controller erweitern:**
   - `createRole` - `allBranches` und `branchIds` Parameter
   - `updateRole` - `allBranches` und `branchIds` Parameter
   - `getAllRoles` - Filter nach `branchId` (wenn vorhanden)
   - `getRoleById` - `branches` Relation laden

2. **Neue Funktionen:**
   - `updateRoleBranches` - Branches einer Rolle zuweisen
   - `getRoleBranches` - Branches einer Rolle abrufen
   - `isRoleAvailableForBranch` - Prüft, ob Rolle für Branch verfügbar ist

### Phase 3: Backend - User-Controller

1. **switchUserRole erweitern:**
   - Prüfen, ob Rolle für aktive Branch verfügbar ist
   - Wenn nicht, Fehler zurückgeben oder automatisch Branch wechseln

2. **updateUserRoles erweitern:**
   - Prüfen, ob alle Rollen für mindestens eine zugewiesene Branch verfügbar sind
   - Warnung, wenn Rolle nicht für alle Branches verfügbar ist

### Phase 4: Backend - Branch-Controller

1. **switchUserBranch erweitern:**
   - Prüfen, ob aktive Rolle für neue Branch verfügbar ist
   - Wenn nicht, automatisch auf verfügbare Rolle wechseln oder Fehler

2. **getUserBranches erweitern:**
   - Filter nach aktiver Rolle (nur Branches, für die die Rolle verfügbar ist)

3. **getAllBranches erweitern:**
   - Optional: Filter nach `roleId`

### Phase 5: Backend - Organization-Middleware

1. **req.branchId setzen:**
   - Aus `UsersBranches` mit `lastUsed = true` lesen
   - In `req.branchId` speichern

2. **Data-Isolation erweitern:**
   - Filter nach `branchId` und `roleId` berücksichtigen

### Phase 6: Frontend - Header

1. **Rollenauswahl filtern:**
   - Nur Rollen anzeigen, die für aktive Branch verfügbar sind
   - Wenn keine Rolle für aktive Branch verfügbar, Warnung anzeigen

2. **Branch-Auswahl filtern:**
   - Nur Branches anzeigen, die für aktive Rolle verfügbar sind
   - Wenn keine Branch für aktive Rolle verfügbar, Warnung anzeigen

3. **Switch-Logik erweitern:**
   - Beim Role-Switch prüfen, ob Rolle für aktive Branch verfügbar ist
   - Beim Branch-Switch prüfen, ob aktive Rolle für neue Branch verfügbar ist

### Phase 7: Frontend - UserManagementTab

1. **Rollen-Zuweisung erweitern:**
   - Anzeigen, für welche Branches eine Rolle verfügbar ist
   - Warnung, wenn Rolle nicht für alle zugewiesenen Branches verfügbar ist

2. **Branch-Zuweisung erweitern:**
   - Anzeigen, welche Rollen für eine Branch verfügbar sind
   - Warnung, wenn Branch nicht für alle zugewiesenen Rollen verfügbar ist

### Phase 8: Frontend - RoleManagementTab

1. **Rollen-Erstellung erweitern:**
   - `allBranches` Checkbox hinzufügen
   - Branch-Auswahl (Multi-Select) hinzufügen
   - Validierung: Entweder `allBranches` ODER mindestens eine Branch ausgewählt

2. **Rollen-Bearbeitung erweitern:**
   - `allBranches` Checkbox anzeigen/bearbeiten
   - Branch-Auswahl anzeigen/bearbeiten
   - Aktualisierung der Branch-Zuweisungen

3. **Rollen-Liste erweitern:**
   - Anzeigen, für welche Branches die Rolle gilt
   - Icon/Badge für "Alle Branches"

## Wichtige Überlegungen

### 1. Migration bestehender Daten

- **Bestehende Rollen:** Alle auf `allBranches = true` setzen (kompatibel mit aktuellem Verhalten)
- **Bestehende UserRole-Zuweisungen:** Bleiben bestehen
- **Bestehende UsersBranches-Zuweisungen:** Bleiben bestehen

### 2. Kompatibilität

- **Fallback-Verhalten:** Wenn keine Branch-Zuweisung für eine Rolle existiert, gilt sie für alle Branches (`allBranches = true`)
- **Rückwärtskompatibilität:** Bestehende Rollen funktionieren weiterhin

### 3. UI/UX

- **Klarheit:** Deutlich anzeigen, welche Rollen für welche Branches gelten
- **Warnungen:** Warnen, wenn Zuweisungen nicht kompatibel sind
- **Automatische Korrektur:** Vorschlagen, automatisch zu korrigieren (z.B. Rolle wechseln, wenn Branch gewechselt wird)

### 4. Performance

- **Caching:** Branch-Role-Verknüpfungen cachen
- **Lazy Loading:** Branches/Rollen nur laden, wenn benötigt

## Offene Fragen

1. **Was passiert, wenn User eine Rolle hat, die nicht für aktive Branch verfügbar ist?**
   - Automatisch auf verfügbare Rolle wechseln?
   - Fehler anzeigen?
   - Erste verfügbare Rolle aktivieren?

2. **Was passiert, wenn User eine Branch hat, für die keine Rolle verfügbar ist?**
   - Automatisch auf verfügbare Branch wechseln?
   - Fehler anzeigen?
   - Erste verfügbare Branch aktivieren?

3. **Soll eine Rolle ohne Branch-Zuweisung automatisch für alle Branches gelten?**
   - Ja (empfohlen für Rückwärtskompatibilität)
   - Nein (explizite Zuweisung erforderlich)

4. **Soll beim Erstellen einer Rolle standardmäßig `allBranches = true` sein?**
   - Ja (einfacher für Admins)
   - Nein (explizite Entscheidung erforderlich)

## Nächste Schritte

1. **Datenbank-Schema finalisieren** (Option A oder B)
2. **Migration erstellen**
3. **Backend-Implementierung** (Phase 2-5)
4. **Frontend-Implementierung** (Phase 6-8)
5. **Testing** (alle Szenarien durchtesten)
6. **Dokumentation aktualisieren**

