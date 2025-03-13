/// <reference types="node" />

// API-Konfigurationsdatei
// Diese Datei enthält alle API-Endpunkte für die Anwendung

// API-Basis-URL basierend auf der Umgebung
export const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? `http://${window.location.hostname}:5000`
  : ''; // Leerer String für Produktionsumgebung, dadurch werden alle Pfade relativ

// Vollständige API-URL
// In der Entwicklung vollständige URL mit /api
// In Produktion nur leerer String, da die baseURL in axios.ts bereits /api enthält
export const API_URL = process.env.NODE_ENV === 'development'
  ? `${API_BASE_URL}/api`
  : '';

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
    },
    // Team Worktime Control
    TEAM_WORKTIME: {
        ACTIVE: `${API_URL}/team-worktime/active`,
        STOP_USER: `${API_URL}/team-worktime/stop-user`,
        USER_DAY: `${API_URL}/team-worktime/user-day`,
        UPDATE: `${API_URL}/team-worktime/update`,
        OVERTIME: `${API_URL}/team-worktime/overtime`
    },
    // Cerebro Wiki-System
    CEREBRO: {
        // Artikel
        ARTICLES: {
            BASE: `${API_URL}/cerebro/carticles`,
            BY_ID: (id: number) => `${API_URL}/cerebro/carticles/${id}`,
            BY_SLUG: (slug: string) => `${API_URL}/cerebro/carticles/slug/${slug}`,
            STRUCTURE: `${API_URL}/cerebro/carticles/structure`,
            SEARCH: (query: string) => `${API_URL}/cerebro/carticles/search?q=${encodeURIComponent(query)}`
        },
        // Medien
        MEDIA: {
            UPLOAD: `${API_URL}/cerebro/media/upload`,
            BY_ARTICLE: (carticleId: number) => `${API_URL}/cerebro/media/carticle/${carticleId}`,
            BY_ID: (id: number) => `${API_URL}/cerebro/media/${id}`
        },
        // Externe Links
        EXTERNAL_LINKS: {
            BASE: `${API_URL}/cerebro/external-links`,
            BY_ARTICLE: (carticleId: number) => `${API_URL}/cerebro/external-links/carticle/${carticleId}`,
            BY_ID: (id: number) => `${API_URL}/cerebro/external-links/${id}`,
            PREVIEW: (url: string) => `${API_URL}/cerebro/external-links/preview?url=${encodeURIComponent(url)}`
        }
    }
};

// Exportiere die API-Endpunkte als Standard-Export
export default API_ENDPOINTS; 