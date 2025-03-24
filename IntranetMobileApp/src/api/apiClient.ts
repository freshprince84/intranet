/**
 * API-Client für die mobile App
 * Basierend auf dem Web-Frontend-Client, aber angepasst für React Native
 */

import axiosInstance from '../config/axios';
import { API_ENDPOINTS } from '../config/api';

// Hauptclient-Instanz
const apiClient = axiosInstance;

// User API
export const userApi = {
  getAll: () => apiClient.get(API_ENDPOINTS.USERS.BASE),
  getById: (id: number) => apiClient.get(API_ENDPOINTS.USERS.BY_ID(id)),
  update: (id: number, data: any) => apiClient.put(API_ENDPOINTS.USERS.BY_ID(id), data),
  updateRoles: (id: number, roleIds: number[]) => apiClient.put(API_ENDPOINTS.USERS.ROLES(id), { roleIds })
};

// Role API
export const roleApi = {
  getAll: () => apiClient.get('/roles'),
  getById: (id: number) => apiClient.get(`/roles/${id}`),
  create: (data: any) => apiClient.post('/roles', data),
  update: (id: number, data: any) => apiClient.put(`/roles/${id}`, data),
  delete: (id: number) => apiClient.delete(`/roles/${id}`)
};

// Worktime API
export const worktimeApi = {
  getAll: () => apiClient.get(API_ENDPOINTS.WORKTIME.BASE),
  getById: (id: number) => apiClient.get(API_ENDPOINTS.WORKTIME.BY_ID(id)),
  start: (branchId: number) => apiClient.post(API_ENDPOINTS.WORKTIME.START, { branchId }),
  stop: (id: number) => apiClient.put(API_ENDPOINTS.WORKTIME.STOP, { id }),
  // Zusätzliche mobile-spezifische Methode für Offline-Synchronisierung
  syncOfflineEntries: (entries: any[]) => apiClient.post('/worktime/sync', { entries })
};

// Auth API
export const authApi = {
  login: (username: string, password: string) => 
    apiClient.post(API_ENDPOINTS.AUTH.LOGIN, { username, password }),
  logout: () => apiClient.post(API_ENDPOINTS.AUTH.LOGOUT),
  refresh: (refreshToken: string) => 
    apiClient.post(API_ENDPOINTS.AUTH.REFRESH, { refreshToken })
};

// Weitere APIs nach Bedarf...

export default apiClient; 