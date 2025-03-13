import React, { useState, useEffect } from 'react';
import { UsersIcon, ClockIcon, CalendarIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api.ts';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import ActiveUsersList from '../components/teamWorktime/ActiveUsersList.tsx';
import UserWorktimeTable from '../components/teamWorktime/UserWorktimeTable.tsx';
import UserOvertimeEditor from '../components/teamWorktime/UserOvertimeEditor.tsx';

// Tabs für die Seite
enum TeamWorktimeTab {
  ACTIVE_USERS = 'active_users',
  TEAM_OVERVIEW = 'team_overview'
}

const TeamWorktimeControl: React.FC = () => {
  // State für aktiven Tab
  const [activeTab, setActiveTab] = useState<TeamWorktimeTab>(TeamWorktimeTab.ACTIVE_USERS);
  
  // State für aktive Benutzer
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  
  // State für ausgewähltes Datum und Team-Mitglieder
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamWorktimes, setTeamWorktimes] = useState<{ [userId: number]: any[] }>({});
  
  // State für Lade- und Fehlerzustände
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Lade aktive Benutzer
  const fetchActiveUsers = async () => {
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
  };
  
  // Lade Team-Mitglieder
  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Hier würde man normalerweise einen API-Aufruf zum Laden aller Team-Mitglieder machen
      // Da wir keinen solchen Endpunkt haben, verwenden wir die aktiven Benutzer als Beispiel
      // In einer echten Implementierung sollte hier ein dedizierter Endpunkt verwendet werden
      
      const response = await axios.get(API_ENDPOINTS.USERS.BASE);
      setTeamMembers(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Team-Mitglieder:', error);
      setError('Fehler beim Laden der Team-Mitglieder');
    } finally {
      setLoading(false);
    }
  };
  
  // Lade Zeiterfassungen für ein bestimmtes Datum für alle Team-Mitglieder
  const fetchTeamWorktimes = async () => {
    if (!selectedDate || !teamMembers.length) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const newTeamWorktimes: { [userId: number]: any[] } = {};
      
      // Für jedes Teammitglied die Zeiterfassungen für den ausgewählten Tag laden
      for (const member of teamMembers) {
        const response = await axios.get(
          `${API_ENDPOINTS.TEAM_WORKTIME.USER_DAY}?userId=${member.id}&date=${selectedDate}`
        );
        
        newTeamWorktimes[member.id] = response.data.worktimes || [];
      }
      
      setTeamWorktimes(newTeamWorktimes);
    } catch (error) {
      console.error('Fehler beim Laden der Team-Zeiterfassungen:', error);
      setError('Fehler beim Laden der Team-Zeiterfassungen');
    } finally {
      setLoading(false);
    }
  };
  
  // Stoppe die Zeiterfassung eines Benutzers
  const stopUserWorktime = async (userId: number, endTime: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await axios.post(API_ENDPOINTS.TEAM_WORKTIME.STOP_USER, {
        userId,
        endTime
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
  
  // Aktualisiere eine Zeiterfassung
  const updateWorktime = async (id: number, startTime: string, endTime: string | null) => {
    try {
      setLoading(true);
      setError(null);
      
      await axios.put(API_ENDPOINTS.TEAM_WORKTIME.UPDATE, {
        id,
        startTime,
        endTime
      });
      
      // Aktualisiere die Zeiterfassungen des Teams
      fetchTeamWorktimes();
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Zeiterfassung:', error);
      setError('Fehler beim Aktualisieren der Zeiterfassung');
    } finally {
      setLoading(false);
    }
  };
  
  // Aktualisiere die bewilligten Überstunden eines Benutzers
  const updateApprovedOvertimeHours = async (userId: number, approvedOvertimeHours: number) => {
    try {
      setLoading(true);
      setError(null);
      
      await axios.put(API_ENDPOINTS.TEAM_WORKTIME.OVERTIME, {
        userId,
        approvedOvertimeHours
      });
      
      // Aktualisiere die Teammitglieder-Daten
      fetchTeamMembers();
    } catch (error) {
      console.error('Fehler beim Aktualisieren der bewilligten Überstunden:', error);
      setError('Fehler beim Aktualisieren der bewilligten Überstunden');
    } finally {
      setLoading(false);
    }
  };
  
  // Lade aktive Benutzer beim ersten Rendern
  useEffect(() => {
    fetchActiveUsers();
    
    // Aktualisiere die aktiven Benutzer alle 30 Sekunden
    const intervalId = setInterval(fetchActiveUsers, 30000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Lade Team-Mitglieder beim ersten Rendern und beim Wechsel zum Team-Übersicht-Tab
  useEffect(() => {
    if (activeTab === TeamWorktimeTab.TEAM_OVERVIEW) {
      fetchTeamMembers();
    }
  }, [activeTab]);
  
  // Lade Team-Zeiterfassungen, wenn sich das Datum ändert oder Team-Mitglieder geladen wurden
  useEffect(() => {
    if (activeTab === TeamWorktimeTab.TEAM_OVERVIEW && teamMembers.length > 0) {
      fetchTeamWorktimes();
    }
  }, [selectedDate, teamMembers, activeTab]);
  
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
        <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6">
          {/* Header mit Icon */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <UsersIcon className="h-6 w-6 text-gray-900 mr-2" />
              <h2 className="text-xl font-semibold">Workcenter</h2>
            </div>
          </div>
          
          {/* Fehlermeldung */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {/* Tabs für Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab(TeamWorktimeTab.ACTIVE_USERS)}
                className={`${
                  activeTab === TeamWorktimeTab.ACTIVE_USERS
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <ClockIcon className="h-5 w-5 mr-2" />
                Aktive Zeiterfassungen
              </button>
              <button
                onClick={() => setActiveTab(TeamWorktimeTab.TEAM_OVERVIEW)}
                className={`${
                  activeTab === TeamWorktimeTab.TEAM_OVERVIEW
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <UsersIcon className="h-5 w-5 mr-2" />
                Teammitglieder Übersicht
              </button>
            </nav>
          </div>
          
          {/* Tab-Inhalte */}
          {activeTab === TeamWorktimeTab.ACTIVE_USERS && (
            <ActiveUsersList
              activeUsers={activeUsers}
              loading={loading}
              onStopWorktime={stopUserWorktime}
              onRefresh={fetchActiveUsers}
            />
          )}
          
          {activeTab === TeamWorktimeTab.TEAM_OVERVIEW && (
            <div>
              {/* Datumsauswahl */}
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <CalendarIcon className="h-5 w-5 text-gray-500 mr-2" />
                  <label htmlFor="date-select" className="block text-sm font-medium text-gray-700">
                    Datum auswählen
                  </label>
                </div>
                <input
                  type="date"
                  id="date-select"
                  className="block w-full max-w-xs pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              
              {/* Team-Übersicht */}
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Lade Daten...</p>
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">Keine Teammitglieder gefunden.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {teamMembers.map(member => (
                    <div key={member.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          {member.firstName} {member.lastName}
                        </h3>
                        <UserOvertimeEditor
                          user={member}
                          onUpdate={updateApprovedOvertimeHours}
                          loading={loading}
                        />
                      </div>
                      
                      <UserWorktimeTable
                        worktimes={teamWorktimes[member.id] || []}
                        loading={loading}
                        onUpdate={updateWorktime}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamWorktimeControl; 