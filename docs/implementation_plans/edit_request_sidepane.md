# Implementation Plan: EditRequestModal zu Sidepane

## Übersicht
Umwandlung des bestehenden EditRequestModal in eine Sidepane-Komponente für eine bessere Benutzerfreundlichkeit und konsistenteres Design.

## Technische Anforderungen
- Beibehaltung aller bestehenden Funktionalitäten
- Anpassung des Layouts für Sidepane-Format
- Responsive Design für verschiedene Bildschirmgrößen
- Smooth Animation beim Öffnen/Schließen
- Konsistentes Styling mit anderen Sidepanes im System

## Komponenten-Änderungen

### 1. Neue Komponente: EditRequestSidepane
```typescript
// Neue Props-Definition
interface EditRequestSidepaneProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestUpdated: () => void;
  request: {
    id: number;
    title: string;
    responsible: {
      id: number;
    };
    branch: {
      id: number;
    };
    dueDate: string | null;
    createTodo: boolean;
  };
}
```

### 2. Layout-Änderungen
- Position: Rechte Seite des Bildschirms
- Breite: 30% des Bildschirms (min-width: 400px, max-width: 600px)
- Höhe: 100% der Viewport-Höhe
- Scrollbar für Overflow-Content
- Sticky Header mit Titel und Schließen-Button
- Sticky Footer für Action-Buttons

### 3. UI/UX Verbesserungen
- Smooth slide-in/slide-out Animation
- Backdrop mit Blur-Effekt
- Verbesserte Formular-Validierung
- Bessere Fehleranzeige
- Loading States für Aktionen

## Implementierungsschritte

1. **Komponenten-Setup (2h)**
   - Erstellen der neuen EditRequestSidepane.tsx
   - Migration der bestehenden Logik
   - Implementierung des Basis-Layouts

2. **Styling (4h)**
   - Implementierung des Sidepane-Designs
   - Responsive Anpassungen
   - Animation und Transitions
   - Konsistentes Styling mit anderen Sidepanes

3. **Funktionalität (3h)**
   - Anpassung der Form-Handling Logik
   - Implementierung der verbesserten Validierung
   - Error Handling Optimierung
   - Loading States

4. **Integration (2h)**
   - Ersetzen des alten Modals in allen Views
   - Anpassung der Parent-Komponenten
   - Event-Handling Updates

5. **Testing (3h)**
   - Unit Tests für neue Komponente
   - Integration Tests
   - Responsive Testing
   - Browser Kompatibilitätstests

## Geschätzter Aufwand
- Gesamtaufwand: 14 Stunden
  - Komponenten-Setup: 2h
  - Styling: 4h
  - Funktionalität: 3h
  - Integration: 2h
  - Testing: 3h

## Risiken
- Potenzielle Breaking Changes in Parent-Komponenten
- Performance-Implikationen durch Animation
- Responsive Edge Cases
- Inkonsistenzen mit bestehendem Design-System

## Nächste Schritte
1. Review des Implementationsplans
2. Setup der neuen Komponente
3. Schrittweise Migration der Funktionalität
4. Testing und QA
5. Deployment und Monitoring 