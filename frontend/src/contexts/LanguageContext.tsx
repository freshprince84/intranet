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
  const [activeLanguage, setActiveLanguage] = useState<string>('de');
  const [organizationLanguage, setOrganizationLanguage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Lade aktive Sprache beim Mount oder wenn User sich ändert
  useEffect(() => {
    const loadLanguage = async () => {
      if (user) {
        setIsLoading(true);
        try {
          // Lade aktive Sprache (User → Organisation → Fallback)
          const language = await languageService.getActiveLanguage();
          setActiveLanguage(language);

          // Lade Organisation-Sprache separat (nur informativ)
          try {
            const orgLang = await languageService.getOrganizationLanguage();
            setOrganizationLanguage(orgLang);
          } catch (error) {
            console.error('Fehler beim Laden der Organisation-Sprache:', error);
          }
        } catch (error) {
          console.error('Fehler beim Laden der Sprache:', error);
          setActiveLanguage('de');
        } finally {
          setIsLoading(false);
        }
      } else {
        // Kein User: Fallback
        setActiveLanguage('de');
        setIsLoading(false);
      }
    };

    loadLanguage();
  }, [user]);

  const setUserLanguage = async (language: string) => {
    try {
      await languageService.setUserLanguage(language);
      setActiveLanguage(language);
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



