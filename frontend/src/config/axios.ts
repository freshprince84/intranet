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
  }
});

// Füge den Token zu allen Requests hinzu, wenn vorhanden
const token = localStorage.getItem('token');
if (token) {
  instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Interceptor für Token-Aktualisierung
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Globale Axios-Defaults für Abwärtskompatibilität setzen
// WICHTIG: Wo immer möglich, sollte stattdessen die Instanz verwendet werden
axios.defaults.baseURL = API_URL;

export default instance; 