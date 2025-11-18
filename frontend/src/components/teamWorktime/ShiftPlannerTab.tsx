import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarIcon, PlusIcon, ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import axiosInstance from '../../config/axios.ts';
import { API_ENDPOINTS } from '../../config/api.ts';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parse } from 'date-fns';
import { useAuth } from '../../hooks/useAuth.tsx';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput } from '@fullcalendar/core';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<'timeGridWeek' | 'dayGridMonth'>('timeGridWeek');
  const calendarRef = useRef<FullCalendar>(null);
  
  // Lade Schichten für die aktuelle Woche
  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Montag
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 }); // Sonntag
      
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
        setShifts(Array.isArray(shiftsData) ? shiftsData : []);
        console.log('[ShiftPlanner] Loaded shifts:', shiftsData.length);
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
  }, [currentWeek, t]);
  
  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);
  
  const handlePreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };
  
  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };
  
  const handleToday = () => {
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
    // TODO: Modal zum Bearbeiten der Schicht öffnen
  };
  
  // Handler für Datum-Klicks (neue Schicht erstellen)
  const handleDateClick = (dateClickInfo: any) => {
    console.log('Date clicked:', dateClickInfo.date);
    // TODO: Modal zum Erstellen einer neuen Schicht öffnen
  };
  
  // Handler für View-Änderung
  const handleDatesSet = (dateInfo: any) => {
    // Aktualisiere currentWeek basierend auf der angezeigten Woche
    const currentView = calendarRef.current?.getApi().view.type;
    if (currentView === 'timeGridWeek') {
      setCurrentWeek(dateInfo.start);
    }
    // Aktualisiere auch die calendarView, falls der Benutzer die View im Kalender selbst ändert
    if (currentView && currentView !== calendarView) {
      setCalendarView(currentView as 'timeGridWeek' | 'dayGridMonth');
    }
  };
  
  return (
    <div>
      {/* Header mit Woche-Navigation */}
      <div className="flex items-center justify-between mb-4 px-3 sm:px-4 md:px-6">
        {/* Linke Seite: Add-Button */}
        <div className="flex items-center">
          <div className="relative group">
            <button
              type="button"
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
        
        {/* Rechte Seite: Refresh-Button */}
        <div className="flex items-center">
          <div className="relative group ml-1">
            <button
              type="button"
              onClick={fetchShifts}
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
          
          {/* FullCalendar */}
          <div className="fullcalendar-container">
            <FullCalendar
              ref={calendarRef}
              plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
              initialView={calendarView}
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
    </div>
  );
};

export default ShiftPlannerTab;

