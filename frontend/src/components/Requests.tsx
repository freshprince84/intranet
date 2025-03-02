import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useTableSettings } from '../hooks/useTableSettings.ts';
import CreateRequestModal from './CreateRequestModal.tsx';
import EditRequestModal from './EditRequestModal.tsx';
import TableColumnConfig from './TableColumnConfig.tsx';
import { API_URL } from '../config/api.ts';
import { 
  PlusIcon,
  CheckIcon, 
  XMarkIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  ArrowsUpDownIcon,
  FunnelIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface Request {
  id: number;
  title: string;
  status: 'approval' | 'approved' | 'to_improve' | 'denied';
  requestedBy: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  responsible: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  branch: {
    id: number;
    name: string;
  };
  dueDate: string;
  createTodo: boolean;
}

interface SortConfig {
  key: keyof Request | 'requestedBy.firstName' | 'responsible.firstName' | 'branch.name';
  direction: 'asc' | 'desc';
}

interface FilterState {
  title: string;
  status: Request['status'] | 'all';
  requestedBy: string;
  responsible: string;
  branch: string;
  dueDateFrom: string;
  dueDateTo: string;
}

// Definition der verfügbaren Spalten
const availableColumns = [
  { id: 'title', label: 'Titel' },
  { id: 'status', label: 'Status' },
  { id: 'requestedByResponsible', label: 'Angefragt von / Verantwortlicher' },
  { id: 'branch', label: 'Niederlassung' },
  { id: 'dueDate', label: 'Fälligkeit' },
  { id: 'actions', label: 'Aktionen' }
];

// Standardreihenfolge der Spalten
const defaultColumnOrder = ['title', 'requestedByResponsible', 'status', 'dueDate', 'branch', 'actions'];

const Requests: React.FC = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState<FilterState>({
    title: '',
    status: 'all',
    requestedBy: '',
    responsible: '',
    branch: '',
    dueDateFrom: '',
    dueDateTo: ''
  });
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    title: '',
    status: 'all',
    requestedBy: '',
    responsible: '',
    branch: '',
    dueDateFrom: '',
    dueDateTo: ''
  });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'dueDate', direction: 'asc' });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  
  // Tabellen-Einstellungen laden
  const {
    settings,
    isLoading: isLoadingSettings,
    updateColumnOrder,
    updateHiddenColumns,
    toggleColumnVisibility,
    isColumnVisible
  } = useTableSettings('dashboard_requests', {
    defaultColumnOrder,
    defaultHiddenColumns: []
  });

  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/requests`);
      setRequests(response.data);
      setError(null);
    } catch (err) {
      console.error('Request Error:', err);
      if (axios.isAxiosError(err)) {
        if (err.code === 'ERR_NETWORK') {
          setError('Verbindung zum Server konnte nicht hergestellt werden. Bitte stellen Sie sicher, dass der Server läuft.');
        } else {
          setError(`Fehler beim Laden der Requests: ${err.response?.data?.message || err.message}`);
        }
      } else {
        setError('Ein unerwarteter Fehler ist aufgetreten');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const getStatusColor = (status: Request['status']) => {
    switch (status) {
      case 'approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'to_improve':
        return 'bg-orange-100 text-orange-800';
      case 'denied':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleStatusChange = async (requestId: number, newStatus: Request['status']) => {
    try {
      const currentRequest = requests.find(r => r.id === requestId);
      if (!currentRequest) {
        setError('Request nicht gefunden');
        return;
      }

      await axios.put(`${API_URL}/requests/${requestId}`, 
        { 
          status: newStatus,
          create_todo: currentRequest.createTodo
        }
      );

      fetchRequests();
    } catch (err) {
      console.error('Status Update Error:', err);
      if (axios.isAxiosError(err)) {
        setError(`Fehler beim Aktualisieren des Status: ${err.response?.data?.message || err.message}`);
      } else {
        setError('Ein unerwarteter Fehler ist aufgetreten');
      }
    }
  };

  // Handler für das Verschieben von Spalten per Drag & Drop
  const handleMoveColumn = useCallback((dragIndex: number, hoverIndex: number) => {
    // Erstelle eine neue Kopie der Spaltenreihenfolge
    const newColumnOrder = [...settings.columnOrder];
    
    // Ermittle die zu verschiebenden Spalten
    const movingColumn = newColumnOrder[dragIndex];
    
    // Entferne die Spalte an der alten Position
    newColumnOrder.splice(dragIndex, 1);
    
    // Füge die Spalte an der neuen Position ein
    newColumnOrder.splice(hoverIndex, 0, movingColumn);
    
    // Aktualisiere die Spaltenreihenfolge
    updateColumnOrder(newColumnOrder);
  }, [settings.columnOrder, updateColumnOrder]);

  // Handler für Drag & Drop direkt in der Tabelle
  const handleDragStart = (columnId: string) => {
    setDraggedColumn(columnId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== columnId) {
      const dragIndex = settings.columnOrder.indexOf(draggedColumn);
      const hoverIndex = settings.columnOrder.indexOf(columnId);
      
      if (dragIndex > -1 && hoverIndex > -1) {
        handleMoveColumn(dragIndex, hoverIndex);
      }
    }
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const resetFilters = () => {
    setFilterState({
      title: '',
      status: 'all',
      requestedBy: '',
      responsible: '',
      branch: '',
      dueDateFrom: '',
      dueDateTo: ''
    });
  };

  const applyFilters = () => {
    setActiveFilters(filterState);
    setIsFilterModalOpen(false);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (activeFilters.title) count++;
    if (activeFilters.status !== 'all') count++;
    if (activeFilters.requestedBy) count++;
    if (activeFilters.responsible) count++;
    if (activeFilters.branch) count++;
    if (activeFilters.dueDateFrom) count++;
    if (activeFilters.dueDateTo) count++;
    return count;
  };

  const filteredAndSortedRequests = useMemo(() => {
    return requests
      .filter(request => {
        // Globale Suchfunktion
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const matchesSearch = 
            request.title.toLowerCase().includes(searchLower) ||
            `${request.requestedBy.firstName} ${request.requestedBy.lastName}`.toLowerCase().includes(searchLower) ||
            `${request.responsible.firstName} ${request.responsible.lastName}`.toLowerCase().includes(searchLower) ||
            request.branch.name.toLowerCase().includes(searchLower);
          
          if (!matchesSearch) return false;
        }
        
        // Erweiterte Filterkriterien
        if (activeFilters.title && !request.title.toLowerCase().includes(activeFilters.title.toLowerCase())) {
          return false;
        }
        
        if (activeFilters.status !== 'all' && request.status !== activeFilters.status) {
          return false;
        }
        
        if (activeFilters.requestedBy) {
          const requestedByName = `${request.requestedBy.firstName} ${request.requestedBy.lastName}`.toLowerCase();
          if (!requestedByName.includes(activeFilters.requestedBy.toLowerCase())) {
            return false;
          }
        }
        
        if (activeFilters.responsible) {
          const responsibleName = `${request.responsible.firstName} ${request.responsible.lastName}`.toLowerCase();
          if (!responsibleName.includes(activeFilters.responsible.toLowerCase())) {
            return false;
          }
        }
        
        if (activeFilters.branch && !request.branch.name.toLowerCase().includes(activeFilters.branch.toLowerCase())) {
          return false;
        }
        
        if (activeFilters.dueDateFrom) {
          const dueDateFrom = new Date(activeFilters.dueDateFrom);
          const requestDate = new Date(request.dueDate);
          if (requestDate < dueDateFrom) {
            return false;
          }
        }
        
        if (activeFilters.dueDateTo) {
          const dueDateTo = new Date(activeFilters.dueDateTo);
          const requestDate = new Date(request.dueDate);
          if (requestDate > dueDateTo) {
            return false;
          }
        }
        
        return true;
      })
      .sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof Request];
        let bValue: any = b[sortConfig.key as keyof Request];

        // Handle nested properties
        if (sortConfig.key === 'requestedBy.firstName') {
          aValue = a.requestedBy.firstName;
          bValue = b.requestedBy.firstName;
        } else if (sortConfig.key === 'responsible.firstName') {
          aValue = a.responsible.firstName;
          bValue = b.responsible.firstName;
        } else if (sortConfig.key === 'branch.name') {
          aValue = a.branch.name;
          bValue = b.branch.name;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [requests, searchTerm, activeFilters, sortConfig]);

  if (loading) return <div className="p-4">Lädt...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  // Filtern und sortieren der Spalten gemäß den Benutzereinstellungen
  const visibleColumnIds = settings.columnOrder.filter(id => isColumnVisible(id));

  return (
    <>
      <CreateRequestModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onRequestCreated={fetchRequests}
      />
      {selectedRequest && (
        <EditRequestModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedRequest(null);
          }}
          onRequestUpdated={fetchRequests}
          request={selectedRequest}
        />
      )}

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium">Erweiterte Filter</h3>
              <button 
                onClick={() => setIsFilterModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  value={filterState.title}
                  onChange={(e) => setFilterState({...filterState, title: e.target.value})}
                  placeholder="Nach Titel filtern..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-white"
                  value={filterState.status}
                  onChange={(e) => setFilterState({...filterState, status: e.target.value as Request['status'] | 'all'})}
                >
                  <option value="all">Alle Status</option>
                  <option value="approval">Zur Genehmigung</option>
                  <option value="approved">Genehmigt</option>
                  <option value="to_improve">Zu verbessern</option>
                  <option value="denied">Abgelehnt</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Angefragt von</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  value={filterState.requestedBy}
                  onChange={(e) => setFilterState({...filterState, requestedBy: e.target.value})}
                  placeholder="Nach Name filtern..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verantwortlich</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  value={filterState.responsible}
                  onChange={(e) => setFilterState({...filterState, responsible: e.target.value})}
                  placeholder="Nach Name filtern..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Niederlassung</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  value={filterState.branch}
                  onChange={(e) => setFilterState({...filterState, branch: e.target.value})}
                  placeholder="Nach Niederlassung filtern..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fälligkeit von</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-md"
                    value={filterState.dueDateFrom}
                    onChange={(e) => setFilterState({...filterState, dueDateFrom: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fälligkeit bis</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-md"
                    value={filterState.dueDateTo}
                    onChange={(e) => setFilterState({...filterState, dueDateTo: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-between rounded-b-lg">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Filter zurücksetzen
              </button>
              <div className="space-x-2">
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none"
                >
                  Abbrechen
                </button>
                <button
                  onClick={applyFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
                >
                  Filter anwenden
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border-0 rounded-lg">
        {/* Neu angeordnete UI-Elemente in einer Zeile */}
        <div className="flex items-center mb-4 justify-between">
          {/* Linke Seite: "Neuer Request"-Button */}
          <div className="flex items-center">
            {hasPermission('requests', 'write', 'table') && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-white text-blue-600 p-1.5 rounded-full hover:bg-blue-50 border border-blue-200 shadow-sm flex items-center justify-center"
                style={{ width: '30.19px', height: '30.19px' }}
                title="Neuen Request erstellen"
                aria-label="Neuen Request erstellen"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Mitte: Titel mit Icon */}
          <div className="flex items-center">
            <DocumentTextIcon className="h-6 w-6 mr-2" />
            <h2 className="text-xl font-semibold">Requests</h2>
          </div>
          
          {/* Rechte Seite: Suchfeld, Filter und Spalten */}
          <div className="flex space-x-2 items-center">
            <input
              type="text"
              placeholder="Suchen..."
              className="px-3 py-2 border rounded-md h-10 w-full sm:w-auto"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            {/* Filter-Button */}
            <button
              className={`p-2 rounded-md border ${getActiveFilterCount() > 0 ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-gray-300 hover:bg-gray-100'}`}
              onClick={() => setIsFilterModalOpen(true)}
              title="Filter"
            >
              <div className="relative">
                <FunnelIcon className="w-5 h-5" />
                {getActiveFilterCount() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {getActiveFilterCount()}
                  </span>
                )}
              </div>
            </button>
            
            {/* Spalten-Konfiguration */}
            <TableColumnConfig
              columns={availableColumns}
              visibleColumns={visibleColumnIds}
              columnOrder={settings.columnOrder}
              onToggleColumnVisibility={toggleColumnVisibility}
              onMoveColumn={handleMoveColumn}
            />
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* Dynamisch generierte Spaltenüberschriften basierend auf den sichtbaren Spalten */}
                {visibleColumnIds.map(columnId => {
                  const column = availableColumns.find(col => col.id === columnId);
                  if (!column) return null;

                  // Besondere Behandlung für die Spalte mit requestedBy/responsible
                  if (columnId === 'requestedByResponsible') {
                    return (
                      <th 
                        key={columnId}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-move relative"
                        draggable
                        onDragStart={() => handleDragStart(columnId)}
                        onDragOver={(e) => handleDragOver(e, columnId)}
                        onDrop={(e) => handleDrop(e, columnId)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className={`flex items-center ${dragOverColumn === columnId ? 'border-l-2 pl-1 border-blue-500' : ''} ${draggedColumn === columnId ? 'opacity-50' : ''}`}>
                          <ArrowsUpDownIcon className="h-3 w-3 mr-1 text-gray-400" />
                          {column.label}
                        </div>
                      </th>
                    );
                  }
                  
                  // Für alle anderen Spalten
                  let sortKey: SortConfig['key'] | undefined;
                  if (columnId === 'title') sortKey = 'title';
                  if (columnId === 'status') sortKey = 'status';
                  if (columnId === 'branch') sortKey = 'branch.name';
                  if (columnId === 'dueDate') sortKey = 'dueDate';

                  return (
                    <th 
                      key={columnId}
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative ${sortKey ? 'cursor-pointer hover:bg-gray-100' : ''} ${columnId !== 'actions' ? 'cursor-move' : ''}`}
                      onClick={sortKey ? () => handleSort(sortKey) : undefined}
                      draggable={columnId !== 'actions'}
                      onDragStart={columnId !== 'actions' ? () => handleDragStart(columnId) : undefined}
                      onDragOver={columnId !== 'actions' ? (e) => handleDragOver(e, columnId) : undefined}
                      onDrop={columnId !== 'actions' ? (e) => handleDrop(e, columnId) : undefined}
                      onDragEnd={columnId !== 'actions' ? handleDragEnd : undefined}
                    >
                      <div className={`flex items-center ${dragOverColumn === columnId ? 'border-l-2 pl-1 border-blue-500' : ''} ${draggedColumn === columnId ? 'opacity-50' : ''}`}>
                        {columnId !== 'actions' && <ArrowsUpDownIcon className="h-3 w-3 mr-1 text-gray-400" />}
                        {column.label} {sortKey && sortConfig.key === sortKey && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedRequests.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnIds.length} className="px-3 py-4 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <p>Keine Requests vorhanden</p>
                      {hasPermission('requests', 'write', 'table') && (
                        <button
                          onClick={() => setIsCreateModalOpen(true)}
                          className="bg-white text-blue-600 p-1.5 rounded-full hover:bg-blue-50 border border-blue-200 shadow-sm flex items-center justify-center"
                          style={{ width: '30.19px', height: '30.19px', marginTop: '1px', marginBottom: '1px' }}
                          title="Neuen Request erstellen"
                          aria-label="Neuen Request erstellen"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedRequests.map(request => (
                  <tr key={request.id}>
                    {/* Dynamisch generierte Zellen basierend auf den sichtbaren Spalten */}
                    {visibleColumnIds.map(columnId => {
                      switch (columnId) {
                        case 'title':
                          return (
                            <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{request.title}</div>
                            </td>
                          );
                        case 'status':
                          return (
                            <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)}`}>
                                {request.status}
                              </span>
                            </td>
                          );
                        case 'requestedByResponsible':
                          return (
                            <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <div className="text-sm text-gray-900">
                                  <span className="text-xs text-gray-500">Angefragt von:</span><br />
                                  {`${request.requestedBy.firstName} ${request.requestedBy.lastName}`}
                                </div>
                                <div className="text-sm text-gray-900 mt-1">
                                  <span className="text-xs text-gray-500">Verantwortlich:</span><br />
                                  {`${request.responsible.firstName} ${request.responsible.lastName}`}
                                </div>
                              </div>
                            </td>
                          );
                        case 'branch':
                          return (
                            <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{request.branch.name}</div>
                            </td>
                          );
                        case 'dueDate':
                          return (
                            <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {new Date(request.dueDate).toLocaleDateString()}
                              </div>
                            </td>
                          );
                        case 'actions':
                          return (
                            <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                              <div className="flex space-x-2">
                                {hasPermission('requests', 'write', 'table') && (
                                  <button
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setIsEditModalOpen(true);
                                    }}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    <PencilIcon className="h-5 w-5" />
                                  </button>
                                )}
                                {request.status === 'approval' && hasPermission('requests', 'write', 'table') && (
                                  <>
                                    <button
                                      onClick={() => handleStatusChange(request.id, 'approved')}
                                      className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                                      title="Genehmigen"
                                    >
                                      <CheckIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                      onClick={() => handleStatusChange(request.id, 'to_improve')}
                                      className="p-1 bg-orange-600 text-white rounded hover:bg-orange-700"
                                      title="Verbessern"
                                    >
                                      <ExclamationTriangleIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                      onClick={() => handleStatusChange(request.id, 'denied')}
                                      className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                                      title="Ablehnen"
                                    >
                                      <XMarkIcon className="h-5 w-5" />
                                    </button>
                                  </>
                                )}
                                {request.status === 'to_improve' && hasPermission('requests', 'write', 'table') && (
                                  <>
                                    <button
                                      onClick={() => handleStatusChange(request.id, 'approval')}
                                      className="p-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                                      title="Erneut prüfen"
                                    >
                                      <ArrowPathIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                      onClick={() => handleStatusChange(request.id, 'denied')}
                                      className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                                      title="Ablehnen"
                                    >
                                      <XMarkIcon className="h-5 w-5" />
                                    </button>
                                  </>
                                )}
                                {(request.status === 'approved' || request.status === 'denied') && hasPermission('requests', 'write', 'table') && (
                                  <button
                                    onClick={() => handleStatusChange(request.id, 'approval')}
                                    className="p-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                                    title="Erneut prüfen"
                                  >
                                    <ArrowPathIcon className="h-5 w-5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        default:
                          return null;
                      }
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default Requests; 