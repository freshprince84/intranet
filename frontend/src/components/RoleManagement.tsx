import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { usePermissions, Role, Permission, AccessLevel } from '../hooks/usePermissions.ts';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

interface RoleFormData {
    name: string;
    description: string;
    permissions: {
        page: string;
        accessLevel: AccessLevel;
    }[];
}

const defaultPages = [
    'dashboard',
    'requests',
    'tasks',
    'users',
    'roles',
    'settings'
];

const RoleManagement: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formData, setFormData] = useState<RoleFormData>({
        name: '',
        description: '',
        permissions: defaultPages.map(page => ({
            page,
            accessLevel: 'none' as AccessLevel
        }))
    });

    const { isAdmin } = usePermissions();

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Nicht authentifiziert');

            const response = await axios.get('http://localhost:5000/api/roles', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            setRoles(response.data);
            setError(null);
        } catch (err) {
            console.error('Fehler beim Laden der Rollen:', err);
            setError('Fehler beim Laden der Rollen');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Nicht authentifiziert');

            if (editingRole) {
                await axios.put(
                    `http://localhost:5000/api/roles/${editingRole.id}`,
                    formData,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
            } else {
                await axios.post(
                    'http://localhost:5000/api/roles',
                    formData,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
            }

            await fetchRoles();
            setIsModalOpen(false);
            resetForm();
        } catch (err) {
            console.error('Fehler beim Speichern der Rolle:', err);
            setError('Fehler beim Speichern der Rolle');
        }
    };

    const handleDelete = async (roleId: number) => {
        if (!window.confirm('Möchten Sie diese Rolle wirklich löschen?')) return;

        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Nicht authentifiziert');

            await axios.delete(`http://localhost:5000/api/roles/${roleId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            await fetchRoles();
        } catch (err) {
            console.error('Fehler beim Löschen der Rolle:', err);
            setError('Fehler beim Löschen der Rolle');
        }
    };

    const handleEdit = (role: Role) => {
        setEditingRole(role);
        setFormData({
            name: role.name,
            description: role.description || '',
            permissions: role.permissions
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingRole(null);
        setFormData({
            name: '',
            description: '',
            permissions: defaultPages.map(page => ({
                page,
                accessLevel: 'none' as AccessLevel
            }))
        });
    };

    if (!isAdmin()) {
        return <div className="p-4 text-red-600">Nur Administratoren haben Zugriff auf diese Seite.</div>;
    }

    if (loading) return <div className="p-4">Lädt...</div>;
    if (error) return <div className="p-4 text-red-600">{error}</div>;

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Rollenverwaltung</h2>
                <button
                    onClick={() => {
                        resetForm();
                        setIsModalOpen(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Neue Rolle
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beschreibung</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Berechtigungen</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {roles.map(role => (
                            <tr key={role.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{role.name}</td>
                                <td className="px-6 py-4">{role.description}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-2">
                                        {role.permissions.map(permission => (
                                            <span
                                                key={permission.page}
                                                className="px-2 py-1 text-xs rounded-full bg-gray-100"
                                            >
                                                {permission.page}: {permission.accessLevel}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleEdit(role)}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(role.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-full max-w-2xl">
                        <h3 className="text-lg font-bold mb-4">
                            {editingRole ? 'Rolle bearbeiten' : 'Neue Rolle erstellen'}
                        </h3>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Beschreibung</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    rows={3}
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Berechtigungen</label>
                                <div className="space-y-2">
                                    {formData.permissions.map((permission, index) => (
                                        <div key={permission.page} className="flex items-center space-x-2">
                                            <span className="w-24">{permission.page}</span>
                                            <select
                                                value={permission.accessLevel}
                                                onChange={e => {
                                                    const newPermissions = [...formData.permissions];
                                                    newPermissions[index] = {
                                                        ...permission,
                                                        accessLevel: e.target.value as AccessLevel
                                                    };
                                                    setFormData({...formData, permissions: newPermissions});
                                                }}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            >
                                                <option value="none">Keine</option>
                                                <option value="read">Lesen</option>
                                                <option value="write">Schreiben</option>
                                                <option value="both">Beides</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    {editingRole ? 'Speichern' : 'Erstellen'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoleManagement; 