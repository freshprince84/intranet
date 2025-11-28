# Initial-Load Optimierungsplan (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 📋 PLANUNG  
**Zweck:** Optimierung des Initial-Loads nach Login (11 API-Calls → reduziert auf 3-4)

---

## 📊 AKTUELLE SITUATION

### API-Calls beim Initial-Load (nach Login)

**Sequenziell:**
1. POST `/auth/login` ✅ (notwendig)
2. GET `/users/profile` (AuthProvider)
3. GET `/api/organizations/current` (OrganizationProvider)
4. GET `/api/worktime/active` (WorktimeProvider)
5. GET `/api/branches/user` (BranchProvider, nach User)
6. GET `/api/worktime/stats?week=...` (WorktimeStats)
7. GET `/api/saved-filters/table/requests-table` (SavedFilterTags)
8. GET `/api/saved-filters/groups/table/requests-table` (SavedFilterTags)
9. GET `/api/requests?limit=20&offset=0` (Requests)
10. GET `/settings/logo` oder `/settings/logo/base64` (Header)
11. GET `/api/notifications/unread/count` (NotificationBell)

**Gesamt:** 11 API-Calls (teilweise parallel, teilweise sequenziell)

### Performance-Probleme

1. **Sequenzielle Abhängigkeiten:**
   - BranchProvider wartet auf User
   - WorktimeStats wartet auf User
   - Dashboard wartet auf alle Context-Provider

2. **Keine Request-Batching:**
   - Viele einzelne API-Calls statt Batch
   - Jeder Call = Round-Trip zum Server

3. **Keine Lazy Loading:**
   - Alle Daten werden sofort geladen, auch wenn nicht sichtbar
   - WorktimeStats lädt sofort, auch wenn Dashboard nicht sichtbar

4. **Connection Pool Timeouts:**
   - Backend kann Requests nicht schnell genug verarbeiten
   - 11 parallele Requests → Pool voll

5. **Komplexe DB-Queries:**
   - `getAllRequests` mit vielen Joins
   - `getStats` mit komplexen Berechnungen

---

## 🎯 OPTIMIERUNGSZIELE

1. **Reduzierung auf 3-4 API-Calls** statt 11
2. **Request-Batching:** Mehrere Daten in einem Request
3. **Lazy Loading:** Nur sichtbare Daten laden
4. **Parallel Loading:** Unabhängige Requests parallel
5. **Caching:** Aggressive Caching-Strategien

---

## 📋 OPTIMIERUNGSPLAN

### Phase 1: Request-Batching (Höchste Priorität)

**Ziel:** Mehrere API-Calls in einem Request kombinieren

#### 1.1 Neuer Endpoint: `/api/initial-load`

**Backend:** `backend/src/controllers/initialLoadController.ts`

```typescript
// GET /api/initial-load
// Gibt alle initialen Daten in einem Request zurück:
{
  user: User,                    // Aus AuthProvider
  organization: Organization,    // Aus OrganizationProvider
  activeWorktime: WorkTime | null, // Aus WorktimeProvider
  branches: Branch[],           // Aus BranchProvider
  unreadNotificationsCount: number, // Aus NotificationBell
  logo: string | null           // Aus Header
}
```

**Vorteile:**
- 6 API-Calls → 1 API-Call
- Reduziert Round-Trips
- Backend kann Daten parallel laden

**Implementierung:**
- Neuer Controller: `initialLoadController.ts`
- Service: `initialLoadService.ts`
- Frontend: `useInitialLoad()` Hook

#### 1.2 Dashboard-Daten Endpoint: `/api/dashboard/data`

**Backend:** `backend/src/controllers/dashboardController.ts`

```typescript
// GET /api/dashboard/data
// Gibt Dashboard-spezifische Daten zurück:
{
  worktimeStats: WorktimeStats,  // Aus WorktimeStats
  requests: Request[],           // Aus Requests (limit 20)
  savedFilters: {                // Aus SavedFilterTags
    filters: SavedFilter[],
    groups: FilterGroup[]
  }
}
```

**Vorteile:**
- 4 API-Calls → 1 API-Call
- Nur geladen wenn Dashboard sichtbar (Lazy Loading)

**Implementierung:**
- Neuer Controller: `dashboardController.ts`
- Service: `dashboardService.ts`
- Frontend: `useDashboardData()` Hook

---

### Phase 2: Lazy Loading (Hohe Priorität)

**Ziel:** Nur sichtbare Daten laden

#### 2.1 WorktimeStats Lazy Loading

**Aktuell:** Lädt sofort beim Dashboard-Render  
**Optimiert:** Lädt erst wenn Komponente sichtbar (Intersection Observer)

```typescript
// frontend/src/components/WorktimeStats.tsx
const WorktimeStats: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && user) {
      fetchStats();
    }
  }, [isVisible, user]);
  
  // ...
};
```

**Vorteile:**
- WorktimeStats lädt erst wenn sichtbar
- Reduziert initiale Last

#### 2.2 Requests Lazy Loading

**Aktuell:** Lädt sofort beim Dashboard-Render  
**Optimiert:** Lädt erst wenn Komponente sichtbar

```typescript
// frontend/src/components/Requests.tsx
const Requests: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const requestsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (requestsRef.current) {
      observer.observe(requestsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) {
      fetchRequests();
    }
  }, [isVisible]);
  
  // ...
};
```

**Vorteile:**
- Requests lädt erst wenn sichtbar
- Reduziert initiale Last

---

### Phase 3: Caching-Optimierung (Mittlere Priorität)

**Ziel:** Aggressive Caching-Strategien

#### 3.1 Initial-Load Cache

**Frontend:** Cache initiale Daten für 5 Minuten

```typescript
// frontend/src/hooks/useInitialLoad.ts
const INITIAL_LOAD_CACHE_KEY = 'initialLoadCache';
const CACHE_TTL = 5 * 60 * 1000; // 5 Minuten

const useInitialLoad = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Prüfe Cache
    const cached = localStorage.getItem(INITIAL_LOAD_CACHE_KEY);
    if (cached) {
      const { data: cachedData, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        setData(cachedData);
        setLoading(false);
        return;
      }
    }

    // Lade Daten
    axiosInstance.get('/api/initial-load')
      .then(response => {
        setData(response.data);
        localStorage.setItem(INITIAL_LOAD_CACHE_KEY, JSON.stringify({
          data: response.data,
          timestamp: Date.now()
        }));
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
};
```

**Vorteile:**
- Initial-Load nur einmal pro 5 Minuten
- Schnellere Navigation bei Seitenwechseln

#### 3.2 Dashboard-Daten Cache

**Frontend:** Cache Dashboard-Daten für 30 Sekunden

```typescript
// frontend/src/hooks/useDashboardData.ts
const DASHBOARD_CACHE_KEY = 'dashboardDataCache';
const CACHE_TTL = 30 * 1000; // 30 Sekunden

const useDashboardData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Prüfe Cache
    const cached = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
    if (cached) {
      const { data: cachedData, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        setData(cachedData);
        setLoading(false);
        return;
      }
    }

    // Lade Daten
    axiosInstance.get('/api/dashboard/data')
      .then(response => {
        setData(response.data);
        sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({
          data: response.data,
          timestamp: Date.now()
        }));
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
};
```

**Vorteile:**
- Dashboard-Daten werden gecacht
- Schnellere Navigation bei Seitenwechseln

---

### Phase 4: Backend-Optimierung (Mittlere Priorität)

**Ziel:** Parallele Datenladung im Backend

#### 4.1 Initial-Load Service

**Backend:** `backend/src/services/initialLoadService.ts`

```typescript
export class InitialLoadService {
  static async getInitialData(userId: number, organizationId: number | null) {
    // Parallele Datenladung
    const [user, organization, activeWorktime, branches, unreadCount, logo] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: { include: { permissions: true, organization: true } } } } } }),
      organizationId ? prisma.organization.findUnique({ where: { id: organizationId } }) : null,
      prisma.workTime.findFirst({ where: { userId, endTime: null } }),
      prisma.branch.findMany({ where: { users: { some: { id: userId } } } }),
      prisma.notification.count({ where: { userId, read: false } }),
      // Logo-Logik
    ]);

    return {
      user,
      organization,
      activeWorktime,
      branches,
      unreadNotificationsCount: unreadCount,
      logo
    };
  }
}
```

**Vorteile:**
- Parallele Datenladung im Backend
- Reduziert Gesamtzeit

#### 4.2 Dashboard-Daten Service

**Backend:** `backend/src/services/dashboardService.ts`

```typescript
export class DashboardService {
  static async getDashboardData(userId: number, organizationId: number | null, week: string) {
    // Parallele Datenladung
    const [worktimeStats, requests, savedFilters, filterGroups] = await Promise.all([
      WorktimeService.getStats(userId, week),
      RequestService.getAllRequests(userId, organizationId, { limit: 20, offset: 0 }),
      prisma.savedFilter.findMany({ where: { tableId: 'requests-table', userId } }),
      prisma.filterGroup.findMany({ where: { tableId: 'requests-table', userId } })
    ]);

    return {
      worktimeStats,
      requests,
      savedFilters: {
        filters: savedFilters,
        groups: filterGroups
      }
    };
  }
}
```

**Vorteile:**
- Parallele Datenladung im Backend
- Reduziert Gesamtzeit

---

## 📈 ERWARTETE VERBESSERUNGEN

### Vorher (Aktuell):
- **11 API-Calls** beim Initial-Load
- **Sequenzielle Abhängigkeiten**
- **20-30 Sekunden** Ladezeit
- **Connection Pool Timeouts**

### Nachher (Optimiert):
- **3-4 API-Calls** beim Initial-Load
  - 1x `/api/initial-load` (6 Calls kombiniert)
  - 1x `/api/dashboard/data` (4 Calls kombiniert, nur wenn Dashboard sichtbar)
  - 1x `/auth/login` (notwendig)
- **Parallele Datenladung** im Backend
- **Lazy Loading** für nicht-sichtbare Komponenten
- **Caching** für schnelle Navigation
- **5-10 Sekunden** Ladezeit (Ziel)

---

## 🚀 IMPLEMENTIERUNGSREIHENFOLGE

### Schritt 1: Request-Batching (Initial-Load Endpoint)
1. Backend: `initialLoadController.ts` erstellen
2. Backend: `initialLoadService.ts` erstellen
3. Frontend: `useInitialLoad()` Hook erstellen
4. Frontend: Context-Provider anpassen (AuthProvider, OrganizationProvider, etc.)

### Schritt 2: Request-Batching (Dashboard-Daten Endpoint)
1. Backend: `dashboardController.ts` erstellen
2. Backend: `dashboardService.ts` erstellen
3. Frontend: `useDashboardData()` Hook erstellen
4. Frontend: Dashboard-Komponente anpassen

### Schritt 3: Lazy Loading
1. WorktimeStats: Intersection Observer implementieren
2. Requests: Intersection Observer implementieren

### Schritt 4: Caching
1. Initial-Load Cache implementieren
2. Dashboard-Daten Cache implementieren

### Schritt 5: Backend-Optimierung
1. Parallele Datenladung in Services
2. Query-Optimierung

---

## ✅ TESTING

### Performance-Metriken:
- **Initial-Load Zeit:** Vorher vs. Nachher
- **API-Call Anzahl:** Vorher vs. Nachher
- **Connection Pool Usage:** Vorher vs. Nachher
- **RAM-Verbrauch:** Vorher vs. Nachher

### Funktionale Tests:
- Login funktioniert
- Dashboard lädt korrekt
- Alle Daten werden angezeigt
- Navigation funktioniert
- Cache funktioniert

---

## 📝 NOTIZEN

- **Memory Leaks:** Bereits behoben (ToursTab, SavedFilterTags, WorktimeStats)
- **Connection Pool:** Bereits optimiert (5 Pools, Round-Robin)
- **Query-Optimierung:** Bereits optimiert (getAllTasks, etc.)

---

**Nächste Schritte:** Implementierung Schritt 1 (Request-Batching Initial-Load Endpoint)

