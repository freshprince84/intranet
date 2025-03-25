# Mobile App (React Native)

Diese Dokumentation beschreibt die technischen Details der mobilen React Native App-Version des Intranet-Projekts.

## Übersicht

Die mobile App ermöglicht den Zugriff auf die wesentlichen Funktionen des Intranet-Systems über mobile Endgeräte. Sie nutzt dasselbe Backend wie die Web-Anwendung und bietet eine für mobile Geräte optimierte Benutzeroberfläche.

## Architektur

Die React Native App ist als zusätzlicher Client konzipiert, der das bestehende Backend nutzt:

```
/intranet
  /backend          # Bestehendes Backend (unverändert)
  /frontend         # Web-Frontend (unverändert)
  /app              # React Native Frontend
    /src            # React Native App-Quellcode
```

## Technologiestack

- **React Native**: Framework für die mobile App
- **TypeScript**: Programmiersprache (identisch zum Web-Frontend)
- **React Navigation**: Navigationsmanagement
- **React Native Paper**: UI-Komponenten-Bibliothek
- **Axios**: HTTP-Client für API-Anfragen
- **AsyncStorage**: Lokaler Speicher (ersetzt localStorage)

## API-Integration

Die App nutzt dasselbe Backend wie das Web-Frontend, mit leichten Anpassungen für mobile Geräte:

- Asynchrone Speicherung von Authentifizierungsdaten mit AsyncStorage
- Spezielle Header zur Identifizierung mobiler Clients
- Offline-Synchronisationsmechanismen für instabile Verbindungen

## Hauptfunktionalitäten

Die mobile App implementiert folgende Hauptfunktionen:

1. **Authentifizierung**: Login mit Benutzername/Passwort, optional biometrische Authentifizierung
2. **Zeiterfassung**: Arbeitszeiterfassung mit Timer und Offline-Unterstützung
3. **Benutzerprofil**: Anzeige und Bearbeitung von Benutzerdetails
4. **Benachrichtigungen**: Push-Benachrichtigungen für Aufgaben und Anfragen
5. **Dashboard**: Übersicht über aktuelle Aktivitäten und Aufgaben

## Datenaustausch mit dem Backend

Der Datenaustausch erfolgt über REST-API-Endpunkte identisch zum Web-Frontend, mit angepasster Fehlerbehandlung für mobile Netzwerkbedingungen.

## Offline-Funktionalität

Die App unterstützt grundlegende Offline-Funktionalität:

- Zwischenspeicherung von Zeiterfassungsdaten
- Automatische Synchronisation bei Wiederverbindung
- Lokales Caching häufig genutzter Daten

## Mobile-spezifische Erweiterungen

Folgende native Funktionalitäten werden implementiert:

- **Kameraintegration**: Für Dokumentenerfassung und OCR
- **Biometrische Authentifizierung**: Fingerabdruck/Gesichtserkennung
- **Push-Benachrichtigungen**: Für Echtzeit-Updates

## Sicherheitsaspekte

- Sichere Speicherung von Zugangsdaten im gerätespezifischen sicheren Speicher
- Automatische Abmeldung nach Inaktivität
- Verschlüsselte Übertragung aller Daten

## Backend-Konfiguration

Für die Unterstützung der mobilen App wurde die CORS-Konfiguration im Backend angepasst:

```typescript
app.use(cors({
  origin: ['http://localhost:3000', 'app://', 'exp://'],
  credentials: true
}));
```

## APK-Erstellung

### Voraussetzungen

- Android Studio installiert
- Android SDK installiert
- Node.js und npm installiert
- React Native CLI installiert

### Build-Konfiguration

Die App verwendet folgende Konfiguration:
- App-Name: "Intranet"
- Version: 1.0.0
- Package Name: com.intranet.app
- Keystore: Wiederverwendung des bestehenden Keystores für Token-Storage

### Build-Schritte

1. Wechseln Sie in das App-Verzeichnis:
```bash
cd IntranetMobileApp
```

2. Installieren Sie die Abhängigkeiten:
```bash
npm install
```

3. Erstellen Sie die Android-Konfiguration:
```bash
npx react-native config
```

4. Erstellen Sie die Release-APK:
```bash
cd android
./gradlew assembleRelease
```

Die fertige APK finden Sie unter:
`android/app/build/outputs/apk/release/app-release.apk`

### Deployment

Die APK wird auf dem Hetzner-Server unter https://65.109.228.106.nip.io/ bereitgestellt.

### Wichtige Hinweise

- Die App verwendet die Produktions-API-URL: https://65.109.228.106.nip.io/
- ProGuard ist deaktiviert, da die App-Größe nicht kritisch ist
- Der bestehende Keystore wird für die APK-Signierung verwendet

## Verwandte Dokumentation

- [API-Referenz](API_REFERENZ.md) - Backend-API-Dokumentation
- [Authentifizierungssystem](BERECHTIGUNGSSYSTEM.md) - Details zum Auth-System 