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
    } else {
      // Leeren Eintrag für neues Datum erstellen
      setEditedEntries([{
        id: '',
        userId: entries[0]?.userId || '',
        date: selectedDate,
        startTime: '',
        endTime: '',
        comment: '',
        isModified: true,
        markedForDeletion: false
      }]);
    }
  }, [entries, selectedDate]);
  
  // Validierung der Einträge
  const validateEntries = (entries: WorktimeEntryForm[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    // Prüfung auf fehlende Pflichtfelder
    entries.forEach((entry, index) => {
      if (!entry.markedForDeletion) {
        if (!entry.startTime) {
          errors.push({
            index,
            message: 'Startzeit ist erforderlich'
          });
        }
        
        if (entry.startTime && entry.endTime && entry.startTime >= entry.endTime) {
          errors.push({
            index,
            message: 'Startzeit muss vor Endzeit liegen'
          });
        }
      }
    });
    
    // Prüfung auf überlappende Zeiträume
    // WICHTIG: String-Vergleiche verwenden statt Date-Objekte
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.markedForDeletion || !entry.startTime || !entry.endTime) continue;
      
      for (let j = i + 1; j < entries.length; j++) {
        const otherEntry = entries[j];
        if (otherEntry.markedForDeletion || !otherEntry.startTime || !otherEntry.endTime) continue;
        
        // Überlappungsprüfung
        if (!(entry.endTime <= otherEntry.startTime || entry.startTime >= otherEntry.endTime)) {
          errors.push({
            index: i,
            message: `Zeitüberschneidung mit Eintrag #${j + 1}`
          });
        }
      }
    }
    
    setValidationErrors(errors);
    return errors;
  };
  
  // Handler für das Speichern der Änderungen
  const handleSave = () => {
    const errors = validateEntries(editedEntries);
    
    if (errors.length > 0) {
      return; // Speichern abbrechen, wenn Validierungsfehler vorliegen
    }
    
    // WICHTIG: Nur geänderte Einträge an das Backend senden
    const updatedEntries = editedEntries
      .filter(entry => entry.isModified && !entry.markedForDeletion)
      .map(entry => ({
        id: entry.id,
        userId: entry.userId,
        // ISO-String direkt aus den Formularwerten konstruieren
        startTime: `${entry.date}T${entry.startTime}:00.000Z`,
        endTime: entry.endTime ? `${entry.date}T${entry.endTime}:00.000Z` : null,
        comment: entry.comment || null
      }));
    
    const deletedEntryIds = editedEntries
      .filter(entry => entry.markedForDeletion && entry.id)
      .map(entry => entry.id);
    
    onSave(updatedEntries, deletedEntryIds);
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Zeiterfassung bearbeiten: {userName}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {error && (
            <Alert status="error" mb={4}>
              <AlertIcon />
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">Zeiteinträge für {selectedDate}</h3>
            
            {editedEntries.map((entry, index) => (
              <div 
                key={index} 
                className={`p-3 mb-2 border rounded ${
                  entry.markedForDeletion ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                } ${
                  validationErrors.some(error => error.index === index) ? 'border-red-500' : ''
                }`}
              >
                {!entry.markedForDeletion ? (
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-4">
                      <label className="block text-sm mb-1">Startzeit</label>
                      <input
                        type="time"
                        value={entry.startTime}
                        onChange={(e) => {
                          const updatedEntries = [...editedEntries];
                          updatedEntries[index] = {
                            ...entry,
                            startTime: e.target.value,
                            isModified: true
                          };
                          setEditedEntries(updatedEntries);
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-sm mb-1">Endzeit</label>
                      <input
                        type="time"
                        value={entry.endTime}
                        onChange={(e) => {
                          const updatedEntries = [...editedEntries];
                          updatedEntries[index] = {
                            ...entry, 
                            endTime: e.target.value,
                            isModified: true
                          };
                          setEditedEntries(updatedEntries);
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-sm mb-1">Kommentar</label>
                      <input
                        type="text"
                        value={entry.comment}
                        onChange={(e) => {
                          const updatedEntries = [...editedEntries];
                          updatedEntries[index] = {
                            ...entry,
                            comment: e.target.value,
                            isModified: true
                          };
                          setEditedEntries(updatedEntries);
                        }}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-red-500">Dieser Eintrag wird gelöscht.</p>
                )}
                
                {validationErrors.filter(error => error.index === index).map((error, i) => (
                  <p key={i} className="text-red-500 text-sm mt-1">{error.message}</p>
                ))}
                
                <div className="mt-2 flex justify-end">
                  {!entry.markedForDeletion ? (
                    <button
                      onClick={() => {
                        const updatedEntries = [...editedEntries];
                        updatedEntries[index] = { ...entry, markedForDeletion: true };
                        setEditedEntries(updatedEntries);
                      }}
                      className="text-red-500 text-sm hover:text-red-700"
                    >
                      Löschen
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const updatedEntries = [...editedEntries];
                        updatedEntries[index] = { ...entry, markedForDeletion: false };
                        setEditedEntries(updatedEntries);
                      }}
                      className="text-blue-500 text-sm hover:text-blue-700"
                    >
                      Wiederherstellen
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            <button
              onClick={() => {
                setEditedEntries([
                  ...editedEntries,
                  {
                    id: '',
                    userId: editedEntries[0]?.userId || '',
                    date: selectedDate,
                    startTime: '',
                    endTime: '',
                    comment: '',
                    isModified: true,
                    markedForDeletion: false
                  }
                ]);
              }}
              className="mt-2 text-blue-500 hover:text-blue-700"
            >
              + Neuen Eintrag hinzufügen
            </button>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose} mr={3}>Abbrechen</Button>
          <Button 
            colorScheme="blue" 
            onClick={handleSave}
            isLoading={loading}
          >
            Speichern
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
```

### Integration des Edit-Buttons im Workcenter

Im Workcenter werden sowohl der Stop-Button für aktive Zeiterfassungen als auch der Edit-Button für allgemeine Zeitbearbeitungen implementiert. Die korrekte Integration in der `ActiveUsersList`-Komponente sieht wie folgt aus:

```typescript
// In ActiveUsersList.tsx
const ActiveUsersList: React.FC<ActiveUsersListProps> = ({ 
  groups, 
  onStopWorktime, 
  isLoading,
  onOpenEditModal 
}) => {
  // State und Handler für die Komponente
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        {/* Tabellenkopf */}
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {/* ... Andere Spaltenköpfe ... */}
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Aktionen</span>
            </th>
          </tr>
        </thead>
        
        {/* Tabelleninhalt */}
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
          {groups.map((group) => (
            <tr key={group.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              {/* ... Andere Zellen ... */}
              
              {/* Aktionsspalte mit Stop- und Edit-Button */}
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex flex-row space-x-2 justify-end items-center">
                  {/* Stop-Button für aktive Zeiterfassungen */}
                  {group.hasActiveWorktime && (
                    <button
                      onClick={() => handleOpenStopModal(group)}
                      className="p-1 bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                      title="Zeiterfassung stoppen"
                    >
                      <StopIcon className="h-5 w-5 text-white fill-white" />
                    </button>
                  )}
                  
                  {/* Edit-Button nur für Benutzer mit entsprechenden Berechtigungen */}
                  {hasPermission('team_worktime', 'both', 'page') && (
                    <button
                      onClick={() => handleOpenEditModal(group)}
                      className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                      title="Zeiterfassungen bearbeiten"
                    >
                      <PencilIcon className="h-5 w-5 text-white fill-white" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

#### Berechtigungsprüfung für den Edit-Button

Für den Edit-Button ist die korrekte Berechtigungsprüfung entscheidend:

1. **Benötigte Berechtigung**: 'team_worktime' mit Zugriffsebene 'both' für Entität 'page'
2. **Implementierung**: Verwendung des `hasPermission`-Hooks zur Prüfung
3. **Position**: Der Edit-Button erscheint rechts neben dem Stop-Button (falls vorhanden)
4. **Anzeige**: Der Button wird nur angezeigt, wenn der Benutzer die erforderlichen Berechtigungen hat

```typescript
// Korrekte Berechtigungsprüfung
import { usePermissions } from 'hooks/usePermissions';

const { hasPermission } = usePermissions();

// Im JSX
{hasPermission('team_worktime', 'both', 'page') && (
  <button
    onClick={() => handleOpenEditModal(group)}
    className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
    title="Zeiterfassungen bearbeiten"
  >
    <PencilIcon className="h-5 w-5 text-white fill-white" />
  </button>
)}
```

#### Handler zum Öffnen des Edit-Modals

Der `handleOpenEditModal`-Handler bereitet die erforderlichen Daten für das Modal vor und öffnet es:

```typescript
// Handler zum Öffnen des Edit-Modals
const handleOpenEditModal = (group: ActiveUserGroup) => {
  // Datum für die Anzeige formatieren (YYYY-MM-DD)
  const formattedDate = format(new Date(), 'yyyy-MM-dd');
  
  // Aufruf der übergebenen onOpenEditModal-Funktion mit Benutzergruppe und Datum
  onOpenEditModal(group, formattedDate);
};
```

#### Aktualisieren der Zeiteinträge mit dem API

Nach dem Bearbeiten der Zeiteinträge im Modal müssen diese korrekt an das Backend gesendet werden:

```typescript
// Handler zum Speichern der bearbeiteten Zeiteinträge
const handleSaveWorktimeEdits = async (
  updatedEntries: WorktimeEntry[], 
  deletedEntryIds: string[]
) => {
  try {
    // Aktualisierte Einträge speichern
    if (updatedEntries.length > 0) {
      await Promise.all(
        updatedEntries.map(entry => worktimeApi.updateWorktimeEntry(entry))
      );
    }
    
    // Zu löschende Einträge entfernen
    if (deletedEntryIds.length > 0) {
      await Promise.all(
        deletedEntryIds.map(id => worktimeApi.deleteWorktimeEntry(id))
      );
    }
    
    // Erfolgsmeldung anzeigen
    toast({
      title: "Zeiterfassung aktualisiert",
      description: "Die Zeiterfassungen wurden erfolgreich aktualisiert.",
      status: "success"
    });
    
    // Modal schließen und Daten neu laden
    handleCloseEditModal();
    fetchActiveUsers();
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Zeiterfassungen:', error);
    
    // Fehlermeldung anzeigen
    toast({
      title: "Fehler",
      description: "Beim Aktualisieren der Zeiterfassungen ist ein Fehler aufgetreten.",
      status: "error"
    });
  }
};
```

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