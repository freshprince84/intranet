/**
 * Axios-Konfiguration für die API-Kommunikation
 */

import axios, { AxiosRequestConfig } from 'axios';
import { API_CONFIG, API_URL } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Basis-Konfiguration für Axios
const axiosConfig: AxiosRequestConfig = {
  baseURL: API_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS
};

// Axios-Instanz erstellen
const axiosInstance = axios.create(axiosConfig);

// Request-Interceptor: Fügt Auth-Token zu Anfragen hinzu
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      // Token aus dem Speicher laden
      const token = await AsyncStorage.getItem('@IntranetApp:token');
      
      // Wenn Token vorhanden, als Authorization-Header hinzufügen
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Emulator-Debugging-Info hinzufügen
      if (__DEV__ && Platform.OS === 'android') {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
        
        if (config.data) {
          console.log('Request Payload:', config.data);
        }
      }
      
      return config;
    } catch (error) {
      console.error('Error in Axios request interceptor:', error);
      return config;
    }
  },
  (error) => {
    console.error('Error in Axios request:', error);
    return Promise.reject(error);
  }
);

// Response-Interceptor: Behandelt globale Antworten und Fehler
axiosInstance.interceptors.response.use(
  (response) => {
    // Erfolgreiche Antwort
    if (__DEV__ && Platform.OS === 'android') {
      console.log(`[API Response] ${response.status} ${response.config.url}`);
      console.log('Response Data:', response.data);
    }
    
    return response;
  },
  async (error) => {
    // Fehlerbehandlung
    if (__DEV__) {
      console.error('API Error:', error.response?.status, error.response?.data || error.message);
    }
    
    const originalRequest = error.config;
    
    // Wenn 401 Unauthorized und kein Retry, Token aktualisieren
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Hier Token-Aktualisierungslogik implementieren
        const refreshToken = await AsyncStorage.getItem('@IntranetApp:refreshToken');
        
        if (refreshToken) {
          // Token aktualisieren mit korrektem Pfad
          const response = await axios.post(
            `/auth/refresh`,
            { refreshToken },
            { 
              baseURL: API_CONFIG.API_HOST, 
              headers: API_CONFIG.HEADERS 
            }
          );
          
          const { token } = response.data;
          
          // Neuen Token speichern
          if (token) {
            await AsyncStorage.setItem('@IntranetApp:token', token);
            
            // Anfrage mit neuem Token wiederholen
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        
        // Bei Token-Aktualisierungsfehler: Token löschen und zur Login-Seite weiterleiten
        await AsyncStorage.removeItem('@IntranetApp:token');
        await AsyncStorage.removeItem('@IntranetApp:refreshToken');
        
        // Hier könnte ein globaler Event emittiert werden, um den User zur Login-Seite zu leiten
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance; 