# Reservation Filter - Probleme Analyse (2025-01-22)

## Übersicht

Analyse von zwei Problemen bei Reservation-Filtern:
1. Sortierung funktioniert nicht mehr richtig (wird immer absteigend sortiert)
2. Filter-Tags werden vom falschen Tab angezeigt nach dem Speichern

**Status:** NUR PRÜFUNG - KEINE ÄNDERUNGEN

---

## Problem 1: Sortierung funktioniert nicht mehr richtig

### Beschreibung
- Beim ersten Mal funktioniert die Sortierung noch
- Danach wird z.B. `checkInDate` immer absteigend sortiert, egal wie man es einstellt
- Die Filter-Sortierrichtungen werden ignoriert

### Analyse

**Betroffene Datei:** `frontend/src/pages/Worktracker.tsx`

**Problem gefunden:**

1. **`reservationFilterSortDirections` wird NICHT in der Sortierlogik verwendet!**

   **Aktueller Code (Zeile 1413-1566):**
   ```typescript
   // Sortierung basierend auf viewMode
   let sorted: typeof filtered;
   if (viewMode === 'cards') {
       // Multi-Sortierung für Cards-Mode basierend auf cardMetadataOrder und cardSortDirections
       sorted = [...filtered];
       const sortableColumns = cardMetadataOrder.filter(colId => visibleCardMetadata.has(colId));
       
       sorted.sort((a, b) => {
           for (const columnId of sortableColumns) {
               const direction = reservationCardSortDirections[columnId] || 'asc';  // ❌ FALSCH!
               // ...
           }
       });
   } else {
       // Tabellen-Mode: Sortierung basierend auf reservationTableSortConfig
       sorted = [...filtered].sort((a, b) => {
           if (reservationTableSortConfig.key) {  // ❌ FALSCH!
               // ...
           }
       });
   }
   ```

   **Problem:** 
   - Bei Cards-Mode wird `reservationCardSortDirections` verwendet (Zeile 1422)
   - Bei Table-Mode wird `reservationTableSortConfig` verwendet (Zeile 1497)
   - **ABER:** `reservationFilterSortDirections` wird NIRGENDWO verwendet!

2. **Vergleich mit Tasks (funktioniert korrekt):**

   **Tasks Sortierlogik (Zeile 1159-1185):**
   ```typescript
   const sorted = filtered.sort((a, b) => {
       // 1. Priorität: Filter-Sortierrichtungen (wenn Filter aktiv)
       if (filterSortDirections.length > 0 && filterConditions.length > 0) {  // ✅ KORREKT!
           // Sortiere nach Priorität (1, 2, 3, ...)
           const sortedByPriority = [...filterSortDirections].sort((sd1, sd2) => sd1.priority - sd2.priority);
           
           for (const sortDir of sortedByPriority) {
               const valueA = getSortValue(a, sortDir.column);
               const valueB = getSortValue(b, sortDir.column);
               // ...
               if (sortDir.direction === 'desc') {
                   comparison = -comparison;
               }
               // ...
           }
           return 0;
       }
       // 2. Priorität: Tabellen-Header-Sortierung
       // ...
   });
   ```

   **Reservations Sortierlogik (Zeile 1413-1566):**
   ```typescript
   // ❌ FEHLT KOMPLETT: Prüfung auf reservationFilterSortDirections!
   // Direkt zu Cards/Table-Mode Sortierung, ohne Filter-Sortierrichtungen zu berücksichtigen
   ```

3. **useMemo Dependency-Array enthält `reservationFilterSortDirections` NICHT:**

   **Aktueller Code (Zeile 1570):**
   ```typescript
   }, [reservations, reservationFilterStatus, reservationFilterPaymentStatus, reservationSearchTerm, reservationFilterConditions, reservationFilterLogicalOperators, viewMode, cardMetadataOrder, visibleCardMetadata, reservationCardSortDirections, reservationTableSortConfig]);
   ```

   **Problem:** `reservationFilterSortDirections` fehlt im Dependency-Array!

4. **State wird gesetzt, aber nie verwendet:**

   **State-Definition (Zeile 302):**
   ```typescript
   const [reservationFilterSortDirections, setReservationFilterSortDirections] = useState<Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>>([]);
   ```

   **State wird gesetzt (Zeile 1992, 3275):**
   ```typescript
   savedSortDirections={reservationFilterSortDirections}
   onSortDirectionsChange={setReservationFilterSortDirections}
   ```

   **ABER:** State wird NIRGENDWO in der Sortierlogik verwendet!

### Root Cause

**Die Filter-Sortierrichtungen werden bei Reservations komplett ignoriert!**

- `reservationFilterSortDirections` wird gesetzt, aber nie verwendet
- Die Sortierlogik verwendet nur `reservationCardSortDirections` (Cards) oder `reservationTableSortConfig` (Table)
- Die Filter-Sortierrichtungen haben KEINE Priorität in der Sortierlogik

### Vergleich: Tasks vs Reservations

| Aspekt | Tasks | Reservations | Status |
|--------|-------|--------------|--------|
| Filter-Sortierrichtungen State | ✅ `filterSortDirections` | ✅ `reservationFilterSortDirections` | ✅ |
| State wird gesetzt | ✅ Ja (Zeile 1982) | ✅ Ja (Zeile 1992, 3275) | ✅ |
| State wird in Sortierlogik verwendet | ✅ Ja (Zeile 1161) | ❌ **NEIN!** | ❌ |
| Priorität 1: Filter-Sortierrichtungen | ✅ Implementiert | ❌ **FEHLT!** | ❌ |
| Priorität 2: Table/Card Sortierung | ✅ Implementiert | ✅ Implementiert | ✅ |
| useMemo Dependency-Array | ✅ Enthält `filterSortDirections` | ❌ Enthält `reservationFilterSortDirections` NICHT | ❌ |

### Erwartetes Verhalten

Die Sortierlogik für Reservations sollte analog zu Tasks sein:

1. **Priorität 1:** Filter-Sortierrichtungen (wenn Filter aktiv)
   - Verwende `reservationFilterSortDirections`
   - Sortiere nach Priorität (1, 2, 3, ...)
   - Berücksichtige `direction` (asc/desc)

2. **Priorität 2:** Cards/Table Sortierung (wenn keine Filter-Sortierrichtungen)
   - Cards-Mode: `reservationCardSortDirections`
   - Table-Mode: `reservationTableSortConfig`

3. **Priorität 3:** Fallback (wenn keine Sortierung)
   - Check-in-Datum (neueste zuerst)

---

## Problem 2: Filter-Tags werden vom falschen Tab angezeigt

### Beschreibung
- Wenn ein Filter gespeichert wird, werden die Filter-Tags vom Tab "To Do" angezeigt statt von "Reservations"
- Erst nach Neuladen der Seite wird es richtig
- Das Problem tritt nur nach dem Speichern eines Filters auf

### Analyse

**Betroffene Dateien:**
- `frontend/src/pages/Worktracker.tsx` (Zeile 2003-2011, 3284-3292)
- `frontend/src/components/FilterPane.tsx` (Zeile 335-400)
- `frontend/src/components/SavedFilterTags.tsx` (Zeile 205-247)

**Problem gefunden:**

1. **`SavedFilterTags` lädt Filter nur beim Mount oder wenn sich `tableId` ändert:**

   **Aktueller Code (Zeile 205-247):**
   ```typescript
   useEffect(() => {
       const fetchData = async () => {
           // Lade Filter und Gruppen
           const [filtersResponse, groupsResponse] = await Promise.all([
               axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)),
               axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.GROUPS.BY_TABLE(tableId))
           ]);
           // ...
       };
       fetchData();
   }, [tableId]);  // ✅ Lädt neu wenn tableId sich ändert
   ```

   **Problem:** 
   - Filter werden nur geladen, wenn sich `tableId` ändert
   - **ABER:** Nach dem Speichern eines Filters ändert sich `tableId` NICHT!
   - Daher werden die Filter NICHT neu geladen

2. **`FilterPane` speichert Filter, ruft aber `refreshFilters` NICHT auf:**

   **Aktueller Code (Zeile 335-400):**
   ```typescript
   const handleSaveFilter = async () => {
       // ... Validierung ...
       
       try {
           await axiosInstance.post(API_ENDPOINTS.SAVED_FILTERS.BASE, {
               name: filterName,
               tableId: tableId,  // ✅ tableId wird korrekt verwendet
               conditions: validConditions,
               operators: logicalOperators,
               sortDirections: sortDirections
           });
           
           showMessage(t('filter.saveSuccess'), 'success');
           setShowSaveInput(false);
           setFilterName('');
           
           // ❌ FEHLT: refreshFilters() wird NICHT aufgerufen!
       } catch (error) {
           // ...
       }
   };
   ```

   **Problem:** 
   - Nach dem Speichern wird `refreshFilters` NICHT aufgerufen
   - `SavedFilterTags` weiß nicht, dass ein neuer Filter gespeichert wurde
   - Daher werden die alten Filter-Tags angezeigt

3. **`SavedFilterTags` hat `refreshFilters` Funktion, aber sie wird nicht verwendet:**

   **Aktueller Code (Zeile 119-134):**
   ```typescript
   const refreshFilters = useCallback(async () => {
       try {
           const [filtersResponse, groupsResponse] = await Promise.all([
               axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)),
               axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.GROUPS.BY_TABLE(tableId))
           ]);
           // ...
           setSavedFilters(filters);
           setFilterGroups(groups);
       } catch (error) {
           // ...
       }
   }, [tableId]);
   ```

   **Problem:** 
   - `refreshFilters` existiert, aber wird nicht von `FilterPane` aufgerufen
   - Es gibt eine globale Funktion `refreshSavedFilters` (Zeile 252), aber die wird auch nicht verwendet

4. **`tableId` wird dynamisch basierend auf `activeTab` gesetzt:**

   **Aktueller Code (Zeile 2004):**
   ```typescript
   <SavedFilterTags
       tableId={activeTab === 'todos' ? TODOS_TABLE_ID : RESERVATIONS_TABLE_ID}
       // ...
   />
   ```

   **Problem:** 
   - Wenn `activeTab` sich ändert, ändert sich `tableId`
   - `SavedFilterTags` lädt dann die Filter neu (Zeile 247)
   - **ABER:** Wenn ein Filter gespeichert wird, ändert sich `activeTab` NICHT
   - Daher wird `tableId` nicht als "geändert" erkannt
   - `useEffect` wird nicht ausgelöst

### Root Cause

**Nach dem Speichern eines Filters werden die Filter-Tags nicht neu geladen!**

- `FilterPane` speichert den Filter, ruft aber `refreshFilters` nicht auf
- `SavedFilterTags` lädt Filter nur, wenn sich `tableId` ändert
- Nach dem Speichern ändert sich `tableId` nicht, daher werden Filter nicht neu geladen
- Die alten Filter-Tags (vom vorherigen Tab) bleiben sichtbar

### Vergleich: Andere Komponenten

**ConsultationList.tsx:**
- Verwendet auch `SavedFilterTags`
- Hat das gleiche Problem (wenn Filter gespeichert werden, werden sie nicht neu geladen)

**RequestAnalyticsTab.tsx:**
- Verwendet auch `SavedFilterTags`
- Hat das gleiche Problem

**ActiveUsersList.tsx:**
- Verwendet auch `SavedFilterTags`
- Hat das gleiche Problem

**→ Das ist ein generisches Problem, nicht nur bei Reservations!**

### Erwartetes Verhalten

Nach dem Speichern eines Filters sollten:

1. **Filter-Tags sofort neu geladen werden:**
   - `FilterPane` sollte `refreshFilters` aufrufen (oder ein Event auslösen)
   - `SavedFilterTags` sollte die Filter neu laden

2. **Korrekte Filter-Tags angezeigt werden:**
   - Die Filter-Tags sollten dem aktuellen Tab entsprechen
   - Neue Filter sollten sofort sichtbar sein

### Mögliche Lösungen

**Option 1: Event-basiert**
- `FilterPane` löst ein Event aus, wenn ein Filter gespeichert wird
- `SavedFilterTags` hört auf dieses Event und lädt Filter neu

**Option 2: Callback-basiert**
- `FilterPane` bekommt einen `onFilterSaved` Callback
- `Worktracker` übergibt `refreshFilters` als Callback
- `FilterPane` ruft Callback nach dem Speichern auf

**Option 3: Globaler Refresh**
- `FilterPane` ruft `window.refreshSavedFilters()` auf (existiert bereits, Zeile 252)
- `SavedFilterTags` hört auf globale Funktion

**Option 4: Props-basiert**
- `SavedFilterTags` bekommt einen `refreshTrigger` Prop
- `Worktracker` setzt `refreshTrigger` nach dem Speichern
- `SavedFilterTags` lädt Filter neu, wenn sich `refreshTrigger` ändert

---

## Zusammenfassung

### Problem 1: Sortierung
- **Root Cause:** `reservationFilterSortDirections` wird NICHT in der Sortierlogik verwendet
- **Betroffene Datei:** `frontend/src/pages/Worktracker.tsx` (Zeile 1413-1570)
- **Fix:** Sortierlogik analog zu Tasks implementieren (Priorität 1: Filter-Sortierrichtungen)

### Problem 2: Filter-Tags
- **Root Cause:** Nach dem Speichern werden Filter-Tags nicht neu geladen
- **Betroffene Dateien:** 
  - `frontend/src/components/FilterPane.tsx` (Zeile 335-400)
  - `frontend/src/components/SavedFilterTags.tsx` (Zeile 205-247)
- **Fix:** `refreshFilters` nach dem Speichern aufrufen (Event, Callback, oder global)

---

**Datum:** 2025-01-22  
**Status:** Analyse abgeschlossen - NUR PRÜFUNG, KEINE ÄNDERUNGEN

