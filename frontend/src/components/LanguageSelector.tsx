import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/config.ts';
import languageService from '../services/languageService.ts';

interface LanguageSelectorProps {
  className?: string;
}

// SVG Flag Icons
const FlagIcon: React.FC<{ country: 'de' | 'es' | 'en' }> = ({ country }) => {
  const flags = {
    de: (
      <svg className="w-4 h-4 inline-block mr-1" viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
        <path fill="#000" d="M0 0h640v480H0z"/>
        <path fill="#DD0000" d="M0 160h640v160H0z"/>
        <path fill="#FFCE00" d="M0 320h640v160H0z"/>
      </svg>
    ),
    es: (
      <svg className="w-4 h-4 inline-block mr-1" viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
        <path fill="#FCD116" d="M0 0h640v240H0z"/>
        <path fill="#003893" d="M0 240h640v120H0z"/>
        <path fill="#CE1126" d="M0 360h640v120H0z"/>
      </svg>
    ),
    en: (
      <svg className="w-4 h-4 inline-block mr-1" viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
        <path fill="#012169" d="M0 0h640v480H0z"/>
        <path fill="#FFF" d="M75 0l244 181L562 0h78v62L400 241l240 178v61H409L240 301 0 480H0v-60l239-178L0 64V0h75z"/>
        <path fill="#C8102E" d="M424 281l218 162h-46L378 281h46zm-184 20l6 35L54 480H0l240-179zM640 0v3L391 191l2-44L590 0h50zM0 0l239 177h-60L0 42V0z"/>
        <path fill="#FFF" d="M241 0v480h160V0H241zM0 160v160h640V160H0z"/>
        <path fill="#C8102E" d="M0 193v96h640v-96H0zM273 0v480h96V0h-96z"/>
      </svg>
    )
  };
  return flags[country];
};

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentLang = i18n.language || 'de';

  const languages = [
    { code: 'de', label: 'DE' },
    { code: 'es', label: 'ES' },
    { code: 'en', label: 'EN' }
  ];

  const handleLanguageChange = async (langCode: string) => {
    await languageService.setLanguage(langCode);
    document.documentElement.lang = langCode;
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-1"
        style={{ minWidth: '90px' }}
      >
        <FlagIcon country={currentLang as 'de' | 'es' | 'en'} />
        <span>{languages.find(l => l.code === currentLang)?.label || 'DE'}</span>
        <svg className="w-3 h-3 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full px-3 py-2 text-sm text-left flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-600 ${
                currentLang === lang.code ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <FlagIcon country={lang.code as 'de' | 'es' | 'en'} />
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;

