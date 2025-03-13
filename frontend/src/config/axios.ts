/// <reference types="node" />

import axios from 'axios';
import { API_URL } from './api.ts';

// Konfigurierte Axios-Instanz erstellen
// Diese Instanz soll in der gesamten Anwendung verwendet werden
const instance = axios.create({
  baseURL: API_URL, // Verwende die zentrale API_URL aus api.ts
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000  // Timeout nach 10 Sekunden
});

// Debug-Ausgabe der Konfiguration
console.log('Axios-Instanz erstellt mit baseURL:', API_URL);

// Füge den Token zu allen Requests hinzu, wenn vorhanden
const token = localStorage.getItem('token');
if (token) {
  instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Interceptor für Token-Aktualisierung und erweiterte Fehlerbehandlung
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Debugging-Informationen für die Anfrage
    console.log(`Anfrage wird gesendet an: ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('Fehler bei der Anfrage-Konfiguration:', error);
    return Promise.reject(error);
  }
);

// Response-Interceptor für bessere Fehlerbehandlung
instance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Spezifischere Fehlerbehandlung
    if (error.code === 'ERR_NETWORK') {
      console.error('Netzwerkfehler bei API-Anfrage:', error.config?.url, error);
    } else if (error.response) {
      console.error('API-Fehler mit Status:', error.response.status, 'bei URL:', error.config?.url, error.response.data);
    } else if (error.request) {
      console.error('Keine Antwort vom Server erhalten für URL:', error.config?.url, error);
    } else {
      console.error('Fehler bei API-Anfrage:', error.message, error);
    }
    return Promise.reject(error);
  }
);

// Globale Axios-Defaults für Abwärtskompatibilität setzen
// WICHTIG: Wo immer möglich, sollte stattdessen die Instanz verwendet werden
axios.defaults.baseURL = API_URL;

export default instance; 