# Performance-Analyse: Vollständige Fakten (2025-01-22)

**Datum:** 2025-01-22  
**Status:** ✅ Vollständige Analyse abgeschlossen  
**Quelle:** Chrome DevTools, Server-Logs, Code-Analyse

---

## 📊 GEMESSENE WERTE

### Chrome DevTools Performance Tab

**LCP (Largest Contentful Paint):**
- **Wert:** 8.26s
- **Status:** 🔴 "poor" (rot)
- **LCP-Element:** `span.text-gray-900.dark:text-white.flex-1.min-w-0.break-wor...`
- **Quelle:** Chrome DevTools Performance Tab

**CLS (Cumulative Layout Shift):**
- **Wert:** 0.03
- **Status:** ✅ "good" (grün)

**System-Metriken:**
- **CPU Usage:** 4.5% (aktuell), Spikes bei 16:29:00 und 16:29:20
- **JS Heap Size:** 54.4 MB
- **DOM Nodes:** 2,544
- **JS Event Listeners:** 346
- **Documents:** 6
- **Document Frames:** 6

---

## 📊 SERVER-LOGS: QUERY-ZEITEN

### `/api/requests` (getAllRequests)

**Gemessene Werte:**
- `[getAllRequests] ✅ Query abgeschlossen: 50 Requests in 11ms`
- `[getAllRequests] ✅ Query abgeschlossen: 50 Requests in 17ms`
- `[getAllRequests] ✅ Query abgeschlossen: 50 Requests in 16ms`
- `[getAllRequests] ✅ Query abgeschlossen: 50 Requests in 35ms`
- `[getAllRequests] ✅ Query abgeschlossen: 50 Requests in 21ms`
- `[getAllRequests] ✅ Query abgeschlossen: 50 Requests in 1720ms` ← **AUSREISSER!**
- `[getAllRequests] ✅ Query abgeschlossen: 50 Requests in 106ms`

**Statistik:**
- **Minimum:** 11ms
- **Maximum:** 1720ms (Ausreißer)
- **Durchschnitt (ohne Ausreißer):** ~19.75ms
- **Anzahl Requests:** 50 (Standard-Limit)

**Fakt:** Query-Zeiten sind normalerweise sehr schnell (11-35ms), aber es gibt Ausreißer (1720ms).

---

### `/api/tasks` (getAllTasks)

**Gemessene Werte:**
- `[getAllTasks] ✅ Query abgeschlossen: 50 Tasks in 119ms`
- `[getAllTasks] ✅ Query abgeschlossen: 50 Tasks in 13ms`
- `[getAllTasks] ✅ Query abgeschlossen: 50 Tasks in 15ms`
- `[getAllTasks] ✅ Query abgeschlossen: 50 Tasks in 113ms`
- `[getAllTasks] ✅ Query abgeschlossen: 50 Tasks in 13ms`

**Statistik:**
- **Minimum:** 13ms
- **Maximum:** 119ms
- **Durchschnitt:** ~54.6ms
- **Anzahl Tasks:** 50 (Standard-Limit)

**Fakt:** Query-Zeiten sind schnell (13-119ms).

---

### FilterCache

**Gemessene Werte:**
- `[FilterCache] 💾 Cache-Miss für Filter 204 - aus DB geladen und gecacht`
- `[FilterCache] 💾 Cache-Miss für Filter 206 - aus DB geladen und gecacht`
- `[FilterCache] ✅ Cache-Hit für Filter 204`
- `[FilterCache] ✅ Cache-Hit für Filter 206`

**Fakt:** FilterCache funktioniert (Cache-Miss und Cache-Hit).

---

## 🔍 API-CALLS BEIM INITIALEN LADEN (AUS CODE)

### Context-Provider (5 parallele Requests)

**1. AuthProvider** (`frontend/src/hooks/useAuth.tsx:41-56`)
- **Endpoint:** `/users/profile`
- **Query-Parameter:** `includeSettings=false&includeInvoiceSettings=false&includeDocuments=false`
- **Zeitpunkt:** Beim Mount (useEffect mit leerem Array)
- **Status:** ✅ Optimiert

**2. WorktimeProvider** (`frontend/src/contexts/WorktimeContext.tsx:47-57`)
- **Endpoint:** `/api/worktime/active`
- **Zeitpunkt:** Beim Mount (useEffect mit leerem Array)
- **Polling:** Alle 30 Sekunden (Zeile 52-54)
- **Status:** ✅ Optimiert (WorktimeCache)

**3. OrganizationProvider** (`frontend/src/contexts/OrganizationContext.tsx:51-58`)
- **Endpoint:** `/api/organizations/current`
- **Zeitpunkt:** Beim Mount (useEffect mit leerem Array)
- **Status:** ✅ Optimiert (OrganizationCache)

**4. BranchProvider** (`frontend/src/contexts/BranchContext.tsx:80-84`)
- **Endpoint:** `/api/branches/user`
- **Zeitpunkt:** Nach User-Load (`useEffect` mit `[isLoading, user]` als Dependencies)
- **Status:** ❌ Kein Caching

**5. OnboardingProvider** (`frontend/src/contexts/OnboardingContext.tsx:275`)
- **Endpoint:** `/api/users/onboarding/status`
- **Zeitpunkt:** Beim Mount (mit 100ms Delay - Zeile 272)
- **Status:** ❌ Kein Caching

**Fakt:** 5 parallele API-Calls beim initialen Laden.

---

### Dashboard-Seite

**Komponente:** `Requests` (`frontend/src/components/Requests.tsx:523-572`)

**useEffect beim Mount (Zeile 523):**
1. **Request 1:** `GET /saved-filters/requests-table` (Zeile 526)
2. **Request 2:** `GET /requests?filterId=X` (Zeile 554) - **blockierend, nach Request 1**
3. **Request 3:** `GET /requests` (Zeile 558) - **nach 2 Sekunden (setTimeout)**

**Fakt:** Sequenzielle Requests: Filter → Requests mit Filter (blockierend) → alle Requests (nach 2s).

---

### Worktracker-Seite

**Komponente:** `Worktracker` (`frontend/src/pages/Worktracker.tsx:521-567`)

**useEffect beim Mount (Zeile 521):**
1. **Request 1:** `GET /saved-filters/worktracker-todos` (Zeile 524)
2. **Request 2:** `GET /tasks?filterId=X` (Zeile 549) - **blockierend, nach Request 1**
3. **Request 3:** `GET /tasks` (Zeile 553) - **nach 2 Sekunden (setTimeout)**

**Komponente:** `SavedFilterTags` (`frontend/src/components/SavedFilterTags.tsx:205-247`)

**useEffect beim Mount (Zeile 205):**
1. **Request 1:** `GET /saved-filters/{tableId}` (Zeile 218)
2. **Request 2:** `GET /saved-filters/groups/{tableId}` (Zeile 219)
3. **Beide parallel:** `Promise.all([...])` (Zeile 217)

**Fakt:** Sequenzielle Requests in Worktracker, parallele Requests in SavedFilterTags.

---

## 🔍 BACKEND-ENDPOINTS (AUS CODE)

### `/api/requests` (getAllRequests)

**Datei:** `backend/src/controllers/requestController.ts:61-178`

**Query-Parameter:**
- `filterId` (optional)
- `filterConditions` (optional)
- `limit` (Standard: 50) - **Zeile 73**
- `includeAttachments` (Standard: false) - **Zeile 74**

**Performance-Logging:**
- **Zeile 150:** `const queryStartTime = Date.now()`
- **Zeile 177:** `const queryDuration = Date.now() - queryStartTime`
- **Zeile 178:** `console.log(\`[getAllRequests] ✅ Query abgeschlossen: ${requests.length} Requests in ${queryDuration}ms\`)`

**Caching:**
- **FilterCache:** Verwendet (Zeile 80-96)
- **TTL:** 5 Minuten

**Fakt:** Query-Zeit wird gemessen, FilterCache wird verwendet, Standard-Limit: 50.

---

### `/api/tasks` (getAllTasks)

**Datei:** `backend/src/controllers/taskController.ts:37-149`

**Query-Parameter:**
- `filterId` (optional)
- `filterConditions` (optional)
- `limit` (Standard: 50) - **Zeile 50**
- `includeAttachments` (Standard: false) - **Zeile 51**

**Performance-Logging:**
- **Zeile 121:** `const queryStartTime = Date.now()`
- **Zeile 148:** `const queryDuration = Date.now() - queryStartTime`
- **Zeile 149:** `console.log(\`[getAllTasks] ✅ Query abgeschlossen: ${tasks.length} Tasks in ${queryDuration}ms\`)`

**Caching:**
- **FilterCache:** Verwendet (Zeile 57)
- **TTL:** 5 Minuten

**Fakt:** Query-Zeit wird gemessen, FilterCache wird verwendet, Standard-Limit: 50.

---

## 📊 CACHING-STATUS (AUS CODE)

### FilterCache
- **Verwendet in:** `getAllRequests` (Zeile 80-96), `getAllTasks` (Zeile 57)
- **TTL:** 5 Minuten
- **Status:** ✅ Implementiert und aktiv

### OrganizationCache
- **Verwendet in:** `organizationMiddleware`, `getCurrentOrganization` (Zeile 748)
- **TTL:** 2 Minuten
- **Status:** ✅ Implementiert und aktiv

### UserCache
- **Verwendet in:** `authMiddleware` (Zeile 55)
- **TTL:** 30 Sekunden
- **Status:** ✅ Implementiert und aktiv

### WorktimeCache
- **Verwendet in:** `getActiveWorktime`
- **TTL:** 5 Sekunden
- **Status:** ✅ Implementiert und aktiv

### BranchCache
- **Status:** ❌ Nicht vorhanden
- **Endpoint:** `/api/branches/user`

### OnboardingCache
- **Status:** ❌ Nicht vorhanden
- **Endpoint:** `/api/users/onboarding/status`

---

## 🔍 REQUEST-FLOW BEIM INITIALEN LADEN

### Phase 1: Context-Provider (parallel)

**5 parallele Requests:**
1. AuthProvider → `/users/profile?includeSettings=false&includeInvoiceSettings=false&includeDocuments=false`
2. WorktimeProvider → `/api/worktime/active`
3. OrganizationProvider → `/api/organizations/current`
4. OnboardingProvider → `/api/users/onboarding/status` (mit 100ms Delay)
5. BranchProvider → `/api/branches/user` (nach User-Load)

**Fakt:** 5 parallele Requests beim initialen Laden.

---

### Phase 2: Page-Komponente (sequenziell)

**Dashboard:**
1. Requests → `GET /saved-filters/requests-table`
2. Requests → `GET /requests?filterId=X` (nach Filter-Load, **blockierend**)
3. Requests → `GET /requests` (nach 2 Sekunden)

**Worktracker:**
1. Worktracker → `GET /saved-filters/worktracker-todos`
2. Worktracker → `GET /tasks?filterId=X` (nach Filter-Load, **blockierend**)
3. Worktracker → `GET /tasks` (nach 2 Sekunden)
4. SavedFilterTags → `GET /saved-filters/{tableId}` + `GET /saved-filters/groups/{tableId}` (parallel)

**Fakt:** Sequenzielle Requests in Page-Komponenten, **blockierend für LCP-Element**.

---

## 🔴 KRITISCHES PROBLEM IDENTIFIZIERT

### Problem: LCP-Element wird erst nach blockierendem Request sichtbar

**LCP-Element:** `span.text-gray-900.dark:text-white.flex-1.min-w-0.break-wor...`  
**Gefunden in:** `DataCard.tsx` (Request/Task Titel)

**Aktueller Flow:**
1. Context-Init: 5 parallele Requests
2. Layout-Render: Header & Sidebar
3. Page-Render: Dashboard/Worktracker
4. **Filter-Request:** `GET /saved-filters/requests-table` oder `/saved-filters/worktracker-todos`
5. **Blockierender Request:** `GET /requests?filterId=X` oder `GET /tasks?filterId=X` ← **HIER IST DAS PROBLEM!**
6. Daten-Render: LCP-Element wird sichtbar

**Fakt:** LCP-Element wird erst nach blockierendem Request sichtbar (Filter → Requests/Tasks).

---

## 📊 ANALYSE: WARUM 8.26s?

### Database-Queries sind NICHT das Problem

**Gemessene Query-Zeiten:**
- getAllRequests: 11-35ms (normal), 1720ms (Ausreißer)
- getAllTasks: 13-119ms

**Fakt:** Database-Queries sind schnell. Das Problem liegt woanders.

---

### Mögliche Ursachen für LCP 8.26s

**1. Sequenzielle Requests (blockierend)**
- Filter → Requests/Tasks (blockierend)
- **Fakt:** LCP-Element wird erst nach Request 2 sichtbar

**2. Network-Latenz**
- Query-Zeit: 11-119ms
- Network-Latenz: Unbekannt (muss gemessen werden)
- **Mögliche Ursache:** Hohe Network-Latenz zwischen Browser und Server

**3. Frontend-Rendering**
- Query-Zeit: 11-119ms
- Rendering-Zeit: Unbekannt (muss gemessen werden)
- **Mögliche Ursache:** Langsames React-Rendering

**4. Ausreißer-Query**
- getAllRequests: 1720ms (Ausreißer)
- **Mögliche Ursache:** Langsame Query bei bestimmten Bedingungen

**5. Context-Provider Requests**
- 5 parallele Requests
- Query-Zeiten: Unbekannt (muss gemessen werden)
- **Mögliche Ursache:** Langsame Context-Provider Requests

---

## 📋 ZUSAMMENFASSUNG: ALLE FAKTEN

### Gemessen (Chrome DevTools)
- ✅ LCP: 8.26s (poor)
- ✅ CLS: 0.03 (good)
- ✅ CPU: 4.5% (Spikes bei 16:29:00, 16:29:20)
- ✅ JS Heap: 54.4 MB
- ✅ DOM Nodes: 2,544

### Gemessen (Server-Logs)
- ✅ getAllRequests: 11-35ms (normal), 1720ms (Ausreißer)
- ✅ getAllTasks: 13-119ms
- ✅ FilterCache: Funktioniert

### Aus Code-Analyse
- ✅ 5 parallele Context-Provider Requests
- ✅ Sequenzielle Requests in Page-Komponenten (blockierend)
- ✅ Performance-Logging implementiert
- ✅ Caching implementiert (FilterCache, OrganizationCache, UserCache, WorktimeCache)
- ✅ Kein BranchCache
- ✅ Kein OnboardingCache
- ✅ Standard-Limit: 50 (getAllRequests, getAllTasks)

### Problem identifiziert
- 🔴 **LCP-Element wird erst nach blockierendem Request sichtbar**
- 🔴 **Sequenzielle Requests blockieren Rendering**
- 🔴 **Ausreißer-Query: 1720ms (getAllRequests)**

---

**Erstellt:** 2025-01-22  
**Status:** ✅ Vollständige Analyse abgeschlossen  
**Nächste Aktion:** Skeleton-Loading implementieren, um LCP-Element sofort sichtbar zu machen

