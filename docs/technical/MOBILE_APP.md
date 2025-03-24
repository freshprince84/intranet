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

## Deployment

Die App wird für beide Hauptplattformen bereitgestellt:
- **Android**: Google Play Store
- **iOS**: Apple App Store

## Verwandte Dokumentation

- [API-Referenz](API_REFERENZ.md) - Backend-API-Dokumentation
- [Authentifizierungssystem](BERECHTIGUNGSSYSTEM.md) - Details zum Auth-System 