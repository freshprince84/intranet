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
- Bugfix: `lastUsed`-Eigenschaft wird jetzt korrekt vom Backend zum Frontend übertragen

### Fixed
- API-Routen in `notificationApi.ts` korrigiert:
  - Alle Routen verwenden nun das korrekte `/api` Prefix
  - Verbesserte Fehlerbehandlung und Typsicherheit
  - Konsistente Rückgabeformate für alle API-Aufrufe
- Probleme beim Zugriff über IP-Adresse (192.168.1.1) behoben:
  - Logo wird jetzt korrekt angezeigt
  - Tasks können erstellt werden
  - Requests können erstellt werden

### Technical
- Migration von Material-UI Komponenten zu Tailwind CSS in `NotificationList.tsx`
- Entfernung nicht benötigter MUI-Importe
- Optimierung der TypeScript Interfaces für Benachrichtigungen
- Verbessertes Error-Handling in der API
- Fix von TypeScript-Importproblemen in mehreren Dateien
- Aktualisierung der Dokumentation in verschiedenen MD-Dateien 