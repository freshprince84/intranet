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
- [ ] Erstelle die Tabellen in `database/schema.sql` gemäß `DB_SCHEMA.md`.
- [ ] Füge Beispieldaten in `database/seed.sql` hinzu.
- [ ] Protokolliere die Erstellung in einem Kommentar in `database/schema.sql`.

## Weitere Schritte
- Siehe `BACKEND_SETUP.md`, `FRONTEND_SETUP.md` und `DB_SCHEMA.md` für detaillierte Anweisungen.
