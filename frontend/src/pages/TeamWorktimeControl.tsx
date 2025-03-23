import React, { useState, useEffect, useCallback } from 'react';
import { UsersIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api.ts';
import { format } from 'date-fns';
import ActiveUsersList from '../components/teamWorktime/ActiveUsersList.tsx';

const TeamWorktimeControl: React.FC = () => {
  // State für aktive Benutzer und Zeiterfassungen
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [allWorktimes, setAllWorktimes] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  // State für Lade- und Fehlerzustände
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Funktion zum Abrufen der aktiven Benutzer
  const fetchActiveUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(API_ENDPOINTS.TEAM_WORKTIME.ACTIVE);
      setActiveUsers(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der aktiven Benutzer:', error);
      setError('Fehler beim Laden der aktiven Benutzer');
    } finally {
      setLoading(false);
    }
  }, []);

  // Funktion zum Abrufen aller Zeiterfassungen für ein Datum
  const fetchAllWorktimes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_ENDPOINTS.TEAM_WORKTIME.USER_DAY}?date=${selectedDate}`);
      setAllWorktimes(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Zeiterfassungen:', error);
      setError('Fehler beim Laden der Zeiterfassungen');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);
  
  // Stoppe die Zeiterfassung eines Benutzers
  const stopUserWorktime = async (userId: number, endTime: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await axios.post(API_ENDPOINTS.TEAM_WORKTIME.STOP_USER, {
        userId,
        endTime: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
      });
      
      // Aktualisiere die Liste der aktiven Benutzer
      fetchActiveUsers();
    } catch (error) {
      console.error('Fehler beim Stoppen der Benutzer-Zeiterfassung:', error);
      setError('Fehler beim Stoppen der Benutzer-Zeiterfassung');
    } finally {
      setLoading(false);
    }
  };
  
  // Lade aktive Benutzer und Zeiterfassungen beim ersten Rendern
  useEffect(() => {
    fetchActiveUsers();
    fetchAllWorktimes();
    
    // Aktualisiere die aktiven Benutzer alle 30 Sekunden
    const intervalId = setInterval(fetchActiveUsers, 30000);
    
    return () => clearInterval(intervalId);
  }, [fetchActiveUsers, fetchAllWorktimes]);

  // Lade Zeiterfassungen neu, wenn sich das Datum ändert
  useEffect(() => {
    fetchAllWorktimes();
  }, [selectedDate, fetchAllWorktimes]);
  
  return (
    <div className="h-auto">
      <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
        <div className="py-1">
          <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6">
            {/* Header mit Icon */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center pl-2 sm:pl-0">
                <UsersIcon className="h-6 w-6 text-gray-900 dark:text-white mr-2" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Workcenter</h2>
              </div>
            </div>
            
            {/* Fehlermeldung */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            {/* ActiveUsersList Komponente */}
            <ActiveUsersList
              activeUsers={activeUsers}
              allWorktimes={allWorktimes}
              loading={loading}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onStopWorktime={stopUserWorktime}
              onRefresh={fetchActiveUsers}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamWorktimeControl; 