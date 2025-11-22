# Performance-Analyse: Pro Seite genau definieren, was wann geladen wird (2025-01-22)

**Datum:** 2025-01-22  
**Status:** 🔍 Analyse abgeschlossen  
**Ziel:** Systematische Analyse des aktuellen Ladeverhaltens und detaillierter Plan für optimiertes Laden

---

## 📋 ANFORDERUNGEN VOM USER

1. **Sidebar & Header:** Sollten nicht jedes Mal neu geladen werden, nur einmal beim initialen Laden
2. **Boxen/Container:** Immer gleich, nur Inhalt ändert sich - nicht neu laden, nur Inhalt aktualisieren
3. **Fixe UI-Elemente:** Schalter, Filtertags, Buttons, Tabs, Cards (nicht deren Inhalt) - müssen sofort da sein
4. **Tabelleninhalte:** Erst die sichtbaren (z.B. gefilterte Requests/Tasks nach Standardfilter)
5. **Hintergrund:** Alles andere (restliche Einträge, nicht-aktive Tabs, Modals, Sidepanes) im Hintergrund laden

---

## 🔍 AKTUELLER ZUSTAND: SYSTEMATISCHE ANALYSE

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
- **Logo-Laden:** Nur wenn `organization.logo` vorhanden (aus Context)
- **Logo-Fallback:** `/settings/logo/base64` nur bei Fehler (lazy)

**Sidebar.tsx:**
- **Keine API-Calls beim Render!** ✅
- Verwendet `usePermissions()` → Permissions aus Context (User-Daten)
- Verwendet `useSidebar()` → Nur UI-State (collapsed/expanded)

**Layout.tsx:**
- **Keine API-Calls beim Render!** ✅
- Verwendet `useWorktime()` → Worktime-Status aus Context
- Verwendet `useTheme()` → Nur UI-State

**Fazit:** ✅ **Header & Sidebar laden bereits keine Daten beim Render!** Sie verwenden nur Context-Daten.

**⚠️ ABER:** Bei jedem Seitenwechsel werden Header & Sidebar neu gerendert (React re-render), aber keine API-Calls.

---

### Phase 2: Seiten-spezifische Komponenten

#### Dashboard-Seite

**Was wird beim ersten Render geladen:**

1. **WorktimeStats.tsx:**
   - `useEffect` → `fetchStats()` → `/api/worktime/stats?week=...` oder `?quinzena=...`
   - **Zeitpunkt:** Sofort nach User geladen
   - **Status:** ⚠️ **Lädt sofort Daten** (könnte verzögert werden)

2. **Requests.tsx:**
   - `useEffect` → `setInitialFilterAndLoad()`:
     - 1. `/api/saved-filters?tableId=requests-table` (Filter laden)
     - 2. `/api/requests?filterId=X` (Requests mit Standardfilter)
     - 3. `setTimeout(2000)` → `/api/requests` (alle Requests im Hintergrund)
   - **Zeitpunkt:** Sofort nach Mount
   - **Status:** ✅ **Bereits optimiert** (Hintergrund-Laden implementiert)

3. **SavedFilterTags.tsx (in Requests.tsx):**
   - `useEffect` → `fetchData()`:
     - `/api/saved-filters?tableId=requests-table` (Filter)
     - `/api/saved-filters/groups?tableId=requests-table` (Gruppen)
   - **Zeitpunkt:** Sofort nach Mount
   - **Status:** ⚠️ **Lädt sofort** (könnte verzögert werden)

4. **AppDownload.tsx:**
   - **Keine API-Calls** ✅

**Fazit Dashboard:**
- ✅ Requests: Bereits optimiert (Hintergrund-Laden)
- ⚠️ WorktimeStats: Lädt sofort (könnte verzögert werden)
- ⚠️ SavedFilterTags: Lädt sofort (könnte verzögert werden)

---

#### Worktracker-Seite

**Was wird beim ersten Render geladen:**

1. **WorktimeTracker.tsx:**
   - Verwendet `WorktimeContext` → Keine eigenen API-Calls ✅
   - **Status:** ✅ **Bereits optimiert**

2. **Worktracker.tsx (Tasks):**
   - `useEffect` → `setInitialFilterAndLoad()`:
     - 1. `/api/saved-filters?tableId=worktracker-todos` (Filter laden)
     - 2. `/api/tasks?filterId=X` (Tasks mit Standardfilter)
   - **Zeitpunkt:** Sofort nach Mount
   - **Status:** ⚠️ **Kein Hintergrund-Laden für alle Tasks** (nur Standardfilter)

3. **Worktracker.tsx (Reservations):**
   - `useEffect` → `loadReservations()`:
     - `/api/reservations` (alle Reservations)
   - **Zeitpunkt:** Nur wenn `activeTab === 'reservations'`
   - **Status:** ⚠️ **Lädt nur wenn Tab aktiv** (gut, aber könnte im Hintergrund geladen werden)

4. **SavedFilterTags.tsx (in Worktracker.tsx):**
   - `useEffect` → `fetchData()`:
     - `/api/saved-filters?tableId=worktracker-todos` (Filter)
     - `/api/saved-filters/groups?tableId=worktracker-todos` (Gruppen)
   - **Zeitpunkt:** Sofort nach Mount
   - **Status:** ⚠️ **Lädt sofort** (könnte verzögert werden)

**Fazit Worktracker:**
- ✅ WorktimeTracker: Bereits optimiert
- ⚠️ Tasks: Kein Hintergrund-Laden für alle Tasks
- ⚠️ Reservations: Lädt nur wenn Tab aktiv (gut, aber könnte im Hintergrund geladen werden)
- ⚠️ SavedFilterTags: Lädt sofort (könnte verzögert werden)

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
   - **Status:** ⚠️ **Lädt Daten beim Öffnen** (könnte im Hintergrund vorladen)

**Fazit Modals:**
- ✅ **Bereits lazy loading** (nur wenn geöffnet)
- ⚠️ **ABER:** Daten werden erst beim Öffnen geladen (könnte im Hintergrund vorladen)

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

## 🎯 DETAILLIERTER PLAN: Pro Seite genau definieren

### Konzept: 4-Phasen-Laden

**Phase 0: App-Start (einmalig)**
- Context-Provider laden (User, Organization, Branches, Worktime, Onboarding)
- Header & Sidebar rendern (verwenden Context-Daten)

**Phase 1: Seiten-spezifische UI-Struktur (sofort)**
- Boxen/Container rendern (ohne Inhalt)
- Fixe UI-Elemente rendern (Schalter, Buttons, Tabs, Filtertags-Container)
- **KEINE API-Calls!**

**Phase 2: Sichtbare Inhalte (nach Phase 1, parallel)**
- Tabelleninhalte mit Standardfilter laden
- WorktimeStats laden (wenn sichtbar)
- Filter-Daten laden (für Filtertags)

**Phase 3: Hintergrund-Daten (nach 2 Sekunden, verzögert)**
- Alle Tabelleneinträge (außer Standardfilter)
- Nicht-aktive Tabs
- Modal/Sidepane-Daten (vorladen)

---

### Dashboard-Seite: Detaillierter Plan

#### Phase 1: UI-Struktur (sofort, 0ms)

**Was wird gerendert:**
- ✅ WorktimeStats-Container (Box mit Header, Buttons, Input-Felder)
- ✅ Requests-Container (Box mit Header, Buttons, Filtertags-Container, Tabelle-Container)
- ✅ AppDownload-Container (Box)

**Was wird NICHT geladen:**
- ❌ WorktimeStats-Daten
- ❌ Requests-Daten
- ❌ Filter-Daten

**Status:** ⚠️ **MUSS IMPLEMENTIERT WERDEN** (aktuell lädt WorktimeStats sofort)

---

#### Phase 2: Sichtbare Inhalte (nach Phase 1, parallel, ~100ms)

**Was wird geladen:**

1. **WorktimeStats:**
   - `/api/worktime/stats?week=...` oder `?quinzena=...`
   - **Zeitpunkt:** Nach Phase 1, parallel mit Requests

2. **Requests (Standardfilter):**
   - `/api/saved-filters?tableId=requests-table` (Filter-Daten)
   - `/api/requests?filterId=X` (Requests mit Standardfilter)
   - **Zeitpunkt:** Nach Phase 1, parallel mit WorktimeStats

3. **SavedFilterTags:**
   - `/api/saved-filters?tableId=requests-table` (Filter-Daten)
   - `/api/saved-filters/groups?tableId=requests-table` (Gruppen)
   - **Zeitpunkt:** Nach Phase 1, parallel mit Requests

**Erwartete Zeit:** 0.2-0.8s (nach Optimierungen)

**Status:** ⚠️ **MUSS OPTIMIERT WERDEN** (aktuell lädt SavedFilterTags sofort)

---

#### Phase 3: Hintergrund-Daten (nach 2 Sekunden, verzögert)

**Was wird geladen:**

1. **Requests (alle):**
   - `/api/requests` (alle Requests, ohne Filter)
   - **Zeitpunkt:** Nach 2 Sekunden
   - **Status:** ✅ **Bereits implementiert**

2. **WorktimeStats (andere Wochen/Quinzenas):**
   - **NICHT geladen** (nur bei Bedarf)

3. **Modal-Daten (vorladen):**
   - **NICHT geladen** (nur bei Bedarf)

**Erwartete Zeit:** Im Hintergrund (User merkt es nicht)

**Status:** ✅ **Bereits implementiert** (für Requests)

---

### Worktracker-Seite: Detaillierter Plan

#### Phase 1: UI-Struktur (sofort, 0ms)

**Was wird gerendert:**
- ✅ WorktimeTracker-Container (Box mit Schalter, Timer)
- ✅ Tabs-Container (Todos/Reservations Tabs)
- ✅ Todos-Container (Box mit Header, Buttons, Filtertags-Container, Tabelle-Container)
- ✅ Reservations-Container (Box mit Header, Buttons, Filtertags-Container, Tabelle-Container)

**Was wird NICHT geladen:**
- ❌ Tasks-Daten
- ❌ Reservations-Daten
- ❌ Filter-Daten

**Status:** ⚠️ **MUSS IMPLEMENTIERT WERDEN** (aktuell lädt Tasks sofort)

---

#### Phase 2: Sichtbare Inhalte (nach Phase 1, parallel, ~100ms)

**Was wird geladen:**

1. **WorktimeTracker:**
   - Verwendet `WorktimeContext` → Keine eigenen API-Calls ✅
   - **Status:** ✅ **Bereits optimiert**

2. **Tasks (Standardfilter):**
   - `/api/saved-filters?tableId=worktracker-todos` (Filter-Daten)
   - `/api/tasks?filterId=X` (Tasks mit Standardfilter)
   - **Zeitpunkt:** Nach Phase 1, parallel mit Filter-Daten

3. **SavedFilterTags (Todos):**
   - `/api/saved-filters?tableId=worktracker-todos` (Filter-Daten)
   - `/api/saved-filters/groups?tableId=worktracker-todos` (Gruppen)
   - **Zeitpunkt:** Nach Phase 1, parallel mit Tasks

**Erwartete Zeit:** 0.2-0.8s (nach Optimierungen)

**Status:** ⚠️ **MUSS OPTIMIERT WERDEN** (aktuell lädt Tasks sofort)

---

#### Phase 3: Hintergrund-Daten (nach 2 Sekunden, verzögert)

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
   - **Status:** ⚠️ **MUSS IMPLEMENTIERT WERDEN** (aktuell nicht vorhanden)

**Erwartete Zeit:** Im Hintergrund (User merkt es nicht)

**Status:** ⚠️ **MUSS IMPLEMENTIERT WERDEN**

---

## ⚠️ WIDERSPRÜCHE, RISIKEN & UNSTIMMIGKEITEN

### Widersprüche zu bestehender Dokumentation

1. **PERFORMANCE_ANALYSE_3-5_DETAILLIERT_2025-01-22.md:**
   - **Widerspruch:** Dokument schlägt "3-Phasen-Laden" vor, aber User möchte "4-Phasen-Laden" (UI-Struktur zuerst)
   - **Lösung:** Plan aktualisiert auf 4-Phasen-Laden

2. **PERFORMANCE_ANALYSE_INITIALES_LADEN_2025-01-22.md:**
   - **Widerspruch:** Dokument fokussiert auf initiale API-Calls, aber User möchte auch UI-Struktur zuerst
   - **Lösung:** Plan erweitert um Phase 1 (UI-Struktur)

---

### Risiken

1. **React Re-Rendering:**
   - **Risiko:** Header & Sidebar werden bei jedem Seitenwechsel neu gerendert (React re-render)
   - **Impact:** Gering (keine API-Calls, nur DOM-Updates)
   - **Lösung:** React.memo() für Header & Sidebar (optional, niedrige Priorität)

2. **Context-Updates:**
   - **Risiko:** Context-Updates können alle Consumer neu rendern
   - **Impact:** Mittel (kann zu unnötigen Re-Renders führen)
   - **Lösung:** Context-Splitting (niedrige Priorität)

3. **Hintergrund-Laden:**
   - **Risiko:** Zu viele parallele Requests im Hintergrund können Server belasten
   - **Impact:** Mittel (kann zu Performance-Problemen führen)
   - **Lösung:** Request-Throttling (max. 3-5 parallele Requests)

4. **Modal-Vorladen:**
   - **Risiko:** Daten werden geladen, aber Modal wird nie geöffnet
   - **Impact:** Gering (nur bei selten genutzten Modals)
   - **Lösung:** Nur häufig genutzte Modals vorladen

---

### Unstimmigkeiten

1. **WorktimeStats:**
   - **Aktuell:** Lädt sofort beim Mount
   - **Gewünscht:** Sollte in Phase 2 geladen werden (nach UI-Struktur)
   - **Status:** ⚠️ **MUSS OPTIMIERT WERDEN**

2. **SavedFilterTags:**
   - **Aktuell:** Lädt sofort beim Mount
   - **Gewünscht:** Sollte in Phase 2 geladen werden (nach UI-Struktur)
   - **Status:** ⚠️ **MUSS OPTIMIERT WERDEN**

3. **Tasks (Worktracker):**
   - **Aktuell:** Lädt sofort beim Mount
   - **Gewünscht:** Sollte in Phase 2 geladen werden (nach UI-Struktur)
   - **Status:** ⚠️ **MUSS OPTIMIERT WERDEN**

4. **Hintergrund-Laden (Tasks):**
   - **Aktuell:** Nicht vorhanden
   - **Gewünscht:** Sollte in Phase 3 geladen werden (nach 2 Sekunden)
   - **Status:** ⚠️ **MUSS IMPLEMENTIERT WERDEN**

5. **Hintergrund-Laden (Reservations):**
   - **Aktuell:** Nur wenn Tab aktiv
   - **Gewünscht:** Sollte in Phase 3 geladen werden (nach 2 Sekunden)
   - **Status:** ⚠️ **MUSS IMPLEMENTIERT WERDEN**

---

## 📊 ZUSAMMENFASSUNG

### Was bereits optimiert ist:

1. ✅ **Header & Sidebar:** Keine API-Calls beim Render (verwenden Context)
2. ✅ **Context-Provider:** Bereits optimiert (Priorität 1 & 2)
3. ✅ **Requests (Dashboard):** Hintergrund-Laden bereits implementiert
4. ✅ **Modals:** Bereits lazy loading (nur wenn geöffnet)
5. ✅ **Tabs:** Bereits lazy loading (nur wenn aktiv)

### Was optimiert werden muss:

1. ⚠️ **WorktimeStats:** Sollte in Phase 2 geladen werden (nach UI-Struktur)
2. ⚠️ **SavedFilterTags:** Sollte in Phase 2 geladen werden (nach UI-Struktur)
3. ⚠️ **Tasks (Worktracker):** Sollte in Phase 2 geladen werden (nach UI-Struktur)
4. ⚠️ **Hintergrund-Laden (Tasks):** Muss implementiert werden
5. ⚠️ **Hintergrund-Laden (Reservations):** Muss implementiert werden
6. ⚠️ **Modal-Vorladen:** Muss implementiert werden (optional)

### Erwartete Verbesserung:

- **Aktuell:** 0.86-3.2s bis erste Daten sichtbar
- **Nach Optimierungen:** 0.1-0.3s bis UI-Struktur sichtbar, 0.3-1.1s bis erste Daten sichtbar
- **Verbesserung:** 60-70% schneller bis erste Daten sichtbar, 90-95% schneller bis UI-Struktur sichtbar

---

**Erstellt:** 2025-01-22  
**Status:** ✅ Analyse abgeschlossen  
**Nächste Aktion:** Implementierung der Optimierungen

