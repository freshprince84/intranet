# Erklärung: Branch-Zuweisung zu Usern - Funktionsweise & Problem-Analyse

## 📋 Übersicht der Funktionsweise

### 1. **Datenmodell (Datenbank)**

Das System verwendet folgende Tabellen für die Branch-User-Zuweisung:

- **`UsersBranches`** (N:M Beziehung):
  - `userId` - Referenz zum User
  - `branchId` - Referenz zur Branch
  - `lastUsed` - Boolean-Flag, markiert die aktuell aktive Branch des Users

- **`RoleBranch`** (N:M Beziehung):
  - `roleId` - Referenz zur Rolle
  - `branchId` - Referenz zur Branch
  - Definiert, für welche Branches eine Rolle verfügbar ist

- **`Role`**:
  - `allBranches` - Boolean-Flag
    - `true`: Rolle gilt für ALLE Branches der Organisation
    - `false`: Rolle gilt nur für spezifische Branches (definiert in `RoleBranch`)

### 2. **Aktueller Stand der Implementierung**

#### ✅ **Backend (vollständig implementiert)**

1. **API-Endpunkte:**
   - `GET /branches/user` - Lädt alle dem User zugewiesenen Branches
   - `PUT /users/:id/branches` - Weist einem User Branches zu
   - `POST /branches/switch` - Wechselt die aktive Branch eines Users

2. **Controller-Funktionen:**
   - `getUserBranches` - Lädt User-Branches mit `lastUsed`-Flag
   - `updateUserBranches` - Aktualisiert User-Branch-Zuweisungen
   - `switchUserBranch` - Wechselt aktive Branch (setzt `lastUsed`)

3. **Validierung:**
   - Beim Branch-Wechsel wird geprüft, ob die aktive Rolle für die neue Branch verfügbar ist
   - Beim Rollen-Wechsel wird geprüft, ob die neue Rolle für die aktive Branch verfügbar ist

#### ⚠️ **Frontend (teilweise implementiert)**

1. **Header (Top-Menu):**
   - ✅ Zeigt verfügbare Branches im Dropdown
   - ✅ Filtert Branches basierend auf aktiver Rolle
   - ✅ Ermöglicht Branch-Wechsel
   - ✅ Zeigt nur Branches, die dem User zugewiesen sind

2. **UserManagementTab:**
   - ❌ **FEHLT: Branches-Tab zur Zuweisung von Branches an User**
   - ✅ Rollen-Tab vorhanden (analog sollte Branches-Tab existieren)
   - ✅ Details, Documents, Lifecycle Tabs vorhanden

3. **BranchContext:**
   - ✅ Lädt User-Branches über `GET /branches/user`
   - ✅ Verwaltet `selectedBranch` State
   - ✅ Setzt `lastUsed` Branch als Standard

### 3. **Wo kann man einem User Branches zuweisen?**

**Aktuell: NICHT MÖGLICH im Frontend!**

Es gibt **keinen Branches-Tab** im `UserManagementTab`. Die Funktionalität existiert nur im Backend (`PUT /users/:id/branches`), aber es fehlt die UI.

**Analogie zu Rollen:**
- Rollen können im `UserManagementTab` → `roles` Tab zugewiesen werden
- Branches sollten analog im `UserManagementTab` → `branches` Tab zugewiesen werden können
- **Dieser Tab fehlt noch!**

### 4. **Warum sehe ich nur "Poblado" und nicht "Manila"?**

Es gibt mehrere mögliche Gründe:

#### **Grund 1: Manila ist dem User nicht zugewiesen**

Die `getUserBranches` Funktion lädt **nur Branches, die dem User bereits zugewiesen sind**:

```typescript
// backend/src/controllers/branchController.ts:114
const userBranches = await prisma.usersBranches.findMany({
    where: {
        userId: userId,
        branch: branchFilter
    },
    // ...
});
```

**Lösung:** Manila muss dem User zugewiesen werden (aktuell nur über Backend-API möglich).

#### **Grund 2: Filterung durch aktive Rolle**

Im Header werden Branches zusätzlich gefiltert:

```typescript
// frontend/src/components/Header.tsx:184
const availableBranches = branches?.filter(branch => 
    isBranchAvailableForRole(branch, currentRole?.role.id || null)
) || [];
```

Die Funktion `isBranchAvailableForRole` prüft:
- Wenn `role.allBranches === true` → Alle Branches werden angezeigt
- Wenn `role.allBranches === false` → Nur Branches mit `RoleBranch` Eintrag werden angezeigt

**Mögliche Ursache:**
- Die aktive Rolle hat `allBranches = false`
- Es existiert kein `RoleBranch` Eintrag für Manila + diese Rolle
- Manila wird daher ausgefiltert

#### **Grund 3: Datenisolation (Organization-Filter)**

Die `getUserBranches` Funktion verwendet `getDataIsolationFilter`, der nur Branches der eigenen Organisation lädt:

```typescript
// backend/src/controllers/branchController.ts:111
const branchFilter = getDataIsolationFilter(req as any, 'branch');
```

**Mögliche Ursache:**
- Manila gehört zu einer anderen Organisation
- Manila wird durch den Filter ausgeblendet

### 5. **Ablauf: Wie funktioniert die Branch-Zuweisung?**

#### **Schritt 1: Admin weist User Branches zu**
1. Admin öffnet `UserManagementTab`
2. Wählt einen User aus
3. **→ FEHLT: Wechselt zu "Branches" Tab**
4. **→ FEHLT: Wählt Branches aus (Checkboxen)**
5. **→ FEHLT: Speichert → `PUT /users/:id/branches`**

#### **Schritt 2: User sieht zugewiesene Branches**
1. User loggt sich ein
2. `BranchContext` lädt Branches über `GET /branches/user`
3. Nur zugewiesene Branches werden geladen
4. `lastUsed` Branch wird als `selectedBranch` gesetzt

#### **Schritt 3: User wechselt Branch**
1. User klickt auf "Standort wechseln" im Header
2. Dropdown zeigt nur Branches, die:
   - Dem User zugewiesen sind (`UsersBranches`)
   - Für die aktive Rolle verfügbar sind (`RoleBranch` oder `allBranches = true`)
3. User wählt Branch → `POST /branches/switch`
4. Backend setzt `lastUsed = true` für neue Branch, `false` für alte
5. `BranchContext` lädt Branches neu

#### **Schritt 4: User wechselt Rolle**
1. User klickt auf "Rolle wechseln" im Header
2. Dropdown zeigt nur Rollen, die:
   - Dem User zugewiesen sind (`UserRole`)
   - Für die aktive Branch verfügbar sind (`RoleBranch` oder `allBranches = true`)
3. User wählt Rolle → `POST /users/switch-role`
4. Backend prüft, ob Rolle für aktive Branch verfügbar ist
5. Wenn nicht → Fehler
6. Wenn ja → Rolle wird aktiviert, Branches werden neu geladen

### 6. **Was fehlt noch?**

#### **Kritisch: Frontend UI für Branch-Zuweisung**

**Fehlende Komponente:** Branches-Tab im `UserManagementTab`

**Sollte enthalten:**
- Liste aller verfügbaren Branches (gefiltert nach Organisation)
- Checkboxen für jede Branch
- Anzeige, welche Branches bereits zugewiesen sind
- Speichern-Button → `PUT /users/:id/branches`

**Analogie zu Rollen-Tab:**
- Rollen-Tab zeigt alle Rollen mit Checkboxen
- Branches-Tab sollte analog alle Branches mit Checkboxen zeigen

### 7. **Debugging: Warum sehe ich nur Poblado?**

**Schritt-für-Schritt Prüfung:**

1. **Prüfe Datenbank:**
   ```sql
   -- Welche Branches sind dem User zugewiesen?
   SELECT ub.*, b.name, b.organizationId 
   FROM "UsersBranches" ub
   JOIN "Branch" b ON ub."branchId" = b.id
   WHERE ub."userId" = [DEINE_USER_ID];
   ```

2. **Prüfe aktive Rolle:**
   ```sql
   -- Welche Rolle ist aktiv?
   SELECT ur.*, r.name, r."allBranches"
   FROM "UserRole" ur
   JOIN "Role" r ON ur."roleId" = r.id
   WHERE ur."userId" = [DEINE_USER_ID] AND ur."lastUsed" = true;
   ```

3. **Prüfe RoleBranch Einträge:**
   ```sql
   -- Für welche Branches ist die aktive Rolle verfügbar?
   SELECT rb.*, b.name
   FROM "RoleBranch" rb
   JOIN "Branch" b ON rb."branchId" = b.id
   WHERE rb."roleId" = [AKTIVE_ROLLE_ID];
   ```

4. **Prüfe Manila Branch:**
   ```sql
   -- Existiert Manila und gehört es zur richtigen Organisation?
   SELECT * FROM "Branch" WHERE name LIKE '%Manila%';
   ```

### 8. **Zusammenfassung**

**Aktueller Stand:**
- ✅ Backend vollständig implementiert
- ✅ Header zeigt Branches korrekt an (mit Filterung)
- ❌ **FEHLT: UI zur Zuweisung von Branches an User**

**Problem "Nur Poblado sichtbar":**
- Wahrscheinlich ist Manila dem User nicht zugewiesen
- Oder die aktive Rolle ist nicht für Manila verfügbar
- Oder Manila gehört zu einer anderen Organisation

**Nächste Schritte:**
1. Branches-Tab im `UserManagementTab` implementieren
2. Debugging der aktuellen Situation (Datenbank prüfen)
3. Manila dem User zuweisen (aktuell nur über Backend-API möglich)

