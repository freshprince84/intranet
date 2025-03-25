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
    <div className="p-6">
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Mitarbeiter auswählen
        </label>
        <select 
          className="border border-gray-300 rounded-md p-2 w-full"
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
            <h2 className="text-xl font-semibold mb-4">Arbeitsstunden erfassen</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reguläre Stunden
                </label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.5"
                  className="border border-gray-300 rounded-md p-2 w-full"
                  value={hours.regular}
                  onChange={(e) => handleHoursChange(e, 'regular')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Überstunden
                </label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.5"
                  className="border border-gray-300 rounded-md p-2 w-full"
                  value={hours.overtime}
                  onChange={(e) => handleHoursChange(e, 'overtime')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nachtstunden
                </label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.5"
                  className="border border-gray-300 rounded-md p-2 w-full"
                  value={hours.night}
                  onChange={(e) => handleHoursChange(e, 'night')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feiertagsstunden
                </label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.5"
                  className="border border-gray-300 rounded-md p-2 w-full"
                  value={hours.holidayHours}
                  onChange={(e) => handleHoursChange(e, 'holidayHours')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sonntagsstunden
                </label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.5"
                  className="border border-gray-300 rounded-md p-2 w-full"
                  value={hours.sundayHoliday}
                  onChange={(e) => handleHoursChange(e, 'sundayHoliday')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nachtüberstunden
                </label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.5"
                  className="border border-gray-300 rounded-md p-2 w-full"
                  value={hours.overtimeNight}
                  onChange={(e) => handleHoursChange(e, 'overtimeNight')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sonntags-/Feiertagsüberstunden
                </label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.5"
                  className="border border-gray-300 rounded-md p-2 w-full"
                  value={hours.overtimeSundayHoliday}
                  onChange={(e) => handleHoursChange(e, 'overtimeSundayHoliday')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nacht-Sonntags-/Feiertagsüberstunden
                </label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.5"
                  className="border border-gray-300 rounded-md p-2 w-full"
                  value={hours.overtimeNightSundayHoliday}
                  onChange={(e) => handleHoursChange(e, 'overtimeNightSundayHoliday')}
                />
              </div>
            </div>
            
            <button 
              className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
              onClick={saveHours}
              disabled={loading}
            >
              {loading ? 'Wird gespeichert...' : 'Stunden speichern und berechnen'}
            </button>
          </div>
          
          {payrolls.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Bestehende Abrechnungen</h2>
              <div className="overflow-x-auto mobile-table-container">
                <table className="min-w-full divide-y divide-gray-200 payroll-table">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <span className="hidden sm:inline">Zeitraum</span>
                        <span className="inline sm:hidden">Zeitr.</span>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <span className="hidden sm:inline">Gesamt Stunden</span>
                        <span className="inline sm:hidden">Std.</span>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <span className="hidden sm:inline">Bruttolohn</span>
                        <span className="inline sm:hidden">Brutto</span>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <span className="hidden sm:inline">Nettolohn</span>
                        <span className="inline sm:hidden">Netto</span>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <span className="hidden sm:inline">Aktionen</span>
                        <span className="inline sm:hidden">Akt.</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payrolls.map(item => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(item.periodStart).toLocaleDateString()} - {new Date(item.periodEnd).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.regularHours + item.overtimeHours + item.nightHours + item.holidayHours + 
                           item.sundayHolidayHours + item.overtimeNightHours + item.overtimeSundayHolidayHours + 
                           item.overtimeNightSundayHolidayHours}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.grossPay} {item.currency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.netPay} {item.currency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex action-buttons">
                            <button 
                              className="text-blue-600 hover:text-blue-800 mr-3"
                              onClick={() => selectPayroll(item.id)}
                            >
                              Details
                            </button>
                            <button 
                              className="text-green-600 hover:text-green-800"
                              onClick={() => generatePDF(item.id)}
                            >
                              PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {payroll && (
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Lohnabrechnung Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="font-medium text-gray-700">Mitarbeiter</h3>
                  <p>{payroll.user.firstName} {payroll.user.lastName}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700">Abrechnungszeitraum</h3>
                  <p>{new Date(payroll.periodStart).toLocaleDateString()} - {new Date(payroll.periodEnd).toLocaleDateString()}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700">Land</h3>
                  <p>{payroll.user.payrollCountry === 'CH' ? 'Schweiz' : 'Kolumbien'}</p>
                </div>
                {payroll.user.payrollCountry === 'CO' && payroll.user.contractType && (
                  <div>
                    <h3 className="font-medium text-gray-700">Vertragsart</h3>
                    <p>{formatContractType(payroll.user.contractType)}</p>
                  </div>
                )}
              </div>
              
              <div className="border-t border-gray-200 pt-4 mb-4">
                <h3 className="font-medium text-gray-700 mb-2">Arbeitsstunden</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Reguläre Stunden</p>
                    <p className="font-medium">{payroll.regularHours}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Überstunden</p>
                    <p className="font-medium">{payroll.overtimeHours}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nachtstunden</p>
                    <p className="font-medium">{payroll.nightHours}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Feiertags-/Sonntagsstunden</p>
                    <p className="font-medium">{payroll.holidayHours + payroll.sundayHolidayHours}</p>
                  </div>
                  {payroll.user.payrollCountry === 'CO' && (
                    <>
                      <div>
                        <p className="text-sm text-gray-500">Nachtüberstunden</p>
                        <p className="font-medium">{payroll.overtimeNightHours}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Sonntags-/Feiertagsüberstunden</p>
                        <p className="font-medium">{payroll.overtimeSundayHolidayHours}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Nacht-Sonntags-/Feiertagsüberstunden</p>
                        <p className="font-medium">{payroll.overtimeNightSundayHolidayHours}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-medium text-gray-700 mb-2">Abrechnung</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Stundensatz</p>
                    <p className="font-medium">{payroll.hourlyRate} {payroll.currency}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Bruttolohn</p>
                    <p className="font-medium">{payroll.grossPay} {payroll.currency}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Sozialversicherungsbeiträge</p>
                    <p className="font-medium">{payroll.socialSecurity} {payroll.currency}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Steuern</p>
                    <p className="font-medium">{payroll.taxes} {payroll.currency}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nettolohn</p>
                    <p className="font-medium font-bold">{payroll.netPay} {payroll.currency}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <button 
                  className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                  onClick={() => generatePDF(payroll.id)}
                >
                  PDF generieren
                </button>
                
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h3 className="font-medium text-blue-800 mb-2">Zahlungsanweisung für die Buchhaltung</h3>
                  <p><strong>Empfänger:</strong> {payroll.user.firstName} {payroll.user.lastName}</p>
                  <p><strong>Betrag:</strong> {payroll.netPay} {payroll.currency}</p>
                  <p><strong>Zahlungsgrund:</strong> Lohn {new Date(payroll.periodStart).toLocaleDateString()} - {new Date(payroll.periodEnd).toLocaleDateString()}</p>
                  <p><strong>Zu zahlen bis:</strong> {new Date(new Date(payroll.periodEnd).getTime() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                </div>
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