import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useTableSettings } from '../hooks/useTableSettings.ts';
import TableColumnConfig from '../components/TableColumnConfig.tsx';
import { PencilIcon, TrashIcon, PlusIcon, ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, ArrowsUpDownIcon, FunnelIcon, XMarkIcon, DocumentDuplicateIcon, InformationCircleIcon, ClipboardDocumentListIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import CreateTaskModal from '../components/CreateTaskModal.tsx';
import EditTaskModal from '../components/EditTaskModal.tsx';
import WorktimeTracker from '../components/WorktimeTracker.tsx';
import WorktimeList from '../components/WorktimeList.tsx';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import FilterPane from '../components/FilterPane.tsx';
import { FilterCondition } from '../components/FilterRow.tsx';
import SavedFilterTags from '../components/SavedFilterTags.tsx';
import { toast } from 'react-toastify';
import MarkdownPreview from '../components/MarkdownPreview.tsx';

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
}

interface SortConfig {
    key: keyof Task | 'responsible.firstName' | 'qualityControl.firstName' | 'branch.name';
    direction: 'asc' | 'desc';
}

// Definiere die verfügbaren Spalten für die Tabelle
const availableColumns = [
    { id: 'title', label: 'Titel', shortLabel: 'Titel' },
    { id: 'status', label: 'Status', shortLabel: 'Status' },
    { id: 'responsibleAndQualityControl', label: 'Verantwortlich / Qualitätskontrolle', shortLabel: 'Ver. / QK' },
    { id: 'branch', label: 'Niederlassung', shortLabel: 'Niedr.' },
    { id: 'dueDate', label: 'Fälligkeitsdatum', shortLabel: 'Fällig' },
    { id: 'actions', label: 'Aktionen', shortLabel: 'Akt.' },
];

// Definiere zusätzliche Spalten, die nur für den Filter verfügbar sind, nicht für die Tabellenanzeige
const filterOnlyColumns = [
    { id: 'responsible', label: 'Verantwortlicher', shortLabel: 'Ver.' },
    { id: 'qualityControl', label: 'Qualitätskontrolle', shortLabel: 'QK' },
];

// Standard-Spaltenreihenfolge
const defaultColumnOrder = availableColumns.map(column => column.id);

// Definiere eine tableId für die To-Dos Tabelle
const TODOS_TABLE_ID = 'worktracker-todos';

const Worktracker: React.FC = () => {
    const { user } = useAuth();
    const { hasPermission } = usePermissions();
    const location = useLocation();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<Task['status'] | 'all'>('all');
    
    // State für erweiterte Filterbedingungen
    const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
    const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'dueDate', direction: 'asc' });
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
        isColumnVisible
    } = useTableSettings('worktracker_tasks', {
        defaultColumnOrder,
        defaultHiddenColumns: []
    });

    const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [displayLimit, setDisplayLimit] = useState<number>(10);

    // Funktion zum Neu Laden der Tasks
    const loadTasks = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get(API_ENDPOINTS.TASKS.BASE);
            setTasks(response.data);
            setError(null);
        } catch (error) {
            console.error('Fehler beim Laden der Tasks:', error);
            setError('Fehler beim Laden der Tasks');
        } finally {
            setLoading(false);
        }
    };

    // Lade Tasks beim ersten Render
    useEffect(() => {
        loadTasks();
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
                        name: 'Archiv',
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
                        name: 'Aktuell',
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

    const getStatusColor = (status: Task['status']) => {
        switch (status) {
            case 'open':
                return 'bg-gray-100 text-gray-800';
            case 'in_progress':
                return 'bg-blue-100 text-blue-800';
            case 'improval':
                return 'bg-yellow-100 text-yellow-800';
            case 'quality_control':
                return 'bg-purple-100 text-purple-800';
            case 'done':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handleStatusChange = async (taskId: number, newStatus: Task['status']) => {
        try {
            await axiosInstance.patch(API_ENDPOINTS.TASKS.BY_ID(taskId), { status: newStatus });
            // Aktualisiere die Aufgabenliste
            loadTasks();
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Status:', error);
            toast.error('Fehler beim Aktualisieren des Status');
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
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
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
                    className="p-1 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600"
                    title="Zurück zu Offen"
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
            );
        } else if (task.status === 'quality_control' && isResponsibleForTask(task)) {
            buttons.push(
                <button
                    key="back"
                    onClick={() => handleStatusChange(task.id, 'in_progress')}
                    className="p-1 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600"
                    title="Zurück in Bearbeitung"
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
            );
        } else if (task.status === 'done' && isQualityControlForTask(task)) {
            buttons.push(
                <button
                    key="back"
                    onClick={() => handleStatusChange(task.id, 'quality_control')}
                    className="p-1 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600"
                    title="Zurück zur Qualitätskontrolle"
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
            );
        }

        // Weiter-Button (rechts)
        if (task.status === 'open' && isResponsibleForTask(task)) {
            buttons.push(
                <button
                    key="forward"
                    onClick={() => handleStatusChange(task.id, 'in_progress')}
                    className="p-1 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600"
                    title="In Bearbeitung setzen"
                >
                    <ArrowRightIcon className="h-5 w-5" />
                </button>
            );
        } else if (task.status === 'in_progress' && isResponsibleForTask(task)) {
            buttons.push(
                <button
                    key="forward"
                    onClick={() => handleStatusChange(task.id, 'quality_control')}
                    className="p-1 bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600"
                    title="Zur Qualitätskontrolle"
                >
                    <ArrowRightIcon className="h-5 w-5" />
                </button>
            );
        } else if (task.status === 'quality_control' && isQualityControlForTask(task)) {
            buttons.push(
                <button
                    key="forward"
                    onClick={() => handleStatusChange(task.id, 'done')}
                    className="p-1 bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-600"
                    title="Als erledigt markieren"
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

    const applyFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
        setFilterConditions(conditions);
        setFilterLogicalOperators(operators);
    };
    
    const resetFilterConditions = () => {
        setFilterConditions([]);
        setFilterLogicalOperators([]);
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
        return tasks
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
            })
            .sort((a, b) => {
                // Verwende die sortConfig, wenn sie vorhanden ist
                if (sortConfig.key) {
                    let valueA, valueB;
                    
                    // Extrahiere die Werte basierend auf dem Sortierungsschlüssel
                    switch (sortConfig.key) {
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
                            valueA = a[sortConfig.key as keyof Task];
                            valueB = b[sortConfig.key as keyof Task];
                    }
                    
                    // Vergleiche die Werte basierend auf der Sortierrichtung
                    if (typeof valueA === 'number' && typeof valueB === 'number') {
                        return sortConfig.direction === 'asc' ? valueA - valueB : valueB - valueA;
                    } else {
                        const comparison = String(valueA).localeCompare(String(valueB));
                        return sortConfig.direction === 'asc' ? comparison : -comparison;
                    }
                }
                // Standardsortierung nur anwenden, wenn keine benutzerdefinierte Sortierung aktiv ist
                // Primäre Sortierung nach Fälligkeitsdatum
                const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                
                if (aDate !== bDate) {
                    return aDate - bDate; // Aufsteigend nach Datum
                }
                
                // Sekundäre Sortierung nach Status-Priorität
                const aStatusPrio = getStatusPriority(a.status);
                const bStatusPrio = getStatusPriority(b.status);
                
                if (aStatusPrio !== bStatusPrio) {
                    return aStatusPrio - bStatusPrio; // Aufsteigend nach Priorität
                }
                
                // Tertiäre Sortierung nach Titel
                return a.title.localeCompare(b.title);
            });
    }, [tasks, searchTerm, sortConfig, getStatusPriority, filterConditions, filterLogicalOperators]);

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
    const visibleColumnIds = settings.columnOrder.filter(id => isColumnVisible(id));

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

            // Erfolgreich kopiert, Tasks neu laden
            loadTasks();
            
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
        if (window.confirm('Sind Sie sicher, dass Sie diese Aufgabe löschen möchten?')) {
            try {
                await axiosInstance.delete(API_ENDPOINTS.TASKS.BY_ID(taskId));
                toast.success('Aufgabe erfolgreich gelöscht');
                // Aktualisiere die Aufgabenliste
                loadTasks();
            } catch (error) {
                console.error('Fehler beim Löschen der Aufgabe:', error);
                toast.error('Fehler beim Löschen der Aufgabe');
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
            toast.success('Aufgabe erfolgreich aktualisiert');
        } catch (error) {
            console.error('Fehler beim Speichern der Aufgabe:', error);
            toast.error('Fehler beim Speichern der Aufgabe');
        }
    };

    return (
        <div className="min-h-screen">
            <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
                {/* Neu angeordnete UI-Elemente in einer Zeile */}
                <div className="w-full mb-4">
                    {/* Auf mobilen Geräten wird diese Reihenfolge angezeigt - Tasks oben, Zeiterfassung unten */}
                    <div className="block sm:hidden w-full">
                    {/* Tasks */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 w-full mb-20">
                            <div className="flex items-center justify-between">
                                {/* Linke Seite: "Neuer Task"-Button */}
                                <div className="flex items-center">
                                    {hasPermission('tasks', 'write', 'table') && (
                                        <button 
                                            onClick={() => setIsCreateModalOpen(true)}
                                            className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm flex items-center justify-center"
                                            style={{ width: '30.19px', height: '30.19px' }}
                                            title="Neue Aufgabe erstellen"
                                            aria-label="Neue Aufgabe erstellen"
                                        >
                                            <PlusIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                
                                {/* Mitte: Titel */}
                                <div className="flex items-center">
                                    <CheckCircleIcon className="h-6 w-6 mr-2 dark:text-white" />
                                    <h2 className="text-xl font-semibold dark:text-white">To Do's</h2>
                                </div>
                                
                                {/* Rechte Seite: Suchfeld, Filter-Button, Status-Filter, Spalten-Konfiguration */}
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        placeholder="Suchen..."
                                        className="w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    
                                    {/* Filter-Button */}
                                    <button
                                        className={`p-2 rounded-md ${getActiveFilterCount() > 0 ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'} ml-1`}
                                        onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
                                        title="Filter"
                                    >
                                        <FunnelIcon className="h-5 w-5" />
                                        {getActiveFilterCount() > 0 && (
                                            <span className="absolute top-0 right-0 w-4 h-4 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
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
                                    columns={[...availableColumns, ...filterOnlyColumns]}
                                    onApply={applyFilterConditions}
                                    onReset={resetFilterConditions}
                                    savedConditions={filterConditions}
                                    savedOperators={filterLogicalOperators}
                                    tableId={TODOS_TABLE_ID}
                                />
                            )}
                            
                            {/* Gespeicherte Filter als Tags anzeigen */}
                            <SavedFilterTags
                                tableId={TODOS_TABLE_ID}
                                onSelectFilter={applyFilterConditions}
                                onReset={resetFilterConditions}
                                defaultFilterName="Aktuell"
                            />
                            
                            {/* Tabelle */}
                            <div className="overflow-x-auto">
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
                                                        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${columnId === dragOverColumn ? 'bg-blue-100 dark:bg-blue-800' : ''}`}
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
                                                <td colSpan={visibleColumnIds.length} className="px-6 py-4 text-center">
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
                                                        <div className="text-sm">Keine To Do's gefunden</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            <>
                                            {filteredAndSortedTasks.slice(0, displayLimit).map(task => (
                                                <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    {visibleColumnIds.map(columnId => {
                                                        switch (columnId) {
                                                            case 'title':
                                                                return (
                                                                    <td key={columnId} className="px-6 py-4">
                                                                        <div className="text-sm text-gray-900 dark:text-gray-200 break-words flex items-center">
                                                                            {task.title}
                                                                            {task.description && (
                                                                                <div className="ml-2 relative group">
                                                                                    <button 
                                                                                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                                                                        title="Beschreibung anzeigen"
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
                                                                    <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(task.status)} dark:bg-opacity-30 status-col`}>
                                                                            {task.status}
                                                                        </span>
                                                                    </td>
                                                                );
                                                            case 'responsibleAndQualityControl':
                                                                return (
                                                                    <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                                                                        <div className="flex flex-col">
                                                                            <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">Verantwortlich:</span>
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 inline sm:hidden">Ver.:</span><br />
                                                                                {task.responsible ? `${task.responsible.firstName} ${task.responsible.lastName}` : task.role ? task.role.name : '-'}
                                                                            </div>
                                                                            <div className="text-sm text-gray-900 dark:text-gray-200 mt-1">
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">Qualitätskontrolle:</span>
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 inline sm:hidden">QK:</span><br />
                                                                                {task.qualityControl ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}` : '-'}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                );
                                                            case 'branch':
                                                                return (
                                                                    <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                                                                        <div className="text-sm text-gray-900 dark:text-gray-200">{task.branch.name}</div>
                                                                    </td>
                                                                );
                                                            case 'dueDate':
                                                                return (
                                                                    <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                                                                        <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            case 'actions':
                                                                return (
                                                                    <td key={columnId} className="px-6 py-4 whitespace-nowrap">
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
                                                                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 edit-button ml-0.5"
                                                                                >
                                                                                    <PencilIcon className="h-5 w-5" />
                                                                                </button>
                                                                            )}
                                                                            {hasPermission('tasks', 'both', 'table') && (
                                                                                <button
                                                                                    onClick={() => handleCopyTask(task)}
                                                                                    className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 copy-button ml-0.5"
                                                                                    title="Task kopieren"
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
                            
                            {/* "Mehr anzeigen" Button - Mobil */}
                            {filteredAndSortedTasks.length > displayLimit && (
                                <div className="mt-4 flex justify-center">
                                    <button
                                        className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 border border-blue-300 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-gray-600"
                                        onClick={() => setDisplayLimit(prevLimit => prevLimit + 10)}
                                    >
                                        Mehr anzeigen ({filteredAndSortedTasks.length - displayLimit} verbleibend)
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
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 w-full mb-20">
                            <div className="flex items-center mb-4 justify-between">
                                {/* Linke Seite: "Neuer Task"-Button */}
                                <div className="flex items-center">
                                    {hasPermission('tasks', 'write', 'table') && (
                                        <button
                                            onClick={() => setIsCreateModalOpen(true)}
                                            className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm flex items-center justify-center"
                                            style={{ width: '30.19px', height: '30.19px' }}
                                            title="Neue Aufgabe erstellen"
                                            aria-label="Neue Aufgabe erstellen"
                                        >
                                            <PlusIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                
                                {/* Mitte: Titel */}
                                <div className="flex items-center">
                                    <CheckCircleIcon className="h-6 w-6 mr-2 dark:text-white" />
                                    <h2 className="text-xl font-semibold dark:text-white">To Do's</h2>
                                </div>
                                
                                {/* Rechte Seite: Suchfeld, Filter-Button, Status-Filter, Spalten-Konfiguration */}
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        placeholder="Suchen..."
                                        className="w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    
                                    {/* Filter-Button */}
                                    <button
                                        className={`p-2 rounded-md ${getActiveFilterCount() > 0 ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'} ml-1`}
                                        onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
                                        title="Filter"
                                    >
                                        <FunnelIcon className="h-5 w-5" />
                                        {getActiveFilterCount() > 0 && (
                                            <span className="absolute top-0 right-0 w-4 h-4 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
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
                                    columns={[...availableColumns, ...filterOnlyColumns]}
                                    onApply={applyFilterConditions}
                                    onReset={resetFilterConditions}
                                    savedConditions={filterConditions}
                                    savedOperators={filterLogicalOperators}
                                    tableId={TODOS_TABLE_ID}
                                />
                            )}

                            {/* Gespeicherte Filter als Tags anzeigen */}
                            <SavedFilterTags
                                tableId={TODOS_TABLE_ID}
                                onSelectFilter={applyFilterConditions}
                                onReset={resetFilterConditions}
                                defaultFilterName="Aktuell"
                            />

                            {/* Tabelle */}
                            <div className="overflow-x-auto">
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
                                                        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${columnId === dragOverColumn ? 'bg-blue-100 dark:bg-blue-800' : ''}`}
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
                                                <td colSpan={visibleColumnIds.length} className="px-6 py-4 text-center">
                                                    <div className="flex justify-center">
                                                        <div className="rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
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
                                                        <div className="text-sm">Keine To Do's gefunden</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            <>
                                            {filteredAndSortedTasks.slice(0, displayLimit).map(task => (
                                                <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    {visibleColumnIds.map(columnId => {
                                                        switch (columnId) {
                                                            case 'title':
                                                                return (
                                                                    <td key={columnId} className="px-6 py-4">
                                                                        <div className="text-sm text-gray-900 dark:text-gray-200 break-words flex items-center">
                                                                            {task.title}
                                                                            {task.description && (
                                                                                <div className="ml-2 relative group">
                                                                                    <button 
                                                                                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                                                                        title="Beschreibung anzeigen"
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
                                                                    <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(task.status)} dark:bg-opacity-30 status-col`}>
                                                                            {task.status}
                                                                        </span>
                                                                    </td>
                                                                );
                                                            case 'responsibleAndQualityControl':
                                                                return (
                                                                    <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                                                                        <div className="flex flex-col">
                                                                            <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">Verantwortlich:</span>
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 inline sm:hidden">Ver.:</span><br />
                                                                                {task.responsible ? `${task.responsible.firstName} ${task.responsible.lastName}` : task.role ? task.role.name : '-'}
                                                                            </div>
                                                                            <div className="text-sm text-gray-900 dark:text-gray-200 mt-1">
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">Qualitätskontrolle:</span>
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 inline sm:hidden">QK:</span><br />
                                                                                {task.qualityControl ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}` : '-'}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                );
                                                            case 'branch':
                                                                return (
                                                                    <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                                                                        <div className="text-sm text-gray-900 dark:text-gray-200">{task.branch.name}</div>
                                                                    </td>
                                                                );
                                                            case 'dueDate':
                                                                return (
                                                                    <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                                                                        <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                                                                        </div>
                                                                    </td>
                                                                );
                                                            case 'actions':
                                                                return (
                                                                    <td key={columnId} className="px-6 py-4 whitespace-nowrap">
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
                                                                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 edit-button ml-0.5"
                                                                                >
                                                                                    <PencilIcon className="h-5 w-5" />
                                                                                </button>
                                                                            )}
                                                                            {hasPermission('tasks', 'both', 'table') && (
                                                                                <button
                                                                                    onClick={() => handleCopyTask(task)}
                                                                                    className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 copy-button ml-0.5"
                                                                                    title="Task kopieren"
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
                            
                            {/* "Mehr anzeigen" Button - Desktop */}
                            {filteredAndSortedTasks.length > displayLimit && (
                                <div className="mt-4 flex justify-center">
                                    <button
                                        className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 border border-blue-300 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-gray-600"
                                        onClick={() => setDisplayLimit(prevLimit => prevLimit + 10)}
                                    >
                                        Mehr anzeigen ({filteredAndSortedTasks.length - displayLimit} verbleibend)
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
                onTaskCreated={loadTasks}
            />
            
            {selectedTask && (
                <EditTaskModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedTask(null);
                    }}
                    onTaskUpdated={loadTasks}
                    task={selectedTask}
                />
            )}
        </div>
    );
};

export default Worktracker; 