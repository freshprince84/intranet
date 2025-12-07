import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlusIcon, FunnelIcon, PencilIcon } from '@heroicons/react/24/outline';
import { organizationService } from '../../services/organizationService.ts';
import { OrganizationJoinRequest } from '../../types/organization.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import useMessage from '../../hooks/useMessage.ts';
import FilterPane from '../FilterPane.tsx';
import SavedFilterTags from '../SavedFilterTags.tsx';
import { FilterCondition } from '../FilterRow.tsx';
import ProcessJoinRequestModal from './ProcessJoinRequestModal.tsx';
import { API_ENDPOINTS } from '../../config/api.ts';
import axiosInstance from '../../config/axios.ts';
import { logger } from '../../utils/logger.ts';

// Status-Badge Funktionen
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'approved':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'rejected':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'withdrawn':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

const getStatusText = (status: string, t: any) => {
  switch (status) {
    case 'pending':
      return t('joinRequestsList.status.pending');
    case 'approved':
      return t('joinRequestsList.status.approved');
    case 'rejected':
      return t('joinRequestsList.status.rejected');
    case 'withdrawn':
      return t('joinRequestsList.status.withdrawn');
    default:
      return status;
  }
};

const JOIN_REQUESTS_TABLE_ID = 'join-requests-table';

const JoinRequestsList: React.FC = () => {
  const { t } = useTranslation();
  const [joinRequests, setJoinRequests] = useState<OrganizationJoinRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isProcessModalOpen, setIsProcessModalOpen] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<OrganizationJoinRequest | null>(null);
  
  // Filter State Management (Controlled Mode)
  const [activeFilterName, setActiveFilterName] = useState<string>('Alle');
  const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);
  
  const { canViewJoinRequests, canManageJoinRequests, loading: permissionsLoading } = usePermissions();
  const { showMessage } = useMessage();
  const mountedRef = useRef(true);
  const hasInitialLoadRef = useRef(false);

  // Debug: Log permissionsLoading Änderungen
  useEffect(() => {
    logger.log('[JoinRequestsList] permissionsLoading geändert:', permissionsLoading);
  }, [permissionsLoading]);

  // Reset beim Mount - wichtig für Neuladen wenn Komponente neu gemountet wird
  useEffect(() => {
    logger.log('[JoinRequestsList] Component mounted, reset hasInitialLoadRef');
    hasInitialLoadRef.current = false;
    mountedRef.current = true;
    
    return () => {
      logger.log('[JoinRequestsList] Component unmounting');
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    logger.log('[JoinRequestsList] useEffect triggered', { 
      permissionsLoading, 
      hasInitialLoad: hasInitialLoadRef.current,
      joinRequestsCount: joinRequests.length 
    });
    
    // Warte bis Berechtigungen geladen sind
    if (permissionsLoading) {
      logger.log('[JoinRequestsList] Warte auf Berechtigungen...');
      return;
    }

    // Prüfe Berechtigung direkt
    const hasPermission = canViewJoinRequests();
    logger.log('[JoinRequestsList] Berechtigung geprüft:', hasPermission);
    
    if (!hasPermission) {
      logger.log('[JoinRequestsList] Keine Berechtigung zum Anzeigen');
      setError(t('joinRequestsList.noPermission'));
      setLoading(false);
      hasInitialLoadRef.current = true;
      return;
    }

    // WICHTIG: Nur laden wenn noch nicht erfolgreich geladen wurde
    // Das verhindert unnötige Re-Fetches bei jedem permissionsLoading-Change
    if (hasInitialLoadRef.current) {
      logger.log('[JoinRequestsList] Bereits geladen, überspringe Fetch');
      return;
    }

    logger.log('[JoinRequestsList] Starte Fetch der Join Requests...');
    
    const fetchJoinRequests = async () => {
      if (!mountedRef.current) {
        logger.log('[JoinRequestsList] Component unmounted, breche ab');
        return;
      }
      
      try {
        logger.log('[JoinRequestsList] Setze loading auf true');
        setLoading(true);
        setError(null);
        
        logger.log('[JoinRequestsList] Rufe organizationService.getJoinRequests() auf...');
        logger.log('[JoinRequestsList] API Endpoint:', API_ENDPOINTS.ORGANIZATIONS.JOIN_REQUESTS);
        
        const requests = await organizationService.getJoinRequests();
        
        logger.log('[JoinRequestsList] Antwort erhalten:', requests);
        logger.log('[JoinRequestsList] Antwort Typ:', typeof requests);
        logger.log('[JoinRequestsList] Ist Array:', Array.isArray(requests));
        logger.log('[JoinRequestsList] Ist null/undefined:', requests === null || requests === undefined);
        
        if (!mountedRef.current) {
          logger.log('[JoinRequestsList] Component während Request unmounted');
          return;
        }
        
        // Validiere, dass die Antwort vorhanden ist
        if (requests === null || requests === undefined) {
          console.error('[JoinRequestsList] ❌ Antwort ist null oder undefined!');
          throw new Error('Ungültige Antwort vom Server: Antwort ist null oder undefined');
        }
        
        // Validiere, dass die Antwort ein Array ist
        if (!Array.isArray(requests)) {
          console.error('[JoinRequestsList] ❌ Antwort ist kein Array!', requests);
          throw new Error('Ungültige Antwort vom Server: Erwartetes Array, erhalten: ' + typeof requests);
        }
        
        logger.log('[JoinRequestsList] ✅ Setze', requests.length, 'Join Requests');
        setJoinRequests(requests);
        setError(null); // Fehler zurücksetzen bei Erfolg
        hasInitialLoadRef.current = true; // Nur bei Erfolg setzen
      } catch (err: any) {
        console.error('[JoinRequestsList] ❌ Fehler beim Laden:', err);
        console.error('[JoinRequestsList] Fehler Details:', {
          message: err.message,
          response: err.response,
          status: err.response?.status,
          data: err.response?.data,
          stack: err.stack
        });
        
        if (!mountedRef.current) {
          logger.log('[JoinRequestsList] Component während Error-Handling unmounted');
          return;
        }
        
        const errorMessage = err.response?.data?.message || err.message || t('joinRequestsList.loadError', { defaultValue: 'Fehler beim Laden der Beitrittsanfragen' });
        logger.log('[JoinRequestsList] Zeige Fehlermeldung:', errorMessage);
        setError(errorMessage);
        // showMessage nur außerhalb useEffect verwenden, um Re-Renders zu vermeiden
        // Verwende setTimeout, um es asynchron auszuführen
        setTimeout(() => {
          showMessage(errorMessage, 'error');
        }, 0);
        // Bei Fehler NICHT hasInitialLoadRef setzen, damit bei nächstem permissionsLoading-Change neu geladen wird
      } finally {
        if (mountedRef.current) {
          logger.log('[JoinRequestsList] Setze loading auf false');
          setLoading(false);
        }
      }
    };

    fetchJoinRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsLoading]); // canViewJoinRequests ist eine Funktion, nicht als Dependency

  const handleOpenProcessModal = (request: OrganizationJoinRequest) => {
    if (!canManageJoinRequests()) {
      const errorMessage = t('joinRequestsList.noPermissionEdit');
      setError(errorMessage);
      showMessage(errorMessage, 'error');
      return;
    }
    setSelectedRequest(request);
    setIsProcessModalOpen(true);
  };

  const handleProcessSuccess = async () => {
    // Neulade die Liste nach erfolgreicher Bearbeitung
    // Reset das Flag, damit neu geladen werden kann
    hasInitialLoadRef.current = false;
    
    try {
      setLoading(true);
      const requests = await organizationService.getJoinRequests();
      setJoinRequests(requests);
      setError(null);
      hasInitialLoadRef.current = true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Fehler beim Laden der Beitrittsanfragen';
      setError(errorMessage);
      hasInitialLoadRef.current = true;
    } finally {
      setLoading(false);
    }
  };

  // Filter-Funktionen
  const applyFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setFilterConditions(conditions);
    setFilterLogicalOperators(operators);
  };

  const resetFilterConditions = () => {
    setFilterConditions([]);
    setFilterLogicalOperators([]);
    setActiveFilterName('');
    setSelectedFilterId(null);
  };

  // Filter Change Handler (Controlled Mode)
  const handleFilterChange = (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setActiveFilterName(name);
    setSelectedFilterId(id);
    applyFilterConditions(conditions, operators);
  };

  const getActiveFilterCount = () => {
    return filterConditions.length;
  };

  // Initialer Default-Filter setzen (Controlled Mode)
  useEffect(() => {
    const setInitialFilter = async () => {
      try {
        const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(JOIN_REQUESTS_TABLE_ID));
        const filters = response.data;
        
        const alleFilter = filters.find((filter: any) => filter.name === 'Alle');
        if (alleFilter) {
          setActiveFilterName('Alle');
          setSelectedFilterId(alleFilter.id);
          applyFilterConditions(alleFilter.conditions, alleFilter.operators);
        }
      } catch (error) {
        console.error('Fehler beim Setzen des initialen Filters:', error);
      }
    };

    setInitialFilter();
  }, []);

  // Standard-Filter erstellen und speichern
  useEffect(() => {
    const createStandardFilters = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.error('Nicht authentifiziert');
          return;
        }

        // Prüfen, ob die Standard-Filter bereits existieren
        const existingFiltersResponse = await axiosInstance.get(
          API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(JOIN_REQUESTS_TABLE_ID)
        );

        const existingFilters = existingFiltersResponse.data || [];
        const alleFilterExists = existingFilters.some((filter: any) => filter.name === 'Alle');

        // Erstelle "Alle"-Filter, wenn er noch nicht existiert
        if (!alleFilterExists) {
          const alleFilter = {
            tableId: JOIN_REQUESTS_TABLE_ID,
            name: 'Alle',
            conditions: [],
            operators: []
          };

          await axiosInstance.post(
            API_ENDPOINTS.SAVED_FILTERS.BASE,
            alleFilter
          );
          logger.log('Alle-Filter für Join Requests erstellt');
        }
      } catch (error) {
        console.error('Fehler beim Erstellen der Standard-Filter:', error);
      }
    };

    createStandardFilters();
  }, []);

  // Gefilterte Join-Requests
  const filteredJoinRequests = useMemo(() => {
    let filtered = [...joinRequests];

    // Suchfeld-Filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(request => {
        const requesterName = `${request.requester.firstName} ${request.requester.lastName}`.toLowerCase();
        const requesterEmail = request.requester.email?.toLowerCase() || '';
        const message = request.message?.toLowerCase() || '';
        return requesterName.includes(searchLower) || requesterEmail.includes(searchLower) || message.includes(searchLower);
      });
    }

    // Filter-Bedingungen aus FilterPane
    if (filterConditions.length > 0) {
      filtered = filterConditions.reduce((acc, condition, index) => {
        if (!condition.column || condition.value === null || condition.value === '') {
          return acc;
        }

        const operator = condition.operator;
        const value = condition.value;

        return acc.filter(request => {
          switch (condition.column) {
            case 'requester':
              const requesterName = `${request.requester.firstName} ${request.requester.lastName}`.toLowerCase();
              const requesterEmail = request.requester.email?.toLowerCase() || '';
              const searchValue = String(value).toLowerCase();
              
              if (operator === 'contains') {
                return requesterName.includes(searchValue) || requesterEmail.includes(searchValue);
              } else if (operator === 'equals') {
                return requesterName === searchValue || requesterEmail === searchValue;
              } else if (operator === 'startsWith') {
                return requesterName.startsWith(searchValue) || requesterEmail.startsWith(searchValue);
    }
              return false;

            case 'message':
              const message = request.message?.toLowerCase() || '';
              const msgValue = String(value).toLowerCase();
              
              if (operator === 'contains') {
                return message.includes(msgValue);
              } else if (operator === 'equals') {
                return message === msgValue;
              } else if (operator === 'startsWith') {
                return message.startsWith(msgValue);
              }
              return false;

            case 'status':
              if (operator === 'equals') {
                return request.status === value;
              }
              return false;

            default:
              return true;
          }
        });
      }, filtered);
    }

    return filtered;
  }, [joinRequests, searchTerm, filterConditions, filterLogicalOperators]);

  if (permissionsLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow p-6 mb-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-700 dark:text-gray-300">{t('joinRequestsList.loadingPermissions')}</span>
        </div>
      </div>
    );
  }

  if (!canViewJoinRequests()) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow p-6 mb-6">
      <div className="p-4 text-red-600 dark:text-red-400">
        {t('joinRequestsList.noPermission')}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow p-6 sm:p-6 mb-6">
      {/* Titelzeile mit Icon, Suchfeld, Filter-Button */}
      <div className="flex items-center justify-between mb-4 sm:mb-4">
        <h2 className="text-xl sm:text-xl font-semibold flex items-center dark:text-white">
          <UserPlusIcon className="h-6 w-6 sm:h-6 sm:w-6 mr-2 sm:mr-2" />
          {t('joinRequestsList.title')}
        </h2>
        
        <div className="flex items-center gap-1.5">
          {/* Suchfeld */}
          <input
            type="text"
            placeholder={t('common.search', { defaultValue: 'Suchen...' })}
            className="w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {/* Filter-Button */}
          <button
            className={`p-2 rounded-md border ${getActiveFilterCount() > 0 ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'} relative`}
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            title={t('common.filter')}
          >
            <FunnelIcon className="h-5 w-5" />
            {getActiveFilterCount() > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 dark:bg-blue-500 text-white rounded-full text-xs flex items-center justify-center">
                {getActiveFilterCount()}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter-Panel */}
      {isFilterPanelOpen && (
        <div className="mb-4">
          <FilterPane
            columns={[
              { id: 'requester', label: t('joinRequestsList.filter.requester') },
              { id: 'message', label: t('joinRequestsList.filter.message') },
              { id: 'status', label: t('joinRequestsList.status.title', { defaultValue: 'Status' }) }
            ]}
            onApply={applyFilterConditions}
            onReset={resetFilterConditions}
            savedConditions={filterConditions}
            savedOperators={filterLogicalOperators}
            tableId={JOIN_REQUESTS_TABLE_ID}
          />
        </div>
      )}

      {/* Gespeicherte Filter als Tags anzeigen */}
      <SavedFilterTags
        tableId={JOIN_REQUESTS_TABLE_ID}
        onSelectFilter={applyFilterConditions}
        onReset={resetFilterConditions}
        activeFilterName={activeFilterName}
        selectedFilterId={selectedFilterId}
        onFilterChange={handleFilterChange}
        defaultFilterName="Alle"
      />

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-700 dark:text-gray-300">{t('joinRequestsList.loading')}</span>
        </div>
      ) : filteredJoinRequests.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {joinRequests.length === 0 
            ? t('joinRequestsList.noRequests')
            : t('joinRequestsList.noMatching')}
        </div>
      ) : (
        /* Cards für Join-Requests */
        <div className="space-y-4">
          {filteredJoinRequests.map(request => (
            <div
              key={request.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {request.requester.firstName} {request.requester.lastName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {request.requester.email}
              </p>
                    </div>
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)}`}>
                      {getStatusText(request.status, t)}
                    </span>
                  </div>

                  {request.message && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{t('joinRequestsList.filter.message')}:</span> {request.message}
                      </p>
                    </div>
                  )}

                  {request.response && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <span className="font-medium">{t('joinRequestsList.response')}:</span> {request.response}
                      </p>
                    </div>
                  )}

              {request.status === 'pending' && canManageJoinRequests() && (
                    <div className="mt-4 flex items-center gap-2">
                  <button 
                        onClick={() => handleOpenProcessModal(request)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md dark:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        {t('joinRequestsList.edit')}
                  </button>
                </div>
              )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Process Join Request Modal */}
      <ProcessJoinRequestModal
        isOpen={isProcessModalOpen}
        onClose={() => {
          setIsProcessModalOpen(false);
          setSelectedRequest(null);
        }}
        joinRequest={selectedRequest}
        onSuccess={handleProcessSuccess}
      />
    </div>
  );
};

export default JoinRequestsList; 