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

## Claude-spezifische Funktionen

### Datenbankzugriff und Debugging
- **[claude_database_access.md](claude_database_access.md)** - Vollständige Anleitung für direkten Datenbankzugriff via MCP und REST-API sowie Frontend-Console-Monitoring
- **[claude_usage_guidelines.md](claude_usage_guidelines.md)** - Richtlinien für die automatische Tool-Nutzung durch Claude
- **[log_housekeeping.md](log_housekeeping.md)** - Automatisches Log-Management und Rotation-System für Claude Console Logs

### UI-Standards und Container-Strukturen
- **[container-structures.md](docs/container-structures.md)** - Konsistente Container-Strukturen für Seiten und Boxen - **MUSS bei neuen Seiten befolgt werden!**

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
- **Consultation-Modul** - Beratungsstunden-Verwaltung mit Client-Tracking
- **Abrechnungsmodul (in Planung)** - Swiss QR-Rechnungen für Beratungsstunden

## Implementierungspläne

Für die strukturierte Umsetzung neuer Module existieren detaillierte Schritt-für-Schritt Pläne:

- **Consultation-Modul** - Vollständig in 3 Teilen dokumentiert
- **Abrechnungsmodul** - Plan für Swiss QR-Rechnungen mit Zahlungsverfolgung

Details zu allen Plänen siehe `/docs/implementation_plans/` 