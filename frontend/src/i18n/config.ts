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
    // Wichtig: Debug-Modus für Entwicklung (später entfernen)
    debug: false
  });

export default i18n;



