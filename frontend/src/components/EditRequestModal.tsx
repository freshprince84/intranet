import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth.tsx';

interface EditRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestUpdated: () => void;
  request: {
    id: number;
    title: string;
    responsible: {
      id: number;
    };
    branch: {
      id: number;
    };
    dueDate: string;
    createTodo: boolean;
  };
}

interface User {
  id: number;
  firstName: string;
  username: string;
}

interface Branch {
  id: number;
  name: string;
}

const EditRequestModal: React.FC<EditRequestModalProps> = ({
  isOpen,
  onClose,
  onRequestUpdated,
  request
}) => {
  const [title, setTitle] = useState(request.title);
  const [responsibleId, setResponsibleId] = useState(request.responsible.id);
  const [branchId, setBranchId] = useState(request.branch.id);
  const [dueDate, setDueDate] = useState(request.dueDate.split('T')[0]);
  const [createTodo, setCreateTodo] = useState(request.createTodo);
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setUsers(response.data);
      } catch (err) {
        console.error('Fehler beim Laden der Benutzer:', err);
        setError('Fehler beim Laden der Benutzer');
      }
    };

    const fetchBranches = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/branches', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setBranches(response.data);
      } catch (err) {
        console.error('Fehler beim Laden der Niederlassungen:', err);
        setError('Fehler beim Laden der Niederlassungen');
      }
    };

    if (isOpen) {
      fetchUsers();
      fetchBranches();
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

      await axios.put(
        `http://localhost:5000/api/requests/${request.id}`,
        {
          title,
          responsible_id: Number(responsibleId),
          branch_id: Number(branchId),
          due_date: dueDate,
          create_todo: createTodo
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      onRequestUpdated();
      onClose();
    } catch (err) {
      console.error('Update Error:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Ein Fehler ist aufgetreten');
      } else {
        setError('Ein unerwarteter Fehler ist aufgetreten');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full relative z-50">
        <h2 className="text-xl font-bold mb-4">Request bearbeiten</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Titel</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Verantwortlicher</label>
              <select
                value={responsibleId}
                onChange={(e) => setResponsibleId(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Bitte wählen</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} ({user.username})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Niederlassung</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Bitte wählen</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Fälligkeitsdatum</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={createTodo}
                onChange={(e) => setCreateTodo(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Todo erstellen
              </label>
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Speichern
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRequestModal; 