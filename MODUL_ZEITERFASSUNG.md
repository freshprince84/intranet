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
   - **WICHTIG**: In Formularen und beim Bearbeiten von Zeiteinträgen IMMER direkte String-Manipulation verwenden

4. **Best Practices für die String-Manipulation**:
   - Datum und Zeit direkt aus ISO-Strings extrahieren: `entry.startTime.substring(0, 10)` für Datum und `entry.startTime.substring(11, 16)` für Zeit (HH:MM)
   - Beim Speichern direkt ISO-Strings konstruieren: `${entry.date}T${entry.startTime}:00.000`
   - Bei Validierungen String-Vergleiche statt Date-Objekte verwenden: `entry.startTime < entry.endTime`
   - Bei der Anzeige von Zeiten direktes String-Parsing verwenden

5. **Vermeidung des `new Date()`-Konstruktors**:
   - Der `new Date()`-Konstruktor kann Zeitzonenverschiebungen verursachen
   - Besonders problematisch bei String-Zeitwerten, die OHNE Zeitzoneninfo übergeben werden
   - Beim Bearbeiten von Zeiteinträgen in Formularen NIEMALS `new Date()` für Eingabewerte verwenden

### Implementierung der Zeitzonenbehandlung

#### 1. Korrekte Zeitstempel beim Starten der Zeiterfassung

Bei `handleStartTracking` in `WorktimeTracker.tsx`:

```javascript
// KORREKTE IMPLEMENTIERUNG
startTime: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
```

#### 2. Verarbeitung von Zeiteinträgen im EditWorktimeModal

Bei der Bearbeitung von Zeiteinträgen ist die korrekte Zeitzonenbehandlung besonders wichtig:

```typescript
// FALSCH: Erzeugt Zeitzonenverschiebungen
const formattedStartTime = format(new Date(entry.startTime), 'HH:mm');
const formattedEndTime = entry.endTime ? format(new Date(entry.endTime), 'HH:mm') : '';

// RICHTIG: Direkte String-Manipulation verwenden
const formattedStartTime = entry.startTime.substring(11, 16); // Extrahiert HH:mm aus ISO-String
const formattedEndTime = entry.endTime ? entry.endTime.substring(11, 16) : '';
```

#### 3. Validierung von Zeiteinträgen

Bei der Validierung von Zeiteinträgen sollten String-Vergleiche statt Date-Objekte verwendet werden:

```typescript
// FALSCH: Umwandlung in Date-Objekte verursacht Zeitzonenprobleme
const startDate = new Date(`${entry.date}T${entry.startTime}`);
const endDate = new Date(`${entry.date}T${entry.endTime}`);
if (startDate >= endDate) {
  errors.push('Die Startzeit muss vor der Endzeit liegen');
}

// RICHTIG: String-Vergleiche verwenden
if (entry.startTime >= entry.endTime) {
  errors.push('Die Startzeit muss vor der Endzeit liegen');
}
```

#### 4. Formatierung beim Speichern

Beim Speichern von bearbeiteten Zeiteinträgen:

```typescript
// FALSCH: Umwandlung in Date-Objekte
const startTime = new Date(`${entry.date}T${entry.startTime}`).toISOString();

// RICHTIG: Direkte String-Konstruktion
const startTime = `${entry.date}T${entry.startTime}:00.000`;
```

### Häufige Probleme und Lösungen

#### Problem: Zeitverschiebung bei `new Date()`

JavaScript interpretiert Datumsstrings ohne Zeitzonenangabe als UTC, was zu Verschiebungen führen kann:

```javascript
// Beispiel: "2023-05-01T08:00" wird in der lokalen Zeitzone interpretiert
const date = new Date("2023-05-01T08:00");
console.log(date.getHours()); // Könnte 6 oder 10 sein, je nach Zeitzone!
```

#### Lösung: Direkte String-Manipulation

```javascript
// Zeitwerte als Strings handhaben
const dateStr = "2023-05-01";
const timeStr = "08:00";

// Zur Anzeige:
const displayTime = timeStr; // "08:00"

// Zur Speicherung:
const isoString = `${dateStr}T${timeStr}:00.000`;
```

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