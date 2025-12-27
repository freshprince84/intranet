import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CalculatorIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { useOrganization } from '../contexts/OrganizationContext.tsx';

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
  const { user } = useAuth();
  const { hasPermission, getAccessLevel, loading: permissionsLoading } = usePermissions();
  const canEditPayroll = hasPermission('payroll', 'write') || hasPermission('payroll', 'both');
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
  const [allUsers, setAllUsers] = useState<{ id: number; firstName: string; lastName: string; payrollCountry?: string }[]>([]);
  const { organization } = useOrganization();
  const [periodStart, setPeriodStart] = useState<Date | null>(null);
  const [periodEnd, setPeriodEnd] = useState<Date | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ FIX: Prüfe Berechtigung für payroll_reports Tab
  const payrollAccessLevel = getAccessLevel('payroll_reports', 'tab');
  const canSeeAllUsers = payrollAccessLevel === 'all_both' || payrollAccessLevel === 'all_read';

  // ✅ FIX: Filtere User basierend auf Berechtigung
  const users = useMemo(() => {
    if (canSeeAllUsers) {
      return allUsers; // Alle User anzeigen
    }
    // Nur eigenen User anzeigen
    if (user?.id) {
      return allUsers.filter(u => u.id === user.id);
    }
    return [];
  }, [allUsers, canSeeAllUsers, user?.id]);

  // Benutzer laden (nur aktive User)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axiosInstance.get(API_ENDPOINTS.USERS.DROPDOWN);
        setAllUsers(response.data);
      } catch (error) {
        console.error('Fehler beim Laden der Benutzer:', error);
        setError(t('payroll.payrollComponent.usersLoadError'));
      }
    };

    // ✅ FIX: Prüfe Berechtigung für payroll_reports Tab (nicht 'payroll')
    if (hasPermission('payroll_reports', 'read', 'tab')) {
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

  // Helper-Funktion: Berechnet Standard-Periode basierend auf User
  const getDefaultPeriod = (user: { payrollCountry?: string }): { start: Date; end: Date } => {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (user.payrollCountry === 'CH') {
      // Schweiz: Monatlich (1. bis 25.)
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth(), 25);
    } else {
      // Kolumbien: Quinzena (1.-15. oder 16.-Monatsende)
      if (now.getDate() <= 15) {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth(), 15);
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 16);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
    }

    return { start, end };
  };

  // Funktion zum Abrufen der vorausgefüllten Stunden
  const fetchPrefilledHours = useCallback(async (userId: number, start: Date, end: Date) => {
    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.PAYROLL.PREFILL_HOURS}?userId=${userId}&periodStart=${start.toISOString()}&periodEnd=${end.toISOString()}`
      );
      
      setHours(response.data);
    } catch (error) {
      console.error('Fehler beim Abrufen der vorausgefüllten Stunden:', error);
      // Kein Fehler anzeigen, da dies optional ist
    }
  }, []);

  // Beim User-Auswahl: Perioden setzen (Stunden werden durch periodStart/periodEnd useEffect vorausgefüllt)
  useEffect(() => {
    if (selectedUser && users.length > 0) {
      const user = users.find(u => u.id === selectedUser);
      if (user) {
        const defaultPeriod = getDefaultPeriod(user);
        setPeriodStart(defaultPeriod.start);
        setPeriodEnd(defaultPeriod.end);
      }
    } else {
      setPeriodStart(null);
      setPeriodEnd(null);
    }
  }, [selectedUser, users]);

  // Beim Perioden-Wechsel: Stunden neu vorausfüllen (nur wenn User bereits ausgewählt)
  useEffect(() => {
    if (selectedUser && periodStart && periodEnd) {
      fetchPrefilledHours(selectedUser, periodStart, periodEnd);
    }
  }, [periodStart, periodEnd, selectedUser, fetchPrefilledHours]);

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = Number(e.target.value);
    setSelectedUser(userId || null);
    setPayroll(null); // Reset Details bei User-Wechsel
    setHours({
      regular: 0,
      overtime: 0,
      night: 0,
      holidayHours: 0,
      sundayHoliday: 0,
      overtimeNight: 0,
      overtimeSundayHoliday: 0,
      overtimeNightSundayHoliday: 0
    }); // Reset Stunden
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof Hours) => {
    const value = Math.max(0, Number(e.target.value)); // Keine negativen Werte
    setHours({ ...hours, [field]: value });
  };

  const saveHours = useCallback(async () => {
    if (!selectedUser || !periodStart || !periodEnd) {
      setError(t('payroll.payrollComponent.selectUserAndPeriod'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post(API_ENDPOINTS.PAYROLL.HOURS, {
        userId: selectedUser,
        hours,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString()
      });

      // Automatisch berechnen
      const calculatedPayroll = await axiosInstance.get(
        `${API_ENDPOINTS.PAYROLL.CALCULATE}?payrollId=${response.data.id}`
      );
      setPayroll(calculatedPayroll.data);

      // Liste aktualisieren
      fetchPayrolls();

      setLoading(false);
    } catch (error: any) {
      console.error('Fehler beim Speichern der Stunden:', error);
      
      // Spezielle Fehlerbehandlung für doppelte Perioden
      if (error.response?.status === 400 && error.response?.data?.error?.includes('bereits eine Lohnabrechnung')) {
        setError(t('payroll.payrollComponent.duplicatePeriodError', { 
          periodStart: periodStart.toLocaleDateString(),
          periodEnd: periodEnd.toLocaleDateString()
        }) || error.response.data.error);
      } else {
        setError(error.response?.data?.error || t('payroll.payrollComponent.saveError'));
      }
      setLoading(false);
    }
  }, [selectedUser, hours, periodStart, periodEnd, fetchPayrolls, t]);

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
          {/* Hinweis bei read-only */}
          {!canEditPayroll && (
            <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {t('payroll.payrollComponent.noEditPermission')}
              </p>
            </div>
          )}

          {/* Perioden-Auswahl */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">{t('payroll.payrollComponent.period')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('payroll.payrollComponent.periodStart')}
                </label>
                <input
                  type="date"
                  className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  value={periodStart ? periodStart.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : null;
                    setPeriodStart(date);
                  }}
                  disabled={!canEditPayroll}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('payroll.payrollComponent.periodEnd')}
                </label>
                <input
                  type="date"
                  className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  value={periodEnd ? periodEnd.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : null;
                    setPeriodEnd(date);
                  }}
                  disabled={!canEditPayroll}
                />
              </div>
            </div>
          </div>

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
                  className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  value={hours.overtime}
                  onChange={(e) => handleHoursChange(e, 'overtime')}
                  disabled={!canEditPayroll}
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
                  className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  value={hours.night}
                  onChange={(e) => handleHoursChange(e, 'night')}
                  disabled={!canEditPayroll}
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
                  className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  value={hours.holidayHours}
                  onChange={(e) => handleHoursChange(e, 'holidayHours')}
                  disabled={!canEditPayroll}
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
                  className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  value={hours.sundayHoliday}
                  onChange={(e) => handleHoursChange(e, 'sundayHoliday')}
                  disabled={!canEditPayroll}
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
                  className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  value={hours.overtimeNight}
                  onChange={(e) => handleHoursChange(e, 'overtimeNight')}
                  disabled={!canEditPayroll}
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
                  className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  value={hours.overtimeSundayHoliday}
                  onChange={(e) => handleHoursChange(e, 'overtimeSundayHoliday')}
                  disabled={!canEditPayroll}
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
                  className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  value={hours.overtimeNightSundayHoliday}
                  onChange={(e) => handleHoursChange(e, 'overtimeNightSundayHoliday')}
                  disabled={!canEditPayroll}
                />
              </div>
            </div>

            <button
              className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 disabled:cursor-not-allowed"
              onClick={saveHours}
              disabled={loading || !canEditPayroll}
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
                  <h3 className="font-medium text-gray-700 dark:text-gray-300">{t('payroll.payrollComponent.employee')}</h3>
                  <p className="text-gray-900 dark:text-gray-100">{payroll.user.firstName} {payroll.user.lastName}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300">{t('payroll.payrollComponent.period')}</h3>
                  <p className="text-gray-900 dark:text-gray-100">{new Date(payroll.periodStart).toLocaleDateString()} - {new Date(payroll.periodEnd).toLocaleDateString()}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300">{t('payroll.payrollComponent.country')}</h3>
                  <p className="text-gray-900 dark:text-gray-100">{t(`countries.${payroll.user.payrollCountry}`)}</p>
                </div>
                {payroll.user.payrollCountry === 'CO' && payroll.user.contractType && (
                  <div>
                    <h3 className="font-medium text-gray-700 dark:text-gray-300">{t('payroll.payrollComponent.contractType')}</h3>
                    <p className="text-gray-900 dark:text-gray-100">{formatContractType(payroll.user.contractType, t)}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mb-4">
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t('payroll.payrollComponent.workingHours')}</h3>
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('payroll.payrollComponent.holidaySundayHours')}</p>
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
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t('payroll.payrollComponent.calculation')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('payroll.payrollComponent.hourlyRate')}</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(Number(payroll.hourlyRate), payroll.currency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('payroll.payrollComponent.grossPay')}</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(Number(payroll.grossPay), payroll.currency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('payroll.payrollComponent.socialSecurity')}</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(Number(payroll.socialSecurity), payroll.currency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('payroll.payrollComponent.taxes')}</p>
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
                  <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">{t('payroll.payrollComponent.paymentInstruction')}</h3>
                  <p className="text-blue-700 dark:text-blue-300"><strong>{t('payroll.payrollComponent.recipient')}:</strong> {payroll.user.firstName} {payroll.user.lastName}</p>
                  <p className="text-blue-700 dark:text-blue-300"><strong>{t('payroll.payrollComponent.amount')}:</strong> {formatCurrency(Number(payroll.netPay), payroll.currency)}</p>
                  <p className="text-blue-700 dark:text-blue-300"><strong>{t('payroll.payrollComponent.paymentReason')}:</strong> {t('payroll.payrollComponent.salary')} {new Date(payroll.periodStart).toLocaleDateString()} - {new Date(payroll.periodEnd).toLocaleDateString()}</p>
                  <p className="text-blue-700 dark:text-blue-300"><strong>{t('payroll.payrollComponent.payUntil')}:</strong> {new Date(new Date(payroll.periodEnd).getTime() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Hilfsfunktion zum Formatieren der Vertragsart (wird innerhalb der Komponente verwendet)
const formatContractType = (contractType: string, t: (key: string) => string): string => {
  const translationKey = `payroll.payrollComponent.contractTypes.${contractType}`;
  const translated = t(translationKey);
  // Falls Übersetzung nicht gefunden, gib den contractType zurück
  return translated !== translationKey ? translated : contractType;
};

export default PayrollComponent;
