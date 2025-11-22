# Performance: LCP-Problem - Lösungsansätze (2025-01-22)

**Datum:** 2025-01-22  
**Status:** 🔍 Analyse abgeschlossen  
**Problem:** LCP 8.26s - LCP-Element wird erst nach blockierendem Request sichtbar

---

## 🔴 PROBLEM IDENTIFIZIERT

**LCP-Element:** `span.text-gray-900.dark:text-white.flex-1.min-w-0.break-wor...`  
**Quelle:** `DataCard.tsx` (Request/Task Titel)

**Aktueller Flow:**
1. Context-Init: 5 parallele Requests
2. Layout-Render: Header & Sidebar
3. Page-Render: Dashboard/Worktracker
4. **Filter-Request:** `GET /saved-filters/requests-table` oder `/saved-filters/worktracker-todos`
5. **Blockierender Request:** `GET /requests?filterId=X` oder `GET /tasks?filterId=X` ← **HIER IST DAS PROBLEM!**
6. Daten-Render: LCP-Element wird sichtbar

**Fakt:** LCP-Element wird erst nach blockierendem Request sichtbar (Filter → Requests/Tasks).

---

## ✅ BESTEHENDE LÖSUNGSPATTERNS IM CODE

### 1. Skeleton-Loading (ReservationDetails.tsx)

**Datei:** `frontend/src/components/reservations/ReservationDetails.tsx:94-103`

**Pattern:**
```typescript
if (loading) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
      </div>
    </div>
  );
}
```

**Fakt:** Skeleton-Loading mit `animate-pulse` existiert bereits im Code.

---

### 2. Optimistische UI (SavedFilterTags.tsx)

**Datei:** `frontend/src/components/SavedFilterTags.tsx:418-431`

**Pattern:**
```typescript
// Optimistische Filter-Anzeige für bessere UX
const showOptimisticFilters = savedFilters.length === 0 && loading;

const optimisticFilters = useMemo(() => {
  if (!showOptimisticFilters) return [];
  return Array(3).fill(null).map((_, i) => ({
    id: `placeholder-${i}`,
    name: i === 0 ? 'Heute' : i === 1 ? 'Woche' : '████████',
    isPlaceholder: true,
    tableId,
    conditions: [],
    operators: []
  }));
}, [showOptimisticFilters, tableId]);

const displayFilters = showOptimisticFilters ? optimisticFilters : sortedFilters.filter(f => f != null);
```

**Fakt:** Optimistische UI mit Placeholder-Daten existiert bereits im Code.

---

### 3. Loading-State (Requests.tsx)

**Datei:** `frontend/src/components/Requests.tsx:990`

**Pattern:**
```typescript
if (loading) return <div className="p-4">{t('common.loading')}</div>;
```

**Fakt:** Loading-State existiert, aber zeigt nur Text (kein Skeleton).

---

### 4. Loading-State mit Spinner (WorktimeTracker.tsx)

**Datei:** `frontend/src/components/WorktimeTracker.tsx:406-414`

**Pattern:**
```typescript
if (isLoading) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 mb-6">
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-300"></div>
      </div>
    </div>
  );
}
```

**Fakt:** Loading-State mit Spinner existiert bereits im Code.

---

## 🎯 LÖSUNGSANSÄTZE (BASIEREND AUF BESTEHENDEN PATTERNS)

### Lösung 1: Skeleton-Loading für LCP-Element (KRITISCH)

**Problem:** LCP-Element wird erst nach blockierendem Request sichtbar.

**Lösung:** Skeleton-Loading für `DataCard.tsx` (LCP-Element) sofort rendern, auch ohne Daten.

**Pattern aus Code:** `ReservationDetails.tsx` (Skeleton-Loading mit `animate-pulse`)

**Umsetzung:**
1. **Requests.tsx:**
   - Zeile 990: Statt `<div className="p-4">{t('common.loading')}</div>` → Skeleton-Loading für DataCards
   - Skeleton rendern, auch wenn `requests.length === 0` und `loading === true`

2. **Worktracker.tsx:**
   - Ähnlich: Skeleton-Loading für Tasks (DataCards)

3. **DataCard.tsx:**
   - Optional: Skeleton-Modus für `title` (LCP-Element)

**Erwartete Verbesserung:**
- LCP-Element wird sofort sichtbar (Skeleton)
- LCP-Zeit: ~0.1-0.3s (statt 8.26s)
- Daten werden im Hintergrund geladen, Skeleton wird durch echte Daten ersetzt

**Fakt:** Skeleton-Loading ist die kritischste Lösung für LCP-Problem.

---

### Lösung 2: Parallele Requests statt sequenziell

**Problem:** Sequenzielle Requests blockieren Rendering (Filter → Requests/Tasks).

**Lösung:** Filter-Request und Requests/Tasks-Request parallel starten.

**Pattern aus Code:** `SavedFilterTags.tsx:217-220` (parallele Requests mit `Promise.all`)

**Aktueller Code (Requests.tsx:523-572):**
```typescript
// Sequenziell:
const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(REQUESTS_TABLE_ID));
// ... Filter verarbeiten ...
await fetchRequests(aktuellFilter.id); // ← Blockierend!
```

**Optimierter Code:**
```typescript
// Parallel:
const [filtersResponse, requestsResponse] = await Promise.all([
  axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(REQUESTS_TABLE_ID)),
  axiosInstance.get('/requests', { params: { filterId: defaultFilterId } }) // Fallback-Filter
]);
```

**Erwartete Verbesserung:**
- Requests/Tasks werden parallel zu Filter geladen
- LCP-Element wird früher sichtbar (wenn Daten ankommen)
- **ABER:** Benötigt Standard-Filter-ID (könnte aus Cache kommen)

**Fakt:** Parallele Requests können LCP verbessern, aber Standard-Filter-ID muss bekannt sein.

---

### Lösung 3: Optimistische UI (wie SavedFilterTags)

**Problem:** LCP-Element wird erst nach Daten-Load sichtbar.

**Lösung:** Optimistische UI mit Placeholder-Daten für Requests/Tasks.

**Pattern aus Code:** `SavedFilterTags.tsx:418-431` (optimistische Filter-Anzeige)

**Umsetzung:**
1. **Requests.tsx:**
   - Wenn `loading === true` und `requests.length === 0` → Placeholder-Requests rendern
   - Placeholder-Requests haben `isPlaceholder: true` Flag
   - DataCard rendert Placeholder-Titel (LCP-Element wird sofort sichtbar)

2. **Worktracker.tsx:**
   - Ähnlich: Placeholder-Tasks rendern

**Erwartete Verbesserung:**
- LCP-Element wird sofort sichtbar (Placeholder)
- LCP-Zeit: ~0.1-0.3s (statt 8.26s)
- Daten werden im Hintergrund geladen, Placeholder werden durch echte Daten ersetzt

**Fakt:** Optimistische UI ist eine Alternative zu Skeleton-Loading.

---

### Lösung 4: Sofortiges Rendering mit leeren Arrays + Skeleton

**Problem:** `loading === true` verhindert Rendering von LCP-Element.

**Lösung:** LCP-Element sofort rendern (Skeleton), auch wenn `loading === true`.

**Pattern aus Code:** `ReservationDetails.tsx` (Skeleton-Loading)

**Aktueller Code (Requests.tsx:990):**
```typescript
if (loading) return <div className="p-4">{t('common.loading')}</div>;
```

**Optimierter Code:**
```typescript
// LCP-Element sofort rendern (Skeleton), auch wenn loading === true
if (loading && requests.length === 0) {
  return (
    <div>
      {/* Skeleton-Loading für DataCards */}
      {Array(3).fill(null).map((_, i) => (
        <DataCard
          key={`skeleton-${i}`}
          title={<div className="animate-pulse h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>}
          // ... weitere Skeleton-Props
        />
      ))}
    </div>
  );
}
```

**Erwartete Verbesserung:**
- LCP-Element wird sofort sichtbar (Skeleton)
- LCP-Zeit: ~0.1-0.3s (statt 8.26s)

**Fakt:** Sofortiges Rendering mit Skeleton ist die einfachste Lösung.

---

## 📊 VERGLEICH DER LÖSUNGEN

| Lösung | Komplexität | Erwartete LCP-Verbesserung | Bestehendes Pattern |
|--------|-------------|----------------------------|---------------------|
| **1. Skeleton-Loading** | ⭐⭐ Mittel | 8.26s → ~0.1-0.3s | ✅ ReservationDetails.tsx |
| **2. Parallele Requests** | ⭐⭐⭐ Hoch | 8.26s → ~4-6s (wenn Standard-Filter-ID bekannt) | ✅ SavedFilterTags.tsx |
| **3. Optimistische UI** | ⭐⭐ Mittel | 8.26s → ~0.1-0.3s | ✅ SavedFilterTags.tsx |
| **4. Sofortiges Rendering** | ⭐ Niedrig | 8.26s → ~0.1-0.3s | ✅ ReservationDetails.tsx |

**Empfehlung:** **Lösung 1 (Skeleton-Loading)** + **Lösung 4 (Sofortiges Rendering)** kombinieren.

---

## 🎯 KONKRETE UMSETZUNG (BASIEREND AUF BESTEHENDEN PATTERNS)

### Requests.tsx

**Aktuell (Zeile 990):**
```typescript
if (loading) return <div className="p-4">{t('common.loading')}</div>;
```

**Optimiert (basierend auf ReservationDetails.tsx):**
```typescript
if (loading && requests.length === 0) {
  return (
    <div className="space-y-4">
      {Array(3).fill(null).map((_, i) => (
        <div key={`skeleton-${i}`} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
          <div className="animate-pulse space-y-4">
            {/* LCP-Element: Titel-Skeleton */}
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Fakt:** Skeleton-Loading für Requests basierend auf bestehendem Pattern.

---

### Worktracker.tsx

**Ähnlich:** Skeleton-Loading für Tasks (DataCards).

**Fakt:** Skeleton-Loading für Tasks basierend auf bestehendem Pattern.

---

## 📋 ZUSAMMENFASSUNG

### Problem
- LCP 8.26s
- LCP-Element wird erst nach blockierendem Request sichtbar
- Sequenzielle Requests blockieren Rendering

### Lösungen (basierend auf bestehenden Patterns)
1. ✅ **Skeleton-Loading** (ReservationDetails.tsx) - **KRITISCH**
2. ✅ **Parallele Requests** (SavedFilterTags.tsx) - Optional
3. ✅ **Optimistische UI** (SavedFilterTags.tsx) - Alternative
4. ✅ **Sofortiges Rendering** (ReservationDetails.tsx) - **EINFACHSTE**

### Empfehlung
- **Lösung 1 + 4 kombinieren:** Skeleton-Loading für LCP-Element sofort rendern
- **Erwartete Verbesserung:** LCP 8.26s → ~0.1-0.3s

---

**Erstellt:** 2025-01-22  
**Status:** ✅ Analyse abgeschlossen  
**Nächste Aktion:** Skeleton-Loading implementieren (basierend auf ReservationDetails.tsx Pattern)

