import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import deTranslations from './locales/de.json';
import esTranslations from './locales/es.json';
import enTranslations from './locales/en.json';

// Synchron initialisieren (ohne await, da .init() synchron ist bei react-i18next)
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: deTranslations },
      es: { translation: esTranslations },
      en: { translation: enTranslations }
    },
    fallbackLng: 'de',
    lng: 'de', // Standard-Sprache
    defaultNS: 'translation',
    ns: ['translation'],
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false // Wichtig: Suspense deaktivieren für bessere Kompatibilität
    },
    // Fehlende Übersetzungen behandeln
    returnEmptyString: false, // Standard: gibt Schlüssel zurück wenn Übersetzung fehlt
    returnNull: false, // Standard: gibt Schlüssel zurück
    // Handler für fehlende Übersetzungen (nur in Entwicklung)
    missingKeyHandler: (lng, ns, key) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[i18n] Missing translation: "${key}" in language "${lng}"`);
      }
      return key; // Gibt Schlüssel zurück als Fallback
    },
    // Fehlende Übersetzungen nicht speichern (in Produktion)
    saveMissing: false,
    // Debug-Modus nur in Entwicklung
    debug: process.env.NODE_ENV === 'development'
  });

export default i18n;



