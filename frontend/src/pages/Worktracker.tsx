import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useTableSettings } from '../hooks/useTableSettings.ts';
import TableColumnConfig from '../components/TableColumnConfig.tsx';
import { PencilIcon, TrashIcon, PlusIcon, ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, ArrowsUpDownIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import CreateTaskModal from '../components/CreateTaskModal.tsx';
import EditTaskModal from '../components/EditTaskModal.tsx';
import WorktimeTracker from '../components/WorktimeTracker.tsx';
import WorktimeList from '../components/WorktimeList.tsx';
import { API_ENDPOINTS } from '../config/api.ts';

interface Task {
    id: number;
    title: string;
    description: string | null;
    status: 'open' | 'in_progress' | 'improval' | 'quality_control' | 'done';
    responsible: {
        id: number;
        firstName: string;
        lastName: string;
    };
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

interface FilterState {
    title: string;
    status: Task['status'] | 'all';
    responsible: string;
    qualityControl: string;
    branch: string;
    dueDateFrom: string;
    dueDateTo: string;
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

// Standard-Spaltenreihenfolge
const defaultColumnOrder = availableColumns.map(column => column.id);

const Worktracker: React.FC = () => {
    const { user } = useAuth();
    const { hasPermission } = usePermissions();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<Task['status'] | 'all'>('all');
    const [filterState, setFilterState] = useState<FilterState>({
        title: '',
        status: 'all',
        responsible: '',
        qualityControl: '',
        branch: '',
        dueDateFrom: '',
        dueDateTo: ''
    });
    const [activeFilters, setActiveFilters] = useState<FilterState>({
        title: '',
        status: 'all',
        responsible: '',
        qualityControl: '',
        branch: '',
        dueDateFrom: '',
        dueDateTo: ''
    });
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'dueDate', direction: 'asc' });
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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

    const fetchTasks = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Nicht authentifiziert');
                setLoading(false);
                return;
            }

            const response = await axios.get(API_ENDPOINTS.TASKS.BASE, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            setTasks(response.data);
            setError(null);
        } catch (err) {
            console.error('Task Error:', err);
            if (axios.isAxiosError(err)) {
                setError(`Fehler beim Laden der Tasks: ${err.response?.data?.message || err.message}`);
            } else {
                setError('Ein unerwarteter Fehler ist aufgetreten');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
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
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Nicht authentifiziert');
                return;
            }

            await axios.put(API_ENDPOINTS.TASKS.BY_ID(taskId), 
                { status: newStatus },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            await fetchTasks();
        } catch (err) {
            console.error('Status Update Error:', err);
            if (axios.isAxiosError(err)) {
                setError(`Fehler beim Aktualisieren des Status: ${err.response?.data?.message || err.message}`);
            } else {
                setError('Ein unerwarteter Fehler ist aufgetreten');
            }
        }
    };

    const handleEditClick = (task: Task) => {
        setSelectedTask(task);
        setIsEditModalOpen(true);
    };

    const isResponsibleForTask = (task: Task) => {
        return task.responsible.id === user?.id;
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
                    className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
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
                    className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
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
                    className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
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
                    className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
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
                    className="p-1 bg-purple-600 text-white rounded hover:bg-purple-700"
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
                    className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                    title="Als erledigt markieren"
                >
                    <ArrowRightIcon className="h-5 w-5" />
                </button>
            );
        }

        return buttons;
    };

    const getActiveFilterCount = () => {
        let count = 0;
        if (activeFilters.title) count++;
        if (activeFilters.status !== 'all') count++;
        if (activeFilters.responsible) count++;
        if (activeFilters.qualityControl) count++;
        if (activeFilters.branch) count++;
        if (activeFilters.dueDateFrom) count++;
        if (activeFilters.dueDateTo) count++;
        return count;
    };

    const resetFilters = () => {
        setFilterState({
            title: '',
            status: 'all',
            responsible: '',
            qualityControl: '',
            branch: '',
            dueDateFrom: '',
            dueDateTo: ''
        });
    };

    const applyFilters = () => {
        setActiveFilters(filterState);
        setStatusFilter(filterState.status); // Aktualisiere auch die statusFilter-Variable für die Kompatibilität
        setIsFilterModalOpen(false);
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
                        `${task.responsible.firstName} ${task.responsible.lastName}`.toLowerCase().includes(searchLower) ||
                        (task.qualityControl && `${task.qualityControl.firstName} ${task.qualityControl.lastName}`.toLowerCase().includes(searchLower)) ||
                        task.branch.name.toLowerCase().includes(searchLower);
                    
                    if (!matchesSearch) return false;
                }
                
                // Erweiterte Filterkriterien
                if (activeFilters.title && !task.title.toLowerCase().includes(activeFilters.title.toLowerCase())) {
                    return false;
                }
                
                if (activeFilters.status !== 'all' && task.status !== activeFilters.status) {
                    return false;
                }
                
                if (activeFilters.responsible) {
                    const responsibleName = `${task.responsible.firstName} ${task.responsible.lastName}`.toLowerCase();
                    if (!responsibleName.includes(activeFilters.responsible.toLowerCase())) {
                        return false;
                    }
                }
                
                if (activeFilters.qualityControl && task.qualityControl) {
                    const qualityControlName = `${task.qualityControl.firstName} ${task.qualityControl.lastName}`.toLowerCase();
                    if (!qualityControlName.includes(activeFilters.qualityControl.toLowerCase())) {
                        return false;
                    }
                }
                
                if (activeFilters.branch && !task.branch.name.toLowerCase().includes(activeFilters.branch.toLowerCase())) {
                    return false;
                }
                
                if (activeFilters.dueDateFrom && task.dueDate) {
                    const dueDateFrom = new Date(activeFilters.dueDateFrom);
                    const taskDate = new Date(task.dueDate);
                    if (taskDate < dueDateFrom) {
                        return false;
                    }
                }
                
                if (activeFilters.dueDateTo && task.dueDate) {
                    const dueDateTo = new Date(activeFilters.dueDateTo);
                    const taskDate = new Date(task.dueDate);
                    if (taskDate > dueDateTo) {
                        return false;
                    }
                }
                
                return true;
            })
            .sort((a, b) => {
                let aValue: any = a[sortConfig.key as keyof Task];
                let bValue: any = b[sortConfig.key as keyof Task];

                if (sortConfig.key === 'responsible.firstName') {
                    aValue = a.responsible.firstName;
                    bValue = b.responsible.firstName;
                } else if (sortConfig.key === 'qualityControl.firstName') {
                    aValue = a.qualityControl?.firstName || '';
                    bValue = b.qualityControl?.firstName || '';
                } else if (sortConfig.key === 'branch.name') {
                    aValue = a.branch.name;
                    bValue = b.branch.name;
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
    }, [tasks, searchTerm, activeFilters, sortConfig]);

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

    return (
        <div className="min-h-screen">
            <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
                {/* Auf mobilen Geräten wird diese Reihenfolge angezeigt - Tasks oben, Zeiterfassung unten */}
                <div className="block sm:hidden">
                {/* Tasks */}
                    <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6 w-full mb-20">
                        <div className="flex items-center justify-between">
                            {/* Linke Seite: "Neuer Task"-Button */}
                            <div className="flex items-center">
                                {hasPermission('tasks', 'write', 'table') && (
                                    <button 
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="bg-white text-blue-600 p-1.5 rounded-full hover:bg-blue-50 border border-blue-200 shadow-sm flex items-center justify-center"
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
                                <CheckCircleIcon className="h-6 w-6 mr-2" />
                                <h2 className="text-xl font-semibold">To Do's</h2>
                            </div>
                            
                            {/* Rechte Seite: Suchfeld, Filter-Button, Status-Filter, Spalten-Konfiguration */}
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
                                    <FunnelIcon className="h-5 w-5" />
                                    {getActiveFilterCount() > 0 && (
                                        <span className="absolute top-0 right-0 w-4 h-4 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
                                            {getActiveFilterCount()}
                                        </span>
                                    )}
                                </button>
                                
                                {/* Status-Filter */}
                                        <select
                                    className="px-2 py-2 border rounded-md h-10 text-sm"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as Task['status'] | 'all')}
                                    title="Status-Filter"
                                >
                                    <option value="all">Alle Status</option>
                                            <option value="open">Offen</option>
                                            <option value="in_progress">In Bearbeitung</option>
                                            <option value="improval">Zu verbessern</option>
                                            <option value="quality_control">Qualitätskontrolle</option>
                                            <option value="done">Erledigt</option>
                                        </select>
                                
                                {/* Spalten-Konfiguration */}
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
                        
                        {/* Tabelle */}
                        <div className="mobile-table-container mt-4 -mx-1 px-0 w-auto tasks-table">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {visibleColumnIds.map((columnId) => {
                                            const column = availableColumns.find(col => col.id === columnId);
                                            if (!column) return null;
                                            
                                            return (
                                                <th
                                                    key={columnId}
                                                    scope="col"
                                                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${columnId === dragOverColumn ? 'bg-blue-100' : ''}`}
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
                                                                <ArrowsUpDownIcon className="h-4 w-4 text-gray-400" />
                                                            </button>
                                                        )}
                                        </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={visibleColumnIds.length} className="px-6 py-4 text-center">
                                                <div className="flex justify-center">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                                    </div>
                                            </td>
                                        </tr>
                                    ) : error ? (
                                        <tr>
                                            <td colSpan={visibleColumnIds.length} className="px-6 py-4 text-center text-red-500">
                                                {error}
                                            </td>
                                        </tr>
                                    ) : filteredAndSortedTasks.length === 0 ? (
                                        <tr>
                                            <td colSpan={visibleColumnIds.length} className="px-6 py-4 text-center text-gray-500">
                                                Keine Tasks gefunden.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAndSortedTasks.map((task) => (
                                            <tr key={task.id}>
                                                {visibleColumnIds.map((columnId) => {
                                                    if (columnId === 'title') {
                                                        return (
                                                            <td key={`${task.id}-${columnId}`} className="px-6 py-2">
                                                                <div className="flex items-start">
                                                                    <div className="text-sm font-medium text-gray-900">
                                                                        {task.title}
                                    </div>
                                        </div>
                                                                {task.description && task.description.trim() !== '' && (
                                                                    <div className="text-xs text-gray-500 mt-1 hidden sm:block">
                                                                        {task.description.length > 100 
                                                                            ? `${task.description.substring(0, 100)}...` 
                                                                            : task.description}
                                        </div>
                                                                )}
                                                            </td>
                                                        );
                                                    }
                                                    if (columnId === 'status') {
                                                        return (
                                                            <td key={`${task.id}-${columnId}`} className="px-6 py-2 whitespace-nowrap">
                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(task.status)} status-col`}>
                                                                    {task.status === 'open' && 'Offen'}
                                                                    {task.status === 'in_progress' && 'In Bearbeitung'}
                                                                    {task.status === 'improval' && 'Zu verbessern'}
                                                                    {task.status === 'quality_control' && 'Qualitätskontrolle'}
                                                                    {task.status === 'done' && 'Erledigt'}
                                                                </span>
                                                            </td>
                                                        );
                                                    }
                                                    if (columnId === 'responsibleAndQualityControl') {
                                                        return (
                                                            <td key={`${task.id}-${columnId}`} className="px-6 py-2 whitespace-nowrap">
                                                                <div className="flex flex-col">
                                                                    <div className="text-sm text-gray-900">
                                                                        <span className="text-xs text-gray-500 hidden sm:inline">Verantwortlich:</span>
                                                                        <span className="text-xs text-gray-500 inline sm:hidden">Ver.:</span><br />
                                                                        {`${task.responsible.firstName} ${task.responsible.lastName}`}
                                    </div>
                                                                    <div className="text-sm text-gray-900 mt-1">
                                                                        <span className="text-xs text-gray-500 hidden sm:inline">Qualitätskontrolle:</span>
                                                                        <span className="text-xs text-gray-500 inline sm:hidden">QK:</span><br />
                                                                        {task.qualityControl ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}` : '-'}
                                </div>
                                                                </div>
                                                            </td>
                                                        );
                                                    }
                                                    if (columnId === 'branch') {
                                                        return (
                                                            <td key={`${task.id}-${columnId}`} className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                                                                {task.branch.name}
                                                            </td>
                                                        );
                                                    }
                                                    if (columnId === 'dueDate') {
                                                        return (
                                                            <td key={`${task.id}-${columnId}`} className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                                                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                                                            </td>
                                                        );
                                                    }
                                                    if (columnId === 'actions') {
                                                        return (
                                                            <td key={`${task.id}-${columnId}`} className="px-6 py-2 whitespace-nowrap text-sm font-medium">
                                                                <div className="flex space-x-2 action-buttons">
                                                                    <div className="status-buttons">
                                                                        {renderStatusButtons(task)}
                                                                    </div>
                                                                    {(hasPermission('tasks', 'write', 'table') || isResponsibleForTask(task)) && (
                                    <button
                                                                            onClick={() => handleEditClick(task)}
                                                                            className="text-blue-600 hover:text-blue-900 edit-button"
                                                                            title="Task bearbeiten"
                                    >
                                                                            <PencilIcon className="h-5 w-5" />
                                    </button>
                                                                    )}
                                    </div>
                                                            </td>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                                </div>
                            </div>
                    
                    {/* Zeiterfassung - auf Mobilgeräten fixiert über dem Footermenü */}
                    <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-300 z-10 shadow-lg">
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
                    <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6 w-full">
                        <div className="flex items-center justify-between">
                            {/* Linke Seite: "Neuer Task"-Button */}
                            <div className="flex items-center">
                                {hasPermission('tasks', 'write', 'table') && (
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="bg-white text-blue-600 p-1.5 rounded-full hover:bg-blue-50 border border-blue-200 shadow-sm flex items-center justify-center"
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
                                <CheckCircleIcon className="h-6 w-6 mr-2" />
                                <h2 className="text-xl font-semibold">To Do's</h2>
                            </div>
                            
                            {/* Rechte Seite: Suchfeld, Filter-Button, Status-Filter, Spalten-Konfiguration */}
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
                                    <FunnelIcon className="h-5 w-5" />
                                        {getActiveFilterCount() > 0 && (
                                        <span className="absolute top-0 right-0 w-4 h-4 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
                                                {getActiveFilterCount()}
                                            </span>
                                        )}
                                </button>
                                
                                {/* Status-Filter */}
                                <select
                                    className="px-2 py-2 border rounded-md h-10 text-sm"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as Task['status'] | 'all')}
                                    title="Status-Filter"
                                >
                                    <option value="all">Alle Status</option>
                                    <option value="open">Offen</option>
                                    <option value="in_progress">In Bearbeitung</option>
                                    <option value="improval">Zu verbessern</option>
                                    <option value="quality_control">Qualitätskontrolle</option>
                                    <option value="done">Erledigt</option>
                                </select>
                                
                                {/* Spalten-Konfiguration */}
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

                        {/* Tabelle */}
                        <div className="mt-4 overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 tasks-table">
                            <thead className="bg-gray-50">
                                <tr>
                                        {visibleColumnIds.map((columnId) => {
                                        const column = availableColumns.find(col => col.id === columnId);
                                        if (!column) return null;

                                        return (
                                            <th 
                                                key={columnId}
                                                    scope="col"
                                                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${columnId === dragOverColumn ? 'bg-blue-100' : ''}`}
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
                                                                <ArrowsUpDownIcon className="h-4 w-4 text-gray-400" />
                                                            </button>
                                                        )}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={visibleColumnIds.length} className="px-6 py-4 text-center">
                                                <div className="flex justify-center">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                                            </div>
                                        </td>
                                    </tr>
                                    ) : error ? (
                                        <tr>
                                            <td colSpan={visibleColumnIds.length} className="px-6 py-4 text-center text-red-500">
                                                {error}
                                            </td>
                                        </tr>
                                    ) : filteredAndSortedTasks.length === 0 ? (
                                        <tr>
                                            <td colSpan={visibleColumnIds.length} className="px-6 py-4 text-center text-gray-500">
                                                Keine Tasks gefunden.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAndSortedTasks.map((task) => (
                                            <tr key={task.id}>
                                                {visibleColumnIds.map((columnId) => {
                                                if (columnId === 'title') {
                                                    return (
                                                            <td key={`${task.id}-${columnId}`} className="px-6 py-2">
                                                                <div className="flex items-start">
                                                                    <div className="text-sm font-medium text-gray-900">
                                                            {task.title}
                                                                    </div>
                                                                </div>
                                                                {task.description && task.description.trim() !== '' && (
                                                                    <div className="text-xs text-gray-500 mt-1 hidden sm:block">
                                                                        {task.description.length > 100 
                                                                            ? `${task.description.substring(0, 100)}...` 
                                                                            : task.description}
                                                                    </div>
                                                                )}
                                                        </td>
                                                    );
                                                }
                                                if (columnId === 'status') {
                                                    return (
                                                        <td key={`${task.id}-${columnId}`} className="px-6 py-2 whitespace-nowrap">
                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(task.status)} status-col`}>
                                                                {task.status === 'open' && 'Offen'}
                                                                {task.status === 'in_progress' && 'In Bearbeitung'}
                                                                {task.status === 'improval' && 'Zu verbessern'}
                                                                {task.status === 'quality_control' && 'Qualitätskontrolle'}
                                                                {task.status === 'done' && 'Erledigt'}
                                                            </span>
                                                        </td>
                                                    );
                                                }
                                                if (columnId === 'responsibleAndQualityControl') {
                                                    return (
                                                        <td key={`${task.id}-${columnId}`} className="px-6 py-2 whitespace-nowrap">
                                                            <div className="flex flex-col">
                                                                <div className="text-sm text-gray-900">
                                                                        <span className="text-xs text-gray-500 hidden sm:inline">Verantwortlich:</span>
                                                                        <span className="text-xs text-gray-500 inline sm:hidden">Ver.:</span><br />
                                                                    {`${task.responsible.firstName} ${task.responsible.lastName}`}
                                                                </div>
                                                                <div className="text-sm text-gray-900 mt-1">
                                                                        <span className="text-xs text-gray-500 hidden sm:inline">Qualitätskontrolle:</span>
                                                                        <span className="text-xs text-gray-500 inline sm:hidden">QK:</span><br />
                                                                    {task.qualityControl ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}` : '-'}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    );
                                                }
                                                if (columnId === 'branch') {
                                                    return (
                                                        <td key={`${task.id}-${columnId}`} className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                                                            {task.branch.name}
                                                        </td>
                                                    );
                                                }
                                                if (columnId === 'dueDate') {
                                                    return (
                                                        <td key={`${task.id}-${columnId}`} className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                                                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                                                        </td>
                                                    );
                                                }
                                                if (columnId === 'actions') {
                                                    return (
                                                        <td key={`${task.id}-${columnId}`} className="px-6 py-2 whitespace-nowrap text-sm font-medium">
                                                                <div className="flex space-x-2 action-buttons">
                                                                    <div className="status-buttons">
                                                                {renderStatusButtons(task)}
                                                                    </div>
                                                                {(hasPermission('tasks', 'write', 'table') || isResponsibleForTask(task)) && (
                                                                    <button
                                                                        onClick={() => handleEditClick(task)}
                                                                            className="text-blue-600 hover:text-blue-900 edit-button"
                                                                        title="Task bearbeiten"
                                                                    >
                                                                        <PencilIcon className="h-5 w-5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                </div>
                
                {/* Die Modals für beide Ansichten (mobil und desktop) */}
                <CreateTaskModal 
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onTaskCreated={fetchTasks}
                />
                
                {selectedTask && (
                    <EditTaskModal
                        isOpen={isEditModalOpen}
                        onClose={() => {
                            setIsEditModalOpen(false);
                            setSelectedTask(null);
                        }}
                        onTaskUpdated={fetchTasks}
                        task={selectedTask}
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
                                        onChange={(e) => setFilterState({...filterState, status: e.target.value as Task['status'] | 'all'})}
                                    >
                                        <option value="all">Alle</option>
                                        <option value="open">Offen</option>
                                        <option value="in_progress">In Bearbeitung</option>
                                        <option value="improval">Zu verbessern</option>
                                        <option value="quality_control">Qualitätskontrolle</option>
                                        <option value="done">Erledigt</option>
                                    </select>
                                </div>
                            
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Verantwortlich / Qualitätskontrolle</label>
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-xs text-gray-500">Verantwortlich:</span>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border rounded-md mt-1"
                                                value={filterState.responsible}
                                                onChange={(e) => setFilterState({...filterState, responsible: e.target.value})}
                                                placeholder="Nach Verantwortlichem filtern..."
                                            />
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500">Qualitätskontrolle:</span>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border rounded-md mt-1"
                                                value={filterState.qualityControl}
                                                onChange={(e) => setFilterState({...filterState, qualityControl: e.target.value})}
                                                placeholder="Nach Qualitätskontrolle filtern..."
                                            />
                                        </div>
                                    </div>
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
            </div>
        </div>
    );
};

export default Worktracker; 