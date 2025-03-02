/// <reference types="node" />

// API-Konfigurationsdatei
// Diese Datei enthält alle API-Endpunkte für die Anwendung

// API-Basis-URL basierend auf der Umgebung
export const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? `http://${window.location.hostname}:5000`
  : `http://${window.location.hostname}:5000`;

// Vollständige API-URL (BASE_URL + /api)
export const API_URL = `${API_BASE_URL}/api`;

// Alle API-Endpunkte
export const API_ENDPOINTS = {
    // Authentifizierung
    AUTH: {
        LOGIN: `${API_URL}/auth/login`,
        REGISTER: `${API_URL}/auth/register`,
        LOGOUT: `${API_URL}/auth/logout`,
        CURRENT_USER: `${API_URL}/auth/currentUser`
    },
    // Aufgaben
    TASKS: {
        BASE: `${API_URL}/tasks`,
        BY_ID: (id: number) => `${API_URL}/tasks/${id}`,
        BY_USER: (userId: number) => `${API_URL}/tasks/user/${userId}`
    },
    // Anträge
    REQUESTS: {
        BASE: `${API_URL}/requests`,
        BY_ID: (id: number) => `${API_URL}/requests/${id}`,
        BY_USER: (userId: number) => `${API_URL}/requests/user/${userId}`,
        APPROVE: (id: number) => `${API_URL}/requests/${id}/approve`,
        REJECT: (id: number) => `${API_URL}/requests/${id}/reject`
    },
    // Rollen
    ROLES: {
        BASE: `${API_URL}/roles`,
        BY_ID: (id: number) => `${API_URL}/roles/${id}`,
        PERMISSIONS: (id: number) => `${API_URL}/roles/${id}/permissions`
    },
    // Einstellungen
    SETTINGS: {
        BASE: `${API_URL}/settings`,
        BY_KEY: (key: string) => `${API_URL}/settings/${key}`
    },
    // Zeiterfassung
    WORKTIME: {
        BASE: `${API_URL}/worktime`,
        BY_ID: (id: number) => `${API_URL}/worktime/${id}`,
        BY_USER: (userId: number) => `${API_URL}/worktime/user/${userId}`,
        START: `${API_URL}/worktime/start`,
        STOP: `${API_URL}/worktime/stop`,
        ACTIVE: `${API_URL}/worktime/active`
    },
    // Niederlassungen
    BRANCHES: {
        BASE: `${API_URL}/branches`,
        BY_ID: (id: number) => `${API_URL}/branches/${id}`
    },
    // Benutzer
    USERS: {
        BASE: `${API_URL}/users`,
        BY_ID: (id: number) => `${API_URL}/users/${id}`,
        CHANGE_ROLE: (id: number) => `${API_URL}/users/${id}/role`
    }
};

// Exportiere die API-Endpunkte als Standard-Export
export default API_ENDPOINTS; 