import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserPlusIcon, FunnelIcon, PencilIcon } from '@heroicons/react/24/outline';
import { organizationService } from '../../services/organizationService.ts';
import { OrganizationJoinRequest } from '../../types/organization.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import useMessage from '../../hooks/useMessage.ts';
import FilterPane from '../FilterPane.tsx';
import { FilterCondition } from '../FilterRow.tsx';
import ProcessJoinRequestModal from './ProcessJoinRequestModal.tsx';

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

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Ausstehend';
    case 'approved':
      return 'Genehmigt';
    case 'rejected':
      return 'Abgelehnt';
    case 'withdrawn':
      return 'Zurückgezogen';
    default:
      return status;
  }
};

const JOIN_REQUESTS_TABLE_ID = 'join-requests-table';

const JoinRequestsList: React.FC = () => {
  const [joinRequests, setJoinRequests] = useState<OrganizationJoinRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isProcessModalOpen, setIsProcessModalOpen] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<OrganizationJoinRequest | null>(null);
  
  const { canViewJoinRequests, canManageJoinRequests, loading: permissionsLoading } = usePermissions();
  const { showMessage } = useMessage();
  const mountedRef = useRef(true);
  const hasInitialLoadRef = useRef(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Warte bis Berechtigungen geladen sind
    if (permissionsLoading) {
      return;
    }

    // Nur einmal beim initialen Load ausführen
    if (hasInitialLoadRef.current) {
      return;
    }

    // Prüfe Berechtigung direkt
    const hasPermission = canViewJoinRequests();
    if (!hasPermission) {
      setError('Keine Berechtigung zum Anzeigen der Beitrittsanfragen');
      setLoading(false);
      hasInitialLoadRef.current = true;
      return;
    }

    // Markiere als geladen, BEVOR der Request startet
    hasInitialLoadRef.current = true;
    
    const fetchJoinRequests = async () => {
      if (!mountedRef.current) return;
      
      try {
        setLoading(true);
        setError(null);
        const requests = await organizationService.getJoinRequests();
        
        if (!mountedRef.current) return;
        
        setJoinRequests(requests);
      } catch (err: any) {
        if (!mountedRef.current) return;
        
        const errorMessage = err.response?.data?.message || 'Fehler beim Laden der Beitrittsanfragen';
        setError(errorMessage);
        // showMessage nur außerhalb useEffect verwenden, um Re-Renders zu vermeiden
        // Verwende setTimeout, um es asynchron auszuführen
        setTimeout(() => {
          showMessage(errorMessage, 'error');
        }, 0);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchJoinRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsLoading]);

  const handleOpenProcessModal = (request: OrganizationJoinRequest) => {
    if (!canManageJoinRequests()) {
      const errorMessage = 'Keine Berechtigung zum Bearbeiten der Beitrittsanfragen';
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
    setStatusFilter('all');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (filterConditions.length > 0) count++;
    return count;
  };

  // Gefilterte Join-Requests
  const filteredJoinRequests = useMemo(() => {
    let filtered = [...joinRequests];

    // Status-Filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Weitere Filter aus FilterPane
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
    }
              return false;

            case 'message':
              const message = request.message?.toLowerCase() || '';
              const msgValue = String(value).toLowerCase();
              
              if (operator === 'contains') {
                return message.includes(msgValue);
              }
              return false;

            default:
              return true;
          }
        });
      }, filtered);
    }

    return filtered;
  }, [joinRequests, statusFilter, filterConditions]);

  if (permissionsLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow p-6 mb-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-700 dark:text-gray-300">Lade Berechtigungen...</span>
        </div>
      </div>
    );
  }

  if (!canViewJoinRequests()) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow p-6 mb-6">
      <div className="p-4 text-red-600 dark:text-red-400">
        Keine Berechtigung zum Anzeigen der Beitrittsanfragen.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow p-6 sm:p-6 mb-6">
      {/* Titelzeile mit Icon und Filter-Button */}
      <div className="flex items-center justify-between mb-4 sm:mb-4">
        <h2 className="text-xl sm:text-xl font-semibold flex items-center dark:text-white">
          <UserPlusIcon className="h-6 w-6 sm:h-6 sm:w-6 mr-2 sm:mr-2" />
          Beitrittsanfragen
        </h2>
        
        <div className="flex items-center gap-2">
          {/* Status-Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Alle Status</option>
            <option value="pending">Ausstehend</option>
            <option value="approved">Genehmigt</option>
            <option value="rejected">Abgelehnt</option>
            <option value="withdrawn">Zurückgezogen</option>
          </select>

          {/* Filter-Button */}
          <button
            className={`relative p-2 rounded-md border ${
              getActiveFilterCount() > 0
                ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            title="Filter"
          >
            <FunnelIcon className="h-5 w-5" />
            {getActiveFilterCount() > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 dark:bg-blue-500 text-white rounded-full text-xs flex items-center justify-center">
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
              { id: 'requester', label: 'Antragsteller' },
              { id: 'message', label: 'Nachricht' }
            ]}
            onApply={applyFilterConditions}
            onReset={resetFilterConditions}
            savedConditions={filterConditions}
            savedOperators={filterLogicalOperators}
            tableId={JOIN_REQUESTS_TABLE_ID}
          />
        </div>
      )}

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
          <span className="ml-3 text-gray-700 dark:text-gray-300">Lade Beitrittsanfragen...</span>
        </div>
      ) : filteredJoinRequests.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {joinRequests.length === 0 
            ? 'Keine Beitrittsanfragen vorhanden.'
            : 'Keine Beitrittsanfragen entsprechen den Filterkriterien.'}
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
                      {getStatusText(request.status)}
                    </span>
                  </div>

                  {request.message && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Nachricht:</span> {request.message}
                      </p>
                    </div>
                  )}

                  {request.response && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <span className="font-medium">Antwort:</span> {request.response}
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
                        Bearbeiten
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