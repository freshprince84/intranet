/// <reference types="node" />

import axios from 'axios';

// Dynamische API-Basis-URL basierend auf der Umgebung
const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? `http://${window.location.hostname}:5000`
  : `/api`; // Im Produktionsbetrieb verwenden wir relative URLs!

const instance = axios.create({
  baseURL: API_BASE_URL,
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

export default instance; 