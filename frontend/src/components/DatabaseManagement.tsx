import React, { useState, useEffect } from 'react';
import { 
  TrashIcon, 
  ExclamationTriangleIcon, 
  LockClosedIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth.tsx';

interface ResetableTable {
  name: string;
  displayName: string;
  description: string;
  hasSeed: boolean;
  danger: 'low' | 'medium' | 'high';
}

interface DatabaseLog {
  timestamp: string;
  operation: string;
  userId: string;
  status: 'start' | 'success' | 'error';
  error?: string;
}

const DatabaseManagement: React.FC = () => {
  const { user } = useAuth();
  const [tables, setTables] = useState<ResetableTable[]>([]);
  const [logs, setLogs] = useState<DatabaseLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  
  // State für einzelne Tabellen-Resets
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tablePassword, setTablePassword] = useState('');
  const [showTableConfirm, setShowTableConfirm] = useState(false);
  const [tableCountdown, setTableCountdown] = useState(0);

  useEffect(() => {
    loadTables();
    loadLogs();
  }, []);

  // Countdown-Timer für Table Reset
  useEffect(() => {
    if (tableCountdown > 0) {
      const timer = setTimeout(() => setTableCountdown(tableCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [tableCountdown]);

  const loadTables = async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.DATABASE.TABLES);
      setTables(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Tabellen:', error);
      toast.error('Fehler beim Laden der verfügbaren Tabellen');
    }
  };

  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      const response = await axiosInstance.get(API_ENDPOINTS.DATABASE.LOGS);
      setLogs(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleTableReset = (tableName: string) => {
    setSelectedTable(tableName);
    setShowTableConfirm(true);
    setTableCountdown(5); // 5 Sekunden Bedenkzeit
  };

  const confirmTableReset = async () => {
    if (!selectedTable || !tablePassword) {
      toast.error('Passwort ist erforderlich');
      return;
    }

    if (tableCountdown > 0) {
      toast.error(`Bitte warten Sie noch ${tableCountdown} Sekunden`);
      return;
    }

    try {
      setLoading(true);
      await axiosInstance.post(API_ENDPOINTS.DATABASE.RESET_TABLE, {
        tableName: selectedTable,
        adminPassword: tablePassword
      });
      
      toast.success(`Tabelle ${selectedTable} wurde erfolgreich zurückgesetzt und mit Seed-Daten befüllt`);
      setShowTableConfirm(false);
      setSelectedTable(null);
      setTablePassword('');
      loadLogs(); // Logs neu laden
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler beim Zurücksetzen der Tabelle');
    } finally {
      setLoading(false);
    }
  };

  const cancelTableReset = () => {
    setShowTableConfirm(false);
    setSelectedTable(null);
    setTablePassword('');
    setTableCountdown(0);
  };

  const getDangerColor = (danger: string) => {
    switch (danger) {
      case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-700';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/20 dark:border-orange-700';
      case 'high': return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-700';
      default: return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-700 dark:border-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'start': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (!user || !user.roles.some(r => r.role.name === 'Admin')) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
        <p className="text-red-800 dark:text-red-200 font-medium">
          Keine Berechtigung
        </p>
        <p className="text-red-600 dark:text-red-400 text-sm mt-2">
          Diese Funktionen sind nur für Administratoren verfügbar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* WARNUNG */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mr-3 mt-1" />
          <div>
            <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              ⚠️ ACHTUNG: Tabellen zurücksetzen
            </h3>
            <ul className="text-yellow-700 dark:text-yellow-300 text-sm space-y-1">
              <li>• Diese Funktionen löschen alle Daten aus den gewählten Tabellen</li>
              <li>• Standard-Daten werden automatisch durch Seed-Dateien wiederhergestellt</li>
              <li>• Nur Tabellen mit Seed-Daten können zurückgesetzt werden</li>
              <li>• Alle Operationen werden protokolliert</li>
            </ul>
          </div>
        </div>
      </div>

      {/* TABELLEN-RESET */}
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <TrashIcon className="h-5 w-5 mr-2" />
          Tabellen mit Seed-Daten zurücksetzen
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => (
            <div
              key={table.name}
              className={`border rounded-lg p-4 ${getDangerColor(table.danger)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{table.displayName}</h4>
                <span className={`text-xs px-2 py-1 rounded ${
                  table.danger === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' :
                  table.danger === 'medium' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300' :
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                }`}>
                  {table.danger === 'high' ? 'Hoch' : 
                   table.danger === 'medium' ? 'Mittel' : 'Niedrig'}
                </span>
              </div>
              
              <p className="text-sm mb-3">{table.description}</p>
              
              <div className="flex items-center text-sm mb-3">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                Seed-Daten werden wiederhergestellt
              </div>
              
              <button
                onClick={() => handleTableReset(table.name)}
                disabled={loading}
                className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                Zurücksetzen & neu befüllen
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* LOGS */}
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Database-Operationen (Audit-Log)
          </h3>
          <button
            onClick={loadLogs}
            disabled={logsLoading}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Aktualisieren
          </button>
        </div>
        
        {logsLoading ? (
          <div className="text-center py-4">Lade Logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">Keine Logs verfügbar</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded text-sm"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-gray-500 dark:text-gray-400">
                    {new Date(log.timestamp).toLocaleString('de-DE')}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">{log.operation}</span>
                  <span className={`font-medium ${getStatusColor(log.status)}`}>
                    {log.status === 'success' ? '✓' : log.status === 'error' ? '✗' : '•'} {log.status}
                  </span>
                </div>
                {log.error && (
                  <span className="text-red-600 dark:text-red-400 text-xs max-w-xs truncate">
                    {log.error}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TABLE RESET MODAL */}
      {showTableConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Tabelle zurücksetzen bestätigen
              </h3>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                Sie sind dabei, die Tabelle <strong>{tables.find(t => t.name === selectedTable)?.displayName}</strong> zurückzusetzen.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Alle Daten werden gelöscht und durch Seed-Daten ersetzt.
              </p>
              
              {tableCountdown > 0 && (
                <div className="flex items-center text-orange-600 dark:text-orange-400 mb-3">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  Bedenkzeit: {tableCountdown} Sekunden
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <LockClosedIcon className="h-4 w-4 inline mr-1" />
                Admin-Passwort zur Bestätigung:
              </label>
              <input
                type="password"
                value={tablePassword}
                onChange={(e) => setTablePassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                placeholder="Ihr Admin-Passwort"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={confirmTableReset}
                disabled={loading || tableCountdown > 0 || !tablePassword}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Wird zurückgesetzt...' : 'Bestätigen'}
              </button>
              <button
                onClick={cancelTableReset}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseManagement; 