import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon,
  DocumentTextIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

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

const LifecycleTab: React.FC<LifecycleTabProps> = ({ userId }) => {
  const { t } = useTranslation();
  const [lifecycleData, setLifecycleData] = useState<LifecycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLifecycleData();
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
        <p className="text-gray-500 dark:text-gray-400">{t('lifecycle.noDataAvailable')}</p>
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

  return (
    <div className="space-y-6">
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

