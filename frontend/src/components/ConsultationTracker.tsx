import React, { useState, useEffect } from 'react';
import { PlayIcon, StopIcon, PlusIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { formatTime, calculateDuration } from '../utils/dateUtils.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { useBranch } from '../contexts/BranchContext.tsx';
import { toast } from 'react-toastify';
import ClientSelectModal from './ClientSelectModal.tsx';
import CreateClientModal from './CreateClientModal.tsx';
import { Client, Consultation } from '../types/client.ts';

const ConsultationTracker: React.FC = () => {
  const { user } = useAuth();
  const { selectedBranch } = useBranch();
  const [activeConsultation, setActiveConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClientSelectModalOpen, setIsClientSelectModalOpen] = useState(false);
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  const [notes, setNotes] = useState('');

  // Manuelle Erfassung States
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualStartTime, setManualStartTime] = useState('');
  const [manualEndTime, setManualEndTime] = useState('');

  useEffect(() => {
    checkActiveConsultation();
    loadRecentClients();
  }, []);

  const checkActiveConsultation = async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.WORKTIME.ACTIVE);
      if (response.data && response.data.clientId) {
        setActiveConsultation(response.data);
        setNotes(response.data.notes || '');
      }
    } catch (error) {
      // Stille Behandlung - normale Situation wenn keine aktive Beratung läuft
    } finally {
      setLoading(false);
    }
  };

  const loadRecentClients = async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.CLIENTS.RECENT);
      setRecentClients(response.data || []);
    } catch (error) {
      // Stille Behandlung - normale Situation wenn noch keine Clients beraten wurden
    }
  };

  const startConsultation = async (client: Client) => {
    if (!selectedBranch) {
      toast.error('Bitte wählen Sie eine Niederlassung in der Kopfzeile aus');
      return;
    }

    try {
      const data: any = {
        branchId: selectedBranch,
        clientId: client.id,
        notes: notes || null
      };

      console.log('Starte Beratung mit Daten:', data); // Debug-Log

      if (isManualEntry) {
        if (!manualStartTime || !manualEndTime) {
          toast.error('Bitte geben Sie Start- und Endzeit an');
          return;
        }
        data.startTime = new Date(manualStartTime).toISOString();
        
        // Erstelle die Beratung
        await axiosInstance.post(API_ENDPOINTS.CONSULTATIONS.START, data);
        
        // Beende sie sofort mit der Endzeit
        await axiosInstance.post(API_ENDPOINTS.CONSULTATIONS.STOP, {
          endTime: new Date(manualEndTime).toISOString(),
          notes: notes || null
        });
        
        toast.success('Beratung erfolgreich erfasst');
        setIsManualEntry(false);
        setManualStartTime('');
        setManualEndTime('');
        setNotes('');
        setSelectedClient(null);
      } else {
        const response = await axiosInstance.post(API_ENDPOINTS.CONSULTATIONS.START, data);
        setActiveConsultation(response.data);
        toast.success('Beratung gestartet');
      }
      
      loadRecentClients();
    } catch (error: any) {
      console.error('Fehler beim Starten der Beratung:', error);
      toast.error(error.response?.data?.message || 'Fehler beim Starten der Beratung');
    }
  };

  const stopConsultation = async () => {
    try {
      await axiosInstance.post(API_ENDPOINTS.CONSULTATIONS.STOP, {
        notes: notes || null
      });
      setActiveConsultation(null);
      setNotes('');
      toast.success('Beratung beendet');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler beim Beenden der Beratung');
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setIsClientSelectModalOpen(false);
    if (!isManualEntry) {
      startConsultation(client);
    }
  };

  const handleCreateClient = () => {
    setIsClientSelectModalOpen(false);
    setIsCreateClientModalOpen(true);
  };

  const handleClientCreated = (client: Client) => {
    setIsCreateClientModalOpen(false);
    setSelectedClient(client);
    if (!isManualEntry) {
      startConsultation(client);
    }
  };

  const handleManualSave = () => {
    if (!selectedClient) {
      toast.error('Bitte wählen Sie einen Client aus');
      return;
    }
    startConsultation(selectedClient);
  };

  const updateNotes = async () => {
    if (!activeConsultation) return;
    
    try {
      await axiosInstance.patch(
        API_ENDPOINTS.CONSULTATIONS.UPDATE_NOTES(activeConsultation.id),
        { notes }
      );
    } catch (error) {
      // Stille Behandlung - Auto-Save sollte nicht störend sein
    }
  };

  // Auto-save Notizen alle 30 Sekunden
  useEffect(() => {
    if (!activeConsultation || !notes) return;
    
    const timeout = setTimeout(() => {
      updateNotes();
    }, 30000);
    
    return () => clearTimeout(timeout);
  }, [notes, activeConsultation]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <UserGroupIcon className="h-8 w-8 mr-2" />
            Beratungs-Tracker
          </h2>
          {activeConsultation && (
            <div className="flex items-center text-green-600 dark:text-green-400">
              <ClockIcon className="h-5 w-5 mr-2 animate-pulse" />
              <span className="font-medium">
                {calculateDuration(activeConsultation.startTime, null)} - {activeConsultation.client?.name}
              </span>
            </div>
          )}
        </div>

        {/* Aktive Beratung oder Start-Buttons */}
        {activeConsultation ? (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Aktive Beratung mit</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeConsultation.client?.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Gestartet: {formatTime(activeConsultation.startTime)}
              </p>
            </div>

            {/* Notizen-Bereich */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notizen zur Beratung
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={updateNotes}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                rows={3}
                placeholder="Notizen hier eingeben..."
              />
            </div>

            <button
              onClick={stopConsultation}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <StopIcon className="h-5 w-5 mr-2" />
              Beratung beenden
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Zuletzt beratene Clients als Tags */}
            {recentClients.length > 0 && !isManualEntry && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Zuletzt beraten:
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentClients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => startConsultation(client)}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      {client.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Start-Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setIsClientSelectModalOpen(true)}
                className="flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlayIcon className="h-5 w-5 mr-2" />
                Beratung starten
              </button>

              <button
                onClick={() => setIsCreateClientModalOpen(true)}
                className="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Neuer Client
              </button>

              <button
                onClick={() => {
                  setIsManualEntry(!isManualEntry);
                  setSelectedClient(null);
                  setManualStartTime('');
                  setManualEndTime('');
                  setNotes('');
                }}
                className={`flex items-center justify-center px-4 py-3 border text-base font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isManualEntry
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                <ClockIcon className="h-5 w-5 mr-2" />
                Planen
              </button>
            </div>

            {/* Manuelle Erfassung / Planen */}
            {isManualEntry && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Beratung planen
                </h3>
                
                {/* Client-Auswahl */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Client
                  </label>
                  {selectedClient ? (
                    <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2">
                      <span className="text-sm text-gray-900 dark:text-white">{selectedClient.name}</span>
                      <button
                        onClick={() => setIsClientSelectModalOpen(true)}
                        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Ändern
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsClientSelectModalOpen(true)}
                      className="w-full text-left bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Client auswählen...
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start
                    </label>
                    <input
                      type="datetime-local"
                      value={manualStartTime}
                      onChange={(e) => setManualStartTime(e.target.value)}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ende
                    </label>
                    <input
                      type="datetime-local"
                      value={manualEndTime}
                      onChange={(e) => setManualEndTime(e.target.value)}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notizen
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    rows={2}
                    placeholder="Optionale Notizen..."
                  />
                </div>
                
                {/* Speichern-Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleManualSave}
                    disabled={!selectedClient || !manualStartTime || !manualEndTime}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Beratung speichern
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ClientSelectModal
        isOpen={isClientSelectModalOpen}
        onClose={() => setIsClientSelectModalOpen(false)}
        onSelect={handleClientSelect}
        onCreateNew={handleCreateClient}
      />

      <CreateClientModal
        isOpen={isCreateClientModalOpen}
        onClose={() => setIsCreateClientModalOpen(false)}
        onSave={handleClientCreated}
      />
    </>
  );
};

export default ConsultationTracker; 