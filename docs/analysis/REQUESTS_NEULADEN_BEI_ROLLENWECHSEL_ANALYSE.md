# Analyse: Requests-Liste passt sich nicht sofort nach Rollenwechsel an

**Datum:** 2025-01-31  
**Status:** Analyse abgeschlossen  
**Priorität:** 🔴 HOCH - UX-Problem

---

## Problem-Beschreibung

**Symptom:**
- Beim Wechsel der Rolle (und damit Organisation) passt sich die Requests-Liste erst nach manuellem Neuladen der Seite an
- Die Liste zeigt weiterhin Requests der alten Organisation an
- Erst nach F5/Reload werden die korrekten Requests der neuen Organisation angezeigt

**User-Impact:**
- Schlechte User Experience - User muss Seite manuell neu laden
- Verwirrung - User sieht falsche Daten nach Rollenwechsel
- Inkonsistentes Verhalten - Branches wechseln sofort, Requests nicht

---

## Ursachen-Analyse

### 1. Fehlende Reaktivität auf Rollenwechsel

**Datei:** `frontend/src/components/Requests.tsx`

**Aktueller Code (Zeile 734-772):**
```typescript
useEffect(() => {
  // ✅ FIX: Verhindere mehrfache Ausführung
  if (initialLoadAttemptedRef.current) {
    return;
  }
  
  const initialize = async () => {
    initialLoadAttemptedRef.current = true;
    
    try {
      // 1. Filter laden (wartet auf State-Update)
      const filters = await loadFilters(REQUESTS_TABLE_ID);
      
      // 2. Default-Filter anwenden (IMMER vorhanden!)
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
      initialLoadAttemptedRef.current = false;
      if (process.env.NODE_ENV === 'development') {
        console.error('[Requests] Fehler beim Initialisieren:', error);
      }
    }
  };
  
  initialize();
}, []); // ✅ FIX: Leere Dependencies wie im Standard-Pattern geplant
```

**Problem:**
- `useEffect` hat **leere Dependencies `[]`** → läuft nur beim initialen Mount
- Keine Reaktion auf Änderungen von `user` oder `currentRole`
- `initialLoadAttemptedRef.current` verhindert erneutes Laden

**Verwendete Hooks (Zeile 235-236):**
```typescript
const { user } = useAuth();
const { hasPermission } = usePermissions();
```

**ABER:** `user` und `currentRole` werden **nicht als Dependencies** verwendet!

---

### 2. Backend-Filterung basiert auf aktiver Rolle

**Datei:** `backend/src/middleware/organization.ts`

**Aktueller Code:**
- `organizationMiddleware` setzt `req.organizationId` und `req.branchId` basierend auf aktiver Rolle (`lastUsed: true`)
- Diese Werte werden aus `organizationCache` gelesen (Zeile 26)
- Cache wird beim Rollenwechsel aktualisiert (siehe `userController.ts`)

**Datei:** `backend/src/controllers/requestController.ts`

**Aktueller Code (Zeile 62-195):**
- `getAllRequests` filtert Requests basierend auf `req.organizationId` und `req.branchId`
- Filterung erfolgt **server-seitig** - Frontend muss neu laden, um neue Daten zu erhalten

**Fazit:**
- Backend filtert korrekt nach Organisation/Branch
- Frontend lädt Daten aber nicht neu, wenn sich Rolle ändert

---

### 3. Vergleich: Wie funktioniert es bei Branches?

**Datei:** `frontend/src/components/Header.tsx`

**Aktueller Code (Zeile 109-132):**
```typescript
const handleBranchSwitch = async (branchId: number) => {
  try {
    const response = await axiosInstance.put('/branches/switch', { branchId });
    
    if (response.data && response.data.success) {
      // Branch-Wechsel erfolgreich - aktualisiere Context
      setSelectedBranch(branchId);
      
      // Lade Branches neu, um lastUsed-Flag zu aktualisieren
      await loadBranches();
      
      setIsBranchSubMenuOpen(false);
      setIsProfileMenuOpen(false);
      showMessage(t('header.branchSwitched', { defaultValue: 'Standort erfolgreich gewechselt' }), 'success');
    } else {
      throw new Error('Branch-Wechsel fehlgeschlagen');
    }
  } catch (error: any) {
    console.error('Fehler beim Branch-Wechsel:', error);
    const errorMessage = error.response?.data?.message || error.message || t('header.branchSwitchError', { defaultValue: 'Fehler beim Wechseln der Niederlassung' });
    showMessage(errorMessage, 'error');
  }
};
```

**Unterschied:**
- Branch-Wechsel aktualisiert `BranchContext` → andere Komponenten reagieren darauf
- Rollenwechsel aktualisiert `AuthContext` → aber Requests-Komponente reagiert nicht

---

## Betroffene Komponenten

### 1. Requests.tsx ✅ IDENTIFIZIERT
- **Problem:** Lädt nur beim Mount
- **Lösung:** `useEffect` mit `currentRole?.id` als Dependency

### 2. Worktracker.tsx (Tasks) ⚠️ VERMUTET
- **Status:** Noch nicht geprüft
- **Vermutung:** Gleiches Problem wie Requests
- **Aktion:** Prüfen und ggf. gleiche Lösung anwenden

### 3. Worktracker.tsx (Reservations) ⚠️ VERMUTET
- **Status:** Noch nicht geprüft
- **Vermutung:** Gleiches Problem wie Requests
- **Aktion:** Prüfen und ggf. gleiche Lösung anwenden

### 4. Weitere Listen ⚠️ ZU PRÜFEN
- Clients (Consultations)
- Worktime-Listen
- Alle anderen datenabhängigen Listen

---

## Standards und Best Practices

### 1. Filter-Standard (FILTER_STANDARD_DEFINITION.md)

**Regel:**
- Default-Filter muss bei Reload zurückgesetzt werden
- Standard-Pattern: `await loadFilters()` → Default-Filter anwenden → Daten laden

**Anwendung:**
- Bei Rollenwechsel: Filter auf Default zurücksetzen
- Dann Default-Filter anwenden → Daten laden

### 2. Memory Leaks (MEMORY_LEAKS_UND_PERFORMANCE_FIXES_2025-12-11.md)

**Regel:**
- **KEINE State-Dependencies in `useCallback`** → `useRef` verwenden
- **KEINE unnötigen Re-Creations** → Dependencies minimieren
- **IntersectionObserver** muss in Cleanup `disconnect()`ed werden

**Anwendung:**
- `currentRole?.id` als Dependency in `useEffect` (nicht in `useCallback`)
- `fetchRequests` bleibt ohne Dependencies (wie aktuell)
- IntersectionObserver Cleanup bleibt unverändert

### 3. Sortierung (SORTIERUNG_UND_INFINITE_SCROLL_STANDARD.md)

**Regel:**
- Bei Reload: Komplett neu laden (kein `append`)
- `offset = 0` setzen
- Sortierung bleibt erhalten (wird über `useTableSettings` persistiert)

**Anwendung:**
- Bei Rollenwechsel: `fetchRequests(..., false, 20, 0)` (append = false, offset = 0)

### 4. Performance

**Regel:**
- Nur neu laden, wenn sich `organizationId` oder `branchId` tatsächlich ändert
- Nicht bei jedem User-Update neu laden
- Loading-State während Reload anzeigen

**Anwendung:**
- Dependency: `currentRole?.id` (nicht `user` direkt)
- Prüfen: Hat sich `organizationId` geändert? → Nur dann neu laden

---

## Lösungskonzept

### Option 1: useEffect mit currentRole Dependency (EMPFOHLEN)

**Vorteile:**
- Einfach und direkt
- Folgt React Best Practices
- Keine zusätzliche Komplexität

**Implementierung:**
```typescript
const { currentRole } = usePermissions();

useEffect(() => {
  // Nur neu laden wenn:
  // 1. Initial Load bereits erfolgt ist
  // 2. currentRole vorhanden ist
  // 3. currentRole sich geändert hat (durch Dependency)
  if (!initialLoadAttemptedRef.current || !currentRole) {
    return;
  }
  
  const reload = async () => {
    try {
      // 1. Filter laden
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
        return;
      }
      
      // 3. Fallback: Daten ohne Filter laden
      await fetchRequests(undefined, undefined, false, 20, 0);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Requests] Fehler beim Neuladen nach Rollenwechsel:', error);
      }
    }
  };
  
  reload();
}, [currentRole?.id]); // ✅ Dependency: currentRole?.id
```

**Wichtig:**
- `initialLoadAttemptedRef.current` prüfen → verhindert doppeltes initiales Laden
- `currentRole?.id` als Dependency → nur bei Rollenwechsel neu laden
- Filter auf Default zurücksetzen → wie gewünscht

### Option 2: Event-basiertes System

**Vorteile:**
- Entkopplung
- Flexibel erweiterbar

**Nachteile:**
- Mehr Boilerplate
- Zusätzliche Komplexität
- Nicht nötig für dieses Problem

**Fazit:** Option 1 ist ausreichend und einfacher

---

## Risiken und Mitigation

### Risiko 1: Doppeltes Laden beim initialen Mount

**Problem:**
- Initialer `useEffect` lädt Daten
- `currentRole` ändert sich → zweiter `useEffect` lädt erneut

**Mitigation:**
- `initialLoadAttemptedRef.current` prüfen
- Nur neu laden, wenn `initialLoadAttemptedRef.current === true`

### Risiko 2: Memory Leaks durch häufige Reloads

**Problem:**
- Bei jedem `currentRole`-Update wird neu geladen
- Könnte zu Memory Leaks führen

**Mitigation:**
- `currentRole?.id` als Dependency (nicht `currentRole` direkt)
- Nur bei tatsächlichem Rollenwechsel (neue ID) neu laden
- `fetchRequests` bleibt ohne Dependencies (wie aktuell)

### Risiko 3: Race Conditions

**Problem:**
- Mehrere Reloads gleichzeitig
- Filter-Laden und Daten-Laden parallel

**Mitigation:**
- `await` verwenden → sequentielle Ausführung
- Standard-Pattern befolgen → klare Reihenfolge

---

## Implementierungsplan

### Phase 1: Requests.tsx

1. ✅ `usePermissions` Hook erweitern: `currentRole` holen
2. ✅ `useEffect` hinzufügen: Reaktion auf `currentRole?.id`
3. ✅ Filter auf Default zurücksetzen
4. ✅ Daten neu laden mit Default-Filter
5. ✅ Tests: Rollenwechsel → Requests-Liste aktualisiert sich

### Phase 2: Worktracker.tsx (Tasks)

1. ✅ Gleiche Lösung anwenden
2. ✅ Tests: Rollenwechsel → Tasks-Liste aktualisiert sich

### Phase 3: Worktracker.tsx (Reservations)

1. ✅ Gleiche Lösung anwenden
2. ✅ Tests: Rollenwechsel → Reservations-Liste aktualisiert sich

### Phase 4: Weitere Komponenten

1. ⚠️ Prüfen: Welche weiteren Komponenten sind betroffen?
2. ⚠️ Gleiche Lösung anwenden
3. ⚠️ Tests: Alle Listen aktualisieren sich korrekt

---

## Test-Szenarien

### Test 1: Rollenwechsel innerhalb derselben Organisation

**Schritte:**
1. User mit Rolle "Admin" (Org 1) → sieht Requests von Org 1
2. Wechsel zu Rolle "Hamburger" (Org 1) → sollte Requests von Org 1 sehen
3. **Erwartung:** Liste bleibt gleich (gleiche Organisation)

**Status:** ⚠️ Zu prüfen - könnte unnötig neu laden

### Test 2: Rollenwechsel zu anderer Organisation

**Schritte:**
1. User mit Rolle "Admin" (Org 1) → sieht Requests von Org 1
2. Wechsel zu Rolle "Admin" (Org 2) → sollte Requests von Org 2 sehen
3. **Erwartung:** Liste aktualisiert sich sofort, zeigt Requests von Org 2

**Status:** ✅ Haupttest-Szenario

### Test 3: Initiales Laden

**Schritte:**
1. Seite öffnen → Requests werden geladen
2. **Erwartung:** Kein doppeltes Laden

**Status:** ✅ Mit `initialLoadAttemptedRef` abgedeckt

### Test 4: Filter bleibt erhalten

**Schritte:**
1. User wählt Filter "Archiv"
2. Wechselt Rolle
3. **Erwartung:** Filter wird auf "Aktuell" (Default) zurückgesetzt

**Status:** ✅ Wie gewünscht - Filter wird zurückgesetzt

---

## Zusammenfassung

**Problem:**
- Requests-Liste passt sich nicht sofort nach Rollenwechsel an
- Ursache: Kein `useEffect`, der auf `currentRole` reagiert

**Lösung:**
- `useEffect` mit `currentRole?.id` als Dependency hinzufügen
- Filter auf Default zurücksetzen
- Daten neu laden mit Default-Filter

**Standards:**
- Filter-Standard: Default-Filter zurücksetzen ✅
- Memory Leaks: Keine State-Dependencies in `useCallback` ✅
- Sortierung: Komplett neu laden (kein append) ✅
- Performance: Nur bei tatsächlichem Rollenwechsel neu laden ✅

**Nächste Schritte:**
1. Implementierung in Requests.tsx
2. Tests durchführen
3. Gleiche Lösung in Worktracker.tsx anwenden
4. Weitere betroffene Komponenten prüfen

