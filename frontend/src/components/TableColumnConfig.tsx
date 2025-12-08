import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeIcon, EyeSlashIcon, ArrowsUpDownIcon, ArrowUpIcon, ArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Column {
  id: string;
  label: string;
}

interface TableColumnConfigProps {
  columns: Column[];
  visibleColumns: string[];
  columnOrder: string[];
  onToggleColumnVisibility: (columnId: string) => void;
  onMoveColumn?: (dragIndex: number, hoverIndex: number) => void; // Optional: Drag & Drop für Spalten-Reihenfolge
  onClose?: () => void; // Optional: Callback wenn Modal geschlossen wird
  buttonTitle?: string; // Optional: Custom Button-Titel
  modalTitle?: string; // Optional: Custom Modal-Titel
  mainSortConfig?: { key: string; direction: 'asc' | 'desc' }; // Optional: Hauptsortierung (für Table & Cards synchron)
  onMainSortChange?: (key: string, direction: 'asc' | 'desc') => void; // Optional: Callback für Hauptsortierung
  showMainSort?: boolean; // Optional: Hauptsortierung anzeigen
  isOpen?: boolean; // Optional: Externe Steuerung des Modal-Status (wenn nicht übergeben, wird interner State verwendet)
  onOpenChange?: (open: boolean) => void; // Optional: Callback wenn Modal geöffnet/geschlossen wird (für externe Steuerung)
}

interface DraggableItemProps {
  id: string;
  label: string;
  index: number;
  isVisible: boolean;
  onToggleVisibility: (id: string) => void;
  sortDirection?: 'asc' | 'desc'; // Optional: Sortierrichtung für diese Spalte (wenn diese Spalte die Hauptsortierung ist)
  onSortDirectionChange?: (id: string, direction: 'asc' | 'desc') => void; // Optional: Callback für Hauptsortierung
  showMainSort?: boolean; // Optional: Hauptsortierung anzeigen
  isMainSort?: boolean; // Optional: Ist diese Spalte die Hauptsortierung?
}

// Komponente für eine einzelne Spalte
const DraggableColumnItem: React.FC<DraggableItemProps> = ({ 
  id, 
  label, 
  index, 
  isVisible,
  onToggleVisibility,
  sortDirection,
  onSortDirectionChange,
  showMainSort = false,
  isMainSort = false
}) => {
  const { t } = useTranslation();
  
  return (
    <li 
      className="flex items-center justify-between px-2.5 py-2 rounded-md transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-700"
    >
      <div className="flex items-center flex-1 min-w-0">
        <span className="text-sm dark:text-gray-300 flex items-center gap-2">
          {showMainSort && isMainSort && isVisible && (
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
              {t('tableColumn.mainSort')}
            </span>
          )}
          <span>{label}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        {/* Hauptsortierung-Toggle: Nur anzeigen wenn onSortDirectionChange vorhanden ist */}
        {onSortDirectionChange && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Wenn diese Spalte bereits die Hauptsortierung ist, toggle die Richtung
              // Sonst setze diese Spalte als neue Hauptsortierung (Standard: 'asc')
              if (isMainSort && sortDirection !== undefined) {
                onSortDirectionChange(id, sortDirection === 'asc' ? 'desc' : 'asc');
              } else {
                onSortDirectionChange(id, 'asc');
              }
            }}
            className={`inline-flex items-center justify-center p-1.5 rounded-md transition-colors duration-150 ${
              isMainSort
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
            title={
              isMainSort && sortDirection !== undefined
                ? `${t('tableColumn.mainSort')}: ${sortDirection === 'asc' ? t('tableColumn.ascending') : t('tableColumn.descending')} (${t('tableColumn.clickToToggle')})`
                : `${t('tableColumn.setMainSort')} (${t('tableColumn.clickToSet')})`
            }
          >
            {isMainSort && sortDirection === 'asc' ? (
              <ArrowUpIcon className="h-4 w-4" />
            ) : isMainSort && sortDirection === 'desc' ? (
              <ArrowDownIcon className="h-4 w-4" />
            ) : (
              <ArrowsUpDownIcon className="h-4 w-4" />
            )}
          </button>
        )}
        <button
          onClick={() => onToggleVisibility(id)}
          className="inline-flex items-center justify-center p-1.5 rounded-full bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-300 transition-colors duration-150"
          title={isVisible ? t('tableColumn.hideColumn') : t('tableColumn.showColumn')}
        >
          {isVisible ? (
            <EyeIcon className="w-4 h-4 dark:text-gray-300" />
          ) : (
            <EyeSlashIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          )}
        </button>
      </div>
    </li>
  );
};

const TableColumnConfig: React.FC<TableColumnConfigProps> = ({
  columns,
  visibleColumns,
  columnOrder,
  onToggleColumnVisibility,
  onMoveColumn,
  onClose,
  buttonTitle,
  modalTitle,
  mainSortConfig,
  onMainSortChange,
  showMainSort = false,
  isOpen: externalIsOpen,
  onOpenChange
}) => {
  const { t } = useTranslation();
  const defaultButtonTitle = buttonTitle || t('tableColumn.configure');
  const defaultModalTitle = modalTitle || t('tableColumn.configure');
  // Interner State nur verwenden, wenn keine externe Steuerung übergeben wurde
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const menuRef = useRef<HTMLDivElement>(null);

  // Sortiere die Spalten gemäß der benutzerdefinierten Reihenfolge
  const sortedColumns = [...columns].sort((a, b) => {
    const indexA = columnOrder.indexOf(a.id);
    const indexB = columnOrder.indexOf(b.id);
    // Wenn eine Spalte nicht in columnOrder ist, platziere sie am Ende
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Handler zum Schließen des Menüs
  const handleClose = useCallback(() => {
    if (externalIsOpen !== undefined) {
      // Externe Steuerung: onOpenChange aufrufen
      onOpenChange?.(false);
    } else {
      // Interne Steuerung: internen State aktualisieren
      setInternalIsOpen(false);
    }
    onClose?.();
  }, [externalIsOpen, onOpenChange, onClose]);

  // Handler zum Öffnen des Menüs
  const handleOpen = useCallback(() => {
    if (externalIsOpen !== undefined) {
      // Externe Steuerung: onOpenChange aufrufen
      onOpenChange?.(true);
    } else {
      // Interne Steuerung: internen State aktualisieren
      setInternalIsOpen(true);
    }
  }, [externalIsOpen, onOpenChange]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClose]);

  // Keyboard navigation: ESC zum Schließen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  return (
    <div className="relative" ref={menuRef}>
      {/* Button nur anzeigen, wenn keine externe Steuerung vorhanden ist */}
      {externalIsOpen === undefined && (
        <button
          className="inline-flex items-center justify-center p-2 rounded-md bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-300 transition-colors duration-150"
          onClick={isOpen ? handleClose : handleOpen}
          title={defaultButtonTitle}
        >
        {showMainSort ? (
          <ArrowsUpDownIcon className="w-5 h-5" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z" clipRule="evenodd" />
          </svg>
        )}
        </button>
      )}

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1rem)] bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 border border-gray-300 dark:border-gray-600"
          role="dialog"
          aria-modal="true"
          aria-labelledby="table-column-config-title"
        >
          <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 id="table-column-config-title" className="text-sm font-semibold text-gray-900 dark:text-white">{defaultModalTitle}</h3>
            <button
              onClick={handleClose}
              className="inline-flex items-center justify-center p-2 rounded-md bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-300 transition-colors duration-150"
              title={t('common.close')}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <ul className="px-2 py-1 max-h-64 overflow-y-auto">
            {sortedColumns.map((column, index) => {
              const isVisible = visibleColumns.includes(column.id);
              // Prüfe ob diese Spalte die Hauptsortierung ist
              const isMainSort = mainSortConfig?.key === column.id;
              const sortDirection = isMainSort ? mainSortConfig.direction : undefined;
              // Sort-Button anzeigen: Wenn keine Hauptsortierung gesetzt ist → für alle Spalten, sonst nur für aktive
              const showSortButton = showMainSort && isVisible && onMainSortChange && (mainSortConfig === undefined || isMainSort);
              
              return (
                <DraggableColumnItem
                  key={column.id}
                  id={column.id}
                  label={column.label}
                  index={index}
                  isVisible={isVisible}
                  onToggleVisibility={onToggleColumnVisibility}
                  sortDirection={sortDirection}
                  onSortDirectionChange={showSortButton ? onMainSortChange : undefined}
                  showMainSort={showMainSort}
                  isMainSort={isMainSort}
                />
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TableColumnConfig; 