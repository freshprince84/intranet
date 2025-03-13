// import axios from 'axios';
import axiosInstance from '../config/axios.ts';
import { API_URL } from '../config/api.ts';

export interface TableSettings {
  tableId: string;
  columnOrder: string[];
  hiddenColumns: string[];
}

// Helfer-Funktion, um den localStorage-Schlüssel für eine Tabelle zu generieren
const getLocalStorageKey = (tableId: string) => `table_settings_${tableId}`;

// API zum Verwalten der Tabelleneinstellungen
export const tableSettingsApi = {
  // Benutzerspezifische Tabelleneinstellungen abrufen
  getTableSettings: async (tableId: string): Promise<TableSettings> => {
    try {
      // Zuerst versuchen, Einstellungen vom API-Server zu laden
      const response = await axiosInstance.get(`/table-settings/${tableId}`);
      return response.data;
    } catch (error) {
      console.error('Fehler beim Abrufen der Tabelleneinstellungen vom Server:', error);
      
      // Fallback: Versuchen, aus dem localStorage zu laden
      try {
        const localStorageKey = getLocalStorageKey(tableId);
        const storedSettings = localStorage.getItem(localStorageKey);
        
        if (storedSettings) {
          return JSON.parse(storedSettings);
        }
      } catch (localError) {
        console.error('Fehler beim Laden aus localStorage:', localError);
      }
      
      // Default-Einstellungen zurückgeben, wenn keine gespeicherten verfügbar sind
      return {
        tableId,
        columnOrder: [],
        hiddenColumns: []
      };
    }
  },
  
  // Tabelleneinstellungen speichern (server-side und localStorage)
  saveTableSettings: async (settings: TableSettings): Promise<void> => {
    try {
      // Zum API-Server senden
      await axiosInstance.post(`/table-settings`, settings);
      
      // Auch im localStorage speichern
      const localStorageKey = getLocalStorageKey(settings.tableId);
      localStorage.setItem(localStorageKey, JSON.stringify(settings));
    } catch (error) {
      console.error('Fehler beim Speichern der Tabelleneinstellungen auf dem Server:', error);
      
      // Trotzdem im localStorage speichern
      try {
        const localStorageKey = getLocalStorageKey(settings.tableId);
        localStorage.setItem(localStorageKey, JSON.stringify(settings));
      } catch (localError) {
        console.error('Fehler beim Speichern im localStorage:', localError);
      }
    }
  },
  
  // Tabelleneinstellungen zurücksetzen
  resetTableSettings: (tableId: string): void => {
    try {
      const localStorageKey = getLocalStorageKey(tableId);
      localStorage.removeItem(localStorageKey);
      console.log(`Tabelleneinstellungen für ${tableId} zurückgesetzt`);
    } catch (error) {
      console.error('Fehler beim Zurücksetzen der Tabelleneinstellungen:', error);
    }
  }
}; 