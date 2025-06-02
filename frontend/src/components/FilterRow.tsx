import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';

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

// Neue Interfaces für Benutzer und Rollen
interface User {
  id: number;
  firstName: string;
  lastName: string;
}

interface Role {
  id: number;
  name: string;
}

const getOperatorsByColumnType = (columnId: string): { value: string; label: string }[] => {
  // Standard-Text-Operatoren
  const textOperators = [
    { value: 'equals', label: '=' },
    { value: 'contains', label: 'enthält' },
    { value: 'startsWith', label: 'beginnt mit' },
    { value: 'endsWith', label: 'endet mit' }
  ];

  // Datum-Operatoren (benutzerfreundliche Labels)
  const dateOperators = [
    { value: 'equals', label: 'ist genau' },
    { value: 'after', label: 'ab' },           // "ab nächstem Monat"
    { value: 'before', label: 'bis' },         // "bis Ende letztes Jahr"
    { value: 'between', label: 'zwischen' }
  ];

  // Dauer-Operatoren (für Zeitspannen)
  const durationOperators = [
    { value: 'equals', label: 'ist gleich' },
    { value: 'greater_than', label: 'länger als' },
    { value: 'less_than', label: 'kürzer als' }
  ];

  // Status-Operatoren (für Enum-Werte)
  const statusOperators = [
    { value: 'equals', label: '=' },
    { value: 'notEquals', label: 'ist nicht' }
  ];

  // Je nach Spaltentyp entsprechende Operatoren zurückgeben
  if (columnId === 'dueDate' || columnId === 'startTime') {
    return dateOperators;
  } else if (columnId === 'duration') {
    return durationOperators;
  } else if (columnId === 'status') {
    return statusOperators;
  } else if (columnId === 'responsible' || columnId === 'qualityControl' || columnId === 'responsibleAndQualityControl') {
    return statusOperators;
  } else {
    return textOperators;
  }
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
  // States für Benutzer und Rollen
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  
  // Operatoren aktualisieren, wenn sich die Spalte ändert
  useEffect(() => {
    setOperators(getOperatorsByColumnType(condition.column));
  }, [condition.column]);
  
  // Laden der Benutzer und Rollen, wenn benötigt
  useEffect(() => {
    const loadUsersAndRoles = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      if (condition.column === 'responsible' || condition.column === 'qualityControl' || condition.column === 'responsibleAndQualityControl') {
        // Benutzer laden
        setLoadingUsers(true);
        try {
          const response = await axiosInstance.get('/users');
          setUsers(response.data);
        } catch (error) {
          console.error('Fehler beim Laden der Benutzer:', error);
        } finally {
          setLoadingUsers(false);
        }
        
        // Rollen laden, aber nur wenn es sich um den Verantwortlichen handelt
        if (condition.column === 'responsible' || condition.column === 'responsibleAndQualityControl') {
          setLoadingRoles(true);
          try {
            const response = await axiosInstance.get('/roles');
            setRoles(response.data);
          } catch (error) {
            console.error('Fehler beim Laden der Rollen:', error);
          } finally {
            setLoadingRoles(false);
          }
        }
      }
    };
    
    loadUsersAndRoles();
  }, [condition.column]);
  
  // Rendert das Eingabefeld basierend auf Spalte und Operator
  const renderValueInput = (
    columnId: string, 
    operator: string, 
    value: string | number | Date | null, 
    onChange: (value: string | number | Date | null) => void
  ) => {
    // Für Status ein Dropdown rendern
    if (columnId === 'status') {
      // Überprüfen welche Tabelle wir filtern (über Columns-Array)
      const isRequestTable = columns.some(col => col.id === 'requestedBy' || col.id === 'createTodo');
      const isTaskTable = columns.some(col => col.id === 'responsible' || col.id === 'qualityControl');
      
      if (isRequestTable) {
        // Request-Status-Optionen
        return (
          <select
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Bitte wählen</option>
            <option value="approval">Zur Genehmigung</option>
            <option value="approved">Genehmigt</option>
            <option value="to_improve">Zu verbessern</option>
            <option value="denied">Abgelehnt</option>
          </select>
        );
      } else if (isTaskTable) {
        // Task-Status-Optionen
        return (
          <select
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
      } else {
        // Fallback für andere Tabellen mit Status
        return (
          <select
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Bitte wählen</option>
            <option value="open">Offen</option>
            <option value="in_progress">In Bearbeitung</option>
            <option value="done">Erledigt</option>
          </select>
        );
      }
    }
    
    // Für Verantwortlicher ein Dropdown mit Benutzern und Rollen rendern
    if (columnId === 'responsible' || columnId === 'responsibleAndQualityControl') {
      return (
        <select
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={loadingUsers || loadingRoles}
        >
          <option value="">Bitte wählen</option>
          
          {users.length > 0 && (
            <optgroup label="Benutzer">
              {users.map(user => (
                <option key={`user-${user.id}`} value={`user-${user.id}`}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </optgroup>
          )}
          
          {roles.length > 0 && (
            <optgroup label="Rollen">
              {roles.map(role => (
                <option key={`role-${role.id}`} value={`role-${role.id}`}>
                  {role.name}
                </option>
              ))}
            </optgroup>
          )}
          
          {(loadingUsers || loadingRoles) && (
            <option value="" disabled>Lade Daten...</option>
          )}
        </select>
      );
    }
    
    // Für Qualitätskontrolle ein Dropdown nur mit Benutzern rendern
    if (columnId === 'qualityControl') {
      return (
        <select
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={loadingUsers}
        >
          <option value="">Bitte wählen</option>
          
          {users.length > 0 && (
            <optgroup label="Benutzer">
              {users.map(user => (
                <option key={`user-${user.id}`} value={`user-${user.id}`}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </optgroup>
          )}
          
          {loadingUsers && (
            <option value="" disabled>Lade Benutzer...</option>
          )}
        </select>
      );
    }
    
    // Für Datumsfelder ein Datumseingabefeld rendern
    if (columnId === 'dueDate' || columnId === 'startTime') {
      // Prüfe ob der Wert eine Variable ist
      const isVariable = value === '__TODAY__';
      const isCustomDate = !isVariable && value;
      
      return (
        <div className="space-y-2">
          {/* Auswahl zwischen Datum und Variable */}
          <select
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full"
            value={isVariable ? 'variable' : 'date'}
            onChange={(e) => {
              if (e.target.value === 'variable') {
                onChange('__TODAY__');
              } else {
                onChange('');
              }
            }}
          >
            <option value="date">Datum wählen</option>
            <option value="variable">Aktueller Tag</option>
          </select>
          
          {/* Datum-Input nur anzeigen wenn nicht Variable */}
          {!isVariable && (
            <input
              type="date"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={value as string || ''}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
          
          {/* Variable-Anzeige */}
          {isVariable && (
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-blue-700 dark:text-blue-300 text-sm">
              📅 Aktueller Tag (dynamisch)
            </div>
          )}
        </div>
      );
    }
    
    // Standard-Texteingabe für alle anderen Felder
    return (
      <input
        type="text"
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full"
        value={value as string || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filterwert eingeben..."
      />
    );
  };
  
  return (
    <div className="flex items-center space-x-2 mb-2">
      {/* Spalten-Auswahl */}
      <div className="w-1/3">
        <select
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full"
          value={condition.column}
          onChange={(e) => onChange({ 
            ...condition, 
            column: e.target.value, 
            operator: operators[0]?.value || 'equals',
            value: null  // ✅ VALUE ZURÜCKSETZEN beim Spaltenwechsel
          })}
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
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full"
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
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 rounded-md"
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
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500 rounded-md"
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