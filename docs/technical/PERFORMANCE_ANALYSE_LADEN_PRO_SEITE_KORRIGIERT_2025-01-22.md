# Performance-Analyse: Pro Seite genau definieren, was wann geladen wird (KORRIGIERT 2025-01-22)

**Datum:** 2025-01-22  
**Status:** 🔍 Analyse korrigiert  
**Ziel:** Korrigierte systematische Analyse des aktuellen Ladeverhaltens und detaillierter Plan für optimiertes Laden

---

## 📋 ANFORDERUNGEN VOM USER (KORRIGIERT)

1. **Header & Sidebar:** ❌ **DÜRFEN NICHT bei jedem Seitenwechsel neu gerendert werden** - VERBOTEN
2. **WorktimeStats:** ✅ **Müssen SOFORT geladen werden** (keine Verzögerung)
3. **SavedFilterTags:** ✅ **Müssen SOFORT geladen werden** (keine Verzögerung)
4. **Tasks (Standardfilter):** ✅ **Müssen SOFORT geladen werden** (nicht alle Tasks, nur Standardfilter)
5. **Hintergrund:** Alles andere (restliche Einträge, nicht-aktive Tabs, Modals, Sidepanes) im Hintergrund laden

---

## 🔍 AKTUELLER ZUSTAND: SYSTEMATISCHE ANALYSE (KORRIGIERT)

### Problem 1: Header & Sidebar werden bei jedem Seitenwechsel neu gerendert

**Root Cause identifiziert:**

1. **Layout.tsx:**
   - `<Header />` und `<Sidebar />` werden direkt in Layout gerendert
   - Layout wird bei jedem Seitenwechsel neu gerendert (weil `<Outlet />` sich ändert)
   - **Problem:** React re-rendert alle Child-Komponenten bei Parent-Re-Render

2. **Sidebar.tsx:**
   - Verwendet `useLocation()` → führt zu Re-Render bei jedem Seitenwechsel
   - **Problem:** `useLocation()` gibt neue Location-Objekte zurück, auch wenn nur Route-Parameter sich ändern

3. **Header.tsx:**
   - Verwendet `useNavigate()` → sollte nicht zu Re-Renders führen
   - **ABER:** Wird trotzdem neu gerendert, weil Parent (Layout) neu gerendert wird

**Lösung:**
- `React.memo()` für Header & Sidebar verwenden
- `useLocation()` in Sidebar optimieren (nur `pathname` verwenden, nicht gesamtes Location-Objekt)
- Context-Updates prüfen (können zu Re-Renders führen)

---

### Phase 0: Initiales Laden (App-Start / Login)

**Was wird geladen:**

1. **App.tsx - Context-Provider-Hierarchie:**
   - `AuthProvider` → `/users/profile` (mit `includeSettings=false&includeInvoiceSettings=false&includeDocuments=false`)
   - `OrganizationProvider` → `/api/organizations/current` (ohne Settings)
   - `BranchProvider` → `/api/branches/user`
   - `WorktimeProvider` → `/api/worktime/active` (bereits gecacht)
   - `OnboardingProvider` → `/api/users/onboarding/status`

**Zeitpunkt:** Alle parallel beim App-Start

**Status:** ✅ **Bereits optimiert** (Priorität 1 & 2 implementiert)

---

### Phase 1: Layout-Komponenten (Header, Sidebar)

**Header.tsx:**
- **Keine API-Calls beim Render!** ✅
- Verwendet `useAuth()` → User-Daten aus Context
- Verwendet `useBranch()` → Branches aus Context
- Verwendet `useOnboarding()` → Onboarding-Status aus Context
- **Problem:** ❌ **Wird bei jedem Seitenwechsel neu gerendert** (wegen Layout-Re-Render)

**Sidebar.tsx:**
- **Keine API-Calls beim Render!** ✅
- Verwendet `usePermissions()` → Permissions aus Context (User-Daten)
- Verwendet `useSidebar()` → Nur UI-State (collapsed/expanded)
- Verwendet `useLocation()` → **Führt zu Re-Render bei jedem Seitenwechsel**
- **Problem:** ❌ **Wird bei jedem Seitenwechsel neu gerendert** (wegen Layout-Re-Render + useLocation)

**Layout.tsx:**
- **Keine API-Calls beim Render!** ✅
- Verwendet `useWorktime()` → Worktime-Status aus Context
- Verwendet `useTheme()` → Nur UI-State
- **Problem:** ❌ **Wird bei jedem Seitenwechsel neu gerendert** (wegen `<Outlet />` Änderung)

**Fazit:** ❌ **Header & Sidebar werden bei jedem Seitenwechsel neu gerendert** - MUSS BEHOBEN WERDEN!

---

### Phase 2: Seiten-spezifische Komponenten

#### Dashboard-Seite

**Was wird beim ersten Render geladen:**

1. **WorktimeStats.tsx:**
   - `useEffect` → `fetchStats()` → `/api/worktime/stats?week=...` oder `?quinzena=...`
   - **Zeitpunkt:** Sofort nach User geladen
   - **Status:** ✅ **KORREKT** (muss sofort geladen werden, keine Verzögerung)

2. **Requests.tsx:**
   - `useEffect` → `setInitialFilterAndLoad()`:
     - 1. `/api/saved-filters?tableId=requests-table` (Filter laden)
     - 2. `/api/requests?filterId=X` (Requests mit Standardfilter)
     - 3. `setTimeout(2000)` → `/api/requests` (alle Requests im Hintergrund)
   - **Zeitpunkt:** Sofort nach Mount
   - **Status:** ✅ **KORREKT** (Standardfilter sofort, alle Requests im Hintergrund)

3. **SavedFilterTags.tsx (in Requests.tsx):**
   - `useEffect` → `fetchData()`:
     - `/api/saved-filters?tableId=requests-table` (Filter)
     - `/api/saved-filters/groups?tableId=requests-table` (Gruppen)
   - **Zeitpunkt:** Sofort nach Mount
   - **Status:** ✅ **KORREKT** (muss sofort geladen werden, keine Verzögerung)

4. **AppDownload.tsx:**
   - **Keine API-Calls** ✅

**Fazit Dashboard:**
- ✅ WorktimeStats: Korrekt (sofort geladen)
- ✅ SavedFilterTags: Korrekt (sofort geladen)
- ✅ Requests: Korrekt (Standardfilter sofort, alle im Hintergrund)

---

#### Worktracker-Seite

**Was wird beim ersten Render geladen:**

1. **WorktimeTracker.tsx:**
   - Verwendet `WorktimeContext` → Keine eigenen API-Calls ✅
   - **Status:** ✅ **Bereits optimiert**

2. **Worktracker.tsx (Tasks):**
   - `useEffect` → `loadTasks()`:
     - Lädt Tasks (mit Standardfilter, wenn vorhanden)
   - **Zeitpunkt:** Sofort nach Mount
   - **Status:** ✅ **KORREKT** (muss sofort geladen werden, nur Standardfilter, nicht alle Tasks)

3. **Worktracker.tsx (Reservations):**
   - `useEffect` → `loadReservations()`:
     - `/api/reservations` (alle Reservations)
   - **Zeitpunkt:** Nur wenn `activeTab === 'reservations'`
   - **Status:** ✅ **KORREKT** (lazy loading für nicht-aktive Tabs)

4. **SavedFilterTags.tsx (in Worktracker.tsx):**
   - `useEffect` → `fetchData()`:
     - `/api/saved-filters?tableId=worktracker-todos` (Filter)
     - `/api/saved-filters/groups?tableId=worktracker-todos` (Gruppen)
   - **Zeitpunkt:** Sofort nach Mount
   - **Status:** ✅ **KORREKT** (muss sofort geladen werden, keine Verzögerung)

**Fazit Worktracker:**
- ✅ WorktimeTracker: Bereits optimiert
- ✅ Tasks: Korrekt (sofort geladen, nur Standardfilter)
- ✅ Reservations: Korrekt (lazy loading für nicht-aktive Tabs)
- ✅ SavedFilterTags: Korrekt (sofort geladen)

---

### Phase 3: Modals & Sidepanes

**Aktuelles Verhalten:**

1. **CreateRequestModal, EditRequestModal:**
   - **Laden:** Nur wenn `isOpen === true`
   - **Status:** ✅ **Bereits optimiert** (lazy loading)

2. **CreateTaskModal, EditTaskModal:**
   - **Laden:** Nur wenn `isOpen === true`
   - **Status:** ✅ **Bereits optimiert** (lazy loading)

3. **CreateReservationModal, SendInvitationSidepane:**
   - **Laden:** Nur wenn `isOpen === true`
   - **Status:** ✅ **Bereits optimiert** (lazy loading)

4. **GenerateShiftPlanModal, CreateShiftModal, EditShiftModal:**
   - **Laden:** Nur wenn `isOpen === true`
   - **API-Calls beim Öffnen:**
     - `fetchData()` → `/api/branches`, `/api/roles`, `/api/users/dropdown`
   - **Status:** ✅ **Bereits optimiert** (lazy loading, Daten werden beim Öffnen geladen)

**Fazit Modals:**
- ✅ **Bereits lazy loading** (nur wenn geöffnet)
- ⚠️ **ABER:** Daten werden erst beim Öffnen geladen (könnte im Hintergrund vorladen, aber niedrige Priorität)

---

### Phase 4: Tabs

**Aktuelles Verhalten:**

1. **Worktracker.tsx - Tabs (Todos/Reservations):**
   - **Todos-Tab:** Lädt sofort beim Mount
   - **Reservations-Tab:** Lädt nur wenn `activeTab === 'reservations'`
   - **Status:** ✅ **Bereits optimiert** (lazy loading für Reservations)

2. **Andere Seiten:**
   - Keine Tabs identifiziert

**Fazit Tabs:**
- ✅ **Bereits optimiert** (lazy loading für nicht-aktive Tabs)

---

## 🎯 DETAILLIERTER PLAN: Pro Seite genau definieren (KORRIGIERT)

### Konzept: 3-Phasen-Laden (KORRIGIERT)

**Phase 0: App-Start (einmalig)**
- Context-Provider laden (User, Organization, Branches, Worktime, Onboarding)
- Header & Sidebar rendern (verwenden Context-Daten)
- **WICHTIG:** Header & Sidebar müssen mit `React.memo()` optimiert werden, um Re-Renders zu verhindern

**Phase 1: Sichtbare Inhalte (sofort, parallel)**
- WorktimeStats laden (wenn sichtbar)
- SavedFilterTags laden (wenn sichtbar)
- Tabelleninhalte mit Standardfilter laden (wenn sichtbar)
- **KEINE Verzögerung!**

**Phase 2: Hintergrund-Daten (nach 2 Sekunden, verzögert)**
- Alle Tabelleneinträge (außer Standardfilter)
- Nicht-aktive Tabs
- Modal/Sidepane-Daten (vorladen, optional)

---

### Dashboard-Seite: Detaillierter Plan (KORRIGIERT)

#### Phase 0: App-Start (einmalig)

**Was wird geladen:**
- Context-Provider (User, Organization, Branches, Worktime, Onboarding)
- Header & Sidebar rendern (mit `React.memo()` optimiert)

**Status:** ⚠️ **MUSS OPTIMIERT WERDEN** (Header & Sidebar Re-Render-Problem)

---

#### Phase 1: Sichtbare Inhalte (sofort, parallel, ~0ms)

**Was wird geladen:**

1. **WorktimeStats:**
   - `/api/worktime/stats?week=...` oder `?quinzena=...`
   - **Zeitpunkt:** Sofort nach User geladen (keine Verzögerung)
   - **Status:** ✅ **KORREKT** (bereits so implementiert)

2. **SavedFilterTags:**
   - `/api/saved-filters?tableId=requests-table` (Filter-Daten)
   - `/api/saved-filters/groups?tableId=requests-table` (Gruppen)
   - **Zeitpunkt:** Sofort nach Mount (keine Verzögerung)
   - **Status:** ✅ **KORREKT** (bereits so implementiert)

3. **Requests (Standardfilter):**
   - `/api/saved-filters?tableId=requests-table` (Filter-Daten)
   - `/api/requests?filterId=X` (Requests mit Standardfilter)
   - **Zeitpunkt:** Sofort nach Mount (keine Verzögerung)
   - **Status:** ✅ **KORREKT** (bereits so implementiert)

**Erwartete Zeit:** 0.2-0.8s (nach Optimierungen)

**Status:** ✅ **Bereits korrekt implementiert**

---

#### Phase 2: Hintergrund-Daten (nach 2 Sekunden, verzögert)

**Was wird geladen:**

1. **Requests (alle):**
   - `/api/requests` (alle Requests, ohne Filter)
   - **Zeitpunkt:** Nach 2 Sekunden
   - **Status:** ✅ **Bereits implementiert**

2. **WorktimeStats (andere Wochen/Quinzenas):**
   - **NICHT geladen** (nur bei Bedarf)

3. **Modal-Daten (vorladen):**
   - **NICHT geladen** (nur bei Bedarf, niedrige Priorität)

**Erwartete Zeit:** Im Hintergrund (User merkt es nicht)

**Status:** ✅ **Bereits implementiert** (für Requests)

---

### Worktracker-Seite: Detaillierter Plan (KORRIGIERT)

#### Phase 0: App-Start (einmalig)

**Was wird geladen:**
- Context-Provider (User, Organization, Branches, Worktime, Onboarding)
- Header & Sidebar rendern (mit `React.memo()` optimiert)

**Status:** ⚠️ **MUSS OPTIMIERT WERDEN** (Header & Sidebar Re-Render-Problem)

---

#### Phase 1: Sichtbare Inhalte (sofort, parallel, ~0ms)

**Was wird geladen:**

1. **WorktimeTracker:**
   - Verwendet `WorktimeContext` → Keine eigenen API-Calls ✅
   - **Status:** ✅ **Bereits optimiert**

2. **SavedFilterTags (Todos):**
   - `/api/saved-filters?tableId=worktracker-todos` (Filter-Daten)
   - `/api/saved-filters/groups?tableId=worktracker-todos` (Gruppen)
   - **Zeitpunkt:** Sofort nach Mount (keine Verzögerung)
   - **Status:** ✅ **KORREKT** (bereits so implementiert)

3. **Tasks (Standardfilter):**
   - `/api/saved-filters?tableId=worktracker-todos` (Filter-Daten)
   - `/api/tasks?filterId=X` (Tasks mit Standardfilter)
   - **Zeitpunkt:** Sofort nach Mount (keine Verzögerung)
   - **Status:** ✅ **KORREKT** (bereits so implementiert)

**Erwartete Zeit:** 0.2-0.8s (nach Optimierungen)

**Status:** ✅ **Bereits korrekt implementiert**

---

#### Phase 2: Hintergrund-Daten (nach 2 Sekunden, verzögert)

**Was wird geladen:**

1. **Tasks (alle):**
   - `/api/tasks` (alle Tasks, ohne Filter)
   - **Zeitpunkt:** Nach 2 Sekunden
   - **Status:** ⚠️ **MUSS IMPLEMENTIERT WERDEN** (aktuell nicht vorhanden)

2. **Reservations (nicht-aktiver Tab):**
   - `/api/reservations` (alle Reservations)
   - **Zeitpunkt:** Nach 2 Sekunden
   - **Status:** ⚠️ **MUSS IMPLEMENTIERT WERDEN** (aktuell nur wenn Tab aktiv)

3. **SavedFilterTags (Reservations):**
   - `/api/saved-filters?tableId=worktracker-reservations` (Filter-Daten)
   - `/api/saved-filters/groups?tableId=worktracker-reservations` (Gruppen)
   - **Zeitpunkt:** Nach 2 Sekunden
   - **Status:** ⚠️ **MUSS IMPLEMENTIERT WERDEN** (aktuell nicht vorhanden)

4. **Modal-Daten (vorladen):**
   - `/api/branches`, `/api/roles`, `/api/users/dropdown` (für CreateTaskModal, EditTaskModal)
   - **Zeitpunkt:** Nach 2 Sekunden
   - **Status:** ⚠️ **MUSS IMPLEMENTIERT WERDEN** (aktuell nicht vorhanden, niedrige Priorität)

**Erwartete Zeit:** Im Hintergrund (User merkt es nicht)

**Status:** ⚠️ **MUSS IMPLEMENTIERT WERDEN**

---

## ⚠️ WIDERSPRÜCHE, RISIKEN & UNSTIMMIGKEITEN (KORRIGIERT)

### Widersprüche zu bestehender Dokumentation

1. **PERFORMANCE_ANALYSE_LADEN_PRO_SEITE_2025-01-22.md:**
   - **Widerspruch:** Dokument schlägt vor, WorktimeStats, SavedFilterTags und Tasks zu verzögern
   - **Korrektur:** Diese müssen SOFORT geladen werden (keine Verzögerung)
   - **Status:** ✅ **Korrigiert**

---

### Risiken

1. **React Re-Rendering (Header & Sidebar):**
   - **Risiko:** Header & Sidebar werden bei jedem Seitenwechsel neu gerendert
   - **Impact:** Hoch (unnötige Re-Renders, kann zu Performance-Problemen führen)
   - **Lösung:** `React.memo()` für Header & Sidebar verwenden, `useLocation()` optimieren

2. **Context-Updates:**
   - **Risiko:** Context-Updates können alle Consumer neu rendern
   - **Impact:** Mittel (kann zu unnötigen Re-Renders führen)
   - **Lösung:** Context-Splitting (niedrige Priorität)

3. **Hintergrund-Laden:**
   - **Risiko:** Zu viele parallele Requests im Hintergrund können Server belasten
   - **Impact:** Mittel (kann zu Performance-Problemen führen)
   - **Lösung:** Request-Throttling (max. 3-5 parallele Requests)

---

### Unstimmigkeiten (müssen optimiert werden)

1. **Header & Sidebar Re-Rendering:**
   - **Aktuell:** Werden bei jedem Seitenwechsel neu gerendert
   - **Gewünscht:** Sollten NICHT bei jedem Seitenwechsel neu gerendert werden
   - **Status:** ❌ **KRITISCH - MUSS BEHOBEN WERDEN**

2. **Hintergrund-Laden (Tasks):**
   - **Aktuell:** Nicht vorhanden
   - **Gewünscht:** Sollte in Phase 2 geladen werden (nach 2 Sekunden)
   - **Status:** ⚠️ **MUSS IMPLEMENTIERT WERDEN**

3. **Hintergrund-Laden (Reservations):**
   - **Aktuell:** Nur wenn Tab aktiv
   - **Gewünscht:** Sollte in Phase 2 geladen werden (nach 2 Sekunden)
   - **Status:** ⚠️ **MUSS IMPLEMENTIERT WERDEN**

---

## 📊 ZUSAMMENFASSUNG (KORRIGIERT)

### Was bereits korrekt ist:

1. ✅ **WorktimeStats:** Lädt sofort (korrekt)
2. ✅ **SavedFilterTags:** Lädt sofort (korrekt)
3. ✅ **Tasks (Standardfilter):** Lädt sofort (korrekt)
4. ✅ **Requests (Standardfilter):** Lädt sofort, alle im Hintergrund (korrekt)
5. ✅ **Modals:** Bereits lazy loading (nur wenn geöffnet)
6. ✅ **Tabs:** Bereits lazy loading (nur wenn aktiv)

### Was optimiert werden muss:

1. ❌ **Header & Sidebar Re-Rendering:** KRITISCH - MUSS BEHOBEN WERDEN
   - `React.memo()` für Header & Sidebar verwenden
   - `useLocation()` in Sidebar optimieren (nur `pathname` verwenden)

2. ⚠️ **Hintergrund-Laden (Tasks):** Muss implementiert werden
   - Alle Tasks nach 2 Sekunden im Hintergrund laden

3. ⚠️ **Hintergrund-Laden (Reservations):** Muss implementiert werden
   - Reservations nach 2 Sekunden im Hintergrund laden (auch wenn Tab nicht aktiv)

4. ⚠️ **Hintergrund-Laden (SavedFilterTags für Reservations):** Muss implementiert werden
   - Filter-Daten für Reservations-Tab nach 2 Sekunden im Hintergrund laden

### Erwartete Verbesserung:

- **Aktuell:** Header & Sidebar werden bei jedem Seitenwechsel neu gerendert
- **Nach Optimierungen:** Header & Sidebar werden nur bei Context-Updates neu gerendert
- **Verbesserung:** 90-95% weniger unnötige Re-Renders

---

**Erstellt:** 2025-01-22  
**Status:** ✅ Analyse korrigiert  
**Nächste Aktion:** Header & Sidebar Re-Render-Problem beheben, dann Hintergrund-Laden implementieren

