import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClockIcon, 
  UserIcon,
  FunnelIcon,
  XMarkIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { formatTime, calculateDuration } from '../utils/dateUtils.ts';
import { Consultation, Client } from '../types/client.ts';
import { usePermissions } from '../hooks/usePermissions.ts';
import { toast } from 'react-toastify';
import LinkTaskModal from './LinkTaskModal.tsx';
import FilterPane from './FilterPane.tsx';
import SavedFilterTags from './SavedFilterTags.tsx';
import { FilterCondition } from './FilterRow.tsx';

// TableID für gespeicherte Filter
const CONSULTATIONS_TABLE_ID = 'consultations-table';

const ConsultationList: React.FC = () => {
  const { hasPermission } = usePermissions();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [editingTimeId, setEditingTimeId] = useState<number | null>(null);
  const [editingTimeType, setEditingTimeType] = useState<'startTime' | 'endTime' | null>(null);
  const [editingTimeValue, setEditingTimeValue] = useState('');
  const [linkTaskModalOpen, setLinkTaskModalOpen] = useState(false);
  const [selectedConsultationId, setSelectedConsultationId] = useState<number | null>(null);

  const loadConsultations = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_ENDPOINTS.CONSULTATIONS.BASE);
      setConsultations(response.data || []);
      setError(null);
    } catch (error) {
      console.error('Fehler beim Laden der Beratungen:', error);
      setError('Fehler beim Laden der Beratungen');
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

  useEffect(() => {
    loadConsultations();
    loadRecentClients();
  }, []);

  useEffect(() => {
    const createStandardFilters = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Prüfe, ob Standard-Filter bereits existieren
        const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(CONSULTATIONS_TABLE_ID));
        const existingFilters = response.data;

        const alleFilterExists = existingFilters.some((filter: any) => filter.name === 'Alle');
        const heuteFilterExists = existingFilters.some((filter: any) => filter.name === 'Heute');
        const dieseWocheFilterExists = existingFilters.some((filter: any) => filter.name === 'Diese Woche');
        const zuletztBeratenFilterExists = existingFilters.some((filter: any) => filter.name === 'Zuletzt beraten');

        // Erstelle "Alle"-Filter (zeigt alle Beratungen ohne Einschränkung)
        if (!alleFilterExists) {
          const alleFilter = {
            tableId: CONSULTATIONS_TABLE_ID,
            name: 'Alle',
            conditions: [],
            operators: []
          };
          await axiosInstance.post(API_ENDPOINTS.SAVED_FILTERS.BASE, alleFilter);
        }

        // Erstelle "Heute"-Filter
        if (!heuteFilterExists) {
          const today = new Date().toISOString().split('T')[0];
          const heuteFilter = {
            tableId: CONSULTATIONS_TABLE_ID,
            name: 'Heute',
            conditions: [
              { column: 'startTime', operator: 'after', value: today }
            ],
            operators: []
          };
          await axiosInstance.post(API_ENDPOINTS.SAVED_FILTERS.BASE, heuteFilter);
        }

        // Erstelle "Diese Woche"-Filter
        if (!dieseWocheFilterExists) {
          const today = new Date();
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Montag
          const dieseWocheFilter = {
            tableId: CONSULTATIONS_TABLE_ID,
            name: 'Diese Woche',
            conditions: [
              { column: 'startTime', operator: 'after', value: startOfWeek.toISOString().split('T')[0] }
            ],
            operators: []
          };
          await axiosInstance.post(API_ENDPOINTS.SAVED_FILTERS.BASE, dieseWocheFilter);
        }

        // Erstelle "Zuletzt beraten"-Filter (basiert auf Recent Clients)
        if (!zuletztBeratenFilterExists && recentClients.length > 0) {
          const clientConditions = recentClients.map(client => ({
            column: 'client',
            operator: 'equals' as const,
            value: client.name
          }));
          const operators = new Array(clientConditions.length - 1).fill('OR') as ('AND' | 'OR')[];
          
          const zuletztBeratenFilter = {
            tableId: CONSULTATIONS_TABLE_ID,
            name: 'Zuletzt beraten',
            conditions: clientConditions,
            operators: operators
          };
          await axiosInstance.post(API_ENDPOINTS.SAVED_FILTERS.BASE, zuletztBeratenFilter);
        }
      } catch (error) {
        console.error('Fehler beim Erstellen der Standard-Filter:', error);
      }
    };

    createStandardFilters();
  }, [recentClients]);

  const applyFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setFilterConditions(conditions);
    setFilterLogicalOperators(operators);
  };

  const resetFilterConditions = () => {
    setFilterConditions([]);
    setFilterLogicalOperators([]);
  };

  const getActiveFilterCount = () => {
    return filterConditions.length;
  };

  const updateNotes = async (consultationId: number, notes: string) => {
    try {
      await axiosInstance.patch(API_ENDPOINTS.CONSULTATIONS.UPDATE_NOTES(consultationId), { notes });
      setConsultations(prev => 
        prev.map(consultation => 
          consultation.id === consultationId 
            ? { ...consultation, notes }
            : consultation
        )
      );
      toast.success('Notizen aktualisiert');
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Notizen:', error);
      toast.error('Fehler beim Aktualisieren der Notizen');
    }
  };

  const handleNotesEdit = (consultation: Consultation) => {
    setEditingNotesId(consultation.id);
    setEditingNotes(consultation.notes || '');
  };

  const handleNotesSave = (consultationId: number) => {
    updateNotes(consultationId, editingNotes);
    setEditingNotesId(null);
  };

  const handleNotesCancel = () => {
    setEditingNotesId(null);
    setEditingNotes('');
  };

  const handleTimeEdit = (consultation: Consultation, timeType: 'startTime' | 'endTime') => {
    setEditingTimeId(consultation.id);
    setEditingTimeType(timeType);
    const currentTime = timeType === 'startTime' ? consultation.startTime : consultation.endTime;
    if (currentTime) {
      const date = new Date(currentTime);
      const localDateTime = date.toISOString().slice(0, 16);
      setEditingTimeValue(localDateTime);
    }
  };

  const handleTimeSave = async (consultationId: number) => {
    if (!editingTimeType || !editingTimeValue) return;
    
    try {
      const isoTime = new Date(editingTimeValue).toISOString();
      await axiosInstance.patch(`${API_ENDPOINTS.WORKTIME.BASE}/${consultationId}`, {
        [editingTimeType]: isoTime
      });
      
      setConsultations(prev => 
        prev.map(consultation => 
          consultation.id === consultationId 
            ? { ...consultation, [editingTimeType]: isoTime }
            : consultation
        )
      );
      
      toast.success('Zeit aktualisiert');
      setEditingTimeId(null);
      setEditingTimeType(null);
      setEditingTimeValue('');
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Zeit:', error);
      toast.error('Fehler beim Aktualisieren der Zeit');
    }
  };

  const handleTimeCancel = () => {
    setEditingTimeId(null);
    setEditingTimeType(null);
    setEditingTimeValue('');
  };

  const handleLinkTask = (consultationId: number) => {
    setSelectedConsultationId(consultationId);
    setLinkTaskModalOpen(true);
  };

  const handleTaskLinked = () => {
    loadConsultations();
    setLinkTaskModalOpen(false);
    setSelectedConsultationId(null);
  };

  const applyFiltersAndSearch = (consultations: Consultation[]) => {
    let filtered = consultations;

    // Suchterm-Filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(consultation => 
        consultation.client?.name?.toLowerCase().includes(search) ||
        consultation.notes?.toLowerCase().includes(search) ||
        consultation.branch?.name?.toLowerCase().includes(search)
      );
    }

    // Erweiterte Filter
    if (filterConditions.length > 0) {
      filtered = filtered.filter((consultation) => {
        let result = true;
        
        for (let i = 0; i < filterConditions.length; i++) {
          const condition = filterConditions[i];
          let conditionResult = false;
          
          switch (condition.column) {
            case 'client':
              conditionResult = consultation.client?.name?.toLowerCase().includes(String(condition.value).toLowerCase()) || false;
              break;
            case 'branch':
              conditionResult = consultation.branch?.name?.toLowerCase().includes(String(condition.value).toLowerCase()) || false;
              break;
            case 'notes':
              conditionResult = consultation.notes?.toLowerCase().includes(String(condition.value).toLowerCase()) || false;
              break;
            case 'startTime':
              const consultationDate = new Date(consultation.startTime).toISOString().split('T')[0];
              const filterDate = String(condition.value);
              switch (condition.operator) {
                case 'after':
                  conditionResult = consultationDate >= filterDate;
                  break;
                case 'before':
                  conditionResult = consultationDate <= filterDate;
                  break;
                case 'equals':
                  conditionResult = consultationDate === filterDate;
                  break;
                default:
                  conditionResult = false;
              }
              break;
            case 'duration':
              const duration = calculateDurationInMinutes(consultation.startTime, consultation.endTime);
              const filterValue = Number(condition.value) * 60; // Convert hours to minutes
              switch (condition.operator) {
                case 'greater_than':
                  conditionResult = duration > filterValue;
                  break;
                case 'less_than':
                  conditionResult = duration < filterValue;
                  break;
                case 'equals':
                  conditionResult = Math.abs(duration - filterValue) < 30; // 30-minute tolerance
                  break;
                default:
                  conditionResult = false;
              }
              break;
            default:
              conditionResult = false;
          }
          
          if (i === 0) {
            result = conditionResult;
          } else {
            const operator = filterLogicalOperators[i - 1];
            if (operator === 'AND') {
              result = result && conditionResult;
            } else {
              result = result || conditionResult;
            }
          }
        }
        
        return result;
      });
    }

    return filtered;
  };

  const calculateDurationInMinutes = (startTime: string, endTime: string | null): number => {
    if (!endTime) return 0;
    const start = new Date(startTime);
    const end = new Date(endTime);
    return (end.getTime() - start.getTime()) / (1000 * 60);
  };

  const filteredConsultations = useMemo(() => {
    return applyFiltersAndSearch(consultations).sort((a, b) => {
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    });
  }, [consultations, filterConditions, filterLogicalOperators]);

  if (loading) return <div className="p-4">Lädt...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 sm:p-6">
        {/* Header */}
        <div className="flex items-center mb-6 justify-between">
          <div className="flex items-center">
            <ClockIcon className="h-6 w-6 mr-2 dark:text-white" />
            <h2 className="text-xl font-semibold dark:text-white">Beratungsliste</h2>
          </div>
          
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Suchen..."
              className="w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <button
              className={`p-2 rounded-md ${getActiveFilterCount() > 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} ml-1 relative`}
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              title="Erweiterte Filter"
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

        {/* Filter-Pane */}
        {isFilterPanelOpen && (
          <FilterPane
            columns={[
              { id: 'client', label: 'Client' },
              { id: 'branch', label: 'Niederlassung' },
              { id: 'notes', label: 'Notizen' },
              { id: 'startTime', label: 'Datum' },
              { id: 'duration', label: 'Dauer (Stunden)' }
            ]}
            onApply={applyFilterConditions}
            onReset={resetFilterConditions}
            savedConditions={filterConditions}
            savedOperators={filterLogicalOperators}
            tableId={CONSULTATIONS_TABLE_ID}
          />
        )}
        
        {/* Gespeicherte Filter als Tags anzeigen */}
        <SavedFilterTags
          tableId={CONSULTATIONS_TABLE_ID}
          onSelectFilter={applyFilterConditions}
          onReset={resetFilterConditions}
          defaultFilterName="Alle"
        />

        {/* Cards Grid */}
        <div className="space-y-4">
          {filteredConsultations.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Keine Beratungen gefunden</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {searchTerm || filterConditions.length > 0
                    ? 'Versuchen Sie andere Suchbegriffe oder Filter.' 
                    : 'Es wurden noch keine Beratungen durchgeführt.'}
                </p>
              </div>
            </div>
          ) : (
            filteredConsultations.map((consultation) => (
              <div
                key={consultation.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                {/* Card Content - Always 2 columns */}
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left: Compact Info */}
                    <div className="space-y-3">
                      {/* Client Header */}
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-md flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {consultation.client?.name}
                          </h3>
                          {consultation.client?.company && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {consultation.client.company}
                            </p>
                          )}
                        </div>
                        {hasPermission('consultations', 'write') && (
                          <button
                            onClick={() => handleLinkTask(consultation.id)}
                            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                            title="Task verknüpfen"
                          >
                            <LinkIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Time Range - Single compact field */}
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Zeit</p>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {editingTimeId === consultation.id && editingTimeType === 'startTime' ? (
                            <div className="flex items-center space-x-1">
                              <input
                                type="datetime-local"
                                value={editingTimeValue}
                                onChange={(e) => setEditingTimeValue(e.target.value)}
                                className="text-xs rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 w-full"
                              />
                              <button
                                onClick={() => handleTimeSave(consultation.id)}
                                className="p-0.5 text-green-600 hover:text-green-700"
                                title="Speichern"
                              >
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={handleTimeCancel}
                                className="p-0.5 text-red-600 hover:text-red-700"
                                title="Abbrechen"
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                            </div>
                          ) : editingTimeId === consultation.id && editingTimeType === 'endTime' ? (
                            <div className="flex items-center space-x-1">
                              <input
                                type="datetime-local"
                                value={editingTimeValue}
                                onChange={(e) => setEditingTimeValue(e.target.value)}
                                className="text-xs rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 w-full"
                              />
                              <button
                                onClick={() => handleTimeSave(consultation.id)}
                                className="p-0.5 text-green-600 hover:text-green-700"
                                title="Speichern"
                              >
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={handleTimeCancel}
                                className="p-0.5 text-red-600 hover:text-red-700"
                                title="Abbrechen"
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleTimeEdit(consultation, 'startTime')}
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
                              >
                                {formatTime(consultation.startTime)}
                              </button>
                              <span className="text-gray-400">-</span>
                              {consultation.endTime ? (
                                <button
                                  onClick={() => handleTimeEdit(consultation, 'endTime')}
                                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
                                >
                                  {formatTime(consultation.endTime)}
                                </button>
                              ) : (
                                <div className="flex items-center">
                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                                  <span className="text-green-600 dark:text-green-400 text-xs">Aktiv</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Duration */}
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Dauer</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {calculateDuration(consultation.startTime, consultation.endTime)}
                        </p>
                      </div>

                      {/* Tasks - Compact */}
                      {consultation.taskLinks && consultation.taskLinks.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Tasks ({consultation.taskLinks.length})
                          </p>
                          <div className="space-y-1">
                            {consultation.taskLinks.slice(0, 2).map((taskLink) => (
                              <div
                                key={taskLink.id}
                                className="flex items-center text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded px-2 py-1"
                              >
                                <LinkIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{taskLink.task.title}</span>
                              </div>
                            ))}
                            {consultation.taskLinks.length > 2 && (
                              <p className="text-xs text-gray-500">
                                +{consultation.taskLinks.length - 2} weitere
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Notes */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Notizen</p>
                      {editingNotesId === consultation.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingNotes}
                            onChange={(e) => setEditingNotes(e.target.value)}
                            className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                            placeholder="Notizen zur Beratung..."
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={handleNotesCancel}
                              className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                            >
                              Abbrechen
                            </button>
                            <button
                              onClick={() => handleNotesSave(consultation.id)}
                              className="px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded"
                            >
                              Speichern
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded p-2 min-h-[60px] border border-dashed border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
                          onClick={() => handleNotesEdit(consultation)}
                        >
                          {consultation.notes ? (
                            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                              {consultation.notes}
                            </p>
                          ) : (
                            <div className="flex items-center justify-center h-full text-center">
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                Notizen hinzufügen...
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      {linkTaskModalOpen && selectedConsultationId && (
        <LinkTaskModal
          isOpen={linkTaskModalOpen}
          onClose={() => setLinkTaskModalOpen(false)}
          consultationId={selectedConsultationId}
          onTaskLinked={handleTaskLinked}
        />
      )}
    </>
  );
};

export default ConsultationList; 