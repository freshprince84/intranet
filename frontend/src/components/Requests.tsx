import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CircularProgress } from '@mui/material';
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
import { applyFilters, evaluateDateCondition, evaluateUserRoleCondition } from '../utils/filterLogic.ts';
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
  ChevronDownIcon,
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

// Helper-Funktion für Request-Typ-Icons
const getRequestTypeIcon = (type?: string): string => {
  switch (type) {
    case 'vacation':
      return '🏖️';
    case 'improvement_suggestion':
      return '💡';
    case 'sick_leave':
      return '🤒';
    case 'employment_certificate':
      return '📄';
    case 'other':
    default:
      return '📝';
  }
};

interface Request {
  id: number;
  title: string;
  status: 'approval' | 'approved' | 'to_improve' | 'denied';
  type?: 'vacation' | 'improvement_suggestion' | 'sick_leave' | 'employment_certificate' | 'other';
  isPrivate?: boolean;
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
  key: keyof Request | 'requestedBy.firstName' | 'responsible.firstName' | 'branch.name' | 'type';
  direction: 'asc' | 'desc';
}

// Definition der verfügbaren Spalten - werden dynamisch aus Übersetzungen geladen

// Standardreihenfolge der Spalten
const defaultColumnOrder = ['title', 'requestedByResponsible', 'status', 'type', 'dueDate', 'branch', 'actions'];

// TableID für gespeicherte Filter
const REQUESTS_TABLE_ID = 'requests-table';

// Mapping zwischen Tabellen-Spalten-IDs und Card-Metadaten-IDs
// Tabellen-Spalte -> Card-Metadaten (kann Array sein für 1:N Mapping)
const tableToCardMapping: Record<string, string[]> = {
  'title': ['title'],
  'status': ['status'],
  'type': ['type'],
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
  'type': 'type',
  'requestedBy': 'requestedByResponsible',
  'responsible': 'requestedByResponsible',
  'branch': 'branch',
  'dueDate': 'dueDate',
  'description': 'description'
};

// Helfer-Funktion: Tabellen-Spalte ausgeblendet -> Card-Metadaten ausblenden
// WICHTIG: 'type' wird NICHT ausgeblendet, auch wenn die Tabellen-Spalte ausgeblendet ist
// WICHTIG: Für 'requestedByResponsible' werden die Metadaten separat verwaltet
const getHiddenCardMetadata = (hiddenTableColumns: string[]): Set<string> => {
  const hiddenCardMetadata = new Set<string>();
  const requestedByResponsibleHidden = hiddenTableColumns.includes('requestedByResponsible');
  
  hiddenTableColumns.forEach(tableCol => {
    // 'type' wird immer angezeigt, auch wenn Tabellen-Spalte ausgeblendet ist
    if (tableCol === 'type') {
      return; // Überspringe 'type', damit es immer sichtbar bleibt
    }
    
    // Spezielle Behandlung für requestedByResponsible: Wenn ausgeblendet, werden beide Metadaten ausgeblendet
    if (tableCol === 'requestedByResponsible') {
      if (requestedByResponsibleHidden) {
        hiddenCardMetadata.add('requestedBy');
        hiddenCardMetadata.add('responsible');
      }
      return; // Überspringe, da wir es bereits behandelt haben
    }
    
    const cardMetadata = tableToCardMapping[tableCol] || [];
    cardMetadata.forEach(cardMeta => {
      // Auch hier: 'type' nicht ausblenden
      if (cardMeta !== 'type') {
        hiddenCardMetadata.add(cardMeta);
      }
    });
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
  // Sicherstellen, dass 'type' immer verfügbar ist (auch wenn in Tabellen-Ansicht ausgeblendet)
  if (!cardMetadata.includes('type')) {
    cardMetadata.push('type');
  }
  // Sicherstellen, dass requestedBy und responsible immer verfügbar sind, wenn requestedByResponsible in columnOrder ist
  if (columnOrder.includes('requestedByResponsible')) {
    if (!cardMetadata.includes('requestedBy')) {
      cardMetadata.push('requestedBy');
    }
    if (!cardMetadata.includes('responsible')) {
      cardMetadata.push('responsible');
    }
  }
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
  
  // Pagination State für Requests Infinite Scroll
  const [requestsPage, setRequestsPage] = useState(1); // Aktuelle Seite für Requests
  const [requestsHasMore, setRequestsHasMore] = useState(true); // Gibt es weitere Requests?
  const [requestsLoadingMore, setRequestsLoadingMore] = useState(false); // Lädt weitere Requests?
  const REQUESTS_PER_PAGE = 20; // Requests pro Seite
  const [searchTerm, setSearchTerm] = useState('');
  
  // State-Variablen für erweiterte Filterbedingungen
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
  const [filterSortDirections, setFilterSortDirections] = useState<Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>>([]);
  
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
    { id: 'type', label: t('requests.columns.type'), shortLabel: t('requests.columns.type') },
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
  
  // Ref um zu verfolgen, ob wir die hiddenColumns selbst ändern (verhindert Endlosschleife)
  const isUpdatingHiddenColumnsRef = useRef(false);

  // View-Mode aus Settings laden
  const viewMode = settings.viewMode || 'cards';
  
  // Lokale Sortierrichtungen für Cards (nicht persistiert)
  const [cardSortDirections, setCardSortDirections] = useState<Record<string, 'asc' | 'desc'>>(() => {
    const defaults: Record<string, 'asc' | 'desc'> = {
      title: 'asc',
      status: 'asc',
      type: 'asc',
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

  // Separater State für Metadaten-Sichtbarkeit von requestedBy/responsible
  // Diese werden separat von der Tabellen-Spalte requestedByResponsible verwaltet
  const [metadataVisibility, setMetadataVisibility] = useState<{requestedBy: boolean, responsible: boolean}>(() => {
    // Initialisiere basierend auf aktuellen hiddenColumns
    const requestedByResponsibleHidden = (settings.hiddenColumns || []).includes('requestedByResponsible');
    return {
      requestedBy: !requestedByResponsibleHidden,
      responsible: !requestedByResponsibleHidden
    };
  });

  // Synchronisiere metadataVisibility mit settings.hiddenColumns (nur wenn von außen geändert)
  useEffect(() => {
    // Überspringe Synchronisation, wenn wir selbst die hiddenColumns ändern
    if (isUpdatingHiddenColumnsRef.current) {
      isUpdatingHiddenColumnsRef.current = false;
      return;
    }
    
    const requestedByResponsibleHidden = (settings.hiddenColumns || []).includes('requestedByResponsible');
    // Wenn requestedByResponsible ausgeblendet ist, sind beide ausgeblendet
    // Wenn es nicht ausgeblendet ist, sind beide standardmäßig sichtbar (beim Neuladen)
    setMetadataVisibility(prev => {
      // Nur aktualisieren, wenn sich der Zustand geändert hat
      if (requestedByResponsibleHidden) {
        if (prev.requestedBy === true || prev.responsible === true) {
          return { requestedBy: false, responsible: false };
        }
      } else {
        // Wenn requestedByResponsible nicht ausgeblendet ist, aber beide aktuell ausgeblendet sind,
        // dann wurden sie wahrscheinlich manuell ausgeblendet, also nicht überschreiben
        // Nur wenn beide aktuell ausgeblendet sind UND requestedByResponsible nicht ausgeblendet ist,
        // dann setzen wir beide auf true (beim Neuladen, wenn beide ausgeblendet waren)
        if (prev.requestedBy === false && prev.responsible === false) {
          return { requestedBy: true, responsible: true };
        }
      }
      return prev;
    });
  }, [settings.hiddenColumns]);

  // Versteckte Card-Metadaten aus hiddenColumns ableiten
  const hiddenCardMetadata = useMemo(() => {
    const hidden = getHiddenCardMetadata(settings.hiddenColumns || []);
    
    // Überschreibe für requestedBy/responsible mit separatem State
    if (!metadataVisibility.requestedBy) {
      hidden.add('requestedBy');
    } else {
      hidden.delete('requestedBy');
    }
    if (!metadataVisibility.responsible) {
      hidden.add('responsible');
    } else {
      hidden.delete('responsible');
    }
    
    return hidden;
  }, [settings.hiddenColumns, metadataVisibility]);

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

  const fetchRequests = async (
    filterId?: number, 
    filterConditions?: any[], 
    background = false,
    page: number = 1, // Neue Parameter für Pagination
    append: boolean = false // Neue Parameter: Sollen Requests angehängt werden?
  ) => {
    try {
      if (!background && !append) {
        setLoading(true);
      }
      if (append) {
        setRequestsLoadingMore(true);
      }
      
      // Baue Query-Parameter
      const offset = (page - 1) * REQUESTS_PER_PAGE; // Offset für Pagination berechnen
      const params: any = {
        limit: REQUESTS_PER_PAGE, // Immer Limit für initiales Laden
        offset: offset, // Offset für Pagination
      };
      if (filterId) {
        params.filterId = filterId;
      } else if (filterConditions && filterConditions.length > 0) {
        params.filterConditions = JSON.stringify({
          conditions: filterConditions,
          operators: filterLogicalOperators
        });
      }
      
      const response = await axiosInstance.get('/requests', { params });
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
      
      if (append) {
        // Infinite Scroll: Füge Requests zu bestehenden hinzu
        // ✅ MEMORY: Nur max 100 Items im State behalten (alte Items automatisch entfernen)
        const MAX_ITEMS_IN_STATE = 100;
        setRequests(prevRequests => {
          const newRequests = [...prevRequests, ...requestsWithAttachments];
          // Wenn mehr als MAX_ITEMS_IN_STATE: Älteste entfernen (behalte neueste)
          if (newRequests.length > MAX_ITEMS_IN_STATE) {
            return newRequests.slice(-MAX_ITEMS_IN_STATE);
          }
          return newRequests;
        });
        // Prüfe ob es weitere Requests gibt
        setRequestsHasMore(requestsWithAttachments.length === REQUESTS_PER_PAGE);
        setRequestsPage(page);
        console.log('📋 Weitere Requests geladen:', requestsWithAttachments.length, 'Requests (Seite', page, ')');
      } else {
        // Initiales Laden: Ersetze Requests
        setRequests(requestsWithAttachments);
        setRequestsHasMore(requestsWithAttachments.length === REQUESTS_PER_PAGE);
        setRequestsPage(1);
      }
      setError(null);
    } catch (err) {
      console.error('Request Error:', err);
      // Einfachere Fehlerbehandlung ohne axios-Import
      const axiosError = err as any;
      if (!background && !append) {
        if (axiosError.code === 'ERR_NETWORK') {
          setError('Verbindung zum Server konnte nicht hergestellt werden. Bitte stellen Sie sicher, dass der Server läuft.');
        } else {
          setError(`Fehler beim Laden der Requests: ${axiosError.response?.data?.message || axiosError.message}`);
        }
      }
    } finally {
      if (!background && !append) {
        setLoading(false);
      }
      if (append) {
        setRequestsLoadingMore(false);
      }
    }
  };
  
  // Funktion zum Laden weiterer Requests (Infinite Scroll)
  // ✅ PERFORMANCE: filterConditions als useRef verwenden (verhindert Re-Render-Loops)
  const filterConditionsRef = useRef(filterConditions);
  useEffect(() => {
    filterConditionsRef.current = filterConditions;
  }, [filterConditions]);

  // ✅ PERFORMANCE: loadMoreRequests als useCallback (stabile Referenz für useEffect)
  const loadMoreRequests = useCallback(async () => {
    if (requestsLoadingMore || !requestsHasMore) return;
    
    const nextPage = requestsPage + 1;
    // ✅ PERFORMANCE: Verwende filterConditionsRef.current (wird im Scroll-Handler verwendet)
    await fetchRequests(
      selectedFilterId || undefined,
      filterConditionsRef.current.length > 0 ? filterConditionsRef.current : undefined,
      false,
      nextPage,
      true // append = true
    );
  }, [requestsLoadingMore, requestsHasMore, requestsPage, selectedFilterId, fetchRequests]);

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

  // Infinite Scroll Handler für Requests
  // ✅ PERFORMANCE: Scroll-Handler ohne filterConditions Dependency (verhindert Re-Render-Loops)
  useEffect(() => {
    const handleScroll = () => {
      // Prüfe ob User nahe am Ende der Seite ist
      if (
        window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 1000 &&
        !requestsLoadingMore &&
        requestsHasMore
      ) {
        loadMoreRequests();
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [requestsLoadingMore, requestsHasMore, selectedFilterId, requestsPage]);

  // Initial Requests laden (ohne Filter - SavedFilterTags wendet Default-Filter an)
  useEffect(() => {
    fetchRequests();
  }, []);

  // ✅ MEMORY: Cleanup - Requests Array beim Unmount löschen
  useEffect(() => {
    return () => {
      setRequests([]);
      setFilterConditions([]);
    };
  }, []); // Nur beim Unmount ausführen

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

  const applyFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>) => {
    setFilterConditions(conditions);
    setFilterLogicalOperators(operators);
    if (sortDirections !== undefined) {
      // Sicherstellen, dass sortDirections ein Array ist
      const validSortDirections = Array.isArray(sortDirections) ? sortDirections : [];
      setFilterSortDirections(validSortDirections);
    }
  };
  
  const resetFilterConditions = () => {
    setFilterConditions([]);
    setFilterLogicalOperators([]);
    setFilterSortDirections([]);
    setActiveFilterName('');
    setSelectedFilterId(null);
  };
  
  // Filter Change Handler (Controlled Mode)
  const handleFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>) => {
    setActiveFilterName(name);
    setSelectedFilterId(id);
    applyFilterConditions(conditions, operators, sortDirections);
    // Table-Header-Sortierung zurücksetzen, damit Filter-Sortierung übernimmt
    setSortConfig({ key: 'dueDate', direction: 'asc' });
    
    // Pagination zurücksetzen bei Filter-Wechsel
    setRequestsPage(1);
    setRequestsHasMore(true);
    
    // Wenn Filter-ID vorhanden (Standardfilter): Server-seitig laden
    // Sonst: Client-seitig filtern (komplexe Filter)
    if (id) {
      await fetchRequests(id, undefined, false, 1, false); // Reset auf Seite 1, nicht append
    }
    // Wenn kein ID: Client-seitiges Filtering wird automatisch durch filteredAndSortedRequests angewendet
  };

  const getActiveFilterCount = () => {
    return filterConditions.length;
  };

  const filteredAndSortedRequests = useMemo(() => {
    // Verwende requests (bereits server-seitig gefiltert)
    const requestsToFilter = requests;
    
    return requestsToFilter
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
            'type': (req: Request, cond: FilterCondition) => {
              const requestType = req.type || 'other';
              if (cond.operator === 'equals') return requestType === cond.value;
              if (cond.operator === 'notEquals') return requestType !== cond.value;
              return null;
            },
            'requestedBy': (req: Request, cond: FilterCondition) => {
              // Unterstützt user-{id} Format und Text-Fallback
              const requestedByName = `${req.requestedBy.firstName} ${req.requestedBy.lastName}`;
              return evaluateUserRoleCondition(
                req.requestedBy.id,
                null, // Requests haben keine Rollen
                cond,
                requestedByName
              );
            },
            'responsible': (req: Request, cond: FilterCondition) => {
              // Unterstützt user-{id} Format und Text-Fallback
              const responsibleName = `${req.responsible.firstName} ${req.responsible.lastName}`;
              return evaluateUserRoleCondition(
                req.responsible.id,
                null, // Requests haben keine Rollen
                cond,
                responsibleName
              );
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
              case 'type': return req.type || 'other';
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
        // Hilfsfunktion zum Abrufen von Sortierwerten
        const getSortValue = (request: Request, columnId: string): any => {
          switch (columnId) {
            case 'title':
              return request.title.toLowerCase();
            case 'status':
              const statusOrder: Record<string, number> = {
                'approval': 0,
                'to_improve': 1,
                'approved': 2,
                'denied': 3
              };
              return statusOrder[request.status] ?? 999;
            case 'type':
              const typeOrder: Record<string, number> = {
                'vacation': 0,
                'improvement_suggestion': 1,
                'sick_leave': 2,
                'employment_certificate': 3,
                'other': 4
              };
              return typeOrder[request.type || 'other'] ?? 999;
            case 'requestedBy':
            case 'requestedByResponsible':
              return `${request.requestedBy.firstName} ${request.requestedBy.lastName}`.toLowerCase();
            case 'responsible':
              return `${request.responsible.firstName} ${request.responsible.lastName}`.toLowerCase();
            case 'branch':
              return request.branch.name.toLowerCase();
            case 'dueDate':
              return new Date(request.dueDate).getTime();
            case 'description':
              return (request.description || '').toLowerCase();
            default:
              return '';
          }
        };
        
        // 1. Priorität: Table-Header-Sortierung (temporäre Überschreibung, auch wenn Filter aktiv)
        if (viewMode === 'table' && sortConfig.key) {
          const valueA = getSortValue(a, sortConfig.key);
          const valueB = getSortValue(b, sortConfig.key);
          
          let comparison = 0;
          if (typeof valueA === 'number' && typeof valueB === 'number') {
            comparison = valueA - valueB;
          } else {
            comparison = String(valueA).localeCompare(String(valueB));
          }
          
          if (comparison !== 0) {
            return sortConfig.direction === 'asc' ? comparison : -comparison;
          }
        }
        
        // 2. Priorität: Filter-Sortierrichtungen (wenn Filter aktiv)
        if (filterSortDirections.length > 0 && filterConditions.length > 0) {
          // Sortiere nach Priorität (1, 2, 3, ...)
          const sortedByPriority = [...filterSortDirections].sort((sd1, sd2) => sd1.priority - sd2.priority);
          
          for (const sortDir of sortedByPriority) {
            const valueA = getSortValue(a, sortDir.column);
            const valueB = getSortValue(b, sortDir.column);
            
            let comparison = 0;
            if (typeof valueA === 'number' && typeof valueB === 'number') {
              comparison = valueA - valueB;
            } else {
              comparison = String(valueA).localeCompare(String(valueB));
            }
            
            if (sortDir.direction === 'desc') {
              comparison = -comparison;
            }
            
            if (comparison !== 0) {
              return comparison;
            }
          }
          return 0;
        }
        
        // 3. Priorität: Cards-Mode Multi-Sortierung (wenn kein Filter aktiv, Cards-Mode)
        if (viewMode === 'cards' && filterConditions.length === 0) {
          const sortableColumns = cardMetadataOrder.filter(colId => visibleCardMetadata.has(colId));
          
          for (const columnId of sortableColumns) {
            const valueA = getSortValue(a, columnId);
            const valueB = getSortValue(b, columnId);
            
            const direction = cardSortDirections[columnId] || 'asc';
            let comparison = 0;
            if (typeof valueA === 'number' && typeof valueB === 'number') {
              comparison = valueA - valueB;
            } else {
              comparison = String(valueA).localeCompare(String(valueB));
            }
            
            if (direction === 'desc') {
              comparison = -comparison;
            }
            
            if (comparison !== 0) {
              return comparison;
            }
          }
          return 0;
        }
        
        // 4. Priorität: Tabellen-Mode Einzel-Sortierung (wenn kein Filter aktiv, Table-Mode)
        if (viewMode === 'table' && filterConditions.length === 0 && sortConfig.key) {
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
          } else if (sortConfig.key === 'type') {
            const typeOrder: Record<string, number> = {
              'vacation': 0,
              'improvement_suggestion': 1,
              'sick_leave': 2,
              'employment_certificate': 3,
              'other': 4
            };
            aValue = typeOrder[(a as any).type || 'other'] ?? 999;
            bValue = typeOrder[(b as any).type || 'other'] ?? 999;
          }

          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }
        
        // 5. Fallback: Standardsortierung
        return 0;
      });
  }, [requests, selectedFilterId, searchTerm, sortConfig, filterConditions, filterLogicalOperators, filterSortDirections, viewMode, cardMetadataOrder, visibleCardMetadata, cardSortDirections]);

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
        type: request.type || 'other',
        is_private: request.isPrivate || false,
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

  // ✅ PERFORMANCE: Skeleton-Loading für LCP-Element (sofort sichtbar, auch ohne Daten)
  if (loading && requests.length === 0) {
    return (
      <div className="-mx-3 sm:-mx-4 md:-mx-6">
        <CardGrid>
          {Array(3).fill(null).map((_, i) => (
            <div key={`skeleton-${i}`} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-3 sm:p-4 md:p-5 lg:p-6 shadow-sm">
              <div className="space-y-4">
                {/* LCP-Element: Titel-Skeleton */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded flex-1 min-w-0"></div>
                </div>
                {/* Status-Skeleton */}
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                {/* Metadaten-Skeleton */}
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          ))}
        </CardGrid>
      </div>
    );
  }
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

      {/* Neu angeordnete UI-Elemente in einer Zeile */}
      <div className="flex items-center mb-4 justify-between px-3 sm:px-4 md:px-6">
          {/* Linke Seite: "Neuer Request"-Button */}
          <div className="flex items-center">
            {hasPermission('requests', 'write', 'table') && (
              <div className="relative group">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm flex items-center justify-center"
                  style={{ width: '30.19px', height: '30.19px' }}
                  aria-label={t('requests.createRequest')}
                  data-onboarding="create-request-button"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                  {t('requests.createRequest')}
                </div>
              </div>
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
            <div className="relative group">
              <button
                className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  viewMode === 'cards' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''
                }`}
                onClick={() => updateViewMode(viewMode === 'table' ? 'cards' : 'table')}
              >
                {viewMode === 'table' ? (
                  <Squares2X2Icon className="h-5 w-5" />
                ) : (
                  <TableCellsIcon className="h-5 w-5" />
                )}
              </button>
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                {viewMode === 'table' ? t('common.viewAsCards') : t('common.viewAsTable')}
              </div>
            </div>
            
            {/* Filter-Button */}
            <div className="relative group">
              <button
                className={`p-2 rounded-md ${getActiveFilterCount() > 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} ml-1`}
                onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
              >
                <FunnelIcon className="h-5 w-5" />
                {getActiveFilterCount() > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 dark:bg-blue-500 text-white rounded-full text-xs flex items-center justify-center z-10" style={{ position: 'absolute', top: '-0.25rem', right: '-0.25rem' }}>
                    {getActiveFilterCount()}
                  </span>
                )}
              </button>
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                {t('common.filter')}
              </div>
            </div>
            
            {/* Anzeige anpassen - bei beiden Ansichten */}
            <div className="ml-1">
              <TableColumnConfig
                columns={viewMode === 'cards'
                  ? [
                      { id: 'title', label: t('requests.columns.title') },
                      { id: 'status', label: t('requests.columns.status') },
                      { id: 'type', label: t('requests.columns.type') },
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
                      // Spezielle Logik für requestedByResponsible - Metadaten separat verwalten
                      if (tableColumnId === 'requestedByResponsible') {
                        // Toggle die Metadaten-Sichtbarkeit im separaten State
                        const newMetadataVisibility = { ...metadataVisibility };
                        if (columnId === 'requestedBy') {
                          newMetadataVisibility.requestedBy = !newMetadataVisibility.requestedBy;
                        } else if (columnId === 'responsible') {
                          newMetadataVisibility.responsible = !newMetadataVisibility.responsible;
                        }
                        setMetadataVisibility(newMetadataVisibility);
                        
                        // Aktualisiere hiddenColumns basierend auf Metadaten-Sichtbarkeit
                        const newHiddenColumns = [...settings.hiddenColumns];
                        const tableColumnIndex = newHiddenColumns.indexOf(tableColumnId);
                        
                        // Wenn beide Metadaten ausgeblendet sind, blende requestedByResponsible aus
                        // Wenn mindestens eine sichtbar ist, blende requestedByResponsible ein
                        if (!newMetadataVisibility.requestedBy && !newMetadataVisibility.responsible) {
                          // Beide ausgeblendet → requestedByResponsible ausblenden
                          if (tableColumnIndex === -1) {
                            newHiddenColumns.push(tableColumnId);
                            isUpdatingHiddenColumnsRef.current = true;
                            updateHiddenColumns(newHiddenColumns);
                          }
                        } else {
                          // Mindestens eine sichtbar → requestedByResponsible einblenden
                          if (tableColumnIndex !== -1) {
                            newHiddenColumns.splice(tableColumnIndex, 1);
                            isUpdatingHiddenColumnsRef.current = true;
                            updateHiddenColumns(newHiddenColumns);
                          }
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
                sortDirections={undefined}
                onSortDirectionChange={undefined}
                showSortDirection={false}
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
              { id: 'type', label: t('requests.columns.type') },
              { id: 'requestedBy', label: t('requests.columns.requestedBy').replace(':', '') },
              { id: 'responsible', label: t('requests.columns.responsible').replace(':', '') },
              { id: 'dueDate', label: t('requests.columns.dueDate') },
              { id: 'status', label: t('requests.columns.status') },
              { id: 'branch', label: t('requests.columns.branch') }
            ]}
            onApply={applyFilterConditions}
            onReset={resetFilterConditions}
            savedConditions={filterConditions}
            savedOperators={filterLogicalOperators}
            savedSortDirections={filterSortDirections}
            onSortDirectionsChange={setFilterSortDirections}
            tableId={REQUESTS_TABLE_ID}
            />
          </div>
        )}
        
        {/* Gespeicherte Filter als Tags anzeigen */}
        <div className={viewMode === 'cards' ? '-mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6' : 'px-3 sm:px-4 md:px-6'}>
          <SavedFilterTags
          tableId={REQUESTS_TABLE_ID}
          onSelectFilter={(conditions, operators, sortDirections) => applyFilterConditions(conditions, operators, sortDirections)}
          onReset={resetFilterConditions}
          activeFilterName={activeFilterName}
          selectedFilterId={selectedFilterId}
          onFilterChange={(name, id, conditions, operators, sortDirections) => handleFilterChange(name, id, conditions, operators, sortDirections)}
          defaultFilterName="Aktuell"
          />
        </div>

        {/* Conditional Rendering: Table oder Cards */}
        {viewMode === 'table' ? (
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
                  if (columnId === 'type') sortKey = 'type';
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
                  {filteredAndSortedRequests.map(request => {
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
                                      >
                                        <InformationCircleIcon className="h-5 w-5" />
                                      </button>
                                      <div className="absolute left-0 mt-2 p-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 w-144 max-h-96 overflow-y-auto min-w-[36rem] z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
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
                          case 'type':
                            return (
                              <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-200">
                                  <span className="text-lg">{getRequestTypeIcon(request.type)}</span>
                                  <span>{request.type ? t(`requests.types.${request.type}`) : t('requests.types.other')}</span>
                                  {request.isPrivate && (
                                    <div className="relative group inline-block ml-1">
                                      <span className="text-xs text-gray-500 dark:text-gray-400">🔒</span>
                                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                        {t('createRequest.form.isPrivate')}
                                      </div>
                                    </div>
                                  )}
                                </div>
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
                                      <div className="relative group">
                                        <button
                                          onClick={() => handleStatusChange(request.id, 'approved')}
                                          className="p-1 bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-600"
                                        >
                                          <CheckIcon className="h-5 w-5" />
                                        </button>
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                          {t('requests.actions.approve')}
                                        </div>
                                      </div>
                                      <div className="relative group">
                                        <button
                                          onClick={() => handleStatusChange(request.id, 'to_improve')}
                                          className="p-1 bg-orange-600 dark:bg-orange-500 text-white rounded hover:bg-orange-700 dark:hover:bg-orange-600"
                                        >
                                          <ExclamationTriangleIcon className="h-5 w-5" />
                                        </button>
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                          {t('requests.actions.improve')}
                                        </div>
                                      </div>
                                      <div className="relative group">
                                        <button
                                          onClick={() => handleStatusChange(request.id, 'denied')}
                                          className="p-1 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600"
                                        >
                                          <XMarkIcon className="h-5 w-5" />
                                        </button>
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                          {t('requests.actions.deny')}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                  {request.status === 'to_improve' && hasPermission('requests', 'write', 'table') && (
                                    <>
                                      <div className="relative group">
                                        <button
                                          onClick={() => handleStatusChange(request.id, 'approval')}
                                          className="p-1 bg-yellow-600 dark:bg-yellow-500 text-white rounded hover:bg-yellow-700 dark:hover:bg-yellow-600"
                                        >
                                          <ArrowPathIcon className="h-5 w-5" />
                                        </button>
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                          {t('requests.actions.recheck')}
                                        </div>
                                      </div>
                                      <div className="relative group">
                                        <button
                                          onClick={() => handleStatusChange(request.id, 'denied')}
                                          className="p-1 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600"
                                        >
                                          <XMarkIcon className="h-5 w-5" />
                                        </button>
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                          {t('requests.actions.deny')}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                  {(request.status === 'approved' || request.status === 'denied') && hasPermission('requests', 'write', 'table') && (
                                    <div className="relative group">
                                      <button
                                        onClick={() => handleStatusChange(request.id, 'approval')}
                                        className="p-1 bg-yellow-600 dark:bg-yellow-500 text-white rounded hover:bg-yellow-700 dark:hover:bg-yellow-600"
                                      >
                                        <ArrowPathIcon className="h-5 w-5" />
                                      </button>
                                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                        {t('requests.actions.recheck')}
                                      </div>
                                    </div>
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
                                    <div className="relative group">
                                      <button
                                        onClick={() => handleCopyRequest(request)}
                                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 copy-button ml-0.5"
                                      >
                                        <DocumentDuplicateIcon className="h-5 w-5" />
                                      </button>
                                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                        {t('requests.actions.copy')}
                                      </div>
                                    </div>
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
                {filteredAndSortedRequests.map(request => {
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
                  
                  // Haupt-Metadaten: Typ (ohne Label, nur Wert) - auf gleicher Zeile wie Titel, Datum, Status
                  if (visibleCardMetadata.has('type')) {
                    const typeIcon = getRequestTypeIcon(request.type);
                    const typeLabel = request.type ? t(`requests.types.${request.type}`) : t('requests.types.other');
                    metadata.push({
                      label: '', // Kein Label, nur Wert
                      value: `${typeIcon} ${typeLabel}${request.isPrivate ? ' 🔒' : ''}`,
                      section: 'main'
                    });
                  }
                  
                  // Haupt-Metadaten: Ersteller (zweite Zeile, unter Typ)
                  if (visibleCardMetadata.has('requestedBy')) {
                    // Benutzernamen auf 4 Zeichen kürzen
                    const requestedByName = `${request.requestedBy.firstName} ${request.requestedBy.lastName}`;
                    const shortenedName = requestedByName.length > 4 ? requestedByName.substring(0, 4) : requestedByName;
                    metadata.push({
                      icon: <UserIcon className="h-4 w-4" />,
                      label: t('requests.columns.requestedBy'),
                      value: shortenedName,
                      section: 'main-second'
                    });
                  }
                  
                  // Verantwortlicher (dritte Zeile, unter Ersteller)
                  if (visibleCardMetadata.has('responsible')) {
                    // Benutzernamen auf 4 Zeichen kürzen
                    const responsibleName = `${request.responsible.firstName} ${request.responsible.lastName}`;
                    const shortenedName = responsibleName.length > 4 ? responsibleName.substring(0, 4) : responsibleName;
                    metadata.push({
                      icon: <UserIcon className="h-4 w-4" />,
                      label: t('requests.columns.responsible'),
                      value: shortenedName,
                      section: 'main-third'
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
                          <div className="relative group">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(request.id, 'approved');
                              }}
                              className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                              {t('requests.actions.approve')}
                            </div>
                          </div>
                          <div className="relative group">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(request.id, 'to_improve');
                              }}
                              className="p-1.5 bg-orange-600 text-white rounded hover:bg-orange-700"
                            >
                              <ExclamationTriangleIcon className="h-4 w-4" />
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                              {t('requests.actions.improve')}
                            </div>
                          </div>
                          <div className="relative group">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(request.id, 'denied');
                              }}
                              className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                              {t('requests.actions.deny')}
                            </div>
                          </div>
                        </>
                      )}
                      {request.status === 'to_improve' && hasPermission('requests', 'write', 'table') && (
                        <>
                          <div className="relative group">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(request.id, 'approval');
                              }}
                              className="p-1.5 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                            >
                              <ArrowPathIcon className="h-4 w-4" />
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                              {t('requests.actions.recheck')}
                            </div>
                          </div>
                          <div className="relative group">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(request.id, 'denied');
                              }}
                              className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                              {t('requests.actions.deny')}
                            </div>
                          </div>
                        </>
                      )}
                      {(request.status === 'approved' || request.status === 'denied') && hasPermission('requests', 'write', 'table') && (
                        <div className="relative group">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(request.id, 'approval');
                            }}
                            className="p-1.5 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                          >
                            <ArrowPathIcon className="h-4 w-4" />
                          </button>
                          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                            {t('requests.actions.recheck')}
                          </div>
                        </div>
                      )}
                      {hasPermission('requests', 'write', 'table') && (
                        <div className="relative group">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequest(request);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                            {t('common.edit')}
                          </div>
                        </div>
                      )}
                      {hasPermission('requests', 'both', 'table') && (
                        <div className="relative group">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyRequest(request);
                            }}
                            className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                          >
                            <DocumentDuplicateIcon className="h-4 w-4" />
                          </button>
                          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                            {t('requests.actions.copy')}
                          </div>
                        </div>
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
                      title={
                        <span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">{request.id}:</span>{' '}
                          <span>{request.title}</span>
                        </span>
                      }
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
        
        {/* Loading Indicator für Infinite Scroll - Requests */}
        {requestsLoadingMore && (
          <div className="mt-4 flex justify-center items-center py-4">
            <CircularProgress size={24} />
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              {t('common.loadingMoreRequests', 'Lädt weitere Requests...')}
            </span>
          </div>
        )}
    </>
  );
};

export default Requests; 