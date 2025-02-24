import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface User {
    id: number;
    firstName: string;
    lastName: string;
}

interface Branch {
    id: number;
    name: string;
}

interface Task {
    id: number;
    title: string;
    description: string | null;
    status: 'open' | 'in_progress' | 'improval' | 'quality_control' | 'done';
    responsible: {
        id: number;
    };
    qualityControl: {
        id: number;
    } | null;
    branch: {
        id: number;
    };
    dueDate: string | null;
}

interface EditTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskUpdated: () => void;
    task: Task;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ isOpen, onClose, onTaskUpdated, task }) => {
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [responsibleId, setResponsibleId] = useState(task.responsible.id);
    const [qualityControlId, setQualityControlId] = useState(task.qualityControl?.id || '');
    const [branchId, setBranchId] = useState(task.branch.id);
    const [dueDate, setDueDate] = useState(task.dueDate || '');
    const [status, setStatus] = useState(task.status);
    
    const [users, setUsers] = useState<User[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('Nicht authentifiziert');
                    return;
                }

                const headers = {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                };

                const [usersResponse, branchesResponse] = await Promise.all([
                    axios.get('http://localhost:5000/api/users', { headers }),
                    axios.get('http://localhost:5000/api/branches', { headers })
                ]);

                setUsers(usersResponse.data);
                setBranches(branchesResponse.data);
                setError(null);
            } catch (err) {
                console.error('Fehler beim Laden der Daten:', err);
                if (axios.isAxiosError(err)) {
                    setError(err.response?.data?.message || err.message);
                } else {
                    setError('Ein unerwarteter Fehler ist aufgetreten');
                }
            }
        };

        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Nicht authentifiziert');
                return;
            }

            const updatedTask = {
                title,
                description: description || null,
                status,
                responsibleId: Number(responsibleId),
                qualityControlId: qualityControlId ? Number(qualityControlId) : null,
                branchId: Number(branchId),
                dueDate: dueDate || null
            };

            await axios.put(
                `http://localhost:5000/api/tasks/${task.id}`,
                updatedTask,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            onTaskUpdated();
            onClose();
        } catch (err) {
            console.error('Update Error:', err);
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || err.message);
            } else {
                setError('Ein unerwarteter Fehler ist aufgetreten');
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen">
                <div className="fixed inset-0 bg-black opacity-30" onClick={onClose}></div>
                
                <div className="relative bg-white rounded-lg w-full max-w-md mx-4 p-6">
                    <h2 className="text-lg font-medium mb-4">
                        Aufgabe bearbeiten
                    </h2>

                    {error && (
                        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Titel
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Beschreibung
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                rows={3}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as Task['status'])}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            >
                                <option value="open">Offen</option>
                                <option value="in_progress">In Bearbeitung</option>
                                <option value="improval">Zu verbessern</option>
                                <option value="quality_control">Qualitätskontrolle</option>
                                <option value="done">Erledigt</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Verantwortlich
                            </label>
                            <select
                                value={responsibleId}
                                onChange={(e) => setResponsibleId(Number(e.target.value))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            >
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Qualitätskontrolle
                            </label>
                            <select
                                value={qualityControlId}
                                onChange={(e) => setQualityControlId(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="">Keine Qualitätskontrolle</option>
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Niederlassung
                            </label>
                            <select
                                value={branchId}
                                onChange={(e) => setBranchId(Number(e.target.value))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            >
                                {branches.map(branch => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Fälligkeitsdatum
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                                Abbrechen
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Speichern
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditTaskModal; 