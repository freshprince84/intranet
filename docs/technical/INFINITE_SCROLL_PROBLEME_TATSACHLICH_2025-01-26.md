# Infinite Scroll - TATSÄCHLICHE PROBLEME (2025-01-26)

**Datum:** 2025-01-26  
**Status:** ❌ INFINITE SCROLL FUNKTIONIERT NIRGENDWO  
**Grund:** Mehrere kritische Bugs im Code

---

## 🔴 KRITISCHE PROBLEME

### Problem 1: fetchRequests/loadTasks sind NICHT stabil (Requests & Tasks)

**Requests.tsx:**
- `fetchRequests` wird als normale Funktion definiert (Zeile 367-461)
- `loadMoreRequests` verwendet `fetchRequests` in Dependencies (Zeile 484)
- **PROBLEM:** `fetchRequests` wird bei JEDEM Render neu erstellt → `loadMoreRequests` wird bei JEDEM Render neu erstellt → Scroll-Handler wird bei JEDEM Render neu registriert → Memory-Leak + funktioniert nicht!

**Worktracker.tsx:**
- `loadTasks` wird als normale Funktion definiert (Zeile 581-685)
- `loadMoreTasks` verwendet `loadTasks` in Dependencies (Zeile 700)
- **PROBLEM:** `loadTasks` wird bei JEDEM Render neu erstellt → `loadMoreTasks` wird bei JEDEM Render neu erstellt → Scroll-Handler wird bei JEDEM Render neu registriert → Memory-Leak + funktioniert nicht!

**Lösung:**
- `fetchRequests` und `loadTasks` müssen `useCallback` verwenden
- Oder: Aus Dependencies entfernen und stattdessen `useRef` verwenden

### Problem 2: Scroll-Handler verwendet falsche Höhen-Berechnung

**Requests.tsx (Zeile 589-590):**
```typescript
window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000
```

**Worktracker.tsx (Zeile 768):**
```typescript
window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000
```

**PROBLEM:**
- `document.documentElement.offsetHeight` ist die Höhe des gesamten Dokuments
- Bei scrollbaren Containern (nicht `window`) funktioniert das NICHT
- Die Seite könnte einen scrollbaren Container haben, nicht `window`

**Lösung:**
- Intersection Observer API verwenden
- Oder: Container-spezifische Scroll-Erkennung

### Problem 3: Requests lädt nur 5 Requests initial (falsche Implementierung)

**Requests.tsx (Zeile 607-653):**
- `fetchFirst5Requests` lädt nur 5 Requests
- Dann lädt ein anderer useEffect Requests 6-20 im Hintergrund (Zeile 656-664)
- **PROBLEM:** Das ist KEIN Infinite Scroll, sondern eine komplizierte 2-Phasen-Ladung
- Infinite Scroll sollte mit 20 Requests starten, nicht 5!

**Lösung:**
- `fetchFirst5Requests` entfernen
- Initial mit `fetchRequests(undefined, undefined, false, 1, false)` laden (20 Requests)

### Problem 4: Duplikate useEffect für loadTasks

**Worktracker.tsx:**
- `loadTasks()` wird in ZWEI verschiedenen useEffect aufgerufen:
  - Zeile 817-822: `useEffect(() => { loadTasks(); }, [])`
  - Zeile 844-849: `useEffect(() => { loadTasks(); }, [])`
- **PROBLEM:** Tasks werden doppelt geladen!

**Lösung:**
- Einen useEffect entfernen

### Problem 5: hasMore Logik ist falsch

**Requests.tsx (Zeile 432, 636):**
```typescript
setRequestsHasMore(requestsWithAttachments.length === REQUESTS_PER_PAGE);
setRequestsHasMore(requestsWithAttachments.length === 5); // Bei fetchFirst5Requests
```

**Worktracker.tsx (Zeile 659, 668):**
```typescript
setTasksHasMore(tasksWithAttachments.length === TASKS_PER_PAGE);
```

**PROBLEM:**
- Wenn genau 20 (oder 5) zurückkommen, wird `hasMore=true` gesetzt
- ABER: Es könnte keine weiteren geben!
- Backend gibt kein `total` zurück → Frontend kann nicht wissen ob es weitere gibt

**Lösung:**
- Backend sollte `total` Count zurückgeben
- Frontend: `hasMore = (offset + results.length) < total`

### Problem 6: Scroll-Handler wird bei jedem Render neu registriert

**Requests.tsx (Zeile 586-604):**
```typescript
useEffect(() => {
  scrollHandlerRef.current = () => { ... };
  const handleScroll = () => scrollHandlerRef.current?.();
  window.addEventListener('scroll', handleScroll);
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}, [requestsLoadingMore, requestsHasMore, loadMoreRequests]);
```

**PROBLEM:**
- Dependencies enthalten `loadMoreRequests`
- `loadMoreRequests` wird bei jedem Render neu erstellt (wegen `fetchRequests`)
- → useEffect läuft bei jedem Render → Event-Listener wird ständig entfernt/neu hinzugefügt → funktioniert nicht!

**Lösung:**
- `loadMoreRequests` aus Dependencies entfernen
- Stattdessen `useRef` für `loadMoreRequests` verwenden

---

## 📋 BEHEBUNGSPLAN

### Schritt 1: fetchRequests/loadTasks stabilisieren

**Requests.tsx:**
- `fetchRequests` in `useCallback` wrappen
- Oder: `fetchRequests` aus Dependencies von `loadMoreRequests` entfernen und `useRef` verwenden

**Worktracker.tsx:**
- `loadTasks` in `useCallback` wrappen
- Oder: `loadTasks` aus Dependencies von `loadMoreTasks` entfernen und `useRef` verwenden

### Schritt 2: Scroll-Handler reparieren

**Option A: Intersection Observer (EMPFOHLEN)**
- "Load More" Element am Ende der Liste
- Intersection Observer beobachtet dieses Element
- Wenn sichtbar → `loadMore` aufrufen

**Option B: Container-spezifischer Scroll-Handler**
- Scroll-Container identifizieren
- Event-Listener auf Container statt `window` registrieren

### Schritt 3: fetchFirst5Requests entfernen

**Requests.tsx:**
- `fetchFirst5Requests` useEffect entfernen (Zeile 607-653)
- Initial mit normalem `fetchRequests` laden (20 Requests)

### Schritt 4: Duplikate entfernen

**Worktracker.tsx:**
- Einen der beiden `loadTasks()` useEffect entfernen (Zeile 817-822 oder 844-849)

### Schritt 5: hasMore Logik korrigieren

**Backend:**
- `total` Count zurückgeben in Response

**Frontend:**
- `hasMore = (offset + results.length) < total`

---

## 🎯 PRIORITÄTEN

1. **KRITISCH:** fetchRequests/loadTasks stabilisieren (funktioniert sonst gar nicht)
2. **KRITISCH:** Scroll-Handler reparieren (funktioniert sonst gar nicht)
3. **HOCH:** fetchFirst5Requests entfernen (falsche Implementierung)
4. **HOCH:** Duplikate entfernen (doppeltes Laden)
5. **MITTEL:** hasMore Logik korrigieren (Korrektheit)

---

**Erstellt:** 2025-01-26  
**Status:** ❌ INFINITE SCROLL FUNKTIONIERT NIRGENDWO - KRITISCHE BUGS IDENTIFIZIERT

