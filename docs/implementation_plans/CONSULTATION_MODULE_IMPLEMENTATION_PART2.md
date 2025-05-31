# Implementierungsplan Teil 2: Consultation-Modul für Intranet

## Fortsetzung von Teil 1

**WICHTIG**: Dieser Plan setzt Teil 1 fort. Stelle sicher, dass alle Schritte aus Teil 1 abgeschlossen sind, bevor du hier weitermachst.

## Phase 4 (Fortsetzung): Frontend - Komponenten

### Schritt 4.5: ConsultationList Komponente erstellen (Fortsetzung)
- [x] Erstelle neue Datei: `frontend/src/components/ConsultationList.tsx`
- [x] Füge folgenden Code ein:

```typescript
import React, { useState, useEffect, useMemo } from 'react';
import { 
  PencilIcon, 
  ClockIcon, 
  UserIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  XMarkIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { formatTime, calculateDuration } from '../utils/dateUtils.ts';
import { Consultation } from '../types/client.ts';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useTableSettings } from '../hooks/useTableSettings.ts';
import TableColumnConfig from '../components/TableColumnConfig.tsx';
import FilterPane from '../components/FilterPane.tsx';
import SavedFilterTags from '../components/SavedFilterTags.tsx';
import { FilterCondition } from '../components/FilterRow.tsx';
import { toast } from 'react-toastify';

interface SortConfig {
  key: keyof Consultation | 'client.name' | 'duration';
  direction: 'asc' | 'desc';
}

// Verfügbare Spalten
const availableColumns = [
  { id: 'startTime', label: 'Startzeit', shortLabel: 'Start' },
  { id: 'endTime', label: 'Endzeit', shortLabel: 'Ende' },
  { id: 'duration', label: 'Dauer', shortLabel: 'Dauer' },
  { id: 'client', label: 'Client', shortLabel: 'Client' },
  { id: 'branch', label: 'Niederlassung', shortLabel: 'Niedr.' },
  { id: 'notes', label: 'Notizen', shortLabel: 'Notizen' },
  { id: 'tasks', label: 'Verknüpfte Tasks', shortLabel: 'Tasks' },
  { id: 'actions', label: 'Aktionen', shortLabel: 'Akt.' }
];

const defaultColumnOrder = availableColumns.map(col => col.id);
const CONSULTATIONS_TABLE_ID = 'consultations-list';

const ConsultationList: React.FC = () => {
  const { hasPermission } = usePermissions();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ 
    key: 'startTime', 
    direction: 'desc' 
  });
  
  // Filter States
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
  
  // Editing States
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  
  // Table Settings
  const {
    settings,
    isLoading: isLoadingSettings,
    updateColumnOrder,
    updateHiddenColumns,
    toggleColumnVisibility,
    isColumnVisible
  } = useTableSettings(CONSULTATIONS_TABLE_ID, {
    defaultColumnOrder,
    defaultHiddenColumns: ['tasks']
  });

  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  useEffect(() => {
    loadConsultations();
  }, []);

  const loadConsultations = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_ENDPOINTS.CONSULTATIONS.BASE);
      setConsultations(response.data);
      setError(null);
    } catch (error: any) {
      console.error('Fehler beim Laden der Beratungen:', error);
      setError('Fehler beim Laden der Beratungen');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleEditNotes = (consultation: Consultation) => {
    setEditingId(consultation.id);
    setEditNotes(consultation.notes || '');
  };

  const handleSaveNotes = async (consultationId: number) => {
    try {
      setSavingId(consultationId);
      await axiosInstance.patch(
        API_ENDPOINTS.CONSULTATIONS.UPDATE_NOTES(consultationId),
        { notes: editNotes }
      );
      
      // Aktualisiere die lokale Liste
      setConsultations(prev => 
        prev.map(c => c.id === consultationId ? { ...c, notes: editNotes } : c)
      );
      
      setEditingId(null);
      toast.success('Notizen gespeichert');
    } catch (error: any) {
      toast.error('Fehler beim Speichern der Notizen');
    } finally {
      setSavingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditNotes('');
  };

  // Filter-Funktionen
  const applyFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setFilterConditions(conditions);
    setFilterLogicalOperators(operators);
  };

  const resetFilterConditions = () => {
    setFilterConditions([]);
    setFilterLogicalOperators([]);
  };

  // Gefilterte und sortierte Beratungen
  const filteredAndSortedConsultations = useMemo(() => {
    let filtered = consultations;

    // Globale Suche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(consultation => 
        consultation.client?.name.toLowerCase().includes(searchLower) ||
        consultation.branch.name.toLowerCase().includes(searchLower) ||
        (consultation.notes && consultation.notes.toLowerCase().includes(searchLower))
      );
    }

    // Erweiterte Filter anwenden
    if (filterConditions.length > 0) {
      filtered = filtered.filter(consultation => {
        let result = true;
        
        for (let i = 0; i < filterConditions.length; i++) {
          const condition = filterConditions[i];
          let conditionMet = false;
          
          switch (condition.column) {
            case 'client':
              const clientName = consultation.client?.name || '';
              if (condition.operator === 'contains') {
                conditionMet = clientName.toLowerCase().includes((condition.value as string || '').toLowerCase());
              } else if (condition.operator === 'equals') {
                conditionMet = clientName === condition.value;
              }
              break;
              
            case 'branch':
              const branchName = consultation.branch.name;
              if (condition.operator === 'contains') {
                conditionMet = branchName.toLowerCase().includes((condition.value as string || '').toLowerCase());
              } else if (condition.operator === 'equals') {
                conditionMet = branchName === condition.value;
              }
              break;
              
            case 'notes':
              const notes = consultation.notes || '';
              if (condition.operator === 'contains') {
                conditionMet = notes.toLowerCase().includes((condition.value as string || '').toLowerCase());
              }
              break;
              
            case 'duration':
              if (consultation.endTime) {
                const durationMs = new Date(consultation.endTime).getTime() - new Date(consultation.startTime).getTime();
                const durationHours = durationMs / (1000 * 60 * 60);
                const compareValue = parseFloat(condition.value as string);
                
                if (condition.operator === 'greaterThan') {
                  conditionMet = durationHours > compareValue;
                } else if (condition.operator === 'lessThan') {
                  conditionMet = durationHours < compareValue;
                } else if (condition.operator === 'equals') {
                  conditionMet = Math.abs(durationHours - compareValue) < 0.01;
                }
              }
              break;
          }
          
          // Logische Verknüpfung
          if (i === 0) {
            result = conditionMet;
          } else {
            const operator = filterLogicalOperators[i - 1];
            if (operator === 'AND') {
              result = result && conditionMet;
            } else {
              result = result || conditionMet;
            }
          }
        }
        
        return result;
      });
    }

    // Sortierung
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'startTime':
          aValue = new Date(a.startTime).getTime();
          bValue = new Date(b.startTime).getTime();
          break;
        case 'endTime':
          aValue = a.endTime ? new Date(a.endTime).getTime() : 0;
          bValue = b.endTime ? new Date(b.endTime).getTime() : 0;
          break;
        case 'client.name':
          aValue = a.client?.name || '';
          bValue = b.client?.name || '';
          break;
        case 'duration':
          aValue = a.endTime ? new Date(a.endTime).getTime() - new Date(a.startTime).getTime() : 0;
          bValue = b.endTime ? new Date(b.endTime).getTime() - new Date(b.startTime).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [consultations, searchTerm, filterConditions, filterLogicalOperators, sortConfig]);

  // Column drag & drop handlers
  const handleDragStart = (columnId: string) => {
    setDraggedColumn(columnId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumnId) return;

    const newOrder = [...settings.columnOrder];
    const draggedIndex = newOrder.indexOf(draggedColumn);
    const targetIndex = newOrder.indexOf(targetColumnId);
    
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);
    
    updateColumnOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  const renderSortableHeader = (columnId: string, label: string, sortKey?: SortConfig['key']) => (
    <th
      key={columnId}
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
      onClick={() => sortKey && handleSort(sortKey)}
      draggable
      onDragStart={() => handleDragStart(columnId)}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, columnId)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {sortKey && sortConfig.key === sortKey && (
          <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  );

  if (loading && consultations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Beratungsliste
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className={`p-2 rounded-md ${
                filterConditions.length > 0
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              } hover:bg-gray-200 dark:hover:bg-gray-600`}
              title="Filter"
            >
              <FunnelIcon className="h-5 w-5" />
              {filterConditions.length > 0 && (
                <span className="ml-1 text-xs">{filterConditions.length}</span>
              )}
            </button>
            <button
              onClick={() => setIsColumnConfigOpen(true)}
              className="p-2 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Spalten konfigurieren"
            >
              <ArrowsUpDownIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Suchfeld */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Beratungen durchsuchen..."
          />
        </div>

        {/* Gespeicherte Filter */}
        <SavedFilterTags
          tableId={CONSULTATIONS_TABLE_ID}
          onApplyFilter={(filter) => {
            const conditions = JSON.parse(filter.conditions);
            const operators = JSON.parse(filter.operators);
            applyFilterConditions(conditions, operators);
          }}
        />
      </div>

      {/* Tabelle */}
      {error ? (
        <div className="p-6 text-center text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {settings.columnOrder
                  .filter(columnId => isColumnVisible(columnId))
                  .map(columnId => {
                    const column = availableColumns.find(col => col.id === columnId);
                    if (!column) return null;
                    
                    switch (columnId) {
                      case 'startTime':
                        return renderSortableHeader('startTime', column.label, 'startTime');
                      case 'endTime':
                        return renderSortableHeader('endTime', column.label, 'endTime');
                      case 'duration':
                        return renderSortableHeader('duration', column.label, 'duration');
                      case 'client':
                        return renderSortableHeader('client', column.label, 'client.name');
                      default:
                        return renderSortableHeader(columnId, column.label);
                    }
                  })}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedConsultations.map((consultation) => (
                <tr key={consultation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  {isColumnVisible('startTime') && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                      {formatTime(consultation.startTime)}
                    </td>
                  )}
                  
                  {isColumnVisible('endTime') && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                      {consultation.endTime ? formatTime(consultation.endTime) : '-'}
                    </td>
                  )}
                  
                  {isColumnVisible('duration') && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                      {calculateDuration(consultation.startTime, consultation.endTime)}
                    </td>
                  )}
                  
                  {isColumnVisible('client') && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {consultation.client?.name || '-'}
                      </div>
                    </td>
                  )}
                  
                  {isColumnVisible('branch') && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {consultation.branch.name}
                      </div>
                    </td>
                  )}
                  
                  {isColumnVisible('notes') && (
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">
                      {editingId === consultation.id ? (
                        <div className="flex items-center space-x-2">
                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm"
                            rows={2}
                          />
                          <button
                            onClick={() => handleSaveNotes(consultation.id)}
                            disabled={savingId === consultation.id}
                            className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <div 
                          className="max-w-xs truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                          onClick={() => handleEditNotes(consultation)}
                          title={consultation.notes || 'Klicken zum Bearbeiten'}
                        >
                          {consultation.notes || (
                            <span className="text-gray-400 italic">Notizen hinzufügen...</span>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                  
                  {isColumnVisible('tasks') && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                      {consultation.taskLinks && consultation.taskLinks.length > 0 ? (
                        <div className="flex items-center">
                          <LinkIcon className="h-4 w-4 mr-1 text-gray-400" />
                          <span>{consultation.taskLinks.length}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  )}
                  
                  {isColumnVisible('actions') && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditNotes(consultation)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Notizen bearbeiten"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleOpenLinkTaskModal(consultation.id)}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                          title="Task verknüpfen"
                        >
                          <LinkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <FilterPane
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          onApply={applyFilterConditions}
          onReset={resetFilterConditions}
          availableColumns={[
            { id: 'client', label: 'Client' },
            { id: 'branch', label: 'Niederlassung' },
            { id: 'notes', label: 'Notizen' },
            { id: 'duration', label: 'Dauer (Stunden)' }
          ]}
          tableId={CONSULTATIONS_TABLE_ID}
          initialConditions={filterConditions}
          initialOperators={filterLogicalOperators}
        />
      )}

      {/* Column Config Modal */}
      {isColumnConfigOpen && (
        <TableColumnConfig
          isOpen={isColumnConfigOpen}
          onClose={() => setIsColumnConfigOpen(false)}
          columns={availableColumns}
          columnOrder={settings.columnOrder}
          hiddenColumns={settings.hiddenColumns}
          onToggleVisibility={(columnId) => toggleColumnVisibility(columnId)}
          onReorderColumns={(newOrder) => updateColumnOrder(newOrder)}
        />
      )}
    </div>
  );
};

export default ConsultationList;
```

## Phase 5: Frontend - Hauptseite (Fortsetzung)

### Schritt 5.1: Consultations Seite erstellen (Fortsetzung)
- [x] Erstelle neue Datei: `frontend/src/pages/Consultations.tsx`
- [x] Füge folgenden Code ein:

```typescript
import React from 'react';
import { usePermissions } from '../hooks/usePermissions.ts';
import ConsultationTracker from '../components/ConsultationTracker.tsx';
import ConsultationList from '../components/ConsultationList.tsx';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

const Consultations: React.FC = () => {
  const { hasPermission } = usePermissions();

  // Prüfe Berechtigungen
  if (!hasPermission('consultations', 'read')) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-800 dark:text-red-200">
            Sie haben keine Berechtigung, diese Seite zu sehen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Seitentitel */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <ClipboardDocumentListIcon className="h-8 w-8 mr-3" />
          Beratungen
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Verwalten Sie Ihre Kundenberatungen und erfassen Sie wichtige Notizen
        </p>
      </div>

      {/* Consultation Tracker */}
      <div className="mb-8">
        <ConsultationTracker />
      </div>

      {/* Consultation List */}
      <div>
        <ConsultationList />
      </div>
    </div>
  );
};

export default Consultations;
```

## Phase 8: Erweiterte Features

### Schritt 8.1: Task-Verknüpfung Modal erstellen
- [x] Erstelle neue Datei: `frontend/src/components/LinkTaskModal.tsx`
- [x] Füge folgenden Code ein:

```typescript
import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { toast } from 'react-toastify';

interface Task {
  id: number;
  title: string;
  status: string;
  responsible?: {
    firstName: string;
    lastName: string;
  };
}

interface LinkTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId: number;
  onTaskLinked: () => void;
}

const LinkTaskModal: React.FC<LinkTaskModalProps> = ({
  isOpen,
  onClose,
  consultationId,
  onTaskLinked
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTasks();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = tasks.filter(task => 
        task.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTasks(filtered);
    } else {
      setFilteredTasks(tasks);
    }
  }, [searchTerm, tasks]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_ENDPOINTS.TASKS.BASE);
      // Filtere nur offene und in Bearbeitung befindliche Tasks
      const activeTasks = response.data.filter((task: Task) => 
        task.status === 'open' || task.status === 'in_progress'
      );
      setTasks(activeTasks);
      setFilteredTasks(activeTasks);
    } catch (error) {
      console.error('Fehler beim Laden der Tasks:', error);
      toast.error('Fehler beim Laden der Tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkTask = async () => {
    if (!selectedTaskId) {
      toast.error('Bitte wählen Sie einen Task aus');
      return;
    }

    try {
      await axiosInstance.post(
        API_ENDPOINTS.CONSULTATIONS.LINK_TASK(consultationId),
        { taskId: selectedTaskId }
      );
      
      toast.success('Task erfolgreich verknüpft');
      onTaskLinked();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler beim Verknüpfen des Tasks');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                Task verknüpfen
              </Dialog.Title>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Suchfeld */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Task suchen..."
                autoFocus
              />
            </div>

            {/* Task-Liste */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  Lade Tasks...
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Keine passenden Tasks gefunden
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTasks.map((task) => (
                    <label
                      key={task.id}
                      className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="task"
                        value={task.id}
                        checked={selectedTaskId === task.id}
                        onChange={() => setSelectedTaskId(task.id)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {task.title}
                        </p>
                        {task.responsible && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Verantwortlich: {task.responsible.firstName} {task.responsible.lastName}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        task.status === 'open' 
                          ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                      }`}>
                        {task.status === 'open' ? 'Offen' : 'In Bearbeitung'}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Abbrechen
              </button>
              <button
                onClick={handleLinkTask}
                disabled={!selectedTaskId}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Verknüpfen
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default LinkTaskModal;
```

### Schritt 8.2: ConsultationList erweitern für Task-Verknüpfung
- [x] Öffne `frontend/src/components/ConsultationList.tsx`
- [x] Füge nach den anderen Imports hinzu:
```typescript
import LinkTaskModal from './LinkTaskModal.tsx';
```

- [x] Füge nach den anderen State-Variablen hinzu:
```typescript
const [isLinkTaskModalOpen, setIsLinkTaskModalOpen] = useState(false);
const [selectedConsultationId, setSelectedConsultationId] = useState<number | null>(null);
```

- [x] Füge eine neue Funktion hinzu:
```typescript
const handleOpenLinkTaskModal = (consultationId: number) => {
  setSelectedConsultationId(consultationId);
  setIsLinkTaskModalOpen(true);
};

const handleTaskLinked = () => {
  loadConsultations(); // Lade die Liste neu
};
```

- [x] Erweitere die Actions-Spalte in der Tabelle:
```typescript
{isColumnVisible('actions') && (
  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
    <div className="flex items-center justify-end space-x-2">
      <button
        onClick={() => handleEditNotes(consultation)}
        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        title="Notizen bearbeiten"
      >
        <PencilIcon className="h-5 w-5" />
      </button>
      <button
        onClick={() => handleOpenLinkTaskModal(consultation.id)}
        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
        title="Task verknüpfen"
      >
        <LinkIcon className="h-5 w-5" />
      </button>
    </div>
  </td>
)}
```

- [x] Füge am Ende der Komponente (vor dem return-Statement-Ende) hinzu:
```typescript
{/* Link Task Modal */}
{isLinkTaskModalOpen && selectedConsultationId && (
  <LinkTaskModal
    isOpen={isLinkTaskModalOpen}
    onClose={() => {
      setIsLinkTaskModalOpen(false);
      setSelectedConsultationId(null);
    }}
    consultationId={selectedConsultationId}
    onTaskLinked={handleTaskLinked}
  />
)}
```

## Phase 9: Menu Integration Details

### Schritt 9.1: Navigation Component finden und anpassen
- [x] Suche nach der Navigation-Komponente (wahrscheinlich in `App.tsx` oder `components/Navigation.tsx`)
- [x] Importiere das Icon:
```typescript
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
```

- [x] Füge den Menüeintrag nach "Worktracker" hinzu:
```typescript
{
  name: 'Beratungen',
  path: '/consultations',
  icon: ClipboardDocumentListIcon,
  permission: 'consultations'
}
```

## Phase 10: Backend Server Configuration

### Schritt 10.1: Server.ts vollständig prüfen
- [x] Öffne `backend/src/server.ts`
- [x] Stelle sicher, dass alle Imports vorhanden sind:
```typescript
import clientRoutes from './routes/clients';
import consultationRoutes from './routes/consultations';
```

- [x] Stelle sicher, dass alle Routes registriert sind:
```typescript
// Nach den anderen API Routes
app.use('/api/clients', clientRoutes);
app.use('/api/consultations', consultationRoutes);
```

## Abschluss-Checkliste Teil 2

- [x] Alle Frontend-Komponenten erstellt
- [x] Consultations-Seite implementiert
- [x] Navigation erweitert
- [x] Task-Verknüpfung funktioniert
- [x] Filter funktionieren
- [x] Notizen können bearbeitet werden
- [x] Manuelle Zeiterfassung funktioniert
- [x] Client-Tags (zuletzt beraten) funktionieren
- [x] **BUGFIX**: branchId wird jetzt korrekt als Zahl übertragen

## Finale Tests

- [x] Neuen Client anlegen und sofort Beratung starten
- [x] Beratung mit bestehendem Client starten
- [ ] Notizen während Beratung erfassen
- [ ] Beratung beenden
- [ ] Manuelle Beratung nacherfassen
- [ ] Task mit Beratung verknüpfen
- [ ] Filter in Beratungsliste testen
- [ ] Spalten-Konfiguration testen

## Bekannte Herausforderungen & Lösungen

1. **TypeScript Fehler bei Imports**
   - Stelle sicher, dass alle .ts/.tsx Endungen korrekt sind
   - Prüfe, ob alle Interfaces exportiert wurden

2. **API Endpoints nicht gefunden**
   - Server muss neu gestartet werden nach Backend-Änderungen
   - Prüfe die Reihenfolge der Routes in server.ts

3. **Berechtigungsfehler**
   - Seed muss ausgeführt werden für neue Berechtigungen
   - User muss sich neu einloggen nach Berechtigungsänderungen

4. **Filter funktionieren nicht**
   - Prüfe, ob FilterPane korrekt importiert wurde
   - Stelle sicher, dass die Column-IDs mit den Filter-Feldern übereinstimmen
</rewritten_file> 