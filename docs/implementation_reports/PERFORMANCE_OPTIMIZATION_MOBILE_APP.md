# Performance-Optimierung Mobile App: Analyse & Umsetzung

## Übersicht
Datum: 2024-12-XX
Ziel: Reduzierung unnötiger Reloads in der Mobile App (React Native), analog zu den Web-App Optimierungen

## Analyse

### Gefundene Problemstellen

#### 1. WorktimeScreen.tsx - Task-Updates
**Problem:**
- `handleTaskUpdated()` ruft `loadTasks()` auf (Zeile 862)
- Dies führt zu vollständigem Reload der Task-Liste bei jedem Task-Update

**Aktuelle Implementierung:**
```typescript
const handleTaskUpdated = () => {
    console.log('[WorktimeScreen] Task updated, reloading tasks...');
    setShowTaskDetailModal(false); // Modal schließen
    loadTasks(); // Taskliste neu laden
};
```

#### 2. TaskDetailModal.tsx - Callback ohne Parameter
**Problem:**
- `onTaskUpdated()` wird ohne Parameter aufgerufen
- Parent-Komponente kann nicht selektiv aktualisieren
- Muss vollständigen Reload durchführen

**Aktuelle Implementierung:**
```typescript
if (onTaskUpdated) {
    onTaskUpdated(); // Kein Parameter!
}
```

### Bereits optimierte Bereiche ✅

#### Timer-Start/Stop
- ✅ `startTimer()` lädt keine Tasks neu
- ✅ `stopTimer()` lädt nur `loadWorkTimes()`, nicht `loadTasks()`
- ✅ Timer-Operationen beeinflussen Task-Liste nicht

## Geplante Optimierungen

### Phase 1: TaskDetailModal.tsx
1. `onTaskUpdated` Callback erweitern: `onTaskUpdated?: (task: Task) => void`
2. Nach Create: `onTaskUpdated(newTask)` statt `onTaskUpdated()`
3. Nach Update: `onTaskUpdated(updatedTask)` statt `onTaskUpdated()`
4. Nach Delete: Optional - kann bestehen bleiben oder optimiert werden

### Phase 2: WorktimeScreen.tsx
1. `handleTaskUpdated` erweitern: `(task?: Task) => void`
2. Selektives Update: Task zur Liste hinzufügen/aktualisieren statt vollständigem Reload
3. Fallback: Vollständiges Reload wenn kein Task übergeben

## Status

### Abgeschlossen
- ✅ Analyse durchgeführt
- ✅ Problemstellen identifiziert
- ✅ Phase 1: TaskDetailModal.tsx Callback optimiert
- ✅ Phase 2: WorktimeScreen.tsx selektives Update implementiert

## Implementierte Änderungen

### Phase 1: TaskDetailModal.tsx ✅

**Änderungen:**

1. **Interface erweitert:**
   ```typescript
   // Vorher:
   onTaskUpdated?: () => void;
   
   // Nachher:
   onTaskUpdated?: (task: Task | null, deletedTaskId?: number) => void;
   ```

2. **handleSave - Create/Update:**
   - Übergibt jetzt `savedTask` an den Callback
   - Kein vollständiger Reload mehr nötig

3. **handleStatusChange:**
   - `updateStatus` gibt bereits vollständige Task-Daten zurück
   - Übergibt `updatedTask` an den Callback

4. **handleDelete:**
   - Übergibt `null` und `deletedTaskId` an den Callback
   - Parent kann Task aus Liste entfernen

### Phase 2: WorktimeScreen.tsx ✅

**Änderungen:**

1. **handleTaskUpdated erweitert:**
   ```typescript
   // Vorher:
   const handleTaskUpdated = () => {
     loadTasks(); // Vollständiger Reload
   };
   
   // Nachher:
   const handleTaskUpdated = (task: Task | null, deletedTaskId?: number) => {
     if (deletedTaskId) {
       // Entferne Task aus Liste
       setTasks(prevTasks => prevTasks.filter(t => t.id !== deletedTaskId));
     } else if (task) {
       // Update oder Add Task selektiv
       const existingIndex = prevTasks.findIndex(t => t.id === task.id);
       if (existingIndex >= 0) {
         // Update bestehenden Task
         updatedTasks[existingIndex] = task;
       } else {
         // Neuer Task - füge hinzu
         return [task, ...prevTasks];
       }
     } else {
       // Fallback: Vollständiges Reload
       loadTasks();
     }
   };
   ```

## Geänderte Dateien

1. `IntranetMobileApp/src/components/TaskDetailModal.tsx`
   - Interface `TaskDetailModalProps` erweitert
   - `handleSave`: Übergibt `savedTask` an Callback
   - `handleStatusChange`: Nutzt bereits vorhandene vollständige Daten von `updateStatus`
   - `handleDelete`: Übergibt `null` und `deletedTaskId`

2. `IntranetMobileApp/src/screens/WorktimeScreen.tsx`
   - `handleTaskUpdated`: Selektive Updates statt vollständigem Reload

## Erwartete Verbesserungen

- ~80% weniger API-Calls bei Task-Operationen
- Sofortiges UI-Feedback ohne Ladezeiten
- Bessere Performance, besonders bei langen Task-Listen
- Funktionalität bleibt vollständig erhalten

## Tests

### Manuelle Tests erforderlich
- [ ] Task erstellen - prüfen dass Task sofort in Liste erscheint
- [ ] Task bearbeiten - prüfen dass Änderungen sofort sichtbar sind
- [ ] Task Status ändern - prüfen dass Status sofort aktualisiert wird
- [ ] Task löschen - prüfen dass Task sofort aus Liste verschwindet
- [ ] Prüfen dass keine unnötigen API-Calls gemacht werden (Netzwerk-Tab)

