# Infinite Scroll und Filter-Logik Fix - Detaillierter Plan

**Datum:** 2025-01-29  
**Status:** 📋 PLAN - Wartet auf Zustimmung  
**Priorität:** 🔴 KRITISCH

---

## 📊 AKTUELLER CODE-ZUSTAND (FAKTEN)

### Requests.tsx

**FAKT 1: fetchRequests lädt alle Requests**
- Zeile 366-440: `fetchRequests` ist `useCallback`
- Zeile 377-387: Keine `limit`/`offset` Parameter mehr ✅
- Zeile 389: `axiosInstance.get('/requests', { params })` - lädt alle Requests
- Zeile 419: `setRequests(requestsToStore)` - alle Requests werden im State gespeichert
- Zeile 421: `setRequestsDisplayLimit(viewMode === 'cards' ? 10 : 20)` - initial displayLimit wird gesetzt ✅

**FAKT 2: handleFilterChange ruft fetchRequests mit filterId auf**
- Zeile 712-728: `handleFilterChange` Funktion
- Zeile 714: `setSelectedFilterId(id)` - filterId wird gesetzt
- Zeile 725: `await fetchRequests(id, undefined, false)` - Server filtert bereits ✅

**FAKT 3: filteredAndSortedRequests wendet client-seitig Filter an**
- Zeile 734-981: `filteredAndSortedRequests` useMemo
- Zeile 735: Kommentar: "Verwende requests (bereits server-seitig gefiltert)" ✅
- Zeile 754-832: ABER: Filter wird NOCHMAL client-seitig angewendet wenn `filterConditions.length > 0` ❌
- Zeile 981: Dependencies enthalten `filterConditions` - wird bei jedem Filter-Change neu berechnet

**FAKT 4: Infinite Scroll prüft falsche Länge**
- Zeile 546-566: Infinite Scroll Handler
- Zeile 552: `requestsDisplayLimit < requests.length` - prüft `requests.length` ❌
- Problem: Sollte `filteredAndSortedRequests.length` prüfen, nicht `requests.length`

**FAKT 5: Anzeige verwendet displayLimit korrekt**
- Zeile 1385: `filteredAndSortedRequests.slice(0, requestsDisplayLimit).map(...)` ✅
- Zeile 1611: `filteredAndSortedRequests.slice(0, requestsDisplayLimit).map(...)` ✅

---

### Worktracker.tsx - Tasks

**FAKT 1: loadTasks lädt alle Tasks**
- Zeile 582-667: `loadTasks` ist `useCallback`
- Zeile 593-603: Keine `limit`/`offset` Parameter mehr ✅
- Zeile 605: `axiosInstance.get(API_ENDPOINTS.TASKS.BASE, { params })` - lädt alle Tasks
- Zeile 650: `setTasks(tasksToStore)` - alle Tasks werden im State gespeichert
- Zeile 652: `setTasksDisplayLimit(viewMode === 'cards' ? 10 : 20)` - initial displayLimit wird gesetzt ✅

**FAKT 2: handleFilterChange ruft loadTasks mit filterId auf**
- Zeile 1169-1185: `handleFilterChange` Funktion (für todos Tab)
- Zeile 1172: `setSelectedFilterId(id)` - filterId wird gesetzt
- Zeile 1183: `await loadTasks(id, undefined, false)` - Server filtert bereits ✅

**FAKT 3: filteredAndSortedTasks wendet client-seitig Filter an**
- Zeile 1259-1557: `filteredAndSortedTasks` useMemo
- Zeile 1262: `const tasksToFilter = (allTasks.length > 0 && !selectedFilterId) ? allTasks : tasks;` - verwendet tasks wenn selectedFilterId gesetzt ✅
- Zeile 1404-1414: ABER: Filter wird NOCHMAL client-seitig angewendet wenn `filterConditions.length > 0` ❌
- Zeile 1557: Dependencies enthalten `filterConditions` - wird bei jedem Filter-Change neu berechnet

**FAKT 4: Infinite Scroll prüft falsche Länge**
- Zeile 777-811: Infinite Scroll Handler
- Zeile 786: `tasksDisplayLimit < tasks.length` - prüft `tasks.length` ❌
- Problem: Sollte `filteredAndSortedTasks.length` prüfen, nicht `tasks.length`

**FAKT 5: Anzeige verwendet displayLimit korrekt**
- Zeile 2392: `filteredAndSortedTasks.slice(0, tasksDisplayLimit).map(...)` ✅
- Zeile 2573: `filteredAndSortedTasks.slice(0, tasksDisplayLimit).map(...)` ✅
- Zeile 3670: `filteredAndSortedTasks.slice(0, tasksDisplayLimit).map(...)` ✅
- Zeile 3851: `filteredAndSortedTasks.slice(0, tasksDisplayLimit).map(...)` ✅

---

### Worktracker.tsx - Reservations

**FAKT 1: loadReservations lädt alle Reservierungen**
- Zeile 691-734: `loadReservations` Funktion
- Zeile 697-705: Filter-Parameter werden an Server gesendet ✅
- Zeile 707: `axiosInstance.get(API_ENDPOINTS.RESERVATION.BASE, { params })` - lädt alle gefilterten Reservierungen
- Zeile 721: `setReservations(reservationsToStore)` - alle Reservierungen werden im State gespeichert
- Zeile 723: `setReservationsDisplayLimit(viewMode === 'cards' ? 10 : 20)` - initial displayLimit wird gesetzt ✅

**FAKT 2: handleReservationFilterChange ruft loadReservations NICHT auf**
- Zeile 1195-1199: `handleReservationFilterChange` Funktion
- Zeile 1198: `applyReservationFilterConditions(conditions, operators, sortDirections)` - nur State wird gesetzt
- **PROBLEM:** `loadReservations` wird NICHT aufgerufen! ❌
- Zeile 736-764: Initialer Filter-Load ruft `loadReservations(aktuellFilter.id)` auf ✅

**FAKT 3: filteredAndSortedReservations wendet client-seitig Filter an**
- Zeile 1560-1852: `filteredAndSortedReservations` useMemo
- Zeile 1594-1716: Filter wird client-seitig angewendet wenn `reservationFilterConditions.length > 0` ❌
- Problem: Auch wenn Filter server-seitig angewendet wurde, wird NOCHMAL client-seitig gefiltert

**FAKT 4: Infinite Scroll prüft falsche Länge**
- Zeile 777-811: Infinite Scroll Handler
- Zeile 797: `reservationsDisplayLimit < reservations.length` - prüft `reservations.length` ❌
- Problem: Sollte `filteredAndSortedReservations.length` prüfen, nicht `reservations.length`

**FAKT 5: Anzeige verwendet displayLimit korrekt**
- Zeile 2729: `filteredAndSortedReservations.slice(0, reservationsDisplayLimit).map(...)` ✅
- Zeile 3060: `filteredAndSortedReservations.slice(0, reservationsDisplayLimit).map(...)` ✅
- Zeile 4007: `filteredAndSortedReservations.slice(0, reservationsDisplayLimit).map(...)` ✅
- Zeile 4327: `filteredAndSortedReservations.slice(0, reservationsDisplayLimit).map(...)` ✅

---

## 🔴 IDENTIFIZIERTE PROBLEME (FAKTEN)

### Problem 1: Doppelte Filterung bei Requests

**FAKT:**
- Wenn `selectedFilterId` gesetzt ist (Zeile 714 in Requests.tsx):
  - Server filtert bereits (Zeile 725: `fetchRequests(id, ...)`)
  - ABER: `filteredAndSortedRequests` wendet NOCHMAL client-seitig Filter an (Zeile 754-832)
- Wenn `filterConditions` gesetzt sind (ohne `selectedFilterId`):
  - Server filtert bereits (Zeile 383-386: `params.filterConditions = JSON.stringify(...)`)
  - ABER: `filteredAndSortedRequests` wendet NOCHMAL client-seitig Filter an (Zeile 754-832)

**Impact:**
- Filter wird doppelt angewendet
- Wenn Server 50 gefilterte Ergebnisse zurückgibt, werden diese NOCHMAL client-seitig gefiltert
- Ergebnis: Weniger Ergebnisse als erwartet

---

### Problem 2: Doppelte Filterung bei Tasks

**FAKT:**
- Wenn `selectedFilterId` gesetzt ist (Zeile 1172 in Worktracker.tsx):
  - Server filtert bereits (Zeile 1183: `loadTasks(id, ...)`)
  - ABER: `filteredAndSortedTasks` wendet NOCHMAL client-seitig Filter an (Zeile 1404-1414)
- Wenn `filterConditions` gesetzt sind (ohne `selectedFilterId`):
  - Server filtert bereits (Zeile 599-602: `params.filterConditions = JSON.stringify(...)`)
  - ABER: `filteredAndSortedTasks` wendet NOCHMAL client-seitig Filter an (Zeile 1404-1414)

**Impact:**
- Gleiches Problem wie bei Requests

---

### Problem 3: Doppelte Filterung bei Reservations

**FAKT:**
- Wenn `reservationSelectedFilterId` gesetzt ist (Zeile 746 in Worktracker.tsx):
  - Server filtert bereits (Zeile 749: `loadReservations(aktuellFilter.id)`)
  - ABER: `filteredAndSortedReservations` wendet NOCHMAL client-seitig Filter an (Zeile 1594-1716)
- Wenn `reservationFilterConditions` gesetzt sind (ohne `reservationSelectedFilterId`):
  - Server filtert bereits (Zeile 701-704: `params.filterConditions = JSON.stringify(...)`)
  - ABER: `filteredAndSortedReservations` wendet NOCHMAL client-seitig Filter an (Zeile 1594-1716)

**Impact:**
- Beispiel: Filter "heute" → Server liefert 50 Reservierungen für heute
- Client filtert NOCHMAL → könnte weniger werden
- Initial werden nur 10 angezeigt → Rest fehlt

---

### Problem 4: Infinite Scroll prüft falsche Länge

**FAKT - Requests:**
- Zeile 552: `requestsDisplayLimit < requests.length`
- Problem: Sollte `filteredAndSortedRequests.length` prüfen
- Impact: Infinite Scroll funktioniert nicht korrekt wenn Filter aktiv ist

**FAKT - Tasks:**
- Zeile 786: `tasksDisplayLimit < tasks.length`
- Problem: Sollte `filteredAndSortedTasks.length` prüfen
- Impact: Infinite Scroll funktioniert nicht korrekt wenn Filter aktiv ist

**FAKT - Reservations:**
- Zeile 797: `reservationsDisplayLimit < reservations.length`
- Problem: Sollte `filteredAndSortedReservations.length` prüfen
- Impact: Infinite Scroll funktioniert nicht korrekt wenn Filter aktiv ist

---

### Problem 5: handleReservationFilterChange ruft loadReservations nicht auf

**FAKT:**
- Zeile 1195-1199: `handleReservationFilterChange` setzt nur State
- Zeile 1198: `applyReservationFilterConditions(...)` - nur State wird gesetzt
- **FEHLT:** `loadReservations` wird NICHT aufgerufen
- Impact: Wenn Filter geändert wird, werden keine neuen Daten geladen

---

## 🎯 LÖSUNGSPLAN

### Regel 1: Filter-Logik

**Wenn `selectedFilterId` oder `filterConditions` gesetzt sind:**
- ✅ Server filtert bereits → Client sollte NICHT nochmal filtern
- ✅ Nur `searchTerm` sollte client-seitig gefiltert werden (nicht server-seitig)

**Wenn KEIN Filter gesetzt ist:**
- ✅ Alle Daten werden geladen
- ✅ Nur `searchTerm` wird client-seitig gefiltert

---

### Regel 2: Infinite Scroll

**Prüfung:**
- ✅ Sollte `filteredAndSorted*.length` prüfen, nicht `*.length`
- ✅ Nur wenn `displayLimit < filteredAndSorted*.length` → weitere Items anzeigen

---

## 📋 DETAILLIERTE ÄNDERUNGEN

### Änderung 1: Requests.tsx - Filter-Logik korrigieren

**Datei:** `frontend/src/components/Requests.tsx`

**Änderung 1.1: filteredAndSortedRequests - Keine doppelte Filterung**

**Aktueller Code (Zeile 734-981):**
```typescript
const filteredAndSortedRequests = useMemo(() => {
    const requestsToFilter = requests;
    
    return requestsToFilter
      .filter(request => {
        // Globale Suchfunktion
        if (searchTerm) { ... }
        
        // Wenn erweiterte Filterbedingungen definiert sind, wende diese an
        if (filterConditions.length > 0) {
          // ... Filter-Logik ...
        }
        
        return true;
      })
      .sort(...);
}, [requests, selectedFilterId, searchTerm, sortConfig, filterConditions, ...]);
```

**Neuer Code:**
```typescript
const filteredAndSortedRequests = useMemo(() => {
    // ✅ FAKT: Wenn selectedFilterId gesetzt ist, wurden Requests bereits server-seitig gefiltert
    // ✅ FAKT: Wenn filterConditions gesetzt sind (ohne selectedFilterId), wurden Requests bereits server-seitig gefiltert
    // ✅ NUR searchTerm wird client-seitig gefiltert (nicht server-seitig)
    
    const requestsToFilter = requests;
    
    return requestsToFilter
      .filter(request => {
        // ✅ NUR Globale Suchfunktion (searchTerm) wird client-seitig angewendet
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const matchesSearch = 
            request.title.toLowerCase().includes(searchLower) ||
            `${request.requestedBy.firstName} ${request.requestedBy.lastName}`.toLowerCase().includes(searchLower) ||
            `${request.responsible.firstName} ${request.responsible.lastName}`.toLowerCase().includes(searchLower) ||
            request.branch.name.toLowerCase().includes(searchLower);
          
          if (!matchesSearch) return false;
        }
        
        // ❌ ENTFERNEN: Client-seitige Filterung wenn selectedFilterId oder filterConditions gesetzt sind
        // ✅ Server hat bereits gefiltert, keine doppelte Filterung mehr
        
        return true;
      })
      .sort(...);
}, [requests, searchTerm, sortConfig, filterSortDirections, viewMode, ...]);
// ❌ ENTFERNEN: filterConditions, filterLogicalOperators aus Dependencies (werden nicht mehr verwendet)
```

**Begründung:**
- FAKT: Wenn `selectedFilterId` gesetzt ist, ruft `handleFilterChange` `fetchRequests(id, ...)` auf (Zeile 725)
- FAKT: `fetchRequests` sendet `filterId` an Server (Zeile 381)
- FAKT: Server filtert bereits (backend/src/controllers/requestController.ts:76-94)
- FAKT: Client sollte NICHT nochmal filtern

**Impact:**
- ✅ Keine doppelte Filterung mehr
- ✅ Alle gefilterten Ergebnisse werden angezeigt
- ✅ Nur `searchTerm` wird client-seitig gefiltert

---

**Änderung 1.2: Infinite Scroll - Korrekte Länge prüfen**

**Aktueller Code (Zeile 546-566):**
```typescript
useEffect(() => {
    scrollHandlerRef.current = () => {
      if (
        window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000 &&
        requestsDisplayLimit < requests.length  // ❌ FALSCH
      ) {
        const increment = viewMode === 'cards' ? 10 : 20;
        setRequestsDisplayLimit(prev => prev + increment);
      }
    };
    // ...
}, [requestsDisplayLimit, viewMode, requests.length]);  // ❌ FALSCH
```

**Neuer Code:**
```typescript
useEffect(() => {
    scrollHandlerRef.current = () => {
      if (
        window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000 &&
        requestsDisplayLimit < filteredAndSortedRequests.length  // ✅ KORREKT
      ) {
        const increment = viewMode === 'cards' ? 10 : 20;
        setRequestsDisplayLimit(prev => prev + increment);
      }
    };
    // ...
}, [requestsDisplayLimit, viewMode, filteredAndSortedRequests.length]);  // ✅ KORREKT
```

**Begründung:**
- FAKT: `filteredAndSortedRequests` ist das tatsächlich angezeigte Array (nach Filter und Sortierung)
- FAKT: Infinite Scroll sollte prüfen, ob noch weitere Items in `filteredAndSortedRequests` vorhanden sind
- FAKT: `requests.length` ist die Gesamtanzahl aller Requests (auch gefilterte), nicht die angezeigte Anzahl

**Impact:**
- ✅ Infinite Scroll funktioniert korrekt mit Filtern
- ✅ Weitere Items werden angezeigt wenn vorhanden

---

### Änderung 2: Worktracker.tsx - Tasks Filter-Logik korrigieren

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Änderung 2.1: filteredAndSortedTasks - Keine doppelte Filterung**

**Aktueller Code (Zeile 1259-1557):**
```typescript
const filteredAndSortedTasks = useMemo(() => {
    const tasksToFilter = (allTasks.length > 0 && !selectedFilterId) ? allTasks : tasks;
    
    return tasksToFilter
      .filter(task => {
        // Globale Suchfunktion
        if (searchTerm) { ... }
        
        // Wenn erweiterte Filterbedingungen definiert sind, wende diese an
        if (filterConditions.length > 0) {
          // ... Filter-Logik ...
        }
        
        return true;
      })
      .sort(...);
}, [tasks, allTasks, selectedFilterId, searchTerm, filterConditions, ...]);
```

**Neuer Code:**
```typescript
const filteredAndSortedTasks = useMemo(() => {
    // ✅ FAKT: Wenn selectedFilterId gesetzt ist, wurden Tasks bereits server-seitig gefiltert
    // ✅ FAKT: Wenn filterConditions gesetzt sind (ohne selectedFilterId), wurden Tasks bereits server-seitig gefiltert
    // ✅ NUR searchTerm wird client-seitig gefiltert (nicht server-seitig)
    
    const tasksToFilter = (allTasks.length > 0 && !selectedFilterId) ? allTasks : tasks;
    
    return tasksToFilter
      .filter(task => {
        // ✅ NUR Globale Suchfunktion (searchTerm) wird client-seitig angewendet
        if (searchTerm) {
          // ... searchTerm Logik ...
        }
        
        // ❌ ENTFERNEN: Client-seitige Filterung wenn selectedFilterId oder filterConditions gesetzt sind
        // ✅ Server hat bereits gefiltert, keine doppelte Filterung mehr
        
        return true;
      })
      .sort(...);
}, [tasks, allTasks, selectedFilterId, searchTerm, tableSortConfig, filterSortDirections, viewMode, ...]);
// ❌ ENTFERNEN: filterConditions, filterLogicalOperators aus Dependencies (werden nicht mehr verwendet)
```

**Begründung:**
- Gleiche Begründung wie bei Requests

**Impact:**
- ✅ Keine doppelte Filterung mehr
- ✅ Alle gefilterten Ergebnisse werden angezeigt

---

**Änderung 2.2: Infinite Scroll - Korrekte Länge prüfen**

**Aktueller Code (Zeile 777-811):**
```typescript
useEffect(() => {
    scrollHandlerRef.current = () => {
      const isNearBottom = window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000;
      
      if (
        activeTab === 'todos' &&
        isNearBottom &&
        tasksDisplayLimit < tasks.length  // ❌ FALSCH
      ) {
        const increment = viewMode === 'cards' ? 10 : 20;
        setTasksDisplayLimit(prev => prev + increment);
      }
      // ...
    };
    // ...
}, [activeTab, tasksDisplayLimit, tasks.length, ...]);  // ❌ FALSCH
```

**Neuer Code:**
```typescript
useEffect(() => {
    scrollHandlerRef.current = () => {
      const isNearBottom = window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000;
      
      if (
        activeTab === 'todos' &&
        isNearBottom &&
        tasksDisplayLimit < filteredAndSortedTasks.length  // ✅ KORREKT
      ) {
        const increment = viewMode === 'cards' ? 10 : 20;
        setTasksDisplayLimit(prev => prev + increment);
      }
      // ...
    };
    // ...
}, [activeTab, tasksDisplayLimit, filteredAndSortedTasks.length, ...]);  // ✅ KORREKT
```

**Begründung:**
- Gleiche Begründung wie bei Requests

**Impact:**
- ✅ Infinite Scroll funktioniert korrekt mit Filtern

---

### Änderung 3: Worktracker.tsx - Reservations Filter-Logik korrigieren

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Änderung 3.1: handleReservationFilterChange - loadReservations aufrufen**

**Aktueller Code (Zeile 1195-1199):**
```typescript
const handleReservationFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>) => {
    setReservationActiveFilterName(name);
    setReservationSelectedFilterId(id);
    applyReservationFilterConditions(conditions, operators, sortDirections);
    setReservationTableSortConfig({ key: 'checkInDate', direction: 'desc' });
    // ❌ FEHLT: loadReservations wird NICHT aufgerufen
};
```

**Neuer Code:**
```typescript
const handleReservationFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>) => {
    setReservationActiveFilterName(name);
    setReservationSelectedFilterId(id);
    applyReservationFilterConditions(conditions, operators, sortDirections);
    setReservationTableSortConfig({ key: 'checkInDate', direction: 'desc' });
    
    // ✅ Filter zurücksetzen bei Filter-Wechsel
    setReservationsDisplayLimit(viewMode === 'cards' ? 10 : 20);
    
    // ✅ Lade Reservierungen mit Filter (server-seitig)
    if (id) {
        await loadReservations(id);
    } else if (conditions.length > 0) {
        await loadReservations(undefined, conditions);
    } else {
        await loadReservations(); // Kein Filter
    }
};
```

**Begründung:**
- FAKT: `handleReservationFilterChange` wird aufgerufen wenn Filter geändert wird
- FAKT: Aktuell wird nur State gesetzt, aber keine neuen Daten geladen
- FAKT: `loadReservations` muss aufgerufen werden, damit Server neue gefilterte Daten lädt

**Impact:**
- ✅ Filter-Änderungen laden neue Daten
- ✅ Alle gefilterten Ergebnisse werden geladen

---

**Änderung 3.2: filteredAndSortedReservations - Keine doppelte Filterung**

**Aktueller Code (Zeile 1560-1852):**
```typescript
const filteredAndSortedReservations = useMemo(() => {
    const validReservations = reservations.filter(reservation => reservation != null);
    
    let filtered = validReservations.filter(reservation => {
      // Status-Filter, Payment-Status-Filter, Such-Filter
      // ...
      
      return true;
    });

    // Erweiterte Filterbedingungen anwenden
    if (reservationFilterConditions.length > 0) {
      // ... Filter-Logik ...
    }
    
    return filtered.sort(...);
}, [reservations, reservationFilterStatus, reservationFilterPaymentStatus, reservationSearchTerm, reservationFilterConditions, ...]);
```

**Neuer Code:**
```typescript
const filteredAndSortedReservations = useMemo(() => {
    // ✅ FAKT: Wenn reservationSelectedFilterId gesetzt ist, wurden Reservierungen bereits server-seitig gefiltert
    // ✅ FAKT: Wenn reservationFilterConditions gesetzt sind (ohne reservationSelectedFilterId), wurden Reservierungen bereits server-seitig gefiltert
    // ✅ NUR reservationSearchTerm, reservationFilterStatus, reservationFilterPaymentStatus werden client-seitig gefiltert
    
    const validReservations = reservations.filter(reservation => reservation != null);
    
    let filtered = validReservations.filter(reservation => {
      // ✅ Status-Filter (client-seitig, nicht server-seitig)
      if (reservationFilterStatus !== 'all' && reservation.status !== reservationFilterStatus) {
        return false;
      }
      
      // ✅ Payment-Status-Filter (client-seitig, nicht server-seitig)
      if (reservationFilterPaymentStatus !== 'all' && reservation.paymentStatus !== reservationFilterPaymentStatus) {
        return false;
      }
      
      // ✅ Such-Filter (client-seitig, nicht server-seitig)
      if (reservationSearchTerm) {
        // ... searchTerm Logik ...
      }
      
      return true;
    });

    // ❌ ENTFERNEN: Erweiterte Filterbedingungen (reservationFilterConditions) werden NICHT mehr client-seitig angewendet
    // ✅ Server hat bereits gefiltert, keine doppelte Filterung mehr
    
    return filtered.sort(...);
}, [reservations, reservationFilterStatus, reservationFilterPaymentStatus, reservationSearchTerm, reservationFilterSortDirections, viewMode, ...]);
// ❌ ENTFERNEN: reservationFilterConditions, reservationFilterLogicalOperators aus Dependencies (werden nicht mehr verwendet)
```

**Begründung:**
- FAKT: Wenn `reservationSelectedFilterId` gesetzt ist, ruft `loadReservations(id)` auf (Zeile 749)
- FAKT: `loadReservations` sendet `filterId` an Server (Zeile 699)
- FAKT: Server filtert bereits (backend muss prüfen ob Filter-Parameter unterstützt werden)
- FAKT: Client sollte NICHT nochmal filtern

**Hinweis:** 
- `reservationFilterStatus` und `reservationFilterPaymentStatus` sind einfache Dropdown-Filter (nicht server-seitig)
- Diese bleiben client-seitig
- Nur `reservationFilterConditions` (erweiterte Filter) werden server-seitig angewendet

**Impact:**
- ✅ Keine doppelte Filterung mehr
- ✅ Alle gefilterten Ergebnisse werden angezeigt

---

**Änderung 3.3: Infinite Scroll - Korrekte Länge prüfen**

**Aktueller Code (Zeile 777-811):**
```typescript
useEffect(() => {
    scrollHandlerRef.current = () => {
      const isNearBottom = window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000;
      
      if (
        activeTab === 'reservations' &&
        isNearBottom &&
        reservationsDisplayLimit < reservations.length  // ❌ FALSCH
      ) {
        const increment = viewMode === 'cards' ? 10 : 20;
        setReservationsDisplayLimit(prev => prev + increment);
      }
    };
    // ...
}, [activeTab, reservationsDisplayLimit, reservations.length, ...]);  // ❌ FALSCH
```

**Neuer Code:**
```typescript
useEffect(() => {
    scrollHandlerRef.current = () => {
      const isNearBottom = window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000;
      
      if (
        activeTab === 'reservations' &&
        isNearBottom &&
        reservationsDisplayLimit < filteredAndSortedReservations.length  // ✅ KORREKT
      ) {
        const increment = viewMode === 'cards' ? 10 : 20;
        setReservationsDisplayLimit(prev => prev + increment);
      }
    };
    // ...
}, [activeTab, reservationsDisplayLimit, filteredAndSortedReservations.length, ...]);  // ✅ KORREKT
```

**Begründung:**
- Gleiche Begründung wie bei Requests/Tasks

**Impact:**
- ✅ Infinite Scroll funktioniert korrekt mit Filtern

---

## ⚠️ WICHTIGE HINWEISE

### 1. searchTerm bleibt client-seitig

**FAKT:**
- `searchTerm` wird NICHT an Server gesendet
- `searchTerm` wird NUR client-seitig gefiltert
- Das ist korrekt so (schnelle Client-seitige Suche)

### 2. reservationFilterStatus und reservationFilterPaymentStatus bleiben client-seitig

**FAKT:**
- Diese sind einfache Dropdown-Filter
- Werden NICHT server-seitig angewendet
- Bleiben client-seitig (korrekt so)

### 3. Sortierung bleibt erhalten

**FAKT:**
- Sortierung wird weiterhin client-seitig angewendet
- Filter-Sortierrichtungen (`filterSortDirections`) bleiben erhalten
- Table-Header-Sortierung bleibt erhalten

---

## 📋 IMPLEMENTIERUNGSREIHENFOLGE

### Phase 1: Requests.tsx
1. ✅ `filteredAndSortedRequests` - Client-seitige Filterung entfernen (nur searchTerm)
2. ✅ Infinite Scroll - `filteredAndSortedRequests.length` prüfen
3. ✅ Dependencies korrigieren

### Phase 2: Worktracker.tsx - Tasks
1. ✅ `filteredAndSortedTasks` - Client-seitige Filterung entfernen (nur searchTerm)
2. ✅ Infinite Scroll - `filteredAndSortedTasks.length` prüfen
3. ✅ Dependencies korrigieren

### Phase 3: Worktracker.tsx - Reservations
1. ✅ `handleReservationFilterChange` - `loadReservations` aufrufen
2. ✅ `filteredAndSortedReservations` - Client-seitige Filterung entfernen (nur Status/Payment/Search)
3. ✅ Infinite Scroll - `filteredAndSortedReservations.length` prüfen
4. ✅ Dependencies korrigieren

---

## ✅ ERWARTETE VERBESSERUNGEN

### Vorher:
- ❌ Filter wird doppelt angewendet (Server + Client)
- ❌ Bei Filter "heute": Nur 10 Reservierungen angezeigt, Rest fehlt
- ❌ Infinite Scroll funktioniert nicht korrekt mit Filtern

### Nachher:
- ✅ Filter wird nur einmal angewendet (Server)
- ✅ Bei Filter "heute": Alle Reservierungen für heute werden geladen, initial 10 angezeigt, Rest beim Scrollen
- ✅ Infinite Scroll funktioniert korrekt mit Filtern

---

## 🧪 TESTS

### Test 1: Requests Filter
1. Setze Filter "Aktuell"
2. Prüfe: Alle gefilterten Requests werden geladen
3. Prüfe: Initial 10/20 Requests angezeigt
4. Scrolle: Weitere Requests werden angezeigt
5. Prüfe: Keine doppelte Filterung

### Test 2: Tasks Filter
1. Setze Filter "Aktuell"
2. Prüfe: Alle gefilterten Tasks werden geladen
3. Prüfe: Initial 10/20 Tasks angezeigt
4. Scrolle: Weitere Tasks werden angezeigt
5. Prüfe: Keine doppelte Filterung

### Test 3: Reservations Filter "heute"
1. Setze Filter "heute" (checkInDate = __TODAY__)
2. Prüfe: Alle Reservierungen für heute werden geladen (z.B. 50)
3. Prüfe: Initial 10/20 Reservierungen angezeigt
4. Scrolle: Weitere Reservierungen werden angezeigt
5. Prüfe: Alle 50 Reservierungen sind sichtbar (nicht nur 10)

---

**Erstellt:** 2025-01-29  
**Status:** 📋 PLAN - Wartet auf Zustimmung  
**Nächster Schritt:** Zustimmung einholen, dann Phase 1 umsetzen

