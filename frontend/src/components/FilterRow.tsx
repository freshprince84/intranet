import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

export interface FilterCondition {
  column: string;
  operator: string;
  value: string | number | Date | null;
}

interface TableColumn {
  id: string;
  label: string;
}

interface FilterRowProps {
  condition: FilterCondition;
  onChange: (condition: FilterCondition) => void;
  onDelete: () => void;
  onAdd: () => void;
  columns: TableColumn[];
  isFirst: boolean;
  isLast: boolean;
}

const getOperatorsByColumnType = (columnId: string): { value: string; label: string }[] => {
  // Standard-Text-Operatoren
  const textOperators = [
    { value: 'equals', label: '=' },
    { value: 'contains', label: 'enthält' },
    { value: 'startsWith', label: 'beginnt mit' },
    { value: 'endsWith', label: 'endet mit' }
  ];

  // Datum-Operatoren
  const dateOperators = [
    { value: 'equals', label: '=' },
    { value: 'before', label: '<' },
    { value: 'after', label: '>' },
    { value: 'between', label: 'zwischen' }
  ];

  // Status-Operatoren (für Enum-Werte)
  const statusOperators = [
    { value: 'equals', label: '=' },
    { value: 'notEquals', label: 'ist nicht' }
  ];

  // Je nach Spaltentyp entsprechende Operatoren zurückgeben
  if (columnId === 'dueDate') {
    return dateOperators;
  } else if (columnId === 'status') {
    return statusOperators;
  } else {
    return textOperators;
  }
};

// Rendert das Eingabefeld basierend auf Spalte und Operator
const renderValueInput = (
  columnId: string, 
  operator: string, 
  value: string | number | Date | null, 
  onChange: (value: string | number | Date | null) => void
) => {
  // Für Status ein Dropdown rendern
  if (columnId === 'status') {
    return (
      <select
        className="px-3 py-2 border rounded-md w-full"
        value={value as string || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Bitte wählen</option>
        <option value="open">Offen</option>
        <option value="in_progress">In Bearbeitung</option>
        <option value="improval">Zu verbessern</option>
        <option value="quality_control">Qualitätskontrolle</option>
        <option value="done">Erledigt</option>
      </select>
    );
  }
  
  // Für Datumsfelder ein Datumseingabefeld rendern
  if (columnId === 'dueDate') {
    return (
      <input
        type="date"
        className="px-3 py-2 border rounded-md w-full"
        value={value as string || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  
  // Standard-Texteingabe für alle anderen Felder
  return (
    <input
      type="text"
      className="px-3 py-2 border rounded-md w-full"
      value={value as string || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Filterwert eingeben..."
    />
  );
};

const FilterRow: React.FC<FilterRowProps> = ({ 
  condition, 
  onChange, 
  onDelete, 
  onAdd,
  columns, 
  isFirst,
  isLast
}) => {
  const [operators, setOperators] = useState<{ value: string; label: string }[]>([]);
  
  // Operatoren aktualisieren, wenn sich die Spalte ändert
  useEffect(() => {
    setOperators(getOperatorsByColumnType(condition.column));
  }, [condition.column]);
  
  return (
    <div className="flex items-center space-x-2 mb-2">
      {/* Spalten-Auswahl */}
      <div className="w-1/3">
        <select
          className="px-3 py-2 border rounded-md w-full"
          value={condition.column}
          onChange={(e) => onChange({ ...condition, column: e.target.value, operator: operators[0]?.value || 'equals' })}
        >
          <option value="">Spalte wählen</option>
          {columns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* Operator-Auswahl */}
      <div className="w-1/4">
        <select
          className="px-3 py-2 border rounded-md w-full"
          value={condition.operator}
          onChange={(e) => onChange({ ...condition, operator: e.target.value })}
        >
          {operators.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* Wert-Eingabe */}
      <div className="w-1/3">
        {renderValueInput(
          condition.column, 
          condition.operator, 
          condition.value, 
          (value) => onChange({ ...condition, value })
        )}
      </div>
      
      {/* Aktions-Buttons */}
      <div className="flex space-x-1">
        {/* Löschen-Button (nicht für die erste Zeile, wenn sie die einzige ist) */}
        <button
          type="button"
          onClick={onDelete}
          className="p-2 text-gray-500 hover:text-red-600 rounded-md"
          disabled={isFirst && !isLast}
          title="Filterbedingung entfernen"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
        
        {/* Hinzufügen-Button (nur in der letzten Zeile) */}
        {isLast && (
          <button
            type="button"
            onClick={onAdd}
            className="p-2 text-gray-500 hover:text-blue-600 rounded-md"
            title="Neue Filterbedingung hinzufügen"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterRow; 