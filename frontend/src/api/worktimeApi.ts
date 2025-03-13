import apiClient from './apiClient.ts';
import { API_ENDPOINTS } from '../config/api.ts';

// Typen für Zeiterfassungen
export interface Worktime {
  id: number;
  userId: number;
  branchId: number;
  startTime: string;
  endTime: string | null;
  createdAt: string;
  updatedAt: string;
  branch?: {
    id: number;
    name: string;
  };
  user?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export interface ActiveWorktime extends Worktime {
  active: boolean;
}

export interface WorktimeStats {
  totalHours: number;
  averageHoursPerDay: number;
  daysWorked: number;
  weeklyData: {
    day: string;
    hours: number;
    date?: string; // Wird vom Frontend hinzugefügt
  }[];
}

// API-Funktionen für Zeiterfassungen
export const worktimeApi = {
  // Alle Zeiterfassungen eines Tages abrufen
  getWorktimesByDate: async (date: string): Promise<Worktime[]> => {
    try {
      console.log(`worktimeApi.getWorktimesByDate: Rufe Zeiterfassungen für ${date} ab`);
      const response = await apiClient.get(`${API_ENDPOINTS.WORKTIME.BASE}?date=${date}`);
      return response.data;
    } catch (error) {
      console.error('Fehler beim Abrufen der Zeiterfassungen:', error);
      throw error;
    }
  },

  // Aktive Zeiterfassung abrufen
  getActiveWorktime: async (): Promise<ActiveWorktime | null> => {
    try {
      console.log('worktimeApi.getActiveWorktime: Rufe aktive Zeiterfassung ab');
      const response = await apiClient.get(API_ENDPOINTS.WORKTIME.ACTIVE);
      
      // Wenn keine aktive Zeiterfassung vorhanden ist, gib null zurück
      if (!response.data || Object.keys(response.data).length === 0) {
        return null;
      }
      
      return response.data;
    } catch (error) {
      console.error('Fehler beim Abrufen der aktiven Zeiterfassung:', error);
      throw error;
    }
  },

  // Zeiterfassungs-Statistiken abrufen
  getWorktimeStats: async (weekDate: string): Promise<WorktimeStats> => {
    try {
      console.log(`worktimeApi.getWorktimeStats: Rufe Statistiken für Woche ab (${weekDate})`);
      const response = await apiClient.get(`${API_ENDPOINTS.WORKTIME.STATS}?week=${weekDate}`);
      return response.data;
    } catch (error) {
      console.error('Fehler beim Abrufen der Arbeitszeit-Statistiken:', error);
      throw error;
    }
  },

  // Zeiterfassungen exportieren
  exportWorktimes: async (weekDate: string): Promise<Blob> => {
    try {
      console.log(`worktimeApi.exportWorktimes: Exportiere Zeiterfassungen für Woche (${weekDate})`);
      const response = await apiClient.get(`${API_ENDPOINTS.WORKTIME.BASE}/export?week=${weekDate}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Fehler beim Exportieren der Zeiterfassungen:', error);
      throw error;
    }
  },

  // Zeiterfassung starten
  startWorktime: async (branchId: number, startTime?: Date): Promise<Worktime> => {
    try {
      console.log(`worktimeApi.startWorktime: Starte Zeiterfassung für Branch ${branchId}`);
      const response = await apiClient.post(API_ENDPOINTS.WORKTIME.START, {
        branchId,
        startTime: startTime ? startTime.toISOString() : new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      console.error('Fehler beim Starten der Zeiterfassung:', error);
      throw error;
    }
  },

  // Zeiterfassung stoppen
  stopWorktime: async (endTime?: Date): Promise<Worktime> => {
    try {
      console.log('worktimeApi.stopWorktime: Stoppe aktive Zeiterfassung');
      const response = await apiClient.post(API_ENDPOINTS.WORKTIME.STOP, {
        endTime: endTime ? endTime.toISOString() : new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      console.error('Fehler beim Stoppen der Zeiterfassung:', error);
      throw error;
    }
  }
};

export default worktimeApi; 