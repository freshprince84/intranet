# Filter-Load-Logik Fixes - Detaillierter Plan (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 📋 PLAN - Noch nicht umgesetzt  
**Zweck:** Alle identifizierten Inkonsistenzen und Probleme beheben

---

## 🔴 IDENTIFIZIERTE PROBLEME

### Problem 1: Requests - handleFilterChange ruft applyFilterConditions nicht auf
**Status:** ❌ Inkonsistent mit Todos/Reservations  
**Datei:** `frontend/src/components/Requests.tsx:706-728`

**Aktuell:**
- `handleFilterChange` lädt direkt über `fetchRequests`
- Ruft `applyFilterConditions` NICHT auf
- Inkonsistent mit Todos/Reservations

**Sollte sein:**
- Wenn `id` vorhanden → `fetchRequests(id, ...)`
- Wenn keine `id` → `applyFilterConditions(...)` (wie Todos/Reservations)

**Warum wichtig:**
- `applyFilterConditions` setzt zusätzlich `selectedFilterId = null` und `activeFilterName = ''`
- Konsistenz zwischen allen Komponenten
- Filter-Erweiterung über FilterPane funktioniert korrekt

---

### Problem 2: Todos - defaultFilterName ist inkonsistent
**Status:** ❌ Unterschiedliche Werte je nach View  
**Datei:** `frontend/src/pages/Worktracker.tsx:2379, 3736`

**Aktuell:**
- Table-View (Zeile 2379): `defaultFilterName={activeTab === 'todos' ? 'Aktuell' : 'Hoy'}`
- Card-View (Zeile 3736): `defaultFilterName={activeTab === 'todos' ? t('tasks.filters.current') : 'Hoy'}`

**Problem:**
- Unterschiedliche Werte je nach View
- `'Aktuell'` (hardcoded) vs. `t('tasks.filters.current')` (übersetzt)
- Kann zu unterschiedlichem Verhalten führen

**Lösung:**
- Einheitlich: `'Aktuell'` (hardcoded)
- Begründung: Filter in DB sind auch hardcodiert ("Aktuell"), nicht als Übersetzungsschlüssel

---

### Problem 3: filterApplied State - Redundant aber nützlich
**Status:** ⚠️ Nur in Requests vorhanden  
**Datei:** `frontend/src/components/Requests.tsx:219-220, 532-555`

**Aktuell:**
- `filterApplied` State wird überwacht
- Warnung nach 5 Sekunden, wenn kein Filter angewendet wurde (nur Development)

**Problem:**
- Redundant: `selectedFilterId !== null || filterConditions.length > 0` zeigt bereits, ob Filter aktiv ist
- Nur in Requests, nicht in Todos/Reservations (inkonsistent)

**Optionen:**
1. **Entfernen:** Einfacher, weniger Code
2. **Überall einführen:** Konsistent, aber mehr Code

**Empfehlung:** Entfernen (redundant, aber Warnung könnte nützlich sein - optional behalten)

---

### Problem 4: Filter-Namen in DB vs. defaultFilterName
**Status:** ⚠️ Inkonsistenz möglich  
**Datei:** `frontend/src/components/SavedFilterTags.tsx:266-275`

**Aktuell:**
- Filter in DB: Hardcodiert ("Aktuell", "Hoy")
- `defaultFilterName`: Manchmal hardcodiert ("Aktuell"), manchmal übersetzt (`t('tasks.filters.current')`)

**Problem:**
- Wenn `defaultFilterName = t('tasks.filters.current')` und Filter in DB heißt "Aktuell" → funktioniert (wegen alternativer Namen)
- Aber inkonsistent und verwirrend

**Lösung:**
- `defaultFilterName` sollte immer hardcodiert sein ("Aktuell", "Hoy")
- Begründung: Filter in DB sind auch hardcodiert

---

## 📋 DETAILLIERTER FIX-PLAN

### Phase 1: Konsistenz-Fixes (HÖCHSTE PRIORITÄT) 🔴

#### Schritt 1.1: Requests - handleFilterChange ruft applyFilterConditions auf

**Datei:** `frontend/src/components/Requests.tsx:706-728`

**Aktueller Code:**
```typescript
const handleFilterChange = async (name, id, conditions, operators, sortDirections) => {
  setActiveFilterName(name);
  setSelectedFilterId(id);
  setSortConfig({ key: 'dueDate', direction: 'asc' });
  
  setFilterConditions(conditions);
  setFilterLogicalOperators(operators);
  setFilterSortDirections(sortDirections);
  
  // ❌ PROBLEM: Lädt direkt, ruft applyFilterConditions nicht auf
  if (id) {
    await fetchRequests(id, undefined, false, 20, 0);
  } else if (conditions.length > 0) {
    await fetchRequests(undefined, conditions, false, 20, 0);
  } else {
    await fetchRequests(undefined, undefined, false, 20, 0);
  }
};
```

**Geänderter Code:**
```typescript
const handleFilterChange = async (name, id, conditions, operators, sortDirections) => {
  setActiveFilterName(name);
  setSelectedFilterId(id);
  setSortConfig({ key: 'dueDate', direction: 'asc' });
  
  // ✅ FIX: Wenn id gesetzt ist (gespeicherter Filter), lade mit id
  // ✅ Sonst: Verwende applyFilterConditions (setzt auch selectedFilterId = null, activeFilterName = '')
  if (id) {
    setFilterConditions(conditions);
    setFilterLogicalOperators(operators);
    if (sortDirections !== undefined) {
      const validSortDirections = Array.isArray(sortDirections) ? sortDirections : [];
      setFilterSortDirections(validSortDirections);
    }
    await fetchRequests(id, undefined, false, 20, 0);
  } else {
    // ✅ Direkte Bedingungen: applyFilterConditions lädt bereits und setzt State korrekt
    await applyFilterConditions(conditions, operators, sortDirections);
  }
};
```

**Begründung:**
- Konsistent mit Todos/Reservations
- `applyFilterConditions` setzt `selectedFilterId = null` und `activeFilterName = ''` korrekt
- Filter-Erweiterung über FilterPane funktioniert korrekt

**Test:**
- Gespeicherter Filter anwenden → `fetchRequests(id, ...)` wird aufgerufen ✅
- Filter erweitern über FilterPane → `applyFilterConditions` wird aufgerufen ✅
- State wird korrekt gesetzt (`selectedFilterId = null` wenn keine id) ✅

---

#### Schritt 1.2: Todos - defaultFilterName einheitlich machen

**Datei:** `frontend/src/pages/Worktracker.tsx:2379, 3736`

**Aktueller Code:**
```typescript
// Table-View (Zeile 2379)
defaultFilterName={activeTab === 'todos' ? 'Aktuell' : 'Hoy'}

// Card-View (Zeile 3736)
defaultFilterName={activeTab === 'todos' ? t('tasks.filters.current') : 'Hoy'}
```

**Geänderter Code:**
```typescript
// Table-View (Zeile 2379)
defaultFilterName={activeTab === 'todos' ? 'Aktuell' : 'Hoy'}

// Card-View (Zeile 3736)
defaultFilterName={activeTab === 'todos' ? 'Aktuell' : 'Hoy'} // ✅ FIX: Einheitlich hardcodiert
```

**Begründung:**
- Filter in DB sind hardcodiert ("Aktuell"), nicht als Übersetzungsschlüssel
- `defaultFilterName` sollte daher auch hardcodiert sein
- Übersetzungen werden beim Anzeigen gemacht (`translateFilterName`)

**Test:**
- Table-View: Default-Filter wird gefunden und angewendet ✅
- Card-View: Default-Filter wird gefunden und angewendet ✅
- Beide verwenden den gleichen Wert ✅

---

### Phase 2: Optional - filterApplied State (NIEDRIGE PRIORITÄT) 🟡

#### Schritt 2.1: filterApplied State entfernen (optional)

**Datei:** `frontend/src/components/Requests.tsx:219-220, 532-555`

**Aktueller Code:**
```typescript
// State
const [filterApplied, setFilterApplied] = useState(false);

// Überwachung
useEffect(() => {
  if (selectedFilterId !== null || filterConditions.length > 0) {
    setFilterApplied(true);
  }
}, [selectedFilterId, filterConditions.length]);

// Warnung
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    const timeoutId = setTimeout(() => {
      if (!filterApplied && requests.length === 0) {
        console.warn('[Requests] Kein Filter wurde angewendet nach 5 Sekunden...');
      }
    }, 5000);
    return () => clearTimeout(timeoutId);
  }
}, [filterApplied, requests.length]);
```

**Geänderter Code:**
```typescript
// ✅ FIX: filterApplied State entfernen (redundant)
// ✅ OPTIONAL: Warnung behalten, aber ohne filterApplied State
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    const timeoutId = setTimeout(() => {
      // ✅ Prüfe direkt auf selectedFilterId und filterConditions
      if (selectedFilterId === null && filterConditions.length === 0 && requests.length === 0) {
        console.warn('[Requests] Kein Filter wurde angewendet nach 5 Sekunden. Möglicherweise fehlt Default-Filter in SavedFilterTags.');
      }
    }, 5000);
    return () => clearTimeout(timeoutId);
  }
}, [selectedFilterId, filterConditions.length, requests.length]);
```

**Begründung:**
- `filterApplied` State ist redundant
- Warnung kann direkt auf `selectedFilterId` und `filterConditions` prüfen
- Weniger Code, gleiche Funktionalität

**Alternative:**
- Warnung komplett entfernen (einfacher, aber weniger Debugging-Hilfe)

**Test:**
- Warnung erscheint nach 5 Sekunden, wenn kein Filter angewendet wurde ✅
- Kein zusätzlicher State nötig ✅

---

### Phase 3: Dokumentation und Konsistenz-Prüfung (NIEDRIGE PRIORITÄT) 🟡

#### Schritt 3.1: Alle defaultFilterName Werte prüfen

**Ziel:** Sicherstellen, dass alle `defaultFilterName` Werte hardcodiert sind (nicht übersetzt)

**Dateien zu prüfen:**
- `frontend/src/components/Requests.tsx` → `"Aktuell"` ✅
- `frontend/src/pages/Worktracker.tsx` → `'Aktuell'` / `'Hoy'` (nach Fix) ✅
- `frontend/src/components/tours/ToursTab.tsx` → `t('tours.filters.current', 'Aktuell')` ⚠️
- `frontend/src/pages/Cerebro.tsx` → `t('cerebro.filters.all', 'Alle Artikel')` ⚠️
- `frontend/src/components/teamWorktime/ActiveUsersList.tsx` → `t('teamWorktime.filters.active')` ⚠️
- `frontend/src/components/PasswordManagerTab.tsx` → `t('passwordManager.allEntries', 'Alle Einträge')` ⚠️
- `frontend/src/components/teamWorktime/TodoAnalyticsTab.tsx` → `t('teamWorktime.filters.all')` ⚠️
- `frontend/src/components/teamWorktime/RequestAnalyticsTab.tsx` → `t('teamWorktime.filters.all')` ⚠️

**Problem:**
- Viele verwenden `t(...)` statt hardcodierte Werte
- Aber: Filter in DB sind hardcodiert
- Suche muss alternative Namen unterstützen

**Lösung:**
- Option 1: Alle auf hardcodierte Werte ändern (konsistent)
- Option 2: Belassen, aber sicherstellen, dass Suche alle alternativen Namen unterstützt

**Empfehlung:** Option 1 (konsistent, einfacher)

---

#### Schritt 3.2: Dokumentation aktualisieren

**Datei:** `docs/technical/FILTER_LOAD_LOGIC_KORREKTUR_PLAN_2025-01-26.md`

**Ziel:** Dokumentation aktualisieren mit:
- Alle durchgeführten Fixes
- Konsistenz-Regeln für `defaultFilterName`
- Best Practices für Filter-Load-Logik

---

## 📋 IMPLEMENTIERUNGSREIHENFOLGE

### Schritt 1: Phase 1.1 - Requests handleFilterChange Fix
**Priorität:** 🔴 HÖCHST  
**Aufwand:** ~15 Minuten  
**Risiko:** Niedrig

**Schritte:**
1. `handleFilterChange` in Requests.tsx ändern
2. Testen: Gespeicherter Filter anwenden
3. Testen: Filter erweitern über FilterPane
4. Prüfen: State wird korrekt gesetzt

---

### Schritt 2: Phase 1.2 - Todos defaultFilterName Fix
**Priorität:** 🔴 HÖCHST  
**Aufwand:** ~5 Minuten  
**Risiko:** Niedrig

**Schritte:**
1. Card-View `defaultFilterName` auf `'Aktuell'` ändern
2. Testen: Table-View → Default-Filter wird gefunden
3. Testen: Card-View → Default-Filter wird gefunden
4. Prüfen: Beide verwenden den gleichen Wert

---

### Schritt 3: Phase 2.1 - filterApplied State entfernen (optional)
**Priorität:** 🟡 NIEDRIG  
**Aufwand:** ~10 Minuten  
**Risiko:** Niedrig

**Schritte:**
1. `filterApplied` State entfernen
2. Warnung auf `selectedFilterId` und `filterConditions` umstellen
3. Testen: Warnung erscheint nach 5 Sekunden, wenn kein Filter angewendet wurde

---

### Schritt 4: Phase 3.1 - Alle defaultFilterName Werte prüfen (optional)
**Priorität:** 🟡 NIEDRIG  
**Aufwand:** ~30 Minuten  
**Risiko:** Mittel (viele Dateien)

**Schritte:**
1. Alle Dateien mit `defaultFilterName` finden
2. Prüfen: Welche verwenden `t(...)`, welche hardcodiert?
3. Entscheiden: Alle auf hardcodiert ändern oder belassen?
4. Falls ändern: Alle Dateien anpassen
5. Testen: Alle Komponenten funktionieren noch

---

## ⚠️ RISIKEN UND MITIGATION

### Risiko 1: Requests handleFilterChange - Filter-Erweiterung funktioniert nicht mehr
**Status:** Gering  
**Mitigation:**
- `applyFilterConditions` wird jetzt aufgerufen, wenn keine `id` vorhanden ist
- Das ist korrekt, da Filter-Erweiterung keine `id` hat
- Testen: FilterPane → Filter erweitern → Anwenden

---

### Risiko 2: Todos defaultFilterName - Filter wird nicht gefunden
**Status:** Gering  
**Mitigation:**
- Filter in DB heißt "Aktuell" (hardcodiert)
- `defaultFilterName = 'Aktuell'` sollte funktionieren
- Suche unterstützt auch alternative Namen (Fallback)

---

### Risiko 3: filterApplied State - Warnung funktioniert nicht mehr
**Status:** Gering  
**Mitigation:**
- Warnung prüft direkt auf `selectedFilterId` und `filterConditions`
- Gleiche Logik, nur ohne zusätzlichen State
- Testen: Warnung erscheint nach 5 Sekunden

---

## ✅ ERGEBNIS NACH FIXES

### Konsistenz:
- ✅ Requests: `handleFilterChange` ruft `applyFilterConditions` auf (wie Todos/Reservations)
- ✅ Todos: `defaultFilterName` ist einheitlich (`'Aktuell'` in beiden Views)
- ✅ Alle: `defaultFilterName` ist hardcodiert (konsistent mit DB)

### Code-Qualität:
- ✅ Weniger redundanter Code (`filterApplied` State entfernt)
- ✅ Konsistente Logik zwischen allen Komponenten
- ✅ Einfacher zu warten

### Funktionalität:
- ✅ Filter-Erweiterung funktioniert korrekt (Requests)
- ✅ Default-Filter wird immer gefunden (Todos)
- ✅ Warnung funktioniert weiterhin (optional)

---

## 📝 ZUSAMMENFASSUNG

### Was wird geändert:

1. **Requests.tsx:**
   - `handleFilterChange` ruft `applyFilterConditions` auf, wenn keine `id` vorhanden ist
   - Konsistent mit Todos/Reservations

2. **Worktracker.tsx:**
   - Card-View `defaultFilterName` auf `'Aktuell'` ändern (statt `t('tasks.filters.current')`)
   - Einheitlich mit Table-View

3. **Requests.tsx (optional):**
   - `filterApplied` State entfernen
   - Warnung direkt auf `selectedFilterId` und `filterConditions` prüfen

### Was bleibt gleich:

- ✅ Filter-Load-Logik über FilterContext
- ✅ Default-Filter-Anwendung über SavedFilterTags
- ✅ Daten-Load über `handleFilterChange` → `fetchRequests` / `loadTasks` / `loadReservations`
- ✅ Infinite Scroll funktioniert weiterhin

### Vorteile:

- ✅ Konsistenz zwischen allen Komponenten
- ✅ Einfacher zu warten
- ✅ Weniger redundanter Code
- ✅ Filter-Erweiterung funktioniert korrekt

---

**Nächste Schritte:**
1. Phase 1.1 umsetzen (Requests handleFilterChange)
2. Phase 1.2 umsetzen (Todos defaultFilterName)
3. Phase 2.1 umsetzen (filterApplied State entfernen - optional)
4. Tests durchführen
5. Dokumentation aktualisieren

