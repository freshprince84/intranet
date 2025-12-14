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

interface Branch {
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

  // Dauer-Operatoren (für Zeitspannen und Zahlen)
  const durationOperators = [
    { value: 'equals', label: t('filter.operators.isEqual') },
    { value: 'greaterThan', label: t('filter.operators.greaterThan') },
    { value: 'lessThan', label: t('filter.operators.lessThan') }
  ];

  // Status-Operatoren (für Enum-Werte)
  const statusOperators = [
    { value: 'equals', label: t('filter.operators.equals') },
    { value: 'notEquals', label: t('filter.operators.notEquals') }
  ];

  // Je nach Spaltentyp entsprechende Operatoren zurückgeben
  if (columnId === 'dueDate' || columnId === 'startTime' || columnId === 'checkInDate' || columnId === 'checkOutDate' || columnId === 'arrivalTime' || columnId === 'time') {
    return dateOperators;
  } else if (columnId === 'duration' || columnId === 'amount') {
    return durationOperators;
  } else if (columnId === 'status' || columnId === 'paymentStatus' || columnId === 'roomNumber' || columnId === 'type' || columnId === 'branch') {
    // ✅ FIX: roomNumber, type und branch nur = und != (wie Status)
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
  // States für Benutzer, Rollen und Branches
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roomNumbers, setRoomNumbers] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingRoomNumbers, setLoadingRoomNumbers] = useState(false);
  
  // Operatoren aktualisieren, wenn sich die Spalte ändert
  useEffect(() => {
    setOperators(getOperatorsByColumnType(condition.column, t));
  }, [condition.column, t]);
  
  // Laden der Benutzer, Rollen und Branches, wenn benötigt
  useEffect(() => {
    const loadUsersAndRoles = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // WICHTIG: requestedBy, responsible, qualityControl und responsibleAndQualityControl benötigen Dropdowns
      if (condition.column === 'requestedBy' || condition.column === 'responsible' || condition.column === 'qualityControl' || condition.column === 'responsibleAndQualityControl') {
        // Benutzer laden (nur aktive Benutzer)
        setLoadingUsers(true);
        try {
          const response = await axiosInstance.get('/users/dropdown');
          setUsers(response.data);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
          console.error('Fehler beim Laden der Benutzer:', error);
          }
        } finally {
          setLoadingUsers(false);
        }
        
        // Tabellen-Typ erkennen (wie bei Status-Dropdown)
        const isRequestTable = columns.some(col => col.id === 'requestedBy' || col.id === 'createTodo');
        const isTaskTable = columns.some(col => col.id === 'responsible' || col.id === 'qualityControl');
        
        // Rollen laden NUR für Tasks, NICHT für Requests
        // requestedBy: NUR bei Tasks (aber Tasks haben kein requestedBy, also nie)
        // responsible: NUR bei Tasks
        // responsibleAndQualityControl: NUR bei Tasks
        if ((condition.column === 'responsible' || condition.column === 'responsibleAndQualityControl') && isTaskTable) {
          setLoadingRoles(true);
          try {
            const response = await axiosInstance.get('/roles');
            setRoles(response.data);
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
            console.error('Fehler beim Laden der Rollen:', error);
            }
          } finally {
            setLoadingRoles(false);
          }
        }
      }
      
      // Branches laden für branch-Spalte
      if (condition.column === 'branch') {
        setLoadingBranches(true);
        try {
          const response = await axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE);
          setBranches(response.data);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
          console.error('Fehler beim Laden der Branches:', error);
          }
        } finally {
          setLoadingBranches(false);
        }
      }
      
      // ✅ FIX: Zimmernamen laden für roomNumber-Spalte (Zimmername aus roomDescription für Dorms, roomNumber für Privates)
      if (condition.column === 'roomNumber') {
        setLoadingRoomNumbers(true);
        try {
          // Hole alle Reservations und extrahiere eindeutige Zimmernamen
          // Dorms: roomDescription = Zimmername, roomNumber = Bettnummer
          // Privates: roomNumber = Zimmername, roomDescription = optional
          const response = await axiosInstance.get(API_ENDPOINTS.RESERVATION.BASE);
          const reservations = response.data?.data || response.data || [];
          
          // Kombiniere roomDescription (Dorms) und roomNumber (Privates) zu Zimmernamen
          const roomNames = new Set<string>();
          reservations.forEach((r: any) => {
            // Für Dorms: roomDescription enthält Zimmername
            if (r.roomDescription && r.roomDescription.trim() !== '') {
              roomNames.add(r.roomDescription.trim());
            }
            // Für Privates: roomNumber enthält Zimmername (nur wenn nicht "Cama" - dann ist es Bettnummer)
            if (r.roomNumber && r.roomNumber.trim() !== '' && !r.roomNumber.toLowerCase().startsWith('cama')) {
              roomNames.add(r.roomNumber.trim());
            }
          });
          
          const uniqueRoomNames = Array.from(roomNames).sort();
          setRoomNumbers(uniqueRoomNames);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
          console.error('Fehler beim Laden der Zimmernamen:', error);
          }
        } finally {
          setLoadingRoomNumbers(false);
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
      const isReservationTable = columns.some(col => col.id === 'checkInDate' || col.id === 'checkOutDate' || col.id === 'roomNumber');
      
      if (isReservationTable) {
        // ✅ Reservation-Status-Optionen
        return (
          <select
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">{t('filter.row.pleaseSelect')}</option>
            <option value="potential">{t('reservations.status.potential', 'Potenzielle Reservierung')}</option>
            <option value="confirmed">{t('reservations.status.confirmed', 'Bestätigt')}</option>
            <option value="notification_sent">{t('reservations.status.notification_sent', 'Benachrichtigung gesendet')}</option>
            <option value="checked_in">{t('reservations.status.checked_in', 'Eingecheckt')}</option>
            <option value="checked_out">{t('reservations.status.checked_out', 'Ausgecheckt')}</option>
            <option value="cancelled">{t('reservations.status.cancelled', 'Storniert')}</option>
            <option value="no_show">{t('reservations.status.no_show', 'Nicht erschienen')}</option>
          </select>
        );
      } else if (isRequestTable) {
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
    
    // Für requestedBy, responsible und responsibleAndQualityControl ein Dropdown mit Benutzern und Rollen rendern
    // WICHTIG: Diese Spalten müssen IMMER Dropdowns verwenden, keine Text-Eingabe
    if (columnId === 'requestedBy' || columnId === 'responsible' || columnId === 'responsibleAndQualityControl') {
      // Tabellen-Typ erkennen (wie bei Status-Dropdown)
      const isRequestTable = columns.some(col => col.id === 'requestedBy' || col.id === 'createTodo');
      const isTaskTable = columns.some(col => col.id === 'responsible' || col.id === 'qualityControl');
      
      // Bestimme ob Rollen angezeigt werden sollen
      // requestedBy: Nur Users (bei Requests, keine Rollen)
      // responsible: Users + Roles (bei Tasks), nur Users (bei Requests)
      // responsibleAndQualityControl: Users + Roles (bei Tasks)
      const showRoles = (columnId === 'responsible' || columnId === 'responsibleAndQualityControl') && isTaskTable;
      
      return (
        <select
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={loadingUsers || (showRoles && loadingRoles)}
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
          
          {showRoles && roles.length > 0 && (
            <optgroup label={t('filter.row.groups.roles')}>
              {roles.map(role => (
                <option key={`role-${role.id}`} value={`role-${role.id}`}>
                  {role.name}
                </option>
              ))}
            </optgroup>
          )}
          
          {(loadingUsers || (showRoles && loadingRoles)) && (
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
    
    // Für Typ ein Dropdown rendern (nur für Requests)
    if (columnId === 'type') {
      const isRequestTable = columns.some(col => col.id === 'requestedBy' || col.id === 'createTodo');
      if (isRequestTable) {
        return (
          <select
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">{t('filter.row.pleaseSelect')}</option>
            <option value="event">{t('requests.types.event')}</option>
            <option value="repair">{t('requests.types.repair')}</option>
            <option value="improvement_suggestion">{t('requests.types.improvement_suggestion')}</option>
            <option value="buy_order">{t('requests.types.buy_order')}</option>
            <option value="employment_certificate">{t('requests.types.employment_certificate')}</option>
            <option value="vacation">{t('requests.types.vacation')}</option>
            <option value="permit">{t('requests.types.permit')}</option>
            <option value="sick_leave">{t('requests.types.sick_leave')}</option>
            <option value="other">{t('requests.types.other')}</option>
          </select>
        );
      }
    }
    
    // ✅ NEU: Für PaymentStatus ein Dropdown rendern (nur bei Reservations)
    if (columnId === 'paymentStatus') {
      const isReservationTable = columns.some(col => col.id === 'checkInDate' || col.id === 'checkOutDate' || col.id === 'roomNumber');
      if (isReservationTable) {
        return (
          <select
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">{t('filter.row.pleaseSelect')}</option>
            <option value="pending">{t('reservations.paymentStatus.pending', 'Ausstehend')}</option>
            <option value="paid">{t('reservations.paymentStatus.paid', 'Bezahlt')}</option>
            <option value="partially_paid">{t('reservations.paymentStatus.partially_paid', 'Teilweise bezahlt')}</option>
            <option value="refunded">{t('reservations.paymentStatus.refunded', 'Erstattet')}</option>
          </select>
        );
      }
    }
    
    // ✅ NEU: Für roomNumber ein Dropdown rendern (nur bei Reservations, nur = und !=)
    if (columnId === 'roomNumber') {
      const isReservationTable = columns.some(col => col.id === 'checkInDate' || col.id === 'checkOutDate' || col.id === 'roomNumber');
      if (isReservationTable) {
        return (
          <select
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={loadingRoomNumbers}
          >
            <option value="">{t('filter.row.pleaseSelect')}</option>
            {roomNumbers.length > 0 && (
              roomNumbers.map(roomNumber => (
                <option key={roomNumber} value={roomNumber}>
                  {roomNumber}
                </option>
              ))
            )}
            {loadingRoomNumbers && (
              <option value="" disabled>{t('filter.row.loadingData')}</option>
            )}
          </select>
        );
      }
    }
    
    // Für Branch ein Dropdown rendern
    if (columnId === 'branch') {
      return (
        <select
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={loadingBranches}
        >
          <option value="">{t('filter.row.pleaseSelect')}</option>
          {branches.length > 0 && (
            branches.map(branch => (
              <option key={branch.id} value={branch.name}>
                {branch.name}
              </option>
            ))
          )}
          {loadingBranches && (
            <option value="" disabled>{t('filter.row.loadingData')}</option>
          )}
        </select>
      );
    }
    
    // Für Datumsfelder ein Datumseingabefeld rendern
    if (columnId === 'dueDate' || columnId === 'startTime' || columnId === 'checkInDate' || columnId === 'checkOutDate' || columnId === 'arrivalTime' || columnId === 'time') {
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
    <div className="flex items-center gap-2">
      {/* Spalten-Auswahl - feste Breite */}
      <div className="w-[180px] flex-shrink-0">
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
      
      {/* Operator-Auswahl - feste Breite */}
      <div className="w-[140px] flex-shrink-0">
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
      
      {/* Wert-Eingabe - flexibel */}
      <div className="flex-1 min-w-0">
        {renderValueInput(
          condition.column, 
          condition.operator, 
          condition.value, 
          (value) => onChange({ ...condition, value })
        )}
      </div>
      
      
      {/* Aktions-Buttons - feste Breite mit Platzhalter */}
      <div className="w-[60px] flex-shrink-0 flex gap-1 justify-end">
        {/* Löschen-Button */}
        <div className="relative group">
          <button
            type="button"
            onClick={onDelete}
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={isFirst && !isLast}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
            {t('filter.row.removeCondition')}
          </div>
        </div>
        
        {/* Hinzufügen-Button oder Platzhalter */}
        {isLast ? (
          <div className="relative group">
            <button
              type="button"
              onClick={onAdd}
              className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500 rounded-md transition-colors"
            >
              <PlusCircleIcon className="h-4 w-4" />
            </button>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
              {t('filter.row.addCondition')}
            </div>
          </div>
        ) : (
          <div className="w-[28px] flex-shrink-0" /> // Platzhalter für vertikale Bündigkeit
        )}
      </div>
    </div>
  );
};

export default FilterRow; 