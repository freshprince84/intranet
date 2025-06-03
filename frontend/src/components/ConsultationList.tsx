import React, { useState, useEffect, useMemo, useImperativeHandle, forwardRef, useCallback } from 'react';
import { 
  ClockIcon, 
  FunnelIcon,
  XMarkIcon,
  LinkIcon,
  TrashIcon,
  DocumentTextIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { 
  formatTime, 
  calculateDuration, 
  formatTotalDuration, 
  isConsultationInvoiced, 
  getConsultationInvoiceInfo,
  getInvoiceStatusText,
  getInvoiceStatusColor 
} from '../utils/dateUtils.ts';
import { Consultation, Client } from '../types/client.ts';
import { usePermissions } from '../hooks/usePermissions.ts';
import { toast } from 'react-toastify';
import LinkTaskModal from './LinkTaskModal.tsx';
import FilterPane from './FilterPane.tsx';
import SavedFilterTags from './SavedFilterTags.tsx';
import { FilterCondition } from './FilterRow.tsx';
import * as consultationApi from '../api/consultationApi.ts';
import * as clientApi from '../api/clientApi.ts';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import CreateInvoiceModal from './CreateInvoiceModal.tsx';

// TableID für gespeicherte Filter
const CONSULTATIONS_TABLE_ID = 'consultations-table';

interface ConsultationListProps {
  onConsultationChange?: () => void;
}

// Ref-Interface für imperatives Handle
export interface ConsultationListRef {
  refresh: () => void;
  activateClientFilter?: (clientName: string) => void;
}

const ConsultationList = forwardRef<ConsultationListRef, ConsultationListProps>(({ onConsultationChange }, ref) => {
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
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

  // Filter State Management
  const [activeFilterName, setActiveFilterName] = useState<string>('Heute');
  const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);

  // Invoice Creation State
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);

  const loadConsultations = async () => {
    try {
      setLoading(true);
      const consultations = await consultationApi.getConsultations();
      setConsultations(consultations || []);
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
      const clients = await clientApi.getRecentClients();
      setRecentClients(clients || []);
    } catch (error) {
      // Stille Behandlung - normale Situation wenn noch keine Clients beraten wurden
    }
  };

  // Imperatives Handle für Ref-basierte Refresh-Funktion
  useImperativeHandle(ref, () => ({
    refresh: loadConsultations,
    activateClientFilter: createAndActivateClientFilter
  }));

  // Initial load
  useEffect(() => {
    loadConsultations();
    loadRecentClients();
  }, []);

  // Initialer Default-Filter
  useEffect(() => {
    const setInitialFilter = async () => {
      try {
        const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(CONSULTATIONS_TABLE_ID));
        const filters = response.data;
        
        const heuteFilter = filters.find((filter: any) => filter.name === 'Heute');
        if (heuteFilter) {
          setActiveFilterName('Heute');
          setSelectedFilterId(heuteFilter.id);
          applyFilterConditions(heuteFilter.conditions, heuteFilter.operators);
        }
      } catch (error) {
        console.error('Fehler beim Setzen des initialen Filters:', error);
      }
    };

    setInitialFilter();
  }, []);

  // Filter Change Handler
  const handleFilterChange = (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setActiveFilterName(name);
    setSelectedFilterId(id);
    applyFilterConditions(conditions, operators);
  };

  // Client-Filter erstellen und aktivieren
  const createAndActivateClientFilter = async (clientName: string) => {
    try {
      // Prüfe ob Client-Filter bereits existiert
      const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(CONSULTATIONS_TABLE_ID));
      const existingFilters = response.data;
      
      let clientFilter = existingFilters.find((filter: any) => filter.name === clientName);
      
      if (!clientFilter) {
        // Erstelle neuen Client-Filter
        const newFilter = {
          tableId: CONSULTATIONS_TABLE_ID,
          name: clientName,
          conditions: [
            { column: 'client', operator: 'equals', value: clientName }
          ],
          operators: []
        };
        
        const createResponse = await axiosInstance.post(API_ENDPOINTS.SAVED_FILTERS.BASE, newFilter);
        clientFilter = createResponse.data;
        
        // Refresh die Filter-Liste
        if ((window as any).refreshSavedFilters) {
          (window as any).refreshSavedFilters();
        }
      }
      
      // Aktiviere den Client-Filter
      if (clientFilter) {
        setActiveFilterName(clientName);
        setSelectedFilterId(clientFilter.id);
        applyFilterConditions(clientFilter.conditions, clientFilter.operators);
      }
    } catch (error) {
      console.error('Fehler beim Erstellen/Aktivieren des Client-Filters:', error);
    }
  };

  useEffect(() => {
    const createStandardFilters = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Prüfe, ob Standard-Filter bereits existieren
        const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(CONSULTATIONS_TABLE_ID));
        const existingFilters = response.data;

        // Lösche veralteten "Alle" Filter falls vorhanden
        const alleFilter = existingFilters.find((filter: any) => filter.name === 'Alle');
        if (alleFilter) {
          try {
            await axiosInstance.delete(API_ENDPOINTS.SAVED_FILTERS.BY_ID(alleFilter.id));
            console.log('Veralteter "Alle" Filter gelöscht');
          } catch (error) {
            console.error('Fehler beim Löschen des "Alle" Filters:', error);
          }
        }

        // Lösche veralteten "Diese Woche" Filter falls vorhanden
        const dieseWocheFilter = existingFilters.find((filter: any) => filter.name === 'Diese Woche');
        if (dieseWocheFilter) {
          try {
            await axiosInstance.delete(API_ENDPOINTS.SAVED_FILTERS.BY_ID(dieseWocheFilter.id));
            console.log('Veralteter "Diese Woche" Filter gelöscht');
          } catch (error) {
            console.error('Fehler beim Löschen des "Diese Woche" Filters:', error);
          }
        }

        const archivFilterExists = existingFilters.some((filter: any) => filter.name === 'Archiv');
        const heuteFilterExists = existingFilters.some((filter: any) => filter.name === 'Heute');
        const wocheFilterExists = existingFilters.some((filter: any) => filter.name === 'Woche');
        const nichtAbgerechnetFilterExists = existingFilters.some((filter: any) => filter.name === 'Nicht abgerechnet');

        // Erstelle "Archiv"-Filter (zeigt nur vergangene Beratungen - strikt vor heute)
        if (!archivFilterExists) {
          const today = new Date().toISOString().split('T')[0];
          const archivFilter = {
            tableId: CONSULTATIONS_TABLE_ID,
            name: 'Archiv',
            conditions: [
              { column: 'startTime', operator: 'before', value: today }
            ],
            operators: []
          };
          try {
            await axiosInstance.post(API_ENDPOINTS.SAVED_FILTERS.BASE, archivFilter);
          } catch (error) {
            console.error('Fehler beim Erstellen des Archiv-Filters:', error);
          }
        }

        // Erstelle "Heute"-Filter
        if (!heuteFilterExists) {
          const heuteFilter = {
            tableId: CONSULTATIONS_TABLE_ID,
            name: 'Heute',
            conditions: [
              { column: 'startTime', operator: 'equals', value: '__TODAY__' }
            ],
            operators: []
          };
          try {
            await axiosInstance.post(API_ENDPOINTS.SAVED_FILTERS.BASE, heuteFilter);
          } catch (error) {
            console.error('Fehler beim Erstellen des Heute-Filters:', error);
          }
        }

        // Erstelle "Woche"-Filter (von heute bis heute + 7 Tage)
        if (!wocheFilterExists) {
          const wocheFilter = {
            tableId: CONSULTATIONS_TABLE_ID,
            name: 'Woche',
            conditions: [
              { column: 'startTime', operator: 'after', value: '__TODAY__' },
              { column: 'startTime', operator: 'before', value: '__WEEK_FROM_TODAY__' }
            ],
            operators: ['AND']
          };
          try {
            await axiosInstance.post(API_ENDPOINTS.SAVED_FILTERS.BASE, wocheFilter);
          } catch (error) {
            console.error('Fehler beim Erstellen des Woche-Filters:', error);
          }
        }

        // Erstelle "Nicht abgerechnet"-Filter
        if (!nichtAbgerechnetFilterExists) {
          const nichtAbgerechnetFilter = {
            tableId: CONSULTATIONS_TABLE_ID,
            name: 'Nicht abgerechnet',
            conditions: [
              { column: 'invoiceStatus', operator: 'equals', value: 'nicht abgerechnet' }
            ],
            operators: []
          };
          try {
            await axiosInstance.post(API_ENDPOINTS.SAVED_FILTERS.BASE, nichtAbgerechnetFilter);
          } catch (error) {
            console.error('Fehler beim Erstellen des Nicht abgerechnet-Filters:', error);
          }
        }
      } catch (error) {
        console.error('Fehler beim Erstellen der Standard-Filter:', error);
      }
    };

    createStandardFilters();
  }, []); // Nur einmal beim ersten Laden

  // Aktualisiere bestehende Filter die alte statische Datumswerte haben
  useEffect(() => {
    const updateExistingFilters = async () => {
      try {
        const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(CONSULTATIONS_TABLE_ID));
        const existingFilters = response.data;

        // Finde "Heute" Filter mit statischem Datum
        const heuteFilter = existingFilters.find((filter: any) => filter.name === 'Heute');
        if (heuteFilter && heuteFilter.conditions.length > 0) {
          const condition = heuteFilter.conditions[0];
          // Prüfe ob es ein statisches Datum ist (Format: YYYY-MM-DD) anstatt unseres Markers
          if (condition.value && condition.value !== '__TODAY__' && /^\d{4}-\d{2}-\d{2}$/.test(condition.value)) {
            console.log('Aktualisiere Heute-Filter mit dynamischem Marker...');
            await axiosInstance.post(API_ENDPOINTS.SAVED_FILTERS.BASE, {
              tableId: CONSULTATIONS_TABLE_ID,
              name: 'Heute',
              conditions: [
                { column: 'startTime', operator: 'equals', value: '__TODAY__' }
              ],
              operators: []
            });
          }
        }

        // Finde "Woche" Filter mit statischen Datums
        const wocheFilter = existingFilters.find((filter: any) => filter.name === 'Woche');
        if (wocheFilter && wocheFilter.conditions.length >= 2) {
          const firstCondition = wocheFilter.conditions[0];
          const secondCondition = wocheFilter.conditions[1];
          
          // Prüfe ob es statische Datumsangaben sind
          const hasStaticDates = (
            firstCondition.value !== '__TODAY__' && /^\d{4}-\d{2}-\d{2}$/.test(firstCondition.value)
          ) || (
            secondCondition.value !== '__WEEK_FROM_TODAY__' && /^\d{4}-\d{2}-\d{2}$/.test(secondCondition.value)
          );

          if (hasStaticDates) {
            console.log('Aktualisiere Woche-Filter mit dynamischen Markern...');
            await axiosInstance.post(API_ENDPOINTS.SAVED_FILTERS.BASE, {
              tableId: CONSULTATIONS_TABLE_ID,
              name: 'Woche',
              conditions: [
                { column: 'startTime', operator: 'after', value: '__TODAY__' },
                { column: 'startTime', operator: 'before', value: '__WEEK_FROM_TODAY__' }
              ],
              operators: ['AND']
            });
          }
        }
      } catch (error) {
        console.error('Fehler beim Aktualisieren bestehender Filter:', error);
      }
    };

    // Nach kurzer Verzögerung ausführen, damit die Standard-Filter-Erstellung abgeschlossen ist
    const timeoutId = setTimeout(() => {
      updateExistingFilters();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, []); // Nur einmal beim ersten Laden

  // Separater Effect für Client-Filter-Management
  useEffect(() => {
    const updateClientFilters = async () => {
      if (recentClients.length === 0) return; // Warte bis Recent Clients geladen sind
      
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Hole aktuelle Filter
        const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(CONSULTATIONS_TABLE_ID));
        const existingFilters = response.data;

        // Finde alle bestehenden Client-Filter (alle Filter außer den Standard-Filtern)
        const existingClientFilters = existingFilters.filter((filter: any) => 
          !['Archiv', 'Heute', 'Woche'].includes(filter.name)
        );
        
        // Aktuelle Recent Client Namen
        const currentRecentClientNames = recentClients.map(client => client.name);
        
        // Lösche veraltete Client-Filter (die nicht mehr in Recent Clients sind)
        for (const existingFilter of existingClientFilters) {
          if (!currentRecentClientNames.includes(existingFilter.name)) {
            try {
              await axiosInstance.delete(API_ENDPOINTS.SAVED_FILTERS.BY_ID(existingFilter.id));
              console.log(`Veralteter Client-Filter gelöscht: ${existingFilter.name}`);
            } catch (error) {
              console.error(`Fehler beim Löschen des veralteten Client-Filters ${existingFilter.name}:`, error);
            }
          }
        }
        
        // Erstelle neue Client-Filter für aktuelle Recent Clients
        for (const client of recentClients) {
          const clientFilterName = client.name;
          const clientFilterExists = existingFilters.some((filter: any) => filter.name === clientFilterName);
          
          if (!clientFilterExists) {
            const clientFilter = {
              tableId: CONSULTATIONS_TABLE_ID,
              name: clientFilterName,
              conditions: [
                { column: 'client', operator: 'equals', value: client.name }
              ],
              operators: []
            };
            await axiosInstance.post(API_ENDPOINTS.SAVED_FILTERS.BASE, clientFilter);
            console.log(`Neuer Client-Filter erstellt: ${clientFilterName}`);
          }
        }
      } catch (error) {
        console.error('Fehler beim Aktualisieren der Client-Filter:', error);
      }
    };

    // Debounce um Race Conditions zu vermeiden
    const timeoutId = setTimeout(() => {
      updateClientFilters();
    }, 500);

    return () => clearTimeout(timeoutId);
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
      await consultationApi.updateConsultationNotes(consultationId, { notes });
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
      /* TIMEZONE-PROBLEM BEHOBEN:
       * 
       * PROBLEM: Doppelte Timezone-Konvertierung!
       * - DB-Zeit: "2025-05-31T11:35:33.542Z" (UTC)
       * - new Date() konvertiert automatisch: 11:35 UTC → 06:35 lokale Zeit
       * - getTimezoneOffset-Addition: 06:35 + 5h = 11:35 lokale Zeit
       * - Aber datetime-local zeigt: 16:35 (FALSCH!)
       * 
       * LÖSUNG: UTC-Zeit direkt verwenden ohne zusätzliche Konvertierung
       * - DB-Zeit "11:35 UTC" soll im Input als "11:35" angezeigt werden
       * - Keine getTimezoneOffset-Addition nötig!
       */
      
      // ✅ KORREKT: Direkte UTC-Zeit-Nutzung ohne doppelte Konvertierung
      const dbTime = new Date(currentTime);
      
      // Verwende die UTC-Komponenten direkt für datetime-local Input
      const year = dbTime.getUTCFullYear();
      const month = String(dbTime.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dbTime.getUTCDate()).padStart(2, '0');
      const hours = String(dbTime.getUTCHours()).padStart(2, '0');
      const minutes = String(dbTime.getUTCMinutes()).padStart(2, '0');
      
      const inputValue = `${year}-${month}-${day}T${hours}:${minutes}`;
      
      console.log('🔧 DEBUG handleTimeEdit (KORRIGIERT):');
      console.log('- DB Zeit (UTC):', currentTime);
      console.log('- Extrahierte UTC-Komponenten:', `${hours}:${minutes}`);
      console.log('- inputValue für datetime-local:', inputValue);
      
      setEditingTimeValue(inputValue);
    }
  };

  /* CLAUDE-ANCHOR: CONSULTATION-TIME-SAVE-001 - Timezone-sichere Zeitspeicherung */
  const handleTimeSave = async (consultationId: number) => {
    if (!editingTimeType || !editingTimeValue) return;
    
    try {
      /* KONSISTENTE API-ARCHITEKTUR:
       * Verwende die zentralisierte consultationApi.updateConsultationTime Funktion
       * anstatt direkter axiosInstance Calls für bessere Wartbarkeit und Testbarkeit
       */
      
      // ✅ KORREKT: Datetime-local Input direkt als UTC verwenden
      const timeString = `${editingTimeValue}:00.000Z`;  // "2025-05-31T11:35:00.000Z"
      
      console.log('🔧 DEBUG handleTimeSave (REFACTORED):');
      console.log('- editingTimeValue (Input):', editingTimeValue);
      console.log('- timeString für API (UTC):', timeString);
      console.log('- editingTimeType:', editingTimeType);
      
      // ✅ REFACTORED: Verwende zentralisierte API-Funktion
      const response = await consultationApi.updateConsultationTime(consultationId, {
        [editingTimeType]: timeString
      });
      
      setConsultations(prev => 
        prev.map(consultation => 
          consultation.id === consultationId 
            ? { ...consultation, [editingTimeType]: timeString }
            : consultation
        )
      );
      
      toast.success('Zeit aktualisiert');
      setEditingTimeId(null);
      setEditingTimeType(null);
      setEditingTimeValue('');
    } catch (error: any) {
      console.error('Fehler beim Aktualisieren der Zeit:', error);
      toast.error(`Fehler beim Aktualisieren der Zeit: ${error.response?.data?.message || error.message}`);
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
    onConsultationChange?.();
  };

  // Prüfung ob Rechnung erstellt werden kann
  const canCreateInvoice = () => {
    // Prüfe zuerst die Berechtigung
    const canCreate = hasPermission('invoice_create', 'write', 'button');
    if (!canCreate) return false;
    
    const hasConsultations = filteredConsultations.length > 0;
    if (!hasConsultations) return false;
    
    // Filter müssen aktiv sein (außer Standard-Filter)
    const hasActiveFilters = filterConditions.length > 0 || searchTerm.trim() !== '';
    if (!hasActiveFilters) return false;
    
    // Alle Beratungen müssen abgeschlossen sein (endTime vorhanden)
    const allCompleted = filteredConsultations.every(c => c.endTime);
    if (!allCompleted) return false;
    
    // Keine bereits abgerechneten Beratungen
    const hasInvoicedConsultations = filteredConsultations.some(c => isConsultationInvoiced(c));
    if (hasInvoicedConsultations) return false;
    
    return true;
  };

  const handleCreateInvoice = () => {
    setShowCreateInvoiceModal(true);
  };

  const handleDeleteConsultation = async (consultationId: number) => {
    // Bestätigungsdialog
    if (!window.confirm('Sind Sie sicher, dass Sie diese Beratung löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }

    try {
      await consultationApi.deleteConsultation(consultationId);
      
      // Entferne die Beratung aus der lokalen Liste
      setConsultations(prev => prev.filter(consultation => consultation.id !== consultationId));
      
      toast.success('Beratung erfolgreich gelöscht');
      
      // Informiere die übergeordnete Komponente über die Änderung
      onConsultationChange?.();
    } catch (error: any) {
      console.error('Fehler beim Löschen der Beratung:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Löschen der Beratung';
      toast.error(errorMessage);
    }
  };

  const applyFiltersAndSearch = useCallback((consultations: Consultation[]) => {
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
              let filterDate = String(condition.value);
              
              // Dynamische Datums-Marker verarbeiten
              if (filterDate === '__TODAY__') {
                // ✅ KORREKT: Lokale Zeit verwenden (Timezone-Dokumentation befolgen)
                const localToday = new Date();
                const correctedToday = new Date(localToday.getTime() - localToday.getTimezoneOffset() * 60000);
                filterDate = correctedToday.toISOString().split('T')[0];
              } else if (filterDate === '__WEEK_FROM_TODAY__') {
                // ✅ KORREKT: Lokale Zeit verwenden (Timezone-Dokumentation befolgen)
                const localToday = new Date();
                const correctedToday = new Date(localToday.getTime() - localToday.getTimezoneOffset() * 60000);
                const weekFromToday = new Date(correctedToday);
                weekFromToday.setDate(correctedToday.getDate() + 7); // Heute + 7 Tage
                filterDate = weekFromToday.toISOString().split('T')[0];
              }
              
              switch (condition.operator) {
                case 'after':
                  conditionResult = consultationDate >= filterDate;
                  break;
                case 'before':
                  conditionResult = consultationDate < filterDate;
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
            case 'invoiceStatus':
              const isInvoiced = isConsultationInvoiced(consultation);
              const isInMonthlyReport = isConsultationInMonthlyReport(consultation);
              const filterValueLower = String(condition.value).toLowerCase();
              
              if (filterValueLower === 'abgerechnet' || filterValueLower === 'invoiced' || filterValueLower === 'ja') {
                conditionResult = isInvoiced || isInMonthlyReport;
              } else if (filterValueLower === 'nicht abgerechnet' || filterValueLower === 'not invoiced' || filterValueLower === 'nein') {
                conditionResult = !isInvoiced && !isInMonthlyReport;
              } else if (filterValueLower === 'einzelrechnung' || filterValueLower === 'invoice') {
                conditionResult = isInvoiced;
              } else if (filterValueLower === 'monatsbericht' || filterValueLower === 'monthly report') {
                conditionResult = isInMonthlyReport;
              } else {
                // Exact status match wenn ein spezifischer Status eingegeben wurde
                if (isInvoiced) {
                  const invoiceInfo = getConsultationInvoiceInfo(consultation);
                  const statusText = invoiceInfo ? getInvoiceStatusText(invoiceInfo.status as any).toLowerCase() : '';
                  conditionResult = statusText.includes(filterValueLower);
                } else if (isInMonthlyReport) {
                  const monthlyReportInfo = getConsultationMonthlyReportInfo(consultation);
                  if (monthlyReportInfo) {
                    const statusText = monthlyReportInfo.status === 'GENERATED' ? 'erstellt' : 
                                     monthlyReportInfo.status === 'SENT' ? 'gesendet' : 'archiviert';
                    conditionResult = statusText.includes(filterValueLower);
                  } else {
                    conditionResult = false;
                  }
                } else {
                  conditionResult = false;
                }
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
  }, [consultations, searchTerm, filterConditions, filterLogicalOperators]);

  const calculateDurationInMinutes = (startTime: string, endTime: string | null): number => {
    if (!endTime) return 0;
    const start = new Date(startTime);
    const end = new Date(endTime);
    return (end.getTime() - start.getTime()) / (1000 * 60);
  };

  // Timeline-Markierungen generieren
  const generateTimelineMarkers = (consultations: Consultation[]) => {
    const markers: Array<{
      id: string;
      type: 'day' | 'midday';
      date: string;
      label: string;
      position: number; // Index position in der gefilterten Liste
    }> = [];

    consultations.forEach((consultation, index) => {
      const currentDate = new Date(consultation.startTime);
      const currentDay = format(currentDate, 'yyyy-MM-dd', { locale: de });
      const currentHour = currentDate.getUTCHours(); // UTC verwenden statt getHours()
      
      // Prüfe vorherige Beratung für Tagesübergang
      if (index > 0) {
        const prevDate = new Date(consultations[index - 1].startTime);
        const prevDay = format(prevDate, 'yyyy-MM-dd', { locale: de });
        
        if (currentDay !== prevDay) {
          markers.push({
            id: `day-${currentDay}`,
            type: 'day',
            date: currentDay,
            label: format(currentDate, 'EEE, dd.MM.', { locale: de }),
            position: index
          });
        }
      } else if (index === 0) {
        // Erste Beratung bekommt immer eine Tagesmarkierung
        markers.push({
          id: `day-${currentDay}`,
          type: 'day', 
          date: currentDay,
          label: format(currentDate, 'EEE, dd.MM.', { locale: de }),
          position: index
        });
      }

      // Prüfe für Mittag-Markierung (12:00 Übergang) - jetzt mit UTC
      if (index > 0) {
        const prevDate = new Date(consultations[index - 1].startTime);
        const prevHour = prevDate.getUTCHours(); // UTC verwenden statt getHours()
        const prevDay = format(prevDate, 'yyyy-MM-dd', { locale: de });
        
        // Mittag-Markierung nur wenn am gleichen Tag und Übergang über 12:00 UTC
        if (currentDay === prevDay && prevHour < 12 && currentHour >= 12) {
          markers.push({
            id: `midday-${currentDay}`,
            type: 'midday',
            date: currentDay,
            label: 'Mittag',
            position: index
          });
        }
      }
    });

    return markers;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredConsultations = useMemo(() => {
    return applyFiltersAndSearch(consultations).sort((a, b) => {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }, [consultations, filterConditions, filterLogicalOperators]);

  // Total-Dauer aller sichtbaren Beratungen berechnen
  const totalDuration = useMemo(() => {
    return formatTotalDuration(filteredConsultations);
  }, [filteredConsultations]);

  // Timeline-Markierungen berechnen
  const timelineMarkers = useMemo(() => {
    return generateTimelineMarkers(filteredConsultations);
  }, [filteredConsultations]);

  // Helper function to check if consultation is billed in monthly report
  const isConsultationInMonthlyReport = (consultation: Consultation): boolean => {
    return consultation.monthlyReportId !== null && consultation.monthlyReportId !== undefined;
  };

  // Helper function to get monthly report info
  const getConsultationMonthlyReportInfo = (consultation: Consultation) => {
    return consultation.monthlyReport;
  };

  // Helper function to get the billing status
  const getConsultationBillingStatus = (consultation: Consultation) => {
    const isInvoiced = isConsultationInvoiced(consultation);
    const isInMonthlyReport = isConsultationInMonthlyReport(consultation);
    
    if (isInvoiced) {
      const invoiceInfo = getConsultationInvoiceInfo(consultation);
      return {
        type: 'invoice' as const,
        status: 'Einzelrechnung',
        info: invoiceInfo
      };
    } else if (isInMonthlyReport) {
      const monthlyReportInfo = getConsultationMonthlyReportInfo(consultation);
      return {
        type: 'monthly' as const,
        status: 'Monatsbericht',
        info: monthlyReportInfo
      };
    }
    
    return null;
  };

  // Navigation functions
  const navigateToMonthlyReports = (reportId?: number) => {
    const url = reportId 
      ? `/payroll?tab=monthly-reports&reportId=${reportId}`
      : '/payroll?tab=monthly-reports';
    navigate(url);
  };

  const navigateToInvoices = (invoiceId?: number) => {
    const url = invoiceId 
      ? `/payroll?tab=invoices&invoiceId=${invoiceId}`
      : '/payroll?tab=invoices';
    navigate(url);
  };

  const navigateToTask = (taskId: number) => {
    navigate(`/worktracker?editTask=${taskId}`);
  };

  if (loading) return <div className="p-4">Lädt...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <>
      <div className="bg-white dark:bg-gray-800 sm:shadow sm:rounded-lg sm:p-6 sm:border sm:border-gray-200 sm:dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center mb-6 justify-between px-2 sm:px-0">
          <div className="flex items-center">
            <ClockIcon className="h-6 w-6 mr-2 dark:text-white" />
            <div>
              <h2 className="text-xl font-semibold dark:text-white">Beratungsliste</h2>
              {/* Total-Anzeige */}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {filteredConsultations.length} Beratung{filteredConsultations.length !== 1 ? 'en' : ''} - Total: {totalDuration}
              </p>
            </div>
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

            {/* Rechnung erstellen Button */}
            {canCreateInvoice() && (
              <button
                onClick={handleCreateInvoice}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors ml-2"
                title="Rechnung aus gefilterten Beratungen erstellen"
              >
                Rechnung erstellen
              </button>
            )}
          </div>
        </div>

        {/* Filter-Pane */}
        {isFilterPanelOpen && (
          <div className="px-2 sm:px-0">
            <FilterPane
              columns={[
                { id: 'client', label: 'Client' },
                { id: 'branch', label: 'Niederlassung' },
                { id: 'notes', label: 'Notizen' },
                { id: 'startTime', label: 'Datum' },
                { id: 'duration', label: 'Dauer (Stunden)' },
                { id: 'invoiceStatus', label: 'Abrechnungsstatus' }
              ]}
              onApply={applyFilterConditions}
              onReset={resetFilterConditions}
              savedConditions={filterConditions}
              savedOperators={filterLogicalOperators}
              tableId={CONSULTATIONS_TABLE_ID}
            />
          </div>
        )}
        
        {/* Gespeicherte Filter als Tags anzeigen */}
        <div className="px-2 sm:px-0">
          <SavedFilterTags
            tableId={CONSULTATIONS_TABLE_ID}
            onSelectFilter={applyFilterConditions}
            onReset={resetFilterConditions}
            activeFilterName={activeFilterName}
            selectedFilterId={selectedFilterId}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* Timeline + Cards Layout */}
        <div className="space-y-0.5 sm:space-y-1">
          {filteredConsultations.length === 0 ? (
            <div className="text-center py-12 px-2 sm:px-0">
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
            filteredConsultations.map((consultation, index) => {
              const dayMarker = timelineMarkers.find(m => m.type === 'day' && m.position === index);
              const middayMarker = timelineMarkers.find(m => m.type === 'midday' && m.position === index);
              
              return (
                <div key={consultation.id} className="relative">
                  {/* Tagesmarkierung über der Card */}
                  {dayMarker && (
                    <div className="flex items-center mb-3 px-2 sm:px-0">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-400 border-2 border-white dark:border-gray-800"></div>
                        <div className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {dayMarker.label}
                        </div>
                      </div>
                      <div className="flex-1 ml-4 h-px bg-gray-200 dark:bg-gray-600"></div>
                    </div>
                  )}
                  
                  {/* Mittag-Markierung */}
                  {middayMarker && (
                    <div className="flex items-center mb-3 px-2 sm:px-0">
                      <div className="flex items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"></div>
                        <div className="ml-3 text-xs text-gray-500 dark:text-gray-400">
                          {middayMarker.label}
                        </div>
                      </div>
                      <div className="flex-1 ml-4 h-px bg-gray-300 dark:bg-gray-600"></div>
                    </div>
                  )}

                  {/* Card ohne Timeline-Punkt */}
                  <div className="bg-white dark:bg-gray-800 shadow rounded-lg md:border md:border-gray-200 md:dark:border-gray-700 hover:shadow-md transition-shadow">
                    {/* Card Content - 1/3 left, 2/3 right auf allen Bildschirmgrößen */}
                    <div className="p-4">
                      <div className="grid grid-cols-3 gap-4">
                        {/* Left: Compact Info - 1/3 auf allen Bildschirmgrößen */}
                        <div className="col-span-1 space-y-3">
                          {/* Client Header */}
                          <div className="flex items-center space-x-2">
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
                          </div>

                          {/* Billing Status Indicator */}
                          {(() => {
                            const billingStatus = getConsultationBillingStatus(consultation);
                            
                            if (billingStatus) {
                              if (billingStatus.type === 'invoice') {
                                // Individual invoice
                                return (
                                  <div className="flex items-center space-x-2">
                                    <div className="flex items-center space-x-1">
                                      <DocumentTextIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                                      <button 
                                        onClick={() => navigateToInvoices(billingStatus.info?.id)}
                                        className="text-xs text-green-700 dark:text-green-400 font-medium hover:underline cursor-pointer"
                                      >
                                        Einzelrechnung
                                      </button>
                                    </div>
                                    {billingStatus.info && 'invoiceNumber' in billingStatus.info && (
                                      <div className="flex items-center space-x-1">
                                        <button
                                          onClick={() => navigateToInvoices(billingStatus.info?.id)}
                                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium hover:opacity-80 cursor-pointer ${getInvoiceStatusColor(billingStatus.info.status as any)}`}
                                          title={`Rechnung ${billingStatus.info.invoiceNumber} vom ${format(new Date(billingStatus.info.issueDate), 'dd.MM.yyyy', { locale: de })}`}
                                        >
                                          {getInvoiceStatusText(billingStatus.info.status as any)}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              } else if (billingStatus.type === 'monthly') {
                                // Monthly report
                                return (
                                  <div className="flex items-center space-x-2">
                                    <div className="flex items-center space-x-1">
                                      <ChartBarIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                                      <button 
                                        onClick={() => navigateToMonthlyReports(billingStatus.info?.id)}
                                        className="text-xs text-green-700 dark:text-green-400 font-medium hover:underline cursor-pointer"
                                      >
                                        Monatsbericht
                                      </button>
                                    </div>
                                    {billingStatus.info && 'reportNumber' in billingStatus.info && (
                                      <div className="flex items-center space-x-1">
                                        <button 
                                          onClick={() => navigateToMonthlyReports(billingStatus.info?.id)}
                                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 hover:opacity-80 cursor-pointer"
                                          title={`Monatsbericht ${billingStatus.info.reportNumber}`}
                                        >
                                          {billingStatus.info.status === 'GENERATED' ? 'Erstellt' : 
                                           billingStatus.info.status === 'SENT' ? 'Gesendet' : 'Archiviert'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            }
                            
                            return null;
                          })()}

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
                                  <button
                                    key={taskLink.id}
                                    onClick={() => navigateToTask(taskLink.task.id)}
                                    className="flex items-center text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded px-2 py-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer w-full text-left"
                                  >
                                    <LinkIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                                    <span className="truncate">{taskLink.task.title}</span>
                                  </button>
                                ))}
                                {consultation.taskLinks.length > 2 && (
                                  <button
                                    onClick={() => {
                                      // Navigate to first task if more than 2 tasks
                                      if (consultation.taskLinks && consultation.taskLinks.length > 0) {
                                        navigateToTask(consultation.taskLinks[0].task.id);
                                      }
                                    }}
                                    className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
                                  >
                                    +{consultation.taskLinks.length - 2} weitere
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right: Notes - 2/3 auf allen Bildschirmgrößen */}
                        <div className="col-span-2 relative">
                          {/* Action Icons in der rechten oberen Ecke */}
                          <div className="absolute top-0 right-0 flex items-center space-x-1 z-10">
                            {hasPermission('consultations', 'write') && (
                              <button
                                onClick={() => handleLinkTask(consultation.id)}
                                className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                                title="Task verknüpfen"
                              >
                                <LinkIcon className="h-4 w-4" />
                              </button>
                            )}
                            {hasPermission('consultations', 'write') && consultation.endTime && (
                              <button
                                onClick={() => handleDeleteConsultation(consultation.id)}
                                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                                title="Beratung löschen"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          
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
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Link Task Modal */}
      {linkTaskModalOpen && selectedConsultationId && (
        <LinkTaskModal
          isOpen={linkTaskModalOpen}
          onClose={() => {
            setLinkTaskModalOpen(false);
            setSelectedConsultationId(null);
          }}
          consultationId={selectedConsultationId}
          onTaskLinked={handleTaskLinked}
        />
      )}

      {/* Create Invoice Modal */}
      {showCreateInvoiceModal && (
        <CreateInvoiceModal
          isOpen={showCreateInvoiceModal}
          onClose={() => setShowCreateInvoiceModal(false)}
          consultations={filteredConsultations}
          onInvoiceCreated={(invoiceId) => {
            setShowCreateInvoiceModal(false);
            loadConsultations(); // Refresh list
            toast.success(`Rechnung erstellt! PDF kann in der Rechnungsverwaltung heruntergeladen werden.`);
          }}
        />
      )}
    </>
  );
});

export default ConsultationList; 