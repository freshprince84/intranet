import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeIcon, EyeSlashIcon, Bars2Icon, ArrowsUpDownIcon, ArrowUpIcon, ArrowDownIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Column {
  id: string;
  label: string;
}

interface TableColumnConfigProps {
  columns: Column[];
  visibleColumns: string[];
  columnOrder: string[];
  onToggleColumnVisibility: (columnId: string) => void;
  onMoveColumn?: (dragIndex: number, hoverIndex: number) => void; // ❌ ENTFERNT: Wird nicht mehr verwendet (Phase 3 - Drag & Drop nur bei Table Headern)
  onClose: () => void;
  buttonTitle?: string; // Optional: Custom Button-Titel
  modalTitle?: string; // Optional: Custom Modal-Titel
  sortDirections?: Record<string, 'asc' | 'desc'>; // Optional: Sortierrichtungen pro Spalte (für Cards-Mode)
  onSortDirectionChange?: (columnId: string, direction: 'asc' | 'desc') => void; // Optional: Callback für Sortierrichtung pro Spalte
  showSortDirection?: boolean; // Optional: Sortierrichtung anzeigen
}

interface DraggableItemProps {
  id: string;
  label: string;
  index: number;
  isVisible: boolean;
  isDragging: boolean; // ❌ ENTFERNT: Wird nicht mehr verwendet (Phase 3)
  isOver: boolean; // ❌ ENTFERNT: Wird nicht mehr verwendet (Phase 3)
  onDragStart: (index: number) => void; // ❌ ENTFERNT: Wird nicht mehr verwendet (Phase 3)
  onDragOver: (index: number) => void; // ❌ ENTFERNT: Wird nicht mehr verwendet (Phase 3)
  onDragEnd: () => void; // ❌ ENTFERNT: Wird nicht mehr verwendet (Phase 3)
  onToggleVisibility: (id: string) => void;
  sortDirection?: 'asc' | 'desc'; // Optional: Sortierrichtung für diese Spalte
  onSortDirectionChange?: (id: string, direction: 'asc' | 'desc') => void; // Optional: Callback für Sortierrichtung
  showSortDirection?: boolean; // Optional: Sortierrichtung anzeigen
  sortOrder?: number; // Optional: Sortierreihenfolge (1, 2, 3, etc.)
}

// Komponente für eine einzelne Spalte (ohne Drag & Drop im Modal)
const DraggableColumnItem: React.FC<DraggableItemProps> = ({ 
  id, 
  label, 
  index, 
  isVisible,
  isDragging = false, // ❌ ENTFERNT: Wird nicht mehr verwendet (Phase 3), aber als Prop übergeben
  isOver = false, // ❌ ENTFERNT: Wird nicht mehr verwendet (Phase 3), aber als Prop übergeben
  // ❌ ENTFERNT: onDragStart, onDragOver, onDragEnd - Drag & Drop wurde aus Modal entfernt (Phase 3)
  onToggleVisibility,
  sortDirection,
  onSortDirectionChange,
  showSortDirection = false,
  sortOrder
}) => {
  const { t } = useTranslation();
  
  return (
    <li 
      // ❌ ENTFERNT: Drag & Drop im Modal - Drag & Drop wurde aus Modal entfernt (Phase 3), bleibt nur bei Table Headern
      className={`flex items-center justify-between px-2.5 py-2 rounded-md transition-colors duration-150
        ${!isDragging && !isOver ? 'hover:bg-gray-50 dark:hover:bg-gray-700' : ''}`}
    >
      <div className="flex items-center flex-1 min-w-0">
        {/* ❌ ENTFERNT: Bars2Icon - Drag-Handle wurde entfernt (Phase 3) */}
        <span className="text-sm dark:text-gray-300 flex items-center gap-2">
          {showSortDirection && sortOrder !== undefined && isVisible && (
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
              {sortOrder}
            </span>
          )}
          <span>{label}</span>
        </span>
      </div>
      <div className="flex items-center gap-1">
        {/* Sortierrichtung-Toggle */}
        {showSortDirection && isVisible && sortDirection !== undefined && onSortDirectionChange && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSortDirectionChange(id, sortDirection === 'asc' ? 'desc' : 'asc');
            }}
            className="inline-flex items-center justify-center p-1.5 rounded-md bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-300 transition-colors duration-150"
            title={`${t('tableColumn.sortDirection')}: ${sortDirection === 'asc' ? t('tableColumn.ascending') : t('tableColumn.descending')} (${t('tableColumn.clickToToggle')})`}
          >
            {sortDirection === 'asc' ? (
              <ArrowUpIcon className="h-4 w-4" />
            ) : (
              <ArrowDownIcon className="h-4 w-4" />
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
  sortDirections = {},
  onSortDirectionChange,
  showSortDirection = false
}) => {
  const { t } = useTranslation();
  const defaultButtonTitle = buttonTitle || t('tableColumn.configure');
  const defaultModalTitle = modalTitle || t('tableColumn.configure');
  const [isOpen, setIsOpen] = useState(false);
  // ❌ ENTFERNT: draggedIndex, overIndex, handleDragStart, handleDragOver, handleDragEnd - Drag & Drop wurde aus Modal entfernt (Phase 3)
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
  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

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
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="inline-flex items-center justify-center p-2 rounded-md bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-300 transition-colors duration-150"
        onClick={() => setIsOpen(!isOpen)}
        title={defaultButtonTitle}
      >
        {showSortDirection ? (
          <ArrowsUpDownIcon className="w-5 h-5" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 border border-gray-300 dark:border-gray-600"
          // ❌ ENTFERNT: onDragOver - Drag & Drop wurde aus Modal entfernt (Phase 3)
        >
          <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{defaultModalTitle}</h3>
            <button
              onClick={handleClose}
              className="inline-flex items-center justify-center p-2 rounded-md bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-300 transition-colors duration-150"
              title={t('common.close')}
            >
              <CheckIcon className="w-5 h-5" />
            </button>
          </div>
          <ul className="px-2 py-1 max-h-64 overflow-y-auto">
            {sortedColumns.map((column, index) => {
              // Bestimme Sortierreihenfolge (nur für sichtbare Spalten)
              const visibleSortedColumns = sortedColumns.filter(col => visibleColumns.includes(col.id));
              const sortOrder = visibleSortedColumns.findIndex(col => col.id === column.id) + 1;
              const isVisible = visibleColumns.includes(column.id);
              
              return (
                <DraggableColumnItem
                  key={column.id}
                  id={column.id}
                  label={column.label}
                  index={index}
                  isVisible={isVisible}
                  isDragging={false} // ❌ ENTFERNT: Drag & Drop wurde aus Modal entfernt (Phase 3)
                  isOver={false} // ❌ ENTFERNT: Drag & Drop wurde aus Modal entfernt (Phase 3)
                  onDragStart={() => {}} // ❌ ENTFERNT: Drag & Drop wurde aus Modal entfernt (Phase 3)
                  onDragOver={() => {}} // ❌ ENTFERNT: Drag & Drop wurde aus Modal entfernt (Phase 3)
                  onDragEnd={() => {}} // ❌ ENTFERNT: Drag & Drop wurde aus Modal entfernt (Phase 3)
                  onToggleVisibility={onToggleColumnVisibility}
                  sortDirection={showSortDirection && isVisible ? (sortDirections[column.id] || 'asc') : undefined}
                  onSortDirectionChange={showSortDirection ? onSortDirectionChange : undefined}
                  showSortDirection={showSortDirection}
                  sortOrder={showSortDirection && isVisible ? sortOrder : undefined}
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