import React, { useState, useEffect } from 'react';
import axiosInstance from '../config/axios.ts';
import axios from 'axios';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';

interface User {
    id: number;
    firstName: string;
    lastName: string;
}

interface Branch {
    id: number;
    name: string;
}

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskCreated: () => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, onTaskCreated }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [responsibleId, setResponsibleId] = useState<number | ''>('');
    const [qualityControlId, setQualityControlId] = useState<number | ''>('');
    const [branchId, setBranchId] = useState<number | ''>('');
    const [dueDate, setDueDate] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            fetchBranches();
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        try {
            setError(null);
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Nicht authentifiziert');
                return;
            }

            console.log('Lade Benutzer für CreateTaskModal...');
            
            const response = await axiosInstance.get(API_ENDPOINTS.USERS.BASE);
            
            console.log('Benutzer geladen:', response.data.length);
            setUsers(response.data || []);
        } catch (err) {
            console.error('Fehler beim Laden der Benutzer:', err);
            
            if (axios.isAxiosError(err)) {
                if (err.code === 'ERR_NETWORK') {
                    setError('Verbindung zum Server konnte nicht hergestellt werden. Bitte stellen Sie sicher, dass der Server läuft.');
                } else {
                    setError(`Fehler beim Laden der Benutzer: ${err.response?.data?.message || err.message}`);
                }
            } else {
                setError('Ein unerwarteter Fehler ist aufgetreten');
            }
        }
    };

    const fetchBranches = async () => {
        try {
            setError(null);
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Nicht authentifiziert');
                return;
            }

            console.log('Lade Niederlassungen für CreateTaskModal...');
            
            const response = await axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE);
            
            console.log('Niederlassungen geladen:', response.data.length);
            setBranches(response.data || []);
        } catch (err) {
            console.error('Fehler beim Laden der Niederlassungen:', err);
            
            if (axios.isAxiosError(err)) {
                if (err.code === 'ERR_NETWORK') {
                    setError('Verbindung zum Server konnte nicht hergestellt werden. Bitte stellen Sie sicher, dass der Server läuft.');
                } else {
                    setError(`Fehler beim Laden der Niederlassungen: ${err.response?.data?.message || err.message}`);
                }
            } else {
                setError('Ein unerwarteter Fehler ist aufgetreten');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            console.log('Task wird erstellt mit Daten:', { title, description, responsibleId, qualityControlId, branchId, dueDate });

            if (!title || !responsibleId || !branchId) {
                setError('Bitte füllen Sie alle erforderlichen Felder aus');
                setLoading(false);
                return;
            }

            const token = localStorage.getItem('token');
            if (!token) {
                setError('Nicht authentifiziert');
                setLoading(false);
                return;
            }

            // Validiere die IDs
            const responsible = Number(responsibleId);
            const branch = Number(branchId);
            const qualityControl = qualityControlId ? Number(qualityControlId) : null;

            if (isNaN(responsible) || isNaN(branch) || (qualityControlId && isNaN(qualityControl!))) {
                setError('Ungültige ID-Werte für Verantwortlichen, Qualitätskontrolle oder Niederlassung');
                setLoading(false);
                return;
            }

            const response = await axiosInstance.post(API_ENDPOINTS.TASKS.BASE, 
                {
                    title,
                    description: description || null,
                    status: 'open',
                    responsibleId: responsible,
                    qualityControlId: qualityControl,
                    branchId: branch,
                    dueDate: dueDate || null
                }
            );

            console.log('Task erfolgreich erstellt:', response.data);
            onTaskCreated();
            handleClose();
        } catch (err) {
            console.error('Fehler beim Erstellen des Tasks:', err);
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || 'Fehler beim Erstellen des Tasks');
            } else {
                setError('Ein unerwarteter Fehler ist aufgetreten');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setTitle('');
        setDescription('');
        setResponsibleId('');
        setQualityControlId('');
        setBranchId('');
        setDueDate('');
        setError(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-xl w-full bg-white rounded-lg shadow-xl">
                    <div className="flex items-center justify-between p-4 border-b">
                        <Dialog.Title className="text-lg font-semibold">
                            Neue Aufgabe erstellen
                        </Dialog.Title>
                        <button
                            onClick={handleClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-md">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                                Titel *
                            </label>
                            <input
                                type="text"
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                Beschreibung
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="responsible" className="block text-sm font-medium text-gray-700">
                                Verantwortlich *
                            </label>
                            <select
                                id="responsible"
                                value={responsibleId}
                                onChange={(e) => setResponsibleId(Number(e.target.value))}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                required
                            >
                                <option value="">Bitte wählen</option>
                                {Array.isArray(users) && users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="qualityControl" className="block text-sm font-medium text-gray-700">
                                Qualitätskontrolle
                            </label>
                            <select
                                id="qualityControl"
                                value={qualityControlId}
                                onChange={(e) => setQualityControlId(e.target.value ? Number(e.target.value) : '')}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">Keine Qualitätskontrolle</option>
                                {Array.isArray(users) && users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="branch" className="block text-sm font-medium text-gray-700">
                                Niederlassung *
                            </label>
                            <select
                                id="branch"
                                value={branchId}
                                onChange={(e) => setBranchId(Number(e.target.value))}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                required
                            >
                                <option value="">Bitte wählen</option>
                                {Array.isArray(branches) && branches.map(branch => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                                Fälligkeitsdatum
                            </label>
                            <input
                                type="date"
                                id="dueDate"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                            >
                                Abbrechen
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                disabled={loading}
                            >
                                {loading ? 'Wird erstellt...' : 'Erstellen'}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default CreateTaskModal; 