import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import * as consultationApi from '../api/consultationApi.ts';
import * as clientApi from '../api/clientApi.ts';

// Union-Type für Client und Placeholder
type ClientOrPlaceholder = Client | {
  id: string;
  name: string;
  isPlaceholder: boolean;
  status?: 'past' | 'planned';
  lastConsultationDate?: string;
};

// Type Guard für Placeholder
const isPlaceholder = (client: ClientOrPlaceholder): client is { id: string; name: string; isPlaceholder: boolean; status?: 'past' | 'planned'; lastConsultationDate?: string; } => {
  return 'isPlaceholder' in client && client.isPlaceholder === true;
};

interface ConsultationTrackerProps {
  onConsultationChange: () => void;
  onConsultationStarted?: (clientName: string) => void;
}

const ConsultationTracker: React.FC<ConsultationTrackerProps> = ({ onConsultationChange, onConsultationStarted }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { selectedBranch } = useBranch();
  const [activeConsultation, setActiveConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isClientSelectModalOpen, setIsClientSelectModalOpen] = useState(false);
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  const [notes, setNotes] = useState('');
  const [lastStartedClientId, setLastStartedClientId] = useState<number | null>(null);
  
  // Responsive Tag-Display States (optimiert)
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleTagCount, setVisibleTagCount] = useState(3); // Fallback für SSR
  const [containerWidth, setContainerWidth] = useState(0);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      console.log('=== FRONTEND: loadRecentClients() called ===');
      const clients = await clientApi.getRecentClients();
      console.log('=== FRONTEND: received clients:', clients);
      setRecentClients(clients || []);
    } catch (error) {
      console.error('=== FRONTEND: loadRecentClients() ERROR ===', error);
      // Stille Behandlung - normale Situation wenn noch keine Clients beraten wurden
    }
  };

  const handleStartConsultation = async (clientId: number, notes?: string) => {
    if (!selectedBranch) {
      toast.error(t('consultations.selectBranch'));
      return;
    }

    try {
      setIsStarting(true);
      
      // Zeitzone-korrigierte aktuelle Zeit (gleiche Logik wie bei stopConsultation)
      const correctedStartTime = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000);
      
      const consultation = await consultationApi.startConsultation({
        branchId: selectedBranch,
        clientId,
        notes: notes || '',
        startTime: correctedStartTime.toISOString()
      });

      setActiveConsultation(consultation);
      setNotes(notes || '');
      setSelectedClient(null);
      setIsClientSelectModalOpen(false);
      
      // Speichere den zuletzt gestarteten Client für Tag-Priorisierung
      setLastStartedClientId(clientId);
      
      // Sende Event für SavedFilterTags Aktualisierung
      window.dispatchEvent(new CustomEvent('consultationChanged'));
      
      // Entfernt: Frontend LRU-Logic - Backend sortiert bereits korrekt nach startTime DESC
      // Lade Recent Clients neu vom Server (Backend liefert bereits richtige Sortierung)
      loadRecentClients();
      
      // Callback für Parent-Komponente - übergebe die neue Consultation
      onConsultationChange?.(consultation);
      
      // Callback für Filter-Wechsel (wenn Client-Name verfügbar)
      if (onConsultationStarted && consultation.client?.name) {
        onConsultationStarted(consultation.client.name);
      }
      
      toast.success(t('consultations.started'));
    } catch (error) {
      console.error('Fehler beim Starten der Beratung:', error);
      toast.error(t('consultations.startError'));
    } finally {
      setIsStarting(false);
    }
  };

  const stopConsultation = async () => {
    try {
      const correctedEndTime = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000);
      
      const stoppedConsultation = await consultationApi.stopConsultation({
        endTime: correctedEndTime.toISOString(),
        notes: notes || undefined
      });
      setActiveConsultation(null);
      setNotes('');
      toast.success(t('consultations.stopped'));
      // Recent Clients nach dem Stoppen aktualisieren
      loadRecentClients();
      // Beratungsliste aktualisieren - übergebe die aktualisierte Consultation
      onConsultationChange?.(stoppedConsultation);
      // Sende Event für SavedFilterTags Aktualisierung
      console.log('🛑 ConsultationTracker: Sending consultationChanged event (stop)');
      window.dispatchEvent(new CustomEvent('consultationChanged'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('consultations.stopError'));
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setIsClientSelectModalOpen(false);
    if (!isManualEntry) {
      handleStartConsultation(client.id, notes);
    }
  };

  const handleCreateClient = () => {
    setIsClientSelectModalOpen(false);
    setIsCreateClientModalOpen(true);
  };

  const handleClientCreated = (client: Client) => {
    setIsCreateClientModalOpen(false);
    setSelectedClient(client);
    // Entfernt: Automatischer Beratungsstart nach Client-Erstellung
    // Client wird nur gespeichert, Beratung muss manuell gestartet werden
    
    // Recent Clients neu laden um den neuen Client anzuzeigen
    loadRecentClients();
    
    // Success-Toast für Client-Erstellung (wird bereits im Modal angezeigt)
    // toast.success(`Client "${client.name}" wurde angelegt`);
  };

  /* CLAUDE-ANCHOR: CONSULTATION-MANUAL-SAVE-001 - Timezone-sichere manuelle Beratungserfassung */
  const handleManualSave = async () => {
    if (!selectedClient) {
      toast.error('Bitte wählen Sie einen Client aus');
      return;
    }
    if (!manualStartTime || !manualEndTime) {
      toast.error('Bitte geben Sie Start- und Endzeit an');
      return;
    }
    if (!selectedBranch) {
      toast.error(t('consultations.selectBranch'));
      return;
    }

    try {
      setIsStarting(true);
      
      /* KRITISCHE TIMEZONE-BEHANDLUNG:
       * Problem: Inkonsistenz zwischen normaler und manueller Beratung!
       * 
       * NORMAL WORKING (✅):
       * const correctedTime = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000);
       * 
       * MANUAL BROKEN (❌):
       * convertDatetimeLocalToApi() führt zu 5h Versatz
       * 
       * LÖSUNG: Gleiche getTimezoneOffset-Logik für beide verwenden!
       * 
       * datetime-local Input: "2024-01-15T14:01"
       * → new Date("2024-01-15T14:01") erstellt lokales Date-Objekt
       * → getTimezoneOffset() korrigiert zur gleichen Zeit wie bei normaler Beratung
       * → KONSISTENTE Zeitbehandlung!
       */
      
      // ✅ KORRIGIERT: Verwende gleiche Logik wie bei normalem Start/Stop
      const manualStart = new Date(manualStartTime);
      const correctedStartTime = new Date(manualStart.getTime() - manualStart.getTimezoneOffset() * 60000);
      
      const manualEnd = new Date(manualEndTime);
      const correctedEndTime = new Date(manualEnd.getTime() - manualEnd.getTimezoneOffset() * 60000);
      
      // Starte die Beratung mit der korrigierten Startzeit
      const consultation = await consultationApi.startConsultation({
        branchId: selectedBranch,
        clientId: selectedClient.id,
        notes: notes || '',
        startTime: correctedStartTime.toISOString()  // ✅ Konsistent mit normaler Beratung
      });
      
      // Beende sie sofort mit der korrigierten Endzeit
      const stoppedConsultation = await consultationApi.stopConsultation({
        endTime: correctedEndTime.toISOString(),      // ✅ Konsistent mit normaler Beratung
        notes: notes || ''
      });
      
      // Reset der Eingaben
      setIsManualEntry(false);
      setManualStartTime('');
      setManualEndTime('');
      setNotes('');
      setSelectedClient(null);
      
      // Speichere den zuletzt gestarteten Client für Tag-Priorisierung
      setLastStartedClientId(selectedClient.id);
      
      // Sende Event für SavedFilterTags Aktualisierung
      console.log('🚀 ConsultationTracker: Sending consultationChanged event (start)');
      window.dispatchEvent(new CustomEvent('consultationChanged'));
      
      // Lade Recent Clients neu
      loadRecentClients();
      
      // Callback für Parent-Komponente - übergebe die beendete Consultation
      onConsultationChange?.(stoppedConsultation);
      
      // Callback für Filter-Wechsel
      if (onConsultationStarted && selectedClient.name) {
        onConsultationStarted(selectedClient.name);
      }
      
      toast.success(t('consultations.manualSaveSuccess'));
    } catch (error) {
      console.error('Fehler beim Erfassen der Beratung:', error);
      toast.error(t('consultations.manualSaveError'));
    } finally {
      setIsStarting(false);
    }
  };

  const updateNotes = async () => {
    if (!activeConsultation) return;
    
    try {
      await consultationApi.updateConsultationNotes(activeConsultation.id, { notes });
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

  // Recent Clients aktualisieren wenn Fenster wieder fokussiert wird
  useEffect(() => {
    const handleFocus = () => {
      loadRecentClients();
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Optimierte Tag-Breiten-Berechnung mit useMemo
  const averageTagWidth = useMemo(() => {
    if (recentClients.length === 0) return 85; // Reduzierter Fallback
    
    return recentClients.reduce((sum, client) => {
      // Präzisere Schätzung: ~6px pro Zeichen + 24px Padding
      return sum + (client.name.length * 6 + 24);
    }, 0) / recentClients.length;
  }, [recentClients]);

  // Optimierte Sichtbarkeits-Berechnung mit useCallback (vereinfacht ohne Dropdown)
  const calculateVisibleTags = useCallback(() => {
    if (!containerRef.current || recentClients.length === 0) return;

    const container = containerRef.current;
    const currentWidth = container.clientWidth;
    
    // Nur neu berechnen wenn sich die Breite signifikant geändert hat (>= 40px)
    if (Math.abs(currentWidth - containerWidth) < 40) return;
    
    setContainerWidth(currentWidth);
    
    // Moderate responsive Abstände für bessere Tag-Anzeige
    const isMobile = currentWidth < 768; // md breakpoint
    const PLUS_BUTTON_WIDTH = 32; // Reduziert von 42
    const GAPS_AND_MARGINS = isMobile ? 8 : 20; // Mobile: 8px, Desktop: 20px (weniger extrem)
    const BUFFER = 12; // Reduziert von 16
    
    const availableWidth = currentWidth - PLUS_BUTTON_WIDTH - GAPS_AND_MARGINS - BUFFER;
    
    // Berechne maximal mögliche Tags (einfach soviele wie reinpassen)
    const maxPossibleTags = Math.max(1, Math.floor(availableWidth / averageTagWidth));
    
    // Zeige soviele Tags wie reinpassen, maximal aber die verfügbaren
    setVisibleTagCount(Math.min(maxPossibleTags, recentClients.length));
  }, [recentClients, averageTagWidth, containerWidth]);

  // Debounced ResizeObserver für bessere Performance
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      calculateVisibleTags();
    }, 150); // 150ms Debounce für smooth responsive behavior
  }, [calculateVisibleTags]);

  // Optimierter ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);
    
    // Auch Window-Resize überwachen für bessere Abdeckung
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [handleResize]);

  // Initial calculation nach Client-Änderungen
  useLayoutEffect(() => {
    calculateVisibleTags();
  }, [calculateVisibleTags]);

  // Optimistische Tag-Anzeige für bessere UX
  const showOptimisticTags = recentClients.length === 0 && loading;
  const optimisticTags = useMemo(() => {
    if (!showOptimisticTags) return [];
    return Array(3).fill(null).map((_, i) => ({
      id: `placeholder-${i}`,
      name: '████████', // Placeholder
      isPlaceholder: true,
      status: undefined,
      lastConsultationDate: undefined
    }));
  }, [showOptimisticTags]);

  const displayTags = showOptimisticTags ? optimisticTags : recentClients;
  const currentVisibleCount = showOptimisticTags ? optimisticTags.length : visibleTagCount;

  // Sortiere displayTags: Zuletzt gestarteter Client zuerst
  const sortedDisplayTags = useMemo(() => {
    if (showOptimisticTags || !lastStartedClientId) {
      return displayTags;
    }
    
    // Finde den zuletzt gestarteten Client
    const lastStartedClient = displayTags.find(client => client.id === lastStartedClientId);
    if (!lastStartedClient) {
      return displayTags;
    }
    
    // Setze den zuletzt gestarteten Client an die erste Position
    const otherClients = displayTags.filter(client => client.id !== lastStartedClientId);
    return [lastStartedClient, ...otherClients];
  }, [displayTags, lastStartedClientId, showOptimisticTags]);

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
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center pl-2 sm:pl-0">
            <UserGroupIcon className="h-6 w-6 mr-2 sm:h-6 sm:w-6 sm:mr-2" />
            {t('consultations.trackerTitle')}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('consultations.activeWith')}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeConsultation.client?.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('consultations.startedAt')}: {formatTime(activeConsultation.startTime)}
              </p>
            </div>

            {/* Notizen-Bereich */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('consultations.notesForConsultation')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={updateNotes}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                rows={3}
                placeholder={t('consultations.notesPlaceholder')}
              />
            </div>

            <button
              onClick={stopConsultation}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <StopIcon className="h-5 w-5 mr-2" />
              {t('consultations.stop')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Zuletzt beratene Clients als Tags mit vereinfachtem responsive Layout (ohne Dropdown) */}
            {(sortedDisplayTags.length > 0) && !isManualEntry && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {sortedDisplayTags.some(c => !isPlaceholder(c) && c.status === 'planned') ? 
                    t('consultations.recentAndPlanned') : 
                    t('consultations.recent')
                  }
                </p>
                <div ref={containerRef} className="flex items-center gap-0.5 md:gap-6">
                  {/* Neuer Client Button - links positioniert mit extremen responsiven Abständen */}
                  <button
                    onClick={() => setIsCreateClientModalOpen(true)}
                    disabled={showOptimisticTags}
                    className={`bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm flex items-center justify-center flex-shrink-0 ${showOptimisticTags ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ width: '30.19px', height: '30.19px' }}
                    title={t('consultations.createClient')}
                    aria-label={t('consultations.createClient')}
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                  
                  {/* Soviele Client-Tags wie reinpassen (ohne Dropdown) */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {sortedDisplayTags.slice(0, currentVisibleCount).map((client, index) => {
                      const isPast = !isPlaceholder(client) && client.status === 'past';
                      const isPlanned = !isPlaceholder(client) && client.status === 'planned';
                      
                      return (
                        <button
                          key={client.id}
                          onClick={() => !isPlaceholder(client) && handleStartConsultation(Number(client.id), notes)}
                          disabled={isPlaceholder(client)}
                          className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium flex-shrink-0 transition-colors ${
                            isPlaceholder(client) 
                              ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 animate-pulse cursor-default'
                              : isPlanned
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/50 cursor-pointer border border-blue-200 dark:border-blue-700'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer'
                          }`}
                          title={
                            isPlaceholder(client) 
                              ? t('common.loading')
                              : isPlanned
                                ? t('consultations.plannedWith', { 
                                    clientName: client.name, 
                                    date: client.lastConsultationDate ? new Date(client.lastConsultationDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
                                  })
                                : t('consultations.startWith', { 
                                    clientName: client.name,
                                    date: client.lastConsultationDate ? new Date(client.lastConsultationDate).toLocaleDateString('de-DE') : ''
                                  })
                          }
                        >
                          {isPlanned && !isPlaceholder(client) && (
                            <svg className="h-3 w-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                            </svg>
                          )}
                          <span className="truncate max-w-[120px]">
                            {isPlaceholder(client) ? (
                              <span className="inline-block w-16 h-4 bg-gray-300 dark:bg-gray-500 rounded animate-pulse"></span>
                            ) : (
                              client.name
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Start-Buttons */}
            <div className="flex gap-6">
              <button
                onClick={() => setIsClientSelectModalOpen(true)}
                className="w-2/3 flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title={t('consultations.start')}
              >
                <PlayIcon className="h-5 w-5" />
              </button>

              <button
                onClick={() => {
                  setIsManualEntry(!isManualEntry);
                  setSelectedClient(null);
                  setManualStartTime('');
                  setManualEndTime('');
                  setNotes('');
                }}
                className={`w-1/3 flex items-center justify-center px-4 py-3 border text-base font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isManualEntry
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
                title={t('consultations.plan')}
              >
                <ClockIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Manuelle Erfassung / Planen */}
            {isManualEntry && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  {t('consultations.planConsultation')}
                </h3>
                
                {/* Client-Auswahl */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('consultations.columns.client')}
                  </label>
                  {selectedClient ? (
                    <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2">
                      <span className="text-sm text-gray-900 dark:text-white">{selectedClient.name}</span>
                      <button
                        onClick={() => setIsClientSelectModalOpen(true)}
                        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {t('consultations.change')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsClientSelectModalOpen(true)}
                      className="w-full text-left bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      {t('consultations.selectClientPlaceholder')}
                    </button>
                  )}
                </div>

                {/* Zeit-Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('consultations.columns.startTime')}
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
                      {t('consultations.columns.endTime')}
                    </label>
                    <input
                      type="datetime-local"
                      value={manualEndTime}
                      onChange={(e) => setManualEndTime(e.target.value)}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                {/* Notizen */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('consultations.columns.notes')}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    rows={2}
                    placeholder={t('consultations.optionalNotes')}
                  />
                </div>

                {/* Speichern-Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleManualSave}
                    disabled={!selectedClient || !manualStartTime || !manualEndTime}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('consultations.saveConsultation')}
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