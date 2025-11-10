import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { MagnifyingGlassIcon, XMarkIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { Client } from '../types/client.ts';
import { toast } from 'react-toastify';
import * as clientApi from '../api/clientApi.ts';
import EditClientModal from './EditClientModal.tsx';

interface ClientSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (client: Client) => void;
  onCreateNew: () => void;
}

const ClientSelectModal: React.FC<ClientSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  onCreateNew
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadClients();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = clients.filter(client => 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [searchTerm, clients]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_ENDPOINTS.CLIENTS.BASE);
      setClients(response.data);
      setFilteredClients(response.data);
    } catch (error) {
      // Stille Behandlung - Fehler wird im UI durch leere Liste sichtbar
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClient(client);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!window.confirm(`Möchten Sie den Client "${client.name}" wirklich löschen?`)) {
      return;
    }

    try {
      await clientApi.deleteClient(client.id);
      toast.success('Client erfolgreich gelöscht');
      loadClients(); // Liste neu laden
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler beim Löschen des Clients');
    }
  };

  const handleClientUpdated = (updatedClient: Client) => {
    // Aktualisiere lokale Liste
    const index = clients.findIndex(c => c.id === updatedClient.id);
    if (index !== -1) {
      const newClients = [...clients];
      newClients[index] = updatedClient;
      setClients(newClients);
      setFilteredClients(newClients);
    }
    setIsEditModalOpen(false);
    setEditingClient(null);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                Client auswählen
              </Dialog.Title>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Suchfeld */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Client suchen..."
                autoFocus
              />
            </div>

            {/* Client-Liste */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  Lade Clients...
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {searchTerm ? 'Keine Clients gefunden' : 'Noch keine Clients vorhanden'}
                  </p>
                  <button
                    onClick={onCreateNew}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Neuen Client anlegen
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredClients.map((client) => (
                    <li key={client.id}>
                      <div className="flex items-center">
                        <button
                          onClick={() => onSelect(client)}
                          className="flex-1 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {client.name}
                            </p>
                            {client.company && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {client.company}
                              </p>
                            )}
                            {client.email && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {client.email}
                              </p>
                            )}
                          </div>
                        </button>
                        <div className="flex items-center space-x-2 px-2">
                          <button
                            onClick={(e) => handleEdit(client, e)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title={t('clients.edit')}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(client, e)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title={t('clients.delete')}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer mit "Neuer Client" Button */}
            {filteredClients.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={onCreateNew}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Neuen Client anlegen
                </button>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>

      {/* Edit Modal */}
      {editingClient && (
        <EditClientModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingClient(null);
          }}
          onClientUpdated={handleClientUpdated}
          onClientDeleted={(clientId) => {
            // Lädt Liste neu nach Löschung
            loadClients();
            setIsEditModalOpen(false);
            setEditingClient(null);
          }}
          client={editingClient}
        />
      )}
    </Dialog>
  );
};

export default ClientSelectModal; 