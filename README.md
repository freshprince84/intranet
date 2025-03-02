# Intranet

Eine TypeScript-basierte Webapplikation zur Verwaltung von Arbeitszeiten, To-Dos und Unternehmensinformationen.

## Technologien
- Backend: Node.js (Express) mit TypeScript und Prisma ORM
- Frontend: React mit TypeScript
- Datenbank: PostgreSQL
- Styling: Tailwind CSS

## Datenbank-Initialisierung
Bei jeder Neuinitialisierung der Datenbank werden automatisch folgende Einträge erstellt:

### Rollen
- Admin-Rolle (ID: 1)
  - Voller Zugriff auf alle Funktionen
- User-Rolle (ID: 2)
  - Eingeschränkter Zugriff
- Hamburger-Rolle (ID: 999)
  - Standardrolle für neue Benutzer
  - Zugriff auf Dashboard (read) und Worktracker (read)

### Niederlassungen
- "Hauptsitz", "Manila" und "Parque Poblado" als Standard-Niederlassungen

### Benutzer
- Admin-Benutzer
  - Benutzername: admin
  - E-Mail: admin@example.com
  - Passwort: admin123
  - Hat die Admin-Rolle zugewiesen
  - Ist mit allen Niederlassungen verknüpft

## Features
- Benutzerauthentifizierung
  - Login mit Benutzername (statt E-Mail)
  - Registrierung
  - Automatische Token-Verwaltung
  - Geschützte Routen
- Benutzerprofil
  - Bearbeitung persönlicher Daten
  - Anzeige von Bankdetails, Vertrag und Gehalt
  - Automatische Validierung von E-Mail und Benutzername
- Responsives Dashboard
  - Übersicht persönlicher Informationen
  - Requests-Verwaltung mit Statusanzeige
  - Schnellzugriff auf wichtige Funktionen
- Dark Mode Unterstützung
  - System-basierte automatische Erkennung
  - Manueller Toggle in den Einstellungen
  - Konsistentes Design für alle Komponenten
- API-Konfiguration
  - Zentrale Konfiguration von Backend-URLs in der Datei `src/config/api.ts`
  - Axios-Instanz mit automatischer Token-Verwaltung
  - Konsistente Fehlerbehandlung
  - Zugriff über IP-Adresse (192.168.1.1) oder localhost
- Rollenbasiertes Berechtigungssystem
  - Granulare Berechtigungskontrolle über Entitäten (Seiten, Tabellen)
  - Rollenauswahl mit automatischer Aktivierung der zuletzt verwendeten Rolle
  - Alphabetisch sortierte Rollenansicht im Benutzermenü
  - Persistentes Speichern der aktiven Rolle in der Datenbank
- Arbeitszeiterfassung
  - Start/Stop-Funktionalität
  - Niederlassungsauswahl
  - Tagesübersicht mit Zeiten
  - Wöchentliche Statistiken
  - Export-Funktion
  - Bearbeitungsmöglichkeit für Einträge
  - Chronologische Sortierung nach Startzeit (frühester Eintrag zuoberst)
- Notification-System
  - Echtzeit-Benachrichtigungen für wichtige Ereignisse
  - Verschiedene Benachrichtigungstypen (Aufgaben, Anfragen, Benutzer, Rollen, Arbeitszeit, System)
  - Anpassbare Benachrichtigungseinstellungen auf System- und Benutzerebene
  - Globale und persönliche Notification-Einstellungen
  - Lesebestätigung von Benachrichtigungen
  - Statusanzeige (gelesen/ungelesen)
  - Detaillierte Benachrichtigungsinformationen mit Zeitstempel
- Request-Management System
  - Übersichtliche Tabellendarstellung
  - Status-Tracking (approval → approved/denied, mit to_improve als Zwischenstatus)
  - Benutzerauswahl über Dropdown (Vorname + Benutzername)
  - Niederlassungsauswahl über Dropdown
  - Automatische Todo-Erstellung (optional, bei Statuswechsel auf approved)
  - Der Ersteller des Requests (requester) wird als Qualitätskontrolle im automatisch generierten Task festgelegt
  - Sortier- und Filterfunktionen
  - Statusänderungen mit visueller Bestätigung
- Task-Management System
  - Übersichtliche Tabellendarstellung
  - Status-Tracking (open → in_progress → quality_control → done)
  - Verantwortliche und Qualitätskontrolle
  - Niederlassungszuordnung
  - Filter- und Sortierfunktionen
  - Intuitive Status-Übergänge mit visuellen Indikatoren
  - Berechtigungsbasierte Aktionen

## API-Endpunkte

### Authentifizierung
- `POST /api/auth/register`: Registrierung
- `POST /api/auth/login`: Login
- `GET /api/auth/user`: Aktueller Benutzer
- `POST /api/auth/logout`: Logout

### Benutzerprofil
- `GET /api/users/profile`: Profildaten abrufen
- `PUT /api/users/profile`: Profil aktualisieren

### Requests
- `GET /api/requests`: Alle Requests abrufen
- `POST /api/requests`: Neuen Request erstellen
- `PUT /api/requests/:id`: Request aktualisieren
- `GET /api/requests/:id`: Request-Details abrufen
- `DELETE /api/requests/:id`: Request löschen

### Tasks
- `GET /api/tasks`: Alle Tasks abrufen
- `GET /api/tasks/:id`: Task-Details abrufen
- `POST /api/tasks`: Neuen Task erstellen
- `PUT /api/tasks/:id`: Task aktualisieren
- `DELETE /api/tasks/:id`: Task löschen

### Rollen
- `GET /api/roles`: Alle Rollen abrufen
- `GET /api/roles/:id`: Rollen-Details abrufen
- `POST /api/roles`: Neue Rolle erstellen
- `PUT /api/roles/:id`: Rolle aktualisieren
- `DELETE /api/roles/:id`: Rolle löschen
- `GET /api/roles/:id/permissions`: Berechtigungen einer Rolle abrufen

### Berechtigungen
- `GET /api/permissions`: Alle Berechtigungen abrufen
- `GET /api/permissions/:entity/:entityType`: Berechtigungen für eine bestimmte Entität abrufen
- `POST /api/permissions`: Neue Berechtigung erstellen
- `PUT /api/permissions/:id`: Berechtigung aktualisieren
- `DELETE /api/permissions/:id`: Berechtigung löschen

### Niederlassungen
- `GET /api/branches`: Alle Niederlassungen abrufen

### Arbeitszeiterfassung
- `POST /api/worktime/start`: Startet die Zeiterfassung
  - Body: `{ branchId: number, startTime: Date }`
- `POST /api/worktime/stop`: Beendet die Zeiterfassung
  - Body: `{ endTime: Date }`
- `GET /api/worktime`: Liste aller Zeiteinträge
  - Query: `date` (optional, filtert nach Datum)
- `PUT /api/worktime/:id`: Aktualisiert einen Zeiteintrag
  - Body: `{ startTime?: Date, endTime?: Date, branchId?: number }`
- `DELETE /api/worktime/:id`: Löscht einen Zeiteintrag
- `GET /api/worktime/stats`: Statistiken abrufen
  - Query: `week` (Datum innerhalb der gewünschten Woche)
- `GET /api/worktime/export`: Exportiert Zeiteinträge als Excel
  - Query: `week` (Datum innerhalb der gewünschten Woche)
- `GET /api/worktime/active`: Prüft, ob aktuell eine Zeiterfassung läuft

### Notification-System
- `GET /api/notifications`: Alle Benachrichtigungen abrufen
- `GET /api/notifications/:id`: Benachrichtigung-Details abrufen
- `POST /api/notifications`: Neue Benachrichtigung erstellen
- `PUT /api/notifications/:id`: Benachrichtigung aktualisieren
- `DELETE /api/notifications/:id`: Benachrichtigung löschen

## Status-Workflows

### Request-Workflow
1. `approval`: Anfrage wartet auf Genehmigung
   - → `approved`: Anfrage wurde genehmigt (erzeugt automatisch Task, wenn "Todo erstellen" aktiviert ist)
   - → `to_improve`: Anfrage muss überarbeitet werden
   - → `denied`: Anfrage wurde abgelehnt
2. Von `to_improve` kann zurück zu `approval` gewechselt werden

### Task-Workflow
1. `open`: Neue Aufgabe
   - → `in_progress` (durch Verantwortlichen)
2. `in_progress`: Aufgabe in Bearbeitung
   - → `open` (zurück durch Verantwortlichen)
   - → `quality_control` (weiter durch Verantwortlichen)
3. `quality_control`: Aufgabe in Prüfung
   - → `in_progress` (zurück durch QK)
   - → `done` (weiter durch QK)
4. `done`: Aufgabe abgeschlossen
   - → `quality_control` (zurück durch QK)

## Berechtigungen
- Verantwortlicher kann Tasks zwischen `open` und `quality_control` bewegen
- Qualitätskontrolle kann Tasks zwischen `quality_control` und `done` bewegen
- Status-Änderungen werden durch farbige Pfeile visualisiert:
  - Rot: Zurück zum vorherigen Status
  - Blau: Start der Bearbeitung
  - Lila: Weiter zur Qualitätskontrolle
  - Grün: Als erledigt markieren
- Neue Benutzer erhalten automatisch die Rolle "Hamburger" (ID: 999)
  - Zugriff auf: Dashboard (read) und Worktracker (read)
  - Standardrolle für alle Neuregistrierungen

## Setup
1. Folge den Anweisungen in `PROJECT_SETUP.md`
2. Erstelle eine `.env`-Datei im `backend/`-Ordner basierend auf `.env.example`
3. Installiere alle Abhängigkeiten mit `npm run install-all` im Root-Verzeichnis
4. Starte die Entwicklungsumgebung mit `npm run dev`
5. Für den Zugriff auf die Datenbank mit Prisma Studio: `npm run prisma:studio`

### Automatische Installation (Linux/Ubuntu)
Für eine automatische Installation auf einem Linux-Server (Ubuntu) kann das `install.sh`-Skript verwendet werden:

1. Lade das Skript herunter: `wget https://raw.githubusercontent.com/freshprince84/intranet/main/install.sh`
2. Mache es ausführbar: `chmod +x install.sh`
3. Führe es aus: `./install.sh`

Das Skript führt folgende Schritte automatisch durch:
- Aktualisierung des Systems und Installation von Grundpaketen
- Installation von Node.js v18 und npm
- Installation und Konfiguration von PostgreSQL
- Einrichtung des SSH-Zugangs für GitHub (optional)
- Klonen des Repositories (via SSH oder HTTPS)
- Installation aller Abhängigkeiten
- Konfiguration der Umgebungsvariablen
- Initialisierung der Datenbank mit Prisma
- Installation von PM2 und Start der Anwendung

**Hinweis:** Das Skript ist für eine frische Ubuntu-Installation konzipiert. Bei bestehenden Systemen können Anpassungen notwendig sein.

## Struktur
- `backend/`: Node.js Backend
  - Express.js Server mit TypeScript
  - Prisma ORM für Datenbankzugriff
  - JWT Authentication
  - RESTful API Endpoints
  - TypeScript-Interfaces und -Typen
- `frontend/`: React Frontend
  - TypeScript
  - Tailwind CSS für Styling
  - Responsive Design
  - Modales Formular für Requests und Tasks

## Entwicklung
- Verwende `npm run dev` für die Entwicklungsumgebung
- Backend läuft auf Port 5000
- Frontend läuft auf Port 3000
- Prisma Studio verfügbar auf Port 5555

## Wichtige Hinweise
- Server-Neustart nur nach Absprache
- Prisma-Schema-Änderungen erfordern Migration
- Nach einer Schemaänderung muss `npx prisma generate` ausgeführt werden
- Alle API-Endpunkte erfordern JWT-Authentication
- Login erfolgt mit Benutzername (nicht E-Mail)
- Profiländerungen werden sofort gespeichert
- Request-Status-Änderungen erzeugen automatisch Benachrichtigungen

## Fehlerbehebungen
- **Request-Bearbeitung**: EditRequestModal behandelt null-Werte für das Fälligkeitsdatum korrekt
- **Task-Erstellung bei Request-Genehmigung**: RequestController setzt den Ersteller des Requests (requester) als Qualitätskontrolle im automatisch generierten Task
- **API-Routen**: Korrektur der Routen-Konfiguration für `/api/worktime` zur Vermeidung von 404-Fehlern
- **Frontend-API-Pfade**: Korrektur der API-Pfade in WorktimeStats.tsx von `/api/worktimes/stats` und `/api/worktimes/export` zu `/api/worktime/stats` und `/api/worktime/export` (Singular statt Plural)
- **TypeScript-Migration**: Alle Controller, Routen, Middleware und Validierungen wurden von JavaScript zu TypeScript migriert
- **Zeiterfassung über Mitternacht**: Korrektur der Berechnung von Arbeitszeiten, die über Mitternacht gehen, um negative Zeitwerte zu vermeiden
- **Arbeitszeitstatistik**: Verbesserung der Berechnung und Anzeige von Arbeitszeiten in der wöchentlichen Statistik
- **Zeiterfassungs-Modal**: Anzeige der Gesamtarbeitszeit des Tages und Integration der aktiven Zeiterfassung in die Tagesansicht
- **Sortierung der Zeiteinträge**: Arbeitszeit-Einträge werden chronologisch nach ihrer Startzeit sortiert angezeigt, mit dem frühesten Eintrag des Tages zuoberst und der aktiven Zeiterfassung gesondert in einer grünen Zeile

## Systemanforderungen

### Mindestanforderungen Server
- **Betriebssystem**: Linux (Ubuntu 20.04 LTS oder höher), Windows Server 2019 oder höher
- **CPU**: 2 Kerne, 2.0 GHz oder höher
- **RAM**: 4 GB
- **Festplatte**: 20 GB SSD
- **Netzwerk**: 100 Mbit/s

### Empfohlene Konfiguration Server
- **Betriebssystem**: Linux (Ubuntu 22.04 LTS)
- **CPU**: 4 Kerne, 2.5 GHz oder höher
- **RAM**: 8 GB
- **Festplatte**: 40 GB SSD
- **Netzwerk**: 1 Gbit/s

### Software-Voraussetzungen
- **Node.js**: Version 16.x oder höher
- **PostgreSQL**: Version 13 oder höher
- **npm**: Version 7 oder höher
- **Git**: Für Deployment und Updates

### Client-Anforderungen
- **Browser**: Chrome 90+, Firefox 90+, Edge 90+, Safari 14+
- **Bildschirmauflösung**: Mindestens 1280x720
- **Internetverbindung**: Mindestens 10 Mbit/s

### Skalierbarkeit
Die Anwendung ist für kleine bis mittelgroße Teams (5-50 Benutzer) optimiert. Bei größeren Teams sollten folgende Anpassungen vorgenommen werden:
- Erhöhung der Serverressourcen (insbesondere RAM)
- Implementierung von Caching-Mechanismen
- Optimierung der Datenbankabfragen
- Eventuell Aufteilung in Microservices bei sehr großen Teams (100+ Benutzer)

## Zeiterfassung - Verbesserungen

### Berechnung von Arbeitszeiten über Mitternacht
- **Problem**: Die ursprüngliche Implementierung berechnete Arbeitszeiten nur korrekt innerhalb eines Tages
- **Lösung**: Überarbeitung der Zeitberechnung in `worktimeController.ts`, um Zeitspannen über Mitternacht korrekt zu erfassen
- **Details**:
  - Verwendung von Millisekunden-Differenz statt direkter Stundenberechnung
  - Prüfung auf negative Zeitwerte und entsprechende Fehlerbehandlung
  - Korrekte Filterung von Zeiteinträgen, die über Mitternacht gehen

### Arbeitszeitstatistik
- **Verbesserungen**:
  - Korrekte Berechnung der wöchentlichen Arbeitszeiten auch bei Einträgen über Mitternacht
  - Anzeige aller Wochentage in der Statistik, auch wenn keine Arbeitszeit erfasst wurde
  - Formatierung der Stundenwerte auf eine Dezimalstelle für bessere Lesbarkeit
  - Optimierung des Exportieren-Buttons (nur Icon statt Text)

### Zeiterfassungs-Modal
- **Neue Funktionen**:
  - Anzeige der Gesamtarbeitszeit des ausgewählten Tages
  - Integration der aktiven Zeiterfassung in die Tagesansicht (grün hervorgehoben)
  - Berechnung der Gesamtzeit inklusive der aktuell laufenden Zeiterfassung
  - Verbesserte Fehlerbehandlung bei negativen Zeitwerten

### Allgemeine Verbesserungen
- Konsistente Formatierung von Datum und Uhrzeit in allen Komponenten
- Verbesserte Filterung von Zeiteinträgen nach Datum im Backend
- Optimierte Benutzeroberfläche mit klaren visuellen Indikatoren für aktive Zeiterfassungen

## Performance-Optimierung

### Debug-Ausgaben

In Produktionsumgebungen sollten Debug-Ausgaben auf ein Minimum reduziert werden, um die Leistung zu verbessern und die Logdateien übersichtlich zu halten. Wir haben folgende Optimierungen vorgenommen:

1. **Entfernen von Debug-Logs**: Unnötige `console.log`-Aufrufe wurden aus Middleware-Funktionen und Controllern entfernt.
2. **Beibehaltung wichtiger Fehlerprotokolle**: Fehler und Ausnahmen werden weiterhin protokolliert, um Fehlerbehebung zu ermöglichen.

### TypeScript-Import-Optimierungen

Beim Arbeiten mit TypeScript sollten Sie folgende Best Practices beachten:

1. **Keine `.ts`-Suffixe in Imports**: Verwenden Sie `import { module } from './path'` statt `import { module } from './path.ts'`
2. **Korrekte Exporte**: Stellen Sie sicher, dass Module sowohl mit den neuen als auch mit den alten Namen exportiert werden, wenn Abwärtskompatibilität erforderlich ist
3. **TypeScript-Kompilierung**: Stellen Sie sicher, dass die TypeScript-Konfiguration korrekt ist und keine Legacy-Optionen die Kompilierung beeinträchtigen

### Rollenwechsel-Optimierung

Die Funktion zum Wechseln der Benutzerrolle wurde optimiert:

1. **Effiziente ID-Extraktion**: Verbesserte Extraktion von Benutzer-IDs aus Auth-Tokens
2. **Transaktionale Aktualisierungen**: Die Verwendung von Prisma-Transaktionen stellt sicher, dass Rollenwechsel atomar sind
3. **Minimale Datenbankabfragen**: Die Anzahl der Datenbankabfragen wurde reduziert, um die Leistung zu verbessern