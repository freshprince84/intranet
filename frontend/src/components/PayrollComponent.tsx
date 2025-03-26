import React, { useState, useEffect } from 'react';
import axiosInstance from '../config/axios.ts';

interface Hours {
  regular: number;
  overtime: number;
  night: number;
  holidayHours: number;
  sundayHoliday: number;
  overtimeNight: number;
  overtimeSundayHoliday: number;
  overtimeNightSundayHoliday: number;
}

interface Payroll {
  id: number;
  userId: number;
  periodStart: string;
  periodEnd: string;
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  holidayHours: number;
  sundayHolidayHours: number;
  overtimeNightHours: number;
  overtimeSundayHolidayHours: number;
  overtimeNightSundayHolidayHours: number;
  hourlyRate: number;
  grossPay: number;
  socialSecurity: number;
  taxes: number;
  netPay: number;
  currency: string;
  user: {
    firstName: string;
    lastName: string;
    payrollCountry: string;
    contractType: string | null;
  };
}

const PayrollComponent: React.FC = () => {
  const [hours, setHours] = useState<Hours>({
    regular: 0,
    overtime: 0,
    night: 0,
    holidayHours: 0,
    sundayHoliday: 0,
    overtimeNight: 0,
    overtimeSundayHoliday: 0,
    overtimeNightSundayHoliday: 0
  });
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [users, setUsers] = useState<{ id: number; firstName: string; lastName: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Benutzer laden
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axiosInstance.get('/users');
        setUsers(response.data);
      } catch (error) {
        console.error('Fehler beim Laden der Benutzer:', error);
        setError('Benutzer konnten nicht geladen werden');
      }
    };
    
    fetchUsers();
  }, []);

  // Bestehende Abrechnungen laden, wenn ein Benutzer ausgewählt wird
  useEffect(() => {
    if (selectedUser) {
      fetchPayrolls();
    }
  }, [selectedUser]);

  const fetchPayrolls = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/payroll?userId=${selectedUser}`);
      setPayrolls(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Abrechnungen:', error);
      setError('Abrechnungen konnten nicht geladen werden');
      setLoading(false);
    }
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = Number(e.target.value);
    setSelectedUser(userId);
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof Hours) => {
    const value = Math.max(0, Number(e.target.value)); // Keine negativen Werte
    setHours({ ...hours, [field]: value });
  };

  const saveHours = async () => {
    if (!selectedUser) {
      setError('Bitte wählen Sie zuerst einen Benutzer aus');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axiosInstance.post(`/payroll/hours`, {
        userId: selectedUser,
        hours
      });
      
      // Automatisch berechnen
      const calculatedPayroll = await axiosInstance.get(`/payroll/calculate?payrollId=${response.data.id}`);
      setPayroll(calculatedPayroll.data);
      
      // Liste aktualisieren
      fetchPayrolls();
      
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Speichern der Stunden:', error);
      setError('Stunden konnten nicht gespeichert werden');
      setLoading(false);
    }
  };

  const selectPayroll = async (payrollId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axiosInstance.get(`/payroll/calculate?payrollId=${payrollId}`);
      setPayroll(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Abrechnung:', error);
      setError('Abrechnung konnte nicht geladen werden');
      setLoading(false);
    }
  };

  const generatePDF = async (payrollId: number) => {
    try {
      window.open(`${window.location.origin}/api/payroll/pdf/${payrollId}`, '_blank');
    } catch (error) {
      console.error('Fehler beim Generieren des PDFs:', error);
      setError('PDF konnte nicht generiert werden');
    }
  };

  return (
    <div className="p-6 dark:bg-gray-800">
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Mitarbeiter auswählen
        </label>
        <select 
          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-2 w-full"
          value={selectedUser || ''}
          onChange={handleUserChange}
        >
          <option value="">-- Bitte auswählen --</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>
              {user.firstName} {user.lastName}
            </option>
          ))}
        </select>
      </div>
      
      {selectedUser && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Arbeitsstunden erfassen</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reguläre Stunden
                </label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.5"
                  className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-2 w-full"
                  value={hours.regular}
                  onChange={(e) => handleHoursChange(e, 'regular')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Überstunden
                </label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.5"
                  className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-2 w-full"
                  value={hours.overtime}
                  onChange={(e) => handleHoursChange(e, 'overtime')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nachtstunden
                </label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.5"
                  className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-2 w-full"
                  value={hours.night}
                  onChange={(e) => handleHoursChange(e, 'night')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Feiertagsstunden
                </label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.5"
                  className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-2 w-full"
                  value={hours.holidayHours}
                  onChange={(e) => handleHoursChange(e, 'holidayHours')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sonntagsstunden
                </label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.5"
                  className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-2 w-full"
                  value={hours.sundayHoliday}
                  onChange={(e) => handleHoursChange(e, 'sundayHoliday')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Überstunden (Nacht)
                </label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.5"
                  className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-2 w-full"
                  value={hours.overtimeNight}
                  onChange={(e) => handleHoursChange(e, 'overtimeNight')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Überstunden (Sonn-/Feiertag)
                </label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.5"
                  className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-2 w-full"
                  value={hours.overtimeSundayHoliday}
                  onChange={(e) => handleHoursChange(e, 'overtimeSundayHoliday')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Überstunden (Nacht an Sonn-/Feiertag)
                </label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.5"
                  className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-2 w-full"
                  value={hours.overtimeNightSundayHoliday}
                  onChange={(e) => handleHoursChange(e, 'overtimeNightSundayHoliday')}
                />
              </div>
            </div>
            
            <button
              className="mt-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
              onClick={saveHours}
              disabled={loading}
            >
              {loading ? 'Wird gespeichert...' : 'Stunden speichern und berechnen'}
            </button>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Vorherige Abrechnungen</h2>
            {payrolls.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">Keine Abrechnungen vorhanden</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Zeitraum</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Brutto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Netto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {payrolls.map(payroll => (
                      <tr key={payroll.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {new Date(payroll.periodStart).toLocaleDateString()} - {new Date(payroll.periodEnd).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {Number(payroll.grossPay).toFixed(2)} {payroll.currency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {Number(payroll.netPay).toFixed(2)} {payroll.currency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                            onClick={() => selectPayroll(payroll.id)}
                          >
                            Ansehen
                          </button>
                          <button 
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            onClick={() => generatePDF(payroll.id)}
                          >
                            PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {payroll && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
              <h2 className="text-xl font-semibold mb-6 dark:text-white">Gehaltsabrechnung</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4 dark:text-gray-300">Mitarbeiterinformationen</h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    <span className="font-medium">Name:</span> {payroll.user.firstName} {payroll.user.lastName}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    <span className="font-medium">Land:</span> {payroll.user.payrollCountry}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    <span className="font-medium">Vertragstyp:</span> {formatContractType(payroll.user.contractType || '')}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    <span className="font-medium">Stundensatz:</span> {payroll.hourlyRate.toFixed(2)} {payroll.currency}/h
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4 dark:text-gray-300">Abrechnungszeitraum</h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    <span className="font-medium">Von:</span> {new Date(payroll.periodStart).toLocaleDateString()}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    <span className="font-medium">Bis:</span> {new Date(payroll.periodEnd).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4 dark:text-gray-300">Arbeitsstunden</h3>
                <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stundentyp</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stunden</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">Reguläre Stunden</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{payroll.regularHours}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">Überstunden</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{payroll.overtimeHours}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">Nachtstunden</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{payroll.nightHours}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">Feiertagsstunden</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{payroll.holidayHours}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">Sonntagsstunden</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{payroll.sundayHolidayHours}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">Überstunden (Nacht)</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{payroll.overtimeNightHours}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">Überstunden (Sonn-/Feiertag)</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{payroll.overtimeSundayHolidayHours}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">Überstunden (Nacht an Sonn-/Feiertag)</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{payroll.overtimeNightSundayHolidayHours}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4 dark:text-gray-300">Abrechnung</h3>
                <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-700 dark:text-gray-300">Bruttolohn:</span>
                    <span className="text-gray-900 dark:text-gray-200 font-medium">{Number(payroll.grossPay).toFixed(2)} {payroll.currency}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-700 dark:text-gray-300">Sozialversicherungsbeiträge:</span>
                    <span className="text-red-600 dark:text-red-400">-{Number(payroll.socialSecurity).toFixed(2)} {payroll.currency}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-700 dark:text-gray-300">Steuern:</span>
                    <span className="text-red-600 dark:text-red-400">-{Number(payroll.taxes).toFixed(2)} {payroll.currency}</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-900 dark:text-white font-medium">Nettolohn:</span>
                      <span className="text-green-600 dark:text-green-400 font-bold">{Number(payroll.netPay).toFixed(2)} {payroll.currency}</span>
                    </div>
                  </div>
                </div>
                
                <button
                  className="mt-6 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white font-medium py-2 px-4 rounded"
                  onClick={() => generatePDF(payroll.id)}
                >
                  Als PDF herunterladen
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Hilfsfunktion zum Formatieren der Vertragsart
function formatContractType(contractType: string): string {
  switch (contractType) {
    case 'tiempo_completo': return 'Tiempo Completo (>21 Tage/Monat)';
    case 'tiempo_parcial_7': return 'Tiempo Parcial (≤7 Tage/Monat)';
    case 'tiempo_parcial_14': return 'Tiempo Parcial (≤14 Tage/Monat)';
    case 'tiempo_parcial_21': return 'Tiempo Parcial (≤21 Tage/Monat)';
    case 'servicios_externos': return 'Servicios Externos (Stundenbasiert)';
    default: return contractType;
  }
}

export default PayrollComponent; 