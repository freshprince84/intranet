import React, { useState, useMemo, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { StopIcon, ArrowPathIcon, MagnifyingGlassIcon, FunnelIcon, Bars3Icon, ChevronUpIcon, ChevronDownIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import StopWorktimeModal from './StopWorktimeModal.tsx';
import TableColumnConfig from '../TableColumnConfig.tsx';
import { useTableSettings } from '../../hooks/useTableSettings.ts';

interface ActiveUsersListProps {
  activeUsers: any[];
  loading: boolean;
  onStopWorktime: (userId: number, endTime: string) => Promise<void>;
  onRefresh: () => void;
}

// Definition der verfügbaren Spalten
const availableColumns = [
  { id: 'name', label: 'Name' },
  { id: 'startTime', label: 'Startzeit' },
  { id: 'duration', label: 'Laufzeit' },
  { id: 'branch', label: 'Niederlassung' },
  { id: 'actions', label: 'Aktionen' }
];

// Standardreihenfolge der Spalten
const defaultColumnOrder = ['name', 'startTime', 'duration', 'branch', 'actions'];

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface FilterState {
  name: string;
  branch: string;
}

const ActiveUsersList: React.FC<ActiveUsersListProps> = ({
  activeUsers,
  loading,
  onStopWorktime,
  onRefresh
}) => {
  const [showStopModal, setShowStopModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'startTime', direction: 'asc' });
  const [filterState, setFilterState] = useState<FilterState>({
    name: '',
    branch: ''
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);

  // Spalten-Konfiguration mit Hook
  const { 
    settings,
    updateColumnOrder,
    updateHiddenColumns,
    isColumnVisible
  } = useTableSettings('active_users_list', {
    defaultColumnOrder: defaultColumnOrder
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

  // Stoppe die Zeiterfassung eines Benutzers
  const handleStopWorktime = async (endTime: string) => {
    if (!selectedUser) return;

    await onStopWorktime(selectedUser.user.id, endTime);
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
    // Filtern nach Suchbegriff
    let filtered = activeUsers.filter(worktime => {
      const fullName = `${worktime.user.firstName} ${worktime.user.lastName}`.toLowerCase();
      const username = worktime.user.username.toLowerCase();
      const branch = worktime.branch.name.toLowerCase();
      const searchTermLower = searchTerm.toLowerCase();
      
      const matchesSearch = fullName.includes(searchTermLower) || 
                           username.includes(searchTermLower) || 
                           branch.includes(searchTermLower);
      
      const matchesNameFilter = !filterState.name || 
                               fullName.includes(filterState.name.toLowerCase());
      
      const matchesBranchFilter = !filterState.branch || 
                                 branch.includes(filterState.branch.toLowerCase());
      
      return matchesSearch && matchesNameFilter && matchesBranchFilter;
    });

    // Sortieren nach Konfiguration
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let valueA, valueB;
        
        if (sortConfig.key === 'name') {
          valueA = `${a.user.firstName} ${a.user.lastName}`;
          valueB = `${b.user.firstName} ${b.user.lastName}`;
        } else if (sortConfig.key === 'startTime') {
          const startAISOString = a.startTime.endsWith('Z')
            ? a.startTime.substring(0, a.startTime.length - 1)
            : a.startTime;
          
          const startBISOString = b.startTime.endsWith('Z')
            ? b.startTime.substring(0, b.startTime.length - 1)
            : b.startTime;
          
          valueA = new Date(startAISOString).getTime();
          valueB = new Date(startBISOString).getTime();
        } else if (sortConfig.key === 'duration') {
          const startAISOString = a.startTime.endsWith('Z')
            ? a.startTime.substring(0, a.startTime.length - 1)
            : a.startTime;
          
          const startBISOString = b.startTime.endsWith('Z')
            ? b.startTime.substring(0, b.startTime.length - 1)
            : b.startTime;
          
          valueA = new Date(startAISOString).getTime();
          valueB = new Date(startBISOString).getTime();
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
  }, [activeUsers, searchTerm, sortConfig, filterState]);

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

  return (
    <div>
      {/* Header mit Aktualisieren-Button und Suche */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
        <h2 className="text-lg font-medium text-gray-900">
          Aktive Zeiterfassungen ({filteredAndSortedUsers.length})
        </h2>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Suchfeld */}
          <div className="relative flex-grow sm:flex-grow-0 sm:min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filterschaltfläche */}
          <button
            type="button"
            className="inline-flex items-center justify-center p-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            title="Filter anzeigen"
          >
            <FunnelIcon className="h-5 w-5" />
          </button>
          
          {/* Spaltenkonfiguration */}
          <div className="relative inline-block">
            <TableColumnConfig
              columns={availableColumns}
              visibleColumns={columnOrder.filter(id => !hiddenColumns.includes(id))}
              columnOrder={columnOrder}
              onToggleColumnVisibility={handleToggleColumnVisibility}
              onMoveColumn={handleMoveColumn}
              onClose={() => {}}
            />
          </div>
          
          {/* Aktualisieren-Button */}
          <button
            type="button"
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={onRefresh}
            disabled={loading}
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </div>
      </div>
      
      {/* Filter-Panel */}
      {isFilterOpen && (
        <div className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name-filter" className="block text-sm font-medium text-gray-700">Name</label>
              <input
                id="name-filter"
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={filterState.name}
                onChange={(e) => setFilterState({...filterState, name: e.target.value})}
              />
            </div>
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
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => setFilterState({ name: '', branch: '' })}
            >
              Zurücksetzen
            </button>
          </div>
        </div>
      )}
      
      {/* Tabelle mit aktiven Benutzern */}
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
            {filteredAndSortedUsers.length === 0 ? (
              <tr>
                <td colSpan={columnOrder.filter(id => !hiddenColumns.includes(id)).length} className="px-6 py-4 text-center text-sm text-gray-500">
                  Keine aktiven Zeiterfassungen gefunden
                </td>
              </tr>
            ) : (
              filteredAndSortedUsers.map((worktime) => {
                // Entferne das 'Z' am Ende des Strings, damit JS den Zeitstempel nicht als UTC interpretiert
                const startISOString = worktime.startTime.endsWith('Z')
                  ? worktime.startTime.substring(0, worktime.startTime.length - 1)
                  : worktime.startTime;

                const startTime = new Date(startISOString);

                return (
                  <tr key={worktime.id}>
                    {columnOrder
                      .filter(columnId => !hiddenColumns.includes(columnId))
                      .map(columnId => {
                        if (columnId === 'name') {
                          return (
                            <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {worktime.user.firstName} {worktime.user.lastName}
                                  </div>
                                  <div className="text-sm text-gray-500">{worktime.user.username}</div>
                                </div>
                              </div>
                            </td>
                          );
                        }
                        
                        if (columnId === 'startTime') {
                          return (
                            <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {format(startTime, 'dd.MM.yyyy')}
                              </div>
                              <div className="text-sm text-gray-500">
                                {format(startTime, 'HH:mm:ss')}
                              </div>
                            </td>
                          );
                        }
                        
                        if (columnId === 'duration') {
                          return (
                            <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatDistanceToNow(startTime, { locale: de, addSuffix: false })}
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
                              <button
                                type="button"
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                onClick={() => handleOpenStopModal(worktime)}
                              >
                                <StopIcon className="-ml-0.5 mr-2 h-4 w-4" />
                                Stoppen
                              </button>
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

      {/* Modal zum Stoppen der Zeiterfassung */}
      {showStopModal && selectedUser && (
        <StopWorktimeModal
          isOpen={showStopModal}
          onClose={handleCloseStopModal}
          onConfirm={handleStopWorktime}
          userName={`${selectedUser.user.firstName} ${selectedUser.user.lastName}`}
        />
      )}
    </div>
  );
};

export default ActiveUsersList; 