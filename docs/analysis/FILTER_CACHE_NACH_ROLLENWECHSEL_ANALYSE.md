# Filter-Cache nach Rollenwechsel - Problem-Analyse

**Datum:** 2025-01-31  
**Status:** 🔍 ANALYSE - PROBLEM IDENTIFIZIERT

---

## 1. PROBLEM

**Symptom:** Filter werden nach Rollenwechsel nicht sofort aktualisiert, sondern erst nach Neuladen der Seite und Löschen des Cache.

**Erwartetes Verhalten:** Filter sollten nach Rollenwechsel sofort aktualisiert werden, da sich das AccessLevel ändert.

---

## 2. ROOT CAUSE ANALYSE

### Problem 1: Backend-Cache wird nicht invalidiert

**Code-Stelle:** `backend/src/controllers/userController.ts` → `switchUserRole`

**Aktueller Code (Zeile 1526-1532):**
```typescript
// ✅ PERFORMANCE: Caches invalidieren bei Rollen-Wechsel
userCache.invalidate(userId);
const { organizationCache } = await import('../utils/organizationCache');
organizationCache.invalidate(userId);
// ✅ BranchCache invalidieren (Branch hat sich geändert)
const { branchCache } = await import('../services/branchCache');
branchCache.clear();
```

**Problem:**
- `filterListCache` wird NICHT invalidiert
- Beim Rollenwechsel ändert sich das `accessLevel`
- Der Cache-Key ist `${userId}:${tableId}:${accessLevel}`
- Alte Cache-Einträge (mit altem AccessLevel) bleiben bestehen
- Neue Cache-Einträge (mit neuem AccessLevel) werden erstellt
- ABER: Wenn das Frontend die API aufruft, könnte der Backend-Cache noch alte Daten zurückgeben (wenn der Cache-Key nicht korrekt ist)

**Lösung:**
- `filterListCache.invalidate(userId, tableId)` für alle relevanten Table-IDs aufrufen
- Oder: `filterListCache` für alle AccessLevel-Varianten invalidieren

### Problem 2: Frontend-Cache wird nicht invalidiert

**Code-Stelle:** `frontend/src/contexts/FilterContext.tsx` → `loadFilters`

**Aktueller Code (Zeile 98-103):**
```typescript
const loadFilters = useCallback(async (tableId: string): Promise<SavedFilter[]> => {
  // ✅ FIX: Prüfe nur auf Filter im State (Source of Truth)
  // Wenn bereits geladen, sofort zurückgeben
  if (filtersRef.current[tableId]) {
    return filtersRef.current[tableId];
  }
```

**Problem:**
- `FilterContext` cached Filter im Frontend-State (`filters[tableId]`)
- Beim Rollenwechsel wird `loadFilters` erneut aufgerufen (z.B. in `Worktracker.tsx` Zeile 1037)
- ABER: `loadFilters` prüft `filtersRef.current[tableId]` - wenn bereits vorhanden, wird sofort zurückgegeben
- **KEIN API-Call wird durchgeführt!**
- Die alten Filter (mit altem AccessLevel) werden zurückgegeben

**Code-Stelle:** `frontend/src/pages/Worktracker.tsx` → `useEffect` für Rollenwechsel

**Aktueller Code (Zeile 1024-1062):**
```typescript
// ✅ ROLLENWECHSEL: Reagiere auf Rollenwechsel und lade Tasks neu
useEffect(() => {
  // ...
  const reload = async () => {
    try {
      // 1. Filter laden (wartet auf State-Update)
      const filters = await loadFilters(TODOS_TABLE_ID);
      // ...
    }
  };
  reload();
}, [currentRole?.id, activeTab]);
```

**Problem:**
- `loadFilters` wird aufgerufen
- ABER: `FilterContext.loadFilters` gibt gecachte Filter zurück (ohne API-Call)
- Die alten Filter werden verwendet

**Lösung:**
- `FilterContext` muss beim Rollenwechsel alle Filter invalidieren
- Oder: `refreshFilters` muss aufgerufen werden statt `loadFilters`
- Oder: `FilterContext` muss auf Rollenwechsel reagieren und Cache löschen

### Problem 3: FilterContext reagiert nicht auf Rollenwechsel

**Code-Stelle:** `frontend/src/contexts/FilterContext.tsx`

**Problem:**
- `FilterContext` hat keine Dependency auf `user` oder `currentRole`
- Beim Rollenwechsel wird der Filter-Cache nicht automatisch invalidiert
- Komponenten müssen manuell `refreshFilters` aufrufen

**Lösung:**
- `FilterContext` muss auf Rollenwechsel reagieren
- Beim Rollenwechsel müssen alle Filter-Caches invalidiert werden
- Oder: `FilterContext` muss `user`/`currentRole` als Dependency haben

---

## 3. CODE-FLOW ANALYSE

### Aktueller Flow beim Rollenwechsel:

1. **User klickt auf Rolle** → `Header.tsx` → `handleRoleSwitch`
2. **Frontend:** `switchRole(roleId)` wird aufgerufen → `useAuth.tsx`
3. **Backend:** `PUT /api/users/switch-role` → `userController.ts` → `switchUserRole`
4. **Backend:** Caches werden invalidiert:
   - ✅ `userCache.invalidate(userId)`
   - ✅ `organizationCache.invalidate(userId)`
   - ✅ `branchCache.clear()`
   - ❌ `filterListCache` wird NICHT invalidiert
5. **Frontend:** User-State wird aktualisiert → `setUser(response.data)`
6. **Frontend:** Komponenten reagieren auf Rollenwechsel:
   - `Worktracker.tsx` → `useEffect` mit `currentRole?.id` Dependency
   - `loadFilters(TODOS_TABLE_ID)` wird aufgerufen
7. **Frontend:** `FilterContext.loadFilters`:
   - Prüft `filtersRef.current[tableId]`
   - Wenn vorhanden → gibt gecachte Filter zurück (KEIN API-Call)
   - Wenn nicht vorhanden → API-Call, aber Backend-Cache könnte alte Daten enthalten

### Erwarteter Flow:

1. **User klickt auf Rolle** → `Header.tsx` → `handleRoleSwitch`
2. **Frontend:** `switchRole(roleId)` wird aufgerufen
3. **Backend:** `PUT /api/users/switch-role` → `switchUserRole`
4. **Backend:** Caches werden invalidiert:
   - ✅ `userCache.invalidate(userId)`
   - ✅ `organizationCache.invalidate(userId)`
   - ✅ `branchCache.clear()`
   - ✅ `filterListCache.invalidate(userId, tableId)` für alle Table-IDs
5. **Frontend:** User-State wird aktualisiert
6. **Frontend:** `FilterContext` reagiert auf Rollenwechsel:
   - Alle Filter-Caches werden invalidiert
   - `filtersRef.current` wird geleert
7. **Frontend:** Komponenten laden Filter neu:
   - `loadFilters` wird aufgerufen
   - `FilterContext.loadFilters` macht API-Call (kein Cache-Hit)
   - Backend gibt gefilterte Filter zurück (mit neuem AccessLevel)

---

## 4. LÖSUNGSANSÄTZE

### Lösung 1: Backend-Cache invalidieren (MUSS)

**Änderung:** `backend/src/controllers/userController.ts` → `switchUserRole`

**Code-Änderung:**
```typescript
// ✅ PERFORMANCE: Caches invalidieren bei Rollen-Wechsel
userCache.invalidate(userId);
const { organizationCache } = await import('../utils/organizationCache');
organizationCache.invalidate(userId);
const { branchCache } = await import('../services/branchCache');
branchCache.clear();

// ✅ FILTER-BERECHTIGUNGEN: Filter-Cache invalidieren bei Rollenwechsel
const { filterListCache } = await import('../services/filterListCache');
// Invalidiere Filter-Cache für alle relevanten Table-IDs
const TABLE_IDS = [
  'worktracker-todos',
  'todo-analytics-table',
  'requests-table',
  'request-analytics-table',
  'worktracker-reservations',
  'join-requests-table',
  'CEREBRO_ARTICLES',
  'worktracker-tours',
  'password-manager-table',
  'my-join-requests-table',
  'branches-table',
  'roles-table',
  'workcenter-table'
];
TABLE_IDS.forEach(tableId => {
  filterListCache.invalidate(userId, tableId);
});
```

**Vorteil:**
- Backend-Cache wird invalidiert
- Beim nächsten API-Call werden neue Filter geladen (mit neuem AccessLevel)

**Nachteil:**
- Alle Table-IDs müssen manuell aufgelistet werden
- Oder: `filterListCache.invalidateAll(userId)` implementieren

### Lösung 2: Frontend-Cache invalidieren (MUSS)

**Option A: FilterContext reagiert auf Rollenwechsel**

**Änderung:** `frontend/src/contexts/FilterContext.tsx`

**Code-Änderung:**
```typescript
import { useAuth } from '../hooks/useAuth';

export const FilterProvider: React.FC<FilterProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const currentRoleId = user?.roles?.find(r => r.lastUsed)?.role?.id;
  const previousRoleIdRef = useRef<number | undefined>(currentRoleId);
  
  // ✅ ROLLENWECHSEL: Reagiere auf Rollenwechsel
  useEffect(() => {
    if (previousRoleIdRef.current !== undefined && previousRoleIdRef.current !== currentRoleId) {
      // Rollenwechsel erkannt - invalidiere alle Filter-Caches
      setFilters({});
      setFilterGroups({});
      filterCacheTimestamps.current = {};
      loadedTablesRef.current.clear();
      loadingPromises.current = {};
    }
    previousRoleIdRef.current = currentRoleId;
  }, [currentRoleId]);
  
  // ... Rest des Codes ...
};
```

**Vorteil:**
- Automatische Cache-Invalidierung beim Rollenwechsel
- Keine manuellen Aufrufe nötig

**Nachteil:**
- `FilterContext` hat Dependency auf `user`
- Möglicherweise Performance-Impact (bei jedem User-Update)

**Option B: Komponenten rufen refreshFilters auf**

**Änderung:** `frontend/src/pages/Worktracker.tsx` → `useEffect` für Rollenwechsel

**Code-Änderung:**
```typescript
// ✅ ROLLENWECHSEL: Reagiere auf Rollenwechsel und lade Tasks neu
useEffect(() => {
  // ...
  const reload = async () => {
    try {
      // 1. Filter-Cache invalidieren
      await refreshFilters(TODOS_TABLE_ID);
      
      // 2. Filter laden (wartet auf State-Update)
      const filters = await loadFilters(TODOS_TABLE_ID);
      // ...
    }
  };
  reload();
}, [currentRole?.id, activeTab, refreshFilters]);
```

**Vorteil:**
- Explizite Cache-Invalidierung
- Keine Dependency auf `user` in `FilterContext`

**Nachteil:**
- Muss in jeder Komponente implementiert werden
- Fehleranfällig (wird leicht vergessen)

### Lösung 3: Kombination (BESTE LÖSUNG)

**Beide Lösungen kombinieren:**
1. Backend-Cache invalidieren (Lösung 1)
2. Frontend-Cache invalidieren (Lösung 2, Option A)

**Vorteil:**
- Vollständige Cache-Invalidierung
- Automatisch und konsistent

---

## 5. IMPLEMENTIERUNGSPLAN

### Schritt 1: Backend-Cache invalidieren
- [ ] `filterListCache.invalidate(userId, tableId)` in `switchUserRole` hinzufügen
- [ ] Alle relevanten Table-IDs auflisten
- [ ] Oder: `filterListCache.invalidateAll(userId)` implementieren

### Schritt 2: Frontend-Cache invalidieren
- [ ] `FilterContext` erweitern um `useAuth` Dependency
- [ ] `useEffect` hinzufügen, der auf Rollenwechsel reagiert
- [ ] Alle Filter-Caches invalidieren beim Rollenwechsel

### Schritt 3: Testing
- [ ] Rollenwechsel testen
- [ ] Prüfen, ob Filter sofort aktualisiert werden
- [ ] Prüfen, ob keine doppelten API-Calls entstehen

---

## 6. ZUSAMMENFASSUNG

**Problem:**
- Backend-Cache wird beim Rollenwechsel nicht invalidiert
- Frontend-Cache wird beim Rollenwechsel nicht invalidiert
- Filter werden nicht sofort aktualisiert

**Lösung:**
1. Backend: `filterListCache.invalidate(userId, tableId)` in `switchUserRole` hinzufügen
2. Frontend: `FilterContext` erweitern um Rollenwechsel-Reaktion

**Erstellt:** 2025-01-31  
**Status:** 🔍 ANALYSE - PROBLEM IDENTIFIZIERT

