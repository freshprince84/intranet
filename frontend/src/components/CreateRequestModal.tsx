import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Für type checking
import axiosInstance from '../config/axios.ts'; // Importiere die konfigurierte axios-Instanz
import { useAuth } from '../hooks/useAuth.tsx';
import { API_ENDPOINTS } from '../config/api.ts';

interface User {
  id: number;
  firstName: string;
  username: string;
}

interface Branch {
  id: number;
  name: string;
}

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestCreated: () => void;
}

const CreateRequestModal: React.FC<CreateRequestModalProps> = ({ isOpen, onClose, onRequestCreated }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    responsible_id: '',
    branch_id: '',
    due_date: '',
    create_todo: false
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Lade Benutzer und Niederlassungen beim Öffnen des Modals
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Nicht authentifiziert');
          return;
        }

        console.log('Lade Daten für CreateRequestModal...');
        
        try {
          const [usersResponse, branchesResponse] = await Promise.all([
            axiosInstance.get(API_ENDPOINTS.USERS.BASE),
            axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE)
          ]);

          console.log('Benutzer geladen:', usersResponse.data.length);
          console.log('Niederlassungen geladen:', branchesResponse.data.length);
          
          setUsers(usersResponse.data || []);
          setBranches(branchesResponse.data || []);
        } catch (err) {
          console.error('Fehler beim Laden der Daten:', err);
          
          if (axios.isAxiosError(err)) {
            if (err.code === 'ERR_NETWORK') {
              setError('Verbindung zum Server konnte nicht hergestellt werden. Bitte stellen Sie sicher, dass der Server läuft.');
            } else {
              setError(`Fehler beim Laden der Daten: ${err.response?.data?.message || err.message}`);
            }
          } else {
            setError('Ein unerwarteter Fehler ist aufgetreten');
          }
        }
      } catch (err) {
        console.error('Unerwarteter Fehler:', err);
        setError('Ein unerwarteter Fehler ist aufgetreten');
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Formatiere den Benutzernamen (erstes Wort vom Vornamen + erstes Wort vom Benutzernamen)
  const formatUserName = (user: User) => {
    const firstName = user.firstName.split(' ')[0];
    const username = user.username.split(' ')[0];
    return `${firstName} (${username})`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Nicht authentifiziert');
      if (!user?.id) throw new Error('Benutzer-ID nicht gefunden');

      // Validiere die IDs
      const responsibleId = parseInt(formData.responsible_id);
      const branchId = parseInt(formData.branch_id);

      if (isNaN(responsibleId) || isNaN(branchId)) {
        throw new Error('Ungültige ID-Werte für Verantwortlichen oder Niederlassung');
      }

      const response = await axiosInstance.post(API_ENDPOINTS.REQUESTS.BASE, 
        {
          title: formData.title,
          description: formData.description || '',
          responsible_id: responsibleId,
          branch_id: branchId,
          requested_by_id: user.id,
          due_date: formData.due_date || null,
          create_todo: formData.create_todo,
          status: 'approval'
        }
      );

      if (response.status !== 201) {
        throw new Error('Fehler beim Erstellen des Requests');
      }

      onRequestCreated();
      onClose();
      setFormData({
        title: '',
        description: '',
        responsible_id: '',
        branch_id: '',
        due_date: '',
        create_todo: false
      });
    } catch (err) {
      console.error('Create Request Error:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen des Requests');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Neuer Request</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Titel</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Beschreibung</label>
            <textarea
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Verantwortlicher</label>
            <select
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              value={formData.responsible_id}
              onChange={(e) => setFormData({ ...formData, responsible_id: e.target.value })}
            >
              <option value="">Bitte wählen...</option>
              {Array.isArray(users) && users.map(user => (
                <option key={user.id} value={user.id}>
                  {formatUserName(user)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Niederlassung</label>
            <select
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              value={formData.branch_id}
              onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
            >
              <option value="">Bitte wählen...</option>
              {Array.isArray(branches) && branches.map(branch => (
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
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="create_todo"
              className="rounded border-gray-300 text-blue-600 shadow-sm"
              checked={formData.create_todo}
              onChange={(e) => setFormData({ ...formData, create_todo: e.target.checked })}
            />
            <label htmlFor="create_todo" className="ml-2 block text-sm text-gray-700">
              Todo erstellen
            </label>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={loading}
            >
              {loading ? 'Wird erstellt...' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRequestModal; 