# Vereinfachung Filter & Sortierung - Aufräumplan

**Datum:** 2025-01-30  
**Status:** 📋 PLANUNG  
**Zweck:** Komplexität reduzieren, Chaos aufräumen, Performance verbessern

---

## 🎯 ZIEL: EINFACHE IMPLEMENTIERUNG

### Was wirklich nötig ist:

1. **Filter laden aus DB**
2. **Standardfilter für Abfrage verwenden**
3. **Ergebnisse abfragen**
4. **Erste 5-10 Ergebnisse anzeigen, Rest per Infinite Scroll**
5. **Bei Klick auf Filtertag: Liste neu laden mit WHERE-Klauseln (serverseitig)**
6. **Bei Suchfeld-Filterung: Nur Ergebnisse des aktuell angewendeten Filters (clientseitig)**

**Fertig. Nichts anderes.**

---

## 📋 ÜBERFLÜSSIGE/SINNLOSE DINGE

### REQUESTS

**Überflüssig:**
1. `useTableSettings` Hook – Spaltenreihenfolge, versteckte Spalten, View-Mode-Persistierung
2. `cardMetadataOrder`, `hiddenCardMetadata`, `visibleCardMetadata` – Card-Metadaten-Mapping
3. `metadataVisibility` State – separate Sichtbarkeit für requestedBy/responsible
4. `cardSortDirections` State – lokale Sortierung für Cards
5. `filterSortDirections` State – komplexe Multi-Sortierung mit Prioritäten
6. `sortConfig` State – Tabellen-Header-Sortierung
7. `filteredAndSortedRequests` useMemo – komplexe clientseitige Sortierung (3 Prioritäten)
8. `getCardMetadataFromColumnOrder`, `getHiddenCardMetadata` – Mapping-Funktionen
9. `handleSort` – Tabellen-Header-Sortierung
10. `handleMoveColumn`, `handleDragStart`, `handleDragOver`, `handleDrop`, `handleDragEnd` – Drag & Drop für Spalten
11. `draggedColumn`, `dragOverColumn` States – Drag & Drop
12. `isUpdatingHiddenColumnsRef` – Ref für Endlosschleifen-Vermeidung
13. `filterConditionsRef` useRef – Performance-Optimierung
14. `getPreviousStatus`, `getNextStatuses` – Status-Workflow-Funktionen (nur für UI)
15. `getActiveFilterCount` – Filter-Zähler
16. `applyFilterConditions` vs `handleFilterChange` – zwei Funktionen für dasselbe
17. `resetFilterConditions` – separate Reset-Funktion
18. `activeFilterName`, `selectedFilterId` States – Controlled Mode für Filter
19. Fallback-Timeout (1 Sekunde) – Workaround für Filter-Load
20. Cleanup useEffect – Arrays beim Unmount löschen
21. CSS-Klasse-Setting useEffect – `cards-mode` Klasse setzen
22. `getStatusLabel` Wrapper – nur für Übersetzungen
23. `availableColumns` useMemo – Spalten-Definition
24. `viewMode` aus Settings – View-Mode-Persistierung
25. `totalCount`, `hasMore` States – Pagination-Info (könnte vereinfacht werden)

---

### TO DO'S (Worktracker.tsx)

**Überflüssig:**
1. `useTableSettings` Hook (2x) – für Tasks und Reservations
2. `cardMetadataOrder`, `hiddenCardMetadata`, `visibleCardMetadata` (2x)
3. `taskCardSortDirections`, `reservationCardSortDirections` States
4. `handleTaskCardSortDirectionChange`, `handleReservationCardSortDirectionChange`
5. `filterSortDirections`, `reservationFilterSortDirections` States
6. `tableSortConfig`, `reservationTableSortConfig` States
7. `filteredAndSortedTasks`, `filteredAndSortedReservations` useMemo
8. `getCardMetadataFromColumnOrder`, `getReservationCardMetadataFromColumnOrder`
9. `getHiddenCardMetadata`, `getReservationHiddenCardMetadata`
10. `handleSort` für Tasks
11. `handleMoveColumn`, Drag & Drop (2x)
12. `draggedColumn`, `dragOverColumn` States
13. `expandedReservationRows` State – Expand/Collapse für Reservations
14. `toggleReservationExpanded` Funktion
15. `initialFilterLoading`, `initialReservationFilterLoading` States
16. `initialFilterAppliedRef`, `initialReservationFilterAppliedRef` Refs
17. `statusFilter`, `reservationFilterStatus`, `reservationFilterPaymentStatus` States – alte Filter
18. `searchTerm`, `reservationSearchTerm` States – könnten vereinfacht werden
19. `applyFilterConditions` vs `handleFilterChange` (2x)
20. `applyReservationFilterConditions` vs `handleReservationFilterChange`
21. `resetFilterConditions` (2x)
22. `activeFilterName`, `selectedFilterId` (2x)
23. `reservationActiveFilterName`, `reservationSelectedFilterId`
24. `filterOnlyColumns`, `reservationFilterOnlyColumns` useMemo
25. `availableColumns`, `availableReservationColumns` useMemo
26. Cleanup useEffect – alle Arrays löschen
27. CSS-Klasse-Setting useEffect
28. `getStatusLabel` Wrapper
29. `hasLoadedRef` – Ref für doppelte Loads
30. `viewMode` aus Settings (2x)
31. `totalCount`, `hasMore` States (3x: Tasks, Reservations, TourBookings)
32. `copiedTask` State – Copy-Funktionalität
33. Alle TourBookings-States und -Logik (separate Box)

---

### RESERVATIONS (Teil von Worktracker.tsx)

**Überflüssig:**
1. Alles aus To Do's Liste (geteilt)
2. `expandedReservationRows` – Expand/Collapse
3. `toggleReservationExpanded`
4. `reservationFilterStatus`, `reservationFilterPaymentStatus` – alte Filter-States
5. `reservationSearchTerm` – könnte vereinfacht werden
6. `syncingReservations`, `generatingPinForReservation` – spezielle Funktionen
7. `selectedReservationForInvitation`, `isSendInvitationSidepaneOpen` – Invitation-Funktionalität
8. `selectedReservationForPasscode`, `isSendPasscodeSidepaneOpen` – Passcode-Funktionalität

---

## ✅ WAS WIRKLICH NÖTIG IST

**Nötig:**
1. `requests/tasks/reservations` State – Daten-Array
2. `loading`, `loadingMore` States – Loading-States
3. `error` State – Fehlerbehandlung
4. `searchTerm` State – Suchfeld (clientseitig)
5. `filterConditions` State – aktuelle Filter-Bedingungen (für Server-Request)
6. `filterLogicalOperators` State – AND/OR (für Server-Request)
7. `fetchRequests/loadTasks/loadReservations` Funktion – API-Call mit Filter
8. `handleFilterChange` Funktion – Filter-Tag-Klick → Server-Request
9. Infinite Scroll Logic – Intersection Observer
10. Einfache clientseitige Filterung – nur `searchTerm` auf bereits geladenen Daten

**Alles andere ist überflüssig.**

---

## 🔍 ANALYSE: WAS WURDE BEREITS GEMACHT?

### Dokumentierte Versuche, das Problem zu lösen:

1. **FILTER_SORTIERUNG_VOLLSTAENDIGE_ANALYSE_2025-01-22.md**
   - **Zweck:** Analyse der Sortierungs-Prioritäten
   - **Ergebnis:** Identifizierte, dass Filter-Sortierung temporär überschrieben werden sollte
   - **Problem:** Komplexe Multi-Prioritäten-Sortierung wurde als Lösung vorgeschlagen

2. **FILTER_SORTIERUNG_PRO_FILTER.md**
   - **Zweck:** Sortierung pro Filter implementieren
   - **Ergebnis:** `sortDirections` Feld im SavedFilter Model hinzugefügt
   - **Problem:** Filter-Sortierung war von Anfang an falsch - sollte nie hinzugefügt werden

3. **FILTER_UND_SORTIERUNG_AKTUELLER_ZUSTAND_2025-01-29.md**
   - **Zweck:** Dokumentation des aktuellen Zustands
   - **Ergebnis:** Zeigt 5 Prioritäten für Sortierung (Table-Header, Filter, Cards, Table, Fallback)
   - **Problem:** Viel zu komplex, Filter-Sortierung sollte nie existieren

4. **SORTIERUNG_PROBLEM_ANALYSE_UND_PLAN_2025-01-29.md**
   - **Zweck:** Server-seitige Sortierung implementieren
   - **Ergebnis:** Plan für server-seitige Sortierung
   - **Problem:** Komplexe Multi-Sortierung sollte nicht server-seitig implementiert werden

5. **FILTER_STANDARDFILTER_ROLES_USERS_PLAN.md**
   - **Zweck:** Standardfilter für Rollen und Benutzer
   - **Ergebnis:** Plan erstellt, teilweise implementiert
   - **Status:** Rollen/User-Filter werden im Seed erstellt

6. **STANDARDFILTER_SEED_MIGRATION_PLAN.md**
   - **Zweck:** Standardfilter ins Seed verschieben
   - **Ergebnis:** Teilweise umgesetzt (Requests, To Do's, Reservations)
   - **Status:** ✅ Requests/To Do's/Reservations Standardfilter im Seed

7. **ROLLEN_ISOLATION_UND_FILTER_FIXES_PLAN_2025-01-29.md**
   - **Zweck:** Rollen-basierte Datenisolation
   - **Ergebnis:** Plan erstellt, teilweise implementiert
   - **Status:** `isAdminOrOwner` Funktion existiert, Rollen-Isolation teilweise implementiert

### Warum wurde Filter-Sortierung hinzugefügt?

**Dokumentiert in:** `FILTER_SORTIERUNG_PRO_FILTER.md`

**Grund (falsch):**
- "Die Sortierung soll von einer globalen Einstellung pro User zu einer pro-Filter Einstellung geändert werden"
- "Bei jeder Spalte, die im Filter eingestellt wird, soll es möglich sein, die Sortierung (auf- oder absteigend) einzustellen"

**Warum das falsch war:**
- Filter sind für **WHERE-Klauseln** gedacht, nicht für Sortierung
- Sortierung sollte **unabhängig** von Filtern sein
- Komplexe Multi-Prioritäten-Sortierung macht das System unverständlich
- Performance-Problem: Client-seitige Sortierung nach server-seitiger Pagination

**Was stattdessen nötig ist:**
- **Einfache Hauptsortierung:** Button mit Modal neben Filter-Button
- **Für Table & Card gleich:** Gleiche Sortierung, synchron mit Spaltentitel bei Table
- **Keine Filter-Sortierung:** Filter nur für WHERE-Klauseln

### Aktuelle Standardfilter im Seed:

**Requests (`requests-table`):**
- ✅ "Aktuell": `status != approved AND status != denied` (Zeile 1585-1611)
- ✅ "Archiv": `status = approved OR status = denied` (Zeile 1613-1639)

**To Do's (`worktracker-todos`):**
- ✅ "Aktuell": `status != done` (Zeile 1530-1554)
- ✅ "Archiv": `status = done` (Zeile 1556-1580)

**Reservations (`worktracker-reservations`):**
- ✅ "Hoy": `checkInDate = __TODAY__` (Zeile 1644-1668)

**Rollen/User-Filter:**
- ✅ Werden im Seed erstellt (`createRoleAndUserFilters`, Zeile 1693+)
- ✅ Nur für Requests und To Do's
- ✅ Filter-Gruppen "Rollen" und "Benutzer"

### Was fehlt noch:

**Requests:**
- ❌ "Alle" Filter fehlt (sollte: `status != approved AND branch = aktueller branch`)
- ❌ "Name des Benutzers" Filter fehlt (sollte: `status != approved AND branch = aktueller branch AND (requestedBy = user OR responsible = user)`)
- ❌ Branch-Filter fehlt in allen Filtern
- ❌ Rollen-basierte Filter fehlen (sollten nur für Admin sein)

**To Do's:**
- ❌ Branch-Filter fehlt in allen Filtern
- ❌ Responsible/QC-Filter fehlt (sollte: `(responsible = user OR qc = user OR responsible = rolle OR qc = rolle)`)
- ❌ Rollen-basierte Filter fehlen (sollten nur für Admin sein)
- ❌ "status != done" fehlt in Rollen/User-Filtern

**Reservations:**
- ❌ "Morgen" Filter fehlt
- ❌ "Gestern" Filter fehlt
- ❌ Branch-Filter fehlt in allen Filtern
- ❌ Admin-Filter-Gruppen fehlen (Manila, Parque Poblado, Alle)

---

## 📝 DETAILLIERTER AUFRÄUMPLAN

### Phase 1: Filter-Sortierung KOMPLETT entfernen

#### 1.1 Backend - `sortDirections` Feld entfernen

**Dateien:**
- `backend/prisma/schema.prisma` - `sortDirections` Feld aus SavedFilter Model entfernen
- `backend/src/controllers/savedFilterController.ts` - Alle `sortDirections` Referenzen entfernen
- Migration erstellen: `sortDirections` Spalte aus DB entfernen

**Schritte:**
1. Migration erstellen: `ALTER TABLE SavedFilter DROP COLUMN sortDirections;`
2. Prisma Schema aktualisieren: `sortDirections String?` entfernen
3. Controller anpassen: Alle `sortDirections` Parameter/Props entfernen
4. API-Tests: Prüfen, dass keine `sortDirections` mehr gesendet/empfangen werden

#### 1.2 Frontend - Filter-Sortierung entfernen

**Dateien:**
- `frontend/src/components/FilterRow.tsx` - `sortDirection`, `sortPriority` Props entfernen
- `frontend/src/components/FilterPane.tsx` - `savedSortDirections`, `onSortDirectionsChange` Props entfernen
- `frontend/src/components/SavedFilterTags.tsx` - `sortDirections` aus SavedFilter Interface entfernen
- `frontend/src/components/Requests.tsx` - `filterSortDirections` State entfernen
- `frontend/src/pages/Worktracker.tsx` - `filterSortDirections`, `reservationFilterSortDirections` States entfernen

**Schritte:**
1. FilterRow: Sortierrichtung-UI entfernen (Button/Icons)
2. FilterPane: `sortDirections` State entfernen
3. SavedFilterTags: `sortDirections` aus Interface entfernen
4. Requests/Worktracker: `filterSortDirections` States entfernen
5. Alle `filterSortDirections` Referenzen in `filteredAndSorted*` useMemo entfernen

#### 1.3 Frontend - Sortierungs-Logik vereinfachen

**Dateien:**
- `frontend/src/components/Requests.tsx` - `filteredAndSortedRequests` → `filteredRequests`
- `frontend/src/pages/Worktracker.tsx` - `filteredAndSortedTasks` → `filteredTasks`, `filteredAndSortedReservations` → `filteredReservations`

**Sortierungs-Logik (BESTEHEND BEHALTEN, vereinfacht):**
```typescript
const filteredAndSortedRequests = useMemo(() => {
  // 1. Client-seitige Filterung (nur searchTerm)
  const filtered = requests.filter(request => {
    if (searchTerm) {
      // ... Suchlogik ...
      if (!matchesSearch) return false;
    }
    return true;
  });
  
  // 2. Sortierung (NUR Hauptsortierung - sortConfig)
  if (viewMode === 'table' && sortConfig.key) {
    return filtered.sort((a, b) => {
      // Sortierung nach sortConfig.key und sortConfig.direction
      // ... (bestehende Logik beibehalten)
    });
  }
  
  // 3. Card-Ansicht: Gleiche Sortierung wie Table
  if (viewMode === 'cards' && sortConfig.key) {
    return filtered.sort((a, b) => {
      // Gleiche Sortierung wie Table
      // ... (bestehende Logik beibehalten)
    });
  }
  
  return filtered; // Keine Sortierung
}, [requests, searchTerm, sortConfig, viewMode]);
```

**Prioritäten (vereinfacht):**
1. **Hauptsortierung** (`sortConfig`) - Spaltentitel klickbar (bestehend)
2. **Fallback:** Keine Sortierung (Server-Reihenfolge beibehalten)

---

### Phase 2: Hauptsortierung BEHALTEN (nichts Neues implementieren!)

**⚠️ WICHTIG:** Die Hauptsortierung existiert bereits und muss BEHALTEN werden!

#### 2.1 Bestehende Hauptsortierung identifizieren

**Requests (`frontend/src/components/Requests.tsx`):**
- ✅ `sortConfig` State (Zeile 220): `{ key: 'dueDate', direction: 'asc' }`
- ✅ `handleSort` Funktion (Zeile 577): Klick auf Spaltentitel → Sortierung ändern
- ✅ Spaltentitel klickbar (Zeile 1293): `onClick={sortKey ? () => handleSort(sortKey) : undefined}`
- ✅ Sortierung in `filteredAndSortedRequests` (Zeile 784): `if (viewMode === 'table' && sortConfig.key)`

**Worktracker - To Do's (`frontend/src/pages/Worktracker.tsx`):**
- ✅ `tableSortConfig` State (Zeile 396): `{ key: 'dueDate', direction: 'asc' }`
- ✅ `handleSort` Funktion: Muss geprüft werden
- ✅ Spaltentitel klickbar (Zeile 2410): `onClick={() => handleSort(columnId as keyof Task)}`
- ✅ Sortierung in `filteredAndSortedTasks`: Muss geprüft werden

**Worktracker - Reservations:**
- ✅ `reservationTableSortConfig` State (Zeile 398): `{ key: 'checkInDate', direction: 'desc' }`
- ✅ `handleSort` Funktion: Muss geprüft werden
- ✅ Spaltentitel klickbar: Muss geprüft werden
- ✅ Sortierung in `filteredAndSortedReservations`: Muss geprüft werden

**Worktracker - Tour Bookings:**
- ⚠️ **FEHLT:** Keine Sortierung implementiert!
- ❌ Muss analog zu To Do's und Reservations implementiert werden

#### 2.2 Was BEHALTEN werden muss

**Funktionalität:**
- ✅ Spaltentitel klickbar → Sortierung ändern (auf/absteigend)
- ✅ Sortierung synchron für Table & Card (gleicher `sortConfig` State)
- ✅ Spalten ein-/ausblenden (über `useTableSettings` Hook)
- ✅ Spalten verschieben (nur im Modal, nicht direkt in Spaltentiteln)

**Code (BEHALTEN):**
```typescript
// State (BEHALTEN)
const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'dueDate', direction: 'asc' });

// Handler (BEHALTEN)
const handleSort = (key: SortConfig['key']) => {
  setSortConfig(current => ({
    key,
    direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
  }));
};

// Spaltentitel (BEHALTEN)
<th onClick={sortKey ? () => handleSort(sortKey) : undefined}>
  {sortKey && sortConfig.key === sortKey && (sortConfig.direction === 'asc' ? '↑' : '↓')}
</th>
```

#### 2.3 Was ENTFERNT werden muss

- ❌ Filter-Sortierung (`filterSortDirections`) - komplett entfernen
- ❌ Card-Sortierung (`cardSortDirections`) - komplett entfernen
- ❌ Multi-Prioritäten-Sortierung - komplett entfernen

#### 2.4 Was für alle 3 Tabs sicherstellen

**To Do's, Reservations, Tour Bookings müssen analog funktionieren:**
1. ✅ Gleiche `sortConfig` State-Struktur
2. ✅ Gleiche `handleSort` Funktion
3. ✅ Gleiche Spaltentitel-Klick-Funktionalität
4. ✅ Gleiche Sortierung in `filteredAndSorted*` useMemo
5. ✅ Gleiche Spalten ein-/ausblenden Funktionalität

---

### Phase 3: Überflüssige Komplexität entfernen

#### 3.1 Table Settings entfernen

**Dateien:**
- `frontend/src/components/Requests.tsx` - `useTableSettings` Hook entfernen
- `frontend/src/pages/Worktracker.tsx` - `useTableSettings` Hooks entfernen (2x)

**Was entfernt wird:**
- Spaltenreihenfolge-Persistierung
- Versteckte Spalten-Persistierung
- View-Mode-Persistierung

**Was bleibt:**
- Spalten ein-/ausblenden (nur UI, nicht persistiert)
- View-Mode Toggle (nur UI, nicht persistiert)

#### 3.2 Card-Metadaten-Mapping entfernen

**Dateien:**
- `frontend/src/components/Requests.tsx` - Alle `cardMetadata*` Funktionen entfernen
- `frontend/src/pages/Worktracker.tsx` - Alle `cardMetadata*` Funktionen entfernen

**Was entfernt wird:**
- `getCardMetadataFromColumnOrder`
- `getHiddenCardMetadata`
- `cardMetadataOrder`, `hiddenCardMetadata`, `visibleCardMetadata` States

**Was bleibt:**
- Einfache Card-Anzeige (keine komplexe Metadaten-Verwaltung)

#### 3.3 Drag & Drop entfernen

**Dateien:**
- `frontend/src/components/Requests.tsx` - Alle Drag & Drop Funktionen entfernen
- `frontend/src/pages/Worktracker.tsx` - Alle Drag & Drop Funktionen entfernen

**Was entfernt wird:**
- `handleMoveColumn`, `handleDragStart`, `handleDragOver`, `handleDrop`, `handleDragEnd`
- `draggedColumn`, `dragOverColumn` States

**Was bleibt:**
- Spalten verschieben nur direkt in Table-Spaltentiteln (wie gehabt)

#### 3.4 Doppelte Funktionen entfernen

**Dateien:**
- `frontend/src/components/Requests.tsx` - `applyFilterConditions` entfernen, nur `handleFilterChange` behalten
- `frontend/src/pages/Worktracker.tsx` - `applyFilterConditions`, `applyReservationFilterConditions` entfernen

**Vereinfachung:**
- Nur noch `handleFilterChange` Funktion
- Direkt `fetchRequests/loadTasks/loadReservations` aufrufen
- Keine separaten `applyFilterConditions` mehr

#### 3.5 Controlled Mode entfernen

**Dateien:**
- `frontend/src/components/Requests.tsx` - `activeFilterName`, `selectedFilterId` States entfernen
- `frontend/src/pages/Worktracker.tsx` - Alle `activeFilterName`, `selectedFilterId` States entfernen

**Vereinfachung:**
- Filter werden nur über `filterConditions` State verwaltet
- Keine separate "Controlled Mode" Logik mehr

#### 3.6 Fallback-Timeout entfernen

**Dateien:**
- `frontend/src/components/Requests.tsx` - Fallback-Timeout (1 Sekunde) entfernen

**Grund:**
- SavedFilterTags sollte immer Default-Filter anwenden
- Wenn nicht, ist das ein Bug, der behoben werden muss (nicht mit Fallback umgehen)

#### 3.7 Cleanup useEffects entfernen

**Dateien:**
- `frontend/src/components/Requests.tsx` - Cleanup useEffect entfernen
- `frontend/src/pages/Worktracker.tsx` - Cleanup useEffect entfernen

**Grund:**
- React macht automatisches Cleanup
- Explizites Löschen von Arrays beim Unmount ist unnötig

---

### Phase 4: Standardfilter korrekt implementieren

#### 4.1 Requests Standardfilter

**Berechtigungs-Prüfung:**
- **User-Rolle:** Alle Rollen einer Organisation + alle Rollen von Org 1, AUSSER Admin & Owner
- **Admin-Rolle:** Admin & Owner einer Organisation + Admin & Owner von Org 1
- Prüfung über Funktion `isAdminOrOwner(req)` oder über Berechtigungen & DB-Einträge

**Für User-Rolle:**

**"Alle" Filter:**
```json
{
  "conditions": [
    { "column": "status", "operator": "notEquals", "value": "approved" },
    { "column": "branch", "operator": "equals", "value": "__CURRENT_BRANCH__" }
  ],
  "operators": ["AND"]
}
```
- **Bedeutung:** `status != approved AND branch = aktueller branch`

**"Name des Benutzers" Filter:**
```json
{
  "conditions": [
    { "column": "status", "operator": "notEquals", "value": "approved" },
    { "column": "branch", "operator": "equals", "value": "__CURRENT_BRANCH__" },
    { "column": "requestedBy", "operator": "equals", "value": "__CURRENT_USER__" }
  ],
  "operators": ["AND", "OR"],
  "OR_conditions": [
    { "column": "responsible", "operator": "equals", "value": "__CURRENT_USER__" }
  ]
}
```
- **Bedeutung:** `status != approved AND branch = aktueller branch AND (requestedBy = aktueller user OR responsible = aktueller user)`

**"Archiv" Filter:**
```json
{
  "conditions": [
    { "column": "status", "operator": "equals", "value": "done" },
    { "column": "branch", "operator": "equals", "value": "__CURRENT_BRANCH__" }
  ],
  "operators": ["AND"]
}
```
- **Bedeutung:** `status = done AND branch = aktueller branch`

**Hinweis:** `__CURRENT_BRANCH__` und `__CURRENT_USER__` sind Placeholder, die beim Anwenden des Filters durch echte Werte ersetzt werden müssen.

#### 4.2 To Do's Standardfilter

**Berechtigungs-Prüfung:**
- **User-Rolle:** Alle Rollen einer Organisation + alle Rollen von Org 1, AUSSER Admin & Owner
- **Admin-Rolle:** Admin & Owner einer Organisation + Admin & Owner von Org 1
- Prüfung über Funktion `isAdminOrOwner(req)` oder über Berechtigungen & DB-Einträge

**Für User-Rolle:**

**"Aktuell" Filter:**
```json
{
  "conditions": [
    { "column": "status", "operator": "notEquals", "value": "done" },
    { "column": "branch", "operator": "equals", "value": "__CURRENT_BRANCH__" },
    { "column": "responsible", "operator": "equals", "value": "__CURRENT_USER__" }
  ],
  "operators": ["AND", "OR"],
  "OR_conditions": [
    { "column": "qualityControl", "operator": "equals", "value": "__CURRENT_USER__" },
    { "column": "responsible", "operator": "equals", "value": "__CURRENT_ROLE__" },
    { "column": "qualityControl", "operator": "equals", "value": "__CURRENT_ROLE__" }
  ]
}
```
- **Bedeutung:** `((responsible = aktueller user OR qc = aktueller user OR responsible = aktuelle rolle OR qc = aktuelle rolle) AND status != done AND branch = aktueller branch)`

**"Archiv" Filter:**
```json
{
  "conditions": [
    { "column": "status", "operator": "equals", "value": "done" },
    { "column": "branch", "operator": "equals", "value": "__CURRENT_BRANCH__" },
    { "column": "responsible", "operator": "equals", "value": "__CURRENT_USER__" }
  ],
  "operators": ["AND", "OR"],
  "OR_conditions": [
    { "column": "qualityControl", "operator": "equals", "value": "__CURRENT_USER__" },
    { "column": "responsible", "operator": "equals", "value": "__CURRENT_ROLE__" },
    { "column": "qualityControl", "operator": "equals", "value": "__CURRENT_ROLE__" }
  ]
}
```
- **Bedeutung:** `((responsible = aktueller user OR qc = aktueller user OR responsible = aktuelle rolle OR qc = aktuelle rolle) AND status = done AND branch = aktueller branch)`

**Für Admin-Rolle:**

**"Aktuell" Filter:**
```json
{
  "conditions": [
    { "column": "status", "operator": "notEquals", "value": "done" },
    { "column": "responsible", "operator": "equals", "value": "__CURRENT_USER__" }
  ],
  "operators": ["OR"],
  "OR_conditions": [
    { "column": "qualityControl", "operator": "equals", "value": "__CURRENT_USER__" },
    { "column": "responsible", "operator": "equals", "value": "__CURRENT_ROLE__" },
    { "column": "qualityControl", "operator": "equals", "value": "__CURRENT_ROLE__" }
  ]
}
```
- **Bedeutung:** `((responsible = aktueller user OR qc = aktueller user OR responsible = aktuelle rolle OR qc = aktuelle rolle) AND status != done)` - **OHNE Branch-Filter**

**"Archiv" Filter:**
```json
{
  "conditions": [
    { "column": "status", "operator": "equals", "value": "done" },
    { "column": "responsible", "operator": "equals", "value": "__CURRENT_USER__" }
  ],
  "operators": ["OR"],
  "OR_conditions": [
    { "column": "qualityControl", "operator": "equals", "value": "__CURRENT_USER__" },
    { "column": "responsible", "operator": "equals", "value": "__CURRENT_ROLE__" },
    { "column": "qualityControl", "operator": "equals", "value": "__CURRENT_ROLE__" }
  ]
}
```
- **Bedeutung:** `((responsible = aktueller user OR qc = aktueller user OR responsible = aktuelle rolle OR qc = aktuelle rolle) AND status = done)` - **OHNE Branch-Filter**

**Filter-Gruppen (nur für Admin):**

**"Rollen" Gruppe:**
- Für jede Rolle einen Filter:
  ```json
  {
    "conditions": [
      { "column": "responsible", "operator": "equals", "value": "role-{id}" },
      { "column": "status", "operator": "notEquals", "value": "done" }
    ],
    "operators": ["AND"]
  }
  ```
  - **Bedeutung:** `responsible = rolle-{id} AND status != done`

**"Benutzer" Gruppe:**
- Für jeden Benutzer einen Filter:
  ```json
  {
    "conditions": [
      { "column": "responsible", "operator": "equals", "value": "user-{id}" },
      { "column": "status", "operator": "notEquals", "value": "done" }
    ],
    "operators": ["OR"],
    "OR_conditions": [
      { "column": "qualityControl", "operator": "equals", "value": "user-{id}" }
    ]
  }
  ```
  - **Bedeutung:** `(responsible = user-{id} OR qc = user-{id}) AND status != done`

#### 4.3 Reservations Standardfilter

**Berechtigungs-Prüfung:**
- **User-Rolle:** Alle Rollen einer Organisation + alle Rollen von Org 1, AUSSER Admin & Owner
- **Admin-Rolle:** Admin & Owner einer Organisation + Admin & Owner von Org 1
- Prüfung über Funktion `isAdminOrOwner(req)` oder über Berechtigungen & DB-Einträge

**Für User-Rolle:**

**"Heute" Filter:**
```json
{
  "conditions": [
    { "column": "checkInDate", "operator": "equals", "value": "__TODAY__" },
    { "column": "branch", "operator": "equals", "value": "__CURRENT_BRANCH__" }
  ],
  "operators": ["AND"]
}
```
- **Bedeutung:** `checkInDate = aktueller tag AND branch = aktueller branch`

**"Morgen" Filter:**
```json
{
  "conditions": [
    { "column": "checkInDate", "operator": "after", "value": "__TODAY__" },
    { "column": "branch", "operator": "equals", "value": "__CURRENT_BRANCH__" }
  ],
  "operators": ["AND"]
}
```
- **Bedeutung:** `checkInDate > aktueller tag AND branch = aktueller branch`

**"Gestern" Filter:**
```json
{
  "conditions": [
    { "column": "checkInDate", "operator": "before", "value": "__TODAY__" },
    { "column": "branch", "operator": "equals", "value": "__CURRENT_BRANCH__" }
  ],
  "operators": ["AND"]
}
```
- **Bedeutung:** `checkInDate < aktueller tag AND branch = aktueller branch`

**Für Admin-Rolle:**

**Filter-Gruppen (3 Gruppen mit je 3 Filtern):**

**"Heute" Gruppe:**
- "Manila":
  ```json
  {
    "conditions": [
      { "column": "checkInDate", "operator": "equals", "value": "__TODAY__" },
      { "column": "branch", "operator": "equals", "value": "Manila" }
    ],
    "operators": ["AND"]
  }
  ```
- "Parque Poblado":
  ```json
  {
    "conditions": [
      { "column": "checkInDate", "operator": "equals", "value": "__TODAY__" },
      { "column": "branch", "operator": "equals", "value": "Parque Poblado" }
    ],
    "operators": ["AND"]
  }
  ```
- "Alle":
  ```json
  {
    "conditions": [
      { "column": "checkInDate", "operator": "equals", "value": "__TODAY__" }
    ],
    "operators": []
  }
  ```
  - **Bedeutung:** `checkInDate = aktueller tag` (ohne Branch-Filter)

**"Morgen" Gruppe:**
- "Manila":
  ```json
  {
    "conditions": [
      { "column": "checkInDate", "operator": "after", "value": "__TODAY__" },
      { "column": "branch", "operator": "equals", "value": "Manila" }
    ],
    "operators": ["AND"]
  }
  ```
- "Parque Poblado":
  ```json
  {
    "conditions": [
      { "column": "checkInDate", "operator": "after", "value": "__TODAY__" },
      { "column": "branch", "operator": "equals", "value": "Parque Poblado" }
    ],
    "operators": ["AND"]
  }
  ```
- "Alle":
  ```json
  {
    "conditions": [
      { "column": "checkInDate", "operator": "after", "value": "__TODAY__" }
    ],
    "operators": []
  }
  ```
  - **Bedeutung:** `checkInDate > aktueller tag` (ohne Branch-Filter)

**"Gestern" Gruppe:**
- "Manila":
  ```json
  {
    "conditions": [
      { "column": "checkInDate", "operator": "before", "value": "__TODAY__" },
      { "column": "branch", "operator": "equals", "value": "Manila" }
    ],
    "operators": ["AND"]
  }
  ```
- "Parque Poblado":
  ```json
  {
    "conditions": [
      { "column": "checkInDate", "operator": "before", "value": "__TODAY__" },
      { "column": "branch", "operator": "equals", "value": "Parque Poblado" }
    ],
    "operators": ["AND"]
  }
  ```
- "Alle":
  ```json
  {
    "conditions": [
      { "column": "checkInDate", "operator": "before", "value": "__TODAY__" }
    ],
    "operators": []
  }
  ```
  - **Bedeutung:** `checkInDate < aktueller tag` (ohne Branch-Filter)

**Hinweis:** Branch-Namen müssen aus der Datenbank geholt werden (nicht hardcodiert). Manila und Parque Poblado sind Beispiele.

#### 4.4 Seed-Implementierung

**Datei:** `backend/prisma/seed.ts`

**Schritte:**
1. `createStandardFilters` Funktion erweitern
2. Rollen-Prüfung hinzufügen: `isAdminOrOwner(userId)`
3. Branch-Informationen aus User-Kontext holen
4. Filter-Gruppen für Admin erstellen
5. Placeholder (`__CURRENT_BRANCH__`, `__CURRENT_USER__`, `__CURRENT_ROLE__`) verwenden
6. Backend muss Placeholder beim Anwenden ersetzen

**Hinweis:** Placeholder müssen im Backend beim Anwenden des Filters durch echte Werte ersetzt werden (nicht im Seed).

---

### Phase 5: Performance & Sicherheit prüfen

#### 5.1 Memory Leaks beheben (PRIORITÄT 1) 🔴🔴🔴

**Referenz:** `docs/technical/MEMORY_LEAK_FILTER_OPERATIONEN_FIX_PLAN_2025-12-02.md`

**Aufgaben:**
1. FilterContext: TTL und Limits für Filter-Cache hinzufügen
2. SavedFilterTags: Alle console.log Statements wrappen
3. FilterPane: `JSON.stringify()` nur bei tatsächlichen Änderungen verwenden
4. Worktracker: Alle Filter-States im Cleanup löschen (auch `filterSortDirections`)

**Erwartete Verbesserung:**
- RAM-Verbrauch: Von > 2.1GB → < 500MB bei Filter-Operationen
- Memory-Leaks: Behebung aller identifizierten Leaks

#### 5.2 FilterContext Race Condition beheben (PRIORITÄT 1) 🔴🔴🔴

**Referenz:** `docs/technical/FILTER_CONTEXT_RACE_CONDITION_FIX_2025-12-02.md`

**Aufgaben:**
1. `cleanupOldFilters`: `loadedTablesRef` nur löschen, wenn Filter aus State gelöscht werden
2. `loadFilters`: Prüfung auf Filter im State, nicht nur `loadedTablesRef`

**Erwartete Verbesserung:**
- Requests laden wieder korrekt nach Memory-Leak-Fixes
- Keine Race Conditions mehr

#### 5.3 Doppelte Filterung beheben (PRIORITÄT 1) 🔴🔴🔴

**Referenz:** `docs/technical/INFINITE_SCROLL_UND_FILTER_FIX_PLAN_2025-01-29.md`

**Aufgaben:**
1. Requests: Filter nur server-seitig anwenden (client-seitige Filterung entfernen)
2. Tasks: Filter nur server-seitig anwenden (client-seitige Filterung entfernen)
3. Reservations: Filter nur server-seitig anwenden (client-seitige Filterung entfernen)

**Erwartete Verbesserung:**
- Filter wird nicht mehr doppelt angewendet
- Korrekte Anzahl von Ergebnissen
- Weniger Re-Renders

#### 5.4 Infinite Scroll korrigieren (PRIORITÄT 2) 🔴🔴

**Referenz:** `docs/technical/INFINITE_SCROLL_UND_FILTER_FIX_PLAN_2025-01-29.md`

**Aufgaben:**
1. Requests: Prüfung auf `filteredAndSortedRequests.length` statt `requests.length`
2. Tasks: Prüfung auf `filteredAndSortedTasks.length` statt `tasks.length`
3. Reservations: Prüfung auf `filteredAndSortedReservations.length` statt `reservations.length`

**Erwartete Verbesserung:**
- Infinite Scroll funktioniert wieder korrekt
- Korrekte Anzeige von "Mehr laden" Button

#### 5.5 Prisma Connection Pool Problem beheben (PRIORITÄT 1) 🔴🔴🔴

**Referenz:** `docs/technical/PRISMA_CONNECTION_POOL_PROBLEM_ANALYSE_UND_FIX_PLAN_2025-12-02.md`

**Aufgaben:**
1. Singleton Pattern implementieren (1 Instanz statt 10)
2. `connection_limit: 20-30` setzen
3. `activeQueries` Counter korrigieren (wird bei Fehlern reduziert)

**Erwartete Verbesserung:**
- RAM-Verbrauch: Von > 4GB → < 600MB
- System blockiert nicht mehr
- Keine "Can't reach database server" Fehler mehr

#### 5.1 Performance-Verbesserungen

**Was verbessert wird:**
- ✅ Weniger State-Updates (keine komplexe Sortierungs-Logik)
- ✅ Weniger Re-Renders (keine useMemo für komplexe Sortierung)
- ✅ Weniger DOM-Manipulation (kein Drag & Drop)
- ✅ Weniger API-Calls (keine Filter-Sortierung an Server)

**Was geprüft werden muss:**
- ✅ Infinite Scroll funktioniert korrekt
- ✅ Filter-Anwendung ist schnell
- ✅ Keine Memory-Leaks

#### 5.2 Sicherheit prüfen

**Was geprüft werden muss:**
- ✅ Rollen-Isolation funktioniert korrekt
- ✅ Branch-Isolation funktioniert korrekt
- ✅ Filter können keine unerlaubten Daten anzeigen
- ✅ Standardfilter respektieren Berechtigungen

**Risiken:**
- ⚠️ Placeholder (`__CURRENT_BRANCH__`, etc.) müssen korrekt ersetzt werden
- ⚠️ Rollen-Prüfung muss korrekt funktionieren
- ⚠️ Branch-Isolation muss korrekt funktionieren

---

## 📋 IMPLEMENTIERUNGSREIHENFOLGE

### Schritt 1: Filter-Sortierung entfernen (Priorität 1) 🔴🔴🔴

**Aufwand:** 4-6 Stunden
**Risiko:** Mittel (viele Dateien betroffen)

**Status:** ✅ **90% ABGESCHLOSSEN** (nur Migration anwenden & Tests ausstehend)

#### ✅ Abgeschlossen:
1. ✅ **Frontend:** Alle `filterSortDirections` Referenzen entfernt
   - `Requests.tsx`: State, Funktionen, Props entfernt
   - `Worktracker.tsx`: States für Tasks & Reservations entfernt
   - Filter-Sortierung aus `filteredAndSorted*` useMemo entfernt
   - Alle `setFilterSortDirections` Aufrufe entfernt
   - `savedSortDirections` und `onSortDirectionsChange` Props entfernt
2. ✅ **Backend:** `sortDirections` aus Controller & Cache entfernt
   - `savedFilterController.ts`: Interface, Speichern, Rückgabe entfernt
   - `filterListCache.ts`: Parsing und Rückgabe entfernt
   - Migration-Logik entfernt
3. ✅ **Tests:** Linter-Checks erfolgreich (keine Fehler)

#### ✅ Abgeschlossen (Update):
1. ✅ **Backend:** `sortDirections` Feld aus Schema entfernt
2. ✅ **Migration:** Erstellt und angewendet
3. ✅ **Prisma Client:** Generiert

#### ✅ Tests abgeschlossen:
1. ✅ **Linter-Checks:** Keine Fehler
2. ✅ **Code-Review:** Alle Referenzen entfernt (nur Kommentare verbleiben)
3. ✅ **Filter-Funktionalität:** 
   - `applyFilterConditions` funktioniert ohne `sortDirections`
   - `handleFilterChange` funktioniert ohne `sortDirections`
   - `filteredAndSorted*` useMemo funktioniert ohne Filter-Sortierung
   - Hauptsortierung (`sortConfig`, `tableSortConfig`) bleibt erhalten

**Status:** ✅ **PHASE 1 ABGESCHLOSSEN** (100%)

### Schritt 2: Hauptsortierung BEHALTEN & vereinfachen (Priorität 2) 🔴🔴

**Aufwand:** 2-3 Stunden
**Risiko:** Niedrig (bestehende Funktionalität beibehalten)

**Status:** ✅ **ABGESCHLOSSEN** (100%)

#### ✅ Abgeschlossen:
1. ✅ Bestehende `sortConfig` State BEHALTEN (Requests, To Do's, Reservations)
2. ✅ Bestehende `handleSort` Funktion BEHALTEN
3. ✅ Bestehende Spaltentitel-Klick-Funktionalität BEHALTEN
4. ✅ Sortierung synchron für Table & Card (gleicher `sortConfig` State)
   - Requests: `sortConfig` für Table & Card
   - Tasks: `tableSortConfig` für Table & Card
   - Reservations: `reservationTableSortConfig` für Table & Card
5. ✅ Filter-Sortierung entfernt (aus `filteredAndSorted*` useMemo) - Phase 1
6. ✅ Card-Sortierung entfernt (aus `filteredAndSorted*` useMemo)
   - `cardSortDirections` State entfernt (Requests)
   - `taskCardSortDirections` State entfernt (Worktracker)
   - `reservationCardSortDirections` State entfernt (Worktracker)
   - Card-Sortierung aus useMemo entfernt
   - Hauptsortierung (`sortConfig`/`tableSortConfig`/`reservationTableSortConfig`) wird jetzt für Table & Card verwendet

#### ⏳ Noch zu tun:
1. ⚠️ Tour Bookings: Hauptsortierung implementieren (analog zu To Do's/Reservations) - später
2. ⏳ Tests: Prüfen, dass Sortierung funktioniert (wie ursprünglich)

### Schritt 3: Überflüssige Komplexität entfernen (Priorität 3) 🔴

**Aufwand:** 6-8 Stunden
**Risiko:** Mittel (viele Dateien betroffen)

1. Table Settings entfernen
2. Card-Metadaten-Mapping entfernen
3. Drag & Drop entfernen
4. Doppelte Funktionen entfernen
5. Controlled Mode entfernen
6. Fallback-Timeout entfernen
7. Cleanup useEffects entfernen
8. Tests: Prüfen, dass alles noch funktioniert

### Schritt 4: Standardfilter korrekt implementieren (Priorität 4) 🔴

**Aufwand:** 4-6 Stunden
**Risiko:** Mittel (Backend-Änderungen nötig)

1. Seed erweitern mit korrekten Standardfiltern
2. Placeholder-System implementieren (Backend)
3. Rollen-Prüfung implementieren
4. Branch-Isolation implementieren
5. Filter-Gruppen für Admin erstellen
6. Tests: Prüfen, dass alle Standardfilter korrekt funktionieren

### Schritt 5: Performance & Sicherheit prüfen (Priorität 5) 🔴

**Aufwand:** 2-3 Stunden
**Risiko:** Niedrig (nur Prüfung)

1. Performance-Tests
2. Sicherheits-Tests
3. Rollen-Isolation-Tests
4. Branch-Isolation-Tests

---

## ⚠️ RISIKEN UND MITIGATION

### Risiko 1: Filter-Sortierung entfernen bricht bestehende Filter

**Risiko:** Mittel
**Mitigation:**
- Migration: Bestehende Filter mit `sortDirections` ignorieren (nicht mehr verwenden)
- Keine Daten löschen, nur nicht mehr verwenden
- Tests: Prüfen, dass bestehende Filter noch funktionieren (ohne Sortierung)

### Risiko 2: Hauptsortierung funktioniert nicht wie erwartet

**Risiko:** Niedrig
**Mitigation:**
- Einfache Implementierung (nur eine Sortierung)
- Tests: Prüfen, dass Sortierung funktioniert
- Rollback möglich (alte Sortierungs-Logik wiederherstellen)

### Risiko 3: Standardfilter funktionieren nicht korrekt

**Risiko:** Mittel
**Mitigation:**
- Placeholder-System sorgfältig implementieren
- Rollen-Prüfung sorgfältig implementieren
- Branch-Isolation sorgfältig implementieren
- Tests: Prüfen, dass alle Standardfilter korrekt funktionieren

### Risiko 4: Performance verschlechtert sich

**Risiko:** Niedrig
**Mitigation:**
- Weniger Komplexität = bessere Performance
- Tests: Performance-Tests durchführen
- Monitoring: Performance überwachen

### Risiko 5: Sicherheit wird beeinträchtigt

**Risiko:** Mittel
**Mitigation:**
- Rollen-Isolation sorgfältig prüfen
- Branch-Isolation sorgfältig prüfen
- Filter-Validierung sorgfältig prüfen
- Tests: Sicherheits-Tests durchführen

---

## ✅ ERFOLGSKRITERIEN

- [ ] Filter-Sortierung komplett entfernt
- [ ] Hauptsortierung funktioniert (Button mit Modal)
- [ ] Table-Spaltentitel-Sortierung synchron mit Hauptsortierung
- [ ] Card-Ansicht: Gleiche Sortierung wie Table
- [ ] Keine Drag & Drop mehr (nur direkt in Spaltentiteln)
- [ ] Alle überflüssigen States/Funktionen entfernt
- [ ] Standardfilter korrekt implementiert (Requests, To Do's, Reservations)
- [ ] Rollen-basierte Filter funktionieren korrekt
- [ ] Branch-Isolation funktioniert korrekt
- [ ] Performance verbessert (weniger Komplexität)
- [ ] Sicherheit nicht beeinträchtigt
- [ ] Alle Tests bestehen

---

## 🔍 DETAILLIERTE ANALYSE: WAS WURDE ÜBERSEHEN?

### 1. FILTER-ERSTELLUNG: JETZT vs. NACHHER

#### **JETZT (Aktueller Zustand):**

**Frontend (FilterPane.tsx):**
- User erstellt Filter über UI
- POST zu `/api/saved-filters` mit:
  ```json
  {
    "tableId": "requests-table",
    "name": "Mein Filter",
    "conditions": [{ "column": "status", "operator": "equals", "value": "pending" }],
    "operators": [],
    "sortDirections": []  // ⚠️ Wird gespeichert, aber nicht mehr verwendet
  }
  ```
- Backend speichert in `SavedFilter` Tabelle mit `userId`, `tableId`, `name`, `conditions` (JSON), `operators` (JSON), `sortDirections` (JSON)

**Seed (seed.ts):**
- Erstellt Filter direkt mit Prisma
- Hardcodierte Werte (z.B. `status != 'done'`)
- Keine Placeholder
- Keine Rollen-Prüfung
- Keine Branch-Isolation

**Beispiel aus Seed:**
```typescript
await prisma.savedFilter.create({
  data: {
    userId,
    tableId: 'worktracker-todos',
    name: 'Aktuell',
    conditions: JSON.stringify([
      { column: 'status', operator: 'notEquals', value: 'done' }
    ]),
    operators: JSON.stringify([])
  }
});
```

#### **NACHHER (Ziel-Zustand):**

**Seed muss Filter so erstellen, als würde man sie über Frontend erstellen:**

1. **Placeholder verwenden:**
   - `__CURRENT_BRANCH__` → wird beim Anwenden durch `req.branchId` ersetzt
   - `__CURRENT_USER__` → wird beim Anwenden durch `req.userId` ersetzt
   - `__CURRENT_ROLE__` → wird beim Anwenden durch `req.userRole?.role?.id` ersetzt
   - `__TODAY__` → wird bereits unterstützt ✅

2. **Rollen-Prüfung:**
   - Prüfe `isAdminOrOwner(req)` über `req.userRole?.role?.name`
   - Für User-Rolle: Filter mit Branch-Filter
   - Für Admin-Rolle: Filter ohne Branch-Filter (oder mit Filter-Gruppen)

3. **Filter-Gruppen:**
   - Für Admin: Filter-Gruppen erstellen (z.B. "Heute" mit 3 Filtern: Manila, Parque Poblado, Alle)
   - Für User: Einzelne Filter (z.B. "Heute" mit Branch-Filter)

**Beispiel für Seed (nachher):**
```typescript
// Für User-Rolle
await prisma.savedFilter.create({
  data: {
    userId,
    tableId: 'requests-table',
    name: 'Alle',
    conditions: JSON.stringify([
      { column: 'status', operator: 'notEquals', value: 'approved' },
      { column: 'branch', operator: 'equals', value: '__CURRENT_BRANCH__' }
    ]),
    operators: JSON.stringify(['AND'])
  }
});

// Für Admin-Rolle
await prisma.savedFilter.create({
  data: {
    userId,
    tableId: 'worktracker-reservations',
    name: 'Heute',
    conditions: JSON.stringify([
      { column: 'checkInDate', operator: 'equals', value: '__TODAY__' }
      // Kein Branch-Filter für Admin
    ]),
    operators: JSON.stringify([])
  }
});
```

#### **UNTERSCHIEDE:**

| Aspekt | JETZT | NACHHER |
|--------|-------|---------|
| **Placeholder** | ❌ Keine | ✅ `__CURRENT_BRANCH__`, `__CURRENT_USER__`, `__CURRENT_ROLE__` |
| **Rollen-Prüfung** | ❌ Keine | ✅ `isAdminOrOwner(req)` |
| **Branch-Isolation** | ❌ Hardcodiert | ✅ Dynamisch über Placeholder |
| **Filter-Gruppen** | ⚠️ Teilweise (nur für Rollen/User) | ✅ Für Admin (Heute/Morgen/Gestern) |
| **Standardfilter** | ⚠️ Einfach (nur Status) | ✅ Komplex (Status + Branch + User/Role) |

---

### 2. BERECHTIGUNGS-VERWALTUNG: JETZT vs. NACHHER

#### **JETZT (Aktueller Zustand):**

**Frontend (RoleManagementTab.tsx):**
- User erstellt/bearbeitet Rollen über UI
- POST zu `/api/roles` (create) oder PUT zu `/api/roles/:id` (update) mit:
  ```json
  {
    "name": "Meine Rolle",
    "description": "Beschreibung",
    "permissions": [
      { "entity": "dashboard", "entityType": "page", "accessLevel": "both" },
      { "entity": "requests", "entityType": "table", "accessLevel": "both" }
    ],
    "allBranches": true,
    "branchIds": []
  }
  ```
- Backend speichert in `Role` Tabelle mit `organizationId`, `name`, `description`, `allBranches`
- Berechtigungen werden in `Permission` Tabelle gespeichert (Relation zu `Role`)

**Seed (seed.ts):**
- Erstellt Rollen direkt mit Prisma
- Hardcodierte Berechtigungen (z.B. Admin bekommt alle Berechtigungen)
- Keine dynamische Prüfung

**Beispiel aus Seed:**
```typescript
const adminRole = await prisma.role.create({
  data: {
    name: 'Admin',
    description: 'Administrator der Organisation',
    organizationId: organization.id,
    permissions: {
      create: ALL_PAGES.map(page => ({
        entity: page,
        entityType: 'page',
        accessLevel: 'both'
      }))
    }
  }
});
```

#### **NACHHER (Ziel-Zustand):**

**Seed muss Rollen so erstellen, als würde man sie über Frontend erstellen:**

1. **Gleiche Struktur:**
   - Gleiche `permissions` Array-Struktur
   - Gleiche `allBranches` / `branchIds` Logik
   - Gleiche `organizationId` Zuweisung

2. **Keine Änderungen nötig:**
   - Berechtigungen werden bereits korrekt über Frontend verwaltet
   - Seed erstellt Rollen bereits korrekt
   - **ABER:** Prüfung, ob Frontend alle benötigten Berechtigungen unterstützt

#### **UNTERSCHIEDE:**

| Aspekt | JETZT | NACHHER |
|--------|-------|---------|
| **Struktur** | ✅ Korrekt | ✅ Bleibt gleich |
| **Frontend-Support** | ✅ Vollständig | ✅ Vollständig |
| **Seed-Implementierung** | ✅ Korrekt | ✅ Bleibt gleich |
| **Prüfung nötig** | ❌ | ✅ Prüfen, ob alle benötigten Berechtigungen im Frontend verfügbar sind |

---

### 3. PLACEHOLDER-SYSTEM: IMPLEMENTIERUNG

#### **AKTUELLER ZUSTAND:**

**Unterstützt:**
- ✅ `__TODAY__` → wird in `convertDateCondition` behandelt (filterToPrisma.ts Zeile 301)

**NICHT unterstützt:**
- ❌ `__CURRENT_BRANCH__` → muss implementiert werden
- ❌ `__CURRENT_USER__` → muss implementiert werden
- ❌ `__CURRENT_ROLE__` → muss implementiert werden

#### **IMPLEMENTIERUNG NÖTIG:**

**Datei:** `backend/src/utils/filterToPrisma.ts`

**1. Branch-Placeholder (`__CURRENT_BRANCH__`):**

In `convertBranchCondition`:
```typescript
function convertBranchCondition(value: any, operator: string, req: Request): any {
  if (typeof value === 'string') {
    // Handle __CURRENT_BRANCH__ placeholder
    if (value === '__CURRENT_BRANCH__') {
      const branchId = (req as any).branchId;
      if (!branchId) {
        return {}; // Kein Branch-Filter wenn branchId nicht vorhanden
      }
      return { branchId: branchId };
    }
    
    // Normaler Branch-Name
    if (operator === 'equals') {
      return { branch: { name: { equals: value, mode: 'insensitive' } } };
    } else if (operator === 'contains') {
      return { branch: { name: { contains: value, mode: 'insensitive' } } };
    }
  }
  return {};
}
```

**2. User-Placeholder (`__CURRENT_USER__`):**

In `convertUserRoleCondition`:
```typescript
function convertUserRoleCondition(
  value: any,
  operator: string,
  entityType: 'request' | 'task' | 'tour' | 'tour_booking' | 'reservation',
  field: 'responsible' | 'qualityControl' | 'requestedBy' | 'createdBy' | 'bookedBy',
  req: Request  // ⚠️ NEU: req Parameter hinzufügen
): any {
  if (typeof value !== 'string') {
    return {};
  }

  // Handle __CURRENT_USER__ placeholder
  if (value === '__CURRENT_USER__') {
    const userId = parseInt((req as any).userId, 10);
    if (isNaN(userId)) {
      return {};
    }
    
    // Verwende gleiche Logik wie user-{id}
    return convertUserRoleCondition(`user-${userId}`, operator, entityType, field, req);
  }

  // Handle user-{id} format (bestehend)
  if (value.startsWith('user-')) {
    // ... bestehende Logik
  }

  // Handle role-{id} format (bestehend)
  if (value.startsWith('role-')) {
    // ... bestehende Logik
  }

  return {};
}
```

**3. Role-Placeholder (`__CURRENT_ROLE__`):**

In `convertUserRoleCondition`:
```typescript
// Handle __CURRENT_ROLE__ placeholder
if (value === '__CURRENT_ROLE__') {
  const roleId = (req as any).userRole?.role?.id;
  if (!roleId) {
    return {};
  }
  
  // Verwende gleiche Logik wie role-{id}
  return convertUserRoleCondition(`role-${roleId}`, operator, entityType, field, req);
}
```

**4. Funktionen anpassen:**

- `convertSingleCondition` muss `req` Parameter erhalten
- `convertFilterConditionsToPrismaWhere` muss `req` Parameter erhalten
- Alle Aufrufe müssen `req` übergeben

---

### 4. ROLLEN-PRÜFUNG: IMPLEMENTIERUNG

#### **AKTUELLER ZUSTAND:**

**Funktion:** `isAdminOrOwner(req)` in `backend/src/middleware/organization.ts`

**Implementierung:**
```typescript
export const isAdminOrOwner = (req: Request): boolean => {
  return isAdminRole(req) || isOwnerRole(req);
};

export const isAdminRole = (req: Request): boolean => {
  const roleName = req.userRole?.role?.name;
  if (!roleName) return false;
  const roleNameLower = roleName.toLowerCase();
  return roleNameLower === 'admin' || roleNameLower.includes('administrator');
};

export const isOwnerRole = (req: Request): boolean => {
  const roleName = req.userRole?.role?.name;
  if (!roleName) return false;
  const roleNameLower = roleName.toLowerCase();
  return roleNameLower === 'owner';
};
```

**✅ Funktioniert bereits korrekt!**

#### **VERWENDUNG IM SEED:**

**Problem:** Seed hat keinen `req` Kontext!

**Lösung:** Seed muss Rollen-Prüfung anders machen:

```typescript
// Im Seed: Prüfe Rollen-Name direkt
const userRole = await prisma.userRole.findFirst({
  where: {
    userId: userId,
    lastUsed: true
  },
  include: {
    role: {
      select: {
        name: true,
        organizationId: true
      }
    }
  }
});

const isAdmin = userRole?.role?.name?.toLowerCase() === 'admin' || 
                userRole?.role?.name?.toLowerCase() === 'owner';
```

---

### 5. WAS WURDE ÜBERSEHEN?

#### **KRITISCH:**

1. **Placeholder-System fehlt komplett:**
   - `__CURRENT_BRANCH__` → muss implementiert werden
   - `__CURRENT_USER__` → muss implementiert werden
   - `__CURRENT_ROLE__` → muss implementiert werden

2. **Seed kann keine Rollen-Prüfung machen:**
   - Seed hat keinen `req` Kontext
   - Muss Rollen-Name direkt aus DB prüfen

3. **Branch-Namen müssen aus DB geholt werden:**
   - Nicht hardcodiert (z.B. "Manila", "Parque Poblado")
   - Muss dynamisch aus `Branch` Tabelle geholt werden

4. **Filter-Gruppen für Admin:**
   - Aktuell nur für Rollen/User-Filter
   - Muss auch für Reservations-Filter (Heute/Morgen/Gestern) erstellt werden

#### **WICHTIG:**

5. **Frontend-Berechtigungen prüfen:**
   - Prüfen, ob alle benötigten Berechtigungen im Frontend verfügbar sind
   - Falls nicht, Frontend erweitern

6. **Migration bestehender Filter:**
   - Bestehende Filter mit `sortDirections` ignorieren (nicht löschen)
   - Bestehende Standardfilter aktualisieren (Placeholder hinzufügen)

#### **NICHT KRITISCH:**

7. **Performance:**
   - Placeholder-Ersetzung sollte schnell sein (nur String-Ersetzung)
   - Keine zusätzlichen DB-Queries nötig

8. **Sicherheit:**
   - Placeholder müssen korrekt validiert werden
   - Keine SQL-Injection möglich (Prisma schützt)

---

### 6. RISIKEN (ERWEITERT)

#### **RISIKO 6: Placeholder werden nicht korrekt ersetzt**

**Risiko:** Hoch
**Mitigation:**
- Sorgfältige Implementierung in `filterToPrisma.ts`
- Tests: Prüfen, dass alle Placeholder korrekt ersetzt werden
- Fallback: Wenn Placeholder nicht ersetzt werden kann, Filter ignorieren (leeres Ergebnis)

#### **RISIKO 7: Seed kann Rollen nicht korrekt prüfen**

**Risiko:** Mittel
**Mitigation:**
- Rollen-Name direkt aus DB prüfen (nicht über `req`)
- Tests: Prüfen, dass Standardfilter für richtige Rollen erstellt werden
- Fallback: Wenn Rolle nicht gefunden, keine Standardfilter erstellen

#### **RISIKO 8: Branch-Namen ändern sich**

**Risiko:** Niedrig
**Mitigation:**
- Branch-Namen dynamisch aus DB holen
- Tests: Prüfen, dass Filter-Gruppen korrekt erstellt werden
- Fallback: Wenn Branch nicht gefunden, Filter ohne Branch-Filter erstellen

---

---

## ⚠️ KRITISCHE PRÜFUNG: WAS FEHLT BEI ENTFERNUNG?

### 1. `useTableSettings` Hook

**Status:** ❌ NICHT überflüssig - WIRD VERWENDET

**Verwendung:**
- ✅ Spaltenreihenfolge (`columnOrder`) - wird in Table-Ansicht verwendet
- ✅ Versteckte Spalten (`hiddenColumns`) - wird in Table-Ansicht verwendet
- ✅ View-Mode (`viewMode`) - wird für Table/Cards Umschaltung verwendet
- ✅ Persistierung in DB - wird über `tableSettingsApi` gespeichert

**Was fehlt bei Entfernung:**
- ❌ Spalten können nicht mehr verschoben werden
- ❌ Spalten können nicht mehr ein-/ausgeblendet werden
- ❌ View-Mode (Table/Cards) wird nicht mehr gespeichert
- ❌ Benutzer-Einstellungen gehen verloren

**Lösung:**
- ✅ BEHALTEN - aber vereinfachen (nur columnOrder, hiddenColumns, viewMode)
- ❌ ENTFERNEN: `defaultVisibleCardMetadata`, `defaultCardColumnOrder`, `defaultCardSortDirections` (nicht verwendet)

---

### 2. `cardMetadataOrder`, `getCardMetadataFromColumnOrder`, `getHiddenCardMetadata`

**Status:** ❌ NICHT überflüssig - WIRD VERWENDET

**Verwendung:**
- ✅ `cardMetadataOrder` - bestimmt Reihenfolge der Metadaten in Cards
- ✅ `getCardMetadataFromColumnOrder` - konvertiert Table-Spalten zu Card-Metadaten
- ✅ `getHiddenCardMetadata` - bestimmt welche Metadaten in Cards ausgeblendet werden
- ✅ `visibleCardMetadata` - wird verwendet um Metadaten in Cards anzuzeigen/auszublenden

**Was fehlt bei Entfernung:**
- ❌ Cards zeigen alle Metadaten an (keine Kontrolle mehr)
- ❌ Metadaten-Reihenfolge ist nicht mehr steuerbar
- ❌ Keine Synchronisation zwischen Table-Spalten und Card-Metadaten

**Lösung:**
- ✅ BEHALTEN - aber vereinfachen (nur Mapping, keine komplexe Logik)

---

### 3. `handleMoveColumn`, `handleDragStart`, `handleDragOver`, `handleDrop`, `handleDragEnd`

**Status:** ⚠️ TEILWEISE überflüssig

**Verwendung:**
- ✅ `handleMoveColumn` - wird in `TableColumnConfig` Modal verwendet (Drag & Drop im Modal)
- ✅ `handleDragStart`, `handleDragOver`, `handleDrop`, `handleDragEnd` - werden in Spaltentiteln verwendet (Drag & Drop direkt in Table)

**Was fehlt bei Entfernung:**
- ❌ Spalten können nicht mehr im Modal verschoben werden
- ❌ Spalten können nicht mehr direkt in Spaltentiteln verschoben werden

**Lösung:**
- ⚠️ ENTFERNEN: Drag & Drop direkt in Spaltentiteln (wie gewünscht)
- ✅ BEHALTEN: Drag & Drop im `TableColumnConfig` Modal (für Spalten-Verschiebung)

---

### 4. `filteredAndSortedRequests` useMemo

**Status:** ⚠️ TEILWEISE überflüssig

**Verwendung:**
- ✅ Client-seitige Sortierung (3 Prioritäten: Table-Header, Filter, Cards)
- ✅ Client-seitige Suchfeld-Filterung (`searchTerm`)

**Was fehlt bei Entfernung:**
- ❌ Suchfeld funktioniert nicht mehr (client-seitige Filterung fehlt)
- ❌ Sortierung funktioniert nicht mehr (client-seitige Sortierung fehlt)

**Lösung:**
- ✅ BEHALTEN: Client-seitige Suchfeld-Filterung (nur `searchTerm`)
- ❌ ENTFERNEN: Client-seitige Sortierung (sollte server-seitig sein)
- ✅ VEREINFACHEN: Nur noch `searchTerm` Filterung, keine Sortierung mehr

---

### 5. `getPreviousStatus`, `getNextStatuses`

**Status:** ❌ NICHT überflüssig - WIRD VERWENDET

**Verwendung:**
- ✅ Status-Workflow-Buttons in Cards (Previous/Next Status)
- ✅ Bestimmt welche Status-Übergänge erlaubt sind

**Was fehlt bei Entfernung:**
- ❌ Status-Workflow-Buttons funktionieren nicht mehr
- ❌ Keine Status-Übergangs-Logik mehr

**Lösung:**
- ✅ BEHALTEN - diese Funktionen sind notwendig für Status-Workflow

---

### 6. `filterSortDirections` State

**Status:** ✅ ÜBERFLÜSSIG - SOLLTE ENTFERNT WERDEN

**Verwendung:**
- ⚠️ Wird in `FilterPane` gesetzt
- ⚠️ Wird in `SavedFilterTags` übergeben
- ⚠️ Wird in `filteredAndSortedRequests` verwendet (aber sollte nicht)

**Was fehlt bei Entfernung:**
- ✅ NICHTS - Filter-Sortierung sollte nie existiert haben
- ✅ Wird durch Hauptsortierung ersetzt

**Lösung:**
- ✅ ENTFERNEN - komplett entfernen
- ✅ ERSETZEN: Durch Hauptsortierung (Button mit Modal)

---

### 7. `sortConfig` State

**Status:** ⚠️ TEILWEISE überflüssig

**Verwendung:**
- ✅ Tabellen-Header-Sortierung (Klick auf Spaltentitel)
- ⚠️ Wird in `filteredAndSortedRequests` verwendet (client-seitige Sortierung)

**Was fehlt bei Entfernung:**
- ❌ Tabellen-Header-Sortierung funktioniert nicht mehr

**Lösung:**
- ✅ BEHALTEN: Tabellen-Header-Sortierung (sollte synchron mit Hauptsortierung sein)
- ❌ ENTFERNEN: Client-seitige Sortierung (sollte server-seitig sein)

---

### 8. `cardSortDirections` State

**Status:** ✅ ÜBERFLÜSSIG - SOLLTE ENTFERNT WERDEN

**Verwendung:**
- ⚠️ Wird in `TableColumnConfig` übergeben
- ⚠️ Wird in `filteredAndSortedRequests` verwendet (aber sollte nicht)

**Was fehlt bei Entfernung:**
- ✅ NICHTS - Card-Sortierung sollte durch Hauptsortierung ersetzt werden

**Lösung:**
- ✅ ENTFERNEN - komplett entfernen
- ✅ ERSETZEN: Durch Hauptsortierung (Button mit Modal)

---

### 9. `activeFilterName`, `selectedFilterId` States

**Status:** ⚠️ TEILWEISE überflüssig

**Verwendung:**
- ✅ Wird in `SavedFilterTags` übergeben (zeigt aktiven Filter an)
- ⚠️ Wird für "Controlled Mode" verwendet (aber nicht notwendig)

**Was fehlt bei Entfernung:**
- ❌ Aktiver Filter wird nicht mehr angezeigt
- ❌ Filter-Tags zeigen nicht mehr, welcher Filter aktiv ist

**Lösung:**
- ✅ BEHALTEN: `activeFilterName`, `selectedFilterId` (für UI-Feedback)
- ❌ ENTFERNEN: "Controlled Mode" Logik (nicht notwendig)

---

### 10. `applyFilterConditions` vs `handleFilterChange`

**Status:** ⚠️ TEILWEISE überflüssig

**Verwendung:**
- ✅ `applyFilterConditions` - wird von `FilterPane` aufgerufen (direkte Filter-Bedingungen)
- ✅ `handleFilterChange` - wird von `SavedFilterTags` aufgerufen (gespeicherter Filter)

**Was fehlt bei Entfernung:**
- ❌ Filter-Pane funktioniert nicht mehr
- ❌ Filter-Tags funktionieren nicht mehr

**Lösung:**
- ✅ BEHALTEN: Beide Funktionen (aber vereinfachen)
- ✅ VEREINFACHEN: Gleiche Logik, nur unterschiedliche Quellen (direkt vs. gespeichert)

---

### 11. `viewMode` aus Settings

**Status:** ❌ NICHT überflüssig - WIRD VERWENDET

**Verwendung:**
- ✅ Table/Cards Umschaltung
- ✅ Persistierung in DB

**Was fehlt bei Entfernung:**
- ❌ Table/Cards Umschaltung funktioniert nicht mehr
- ❌ View-Mode wird nicht mehr gespeichert

**Lösung:**
- ✅ BEHALTEN - notwendig für Table/Cards Umschaltung

---

### 12. `totalCount`, `hasMore` States

**Status:** ❌ NICHT überflüssig - WIRD VERWENDET

**Verwendung:**
- ✅ Infinite Scroll (wenn `hasMore === false`, keine weiteren Items)
- ✅ Pagination-Info (zeigt wie viele Items insgesamt)

**Was fehlt bei Entfernung:**
- ❌ Infinite Scroll funktioniert nicht mehr
- ❌ Keine Pagination-Info mehr

**Lösung:**
- ✅ BEHALTEN - notwendig für Infinite Scroll

---

### 13. `cards-mode` CSS-Klasse

**Status:** ⚠️ TEILWEISE überflüssig

**Verwendung:**
- ⚠️ Wird in `useEffect` gesetzt (für CSS-basierte Schattierungs-Entfernung)
- ⚠️ Wird in CSS verwendet (für spezielle Card-Ansicht-Styles)

**Was fehlt bei Entfernung:**
- ⚠️ CSS-Styles für Card-Ansicht funktionieren möglicherweise nicht mehr

**Lösung:**
- ✅ PRÜFEN: Ob CSS-Klasse wirklich benötigt wird
- ✅ ENTFERNEN: `useEffect` der CSS-Klasse setzt (kann direkt im JSX gesetzt werden)

---

### 14. Cleanup useEffect

**Status:** ⚠️ TEILWEISE überflüssig

**Verwendung:**
- ⚠️ Löscht Arrays beim Unmount (`setTasks([])`, etc.)

**Was fehlt bei Entfernung:**
- ✅ NICHTS - React macht automatisches Cleanup
- ⚠️ Arrays bleiben im Memory (aber werden beim Unmount automatisch freigegeben)

**Lösung:**
- ✅ ENTFERNEN - React macht automatisches Cleanup
- ⚠️ ABER: Wenn sehr große Arrays, könnte explizites Löschen helfen (aber nicht notwendig)

---

## 📊 ZUSAMMENFASSUNG: WAS WIRKLICH ÜBERFLÜSSIG IST

### ✅ WIRKLICH ÜBERFLÜSSIG (kann entfernt werden):

1. **`filterSortDirections` State** - Filter-Sortierung (sollte nie existiert haben)
2. **`cardSortDirections` State** - Card-Sortierung (sollte durch Hauptsortierung ersetzt werden)
3. **Client-seitige Sortierung in `filteredAndSortedRequests`** - sollte server-seitig sein
4. **Drag & Drop direkt in Spaltentiteln** - sollte nur im Modal sein
5. **Cleanup useEffect** - React macht automatisches Cleanup
6. **CSS-Klasse-Setting useEffect** - kann direkt im JSX gesetzt werden
7. **`getStatusLabel` Wrapper** - nur für Übersetzungen (kann direkt verwendet werden)
8. **"Controlled Mode" Logik** - nicht notwendig

### ❌ NICHT ÜBERFLÜSSIG (muss behalten werden):

1. **`useTableSettings` Hook** - für Spaltenreihenfolge, versteckte Spalten, View-Mode
2. **`cardMetadataOrder`, `getCardMetadataFromColumnOrder`, `getHiddenCardMetadata`** - für Card-Metadaten-Mapping
3. **`handleMoveColumn`** - für Drag & Drop im Modal
4. **`filteredAndSortedRequests`** - für Suchfeld-Filterung (aber Sortierung entfernen)
5. **`getPreviousStatus`, `getNextStatuses`** - für Status-Workflow
6. **`sortConfig`** - für Tabellen-Header-Sortierung
7. **`activeFilterName`, `selectedFilterId`** - für UI-Feedback
8. **`applyFilterConditions`, `handleFilterChange`** - für Filter-Anwendung
9. **`viewMode`** - für Table/Cards Umschaltung
10. **`totalCount`, `hasMore`** - für Infinite Scroll

---

## 🚨 PERFORMANCE-AUSWIRKUNGEN (VOLLSTÄNDIG)

### ✅ PERFORMANCE-VERBESSERUNGEN (bei Entfernung):

1. **Weniger State-Updates:**
   - `filterSortDirections` entfernen → weniger State-Updates
   - `cardSortDirections` entfernen → weniger State-Updates
   - "Controlled Mode" entfernen → weniger State-Updates

2. **Weniger Re-Renders:**
   - Client-seitige Sortierung entfernen → weniger Re-Renders
   - Komplexe `useMemo` entfernen → weniger Re-Renders

3. **Weniger DOM-Manipulation:**
   - Drag & Drop direkt in Spaltentiteln entfernen → weniger DOM-Events
   - Cleanup useEffect entfernen → weniger DOM-Manipulation

4. **Weniger API-Calls:**
   - Filter-Sortierung entfernen → keine Sortierung mehr an Server

5. **Weniger Memory-Verbrauch:**
   - Filter-Sortierung entfernen → weniger Daten im State
   - Client-seitige Sortierung entfernen → weniger temporäre Arrays

### ⚠️ PERFORMANCE-RISIKEN (bei Entfernung):

1. **Keine Risiken identifiziert:**
   - Alle entfernten Dinge sind überflüssig
   - Keine Performance-Verschlechterung erwartet

### 🔴 KRITISCHE PERFORMANCE-PROBLEME (müssen BEHOBEN werden):

1. **Memory Leaks in FilterContext:**
   - **Problem:** FilterContext speichert alle Filter dauerhaft (kein Cleanup)
   - **Impact:** RAM > 2.1GB bei Filter-Tag-Klicks
   - **Lösung:** TTL und Limits für Filter-Cache (siehe `MEMORY_LEAK_FILTER_OPERATIONEN_FIX_PLAN_2025-12-02.md`)
   - **Priorität:** 🔴🔴🔴 KRITISCH

2. **Console.log Statements (nicht gewrappt):**
   - **Problem:** SavedFilterTags hat 19 console.log Statements (nicht gewrappt)
   - **Impact:** Browser speichert alle Console-Logs im Memory → 10-50MB Memory
   - **Lösung:** Alle console.log mit `process.env.NODE_ENV === 'development'` wrappen
   - **Priorität:** 🔴🔴 WICHTIG

3. **FilterPane erstellt viele temporäre Arrays:**
   - **Problem:** `useEffect` verwendet `JSON.stringify()` bei jedem Render
   - **Impact:** 1-5MB Memory-Leak bei vielen Filter-Änderungen
   - **Lösung:** `JSON.stringify()` nur bei tatsächlichen Änderungen verwenden
   - **Priorität:** 🔴🔴 WICHTIG

4. **Worktracker Cleanup ist unvollständig:**
   - **Problem:** Cleanup löscht nur `filterConditions`, nicht `filterSortDirections`
   - **Impact:** Filter-States bleiben teilweise im Memory → 50-200MB Memory-Leak
   - **Lösung:** Alle Filter-States im Cleanup löschen (auch `filterSortDirections`)
   - **Priorität:** 🔴🔴 WICHTIG

5. **Doppelte Filterung (server-seitig + client-seitig):**
   - **Problem:** Filter wird doppelt angewendet (server-seitig + client-seitig)
   - **Impact:** Weniger Ergebnisse als erwartet, unnötige Re-Renders
   - **Lösung:** Filter nur server-seitig anwenden (siehe `INFINITE_SCROLL_UND_FILTER_FIX_PLAN_2025-01-29.md`)
   - **Priorität:** 🔴🔴 KRITISCH

6. **Infinite Scroll prüft falsche Länge:**
   - **Problem:** Infinite Scroll prüft `requests.length` statt `filteredAndSortedRequests.length`
   - **Impact:** Infinite Scroll funktioniert nicht richtig
   - **Lösung:** Prüfung auf `filteredAndSortedRequests.length` ändern
   - **Priorität:** 🔴🔴 WICHTIG

7. **Prisma Connection Pool Problem:**
   - **Problem:** `activeQueries` Counter wächst kontinuierlich (wird nicht reduziert bei Fehlern)
   - **Impact:** RAM > 600MB bis > 4GB, System blockiert
   - **Lösung:** Singleton Pattern (1 Instanz), `connection_limit: 20-30` (siehe `PRISMA_CONNECTION_POOL_PROBLEM_ANALYSE_UND_FIX_PLAN_2025-12-02.md`)
   - **Priorität:** 🔴🔴🔴 KRITISCH

8. **FilterContext Race Condition:**
   - **Problem:** Race Condition in `cleanupOldFilters` → Requests laden nicht mehr
   - **Impact:** System funktioniert nicht mehr nach Memory-Leak-Fixes
   - **Lösung:** `loadedTablesRef` nur löschen, wenn Filter aus State gelöscht werden (siehe `FILTER_CONTEXT_RACE_CONDITION_FIX_2025-12-02.md`)
   - **Priorität:** 🔴🔴🔴 KRITISCH

---

---

---

## 📝 FORTSCHRITT DOKUMENTATION

### Phase 1: Filter-Sortierung entfernen

**Start:** 2025-01-30
**Status:** ✅ 80% abgeschlossen

#### Durchgeführte Änderungen:

**Frontend (Requests.tsx):**
- ✅ `filterSortDirections` State entfernt (Zeile 213)
- ✅ `applyFilterConditions`: `sortDirections` Parameter entfernt
- ✅ `resetFilterConditions`: `setFilterSortDirections` entfernt
- ✅ `handleFilterChange`: `sortDirections` Parameter entfernt
- ✅ Filter-Sortierung aus `filteredAndSortedRequests` useMemo entfernt (Priorität 2)
- ✅ `filterSortDirections` aus useMemo Dependencies entfernt
- ✅ `savedSortDirections` und `onSortDirectionsChange` Props aus FilterPane entfernt

**Frontend (Worktracker.tsx):**
- ✅ `filterSortDirections` State entfernt (Zeile 388)
- ✅ `reservationFilterSortDirections` State entfernt (Zeile 381)
- ✅ `applyFilterConditions`: `sortDirections` Parameter entfernt
- ✅ `applyReservationFilterConditions`: `sortDirections` Parameter entfernt
- ✅ `handleFilterChange`: `sortDirections` Parameter entfernt
- ✅ `handleReservationFilterChange`: `sortDirections` Parameter entfernt
- ✅ Filter-Sortierung aus `filteredAndSortedTasks` useMemo entfernt (Priorität 2)
- ✅ Filter-Sortierung aus `filteredAndSortedReservations` useMemo entfernt (Priorität 2)
- ✅ `filterSortDirections` / `reservationFilterSortDirections` aus useMemo Dependencies entfernt
- ✅ `savedSortDirections` und `onSortDirectionsChange` Props aus FilterPane entfernt (4 Stellen)

**Backend (savedFilterController.ts):**
- ✅ `sortDirections` aus `SavedFilterRequest` Interface entfernt
- ✅ `sortDirections` aus Request-Body entfernt
- ✅ `sortDirectionsJson` entfernt
- ✅ `sortDirections` aus Prisma create/update entfernt
- ✅ `sortDirections` Migration entfernt
- ✅ `sortDirections` aus Response entfernt

**Backend (filterListCache.ts):**
- ✅ `sortDirections` Migration entfernt
- ✅ `sortDirections` Parsing entfernt
- ✅ `sortDirections` aus Response entfernt (getFilters & getFilterGroups)

**Backend (schema.prisma):**
- ✅ `sortDirections` Feld aus `SavedFilter` Model entfernt (Zeile 397)
- ✅ Migration erstellt: `20250130120000_remove_sort_directions_from_saved_filter/migration.sql`
- ✅ Prisma Client generiert

**Tests:**
- ✅ Linter-Checks: Keine Fehler
- ✅ Schema-Formatierung: Erfolgreich
- ⏳ Migration anwenden: `npx prisma migrate deploy` (muss vom Benutzer gemacht werden, da Server-Neustart nötig)
- ⏳ Funktionalitätstests: Filter funktionieren korrekt, keine Fehler

---

## 📚 GELESENE DOKUMENTE (VOLLSTÄNDIG)

### Performance-Dokumente (letzte 150 Stunden):

1. **`docs/technical/PERFORMANCE_PROBLEM_GELOEST_2025-01-29.md`** ✅ GELÖST
   - Hauptproblem: Organization Settings waren 63 MB groß (sollten < 10 KB sein)
   - Ursache: Mehrfache Verschlüsselung von `lobbyPms.apiKey`
   - Lösung: Verschlüsselungs-Check implementiert
   - Ergebnis: System läuft wieder deutlich schneller (5.5 Sekunden → 50ms)

2. **`docs/technical/PERFORMANCE_ENDSCHLEIFE_WORKTRACKER_FIX_2025-01-29.md`** ✅ BEHOBEN
   - Problem: Endlosschleife in Worktracker.tsx (1GB+ RAM, tausende Logs)
   - Ursache: `useEffect` Dependencies fehlten (`loadTasks`, `applyFilterConditions`)
   - Lösung: Loading-State hinzugefügt, Dependencies korrigiert, Fehlerbehandlung

3. **`docs/technical/MEMORY_LEAK_FILTER_OPERATIONEN_FIX_PLAN_2025-12-02.md`** 🔴 KRITISCH
   - Problem: RAM > 2.1GB bei Filter-Tag-Klicks
   - Ursachen:
     - FilterContext speichert alle Filter dauerhaft (kein Cleanup)
     - SavedFilterTags hat 19 console.log Statements (nicht gewrappt)
     - FilterPane erstellt viele temporäre Arrays/Strings
     - Worktracker Cleanup ist unvollständig
   - Lösung: TTL und Limits für Filter-Cache, Cleanup-Funktionen

4. **`docs/technical/PRISMA_CONNECTION_POOL_PROBLEM_ANALYSE_UND_FIX_PLAN_2025-12-02.md`** 🔴 KRITISCH
   - Problem: RAM > 600MB bis > 4GB, Prisma-Fehler "Can't reach database server"
   - Ursachen:
     - `activeQueries` Counter wächst kontinuierlich (wird nicht reduziert bei Fehlern)
     - Prisma unterstützt NICHT mehrere Connection Pools (alle teilen sich einen Pool)
     - Queue-Worker nutzen Prisma (können Counter erhöhen)
   - Lösung: Singleton Pattern (1 Instanz), `connection_limit: 20-30`

5. **`docs/technical/FILTER_CONTEXT_RACE_CONDITION_FIX_2025-12-02.md`** 🔴 KRITISCH
   - Problem: Requests laden nicht mehr nach Memory-Leak-Fixes
   - Ursache: Race Condition in FilterContext `cleanupOldFilters`
   - Lösung: `loadedTablesRef` nur löschen, wenn Filter aus State gelöscht werden

6. **`docs/technical/PERFORMANCE_LOESUNGSPLAN_VOLLSTAENDIG_2025-01-26.md`** ✅ HAUPTPROBLEM GELÖST
   - Root Cause: Connection Pool Exhaustion
   - Lösung: executeWithRetry aus READ-Operationen entfernen, Caching implementieren

7. **`docs/technical/MEMORY_LEAKS_VOLLSTAENDIGER_BEHEBUNGSPLAN_2025-01-26.md`** 🔴 KRITISCH
   - Problem: RAM > 1 GB, langsame Ladezeiten
   - Ursachen:
     - OrganizationSettings.tsx: Settings bleiben im State (19.8 MB)
     - Worktracker.tsx: Große Arrays werden nie gelöscht
     - Requests.tsx: Requests Array wird nie gelöscht
   - Lösung: Cleanup-Funktionen, Settings nur bei Bedarf laden

8. **`docs/technical/PERFORMANCE_ANALYSE_ERGEBNISSE_2025-01-29.md`** ✅ ANALYSE
   - FilterTags dauern 2-3 Sekunden (DB-Query ist schnell: 0.379ms)
   - Problem liegt NICHT bei der Datenbank (Network-Latenz, doppelte Requests, JSON-Parsing)

9. **`docs/technical/INFINITE_SCROLL_UND_FILTER_FIX_PLAN_2025-01-29.md`** 🔴 KRITISCH
   - Problem: Doppelte Filterung (server-seitig + client-seitig)
   - Problem: Infinite Scroll prüft falsche Länge (`requests.length` statt `filteredAndSortedRequests.length`)
   - Lösung: Filter nur server-seitig, Infinite Scroll korrigieren

10. **`docs/technical/PERFORMANCE_ENDSCHLEIFE_ANALYSE_ERGEBNISSE_2025-01-29.md`** 🔍 ANALYSE
    - Exzessives Logging in `apiClient.ts` (31 console.log Statements)
    - ClaudeConsole fängt ALLE Logs ab (doppelte Speicherung)
    - Dashboard lädt mehrere Komponenten (keine Lazy-Loading)

11. **`docs/technical/PERFORMANCE_FILTERTAGS_ANALYSE_DETAILLIERT_2025-01-29.md`** 🔍 ANALYSE
    - DB-Query ist sehr schnell (0.379ms)
    - Problem liegt woanders (Network-Latenz, doppelte Requests, JSON-Parsing)

12. **`docs/technical/PERFORMANCE_ANALYSE_WEITERE_PROBLEME_2025-01-29.md`** 🔍 ANALYSE
    - FilterTags dauern immer noch 2-3 Sekunden
    - Branch Settings könnten ähnliche Probleme haben

13. **`docs/technical/PERFORMANCE_ORGANIZATION_QUERY_FIX_2025-01-29.md`** ✅ GELÖST
    - Problem: Organization Settings Query läuft 5.5 Sekunden
    - Lösung: Settings nur bei Bedarf laden, Verschlüsselungs-Check

14. **`docs/technical/PERFORMANCE_LOBBYPMS_SETTINGS_CLEANUP_2025-01-29.md`** ✅ GELÖST
    - Problem: Settings-Größe 63 MB (lobbyPms: 63 MB)
    - Lösung: Cleanup-Script, Validierung hinzufügen

15. **`docs/technical/PERFORMANCE_APIKEY_CLEANUP_PLAN_2025-01-29.md`** ✅ GELÖST
    - Problem: apiKey ist 63 MB groß (sollte ~100-500 bytes sein)
    - Lösung: apiKey bereinigen, Validierung hinzufügen

16. **`docs/technical/PERFORMANCE_FIX_SOFORTMASSNAHMEN_2025-01-29.md`** ✅ GELÖST
    - Sofortmaßnahmen: Query killen, Settings-Größe prüfen, Query-Plan analysieren

17. **`docs/technical/INITIAL_LOAD_OPTIMIERUNGSPLAN_AKTUALISIERT_2025-01-29.md`** ⚠️ KONFLIKT
    - Priorisierung (erste 5 Requests) wurde entfernt durch Infinite Scroll Fix
    - Lösung: Priorisierung mit neuem Ansatz implementieren (kompatibel mit Filter-Fix)

18. **`docs/technical/SERVER_SEITIGE_PAGINATION_VOLLSTAENDIGER_PLAN_2025-01-29.md`** 📋 PLAN
    - Problem: Pagination wurde entfernt, lädt immer ALLE Ergebnisse
    - Lösung: Server-seitige Pagination wieder einführen (limit/offset)

19. **`docs/technical/ROLLEN_ISOLATION_UND_FILTER_FIXES_PLAN_2025-01-29.md`** 📋 PLAN
    - Problem: To Do's laden nicht beim Öffnen, Filter funktionieren teilweise nicht
    - Lösung: useEffect Dependencies korrigieren, loadReservations aufrufen

20. **`docs/technical/MEMORY_CLEANUP_KONSISTENZ_ANALYSE_2025-01-26.md`** ✅ ANALYSE
    - Worktracker.tsx: KONSISTENT & BEST PRACTICE
    - ToursTab.tsx: NICHT KONSISTENT (allTours wird nie verwendet)
    - Requests.tsx: KONSISTENT (aber anders als Tasks)

21. **`docs/technical/MEMORY_LEAK_KRITISCH_1GB_ANALYSE_2025-01-26.md`** 🔴 KRITISCH
    - Problem: RAM > 1GB im Leerlauf
    - Ursachen:
      - Intelligentes Cleanup wurde überschrieben (5-Minuten-Timeout)
      - 35 console.log Statements (nicht gewrappt)
      - URL.createObjectURL() wird nie aufgeräumt
      - FileReader base64-Strings bleiben im Memory

22. **`docs/technical/PERFORMANCE_MEMORY_LEAK_ORGANISATION_PLAN.md`** 🔴 KRITISCH
    - Problem: RAM > 3 GB bei Organisation-Seite
    - Ursachen:
      - Settings werden mit `includeSettings: true` geladen (19.8 MB)
      - Doppeltes Laden: OrganizationContext + OrganizationSettings
      - Settings bleiben im State, auch wenn nicht verwendet

### Filter & Sortierung Dokumente:

1. **`docs/technical/FILTER_UND_SORTIERUNG_AKTUELLER_ZUSTAND_2025-01-29.md`**
   - Detaillierte Dokumentation des aktuellen Zustands
   - Zeigt 5 Prioritäten für Sortierung (Table-Header, Filter, Cards, Table, Fallback)
   - Dokumentiert bestehende Hauptsortierung (`sortConfig`, `tableSortConfig`, `reservationTableSortConfig`)

2. **`docs/technical/FILTER_SORTIERUNG_VOLLSTAENDIGE_ANALYSE_2025-01-22.md`**
   - Analyse der Sortierungs-Prioritäten
   - Dokumentiert: "Spaltentitel anklickbar (sortierbar) = generelle Sortierung"
   - Zeigt bestehende `handleSort` Funktion und `sortConfig` State

3. **`docs/technical/SORTIERUNG_PROBLEM_ANALYSE_UND_PLAN_2025-01-29.md`**
   - Analyse des Infinite Scroll Problems
   - Zeigt client-seitige Sortierung mit Prioritäten

4. **`docs/implementation_plans/worktracker_table_sorting.md`**
   - Plan für Tabellensortierung (nicht umgesetzt)

5. **`docs/analysis/FILTER_SORTIERUNG_ANALYSE.md`**
   - Analyse der Filter-Sortierung

6. **`docs/implementation_plans/FILTER_SORTIERUNG_PRO_FILTER.md`**
   - Plan für Filter-Sortierung (wurde implementiert, aber sollte entfernt werden)
   - Zeigt, dass Filter-Sortierung von Anfang an falsch war

7. **`docs/implementation_plans/FILTER_ANWENDUNG_FIX_PLAN_FINAL.md`**
   - Problem: Filter werden nicht angewendet, wenn ein gespeicherter Filter erweitert wird
   - Lösung: `onApplyWithData` Callback hinzufügen

8. **`docs/implementation_plans/INFINITE_SCROLL_FINALER_PLAN.md`**
   - Anforderungen: KEINE Pagination, Infinite Scroll nur für Anzeige
   - Problem: Pagination wurde entfernt, lädt immer ALLE Ergebnisse

9. **`docs/implementation_plans/INFINITE_SCROLL_VOLLSTAENDIGER_PLAN.md`**
   - Vollständiger Plan für Infinite Scroll
   - Problem: Pagination statt vollständiges Laden

10. **`docs/implementation_plans/STANDARDFILTER_SEED_MIGRATION_PLAN.md`**
    - Standardfilter werden jetzt im Seed erstellt, nicht mehr im Frontend

### Code-Dateien, die analysiert wurden:

1. **`frontend/src/components/Requests.tsx`**
   - Zeile 220: `sortConfig` State (bestehende Hauptsortierung)
   - Zeile 577: `handleSort` Funktion (bestehende Hauptsortierung)
   - Zeile 1293: Spaltentitel klickbar (`onClick={sortKey ? () => handleSort(sortKey) : undefined}`)
   - Zeile 784: Sortierung in `filteredAndSortedRequests`

2. **`frontend/src/pages/Worktracker.tsx`**
   - Zeile 396: `tableSortConfig` State (bestehende Hauptsortierung für To Do's)
   - Zeile 398: `reservationTableSortConfig` State (bestehende Hauptsortierung für Reservations)
   - Zeile 330: `activeTab` State (3 Tabs: todos, reservations, tourBookings)
   - Zeile 2410: Spaltentitel klickbar für To Do's
   - ⚠️ Tour Bookings: Keine Sortierung implementiert

3. **`frontend/src/hooks/useTableSettings.ts`**
   - Spaltenreihenfolge, versteckte Spalten, View-Mode-Persistierung

---

## 📚 REFERENZEN

**Relevante Dokumente:**
- `docs/technical/FILTER_SORTIERUNG_VOLLSTAENDIGE_ANALYSE_2025-01-22.md` - Warum Filter-Sortierung hinzugefügt wurde
- `docs/implementation_plans/FILTER_SORTIERUNG_PRO_FILTER.md` - Implementierungsplan Filter-Sortierung
- `docs/technical/FILTER_UND_SORTIERUNG_AKTUELLER_ZUSTAND_2025-01-29.md` - Aktueller Zustand
- `docs/technical/SORTIERUNG_PROBLEM_ANALYSE_UND_PLAN_2025-01-29.md` - Server-seitige Sortierung Plan
- `docs/implementation_plans/FILTER_STANDARDFILTER_ROLES_USERS_PLAN.md` - Rollen/User-Filter Plan
- `docs/implementation_plans/STANDARDFILTER_SEED_MIGRATION_PLAN.md` - Seed-Migration Plan
- `docs/technical/ROLLEN_ISOLATION_UND_FILTER_FIXES_PLAN_2025-01-29.md` - Rollen-Isolation Plan

**Code-Referenzen:**
- `backend/prisma/seed.ts` - Standardfilter-Erstellung
- `backend/src/utils/filterToPrisma.ts` - `isAdminOrOwner` Funktion
- `frontend/src/components/Requests.tsx` - Aktuelle Implementierung
- `frontend/src/pages/Worktracker.tsx` - Aktuelle Implementierung

