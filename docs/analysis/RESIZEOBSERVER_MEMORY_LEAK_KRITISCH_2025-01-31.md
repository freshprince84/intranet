# ResizeObserver Memory-Leak: KRITISCH (2025-01-31)

**Datum:** 2025-01-31  
**Status:** 🔴🔴🔴 KRITISCH - Memory-Leak identifiziert  
**Problem:** 700MB RAM nach 2 Minuten bei nur 20 Requests geladen  
**Ursache:** ResizeObserver wird bei jedem Re-Render neu erstellt → Memory-Leak

---

## 🔴 PROBLEM IDENTIFIZIERT

### Memory-Snapshot zeigt:
- **ResizeObserver: 73,892 kB (60%)** - Größter Memory-Verbraucher!
- **V8ResizeObserverCallback: 62,326 kB (50%)** - Callbacks bleiben im Memory
- **Function: 64,774 kB (52%)** - Viele Funktionen im Memory

**Das erklärt die 700MB RAM nach nur 2 Minuten!**

---

## 🔍 ROOT CAUSE ANALYSE

### Problem 1: SavedFilterTags.tsx - ResizeObserver wird bei jedem Re-Render neu erstellt

**Code:**
```typescript
// Zeile 555-639: calculateVisibleTags hat 6 Dependencies
const calculateVisibleTags = useCallback(() => {
  // ... Berechnungslogik
}, [sortedFilters, averageTagWidth, containerWidth, isMeasuring, measuredTagWidths, getAvailableWidth]);

// Zeile 642-650: handleResize hat calculateVisibleTags als Dependency
const handleResize = useCallback(() => {
  resizeTimeoutRef.current = setTimeout(() => {
    calculateVisibleTags();
  }, 100);
}, [calculateVisibleTags]); // ← PROBLEM: calculateVisibleTags ändert sich häufig!

// Zeile 653-692: useEffect hat handleResize als Dependency
useEffect(() => {
  const resizeObserver = new ResizeObserver(handleResize); // ← NEUER Observer bei jeder Änderung!
  resizeObserver.observe(container);
  
  return () => {
    resizeObserver.disconnect(); // ← Alter Observer wird disconnected
  };
}, [handleResize]); // ← PROBLEM: handleResize ändert sich bei jeder calculateVisibleTags-Änderung!
```

**Was passiert:**
1. `sortedFilters` ändert sich (z.B. Filter wird geladen)
2. `calculateVisibleTags` wird neu erstellt (neue Funktion)
3. `handleResize` wird neu erstellt (neue Funktion)
4. `useEffect` läuft erneut (wegen `handleResize` Dependency)
5. **NEUER ResizeObserver wird erstellt** (Zeile 673)
6. Alter ResizeObserver wird disconnected (Zeile 685)
7. **ABER:** Die Callbacks (`handleResize`, `calculateVisibleTags`) bleiben im Memory!
8. **Memory-Leak:** Alte Callbacks werden nie gelöscht

**Nach 2 Minuten:**
- Potentiell 20-50+ ResizeObserver-Instanzen erstellt
- Jeder Observer: ~1-2MB Memory (Callback + DOM-Referenzen)
- **Gesamt: 20-100MB nur für ResizeObserver!**

---

### Problem 2: ConsultationTracker.tsx - Gleiches Problem

**Code:**
```typescript
// Zeile 327-351: calculateVisibleTags hat 3 Dependencies
const calculateVisibleTags = useCallback(() => {
  // ... Berechnungslogik
}, [recentClients, averageTagWidth, containerWidth]);

// Zeile 354-362: handleResize hat calculateVisibleTags als Dependency
const handleResize = useCallback(() => {
  resizeTimeoutRef.current = setTimeout(() => {
    calculateVisibleTags();
  }, 150);
}, [calculateVisibleTags]); // ← PROBLEM!

// Zeile 365-381: useEffect hat handleResize als Dependency
useEffect(() => {
  const resizeObserver = new ResizeObserver(handleResize); // ← NEUER Observer!
  resizeObserver.observe(containerRef.current);
  
  return () => {
    resizeObserver.disconnect();
  };
}, [handleResize]); // ← PROBLEM!
```

**Gleiches Problem wie SavedFilterTags.tsx!**

---

## 📊 BEWEIS AUS MEMORY-SNAPSHOT

**Top Memory Contributors:**
1. **ResizeObserver: 73,892 kB (60%)** - Hauptverursacher
2. **V8ResizeObserverCallback: 62,326 kB (50%)** - Callbacks bleiben im Memory
3. **Function: 64,774 kB (52%)** - Viele Funktionen (Callbacks)
4. **system / Context: 61,635 kB (50%)** - V8 Context behält alte Callbacks

**Das erklärt:**
- Warum RAM so schnell wächst (neue Observer bei jedem Re-Render)
- Warum 700MB nach nur 2 Minuten (viele Observer-Instanzen)
- Warum Memory größer als DB (Observer + Callbacks + DOM-Referenzen)

---

## ✅ LÖSUNG

### Lösung: useRef für handleResize verwenden

**Strategie:**
- ResizeObserver nur EINMAL erstellen (nicht bei jedem Re-Render)
- `handleResize` über useRef aufrufen (verhindert Re-Erstellung)
- `calculateVisibleTags` über useRef aufrufen (verhindert Re-Erstellung)

**Code-Änderung für SavedFilterTags.tsx:**

```typescript
// ✅ FIX: useRef für handleResize (verhindert Re-Erstellung)
const handleResizeRef = useRef<() => void>();

// ✅ FIX: Aktualisiere Ref wenn calculateVisibleTags sich ändert
useEffect(() => {
  handleResizeRef.current = () => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    resizeTimeoutRef.current = setTimeout(() => {
      calculateVisibleTags();
    }, 100);
  };
}, [calculateVisibleTags]);

// ✅ FIX: ResizeObserver nur EINMAL erstellen (keine Dependencies!)
useEffect(() => {
  if (!containerRef.current) return;

  const container = containerRef.current;
  const parentElement = container.parentElement;
  
  // ... grandParentRef Logik ...

  // ✅ FIX: Verwende Ref statt direkter Funktion
  const resizeObserver = new ResizeObserver(() => {
    handleResizeRef.current?.(); // ← Ruft aktuelle Funktion auf
  });
  resizeObserver.observe(container);
  
  if (grandParentRef.current) {
    resizeObserver.observe(grandParentRef.current);
  }
  
  window.addEventListener('resize', () => {
    handleResizeRef.current?.();
  });

  return () => {
    resizeObserver.disconnect();
    window.removeEventListener('resize', () => {
      handleResizeRef.current?.();
    });
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    grandParentRef.current = null;
  };
}, []); // ← KEINE Dependencies! Observer wird nur EINMAL erstellt
```

**Gleiche Änderung für ConsultationTracker.tsx!**

---

## 📊 ERWARTETE VERBESSERUNG

### Vorher:
- **ResizeObserver:** 73,892 kB (60%)
- **V8ResizeObserverCallback:** 62,326 kB (50%)
- **Nach 2 Minuten:** 20-50+ Observer-Instanzen
- **Memory-Verbrauch:** 700MB+

### Nachher:
- **ResizeObserver:** ~1-2MB (nur 1-2 Instanzen)
- **V8ResizeObserverCallback:** ~1-2MB (nur aktuelle Callbacks)
- **Nach 2 Minuten:** 1-2 Observer-Instanzen (stabil)
- **Memory-Verbrauch:** ~200-400MB (50-70% Reduktion!)

---

## 🎯 PRIORITÄT

**🔴🔴🔴 KRITISCH - SOFORT BEHEBEN!**

Dies ist der Hauptverursacher für den hohen RAM-Verbrauch!

---

**Erstellt:** 2025-01-31  
**Status:** 🔴🔴🔴 KRITISCH - Memory-Leak identifiziert  
**Nächster Schritt:** Fix implementieren (useRef Pattern)
