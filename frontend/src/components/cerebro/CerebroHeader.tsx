import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  DocumentTextIcon, 
  PlusIcon, 
  FunnelIcon, 
  ArrowsUpDownIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface CerebroHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  canCreateArticle: boolean;
  onCreateArticle: () => void;
  onFilterClick: () => void;
  onSortClick: () => void;
  onSortChange?: (key: string, direction: 'asc' | 'desc') => void;
  activeFilterCount: number;
  sortConfig?: { key: string; direction: 'asc' | 'desc' };
}

const CerebroHeader: React.FC<CerebroHeaderProps> = ({
  searchTerm,
  onSearchChange,
  onSearchSubmit,
  canCreateArticle,
  onCreateArticle,
  onFilterClick,
  onSortClick,
  onSortChange,
  activeFilterCount,
  sortConfig = { key: 'title', direction: 'asc' }
}) => {
  const { t } = useTranslation();
  const [isSortMenuOpen, setIsSortMenuOpen] = useState<boolean>(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearchSubmit();
    }
  };
  
  // Schließe Sortier-Menü beim Klicken außerhalb
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setIsSortMenuOpen(false);
      }
    };
    
    if (isSortMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSortMenuOpen]);
  
  const handleSortClickInternal = () => {
    setIsSortMenuOpen(!isSortMenuOpen);
    onSortClick();
  };
  
  const handleSortChange = (key: string, direction: 'asc' | 'desc') => {
    if (onSortChange) {
      onSortChange(key, direction);
    }
    setIsSortMenuOpen(false);
  };

  return (
    <div className="px-3 sm:px-4 md:px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Linke Seite: Titel mit Icon */}
        <div className="flex items-center">
          <DocumentTextIcon className="h-6 w-6 mr-2 dark:text-white" />
          <h2 className="text-xl font-semibold dark:text-white">{t('cerebro.header.title', 'Cerebro')}</h2>
        </div>
        
        {/* Rechte Seite: Suchfeld, Neuer Artikel Button, Filter, Sortieren */}
        <div className="flex items-center gap-1.5">
          {/* Suchfeld */}
          <div className="relative">
            <input
              type="text"
              placeholder={t('cerebro.header.searchPlaceholder', 'Artikel suchen...')}
              className="w-[200px] px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyPress={handleSearchKeyPress}
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          
          {/* Neuer Artikel Button */}
          {canCreateArticle && (
            <div className="relative group">
              <button
                onClick={onCreateArticle}
                className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm flex items-center justify-center"
                style={{ width: '30.19px', height: '30.19px' }}
                aria-label={t('cerebro.header.createArticle', 'Neuer Artikel')}
              >
                <PlusIcon className="h-4 w-4" />
              </button>
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                {t('cerebro.header.createArticle', 'Neuer Artikel')}
              </div>
            </div>
          )}
          
          {/* Filter-Button */}
          <div className="relative group">
            <button
              className={`p-2 rounded-md ${
                activeFilterCount > 0 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={onFilterClick}
            >
              <FunnelIcon className="h-5 w-5" />
              {activeFilterCount > 0 && (
                <span 
                  className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 dark:bg-blue-500 text-white rounded-full text-xs flex items-center justify-center z-10" 
                  style={{ position: 'absolute', top: '-0.25rem', right: '-0.25rem' }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
              {t('cerebro.header.filter', 'Filter')}
            </div>
          </div>
          
          {/* Sortier-Button mit Dropdown */}
          <div className="relative group" ref={sortMenuRef}>
            <button
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={handleSortClickInternal}
            >
              <ArrowsUpDownIcon className="h-5 w-5" />
            </button>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
              {t('cerebro.header.sort', 'Sortieren')}
            </div>
            
            {/* Sortier-Dropdown-Menü */}
            {isSortMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 min-w-[200px]">
                <div className="py-1">
                  <button
                    onClick={() => handleSortChange('title', 'asc')}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      sortConfig.key === 'title' && sortConfig.direction === 'asc' ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                  >
                    {t('cerebro.sort.titleAsc', 'Titel (A-Z)')}
                  </button>
                  <button
                    onClick={() => handleSortChange('title', 'desc')}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      sortConfig.key === 'title' && sortConfig.direction === 'desc' ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                  >
                    {t('cerebro.sort.titleDesc', 'Titel (Z-A)')}
                  </button>
                  <button
                    onClick={() => handleSortChange('createdAt', 'desc')}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      sortConfig.key === 'createdAt' && sortConfig.direction === 'desc' ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                  >
                    {t('cerebro.sort.createdAtDesc', 'Neueste zuerst')}
                  </button>
                  <button
                    onClick={() => handleSortChange('createdAt', 'asc')}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      sortConfig.key === 'createdAt' && sortConfig.direction === 'asc' ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                  >
                    {t('cerebro.sort.createdAtAsc', 'Älteste zuerst')}
                  </button>
                  <button
                    onClick={() => handleSortChange('updatedAt', 'desc')}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      sortConfig.key === 'updatedAt' && sortConfig.direction === 'desc' ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                  >
                    {t('cerebro.sort.updatedAtDesc', 'Zuletzt aktualisiert')}
                  </button>
                  <button
                    onClick={() => handleSortChange('updatedAt', 'asc')}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      sortConfig.key === 'updatedAt' && sortConfig.direction === 'asc' ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                  >
                    {t('cerebro.sort.updatedAtAsc', 'Älteste Aktualisierung')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CerebroHeader;

