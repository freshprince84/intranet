import axios from 'axios';
import { API_URL } from '../config/api.ts';

// Konfiguriere axios für alle Requests
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
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
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
  getAll: () => apiClient.get('/roles'),
  getById: (id: number) => apiClient.get(`/roles/${id}`),
  create: (data: any) => apiClient.post('/roles', data),
  update: (id: number, data: any) => apiClient.put(`/roles/${id}`, data),
  delete: (id: number) => apiClient.delete(`/roles/${id}`)
};

export default apiClient; 