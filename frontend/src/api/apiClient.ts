import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '../config/api.ts';

// Konfiguriere axios für alle Requests
console.log('DEBUGAUSGABE API-Client: API_URL ist:', API_URL);

// Initialisiere API-Client mit der API_URL
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    // Vollständige URL ausgeben
    const fullUrl = `${config.baseURL}${config.url}`;
    console.log('DEBUGAUSGABE API-Client: Vollständige Request URL:', fullUrl);
    console.log('DEBUGAUSGABE API-Client: Request-Methode:', config.method?.toUpperCase());
    console.log('DEBUGAUSGABE API-Client: Request-Headers:', config.headers);
    console.log('DEBUGAUSGABE API-Client: Request-Daten:', config.data);
    
    console.log('DEBUGAUSGABE API-Client: Token vorhanden:', !!token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('DEBUGAUSGABE API-Client: Fehler im Request Interceptor:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log('DEBUGAUSGABE API-Client: Response erhalten:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('DEBUGAUSGABE API-Client: Fehler im Response Interceptor:', error.message);
    
    if (error.response) {
      console.error('DEBUGAUSGABE API-Client: Response Status:', error.response.status);
      console.error('DEBUGAUSGABE API-Client: Response Daten:', error.response.data);
    } else {
      console.error('DEBUGAUSGABE API-Client: Keine Response erhalten');
    }
    
    return Promise.reject(error);
  }
);

// User API
export const userApi = {
  getAll: () => apiClient.get('/users'),
  getById: (id: number) => apiClient.get(`/users/${id}`),
  update: (id: number, data: any) => apiClient.put(`/users/${id}`, data),
  updateRoles: (id: number, roleIds: number[]) => apiClient.put(`/users/${id}/roles`, { roleIds })
};

// Role API
export const roleApi = {
  getAll: () => {
    console.log('DEBUGAUSGABE API-Client: roleApi.getAll wird aufgerufen');
    return apiClient.get('/roles')
      .then(response => {
        console.log('DEBUGAUSGABE API-Client: roleApi.getAll erfolgreich:', response.data.length, 'Rollen geladen');
        return response;
      })
      .catch(error => {
        console.error('DEBUGAUSGABE API-Client: roleApi.getAll Fehler:', error.message);
        throw error;
      });
  },
  getById: (id: number) => {
    console.log(`DEBUGAUSGABE API-Client: roleApi.getById(${id}) wird aufgerufen`);
    return apiClient.get(`/roles/${id}`);
  },
  create: (data: any) => {
    console.log('DEBUGAUSGABE API-Client: roleApi.create wird aufgerufen mit Daten:', data);
    try {
      return apiClient.post('/roles', data)
        .then(response => {
          console.log('DEBUGAUSGABE API-Client: roleApi.create Antwort:', response);
          return response;
        })
        .catch(error => {
          console.error('DEBUGAUSGABE API-Client: roleApi.create Fehler:', error.response || error);
          throw error;
        });
    } catch (initError) {
      console.error('DEBUGAUSGABE API-Client: Fehler vor dem API-Aufruf in roleApi.create:', initError);
      throw initError;
    }
  },
  update: (id: number, data: any) => {
    console.log(`DEBUGAUSGABE API-Client: roleApi.update für ID ${id} wird aufgerufen mit Daten:`, data);
    try {
      return apiClient.put(`/roles/${id}`, data)
        .then(response => {
          console.log('DEBUGAUSGABE API-Client: roleApi.update Antwort:', response);
          return response;
        })
        .catch(error => {
          console.error('DEBUGAUSGABE API-Client: roleApi.update Fehler:', error.response || error);
          throw error;
        });
    } catch (initError) {
      console.error('DEBUGAUSGABE API-Client: Fehler vor dem API-Aufruf in roleApi.update:', initError);
      throw initError;
    }
  },
  delete: (id: number) => {
    console.log(`DEBUGAUSGABE API-Client: roleApi.delete(${id}) wird aufgerufen`);
    return apiClient.delete(`/roles/${id}`);
  }
};

export default apiClient; 