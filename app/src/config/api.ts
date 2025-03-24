/**
 * API-Konfiguration für die mobile App
 */

// TypeScript-Definition für React Native __DEV__ Variable
declare const __DEV__: boolean;

// Entwicklungsumgebung: lokale IP des Entwicklungsrechners verwenden
// Für den Emulator funktioniert localhost nicht direkt, daher IP-Adresse verwenden
export const API_URL = __DEV__ 
  ? 'http://10.0.2.2:5000' // Standard-IP für Android-Emulator -> localhost
  : 'https://api.produktion-domain.com';

// API-Timeout-Einstellungen
export const API_TIMEOUT = 10000; // 10 Sekunden Timeout

// API-Endpunkte (identisch zum Web-Frontend)
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: number) => `/users/${id}`,
    ROLES: (id: number) => `/users/${id}/roles`,
  },
  WORKTIME: {
    BASE: '/worktime',
    BY_ID: (id: number) => `/worktime/${id}`,
    START: '/worktime/start',
    STOP: '/worktime/stop',
  },
  // Weitere Endpunkte je nach Bedarf
};

// Mobile-spezifische Headers
export const MOBILE_HEADERS = {
  'X-Client-Type': 'mobile',
  'X-App-Version': '1.0.0',
}; 