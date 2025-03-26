import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import axiosInstance from '../config/axios.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useTableSettings } from '../hooks/useTableSettings.ts';
import CreateRequestModal from './CreateRequestModal.tsx';
import EditRequestModal from './EditRequestModal.tsx';
import TableColumnConfig from './TableColumnConfig.tsx';
import FilterPane from './FilterPane.tsx';
import SavedFilterTags from './SavedFilterTags.tsx';
import { FilterCondition } from './FilterRow.tsx';
import { API_ENDPOINTS } from '../config/api.ts';
import { 
  PlusIcon,
  CheckIcon, 
  XMarkIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  ArrowsUpDownIcon,
  FunnelIcon,
  DocumentTextIcon,
  DocumentDuplicateIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import MarkdownPreview from './MarkdownPreview.tsx';

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
  description?: string;
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
  { id: 'title', label: 'Titel', shortLabel: 'Titel' },
  { id: 'status', label: 'Status', shortLabel: 'Status' },
  { id: 'requestedByResponsible', label: 'Angefragt von / Verantwortlicher', shortLabel: 'Angefr. / Ver.' },
  { id: 'branch', label: 'Niederlassung', shortLabel: 'Niedr.' },
  { id: 'dueDate', label: 'Fälligkeit', shortLabel: 'Fällig' },
  { id: 'actions', label: 'Aktionen', shortLabel: 'Akt.' }
];

// Standardreihenfolge der Spalten
const defaultColumnOrder = ['title', 'requestedByResponsible', 'status', 'dueDate', 'branch', 'actions'];

// TableID für gespeicherte Filter
const REQUESTS_TABLE_ID = 'requests-table';

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
  
  // Neue State-Variablen für erweiterte Filterbedingungen
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
  
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

  // State für Paginierung
  const [displayLimit, setDisplayLimit] = useState<number>(10);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/requests');
      setRequests(response.data);
      setError(null);
    } catch (err) {
      console.error('Request Error:', err);
      // Einfachere Fehlerbehandlung ohne axios-Import
      const axiosError = err as any;
      if (axiosError.code === 'ERR_NETWORK') {
        setError('Verbindung zum Server konnte nicht hergestellt werden. Bitte stellen Sie sicher, dass der Server läuft.');
      } else {
        setError(`Fehler beim Laden der Requests: ${axiosError.response?.data?.message || axiosError.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Standard-Filter erstellen und speichern
  useEffect(() => {
    const createStandardFilters = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.error('Nicht authentifiziert');
          return;
        }

        // Prüfen, ob die Standard-Filter bereits existieren
        const existingFiltersResponse = await axiosInstance.get(
          `${API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(REQUESTS_TABLE_ID)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const existingFilters = existingFiltersResponse.data || [];
        const archivFilterExists = existingFilters.some(filter => filter.name === 'Archiv');
        const aktuellFilterExists = existingFilters.some(filter => filter.name === 'Aktuell');

        // Erstelle "Archiv"-Filter, wenn er noch nicht existiert
        if (!archivFilterExists) {
          const archivFilter = {
            tableId: REQUESTS_TABLE_ID,
            name: 'Archiv',
            conditions: [
              { column: 'status', operator: 'equals', value: 'approved' },
              { column: 'status', operator: 'equals', value: 'denied' }
            ],
            operators: ['OR']
          };

          await axiosInstance.post(
            `${API_ENDPOINTS.SAVED_FILTERS.BASE}`,
            archivFilter,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          console.log('Archiv-Filter für Requests erstellt');
        }

        // Erstelle "Aktuell"-Filter, wenn er noch nicht existiert
        if (!aktuellFilterExists) {
          const aktuellFilter = {
            tableId: REQUESTS_TABLE_ID,
            name: 'Aktuell',
            conditions: [
              { column: 'status', operator: 'equals', value: 'approval' },
              { column: 'status', operator: 'equals', value: 'to_improve' }
            ],
            operators: ['OR']
          };

          await axiosInstance.post(
            `${API_ENDPOINTS.SAVED_FILTERS.BASE}`,
            aktuellFilter,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          console.log('Aktuell-Filter für Requests erstellt');
        }
      } catch (error) {
        console.error('Fehler beim Erstellen der Standard-Filter:', error);
      }
    };

    createStandardFilters();
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

      await axiosInstance.put(`/requests/${requestId}`, 
        { 
          status: newStatus,
          create_todo: currentRequest.createTodo
        }
      );

      fetchRequests();
    } catch (err) {
      console.error('Status Update Error:', err);
      // Einfachere Fehlerbehandlung ohne axios-Import
      const axiosError = err as any;
      setError(`Fehler beim Aktualisieren des Status: ${axiosError.response?.data?.message || axiosError.message || 'Ein unerwarteter Fehler ist aufgetreten'}`);
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

  const applyFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    // Speichere die Bedingungen und Operatoren
    setFilterConditions(conditions);
    setFilterLogicalOperators(operators);
    
    // Aktualisiere auch die alten FilterState für Kompatibilität
    const newFilterState: FilterState = {
      title: '',
      status: 'all',
      requestedBy: '',
      responsible: '',
      branch: '',
      dueDateFrom: '',
      dueDateTo: ''
    };
    
    // Versuche, die alten Filter aus den neuen Bedingungen abzuleiten
    conditions.forEach(condition => {
      if (condition.column === 'title' && condition.operator === 'contains') {
        newFilterState.title = condition.value as string || '';
      } else if (condition.column === 'status' && condition.operator === 'equals') {
        newFilterState.status = (condition.value as Request['status']) || 'all';
      } else if (condition.column === 'requestedBy' && condition.operator === 'contains') {
        newFilterState.requestedBy = condition.value as string || '';
      } else if (condition.column === 'responsible' && condition.operator === 'contains') {
        newFilterState.responsible = condition.value as string || '';
      } else if (condition.column === 'branch' && condition.operator === 'contains') {
        newFilterState.branch = condition.value as string || '';
      } else if (condition.column === 'dueDate') {
        if (condition.operator === 'after' || condition.operator === 'equals') {
          newFilterState.dueDateFrom = condition.value as string || '';
        } else if (condition.operator === 'before') {
          newFilterState.dueDateTo = condition.value as string || '';
        }
      }
    });
    
    setActiveFilters(newFilterState);
    setFilterState(newFilterState);
  };
  
  const resetFilterConditions = () => {
    setFilterConditions([]);
    setFilterLogicalOperators([]);
    resetFilters(); // Alte Filter zurücksetzen
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
        
        // Wenn erweiterte Filterbedingungen definiert sind, wende diese an
        if (filterConditions.length > 0) {
          // Implementiere die logische Verknüpfung der Bedingungen (UND/ODER)
          let result = filterConditions.length > 0;
          
          for (let i = 0; i < filterConditions.length; i++) {
            const condition = filterConditions[i];
            let conditionMet = false;
            
            switch (condition.column) {
              case 'title':
                if (condition.operator === 'equals') {
                  conditionMet = request.title === condition.value;
                } else if (condition.operator === 'contains') {
                  conditionMet = request.title.toLowerCase().includes((condition.value as string || '').toLowerCase());
                } else if (condition.operator === 'startsWith') {
                  conditionMet = request.title.toLowerCase().startsWith((condition.value as string || '').toLowerCase());
                } else if (condition.operator === 'endsWith') {
                  conditionMet = request.title.toLowerCase().endsWith((condition.value as string || '').toLowerCase());
                }
                break;
              
              case 'status':
                if (condition.operator === 'equals') {
                  conditionMet = request.status === condition.value;
                } else if (condition.operator === 'notEquals') {
                  conditionMet = request.status !== condition.value;
                }
                break;
              
              case 'requestedBy':
                const requestedByName = `${request.requestedBy.firstName} ${request.requestedBy.lastName}`.toLowerCase();
                if (condition.operator === 'contains') {
                  conditionMet = requestedByName.includes((condition.value as string || '').toLowerCase());
                } else if (condition.operator === 'equals') {
                  conditionMet = requestedByName === (condition.value as string || '').toLowerCase();
                }
                break;
              
              case 'responsible':
                const responsibleName = `${request.responsible.firstName} ${request.responsible.lastName}`.toLowerCase();
                if (condition.operator === 'contains') {
                  conditionMet = responsibleName.includes((condition.value as string || '').toLowerCase());
                } else if (condition.operator === 'equals') {
                  conditionMet = responsibleName === (condition.value as string || '').toLowerCase();
                }
                break;
              
              case 'branch':
                if (condition.operator === 'contains') {
                  conditionMet = request.branch.name.toLowerCase().includes((condition.value as string || '').toLowerCase());
                } else if (condition.operator === 'equals') {
                  conditionMet = request.branch.name.toLowerCase() === (condition.value as string || '').toLowerCase();
                }
                break;
              
              case 'dueDate':
                const requestDate = new Date(request.dueDate);
                if (condition.operator === 'equals') {
                  const valueDate = new Date(condition.value as string);
                  conditionMet = requestDate.toDateString() === valueDate.toDateString();
                } else if (condition.operator === 'before') {
                  const valueDate = new Date(condition.value as string);
                  conditionMet = requestDate < valueDate;
                } else if (condition.operator === 'after') {
                  const valueDate = new Date(condition.value as string);
                  conditionMet = requestDate > valueDate;
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
          
        // Wenn keine erweiterten Filterbedingungen, verwende die alten Filterkriterien
        } else {        
          // Alte Filterkriterien
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
  }, [requests, searchTerm, activeFilters, sortConfig, filterConditions, filterLogicalOperators]);

  // Funktion zum Kopieren eines Requests
  const handleCopyRequest = async (request) => {
    try {
      if (!user) {
        setError('Benutzer nicht authentifiziert');
        return;
      }
      
      // Kopie des Requests erstellen mit angepasstem Titel
      const copiedRequestData = {
        title: `${request.title}-Kopie`,
        responsible_id: request.responsible.id,
        branch_id: request.branch.id,
        due_date: request.dueDate ? request.dueDate.split('T')[0] : '',
        create_todo: request.createTodo,
        requested_by_id: user.id
      };

      // Request erstellen
      const response = await axiosInstance.post(
        API_ENDPOINTS.REQUESTS.BASE,
        copiedRequestData
      );

      // Erfolgreich kopiert, Requests neu laden
      fetchRequests();
      
      // Bearbeitungsmodal für den kopierten Request öffnen
      setSelectedRequest(response.data);
      setIsEditModalOpen(true);
      
    } catch (err) {
      console.error('Fehler beim Kopieren des Requests:', err);
      // Einfachere Fehlerbehandlung ohne axios-Import
      const axiosError = err as any;
      setError(axiosError.response?.data?.message || axiosError.message || 'Ein unerwarteter Fehler ist aufgetreten');
    }
  };

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

      <div className="border-0 rounded-lg">
        {/* Neu angeordnete UI-Elemente in einer Zeile */}
        <div className="flex items-center mb-4 justify-between">
          {/* Linke Seite: "Neuer Request"-Button */}
          <div className="flex items-center">
            {hasPermission('requests', 'write', 'table') && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm flex items-center justify-center"
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
            <DocumentTextIcon className="h-6 w-6 mr-2 dark:text-white" />
            <h2 className="text-xl font-semibold dark:text-white">Requests</h2>
          </div>
          
          {/* Rechte Seite: Suchfeld, Filter und Spalten */}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Suchen..."
              className="w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            {/* Filter-Button */}
            <button
              className={`p-2 rounded-md ${getActiveFilterCount() > 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} ml-1`}
              onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
              title="Filter"
            >
              <FunnelIcon className="h-5 w-5" />
              {getActiveFilterCount() > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-blue-600 dark:bg-blue-500 text-white rounded-full text-xs flex items-center justify-center">
                  {getActiveFilterCount()}
                </span>
              )}
            </button>
            
            {/* Spalten-Konfiguration */}
            <div className="ml-1">
              <TableColumnConfig
                columns={availableColumns}
                visibleColumns={visibleColumnIds}
                columnOrder={settings.columnOrder}
                onToggleColumnVisibility={toggleColumnVisibility}
                onMoveColumn={handleMoveColumn}
                onClose={() => {}}
              />
            </div>
          </div>
        </div>

        {/* Filter-Pane */}
        {isFilterModalOpen && (
          <FilterPane
            columns={[
              { id: 'title', label: 'Titel' },
              { id: 'status', label: 'Status' },
              { id: 'requestedBy', label: 'Angefragt von' },
              { id: 'responsible', label: 'Verantwortlich' },
              { id: 'branch', label: 'Niederlassung' },
              { id: 'dueDate', label: 'Fälligkeit' }
            ]}
            onApply={applyFilterConditions}
            onReset={resetFilterConditions}
            savedConditions={filterConditions}
            savedOperators={filterLogicalOperators}
            tableId={REQUESTS_TABLE_ID}
          />
        )}
        
        {/* Gespeicherte Filter als Tags anzeigen */}
        <SavedFilterTags
          tableId={REQUESTS_TABLE_ID}
          onSelectFilter={applyFilterConditions}
          onReset={resetFilterConditions}
          defaultFilterName="Aktuell"
        />

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
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
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-move relative"
                        draggable
                        onDragStart={() => handleDragStart(columnId)}
                        onDragOver={(e) => handleDragOver(e, columnId)}
                        onDrop={(e) => handleDrop(e, columnId)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className={`flex items-center ${dragOverColumn === columnId ? 'border-l-2 pl-1 border-blue-500' : ''} ${draggedColumn === columnId ? 'opacity-50' : ''}`}>
                          <ArrowsUpDownIcon className="h-3 w-3 mr-1 text-gray-400 dark:text-gray-500" />
                          <span className="hidden sm:inline">{column.label}</span>
                          <span className="inline sm:hidden">{column.shortLabel}</span>
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
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider relative ${sortKey ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''} ${columnId !== 'actions' ? 'cursor-move' : ''}`}
                      onClick={sortKey ? () => handleSort(sortKey) : undefined}
                      draggable={columnId !== 'actions'}
                      onDragStart={columnId !== 'actions' ? () => handleDragStart(columnId) : undefined}
                      onDragOver={columnId !== 'actions' ? (e) => handleDragOver(e, columnId) : undefined}
                      onDrop={columnId !== 'actions' ? (e) => handleDrop(e, columnId) : undefined}
                      onDragEnd={columnId !== 'actions' ? handleDragEnd : undefined}
                    >
                      <div className={`flex items-center ${dragOverColumn === columnId ? 'border-l-2 pl-1 border-blue-500' : ''} ${draggedColumn === columnId ? 'opacity-50' : ''}`}>
                        {columnId !== 'actions' && <ArrowsUpDownIcon className="h-3 w-3 mr-1 text-gray-400 dark:text-gray-500" />}
                        <span className="hidden sm:inline">{column.label}</span>
                        <span className="inline sm:hidden">{column.shortLabel}</span>
                        {sortKey && sortConfig.key === sortKey && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedRequests.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnIds.length} className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <DocumentTextIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                      <div className="text-sm">Keine Requests gefunden</div>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {filteredAndSortedRequests.slice(0, displayLimit).map(request => (
                    <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      {/* Dynamisch generierte Zellen basierend auf den sichtbaren Spalten */}
                      {visibleColumnIds.map(columnId => {
                        switch (columnId) {
                          case 'title':
                            return (
                              <td key={columnId} className="px-6 py-4">
                                <div className="text-sm text-gray-900 dark:text-gray-200 break-words flex items-center">
                                  {request.title}
                                  {request.description && (
                                    <div className="ml-2 relative group">
                                      <button 
                                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                        title="Beschreibung anzeigen"
                                      >
                                        <InformationCircleIcon className="h-5 w-5" />
                                      </button>
                                      <div className="hidden group-hover:block absolute left-0 mt-2 p-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 w-144 max-h-96 overflow-y-auto min-w-[36rem] z-10">
                                        <MarkdownPreview content={request.description} showImagePreview={true} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          case 'status':
                            return (
                              <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)} dark:bg-opacity-30 status-col`}>
                                  {request.status}
                                </span>
                              </td>
                            );
                          case 'requestedByResponsible':
                            return (
                              <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <div className="text-sm text-gray-900 dark:text-gray-200">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">Angefragt von:</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 inline sm:hidden">Angefr. v.:</span><br />
                                    {`${request.requestedBy.firstName} ${request.requestedBy.lastName}`}
                                  </div>
                                  <div className="text-sm text-gray-900 dark:text-gray-200 mt-1">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">Verantwortlich:</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 inline sm:hidden">Ver.:</span><br />
                                    {`${request.responsible.firstName} ${request.responsible.lastName}`}
                                  </div>
                                </div>
                              </td>
                            );
                          case 'branch':
                            return (
                              <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-gray-200">{request.branch.name}</div>
                              </td>
                            );
                          case 'dueDate':
                            return (
                              <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-gray-200">
                                  {new Date(request.dueDate).toLocaleDateString()}
                                </div>
                              </td>
                            );
                          case 'actions':
                            return (
                              <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                                <div className="flex space-x-2 action-buttons">
                                  <div className="status-buttons">
                                  {request.status === 'approval' && hasPermission('requests', 'write', 'table') && (
                                    <>
                                      <button
                                        onClick={() => handleStatusChange(request.id, 'approved')}
                                        className="p-1 bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-600"
                                        title="Genehmigen"
                                      >
                                        <CheckIcon className="h-5 w-5" />
                                      </button>
                                      <button
                                        onClick={() => handleStatusChange(request.id, 'to_improve')}
                                        className="p-1 bg-orange-600 dark:bg-orange-500 text-white rounded hover:bg-orange-700 dark:hover:bg-orange-600"
                                        title="Verbessern"
                                      >
                                        <ExclamationTriangleIcon className="h-5 w-5" />
                                      </button>
                                      <button
                                        onClick={() => handleStatusChange(request.id, 'denied')}
                                        className="p-1 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600"
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
                                        className="p-1 bg-yellow-600 dark:bg-yellow-500 text-white rounded hover:bg-yellow-700 dark:hover:bg-yellow-600"
                                        title="Erneut prüfen"
                                      >
                                        <ArrowPathIcon className="h-5 w-5" />
                                      </button>
                                      <button
                                        onClick={() => handleStatusChange(request.id, 'denied')}
                                        className="p-1 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600"
                                        title="Ablehnen"
                                      >
                                        <XMarkIcon className="h-5 w-5" />
                                      </button>
                                    </>
                                  )}
                                  {(request.status === 'approved' || request.status === 'denied') && hasPermission('requests', 'write', 'table') && (
                                    <button
                                      onClick={() => handleStatusChange(request.id, 'approval')}
                                      className="p-1 bg-yellow-600 dark:bg-yellow-500 text-white rounded hover:bg-yellow-700 dark:hover:bg-yellow-600"
                                      title="Erneut prüfen"
                                    >
                                      <ArrowPathIcon className="h-5 w-5" />
                                    </button>
                                  )}
                                  </div>
                                  {hasPermission('requests', 'write', 'table') && (
                                    <button
                                      onClick={() => {
                                        setSelectedRequest(request);
                                        setIsEditModalOpen(true);
                                      }}
                                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 edit-button ml-0.5"
                                    >
                                      <PencilIcon className="h-5 w-5" />
                                    </button>
                                  )}
                                  {hasPermission('requests', 'both', 'table') && (
                                    <button
                                      onClick={() => handleCopyRequest(request)}
                                      className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 copy-button ml-0.5"
                                      title="Request kopieren"
                                    >
                                      <DocumentDuplicateIcon className="h-5 w-5" />
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
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
        
        {/* "Mehr anzeigen" Button */}
        {filteredAndSortedRequests.length > displayLimit && (
          <div className="mt-4 flex justify-center">
            <button
              className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 border border-blue-300 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-gray-600"
              onClick={() => setDisplayLimit(prevLimit => prevLimit + 10)}
            >
              Mehr anzeigen ({filteredAndSortedRequests.length - displayLimit} verbleibend)
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Requests; 