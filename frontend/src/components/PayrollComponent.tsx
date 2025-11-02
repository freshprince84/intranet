import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { CalculatorIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { usePermissions } from '../hooks/usePermissions.ts';

interface PayrollData {
  totalHours: number;
  totalEarnings: number;
  deductions: number;
  netPay: number;
  period: string;
}

// Lokale formatCurrency Funktion
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF'
  }).format(amount);
};

const PayrollComponent: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const [payrollData, setPayrollData] = useState<PayrollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: Diese Implementierung wird zukünftig umgebaut
  // Das Lohnabrechnung-Modul soll die Daten der Monatsabrechnungen nehmen
  // und daraus Lohnabrechnungen mit Geldbeträgen erstellen
  
  useEffect(() => {
    if (hasPermission('payroll', 'read')) {
      loadPayrollData();
    } else {
      setLoading(false);
    }
  }, [hasPermission]);

  const loadPayrollData = async () => {
    try {
      setLoading(true);
      // Temporäre Mock-Daten bis zur Umstrukturierung
      setTimeout(() => {
        const now = new Date();
        const monthNames = [
          t('months.january'), t('months.february'), t('months.march'),
          t('months.april'), t('months.may'), t('months.june'),
          t('months.july'), t('months.august'), t('months.september'),
          t('months.october'), t('months.november'), t('months.december')
        ];
        const monthName = monthNames[now.getMonth()];
        setPayrollData({
          totalHours: 160,
          totalEarnings: 8000,
          deductions: 1200,
          netPay: 6800,
          period: `${monthName} ${now.getFullYear()}`
        });
        setLoading(false);
      }, 500);
    } catch (error: any) {
      console.error('Fehler beim Laden der Lohndaten:', error);
      setError(t('payroll.payrollComponent.loadError'));
      setLoading(false);
    }
  };

  if (!hasPermission('payroll', 'read')) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <p className="text-red-800 dark:text-red-200">
          {t('payroll.payrollComponent.noPermission')}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hinweis zur zukünftigen Umstrukturierung */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex">
          <InformationCircleIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {t('payroll.payrollComponent.futureDevelopment')}
            </h3>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              {t('payroll.payrollComponent.futureDevelopmentDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="flex items-center mb-6">
          <CalculatorIcon className="h-8 w-8 mr-3 text-blue-600 dark:text-blue-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('payroll.payrollComponent.title')}
          </h2>
        </div>

        {error ? (
          <div className="text-center text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : payrollData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('payroll.payrollComponent.totalHours')}
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {payrollData.totalHours}h
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('payroll.payrollComponent.grossPay')}
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(payrollData.totalEarnings)}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('payroll.payrollComponent.deductions')}
              </h3>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                -{formatCurrency(payrollData.deductions)}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('payroll.payrollComponent.netPay')}
              </h3>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(payrollData.netPay)}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400">
            {t('payroll.payrollComponent.noData')}
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollComponent; 