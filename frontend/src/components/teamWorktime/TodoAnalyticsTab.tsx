import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { API_ENDPOINTS } from '../../config/api.ts';
import { format } from 'date-fns';
import { 
  FunnelIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ClipboardDocumentListIcon,
  UserIcon,
  BuildingOfficeIcon,
  ClockIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChartBarIcon,
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

interface TodoAnalyticsTabProps {
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

interface Todo {
  id: number;
  title: string;
  status: string;
  responsible?: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  };
  qualityControl?: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  };
  branch: {
    id: number;
    name: string;
  };
  updatedAt: string;
  createdAt: string;
  createdBy?: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  };
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
const TODO_ANALYTICS_TABLE_ID = 'todo-analytics-table';

// Standardreihenfolge der Spalten
const defaultColumnOrder = ['time', 'title', 'status', 'responsible', 'qualityControl', 'branch', 'createdBy', 'deletedAt'];

const TodoAnalyticsTab: React.FC<TodoAnalyticsTabProps> = ({ selectedDate }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
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
  } = useTableSettings(TODO_ANALYTICS_TABLE_ID, {
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

  // Expandierte To-Dos für Status-Historie
  const [expandedTodos, setExpandedTodos] = useState<Set<number>>(new Set());
  
  const toggleTodoExpand = (todoId: number) => {
    setExpandedTodos(prev => {
      const next = new Set(prev);
      if (next.has(todoId)) {
        next.delete(todoId);
      } else {
        next.add(todoId);
      }
      return next;
    });
  };

  // Häufigkeitsanalyse State
  const [frequencyData, setFrequencyData] = useState<any>(null);
  const [loadingFrequency, setLoadingFrequency] = useState<boolean>(false);
  const [showFrequencyAnalysis, setShowFrequencyAnalysis] = useState<boolean>(false);

  // Schicht-Analyse State
  const [shiftData, setShiftData] = useState<any>(null);
  const [loadingShifts, setLoadingShifts] = useState<boolean>(false);
  const [showShiftAnalysis, setShowShiftAnalysis] = useState<boolean>(false);
  const [expandedShifts, setExpandedShifts] = useState<Set<number>>(new Set());
  
  const toggleShiftExpand = (workTimeId: number) => {
    setExpandedShifts(prev => {
      const next = new Set(prev);
      if (next.has(workTimeId)) {
        next.delete(workTimeId);
      } else {
        next.add(workTimeId);
      }
      return next;
    });
  };

  // Verfügbare Spalten für Filter und Table Settings
  const availableColumns = useMemo(() => [
    { id: 'time', label: t('analytics.todo.columns.time') },
    { id: 'title', label: t('analytics.todo.columns.title') },
    { id: 'status', label: t('analytics.todo.columns.status') },
    { id: 'responsible', label: t('analytics.todo.columns.responsible') },
    { id: 'qualityControl', label: t('analytics.todo.columns.qualityControl') },
    { id: 'branch', label: t('analytics.todo.columns.branch') },
    { id: 'createdBy', label: t('analytics.todo.columns.createdBy', { defaultValue: 'Erstellt von' }) },
    { id: 'deletedAt', label: t('analytics.todo.columns.deletedAt', { defaultValue: 'Gelöscht am' }) }
  ], [t]);

  // Lade To-Dos
  useEffect(() => {
    // ✅ PHASE 8: Memory Leak Prevention - AbortController
    const abortController = new AbortController();
    
    const fetchTodos = async () => {
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
        
        const response = await axiosInstance.get(API_ENDPOINTS.TEAM_WORKTIME.ANALYTICS.TODOS_CHRONOLOGICAL, {
          params,
          signal: abortController.signal
        });
        
        setTodos(response.data || []);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error loading todos:', error);
          setError(t('analytics.todo.loadError'));
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchTodos();
    
    // ✅ PHASE 8: Memory Leak Prevention - Cleanup
    return () => {
      abortController.abort();
    };
  }, [selectedDate, filterConditions, filterLogicalOperators, selectedFilterId]);

  // Lade Häufigkeitsanalyse
  useEffect(() => {
    // ✅ PHASE 8: Memory Leak Prevention - AbortController
    const abortController = new AbortController();
    
    const fetchFrequencyAnalysis = async () => {
      if (!selectedDate || !showFrequencyAnalysis) return;
      
      try {
        setLoadingFrequency(true);
        
        const response = await axiosInstance.get(API_ENDPOINTS.TEAM_WORKTIME.ANALYTICS.TODOS_FREQUENCY, {
          params: {
            date: selectedDate
          },
          signal: abortController.signal
        });
        
        setFrequencyData(response.data);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error loading frequency analysis:', error);
          // Kein setError hier, da nicht kritisch
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingFrequency(false);
        }
      }
    };

    fetchFrequencyAnalysis();
    
    // ✅ PHASE 8: Memory Leak Prevention - Cleanup
    return () => {
      abortController.abort();
    };
  }, [selectedDate, showFrequencyAnalysis]);

  // Lade Schicht-Analyse
  useEffect(() => {
    // ✅ PHASE 8: Memory Leak Prevention - AbortController
    const abortController = new AbortController();
    
    const fetchShiftAnalysis = async () => {
      if (!selectedDate || !showShiftAnalysis) return;
      
      try {
        setLoadingShifts(true);
        
        const response = await axiosInstance.get(API_ENDPOINTS.TEAM_WORKTIME.ANALYTICS.TODOS_SHIFTS, {
          params: {
            date: selectedDate
          },
          signal: abortController.signal
        });
        
        setShiftData(response.data);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error loading shift analysis:', error);
          // Kein setError hier, da nicht kritisch
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingShifts(false);
        }
      }
    };

    fetchShiftAnalysis();
    
    // ✅ PHASE 8: Memory Leak Prevention - Cleanup
    return () => {
      abortController.abort();
    };
  }, [selectedDate, showShiftAnalysis]);

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
      const filters = await loadFilters(TODO_ANALYTICS_TABLE_ID);
      
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
        return; // Filter wird angewendet (fetchTodos wird durch filterConditions-Änderung ausgelöst)
      }
      
      // 3. Fallback: Kein Filter (sollte nie passieren)
      // fetchTodos wird automatisch durch filterConditions-Änderung aufgerufen
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
      case 'done':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'quality_control':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'open':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'improval':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      done: 'Erledigt',
      in_progress: 'In Bearbeitung',
      quality_control: 'Qualitätskontrolle',
      open: 'Offen',
      improval: 'Nachbesserung'
    };
    return labels[status] || status;
  };

  // Gefilterte und durchsuchte To-Dos
  const filteredTodos = useMemo(() => {
    let filtered = [...todos];

    // Textsuche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(todo =>
        todo.title.toLowerCase().includes(searchLower) ||
        todo.branch.name.toLowerCase().includes(searchLower) ||
        (todo.responsible && `${todo.responsible.firstName} ${todo.responsible.lastName}`.toLowerCase().includes(searchLower))
      );
    }

    // Filter-Bedingungen (Frontend-Filterung für Spalten, die Backend nicht unterstützt)
    filterConditions.forEach((condition, index) => {
      if (condition.column === '' || condition.value === null) return;
      
      const operator = condition.operator || 'equals';
      const value = condition.value;

      filtered = filtered.filter(todo => {
        switch (condition.column) {
          case 'status':
            if (operator === 'equals') {
              return todo.status === value;
            }
            return true;
          case 'title':
            if (operator === 'contains') {
              return todo.title.toLowerCase().includes(String(value).toLowerCase());
            }
            return true;
          default:
            return true;
        }
      });
    });

    return filtered;
  }, [todos, searchTerm, filterConditions]);

  // Statistiken
  const stats = useMemo(() => ({
    total: filteredTodos.length,
    done: filteredTodos.filter(t => t.status === 'done').length,
    inProgress: filteredTodos.filter(t => t.status === 'in_progress').length,
    open: filteredTodos.filter(t => t.status === 'open').length,
    qualityControl: filteredTodos.filter(t => t.status === 'quality_control').length,
    improval: filteredTodos.filter(t => t.status === 'improval').length
  }), [filteredTodos]);

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 todo-analytics-wrapper">
      {/* Titelzeile */}
      <div className="flex items-center justify-between mb-4 px-3 sm:px-4 md:px-6">
        {/* Linke Seite: Titel mit Icon */}
        <div className="flex items-center">
          <ClipboardDocumentListIcon className="h-6 w-6 mr-2 dark:text-white" />
          <h2 className="text-xl font-semibold dark:text-white">{t('analytics.todo.title')}</h2>
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
          <div className="relative group">
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
            >
              {viewMode === 'table' ? (
                <Squares2X2Icon className="h-5 w-5" />
              ) : (
                <TableCellsIcon className="h-5 w-5" />
              )}
            </button>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
              {viewMode === 'table' ? t('common.viewAsCards') : t('common.viewAsTable')}
            </div>
          </div>
          
          {/* Filter-Button */}
          <div className="relative group ml-1">
            <button
              className={`p-2 rounded-md ${getActiveFilterCount() > 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} relative`}
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              style={{ position: 'relative' }}
            >
              <FunnelIcon className="h-5 w-5" />
              {getActiveFilterCount() > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 dark:bg-blue-500 text-white rounded-full text-xs flex items-center justify-center z-10">
                  {getActiveFilterCount()}
                </span>
              )}
            </button>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
              {t('common.filter')}
            </div>
          </div>
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
          tableId={TODO_ANALYTICS_TABLE_ID}
        />
        </div>
      )}
      
      {/* Gespeicherte Filter als Tags */}
      <div className={viewMode === 'cards' ? '-mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6' : 'px-3 sm:px-4 md:px-6'}>
        <SavedFilterTags
        tableId={TODO_ANALYTICS_TABLE_ID}
        onSelectFilter={applyFilterConditions}
        onReset={resetFilterConditions}
        activeFilterName={activeFilterName}
        selectedFilterId={selectedFilterId}
        onFilterChange={handleFilterChange}
        defaultFilterName="Alle" // ✅ FIX: Hardcodiert (konsistent mit DB)
      />
      </div>

      {/* Häufigkeitsanalyse & Schicht-Analyse Toggle */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setShowFrequencyAnalysis(!showFrequencyAnalysis)}
          className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
          title={`${t('analytics.todo.frequencyAnalysis')} ${showFrequencyAnalysis ? t('common.collapse') : t('common.expand')}`}
        >
          <ChartBarIcon className={`h-5 w-5 transition-transform ${showFrequencyAnalysis ? 'rotate-180' : ''}`} />
        </button>
        <button
          onClick={() => setShowShiftAnalysis(!showShiftAnalysis)}
          className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
          title={`${t('analytics.todo.shiftAnalysis')} ${showShiftAnalysis ? t('common.collapse') : t('common.expand')}`}
        >
          <ClockIcon className={`h-5 w-5 transition-transform ${showShiftAnalysis ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Häufigkeitsanalyse Sektion */}
      {showFrequencyAnalysis && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ArrowPathIcon className="h-5 w-5" />
            {t('analytics.todo.frequencyAnalysis')}
          </h3>
          
          {loadingFrequency ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500 dark:text-gray-400">{t('analytics.todo.loadingAnalysis')}</div>
            </div>
          ) : frequencyData ? (
            <div className="space-y-6">
              {/* Zusammenfassung */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="text-sm text-blue-600 dark:text-blue-400">{t('analytics.todo.frequency.totalTodos')}</div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{frequencyData.summary.totalTasks}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="text-sm text-green-600 dark:text-green-400">{t('analytics.todo.frequency.completed')}</div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">{frequencyData.summary.completedTasks}</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">{t('analytics.todo.frequency.neverCompleted')}</div>
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{frequencyData.summary.neverCompletedTasks}</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <div className="text-sm text-purple-600 dark:text-purple-400">{t('analytics.todo.frequency.completionRate')}</div>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{frequencyData.summary.completionRate}%</div>
                </div>
              </div>

              {/* Erledigungsrate pro User */}
              {frequencyData.userStats && frequencyData.userStats.length > 0 && (
                <div>
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-3">{t('analytics.todo.frequency.completionsPerUser')}</h4>
                  <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('analytics.todo.frequency.user')}
                          </th>
                          <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('analytics.todo.frequency.completed')}
                          </th>
                          <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('analytics.todo.frequency.lastCompletion')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                        {frequencyData.userStats.slice(0, 10).map((stat: any) => (
                          <tr key={stat.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {stat.user ? `${stat.user.firstName} ${stat.user.lastName}` : t('analytics.todo.unknown')}
                            </td>
                            <td className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {stat.completedCount}
                            </td>
                            <td className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {stat.lastCompletedAt ? format(new Date(stat.lastCompletedAt), 'HH:mm') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Häufigste/nicht erledigte To-Dos */}
              {frequencyData.taskStats && frequencyData.taskStats.length > 0 && (
                <div>
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-3">{t('analytics.todo.frequency.frequentCompleted')}</h4>
                  <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('analytics.todo.columns.title')}
                          </th>
                          <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('analytics.todo.columns.status')}
                          </th>
                          <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('analytics.todo.columns.branch')}
                          </th>
                          <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('analytics.todo.frequency.completed')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                        {frequencyData.taskStats.slice(0, 20).map((stat: any) => (
                          <tr key={stat.taskId} className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${stat.neverCompleted ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                            <td className="px-3 sm:px-4 md:px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                              {stat.title}
                            </td>
                            <td className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(stat.currentStatus)}`}>
                                {getStatusLabel(stat.currentStatus)}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {stat.branch.name}
                            </td>
                            <td className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {stat.completedCount}x {stat.neverCompleted && <span className="text-red-600 dark:text-red-400">{t('analytics.todo.never')}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Durchschnittliche Zeit pro Status */}
              {frequencyData.statusAverages && Object.keys(frequencyData.statusAverages).length > 0 && (
                <div>
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-3">{t('analytics.todo.frequency.averageTimePerStatus')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {Object.entries(frequencyData.statusAverages).map(([status, data]: [string, any]) => (
                      <div key={status} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{getStatusLabel(status)}</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {data.averageHours.toFixed(1)}h
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {data.taskCount} To-Do(s)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status-Verteilung Diagramm */}
              {frequencyData.summary && (
                <div>
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-3">{t('analytics.todo.frequency.statusDistribution')}</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <div className="relative" style={{ height: '200px' }}>
                      {/* Y-Achse Beschriftungen */}
                      <div className="absolute right-0 h-full flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 pr-1">
                        <span>{frequencyData.summary.totalTasks}</span>
                        <span>{Math.round(frequencyData.summary.totalTasks * 0.75)}</span>
                        <span>{Math.round(frequencyData.summary.totalTasks * 0.5)}</span>
                        <span>{Math.round(frequencyData.summary.totalTasks * 0.25)}</span>
                        <span>0</span>
                      </div>
                      
                      {/* Horizontale Hilfslinien */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-8">
                        <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                        <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                        <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                        <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                        <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                      </div>
                      
                      {/* Balken */}
                      <div className="absolute inset-0 flex items-end justify-around gap-2 pr-8 pb-1">
                        <div className="flex flex-col items-center gap-1 flex-1">
                          <div className="relative group w-full">
                            <div 
                              className="w-full bg-green-500 dark:bg-green-600 rounded-t"
                              style={{ 
                                height: `${frequencyData.summary.completedTasks > 0 ? (frequencyData.summary.completedTasks / frequencyData.summary.totalTasks) * 100 : 0}%`,
                                minHeight: frequencyData.summary.completedTasks > 0 ? '4px' : '0px'
                              }}
                            ></div>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                              {`${t('analytics.todo.frequency.completed')}: ${frequencyData.summary.completedTasks}`}
                            </div>
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{t('analytics.todo.frequency.completed')}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-500">{frequencyData.summary.completedTasks}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 flex-1">
                          <div className="relative group w-full">
                            <div 
                              className="w-full bg-yellow-500 dark:bg-yellow-600 rounded-t"
                              style={{ 
                                height: `${frequencyData.summary.totalTasks - frequencyData.summary.completedTasks - frequencyData.summary.neverCompletedTasks > 0 ? ((frequencyData.summary.totalTasks - frequencyData.summary.completedTasks - frequencyData.summary.neverCompletedTasks) / frequencyData.summary.totalTasks) * 100 : 0}%`,
                                minHeight: frequencyData.summary.totalTasks - frequencyData.summary.completedTasks - frequencyData.summary.neverCompletedTasks > 0 ? '4px' : '0px'
                              }}
                            ></div>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                              {`${t('tasks.status.open')}: ${frequencyData.summary.totalTasks - frequencyData.summary.completedTasks - frequencyData.summary.neverCompletedTasks}`}
                            </div>
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{t('tasks.status.open')}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-500">{frequencyData.summary.totalTasks - frequencyData.summary.completedTasks - frequencyData.summary.neverCompletedTasks}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 flex-1">
                          <div className="relative group w-full">
                            <div 
                              className="w-full bg-red-500 dark:bg-red-600 rounded-t"
                              style={{ 
                                height: `${frequencyData.summary.neverCompletedTasks > 0 ? (frequencyData.summary.neverCompletedTasks / frequencyData.summary.totalTasks) * 100 : 0}%`,
                                minHeight: frequencyData.summary.neverCompletedTasks > 0 ? '4px' : '0px'
                              }}
                            ></div>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                              {`${t('analytics.todo.frequency.neverCompleted')}: ${frequencyData.summary.neverCompletedTasks}`}
                            </div>
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{t('analytics.todo.frequency.neverCompleted')}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-500">{frequencyData.summary.neverCompletedTasks}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-center py-8">
              {t('analytics.todo.noData')}
            </div>
          )}
        </div>
      )}

      {/* Schicht-Analyse Sektion */}
      {showShiftAnalysis && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            {t('analytics.todo.shift.shiftBased')}
          </h3>
          
          {loadingShifts ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500 dark:text-gray-400">{t('analytics.todo.loadingAnalysis')}</div>
            </div>
          ) : shiftData ? (
            <div className="space-y-6">
              {/* Zusammenfassung */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="text-sm text-blue-600 dark:text-blue-400">{t('analytics.todo.shift.totalShifts')}</div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{shiftData.summary.totalShifts}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="text-sm text-green-600 dark:text-green-400">{t('analytics.todo.shift.todosInShifts')}</div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">{shiftData.summary.totalTasksInShifts}</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <div className="text-sm text-purple-600 dark:text-purple-400">{t('analytics.todo.shift.totalHours')}</div>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {shiftData.summary.totalDurationHours || '0.00'}
                  </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">{t('analytics.todo.shift.averageDuration')}</div>
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    {shiftData.summary.averageDurationHours || '-'}h
                  </div>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                  <div className="text-sm text-indigo-600 dark:text-indigo-400">{t('analytics.todo.shift.averageTodosPerShift')}</div>
                  <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                    {shiftData.summary.totalShifts > 0 
                      ? (shiftData.summary.totalTasksInShifts / shiftData.summary.totalShifts).toFixed(1)
                      : '0'
                    }
                  </div>
                </div>
              </div>

              {/* Schichten-Liste */}
              {shiftData.shifts && shiftData.shifts.length > 0 && (
                <div>
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-3">{t('analytics.todo.shift.shiftsWithTodos')}</h4>
                  <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('analytics.todo.frequency.user')}
                          </th>
                          <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('analytics.todo.columns.branch')}
                          </th>
                          <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('analytics.todo.shift.time')}
                          </th>
                          <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('analytics.todo.shift.duration')}
                          </th>
                          <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('analytics.todo.columns.title')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                        {shiftData.shifts.map((shift: any) => {
                          const isExpanded = expandedShifts.has(shift.workTimeId);
                          return (
                            <React.Fragment key={shift.workTimeId}>
                              <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                  {shift.user.firstName} {shift.user.lastName}
                                </td>
                                <td className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {shift.branch.name}
                                </td>
                                <td className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {format(new Date(shift.startTime), 'HH:mm')}
                                  {shift.endTime && ` - ${format(new Date(shift.endTime), 'HH:mm')}`}
                                </td>
                                <td className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {shift.durationHours ? `${shift.durationHours}h` : t('worktime.running')}
                                </td>
                                <td className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  <div className="flex items-center gap-2">
                                    <span>{shift.linkedTasksCount}</span>
                                    {shift.linkedTasksCount > 0 && (
                                      <div className="relative group">
                                        <button
                                          onClick={() => toggleShiftExpand(shift.workTimeId)}
                                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        >
                                          {isExpanded ? (
                                            <ChevronUpIcon className="h-4 w-4" />
                                          ) : (
                                            <ChevronDownIcon className="h-4 w-4" />
                                          )}
                                        </button>
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                          {t('analytics.todo.shift.showTodos')}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && shift.linkedTasksCount > 0 && (
                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                  <td colSpan={5} className="px-3 sm:px-4 md:px-6 py-4">
                                    <div className="ml-4 border-l-2 border-blue-200 dark:border-blue-700 pl-4">
                                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('analytics.todo.shift.linkedTasks')}</h5>
                                      <div className="space-y-2">
                                        {shift.linkedTasks.map((task: any) => (
                                          <div key={task.id} className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                                            <span className={`px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                                              {getStatusLabel(task.status)}
                                            </span>
                                            <span className="font-medium">{task.title}</span>
                                            {task.responsible && (
                                              <span className="text-gray-400">
                                                ({task.responsible.firstName} {task.responsible.lastName})
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* To-Dos mit Schicht-Verteilung */}
              {shiftData.tasksWithShifts && shiftData.tasksWithShifts.length > 0 && (
                <div>
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-3">{t('analytics.todo.shift.tasksWithShiftDistribution')}</h4>
                  <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('analytics.todo.columns.title')}
                          </th>
                          <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('analytics.todo.columns.status')}
                          </th>
                          <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('analytics.todo.shift.totalShifts')}
                          </th>
                          <th className="px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('analytics.todo.shift.totalTime')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                        {shiftData.tasksWithShifts.slice(0, 30).map((item: any) => (
                          <tr key={item.task.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-3 sm:px-4 md:px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                              {item.task.title}
                            </td>
                            <td className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.task.status)}`}>
                                {getStatusLabel(item.task.status)}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {item.shiftCount}x
                            </td>
                            <td className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {item.totalDurationHours}h
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-center py-8">
              {t('analytics.todo.noShiftData')}
            </div>
          )}
        </div>
      )}

      {/* Statistiken */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('analytics.todo.stats.total')}</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="text-sm text-green-600 dark:text-green-400">{t('analytics.todo.frequency.completed')}</div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.done}</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="text-sm text-blue-600 dark:text-blue-400">{t('analytics.todo.stats.inProgress')}</div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.inProgress}</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div className="text-sm text-purple-600 dark:text-purple-400">{t('analytics.todo.stats.qualityControl')}</div>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.qualityControl}</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="text-sm text-yellow-600 dark:text-yellow-400">{t('tasks.status.open')}</div>
          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.open}</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <div className="text-sm text-red-600 dark:text-red-400">{t('tasks.status.improval')}</div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.improval}</div>
        </div>
      </div>

      {/* Status-Verteilung Diagramm */}
      {filteredTodos.length > 0 && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5" />
            {t('analytics.todo.statusDistribution')}
          </h3>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <div className="relative" style={{ height: '200px' }}>
              {/* Y-Achse Beschriftungen */}
              <div className="absolute right-0 h-full flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 pr-1">
                <span>{stats.total}</span>
                <span>{Math.round(stats.total * 0.75)}</span>
                <span>{Math.round(stats.total * 0.5)}</span>
                <span>{Math.round(stats.total * 0.25)}</span>
                <span>0</span>
              </div>
              
              {/* Horizontale Hilfslinien */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-8">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              
              {/* Balken */}
              <div className="absolute inset-0 flex items-end justify-around gap-1 sm:gap-2 pr-8 pb-1">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div className="relative group w-full">
                    <div 
                      className="w-full bg-green-500 dark:bg-green-600 rounded-t transition-all hover:opacity-80"
                      style={{ 
                        height: `${stats.total > 0 ? (stats.done / stats.total) * 100 : 0}%`,
                        minHeight: stats.done > 0 ? '4px' : '0px'
                      }}
                    ></div>
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                      {`${t('analytics.todo.frequency.completed')}: ${stats.done}`}
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium text-center">{t('analytics.todo.frequency.completed')}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-500">{stats.done}</span>
                </div>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div className="relative group w-full">
                    <div 
                      className="w-full bg-blue-500 dark:bg-blue-600 rounded-t transition-all hover:opacity-80"
                      style={{ 
                        height: `${stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0}%`,
                        minHeight: stats.inProgress > 0 ? '4px' : '0px'
                      }}
                    ></div>
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                      {`${t('analytics.todo.stats.inProgress')}: ${stats.inProgress}`}
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium text-center">{t('analytics.todo.stats.inProgress')}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-500">{stats.inProgress}</span>
                </div>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div className="relative group w-full">
                    <div 
                      className="w-full bg-purple-500 dark:bg-purple-600 rounded-t transition-all hover:opacity-80"
                      style={{ 
                        height: `${stats.total > 0 ? (stats.qualityControl / stats.total) * 100 : 0}%`,
                        minHeight: stats.qualityControl > 0 ? '4px' : '0px'
                      }}
                    ></div>
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                      {`${t('analytics.todo.stats.qualityControl')}: ${stats.qualityControl}`}
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium text-center">{t('analytics.todo.columns.qualityControl')}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-500">{stats.qualityControl}</span>
                </div>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div className="relative group w-full">
                    <div 
                      className="w-full bg-yellow-500 dark:bg-yellow-600 rounded-t transition-all hover:opacity-80"
                      style={{ 
                        height: `${stats.total > 0 ? (stats.open / stats.total) * 100 : 0}%`,
                        minHeight: stats.open > 0 ? '4px' : '0px'
                      }}
                    ></div>
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                      {`${t('tasks.status.open')}: ${stats.open}`}
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium text-center">{t('tasks.status.open')}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-500">{stats.open}</span>
                </div>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div className="relative group w-full">
                    <div 
                      className="w-full bg-red-500 dark:bg-red-600 rounded-t transition-all hover:opacity-80"
                      style={{ 
                        height: `${stats.total > 0 ? (stats.improval / stats.total) * 100 : 0}%`,
                        minHeight: stats.improval > 0 ? '4px' : '0px'
                      }}
                    ></div>
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                      {`${t('tasks.status.improval')}: ${stats.improval}`}
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium text-center">{t('tasks.status.improval')}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-500">{stats.improval}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content: Tabelle oder Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
        </div>
      ) : viewMode === 'table' ? (
        /* Tabellen-Ansicht */
        <div className="overflow-x-auto">
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
              {filteredTodos.length === 0 ? (
                <tr>
                  <td colSpan={columnOrder.filter(id => visibleColumnIds.includes(id)).length} className="px-3 sm:px-4 md:px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Keine To-Dos für dieses Datum gefunden
                  </td>
                </tr>
              ) : (
                filteredTodos.map((todo) => {
                  const isExpanded = expandedTodos.has(todo.id);
                  const hasStatusHistory = todo.statusHistory && todo.statusHistory.length > 0;
                  
                  return (
                    <React.Fragment key={todo.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        {columnOrder.filter(id => visibleColumnIds.includes(id)).map((columnId) => {
                          switch (columnId) {
                            case 'time':
                              return (
                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {format(new Date(todo.updatedAt), 'HH:mm')}
                                </td>
                              );
                            case 'title':
                              return (
                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                  <div className="flex items-center gap-2">
                                    {hasStatusHistory && (
                                      <div className="relative group">
                                        <button
                                          onClick={() => toggleTodoExpand(todo.id)}
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
                                    <span>{todo.title}</span>
                                  </div>
                                </td>
                              );
                            case 'status':
                              return (
                                <td key={columnId} className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(todo.status)}`}>
                                    {getStatusLabel(todo.status)}
                                  </span>
                                </td>
                              );
                            case 'responsible':
                              return (
                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {todo.responsible
                                    ? `${todo.responsible.firstName} ${todo.responsible.lastName}`
                                    : '-'}
                                </td>
                              );
                            case 'qualityControl':
                              return (
                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {todo.qualityControl
                                    ? `${todo.qualityControl.firstName} ${todo.qualityControl.lastName}`
                                    : '-'}
                                </td>
                              );
                            case 'branch':
                              return (
                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {todo.branch.name}
                                </td>
                              );
                            case 'createdBy':
                              return (
                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {todo.createdBy
                                    ? `${todo.createdBy.firstName} ${todo.createdBy.lastName}`
                                    : '-'}
                                </td>
                              );
                            case 'deletedAt':
                              return (
                                <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {todo.deletedAt ? (
                                    <div className="flex items-center gap-2">
                                      <TrashIcon className="h-4 w-4 text-red-500" />
                                      <span>{format(new Date(todo.deletedAt), 'dd.MM.yyyy HH:mm')}</span>
                                      {todo.deletedBy && (
                                        <span className="text-gray-400">
                                          ({todo.deletedBy.firstName} {todo.deletedBy.lastName})
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
                                {todo.statusHistory!.map((historyItem, idx) => (
                                  <div key={historyItem.id} className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">
                                      {format(new Date(historyItem.changedAt), 'HH:mm:ss')}
                                    </span>
                                    <span className="text-gray-400">→</span>
                                    <span className={`px-2 py-1 rounded-full ${getStatusColor(historyItem.oldStatus || 'open')}`}>
                                      {getStatusLabel(historyItem.oldStatus || 'open')}
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
          {filteredTodos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <ClipboardDocumentListIcon className="h-10 w-10 mb-4 text-gray-400 dark:text-gray-500" />
              <div className="text-sm">Keine To-Dos gefunden</div>
            </div>
          ) : (
            <CardGrid>
              {filteredTodos.map(todo => {
                const metadata: MetadataItem[] = [];
                
                // Links: Niederlassung
                if (visibleColumnIds.includes('branch')) {
                  metadata.push({
                    icon: <BuildingOfficeIcon className="h-4 w-4" />,
                    label: 'Niederlassung',
                    value: todo.branch.name,
                    section: 'left'
                  });
                }
                
                // Haupt-Metadaten: Verantwortlich & Qualitätskontrolle
                if (visibleColumnIds.includes('responsible')) {
                  metadata.push({
                    icon: <UserIcon className="h-4 w-4" />,
                    label: 'Verantwortlich',
                    value: todo.responsible
                      ? `${todo.responsible.firstName} ${todo.responsible.lastName}`
                      : '-',
                    section: 'main'
                  });
                }
                
                if (visibleColumnIds.includes('qualityControl')) {
                  metadata.push({
                    icon: <UserIcon className="h-4 w-4" />,
                    label: 'Qualitätskontrolle',
                    value: todo.qualityControl
                      ? `${todo.qualityControl.firstName} ${todo.qualityControl.lastName}`
                      : '-',
                    section: 'main'
                  });
                }
                
                // Rechts: Zeit
                if (visibleColumnIds.includes('time')) {
                  metadata.push({
                    icon: <ClockIcon className="h-4 w-4" />,
                    label: 'Zeit',
                    value: format(new Date(todo.updatedAt), 'HH:mm'),
                    section: 'right'
                  });
                }

                // Expandierbarer Content für Status-Historie
                const hasStatusHistory = todo.statusHistory && todo.statusHistory.length > 0;
                const isExpanded = expandedTodos.has(todo.id);
                
                const expandableContent = hasStatusHistory ? (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <ArrowPathIcon className="h-4 w-4" />
                      Status-Wechsel
                    </h4>
                    <div className="space-y-2">
                      {todo.statusHistory!.map((historyItem) => (
                        <div key={historyItem.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-medium">
                            {format(new Date(historyItem.changedAt), 'HH:mm:ss')}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className={`px-2 py-1 rounded-full ${getStatusColor(historyItem.oldStatus || 'open')}`}>
                            {getStatusLabel(historyItem.oldStatus || 'open')}
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
                ) : null;

                return (
                  <DataCard
                    key={todo.id}
                    title={
                      <span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">{todo.id}:</span>{' '}
                        <span>{todo.title}</span>
                      </span>
                    }
                    status={{
                      label: getStatusLabel(todo.status),
                      color: getStatusColor(todo.status)
                    }}
                    metadata={metadata}
                    expandable={expandableContent ? {
                      isExpanded: isExpanded,
                      content: expandableContent,
                      onToggle: () => toggleTodoExpand(todo.id)
                    } : undefined}
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

export default TodoAnalyticsTab;
