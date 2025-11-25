# Implementierungsplan: Task Limit entfernen & Infinite Scroll implementieren

## Problem

1. **Hardcodiertes Limit von 50 Tasks** in `getAllTasks` verhindert, dass alle Tasks geladen werden
2. **Keine Sortierung** bei Tasks → Check-in Tasks (807-811) sind nicht in den ersten 50 Ergebnissen
3. **Gleiches Problem bei Requests, Tours, TourBookings** - alle haben hardcodiertes Limit 50
4. **Frontend lädt alle Tasks**, aber bekommt nur 50 zurück
5. **Kein Infinite Scroll** - Frontend zeigt "Mehr anzeigen" Button, aber lädt alle auf einmal

## Anforderungen

1. **Backend:**
   - Limit optional machen (nur wenn `limit` Parameter vorhanden)
   - Sortierung bei Tasks hinzufügen (`createdAt: 'desc'`)
   - Gleiche Änderung für Requests, Tours, TourBookings (konsistent)

2. **Frontend:**
   - Initiales Laden: Nur erste 20 Tasks laden (`limit: 20`)
   - Infinite Scroll implementieren: Beim Scrollen nach unten weitere Tasks nachladen
   - Gleiche Implementierung für Requests

## Bestehender Code-Analyse

### Backend

#### `taskController.ts` - `getAllTasks`
- **Zeile 48-50:** Hardcodiertes Limit von 50
- **Zeile 122-147:** Query ohne `orderBy` - keine Sortierung
- **Problem:** Tasks werden in nicht garantierter Reihenfolge zurückgegeben

#### `requestController.ts` - `getAllRequests`
- **Zeile 71-73:** Hardcodiertes Limit von 50
- **Zeile 173-175:** Hat bereits `orderBy: { createdAt: 'desc' }` ✅
- **Problem:** Nur das Limit muss optional gemacht werden

#### `tourController.ts` - `getAllTours`
- **Zeile 72-74:** Hardcodiertes Limit von 50
- **Prüfen:** Ob Sortierung vorhanden ist

#### `tourBookingController.ts` - `getAllTourBookings`
- **Zeile 36-38:** Hardcodiertes Limit von 50
- **Prüfen:** Ob Sortierung vorhanden ist

### Frontend

#### `Worktracker.tsx` - `loadTasks`
- **Zeile 612-676:** Lädt Tasks ohne `limit` Parameter
- **Zeile 629:** API-Call ohne `limit` Parameter
- **Zeile 3001-3010:** "Mehr anzeigen" Button für Anzeige, aber nicht für Laden
- **Problem:** Lädt alle Tasks, aber bekommt nur 50 zurück

#### `Requests.tsx` - `loadRequests`
- **Zeile 258:** `displayLimit` State für Anzeige
- **Prüfen:** Wie werden Requests geladen?

#### `NotificationList.tsx` - Pagination Pattern
- **Zeile 36-37:** `page` und `totalPages` State
- **Zeile 41:** `itemsPerPage = 10`
- **Zeile 58-69:** `fetchNotifications` mit `page` und `limit` Parameter
- **Pattern:** Pagination mit Page/Limit - kann als Referenz verwendet werden

## Detaillierter Implementierungsplan

### Phase 1: Backend - Limit optional machen & Sortierung hinzufügen

#### 1.1 `taskController.ts` - `getAllTasks`

**Datei:** `backend/src/controllers/taskController.ts`

**Änderung 1: Limit optional machen (Zeile 48-50)**
```typescript
// VORHER:
const limit = req.query.limit 
    ? parseInt(req.query.limit as string, 10) 
    : 50; // OPTIMIERUNG: Standard-Limit 50 statt alle

// NACHHER:
const limit = req.query.limit 
    ? parseInt(req.query.limit as string, 10) 
    : undefined; // Kein Limit wenn nicht angegeben - alle Tasks werden zurückgegeben
```

**Änderung 2: Sortierung hinzufügen (Zeile 122-147)**
```typescript
// VORHER:
const tasks = await prisma.task.findMany({
    where: whereClause,
    take: limit,
    include: { ... }
});

// NACHHER:
const tasks = await prisma.task.findMany({
    where: whereClause,
    ...(limit ? { take: limit } : {}), // Nur Limit wenn angegeben
    orderBy: { createdAt: 'desc' }, // Neueste Tasks zuerst
    include: { ... }
});
```

**Test:**
- ✅ Ohne `limit` Parameter → Alle Tasks zurückgegeben
- ✅ Mit `limit: 20` → Nur 20 Tasks zurückgegeben
- ✅ Sortierung: Neueste Tasks zuerst (höchste ID zuerst)
- ✅ Filter funktionieren weiterhin

#### 1.2 `requestController.ts` - `getAllRequests`

**Datei:** `backend/src/controllers/requestController.ts`

**Änderung: Limit optional machen (Zeile 71-73)**
```typescript
// VORHER:
const limit = req.query.limit 
    ? parseInt(req.query.limit as string, 10) 
    : 50; // OPTIMIERUNG: Standard-Limit 50 statt alle

// NACHHER:
const limit = req.query.limit 
    ? parseInt(req.query.limit as string, 10) 
    : undefined; // Kein Limit wenn nicht angegeben - alle Requests werden zurückgegeben
```

**Änderung: Limit in Query anwenden (Zeile 151-176)**
```typescript
// VORHER:
const requests = await prisma.request.findMany({
    where: whereClause,
    take: limit,
    include: { ... },
    orderBy: { createdAt: 'desc' }
});

// NACHHER:
const requests = await prisma.request.findMany({
    where: whereClause,
    ...(limit ? { take: limit } : {}), // Nur Limit wenn angegeben
    include: { ... },
    orderBy: { createdAt: 'desc' } // Bereits vorhanden ✅
});
```

**Test:**
- ✅ Ohne `limit` Parameter → Alle Requests zurückgegeben
- ✅ Mit `limit: 20` → Nur 20 Requests zurückgegeben
- ✅ Sortierung bleibt erhalten

#### 1.3 `tourController.ts` - `getAllTours`

**Datei:** `backend/src/controllers/tourController.ts`

**Änderung: Limit optional machen (Zeile 72-74)**
```typescript
// VORHER:
const limit = req.query.limit 
    ? parseInt(req.query.limit as string, 10) 
    : 50;

// NACHHER:
const limit = req.query.limit 
    ? parseInt(req.query.limit as string, 10) 
    : undefined; // Kein Limit wenn nicht angegeben
```

**Änderung: Limit in Query anwenden (Zeile 152-174)**
```typescript
// VORHER:
const tours = await prisma.tour.findMany({
    where: whereClause,
    take: limit,
    include: { ... },
    orderBy: { createdAt: 'desc' } // Bereits vorhanden ✅
});

// NACHHER:
const tours = await prisma.tour.findMany({
    where: whereClause,
    ...(limit ? { take: limit } : {}), // Nur Limit wenn angegeben
    include: { ... },
    orderBy: { createdAt: 'desc' } // Bereits vorhanden ✅
});
```

**Test:**
- ✅ Ohne `limit` Parameter → Alle Tours zurückgegeben
- ✅ Mit `limit: 20` → Nur 20 Tours zurückgegeben
- ✅ Sortierung bleibt erhalten

#### 1.4 `tourBookingController.ts` - `getAllTourBookings`

**Datei:** `backend/src/controllers/tourBookingController.ts`

**Änderung: Limit optional machen (Zeile 36-38)**
```typescript
// VORHER:
const limit = req.query.limit 
    ? parseInt(req.query.limit as string, 10) 
    : 50;

// NACHHER:
const limit = req.query.limit 
    ? parseInt(req.query.limit as string, 10) 
    : undefined; // Kein Limit wenn nicht angegeben
```

**Änderung: Limit in Query anwenden (Zeile 133-157)**
```typescript
// VORHER:
const bookings = await prisma.tourBooking.findMany({
    where: whereClause,
    take: limit,
    include: { ... },
    orderBy: { bookingDate: 'desc' } // Bereits vorhanden ✅
});

// NACHHER:
const bookings = await prisma.tourBooking.findMany({
    where: whereClause,
    ...(limit ? { take: limit } : {}), // Nur Limit wenn angegeben
    include: { ... },
    orderBy: { bookingDate: 'desc' } // Bereits vorhanden ✅
});
```

**Test:**
- ✅ Ohne `limit` Parameter → Alle TourBookings zurückgegeben
- ✅ Mit `limit: 20` → Nur 20 TourBookings zurückgegeben
- ✅ Sortierung bleibt erhalten

### Phase 2: Frontend - Initiales Laden mit Limit & Infinite Scroll

#### 2.1 `Worktracker.tsx` - Tasks Infinite Scroll

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Neue State-Variablen hinzufügen:**
```typescript
// Nach Zeile 288 (nach const Worktracker: React.FC = () => {)
const [tasksPage, setTasksPage] = useState(1); // Aktuelle Seite für Tasks
const [tasksHasMore, setTasksHasMore] = useState(true); // Gibt es weitere Tasks?
const [tasksLoadingMore, setTasksLoadingMore] = useState(false); // Lädt weitere Tasks?
const TASKS_PER_PAGE = 20; // Tasks pro Seite
```

**Änderung: `loadTasks` Funktion (Zeile 612-676)**

**Vorher:**
```typescript
const loadTasks = async (filterId?: number, filterConditions?: any[], background = false) => {
    // ...
    const response = await axiosInstance.get(API_ENDPOINTS.TASKS.BASE, { params });
    // ...
};
```

**Nachher:**
```typescript
const loadTasks = async (
    filterId?: number, 
    filterConditions?: any[], 
    background = false,
    page: number = 1, // Neue Parameter
    append: boolean = false // Neue Parameter: Sollen Tasks angehängt werden?
) => {
    try {
        if (!background && !append) {
            setLoading(true);
        }
        if (append) {
            setTasksLoadingMore(true);
        }
        
        // Baue Query-Parameter
        const params: any = {
            limit: TASKS_PER_PAGE, // Immer Limit für initiales Laden
            // page Parameter wird später für Pagination verwendet (optional)
        };
        
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
        
        // Attachments verarbeiten (gleiche Logik wie vorher)
        const tasksWithAttachments = tasksData
            .filter((task: Task) => task != null)
            .map((task: Task) => {
                // ... (gleiche Attachment-Logik)
            });
        
        if (background) {
            // Hintergrund-Laden: Speichere in allTasks
            setAllTasks(tasksWithAttachments);
        } else if (append) {
            // Infinite Scroll: Füge Tasks zu bestehenden hinzu
            setTasks(prevTasks => [...prevTasks, ...tasksWithAttachments]);
            // Prüfe ob es weitere Tasks gibt
            setTasksHasMore(tasksWithAttachments.length === TASKS_PER_PAGE);
            setTasksPage(page);
        } else {
            // Initiales Laden: Ersetze Tasks
            setTasks(tasksWithAttachments);
            setTasksHasMore(tasksWithAttachments.length === TASKS_PER_PAGE);
            setTasksPage(1);
        }
        
        setError(null);
    } catch (error) {
        // ... (gleiche Error-Handling)
    } finally {
        if (!background && !append) {
            setLoading(false);
        }
        if (append) {
            setTasksLoadingMore(false);
        }
    }
};
```

**Neue Funktion: `loadMoreTasks` hinzufügen**
```typescript
// Nach loadTasks Funktion
const loadMoreTasks = async () => {
    if (tasksLoadingMore || !tasksHasMore) return;
    
    const nextPage = tasksPage + 1;
    await loadTasks(
        selectedFilterId || undefined,
        filterConditions.length > 0 ? filterConditions : undefined,
        false,
        nextPage,
        true // append = true
    );
};
```

**Infinite Scroll Handler hinzufügen:**
```typescript
// useEffect für Infinite Scroll
useEffect(() => {
    const handleScroll = () => {
        // Prüfe ob User nahe am Ende der Seite ist
        if (
            window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000 &&
            !tasksLoadingMore &&
            tasksHasMore &&
            activeTab === 'todos'
        ) {
            loadMoreTasks();
        }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
}, [tasksLoadingMore, tasksHasMore, activeTab, selectedFilterId, filterConditions]);
```

**Loading Indicator für "Lädt weitere Tasks" hinzufügen:**
```typescript
// In der Render-Logik, nach der Tasks-Liste
{tasksLoadingMore && (
    <div className="flex justify-center py-4">
        <CircularProgress size={24} />
        <span className="ml-2">{t('common.loadingMore', 'Lädt weitere Tasks...')}</span>
    </div>
)}
```

**"Mehr anzeigen" Button entfernen oder anpassen:**
- Entfernen: Zeile 3001-3010 (wird durch Infinite Scroll ersetzt)
- Oder: Behalten als Fallback für Mobile (optional)

#### 2.2 `Requests.tsx` - Requests Infinite Scroll

**Datei:** `frontend/src/components/Requests.tsx`

**Neue State-Variablen hinzufügen (nach Zeile 258):**
```typescript
const [requestsPage, setRequestsPage] = useState(1); // Aktuelle Seite für Requests
const [requestsHasMore, setRequestsHasMore] = useState(true); // Gibt es weitere Requests?
const [requestsLoadingMore, setRequestsLoadingMore] = useState(false); // Lädt weitere Requests?
const REQUESTS_PER_PAGE = 20; // Requests pro Seite
```

**Änderung: `fetchRequests` Funktion (Zeile 364-428)**

**Vorher:**
```typescript
const fetchRequests = async (filterId?: number, filterConditions?: any[], background = false) => {
    // ...
    const response = await axiosInstance.get('/requests', { params });
    // ...
};
```

**Nachher:**
```typescript
const fetchRequests = async (
    filterId?: number, 
    filterConditions?: any[], 
    background = false,
    page: number = 1, // Neue Parameter
    append: boolean = false // Neue Parameter: Sollen Requests angehängt werden?
) => {
    try {
        if (!background && !append) {
            setLoading(true);
        }
        if (append) {
            setRequestsLoadingMore(true);
        }
        
        // Baue Query-Parameter
        const params: any = {
            limit: REQUESTS_PER_PAGE, // Immer Limit für initiales Laden
        };
        
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
        
        // Attachments verarbeiten (gleiche Logik wie vorher)
        const requestsWithAttachments = requestsData.map((request: Request) => {
            // ... (gleiche Attachment-Logik)
        });
        
        if (background) {
            // Hintergrund-Laden: Speichere in allRequests
            setAllRequests(requestsWithAttachments);
        } else if (append) {
            // Infinite Scroll: Füge Requests zu bestehenden hinzu
            setRequests(prevRequests => [...prevRequests, ...requestsWithAttachments]);
            // Prüfe ob es weitere Requests gibt
            setRequestsHasMore(requestsWithAttachments.length === REQUESTS_PER_PAGE);
            setRequestsPage(page);
        } else {
            // Initiales Laden: Ersetze Requests
            setRequests(requestsWithAttachments);
            setRequestsHasMore(requestsWithAttachments.length === REQUESTS_PER_PAGE);
            setRequestsPage(1);
        }
        
        setError(null);
    } catch (err) {
        // ... (gleiche Error-Handling)
    } finally {
        if (!background && !append) {
            setLoading(false);
        }
        if (append) {
            setRequestsLoadingMore(false);
        }
    }
};
```

**Neue Funktion: `loadMoreRequests` hinzufügen**
```typescript
// Nach fetchRequests Funktion
const loadMoreRequests = async () => {
    if (requestsLoadingMore || !requestsHasMore) return;
    
    const nextPage = requestsPage + 1;
    await fetchRequests(
        selectedFilterId || undefined,
        filterConditions.length > 0 ? filterConditions : undefined,
        false,
        nextPage,
        true // append = true
    );
};
```

**Infinite Scroll Handler hinzufügen:**
```typescript
// useEffect für Infinite Scroll
useEffect(() => {
    const handleScroll = () => {
        // Prüfe ob User nahe am Ende der Seite ist
        if (
            window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000 &&
            !requestsLoadingMore &&
            requestsHasMore
        ) {
            loadMoreRequests();
        }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
}, [requestsLoadingMore, requestsHasMore, selectedFilterId, filterConditions]);
```

**Loading Indicator für "Lädt weitere Requests" hinzufügen:**
```typescript
// In der Render-Logik, nach der Requests-Liste
{requestsLoadingMore && (
    <div className="flex justify-center py-4">
        <CircularProgress size={24} />
        <span className="ml-2">{t('common.loadingMoreRequests', 'Lädt weitere Requests...')}</span>
    </div>
)}
```

### Phase 3: Übersetzungen hinzufügen

**Dateien:**
- `frontend/src/i18n/locales/de.json`
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/es.json`

**Neue Übersetzungsschlüssel:**
```json
{
  "common": {
    "loadingMore": "Lädt weitere Tasks...",
    "loadingMoreRequests": "Lädt weitere Requests...",
    "noMoreTasks": "Keine weiteren Tasks",
    "noMoreRequests": "Keine weiteren Requests"
  }
}
```

### Phase 4: Testing

#### 4.1 Backend Tests

**Test 1: Tasks ohne Limit**
```bash
GET /api/tasks
# Erwartet: Alle Tasks zurückgegeben
```

**Test 2: Tasks mit Limit**
```bash
GET /api/tasks?limit=20
# Erwartet: Nur 20 Tasks zurückgegeben
```

**Test 3: Tasks Sortierung**
```bash
GET /api/tasks?limit=5
# Erwartet: 5 neueste Tasks (höchste ID zuerst)
```

**Test 4: Tasks mit Filter**
```bash
GET /api/tasks?filterId=1&limit=20
# Erwartet: 20 Tasks die dem Filter entsprechen
```

**Gleiche Tests für Requests, Tours, TourBookings**

#### 4.2 Frontend Tests

**Test 1: Initiales Laden**
- Seite öffnen → Nur 20 Tasks geladen
- Check-in Tasks (807-811) sollten sichtbar sein (wenn sie zu den neuesten 20 gehören)

**Test 2: Infinite Scroll**
- Nach unten scrollen → Weitere 20 Tasks werden geladen
- Loading Indicator erscheint während des Ladens
- Alle Tasks können durch Scrollen geladen werden

**Test 3: Filter mit Infinite Scroll**
- Filter anwenden → Nur gefilterte Tasks werden geladen
- Nach unten scrollen → Weitere gefilterte Tasks werden geladen

**Test 4: Requests Infinite Scroll**
- Gleiche Tests wie für Tasks

## Implementierungsreihenfolge

1. **Backend Phase 1.1:** `taskController.ts` - Limit optional & Sortierung
2. **Backend Phase 1.2:** `requestController.ts` - Limit optional
3. **Backend Phase 1.3:** `tourController.ts` - Limit optional & Sortierung prüfen
4. **Backend Phase 1.4:** `tourBookingController.ts` - Limit optional & Sortierung prüfen
5. **Frontend Phase 2.1:** `Worktracker.tsx` - Tasks Infinite Scroll
6. **Frontend Phase 2.2:** `Requests.tsx` - Requests Infinite Scroll
7. **Frontend Phase 3:** Übersetzungen hinzufügen
8. **Phase 4:** Testing

## Risiken & Lösungen

### Risiko 1: Performance bei vielen Tasks
**Problem:** Wenn alle Tasks geladen werden, könnte es langsam werden
**Lösung:** Frontend lädt initial nur 20 Tasks, weitere beim Scrollen

### Risiko 2: Mobile App Kompatibilität
**Problem:** Mobile App könnte erwarten, dass alle Tasks geladen werden
**Lösung:** Mobile App kann `limit` Parameter weglassen → alle Tasks

### Risiko 3: Filter mit Infinite Scroll
**Problem:** Filter könnte mit Infinite Scroll kollidieren
**Lösung:** Bei Filter-Wechsel: `tasksPage` auf 1 zurücksetzen, `tasksHasMore` neu berechnen

## Zusammenfassung

**Backend Änderungen:**
- **4 Controller:** Limit optional machen
  - `taskController.ts` - Zeile 48-50, 122-147
  - `requestController.ts` - Zeile 71-73, 151-176
  - `tourController.ts` - Zeile 72-74, 152-174
  - `tourBookingController.ts` - Zeile 36-38, 133-157
- **1 Controller:** Sortierung hinzufügen
  - `taskController.ts` - `orderBy: { createdAt: 'desc' }` hinzufügen
- **3 Controller:** Sortierung bereits vorhanden ✅
  - `requestController.ts` - `orderBy: { createdAt: 'desc' }` ✅
  - `tourController.ts` - `orderBy: { createdAt: 'desc' }` ✅
  - `tourBookingController.ts` - `orderBy: { bookingDate: 'desc' }` ✅

**Frontend Änderungen:**
- **2 Komponenten:** Infinite Scroll implementieren
  - `Worktracker.tsx` - Tasks Infinite Scroll
  - `Requests.tsx` - Requests Infinite Scroll
- **State-Management:** Pagination State-Variablen hinzufügen
- **Scroll-Handler:** Automatisches Nachladen beim Scrollen
- **Loading Indicators:** "Lädt weitere..." Anzeige

**Übersetzungen:**
- **4 neue Übersetzungsschlüssel** in 3 Sprachen (de, en, es):
  - `common.loadingMore`
  - `common.loadingMoreRequests`
  - `common.noMoreTasks`
  - `common.noMoreRequests`

**Testing:**
- **Backend:** 4 Tests pro Controller (16 Tests insgesamt)
- **Frontend:** 4 Tests pro Komponente (8 Tests insgesamt)

