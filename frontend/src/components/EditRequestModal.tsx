import React, { useState, useEffect } from 'react';
import axios from 'axios';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface EditRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestUpdated: () => void;
  request: {
    id: number;
    title: string;
    description?: string;
    responsible: {
      id: number;
    };
    branch: {
      id: number;
    };
    dueDate: string | null;
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
  const { user } = useAuth();
  const [title, setTitle] = useState(request.title);
  const [description, setDescription] = useState(request.description || '');
  const [responsibleId, setResponsibleId] = useState(request.responsible.id);
  const [branchId, setBranchId] = useState(request.branch.id);
  const [dueDate, setDueDate] = useState(request.dueDate ? request.dueDate.split('T')[0] : '');
  const [createTodo, setCreateTodo] = useState(request.createTodo);
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  const { hasPermission } = usePermissions();
  const canDeleteRequest = hasPermission('requests', 'both', 'table');

  // Responsive Design: Überwache Fensterbreite
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    // Initialer Check
    checkScreenSize();

    // Event Listener für Größenänderungen
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Nicht authentifiziert');
        return;
      }

      const [usersResponse, branchesResponse] = await Promise.all([
        axiosInstance.get(API_ENDPOINTS.USERS.BASE),
        axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE)
      ]);

      setUsers(usersResponse.data || []);
      setBranches(branchesResponse.data || []);
    } catch (err) {
      console.error('Unerwarteter Fehler:', err);
      
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Validiere die IDs
      const requestId = request.id;
      const validResponsibleId = Number(responsibleId);
      const validBranchId = Number(branchId);

      if (isNaN(validResponsibleId) || isNaN(validBranchId)) {
        throw new Error('Ungültige ID-Werte für Verantwortlichen oder Niederlassung');
      }

      await axiosInstance.put(
        API_ENDPOINTS.REQUESTS.BY_ID(requestId),
        {
          title,
          description,
          responsible_id: validResponsibleId,
          branch_id: validBranchId,
          due_date: dueDate || null,
          create_todo: createTodo
        }
      );

      onRequestUpdated();
      onClose();
    } catch (err) {
      console.error('Update Error:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message);
      } else {
        setError('Ein unerwarteter Fehler ist aufgetreten');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    
    try {
      setLoading(true);
      
      await axiosInstance.delete(API_ENDPOINTS.REQUESTS.BY_ID(request.id));

      onRequestUpdated();
      onClose();
    } catch (err) {
      console.error('Delete Error:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message);
      } else {
        setError('Ein unerwarteter Fehler ist aufgetreten');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Titel</label>
        <input
          type="text"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Beschreibung</label>
        <textarea
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Verantwortlicher</label>
        <select
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={responsibleId}
          onChange={(e) => setResponsibleId(Number(e.target.value))}
        >
          {users.map(user => (
            <option key={user.id} value={user.id}>
              {user.firstName} {user.username ? `(${user.username})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Niederlassung</label>
        <select
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={branchId}
          onChange={(e) => setBranchId(Number(e.target.value))}
        >
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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="create_todo"
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={createTodo}
          onChange={(e) => setCreateTodo(e.target.checked)}
        />
        <label htmlFor="create_todo" className="ml-2 block text-sm text-gray-700">
          Todo automatisch erstellen
        </label>
      </div>

      <div className="flex justify-between">
        {canDeleteRequest && (
          <button
            type="button"
            onClick={handleDelete}
            className={`px-4 py-2 text-sm font-medium ${
              confirmDelete ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'
            } rounded-md`}
          >
            {confirmDelete ? 'Bestätigen' : 'Löschen'}
          </button>
        )}
        <div className="flex space-x-2 ml-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            disabled={loading}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Wird gespeichert...' : 'Speichern'}
          </button>
        </div>
      </div>
    </form>
  );

  // Für Mobile (unter 640px) - klassisches Modal
  if (isMobile) {
    return (
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-xl w-full bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <Dialog.Title className="text-lg font-semibold">
                Request bearbeiten
              </Dialog.Title>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4">
              {error && (
                <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                  {error}
                </div>
              )}

              {renderForm()}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  }

  // Für Desktop (ab 640px) - Sidepane
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Semi-transparenter Hintergrund für den Rest der Seite */}
      <div 
        className="fixed inset-0 bg-black/10 transition-opacity" 
        aria-hidden="true" 
        onClick={onClose}
      />
      
      {/* Sidepane von rechts einfahren */}
      <div 
        className={`fixed inset-y-0 right-0 max-w-sm w-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <Dialog.Title className="text-lg font-semibold">
            Request bearbeiten
          </Dialog.Title>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto h-full">
          {error && (
            <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          {renderForm()}
        </div>
      </div>
    </Dialog>
  );
};

export default EditRequestModal; 