# Performance: Skeleton-Loading Problem-Analyse (2025-01-22)

**Datum:** 2025-01-22  
**Status:** 🔍 Analyse abgeschlossen  
**Problem:** Performance gefühlt schlechter nach Skeleton-Loading Implementierung

---

## 🔴 PROBLEM IDENTIFIZIERT

### Aktuelle Implementierung

**Requests.tsx (Zeile 990-1017):**
```typescript
if (loading && requests.length === 0) {
  return (
    // Skeleton-Loading
  );
}
```

**Worktracker.tsx (Zeile 2024 & 3182):**
```typescript
{loading && tasks.length === 0 ? (
  // Skeleton-Loading
) : error ? (
  // Error
) : ...}
```

---

## 🔍 MÖGLICHE PROBLEME

### Problem 1: Early Return verhindert normale Rendering-Logik

**Requests.tsx:**
- **Zeile 990:** `if (loading && requests.length === 0) { return ... }`
- **Problem:** Early Return verhindert, dass der Rest des Codes ausgeführt wird
- **Folge:** Wenn `loading === false` aber `requests.length === 0`, wird die normale "Keine Requests gefunden" Meldung angezeigt (korrekt)
- **ABER:** Wenn `loading === true` aber `requests.length > 0` (Race Condition), wird weder Skeleton noch echte Daten angezeigt!

**Fakt:** Early Return könnte zu Race Conditions führen.

---

### Problem 2: Zusätzliche DOM-Elemente verlangsamen Rendering

**Skeleton-Loading rendert:**
- 3 zusätzliche `div`-Elemente mit `CardGrid`
- Jedes Skeleton-Card hat mehrere `div`-Elemente mit `animate-pulse`
- **Gesamt:** ~15-20 zusätzliche DOM-Elemente

**Fakt:** Zusätzliche DOM-Elemente könnten das Rendering verlangsamen.

---

### Problem 3: Timing-Problem zwischen setRequests und setLoading

**Flow in fetchRequests (Zeile 364-428):**
1. `setLoading(true)` (Zeile 367)
2. API-Request (Zeile 381)
3. `setRequests(requestsWithAttachments)` (Zeile 409) ← **State-Update 1**
4. `setLoading(false)` (Zeile 425) ← **State-Update 2**

**Problem:** React batched State-Updates, aber die Reihenfolge ist:
- `setRequests` → `setLoading(false)`
- **Zwischenzeit:** `loading === true` UND `requests.length > 0` → Skeleton-Bedingung nicht erfüllt, aber echte Daten werden auch nicht angezeigt (weil Early Return)

**Fakt:** Timing-Problem zwischen State-Updates könnte zu fehlendem Rendering führen.

---

### Problem 4: Skeleton-Cards blockieren echte Daten

**Aktuelle Logik:**
- Wenn `loading === true` UND `requests.length === 0` → Skeleton
- Wenn `loading === false` ODER `requests.length > 0` → Normale Logik

**Problem:** Wenn Daten ankommen (`requests.length > 0`), aber `loading` noch `true` ist, wird weder Skeleton noch echte Daten angezeigt (Early Return verhindert normale Logik).

**Fakt:** Early Return verhindert normale Rendering-Logik, wenn Daten ankommen.

---

## 📊 VERGLEICH: VORHER vs. NACHHER

### Vorher (ohne Skeleton-Loading)

**Requests.tsx:**
```typescript
if (loading) return <div className="p-4">{t('common.loading')}</div>;
```

**Flow:**
1. `loading === true` → Loading-Text wird angezeigt
2. Daten kommen an → `setRequests()` → `setLoading(false)`
3. `loading === false` → Normale Logik wird ausgeführt → Echte Daten werden angezeigt

**Fakt:** Einfacher Flow, keine Race Conditions.

---

### Nachher (mit Skeleton-Loading)

**Requests.tsx:**
```typescript
if (loading && requests.length === 0) {
  return (
    // Skeleton-Loading
  );
}
```

**Flow:**
1. `loading === true` UND `requests.length === 0` → Skeleton wird angezeigt
2. Daten kommen an → `setRequests()` → `requests.length > 0`
3. **Problem:** `loading` noch `true` → Skeleton-Bedingung nicht erfüllt, aber Early Return verhindert normale Logik → **NICHTS wird angezeigt!**
4. `setLoading(false)` → Normale Logik wird ausgeführt → Echte Daten werden angezeigt

**Fakt:** Race Condition zwischen `setRequests` und `setLoading(false)` führt zu fehlendem Rendering.

---

## 🔴 KRITISCHES PROBLEM: Early Return

**Problem:** Early Return verhindert normale Rendering-Logik, wenn Daten ankommen, aber `loading` noch `true` ist.

**Lösung:** Statt Early Return sollte die Skeleton-Bedingung inline im normalen Rendering-Flow sein.

**Aktuell (FALSCH):**
```typescript
if (loading && requests.length === 0) {
  return (
    // Skeleton-Loading
  );
}
// Rest des Codes...
```

**Korrigiert (RICHTIG):**
```typescript
// Kein Early Return!
// Skeleton inline im normalen Rendering-Flow
{loading && requests.length === 0 ? (
  // Skeleton-Loading
) : (
  // Normale Logik
)}
```

**Fakt:** Early Return ist das Hauptproblem.

---

## 📋 ZUSAMMENFASSUNG

### Identifizierte Probleme

1. ✅ **Early Return verhindert normale Rendering-Logik** (KRITISCH)
2. ✅ **Race Condition zwischen setRequests und setLoading(false)** (KRITISCH)
3. ⚠️ **Zusätzliche DOM-Elemente verlangsamen Rendering** (MÖGLICH)
4. ⚠️ **Timing-Problem zwischen State-Updates** (MÖGLICH)

### Hauptproblem

**Early Return in Requests.tsx verhindert normale Rendering-Logik, wenn Daten ankommen, aber `loading` noch `true` ist.**

**Folge:** Zwischen `setRequests()` und `setLoading(false)` wird **NICHTS** angezeigt (weder Skeleton noch echte Daten).

---

**Erstellt:** 2025-01-22  
**Status:** ✅ Analyse abgeschlossen  
**Nächste Aktion:** Early Return entfernen, Skeleton inline im normalen Rendering-Flow

