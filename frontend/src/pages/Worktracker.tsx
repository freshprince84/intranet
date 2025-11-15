import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useTableSettings } from '../hooks/useTableSettings.ts';
import TableColumnConfig from '../components/TableColumnConfig.tsx';
import { PencilIcon, TrashIcon, PlusIcon, ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, ArrowsUpDownIcon, FunnelIcon, XMarkIcon, DocumentDuplicateIcon, InformationCircleIcon, ClipboardDocumentListIcon, ArrowPathIcon, Squares2X2Icon, TableCellsIcon, UserIcon, BuildingOfficeIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import CreateTaskModal from '../components/CreateTaskModal.tsx';
import EditTaskModal from '../components/EditTaskModal.tsx';
import WorktimeTracker from '../components/WorktimeTracker.tsx';
import WorktimeList from '../components/WorktimeList.tsx';
import { API_ENDPOINTS, getTaskAttachmentUrl } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import FilterPane from '../components/FilterPane.tsx';
import { FilterCondition } from '../components/FilterRow.tsx';
import SavedFilterTags from '../components/SavedFilterTags.tsx';
import { toast } from 'react-toastify';
import MarkdownPreview from '../components/MarkdownPreview.tsx';
import { getExpiryStatus, getExpiryColorClasses, createDueDateMetadataItem } from '../utils/expiryUtils.ts';
import { getStatusText, getStatusColor } from '../utils/statusUtils.tsx';
import DataCard, { MetadataItem } from '../components/shared/DataCard.tsx';
import CardGrid from '../components/shared/CardGrid.tsx';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Task {
    id: number;
    title: string;
    description: string | null;
    status: 'open' | 'in_progress' | 'improval' | 'quality_control' | 'done';
    responsible: {
        id: number;
        firstName: string;
        lastName: string;
    } | null;
    responsibleId: number | null;
    role: {
        id: number;
        name: string;
    } | null;
    roleId: number | null;
    qualityControl: {
        id: number;
        firstName: string;
        lastName: string;
    } | null;
    branch: {
        id: number;
        name: string;
    };
    dueDate: string | null;
    requestId: number | null;
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
    key: keyof Task | 'responsible.firstName' | 'qualityControl.firstName' | 'branch.name';
    direction: 'asc' | 'desc';
}

// Standard-Spaltenreihenfolge (wird in der Komponente neu definiert)
const defaultColumnOrder = ['title', 'responsibleAndQualityControl', 'status', 'dueDate', 'branch', 'actions'];

// Definiere eine tableId für die To-Dos Tabelle
const TODOS_TABLE_ID = 'worktracker-todos';

// Card-Einstellungen Standardwerte
const defaultCardMetadata = ['title', 'status', 'responsible', 'qualityControl', 'branch', 'dueDate', 'description'];
const defaultCardColumnOrder = ['title', 'status', 'responsible', 'qualityControl', 'branch', 'dueDate', 'description'];
const defaultCardSortDirections: Record<string, 'asc' | 'desc'> = {
  title: 'asc',
  status: 'asc',
  responsible: 'asc',
  qualityControl: 'asc',
  branch: 'asc',
  dueDate: 'asc',
  description: 'asc'
};

// Mapping zwischen Tabellen-Spalten-IDs und Card-Metadaten-IDs
// Tabellen-Spalte -> Card-Metadaten (kann Array sein für 1:N Mapping)
const tableToCardMapping: Record<string, string[]> = {
  'title': ['title'],
  'status': ['status'],
  'responsibleAndQualityControl': ['responsible', 'qualityControl'], // 1 Tabelle-Spalte -> 2 Card-Metadaten
  'branch': ['branch'],
  'dueDate': ['dueDate'],
  'actions': [], // Keine Card-Entsprechung
  'description': ['description'] // Nur in Cards verfügbar
};

// Reverse Mapping: Card-Metadaten -> Tabellen-Spalten
const cardToTableMapping: Record<string, string> = {
  'title': 'title',
  'status': 'status',
  'responsible': 'responsibleAndQualityControl',
  'qualityControl': 'responsibleAndQualityControl',
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

const Worktracker: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { hasPermission } = usePermissions();
    const location = useLocation();
    
    // Definiere die verfügbaren Spalten für die Tabelle (dynamisch aus Übersetzungen)
    const availableColumns = useMemo(() => [
        { id: 'title', label: t('tasks.columns.title'), shortLabel: t('tasks.columns.title') },
        { id: 'status', label: t('tasks.columns.status'), shortLabel: t('tasks.columns.status') },
        { id: 'responsibleAndQualityControl', label: t('tasks.columns.responsibleAndQualityControl'), shortLabel: t('tasks.columns.responsibleAndQualityControl').split('/')[0] },
        { id: 'branch', label: t('tasks.columns.branch'), shortLabel: t('tasks.columns.branch').substring(0, 5) },
        { id: 'dueDate', label: t('tasks.columns.dueDate'), shortLabel: t('tasks.columns.dueDate').substring(0, 5) },
        { id: 'actions', label: t('tasks.columns.actions'), shortLabel: t('common.actions').substring(0, 3) },
    ], [t]);

    // Definiere zusätzliche Spalten, die nur für den Filter verfügbar sind, nicht für die Tabellenanzeige
    const filterOnlyColumns = useMemo(() => [
        { id: 'responsible', label: t('tasks.columns.responsible'), shortLabel: t('tasks.columns.responsible').substring(0, 3) },
        { id: 'qualityControl', label: t('tasks.columns.qualityControl'), shortLabel: t('tasks.columns.qualityControl').substring(0, 2) },
    ], [t]);
    
    // Status-Übersetzungen (verwende zentrale Utils mit Übersetzungsunterstützung)
    // WICHTIG: Funktionalität bleibt identisch - nur Code-Duplikation entfernt!
    const getStatusLabel = (status: Task['status']): string => {
        return getStatusText(status, 'task', t);
    };
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<Task['status'] | 'all'>('all');
    
    // State für erweiterte Filterbedingungen
    const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
    const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
    const [filterSortDirections, setFilterSortDirections] = useState<Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>>([]);
    
    // Filter State Management (Controlled Mode)
    const [activeFilterName, setActiveFilterName] = useState<string>('');
    const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);
    
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    // Tabellen-Header-Sortierung (nur für Tabellen-Ansicht)
    const [tableSortConfig, setTableSortConfig] = useState<SortConfig>({ key: 'dueDate', direction: 'asc' });
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [copiedTask, setCopiedTask] = useState<Task | null>(null);

    // Tabellen-Einstellungen laden
    const {
        settings,
        isLoading: isLoadingSettings,
        updateColumnOrder,
        updateHiddenColumns,
        toggleColumnVisibility,
        isColumnVisible,
        updateViewMode
    } = useTableSettings('worktracker_tasks', {
        defaultColumnOrder,
        defaultHiddenColumns: [],
        defaultViewMode: 'cards'
    });

    const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [displayLimit, setDisplayLimit] = useState<number>(10);

    // View-Mode aus Settings laden
    const viewMode = settings.viewMode || 'cards';

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
        const wrappers = document.querySelectorAll('.dashboard-tasks-wrapper');
        wrappers.forEach(wrapper => {
            if (viewMode === 'cards') {
                wrapper.classList.add('cards-mode');
            } else {
                wrapper.classList.remove('cards-mode');
            }
        });
    }, [viewMode]);

    // Ref um sicherzustellen, dass loadTasks nur einmal beim Mount aufgerufen wird
    // (auch bei React.StrictMode doppelter Ausführung)
    const hasLoadedRef = useRef(false);

    // Funktion zum Neu Laden der Tasks
    const loadTasks = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get(API_ENDPOINTS.TASKS.BASE);
            const tasksData = response.data;
            
            // Attachments sind bereits in der Response enthalten
            // URL-Generierung für Attachments hinzufügen
            // Sicherstellen, dass keine undefined/null Werte im Array sind
            const tasksWithAttachments = tasksData
                .filter((task: Task) => task != null)
                .map((task: Task) => {
                    const attachments = (task.attachments || [])
                        .filter((att: any) => att != null)
                        .map((att: any) => ({
                            id: att.id,
                            fileName: att.fileName,
                            fileType: att.fileType,
                            fileSize: att.fileSize,
                            filePath: att.filePath,
                            uploadedAt: att.uploadedAt,
                            url: getTaskAttachmentUrl(task.id, att.id)
                        }));
                    
                    return {
                        ...task,
                        attachments: attachments
                    };
                });
            
            console.log('📋 Tasks geladen:', tasksWithAttachments.length, 'Tasks');
            setTasks(tasksWithAttachments);
            setError(null);
        } catch (error) {
            console.error('Fehler beim Laden der Tasks:', error);
            setError(t('worktime.messages.tasksLoadError'));
        } finally {
            setLoading(false);
        }
    };

    // Lade Tasks beim ersten Render (nur einmal, auch bei React.StrictMode)
    useEffect(() => {
        if (!hasLoadedRef.current) {
            hasLoadedRef.current = true;
            loadTasks();
        }
    }, []);

    // URL-Parameter für editTask verarbeiten
    useEffect(() => {
        if (tasks.length > 0) {
            const queryParams = new URLSearchParams(location.search);
            const editTaskId = queryParams.get('editTask');
            
            if (editTaskId) {
                const taskId = parseInt(editTaskId, 10);
                if (!isNaN(taskId)) {
                    const task = tasks.find(t => t.id === taskId);
                    if (task) {
                        setSelectedTask(task);
                        setIsEditModalOpen(true);
                    }
                }
            }
        }
    }, [tasks, location.search]);

    // Initialer Default-Filter setzen (Controlled Mode)
    useEffect(() => {
        const setInitialFilter = async () => {
            try {
                const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(TODOS_TABLE_ID));
                const filters = response.data;
                
                const aktuellFilter = filters.find((filter: any) => filter.name === 'Aktuell');
                if (aktuellFilter) {
                    setActiveFilterName(t('tasks.filters.current'));
                    setSelectedFilterId(aktuellFilter.id);
                    // Migration: Altes Format zu neuem Format konvertieren
                    let sortDirections = aktuellFilter.sortDirections || [];
                    if (Array.isArray(sortDirections) && sortDirections.length > 0) {
                        // Bereits neues Format
                    } else if (sortDirections && typeof sortDirections === 'object' && !Array.isArray(sortDirections)) {
                        // Altes Format: Record -> Array konvertieren
                        sortDirections = Object.entries(sortDirections as Record<string, 'asc' | 'desc'>).map(([column, direction], index) => ({
                            column,
                            direction,
                            priority: index + 1,
                            conditionIndex: filterConditions.findIndex(c => c.column === column)
                        }));
                    }
                    applyFilterConditions(aktuellFilter.conditions, aktuellFilter.operators, sortDirections);
                }
            } catch (error) {
                console.error('Fehler beim Setzen des initialen Filters:', error);
            }
        };

        setInitialFilter();
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
                    `${API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(TODOS_TABLE_ID)}`,
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
                        tableId: TODOS_TABLE_ID,
                        name: 'Archiv', // Immer auf Deutsch speichern, wird beim Anzeigen übersetzt
                        conditions: [
                            { column: 'status', operator: 'equals', value: 'done' }
                        ],
                        operators: []
                    };

                    await axiosInstance.post(
                        `${API_ENDPOINTS.SAVED_FILTERS.BASE}`,
                        archivFilter,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    );
                }

                // Erstelle "Aktuell"-Filter, wenn er noch nicht existiert
                if (!aktuellFilterExists) {
                    const aktuellFilter = {
                        tableId: TODOS_TABLE_ID,
                        name: 'Aktuell', // Immer auf Deutsch speichern, wird beim Anzeigen übersetzt
                        conditions: [
                            { column: 'status', operator: 'notEquals', value: 'done' }
                        ],
                        operators: []
                    };

                    await axiosInstance.post(
                        `${API_ENDPOINTS.SAVED_FILTERS.BASE}`,
                        aktuellFilter,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    );
                }
            } catch (error) {
                console.error('Fehler beim Erstellen der Standard-Filter:', error);
            }
        };

        createStandardFilters();
    }, []);

    // getStatusColor und getStatusText werden jetzt von statusUtils verwendet (siehe getStatusLabel oben)

    const handleStatusChange = async (taskId: number, newStatus: Task['status']) => {
        try {
            // Optimistisches Update: State sofort aktualisieren
            setTasks(prevTasks => {
                const validTasks = prevTasks.filter(task => task != null);
                return validTasks.map(task => 
                    task.id === taskId ? { ...task, status: newStatus } : task
                );
            });

            await axiosInstance.patch(API_ENDPOINTS.TASKS.BY_ID(taskId), { status: newStatus });
            toast.success(t('worktime.messages.taskUpdated'));
        } catch (error) {
            // Rollback bei Fehler: Vollständiges Reload
            console.error('Fehler beim Aktualisieren des Status:', error);
            loadTasks();
                toast.error(t('worktime.messages.taskUpdatedError'));
        }
    };

    const handleEditClick = (task: Task) => {
        setSelectedTask(task);
        setIsEditModalOpen(true);
    };

    const isResponsibleForTask = (task: Task) => {
        if (task.responsible) {
            return task.responsible.id === user?.id;
        } else if (task.role) {
            // Prüfe, ob der Benutzer die angegebene Rolle hat
            return user?.roles?.some(userRole => userRole.role?.id === task.role?.id) || false;
        }
        return false;
    };

    const isQualityControlForTask = (task: Task) => {
        return task.qualityControl?.id === user?.id;
    };

    const handleSort = (key: SortConfig['key']) => {
        // Nur für Tabellen-Ansicht (Header-Sortierung)
        if (viewMode === 'table') {
            setTableSortConfig(current => ({
                key,
                direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
            }));
        }
    };

    const renderStatusButtons = (task: Task): JSX.Element[] => {
        const buttons: JSX.Element[] = [];
        
        // Prüfe, ob der Benutzer Schreibberechtigungen für Tasks hat
        const canModifyTasks = hasPermission('tasks', 'write', 'table');
        
        if (!canModifyTasks) return buttons;
        
        // Zurück-Button (links)
        if (task.status === 'in_progress' && isResponsibleForTask(task)) {
            buttons.push(
                <button
                    key="back"
                    onClick={() => handleStatusChange(task.id, 'open')}
                    className="p-1.5 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600"
                    title={t('tasks.actions.backToOpen')}
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
            );
        } else if (task.status === 'quality_control' && isResponsibleForTask(task)) {
            buttons.push(
                <button
                    key="back"
                    onClick={() => handleStatusChange(task.id, 'in_progress')}
                    className="p-1.5 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600"
                    title={t('tasks.actions.backToInProgress')}
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
            );
        } else if (task.status === 'done' && isQualityControlForTask(task)) {
            buttons.push(
                <button
                    key="back"
                    onClick={() => handleStatusChange(task.id, 'quality_control')}
                    className="p-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600"
                    title={t('tasks.actions.backToQualityControl')}
                >
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
            );
        }

        // Weiter-Button (rechts)
        if (task.status === 'open' && isResponsibleForTask(task)) {
            buttons.push(
                <button
                    key="forward"
                    onClick={() => handleStatusChange(task.id, 'in_progress')}
                    className="p-1.5 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600"
                    title={t('tasks.actions.setInProgress')}
                >
                    <ArrowRightIcon className="h-5 w-5" />
                </button>
            );
        } else if (task.status === 'in_progress' && isResponsibleForTask(task)) {
            buttons.push(
                <button
                    key="forward"
                    onClick={() => handleStatusChange(task.id, 'quality_control')}
                    className="p-1.5 bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600"
                    title={t('tasks.actions.setQualityControl')}
                >
                    <ArrowRightIcon className="h-5 w-5" />
                </button>
            );
        } else if (task.status === 'quality_control' && isQualityControlForTask(task)) {
            buttons.push(
                <button
                    key="forward"
                    onClick={() => handleStatusChange(task.id, 'done')}
                    className="p-1.5 bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-600"
                    title={t('tasks.actions.markDone')}
                >
                    <ArrowRightIcon className="h-5 w-5" />
                </button>
            );
        }

        return buttons;
    };

    const getActiveFilterCount = () => {
        return filterConditions.length;
    };

    const applyFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>) => {
        setFilterConditions(conditions);
        setFilterLogicalOperators(operators);
        if (sortDirections !== undefined) {
            setFilterSortDirections(sortDirections);
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
    const handleFilterChange = (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>) => {
        setActiveFilterName(name);
        setSelectedFilterId(id);
        applyFilterConditions(conditions, operators, sortDirections);
    };

    const getStatusPriority = (status: Task['status']): number => {
        switch (status) {
            case 'open': return 1;
            case 'in_progress': return 2;
            case 'improval': return 3;
            case 'quality_control': return 4;
            case 'done': return 5;
            default: return 99; // Fallback für unbekannte Status
        }
    };

    const filteredAndSortedTasks = useMemo(() => {
        console.log('🔄 Filtere Tasks:', tasks.length, 'Tasks vorhanden');
        console.log('🔄 Filterbedingungen:', filterConditions);
        // Sicherstellen, dass keine undefined/null Werte im Array sind
        const validTasks = tasks.filter(task => task != null);
        const filtered = validTasks
            .filter(task => {
                // Globale Suchfunktion
                if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    const matchesSearch = 
                        task.title.toLowerCase().includes(searchLower) ||
                        (task.description && task.description.toLowerCase().includes(searchLower)) ||
                        (task.responsible ? `${task.responsible.firstName} ${task.responsible.lastName}`.toLowerCase().includes(searchLower) : false) ||
                        (task.role ? task.role.name.toLowerCase().includes(searchLower) : false) ||
                        (task.qualityControl && `${task.qualityControl.firstName} ${task.qualityControl.lastName}`.toLowerCase().includes(searchLower)) ||
                        task.branch.name.toLowerCase().includes(searchLower);
                    
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
                                    conditionMet = task.title === condition.value;
                                } else if (condition.operator === 'contains') {
                                    conditionMet = task.title.toLowerCase().includes((condition.value as string || '').toLowerCase());
                                } else if (condition.operator === 'startsWith') {
                                    conditionMet = task.title.toLowerCase().startsWith((condition.value as string || '').toLowerCase());
                                } else if (condition.operator === 'endsWith') {
                                    conditionMet = task.title.toLowerCase().endsWith((condition.value as string || '').toLowerCase());
                                }
                                break;
                            
                            case 'status':
                                if (condition.operator === 'equals') {
                                    conditionMet = task.status === condition.value;
                                } else if (condition.operator === 'notEquals') {
                                    conditionMet = task.status !== condition.value;
                                }
                                break;
                            
                            case 'responsible':
                                const responsibleValue = condition.value as string || '';
                                
                                if (responsibleValue.startsWith('user-')) {
                                    // Vergleiche mit Benutzer-ID
                                    const userId = parseInt(responsibleValue.replace('user-', ''));
                                    conditionMet = !!task.responsible && task.responsible.id === userId;
                                } else if (responsibleValue.startsWith('role-')) {
                                    // Vergleiche mit Rollen-ID
                                    const roleId = parseInt(responsibleValue.replace('role-', ''));
                                    conditionMet = !!task.role && task.role.id === roleId;
                                } else if (responsibleValue === '') {
                                    // Leerer Wert entspricht allen
                                    conditionMet = true;
                                } else if (condition.operator === 'equals') {
                                    // Fallback für Texteingabe (alte Implementierung)
                                    const responsibleName = task.responsible
                                        ? `${task.responsible.firstName} ${task.responsible.lastName}`.toLowerCase()
                                        : task.role
                                            ? task.role.name.toLowerCase()
                                            : '';
                                    conditionMet = responsibleName === responsibleValue.toLowerCase();
                                } else if (condition.operator === 'contains') {
                                    // Fallback für Texteingabe (alte Implementierung)
                                    const responsibleName = task.responsible
                                        ? `${task.responsible.firstName} ${task.responsible.lastName}`.toLowerCase()
                                        : task.role
                                            ? task.role.name.toLowerCase()
                                            : '';
                                    conditionMet = responsibleName.includes(responsibleValue.toLowerCase());
                                }
                                break;
                            
                            case 'qualityControl':
                                const qualityControlValue = condition.value as string || '';
                                
                                if (qualityControlValue.startsWith('user-')) {
                                    // Vergleiche mit Benutzer-ID
                                    const userId = parseInt(qualityControlValue.replace('user-', ''));
                                    conditionMet = !!task.qualityControl && task.qualityControl.id === userId;
                                } else if (qualityControlValue === '') {
                                    // Leerer Wert entspricht allen
                                    conditionMet = true;
                                } else if (condition.operator === 'equals') {
                                    // Fallback für Texteingabe (alte Implementierung)
                                    const qualityControlName = task.qualityControl
                                        ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}`.toLowerCase()
                                        : '';
                                    conditionMet = qualityControlName === qualityControlValue.toLowerCase();
                                } else if (condition.operator === 'contains') {
                                    // Fallback für Texteingabe (alte Implementierung)
                                    const qualityControlName = task.qualityControl
                                        ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}`.toLowerCase()
                                        : '';
                                    conditionMet = qualityControlName.includes(qualityControlValue.toLowerCase());
                                }
                                break;
                            
                            // Für den kombinierten Filter responsibleAndQualityControl
                            case 'responsibleAndQualityControl':
                                const combinedValue = condition.value as string || '';
                                
                                if (combinedValue.startsWith('user-')) {
                                    // Vergleiche mit Benutzer-ID für beide Felder
                                    const userId = parseInt(combinedValue.replace('user-', ''));
                                    conditionMet = 
                                        (!!task.responsible && task.responsible.id === userId) || 
                                        (!!task.qualityControl && task.qualityControl.id === userId);
                                } else if (combinedValue.startsWith('role-')) {
                                    // Bei Rollen nur mit Verantwortlichem vergleichen
                                    const roleId = parseInt(combinedValue.replace('role-', ''));
                                    conditionMet = !!task.role && task.role.id === roleId;
                                } else if (combinedValue === '') {
                                    // Leerer Wert entspricht allen
                                    conditionMet = true;
                                } else if (condition.operator === 'equals') {
                                    // Fallback für Texteingabe (alte Implementierung)
                                    const responsibleName = task.responsible
                                        ? `${task.responsible.firstName} ${task.responsible.lastName}`.toLowerCase()
                                        : task.role
                                            ? task.role.name.toLowerCase()
                                            : '';
                                    const qualityControlName = task.qualityControl
                                        ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}`.toLowerCase()
                                        : '';
                                    conditionMet = 
                                        responsibleName === combinedValue.toLowerCase() || 
                                        qualityControlName === combinedValue.toLowerCase();
                                } else if (condition.operator === 'contains') {
                                    // Fallback für Texteingabe (alte Implementierung)
                                    const responsibleName = task.responsible
                                        ? `${task.responsible.firstName} ${task.responsible.lastName}`.toLowerCase()
                                        : task.role
                                            ? task.role.name.toLowerCase()
                                            : '';
                                    const qualityControlName = task.qualityControl
                                        ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}`.toLowerCase()
                                        : '';
                                    conditionMet = 
                                        responsibleName.includes(combinedValue.toLowerCase()) || 
                                        qualityControlName.includes(combinedValue.toLowerCase());
                                }
                                break;
                            
                            case 'branch':
                                const branchName = task.branch.name.toLowerCase();
                                
                                if (condition.operator === 'equals') {
                                    conditionMet = branchName === (condition.value as string || '').toLowerCase();
                                } else if (condition.operator === 'contains') {
                                    conditionMet = branchName.includes((condition.value as string || '').toLowerCase());
                                }
                                break;
                            
                            case 'dueDate':
                                if (!task.dueDate) {
                                    conditionMet = false;
                                    break;
                                }
                                
                                const taskDate = new Date(task.dueDate);
                                
                                if (condition.operator === 'equals') {
                                    const filterDate = new Date(condition.value as string);
                                    conditionMet = taskDate.toDateString() === filterDate.toDateString();
                                } else if (condition.operator === 'before') {
                                    const filterDate = new Date(condition.value as string);
                                    conditionMet = taskDate < filterDate;
                                } else if (condition.operator === 'after') {
                                    const filterDate = new Date(condition.value as string);
                                    conditionMet = taskDate > filterDate;
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
        
        console.log('✅ Gefilterte Tasks:', filtered.length, 'von', tasks.length);
        
        // Hilfsfunktion zum Extrahieren von Werten für Sortierung
        const getSortValue = (task: Task, columnId: string): any => {
            switch (columnId) {
                case 'title':
                    return task.title.toLowerCase();
                case 'status':
                    return getStatusPriority(task.status);
                case 'responsible':
                case 'responsibleAndQualityControl':
                    return task.responsible ? `${task.responsible.firstName} ${task.responsible.lastName}`.toLowerCase() : (task.role ? `Rolle: ${task.role.name}`.toLowerCase() : '');
                case 'qualityControl':
                    return task.qualityControl ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}`.toLowerCase() : '';
                case 'branch':
                    return task.branch.name.toLowerCase();
                case 'dueDate':
                    return task.dueDate ? new Date(task.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                case 'description':
                    return (task.description || '').toLowerCase();
                default:
                    return '';
            }
        };
        
        const sorted = filtered.sort((a, b) => {
            // 1. Priorität: Filter-Sortierrichtungen (wenn Filter aktiv)
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
            
            // 2. Priorität: Tabellen-Header-Sortierung (nur für Tabellen-Ansicht, wenn kein Filter aktiv)
            if (viewMode === 'table' && tableSortConfig.key) {
                let valueA: any, valueB: any;
                
                switch (tableSortConfig.key) {
                    case 'title':
                        valueA = a.title;
                        valueB = b.title;
                        break;
                    case 'status':
                        valueA = getStatusPriority(a.status);
                        valueB = getStatusPriority(b.status);
                        break;
                    case 'responsible.firstName':
                        valueA = a.responsible ? `${a.responsible.firstName} ${a.responsible.lastName}` : (a.role ? `Rolle: ${a.role.name}` : '');
                        valueB = b.responsible ? `${b.responsible.firstName} ${b.responsible.lastName}` : (b.role ? `Rolle: ${b.role.name}` : '');
                        break;
                    case 'qualityControl.firstName':
                        valueA = a.qualityControl ? `${a.qualityControl.firstName} ${a.qualityControl.lastName}` : '';
                        valueB = b.qualityControl ? `${b.qualityControl.firstName} ${b.qualityControl.lastName}` : '';
                        break;
                    case 'branch.name':
                        valueA = a.branch.name;
                        valueB = b.branch.name;
                        break;
                    case 'dueDate':
                        valueA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                        valueB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                        break;
                    default:
                        valueA = a[tableSortConfig.key as keyof Task];
                        valueB = b[tableSortConfig.key as keyof Task];
                }
                
                if (typeof valueA === 'number' && typeof valueB === 'number') {
                    return tableSortConfig.direction === 'asc' ? valueA - valueB : valueB - valueA;
                } else {
                    const comparison = String(valueA).localeCompare(String(valueB));
                    return tableSortConfig.direction === 'asc' ? comparison : -comparison;
                }
            }
            
            // 3. Fallback: Standardsortierung (wenn keine benutzerdefinierte Sortierung)
            const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
            const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
            
            if (aDate !== bDate) {
                return aDate - bDate;
            }
            
            const aStatusPrio = getStatusPriority(a.status);
            const bStatusPrio = getStatusPriority(b.status);
            
            if (aStatusPrio !== bStatusPrio) {
                return aStatusPrio - bStatusPrio;
            }
            
            return a.title.localeCompare(b.title);
        });
        
        console.log('✅ Gefilterte und sortierte Tasks:', sorted.length);
        return sorted;
    }, [tasks, searchTerm, tableSortConfig, getStatusPriority, filterConditions, filterLogicalOperators, filterSortDirections, viewMode]);

    // Handler für das Verschieben von Spalten per Drag & Drop
    const handleMoveColumn = (dragIndex: number, hoverIndex: number) => {
        // Neue Spaltenreihenfolge erstellen
        const newColumnOrder = [...settings.columnOrder];
        const draggedColumn = newColumnOrder[dragIndex];
        
        // Spalten neu anordnen
        newColumnOrder.splice(dragIndex, 1); // Entferne die gezogene Spalte
        newColumnOrder.splice(hoverIndex, 0, draggedColumn); // Füge sie an der neuen Position ein
        
        // Aktualisiere die Spaltenreihenfolge
        updateColumnOrder(newColumnOrder);
    };

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

    // Filtern und sortieren der Spalten gemäß den Benutzereinstellungen
    // Sicherstellen, dass alle Spalten aus defaultColumnOrder in columnOrder enthalten sind
    const completeColumnOrder = useMemo(() => {
        const currentOrder = settings.columnOrder || [];
        // Sicherstellen, dass keine undefined/null Werte im Array sind
        const validOrder = currentOrder.filter(id => id != null && typeof id === 'string');
        // Fehlende Spalten aus defaultColumnOrder hinzufügen
        const missingColumns = defaultColumnOrder.filter(id => !validOrder.includes(id));
        return [...validOrder, ...missingColumns];
    }, [settings.columnOrder]);

    const visibleColumnIds = completeColumnOrder.filter(id => id != null && typeof id === 'string' && isColumnVisible(id));

    // Funktion zum Kopieren eines Tasks
    const handleCopyTask = async (task: Task) => {
        try {
            // Kopie des Tasks erstellen mit angepasstem Titel
            const copiedTaskData = {
                title: `${task.title}-Kopie`,
                description: task.description,
                status: 'open', // Immer als "offen" erstellen
                responsibleId: task.responsible ? task.responsible.id : null,
                roleId: task.role ? task.role.id : null,
                qualityControlId: task.qualityControl?.id || null,
                branchId: task.branch.id,
                dueDate: task.dueDate
            };

            // Task erstellen
            const response = await axiosInstance.post(
                API_ENDPOINTS.TASKS.BASE,
                copiedTaskData
            );

            // Optimistisches Update: Neuen Task zur Liste hinzufügen statt vollständigem Reload
            setTasks(prevTasks => [response.data, ...prevTasks]);
            
            // Bearbeitungsmodal für den kopierten Task öffnen
            setSelectedTask(response.data);
            setIsEditModalOpen(true);
            
        } catch (err) {
            console.error('Fehler beim Kopieren des Tasks:', err);
            // Einfachere Fehlerbehandlung ohne axios-Import
            const axiosError = err as any;
            setError(axiosError.response?.data?.message || axiosError.message || 'Ein unerwarteter Fehler ist aufgetreten');
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (window.confirm(t('worktime.messages.taskDeleteConfirm'))) {
            console.log('🗑️ Starte Löschung von Task:', taskId);
            console.log('📋 Aktuelle Tasks vor Löschung:', tasks.length);
            
            // Optimistisches Update: Task sofort aus Liste entfernen für sofortiges Feedback
            // Sicherstellen, dass keine undefined/null Werte im Array bleiben
            setTasks(prevTasks => {
                const filtered = prevTasks.filter(task => task != null && task.id !== taskId);
                console.log('📋 Tasks nach Filterung:', filtered.length, 'von', prevTasks.length);
                return filtered;
            });

            try {
                console.log('📡 Sende Delete-Request...');
                await axiosInstance.delete(API_ENDPOINTS.TASKS.BY_ID(taskId));
                console.log('✅ Delete erfolgreich');
                // Erfolgs-Rückmeldung anzeigen
                toast.success(t('worktime.messages.taskDeleted'));
            } catch (error) {
                // Rollback bei Fehler: Vollständiges Reload
                console.error('❌ Fehler beim Löschen der Aufgabe:', error);
                loadTasks();
                toast.error(t('worktime.messages.taskDeletedError'));
            }
        }
    };

    const handleSaveTask = async (task: Task) => {
        try {
            await axiosInstance.put(API_ENDPOINTS.TASKS.BY_ID(task.id), task);
            // Aktualisiere die Aufgabenliste
            loadTasks();
            setIsEditModalOpen(false);
            setSelectedTask(null);
            toast.success(t('worktime.messages.taskUpdated'));
        } catch (error) {
            console.error('Fehler beim Speichern der Aufgabe:', error);
                toast.error(t('worktime.messages.taskSaveError'));
        }
    };

    return (
        <div className="min-h-screen dark:bg-gray-900">
            <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
                {/* Neu angeordnete UI-Elemente in einer Zeile */}
                <div className="w-full mb-4">
                    {/* Auf mobilen Geräten wird diese Reihenfolge angezeigt - Tasks oben, Zeiterfassung unten */}
                    <div className="block sm:hidden w-full">
                    {/* Tasks */}
                        <div className="dashboard-tasks-wrapper bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 w-full mb-20">
                            <div className="flex items-center justify-between px-3 sm:px-4 md:px-6">
                                {/* Linke Seite: "Neuer Task"-Button */}
                                <div className="flex items-center">
                                    {hasPermission('tasks', 'write', 'table') && (
                                        <button 
                                            onClick={() => setIsCreateModalOpen(true)}
                                            className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm flex items-center justify-center"
                                            style={{ width: '30.19px', height: '30.19px' }}
                                            title={t('tasks.createTask')}
                                            aria-label={t('tasks.createTask')}
                                        >
                                            <PlusIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                
                                {/* Mitte: Titel */}
                                <div className="flex items-center">
                                    <CheckCircleIcon className="h-6 w-6 mr-2 dark:text-white" />
                                    <h2 className="text-xl font-semibold dark:text-white">{t('tasks.title')}</h2>
                                </div>
                                
                                {/* Rechte Seite: Suchfeld, Filter-Button, Status-Filter, Spalten-Konfiguration */}
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        placeholder={t('common.search') + '...'}
                                        className="w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                                    >
                                        <FunnelIcon className="h-5 w-5" />
                                        {getActiveFilterCount() > 0 && (
                                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
                                                {getActiveFilterCount()}
                                            </span>
                                        )}
                                    </button>
                                    
                                    {/* Spalten-Konfiguration */}
                                    <div className="ml-1">
                                        <TableColumnConfig 
                                            columns={viewMode === 'cards'
                                                ? [
                                                    { id: 'title', label: t('tasks.columns.title') },
                                                    { id: 'status', label: t('tasks.columns.status') },
                                                    { id: 'responsible', label: t('tasks.columns.responsible') },
                                                    { id: 'qualityControl', label: t('tasks.columns.qualityControl') },
                                                    { id: 'branch', label: t('tasks.columns.branch') },
                                                    { id: 'dueDate', label: t('tasks.columns.dueDate') },
                                                    { id: 'description', label: t('tasks.columns.description') }
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
                                                    // Für Cards: Mapping zurück zu Tabellen-Spalten
                                                    const tableColumn = cardToTableMapping[columnId];
                                                    if (tableColumn) {
                                                        toggleColumnVisibility(tableColumn);
                                                    }
                                                } else {
                                                    toggleColumnVisibility(columnId);
                                                }
                                            }}
                                            onMoveColumn={viewMode === 'cards'
                                                ? (dragIndex: number, hoverIndex: number) => {
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
                                                }
                                                : handleMoveColumn}
                                            buttonTitle={viewMode === 'cards' ? t('tableColumn.sortAndDisplay') : t('tableColumn.configure')}
                                            modalTitle={viewMode === 'cards' ? t('tableColumn.sortAndDisplay') : t('tableColumn.configure')}
                                            onClose={() => {}}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Filter-Pane */}
                            {isFilterModalOpen && (
                                <div className={viewMode === 'cards' ? '-mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6' : 'px-3 sm:px-4 md:px-6'}>
                                    <FilterPane
                                    columns={[...availableColumns, ...filterOnlyColumns]}
                                    onApply={applyFilterConditions}
                                    onReset={resetFilterConditions}
                                    savedConditions={filterConditions}
                                    savedOperators={filterLogicalOperators}
                                    savedSortDirections={filterSortDirections}
                                    onSortDirectionsChange={setFilterSortDirections}
                                    tableId={TODOS_TABLE_ID}
                                />
                                </div>
                            )}

                            {/* Gespeicherte Filter als Tags anzeigen */}
                            <div className={viewMode === 'cards' ? '-mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6' : 'px-3 sm:px-4 md:px-6'}>
                                <SavedFilterTags
                                tableId={TODOS_TABLE_ID}
                                onSelectFilter={applyFilterConditions}
                                onReset={resetFilterConditions}
                                activeFilterName={activeFilterName}
                                selectedFilterId={selectedFilterId}
                                onFilterChange={handleFilterChange}
                                defaultFilterName={t('tasks.filters.current')}
                            />
                            </div>
                            
                            {/* Tabelle oder Cards */}
                            {viewMode === 'table' ? (
                                /* Tabellen-Ansicht */
                                <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                {visibleColumnIds.map((columnId) => {
                                                    const column = availableColumns.find(col => col.id === columnId);
                                                    if (!column) return null;
                                                    
                                                    return (
                                                        <th
                                                            key={columnId}
                                                            scope="col"
                                                            className={`px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${columnId === dragOverColumn ? 'bg-blue-100 dark:bg-blue-800' : ''}`}
                                                            draggable={true}
                                                            onDragStart={() => handleDragStart(columnId)}
                                                            onDragOver={(e) => handleDragOver(e, columnId)}
                                                            onDrop={(e) => handleDrop(e, columnId)}
                                                            onDragEnd={handleDragEnd}
                                                        >
                                                            <div className="flex items-center">
                                                                {window.innerWidth <= 640 ? column.shortLabel : column.label}
                                                                {columnId !== 'actions' && (
                                                                    <button 
                                                                        onClick={() => handleSort(columnId as keyof Task)}
                                                                        className="ml-1 focus:outline-none"
                                                                    >
                                                                        <ArrowsUpDownIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={visibleColumnIds.length} className="px-3 sm:px-4 md:px-6 py-4 text-center">
                                                        <div className="flex justify-center">
                                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : error ? (
                                                <tr>
                                                    <td colSpan={visibleColumnIds.length} className="px-6 py-4 text-center text-red-600 dark:text-red-400">
                                                        {error}
                                                    </td>
                                                </tr>
                                            ) : filteredAndSortedTasks.length === 0 ? (
                                                <tr>
                                                    <td colSpan={visibleColumnIds.length} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                                        <div className="flex flex-col items-center justify-center gap-4">
                                                        <ClipboardDocumentListIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                                                        <div className="text-sm">{t('tasks.noTasksFound')}</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            <>
                                            {filteredAndSortedTasks.slice(0, displayLimit).map(task => {
                                            const expiryStatus = getExpiryStatus(task.dueDate, 'todo', undefined, task.title, task.description);
                                            const expiryColors = getExpiryColorClasses(expiryStatus);
                                            
                                            return (
                                                <tr 
                                                    key={task.id} 
                                                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                                        expiryStatus !== 'none' ? `${expiryColors.bgClass} ${expiryColors.borderClass} border-l-4` : ''
                                                    }`}
                                                >
                                                    {visibleColumnIds.map(columnId => {
                                                    switch (columnId) {
                                                        case 'title':
                                                            return (
                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4">
                                                                    <div className="text-sm text-gray-900 dark:text-gray-200 break-words flex items-center">
                                                                        {task.title}
                                                                            {task.description && (
                                                                                <div className="ml-2 relative group">
                                                                                    <button 
                                                                                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                                                                        title={t('tasks.showDescription')}
                                                                                    >
                                                                                        <InformationCircleIcon className="h-5 w-5" />
                                                                                    </button>
                                                                                    <div className="hidden group-hover:block absolute left-0 mt-2 p-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 w-144 max-h-96 overflow-y-auto min-w-[36rem] z-10">
                                                                                        <MarkdownPreview content={task.description} showImagePreview={true} />
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            case 'status':
                                                                return (
                                                                    <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(task.status, 'task')} dark:bg-opacity-30 status-col`}>
                                                                            {task.status}
                                                                        </span>
                                                                    </td>
                                                                );
                                                            case 'responsibleAndQualityControl':
                                                                return (
                                                                    <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                        <div className="flex flex-col">
                                                                            <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">{t('tasks.columns.responsible')}:</span>
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 inline sm:hidden">{t('tasks.columns.responsible').substring(0, 3)}:</span><br />
                                                                                {task.responsible ? `${task.responsible.firstName} ${task.responsible.lastName}` : task.role ? task.role.name : '-'}
                                                                            </div>
                                                                            <div className="text-sm text-gray-900 dark:text-gray-200 mt-1">
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">{t('tasks.qualityControlLabel')}</span>
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 inline sm:hidden">{t('tasks.columns.qualityControl').substring(0, 2)}:</span><br />
                                                                                {task.qualityControl ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}` : '-'}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                );
                                                            case 'branch':
                                                                return (
                                                                    <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                        <div className="text-sm text-gray-900 dark:text-gray-200">{task.branch.name}</div>
                                                                    </td>
                                                                );
                                                            case 'dueDate':
                                                                const expiryStatusForDate = getExpiryStatus(task.dueDate, 'todo', undefined, task.title, task.description);
                                                                const expiryColorsForDate = getExpiryColorClasses(expiryStatusForDate);
                                                                return (
                                                                    <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                        <div className={`text-sm ${expiryStatusForDate !== 'none' ? expiryColorsForDate.textClass : 'text-gray-900 dark:text-gray-200'}`}>
                                                                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                                                                            {expiryStatusForDate !== 'none' && (
                                                                                <span className="ml-2 text-xs">⚠</span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            case 'actions':
                                                                return (
                                                                    <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                        <div className="flex space-x-2 action-buttons">
                                                                            <div className="status-buttons">
                                                                                {renderStatusButtons(task)}
                                                                            </div>
                                                                            {hasPermission('tasks', 'write', 'table') && (
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setSelectedTask(task);
                                                                                        setIsEditModalOpen(true);
                                                                                    }}
                                                                                    className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                                                    title={t('common.edit')}
                                                                                >
                                                                                    <PencilIcon className="h-4 w-4" />
                                                                                </button>
                                                                            )}
                                                                            {hasPermission('tasks', 'both', 'table') && (
                                                                                <button
                                                                                    onClick={() => handleCopyTask(task)}
                                                                                    className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                                                                    title={t('tasks.actions.copy')}
                                                                                >
                                                                                    <DocumentDuplicateIcon className="h-4 w-4" />
                                                                                </button>
                                                                            )}
                                                                            {hasPermission('tasks', 'delete', 'table') && (
                                                                                <button
                                                                                    onClick={() => handleDeleteTask(task.id)}
                                                                                    className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                                                    title={t('common.delete')}
                                                                                >
                                                                                    <TrashIcon className="h-4 w-4" />
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
                                    {loading ? (
                                        <div className="flex justify-center py-12">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
                                        </div>
                                    ) : error ? (
                                        <div className="flex justify-center py-12 text-red-600 dark:text-red-400">
                                            {error}
                                        </div>
                                    ) : filteredAndSortedTasks.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                                            <ClipboardDocumentListIcon className="h-10 w-10 mb-4 text-gray-400 dark:text-gray-500" />
                                            <div className="text-sm">Keine To Do's gefunden</div>
                                        </div>
                                    ) : (
                                        <CardGrid>
                                            {filteredAndSortedTasks.slice(0, displayLimit).map(task => {
                                                const expiryStatus = getExpiryStatus(task.dueDate, 'todo', undefined, task.title, task.description);
                                                
                                                // Metadaten basierend auf sichtbaren Einstellungen - strukturiert nach Position
                                                const metadata: MetadataItem[] = [];
                                                
                                                // Links: Niederlassung
                                                if (visibleCardMetadata.has('branch')) {
                                                    metadata.push({
                                                        icon: <BuildingOfficeIcon className="h-4 w-4" />,
                                                        label: t('tasks.columns.branch'),
                                                        value: task.branch.name,
                                                        section: 'left'
                                                    });
                                                }
                                                
                                                // Haupt-Metadaten: Verantwortlicher & Qualitätskontrolle
                                                if (visibleCardMetadata.has('responsible')) {
                                                    // Benutzernamen auf 4 Zeichen kürzen
                                                    const responsibleValue = task.responsible ? `${task.responsible.firstName} ${task.responsible.lastName}` : (task.role ? task.role.name : '-');
                                                    const shortenedName = responsibleValue.length > 4 && responsibleValue !== '-' ? responsibleValue.substring(0, 4) : responsibleValue;
                                                    metadata.push({
                                                        icon: <UserIcon className="h-4 w-4" />,
                                                        label: t('tasks.columns.responsible'),
                                                        value: shortenedName,
                                                        section: 'main'
                                                    });
                                                }
                                                if (visibleCardMetadata.has('qualityControl')) {
                                                    // Benutzernamen auf 4 Zeichen kürzen
                                                    const qualityControlValue = task.qualityControl ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}` : '-';
                                                    const shortenedName = qualityControlValue.length > 4 && qualityControlValue !== '-' ? qualityControlValue.substring(0, 4) : qualityControlValue;
                                                    metadata.push({
                                                        icon: <UserIcon className="h-4 w-4" />,
                                                        label: t('tasks.columns.qualityControl'),
                                                        value: shortenedName,
                                                        section: 'main-second'
                                                    });
                                                }
                                                
                                                // Rechts: Fälligkeit (erste Zeile rechts, neben Status)
                                                if (visibleCardMetadata.has('dueDate')) {
                                                    const dueDateItem = createDueDateMetadataItem(
                                                        task.dueDate,
                                                        'todo',
                                                        task.title,
                                                        task.description,
                                                        <CalendarIcon className="h-4 w-4" />,
                                                        t('tasks.columns.dueDate'),
                                                        (date) => format(date, 'dd.MM.yyyy', { locale: de }),
                                                        false // Keine Badge-Art, nur Text
                                                    );
                                                    metadata.push({
                                                        ...dueDateItem,
                                                        section: 'right-inline' // Neue Section für inline rechts (neben Status)
                                                    });
                                                }
                                                
                                                // Full-Width: Beschreibung
                                                if (visibleCardMetadata.has('description') && task.description) {
                                                    metadata.push({
                                                        label: t('tasks.columns.description'),
                                                        value: '',
                                                        descriptionContent: task.description,
                                                        attachmentMetadata: task.attachments || [], // Attachment-Metadaten für Vorschau
                                                        section: 'full'
                                                    });
                                                }
                                                
                                                // Action-Buttons
                                                const actionButtons = (
                                                    <div className="flex items-center space-x-2">
                                                        {/* Status-Buttons */}
                                                        <div className="status-buttons">
                                                            {renderStatusButtons(task)}
                                                        </div>
                                                        {hasPermission('tasks', 'write', 'table') && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedTask(task);
                                                                    setIsEditModalOpen(true);
                                                                }}
                                                                className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                                title={t('common.edit')}
                                                            >
                                                                <PencilIcon className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {hasPermission('tasks', 'both', 'table') && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCopyTask(task);
                                                                }}
                                                                className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                                                title={t('tasks.actions.copy')}
                                                            >
                                                                <DocumentDuplicateIcon className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                                
                                                return (
                                                    <DataCard
                                                        key={task.id}
                                                        title={task.title}
                                                        status={{
                                                            label: getStatusText(task.status, 'task', t),
                                                            color: getStatusColor(task.status, 'task'),
                                                            onPreviousClick: undefined,
                                                            onNextClick: undefined
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
                            
                            {/* "Mehr anzeigen" Button - Mobil */}
                            {filteredAndSortedTasks.length > displayLimit && (
                                <div className="mt-4 flex justify-center">
                                    <button
                                        className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 border border-blue-300 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-gray-600"
                                        onClick={() => setDisplayLimit(prevLimit => prevLimit + 10)}
                                    >
                                        {t('common.showMore')} ({filteredAndSortedTasks.length - displayLimit} {t('common.remaining')})
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        {/* Zeiterfassung - auf Mobilgeräten fixiert über dem Footermenü */}
                        <div className="fixed bottom-13 left-0 right-0 w-full bg-white dark:bg-gray-800 z-9 shadow-lg border-t-0 dark:border-t dark:border-gray-700">
                            <WorktimeTracker />
                        </div>
                    </div>

                    {/* Auf größeren Geräten bleibt die ursprüngliche Reihenfolge - Zeiterfassung oben, Tasks unten */}
                    <div className="hidden sm:block">
                        {/* Zeiterfassung */}
                        <div className="mb-8">
                            <WorktimeTracker />
                        </div>
                        
                        {/* Tasks - vollständiger Inhalt für Desktop-Ansicht */}
                        <div className="dashboard-tasks-wrapper bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 w-full mb-20">
                            <div className="flex items-center mb-4 justify-between px-3 sm:px-4 md:px-6">
                                {/* Linke Seite: "Neuer Task"-Button */}
                                <div className="flex items-center">
                                    {hasPermission('tasks', 'write', 'table') && (
                                        <button
                                            onClick={() => setIsCreateModalOpen(true)}
                                            className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm flex items-center justify-center"
                                            style={{ width: '30.19px', height: '30.19px' }}
                                            title={t('tasks.createTask')}
                                            aria-label={t('tasks.createTask')}
                                            data-onboarding="create-task-button"
                                        >
                                            <PlusIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                
                                {/* Mitte: Titel */}
                                <div className="flex items-center">
                                    <CheckCircleIcon className="h-6 w-6 mr-2 dark:text-white" />
                                    <h2 className="text-xl font-semibold dark:text-white">{t('tasks.title')}</h2>
                                </div>
                                
                                {/* Rechte Seite: Suchfeld, Filter-Button, Status-Filter, Spalten-Konfiguration */}
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        placeholder={t('common.search') + '...'}
                                        className="w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                                    >
                                        <FunnelIcon className="h-5 w-5" />
                                        {getActiveFilterCount() > 0 && (
                                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
                                                {getActiveFilterCount()}
                                            </span>
                                        )}
                                    </button>
                                    
                                    {/* Spalten-Konfiguration */}
                                    <div className="ml-1">
                                        <TableColumnConfig
                                            columns={viewMode === 'cards'
                                                ? [
                                                    { id: 'title', label: t('tasks.columns.title') },
                                                    { id: 'status', label: t('tasks.columns.status') },
                                                    { id: 'responsible', label: t('tasks.columns.responsible') },
                                                    { id: 'qualityControl', label: t('tasks.columns.qualityControl') },
                                                    { id: 'branch', label: t('tasks.columns.branch') },
                                                    { id: 'dueDate', label: t('tasks.columns.dueDate') },
                                                    { id: 'description', label: t('tasks.columns.description') }
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
                                                    const tableColumn = cardToTableMapping[columnId];
                                                    if (tableColumn) {
                                                        toggleColumnVisibility(tableColumn);
                                                    }
                                                } else {
                                                    toggleColumnVisibility(columnId);
                                                }
                                            }}
                                            onMoveColumn={viewMode === 'cards'
                                                ? (dragIndex: number, hoverIndex: number) => {
                                                    const newCardOrder = [...cardMetadataOrder];
                                                    const dragged = newCardOrder[dragIndex];
                                                    newCardOrder.splice(dragIndex, 1);
                                                    newCardOrder.splice(hoverIndex, 0, dragged);
                                                    
                                                    const newTableOrder: string[] = [];
                                                    const usedTableColumns = new Set<string>();
                                                    
                                                    newCardOrder.forEach(cardMeta => {
                                                        const tableCol = cardToTableMapping[cardMeta];
                                                        if (tableCol && !usedTableColumns.has(tableCol)) {
                                                            usedTableColumns.add(tableCol);
                                                            newTableOrder.push(tableCol);
                                                        }
                                                    });
                                                    
                                                    availableColumns.forEach(col => {
                                                        if (!newTableOrder.includes(col.id) && col.id !== 'actions') {
                                                            newTableOrder.push(col.id);
                                                        }
                                                    });
                                                    
                                                    updateColumnOrder(newTableOrder);
                                                }
                                                : handleMoveColumn}
                                            buttonTitle={viewMode === 'cards' ? t('tableColumn.sortAndDisplay') : t('tableColumn.configure')}
                                            modalTitle={viewMode === 'cards' ? t('tableColumn.sortAndDisplay') : t('tableColumn.configure')}
                                            onClose={() => {}}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Filter-Pane */}
                            {isFilterModalOpen && (
                                <div className={viewMode === 'cards' ? '-mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6' : 'px-3 sm:px-4 md:px-6'}>
                                    <FilterPane
                                    columns={[...availableColumns, ...filterOnlyColumns]}
                                    onApply={applyFilterConditions}
                                    onReset={resetFilterConditions}
                                    savedConditions={filterConditions}
                                    savedOperators={filterLogicalOperators}
                                    savedSortDirections={filterSortDirections}
                                    onSortDirectionsChange={setFilterSortDirections}
                                    tableId={TODOS_TABLE_ID}
                                />
                                </div>
                            )}

                            {/* Gespeicherte Filter als Tags anzeigen */}
                            <SavedFilterTags
                                tableId={TODOS_TABLE_ID}
                                onSelectFilter={applyFilterConditions}
                                onReset={resetFilterConditions}
                                activeFilterName={activeFilterName}
                                selectedFilterId={selectedFilterId}
                                onFilterChange={handleFilterChange}
                                defaultFilterName={t('tasks.filters.current')}
                            />

                            {/* Tabelle oder Cards */}
                            {viewMode === 'table' ? (
                                /* Tabellen-Ansicht */
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" data-onboarding="task-list">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                {visibleColumnIds.map((columnId) => {
                                                    const column = availableColumns.find(col => col.id === columnId);
                                                    if (!column) return null;

                                                    return (
                                                        <th 
                                                            key={columnId}
                                                            scope="col"
                                                            className={`px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${columnId === dragOverColumn ? 'bg-blue-100 dark:bg-blue-800' : ''}`}
                                                            draggable={true}
                                                            onDragStart={() => handleDragStart(columnId)}
                                                            onDragOver={(e) => handleDragOver(e, columnId)}
                                                            onDrop={(e) => handleDrop(e, columnId)}
                                                            onDragEnd={handleDragEnd}
                                                        >
                                                            <div className="flex items-center">
                                                                {window.innerWidth <= 640 ? column.shortLabel : column.label}
                                                                {columnId !== 'actions' && (
                                                                    <button 
                                                                        onClick={() => handleSort(columnId as keyof Task)}
                                                                        className="ml-1 focus:outline-none"
                                                                    >
                                                                        <ArrowsUpDownIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={visibleColumnIds.length} className="px-3 sm:px-4 md:px-6 py-4 text-center">
                                                        <div className="flex justify-center">
                                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : error ? (
                                                <tr>
                                                    <td colSpan={visibleColumnIds.length} className="px-6 py-4 text-center text-red-600 dark:text-red-400">
                                                        {error}
                                                    </td>
                                                </tr>
                                            ) : filteredAndSortedTasks.length === 0 ? (
                                                <tr>
                                                    <td colSpan={visibleColumnIds.length} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                                        <div className="flex flex-col items-center justify-center gap-4">
                                                        <ClipboardDocumentListIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                                                        <div className="text-sm">{t('tasks.noTasksFound')}</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            <>
                                            {filteredAndSortedTasks.slice(0, displayLimit).map(task => {
                                            const expiryStatus = getExpiryStatus(task.dueDate, 'todo', undefined, task.title, task.description);
                                            const expiryColors = getExpiryColorClasses(expiryStatus);
                                            
                                            return (
                                                <tr 
                                                    key={task.id} 
                                                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                                        expiryStatus !== 'none' ? `${expiryColors.bgClass} ${expiryColors.borderClass} border-l-4` : ''
                                                    }`}
                                                >
                                                    {visibleColumnIds.map(columnId => {
                                                    switch (columnId) {
                                                        case 'title':
                                                            return (
                                                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4">
                                                                    <div className="text-sm text-gray-900 dark:text-gray-200 break-words flex items-center">
                                                                        {task.title}
                                                                            {task.description && (
                                                                                <div className="ml-2 relative group">
                                                                                    <button 
                                                                                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                                                                        title={t('tasks.showDescription')}
                                                                                    >
                                                                                        <InformationCircleIcon className="h-5 w-5" />
                                                                                    </button>
                                                                                    <div className="hidden group-hover:block absolute left-0 mt-2 p-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 w-144 max-h-96 overflow-y-auto min-w-[36rem] z-10">
                                                                                        <MarkdownPreview content={task.description} showImagePreview={true} />
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            case 'status':
                                                                return (
                                                                    <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(task.status, 'task')} dark:bg-opacity-30 status-col`}>
                                                                            {task.status}
                                                                        </span>
                                                                    </td>
                                                                );
                                                            case 'responsibleAndQualityControl':
                                                                return (
                                                                    <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                        <div className="flex flex-col">
                                                                            <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">{t('tasks.columns.responsible')}:</span>
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 inline sm:hidden">{t('tasks.columns.responsible').substring(0, 3)}:</span><br />
                                                                                {task.responsible ? `${task.responsible.firstName} ${task.responsible.lastName}` : task.role ? task.role.name : '-'}
                                                                            </div>
                                                                            <div className="text-sm text-gray-900 dark:text-gray-200 mt-1">
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">{t('tasks.qualityControlLabel')}</span>
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 inline sm:hidden">{t('tasks.columns.qualityControl').substring(0, 2)}:</span><br />
                                                                                {task.qualityControl ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}` : '-'}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                );
                                                            case 'branch':
                                                                return (
                                                                    <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                        <div className="text-sm text-gray-900 dark:text-gray-200">{task.branch.name}</div>
                                                                    </td>
                                                                );
                                                            case 'dueDate':
                                                                const expiryStatusForDate2 = getExpiryStatus(task.dueDate, 'todo', undefined, task.title, task.description);
                                                                const expiryColorsForDate2 = getExpiryColorClasses(expiryStatusForDate2);
                                                                return (
                                                                    <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                        <div className={`text-sm ${expiryStatusForDate2 !== 'none' ? expiryColorsForDate2.textClass : 'text-gray-900 dark:text-gray-200'}`}>
                                                                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                                                                            {expiryStatusForDate2 !== 'none' && (
                                                                                <span className="ml-2 text-xs">⚠</span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            case 'actions':
                                                                return (
                                                                    <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                        <div className="flex space-x-2 action-buttons">
                                                                            <div className="status-buttons">
                                                                                {renderStatusButtons(task)}
                                                                            </div>
                                                                            {hasPermission('tasks', 'write', 'table') && (
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setSelectedTask(task);
                                                                                        setIsEditModalOpen(true);
                                                                                    }}
                                                                                    className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                                                    title={t('common.edit')}
                                                                                >
                                                                                    <PencilIcon className="h-4 w-4" />
                                                                                </button>
                                                                            )}
                                                                            {hasPermission('tasks', 'both', 'table') && (
                                                                                <button
                                                                                    onClick={() => handleCopyTask(task)}
                                                                                    className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                                                                    title={t('tasks.actions.copy')}
                                                                                >
                                                                                    <DocumentDuplicateIcon className="h-4 w-4" />
                                                                                </button>
                                                                            )}
                                                                            {hasPermission('tasks', 'delete', 'table') && (
                                                                                <button
                                                                                    onClick={() => handleDeleteTask(task.id)}
                                                                                    className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                                                    title={t('common.delete')}
                                                                                >
                                                                                    <TrashIcon className="h-4 w-4" />
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
                                    {loading ? (
                                        <div className="flex justify-center py-12">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
                                        </div>
                                    ) : error ? (
                                        <div className="flex justify-center py-12 text-red-600 dark:text-red-400">
                                            {error}
                                        </div>
                                    ) : filteredAndSortedTasks.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                                            <ClipboardDocumentListIcon className="h-10 w-10 mb-4 text-gray-400 dark:text-gray-500" />
                                            <div className="text-sm">Keine To Do's gefunden</div>
                                        </div>
                                    ) : (
                                        <CardGrid>
                                            {filteredAndSortedTasks.slice(0, displayLimit).map(task => {
                                                const expiryStatus = getExpiryStatus(task.dueDate, 'todo', undefined, task.title, task.description);
                                                
                                                // Metadaten basierend auf sichtbaren Einstellungen - strukturiert nach Position
                                                const metadata: MetadataItem[] = [];
                                                
                                                // Links: Niederlassung
                                                if (visibleCardMetadata.has('branch')) {
                                                    metadata.push({
                                                        icon: <BuildingOfficeIcon className="h-4 w-4" />,
                                                        label: t('tasks.columns.branch'),
                                                        value: task.branch.name,
                                                        section: 'left'
                                                    });
                                                }
                                                
                                                // Haupt-Metadaten: Verantwortlicher & Qualitätskontrolle
                                                if (visibleCardMetadata.has('responsible')) {
                                                    // Benutzernamen auf 4 Zeichen kürzen
                                                    const responsibleValue = task.responsible ? `${task.responsible.firstName} ${task.responsible.lastName}` : (task.role ? task.role.name : '-');
                                                    const shortenedName = responsibleValue.length > 4 && responsibleValue !== '-' ? responsibleValue.substring(0, 4) : responsibleValue;
                                                    metadata.push({
                                                        icon: <UserIcon className="h-4 w-4" />,
                                                        label: t('tasks.columns.responsible'),
                                                        value: shortenedName,
                                                        section: 'main'
                                                    });
                                                }
                                                if (visibleCardMetadata.has('qualityControl')) {
                                                    // Benutzernamen auf 4 Zeichen kürzen
                                                    const qualityControlValue = task.qualityControl ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}` : '-';
                                                    const shortenedName = qualityControlValue.length > 4 && qualityControlValue !== '-' ? qualityControlValue.substring(0, 4) : qualityControlValue;
                                                    metadata.push({
                                                        icon: <UserIcon className="h-4 w-4" />,
                                                        label: t('tasks.columns.qualityControl'),
                                                        value: shortenedName,
                                                        section: 'main-second'
                                                    });
                                                }
                                                
                                                // Rechts: Fälligkeit (erste Zeile rechts, neben Status)
                                                if (visibleCardMetadata.has('dueDate')) {
                                                    const dueDateItem = createDueDateMetadataItem(
                                                        task.dueDate,
                                                        'todo',
                                                        task.title,
                                                        task.description,
                                                        <CalendarIcon className="h-4 w-4" />,
                                                        t('tasks.columns.dueDate'),
                                                        (date) => format(date, 'dd.MM.yyyy', { locale: de }),
                                                        false // Keine Badge-Art, nur Text
                                                    );
                                                    metadata.push({
                                                        ...dueDateItem,
                                                        section: 'right-inline' // Neue Section für inline rechts (neben Status)
                                                    });
                                                }
                                                
                                                // Full-Width: Beschreibung
                                                if (visibleCardMetadata.has('description') && task.description) {
                                                    metadata.push({
                                                        label: t('tasks.columns.description'),
                                                        value: '',
                                                        descriptionContent: task.description,
                                                        attachmentMetadata: task.attachments || [], // Attachment-Metadaten für Vorschau
                                                        section: 'full'
                                                    });
                                                }
                                                
                                                // Action-Buttons
                                                const actionButtons = (
                                                    <div className="flex items-center space-x-2">
                                                        {/* Status-Buttons */}
                                                        <div className="status-buttons">
                                                            {renderStatusButtons(task)}
                                                        </div>
                                                        {hasPermission('tasks', 'write', 'table') && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedTask(task);
                                                                    setIsEditModalOpen(true);
                                                                }}
                                                                className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                                title={t('common.edit')}
                                                            >
                                                                <PencilIcon className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {hasPermission('tasks', 'both', 'table') && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCopyTask(task);
                                                                }}
                                                                className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                                                title={t('tasks.actions.copy')}
                                                            >
                                                                <DocumentDuplicateIcon className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                                
                                                return (
                                                    <DataCard
                                                        key={task.id}
                                                        title={task.title}
                                                        status={{
                                                            label: getStatusText(task.status, 'task', t),
                                                            color: getStatusColor(task.status, 'task'),
                                                            onPreviousClick: undefined,
                                                            onNextClick: undefined
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
                            
                            {/* "Mehr anzeigen" Button - Desktop */}
                            {filteredAndSortedTasks.length > displayLimit && (
                                <div className="mt-4 flex justify-center">
                                    <button
                                        className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 border border-blue-300 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-gray-600"
                                        onClick={() => setDisplayLimit(prevLimit => prevLimit + 10)}
                                    >
                                        {t('common.showMore')} ({filteredAndSortedTasks.length - displayLimit} {t('common.remaining')})
                                    </button>
                                </div>
                            )}
                            
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Die Modals für beide Ansichten (mobil und desktop) */}
            <CreateTaskModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onTaskCreated={(newTask) => {
                    // Optimistisches Update: Neuen Task zur Liste hinzufügen statt vollständigem Reload
                    if (newTask != null) {
                        setTasks(prevTasks => {
                            const validTasks = prevTasks.filter(task => task != null);
                            return [newTask, ...validTasks];
                        });
                        setIsEditModalOpen(true);
                        setSelectedTask(newTask);
                    }
                }}
            />
            
            {selectedTask && (
                <EditTaskModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedTask(null);
                    }}
                    onTaskUpdated={(updatedTask) => {
                        // Optimistisches Update: Task in Liste aktualisieren statt vollständigem Reload
                        if (updatedTask != null) {
                            setTasks(prevTasks => 
                                prevTasks
                                    .filter(task => task != null)
                                    .map(task => 
                                        task.id === updatedTask.id ? updatedTask : task
                                    )
                            );
                            setIsEditModalOpen(false);
                            setSelectedTask(null);
                            toast.success(t('worktime.messages.taskUpdated'));
                        }
                    }}
                    task={selectedTask}
                />
            )}
        </div>
    );
};

export default Worktracker; 