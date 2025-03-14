# Claude Memory Anchors

Memory Anchors sind spezielle Kommentare im Code, die es Claude ermöglichen, wichtige Stellen im Code einfach zu identifizieren und sich darauf zu beziehen. Diese Anchors verwenden eine UUID für eindeutige Identifizierung und einen beschreibenden Namen.

## Format

```
/* CLAUDE-ANCHOR: [UUID] - [BESCHREIBUNG] */
```

## Vorhandene Memory Anchors

| UUID | Beschreibung | Dateipfad | Zweck |
|------|--------------|-----------|-------|
| 8c721a3e-3f18-4d1b-b2ed-3c6a5e9b5c8f | WORKTRACKER_COMPONENT | claude/cheatsheets/worktracker.md | Referenz auf die Worktracker-Komponente im Cheat Sheet |
| a7c238f1-9d6a-42e5-8af1-6d8b2e9a4f18 | WORKTIME_TRACKER_COMPONENT | frontend/src/components/WorktimeTracker.tsx | Markiert den Beginn der WorktimeTracker Komponente |
| 5f13e29c-4712-4dea-b8ac-eaf7d2e89b76 | WORKTIME_CONTEXT | frontend/src/contexts/WorktimeContext.tsx | Markiert den Beginn des WorktimeContext Providers |

## Verwendung

Memory Anchors können in Claude-Konversationen verwendet werden, um auf spezifische Codestellen zu verweisen. Zum Beispiel:

```
Überprüfe bitte die Implementierung im WorktimeContext (CLAUDE-ANCHOR: 5f13e29c-4712-4dea-b8ac-eaf7d2e89b76) in Bezug auf das Zeitzonenproblem.
```

## Richtlinien für Memory Anchors

1. **Eindeutigkeit**: Verwende immer eine neue UUID für jeden Anchor
2. **Beschreibende Namen**: Wähle aussagekräftige Namen in Großbuchstaben
3. **Strategische Platzierung**: Setze Anchors an wichtigen Stellen wie:
   - Beginn von Klassen/Komponenten
   - Wichtige Funktionen
   - Komplexe Algorithmen
   - Bekannte Problemstellen
4. **Dokumentation**: Halte diese Liste aktuell

## Generieren einer neuen UUID

Um eine neue UUID zu generieren, kann man in Node.js folgendes ausführen:

```javascript
const { randomUUID } = require('crypto');
console.log(randomUUID());
```

Oder in Python:

```python
import uuid
print(uuid.uuid4())
```

Oder online-Tools wie [UUID Generator](https://www.uuidgenerator.net/) verwenden. 