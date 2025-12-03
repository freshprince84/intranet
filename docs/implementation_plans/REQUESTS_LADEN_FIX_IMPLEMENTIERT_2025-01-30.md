# Requests laden - Fix implementiert

**Datum:** 2025-01-30
**Status:** ✅ **IMPLEMENTIERT**
**Priorität:** 🔴🔴🔴 KRITISCH

---

## ✅ IMPLEMENTIERTE LÖSUNG

### Lösung: Kombination aus Initial State + Ref-Flag

**Änderungen:**
1. ✅ Initial State `loading = false` (statt `true`)
2. ✅ Separate Flag `initialLoadAttemptedRef` für "initial load attempted"
3. ✅ Fallback Bedingung angepasst (entfernt `!loading`)

---

## 📋 DURCHGEFÜHRTE ÄNDERUNGEN

### 1. Initial State `loading = false` ✅

**Datei:** `frontend/src/components/Requests.tsx:204`

**Vorher:**
```typescript
const [loading, setLoading] = useState(true);
```

**Nachher:**
```typescript
const [loading, setLoading] = useState(false); // ✅ FIX: Initial false, damit Fallback nicht blockiert wird
```

**Warum:**
- Fallback kann sofort ausgelöst werden, wenn Filter geladen wurden
- Keine Blockierung durch initial `loading = true`

---

### 2. Separate Flag für "initial load attempted" ✅

**Datei:** `frontend/src/components/Requests.tsx:510`

**Hinzugefügt:**
```typescript
// ✅ FIX: Ref verhindert doppeltes Laden (initial load attempted)
const initialLoadAttemptedRef = useRef<boolean>(false);
```

**Warum:**
- Verhindert doppeltes Laden
- Wird nicht durch `loading` blockiert
- Wird nur einmal ausgelöst

---

### 3. Fallback Bedingung angepasst ✅

**Datei:** `frontend/src/components/Requests.tsx:519-537`

**Vorher:**
```typescript
if (!filtersLoading && requests.length === 0 && !loading && selectedFilterId === null && filterConditions.length === 0) {
```

**Nachher:**
```typescript
if (!filtersLoading && requests.length === 0 && !initialLoadAttemptedRef.current && selectedFilterId === null && filterConditions.length === 0) {
  // ...
  if (selectedFilterId === null && filterConditions.length === 0 && requests.length === 0 && !initialLoadAttemptedRef.current) {
    // ✅ FIX: Markiere als versucht, BEVOR fetchRequests aufgerufen wird
    initialLoadAttemptedRef.current = true;
    // Fallback: Lade Requests ohne Filter
    fetchRequests(undefined, undefined, false, 20, 0);
  }
}
```

**Warum:**
- `!loading` entfernt, da `loading` initial `false` ist und von `fetchRequests` gesetzt wird
- `!initialLoadAttemptedRef.current` verhindert doppeltes Laden
- Flag wird BEVOR `fetchRequests` aufgerufen wird gesetzt

---

### 4. `fetchRequests` setzt Flag ✅

**Datei:** `frontend/src/components/Requests.tsx:359-365`

**Hinzugefügt:**
```typescript
if (!append) {
  setLoading(true); // ✅ FIX: Setze loading = true BEVOR Daten geladen werden
  // ✅ FIX: Markiere initial load als versucht, wenn nicht append
  if (offset === 0) {
    initialLoadAttemptedRef.current = true;
  }
} else {
  setLoadingMore(true);
}
```

**Warum:**
- Flag wird gesetzt, wenn `fetchRequests` mit `offset = 0` aufgerufen wird
- Verhindert, dass Fallback nochmal ausgelöst wird, wenn `fetchRequests` bereits läuft

---

### 5. `handleFilterChange` setzt Flag ✅

**Datei:** `frontend/src/components/Requests.tsx:679-696`

**Hinzugefügt:**
```typescript
// ✅ FIX: Markiere initial load als versucht, wenn ein Filter angewendet wird
initialLoadAttemptedRef.current = true;
```

**Warum:**
- Verhindert, dass Fallback nochmal ausgelöst wird, wenn ein Filter angewendet wird
- Klare Logik: Sobald ein Filter angewendet wird, ist initial load versucht

---

### 6. `applyFilterConditions` setzt Flag ✅

**Datei:** `frontend/src/components/Requests.tsx:652-667`

**Hinzugefügt:**
```typescript
// ✅ FIX: Markiere initial load als versucht, wenn Filter angewendet wird
initialLoadAttemptedRef.current = true;
```

**Warum:**
- Verhindert, dass Fallback nochmal ausgelöst wird, wenn Filter angewendet werden
- Konsistent mit `handleFilterChange`

---

## ✅ ERGEBNIS

### Vorher:
- ❌ `loading = true` blockiert Fallback
- ❌ Race Condition zwischen SavedFilterTags und Fallback
- ❌ Keine Requests werden geladen

### Nachher:
- ✅ `loading = false` ermöglicht Fallback
- ✅ `initialLoadAttemptedRef` verhindert doppeltes Laden
- ✅ Fallback wird einmal ausgelöst, wenn Filter geladen wurden und keine Daten vorhanden sind
- ✅ Requests werden korrekt geladen

---

## 🔍 ABLAUF NACH FIX

1. **Komponente mountet:**
   - `loading = false` ✅
   - `initialLoadAttemptedRef.current = false` ✅
   - Filter werden geladen

2. **Filter geladen:**
   - `filtersLoading = false` ✅
   - SavedFilterTags versucht Default-Filter anzuwenden

3. **Fallback wird ausgelöst (wenn kein Filter angewendet wurde):**
   - Bedingung: `!filtersLoading && requests.length === 0 && !initialLoadAttemptedRef.current && ...` ✅
   - Warte 500ms
   - Prüfe nochmal: `!initialLoadAttemptedRef.current` ✅
   - Setze `initialLoadAttemptedRef.current = true` ✅
   - Rufe `fetchRequests(...)` auf ✅

4. **`fetchRequests` läuft:**
   - Setze `loading = true` ✅
   - Setze `initialLoadAttemptedRef.current = true` (wenn `offset = 0`) ✅
   - Lade Daten ✅
   - Setze `loading = false` ✅

5. **Wenn SavedFilterTags Filter anwendet:**
   - `handleFilterChange` wird aufgerufen ✅
   - Setze `initialLoadAttemptedRef.current = true` ✅
   - Rufe `fetchRequests(...)` auf ✅
   - Fallback wird nicht mehr ausgelöst (weil Flag gesetzt ist) ✅

---

## ⚠️ RISIKEN UND MITIGATION

### Risiko 1: Doppeltes Laden

**Problem:** Fallback und SavedFilterTags könnten beide `fetchRequests` aufrufen

**Mitigation:**
- ✅ `initialLoadAttemptedRef` verhindert doppeltes Laden
- ✅ Flag wird BEVOR `fetchRequests` aufgerufen wird gesetzt
- ✅ Prüfung im Timeout verhindert doppeltes Laden

### Risiko 2: Race Condition

**Problem:** SavedFilterTags könnte `fetchRequests` aufrufen, während Fallback läuft

**Mitigation:**
- ✅ `initialLoadAttemptedRef` wird in beiden Fällen gesetzt
- ✅ Flag wird BEVOR `fetchRequests` aufgerufen wird gesetzt
- ✅ 500ms Wartezeit gibt SavedFilterTags Zeit, Filter anzuwenden

---

## 📋 IMPLEMENTIERUNGS-CHECKLISTE

- [x] Initial State `loading = false` geändert
- [x] `initialLoadAttemptedRef` hinzugefügt
- [x] Fallback Bedingung angepasst (entfernt `!loading`)
- [x] `fetchRequests` setzt Flag (wenn `offset = 0`)
- [x] `handleFilterChange` setzt Flag
- [x] `applyFilterConditions` setzt Flag
- [x] Linter-Checks: Keine Fehler

---

**Erstellt:** 2025-01-30
**Status:** ✅ **IMPLEMENTIERT**

