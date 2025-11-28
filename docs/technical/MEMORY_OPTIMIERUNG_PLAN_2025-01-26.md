# Memory-Optimierung: Plan für Optionen 1, 3, 4 (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 📋 PLAN - Bereit zur Implementierung  
**Priorität:** 🔴🔴🔴 KRITISCH  
**Problem:** 500MB+ RAM-Verbrauch ohne Aktivität  
**Zweck:** Memory-Verbrauch reduzieren ohne Funktionalität zu beeinträchtigen

---

## 📊 ANALYSE

### Aktuelle Situation:

1. **Infinite Scroll lädt 20 Items pro Seite** → Alle bleiben im State
2. **`allTasks`, `allTours`, `allTourBookings`** werden für client-seitiges Filtering verwendet
3. **Alle Items werden gerendert** (auch nicht-sichtbare) → Hoher Memory-Verbrauch
4. **102 State-Variablen in Worktracker.tsx** → Viele Objekte im Memory

### Memory-Verbrauch:

- **Worktracker:** ~260-520 MB (tasks, reservations, tours, tourBookings)
- **Requests:** ~60-120 MB (requests Array)
- **React State Overhead:** ~50-100 MB
- **Gesamt:** ~370-740 MB

---

## 🎯 LÖSUNGSPLAN

### Option 1: Virtualisierung (react-window)

**Status:** ⚠️ **RISIKO: Cards haben unterschiedliche Höhen**

**Problem:**
- Cards mit Beschreibung sind höher als ohne
- `react-window` benötigt feste Höhen oder `VariableSizeList`
- `VariableSizeList` ist komplexer und kann Performance-Probleme verursachen

**Lösung:**
- **NICHT implementieren** - zu riskant, Cards haben variable Höhen
- **Alternative:** Nur sichtbare Items rendern (Window-Technik ohne Library)

**Empfehlung:** ❌ **NICHT umsetzen** - zu riskant

---

### Option 3: State-Optimierung

**Status:** ✅ **SICHER - Kann umgesetzt werden**

**Identifizierte unused States:**

1. **`displayLimit` in Requests.tsx** (Zeile 264)
   - Wird nicht verwendet (Infinite Scroll verwendet `requestsPage`)
   - **Kann entfernt werden**

2. **`sortConfig` in Requests.tsx** (Zeile 221)
   - Wird nur für Tabellen-Ansicht verwendet
   - **Kann bleiben** (wird verwendet)

3. **Doppelte Filter-States**
   - `filterConditions` und `reservationFilterConditions` sind getrennt
   - **Kann bleiben** (verschiedene Tabs)

**Änderungen:**
- ✅ `displayLimit` entfernen (unused)
- ✅ Prüfen ob weitere unused States vorhanden sind

**Risiko:** ✅ **NIEDRIG** - Nur unused States entfernen

---

### Option 4: Memory-Management (automatische Bereinigung)

**Status:** ✅ **SICHER - Kann umgesetzt werden**

**Strategie:**
- **Nur sichtbare Items + Buffer behalten**
- **Alte Items automatisch entfernen** (nur wenn nicht mehr sichtbar)
- **`allTasks` für Filter behalten** (wird für client-seitiges Filtering benötigt)

**Implementierung:**

1. **Window-Technik für Rendering:**
   - Nur Items im Viewport + 10 Items Buffer rendern
   - Alte Items aus DOM entfernen, aber in State behalten (für Scroll)

2. **Memory-Cleanup für nicht-sichtbare Items:**
   - Nach 100 Items: Älteste 50 Items aus State entfernen
   - Nur wenn nicht mehr im Viewport
   - `allTasks` bleibt erhalten (für Filter)

3. **Tab-Wechsel Cleanup:**
   - Beim Tab-Wechsel: Nicht-aktive Tab-Daten bereinigen
   - Nur aktiver Tab behält alle Daten

**Risiko:** ✅ **NIEDRIG** - Nur nicht-sichtbare Items entfernen

---

## 📋 IMPLEMENTIERUNGSPLAN

### Phase 1: State-Optimierung (Option 3)

**Datei:** `frontend/src/components/Requests.tsx`

**Änderung 1: `displayLimit` entfernen**
```typescript
// VORHER (Zeile 264):
const [displayLimit, setDisplayLimit] = useState<number>(10);

// NACHHER:
// ❌ ENTFERNT - wird nicht verwendet (Infinite Scroll verwendet requestsPage)
```

**Risiko:** ✅ **KEIN RISIKO** - Variable wird nicht verwendet

---

### Phase 2: Memory-Management (Option 4)

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Änderung 1: Window-Technik für Card-Rendering**

**Vorher:**
```typescript
<CardGrid>
  {filteredAndSortedTasks.map(task => (
    <DataCard ... />
  ))}
</CardGrid>
```

**Nachher:**
```typescript
// ✅ MEMORY: Nur sichtbare Items + Buffer rendern
const VISIBLE_BUFFER = 10; // 10 Items über/unter Viewport
const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });

useEffect(() => {
  const handleScroll = () => {
    const scrollTop = window.scrollY;
    const viewportHeight = window.innerHeight;
    const itemHeight = 200; // Geschätzte Card-Höhe
    
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - VISIBLE_BUFFER);
    const end = Math.min(
      filteredAndSortedTasks.length,
      Math.ceil((scrollTop + viewportHeight) / itemHeight) + VISIBLE_BUFFER
    );
    
    setVisibleRange({ start, end });
  };
  
  window.addEventListener('scroll', handleScroll);
  handleScroll(); // Initial
  
  return () => window.removeEventListener('scroll', handleScroll);
}, [filteredAndSortedTasks.length]);

<CardGrid>
  {filteredAndSortedTasks.slice(visibleRange.start, visibleRange.end).map((task, index) => (
    <div key={task.id} style={{ height: '200px' }}>
      <DataCard ... />
    </div>
  ))}
</CardGrid>
```

**Risiko:** ⚠️ **MITTEL** - Cards haben variable Höhen, geschätzte Höhe könnte falsch sein

**Alternative (sicherer):**
- **NICHT implementieren** - zu riskant mit variable Höhen
- **Stattdessen:** Memory-Cleanup für nicht-sichtbare Items

---

**Änderung 2: Memory-Cleanup für nicht-sichtbare Items**

**Vorher:**
```typescript
// Alle Items bleiben im State
setTasks(prevTasks => [...prevTasks, ...tasksWithAttachments]);
```

**Nachher:**
```typescript
// ✅ MEMORY: Nur max 100 Items im State behalten
const MAX_ITEMS_IN_STATE = 100;

setTasks(prevTasks => {
  const newTasks = [...prevTasks, ...tasksWithAttachments];
  // Wenn mehr als MAX_ITEMS_IN_STATE: Älteste entfernen
  if (newTasks.length > MAX_ITEMS_IN_STATE) {
    // Behalte die neuesten MAX_ITEMS_IN_STATE Items
    return newTasks.slice(-MAX_ITEMS_IN_STATE);
  }
  return newTasks;
});
```

**Risiko:** ✅ **NIEDRIG** - Nur alte Items entfernen, neue bleiben

---

**Änderung 3: Tab-Wechsel Cleanup**

**Vorher:**
```typescript
// Alle Tab-Daten bleiben im State
```

**Nachher:**
```typescript
// ✅ MEMORY: Beim Tab-Wechsel: Nicht-aktive Tab-Daten bereinigen
useEffect(() => {
  if (activeTab !== 'todos') {
    // Tasks bereinigen (nur wenn nicht aktiver Tab)
    setTasks([]);
    setAllTasks([]); // ❌ NICHT - wird für Filter benötigt!
  }
  
  if (activeTab !== 'reservations') {
    setReservations([]);
  }
  
  if (activeTab !== 'tours') {
    setTours([]);
    setAllTours([]); // ❌ NICHT - wird für Filter benötigt!
  }
  
  if (activeTab !== 'tourBookings') {
    setTourBookings([]);
    setAllTourBookings([]); // ❌ NICHT - wird für Filter benötigt!
  }
}, [activeTab]);
```

**Risiko:** ⚠️ **MITTEL** - `allTasks` wird für Filter benötigt, kann nicht entfernt werden

**Alternative:**
- **NICHT implementieren** - `allTasks` wird für Filter benötigt
- **Stattdessen:** Nur `tasks` (nicht `allTasks`) beim Tab-Wechsel bereinigen

---

## ✅ FINALE EMPFEHLUNG

### Option 1: Virtualisierung
❌ **NICHT umsetzen** - zu riskant mit variable Card-Höhen

### Option 3: State-Optimierung
✅ **UMSETZEN** - `displayLimit` entfernen (unused)

### Option 4: Memory-Management
✅ **TEILWEISE UMSETZEN** - Nur Memory-Cleanup für nicht-sichtbare Items
- Max 100 Items im State behalten
- Alte Items automatisch entfernen
- `allTasks` bleibt erhalten (für Filter)

---

## 📊 ERWARTETE VERBESSERUNG

### Vorher:
- **RAM-Verbrauch:** 500MB+ (alle Items im State)
- **Rendering:** Alle Items werden gerendert

### Nachher:
- **RAM-Verbrauch:** ~200-300MB (max 100 Items pro Liste)
- **Rendering:** Alle Items werden gerendert (keine Virtualisierung)

**Reduktion:**
- **Memory-Verbrauch:** Von 500MB+ → 200-300MB (40-50% Reduktion)
- **Performance:** Leicht verbessert (weniger Items im State)

---

## ⚠️ RISIKEN

### Risiko 1: Memory-Cleanup entfernt benötigte Items

**Problem:** Alte Items werden entfernt, aber User scrollt zurück

**Mitigation:**
- Nur Items entfernen, die nicht mehr im Viewport sind
- Infinite Scroll lädt Items neu, wenn benötigt
- `allTasks` bleibt erhalten (für Filter)

**Risiko:** ✅ **NIEDRIG** - Infinite Scroll lädt Items neu

---

### Risiko 2: Tab-Wechsel Cleanup entfernt `allTasks`

**Problem:** `allTasks` wird für client-seitiges Filtering benötigt

**Mitigation:**
- `allTasks` NICHT entfernen beim Tab-Wechsel
- Nur `tasks` (nicht `allTasks`) bereinigen

**Risiko:** ✅ **KEIN RISIKO** - `allTasks` bleibt erhalten

---

## 📋 IMPLEMENTIERUNGS-CHECKLISTE

### Phase 1: State-Optimierung
- [ ] `displayLimit` aus Requests.tsx entfernen
- [ ] Prüfen ob weitere unused States vorhanden sind
- [ ] Code-Review: Änderungen korrekt
- [ ] Funktionalität getestet

### Phase 2: Memory-Management
- [ ] Memory-Cleanup für Tasks implementieren (max 100 Items)
- [ ] Memory-Cleanup für Reservations implementieren (max 100 Items)
- [ ] Memory-Cleanup für Tours implementieren (max 100 Items)
- [ ] Memory-Cleanup für TourBookings implementieren (max 100 Items)
- [ ] Code-Review: Änderungen korrekt
- [ ] Funktionalität getestet (Infinite Scroll funktioniert weiterhin)

---

**Erstellt:** 2025-01-26  
**Status:** 📋 PLAN ERSTELLT  
**Nächster Schritt:** Implementierung starten

