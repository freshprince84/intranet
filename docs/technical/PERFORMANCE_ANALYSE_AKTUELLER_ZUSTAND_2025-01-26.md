# Performance-Analyse: Aktueller Zustand beim Öffnen der Dashboard-Seite

**Datum:** 2025-01-26  
**Status:** 🔴 KRITISCH - Nur Analyse, keine Änderungen  
**Zweck:** Verstehen, was beim Öffnen der Seite passiert und warum so viel geladen wird

---

## 📊 EXECUTIVE SUMMARY

**Problem:** Beim Öffnen der Dashboard-Seite werden ununterbrochen API-Calls gemacht, obwohl der Benutzer nichts tut. Logs sind voll, RAM steigt auf über 1 GB.

**Frage:** Es sollen doch nur ein paar DB-Einträge angezeigt werden - warum ist das alles so aufgeblasen?

---

## 🔍 WAS PASSIERT BEIM ÖFFNEN DER DASHBOARD-SEITE?

### Phase 1: App-Initialisierung (App.tsx)

**Was passiert:**
1. **AuthProvider** wird initialisiert
   - `useEffect` lädt User-Daten: `/api/users/profile`
   - Blockiert `isLoading` bis User geladen ist

2. **WorktimeProvider** wird initialisiert
   - `useEffect` (Zeile 47-57) lädt Worktime-Status: `/api/worktime/active`
   - **Polling alle 30 Sekunden:** `/api/worktime/active` (dauerhaft aktiv!)

3. **OrganizationProvider** wird initialisiert
   - Lädt Organization-Daten: `/api/organizations/current`

4. **NotificationBell** wird gerendert (in Layout/Header)
   - `useEffect` (Zeile 169-175) lädt Notification-Count: `/api/notifications/unread/count`
   - **Polling alle 60 Sekunden:** `/api/notifications/unread/count` (dauerhaft aktiv!)

### Phase 2: Dashboard-Seite wird gerendert (Dashboard.tsx)

**Komponenten die gerendert werden:**
1. **WorktimeStats** (Zeile 56)
2. **Requests** (Zeile 62)
3. **AppDownload** (Zeile 67)

### Phase 3: WorktimeStats-Komponente

**Datei:** `frontend/src/components/WorktimeStats.tsx`

**Was passiert beim Mount:**
- `useEffect` (Zeile 138-145):
  - **Trigger:** `[selectedDate, user, useQuinzena]`
  - **API-Call:** `/api/worktime/stats?week=...` oder `/api/worktime/stats?quinzena=...`
  - **Wann:** Sofort nachdem `user` geladen ist
  - **Wie oft:** Bei jeder Änderung von `selectedDate`, `user`, oder `useQuinzena`

**Problem:**
- Lädt sofort beim Mount
- Lädt neu bei jeder Änderung von `selectedDate` (auch wenn Benutzer nichts tut)

### Phase 4: Requests-Komponente

**Datei:** `frontend/src/components/Requests.tsx`

**Was passiert beim Mount:**

1. **useEffect** (Zeile 529-531):
   ```typescript
   useEffect(() => {
     fetchRequests(undefined, undefined, false, 20, 0);
   }, []);
   ```
   - **API-Call:** `/api/requests?limit=20&offset=0&includeAttachments=false`
   - **Wann:** Sofort beim Mount
   - **Wie oft:** 1x beim Mount

2. **SavedFilterTags** wird gerendert (in Requests.tsx)
   - **useEffect** (Zeile 208-256 in SavedFilterTags.tsx):
     - **API-Calls:**
       - `/api/saved-filters?tableId=requests-table` (Filter laden)
       - `/api/saved-filters/groups?tableId=requests-table` (Gruppen laden)
     - **Wann:** Sofort beim Mount
     - **Wie oft:** 1x beim Mount

3. **Infinite Scroll Observer** (Zeile 866-894):
   - **Intersection Observer** überwacht `loadMoreRef`
   - **API-Call:** Lädt weitere 20 Requests wenn `loadMoreRef` sichtbar wird
   - **Wann:** Automatisch beim Scrollen
   - **Wie oft:** Bei jedem Scrollen bis zum Ende

**Problem:**
- Lädt sofort beim Mount (auch wenn nicht sichtbar)
- Infinite Scroll lädt automatisch weitere Daten beim Scrollen

### Phase 5: Dauerhaft aktive Polling-Intervalle

**1. WorktimeContext** (`frontend/src/contexts/WorktimeContext.tsx`)
- **Zeile 52-54:** `setInterval(() => { checkTrackingStatus(); }, 30000);`
- **API-Call:** `/api/worktime/active`
- **Intervall:** Alle 30 Sekunden
- **Status:** ✅ Dauerhaft aktiv (auch wenn Seite im Hintergrund)

**2. NotificationBell** (`frontend/src/components/NotificationBell.tsx`)
- **Zeile 172:** `setInterval(fetchUnreadCount, 60000);`
- **API-Call:** `/api/notifications/unread/count`
- **Intervall:** Alle 60 Sekunden
- **Status:** ✅ Dauerhaft aktiv (auch wenn Seite im Hintergrund)

**3. TeamWorktimeControl** (`frontend/src/pages/TeamWorktimeControl.tsx`)
- **Zeile 136:** `setInterval(fetchActiveUsers, 30000);`
- **API-Call:** `/api/team/worktime/active-users`
- **Intervall:** Alle 30 Sekunden
- **Status:** ✅ Dauerhaft aktiv (nur wenn TeamWorktimeControl-Seite offen)

**4. WorktimeTracker** (`frontend/src/components/WorktimeTracker.tsx`)
- **Zeile 176:** `setInterval(() => { ... }, 1000);`
- **Was:** Aktualisiert Timer-Anzeige (nur UI, kein API-Call)
- **Intervall:** Alle 1 Sekunde
- **Status:** ✅ Dauerhaft aktiv (nur wenn Timer läuft)

---

## 📈 ZUSAMMENFASSUNG: WAS WIRD GELADEN?

### Beim ersten Öffnen der Dashboard-Seite:

**API-Calls beim Mount:**
1. `/api/users/profile` (AuthProvider)
2. `/api/worktime/active` (WorktimeContext - initial)
3. `/api/organizations/current` (OrganizationProvider)
4. `/api/notifications/unread/count` (NotificationBell - initial)
5. `/api/worktime/stats?week=...` (WorktimeStats)
6. `/api/requests?limit=20&offset=0` (Requests)
7. `/api/saved-filters?tableId=requests-table` (SavedFilterTags)
8. `/api/saved-filters/groups?tableId=requests-table` (SavedFilterTags)

**Gesamt:** 8 API-Calls beim ersten Öffnen

### Dauerhaft aktive Polling-Intervalle:

**Immer aktiv (auch wenn Seite im Hintergrund):**
1. `/api/worktime/active` - Alle 30 Sekunden
2. `/api/notifications/unread/count` - Alle 60 Sekunden

**Nur wenn bestimmte Seiten offen:**
3. `/api/team/worktime/active-users` - Alle 30 Sekunden (nur TeamWorktimeControl)
4. Timer-Update - Alle 1 Sekunde (nur wenn Timer läuft)

---

## 🔴 IDENTIFIZIERTE PROBLEME

### Problem 1: Zu viele API-Calls beim Mount

**Fakten:**
- 8 API-Calls beim ersten Öffnen
- Viele Calls sind nicht kritisch (z.B. Notification-Count)
- Viele Calls könnten verzögert werden (z.B. SavedFilterTags)

**Impact:**
- Hohe initiale Ladezeit
- Hohe Server-Last beim Öffnen der Seite
- Viele gleichzeitige DB-Queries

### Problem 2: Dauerhaft aktive Polling-Intervalle

**Fakten:**
- `/api/worktime/active` - Alle 30 Sekunden (dauerhaft)
- `/api/notifications/unread/count` - Alle 60 Sekunden (dauerhaft)

**Impact:**
- **Ununterbrochene API-Calls** auch wenn Benutzer nichts tut
- **Logs werden voll** mit Polling-Requests
- **RAM steigt** durch viele API-Responses im Memory
- **Server-Last** durch kontinuierliche Requests

**Frage:** Ist das wirklich nötig? Worktime-Status ändert sich nur wenn Benutzer startet/stoppt. Notification-Count ändert sich nur wenn neue Notifications kommen.

### Problem 3: Keine Debouncing/Throttling

**Fakten:**
- WorktimeStats lädt neu bei jeder Änderung von `selectedDate`
- Keine Debouncing bei Filter-Änderungen
- Keine Throttling bei Scroll-Events

**Impact:**
- Mehrfache API-Calls bei schnellen Änderungen
- Verschwendete Ressourcen

### Problem 4: Infinite Scroll lädt automatisch

**Fakten:**
- Intersection Observer lädt automatisch weitere 20 Requests beim Scrollen
- Keine Begrenzung der maximalen Anzahl

**Impact:**
- Lädt potentiell HUNDERTE von Requests wenn Benutzer scrollt
- RAM steigt durch viele Requests im Memory
- Server-Last durch viele DB-Queries

### Problem 5: Doppelte API-Calls

**Fakten:**
- Requests.tsx lädt Filter (Zeile 589 - entfernt, aber war da)
- SavedFilterTags.tsx lädt Filter AUCH (Zeile 221)
- **Gleiches Problem in Worktracker.tsx**

**Impact:**
- Doppelte DB-Queries
- Verschwendete Ressourcen

---

## 💡 WARUM IST DAS ALLES SO AUFGEBLASEN?

### Antwort: Viele kleine Optimierungen haben sich summiert

**Ursachen:**
1. **Polling-Intervalle** wurden hinzugefügt für "Live-Updates"
   - Worktime-Status soll immer aktuell sein
   - Notification-Count soll immer aktuell sein
   - **ABER:** Diese Updates sind nicht kritisch und könnten event-basiert sein

2. **Infinite Scroll** wurde hinzugefügt für "bessere UX"
   - Benutzer soll nicht warten müssen
   - **ABER:** Lädt potentiell HUNDERTE von Requests

3. **Viele kleine Komponenten** laden jeweils ihre eigenen Daten
   - WorktimeStats lädt Stats
   - Requests lädt Requests
   - SavedFilterTags lädt Filter
   - **ABER:** Könnten koordiniert werden

4. **Keine Lazy Loading** für nicht-kritische Daten
   - Alles wird sofort geladen
   - **ABER:** Vieles könnte verzögert werden

---

## 📋 FAKTEN-ZUSAMMENFASSUNG

### Was passiert beim Öffnen der Dashboard-Seite:

1. **8 API-Calls** werden sofort gemacht
2. **2 Polling-Intervalle** starten dauerhaft (30s, 60s)
3. **Infinite Scroll** lädt automatisch weitere Daten beim Scrollen
4. **Keine Begrenzung** der maximalen Anzahl von Requests

### Warum Logs voll sind:

- **Polling-Intervalle** machen ununterbrochen API-Calls
- **Jeder API-Call** wird geloggt (Backend + Frontend)
- **Bei Timeouts** werden Fehler geloggt
- **Resultat:** Hunderte von Log-Einträgen pro Minute

### Warum RAM auf über 1 GB steigt:

- **Viele API-Responses** werden im Memory gespeichert
- **Infinite Scroll** lädt viele Requests (potentiell HUNDERTE)
- **Polling-Responses** werden gespeichert
- **Keine Cleanup** von alten Daten
- **Resultat:** RAM steigt kontinuierlich

---

## 🎯 FAZIT

**Die Performance-Probleme entstehen durch:**

1. **Zu viele API-Calls beim Mount** (8 Calls)
2. **Dauerhaft aktive Polling-Intervalle** (2 Intervalle, alle 30s/60s)
3. **Infinite Scroll ohne Begrenzung** (lädt potentiell HUNDERTE)
4. **Keine Lazy Loading** (alles wird sofort geladen)
5. **Keine Cleanup** von alten Daten

**Die Frage "Warum ist das alles so aufgeblasen?" beantwortet sich so:**

- Viele kleine "Optimierungen" haben sich summiert
- Polling-Intervalle für "Live-Updates" (nicht kritisch)
- Infinite Scroll für "bessere UX" (lädt zu viel)
- Keine Koordination zwischen Komponenten
- Keine Lazy Loading für nicht-kritische Daten

**Es sollen nur ein paar DB-Einträge angezeigt werden, aber:**
- 8 API-Calls beim Mount
- 2 dauerhaft aktive Polling-Intervalle
- Infinite Scroll lädt automatisch weitere Daten
- Keine Begrenzung der maximalen Anzahl

**Resultat:** System ist aufgeblasen für eine einfache Aufgabe.

---

**Erstellt:** 2025-01-26  
**Status:** ✅ Analyse abgeschlossen - NUR PRÜFEN, NICHTS ÄNDERN

