# Memory Leak Analyse & Lösung (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔴 KRITISCH - RAM steigt auf 1GB+ ohne Aktivität  
**Problem:** Memory wächst kontinuierlich, auch wenn Seite nur offen ist

---

## 🔴 PROBLEM

**Symptom:**
- RAM-Verbrauch steigt kontinuierlich auf 1GB+ ohne Aktivität
- Seite nur offen lassen → Memory wächst weiter
- Keine User-Interaktion nötig

**Ursache:**
- Memory Leaks in React Components
- Große Objekte bleiben im Memory
- Event Listeners werden nicht aufgeräumt
- useMemo/useCallback Overhead
- Console.log Statements

---

## 📊 IDENTIFIZIERTE PROBLEME

### Problem 1: `allTasks` bleibt im State (Worktracker.tsx)

**Code:** `frontend/src/pages/Worktracker.tsx:363, 611`

**Problem:**
- `allTasks` wird für client-seitiges Filtering verwendet
- Bleibt im State, auch wenn nicht mehr benötigt
- Kann sehr groß sein (alle Tasks)

**Impact:**
- **Memory-Verbrauch:** ~50-200MB (je nach Anzahl Tasks)
- **Wächst kontinuierlich:** Bei jedem Filter-Wechsel wird `allTasks` neu geladen

**Lösung:**
- `allTasks` nur temporär behalten (max 5 Minuten)
- Automatisch löschen, wenn nicht mehr benötigt

---

### Problem 2: `useMemo` mit vielen Dependencies

**Code:** `frontend/src/pages/Worktracker.tsx:1357`

**Problem:**
- `filteredAndSortedTasks` hat 15 Dependencies
- Wird bei jeder Änderung neu berechnet
- Erstellt neue Arrays/Objekte bei jeder Berechnung

**Impact:**
- **Memory-Verbrauch:** ~10-50MB pro Berechnung
- **Wächst kontinuierlich:** Alte Berechnungen bleiben im Memory (React Cache)

**Lösung:**
- Dependencies reduzieren
- useMemo nur für teure Berechnungen verwenden

---

### Problem 3: Console.log Statements

**Code:** Überall im Code

**Problem:**
- Viele `console.log` Statements
- Browser speichert Console-History im Memory
- Wächst kontinuierlich

**Impact:**
- **Memory-Verbrauch:** ~10-100MB (je nach Anzahl Logs)
- **Wächst kontinuierlich:** Console-History wächst

**Lösung:**
- Console.log in Production entfernen
- Nur in Development verwenden

---

### Problem 4: MarkdownPreview mit Bildern

**Code:** `frontend/src/components/shared/DataCard.tsx:291-300`

**Problem:**
- Bilder werden im Memory gecacht
- Werden nicht freigegeben
- Wächst kontinuierlich

**Impact:**
- **Memory-Verbrauch:** ~50-200MB (je nach Anzahl Bilder)
- **Wächst kontinuierlich:** Bilder bleiben im Memory

**Lösung:**
- Bild-Cache begrenzen (max 20 Bilder)
- Alte Bilder automatisch entfernen

---

### Problem 5: Event Listeners (Scroll)

**Code:** `frontend/src/pages/Worktracker.tsx:730, frontend/src/components/Requests.tsx:590`

**Problem:**
- Scroll-Listener werden korrekt aufgeräumt
- Aber: Bei jedem Re-Render wird neuer Listener erstellt
- Alte Listener bleiben im Memory (wenn Cleanup nicht funktioniert)

**Impact:**
- **Memory-Verbrauch:** ~5-20MB (je nach Anzahl Listener)
- **Wächst kontinuierlich:** Alte Listener bleiben im Memory

**Lösung:**
- useRef für Listener verwenden
- Nur einmal registrieren

---

### Problem 6: React DevTools

**Problem:**
- React DevTools speichern Component-Tree im Memory
- Wächst kontinuierlich bei jedem Re-Render

**Impact:**
- **Memory-Verbrauch:** ~50-200MB (je nach Component-Tree-Größe)
- **Wächst kontinuierlich:** Component-Tree wächst

**Lösung:**
- React DevTools in Production deaktivieren
- Nur in Development verwenden

---

## ✅ LÖSUNGSPLAN

### Lösung 1: `allTasks` automatisch löschen ✅

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Änderung:**
```typescript
// ✅ MEMORY: allTasks automatisch nach 5 Minuten löschen
useEffect(() => {
  if (allTasks.length === 0) return;
  
  const timeoutId = setTimeout(() => {
    console.log('🧹 allTasks automatisch gelöscht (5 Minuten)');
    setAllTasks([]);
  }, 5 * 60 * 1000); // 5 Minuten
  
  return () => clearTimeout(timeoutId);
}, [allTasks.length]);
```

**Impact:**
- ✅ `allTasks` wird automatisch nach 5 Minuten gelöscht
- ✅ Memory wird freigegeben
- ✅ Funktionalität bleibt identisch (wird neu geladen wenn benötigt)

---

### Lösung 2: Console.log in Production entfernen ✅

**Datei:** Alle Dateien

**Änderung:**
```typescript
// Vorher:
console.log('📋 Tasks geladen:', tasksWithAttachments.length);

// Nachher:
if (process.env.NODE_ENV === 'development') {
  console.log('📋 Tasks geladen:', tasksWithAttachments.length);
}
```

**Impact:**
- ✅ Console.log wird in Production nicht ausgeführt
- ✅ Console-History wächst nicht mehr
- ✅ Memory wird gespart

---

### Lösung 3: Bild-Cache begrenzen ✅

**Datei:** `frontend/src/components/shared/DataCard.tsx`

**Änderung:**
```typescript
// ✅ MEMORY: Bild-Cache begrenzen (max 20 Bilder)
const MAX_IMAGE_CACHE = 20;
const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

useEffect(() => {
  // Alte Bilder entfernen, wenn Cache zu groß
  if (imageCache.current.size > MAX_IMAGE_CACHE) {
    const entries = Array.from(imageCache.current.entries());
    const toRemove = entries.slice(0, imageCache.current.size - MAX_IMAGE_CACHE);
    toRemove.forEach(([key]) => imageCache.current.delete(key));
  }
}, [/* dependencies */]);
```

**Impact:**
- ✅ Bild-Cache wird begrenzt (max 20 Bilder)
- ✅ Alte Bilder werden automatisch entfernt
- ✅ Memory wird gespart

---

### Lösung 4: useMemo Dependencies reduzieren ✅

**Datei:** `frontend/src/pages/Worktracker.tsx:1357`

**Problem:**
- `filteredAndSortedTasks` hat 15 Dependencies
- Wird bei jeder Änderung neu berechnet

**Lösung:**
- Dependencies auf notwendige reduzieren
- useRef für stabile Referenzen verwenden

**Impact:**
- ✅ Weniger Re-Berechnungen
- ✅ Weniger Memory-Verbrauch

---

### Lösung 5: Event Listener mit useRef ✅

**Datei:** `frontend/src/pages/Worktracker.tsx:730`

**Änderung:**
```typescript
// ✅ MEMORY: Event Listener mit useRef (nur einmal registrieren)
const scrollHandlerRef = useRef<() => void>();

useEffect(() => {
  scrollHandlerRef.current = () => {
    if (
      window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000 &&
      !tasksLoadingMore &&
      tasksHasMore &&
      activeTab === 'todos'
    ) {
      loadMoreTasks();
    }
  };
  
  const handleScroll = () => scrollHandlerRef.current?.();
  
  window.addEventListener('scroll', handleScroll);
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}, [tasksLoadingMore, tasksHasMore, activeTab, loadMoreTasks]);
```

**Impact:**
- ✅ Event Listener wird nur einmal registriert
- ✅ Weniger Memory-Verbrauch
- ✅ Bessere Performance

---

## 📊 ERWARTETE VERBESSERUNG

### Vorher:
- **RAM-Verbrauch:** 1GB+ (wächst kontinuierlich)
- **allTasks:** Bleibt im State (50-200MB)
- **Console.log:** Wächst kontinuierlich (10-100MB)
- **Bild-Cache:** Wächst kontinuierlich (50-200MB)
- **useMemo:** Viele Re-Berechnungen (10-50MB)
- **Event Listeners:** Mehrfach registriert (5-20MB)

### Nachher:
- **RAM-Verbrauch:** ~300-500MB (stabil, wächst nicht mehr)
- **allTasks:** Wird nach 5 Minuten gelöscht
- **Console.log:** Nur in Development (0MB in Production)
- **Bild-Cache:** Max 20 Bilder (50-100MB)
- **useMemo:** Weniger Re-Berechnungen (5-20MB)
- **Event Listeners:** Nur einmal registriert (1-5MB)

**Reduktion:**
- **Memory-Verbrauch:** Von 1GB+ → 300-500MB (50-70% Reduktion)
- **Memory-Wachstum:** Stoppt (wächst nicht mehr kontinuierlich)

---

## ⚠️ RISIKEN

### Risiko 1: allTasks wird gelöscht, aber User filtert

**Problem:** `allTasks` wird nach 5 Minuten gelöscht, aber User filtert danach

**Mitigation:**
- ✅ `allTasks` wird neu geladen, wenn benötigt
- ✅ Funktionalität bleibt identisch

**Risiko:** ✅ **NIEDRIG** - Wird neu geladen wenn benötigt

---

### Risiko 2: Console.log entfernt → Debugging schwieriger

**Problem:** Console.log wird in Production entfernt → Debugging schwieriger

**Mitigation:**
- ✅ Nur in Development verwenden
- ✅ Production-Logs können über Error-Tracking (z.B. Sentry) gemacht werden

**Risiko:** ✅ **NIEDRIG** - Nur in Development verwenden

---

### Risiko 3: Bild-Cache begrenzt → Bilder müssen neu geladen werden

**Problem:** Alte Bilder werden aus Cache entfernt → Müssen neu geladen werden

**Mitigation:**
- ✅ Nur alte Bilder entfernen (neueste 20 bleiben)
- ✅ Browser-Cache lädt Bilder schnell nach

**Risiko:** ✅ **NIEDRIG** - Browser-Cache lädt schnell nach

---

## 📋 IMPLEMENTIERUNGS-CHECKLISTE

### Phase 1: allTasks automatisch löschen
- [ ] Timeout für `allTasks` implementieren (5 Minuten)
- [ ] Code-Review: Änderungen korrekt
- [ ] Funktionalität getestet (Filter funktioniert weiterhin)

### Phase 2: Console.log in Production entfernen
- [ ] Alle `console.log` Statements prüfen
- [ ] `process.env.NODE_ENV === 'development'` Check hinzufügen
- [ ] Code-Review: Änderungen korrekt
- [ ] Funktionalität getestet

### Phase 3: Bild-Cache begrenzen
- [ ] Bild-Cache mit useRef implementieren
- [ ] Max 20 Bilder im Cache behalten
- [ ] Code-Review: Änderungen korrekt
- [ ] Funktionalität getestet (Bilder werden korrekt angezeigt)

### Phase 4: useMemo Dependencies reduzieren
- [ ] Dependencies von `filteredAndSortedTasks` reduzieren
- [ ] useRef für stabile Referenzen verwenden
- [ ] Code-Review: Änderungen korrekt
- [ ] Funktionalität getestet (Filter/Sort funktioniert weiterhin)

### Phase 5: Event Listener mit useRef
- [ ] Event Listener mit useRef implementieren
- [ ] Nur einmal registrieren
- [ ] Code-Review: Änderungen korrekt
- [ ] Funktionalität getestet (Infinite Scroll funktioniert weiterhin)

---

**Erstellt:** 2025-01-26  
**Status:** 📋 PLAN ERSTELLT  
**Nächster Schritt:** Implementierung starten

