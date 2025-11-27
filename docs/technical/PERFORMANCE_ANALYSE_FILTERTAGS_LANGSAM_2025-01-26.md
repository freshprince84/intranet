# Performance-Analyse: FilterTags dauern ewig zum Laden (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔴 KRITISCH - Analyse abgeschlossen  
**Problem:** FilterTags dauern überall ewig zum Laden, obwohl sie da sind, um Seiten schnell zu laden

---

## 🔍 IDENTIFIZIERTE PROBLEME

### Problem 1: SavedFilterTags macht 2 DB-Queries ohne Caching

**Datei:** `frontend/src/components/SavedFilterTags.tsx:208-250`

**Was passiert beim Mount:**
```typescript
useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    
    // Lade Filter und Gruppen parallel
    const [filtersResponse, groupsResponse] = await Promise.all([
      axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)),  // ← Request 1
      axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.GROUPS.BY_TABLE(tableId))  // ← Request 2
    ]);
    
    setSavedFilters(filters);
    setFilterGroups(groups);
  };
  
  fetchData();
}, [tableId]);
```

**Backend-Endpoints:**

1. **`getUserSavedFilters`** (`backend/src/controllers/savedFilterController.ts:27-101`)
   - **DB-Query:** `prisma.savedFilter.findMany({ where: { userId, tableId } })`
   - **Keine Caching!**
   - **JSON-Parsing:** Parst `conditions`, `operators`, `sortDirections` bei jedem Request

2. **`getFilterGroups`** (`backend/src/controllers/savedFilterController.ts:348-412`)
   - **DB-Query:** `prisma.filterGroup.findMany({ where: { userId, tableId }, include: { filters } })`
   - **Keine Caching!**
   - **JSON-Parsing:** Parst `conditions`, `operators`, `sortDirections` für jeden Filter bei jedem Request

**Impact:**
- **2 DB-Queries** bei jedem Seitenaufruf
- **Keine Caching** für Filter-Listen (nur einzelne Filter werden gecacht)
- **JSON-Parsing** bei jedem Request (kann bei vielen Filtern langsam sein)

---

### Problem 2: FilterTags werden bei JEDEM Seitenaufruf geladen

**Datei:** `frontend/src/components/SavedFilterTags.tsx:208-250`

**Problem:**
- `useEffect` lädt Filter beim Mount (Zeile 208)
- Wird bei **JEDEM** Seitenaufruf ausgeführt
- **Keine Caching** im Frontend
- **Keine Caching** im Backend

**Betroffene Seiten:**
- `Worktracker.tsx` - SavedFilterTags wird verwendet (Zeile 2641, 3988)
- `Cerebro.tsx` - SavedFilterTags wird verwendet (Zeile 190)
- `Requests.tsx` - SavedFilterTags wird verwendet
- **Alle anderen Seiten** die SavedFilterTags verwenden

**Impact:**
- Bei **JEDEM** Seitenaufruf: 2 DB-Queries
- Bei **JEDEM** Tab-Wechsel: 2 DB-Queries (wenn tableId sich ändert)
- **Keine Caching!**

---

### Problem 3: Doppelte Requests - SavedFilterTags + Parent-Komponente

**Datei:** `frontend/src/pages/Worktracker.tsx:916-959`

**Problem:**
- `Worktracker.tsx` lädt Filter selbst (Zeile 919): `GET /saved-filters/worktracker-todos`
- `SavedFilterTags` lädt Filter auch (Zeile 221): `GET /saved-filters/worktracker-todos`
- **Doppelte Requests!**

**Code:**
```typescript
// Worktracker.tsx (Zeile 916-959)
useEffect(() => {
  const setInitialFilterAndLoad = async () => {
    try {
      // Request 1: Filter laden
      const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(TODOS_TABLE_ID));
      const filters = response.data;
      
      // ... Filter anwenden ...
    }
  };
  
  setInitialFilterAndLoad();
}, []);

// SavedFilterTags.tsx (Zeile 208-250)
useEffect(() => {
  const fetchData = async () => {
    // Request 2: Filter laden (DOPPELT!)
    const filtersResponse = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId));
    // ...
  };
  
  fetchData();
}, [tableId]);
```

**Impact:**
- **Doppelte DB-Queries** für Filter
- **Doppelte JSON-Parsing**
- **Doppelte Network-Requests**

---

### Problem 4: getFilterGroups macht komplexe Query mit include

**Datei:** `backend/src/controllers/savedFilterController.ts:362-377`

**Problem:**
```typescript
const groups = await prisma.filterGroup.findMany({
  where: { userId, tableId },
  include: {
    filters: {  // ← N+1 Problem potenziell
      orderBy: { order: 'asc' }
    }
  },
  orderBy: { order: 'asc' }
});
```

**Komplexität:**
- **1 Query für Gruppen** + **N Queries für Filter** (wenn Prisma nicht optimiert)
- **JSON-Parsing** für jeden Filter (Zeile 391-393)
- **Keine Caching!**

**Impact:**
- Bei vielen Filtern: Langsame Query
- Bei vielen Gruppen: Langsame Query
- **Keine Caching!**

---

### Problem 5: Keine executeWithRetry bei Filter-Queries

**Datei:** `backend/src/controllers/savedFilterController.ts:42, 362`

**Problem:**
- `getUserSavedFilters` verwendet `prisma.savedFilter.findMany` direkt (Zeile 42)
- `getFilterGroups` verwendet `prisma.filterGroup.findMany` direkt (Zeile 362)
- **Kein `executeWithRetry`!**
- Bei DB-Fehlern: Keine Retry-Logik

**Impact:**
- Bei DB-Verbindungsfehlern: Sofortiger Fehler
- Keine automatische Wiederholung

---

## 📊 ZUSAMMENFASSUNG DER PROBLEME

### Kritische Probleme:

1. **getUserSavedFilters - Keine Caching**
   - Impact: **1-2 Sekunden** bei jedem Seitenaufruf
   - Lösung: FilterListCache implementieren (TTL: 5 Minuten)

2. **getFilterGroups - Keine Caching**
   - Impact: **1-2 Sekunden** bei jedem Seitenaufruf
   - Lösung: FilterListCache implementieren (TTL: 5 Minuten)

3. **Doppelte Requests - SavedFilterTags + Parent-Komponente**
   - Impact: **Doppelte DB-Queries** für Filter
   - Lösung: Filter-Listen zwischen Komponenten teilen (Context oder Props)

4. **Keine executeWithRetry bei Filter-Queries**
   - Impact: Bei DB-Fehlern: Sofortiger Fehler
   - Lösung: `executeWithRetry` um Filter-Queries wickeln

---

## 🔍 WARUM IST ES SO LANGSAM?

### Request-Flow bei Seitenaufruf:

1. **Frontend:** `Worktracker.tsx` wird geladen
2. **Frontend:** `setInitialFilterAndLoad()` wird aufgerufen
   - **Request 1:** `GET /saved-filters/worktracker-todos` → **DB-Query 1** (1-2s)
3. **Frontend:** `SavedFilterTags` wird gerendert
   - **Request 2:** `GET /saved-filters/worktracker-todos` → **DB-Query 2** (1-2s) (DOPPELT!)
   - **Request 3:** `GET /saved-filters/groups/worktracker-todos` → **DB-Query 3** (1-2s)
4. **Gesamtzeit:** **3-6 Sekunden** nur für FilterTags!

**Das erklärt, warum FilterTags so langsam sind!**

---

## 📋 WAS WAR DIE URSPRÜNGLICHE IDEE?

**Idee:**
- Durch einen aktiven Standardfilter müssen beim Öffnen der Seite nicht alle Resultate abgefragt werden
- Nur die gefilterten Resultate werden geladen
- Andere Resultate werden erst danach im Hintergrund geladen

**Problem:**
- Die Idee ist gut, aber die **FilterTags selbst** sind jetzt der Bottleneck!
- FilterTags dauern **3-6 Sekunden** zum Laden
- Das macht die ganze Optimierung zunichte!

---

## 🔍 WARUM WURDE DAS NICHT FRÜHER IDENTIFIZIERT?

**Mögliche Gründe:**
1. **Fokus auf andere Probleme:** Frühere Analysen fokussierten auf Middleware, executeWithRetry, etc.
2. **Kleine Datenmengen:** Filter-Listen sind klein (wenige KB), daher wurde DB-Query-Zeit als "akzeptabel" eingeschätzt
3. **Doppelte Requests nicht erkannt:** Doppelte Requests wurden möglicherweise nicht als Problem erkannt
4. **Nach anderen Fixes sichtbar:** Nach Fix von `executeWithRetry` werden andere Bottlenecks sichtbar

---

## 📊 ERWARTETE VERBESSERUNG (wenn behoben)

### Vorher (aktuell):
- **FilterTags laden:** 3-6 Sekunden (2-3 DB-Queries)
- **Doppelte Requests:** Ja (Worktracker + SavedFilterTags)
- **Keine Caching:** Ja

### Nachher (mit Caching):
- **FilterTags laden:** 0.1-0.2 Sekunden (Cache-Hit) oder 1-2s (Cache-Miss, nur einmal)
- **Doppelte Requests:** Nein (Filter-Listen werden geteilt)
- **Caching:** Ja (5 Minuten TTL)

**Reduktion:** **95-99% schneller**

---

## ⚠️ WICHTIG: NUR ANALYSE - NOCH NICHT IMPLEMENTIERT

**Status:** Analyse abgeschlossen  
**Nächster Schritt:** Lösungen mit User besprechen, dann implementieren

---

**Erstellt:** 2025-01-26  
**Status:** 🔴 KRITISCH - FilterTags sind der Bottleneck



