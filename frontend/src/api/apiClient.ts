import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import axiosInstance from '../config/axios.ts';
import { API_URL } from '../config/api.ts';
import { logger } from '../utils/logger.ts';

// Debugausgaben für die API-Konfiguration
logger.log('DEBUGAUSGABE API-Client: API_URL ist:', API_URL);

// Verwende die konfigurierte Instanz aus config/axios.ts
const apiClient = axiosInstance;

// Request Interceptor für Debugging (zusätzlich zu dem in axios.ts)
apiClient.interceptors.request.use(
  (config) => {
    // Vollständige URL ausgeben
    const fullUrl = `${config.baseURL}${config.url}`;
    logger.log('DEBUGAUSGABE API-Client: Vollständige Request URL:', fullUrl);
    logger.log('DEBUGAUSGABE API-Client: Request-Methode:', config.method?.toUpperCase());
    logger.log('DEBUGAUSGABE API-Client: Request-Headers:', config.headers);
    logger.log('DEBUGAUSGABE API-Client: Request-Daten:', config.data);
    
    const token = localStorage.getItem('token');
    logger.log('DEBUGAUSGABE API-Client: Token vorhanden:', !!token);
    
    return config;
  },
  (error) => {
    logger.error('DEBUGAUSGABE API-Client: Fehler im Request Interceptor:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor für Debugging (zusätzlich zu dem in axios.ts)
apiClient.interceptors.response.use(
  (response) => {
    logger.log('DEBUGAUSGABE API-Client: Response erhalten:', response.status, response.config.url);
    return response;
  },
  (error) => {
    logger.error('DEBUGAUSGABE API-Client: Fehler im Response Interceptor:', error.message);
    
    if (error.response) {
      logger.error('DEBUGAUSGABE API-Client: Response Status:', error.response.status);
      logger.error('DEBUGAUSGABE API-Client: Response Daten:', error.response.data);
    } else {
      logger.error('DEBUGAUSGABE API-Client: Keine Response erhalten');
    }
    
    return Promise.reject(error);
  }
);

// User API
export const userApi = {
  getAll: () => apiClient.get('/users'),
  getById: (id: number) => apiClient.get(`/users/${id}`),
  create: (data: any) => {
    logger.log('DEBUGAUSGABE API-Client: userApi.create wird aufgerufen mit Daten:', data);
    try {
      return apiClient.post('/users', data)
        .then(response => {
          logger.log('DEBUGAUSGABE API-Client: userApi.create Antwort:', response);
          return response;
        })
        .catch(error => {
          logger.error('DEBUGAUSGABE API-Client: userApi.create Fehler:', error.response || error);
          throw error;
        });
    } catch (initError) {
      logger.error('DEBUGAUSGABE API-Client: Fehler vor dem API-Aufruf in userApi.create:', initError);
      throw initError;
    }
  },
  update: (id: number, data: any) => apiClient.put(`/users/${id}`, data),
  updateRoles: (id: number, roleIds: number[]) => apiClient.put(`/users/${id}/roles`, { roleIds }),
  updateBranches: (id: number, branchIds: number[]) => apiClient.put(`/users/${id}/branches`, { branchIds })
};

// Role API
export const roleApi = {
  getAll: (branchId?: number) => {
    logger.log('DEBUGAUSGABE API-Client: roleApi.getAll wird aufgerufen', branchId ? `mit branchId=${branchId}` : '');
    const url = branchId ? `/roles?branchId=${branchId}` : '/roles';
    return apiClient.get(url)
      .then(response => {
        logger.log('DEBUGAUSGABE API-Client: roleApi.getAll erfolgreich:', response.data.length, 'Rollen geladen');
        return response;
      })
      .catch(error => {
        logger.error('DEBUGAUSGABE API-Client: roleApi.getAll Fehler:', error.message);
        throw error;
      });
  },
  getById: (id: number) => {
    logger.log(`DEBUGAUSGABE API-Client: roleApi.getById(${id}) wird aufgerufen`);
    return apiClient.get(`/roles/${id}`);
  },
  create: (data: any) => {
    logger.log('DEBUGAUSGABE API-Client: roleApi.create wird aufgerufen mit Daten:', data);
    try {
      return apiClient.post('/roles', data)
        .then(response => {
          logger.log('DEBUGAUSGABE API-Client: roleApi.create Antwort:', response);
          return response;
        })
        .catch(error => {
          logger.error('DEBUGAUSGABE API-Client: roleApi.create Fehler:', error.response || error);
          throw error;
        });
    } catch (initError) {
      logger.error('DEBUGAUSGABE API-Client: Fehler vor dem API-Aufruf in roleApi.create:', initError);
      throw initError;
    }
  },
  update: (id: number, data: any) => {
    logger.log(`DEBUGAUSGABE API-Client: roleApi.update für ID ${id} wird aufgerufen mit Daten:`, data);
    try {
      return apiClient.put(`/roles/${id}`, data)
        .then(response => {
          logger.log('DEBUGAUSGABE API-Client: roleApi.update Antwort:', response);
          return response;
        })
        .catch(error => {
          logger.error('DEBUGAUSGABE API-Client: roleApi.update Fehler:', error.response || error);
          throw error;
        });
    } catch (initError) {
      logger.error('DEBUGAUSGABE API-Client: Fehler vor dem API-Aufruf in roleApi.update:', initError);
      throw initError;
    }
  },
  delete: (id: number) => {
    logger.log(`DEBUGAUSGABE API-Client: roleApi.delete(${id}) wird aufgerufen`);
    return apiClient.delete(`/roles/${id}`);
  },
  getRoleBranches: (id: number) => {
    logger.log(`DEBUGAUSGABE API-Client: roleApi.getRoleBranches(${id}) wird aufgerufen`);
    return apiClient.get(`/roles/${id}/branches`);
  },
  updateRoleBranches: (id: number, data: { allBranches?: boolean; branchIds?: number[] }) => {
    logger.log(`DEBUGAUSGABE API-Client: roleApi.updateRoleBranches(${id}) wird aufgerufen mit:`, data);
    return apiClient.put(`/roles/${id}/branches`, data);
  }
};

// Branch API
export const branchApi = {
  getAll: (roleId?: number) => {
    const url = roleId ? `/branches?roleId=${roleId}` : '/branches';
    return apiClient.get(url);
  },
  getById: (id: number) => apiClient.get(`/branches/${id}`),
  getUserBranches: () => apiClient.get('/branches/user'),
  switchBranch: (branchId: number) => apiClient.put('/branches/switch', { branchId }),
  create: (data: any) => apiClient.post('/branches', data),
  update: (id: number, data: any) => apiClient.put(`/branches/${id}`, data),
  delete: (id: number) => apiClient.delete(`/branches/${id}`)
};

export default apiClient; 