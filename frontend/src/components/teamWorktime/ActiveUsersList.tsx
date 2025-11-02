import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { format, formatDistanceToNow, subDays, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { StopIcon, ArrowPathIcon, MagnifyingGlassIcon, Bars3Icon, ChevronUpIcon, ChevronDownIcon, ArrowsUpDownIcon, CalendarIcon, PencilIcon, FunnelIcon, Squares2X2Icon, TableCellsIcon, UserIcon, BuildingOfficeIcon, ClockIcon } from '@heroicons/react/24/outline';
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
import DataCard, { MetadataItem } from '../shared/DataCard.tsx';
import CardGrid from '../shared/CardGrid.tsx';

interface ActiveUsersListProps {
  activeUsers: any[];
  allWorktimes: any[];
  loading: boolean;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onStopWorktime: (userId: number, endTime: string) => Promise<void>;
  onRefresh: () => void;
  showTodos?: boolean;
  showRequests?: boolean;
}

// Definition der verfügbaren Spalten wird jetzt dynamisch mit useTranslation gemacht

// Standardreihenfolge der Spalten
const defaultColumnOrder = ['name', 'startTime', 'duration', 'pauseTime', 'branch', 'actions'];

// Card-Einstellungen Standardwerte
const defaultCardMetadata = ['name', 'startTime', 'duration', 'pauseTime', 'branch'];
const defaultCardColumnOrder = ['name', 'startTime', 'duration', 'pauseTime', 'branch'];
const defaultCardSortDirections: Record<string, 'asc' | 'desc'> = {
  name: 'asc',
  startTime: 'asc',
  duration: 'asc',
  pauseTime: 'asc',
  branch: 'asc'
};

// Mapping zwischen Tabellen-Spalten-IDs und Card-Metadaten-IDs
// Tabellen-Spalte -> Card-Metadaten (kann Array sein für 1:N Mapping)
const tableToCardMapping: Record<string, string[]> = {
  'name': ['name'],
  'startTime': ['startTime'],
  'duration': ['duration'],
  'pauseTime': ['pauseTime'],
  'branch': ['branch'],
  'actions': [] // Keine Card-Entsprechung
};

// Reverse Mapping: Card-Metadaten -> Tabellen-Spalten
const cardToTableMapping: Record<string, string> = {
  'name': 'name',
  'startTime': 'startTime',
  'duration': 'duration',
  'pauseTime': 'pauseTime',
  'branch': 'branch'
};

// Helfer-Funktion: Tabellen-Spalte ausgeblendet -> Card-Metadaten ausblenden
const getHiddenCardMetadata = (hiddenTableColumns: string[]): Set<string> => {
  const hiddenCardMetadata = new Set<string>();
  hiddenTableColumns.forEach(tableCol => {
    const cardMetadata = tableToCardMapping[tableCol] || [];
    cardMetadata.forEach(cardMeta => hiddenCardMetadata.add(cardMeta));
  });
  return hiddenCardMetadata;
};

// Helfer-Funktion: Card-Metadaten zu Tabellen-Spalten konvertieren
const getCardMetadataFromColumnOrder = (columnOrder: string[]): string[] => {
  const cardMetadata: string[] = [];
  columnOrder.forEach(tableCol => {
    const cardMeta = tableToCardMapping[tableCol];
    if (cardMeta && cardMeta.length > 0) {
      cardMetadata.push(...cardMeta);
    }
  });
  return cardMetadata;
};

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
  onRefresh,
  showTodos = false,
  showRequests = false
}) => {
  const { t } = useTranslation();
  
  // Definition der verfügbaren Spalten (dynamisch aus Übersetzungen)
  const availableColumns = useMemo(() => [
    { id: 'name', label: t('teamWorktime.columns.name') },
    { id: 'startTime', label: t('teamWorktime.columns.startTime') },
    { id: 'duration', label: t('teamWorktime.columns.duration') },
    { id: 'pauseTime', label: t('teamWorktime.columns.pauseTime') },
    { id: 'branch', label: t('teamWorktime.columns.branch') },
    { id: 'actions', label: t('teamWorktime.columns.actions') }
  ], [t]);
  
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
  
  // Filter State Management (Controlled Mode)
  const [activeFilterName, setActiveFilterName] = useState<string>(t('teamWorktime.filters.active'));
  const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);
  
  // State für To-Dos und Requests pro User
  const [userTodos, setUserTodos] = useState<Record<number, any>>({});
  const [userRequests, setUserRequests] = useState<Record<number, any>>({});
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());
  const [loadingTodos, setLoadingTodos] = useState<boolean>(false);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(false);
  
  const { hasPermission } = usePermissions();

  // Lade To-Dos für User (wenn showTodos aktiv)
  useEffect(() => {
    const loadUserTodos = async () => {
      if (!showTodos || !selectedDate) return;
      
      try {
        setLoadingTodos(true);
        const response = await axiosInstance.get(API_ENDPOINTS.TEAM_WORKTIME.ANALYTICS.TODOS_BY_USER, {
          params: {
            date: selectedDate
          }
        });
        
        // Konvertiere Array zu Record mit userId als Key
        const todosMap: Record<number, any> = {};
        response.data.forEach((item: any) => {
          todosMap[item.userId] = item.todos;
        });
        setUserTodos(todosMap);
      } catch (error) {
        console.error('Fehler beim Laden der To-Dos:', error);
      } finally {
        setLoadingTodos(false);
      }
    };
    
    loadUserTodos();
  }, [showTodos, selectedDate]);

  // Lade Requests für User (wenn showRequests aktiv)
  useEffect(() => {
    const loadUserRequests = async () => {
      if (!showRequests || !selectedDate) return;
      
      try {
        setLoadingRequests(true);
        const response = await axiosInstance.get(API_ENDPOINTS.TEAM_WORKTIME.ANALYTICS.REQUESTS_BY_USER, {
          params: {
            date: selectedDate
          }
        });
        
        // Konvertiere Array zu Record mit userId als Key
        const requestsMap: Record<number, any> = {};
        response.data.forEach((item: any) => {
          requestsMap[item.userId] = item.requests;
        });
        setUserRequests(requestsMap);
      } catch (error) {
        console.error('Fehler beim Laden der Requests:', error);
      } finally {
        setLoadingRequests(false);
      }
    };
    
    loadUserRequests();
  }, [showRequests, selectedDate]);

  const toggleExpand = (userId: number) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Spalten-Konfiguration mit Hook
  const { 
    settings,
    updateColumnOrder,
    updateHiddenColumns,
    isColumnVisible,
    updateViewMode
  } = useTableSettings('team_worktime_active', {
    defaultColumnOrder: defaultColumnOrder,
    defaultHiddenColumns: [],
    defaultViewMode: 'cards'
  });

  // Benutze die vom Hook zurückgegebenen Werte
  const columnOrder = settings.columnOrder;
  const hiddenColumns = settings.hiddenColumns;

  // View-Mode aus Settings laden
  const viewMode = settings.viewMode || 'cards';
  
  // Lokale Sortierrichtungen für Cards (nicht persistiert)
  const [cardSortDirections, setCardSortDirections] = useState<Record<string, 'asc' | 'desc'>>(() => {
    return defaultCardSortDirections;
  });

  // Abgeleitete Werte für Card-Ansicht aus Tabellen-Settings
  // Card-Metadaten-Reihenfolge aus columnOrder ableiten
  const cardMetadataOrder = useMemo(() => {
    return getCardMetadataFromColumnOrder(settings.columnOrder || defaultColumnOrder);
  }, [settings.columnOrder]);

  // Versteckte Card-Metadaten aus hiddenColumns ableiten
  const hiddenCardMetadata = useMemo(() => {
    return getHiddenCardMetadata(settings.hiddenColumns || []);
  }, [settings.hiddenColumns]);

  // Sichtbare Card-Metadaten (alle Card-Metadaten minus versteckte)
  const visibleCardMetadata = useMemo(() => {
    return new Set(cardMetadataOrder.filter(meta => !hiddenCardMetadata.has(meta)));
  }, [cardMetadataOrder, hiddenCardMetadata]);

  // CSS-Klasse für Container-Box setzen (für CSS-basierte Schattierungs-Entfernung)
  useEffect(() => {
    const wrappers = document.querySelectorAll('.dashboard-workcenter-wrapper');
    wrappers.forEach(wrapper => {
      if (viewMode === 'cards') {
        wrapper.classList.add('cards-mode');
      } else {
        wrapper.classList.remove('cards-mode');
      }
    });
  }, [viewMode]);

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

  // Funktion zum Zählen aktiver Filter
  const getActiveFilterCount = () => {
    return filterConditions.length;
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
    if (viewMode === 'cards') {
      // Multi-Sortierung für Cards-Mode
      const sortableColumns = cardMetadataOrder.filter(colId => visibleCardMetadata.has(colId));
      
      filtered.sort((a: any, b: any) => {
        for (const columnId of sortableColumns) {
          const direction = cardSortDirections[columnId] || 'asc';
          let valueA: any, valueB: any;
          
          switch (columnId) {
            case 'name':
              valueA = `${a.user.firstName} ${a.user.lastName}`.toLowerCase();
              valueB = `${b.user.firstName} ${b.user.lastName}`.toLowerCase();
              break;
            case 'startTime':
              valueA = a.startTime.getTime();
              valueB = b.startTime.getTime();
              break;
            case 'duration':
              valueA = a.totalDuration;
              valueB = b.totalDuration;
              break;
            case 'pauseTime':
              const pauseTimeA = a.endTime ? (a.endTime.getTime() - a.startTime.getTime()) - a.totalDuration : 0;
              const pauseTimeB = b.endTime ? (b.endTime.getTime() - b.startTime.getTime()) - b.totalDuration : 0;
              valueA = pauseTimeA;
              valueB = pauseTimeB;
              break;
            case 'branch':
              valueA = a.branch.name.toLowerCase();
              valueB = b.branch.name.toLowerCase();
              break;
            default:
              continue; // Überspringe unbekannte Spalten
          }
          
          // Vergleich basierend auf Typ
          let comparison = 0;
          if (typeof valueA === 'number' && typeof valueB === 'number') {
            comparison = valueA - valueB;
          } else {
            comparison = String(valueA).localeCompare(String(valueB));
          }
          
          // Sortierrichtung anwenden
          if (direction === 'desc') {
            comparison = -comparison;
          }
          
          // Wenn unterschiedlich, gebe Vergleich zurück
          if (comparison !== 0) {
            return comparison;
          }
        }
        return 0; // Alle Spalten identisch
      });
    } else {
      // Tabellen-Mode: Einzel-Sortierung wie bisher
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
    }
    
    return filtered;
  }, [allWorktimes, activeUsers, searchTerm, sortConfig, selectedDate, filterConditions, filterLogicalOperators, viewMode, cardMetadataOrder, visibleCardMetadata, cardSortDirections]);

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
    if (viewMode === 'cards') {
      // Für Cards: Mapping zurück zu Tabellen-Spalten
      const tableColumn = cardToTableMapping[columnId];
      if (tableColumn) {
        const newHiddenColumns = hiddenColumns.includes(tableColumn)
          ? hiddenColumns.filter(id => id !== tableColumn)
          : [...hiddenColumns, tableColumn];
        updateHiddenColumns(newHiddenColumns);
      }
    } else {
    const newHiddenColumns = hiddenColumns.includes(columnId)
      ? hiddenColumns.filter(id => id !== columnId)
      : [...hiddenColumns, columnId];
    updateHiddenColumns(newHiddenColumns);
    }
  };

  const handleMoveColumn = (dragIndex: number, hoverIndex: number) => {
    if (viewMode === 'cards') {
      // Für Cards: Card-Metadaten-Reihenfolge ändern
      const newCardOrder = [...cardMetadataOrder];
      const dragged = newCardOrder[dragIndex];
      newCardOrder.splice(dragIndex, 1);
      newCardOrder.splice(hoverIndex, 0, dragged);
      
      // Konvertiere zurück zu Tabellen-Spalten-Reihenfolge
      const newTableOrder: string[] = [];
      const usedTableColumns = new Set<string>();
      
      newCardOrder.forEach(cardMeta => {
        const tableCol = cardToTableMapping[cardMeta];
        if (tableCol && !usedTableColumns.has(tableCol)) {
          usedTableColumns.add(tableCol);
          newTableOrder.push(tableCol);
        }
      });
      
      // Füge fehlende Tabellen-Spalten hinzu
      availableColumns.forEach(col => {
        if (!newTableOrder.includes(col.id) && col.id !== 'actions') {
          newTableOrder.push(col.id);
        }
      });
      
      updateColumnOrder(newTableOrder);
    } else {
    const newColumnOrder = [...columnOrder];
    const draggedItem = newColumnOrder[dragIndex];
    newColumnOrder.splice(dragIndex, 1);
    newColumnOrder.splice(hoverIndex, 0, draggedItem);
    updateColumnOrder(newColumnOrder);
    }
  };

  // Speichere die bearbeiteten Zeiterfassungen
  const handleSaveWorktimeEdits = async (editedEntries: any[]) => {
    try {
      // Verwende die API-Funktion für das Batch-Update
      await worktimeApi.updateWorktimeEntries(editedEntries);
      
      // Aktualisiere die Daten
      onRefresh();
      
      // Zeige Erfolgsmeldung
      alert(t('teamWorktime.messages.saveSuccess'));
      
      // Schließe das Modal
      handleCloseEditModal();
    } catch (error: any) {
      console.error('Fehler beim Aktualisieren der Zeiterfassungen:', error);
      
      // Zeige eine benutzerfreundliche Fehlermeldung
      let errorMessage = t('teamWorktime.messages.unknownError');
      
      if (error.response) {
        // Server antwortet mit Fehlerstatus
        if (error.response.status === 401) {
          errorMessage = t('teamWorktime.messages.unauthorized');
        } else if (error.response.status === 403) {
          errorMessage = t('teamWorktime.messages.forbidden');
        } else if (error.response.status === 404) {
          errorMessage = t('teamWorktime.messages.notFound');
        } else if (error.response.status === 500) {
          errorMessage = t('teamWorktime.messages.serverError');
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        // Keine Antwort vom Server
        errorMessage = t('teamWorktime.messages.noResponse');
      } else {
        // Fehler bei der Anfrage
        errorMessage = error.message || t('teamWorktime.messages.error');
      }
      
      alert(t('teamWorktime.messages.saveError') + ' ' + errorMessage);
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
        // Prüfe auf Filter mit verschiedenen möglichen Namen (Deutsch, Spanisch, Englisch)
        const aktiveFilterExists = existingFilters.some(filter => 
          filter.name === 'Aktive' || filter.name === t('teamWorktime.filters.active') || filter.name === 'Active' || filter.name === 'Activo'
        );
        const alleFilterExists = existingFilters.some(filter => 
          filter.name === 'Alle' || filter.name === t('teamWorktime.filters.all') || filter.name === 'All' || filter.name === 'Todos'
        );

        // Erstelle "Aktive"-Filter, wenn er noch nicht existiert
        if (!aktiveFilterExists) {
          const aktiveFilter = {
            tableId: WORKCENTER_TABLE_ID,
            name: t('teamWorktime.filters.active'),
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
            name: t('teamWorktime.filters.all'),
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
  }, [t]);

  // Initialer Default-Filter setzen (Controlled Mode)
  React.useEffect(() => {
    const setInitialFilter = async () => {
      try {
        const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(WORKCENTER_TABLE_ID));
        const filters = response.data;
        
        // Suche nach Filter mit aktuellem Namen oder alten Namen (für Migration)
        const aktiveFilter = filters.find((filter: any) => 
          filter.name === t('teamWorktime.filters.active') || 
          filter.name === 'Aktive' || 
          filter.name === 'Active' || 
          filter.name === 'Activo'
        );
        if (aktiveFilter) {
          setActiveFilterName(t('teamWorktime.filters.active'));
          setSelectedFilterId(aktiveFilter.id);
          applyFilterConditions(aktiveFilter.conditions, aktiveFilter.operators);
        }
      } catch (error) {
        console.error('Fehler beim Setzen des initialen Filters:', error);
      }
    };

    setInitialFilter();
  }, [t]);

  // Funktion zum Anwenden von Filterbedingungen
  const applyFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setFilterConditions(conditions);
    setFilterLogicalOperators(operators);
  };
  
  // Funktion zum Zurücksetzen der Filter
  const resetFilterConditions = () => {
    setFilterConditions([]);
    setFilterLogicalOperators([]);
    setActiveFilterName('');
    setSelectedFilterId(null);
  };
  
  // Filter Change Handler (Controlled Mode)
  const handleFilterChange = (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setActiveFilterName(name);
    setSelectedFilterId(id);
    applyFilterConditions(conditions, operators);
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
            title={t('common.previousDay')}
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
              title={t('common.nextDay')}
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
            placeholder={t('common.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          {/* View-Mode Toggle */}
          <button
            type="button"
            className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ml-1 ${
              viewMode === 'cards' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''
            }`}
            onClick={() => updateViewMode(viewMode === 'table' ? 'cards' : 'table')}
            title={viewMode === 'table' ? t('common.viewAsCards') : t('common.viewAsTable')}
          >
            {viewMode === 'table' ? (
              <Squares2X2Icon className="h-5 w-5" />
            ) : (
              <TableCellsIcon className="h-5 w-5" />
            )}
          </button>
          
          {/* Filter-Button */}
          <button
            type="button"
            className={`p-2 rounded-md ${getActiveFilterCount() > 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} ml-1 relative`}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            title={t('common.showFilter')}
          >
            <FunnelIcon className="h-5 w-5" />
            {getActiveFilterCount() > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 dark:bg-blue-500 text-white rounded-full text-xs flex items-center justify-center z-10" style={{ position: 'absolute', top: '-0.25rem', right: '-0.25rem' }}>
                {getActiveFilterCount()}
              </span>
            )}
          </button>
          
          {/* Spalten-Konfiguration */}
          <div className="ml-1">
            <TableColumnConfig
              columns={viewMode === 'cards'
                ? [
                    { id: 'name', label: t('teamWorktime.columns.name') },
                    { id: 'startTime', label: t('teamWorktime.columns.startTime') },
                    { id: 'duration', label: t('teamWorktime.columns.duration') },
                    { id: 'pauseTime', label: t('teamWorktime.columns.pauseTime') },
                    { id: 'branch', label: t('teamWorktime.columns.branch') }
                  ]
                : availableColumns}
              visibleColumns={viewMode === 'cards'
                ? Array.from(visibleCardMetadata)
                : columnOrder.filter(id => !hiddenColumns.includes(id))}
              columnOrder={viewMode === 'cards'
                ? cardMetadataOrder
                : columnOrder}
              onToggleColumnVisibility={handleToggleColumnVisibility}
              onMoveColumn={handleMoveColumn}
              sortDirections={viewMode === 'cards' ? cardSortDirections : undefined}
              onSortDirectionChange={viewMode === 'cards'
                ? (columnId: string, direction: 'asc' | 'desc') => {
                    setCardSortDirections(prev => ({
                      ...prev,
                      [columnId]: direction
                    }));
                  }
                : undefined}
              showSortDirection={viewMode === 'cards'}
              buttonTitle={viewMode === 'cards' ? t('teamWorktime.sortAndDisplay') : t('teamWorktime.configureColumns')}
              modalTitle={viewMode === 'cards' ? t('teamWorktime.sortAndDisplay') : t('teamWorktime.configureColumns')}
              onClose={() => {}}
            />
          </div>
        </div>
      </div>
      
      {/* Filter-Panel */}
      {isFilterOpen && (
        <FilterPane
          columns={[
            { id: 'name', label: t('teamWorktime.columns.name') },
            { id: 'branch', label: t('teamWorktime.columns.branch') },
            { id: 'hasActiveWorktime', label: t('worktime.active') },
            { id: 'duration', label: t('teamWorktime.columns.duration') }
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
        activeFilterName={activeFilterName}
        selectedFilterId={selectedFilterId}
        onFilterChange={handleFilterChange}
          defaultFilterName={t('teamWorktime.filters.active')}
      />
      
      {/* Tabelle oder Cards */}
      {viewMode === 'table' ? (
        /* Tabellen-Ansicht */
        <div className="dashboard-workcenter-wrapper border-0 rounded-lg overflow-hidden">
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

                const userTodosData = userTodos[group.user.id] || null;
                const userRequestsData = userRequests[group.user.id] || null;
                const isExpanded = expandedUsers.has(group.user.id);
                const hasActivities = (showTodos && userTodosData && userTodosData.total > 0) || 
                                    (showRequests && userRequestsData && userRequestsData.total > 0);

                return (
                  <React.Fragment key={group.user.id}>
                    <tr>
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
                                    title={t('teamWorktime.actions.stopTracking')}
                                  >
                                    <StopIcon className="h-5 w-5 text-white fill-white" />
                                  </button>
                                )}
                                {hasPermission('team_worktime_control', 'both', 'page') && hasPermission('team_worktime', 'both', 'table') && (
                                  <button
                                    onClick={() => handleOpenEditModal(group)}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 edit-button"
                                    title={t('teamWorktime.actions.editWorktimes')}
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
                    {/* To-Dos und Requests für User */}
                    {(showTodos || showRequests) && hasActivities && (
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        <td colSpan={columnOrder.filter(id => !hiddenColumns.includes(id)).length} className="px-6 py-3">
                          <div className="ml-4 border-l-2 border-blue-200 dark:border-blue-700 pl-4">
                            {/* To-Dos */}
                            {showTodos && userTodosData && userTodosData.total > 0 && (
                              <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    To-Dos ({selectedDate}): {userTodosData.completed} erledigt | {userTodosData.open} offen | {userTodosData.inProgress} in Bearbeitung
                                  </h4>
                                  <button
                                    onClick={() => toggleExpand(group.user.id)}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                  >
                                    {isExpanded ? 'Weniger anzeigen ▲' : 'Details anzeigen ▼'}
                                  </button>
                                </div>
                                {isExpanded && userTodosData.details && userTodosData.details.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {userTodosData.details.map((todo: any) => (
                                      <div key={todo.id} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                        <span className={todo.status === 'done' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                                          {todo.status === 'done' ? '✓' : '○'}
                                        </span>
                                        <span className="font-medium">{todo.title}</span>
                                        <span className="text-gray-400">({todo.status})</span>
                                        <span className="text-gray-400">
                                          - {format(new Date(todo.updatedAt), 'HH:mm')}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Requests */}
                            {showRequests && userRequestsData && userRequestsData.total > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Requests ({selectedDate}): {userRequestsData.approved} genehmigt | {userRequestsData.pending} offen
                                  </h4>
                                  {!showTodos && (
                                    <button
                                      onClick={() => toggleExpand(group.user.id)}
                                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                    >
                                      {isExpanded ? 'Weniger anzeigen ▲' : 'Details anzeigen ▼'}
                                    </button>
                                  )}
                                </div>
                                {isExpanded && userRequestsData.details && userRequestsData.details.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {userRequestsData.details.map((request: any) => (
                                      <div key={request.id} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                        <span className={request.status === 'approved' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                                          {request.status === 'approved' ? '✓' : '○'}
                                        </span>
                                        <span className="font-medium">{request.title}</span>
                                        <span className="text-gray-400">({request.status})</span>
                                        <span className="text-gray-400">
                                          - {format(new Date(request.createdAt), 'HH:mm')}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      ) : (
        /* Card-Ansicht */
        <div className="dashboard-workcenter-wrapper">
          {filteredAndSortedUsers.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
              Keine Zeiterfassungen gefunden
            </div>
          ) : (
            <CardGrid gap="md">
              {filteredAndSortedUsers.slice(0, displayLimit).map((group) => {
                const totalPauseTime = group.endTime 
                  ? (group.endTime.getTime() - group.startTime.getTime()) - group.totalDuration
                  : 0;

                const userTodosData = userTodos[group.user.id] || null;
                const userRequestsData = userRequests[group.user.id] || null;
                const isExpanded = expandedUsers.has(group.user.id);
                const hasActivities = (showTodos && userTodosData && userTodosData.total > 0) || 
                                    (showRequests && userRequestsData && userRequestsData.total > 0);

                // Metadaten für Card aufbauen - Hauptinfos strukturiert
                const metadata: MetadataItem[] = [];
                const firstRowMetadata: MetadataItem[] = [];
                const secondRowMetadata: MetadataItem[] = [];

                // Erste Zeile: Name, Startzeit (nebeneinander)
                if (visibleCardMetadata.has('name')) {
                  firstRowMetadata.push({
                    label: 'Name',
                    value: `${group.user.firstName} ${group.user.lastName} (${group.user.username})`,
                    icon: <UserIcon className="h-4 w-4" />
                  });
                }

                if (visibleCardMetadata.has('startTime')) {
                  firstRowMetadata.push({
                    label: 'Startzeit',
                    value: `${format(group.startTime, 'dd.MM.yyyy')} ${format(group.startTime, 'HH:mm:ss')}`,
                    icon: <ClockIcon className="h-4 w-4" />
                  });
                }

                // Zweite Zeile: Arbeitszeit, Pausen (vertikal untereinander, linksbündig)
                if (visibleCardMetadata.has('duration')) {
                  secondRowMetadata.push({
                    label: 'Arbeitszeit',
                    value: formatDistanceToNow(new Date(Date.now() - group.totalDuration), { locale: de, addSuffix: false }),
                    icon: <ClockIcon className="h-4 w-4" />
                  });
                }

                if (visibleCardMetadata.has('pauseTime')) {
                  secondRowMetadata.push({
                    label: 'Pausen',
                    value: totalPauseTime > 0 
                      ? formatDistanceToNow(new Date(Date.now() - totalPauseTime), { locale: de, addSuffix: false })
                      : '-',
                    icon: <ClockIcon className="h-4 w-4" />
                  });
                }

                // Niederlassung (falls angezeigt)
                if (visibleCardMetadata.has('branch')) {
                  metadata.push({
                    label: 'Niederlassung',
                    value: group.branch.name,
                    icon: <BuildingOfficeIcon className="h-4 w-4" />
                  });
                }

                // Action-Buttons
                const actions = (
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
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        title="Zeiterfassungen bearbeiten"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                );

                // Expandable Content für To-Dos und Requests
                const expandableContent = hasActivities ? (
                  <div>
                    {/* To-Dos */}
                    {showTodos && userTodosData && userTodosData.total > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          To-Dos ({selectedDate}): {userTodosData.completed} erledigt | {userTodosData.open} offen | {userTodosData.inProgress} in Bearbeitung
                        </h4>
                        {userTodosData.details && userTodosData.details.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {userTodosData.details.map((todo: any) => (
                              <div key={todo.id} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <span className={todo.status === 'done' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                                  {todo.status === 'done' ? '✓' : '○'}
                                </span>
                                <span className="font-medium">{todo.title}</span>
                                <span className="text-gray-400">({todo.status})</span>
                                <span className="text-gray-400">
                                  - {format(new Date(todo.updatedAt), 'HH:mm')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Requests */}
                    {showRequests && userRequestsData && userRequestsData.total > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Requests ({selectedDate}): {userRequestsData.approved} genehmigt | {userRequestsData.pending} offen
                        </h4>
                        {userRequestsData.details && userRequestsData.details.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {userRequestsData.details.map((request: any) => (
                              <div key={request.id} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <span className={request.status === 'approved' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                                  {request.status === 'approved' ? '✓' : '○'}
                                </span>
                                <span className="font-medium">{request.title}</span>
                                <span className="text-gray-400">({request.status})</span>
                                <span className="text-gray-400">
                                  - {format(new Date(request.createdAt), 'HH:mm')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : null;

                return (
                  <DataCard
                    key={group.user.id}
                    title={`${group.user.firstName} ${group.user.lastName}`}
                    metadata={metadata}
                    actions={actions}
                    expandable={expandableContent ? {
                      isExpanded: isExpanded,
                      content: expandableContent,
                      onToggle: () => toggleExpand(group.user.id)
                    } : undefined}
                  >
                    {/* Hauptinfos: Erste Zeile (Name, Startzeit) nebeneinander */}
                    {firstRowMetadata.length > 0 && (
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                        {firstRowMetadata.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-600 dark:text-gray-400"
                          >
                            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                            <span className="font-medium mr-1 whitespace-nowrap">{item.label}:</span>
                            <span className={item.className || 'text-gray-900 dark:text-white'}>
                              {typeof item.value === 'string' ? item.value : item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Zweite Zeile: Arbeitszeit, Pausen (vertikal untereinander, linksbündig) */}
                    {secondRowMetadata.length > 0 && (
                      <div className="flex flex-col gap-2 mb-3 sm:mb-4">
                        {secondRowMetadata.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-600 dark:text-gray-400"
                          >
                            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                            <span className="font-medium mr-1 whitespace-nowrap">{item.label}:</span>
                            <span className={item.className || 'text-gray-900 dark:text-white'}>
                              {typeof item.value === 'string' ? item.value : item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </DataCard>
                );
              })}
            </CardGrid>
          )}
        </div>
      )}

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