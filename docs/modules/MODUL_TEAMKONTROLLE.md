# MODUL TEAMKONTROLLE

Dieses Dokument beschreibt die Implementierung und Funktionsweise des Team-Worktime-Control-Moduls im Intranet-Projekt. Dieses Modul ermöglicht Teamleitern und Administratoren, die Arbeitszeiten der Teammitglieder zu überwachen und zu verwalten.

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

Das Team-Worktime-Control-Modul ist ein leistungsstarkes Werkzeug für Teamleiter und Administratoren, um die Arbeitszeiten der Teammitglieder in Echtzeit zu überwachen und zu verwalten. Es bietet folgende Hauptfunktionen:

- Echtzeit-Überwachung aktiver Zeiterfassungen
- Beenden laufender Zeiterfassungen im Namen von Teammitgliedern
- Anzeige von Zeitstatistiken pro Benutzer und Team
- Filterung nach Niederlassungen, Zeiträumen und Benutzern
- Export von Arbeitszeitdaten
- Integration mit dem Lohnabrechnungssystem

Das Modul ist eng mit dem Zeiterfassungsmodul verbunden und verwendet dasselbe Datenmodell, implementiert jedoch zusätzliche Sicherheitsmaßnahmen zur Gewährleistung der korrekten Berechtigungen.

## Komponenten

### TeamWorktimeControl

Die Hauptkomponente `TeamWorktimeControl` bildet den Einstiegspunkt für das Modul:

```typescript
// Vereinfachtes Beispiel
const TeamWorktimeControl: React.FC = () => {
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: new Date(), endDate: new Date() });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUserWorktime[]>([]);
  
  // Abruf der aktiven Benutzer mit aktiver Zeiterfassung
  useEffect(() => {
    const fetchActiveUsers = async () => {
      try {
        const response = await axiosInstance.get(API_ENDPOINTS.WORKTIME.ACTIVE_USERS);
        setActiveUsers(response.data);
      } catch (error) {
        console.error('Fehler beim Abrufen aktiver Benutzer:', error);
      }
    };
    
    fetchActiveUsers();
    
    // Pollingintervall für aktive Benutzer (alle 30 Sekunden)
    const interval = setInterval(fetchActiveUsers, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-semibold mb-6">Team-Zeiterfassung</h1>
      
      <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold flex items-center mb-4">
          <UsersIcon className="h-6 w-6 mr-2" />
          Aktive Zeiterfassungen
        </h2>
        
        <ActiveUsersTable 
          users={activeUsers} 
          onStopUserWorktime={stopUserWorktime} 
        />
      </div>
      
      <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold flex items-center mb-4">
          <ChartBarIcon className="h-6 w-6 mr-2" />
          Zeitstatistiken
        </h2>
        
        <div className="mb-4">
          <FilterControls 
            selectedBranch={selectedBranch}
            onBranchChange={setSelectedBranch}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            selectedUser={selectedUser}
            onUserChange={setSelectedUser}
          />
        </div>
        
        <WorktimeStatistics 
          branch={selectedBranch}
          dateRange={dateRange}
          user={selectedUser}
        />
      </div>
    </div>
  );
};
```

### ActiveUsersTable

Diese Komponente zeigt die aktiven Zeiterfassungen aller Teammitglieder an:

```typescript
// Vereinfachtes Beispiel
interface ActiveUserWorktime {
  id: number;
  userId: number;
  user: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  branchId: number;
  branch: {
    id: number;
    name: string;
  };
  startTime: string;
  elapsedTime: string;
}

const ActiveUsersTable: React.FC<{
  users: ActiveUserWorktime[];
  onStopUserWorktime: (id: number) => Promise<void>;
}> = ({ users, onStopUserWorktime }) => {
  if (users.length === 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400 p-4">
        Derzeit sind keine Benutzer aktiv.
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Benutzer
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Niederlassung
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Startzeit
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Laufzeit
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Aktionen
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
          {users.map((worktime) => (
            <tr key={worktime.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {worktime.user.firstName} {worktime.user.lastName}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {worktime.branch.name}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDateTime(worktime.startTime)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {worktime.elapsedTime}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  onClick={() => onStopUserWorktime(worktime.id)}
                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                >
                  Stoppen
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### EditWorktimeModal

Die `EditWorktimeModal`-Komponente ermöglicht Administratoren und Teamleitern, die Zeiterfassungen der Teammitglieder zu bearbeiten. Dabei ist besonders auf die korrekte Zeitzonenbehandlung zu achten:

```typescript
interface EditWorktimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEntries: WorktimeEntry[], deletedEntryIds: string[]) => Promise<void>;
  userName: string;
  entries: WorktimeEntry[];
  selectedDate: string;
}

const EditWorktimeModal: React.FC<EditWorktimeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  userName,
  entries,
  selectedDate
}) => {
  // State-Management für die bearbeiteten Einträge
  const [editedEntries, setEditedEntries] = useState<WorktimeEntryForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  
  // Initialisierung der bearbeitbaren Einträge
  useEffect(() => {
    if (entries && entries.length > 0) {
      // WICHTIG: Direkte String-Manipulation statt Date-Objekte verwenden,
      // um Zeitzonenprobleme zu vermeiden
      const formattedEntries = entries.map(entry => ({
        id: entry.id,
        userId: entry.userId,
        date: entry.startTime.substring(0, 10), // YYYY-MM-DD extrahieren
        startTime: entry.startTime.substring(11, 16), // HH:MM extrahieren
        endTime: entry.endTime ? entry.endTime.substring(11, 16) : '', // HH:MM extrahieren oder leerer String
        comment: entry.comment || '',
        isModified: false,
        markedForDeletion: false
      }));
      
      setEditedEntries(formattedEntries);
    }
  }, [entries]);
```

#### Wichtige Aspekte der Zeitzonenbehandlung im EditWorktimeModal

Bei der Implementierung und Wartung des EditWorktimeModal müssen folgende Punkte beachtet werden:

1. **Format der gesendeten Zeitstrings**: 
   - Das Modal erzeugt Zeitstrings im Format `YYYY-MM-DDTHH:MM:SS:00`
   - Dieses spezielle Format mit einem zusätzlichen `:00` am Ende kann zu Problemen bei der Backend-Verarbeitung führen

2. **Robuste Backend-Verarbeitung**:
   - Das Backend muss in der Lage sein, dieses spezielle Format zu verarbeiten
   - Die `updateWorktime`-Funktion im Backend sollte eine Bereinigung und Normalisierung der Zeitstrings durchführen
   - Die direkte Verwendung von `new Date(startTime)` sollte vermieden werden, wenn die Zeitstrings ein ungewöhnliches Format haben könnten

3. **Implementierungsdetails für robuste Datumsverarbeitung im Backend**:

```typescript
// Beispiel für robuste Datumsverarbeitung
const safeDateParse = (dateString: string | null) => {
  if (!dateString) return null;
  
  try {
    // Bereinige zuerst das Eingabeformat - entferne ein möglicherweise zusätzliches ":00" am Ende
    let cleanDateString = dateString;
    if (dateString.match(/T\d{2}:\d{2}:\d{2}:\d{2}$/)) {
      // Format ist YYYY-MM-DDTHH:MM:SS:00 - entferne das letzte :00
      cleanDateString = dateString.substring(0, dateString.lastIndexOf(':'));
      console.log(`Bereinigter Datumsstring: ${cleanDateString}`);
    }
    
    // Verarbeite den bereinigten String
    // Extrahiere die einzelnen Datumskomponenten
    const [datePart, timePart] = cleanDateString.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);
    
    // Erstelle ein Date-Objekt mit UTC, um Zeitzonenprobleme zu vermeiden
    return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  } catch (error) {
    console.error(`Fehler beim Parsen des Datums: ${error}`);
    return null;
  }
};
```

4. **Typische Fehler und Lösungen**:
   - **Problem**: 500 Internal Server Error bei `updateWorktime` API-Aufrufen
   - **Ursache**: JavaScript kann das spezielle Format nicht als gültiges Datum parsen
   - **Lösung**: 
     - Bereinigung der Zeitstrings vor der Verarbeitung
     - Explizite Validierung und Fehlerbehandlung
     - Logging der empfangenen und verarbeiteten Werte für die Fehlerdiagnose

5. **Nach Codeänderungen kompilieren und bereitstellen**:
   - Nach Änderungen am Backend-Code muss `npm run build` ausgeführt werden
   - Der Server muss neu gestartet werden, damit die Änderungen wirksam werden

Diese Aspekte sind entscheidend für die korrekte Funktion des EditWorktimeModal und helfen, häufige Probleme bei der Zeitzonenbehandlung zu vermeiden.

### Erweitertes Filtersystem

Die Workcenter-Tabelle nutzt das erweiterte Filtersystem, um Benutzern das schnelle Filtern und Speichern komplexer Filterbedingungen zu ermöglichen. Die Implementierung besteht aus mehreren Komponenten:

#### 1. Komponenten

- **FilterPane**: Ermöglicht das Erstellen und Bearbeiten von Filterbedingungen
- **FilterRow**: Repräsentiert eine einzelne Filterbedingung
- **SavedFilterTags**: Zeigt gespeicherte Filter als Tags an und ermöglicht die schnelle Auswahl

#### 2. Integration in ActiveUsersList

Die FilterPane und SavedFilterTags wurden in die ActiveUsersList-Komponente integriert:

```typescript
// Schlüsselkomponenten für das Filtersystem in der ActiveUsersList
const WORKCENTER_TABLE_ID = 'workcenter-table'; // Eindeutige ID für die Tabelle

// State für Filter-Bedingungen
const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);

// Render der Komponenten
return (
  <>
    {/* Filterpanel wird angezeigt, wenn isFilterOpen true ist */}
    {isFilterOpen && (
      <FilterPane
        columns={[
          { id: 'name', label: 'Name' },
          { id: 'branch', label: 'Niederlassung' },
          { id: 'hasActiveWorktime', label: 'Aktive Zeiterfassung' },
          { id: 'duration', label: 'Arbeitszeit (Stunden)' }
        ]}
        onApply={applyFilterConditions}
        onReset={resetFilterConditions}
        savedConditions={filterConditions}
        savedOperators={filterLogicalOperators}
        tableId={WORKCENTER_TABLE_ID}
      />
    )}
    
    {/* Gespeicherte Filter als Tags anzeigen */}
    <SavedFilterTags
      tableId={WORKCENTER_TABLE_ID}
      onSelectFilter={applyFilterConditions}
      onReset={resetFilterConditions}
      defaultFilterName="Aktive"
    />
  </>
);
```

#### 3. Standardfilter

Für die Workcenter-Tabelle wurden zwei Standardfilter implementiert, die nicht gelöscht werden können:

- **"Aktive"**: Zeigt nur Benutzer mit aktiver Zeiterfassung
- **"Alle"**: Zeigt alle Benutzer ohne Filter

Diese werden automatisch beim ersten Laden erstellt, falls sie noch nicht existieren:

```typescript
// Standardfilter erstellen
useEffect(() => {
  const createStandardFilters = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('Nicht authentifiziert');
        return;
      }

      // Prüfen, ob die Standard-Filter bereits existieren
      const existingFiltersResponse = await axios.get(
        `${API_URL}${API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(WORKCENTER_TABLE_ID)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const existingFilters = existingFiltersResponse.data || [];
      const aktiveFilterExists = existingFilters.some(filter => filter.name === 'Aktive');
      const alleFilterExists = existingFilters.some(filter => filter.name === 'Alle');

      // Erstelle "Aktive"-Filter, wenn er noch nicht existiert
      if (!aktiveFilterExists) {
        const aktiveFilter = {
          tableId: WORKCENTER_TABLE_ID,
          name: 'Aktive',
          conditions: [
            { column: 'hasActiveWorktime', operator: 'equals', value: 'true' }
          ],
          operators: []
        };

        await axios.post(
          `${API_URL}${API_ENDPOINTS.SAVED_FILTERS.BASE}`,
          aktiveFilter,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      // Erstelle "Alle"-Filter, wenn er noch nicht existiert
      if (!alleFilterExists) {
        const alleFilter = {
          tableId: WORKCENTER_TABLE_ID,
          name: 'Alle',
          conditions: [],
          operators: []
        };

        await axios.post(
          `${API_URL}${API_ENDPOINTS.SAVED_FILTERS.BASE}`,
          alleFilter,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }
    } catch (error) {
      console.error('Fehler beim Erstellen der Standard-Filter:', error);
    }
  };

  createStandardFilters();
}, []);
```

#### 4. Filter-Logik

Die `filteredAndSortedUsers`-Funktion wurde erweitert, um sowohl die einfache Suche als auch die komplexen Filterbedingungen zu unterstützen:

```typescript
// Filtern basierend auf Filterbedingungen
if (filterConditions.length > 0) {
  // Implementiere die logische Verknüpfung der Bedingungen (UND/ODER)
  let result = filterConditions.length > 0;
  
  for (let i = 0; i < filterConditions.length; i++) {
    const condition = filterConditions[i];
    let conditionMet = false;
    
    switch (condition.column) {
      case 'name':
        // Name-Filter-Logik
        break;
      
      case 'branch':
        // Branch-Filter-Logik
        break;
      
      case 'hasActiveWorktime':
        // Active-Worktime-Filter-Logik
        break;
        
      case 'duration':
        // Duration-Filter-Logik
        break;
    }
    
    // Verknüpfe das Ergebnis dieser Bedingung mit dem Gesamtergebnis
    if (i === 0) {
      result = conditionMet;
    } else {
      const operator = filterLogicalOperators[i - 1];
      result = operator === 'AND' ? (result && conditionMet) : (result || conditionMet);
    }
  }
  
  if (!result) return false;
}
```

Das erweiterte Filtersystem macht die Workcenter-Ansicht deutlich leistungsfähiger und erlaubt den Benutzern, komplexe Filterszenarien zu speichern und wiederzuverwenden.

### FilterControls

Diese Komponente bietet die Filtersteuerung für die ActiveUsersList:

```typescript
export const FilterControls: React.FC<FilterControlsProps> = ({
  branches,
  selectedDate,
  onDateChange,
  selectedBranch,
  onBranchChange,
  onFilterClear
}) => {
  // ...
}
```

- Ermöglicht das Filtern nach Niederlassung und Datum
- Stellt eine Schnittstelle zum Zurücksetzen der Filter bereit
- Kommuniziert mit der übergeordneten ActiveUsersList-Komponente

### Suchfeld und erweitertes Filtersystem

Das Workcenter verfügt über ein standardisiertes Suchfeld und erweitertes Filtersystem, das optimal in die Komponente integriert ist:

```typescript
<input
  type="text"
  className="w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
  placeholder="Suchen..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>
```

#### Funktionsweise des Suchfelds

Das Suchfeld im Workcenter:
- Sucht gleichzeitig in Benutzernamn, Vor- und Nachnamen und Niederlassungsnamen
- Aktualisiert Ergebnisse in Echtzeit bei jeder Eingabe
- Verwendet ein einheitliches Design gemäß der DESIGN_STANDARDS.md
- Bietet Dark-Mode-Unterstützung für optimale Lesbarkeit in allen Umgebungen
- Hat eine feste Breite von 200px für konsistentes Layout
- Skaliert sich auf mobilen Geräten

#### Integration mit dem erweiterten Filtersystem

Die Suchfunktion arbeitet nahtlos mit dem erweiterten Filtersystem zusammen:
- Das Suchfeld führt eine globale Suche durch, während das erweiterte Filtersystem präzisere Bedingungen ermöglicht
- Beide Filtermethoden können kombiniert werden
- Die Standardfilter "Aktive" und "Alle" werden als Tags über der Tabelle angezeigt
- Benutzerdefinierte Filter können neben den Standardfiltern erstellt und gespeichert werden

#### Filterlogik

```typescript
// Globale Suchfunktion
let filtered = grouped.filter((group: WorktimeGroup) => {
  const fullName = `${group.user.firstName} ${group.user.lastName}`.toLowerCase();
  const username = group.user.username.toLowerCase();
  const branch = group.branch.name.toLowerCase();
  const searchTermLower = searchTerm.toLowerCase();
  
  // Prüfe, ob der Suchbegriff in irgendeinem relevanten Feld vorhanden ist
  if (searchTerm && !(
    fullName.includes(searchTermLower) || 
    username.includes(searchTermLower) || 
    branch.includes(searchTermLower)
  )) {
    return false;
  }
  
  // Weitere Filterlogik...
});
```

### EditWorktimeModal

### WorktimeStatistics

Diese Komponente zeigt Arbeitszeitstatistiken für ein Team oder einen einzelnen Benutzer an:

```typescript
// Vereinfachtes Beispiel
const WorktimeStatistics: React.FC<{
  branch: Branch | null;
  dateRange: DateRange;
  user: User | null;
}> = ({ branch, dateRange, user }) => {
  const [statistics, setStatistics] = useState<WorktimeStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchStatistics = async () => {
      setLoading(true);
      try {
        const params = {
          startDate: formatDate(dateRange.startDate),
          endDate: formatDate(dateRange.endDate),
          branchId: branch?.id,
          userId: user?.id
        };
        
        const response = await axiosInstance.get(API_ENDPOINTS.WORKTIME.STATISTICS, { params });
        setStatistics(response.data);
      } catch (error) {
        console.error('Fehler beim Abrufen der Statistiken:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatistics();
  }, [branch, dateRange, user]);
  
  if (loading) return <LoadingSpinner />;
  if (!statistics) return null;
  
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Gesamtstunden"
          value={`${statistics.totalHours.toFixed(2)} h`}
          icon={<ClockIcon className="h-6 w-6 text-blue-500" />}
        />
        <StatCard
          title="Durchschnitt/Tag"
          value={`${statistics.averageHoursPerDay.toFixed(2)} h`}
          icon={<ChartBarIcon className="h-6 w-6 text-green-500" />}
        />
        <StatCard
          title="Aktive Benutzer"
          value={statistics.activeUserCount.toString()}
          icon={<UsersIcon className="h-6 w-6 text-purple-500" />}
        />
      </div>
      
      {/* Weitere Statistiken und Grafiken hier */}
      
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-3">Arbeitszeitverlauf</h3>
        <WorktimeChart data={statistics.dailyHours} />
      </div>
    </div>
  );
};
```

### Die stopUserWorktime-Funktion

Diese Funktion ermöglicht es Teamleitern, die Zeiterfassung eines Teammitglieds zu beenden:

```typescript
// WICHTIG: Diese Funktion verwendet die korrekte Zeitzonenbehandlung
const stopUserWorktime = async (worktimeId: number) => {
  try {
    await axiosInstance.post(
      `${API_ENDPOINTS.WORKTIME.STOP_USER}/${worktimeId}`,
      {
        endTime: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
      }
    );
    
    // Aktualisiere die Liste der aktiven Benutzer
    fetchActiveUsers();
    
    toast({
      title: "Zeiterfassung beendet",
      description: "Die Zeiterfassung wurde erfolgreich beendet.",
      status: "success"
    });
  } catch (error) {
    console.error('Fehler beim Beenden der Zeiterfassung:', error);
    toast({
      title: "Fehler",
      description: "Die Zeiterfassung konnte nicht beendet werden.",
      status: "error"
    });
  }
};
```

## Zeitzonenbehandlung

Die korrekte Behandlung von Zeitzonen ist für die Team-Worktime-Control von entscheidender Bedeutung. Es gelten dieselben Prinzipien wie im Zeiterfassungsmodul:

### KRITISCH: Korrekte Zeitstempel beim Beenden der Zeiterfassung

Bei `stopUserWorktime` in `TeamWorktimeControl.tsx`:

```javascript
// KORREKTE IMPLEMENTIERUNG
endTime: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
```

Diese Formel ist KRITISCH und muss exakt so verwendet werden, damit die lokale Zeit des Administrators korrekt in der Datenbank gespeichert wird, ohne Zeitzonenverschiebungen.

Weitere Details zur Zeitzonenbehandlung findest du im Dokument [MODUL_ZEITERFASSUNG.md](MODUL_ZEITERFASSUNG.md).

## API-Endpunkte

Das Team-Worktime-Control-Modul verwendet folgende API-Endpunkte:

### Aktive Benutzer abrufen

```
GET /api/worktime/active-users
```

**Response:**
```json
[
  {
    "id": 123,
    "userId": 456,
    "user": {
      "id": 456,
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe"
    },
    "branchId": 1,
    "branch": {
      "id": 1,
      "name": "Hauptniederlassung"
    },
    "startTime": "2023-05-15T08:30:00.000",
    "elapsedTime": "02:45:12"
  },
  // Weitere aktive Benutzer...
]
```

### Benutzer-Zeiterfassung beenden

```
POST /api/worktime/stop-user/:id
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
  },
  "user": {
    "id": 456,
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Arbeitszeitstatistiken abrufen

```
GET /api/worktime/statistics
```

**Query-Parameter:**
- `startDate`: Startdatum für den Zeitraum (Format: YYYY-MM-DD)
- `endDate`: Enddatum für den Zeitraum (Format: YYYY-MM-DD)
- `branchId`: (optional) ID der Niederlassung
- `userId`: (optional) ID des Benutzers

**Response:**
```json
{
  "totalHours": 160.5,
  "averageHoursPerDay": 8.025,
  "activeUserCount": 12,
  "dailyHours": [
    { "date": "2023-05-01", "hours": 8.5 },
    { "date": "2023-05-02", "hours": 7.75 },
    // Weitere Tage...
  ],
  "userSummaries": [
    {
      "userId": 456,
      "firstName": "John",
      "lastName": "Doe",
      "totalHours": 42.5
    },
    // Weitere Benutzer...
  ]
}
```

### Arbeitszeitdaten exportieren

```
GET /api/worktime/export
```

**Query-Parameter:**
- `startDate`: Startdatum für den Zeitraum (Format: YYYY-MM-DD)
- `endDate`: Enddatum für den Zeitraum (Format: YYYY-MM-DD)
- `branchId`: (optional) ID der Niederlassung
- `userId`: (optional) ID des Benutzers
- `format`: Format des Exports (z.B. "csv", "excel")

**Response:** 
Eine Datei zum Download im angeforderten Format.

## Datenmodell

Das Team-Worktime-Control-Modul verwendet dasselbe Datenmodell wie das Zeiterfassungsmodul:

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

Es werden keine zusätzlichen Tabellen benötigt, da die Berechtigungen über das bestehende Berechtigungssystem verwaltet werden.

## Benutzeroberfläche

Die Team-Worktime-Control-Benutzeroberfläche besteht aus zwei Hauptabschnitten:

### 1. Aktive Zeiterfassungen

Dieser Abschnitt zeigt eine Tabelle mit allen aktuell aktiven Zeiterfassungen im Team. Für jede Zeiterfassung werden folgende Informationen angezeigt:
- Name des Benutzers
- Niederlassung
- Startzeit
- Laufzeit
- Button zum Beenden der Zeiterfassung

Die Tabelle wird alle 30 Sekunden automatisch aktualisiert, um den aktuellen Status zu zeigen.

### 2. Arbeitszeitstatistiken

Dieser Abschnitt zeigt Statistiken über die Arbeitszeiten im Team. Er enthält:
- Filter für Zeitraum, Niederlassung und Benutzer
- Zusammenfassungskarten mit wichtigen Kennzahlen
- Grafische Darstellung der Arbeitszeiten
- Detaillierte Arbeitszeitauflistung
- Export-Funktionalität

## Berechtigungen

Für das Team-Worktime-Control-Modul sind folgende Berechtigungen definiert:

- **team_worktime_control** (entityType: 'page'): Grundlegende Berechtigung für die Team-Worktime-Control-Seite
- **team_worktime** (entityType: 'table'): Berechtigung zum Anzeigen und Verwalten von Team-Arbeitszeiten

Diese Berechtigungen können die folgenden Zugriffsebenen haben:
- **read**: Nur Lesezugriff (kann Statistiken sehen, aber keine Zeiterfassungen beenden)
- **write**: Schreibzugriff (kann Zeiterfassungen beenden)
- **both**: Voller Zugriff

Beispiel für die Implementierung der Berechtigungsprüfung:

```typescript
// Im Frontend
const { hasPermission } = usePermissions();

// Prüfen, ob der Benutzer Zeiterfassungen beenden darf
const canStopWorktimes = hasPermission('team_worktime', 'write', 'table');

// Bedingte Anzeige des Stop-Buttons
{canStopWorktimes && (
  <button
    onClick={() => stopUserWorktime(worktime.id)}
    className="text-red-600 hover:text-red-900"
  >
    Stoppen
  </button>
)}
```

## Fehlerbehandlung

Das Team-Worktime-Control-Modul implementiert folgende Fehlerbehandlungsstrategien:

1. **Berechtigungsprüfung**: 
   - Überprüfung, ob der Benutzer die erforderlichen Berechtigungen hat
   - Verstecken von Aktionen, für die der Benutzer keine Berechtigung hat
   - Server-seitige Validierung der Berechtigungen

2. **Fehleranzeige**:
   - Anzeige von Fehlermeldungen bei API-Fehlern
   - Anzeige von Erfolgsmeldungen nach erfolgreichen Aktionen

3. **Ausfallsicherheit**:
   - Polling-Mechanismus, der automatisch neu versucht, Daten abzurufen
   - Fehlerbehandlung für abgebrochene Netzwerkanfragen

Beispiel für die Fehlerbehandlung:

```typescript
try {
  await axiosInstance.post(
    `${API_ENDPOINTS.WORKTIME.STOP_USER}/${worktimeId}`,
    { endTime: ... }
  );
  
  toast({
    title: "Zeiterfassung beendet",
    description: "Die Zeiterfassung wurde erfolgreich beendet.",
    status: "success"
  });
} catch (error) {
  console.error('Fehler beim Beenden der Zeiterfassung:', error);
  
  // Unterscheidung zwischen verschiedenen Fehlertypen
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403) {
      toast({
        title: "Keine Berechtigung",
        description: "Sie haben keine Berechtigung, diese Aktion durchzuführen.",
        status: "error"
      });
    } else {
      toast({
        title: "Fehler",
        description: "Die Zeiterfassung konnte nicht beendet werden.",
        status: "error"
      });
    }
  } else {
    toast({
      title: "Fehler",
      description: "Ein unerwarteter Fehler ist aufgetreten.",
      status: "error"
    });
  }
}
```

---

Die Team-Worktime-Control ist ein wichtiges Werkzeug für Teamleiter, um die Arbeitszeiten ihres Teams zu überwachen und zu verwalten. Die korrekte Implementierung der Zeitzonenbehandlung und Berechtigungsprüfung ist entscheidend für die Genauigkeit und Sicherheit des Systems. 