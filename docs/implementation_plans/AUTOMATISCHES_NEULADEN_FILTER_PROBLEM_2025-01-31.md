# Automatisches Neuladen - Filter-Problem

**Erstellt:** 2025-01-31  
**Status:** 🔴 KRITISCH - Übersehenes Problem  
**Problem:** Filter laden auch automatisch neu und verschwinden teilweise

---

## 🔴 IDENTIFIZIERTES PROBLEM

### Problem 1: Filter werden automatisch neu geladen

**Stellen:**
1. **Requests.tsx** (Zeile 543-546)
   ```typescript
   useEffect(() => {
     filterContext.loadFilters(REQUESTS_TABLE_ID);
   }, [filterContext]); // ← PROBLEM: filterContext ändert sich bei jedem Render!
   ```

2. **SavedFilterTags.tsx** (Zeile 218-225)
   ```typescript
   useEffect(() => {
     filterContext.loadFilters(tableId);
   }, [tableId, filterContext]); // ← PROBLEM: filterContext ändert sich bei jedem Render!
   ```

**Was passiert:**
1. Polling-Intervalle lösen State-Updates aus
2. State-Update → FilterContext rendert neu
3. `value` in FilterContext wird neu erstellt (useMemo mit Dependencies)
4. `filterContext` ändert sich → useEffect triggert
5. **Filter werden neu geladen** → Endlosschleife!

**Root Cause:**
- `value` in FilterContext.tsx (Zeile 312-323) hat viele Dependencies
- `filters`, `filterGroups`, `loading`, `errors` ändern sich bei jedem Render
- `loadFilters`, `refreshFilters`, etc. sind useCallback, aber haben Dependencies
- `getFilters`, `getFilterGroups` haben `[filters]`, `[filterGroups]` als Dependencies

---

### Problem 2: Filter verschwinden nach 10 Minuten

**Stelle:** `FilterContext.tsx` (Zeile 151-237, 240-249)

**Was passiert:**
1. `cleanupOldFilters` läuft alle 5 Minuten
2. Filter mit TTL > 10 Minuten werden gelöscht
3. Filter verschwinden aus dem State
4. User sieht keine Filter mehr

**Code:**
```typescript
const FILTER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 Minuten

const cleanupOldFilters = useCallback(() => {
  // Finde Tabellen, deren TTL abgelaufen ist
  Object.entries(filterCacheTimestamps.current).forEach(([tableId, timestamp]) => {
    if (now - timestamp > FILTER_CACHE_TTL_MS) {
      tablesToCleanup.push(tableId);
    }
  });
  
  // Lösche alte Filter-Arrays
  if (tablesToCleanup.length > 0) {
    setFilters(prev => {
      const newFilters = { ...prev };
      tablesToCleanup.forEach(tableId => {
        delete newFilters[tableId]; // ← Filter verschwinden!
      });
      return newFilters;
    });
  }
}, []);

useEffect(() => {
  const cleanupInterval = setInterval(() => {
    cleanupOldFilters();
  }, 5 * 60 * 1000); // 5 Minuten
  return () => clearInterval(cleanupInterval);
}, [cleanupOldFilters]);
```

**Problem:**
- Filter werden nach 10 Minuten gelöscht, auch wenn User sie noch verwendet
- User sieht plötzlich keine Filter mehr
- Filter müssen neu geladen werden

---

## 📊 ANALYSE

### Warum ändert sich `filterContext` bei jedem Render?

**FilterContext.tsx (Zeile 312-323):**
```typescript
const value = useMemo<FilterContextType>(() => ({
  filters,
  filterGroups,
  loading,
  errors,
  loadFilters,
  refreshFilters,
  getFilters,
  getFilterGroups,
  isLoading,
  getError
}), [filters, filterGroups, loading, errors, loadFilters, refreshFilters, getFilters, getFilterGroups, isLoading, getError]);
```

**Problem:**
- `filters`, `filterGroups`, `loading`, `errors` sind State → ändern sich bei jedem Update
- `getFilters` hat `[filters]` als Dependency → wird neu erstellt wenn `filters` sich ändert
- `getFilterGroups` hat `[filterGroups]` als Dependency → wird neu erstellt wenn `filterGroups` sich ändert
- `isLoading` hat `[loading]` als Dependency → wird neu erstellt wenn `loading` sich ändert
- `getError` hat `[errors]` als Dependency → wird neu erstellt wenn `errors` sich ändert

**Resultat:**
- `value` wird bei jedem State-Update neu erstellt
- `filterContext` ändert sich → useEffect triggert → Filter werden neu geladen

---

## ✅ LÖSUNG

### Lösung 1: `filterContext` aus Dependencies entfernen

**Problem:** `filterContext` ändert sich bei jedem Render

**Lösung:** `loadFilters` direkt verwenden, nicht über `filterContext`

**Vorher:**
```typescript
useEffect(() => {
  filterContext.loadFilters(REQUESTS_TABLE_ID);
}, [filterContext]); // ← PROBLEM
```

**Nachher:**
```typescript
const { loadFilters } = useFilterContext();

useEffect(() => {
  loadFilters(REQUESTS_TABLE_ID);
}, [loadFilters]); // ← OK: loadFilters ist stabil (useCallback ohne Dependencies)
```

**Aber:** `loadFilters` ist bereits stabil (useCallback ohne Dependencies)!

**Besser:**
```typescript
const { loadFilters } = useFilterContext();

useEffect(() => {
  loadFilters(REQUESTS_TABLE_ID);
}, []); // ← ODER: Keine Dependencies, da loadFilters stabil ist
```

**Oder noch besser:**
```typescript
const filterContext = useFilterContext();
const loadFiltersForTable = filterContext.loadFilters;

useEffect(() => {
  loadFiltersForTable(REQUESTS_TABLE_ID);
}, []); // ← loadFilters ist stabil
```

---

### Lösung 2: FilterContext `value` stabilisieren

**Problem:** `value` wird bei jedem State-Update neu erstellt

**Lösung:** Helper-Funktionen stabilisieren (keine Dependencies)

**Vorher:**
```typescript
const getFilters = useCallback((tableId: string): SavedFilter[] => {
  return filters[tableId] || [];
}, [filters]); // ← PROBLEM: filters ändert sich
```

**Nachher:**
```typescript
const getFilters = useCallback((tableId: string): SavedFilter[] => {
  return filtersRef.current[tableId] || [];
}, []); // ← OK: verwendet Ref, keine Dependencies
```

**Aber:** Das ist bereits teilweise implementiert (filtersRef existiert)!

**Besser:** Helper-Funktionen sollten Refs verwenden statt State

---

### Lösung 3: Cleanup-Intervall anpassen oder deaktivieren

**Problem:** Filter verschwinden nach 10 Minuten

**Lösung 3a: TTL erhöhen**
```typescript
const FILTER_CACHE_TTL_MS = 60 * 60 * 1000; // 60 Minuten statt 10
```

**Lösung 3b: Cleanup nur für nicht-aktive Tabellen**
```typescript
// Nur Filter löschen, wenn Tabelle nicht mehr aktiv ist
// Prüfe ob tableId in aktiven Tabellen ist
```

**Lösung 3c: Cleanup deaktivieren**
```typescript
// Cleanup-Intervall entfernen
// Filter bleiben im Memory bis Seite neu geladen wird
```

**Empfehlung:** Lösung 3a (TTL erhöhen) oder 3b (nur nicht-aktive Tabellen)

---

## 📋 BETROFFENE STELLEN

### 1. Requests.tsx
- **Zeile 543-546:** `useEffect` mit `[filterContext]` Dependency
- **Fix:** `loadFilters` direkt verwenden, `filterContext` aus Dependencies entfernen

### 2. SavedFilterTags.tsx
- **Zeile 218-225:** `useEffect` mit `[tableId, filterContext]` Dependency
- **Fix:** `loadFilters` direkt verwenden, nur `tableId` in Dependencies

### 3. FilterContext.tsx
- **Zeile 293-309:** Helper-Funktionen mit State-Dependencies
- **Fix:** Helper-Funktionen sollten Refs verwenden
- **Zeile 312-323:** `value` useMemo mit vielen Dependencies
- **Fix:** Helper-Funktionen stabilisieren
- **Zeile 240-249:** Cleanup-Intervall
- **Fix:** TTL erhöhen oder nur nicht-aktive Tabellen löschen

---

## 🎯 INTEGRATION IN STANDARDISIERUNGSPLAN

### Phase 5: Filter-Problem beheben (NEU)

**Ziel:** Filter werden nicht mehr automatisch neu geladen und verschwinden nicht

**Schritte:**

1. **Requests.tsx & SavedFilterTags.tsx:**
   - `filterContext` aus Dependencies entfernen
   - `loadFilters` direkt verwenden

2. **FilterContext.tsx:**
   - Helper-Funktionen stabilisieren (Refs verwenden)
   - `value` useMemo optimieren

3. **Cleanup-Intervall:**
   - TTL erhöhen (10 → 60 Minuten)
   - Oder: Nur nicht-aktive Tabellen löschen

---

## ⚠️ RISIKEN

### Risiko 1: Helper-Funktionen verwenden veraltete Werte

**Risiko:** 🟡 **MITTEL**

**Was könnte passieren:**
- Helper-Funktionen verwenden Refs statt State
- Refs könnten veraltete Werte enthalten
- Filter werden nicht korrekt angezeigt

**Lösung:**
- Refs werden bei jedem State-Update aktualisiert (bereits implementiert)
- Helper-Funktionen sollten State verwenden, aber stabil sein

**Besser:**
```typescript
// Helper-Funktionen verwenden State, aber sind stabil
const getFilters = useCallback((tableId: string): SavedFilter[] => {
  return filters[tableId] || [];
}, [filters]); // ← OK: filters ist State, muss in Dependencies

// ABER: value useMemo sollte nicht bei jeder filters-Änderung neu erstellt werden
// Lösung: value sollte nur bei Bedarf neu erstellt werden
```

---

### Risiko 2: Cleanup löscht aktive Filter

**Risiko:** 🔴 **HOCH**

**Was könnte passieren:**
- User verwendet Filter auf einer Seite
- Cleanup läuft → Filter werden gelöscht (TTL abgelaufen)
- User sieht plötzlich keine Filter mehr

**Lösung:**
- TTL erhöhen (10 → 60 Minuten)
- Oder: Cleanup nur für nicht-aktive Tabellen
- Oder: Cleanup deaktivieren

---

## 📊 ZUSAMMENFASSUNG

### Probleme:
1. ✅ **Filter werden automatisch neu geladen** - `filterContext` ändert sich bei jedem Render
2. ✅ **Filter verschwinden nach 10 Minuten** - Cleanup-Intervall löscht Filter

### Lösungen:
1. ✅ **`filterContext` aus Dependencies entfernen** - `loadFilters` direkt verwenden
2. ✅ **Helper-Funktionen stabilisieren** - Refs verwenden oder State-Dependencies akzeptieren
3. ✅ **Cleanup-Intervall anpassen** - TTL erhöhen oder nur nicht-aktive Tabellen löschen

### Integration:
- ✅ **Phase 5 hinzufügen** - Filter-Problem beheben

---

**Erstellt:** 2025-01-31  
**Status:** 🔴 KRITISCH - Muss in Plan integriert werden  
**Nächste Aktion:** Plan aktualisieren mit Phase 5

