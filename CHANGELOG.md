# Changelog

## [Unreleased]

### Added
- IP-basierter Zugriff (192.168.1.1) zusätzlich zu localhost implementiert
- Erweiterte Berechtigungsstruktur:
  - Das Feld `page` wurde zu `entity` umbenannt und kann nun sowohl Seiten als auch Tabellen repräsentieren
  - Das neue Feld `entityType` unterscheidet zwischen 'page' und 'table' Berechtigungen
  - Für Tabellen wie "requests" und "tasks" wurden spezifische Tabellenberechtigungen eingeführt
  - Die Frontend-Komponenten prüfen jetzt Berechtigungen mit `hasPermission('entity', 'accessLevel', 'entityType')`
- Verbesserte Rollenauswahl:
  - Beim Login wird die zuletzt genutzte Rolle (`lastUsed=true`) für den Benutzer aktiviert
  - Wenn keine zuletzt genutzte Rolle vorhanden ist, wird die Rolle mit der niedrigsten ID aktiviert
  - Im Rollenauswahlmenü werden die Rollen alphabetisch (A-Z) sortiert angezeigt
- Standard-Tabelleneinstellungen für den Admin-Benutzer in der Seed-Datei hinzugefügt
- Dokumentation zu UserTableSettings in DB_SCHEMA.md und FRONTEND_SETUP.md ergänzt

### Changed
- Benachrichtigungssystem überarbeitet:
  - `NotificationList.tsx` Design von MUI auf Tailwind CSS migriert
  - Verbesserte Benutzeroberfläche mit modernem Design
  - Optimierte Darstellung von Benachrichtigungen
  - Responsive Pagination-Komponente hinzugefügt
  - Verbesserte Fehlerbehandlung in der API
  - Typsicherheit durch TypeScript Interfaces verstärkt
- API-Konfiguration aktualisiert:
  - Zentrale Konfiguration in `frontend/src/config/api.ts`
  - Bei Imports muss die vollständige Dateiendung angegeben werden: `import { API_URL } from '../config/api.ts'`
  - API-Endpunkte werden jetzt ohne `/api` Präfix aufgerufen
- Arbeitszeitstatistik verbessert:
  - Titel und Werte in den Statistikboxen (Gesamtstunden, Durchschnitt/Tag, Arbeitstage) werden auf allen Bildschirmgrößen zentriert dargestellt
  - Verbesserte mobile Darstellung der Statistiken
- Bugfix: `lastUsed`-Eigenschaft wird jetzt korrekt vom Backend zum Frontend übertragen
- Performance-Optimierung: Unnötige Debug-Logs in folgenden Dateien entfernt:
  - Bereinigung von console.log-Anweisungen in `backend/src/middleware/permissionMiddleware.ts`
  - Entfernung von Debug-Ausgaben in `backend/src/controllers/notificationController.ts`
  - Entfernung von Debug-Logs in `frontend/src/hooks/usePermissions.ts` bei Berechtigungsprüfungen
- Spaltenbezeichnung von "Zuständigkeit" zu "Verantwortlich / Qualitätskontrolle" geändert

### Fixed
- API-Routen in `notificationApi.ts` korrigiert:
  - Alle Routen verwenden nun das korrekte `/api` Prefix
  - Verbesserte Fehlerbehandlung und Typsicherheit
  - Konsistente Rückgabeformate für alle API-Aufrufe
- Probleme beim Zugriff über IP-Adresse (192.168.1.1) behoben:
  - Logo wird jetzt korrekt angezeigt
  - Tasks können erstellt werden
  - Requests können erstellt werden
- Problem mit der Sichtbarkeit der kombinierten Spalte "Verantwortlich / Qualitätskontrolle" im Worktracker behoben
- Inkonsistenz zwischen Frontend-Spaltendefinitionen und Datenbank-Einträgen korrigiert

### Technical
- Migration von Material-UI Komponenten zu Tailwind CSS in `NotificationList.tsx`
- Entfernung nicht benötigter MUI-Importe
- Optimierung der TypeScript Interfaces für Benachrichtigungen
- Verbessertes Error-Handling in der API
- Fix von TypeScript-Importproblemen in mehreren Dateien
- Aktualisierung der Dokumentation in verschiedenen MD-Dateien

## [1.0.0] - 2023-06-01

### Added
- Initiale Version des Intranets
- Dashboard mit Übersicht über Tasks und Requests
- Worktracker für die Verwaltung von Aufgaben
- Benutzerverwaltung mit Rollen und Berechtigungen
- Einstellungen für Benutzer und System
- Benachrichtigungssystem für wichtige Ereignisse 