/**
 * Axios-Konfiguration für die mobile App
 * Adaptiert von der Web-Frontend-Version mit AsyncStorage anstelle von localStorage
 */

import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, API_TIMEOUT, MOBILE_HEADERS } from './api';

// Axios-Instance mit Basis-Konfiguration
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    ...MOBILE_HEADERS,
  },
});

// Request Interceptor für Token-Handling
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      // Token aus AsyncStorage laden (anstelle von localStorage im Web)
      const token = await AsyncStorage.getItem('token');
      
      // Wenn Token vorhanden, zu Authorization-Header hinzufügen
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Netzwerkstatus überprüfen und ggf. Offline-Modus aktivieren
      // Diese Implementierung muss später ergänzt werden
      
      // Geänderte Konfiguration zurückgeben
      return config;
    } catch (error) {
      console.error('Request Interceptor Fehler:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor für Fehlerhandling und Token-Refresh
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    // Token-Ablauf (401) abfangen und ggf. Token erneuern
    if (error.response?.status === 401) {
      try {
        // Versuchen, Token zu erneuern
        // Implementation folgt später
      } catch (refreshError) {
        // Bei Refresh-Fehler: Benutzer ausloggen
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        // Navigation zum Login-Screen erfolgt über AuthContext
      }
    }
    
    // Netzwerkfehler behandeln
    if (!error.response) {
      // Offline-Handling hier implementieren
      // Daten zwischenspeichern, später synchronisieren
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance; 