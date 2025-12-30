# Filter-Berechtigungen Integration - Implementierungsplan

**Datum:** 2025-01-31  
**Status:** 📋 PLANUNG  
**Ziel:** Filter-System mit Berechtigungssystem verknüpfen - Filter basierend auf AccessLevel filtern

---

## 1. ANALYSE - AKTUELLER STAND

### 1.1 Berechtigungssystem

**AccessLevels:**
- `none` - Kein Zugriff
- `own_read` - Nur eigene Daten lesen
- `own_both` - Eigene Daten lesen und bearbeiten
- `all_read` - Alle Daten lesen
- `all_both` - Alle Daten lesen und bearbeiten

**Relevante Entities für Filter:**
- `requests` (box) - Ownership: `['requesterId', 'responsibleId']`
- `todos` (tab) - Ownership: `['responsibleId', 'qualityControlId']`
- `reservations` (tab) - Ownership: `['branchId']`

**Berechtigungsprüfung:**
- Backend: `checkPermission(entity, requiredAccess, entityType)` Middleware
- Frontend: `usePermissions()` Hook mit `getAccessLevel(entity, entityType)`

### 1.2 Filter-System - VOLLSTÄNDIGE ÜBERSICHT ALLER TABLE-IDs

**Backend:**
- API-Endpunkt: `GET /api/saved-filters/:tableId` → `getUserSavedFilters()` in `savedFilterController.ts`
- Service: `filterListCache.getFilters(userId, tableId)` in `filterListCache.ts`
- Lädt alle Filter für User + TableId aus DB

**Frontend:**
- `FilterContext` lädt Filter über `API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)`
- `SavedFilterTags` Komponente zeigt Filter als Tags an

### 1.3 ALLE TABLE-IDs MIT STANDARD-FILTERN UND FILTERGRUPPEN

#### ✅ KATEGORIE 1: MIT FILTERGRUPPEN "ROLLEN" + "BENUTZER" (Wird implementiert)

| Table-ID | Entity | EntityType | Standard-Filter | Filtergruppen | Status |
|----------|--------|------------|-----------------|---------------|--------|
| `worktracker-todos` | `todos` | `tab` | "Aktuell", "Archiv" | ✅ "Rollen" + "Benutzer" | ✅ **WIRD IMPLEMENTIERT** |
| `todo-analytics-table` | `task_analytics` | `tab` | "Alle" | ✅ "Rollen" + "Benutzer" | ✅ **WIRD IMPLEMENTIERT** |

#### ⚠️ KATEGORIE 2: MIT NUR "BENUTZER" FILTERGRUPPE (Muss besprochen werden)

| Table-ID | Entity | EntityType | Standard-Filter | Filtergruppen | Status |
|----------|--------|------------|-----------------|---------------|--------|
| `requests-table` | `requests` | `box` | "Aktuell", "Archiv" | ✅ "Benutzer" (KEINE "Rollen") | ⚠️ **MUSS BESPROCHEN WERDEN** |
| `request-analytics-table` | `request_analytics` | `tab` | "Alle" | ✅ "Benutzer" (KEINE "Rollen") | ⚠️ **MUSS BESPROCHEN WERDEN** |

#### ❓ KATEGORIE 3: OHNE FILTERGRUPPEN (Muss besprochen werden)

| Table-ID | Entity | EntityType | Standard-Filter | Filtergruppen | Status |
|----------|--------|------------|-----------------|---------------|--------|
| `worktracker-reservations` | `reservations` | `tab` | "Hoy", "Morgen", "Gestern" | ❌ Keine | ❓ **MUSS BESPROCHEN WERDEN** |
| `worktracker-tours` | `tour_bookings` | `tab` | "Aktuell" | ❌ Keine | ❓ **MUSS BESPROCHEN WERDEN** |
| `CEREBRO_ARTICLES` | `cerebro` | `page` | "Alle Artikel" | ❌ Keine | ❓ **MUSS BESPROCHEN WERDEN** |
| `password-manager-table` | `password_manager` | `tab` | "Alle Einträge" | ❌ Keine | ❓ **MUSS BESPROCHEN WERDEN** |
| `branches-table` | `branches` | `tab` | "Alle" | ❌ Keine | ❓ **MUSS BESPROCHEN WERDEN** |
| `roles-table` | `roles` | `tab` | "Alle" | ❌ Keine | ❓ **MUSS BESPROCHEN WERDEN** |
| `workcenter-table` | `working_times` | `tab` | "Aktive" | ❌ Keine | ❓ **MUSS BESPROCHEN WERDEN** |
| `join-requests-table` | `join_requests` | `tab` | "Alle" | ❌ Keine | ❓ **MUSS BESPROCHEN WERDEN** |
| `my-join-requests-table` | `join_requests` | `tab` | "Alle" | ❌ Keine | ❓ **MUSS BESPROCHEN WERDEN** |

### 1.4 Mapping Table-IDs zu Entities

```typescript
const TABLE_ID_TO_ENTITY: Record<string, { entity: string; entityType: 'box' | 'tab' }> = {
  'worktracker-todos': { entity: 'todos', entityType: 'tab' },
  'requests-table': { entity: 'requests', entityType: 'box' },
  'worktracker-reservations': { entity: 'reservations', entityType: 'tab' },
  'todo-analytics-table': { entity: 'task_analytics', entityType: 'tab' },
  'request-analytics-table': { entity: 'request_analytics', entityType: 'tab' },
};
```

---

## 2. ANFORDERUNGEN

### 2.1 Filter-Filterung basierend auf AccessLevel

**Regel 1: `none`**
- Keine Filter laden
- Keine Filter-Tags anzeigen
- `SavedFilterTags` Komponente komplett ausblenden

**Regel 2: `own_read` / `own_both`**
- Nur eigene Filter laden (Filter die der User selbst erstellt hat)
- Filtergruppe "Rollen": Nur Rollen-Filter anzeigen, die dem User zugewiesen sind (ALLE zugewiesenen Rollen, nicht nur aktive)
- Filtergruppe "Benutzer": NICHT anzeigen
- Standard-Filter ("Aktuell", "Archiv", etc.) anzeigen

**Regel 3: `all_read` / `all_both`**
- Alle Filter laden (wie bisher)
- Alle Filtergruppen anzeigen (wie bisher)

### 2.2 Rollen-Filterung bei `own_both`

**Anforderung:**
- Filtergruppe "Rollen" enthält nur Rollen-Filter, die dem User zugewiesen sind
- **WICHTIG:** Alle zugewiesenen Rollen, nicht nur die aktive Rolle
- Filter-Name entspricht Rollen-Name (z.B. "Hamburger", "User", etc.)

**Implementierung:**
- User hat mehrere Rollen über `UserRole` Tabelle
- Filter-Name muss mit Rollen-Name übereinstimmen
- Nur Filter anzeigen, deren Name einer zugewiesenen Rolle entspricht

---

## 3. IMPLEMENTIERUNGSPLAN

### Phase 1: Backend - Filter-Filterung im Controller

**Datei:** `backend/src/controllers/savedFilterController.ts`

**Änderungen:**

1. **`getUserSavedFilters` Funktion erweitern:**
   - AccessLevel für Table-Id prüfen
   - Bei `none`: Leeres Array zurückgeben
   - Bei `own_both`/`own_read`: Filter filtern
   - Bei `all_both`/`all_read`: Alle Filter zurückgeben (wie bisher)

2. **Neue Helper-Funktion: `getAccessLevelForTableId(userId, roleId, tableId)`**
   - Mapping Table-Id → Entity + EntityType
   - `checkUserPermission()` aufrufen
   - AccessLevel zurückgeben

3. **Neue Helper-Funktion: `filterFiltersByPermission(filters, filterGroups, accessLevel, userId, roleId)`**
   - Bei `own_both`/`own_read`:
     - Nur eigene Filter behalten (`filter.userId === userId`)
     - Filtergruppe "Rollen": Nur Filter, deren Name einer zugewiesenen Rolle entspricht
     - Filtergruppe "Benutzer": Komplett entfernen
   - Bei `all_both`/`all_read`: Alle Filter behalten

4. **Neue Helper-Funktion: `getUserAssignedRoleNames(userId)`**
   - Lädt alle Rollen, die dem User zugewiesen sind (über `UserRole`)
   - Gibt Array von Rollen-Namen zurück

**Code-Struktur:**

```typescript
// Mapping Table-Id zu Entity
const TABLE_ID_TO_ENTITY: Record<string, { entity: string; entityType: 'box' | 'tab' }> = {
  'worktracker-todos': { entity: 'todos', entityType: 'tab' },
  'requests-table': { entity: 'requests', entityType: 'box' },
  'worktracker-reservations': { entity: 'reservations', entityType: 'tab' },
  'todo-analytics-table': { entity: 'task_analytics', entityType: 'tab' },
  'request-analytics-table': { entity: 'request_analytics', entityType: 'tab' },
};

// Helper: AccessLevel für Table-Id ermitteln
async function getAccessLevelForTableId(
  userId: number, 
  roleId: number, 
  tableId: string
): Promise<AccessLevel> {
  const mapping = TABLE_ID_TO_ENTITY[tableId];
  if (!mapping) {
    // Unbekannte Table-Id → Standard: all_both (für Abwärtskompatibilität)
    return 'all_both';
  }
  
  const { checkUserPermission } = require('../middleware/permissionMiddleware');
  const hasRead = await checkUserPermission(userId, roleId, mapping.entity, 'read', mapping.entityType);
  const hasWrite = await checkUserPermission(userId, roleId, mapping.entity, 'write', mapping.entityType);
  
  if (!hasRead) return 'none';
  if (hasWrite) {
    // Prüfe ob all_both oder own_both
    // TODO: Implementierung basierend auf Permission-DB
  }
  return 'own_read'; // Fallback
}

// Helper: Filter nach Berechtigung filtern
async function filterFiltersByPermission(
  filters: SavedFilter[],
  filterGroups: FilterGroup[],
  accessLevel: AccessLevel,
  userId: number
): Promise<{ filters: SavedFilter[]; groups: FilterGroup[] }> {
  if (accessLevel === 'none') {
    return { filters: [], groups: [] };
  }
  
  if (accessLevel === 'all_both' || accessLevel === 'all_read') {
    return { filters, groups: filterGroups };
  }
  
  // own_both / own_read
  // 1. Nur eigene Filter behalten
  const ownFilters = filters.filter(f => f.userId === userId);
  
  // 2. Filtergruppe "Rollen": Nur zugewiesene Rollen
  const userRoleNames = await getUserAssignedRoleNames(userId);
  const filteredGroups = filterGroups.map(group => {
    if (group.name === 'Rollen' || group.name === 'Benutzer' || group.name === 'Usuarios') {
      if (group.name === 'Rollen' || group.name === 'Rollen') {
        // Nur Filter, deren Name einer zugewiesenen Rolle entspricht
        const filteredFilters = group.filters.filter(filter => 
          userRoleNames.includes(filter.name)
        );
        return { ...group, filters: filteredFilters };
      } else {
        // Filtergruppe "Benutzer": Komplett entfernen
        return null;
      }
    }
    return group;
  }).filter(g => g !== null) as FilterGroup[];
  
  return { filters: ownFilters, groups: filteredGroups };
}
```

**WICHTIG:** `getAccessLevelForTableId` muss das tatsächliche AccessLevel aus der Permission-DB lesen, nicht nur `checkUserPermission` verwenden.

### Phase 2: Backend - AccessLevel aus Permission-DB lesen

**Problem:** `checkUserPermission` gibt nur `true/false` zurück, nicht das AccessLevel.

**Lösung:** Direkt aus Permission-DB lesen:

```typescript
async function getAccessLevelForTableId(
  userId: number, 
  roleId: number, 
  tableId: string
): Promise<AccessLevel> {
  const mapping = TABLE_ID_TO_ENTITY[tableId];
  if (!mapping) {
    return 'all_both'; // Fallback für unbekannte Table-Ids
  }
  
  // Lade User und aktive Rolle
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        where: { roleId },
        include: { role: { include: { permissions: true } } }
      }
    }
  });
  
  if (!user || !user.roles[0]) {
    return 'none';
  }
  
  const role = user.roles[0].role;
  
  // Prüfe ob Admin (alle Permissions = all_both)
  const isAdmin = role.permissions.some(p => 
    p.entity === 'organization_management' && 
    p.entityType === 'page' && 
    (p.accessLevel === 'all_both' || p.accessLevel === 'both')
  );
  
  if (isAdmin) {
    return 'all_both';
  }
  
  // Suche Permission für Entity
  const permission = role.permissions.find(p => 
    p.entity === mapping.entity && 
    p.entityType === mapping.entityType
  );
  
  if (!permission) {
    return 'none';
  }
  
  // Konvertiere Legacy-Format
  return convertLegacyAccessLevel(permission.accessLevel);
}
```

### Phase 3: Backend - Filtergruppen-Filterung

**Datei:** `backend/src/services/filterListCache.ts`

**Änderungen:**

1. **`getFilterGroups` Funktion erweitern:**
   - AccessLevel als Parameter hinzufügen
   - Bei `own_both`/`own_read`:
     - Filtergruppe "Rollen": Nur Filter mit zugewiesenen Rollen
     - Filtergruppe "Benutzer": Komplett entfernen

2. **Neue Helper-Funktion in `filterListCache.ts`:**
   - `filterGroupsByPermission(groups, accessLevel, userId)`

**WICHTIG:** Filtergruppen-Filterung muss auch im Cache-Service erfolgen, da `getFilterGroups` direkt aufgerufen wird.

### Phase 4: Frontend - SavedFilterTags Komponente

**Datei:** `frontend/src/components/SavedFilterTags.tsx`

**Änderungen:**

1. **AccessLevel prüfen:**
   - `usePermissions()` Hook verwenden
   - Table-Id → Entity + EntityType mappen
   - `getAccessLevel(entity, entityType)` aufrufen

2. **Bei `none`:**
   - Komponente komplett ausblenden (`return null`)

3. **Bei `own_both`/`own_read`:**
   - Filter werden bereits vom Backend gefiltert
   - Filtergruppe "Benutzer" sollte nicht angezeigt werden (wird vom Backend entfernt)

**Code-Struktur:**

```typescript
const SavedFilterTags: React.FC<SavedFilterTagsProps> = ({ tableId, ... }) => {
  const { getAccessLevel } = usePermissions();
  
  // Mapping Table-Id zu Entity
  const TABLE_ID_TO_ENTITY: Record<string, { entity: string; entityType: 'box' | 'tab' }> = {
    'worktracker-todos': { entity: 'todos', entityType: 'tab' },
    'requests-table': { entity: 'requests', entityType: 'box' },
    'worktracker-reservations': { entity: 'reservations', entityType: 'tab' },
    'todo-analytics-table': { entity: 'task_analytics', entityType: 'tab' },
    'request-analytics-table': { entity: 'request_analytics', entityType: 'tab' },
  };
  
  const mapping = TABLE_ID_TO_ENTITY[tableId];
  const accessLevel = mapping ? getAccessLevel(mapping.entity, mapping.entityType) : 'all_both';
  
  // Bei none: Komponente ausblenden
  if (accessLevel === 'none') {
    return null;
  }
  
  // Rest der Komponente wie bisher
  // ...
};
```

### Phase 5: Frontend - FilterContext (Optional)

**Datei:** `frontend/src/contexts/FilterContext.tsx`

**Änderungen:**

1. **Optional:** Filter-Filterung im Frontend (zusätzliche Sicherheit)
   - Bei `own_both`/`own_read`: Filter nochmal filtern
   - **HINWEIS:** Backend-Filterung ist ausreichend, Frontend-Filterung ist nur zusätzliche Sicherheit

**WICHTIG:** Backend-Filterung hat Priorität. Frontend-Filterung ist optional.

---

## 4. IMPLEMENTIERUNGS-SCHRITTE

### Schritt 1: Backend - Helper-Funktionen erstellen

1. `getAccessLevelForTableId()` in `savedFilterController.ts`
2. `getUserAssignedRoleNames()` in `savedFilterController.ts`
3. `filterFiltersByPermission()` in `savedFilterController.ts`
4. `TABLE_ID_TO_ENTITY` Mapping definieren

### Schritt 2: Backend - `getUserSavedFilters` erweitern

1. AccessLevel für Table-Id ermitteln
2. Filter und Filtergruppen filtern
3. Gefilterte Daten zurückgeben

### Schritt 3: Backend - `getFilterGroups` erweitern

1. AccessLevel als Parameter hinzufügen
2. Filtergruppen filtern
3. Gefilterte Gruppen zurückgeben

### Schritt 4: Frontend - `SavedFilterTags` erweitern

1. AccessLevel prüfen
2. Bei `none`: Komponente ausblenden
3. Mapping Table-Id → Entity implementieren

### Schritt 5: Testing

1. Test mit `none` → Keine Filter
2. Test mit `own_both` → Nur eigene Filter + zugewiesene Rollen
3. Test mit `all_both` → Alle Filter

---

## 5. WICHTIGE HINWEISE

### 5.1 Rollen-Filterung

**WICHTIG:** Bei `own_both`/`own_read`:
- Filtergruppe "Rollen" enthält nur Filter, deren Name einer **zugewiesenen Rolle** entspricht
- **ALLE zugewiesenen Rollen**, nicht nur die aktive Rolle
- Filter-Name muss exakt mit Rollen-Name übereinstimmen

### 5.2 Standard-Filter

**Standard-Filter bleiben immer sichtbar:**
- "Aktuell", "Archiv", "Hoy", "Morgen", "Gestern", etc.
- Diese Filter werden nicht gefiltert (außer bei `none`)

### 5.3 Abwärtskompatibilität

**Unbekannte Table-Ids:**
- Fallback: `all_both` (alle Filter anzeigen)
- Verhindert, dass bestehende Funktionen brechen

### 5.4 Performance

**Caching:**
- AccessLevel-Prüfung sollte gecacht werden
- Filter-Filterung sollte im Cache-Service erfolgen
- `filterListCache` sollte gefilterte Daten cachen

---

## 6. TESTING-CHECKLISTE

- [ ] `none` → Keine Filter geladen, `SavedFilterTags` ausgeblendet
- [ ] `own_both` → Nur eigene Filter, Filtergruppe "Rollen" nur mit zugewiesenen Rollen, Filtergruppe "Benutzer" ausgeblendet
- [ ] `own_read` → Wie `own_both`
- [ ] `all_both` → Alle Filter wie bisher
- [ ] `all_read` → Alle Filter wie bisher
- [ ] Standard-Filter ("Aktuell", "Archiv") bleiben immer sichtbar (außer bei `none`)
- [ ] Filtergruppe "Rollen" zeigt nur zugewiesene Rollen (alle, nicht nur aktive)
- [ ] Filtergruppe "Benutzer" wird bei `own_both`/`own_read` ausgeblendet
- [ ] Unbekannte Table-Ids → Fallback `all_both`

---

## 7. OFFENE FRAGEN

1. **Sollen Standard-Filter auch bei `none` ausgeblendet werden?**
   - Aktuell: Ja (keine Filter bei `none`)
   - **Entscheidung:** Standard-Filter bei `none` ausblenden

2. **Wie werden benutzerdefinierte Filter behandelt?**
   - Bei `own_both`: Nur eigene Filter (Filter die User selbst erstellt hat)
   - **Entscheidung:** Korrekt

3. **Soll Frontend-Filterung zusätzlich implementiert werden?**
   - Backend-Filterung ist ausreichend
   - Frontend-Filterung ist nur zusätzliche Sicherheit
   - **Entscheidung:** Nur Backend-Filterung (Frontend optional)

---

## 8. ZUSAMMENFASSUNG - IMPLEMENTIERUNGSBEREICH

### 8.1 Wird implementiert (nur diese Table-IDs)

**✅ KATEGORIE 1: MIT FILTERGRUPPEN "ROLLEN" + "BENUTZER"**

Diese Table-IDs werden **VOLLSTÄNDIG** implementiert (Filter-Filterung basierend auf AccessLevel):

1. **`worktracker-todos`** (Entity: `todos`, EntityType: `tab`)
   - Standard-Filter: "Aktuell", "Archiv"
   - Filtergruppen: ✅ "Rollen" + "Benutzer"
   - **Implementierung:** ✅ Filter-Filterung bei `own_both`/`own_read`

2. **`todo-analytics-table`** (Entity: `task_analytics`, EntityType: `tab`)
   - Standard-Filter: "Alle"
   - Filtergruppen: ✅ "Rollen" + "Benutzer"
   - **Implementierung:** ✅ Filter-Filterung bei `own_both`/`own_read`

### 8.2 Muss besprochen werden (diese Table-IDs werden NICHT implementiert)

**⚠️ KATEGORIE 2: MIT NUR "BENUTZER" FILTERGRUPPE**

Diese Table-IDs haben nur "Benutzer"-Filtergruppe, keine "Rollen"-Filtergruppe:

1. **`requests-table`** (Entity: `requests`, EntityType: `box`)
   - Standard-Filter: "Aktuell", "Archiv"
   - Filtergruppen: ✅ "Benutzer" (KEINE "Rollen")
   - **Frage:** Soll bei `own_both`/`own_read` die "Benutzer"-Filtergruppe ausgeblendet werden?

2. **`request-analytics-table`** (Entity: `request_analytics`, EntityType: `tab`)
   - Standard-Filter: "Alle"
   - Filtergruppen: ✅ "Benutzer" (KEINE "Rollen")
   - **Frage:** Soll bei `own_both`/`own_read` die "Benutzer"-Filtergruppe ausgeblendet werden?

**❓ KATEGORIE 3: OHNE FILTERGRUPPEN**

Diese Table-IDs haben keine Filtergruppen, nur Standard-Filter:

1. **`worktracker-reservations`** (Entity: `reservations`, EntityType: `tab`)
   - Standard-Filter: "Hoy", "Morgen", "Gestern"
   - Filtergruppen: ❌ Keine
   - **Frage:** Soll bei `none` keine Filter angezeigt werden? Bei `own_both` nur eigene Filter?

2. **`worktracker-tours`** (Entity: `tour_bookings`, EntityType: `tab`)
   - Standard-Filter: "Aktuell"
   - Filtergruppen: ❌ Keine
   - **Frage:** Soll bei `none` keine Filter angezeigt werden? Bei `own_both` nur eigene Filter?

3. **`CEREBRO_ARTICLES`** (Entity: `cerebro`, EntityType: `page`)
   - Standard-Filter: "Alle Artikel"
   - Filtergruppen: ❌ Keine
   - **Frage:** Soll bei `none` keine Filter angezeigt werden?

4. **`password-manager-table`** (Entity: `password_manager`, EntityType: `tab`)
   - Standard-Filter: "Alle Einträge"
   - Filtergruppen: ❌ Keine
   - **Frage:** Soll bei `none` keine Filter angezeigt werden? Bei `own_both` nur eigene Filter?

5. **`branches-table`** (Entity: `branches`, EntityType: `tab`)
   - Standard-Filter: "Alle"
   - Filtergruppen: ❌ Keine
   - **Frage:** Soll bei `none` keine Filter angezeigt werden?

6. **`roles-table`** (Entity: `roles`, EntityType: `tab`)
   - Standard-Filter: "Alle"
   - Filtergruppen: ❌ Keine
   - **Frage:** Soll bei `none` keine Filter angezeigt werden?

7. **`workcenter-table`** (Entity: `working_times`, EntityType: `tab`)
   - Standard-Filter: "Aktive"
   - Filtergruppen: ❌ Keine
   - **Frage:** Soll bei `none` keine Filter angezeigt werden? Bei `own_both` nur eigene Filter?

8. **`join-requests-table`** (Entity: `join_requests`, EntityType: `tab`)
   - Standard-Filter: "Alle"
   - Filtergruppen: ❌ Keine
   - **Frage:** Soll bei `none` keine Filter angezeigt werden?

9. **`my-join-requests-table`** (Entity: `join_requests`, EntityType: `tab`)
   - Standard-Filter: "Alle"
   - Filtergruppen: ❌ Keine
   - **Frage:** Soll bei `none` keine Filter angezeigt werden?

### 8.3 Entscheidungen für Kategorie 2 und 3

**Für jede Table-ID in Kategorie 2 und 3 muss entschieden werden:**

1. **Bei `none`:**
   - Sollen Filter komplett ausgeblendet werden? ✅ Ja (konsistent)
   - Oder nur Standard-Filter anzeigen? ❌ Nein (konsistent mit Kategorie 1)

2. **Bei `own_both`/`own_read`:**
   - Sollen nur eigene Filter angezeigt werden? (Filter die User selbst erstellt hat)
   - Sollen Standard-Filter immer angezeigt werden?
   - Sollen Filtergruppen ausgeblendet werden? (wenn vorhanden)

3. **Bei `all_both`/`all_read`:**
   - Alle Filter wie bisher anzeigen? ✅ Ja (konsistent)

---

**Erstellt:** 2025-01-31  
**Status:** 📋 PLANUNG - BEREIT FÜR IMPLEMENTIERUNG (nur Kategorie 1)  
**Offen:** Diskussion über Kategorie 2 und 3

