// Zentrale Konfiguration für API-URLs
export const API_BASE_URL = 'http://localhost:5000';
export const API_URL = `${API_BASE_URL}/api`;

// API-Endpunkte
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_URL}/auth/login`,
    REGISTER: `${API_URL}/auth/register`,
    LOGOUT: `${API_URL}/auth/logout`,
    USER: `${API_URL}/auth/user`,
  },
  TASKS: {
    BASE: `${API_URL}/tasks`,
    DETAIL: (id: number) => `${API_URL}/tasks/${id}`,
  },
  REQUESTS: {
    BASE: `${API_URL}/requests`,
    DETAIL: (id: number) => `${API_URL}/requests/${id}`,
  },
  ROLES: {
    BASE: `${API_URL}/roles`,
    DETAIL: (id: number) => `${API_URL}/roles/${id}`,
    PERMISSIONS: (id: number) => `${API_URL}/roles/${id}/permissions`,
  },
  SETTINGS: {
    BASE: `${API_URL}/settings`,
    LOGO: `${API_URL}/settings/logo`,
  },
  WORKTIME: {
    BASE: `${API_URL}/worktime`,
    START: `${API_URL}/worktime/start`,
    STOP: `${API_URL}/worktime/stop`,
    ACTIVE: `${API_URL}/worktime/active`,
    STATS: `${API_URL}/worktime/stats`,
    EXPORT: `${API_URL}/worktime/export`,
    DETAIL: (id: number) => `${API_URL}/worktime/${id}`,
  },
  BRANCHES: {
    BASE: `${API_URL}/branches`,
    DETAIL: (id: number) => `${API_URL}/branches/${id}`,
  },
  USERS: {
    BASE: `${API_URL}/users`,
    DETAIL: (id: number) => `${API_URL}/users/${id}`,
  },
}; 