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

## Systemarchitektur

### Komponenten-Übersicht

Die Anwendung besteht aus folgenden Hauptkomponenten:

1. **Frontend**: React-basierte Single-Page-Application
   - Responsive Design für Desktop und Mobile
   - Modulare Komponentenstruktur
   - TypeScript für robuste Typsicherheit

2. **Backend**: Node.js Express-Server
   - REST-API für Datenkommunikation
   - JWT-basierte Authentifizierung
   - Prisma ORM für Datenbankzugriff

3. **Datenbank**: PostgreSQL
   - Relationales Schema
   - Trigger für automatische Aktionen
   - Effiziente Indizierung für Leistungsoptimierung

### UI-Komponenten

Im System sind folgende UI-Komponenten implementiert:

#### Funktionale Boxen
1. **Dashboard/Arbeitszeitstatistik** - Zeigt Wochenstatistiken der Arbeitszeit als interaktives Diagramm
2. **Dashboard/Requests** - Anzeige und Verwaltung von Requests
3. **Worktracker/Zeiterfassung** - Start/Stop-Funktionalität für Zeiterfassung
4. **Worktracker/To Do's** - Verwaltung von Aufgaben und Status
5. **UserManagement** - Verwaltung von Benutzern und Berechtigungen
6. **Profile** - Benutzerprofilinformationen
7. **NotificationList** - Liste der Benachrichtigungen
8. **Workcenter** - Überwacht und verwaltet Arbeitszeiten im Team
9. **Lohnabrechnung** - Verwaltung und Berechnung von Lohnabrechnungen
10. **Settings** - Einstellungen für den Benutzer
11. **Login/Register** - Anmelde- und Registrierungsformulare

#### UI-Design
- **Styling-Grundsätze**:
  - Weißer Hintergrund mit abgerundeten Ecken
  - Schatten für Desktop-Ansicht (0 2px 4px rgba(0, 0, 0, 0.1))
  - Responsive Design mit angepasstem Mobile-Layout
  - Einheitliches Design für Scrollbars (10px, abgerundete Ecken)
  - Adaptives Dark Mode-Design

- **Box-Größen**:
  - Breit: Arbeitszeitstatistik, Requests, Zeiterfassung, To Do's, UserManagement, Workcenter, Lohnabrechnung
  - Normal: Settings, Profile
  - Klein: NotificationList

## Hauptfunktionen

### Kernsysteme
- **Benutzerauthentifizierung**: Login, Registrierung, Tokenverwaltung
- **Rollenbasiertes Berechtigungssystem**: Granulare Berechtigungskontrolle 
- **Arbeitszeiterfassung**: Start/Stop, Statistiken, Exports
- **Request-Management**: Statusverfolgung, automatische Task-Erstellung
- **Task-Management**: Workflow-System mit Qualitätskontrolle
- **Notification-System**: Echtzeit-Benachrichtigungen für Systemereignisse
- **Cerebro Wiki**: Internes Wissensmanagementsystem
- **Team-Worktime-Control**: Verwaltung von Teammitglieder-Arbeitszeiten
- **Lohnabrechnung**: Integration für Schweiz und Kolumbien

### Benutzereinstellungen
- Profilmanagement
- Benachrichtigungspräferenzen
- UI-Einstellungen (inkl. Dark Mode)
- Spracheinstellungen

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

### API-Konfiguration
- Die API-URL wird dynamisch basierend auf dem aktuellen Hostname generiert:
  ```javascript
  export const API_BASE_URL = process.env.NODE_ENV === 'development' 
    ? window.location.hostname === 'localhost'
      ? 'http://localhost:5000'  // Lokale Entwicklung auf localhost
      : `http://${window.location.hostname}:5000`  // Entwicklung über IP
    : 'http://localhost:5000';   // Produktionsumgebung
  ```
- Alle API-Aufrufe verwenden die zentrale Konfiguration aus `frontend/src/config/api.ts`

### Entwicklungsregeln
#### Import-Pfade Regeln
**Frontend-Imports (MIT .ts/.tsx Endung):**
```typescript
// RICHTIG für FRONTEND:
import Button from '../components/Button.tsx';
import { someFunction } from '../utils/helpers.ts';
import api from './apiClient.ts';

// FALSCH für FRONTEND:
import Button from '../components/Button';
import { someFunction } from '../utils/helpers';
import api from './apiClient';
```

**Backend-Imports (OHNE .ts Endung):**
```typescript
// RICHTIG für BACKEND:
import express from 'express';
import { someFunction } from '../utils/helpers';
import * as controller from '../controllers/myController';

// FALSCH für BACKEND:
import express from 'express';
import { someFunction } from '../utils/helpers.ts';
import * as controller from '../controllers/myController.ts';
```

#### TypeScript-Best-Practices
- Immer explizite Typen für Komponenten-Props definieren
- useState Hook mit Typparameter verwenden: `useState<string>('')`
- Für API-Aufrufe die typisierten Funktionen aus den API-Clients verwenden
- Nach Möglichkeit Interfaces statt Types verwenden für bessere Erweiterbarkeit

## Wichtige Hinweise
- **Server-Neustart nur nach Absprache** - niemals selbständig Server oder Prisma Studio neustarten
- Prisma-Schema-Änderungen erfordern Migration
- API-Konfiguration in `frontend/src/config/api.ts`
- Zeitzonenbehandlung ist kritisch für die Zeiterfassung (siehe [MODUL_ZEITERFASSUNG.md](MODUL_ZEITERFASSUNG.md))
- Bei Änderungen an Servercode oder Schema muss der Benutzer um Neustart gebeten werden
- In Dateipfaden immer Suffix (.ts oder .tsx) schreiben (siehe Import-Pfade Regeln)
- **STRIKTE REGEL FÜR KI-ASSISTENTEN**: Führe NUR explizit angeforderte Änderungen durch. Mache NIEMALS ungefragt mehr als verlangt. Bei Unklarheiten FRAGE NACH, anstatt Annahmen zu treffen.

### Notification-System
Das System verwendet die zentrale Funktion `createNotificationIfEnabled` für alle Benachrichtigungen, die Benutzer- und Systemeinstellungen berücksichtigt.

**Implementierte Trigger:**
- **Task**: Create, Update, Delete, StatusChange
- **Request**: Create, Update, Delete, StatusChange
- **User**: Create, Update, Delete
- **Role**: Create, Update, Delete
- **Worktime**: Start, Stop

### Header-Message-System
Das System bietet ein zentrales Message-System zur Anzeige von Feedback-Meldungen in der Kopfzeile der Anwendung. 

**Hauptfunktionen:**
- Einheitliche Darstellung von Erfolgs-, Fehler-, Warn- und Info-Meldungen
- Zeitgesteuerte Ausblendung nach 3 Sekunden
- Standardisiertes Design mit farbiger Kodierung
- Zentrale Verwaltung über den `MessageContext` und den `useMessage`-Hook

**Integration in Komponenten:**
- Verfügbar für alle Komponenten über den `useMessage`-Hook
- Implementiert in Settings, Profile und UserManagement
- Ersetzt lokale Meldungsverwaltung für konsistentes Benutzererlebnis

### Komponenten-Synchronisierung

**UserManagement-Benutzerbearbeitung und Profile-Seite:**
- Die Komponenten `UserManagementTab` (Benutzer-Tab) und `Profile` teilen Funktionalitäten zur Bearbeitung von Benutzerdaten
- Bei Änderungen an einer dieser Komponenten müssen diese synchronisiert werden
- Betroffene Felder:
  - Grunddaten (Benutzername, E-Mail, Vor-/Nachname)
  - Arbeitszeiteinstellungen (normalWorkingHours)
  - Regionaleinstellungen (country, language)
  - Persönliche Daten (birthday, bankDetails, contract, salary)

**WICHTIG: Bei Änderungen an einer der folgenden Dateien immer beide aktualisieren:**
- `frontend/src/components/UserManagementTab.tsx` (Benutzer-Tab)
- `frontend/src/pages/Profile.tsx` (Profilseite)

**Langfristige Lösung:** Für zukünftige Verbesserungen sollte eine gemeinsame Komponente für die Benutzerbearbeitung erstellt werden, die beide Ansichten nutzen können.

## Beitragen

1. Lies die [CODING_STANDARDS.md](CODING_STANDARDS.md) und [DESIGN_STANDARDS.md](DESIGN_STANDARDS.md)
2. Erstelle einen Feature-Branch (`git checkout -b feature/amazing-feature`)
3. Committe deine Änderungen (`git commit -m 'Add some amazing feature'`)
4. Pushe den Branch (`git push origin feature/amazing-feature`)
5. Öffne einen Pull Request

## Lizenz

Dieses Projekt ist urheberrechtlich geschützt. Alle Rechte vorbehalten.