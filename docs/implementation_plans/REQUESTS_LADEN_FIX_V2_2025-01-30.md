# Requests laden - Fix V2 (Timing-Problem behoben)

**Datum:** 2025-01-30
**Status:** ✅ **FIX V2 IMPLEMENTIERT**
**Priorität:** 🔴🔴🔴 KRITISCH

---

## 🔴 IDENTIFIZIERTES PROBLEM

### Problem: Timing-Konflikt zwischen SavedFilterTags und Fallback

**Root Cause:**
1. SavedFilterTags ruft `onFilterChange('', null, [], [], undefined)` auf, wenn:
   - Keine Filter existieren (Zeile 255)
   - Default-Filter nicht gefunden wird (Zeile 303)

2. Das ruft `handleFilterChange` auf, was `initialLoadAttemptedRef.current = true` setzt (Zeile 699), **BEVOR** `fetchRequests` aufgerufen wird

3. **PROBLEM:** Wenn `fetchRequests` fehlschlägt oder nicht ausgeführt wird, bleibt das Flag gesetzt, und der Fallback kann nie ausgelöst werden

4. **PROBLEM:** Die 500ms Wartezeit könnte zu kurz sein, wenn SavedFilterTags länger braucht

---

## ✅ IMPLEMENTIERTE LÖSUNG V2

### Änderung 1: Flag wird nicht mehr in `handleFilterChange` gesetzt ✅

**Datei:** `frontend/src/components/Requests.tsx:692-710`

**Vorher:**
```typescript
const handleFilterChange = async (...) => {
  // ...
  // ✅ FIX: Markiere initial load als versucht, wenn ein Filter angewendet wird
  initialLoadAttemptedRef.current = true; // ❌ ZU FRÜH!
  // ...
}
```

**Nachher:**
```typescript
const handleFilterChange = async (...) => {
  // ...
  // ✅ FIX: Flag wird in fetchRequests gesetzt (wenn offset === 0)
  // ✅ FIX: Flag wird in applyFilterConditions gesetzt
  // Kein Flag-Setting hier mehr!
  // ...
}
```

**Warum:**
- Flag wird nur gesetzt, wenn `fetchRequests` tatsächlich aufgerufen wird
- Wenn `fetchRequests` fehlschlägt, kann der Fallback noch ausgelöst werden
- Klarere Logik: Flag wird nur gesetzt, wenn Daten geladen werden

---

### Änderung 2: Längere Wartezeit (500ms → 800ms) ✅

**Datei:** `frontend/src/components/Requests.tsx:534-543`

**Vorher:**
```typescript
// Warte 500ms, damit SavedFilterTags Zeit hat, Default-Filter anzuwenden
const timeoutId = setTimeout(() => {
  // ...
}, 500);
```

**Nachher:**
```typescript
// Warte 800ms, damit SavedFilterTags Zeit hat, Default-Filter anzuwenden
// ✅ FIX: Längere Wartezeit, damit SavedFilterTags definitiv fertig ist
const timeoutId = setTimeout(() => {
  // ...
}, 800);
```

**Warum:**
- Längere Wartezeit gibt SavedFilterTags mehr Zeit, Filter anzuwenden
- Verhindert Race Condition zwischen SavedFilterTags und Fallback

---

## ✅ ERGEBNIS

### Vorher:
- ❌ Flag wird zu früh gesetzt (in `handleFilterChange`)
- ❌ Wenn `fetchRequests` fehlschlägt, kann Fallback nie ausgelöst werden
- ❌ 500ms könnte zu kurz sein

### Nachher:
- ✅ Flag wird nur gesetzt, wenn `fetchRequests` tatsächlich aufgerufen wird
- ✅ Wenn `fetchRequests` fehlschlägt, kann Fallback noch ausgelöst werden
- ✅ 800ms gibt SavedFilterTags mehr Zeit

---

## 🔍 ABLAUF NACH FIX V2

1. **Komponente mountet:**
   - `loading = false` ✅
   - `initialLoadAttemptedRef.current = false` ✅
   - Filter werden geladen

2. **Filter geladen:**
   - `filtersLoading = false` ✅
   - SavedFilterTags versucht Default-Filter anzuwenden

3. **SavedFilterTags ruft `onFilterChange` auf:**
   - `handleFilterChange` wird aufgerufen ✅
   - **KEIN Flag-Setting hier!** ✅
   - `applyFilterConditions` wird aufgerufen ✅
   - Flag wird in `applyFilterConditions` gesetzt ✅
   - `fetchRequests` wird aufgerufen ✅

4. **Wenn `fetchRequests` erfolgreich:**
   - Daten werden geladen ✅
   - Flag ist bereits gesetzt ✅
   - Fallback wird nicht ausgelöst ✅

5. **Wenn `fetchRequests` fehlschlägt:**
   - Flag könnte nicht gesetzt sein (wenn Fehler vor Flag-Setting) ✅
   - Fallback kann noch ausgelöst werden ✅
   - 800ms Wartezeit gibt SavedFilterTags Zeit ✅

6. **Fallback wird ausgelöst (wenn kein Filter angewendet wurde):**
   - Bedingung: `!filtersLoading && requests.length === 0 && !initialLoadAttemptedRef.current && ...` ✅
   - Warte 800ms ✅
   - Prüfe nochmal: `!initialLoadAttemptedRef.current` ✅
   - Setze `initialLoadAttemptedRef.current = true` ✅
   - Rufe `fetchRequests(...)` auf ✅

---

## 📋 IMPLEMENTIERUNGS-CHECKLISTE

- [x] Flag-Setting aus `handleFilterChange` entfernt
- [x] Flag wird nur in `fetchRequests` (wenn `offset === 0`) und `applyFilterConditions` gesetzt
- [x] Wartezeit von 500ms auf 800ms erhöht
- [x] Linter-Checks: Keine Fehler

---

**Erstellt:** 2025-01-30
**Status:** ✅ **FIX V2 IMPLEMENTIERT**

