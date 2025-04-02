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
import { AxiosError } from 'axios';

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

// BaseApiService: Methoden bleiben generisch ohne Typen bei this.api.*
class BaseApiService<T> {
  protected endpoint: string;
  protected api: typeof axiosInstance; // Verwende den Typ von axiosInstance

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    this.api = axiosInstance; // Stelle sicher, dass die korrekte Instanz verwendet wird
  }

  async getAll(filters?: FilterOptions): Promise<T[]> {
    const response = await this.api.get(this.endpoint, { params: filters });
    return response.data;
  }

  async getPaginated(page: number = 1, limit: number = 10, filters?: FilterOptions): Promise<PaginatedResponse<T>> {
    const response = await this.api.get(this.endpoint, { params: { ...filters, page, limit } });
    return response.data;
  }

  async getById(id: number): Promise<T> {
    const response = await this.api.get(`${this.endpoint}/${id}`);
    return response.data;
  }

  async create(data: Partial<T>): Promise<T> {
    const response = await this.api.post(this.endpoint, data);
    return response.data;
  }

  async update(id: number, data: Partial<T>): Promise<T> {
    const response = await this.api.put(`${this.endpoint}/${id}`, data);
    return response.data;
  }

  async delete(id: number): Promise<void> { // Rückgabetyp oft void bei delete
    await this.api.delete(`${this.endpoint}/${id}`);
  }

  // Vereinheitlichte Fehlerbehandlung (kann hier oder in abgeleiteten Klassen sein)
  protected handleError(error: any, operation: string): Error {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      let message = `Fehler bei Operation '${operation}': `;

      if (status === 400) {
        // Versuche, detailliertere Prisma-Fehler zu extrahieren, falls vorhanden
        const details = errorData?.message || errorData?.error || JSON.stringify(errorData);
        message += `Ungültige Daten (${details})`;
      } else if (status === 401) {
        message += "Nicht autorisiert. Bitte erneut anmelden.";
      } else if (status === 403) {
        message += "Zugriff verweigert.";
      } else if (status === 404) {
        message += "Nicht gefunden.";
      } else if (status === 500) {
        message += `Serverfehler (${errorData?.message || 'Interner Fehler'}). Bitte später erneut versuchen.`;
      } else {
        message += `Unerwarteter Status ${status}.`;
      }
      return new Error(message);
    }
    if (error instanceof Error) {
      return error;
    }
    return new Error(`Unbekannter Fehler bei Operation '${operation}': ${error}`);
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

// Helper function to format Date to 'YYYY-MM-DD'
const formatDate = (date: Date | null | string): string | null => {
  if (!date) return null;
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    // Check if date is valid
    if (isNaN(d.getTime())) return null; 
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error("Error formatting date:", e);
    return null; // Return null if formatting fails
  }
};

// TaskApiService: Überschreibe Methoden mit expliziten Typen bei API-Aufrufen
export class TaskApiService extends BaseApiService<Task> {
  constructor() {
    super('tasks');
  }

  async getById(id: number): Promise<Task> {
    try {
      console.log(`[TaskApiService] getById: ${this.endpoint}/${id}`);
      const queryParams = { include: 'responsible,branch' };
      const response = await this.api.get<Task>(`${this.endpoint}/${id}`, { params: queryParams });
      if (!response.data) {
        throw new Error(`Keine Daten für Task mit ID ${id} erhalten`);
      }
      console.log(`[TaskApiService] getById: Daten erhalten für ${this.endpoint}/${id}`);
      return this.validateTaskResponse(response.data);
    } catch (error) {
      throw this.handleError(error, `Laden von Task ${id}`);
    }
  }

  async getAll(query?: any): Promise<Task[]> {
    try {
      console.log('Lade alle Tasks');
      const response = await this.api.get<Task[]>(`${this.endpoint}?include=responsible,branch`, { params: query });
      console.log(`${response.data.length} Tasks geladen`);
      return Array.isArray(response.data)
        ? response.data.map(task => this.validateTaskResponse(task))
        : [];
    } catch (error) {
      console.error('Fehler beim Laden aller Tasks:', error);
      throw this.handleError(error, 'Laden aller Tasks');
    }
  }

  private validateTaskResponse(task: Partial<Task>): Task {
    if (!task || typeof task !== 'object') {
      console.error('[TaskApiService] Ungültiges Task-Objekt erhalten:', task);
      throw new Error('Ungültige Task-Daten vom Server');
    }
    if (!task.id) {
      console.error('[TaskApiService] Task ohne ID erhalten:', task);
      throw new Error('Ungültige Task-Daten: Keine ID vom Server');
    }
    if (task.dueDate && typeof task.dueDate === 'string') {
      task.dueDate = new Date(task.dueDate);
    }
    if (task.responsible && !task.responsibleId && task.responsible.id) {
      task.responsibleId = task.responsible.id;
    }
    if (task.branch && !task.branchId && task.branch.id) {
      task.branchId = task.branch.id;
    }
    return task as Task;
  }

  async getByResponsible(userId: number): Promise<Task[]> {
    try {
      const response = await this.api.get<Task[]>(
        `${this.endpoint}/responsible/${userId}?include=branch`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Laden');
    }
  }

  async getByRole(roleId: number): Promise<Task[]> {
    try {
      const response = await this.api.get<Task[]>(
        `${this.endpoint}/role/${roleId}?include=branch`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Laden');
    }
  }

  async getByQualityControl(userId: number): Promise<Task[]> {
    try {
      const response = await this.api.get<Task[]>(
        `${this.endpoint}/quality-control/${userId}?include=branch`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Laden');
    }
  }

  async getMyTasks(): Promise<Task[]> {
    try {
      console.log('Lade meine zugewiesenen Tasks');
      const response = await this.api.get<Task[]>(`${this.endpoint}/my`);
      return response.data;
    } catch (error) {
      console.error('Fehler beim Laden der eigenen Tasks:', error);
      throw this.handleError(error, 'Fehler beim Laden Ihrer Aufgaben');
    }
  }

  async create(data: Partial<Task>): Promise<Task> {
    try {
      // Basisvalidierung der IDs
      if (!data.title || data.title.trim() === '') throw new Error('Titel ist erforderlich');
      if (!data.responsibleId || typeof data.responsibleId !== 'number' || data.responsibleId <= 0) throw new Error('Verantwortlicher Benutzer ist erforderlich');
      if (!data.branchId || typeof data.branchId !== 'number' || data.branchId <= 0) throw new Error('Branch ist erforderlich');

      // === Daten FLATTEN für das Backend (wie im Controller erwartet!) ===
      const dataToSend = {
        title: data.title.trim(),
        description: data.description?.trim() || null, // null senden
        status: data.status || 'open',
        dueDate: formatDate(data.dueDate ?? null), // YYYY-MM-DD oder null
        responsibleId: data.responsibleId, // Flache ID
        branchId: data.branchId,         // Flache ID
        qualityControlId: data.qualityControlId, // Optional
        roleId: data.roleId               // Optional
      };
      
      // Entferne undefined/null Werte, außer description und dueDate
      const cleanedDataToSend = Object.fromEntries(
          Object.entries(dataToSend).filter(([key, value]) => 
              key === 'description' || key === 'dueDate' || (value !== undefined && value !== null)
          )
      );

      console.log('[TaskApiService.create] Sending FLATTENED data (Controller-like):', cleanedDataToSend);

      const response = await this.api.post<Task>(this.endpoint, cleanedDataToSend);
      if (!response.data || !response.data.id) {
        console.error("[TaskApiService.create] Invalid response from server:", response.data);
        throw new Error('Ungültige Antwort vom Server nach dem Erstellen');
      }
      return this.validateTaskResponse(response.data);
    } catch (error) {
      console.error('[TaskApiService] Fehler beim Erstellen der Task:', error);
      throw this.handleError(error, 'Erstellen der Task');
    }
  }

  async update(id: number, data: Partial<Task>): Promise<Task> {
    try {
        // Basisvalidierung der IDs
        if (!data.title || data.title.trim() === '') throw new Error('Titel ist erforderlich');
        if (!data.responsibleId || typeof data.responsibleId !== 'number' || data.responsibleId <= 0) throw new Error('Verantwortlicher Benutzer ist erforderlich');
        if (!data.branchId || typeof data.branchId !== 'number' || data.branchId <= 0) throw new Error('Branch ist erforderlich');

        // === Daten FLATTEN für das Backend (wie im Controller erwartet!) ===
        const dataToSend = {
            title: data.title.trim(),
            description: data.description?.trim() || null, 
            status: data.status,
            dueDate: formatDate(data.dueDate ?? null), // YYYY-MM-DD oder null
            responsibleId: data.responsibleId, // Flache ID
            branchId: data.branchId,         // Flache ID
            qualityControlId: data.qualityControlId, // Optional
            roleId: data.roleId               // Optional
        };

        // Entferne undefined/null Werte, außer description und dueDate
        const cleanedDataToSend = Object.fromEntries(
            Object.entries(dataToSend).filter(([key, value]) => 
                key === 'description' || key === 'dueDate' || (value !== undefined && value !== null)
            )
        );

        console.log(`[TaskApiService.update] Sending FLATTENED data (Controller-like) for Task ${id}:`, cleanedDataToSend);

        const response = await this.api.put<Task>(`${this.endpoint}/${id}`, cleanedDataToSend);
        if (!response.data || !response.data.id) {
            console.error(`[TaskApiService.update] Invalid response from server for task ${id}:`, response.data);
            throw new Error('Ungültige Antwort vom Server nach dem Aktualisieren');
        }
        return await this.getById(id); 
    } catch (error) {
        console.error(`[TaskApiService] Fehler beim Aktualisieren der Task mit ID ${id}:`, error);
        throw this.handleError(error, 'Aktualisieren der Task');
    }
  }

  async updateStatus(id: number, status: TaskStatus): Promise<Task> {
    try {
      console.log(`[TaskApiService] Aktualisiere Status für Task ID ${id} auf ${status}`);
      const response = await this.api.patch<Task>(`${this.endpoint}/${id}`, { status });
      if (!response.data) {
        throw new Error('Keine Daten in der API-Antwort');
      }
      
      console.log('[TaskApiService] Status aktualisiert, lade vollständige Daten');
      return await this.getById(id);
    } catch (error) {
      console.error(`[TaskApiService] Fehler beim Aktualisieren des Status für Task ID ${id}:`, error);
      throw this.handleError(error, 'Fehler beim Aktualisieren des Status');
    }
  }
}

class RequestApiService extends BaseApiService<Request> {
  constructor() {
    super('/requests');
  }

  async updateStatus(id: number, status: string, approverId?: number): Promise<any> {
    const response = await this.api.patch<any>(
      `${this.endpoint}/${id}/status`,
      { status, approverId }
    );
    return response.data;
  }

  async getByUser(userId: number): Promise<Request[]> {
    const response = await this.api.get<Request[]>(
      `${this.endpoint}/user/${userId}`
    );
    return response.data;
  }
}

class WorktimeApiService extends BaseApiService<MobileWorkTime> {
  constructor() {
    super('/worktime');
  }

  async getActive(): Promise<{ active: boolean; startTime?: string; id?: number; branchId?: number }> {
    console.log('Rufe aktive Zeiterfassung ab');
    const response = await this.api.get<{ active: boolean; startTime?: string; id?: number; branchId?: number }>(
      `${this.endpoint}/active`
    );
    console.log('Active worktime API response:', response.data);
    return response.data;
  }

  async getByDate(date: string): Promise<MobileWorkTime[]> {
    const response = await this.api.get<MobileWorkTime[]>(
      `${this.endpoint}?date=${date}`
    );
    return response.data;
  }

  async start(branchId: string): Promise<MobileWorkTime> {
    const startTime = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000);
    const response = await this.api.post<MobileWorkTime>(
      `${this.endpoint}/start`,
      { 
        branchId,
        startTime: startTime.toISOString()
      }
    );
    return response.data;
  }

  async stop(endTime?: Date): Promise<MobileWorkTime> {
    const stopTime = endTime || new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000);
    
    console.log('Stopping timer with endTime:', stopTime.toISOString());
    
    const response = await this.api.post<MobileWorkTime>(
      `${this.endpoint}/stop`,
      { 
        endTime: stopTime.toISOString()
      }
    );
    
    console.log('Stop timer response:', response.data);
    
    return response.data;
  }

  async getStats(startDate: string, endDate?: string): Promise<WorkTimeStatistics> {
    const response = await this.api.get<WorkTimeStatistics>(
      `${this.endpoint}/stats?startDate=${startDate}${endDate ? `&endDate=${endDate}` : ''}`
    );
    return response.data;
  }

  async syncOfflineEntries(entries: MobileWorkTime[]): Promise<MobileWorkTime[]> {
    console.log('Sending offline entries to sync:', entries);
    
    const cleanedEntries = entries.map(entry => {
      const { offlineId, synced, active, ...rest } = entry;
      return rest;
    });
    
    const response = await this.api.post<MobileWorkTime[]>(
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
  
  async getAllUsers(): Promise<User[]> {
    const response = await this.api.get<User[]>(this.endpoint);
    return response.data;
  }

  async getByRole(roleId: number): Promise<User[]> {
    const response = await this.api.get<User[]>(`${this.endpoint}/role/${roleId}`);
    return response.data;
  }
}

class BranchApiService extends BaseApiService<Branch> {
  constructor() {
    super('/branches');
  }
  
  async getAllBranches(): Promise<Branch[]> {
    const response = await this.api.get<Branch[]>(this.endpoint);
    return response.data;
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

  async upload(formData: FormData, entityType?: string, entityId?: number): Promise<Document> {
    const config: AxiosRequestConfig = {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { entityType, entityId }
    };
    
    const response = await this.api.post<Document>(
      `${this.endpoint}/upload`,
      formData,
      config
    );
    return response.data;
  }

  async getByEntity(entityType: string, entityId: number): Promise<Document[]> {
    const response = await this.api.get<Document[]>(
      `${this.endpoint}/entity/${entityType}/${entityId}`
    );
    return response.data;
  }
}

class NotificationApiService extends BaseApiService<Notification> {
  constructor() {
    super('/notifications');
  }

  async getNotifications(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Notification>> {
    const response = await this.api.get<PaginatedResponse<Notification>>(
      this.endpoint,
      { params: { page, limit } }
    );
    return response.data;
  }
  
  async getUnreadCount(): Promise<number> {
    try {
      const response = await this.api.get<{count: number}>(
        `${this.endpoint}/unread/count`
      );
      return response.data.count;
    } catch (error) {
      console.error('Fehler beim Abrufen der ungelesenen Benachrichtigungen:', error);
      return 0;
    }
  }
  
  async markAsRead(id: number): Promise<Notification> {
    const response = await this.api.patch<Notification>(
      `${this.endpoint}/${id}/read`
    );
    return response.data;
  }
  
  async markAllAsRead(): Promise<any> {
    const response = await this.api.patch<any>(
      `${this.endpoint}/read-all`
    );
    return response.data;
  }
  
  async deleteNotification(id: number): Promise<any> {
    const response = await this.api.delete<any>(
      `${this.endpoint}/${id}`
    );
    return response.data;
  }
  
  async deleteAllNotifications(): Promise<any> {
    const response = await this.api.delete<any>(
      this.endpoint
    );
    return response.data;
  }
}

// Interface für gespeicherte Filter
export interface SavedFilter {
  id: number;
  name: string;
  tableId: string;
  conditions: any[];
  operators: string[];
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

class SavedFilterApiService extends BaseApiService<SavedFilter> {
  constructor() {
    super('/saved-filters');
  }
  
  // Lade gespeicherte Filter für eine bestimmte Tabelle
  async getByTable(tableId: string): Promise<SavedFilter[]> {
    try {
      const response = await this.api.get<SavedFilter[]>(`${this.endpoint}/${tableId}`);
      return response.data;
    } catch (error) {
      console.error('Fehler beim Laden der gespeicherten Filter:', error);
      throw this.handleError(error, 'Laden gespeicherter Filter');
    }
  }
  
  // Erstelle oder aktualisiere einen gespeicherten Filter
  async saveFilter(filter: Omit<SavedFilter, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<SavedFilter> {
    try {
      const response = await this.api.post<SavedFilter>(this.endpoint, filter);
      return response.data;
    } catch (error) {
      console.error('Fehler beim Speichern des Filters:', error);
      throw this.handleError(error, 'Speichern des Filters');
    }
  }
  
  // Lösche einen gespeicherten Filter
  async deleteFilter(filterId: number): Promise<void> {
    try {
      await this.api.delete(`${this.endpoint}/${filterId}`);
    } catch (error) {
      console.error('Fehler beim Löschen des Filters:', error);
      throw this.handleError(error, 'Löschen des Filters');
    }
  }
}

export const authApi = new AuthService();
export const taskApi = new TaskApiService();
export const userApi = new UserApiService();
export const branchApi = new BranchApiService();
export const requestApi = new RequestApiService();
export const documentApi = new DocumentApiService();
export const worktimeApi = new WorktimeApiService();
export const notificationApi = new NotificationApiService();
export const roleApi = new RoleApiService();
export const savedFilterApi = new SavedFilterApiService();

export default axiosInstance;