import axios from 'axios';
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
      const response = await axios.get(`${API_URL}/table-settings/${tableId}`);
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
        console.error('Fehler beim Abrufen der Tabelleneinstellungen aus dem localStorage:', localError);
      }
      
      // Standardwerte zurückgeben, falls ein Fehler auftritt
      return {
        tableId,
        columnOrder: [],
        hiddenColumns: []
      };
    }
  },

  // Benutzerspezifische Tabelleneinstellungen speichern
  saveTableSettings: async (settings: TableSettings): Promise<TableSettings> => {
    try {
      // Versuch, Einstellungen an den API-Server zu senden
      const response = await axios.post(`${API_URL}/table-settings`, settings);
      
      // Fallback: In localStorage speichern
      try {
        const localStorageKey = getLocalStorageKey(settings.tableId);
        localStorage.setItem(localStorageKey, JSON.stringify(settings));
      } catch (localError) {
        console.error('Fehler beim Speichern der Tabelleneinstellungen im localStorage:', localError);
      }
      
      return response.data;
    } catch (error) {
      console.error('Fehler beim Speichern der Tabelleneinstellungen auf dem Server:', error);
      
      // Fallback: Nur in localStorage speichern, wenn API-Aufruf fehlschlägt
      try {
        const localStorageKey = getLocalStorageKey(settings.tableId);
        localStorage.setItem(localStorageKey, JSON.stringify(settings));
      } catch (localError) {
        console.error('Fehler beim Speichern der Tabelleneinstellungen im localStorage:', localError);
      }
      
      return settings;
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