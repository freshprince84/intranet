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
        BY_USER: (userId: number) => `/tasks/user/${userId}`,
        CARTICLES: (id: number) => `/tasks/${id}/carticles`,
        LINK_CARTICLE: (taskId: number, carticleId: number) => `/tasks/${taskId}/carticles/${carticleId}`,
        UNLINK_CARTICLE: (taskId: number, carticleId: number) => `/tasks/${taskId}/carticles/${carticleId}`,
        ATTACHMENTS: (taskId: number) => `/tasks/${taskId}/attachments`,
        ATTACHMENT: (taskId: number, attachmentId: number) => `/tasks/${taskId}/attachments/${attachmentId}`
    },
    // Anträge
    REQUESTS: {
        BASE: '/requests',
        BY_ID: (id: number) => `/requests/${id}`,
        BY_USER: (userId: number) => `/requests/user/${userId}`,
        APPROVE: (id: number) => `/requests/${id}/approve`,
        REJECT: (id: number) => `/requests/${id}/reject`,
        ATTACHMENTS: (requestId: number) => `/requests/${requestId}/attachments`,
        ATTACHMENT: (requestId: number, attachmentId: number) => `/requests/${requestId}/attachments/${attachmentId}`
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
        DROPDOWN: '/users/dropdown',
        BY_ID: (id: number) => `/users/${id}`,
        CHANGE_ROLE: (id: number) => `/users/${id}/role`,
        INVOICE_SETTINGS: '/users/invoice-settings'
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
    },
    // Identifikationsdokumente
    IDENTIFICATION_DOCUMENTS: {
        BASE: '/identification-documents',
        BY_USER: (userId: number) => `/identification-documents/user/${userId}`,
        BY_ID: (docId: number) => `/identification-documents/${docId}`,
        VERIFY: (docId: number) => `/identification-documents/${docId}/verify`,
        DOWNLOAD: (docId: number) => `/identification-documents/${docId}/download`
    },
    // Gespeicherte Filter
    SAVED_FILTERS: {
        BASE: '/saved-filters',
        BY_TABLE: (tableId: string) => `/saved-filters/${tableId}`,
        BY_ID: (id: number) => `/saved-filters/${id}`
    },
    // Clients
    CLIENTS: {
        BASE: '/clients',
        BY_ID: (id: number) => `/clients/${id}`,
        RECENT: '/clients/recent'
    },
    // Consultations
    CONSULTATIONS: {
        BASE: '/consultations',
        START: '/consultations/start',
        STOP: '/consultations/stop',
        BY_ID: (id: number) => `/consultations/${id}`,
        LINK_TASK: (id: number) => `/consultations/${id}/link-task`,
        CREATE_TASK: (id: number) => `/consultations/${id}/create-task`,
        UPDATE_NOTES: (id: number) => `/consultations/${id}/notes`
    },
    // Invoice Settings
    INVOICE_SETTINGS: {
        BASE: '/invoice-settings',
        NEXT_NUMBER: '/invoice-settings/next-number'
    },
    // Consultation Invoices
    CONSULTATION_INVOICES: {
        BASE: '/consultation-invoices',
        BY_ID: (id: number) => `/consultation-invoices/${id}`,
        CREATE_FROM_CONSULTATIONS: '/consultation-invoices/create-from-consultations',
        GENERATE_PDF: (id: number) => `/consultation-invoices/${id}/pdf`,
        UPDATE_STATUS: (id: number) => `/consultation-invoices/${id}/status`,
        MARK_PAID: (id: number) => `/consultation-invoices/${id}/mark-paid`,
        CANCEL: (id: number) => `/consultation-invoices/${id}/cancel`
    },
    // Monthly Consultation Reports
    MONTHLY_CONSULTATION_REPORTS: {
        BASE: '/monthly-consultation-reports',
        BY_ID: (id: number) => `/monthly-consultation-reports/${id}`,
        GENERATE: '/monthly-consultation-reports/generate',
        GENERATE_AUTOMATIC: '/monthly-consultation-reports/generate-automatic',
        UPDATE_STATUS: (id: number) => `/monthly-consultation-reports/${id}/status`,
        CHECK_UNBILLED: '/monthly-consultation-reports/check-unbilled',
        PDF: (id: number) => `/monthly-consultation-reports/${id}/pdf`
    },
    // Database Management
    DATABASE: {
        TABLES: '/database/tables',
        RESET_TABLE: '/database/reset-table',
        DELETE_DEMO_CLIENTS: '/database/delete-demo-clients',
        LOGS: '/database/logs'
    },
    // Organisationen
    ORGANIZATIONS: {
        BASE: '/organizations',
        CURRENT: '/organizations/current',
        STATS: '/organizations/current/stats',
        SEARCH: '/organizations/search',
        JOIN_REQUEST: '/organizations/join-request',
        JOIN_REQUESTS: '/organizations/join-requests',
        PROCESS_JOIN_REQUEST: (id: number) => `/organizations/join-requests/${id}`
    }
};

// Exportiere die API-Endpunkte als Standard-Export
export default API_ENDPOINTS; 