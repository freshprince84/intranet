import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Für type checking
import axiosInstance from '../config/axios.ts'; // Importiere die konfigurierte axios-Instanz
import { useAuth } from '../hooks/useAuth.tsx';
import { API_ENDPOINTS } from '../config/api.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface User {
  id: number;
  firstName: string;
  username: string;
  branchId?: number; // Optional, falls in manchen Kontexten nicht verfügbar
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

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

          // Voreinstellungen setzen
          if (user) {
            // 1. Verantwortlicher: Aktueller Benutzer
            setFormData(prevData => ({ 
              ...prevData, 
              responsible_id: user.id.toString() 
            }));

            // 2. Niederlassung: Aktuell gewählte Niederlassung des Benutzers
            // Fallback: erste verfügbare Niederlassung verwenden
            if (branchesResponse.data && branchesResponse.data.length > 0) {
              // Wir versuchen, die vom Benutzer zuletzt genutzte Niederlassung zu verwenden
              // Falls nicht verfügbar, verwenden wir die erste Niederlassung
              const userBranch = branchesResponse.data[0]?.id.toString();
              setFormData(prevData => ({ 
                ...prevData, 
                branch_id: userBranch 
              }));
            }

            // 3. Fälligkeitsdatum: Datum "jetzt + 2 Wochen"
            const twoWeeksFromNow = new Date();
            twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
            const formattedDate = twoWeeksFromNow.toISOString().split('T')[0]; // Format: YYYY-MM-DD
            setFormData(prevData => ({ 
              ...prevData, 
              due_date: formattedDate 
            }));
          }
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

  // Überprüfung der Bildschirmgröße
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Initial prüfen
    checkScreenSize();
    
    // Event-Listener für Größenänderungen
    window.addEventListener('resize', checkScreenSize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

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

  // Für Mobile (unter 640px) - klassisches Modal
  if (isMobile) {
    return (
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-xl w-full bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <Dialog.Title className="text-lg font-semibold">
                Neuer Request
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="create_todo"
                    className="rounded border-gray-300 text-blue-600"
                    checked={formData.create_todo}
                    onChange={(e) => setFormData({ ...formData, create_todo: e.target.checked })}
                  />
                  <label htmlFor="create_todo" className="ml-2 block text-sm text-gray-700">
                    Todo automatisch erstellen
                  </label>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? 'Wird erstellt...' : 'Erstellen'}
                  </button>
                </div>
              </form>
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
            Neuer Request
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="create_todo_sidepane"
                className="rounded border-gray-300 text-blue-600"
                checked={formData.create_todo}
                onChange={(e) => setFormData({ ...formData, create_todo: e.target.checked })}
              />
              <label htmlFor="create_todo_sidepane" className="ml-2 block text-sm text-gray-700">
                Todo automatisch erstellen
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Wird erstellt...' : 'Erstellen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};

export default CreateRequestModal; 