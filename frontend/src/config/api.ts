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
        LOGOUT: '/auth/logout'
        // ❌ ENTFERNT: CURRENT_USER - wird nicht verwendet, Standard ist /users/profile (getUserById)
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
        BY_ID: (id: number) => `/branches/${id}`,
        USER: '/branches/user',
        SWITCH: '/branches/switch',
        CREATE: '/branches',
        UPDATE: (id: number) => `/branches/${id}`,
        DELETE: (id: number) => `/branches/${id}`,
        ROOM_DESCRIPTIONS: (id: number) => `/branches/${id}/room-descriptions`,
        ROOM_DESCRIPTION: (id: number, categoryId: number) => `/branches/${id}/room-descriptions/${categoryId}`
    },
    // Benutzer
    USERS: {
        BASE: '/users',
        DROPDOWN: '/users/dropdown',
        BY_ID: (id: number) => `/users/${id}`,
        CHANGE_ROLE: (id: number) => `/users/${id}/role`,
        INVOICE_SETTINGS: '/users/invoice-settings',
        ONBOARDING: {
            STATUS: '/users/onboarding/status',
            PROGRESS: '/users/onboarding/progress',
            COMPLETE: '/users/onboarding/complete',
            EVENT: '/users/onboarding/event',
            RESET: '/users/onboarding/reset',
            ANALYTICS: '/users/onboarding/analytics'
        }
    },
    // Tours
    TOURS: {
        BASE: '/tours',
        BY_ID: (id: number) => `/tours/${id}`,
        BOOKINGS: (id: number) => `/tours/${id}/bookings`,
        EXPORT: '/tours/export',
        TOGGLE_ACTIVE: (id: number) => `/tours/${id}/toggle-active`,
        UPLOAD_IMAGE: (id: number) => `/tours/${id}/image`,
        UPLOAD_GALLERY: (id: number) => `/tours/${id}/gallery`,
        DELETE_GALLERY_IMAGE: (id: number, imageIndex: number) => `/tours/${id}/gallery/${imageIndex}`
    },
    TOUR_BOOKINGS: {
        BASE: '/tour-bookings',
        BY_ID: (id: number) => `/tour-bookings/${id}`,
        USER: (userId: number) => `/tour-bookings/user/${userId}`,
        COMMISSIONS: (userId: number) => `/tour-bookings/user/${userId}/commissions`,
        CANCEL: (id: number) => `/tour-bookings/${id}/cancel`,
        COMPLETE: (id: number) => `/tour-bookings/${id}/complete`
    },
    TOUR_RESERVATIONS: {
        BASE: '/tour-reservations',
        BY_ID: (id: number) => `/tour-reservations/${id}`,
        BY_RESERVATION: (reservationId: number) => `/tour-reservations/reservation/${reservationId}`,
        BY_BOOKING: (bookingId: number) => `/tour-reservations/booking/${bookingId}`
    },
    TOUR_PROVIDERS: {
        BASE: '/tour-providers',
        BY_ID: (id: number) => `/tour-providers/${id}`
    },
    // Team Worktime Control
    TEAM_WORKTIME: {
        ACTIVE: '/team-worktime/active',
        STOP_USER: '/team-worktime/stop-user',
        USER_DAY: '/team-worktime/user-day',
        UPDATE: '/team-worktime/update',
        OVERTIME: '/team-worktime/overtime',
        // Analytics-Endpunkte
        ANALYTICS: {
            TODOS_BY_USER: '/team-worktime/analytics/todos-by-user',
            REQUESTS_BY_USER: '/team-worktime/analytics/requests-by-user',
            TODOS_CHRONOLOGICAL: '/team-worktime/analytics/todos-chronological',
            REQUESTS_CHRONOLOGICAL: '/team-worktime/analytics/requests-chronological',
            TODOS_FREQUENCY: '/team-worktime/analytics/todos-frequency',
            TODOS_SHIFTS: '/team-worktime/analytics/todos-shifts'
        }
    },
    // Shift Planning
    SHIFTS: {
        BASE: '/shifts',
        BY_ID: (id: number) => `/shifts/${id}`,
        GENERATE: '/shifts/generate',
        TEMPLATES: {
            BASE: '/shifts/templates',
            BY_ID: (id: number) => `/shifts/templates/${id}`
        },
        AVAILABILITIES: {
            BASE: '/shifts/availabilities',
            BY_ID: (id: number) => `/shifts/availabilities/${id}`
        },
        SWAPS: {
            BASE: '/shifts/swaps',
            BY_ID: (id: number) => `/shifts/swaps/${id}`,
            APPROVE: (id: number) => `/shifts/swaps/${id}/approve`,
            REJECT: (id: number) => `/shifts/swaps/${id}/reject`
        }
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
        BY_ID: (id: number) => `/saved-filters/${id}`,
        GROUPS: {
            CREATE: '/saved-filters/groups',
            BY_TABLE: (tableId: string) => `/saved-filters/groups/${tableId}`,
            UPDATE: (groupId: number) => `/saved-filters/groups/${groupId}`,
            DELETE: (groupId: number) => `/saved-filters/groups/${groupId}`,
            ADD_FILTER: (filterId: number, groupId: number) => `/saved-filters/${filterId}/group/${groupId}`,
            REMOVE_FILTER: (filterId: number) => `/saved-filters/${filterId}/group`
        }
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
    // Payroll
    PAYROLL: {
        BASE: '/payroll',
        HOURS: '/payroll/hours',
        CALCULATE: '/payroll/calculate',
        PDF: (payrollId: number) => `/payroll/pdf/${payrollId}`,
        PREFILL_HOURS: '/payroll/prefill-hours'
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
        LANGUAGE: '/organizations/current/language',
        SEARCH: '/organizations/search',
        JOIN_REQUEST: '/organizations/join-request',
        JOIN_REQUESTS: '/organizations/join-requests',
        MY_JOIN_REQUESTS: '/organizations/join-requests/my',
        PROCESS_JOIN_REQUEST: (id: number) => `/organizations/join-requests/${id}`
    },
    // Sprache
    LANGUAGE: {
        ACTIVE: '/users/active-language'
    },
    // Employee Lifecycle
    LIFECYCLE: {
        BY_USER: (userId: number) => `/users/${userId}/lifecycle`,
        STATUS: (userId: number) => `/users/${userId}/lifecycle/status`,
        SOCIAL_SECURITY: (userId: number, type: string) => `/users/${userId}/lifecycle/social-security/${type}`,
        CERTIFICATES: (userId: number) => `/users/${userId}/lifecycle/certificates`,
        CERTIFICATE: (userId: number, certId: number) => `/users/${userId}/lifecycle/certificates/${certId}`,
        CERTIFICATE_DOWNLOAD: (userId: number, certId: number) => `/users/${userId}/lifecycle/certificates/${certId}/download`,
        CONTRACTS: (userId: number) => `/users/${userId}/lifecycle/contracts`,
        CONTRACT: (userId: number, contractId: number) => `/users/${userId}/lifecycle/contracts/${contractId}`,
        CONTRACT_DOWNLOAD: (userId: number, contractId: number) => `/users/${userId}/lifecycle/contracts/${contractId}/download`
    },
    // Organization Lifecycle Settings
    ORGANIZATION_LIFECYCLE: {
        LIFECYCLE_ROLES: '/organizations/current/lifecycle-roles',
        DOCUMENT_TEMPLATES: '/organizations/current/document-templates',
        UPLOAD_TEMPLATE: '/organizations/current/document-templates/upload',
        DOCUMENT_SIGNATURES: '/organizations/current/document-signatures',
        UPLOAD_SIGNATURE: '/organizations/current/document-signatures/upload'
    },
    // LobbyPMS / Reservierungen
    RESERVATIONS: {
        BASE: '/lobby-pms/reservations',
        BY_ID: (id: number) => `/lobby-pms/reservations/${id}`,
        CHECK_IN: (id: number) => `/lobby-pms/reservations/${id}/check-in`,
        SYNC: '/lobby-pms/sync',
        SYNC_FULL: '/lobby-pms/sync-full', // ✅ MEMORY: Vollständiger Sync nach check_out_date
        VALIDATE: '/lobby-pms/validate',
        REGISTER_SIRE: (id: number) => `/lobby-pms/reservations/${id}/register-sire`,
        SIRE_STATUS: (id: number) => `/lobby-pms/reservations/${id}/sire-status`
    },
    // Reservierungen (neue API)
    RESERVATION: {
        BASE: '/reservations',
        CREATE: '/reservations',
        BY_ID: (id: number) => `/reservations/${id}`,
        UPDATE_GUEST_CONTACT: (id: number) => `/reservations/${id}/guest-contact`,
        GENERATE_PIN_AND_SEND: (id: number) => `/reservations/${id}/generate-pin-and-send`,
        SEND_INVITATION: (id: number) => `/reservations/${id}/send-invitation`,
        SEND_PASSCODE: (id: number) => `/reservations/${id}/send-passcode`,
        NOTIFICATION_LOGS: (id: number) => `/reservations/${id}/notification-logs`
    },
    // TTLock (Türsystem)
    TTLOCK: {
        LOCKS: '/ttlock/locks',
        LOCK_INFO: (lockId: string) => `/ttlock/locks/${lockId}/info`,
        CREATE_PASSCODE: '/ttlock/passcodes',
        DELETE_PASSCODE: (passcodeId: string) => `/ttlock/passcodes/${passcodeId}`
    },
    // Bold Payment
    BOLD_PAYMENT: {
        WEBHOOK: '/bold-payment/webhook',
        PAYMENT_STATUS: (paymentId: string) => `/bold-payment/payments/${paymentId}`
    },
    // Passwort-Manager
    PASSWORD_MANAGER: {
        BASE: '/password-manager',
        BY_ID: (id: number) => `/password-manager/${id}`,
        PASSWORD: (id: number) => `/password-manager/${id}/password`,
        COPY_PASSWORD: (id: number) => `/password-manager/${id}/copy-password`,
        AUDIT_LOGS: (id: number) => `/password-manager/${id}/audit-logs`,
        PERMISSIONS: (id: number) => `/password-manager/${id}/permissions`,
        GENERATE_PASSWORD: '/password-manager/generate-password'
    }
};

/**
 * Generiert eine vollständige URL für ein Cerebro-Media
 * Verwendet API_URL für korrekte URL-Generierung in Entwicklung und Produktion
 */
export const getCerebroMediaUrl = (mediaId: number): string => {
    return `${API_URL}/cerebro/media/${mediaId}/file`;
};

/**
 * Generiert eine vollständige URL für ein Task-Attachment
 * Verwendet API_URL für korrekte URL-Generierung in Entwicklung und Produktion
 */
export const getTaskAttachmentUrl = (taskId: number, attachmentId: number): string => {
  return `${API_URL}${API_ENDPOINTS.TASKS.ATTACHMENT(taskId, attachmentId)}`;
};

/**
 * Generiert eine vollständige URL für ein Request-Attachment
 * Verwendet API_URL für korrekte URL-Generierung in Entwicklung und Produktion
 */
export const getRequestAttachmentUrl = (requestId: number, attachmentId: number): string => {
  return `${API_URL}${API_ENDPOINTS.REQUESTS.ATTACHMENT(requestId, attachmentId)}`;
};

// Exportiere die API-Endpunkte als Standard-Export
export default API_ENDPOINTS; 