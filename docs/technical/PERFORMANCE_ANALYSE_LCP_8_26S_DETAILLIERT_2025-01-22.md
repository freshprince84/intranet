# Performance-Analyse: LCP 8.26s - Detaillierte Analyse (2025-01-22)

**Datum:** 2025-01-22  
**Status:** 🔴 KRITISCH - Detaillierte Analyse  
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

**System-Metriken:**
- **CPU Usage:** 4.5% (aktuell), Spikes bei 16:29:00 und 16:29:20
- **JS Heap Size:** 54.4 MB
- **DOM Nodes:** 2,544
- **JS Event Listeners:** 346
- **Documents:** 6
- **Document Frames:** 6

---

## ✅ BEREITS IMPLEMENTIERTE OPTIMIERUNGEN (aus Dokumenten)

### 1. Backend Caching ✅

| Cache | TTL | Verwendet in | Status |
|-------|-----|--------------|--------|
| **OrganizationCache** | 2 Min | organizationMiddleware, getCurrentOrganization | ✅ Implementiert |
| **UserCache** | 30s | authMiddleware | ✅ Implementiert |
| **WorktimeCache** | 5s | getActiveWorktime | ✅ Implementiert |
| **FilterCache** | 5 Min | getAllRequests, getAllTasks | ✅ Implementiert |
| **UserLanguageCache** | ? | getUserLanguage | ✅ Implementiert |
| **NotificationSettingsCache** | ? | getNotificationSettings | ✅ Implementiert |

### 2. Backend Query-Optimierungen ✅

- ✅ `/users/profile` - Query-Parameter für Settings/InvoiceSettings/Documents
- ✅ `getAllRequests` - Vereinfachte WHERE-Klausel
- ✅ `getAllTasks` - Vereinfachte WHERE-Klausel
- ✅ `getAllReservations` - Optimierung

### 3. Backend Cache-Warming ✅

- ✅ Beim Login: UserCache und OrganizationCache werden vorher gefüllt
- ✅ Code: `backend/src/controllers/authController.ts:309-348`

### 4. Frontend Optimierungen ✅

- ✅ `/users/profile` - Query-Parameter `includeSettings=false&includeInvoiceSettings=false&includeDocuments=false`
- ✅ WorktimeTracker verwendet WorktimeContext (kein redundanter Request)
- ✅ Header & Sidebar React.memo()
- ✅ Custom Event für Navigation statt window.location.href

---

## ❌ NOCH NICHT IMPLEMENTIERT

### 1. BranchCache ❌

**Endpoint:** `/api/branches/user`  
**Datei:** `backend/src/controllers/branchController.ts:167-214`  
**Status:** ❌ Kein Caching  
**Geschätzte Zeit:** 0.1-0.3s  
**Impact:** Niedrig (nur 0.1-0.3s Verbesserung)

**Warum noch nicht implementiert:**
- Dokument `PERFORMANCE_ANALYSE_3-5_DETAILLIERT_2025-01-22.md` zeigt: "Niedrige Priorität"
- Impact ist gering (0.1-0.3s → 0.01-0.03s)
- Filter-Komplexität könnte Cache-Hit-Rate reduzieren

---

### 2. OnboardingCache ❌

**Endpoint:** `/api/users/onboarding/status`  
**Datei:** `backend/src/controllers/userController.ts:2085-2109`  
**Status:** ❌ Kein Caching  
**Geschätzte Zeit:** 0.05-0.1s  
**Impact:** Sehr niedrig (nur 0.05-0.1s Verbesserung)

**Warum noch nicht implementiert:**
- Dokument `PERFORMANCE_ANALYSE_3-5_DETAILLIERT_2025-01-22.md` zeigt: "Niedrige Priorität"
- Query ist bereits sehr schnell (0.05-0.1s)
- Impact ist gering (0.05-0.1s → 0.001s)

---

### 3. Skeleton-Loading für LCP-Element ❌

**Problem:** LCP-Element wird erst nach API-Response sichtbar  
**Status:** ❌ Nicht implementiert  
**Impact:** 🔴🔴 KRITISCH (LCP von 8.26s → 0.5-1s möglich)

---

### 4. 3-Phasen-Laden ❌

**Konzept:** Kritische Daten zuerst, dann sichtbare, dann Hintergrund  
**Status:** ❌ Nicht implementiert  
**Impact:** 🔴 HOCH (subjektive Verbesserung)

---

## 🔍 DETAILLIERTE ANALYSE: Was passiert in den 8.26s?

### Phase 1: Context-Initialisierung (0.32-1.35s geschätzt)

**5 parallele API-Calls beim initialen Laden:**

1. **AuthProvider** → `/users/profile`
   - **Status:** ✅ Optimiert (includeSettings=false, etc.)
   - **Cache:** UserCache (30s TTL) ✅
   - **Cache-Warming:** ✅ Beim Login
   - **Geschätzte Zeit:** 0.15-0.6s (nach Optimierung)

2. **WorktimeProvider** → `/api/worktime/active`
   - **Status:** ✅ Optimiert (WorktimeCache, 5s TTL)
   - **Geschätzte Zeit:** 0.01-0.2s

3. **OrganizationProvider** → `/api/organizations/current`
   - **Status:** ✅ Optimiert (OrganizationCache verwendet)
   - **Cache-Warming:** ✅ Beim Login
   - **Geschätzte Zeit:** 0.01-0.05s

4. **BranchProvider** → `/api/branches/user`
   - **Status:** ❌ Kein Caching
   - **Geschätzte Zeit:** 0.1-0.3s

5. **OnboardingProvider** → `/api/users/onboarding/status`
   - **Status:** ❌ Kein Caching
   - **Geschätzte Zeit:** 0.05-0.1s

**Gesamt-Zeit für Context-Init (parallel):**
- **Geschätzt:** 0.32-1.35s (langsamster Request)
- **ABER:** Summiert sich, wenn sequenziell oder blockierend

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

### Phase 4: Page-Komponente API-Calls (0.5-2s+ geschätzt, ABER könnte 2-5s sein!)

**Dashboard - Requests:**
1. `setInitialFilterAndLoad()` → `/saved-filters/requests-table`
   - **Status:** ✅ FilterCache (5 Min TTL)
   - **Geschätzte Zeit:** 0.01-0.05s (Cache-Hit) oder 0.1-0.3s (Cache-Miss)

2. `fetchRequests(filterId)` → `/api/requests?filterId=X`
   - **Status:** ✅ Optimiert (vereinfachte WHERE-Klausel, FilterCache)
   - **Geschätzte Zeit:** 0.5-2s (ABER könnte 2-5s sein bei großen Datenmengen!)

**Worktracker - Tasks:**
1. `setInitialFilterAndLoad()` → `/saved-filters/worktracker-todos`
   - **Status:** ✅ FilterCache (5 Min TTL)
   - **Geschätzte Zeit:** 0.01-0.05s (Cache-Hit) oder 0.1-0.3s (Cache-Miss)

2. `fetchTasks(filterId)` → `/api/tasks?filterId=X`
   - **Status:** ✅ Optimiert (vereinfachte WHERE-Klausel, FilterCache)
   - **Geschätzte Zeit:** 0.5-2s (ABER könnte 2-5s sein bei großen Datenmengen!)

**Worktracker - SavedFilterTags:**
1. `GET /saved-filters/{tableId}`
   - **Status:** ❌ Kein Caching (könnte gecacht werden)
   - **Geschätzte Zeit:** 0.1-0.3s

---

### Phase 5: Daten-Rendering (0.1-0.5s)

**Nach API-Response:**
- State-Update
- Re-Render mit Daten
- **LCP-Element wird sichtbar** ← **HIER IST DAS PROBLEM!**

---

## 🔴 KRITISCHES PROBLEM IDENTIFIZIERT

### Problem: LCP-Element wird erst nach API-Response sichtbar

**LCP-Element:** `span.text-gray-900.dark:text-white.flex-1.min-w-0.break-wor...`  
**Gefunden in:** `DataCard.tsx` (Request/Task Titel)

**Aktueller Flow:**
1. Context-Init: 0.32-1.35s
2. Layout-Render: 0.01-0.1s
3. Page-Render: 0.01-0.1s
4. **API-Call: 0.5-5s** ← **BOTTLENECK!**
5. Daten-Render: 0.1-0.5s
6. **LCP sichtbar: 0.94-7.15s** (geschätzt) vs. **8.26s gemessen**

**Problem:**
- LCP-Element wird erst gerendert, wenn API-Response da ist
- User sieht nichts, bis API-Response fertig ist
- **8.26s Wartezeit bis erste Daten sichtbar!**

---

## 🔍 WARUM DAUERT ES 8.26s STATT 0.94-7.15s?

### Mögliche Ursachen für die Differenz (1.11-7.32s):

1. **Database-Queries sind langsamer als geschätzt**
   - `/api/requests?filterId=X` könnte 2-5s dauern (statt 0.5-2s)
   - `/api/tasks?filterId=X` könnte 2-5s dauern (statt 0.5-2s)
   - **Mögliche Ursachen:**
     - Fehlende Indizes
     - Komplexe WHERE-Klauseln trotz Optimierung
     - Große Datenmengen
     - Langsame Database-Performance

2. **Network-Latenz**
   - Server-Response-Zeit
   - JSON-Parsing-Zeit
   - Große Response-Payloads
   - **Geschätzt:** 0.5-1s zusätzlich

3. **JavaScript-Execution**
   - Große Bundle-Size
   - Langsame JavaScript-Execution
   - Blocking JavaScript
   - **Geschätzt:** 0.5-1s zusätzlich

4. **React-Rendering**
   - Viele Komponenten werden gerendert
   - Komplexe Berechnungen beim Rendering
   - Re-Renders durch State-Updates
   - **Geschätzt:** 0.5-1s zusätzlich

5. **Andere Blocking-Faktoren**
   - Synchronous Code
   - Blocking I/O
   - **Geschätzt:** 0.1-0.5s zusätzlich

---

## 🎯 LÖSUNGSPLAN (Priorisiert)

### Priorität 1: Skeleton-Loading für LCP-Element 🔴🔴 KRITISCH

**Problem:** LCP-Element wird erst nach API-Response sichtbar

**Lösung:**
- Skeleton-Loading für Requests/Tasks sofort rendern
- LCP-Element sofort sichtbar (mit Skeleton)
- API-Calls im Hintergrund
- **Erwartete Verbesserung:** LCP von 8.26s → 0.5-1s (85-95% schneller!)

**Implementierung:**
- Skeleton-Komponente für DataCard
- Requests/Tasks mit Skeleton rendern, bevor API-Response da ist
- State-Update wenn API-Response da ist

---

### Priorität 2: `/api/requests` und `/api/tasks` Performance prüfen 🔴 HOCH

**Problem:** Könnten langsam sein (2-5s statt 0.5-2s)

**Zu prüfen:**
1. **Browser DevTools Network-Tab:**
   - Request-Dauer für `/api/requests?filterId=X` messen
   - Request-Dauer für `/api/tasks?filterId=X` messen
   - Waterfall-Analyse

2. **Server-Logs:**
   - Query-Dauer für `getAllRequests` messen
   - Query-Dauer für `getAllTasks` messen
   - Cache-Hit-Rate prüfen

3. **Database-Performance:**
   - EXPLAIN ANALYZE für Queries
   - Indizes prüfen
   - Query-Optimierung

**Erwartete Verbesserung:** 50-70% schneller (wenn Indizes fehlen oder Queries langsam sind)

---

### Priorität 3: SavedFilterTags Caching 🟡 MITTEL

**Problem:** SavedFilterTags macht API-Call beim Mount

**Lösung:**
- FilterCache erweitern für SavedFilterTags
- Oder: Lazy Loading für SavedFilterTags

**Erwartete Verbesserung:** 0.1-0.3s weniger beim initialen Load

---

### Priorität 4: BranchCache implementieren 🟡 NIEDRIG

**Problem:** `/api/branches/user` hat kein Caching

**Lösung:**
- Neuer `BranchCache` Service
- TTL: 5-10 Minuten

**Erwartete Verbesserung:** 0.1-0.3s → 0.01-0.03s (80-90% schneller)

**Status:** Niedrige Priorität (Impact ist gering)

---

### Priorität 5: OnboardingCache implementieren 🟡 NIEDRIG

**Problem:** `/api/users/onboarding/status` hat kein Caching

**Lösung:**
- Neuer `OnboardingCache` Service
- TTL: 5-10 Minuten

**Erwartete Verbesserung:** 0.05-0.1s → 0.001s (80-90% schneller)

**Status:** Niedrige Priorität (Impact ist sehr gering)

---

## 📋 NÄCHSTE SCHRITTE (Messungen)

### 1. Browser DevTools Network-Tab prüfen

**Zu messen:**
- Request-Dauer für `/api/requests?filterId=X`
- Request-Dauer für `/api/tasks?filterId=X`
- Request-Dauer für `/saved-filters/requests-table`
- Request-Dauer für `/saved-filters/worktracker-todos`
- Waterfall-Analyse: Welche Requests blockieren?

**Wie:**
1. F12 → Network-Tab öffnen
2. Seite neu laden (Refresh oder nach Login)
3. Filter: `/api/requests` oder `/api/tasks`
4. "Time" Spalte prüfen (Request-Dauer)
5. Waterfall-Analyse: Welche Requests sind langsam?

---

### 2. Server-Logs prüfen

**Zu prüfen:**
- Query-Dauer für `getAllRequests`
- Query-Dauer für `getAllTasks`
- Cache-Hit-Rate für FilterCache
- Database-Performance

**Wie:**
```bash
pm2 logs intranet-backend --lines 300 | grep -E 'getAllRequests|getAllTasks|Query abgeschlossen|FilterCache'
```

---

### 3. Database-Performance prüfen

**Zu prüfen:**
- EXPLAIN ANALYZE für `getAllRequests` Query
- EXPLAIN ANALYZE für `getAllTasks` Query
- Indizes prüfen
- Query-Optimierung

**Wie:**
- Prisma Query Logging aktivieren
- EXPLAIN ANALYZE in PostgreSQL ausführen
- Indizes prüfen

---

## 📊 ZUSAMMENFASSUNG

### Was wurde bereits gemacht:

1. ✅ Backend Caching (OrganizationCache, UserCache, WorktimeCache, FilterCache)
2. ✅ Backend Query-Optimierungen (WHERE-Klauseln vereinfacht)
3. ✅ Backend Cache-Warming (beim Login)
4. ✅ Frontend Optimierungen (Query-Parameter, React.memo, Custom Events)

### Was noch fehlt:

1. 🔴🔴 **KRITISCH:** Skeleton-Loading für LCP-Element
2. 🔴 **HOCH:** `/api/requests` und `/api/tasks` Performance prüfen
3. 🟡 **MITTEL:** SavedFilterTags Caching
4. 🟡 **NIEDRIG:** BranchCache (Impact gering)
5. 🟡 **NIEDRIG:** OnboardingCache (Impact sehr gering)

### Erwartete Verbesserung:

**Mit Skeleton-Loading:**
- LCP von 8.26s → 0.5-1s (85-95% schneller!)

**Mit Performance-Optimierungen:**
- `/api/requests` und `/api/tasks` von 2-5s → 0.5-2s (50-70% schneller)

**Gesamt:**
- LCP von 8.26s → 0.5-1s (mit Skeleton-Loading)
- API-Calls von 2-5s → 0.5-2s (mit Performance-Optimierungen)

---

**Erstellt:** 2025-01-22  
**Status:** 🔴 Analyse abgeschlossen - ROOT CAUSE identifiziert  
**Nächste Aktion:** Browser DevTools Network-Tab prüfen, dann Skeleton-Loading implementieren

