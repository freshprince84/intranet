# Worktracker Projekt-Setup

Dieses Dokument enthält die Schritt-für-Schritt-Anweisungen zur Erstellung des Worktracker-Projekts. Bitte befolge die Reihenfolge der Schritte genau und markiere abgeschlossene Schritte mit `[x]`. Protokolliere jede Änderung in den entsprechenden Dateien.

## Schritt 1: Verzeichnisstruktur erstellen
- [ ] Erstelle die Verzeichnisstruktur gemäß der Projektübersicht (siehe README.md).
- [ ] Protokolliere die Erstellung mit einem Kommentar in dieser Datei.

## Schritt 2: Backend initialisieren
- [ ] Navigiere in `backend/` und führe `npm init -y` aus.
- [ ] Installiere Abhängigkeiten: `npm install express sequelize pg pg-hstore jsonwebtoken bcrypt dotenv`.
- [ ] Kopiere `.env.example` nach `.env` und fülle die Umgebungsvariablen aus.
- [ ] Protokolliere Änderungen in `backend/package.json`.

## Schritt 3: Frontend initialisieren
- [ ] Navigiere in `frontend/` und führe `npx create-react-app .` aus.
- [ ] Installiere zusätzliche Abhängigkeiten: `npm install react-router-dom axios tailwindcss`.
- [ ] Initialisiere Tailwind CSS gemäß der offiziellen Dokumentation.
- [ ] Protokolliere Änderungen in `frontend/package.json`.

## Schritt 4: Datenbank einrichten
- [ ] Implementiere das Schema in `database/schema.sql` gemäß den Beschreibungen in `DB_SCHEMA.md`.
- [ ] Füge Beispieldaten in `database/seed.sql` hinzu.
- [ ] Protokolliere die Erstellung in einem Kommentar in `database/schema.sql`.

## Schritt 5: Dashboard-Seite mit Requests integrieren
- [ ] Aktualisiere `FRONTEND_SETUP.md` mit einer `Dashboard.js`-Seite, die eine Tabelle für Requests enthält.
- [ ] Füge Backend-Routen für Requests hinzu (siehe `BACKEND_SETUP.md`).
- [ ] Aktualisiere `database/schema.sql` mit der `requests`-Tabelle (siehe `DB_SCHEMA.md`).

## Weitere Schritte
- Siehe `BACKEND_SETUP.md`, `FRONTEND_SETUP.md` und `DB_SCHEMA.md` für detaillierte Anweisungen.
