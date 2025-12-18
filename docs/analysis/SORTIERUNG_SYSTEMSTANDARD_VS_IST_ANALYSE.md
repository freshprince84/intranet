# Sortierung: Systemstandard (SOLL) vs. Ist-Zustand Analyse

**Datum:** 2025-12-18  
**Status:** 📋 ANALYSE  
**Zweck:** Vollständige Analyse der Sortierungs-Implementierung bei Requests, To-Do's und Reservations im Vergleich zum Systemstandard

---

## 📚 REFERENZ: SYSTEMSTANDARD (SOLL)

Basierend auf: `docs/technical/SORTIERUNG_STANDARD_IMPLEMENTIERUNG.md`

### Standard-Anforderungen:

1. **Hauptsortierung** ist für Table & Cards zuständig (synchron)
2. **Filterbasierte Sortierung** wurde abgeschafft (Phase 1) ✅
3. **"Anzeigen & Sortieren" Modal (TableColumnConfig)**:
   - Bei Card-Ansicht: Muss die Cards sortieren
   - Bei Table-Ansicht: Muss die Table sortieren
   - Die Sortierung muss zwischen Card- und Table-Ansicht synchron sein
4. **Table-Header-Sortierung**: Zusätzliche Sortierung direkt bei den Table-Headern (klickbar) - synchronisiert mit Hauptsortierung
5. **Persistierung**: Die Sortierung muss pro Benutzer gespeichert werden

### Standard-Implementierungs-Pattern:

```typescript
// 1. useTableSettings Hook erweitern
const {
  settings,
  updateSortConfig  // ✅ HINZUFÜGEN
} = useTableSettings('table_id', { ... });

// 2. Hauptsortierung aus Settings laden
const sortConfig: SortConfig = settings.sortConfig || { key: 'defaultKey', direction: 'asc' };

// 3. Hauptsortierung Handler
const handleMainSortChange = (key: string, direction: 'asc' | 'desc') => {
  updateSortConfig({ key: key as SortConfig['key'], direction });
};

// 4. Table-Header-Sortierung aktualisieren
const handleSort = (key: SortConfig['key']) => {
  const newDirection = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
  updateSortConfig({ key, direction: newDirection });
};

// 5. TableColumnConfig Props aktualisieren
<TableColumnConfig
  mainSortConfig={sortConfig}  // ✅ HINZUFÜGEN
  onMainSortChange={handleMainSortChange}  // ✅ HINZUFÜGEN
  showMainSort={true}  // ✅ HINZUFÜGEN
/>

// 6. Sortierlogik aktualisieren
const sortedItems = useMemo(() => {
  // ... Sortierlogik mit sortConfig
}, [items, sortConfig, /* andere Dependencies */]);
```

### Standard: Table-Header-Sortierung Visualisierung

**SOLL:** Table-Header sollte visuell anzeigen, welche Spalte aktiv sortiert ist:
- Aktive Spalte: `↑` (asc) oder `↓` (desc)
- Inaktive Spalten: `ArrowsUpDownIcon` (neutral)

---

## 🔍 ANALYSE: REQUESTS (`frontend/src/components/Requests.tsx`)

### Implementierung:

#### 1. SortConfig-Laden:
```typescript
// Zeile 277
const sortConfig: SortConfig = settings.sortConfig || { key: 'dueDate', direction: 'asc' };
```
**Status:** ✅ **KONFORM** - Direkt aus Settings geladen, kein useMemo (Standard erlaubt beides)

#### 2. handleMainSortChange:
```typescript
// Zeile 280-282
const handleMainSortChange = (key: string, direction: 'asc' | 'desc') => {
  updateSortConfig({ key: key as SortConfig['key'], direction });
};
```
**Status:** ⚠️ **ABWEICHUNG** - **NICHT mit `useCallback` stabilisiert**
- **Standard:** Standard-Dokumentation zeigt kein explizites `useCallback`-Requirement
- **Problem:** Funktion wird bei jedem Render neu erstellt, kann zu unnötigen Re-Renders führen
- **Begründung:** Nicht kritisch, aber Performance-Optimierung fehlt

#### 3. handleSort (Table-Header):
```typescript
// Zeile 581-585
const handleSort = (key: SortConfig['key']) => {
  // Table-Header-Sortierung: Aktualisiert Hauptsortierung direkt (synchron für Table & Cards)
  const newDirection = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
  updateSortConfig({ key, direction: newDirection });
};
```
**Status:** ⚠️ **ABWEICHUNG** - **NICHT mit `useCallback` stabilisiert**
- **Problem:** Funktion wird bei jedem Render neu erstellt
- **Begründung:** Nicht kritisch, aber Performance-Optimierung fehlt

#### 4. TableColumnConfig Props:
```typescript
// Zeile 1173-1175
<TableColumnConfig
  mainSortConfig={sortConfig}
  onMainSortChange={handleMainSortChange}
  showMainSort={true}
/>
```
**Status:** ✅ **KONFORM** - Alle erforderlichen Props vorhanden

#### 5. Sortierlogik (useMemo):
```typescript
// Zeile 764-864
const filteredAndSortedRequests = useMemo(() => {
  // ... Filterung
  .sort((a, b) => {
    // Hauptsortierung (sortConfig) - für Table & Card gleich (synchron)
    if (sortConfig.key && (selectedFilterId === null || filterConditions.length === 0)) {
      // ... Sortierlogik
    }
  });
}, [requests, selectedFilterId, searchTerm, sortConfig]);
```
**Status:** ✅ **KONFORM** - Verwendet `sortConfig` aus Settings, in Dependencies enthalten

#### 6. Table-Header Visualisierung:
```typescript
// Zeile 1249-1271
let sortKey: SortConfig['key'] | undefined;
if (columnId === 'title') sortKey = 'title';
if (columnId === 'status') sortKey = 'status';
if (columnId === 'type') sortKey = 'type';
if (columnId === 'branch') sortKey = 'branch.name';
if (columnId === 'dueDate') sortKey = 'dueDate';

// ...
{sortKey && sortConfig.key === sortKey && (sortConfig.direction === 'asc' ? '↑' : '↓')}
```
**Status:** ✅ **KONFORM** - Zeigt korrekt `↑` oder `↓` für aktive Sortierung

### Zusammenfassung Requests:

| Aspekt | Status | Abweichung |
|--------|--------|------------|
| sortConfig aus Settings | ✅ KONFORM | - |
| handleMainSortChange | ⚠️ ABWEICHUNG | Kein useCallback |
| handleSort | ⚠️ ABWEICHUNG | Kein useCallback |
| TableColumnConfig Props | ✅ KONFORM | - |
| Sortierlogik | ✅ KONFORM | - |
| Table-Header Visualisierung | ✅ KONFORM | - |

**Gesamtbewertung:** ✅ **GRÖSSTENTEILS KONFORM** - Funktioniert korrekt, nur Performance-Optimierungen fehlen

---

## 🔍 ANALYSE: TO-DO'S (`frontend/src/pages/Worktracker.tsx`)

### Implementierung:

#### 1. SortConfig-Laden:
```typescript
// Zeile 447-451
const tableSortConfig: SortConfig = useMemo(() => {
    return tasksSettings.sortConfig || { key: 'dueDate', direction: 'asc' };
}, [tasksSettings.sortConfig]);
```
**Status:** ⚠️ **ABWEICHUNG** - **Verwendet `useMemo` statt direkter Zuweisung**
- **Standard:** Standard zeigt direkte Zuweisung: `const sortConfig: SortConfig = settings.sortConfig || { ... }`
- **Problem:** Kein Problem, aber Abweichung vom Standard-Pattern
- **Begründung:** Wurde als "FIX" implementiert, um Referenz-Stabilität zu gewährleisten

#### 2. handleMainSortChange:
```typescript
// Zeile 503-510
const handleMainSortChange = useCallback((key: string, direction: 'asc' | 'desc') => {
  if (activeTab === 'todos') {
    updateTasksSortConfig({ key: key as SortConfig['key'], direction });
  } else if (activeTab === 'reservations') {
    updateReservationsSortConfig({ key: key as ReservationSortConfig['key'], direction });
  }
}, [activeTab, updateTasksSortConfig, updateReservationsSortConfig]);
```
**Status:** ⚠️ **ABWEICHUNG** - **Mit `useCallback` stabilisiert, ABER zusätzliche Logik für activeTab**
- **Standard:** Standard zeigt einfache Funktion ohne `useCallback` und ohne Tab-Logik
- **Problem:** Multi-Tab-Logik ist notwendig, da Worktracker mehrere Tabs hat
- **Begründung:** Notwendige Anpassung für Multi-Tab-Komponente

#### 3. handleSort (Table-Header):
```typescript
// Zeile 1183-1189
const handleSort = useCallback((key: SortConfig['key']) => {
    // Table-Header-Sortierung: Aktualisiert Hauptsortierung direkt (synchron für Table & Cards)
    // ✅ FIX: Verwende tasksSettings.sortConfig direkt (aktueller Wert) statt Closure-Variable
    const currentSortConfig = tasksSettings.sortConfig || { key: 'dueDate', direction: 'asc' };
    const newDirection = currentSortConfig.key === key && currentSortConfig.direction === 'asc' ? 'desc' : 'asc';
    updateTasksSortConfig({ key, direction: newDirection });
}, [tasksSettings.sortConfig, updateTasksSortConfig]);
```
**Status:** ⚠️ **ABWEICHUNG** - **Mit `useCallback` stabilisiert, ABER verwendet `tasksSettings.sortConfig` statt `tableSortConfig`**
- **Standard:** Standard zeigt: `const newDirection = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';`
- **Problem:** Verwendet `tasksSettings.sortConfig` direkt statt `tableSortConfig` (konsistenz)
- **Begründung:** Wurde als "FIX" implementiert, um Closure-Probleme zu vermeiden

#### 4. TableColumnConfig Props:
```typescript
// Zeile 2372-2374
mainSortConfig={activeTab === 'todos' ? tableSortConfig : undefined}
onMainSortChange={handleMainSortChange}
showMainSort={true}
```
**Status:** ✅ **KONFORM** - Alle erforderlichen Props vorhanden, mit Tab-Check

#### 5. Sortierlogik (useMemo):
```typescript
// Zeile 1390-1521
const filteredAndSortedTasks = useMemo(() => {
  // ... Filterung
  .sort((a, b) => {
    // Hauptsortierung (tableSortConfig) - für Table & Card gleich (synchron)
    if (tableSortConfig.key) {
      // ... Sortierlogik
    }
  });
}, [tasks, selectedFilterId, searchTerm, tableSortConfig]);
```
**Status:** ✅ **KONFORM** - Verwendet `tableSortConfig`, in Dependencies enthalten

#### 6. Table-Header Visualisierung:
```typescript
// Zeile 2453
onClick={() => handleSort(columnId as keyof Task)}
// ...
<ArrowsUpDownIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
```
**Status:** ❌ **KRITISCHER FEHLER** - **KEINE Visualisierung der aktiven Sortierung**
- **Standard:** Sollte `↑` oder `↓` für aktive Sortierung zeigen
- **Problem:** Zeigt IMMER nur `ArrowsUpDownIcon`, nie aktive Sortierung
- **Begründung:** Fehlende Implementierung der Visualisierung

#### 7. Table-Header SortKey-Mapping:
```typescript
// Zeile 2453
onClick={() => handleSort(columnId as keyof Task)}
```
**Status:** ❌ **KRITISCHER FEHLER** - **Falscher Parameter-Typ**
- **Standard:** `handleSort` erwartet `SortConfig['key']` (z.B. 'dueDate', 'title', 'status')
- **Problem:** Wird mit `columnId as keyof Task` aufgerufen (z.B. 'id', 'title', 'description', 'status', 'dueDate', 'responsibleId', etc.)
- **Problem:** `columnId` kann Werte haben, die nicht in `SortConfig['key']` existieren (z.B. 'actions', 'responsibleAndQualityControl')
- **Begründung:** Fehlende Mapping-Logik wie bei Requests

### Zusammenfassung To-Do's:

| Aspekt | Status | Abweichung |
|--------|--------|------------|
| sortConfig aus Settings | ⚠️ ABWEICHUNG | Verwendet useMemo statt direkter Zuweisung |
| handleMainSortChange | ⚠️ ABWEICHUNG | Mit useCallback + Tab-Logik |
| handleSort | ⚠️ ABWEICHUNG | Mit useCallback + verwendet tasksSettings direkt |
| TableColumnConfig Props | ✅ KONFORM | - |
| Sortierlogik | ✅ KONFORM | - |
| Table-Header Visualisierung | ❌ FEHLER | Keine Anzeige aktiver Sortierung |
| Table-Header SortKey-Mapping | ❌ FEHLER | Falscher Parameter-Typ, fehlende Mapping-Logik |

**Gesamtbewertung:** ❌ **NICHT KONFORM** - Kritische Fehler bei Table-Header Visualisierung und SortKey-Mapping

---

## 🔍 ANALYSE: RESERVATIONS (`frontend/src/pages/Worktracker.tsx`)

### Implementierung:

#### 1. SortConfig-Laden:
```typescript
// Zeile 452-455
const reservationTableSortConfig: ReservationSortConfig = useMemo(() => {
    return reservationsSettings.sortConfig || { key: 'checkInDate', direction: 'desc' };
}, [reservationsSettings.sortConfig]);
```
**Status:** ⚠️ **ABWEICHUNG** - **Verwendet `useMemo` statt direkter Zuweisung**
- **Standard:** Standard zeigt direkte Zuweisung
- **Problem:** Kein Problem, aber Abweichung vom Standard-Pattern
- **Begründung:** Wurde als "FIX" implementiert, um Referenz-Stabilität zu gewährleisten

#### 2. handleMainSortChange:
```typescript
// Zeile 503-510 (gemeinsam mit To-Do's)
const handleMainSortChange = useCallback((key: string, direction: 'asc' | 'desc') => {
  if (activeTab === 'todos') {
    updateTasksSortConfig({ key: key as SortConfig['key'], direction });
  } else if (activeTab === 'reservations') {
    updateReservationsSortConfig({ key: key as ReservationSortConfig['key'], direction });
  }
}, [activeTab, updateTasksSortConfig, updateReservationsSortConfig]);
```
**Status:** ⚠️ **ABWEICHUNG** - **Mit `useCallback` stabilisiert, ABER zusätzliche Logik für activeTab**
- **Begründung:** Notwendige Anpassung für Multi-Tab-Komponente

#### 3. handleReservationSort (Table-Header):
```typescript
// Zeile 1191-1197
const handleReservationSort = useCallback((key: ReservationSortConfig['key']) => {
    // Table-Header-Sortierung: Aktualisiert Hauptsortierung direkt (synchron für Table & Cards)
    // ✅ FIX: Verwende reservationsSettings.sortConfig direkt (aktueller Wert) statt Closure-Variable
    const currentSortConfig = reservationsSettings.sortConfig || { key: 'checkInDate', direction: 'desc' };
    const newDirection = currentSortConfig.key === key && currentSortConfig.direction === 'asc' ? 'desc' : 'asc';
    updateReservationsSortConfig({ key, direction: newDirection });
}, [reservationsSettings.sortConfig, updateReservationsSortConfig]);
```
**Status:** ⚠️ **ABWEICHUNG** - **Mit `useCallback` stabilisiert, ABER verwendet `reservationsSettings.sortConfig` direkt**
- **Problem:** Verwendet `reservationsSettings.sortConfig` direkt statt `reservationTableSortConfig` (konsistenz)
- **Begründung:** Wurde als "FIX" implementiert, um Closure-Probleme zu vermeiden

#### 4. TableColumnConfig Props:
```typescript
// Zeile 3699-3701
mainSortConfig={activeTab === 'reservations' ? reservationTableSortConfig : undefined}
onMainSortChange={handleMainSortChange}
showMainSort={true}
```
**Status:** ✅ **KONFORM** - Alle erforderlichen Props vorhanden, mit Tab-Check

#### 5. Sortierlogik (useMemo):
```typescript
// Zeile 1524-1753
const filteredAndSortedReservations = useMemo(() => {
  // ... Filterung
  .sort((a, b) => {
    // Hauptsortierung (reservationTableSortConfig) - für Table & Card gleich (synchron)
    if (reservationTableSortConfig.key) {
      // ... Sortierlogik
    }
  });
}, [reservations, reservationFilterStatus, reservationFilterPaymentStatus, reservationSearchTerm, reservationTableSortConfig]);
```
**Status:** ✅ **KONFORM** - Verwendet `reservationTableSortConfig`, in Dependencies enthalten

#### 6. Table-Header Visualisierung:
```typescript
// Zeile 3776
onClick={() => handleSort(columnId as keyof Task)}
// ...
<ArrowsUpDownIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
```
**Status:** ❌ **KRITISCHER FEHLER** - **KEINE Visualisierung der aktiven Sortierung**
- **Standard:** Sollte `↑` oder `↓` für aktive Sortierung zeigen
- **Problem:** Zeigt IMMER nur `ArrowsUpDownIcon`, nie aktive Sortierung
- **ZUSÄTZLICHES PROBLEM:** Verwendet `handleSort` statt `handleReservationSort`!
- **Begründung:** Fehlende Implementierung der Visualisierung + falscher Handler

#### 7. Table-Header SortKey-Mapping:
```typescript
// Zeile 3776
onClick={() => handleSort(columnId as keyof Task)}
```
**Status:** ❌ **KRITISCHER FEHLER** - **Falscher Handler + falscher Parameter-Typ**
- **Standard:** Sollte `handleReservationSort` verwenden
- **Problem:** Verwendet `handleSort` (für To-Do's) statt `handleReservationSort`
- **Problem:** Wird mit `columnId as keyof Task` aufgerufen statt `ReservationSortConfig['key']`
- **Problem:** `columnId` kann Werte haben, die nicht in `ReservationSortConfig['key']` existieren
- **Begründung:** Fehlende Mapping-Logik + falscher Handler

### Zusammenfassung Reservations:

| Aspekt | Status | Abweichung |
|--------|--------|------------|
| sortConfig aus Settings | ⚠️ ABWEICHUNG | Verwendet useMemo statt direkter Zuweisung |
| handleMainSortChange | ⚠️ ABWEICHUNG | Mit useCallback + Tab-Logik |
| handleReservationSort | ⚠️ ABWEICHUNG | Mit useCallback + verwendet reservationsSettings direkt |
| TableColumnConfig Props | ✅ KONFORM | - |
| Sortierlogik | ✅ KONFORM | - |
| Table-Header Visualisierung | ❌ FEHLER | Keine Anzeige aktiver Sortierung |
| Table-Header Handler | ❌ FEHLER | Verwendet handleSort statt handleReservationSort |
| Table-Header SortKey-Mapping | ❌ FEHLER | Falscher Parameter-Typ, fehlende Mapping-Logik |

**Gesamtbewertung:** ❌ **NICHT KONFORM** - Kritische Fehler bei Table-Header Visualisierung, Handler und SortKey-Mapping

---

## 📊 VERGLEICHSÜBERSICHT

| Aspekt | Standard (SOLL) | Requests | To-Do's | Reservations |
|--------|----------------|----------|---------|--------------|
| **sortConfig aus Settings** | Direkte Zuweisung | ✅ Direkt | ⚠️ useMemo | ⚠️ useMemo |
| **handleMainSortChange** | Einfache Funktion | ⚠️ Kein useCallback | ⚠️ useCallback + Tab-Logik | ⚠️ useCallback + Tab-Logik |
| **handleSort** | Einfache Funktion | ⚠️ Kein useCallback | ⚠️ useCallback + tasksSettings | ❌ Falscher Handler |
| **TableColumnConfig Props** | mainSortConfig, onMainSortChange, showMainSort | ✅ | ✅ | ✅ |
| **Sortierlogik** | useMemo mit sortConfig | ✅ | ✅ | ✅ |
| **Table-Header Visualisierung** | ↑/↓ für aktiv | ✅ | ❌ Fehlt | ❌ Fehlt |
| **Table-Header SortKey-Mapping** | Mapping columnId → sortKey | ✅ | ❌ Fehlt | ❌ Fehlt |

---

## 🚨 KRITISCHE PROBLEME

### Problem 1: To-Do's - Fehlende Table-Header Visualisierung

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 2453-2457

**Aktueller Code:**
```typescript
<button 
    onClick={() => handleSort(columnId as keyof Task)}
    className="ml-1 focus:outline-none"
>
    <ArrowsUpDownIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
</button>
```

**Problem:**
- Zeigt IMMER nur `ArrowsUpDownIcon`, nie aktive Sortierung
- Benutzer sieht nicht, welche Spalte aktiv sortiert ist
- Keine visuelle Rückmeldung bei Klick

**Standard (Requests als Referenz):**
```typescript
{sortKey && sortConfig.key === sortKey && (sortConfig.direction === 'asc' ? '↑' : '↓')}
```

**Abweichung:** ❌ **KRITISCH** - Fehlende Implementierung

---

### Problem 2: To-Do's - Fehlende SortKey-Mapping

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 2453

**Aktueller Code:**
```typescript
onClick={() => handleSort(columnId as keyof Task)}
```

**Problem:**
- `handleSort` erwartet `SortConfig['key']` (z.B. 'dueDate', 'title', 'status')
- Wird mit `columnId` aufgerufen, das Werte wie 'actions', 'responsibleAndQualityControl' haben kann
- Keine Mapping-Logik von `columnId` zu `SortConfig['key']`

**Standard (Requests als Referenz):**
```typescript
let sortKey: SortConfig['key'] | undefined;
if (columnId === 'title') sortKey = 'title';
if (columnId === 'status') sortKey = 'status';
if (columnId === 'type') sortKey = 'type';
if (columnId === 'branch') sortKey = 'branch.name';
if (columnId === 'dueDate') sortKey = 'dueDate';

onClick={sortKey ? () => handleSort(sortKey) : undefined}
```

**Abweichung:** ❌ **KRITISCH** - Fehlende Mapping-Logik

---

### Problem 3: Reservations - Falscher Handler

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 3776

**Aktueller Code:**
```typescript
onClick={() => handleSort(columnId as keyof Task)}
```

**Problem:**
- Verwendet `handleSort` (für To-Do's) statt `handleReservationSort` (für Reservations)
- `handleSort` verwendet `updateTasksSortConfig`, nicht `updateReservationsSortConfig`
- Sortierung wird auf falsche Settings angewendet

**Standard:**
- Sollte `handleReservationSort` verwenden

**Abweichung:** ❌ **KRITISCH** - Falscher Handler

---

### Problem 4: Reservations - Fehlende Table-Header Visualisierung

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 3776-3780

**Aktueller Code:**
```typescript
<button 
    onClick={() => handleSort(columnId as keyof Task)}
    className="ml-1 focus:outline-none"
>
    <ArrowsUpDownIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
</button>
```

**Problem:**
- Zeigt IMMER nur `ArrowsUpDownIcon`, nie aktive Sortierung
- Benutzer sieht nicht, welche Spalte aktiv sortiert ist

**Abweichung:** ❌ **KRITISCH** - Fehlende Implementierung

---

### Problem 5: Reservations - Fehlende SortKey-Mapping

**Datei:** `frontend/src/pages/Worktracker.tsx`  
**Zeile:** 3776

**Aktueller Code:**
```typescript
onClick={() => handleSort(columnId as keyof Task)}
```

**Problem:**
- `handleReservationSort` erwartet `ReservationSortConfig['key']`
- Wird mit `columnId` aufgerufen, das nicht gemappt wird
- Keine Mapping-Logik von `columnId` zu `ReservationSortConfig['key']`

**Abweichung:** ❌ **KRITISCH** - Fehlende Mapping-Logik

---

## 📝 ZUSAMMENFASSUNG DER ABWEICHUNGEN

### Requests:
- ⚠️ `handleMainSortChange` nicht mit `useCallback` stabilisiert (Performance)
- ⚠️ `handleSort` nicht mit `useCallback` stabilisiert (Performance)
- ✅ Alle anderen Aspekte konform

### To-Do's:
- ⚠️ `tableSortConfig` mit `useMemo` statt direkter Zuweisung (Abweichung, aber kein Problem)
- ⚠️ `handleMainSortChange` mit `useCallback` + Tab-Logik (notwendige Anpassung)
- ⚠️ `handleSort` verwendet `tasksSettings.sortConfig` direkt (konsistenz)
- ❌ **KRITISCH:** Fehlende Table-Header Visualisierung (↑/↓)
- ❌ **KRITISCH:** Fehlende SortKey-Mapping (columnId → SortConfig['key'])

### Reservations:
- ⚠️ `reservationTableSortConfig` mit `useMemo` statt direkter Zuweisung (Abweichung, aber kein Problem)
- ⚠️ `handleMainSortChange` mit `useCallback` + Tab-Logik (notwendige Anpassung)
- ⚠️ `handleReservationSort` verwendet `reservationsSettings.sortConfig` direkt (konsistenz)
- ❌ **KRITISCH:** Falscher Handler (`handleSort` statt `handleReservationSort`)
- ❌ **KRITISCH:** Fehlende Table-Header Visualisierung (↑/↓)
- ❌ **KRITISCH:** Fehlende SortKey-Mapping (columnId → ReservationSortConfig['key'])

---

## 🎯 FAZIT

**Requests:** ✅ Funktioniert korrekt, nur Performance-Optimierungen fehlen

**To-Do's:** ❌ **KRITISCHE FEHLER** - Table-Header zeigt keine aktive Sortierung, fehlende Mapping-Logik

**Reservations:** ❌ **KRITISCHE FEHLER** - Falscher Handler, keine aktive Sortierung, fehlende Mapping-Logik

**Hauptproblem:** To-Do's und Reservations haben die Table-Header-Sortierung nicht vollständig implementiert. Requests dient als korrektes Referenz-Beispiel.
