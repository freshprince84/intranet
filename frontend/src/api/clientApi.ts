import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';

/**
 * API-Funktionen für die Client-Verwaltung
 */

export interface CreateClientData {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface UpdateClientData {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}

/**
 * Holt alle Clients
 * @returns Liste aller Clients
 */
export const getClients = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.CLIENTS.BASE);
    return response.data;
  } catch (error) {
    console.error('Fehler beim Laden der Clients:', error);
    throw error;
  }
};

/**
 * Holt einen einzelnen Client mit seinen Beratungen
 * @param clientId ID des Clients
 * @returns Client mit seinen letzten Beratungen
 */
export const getClientById = async (clientId: number) => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.CLIENTS.BY_ID(clientId));
    return response.data;
  } catch (error) {
    console.error('Fehler beim Laden des Clients:', error);
    throw error;
  }
};

/**
 * Erstellt einen neuen Client
 * @param data Client-Daten
 * @returns Der erstellte Client
 */
export const createClient = async (data: CreateClientData) => {
  try {
    const response = await axiosInstance.post(API_ENDPOINTS.CLIENTS.BASE, data);
    return response.data;
  } catch (error) {
    console.error('Fehler beim Erstellen des Clients:', error);
    throw error;
  }
};

/**
 * Aktualisiert einen bestehenden Client
 * @param clientId ID des Clients
 * @param data Update-Daten
 * @returns Der aktualisierte Client
 */
export const updateClient = async (clientId: number, data: UpdateClientData) => {
  try {
    const response = await axiosInstance.put(API_ENDPOINTS.CLIENTS.BY_ID(clientId), data);
    return response.data;
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Clients:', error);
    throw error;
  }
};

/**
 * Löscht einen Client
 * @param clientId ID des Clients
 * @returns Status der Löschoperation
 */
export const deleteClient = async (clientId: number) => {
  try {
    const response = await axiosInstance.delete(API_ENDPOINTS.CLIENTS.BY_ID(clientId));
    return response.data;
  } catch (error) {
    console.error('Fehler beim Löschen des Clients:', error);
    throw error;
  }
};

/**
 * Holt die zuletzt beratenen Clients
 * @returns Liste der zuletzt beratenen Clients
 */
export const getRecentClients = async () => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.CLIENTS.RECENT);
    return response.data;
  } catch (error) {
    console.error('Fehler beim Laden der zuletzt beratenen Clients:', error);
    throw error;
  }
}; 