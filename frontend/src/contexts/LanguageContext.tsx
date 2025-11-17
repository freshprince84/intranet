import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import languageService from '../services/languageService.ts';
import { useAuth } from '../hooks/useAuth.tsx';

interface LanguageContextType {
  activeLanguage: string;
  organizationLanguage: string | null;
  setUserLanguage: (language: string) => Promise<void>;
  setOrganizationLanguage: (language: string) => Promise<void>;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguageContext = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguageContext must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  
  // Initialisiere mit gespeicherter Sprache oder Browser-Sprache
  const getInitialLanguage = (): string => {
    // 1. Prüfe localStorage
    const stored = languageService.getStoredLanguage();
    if (stored) {
      return stored;
    }
    
    // 2. Browser-Sprache (i18n wurde bereits mit Browser-Sprache initialisiert)
    const browserLanguage = i18n.language || 'de';
    const supportedLanguages = ['de', 'es', 'en'];
    if (supportedLanguages.includes(browserLanguage)) {
      return browserLanguage;
    }
    
    // 3. Fallback
    return 'de';
  };
  
  const [activeLanguage, setActiveLanguage] = useState<string>(getInitialLanguage());
  const [organizationLanguage, setOrganizationLanguage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Setze initiale Sprache sofort (synchron)
  useEffect(() => {
    const initialLang = getInitialLanguage();
    if (initialLang && i18n.language !== initialLang) {
      i18n.changeLanguage(initialLang);
      document.documentElement.lang = initialLang;
    }
  }, []); // Nur beim Mount

  // Lade aktive Sprache beim Mount oder wenn User sich ändert
  useEffect(() => {
    const loadLanguage = async () => {
      if (user) {
        setIsLoading(true);
        try {
          // Lade aktive Sprache (User → Organisation → Fallback)
          const language = await languageService.getActiveLanguage();
          setActiveLanguage(language);
          
          // Setze HTML lang Attribut
          document.documentElement.lang = language;

          // Lade Organisation-Sprache separat (nur informativ)
          try {
            const orgLang = await languageService.getOrganizationLanguage();
            setOrganizationLanguage(orgLang);
          } catch (error) {
            console.error('Fehler beim Laden der Organisation-Sprache:', error);
          }
        } catch (error) {
          console.error('Fehler beim Laden der Sprache:', error);
          const fallbackLang = 'de';
          setActiveLanguage(fallbackLang);
          document.documentElement.lang = fallbackLang;
        } finally {
          setIsLoading(false);
        }
      } else {
        // Kein User: Browser-Sprache verwenden (i18n LanguageDetector hat diese bereits erkannt)
        const browserLanguage = i18n.language || 'de';
        // Validiere, dass es eine unterstützte Sprache ist
        const supportedLanguages = ['de', 'es', 'en'];
        const validLanguage = supportedLanguages.includes(browserLanguage) ? browserLanguage : 'de';
        
        setActiveLanguage(validLanguage);
        document.documentElement.lang = validLanguage;
        
        // Stelle sicher, dass i18n die richtige Sprache verwendet
        if (i18n.language !== validLanguage) {
          i18n.changeLanguage(validLanguage);
        }
        
        // Speichere Browser-Sprache im localStorage
        languageService.setLanguage(validLanguage);
        
        setIsLoading(false);
      }
    };

    loadLanguage();
  }, [user, i18n]);
  
  // Aktualisiere HTML lang Attribut wenn sich die aktive Sprache ändert
  useEffect(() => {
    if (activeLanguage && i18n.language) {
      const langToUse = activeLanguage || i18n.language || 'de';
      document.documentElement.lang = langToUse;
      i18n.changeLanguage(langToUse);
    }
  }, [activeLanguage, i18n]);

  const setUserLanguage = async (language: string) => {
    try {
      await languageService.setUserLanguage(language);
      setActiveLanguage(language);
      document.documentElement.lang = language;
      await i18n.changeLanguage(language);
      // localStorage wird bereits in languageService.setUserLanguage gespeichert
    } catch (error) {
      console.error('Fehler beim Setzen der Benutzer-Sprache:', error);
      throw error;
    }
  };

  const setOrganizationLanguageHandler = async (language: string) => {
    try {
      await languageService.setOrganizationLanguage(language);
      setOrganizationLanguage(language);
      
      // Wenn User keine eigene Sprache hat, aktive Sprache auch aktualisieren
      if (!user?.language || user.language.trim() === '') {
        await languageService.setLanguage(language);
        setActiveLanguage(language);
        document.documentElement.lang = language;
        await i18n.changeLanguage(language);
        // localStorage wird bereits in languageService.setLanguage gespeichert
      }
    } catch (error) {
      console.error('Fehler beim Setzen der Organisation-Sprache:', error);
      throw error;
    }
  };

  const value: LanguageContextType = {
    activeLanguage,
    organizationLanguage,
    setUserLanguage,
    setOrganizationLanguage: setOrganizationLanguageHandler,
    isLoading
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};



