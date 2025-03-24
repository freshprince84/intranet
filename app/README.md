# Intranet Mobile App

Mobile App-Version des Intranet-Projekts entwickelt mit React Native.

## Übersicht

Diese App bietet mobile Zugriffsmöglichkeiten auf die wichtigsten Funktionen des Intranet-Systems, mit besonderem Fokus auf:

- Zeiterfassung mit Offline-Unterstützung
- Benachrichtigungen für Aufgaben und Anfragen
- Benutzerprofilverwaltung
- Mobil-optimierte Oberfläche

## Technologie-Stack

- React Native
- TypeScript
- React Navigation
- React Native Paper (UI-Komponenten)
- Axios (API-Requests)
- AsyncStorage (lokale Datenspeicherung)

## Projektstruktur

```
/app
  /src
    /api          # API-Client und Endpunkte
    /assets       # Bilder, Fonts, etc.
    /components   # Wiederverwendbare UI-Komponenten
    /contexts     # Context-Provider (Auth, etc.)
    /hooks        # Custom React Hooks
    /navigation   # Navigationsstruktur
    /screens      # Hauptbildschirme der App
    /services     # Dienste (Benachrichtigungen, etc.)
    /types        # TypeScript-Typdefinitionen
    /utils        # Hilfsfunktionen
    /config       # Konfigurationen
    /styles       # Globale Styles
```

## Installation

1. Sicherstellen, dass Node.js (>=16) und React Native CLI installiert sind:
   ```
   npm install -g react-native-cli
   ```

2. Abhängigkeiten installieren:
   ```
   cd app
   npm install
   ```

3. Metro Bundler starten:
   ```
   npm start
   ```

4. App auf Emulator/Gerät ausführen:
   ```
   npm run android   # für Android
   npm run ios       # für iOS
   ```

## Backend-Integration

Die App nutzt das gleiche Backend wie das Web-Frontend. In der Entwicklungsumgebung muss die IP-Adresse des Backend-Servers angepasst werden:

1. Öffne `src/config/api.ts`
2. Aktualisiere die API_URL mit der korrekten IP-Adresse deines lokalen Entwicklungsservers

## Coding-Konventionen

- **Komponenten**: Jede Komponente in einer eigenen Datei mit PascalCase-Benennung
- **Hooks**: Custom Hooks mit `use`-Präfix benennen
- **Styles**: Innerhalb der Komponenten-Datei mit StyleSheet.create() definieren
- **API-Calls**: In der jeweiligen api/-Datei definieren
- **TypeScript**: Typen für Props und State immer definieren

## Offline-Funktionalität

Die App unterstützt grundlegende Offline-Funktionalität:

- Lokales Speichern von Zeiterfassungsdaten
- Automatische Synchronisierung bei Wiederverbindung
- Statusanzeige für Online/Offline-Modus

## Testing

Tests können mit Jest ausgeführt werden:

```
npm test
```

## Deployment

Die App kann für Produktionszwecke wie folgt gebaut werden:

```
cd android && ./gradlew assembleRelease   # Android APK
cd ios && xcodebuild -workspace...        # iOS IPA
```

## Ressourcen

- [React Native Dokumentation](https://reactnative.dev/docs/getting-started)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [React Native Paper](https://callstack.github.io/react-native-paper/) 