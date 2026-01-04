# Memory Leak Fix: fetchRequests Dependency

**Datum:** 2025-12-11
**Status:** ✅ Implementiert (teilweise wirksam)
**Priorität:** 🔴 KRITISCH

---

## Problem

Das Frontend verbrauchte bis zu **1.6 GB RAM** nach mehrfachem Filtern. Heap-Snapshot zeigte:
- 3,184 Detached `<div>`
- 2,524 Detached `<span>`
- 1,077 Detached SVGSVGElement
- 1,077 Detached SVGPathElement

---

## Ursache

**Datei:** `frontend/src/components/Requests.tsx`

```typescript
// ❌ PROBLEM: filterLogicalOperators als Dependency
const fetchRequests = useCallback(async (...) => {
  // ...
  operators: filterLogicalOperators  // Liest State direkt!
  // ...
}, [filterLogicalOperators]);  // Bei jeder Änderung neu erstellt!
```

**Kaskadeneffekt:**
1. User ändert Filter → `filterLogicalOperators` ändert sich
2. `fetchRequests` wird neu erstellt (wegen Dependency)
3. `applyFilterConditions` wird neu erstellt (hat `fetchRequests` als Dep)
4. Der IntersectionObserver-useEffect wird neu ausgeführt
5. Neuer Observer wird erstellt → alter bleibt referenziert
6. DOM-Elemente bleiben detached im Memory

---

## Lösung

### 1. operators als Parameter statt State-Read

```typescript
// ✅ FIX: operators als Parameter
const fetchRequests = useCallback(async (
  filterId?: number, 
  filterConditions?: any[], 
  append = false,
  limit = 20,
  offset = 0,
  operators?: ('AND' | 'OR')[]  // ✅ NEU: Parameter
) => {
  // ...
  operators: operators || []  // ✅ Parameter statt State
  // ...
}, []);  // ✅ Keine Dependencies mehr!
```

### 2. Ref für IntersectionObserver

```typescript
// ✅ Ref für aktuelle Operatoren
const filterLogicalOperatorsRef = useRef(filterLogicalOperators);
useEffect(() => {
  filterLogicalOperatorsRef.current = filterLogicalOperators;
}, [filterLogicalOperators]);

// Im IntersectionObserver:
fetchRequests(
  // ...
  filterLogicalOperatorsRef.current  // ✅ Aus Ref, nicht State
);
```

---

## Verbleibende Memory-Probleme

Der Fix reduziert das Memory-Leak bei Filter-Änderungen, aber **~1 GB RAM** bleibt ein Problem.

### Mögliche weitere Ursachen:
1. **Bilder-Cache** - Lazy Loading implementiert, aber große Bilder bleiben im Cache
2. **DOM-Elemente** - Viele Request-Karten mit Icons (SVGs)
3. **React DevTools** - Im Entwicklungsmodus zusätzlicher Overhead
4. **Andere Polling-Callbacks** - Weitere useCallback/useEffect mit State-Dependencies

### Empfohlene weitere Maßnahmen:
1. React DevTools Profiler verwenden
2. Heap-Snapshot-Analyse auf spezifische Objekte
3. MAX_REQUESTS weiter reduzieren (aktuell 200)
4. Virtualisierung für lange Listen (react-window)

---

## Commits

- `36f5500` - Memory-Leak-Fix: fetchRequests operators als Parameter statt Dependency

---

## Verwandte Dokumentation

- `docs/technical/FILTER_OR_OPERATOR_FIX_2025-12-11.md` - Filter ODER-Fix
- `docs/technical/PERFORMANCE_ANALYSE_VOLLSTAENDIG.md` - Performance-Übersicht

















