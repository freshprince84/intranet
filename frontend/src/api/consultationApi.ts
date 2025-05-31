import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';

/**
 * API-Funktionen für das Consultation-Modul
 */

export interface StartConsultationData {
  branchId: number;
  clientId: number;
  notes?: string;
  startTime?: string;
}

export interface StopConsultationData {
  endTime?: string;
  notes?: string;
}

export interface UpdateNotesData {
  notes: string;
}

export interface LinkTaskData {
  taskId: number;
}

export interface CreateTaskData {
  title: string;
  description: string;
  dueDate?: string;
  branchId: number;
  qualityControlId?: number;
}

export interface UpdateTimeData {
  startTime?: string;
  endTime?: string;
}

/**
 * Startet eine neue Beratung
 * @param data Beratungsdaten (branchId, clientId, notes, startTime)
 * @returns Die erstellte Beratung
 */
export const startConsultation = async (data: StartConsultationData) => {
  try {
    const response = await axiosInstance.post(API_ENDPOINTS.CONSULTATIONS.START, data);
    return response.data;
  } catch (error) {
    console.error('Fehler beim Starten der Beratung:', error);
    throw error;
  }
};

/**
 * Stoppt eine laufende Beratung
 * @param data Stopp-Daten (endTime, notes)
 * @returns Die aktualisierte Beratung
 */
export const stopConsultation = async (data: StopConsultationData) => {
  try {
    const response = await axiosInstance.post(API_ENDPOINTS.CONSULTATIONS.STOP, data);
    return response.data;
  } catch (error) {
    console.error('Fehler beim Stoppen der Beratung:', error);
    throw error;
  }
};

/**
 * Holt alle Beratungen des aktuellen Benutzers
 * @param clientId Optionale Client-ID zum Filtern
 * @param from Optionales Start-Datum
 * @param to Optionales End-Datum
 * @returns Liste der Beratungen
 */
export const getConsultations = async (clientId?: number, from?: string, to?: string) => {
  try {
    const params = new URLSearchParams();
    if (clientId) params.append('clientId', clientId.toString());
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    
    const url = params.toString() 
      ? `${API_ENDPOINTS.CONSULTATIONS.BASE}?${params}`
      : API_ENDPOINTS.CONSULTATIONS.BASE;
      
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    console.error('Fehler beim Laden der Beratungen:', error);
    throw error;
  }
};

/**
 * Aktualisiert die Notizen einer Beratung
 * @param consultationId ID der Beratung
 * @param data Notizen-Daten
 * @returns Die aktualisierte Beratung
 */
export const updateConsultationNotes = async (consultationId: number, data: UpdateNotesData) => {
  try {
    const response = await axiosInstance.patch(
      API_ENDPOINTS.CONSULTATIONS.UPDATE_NOTES(consultationId), 
      data
    );
    return response.data;
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Notizen:', error);
    throw error;
  }
};

/**
 * Verknüpft einen Task mit einer Beratung
 * @param consultationId ID der Beratung
 * @param data Task-Verknüpfungsdaten
 * @returns Status der Verknüpfung
 */
export const linkTaskToConsultation = async (consultationId: number, data: LinkTaskData) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.CONSULTATIONS.LINK_TASK(consultationId), 
      data
    );
    return response.data;
  } catch (error) {
    console.error('Fehler beim Verknüpfen des Tasks:', error);
    throw error;
  }
};

/**
 * Erstellt einen neuen Task für eine Beratung
 * @param consultationId ID der Beratung
 * @param data Task-Erstellungsdaten
 * @returns Der erstellte Task
 */
export const createTaskForConsultation = async (consultationId: number, data: CreateTaskData) => {
  try {
    const response = await axiosInstance.post(
      API_ENDPOINTS.CONSULTATIONS.CREATE_TASK(consultationId), 
      data
    );
    return response.data;
  } catch (error) {
    console.error('Fehler beim Erstellen des Tasks:', error);
    throw error;
  }
};

/**
 * Löscht eine Beratung
 * @param consultationId ID der Beratung
 * @returns Status der Löschoperation
 */
export const deleteConsultation = async (consultationId: number) => {
  try {
    const response = await axiosInstance.delete(API_ENDPOINTS.CONSULTATIONS.BY_ID(consultationId));
    return response.data;
  } catch (error) {
    console.error('Fehler beim Löschen der Beratung:', error);
    throw error;
  }
};

/**
 * Aktualisiert die Start- oder Endzeit einer Beratung
 * @param consultationId ID der Beratung
 * @param data Zeit-Update-Daten (startTime oder endTime)
 * @returns Die aktualisierte Beratung
 */
export const updateConsultationTime = async (consultationId: number, data: UpdateTimeData) => {
  try {
    /* KONSISTENTE API-BEHANDLUNG:
     * Diese Funktion kapselt die Zeit-Update-Logik und macht sie testbar und wartbar.
     * Verwendet den WorkTime-Endpoint, da Consultations erweiterte WorkTime-Einträge sind.
     */
    const response = await axiosInstance.put(`${API_ENDPOINTS.WORKTIME.BASE}/${consultationId}`, data);
    return response.data;
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Zeit:', error);
    throw error;
  }
}; 