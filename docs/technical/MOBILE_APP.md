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
- **NetInfo**: Netzwerkstatuserkennung für Offline-Modus

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

## Zeiterfassung und Synchronisierung

Die Zeiterfassung in der mobilen App basiert auf demselben Prinzip wie im Frontend, mit zusätzlichen Funktionen für die Offline-Nutzung und robusten Aktualisierungsmechanismen.

### Abweichungen vom Frontend

1. **Polling-Mechanismus**:
   - Die mobile App verwendet zwei Intervalle für Aktualisierungen:
     - Ein 10-Sekunden-Intervall für den Timer-Status (schnelle Reaktion auf Änderungen)
     - Ein 30-Sekunden-Intervall für vollständige Datenaktualisierung
   - Im Gegensatz zum Frontend, das nur auf Event-basierte Aktualisierung und manuelle Aktualisierung setzt

2. **Offline-Unterstützung**:
   - Die App kann Zeiterfassung auch ohne Internetverbindung starten und stoppen
   - Offline-Einträge werden lokal mit AsyncStorage gespeichert und bei Wiederverbindung synchronisiert
   - Robuste Erkennung des Netzwerkstatus mit der NetInfo-Bibliothek

3. **Timer-Statusprüfung**:
   - Implementiert eine forcierte Serverprüfung bei Bedarf (`checkRunningTimer(true)`)
   - Intelligente Erkennung von Statusänderungen im Backend (z.B. wenn der Timer über das Frontend gestoppt wurde)
   - Lokaler Cache mit Fallback auf Serverabfrage

4. **Zeitzonenhandling**:
   - Lokale Zeitanzeige in der Benutzeroberfläche
   - Server-Kommunikation in UTC-Format
   - Konsistente Konvertierung zwischen lokaler Zeit und UTC

### Technische Implementierung

```typescript
// Verbesserte Netzwerkerkennung
const isOfflineCheck = async () => {
  try {
    const state = await NetInfo.fetch();
    console.log('Network state:', state);
    
    // Prüfe nicht nur isConnected, sondern auch isInternetReachable
    const isOffline = !state.isConnected || !state.isInternetReachable;
    
    return isOffline;
  } catch (error) {
    console.error('Fehler bei der Netzwerkprüfung:', error);
    // Im Fehlerfall nehmen wir an, dass wir offline sind
    return true;
  }
};

// Duale Polling-Mechanismen
useEffect(() => {
  setupScreen();
  
  // Polling alle 10 Sekunden für Timer-Status
  const statusInterval = setInterval(async () => {
    if (!isOffline) {
      try {
        await checkRunningTimer();
      } catch (error) {
        console.error('Fehler beim Aktualisieren des Timer-Status:', error);
      }
    }
  }, 10000); 
  
  // Komplettes Neuladen alle 30 Sekunden
  const fullRefreshInterval = setInterval(setupScreen, 30000);
  
  return () => {
    clearInterval(statusInterval);
    clearInterval(fullRefreshInterval);
  };
}, []);
```

### Lokales Speichern und Synchronisieren

Die App speichert Zeiterfassungseinträge im Offline-Modus in AsyncStorage und synchronisiert sie, sobald eine Verbindung wiederhergestellt ist:

```typescript
// Offline-Daten laden
const loadOfflineWorkTimes = async (): Promise<MobileWorkTime[]> => {
  try {
    const offlineData = await AsyncStorage.getItem(OFFLINE_WORKTIME_KEY);
    if (!offlineData) return [];
    
    const parsedData = JSON.parse(offlineData);
    
    // Date-Strings in Date-Objekte umwandeln
    return parsedData.map((item: MobileWorkTime) => ({
      ...item,
      startTime: new Date(item.startTime),
      endTime: item.endTime ? new Date(item.endTime) : null
    }));
  } catch (error) {
    console.error('Fehler beim Laden der Offline-Daten:', error);
    return [];
  }
};

// Offline-Daten synchronisieren
const syncOfflineData = async () => {
  const offlineData = await loadOfflineWorkTimes();
  
  if (offlineData.length === 0) {
    Alert.alert('Info', 'Keine Offline-Daten zum Synchronisieren vorhanden.');
    return;
  }
  
  try {
    // Prüfe Verbindungsstatus vor API-Call
    const isOfflineMode = await isOfflineCheck();
    if (isOfflineMode) {
      Alert.alert('Fehler', 'Keine Internetverbindung verfügbar.');
      return;
    }

    // Offline-Daten für API vorbereiten
    const apiEntries = offlineData.map(entry => {
      // Stellen wir sicher, dass startTime und endTime Strings sind
      let startTimeStr = '';
      if (entry.startTime instanceof Date) {
        startTimeStr = entry.startTime.toISOString();
      } else if (typeof entry.startTime === 'string') {
        startTimeStr = new Date(entry.startTime).toISOString();
      }

      let endTimeStr = null;
      if (entry.endTime) {
        if (entry.endTime instanceof Date) {
          endTimeStr = entry.endTime.toISOString();
        } else if (typeof entry.endTime === 'string') {
          endTimeStr = new Date(entry.endTime).toISOString();
        }
      }

      return {
        ...entry,
        startTime: startTimeStr,
        endTime: endTimeStr,
        // Entferne Felder, die das Backend nicht erwartet
        offlineId: undefined,
        synced: undefined
      };
    });
    
    // Sende alle Offline-Einträge zur Synchronisierung
    await worktimeApi.syncOfflineEntries(apiEntries);
    
    // Lösche die synchronisierten Daten
    await AsyncStorage.setItem(OFFLINE_WORKTIME_KEY, JSON.stringify([]));
    
    // Lade die aktuellen Daten neu
    await loadWorkTimes();
  } catch (error) {
    console.error('Fehler bei der Synchronisierung:', error);
    Alert.alert('Fehler', 'Die Synchronisierung ist fehlgeschlagen.');
  }
};
```

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

Die APK wird auf dem Hetzner-Server unter https://65.109.228.106.nip.io/downloads/ bereitgestellt.

#### APK auf Server hochladen

```bash
scp -i ~/.ssh/intranet_rsa backend/public/downloads/intranet-app.apk root@65.109.228.106:/var/www/intranet/backend/public/downloads/
```

WICHTIG: Der SSH-Schlüssel `~/.ssh/intranet_rsa` muss für den Upload verwendet werden.

### Installation auf Android-Geräten

1. **Voraussetzungen auf dem Android-Gerät:**
   - Android 6.0 oder höher
   - Installation von Apps aus unbekannten Quellen erlauben:
     - Einstellungen → Apps → Spezielle Berechtigungen → Apps aus unbekannten Quellen installieren
     - Browser (z.B. Chrome) aktivieren

2. **Download und Installation:**
   - Öffnen Sie https://65.109.228.106.nip.io/downloads/intranet-app.apk im Browser
   - Tippen Sie auf "Herunterladen" oder "Installieren"
   - Bestätigen Sie die Installation
   - Warten Sie, bis die Installation abgeschlossen ist

3. **Erststart:**
   - Öffnen Sie die App
   - Melden Sie sich mit Ihren Intranet-Zugangsdaten an
   - Erlauben Sie die erforderlichen Berechtigungen

### Wichtige Hinweise

- Die App verwendet die Produktions-API-URL: https://65.109.228.106.nip.io/
- ProGuard ist deaktiviert, da die App-Größe nicht kritisch ist
- Der bestehende Keystore wird für die APK-Signierung verwendet

## Implementierungsdetails

### Auth-Flow

Die Authentifizierung verwendet AsyncStorage zum Speichern des JWT-Tokens:

```typescript
// Auth-Token speichern
await AsyncStorage.setItem('token', responseToken);

// Token für Requests verwenden
axiosInstance.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## Bekannte Probleme und Lösungen

### Timer-Synchronisierung

**Problem:** Zeiterfassung startet oder stoppt nicht korrekt zwischen Frontend und Mobile App.

**Lösung:** 
- Verbesserte Polling-Mechanismen mit unterschiedlichen Intervallen
- Korrektur der HTTP-Methode von PUT zu POST für den Timer-Stopp
- Implementierung intelligenter Netzwerkerkennung
- Forcierter Server-Check bei kritischen Operationen

### Zeitzonen-Handling

**Problem:** Zeiten werden falsch angezeigt (z.B. eine Stunde Differenz).

**Lösung:**
- Konsequente Umwandlung zwischen lokaler Zeit und UTC
- Verwendung von lokalem Zeitformat für die Anzeige
- Konsistente UTC-Formate für API-Kommunikation

## Roadmap

1. **Aktuelle Phase:** Basis-Funktionalität mit Login und Zeiterfassung
2. **Nächste Schritte:**
   - Dashboard-Screen implementieren
   - Profilmanagement hinzufügen
   - Offline-Modus vervollständigen
3. **Spätere Phasen:**
   - Push-Benachrichtigungen
   - Kamera-Integration
   - Biometrische Authentifizierung

## Verwandte Dokumentation

- [API-Referenz](API_REFERENZ.md) - Backend-API-Dokumentation
- [Authentifizierungssystem](BERECHTIGUNGSSYSTEM.md) - Details zum Auth-System

## Dynamische App Icons

Die mobile App unterstützt dynamische App Icons, die automatisch aus dem hochgeladenen Logo in den Settings generiert werden. Dies ermöglicht eine konsistente Markenidentität über alle Plattformen hinweg.

### Unterstützte Icon-Größen

#### iOS
- 20x20 (2x, 3x)
- 29x29 (2x, 3x)
- 40x40 (2x, 3x)
- 60x60 (2x, 3x)
- 1024x1024 (1x)

#### Android
- 48x48 (mdpi)
- 72x72 (hdpi)
- 96x96 (xhdpi)
- 144x144 (xxhdpi)
- 192x192 (xxxhdpi)

### API-Endpunkte

#### GET /settings/logo/mobile
Liefert alle Icon-Größen für iOS und Android.

**Response:**
```json
{
  "ios": [
    {
      "size": "20x20",
      "scale": "2x",
      "data": "base64_encoded_image_data"
    },
    // ... weitere iOS Icons
  ],
  "android": [
    {
      "size": "48x48",
      "data": "base64_encoded_image_data"
    },
    // ... weitere Android Icons
  ]
}
```

### Implementierung

Die dynamischen Icons werden durch die `DynamicAppIcon`-Komponente verwaltet, die:
1. Beim App-Start automatisch die aktuellen Icons vom Backend lädt
2. Die Icons in einem plattformspezifischen Verzeichnis speichert
3. Bei Fehlern auf Standard-Icons zurückfällt

### Cache-Management

- Icons werden im lokalen Speicher der App gespeichert
- Bei jedem App-Start wird geprüft, ob neue Icons verfügbar sind
- Bei Netzwerkproblemen werden die zuletzt gespeicherten Icons verwendet

### Fehlerbehandlung

- Bei Fehlern beim Laden der Icons werden Standard-Icons verwendet
- Fehler werden in der App-Konsole protokolliert
- Der Benutzer wird nicht durch Icon-bezogene Fehler beeinträchtigt 