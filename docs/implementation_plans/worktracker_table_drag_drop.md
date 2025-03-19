# Implementation Plan: Worktracker Drag & Drop

## Übersicht
Optimierung der Drag & Drop Funktionalität in der Worktracker-Tabelle für eine bessere Benutzerfreundlichkeit und erweiterte Möglichkeiten.

## Technische Anforderungen
- Drag & Drop für Zeilen (Tasks)
- Drag & Drop für Spalten
- Visuelle Feedback während des Drag & Drop
- Performance-Optimierung
- Konsistentes Verhalten mit Filtern und Sortierung

## Komponenten-Änderungen

### 1. Erweiterte DragDropState-Definition
```typescript
interface DragDropState {
  // Für Spalten
  draggedColumn: string | null;
  dragOverColumn: string | null;
  columnDropIndicator: 'before' | 'after' | null;
  
  // Für Zeilen
  draggedTask: Task | null;
  dragOverTask: Task | null;
  taskDropIndicator: 'before' | 'after' | null;
  
  // Für Status-Änderungen via Drag & Drop
  allowStatusChange: boolean;
  targetStatus: Task['status'] | null;
}

// Erweiterte Task-Definition für Drag & Drop
interface DraggableTask extends Task {
  isDraggable: boolean;
  allowedDropZones: Task['status'][];
}
```

### 2. UI-Komponenten
- Verbesserte visuelle Indikatoren für Drag & Drop
- Status-Zonen für Task-Verschiebung
- Drag Handle für bessere Usability
- Feedback für nicht erlaubte Aktionen
- Touch-Support für mobile Geräte

### 3. Performance-Optimierungen
- Virtualisierung für große Tabellen
- Optimierte Event-Handler
- Reduzierte Re-Renders
- Effiziente DOM-Updates

## Implementierungsschritte

1. **Basis-Implementierung (3h)**
   - Erweiterung der DragDropState-Schnittstelle
   - Implementierung der Drag & Drop Logik
   - Event-Handler Setup
   ```typescript
   const handleDragStart = (task: Task, event: DragEvent) => {
     event.dataTransfer?.setData('text/plain', task.id.toString());
     setDragDropState({
       ...dragDropState,
       draggedTask: task,
       allowStatusChange: canChangeStatus(task)
     });
   };

   const handleDrop = async (event: DragEvent, targetStatus: Task['status']) => {
     event.preventDefault();
     const taskId = parseInt(event.dataTransfer?.getData('text/plain') || '0');
     if (taskId && dragDropState.allowStatusChange) {
       await handleStatusChange(taskId, targetStatus);
     }
     resetDragState();
   };
   ```

2. **UI-Entwicklung (4h)**
   - Drag Handles und Indikatoren
   - Status-Zonen Layout
   - Touch-Event Integration
   - Responsive Anpassungen

3. **Status-Management (3h)**
   - Validierung von Status-Änderungen
   - Optimierte Update-Logik
   - Error Handling
   - Undo/Redo Funktionalität

4. **Performance & Optimierung (2h)**
   - Virtualisierung Implementation
   - Event-Handler Optimierung
   - State Management Verbesserung
   - Performance-Monitoring

## Geschätzter Aufwand
- Gesamtaufwand: 12 Stunden
  - Basis-Implementierung: 3h
  - UI-Entwicklung: 4h
  - Status-Management: 3h
  - Performance & Optimierung: 2h

## Risiken
- Komplexität der Status-Validierung
- Performance bei großen Tabellen
- Touch-Device Kompatibilität
- Browser-spezifische Unterschiede

## Nächste Schritte
1. Review des Implementationsplans
2. Prototyp der Drag & Drop Funktionalität
3. UI-Komponenten Entwicklung
4. Status-Management Integration
5. Performance-Testing 