# WorktimeTracker-Komponente

<!-- CLAUDE-DOC-SECTION: PURPOSE -->
Diese Komponente dient der Arbeitszeiterfassung im Intranet-System. Sie ermöglicht Benutzern, ihre Arbeitszeit zu starten und zu stoppen, zeigt die verstrichene Zeit an und bietet eine Übersicht über aufgezeichnete Zeiten.

Die Komponente ist das Haupt-Interface für die tägliche Zeiterfassung und ist eingebettet in den Worktracker-Bereich der Anwendung.
<!-- /CLAUDE-DOC-SECTION: PURPOSE -->

<!-- CLAUDE-DOC-SECTION: SCHEMA -->
## Datenstruktur

```typescript
// Niederlassungsstruktur
interface Branch {
    id: number;
    name: string;
}

// Arbeitszeitstruktur
interface WorkTime {
    id: number;
    startTime: Date;
    endTime: Date | null;
    branchId: number;
    userId: number;
    organizationId: number | null;  // Organisation, in der die Zeiterfassung gestartet wurde
    branch: {
        id: number;
        name: string;
    };
}

// Komponenten-State
interface ComponentState {
    isTracking: boolean;        // Ob gerade Zeit erfasst wird
    startTime: Date | null;     // Startzeit der aktuellen Sitzung
    elapsedTime: string;        // Verstrichene Zeit als formatierter String
    selectedBranch: number | null; // Ausgewählte Niederlassung ID
    branches: Branch[];         // Verfügbare Niederlassungen
    activeWorktime: WorkTime | null; // Aktive Zeiterfassungssitzung
    isLoading: boolean;         // Ladezustand
    showWorkTimeModal: boolean; // Modal-Anzeigestatus
    statusError: string | null; // Fehlerinformationen
}
```
<!-- /CLAUDE-DOC-SECTION: SCHEMA -->

<!-- CLAUDE-DOC-SECTION: PATTERNS -->
## Verwendungsmuster

### Start der Zeiterfassung
1. Benutzer wählt eine Niederlassung aus dem Dropdown-Menü
2. Benutzer aktiviert den Zeiterfassungs-Toggle oder nutzt die Start-Funktion
3. System zeichnet die Startzeit auf und beginnt mit dem Timer
4. Die verstrichene Zeit wird kontinuierlich aktualisiert

### Stopp der Zeiterfassung
1. Benutzer deaktiviert den Zeiterfassungs-Toggle oder nutzt die Stopp-Funktion
2. System zeichnet die Endzeit auf und stoppt den Timer
3. Die Arbeitszeiterfassung wird als abgeschlossen markiert
4. **Wichtig**: Die `organizationId` wird beim Stoppen NICHT geändert - sie bleibt die der Start-Organisation

### Organisation-Wechsel während aktiver Zeiterfassung
- Wenn ein User während einer laufenden Zeiterfassung die Organisation wechselt:
  - Die `organizationId` der WorkTime bleibt unverändert (gehört zur Start-Organisation)
  - Der User kann die Zeiterfassung trotzdem stoppen (organisationsübergreifend)
  - Das Frontend zeigt eine Warnung an, wenn die aktive WorkTime zu einer anderen Organisation gehört
  - Nach dem Stoppen wird die WorkTime nur in der Start-Organisation angezeigt (nicht in der aktuellen Organisation)

### Anzeige von Arbeitszeiten
1. Benutzer klickt auf den Listenbutton
2. Modal öffnet sich mit einer Übersicht aller aufgezeichneten Zeiten
3. Benutzer kann nach Datum filtern

### Zeitzonenbehandlung
**Wichtig:** Die Komponente sendet lokale Zeiten mit Zeitzonenverschiebung an den Server:
```typescript
new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
```
<!-- /CLAUDE-DOC-SECTION: PATTERNS -->

<!-- CLAUDE-DOC-SECTION: INTERFACES -->
## Schnittstellen

### Props
Die Komponente akzeptiert keine Props.

### Hooks
- `useState`: Für interne Zustandsverwaltung
- `useEffect`: Für Timer-Logik und Datenabhängigkeiten
- `useCallback`: Für memoized Callback-Funktionen
- `useAuth`: Für Benutzerinformationen
- `useWorktime`: Für globalen Zeiterfassungsstatus
- `useBranch`: Für Niederlassungsauswahl
- `useOrganization`: Für aktuelle Organisation (zum Vergleich mit WorkTime-Organisation)

### API-Endpunkte
- `API_ENDPOINTS.WORKTIME.ACTIVE`: Prüfen des aktiven Zeiterfassungsstatus
- `API_ENDPOINTS.WORKTIME.START`: Starten der Zeiterfassung
- `API_ENDPOINTS.WORKTIME.STOP`: Stoppen der Zeiterfassung
- `API_ENDPOINTS.WORKTIME.BRANCHES`: Abrufen der verfügbaren Niederlassungen
<!-- /CLAUDE-DOC-SECTION: INTERFACES -->

<!-- CLAUDE-DOC-SECTION: INVARIANTS -->
## Invarianten

1. Eine Zeiterfassung kann nur mit ausgewählter Niederlassung gestartet werden
2. Ein Benutzer kann nur eine aktive Zeiterfassung gleichzeitig haben
3. Die Niederlassungsauswahl ist während aktiver Zeiterfassung deaktiviert
4. Der Timer läuft nur, wenn `isTracking` wahr ist
5. Die UI-Elemente zur Zeitanzeige werden immer mit einheitlichem Format aktualisiert (HH:MM:SS)
6. Bei neu geladener Komponente wird der Zeiterfassungsstatus immer vom Server abgefragt
7. Bei Verbindungsfehlern hat die lokale Zustandsverwaltung Vorrang, um Benutzererfahrung zu erhalten
<!-- /CLAUDE-DOC-SECTION: INVARIANTS -->

<!-- CLAUDE-DOC-SECTION: ERROR_STATES -->
## Fehler- und Randfalllbehandlung

1. **Keine Niederlassung ausgewählt**
   - Benutzer wird mit Alert benachrichtigt
   - Zeiterfassung wird nicht gestartet

2. **Authentifizierungsfehler**
   - Token nicht vorhanden oder ungültig
   - Benutzer wird zur erneuten Anmeldung aufgefordert

3. **Netzwerkfehler beim Starten/Stoppen**
   - Fehler wird in `statusError` gespeichert
   - Benutzer wird mit Alert benachrichtigt

4. **Fehler bei Statusprüfung**
   - Fehler wird in Konsole protokolliert
   - Zeiterfassungsstatus wird auf "inaktiv" zurückgesetzt

5. **Bestehende aktive Zeiterfassung**
   - Wird beim Laden erkannt
   - Timer wird mit der bereits verstrichenen Zeit fortgesetzt
   - **Warnung bei anderer Organisation**: Wenn die aktive WorkTime zu einer anderen Organisation gehört als die aktive, wird eine gelbe Warnung angezeigt

6. **Ladezustand**
   - Spinner wird angezeigt, während Daten geladen werden
   - Benutzerinteraktion ist während des Ladens blockiert

7. **Organisation-Wechsel während aktiver Zeiterfassung**
   - WorkTime kann weiterhin gestoppt werden (organisationsübergreifend)
   - Frontend zeigt Warnung an: "Diese Zeiterfassung wurde in einer anderen Organisation gestartet"
   - Nach dem Stoppen: WorkTime gehört zur Start-Organisation, wird dort angezeigt
<!-- /CLAUDE-DOC-SECTION: ERROR_STATES -->

## Memory Anchor

<!-- CLAUDE-DOC-SECTION: ANCHOR -->
/* CLAUDE-ANCHOR: a7c238f1-9d6a-42e5-8af1-6d8b2e9a4f18 - WORKTIME_TRACKER_COMPONENT */
<!-- /CLAUDE-DOC-SECTION: ANCHOR -->

## Quellcode

```typescript
const WorktimeTracker: React.FC = () => {
    /* CLAUDE-ANCHOR: a7c238f1-9d6a-42e5-8af1-6d8b2e9a4f18 - WORKTIME_TRACKER_COMPONENT */
    const [isTracking, setIsTracking] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
    const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [activeWorktime, setActiveWorktime] = useState<WorkTime | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showWorkTimeModal, setShowWorkTimeModal] = useState(false);
    const [statusError, setStatusError] = useState<string | null>(null);
    const { user } = useAuth();
    const { updateTrackingStatus } = useWorktime();

    // ... Rest der Implementierung
};
``` 