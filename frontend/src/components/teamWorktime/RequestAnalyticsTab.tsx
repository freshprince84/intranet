import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { API_ENDPOINTS } from '../../config/api.ts';
import { format } from 'date-fns';
import { 
  FunnelIcon,
  Squares2X2Icon,
  TableCellsIcon,
  DocumentTextIcon,
  UserIcon,
  BuildingOfficeIcon,
  ClockIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import FilterPane from '../FilterPane.tsx';
import SavedFilterTags from '../SavedFilterTags.tsx';
import { useFilterContext } from '../../contexts/FilterContext.tsx';
import { FilterCondition } from '../FilterRow.tsx';
import DataCard, { MetadataItem } from '../shared/DataCard.tsx';
import CardGrid from '../shared/CardGrid.tsx';
import { useTableSettings } from '../../hooks/useTableSettings.ts';
import { useAuth } from '../../hooks/useAuth.tsx';

interface RequestAnalyticsTabProps {
  selectedDate?: string; // Optional für Rückwärtskompatibilität
}

interface StatusHistoryItem {
  id: number;
  oldStatus: string | null;
  newStatus: string;
  changedAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  };
}

interface Request {
  id: number;
  title: string;
  status: string;
  requester: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  };
  responsible: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  };
  branch: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  deletedBy?: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  } | null;
  statusHistory?: StatusHistoryItem[];
}

// TableID für gespeicherte Filter
const REQUEST_ANALYTICS_TABLE_ID = 'request-analytics-table';

// Standardreihenfolge der Spalten
const defaultColumnOrder = ['time', 'title', 'status', 'requester', 'responsible', 'branch', 'deletedAt'];

const RequestAnalyticsTab: React.FC<RequestAnalyticsTabProps> = ({ selectedDate }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Expandierte Requests für Status-Historie
  const [expandedRequests, setExpandedRequests] = useState<Set<number>>(new Set());
  
  const toggleRequestExpand = (requestId: number) => {
    setExpandedRequests(prev => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  };
  
  // Filter State Management (Controlled Mode)
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
  const [activeFilterName, setActiveFilterName] = useState<string>('');
  const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  
  // Table Settings
  const {
    settings,
    isLoading: isLoadingSettings,
    updateColumnOrder,
    updateHiddenColumns,
    toggleColumnVisibility,
    isColumnVisible,
    updateViewMode
  } = useTableSettings(REQUEST_ANALYTICS_TABLE_ID, {
    defaultColumnOrder,
    defaultViewMode: 'table'
  });

  // Abgeleitete Werte aus Settings
  const columnOrder = settings?.columnOrder || defaultColumnOrder;
  const hiddenColumns = settings?.hiddenColumns || [];
  const visibleColumnIds = columnOrder.filter(id => !hiddenColumns.includes(id));
  const savedViewMode = settings?.viewMode || 'table';
  
  // View Mode - initialisiere aus Settings, falls vorhanden
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(savedViewMode);
  
  // View Mode synchronisieren mit Settings
  useEffect(() => {
    if (settings?.viewMode && settings.viewMode !== viewMode) {
      setViewMode(settings.viewMode);
    }
  }, [settings?.viewMode]);

  // Verfügbare Spalten für Filter und Table Settings
  const availableColumns = useMemo(() => [
    { id: 'time', label: t('analytics.request.columns.time') },
    { id: 'title', label: t('analytics.request.columns.title') },
    { id: 'status', label: t('analytics.request.columns.status') },
    { id: 'requester', label: t('analytics.request.columns.requester') },
    { id: 'responsible', label: t('analytics.request.columns.responsible') },
    { id: 'branch', label: t('analytics.request.columns.branch') },
    { id: 'deletedAt', label: t('analytics.request.columns.deletedAt', { defaultValue: 'Gelöscht am' }) }
  ], [t]);

  // Lade Requests
  useEffect(() => {
    // ✅ PHASE 8: Memory Leak Prevention - AbortController
    const abortController = new AbortController();
    
    const fetchRequests = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params: any = {};
        
        // Unterstütze selectedDate für Rückwärtskompatibilität
        if (selectedDate) {
          params.date = selectedDate;
        } else {
          // Standard: Diese Woche, wenn kein selectedDate vorhanden
          params.period = 'week';
        }
        
        // Filter-Bedingungen als JSON-String senden
        if (selectedFilterId) {
          params.filterId = selectedFilterId;
        } else if (filterConditions.length > 0) {
          params.filterConditions = JSON.stringify({
            conditions: filterConditions,
            operators: filterLogicalOperators
          });
        }
        
        const response = await axiosInstance.get(API_ENDPOINTS.TEAM_WORKTIME.ANALYTICS.REQUESTS_CHRONOLOGICAL, {
          params,
          signal: abortController.signal
        });
        
        setRequests(response.data || []);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error loading requests:', error);
          setError(t('analytics.request.loadError'));
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchRequests();
    
    // ✅ PHASE 8: Memory Leak Prevention - Cleanup
    return () => {
      abortController.abort();
    };
  }, [selectedDate, filterConditions, filterLogicalOperators, selectedFilterId, t]);

  // Filter-Handler
  const applyFilterConditions = useCallback((conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setFilterConditions(conditions);
    setFilterLogicalOperators(operators);
    setIsFilterPanelOpen(false);
  }, []);

  const resetFilterConditions = useCallback(() => {
    setFilterConditions([]);
    setFilterLogicalOperators([]);
    setActiveFilterName('');
    setSelectedFilterId(null);
  }, []);

  const handleFilterChange = useCallback(async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setActiveFilterName(name);
    setSelectedFilterId(id);
    applyFilterConditions(conditions, operators);
  }, [applyFilterConditions]);
  
  // ✅ STANDARD: Filter-Laden und Default-Filter-Anwendung
  const filterContext = useFilterContext();
  const { loadFilters } = filterContext;
  
  useEffect(() => {
    const initialize = async () => {
      if (!user) return; // Warten auf User
      
      // 1. Filter laden (wartet auf State-Update)
      const filters = await loadFilters(REQUEST_ANALYTICS_TABLE_ID);
      
      // 2. Default-Filter anwenden: Filter für aktuellen Benutzer
      // Filter-Name = `${user.firstName} ${user.lastName}` oder `user.username`
      const userFilterName = `${user.firstName} ${user.lastName}`.trim() || user.username;
      const defaultFilter = filters.find(f => f.name === userFilterName) || filters.find(f => f.name === 'Alle');
      
      if (defaultFilter) {
        await handleFilterChange(
          defaultFilter.name,
          defaultFilter.id,
          defaultFilter.conditions,
          defaultFilter.operators
        );
        return; // Filter wird angewendet (fetchRequests wird durch filterConditions-Änderung ausgelöst)
      }
      
      // 3. Fallback: Kein Filter (sollte nie passieren)
      // fetchRequests wird automatisch durch filterConditions-Änderung aufgerufen
    };
    
    if (user) {
    initialize();
    }
  }, [loadFilters, handleFilterChange, user]);

  const getActiveFilterCount = useCallback(() => {
    return filterConditions.filter(c => c.column !== '' && c.value !== null).length;
  }, [filterConditions]);

  // Status-Funktionen
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'approval':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'denied':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'to_improve':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      approved: t('analytics.request.status.approved'),
      approval: t('analytics.request.status.approval'),
      denied: t('analytics.request.status.denied'),
      to_improve: t('analytics.request.status.to_improve')
    };
    return labels[status] || status;
  };

  // Gefilterte und durchsuchte Requests
  const filteredRequests = useMemo(() => {
    let filtered = [...requests];

    // Textsuche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(request =>
        request.title.toLowerCase().includes(searchLower) ||
        request.branch.name.toLowerCase().includes(searchLower) ||
        `${request.requester.firstName} ${request.requester.lastName}`.toLowerCase().includes(searchLower) ||
        `${request.responsible.firstName} ${request.responsible.lastName}`.toLowerCase().includes(searchLower)
      );
    }

    // Filter-Bedingungen (Frontend-Filterung für Spalten, die Backend nicht unterstützt)
    filterConditions.forEach((condition) => {
      if (condition.column === '' || condition.value === null) return;
      
      const operator = condition.operator || 'equals';
      const value = condition.value;

      filtered = filtered.filter(request => {
        switch (condition.column) {
          case 'status':
            if (operator === 'equals') {
              return request.status === value;
            }
            return true;
          case 'title':
            if (operator === 'contains') {
              return request.title.toLowerCase().includes(String(value).toLowerCase());
            }
            return true;
          default:
            return true;
        }
      });
    });

    return filtered;
  }, [requests, searchTerm, filterConditions]);

  // Statistiken
  const stats = useMemo(() => ({
    total: filteredRequests.length,
    approved: filteredRequests.filter(r => r.status === 'approved').length,
    pending: filteredRequests.filter(r => r.status === 'approval').length,
    denied: filteredRequests.filter(r => r.status === 'denied').length,
    toImprove: filteredRequests.filter(r => r.status === 'to_improve').length
  }), [filteredRequests]);

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 request-analytics-wrapper">
      {/* Titelzeile */}
      <div className="flex items-center justify-between mb-4 px-3 sm:px-4 md:px-6">
        {/* Linke Seite: Titel mit Icon */}
        <div className="flex items-center">
          <DocumentTextIcon className="h-6 w-6 mr-2 dark:text-white" />
          <h2 className="text-xl font-semibold dark:text-white">{t('analytics.request.title')}</h2>
        </div>
        
        {/* Rechte Seite: Suchfeld, View-Mode Toggle, Filter-Button */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder={t('common.searchPlaceholder')}
            className="w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          {/* View-Mode Toggle */}
          <button
            className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
              viewMode === 'cards' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''
            }`}
            onClick={() => {
              const newMode = viewMode === 'table' ? 'cards' : 'table';
              setViewMode(newMode);
              if (updateViewMode) {
                updateViewMode(newMode);
              }
            }}
            title={viewMode === 'table' ? t('common.viewAsCards') : t('common.viewAsTable')}
          >
            {viewMode === 'table' ? (
              <Squares2X2Icon className="h-5 w-5" />
            ) : (
              <TableCellsIcon className="h-5 w-5" />
            )}
          </button>
          
          {/* Filter-Button */}
          <button
            className={`p-2 rounded-md ${getActiveFilterCount() > 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} ml-1 relative`}
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            title={t('common.filter')}
            style={{ position: 'relative' }}
          >
            <FunnelIcon className="h-5 w-5" />
            {getActiveFilterCount() > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 dark:bg-blue-500 text-white rounded-full text-xs flex items-center justify-center z-10">
                {getActiveFilterCount()}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter-Pane */}
      {isFilterPanelOpen && (
        <div className={viewMode === 'cards' ? '-mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6' : 'px-3 sm:px-4 md:px-6'}>
          <FilterPane
          columns={availableColumns}
          onApply={applyFilterConditions}
          onReset={resetFilterConditions}
          savedConditions={filterConditions}
          savedOperators={filterLogicalOperators}
          tableId={REQUEST_ANALYTICS_TABLE_ID}
        />
        </div>
      )}
      
      {/* Gespeicherte Filter als Tags */}
      <div className={viewMode === 'cards' ? '-mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6' : 'px-3 sm:px-4 md:px-6'}>
        <SavedFilterTags
        tableId={REQUEST_ANALYTICS_TABLE_ID}
        onSelectFilter={applyFilterConditions}
        onReset={resetFilterConditions}
        activeFilterName={activeFilterName}
        selectedFilterId={selectedFilterId}
        onFilterChange={handleFilterChange}
        defaultFilterName="Alle" // ✅ FIX: Hardcodiert (konsistent mit DB)
      />
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('analytics.request.stats.total')}</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="text-sm text-green-600 dark:text-green-400">{t('analytics.request.status.approved')}</div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.approved}</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="text-sm text-yellow-600 dark:text-yellow-400">{t('analytics.request.status.approval')}</div>
          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.pending}</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <div className="text-sm text-red-600 dark:text-red-400">{t('analytics.request.status.denied')}</div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.denied}</div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
          <div className="text-sm text-orange-600 dark:text-orange-400">{t('analytics.request.status.to_improve')}</div>
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.toImprove}</div>
        </div>
      </div>

      {/* Content: Tabelle oder Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500 dark:text-gray-400">{t('analytics.request.loading')}</div>
        </div>
      ) : viewMode === 'table' ? (
        /* Tabellen-Ansicht */
        <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {columnOrder.filter(id => visibleColumnIds.includes(id)).map((columnId) => {
                  const column = availableColumns.find(c => c.id === columnId);
                  return column ? (
                    <th
                      key={columnId}
                      className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {column.label}
                    </th>
                  ) : null;
                })}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={columnOrder.filter(id => visibleColumnIds.includes(id)).length} className="px-3 sm:px-4 md:px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    {t('analytics.request.noRequestsForDate')}
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => {
                  const isExpanded = expandedRequests.has(request.id);
                  const hasStatusHistory = request.statusHistory && request.statusHistory.length > 0;
                  
                  return (
                    <React.Fragment key={request.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    {columnOrder.filter(id => visibleColumnIds.includes(id)).map((columnId) => {
                      switch (columnId) {
                        case 'time':
                          return (
                            <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {format(new Date(request.createdAt), 'HH:mm')}
                            </td>
                          );
                        case 'title':
                          return (
                            <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                  <div className="flex items-center gap-2">
                                    {hasStatusHistory && (
                                      <div className="relative group">
                                        <button
                                          onClick={() => toggleRequestExpand(request.id)}
                                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        >
                                          {isExpanded ? (
                                            <ChevronUpIcon className="h-4 w-4" />
                                          ) : (
                                            <ChevronDownIcon className="h-4 w-4" />
                                          )}
                                        </button>
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                          Status-Historie anzeigen
                                        </div>
                                      </div>
                                    )}
                                    <span>{request.title}</span>
                                  </div>
                            </td>
                          );
                        case 'status':
                          return (
                            <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                                {getStatusLabel(request.status)}
                              </span>
                            </td>
                          );
                        case 'requester':
                          return (
                            <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {request.requester.firstName} {request.requester.lastName}
                            </td>
                          );
                        case 'responsible':
                          return (
                            <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {request.responsible.firstName} {request.responsible.lastName}
                            </td>
                          );
                        case 'branch':
                          return (
                            <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {request.branch.name}
                            </td>
                          );
                            case 'deletedAt':
                              return (
                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {request.deletedAt ? (
                                    <div className="flex items-center gap-2">
                                      <TrashIcon className="h-4 w-4 text-red-500" />
                                      <span>{format(new Date(request.deletedAt), 'dd.MM.yyyy HH:mm')}</span>
                                      {request.deletedBy && (
                                        <span className="text-gray-400">
                                          ({request.deletedBy.firstName} {request.deletedBy.lastName})
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                              );
                        default:
                          return null;
                      }
                    })}
                  </tr>
                      {/* Status-Historie Zeile */}
                      {isExpanded && hasStatusHistory && (
                        <tr className="bg-gray-50 dark:bg-gray-800/50">
                          <td colSpan={columnOrder.filter(id => visibleColumnIds.includes(id)).length} className="px-3 sm:px-4 md:px-6 py-4">
                            <div className="ml-4 border-l-2 border-blue-200 dark:border-blue-700 pl-4">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                <ArrowPathIcon className="h-4 w-4" />
                                Status-Wechsel
                              </h4>
                              <div className="space-y-2">
                                {request.statusHistory!.map((historyItem) => (
                                  <div key={historyItem.id} className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">
                                      {format(new Date(historyItem.changedAt), 'HH:mm:ss')}
                                    </span>
                                    <span className="text-gray-400">→</span>
                                    <span className={`px-2 py-1 rounded-full ${getStatusColor(historyItem.oldStatus || 'approval')}`}>
                                      {getStatusLabel(historyItem.oldStatus || 'approval')}
                                    </span>
                                    <span className="text-gray-400">→</span>
                                    <span className={`px-2 py-1 rounded-full ${getStatusColor(historyItem.newStatus)}`}>
                                      {getStatusLabel(historyItem.newStatus)}
                                    </span>
                                    <span className="text-gray-400">von</span>
                                    <span className="font-medium">
                                      {historyItem.user.firstName} {historyItem.user.lastName}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Card-Ansicht */
        <div className="-mx-3 sm:-mx-4 md:-mx-6">
          {filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <DocumentTextIcon className="h-10 w-10 mb-4 text-gray-400 dark:text-gray-500" />
              <div className="text-sm">{t('analytics.request.noRequests')}</div>
            </div>
          ) : (
            <CardGrid>
              {filteredRequests.map(request => {
                const metadata: MetadataItem[] = [];
                
                // Links: Niederlassung
                if (visibleColumnIds.includes('branch')) {
                  metadata.push({
                    icon: <BuildingOfficeIcon className="h-4 w-4" />,
                    label: t('analytics.request.metadata.branch'),
                    value: request.branch.name,
                    section: 'left'
                  });
                }
                
                // Haupt-Metadaten: Antragsteller & Verantwortlich
                if (visibleColumnIds.includes('requester')) {
                  metadata.push({
                    icon: <UserIcon className="h-4 w-4" />,
                    label: t('analytics.request.metadata.requester'),
                    value: `${request.requester.firstName} ${request.requester.lastName}`,
                    section: 'main'
                  });
                }
                
                if (visibleColumnIds.includes('responsible')) {
                  metadata.push({
                    icon: <UserIcon className="h-4 w-4" />,
                    label: t('analytics.request.metadata.responsible'),
                    value: `${request.responsible.firstName} ${request.responsible.lastName}`,
                    section: 'main'
                  });
                }
                
                // Rechts: Zeit
                if (visibleColumnIds.includes('time')) {
                  metadata.push({
                    icon: <ClockIcon className="h-4 w-4" />,
                    label: t('analytics.request.metadata.time'),
                    value: format(new Date(request.createdAt), 'HH:mm'),
                    section: 'right'
                  });
                }

                return (
                  <DataCard
                    key={request.id}
                    title={
                      <span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">{request.id}:</span>{' '}
                        <span>{request.title}</span>
                      </span>
                    }
                    status={{
                      label: getStatusLabel(request.status),
                      color: getStatusColor(request.status)
                    }}
                    metadata={metadata}
                  />
                );
              })}
            </CardGrid>
          )}
        </div>
      )}
    </div>
  );
};

export default RequestAnalyticsTab;
