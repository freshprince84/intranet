# Rollen-Isolation und Filter-Fixes - Vollständiger Plan (2025-01-29)

**Datum:** 2025-01-29  
**Status:** 📋 PLANUNG - Wartet auf Zustimmung  
**Priorität:** 🔴🔴🔴 KRITISCH

---

## 📊 PROBLEME IDENTIFIZIERT

### Problem 1: To Do's laden nicht beim Öffnen der Worktracker-Seite

**Symptom:**
- To Do's laden nicht beim ersten Öffnen der Worktracker-Seite
- Nach Tab-Wechsel (z.B. zu Reservations) und zurück laden sie relativ schnell

**Ursache (vermutet):**
- `useEffect` bei Zeile 937-941 prüft `activeTab === 'todos'` und `hasPermission('tasks', 'read', 'table')`
- Mögliche Probleme:
  1. `activeTab` ist beim ersten Mount nicht 'todos' (Standard-Tab?)
  2. `hasPermission` ist noch nicht geladen (async)
  3. `loadTasks` wird nicht aufgerufen, weil Bedingungen nicht erfüllt

**Code-Stelle:**
```typescript
// frontend/src/pages/Worktracker.tsx, Zeile 937-941
useEffect(() => {
    if (activeTab === 'todos' && hasPermission('tasks', 'read', 'table')) {
        loadTasks(undefined, undefined, false, 20, 0);
    }
}, [activeTab]);
```

**Problem:** `hasPermission` ist möglicherweise nicht in den Dependencies, oder `activeTab` ist beim ersten Mount nicht 'todos'.

---

### Problem 2: Filter funktionieren teilweise nicht mehr

**Symptom:**
- Filter werden im Filter-Pane gesetzt
- Nach Anwenden werden Einträge nicht aktualisiert
- Betrifft: Reservations, To Do's, Requests

**Ursache (vermutet):**
- `handleFilterChange` ruft `loadTasks`/`loadReservations`/`fetchRequests` auf
- ABER: `applyFilterConditions` setzt nur State, ruft aber nicht die Load-Funktion auf
- Möglicherweise werden Filter-Bedingungen nicht korrekt übergeben

**Code-Stellen:**
```typescript
// frontend/src/pages/Worktracker.tsx, Zeile 1329-1352
const handleFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>) => {
    if (activeTab === 'todos') {
        setActiveFilterName(name);
        setSelectedFilterId(id);
        applyFilterConditions(conditions, operators, sortDirections);
        // ...
        if (id) {
            await loadTasks(id, undefined, false, 20, 0);
        } else if (conditions.length > 0) {
            await loadTasks(undefined, conditions, false, 20, 0);
        } else {
            await loadTasks(undefined, undefined, false, 20, 0);
        }
    } else if (activeTab === 'reservations') {
        // ❌ PROBLEM: Hier wird loadReservations NICHT aufgerufen!
        setReservationActiveFilterName(name);
        setReservationSelectedFilterId(id);
        applyReservationFilterConditions(conditions, operators, sortDirections);
        setReservationTableSortConfig({ key: 'checkInDate', direction: 'desc' });
    }
};
```

**Problem:** Bei Reservations wird `loadReservations` nicht aufgerufen in `handleFilterChange`!

---

### Problem 3: Rollen-basierte Datenisolation muss komplett überarbeitet werden

**Aktuelle Situation:**
- **Requests:** Keine Rollen-Filterung, keine Branch-Filterung
- **Tasks:** Rollen-Filterung (roleId), aber keine Branch-Filterung, Admin sieht nicht alles
- **Reservations:** Branch-Filterung (wenn own_branch), aber keine Rollen-Filterung
- **Tour Bookings:** Branch-Filterung (wenn vorhanden), keine Rollen-Filterung

**Gewünschte Situation:**

#### Admin-Rolle:
- **Sieht ALLES** innerhalb der Organisation
- **Requests:** Alle Requests der Organisation (unabhängig von Branch)
- **Tasks:** Alle Tasks der Organisation (unabhängig von Rolle/Branch)
- **Reservations:** Alle Reservations der Organisation (unabhängig von Branch)
- **Tour Bookings:** Alle Tour Bookings der Organisation (unabhängig von Branch)

#### Owner-Rolle:
- **Wie Admin:** Sieht ALLES innerhalb der Organisation

#### User-Rolle:
- **Requests:** Nur Requests der eigenen Branch
- **Tasks:** Nur Tasks der eigenen Rolle + eigene Tasks (als responsible oder QC), innerhalb der eigenen Branch
- **Reservations:** Nur Reservations der eigenen Branch
- **Tour Bookings:** Nur Tour Bookings der eigenen Branch (wenn vorhanden)

#### Andere Rollen (recepcion, aseo, etc.):
- **Wie User-Rolle:** Gleiche Einschränkungen

#### Lifecycle-Tasks:
- **Nur bestimmte Rollen** (HR, Legal, Admin) + **Admin** (sieht immer alles)
- Lifecycle-Tasks werden für bestimmte Rollen erstellt (HR, Legal)
- Admin muss diese auch sehen können

#### Reservation-Tasks:
- **Nur bestimmte Rollen** (z.B. Reception) + **Admin** (sieht immer alles)
- Reservation-Tasks werden für bestimmte Rollen erstellt (z.B. Reception)
- Admin muss diese auch sehen können

---

## 🔍 DETAILLIERTE ANALYSE

### 1. To Do's Lade-Problem

**Aktueller Code:**
```typescript
// frontend/src/pages/Worktracker.tsx, Zeile 937-941
useEffect(() => {
    if (activeTab === 'todos' && hasPermission('tasks', 'read', 'table')) {
        loadTasks(undefined, undefined, false, 20, 0);
    }
}, [activeTab]);
```

**Probleme:**
1. `hasPermission` ist nicht in den Dependencies → könnte stale sein
2. `loadTasks` ist nicht in den Dependencies → könnte stale sein
3. `activeTab` könnte beim ersten Mount nicht 'todos' sein

**Lösung:**
- `hasPermission` und `loadTasks` zu Dependencies hinzufügen
- Oder: Prüfen, ob `activeTab` beim Mount 'todos' ist, und dann laden
- Oder: Initial Load beim Mount, unabhängig von `activeTab`

---

### 2. Filter-Problem

**Aktueller Code:**
```typescript
// frontend/src/pages/Worktracker.tsx, Zeile 1329-1352
const handleFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>) => {
    if (activeTab === 'todos') {
        // ... lädt Tasks
    } else if (activeTab === 'reservations') {
        // ❌ PROBLEM: Lädt Reservations NICHT!
        setReservationActiveFilterName(name);
        setReservationSelectedFilterId(id);
        applyReservationFilterConditions(conditions, operators, sortDirections);
        setReservationTableSortConfig({ key: 'checkInDate', direction: 'desc' });
    }
};
```

**Problem:** Bei Reservations wird `loadReservations` nicht aufgerufen!

**Lösung:**
- `loadReservations` in `handleFilterChange` aufrufen (analog zu Tasks)
- Oder: `handleReservationFilterChange` verwenden (wird bereits verwendet, aber möglicherweise nicht korrekt)

**Weitere Probleme:**
- `applyFilterConditions` ruft nicht `loadTasks` auf → Filter werden nur im State gesetzt, aber nicht geladen
- Möglicherweise werden Filter-Bedingungen nicht korrekt an Backend übergeben

---

### 3. Rollen-Isolation

**Aktuelle Backend-Logik:**

#### Requests (`requestController.ts`, Zeile 114-146):
```typescript
if (organizationId) {
    baseWhereConditions.push({
        OR: [
            { isPrivate: false, organizationId: organizationId },
            { isPrivate: true, organizationId: organizationId, requesterId: userId },
            { isPrivate: true, organizationId: organizationId, responsibleId: userId }
        ]
    });
}
```

**Problem:** Keine Rollen-Prüfung, keine Branch-Filterung für User-Rolle!

#### Tasks (`taskController.ts`, Zeile 85-127):
```typescript
if (organizationId) {
    if (userRoleId) {
        baseWhereConditions.push({
            OR: [
                { organizationId: organizationId, responsibleId: userId },
                { organizationId: organizationId, qualityControlId: userId },
                { organizationId: organizationId, roleId: userRoleId }
            ]
        });
    }
}
```

**Problem:** 
- Admin sieht nicht alles (muss auch geprüft werden)
- Keine Branch-Filterung für User-Rolle
- Lifecycle-Tasks und Reservation-Tasks werden nicht speziell behandelt

#### Reservations (`reservationController.ts`, Zeile 595-634):
```typescript
if (hasOwnBranchPermission && !hasAllBranchesPermission) {
    const branchId = (req as any).branchId;
    if (branchId) {
        whereClause.branchId = branchId;
    }
}
```

**Problem:**
- Keine Rollen-Prüfung (Admin vs. User)
- Nur Berechtigungs-basierte Filterung

---

## 📋 LÖSUNGSPLAN

### Phase 1: To Do's Lade-Problem beheben

**Schritte:**
1. Prüfen, welcher Tab beim Mount aktiv ist
2. `useEffect` anpassen, um `hasPermission` und `loadTasks` in Dependencies zu haben
3. Initial Load beim Mount, wenn Tab 'todos' ist
4. Testen: To Do's sollten beim Öffnen sofort laden

**Risiken:**
- ⚠️ **Niedrig:** Nur Frontend-Änderungen, keine Backend-Änderungen
- ⚠️ **Performance:** Keine Auswirkungen

**Code-Änderungen:**
```typescript
// frontend/src/pages/Worktracker.tsx
useEffect(() => {
    if (activeTab === 'todos' && hasPermission('tasks', 'read', 'table')) {
        loadTasks(undefined, undefined, false, 20, 0);
    }
}, [activeTab, hasPermission, loadTasks]); // ✅ Dependencies hinzufügen
```

---

### Phase 2: Filter-Problem beheben

**Schritte:**
1. `handleFilterChange` für Reservations anpassen, um `loadReservations` aufzurufen
2. Prüfen, ob `applyFilterConditions` korrekt Filter-Bedingungen setzt
3. Prüfen, ob Filter-Bedingungen korrekt an Backend übergeben werden
4. Testen: Filter sollten sofort Einträge aktualisieren

**Risiken:**
- ⚠️ **Niedrig:** Nur Frontend-Änderungen
- ⚠️ **Performance:** Keine Auswirkungen

**Code-Änderungen:**
```typescript
// frontend/src/pages/Worktracker.tsx
const handleFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>) => {
    if (activeTab === 'todos') {
        // ... bestehender Code
    } else if (activeTab === 'reservations') {
        setReservationActiveFilterName(name);
        setReservationSelectedFilterId(id);
        applyReservationFilterConditions(conditions, operators, sortDirections);
        setReservationTableSortConfig({ key: 'checkInDate', direction: 'desc' });
        
        // ✅ FIX: loadReservations aufrufen
        if (id) {
            await loadReservations(id, undefined, false, 20, 0);
        } else if (conditions.length > 0) {
            await loadReservations(undefined, conditions, false, 20, 0);
        } else {
            await loadReservations(undefined, undefined, false, 20, 0);
        }
    }
};
```

---

### Phase 3: Rollen-Isolation implementieren

**Schritte:**

#### 3.1: Rollen-Erkennung im Backend

**Neue Hilfsfunktion:** `isAdminRole(req)` und `isOwnerRole(req)`
```typescript
// backend/src/middleware/organization.ts
export const isAdminRole = (req: Request): boolean => {
    const roleName = req.userRole?.role?.name;
    return roleName === 'Admin';
};

export const isOwnerRole = (req: Request): boolean => {
    const roleName = req.userRole?.role?.name;
    return roleName === 'Owner';
};
```

#### 3.2: Requests - Rollen-Isolation

**Aktuell:** Keine Rollen-Filterung, keine Branch-Filterung

**Neu:**
- **Admin/Owner:** Alle Requests der Organisation
- **User/Andere Rollen:** Nur Requests der eigenen Branch

**Code-Änderungen:**
```typescript
// backend/src/controllers/requestController.ts
if (organizationId) {
    if (isAdminRole(req) || isOwnerRole(req)) {
        // Admin/Owner: Alle Requests der Organisation
        baseWhereConditions.push({
            OR: [
                { isPrivate: false, organizationId: organizationId },
                { isPrivate: true, organizationId: organizationId, requesterId: userId },
                { isPrivate: true, organizationId: organizationId, responsibleId: userId }
            ]
        });
    } else {
        // User/Andere Rollen: Nur Requests der eigenen Branch
        const branchId = (req as any).branchId;
        if (branchId) {
            baseWhereConditions.push({
                AND: [
                    {
                        OR: [
                            { isPrivate: false, organizationId: organizationId, branchId: branchId },
                            { isPrivate: true, organizationId: organizationId, branchId: branchId, requesterId: userId },
                            { isPrivate: true, organizationId: organizationId, branchId: branchId, responsibleId: userId }
                        ]
                    }
                ]
            });
        } else {
            // Fallback: Nur eigene Requests
            baseWhereConditions.push({
                OR: [
                    { requesterId: userId },
                    { responsibleId: userId }
                ]
            });
        }
    }
}
```

**Risiken:**
- ⚠️ **Mittel:** Datenisolation-Änderungen können bestehende Queries beeinträchtigen
- ⚠️ **Performance:** Branch-Filterung kann Performance verbessern (weniger Daten)

#### 3.3: Tasks - Rollen-Isolation

**Aktuell:** Rollen-Filterung (roleId), aber keine Branch-Filterung, Admin sieht nicht alles

**Neu:**
- **Admin/Owner:** Alle Tasks der Organisation
- **User/Andere Rollen:** Nur Tasks der eigenen Rolle + eigene Tasks (als responsible oder QC), innerhalb der eigenen Branch
- **Lifecycle-Tasks:** Nur bestimmte Rollen (HR, Legal) + Admin
- **Reservation-Tasks:** Nur bestimmte Rollen (z.B. Reception) + Admin

**Code-Änderungen:**
```typescript
// backend/src/controllers/taskController.ts
if (organizationId) {
    if (isAdminRole(req) || isOwnerRole(req)) {
        // Admin/Owner: Alle Tasks der Organisation
        baseWhereConditions.push({
            organizationId: organizationId
        });
    } else {
        // User/Andere Rollen: Nur Tasks der eigenen Rolle + eigene Tasks, innerhalb der eigenen Branch
        const branchId = (req as any).branchId;
        const userRoleId = (req as any).userRole?.role?.id;
        
        const taskFilter: any = {
            organizationId: organizationId
        };
        
        if (branchId) {
            taskFilter.branchId = branchId;
        }
        
        if (userRoleId) {
            taskFilter.OR = [
                { responsibleId: userId },
                { qualityControlId: userId },
                { roleId: userRoleId }
            ];
        } else {
            taskFilter.OR = [
                { responsibleId: userId },
                { qualityControlId: userId }
            ];
        }
        
        baseWhereConditions.push(taskFilter);
    }
}
```

**Lifecycle-Tasks und Reservation-Tasks:**
- Werden bereits für bestimmte Rollen erstellt (HR, Legal, Reception)
- Admin sieht diese automatisch (weil Admin alle Tasks sieht)
- User/Andere Rollen sehen diese nur, wenn sie die entsprechende Rolle haben

**Risiken:**
- ⚠️ **Mittel:** Datenisolation-Änderungen können bestehende Queries beeinträchtigen
- ⚠️ **Performance:** Branch-Filterung kann Performance verbessern (weniger Daten)
- ⚠️ **Funktionalität:** Lifecycle-Tasks und Reservation-Tasks müssen korrekt funktionieren

#### 3.4: Reservations - Rollen-Isolation

**Aktuell:** Branch-Filterung (wenn own_branch), aber keine Rollen-Prüfung

**Neu:**
- **Admin/Owner:** Alle Reservations der Organisation
- **User/Andere Rollen:** Nur Reservations der eigenen Branch

**Code-Änderungen:**
```typescript
// backend/src/controllers/reservationController.ts
if (organizationId) {
    if (isAdminRole(req) || isOwnerRole(req)) {
        // Admin/Owner: Alle Reservations der Organisation
        whereClause.organizationId = organizationId;
    } else {
        // User/Andere Rollen: Nur Reservations der eigenen Branch
        const branchId = (req as any).branchId;
        if (branchId) {
            whereClause.organizationId = organizationId;
            whereClause.branchId = branchId;
        } else {
            // Fallback: Keine Reservations
            return res.json({
                success: true,
                data: []
            });
        }
    }
}
```

**Risiken:**
- ⚠️ **Niedrig:** Ähnlich wie aktuelle Logik, nur Rollen-Prüfung hinzugefügt
- ⚠️ **Performance:** Keine Auswirkungen

#### 3.5: Tour Bookings - Rollen-Isolation

**Aktuell:** Branch-Filterung (wenn vorhanden), keine Rollen-Prüfung

**Neu:**
- **Admin/Owner:** Alle Tour Bookings der Organisation
- **User/Andere Rollen:** Nur Tour Bookings der eigenen Branch (wenn vorhanden)

**Code-Änderungen:**
```typescript
// backend/src/controllers/tourBookingController.ts
if (organizationId) {
    if (isAdminRole(req) || isOwnerRole(req)) {
        // Admin/Owner: Alle Tour Bookings der Organisation
        baseWhereConditions.push({ organizationId });
    } else {
        // User/Andere Rollen: Nur Tour Bookings der eigenen Branch
        const branchId = (req as any).branchId;
        if (branchId) {
            baseWhereConditions.push({ organizationId, branchId });
        } else {
            // Fallback: Keine Tour Bookings
            baseWhereConditions.push({ organizationId, branchId: -1 }); // Immer leer
        }
    }
}
```

**Risiken:**
- ⚠️ **Niedrig:** Ähnlich wie aktuelle Logik, nur Rollen-Prüfung hinzugefügt
- ⚠️ **Performance:** Keine Auswirkungen

---

## ⚠️ RISIKO-ANALYSE

### Performance-Risiken:

1. **Branch-Filterung bei Requests:**
   - ✅ **Positiv:** Weniger Daten = bessere Performance
   - ⚠️ **Risiko:** Wenn Branch-Index fehlt, könnte Performance leiden
   - **Lösung:** Prisma-Index für `branchId` prüfen

2. **Branch-Filterung bei Tasks:**
   - ✅ **Positiv:** Weniger Daten = bessere Performance
   - ⚠️ **Risiko:** Wenn Branch-Index fehlt, könnte Performance leiden
   - **Lösung:** Prisma-Index für `branchId` prüfen

3. **Rollen-Prüfung bei jedem Request:**
   - ⚠️ **Risiko:** Zusätzliche Prüfung bei jedem Request
   - **Lösung:** Prüfung ist sehr schnell (nur String-Vergleich)

### Funktionalitäts-Risiken:

1. **Datenisolation-Änderungen:**
   - ⚠️ **Risiko:** Bestehende Queries könnten andere Ergebnisse liefern
   - **Lösung:** Umfassende Tests, besonders für Admin-Rolle

2. **Lifecycle-Tasks:**
   - ⚠️ **Risiko:** Admin muss Lifecycle-Tasks sehen können
   - **Lösung:** Admin sieht alle Tasks (inkl. Lifecycle-Tasks)

3. **Reservation-Tasks:**
   - ⚠️ **Risiko:** Admin muss Reservation-Tasks sehen können
   - **Lösung:** Admin sieht alle Tasks (inkl. Reservation-Tasks)

4. **Filter-System:**
   - ⚠️ **Risiko:** Filter könnten mit neuen Isolation-Regeln kollidieren
   - **Lösung:** Filter werden NACH Isolation-Regeln angewendet (AND-Kombination)

---

## 📝 IMPLEMENTIERUNGS-REIHENFOLGE

### Schritt 1: To Do's Lade-Problem beheben
- **Priorität:** 🔴🔴🔴 KRITISCH
- **Aufwand:** ⏱️ 30 Minuten
- **Risiko:** ⚠️ Niedrig

### Schritt 2: Filter-Problem beheben
- **Priorität:** 🔴🔴🔴 KRITISCH
- **Aufwand:** ⏱️ 1 Stunde
- **Risiko:** ⚠️ Niedrig

### Schritt 3: Rollen-Isolation implementieren
- **Priorität:** 🔴🔴 WICHTIG
- **Aufwand:** ⏱️ 4-6 Stunden
- **Risiko:** ⚠️ Mittel

**Reihenfolge:**
1. Requests (einfachste)
2. Reservations (ähnlich wie aktuell)
3. Tour Bookings (ähnlich wie aktuell)
4. Tasks (komplexeste, wegen Lifecycle/Reservation-Tasks)

---

## ✅ TEST-PLAN

### To Do's Lade-Problem:
1. ✅ Worktracker-Seite öffnen → To Do's sollten sofort laden
2. ✅ Tab wechseln → To Do's sollten weiterhin funktionieren

### Filter-Problem:
1. ✅ Filter im Filter-Pane setzen → Einträge sollten sofort aktualisiert werden
2. ✅ Filter für Reservations setzen → Einträge sollten sofort aktualisiert werden
3. ✅ Filter für Requests setzen → Einträge sollten sofort aktualisiert werden

### Rollen-Isolation:
1. ✅ Admin-Rolle: Sollte alle Requests/Tasks/Reservations/Tour Bookings sehen
2. ✅ Owner-Rolle: Sollte alle Requests/Tasks/Reservations/Tour Bookings sehen
3. ✅ User-Rolle: Sollte nur Requests/Tasks/Reservations/Tour Bookings der eigenen Branch sehen
4. ✅ Andere Rollen: Sollten wie User-Rolle funktionieren
5. ✅ Lifecycle-Tasks: Sollten nur für HR/Legal + Admin sichtbar sein
6. ✅ Reservation-Tasks: Sollten nur für Reception + Admin sichtbar sein

---

## 📚 DOKUMENTATION

**Zu aktualisieren:**
1. `docs/technical/FILTER_UND_SORTIERUNG_AKTUELLER_ZUSTAND_2025-01-29.md` → Rollen-Isolation aktualisieren
2. `docs/technical/BERECHTIGUNGSSYSTEM.md` → Rollen-Isolation dokumentieren
3. Neue Dokumentation: `docs/technical/ROLLEN_ISOLATION_IMPLEMENTATION.md`

---

**Erstellt:** 2025-01-29  
**Status:** 📋 PLANUNG - Wartet auf Zustimmung  
**Nächster Schritt:** Implementierung nach Zustimmung

