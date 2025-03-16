# Changelog

## [Unreleased]

### Added
- IP-basierter Zugriff (192.168.1.1) zusätzlich zu localhost implementiert
- Erweiterte Berechtigungsstruktur:
  - Das Feld `page` wurde zu `entity` umbenannt und kann nun sowohl Seiten als auch Tabellen repräsentieren
  - Das neue Feld `entityType` unterscheidet zwischen 'page' und 'table' Berechtigungen
  - Für Tabellen wie "requests" und "tasks" wurden spezifische Tabellenberechtigungen eingeführt
  - Die Frontend-Komponenten prüfen jetzt Berechtigungen mit `hasPermission('entity', 'accessLevel', 'entityType')`
- Zentrales Header-Message-System:
  - `MessageContext` und `useMessage`-Hook für die systemweite Verwaltung von Meldungen
  - Automatische Anzeige und Ausblendung von Feedback-Meldungen im Header
  - Unterstützung für verschiedene Meldungstypen: success, error, warning, info
  - Einheitliches Design für alle Systemfeedback-Meldungen
  - Integration in Settings, Profile und UserManagement
  - 3-Sekunden-Anzeigedauer für nicht-kritische Meldungen
- Dokumentation zur Komponenten-Synchronisierung:
  - Hinweise zur Synchronisierung von `UserManagementTab` und `Profile` in README.md
  - Klare Anweisungen für Entwickler zur konsistenten Bearbeitung beider Komponenten
  - Empfehlung für die zukünftige Erstellung einer gemeinsam genutzten Komponente
- Automatische Zeiterfassungs-Begrenzung:
  - Neue Felder im User-Modell: `normalWorkingHours` (Standard: 7,6h für Kolumbien), `country` und `language`
  - Automatisches Stoppen der Zeiterfassung bei Erreichen der täglichen Arbeitszeit
  - Benachrichtigung des Benutzers bei automatischem Stopp
  - Sperrung der Zeiterfassung bis zum nächsten Tag nach Erreichen der täglichen Arbeitszeit
  - Konfiguration der normalen Arbeitszeit im Benutzerprofil und in der Benutzerverwaltung
  - Regelmäßige Überprüfung (alle 5 Minuten) aller aktiven Zeiterfassungen
- Verbesserte Rollenauswahl:
  - Beim Login wird die zuletzt genutzte Rolle (`lastUsed=true`) für den Benutzer aktiviert
  - Wenn keine zuletzt genutzte Rolle vorhanden ist, wird die Rolle mit der niedrigsten ID aktiviert
  - Im Rollenauswahlmenü werden die Rollen alphabetisch (A-Z) sortiert angezeigt
- Standard-Tabelleneinstellungen für den Admin-Benutzer in der Seed-Datei hinzugefügt
- Dokumentation zu UserTableSettings in DB_SCHEMA.md und FRONTEND_SETUP.md ergänzt
- Cerebro Wiki-System zur strukturierten Dokumentation und Wissensverwaltung
  - Hierarchische Artikelstruktur mit Eltern-Kind-Beziehungen
  - Rich-Text-Editor zur Formatierung von Artikelinhalten
  - Integrierte Medienunterstützung für Bilder, Videos und PDFs
  - Google Drive-Integration für die Einbettung von Dokumenten
  - Verknüpfung mit Tasks und Requests
  - Volltextsuche über alle Artikel
  - Rechtesystem für verschiedene Zugriffsebenen
- Cerebro Wiki-System geplant:
  - Detaillierte Spezifikation und Implementierungsplan erstellt
  - Dokumentation unter CEREBRO_WIKI.md hinzugefügt
  - Datenmodell mit CerebroCarticle, TaskCerebroCarticle, RequestCerebroCarticle, CerebroMedia und CerebroTag entworfen
  - Berechtigungssystem- und Notification-Integration konzipiert
  - API-Endpunkte und Controller definiert
  - Frontend-Komponenten und Rich-Text-Editor geplant
  - Google Drive Integration hinzugefügt für das Einbinden externer Dokumente via Link-Einfügen
- Cerebro Wiki-System Implementierung:
  - Datenbankschema in schema.prisma aktualisiert mit allen benötigten Modellen
  - Notification-Settings um Cerebro-spezifische Benachrichtigungstypen erweitert
  - Backend-Controller für Artikel, Medien und externe Links implementiert
  - API-Routen für alle Wiki-Funktionen erstellt
  - Berechtigungssystem um Cerebro-spezifische Berechtigungen erweitert
  - Automatische Metadaten-Extraktion für externe Links (Google Drive, YouTube)
  - Datei-Upload-System für Medien mit Unterstützung für Bilder, PDFs und Videos
  - Hierarchische Artikelstruktur mit Eltern-Kind-Beziehungen
  - Slug-Generierung für URL-freundliche Pfade
  - Benachrichtigungssystem für Artikel-Erstellung, -Aktualisierung und -Löschung

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
- Berechtigungssystem erweitert:
  - Neuer EntityType 'cerebro' für Wiki-spezifische Berechtigungen
  - Unterstützung für verschiedene Cerebro-Entitäten (cerebro, cerebro_media, cerebro_links)
- Verbessertes Zeitzonenhandling in der Arbeitszeiterfassung:
  - Lokale Systemzeit wird nun konsequent ohne Umrechnung in UTC gespeichert und angezeigt
  - Frontend-seitige Zeitzonenkorrektur bei Senden neuer Zeiterfassungen implementiert
  - Speicherung der Benutzer-Zeitzone für konsistente Anzeige
  - Korrigierte formatStartDate-Funktion für korrekte lokale Zeitanzeige

### Fixed
- API-Routen in `notificationApi.ts` korrigiert:
  - Alle Routen verwenden nun das korrekte `/api` Prefix
  - Verbesserte Fehlerbehandlung und Typsicherheit
  - Konsistente Rückgabeformate für alle API-Aufrufe
- Probleme beim Zugriff über IP-Adresse (192.168.1.1) behoben:
  - Logo wird jetzt korrekt angezeigt
  - Tasks können erstellt werden
  - Requests können erstellt werden
- Profile-Komponente korrigiert:
  - Design an die System-Standards angepasst (Abstände, Titelgröße)
  - Felder normalWorkingHours, country und language werden jetzt korrekt geladen und gespeichert
  - Standardwerte für nicht gesetzte Felder werden korrekt angewendet
- Problem mit der Sichtbarkeit der kombinierten Spalte "Verantwortlich / Qualitätskontrolle" im Worktracker behoben
- Inkonsistenz zwischen Frontend-Spaltendefinitionen und Datenbank-Einträgen korrigiert
- Problem mit Zeitzonenumrechnungen in der Arbeitszeiterfassung behoben:
  - Falsche Darstellung von Start- und Endzeiten korrigiert
  - Fehlerhafte Berechnung der aktiven Arbeitszeit behoben
  - Falsche Speicherung von Zeitstempeln in der Datenbank behoben
  - Frontend-Komponenten für korrekte Zeitdarstellung angepasst
  - Implementierung von `localNow` in der automatischen Stoppfunktion für korrekte Zeitzonenbehandlung
  - Konsistente Verwendung lokaler Zeitstempel beim automatischen Stoppen der Zeiterfassung

### Technical
- Migration von Material-UI Komponenten zu Tailwind CSS in `NotificationList.tsx`
- Entfernung nicht benötigter MUI-Importe
- Optimierung der TypeScript Interfaces für Benachrichtigungen
- Verbessertes Error-Handling in der API
- Fix von TypeScript-Importproblemen in mehreren Dateien
- Aktualisierung der Dokumentation in verschiedenen MD-Dateien
- Neue Abhängigkeiten für das Cerebro Wiki-System:
  - slugify für URL-freundliche Slugs
  - axios für HTTP-Anfragen
  - cheerio für HTML-Parsing
  - multer für Datei-Uploads

## [1.0.0] - 2023-06-01

### Added
- Initiale Version des Intranets
- Dashboard mit Übersicht über Tasks und Requests
- Worktracker für die Verwaltung von Aufgaben
- Benutzerverwaltung mit Rollen und Berechtigungen
- Einstellungen für Benutzer und System
- Benachrichtigungssystem für wichtige Ereignisse 