# Intranet Mobile App Dokumentation

## Übersicht

Die Intranet Mobile App ist eine mobile Anwendung, die Funktionen des Web-Frontends auf Mobilgeräten zur Verfügung stellt. Ziel ist es, ein konsistentes Erlebnis zwischen der Web- und der mobilen Version zu gewährleisten.

## Hauptfunktionen

Die Mobile App bietet folgende Hauptfunktionen:
- Dashboard mit Arbeitszeitstatistiken und offenen Anfragen
- Zeiterfassung (Worktracker)
- Aufgaben-Verwaltung (ToDos)
- Anfragen-Management
- Benachrichtigungen
- Profil-Verwaltung

## Navigation

Die Navigation der Mobile App wurde an die Struktur des Web-Frontends angepasst:

| Web-Frontend | Mobile App |
|--------------|------------|
| Dashboard | Dashboard |
| Zeiterfassung | Worktime |
| Aufgaben | ToDos |
| Anfragen | Anfragen |
| Profil | Profile |

## Ordnerstruktur

Die Mobile App befindet sich im Ordner `IntranetMobileApp/` und folgt einer modularen Struktur:

```
IntranetMobileApp/
├── src/
│   ├── api/            - API-Client und Service-Definitionen
│   ├── assets/         - Bilder, Sounds und andere statische Ressourcen
│   ├── components/     - Wiederverwendbare UI-Komponenten
│   ├── config/         - Konfigurationsdateien (API-URLs, Konstanten)
│   ├── contexts/       - React Context Provider (Auth, Theme, etc.)
│   ├── hooks/          - Benutzerdefinierte React Hooks
│   ├── navigation/     - Navigationsstruktur und -konfiguration
│   ├── screens/        - Bildschirme der Anwendung
│   ├── services/       - Dienste (Notifications, Offline-Storage)
│   ├── styles/         - Globale Stile und Themes
│   ├── types/          - TypeScript-Typendefinitionen
│   └── utils/          - Hilfsfunktionen und Utilities
```

## Backend-Konfiguration

Die App verbindet sich mit dem Backend-Server über eine konfigurierbare API-URL:

- Die Konfiguration befindet sich in `src/config/api.ts`
- In der Entwicklungsumgebung wird `192.168.1.120:5000` als Backend-Server verwendet
- Der API-Client (`src/api/apiClient.ts`) verwendet diese Konfiguration für alle API-Anfragen

**Wichtig**: Bei Änderungen der Server-IP-Adresse muss die Konfiguration in `src/api/apiClient.ts` entsprechend angepasst werden.

## Konsistenz mit dem Web-Frontend

### Dashboard
- Gleiche Datenquellen und API-Endpunkte für Statistiken
- Ähnliche Darstellung der Arbeitszeitstatistiken
- Anzeige offener Anfragen mit gleicher Statuslogik
- Mobil-optimierte Benutzeroberfläche

### Benachrichtigungen
- Gemeinsame Nutzung der Benachrichtigungs-API
- Gleiche Funktionalität (lesen, löschen)
- Unterstützung für die gleichen Benachrichtigungstypen

### Arbeitszeit-Tracking
- Identische Backend-Endpunkte
- Offline-Unterstützung für mobile Nutzung
- Synchronisierung mit dem Backend bei Verfügbarkeit

### Datenmodell
- Einheitliche Typen und Schnittstellen zwischen Web und Mobile
- Wiederverwendung von Statusdefinitionen und Enumerationen

## Implementierungsdetails

### API-Integration
Die App nutzt die gleichen API-Endpunkte wie das Web-Frontend. Dafür wurde ein spezieller API-Client erstellt, der:

- Authentifizierung via Token handhabt
- Offline-Unterstützung bietet
- Typisierte Rückgabewerte liefert

### Screens und Komponenten
Für jeden Hauptbereich existieren dedizierte Screens:

- `DashboardScreen`: Zeigt Übersicht mit Arbeitszeitstatistiken und offenen Anfragen
- `WorktimeScreen`: Ermöglicht das Starten/Stoppen der Zeiterfassung
- `TasksScreen`: Zeigt und verwaltet Aufgaben
- `RequestsScreen`: Zeigt und verwaltet Anfragen
- `NotificationsScreen`: Zeigt Benachrichtigungen
- `ProfileScreen`: Zeigt und verwaltet Benutzereinstellungen

## Wartung und Erweiterung

Bei Erweiterungen des Web-Frontends sollten folgende Punkte beachtet werden:

1. **Konsistenz bewahren**: Neue Funktionen sollten in beiden Plattformen ähnlich umgesetzt werden
2. **Gemeinsame Typdefinitionen**: Typen in `/src/types/index.ts` pflegen
3. **API-Client erweitern**: Neue API-Endpoints auch im Mobile-Client implementieren
4. **Navigationsnamen**: Gleiche oder ähnliche Namen für Navigationselemente verwenden

## Offene Punkte und Empfehlungen

- Nach Backend-Änderungen immer beide Frontends (Web & Mobile) testen
- Bei Ergänzung neuer Funktionen Formatierung und Datenstrukturen zwischen Web und Mobile abstimmen
- Bei Design-Änderungen im Web auch entsprechende Anpassungen in der Mobile App vornehmen 