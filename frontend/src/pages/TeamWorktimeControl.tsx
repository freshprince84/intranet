import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { UsersIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { format } from 'date-fns';
import ActiveUsersList from '../components/teamWorktime/ActiveUsersList.tsx';
import TodoAnalyticsTab from '../components/teamWorktime/TodoAnalyticsTab.tsx';
import RequestAnalyticsTab from '../components/teamWorktime/RequestAnalyticsTab.tsx';
import ShiftPlannerTab from '../components/teamWorktime/ShiftPlannerTab.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';

type TabType = 'worktimes' | 'shifts' | 'todos' | 'requests';

const TeamWorktimeControl: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  
  // Prüfe Berechtigungen - beide werden benötigt
  const hasPagePermission = hasPermission('team_worktime_control', 'read', 'page');
  const hasTablePermission = hasPermission('team_worktime', 'read', 'table');
  const hasRequiredPermissions = hasPagePermission && hasTablePermission;
  
  // State für aktive Benutzer und Zeiterfassungen
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [allWorktimes, setAllWorktimes] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState<TabType>('worktimes');
  
  // State für Lade- und Fehlerzustände
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ MEMORY: Cleanup - Alle großen Arrays beim Unmount löschen
  useEffect(() => {
    return () => {
      setActiveUsers([]);
      setAllWorktimes([]);
    };
  }, []); // Nur beim Unmount ausführen
  
  // Funktion zum Abrufen der aktiven Benutzer
  const fetchActiveUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axiosInstance.get(API_ENDPOINTS.TEAM_WORKTIME.ACTIVE);
      setActiveUsers(response.data);
    } catch (error: any) {
      console.error('Fehler beim Laden der aktiven Benutzer:', error);
      
      // Spezifische Fehlerbehandlung
      let errorMessage = t('teamWorktime.messages.loadActiveUsersError');
      
      if (error.response) {
        const status = error.response.status;
        const backendMessage = error.response.data?.message;
        
        if (status === 403) {
          // Berechtigungsfehler - zeige spezifische Nachricht
          errorMessage = backendMessage || t('teamWorktime.permissions.insufficientShort');
        } else if (status === 401) {
          errorMessage = t('teamWorktime.messages.unauthorized', { defaultValue: 'Nicht autorisiert' });
        } else if (status === 500) {
          errorMessage = t('teamWorktime.messages.serverError', { defaultValue: 'Serverfehler' });
        } else if (backendMessage) {
          errorMessage = backendMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      console.error('Fehlerdetails:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Funktion zum Abrufen aller Zeiterfassungen für ein Datum
  const fetchAllWorktimes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axiosInstance.get(`${API_ENDPOINTS.TEAM_WORKTIME.USER_DAY}?date=${selectedDate}`);
      setAllWorktimes(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Zeiterfassungen:', error);
      setError(t('teamWorktime.messages.loadWorktimesError'));
    } finally {
      setLoading(false);
    }
  }, [selectedDate, t]);
  
  // Stoppe die Zeiterfassung eines Benutzers
  const stopUserWorktime = async (userId: number, endTime: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await axiosInstance.post(API_ENDPOINTS.TEAM_WORKTIME.STOP_USER, {
        userId,
        endTime: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
      });
      
      // Aktualisiere die Liste der aktiven Benutzer
      fetchActiveUsers();
    } catch (error) {
      console.error('Fehler beim Stoppen der Benutzer-Zeiterfassung:', error);
      setError(t('teamWorktime.messages.stopWorktimeError'));
    } finally {
      setLoading(false);
    }
  };
  
  // Lade aktive Benutzer und Zeiterfassungen beim ersten Rendern
  useEffect(() => {
    // Nur API-Calls machen, wenn Berechtigungen vorhanden sind
    if (!hasRequiredPermissions) {
      setError(t('teamWorktime.permissions.insufficientDetails'));
      return;
    }
    
    fetchActiveUsers();
    fetchAllWorktimes();
    
    // Aktualisiere die aktiven Benutzer alle 30 Sekunden
    const intervalId = setInterval(fetchActiveUsers, 30000) as unknown as number;
    
    return () => clearInterval(intervalId);
  }, [fetchActiveUsers, fetchAllWorktimes, hasRequiredPermissions]);

  // Lade Zeiterfassungen neu, wenn sich das Datum ändert
  useEffect(() => {
    fetchAllWorktimes();
  }, [selectedDate, fetchAllWorktimes]);
  
  return (
    <div className="min-h-screen dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
            {/* Header mit Icon */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center pl-2 sm:pl-0">
                <UsersIcon className="h-6 w-6 text-gray-900 dark:text-white mr-2" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('teamWorktime.title')}</h2>
              </div>
            </div>
            
            {/* Berechtigungsfehler */}
            {!hasRequiredPermissions && (
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
                <p className="font-medium mb-2">{t('teamWorktime.permissions.insufficient')}</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {!hasPagePermission && (
                    <li>{t('teamWorktime.permissions.missingPage')}</li>
                  )}
                  {!hasTablePermission && (
                    <li>{t('teamWorktime.permissions.missingTable')}</li>
                  )}
                </ul>
                <p className="text-sm mt-2">{t('teamWorktime.permissions.contactAdmin')}</p>
              </div>
            )}
            
            {/* Fehlermeldung */}
            {error && (
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            {/* Tab-Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto overflow-y-hidden">
                <button
                  onClick={() => setActiveTab('worktimes')}
                  className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 ${
                    activeTab === 'worktimes'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {t('teamWorktime.tabs.worktimes')}
                </button>
                <button
                  onClick={() => setActiveTab('shifts')}
                  className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 ${
                    activeTab === 'shifts'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {t('teamWorktime.tabs.shifts')}
                </button>
                <button
                  onClick={() => setActiveTab('todos')}
                  className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 ${
                    activeTab === 'todos'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {t('teamWorktime.tabs.todos')}
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0 ${
                    activeTab === 'requests'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {t('teamWorktime.tabs.requests')}
                </button>
              </nav>
            </div>
            
            {/* Tab-Content */}
            {activeTab === 'worktimes' && (
              <ActiveUsersList
                activeUsers={activeUsers}
                allWorktimes={allWorktimes}
                loading={loading}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onStopWorktime={stopUserWorktime}
                onRefresh={fetchActiveUsers}
                showTodos={true}
                showRequests={true}
              />
            )}
            {activeTab === 'shifts' && (
              <ShiftPlannerTab selectedDate={selectedDate} />
            )}
            {activeTab === 'todos' && (
              <TodoAnalyticsTab selectedDate={selectedDate} />
            )}
            {activeTab === 'requests' && (
              <RequestAnalyticsTab selectedDate={selectedDate} />
            )}
          </div>
      </div>
    </div>
  );
};

export default TeamWorktimeControl; 