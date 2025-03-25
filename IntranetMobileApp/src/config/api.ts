/**
 * API-Konfiguration für die mobile App
 * Entsprechend der Implementierung im Web-Frontend
 */

// TypeScript-Definition für React Native __DEV__ Variable
declare const __DEV__: boolean;
import { Platform } from 'react-native';

/**
 * API-Basis-URL basierend auf der Entwicklungsumgebung
 */
export const API_BASE_URL = __DEV__
  ? 'http://192.168.1.120:5000'  // Lokale IP des Entwicklungsrechners - ANPASSEN an deine IP!
  : 'https://65.109.228.106.nip.io'; // Produktionsserver

// Vollständige API-URL mit /api-Präfix
export const API_URL = `${API_BASE_URL}/api`;

/**
 * API-Konfiguration
 */
export const API_CONFIG = {
  // API-Host ist die vollständige Basis-URL
  API_HOST: API_URL,
  
  // API-Timeout in Millisekunden
  TIMEOUT: 15000,
  
  // Header-Konfiguration
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Type': 'mobile',
    'X-App-Version': '1.0.0',
  }
};

/**
 * API-Endpunkte basierend auf den Backend-Routes
 */
export const API_ENDPOINTS = {
  // Auth-Endpunkte
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },
  
  // User-Endpunkte
  USERS: {
    BASE: '/users',
    BY_ID: (id: number) => `/users/${id}`,
    ROLES: (id: number) => `/users/${id}/roles`,
    ME: '/users/me', // Eigenes Profil
  },
  
  // Branch-Endpunkte
  BRANCHES: {
    BASE: '/branches',
    BY_ID: (id: number) => `/branches/${id}`,
  },
  
  // Worktime-Endpunkte
  WORKTIME: {
    BASE: '/worktime',
    BY_ID: (id: number) => `/worktime/${id}`,
    START: '/worktime/start',
    STOP: '/worktime/stop',
    ACTIVE: '/worktime/active',
    STATS: '/worktime/stats',
    BY_DATE: (date: string) => `/worktime?date=${date}`,
  },

  // Task-Endpunkte
  TASKS: {
    BASE: '/tasks',
    BY_ID: (id: number) => `/tasks/${id}`,
    BY_STATUS: (status: string) => `/tasks?status=${status}`,
    ATTACHMENTS: (taskId: number) => `/tasks/${taskId}/attachments`,
    UPLOAD: (taskId: number) => `/tasks/${taskId}/attachments`,
  },

  // Request-Endpunkte
  REQUESTS: {
    BASE: '/requests',
    BY_ID: (id: number) => `/requests/${id}`,
    BY_STATUS: (status: string) => `/requests?status=${status}`,
    ATTACHMENTS: (requestId: number) => `/requests/${requestId}/attachments`,
    UPLOAD: (requestId: number) => `/requests/${requestId}/attachments`,
  },

  // Benachrichtigungs-Endpunkte
  NOTIFICATIONS: {
    BASE: '/notifications',
    BY_ID: (id: number) => `/notifications/${id}`,
    MARK_READ: (id: number) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
    UNREAD_COUNT: '/notifications/unread-count',
  },

  // Einstellungs-Endpunkte
  SETTINGS: {
    BASE: '/settings',
    NOTIFICATION_SETTINGS: '/settings/notifications',
  },

  // Identifikationsdokument-Endpunkte
  IDENTIFICATION_DOCUMENTS: {
    BASE: '/identification-documents',
    BY_ID: (id: number) => `/identification-documents/${id}`,
  },
}; 