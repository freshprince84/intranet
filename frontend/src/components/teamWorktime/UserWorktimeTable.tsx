import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  ArrowsUpDownIcon,
  CheckIcon,
  ArrowPathIcon
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
  const { t } = useTranslation();
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
    return [...worktimes]
      .filter(worktime => {
        // Suche
        const branchName = worktime.branch?.name?.toLowerCase() || '';
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = searchTerm === '' || branchName.includes(searchLower);
        
        // Filter
        const matchesBranch = !filterState.branch || worktime.branch?.name === filterState.branch;
        
        const startTime = new Date(worktime.startTime);
        const startDateFrom = filterState.startDateFrom ? new Date(filterState.startDateFrom) : null;
        const startDateTo = filterState.startDateTo ? new Date(filterState.startDateTo) : null;
        
        const matchesStartDate = (
          (!startDateFrom || startTime >= startDateFrom) &&
          (!startDateTo || startTime <= startDateTo)
        );
        
        const endTime = worktime.endTime ? new Date(worktime.endTime) : null;
        const endDateFrom = filterState.endDateFrom ? new Date(filterState.endDateFrom) : null;
        const endDateTo = filterState.endDateTo ? new Date(filterState.endDateTo) : null;
        
        const matchesEndDate = (
          !worktime.endTime ||
          (!endDateFrom || (endTime && endTime >= endDateFrom)) &&
          (!endDateTo || (endTime && endTime <= endDateTo))
        );
        
        return matchesSearch && matchesBranch && matchesStartDate && matchesEndDate;
      })
      .sort((a, b) => {
        // Sortierung
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (sortConfig.key === 'branch') {
          const aName = a.branch?.name || '';
          const bName = b.branch?.name || '';
          return sortConfig.direction === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
        }
        
        if (sortConfig.key === 'duration') {
          const aStart = new Date(a.startTime);
          const aEnd = a.endTime ? new Date(a.endTime) : null;
          const aDuration = aEnd ? aEnd.getTime() - aStart.getTime() : 0;
          
          const bStart = new Date(b.startTime);
          const bEnd = b.endTime ? new Date(b.endTime) : null;
          const bDuration = bEnd ? bEnd.getTime() - bStart.getTime() : 0;
          
          return sortConfig.direction === 'asc' ? aDuration - bDuration : bDuration - aDuration;
        }
        
        if (!aValue || !bValue) return 0;
        
        if (sortConfig.key === 'startTime' || sortConfig.key === 'endTime') {
          const aDate = new Date(aValue);
          const bDate = new Date(bValue);
          return sortConfig.direction === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
        }
        
        return sortConfig.direction === 'asc'
          ? aValue.toString().localeCompare(bValue.toString())
          : bValue.toString().localeCompare(aValue.toString());
      });
  }, [worktimes, searchTerm, filterState, sortConfig]);

  // Rendere die Kopfzeile mit Sortierbarkeit
  const renderSortableHeader = (columnId: string, label: string) => {
    return (
      <th
        key={columnId}
        draggable
        onDragStart={() => handleDragStart(columnId)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, columnId)}
        onDragEnd={handleDragEnd}
        className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none ${
          draggedColumn === columnId ? 'opacity-50 bg-blue-100 dark:bg-blue-900/30' : ''
        }`}
        style={{ minWidth: columnId === 'actions' ? '120px' : '150px' }}
      >
        <div className="flex items-center text-gray-500 dark:text-gray-300" onClick={() => handleSort(columnId)}>
          {label}
          {sortConfig.key === columnId ? (
            sortConfig.direction === 'asc' ? (
              <ChevronUpIcon className="w-4 h-4 ml-1" />
            ) : (
              <ChevronDownIcon className="w-4 h-4 ml-1" />
            )
          ) : (
            <ArrowsUpDownIcon className="w-4 h-4 ml-1 opacity-30" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="relative">
      {/* Tabellen-Steuerelemente */}
      <div className="mb-4 flex flex-wrap gap-2 justify-between">
        <div className="flex space-x-2">
          {/* Suchfeld */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Suchen..."
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          {/* Filter-Button */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`px-3 py-2 border ${
              Object.values(filterState).some(v => v !== '')
                ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                : 'bg-white text-gray-600 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
            } rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center relative`}
          >
            <FunnelIcon className="w-4 h-4 mr-2" />
            Filter
            {Object.values(filterState).some(v => v !== '') && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 dark:bg-blue-500 text-white rounded-full text-xs flex items-center justify-center">
                {Object.values(filterState).filter(v => v !== '').length}
              </span>
            )}
          </button>
        </div>
        
        {/* Spalten-Konfiguration */}
        <div className="relative">
          <button
            onClick={() => setIsColumnConfigOpen(!isColumnConfigOpen)}
            className="px-3 py-2 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center"
          >
            <Bars3Icon className="w-4 h-4 mr-2" />
            Spalten
          </button>
          
          <TableColumnConfig
            isOpen={isColumnConfigOpen}
            onOpenChange={setIsColumnConfigOpen}
            columns={availableColumns}
            visibleColumns={columnOrder.filter(id => !hiddenColumns.includes(id))}
            columnOrder={columnOrder}
            onToggleColumnVisibility={handleToggleColumnVisibility}
          />
        </div>
      </div>
      
      {/* Filter-Bereich */}
      {isFilterOpen && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter</h3>
            <button
              onClick={() => {
                setFilterState({
                  branch: '',
                  startDateFrom: '',
                  startDateTo: '',
                  endDateFrom: '',
                  endDateTo: ''
                });
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              {t('worktimeTable.reset')}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Niederlassung */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Niederlassung
              </label>
              <select
                value={filterState.branch}
                onChange={(e) => setFilterState({...filterState, branch: e.target.value})}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              >
                <option value="">Alle</option>
                {[...new Set(worktimes.map(w => w.branch?.name))].filter(Boolean).map(branchName => (
                  <option key={branchName} value={branchName}>
                    {branchName}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Startzeit von */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Startzeit Von
              </label>
              <input
                type="datetime-local"
                value={filterState.startDateFrom}
                onChange={(e) => setFilterState({...filterState, startDateFrom: e.target.value})}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            {/* Startzeit bis */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Startzeit Bis
              </label>
              <input
                type="datetime-local"
                value={filterState.startDateTo}
                onChange={(e) => setFilterState({...filterState, startDateTo: e.target.value})}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            {/* Endzeit von */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Endzeit Von
              </label>
              <input
                type="datetime-local"
                value={filterState.endDateFrom}
                onChange={(e) => setFilterState({...filterState, endDateFrom: e.target.value})}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            {/* Endzeit bis */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Endzeit Bis
              </label>
              <input
                type="datetime-local"
                value={filterState.endDateTo}
                onChange={(e) => setFilterState({...filterState, endDateTo: e.target.value})}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Tabelle */}
      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {columnOrder
                .filter(columnId => isColumnVisible(columnId))
                .map(columnId => {
                  const column = availableColumns.find(col => col.id === columnId);
                  return column ? renderSortableHeader(columnId, column.label) : null;
                })}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={columnOrder.filter(columnId => isColumnVisible(columnId)).length} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  Lade Daten...
                </td>
              </tr>
            ) : filteredAndSortedWorktimes.length === 0 ? (
              <tr>
                <td colSpan={columnOrder.filter(columnId => isColumnVisible(columnId)).length} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  Keine Daten gefunden
                </td>
              </tr>
            ) : (
              filteredAndSortedWorktimes.map(worktime => (
                <tr key={worktime.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  {isColumnVisible('startTime') && (
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {editingId === worktime.id ? (
                        <input
                          type="datetime-local"
                          value={editStartTime}
                          onChange={(e) => setEditStartTime(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        format(new Date(worktime.startTime), "dd.MM.yyyy HH:mm:ss")
                      )}
                    </td>
                  )}
                  
                  {isColumnVisible('endTime') && (
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {editingId === worktime.id ? (
                        <input
                          type="datetime-local"
                          value={editEndTime}
                          onChange={(e) => setEditEndTime(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        worktime.endTime 
                          ? format(new Date(worktime.endTime), "dd.MM.yyyy HH:mm:ss")
                          : "-"
                      )}
                    </td>
                  )}
                  
                  {isColumnVisible('duration') && (
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {worktime.endTime 
                        ? formatDuration(new Date(worktime.startTime), new Date(worktime.endTime))
                        : "-"}
                    </td>
                  )}
                  
                  {isColumnVisible('branch') && (
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {worktime.branch?.name || "-"}
                    </td>
                  )}
                  
                  {isColumnVisible('actions') && (
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingId === worktime.id ? (
                        <div className="flex space-x-2 justify-end">
                          <button
                            onClick={() => handleSaveEdit(worktime.id)}
                            disabled={savingId === worktime.id}
                            className="p-1.5 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title={savingId === worktime.id ? 'Speichern...' : 'Speichern'}
                          >
                            {savingId === worktime.id ? (
                              <ArrowPathIcon className="h-5 w-5 animate-spin" />
                            ) : (
                              <CheckIcon className="h-5 w-5" />
                            )}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Abbrechen"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-2 justify-end">
                          <button
                            onClick={() => handleStartEdit(worktime)}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                          >
                            <PencilIcon className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Legende */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>Hinweis: Sie können die Tabelle anpassen, indem Sie auf die Spaltenüberschriften klicken, um zu sortieren. Außerdem können Sie die Spalten per Drag & Drop neu anordnen.</p>
      </div>
    </div>
  );
};

export default UserWorktimeTable; 