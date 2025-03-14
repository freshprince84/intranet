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
- [DOKUMENTATIONSSTANDARDS.md](DOKUMENTATIONSSTANDARDS.md) - Standards für die Dokumentation
- [CHANGELOG.md](CHANGELOG.md) - Änderungsverlauf des Projekts

### Nutzerorientierte Dokumentation
- [BENUTZERHANDBUCH.md](BENUTZERHANDBUCH.md) - Anleitung für Endbenutzer
- [ADMINISTRATORHANDBUCH.md](ADMINISTRATORHANDBUCH.md) - Anleitung für Administratoren

### Entwicklungsdokumentation
- [ENTWICKLUNGSUMGEBUNG.md](ENTWICKLUNGSUMGEBUNG.md) - Setup der Entwicklungsumgebung
- [ARCHITEKTUR.md](ARCHITEKTUR.md) - Systemarchitektur und Technologie-Stack
- [CODING_STANDARDS.md](CODING_STANDARDS.md) - Programmierrichtlinien und Best Practices
- [DESIGN_STANDARDS.md](DESIGN_STANDARDS.md) - UI/UX-Designrichtlinien und Komponenten

### Technische Spezifikationen
- [API_REFERENZ.md](API_REFERENZ.md) - Vollständige API-Dokumentation
- [DATENBANKSCHEMA.md](DATENBANKSCHEMA.md) - Datenbankschema und -struktur
- [BERECHTIGUNGSSYSTEM.md](BERECHTIGUNGSSYSTEM.md) - Rollen und Berechtigungskonzept
- [DEPLOYMENT.md](DEPLOYMENT.md) - Server-Setup und Deployment-Prozess

### Modulspezifische Dokumentation
- [MODUL_ZEITERFASSUNG.md](MODUL_ZEITERFASSUNG.md) - Zeiterfassungssystem
- [MODUL_CEREBRO.md](MODUL_CEREBRO.md) - Cerebro Wiki-System
- [MODUL_TEAMKONTROLLE.md](MODUL_TEAMKONTROLLE.md) - Team-Worktime-Control
- [MODUL_ABRECHNUNG.md](MODUL_ABRECHNUNG.md) - Lohnabrechnungsintegration

## Hauptfunktionen

- **Benutzerauthentifizierung**: Login, Registrierung, Tokenverwaltung
- **Rollenbasiertes Berechtigungssystem**: Granulare Berechtigungskontrolle 
- **Arbeitszeiterfassung**: Start/Stop, Statistiken, Exports
- **Request-Management**: Statusverfolgung, automatische Task-Erstellung
- **Task-Management**: Workflow-System mit Qualitätskontrolle
- **Notification-System**: Echtzeit-Benachrichtigungen für Systemereignisse
- **Dark Mode**: System- oder benutzerdefiniert
- **Cerebro Wiki**: Internes Wissensmanagementsystem
- **Team-Worktime-Control**: Verwaltung von Teammitglieder-Arbeitszeiten
- **Lohnabrechnung**: Integration für Schweiz und Kolumbien

## Schnellstart

1. Klone das Repository:
   ```bash
   git clone https://github.com/freshprince84/intranet.git
   cd intranet
   ```

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
- Zeitzonenbehandlung ist kritisch für die Zeiterfassung (siehe [MODUL_ZEITERFASSUNG.md](MODUL_ZEITERFASSUNG.md))

## Beitragen

1. Lies die [CODING_STANDARDS.md](CODING_STANDARDS.md) und [DESIGN_STANDARDS.md](DESIGN_STANDARDS.md)
2. Erstelle einen Feature-Branch (`git checkout -b feature/amazing-feature`)
3. Committe deine Änderungen (`git commit -m 'Add some amazing feature'`)
4. Pushe den Branch (`git push origin feature/amazing-feature`)
5. Öffne einen Pull Request

## Lizenz

Dieses Projekt ist urheberrechtlich geschützt. Alle Rechte vorbehalten.