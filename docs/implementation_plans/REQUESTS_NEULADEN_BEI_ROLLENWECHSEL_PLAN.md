# Implementierungsplan: Requests-Liste bei Rollenwechsel neu laden

**Datum:** 2025-01-31  
**Status:** Bereit zur Implementierung  
**Priorität:** 🔴 HOCH

---

## Ziel

Requests-Liste (und andere Listen) sollen sich **sofort** nach einem Rollenwechsel anpassen, ohne dass der User die Seite manuell neu laden muss.

---

## Standards und Best Practices

### 1. Filter-Standard (FILTER_STANDARD_DEFINITION.md)
- ✅ Default-Filter muss bei Reload zurückgesetzt werden
- ✅ Standard-Pattern: `await loadFilters()` → Default-Filter anwenden → Daten laden

### 2. Memory Leaks (MEMORY_LEAKS_UND_PERFORMANCE_FIXES_2025-12-11.md)
- ✅ **KEINE State-Dependencies in `useCallback`** → `useRef` verwenden
- ✅ **KEINE unnötigen Re-Creations** → Dependencies minimieren
- ✅ **IntersectionObserver** muss in Cleanup `disconnect()`ed werden

### 3. Sortierung (SORTIERUNG_UND_INFINITE_SCROLL_STANDARD.md)
- ✅ Bei Reload: Komplett neu laden (kein `append`)
- ✅ `offset = 0` setzen
- ✅ Sortierung bleibt erhalten (wird über `useTableSettings` persistiert)

### 4. Performance
- ✅ Nur neu laden, wenn sich `organizationId` tatsächlich ändert
- ✅ Nicht bei jedem User-Update neu laden
- ✅ Loading-State während Reload anzeigen

---

## Implementierung: Requests.tsx

### Schritt 1: usePermissions Hook erweitern

**Aktuell (Zeile 236):**
```typescript
const { hasPermission } = usePermissions();
```

**Änderung:**
```typescript
const { hasPermission, currentRole } = usePermissions();
```

**Grund:**
- `currentRole` wird benötigt, um Rollenwechsel zu erkennen
- `currentRole?.id` als Dependency für `useEffect`

---

### Schritt 2: useEffect für Rollenwechsel hinzufügen

**Position:** Nach dem initialen `useEffect` (nach Zeile 772)

**Code:**
```typescript
// ✅ ROLLENWECHSEL: Reagiere auf Rollenwechsel und lade Requests neu
useEffect(() => {
  // Nur neu laden wenn:
  // 1. Initial Load bereits erfolgt ist (initialLoadAttemptedRef.current === true)
  // 2. currentRole vorhanden ist
  // 3. currentRole sich geändert hat (durch Dependency)
  if (!initialLoadAttemptedRef.current || !currentRole) {
    return;
  }
  
  const reload = async () => {
    try {
      // 1. Filter laden (wartet auf State-Update)
      const filters = await loadFilters(REQUESTS_TABLE_ID);
      
      // 2. Default-Filter anwenden (zurücksetzen auf Default)
      const defaultFilter = filters.find(f => f.name === 'Aktuell');
      if (defaultFilter) {
        await handleFilterChange(
          defaultFilter.name,
          defaultFilter.id,
          defaultFilter.conditions,
          defaultFilter.operators
        );
        return; // Daten werden durch handleFilterChange geladen
      }
      
      // 3. Fallback: Daten ohne Filter laden (sollte nie passieren)
      await fetchRequests(undefined, undefined, false, 20, 0);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Requests] Fehler beim Neuladen nach Rollenwechsel:', error);
      }
    }
  };
  
  reload();
}, [currentRole?.id, loadFilters, handleFilterChange, fetchRequests]);
```

**Wichtig:**
- `initialLoadAttemptedRef.current` prüfen → verhindert doppeltes initiales Laden
- `currentRole?.id` als Dependency → nur bei Rollenwechsel neu laden
- Filter auf Default zurücksetzen → wie gewünscht
- `append = false, offset = 0` → komplett neu laden

**ABER:** `loadFilters`, `handleFilterChange`, `fetchRequests` als Dependencies könnten zu Problemen führen!

---

### Schritt 3: Dependencies optimieren (Memory Leaks vermeiden)

**Problem:**
- `handleFilterChange` und `fetchRequests` sind `useCallback` ohne Dependencies
- `loadFilters` kommt aus Context → könnte sich ändern

**Lösung:**
- `loadFilters` aus Context ist stabil (wird nicht neu erstellt)
- `handleFilterChange` und `fetchRequests` sind bereits stabil (keine Dependencies)
- **ABER:** ESLint wird warnen → Dependencies explizit machen

**Optimierte Version:**
```typescript
// ✅ ROLLENWECHSEL: Reagiere auf Rollenwechsel und lade Requests neu
useEffect(() => {
  // Nur neu laden wenn:
  // 1. Initial Load bereits erfolgt ist (initialLoadAttemptedRef.current === true)
  // 2. currentRole vorhanden ist
  // 3. currentRole sich geändert hat (durch Dependency)
  if (!initialLoadAttemptedRef.current || !currentRole) {
    return;
  }
  
  const reload = async () => {
    try {
      // 1. Filter laden (wartet auf State-Update)
      const filters = await loadFilters(REQUESTS_TABLE_ID);
      
      // 2. Default-Filter anwenden (zurücksetzen auf Default)
      const defaultFilter = filters.find(f => f.name === 'Aktuell');
      if (defaultFilter) {
        await handleFilterChange(
          defaultFilter.name,
          defaultFilter.id,
          defaultFilter.conditions,
          defaultFilter.operators
        );
        return; // Daten werden durch handleFilterChange geladen
      }
      
      // 3. Fallback: Daten ohne Filter laden (sollte nie passieren)
      await fetchRequests(undefined, undefined, false, 20, 0);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Requests] Fehler beim Neuladen nach Rollenwechsel:', error);
      }
    }
  };
  
  reload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [currentRole?.id]); // ✅ Nur currentRole?.id als Dependency - loadFilters, handleFilterChange, fetchRequests sind stabil
```

**Grund:**
- `loadFilters`, `handleFilterChange`, `fetchRequests` sind stabil (keine State-Dependencies)
- ESLint-Warnung wird mit Kommentar unterdrückt
- Nur `currentRole?.id` als Dependency → minimale Re-Renders

---

## Implementierung: Worktracker.tsx (Tasks)

### Schritt 1: usePermissions Hook erweitern

**Aktuell (Zeile 270):**
```typescript
const { hasPermission, permissions, isAdmin } = usePermissions();
```

**Änderung:**
```typescript
const { hasPermission, permissions, isAdmin, currentRole } = usePermissions();
```

---

### Schritt 2: useEffect für Rollenwechsel hinzufügen

**Position:** Nach dem initialen `useEffect` für Tasks

**Code:**
```typescript
// ✅ ROLLENWECHSEL: Reagiere auf Rollenwechsel und lade Tasks neu
useEffect(() => {
  // Nur neu laden wenn:
  // 1. Initial Load bereits erfolgt ist (hasLoadedRef.current === true)
  // 2. currentRole vorhanden ist
  // 3. currentRole sich geändert hat (durch Dependency)
  if (!hasLoadedRef.current || !currentRole) {
    return;
  }
  
  const reload = async () => {
    try {
      // 1. Filter laden (wartet auf State-Update)
      const filters = await loadFilters(TODOS_TABLE_ID);
      
      // 2. Default-Filter anwenden (zurücksetzen auf Default)
      const defaultFilter = filters.find(f => f.name === 'Aktuell');
      if (defaultFilter) {
        await handleFilterChange(
          defaultFilter.name,
          defaultFilter.id,
          defaultFilter.conditions,
          defaultFilter.operators
        );
        return; // Daten werden durch handleFilterChange geladen
      }
      
      // 3. Fallback: Daten ohne Filter laden (sollte nie passieren)
      await loadTasks(undefined, undefined, false, 20, 0);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Worktracker Tasks] Fehler beim Neuladen nach Rollenwechsel:', error);
      }
    }
  };
  
  reload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [currentRole?.id]); // ✅ Nur currentRole?.id als Dependency
```

**Wichtig:**
- `TODOS_TABLE_ID` muss definiert sein (vermutlich `'worktracker-todos'`)
- `hasLoadedRef` muss vorhanden sein (vermutlich bereits vorhanden)
- `handleFilterChange` muss vorhanden sein (vermutlich `applyFilterConditions`)

---

## Implementierung: Worktracker.tsx (Reservations)

### Schritt 1: usePermissions Hook erweitern

**Bereits erledigt** (siehe Tasks)

---

### Schritt 2: useEffect für Rollenwechsel hinzufügen

**Position:** Nach dem initialen `useEffect` für Reservations

**Code:**
```typescript
// ✅ ROLLENWECHSEL: Reagiere auf Rollenwechsel und lade Reservations neu
useEffect(() => {
  // Nur neu laden wenn:
  // 1. Initial Load bereits erfolgt ist (reservationsHasLoadedRef.current === true)
  // 2. currentRole vorhanden ist
  // 3. currentRole sich geändert hat (durch Dependency)
  if (!reservationsHasLoadedRef.current || !currentRole) {
    return;
  }
  
  const reload = async () => {
    try {
      // 1. Filter laden (wartet auf State-Update)
      const filters = await loadFilters(RESERVATIONS_TABLE_ID);
      
      // 2. Default-Filter anwenden (zurücksetzen auf Default)
      const defaultFilter = filters.find(f => f.name === 'Hoy');
      if (defaultFilter) {
        await handleReservationFilterChange(
          defaultFilter.name,
          defaultFilter.id,
          defaultFilter.conditions,
          defaultFilter.operators
        );
        return; // Daten werden durch handleReservationFilterChange geladen
      }
      
      // 3. Fallback: Daten ohne Filter laden (sollte nie passieren)
      await loadReservations(undefined, undefined, undefined, false, 20, 0);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Worktracker Reservations] Fehler beim Neuladen nach Rollenwechsel:', error);
      }
    }
  };
  
  reload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [currentRole?.id]); // ✅ Nur currentRole?.id als Dependency
```

**Wichtig:**
- `RESERVATIONS_TABLE_ID` muss definiert sein (vermutlich `'worktracker-reservations'`)
- `reservationsHasLoadedRef` muss vorhanden sein (muss geprüft werden)
- `handleReservationFilterChange` muss vorhanden sein (muss geprüft werden)
- Default-Filter für Reservations ist `'Hoy'` (nicht `'Aktuell'`)

---

## Test-Szenarien

### Test 1: Rollenwechsel zu anderer Organisation

**Schritte:**
1. User mit Rolle "Admin" (Org 1) → sieht Requests von Org 1
2. Wechsel zu Rolle "Admin" (Org 2) → sollte Requests von Org 2 sehen
3. **Erwartung:** Liste aktualisiert sich sofort, zeigt Requests von Org 2

**Validierung:**
- ✅ Requests-Liste zeigt korrekte Requests
- ✅ Filter ist auf "Aktuell" (Default) zurückgesetzt
- ✅ Kein doppeltes Laden beim initialen Mount

---

### Test 2: Rollenwechsel innerhalb derselben Organisation

**Schritte:**
1. User mit Rolle "Admin" (Org 1) → sieht Requests von Org 1
2. Wechsel zu Rolle "Hamburger" (Org 1) → sollte Requests von Org 1 sehen
3. **Erwartung:** Liste bleibt gleich (gleiche Organisation), aber wird neu geladen

**Validierung:**
- ✅ Requests-Liste zeigt korrekte Requests (gleiche wie vorher)
- ✅ Filter ist auf "Aktuell" (Default) zurückgesetzt
- ⚠️ **Performance:** Wird unnötig neu geladen, aber akzeptabel

**Optimierung (optional):**
- Prüfen ob `organizationId` sich geändert hat
- Nur neu laden, wenn `organizationId` sich geändert hat
- **ABER:** `organizationId` ist nicht direkt verfügbar → müsste aus `currentRole` abgeleitet werden

---

### Test 3: Initiales Laden

**Schritte:**
1. Seite öffnen → Requests werden geladen
2. **Erwartung:** Kein doppeltes Laden

**Validierung:**
- ✅ `initialLoadAttemptedRef.current` verhindert doppeltes Laden
- ✅ Nur ein API-Call zum Backend

---

### Test 4: Filter bleibt nicht erhalten (wie gewünscht)

**Schritte:**
1. User wählt Filter "Archiv"
2. Wechselt Rolle
3. **Erwartung:** Filter wird auf "Aktuell" (Default) zurückgesetzt

**Validierung:**
- ✅ Filter ist auf "Aktuell" (Default)
- ✅ Requests entsprechen Default-Filter

---

## Risiken und Mitigation

### Risiko 1: Doppeltes Laden beim initialen Mount

**Problem:**
- Initialer `useEffect` lädt Daten
- `currentRole` ändert sich → zweiter `useEffect` lädt erneut

**Mitigation:**
- ✅ `initialLoadAttemptedRef.current` prüfen
- ✅ Nur neu laden, wenn `initialLoadAttemptedRef.current === true`

**Status:** ✅ Abgedeckt

---

### Risiko 2: Memory Leaks durch häufige Reloads

**Problem:**
- Bei jedem `currentRole`-Update wird neu geladen
- Könnte zu Memory Leaks führen

**Mitigation:**
- ✅ `currentRole?.id` als Dependency (nicht `currentRole` direkt)
- ✅ Nur bei tatsächlichem Rollenwechsel (neue ID) neu laden
- ✅ `fetchRequests` bleibt ohne Dependencies (wie aktuell)

**Status:** ✅ Abgedeckt

---

### Risiko 3: Race Conditions

**Problem:**
- Mehrere Reloads gleichzeitig
- Filter-Laden und Daten-Laden parallel

**Mitigation:**
- ✅ `await` verwenden → sequentielle Ausführung
- ✅ Standard-Pattern befolgen → klare Reihenfolge

**Status:** ✅ Abgedeckt

---

### Risiko 4: ESLint-Warnungen

**Problem:**
- ESLint warnt wegen fehlender Dependencies

**Mitigation:**
- ✅ `eslint-disable-next-line react-hooks/exhaustive-deps` Kommentar
- ✅ Begründung im Kommentar

**Status:** ✅ Abgedeckt

---

## Implementierungsreihenfolge

1. ✅ **Requests.tsx** - Hauptkomponente, direktes Problem
2. ✅ **Worktracker.tsx (Tasks)** - Gleiches Problem, gleiche Lösung
3. ✅ **Worktracker.tsx (Reservations)** - Gleiches Problem, gleiche Lösung
4. ⚠️ **Weitere Komponenten** - Prüfen und ggf. gleiche Lösung anwenden

---

## Checkliste vor Implementierung

- [ ] `currentRole` aus `usePermissions` verfügbar?
- [ ] `initialLoadAttemptedRef` vorhanden?
- [ ] `loadFilters` aus FilterContext verfügbar?
- [ ] `handleFilterChange` vorhanden?
- [ ] `fetchRequests` / `loadTasks` / `loadReservations` vorhanden?
- [ ] Default-Filter-Name bekannt? (`'Aktuell'` für Requests/Tasks, `'Hoy'` für Reservations)
- [ ] Table ID bekannt? (`'requests-table'`, `'worktracker-todos'`, `'worktracker-reservations'`)

---

## Zusammenfassung

**Problem:**
- Requests-Liste passt sich nicht sofort nach Rollenwechsel an

**Lösung:**
- `useEffect` mit `currentRole?.id` als Dependency hinzufügen
- Filter auf Default zurücksetzen
- Daten neu laden mit Default-Filter

**Standards:**
- ✅ Filter-Standard: Default-Filter zurücksetzen
- ✅ Memory Leaks: Keine State-Dependencies in `useCallback`
- ✅ Sortierung: Komplett neu laden (kein append)
- ✅ Performance: Nur bei tatsächlichem Rollenwechsel neu laden

**Nächste Schritte:**
1. Implementierung in Requests.tsx
2. Tests durchführen
3. Gleiche Lösung in Worktracker.tsx anwenden
4. Weitere betroffene Komponenten prüfen

