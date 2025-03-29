/**
 * API-Client für die Intranet Mobile App
 * Stellt Funktionen für die Kommunikation mit dem Backend bereit
 */

import { AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse, LoginCredentials, AuthResponse, Task, Request, User, Branch, Role, Document, PaginatedResponse, FilterOptions, Notification, NotificationType, WorkTime, WorkTimeStatistics, TaskStatus, MobileWorkTime } from '../types';
import axiosInstance from '../config/axios';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// Axios-Instance mit base URL
const apiInstance = axios.create({
  baseURL: API_BASE_URL,
});

// Request-Interceptor zum Hinzufügen des Authorization-Headers
apiInstance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@IntranetApp:token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Basis-API-Klasse
class BaseApiService<T> {
  protected endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  // Hole alle Einträge
  async getAll(filters?: FilterOptions): Promise<T[]> {
    const response = await axiosInstance.get<T[]>(
      this.endpoint,
      { params: filters }
    );
    return response.data;
  }

  // Hole paginierte Liste
  async getPaginated(page: number = 1, limit: number = 10, filters?: FilterOptions): Promise<PaginatedResponse<T>> {
    const response = await axiosInstance.get<PaginatedResponse<T>>(
      this.endpoint,
      {
        params: {
          ...filters,
          page,
          limit
        }
      }
    );
    return response.data;
  }

  // Hole einzelnen Eintrag nach ID
  async getById(id: number): Promise<T> {
    const response = await axiosInstance.get<T>(
      `${this.endpoint}/${id}`
    );
    return response.data;
  }

  // Erstelle neuen Eintrag
  async create(data: Partial<T>): Promise<T> {
    const response = await axiosInstance.post<T>(
      this.endpoint,
      data
    );
    return response.data;
  }

  // Aktualisiere Eintrag
  async update(id: number, data: Partial<T>): Promise<T> {
    const response = await axiosInstance.put<T>(
      `${this.endpoint}/${id}`,
      data
    );
    return response.data;
  }

  // Lösche Eintrag
  async delete(id: number): Promise<any> {
    const response = await axiosInstance.delete<any>(
      `${this.endpoint}/${id}`
    );
    return response.data;
  }
}

// Auth-Service
class AuthService {
  // Login
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await axiosInstance.post<AuthResponse>(
      '/auth/login',
      credentials
    );
    
    // Speichere Token und Refresh-Token - Backend gibt direkt token und user ohne data-Wrapper zurück
    if (response.data && response.data.token) {
      await AsyncStorage.setItem('@IntranetApp:token', response.data.token);
    }
    
    if (response.data && response.data.refreshToken) {
      await AsyncStorage.setItem('@IntranetApp:refreshToken', response.data.refreshToken);
    }
    
    return response.data;
  }

  // Logout
  async logout(): Promise<void> {
    try {
      // Versuche, den Server zu benachrichtigen (kann fehlschlagen, wenn nicht erreichbar)
      await axiosInstance.post('/auth/logout');
    } catch (error) {
      console.error('Fehler beim Server-Logout:', error);
    }
    
    // Lokale Token-Daten entfernen
    await AsyncStorage.removeItem('@IntranetApp:token');
    await AsyncStorage.removeItem('@IntranetApp:refreshToken');
  }

  // Passwort zurücksetzen
  async requestPasswordReset(email: string): Promise<any> {
    const response = await axiosInstance.post<any>(
      '/auth/reset-password-request',
      { email }
    );
    return response.data;
  }

  // Prüfe, ob Token gültig ist
  async checkAuth(): Promise<boolean> {
    try {
      await axiosInstance.get('/auth/check');
      return true;
    } catch (error) {
      return false;
    }
  }

  // Benutzer registrieren
  async register(user: Partial<User>): Promise<AuthResponse> {
    const response = await axiosInstance.post<AuthResponse>(
      '/auth/register',
      user
    );
    return response.data;
  }
}

export class TaskApiService extends BaseApiService<Task> {
  constructor() {
    super('/tasks');
  }

  // Überschreibe create für bessere Fehlerbehandlung
  async create(data: Partial<Task>): Promise<Task> {
    try {
      if (!data.title || !data.branchId) {
        throw new Error('Titel und Branch sind erforderlich');
      }

      const preparedData = this.prepareTaskData(data);
      console.log('Erstelle Task mit Daten:', preparedData);
      
      const response = await axiosInstance.post<Task>(
        this.endpoint,
        preparedData
      );
      
      console.log('API-Antwort beim Erstellen:', response.data);
      return this.validateTaskResponse(response.data);
    } catch (error) {
      console.error('Fehler beim Erstellen der Aufgabe:', error);
      throw this.handleTaskError(error, 'Erstellen');
    }
  }

  // Überschreibe update für bessere Fehlerbehandlung
  async update(id: number, data: Partial<Task>): Promise<Task> {
    try {
      if (!id) {
        throw new Error('Task-ID ist erforderlich');
      }
      
      const preparedData = this.prepareTaskData(data);
      console.log(`Aktualisiere Task ${id} mit Daten:`, preparedData);
      
      const response = await axiosInstance.put<Task>(
        `${this.endpoint}/${id}`,
        preparedData
      );
      
      console.log('API-Antwort beim Aktualisieren:', response.data);
      return this.validateTaskResponse(response.data);
    } catch (error) {
      console.error(`Fehler beim Aktualisieren der Aufgabe ${id}:`, error);
      throw this.handleTaskError(error, 'Aktualisieren');
    }
  }

  // Überschreibe getById für bessere Fehlerbehandlung
  async getById(id: number): Promise<Task> {
    try {
      if (!id) {
        throw new Error('Task-ID ist erforderlich');
      }
      
      console.log(`Lade Task mit ID ${id}`);
      
      // Verwende den erweiterten Endpunkt, um Referenzobjekte zu laden
      const response = await axiosInstance.get<Task>(`${this.endpoint}/${id}?include=responsible,branch`);
      
      console.log('API-Antwort beim Laden:', response.data);
      
      // Stelle sicher, dass die Daten korrekt geladen wurden
      if (!response.data) {
        throw new Error('Der Server hat keine Daten zurückgegeben.');
      }
      
      return this.validateTaskResponse(response.data);
    } catch (error) {
      console.error(`Fehler beim Laden der Aufgabe ${id}:`, error);
      throw this.handleTaskError(error, 'Laden');
    }
  }

  // Lade alle Tasks mit Referenzen
  async getAll(query?: any): Promise<Task[]> {
    try {
      console.log('Lade alle Tasks');
      
      // Erweitere den Endpoint um Referenzobjekte einzuschließen
      const response = await axiosInstance.get<Task[]>(`${this.endpoint}?include=responsible,branch`, {
        params: query
      });
      
      console.log(`${response.data.length} Tasks geladen`);
      
      return response.data;
    } catch (error) {
      console.error('Fehler beim Laden aller Tasks:', error);
      throw this.handleTaskError(error, 'Laden aller Tasks');
    }
  }

  // Statusaktualisierung mit verbesserter Fehlerbehandlung
  async updateStatus(id: number, status: TaskStatus): Promise<Task> {
    try {
      if (!id) {
        throw new Error('Task-ID ist erforderlich');
      }
      
      if (!this.isValidTaskStatus(status)) {
        throw new Error('Ungültiger Task-Status');
      }
      
      console.log(`Aktualisiere Status von Task ${id} auf ${status}`);
      const response = await axiosInstance.patch<Task>(
        `${this.endpoint}/${id}/status`,
        { status }
      );
      
      console.log('API-Antwort bei Statusaktualisierung:', response.data);
      return this.validateTaskResponse(response.data);
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Status für Aufgabe ${id}:`, error);
      throw this.handleTaskError(error, 'Statusaktualisierung');
    }
  }

  // Private Hilfsmethoden für Validierung und Fehlerbehandlung
  private prepareTaskData(data: Partial<Task>): Partial<Task> {
    return {
      ...data,
      title: data.title?.trim(),
      description: data.description?.trim() || null,
      // Stelle sicher, dass Datumswerte korrekt formatiert sind
      dueDate: data.dueDate ? 
        (typeof data.dueDate === 'string' ? data.dueDate : new Date(data.dueDate).toISOString()) : 
        null
    };
  }

  private validateTaskResponse(data: any): Task {
    if (!data || typeof data !== 'object') {
      throw new Error('Ungültige Task-Daten vom Server');
    }

    // Weniger strenge Validierung, um Kompatibilitätsprobleme zu vermeiden
    if (!data.id) {
      throw new Error('Ungültige Task-Daten: Keine ID vom Server');
    }

    // Stelle sicher, dass die Daten das richtige Format haben
    const taskData: Task = {
      ...data,
      // Stelle sicher, dass dueDate ein Datum ist, wenn es existiert
      dueDate: data.dueDate ? new Date(data.dueDate) : null
    };

    return taskData;
  }

  private isValidTaskStatus(status: any): status is TaskStatus {
    return ['open', 'in_progress', 'improval', 'quality_control', 'done'].includes(status);
  }

  private handleTaskError(error: any, operation: string): Error {
    if (error.response?.status === 401) {
      return new Error('Nicht autorisiert. Bitte melden Sie sich erneut an.');
    }
    
    if (error.response?.status === 403) {
      return new Error('Keine Berechtigung für diese Aktion.');
    }
    
    if (error.response?.status === 404) {
      return new Error('Die angeforderte Aufgabe wurde nicht gefunden.');
    }
    
    if (error.response?.data?.message) {
      return new Error(error.response.data.message);
    }
    
    if (error instanceof Error) {
      return error;
    }
    
    return new Error(`Die Aufgabe konnte nicht ${operation.toLowerCase()} werden.`);
  }

  // Aufgaben für einen bestimmten Benutzer abrufen
  async getByResponsible(userId: number): Promise<Task[]> {
    try {
      const response = await axiosInstance.get<Task[]>(
        `${this.endpoint}/responsible/${userId}?include=branch`
      );
      return response.data;
    } catch (error) {
      throw this.handleTaskError(error, 'Laden');
    }
  }

  // Aufgaben für eine bestimmte Rolle abrufen
  async getByRole(roleId: number): Promise<Task[]> {
    try {
      const response = await axiosInstance.get<Task[]>(
        `${this.endpoint}/role/${roleId}?include=branch`
      );
      return response.data;
    } catch (error) {
      throw this.handleTaskError(error, 'Laden');
    }
  }

  // Aufgaben für eine bestimmte Qualitätskontrolle abrufen
  async getByQualityControl(userId: number): Promise<Task[]> {
    try {
      const response = await axiosInstance.get<Task[]>(
        `${this.endpoint}/quality-control/${userId}?include=branch`
      );
      return response.data;
    } catch (error) {
      throw this.handleTaskError(error, 'Laden');
    }
  }
}

class RequestApiService extends BaseApiService<Request> {
  constructor() {
    super('/requests');
  }

  // Anfragenstatus aktualisieren
  async updateStatus(id: number, status: string, approverId?: number): Promise<any> {
    const response = await axiosInstance.patch<any>(
      `${this.endpoint}/${id}/status`,
      { status, approverId }
    );
    return response.data;
  }

  // Anfragen für einen bestimmten Benutzer abrufen
  async getByUser(userId: number): Promise<Request[]> {
    const response = await axiosInstance.get<Request[]>(
      `${this.endpoint}/user/${userId}`
    );
    return response.data;
  }
}

class WorktimeApiService extends BaseApiService<MobileWorkTime> {
  constructor() {
    super('/worktime');
  }

  // Aktive Zeiterfassung abrufen
  async getActive(): Promise<{ active: boolean; startTime?: string; id?: number; branchId?: number }> {
    console.log('Rufe aktive Zeiterfassung ab');
    const response = await axiosInstance.get<{ active: boolean; startTime?: string; id?: number; branchId?: number }>(
      `${this.endpoint}/active`
    );
    console.log('Active worktime API response:', response.data);
    return response.data;
  }

  // Zeiterfassung für ein bestimmtes Datum abrufen
  async getByDate(date: string): Promise<MobileWorkTime[]> {
    const response = await axiosInstance.get<MobileWorkTime[]>(
      `${this.endpoint}?date=${date}`
    );
    return response.data;
  }

  // Zeiterfassung starten
  async start(branchId: string): Promise<MobileWorkTime> {
    const startTime = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000);
    const response = await axiosInstance.post<MobileWorkTime>(
      `${this.endpoint}/start`,
      { 
        branchId,
        startTime: startTime.toISOString()
      }
    );
    return response.data;
  }

  // Zeiterfassung stoppen
  async stop(endTime?: Date): Promise<MobileWorkTime> {
    // Wenn endTime nicht übergeben wurde, aktuelle Zeit verwenden
    const stopTime = endTime || new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000);
    
    console.log('Stopping timer with endTime:', stopTime.toISOString());
    
    const response = await axiosInstance.post<MobileWorkTime>(
      `${this.endpoint}/stop`,
      { 
        endTime: stopTime.toISOString()
      }
    );
    
    console.log('Stop timer response:', response.data);
    
    return response.data;
  }

  // Statistiken abrufen
  async getStats(startDate: string, endDate?: string): Promise<WorkTimeStatistics> {
    const response = await axiosInstance.get<WorkTimeStatistics>(
      `${this.endpoint}/stats?startDate=${startDate}${endDate ? `&endDate=${endDate}` : ''}`
    );
    return response.data;
  }

  // Synchronisiere Offline-Einträge
  async syncOfflineEntries(entries: MobileWorkTime[]): Promise<MobileWorkTime[]> {
    console.log('Sending offline entries to sync:', entries);
    
    // Entferne überflüssige Felder, die das Backend verwirren könnten
    const cleanedEntries = entries.map(entry => {
      const { offlineId, synced, active, ...rest } = entry;
      return rest;
    });
    
    const response = await axiosInstance.post<MobileWorkTime[]>(
      `${this.endpoint}/sync`,
      cleanedEntries
    );
    
    console.log('Sync response:', response.data);
    
    return response.data;
  }
}

class UserApiService extends BaseApiService<User> {
  constructor() {
    super('/users');
  }
  
  // Alle Benutzer abrufen
  async getAllUsers(): Promise<User[]> {
    return this.getAll();
  }

  // Benutzer nach Rolle abrufen
  async getByRole(roleId: number): Promise<User[]> {
    const response = await axiosInstance.get<User[]>(
      `${this.endpoint}/role/${roleId}`
    );
    return response.data;
  }
}

class BranchApiService extends BaseApiService<Branch> {
  constructor() {
    super('/branches');
  }
  
  // Alle Branches abrufen
  async getAllBranches(): Promise<Branch[]> {
    return this.getAll();
  }
}

class RoleApiService extends BaseApiService<Role> {
  constructor() {
    super('/roles');
  }
}

class DocumentApiService extends BaseApiService<Document> {
  constructor() {
    super('/documents');
  }

  // Dokument hochladen
  async upload(formData: FormData, entityType?: string, entityId?: number): Promise<Document> {
    const config: AxiosRequestConfig = {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { entityType, entityId }
    };
    
    const response = await axiosInstance.post<Document>(
      `${this.endpoint}/upload`,
      formData,
      config
    );
    return response.data;
  }

  // Dokumente für eine bestimmte Entität abrufen (z.B. Aufgabe, Anfrage)
  async getByEntity(entityType: string, entityId: number): Promise<Document[]> {
    const response = await axiosInstance.get<Document[]>(
      `${this.endpoint}/entity/${entityType}/${entityId}`
    );
    return response.data;
  }
}

/**
 * NotificationApiService
 * Verwaltet API-Aufrufe für Benachrichtigungen
 */
class NotificationApiService extends BaseApiService<Notification> {
  constructor() {
    super('/notifications');
  }

  // Benachrichtigungen paginiert abrufen
  async getNotifications(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Notification>> {
    const response = await axiosInstance.get<PaginatedResponse<Notification>>(
      this.endpoint,
      { params: { page, limit } }
    );
    return response.data;
  }
  
  // Anzahl ungelesener Benachrichtigungen abrufen
  async getUnreadCount(): Promise<number> {
    try {
      const response = await axiosInstance.get<{count: number}>(
        `${this.endpoint}/unread/count`
      );
      return response.data.count;
    } catch (error) {
      console.error('Fehler beim Abrufen der ungelesenen Benachrichtigungen:', error);
      return 0;
    }
  }
  
  // Benachrichtigung als gelesen markieren
  async markAsRead(id: number): Promise<Notification> {
    const response = await axiosInstance.patch<Notification>(
      `${this.endpoint}/${id}/read`
    );
    return response.data;
  }
  
  // Alle Benachrichtigungen als gelesen markieren
  async markAllAsRead(): Promise<any> {
    const response = await axiosInstance.patch<any>(
      `${this.endpoint}/read-all`
    );
    return response.data;
  }
  
  // Benachrichtigung löschen
  async deleteNotification(id: number): Promise<any> {
    const response = await axiosInstance.delete<any>(
      `${this.endpoint}/${id}`
    );
    return response.data;
  }
  
  // Alle Benachrichtigungen löschen
  async deleteAllNotifications(): Promise<any> {
    const response = await axiosInstance.delete<any>(
      this.endpoint
    );
    return response.data;
  }
}

// Initialisiere und exportiere die Services
export const authApi = new AuthService();
export const taskApi = new TaskApiService();
export const userApi = new UserApiService();
export const branchApi = new BranchApiService();
export const requestApi = new RequestApiService();
export const documentApi = new DocumentApiService();
export const worktimeApi = new WorktimeApiService();
export const notificationApi = new NotificationApiService();
export const roleApi = new RoleApiService();

// Exportiere die Axios-Instanz für direkte Verwendung bei Bedarf
export default axiosInstance;