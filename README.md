# Intranet

Eine Webapplikation und App zur Verwaltung von Arbeitszeiten, To-Dos und Informationen.

## Technologien
- Backend: Node.js (Express) mit Prisma ORM
- Frontend: React mit TypeScript
- Datenbank: PostgreSQL
- Styling: Tailwind CSS

## Features
- Benutzerauthentifizierung (Login/Register)
- Responsives Dashboard
- Request-Management System
  - Übersichtliche Tabellendarstellung
  - Status-Tracking (approval → approved/denied, mit to_improve als Zwischenstatus)
  - Benutzerauswahl über Dropdown (Vorname + Benutzername)
  - Niederlassungsauswahl über Dropdown
  - Automatische Todo-Erstellung (optional)
- Task-Management System
  - Übersichtliche Tabellendarstellung
  - Status-Tracking (open → in_progress → quality_control → done)
  - Verantwortliche und Qualitätskontrolle
  - Niederlassungszuordnung
  - Filter- und Sortierfunktionen
  - Intuitive Status-Übergänge mit visuellen Indikatoren
  - Berechtigungsbasierte Aktionen

## Status-Workflows

### Request-Workflow
1. `approval`: Anfrage wartet auf Genehmigung
   - → `approved`: Anfrage wurde genehmigt
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

## Setup
1. Folge den Anweisungen in `PROJECT_SETUP.md`.
2. Erstelle eine `.env`-Datei im `backend/`-Ordner basierend auf `.env.example`.
3. Installiere alle Abhängigkeiten mit `npm run install-all` im Root-Verzeichnis.
4. Starte die Entwicklungsumgebung mit `npm run dev`.

## Struktur
- `backend/`: Node.js Backend
  - Express.js Server
  - Prisma ORM für Datenbankzugriff
  - JWT Authentication
  - RESTful API Endpoints
- `frontend/`: React Frontend
  - TypeScript
  - Tailwind CSS für Styling
  - Responsive Design
  - Modales Formular für Requests und Tasks
- `database/`: SQL-Skripte für PostgreSQL

## Entwicklungsstand
- [x] Projekt-Setup
- [x] Benutzerauthentifizierung
- [x] Dashboard-Layout
- [x] Request-Tabelle (Basis)
- [x] Request-Erstellung mit Benutzer-Dropdown
- [x] Niederlassungs-Dropdown
- [x] Filter und Sortierung für Requests
- [x] Request-Aktionen (Genehmigen, Ablehnen)
- [x] Todo-Integration bei Request-Genehmigung
- [x] Task-Management (Basis)
- [x] Task-Tabelle mit Filter und Sortierung
- [x] Task-Status-Workflow
- [ ] E-Mail-Benachrichtigungen
- [ ] Erweiterte Statistiken und Berichte

## Entwicklung
- Verwende `npm run dev` für die Entwicklungsumgebung
- Backend läuft auf Port 5000
- Frontend läuft auf Port 3000
- Prisma Studio verfügbar auf Port 5555

## Wichtige Hinweise
- Server-Neustart nur nach Absprache
- Prisma-Schema-Änderungen erfordern Migration
- Alle API-Endpunkte erfordern JWT-Authentication
