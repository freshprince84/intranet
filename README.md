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
  - Zentrale Konfiguration von Backend-URLs in den Hook-Dateien
  - Axios-Instanz mit automatischer Token-Verwaltung
  - Konsistente Fehlerbehandlung
- Arbeitszeiterfassung
  - Start/Stop-Funktionalität
  - Niederlassungsauswahl
  - Tagesübersicht mit Zeiten
  - Wöchentliche Statistiken
  - Export-Funktion
  - Bearbeitungsmöglichkeit für Einträge
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
- Neue Benutzer erhalten automatisch die Rolle "hamburger" (ID: 999)
  - Zugriff auf: Dashboard (read) und Worktracker (read)
  - Standardrolle für alle Neuregistrierungen

## Setup
1. Folge den Anweisungen in `PROJECT_SETUP.md`
2. Erstelle eine `.env`-Datei im `backend/`-Ordner basierend auf `.env.example`
3. Installiere alle Abhängigkeiten mit `npm run install-all` im Root-Verzeichnis
4. Starte die Entwicklungsumgebung mit `npm run dev`
5. Für den Zugriff auf die Datenbank mit Prisma Studio: `npm run prisma:studio`

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