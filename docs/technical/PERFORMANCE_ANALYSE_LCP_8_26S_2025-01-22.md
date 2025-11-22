# Performance-Analyse: LCP 8.26s - KRITISCH (2025-01-22)

**Datum:** 2025-01-22  
**Status:** 🔴 KRITISCH - Analyse in Arbeit  
**Problem:** LCP (Largest Contentful Paint) von 8.26s - "poor" Performance

---

## 📊 GEMESSENE PERFORMANCE-DATEN

### Chrome DevTools Performance Tab:

**LCP (Largest Contentful Paint):**
- **Wert:** 8.26s
- **Status:** 🔴 "poor" (rot)
- **LCP-Element:** `span.text-gray-900.dark:text-white.flex-1.min-w-0.break-wor...`

**CLS (Cumulative Layout Shift):**
- **Wert:** 0.03
- **Status:** ✅ "good" (grün)

**INP (Interaction to Next Paint):**
- **Status:** ⏳ Noch nicht gemessen

**System-Metriken:**
- **CPU Usage:** 4.5% (aktuell), Spikes bei 16:29:00 und 16:29:20
- **JS Heap Size:** 54.4 MB
- **DOM Nodes:** 2,544
- **JS Event Listeners:** 346
- **Documents:** 6
- **Document Frames:** 6
- **Layouts/sec:** 0
- **Style recalcs/sec:** 0

---

## 🔍 LCP-ELEMENT IDENTIFIZIERT

**CSS-Klassen:** `text-gray-900 dark:text-white flex-1 min-w-0 break-words`

**Gefunden in:**
- `frontend/src/components/shared/DataCard.tsx` (Zeile 261)
- Verwendet für: Beschreibungstext in DataCard-Komponenten

**Kontext:**
- DataCard wird verwendet für:
  - Requests (Dashboard)
  - Tasks (Worktracker)
  - Reservations (Worktracker)

**Problem:**
- LCP-Element ist wahrscheinlich ein Request-Titel oder Task-Titel
- Wird erst nach 8.26s sichtbar
- **KRITISCH:** User sieht erst nach 8.26s den ersten sichtbaren Inhalt

---

## 🔴 ROOT CAUSE ANALYSE

### Problem 1: 5 parallele API-Calls beim initialen Laden

**Request-Flow beim initialen Laden (nach Login/Refresh):**

1. **AuthProvider** (useAuth.tsx:41-56)
   - Beim Mount: `fetchCurrentUser()` → `/users/profile`
   - **Status:** ✅ Optimiert (includeSettings=false, etc.)
   - **Geschätzte Zeit:** 0.15-0.6s (nach Optimierung)

2. **WorktimeProvider** (WorktimeContext.tsx:47-57)
   - Beim Mount: `checkTrackingStatus()` → `/api/worktime/active`
   - **Status:** ✅ Optimiert (WorktimeCache, 5s TTL)
   - **Geschätzte Zeit:** 0.01-0.2s

3. **OrganizationProvider** (OrganizationContext.tsx:51-58)
   - Beim Mount: `fetchOrganization()` → `/api/organizations/current`
   - **Status:** ✅ Optimiert (OrganizationCache verwendet)
   - **Geschätzte Zeit:** 0.01-0.05s

4. **BranchProvider** (BranchContext.tsx:80-84)
   - Nach User-Load: `loadBranches()` → `/api/branches/user`
   - **Status:** ❌ **KEIN CACHING**
   - **Geschätzte Zeit:** 0.1-0.3s

5. **OnboardingContext** (OnboardingContext.tsx:275)
   - Beim Mount: `getOnboardingStatus()` → `/api/users/onboarding/status`
   - **Status:** ❌ **KEIN CACHING**
   - **Geschätzte Zeit:** 0.05-0.2s

**Gesamt-Zeit für Context-Initialisierung:**
- **Geschätzt:** 0.32-1.35s (wenn alle parallel laufen)
- **ABER:** Summiert sich, wenn sequenziell oder blockierend

---

### Problem 2: Page-Komponenten machen API-Calls beim Mount

**Dashboard.tsx:**
- Rendert `<Requests />` Komponente
- `<Requests />` macht API-Call beim Mount:
  - `setInitialFilterAndLoad()` → `/saved-filters/requests-table`
  - `fetchRequests(filterId)` → `/api/requests?filterId=X`
  - **Geschätzte Zeit:** 0.5-2s (je nach Filter-Komplexität)

**Worktracker.tsx:**
- Rendert `<WorktimeTracker />` (verwendet WorktimeContext ✅)
- Rendert `<SavedFilterTags />` → macht API-Call beim Mount
- Rendert Tasks → macht API-Call beim Mount:
  - `setInitialFilterAndLoad()` → `/saved-filters/worktracker-todos`
  - `fetchTasks(filterId)` → `/api/tasks?filterId=X`
  - **Geschätzte Zeit:** 0.5-2s

**Requests.tsx:**
- `useEffect` beim Mount (Zeile 523):
  - `setInitialFilterAndLoad()` → `/saved-filters/requests-table`
  - `fetchRequests(filterId)` → `/api/requests?filterId=X`
  - **Geschätzte Zeit:** 0.5-2s

**SavedFilterTags.tsx:**
- Macht API-Call beim Mount:
  - `GET /saved-filters/{tableId}`
  - **Geschätzte Zeit:** 0.1-0.3s

---

### Problem 3: Sequenzielle Abhängigkeiten

**Request-Flow:**
1. Context-Provider initialisieren (5 parallele Requests) → 0.32-1.35s
2. Layout rendern (Header, Sidebar) → 0.01-0.1s
3. Page-Komponente rendern (Dashboard/Worktracker) → 0.01-0.1s
4. Page-Komponente macht API-Call (Requests/Tasks) → 0.5-2s
5. **Gesamt:** 0.84-3.55s

**ABER:** LCP ist 8.26s - **4.71-7.42s zusätzliche Verzögerung!**

---

### Problem 4: Mögliche Blocking-Faktoren

**1. Database-Queries sind langsam:**
- `/api/requests?filterId=X` könnte langsam sein
- `/api/tasks?filterId=X` könnte langsam sein
- Komplexe WHERE-Klauseln
- Fehlende Indizes

**2. Network-Latenz:**
- Server-Response-Zeit
- JSON-Parsing-Zeit
- Große Response-Payloads

**3. React-Rendering:**
- Viele Komponenten werden gerendert
- Komplexe Berechnungen beim Rendering
- Re-Renders durch State-Updates

**4. JavaScript-Execution:**
- Große Bundle-Size
- Langsame JavaScript-Execution
- Blocking JavaScript

---

## 🔍 DETAILLIERTE ANALYSE: Was passiert in den 8.26s?

### Phase 1: Context-Initialisierung (0.32-1.35s)

**Parallel:**
- AuthProvider → `/users/profile` (0.15-0.6s)
- WorktimeProvider → `/api/worktime/active` (0.01-0.2s)
- OrganizationProvider → `/api/organizations/current` (0.01-0.05s)
- BranchProvider → `/api/branches/user` (0.1-0.3s) ❌ **KEIN CACHE**
- OnboardingProvider → `/api/users/onboarding/status` (0.05-0.2s) ❌ **KEIN CACHE**

**Blocking:**
- Layout wird erst gerendert, wenn User geladen ist
- Page-Komponente wird erst gerendert, wenn Layout gerendert ist

---

### Phase 2: Layout-Rendering (0.01-0.1s)

**Komponenten:**
- Header (React.memo ✅)
- Sidebar (React.memo ✅)
- Layout-Container

**Status:** ✅ Optimiert (keine unnötigen Re-Renders)

---

### Phase 3: Page-Komponente Rendering (0.01-0.1s)

**Dashboard:**
- Rendert `<WorktimeStats />` (verwendet WorktimeContext ✅)
- Rendert `<Requests />` (macht API-Call beim Mount ❌)

**Worktracker:**
- Rendert `<WorktimeTracker />` (verwendet WorktimeContext ✅)
- Rendert `<SavedFilterTags />` (macht API-Call beim Mount ❌)
- Rendert Tasks (macht API-Call beim Mount ❌)

---

### Phase 4: Page-Komponente API-Calls (0.5-2s+)

**Dashboard - Requests:**
1. `setInitialFilterAndLoad()` → `/saved-filters/requests-table` (0.1-0.3s)
2. `fetchRequests(filterId)` → `/api/requests?filterId=X` (0.5-2s)
3. **Gesamt:** 0.6-2.3s

**Worktracker - Tasks:**
1. `setInitialFilterAndLoad()` → `/saved-filters/worktracker-todos` (0.1-0.3s)
2. `fetchTasks(filterId)` → `/api/tasks?filterId=X` (0.5-2s)
3. **Gesamt:** 0.6-2.3s

**Worktracker - SavedFilterTags:**
1. `GET /saved-filters/{tableId}` (0.1-0.3s)

---

### Phase 5: Daten-Rendering (0.1-0.5s)

**Nach API-Response:**
- State-Update
- Re-Render mit Daten
- LCP-Element wird sichtbar

---

## 🔴 KRITISCHE PROBLEME IDENTIFIZIERT

### Problem 1: BranchCache fehlt ❌

**Endpoint:** `/api/branches/user`
- **Status:** ❌ Kein Caching
- **Geschätzte Zeit:** 0.1-0.3s
- **Impact:** Jeder initiale Load macht DB-Query

**Lösung:** BranchCache implementieren (TTL: 5-10 Min)

---

### Problem 2: OnboardingCache fehlt ❌

**Endpoint:** `/api/users/onboarding/status`
- **Status:** ❌ Kein Caching
- **Geschätzte Zeit:** 0.05-0.2s
- **Impact:** Jeder initiale Load macht DB-Query

**Lösung:** OnboardingCache implementieren (TTL: 5-10 Min)

---

### Problem 3: Page-Komponenten blockieren Rendering ❌

**Problem:**
- `<Requests />` macht API-Call beim Mount
- `<SavedFilterTags />` macht API-Call beim Mount
- Tasks machen API-Call beim Mount
- **LCP-Element wird erst sichtbar, wenn API-Response da ist**

**Lösung:**
- Skeleton-Loading für LCP-Element
- Oder: LCP-Element sofort rendern (mit Placeholder-Daten)
- API-Calls im Hintergrund

---

### Problem 4: `/api/requests` und `/api/tasks` könnten langsam sein ❌

**Problem:**
- Komplexe WHERE-Klauseln
- Fehlende Indizes
- Große Response-Payloads

**Lösung:**
- Query-Performance prüfen
- Indizes prüfen
- Pagination implementieren

---

## 📊 ZUSAMMENFASSUNG: Was verursacht die 8.26s?

### Geschätzte Zeit-Aufteilung:

| Phase | Geschätzte Zeit | Status |
|-------|----------------|--------|
| Context-Initialisierung | 0.32-1.35s | ⚠️ Teilweise optimiert |
| Layout-Rendering | 0.01-0.1s | ✅ Optimiert |
| Page-Komponente Rendering | 0.01-0.1s | ✅ OK |
| Page-Komponente API-Calls | 0.6-2.3s | ❌ Blocking |
| Daten-Rendering | 0.1-0.5s | ✅ OK |
| **GESAMT (geschätzt)** | **1.04-4.35s** | ⚠️ |
| **GEMESSEN (LCP)** | **8.26s** | 🔴 |

**Differenz:** 3.91-7.22s zusätzliche Verzögerung!

**Mögliche Ursachen für die Differenz:**
1. Database-Queries sind langsamer als geschätzt (2-5s statt 0.5-2s)
2. Network-Latenz (1-2s)
3. JavaScript-Execution (0.5-1s)
4. React-Rendering (0.5-1s)
5. Andere Blocking-Faktoren

---

## 🎯 LÖSUNGSPLAN (Priorisiert)

### Priorität 1: BranchCache implementieren 🔴🔴 KRITISCH

**Problem:** `/api/branches/user` hat kein Caching

**Lösung:**
- Neuer `BranchCache` Service
- TTL: 5-10 Minuten
- Cache invalidiert bei Branch-Änderungen

**Erwartete Verbesserung:** 0.1-0.3s → 0.01-0.03s (80-90% schneller)

---

### Priorität 2: OnboardingCache implementieren 🔴🔴 KRITISCH

**Problem:** `/api/users/onboarding/status` hat kein Caching

**Lösung:**
- Neuer `OnboardingCache` Service
- TTL: 5-10 Minuten
- Cache invalidiert bei Onboarding-Änderungen

**Erwartete Verbesserung:** 0.05-0.2s → 0.005-0.02s (80-90% schneller)

---

### Priorität 3: Skeleton-Loading für LCP-Element 🔴 HOCH

**Problem:** LCP-Element wird erst nach API-Response sichtbar

**Lösung:**
- Skeleton-Loading für Requests/Tasks
- LCP-Element sofort rendern (mit Skeleton)
- API-Calls im Hintergrund

**Erwartete Verbesserung:** LCP von 8.26s → 0.5-1s (85-95% schneller)

---

### Priorität 4: `/api/requests` und `/api/tasks` Performance prüfen 🔴 HOCH

**Problem:** Könnten langsam sein (2-5s statt 0.5-2s)

**Lösung:**
- Query-Performance messen
- Indizes prüfen
- EXPLAIN ANALYZE für Queries

**Erwartete Verbesserung:** 50-70% schneller (wenn Indizes fehlen)

---

### Priorität 5: SavedFilterTags lazy loading 🟡 MITTEL

**Problem:** SavedFilterTags macht API-Call beim Mount

**Lösung:**
- Lazy Loading für SavedFilterTags
- Oder: Caching für SavedFilterTags

**Erwartete Verbesserung:** 0.1-0.3s weniger beim initialen Load

---

## 📋 NÄCHSTE SCHRITTE

1. **Browser DevTools Network-Tab prüfen:**
   - Welche Requests dauern am längsten?
   - Request-Dauer für jeden Endpoint messen
   - Waterfall-Analyse

2. **Server-Logs prüfen:**
   - Query-Dauer für `/api/requests` und `/api/tasks`
   - Cache-Hit-Rate prüfen
   - Database-Performance prüfen

3. **React DevTools Profiler:**
   - Welche Komponenten werden langsam gerendert?
   - Re-Render-Analyse
   - Performance-Bottlenecks identifizieren

---

**Erstellt:** 2025-01-22  
**Status:** 🔴 Analyse in Arbeit  
**Nächste Aktion:** Browser DevTools Network-Tab prüfen, Server-Logs prüfen

