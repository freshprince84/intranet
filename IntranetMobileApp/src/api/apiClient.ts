/**
 * API-Client für die Intranet Mobile App
 * Stellt Funktionen für die Kommunikation mit dem Backend bereit
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse, LoginCredentials, AuthResponse, Task, Request, User, Branch, Role, Document, PaginatedResponse, FilterOptions, Notification, NotificationType, WorkTime, WorkTimeStatistics } from '../types';

// Basis-URL für alle API-Anfragen
const BASE_URL = 'http://192.168.1.120:5000/api';

// Timeouts
const TIMEOUT = 30000; // 30 Sekunden

// Erstelle eine axios-Instanz mit Standardkonfiguration
const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Auth-Token zu jeder Anfrage hinzufügen
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@IntranetApp:token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Fehlerbehandlung und automatische Token-Erneuerung
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Wenn Anfrage fehlgeschlagen ist wegen ungültigem Token und wir haben noch nicht versucht, das Token zu erneuern
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Hole Refresh-Token
        const refreshToken = await AsyncStorage.getItem('@IntranetApp:refreshToken');
        
        if (refreshToken) {
          // Versuche, ein neues Token zu erhalten
          const response = await axios.post(
            `${BASE_URL}/auth/refresh-token`,
            { refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );
          
          const { token, refreshToken: newRefreshToken } = response.data;
          
          // Speichere neue Tokens
          await AsyncStorage.setItem('@IntranetApp:token', token);
          await AsyncStorage.setItem('@IntranetApp:refreshToken', newRefreshToken);
          
          // Wiederhole die ursprüngliche Anfrage mit neuem Token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // Token-Erneuerung fehlgeschlagen, Benutzer muss sich neu anmelden
        await AsyncStorage.removeItem('@IntranetApp:token');
        await AsyncStorage.removeItem('@IntranetApp:refreshToken');
        
        // Hier könnte ein Event ausgelöst werden, um die App zur Login-Seite umzuleiten
      }
    }
    
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

class TaskApiService extends BaseApiService<Task> {
  constructor() {
    super('/tasks');
  }

  // Aufgabenstatus aktualisieren
  async updateStatus(id: number, status: string): Promise<any> {
    const response = await axiosInstance.patch<any>(
      `${this.endpoint}/${id}/status`,
      { status }
    );
    return response.data;
  }

  // Aufgaben für einen bestimmten Benutzer abrufen
  async getByUser(userId: number): Promise<Task[]> {
    const response = await axiosInstance.get<Task[]>(
      `${this.endpoint}/user/${userId}`
    );
    return response.data;
  }

  // Aufgaben für eine bestimmte Rolle abrufen
  async getByRole(roleId: number): Promise<Task[]> {
    const response = await axiosInstance.get<Task[]>(
      `${this.endpoint}/role/${roleId}`
    );
    return response.data;
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

class WorktimeApiService extends BaseApiService<WorkTime> {
  constructor() {
    super('/worktime');
  }

  // Aktiven Timer abrufen
  async getActive(): Promise<any> {
    const response = await axiosInstance.get<any>(
      `${this.endpoint}/active`
    );
    return response.data;
  }

  // Timer starten
  async start(branchId: number): Promise<any> {
    const response = await axiosInstance.post<any>(
      `${this.endpoint}/start`,
      { branchId }
    );
    return response.data;
  }

  // Timer stoppen
  async stop(id: number, notes?: string): Promise<any> {
    const response = await axiosInstance.post<any>(
      `${this.endpoint}/stop/${id}`,
      { notes }
    );
    return response.data;
  }

  // Arbeitszeiten für ein bestimmtes Datum abrufen
  async getByDate(date: string): Promise<WorkTime[]> {
    const response = await axiosInstance.get<WorkTime[]>(
      `${this.endpoint}?date=${date}`
    );
    return response.data;
  }

  // Arbeitszeit-Statistiken abrufen
  async getStats(weekStart: string): Promise<WorkTimeStatistics> {
    const response = await axiosInstance.get<WorkTimeStatistics>(
      `${this.endpoint}/stats`,
      { params: { week: weekStart } }
    );
    return response.data;
  }
  
  // Offline-Eintrag mit dem Server synchronisieren
  async syncOfflineEntries(entries: WorkTime[]): Promise<any> {
    const response = await axiosInstance.post<any>(
      `${this.endpoint}/sync-offline`,
      { entries }
    );
    return response.data;
  }
}

class UserApiService extends BaseApiService<User> {
  constructor() {
    super('/users');
  }
}

class BranchApiService extends BaseApiService<Branch> {
  constructor() {
    super('/branches');
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

// Erstelle und exportiere API-Instanzen
export const authApi = new AuthService();
export const taskApi = new TaskApiService();
export const requestApi = new RequestApiService();
export const userApi = new UserApiService();
export const branchApi = new BranchApiService();
export const roleApi = new RoleApiService();
export const documentApi = new DocumentApiService();
export const notificationApi = new NotificationApiService();
export const worktimeApi = new WorktimeApiService();

// Exportiere die Axios-Instanz für direkte Verwendung bei Bedarf
export default axiosInstance;