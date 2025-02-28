# Changelog

## [Unreleased]

### Changed
- Benachrichtigungssystem überarbeitet:
  - `NotificationList.tsx` Design von MUI auf Tailwind CSS migriert
  - Verbesserte Benutzeroberfläche mit modernem Design
  - Optimierte Darstellung von Benachrichtigungen
  - Responsive Pagination-Komponente hinzugefügt
  - Verbesserte Fehlerbehandlung in der API
  - Typsicherheit durch TypeScript Interfaces verstärkt

### Fixed
- API-Routen in `notificationApi.ts` korrigiert:
  - Alle Routen verwenden nun das korrekte `/api` Prefix
  - Verbesserte Fehlerbehandlung und Typsicherheit
  - Konsistente Rückgabeformate für alle API-Aufrufe

### Technical
- Migration von Material-UI Komponenten zu Tailwind CSS in `NotificationList.tsx`
- Entfernung nicht benötigter MUI-Importe
- Optimierung der TypeScript Interfaces für Benachrichtigungen
- Verbessertes Error-Handling in der API 