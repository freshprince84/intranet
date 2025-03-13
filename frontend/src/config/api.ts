/// <reference types="node" />

// API-Konfigurationsdatei
// Diese Datei enthält alle API-Endpunkte für die Anwendung

// API-Basis-URL basierend auf der Umgebung
export const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? window.location.hostname === 'localhost'
    ? 'http://localhost:5000'  // Lokale Entwicklung auf localhost
    : `http://${window.location.hostname}:5000`  // Entwicklung über IP
  : ''; // Leerer String für Produktionsumgebung, dadurch werden alle Pfade relativ

// Vollständige API-URL
// Im Entwicklungsmodus: vollständige URL mit /api
// Im Produktionsmodus: nur '/api' als Präfix, da die Nginx-Konfiguration dies bereits korrekt weiterleitet
export const API_URL = process.env.NODE_ENV === 'development'
  ? `${API_BASE_URL}/api`
  : '/api';

// WICHTIG: Diese Endpunkte werden zur baseURL hinzugefügt, die bereits API_URL enthält
// Daher dürfen die Endpunkte hier NICHT mit API_URL beginnen!
export const API_ENDPOINTS = {
    // Authentifizierung
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        LOGOUT: '/auth/logout',
        CURRENT_USER: '/auth/currentUser'
    },
    // Aufgaben
    TASKS: {
        BASE: '/tasks',
        BY_ID: (id: number) => `/tasks/${id}`,
        BY_USER: (userId: number) => `/tasks/user/${userId}`
    },
    // Anträge
    REQUESTS: {
        BASE: '/requests',
        BY_ID: (id: number) => `/requests/${id}`,
        BY_USER: (userId: number) => `/requests/user/${userId}`,
        APPROVE: (id: number) => `/requests/${id}/approve`,
        REJECT: (id: number) => `/requests/${id}/reject`
    },
    // Rollen
    ROLES: {
        BASE: '/roles',
        BY_ID: (id: number) => `/roles/${id}`,
        PERMISSIONS: (id: number) => `/roles/${id}/permissions`
    },
    // Einstellungen
    SETTINGS: {
        BASE: '/settings',
        BY_KEY: (key: string) => `/settings/${key}`
    },
    // Zeiterfassung
    WORKTIME: {
        BASE: '/worktime',
        BY_ID: (id: number) => `/worktime/${id}`,
        BY_USER: (userId: number) => `/worktime/user/${userId}`,
        START: '/worktime/start',
        STOP: '/worktime/stop',
        ACTIVE: '/worktime/active',
        STATS: '/worktime/stats'
    },
    // Niederlassungen
    BRANCHES: {
        BASE: '/branches',
        BY_ID: (id: number) => `/branches/${id}`
    },
    // Benutzer
    USERS: {
        BASE: '/users',
        BY_ID: (id: number) => `/users/${id}`,
        CHANGE_ROLE: (id: number) => `/users/${id}/role`
    },
    // Team Worktime Control
    TEAM_WORKTIME: {
        ACTIVE: '/team-worktime/active',
        STOP_USER: '/team-worktime/stop-user',
        USER_DAY: '/team-worktime/user-day',
        UPDATE: '/team-worktime/update',
        OVERTIME: '/team-worktime/overtime'
    },
    // Cerebro Wiki-System
    CEREBRO: {
        // Artikel
        ARTICLES: {
            BASE: '/cerebro/carticles',
            BY_ID: (id: number) => `/cerebro/carticles/${id}`,
            BY_SLUG: (slug: string) => `/cerebro/carticles/slug/${slug}`,
            STRUCTURE: '/cerebro/carticles/structure',
            SEARCH: (query: string) => `/cerebro/carticles/search?q=${encodeURIComponent(query)}`
        },
        // Medien
        MEDIA: {
            UPLOAD: '/cerebro/media/upload',
            BY_ARTICLE: (carticleId: number) => `/cerebro/media/carticle/${carticleId}`,
            BY_ID: (id: number) => `/cerebro/media/${id}`
        },
        // Externe Links
        EXTERNAL_LINKS: {
            BASE: '/cerebro/external-links',
            BY_ARTICLE: (carticleId: number) => `/cerebro/external-links/carticle/${carticleId}`,
            BY_ID: (id: number) => `/cerebro/external-links/${id}`,
            PREVIEW: (url: string) => `/cerebro/external-links/preview?url=${encodeURIComponent(url)}`
        }
    }
};

// Exportiere die API-Endpunkte als Standard-Export
export default API_ENDPOINTS; 