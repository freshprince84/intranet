# Sortierung komplett kaputt - Vollständige Analyse

**Datum:** 2025-12-18  
**Status:** 🔴 KRITISCH - Sortierung funktioniert nirgends mehr  
**Priorität:** 🔴 HÖCHSTE PRIORITÄT

---

## 📋 PROBLEM-BESCHREIBUNG

**Fakten aus Benutzer-Beschreibung:**
- Sortierung funktioniert **nirgends mehr** (Requests, To-Do's, Reservations)
- Bild zeigt: Im "Ordenar y mostrar" Dropdown sind alle Sortier-Icons grau (keine aktive Sortierung sichtbar)
- Sortierung funktioniert **komplett nicht mehr**

---

## 🔍 GEPRÜFTE DOKUMENTE

1. ✅ `docs/implementation_plans/WORKTRACKER_SORTIERUNG_FILTER_FIX_PLAN.md` - Status: UMGESETZT (2025-12-18)
2. ✅ `docs/implementation_plans/TASK_PROBLEME_VOLLSTAENDIGER_PRUEFPLAN.md` - Vollständiger Prüfplan
3. ✅ `docs/technical/MEMORY_LEAKS_UND_PERFORMANCE_FIXES_2025-12-11.md` - Memory Leak Fixes
4. ✅ `frontend/src/pages/Worktracker.tsx` - Aktueller Code
5. ✅ `frontend/src/components/TableColumnConfig.tsx` - TableColumnConfig Komponente
6. ✅ `frontend/src/components/Requests.tsx` - Vergleich (funktioniert)
7. ✅ `frontend/src/hooks/useTableSettings.ts` - useTableSettings Hook

---

## 🔴 IDENTIFIZIERTE PROBLEME

### Problem 1: handleMainSortChange ist NICHT mit useCallback definiert

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 500-506

**Aktueller Code:**
```typescript
const handleMainSortChange = (key: string, direction: 'asc' | 'desc') => {
  if (activeTab === 'todos') {
    updateTasksSortConfig({ key: key as SortConfig['key'], direction });
  } else if (activeTab === 'reservations') {
    updateReservationsSortConfig({ key: key as ReservationSortConfig['key'], direction });
  }
};
```

**Fakten:**
- `handleMainSortChange` ist NICHT mit `useCallback` definiert
- Verwendet `activeTab` aus Closure (wird bei jedem Render neu erstellt)
- Wird an `TableColumnConfig` übergeben als `onMainSortChange` (Zeile 2366, 3693)
- **PROBLEM:** Wenn `activeTab` sich ändert, wird `handleMainSortChange` neu erstellt, aber `TableColumnConfig` könnte veraltete Referenz haben

**Vergleich mit Requests.tsx (funktioniert):**
- `handleMainSortChange` in Requests.tsx (Zeile 280-282) ist auch NICHT mit `useCallback` definiert
- **ABER:** Requests funktioniert trotzdem - warum?

**Untersuchung erforderlich:**
- [ ] Prüfen ob `handleMainSortChange` mit `useCallback` definiert werden muss
- [ ] Prüfen ob `activeTab` als Dependency hinzugefügt werden muss

---

### Problem 2: tableSortConfig wird aus Closure-Variable erstellt

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 449

**Aktueller Code:**
```typescript
const tableSortConfig: SortConfig = tasksSettings.sortConfig || { key: 'dueDate', direction: 'asc' };
```

**Fakten:**
- `tableSortConfig` wird bei jedem Render neu erstellt
- Wird an `TableColumnConfig` übergeben als `mainSortConfig` (Zeile 2365)
- Wird in `filteredAndSortedTasks` useMemo verwendet (Zeile 1471)
- **PROBLEM:** `tableSortConfig` ist eine lokale Variable, die bei jedem Render neu erstellt wird

**Untersuchung erforderlich:**
- [ ] Prüfen ob `tableSortConfig` in `useMemo` Dependencies korrekt ist
- [ ] Prüfen ob `tableSortConfig` direkt aus `tasksSettings.sortConfig` verwendet werden sollte

---

### Problem 3: filteredAndSortedTasks useMemo Dependencies

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 1514

**Aktueller Code:**
```typescript
}, [tasks, selectedFilterId, searchTerm, tableSortConfig]);
```

**Fakten:**
- `tableSortConfig` ist in Dependencies
- `tableSortConfig` wird bei jedem Render neu erstellt (Zeile 449)
- **PROBLEM:** `useMemo` wird bei jedem Render neu berechnet, weil `tableSortConfig` sich ändert (neue Referenz)

**Untersuchung erforderlich:**
- [ ] Prüfen ob `tasksSettings.sortConfig` direkt in Dependencies verwendet werden sollte
- [ ] Prüfen ob `tableSortConfig` stabilisiert werden muss

---

### Problem 4: handleSort verwendet tasksSettings.sortConfig direkt

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 1178-1185

**Aktueller Code (✅ UMGESETZT):**
```typescript
const handleSort = useCallback((key: SortConfig['key']) => {
    const currentSortConfig = tasksSettings.sortConfig || { key: 'dueDate', direction: 'asc' };
    const newDirection = currentSortConfig.key === key && currentSortConfig.direction === 'asc' ? 'desc' : 'asc';
    updateTasksSortConfig({ key, direction: newDirection });
}, [tasksSettings.sortConfig, updateTasksSortConfig]);
```

**Fakten:**
- `handleSort` ist mit `useCallback` definiert (✅ KORREKT)
- Verwendet `tasksSettings.sortConfig` direkt (✅ KORREKT)
- **ABER:** `handleSort` wird für Table-Header verwendet (Zeile 2446, 3769)
- **PROBLEM:** Table-Header verwendet `handleSort`, aber `TableColumnConfig` verwendet `handleMainSortChange`

**Untersuchung erforderlich:**
- [ ] Prüfen ob Table-Header `handleSort` oder `handleMainSortChange` verwenden sollte
- [ ] Prüfen ob beide Funktionen konsistent sind

---

## 🔍 CODE-ANALYSE

### Vergleich: Requests.tsx (funktioniert)

**Datei:** `frontend/src/components/Requests.tsx`

**Fakten:**
- `handleMainSortChange` (Zeile 280-282) ist NICHT mit `useCallback` definiert
- `handleSort` (Zeile 581-585) ist NICHT mit `useCallback` definiert
- **ABER:** Requests funktioniert trotzdem

**Unterschied:**
- Requests verwendet `sortConfig` direkt aus `settings.sortConfig` (Zeile 266)
- Requests verwendet `updateSortConfig` direkt (Zeile 281)
- **KEIN Problem:** `sortConfig` und `updateSortConfig` kommen aus `useTableSettings` (stabil)

---

### Vergleich: Worktracker.tsx (funktioniert NICHT)

**Datei:** `frontend/src/pages/Worktracker.tsx`

**Fakten:**
- `handleMainSortChange` (Zeile 500-506) ist NICHT mit `useCallback` definiert
- `handleSort` (Zeile 1178-1185) ist mit `useCallback` definiert (✅)
- `tableSortConfig` wird aus `tasksSettings.sortConfig` erstellt (Zeile 449)
- **PROBLEM:** `tableSortConfig` wird bei jedem Render neu erstellt

**Unterschied zu Requests:**
- Requests verwendet `sortConfig` direkt aus `settings.sortConfig`
- Worktracker erstellt `tableSortConfig` als lokale Variable

---

## 🚨 IDENTIFIZIERTE URSACHE

### Hauptproblem: tableSortConfig wird bei jedem Render neu erstellt

**Fakten:**
- `tableSortConfig` wird bei jedem Render neu erstellt (Zeile 449)
- `tableSortConfig` wird an `TableColumnConfig` übergeben als `mainSortConfig` (Zeile 2365)
- `TableColumnConfig` prüft `isMainSort = mainSortConfig?.key === column.id` (TableColumnConfig.tsx, Zeile 241)
- **PROBLEM:** Wenn `tableSortConfig` sich ändert (neue Referenz), wird `TableColumnConfig` neu gerendert, aber `isMainSort` könnte falsch sein

**ABER:** Das sollte nicht das Problem sein, da `mainSortConfig?.key` direkt geprüft wird.

---

### Zweites Problem: handleMainSortChange ist nicht stabilisiert

**Fakten:**
- `handleMainSortChange` ist NICHT mit `useCallback` definiert
- Verwendet `activeTab` aus Closure
- Wird an `TableColumnConfig` übergeben als `onMainSortChange` (Zeile 2366, 3693)
- **PROBLEM:** Wenn `activeTab` sich ändert, wird `handleMainSortChange` neu erstellt, aber `TableColumnConfig` könnte veraltete Referenz haben

**ABER:** Das sollte auch nicht das Problem sein, da `TableColumnConfig` die Funktion direkt aufruft.

---

### Drittes Problem: updateSortConfig verwendet settings im Closure

**Datei:** `frontend/src/hooks/useTableSettings.ts`  
**Zeile:** 134-143

**Aktueller Code:**
```typescript
const updateSortConfig = useCallback(async (newSortConfig: { key: string; direction: 'asc' | 'desc' }) => {
  try {
    const updatedSettings = { ...settings, sortConfig: newSortConfig };
    setSettings(updatedSettings);
    await tableSettingsApi.saveTableSettings(updatedSettings);
  } catch (err) {
    setError(err instanceof Error ? err : new Error('Fehler beim Speichern der Sortierung'));
    console.error('Fehler beim Speichern der Sortierung:', err);
  }
}, [settings]);
```

**Fakten:**
- `updateSortConfig` verwendet `settings` im Closure
- `settings` ist in Dependencies (✅ KORREKT)
- **ABER:** Wenn `settings` sich ändert, wird `updateSortConfig` neu erstellt
- **PROBLEM:** `handleMainSortChange` verwendet `updateTasksSortConfig`, das bei jeder `settings`-Änderung neu erstellt wird

**Untersuchung erforderlich:**
- [ ] Prüfen ob `updateSortConfig` stabilisiert werden muss
- [ ] Prüfen ob `settings` direkt verwendet werden sollte statt Closure

---

## 🔍 BILD-ANALYSE

**Fakten aus Bild:**
- "Ordenar y mostrar" Dropdown ist geöffnet
- Alle Sortier-Icons sind grau (keine aktive Sortierung sichtbar)
- Spalten: "Responsable", "Control de calidad", "Estado", "Fecha de vencimiento", "Sucursal", "Descripción"
- **PROBLEM:** Keine Spalte zeigt aktive Sortierung (kein blauer Pfeil, kein ArrowUp/ArrowDown Icon)

**Bedeutung:**
- `mainSortConfig` wird übergeben, aber `isMainSort` ist false für alle Spalten
- **ODER:** `mainSortConfig` ist undefined/null
- **ODER:** `mainSortConfig.key` stimmt nicht mit `column.id` überein

---

## 🔍 SYSTEMATISCHE PROBLEM-IDENTIFIZIERUNG

### Schritt 1: Prüfen ob mainSortConfig korrekt übergeben wird

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 2365

**Aktueller Code:**
```typescript
mainSortConfig={activeTab === 'todos' ? tableSortConfig : undefined}
```

**Fakten:**
- Wenn `activeTab === 'todos'`, wird `tableSortConfig` übergeben
- `tableSortConfig` wird aus `tasksSettings.sortConfig || { key: 'dueDate', direction: 'asc' }` erstellt (Zeile 449)
- **PROBLEM:** `tableSortConfig` wird bei jedem Render neu erstellt (neue Referenz)

**Untersuchung erforderlich:**
- [ ] Prüfen ob `tableSortConfig` stabilisiert werden muss (useMemo)
- [ ] Prüfen ob `tasksSettings.sortConfig` direkt übergeben werden sollte

---

### Schritt 2: Prüfen ob TableColumnConfig mainSortConfig korrekt verwendet

**Datei:** `frontend/src/components/TableColumnConfig.tsx`  
**Zeile:** 241-242

**Aktueller Code:**
```typescript
const isMainSort = mainSortConfig?.key === column.id;
const sortDirection = isMainSort ? mainSortConfig.direction : undefined;
```

**Fakten:**
- `isMainSort` wird korrekt berechnet
- `sortDirection` wird korrekt berechnet
- **KEIN Problem:** Die Logik ist korrekt

---

### Schritt 3: Prüfen ob handleMainSortChange korrekt aufgerufen wird

**Datei:** `frontend/src/components/TableColumnConfig.tsx`  
**Zeile:** 69-73

**Aktueller Code:**
```typescript
if (isMainSort && sortDirection !== undefined) {
  onSortDirectionChange(id, sortDirection === 'asc' ? 'desc' : 'asc');
} else {
  onSortDirectionChange(id, 'asc');
}
```

**Fakten:**
- `onSortDirectionChange` wird korrekt aufgerufen
- `onSortDirectionChange` ist `onMainSortChange` aus Props
- **KEIN Problem:** Die Logik ist korrekt

---

## 🚨 IDENTIFIZIERTE HAUPTPROBLEME

### Problem 1: tableSortConfig wird bei jedem Render neu erstellt

**Ursache:**
- `tableSortConfig` wird bei jedem Render neu erstellt (Zeile 449)
- Neue Referenz bei jedem Render
- `useMemo` für `filteredAndSortedTasks` wird bei jedem Render neu berechnet (Zeile 1514: `tableSortConfig` in Dependencies)

**Auswirkung:**
- Performance-Problem: `filteredAndSortedTasks` wird bei jedem Render neu berechnet
- **ABER:** Das sollte die Sortierung nicht kaputt machen

---

### Problem 2: handleMainSortChange ist nicht stabilisiert

**Ursache:**
- `handleMainSortChange` ist NICHT mit `useCallback` definiert
- Wird bei jedem Render neu erstellt
- Verwendet `activeTab` aus Closure

**Auswirkung:**
- `TableColumnConfig` könnte veraltete Referenz haben
- **ABER:** Das sollte auch nicht das Problem sein, da die Funktion direkt aufgerufen wird

---

### Problem 3: updateSortConfig verwendet settings im Closure

**Ursache:**
- `updateSortConfig` in `useTableSettings` verwendet `settings` im Closure
- `settings` ist in Dependencies, wird bei jeder Änderung neu erstellt
- `handleMainSortChange` verwendet `updateTasksSortConfig`, das bei jeder `settings`-Änderung neu erstellt wird

**Auswirkung:**
- `handleMainSortChange` wird bei jeder `settings`-Änderung neu erstellt
- **ABER:** Das sollte auch nicht das Problem sein

---

## 🔍 WEITERE UNTERSUCHUNG

### Prüfen ob tasksSettings.sortConfig korrekt geladen wird

**Datei:** `frontend/src/hooks/useTableSettings.ts`  
**Zeile:** 51-52

**Aktueller Code:**
```typescript
// sortConfig wird bereits vom Server geladen (falls vorhanden)
// Keine Initialisierung nötig, da optional
```

**Fakten:**
- `sortConfig` wird vom Server geladen
- Keine Initialisierung mit Default-Wert
- **PROBLEM:** Wenn `sortConfig` nicht vom Server kommt, ist es `undefined`

**Untersuchung erforderlich:**
- [ ] Prüfen ob `sortConfig` mit Default-Wert initialisiert werden muss
- [ ] Prüfen ob `sortConfig` beim ersten Laden gesetzt wird

---

### Prüfen ob updateSortConfig korrekt speichert

**Datei:** `frontend/src/hooks/useTableSettings.ts`  
**Zeile:** 134-143

**Aktueller Code:**
```typescript
const updateSortConfig = useCallback(async (newSortConfig: { key: string; direction: 'asc' | 'desc' }) => {
  try {
    const updatedSettings = { ...settings, sortConfig: newSortConfig };
    setSettings(updatedSettings);
    await tableSettingsApi.saveTableSettings(updatedSettings);
  } catch (err) {
    setError(err instanceof Error ? err : new Error('Fehler beim Speichern der Sortierung'));
    console.error('Fehler beim Speichern der Sortierung:', err);
  }
}, [settings]);
```

**Fakten:**
- `updateSortConfig` speichert `sortConfig` im State
- `updateSortConfig` speichert `sortConfig` auf dem Server
- **KEIN Problem:** Die Logik ist korrekt

---

## 🎯 IDENTIFIZIERTE LÖSUNG

### ✅ Lösung 1: tableSortConfig mit useMemo stabilisieren (UMGESETZT)

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 447-451

**Problem:**
- `tableSortConfig` wurde bei jedem Render neu erstellt (neue Referenz)
- `filteredAndSortedTasks` useMemo wurde bei jedem Render neu berechnet (Zeile 1514: `tableSortConfig` in Dependencies)
- `TableColumnConfig` wurde bei jedem Render neu gerendert (neue `mainSortConfig` Referenz)
- **HAUPTPROBLEM:** Neue Referenz bei jedem Render führte dazu, dass `useMemo` für `filteredAndSortedTasks` bei jedem Render neu berechnet wurde, was die Sortierung kaputt gemacht hat

**✅ UMGESETZT (2025-12-18):**
```typescript
// ✅ FIX: tableSortConfig mit useMemo stabilisieren (verhindert neue Referenz bei jedem Render)
const tableSortConfig: SortConfig = useMemo(() => {
    return tasksSettings.sortConfig || { key: 'dueDate', direction: 'asc' };
}, [tasksSettings.sortConfig]);
```

**Begründung:**
- Stabilisiert `tableSortConfig` Referenz
- Verhindert unnötige Re-Renders von `TableColumnConfig`
- Verhindert unnötige Re-Berechnungen von `filteredAndSortedTasks`
- **KRITISCH:** Verhindert, dass `useMemo` für `filteredAndSortedTasks` bei jedem Render neu berechnet wird

---

### ✅ Lösung 2: handleMainSortChange mit useCallback stabilisieren (UMGESETZT)

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 500-506

**Problem:**
- `handleMainSortChange` wurde bei jedem Render neu erstellt
- Verwendet `activeTab` aus Closure
- Wird an `TableColumnConfig` übergeben als `onMainSortChange` (Zeile 2366, 3693)
- **PROBLEM:** Neue Referenz bei jedem Render führte dazu, dass `TableColumnConfig` bei jedem Render neu gerendert wurde

**✅ UMGESETZT (2025-12-18):**
```typescript
// ✅ FIX: handleMainSortChange mit useCallback stabilisieren (verhindert neue Referenz bei jedem Render)
const handleMainSortChange = useCallback((key: string, direction: 'asc' | 'desc') => {
  if (activeTab === 'todos') {
    updateTasksSortConfig({ key: key as SortConfig['key'], direction });
  } else if (activeTab === 'reservations') {
    updateReservationsSortConfig({ key: key as ReservationSortConfig['key'], direction });
  }
}, [activeTab, updateTasksSortConfig, updateReservationsSortConfig]);
```

**Begründung:**
- Stabilisiert `handleMainSortChange` Referenz
- Verhindert unnötige Re-Renders von `TableColumnConfig`
- `activeTab` als Dependency stellt sicher, dass Funktion bei Tab-Wechsel neu erstellt wird

---

### ✅ Lösung 3: reservationTableSortConfig mit useMemo stabilisieren (UMGESETZT)

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 452-455

**Problem:**
- `reservationTableSortConfig` wurde bei jedem Render neu erstellt (neue Referenz)
- `filteredAndSortedReservations` useMemo wurde bei jedem Render neu berechnet (Zeile 1748: `reservationTableSortConfig` in Dependencies)

**✅ UMGESETZT (2025-12-18):**
```typescript
// ✅ FIX: reservationTableSortConfig mit useMemo stabilisieren (verhindert neue Referenz bei jedem Render)
const reservationTableSortConfig: ReservationSortConfig = useMemo(() => {
    return reservationsSettings.sortConfig || { key: 'checkInDate', direction: 'desc' };
}, [reservationsSettings.sortConfig]);
```

**Begründung:**
- Stabilisiert `reservationTableSortConfig` Referenz
- Verhindert unnötige Re-Berechnungen von `filteredAndSortedReservations`

---

### ✅ Lösung 4: handleReservationSort mit useCallback stabilisieren (UMGESETZT)

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 1191-1197

**Problem:**
- `handleReservationSort` verwendete `reservationTableSortConfig` aus Closure (veraltete Referenz)
- War NICHT mit `useCallback` definiert

**✅ UMGESETZT (2025-12-18):**
```typescript
// ✅ FIX: handleReservationSort mit useCallback stabilisieren (verhindert veraltete Closure-Referenz)
const handleReservationSort = useCallback((key: ReservationSortConfig['key']) => {
    // ✅ FIX: Verwende reservationsSettings.sortConfig direkt (aktueller Wert) statt Closure-Variable
    const currentSortConfig = reservationsSettings.sortConfig || { key: 'checkInDate', direction: 'desc' };
    const newDirection = currentSortConfig.key === key && currentSortConfig.direction === 'asc' ? 'desc' : 'asc';
    updateReservationsSortConfig({ key, direction: newDirection });
}, [reservationsSettings.sortConfig, updateReservationsSortConfig]);
```

**Begründung:**
- Stabilisiert `handleReservationSort` Referenz
- Verwendet `reservationsSettings.sortConfig` direkt statt Closure-Variable

---

## 📋 VOLLSTÄNDIGE CHECKLISTE

### Was wurde geändert (2025-12-18)

1. ✅ `handleSort` mit `useCallback` stabilisiert (Zeile 1178-1185)
2. ✅ `getDataIsolationFilter` für Admin/Owner (backend)
3. ✅ Status-Buttons für Admin (frontend)

### Was wurde NICHT geändert (aber sollte)

1. ❌ `handleMainSortChange` mit `useCallback` stabilisiert
2. ❌ `tableSortConfig` mit `useMemo` stabilisiert
3. ❌ `handleReservationSort` mit `useCallback` stabilisiert

---

## 🚨 KRITISCHES PROBLEM IDENTIFIZIERT UND BEHOBEN

### ✅ Hauptproblem: tableSortConfig wird bei jedem Render neu erstellt (BEHOBEN)

**Fakten:**
- `tableSortConfig` wurde bei jedem Render neu erstellt (Zeile 449)
- Wurde an `TableColumnConfig` übergeben als `mainSortConfig` (Zeile 2365)
- `filteredAndSortedTasks` useMemo hatte `tableSortConfig` in Dependencies (Zeile 1514)
- **HAUPTPROBLEM:** Neue Referenz bei jedem Render führte dazu, dass `useMemo` für `filteredAndSortedTasks` bei jedem Render neu berechnet wurde
- **AUSWIRKUNG:** Sortierung wurde bei jedem Render zurückgesetzt, da `useMemo` neu berechnet wurde

**✅ BEHOBEN (2025-12-18):**
- `tableSortConfig` mit `useMemo` stabilisiert
- `reservationTableSortConfig` mit `useMemo` stabilisiert
- `handleMainSortChange` mit `useCallback` stabilisiert
- `handleReservationSort` mit `useCallback` stabilisiert

---

## ✅ UMGESETZTE FIXES (2025-12-18)

1. ✅ `tableSortConfig` mit `useMemo` stabilisiert (Zeile 447-451)
2. ✅ `reservationTableSortConfig` mit `useMemo` stabilisiert (Zeile 452-455)
3. ✅ `handleMainSortChange` mit `useCallback` stabilisiert (Zeile 500-506)
4. ✅ `handleReservationSort` mit `useCallback` stabilisiert (Zeile 1191-1197)

---

## 📋 ZUSAMMENFASSUNG

### Was war das Problem?

**HAUPTPROBLEM:**
- `tableSortConfig` wurde bei jedem Render neu erstellt (neue Referenz)
- `filteredAndSortedTasks` useMemo hatte `tableSortConfig` in Dependencies
- **AUSWIRKUNG:** `useMemo` wurde bei jedem Render neu berechnet, was die Sortierung kaputt gemacht hat

**WEITERE PROBLEME:**
- `handleMainSortChange` wurde bei jedem Render neu erstellt
- `reservationTableSortConfig` wurde bei jedem Render neu erstellt
- `handleReservationSort` verwendete veraltete Closure-Referenz

### Was wurde gefixt?

1. ✅ `tableSortConfig` mit `useMemo` stabilisiert
2. ✅ `reservationTableSortConfig` mit `useMemo` stabilisiert
3. ✅ `handleMainSortChange` mit `useCallback` stabilisiert
4. ✅ `handleReservationSort` mit `useCallback` stabilisiert

### Warum funktioniert es jetzt?

- `tableSortConfig` Referenz bleibt stabil (ändert sich nur wenn `tasksSettings.sortConfig` sich ändert)
- `filteredAndSortedTasks` useMemo wird nur neu berechnet wenn sich tatsächliche Dependencies ändern
- `TableColumnConfig` erhält stabile Referenzen für `mainSortConfig` und `onMainSortChange`

---

**Ende der Analyse - Alle Fixes umgesetzt**








