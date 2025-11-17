import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import i18n from '../i18n/config.ts';

export interface LanguageResponse {
  language: string;
}

// localStorage Key für gespeicherte Sprache
const LANGUAGE_STORAGE_KEY = 'app_language';

// Helper-Funktionen für localStorage
const getStoredLanguageFromStorage = (): string | null => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && ['de', 'es', 'en'].includes(stored)) {
      return stored;
    }
    return null;
  } catch (error) {
    console.error('Fehler beim Lesen der gespeicherten Sprache:', error);
    return null;
  }
};

const setStoredLanguage = (language: string): void => {
  try {
    if (['de', 'es', 'en'].includes(language)) {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
  } catch (error) {
    console.error('Fehler beim Speichern der Sprache:', error);
  }
};

export const languageService = {
  // Aktive Sprache für aktuellen User abrufen
  getActiveLanguage: async (): Promise<string> => {
    try {
      const response = await axiosInstance.get<LanguageResponse>(API_ENDPOINTS.LANGUAGE.ACTIVE);
      const language = response.data.language || 'de';
      
      // Setze i18n.language entsprechend
      // i18n ist bereits synchron initialisiert in config.ts
      if (i18n.language !== language) {
        await i18n.changeLanguage(language);
      }
      
      // Speichere die Sprache im localStorage
      setStoredLanguage(language);
      
      return language;
    } catch (error) {
      console.error('Fehler beim Abrufen der aktiven Sprache:', error);
      // Fallback auf Standard-Sprache
      const fallbackLanguage = 'de';
      
      // i18n ist bereits synchron initialisiert in config.ts
      if (i18n.language !== fallbackLanguage) {
        await i18n.changeLanguage(fallbackLanguage);
      }
      
      return fallbackLanguage;
    }
  },

  // Sprache ändern (User-Einstellung aktualisieren)
  setUserLanguage: async (language: string): Promise<void> => {
    try {
      // Update User.language via profile endpoint
      await axiosInstance.put('/users/profile', { language });
      
      // Setze i18n.language neu
      await i18n.changeLanguage(language);
      
      // Speichere die Sprache im localStorage
      setStoredLanguage(language);
    } catch (error) {
      console.error('Fehler beim Setzen der Benutzer-Sprache:', error);
      throw error;
    }
  },

  // Organisation-Sprache abrufen
  getOrganizationLanguage: async (): Promise<string | null> => {
    try {
      const response = await axiosInstance.get<LanguageResponse>(API_ENDPOINTS.ORGANIZATIONS.LANGUAGE);
      return response.data.language || null;
    } catch (error) {
      console.error('Fehler beim Abrufen der Organisation-Sprache:', error);
      return null;
    }
  },

  // Organisation-Sprache setzen
  setOrganizationLanguage: async (language: string): Promise<void> => {
    try {
      await axiosInstance.put(API_ENDPOINTS.ORGANIZATIONS.LANGUAGE, { language });
    } catch (error) {
      console.error('Fehler beim Setzen der Organisation-Sprache:', error);
      throw error;
    }
  },

  // Aktuelle i18n-Sprache abrufen
  getCurrentLanguage: (): string => {
    return i18n.language || 'de';
  },

  // Sprache direkt setzen (ohne API-Call)
  setLanguage: async (language: string): Promise<void> => {
    await i18n.changeLanguage(language);
    setStoredLanguage(language);
  },

  // Gespeicherte Sprache aus localStorage abrufen
  getStoredLanguage: (): string | null => {
    return getStoredLanguageFromStorage();
  }
};

export default languageService;



