import { useTranslation } from 'react-i18next';
import { useLanguageContext } from '../contexts/LanguageContext.tsx';

export const useLanguage = () => {
  const { t, i18n } = useTranslation();
  const languageContext = useLanguageContext();

  return {
    t,
    i18n,
    activeLanguage: languageContext.activeLanguage,
    organizationLanguage: languageContext.organizationLanguage,
    setUserLanguage: languageContext.setUserLanguage,
    setOrganizationLanguage: languageContext.setOrganizationLanguage,
    isLoading: languageContext.isLoading
  };
};



