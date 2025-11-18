import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CalculatorIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { usePermissions } from '../hooks/usePermissions.ts';

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

// Lokale formatCurrency Funktion mit dynamischer Währung
const formatCurrency = (amount: number, currency: string = 'CHF'): string => {
  return new Intl.NumberFormat(
    currency === 'CHF' ? 'de-CH' : 'es-CO',
    {
      style: 'currency',
      currency: currency
    }
  ).format(amount);
};

const PayrollComponent: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
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
        const response = await axiosInstance.get(API_ENDPOINTS.USERS.BASE);
        setUsers(response.data);
      } catch (error) {
        console.error('Fehler beim Laden der Benutzer:', error);
        setError(t('payroll.payrollComponent.usersLoadError'));
      }
    };

    if (hasPermission('payroll', 'read')) {
      fetchUsers();
    }
  }, [hasPermission, t]);

  // Bestehende Abrechnungen laden, wenn ein Benutzer ausgewählt wird
  const fetchPayrolls = useCallback(async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.PAYROLL.BASE}?userId=${selectedUser}`
      );
      setPayrolls(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Abrechnungen:', error);
      setError(t('payroll.payrollComponent.payrollsLoadError'));
      setLoading(false);
    }
  }, [selectedUser, t]);

  useEffect(() => {
    if (selectedUser) {
      fetchPayrolls();
    }
  }, [selectedUser, fetchPayrolls]);

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = Number(e.target.value);
    setSelectedUser(userId || null);
    setPayroll(null); // Reset Details bei User-Wechsel
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof Hours) => {
    const value = Math.max(0, Number(e.target.value)); // Keine negativen Werte
    setHours({ ...hours, [field]: value });
  };

  const saveHours = useCallback(async () => {
    if (!selectedUser) {
      setError(t('payroll.payrollComponent.selectUserFirst'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post(API_ENDPOINTS.PAYROLL.HOURS, {
        userId: selectedUser,
        hours
      });

      // Automatisch berechnen
      const calculatedPayroll = await axiosInstance.get(
        `${API_ENDPOINTS.PAYROLL.CALCULATE}?payrollId=${response.data.id}`
      );
      setPayroll(calculatedPayroll.data);

      // Liste aktualisieren
      fetchPayrolls();

      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Speichern der Stunden:', error);
      setError(t('payroll.payrollComponent.saveError'));
      setLoading(false);
    }
  }, [selectedUser, hours, fetchPayrolls, t]);

  const selectPayroll = useCallback(async (payrollId: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.PAYROLL.CALCULATE}?payrollId=${payrollId}`
      );
      setPayroll(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Abrechnung:', error);
      setError(t('payroll.payrollComponent.loadError'));
      setLoading(false);
    }
  }, [t]);

  const generatePDF = useCallback(async (payrollId: number) => {
    try {
      window.open(
        `${window.location.origin}${API_ENDPOINTS.PAYROLL.PDF(payrollId)}`,
        '_blank'
      );
    } catch (error) {
      console.error('Fehler beim Generieren des PDFs:', error);
      setError(t('payroll.payrollComponent.pdfError'));
    }
  }, [t]);

  // Warte auf Berechtigungen
  if (permissionsLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-700 dark:text-gray-300">
            {t('common.loadingPermissions', { defaultValue: 'Berechtigungen werden geladen...' })}
          </span>
        </div>
      </div>
    );
  }

  if (!hasPermission('payroll', 'read')) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <p className="text-red-800 dark:text-red-200">
          {t('payroll.payrollComponent.noPermission')}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">{t('payroll.payrollComponent.title')}</h1>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('payroll.payrollComponent.selectEmployee')}
        </label>
        <select
          className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full dark:bg-gray-700 dark:text-white"
          value={selectedUser || ''}
          onChange={handleUserChange}
        >
          <option value="">-- {t('payroll.payrollComponent.pleaseSelect')} --</option>
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
            <h2 className="text-xl font-semibold mb-4 dark:text-white">{t('payroll.payrollComponent.enterHours')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('payroll.payrollComponent.regularHours')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full dark:bg-gray-700 dark:text-white"
                  value={hours.regular}
                  onChange={(e) => handleHoursChange(e, 'regular')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('payroll.payrollComponent.overtimeHours')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full dark:bg-gray-700 dark:text-white"
                  value={hours.overtime}
                  onChange={(e) => handleHoursChange(e, 'overtime')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('payroll.payrollComponent.nightHours')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full dark:bg-gray-700 dark:text-white"
                  value={hours.night}
                  onChange={(e) => handleHoursChange(e, 'night')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('payroll.payrollComponent.holidayHours')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full dark:bg-gray-700 dark:text-white"
                  value={hours.holidayHours}
                  onChange={(e) => handleHoursChange(e, 'holidayHours')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('payroll.payrollComponent.sundayHolidayHours')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full dark:bg-gray-700 dark:text-white"
                  value={hours.sundayHoliday}
                  onChange={(e) => handleHoursChange(e, 'sundayHoliday')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('payroll.payrollComponent.overtimeNightHours')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full dark:bg-gray-700 dark:text-white"
                  value={hours.overtimeNight}
                  onChange={(e) => handleHoursChange(e, 'overtimeNight')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('payroll.payrollComponent.overtimeSundayHolidayHours')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full dark:bg-gray-700 dark:text-white"
                  value={hours.overtimeSundayHoliday}
                  onChange={(e) => handleHoursChange(e, 'overtimeSundayHoliday')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('payroll.payrollComponent.overtimeNightSundayHolidayHours')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full dark:bg-gray-700 dark:text-white"
                  value={hours.overtimeNightSundayHoliday}
                  onChange={(e) => handleHoursChange(e, 'overtimeNightSundayHoliday')}
                />
              </div>
            </div>

            <button
              className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800"
              onClick={saveHours}
              disabled={loading}
            >
              {loading ? t('payroll.payrollComponent.saving') : t('payroll.payrollComponent.saveAndCalculate')}
            </button>
          </div>

          {payrolls.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4 dark:text-white">{t('payroll.payrollComponent.existingPayrolls')}</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('payroll.payrollComponent.period')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('payroll.payrollComponent.totalHours')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('payroll.payrollComponent.grossPay')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('payroll.payrollComponent.netPay')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('payroll.payrollComponent.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {payrolls.map(item => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {new Date(item.periodStart).toLocaleDateString()} - {new Date(item.periodEnd).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {item.regularHours + item.overtimeHours + item.nightHours + item.holidayHours +
                           item.sundayHolidayHours + item.overtimeNightHours + item.overtimeSundayHolidayHours +
                           item.overtimeNightSundayHolidayHours}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {formatCurrency(Number(item.grossPay), item.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {formatCurrency(Number(item.netPay), item.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-3"
                            onClick={() => selectPayroll(item.id)}
                          >
                            {t('payroll.payrollComponent.details')}
                          </button>
                          <button
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                            onClick={() => generatePDF(item.id)}
                          >
                            PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {payroll && (
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4 dark:text-white">{t('payroll.payrollComponent.payrollDetails')}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300">Mitarbeiter</h3>
                  <p className="text-gray-900 dark:text-gray-100">{payroll.user.firstName} {payroll.user.lastName}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300">{t('payroll.payrollComponent.period')}</h3>
                  <p className="text-gray-900 dark:text-gray-100">{new Date(payroll.periodStart).toLocaleDateString()} - {new Date(payroll.periodEnd).toLocaleDateString()}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300">Land</h3>
                  <p className="text-gray-900 dark:text-gray-100">{payroll.user.payrollCountry === 'CH' ? 'Schweiz' : 'Kolumbien'}</p>
                </div>
                {payroll.user.payrollCountry === 'CO' && payroll.user.contractType && (
                  <div>
                    <h3 className="font-medium text-gray-700 dark:text-gray-300">Vertragsart</h3>
                    <p className="text-gray-900 dark:text-gray-100">{formatContractType(payroll.user.contractType)}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mb-4">
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Arbeitsstunden</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('payroll.payrollComponent.regularHours')}</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{payroll.regularHours}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('payroll.payrollComponent.overtimeHours')}</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{payroll.overtimeHours}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('payroll.payrollComponent.nightHours')}</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{payroll.nightHours}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Feiertags-/Sonntagsstunden</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{payroll.holidayHours + payroll.sundayHolidayHours}</p>
                  </div>
                  {payroll.user.payrollCountry === 'CO' && (
                    <>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('payroll.payrollComponent.overtimeNightHours')}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{payroll.overtimeNightHours}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('payroll.payrollComponent.overtimeSundayHolidayHours')}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{payroll.overtimeSundayHolidayHours}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('payroll.payrollComponent.overtimeNightSundayHolidayHours')}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{payroll.overtimeNightSundayHolidayHours}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Abrechnung</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Stundensatz</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(Number(payroll.hourlyRate), payroll.currency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('payroll.payrollComponent.grossPay')}</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(Number(payroll.grossPay), payroll.currency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sozialversicherungsbeiträge</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(Number(payroll.socialSecurity), payroll.currency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Steuern</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(Number(payroll.taxes), payroll.currency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('payroll.payrollComponent.netPay')}</p>
                    <p className="font-medium font-bold text-gray-900 dark:text-gray-100">{formatCurrency(Number(payroll.netPay), payroll.currency)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                  onClick={() => generatePDF(payroll.id)}
                >
                  {t('payroll.payrollComponent.generatePDF')}
                </button>

                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Zahlungsanweisung für die Buchhaltung</h3>
                  <p className="text-blue-700 dark:text-blue-300"><strong>Empfänger:</strong> {payroll.user.firstName} {payroll.user.lastName}</p>
                  <p className="text-blue-700 dark:text-blue-300"><strong>Betrag:</strong> {formatCurrency(Number(payroll.netPay), payroll.currency)}</p>
                  <p className="text-blue-700 dark:text-blue-300"><strong>Zahlungsgrund:</strong> Lohn {new Date(payroll.periodStart).toLocaleDateString()} - {new Date(payroll.periodEnd).toLocaleDateString()}</p>
                  <p className="text-blue-700 dark:text-blue-300"><strong>Zu zahlen bis:</strong> {new Date(new Date(payroll.periodEnd).getTime() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
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
