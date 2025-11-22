/// <reference types="node" />

import axios from 'axios';
import { API_URL } from './api.ts';

// Konfigurierte Axios-Instanz erstellen
// Diese Instanz soll in der gesamten Anwendung verwendet werden
const instance = axios.create({
  baseURL: API_URL, // Verwende die zentrale API_URL aus api.ts
  withCredentials: true, // Erlaubt das Senden von Cookies/Auth-Daten
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // Debug-Informationen deaktiviert (zu viele Logs)
  // onUploadProgress: (progressEvent) => {
  //   if (process.env.NODE_ENV === 'development') {
  //     console.debug('Upload-Fortschritt:', progressEvent);
  //   }
  // },
  // onDownloadProgress: (progressEvent) => {
  //   if (process.env.NODE_ENV === 'development') {
  //     console.debug('Download-Fortschritt:', progressEvent);
  //   }
  // }
});

// Füge den Token zu allen Requests hinzu, wenn vorhanden
const token = localStorage.getItem('token');
if (token) {
  instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Request-Interceptor für Token-Aktualisierung und Debugging
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Bei FormData: Content-Type-Header entfernen, damit axios den Boundary automatisch setzt
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    // Debug-Logging deaktiviert (zu viele Logs)
    // Nur für spezifische Endpoints aktivieren, wenn nötig
    // if (process.env.NODE_ENV === 'development' && !config.url?.includes('/onboarding/status')) {
    //   console.debug(`API-Request an: ${config.url}`, config);
    // }
    
    return config;
  },
  (error) => {
    console.error('Fehler im Request Interceptor:', error);
    return Promise.reject(error);
  }
);

// Flag zur Verhinderung von mehrfachen Weiterleitungen
let isRedirecting = false;
const REDIRECT_TIMEOUT = 100; // ms

// Response-Interceptor für Debugging und automatische Weiterleitung bei 401
instance.interceptors.response.use(
  (response) => {
    // Debug-Logging deaktiviert (zu viele Logs)
    // Nur für spezifische Endpoints aktivieren, wenn nötig
    // if (process.env.NODE_ENV === 'development' && !response.config.url?.includes('/onboarding/status')) {
    //   console.debug(`API-Response von: ${response.config.url}`, response.status);
    // }
    return response;
  },
  async (error) => {
    // Bei 401 Unauthorized: Token abgelaufen oder ungültig
    if (error.response?.status === 401) {
      // Endpoints ausschließen, die 401 zurückgeben können, aber nicht Token-Ablauf bedeuten
      const excludedPaths = ['/auth/login', '/auth/logout'];
      const requestPath = error.config?.url || '';
      
      // Prüfe ob Endpoint ausgeschlossen werden soll
      const shouldExclude = excludedPaths.some(path => requestPath.includes(path));
      
      // Prüfe ob bereits auf Login-Seite
      const isOnLoginPage = window.location.pathname === '/login';
      
      // Prüfe ob bereits Weiterleitung läuft
      if (isRedirecting) {
        return Promise.reject(error);
      }
      
      // Nur weiterleiten wenn nicht ausgeschlossen und nicht bereits auf Login
      if (!shouldExclude && !isOnLoginPage) {
        isRedirecting = true;
        
        // Token entfernen
        localStorage.removeItem('token');
        delete instance.defaults.headers.common['Authorization'];
        delete axios.defaults.headers.common['Authorization'];
        
        // User-State zurücksetzen über Custom Event
        window.dispatchEvent(new CustomEvent('auth:logout'));
        
        // ✅ PERFORMANCE: Custom Event für React Router Navigation statt window.location.href
        // Verhindert vollständigen Browser-Reload
        window.dispatchEvent(new CustomEvent('auth:redirect-to-login', { 
          detail: { path: '/login' } 
        }));
        
        // Fallback: window.location.href nach 500ms (falls Event nicht verarbeitet wird)
        setTimeout(() => {
          if (window.location.pathname !== '/login' && isRedirecting) {
            console.warn('[axios] Fallback: window.location.href verwendet (Event nicht verarbeitet)');
            window.location.href = '/login';
          }
        }, 500);
      }
      
      // Fehler weiterwerfen (für ErrorHandler, falls gewünscht)
      return Promise.reject(error);
    }
    
    // Andere Fehler normal behandeln
    console.error('Fehler im Response Interceptor:', error);
    return Promise.reject(error);
  }
);

// Globale Axios-Defaults für Abwärtskompatibilität setzen
// WICHTIG: Wo immer möglich, sollte stattdessen die Instanz verwendet werden
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;

export default instance; 