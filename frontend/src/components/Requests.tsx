import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CircularProgress } from '@mui/material';
import axiosInstance from '../config/axios.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useTableSettings } from '../hooks/useTableSettings.ts';
import { useFilterContext } from '../contexts/FilterContext.tsx';
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
import ResponsiveLabel from './shared/ResponsiveLabel.tsx';
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
    case 'event':
      return '📅';
    case 'permit':
      return '📋';
    case 'buy_order':
      return '🛒';
    case 'repair':
      return '🔧';
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

// Maximale Anzahl Requests im Memory (verhindert Memory Leaks bei Infinite Scroll)
const MAX_REQUESTS = 200;

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
  const [totalCount, setTotalCount] = useState<number>(0); // ✅ PAGINATION: Gesamtanzahl
  const [hasMore, setHasMore] = useState<boolean>(true); // ✅ PAGINATION: Gibt es noch weitere Items?
  const [loading, setLoading] = useState(false); // ✅ FIX: Initial false, damit Fallback nicht blockiert wird
  const [loadingMore, setLoadingMore] = useState(false); // ✅ PAGINATION: Lädt weitere Items
  const [error, setError] = useState<string | null>(null);
  
  // ❌ ENTFERNEN: displayLimit nicht mehr nötig (Pagination lädt nur benötigte Items)
  const [searchTerm, setSearchTerm] = useState('');
  
  // State-Variablen für erweiterte Filterbedingungen
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
  
  // Filter State Management (Controlled Mode)
  const [activeFilterName, setActiveFilterName] = useState<string>('');
  const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);
  
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  
  // Status-Funktionen (verwende zentrale Utils mit Übersetzungsunterstützung)
  // ❌ ENTFERNT: getStatusLabel Wrapper - getStatusText wird direkt verwendet (Phase 3)
  
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
    updateViewMode,
    updateSortConfig
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
  
  // Hauptsortierung aus Settings laden (für Table & Cards synchron)
  const sortConfig: SortConfig = useMemo(() => {
    return settings.sortConfig || { key: 'dueDate', direction: 'asc' };
  }, [settings.sortConfig]);
  
  // Hauptsortierung Handler (für Table & Cards synchron)
  const handleMainSortChange = useCallback((key: string, direction: 'asc' | 'desc') => {
    updateSortConfig({ key: key as SortConfig['key'], direction });
  }, [updateSortConfig]);

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

  // ✅ PAGINATION: fetchRequests mit Pagination
  // ✅ MEMORY-LEAK-FIX: operators als Parameter statt aus State lesen
  const fetchRequests = useCallback(async (
    filterId?: number, 
    filterConditions?: any[], 
    append = false, // ✅ PAGINATION: Items anhängen statt ersetzen
    limit = 20,
    offset = 0,
    operators?: ('AND' | 'OR')[], // ✅ NEU: operators als Parameter
    sortBy?: string, // ✅ NEU: Sortier-Parameter
    sortOrder?: 'asc' | 'desc'
  ) => {
    try {
      if (!append) {
        setLoading(true); // ✅ FIX: Setze loading = true BEVOR Daten geladen werden
      } else {
        setLoadingMore(true);
      }
      
      // ✅ PAGINATION: limit/offset Parameter
      const params: any = {
        limit: limit,
        offset: offset,
        includeAttachments: 'true', // ✅ VORSCHAU: Attachments für Bild/Link-Vorschau benötigt
        sortBy: sortBy || sortConfig.key, // ✅ SORTIERUNG: Aktuelle Sortierung mitgeben
        sortOrder: sortOrder || sortConfig.direction
      };
      if (filterId) {
        params.filterId = filterId;
      } else if (filterConditions && filterConditions.length > 0) {
        params.filterConditions = JSON.stringify({
          conditions: filterConditions,
          operators: operators || [] // ✅ MEMORY-LEAK-FIX: Parameter statt State
        });
      }
      
      const response = await axiosInstance.get('/requests', { params });
      const responseData = response.data;
      
      // ✅ MEMORY: Debug-Logs deaktiviert um Memory zu sparen
      // console.log('[Requests] Response-Struktur:', {
      //   isObject: typeof responseData === 'object',
      //   hasData: responseData?.data !== undefined,
      //   dataIsArray: Array.isArray(responseData?.data),
      //   responseDataIsArray: Array.isArray(responseData),
      //   keys: responseData ? Object.keys(responseData) : [],
      //   dataType: responseData?.data ? typeof responseData.data : 'undefined'
      // });
      
      // ✅ PAGINATION: Response-Struktur mit totalCount
      // Sicherstellen, dass requestsData immer ein Array ist
      let requestsData: Request[] = [];
      let totalCount = 0;
      let hasMore = false;
      
      if (responseData && typeof responseData === 'object') {
        // Neue Response-Struktur: { data: [...], totalCount: ..., hasMore: ... }
        if (Array.isArray(responseData.data)) {
          requestsData = responseData.data;
          totalCount = responseData.totalCount || requestsData.length;
          hasMore = responseData.hasMore !== undefined 
            ? responseData.hasMore 
            : (offset + requestsData.length < totalCount);
        } else if (Array.isArray(responseData)) {
          // Fallback: Alte Response-Struktur (direktes Array)
          requestsData = responseData;
          totalCount = requestsData.length;
          hasMore = false;
        } else {
          // ❌ FEHLER: responseData ist ein Objekt, aber data ist kein Array
          if (process.env.NODE_ENV === 'development') {
          console.error('[Requests] ❌ FEHLER: responseData.data ist kein Array!', {
            responseData,
            data: responseData.data,
            dataType: typeof responseData.data
          });
          }
          throw new Error(`Ungültige Response-Struktur: responseData.data ist kein Array (Typ: ${typeof responseData.data})`);
        }
      } else {
        // ❌ FEHLER: responseData ist kein Objekt
        if (process.env.NODE_ENV === 'development') {
        console.error('[Requests] ❌ FEHLER: responseData ist kein Objekt!', {
          responseData,
          type: typeof responseData
        });
        }
        throw new Error(`Ungültige Response-Struktur: responseData ist kein Objekt (Typ: ${typeof responseData})`);
      }
      
      // ✅ Sicherheitsprüfung: requestsData muss ein Array sein
      if (!Array.isArray(requestsData)) {
        if (process.env.NODE_ENV === 'development') {
        console.error('[Requests] ❌ FEHLER: requestsData ist kein Array!', {
          requestsData,
          type: typeof requestsData
        });
        }
        throw new Error(`Ungültige Response-Struktur: requestsData ist kein Array (Typ: ${typeof requestsData})`);
      }
      
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
        // ✅ PAGINATION: Items anhängen (Infinite Scroll)
        // ✅ DEDUPLIZIERUNG: Verhindert doppelte Einträge durch ID-Filter
        setRequests(prev => {
          const existingIds = new Set(prev.map(r => r.id));
          const uniqueNewRequests = requestsWithAttachments.filter(r => !existingIds.has(r.id));
          const combined = [...prev, ...uniqueNewRequests];
          
          // ✅ MEMORY LEAK FIX: Begrenzung der maximalen Anzahl Requests im Memory
          if (combined.length > MAX_REQUESTS) {
            return combined.slice(-MAX_REQUESTS);
          }
          return combined;
        });
      } else {
        // ✅ PAGINATION: Items ersetzen (Initial oder Filter-Change)
        // ✅ PERFORMANCE: Direktes Setzen überschreibt alte Referenz (React macht automatisches Cleanup)
        setRequests(requestsWithAttachments);
      }
      
      setTotalCount(totalCount);
      setHasMore(hasMore);
      setError(null);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
      console.error('Request Error:', err);
      }
      const axiosError = err as any;
      if (!append) {
        if (axiosError.code === 'ERR_NETWORK') {
          setError('Verbindung zum Server konnte nicht hergestellt werden. Bitte stellen Sie sicher, dass der Server läuft.');
        } else {
          // Zeige detaillierte Fehlermeldung
          const errorMessage = axiosError.response?.data?.message 
            || axiosError.response?.data?.error 
            || axiosError.message 
            || 'Unbekannter Fehler';
          if (process.env.NODE_ENV === 'development') {
          console.error('Request Error Details:', {
            message: errorMessage,
            status: axiosError.response?.status,
            data: axiosError.response?.data
          });
          }
          setError(`Fehler beim Laden der Requests: ${errorMessage}`);
        }
      }
    } finally {
      if (!append) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, []); // ✅ MEMORY-LEAK-FIX: Keine Dependencies - operators kommt als Parameter

  // ❌ loadMoreRequests entfernt - nicht mehr nötig (Infinite Scroll nur für Anzeige)

  // ✅ Standard-Filter werden jetzt im Seed erstellt, nicht mehr im Frontend

  // ❌ ENTFERNT: filterConditionsRef - Wird nicht mehr verwendet, Dependencies sind korrekt (Phase 3)

  // ✅ PAGINATION: Infinite Scroll mit Intersection Observer
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // ✅ MEMORY: Ref für aktuelle requests.length (verhindert Endlosschleife durch requests.length in Dependencies)
  const requestsLengthRef = useRef(requests.length);
  
  // ✅ MEMORY: Aktualisiere Ref wenn requests sich ändert
  useEffect(() => {
    requestsLengthRef.current = requests.length;
  }, [requests.length]);


  // ❌ ENTFERNT: Cleanup useEffect - React macht automatisches Cleanup, manuelles Löschen ist überflüssig (Phase 3)

  // getStatusText wird direkt von statusUtils verwendet (getStatusLabel Wrapper wurde entfernt - Phase 3)

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

  const handleSort = useCallback((key: SortConfig['key']) => {
    // Table-Header-Sortierung: Aktualisiert Hauptsortierung direkt (synchron für Table & Cards)
    // ✅ FIX: Verwende settings.sortConfig direkt (aktueller Wert) statt Closure-Variable
    const currentSortConfig = settings.sortConfig || { key: 'dueDate', direction: 'asc' };
    const newDirection = currentSortConfig.key === key && currentSortConfig.direction === 'asc' ? 'desc' : 'asc';
    updateSortConfig({ key, direction: newDirection });
  }, [settings.sortConfig, updateSortConfig]);

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
      if (process.env.NODE_ENV === 'development') {
      console.error('Status Update Error:', err);
      }
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

  // ✅ FIX: Mit useCallback stabilisieren (wird in handleFilterChange verwendet)
  const applyFilterConditions = useCallback(async (conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setFilterConditions(conditions);
    setFilterLogicalOperators(operators);
    
    // ✅ FIX: Lade Daten mit Filter (server-seitig)
    setSelectedFilterId(null); // Kein gespeicherter Filter, nur direkte Bedingungen
    setActiveFilterName(''); // Kein Filter-Name
    updateSortConfig({ key: 'dueDate', direction: 'asc' }); // Reset Sortierung
    
    if (conditions.length > 0) {
      await fetchRequests(undefined, conditions, false, 20, 0, operators); // ✅ MEMORY-LEAK-FIX: operators als Parameter
    } else {
      await fetchRequests(undefined, undefined, false, 20, 0, []); // ✅ PAGINATION: Kein Filter
    }
  }, [fetchRequests, updateSortConfig]);
  
  const resetFilterConditions = () => {
    setFilterConditions([]);
    setFilterLogicalOperators([]);
    setActiveFilterName('');
    setSelectedFilterId(null);
  };
  
  // ✅ FIX: Ref verhindert mehrfache Anwendung des Default-Filters (Endlosschleife)
  const initialLoadAttemptedRef = useRef(false);
  
  // Filter Change Handler (Controlled Mode)
  // ✅ FIX: Mit useCallback stabilisieren (verhindert Endlosschleife in useEffect)
  const handleFilterChange = useCallback(async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setActiveFilterName(name);
    setSelectedFilterId(id);
    // Table-Header-Sortierung zurücksetzen
    updateSortConfig({ key: 'dueDate', direction: 'asc' });
    
    // ✅ FIX: Wenn id gesetzt ist (gespeicherter Filter), lade mit id
    // ✅ Sonst: Verwende applyFilterConditions (setzt auch selectedFilterId = null, activeFilterName = '')
    if (id) {
      setFilterConditions(conditions);
      setFilterLogicalOperators(operators);
      await fetchRequests(id, undefined, false, 20, 0); // ✅ PAGINATION: limit=20, offset=0
    } else {
      // ✅ Direkte Bedingungen: applyFilterConditions lädt bereits und setzt State korrekt
      // ✅ FIX: Flag wird in applyFilterConditions gesetzt
      await applyFilterConditions(conditions, operators);
    }
  }, [fetchRequests, updateSortConfig, applyFilterConditions]);
  
  // ✅ STANDARD: Filter-Laden und Default-Filter-Anwendung
  const filterContext = useFilterContext();
  const { loadFilters } = filterContext;
  
  // ✅ FIX: Standard-Pattern mit leeren Dependencies (wie in FILTER_STANDARD_DEFINITION.md geplant)
  // ✅ FIX: initialLoadAttemptedRef verhindert mehrfache Ausführung
  useEffect(() => {
    // ✅ FIX: Verhindere mehrfache Ausführung
    if (initialLoadAttemptedRef.current) {
      return;
    }
    
    const initialize = async () => {
      // ✅ FIX: Markiere als versucht, BEVOR async Operation startet
      initialLoadAttemptedRef.current = true;
      
      try {
        // 1. Filter laden (wartet auf State-Update)
        const filters = await loadFilters(REQUESTS_TABLE_ID);
        
        // 2. Default-Filter anwenden (IMMER vorhanden!)
        const defaultFilter = filters.find(f => f.name === 'Aktuell');
        if (defaultFilter) {
          await handleFilterChange(
            defaultFilter.name,
            defaultFilter.id,
            defaultFilter.conditions,
            defaultFilter.operators
          );
          return; // Daten werden durch handleFilterChange geladen
        }
        
        // 3. Fallback: Daten ohne Filter laden (sollte nie passieren)
        await fetchRequests(undefined, undefined, false, 20, 0);
      } catch (error) {
        // ✅ FIX: Bei Fehler Ref zurücksetzen, damit Retry möglich ist
        initialLoadAttemptedRef.current = false;
        if (process.env.NODE_ENV === 'development') {
          console.error('[Requests] Fehler beim Initialisieren:', error);
        }
      }
    };
    
    initialize();
  }, []); // ✅ FIX: Leere Dependencies wie im Standard-Pattern geplant

  // getActiveFilterCount wird direkt inline verwendet (filterConditions.length)

  const filteredAndSortedRequests = useMemo(() => {
    // ✅ FAKT: Wenn selectedFilterId gesetzt ist, wurden Requests bereits server-seitig gefiltert
    // ✅ FAKT: Wenn filterConditions gesetzt sind (ohne selectedFilterId), wurden Requests bereits server-seitig gefiltert
    // ✅ FAKT: Wenn sortConfig gesetzt ist, wurden Requests bereits server-seitig sortiert
    // ✅ NUR searchTerm wird client-seitig gefiltert (nicht server-seitig)
    const requestsToFilter = requests;
    
    return requestsToFilter
      .filter(request => {
        // ✅ NUR Globale Suchfunktion (searchTerm) wird client-seitig angewendet
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          
          // ✅ OPTIMIERUNG: Frühes Beenden bei Match
          if (request.title.toLowerCase().includes(searchLower)) return true;
          if (request.branch.name.toLowerCase().includes(searchLower)) return true;
          
          // ✅ OPTIMIERUNG: Template-String nur wenn nötig
          const requestedByName = `${request.requestedBy.firstName} ${request.requestedBy.lastName}`.toLowerCase();
          if (requestedByName.includes(searchLower)) return true;
          
          const responsibleName = `${request.responsible.firstName} ${request.responsible.lastName}`.toLowerCase();
          if (responsibleName.includes(searchLower)) return true;
          
          return false; // Kein Match gefunden
        }
        
        return true;
      });
      // ❌ ENTFERNT: Client-seitige Sortierung, da Server jetzt sortiert (Phase 4)
  }, [requests, searchTerm]);

  // ✅ MEMORY-LEAK-FIX: Ref für aktuelle Operatoren (verhindert fetchRequests-Recreation)
  const filterLogicalOperatorsRef = useRef(filterLogicalOperators);
  useEffect(() => {
    filterLogicalOperatorsRef.current = filterLogicalOperators;
  }, [filterLogicalOperators]);

  // ✅ PAGINATION: Infinite Scroll mit Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry.isIntersecting && hasMore && !loadingMore && !loading) {
          // ✅ PAGINATION: Lade weitere Items
          // ✅ MEMORY: Verwende requestsLengthRef.current statt requests.length (verhindert Endlosschleife)
          const nextOffset = requestsLengthRef.current;
          fetchRequests(
            selectedFilterId || undefined,
            filterConditions.length > 0 ? filterConditions : undefined,
            true, // append = true
            20, // limit
            nextOffset, // offset
            filterLogicalOperatorsRef.current // ✅ MEMORY-LEAK-FIX: operators aus Ref
          );
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      // ✅ PERFORMANCE: disconnect() statt unobserve() (trennt alle Observer-Verbindungen, robuster)
      observer.disconnect();
    };
  }, [hasMore, loadingMore, loading, selectedFilterId, filterConditions, fetchRequests]); // ✅ MEMORY-LEAK-FIX: filterLogicalOperators entfernt (kommt aus Ref)

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
      // ✅ MEMORY LEAK FIX: Begrenzung der maximalen Anzahl Requests im Memory
      setRequests(prevRequests => {
        const newRequests = [response.data, ...prevRequests];
        // Wenn Maximum überschritten, entferne älteste Items (behalte nur die ersten MAX_REQUESTS)
        if (newRequests.length > MAX_REQUESTS) {
          return newRequests.slice(0, MAX_REQUESTS);
        }
        return newRequests;
      });
      
      // Bearbeitungsmodal für den kopierten Request öffnen
      setSelectedRequest(response.data);
      setIsEditModalOpen(true);
      
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
      console.error('Fehler beim Kopieren des Requests:', err);
      }
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
          // ✅ MEMORY LEAK FIX: Begrenzung der maximalen Anzahl Requests im Memory
          setRequests(prevRequests => {
            const newRequests = [newRequest, ...prevRequests];
            // Wenn Maximum überschritten, entferne älteste Items (behalte nur die ersten MAX_REQUESTS)
            if (newRequests.length > MAX_REQUESTS) {
              return newRequests.slice(0, MAX_REQUESTS);
            }
            return newRequests;
          });
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
                className={`p-2 rounded-md ${filterConditions.length > 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} ml-1`}
                onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
              >
                <FunnelIcon className="h-5 w-5" />
                {filterConditions.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 dark:bg-blue-500 text-white rounded-full text-xs flex items-center justify-center z-10" style={{ position: 'absolute', top: '-0.25rem', right: '-0.25rem' }}>
                    {filterConditions.length}
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
                buttonTitle={viewMode === 'cards' ? t('tableColumn.sortAndDisplay') : t('tableColumn.configure')}
                modalTitle={viewMode === 'cards' ? t('tableColumn.sortAndDisplay') : t('tableColumn.configure')}
                mainSortConfig={sortConfig}
                onMainSortChange={handleMainSortChange}
                showMainSort={true}
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
            tableId={REQUESTS_TABLE_ID}
            />
          </div>
        )}
        
        {/* Gespeicherte Filter als Tags anzeigen */}
        <div className={viewMode === 'cards' ? '-mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6' : 'px-3 sm:px-4 md:px-6'}>
          <SavedFilterTags
          tableId={REQUESTS_TABLE_ID}
          onSelectFilter={(conditions, operators) => applyFilterConditions(conditions, operators)}
          onReset={resetFilterConditions}
          activeFilterName={activeFilterName}
          selectedFilterId={selectedFilterId}
          onFilterChange={(name, id, conditions, operators) => handleFilterChange(name, id, conditions, operators)}
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
                          <ResponsiveLabel long={column.label} short={column.shortLabel} />
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
                        <ResponsiveLabel long={column.label} short={column.shortLabel} />
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
                                  {getStatusText(request.status, 'request', t)}
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
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      <ResponsiveLabel long={`${t('requests.columns.requestedBy')}:`} short={`${t('requests.columns.requestedBy').substring(0, 5)}:`} />
                                    </span><br />
                                    {`${request.requestedBy.firstName} ${request.requestedBy.lastName}`}
                                  </div>
                                  <div className="text-sm text-gray-900 dark:text-gray-200 mt-1">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      <ResponsiveLabel long={`${t('requests.columns.responsible')}:`} short={`${t('requests.columns.responsible').substring(0, 4)}:`} />
                                    </span><br />
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
            {loading && requests.length === 0 ? (
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
            ) : filteredAndSortedRequests.length === 0 ? (
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
        
        {/* ✅ PAGINATION: Infinite Scroll Trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-4">
            {loadingMore && (
              <CircularProgress size={24} />
            )}
          </div>
        )}
    </>
  );
};

export default Requests; 