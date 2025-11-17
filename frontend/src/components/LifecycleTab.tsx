import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { usePermissions } from '../hooks/usePermissions.ts';
import useMessage from '../hooks/useMessage.ts';

interface LifecycleTabProps {
  userId: number;
}

interface LifecycleData {
  lifecycle: {
    id: number;
    status: string;
    onboardingStartedAt: string | null;
    onboardingCompletedAt: string | null;
    contractStartDate: string | null;
    contractEndDate: string | null;
  };
  progress: {
    completed: number;
    total: number;
    percent: number;
  };
  socialSecurityRegistrations?: Array<{
    id: number;
    registrationType: string;
    status: string;
    registrationNumber: string | null;
    provider: string | null;
    registrationDate: string | null;
  }>;
}

interface UserContractData {
  contract: string | null;
  salary: number | null;
  normalWorkingHours: number;
}

// Vertragstypen für Kolumbien (CO)
const CONTRACT_TYPES = [
  { code: 'tiempo_completo', name: 'Tiempo Completo (>21 Tage/Monat)' },
  { code: 'tiempo_parcial_7', name: 'Tiempo Parcial (≤7 Tage/Monat)' },
  { code: 'tiempo_parcial_14', name: 'Tiempo Parcial (≤14 Tage/Monat)' },
  { code: 'tiempo_parcial_21', name: 'Tiempo Parcial (≤21 Tage/Monat)' },
  { code: 'prestacion_de_servicios', name: 'Prestación de Servicios' },
  { code: 'externo', name: 'Externo' }
];

const LifecycleTab: React.FC<LifecycleTabProps> = ({ userId }) => {
  const { t } = useTranslation();
  const { isHR, isAdmin } = usePermissions();
  const { showMessage } = useMessage();
  const [lifecycleData, setLifecycleData] = useState<LifecycleData | null>(null);
  const [userContractData, setUserContractData] = useState<UserContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingContract, setIsEditingContract] = useState(false);
  const [contractFormData, setContractFormData] = useState<UserContractData>({
    contract: null,
    salary: null,
    normalWorkingHours: 7.6
  });

  useEffect(() => {
    fetchLifecycleData();
    fetchUserContractData();
  }, [userId]);

  const fetchLifecycleData = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_ENDPOINTS.LIFECYCLE.BY_USER(userId));
      setLifecycleData(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Fehler beim Laden der Lebenszyklus-Daten:', err);
      if (err.response?.status === 404) {
        setError('Lebenszyklus nicht gefunden. Bitte kontaktieren Sie HR, um einen Lebenszyklus-Eintrag zu erstellen.');
      } else {
        setError(err.response?.data?.message || 'Fehler beim Abrufen des Lebenszyklus');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserContractData = async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.USERS.BY_ID(userId));
      const userData = response.data;
      const contractData: UserContractData = {
        contract: userData.contract || null,
        salary: userData.salary || null,
        normalWorkingHours: userData.normalWorkingHours || 7.6
      };
      setUserContractData(contractData);
      setContractFormData(contractData);
    } catch (err: any) {
      console.error('Fehler beim Laden der Vertragsdaten:', err);
    }
  };

  const handleContractInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setContractFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : (name === 'salary' || name === 'normalWorkingHours' ? parseFloat(value) : value)
    }));
  };

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSend = {
        contract: contractFormData.contract || null,
        salary: contractFormData.salary || null,
        normalWorkingHours: contractFormData.normalWorkingHours || 7.6
      };

      await axiosInstance.put(API_ENDPOINTS.USERS.BY_ID(userId), dataToSend);
      
      setUserContractData(contractFormData);
      setIsEditingContract(false);
      showMessage('Vertragsdaten erfolgreich aktualisiert', 'success');
    } catch (err: any) {
      console.error('Fehler beim Speichern der Vertragsdaten:', err);
      showMessage(err.response?.data?.message || 'Fehler beim Speichern der Vertragsdaten', 'error');
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!lifecycleData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <p className="text-gray-500 dark:text-gray-400">Keine Lebenszyklus-Daten verfügbar</p>
      </div>
    );
  }

  const { lifecycle, progress, socialSecurityRegistrations = [] } = lifecycleData;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; labelKey: string }> = {
      onboarding: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300', labelKey: 'lifecycle.status.onboarding' },
      active: { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300', labelKey: 'lifecycle.status.active' },
      contract_change: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300', labelKey: 'lifecycle.status.contract_change' },
      offboarding: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300', labelKey: 'lifecycle.status.offboarding' },
      archived: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', labelKey: 'lifecycle.status.archived' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', labelKey: status };
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {t(config.labelKey) || status}
      </span>
    );
  };

  const getSocialSecurityStatusIcon = (status: string) => {
    switch (status) {
      case 'registered':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'not_required':
        return <CheckCircleIcon className="h-5 w-5 text-gray-400" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getSocialSecurityStatusLabel = (status: string) => {
    const labelKey = `lifecycle.socialSecurityStatus.${status}`;
    return t(labelKey) || status;
  };

  const canEditContract = isHR() || isAdmin();

  return (
    <div className="space-y-6">
      {/* Vertragsdaten-Sektion */}
      {userContractData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold dark:text-white flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              {t('lifecycle.contractData') || 'Vertragsdaten'}
            </h3>
            {canEditContract && !isEditingContract && (
              <button
                onClick={() => setIsEditingContract(true)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                title={t('common.edit') || 'Bearbeiten'}
              >
                <PencilIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          {isEditingContract ? (
            <form onSubmit={handleContractSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.contract')}
                  </label>
                  <select
                    name="contract"
                    value={contractFormData.contract || ''}
                    onChange={handleContractInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">{t('common.pleaseSelect', { defaultValue: 'Bitte auswählen...' })}</option>
                    {CONTRACT_TYPES.map((type) => (
                      <option key={type.code} value={type.code}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('lifecycle.contractStart')}
                  </label>
                  <input
                    type="date"
                    value={lifecycleData?.lifecycle.contractStartDate ? new Date(lifecycleData.lifecycle.contractStartDate).toISOString().split('T')[0] : ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-800"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.salary')}
                  </label>
                  <input
                    type="number"
                    name="salary"
                    value={contractFormData.salary || ''}
                    onChange={handleContractInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.normalWorkingHours')}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="normalWorkingHours"
                    value={contractFormData.normalWorkingHours || 7.6}
                    onChange={handleContractInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {lifecycleData?.lifecycle.contractEndDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('lifecycle.contractEnd')}
                    </label>
                    <input
                      type="date"
                      value={new Date(lifecycleData.lifecycle.contractEndDate).toISOString().split('T')[0]}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-800"
                      readOnly
                    />
                  </div>
                )}
              </div>

              <div className="flex mt-6 space-x-3">
                <button
                  type="submit"
                  className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
                  title={t('common.save')}
                >
                  <CheckIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingContract(false);
                    setContractFormData(userContractData);
                  }}
                  className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  title={t('common.cancel')}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.contract')}
                </label>
                <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-50 dark:bg-gray-800">
                  {userContractData.contract ? CONTRACT_TYPES.find(t => t.code === userContractData.contract)?.name || userContractData.contract : '-'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('lifecycle.contractStart')}
                </label>
                <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-50 dark:bg-gray-800">
                  {lifecycleData?.lifecycle.contractStartDate 
                    ? new Date(lifecycleData.lifecycle.contractStartDate).toLocaleDateString('de-DE')
                    : '-'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.salary')}
                </label>
                <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-50 dark:bg-gray-800">
                  {userContractData.salary ? userContractData.salary.toLocaleString('de-DE') : '-'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.normalWorkingHours')}
                </label>
                <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-50 dark:bg-gray-800">
                  {userContractData.normalWorkingHours || 7.6} {t('common.hours') || 'Stunden'}
                </div>
              </div>

              {lifecycleData?.lifecycle.contractEndDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('lifecycle.contractEnd')}
                  </label>
                  <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-50 dark:bg-gray-800">
                    {new Date(lifecycleData.lifecycle.contractEndDate).toLocaleDateString('de-DE')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Status-Box */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold dark:text-white flex items-center">
            <BuildingOfficeIcon className="h-5 w-5 mr-2" />
            {t('lifecycle.statusTitle')}
          </h3>
          {getStatusBadge(lifecycle.status)}
        </div>

        <div className="space-y-2 text-sm">
          {lifecycle.onboardingStartedAt && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('lifecycle.onboardingStarted')}</span>
              <span className="dark:text-white">
                {new Date(lifecycle.onboardingStartedAt).toLocaleDateString('de-DE')}
              </span>
            </div>
          )}
          {lifecycle.onboardingCompletedAt && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('lifecycle.onboardingCompleted')}</span>
              <span className="dark:text-white">
                {new Date(lifecycle.onboardingCompletedAt).toLocaleDateString('de-DE')}
              </span>
            </div>
          )}
          {lifecycle.contractStartDate && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('lifecycle.contractStart')}</span>
              <span className="dark:text-white">
                {new Date(lifecycle.contractStartDate).toLocaleDateString('de-DE')}
              </span>
            </div>
          )}
          {lifecycle.contractEndDate && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('lifecycle.contractEnd')}</span>
              <span className="dark:text-white">
                {new Date(lifecycle.contractEndDate).toLocaleDateString('de-DE')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress-Bar */}
      {lifecycle.status === 'onboarding' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold dark:text-white mb-4">{t('lifecycle.progressTitle')}</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">
                {t('lifecycle.progressSteps', { completed: progress.completed, total: progress.total })}
              </span>
              <span className="font-medium dark:text-white">{progress.percent}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              ></div>
            </div>
            
            {/* Detaillierte Schritt-Liste */}
            <div className="mt-4 space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('lifecycle.stepsDetail')}
              </div>
              {[
                { key: 'passport', completed: true }, // TODO: Prüfe ob Dokument vorhanden
                { key: 'arl', completed: lifecycle.arlStatus === 'registered' },
                { key: 'eps', completed: !lifecycle.epsRequired || lifecycle.epsStatus === 'registered' },
                { key: 'pension', completed: lifecycle.pensionStatus === 'registered' },
                { key: 'caja', completed: lifecycle.cajaStatus === 'registered' }
              ].map((step) => (
                <div key={step.key} className="flex items-center space-x-2 text-sm">
                  {step.completed ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : (
                    <ClockIcon className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className={step.completed ? 'text-gray-600 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white font-medium'}>
                    {t(`lifecycle.steps.${step.key}`)}
                  </span>
                  {step.completed && (
                    <span className="text-xs text-green-600 dark:text-green-400">{t('lifecycle.completed')}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Social Security Status */}
      {socialSecurityRegistrations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold dark:text-white mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            {t('lifecycle.socialSecurity')}
          </h3>
          <div className="space-y-3">
            {socialSecurityRegistrations.map((registration) => (
              <div
                key={registration.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {getSocialSecurityStatusIcon(registration.status)}
                  <div>
                    <div className="font-medium dark:text-white uppercase">
                      {registration.registrationType}
                    </div>
                    {registration.provider && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {registration.provider}
                      </div>
                    )}
                    {registration.registrationNumber && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Nr: {registration.registrationNumber}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium dark:text-white">
                  {getSocialSecurityStatusLabel(registration.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LifecycleTab;

