# Performance-Fakten: Finale Zusammenfassung (2025-01-22)

**Datum:** 2025-01-22  
**Status:** 📊 Fakten aus Code-Analyse  
**Hinweis:** Nur Fakten, keine Vermutungen

---

## 📊 GEMESSENE WERTE (AUS CHROME DEVTOOLS)

### LCP (Largest Contentful Paint)
- **Wert:** 8.26s
- **Status:** 🔴 "poor" (rot)
- **LCP-Element:** `span.text-gray-900.dark:text-white.flex-1.min-w-0.break-wor...`
- **Quelle:** Chrome DevTools Performance Tab

### CLS (Cumulative Layout Shift)
- **Wert:** 0.03
- **Status:** ✅ "good" (grün)

### System-Metriken
- **CPU Usage:** 4.5% (aktuell), Spikes bei 16:29:00 und 16:29:20
- **JS Heap Size:** 54.4 MB
- **DOM Nodes:** 2,544
- **JS Event Listeners:** 346
- **Documents:** 6
- **Document Frames:** 6

---

## 📋 API-CALLS BEIM INITIALEN LADEN (AUS CODE)

### Context-Provider (5 parallele Requests)

**1. AuthProvider** (`frontend/src/hooks/useAuth.tsx:41-56`)
- **Endpoint:** `/users/profile`
- **Query-Parameter:** `includeSettings=false&includeInvoiceSettings=false&includeDocuments=false`
- **Zeitpunkt:** Beim Mount

**2. WorktimeProvider** (`frontend/src/contexts/WorktimeContext.tsx:47-57`)
- **Endpoint:** `/api/worktime/active`
- **Zeitpunkt:** Beim Mount

**3. OrganizationProvider** (`frontend/src/contexts/OrganizationContext.tsx:51-58`)
- **Endpoint:** `/api/organizations/current`
- **Zeitpunkt:** Beim Mount

**4. BranchProvider** (`frontend/src/contexts/BranchContext.tsx:80-84`)
- **Endpoint:** `/api/branches/user`
- **Zeitpunkt:** Nach User-Load

**5. OnboardingProvider** (`frontend/src/contexts/OnboardingContext.tsx:275`)
- **Endpoint:** `/api/users/onboarding/status`
- **Zeitpunkt:** Beim Mount

---

### Dashboard - Requests-Komponente

**Code:** `frontend/src/components/Requests.tsx:523-572`

**Request-Flow:**
1. `GET /saved-filters/requests-table` (Zeile 526)
2. `GET /requests?filterId=X` (Zeile 554) - **blockierend, nach Request 1**
3. `GET /requests` (Zeile 558) - **nach 2 Sekunden (setTimeout)**

**Fakt:** Sequenzielle Requests: Filter → Requests mit Filter (blockierend) → alle Requests (nach 2s).

---

### Worktracker - Tasks

**Code:** `frontend/src/pages/Worktracker.tsx:521-567`

**Request-Flow:**
1. `GET /saved-filters/worktracker-todos` (Zeile 524)
2. `GET /tasks?filterId=X` (Zeile 549) - **blockierend, nach Request 1**
3. `GET /tasks` (Zeile 553) - **nach 2 Sekunden (setTimeout)**

**Fakt:** Sequenzielle Requests: Filter → Tasks mit Filter (blockierend) → alle Tasks (nach 2s).

---

### SavedFilterTags

**Code:** `frontend/src/components/SavedFilterTags.tsx:205-247`

**Request-Flow:**
1. `GET /saved-filters/{tableId}` (Zeile 218)
2. `GET /saved-filters/groups/{tableId}` (Zeile 219)
3. **Beide parallel:** `Promise.all([...])` (Zeile 217)

**Fakt:** 2 parallele Requests beim Mount.

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

**Fakt:** Query-Zeit wird gemessen und geloggt.

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

**Fakt:** Query-Zeit wird gemessen und geloggt.

---

## 📊 CACHING-STATUS (AUS CODE)

### FilterCache
- **Verwendet in:** `getAllRequests` (Zeile 80-96), `getAllTasks` (Zeile 57)
- **Status:** ✅ Implementiert

### OrganizationCache
- **Verwendet in:** `organizationMiddleware`, `getCurrentOrganization` (Zeile 748)
- **Status:** ✅ Implementiert

### UserCache
- **Verwendet in:** `authMiddleware` (Zeile 55)
- **Status:** ✅ Implementiert

### WorktimeCache
- **Verwendet in:** `getActiveWorktime`
- **Status:** ✅ Implementiert

### BranchCache
- **Status:** ❌ Nicht vorhanden

### OnboardingCache
- **Status:** ❌ Nicht vorhanden

---

## 📋 REQUEST-REIHENFOLGE BEIM INITIALEN LADEN

### Phase 1: Context-Provider (parallel)

1. AuthProvider → `/users/profile?includeSettings=false&includeInvoiceSettings=false&includeDocuments=false`
2. WorktimeProvider → `/api/worktime/active`
3. OrganizationProvider → `/api/organizations/current`
4. OnboardingProvider → `/api/users/onboarding/status`
5. BranchProvider → `/api/branches/user` (nach User-Load)

**Fakt:** 5 parallele Requests beim initialen Laden.

---

### Phase 2: Page-Komponente (sequenziell)

**Dashboard:**
1. Requests → `GET /saved-filters/requests-table`
2. Requests → `GET /requests?filterId=X` (nach Filter-Load, blockierend)
3. Requests → `GET /requests` (nach 2 Sekunden)

**Worktracker:**
1. Worktracker → `GET /saved-filters/worktracker-todos`
2. Worktracker → `GET /tasks?filterId=X` (nach Filter-Load, blockierend)
3. Worktracker → `GET /tasks` (nach 2 Sekunden)
4. SavedFilterTags → `GET /saved-filters/{tableId}` + `GET /saved-filters/groups/{tableId}` (parallel)

**Fakt:** Sequenzielle Requests in Page-Komponenten, blockierend für LCP-Element.

---

## 🔍 WAS NOCH GEMESSEN WERDEN MUSS

### 1. Server-Logs (Query-Zeiten)

**Befehl:**
```bash
pm2 logs intranet-backend --lines 500 | grep -E 'getAllRequests|getAllTasks|Query abgeschlossen'
```

**Zu messen:**
- `[getAllRequests] ✅ Query abgeschlossen: X Requests in Yms`
- `[getAllTasks] ✅ Query abgeschlossen: X Tasks in Yms`

**Status:** ⏳ Noch nicht gemessen (benötigt Server-Zugriff)

---

### 2. Browser DevTools Network-Tab

**Zu messen:**
- Request-Dauer für `/api/requests?filterId=X`
- Request-Dauer für `/api/tasks?filterId=X`
- Request-Dauer für `/saved-filters/requests-table`
- Request-Dauer für `/saved-filters/worktracker-todos`
- Waterfall-Analyse: Welche Requests blockieren?

**Status:** ⏳ Noch nicht gemessen (benötigt Browser-Zugriff)

---

### 3. Database-Performance

**Zu prüfen:**
- EXPLAIN ANALYZE für `getAllRequests` Query
- EXPLAIN ANALYZE für `getAllTasks` Query
- Indizes prüfen

**Status:** ⏳ Noch nicht gemessen (benötigt Database-Zugriff)

---

## 📊 ZUSAMMENFASSUNG: FAKTEN

### Gemessen (Chrome DevTools)
- ✅ LCP: 8.26s (poor)
- ✅ CLS: 0.03 (good)
- ✅ CPU: 4.5% (Spikes bei 16:29:00, 16:29:20)
- ✅ JS Heap: 54.4 MB
- ✅ DOM Nodes: 2,544

### Aus Code-Analyse
- ✅ 5 parallele Context-Provider Requests
- ✅ Sequenzielle Requests in Page-Komponenten
- ✅ Performance-Logging implementiert
- ✅ Caching implementiert (FilterCache, OrganizationCache, UserCache, WorktimeCache)
- ✅ Kein BranchCache
- ✅ Kein OnboardingCache
- ✅ Standard-Limit: 50 (getAllRequests, getAllTasks)

### Noch nicht gemessen
- ⏳ Server-Logs (Query-Zeiten)
- ⏳ Browser DevTools Network-Tab (Request-Dauer)
- ⏳ Database-Performance (EXPLAIN ANALYZE)

---

**Erstellt:** 2025-01-22  
**Status:** 📊 Fakten dokumentiert, Messungen benötigt  
**Nächste Aktion:** Server-Logs prüfen für tatsächliche Query-Zeiten

