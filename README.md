# Intranet

Eine TypeScript-basierte Webapplikation zur Verwaltung von Arbeitszeiten, Tasks und Unternehmensinformationen.

## Technologien
- Backend: Node.js (Express) mit TypeScript und Prisma ORM
- Frontend: React mit TypeScript
- Datenbank: PostgreSQL
- Styling: Tailwind CSS

## Dokumentation

Die Dokumentation ist in mehrere spezialisierte Dateien aufgeteilt:

### Einrichtung & Installation
- [PROJECT_SETUP.md](PROJECT_SETUP.md) - Vollständige Einrichtung des Projekts
- [BACKEND_SETUP.md](BACKEND_SETUP.md) - Details zur Backend-Konfiguration
- [FRONTEND_SETUP.md](FRONTEND_SETUP.md) - Details zur Frontend-Konfiguration

### Datenbank & API
- [DB_SCHEMA.md](DB_SCHEMA.md) - Vollständiges Datenbankschema und Strukturen
- [API_INTEGRATION.md](API_INTEGRATION.md) - API-Endpunkte und Integration

### Funktionen & Module
- [ROLE_SWITCH.md](ROLE_SWITCH.md) - Rollenbasierte Zugriffskontrolle
- [CEREBRO_WIKI.md](CEREBRO_WIKI.md) - Cerebro Wiki-Modul
- [PAYROLL_INTEGRATION_CH_CO.md](PAYROLL_INTEGRATION_CH_CO.md) - Gehaltsabrechnungs-Integration für CH/CO

### Änderungen & Updates
- [CHANGELOG.md](CHANGELOG.md) - Änderungsverlauf des Projekts

## Hauptfunktionen

- **Benutzerauthentifizierung**: Login, Registrierung, Tokenverwaltung
- **Rollenbasiertes Berechtigungssystem**: Granulare Berechtigungskontrolle 
- **Arbeitszeiterfassung**: Start/Stop, Statistiken, Exports
- **Request-Management**: Statusverfolgung, automatische Task-Erstellung
- **Task-Management**: Workflow-System mit Qualitätskontrolle
- **Notification-System**: Echtzeit-Benachrichtigungen für Systemereignisse
- **Dark Mode**: System- oder benutzerdefiniert

## Schnellstart

1. Folge den Anweisungen in [PROJECT_SETUP.md](PROJECT_SETUP.md)
2. Erstelle eine `.env`-Datei im `backend/`-Ordner (siehe `.env.example`)
3. Installiere alle Abhängigkeiten:
   ```bash
   npm run install-all
   ```
4. Starte die Entwicklungsumgebung:
   ```bash
   npm run dev
   ```

### Standard-Login (nach Seed)
- Benutzername: `admin`
- Passwort: `admin123`

## Entwicklung
- Backend läuft auf Port 5000
- Frontend läuft auf Port 3000
- Prisma Studio verfügbar auf Port 5555

## Wichtige Hinweise
- Server-Neustart nur nach Absprache
- Prisma-Schema-Änderungen erfordern Migration
- API-Konfiguration in `frontend/src/config/api.ts`