import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@heroicons/react/24/outline';

interface FilterLogicalOperatorProps {
  operator: 'AND' | 'OR';
  onChange: (operator: 'AND' | 'OR') => void;
}

const FilterLogicalOperator: React.FC<FilterLogicalOperatorProps> = ({ operator, onChange }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleSelect = (value: 'AND' | 'OR') => {
    onChange(value);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center justify-start my-4 relative pl-[180px]" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-0.5 py-0.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center flex items-center justify-center gap-1"
        style={{ width: '42px', minWidth: '42px', maxWidth: '42px', overflow: 'hidden' }}
      >
        {operator === 'AND' ? (
          <>
            <PlusIcon className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{t('filter.logicalOperators.and')}</span>
          </>
        ) : (
          <>
            <span className="text-xs">∨</span>
            <span className="truncate">{t('filter.logicalOperators.or')}</span>
          </>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[42px]">
          <button
            type="button"
            onClick={() => handleSelect('AND')}
            className={`w-full px-2 py-1 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1.5 ${
              operator === 'AND' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <PlusIcon className="h-3 w-3 flex-shrink-0" />
            <span>{t('filter.logicalOperators.and')}</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelect('OR')}
            className={`w-full px-2 py-1 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1.5 ${
              operator === 'OR' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <span className="text-xs">∨</span>
            <span>{t('filter.logicalOperators.or')}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterLogicalOperator; 