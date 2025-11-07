import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
import { applyFilters, evaluateDateCondition } from '../utils/filterLogic.ts';
import { getStatusColor, getStatusText } from '../utils/statusUtils.tsx';
import { API_ENDPOINTS, getRequestAttachmentUrl } from '../config/api.ts';
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
  InformationCircleIcon,
  Squares2X2Icon,
  TableCellsIcon,
  UserIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import MarkdownPreview from './MarkdownPreview.tsx';
import DataCard, { MetadataItem } from './shared/DataCard.tsx';
import CardGrid from './shared/CardGrid.tsx';
import { getExpiryStatus, getExpiryColorClasses, createDueDateMetadataItem } from '../utils/expiryUtils.ts';

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
  attachments?: Array<{
    id: number;
    fileName: string;
    fileType: string;
    fileSize?: number;
    filePath?: string;
    uploadedAt?: string;
    url: string;
  }>;
}

interface SortConfig {
  key: keyof Request | 'requestedBy.firstName' | 'responsible.firstName' | 'branch.name';
  direction: 'asc' | 'desc';
}

// Definition der verfügbaren Spalten - werden dynamisch aus Übersetzungen geladen

// Standardreihenfolge der Spalten
const defaultColumnOrder = ['title', 'requestedByResponsible', 'status', 'dueDate', 'branch', 'actions'];

// TableID für gespeicherte Filter
const REQUESTS_TABLE_ID = 'requests-table';

// Mapping zwischen Tabellen-Spalten-IDs und Card-Metadaten-IDs
// Tabellen-Spalte -> Card-Metadaten (kann Array sein für 1:N Mapping)
const tableToCardMapping: Record<string, string[]> = {
  'title': ['title'],
  'status': ['status'],
  'requestedByResponsible': ['requestedBy', 'responsible'], // 1 Tabelle-Spalte -> 2 Card-Metadaten
  'branch': ['branch'],
  'dueDate': ['dueDate'],
  'actions': [], // Keine Card-Entsprechung
  'description': ['description'] // Nur in Cards verfügbar
};

// Reverse Mapping: Card-Metadaten -> Tabellen-Spalten
const cardToTableMapping: Record<string, string> = {
  'title': 'title',
  'status': 'status',
  'requestedBy': 'requestedByResponsible',
  'responsible': 'requestedByResponsible',
  'branch': 'branch',
  'dueDate': 'dueDate',
  'description': 'description'
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
  // Beschreibung hinzufügen, wenn nicht schon vorhanden
  if (!cardMetadata.includes('description')) {
    cardMetadata.push('description');
  }
  return cardMetadata;
};

const Requests: React.FC = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State-Variablen für erweiterte Filterbedingungen
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
  
  // Filter State Management (Controlled Mode)
  const [activeFilterName, setActiveFilterName] = useState<string>('');
  const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);
  
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'dueDate', direction: 'asc' });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  
  // Status-Funktionen (verwende zentrale Utils mit Übersetzungsunterstützung)
  // WICHTIG: Funktionalität bleibt identisch - nur Code-Duplikation entfernt!
  const getStatusLabel = (status: string): string => {
    return getStatusText(status, 'request', t);
  };
  
  // Definition der verfügbaren Spalten (dynamisch aus Übersetzungen)
  const availableColumns = useMemo(() => [
    { id: 'title', label: t('requests.columns.title'), shortLabel: t('requests.columns.title') },
    { id: 'status', label: t('requests.columns.status'), shortLabel: t('requests.columns.status') },
    { id: 'requestedByResponsible', label: t('requests.columns.requestedByResponsible'), shortLabel: t('requests.columns.requestedByResponsible').split('/')[0] },
    { id: 'branch', label: t('requests.columns.branch'), shortLabel: t('requests.columns.branch').substring(0, 5) },
    { id: 'dueDate', label: t('requests.columns.dueDate'), shortLabel: t('requests.columns.dueDate').substring(0, 5) },
    { id: 'actions', label: t('requests.columns.actions'), shortLabel: t('common.actions').substring(0, 3) }
  ], [t]);
  
  // Tabellen-Einstellungen laden
  const {
    settings,
    isLoading: isLoadingSettings,
    updateColumnOrder,
    updateHiddenColumns,
    toggleColumnVisibility,
    isColumnVisible,
    updateViewMode
  } = useTableSettings('dashboard_requests', {
    defaultColumnOrder,
    defaultHiddenColumns: [],
    defaultViewMode: 'cards'
  });

  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // State für Paginierung
  const [displayLimit, setDisplayLimit] = useState<number>(10);

  // View-Mode aus Settings laden
  const viewMode = settings.viewMode || 'cards';
  
  // Lokale Sortierrichtungen für Cards (nicht persistiert)
  const [cardSortDirections, setCardSortDirections] = useState<Record<string, 'asc' | 'desc'>>(() => {
    const defaults: Record<string, 'asc' | 'desc'> = {
      title: 'asc',
      status: 'asc',
      requestedBy: 'asc',
      responsible: 'asc',
      branch: 'asc',
      dueDate: 'asc',
      description: 'asc'
    };
    return defaults;
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

  // CSS-Klasse für Dashboard-Box setzen (für CSS-basierte Schattierungs-Entfernung)
  useEffect(() => {
    const wrapper = document.querySelector('.dashboard-requests-wrapper');
    if (wrapper) {
      if (viewMode === 'cards') {
        wrapper.classList.add('cards-mode');
      } else {
        wrapper.classList.remove('cards-mode');
      }
    }
  }, [viewMode]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/requests');
      const requestsData = response.data;
      
      // Attachments sind bereits in der Response enthalten
      // URL-Generierung für Attachments hinzufügen
      const requestsWithAttachments = requestsData.map((request: Request) => {
        const attachments = (request.attachments || []).map((att: any) => ({
          id: att.id,
          fileName: att.fileName,
          fileType: att.fileType,
          fileSize: att.fileSize,
          filePath: att.filePath,
          uploadedAt: att.uploadedAt,
          url: getRequestAttachmentUrl(request.id, att.id)
        }));
        
        return {
          ...request,
          attachments: attachments
        };
      });
      
      setRequests(requestsWithAttachments);
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
        // Suche nach Filtern mit deutschen oder übersetzten Namen (für Rückwärtskompatibilität)
        const archivFilterExists = existingFilters.some(filter => 
          filter.name === 'Archiv' || 
          filter.name === t('requests.filters.archiv') ||
          filter.name === 'Archivo'
        );
        const aktuellFilterExists = existingFilters.some(filter => 
          filter.name === 'Aktuell' || 
          filter.name === t('requests.filters.aktuell') ||
          filter.name === 'Actual'
        );

        // Erstelle "Archiv"-Filter, wenn er noch nicht existiert
        if (!archivFilterExists) {
          const archivFilter = {
            tableId: REQUESTS_TABLE_ID,
            name: 'Archiv', // Immer auf Deutsch speichern, wird beim Anzeigen übersetzt
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

      // Erstelle "Aktuell"-Filter, wenn er noch nicht existiert (immer mit deutschem Namen für Konsistenz)
      if (!aktuellFilterExists) {
        const aktuellFilter = {
          tableId: REQUESTS_TABLE_ID,
          name: 'Aktuell', // Immer auf Deutsch speichern, wird beim Anzeigen übersetzt
          conditions: [
            { column: 'status', operator: 'notEquals', value: 'approved' },
            { column: 'status', operator: 'notEquals', value: 'denied' }
          ],
          operators: ['AND']
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

  // Initialer Default-Filter setzen (Controlled Mode)
  useEffect(() => {
    const setInitialFilter = async () => {
      try {
        const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(REQUESTS_TABLE_ID));
        const filters = response.data;
        
        // Suche nach "Aktuell" Filter (kann auch "Actual" sein für Rückwärtskompatibilität)
        const aktuellFilter = filters.find((filter: any) => 
          filter.name === 'Aktuell' || filter.name === 'Actual'
        );
        if (aktuellFilter) {
          setActiveFilterName('Aktuell'); // Speichere deutschen Namen, wird beim Anzeigen übersetzt
          setSelectedFilterId(aktuellFilter.id);
          applyFilterConditions(aktuellFilter.conditions, aktuellFilter.operators);
        }
      } catch (error) {
        console.error('Fehler beim Setzen des initialen Filters:', error);
      }
    };

    setInitialFilter();
  }, []);

  // getStatusText wird jetzt direkt von statusUtils verwendet (siehe getStatusLabel oben)

  // Status-Workflow: vorheriger/nächster Status für Shift-Buttons
  const getPreviousStatus = (status: Request['status']): Request['status'] | null => {
    switch (status) {
      case 'to_improve':
      case 'approved':
      case 'denied':
        return 'approval';
      default:
        return null;
    }
  };

  const getNextStatuses = (status: Request['status']): Request['status'][] => {
    switch (status) {
      case 'approval':
        return ['approved', 'to_improve', 'denied'];
      case 'to_improve':
        return ['denied'];
      default:
        return [];
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

      // Optimistisches Update: State sofort aktualisieren
      setRequests(prevRequests => 
        prevRequests.map(request => 
          request.id === requestId ? { ...request, status: newStatus } : request
        )
      );

      await axiosInstance.put(`/requests/${requestId}`, 
        { 
          status: newStatus,
          create_todo: currentRequest.createTodo
        }
      );
    } catch (err) {
      // Rollback bei Fehler: Vollständiges Reload
      console.error('Status Update Error:', err);
      fetchRequests();
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

  const applyFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setFilterConditions(conditions);
    setFilterLogicalOperators(operators);
  };
  
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

  const getActiveFilterCount = () => {
    return filterConditions.length;
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
        // WICHTIG: Verwende zentrale Filter-Logik - Funktionalität bleibt identisch!
        if (filterConditions.length > 0) {
          // Column-Evaluatoren für Requests (exakt gleiche Logik wie vorher)
          const columnEvaluators: any = {
            'title': (req: Request, cond: FilterCondition) => {
              const value = (cond.value as string || '').toLowerCase();
              const title = req.title.toLowerCase();
              if (cond.operator === 'equals') return req.title === cond.value;
              if (cond.operator === 'contains') return title.includes(value);
              if (cond.operator === 'startsWith') return title.startsWith(value);
              if (cond.operator === 'endsWith') return title.endsWith(value);
              return null;
            },
            'status': (req: Request, cond: FilterCondition) => {
              if (cond.operator === 'equals') return req.status === cond.value;
              if (cond.operator === 'notEquals') return req.status !== cond.value;
              return null;
            },
            'requestedBy': (req: Request, cond: FilterCondition) => {
              const requestedByName = `${req.requestedBy.firstName} ${req.requestedBy.lastName}`.toLowerCase();
              const value = (cond.value as string || '').toLowerCase();
              if (cond.operator === 'contains') return requestedByName.includes(value);
              if (cond.operator === 'equals') return requestedByName === value;
              return null;
            },
            'responsible': (req: Request, cond: FilterCondition) => {
              const responsibleName = `${req.responsible.firstName} ${req.responsible.lastName}`.toLowerCase();
              const value = (cond.value as string || '').toLowerCase();
              if (cond.operator === 'contains') return responsibleName.includes(value);
              if (cond.operator === 'equals') return responsibleName === value;
              return null;
            },
            'branch': (req: Request, cond: FilterCondition) => {
              const branchName = req.branch.name.toLowerCase();
              const value = (cond.value as string || '').toLowerCase();
              if (cond.operator === 'contains') return branchName.includes(value);
              if (cond.operator === 'equals') return branchName === value;
              return null;
            },
            'dueDate': (req: Request, cond: FilterCondition) => {
              return evaluateDateCondition(req.dueDate, cond);
            }
          };

          const getFieldValue = (req: Request, columnId: string): any => {
            switch (columnId) {
              case 'title': return req.title;
              case 'status': return req.status;
              case 'requestedBy': return `${req.requestedBy.firstName} ${req.requestedBy.lastName}`;
              case 'responsible': return `${req.responsible.firstName} ${req.responsible.lastName}`;
              case 'branch': return req.branch.name;
              case 'dueDate': return req.dueDate;
              default: return (req as any)[columnId];
            }
          };

          // Wende Filter mit zentraler Logik an (nur für dieses einzelne Item)
          const filtered = applyFilters(
            [request],
            filterConditions,
            filterLogicalOperators,
            getFieldValue,
            columnEvaluators
          );
          
          if (filtered.length === 0) return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        // Bei Cards-Mode: Multi-Sortierung basierend auf Spaltenreihenfolge
        if (viewMode === 'cards') {
          // Sortiere nach sichtbaren Spalten in der definierten Reihenfolge
          const sortableColumns = cardMetadataOrder.filter(colId => visibleCardMetadata.has(colId));
          
          for (const columnId of sortableColumns) {
            let aValue: any;
            let bValue: any;
            
            // Hole Werte basierend auf Spalten-ID
            switch (columnId) {
              case 'title':
                aValue = a.title.toLowerCase();
                bValue = b.title.toLowerCase();
                break;
              case 'status':
                // Status-Priorität für Sortierung: approval < to_improve < approved < denied
                const statusOrder: Record<string, number> = {
                  'approval': 0,
                  'to_improve': 1,
                  'approved': 2,
                  'denied': 3
                };
                aValue = statusOrder[a.status] ?? 999;
                bValue = statusOrder[b.status] ?? 999;
                break;
              case 'requestedBy':
                aValue = `${a.requestedBy.firstName} ${a.requestedBy.lastName}`.toLowerCase();
                bValue = `${b.requestedBy.firstName} ${b.requestedBy.lastName}`.toLowerCase();
                break;
              case 'responsible':
                aValue = `${a.responsible.firstName} ${a.responsible.lastName}`.toLowerCase();
                bValue = `${b.responsible.firstName} ${b.responsible.lastName}`.toLowerCase();
                break;
              case 'branch':
                aValue = a.branch.name.toLowerCase();
                bValue = b.branch.name.toLowerCase();
                break;
              case 'dueDate':
                aValue = new Date(a.dueDate).getTime();
                bValue = new Date(b.dueDate).getTime();
                break;
              case 'description':
                aValue = (a.description || '').toLowerCase();
                bValue = (b.description || '').toLowerCase();
                break;
              default:
                continue;
            }
            
            // Vergleiche Werte (berücksichtige Sortierrichtung pro Spalte)
            const direction = cardSortDirections[columnId] || 'asc';
            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
            // Bei Gleichheit: Weiter zur nächsten Spalte
          }
          
          return 0; // Alle Spalten identisch
        } else {
          // Tabellen-Mode: Normale Einzel-Sortierung
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
        }
      });
  }, [requests, searchTerm, sortConfig, filterConditions, filterLogicalOperators, viewMode, cardMetadataOrder, visibleCardMetadata, cardSortDirections]);

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

      // Optimistisches Update: Neuen Request zur Liste hinzufügen statt vollständigem Reload
      setRequests(prevRequests => [response.data, ...prevRequests]);
      
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

  if (loading) return <div className="p-4">{t('common.loading')}</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  // Filtern und sortieren der Spalten gemäß den Benutzereinstellungen
  const visibleColumnIds = settings.columnOrder.filter(id => isColumnVisible(id));

  return (
    <>
      <CreateRequestModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onRequestCreated={(newRequest) => {
          // Optimistisches Update: Neuen Request zur Liste hinzufügen statt vollständigem Reload
          setRequests(prevRequests => [newRequest, ...prevRequests]);
          setIsEditModalOpen(true);
          setSelectedRequest(newRequest);
        }}
      />
      {selectedRequest && (
        <EditRequestModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedRequest(null);
          }}
          onRequestUpdated={(updatedRequest) => {
            // Optimistisches Update: Request in Liste aktualisieren statt vollständigem Reload
            setRequests(prevRequests => 
              prevRequests.map(request => 
                request.id === updatedRequest.id ? updatedRequest : request
              )
            );
            setIsEditModalOpen(false);
            setSelectedRequest(null);
          }}
          request={selectedRequest}
        />
      )}

      <div 
        className={viewMode === 'cards' ? '' : 'border-0 rounded-lg'}
        data-view-mode={viewMode}
      >
        {/* Neu angeordnete UI-Elemente in einer Zeile */}
        <div className="flex items-center mb-4 justify-between px-3 sm:px-4 md:px-6">
          {/* Linke Seite: "Neuer Request"-Button */}
          <div className="flex items-center">
            {hasPermission('requests', 'write', 'table') && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm flex items-center justify-center"
                style={{ width: '30.19px', height: '30.19px' }}
                title={t('requests.createRequest')}
                aria-label={t('requests.createRequest')}
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Mitte: Titel mit Icon */}
          <div className="flex items-center">
            <DocumentTextIcon className="h-6 w-6 mr-2 dark:text-white" />
            <h2 className="text-xl font-semibold dark:text-white">{t('requests.title')}</h2>
          </div>
          
          {/* Rechte Seite: Suchfeld, Filter, View-Toggle und Spalten */}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder={t('common.search') + '...'}
              className="w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            {/* View-Mode Toggle */}
            <button
              className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
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
              className={`p-2 rounded-md ${getActiveFilterCount() > 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} ml-1 relative`}
              onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
              title={t('common.filter')}
              style={{ position: 'relative' }}
            >
              <FunnelIcon className="h-5 w-5" />
              {getActiveFilterCount() > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 dark:bg-blue-500 text-white rounded-full text-xs flex items-center justify-center z-10" style={{ position: 'absolute', top: '-0.25rem', right: '-0.25rem' }}>
                  {getActiveFilterCount()}
                </span>
              )}
            </button>
            
            {/* Anzeige anpassen - bei beiden Ansichten */}
            <div className="ml-1">
              <TableColumnConfig
                columns={viewMode === 'cards'
                  ? [
                      { id: 'title', label: t('requests.columns.title') },
                      { id: 'status', label: t('requests.columns.status') },
                      { id: 'requestedBy', label: t('requests.columns.requestedBy') },
                      { id: 'responsible', label: t('requests.columns.responsible') },
                      { id: 'branch', label: t('requests.columns.branch') },
                      { id: 'dueDate', label: t('requests.columns.dueDate') },
                      { id: 'description', label: t('common.description') }
                    ]
                  : availableColumns}
                visibleColumns={viewMode === 'cards'
                  ? Array.from(visibleCardMetadata)
                  : visibleColumnIds}
                columnOrder={viewMode === 'cards'
                  ? cardMetadataOrder
                  : settings.columnOrder}
                onToggleColumnVisibility={(columnId) => {
                  if (viewMode === 'cards') {
                    // Card-Metadaten-ID -> Tabellen-Spalten-ID
                    const tableColumnId = cardToTableMapping[columnId];
                    if (tableColumnId) {
                      // Wenn requestedBy oder responsible ausgeblendet wird, verstecke requestedByResponsible
                      // Wenn beide requestedBy und responsible ausgeblendet werden, verstecke requestedByResponsible
                      if (tableColumnId === 'requestedByResponsible') {
                        // Prüfe ob beide bereits ausgeblendet sind
                        const otherCardMeta = columnId === 'requestedBy' ? 'responsible' : 'requestedBy';
                        const otherHidden = hiddenCardMetadata.has(otherCardMeta);
                        const currentlyHidden = settings.hiddenColumns.includes(tableColumnId);
                        
                        if (currentlyHidden && !otherHidden) {
                          // Eine der beiden wird wieder angezeigt, also requestedByResponsible wieder anzeigen
                          toggleColumnVisibility(tableColumnId);
                        } else if (!currentlyHidden && otherHidden) {
                          // Die andere ist bereits ausgeblendet, also requestedByResponsible ausblenden
                          toggleColumnVisibility(tableColumnId);
                        } else if (!currentlyHidden) {
                          // Erste wird ausgeblendet, noch nicht requestedByResponsible ausblenden
                          // (wird erst ausgeblendet wenn beide ausgeblendet sind)
                          // Für jetzt: einfach requestedByResponsible ausblenden wenn eine ausgeblendet wird
                          toggleColumnVisibility(tableColumnId);
                        }
                      } else {
                        // Normale Spalte: direkt ein/ausblenden
                        toggleColumnVisibility(tableColumnId);
                      }
                    }
                  } else {
                    toggleColumnVisibility(columnId);
                  }
                }}
                onMoveColumn={viewMode === 'cards' 
                  ? (dragIndex: number, hoverIndex: number) => {
                      // Card-Metadaten-Reihenfolge ändern = Tabellen-Spalten-Reihenfolge ändern
                      const newCardOrder = [...cardMetadataOrder];
                      const movingCardMeta = newCardOrder[dragIndex];
                      newCardOrder.splice(dragIndex, 1);
                      newCardOrder.splice(hoverIndex, 0, movingCardMeta);
                      
                      // Konvertiere Card-Metadaten-Reihenfolge zurück zu Tabellen-Spalten-Reihenfolge
                      // Finde die ursprüngliche Tabellen-Spalte für jedes Card-Metadatum
                      const newTableOrder: string[] = [];
                      const processedTableCols = new Set<string>();
                      
                      newCardOrder.forEach(cardMeta => {
                        const tableCol = cardToTableMapping[cardMeta];
                        if (tableCol && !processedTableCols.has(tableCol)) {
                          newTableOrder.push(tableCol);
                          processedTableCols.add(tableCol);
                        }
                      });
                      
                      // Fehlende Tabellen-Spalten hinzufügen (actions, etc.)
                      settings.columnOrder.forEach(tableCol => {
                        if (!newTableOrder.includes(tableCol)) {
                          newTableOrder.push(tableCol);
                        }
                      });
                      
                      updateColumnOrder(newTableOrder);
                    }
                  : handleMoveColumn}
                onClose={() => {}}
                buttonTitle={viewMode === 'cards' ? t('tableColumn.sortAndDisplay') : t('tableColumn.configure')}
                modalTitle={viewMode === 'cards' ? t('tableColumn.sortAndDisplay') : t('tableColumn.configure')}
                sortDirections={viewMode === 'cards' ? cardSortDirections : undefined}
                onSortDirectionChange={viewMode === 'cards' 
                  ? (columnId: string, direction: 'asc' | 'desc') => {
                      // Lokale Sortierrichtung aktualisieren (nicht persistiert)
                      setCardSortDirections(prev => ({
                        ...prev,
                        [columnId]: direction
                      }));
                    }
                  : undefined}
                showSortDirection={viewMode === 'cards'}
              />
            </div>
          </div>
        </div>

        {/* Filter-Pane */}
        {isFilterModalOpen && (
          <div className={viewMode === 'cards' ? '-mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6' : 'px-3 sm:px-4 md:px-6'}>
            <FilterPane
            columns={[
              { id: 'title', label: t('requests.columns.title') },
              { id: 'status', label: t('requests.columns.status') },
              { id: 'requestedBy', label: t('requests.columns.requestedBy') },
              { id: 'responsible', label: t('requests.columns.responsible') },
              { id: 'branch', label: t('requests.columns.branch') },
              { id: 'dueDate', label: t('requests.columns.dueDate') }
            ]}
            onApply={applyFilterConditions}
            onReset={resetFilterConditions}
            savedConditions={filterConditions}
            savedOperators={filterLogicalOperators}
            tableId={REQUESTS_TABLE_ID}
            />
          </div>
        )}
        
        {/* Gespeicherte Filter als Tags anzeigen */}
        <div className={viewMode === 'cards' ? '-mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6' : 'px-3 sm:px-4 md:px-6'}>
          <SavedFilterTags
          tableId={REQUESTS_TABLE_ID}
          onSelectFilter={applyFilterConditions}
          onReset={resetFilterConditions}
          activeFilterName={activeFilterName}
          selectedFilterId={selectedFilterId}
          onFilterChange={handleFilterChange}
          defaultFilterName="Aktuell"
          />
        </div>

        {/* Conditional Rendering: Table oder Cards */}
        {viewMode === 'table' ? (
          <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6">
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
                        className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-move relative"
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
                        className={`px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider relative ${sortKey ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''} ${columnId !== 'actions' ? 'cursor-move' : ''}`}
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
                  {filteredAndSortedRequests.slice(0, displayLimit).map(request => {
                    const expiryStatus = getExpiryStatus(request.dueDate, 'request');
                    const expiryColors = getExpiryColorClasses(expiryStatus);
                    
                    return (
                      <tr 
                        key={request.id} 
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          expiryStatus !== 'none' ? `${expiryColors.bgClass} ${expiryColors.borderClass} border-l-4` : ''
                        }`}
                      >
                        {/* Dynamisch generierte Zellen basierend auf den sichtbaren Spalten */}
                        {visibleColumnIds.map(columnId => {
                        switch (columnId) {
                          case 'title':
                            return (
                              <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4">
                                <div className="text-sm text-gray-900 dark:text-gray-200 break-words flex items-center">
                                  {request.title}
                                  {request.description && (
                                    <div className="ml-2 relative group">
                                      <button 
                                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                        title={t('common.description')}
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
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status, 'request')} dark:bg-opacity-30 status-col`}>
                                  {getStatusLabel(request.status)}
                                </span>
                              </td>
                            );
                          case 'requestedByResponsible':
                            return (
                              <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <div className="text-sm text-gray-900 dark:text-gray-200">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">{t('requests.columns.requestedBy')}:</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 inline sm:hidden">{t('requests.columns.requestedBy').substring(0, 5)}:</span><br />
                                    {`${request.requestedBy.firstName} ${request.requestedBy.lastName}`}
                                  </div>
                                  <div className="text-sm text-gray-900 dark:text-gray-200 mt-1">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">{t('requests.columns.responsible')}:</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 inline sm:hidden">{t('requests.columns.responsible').substring(0, 4)}:</span><br />
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
                            const expiryStatusForDate = getExpiryStatus(request.dueDate, 'request');
                            const expiryColorsForDate = getExpiryColorClasses(expiryStatusForDate);
                            return (
                              <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                                <div className={`text-sm ${expiryStatusForDate !== 'none' ? expiryColorsForDate.textClass : 'text-gray-900 dark:text-gray-200'}`}>
                                  {new Date(request.dueDate).toLocaleDateString()}
                                  {expiryStatusForDate !== 'none' && (
                                    <span className="ml-2 text-xs">⚠</span>
                                  )}
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
                                        title={t('requests.actions.approve')}
                                      >
                                        <CheckIcon className="h-5 w-5" />
                                      </button>
                                      <button
                                        onClick={() => handleStatusChange(request.id, 'to_improve')}
                                        className="p-1 bg-orange-600 dark:bg-orange-500 text-white rounded hover:bg-orange-700 dark:hover:bg-orange-600"
                                        title={t('requests.actions.improve')}
                                      >
                                        <ExclamationTriangleIcon className="h-5 w-5" />
                                      </button>
                                      <button
                                        onClick={() => handleStatusChange(request.id, 'denied')}
                                        className="p-1 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600"
                                        title={t('requests.actions.deny')}
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
                                        title={t('requests.actions.recheck')}
                                      >
                                        <ArrowPathIcon className="h-5 w-5" />
                                      </button>
                                      <button
                                        onClick={() => handleStatusChange(request.id, 'denied')}
                                        className="p-1 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600"
                                        title={t('requests.actions.deny')}
                                      >
                                        <XMarkIcon className="h-5 w-5" />
                                      </button>
                                    </>
                                  )}
                                  {(request.status === 'approved' || request.status === 'denied') && hasPermission('requests', 'write', 'table') && (
                                    <button
                                      onClick={() => handleStatusChange(request.id, 'approval')}
                                      className="p-1 bg-yellow-600 dark:bg-yellow-500 text-white rounded hover:bg-yellow-700 dark:hover:bg-yellow-600"
                                      title={t('requests.actions.recheck')}
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
                                      title={t('requests.actions.copy')}
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
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
        ) : (
          /* Card-Ansicht - ohne Box-Schattierung, Cards auf voller Breite */
          <div className="-mx-3 sm:-mx-4 md:-mx-6">
            {filteredAndSortedRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <DocumentTextIcon className="h-10 w-10 mb-4 text-gray-400 dark:text-gray-500" />
                <div className="text-sm">{t('requests.createRequest.noRequestsFound')}</div>
              </div>
            ) : (
              <CardGrid>
                {filteredAndSortedRequests.slice(0, displayLimit).map(request => {
                  // Metadaten basierend auf sichtbaren Einstellungen - strukturiert nach Position
                  const metadata: MetadataItem[] = [];
                  
                  // Links: Niederlassung (meist ausgeblendet)
                  if (visibleCardMetadata.has('branch')) {
                    metadata.push({
                      icon: <BuildingOfficeIcon className="h-4 w-4" />,
                      label: t('requests.columns.branch'),
                      value: request.branch.name,
                      section: 'left'
                    });
                  }
                  
                  // Haupt-Metadaten: Ersteller (erste Zeile in der Mitte)
                  if (visibleCardMetadata.has('requestedBy')) {
                    // Benutzernamen auf 4 Zeichen kürzen
                    const requestedByName = `${request.requestedBy.firstName} ${request.requestedBy.lastName}`;
                    const shortenedName = requestedByName.length > 4 ? requestedByName.substring(0, 4) : requestedByName;
                    metadata.push({
                      icon: <UserIcon className="h-4 w-4" />,
                      label: t('requests.columns.requestedBy'),
                      value: shortenedName,
                      section: 'main'
                    });
                  }
                  
                  // Verantwortlicher (zweite Zeile in der Mitte)
                  if (visibleCardMetadata.has('responsible')) {
                    // Benutzernamen auf 4 Zeichen kürzen
                    const responsibleName = `${request.responsible.firstName} ${request.responsible.lastName}`;
                    const shortenedName = responsibleName.length > 4 ? responsibleName.substring(0, 4) : responsibleName;
                    metadata.push({
                      icon: <UserIcon className="h-4 w-4" />,
                      label: t('requests.columns.responsible'),
                      value: shortenedName,
                      section: 'main-second' // Neue Section für zweite Zeile
                    });
                  }
                  
                  // Rechts: Fälligkeit (erste Zeile rechts, neben Status)
                  if (visibleCardMetadata.has('dueDate')) {
                    const dueDateItem = createDueDateMetadataItem(
                      request.dueDate,
                      'request',
                      undefined,
                      undefined,
                      <CalendarIcon className="h-4 w-4" />,
                      t('requests.columns.dueDate'),
                      (date) => format(date, 'dd.MM.yyyy', { locale: de }),
                      false // Keine Badge-Art, nur Text
                    );
                    metadata.push({
                      ...dueDateItem,
                      section: 'right-inline' // Neue Section für inline rechts (neben Status)
                    });
                  }
                  
                  // Full-Width: Beschreibung
                  if (visibleCardMetadata.has('description') && request.description) {
                    metadata.push({
                      label: t('common.description'),
                      value: '', // Nicht verwendet bei descriptionContent
                      descriptionContent: request.description, // Für expandierbare Beschreibung
                      attachmentMetadata: request.attachments || [], // Attachment-Metadaten für Vorschau
                      section: 'full'
                    });
                  }

                  // Action-Buttons zusammenstellen
                  const actionButtons = (
                    <div className="flex items-center space-x-2">
                      {/* Status-Buttons */}
                      {request.status === 'approval' && hasPermission('requests', 'write', 'table') && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(request.id, 'approved');
                            }}
                            className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                            title={t('requests.actions.approve')}
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(request.id, 'to_improve');
                            }}
                            className="p-1.5 bg-orange-600 text-white rounded hover:bg-orange-700"
                            title={t('requests.actions.improve')}
                          >
                            <ExclamationTriangleIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(request.id, 'denied');
                            }}
                            className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700"
                            title={t('requests.actions.deny')}
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {request.status === 'to_improve' && hasPermission('requests', 'write', 'table') && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(request.id, 'approval');
                            }}
                            className="p-1.5 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                            title={t('requests.actions.recheck')}
                          >
                            <ArrowPathIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(request.id, 'denied');
                            }}
                            className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700"
                            title={t('requests.actions.deny')}
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {(request.status === 'approved' || request.status === 'denied') && hasPermission('requests', 'write', 'table') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(request.id, 'approval');
                          }}
                          className="p-1.5 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                          title={t('requests.actions.recheck')}
                        >
                          <ArrowPathIcon className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('requests', 'write', 'table') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequest(request);
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title={t('common.edit')}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      )}
                      {hasPermission('requests', 'both', 'table') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyRequest(request);
                          }}
                          className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                          title={t('requests.actions.copy')}
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );

                  // Status-Workflow bestimmen für Shift-Buttons
                  const previousStatus = getPreviousStatus(request.status);
                  const nextStatuses = getNextStatuses(request.status);
                  const firstNextStatus = nextStatuses.length > 0 ? nextStatuses[0] : null;

                  return (
                    <DataCard
                      key={request.id}
                      title={request.title}
                      status={{
                        label: getStatusText(request.status, 'request', t),
                        color: getStatusColor(request.status, 'request'),
                        onPreviousClick: previousStatus && hasPermission('requests', 'write', 'table')
                          ? () => handleStatusChange(request.id, previousStatus)
                          : undefined,
                        onNextClick: firstNextStatus && hasPermission('requests', 'write', 'table')
                          ? () => handleStatusChange(request.id, firstNextStatus)
                          : undefined
                      }}
                      metadata={metadata}
                      actions={actionButtons}
                    />
                  );
                })}
              </CardGrid>
            )}
          </div>
        )}
        
        {/* "Mehr anzeigen" Button */}
        {filteredAndSortedRequests.length > displayLimit && (
          <div className="mt-4 flex justify-center">
            <button
              className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 border border-blue-300 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-gray-600"
              onClick={() => setDisplayLimit(prevLimit => prevLimit + 10)}
            >
              {t('common.showMore')} ({filteredAndSortedRequests.length - displayLimit} {t('common.remaining')})
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Requests; 