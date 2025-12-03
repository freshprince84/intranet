# Analyse: Requests werden nicht geladen

**Datum:** 2025-01-30
**Status:** 🔴 **PROBLEM IDENTIFIZIERT**
**Priorität:** 🔴🔴🔴 KRITISCH

---

## 🔴 IDENTIFIZIERTE PROBLEME

### Problem 1: Initial State `loading = true` blockiert Fallback

**Datei:** `frontend/src/components/Requests.tsx:204`

**Problem:**
- `loading` wird initial auf `true` gesetzt: `const [loading, setLoading] = useState(true);`
- Der Fallback `useEffect` (Zeile 519-537) hat die Bedingung: `!filtersLoading && requests.length === 0 && !loading && ...`
- **KRITISCH:** Wenn `loading = true` ist, ist `!loading = false`, also wird der Fallback **NIE** ausgelöst!

**Ablauf:**
1. Komponente mountet → `loading = true`
2. Filter werden geladen → `filtersLoading` wird `false`
3. Fallback prüft: `!filtersLoading && requests.length === 0 && !loading && ...`
4. **SCHEITERT** bei `!loading`, weil `loading = true` ist
5. Fallback wird nie ausgelöst → Keine Requests werden geladen

---

### Problem 2: Race Condition zwischen SavedFilterTags und Fallback

**Datei:** `frontend/src/components/SavedFilterTags.tsx:250-257`

**Problem:**
- Wenn `savedFilters.length === 0`, ruft SavedFilterTags `onFilterChange('', null, [], [], undefined)` auf
- Das ruft `handleFilterChange` auf (Zeile 679 in Requests.tsx)
- `handleFilterChange` ruft `applyFilterConditions([], [])` auf (Zeile 694)
- `applyFilterConditions` ruft `fetchRequests(undefined, undefined, false, 20, 0)` auf (Zeile 665)
- **ABER:** `fetchRequests` setzt `setLoading(true)` (Zeile 361), BEVOR die Daten geladen werden
- Wenn dann der Fallback `useEffect` läuft, ist `loading = true`, also wird er nicht ausgelöst

**Ablauf:**
1. SavedFilterTags: Keine Filter gefunden → `onFilterChange('', null, [], [], undefined)`
2. `handleFilterChange` → `applyFilterConditions([], [])`
3. `applyFilterConditions` → `fetchRequests(...)` → `setLoading(true)`
4. Fallback prüft: `!loading` → **SCHEITERT**, weil `loading = true` ist
5. Fallback wird nicht ausgelöst

---

### Problem 3: Fallback useEffect Bedingung zu restriktiv

**Datei:** `frontend/src/components/Requests.tsx:525`

**Problem:**
Die Bedingung ist zu restriktiv:
```typescript
if (!filtersLoading && requests.length === 0 && !loading && selectedFilterId === null && filterConditions.length === 0)
```

**Warum problematisch:**
- `!loading` verhindert Ausführung, wenn `loading = true` ist
- Aber `loading` ist initial `true` und wird auch von `fetchRequests` auf `true` gesetzt
- Das bedeutet: Der Fallback kann nur ausgelöst werden, wenn `loading = false` ist
- Aber wenn `loading = false` ist, wurden möglicherweise bereits Daten geladen oder es gab einen Fehler

---

### Problem 4: SavedFilterTags ruft `onFilterChange` mit leeren Arrays auf

**Datei:** `frontend/src/components/SavedFilterTags.tsx:255, 303`

**Problem:**
- Wenn keine Filter existieren oder Default-Filter nicht gefunden wird, ruft SavedFilterTags `onFilterChange('', null, [], [], undefined)` auf
- Das setzt `selectedFilterId = null` und `filterConditions = []`
- **ABER:** `applyFilterConditions` wird aufgerufen, was `fetchRequests` aufruft
- Das sollte funktionieren, ABER: `loading` wird auf `true` gesetzt, was den Fallback blockiert

**Ablauf:**
1. SavedFilterTags: `onFilterChange('', null, [], [], undefined)`
2. `handleFilterChange` → `applyFilterConditions([], [])`
3. `applyFilterConditions` → `fetchRequests(undefined, undefined, false, 20, 0)`
4. `fetchRequests` → `setLoading(true)` (Zeile 361)
5. **PROBLEM:** Wenn `fetchRequests` fehlschlägt oder nicht ausgeführt wird, bleibt `loading = true`
6. Fallback kann nicht ausgelöst werden, weil `!loading = false`

---

## 🔍 ROOT CAUSE ANALYSIS

### Hauptproblem: `loading` State-Management

**Kernproblem:**
- `loading` wird initial auf `true` gesetzt
- `loading` wird von `fetchRequests` auf `true` gesetzt, BEVOR die Daten geladen werden
- Der Fallback `useEffect` prüft `!loading`, was bedeutet, dass er nur ausgelöst werden kann, wenn `loading = false` ist
- **ABER:** Wenn `loading = false` ist, wurden möglicherweise bereits Daten geladen oder es gab einen Fehler
- **ODER:** Wenn `loading = true` ist (initial oder während `fetchRequests`), wird der Fallback blockiert

### Sekundäres Problem: Race Condition

**Kernproblem:**
- SavedFilterTags versucht Default-Filter anzuwenden
- Wenn kein Filter gefunden wird, ruft es `onFilterChange` mit leeren Arrays auf
- Das ruft `fetchRequests` auf, was `loading = true` setzt
- Der Fallback `useEffect` läuft möglicherweise parallel und prüft `!loading`
- **ABER:** `loading` ist jetzt `true`, also wird der Fallback blockiert
- Wenn `fetchRequests` fehlschlägt oder nicht ausgeführt wird, bleibt `loading = true`
- Fallback kann nie ausgelöst werden

---

## 📋 MÖGLICHE LÖSUNGSANSÄTZE

### Lösung 1: Initial State `loading = false`

**Änderung:**
```typescript
const [loading, setLoading] = useState(false); // Statt true
```

**Vorteil:**
- Fallback kann sofort ausgelöst werden, wenn Filter geladen wurden
- Keine Blockierung durch initial `loading = true`

**Nachteil:**
- Kein Loading-Spinner beim initialen Laden
- Muss manuell `setLoading(true)` setzen, bevor `fetchRequests` aufgerufen wird

---

### Lösung 2: Fallback Bedingung anpassen

**Änderung:**
```typescript
// Entferne !loading aus der Bedingung
if (!filtersLoading && requests.length === 0 && selectedFilterId === null && filterConditions.length === 0) {
  // ...
}
```

**Vorteil:**
- Fallback wird nicht durch `loading` blockiert
- Kann auch während `fetchRequests` ausgelöst werden

**Nachteil:**
- Könnte zu doppeltem Laden führen, wenn `fetchRequests` bereits läuft
- Muss zusätzliche Prüfung einbauen, um doppeltes Laden zu verhindern

---

### Lösung 3: Separate Flag für "initial load attempted"

**Änderung:**
```typescript
const initialLoadAttemptedRef = useRef(false);

useEffect(() => {
  if (!filtersLoading && requests.length === 0 && !initialLoadAttemptedRef.current && selectedFilterId === null && filterConditions.length === 0) {
    initialLoadAttemptedRef.current = true;
    // Fallback: Lade Requests ohne Filter
    fetchRequests(undefined, undefined, false, 20, 0);
  }
}, [filtersLoading, requests.length, selectedFilterId, filterConditions.length, fetchRequests]);
```

**Vorteil:**
- Verhindert doppeltes Laden
- Wird nicht durch `loading` blockiert
- Wird nur einmal ausgelöst

**Nachteil:**
- Zusätzliche Komplexität mit Ref

---

### Lösung 4: SavedFilterTags sollte nicht `onFilterChange` mit leeren Arrays aufrufen

**Änderung:**
- SavedFilterTags sollte `onFilterChange` NICHT aufrufen, wenn keine Filter existieren
- Stattdessen sollte Requests.tsx selbst entscheiden, ob Daten geladen werden sollen

**Vorteil:**
- Klare Trennung der Verantwortlichkeiten
- Keine Race Condition zwischen SavedFilterTags und Fallback

**Nachteil:**
- SavedFilterTags muss geändert werden
- Requests.tsx muss selbst entscheiden, wann Daten geladen werden sollen

---

## 🎯 EMPFOHLENE LÖSUNG

**Kombination aus Lösung 1 und 3:**

1. **Initial State `loading = false`** (Lösung 1)
2. **Separate Flag für "initial load attempted"** (Lösung 3)
3. **Fallback Bedingung anpassen** (entferne `!loading`)

**Warum:**
- Verhindert Blockierung durch initial `loading = true`
- Verhindert doppeltes Laden durch Ref
- Klare Logik: Fallback wird einmal ausgelöst, wenn Filter geladen wurden und keine Daten vorhanden sind

---

## ⚠️ ZUSÄTZLICHE PROBLEME

### Problem 5: `fetchRequests` Dependency

**Datei:** `frontend/src/components/Requests.tsx:537`

**Problem:**
- Fallback `useEffect` hat `fetchRequests` in Dependencies
- `fetchRequests` ist ein `useCallback` mit `filterLogicalOperators` als Dependency
- Wenn `filterLogicalOperators` sich ändert, wird `fetchRequests` neu erstellt
- Das könnte zu Endlosschleifen führen

**Lösung:**
- `fetchRequests` sollte stabil sein (keine Dependencies ändern)
- Oder: Verwende `useRef` für `fetchRequests`, um Stabilität zu gewährleisten

---

## 📊 ZUSAMMENFASSUNG

### Hauptprobleme:
1. ✅ **Initial State `loading = true` blockiert Fallback**
2. ✅ **Race Condition zwischen SavedFilterTags und Fallback**
3. ✅ **Fallback Bedingung zu restriktiv (`!loading`)**
4. ✅ **SavedFilterTags ruft `onFilterChange` mit leeren Arrays auf**

### Root Cause:
- **`loading` State-Management:** Initial `loading = true` blockiert Fallback
- **Race Condition:** SavedFilterTags setzt `loading = true`, bevor Fallback ausgelöst werden kann

### Empfohlene Lösung:
- Initial State `loading = false`
- Separate Flag für "initial load attempted"
- Fallback Bedingung anpassen (entferne `!loading`)

---

**Erstellt:** 2025-01-30
**Status:** 🔴 **PROBLEM IDENTIFIZIERT - KEINE ÄNDERUNGEN VORGENOMMEN**

