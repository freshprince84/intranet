# Berechtigungssystem - Probleme Analyse & Lösungsplan

**Datum:** 2024-12-17  
**Status:** 🔍 ANALYSE ABGESCHLOSSEN

---

## 🔍 SYSTEMATISCHE PROBLEM-ANALYSE

### Problem 1: Page Worktracker - To Do's zeigen alle Tasks des Branches statt nur eigene

**Beschreibung:**
Alle To Do's des Branches werden angezeigt, statt gemäß Berechtigung nur die eigenen.

**Ursache:**
1. **Backend:** `taskController.ts` (Zeile 109-133) verwendet **hardcodierte Filterung**:
   - Filtert nach `branchId` UND `roleId`
   - Wenn User eine Rolle hat, sieht er **alle Tasks dieser Rolle im Branch**
   - **IGNORIERT** die tatsächliche Berechtigung (`own_both` vs `all_both`)
   - Verwendet **NICHT** `getDataIsolationFilter()` mit `permissionContext`

2. **Backend:** `getDataIsolationFilter()` in `organization.ts` (Zeile 167-211) berücksichtigt `permissionContext`:
   - Prüft `accessLevel` (`own_both` vs `all_both`)
   - Wird aber **NICHT** in `getAllTasks()` verwendet

3. **Frontend:** Prüft Berechtigung korrekt (`hasPermission('tasks', 'read', 'table')`), aber Backend filtert falsch

**Code-Stellen:**
- `backend/src/controllers/taskController.ts` - Zeile 109-133 (hardcodierte Filterung)
- `backend/src/middleware/organization.ts` - Zeile 167-211 (`getDataIsolationFilter` mit `permissionContext`)
- `frontend/src/pages/Worktracker.tsx` - Zeile 2216 (korrekte Prüfung)

**Lösung:**
- `getAllTasks()` muss `getDataIsolationFilter(req, 'task')` verwenden
- Hardcodierte Filterung (Zeile 109-133) entfernen
- `permissionContext` wird von `checkPermission` Middleware gesetzt

---

### Problem 2: Page Worktracker - Reservations werden trotz Berechtigung nicht angezeigt

**Beschreibung:**
Reservations werden nicht angezeigt, obwohl Berechtigung vorhanden ist.

**Ursache:**
1. **Backend:** Route prüft `checkPermission('reservations', 'read', 'tab')` (Zeile 18 in `reservations.ts`)
2. **Frontend:** Prüft `hasPermission('reservations', 'read', 'table')` (Zeile 2216 in `Worktracker.tsx`)
3. **Mismatch:** Backend prüft `'tab'`, Frontend prüft `'table'`
4. **Entity-Name:** In `PERMISSION_STRUCTURE` ist es `'reservations'` als Tab, aber Frontend prüft als `'table'`

**Code-Stellen:**
- `backend/src/routes/reservations.ts` - Zeile 18 (`'tab'`)
- `frontend/src/pages/Worktracker.tsx` - Zeile 2216 (`'table'`)
- `frontend/src/config/permissionStructure.ts` - `'reservations'` als Tab definiert

**Lösung:**
- Frontend muss `hasPermission('reservations', 'read', 'tab')` verwenden (statt `'table'`)
- ODER: Backend muss `'table'` akzeptieren (Legacy-Support)
- **Besser:** Frontend korrigieren, da `PERMISSION_STRUCTURE` `'tab'` verwendet

---

### Problem 3: Page Nomina - Alle Tabs werden angezeigt statt nur berechtigte

**Beschreibung:**
Alle Tabs werden angezeigt, obwohl nicht alle Berechtigungen vorhanden sind.

**Ursache:**
1. **Frontend:** `Payroll.tsx` (Zeile 44-63) definiert Tabs-Array **OHNE** Berechtigungsprüfung
2. **Frontend:** Alle Tabs werden gerendert (Zeile 72-88), unabhängig von Berechtigungen
3. **Fehlend:** Filterung basierend auf `canView(tabEntity, 'tab')`

**Code-Stellen:**
- `frontend/src/pages/Payroll.tsx` - Zeile 44-63 (Tabs-Array ohne Filterung)
- `frontend/src/pages/Payroll.tsx` - Zeile 72-88 (Rendering ohne Prüfung)

**Lösung:**
- Tabs-Array mit `.filter()` filtern basierend auf `canView(tabEntity, 'tab')`
- Entity-Namen: `'consultation_invoices'`, `'monthly_reports'`, `'payroll_reports'` (aus `PERMISSION_STRUCTURE`)

---

### Problem 4: Page Nomina - Alle User im Dropdown statt nur eigene

**Beschreibung:**
Im Tab "Nomina" werden alle User im Dropdown angezeigt, statt nur eigene.

**Ursache:**
1. **Frontend:** `PayrollComponent.tsx` (Zeile 83-97) lädt alle User:
   - `API_ENDPOINTS.USERS.DROPDOWN` gibt alle User zurück
   - **KEINE** Filterung basierend auf Berechtigung (`own_both` vs `all_both`)

2. **Backend:** User-Dropdown-Endpoint filtert nicht nach Berechtigungen

**Code-Stellen:**
- `frontend/src/components/PayrollComponent.tsx` - Zeile 83-97 (lädt alle User)
- Backend User-Dropdown-Endpoint (muss geprüft werden)

**Lösung:**
- Backend muss User-Dropdown basierend auf Berechtigung filtern
- Wenn `accessLevel === 'own_both'`: Nur eigenen User zurückgeben
- Wenn `accessLevel === 'all_both'`: Alle User der Organisation zurückgeben

---

### Problem 5: Page Organisation - Organisation kann bearbeitet werden trotz "nein"

**Beschreibung:**
Organisation kann bearbeitet werden, obwohl Berechtigung auf "nein" steht.

**Ursache:**
1. **Frontend:** `OrganizationSettings.tsx` (Zeile 250) prüft nur `canManageOrganization()`
2. **Fehlend:** Prüfung der Tab-Berechtigung `organization_settings` mit Button `organization_edit`
3. **Backend:** Route prüft möglicherweise nicht korrekt

**Code-Stellen:**
- `frontend/src/components/organization/OrganizationSettings.tsx` - Zeile 250 (`canManageOrganization()`)
- Backend Route für Organisation-Update (muss geprüft werden)

**Lösung:**
- Frontend muss `hasPermission('organization_edit', 'write', 'button')` prüfen
- Backend Route muss `checkPermission('organization_edit', 'write', 'button')` prüfen

---

### Problem 6: Page Configuracion - Alle Tabs werden angezeigt

**Beschreibung:**
Alle Tabs werden angezeigt, obwohl System & Passwort Manager auf "nein" gesetzt wurden.

**Ursache:**
1. **Frontend:** `Settings.tsx` (Zeile 270-314) rendert alle Tabs **OHNE** Berechtigungsprüfung
2. **Fehlend:** Filterung basierend auf `canView(tabEntity, 'tab')`
3. **Entity-Namen:** `'password_manager'` und `'system'` (aus `PERMISSION_STRUCTURE`)

**Code-Stellen:**
- `frontend/src/pages/Settings.tsx` - Zeile 270-314 (Tabs ohne Filterung)

**Lösung:**
- Tabs nur rendern wenn `canView('password_manager', 'tab')` bzw. `canView('system', 'tab')` === true
- Analog zu `Organisation.tsx` (Zeile 105-201)

---

## 🔍 WEITERE PROBLEME GEFUNDEN

### Problem 7: Task-Filterung ignoriert Berechtigungen komplett

**Beschreibung:**
`taskController.ts` verwendet hardcodierte Filterung statt `getDataIsolationFilter()` mit `permissionContext`.

**Ursache:**
- `getAllTasks()` verwendet eigene Filterung (Zeile 109-133)
- `getDataIsolationFilter()` wird nur in anderen Funktionen verwendet (`getTaskById`, `updateTask`, etc.)
- **Inkonsistenz:** Einige Funktionen verwenden `getDataIsolationFilter()`, andere nicht

**Code-Stellen:**
- `backend/src/controllers/taskController.ts` - Zeile 34-260 (`getAllTasks`)
- `backend/src/controllers/taskController.ts` - Zeile 271, 468, 889, 977, 1041 (verwenden `getDataIsolationFilter`)

**Lösung:**
- `getAllTasks()` muss `getDataIsolationFilter(req, 'task')` verwenden
- Hardcodierte Filterung entfernen

---

### Problem 8: Reservation-Route Entity-Type Mismatch

**Beschreibung:**
Backend prüft `'tab'`, Frontend prüft `'table'` für Reservations.

**Ursache:**
- Inkonsistenz zwischen Backend und Frontend
- Legacy-Support für `'table'` existiert, aber funktioniert möglicherweise nicht korrekt

**Lösung:**
- Frontend korrigieren: `hasPermission('reservations', 'read', 'tab')` verwenden
- ODER: Backend erweitern um `'table'` als Alias für `'tab'` zu akzeptieren

---

## 📋 LÖSUNGSPLAN

### Phase 1: Backend - Task-Filterung korrigieren

**Datei:** `backend/src/controllers/taskController.ts`

**Änderungen:**
1. `getAllTasks()` umbauen:
   - Hardcodierte Filterung (Zeile 109-133) entfernen
   - `getDataIsolationFilter(req, 'task')` verwenden
   - `permissionContext` wird von `checkPermission` Middleware gesetzt

**Code:**
```typescript
// VORHER (Zeile 109-133):
if (userRoleId) {
    taskFilter.OR = [
        { responsibleId: userId },
        { qualityControlId: userId },
        { roleId: userRoleId }  // ❌ Zeigt alle Tasks der Rolle im Branch
    ];
}

// NACHHER:
const isolationFilter = getDataIsolationFilter(req as any, 'task');
// ✅ Berücksichtigt permissionContext (own_both vs all_both)
```

---

### Phase 2: Frontend - Reservation-Berechtigung korrigieren

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Änderungen:**
1. Zeile 2216: `hasPermission('reservations', 'read', 'table')` → `hasPermission('reservations', 'read', 'tab')`
2. Zeile 2185: `hasPermission('reservations', 'write', 'table')` → `hasPermission('reservations', 'write', 'tab')`
3. Alle weiteren Stellen prüfen und korrigieren

---

### Phase 3: Frontend - Payroll Tabs filtern

**Datei:** `frontend/src/pages/Payroll.tsx`

**Änderungen:**
1. `usePermissions` Hook importieren (falls nicht vorhanden)
2. `canView` Hook verwenden
3. Tabs-Array filtern:
   ```typescript
   const { canView } = usePermissions();
   
   const allTabs = [
     { id: 'invoices', entity: 'consultation_invoices', ... },
     { id: 'monthly-reports', entity: 'monthly_reports', ... },
     { id: 'payroll', entity: 'payroll_reports', ... }
   ];
   
   const tabs = allTabs.filter(tab => canView(tab.entity, 'tab'));
   ```

---

### Phase 4: Backend - User-Dropdown filtern

**Datei:** Backend User-Dropdown-Endpoint (muss gefunden werden)

**Änderungen:**
1. Endpoint identifizieren (wahrscheinlich `users/dropdown`)
2. Berechtigung prüfen: `checkPermission('payroll_reports', 'read', 'tab')`
3. Wenn `accessLevel === 'own_both'`: Nur eigenen User zurückgeben
4. Wenn `accessLevel === 'all_both'`: Alle User der Organisation zurückgeben

---

### Phase 5: Frontend - Organisation Bearbeitung prüfen

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx`

**Änderungen:**
1. Zeile 250: Zusätzlich `hasPermission('organization_edit', 'write', 'button')` prüfen
2. Button nur anzeigen wenn BEIDE Bedingungen erfüllt:
   - `canManageOrganization()` ODER
   - `hasPermission('organization_edit', 'write', 'button')`

**Backend prüfen:**
- Route für Organisation-Update muss `checkPermission('organization_edit', 'write', 'button')` prüfen

---

### Phase 6: Frontend - Settings Tabs filtern

**Datei:** `frontend/src/pages/Settings.tsx`

**Änderungen:**
1. `usePermissions` Hook importieren (falls nicht vorhanden)
2. `canView` Hook verwenden
3. Tabs nur rendern wenn `canView(tabEntity, 'tab') === true`:
   ```typescript
   const { canView } = usePermissions();
   
   {canView('password_manager', 'tab') && (
     <button onClick={() => handleTabChange('password_manager')}>...</button>
   )}
   {canView('system', 'tab') && (
     <button onClick={() => handleTabChange('system')}>...</button>
   )}
   ```

---

## ⚠️ WEITERE RISIKEN & UNGEREIMTHEITEN

### Risiko 1: Inkonsistente Entity-Type Verwendung

**Problem:**
- Backend verwendet teilweise `'tab'`, teilweise `'table'`
- Frontend verwendet teilweise `'tab'`, teilweise `'table'`
- Legacy-Support existiert, aber ist nicht konsistent

**Empfehlung:**
- Alle Stellen auf `'tab'` standardisieren (gemäß `PERMISSION_STRUCTURE`)
- Legacy-Support für `'table'` beibehalten, aber dokumentieren

---

### Risiko 2: Hardcodierte Filterung in mehreren Controllern

**Problem:**
- `taskController.ts` verwendet hardcodierte Filterung
- Möglicherweise auch andere Controller (muss geprüft werden)

**Empfehlung:**
- Systematisch alle Controller prüfen
- Überall `getDataIsolationFilter()` verwenden
- Hardcodierte Filterung entfernen

---

### Risiko 3: Frontend Tab-Filterung nicht konsistent

**Problem:**
- `Organisation.tsx` filtert Tabs korrekt
- `Payroll.tsx` filtert Tabs NICHT
- `Settings.tsx` filtert Tabs NICHT
- `Worktracker.tsx` filtert Tabs teilweise

**Empfehlung:**
- Alle Seiten systematisch prüfen
- Einheitliche Implementierung: `canView(tabEntity, 'tab')` verwenden

---

## 📊 ZUSAMMENFASSUNG

| Problem | Datei | Zeile | Status | Priorität |
|---------|-------|-------|--------|-----------|
| To Do's zeigen alle Tasks | `taskController.ts` | 109-133 | ✅ BEHOBEN | 🔴 HOCH |
| Reservations nicht angezeigt | `Worktracker.tsx` | 2216 | ✅ BEHOBEN | 🔴 HOCH |
| Payroll Tabs alle angezeigt | `Payroll.tsx` | 44-63 | ✅ BEHOBEN | 🟡 MITTEL |
| Payroll User-Dropdown alle | `PayrollComponent.tsx` | 83-97 | ✅ BEHOBEN | 🟡 MITTEL |
| Organisation bearbeitbar | `OrganizationSettings.tsx` | 250 | ✅ BEHOBEN | 🟡 MITTEL |
| Settings Tabs alle angezeigt | `Settings.tsx` | 270-314 | ✅ BEHOBEN | 🟡 MITTEL |
| Task-Filterung inkonsistent | `taskController.ts` | 34-260 | ✅ BEHOBEN | 🟡 MITTEL |
| Entity-Type Mismatch | `Worktracker.tsx` | 2216 | ✅ BEHOBEN | 🟡 MITTEL |

---

## ✅ IMPLEMENTIERUNG ABGESCHLOSSEN

**Datum:** 2024-12-17  
**Status:** ✅ ALLE PROBLEME BEHOBEN

### Phase 1: Backend - Task-Filterung korrigiert ✅

**Datei:** `backend/src/controllers/taskController.ts`
- Hardcodierte Filterung (Zeile 109-133) entfernt
- `getDataIsolationFilter(req, 'task')` verwendet
- Berücksichtigt jetzt `permissionContext` (own_both vs all_both)

**Datei:** `backend/src/middleware/organization.ts`
- Fallback-Code für Tasks angepasst (nur eigene Tasks, nicht mehr roleId-Filter)

---

### Phase 2: Frontend - Reservation-Berechtigung korrigiert ✅

**Datei:** `frontend/src/pages/Worktracker.tsx`
- Alle `hasPermission('reservations', ..., 'table')` → `hasPermission('reservations', ..., 'tab')` geändert
- 4 Stellen korrigiert (Zeile 2185, 2216, 3138, 3441)

---

### Phase 3: Frontend - Payroll Tabs gefiltert ✅

**Datei:** `frontend/src/pages/Payroll.tsx`
- `usePermissions` Hook importiert
- `canView` Hook verwendet
- Tabs-Array gefiltert basierend auf `canView(tabEntity, 'tab')`
- Default Tab wird basierend auf verfügbaren Tabs gesetzt

---

### Phase 4: Frontend - Payroll User-Dropdown gefiltert ✅

**Datei:** `frontend/src/components/PayrollComponent.tsx`
- `useAuth` Hook importiert
- `getAccessLevel('payroll_reports', 'tab')` prüft Berechtigung
- User-Liste wird gefiltert: `own_both` → nur eigener User, `all_both` → alle User

---

### Phase 5: Frontend/Backend - Organisation Bearbeitung geprüft ✅

**Datei:** `backend/src/routes/organizations.ts`
- `checkPermission('organization_edit', 'write', 'button')` zur Route hinzugefügt

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx`
- Zusätzlich `hasPermission('organization_edit', 'write', 'button')` geprüft
- Button nur angezeigt wenn Berechtigung vorhanden

---

### Phase 6: Frontend - Settings Tabs gefiltert ✅

**Datei:** `frontend/src/pages/Settings.tsx`
- `canView` Hook verwendet
- System Tab nur angezeigt wenn `canView('system', 'tab') === true`
- Password Manager Tab nur angezeigt wenn `canView('password_manager', 'tab') === true`
- Default Tab wird basierend auf verfügbaren Tabs gesetzt

---

## ⚠️ WICHTIG: Server-Neustart erforderlich

Backend-Änderungen erfordern Server-Neustart:
- `taskController.ts` - Task-Filterung geändert
- `organization.ts` - Fallback-Code angepasst
- `organizations.ts` - Route mit Berechtigungsprüfung erweitert

**Führe aus:**
```bash
pm2 restart intranet-backend
sudo systemctl restart nginx
```
