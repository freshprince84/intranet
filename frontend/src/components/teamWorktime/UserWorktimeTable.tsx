import React, { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { 
  PencilIcon, 
  ArrowDownTrayIcon, 
  XMarkIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  Bars3Icon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowsUpDownIcon
} from '@heroicons/react/24/outline';
import TableColumnConfig from '../TableColumnConfig.tsx';
import { useTableSettings } from '../../hooks/useTableSettings.ts';

interface UserWorktimeTableProps {
  worktimes: any[];
  loading: boolean;
  onUpdate: (id: number, startTime: string, endTime: string | null) => Promise<void>;
}

// Definition der verfügbaren Spalten
const availableColumns = [
  { id: 'startTime', label: 'Startzeit' },
  { id: 'endTime', label: 'Endzeit' },
  { id: 'duration', label: 'Dauer' },
  { id: 'branch', label: 'Niederlassung' },
  { id: 'actions', label: 'Aktionen' }
];

// Standardreihenfolge der Spalten
const defaultColumnOrder = ['startTime', 'endTime', 'duration', 'branch', 'actions'];

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface FilterState {
  branch: string;
  startDateFrom: string;
  startDateTo: string;
  endDateFrom: string;
  endDateTo: string;
}

const UserWorktimeTable: React.FC<UserWorktimeTableProps> = ({
  worktimes,
  loading,
  onUpdate
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStartTime, setEditStartTime] = useState<string>('');
  const [editEndTime, setEditEndTime] = useState<string>('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'startTime', direction: 'asc' });
  const [filterState, setFilterState] = useState<FilterState>({
    branch: '',
    startDateFrom: '',
    startDateTo: '',
    endDateFrom: '',
    endDateTo: ''
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  // Spalten-Konfiguration mit Hook
  const { 
    settings,
    updateColumnOrder,
    updateHiddenColumns,
    isColumnVisible
  } = useTableSettings('user_worktime_table', {
    defaultColumnOrder: defaultColumnOrder
  });

  // Benutze die vom Hook zurückgegebenen Werte
  const columnOrder = settings.columnOrder;
  const hiddenColumns = settings.hiddenColumns;

  // Starte die Bearbeitung einer Zeiterfassung
  const handleStartEdit = (worktime: any) => {
    // Entferne das 'Z' am Ende des Strings, damit JS den Zeitstempel nicht als UTC interpretiert
    const startISOString = worktime.startTime.endsWith('Z')
      ? worktime.startTime.substring(0, worktime.startTime.length - 1)
      : worktime.startTime;
    
    const startTime = new Date(startISOString);
    const formattedStartDate = format(startTime, 'yyyy-MM-dd');
    const formattedStartTime = format(startTime, 'HH:mm:ss');
    
    setEditStartTime(`${formattedStartDate}T${formattedStartTime}`);
    
    if (worktime.endTime) {
      const endISOString = worktime.endTime.endsWith('Z')
        ? worktime.endTime.substring(0, worktime.endTime.length - 1)
        : worktime.endTime;
      
      const endTime = new Date(endISOString);
      const formattedEndDate = format(endTime, 'yyyy-MM-dd');
      const formattedEndTime = format(endTime, 'HH:mm:ss');
      
      setEditEndTime(`${formattedEndDate}T${formattedEndTime}`);
    } else {
      setEditEndTime('');
    }
    
    setEditingId(worktime.id);
  };

  // Breche die Bearbeitung ab
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditStartTime('');
    setEditEndTime('');
  };

  // Speichere die Änderungen
  const handleSaveEdit = async (id: number) => {
    try {
      setSavingId(id);
      
      await onUpdate(
        id,
        editStartTime,
        editEndTime ? editEndTime : null
      );
      
      setEditingId(null);
      setEditStartTime('');
      setEditEndTime('');
    } catch (error) {
      console.error('Fehler beim Speichern der Änderungen:', error);
    } finally {
      setSavingId(null);
    }
  };

  // Formatiere die Dauer einer Zeiterfassung
  const formatDuration = (startTime: Date, endTime: Date | null): string => {
    if (!endTime) return '-';
    
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    
    return `${durationHours.toFixed(2)}h`;
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

  // Filtern und sortieren der Zeiterfassungen
  const filteredAndSortedWorktimes = useMemo(() => {
    // Filtern nach Suchbegriff und anderen Filterkriterien
    let filtered = worktimes.filter(worktime => {
      // Branch-Filter
      const branch = worktime.branch?.name?.toLowerCase() || '';
      const branchMatch = !filterState.branch || branch.includes(filterState.branch.toLowerCase());
      
      // Datum/Zeit-Filter
      let startTimeMatch = true;
      let endTimeMatch = true;
      
      // Entferne 'Z' für korrekte Interpretation
      const startISOString = worktime.startTime.endsWith('Z')
        ? worktime.startTime.substring(0, worktime.startTime.length - 1)
        : worktime.startTime;
      
      const startTime = new Date(startISOString);
      
      // Prüfe startDateFrom
      if (filterState.startDateFrom) {
        const fromDate = new Date(filterState.startDateFrom);
        startTimeMatch = startTimeMatch && startTime >= fromDate;
      }
      
      // Prüfe startDateTo
      if (filterState.startDateTo) {
        const toDate = new Date(filterState.startDateTo);
        toDate.setHours(23, 59, 59, 999); // Ende des Tages
        startTimeMatch = startTimeMatch && startTime <= toDate;
      }
      
      // Endzeit-Filter nur anwenden, wenn Endzeit vorhanden
      if (worktime.endTime) {
        const endISOString = worktime.endTime.endsWith('Z')
          ? worktime.endTime.substring(0, worktime.endTime.length - 1)
          : worktime.endTime;
        
        const endTime = new Date(endISOString);
        
        // Prüfe endDateFrom
        if (filterState.endDateFrom) {
          const fromDate = new Date(filterState.endDateFrom);
          endTimeMatch = endTimeMatch && endTime >= fromDate;
        }
        
        // Prüfe endDateTo
        if (filterState.endDateTo) {
          const toDate = new Date(filterState.endDateTo);
          toDate.setHours(23, 59, 59, 999); // Ende des Tages
          endTimeMatch = endTimeMatch && endTime <= toDate;
        }
      }
      
      // Alle Bedingungen müssen erfüllt sein
      return branchMatch && startTimeMatch && endTimeMatch;
    });
    
    // Sortieren
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let valueA: number | null | undefined;
        let valueB: number | null | undefined;
        
        if (sortConfig.key === 'startTime' || sortConfig.key === 'endTime') {
          // Entferne 'Z' für korrekte Interpretation
          const aISOString = a[sortConfig.key] ? (a[sortConfig.key].endsWith('Z')
            ? a[sortConfig.key].substring(0, a[sortConfig.key].length - 1)
            : a[sortConfig.key]) : null;
          
          const bISOString = b[sortConfig.key] ? (b[sortConfig.key].endsWith('Z')
            ? b[sortConfig.key].substring(0, b[sortConfig.key].length - 1)
            : b[sortConfig.key]) : null;
          
          // Wenn einer der Werte null ist (z.B. bei endTime)
          if (!aISOString && !bISOString) return 0;
          if (!aISOString) return sortConfig.direction === 'asc' ? 1 : -1;
          if (!bISOString) return sortConfig.direction === 'asc' ? -1 : 1;
          
          valueA = new Date(aISOString).getTime();
          valueB = new Date(bISOString).getTime();
        } else if (sortConfig.key === 'duration') {
          // Berechne Dauer für Sortierung
          const startAISOString = a.startTime.endsWith('Z')
            ? a.startTime.substring(0, a.startTime.length - 1)
            : a.startTime;
          
          const startBISOString = b.startTime.endsWith('Z')
            ? b.startTime.substring(0, b.startTime.length - 1)
            : b.startTime;
          
          const startA = new Date(startAISOString).getTime();
          const startB = new Date(startBISOString).getTime();
          
          let endA = null, endB = null;
          
          if (a.endTime) {
            const endAISOString = a.endTime.endsWith('Z')
              ? a.endTime.substring(0, a.endTime.length - 1)
              : a.endTime;
            endA = new Date(endAISOString).getTime();
          }
          
          if (b.endTime) {
            const endBISOString = b.endTime.endsWith('Z')
              ? b.endTime.substring(0, b.endTime.length - 1)
              : b.endTime;
            endB = new Date(endBISOString).getTime();
          }
          
          // Berechne Dauer, falls möglich
          valueA = endA ? endA - startA : null;
          valueB = endB ? endB - startB : null;
          
          // Wenn einer der Werte null ist
          if (valueA === null && valueB === null) return 0;
          if (valueA === null) return sortConfig.direction === 'asc' ? 1 : -1;
          if (valueB === null) return sortConfig.direction === 'asc' ? -1 : 1;
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
  }, [worktimes, filterState, sortConfig]);

  // Render-Methode für Spaltenheader
  const renderSortableHeader = (columnId: string, label: string) => {
    const isSorted = sortConfig.key === columnId;
    
    return (
      <th
        scope="col"
        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group relative"
        onClick={() => handleSort(columnId)}
        draggable
        onDragStart={() => handleDragStart(columnId)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, columnId)}
        onDragEnd={handleDragEnd}
      >
        <div className={`flex items-center ${draggedColumn === columnId ? 'opacity-50' : ''}`}>
          <ArrowsUpDownIcon className="h-3 w-3 mr-1 text-gray-400" />
          {label} {isSorted && (
            sortConfig.direction === 'asc' ? '↑' : '↓'
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="mt-6">
      {/* Header mit Suche und Filteroptionen */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Zeiterfassungen ({filteredAndSortedWorktimes.length})
        </h3>
        
        <div className="flex flex-wrap items-center">
          {/* Filterschaltfläche */}
          <button
            type="button"
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            title="Filter anzeigen"
          >
            <FunnelIcon className="h-5 w-5" />
          </button>
          
          {/* Spaltenkonfiguration */}
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
        <div className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="branch-filter" className="block text-sm font-medium text-gray-700">Niederlassung</label>
              <input
                id="branch-filter"
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={filterState.branch}
                onChange={(e) => setFilterState({...filterState, branch: e.target.value})}
              />
            </div>
            
            <div>
              <label htmlFor="startDate-from" className="block text-sm font-medium text-gray-700">Startzeit von</label>
              <input
                id="startDate-from"
                type="date"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={filterState.startDateFrom}
                onChange={(e) => setFilterState({...filterState, startDateFrom: e.target.value})}
              />
            </div>
            
            <div>
              <label htmlFor="startDate-to" className="block text-sm font-medium text-gray-700">Startzeit bis</label>
              <input
                id="startDate-to"
                type="date"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={filterState.startDateTo}
                onChange={(e) => setFilterState({...filterState, startDateTo: e.target.value})}
              />
            </div>
            
            <div>
              <label htmlFor="endDate-from" className="block text-sm font-medium text-gray-700">Endzeit von</label>
              <input
                id="endDate-from"
                type="date"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={filterState.endDateFrom}
                onChange={(e) => setFilterState({...filterState, endDateFrom: e.target.value})}
              />
            </div>
            
            <div>
              <label htmlFor="endDate-to" className="block text-sm font-medium text-gray-700">Endzeit bis</label>
              <input
                id="endDate-to"
                type="date"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={filterState.endDateTo}
                onChange={(e) => setFilterState({...filterState, endDateTo: e.target.value})}
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end space-x-2">
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => setFilterState({
                branch: '',
                startDateFrom: '',
                startDateTo: '',
                endDateFrom: '',
                endDateTo: ''
              })}
            >
              Zurücksetzen
            </button>
          </div>
        </div>
      )}
      
      <div className="border-0 rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
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
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
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
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedWorktimes.length === 0 ? (
              <tr>
                <td 
                  colSpan={columnOrder.filter(id => !hiddenColumns.includes(id)).length} 
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  Keine Zeiterfassungen für diesen Tag gefunden
                </td>
              </tr>
            ) : (
              filteredAndSortedWorktimes.map((worktime) => {
                // Entferne das 'Z' am Ende des Strings, damit JS den Zeitstempel nicht als UTC interpretiert
                const startISOString = worktime.startTime.endsWith('Z')
                  ? worktime.startTime.substring(0, worktime.startTime.length - 1)
                  : worktime.startTime;
                
                const startTime = new Date(startISOString);
                
                let endTime: Date | null = null;
                if (worktime.endTime) {
                  const endISOString = worktime.endTime.endsWith('Z')
                    ? worktime.endTime.substring(0, worktime.endTime.length - 1)
                    : worktime.endTime;
                  
                  endTime = new Date(endISOString);
                }
                
                return (
                  <tr key={worktime.id}>
                    {columnOrder
                      .filter(columnId => !hiddenColumns.includes(columnId))
                      .map(columnId => {
                        if (columnId === 'startTime') {
                          return (
                            <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                              {editingId === worktime.id ? (
                                <input
                                  type="datetime-local"
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                  value={editStartTime}
                                  onChange={(e) => setEditStartTime(e.target.value)}
                                  step="1"
                                />
                              ) : (
                                <div className="text-sm text-gray-900">
                                  {format(startTime, 'dd.MM.yyyy HH:mm:ss')}
                                </div>
                              )}
                            </td>
                          );
                        }
                        
                        if (columnId === 'endTime') {
                          return (
                            <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                              {editingId === worktime.id ? (
                                <input
                                  type="datetime-local"
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                  value={editEndTime}
                                  onChange={(e) => setEditEndTime(e.target.value)}
                                  step="1"
                                />
                              ) : (
                                <div className="text-sm text-gray-900">
                                  {endTime ? format(endTime, 'dd.MM.yyyy HH:mm:ss') : '-'}
                                </div>
                              )}
                            </td>
                          );
                        }
                        
                        if (columnId === 'duration') {
                          return (
                            <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatDuration(startTime, endTime)}
                              </div>
                            </td>
                          );
                        }
                        
                        if (columnId === 'branch') {
                          return (
                            <td key={columnId} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {worktime.branch.name}
                            </td>
                          );
                        }
                        
                        if (columnId === 'actions') {
                          return (
                            <td key={columnId} className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {editingId === worktime.id ? (
                                <div className="flex justify-end space-x-2">
                                  <button
                                    type="button"
                                    className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    onClick={() => handleSaveEdit(worktime.id)}
                                    disabled={savingId === worktime.id}
                                  >
                                    <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                                    {savingId === worktime.id ? 'Speichern...' : 'Speichern'}
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    onClick={handleCancelEdit}
                                    disabled={savingId === worktime.id}
                                  >
                                    <XMarkIcon className="h-4 w-4 mr-1" />
                                    Abbrechen
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                  onClick={() => handleStartEdit(worktime)}
                                >
                                  <PencilIcon className="h-4 w-4 mr-1" />
                                  Bearbeiten
                                </button>
                              )}
                            </td>
                          );
                        }
                        
                        return null;
                      })
                    }
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserWorktimeTable; 