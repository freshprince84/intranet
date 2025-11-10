import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrashIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
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

const getOperatorsByColumnType = (columnId: string, t: (key: string) => string): { value: string; label: string }[] => {
  // Standard-Text-Operatoren
  const textOperators = [
    { value: 'equals', label: t('filter.operators.equals') },
    { value: 'contains', label: t('filter.operators.contains') },
    { value: 'startsWith', label: t('filter.operators.startsWith') },
    { value: 'endsWith', label: t('filter.operators.endsWith') }
  ];

  // Datum-Operatoren (benutzerfreundliche Labels)
  const dateOperators = [
    { value: 'equals', label: t('filter.operators.isExactly') },
    { value: 'after', label: t('filter.operators.after') },
    { value: 'before', label: t('filter.operators.before') },
    { value: 'between', label: t('filter.operators.between') }
  ];

  // Dauer-Operatoren (für Zeitspannen)
  const durationOperators = [
    { value: 'equals', label: t('filter.operators.isEqual') },
    { value: 'greater_than', label: t('filter.operators.greaterThan') },
    { value: 'less_than', label: t('filter.operators.lessThan') }
  ];

  // Status-Operatoren (für Enum-Werte)
  const statusOperators = [
    { value: 'equals', label: t('filter.operators.equals') },
    { value: 'notEquals', label: t('filter.operators.notEquals') }
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
  const { t } = useTranslation();
  const [operators, setOperators] = useState<{ value: string; label: string }[]>([]);
  // States für Benutzer und Rollen
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  
  // Operatoren aktualisieren, wenn sich die Spalte ändert
  useEffect(() => {
    setOperators(getOperatorsByColumnType(condition.column, t));
  }, [condition.column, t]);
  
  // Laden der Benutzer und Rollen, wenn benötigt
  useEffect(() => {
    const loadUsersAndRoles = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      if (condition.column === 'responsible' || condition.column === 'qualityControl' || condition.column === 'responsibleAndQualityControl') {
        // Benutzer laden (nur aktive Benutzer)
        setLoadingUsers(true);
        try {
          const response = await axiosInstance.get('/users/dropdown');
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
      const isInvoiceTable = columns.some(col => col.id === 'client') && !columns.some(col => col.id === 'responsible');
      
      if (isRequestTable) {
        // Request-Status-Optionen
        return (
          <select
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">{t('filter.row.pleaseSelect')}</option>
            <option value="approval">{t('filter.row.status.approval')}</option>
            <option value="approved">{t('filter.row.status.approved')}</option>
            <option value="to_improve">{t('filter.row.status.to_improve')}</option>
            <option value="denied">{t('filter.row.status.denied')}</option>
          </select>
        );
      } else if (isTaskTable) {
        // Task-Status-Optionen
        return (
          <select
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">{t('filter.row.pleaseSelect')}</option>
            <option value="open">{t('filter.row.status.open')}</option>
            <option value="in_progress">{t('filter.row.status.in_progress')}</option>
            <option value="improval">{t('filter.row.status.improval')}</option>
            <option value="quality_control">{t('filter.row.status.quality_control')}</option>
            <option value="done">{t('filter.row.status.done')}</option>
          </select>
        );
      } else if (isInvoiceTable) {
        // Invoice-Status-Optionen
        return (
          <select
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">{t('filter.row.pleaseSelect')}</option>
            <option value="DRAFT">{t('filter.row.status.draft')}</option>
            <option value="SENT">{t('filter.row.status.sent')}</option>
            <option value="PAID">{t('filter.row.status.paid')}</option>
            <option value="OVERDUE">{t('filter.row.status.overdue')}</option>
            <option value="CANCELLED">{t('filter.row.status.cancelled')}</option>
          </select>
        );
      } else {
        // Fallback für andere Tabellen mit Status
        return (
          <select
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">{t('filter.row.pleaseSelect')}</option>
            <option value="open">{t('filter.row.status.open')}</option>
            <option value="in_progress">{t('filter.row.status.in_progress')}</option>
            <option value="done">{t('filter.row.status.done')}</option>
          </select>
        );
      }
    }
    
    // Für Verantwortlicher ein Dropdown mit Benutzern und Rollen rendern
    if (columnId === 'responsible' || columnId === 'responsibleAndQualityControl') {
      return (
        <select
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={loadingUsers || loadingRoles}
        >
            <option value="">{t('filter.row.pleaseSelect')}</option>
          
          {users.length > 0 && (
            <optgroup label={t('filter.row.groups.users')}>
              {users.map(user => (
                <option key={`user-${user.id}`} value={`user-${user.id}`}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </optgroup>
          )}
          
          {roles.length > 0 && (
            <optgroup label={t('filter.row.groups.roles')}>
              {roles.map(role => (
                <option key={`role-${role.id}`} value={`role-${role.id}`}>
                  {role.name}
                </option>
              ))}
            </optgroup>
          )}
          
          {(loadingUsers || loadingRoles) && (
            <option value="" disabled>{t('filter.row.loadingData')}</option>
          )}
        </select>
      );
    }
    
    // Für Qualitätskontrolle ein Dropdown nur mit Benutzern rendern
    if (columnId === 'qualityControl') {
      return (
        <select
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={loadingUsers}
        >
            <option value="">{t('filter.row.pleaseSelect')}</option>
          
          {users.length > 0 && (
            <optgroup label={t('filter.row.groups.users')}>
              {users.map(user => (
                <option key={`user-${user.id}`} value={`user-${user.id}`}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </optgroup>
          )}
          
          {loadingUsers && (
            <option value="" disabled>{t('filter.row.loadingUsers')}</option>
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
            <option value="date">{t('filter.row.selectDate')}</option>
            <option value="variable">{t('filter.row.currentDay')}</option>
          </select>
          
          {/* Datum-Input nur anzeigen wenn nicht Variable */}
          {!isVariable && (
            <input
              type="date"
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={value as string || ''}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
          
          {/* Variable-Anzeige */}
          {isVariable && (
            <div className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-blue-700 dark:text-blue-300 text-xs">
              📅 {t('filter.row.dynamicDay')}
            </div>
          )}
        </div>
      );
    }
    
    // Standard-Texteingabe für alle anderen Felder
    return (
      <input
        type="text"
        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full"
        value={value as string || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('filter.row.enterValue')}
      />
    );
  };
  
  return (
    <div className="flex items-center space-x-2 mb-0">
      {/* Spalten-Auswahl */}
      <div className="w-1/3">
        <select
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full"
          value={condition.column}
          onChange={(e) => onChange({ 
            ...condition, 
            column: e.target.value, 
            operator: operators[0]?.value || 'equals',
            value: null  // ✅ VALUE ZURÜCKSETZEN beim Spaltenwechsel
          })}
        >
          <option value="">{t('filter.row.selectColumn')}</option>
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
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full"
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
      <div className="flex gap-1">
        {/* Löschen-Button (nicht für die erste Zeile, wenn sie die einzige ist) */}
        <button
          type="button"
          onClick={onDelete}
          className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 rounded-md transition-colors"
          disabled={isFirst && !isLast}
          title={t('filter.row.removeCondition')}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
        
        {/* Hinzufügen-Button (nur in der letzten Zeile) */}
        {isLast && (
          <button
            type="button"
            onClick={onAdd}
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500 rounded-md transition-colors"
            title={t('filter.row.addCondition')}
          >
            <PlusCircleIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterRow; 