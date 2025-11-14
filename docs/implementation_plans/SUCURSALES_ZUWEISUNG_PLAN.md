# Plan: Sucursales-Zuweisung zu Usern (analog zu Roles)

## Analyse

### Aktueller Stand

1. **Datenbank-Schema:**
   - `UsersBranches` Tabelle existiert bereits (N:M-Beziehung zwischen User und Branch)
   - Struktur: `id`, `userId`, `branchId`, `createdAt`, `updatedAt`
   - Unique Constraint auf `[userId, branchId]`

2. **Backend:**
   - `updateUserRoles` Funktion existiert in `backend/src/controllers/userController.ts`
   - Route `/users/:id/roles` existiert in `backend/src/routes/users.ts`
   - `getUserBranches` existiert in `backend/src/controllers/branchController.ts`
   - `getAllBranches` existiert (vermutlich in branchController)
   - **FEHLT:** `updateUserBranches` Funktion
   - **FEHLT:** Route `/users/:id/branches`

3. **Frontend:**
   - `userApi.updateRoles` existiert in `frontend/src/api/apiClient.ts`
   - Roles-Tab existiert in `frontend/src/components/UserManagementTab.tsx`
   - Branch-API existiert (vermutlich in apiClient.ts)
   - **FEHLT:** `userApi.updateBranches`
   - **FEHLT:** Branches-Tab in UserManagementTab

## Implementierungsplan

### Schritt 1: Backend - updateUserBranches Funktion erstellen

**Datei:** `backend/src/controllers/userController.ts`

**Funktion:** `updateUserBranches` (analog zu `updateUserRoles`)

**Details:**
- Interface `UpdateUserBranchesRequest` mit `branchIds: number[]` erstellen
- Funktion implementieren:
  - User-ID validieren
  - `branchIds` Array validieren
  - User existiert prüfen
  - Branches existieren prüfen (mit Data-Isolation-Filter)
  - Aktuelle UserBranches löschen
  - Neue UserBranches erstellen
  - Updated User mit Branches zurückgeben
  - Benachrichtigungen senden (analog zu Roles)

**Hinweis:** Branches haben kein `lastUsed` Flag wie Roles, daher einfacher als Roles-Update

### Schritt 2: Backend - Route hinzufügen

**Datei:** `backend/src/routes/users.ts`

**Änderung:**
- Route `router.put('/:id/branches', updateUserBranches);` hinzufügen
- Import `updateUserBranches` aus userController hinzufügen

### Schritt 3: Frontend - API-Client erweitern

**Datei:** `frontend/src/api/apiClient.ts`

**Änderung:**
- In `userApi` Objekt: `updateBranches: (id: number, branchIds: number[]) => apiClient.put(`/users/${id}/branches`, { branchIds })` hinzufügen

**Prüfen:**
- Branch-API `getAll` Funktion existiert (falls nicht, hinzufügen)

### Schritt 4: Frontend - Branches-Tab in UserManagementTab

**Datei:** `frontend/src/components/UserManagementTab.tsx`

**Änderungen:**

1. **State hinzufügen:**
   - `const [branches, setBranches] = useState<Branch[]>([]);`
   - `const [loadingBranches, setLoadingBranches] = useState(false);`
   - `const [selectedBranches, setSelectedBranches] = useState<number[]>([]);`
   - `activeUserTab` erweitern: `'details' | 'documents' | 'roles' | 'branches' | 'lifecycle'`

2. **Funktionen hinzufügen:**
   - `fetchBranches()` - Lädt alle verfügbaren Branches
   - `toggleBranch(branchId: number)` - Toggle Branch-Zuweisung (analog zu `toggleRole`)

3. **Tab-Navigation erweitern:**
   - Neuen Tab-Button für "Branches" / "Sucursales" hinzufügen
   - Icon: `BuildingOfficeIcon` (bereits importiert)

4. **Branches-Tab-Content:**
   - Analog zum Roles-Tab strukturieren
   - Aktuell zugewiesene Branches anzeigen
   - Verfügbare Branches anzeigen
   - Toggle-Funktionalität für Zuweisung/Entfernung

5. **fetchUserDetails erweitern:**
   - Branches aus `response.data.branches` extrahieren
   - `selectedBranches` State setzen

### Schritt 5: Frontend - Übersetzungen hinzufügen

**Dateien:**
- `frontend/src/i18n/locales/es.json`
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/de.json` (falls vorhanden)

**Hinzufügen:**
```json
"branchAssignment": {
  "title": "Asignar Sucursales",
  "assignBranch": "Asignar sucursal",
  "removeBranch": "Quitar sucursal",
  "currentBranches": "Sucursales Actuales",
  "availableBranches": "Sucursales Disponibles",
  "noBranches": "No hay sucursales disponibles",
  "saveSuccess": "Sucursales asignadas exitosamente",
  "saveError": "Error al asignar sucursales",
  "loading": "Cargando sucursales...",
  "noBranchesAssigned": "No hay sucursales asignadas",
  "remove": "Quitar",
  "add": "Agregar",
  "noBranchesAvailable": "No hay más sucursales disponibles"
}
```

### Schritt 6: TypeScript Interfaces prüfen

**Datei:** `frontend/src/types/interfaces.ts`

**Prüfen:**
- `Branch` Interface existiert
- `User` Interface hat `branches` Property (vermutlich `branches: { branch: Branch }[]`)

## Abhängigkeiten

- Branch-API muss `getAll` Funktion haben
- Branch-Controller muss Data-Isolation-Filter unterstützen
- User-Interface muss Branches enthalten

## Test-Checkliste

- [ ] Backend: `updateUserBranches` Funktion testen
- [ ] Backend: Route `/users/:id/branches` testen
- [ ] Frontend: Branches werden korrekt geladen
- [ ] Frontend: Branches können zugewiesen werden
- [ ] Frontend: Branches können entfernt werden
- [ ] Frontend: UI aktualisiert sich korrekt
- [ ] Übersetzungen funktionieren (ES/EN)
- [ ] Benachrichtigungen werden gesendet

## Wichtige Hinweise

1. **Kein lastUsed für Branches:** Im Gegensatz zu Roles haben Branches kein `lastUsed` Flag, daher ist die Implementierung einfacher.

2. **Data Isolation:** Die `updateUserBranches` Funktion muss den Data-Isolation-Filter verwenden (analog zu `updateUserRoles`).

3. **Benachrichtigungen:** Analog zu Roles sollten Benachrichtigungen gesendet werden, wenn Branches aktualisiert werden.

4. **UI-Konsistenz:** Der Branches-Tab sollte genau wie der Roles-Tab aussehen und funktionieren.

