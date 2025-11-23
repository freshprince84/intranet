# Filter & Sortierung - Vollständige Analyse (2025-01-22)

## Übersicht

Vollständige Analyse des aktuellen Stands der Filter- und Sortierfunktionalität gemäß den Anforderungen.

**Status:** NUR PRÜFUNG - KEINE ÄNDERUNGEN

---

## Anforderungen (Ziel)

### Grundfunktionalität pro Tab

1. ✅ **Tabelle oder Cards anzeigen** - Implementiert
2. ✅ **Spalten/Card-Infos ein-/ausblenden (zusammenhängend)** - Implementiert
3. ✅ **Grundsätzlich sortieren nach einer Spalte (auf/absteigend)** - Teilweise implementiert
4. ✅ **Filter setzen & speichern (als Filter-Tags)** - Implementiert
5. ✅ **Standardfilter (als Filter-Tags)** - Implementiert
6. ✅ **Pro Filter: Sortierung pro Spalte mit Prioritäten** - Implementiert

### Sortierlogik (Anforderung)

**Wenn Standardfilter aktiv:**
- Filter-Sortierung gilt
- Kann durch generelle Sortierung **temporär** überschrieben werden
- Beim erneuten Anklicken des Filters: Filter-Sortierung übernimmt wieder

**Generelle Sortierung:**
- Nur wenn **kein Filter gesetzt** ist

**Tabellenansicht:**
- Spaltentitel anklickbar (sortierbar) = generelle Sortierung
- Überschreibt **temporär** Filter-Sortierung
- Spalten untereinander verschiebbar (Anordnung)
- Anordnung darf **NICHT** mit genereller Sortierung der Cards zusammenhängen

---

## Analyse: Requests

**Datei:** `frontend/src/components/Requests.tsx`

### ✅ Korrekt implementiert

1. **Tabelle oder Cards anzeigen** ✅
   - `viewMode` State vorhanden
   - `useTableSettings` verwendet

2. **Spalten/Card-Infos ein-/ausblenden** ✅
   - `hiddenColumns` State vorhanden
   - `visibleCardMetadata` abgeleitet aus `hiddenColumns`

3. **Filter setzen & speichern** ✅
   - `FilterPane` verwendet
   - `SavedFilterTags` verwendet
   - `tableId: 'requests-table'`

4. **Standardfilter** ✅
   - Standardfilter werden als Filter-Tags angezeigt

5. **Pro Filter: Sortierung pro Spalte mit Prioritäten** ✅
   - `filterSortDirections` State vorhanden
   - `FilterPane` unterstützt Sortierrichtungen mit Prioritäten

### ❌ Probleme

1. **Filter-Sortierung wird NICHT temporär überschrieben**

   **Aktueller Code (Zeile 863-888):**
   ```typescript
   // 1. Priorität: Filter-Sortierrichtungen (wenn Filter aktiv)
   if (filterSortDirections.length > 0 && filterConditions.length > 0) {
       // Sortiere nach Priorität (1, 2, 3, ...)
       // ...
       return 0;  // ❌ Keine Möglichkeit für Table-Header-Sortierung!
   }
   
   // 2. Priorität: Cards-Mode Multi-Sortierung (wenn kein Filter aktiv)
   if (viewMode === 'cards') {
       // ...
   }
   
   // 3. Priorität: Tabellen-Mode Einzel-Sortierung (wenn kein Filter aktiv)
   // ❌ Wird nur verwendet, wenn KEIN Filter aktiv ist!
   ```

   **Problem:** 
   - Wenn Filter aktiv ist, wird Filter-Sortierung verwendet
   - Table-Header-Sortierung wird **komplett ignoriert**, wenn Filter aktiv ist
   - **FEHLT:** Temporäre Überschreibung der Filter-Sortierung durch Table-Header-Sortierung

2. **Beim erneuten Anklicken des Filters wird Filter-Sortierung NICHT wiederhergestellt**

   **Aktueller Code (Zeile 704-715):**
   ```typescript
   const handleFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<...>) => {
       setActiveFilterName(name);
       setSelectedFilterId(id);
       applyFilterConditions(conditions, operators, sortDirections);
       // ❌ FEHLT: Table-Header-Sortierung zurücksetzen!
   };
   ```

   **Problem:**
   - Wenn Filter erneut angeklickt wird, wird `sortDirections` gesetzt
   - **ABER:** `sortConfig` (Table-Header-Sortierung) wird **NICHT** zurückgesetzt
   - Filter-Sortierung wird zwar angewendet, aber Table-Header-Sortierung bleibt aktiv

3. **Generelle Sortierung wird auch verwendet, wenn Filter aktiv ist**

   **Aktueller Code (Zeile 890-915):**
   ```typescript
   // 2. Priorität: Cards-Mode Multi-Sortierung (wenn kein Filter aktiv)
   if (viewMode === 'cards') {
       // ❌ Wird verwendet, auch wenn Filter aktiv ist (aber nur wenn Filter-Sortierung leer)
   }
   ```

   **Problem:**
   - Cards-Mode Sortierung wird verwendet, wenn Filter-Sortierung leer ist
   - **ABER:** Anforderung sagt: "Generelle Sortierung: Nur wenn kein Filter gesetzt ist"
   - Wenn Filter aktiv ist, sollte **NUR** Filter-Sortierung verwendet werden (oder Table-Header-Sortierung als temporäre Überschreibung)

### Sortierlogik (Aktuell)

**Priorität 1:** Filter-Sortierrichtungen (wenn Filter aktiv)
**Priorität 2:** Cards-Mode Multi-Sortierung (wenn kein Filter aktiv)
**Priorität 3:** Tabellen-Mode Einzel-Sortierung (wenn kein Filter aktiv)

**Sollte sein:**
**Priorität 1:** Table-Header-Sortierung (temporäre Überschreibung, wenn Filter aktiv)
**Priorität 2:** Filter-Sortierrichtungen (wenn Filter aktiv)
**Priorität 3:** Cards-Mode Multi-Sortierung (wenn kein Filter aktiv)
**Priorität 4:** Tabellen-Mode Einzel-Sortierung (wenn kein Filter aktiv)

---

## Analyse: Tasks (To Do's)

**Datei:** `frontend/src/pages/Worktracker.tsx` (Tasks-Tab)

### ✅ Korrekt implementiert

1. **Tabelle oder Cards anzeigen** ✅
2. **Spalten/Card-Infos ein-/ausblenden** ✅
3. **Filter setzen & speichern** ✅
4. **Standardfilter** ✅
5. **Pro Filter: Sortierung pro Spalte mit Prioritäten** ✅

### ❌ Probleme

1. **Filter-Sortierung wird NICHT temporär überschrieben**

   **Aktueller Code (Zeile 1159-1185):**
   ```typescript
   // 1. Priorität: Filter-Sortierrichtungen (wenn Filter aktiv)
   if (filterSortDirections.length > 0 && filterConditions.length > 0) {
       // ...
       return 0;  // ❌ Keine Möglichkeit für Table-Header-Sortierung!
   }
   
   // 2. Priorität: Tabellen-Header-Sortierung (nur für Tabellen-Ansicht, wenn kein Filter aktiv)
   if (viewMode === 'table' && tableSortConfig.key) {
       // ❌ Wird nur verwendet, wenn KEIN Filter aktiv ist!
   }
   ```

   **Problem:** 
   - Wenn Filter aktiv ist, wird Filter-Sortierung verwendet
   - Table-Header-Sortierung wird **komplett ignoriert**, wenn Filter aktiv ist
   - **FEHLT:** Temporäre Überschreibung der Filter-Sortierung durch Table-Header-Sortierung

2. **Beim erneuten Anklicken des Filters wird Filter-Sortierung NICHT wiederhergestellt**

   **Aktueller Code (Zeile 916-933):**
   ```typescript
   const handleFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<...>) => {
       if (activeTab === 'todos') {
           setActiveFilterName(name);
           setSelectedFilterId(id);
           applyFilterConditions(conditions, operators, sortDirections);
           // ❌ FEHLT: tableSortConfig zurücksetzen!
       }
   };
   ```

   **Problem:**
   - Wenn Filter erneut angeklickt wird, wird `sortDirections` gesetzt
   - **ABER:** `tableSortConfig` wird **NICHT** zurückgesetzt
   - Filter-Sortierung wird zwar angewendet, aber Table-Header-Sortierung bleibt aktiv

3. **Cards-Mode Sortierung fehlt komplett**

   **Aktueller Code (Zeile 1159-1245):**
   ```typescript
   // 1. Priorität: Filter-Sortierrichtungen (wenn Filter aktiv)
   // 2. Priorität: Tabellen-Header-Sortierung (nur für Tabellen-Ansicht, wenn kein Filter aktiv)
   // 3. Fallback: Standardsortierung
   // ❌ FEHLT: Cards-Mode Multi-Sortierung!
   ```

   **Problem:**
   - Cards-Mode hat keine Multi-Sortierung
   - **ABER:** Requests hat Cards-Mode Multi-Sortierung (Zeile 890-915)
   - Inkonsistenz zwischen Requests und Tasks

### Sortierlogik (Aktuell)

**Priorität 1:** Filter-Sortierrichtungen (wenn Filter aktiv)
**Priorität 2:** Tabellen-Header-Sortierung (nur für Tabellen-Ansicht, wenn kein Filter aktiv)
**Priorität 3:** Fallback: Standardsortierung

**Sollte sein:**
**Priorität 1:** Table-Header-Sortierung (temporäre Überschreibung, wenn Filter aktiv)
**Priorität 2:** Filter-Sortierrichtungen (wenn Filter aktiv)
**Priorität 3:** Cards-Mode Multi-Sortierung (wenn kein Filter aktiv, Cards-Mode)
**Priorität 4:** Tabellen-Mode Einzel-Sortierung (wenn kein Filter aktiv, Table-Mode)
**Priorität 5:** Fallback: Standardsortierung

---

## Analyse: Reservations

**Datei:** `frontend/src/pages/Worktracker.tsx` (Reservations-Tab)

### ✅ Korrekt implementiert

1. **Tabelle oder Cards anzeigen** ✅
2. **Spalten/Card-Infos ein-/ausblenden** ✅
3. **Filter setzen & speichern** ✅
4. **Standardfilter** ✅

### ❌ KRITISCH: Probleme

1. **Filter-Sortierung wird NICHT verwendet!**

   **Aktueller Code (Zeile 1413-1566):**
   ```typescript
   // Sortierung basierend auf viewMode
   let sorted: typeof filtered;
   if (viewMode === 'cards') {
       // Multi-Sortierung für Cards-Mode basierend auf cardMetadataOrder und cardSortDirections
       sorted.sort((a, b) => {
           for (const columnId of sortableColumns) {
               const direction = reservationCardSortDirections[columnId] || 'asc';  // ❌ FALSCH!
               // ...
           }
       });
   } else {
       // Tabellen-Mode: Sortierung basierend auf reservationTableSortConfig
       sorted.sort((a, b) => {
           if (reservationTableSortConfig.key) {  // ❌ FALSCH!
               // ...
           }
       });
   }
   ```

   **Problem:** 
   - `reservationFilterSortDirections` wird **NIRGENDWO** verwendet!
   - Filter-Sortierung wird **komplett ignoriert**
   - Nur `reservationCardSortDirections` (Cards) oder `reservationTableSortConfig` (Table) werden verwendet

2. **Beim erneuten Anklicken des Filters wird Filter-Sortierung NICHT wiederhergestellt**

   **Aktueller Code (Zeile 928-932):**
   ```typescript
   } else {
       setReservationActiveFilterName(name);
       setReservationSelectedFilterId(id);
       applyReservationFilterConditions(conditions, operators, sortDirections);
       // ❌ FEHLT: reservationTableSortConfig zurücksetzen!
   }
   ```

3. **useMemo Dependency-Array enthält `reservationFilterSortDirections` NICHT**

   **Aktueller Code (Zeile 1570):**
   ```typescript
   }, [reservations, reservationFilterStatus, reservationFilterPaymentStatus, reservationSearchTerm, reservationFilterConditions, reservationFilterLogicalOperators, viewMode, cardMetadataOrder, visibleCardMetadata, reservationCardSortDirections, reservationTableSortConfig]);
   // ❌ FEHLT: reservationFilterSortDirections!
   ```

### Sortierlogik (Aktuell)

**Priorität 1:** Cards-Mode Multi-Sortierung (`reservationCardSortDirections`)
**Priorität 2:** Tabellen-Mode Einzel-Sortierung (`reservationTableSortConfig`)

**Sollte sein:**
**Priorität 1:** Table-Header-Sortierung (temporäre Überschreibung, wenn Filter aktiv)
**Priorität 2:** Filter-Sortierrichtungen (wenn Filter aktiv) - **FEHLT KOMPLETT!**
**Priorität 3:** Cards-Mode Multi-Sortierung (wenn kein Filter aktiv, Cards-Mode)
**Priorität 4:** Tabellen-Mode Einzel-Sortierung (wenn kein Filter aktiv, Table-Mode)

---

## Analyse: ActiveUsersList (Workcenter)

**Datei:** `frontend/src/components/teamWorktime/ActiveUsersList.tsx`

### ✅ Korrekt implementiert

1. **Tabelle oder Cards anzeigen** ✅
2. **Spalten/Card-Infos ein-/ausblenden** ✅
3. **Filter setzen & speichern** ✅
4. **Standardfilter** ✅

### ❌ Probleme

1. **Filter-Sortierung wird NICHT verwendet!**

   **Aktueller Code (Zeile 530-617):**
   ```typescript
   if (viewMode === 'cards') {
       filtered.sort((a: any, b: any) => {
           for (const columnId of sortableColumns) {
               const direction = cardSortDirections[columnId] || 'asc';  // ❌ FALSCH!
               // ...
           }
       });
   } else {
       // Tabellen-Mode: Einzel-Sortierung wie bisher
       if (sortConfig.key) {
           filtered.sort((a: any, b: any) => {
               // ❌ FALSCH!
           });
       }
   }
   ```

   **Problem:** 
   - Filter-Sortierrichtungen werden **NICHT** verwendet
   - Nur `cardSortDirections` (Cards) oder `sortConfig` (Table) werden verwendet
   - **FEHLT:** `filterSortDirections` State und Logik

2. **FilterPane unterstützt keine Sortierrichtungen**

   **Aktueller Code (Zeile 1048-1060):**
   ```typescript
   <FilterPane
       columns={[...]}
       onApply={applyFilterConditions}
       onReset={resetFilterConditions}
       savedConditions={filterConditions}
       savedOperators={filterLogicalOperators}
       tableId={WORKCENTER_TABLE_ID}
       // ❌ FEHLT: savedSortDirections, onSortDirectionsChange!
   />
   ```

   **Problem:**
   - `FilterPane` bekommt keine `savedSortDirections` oder `onSortDirectionsChange` Props
   - Filter-Sortierrichtungen können nicht gesetzt werden

### Sortierlogik (Aktuell)

**Priorität 1:** Cards-Mode Multi-Sortierung (`cardSortDirections`)
**Priorität 2:** Tabellen-Mode Einzel-Sortierung (`sortConfig`)

**Sollte sein:**
**Priorität 1:** Table-Header-Sortierung (temporäre Überschreibung, wenn Filter aktiv)
**Priorität 2:** Filter-Sortierrichtungen (wenn Filter aktiv) - **FEHLT KOMPLETT!**
**Priorität 3:** Cards-Mode Multi-Sortierung (wenn kein Filter aktiv, Cards-Mode)
**Priorität 4:** Tabellen-Mode Einzel-Sortierung (wenn kein Filter aktiv, Table-Mode)

---

## Analyse: RoleManagementTab

**Datei:** `frontend/src/components/RoleManagementTab.tsx`

### ✅ Korrekt implementiert

1. **Filter setzen & speichern** ✅
2. **Standardfilter** ✅

### ❌ Probleme

1. **Keine Tabelle/Cards Ansicht** ❌
   - Nur eine einfache Liste
   - Keine `viewMode` State

2. **Keine Sortierung** ❌
   - Keine Sortierlogik implementiert
   - Keine Table-Header-Sortierung
   - Keine Filter-Sortierrichtungen

3. **FilterPane unterstützt keine Sortierrichtungen** ❌
   - `FilterPane` bekommt keine `savedSortDirections` oder `onSortDirectionsChange` Props

### Sortierlogik (Aktuell)

**Keine Sortierung implementiert**

**Sollte sein:**
**Priorität 1:** Table-Header-Sortierung (temporäre Überschreibung, wenn Filter aktiv)
**Priorität 2:** Filter-Sortierrichtungen (wenn Filter aktiv)
**Priorität 3:** Standard-Sortierung (wenn kein Filter aktiv)

---

## Analyse: BranchManagementTab

**Datei:** `frontend/src/components/BranchManagementTab.tsx`

### ✅ Korrekt implementiert

1. **Filter setzen & speichern** ✅
2. **Standardfilter** ✅

### ❌ Probleme

1. **Keine Tabelle/Cards Ansicht** ❌
   - Nur eine einfache Liste
   - Keine `viewMode` State

2. **Nur Standard-Sortierung** ❌
   - Nur alphabetische Sortierung nach Name (Zeile 452-454)
   - Keine Table-Header-Sortierung
   - Keine Filter-Sortierrichtungen

3. **FilterPane unterstützt keine Sortierrichtungen** ❌
   - `FilterPane` bekommt keine `savedSortDirections` oder `onSortDirectionsChange` Props

### Sortierlogik (Aktuell)

**Nur Standard-Sortierung:** Alphabetisch nach Name

**Sollte sein:**
**Priorität 1:** Table-Header-Sortierung (temporäre Überschreibung, wenn Filter aktiv)
**Priorität 2:** Filter-Sortierrichtungen (wenn Filter aktiv)
**Priorität 3:** Standard-Sortierung (wenn kein Filter aktiv)

---

## Analyse: UserManagementTab

**Datei:** `frontend/src/components/UserManagementTab.tsx`

### ✅ Korrekt implementiert

1. **Standard-Sortierung** ✅
   - Alphabetisch nach username, dann firstName (Zeile 159-171)

### ❌ Probleme

1. **Keine Filter** ❌
   - Keine `FilterPane` Komponente
   - Keine `SavedFilterTags` Komponente
   - Keine Filter-Funktionalität

2. **Keine Tabelle/Cards Ansicht** ❌
   - Nur eine einfache Liste
   - Keine `viewMode` State

3. **Keine Table-Header-Sortierung** ❌
   - Keine sortierbaren Spalten-Header

### Sortierlogik (Aktuell)

**Nur Standard-Sortierung:** Alphabetisch nach username, dann firstName

**Sollte sein:**
**Priorität 1:** Table-Header-Sortierung (temporäre Überschreibung, wenn Filter aktiv)
**Priorität 2:** Filter-Sortierrichtungen (wenn Filter aktiv)
**Priorität 3:** Standard-Sortierung (wenn kein Filter aktiv)

---

## Zusammenfassung: Aktueller Stand vs. Anforderungen

### ✅ Korrekt implementiert (alle Komponenten)

1. ✅ Tabelle oder Cards anzeigen (Requests, Tasks, Reservations, ActiveUsersList)
2. ✅ Spalten/Card-Infos ein-/ausblenden (zusammenhängend)
3. ✅ Filter setzen & speichern (als Filter-Tags)
4. ✅ Standardfilter (als Filter-Tags)
5. ✅ Pro Filter: Sortierung pro Spalte mit Prioritäten (Requests, Tasks)

### ❌ Fehlt oder falsch implementiert

#### 1. Filter-Sortierung wird NICHT temporär überschrieben

**Betroffen:** Requests, Tasks

**Problem:**
- Wenn Filter aktiv ist, wird Filter-Sortierung verwendet
- Table-Header-Sortierung wird **komplett ignoriert**, wenn Filter aktiv ist
- **FEHLT:** Temporäre Überschreibung der Filter-Sortierung durch Table-Header-Sortierung

**Sollte sein:**
- Table-Header-Sortierung hat **Priorität 1** (auch wenn Filter aktiv)
- Filter-Sortierung hat **Priorität 2** (wenn Filter aktiv)
- Beim erneuten Anklicken des Filters: Filter-Sortierung übernimmt wieder (Table-Header-Sortierung zurücksetzen)

#### 2. Filter-Sortierung wird NICHT verwendet (Reservations, ActiveUsersList)

**Betroffen:** Reservations, ActiveUsersList

**Problem:**
- `reservationFilterSortDirections` wird **NIRGENDWO** verwendet
- Filter-Sortierung wird **komplett ignoriert**
- Nur Cards/Table Sortierung wird verwendet

**Sollte sein:**
- Filter-Sortierrichtungen implementieren (analog zu Requests/Tasks)
- Filter-Sortierung hat **Priorität 2** (wenn Filter aktiv)
- Table-Header-Sortierung hat **Priorität 1** (temporäre Überschreibung)

#### 3. Beim erneuten Anklicken des Filters wird Filter-Sortierung NICHT wiederhergestellt

**Betroffen:** Requests, Tasks, Reservations

**Problem:**
- Wenn Filter erneut angeklickt wird, wird `sortDirections` gesetzt
- **ABER:** Table-Header-Sortierung (`sortConfig`/`tableSortConfig`/`reservationTableSortConfig`) wird **NICHT** zurückgesetzt
- Filter-Sortierung wird zwar angewendet, aber Table-Header-Sortierung bleibt aktiv

**Sollte sein:**
- Beim erneuten Anklicken des Filters: Table-Header-Sortierung zurücksetzen
- Filter-Sortierung übernimmt wieder

#### 4. Generelle Sortierung wird auch verwendet, wenn Filter aktiv ist

**Betroffen:** Requests

**Problem:**
- Cards-Mode Sortierung wird verwendet, wenn Filter-Sortierung leer ist
- **ABER:** Anforderung sagt: "Generelle Sortierung: Nur wenn kein Filter gesetzt ist"
- Wenn Filter aktiv ist, sollte **NUR** Filter-Sortierung verwendet werden (oder Table-Header-Sortierung als temporäre Überschreibung)

**Sollte sein:**
- Generelle Sortierung (Cards/Table) nur wenn **kein Filter gesetzt** ist
- Wenn Filter aktiv: Nur Filter-Sortierung oder Table-Header-Sortierung (temporär)

#### 5. Cards-Mode Sortierung fehlt (Tasks)

**Betroffen:** Tasks

**Problem:**
- Cards-Mode hat keine Multi-Sortierung
- **ABER:** Requests hat Cards-Mode Multi-Sortierung
- Inkonsistenz zwischen Requests und Tasks

**Sollte sein:**
- Cards-Mode Multi-Sortierung implementieren (analog zu Requests)

#### 6. Filter-Sortierrichtungen fehlen komplett (ActiveUsersList, RoleManagementTab, BranchManagementTab)

**Betroffen:** ActiveUsersList, RoleManagementTab, BranchManagementTab

**Problem:**
- `FilterPane` unterstützt keine Sortierrichtungen
- Keine `filterSortDirections` State
- Keine Filter-Sortierlogik

**Sollte sein:**
- Filter-Sortierrichtungen implementieren (analog zu Requests/Tasks)

#### 7. Keine Filter/Sortierung (UserManagementTab)

**Betroffen:** UserManagementTab

**Problem:**
- Keine Filter-Funktionalität
- Keine Table-Header-Sortierung
- Nur Standard-Sortierung

**Sollte sein:**
- Filter-Funktionalität implementieren
- Table-Header-Sortierung implementieren

---

## Empfohlene Sortierlogik (Prioritäten)

### Wenn Filter aktiv:

1. **Priorität 1:** Table-Header-Sortierung (temporäre Überschreibung)
   - Nur in Table-Mode
   - Überschreibt Filter-Sortierung temporär
   - Beim erneuten Anklicken des Filters: Zurücksetzen

2. **Priorität 2:** Filter-Sortierrichtungen
   - Sortiere nach Priorität (1, 2, 3, ...)
   - Berücksichtige `direction` (asc/desc)

3. **Priorität 3:** Fallback (wenn keine Filter-Sortierung)
   - Standard-Sortierung

### Wenn KEIN Filter aktiv:

1. **Priorität 1:** Cards-Mode Multi-Sortierung (wenn Cards-Mode)
   - Sortiere nach `cardMetadataOrder`
   - Berücksichtige `cardSortDirections`

2. **Priorität 2:** Table-Header-Sortierung (wenn Table-Mode)
   - Sortiere nach `sortConfig`/`tableSortConfig`/`reservationTableSortConfig`

3. **Priorität 3:** Fallback
   - Standard-Sortierung

---

## Checkliste: Was muss korrigiert werden?

### Requests
- [ ] Table-Header-Sortierung hat Priorität 1 (auch wenn Filter aktiv)
- [ ] Beim erneuten Anklicken des Filters: Table-Header-Sortierung zurücksetzen
- [ ] Generelle Sortierung nur wenn kein Filter gesetzt ist

### Tasks
- [ ] Table-Header-Sortierung hat Priorität 1 (auch wenn Filter aktiv)
- [ ] Beim erneuten Anklicken des Filters: Table-Header-Sortierung zurücksetzen
- [ ] Cards-Mode Multi-Sortierung implementieren

### Reservations
- [ ] Filter-Sortierrichtungen implementieren (analog zu Tasks)
- [ ] Table-Header-Sortierung hat Priorität 1 (auch wenn Filter aktiv)
- [ ] Beim erneuten Anklicken des Filters: Table-Header-Sortierung zurücksetzen
- [ ] `reservationFilterSortDirections` in useMemo Dependency-Array hinzufügen

### ActiveUsersList
- [ ] Filter-Sortierrichtungen implementieren
- [ ] `FilterPane` erweitern um `savedSortDirections` und `onSortDirectionsChange`
- [ ] Table-Header-Sortierung hat Priorität 1 (auch wenn Filter aktiv)
- [ ] Beim erneuten Anklicken des Filters: Table-Header-Sortierung zurücksetzen

### RoleManagementTab
- [ ] Filter-Sortierrichtungen implementieren
- [ ] `FilterPane` erweitern um `savedSortDirections` und `onSortDirectionsChange`
- [ ] Table-Header-Sortierung implementieren

### BranchManagementTab
- [ ] Filter-Sortierrichtungen implementieren
- [ ] `FilterPane` erweitern um `savedSortDirections` und `onSortDirectionsChange`
- [ ] Table-Header-Sortierung implementieren

### UserManagementTab
- [ ] Filter-Funktionalität implementieren
- [ ] Table-Header-Sortierung implementieren

---

**Datum:** 2025-01-22  
**Status:** Analyse abgeschlossen - NUR PRÜFUNG, KEINE ÄNDERUNGEN


