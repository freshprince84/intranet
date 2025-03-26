import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon, Bars2Icon } from '@heroicons/react/24/outline';

interface Column {
  id: string;
  label: string;
}

interface TableColumnConfigProps {
  columns: Column[];
  visibleColumns: string[];
  columnOrder: string[];
  onToggleColumnVisibility: (columnId: string) => void;
  onMoveColumn: (dragIndex: number, hoverIndex: number) => void;
  onClose: () => void;
}

interface DraggableItemProps {
  id: string;
  label: string;
  index: number;
  isVisible: boolean;
  isDragging: boolean;
  isOver: boolean;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
  onToggleVisibility: (id: string) => void;
}

// Komponente für eine einzelne, ziehbare Spalte
const DraggableColumnItem: React.FC<DraggableItemProps> = ({ 
  id, 
  label, 
  index, 
  isVisible,
  isDragging,
  isOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  onToggleVisibility 
}) => {
  return (
    <li 
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(index);
      }}
      onDragEnd={onDragEnd}
      className={`flex items-center justify-between p-2 rounded-md transition-colors duration-150
        ${isDragging ? 'opacity-50 bg-gray-100 dark:bg-gray-700' : ''}
        ${isOver ? 'border-t-2 border-blue-500 dark:border-blue-400' : ''}
        ${!isDragging && !isOver ? 'hover:bg-gray-50 dark:hover:bg-gray-700' : ''}`}
    >
      <div className="flex items-center">
        <Bars2Icon className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500 cursor-move" />
        <span className="text-sm dark:text-gray-300">{label}</span>
      </div>
      <button
        onClick={() => onToggleVisibility(id)}
        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
        title={isVisible ? "Spalte ausblenden" : "Spalte einblenden"}
      >
        {isVisible ? (
          <EyeIcon className="w-4 h-4 dark:text-gray-300" />
        ) : (
          <EyeSlashIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        )}
      </button>
    </li>
  );
};

const TableColumnConfig: React.FC<TableColumnConfigProps> = ({
  columns,
  visibleColumns,
  columnOrder,
  onToggleColumnVisibility,
  onMoveColumn,
  onClose
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Sortiere die Spalten gemäß der benutzerdefinierten Reihenfolge
  const sortedColumns = [...columns].sort((a, b) => {
    const indexA = columnOrder.indexOf(a.id);
    const indexB = columnOrder.indexOf(b.id);
    // Wenn eine Spalte nicht in columnOrder ist, platziere sie am Ende
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Handler für den Beginn des Drag-Vorgangs
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
    setOverIndex(index);
  };

  // Handler für Drag-Over-Ereignis
  const handleDragOver = (index: number) => {
    setOverIndex(index);
  };

  // Handler für das Ende des Drag-Vorgangs
  const handleDragEnd = () => {
    if (draggedIndex !== null && overIndex !== null && draggedIndex !== overIndex) {
      onMoveColumn(draggedIndex, overIndex);
    }
    setDraggedIndex(null);
    setOverIndex(null);
  };

  // Handler zum Schließen des Menüs
  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  return (
    <div className="relative">
      <button
        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={() => setIsOpen(!isOpen)}
        title="Spalten konfigurieren"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 dark:text-gray-300">
          <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-300 dark:border-gray-600"
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-sm dark:text-white">Spalten konfigurieren</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ziehe die Spalten, um ihre Reihenfolge zu ändern</p>
          </div>
          <ul className="p-2 max-h-64 overflow-y-auto">
            {sortedColumns.map((column, index) => (
              <DraggableColumnItem
                key={column.id}
                id={column.id}
                label={column.label}
                index={index}
                isVisible={visibleColumns.includes(column.id)}
                isDragging={draggedIndex === index}
                isOver={overIndex === index && draggedIndex !== index}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onToggleVisibility={onToggleColumnVisibility}
              />
            ))}
          </ul>
          <div className="p-2 border-t border-gray-200 dark:border-gray-700 text-right">
            <button
              onClick={handleClose}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableColumnConfig; 