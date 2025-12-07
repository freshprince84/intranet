# Automatisches Neuladen - Standardisierungsplan

**Erstellt:** 2025-01-31  
**Status:** 📋 PLANUNG - Nichts ändern, nur planen  
**Ziel:** Langfristige, standardisierte Lösung für automatisches Neuladen von Daten

---

## 🔴 PROBLEM - EINFACH ERKLÄRT

### Was passiert?

**Symptom:** Daten werden automatisch alle paar Sekunden neu geladen, obwohl der Benutzer nichts tut.

**Beispiel:**
- Du öffnest die Organisation-Seite → Branches werden angezeigt
- Du tust NICHTS → Nach 30-60 Sekunden werden Branches automatisch neu geladen
- Das passiert immer wieder, ohne dass du etwas klickst oder änderst

### Warum passiert das?

**Ursache 1: Funktionen werden bei jedem Render neu erstellt**

```typescript
// ❌ PROBLEM: Diese Funktion wird bei JEDEM Render neu erstellt
const handleError = (err: any) => {
  setError(err.message);
  showMessage(err.message, 'error');
};

// Diese Funktion wird als Prop übergeben
<BranchManagementTab onError={handleError} />
```

**Was passiert:**
1. Polling-Intervalle (alle 30-60 Sekunden) lösen State-Updates aus
2. State-Update → Komponente rendert neu
3. Bei jedem Render wird `handleError` neu erstellt (neue Referenz!)
4. `BranchManagementTab` sieht: "Oh, `onError` hat sich geändert!"
5. `useCallback` mit `[onError]` Dependency erstellt `fetchBranches` neu
6. `useEffect` mit `[fetchBranches]` Dependency triggert
7. **Branches werden neu geladen** → Endlosschleife!

**Ursache 2: `t` (useTranslation) wird bei jedem Render neu erstellt**

```typescript
// ❌ PROBLEM: `t` wird bei jedem Render neu erstellt
const loadTasks = useCallback(async () => {
  // ... verwendet t() für Fehlermeldungen
}, [filterLogicalOperators, t]); // ← t ist hier das Problem!
```

**Was passiert:**
1. Polling-Intervalle lösen State-Updates aus
2. State-Update → Komponente rendert neu
3. `useTranslation()` gibt bei jedem Render eine neue `t`-Funktion zurück
4. `useCallback` sieht: "Oh, `t` hat sich geändert!"
5. `loadTasks` wird neu erstellt
6. `useEffect` mit `[loadTasks]` Dependency triggert
7. **Tasks werden neu geladen** → Endlosschleife!

---

## 📊 ANALYSE: SIND ALLE DIESE FUNKTIONEN NÖTIG?

### Aktueller Zustand: Chaos durch Inkonsistenz

**Problem:** Es gibt KEINE einheitlichen Standards für:
1. **Fehlerbehandlung** - 3 verschiedene Patterns:
   - `onError` Prop (BranchManagementTab, TourProvidersTab, etc.)
   - `useError()` Hook (RoleManagementTab)
   - Direkte `setError()` + `showMessage()` (Worktracker, Requests)

2. **Daten laden** - 4 verschiedene Patterns:
   - `useCallback` mit `[onError]` (BranchManagementTab)
   - `useCallback` mit `[t]` (Worktracker, TeamWorktimeControl)
   - `useCallback` mit `[filterLogicalOperators]` (Requests)
   - Direkte Funktion ohne `useCallback` (WorktimeStats)

3. **useTranslation** - 2 verschiedene Patterns:
   - `t` in `useCallback` Dependencies (falsch - verursacht Neuladen)
   - `t` NICHT in Dependencies, aber in Funktion verwendet (richtig)

### Was ist wirklich nötig?

**✅ NÖTIG:**
1. **Fehlerbehandlung** - EIN einheitliches Pattern (z.B. ErrorContext)
2. **Daten laden** - EIN einheitliches Pattern (z.B. Custom Hook)
3. **useTranslation** - NIEMALS in `useCallback` Dependencies

**❌ NICHT NÖTIG:**
1. **Mehrfache Fehlerbehandlungs-Patterns** - Verursacht Chaos
2. **`t` in useCallback Dependencies** - Verursacht automatisches Neuladen
3. **`onError` Props** - Können durch Context ersetzt werden

---

## 🎯 LANGFRISTIGE LÖSUNG: STANDARDISIERUNG

### Prinzip: "Ein Pattern für alles"

**Ziel:** Alle Komponenten verwenden DASSELBE Pattern für:
- Fehlerbehandlung
- Daten laden
- Übersetzungen

---

## 📋 STANDARDISIERUNGSPLAN

### Phase 1: Fehlerbehandlung standardisieren

**Ziel:** Alle Komponenten verwenden ErrorContext statt `onError` Props

**Aktueller Zustand:**
- ❌ `onError` Props in: BranchManagementTab, TourProvidersTab, UserManagementTab, RoleManagementTab, ToursTab
- ✅ ErrorContext bereits vorhanden: `frontend/src/contexts/ErrorContext.tsx`
- ✅ `useError()` Hook bereits vorhanden: `frontend/src/hooks/useErrorHandling.ts`

**Standard Pattern:**
```typescript
// ✅ RICHTIG: ErrorContext verwenden
import { useError } from '../contexts/ErrorContext.tsx';

const MyComponent: React.FC = () => {
  const { handleError } = useError();
  
  const fetchData = useCallback(async () => {
    try {
      // ... API-Call
    } catch (error) {
      handleError(error); // ← Einheitlich!
    }
  }, []); // ← KEIN onError in Dependencies!
};
```

**Betroffene Komponenten:**
1. `BranchManagementTab.tsx` - `onError` Prop entfernen, `useError()` verwenden
2. `TourProvidersTab.tsx` - `onError` Prop entfernen, `useError()` verwenden
3. `UserManagementTab.tsx` - `onError` Prop entfernen, `useError()` verwenden
4. `ToursTab.tsx` - `onError` Prop entfernen, `useError()` verwenden
5. `Organisation.tsx` - `handleError` entfernen (nicht mehr nötig)

**Vorteil:**
- ✅ Keine `onError` Props mehr → Keine Re-Creation bei jedem Render
- ✅ Einheitliches Pattern überall
- ✅ ErrorContext ist bereits stabil (wird nicht bei jedem Render neu erstellt)

---

### Phase 2: useTranslation standardisieren

**Ziel:** `t` NIEMALS in `useCallback` Dependencies

**Aktueller Zustand:**
- ❌ `t` in Dependencies: Worktracker (`loadTasks`), TeamWorktimeControl (`fetchActiveUsers`, `fetchAllWorktimes`)

**Standard Pattern:**
```typescript
// ❌ FALSCH: t in Dependencies
const loadData = useCallback(async () => {
  const errorMessage = t('errors.loadError');
  // ...
}, [t]); // ← VERURSACHT AUTOMATISCHES NEULADEN!

// ✅ RICHTIG: t NICHT in Dependencies
const loadData = useCallback(async () => {
  const errorMessage = t('errors.loadError');
  // ...
}, []); // ← t wird trotzdem verwendet, aber nicht in Dependencies!

// ✅ ODER: Fehlermeldung außerhalb von useCallback
const ERROR_MESSAGE = 'Fehler beim Laden'; // Oder aus ErrorContext
const loadData = useCallback(async () => {
  // ...
}, []); // ← Keine Dependencies nötig!
```

**Betroffene Komponenten:**
1. `Worktracker.tsx` - `t` aus `loadTasks` Dependencies entfernen
2. `TeamWorktimeControl.tsx` - `t` aus `fetchActiveUsers` und `fetchAllWorktimes` Dependencies entfernen

**Vorteil:**
- ✅ Keine automatischen Neuladungen mehr durch `t`-Änderungen
- ✅ `t` funktioniert trotzdem (wird bei jedem Render neu erstellt, aber das ist OK)

---

### Phase 3: Daten laden standardisieren

**Ziel:** Einheitliches Pattern für alle `fetch`/`load` Funktionen

**Aktueller Zustand:**
- ❌ Verschiedene Patterns: `useCallback` mit verschiedenen Dependencies, direkte Funktionen, etc.

**Standard Pattern:**
```typescript
// ✅ RICHTIG: Einheitliches Pattern
const fetchData = useCallback(async () => {
  setLoading(true);
  try {
    const response = await axiosInstance.get('/api/data');
    setData(response.data);
  } catch (error) {
    handleError(error); // ← ErrorContext
  } finally {
    setLoading(false);
  }
}, [filterLogicalOperators, selectedDate]); // ← NUR echte State-Dependencies, KEIN t, KEIN onError, KEIN showMessage!

useEffect(() => {
  fetchData();
}, [fetchData]); // ← ODER: Direkte Dependencies statt fetchData
```

**WICHTIG: State-Dependencies MÜSSEN bleiben!**
- ✅ `filterLogicalOperators` (State) → MUSS in Dependencies
- ✅ `selectedDate` (State) → MUSS in Dependencies
- ❌ `t` (useTranslation) → NICHT in Dependencies
- ❌ `onError` (Prop) → NICHT in Dependencies (sollte ErrorContext verwenden)
- ❌ `showMessage` (MessageContext) → NICHT in Dependencies (ist stabil, aber nicht nötig)

**Betroffene Komponenten:**
1. `BranchManagementTab.tsx` - `fetchBranches` Dependencies korrigieren
2. `TourProvidersTab.tsx` - `fetchProviders` Dependencies korrigieren
3. `Worktracker.tsx` - `loadTasks` Dependencies korrigieren
4. `TeamWorktimeControl.tsx` - `fetchActiveUsers` und `fetchAllWorktimes` Dependencies korrigieren
5. `Requests.tsx` - `fetchRequests` Dependencies prüfen
6. `WorktimeStats.tsx` - `fetchStats` Pattern standardisieren

**Vorteil:**
- ✅ Einheitliches Pattern überall
- ✅ Keine automatischen Neuladungen mehr
- ✅ Vorhersagbares Verhalten

---

### Phase 4: Filter-Problem beheben

**Ziel:** Filter werden nicht mehr automatisch neu geladen und verschwinden nicht

**Aktueller Zustand:**
- ❌ `filterContext` in Dependencies: Requests.tsx, SavedFilterTags.tsx
- ❌ Filter verschwinden nach 10 Minuten (Cleanup-Intervall)
- ❌ Filter werden bei jedem Render neu geladen

**Standard Pattern:**
```typescript
// ❌ FALSCH: filterContext in Dependencies
useEffect(() => {
  filterContext.loadFilters(tableId);
}, [tableId, filterContext]); // ← VERURSACHT AUTOMATISCHES NEULADEN!

// ✅ RICHTIG: loadFilters direkt verwenden
const { loadFilters } = useFilterContext();

useEffect(() => {
  loadFilters(tableId);
}, [tableId]); // ← ODER: [], da loadFilters stabil ist
```

**Betroffene Komponenten:**
1. `Requests.tsx` - `filterContext` aus Dependencies entfernen
2. `SavedFilterTags.tsx` - `filterContext` aus Dependencies entfernen
3. `FilterContext.tsx` - Cleanup-Intervall anpassen (TTL erhöhen)

**Vorteil:**
- ✅ Keine automatischen Neuladungen mehr
- ✅ Filter verschwinden nicht mehr nach 10 Minuten
- ✅ Einheitliches Pattern überall

---

### Phase 5: Custom Hook für Daten laden

**Ziel:** Wiederverwendbarer Hook für alle Daten-Lade-Operationen

**Standard Pattern:**
```typescript
// ✅ RICHTIG: Custom Hook
const useDataLoader = <T>(
  endpoint: string,
  dependencies: any[] = []
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const { handleError } = useError();
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(endpoint);
      setData(response.data);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, dependencies); // ← Nur echte Dependencies
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { data, loading, refetch: fetchData };
};

// Verwendung:
const { data: branches, loading } = useDataLoader<Branch[]>(
  API_ENDPOINTS.BRANCHES.BASE,
  [] // ← Nur echte Dependencies
);
```

**Vorteil:**
- ✅ Einheitliches Pattern überall
- ✅ Weniger Code-Duplikation
- ✅ Automatische Fehlerbehandlung
- ✅ Automatisches Loading-State-Management

---

## 📊 ZUSAMMENFASSUNG: WAS IST NÖTIG?

### ✅ NÖTIG (Standardisieren):

1. **ErrorContext überall** - Statt `onError` Props
2. **`t` NICHT in useCallback Dependencies** - Verursacht Neuladen
3. **Einheitliches fetch/load Pattern** - Alle verwenden dasselbe
4. **Custom Hook für Daten laden** - Reduziert Code-Duplikation

### ❌ NICHT NÖTIG (Entfernen):

1. **`onError` Props** - Können durch ErrorContext ersetzt werden
2. **`t` in useCallback Dependencies** - Verursacht automatisches Neuladen
3. **Verschiedene fetch/load Patterns** - Verursacht Chaos

---

## 🎯 IMPLEMENTIERUNGSREIHENFOLGE

### Schritt 1: ErrorContext überall einführen
- Alle `onError` Props durch `useError()` ersetzen
- `handleError` aus Parent-Komponenten entfernen

### Schritt 2: `t` aus Dependencies entfernen
- Alle `useCallback` mit `[t]` Dependency korrigieren
- Fehlermeldungen aus ErrorContext oder Konstanten verwenden

### Schritt 3: Einheitliches fetch/load Pattern
- Alle `fetch`/`load` Funktionen standardisieren
- Dependencies auf echte Abhängigkeiten beschränken

### Schritt 4: Filter-Problem beheben
- `filterContext` aus Dependencies entfernen
- Cleanup-Intervall anpassen (TTL erhöhen)

### Schritt 5: Custom Hook erstellen
- `useDataLoader` Hook implementieren
- Nach und nach alle Komponenten migrieren

---

## ⚠️ WICHTIG: NICHTS ÄNDERN, NUR PLANEN

**Status:** Dieser Plan ist NUR für die Planung.  
**Nächste Schritte:** Plan vom Benutzer prüfen lassen, dann Schritt für Schritt implementieren.

---

**Erstellt:** 2025-01-31  
**Status:** 📋 PLANUNG  
**Nächste Aktion:** Plan vom Benutzer prüfen lassen

