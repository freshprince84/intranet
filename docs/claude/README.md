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

### Queue-System
- **[QUEUE_SYSTEM_README.md](../technical/QUEUE_SYSTEM_README.md)** - Queue-System Dokumentations-Übersicht
- **[QUEUE_SYSTEM.md](../technical/QUEUE_SYSTEM.md)** - Queue-System Hauptdokumentation
- **[QUEUE_SYSTEM_DEPLOYMENT.md](../technical/QUEUE_SYSTEM_DEPLOYMENT.md)** - Deployment-Anleitung
- **[QUEUE_SYSTEM_HETZNER_SETUP.md](../technical/QUEUE_SYSTEM_HETZNER_SETUP.md)** - Hetzner Server Setup
- **[QUEUE_SYSTEM_IPV4_FIX.md](../technical/QUEUE_SYSTEM_IPV4_FIX.md)** - IPv4/IPv6-Verbindungsproblem und Fix (wichtig!)

### UI-Standards und Container-Strukturen
- **[container-structures.md](docs/container-structures.md)** - Konsistente Container-Strukturen für Seiten und Boxen - **MUSS bei neuen Seiten befolgt werden!**
- **[DESIGN_STANDARDS.md](../core/DESIGN_STANDARDS.md)** - **⚠️ KRITISCH: Button-Design-Regel - KEIN TEXT IN BUTTONS!** Siehe Abschnitt "Buttons und Aktionselemente"
- **[CODING_STANDARDS.md](../core/CODING_STANDARDS.md)** - **⚠️ KRITISCH: Button-Implementierung - KEIN TEXT IN BUTTONS!** Siehe Abschnitt "Button-Implementierung"

### Backend-Server-Struktur
- **⚠️ KRITISCH: Route-Registrierung und Server-Code**
  - **RICHTIG**: `backend/src/index.ts` - Diese Datei wird tatsächlich verwendet
  - **FALSCH**: `backend/src/app.ts` - Diese Datei existiert, wird aber NICHT geladen/verwendet
  - **Alle Routes, Middleware, Timer, etc. müssen in `index.ts` registriert/implementiert werden**
  - Siehe auch: [ARCHITEKTUR.md](../technical/ARCHITEKTUR.md) - Abschnitt "Backend"

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
- **LobbyPMS-Integration** - Property Management System Integration mit automatisierten Check-in-Prozessen
- **Abrechnungsmodul (in Planung)** - Swiss QR-Rechnungen für Beratungsstunden

## Implementierungspläne

Für die strukturierte Umsetzung neuer Module existieren detaillierte Schritt-für-Schritt Pläne:

- **Consultation-Modul** - Vollständig in 3 Teilen dokumentiert
  - [CONSULTATION_MODULE_IMPLEMENTATION.md](../implementation_plans/CONSULTATION_MODULE_IMPLEMENTATION.md) - Hauptplan
  - [CONSULTATION_MODULE_IMPLEMENTATION_PART2.md](../implementation_plans/CONSULTATION_MODULE_IMPLEMENTATION_PART2.md) - Frontend-Implementierung
  - [CONSULTATION_MODULE_IMPLEMENTATION_PART3.md](../implementation_plans/CONSULTATION_MODULE_IMPLEMENTATION_PART3.md) - Erweiterte Features
  - [CONSULTATION_INVOICE_IMPLEMENTATION.md](../implementation_plans/CONSULTATION_INVOICE_IMPLEMENTATION.md) - Abrechnungsmodul

- **LobbyPMS-Integration** - Vollständige Integration mit LobbyPMS, Bold Payment, TTLock, SIRE, WhatsApp
  - [LOBBYPMS_INTEGRATION.md](../implementation_plans/LOBBYPMS_INTEGRATION.md) - Haupt-Implementierungsplan
  - [LOBBYPMS_SETUP_ANLEITUNG.md](../implementation_plans/LOBBYPMS_SETUP_ANLEITUNG.md) - Setup- und Konfigurationsanleitung
  - [LOBBYPMS_USE_CASES_UND_PROZESSE.md](../implementation_plans/LOBBYPMS_USE_CASES_UND_PROZESSE.md) - Detaillierte Use Cases und Prozess-Flows
  - [LOBBYPMS_WO_IM_SYSTEM_SEHEN.md](../implementation_plans/LOBBYPMS_WO_IM_SYSTEM_SEHEN.md) - Wo im System Use Cases zu finden sind
  - [LOBBYPMS_MOCK_DATEN.md](../implementation_plans/LOBBYPMS_MOCK_DATEN.md) - Mock-Daten für Tests

- **Mitarbeiterlebenszyklus** - Vollständiger Lebenszyklus (Onboarding bis Offboarding) für Kolumbien
  - [MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md](../implementation_plans/MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md) - Haupt-Implementierungsplan
  - [MITARBEITERLEBENSZYKLUS_PROZESS.md](../implementation_plans/MITARBEITERLEBENSZYKLUS_PROZESS.md) - Detaillierte Prozessbeschreibung
  - [MITARBEITERLEBENSZYKLUS_ZUSAMMENFASSUNG.md](../implementation_plans/MITARBEITERLEBENSZYKLUS_ZUSAMMENFASSUNG.md) - Prozess-Zusammenfassung
  - [MITARBEITERLEBENSZYKLUS_DETAILLIERT.md](../implementation_plans/MITARBEITERLEBENSZYKLUS_DETAILLIERT.md) - Detaillierte Komponenten-Spezifikationen

- **Schichtplaner** - Automatische Schichtplanung mit Verfügbarkeiten und Präferenzen
  - [SCHICHTPLANER_ANALYSE_UND_PLAN.md](../implementation_plans/SCHICHTPLANER_ANALYSE_UND_PLAN.md) - Analyse, Recherche und Implementierungsplan

Details zu allen Plänen siehe `/docs/implementation_plans/` 