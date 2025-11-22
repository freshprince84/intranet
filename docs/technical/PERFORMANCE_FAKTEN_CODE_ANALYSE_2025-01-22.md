# Performance-Fakten: Code-Analyse (2025-01-22)

**Datum:** 2025-01-22  
**Status:** 📊 Fakten aus Code-Analyse  
**Hinweis:** Nur Fakten aus dem Code, keine Vermutungen

---

## 📊 PERFORMANCE-LOGGING IM CODE

### Backend: Query-Zeit-Logging

**Datei:** `backend/src/controllers/requestController.ts`

**Zeile 150-178:**
```typescript
const queryStartTime = Date.now();
const requests = await prisma.request.findMany({...});
const queryDuration = Date.now() - queryStartTime;
console.log(`[getAllRequests] ✅ Query abgeschlossen: ${requests.length} Requests in ${queryDuration}ms`);
```

**Fakt:** Query-Zeit wird gemessen und geloggt.

---

**Datei:** `backend/src/controllers/taskController.ts`

**Zeile 121-149:**
```typescript
const queryStartTime = Date.now();
const tasks = await prisma.task.findMany({...});
const queryDuration = Date.now() - queryStartTime;
console.log(`[getAllTasks] ✅ Query abgeschlossen: ${tasks.length} Tasks in ${queryDuration}ms`);
```

**Fakt:** Query-Zeit wird gemessen und geloggt.

---

## 🔍 API-CALLS BEIM INITIALEN LADEN (AUS CODE)

### Context-Provider (App.tsx Zeile 52-59)

**1. AuthProvider** (`frontend/src/hooks/useAuth.tsx:41-56`)
- **Endpoint:** `/users/profile`
- **Query-Parameter:** `includeSettings=false&includeInvoiceSettings=false&includeDocuments=false`
- **Zeitpunkt:** Beim Mount (useEffect mit leerem Array)

**2. WorktimeProvider** (`frontend/src/contexts/WorktimeContext.tsx:47-57`)
- **Endpoint:** `/api/worktime/active`
- **Zeitpunkt:** Beim Mount (useEffect mit leerem Array)

**3. OrganizationProvider** (`frontend/src/contexts/OrganizationContext.tsx:51-58`)
- **Endpoint:** `/api/organizations/current`
- **Zeitpunkt:** Beim Mount (useEffect mit leerem Array)

**4. BranchProvider** (`frontend/src/contexts/BranchContext.tsx:80-84`)
- **Endpoint:** `/api/branches/user`
- **Zeitpunkt:** Nach User-Load (`useEffect` mit `[user, isLoading]` als Dependencies)

**5. OnboardingProvider** (`frontend/src/contexts/OnboardingContext.tsx:275`)
- **Endpoint:** `/api/users/onboarding/status`
- **Zeitpunkt:** Beim Mount

**Fakt:** 5 parallele API-Calls beim initialen Laden.

---

### Dashboard-Seite

**Komponente:** `Requests` (`frontend/src/components/Requests.tsx:523-572`)

**useEffect beim Mount (Zeile 523):**
1. **Request 1:** `GET /saved-filters/requests-table` (Zeile 526)
2. **Request 2:** `GET /requests?filterId=X` (Zeile 554) - nach Request 1
3. **Request 3:** `GET /requests` (Zeile 558) - nach 2 Sekunden (setTimeout)

**Fakt:** Sequenzielle Requests: Erst Filter, dann Requests mit Filter, dann alle Requests im Hintergrund.

---

### Worktracker-Seite

**Komponente:** `Worktracker` (`frontend/src/pages/Worktracker.tsx:521-567`)

**useEffect beim Mount (Zeile 521):**
1. **Request 1:** `GET /saved-filters/worktracker-todos` (Zeile 524)
2. **Request 2:** `GET /tasks?filterId=X` (Zeile 549) - nach Request 1
3. **Request 3:** `GET /tasks` (Zeile 553) - nach 2 Sekunden (setTimeout)

**Fakt:** Sequenzielle Requests: Erst Filter, dann Tasks mit Filter, dann alle Tasks im Hintergrund.

---

**Komponente:** `SavedFilterTags` (`frontend/src/components/SavedFilterTags.tsx:205-247`)

**useEffect beim Mount (Zeile 205):**
1. **Request 1:** `GET /saved-filters/{tableId}` (Zeile 218)
2. **Request 2:** `GET /saved-filters/groups/{tableId}` (Zeile 219)
3. **Beide parallel:** `Promise.all([...])` (Zeile 217)

**Fakt:** 2 parallele Requests beim Mount.

---

## 📋 REQUEST-FLOW (AUS CODE)

### Dashboard - Requests-Komponente

**Code:** `frontend/src/components/Requests.tsx:523-572`

**Flow:**
1. `setInitialFilterAndLoad()` wird aufgerufen (Zeile 524)
2. `GET /saved-filters/requests-table` (Zeile 526)
3. Filter "Aktuell" suchen (Zeile 530-532)
4. `await fetchRequests(aktuellFilter.id)` (Zeile 554) - **blockierend**
5. `setTimeout(() => fetchRequests(undefined, undefined, true), 2000)` (Zeile 557-559) - **nach 2 Sekunden**

**Fakt:** Requests werden sequenziell geladen: Filter → Requests mit Filter (blockierend) → alle Requests (nach 2s).

---

### Worktracker - Tasks

**Code:** `frontend/src/pages/Worktracker.tsx:521-567`

**Flow:**
1. `setInitialFilterAndLoad()` wird aufgerufen (Zeile 522)
2. `GET /saved-filters/worktracker-todos` (Zeile 524)
3. Filter "Aktuell" suchen (Zeile 527)
4. `await loadTasks(aktuellFilter.id)` (Zeile 549) - **blockierend**
5. `setTimeout(() => loadTasks(undefined, undefined, true), 2000)` (Zeile 552-554) - **nach 2 Sekunden**

**Fakt:** Tasks werden sequenziell geladen: Filter → Tasks mit Filter (blockierend) → alle Tasks (nach 2s).

---

## 🔍 BACKEND-ENDPOINTS (AUS CODE)

### `/api/requests` (getAllRequests)

**Datei:** `backend/src/controllers/requestController.ts:61-178`

**Query-Parameter:**
- `filterId` (optional)
- `filterConditions` (optional)
- `limit` (Standard: 50)
- `includeAttachments` (Standard: false)

**Performance-Logging:**
- Zeile 150: `const queryStartTime = Date.now()`
- Zeile 177: `const queryDuration = Date.now() - queryStartTime`
- Zeile 178: `console.log(\`[getAllRequests] ✅ Query abgeschlossen: ${requests.length} Requests in ${queryDuration}ms\`)`

**Fakt:** Query-Zeit wird gemessen und geloggt.

---

### `/api/tasks` (getAllTasks)

**Datei:** `backend/src/controllers/taskController.ts:37-149`

**Query-Parameter:**
- `filterId` (optional)
- `filterConditions` (optional)
- `limit` (Standard: 50)
- `includeAttachments` (Standard: false)

**Performance-Logging:**
- Zeile 121: `const queryStartTime = Date.now()`
- Zeile 148: `const queryDuration = Date.now() - queryStartTime`
- Zeile 149: `console.log(\`[getAllTasks] ✅ Query abgeschlossen: ${tasks.length} Tasks in ${queryDuration}ms\`)`

**Fakt:** Query-Zeit wird gemessen und geloggt.

---

## 📊 CACHING-STATUS (AUS CODE)

### FilterCache

**Verwendet in:**
- `getAllRequests` (Zeile 80-96)
- `getAllTasks` (Zeile 57)

**Fakt:** FilterCache wird verwendet.

---

### OrganizationCache

**Verwendet in:**
- `organizationMiddleware` (`backend/src/middleware/organization.ts`)
- `getCurrentOrganization` (`backend/src/controllers/organizationController.ts:748`)

**Fakt:** OrganizationCache wird verwendet.

---

### UserCache

**Verwendet in:**
- `authMiddleware` (`backend/src/middleware/auth.ts:55`)

**Fakt:** UserCache wird verwendet.

---

### WorktimeCache

**Verwendet in:**
- `getActiveWorktime` (`backend/src/controllers/worktimeController.ts`)

**Fakt:** WorktimeCache wird verwendet.

---

## 🔍 FRONTEND-REQUEST-REIHENFOLGE (AUS CODE)

### Beim initialen Laden (nach Login/Refresh)

**Phase 1: Context-Provider (parallel)**
1. AuthProvider → `/users/profile`
2. WorktimeProvider → `/api/worktime/active`
3. OrganizationProvider → `/api/organizations/current`
4. OnboardingProvider → `/api/users/onboarding/status`
5. BranchProvider → `/api/branches/user` (nach User-Load)

**Phase 2: Page-Komponente (sequenziell)**

**Dashboard:**
1. Requests → `/saved-filters/requests-table`
2. Requests → `/requests?filterId=X` (nach Filter-Load)
3. Requests → `/requests` (nach 2 Sekunden)

**Worktracker:**
1. Worktracker → `/saved-filters/worktracker-todos`
2. Worktracker → `/tasks?filterId=X` (nach Filter-Load)
3. Worktracker → `/tasks` (nach 2 Sekunden)
4. SavedFilterTags → `/saved-filters/{tableId}` + `/saved-filters/groups/{tableId}` (parallel)

**Fakt:** Request-Reihenfolge ist dokumentiert.

---

## 📋 ZUSAMMENFASSUNG: FAKTEN AUS CODE

### Performance-Logging

1. ✅ `getAllRequests` loggt Query-Zeit
2. ✅ `getAllTasks` loggt Query-Zeit
3. ❌ Kein Logging für andere Endpoints

### API-Calls beim initialen Laden

1. ✅ 5 parallele Context-Provider Requests
2. ✅ Sequenzielle Requests in Requests-Komponente
3. ✅ Sequenzielle Requests in Worktracker-Komponente
4. ✅ 2 parallele Requests in SavedFilterTags

### Caching

1. ✅ FilterCache verwendet
2. ✅ OrganizationCache verwendet
3. ✅ UserCache verwendet
4. ✅ WorktimeCache verwendet
5. ❌ Kein BranchCache
6. ❌ Kein OnboardingCache

### Request-Flow

1. ✅ Requests: Filter → Requests mit Filter (blockierend) → alle Requests (nach 2s)
2. ✅ Tasks: Filter → Tasks mit Filter (blockierend) → alle Tasks (nach 2s)

---

**Erstellt:** 2025-01-22  
**Status:** 📊 Fakten aus Code-Analyse  
**Nächste Aktion:** Server-Logs prüfen für tatsächliche Query-Zeiten

