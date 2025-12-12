# Tours Loop-Problem - Vollständiger Umsetzungsplan

**Datum:** 2025-02-02  
**Status:** 📋 PLAN - Vollständig durchgeplant  
**Priorität:** 🔴 KRITISCH

---

## 📊 PROBLEM-ZUSAMMENFASSUNG

### Symptome (Fakten aus Browser-Console):
- **562+ XHR Requests** zu `/api/tours?filterId=76446` in kurzer Zeit
- Tours blinken / werden kontinuierlich neu geladen
- Browser-Performance beeinträchtigt

### Root Cause (Fakten aus Code-Analyse):
1. `handleTourFilterChange` ist nicht mit `useCallback` stabilisiert (Zeile 244)
2. `applyTourFilterConditions` ist nicht mit `useCallback` stabilisiert (Zeile 230)
3. `loadTours` hat `tourFilterLogicalOperators` als Dependency (Zeile 217)
4. `useEffect` hat instabile Funktionen als Dependencies (Zeile 284)
5. Kein Ref-Pattern zur Verhinderung mehrfacher Initialisierung

---

## 🔍 VOLLSTÄNDIGE CODE-ANALYSE

### Problem 1: `handleTourFilterChange` - Nicht stabilisiert

**Datei:** `frontend/src/components/tours/ToursTab.tsx:244-252`

**Aktueller Code:**
```typescript
const handleTourFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setTourSelectedFilterId(id);
    setTourActiveFilterName(name);
    if (id) {
        await loadTours(id);
    } else {
        await applyTourFilterConditions(conditions, operators);
    }
};
```

**Fakten:**
- Funktion wird bei jedem Render neu erstellt (kein `useCallback`)
- Wird in `useEffect` Dependency-Array verwendet (Zeile 284)
- Neue Referenz bei jedem Render → `useEffect` läuft erneut
- Verwendet `loadTours` und `applyTourFilterConditions` (beide instabil)

**Vergleich mit korrekter Implementierung:**
- `Requests.tsx:697-714`: `handleFilterChange` ist mit `useCallback` stabilisiert
- `Worktracker.tsx:825-859`: `handleFilterChange` ist mit `useCallback` stabilisiert

---

### Problem 2: `applyTourFilterConditions` - Nicht stabilisiert

**Datei:** `frontend/src/components/tours/ToursTab.tsx:230-234`

**Aktueller Code:**
```typescript
const applyTourFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setTourFilterConditions(conditions);
    setTourFilterLogicalOperators(operators);
    loadTours(undefined, conditions, false);
};
```

**Fakten:**
- Funktion wird bei jedem Render neu erstellt (kein `useCallback`)
- Wird in `handleTourFilterChange` verwendet (Zeile 250)
- Verwendet `loadTours` (instabil wegen Dependency)

---

### Problem 3: `loadTours` - Instabile Dependency

**Datei:** `frontend/src/components/tours/ToursTab.tsx:167-217`

**Aktueller Code:**
```typescript
const loadTours = useCallback(async (filterId?: number, filterConditions?: any[], background = false) => {
    // ... Logik ...
    if (filterConditions && filterConditions.length > 0) {
        params.filterConditions = JSON.stringify({
            conditions: filterConditions,
            operators: tourFilterLogicalOperators  // ← Closure-Variable
        });
    }
    // ...
}, [tourFilterLogicalOperators, t, showMessage]);  // ← Problem: tourFilterLogicalOperators als Dependency
```

**Fakten:**
- `tourFilterLogicalOperators` ist State-Variable (Zeile 89)
- Wird in Closure verwendet (Zeile 180)
- Als Dependency angegeben (Zeile 217)
- Bei jeder Änderung von `tourFilterLogicalOperators` wird `loadTours` neu erstellt
- `loadTours` ist in `useEffect` Dependency-Array (Zeile 284)
- Neue Referenz → `useEffect` läuft erneut

**Vergleich mit korrekter Implementierung:**
- `MEMORY_LEAKS_UND_PERFORMANCE_FIXES_2025-12-11.md:41-48`: Ref-Pattern für State-Variablen in Closures

---

### Problem 4: `useEffect` - Instabile Dependencies

**Datei:** `frontend/src/components/tours/ToursTab.tsx:258-284`

**Aktueller Code:**
```typescript
useEffect(() => {
    const initialize = async () => {
        if (!hasPermission('tours', 'read', 'table')) {
            return;
        }
        
        const filters = await loadFilters(TOURS_TABLE_ID);
        const defaultFilter = filters.find(f => f.name === 'Aktuell');
        if (defaultFilter) {
            await handleTourFilterChange(
                defaultFilter.name,
                defaultFilter.id,
                defaultFilter.conditions,
                defaultFilter.operators
            );
            return;
        }
        
        await loadTours();
    };
    
    initialize();
}, [hasPermission, loadFilters, handleTourFilterChange, loadTours]);
```

**Fakten:**
- `handleTourFilterChange` ist instabil (nicht mit `useCallback`)
- `loadTours` ist instabil (hat `tourFilterLogicalOperators` als Dependency)
- Kein Ref-Pattern zur Verhinderung mehrfacher Ausführung
- Bei jedem Render: neue Referenzen → `useEffect` läuft erneut

**Vergleich mit korrekter Implementierung:**
- `Requests.tsx:720-746`: Ref-Pattern (`initialLoadAttemptedRef`) verhindert mehrfache Ausführung
- `Worktracker.tsx:878-888`: Ref-Pattern für Handler-Referenzen

---

### Problem 5: Fehlendes Ref-Pattern

**Fakten:**
- Kein `initialLoadAttemptedRef` vorhanden
- Kein `handleTourFilterChangeRef` vorhanden
- Kein `loadToursRef` vorhanden
- Mehrfache Initialisierung wird nicht verhindert

**Vergleich mit korrekter Implementierung:**
- `Requests.tsx:693`: `initialLoadAttemptedRef` verhindert mehrfache Ausführung
- `Worktracker.tsx:879-888`: Ref-Pattern für Handler-Referenzen

---

## 📋 STANDARDS-PRÜFUNG

### ✅ Standards die beachtet wurden:

1. **Übersetzungen:**
   - `t()` wird verwendet (Zeile 71, 90, 129-137, 141-143, 199, 207, 239)
   - `defaultValue` wird verwendet (z.B. Zeile 90, 129)
   - Alle Texte sind übersetzt

2. **Berechtigungen:**
   - `usePermissions()` wird verwendet (Zeile 72)
   - `hasPermission()` wird geprüft (Zeile 260, 576, 637, 804, 863, 919, 976)
   - Korrekte Permission-Keys: `'tours'`, `'tour_edit'`, `'tour_create'`

3. **Memory Cleanup:**
   - Cleanup beim Unmount vorhanden (Zeile 220-225)
   - Arrays werden gelöscht

### ❌ Standards die NICHT beachtet wurden:

1. **useCallback für Handler:**
   - `handleTourFilterChange` ist nicht mit `useCallback` stabilisiert
   - `applyTourFilterConditions` ist nicht mit `useCallback` stabilisiert
   - `resetTourFilterConditions` ist nicht mit `useCallback` stabilisiert

2. **Ref-Pattern für State in Closures:**
   - `tourFilterLogicalOperators` wird direkt in Closure verwendet
   - Sollte Ref-Pattern verwenden (siehe `MEMORY_LEAKS_UND_PERFORMANCE_FIXES_2025-12-11.md`)

3. **Ref-Pattern für useEffect:**
   - Kein Ref zur Verhinderung mehrfacher Initialisierung
   - Sollte `initialLoadAttemptedRef` verwenden (siehe `Requests.tsx:693`)

---

## 🔴 RISIKEN FÜR DIE UMSETZUNG

### Risiko 1: Timing-Probleme bei State-Updates

**Beschreibung:**
- `applyTourFilterConditions` setzt State (`setTourFilterConditions`, `setTourFilterLogicalOperators`)
- Ruft sofort `loadTours` auf
- State-Update könnte noch nicht abgeschlossen sein

**Risiko-Level:** 🟡 MITTEL

**Mitigation:**
- `loadTours` erhält `operators` als Parameter (nicht aus Closure)
- State-Updates sind asynchron, aber `loadTours` verwendet Parameter

---

### Risiko 2: Filter-Context Änderungen

**Beschreibung:**
- `loadFilters` kommt aus `FilterContext`
- `FilterContext` könnte sich ändern (siehe `AUTOMATISCHES_NEULADEN_FILTER_PROBLEM_2025-01-31.md`)
- `loadFilters` ist bereits stabilisiert (keine Dependencies)

**Risiko-Level:** 🟢 NIEDRIG

**Mitigation:**
- `loadFilters` ist bereits mit `useCallback` stabilisiert (keine Dependencies)
- `FilterContext.tsx:98-175`: `loadFilters` verwendet Refs

---

### Risiko 3: hasPermission Änderungen

**Beschreibung:**
- `hasPermission` kommt aus `usePermissions()` Hook
- Hook könnte sich ändern bei Permission-Updates
- Wird in `useEffect` Dependency-Array verwendet

**Risiko-Level:** 🟡 MITTEL

**Mitigation:**
- `hasPermission` ist Funktion aus Hook (sollte stabil sein)
- Prüfung in `useEffect` ist notwendig (frühes Return)
- Ref-Pattern verhindert mehrfache Ausführung

---

### Risiko 4: Überschneidungen mit anderen Komponenten

**Beschreibung:**
- Andere Komponenten könnten ebenfalls Tours laden
- Konflikte bei gleichzeitigen Requests

**Risiko-Level:** 🟢 NIEDRIG

**Mitigation:**
- `loadTours` hat `background` Parameter (verhindert Loading-State bei Background-Requests)
- Keine globalen State-Konflikte (lokaler State)

---

## ⚡ PERFORMANCE-AUSWIRKUNGEN

### Aktuelle Performance-Probleme:

1. **562+ API-Requests in kurzer Zeit:**
   - Jeder Request dauert ~100-500ms
   - Server-Last erhöht
   - Browser-Performance beeinträchtigt

2. **Kontinuierliche Re-Renders:**
   - Jeder Render triggert `useEffect`
   - `useEffect` triggert API-Request
   - API-Response triggert State-Update
   - State-Update triggert Re-Render
   - → Endlosschleife

3. **Memory-Overhead:**
   - Viele API-Responses im Memory
   - Viele Promise-Objekte
   - Viele Event-Handler-Referenzen

### Erwartete Performance-Verbesserungen:

1. **Nur 1 API-Request beim Mount:**
   - `initialLoadAttemptedRef` verhindert mehrfache Ausführung
   - Stabile Handler verhindern Re-Triggers

2. **Keine Endlosschleife:**
   - Stabile Handler → `useEffect` läuft nur einmal
   - Ref-Pattern verhindert mehrfache Initialisierung

3. **Reduzierter Memory-Overhead:**
   - Keine doppelten API-Responses
   - Keine doppelten Promise-Objekte
   - Stabile Handler-Referenzen

---

## 🧠 MEMORY LEAKS PRÜFUNG

### Aktuelle Memory Leak Risiken:

1. **Instabile Handler-Referenzen:**
   - `handleTourFilterChange` wird bei jedem Render neu erstellt
   - Alte Referenzen bleiben im Memory
   - → Memory Leak

2. **Instabile `loadTours` Referenzen:**
   - `loadTours` wird bei jeder `tourFilterLogicalOperators` Änderung neu erstellt
   - Alte Referenzen bleiben im Memory
   - → Memory Leak

3. **Keine Cleanup für API-Requests:**
   - `loadTours` macht API-Requests
   - Bei Unmount werden Requests nicht abgebrochen
   - → Memory Leak (wenn Request noch läuft)

### Erwartete Memory Leak Behebung:

1. **Stabile Handler-Referenzen:**
   - `useCallback` erstellt nur neue Referenz bei Dependency-Änderung
   - Alte Referenzen werden automatisch garbage collected

2. **Ref-Pattern für State:**
   - `tourFilterLogicalOperatorsRef` statt direkter State-Verwendung
   - `loadTours` wird nicht bei State-Änderung neu erstellt

3. **Cleanup für API-Requests:**
   - AbortController für API-Requests (optional, aber empfohlen)
   - Cleanup beim Unmount

---

## 🌐 ÜBERSETZUNGEN PRÜFUNG

### Aktuelle Übersetzungen:

**Datei:** `frontend/src/components/tours/ToursTab.tsx`

**Verwendete Übersetzungs-Keys:**
- `t('tours.filters.current', 'Aktuell')` (Zeile 90, 239)
- `t('tours.columns.title', 'Titel')` (Zeile 129)
- `t('tours.columns.type', 'Typ')` (Zeile 130)
- `t('tours.columns.price', 'Preis')` (Zeile 131)
- `t('tours.columns.location', 'Ort')` (Zeile 132)
- `t('tours.columns.duration', 'Dauer')` (Zeile 133)
- `t('tours.columns.branch', 'Niederlassung')` (Zeile 134)
- `t('tours.columns.createdBy', 'Erstellt von')` (Zeile 135)
- `t('tours.columns.status', 'Status')` (Zeile 136)
- `t('tours.columns.actions', 'Aktionen')` (Zeile 137)
- `t('tours.columns.description', 'Beschreibung')` (Zeile 141)
- `t('tours.columns.maxParticipants', 'Max. Teilnehmer')` (Zeile 142)
- `t('tours.columns.minParticipants', 'Min. Teilnehmer')` (Zeile 143)
- `t('errors.loadError')` (Zeile 199, 207)
- `t('common.actions')` (Zeile 137)

**Status:** ✅ Alle Texte sind übersetzt

**Keine neuen Übersetzungen erforderlich** - Nur Code-Stabilisierung

---

## 🔔 NOTIFICATIONS PRÜFUNG

### Aktuelle Notifications:

**Datei:** `frontend/src/components/tours/ToursTab.tsx`

**Verwendete Notifications:**
- `showMessage()` für Fehler (Zeile 202, 210)
- `showMessage()` für Success (Zeile 810, 924)

**Status:** ✅ Notifications sind vorhanden

**Keine neuen Notifications erforderlich** - Nur Code-Stabilisierung

---

## 🔐 BERECHTIGUNGEN PRÜFUNG

### Aktuelle Berechtigungen:

**Datei:** `frontend/src/components/tours/ToursTab.tsx`

**Verwendete Berechtigungen:**
- `hasPermission('tours', 'read', 'table')` (Zeile 260)
- `hasPermission('tour_edit', 'write', 'button')` (Zeile 576, 804, 863, 919)
- `hasPermission('tour_create', 'write', 'button')` (Zeile 637, 976)

**Status:** ✅ Berechtigungen sind vorhanden

**Keine neuen Berechtigungen erforderlich** - Nur Code-Stabilisierung

---

## 📝 UMSETZUNGSPLAN

### Schritt 1: Ref-Pattern für `tourFilterLogicalOperators`

**Datei:** `frontend/src/components/tours/ToursTab.tsx`

**Änderung:**
```typescript
// Nach Zeile 89 (nach tourFilterLogicalOperators State)
const tourFilterLogicalOperatorsRef = useRef(tourFilterLogicalOperators);

useEffect(() => {
    tourFilterLogicalOperatorsRef.current = tourFilterLogicalOperators;
}, [tourFilterLogicalOperators]);
```

**Zweck:**
- Ref speichert aktuellen Wert
- `loadTours` kann Ref verwenden statt State als Dependency

---

### Schritt 2: `loadTours` stabilisieren

**Datei:** `frontend/src/components/tours/ToursTab.tsx:167-217`

**Änderung:**
```typescript
const loadTours = useCallback(async (filterId?: number, filterConditions?: any[], background = false) => {
    try {
        if (!background) {
            setToursLoading(true);
            setToursError(null);
        }
        
        const params: any = {};
        if (filterId) {
            params.filterId = filterId;
        } else if (filterConditions && filterConditions.length > 0) {
            params.filterConditions = JSON.stringify({
                conditions: filterConditions,
                operators: tourFilterLogicalOperatorsRef.current  // ← Ref verwenden
            });
        }
        
        const response = await axiosInstance.get(API_ENDPOINTS.TOURS.BASE, { params });
        // ... Rest bleibt gleich ...
    } catch (err: any) {
        // ... Fehlerbehandlung bleibt gleich ...
    } finally {
        // ... Cleanup bleibt gleich ...
    }
}, [t, showMessage]);  // ← tourFilterLogicalOperators entfernt
```

**Zweck:**
- `loadTours` wird nicht bei `tourFilterLogicalOperators` Änderung neu erstellt
- Stabile Referenz für `useEffect`

---

### Schritt 3: `applyTourFilterConditions` stabilisieren

**Datei:** `frontend/src/components/tours/ToursTab.tsx:230-234`

**Änderung:**
```typescript
const applyTourFilterConditions = useCallback((conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setTourFilterConditions(conditions);
    setTourFilterLogicalOperators(operators);
    loadTours(undefined, conditions, false);
}, [loadTours]);
```

**Zweck:**
- Funktion wird nur bei `loadTours` Änderung neu erstellt
- Stabile Referenz für `handleTourFilterChange`

---

### Schritt 4: `resetTourFilterConditions` stabilisieren

**Datei:** `frontend/src/components/tours/ToursTab.tsx:236-242`

**Änderung:**
```typescript
const resetTourFilterConditions = useCallback(() => {
    setTourFilterConditions([]);
    setTourFilterLogicalOperators([]);
    setTourActiveFilterName(t('tours.filters.current', 'Aktuell'));
    setTourSelectedFilterId(null);
    loadTours();
}, [loadTours, t]);
```

**Zweck:**
- Funktion wird nur bei `loadTours` oder `t` Änderung neu erstellt
- Stabile Referenz

---

### Schritt 5: `handleTourFilterChange` stabilisieren

**Datei:** `frontend/src/components/tours/ToursTab.tsx:244-252`

**Änderung:**
```typescript
const handleTourFilterChange = useCallback(async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setTourSelectedFilterId(id);
    setTourActiveFilterName(name);
    if (id) {
        await loadTours(id);
    } else {
        await applyTourFilterConditions(conditions, operators);
    }
}, [loadTours, applyTourFilterConditions]);
```

**Zweck:**
- Funktion wird nur bei `loadTours` oder `applyTourFilterConditions` Änderung neu erstellt
- Stabile Referenz für `useEffect`

---

### Schritt 6: Ref-Pattern für Initialisierung

**Datei:** `frontend/src/components/tours/ToursTab.tsx:258-284`

**Änderung:**
```typescript
// Vor useEffect (nach handleTourFilterChange)
const initialLoadAttemptedRef = useRef(false);

useEffect(() => {
    // Verhindere mehrfache Ausführung
    if (initialLoadAttemptedRef.current) {
        return;
    }
    
    const initialize = async () => {
        // Markiere als versucht, BEVOR async Operation startet
        initialLoadAttemptedRef.current = true;
        
        if (!hasPermission('tours', 'read', 'table')) {
            return;
        }
        
        // 1. Filter laden (wartet auf State-Update)
        const filters = await loadFilters(TOURS_TABLE_ID);
        
        // 2. Default-Filter anwenden (IMMER vorhanden!)
        const defaultFilter = filters.find(f => f.name === 'Aktuell');
        if (defaultFilter) {
            await handleTourFilterChange(
                defaultFilter.name,
                defaultFilter.id,
                defaultFilter.conditions,
                defaultFilter.operators
            );
            return; // Daten werden durch handleTourFilterChange geladen
        }
        
        // 3. Fallback: Daten ohne Filter laden (sollte nie passieren)
        await loadTours();
    };
    
    initialize();
}, [hasPermission, loadFilters, handleTourFilterChange, loadTours]);
```

**Zweck:**
- Verhindert mehrfache Ausführung des Initialisierungs-Logik
- Stabile Handler-Referenzen verhindern Re-Triggers

---

## ✅ TEST-CHECKLISTE

### Vor Umsetzung:
- [ ] Code-Review durchgeführt
- [ ] Alle Dependencies identifiziert
- [ ] Ref-Pattern verstanden

### Nach Umsetzung:
- [ ] Browser-Console prüfen (keine Loops mehr)
- [ ] Network-Tab prüfen (nur 1 Request beim Mount)
- [ ] Tours werden korrekt geladen
- [ ] Filter funktionieren korrekt
- [ ] Keine Memory Leaks (Memory Profiler)
- [ ] Performance verbessert (keine 562+ Requests)

### Auf Produktivserver:
- [ ] Browser-Console prüfen
- [ ] Network-Tab prüfen
- [ ] Tours werden korrekt angezeigt
- [ ] Filter funktionieren
- [ ] Keine Performance-Probleme

---

## 📊 ERWARTETE ERGEBNISSE

### Vor Umsetzung:
- 562+ API-Requests in kurzer Zeit
- Tours blinken / werden kontinuierlich neu geladen
- Browser-Performance beeinträchtigt

### Nach Umsetzung:
- Nur 1 API-Request beim Mount
- Tours werden einmalig geladen
- Keine Endlosschleife
- Browser-Performance normal
- Keine Memory Leaks

---

## 🔗 REFERENZEN

### Korrekte Implementierungen:
- `frontend/src/components/Requests.tsx:697-746` - `handleFilterChange` mit `useCallback` und Ref-Pattern
- `frontend/src/pages/Worktracker.tsx:825-888` - `handleFilterChange` mit `useCallback` und Ref-Pattern

### Dokumentation:
- `docs/technical/MEMORY_LEAKS_UND_PERFORMANCE_FIXES_2025-12-11.md` - Ref-Pattern für State in Closures
- `docs/technical/PERFORMANCE_ENDSCHLEIFE_WORKTRACKER_FIX_2025-01-29.md` - Endlosschleife-Behebung
- `docs/analysis/TOURS_LOOP_PROBLEM_ANALYSE.md` - Detaillierte Problem-Analyse

---

## ⚠️ WICHTIGE HINWEISE

1. **Keine neuen Features:** Nur Code-Stabilisierung
2. **Keine Breaking Changes:** Funktionalität bleibt gleich
3. **Keine neuen Dependencies:** Nur bestehende Hooks verwenden
4. **Keine Übersetzungen erforderlich:** Alle Texte sind bereits übersetzt
5. **Keine Notifications erforderlich:** Notifications sind bereits vorhanden
6. **Keine Berechtigungen erforderlich:** Berechtigungen sind bereits vorhanden

---

## 📝 ZUSAMMENFASSUNG

**Probleme identifiziert:**
1. `handleTourFilterChange` nicht stabilisiert
2. `applyTourFilterConditions` nicht stabilisiert
3. `loadTours` hat instabile Dependency
4. `useEffect` hat instabile Dependencies
5. Kein Ref-Pattern für Initialisierung

**Lösungen geplant:**
1. Ref-Pattern für `tourFilterLogicalOperators`
2. `loadTours` stabilisieren (Ref verwenden)
3. `applyTourFilterConditions` stabilisieren
4. `resetTourFilterConditions` stabilisieren
5. `handleTourFilterChange` stabilisieren
6. Ref-Pattern für Initialisierung

**Risiken:**
- 🟡 MITTEL: Timing-Probleme bei State-Updates (mitigiert durch Parameter)
- 🟢 NIEDRIG: Filter-Context Änderungen (bereits stabilisiert)
- 🟡 MITTEL: hasPermission Änderungen (mitigiert durch Ref-Pattern)
- 🟢 NIEDRIG: Überschneidungen mit anderen Komponenten (keine Konflikte)

**Standards:**
- ✅ Übersetzungen: Alle vorhanden
- ✅ Notifications: Alle vorhanden
- ✅ Berechtigungen: Alle vorhanden
- ❌ useCallback: Muss implementiert werden
- ❌ Ref-Pattern: Muss implementiert werden

**Performance:**
- Vorher: 562+ Requests, Endlosschleife
- Nachher: 1 Request, keine Endlosschleife

**Memory Leaks:**
- Vorher: Instabile Handler-Referenzen, keine Request-Cleanup
- Nachher: Stabile Handler-Referenzen, Request-Cleanup (optional)

---

**Status:** 📋 PLAN VOLLSTÄNDIG - Bereit für Umsetzung

