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
10. [Mobile App-Architektur](#mobile-app-architektur)
11. [Fehlerbehandlung](#fehlerbehandlung)
12. [Skalierung](#skalierung)

## Überblick

Das Intranet-Projekt ist eine modern aufgebaute Webapplikation, die eine React-basierte Frontend-Anwendung mit einem Node.js-Backend und einer PostgreSQL-Datenbank verbindet. Die Anwendung folgt einer klassischen dreischichtigen Architektur:

1. **Präsentationsschicht**: 
   - React-basiertes Web-Frontend
   - React Native mobile App
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
- **User-Management**: Organisation für Administratoren
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
- **MessageContext**: Temporäre System- und Feedback-Meldungen im Header

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

## Mobile App-Architektur

Die mobile App erweitert das Intranet-System um eine native mobile Schnittstelle und nutzt dabei dasselbe Backend wie das Web-Frontend.

### Technologien

- **React Native**: Framework für die Entwicklung nativer mobiler Apps mit React
- **TypeScript**: Typisierte Sprache für bessere Entwicklererfahrung und Codequalität
- **React Navigation**: Navigationsframework für die App
- **React Native Paper**: UI-Komponentenbibliothek mit Material Design
- **Axios**: HTTP-Client für API-Anfragen
- **AsyncStorage**: Persistenter Speicher für Offline-Funktionalität

### Architekturmerkmale

1. **Code-Sharing**: Wiederverwendung von Typdefinitionen und API-Clients aus dem Web-Frontend
2. **Offline-First-Ansatz**: Die App kann auch ohne aktive Internetverbindung verwendet werden
3. **Context API**: State-Management über React Context (analog zum Web-Frontend)
4. **Modulare Struktur**: Aufbau in Komponenten, Screens und Services

### Integrationsansatz

Die mobile App ist als eigenständige Anwendung konzipiert, die das bestehende Backend nutzt. Dies ermöglicht:

- Maximale Wiederverwendung der bestehenden API-Endpunkte
- Gemeinsame Geschäftslogik für Web und Mobile
- Einheitliche Datenmodelle und Validierung

### Besondere Features

- **Offline-Synchronisation**: Änderungen werden zwischengespeichert und bei Wiederverbindung synchronisiert
- **Push-Benachrichtigungen**: Echtzeit-Updates von Aufgaben und Anfragen
- **Biometrische Authentifizierung**: Zusätzliche Sicherheitsebene für mobile Benutzer
- **Native Kamera-Integration**: Für die Dokumentenerfassung und OCR-Funktionalität

### Dateispeicherung

Die App nutzt verschiedene Speichermechanismen:
- **AsyncStorage**: Für Benutzereinstellungen und Offline-Daten
- **Secure Storage**: Für sensible Daten wie Zugangsdaten
- **File System**: Für temporäre Mediendateien

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

## Komponentenübersicht

### Benutzerprofilkomponenten

- **Profile**: Verwaltung von Benutzerinformationen
- **PasswordChange**: Änderung des Benutzerpassworts
- **UserSettings**: Benutzereinstellungen (UI, Sprache, etc.)
- **NotificationSettings**: Benachrichtigungspräferenzen
- **IdentificationDocumentForm**: Formular zum Hinzufügen/Bearbeiten von Ausweisdokumenten
- **IdentificationDocumentList**: Liste aller Ausweisdokumente eines Benutzers
- **CameraCapture**: Kameraintegration für mobile Geräte

### KI-basierte Komponenten

- **Dokumentenerkennung**: Automatische Extraktion von Informationen aus Ausweisdokumenten mittels OpenAI GPT-4o
  - **aiDocumentRecognition**: Frontend-Utility zur Kommunikation mit dem Backend
  - **document-recognition**: Backend-Route für die Kommunikation mit der OpenAI API

## Datenflüsse

### Dokumentenerkennungsfluss

1. **Dokumentenerfassung**:
   - Benutzer lädt ein Dokument hoch oder nimmt ein Foto auf
   - Das Frontend konvertiert die Datei in ein Base64-Format
   - `IdentificationDocumentForm` stellt den "Daten automatisch erkennen"-Button bereit

2. **KI-Analyse**:
   - Das Base64-Bild wird über `aiDocumentRecognition.ts` an den Server gesendet
   - Die Backend-Route `/api/document-recognition` empfängt das Bild
   - Der Server validiert die Anfrage und überprüft die Authentifizierung
   - Der Server leitet das Bild an die OpenAI API (GPT-4o) weiter

3. **Ergebnisverarbeitung**:
   - OpenAI extrahiert die Dokumentinformationen und sendet sie als JSON zurück
   - Der Server verarbeitet und validiert das JSON
   - Die extrahierten Daten werden an das Frontend zurückgesendet
   - Das Frontend befüllt automatisch die Formularfelder mit den erkannten Daten

4. **Speicherung**:
   - Benutzer überprüft und korrigiert die Daten bei Bedarf
   - Nach Bestätigung werden die Daten zusammen mit dem Dokumentbild gespeichert
   - Die Dokumentdaten werden in der Datenbank gespeichert, die Datei im Dateisystem

5. **Verifizierung**:
   - Ein Administrator kann das Dokument später einsehen, überprüfen und verifizieren
   - Die Verifizierung aktualisiert den Status des Dokuments in der Datenbank

---

Diese Architektur bietet eine solide Grundlage für die aktuelle Funktionalität des Intranet-Projekts und ermöglicht gleichzeitig zukünftige Erweiterungen und Verbesserungen. 