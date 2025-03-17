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
  // Debug-Informationen
  onUploadProgress: (progressEvent) => {
    console.debug('Upload-Fortschritt:', progressEvent);
  },
  onDownloadProgress: (progressEvent) => {
    console.debug('Download-Fortschritt:', progressEvent);
  }
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
    
    // Debug-Logging
    console.debug(`API-Request an: ${config.url}`, config);
    
    return config;
  },
  (error) => {
    console.error('Fehler im Request Interceptor:', error);
    return Promise.reject(error);
  }
);

// Response-Interceptor für Debugging
instance.interceptors.response.use(
  (response) => {
    console.debug(`API-Response von: ${response.config.url}`, response.status);
    return response;
  },
  (error) => {
    console.error('Fehler im Response Interceptor:', error);
    return Promise.reject(error);
  }
);

// Globale Axios-Defaults für Abwärtskompatibilität setzen
// WICHTIG: Wo immer möglich, sollte stattdessen die Instanz verwendet werden
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;

export default instance; 