import React, { useState, useMemo, useCallback } from 'react';
import { format, formatDistanceToNow, subDays, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { StopIcon, ArrowPathIcon, MagnifyingGlassIcon, Bars3Icon, ChevronUpIcon, ChevronDownIcon, ArrowsUpDownIcon, CalendarIcon, PencilIcon, FunnelIcon } from '@heroicons/react/24/outline';
import StopWorktimeModal from './StopWorktimeModal.tsx';
import EditWorktimeModal from './EditWorktimeModal.tsx';
import FilterPane from '../FilterPane.tsx';
import SavedFilterTags from '../SavedFilterTags.tsx';
import { FilterCondition } from '../FilterRow.tsx';
import { useTableSettings } from '../../hooks/useTableSettings.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { createLocalDate } from '../../utils/dateUtils.ts';
import * as worktimeApi from '../../api/worktimeApi.ts';
import { API_ENDPOINTS } from '../../config/api.ts';
import axiosInstance from '../../config/axios.ts';
import TableColumnConfig from '../TableColumnConfig.tsx';

interface ActiveUsersListProps {
  activeUsers: any[];
  allWorktimes: any[];
  loading: boolean;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onStopWorktime: (userId: number, endTime: string) => Promise<void>;
  onRefresh: () => void;
}

// Definition der verfügbaren Spalten
const availableColumns = [
  { id: 'name', label: 'Name' },
  { id: 'startTime', label: 'Startzeit' },
  { id: 'duration', label: 'Arbeitszeit' },
  { id: 'pauseTime', label: 'Pausen' },
  { id: 'branch', label: 'Niederlassung' },
  { id: 'actions', label: 'Aktionen' }
];

// Standardreihenfolge der Spalten
const defaultColumnOrder = ['name', 'startTime', 'duration', 'pauseTime', 'branch', 'actions'];

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface WorktimeGroup {
  user: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    normalWorkingHours: number;
    approvedOvertimeHours: number;
  };
  branch: {
    id: number;
    name: string;
  };
  entries: any[];
  startTime: Date;
  endTime: Date | null;
  totalDuration: number;
  activeEntries: any[];
  hasActiveWorktime: boolean;
}

// TableID für gespeicherte Filter
const WORKCENTER_TABLE_ID = 'workcenter-table';

const ActiveUsersList: React.FC<ActiveUsersListProps> = ({
  activeUsers,
  allWorktimes,
  loading,
  selectedDate,
  onDateChange,
  onStopWorktime,
  onRefresh
}) => {
  const [showStopModal, setShowStopModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'startTime', direction: 'asc' });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);
  const [displayLimit, setDisplayLimit] = useState<number>(10);
  
  // Neue State-Variablen für erweiterte Filterbedingungen
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
  
  const { hasPermission } = usePermissions();

  // Spalten-Konfiguration mit Hook
  const { 
    settings,
    updateColumnOrder,
    updateHiddenColumns,
    isColumnVisible
  } = useTableSettings('team_worktime_active', {
    defaultColumnOrder: defaultColumnOrder,
    defaultHiddenColumns: []
  });

  // Benutze die vom Hook zurückgegebenen Werte
  const columnOrder = settings.columnOrder;
  const hiddenColumns = settings.hiddenColumns;

  // Öffne das Modal zum Stoppen der Zeiterfassung
  const handleOpenStopModal = (user: any) => {
    setSelectedUser(user);
    setShowStopModal(true);
  };

  // Schließe das Modal
  const handleCloseStopModal = () => {
    setShowStopModal(false);
    setSelectedUser(null);
  };

  // Öffne das Modal zur Bearbeitung der Zeiterfassungen
  const handleOpenEditModal = (user: any) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  // Schließe das Modal für die Bearbeitung
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedUser(null);
  };

  // Stoppe die Zeiterfassung eines Benutzers
  const handleStopWorktime = async (endTime: string) => {
    if (!selectedUser) return;

    // Wenn mehrere aktive Zeiterfassungen vorhanden sind, stoppe die neueste
    const activeEntry = selectedUser.activeEntries.length > 0 
      ? selectedUser.activeEntries.reduce((latest: any, current: any) => {
          const latestDate = createLocalDate(latest.startTime);
          const currentDate = createLocalDate(current.startTime);
          return currentDate > latestDate ? current : latest;
        }, selectedUser.activeEntries[0])
      : null;

    if (activeEntry) {
      await onStopWorktime(activeEntry.user.id, endTime);
    } else {
      await onStopWorktime(selectedUser.user.id, endTime);
    }
    
    handleCloseStopModal();
  };

  // Sortieren
  const handleSort = (key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Drag & Drop für Spalten
  const handleDragStart = (columnId: string) => {
    setDraggedColumn(columnId);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumnId) return;

    const newOrder = [...columnOrder];
    const draggedIndex = newOrder.indexOf(draggedColumn);
    const targetIndex = newOrder.indexOf(targetColumnId);
    
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);
    
    updateColumnOrder(newOrder);
  }, [draggedColumn, columnOrder, updateColumnOrder]);

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  // Filtern und sortieren der Benutzer
  const filteredAndSortedUsers = useMemo(() => {
    // Kombiniere aktive und abgeschlossene Zeiterfassungen für das ausgewählte Datum
    const allEntries = [...allWorktimes];
    const activeEntriesForDate = activeUsers.filter(worktime => {
      const startDate = worktime.startTime.split('T')[0];
      return startDate === selectedDate;
    });
    
    // Füge aktive Einträge hinzu, die noch nicht in allWorktimes sind
    activeEntriesForDate.forEach(activeEntry => {
      if (!allEntries.find(entry => entry.id === activeEntry.id)) {
        allEntries.push(activeEntry);
      }
    });

    // Gruppiere Einträge nach Benutzer
    const userGroups = allEntries.reduce((groups, entry) => {
      const userId = entry.user.id;
      if (!groups[userId]) {
        groups[userId] = {
          user: entry.user,
          branch: entry.branch,
          entries: [],
          startTime: createLocalDate(entry.startTime),
          endTime: entry.endTime ? createLocalDate(entry.endTime) : null,
          totalDuration: 0,
          activeEntries: [],
          hasActiveWorktime: false
        };
      }

      const group = groups[userId];
      group.entries.push(entry);
      
      // Update startTime if this entry has an earlier start
      const entryStartTime = createLocalDate(entry.startTime);
      if (entryStartTime < group.startTime) {
        group.startTime = entryStartTime;
      }

      // Update endTime if this entry has a later end
      if (entry.endTime) {
        const entryEndTime = createLocalDate(entry.endTime);
        if (!group.endTime || entryEndTime > group.endTime) {
          group.endTime = entryEndTime;
        }
      } else {
        group.hasActiveWorktime = true;
        group.activeEntries.push(entry);
      }

      // Add duration of this entry
      if (entry.endTime) {
        const duration = createLocalDate(entry.endTime).getTime() - createLocalDate(entry.startTime).getTime();
        group.totalDuration += duration;
      }

      return groups;
    }, {});

    // Konvertiere gruppierte Daten zurück in Array
    let grouped = Object.values(userGroups) as WorktimeGroup[];

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
      
      // Wenn erweiterte Filterbedingungen definiert sind, wende diese an
      if (filterConditions.length > 0) {
        // Implementiere die logische Verknüpfung der Bedingungen (UND/ODER)
        let result = filterConditions.length > 0;
        
        for (let i = 0; i < filterConditions.length; i++) {
          const condition = filterConditions[i];
          let conditionMet = false;
          
          switch (condition.column) {
            case 'name':
              if (condition.operator === 'equals') {
                conditionMet = fullName === (condition.value as string || '').toLowerCase();
              } else if (condition.operator === 'contains') {
                conditionMet = fullName.includes((condition.value as string || '').toLowerCase());
              } else if (condition.operator === 'startsWith') {
                conditionMet = fullName.startsWith((condition.value as string || '').toLowerCase());
              }
              break;
            
            case 'branch':
              if (condition.operator === 'equals') {
                conditionMet = branch === (condition.value as string || '').toLowerCase();
              } else if (condition.operator === 'contains') {
                conditionMet = branch.includes((condition.value as string || '').toLowerCase());
              } else if (condition.operator === 'startsWith') {
                conditionMet = branch.startsWith((condition.value as string || '').toLowerCase());
              }
              break;
            
            case 'hasActiveWorktime':
              if (condition.operator === 'equals') {
                const isActive = (condition.value === 'true');
                conditionMet = group.hasActiveWorktime === isActive;
              }
              break;
              
            case 'duration':
              if (condition.operator === 'greaterThan') {
                const minDuration = parseInt(condition.value as string || '0') * 60 * 60 * 1000; // Stunden in Millisekunden
                conditionMet = group.totalDuration > minDuration;
              } else if (condition.operator === 'lessThan') {
                const maxDuration = parseInt(condition.value as string || '0') * 60 * 60 * 1000; // Stunden in Millisekunden
                conditionMet = group.totalDuration < maxDuration;
              } else if (condition.operator === 'equals') {
                const targetDuration = parseInt(condition.value as string || '0') * 60 * 60 * 1000; // Stunden in Millisekunden
                const tolerance = 30 * 60 * 1000; // 30 Minuten Toleranz
                conditionMet = Math.abs(group.totalDuration - targetDuration) <= tolerance;
              }
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
      
      return true;
    });

    // Sortieren nach Konfiguration
    if (sortConfig.key) {
      filtered.sort((a: any, b: any) => {
        let valueA, valueB;
        
        if (sortConfig.key === 'name') {
          valueA = `${a.user.firstName} ${a.user.lastName}`;
          valueB = `${b.user.firstName} ${b.user.lastName}`;
        } else if (sortConfig.key === 'startTime') {
          valueA = a.startTime.getTime();
          valueB = b.startTime.getTime();
        } else if (sortConfig.key === 'duration') {
          valueA = a.totalDuration;
          valueB = b.totalDuration;
        } else if (sortConfig.key === 'branch') {
          valueA = a.branch.name;
          valueB = b.branch.name;
        } else {
          valueA = a[sortConfig.key];
          valueB = b[sortConfig.key];
        }
        
        if (valueA < valueB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filtered;
  }, [allWorktimes, activeUsers, searchTerm, sortConfig, selectedDate, filterConditions, filterLogicalOperators]);

  // Render-Methode für Spaltenheader
  const renderSortableHeader = (columnId: string, label: string) => {
    // Überprüfen, ob diese Spalte gerade sortiert wird
    const isSorted = sortConfig?.key === columnId;
    
    return (
      <th
        key={columnId}
        scope="col"
        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer group relative"
        onClick={() => handleSort(columnId)}
        draggable
        onDragStart={() => handleDragStart(columnId)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, columnId)}
        onDragEnd={handleDragEnd}
      >
        <div className={`flex items-center ${draggedColumn === columnId ? 'opacity-50' : ''}`}>
          <ArrowsUpDownIcon className="h-3 w-3 mr-1 text-gray-400 dark:text-gray-500" />
          {label} {isSorted && (
            sortConfig.direction === 'asc' ? '↑' : '↓'
          )}
        </div>
      </th>
    );
  };

  // Handler für die TableColumnConfig-Komponente
  const handleToggleColumnVisibility = (columnId: string) => {
    const newHiddenColumns = hiddenColumns.includes(columnId)
      ? hiddenColumns.filter(id => id !== columnId)
      : [...hiddenColumns, columnId];
    updateHiddenColumns(newHiddenColumns);
  };

  const handleMoveColumn = (dragIndex: number, hoverIndex: number) => {
    const newColumnOrder = [...columnOrder];
    const draggedItem = newColumnOrder[dragIndex];
    newColumnOrder.splice(dragIndex, 1);
    newColumnOrder.splice(hoverIndex, 0, draggedItem);
    updateColumnOrder(newColumnOrder);
  };

  // Speichere die bearbeiteten Zeiterfassungen
  const handleSaveWorktimeEdits = async (editedEntries: any[]) => {
    try {
      // Verwende die API-Funktion für das Batch-Update
      await worktimeApi.updateWorktimeEntries(editedEntries);
      
      // Aktualisiere die Daten
      onRefresh();
      
      // Zeige Erfolgsmeldung
      alert("Die Zeiterfassungen wurden erfolgreich gespeichert.");
      
      // Schließe das Modal
      handleCloseEditModal();
    } catch (error: any) {
      console.error('Fehler beim Aktualisieren der Zeiterfassungen:', error);
      
      // Zeige eine benutzerfreundliche Fehlermeldung
      let errorMessage = "Ein unbekannter Fehler ist aufgetreten.";
      
      if (error.response) {
        // Server antwortet mit Fehlerstatus
        if (error.response.status === 401) {
          errorMessage = "Sie sind nicht berechtigt, diese Aktion durchzuführen.";
        } else if (error.response.status === 403) {
          errorMessage = "Sie haben keine Berechtigung, diese Zeiterfassungen zu bearbeiten.";
        } else if (error.response.status === 404) {
          errorMessage = "Eine oder mehrere Zeiterfassungen wurden nicht gefunden.";
        } else if (error.response.status === 500) {
          errorMessage = "Es ist ein Serverfehler aufgetreten. Bitte versuchen Sie es später noch einmal.";
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        // Keine Antwort vom Server
        errorMessage = "Keine Antwort vom Server. Bitte überprüfen Sie Ihre Internetverbindung.";
      } else {
        // Fehler bei der Anfrage
        errorMessage = error.message || "Ein Fehler ist aufgetreten.";
      }
      
      alert("Fehler beim Speichern der Zeiterfassungen: " + errorMessage);
    }
  };

  // Standard-Filter erstellen und speichern
  React.useEffect(() => {
    const createStandardFilters = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.error('Nicht authentifiziert');
          return;
        }

        // Prüfen, ob die Standard-Filter bereits existieren
        const existingFiltersResponse = await axiosInstance.get(
          `${API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(WORKCENTER_TABLE_ID)}`,
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

          await axiosInstance.post(
            `${API_ENDPOINTS.SAVED_FILTERS.BASE}`,
            aktiveFilter,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          console.log('Aktive-Filter für Workcenter erstellt');
        }

        // Erstelle "Alle"-Filter, wenn er noch nicht existiert
        if (!alleFilterExists) {
          const alleFilter = {
            tableId: WORKCENTER_TABLE_ID,
            name: 'Alle',
            conditions: [],
            operators: []
          };

          await axiosInstance.post(
            `${API_ENDPOINTS.SAVED_FILTERS.BASE}`,
            alleFilter,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          console.log('Alle-Filter für Workcenter erstellt');
        }
      } catch (error) {
        console.error('Fehler beim Erstellen der Standard-Filter:', error);
      }
    };

    createStandardFilters();
  }, []);

  // Funktion zum Anwenden von Filterbedingungen
  const applyFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setFilterConditions(conditions);
    setFilterLogicalOperators(operators);
  };
  
  // Funktion zum Zurücksetzen der Filter
  const resetFilterConditions = () => {
    setFilterConditions([]);
    setFilterLogicalOperators([]);
  };

  // Datum zu vorherigem Tag ändern
  const handlePreviousDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const selected = new Date(year, month - 1, day);
    const previousDate = subDays(selected, 1);
    onDateChange(format(previousDate, 'yyyy-MM-dd'));
  };

  // Datum zu nächstem Tag ändern
  const handleNextDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const selected = new Date(year, month - 1, day);
    const nextDate = addDays(selected, 1);
    onDateChange(format(nextDate, 'yyyy-MM-dd'));
  };

  // Prüfen ob selectedDate kleiner als heute ist (dynamisch bei Änderung)
  const isDateBeforeToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [year, month, day] = selectedDate.split('-').map(Number);
    const selected = new Date(year, month - 1, day);
    selected.setHours(0, 0, 0, 0);
    
    return selected.getTime() < today.getTime();
  }, [selectedDate]);

  return (
    <div>
      {/* Header mit Datumsauswahl, Suche und Buttons */}
      <div className="flex items-center justify-between mb-4">
        {/* Datumsauswahl mit Pfeilen - linksbündig */}
        <div className="flex items-center gap-0.5">
          {/* Links-Pfeil (zurück) */}
          <button
            type="button"
            onClick={handlePreviousDay}
            className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Vorheriger Tag"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Datumsfeld */}
          <div className="relative w-[180px]">
            <input
              type="date"
              id="date-select"
              className="block w-full pl-3 pr-8 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </div>

          {/* Rechts-Pfeil (vorwärts) - nur wenn Datum < heute */}
          {isDateBeforeToday && (
            <button
              type="button"
              onClick={handleNextDay}
              className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Nächster Tag"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Suche und Buttons - rechtsbündig */}
        <div className="flex items-center">
          <input
            type="text"
            className="w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="Suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <button
            type="button"
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 ml-1"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            title="Filter anzeigen"
          >
            <FunnelIcon className="h-5 w-5" />
          </button>
          
          <div className="ml-1">
            <TableColumnConfig
              columns={availableColumns}
              visibleColumns={columnOrder.filter(id => !hiddenColumns.includes(id))}
              columnOrder={columnOrder}
              onToggleColumnVisibility={handleToggleColumnVisibility}
              onMoveColumn={handleMoveColumn}
              onClose={() => {}}
            />
          </div>
        </div>
      </div>
      
      {/* Filter-Panel */}
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
      
      {/* Tabelle mit aktiven Benutzern */}
      <div className="border-0 rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {columnOrder
                .filter(columnId => !hiddenColumns.includes(columnId))
                .map(columnId => {
                  const column = availableColumns.find(col => col.id === columnId);
                  if (!column) return null;
                  
                  if (columnId === 'actions') {
                    return (
                      <th
                        key={columnId}
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                        draggable
                        onDragStart={() => handleDragStart(columnId)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, columnId)}
                        onDragEnd={handleDragEnd}
                      >
                        {column.label}
                      </th>
                    );
                  }
                  
                  return renderSortableHeader(columnId, column.label);
                })
              }
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAndSortedUsers.length === 0 ? (
              <tr>
                <td colSpan={columnOrder.filter(id => !hiddenColumns.includes(id)).length} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Keine Zeiterfassungen gefunden
                </td>
              </tr>
            ) : (
              filteredAndSortedUsers.slice(0, displayLimit).map((group) => {
                const totalPauseTime = group.endTime 
                  ? (group.endTime.getTime() - group.startTime.getTime()) - group.totalDuration
                  : 0;

                return (
                  <tr key={group.user.id}>
                    {columnOrder
                      .filter(columnId => !hiddenColumns.includes(columnId))
                      .map(columnId => {
                        if (columnId === 'name') {
                          return (
                            <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {group.user.firstName} {group.user.lastName}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">{group.user.username}</div>
                                </div>
                              </div>
                            </td>
                          );
                        }
                        
                        if (columnId === 'startTime') {
                          return (
                            <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {format(group.startTime, 'dd.MM.yyyy')}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {format(group.startTime, 'HH:mm:ss')}
                              </div>
                            </td>
                          );
                        }
                        
                        if (columnId === 'duration') {
                          return (
                            <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {formatDistanceToNow(new Date(Date.now() - group.totalDuration), { locale: de, addSuffix: false })}
                              </div>
                            </td>
                          );
                        }

                        if (columnId === 'pauseTime') {
                          return (
                            <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {totalPauseTime > 0 
                                  ? formatDistanceToNow(new Date(Date.now() - totalPauseTime), { locale: de, addSuffix: false })
                                  : '-'}
                              </div>
                            </td>
                          );
                        }
                        
                        if (columnId === 'branch') {
                          return (
                            <td key={columnId} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {group.branch.name}
                            </td>
                          );
                        }
                        
                        if (columnId === 'actions') {
                          return (
                            <td key={columnId} className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex flex-row space-x-2 justify-end items-center">
                                {group.hasActiveWorktime && (
                                  <button
                                    onClick={() => handleOpenStopModal(group)}
                                    className="p-1 bg-red-600 text-white rounded hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                                    title="Zeiterfassung stoppen"
                                  >
                                    <StopIcon className="h-5 w-5 text-white fill-white" />
                                  </button>
                                )}
                                {hasPermission('team_worktime_control', 'both', 'page') && hasPermission('team_worktime', 'both', 'table') && (
                                  <button
                                    onClick={() => handleOpenEditModal(group)}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 edit-button"
                                    title="Zeiterfassungen bearbeiten"
                                  >
                                    <PencilIcon className="h-5 w-5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        }
                        
                        return null;
                      })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* "Mehr anzeigen" Button */}
      {filteredAndSortedUsers.length > displayLimit && (
        <div className="mt-4 flex justify-center">
          <button
            className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-600 rounded-md hover:bg-blue-50 dark:hover:bg-gray-600"
            onClick={() => setDisplayLimit(prevLimit => prevLimit + 10)}
          >
            Mehr anzeigen ({filteredAndSortedUsers.length - displayLimit} verbleibend)
          </button>
        </div>
      )}

      {/* Modal zum Stoppen der Zeiterfassung */}
      {showStopModal && selectedUser && (
        <StopWorktimeModal
          isOpen={showStopModal}
          onClose={handleCloseStopModal}
          onConfirm={handleStopWorktime}
          userName={`${selectedUser.user.firstName} ${selectedUser.user.lastName}`}
        />
      )}

      {/* Modal zum Bearbeiten der Zeiterfassungen */}
      {showEditModal && selectedUser && (
        <EditWorktimeModal
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          onSave={handleSaveWorktimeEdits}
          userName={`${selectedUser.user.firstName} ${selectedUser.user.lastName}`}
          entries={selectedUser.entries}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
};

export default ActiveUsersList; 