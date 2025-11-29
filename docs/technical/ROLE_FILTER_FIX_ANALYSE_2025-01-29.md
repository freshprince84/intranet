# Rollen-Filter Fix - Detaillierte Analyse und Fix-Plan

**Datum:** 2025-01-29  
**Status:** 📋 ANALYSE ABGESCHLOSSEN - Wartet auf Zustimmung  
**Priorität:** 🔴 KRITISCH  
**Performance-Ziel:** ⚡ Alle Änderungen müssen Performance-optimiert sein

---

## ⚠️ WICHTIG: PERFORMANCE-STANDARDS

**Alle Änderungen müssen diese Performance-Standards beachten:**

1. **KEINE Pagination beim Laden:**
   - ❌ STRENG VERBOTEN: `limit`/`offset` Parameter im Backend
   - ✅ ERFORDERLICH: Immer ALLE Ergebnisse laden (mit Filter wenn gesetzt)

2. **Server-seitiges Filtering:**
   - ✅ Backend filtert bereits (mit `convertFilterConditionsToPrismaWhere`)
   - ✅ Filter werden gecacht (5 Minuten TTL via `filterCache`)
   - ✅ Client sollte NICHT nochmal filtern (nur `searchTerm`)

3. **Infinite Scroll nur für Anzeige:**
   - ✅ Alle Daten werden geladen (Backend gibt alle zurück)
   - ✅ Infinite Scroll nur für die Anzeige (nicht für das Laden)
   - ✅ Initial: 10 bei Cards, 20 bei Tabelle

4. **Datenbank-Indizes:**
   - ✅ Indizes auf allen gefilterten Feldern vorhanden
   - ✅ Composite Indizes für häufig kombinierte Filter

**Referenz-Dokumentation:**
- `docs/technical/INFINITE_SCROLL_UND_FILTER_FIX_PLAN_2025-01-29.md`
- `docs/technical/PERFORMANCE_ANALYSE_VOLLSTAENDIG.md`
- `docs/modules/MODUL_FILTERSYSTEM.md`

---

## 📊 PROBLEM-ZUSAMMENFASSUNG

### Problem 1: Requests - Rollen-Filter müssen entfernt werden

**FAKT:**
- Requests können NICHT für Rollen erstellt werden (nur User-IDs im Schema)
- ABER: Filter-System unterstützt Rollen-Filter für `requestedBy` und `responsible` bei Requests
- Seed erstellt Filter für Rollen bei Requests
- Backend ignoriert Rollen-Filter bei Requests (gibt leeres Objekt zurück)

**Impact:**
- Filter funktionieren nicht korrekt
- Benutzer können nach Rollen filtern, aber es gibt keine Ergebnisse
- Verwirrung für Benutzer

---

### Problem 2: Tasks - Rollen-Filter fehlt oder funktioniert nicht

**FAKT:**
- Tasks KÖNNEN für Rollen erstellt werden (haben `roleId` Feld im Schema)
- Filter-System unterstützt Rollen-Filter für `responsible` bei Tasks
- Seed erstellt Filter für Rollen bei Tasks
- Backend unterstützt Rollen-Filter bei Tasks (`filterToPrisma.ts` Zeile 255-259)

**Vermutung:**
- Rollen-Filter-Funktionalität ist vorhanden, aber möglicherweise nicht korrekt konfiguriert
- Oder: Filter funktionieren, aber Benutzer sehen die Option nicht

**WICHTIG:**
- Tasks haben separate Filter-Spalten: `responsible` und `qualityControl` (über `filterOnlyColumns`)
- `responsible` sollte Rollen-Dropdown anzeigen (bei Tasks)
- `qualityControl` zeigt NUR Users (keine Rollen)

---

### Problem 3: Reservations und TourBookings - Keine Rollen-Filter

**FAKT:**
- Reservations: Haben KEINE Rollen-Felder (nur User-IDs)
- TourBookings: Haben `bookedBy` (User-Filter, keine Rollen)
- FilterRow sollte KEINE Rollen für Reservations/TourBookings anzeigen

**Status:**
- ✅ Reservations: Korrekt - keine Rollen-Filter nötig
- ✅ TourBookings: Korrekt - keine Rollen-Filter nötig
- ⚠️ FilterRow muss Tabellen-Typ korrekt erkennen (nicht nur über `requestedBy`/`responsible`)

---

## 🔍 DETAILLIERTE CODE-ANALYSE

### 1. FilterRow.tsx - Rollen-Dropdowns

**Aktueller Code (Zeile 132-155):**
```typescript
// WICHTIG: requestedBy, responsible, qualityControl und responsibleAndQualityControl benötigen Dropdowns
if (condition.column === 'requestedBy' || condition.column === 'responsible' || condition.column === 'qualityControl' || condition.column === 'responsibleAndQualityControl') {
  // Benutzer laden (nur aktive Benutzer)
  setLoadingUsers(true);
  // ... Benutzer laden ...
  
  // Rollen laden für requestedBy, responsible und responsibleAndQualityControl (nicht für qualityControl)
  if (condition.column === 'requestedBy' || condition.column === 'responsible' || condition.column === 'responsibleAndQualityControl') {
    setLoadingRoles(true);
    // ... Rollen laden ...
  }
}
```

**Problem:**
- Lädt Rollen für `requestedBy` - sollte NUR bei Tasks sein, NICHT bei Requests
- Lädt Rollen für `responsible` - sollte NUR bei Tasks sein, NICHT bei Requests

**Lösung:**
- Tabellen-Typ erkennen (wie bei Status-Dropdown, Zeile 185-186)
- Rollen NUR laden wenn:
  - `responsible` UND Tasks-Tabelle (nicht Requests)
  - `responsibleAndQualityControl` UND Tasks-Tabelle (nicht Requests)
  - NICHT für `requestedBy` (nur bei Requests, die keine Rollen unterstützen)
  - NICHT für Reservations/TourBookings (haben keine Rollen-Felder)

**Tabellen-Erkennung:**
```typescript
const isRequestTable = columns.some(col => col.id === 'requestedBy' || col.id === 'createTodo');
const isTaskTable = columns.some(col => col.id === 'responsible' || col.id === 'qualityControl');
// Reservations: columns.some(col => col.id === 'guestName' || col.id === 'checkInDate')
// TourBookings: columns.some(col => col.id === 'bookedBy' || col.id === 'tourDate')
```

---

**Aktueller Code (Zeile 255-290):**
```typescript
// Für requestedBy, responsible und responsibleAndQualityControl ein Dropdown mit Benutzern und Rollen rendern
if (columnId === 'requestedBy' || columnId === 'responsible' || columnId === 'responsibleAndQualityControl') {
  return (
    <select>
      {/* Users */}
      {/* Roles */}
    </select>
  );
}
```

**Problem:**
- Rendert Rollen-Dropdown für `requestedBy` - sollte NUR bei Tasks sein
- Rendert Rollen-Dropdown für `responsible` - sollte NUR bei Tasks sein

**Lösung:**
- Tabellen-Typ erkennen
- Rollen-Dropdown NUR rendern wenn:
  - `responsible` UND Tasks-Tabelle
  - `responsibleAndQualityControl` UND Tasks-Tabelle
  - `requestedBy` - KEINE Rollen (nur Users)

---

### 2. filterToPrisma.ts - Backend-Filter-Konvertierung

**Aktueller Code (Zeile 137-141):**
```typescript
case 'requestedBy':
  if (entityType === 'request') {
    return convertUserRoleCondition(value, operator, entityType, 'requestedBy');
  }
  return {};
```

**Problem:**
- `convertUserRoleCondition` wird für `requestedBy` bei Requests aufgerufen
- Aber `convertUserRoleCondition` gibt leeres Objekt zurück für Rollen bei Requests (Zeile 260)

**Lösung:**
- Keine Änderung nötig - Backend ignoriert bereits Rollen bei Requests
- ABER: Frontend sollte Rollen-Option gar nicht anzeigen

---

**Aktueller Code (Zeile 128-129):**
```typescript
case 'responsible':
  return convertUserRoleCondition(value, operator, entityType, 'responsible');
```

**Problem:**
- Wird für Requests UND Tasks aufgerufen
- Bei Requests: Rollen werden ignoriert (Zeile 260)
- Bei Tasks: Rollen werden unterstützt (Zeile 255-259)

**Lösung:**
- Keine Änderung nötig - Backend funktioniert korrekt
- ABER: Frontend sollte Rollen-Option nur bei Tasks anzeigen

---

**Aktueller Code (Zeile 248-261):**
```typescript
// Handle role-{id} format
if (value.startsWith('role-')) {
  const roleId = parseInt(value.replace('role-', ''), 10);
  if (isNaN(roleId)) {
    return {};
  }

  if (field === 'responsible' && entityType === 'task') {
    return operator === 'notEquals'
      ? { roleId: { not: roleId } }
      : { roleId: roleId };
  }
  // Requests haben keine roleId
}

return {};
```

**Status:**
- ✅ Korrekt implementiert
- Rollen werden NUR bei Tasks unterstützt
- Requests werden ignoriert (leeres Objekt zurück)

---

### 3. Seed.ts - Standardfilter erstellen

**Aktueller Code (Zeile 1649-1655):**
```typescript
if (table.id === 'requests-table') {
  // Requests: requestedBy = role ODER responsible = role
  conditions = [
    { column: 'requestedBy', operator: 'equals', value: `role-${role.id}` },
    { column: 'responsible', operator: 'equals', value: `role-${role.id}` }
  ];
  operators = ['OR'];
}
```

**Problem:**
- Erstellt Filter für Rollen bei Requests
- Diese Filter funktionieren nicht (Backend ignoriert Rollen bei Requests)

**Lösung:**
- Filter für Rollen bei Requests ENTFERNEN
- NUR Filter für Users bei Requests erstellen

---

**Aktueller Code (Zeile 1656-1662):**
```typescript
else if (table.id === 'worktracker-todos') {
  // ToDos: responsible = role
  conditions = [
    { column: 'responsible', operator: 'equals', value: `role-${role.id}` }
  ];
}
```

**Status:**
- ✅ Korrekt implementiert
- Filter für Rollen bei Tasks werden erstellt
- Sollte funktionieren

---

### 4. Frontend - FilterPane Spalten

**Requests.tsx (Zeile 1204-1212):**
```typescript
<FilterPane
  columns={[
    { id: 'title', label: t('requests.columns.title') },
    { id: 'type', label: t('requests.columns.type') },
    { id: 'requestedBy', label: t('requests.columns.requestedBy').replace(':', '') },
    { id: 'responsible', label: t('requests.columns.responsible').replace(':', '') },
    // ...
  ]}
/>
```

**Status:**
- ✅ Korrekt - Spalten sind vorhanden
- Problem ist in FilterRow.tsx (zeigt Rollen-Option an)

---

**Worktracker.tsx (Zeile 2170):**
```typescript
<FilterPane
  columns={[...availableColumns, ...filterOnlyColumns]}
  // ...
/>
```

**filterOnlyColumns (Zeile 297-300):**
```typescript
const filterOnlyColumns = useMemo(() => [
  { id: 'responsible', label: t('tasks.columns.responsible'), shortLabel: t('tasks.columns.responsible').substring(0, 3) },
  { id: 'qualityControl', label: t('tasks.columns.qualityControl'), shortLabel: t('tasks.columns.qualityControl').substring(0, 2) },
], [t]);
```

**Status:**
- ✅ Korrekt - `responsible` ist als separate Filter-Spalte vorhanden
- FilterRow sollte Rollen-Option anzeigen (funktioniert bereits)

---

## 📋 DETAILLIERTER FIX-PLAN

### Phase 1: FilterRow.tsx - Rollen-Dropdowns kontextabhängig machen

**Änderung 1.1: Rollen laden - Nur bei Tasks**

**Datei:** `frontend/src/components/FilterRow.tsx`  
**Zeile:** 126-173

**Aktueller Code:**
```typescript
// Rollen laden für requestedBy, responsible und responsibleAndQualityControl (nicht für qualityControl)
if (condition.column === 'requestedBy' || condition.column === 'responsible' || condition.column === 'responsibleAndQualityControl') {
  setLoadingRoles(true);
  // ... Rollen laden ...
}
```

**Neuer Code:**
```typescript
// Tabellen-Typ erkennen (wie bei Status-Dropdown)
const isRequestTable = columns.some(col => col.id === 'requestedBy' || col.id === 'createTodo');
const isTaskTable = columns.some(col => col.id === 'responsible' || col.id === 'qualityControl');

// Rollen laden NUR für Tasks, NICHT für Requests
// requestedBy: NUR bei Tasks (aber Tasks haben kein requestedBy, also nie)
// responsible: NUR bei Tasks
// responsibleAndQualityControl: NUR bei Tasks
if ((condition.column === 'responsible' || condition.column === 'responsibleAndQualityControl') && isTaskTable) {
  setLoadingRoles(true);
  try {
    const response = await axiosInstance.get('/roles');
    setRoles(response.data);
  } catch (error) {
    console.error('Fehler beim Laden der Rollen:', error);
  } finally {
    setLoadingRoles(false);
  }
}
```

**Begründung:**
- Requests unterstützen keine Rollen (nur User-IDs im Schema)
- Tasks unterstützen Rollen für `responsible` (haben `roleId` Feld)
- `requestedBy` ist nur bei Requests vorhanden (keine Rollen nötig)
- Reservations/TourBookings haben keine Rollen-Felder

**Performance-Impact:**
- ✅ Keine zusätzlichen API-Calls (Rollen werden nur geladen wenn nötig)
- ✅ Weniger Daten im State (nur relevante Rollen)
- ✅ Schnellere Filter-Initialisierung

---

**Änderung 1.2: Rollen-Dropdown rendern - Nur bei Tasks**

**Datei:** `frontend/src/components/FilterRow.tsx`  
**Zeile:** 253-290

**Aktueller Code:**
```typescript
// Für requestedBy, responsible und responsibleAndQualityControl ein Dropdown mit Benutzern und Rollen rendern
if (columnId === 'requestedBy' || columnId === 'responsible' || columnId === 'responsibleAndQualityControl') {
  return (
    <select>
      {/* Users */}
      {/* Roles */}
    </select>
  );
}
```

**Neuer Code:**
```typescript
// Tabellen-Typ erkennen
const isRequestTable = columns.some(col => col.id === 'requestedBy' || col.id === 'createTodo');
const isTaskTable = columns.some(col => col.id === 'responsible' || col.id === 'qualityControl');

// Für requestedBy, responsible und responsibleAndQualityControl ein Dropdown mit Benutzern und Rollen rendern
// ABER: requestedBy hat nur Users (bei Requests)
// responsible hat Users + Roles (bei Tasks), nur Users (bei Requests)
// responsibleAndQualityControl hat Users + Roles (bei Tasks)
if (columnId === 'requestedBy' || columnId === 'responsible' || columnId === 'responsibleAndQualityControl') {
  // Bestimme ob Rollen angezeigt werden sollen
  const showRoles = (columnId === 'responsible' || columnId === 'responsibleAndQualityControl') && isTaskTable;
  
  return (
    <select
      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      value={value as string || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={loadingUsers || (showRoles && loadingRoles)}
    >
      <option value="">{t('filter.row.pleaseSelect')}</option>
    
      {users.length > 0 && (
        <optgroup label={t('filter.row.groups.users')}>
          {users.map(user => (
            <option key={`user-${user.id}`} value={`user-${user.id}`}>
              {user.firstName} {user.lastName}
            </option>
          ))}
        </optgroup>
      )}
      
      {showRoles && roles.length > 0 && (
        <optgroup label={t('filter.row.groups.roles')}>
          {roles.map(role => (
            <option key={`role-${role.id}`} value={`role-${role.id}`}>
              {role.name}
            </option>
          ))}
        </optgroup>
      )}
      
      {(loadingUsers || (showRoles && loadingRoles)) && (
        <option value="" disabled>{t('filter.row.loadingData')}</option>
      )}
    </select>
  );
}
```

**Begründung:**
- `requestedBy`: Nur Users (bei Requests, keine Rollen)
- `responsible` bei Requests: Nur Users (keine Rollen)
- `responsible` bei Tasks: Users + Roles (haben `roleId` Feld)
- `responsibleAndQualityControl` bei Tasks: Users + Roles (kombinierte Spalte)
- Reservations/TourBookings: Keine Rollen-Felder

**Performance-Impact:**
- ✅ Weniger DOM-Elemente (nur relevante Optionen)
- ✅ Schnellere Render-Zeit
- ✅ Bessere User Experience (keine verwirrenden Optionen)

---

### Phase 2: Seed.ts - Rollen-Filter bei Requests entfernen

**Änderung 2.1: Filter für Rollen bei Requests entfernen**

**Datei:** `backend/prisma/seed.ts`  
**Zeile:** 1649-1655

**Aktueller Code:**
```typescript
if (table.id === 'requests-table') {
  // Requests: requestedBy = role ODER responsible = role
  conditions = [
    { column: 'requestedBy', operator: 'equals', value: `role-${role.id}` },
    { column: 'responsible', operator: 'equals', value: `role-${role.id}` }
  ];
  operators = ['OR'];
}
```

**Neuer Code:**
```typescript
if (table.id === 'requests-table') {
  // Requests: KEINE Rollen-Filter (Requests unterstützen keine Rollen)
  // Überspringe Rollen-Filter für Requests
  continue; // Oder: return; oder: conditions = []; operators = [];
}
```

**ODER besser:**
```typescript
if (table.id === 'requests-table') {
  // Requests unterstützen keine Rollen - überspringe Rollen-Filter
  // Nur User-Filter werden erstellt (siehe Zeile 1705-1711)
  continue;
} else if (table.id === 'worktracker-todos') {
  // ToDos: responsible = role
  conditions = [
    { column: 'responsible', operator: 'equals', value: `role-${role.id}` }
  ];
  operators = [];
}
```

**Begründung:**
- Requests unterstützen keine Rollen (nur User-IDs im Schema)
- Filter für Rollen bei Requests funktionieren nicht (Backend ignoriert sie)
- Nur User-Filter sollten bei Requests erstellt werden
- Performance: Weniger Filter = schnellere Seed-Zeit

**Performance-Impact:**
- ✅ Weniger Filter in Datenbank
- ✅ Schnellere Filter-Ladezeit (weniger Filter zum Durchsuchen)
- ✅ Weniger Speicherplatz

---

### Phase 3: Bestehende Rollen-Filter bei Requests löschen (optional)

**Option A: Migration-Script erstellen**
- Alle gespeicherten Filter mit `role-{id}` bei `requests-table` löschen
- Alle Filter-Gruppen "Roles" bei `requests-table` löschen

**Option B: Manuell löschen**
- Benutzer können bestehende Rollen-Filter manuell löschen

**Empfehlung:**
- Option A (Migration-Script) für saubere Datenbank
- Kann in Seed integriert werden

---

## ✅ ERWARTETE VERBESSERUNGEN

### Vorher:
- ❌ Requests: Rollen-Filter werden angezeigt, funktionieren aber nicht
- ❌ Requests: Seed erstellt Rollen-Filter, die nicht funktionieren
- ❓ Tasks: Rollen-Filter sollten funktionieren (muss getestet werden)

### Nachher:
- ✅ Requests: Nur User-Filter werden angezeigt
- ✅ Requests: Seed erstellt keine Rollen-Filter mehr
- ✅ Tasks: Rollen-Filter werden angezeigt und funktionieren
- ✅ Tasks: Seed erstellt Rollen-Filter (wie bisher)

---

## 🧪 TESTS

### Test 1: Requests - Rollen-Filter entfernt
1. Öffne Requests-Seite
2. Öffne Filter-Pane
3. Wähle Spalte "De" (requestedBy)
4. Prüfe: Nur Users werden angezeigt, KEINE Rollen
5. Wähle Spalte "Para" (responsible)
6. Prüfe: Nur Users werden angezeigt, KEINE Rollen

### Test 2: Tasks - Rollen-Filter vorhanden
1. Öffne Worktracker-Seite (ToDos Tab)
2. Öffne Filter-Pane
3. Wähle Spalte "Verantwortlich" (responsible)
4. Prüfe: Users UND Rollen werden angezeigt
5. Wähle eine Rolle
6. Prüfe: Filter funktioniert, zeigt Tasks für diese Rolle

### Test 3: Seed - Keine Rollen-Filter bei Requests
1. Führe Seed aus
2. Prüfe Datenbank: Keine Filter mit `role-{id}` bei `requests-table`
3. Prüfe Datenbank: Filter-Gruppe "Roles" existiert NUR bei `worktracker-todos`

### Test 4: Bestehende Rollen-Filter bei Requests
1. Prüfe: Bestehende Rollen-Filter bei Requests werden entfernt (wenn Migration-Script)
2. Oder: Benutzer können manuell löschen

---

## 📝 IMPLEMENTIERUNGSREIHENFOLGE

### Phase 1: FilterRow.tsx
1. ✅ Rollen laden - Nur bei Tasks (Änderung 1.1)
2. ✅ Rollen-Dropdown rendern - Nur bei Tasks (Änderung 1.2)

### Phase 2: Seed.ts
1. ✅ Rollen-Filter bei Requests entfernen (Änderung 2.1)

### Phase 3: Migration (optional)
1. ✅ Bestehende Rollen-Filter bei Requests löschen

---

## ⚠️ WICHTIGE HINWEISE

### 1. Tabellen-Erkennung
- FilterRow erkennt Tabellen-Typ über `columns` Array
- `isRequestTable = columns.some(col => col.id === 'requestedBy' || col.id === 'createTodo')`
- `isTaskTable = columns.some(col => col.id === 'responsible' || col.id === 'qualityControl')`
- Reservations: `columns.some(col => col.id === 'guestName' || col.id === 'checkInDate')`
- TourBookings: `columns.some(col => col.id === 'bookedBy' || col.id === 'tourDate')`

### 2. Backend-Unterstützung
- Backend ignoriert bereits Rollen bei Requests (gibt leeres Objekt zurück, Zeile 260)
- Backend unterstützt Rollen bei Tasks (korrekt implementiert, Zeile 255-259)
- Backend unterstützt Rollen bei Tours (`createdBy` mit Rollen möglich?)
- Backend unterstützt KEINE Rollen bei TourBookings (`bookedBy` nur User)
- Keine Backend-Änderungen nötig für Requests/Tasks

### 3. Bestehende Filter
- Bestehende Rollen-Filter bei Requests funktionieren nicht
- Sollten entfernt werden (Migration-Script oder manuell)
- Performance: Weniger Filter = schnellere Filter-Ladezeit

### 4. Performance-Aspekte
- ✅ Rollen werden nur geladen wenn nötig (nicht bei Requests)
- ✅ Weniger API-Calls (`/roles` nur bei Tasks)
- ✅ Weniger DOM-Elemente (nur relevante Optionen)
- ✅ Filter-Caching bleibt erhalten (5 Minuten TTL)
- ✅ Server-seitiges Filtering bleibt erhalten (keine doppelte Filterung)

### 5. Worktracker.tsx - Tabs
- **Todos Tab:** Tasks - Rollen-Filter für `responsible` ✅
- **Reservations Tab:** Reservations - KEINE Rollen-Filter ✅
- **TourBookings Tab:** TourBookings - KEINE Rollen-Filter ✅
- FilterRow muss korrekt zwischen Tabs unterscheiden können

---

**Erstellt:** 2025-01-29  
**Status:** 📋 ANALYSE ABGESCHLOSSEN - Wartet auf Zustimmung  
**Nächster Schritt:** Zustimmung einholen, dann Phase 1 umsetzen

