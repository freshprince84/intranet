# Infinite Scroll - Vollständiger Implementierungsplan

**Datum:** 2025-01-27  
**Status:** 🔴 KRITISCH - Muss umgesetzt werden  
**Zweck:** Infinite Scroll für alle Tabellen (Requests, ToDo's, Reservations, etc.)

---

## 🎯 ANFORDERUNGEN (STRENG)

### 1. KEINE Pagination
- ❌ **STRENG VERBOTEN:** `limit`/`offset` Parameter im Backend
- ❌ **STRENG VERBOTEN:** Pagination beim Laden der Daten
- ✅ **ERFORDERLICH:** Immer ALLE Ergebnisse laden (mit Filter wenn gesetzt)

### 2. Infinite Scroll nur für Anzeige
- ✅ **ERFORDERLICH:** Alle Daten werden geladen (Backend gibt alle zurück)
- ✅ **ERFORDERLICH:** Infinite Scroll nur für die Anzeige (nicht für das Laden)
- ✅ **ERFORDERLICH:** Initial: Nur erste 10-20 Items anzeigen
- ✅ **ERFORDERLICH:** Beim Scrollen: Weitere 10-20 Items anzeigen
- ✅ **ERFORDERLICH:** Automatisch beim Scrollen (kein "Mehr anzeigen" Button)

### 3. Filter: ALLE Ergebnisse müssen geladen werden
- ✅ **ERFORDERLICH:** Wenn Filter gesetzt: Backend filtert und gibt ALLE gefilterten Ergebnisse zurück
- ❌ **STRENG VERBOTEN:** Nur 20 Ergebnisse laden, dann weitere 20 beim Scrollen
- ❌ **STRENG VERBOTEN:** Client-seitige Filterung nach Pagination
- ✅ **ERFORDERLICH:** Filter wird server-seitig angewendet, dann ALLE gefilterten Ergebnisse geladen

### 4. Gilt für alle Tabellen
- ✅ Requests
- ✅ ToDo's (Tasks)
- ✅ Reservations
- ✅ Tours (falls vorhanden)
- ✅ TourBookings (falls vorhanden)
- ✅ Alle anderen Tabellen

---

## 📊 AKTUELLER ZUSTAND (Detaillierte Analyse)

### Tasks (ToDo's)

**Backend:** `backend/src/controllers/taskController.ts`
- ✅ Unterstützt `limit` und `offset` Parameter (Zeile 48-53)
- ✅ Filter werden server-seitig angewendet (Zeile 56-77)
- ❌ **PROBLEM:** Wenn `limit` gesetzt, werden nur `limit` Ergebnisse zurückgegeben
- ❌ **PROBLEM:** Bei Filter: Nur erste 20 gefilterten Ergebnisse, dann weitere 20 beim Scrollen

**Frontend:** `frontend/src/pages/Worktracker.tsx`
- ❌ **PROBLEM:** Lädt mit `limit: TASKS_PER_PAGE` (20) und `offset` (Zeile 597-601)
- ❌ **PROBLEM:** Infinite Scroll lädt weitere Seiten (Zeile 688-699)
- ❌ **PROBLEM:** Bei Filter: Nur erste 20 gefilterten Ergebnisse, dann weitere 20 beim Scrollen
- ✅ `displayLimit` existiert (Zeile 492), wird aber nicht für Tasks verwendet

**Aktueller Flow:**
1. User setzt Filter
2. Frontend: `loadTasks(filterId, ..., page=1)`
3. Backend: Filter anwenden, dann `limit=20, offset=0` → nur 20 Ergebnisse
4. Frontend: Zeigt 20 Ergebnisse
5. User scrollt → `loadMoreTasks()` → `loadTasks(..., page=2)`
6. Backend: Filter anwenden, dann `limit=20, offset=20` → weitere 20 Ergebnisse
7. **PROBLEM:** Wenn 1000 Ergebnisse den Filter matchen, werden nur 20+20+... geladen, nicht alle 1000!

---

### Requests

**Backend:** `backend/src/controllers/requestController.ts`
- ✅ Unterstützt `limit` und `offset` Parameter (Zeile 71-76)
- ✅ Filter werden server-seitig angewendet (Zeile 79-107)
- ❌ **PROBLEM:** Wenn `limit` gesetzt, werden nur `limit` Ergebnisse zurückgegeben
- ❌ **PROBLEM:** Bei Filter: Nur erste 20 gefilterten Ergebnisse, dann weitere 20 beim Scrollen

**Frontend:** `frontend/src/components/Requests.tsx`
- ❌ **PROBLEM:** Lädt mit `limit: REQUESTS_PER_PAGE` (20) und `offset` (Zeile 383-387)
- ❌ **PROBLEM:** Infinite Scroll lädt weitere Seiten (Zeile 471-483)
- ❌ **PROBLEM:** Bei Filter: Nur erste 20 gefilterten Ergebnisse, dann weitere 20 beim Scrollen
- ✅ Memory-Cleanup: Max 100 Items im State (Zeile 422-429)

**Aktueller Flow:**
1. User setzt Filter
2. Frontend: `fetchRequests(filterId, ..., page=1)`
3. Backend: Filter anwenden, dann `limit=20, offset=0` → nur 20 Ergebnisse
4. Frontend: Zeigt 20 Ergebnisse
5. User scrollt → `loadMoreRequests()` → `fetchRequests(..., page=2)`
6. Backend: Filter anwenden, dann `limit=20, offset=20` → weitere 20 Ergebnisse
7. **PROBLEM:** Wenn 1000 Ergebnisse den Filter matchen, werden nur 20+20+... geladen, nicht alle 1000!

---

### Reservations

**Backend:** `backend/src/controllers/reservationController.ts`
- ✅ Lädt ALLE Reservierungen (kein `limit`/`offset`) (Zeile 622-643)
- ❌ **PROBLEM:** Filter werden NICHT server-seitig angewendet
- ✅ **GUT:** Alle Daten werden geladen

**Frontend:** `frontend/src/pages/Worktracker.tsx`
- ✅ Lädt ALLE Reservierungen auf einmal (Zeile 720-738)
- ✅ Filter werden client-seitig angewendet (Zeile 1514-1802)
- ✅ `displayLimit` für Anzeige (Zeile 492, 2679, 3010, 3193-3202, 4476-4485)
- ❌ **PROBLEM:** "Mehr anzeigen" Button statt automatischem Infinite Scroll
- ❌ **PROBLEM:** Filter nur client-seitig (nicht server-seitig)

**Aktueller Flow:**
1. Frontend: `loadReservations()` → lädt ALLE Reservierungen
2. Frontend: Filter werden client-seitig angewendet (`filteredAndSortedReservations`)
3. Frontend: Zeigt nur erste 10 (`displayLimit=10`)
4. User klickt "Mehr anzeigen" → `displayLimit += 10`
5. **PROBLEM:** Kein automatischer Infinite Scroll
6. **PROBLEM:** Filter nur client-seitig (alle Daten müssen geladen werden, auch wenn gefiltert)

---

## 🔴 IDENTIFIZIERTE PROBLEME

### Problem 1: Pagination statt vollständiges Laden
**Betroffen:** Tasks, Requests  
**Schweregrad:** 🔴🔴🔴 KRITISCH

**Aktuell:**
- Backend gibt nur `limit` Ergebnisse zurück
- Bei Filter: Nur erste 20 gefilterten Ergebnisse, dann weitere 20 beim Scrollen
- **Ergebnis:** Wenn 1000 Ergebnisse den Filter matchen, werden nur 20+20+... geladen

**Erforderlich:**
- Backend gibt ALLE gefilterten Ergebnisse zurück (kein `limit`/`offset`)
- Frontend lädt ALLE gefilterten Ergebnisse auf einmal
- Infinite Scroll nur für Anzeige (nicht für Laden)

---

### Problem 2: Infinite Scroll funktioniert nicht richtig
**Betroffen:** Tasks, Requests, Reservations  
**Schweregrad:** 🔴🔴 WICHTIG

**Aktuell:**
- Tasks/Requests: Infinite Scroll lädt weitere Seiten (Pagination)
- Reservations: "Mehr anzeigen" Button (kein automatischer Scroll)

**Erforderlich:**
- Automatischer Infinite Scroll beim Scrollen
- IntersectionObserver oder window scroll
- Initial: 10-20 Items anzeigen
- Beim Scrollen: Weitere 10-20 Items anzeigen

---

### Problem 3: Filter nur client-seitig bei Reservations
**Betroffen:** Reservations  
**Schweregrad:** 🔴🔴 WICHTIG

**Aktuell:**
- Filter werden nur client-seitig angewendet
- Alle Reservierungen werden geladen, dann gefiltert

**Erforderlich:**
- Filter server-seitig anwenden
- Backend gibt nur gefilterte Ergebnisse zurück
- Frontend lädt alle gefilterten Ergebnisse

---

### Problem 4: Kein initialer Filter bei Reservations
**Betroffen:** Reservations  
**Schweregrad:** 🔴 MITTEL

**Aktuell:**
- `SavedFilterTags` wird gerendert mit `defaultFilterName="Aktuell"`
- Aber: Kein `useEffect`, der beim ersten Load den Default-Filter setzt

**Erforderlich:**
- `useEffect` für initialen Filter-Load (wie bei Tasks)
- `SavedFilterTags` setzt automatisch "Aktuell"-Filter

---

## 💡 LÖSUNGSPLAN

### Phase 1: Backend - Pagination entfernen, Filter server-seitig

#### 1.1 Tasks: Pagination entfernen

**Datei:** `backend/src/controllers/taskController.ts`

**Änderung 1: `limit` und `offset` Parameter entfernen (Zeile 48-53)**
```typescript
// VORHER:
const limit = req.query.limit 
    ? parseInt(req.query.limit as string, 10) 
    : undefined;
const offset = req.query.offset 
    ? parseInt(req.query.offset as string, 10) 
    : undefined;

// NACHHER:
// ❌ KEINE limit/offset Parameter mehr - immer ALLE Ergebnisse zurückgeben
```

**Änderung 2: Query ohne `take`/`skip` (Zeile 139-142)**
```typescript
// VORHER:
const tasks = await prisma.task.findMany({
    where: whereClause,
    ...(limit ? { take: limit } : {}),
    ...(offset !== undefined ? { skip: offset } : {}),
    orderBy: { createdAt: 'desc' },
    include: { ... }
});

// NACHHER:
const tasks = await prisma.task.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: { ... }
    // ❌ KEIN take/skip mehr - immer ALLE Ergebnisse
});
```

**Test:**
- ✅ Ohne Filter → Alle Tasks zurückgegeben
- ✅ Mit Filter → Alle gefilterten Tasks zurückgegeben
- ✅ Keine `limit`/`offset` Parameter mehr

---

#### 1.2 Requests: Pagination entfernen

**Datei:** `backend/src/controllers/requestController.ts`

**Änderung 1: `limit` und `offset` Parameter entfernen (Zeile 71-76)**
```typescript
// VORHER:
const limit = req.query.limit 
    ? parseInt(req.query.limit as string, 10) 
    : undefined;
const offset = req.query.offset 
    ? parseInt(req.query.offset as string, 10) 
    : undefined;

// NACHHER:
// ❌ KEINE limit/offset Parameter mehr - immer ALLE Ergebnisse zurückgeben
```

**Änderung 2: Query ohne `take`/`skip` (Zeile 158-161)**
```typescript
// VORHER:
const requests = await prisma.request.findMany({
    where: whereClause,
    ...(limit ? { take: limit } : {}),
    ...(offset !== undefined ? { skip: offset } : {}),
    orderBy: { createdAt: 'desc' },
    include: { ... }
});

// NACHHER:
const requests = await prisma.request.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: { ... }
    // ❌ KEIN take/skip mehr - immer ALLE Ergebnisse
});
```

**Test:**
- ✅ Ohne Filter → Alle Requests zurückgegeben
- ✅ Mit Filter → Alle gefilterten Requests zurückgegeben
- ✅ Keine `limit`/`offset` Parameter mehr

---

#### 1.3 Reservations: Filter server-seitig

**Datei:** `backend/src/controllers/reservationController.ts`

**Änderung 1: Filter-Parameter hinzufügen (vor Zeile 580)**
```typescript
// Filter-Parameter aus Query lesen
const filterId = req.query.filterId as string | undefined;
const filterConditions = req.query.filterConditions 
    ? JSON.parse(req.query.filterConditions as string) 
    : undefined;
```

**Änderung 2: Filter-Bedingungen konvertieren (nach Zeile 619)**
```typescript
// Filter-Bedingungen konvertieren (falls vorhanden)
let filterWhereClause: any = {};
if (filterId) {
    // Lade Filter aus Cache
    const filterData = await filterCache.get(parseInt(filterId, 10));
    if (filterData) {
        const conditions = JSON.parse(filterData.conditions);
        const operators = JSON.parse(filterData.operators);
        filterWhereClause = convertFilterConditionsToPrismaWhere(
            conditions,
            operators,
            'reservation'
        );
    }
} else if (filterConditions) {
    // Direkte Filter-Bedingungen
    filterWhereClause = convertFilterConditionsToPrismaWhere(
        filterConditions.conditions || filterConditions,
        filterConditions.operators || [],
        'reservation'
    );
}

// Füge Filter-Bedingungen zu whereClause hinzu
if (Object.keys(filterWhereClause).length > 0) {
    whereClause.AND = whereClause.AND || [];
    whereClause.AND.push(filterWhereClause);
}
```

**Test:**
- ✅ Ohne Filter → Alle Reservierungen zurückgegeben
- ✅ Mit Filter → Alle gefilterten Reservierungen zurückgegeben
- ✅ Filter werden server-seitig angewendet

---

### Phase 2: Frontend - Pagination entfernen, Infinite Scroll für Anzeige

#### 2.1 Tasks: Pagination entfernen, Infinite Scroll für Anzeige

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Änderung 1: `loadTasks` ohne Pagination (Zeile 581-685)**
```typescript
// VORHER:
const loadTasks = async (
    filterId?: number, 
    filterConditions?: any[], 
    background = false,
    page: number = 1, // ❌ ENTFERNEN
    append: boolean = false // ❌ ENTFERNEN
) => {
    const offset = (page - 1) * TASKS_PER_PAGE; // ❌ ENTFERNEN
    const params: any = {
        limit: TASKS_PER_PAGE, // ❌ ENTFERNEN
        offset: offset, // ❌ ENTFERNEN
    };
    // ...
    if (append) {
        // Infinite Scroll: Füge Tasks zu bestehenden hinzu
        // ❌ ENTFERNEN - nicht mehr nötig
    }
};

// NACHHER:
const loadTasks = async (
    filterId?: number, 
    filterConditions?: any[], 
    background = false
) => {
    const params: any = {};
    // ❌ KEINE limit/offset Parameter mehr
    if (filterId) {
        params.filterId = filterId;
    } else if (filterConditions && filterConditions.length > 0) {
        params.filterConditions = JSON.stringify({
            conditions: filterConditions,
            operators: filterLogicalOperators
        });
    }
    
    const response = await axiosInstance.get(API_ENDPOINTS.TASKS.BASE, { params });
    const tasksData = response.data;
    
    // ✅ ALLE Tasks werden geladen (kein limit/offset)
    const tasksWithAttachments = tasksData
        .filter((task: Task) => task != null)
        .map((task: Task) => {
            // ... (gleiche Attachment-Logik)
        });
    
    if (background) {
        setAllTasks(tasksWithAttachments);
    } else {
        // ✅ Initiales Laden: Ersetze Tasks (ALLE werden geladen)
        setTasks(tasksWithAttachments);
    }
};
```

**Änderung 2: `loadMoreTasks` entfernen, `displayLimit` für Anzeige (Zeile 688-699)**
```typescript
// VORHER:
const loadMoreTasks = useCallback(async () => {
    if (tasksLoadingMore || !tasksHasMore) return;
    const nextPage = tasksPage + 1;
    await loadTasks(..., nextPage, true);
}, [...]);

// NACHHER:
// ❌ ENTFERNEN - nicht mehr nötig
// ✅ Stattdessen: displayLimit für Anzeige verwenden
```

**Änderung 3: `displayLimit` State für Tasks hinzufügen (Zeile 492)**
```typescript
// VORHER:
const [displayLimit, setDisplayLimit] = useState<number>(10); // Nur für Reservations

// NACHHER:
const [tasksDisplayLimit, setTasksDisplayLimit] = useState<number>(20); // Für Tasks
const [reservationsDisplayLimit, setReservationsDisplayLimit] = useState<number>(20); // Für Reservations
```

**Änderung 4: Infinite Scroll für Anzeige (Zeile 755-776)**
```typescript
// VORHER:
scrollHandlerRef.current = () => {
    if (
        window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000 &&
        !tasksLoadingMore &&
        tasksHasMore
    ) {
        loadMoreTasks(); // ❌ ENTFERNEN
    }
};

// NACHHER:
scrollHandlerRef.current = () => {
    if (
        window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000 &&
        tasksDisplayLimit < filteredAndSortedTasks.length
    ) {
        // ✅ Infinite Scroll für Anzeige: Zeige weitere 20 Tasks
        setTasksDisplayLimit(prev => prev + 20);
    }
};
```

**Änderung 5: Tasks-Anzeige mit `displayLimit` (Zeile 2647-2679)**
```typescript
// VORHER:
{filteredAndSortedTasks.map(task => ...)}

// NACHHER:
{filteredAndSortedTasks.slice(0, tasksDisplayLimit).map(task => ...)}
```

**Test:**
- ✅ Alle Tasks werden geladen (kein limit/offset)
- ✅ Initial: Nur erste 20 Tasks angezeigt
- ✅ Beim Scrollen: Weitere 20 Tasks angezeigt
- ✅ Filter: Alle gefilterten Tasks werden geladen

---

#### 2.2 Requests: Pagination entfernen, Infinite Scroll für Anzeige

**Datei:** `frontend/src/components/Requests.tsx`

**Änderung 1: `fetchRequests` ohne Pagination (Zeile 367-461)**
```typescript
// VORHER:
const fetchRequests = async (
    filterId?: number, 
    filterConditions?: any[], 
    background = false,
    page: number = 1, // ❌ ENTFERNEN
    append: boolean = false // ❌ ENTFERNEN
) => {
    const offset = (page - 1) * REQUESTS_PER_PAGE; // ❌ ENTFERNEN
    const params: any = {
        limit: REQUESTS_PER_PAGE, // ❌ ENTFERNEN
        offset: offset, // ❌ ENTFERNEN
    };
    // ...
    if (append) {
        // Infinite Scroll: Füge Requests zu bestehenden hinzu
        // ❌ ENTFERNEN - nicht mehr nötig
    }
};

// NACHHER:
const fetchRequests = async (
    filterId?: number, 
    filterConditions?: any[], 
    background = false
) => {
    const params: any = {};
    // ❌ KEINE limit/offset Parameter mehr
    if (filterId) {
        params.filterId = filterId;
    } else if (filterConditions && filterConditions.length > 0) {
        params.filterConditions = JSON.stringify({
            conditions: filterConditions,
            operators: filterLogicalOperators
        });
    }
    
    const response = await axiosInstance.get('/requests', { params });
    const requestsData = response.data;
    
    // ✅ ALLE Requests werden geladen (kein limit/offset)
    const requestsWithAttachments = requestsData.map((request: Request) => {
        // ... (gleiche Attachment-Logik)
    });
    
    if (background) {
        setAllRequests(requestsWithAttachments);
    } else {
        // ✅ Initiales Laden: Ersetze Requests (ALLE werden geladen)
        setRequests(requestsWithAttachments);
    }
};
```

**Änderung 2: `loadMoreRequests` entfernen, `displayLimit` für Anzeige (Zeile 471-483)**
```typescript
// VORHER:
const loadMoreRequests = useCallback(async () => {
    if (requestsLoadingMore || !requestsHasMore) return;
    const nextPage = requestsPage + 1;
    await fetchRequests(..., nextPage, true);
}, [...]);

// NACHHER:
// ❌ ENTFERNEN - nicht mehr nötig
// ✅ Stattdessen: displayLimit für Anzeige verwenden
```

**Änderung 3: `displayLimit` State hinzufügen (vor Zeile 204)**
```typescript
const [requestsDisplayLimit, setRequestsDisplayLimit] = useState<number>(20); // Für Requests
```

**Änderung 4: Infinite Scroll für Anzeige (Zeile 584-603)**
```typescript
// VORHER:
scrollHandlerRef.current = () => {
    if (
        window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000 &&
        !requestsLoadingMore &&
        requestsHasMore
    ) {
        loadMoreRequests(); // ❌ ENTFERNEN
    }
};

// NACHHER:
scrollHandlerRef.current = () => {
    if (
        window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000 &&
        requestsDisplayLimit < filteredRequests.length
    ) {
        // ✅ Infinite Scroll für Anzeige: Zeige weitere 20 Requests
        setRequestsDisplayLimit(prev => prev + 20);
    }
};
```

**Änderung 5: Requests-Anzeige mit `displayLimit` (Zeile 1633)**
```typescript
// VORHER:
{filteredRequests.map(request => ...)}

// NACHHER:
{filteredRequests.slice(0, requestsDisplayLimit).map(request => ...)}
```

**Test:**
- ✅ Alle Requests werden geladen (kein limit/offset)
- ✅ Initial: Nur erste 20 Requests angezeigt
- ✅ Beim Scrollen: Weitere 20 Requests angezeigt
- ✅ Filter: Alle gefilterten Requests werden geladen

---

#### 2.3 Reservations: Filter server-seitig, Infinite Scroll für Anzeige

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Änderung 1: `loadReservations` mit Filter-Parameter (Zeile 720-738)**
```typescript
// VORHER:
const loadReservations = async () => {
    const response = await axiosInstance.get(API_ENDPOINTS.RESERVATION.BASE);
    const reservationsData = response.data?.data || response.data || [];
    setReservations(reservationsData);
};

// NACHHER:
const loadReservations = async (filterId?: number, filterConditions?: any[]) => {
    const params: any = {};
    if (filterId) {
        params.filterId = filterId;
    } else if (filterConditions && filterConditions.length > 0) {
        params.filterConditions = JSON.stringify({
            conditions: filterConditions,
            operators: reservationFilterLogicalOperators
        });
    }
    
    const response = await axiosInstance.get(API_ENDPOINTS.RESERVATION.BASE, { params });
    const reservationsData = response.data?.data || response.data || [];
    // ✅ ALLE gefilterten Reservierungen werden geladen (server-seitig gefiltert)
    setReservations(reservationsData);
};
```

**Änderung 2: `handleReservationFilterChange` ruft `loadReservations` auf (Zeile 1161-1166)**
```typescript
// VORHER:
const handleReservationFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<...>) => {
    setReservationActiveFilterName(name);
    setReservationSelectedFilterId(id);
    applyReservationFilterConditions(conditions, operators, sortDirections);
    setReservationTableSortConfig({ key: 'checkInDate', direction: 'desc' });
};

// NACHHER:
const handleReservationFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<...>) => {
    setReservationActiveFilterName(name);
    setReservationSelectedFilterId(id);
    applyReservationFilterConditions(conditions, operators, sortDirections);
    setReservationTableSortConfig({ key: 'checkInDate', direction: 'desc' });
    
    // ✅ Filter zurücksetzen bei Filter-Wechsel
    setReservationsDisplayLimit(20);
    
    // ✅ Lade Reservierungen mit Filter (server-seitig)
    if (id) {
        await loadReservations(id);
    } else if (conditions.length > 0) {
        await loadReservations(undefined, conditions);
    } else {
        await loadReservations(); // Kein Filter
    }
};
```

**Änderung 3: Infinite Scroll für Anzeige (nach Zeile 776)**
```typescript
// ✅ Infinite Scroll Handler für Reservations
useEffect(() => {
    const scrollHandlerRef = useRef<() => void>();
    
    scrollHandlerRef.current = () => {
        if (
            activeTab === 'reservations' &&
            window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000 &&
            reservationsDisplayLimit < filteredAndSortedReservations.length
        ) {
            // ✅ Infinite Scroll für Anzeige: Zeige weitere 20 Reservierungen
            setReservationsDisplayLimit(prev => prev + 20);
        }
    };
    
    const handleScroll = () => scrollHandlerRef.current?.();
    window.addEventListener('scroll', handleScroll);
    
    return () => {
        window.removeEventListener('scroll', handleScroll);
    };
}, [reservationsDisplayLimit, filteredAndSortedReservations.length, activeTab]);
```

**Änderung 4: "Mehr anzeigen" Button entfernen, `displayLimit` verwenden (Zeile 3193-3202, 4476-4485)**
```typescript
// VORHER:
{activeTab === 'reservations' && filteredAndSortedReservations.length > displayLimit && (
    <button onClick={() => setDisplayLimit(prevLimit => prevLimit + 10)}>
        {t('common.showMore')} ({filteredAndSortedReservations.length - displayLimit} {t('common.remaining')})
    </button>
)}

// NACHHER:
// ❌ ENTFERNEN - Infinite Scroll macht das automatisch
// ✅ Stattdessen: filteredAndSortedReservations.slice(0, reservationsDisplayLimit)
```

**Änderung 5: Reservations-Anzeige mit `displayLimit` (Zeile 2679, 3010)**
```typescript
// VORHER:
{filteredAndSortedReservations.slice(0, displayLimit).map(reservation => ...)}

// NACHHER:
{filteredAndSortedReservations.slice(0, reservationsDisplayLimit).map(reservation => ...)}
```

**Änderung 6: Initialer Filter-Load (nach Zeile 841)**
```typescript
// ✅ Initialer Filter-Load für Reservations (wie bei Tasks)
useEffect(() => {
    const setInitialReservationFilter = async () => {
        try {
            const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(RESERVATIONS_TABLE_ID));
            const filters = response.data;
            
            const aktuellFilter = filters.find((filter: any) => filter.name === t('reservations.filters.current', 'Aktuell'));
            if (aktuellFilter) {
                setReservationActiveFilterName(t('reservations.filters.current', 'Aktuell'));
                setReservationSelectedFilterId(aktuellFilter.id);
                applyReservationFilterConditions(aktuellFilter.conditions, aktuellFilter.operators);
                // ✅ Lade Reservierungen mit Filter
                await loadReservations(aktuellFilter.id);
            } else {
                // Kein Filter: Lade alle Reservierungen
                await loadReservations();
            }
        } catch (error) {
            console.error('Fehler beim Setzen des initialen Filters:', error);
            // Fallback: Lade alle Reservierungen
            await loadReservations();
        }
    };
    
    if (activeTab === 'reservations' && hasPermission('reservations', 'read', 'table')) {
        setInitialReservationFilter();
    }
}, [activeTab]);
```

**Test:**
- ✅ Alle Reservierungen werden geladen (mit Filter wenn gesetzt)
- ✅ Filter werden server-seitig angewendet
- ✅ Initial: Nur erste 20 Reservierungen angezeigt
- ✅ Beim Scrollen: Weitere 20 Reservierungen angezeigt
- ✅ Initialer Filter wird automatisch gesetzt

---

## ⚠️ RISIKEN & MITIGATION

### Risiko 1: Performance bei vielen Ergebnissen
**Problem:** Wenn 10.000 Ergebnisse geladen werden, könnte das langsam sein

**Mitigation:**
- ✅ Filter werden server-seitig angewendet → weniger Ergebnisse
- ✅ Infinite Scroll für Anzeige → nur 20 Items gerendert initial
- ✅ Virtualisierung könnte später hinzugefügt werden (z.B. react-window)

**Risiko:** 🟡 MITTEL - Sollte überwacht werden

---

### Risiko 2: Memory-Verbrauch bei vielen Ergebnissen
**Problem:** Wenn 10.000 Ergebnisse im State sind, könnte das viel Memory verbrauchen

**Mitigation:**
- ✅ Infinite Scroll für Anzeige → nur 20 Items gerendert initial
- ✅ Memory-Cleanup für Requests (max 100 Items) könnte auch für Tasks/Reservations hinzugefügt werden
- ✅ Virtualisierung könnte später hinzugefügt werden

**Risiko:** 🟡 MITTEL - Sollte überwacht werden

---

### Risiko 3: Backend-Performance bei vielen Ergebnissen
**Problem:** Wenn 10.000 Ergebnisse aus der DB geladen werden, könnte das langsam sein

**Mitigation:**
- ✅ Filter werden server-seitig angewendet → weniger Ergebnisse
- ✅ Indizes sollten vorhanden sein (prüfen!)
- ✅ Query-Performance sollte überwacht werden

**Risiko:** 🟡 MITTEL - Sollte überwacht werden

---

### Risiko 4: Infinite Scroll funktioniert nicht in allen Ansichten
**Problem:** Infinite Scroll prüft nur `window` scroll, nicht Container-Scroll

**Mitigation:**
- ✅ IntersectionObserver könnte verwendet werden (moderne Lösung)
- ✅ Container-Scroll sollte auch geprüft werden

**Risiko:** 🟡 MITTEL - Sollte getestet werden

---

## 📋 IMPLEMENTIERUNGSREIHENFOLGE

### Schritt 1: Backend - Pagination entfernen (Tasks, Requests)
1. `taskController.ts`: `limit`/`offset` Parameter entfernen
2. `requestController.ts`: `limit`/`offset` Parameter entfernen
3. Tests: Alle Tasks/Requests werden zurückgegeben

### Schritt 2: Backend - Filter server-seitig (Reservations)
1. `reservationController.ts`: Filter-Parameter hinzufügen
2. Filter-Bedingungen konvertieren
3. Tests: Gefilterte Reservierungen werden zurückgegeben

### Schritt 3: Frontend - Pagination entfernen (Tasks, Requests)
1. `loadTasks`: `limit`/`offset` Parameter entfernen
2. `fetchRequests`: `limit`/`offset` Parameter entfernen
3. `loadMoreTasks`/`loadMoreRequests` entfernen
4. Tests: Alle Tasks/Requests werden geladen

### Schritt 4: Frontend - Infinite Scroll für Anzeige (Tasks, Requests)
1. `displayLimit` State hinzufügen
2. Infinite Scroll Handler für Anzeige
3. Anzeige mit `displayLimit`
4. Tests: Infinite Scroll funktioniert

### Schritt 5: Frontend - Filter server-seitig (Reservations)
1. `loadReservations`: Filter-Parameter hinzufügen
2. `handleReservationFilterChange`: `loadReservations` aufrufen
3. Initialer Filter-Load
4. Tests: Filter funktionieren server-seitig

### Schritt 6: Frontend - Infinite Scroll für Anzeige (Reservations)
1. Infinite Scroll Handler für Reservations
2. "Mehr anzeigen" Button entfernen
3. Anzeige mit `displayLimit`
4. Tests: Infinite Scroll funktioniert

---

## ✅ VALIDIERUNG

### Test 1: Alle Ergebnisse werden geladen
**Schritte:**
1. Öffne Tasks/Requests/Reservations
2. Prüfe Network-Tab: Keine `limit`/`offset` Parameter
3. Prüfe Response: Alle Ergebnisse werden zurückgegeben

**Erwartetes Ergebnis:**
- ✅ Keine `limit`/`offset` Parameter
- ✅ Alle Ergebnisse werden zurückgegeben

---

### Test 2: Filter lädt alle gefilterten Ergebnisse
**Schritte:**
1. Setze Filter (z.B. "Aktuell")
2. Prüfe Network-Tab: `filterId` Parameter vorhanden
3. Prüfe Response: Alle gefilterten Ergebnisse werden zurückgegeben

**Erwartetes Ergebnis:**
- ✅ `filterId` Parameter vorhanden
- ✅ Alle gefilterten Ergebnisse werden zurückgegeben (nicht nur 20)

---

### Test 3: Infinite Scroll funktioniert
**Schritte:**
1. Öffne Tasks/Requests/Reservations
2. Initial: Nur 20 Items angezeigt
3. Scrolle nach unten
4. Weitere 20 Items werden angezeigt

**Erwartetes Ergebnis:**
- ✅ Initial: Nur 20 Items angezeigt
- ✅ Beim Scrollen: Weitere 20 Items angezeigt
- ✅ Automatisch (kein Button-Klick)

---

### Test 4: Filter + Infinite Scroll funktioniert
**Schritte:**
1. Setze Filter (z.B. "Aktuell")
2. Prüfe: Alle gefilterten Ergebnisse werden geladen
3. Initial: Nur 20 Items angezeigt
4. Scrolle nach unten
5. Weitere 20 Items werden angezeigt

**Erwartetes Ergebnis:**
- ✅ Alle gefilterten Ergebnisse werden geladen
- ✅ Infinite Scroll funktioniert mit gefilterten Ergebnissen

---

## 📝 UNKLARHEITEN & FRAGEN

### Frage 1: Wie viele Items initial anzeigen?
**Aktuell:** 20 Items  
**Vorschlag:** 20 Items (konsistent mit aktueller Implementierung)  
**Offen:** Sollte das konfigurierbar sein?

---

### Frage 2: Wie viele Items beim Scrollen anzeigen?
**Aktuell:** 20 Items  
**Vorschlag:** 20 Items (konsistent mit aktueller Implementierung)  
**Offen:** Sollte das konfigurierbar sein?

---

### Frage 3: IntersectionObserver vs. window scroll?
**Aktuell:** window scroll  
**Vorschlag:** IntersectionObserver (moderne Lösung, funktioniert auch bei Container-Scroll)  
**Offen:** Sollte IntersectionObserver verwendet werden?

---

### Frage 4: Memory-Cleanup für Tasks/Reservations?
**Aktuell:** Nur für Requests (max 100 Items)  
**Vorschlag:** Auch für Tasks/Reservations (max 100 Items)  
**Offen:** Sollte Memory-Cleanup hinzugefügt werden?

---

### Frage 5: Virtualisierung später hinzufügen?
**Aktuell:** Keine Virtualisierung  
**Vorschlag:** Später hinzufügen (z.B. react-window) wenn Performance-Probleme auftreten  
**Offen:** Sollte Virtualisierung geplant werden?

---

## 🎯 ERWARTETE VERBESSERUNGEN

### Vorher:
- ❌ Pagination: Nur 20 Ergebnisse pro Seite
- ❌ Bei Filter: Nur erste 20 gefilterten Ergebnisse, dann weitere 20 beim Scrollen
- ❌ Infinite Scroll lädt weitere Seiten (Pagination)
- ❌ Reservations: Filter nur client-seitig

### Nachher:
- ✅ Keine Pagination: Alle Ergebnisse werden geladen
- ✅ Bei Filter: Alle gefilterten Ergebnisse werden geladen
- ✅ Infinite Scroll nur für Anzeige (nicht für Laden)
- ✅ Reservations: Filter server-seitig

**Gesamtverbesserung:** Alle gefilterten Ergebnisse werden geladen und angezeigt!

---

**Erstellt:** 2025-01-27  
**Status:** 🔴 KRITISCH - Muss umgesetzt werden  
**Nächster Schritt:** Phase 1 umsetzen (Backend - Pagination entfernen)


