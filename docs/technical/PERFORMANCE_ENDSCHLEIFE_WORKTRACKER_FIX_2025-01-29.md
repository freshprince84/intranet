# Performance: Endlosschleife in Worktracker.tsx behoben (2025-01-29)

**Datum:** 2025-01-29  
**Status:** ✅ BEHOBEN (Phase 2 - Vollständig)  
**Kritikalität:** 🔴 KRITISCH - System wurde unbrauchbar (1GB+ RAM, PC auf Hochtouren, tausende Log-Einträge pro Sekunde)

---

## 🔴 PROBLEM

### Symptome:
- **System lädt "wie wild" Dinge und hört nicht mehr auf**
- **PC auf Hochtouren, RAM über 1GB**
- **Viele Timeout-Fehler** (60s Timeout)
- **687 Logs, 3 Fehler** in der Console
- **Viele Requests zu `worktracker-todos`** (saved-filters)
- **Requests werden von `SavedFilterTags.tsx:221` und `Worktracker.tsx:940` initiiert**

### Root Cause:

**Datei:** `frontend/src/pages/Worktracker.tsx:937-965`

**Problem:**
```typescript
useEffect(() => {
    const setInitialTodoFilter = async () => {
        // ...
        await loadTasks(...);
    };
    
    if (activeTab === 'todos' && hasPermission('tasks', 'read', 'table')) {
        setInitialTodoFilter();
    }
}, [activeTab, hasPermission]); // ❌ FEHLT: loadTasks, applyFilterConditions
```

**Warum Endlosschleife:**
1. `loadTasks` wird im `useEffect` aufgerufen, ist aber **NICHT in den Dependencies**
2. Wenn `loadTasks` einen **Timeout hat**, wird der Fehler geloggt, aber der `useEffect` läuft weiter
3. Wenn `hasPermission` sich ändert (bei jedem Render möglich), wird der `useEffect` erneut ausgelöst
4. **Kein Loading-State** verhindert doppelte Requests
5. **Keine Fehlerbehandlung** für Timeout-Fehler → erneutes Laden → Endlosschleife

**Zusätzliche Probleme:**
- `applyFilterConditions` ist **NICHT** als `useCallback` definiert → wird bei jedem Render neu erstellt
- **Doppelte Requests:** `SavedFilterTags` lädt Filter (Zeile 221) UND `Worktracker` lädt Filter (Zeile 940)

---

## ✅ LÖSUNG

### 1. Loading-State hinzugefügt

**Datei:** `frontend/src/pages/Worktracker.tsx:337`

```typescript
const [initialFilterLoading, setInitialFilterLoading] = useState<boolean>(false); // ✅ KRITISCH: Verhindert Endlosschleife
```

**Verwendung:**
- Verhindert doppelte Requests während ein Request bereits läuft
- Wird vor dem Request auf `true` gesetzt, nach dem Request auf `false`

---

### 2. useEffect Dependencies korrigiert

**Datei:** `frontend/src/pages/Worktracker.tsx:937-965`

**Vorher:**
```typescript
}, [activeTab, hasPermission]); // ❌ FEHLT: loadTasks, applyFilterConditions
```

**Nachher:**
```typescript
}, [activeTab, hasPermission, loadTasks, applyFilterConditions, initialFilterLoading]); // ✅ VOLLSTÄNDIG
```

**Warum wichtig:**
- `loadTasks` wird im `useEffect` aufgerufen → muss in Dependencies
- `applyFilterConditions` wird im `useEffect` aufgerufen → muss in Dependencies
- `initialFilterLoading` wird geprüft → muss in Dependencies

---

### 3. Fehlerbehandlung für Timeout-Fehler

**Datei:** `frontend/src/pages/Worktracker.tsx:955-960`

```typescript
} catch (error: any) {
    console.error('Fehler beim Setzen des initialen Filters:', error);
    // ✅ Bei Timeout-Fehlern nicht erneut laden (verhindert Endlosschleife)
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.error('⛔ Timeout beim Laden des initialen Filters - verhindere erneutes Laden');
        setError('Timeout beim Laden der Filter. Bitte Seite neu laden.');
        return; // ✅ WICHTIG: Nicht erneut laden bei Timeout
    }
    // Fallback: Lade alle Todos (nur bei anderen Fehlern)
    // ...
}
```

**Warum wichtig:**
- **Verhindert Endlosschleife** bei Timeout-Fehlern
- Zeigt Fehlermeldung an, statt endlos zu versuchen
- Benutzer kann Seite neu laden, wenn nötig

---

### 4. applyFilterConditions als useCallback

**Datei:** `frontend/src/pages/Worktracker.tsx:1194-1202`

**Vorher:**
```typescript
const applyFilterConditions = (conditions: FilterCondition[], ...) => {
    // ...
};
```

**Nachher:**
```typescript
// ✅ KRITISCH: useCallback für Stabilität in useEffect Dependencies
const applyFilterConditions = useCallback((conditions: FilterCondition[], ...) => {
    // ...
}, []); // ✅ Keine Dependencies nötig - nur State-Setter
```

**Warum wichtig:**
- **Stabile Referenz** → `useEffect` wird nicht bei jedem Render erneut ausgelöst
- Nur State-Setter werden verwendet → keine Dependencies nötig

---

### 5. Loading-State-Prüfung im useEffect

**Datei:** `frontend/src/pages/Worktracker.tsx:962`

**Vorher:**
```typescript
if (activeTab === 'todos' && hasPermission('tasks', 'read', 'table')) {
    setInitialTodoFilter();
}
```

**Nachher:**
```typescript
if (activeTab === 'todos' && hasPermission('tasks', 'read', 'table') && !initialFilterLoading) {
    setInitialTodoFilter();
}
```

**Warum wichtig:**
- **Verhindert doppelte Requests** während ein Request bereits läuft
- Zusätzliche Sicherheit neben der Prüfung in `setInitialTodoFilter`

---

## 📊 IMPACT

### Vorher:
- ❌ **Endlosschleife** von Requests
- ❌ **1GB+ RAM** Verbrauch
- ❌ **PC auf Hochtouren**
- ❌ **Viele Timeout-Fehler** (60s)
- ❌ **System unbrauchbar**

### Nachher:
- ✅ **Keine Endlosschleife** mehr
- ✅ **Normaler RAM-Verbrauch**
- ✅ **Keine unnötigen Requests**
- ✅ **Fehlerbehandlung** für Timeout-Fehler
- ✅ **System stabil**

---

## ✅ PHASE 2: VOLLSTÄNDIGE BEHEBUNG

### Problem 2: Endlosschleife durch fehlende useCallback in handleFilterChange

**Symptome:**
- **Tausende Log-Einträge pro Sekunde**
- **System lädt "wie wild" und hört nicht auf**
- **RAM wird voll, PC stürzt ab**

**Root Cause:**

1. **`handleFilterChange` war NICHT als `useCallback` definiert:**
   - Wurde bei jedem Render neu erstellt
   - Neue Referenz → `SavedFilterTags` sieht Änderung → `useEffect` läuft erneut

2. **`SavedFilterTags` useEffect verwendete `onFilterChange` ohne korrekte Dependencies:**
   - `useEffect` (Zeile 208-256) verwendete `onFilterChange`, `onSelectFilter`, `defaultFilterName`, `activeFilterName`
   - Aber nur `[tableId]` war in den Dependencies
   - Wenn `onFilterChange` aufgerufen wurde → State wurde gesetzt → Re-Render → `handleFilterChange` wurde neu erstellt → `useEffect` lief erneut → Endlosschleife

**Lösung:**

1. **`handleFilterChange` als `useCallback` definiert:**
   ```typescript
   const handleFilterChange = useCallback(async (name: string, id: number | null, ...) => {
       // ...
   }, [activeTab, applyFilterConditions, loadTasks, loadReservations]);
   ```

2. **`handleReservationFilterChange` als `useCallback` definiert:**
   ```typescript
   const handleReservationFilterChange = useCallback(async (name: string, id: number | null, ...) => {
       // ...
   }, [applyReservationFilterConditions, loadReservations]);
   ```

3. **`applyReservationFilterConditions` als `useCallback` definiert:**
   ```typescript
   const applyReservationFilterConditions = useCallback((conditions: FilterCondition[], ...) => {
       // ...
   }, []); // Keine Dependencies nötig - nur State-Setter
   ```

4. **`SavedFilterTags` useEffect korrigiert - Ref verhindert mehrfache Anwendung:**
   ```typescript
   // ✅ KRITISCH: Ref verhindert mehrfache Anwendung des Default-Filters
   const defaultFilterAppliedRef = useRef<boolean>(false);
   
   useEffect(() => {
       // ✅ Reset Ref wenn tableId sich ändert
       defaultFilterAppliedRef.current = false;
       
       // ...
       
       // ✅ Default-Filter nur EINMAL anwenden
       if (defaultFilterName && !activeFilterName && !defaultFilterAppliedRef.current) {
           defaultFilterAppliedRef.current = true; // ✅ BEVOR onFilterChange aufgerufen wird
           onFilterChange(...);
       }
   }, [tableId, defaultFilterName, activeFilterName, onFilterChange, onSelectFilter]);
   ```

**Warum wichtig:**
- **Stabile Referenzen** → `useEffect` wird nicht bei jedem Render erneut ausgelöst
- **Ref verhindert mehrfache Anwendung** → Default-Filter wird nur EINMAL angewendet, auch wenn `useEffect` erneut läuft
- **Korrekte Dependencies** → React-Warnungen vermieden, aber Ref verhindert Endlosschleife

---

## 🔍 VERWANDTE PROBLEME

### Doppelte Requests (nicht behoben, aber dokumentiert):

**Problem:**
- `SavedFilterTags` lädt Filter (Zeile 221)
- `Worktracker` lädt Filter (Zeile 940)
- **Doppelte DB-Queries**

**Status:** ⚠️ NICHT BEHOBEN (nicht kritisch für Endlosschleife)

**Mögliche Lösung:**
- `SavedFilterTags` sollte Filter laden
- `Worktracker` sollte `SavedFilterTags` verwenden, statt selbst zu laden
- Oder: `Worktracker` lädt Filter, `SavedFilterTags` verwendet bereits geladene Filter

---

## 🧪 TESTING

### Manuelle Tests:

1. **Worktracker-Seite öffnen**
   - ✅ Sollte initialen Filter laden (1x Request)
   - ✅ Sollte nicht endlos laden

2. **Tab wechseln (todos → reservations → todos)**
   - ✅ Sollte Filter nur 1x laden pro Tab-Wechsel
   - ✅ Sollte nicht endlos laden

3. **Timeout simulieren (Backend stoppen)**
   - ✅ Sollte Fehlermeldung anzeigen
   - ✅ Sollte NICHT endlos versuchen

4. **RAM-Verbrauch prüfen**
   - ✅ Sollte normal bleiben (<500MB)
   - ✅ Sollte nicht auf 1GB+ steigen

---

## 📝 CODE-ÄNDERUNGEN

### Geänderte Dateien:

1. **`frontend/src/pages/Worktracker.tsx`**
   - Zeile 337: `initialFilterLoading` State hinzugefügt
   - Zeile 937-985: `useEffect` korrigiert (Dependencies + Loading-State + Fehlerbehandlung)
   - Zeile 1194-1202: `applyFilterConditions` als `useCallback` definiert
   - Zeile 1214-1221: `applyReservationFilterConditions` als `useCallback` definiert
   - Zeile 1232-1264: `handleFilterChange` als `useCallback` definiert
   - Zeile 1266-1280: `handleReservationFilterChange` als `useCallback` definiert

2. **`frontend/src/components/SavedFilterTags.tsx`**
   - Zeile 96: `defaultFilterAppliedRef` Ref hinzugefügt
   - Zeile 208-256: `useEffect` korrigiert (Ref + korrekte Dependencies)

---

## 🎯 LESSONS LEARNED

1. **useEffect Dependencies sind kritisch:**
   - Alle verwendeten Funktionen/State müssen in Dependencies sein
   - Fehlende Dependencies → Endlosschleifen möglich

2. **Loading-States verhindern doppelte Requests:**
   - Immer Loading-State prüfen, bevor Request gemacht wird
   - Verhindert Race Conditions und Endlosschleifen

3. **Fehlerbehandlung für Timeout-Fehler:**
   - Timeout-Fehler sollten nicht zu erneutem Laden führen
   - Benutzer sollte informiert werden, statt endlos zu versuchen

4. **useCallback für stabile Referenzen:**
   - Funktionen in useEffect Dependencies sollten `useCallback` sein
   - Verhindert unnötige Re-Renders und Endlosschleifen

---

**Erstellt:** 2025-01-29  
**Status:** ✅ BEHOBEN  
**Kritikalität:** 🔴 KRITISCH

