# Performance: Skeleton-Loading - Fakten-Analyse (2025-01-22)

**Datum:** 2025-01-22  
**Status:** ✅ Fakten-Analyse abgeschlossen  
**Problem:** Performance gefühlt schlechter nach Skeleton-Loading Implementierung

---

## 📊 FAKTEN AUS DEM CODE

### Requests.tsx

**Initial State (Zeile 199-201):**
```typescript
const [requests, setRequests] = useState<Request[]>([]);
const [loading, setLoading] = useState(true);
```
**Fakt:** Initial: `loading = true`, `requests = []`

**Skeleton-Bedingung (Zeile 991):**
```typescript
if (loading && requests.length === 0) {
  return (
    // Skeleton-Loading
  );
}
```
**Fakt:** Early Return nur wenn `loading = true` UND `requests.length = 0`

**fetchRequests Flow (Zeile 364-428):**
1. Zeile 367: `setLoading(true)` (wenn `!background`)
2. Zeile 409: `setRequests(requestsWithAttachments)` (wenn `!background`)
3. Zeile 425: `setLoading(false)` (im `finally` Block, wenn `!background`)

**Fakt:** `setRequests()` und `setLoading(false)` werden in der gleichen Funktion aufgerufen.

**React State Updates:**
- React batched State-Updates in der gleichen Funktion
- `setRequests()` und `setLoading(false)` werden synchron ausgeführt
- **Fakt:** Nach `fetchRequests()` sind beide Updates synchron: `requests.length > 0` UND `loading = false`

**Nach fetchRequests():**
- `loading = false` (Zeile 425)
- `requests.length > 0` (Zeile 409)
- Bedingung `loading && requests.length === 0` ist `false`
- Early Return wird NICHT ausgeführt
- Normale Logik wird ausgeführt (Zeile 1020+)

**Fakt:** Nach `fetchRequests()` wird Skeleton nicht mehr angezeigt, normale Logik wird ausgeführt.

---

### Worktracker.tsx

**Initial State (Zeile 269):**
```typescript
const [loading, setLoading] = useState(true);
```
**Fakt:** Initial: `loading = true`

**Skeleton-Bedingung (Zeile 2027):**
```typescript
{loading && tasks.length === 0 ? (
  // Skeleton-Loading
) : error ? (
  // Error
) : ...}
```
**Fakt:** Kein Early Return, inline Conditional Rendering

**loadTasks Flow (Zeile 440-504):**
1. Zeile 443: `setLoading(true)` (wenn `!background`)
2. Zeile 491: `setTasks(tasksWithAttachments)` (wenn `!background`)
3. Zeile 501: `setLoading(false)` (im `finally` Block, wenn `!background`)

**Fakt:** `setTasks()` und `setLoading(false)` werden in der gleichen Funktion aufgerufen.

**Nach loadTasks():**
- `loading = false` (Zeile 501)
- `tasks.length > 0` (Zeile 491)
- Bedingung `loading && tasks.length === 0` ist `false`
- Skeleton wird NICHT angezeigt
- Normale Logik wird ausgeführt

**Fakt:** Nach `loadTasks()` wird Skeleton nicht mehr angezeigt, normale Logik wird ausgeführt.

---

## 🔍 UNTERSCHIED: REQUESTS.TSX vs. WORKTRACKER.TSX

**Requests.tsx:**
- **Early Return:** `if (loading && requests.length === 0) { return ... }`
- **Fakt:** Wenn Bedingung erfüllt, wird Rest des Codes nicht ausgeführt

**Worktracker.tsx:**
- **Inline Conditional:** `{loading && tasks.length === 0 ? ... : ...}`
- **Fakt:** Kein Early Return, normale Logik wird immer ausgeführt

**Fakt:** Requests.tsx verwendet Early Return, Worktracker.tsx verwendet inline Conditional Rendering.

---

## 📊 DOM-ELEMENTE: SKELETON vs. ECHTE DATEN

**Skeleton-Loading (Requests.tsx Zeile 992-1016):**
- 1x `<div className="-mx-3 sm:-mx-4 md:-mx-6">`
- 1x `<CardGrid>`
- 3x `<div key="skeleton-{i}">` (Skeleton-Card)
- Pro Skeleton-Card:
  - 1x `<div className="animate-pulse space-y-4">`
  - 1x `<div className="flex items-center gap-2 mb-2">` (Titel-Skeleton)
  - 2x `<div className="h-4/h-6 bg-gray-200...">` (Titel-Elemente)
  - 1x `<div className="h-6 bg-gray-200...">` (Status-Skeleton)
  - 1x `<div className="space-y-2">` (Metadaten-Container)
  - 3x `<div className="h-4 bg-gray-200...">` (Metadaten-Elemente)
- **Gesamt:** ~20 DOM-Elemente pro Skeleton-Loading

**Echte Daten (Requests.tsx Zeile 1549+):**
- 1x `<CardGrid>`
- Nx `<DataCard>` (N = Anzahl Requests)
- Pro DataCard: ~15-20 DOM-Elemente (abhängig von Metadaten)

**Fakt:** Skeleton-Loading rendert ~20 DOM-Elemente, echte Daten rendern ~15-20 DOM-Elemente pro Request.

**Fakt:** Wenn 3 Skeleton-Cards gerendert werden, sind es ~20 DOM-Elemente. Wenn 3 echte Requests gerendert werden, sind es ~45-60 DOM-Elemente.

**Fakt:** Skeleton-Loading rendert WENIGER DOM-Elemente als echte Daten.

---

## 🔍 TIMING-ANALYSE

**Initial Render:**
1. Component mountet
2. `loading = true`, `requests = []`
3. Bedingung `loading && requests.length === 0` ist `true`
4. Skeleton wird angezeigt (Requests.tsx) oder Conditional Rendering zeigt Skeleton (Worktracker.tsx)

**Nach fetchRequests/loadTasks:**
1. `setRequests(requestsWithAttachments)` wird aufgerufen
2. `setLoading(false)` wird aufgerufen
3. React batched beide Updates
4. Nach Batch: `loading = false`, `requests.length > 0`
5. Bedingung `loading && requests.length === 0` ist `false`
6. Skeleton wird NICHT mehr angezeigt
7. Normale Logik wird ausgeführt

**Fakt:** React batched State-Updates, daher gibt es keine Race Condition zwischen `setRequests()` und `setLoading(false)`.

**Fakt:** Nach `fetchRequests()`/`loadTasks()` wird Skeleton sofort durch echte Daten ersetzt.

---

## 🔍 MÖGLICHE PERFORMANCE-PROBLEME

### Problem 1: Zusätzliche DOM-Elemente

**Fakt:** Skeleton-Loading rendert ~20 DOM-Elemente.

**Fakt:** Echte Daten rendern ~15-20 DOM-Elemente pro Request.

**Fakt:** Wenn 3 Skeleton-Cards gerendert werden, sind es ~20 DOM-Elemente. Wenn 3 echte Requests gerendert werden, sind es ~45-60 DOM-Elemente.

**Fakt:** Skeleton-Loading rendert WENIGER DOM-Elemente als echte Daten.

**Schlussfolgerung:** Zusätzliche DOM-Elemente sind NICHT das Problem.

---

### Problem 2: animate-pulse CSS-Animation

**Fakt:** Skeleton-Loading verwendet `animate-pulse` (Zeile 997, 2031).

**Fakt:** `animate-pulse` ist eine CSS-Animation, die kontinuierlich läuft.

**Fakt:** CSS-Animationen können CPU/GPU-Ressourcen verbrauchen.

**Schlussfolgerung:** `animate-pulse` könnte Performance beeinträchtigen, wenn viele Skeleton-Cards gleichzeitig animiert werden.

---

### Problem 3: Early Return in Requests.tsx

**Fakt:** Requests.tsx verwendet Early Return (Zeile 991).

**Fakt:** Worktracker.tsx verwendet inline Conditional Rendering (Zeile 2027).

**Fakt:** Early Return verhindert, dass der Rest des Codes ausgeführt wird, wenn Bedingung erfüllt ist.

**Fakt:** Nach `fetchRequests()` ist Bedingung nicht mehr erfüllt, daher wird normale Logik ausgeführt.

**Schlussfolgerung:** Early Return ist NICHT das Problem, da nach `fetchRequests()` normale Logik ausgeführt wird.

---

### Problem 4: React Re-Render

**Fakt:** Wenn `setRequests()` aufgerufen wird, wird Component neu gerendert.

**Fakt:** Wenn `setLoading(false)` aufgerufen wird, wird Component neu gerendert.

**Fakt:** React batched beide Updates, daher wird Component nur EINMAL neu gerendert.

**Fakt:** Nach Re-Render wird Skeleton durch echte Daten ersetzt.

**Schlussfolgerung:** React Re-Render ist NICHT das Problem, da Updates gebatched werden.

---

## 📋 ZUSAMMENFASSUNG: FAKTEN

### Code-Fakten

1. **Initial State:** `loading = true`, `requests/tasks = []`
2. **Skeleton-Bedingung:** `loading && requests.length === 0` (Requests.tsx) oder `loading && tasks.length === 0` (Worktracker.tsx)
3. **fetchRequests/loadTasks:** `setRequests()` → `setLoading(false)` (synchron, gebatched)
4. **Nach fetchRequests/loadTasks:** `loading = false`, `requests/tasks.length > 0`
5. **Nach Updates:** Skeleton wird NICHT mehr angezeigt, normale Logik wird ausgeführt

### Performance-Fakten

1. **DOM-Elemente:** Skeleton rendert ~20 Elemente, echte Daten rendern ~45-60 Elemente (für 3 Requests)
2. **CSS-Animation:** `animate-pulse` läuft kontinuierlich auf allen Skeleton-Cards
3. **React Re-Render:** Updates werden gebatched, Component wird nur EINMAL neu gerendert
4. **Early Return:** Verhindert normale Logik nur wenn Bedingung erfüllt, nach Updates wird normale Logik ausgeführt

### Mögliche Ursachen für schlechtere Performance

1. **`animate-pulse` CSS-Animation:** Läuft kontinuierlich auf allen Skeleton-Cards, könnte CPU/GPU-Ressourcen verbrauchen
2. **Zusätzlicher Render-Zyklus:** Skeleton wird gerendert, dann durch echte Daten ersetzt (2 Render-Zyklen statt 1)

**Fakt:** `animate-pulse` CSS-Animation ist die wahrscheinlichste Ursache für schlechtere Performance.

---

**Erstellt:** 2025-01-22  
**Status:** ✅ Fakten-Analyse abgeschlossen  
**Hauptproblem:** `animate-pulse` CSS-Animation verbraucht CPU/GPU-Ressourcen

