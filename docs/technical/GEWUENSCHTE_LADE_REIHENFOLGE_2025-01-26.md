# Gewünschte Lade-Reihenfolge - Finale Spezifikation (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 📋 SPEZIFIKATION - Wie das System am Ende funktionieren soll  
**Zweck:** Detaillierte Beschreibung der gewünschten Lade-Reihenfolge und Filter-Funktionalität

---

## 🎯 ÜBERBLICK: WIE DAS SYSTEM AM ENDE FUNKTIONIEREN SOLL

### Grundprinzipien:

1. **Lazy Loading:** Nur das laden, was gerade benötigt wird
2. **Einmaliges Laden:** Filter/Daten werden nur einmal geladen (keine Duplikate)
3. **Tab-basiertes Laden:** Daten werden nur geladen, wenn Tab aktiv ist
4. **Filter-Context:** Filter werden zentral verwaltet (keine doppelten API-Calls)
5. **Intelligente Pool-Auswahl:** DB-Verbindungen werden optimal verteilt
6. **Keine Retries bei READ:** READ-Operationen blockieren nicht bei vollem Pool

---

## 📋 SZENARIO 1: LOGIN → DASHBOARD ÖFFNEN

### Schritt-für-Schritt Lade-Reihenfolge:

#### Phase 1: Login (0-2 Sekunden)

**1.1: Login-Seite lädt**
- ✅ **Keine API-Calls** (statische Seite)
- ✅ **Keine DB-Verbindungen**

**1.2: User gibt Credentials ein & klickt "Anmelden"**
- ✅ **1 API-Call:** `POST /api/auth/login`
  - **executeWithRetry:** ✅ JA (kritische Operation)
  - **Connection Pool:** Intelligente Auswahl (Pool mit meisten verfügbaren Verbindungen)
  - **Erwartete Zeit:** 1-2 Sekunden

**1.3: Nach erfolgreichem Login**
- ✅ **Token wird gespeichert** (localStorage)
- ✅ **Redirect zu `/dashboard`**

---

#### Phase 2: Layout & Header/Sidebar (2-3 Sekunden)

**2.1: ProtectedRoute prüft Authentifizierung**
- ✅ **1 API-Call:** `GET /api/users/profile` (via AuthProvider)
  - **executeWithRetry:** ❌ NEIN (READ-Operation)
  - **Connection Pool:** Intelligente Auswahl
  - **Erwartete Zeit:** 0.5-1 Sekunde

**2.2: Layout-Komponente rendert**
- ✅ **Header rendert** (keine API-Calls, nur UI)
- ✅ **Sidebar rendert** (keine API-Calls, nur UI)
- ✅ **Keine DB-Verbindungen**

**2.3: Header lädt User-Daten (bereits aus AuthProvider)**
- ✅ **Keine zusätzlichen API-Calls** (User-Daten bereits vorhanden)
- ✅ **Logo wird geladen** (falls Organisationslogo vorhanden)

**2.4: NotificationBell rendert**
- ✅ **1 API-Call:** `GET /api/notifications/unread/count` (Polling startet)
  - **executeWithRetry:** ❌ NEIN (READ-Operation)
  - **Connection Pool:** Intelligente Auswahl
  - **Erwartete Zeit:** 0.5-1 Sekunde
  - **Polling-Intervall:** 60 Sekunden (nicht blockierend)

**2.5: WorktimeProvider lädt aktive Worktime**
- ✅ **1 API-Call:** `GET /api/worktime/active` (Polling startet)
  - **executeWithRetry:** ❌ NEIN (READ-Operation)
  - **Connection Pool:** Intelligente Auswahl
  - **Erwartete Zeit:** 0.5-1 Sekunde
  - **Polling-Intervall:** 30 Sekunden (nur wenn isTracking=true)

**2.6: BranchProvider lädt Branches**
- ✅ **1 API-Call:** `GET /api/branches` (falls noch nicht geladen)
  - **executeWithRetry:** ❌ NEIN (READ-Operation)
  - **Connection Pool:** Intelligente Auswahl
  - **Erwartete Zeit:** 0.5-1 Sekunde

**2.7: OrganizationProvider lädt Organisation**
- ✅ **1 API-Call:** `GET /api/organizations/current` (ohne Settings, nur Basis-Daten)
  - **executeWithRetry:** ❌ NEIN (READ-Operation)
  - **Connection Pool:** Intelligente Auswahl
  - **Erwartete Zeit:** 0.5-1 Sekunde

---

#### Phase 3: Dashboard-Seite (3-5 Sekunden)

**3.1: Dashboard-Komponente rendert**
- ✅ **Keine API-Calls** (nur UI-Rendering)

**3.2: WorktimeStats rendert**
- ✅ **1 API-Call:** `GET /api/worktime/stats?week=YYYY-Www` (aktuelle Woche)
  - **executeWithRetry:** ❌ NEIN (READ-Operation)
  - **Connection Pool:** Intelligente Auswahl
  - **Erwartete Zeit:** 1-2 Sekunden
  - **Parallel:** Vollständige Stats werden im Hintergrund geladen (nicht blockierend)

**3.3: Requests-Komponente rendert**
- ✅ **Filter-Context lädt Filter** (einmalig, zentral)
  - **1 API-Call:** `GET /api/saved-filters/table/requests`
  - **1 API-Call:** `GET /api/saved-filters/groups/table/requests`
  - **executeWithRetry:** ❌ NEIN (READ-Operation, Cache verwendet)
  - **Connection Pool:** Intelligente Auswahl
  - **Erwartete Zeit:** 0.5-1 Sekunde
  - **Wichtig:** Filter werden nur EINMAL geladen (Filter-Context)

**3.4: Requests lädt Daten**
- ✅ **1 API-Call:** `GET /api/requests?limit=20&offset=0` (ohne Filter, initial)
  - **executeWithRetry:** ❌ NEIN (READ-Operation)
  - **Connection Pool:** Intelligente Auswahl
  - **Erwartete Zeit:** 1-2 Sekunden
  - **Pagination:** limit=20, offset=0 (nur erste 20 Requests)

**3.5: SavedFilterTags rendert**
- ✅ **Keine API-Calls** (Filter bereits aus Filter-Context geladen)
- ✅ **Default-Filter wird angewendet** (falls vorhanden)
  - **1 API-Call:** `GET /api/requests?limit=20&offset=0&filterId=X` (falls Default-Filter)
  - **executeWithRetry:** ❌ NEIN (READ-Operation)
  - **Connection Pool:** Intelligente Auswahl
  - **Erwartete Zeit:** 1-2 Sekunden

---

### Zusammenfassung: Login → Dashboard

**Gesamt-API-Calls:** 10-12 Calls
- **Kritische Operationen (executeWithRetry):** 1 Call (Login)
- **READ-Operationen (ohne executeWithRetry):** 9-11 Calls
- **Gesamtzeit:** 3-5 Sekunden
- **Parallel geladen:** WorktimeStats, Requests, Filter (3 parallele Calls möglich)

**Filter-Funktionalität:**
- ✅ Filter werden **einmalig** über Filter-Context geladen
- ✅ SavedFilterTags verwendet Filter aus Context (keine doppelten Calls)
- ✅ Default-Filter wird automatisch angewendet (falls vorhanden)
- ✅ Filter-Änderung triggert neuen Request mit Filter-Parametern

---

## 📋 SZENARIO 2: DASHBOARD → WORKTRACKER KLICKEN

### Schritt-für-Schritt Lade-Reihenfolge:

#### Phase 1: Navigation (0-1 Sekunde)

**1.1: User klickt auf "Worktracker" in Sidebar**
- ✅ **Keine API-Calls** (nur Navigation)

**1.2: Worktracker-Komponente wird geladen (Lazy Loading)**
- ✅ **Keine API-Calls** (nur Code-Splitting)

**1.3: Worktracker-Komponente rendert**
- ✅ **3 Tabs werden angezeigt:** Todos, Reservations, Tour Bookings
- ✅ **Standard-Tab:** Todos (wird automatisch aktiviert)

---

#### Phase 2: Todos-Tab wird aktiviert (1-3 Sekunden)

**2.1: Worktracker erkennt activeTab='todos'**
- ✅ **Berechtigung wird geprüft** (hasPermission('tasks', 'read', 'table'))
  - **Keine API-Calls** (Berechtigung aus Context)

**2.2: Filter-Context lädt Filter für Todos**
- ✅ **1 API-Call:** `GET /api/saved-filters/table/worktracker-todos`
- ✅ **1 API-Call:** `GET /api/saved-filters/groups/table/worktracker-todos`
- **executeWithRetry:** ❌ NEIN (READ-Operation, Cache verwendet)
- **Connection Pool:** Intelligente Auswahl
- **Erwartete Zeit:** 0.5-1 Sekunde
- **Wichtig:** Filter werden nur EINMAL geladen (Filter-Context)

**2.3: Default-Filter "Aktuell" wird angewendet**
- ✅ **1 API-Call:** `GET /api/tasks?limit=20&offset=0&filterId=X` (mit Default-Filter)
- **executeWithRetry:** ❌ NEIN (READ-Operation)
- **Connection Pool:** Intelligente Auswahl
- **Erwartete Zeit:** 1-2 Sekunden
- **Pagination:** limit=20, offset=0 (nur erste 20 Tasks)

**2.4: SavedFilterTags rendert**
- ✅ **Keine API-Calls** (Filter bereits aus Filter-Context geladen)
- ✅ **Default-Filter wird angezeigt** (aktiver Filter)

**2.5: Todos werden angezeigt**
- ✅ **20 Tasks werden gerendert** (Card-Grid oder Tabelle)
- ✅ **Infinite Scroll wird initialisiert** (IntersectionObserver)

---

#### Phase 3: Reservations-Tab (wird NICHT geladen, da nicht aktiv)

**3.1: Reservations-Tab ist inaktiv**
- ✅ **Keine API-Calls** (Tab ist nicht aktiv)
- ✅ **Keine Filter werden geladen**
- ✅ **Keine Daten werden geladen**

**3.2: Tour Bookings-Tab ist inaktiv**
- ✅ **Keine API-Calls** (Tab ist nicht aktiv)
- ✅ **Keine Filter werden geladen**
- ✅ **Keine Daten werden geladen**

---

### Zusammenfassung: Dashboard → Worktracker

**Gesamt-API-Calls:** 4 Calls (nur für Todos-Tab)
- **Kritische Operationen (executeWithRetry):** 0 Calls
- **READ-Operationen (ohne executeWithRetry):** 4 Calls
- **Gesamtzeit:** 1-3 Sekunden
- **Parallel geladen:** Filter + Tasks (2 parallele Calls möglich)

**Filter-Funktionalität:**
- ✅ Filter werden **einmalig** über Filter-Context geladen (pro tableId)
- ✅ Default-Filter "Aktuell" wird automatisch angewendet
- ✅ SavedFilterTags verwendet Filter aus Context (keine doppelten Calls)
- ✅ Filter-Änderung triggert neuen Request mit Filter-Parametern

---

## 📋 SZENARIO 3: TAB-WECHSEL (TODOS → RESERVATIONS)

### Schritt-für-Schritt Lade-Reihenfolge:

#### Phase 1: User klickt auf "Reservations"-Tab (0-1 Sekunde)

**1.1: activeTab ändert sich von 'todos' zu 'reservations'**
- ✅ **Keine API-Calls** (nur State-Änderung)

**1.2: Worktracker erkennt activeTab='reservations'**
- ✅ **Berechtigung wird geprüft** (hasPermission('reservations', 'read', 'table'))
  - **Keine API-Calls** (Berechtigung aus Context)

---

#### Phase 2: Reservations-Tab wird aktiviert (1-3 Sekunden)

**2.1: Filter-Context lädt Filter für Reservations**
- ✅ **1 API-Call:** `GET /api/saved-filters/table/worktracker-reservations`
- ✅ **1 API-Call:** `GET /api/saved-filters/groups/table/worktracker-reservations`
- **executeWithRetry:** ❌ NEIN (READ-Operation, Cache verwendet)
- **Connection Pool:** Intelligente Auswahl
- **Erwartete Zeit:** 0.5-1 Sekunde
- **Wichtig:** Filter werden nur EINMAL geladen (Filter-Context, andere tableId)

**2.2: Default-Filter "Hoy" wird angewendet**
- ✅ **1 API-Call:** `GET /api/reservations?limit=20&offset=0&filterId=X` (mit Default-Filter)
- **executeWithRetry:** ❌ NEIN (READ-Operation)
- **Connection Pool:** Intelligente Auswahl
- **Erwartete Zeit:** 1-2 Sekunden
- **Pagination:** limit=20, offset=0 (nur erste 20 Reservations)

**2.3: SavedFilterTags rendert**
- ✅ **Keine API-Calls** (Filter bereits aus Filter-Context geladen)
- ✅ **Default-Filter wird angezeigt** (aktiver Filter)

**2.4: Reservations werden angezeigt**
- ✅ **20 Reservations werden gerendert** (Card-Grid oder Tabelle)
- ✅ **Infinite Scroll wird initialisiert** (IntersectionObserver)

---

#### Phase 3: Todos-Tab wird inaktiv (Cleanup)

**3.1: Todos-Tab ist jetzt inaktiv**
- ✅ **Keine API-Calls** (Tab ist nicht aktiv)
- ✅ **Todos-Daten bleiben im State** (werden nicht gelöscht, für schnellen Tab-Wechsel)
- ✅ **Infinite Scroll wird deaktiviert** (IntersectionObserver wird entfernt)

**3.2: Tour Bookings-Tab bleibt inaktiv**
- ✅ **Keine API-Calls** (Tab ist nicht aktiv)

---

### Zusammenfassung: Tab-Wechsel (Todos → Reservations)

**Gesamt-API-Calls:** 3 Calls (nur für Reservations-Tab)
- **Kritische Operationen (executeWithRetry):** 0 Calls
- **READ-Operationen (ohne executeWithRetry):** 3 Calls
- **Gesamtzeit:** 1-3 Sekunden
- **Parallel geladen:** Filter + Reservations (2 parallele Calls möglich)

**Filter-Funktionalität:**
- ✅ Filter werden **einmalig** über Filter-Context geladen (pro tableId)
- ✅ Jeder Tab hat eigene Filter (worktracker-todos vs. worktracker-reservations)
- ✅ Default-Filter wird automatisch angewendet (pro Tab)
- ✅ SavedFilterTags verwendet Filter aus Context (keine doppelten Calls)
- ✅ Filter-Änderung triggert neuen Request mit Filter-Parametern

---

## 📋 SZENARIO 4: FILTER-ÄNDERUNG (RESERVATIONS)

### Schritt-für-Schritt Lade-Reihenfolge:

#### Phase 1: User wählt anderen Filter (0-1 Sekunde)

**1.1: User klickt auf Filter-Tag (z.B. "Morgen")**
- ✅ **Keine API-Calls** (nur UI-Interaktion)

**1.2: SavedFilterTags ruft handleReservationFilterChange auf**
- ✅ **Filter-Daten werden aus Context geladen** (keine API-Call)
- ✅ **Filter-Conditions werden angewendet** (State-Update)

---

#### Phase 2: Daten werden mit neuem Filter geladen (1-2 Sekunden)

**2.1: loadReservations wird mit Filter-ID aufgerufen**
- ✅ **1 API-Call:** `GET /api/reservations?limit=20&offset=0&filterId=X` (mit neuem Filter)
- **executeWithRetry:** ❌ NEIN (READ-Operation)
- **Connection Pool:** Intelligente Auswahl
- **Erwartete Zeit:** 1-2 Sekunden
- **Pagination:** limit=20, offset=0 (nur erste 20 Reservations)

**2.2: Reservations werden aktualisiert**
- ✅ **Alte Reservations werden ersetzt** (nicht angehängt)
- ✅ **Neue Reservations werden angezeigt**
- ✅ **Infinite Scroll wird zurückgesetzt** (offset=0)

---

### Zusammenfassung: Filter-Änderung

**Gesamt-API-Calls:** 1 Call
- **Kritische Operationen (executeWithRetry):** 0 Calls
- **READ-Operationen (ohne executeWithRetry):** 1 Call
- **Gesamtzeit:** 1-2 Sekunden

**Filter-Funktionalität:**
- ✅ Filter-Daten werden aus Context geladen (keine API-Call)
- ✅ Nur Daten werden neu geladen (mit Filter-Parametern)
- ✅ Filter-Context bleibt unverändert (Filter werden nicht neu geladen)
- ✅ **WICHTIG:** Server filtert bereits → Client filtert NICHT nochmal (keine doppelte Filterung)
- ✅ **WICHTIG:** Alle gefilterten Ergebnisse werden angezeigt (nicht weniger)

---

## 🔄 WIE DER PLAN DIES SICHERSTELLT

### Problem 1.1: executeWithRetry aus READ-Operationen entfernen

**Wie der Plan dies sicherstellt:**
- ✅ **FAKT:** taskController.ts Zeile 421: executeWithRetry wird entfernt
- ✅ **FAKT:** Alle READ-Operationen verwenden kein executeWithRetry
- ✅ **Ergebnis:** READ-Operationen blockieren nicht bei vollem Pool
- ✅ **Ergebnis:** System wird schneller (weniger Retries)

**Beispiel aus Szenario 1:**
- ❌ **Vorher:** `GET /api/users/profile` mit executeWithRetry → Blockiert bei vollem Pool
- ✅ **Nachher:** `GET /api/users/profile` ohne executeWithRetry → Fehler wird sofort weitergegeben

---

### Problem 1.2: Intelligente Pool-Auswahl

**Wie der Plan dies sicherstellt:**
- ✅ **FAKT:** Pool-Status-Tracking wird implementiert
- ✅ **FAKT:** Pool mit meisten verfügbaren Verbindungen wird gewählt
- ✅ **Ergebnis:** Pools werden gleichmäßiger ausgelastet
- ✅ **Ergebnis:** Weniger Connection Pool Timeouts

**Beispiel aus Szenario 1:**
- ❌ **Vorher:** Round-Robin wählt Pool blind → Pool kann voll sein
- ✅ **Nachher:** Intelligente Auswahl wählt Pool mit verfügbaren Verbindungen → Keine Timeouts

---

### Problem 2.1: Doppelte Filter-Ladung beheben

**Wie der Plan dies sicherstellt:**
- ✅ **FAKT:** Filter-Context wird erstellt (`frontend/src/contexts/FilterContext.tsx`)
- ✅ **FAKT:** Filter werden zentral geladen (einmalig pro tableId)
- ✅ **FAKT:** SavedFilterTags verwendet Filter aus Context (keine doppelten Calls)
- ✅ **Ergebnis:** Filter werden nur einmal geladen (keine Duplikate)

**Beispiel aus Szenario 1:**
- ❌ **Vorher:** Requests.tsx lädt Filter + SavedFilterTags lädt Filter → 2 API-Calls → 2-3 Sekunden
- ✅ **Nachher:** Filter-Context lädt Filter einmalig → 1 API-Call → 0.5-1 Sekunde
- **Zusätzlich:** DB-Query ist sehr schnell (0.379ms) - Problem lag bei doppelten Requests (aus `PERFORMANCE_ANALYSE_ERGEBNISSE_2025-01-29.md`)

### Problem 2.3: Doppelte Filterung beheben (Server + Client)

**Wie der Plan dies sicherstellt:**
- ✅ **FAKT:** Server filtert bereits (mit `filterId` oder `filterConditions`)
- ✅ **FAKT:** Client filtert NICHT nochmal (nur `searchTerm` bleibt client-seitig)
- ✅ **Ergebnis:** Alle gefilterten Ergebnisse werden angezeigt (nicht weniger)
- ✅ **Ergebnis:** Infinite Scroll funktioniert korrekt (prüft `filteredAndSorted*.length`)

**Beispiel aus Szenario 4:**
- ❌ **Vorher:** Server filtert + Client filtert NOCHMAL → Weniger Ergebnisse als erwartet
- ✅ **Nachher:** Server filtert → Client filtert NICHT nochmal → Alle gefilterten Ergebnisse werden angezeigt
- **Zusätzlich:** Infinite Scroll prüft jetzt `filteredAndSorted*.length` statt `*.length` (aus `INFINITE_SCROLL_UND_FILTER_FIX_PLAN_2025-01-29.md`)

**Beispiel aus Szenario 2:**
- ❌ **Vorher:** Worktracker lädt Filter + SavedFilterTags lädt Filter → 2 API-Calls
- ✅ **Nachher:** Filter-Context lädt Filter einmalig → 1 API-Call

---

### Problem 2.2: Migration-Logik zentralisieren

**Wie der Plan dies sicherstellt:**
- ✅ **FAKT:** Migration-Logik wird in `backend/src/utils/filterMigration.ts` zentralisiert
- ✅ **FAKT:** filterListCache.ts und savedFilterController.ts verwenden zentrale Funktion
- ✅ **Ergebnis:** Code wird wartbarer (1 Stelle statt 2+)
- ✅ **Ergebnis:** Fehlerbehandlung ist einheitlich

**Beispiel aus Szenario 2:**
- ❌ **Vorher:** Migration-Logik in filterListCache.ts + savedFilterController.ts → Duplikation
- ✅ **Nachher:** Migration-Logik in filterMigration.ts → Zentralisiert

---

### Problem 2.3: Format-Inkonsistenzen beheben

**Wie der Plan dies sicherstellt:**
- ✅ **FAKT:** Backend speichert immer Array (nicht Objekt)
- ✅ **FAKT:** Frontend erwartet immer Array
- ✅ **Ergebnis:** Einheitliches Format (keine Konvertierung nötig)
- ✅ **Ergebnis:** Code wird einfacher

**Beispiel aus Szenario 2:**
- ❌ **Vorher:** Backend speichert Objekt `{}`, Frontend erwartet Array `[]` → Konvertierung nötig
- ✅ **Nachher:** Backend speichert Array `[]`, Frontend erwartet Array `[]` → Keine Konvertierung

---

### Problem 3.1: Schema-Fehler beheben

**Wie der Plan dies sicherstellt:**
- ✅ **FAKT:** Schema-Name wird aus Umgebungsvariable geladen
- ✅ **FAKT:** Fallback auf 'public' wenn nicht gesetzt
- ✅ **Ergebnis:** System funktioniert in allen Umgebungen

**Beispiel:**
- ❌ **Vorher:** Hardcoded 'public' → Fehler in anderen Umgebungen
- ✅ **Nachher:** Konfigurierbar via `DATABASE_SCHEMA` → Funktioniert überall

---

## 📊 ZUSAMMENFASSUNG: ERWARTETE VERBESSERUNGEN

### Performance-Verbesserungen:

1. **Weniger API-Calls:**
   - ❌ **Vorher:** Doppelte Filter-Ladung (2 Calls statt 1)
   - ✅ **Nachher:** Filter werden einmalig geladen (1 Call)

2. **Schnellere Response-Zeiten:**
   - ❌ **Vorher:** READ-Operationen blockieren bei vollem Pool (20-60 Sekunden)
   - ✅ **Nachher:** READ-Operationen geben Fehler sofort weiter (0.5-2 Sekunden)

3. **Gleichmäßigere Pool-Auslastung:**
   - ❌ **Vorher:** Round-Robin wählt Pool blind → Timeouts
   - ✅ **Nachher:** Intelligente Auswahl → Keine Timeouts

4. **Wartbarerer Code:**
   - ❌ **Vorher:** Migration-Logik überall dupliziert
   - ✅ **Nachher:** Migration-Logik zentralisiert

5. **Einheitlicheres Format:**
   - ❌ **Vorher:** Backend Objekt, Frontend Array → Konvertierung nötig
   - ✅ **Nachher:** Beide Array → Keine Konvertierung

---

## ✅ CHECKLISTE: ALLE ANFORDERUNGEN ERFÜLLT

### Lade-Reihenfolge:
- ✅ Login → Dashboard: Detailliert beschrieben (10-12 API-Calls, 3-5 Sekunden)
- ✅ Dashboard → Worktracker: Detailliert beschrieben (4 API-Calls, 1-3 Sekunden)
- ✅ Tab-Wechsel: Detailliert beschrieben (3 API-Calls, 1-3 Sekunden)
- ✅ Filter-Änderung: Detailliert beschrieben (1 API-Call, 1-2 Sekunden)

### Filter-Funktionalität:
- ✅ Filter werden einmalig geladen (Filter-Context)
- ✅ Keine doppelten API-Calls
- ✅ Default-Filter wird automatisch angewendet
- ✅ Filter-Änderung triggert neuen Request

### Plan-Sicherstellung:
- ✅ Alle Probleme werden durch Plan behoben
- ✅ Konkrete Beispiele für jedes Problem
- ✅ Vorher/Nachher-Vergleich

---

---

## 📚 ZUSÄTZLICHE ERKENNTNISSE AUS DOKUMENTEN (2025-01-29)

### Erkenntnis 1: FilterTags dauern 2-3 Sekunden trotz Cache

**Quelle:** `PERFORMANCE_ANALYSE_ERGEBNISSE_2025-01-29.md`

**FAKTEN:**
- **FAKT:** DB-Query ist sehr schnell (0.379ms) - Problem liegt NICHT bei der Datenbank
- **FAKT:** Filter-Größe ist OK (< 500 bytes) - das ist nicht das Problem
- **FAKT:** Cache funktioniert (viele Cache-Hits)
- **FAKT:** Mögliche Ursachen: Network-Latenz, doppelte Requests (Frontend), React Re-Renders

**Integration in gewünschte Lade-Reihenfolge:**
- ✅ Problem 2.1 (Doppelte Filter-Ladung) behebt doppelte Requests → Reduziert Network-Latenz
- ✅ Filter-Context verwendet bereits Cache → Keine zusätzliche Optimierung nötig
- ✅ **Erwartete Verbesserung:** 2-3 Sekunden → 0.5-1 Sekunde

---

### Erkenntnis 2: Doppelte Filterung (Server + Client)

**Quelle:** `INFINITE_SCROLL_UND_FILTER_FIX_PLAN_2025-01-29.md`

**FAKTEN:**
- **FAKT:** Server filtert bereits (mit `filterId` oder `filterConditions`)
- **FAKT:** Client filtert NOCHMAL → Weniger Ergebnisse als erwartet
- **FAKT:** Beispiel: Filter "heute" → Server liefert 50 Reservierungen → Client filtert NOCHMAL → könnte weniger werden
- **FAKT:** Infinite Scroll prüft falsche Länge (`requests.length` statt `filteredAndSortedRequests.length`)

**Integration in gewünschte Lade-Reihenfolge:**
- ✅ Problem 2.3 (Doppelte Filterung) behebt dieses Problem
- ✅ Infinite Scroll wird korrigiert (prüft `filteredAndSorted*.length`)
- ✅ **Erwartete Verbesserung:** Alle gefilterten Ergebnisse werden angezeigt (nicht weniger)

---

**Erstellt:** 2025-01-26  
**Aktualisiert:** 2025-01-26 (Erkenntnisse aus Dokumenten der letzten 72 Stunden integriert)  
**Status:** 📋 SPEZIFIKATION - Vollständig beschrieben  
**Nächster Schritt:** Implementierung starten (Phase 1)

