import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../config/api.ts';

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
          const response = await axios.get(
            `${API_URL}${API_ENDPOINTS.USERS.BASE}`,
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
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
            const response = await axios.get(
              `${API_URL}${API_ENDPOINTS.ROLES.BASE}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            );
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
            className="px-3 py-2 border rounded-md w-full"
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
      } else {
        // Fallback für andere Tabellen mit Status
        return (
          <select
            className="px-3 py-2 border rounded-md w-full"
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
          className="px-3 py-2 border rounded-md w-full"
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
          className="px-3 py-2 border rounded-md w-full"
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