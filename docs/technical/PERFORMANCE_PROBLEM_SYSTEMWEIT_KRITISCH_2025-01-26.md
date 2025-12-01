# Performance-Problem: Systemweite Analyse (2025-01-26)

**Datum:** 2025-01-26  
**Status:** ✅ GELÖST (2025-01-29) - Hauptproblem identifiziert und behoben  
**Problem:** Das GANZE System ist langsam, nicht nur einzelne Queries

## ⚠️ WICHTIG: HAUPTPROBLEM GELÖST (2025-01-29)

**✅ Das Hauptproblem wurde identifiziert und behoben:**
- **Problem:** Organization Settings waren 63 MB groß (sollten < 10 KB sein)
- **Ursache:** Mehrfache Verschlüsselung von `lobbyPms.apiKey` (jedes Speichern = erneute Verschlüsselung)
- **Lösung:** Verschlüsselungs-Check implementiert - prüft ob bereits verschlüsselt
- **Ergebnis:** System läuft wieder deutlich schneller (5.5 Sekunden → 50ms)

**Siehe:** `docs/technical/PERFORMANCE_PROBLEM_GELOEST_2025-01-29.md` für vollständige Dokumentation.

---

---

## 🔴 IDENTIFIZIERTE KRITISCHE PROBLEME

### Problem 1: RE-RENDER-LOOPS durch useEffect-Abhängigkeiten ⚠️🔴 KRITISCH

**Datei:** `frontend/src/components/Requests.tsx:582, 611`

**Problem:**
```typescript
// Zeile 582: useEffect mit filterConditions als Dependency
useEffect(() => {
  const handleScroll = () => { ... };
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [requestsLoadingMore, requestsHasMore, selectedFilterId, filterConditions]); // ← filterConditions!

// Zeile 611: filterConditions wird in useEffect gesetzt
useEffect(() => {
  const setInitialFilterAndLoad = async () => {
    // ...
    applyFilterConditions(aktuellFilter.conditions, ...); // ← Setzt filterConditions!
    // ...
  };
  setInitialFilterAndLoad();
}, []); // ← Leere Dependencies, aber filterConditions wird gesetzt

// applyFilterConditions setzt filterConditions:
const applyFilterConditions = (conditions, operators, sortDirections) => {
  setFilterConditions(conditions); // ← Triggert Re-Render!
  setFilterLogicalOperators(operators);
  setFilterSortDirections(sortDirections);
};
```

**Impact:**
- **Re-Render-Loop:** `filterConditions` ändert sich → `useEffect` (Zeile 582) läuft → Triggert Re-Render → `filterConditions` ändert sich wieder → ...
- **CPU auf 100%:** Endloser Re-Render-Loop
- **PC läuft heiß:** CPU arbeitet ständig
- **800MB RAM:** Viele Re-Renders = viele Objekte im Memory

**Gleiches Problem in Worktracker.tsx:**
- Zeile 913: `useEffect` mit `tasks` als Dependency
- Zeile 938: `filterConditions` wird in `useEffect` gesetzt

---

### Problem 2: Doppelte API-Calls ⚠️🔴 KRITISCH

**Datei:** `frontend/src/components/Requests.tsx:589` + `SavedFilterTags.tsx:221`

**Problem:**
```typescript
// Requests.tsx Zeile 589: Lädt Filter
useEffect(() => {
  const setInitialFilterAndLoad = async () => {
    const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(REQUESTS_TABLE_ID));
    // ...
  };
  setInitialFilterAndLoad();
}, []);

// SavedFilterTags.tsx Zeile 221: Lädt Filter AUCH
useEffect(() => {
  const fetchData = async () => {
    const [filtersResponse, groupsResponse] = await Promise.all([
      axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)), // ← DOPPELT!
      axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.GROUPS.BY_TABLE(tableId))
    ]);
  };
  fetchData();
}, [tableId]);
```

**Impact:**
- **Doppelte DB-Queries:** Filter werden 2x geladen
- **2x Ladezeit:** FilterTags dauern 2x länger
- **Verschwendete Ressourcen:** 2x API-Calls, 2x DB-Queries

**Gleiches Problem in Worktracker.tsx:**
- Zeile 919: Lädt Filter
- `SavedFilterTags` lädt Filter AUCH

---

### Problem 3: Hintergrund-Laden lädt ALLE Daten ⚠️🔴 KRITISCH

**Datei:** `frontend/src/components/Requests.tsx:620`

**Problem:**
```typescript
// Zeile 620: Lädt ALLE Requests im Hintergrund nach 2 Sekunden
setTimeout(() => {
  fetchRequests(undefined, undefined, true); // ← Lädt ALLE Requests!
}, 2000);
```

**Impact:**
- **Verschwendete Ressourcen:** Lädt ALLE Requests, auch wenn nicht nötig
- **Hohe DB-Last:** Große Query ohne Limit
- **Hoher Memory-Verbrauch:** Alle Requests im Memory
- **Langsam:** Große Query dauert lange

**Gleiches Problem in Worktracker.tsx:**
- Zeile 948: Lädt ALLE Tasks im Hintergrund

---

### Problem 4: Verschachtelte OR-Bedingungen im Backend ⚠️🔴 KRITISCH

**Datei:** `backend/src/controllers/requestController.ts:116-131`

**Problem:**
```typescript
// Zeile 116-131: Verschachtelte OR-Bedingungen
baseWhereConditions.push({
  OR: [
    {
      isPrivate: false,
      organizationId: organizationId
    },
    {
      isPrivate: true,
      organizationId: organizationId,
      OR: [  // ← Verschachtelte OR!
        { requesterId: userId },
        { responsibleId: userId }
      ]
    }
  ]
});
```

**Impact:**
- **Sehr langsam:** PostgreSQL kann verschachtelte OR-Bedingungen nicht optimal nutzen
- **1 Minute für 12 Einträge:** Query dauert extrem lange
- **Keine Index-Nutzung:** Indizes werden nicht optimal genutzt

---

### Problem 5: Zu viele useEffect/useState/useMemo/useCallback ⚠️🔴 KRITISCH

**Statistik:**
- `Requests.tsx`: **35** useEffect/useState/useMemo/useCallback
- `Worktracker.tsx`: **95** useEffect/useState/useMemo/useCallback

**Impact:**
- **Hoher Memory-Verbrauch:** Viele State-Variablen
- **Viele Re-Renders:** Jede State-Änderung trigger Re-Render
- **Komplexe Abhängigkeiten:** Schwer zu debuggen
- **800MB RAM:** Zu viele Objekte im Memory

---

### Problem 6: Keine Cleanup-Funktionen ⚠️🔴 KRITISCH

**Datei:** `frontend/src/components/Requests.tsx:582`

**Problem:**
```typescript
useEffect(() => {
  const handleScroll = () => { ... };
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [requestsLoadingMore, requestsHasMore, selectedFilterId, filterConditions]);
```

**Problem:**
- **Event-Listener werden nicht entfernt:** Bei jedem Re-Render wird neuer Listener hinzugefügt
- **Memory Leak:** Viele Event-Listener im Memory
- **Performance:** Viele Event-Listener = langsam

**Gleiches Problem:** Viele `useEffect` ohne Cleanup-Funktionen

---

## 📊 ZUSAMMENFASSUNG DER PROBLEME

### Frontend-Probleme:
1. ✅ **Re-Render-Loops** durch `filterConditions` Dependency
2. ✅ **Doppelte API-Calls** für Filter
3. ✅ **Hintergrund-Laden** lädt ALLE Daten
4. ✅ **Zu viele State-Variablen** (35-95 pro Komponente)
5. ✅ **Keine Cleanup-Funktionen** → Memory Leaks
6. ✅ **800MB RAM** → Memory Leaks

### Backend-Probleme:
1. ✅ **Verschachtelte OR-Bedingungen** → Sehr langsam
2. ✅ **1 Minute für 12 Einträge** → Query dauert extrem lange

---

## 💡 LÖSUNGEN (Priorität)

### Lösung 1: Re-Render-Loops beheben ⭐ PRIORITÄT 1

**Problem:** `filterConditions` als Dependency in `useEffect`

**Lösung:**
```typescript
// Statt filterConditions als Dependency:
useEffect(() => {
  const handleScroll = () => { ... };
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [requestsLoadingMore, requestsHasMore, selectedFilterId]); // ← filterConditions entfernt!

// Oder: useRef für filterConditions verwenden
const filterConditionsRef = useRef(filterConditions);
useEffect(() => {
  filterConditionsRef.current = filterConditions;
}, [filterConditions]);
```

### Lösung 2: Doppelte API-Calls vermeiden ⭐ PRIORITÄT 1

**Problem:** Filter werden 2x geladen

**Lösung:**
- Filter-Listen in Context/State-Management speichern
- `SavedFilterTags` verwendet bereits geladene Filter
- Keine doppelten Requests

### Lösung 3: Hintergrund-Laden optimieren ⭐ PRIORITÄT 2

**Problem:** Lädt ALLE Daten im Hintergrund

**Lösung:**
- Hintergrund-Laden nur wenn nötig
- Mit Limit (z.B. 100 Einträge)
- Oder: Gar nicht im Hintergrund laden

### Lösung 4: Backend OR-Bedingungen optimieren ⭐ PRIORITÄT 1

**Problem:** Verschachtelte OR-Bedingungen

**Lösung:**
- Separate Queries mit UNION (siehe vorherige Analyse)
- Oder: Composite Index hinzufügen

### Lösung 5: State-Variablen reduzieren ⭐ PRIORITÄT 3

**Problem:** Zu viele State-Variablen

**Lösung:**
- State-Management (Redux, Zustand, etc.)
- Oder: Komponenten aufteilen

---

## ✅ NÄCHSTE SCHRITTE

1. **Re-Render-Loops beheben** (PRIORITÄT 1)
2. **Doppelte API-Calls vermeiden** (PRIORITÄT 1)
3. **Backend OR-Bedingungen optimieren** (PRIORITÄT 1)
4. **Hintergrund-Laden optimieren** (PRIORITÄT 2)
5. **State-Variablen reduzieren** (PRIORITÄT 3)

---

**Erstellt:** 2025-01-26  
**Status:** 🔴🔴🔴 KRITISCH - Systemweites Problem identifiziert  
**Nächster Schritt:** Lösungen implementieren

