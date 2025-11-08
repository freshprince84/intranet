import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { EnvelopeIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { organizationService } from '../../services/organizationService.ts';
import { Organization } from '../../types/organization.ts';
import useMessage from '../../hooks/useMessage.ts';

interface Props {
  organization: Organization | null;
  onSave?: () => void;
}

const SMTPConfigurationTab: React.FC<Props> = ({ organization, onSave }) => {
  const { t } = useTranslation();
  const { showMessage } = useMessage();
  const [loading, setLoading] = useState(false);
  const [smtpSettings, setSmtpSettings] = useState({
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    smtpFromEmail: '',
    smtpFromName: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (organization?.settings) {
      const settings = organization.settings as any;
      setSmtpSettings({
        smtpHost: settings.smtpHost || '',
        smtpPort: settings.smtpPort?.toString() || '587',
        smtpUser: settings.smtpUser || '',
        smtpPass: settings.smtpPass || '',
        smtpFromEmail: settings.smtpFromEmail || (organization?.domain ? `noreply@${organization.domain}` : ''),
        smtpFromName: settings.smtpFromName || organization?.displayName || ''
      });
    }
  }, [organization]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSmtpSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!smtpSettings.smtpHost || !smtpSettings.smtpUser || !smtpSettings.smtpPass) {
      showMessage(t('organization.smtp.requiredFields'), 'error');
      return;
    }

    try {
      setLoading(true);
      
      const settings = {
        ...(organization?.settings || {}),
        smtpHost: smtpSettings.smtpHost,
        smtpPort: parseInt(smtpSettings.smtpPort) || 587,
        smtpUser: smtpSettings.smtpUser,
        smtpPass: smtpSettings.smtpPass,
        smtpFromEmail: smtpSettings.smtpFromEmail,
        smtpFromName: smtpSettings.smtpFromName
      };

      await organizationService.updateOrganization({
        settings: settings
      });
      
      showMessage(t('organization.smtp.saveSuccess'), 'success');
      if (onSave) {
        onSave();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || t('organization.smtp.saveError');
      showMessage(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSmtpSettings({
      smtpHost: '',
      smtpPort: '587',
      smtpUser: '',
      smtpPass: '',
      smtpFromEmail: organization?.domain ? `noreply@${organization.domain}` : '',
      smtpFromName: organization?.displayName || ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <EnvelopeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('organization.smtp.title')}
        </h3>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t('organization.smtp.description')}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="smtpHost" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('organization.smtp.host')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="smtpHost"
            name="smtpHost"
            value={smtpSettings.smtpHost}
            onChange={handleChange}
            placeholder="smtp.example.com"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('organization.smtp.hostHint')}
          </p>
        </div>

        <div>
          <label htmlFor="smtpPort" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('organization.smtp.port')} <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="smtpPort"
            name="smtpPort"
            value={smtpSettings.smtpPort}
            onChange={handleChange}
            placeholder="587"
            required
            min="1"
            max="65535"
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('organization.smtp.portHint')}
          </p>
        </div>

        <div>
          <label htmlFor="smtpUser" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('organization.smtp.user')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="smtpUser"
            name="smtpUser"
            value={smtpSettings.smtpUser}
            onChange={handleChange}
            placeholder="noreply@example.com"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('organization.smtp.userHint')}
          </p>
        </div>

        <div>
          <label htmlFor="smtpPass" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('organization.smtp.password')} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="smtpPass"
              name="smtpPass"
              value={smtpSettings.smtpPass}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L3 3m3.29 3.29L12 12m-5.71-5.71L12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('organization.smtp.passwordHint')}
          </p>
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('organization.smtp.fromSettings')}
          </h4>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="smtpFromEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('organization.smtp.fromEmail')}
              </label>
              <input
                type="email"
                id="smtpFromEmail"
                name="smtpFromEmail"
                value={smtpSettings.smtpFromEmail}
                onChange={handleChange}
                placeholder="noreply@example.com"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('organization.smtp.fromEmailHint')}
              </p>
            </div>

            <div>
              <label htmlFor="smtpFromName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('organization.smtp.fromName')}
              </label>
              <input
                type="text"
                id="smtpFromName"
                name="smtpFromName"
                value={smtpSettings.smtpFromName}
                onChange={handleChange}
                placeholder={organization?.displayName || 'Intranet'}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('organization.smtp.fromNameHint')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>{t('organization.smtp.infoTitle')}</strong>
          </p>
          <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
            <li>{t('organization.smtp.info1')}</li>
            <li>{t('organization.smtp.info2')}</li>
            <li>{t('organization.smtp.info3')}</li>
          </ul>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            {t('organization.smtp.clear')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                {t('organization.saving')}
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4" />
                {t('common.save')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SMTPConfigurationTab;

