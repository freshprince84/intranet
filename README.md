# Intranet

Eine TypeScript-basierte Webapplikation zur Verwaltung von Arbeitszeiten, Tasks und Unternehmensinformationen.

## Technologien
- Backend: Node.js (Express) mit TypeScript und Prisma ORM
- Frontend: React mit TypeScript
- Datenbank: PostgreSQL
- Styling: Tailwind CSS

## Dokumentation

Die Dokumentation ist in mehrere spezialisierte Dateien aufgeteilt:

### Einstieg und Übersicht
- [README.md](README.md) - Diese Übersicht
- [DOKUMENTATIONSSTANDARDS.md](docs/core/DOKUMENTATIONSSTANDARDS.md) - Standards für die Dokumentation
- [CHANGELOG.md](docs/core/CHANGELOG.md) - Änderungsverlauf des Projekts
- [VIBES.md](docs/core/VIBES.md) - Coding-Stil und Best Practices

### Nutzerorientierte Dokumentation
- [BENUTZERHANDBUCH.md](docs/user/BENUTZERHANDBUCH.md) - Anleitung für Endbenutzer
- [ADMINISTRATORHANDBUCH.md](docs/user/ADMINISTRATORHANDBUCH.md) - Anleitung für Administratoren

### Entwicklungsdokumentation
- [ENTWICKLUNGSUMGEBUNG.md](docs/core/ENTWICKLUNGSUMGEBUNG.md) - Setup der Entwicklungsumgebung
- [ARCHITEKTUR.md](docs/technical/ARCHITEKTUR.md) - Systemarchitektur und Technologie-Stack
- [CODING_STANDARDS.md](docs/core/CODING_STANDARDS.md) - Programmierrichtlinien und Best Practices
- [DESIGN_STANDARDS.md](docs/core/DESIGN_STANDARDS.md) - UI/UX-Designrichtlinien und Komponenten
- [FRONTEND_TECHNOLOGIEN.md](docs/technical/FRONTEND_TECHNOLOGIEN.md) - Frontend-Technologien und Best Practices

### Implementierungsanleitungen
- [CARD_VIEW_IMPLEMENTATION_GUIDE.md](docs/implementation_guides/CARD_VIEW_IMPLEMENTATION_GUIDE.md) - Vollständige Anleitung zur Implementierung der Card-Ansicht
- [MARKDOWN_PREVIEW_USAGE.md](docs/implementation_guides/MARKDOWN_PREVIEW_USAGE.md) - Korrekte Verwendung der MarkdownPreview Komponente

### Technische Spezifikationen
- [API_REFERENZ.md](docs/technical/API_REFERENZ.md) - Vollständige API-Dokumentation
- [DATENBANKSCHEMA.md](docs/technical/DATENBANKSCHEMA.md) - Datenbankschema und -struktur
- [BERECHTIGUNGSSYSTEM.md](docs/technical/BERECHTIGUNGSSYSTEM.md) - Rollen und Berechtigungskonzept
- [DEPLOYMENT.md](docs/technical/DEPLOYMENT.md) - Server-Setup und Deployment-Prozess
- [SERVER_UPDATE.md](docs/technical/SERVER_UPDATE.md) - Richtlinien für Server-Updates
- [FEHLERBEHEBUNG.md](docs/technical/FEHLERBEHEBUNG.md) - Häufige Fehler und deren Lösungen
- [ATTACHMENT_URL_FIX.md](docs/technical/ATTACHMENT_URL_FIX.md) - Attachment URL-Generierung und Fixes
- [IMAGE_PREVIEW_IMPLEMENTATION.md](docs/technical/IMAGE_PREVIEW_IMPLEMENTATION.md) - Vollständige Anleitung zur Bildvorschau-Implementierung
- [EXPANDABLE_DESCRIPTION_IMPLEMENTATION.md](docs/technical/EXPANDABLE_DESCRIPTION_IMPLEMENTATION.md) - Expandierbare Beschreibung in DataCard
- [NOTIFICATION_SYSTEM.md](docs/modules/NOTIFICATION_SYSTEM.md) - Benachrichtigungssystem und Trigger

### Modulspezifische Dokumentation
- [MODUL_ZEITERFASSUNG.md](docs/modules/MODUL_ZEITERFASSUNG.md) - Zeiterfassungssystem
- [MODUL_CEREBRO.md](docs/modules/MODUL_CEREBRO.md) - Cerebro Wiki-System
- [MODUL_TEAMKONTROLLE.md](docs/modules/MODUL_TEAMKONTROLLE.md) - Team-Worktime-Control
- [MODUL_ABRECHNUNG.md](docs/modules/MODUL_ABRECHNUNG.md) - Lohnabrechnungsintegration
- [MODUL_WORKTRACKER.md](docs/modules/MODUL_WORKTRACKER.md) - Task-Tracking und Arbeitszeit-Erfassung
- [MODUL_DOKUMENT_ERKENNUNG.md](docs/modules/MODUL_DOKUMENT_ERKENNUNG.md) - KI-basierte Dokumentenerkennungsfunktion
- [MODUL_FILTERSYSTEM.md](docs/modules/MODUL_FILTERSYSTEM.md) - Erweitertes Filtersystem mit benutzerdefinierten Filtern
- [ROLE_SWITCH.md](docs/modules/ROLE_SWITCH.md) - Funktionalität zum Wechseln der Benutzerrollen
- [WORKFLOW_AUTOMATISIERUNG.md](docs/modules/WORKFLOW_AUTOMATISIERUNG.md) - Workflow-Automatisierung für Task-Bearbeitung
- [MODUL_CONSULTATIONS.md](docs/modules/MODUL_CONSULTATIONS.md) - Beratungsstunden-Verwaltung mit Client-Tracking

### Implementierungspläne
- [CONSULTATION_MODULE_IMPLEMENTATION.md](docs/implementation_plans/CONSULTATION_MODULE_IMPLEMENTATION.md) - Schritt-für-Schritt Plan für Consultation-Modul
- [CONSULTATION_MODULE_IMPLEMENTATION_PART2.md](docs/implementation_plans/CONSULTATION_MODULE_IMPLEMENTATION_PART2.md) - Teil 2: Frontend-Implementierung
- [CONSULTATION_MODULE_IMPLEMENTATION_PART3.md](docs/implementation_plans/CONSULTATION_MODULE_IMPLEMENTATION_PART3.md) - Teil 3: Erweiterte Features
- [CONSULTATION_INVOICE_IMPLEMENTATION.md](docs/implementation_plans/CONSULTATION_INVOICE_IMPLEMENTATION.md) - Abrechnungsmodul für Beratungsstunden

## Claude-spezifische Dokumentation
- [claude/README.md](docs/claude/README.md) - Übersicht der speziell für Claude optimierten Ressourcen
- [claude_database_access.md](docs/claude/claude_database_access.md) - Direkter Datenbankzugriff und Frontend-Console-Monitoring für Claude


### Standard-Login (nach Seed)
- Benutzername: `admin`
- Passwort: `admin123`

## Wichtige Hinweise
- **Server-Neustart nur nach Absprache** - niemals selbständig Server oder Prisma Studio neustarten
- Prisma-Schema-Änderungen erfordern Migration
- Bei Änderungen an Servercode oder Schema muss der Benutzer um Neustart gebeten werden
- Erstellung eines Planungsdokuments: Keine Mutmassungen, keine Schätzungen, kein Konjunktiv!
Code jeweils genau untersuchen und in ein Planungsdokument immer nur das reinschreiben, was effektiv gemacht werden soll. Nicht Dinge wie "xy untersuchen". Falls die Anweisung nicht klar ist, beim user nachfragen!