# ARCHITEKTUR

Dieses Dokument beschreibt die Systemarchitektur und den Technologie-Stack des Intranet-Projekts.

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Architekturprinzipien](#architekturprinzipien)
3. [Technologie-Stack](#technologie-stack)
4. [Systemkomponenten](#systemkomponenten)
5. [Datenfluss](#datenfluss)
6. [Authentifizierung und Autorisierung](#authentifizierung-und-autorisierung)
7. [API-Design](#api-design)
8. [Datenmodell](#datenmodell)
9. [Frontend-Architektur](#frontend-architektur)
10. [Fehlerbehandlung](#fehlerbehandlung)
11. [Skalierung](#skalierung)

## Überblick

Das Intranet-Projekt ist eine modern aufgebaute Webapplikation, die eine React-basierte Frontend-Anwendung mit einem Node.js-Backend und einer PostgreSQL-Datenbank verbindet. Die Anwendung folgt einer klassischen dreischichtigen Architektur:

1. **Präsentationsschicht**: React-basiertes Frontend
2. **Anwendungsschicht**: Node.js/Express.js-Backend mit Business-Logik
3. **Datenschicht**: PostgreSQL-Datenbank mit Prisma ORM

Die Implementierung basiert auf TypeScript für eine stärkere Typisierung und verbesserte Code-Qualität.

## Architekturprinzipien

Das System folgt diesen Architekturprinzipien:

1. **Separation of Concerns**: Klar getrennte Zuständigkeiten zwischen Frontend, Backend und Datenbank
2. **Komponentenbasierte Entwicklung**: Modulare UI-Komponenten für Wiederverwendbarkeit und einfachere Wartung
3. **RESTful API-Design**: Klare, ressourcenorientierte API-Struktur
4. **Rollenbasierte Zugriffssteuerung**: Granulare Berechtigungen für verschiedene Benutzerrollen
5. **Single Source of Truth**: Zentrale Datenverwaltung, insbesondere für wichtige Geschäftsdaten wie Arbeitszeiten
6. **Mobile-First-Ansatz**: Responsive Design für optimale Nutzung auf verschiedenen Geräten

## Technologie-Stack

### Frontend

- **Framework**: React mit TypeScript
- **State Management**: React Context API
- **Routing**: React Router
- **Styling**: Tailwind CSS
- **UI-Komponenten**: Headless UI und eigene Komponenten
- **Formulare**: React Hook Form
- **API-Client**: Axios
- **Build-Tool**: Create React App

### Backend

- **Laufzeitumgebung**: Node.js
- **Web-Framework**: Express.js mit TypeScript
- **ORM**: Prisma
- **Authentifizierung**: JWT (JSON Web Tokens)
- **Validierung**: Joi / express-validator
- **Logger**: Winston
- **Fehlerbehandlung**: Eigene Middleware mit strukturierter Fehlerrückgabe

### Datenbank

- **DBMS**: PostgreSQL
- **Zugriff**: Prisma ORM
- **Migrations**: Prisma Migrate
- **Datenmodellierung**: Prisma Schema

### DevOps

- **Versionskontrolle**: Git
- **CI/CD**: (abhängig von der Deployment-Umgebung)
- **Linting**: ESLint
- **Formatierung**: Prettier

## Systemkomponenten

Das System besteht aus folgenden Hauptkomponenten:

### 1. Frontend-Module

- **Authentication**: Login, Registrierung, Passwortverwaltung
- **Dashboard**: Überblicksdaten und Zusammenfassungen
- **Worktracker**: Zeiterfassung und -verwaltung
- **Task-Management**: Aufgabenverwaltung und Workflow
- **Request-Management**: Anfrageverwaltung
- **User-Management**: Benutzerverwaltung für Administratoren
- **Profile**: Benutzerprofilverwaltung
- **Notifications**: Systembenachrichtigungen
- **Workcenter**: Team-Zeiterfassungsüberwachung
- **Lohnabrechnung**: Abrechnungsfunktionen
- **Cerebro Wiki**: Wissensmanagementsystem

### 2. Backend-Services

- **Auth-Service**: Authentifizierung und Tokenmanagement
- **User-Service**: Benutzerverwaltung und -profilierung
- **Worktime-Service**: Zeiterfassungsfunktionen
- **Task-Service**: Aufgabenverwaltung
- **Request-Service**: Anfrageverwaltung
- **Notification-Service**: Benachrichtigungssystem
- **Cerebro-Service**: Wiki-Funktionalität
- **Payroll-Service**: Lohnabrechnungsfunktionen

### 3. Datenbank

Die PostgreSQL-Datenbank enthält Tabellen für alle Kernentitäten und wird über Prisma ORM verwaltet.

## Datenfluss

Der Datenfluss im System folgt diesem Muster:

1. **Benutzeraktion im Frontend**: Benutzer interagiert mit der Benutzeroberfläche
2. **API-Anfrage**: Frontend sendet HTTP-Anfrage an Backend
3. **Authentifizierung & Autorisierung**: Backend validiert Token und Berechtigungen
4. **Datenvalidierung**: Backend validiert Eingabedaten
5. **Geschäftslogik**: Backend verarbeitet die Anfrage
6. **Datenbankzugriff**: Backend greift über Prisma auf die Datenbank zu
7. **Antwort**: Backend sendet Antwort an Frontend
8. **Zustandsaktualisierung**: Frontend aktualisiert seinen Zustand
9. **UI-Aktualisierung**: Benutzeroberfläche wird aktualisiert

## Authentifizierung und Autorisierung

### Authentifizierung

Das System verwendet JWT (JSON Web Tokens) für die Authentifizierung:

1. Benutzer meldet sich mit Benutzername und Passwort an
2. Backend validiert die Anmeldedaten und generiert ein JWT
3. Token wird an den Client gesendet und im LocalStorage gespeichert
4. Alle API-Anfragen enthalten das Token im Authorization-Header
5. Backend validiert das Token bei jeder Anfrage

### Autorisierung

Das System implementiert ein granulares rollenbasiertes Berechtigungssystem:

- **EntityType**: Art des Objekts (z.B. 'page', 'table')
- **EntityName**: Spezifischer Objektname (z.B. 'team_worktime')
- **AccessLevel**: Zugriffsebene ('read', 'write', 'both')

Jede Rolle hat spezifische Berechtigungszuweisungen, die bestimmen, welche Aktionen ein Benutzer ausführen kann.

## API-Design

Das Backend implementiert eine RESTful API mit folgendem Design:

### API-Endpoint-Struktur

- `/api/auth`: Authentifizierungsendpoints
- `/api/users`: Benutzerverwaltung
- `/api/worktime`: Zeiterfassungsfunktionen
- `/api/tasks`: Aufgabenverwaltung
- `/api/requests`: Anfrageverwaltung
- `/api/notifications`: Benachrichtigungssystem
- `/api/cerebro`: Wiki-API
- `/api/payroll`: Lohnabrechnungsfunktionen

### Anfrage- und Antwortformate

Alle API-Endpunkte verwenden JSON für Anfragen und Antworten:

```json
// Beispiel Anfrage
POST /api/worktime/start
{
  "branchId": 1,
  "comment": "Projektarbeit"
}

// Beispiel Antwort
{
  "success": true,
  "data": {
    "id": 123,
    "userId": 456,
    "branchId": 1,
    "startTime": "2023-05-15T08:30:00.000",
    "endTime": null,
    "comment": "Projektarbeit"
  }
}
```

### Fehlerbehandlung

Alle API-Endpunkte verwenden standardisierte Fehlerantworten:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "branchId": "Branch ID is required"
    }
  }
}
```

## Datenmodell

Das Datenmodell wird mit Prisma ORM definiert und umfasst folgende Hauptentitäten:

- **User**: Benutzerinformationen
- **Role**: Rollen und Berechtigungen
- **Permission**: Berechtigungsdefinitionen
- **Branch**: Niederlassungen
- **WorkTime**: Zeiterfassungsdaten
- **Task**: Aufgaben
- **Request**: Anfragen
- **Notification**: Benachrichtigungen
- **CerebroArticle**: Wiki-Artikel
- **PayrollRecord**: Lohnabrechnungsdaten

Weitere Details zum Datenmodell finden sich in [DB_SCHEMA.md](DB_SCHEMA.md).

## Frontend-Architektur

Das Frontend folgt einer komponentenbasierten Architektur:

### Komponentenhierarchie

- **App**: Hauptkomponente mit Routing und Layout
- **Layouts**: Wiederverwendbare Layoutstrukturen
- **Pages**: Seitenkomponenten für verschiedene Routen
- **Containers**: Stateful-Komponenten mit Geschäftslogik
- **Components**: Wiederverwendbare UI-Komponenten
- **UI/Common**: Basiskomponenten wie Buttons, Inputs, etc.

### State Management

Das Frontend verwendet primär React Context API für die Zustandsverwaltung:

- **AuthContext**: Authentifizierungszustand und Benutzerdaten
- **WorktimeContext**: Zeiterfassungsdaten und -funktionen
- **TaskContext**: Aufgabenverwaltungsdaten
- **NotificationContext**: Benachrichtigungszustand
- **ThemeContext**: UI-Themeneinstellungen (Dark Mode)

### Styling-Konzept

Die Anwendung verwendet Tailwind CSS mit einem strukturierten Ansatz:

- Responsive Design mit Mobile-First-Ansatz
- Theme-basierte Farbvariablen
- Konsistente Komponentendesigns
- Dark Mode Unterstützung

### Box-Konzept

Die Benutzeroberfläche verwendet ein Box-Konzept für konsistente Darstellung:

- **Hauptboxen**: Dashboard/Arbeitszeitstatistik, Requests, Zeiterfassung, etc.
- **Box-Styling**: Weißer Hintergrund, abgerundete Ecken, Schatten im Desktop-Modus
- **Box-Breitentypen**: Wide, Normal, Small

## Fehlerbehandlung

Das System implementiert eine umfassende Fehlerbehandlungsstrategie:

### Frontend-Fehlerbehandlung

- **Try-Catch-Blöcke**: Für alle asynchronen Operationen
- **Error Boundaries**: Für React-Komponenten
- **Toast-Benachrichtigungen**: Für Benutzer-Feedback
- **Fehlerstatusprüfung**: Bei API-Antworten

### Backend-Fehlerbehandlung

- **Express Error Middleware**: Zentralisierte Fehlerbehandlung
- **Benutzerdefinierte Fehlertypen**: Für verschiedene Fehlersituationen
- **Validierungsfehler**: Detaillierte Validierungsinformationen
- **Logging**: Strukturierte Fehlerprotokolle

## Skalierung

Die Architektur unterstützt Skalierung durch:

- **Modularität**: Unabhängige Komponenten und Services
- **Zustandsisolierung**: Klare Grenzen zwischen Modulen
- **Stateless Backend**: Zustandslose API für horizontale Skalierung
- **Datenbankindexierung**: Optimierte Datenbankabfragen
- **Caching-Möglichkeiten**: Für häufig abgerufene Daten

---

Diese Architektur bietet eine solide Grundlage für die aktuelle Funktionalität des Intranet-Projekts und ermöglicht gleichzeitig zukünftige Erweiterungen und Verbesserungen. 