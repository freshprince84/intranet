import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, ArrowPathIcon, FunnelIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { organizationService } from '../../services/organizationService.ts';
import { OrganizationJoinRequest } from '../../types/organization.ts';
import useMessage from '../../hooks/useMessage.ts';
import { API_ENDPOINTS } from '../../config/api.ts';
import FilterPane from '../FilterPane.tsx';
import SavedFilterTags from '../SavedFilterTags.tsx';
import { useFilterContext } from '../../contexts/FilterContext.tsx';
import { FilterCondition } from '../FilterRow.tsx';
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

const MY_JOIN_REQUESTS_TABLE_ID = 'my-join-requests-table';

const MyJoinRequestsList: React.FC = () => {
  const { t } = useTranslation();
  const [joinRequests, setJoinRequests] = useState<OrganizationJoinRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { showMessage } = useMessage();
  const mountedRef = useRef(true);
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);
  
  // Filter State Management (Controlled Mode)
  const [activeFilterName, setActiveFilterName] = useState<string>('Alle');
  const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    logger.log('MyJoinRequestsList: useEffect called - component mounted');
    
    // WICHTIG: State beim Mount zurücksetzen, um Caching zwischen Usern zu vermeiden
    logger.log('MyJoinRequestsList: Resetting state on mount to prevent data leaks');
    setJoinRequests([]);
    setError(null);
    setLoading(true);
    
    let isMounted = true;
    
    const fetchMyJoinRequests = async () => {
      if (!isMounted) {
        logger.log('MyJoinRequestsList: Component unmounted, skipping fetch');
        return;
      }
      
      logger.log('MyJoinRequestsList: Starting fetch');
      
      // Timeout nach 10 Sekunden
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          console.error('Request timeout after 10 seconds');
          setError('Anfrage dauert zu lange. Bitte Seite neu laden.');
          setLoading(false);
        }
      }, 10000);
      
      try {
        logger.log('MyJoinRequestsList: Setting loading to true');
        setLoading(true);
        setError(null);
        
        // Debug: Log die URL die aufgerufen wird
        logger.log('MyJoinRequestsList: Fetching my join requests from:', API_ENDPOINTS.ORGANIZATIONS.MY_JOIN_REQUESTS);
        
        const requests = await organizationService.getMyJoinRequests();
        
        logger.log('MyJoinRequestsList: Received requests:', requests);
        logger.log('MyJoinRequestsList: Requests type:', typeof requests);
        logger.log('MyJoinRequestsList: Requests isArray:', Array.isArray(requests));
        logger.log('MyJoinRequestsList: Requests length:', requests?.length || 0);
        
        // SICHERHEIT: Validiere, dass alle Anfragen wirklich Arrays sind
        if (!Array.isArray(requests)) {
          console.error('❌ MyJoinRequestsList: Response is not an array!', requests);
          throw new Error('Ungültige Antwort vom Server');
        }
        
        clearTimeout(timeoutId);
        
        // State immer setzen, auch wenn Component unmounted ist
        // (React kann den State trotzdem setzen, wenn Component wieder gemountet wird)
        if (isMounted) {
          logger.log('MyJoinRequestsList: Setting joinRequests state');
          setJoinRequests(requests);
          logger.log('MyJoinRequestsList: State updated with', requests.length, 'requests');
        } else {
          logger.log('MyJoinRequestsList: Component was unmounted, but setting state anyway');
          setJoinRequests(requests);
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        
        if (!isMounted) {
          logger.log('MyJoinRequestsList: Component unmounted during error, skipping error handling');
          return;
        }
        
        console.error('MyJoinRequestsList: Error fetching my join requests:', err);
        console.error('MyJoinRequestsList: Error response:', err.response);
        console.error('MyJoinRequestsList: Error status:', err.response?.status);
        console.error('MyJoinRequestsList: Error data:', err.response?.data);
        
        const errorMessage = err.response?.data?.message || err.message || t('myJoinRequests.loadError');
        setError(errorMessage);
        setTimeout(() => {
          showMessage(errorMessage, 'error');
        }, 0);
      } finally {
        if (isMounted) {
          logger.log('MyJoinRequestsList: Setting loading to false');
          setLoading(false);
        } else {
          // Auch wenn unmounted, loading auf false setzen
          logger.log('MyJoinRequestsList: Component unmounted, but setting loading to false anyway');
          setLoading(false);
        }
      }
    };

    // IMMER neu laden beim Mount (auch beim Tab-Wechsel zurück)
    fetchMyJoinRequests();
    
    return () => {
      logger.log('MyJoinRequestsList: useEffect cleanup - component unmounting');
      isMounted = false;
      mountedRef.current = false;
      // State beim Unmount zurücksetzen
      setJoinRequests([]);
      setError(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWithdraw = async (requestId: number) => {
    if (!window.confirm(t('myJoinRequests.confirmWithdraw'))) {
      return;
    }

    try {
      setWithdrawingId(requestId);
      await organizationService.withdrawJoinRequest(requestId);
      
      // Update local state
      setJoinRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, status: 'withdrawn' as const, processedAt: new Date().toISOString() }
            : req
        )
      );
      
      showMessage(t('myJoinRequests.withdrawSuccess'), 'success');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || t('myJoinRequests.withdrawError');
      showMessage(errorMessage, 'error');
    } finally {
      setWithdrawingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
  const handleFilterChange = async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setActiveFilterName(name);
    setSelectedFilterId(id);
    applyFilterConditions(conditions, operators);
  };

  const getActiveFilterCount = () => {
    return filterConditions.length;
  };

  // ✅ STANDARD: Filter-Laden und Default-Filter-Anwendung
  const filterContext = useFilterContext();
  const { loadFilters } = filterContext;
  
  useEffect(() => {
    const initialize = async () => {
      // 1. Filter laden (wartet auf State-Update)
      const filters = await loadFilters(MY_JOIN_REQUESTS_TABLE_ID);
      
      // 2. Default-Filter anwenden (IMMER vorhanden!)
      const defaultFilter = filters.find(f => f.name === 'Alle');
      if (defaultFilter) {
        await handleFilterChange(
          defaultFilter.name,
          defaultFilter.id,
          defaultFilter.conditions,
          defaultFilter.operators
        );
        return; // Filter wird angewendet
      }
      
      // 3. Fallback: Kein Filter (sollte nie passieren)
      // MyJoinRequestsList filtert client-seitig, daher keine Daten-Lade-Funktion nötig
    };
    
    initialize();
  }, [loadFilters, handleFilterChange]);

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
          API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(MY_JOIN_REQUESTS_TABLE_ID)
        );

        const existingFilters = existingFiltersResponse.data || [];
        const alleFilterExists = existingFilters.some((filter: any) => filter.name === 'Alle');

        // Erstelle "Alle"-Filter, wenn er noch nicht existiert
        if (!alleFilterExists) {
          const alleFilter = {
            tableId: MY_JOIN_REQUESTS_TABLE_ID,
            name: 'Alle',
            conditions: [],
            operators: []
          };

          await axiosInstance.post(
            API_ENDPOINTS.SAVED_FILTERS.BASE,
            alleFilter
          );
          logger.log('Alle-Filter für Meine Beitrittsanfragen erstellt');
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
        const orgName = (request.organization.displayName || request.organization.name || '').toLowerCase();
        const message = request.message?.toLowerCase() || '';
        return orgName.includes(searchLower) || message.includes(searchLower);
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
            case 'organization':
              const orgName = (request.organization.displayName || request.organization.name || '').toLowerCase();
              const searchValue = String(value).toLowerCase();
              
              if (operator === 'contains') {
                return orgName.includes(searchValue);
              } else if (operator === 'equals') {
                return orgName === searchValue;
              } else if (operator === 'startsWith') {
                return orgName.startsWith(searchValue);
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow p-6 mb-6">
      {/* Titelzeile mit Icon, Suchfeld, Filter-Button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold dark:text-white">
          {t('myJoinRequests.title')}
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
              { id: 'organization', label: t('myJoinRequests.filter.organization', { defaultValue: 'Organisation' }) },
              { id: 'message', label: t('joinRequestsList.filter.message') },
              { id: 'status', label: t('joinRequestsList.status.title', { defaultValue: 'Status' }) }
            ]}
            onApply={applyFilterConditions}
            onReset={resetFilterConditions}
            savedConditions={filterConditions}
            savedOperators={filterLogicalOperators}
            tableId={MY_JOIN_REQUESTS_TABLE_ID}
          />
        </div>
      )}

      {/* Gespeicherte Filter als Tags anzeigen */}
      <SavedFilterTags
        tableId={MY_JOIN_REQUESTS_TABLE_ID}
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
          <span className="ml-3 text-gray-700 dark:text-gray-300">{t('myJoinRequests.loading')}</span>
        </div>
      ) : joinRequests.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {t('myJoinRequests.noRequests')}
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
                        {request.organization.displayName || request.organization.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(request.createdAt)}
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

                  {request.processor && (
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {t('myJoinRequests.processedBy')}: {request.processor.firstName} {request.processor.lastName}
                      {request.processedAt && ` - ${formatDate(request.processedAt)}`}
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className="mt-4 flex items-center gap-2">
                      <button 
                        onClick={() => handleWithdraw(request.id)}
                        disabled={withdrawingId === request.id}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-md dark:bg-red-700 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={withdrawingId === request.id ? t('myJoinRequests.withdrawing') : t('myJoinRequests.withdraw')}
                      >
                        {withdrawingId === request.id ? (
                          <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        ) : (
                          <ArrowUturnLeftIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyJoinRequestsList;

