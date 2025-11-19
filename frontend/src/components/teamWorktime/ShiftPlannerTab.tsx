import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarIcon, PlusIcon, ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, Squares2X2Icon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../../config/axios.ts';
import { API_ENDPOINTS } from '../../config/api.ts';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parse } from 'date-fns';
import { useAuth } from '../../hooks/useAuth.tsx';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput } from '@fullcalendar/core';
import CreateShiftModal from './CreateShiftModal.tsx';
import EditShiftModal from './EditShiftModal.tsx';
import GenerateShiftPlanModal from './GenerateShiftPlanModal.tsx';
import SwapRequestList from './SwapRequestList.tsx';
import ShiftTemplateManagement from './ShiftTemplateManagement.tsx';
import AvailabilityManagement from './AvailabilityManagement.tsx';
// FullCalendar v6 CSS - Import über CDN in index.html oder direkt hier

interface ShiftPlannerTabProps {
  selectedDate?: string;
}

interface Shift {
  id: number;
  shiftTemplateId: number;
  branchId: number;
  roleId: number;
  userId: number | null;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'swapped';
  notes?: string;
  shiftTemplate?: {
    id: number;
    name: string;
    startTime: string;
    endTime: string;
  };
  branch?: {
    id: number;
    name: string;
  };
  role?: {
    id: number;
    name: string;
  };
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

const ShiftPlannerTab: React.FC<ShiftPlannerTabProps> = ({ selectedDate }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [allShifts, setAllShifts] = useState<Shift[]>([]); // Alle geladenen Schichten (vor Filterung)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<'timeGridWeek' | 'dayGridMonth'>('timeGridWeek');
  const calendarRef = useRef<FullCalendar>(null);
  const isProgrammaticNavigation = useRef(false);
  
  // Filter States
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>([]);
  const [roles, setRoles] = useState<Array<{ id: number; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: number; firstName: string; lastName: string }>>([]);
  
  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isSwapListOpen, setIsSwapListOpen] = useState(false);
  const [isTemplateManagementOpen, setIsTemplateManagementOpen] = useState(false);
  const [isAvailabilityManagementOpen, setIsAvailabilityManagementOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [createModalInitialDate, setCreateModalInitialDate] = useState<Date | undefined>(undefined);
  
  // Lade Schichten für die aktuelle Woche
  const fetchShifts = useCallback(async (week: Date) => {
    try {
      setLoading(true);
      setError(null);
      
      const weekStart = startOfWeek(week, { weekStartsOn: 1 }); // Montag
      const weekEnd = endOfWeek(week, { weekStartsOn: 1 }); // Sonntag
      
      const url = API_ENDPOINTS.SHIFTS.BASE;
      const params = {
        startDate: format(weekStart, 'yyyy-MM-dd'),
        endDate: format(weekEnd, 'yyyy-MM-dd')
      };
      
      console.log('[ShiftPlanner] Fetching shifts from:', url);
      console.log('[ShiftPlanner] Params:', params);
      console.log('[ShiftPlanner] Full URL:', `${axiosInstance.defaults.baseURL}${url}`);
      
      const response = await axiosInstance.get(url, { params });
      
      console.log('[ShiftPlanner] Response status:', response.status);
      console.log('[ShiftPlanner] Response data:', response.data);
      
      // Prüfe verschiedene Response-Formate
      if (response.data && response.data.success !== false) {
        // Wenn success: true oder success nicht vorhanden, aber data vorhanden
        const shiftsData = response.data.data || response.data || [];
        const shiftsArray = Array.isArray(shiftsData) ? shiftsData : [];
        setAllShifts(shiftsArray); // Speichere alle Schichten
        console.log('[ShiftPlanner] Loaded shifts:', shiftsArray.length);
      } else {
        const errorMsg = response.data?.message || t('teamWorktime.shifts.messages.loadError');
        console.error('[ShiftPlanner] Error in response:', errorMsg);
        setError(errorMsg);
      }
    } catch (error: any) {
      console.error('[ShiftPlanner] Fehler beim Laden der Schichten:', error);
      console.error('[ShiftPlanner] Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: error.config ? `${error.config.baseURL}${error.config.url}` : 'unknown'
      });
      
      // Detaillierte Fehlerbehandlung
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 404) {
          console.error('[ShiftPlanner] 404 - Route nicht gefunden. URL:', error.config?.url);
          setError(t('teamWorktime.shifts.messages.routeNotFound'));
        } else if (status === 401) {
          console.error('[ShiftPlanner] 401 - Nicht authentifiziert');
          setError(t('teamWorktime.shifts.messages.unauthorized'));
        } else if (status === 403) {
          console.error('[ShiftPlanner] 403 - Keine Berechtigung');
          setError(t('teamWorktime.shifts.messages.forbidden'));
        } else {
          const errorMsg = data?.message || error.message || t('teamWorktime.shifts.messages.loadError');
          console.error('[ShiftPlanner] Anderer Fehler:', status, errorMsg);
          setError(errorMsg);
        }
      } else if (error.request) {
        console.error('[ShiftPlanner] Keine Response erhalten. Request:', error.request);
        setError(t('teamWorktime.shifts.messages.loadError') + ' (Keine Verbindung zum Server)');
      } else {
        console.error('[ShiftPlanner] Fehler beim Setup der Request:', error.message);
        setError(error.message || t('teamWorktime.shifts.messages.loadError'));
      }
    } finally {
      setLoading(false);
    }
  }, [t]); // currentWeek NICHT als Dependency - wird als Parameter übergeben
  
  useEffect(() => {
    fetchShifts(currentWeek);
  }, [currentWeek, fetchShifts]);
  
  // Lade Branches, Rollen und User für Filter
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [branchesRes, rolesRes, usersRes] = await Promise.all([
          axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE),
          axiosInstance.get(API_ENDPOINTS.ROLES.BASE),
          axiosInstance.get(API_ENDPOINTS.USERS.DROPDOWN)
        ]);
        
        setBranches(branchesRes.data || []);
        setRoles(rolesRes.data || []);
        setUsers(usersRes.data || []);
      } catch (err) {
        console.error('Fehler beim Laden der Filter-Daten:', err);
      }
    };
    
    fetchFilterData();
  }, []);
  
  // Filtere Schichten basierend auf ausgewählten Filtern
  useEffect(() => {
    let filtered = [...allShifts];
    
    if (selectedBranchIds.length > 0) {
      filtered = filtered.filter(shift => selectedBranchIds.includes(shift.branchId));
    }
    
    if (selectedRoleIds.length > 0) {
      filtered = filtered.filter(shift => selectedRoleIds.includes(shift.roleId));
    }
    
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(shift => selectedStatuses.includes(shift.status));
    }
    
    if (selectedUserIds.length > 0) {
      filtered = filtered.filter(shift => shift.userId && selectedUserIds.includes(shift.userId));
    }
    
    setShifts(filtered);
  }, [allShifts, selectedBranchIds, selectedRoleIds, selectedStatuses, selectedUserIds]);
  
  const handlePreviousWeek = () => {
    isProgrammaticNavigation.current = true;
    setCurrentWeek(subWeeks(currentWeek, 1));
  };
  
  const handleNextWeek = () => {
    isProgrammaticNavigation.current = true;
    setCurrentWeek(addWeeks(currentWeek, 1));
  };
  
  const handleToday = () => {
    isProgrammaticNavigation.current = true;
    setCurrentWeek(new Date());
  };
  
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  
  // Konvertiere Schichten zu FullCalendar-Events
  const calendarEvents = useMemo<EventInput[]>(() => {
    return shifts.map((shift) => {
      // startTime und endTime sind bereits vollständige DateTime-Objekte
      const startDateTime = new Date(shift.startTime);
      const endDateTime = new Date(shift.endTime);
      
      // Bestimme Farbe basierend auf Status
      let backgroundColor = '#3b82f6'; // Blau (scheduled)
      if (shift.status === 'confirmed') {
        backgroundColor = '#10b981'; // Grün
      } else if (shift.status === 'cancelled') {
        backgroundColor = '#ef4444'; // Rot
      } else if (shift.status === 'swapped') {
        backgroundColor = '#f59e0b'; // Orange
      }
      
      return {
        id: shift.id.toString(),
        title: shift.user 
          ? `${shift.shiftTemplate?.name || 'Schicht'} - ${shift.user.firstName} ${shift.user.lastName}`
          : `${shift.shiftTemplate?.name || 'Schicht'} - Nicht zugewiesen`,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        backgroundColor,
        borderColor: backgroundColor,
        extendedProps: {
          shift,
        },
      };
    });
  }, [shifts]);
  
  // Handler für Event-Klicks
  const handleEventClick = (clickInfo: any) => {
    const shift = clickInfo.event.extendedProps.shift;
    console.log('Shift clicked:', shift);
    setSelectedShift(shift);
    setIsEditModalOpen(true);
  };
  
  // Handler für Datum-Klicks (neue Schicht erstellen)
  const handleDateClick = (dateClickInfo: any) => {
    console.log('Date clicked:', dateClickInfo.date);
    setCreateModalInitialDate(dateClickInfo.date);
    setIsCreateModalOpen(true);
  };
  
  // Handler für Add-Button
  const handleAddClick = () => {
    setCreateModalInitialDate(currentWeek);
    setIsCreateModalOpen(true);
  };
  
  // Handler für Schicht erstellt
  const handleShiftCreated = (newShift: Shift) => {
    // Füge neue Schicht zur Liste hinzu
    setShifts(prev => [...prev, newShift]);
    // Optional: Daten neu laden für Konsistenz
    fetchShifts(currentWeek);
  };
  
  // Handler für Schicht aktualisiert
  const handleShiftUpdated = (updatedShift: Shift) => {
    // Aktualisiere Schicht in der Liste
    setShifts(prev => prev.map(s => s.id === updatedShift.id ? updatedShift : s));
    // Optional: Daten neu laden für Konsistenz
    fetchShifts(currentWeek);
  };
  
  // Handler für Schicht gelöscht
  const handleShiftDeleted = (shiftId: number) => {
    // Entferne Schicht aus der Liste
    setShifts(prev => prev.filter(s => s.id !== shiftId));
    // Optional: Daten neu laden für Konsistenz
    fetchShifts(currentWeek);
  };
  
  // Handler für Schichtplan generiert
  const handlePlanGenerated = () => {
    // Lade Daten neu, um generierte Schichten anzuzeigen
    fetchShifts(currentWeek);
  };
  
  // Handler für Generate-Button
  const handleGenerateClick = () => {
    setIsGenerateModalOpen(true);
  };
  
  // Handler für View-Änderung
  const handleDatesSet = (dateInfo: any) => {
    const currentView = calendarRef.current?.getApi().view.type;
    
    // Aktualisiere calendarView, falls der Benutzer die View im Kalender selbst ändert
    if (currentView && currentView !== calendarView) {
      setCalendarView(currentView as 'timeGridWeek' | 'dayGridMonth');
    }
    
    // Aktualisiere currentWeek nur bei timeGridWeek-View, nur wenn sich die Woche wirklich geändert hat,
    // und nur wenn die Navigation NICHT programmatisch war (z.B. von unseren Buttons)
    if (currentView === 'timeGridWeek' && !isProgrammaticNavigation.current) {
      const newWeekStart = startOfWeek(dateInfo.start, { weekStartsOn: 1 });
      const currentWeekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
      
      // Nur aktualisieren, wenn sich die Woche wirklich geändert hat (verhindert Loop)
      if (newWeekStart.getTime() !== currentWeekStart.getTime()) {
        setCurrentWeek(dateInfo.start);
      }
    }
    
    // Ref zurücksetzen nach jeder datesSet-Event
    isProgrammaticNavigation.current = false;
  };
  
  const getActiveFilterCount = () => {
    return selectedBranchIds.length + selectedRoleIds.length + selectedStatuses.length + selectedUserIds.length;
  };
  
  const resetFilters = () => {
    setSelectedBranchIds([]);
    setSelectedRoleIds([]);
    setSelectedStatuses([]);
    setSelectedUserIds([]);
  };
  
  const statusOptions = [
    { value: 'scheduled', label: t('teamWorktime.shifts.status.scheduled') },
    { value: 'confirmed', label: t('teamWorktime.shifts.status.confirmed') },
    { value: 'cancelled', label: t('teamWorktime.shifts.status.cancelled') },
    { value: 'swapped', label: t('teamWorktime.shifts.status.swapped') }
  ];
  
  return (
    <div>
      {/* Header mit Woche-Navigation */}
      <div className="flex items-center justify-between mb-4 px-3 sm:px-4 md:px-6">
        {/* Linke Seite: Add-Button */}
        <div className="flex items-center">
          <div className="relative group">
            <button
              type="button"
              onClick={handleAddClick}
              className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm flex items-center justify-center"
              style={{ width: '30.19px', height: '30.19px' }}
              aria-label={t('teamWorktime.shifts.actions.add')}
            >
              <PlusIcon className="h-4 w-4" />
            </button>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
              {t('teamWorktime.shifts.actions.add')}
            </div>
          </div>
        </div>
        
        {/* Mitte: Woche-Navigation */}
        <div className="flex items-center gap-0.5">
          {/* Links-Pfeil (zurück) */}
          <div className="relative group">
            <button
              type="button"
              onClick={handlePreviousWeek}
              className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
              {t('common.previousDay')}
            </div>
          </div>
          
          {/* Woche-Anzeige */}
          <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white px-2 sm:px-3">
            {format(weekStart, 'dd.MM.yyyy')} - {format(weekEnd, 'dd.MM.yyyy')}
          </div>
          
          {/* Rechts-Pfeil (vorwärts) */}
          <div className="relative group">
            <button
              type="button"
              onClick={handleNextWeek}
              className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
              {t('common.nextDay')}
            </div>
          </div>
          
          {/* Heute-Button */}
          <div className="relative group ml-1">
            <button
              type="button"
              onClick={handleToday}
              className="p-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
              {t('common.today')}
            </div>
          </div>
        </div>
        
        {/* Rechte Seite: Filter, Availabilities, Templates, Swap List, Generate & Refresh Buttons */}
        <div className="flex items-center gap-1">
          {/* Filter Button */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`p-2 rounded-md ${getActiveFilterCount() > 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'} focus:outline-none focus:ring-2 focus:ring-blue-500 relative`}
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
          
          {/* Availabilities Button */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setIsAvailabilityManagementOpen(true)}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </button>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
              {t('teamWorktime.shifts.availabilities.title')}
            </div>
          </div>
          
          {/* Templates Button */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setIsTemplateManagementOpen(true)}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
              {t('teamWorktime.shifts.templates.title')}
            </div>
          </div>
          
          {/* Swap List Button */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setIsSwapListOpen(true)}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
              {t('teamWorktime.shifts.swapList.title')}
            </div>
          </div>
          
          {/* Generate Button */}
          <div className="relative group">
            <button
              type="button"
              onClick={handleGenerateClick}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
              {t('teamWorktime.shifts.actions.generate')}
            </div>
          </div>
          
          {/* Refresh Button */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => fetchShifts(currentWeek)}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
              {t('common.refresh')}
            </div>
          </div>
        </div>
      </div>
      
      {/* Fehlermeldung */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Kalender-Ansicht */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600 dark:text-gray-400">{t('teamWorktime.shifts.messages.loading')}</div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          {/* View-Toggle */}
          <div className="flex justify-end mb-4">
            <div className="inline-flex rounded-md shadow-sm gap-1" role="group">
              <button
                onClick={() => {
                  setCalendarView('timeGridWeek');
                  calendarRef.current?.getApi().changeView('timeGridWeek');
                }}
                className={`p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  calendarView === 'timeGridWeek'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
                title={t('common.week', 'Woche')}
              >
                <CalendarIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  setCalendarView('dayGridMonth');
                  calendarRef.current?.getApi().changeView('dayGridMonth');
                }}
                className={`p-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  calendarView === 'dayGridMonth'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
                title={t('common.month', 'Monat')}
              >
                <Squares2X2Icon className="h-5 w-5" />
              </button>
        </div>
      </div>
      
      {/* Filter-Panel */}
      {isFilterPanelOpen && (
        <div className="mb-4 px-3 sm:px-4 md:px-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('teamWorktime.shifts.filters.title')}
              </h3>
              <button
                onClick={() => setIsFilterPanelOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Branch Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('teamWorktime.shifts.filters.branch')}
                </label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700">
                  {branches.map((branch) => (
                    <label key={branch.id} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        checked={selectedBranchIds.includes(branch.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBranchIds([...selectedBranchIds, branch.id]);
                          } else {
                            setSelectedBranchIds(selectedBranchIds.filter(id => id !== branch.id));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{branch.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Role Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('teamWorktime.shifts.filters.role')}
                </label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700">
                  {roles.map((role) => (
                    <label key={role.id} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        checked={selectedRoleIds.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoleIds([...selectedRoleIds, role.id]);
                          } else {
                            setSelectedRoleIds(selectedRoleIds.filter(id => id !== role.id));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{role.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('teamWorktime.shifts.filters.status')}
                </label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700">
                  {statusOptions.map((status) => (
                    <label key={status.value} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(status.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStatuses([...selectedStatuses, status.value]);
                          } else {
                            setSelectedStatuses(selectedStatuses.filter(s => s !== status.value));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{status.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* User Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('teamWorktime.shifts.filters.user')}
                </label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700">
                  {users.map((user) => (
                    <label key={user.id} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUserIds([...selectedUserIds, user.id]);
                          } else {
                            setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{user.firstName} {user.lastName}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Filter Actions */}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={resetFilters}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {t('teamWorktime.shifts.filters.reset')}
              </button>
              <button
                onClick={() => setIsFilterPanelOpen(false)}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                {t('common.apply')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* FullCalendar */}
          <div className="fullcalendar-container">
            <FullCalendar
              ref={calendarRef}
              plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
              initialView={calendarView}
              initialDate={currentWeek}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: '',
              }}
              locale="de"
              firstDay={1} // Montag
              weekNumbers={true}
              weekNumberCalculation="ISO"
              slotMinTime="00:00:00"
              slotMaxTime="24:00:00"
              slotDuration="01:00:00"
              slotLabelInterval="01:00:00"
              allDaySlot={false}
              height="auto"
              events={calendarEvents}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              datesSet={handleDatesSet}
              eventDisplay="block"
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }}
              slotLabelFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }}
              eventClassNames="cursor-pointer"
              eventContent={(eventInfo) => {
                const shift = eventInfo.event.extendedProps.shift;
                return (
                  <div className="p-1 text-xs">
                    <div className="font-semibold truncate">
                      {shift.shiftTemplate?.name || 'Schicht'}
                    </div>
                    {shift.user && (
                      <div className="truncate text-gray-600 dark:text-gray-300">
                        {shift.user.firstName} {shift.user.lastName}
                      </div>
                    )}
                    {!shift.user && (
                      <div className="text-gray-500 dark:text-gray-400 italic">
                        {t('teamWorktime.shifts.legend.unassigned')}
                      </div>
                    )}
                  </div>
                );
              }}
            />
          </div>
          
          {/* Legende */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
              <span className="text-gray-700 dark:text-gray-300">{t('teamWorktime.shifts.legend.scheduled')}</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
              <span className="text-gray-700 dark:text-gray-300">{t('teamWorktime.shifts.legend.confirmed')}</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
              <span className="text-gray-700 dark:text-gray-300">{t('teamWorktime.shifts.legend.cancelled')}</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-orange-500 rounded mr-2"></div>
              <span className="text-gray-700 dark:text-gray-300">{t('teamWorktime.shifts.legend.swapped')}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Modals */}
      <CreateShiftModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateModalInitialDate(undefined);
        }}
        onShiftCreated={handleShiftCreated}
        initialDate={createModalInitialDate}
      />
      
      {selectedShift && (
        <EditShiftModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedShift(null);
          }}
          onShiftUpdated={handleShiftUpdated}
          onShiftDeleted={handleShiftDeleted}
          shift={selectedShift}
        />
      )}
      
      {/* Generate Shift Plan Modal */}
      <GenerateShiftPlanModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onPlanGenerated={handlePlanGenerated}
        initialStartDate={startOfWeek(currentWeek, { weekStartsOn: 1 })}
        initialEndDate={endOfWeek(currentWeek, { weekStartsOn: 1 })}
      />
      
      {/* Swap Request List */}
      <SwapRequestList
        isOpen={isSwapListOpen}
        onClose={() => setIsSwapListOpen(false)}
        onSwapRequestUpdated={() => {
          fetchShifts(currentWeek); // Lade Schichten neu, da sich Status geändert haben könnte
        }}
      />
      
      {/* Template Management */}
      <ShiftTemplateManagement
        isOpen={isTemplateManagementOpen}
        onClose={() => setIsTemplateManagementOpen(false)}
      />
      
      {/* Availability Management */}
      <AvailabilityManagement
        isOpen={isAvailabilityManagementOpen}
        onClose={() => setIsAvailabilityManagementOpen(false)}
      />
    </div>
  );
};

export default ShiftPlannerTab;

