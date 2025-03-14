# MODUL ZEITERFASSUNG

Dieses Dokument beschreibt die Implementierung und Funktionsweise des Zeiterfassungsmoduls im Intranet-Projekt. Besonderer Fokus liegt auf der korrekten Behandlung von Zeitzonen und der Darstellung von Zeitdaten.

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Komponenten](#komponenten)
3. [Zeitzonenbehandlung](#zeitzonenbehandlung)
4. [API-Endpunkte](#api-endpunkte)
5. [Datenmodell](#datenmodell)
6. [Benutzeroberfläche](#benutzeroberfläche)
7. [Berechtigungen](#berechtigungen)
8. [Fehlerbehandlung](#fehlerbehandlung)

## Überblick

Das Zeiterfassungsmodul ermöglicht Benutzern, ihre Arbeitszeiten zu erfassen, zu verfolgen und zu verwalten. Es besteht aus mehreren Komponenten:

- **WorktimeTracker**: Hauptkomponente zur Zeiterfassung (Start/Stop)
- **WorktimeStats**: Anzeige von Statistiken über erfasste Zeiten
- **WorktimeModal**: Detailansicht und Bearbeitung von Zeiteinträgen
- **TeamWorktimeControl**: Verwaltung von Teamzeiten durch Vorgesetzte

## Komponenten

### WorktimeTracker

Die `WorktimeTracker`-Komponente ist für die Erfassung der Arbeitszeit verantwortlich. Sie bietet folgende Funktionen:

- Start/Stop der Zeiterfassung
- Anzeige der aktuellen Laufzeit
- Auswahl der Niederlassung
- Anzeige des aktuellen Status

```jsx
// Beispiel-Implementierung (vereinfacht)
const WorktimeTracker = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [selectedBranch, setSelectedBranch] = useState(null);
  
  // Weitere Implementierung...
};
```

### WorktimeStats

Die `WorktimeStats`-Komponente zeigt Statistiken über die erfassten Arbeitszeiten an:

- Tägliche, wöchentliche und monatliche Übersicht
- Grafische Darstellung der Arbeitszeiten
- Vergleich mit Sollzeiten

### WorktimeModal

Das `WorktimeModal` ermöglicht die Detailansicht und Bearbeitung von Zeiteinträgen:

- Anzeige aller Zeiteinträge für einen bestimmten Tag
- Bearbeitung von Start- und Endzeiten
- Löschen von Zeiteinträgen

### TeamWorktimeControl

Die `TeamWorktimeControl`-Komponente ermöglicht Vorgesetzten, die Arbeitszeiten ihrer Teammitglieder zu verwalten:

- Übersicht über aktive Zeiterfassungen im Team
- Möglichkeit, aktive Zeiterfassungen zu stoppen
- Bearbeitung von Teammitglieder-Zeiteinträgen

## Zeitzonenbehandlung

### KRITISCH: Korrekte Zeitzonenbehandlung

Die korrekte Behandlung von Zeitzonen ist für die Zeiterfassung von entscheidender Bedeutung. Das System verwendet folgende Prinzipien:

1. **Lokale Systemzeit verwenden**:
   - Arbeitszeiten werden IMMER in lokaler Systemzeit gespeichert und verarbeitet
   - NIEMALS Zeitzonenumrechnungen durchführen
   - KEINE UTC-Zeit verwenden oder in UTC umrechnen

2. **Korrekte Datumsformate**:
   - ISO-Strings OHNE 'Z' am Ende verwenden: `YYYY-MM-DDTHH:mm:ss.SSS` (lokale Zeit)
   - NIEMALS das 'Z'-Suffix verwenden, da dies UTC-Zeit erzwingt

3. **Vermeidung von Zeitzonenproblemen**:
   - Bei Date-Objekten Vorsicht walten lassen, da JavaScript automatisch Zeitzonenumrechnungen durchführt
   - Date-Objekte nur dort verwenden, wo unbedingt nötig, ansonsten String-Operationen bevorzugen

### Implementierung der Zeitzonenbehandlung

#### 1. Korrekte Zeitstempel beim Starten der Zeiterfassung

Bei `handleStartTracking` in `WorktimeTracker.tsx`:

```javascript
// KORREKTE IMPLEMENTIERUNG
startTime: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
```

Diese Formel ist KRITISCH und muss exakt so verwendet werden:
- `new Date().getTime()` gibt den aktuellen Zeitstempel in Millisekunden seit dem 01.01.1970 00:00:00 UTC zurück
- `new Date().getTimezoneOffset()` gibt die Differenz in Minuten zwischen lokaler Zeit und UTC zurück
- `* 60000` konvertiert Minuten in Millisekunden
- Die Subtraktion korrigiert den Zeitstempel, sodass er nach der automatischen UTC-Umwandlung korrekt ist

#### 2. Korrekte Zeitstempel beim Beenden der Zeiterfassung

Bei `handleStopTracking` und `handleForceStop` in `WorktimeTracker.tsx`:

```javascript
// KORREKTE IMPLEMENTIERUNG
endTime: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
```

#### 3. Behandlung von ISO-Strings ohne 'Z'

Bei der Verarbeitung von Zeitstempeln aus der API:

```javascript
// KORREKTE IMPLEMENTIERUNG
const startISOString = data.startTime.endsWith('Z') 
    ? data.startTime.substring(0, data.startTime.length - 1)
    : data.startTime;

const startTimeDate = new Date(startISOString);
```

Diese Behandlung ist notwendig, um zu verhindern, dass JavaScript den Zeitstempel als UTC interpretiert.

#### 4. Formatierung von Zeitstempeln für die Anzeige

Für die Anzeige von Zeitstempeln in der Benutzeroberfläche:

```javascript
// KORREKTE IMPLEMENTIERUNG
const formatStartDate = (dateString) => {
    // Entferne das 'Z' am Ende des Strings, damit JS den Zeitstempel nicht als UTC interpretiert
    if (typeof dateString === 'string' && dateString.endsWith('Z')) {
        dateString = dateString.substring(0, dateString.length - 1);
    }
    
    const date = new Date(dateString);
    
    // Tag, Monat und Jahr aus lokaler Zeit extrahieren
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    // Stunden, Minuten und Sekunden aus lokaler Zeit extrahieren
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    // Im deutschen Format zurückgeben
    return `${day}.${month}.${year}, ${hours}:${minutes}:${seconds}`;
};
```

### Häufige Fehler bei der Zeitzonenbehandlung

#### FALSCH: Direkte Verwendung von `new Date().toISOString()`

```javascript
// FALSCH - NICHT VERWENDEN
startTime: new Date().toISOString()
```

Dieses Format fügt automatisch ein 'Z' am Ende hinzu, was die Zeit als UTC kennzeichnet und zu Zeitzonenverschiebungen führt.

#### FALSCH: Verwendung von `new Date()` ohne Zeitzonenkorrektur

```javascript
// FALSCH - NICHT VERWENDEN
startTime: new Date()
```

Dies führt zu Problemen, wenn das Datum in JSON umgewandelt wird, da es automatisch in UTC konvertiert wird.

## API-Endpunkte

Das Zeiterfassungsmodul verwendet folgende API-Endpunkte:

### Zeiterfassung starten

```
POST /api/worktime/start
```

**Request-Body:**
```json
{
  "branchId": 1,
  "startTime": "2023-05-15T08:30:00.000"
}
```

**Response:**
```json
{
  "id": 123,
  "userId": 456,
  "branchId": 1,
  "startTime": "2023-05-15T08:30:00.000",
  "endTime": null,
  "branch": {
    "id": 1,
    "name": "Hauptniederlassung"
  }
}
```

### Zeiterfassung beenden

```
POST /api/worktime/stop
```

**Request-Body:**
```json
{
  "endTime": "2023-05-15T17:30:00.000"
}
```

**Response:**
```json
{
  "id": 123,
  "userId": 456,
  "branchId": 1,
  "startTime": "2023-05-15T08:30:00.000",
  "endTime": "2023-05-15T17:30:00.000",
  "branch": {
    "id": 1,
    "name": "Hauptniederlassung"
  }
}
```

### Aktive Zeiterfassung abrufen

```
GET /api/worktime/active
```

**Response:**
```json
{
  "active": true,
  "id": 123,
  "userId": 456,
  "branchId": 1,
  "startTime": "2023-05-15T08:30:00.000",
  "endTime": null,
  "branch": {
    "id": 1,
    "name": "Hauptniederlassung"
  }
}
```

### Zeiterfassungen für einen bestimmten Tag abrufen

```
GET /api/worktime/day?date=2023-05-15
```

**Response:**
```json
[
  {
    "id": 123,
    "userId": 456,
    "branchId": 1,
    "startTime": "2023-05-15T08:30:00.000",
    "endTime": "2023-05-15T12:00:00.000",
    "branch": {
      "id": 1,
      "name": "Hauptniederlassung"
    }
  },
  {
    "id": 124,
    "userId": 456,
    "branchId": 1,
    "startTime": "2023-05-15T13:00:00.000",
    "endTime": "2023-05-15T17:30:00.000",
    "branch": {
      "id": 1,
      "name": "Hauptniederlassung"
    }
  }
]
```

## Datenmodell

Das Zeiterfassungsmodul verwendet folgendes Datenmodell:

### WorkTime

```prisma
model WorkTime {
  id        Int       @id @default(autoincrement())
  userId    Int
  branchId  Int
  startTime DateTime
  endTime   DateTime?
  user      User      @relation(fields: [userId], references: [id])
  branch    Branch    @relation(fields: [branchId], references: [id])
}
```

## Benutzeroberfläche

### Hauptkomponenten

1. **Zeiterfassungs-Box**:
   - Toggle-Button zum Starten/Stoppen der Zeiterfassung
   - Dropdown zur Auswahl der Niederlassung
   - Anzeige der aktuellen Laufzeit
   - Button zum Öffnen des WorktimeModal

2. **Statistik-Box**:
   - Tägliche, wöchentliche und monatliche Übersicht
   - Grafische Darstellung der Arbeitszeiten

3. **WorktimeModal**:
   - Tabelle mit allen Zeiteinträgen für einen bestimmten Tag
   - Bearbeitungsmöglichkeiten für Start- und Endzeiten
   - Löschfunktion für Zeiteinträge

## Berechtigungen

Für das Zeiterfassungsmodul sind folgende Berechtigungen definiert:

- **worktime** (entityType: 'page'): Grundlegende Berechtigung für die Zeiterfassungsseite
- **worktime_edit** (entityType: 'table'): Berechtigung zum Bearbeiten von Zeiteinträgen
- **team_worktime** (entityType: 'page'): Berechtigung für die Team-Zeiterfassungsseite

Diese Berechtigungen können die folgenden Zugriffsebenen haben:
- **read**: Nur Lesezugriff
- **write**: Schreibzugriff (beinhaltet auch Lesezugriff)
- **both**: Voller Zugriff

## Fehlerbehandlung

Das Zeiterfassungsmodul implementiert folgende Fehlerbehandlungsstrategien:

1. **Validierung**:
   - Überprüfung, ob eine Niederlassung ausgewählt wurde
   - Überprüfung, ob der Benutzer bereits eine aktive Zeiterfassung hat

2. **Fehleranzeige**:
   - Anzeige von Fehlermeldungen in der Benutzeroberfläche
   - Logging von Fehlern in der Konsole

3. **Wiederherstellung**:
   - Automatische Wiederherstellung der Zeiterfassung bei Seitenneuladen
   - Regelmäßige Überprüfung des Zeiterfassungsstatus

---

**WICHTIG**: Die korrekte Zeitzonenbehandlung ist kritisch für die Funktionalität des Zeiterfassungsmoduls. Jede Änderung an der Zeitbehandlung muss sorgfältig geprüft werden, um sicherzustellen, dass keine Zeitzonenprobleme auftreten. 