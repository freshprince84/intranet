# Implementierungsplan: Filter-Gruppierung per Drag & Drop

## Übersicht

Erweiterung des Filtersystems um die Möglichkeit, Filter-Tags per Drag & Drop zu gruppieren. Gruppierte Filter werden als ein Dropdown-Tag dargestellt, das die einzelnen Filter der Gruppe enthält.

## Anforderungen

1. **Drag & Drop Funktionalität**
   - Filter-Tags können aufeinander gezogen werden
   - Beim Loslassen werden die Filter in einer Gruppe zusammengefasst
   - Visuelles Feedback während des Drag & Drop

2. **Gruppierte Filter als Dropdown**
   - Gruppierte Filter werden als ein Tag dargestellt
   - Das Tag zeigt die Anzahl der Filter in der Gruppe (z.B. "Gruppe (3)")
   - Beim Klick öffnet sich ein Dropdown mit allen Filtern der Gruppe
   - Aus dem Dropdown kann ein einzelner Filter ausgewählt werden

3. **Gruppen-Management**
   - Gruppen können umbenannt werden
   - Filter können aus Gruppen entfernt werden
   - Gruppen können aufgelöst werden (Filter werden wieder einzeln angezeigt)

## Datenmodell-Erweiterung

### Option 1: Neues FilterGroup-Modell (Empfohlen)

```prisma
model FilterGroup {
  id         Int      @id @default(autoincrement())
  userId     Int
  tableId    String
  name       String   // Name der Gruppe (z.B. "Meine Filter", "Wichtige Filter")
  order      Int      @default(0) // Reihenfolge der Gruppen
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  user       User     @relation(fields: [userId], references: [id])
  filters    SavedFilter[] // Filter in dieser Gruppe

  @@unique([userId, tableId, name])
}

model SavedFilter {
  id         Int      @id @default(autoincrement())
  userId     Int
  tableId    String
  name       String
  conditions String
  operators  String
  groupId    Int?     // Optional: Zugehörigkeit zu einer Gruppe
  order      Int      @default(0) // Reihenfolge innerhalb der Gruppe
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  user       User     @relation(fields: [userId], references: [id])
  group      FilterGroup? @relation(fields: [groupId], references: [id])

  @@unique([userId, tableId, name])
}
```

### Option 2: Erweiterung von SavedFilter (Einfacher)

```prisma
model SavedFilter {
  id         Int      @id @default(autoincrement())
  userId     Int
  tableId    String
  name       String
  conditions String
  operators  String
  groupId    Int?     // Optional: ID der Gruppe (self-referencing)
  groupName  String?  // Optional: Name der Gruppe
  order      Int      @default(0) // Reihenfolge innerhalb der Gruppe
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  user       User     @relation(fields: [userId], references: [id])

  @@unique([userId, tableId, name])
}
```

**Empfehlung:** Option 1 (FilterGroup-Modell) für bessere Datenstruktur und Erweiterbarkeit.

## Backend-Implementierung

### 1. Prisma Schema-Erweiterung

**Datei:** `backend/prisma/schema.prisma`

```prisma
model FilterGroup {
  id         Int      @id @default(autoincrement())
  userId     Int
  tableId    String
  name       String
  order      Int      @default(0)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  user       User     @relation(fields: [userId], references: [id])
  filters    SavedFilter[]

  @@unique([userId, tableId, name])
}

model SavedFilter {
  id         Int      @id @default(autoincrement())
  userId     Int
  tableId    String
  name       String
  conditions String
  operators  String
  groupId    Int?
  order      Int      @default(0)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  user       User     @relation(fields: [userId], references: [id])
  group      FilterGroup? @relation(fields: [groupId], references: [id])

  @@unique([userId, tableId, name])
}

model User {
  // ... bestehende Felder
  filterGroups FilterGroup[]
  savedFilters SavedFilter[]
}
```

### 2. Migration erstellen

```bash
npx prisma migrate dev --name add_filter_groups
```

### 3. Controller erweitern

**Datei:** `backend/src/controllers/savedFilterController.ts`

Neue Funktionen:
- `createFilterGroup(userId, tableId, name)` - Erstelle eine neue Gruppe
- `addFilterToGroup(filterId, groupId)` - Füge Filter zu Gruppe hinzu
- `removeFilterFromGroup(filterId)` - Entferne Filter aus Gruppe
- `updateFilterGroup(groupId, name)` - Benenne Gruppe um
- `deleteFilterGroup(groupId)` - Lösche Gruppe (Filter werden einzeln)
- `getFilterGroups(userId, tableId)` - Hole alle Gruppen für eine Tabelle

### 4. Routes erweitern

**Datei:** `backend/src/routes/savedFilters.ts`

```typescript
// Filter-Gruppen
router.post('/groups', authenticateToken, savedFilterController.createFilterGroup);
router.get('/groups/:tableId', authenticateToken, savedFilterController.getFilterGroups);
router.put('/groups/:id', authenticateToken, savedFilterController.updateFilterGroup);
router.delete('/groups/:id', authenticateToken, savedFilterController.deleteFilterGroup);

// Filter zu Gruppe hinzufügen/entfernen
router.post('/:filterId/group/:groupId', authenticateToken, savedFilterController.addFilterToGroup);
router.delete('/:filterId/group', authenticateToken, savedFilterController.removeFilterFromGroup);
```

## Frontend-Implementierung

### 1. Interface-Erweiterungen

**Datei:** `frontend/src/components/SavedFilterTags.tsx`

```typescript
interface FilterGroup {
  id: number;
  name: string;
  tableId: string;
  order: number;
  filters: SavedFilter[];
  createdAt: string;
  updatedAt: string;
}

interface SavedFilter {
  id: number;
  name: string;
  tableId: string;
  conditions: FilterCondition[];
  operators: ('AND' | 'OR')[];
  groupId?: number | null;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}
```

### 2. Drag & Drop Funktionalität

**Komponenten:**
- `draggedFilterId`: State für den gerade gezogenen Filter
- `dragOverFilterId`: State für den Filter, über den gezogen wird
- `dragOverGroupId`: State für die Gruppe, über die gezogen wird

**Event-Handler:**
```typescript
const handleDragStart = (e: React.DragEvent, filterId: number) => {
  e.dataTransfer.effectAllowed = 'move';
  setDraggedFilterId(filterId);
};

const handleDragOver = (e: React.DragEvent, targetId: number | 'new-group', type: 'filter' | 'group') => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  if (type === 'filter') {
    setDragOverFilterId(targetId as number);
  } else {
    setDragOverGroupId(targetId === 'new-group' ? 'new-group' : targetId as number);
  }
};

const handleDrop = async (e: React.DragEvent, targetId: number | 'new-group', type: 'filter' | 'group') => {
  e.preventDefault();
  
  if (!draggedFilterId) return;
  
  if (type === 'filter') {
    // Filter auf Filter gezogen -> Neue Gruppe erstellen
    if (targetId === 'new-group') {
      // Erstelle neue Gruppe mit beiden Filtern
      await createGroupWithFilters([draggedFilterId, targetId as number]);
    } else {
      // Füge Filter zu bestehender Gruppe hinzu
      await addFilterToGroup(draggedFilterId, targetId as number);
    }
  } else {
    // Filter auf Gruppe gezogen -> Zu Gruppe hinzufügen
    await addFilterToGroup(draggedFilterId, targetId as number);
  }
  
  // Reset States
  setDraggedFilterId(null);
  setDragOverFilterId(null);
  setDragOverGroupId(null);
};
```

### 3. UI-Komponenten

#### Gruppiertes Filter-Tag (Dropdown)

```tsx
<div className="relative">
  <button
    onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
    className="flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700 hover:bg-purple-200 dark:hover:bg-purple-800"
  >
    <span>{group.name} ({group.filters.length})</span>
    <ChevronDownIcon className={`h-4 w-4 ml-1 transition-transform ${isGroupDropdownOpen ? 'rotate-180' : ''}`} />
  </button>
  
  {isGroupDropdownOpen && (
    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[200px]">
      {group.filters.map(filter => (
        <div
          key={filter.id}
          onClick={() => {
            handleSelectFilter(filter);
            setIsGroupDropdownOpen(false);
          }}
          className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isStandardFilter(filter.name) ? 'font-bold' : ''
          }`}
        >
          {translateFilterName(filter.name)}
        </div>
      ))}
      <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
        <button
          onClick={() => handleUngroupFilters(group.id)}
          className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
        >
          Gruppe auflösen
        </button>
      </div>
    </div>
  )}
</div>
```

**Hinweis:** Standardfilter werden im Dropdown fett dargestellt (wie bei einzelnen Tags), bleiben aber weiterhin nicht löschbar.

#### Drag & Drop visuelles Feedback

```tsx
<div
  draggable={true} // Alle Filter können gezogen werden (auch Standardfilter)
  onDragStart={(e) => handleDragStart(e, filter.id)}
  onDragOver={(e) => handleDragOver(e, filter.id, 'filter')}
  onDrop={(e) => handleDrop(e, filter.id, 'filter')}
  className={`
    ${draggedFilterId === filter.id ? 'opacity-50' : ''}
    ${dragOverFilterId === filter.id ? 'ring-2 ring-blue-500' : ''}
  `}
>
  {/* Filter-Tag Inhalt */}
</div>
```

### 4. API-Client erweitern

**Datei:** `frontend/src/config/api.ts`

```typescript
export const API_ENDPOINTS = {
  // ... bestehende Endpoints
  SAVED_FILTERS: {
    // ... bestehende Endpoints
    GROUPS: {
      CREATE: '/api/saved-filters/groups',
      BY_TABLE: (tableId: string) => `/api/saved-filters/groups/${tableId}`,
      UPDATE: (groupId: number) => `/api/saved-filters/groups/${groupId}`,
      DELETE: (groupId: number) => `/api/saved-filters/groups/${groupId}`,
      ADD_FILTER: (filterId: number, groupId: number) => `/api/saved-filters/${filterId}/group/${groupId}`,
      REMOVE_FILTER: (filterId: number) => `/api/saved-filters/${filterId}/group`,
    }
  }
};
```

### 5. Standardfilter-Schutz in Gruppen

**Wichtig:** Auch wenn Standardfilter gruppiert werden können, müssen sie weiterhin geschützt werden:

```typescript
// In handleDeleteFilter - Standardfilter können nicht gelöscht werden, auch nicht aus Gruppen
const handleDeleteFilter = async (e: React.MouseEvent, filterId: number) => {
  e.stopPropagation();
  
  const filterToDelete = savedFilters.find(filter => filter.id === filterId);
  if (filterToDelete && isStandardFilter(filterToDelete.name)) {
    toast.error('Standard-Filter können nicht gelöscht werden');
    return;
  }
  
  // ... Rest der Lösch-Logik
};

// Beim Auflösen einer Gruppe: Standardfilter werden wieder einzeln angezeigt
const handleUngroupFilters = async (groupId: number) => {
  const group = filterGroups.find(g => g.id === groupId);
  if (!group) return;
  
  // Entferne alle Filter aus der Gruppe (setze groupId = null)
  for (const filter of group.filters) {
    await axiosInstance.delete(API_ENDPOINTS.SAVED_FILTERS.GROUPS.REMOVE_FILTER(filter.id));
  }
  
  // Lösche die Gruppe
  await axiosInstance.delete(API_ENDPOINTS.SAVED_FILTERS.GROUPS.DELETE(groupId));
  
  // Refresh Filter-Liste
  refreshFilters();
};
```

## Implementierungsschritte

### Phase 1: Backend-Grundlagen
1. ✅ Prisma Schema erweitern (FilterGroup-Modell)
2. ✅ Migration erstellen und ausführen
3. ✅ Controller-Funktionen implementieren
4. ✅ Routes erweitern
5. ✅ API-Endpunkte testen

### Phase 2: Frontend-Grundlagen
1. ✅ Interfaces erweitern
2. ✅ API-Client erweitern
3. ✅ Filter-Gruppen laden und anzeigen
4. ✅ Gruppierte Filter als Dropdown-Tag rendern

### Phase 3: Drag & Drop
1. ✅ Drag & Drop Event-Handler implementieren
2. ✅ Visuelles Feedback während Drag & Drop
3. ✅ Gruppen erstellen per Drag & Drop
4. ✅ Filter zu Gruppen hinzufügen per Drag & Drop

### Phase 4: Gruppen-Management
1. ✅ Gruppen umbenennen
2. ✅ Filter aus Gruppen entfernen
3. ✅ Gruppen auflösen
4. ✅ Reihenfolge von Gruppen/Filtern speichern

### Phase 5: UI-Verfeinerung
1. ✅ Responsive Design für Gruppen-Dropdowns
2. ✅ Animationen und Übergänge
3. ✅ Fehlerbehandlung
4. ✅ Loading States

## Besonderheiten

### Standardfilter
- Standardfilter (Aktuell, Archiv, etc.) können **auch** gruppiert werden
- Sie bleiben weiterhin nicht löschbar (auch wenn sie in einer Gruppe sind)
- Beim Auflösen einer Gruppe werden Standardfilter wieder einzeln angezeigt

### Gruppen-Reihenfolge
- Gruppen haben eine `order`-Eigenschaft
- Filter innerhalb von Gruppen haben ebenfalls eine `order`-Eigenschaft
- Beim Laden werden Filter nach Reihenfolge sortiert

### Migration bestehender Filter
- Bestehende Filter haben `groupId = null` und `order = 0`
- Sie bleiben einzeln sichtbar
- Können per Drag & Drop zu Gruppen hinzugefügt werden

## Offene Fragen

1. **Gruppen-Namen:** Sollen Gruppen automatisch benannt werden (z.B. "Gruppe 1", "Gruppe 2") oder soll der Benutzer einen Namen eingeben können?
   - **✅ Entscheidung:** Automatisch "Gruppe 1", "Gruppe 2", etc., aber umbenennbar

2. **Gruppen-Limit:** Soll es ein Limit geben, wie viele Filter in einer Gruppe sein können?
   - **✅ Entscheidung:** Kein Limit, aber UI sollte auch bei vielen Filtern gut funktionieren

3. **Standardfilter-Gruppierung:** Können Standardfilter gruppiert werden?
   - **✅ Entscheidung:** Ja, Standardfilter können auch gruppiert werden. Sie bleiben weiterhin nicht löschbar.

4. **Gruppen-Icon:** Soll ein spezielles Icon für Gruppen-Tags verwendet werden?
   - **✅ Empfehlung:** Nur ChevronDownIcon (konsistent mit bestehenden Dropdowns im System)
   - **Begründung:** 
     - Konsistent mit dem Dropdown-Pattern in `SavedFilterTags.tsx` (Zeile 516)
     - Klar erkennbar als Dropdown-Element
     - Die Lila-Farbe unterscheidet bereits visuell von normalen Filtern
     - Nicht überladen
   - **Alternative:** Kleines FolderIcon links + ChevronDownIcon rechts (nur wenn Gruppierung stärker betont werden soll)

5. **Gruppen-Farben:** Sollen Gruppen-Tags eine andere Farbe haben als normale Filter?
   - **✅ Entscheidung:** Lila/Purple für Gruppen (wie im Beispiel oben)
   - **Farben:** 
     - `bg-purple-100 dark:bg-purple-900/30`
     - `text-purple-800 dark:text-purple-300`
     - `border-purple-300 dark:border-purple-700`
     - `hover:bg-purple-200 dark:hover:bg-purple-800`

## Testing

- Unit Tests für Backend-Controller
- Integration Tests für API-Endpunkte
- Frontend-Tests für Drag & Drop Funktionalität
- E2E Tests für kompletten Workflow

## Dokumentation

- API-Dokumentation erweitern
- Benutzerhandbuch aktualisieren
- Design-Standards erweitern (Gruppen-Tags)

