import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth.tsx';
import { PencilIcon, TrashIcon, PlusIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import CreateTaskModal from '../components/CreateTaskModal.tsx';
import EditTaskModal from '../components/EditTaskModal.tsx';
import WorktimeTracker from '../components/WorktimeTracker.tsx';
import WorktimeList from '../components/WorktimeList.tsx';
import WorktimeStats from '../components/WorktimeStats.tsx';
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

const Worktracker: React.FC = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<Task['status'] | 'all'>('all');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'dueDate', direction: 'asc' });
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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

            await axios.put(API_ENDPOINTS.TASKS.DETAIL(taskId), 
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

    const renderStatusButtons = (task: Task): JSX.Element[] => {
        const buttons: JSX.Element[] = [];
        
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

    const filteredAndSortedTasks = tasks
        .filter(task => {
            const matchesSearch = 
                task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                `${task.responsible.firstName} ${task.responsible.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (task.qualityControl && 
                    `${task.qualityControl.firstName} ${task.qualityControl.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())) ||
                task.branch.name.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
            
            return matchesSearch && matchesStatus;
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

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                {/* Zeiterfassung */}
                <div className="mb-8">
                    <WorktimeTracker />
                </div>

                {/* Tasks */}
                <div className="border rounded-lg bg-white">
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
                    
                    <div className="p-4 border-b bg-gray-50">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <div className="flex flex-1 gap-4">
                                <div className="group relative">
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                                    >
                                        <PlusIcon className="h-5 w-5" />
                                    </button>
                                    <div className="absolute left-0 top-full mt-2 w-max opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-800 text-white text-sm rounded-md py-1 px-2 pointer-events-none z-10">
                                        Neue Aufgabe
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Suchen..."
                                    className="w-full px-3 py-2 border rounded-md"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex-none">
                                <select
                                    className="px-3 py-2 border rounded-md bg-white"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as Task['status'] | 'all')}
                                >
                                    <option value="all">Alle Status</option>
                                    <option value="open">Offen</option>
                                    <option value="in_progress">In Bearbeitung</option>
                                    <option value="improval">Zu verbessern</option>
                                    <option value="quality_control">Qualitätskontrolle</option>
                                    <option value="done">Erledigt</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Task-Tabelle */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Titel
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Verantwortlich
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Qualitätskontrolle
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Niederlassung
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fälligkeit
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Aktionen
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredAndSortedTasks.map(task => (
                                    <tr key={task.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {task.title}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(task.status)}`}>
                                                {task.status === 'open' && 'Offen'}
                                                {task.status === 'in_progress' && 'In Bearbeitung'}
                                                {task.status === 'improval' && 'Zu verbessern'}
                                                {task.status === 'quality_control' && 'Qualitätskontrolle'}
                                                {task.status === 'done' && 'Erledigt'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {task.responsible.firstName} {task.responsible.lastName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {task.qualityControl ? `${task.qualityControl.firstName} ${task.qualityControl.lastName}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {task.branch.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end space-x-2">
                                                <div className="group relative">
                                                    <button
                                                        onClick={() => handleEditClick(task)}
                                                        className="p-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                                                    >
                                                        <PencilIcon className="h-5 w-5" />
                                                    </button>
                                                    <div className="absolute right-0 top-full mt-2 w-max opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-800 text-white text-sm rounded-md py-1 px-2 pointer-events-none z-10">
                                                        Bearbeiten
                                                    </div>
                                                </div>
                                                {renderStatusButtons(task)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Zeiterfassungs-Statistiken */}
                <div className="mt-8">
                    <WorktimeStats />
                </div>
            </div>
        </div>
    );
};

export default Worktracker; 