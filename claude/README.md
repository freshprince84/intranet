# Claude-spezifische Ressourcen für das Intranet-Projekt

Dieses Verzeichnis enthält speziell für Claude optimierte Ressourcen, die es KI-Assistenten ermöglichen, effizienter mit dem Codebase zu arbeiten. Die Struktur unterstützt eine verbesserte Analyse, Debug-Prozesse und eine bessere Kontexterhaltung.

## Verzeichnisstruktur

- **metadata/** - Normalisierte Informationen über den Codebase, Komponentenabhängigkeiten, Fileklassifikationen und Dokumentationsübersicht
- **code_index/** - Semantische Beziehungen im Code, Funktionsaufrufe, Typbeziehungen
- **debug_history/** - Protokollierte Debugging-Sessions mit Fehler-Lösungspaaren
- **patterns/** - Kanonische Implementierungsmuster mit Beispielen
- **cheatsheets/** - Komponentenspezifische Kurzreferenzleitfäden
- **qa/** - Datenbank mit gelösten Problemen, nach Komponenten und Fehlertypen indiziert
- **delta/** - Semantische Änderungsprotokolle zwischen Versionen

## Verwendung

Diese Ressourcen sind primär für KI-Assistenten wie Claude gedacht, um:
1. Den Kontext des Projekts schneller zu erfassen
2. Häufige Probleme effizienter zu identifizieren und zu lösen
3. Konsistente Muster im gesamten Codebase zu fördern
4. Ein "Gedächtnis" für frühere Lösungen und Problemstellungen bereitzustellen

Entwickler können diese Ressourcen auch als schnelle Referenz nutzen, besonders für neue Teammitglieder.

## Aktualisierung

Diese Ressourcen sollten regelmäßig aktualisiert werden, wenn:
- Neue Features implementiert werden
- Bedeutende Refactorings durchgeführt werden
- Häufige Fehler oder Probleme identifiziert werden
- Neue Muster oder Best Practices eingeführt werden

## Systemfunktionen

Folgende wichtige Systemfunktionen sind implementiert:

- **Benutzerauthentifizierung und Berechtigungssystem**
- **Arbeitszeiterfassung und -verwaltung**
- **Request- und Task-Management**
- **Notification-System**
- **Cerebro Wiki**
- **Team-Worktime-Control**
- **Lohnabrechnung**
- **Dokumentenerkennung**
- **Erweitertes Filtersystem**: Speicherbare und wiederverwendbare Filter für Tabellen:
  - **Requests-Tabelle**: Mit Standardfiltern "Aktuell" und "Archiv"
  - **Workcenter-Tabelle**: Mit Standardfiltern "Aktive" und "Alle"
  - **Rollen-Tabelle**: Mit Standardfilter "Alle"
  - Alle Standardfilter sind nicht löschbar
- **Einheitliches Suchfeld-Design**: Standardisierte Suchfelder in allen Komponenten:
  - Konsistente Größe (200px Breite) und einheitliches Erscheinungsbild
  - Dark-Mode-Unterstützung
  - Implementiert in Requests, Workcenter, To Do's, Rollen und Cerebro
  - Responsive Anpassung für mobile Geräte

## Memory Anchors

Im Code werden spezielle Kommentare als "Memory Anchors" verwendet, um auf spezifische Stellen zu verweisen. Diese folgen dem Format:
```
/* CLAUDE-ANCHOR: [UUID] - [BESCHREIBUNG] */
```

## Projekt-Dokumentation

Das Projekt verfügt über eine umfassende Dokumentation, die in verschiedene Kategorien unterteilt ist:

- **Übersichtsdokumente**: README.md, DOKUMENTATIONSSTANDARDS.md, CHANGELOG.md
- **Benutzerdokumentation**: BENUTZERHANDBUCH.md, ADMINISTRATORHANDBUCH.md
- **Entwicklungsdokumentation**: ENTWICKLUNGSUMGEBUNG.md, ARCHITEKTUR.md, CODING_STANDARDS.md, DESIGN_STANDARDS.md
- **Technische Dokumentation**: API_REFERENZ.md, DATENBANKSCHEMA.md, BERECHTIGUNGSSYSTEM.md, DEPLOYMENT.md
- **Moduldokumentation**: MODUL_ZEITERFASSUNG.md, MODUL_CEREBRO.md, MODUL_TEAMKONTROLLE.md, MODUL_ABRECHNUNG.md

Eine vollständige Übersicht aller Dokumentationsdateien mit Beschreibungen findet sich in `metadata/documentation.json`. 