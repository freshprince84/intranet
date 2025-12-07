# RAM-Verbrauch: Vollständige Analyse (2025-01-31)

**Datum:** 2025-01-31  
**Status:** 📊 ANALYSE - Nur Auflistung, keine Änderungen  
**Zweck:** Vollständige Analyse aller RAM-Probleme, Seiten, Filter/Sortierung/Anzeigen-Chaos

---

## 📋 ALLE SEITEN IM SYSTEM

### Hauptseiten (pages/)
1. **Worktracker.tsx** - 4959 Zeilen - 🔴 KRITISCH BETROFFEN
2. **Requests.tsx** (components/) - 1793 Zeilen - 🔴 KRITISCH BETROFFEN
3. **Dashboard.tsx** - Hauptseite
4. **Settings.tsx** - Einstellungen
5. **Organisation.tsx** - Organisation-Verwaltung
6. **TeamWorktimeControl.tsx** - Team-Zeiterfassung
7. **Cerebro.tsx** - Wiki-System
8. **Payroll.tsx** - Lohnabrechnung
9. **Profile.tsx** - Profil
10. **Consultations.tsx** - Beratungsstunden
11. **RoleManagement.tsx** - Rollen-Verwaltung
12. **Login.tsx** - Login
13. **Register.tsx** - Registrierung
14. **ForgotPassword.tsx** - Passwort vergessen
15. **ResetPassword.tsx** - Passwort zurücksetzen
16. **MobileAppLanding.tsx** - Mobile App Landing

### Komponenten mit Filter/Sortierung/Anzeigen
1. **InvoiceManagementTab.tsx** - Rechnungsverwaltung
2. **ToursTab.tsx** - Touren-Verwaltung
3. **ActiveUsersList.tsx** - Aktive Benutzer
4. **RequestAnalyticsTab.tsx** - Request-Analysen
5. **TodoAnalyticsTab.tsx** - Todo-Analysen
6. **UserWorktimeTable.tsx** - Benutzer-Zeiterfassung
7. **ConsultationList.tsx** - Beratungsstunden-Liste
8. **BranchManagementTab.tsx** - Niederlassungs-Verwaltung
9. **PasswordManagerTab.tsx** - Passwort-Manager
10. **RoleManagementTab.tsx** - Rollen-Verwaltung
11. **MyJoinRequestsList.tsx** - Eigene Beitrittsanfragen
12. **JoinRequestsList.tsx** - Beitrittsanfragen
13. **ShiftPlannerTab.tsx** - Schichtplaner
14. **MonthlyReportsTab.tsx** - Monatsberichte

---

## 🔴 KRITISCH BETROFFENE SEITEN (RAM > 1GB)

### 1. Worktracker.tsx (4959 Zeilen) - 🔴🔴🔴 KRITISCH

**Memory-Verbrauch:** ~500MB - 1GB+ (ohne Aktivität)

**Probleme:**

#### A) Große Arrays im State (kein Cleanup)
- `tasks[]` (Zeile 319) - Wächst kontinuierlich bei Infinite Scroll
- `reservations[]` (Zeile 331) - Wächst kontinuierlich bei Infinite Scroll
- `tourBookings[]` (Zeile 352) - Wächst kontinuierlich bei Infinite Scroll
- **KEINE Begrenzung** der maximalen Anzahl
- **KEIN Cleanup** beim Tab-Wechsel oder Unmount

#### B) Filter-States (mehrfach vorhanden)
- `filterConditions[]` (Zeile 372) - Tasks Filter
- `filterLogicalOperators[]` (Zeile 373) - Tasks Filter
- `reservationFilterConditions[]` (Zeile 366) - Reservations Filter
- `reservationFilterLogicalOperators[]` (Zeile 367) - Reservations Filter
- `reservationActiveFilterName` (Zeile 368) - Reservations Filter
- `reservationSelectedFilterId` (Zeile 369) - Reservations Filter
- `activeFilterName` (Zeile 376) - Tasks Filter
- `selectedFilterId` (Zeile 377) - Tasks Filter
- **FEHLT:** Cleanup für alle Filter-States beim Unmount

#### C) Sortierung-States (mehrfach vorhanden)
- `tableSortConfig` (Zeile 438) - Tasks Sortierung
- `reservationTableSortConfig` (Zeile 440) - Reservations Sortierung
- `tourBookingsSortConfig` (Zeile 381) - Tour Bookings Sortierung
- **3 verschiedene Sortierungs-States** für 3 verschiedene Tabs

#### D) useMemo/useCallback Overhead
- **94 useState/useMemo/useCallback/useEffect** Hooks (laut grep)
- `cardMetadataOrder` (Zeile 466) - useMemo mit Dependencies
- `hiddenCardMetadata` (Zeile 475) - useMemo mit Dependencies
- `visibleCardMetadata` (Zeile 484) - useMemo mit Dependencies
- `filteredAndSortedTasks` - useMemo mit **15 Dependencies** (laut Dokumentation)
- **Viele Re-Berechnungen** bei jeder State-Änderung

#### E) Mapping-Chaos (Card ↔ Table)
- `tableToCardMapping` (Zeile 118) - Mapping Tabellen-Spalten → Card-Metadaten
- `cardToTableMapping` (Zeile 129) - Reverse Mapping
- `reservationTableToCardMapping` (Zeile 166) - Reservations Mapping
- `reservationCardToTableMapping` (Zeile 182) - Reservations Reverse Mapping
- `tourTableToCardMapping` (Zeile 197) - Tours Mapping
- `tourCardToTableMapping` (Zeile 210) - Tours Reverse Mapping
- **6 verschiedene Mapping-Objekte** für 3 Tabs
- **Helfer-Funktionen:** `getHiddenCardMetadata`, `getCardMetadataFromColumnOrder`, `getReservationHiddenCardMetadata`, `getReservationCardMetadataFromColumnOrder`, `getTourHiddenCardMetadata`, `getTourCardMetadataFromColumnOrder`
- **Komplexe Synchronisation** zwischen Table- und Card-Ansicht

#### F) useTableSettings Hook (mehrfach)
- `useTableSettings('worktracker_tasks', ...)` (Zeile 393) - Tasks Settings
- `useTableSettings('worktracker-reservations', ...)` (Zeile 410) - Reservations Settings
- **2 separate Settings-Hooks** für 2 Tabs
- Jeder Hook lädt Settings aus DB, speichert im State

#### G) Infinite Scroll ohne Begrenzung
- `setTasks(prev => [...prev, ...tasksWithAttachments])` (Zeile 639 laut Dokumentation)
- `setReservations(prev => [...prev, ...reservationsData])` (Zeile 760 laut Dokumentation)
- **KEINE MAX-Limits** (MAX_TASKS = 1000 existiert, wird aber nicht verwendet)
- **KEIN Cleanup** von alten Items

#### H) Intersection Observer Endlosschleife (behoben, aber Code noch vorhanden)
- `tasks.length` in Dependencies (laut Dokumentation behoben)
- Aber: Code für Endlosschleife-Vermeidung noch vorhanden

---

### 2. Requests.tsx (1793 Zeilen) - 🔴🔴 KRITISCH

**Memory-Verbrauch:** ~300MB - 800MB+

**Probleme:**

#### A) Große Arrays im State
- `requests[]` (Zeile 200) - Wächst kontinuierlich bei Infinite Scroll
- **KEINE Begrenzung** der maximalen Anzahl
- **KEIN Cleanup** beim Unmount

#### B) Filter-States
- `filterConditions[]` (Zeile 215) - Filter-Bedingungen
- `filterLogicalOperators[]` - Filter-Operatoren
- `activeFilterName` - Aktiver Filter-Name
- `selectedFilterId` - Ausgewählte Filter-ID
- **FEHLT:** Cleanup für Filter-States

#### C) Sortierung-States
- `sortConfig` (Zeile 269) - Tabellen-Header-Sortierung
- `cardSortDirections` - Card-Sortierung (separat!)
- **2 verschiedene Sortierungs-States** für Table und Cards

#### D) useMemo/useCallback Overhead
- **33 useState/useMemo/useCallback/useEffect** Hooks (laut grep)
- `cardMetadataOrder` (Zeile 278) - useMemo
- `filteredAndSortedRequests` - useMemo mit vielen Dependencies

#### E) Mapping-Chaos (Card ↔ Table)
- `tableToCardMapping` - Mapping Tabellen-Spalten → Card-Metadaten
- `cardToTableMapping` - Reverse Mapping
- `getCardMetadataFromColumnOrder` - Helfer-Funktion
- `getHiddenCardMetadata` - Helfer-Funktion
- **Komplexe Synchronisation** zwischen Table- und Card-Ansicht

#### F) metadataVisibility State (separat!)
- `metadataVisibility` (Zeile 284) - Separate Sichtbarkeit für `requestedBy`/`responsible`
- **Synchronisation** mit `hiddenColumns` (Zeile 293)
- **Doppelte State-Verwaltung** für dasselbe Feature

#### G) useTableSettings Hook
- `useTableSettings('requests', ...)` - Settings Hook
- Lädt Settings aus DB, speichert im State

#### H) Infinite Scroll ohne Begrenzung
- `setRequests(prev => [...prev, ...requestsWithAttachments])` (Zeile 471 laut Dokumentation)
- **KEINE MAX-Limits**
- **KEIN Cleanup** von alten Items

---

## 📊 FILTER/SORTIERUNG/ANZEIGEN-CHAOS

### Problem 1: Mehrfache Implementierungen

**Filter-States in verschiedenen Komponenten:**
1. `Worktracker.tsx` - 2x Filter-States (Tasks + Reservations)
2. `Requests.tsx` - 1x Filter-States
3. `ToursTab.tsx` - 1x Filter-States
4. `ActiveUsersList.tsx` - 1x Filter-States
5. `RequestAnalyticsTab.tsx` - 1x Filter-States
6. `TodoAnalyticsTab.tsx` - 1x Filter-States
7. `ConsultationList.tsx` - 1x Filter-States
8. `BranchManagementTab.tsx` - 1x Filter-States
9. `PasswordManagerTab.tsx` - 1x Filter-States
10. `RoleManagementTab.tsx` - 1x Filter-States
11. `InvoiceManagementTab.tsx` - 1x Filter-States
12. `MyJoinRequestsList.tsx` - 1x Filter-States
13. `JoinRequestsList.tsx` - 1x Filter-States
14. `Cerebro.tsx` - 1x Filter-States

**Gesamt: 14+ verschiedene Filter-Implementierungen!**

---

### Problem 2: Sortierung-Chaos

**Sortierung-States in verschiedenen Komponenten:**

#### A) Hauptsortierung (sortConfig)
- `Worktracker.tsx` - 3x `sortConfig` (Tasks, Reservations, Tour Bookings)
- `Requests.tsx` - 1x `sortConfig`
- `ActiveUsersList.tsx` - 1x `sortConfig`
- `RequestAnalyticsTab.tsx` - 1x `sortConfig`
- `TodoAnalyticsTab.tsx` - 1x `sortConfig`
- `InvoiceManagementTab.tsx` - 1x `sortConfig`
- `UserWorktimeTable.tsx` - 1x `sortConfig`
- `WorktimeList.tsx` - 1x `sortConfig`

#### B) Card-Sortierung (cardSortDirections) - SEPARAT!
- `Requests.tsx` - `cardSortDirections` State (separat von `sortConfig`!)
- `ActiveUsersList.tsx` - `cardSortDirections` State (separat!)
- **Doppelte Sortierung** für Table und Cards

#### C) Filter-Sortierung (filterSortDirections) - ÜBERFLÜSSIG!
- `Worktracker.tsx` - `filterSortDirections` State (laut Dokumentation überflüssig!)
- `Requests.tsx` - `filterSortDirections` State (laut Dokumentation überflüssig!)
- **3 verschiedene Sortierungs-States** pro Komponente!

**Gesamt: 3 verschiedene Sortierungs-Implementierungen pro Komponente!**

---

### Problem 3: Anzeigen/Ausblenden-Chaos

**Column Visibility States:**

#### A) useTableSettings Hook (zentral)
- `hiddenColumns` - Array von ausgeblendeten Spalten
- `columnOrder` - Reihenfolge der Spalten
- `viewMode` - 'table' oder 'cards'

#### B) metadataVisibility State (separat!)
- `Requests.tsx` - `metadataVisibility` State (Zeile 284)
  - Separate Sichtbarkeit für `requestedBy`/`responsible`
  - **Synchronisation** mit `hiddenColumns` (Zeile 293)
  - **Doppelte State-Verwaltung** für dasselbe Feature

#### C) Card-Metadaten-Mapping (komplex!)
- `Worktracker.tsx` - 6 Mapping-Objekte für 3 Tabs
- `Requests.tsx` - 2 Mapping-Objekte
- **Helfer-Funktionen:** `getHiddenCardMetadata`, `getCardMetadataFromColumnOrder`, etc.
- **Komplexe Synchronisation** zwischen Table- und Card-Ansicht

#### D) visibleCardMetadata (abgeleitet)
- `Worktracker.tsx` - `visibleCardMetadata` useMemo (Zeile 484)
- `Requests.tsx` - `visibleCardMetadata` useMemo
- **Abgeleiteter State** aus `hiddenColumns` + `cardMetadataOrder`
- **Re-Berechnung** bei jeder State-Änderung

**Gesamt: 4 verschiedene Implementierungen für Spalten-Sichtbarkeit!**

---

### Problem 4: FilterContext speichert alle Filter dauerhaft

**Datei:** `frontend/src/contexts/FilterContext.tsx`

**Problem:**
- `filters` State (Zeile 67) - `Record<string, SavedFilter[]>`
- `filterGroups` State (Zeile 68) - `Record<string, FilterGroup[]>`
- **Wächst kontinuierlich** - keine Limits, keine TTL
- Bei jedem `refreshFilters()` werden neue Filter-Arrays gespeichert, alte bleiben im Memory
- **Bei 10 Tabellen × 20 Filter = 200 Filter-Objekte im Memory**
- **Jedes Filter-Objekt kann 10-50KB sein → 2-10MB nur für Filter**
- **Bei vielen Filter-Tag-Klicks: 20-50MB+ möglich**

**Impact:**
- Memory-Verbrauch: **20-50MB+** (wächst kontinuierlich)
- Kein Cleanup, keine Limits, keine TTL

---

### Problem 5: FilterPane erstellt viele temporäre Arrays/Strings

**Datei:** `frontend/src/components/FilterPane.tsx`

**Problem:**
- `useEffect` (Zeile 104-133) verwendet `JSON.stringify()` bei jedem Render
- `JSON.stringify()` erstellt neue Strings → Memory-Leak
- `conditions`, `logicalOperators`, `sortDirections` werden im State gespeichert
- Alte Arrays bleiben im Memory (React State-History)

**Impact:**
- Memory-Verbrauch: **1-5MB** (temporäre Strings)
- Wächst bei vielen Filter-Änderungen

---

### Problem 6: SavedFilterTags hat 19 console.log Statements

**Datei:** `frontend/src/components/SavedFilterTags.tsx`

**Problem:**
- 19 `console.log` Statements (laut grep)
- **NICHT** mit `process.env.NODE_ENV === 'development'` gewrappt
- Browser speichert alle Console-Logs im Memory
- Bei vielen Filter-Tag-Klicks: viele Logs → Memory wächst kontinuierlich

**Impact:**
- Memory-Verbrauch: **10-50MB** (wächst kontinuierlich)
- Bei 100 Filter-Klicks: 100+ Log-Einträge → 10-50MB Memory

---

## 🔍 SYSTEMATISCHE PROBLEME

### Problem 1: Infinite Scroll ohne Begrenzung

**Betroffene Dateien:**
- `Worktracker.tsx` - `tasks[]`, `reservations[]`, `tourBookings[]`
- `Requests.tsx` - `requests[]`

**Problem:**
- Arrays werden bei Infinite Scroll **kontinuierlich erweitert** (append = true)
- **KEINE Begrenzung** der maximalen Anzahl
- **KEIN Cleanup** von alten Items
- Intersection Observer könnte automatisch weitere Items laden

**Impact:**
- Memory-Verbrauch: **Wächst kontinuierlich** mit jedem geladenen Item
- Nach 5 Minuten: Potentiell **HUNDERTE oder TAUSENDE** von Items im Memory
- Jedes Item: Enthält vollständige Daten + Attachments + Metadaten

---

### Problem 2: Polling-Intervalle speichern Responses

**Betroffene Dateien:**
- `WorktimeContext.tsx` - `setInterval(checkTrackingStatus, 30000)`
- `NotificationBell.tsx` - `setInterval(fetchUnreadCount, 60000)`
- `TeamWorktimeControl.tsx` - `setInterval(fetchActiveUsers, 30000)`

**Problem:**
- Polling-Intervalle machen **kontinuierlich API-Calls**
- **Jede Response wird gespeichert** (setState)
- **Alte Responses werden NICHT gelöscht**
- Nach 5 Minuten: **10 Worktime-Calls + 5 Notification-Calls = 15 Responses im Memory**

**Impact:**
- Memory-Verbrauch: **Wächst mit jedem Polling-Intervall**
- Nach 5 Minuten: 15+ API-Responses im Memory
- Jede Response: Enthält vollständige Daten

---

### Problem 3: useMemo/useCallback behalten alte Werte

**Betroffene Dateien:**
- Überall im Code

**Problem:**
- `useMemo` und `useCallback` **cachen Werte**
- **Alte Werte bleiben im Memory** (React Cache)
- **Bei vielen Dependencies:** Viele gecachte Werte

**Impact:**
- Memory-Verbrauch: **Wächst mit jedem gecachten Wert**
- Nach 5 Minuten: Viele gecachte Werte im Memory
- `filteredAndSortedTasks` hat **15 Dependencies** → viele Re-Berechnungen

---

### Problem 4: Console.log Statements (nicht gewrappt)

**Betroffene Dateien:**
- Überall im Code
- `SavedFilterTags.tsx` - 19 console.log Statements

**Problem:**
- Viele `console.log` Statements
- **NICHT** mit `process.env.NODE_ENV === 'development'` gewrappt
- Browser speichert Console-History im Memory
- Wächst kontinuierlich

**Impact:**
- Memory-Verbrauch: **10-100MB** (je nach Anzahl Logs)
- Wächst kontinuierlich → kann zu > 100MB werden

---

### Problem 5: URL.createObjectURL() Blobs

**Betroffene Dateien:**
- `MarkdownPreview.tsx`
- Überall wo Bilder angezeigt werden

**Problem:**
- `URL.createObjectURL()` erstellt URLs, die nie aufgeräumt werden
- Memory Leak durch nicht freigegebene URLs

**Impact:**
- Memory-Verbrauch: **10-50MB** pro 100 Bilder
- Bei vielen Bildern = **kumulativer Memory-Verbrauch**

---

## 📊 MEMORY-VERBRAUCH SCHÄTZUNG

### Aktuell (mit Problemen):

1. **Worktracker.tsx:**
   - `tasks[]`: ~50-200MB (Infinite Scroll, keine Begrenzung)
   - `reservations[]`: ~20-100MB (Infinite Scroll, keine Begrenzung)
   - `tourBookings[]`: ~20-100MB (Infinite Scroll, keine Begrenzung)
   - Filter-States: ~10-50MB (mehrfach vorhanden)
   - Sortierung-States: ~5-20MB (mehrfach vorhanden)
   - useMemo/useCallback: ~10-50MB (viele Dependencies)
   - Mapping-Objekte: ~5-10MB (6 verschiedene)
   - **Gesamt:** ~120-530MB

2. **Requests.tsx:**
   - `requests[]`: ~50-200MB (Infinite Scroll, keine Begrenzung)
   - Filter-States: ~5-20MB
   - Sortierung-States: ~5-20MB (2 verschiedene!)
   - metadataVisibility: ~1-5MB (separat!)
   - useMemo/useCallback: ~5-20MB
   - **Gesamt:** ~66-265MB

3. **FilterContext:**
   - `filters`: ~20-50MB (wächst kontinuierlich)
   - `filterGroups`: ~5-20MB (wächst kontinuierlich)
   - **Gesamt:** ~25-70MB

4. **Console.log History:**
   - ~50-200MB (wächst kontinuierlich)

5. **URL.createObjectURL() Blobs:**
   - ~10-50MB pro 100 Bilder

6. **Polling-Responses:**
   - ~25-125MB (15+ Responses in 5 Minuten)

7. **useMemo/useCallback Cache:**
   - ~10-50MB (viele gecachte Werte)

**GESAMT:** ~306-1230MB → **> 1GB möglich!**

---

## 🎯 ZUSAMMENFASSUNG

### Hauptprobleme:

1. **Infinite Scroll ohne Begrenzung** - Arrays wachsen kontinuierlich
2. **Filter-States mehrfach vorhanden** - 14+ verschiedene Implementierungen
3. **Sortierung-States mehrfach vorhanden** - 3 verschiedene pro Komponente
4. **Anzeigen/Ausblenden-Chaos** - 4 verschiedene Implementierungen
5. **FilterContext speichert alle Filter dauerhaft** - keine Limits, keine TTL
6. **FilterPane erstellt temporäre Strings** - JSON.stringify() bei jedem Render
7. **Console.log Statements nicht gewrappt** - 19+ in SavedFilterTags.tsx
8. **useMemo/useCallback Overhead** - viele Dependencies, viele Re-Berechnungen
9. **Mapping-Chaos** - 6 verschiedene Mapping-Objekte in Worktracker.tsx
10. **Polling-Intervalle speichern Responses** - keine Cleanup

### Am stärksten betroffene Seiten:

1. **Worktracker.tsx** - 🔴🔴🔴 KRITISCH (~500MB - 1GB+)
2. **Requests.tsx** - 🔴🔴 KRITISCH (~300MB - 800MB+)
3. **FilterContext** - 🔴 KRITISCH (~25-70MB, wächst kontinuierlich)

### Chaos-Bereiche:

1. **Filter** - 14+ verschiedene Implementierungen
2. **Sortierung** - 3 verschiedene pro Komponente
3. **Anzeigen/Ausblenden** - 4 verschiedene Implementierungen
4. **Mapping** - 6 verschiedene Mapping-Objekte in Worktracker.tsx

---

**Erstellt:** 2025-01-31  
**Status:** 📊 ANALYSE ABGESCHLOSSEN  
**Nächster Schritt:** Planung zur Behebung (auf Anweisung warten)
