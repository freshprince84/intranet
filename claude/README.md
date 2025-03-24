# Claude-spezifische Ressourcen für das Intranet-Projekt

Dieses Verzeichnis enthält speziell für Claude optimierte Ressourcen, die es KI-Assistenten ermöglichen, effizienter mit dem Codebase zu arbeiten. Die Struktur unterstützt eine verbesserte Analyse, Debug-Prozesse und eine bessere Kontexterhaltung.

## WICHTIG: Dokumentationshierarchie beachten

1. **Stufe 1: Grundregeln** - mdfiles.mdc und immer.mdc
   - Enthält nur Grundregeln und Verweise auf wichtige Dokumentationsdateien
   - **NIEMALS direkt aktualisieren!**

2. **Stufe 2: Überblicksdokumente** - README.md und claude/README.md (HIER)
   - Enthalten Projektübersicht und Verweise auf alle spezifischen Dokumentationsdateien
   - **Nur Verweise hier aktualisieren, keine Implementierungsdetails!**

3. **Stufe 3: Detaillierte Dokumentation** - Spezifische .md-Dateien
   - Dort gehören alle Implementierungsdetails hinein
   - Nach Funktionalität/Modul strukturiert

> **Zur Beachtung:** Jegliche Implementierungsdetails, spezifische Funktionen und detaillierte Beschreibungen gehören in die spezifischen Dokumentationsdateien (Stufe 3), NICHT in diese Datei!

## Verzeichnisstruktur der Claude-Ressourcen

- **metadata/** - Normalisierte Informationen über den Codebase, Komponentenabhängigkeiten, Fileklassifikationen
- **code_index/** - Semantische Beziehungen im Code, Funktionsaufrufe, Typbeziehungen
- **debug_history/** - Protokollierte Debugging-Sessions mit Fehler-Lösungspaaren
- **patterns/** - Kanonische Implementierungsmuster mit Beispielen
- **cheatsheets/** - Komponentenspezifische Kurzreferenzleitfäden
- **qa/** - Datenbank mit gelösten Problemen, nach Komponenten und Fehlertypen indiziert
- **delta/** - Semantische Änderungsprotokolle zwischen Versionen
- **docs/** - Ergänzende Dokumentation für Claude
- **memory_anchors.md** - Dokumentation zu speziellen Code-Ankerpunkten

## Memory Anchors

Im Code werden spezielle Kommentare als "Memory Anchors" verwendet, um auf spezifische Stellen zu verweisen. Diese folgen dem Format:
```
/* CLAUDE-ANCHOR: [UUID] - [BESCHREIBUNG] */
```

## Hauptsystemfunktionen (Übersicht)

Folgende Hauptsysteme sind im Intranet-Projekt implementiert:

- **Benutzerauthentifizierung und Berechtigungssystem**
- **Arbeitszeiterfassung und -verwaltung**
- **Request- und Task-Management**
- **Notification-System**
- **Cerebro Wiki**
- **Team-Worktime-Control**
- **Lohnabrechnung**
- **Dokumentenerkennung**
- **Erweitertes Filtersystem**
- **Einheitliches Suchfeld-Design**
- **Mobile App (React Native)** - Mobile Version des Intranet-Systems 