import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { organizationService } from '../../services/organizationService.ts';
import { Organization, OrganizationSettings } from '../../types/organization.ts';
import useMessage from '../../hooks/useMessage.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { validateApiUrl } from '../../utils/urlValidation.ts';

// Feste LobbyPMS API URL
const LOBBYPMS_API_URL = 'https://api.lobbypms.com';

interface Props {
  organization: Organization | null;
  onSave?: () => void;
}

const ApiConfigurationTab: React.FC<Props> = ({ organization, onSave }) => {
  const { t } = useTranslation();
  const { showMessage } = useMessage();
  const { canManageOrganization, loading: permissionsLoading } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [apiSettings, setApiSettings] = useState({
    // LobbyPMS
    lobbyPmsApiKey: '',
    lobbyPmsPropertyId: '',
    lobbyPmsSyncEnabled: false,
    lobbyPmsAutoCreateTasks: false,
    lobbyPmsAutoSendReservationInvitation: true, // Default: true (Rückwärtskompatibilität)
    lobbyPmsLateCheckInThreshold: '22:00',
    
    // TTLock
    ttlockClientId: '',
    ttlockClientSecret: '',
    ttlockApiUrl: 'https://open.ttlock.com',
    ttlockUsername: '',
    ttlockPassword: '',
    ttlockPasscodeType: 'auto' as 'auto' | 'custom',
    
    // SIRE
    sireApiUrl: '',
    sireApiKey: '',
    sireApiSecret: '',
    sireEnabled: false,
    sireAutoRegisterOnCheckIn: false,
    sirePropertyCode: '',
    
    // Bold Payment
    boldPaymentApiKey: '',
    boldPaymentMerchantId: '',
    boldPaymentEnvironment: 'sandbox' as 'sandbox' | 'production',
    
    // WhatsApp
    whatsappProvider: 'twilio' as 'twilio' | 'whatsapp-business-api',
    whatsappApiKey: '',
    whatsappApiSecret: '',
    whatsappPhoneNumberId: ''
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (organization?.settings) {
      const settings = organization.settings as OrganizationSettings;
      const lobbyPms = settings.lobbyPms || {};
      const doorSystem = settings.doorSystem || {};
      const sire = settings.sire || {};
      const boldPayment = settings.boldPayment || {};
      const whatsapp = settings.whatsapp || {};
      
      setApiSettings({
        lobbyPmsApiKey: lobbyPms.apiKey || '',
        lobbyPmsPropertyId: lobbyPms.propertyId || '',
        lobbyPmsSyncEnabled: lobbyPms.syncEnabled || false,
        lobbyPmsAutoCreateTasks: lobbyPms.autoCreateTasks || false,
        lobbyPmsAutoSendReservationInvitation: lobbyPms.autoSendReservationInvitation !== false, // Default: true
        lobbyPmsLateCheckInThreshold: lobbyPms.lateCheckInThreshold || '22:00',
        
        ttlockClientId: doorSystem.clientId || '',
        ttlockClientSecret: doorSystem.clientSecret || '',
        ttlockApiUrl: doorSystem.apiUrl || 'https://open.ttlock.com',
        ttlockUsername: doorSystem.username || '',
        ttlockPassword: '', // Password wird nicht angezeigt (aus Sicherheitsgründen)
        ttlockPasscodeType: (doorSystem.passcodeType as 'auto' | 'custom') || 'auto',
        
        sireApiUrl: sire.apiUrl || '',
        sireApiKey: sire.apiKey || '',
        sireApiSecret: sire.apiSecret || '',
        sireEnabled: sire.enabled || false,
        sireAutoRegisterOnCheckIn: sire.autoRegisterOnCheckIn || false,
        sirePropertyCode: sire.propertyCode || '',
        
        boldPaymentApiKey: boldPayment.apiKey || '',
        boldPaymentMerchantId: boldPayment.merchantId || '',
        boldPaymentEnvironment: boldPayment.environment || 'sandbox',
        
        whatsappProvider: (whatsapp.provider as 'twilio' | 'whatsapp-business-api') || 'twilio',
        whatsappApiKey: whatsapp.apiKey || '',
        whatsappApiSecret: whatsapp.apiSecret || '',
        whatsappPhoneNumberId: whatsapp.phoneNumberId || ''
      });
    }
  }, [organization]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setApiSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const toggleShowSecret = (key: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleClear = () => {
    setApiSettings({
      lobbyPmsApiKey: '',
      lobbyPmsPropertyId: '',
      lobbyPmsSyncEnabled: false,
      lobbyPmsAutoCreateTasks: false,
      lobbyPmsAutoSendReservationInvitation: true,
      lobbyPmsLateCheckInThreshold: '22:00',
      ttlockClientId: '',
      ttlockClientSecret: '',
      ttlockApiUrl: 'https://open.ttlock.com',
      ttlockUsername: '',
      ttlockPassword: '',
      ttlockPasscodeType: 'auto' as 'auto' | 'custom',
      sireApiUrl: '',
      sireApiKey: '',
      sireApiSecret: '',
      sireEnabled: false,
      sireAutoRegisterOnCheckIn: false,
      sirePropertyCode: '',
        boldPaymentApiKey: '',
        boldPaymentMerchantId: '',
        boldPaymentEnvironment: 'sandbox',
        whatsappProvider: 'twilio' as 'twilio' | 'whatsapp-business-api',
        whatsappApiKey: '',
        whatsappApiSecret: '',
        whatsappPhoneNumberId: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ VALIDIERUNG: Prüfe Pflichtfelder
    if (apiSettings.lobbyPmsSyncEnabled) {
      if (!apiSettings.lobbyPmsApiKey) {
        showMessage(t('organization.api.validation.apiKeyRequired'), 'error');
        return;
      }
    }

    // ✅ URL-VALIDIERUNG: Prüfe alle URLs
    if (apiSettings.ttlockApiUrl && !validateApiUrl(apiSettings.ttlockApiUrl, 'ttlock')) {
      showMessage(t('organization.api.validation.invalidUrl'), 'error');
      return;
    }
    if (apiSettings.sireApiUrl && !validateApiUrl(apiSettings.sireApiUrl, 'sire')) {
      showMessage(t('organization.api.validation.invalidUrl'), 'error');
      return;
    }

    // ✅ ZEITFORMAT-VALIDIERUNG: Prüfe lateCheckInThreshold
    if (apiSettings.lobbyPmsLateCheckInThreshold && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(apiSettings.lobbyPmsLateCheckInThreshold)) {
      showMessage(t('organization.api.validation.invalidTimeFormat'), 'error');
      return;
    }
    
    try {
      setLoading(true);
      
      const currentSettings = (organization?.settings || {}) as OrganizationSettings;
      const settings: OrganizationSettings = {
        ...currentSettings,
        lobbyPms: {
          ...currentSettings.lobbyPms,
          apiUrl: LOBBYPMS_API_URL, // Feste URL
          apiKey: apiSettings.lobbyPmsApiKey || undefined,
          propertyId: apiSettings.lobbyPmsPropertyId || undefined,
          syncEnabled: apiSettings.lobbyPmsSyncEnabled,
          autoCreateTasks: apiSettings.lobbyPmsAutoCreateTasks,
          autoSendReservationInvitation: apiSettings.lobbyPmsAutoSendReservationInvitation,
          lateCheckInThreshold: apiSettings.lobbyPmsLateCheckInThreshold || undefined
        },
        doorSystem: {
          ...currentSettings.doorSystem,
          provider: 'ttlock' as const,
          apiUrl: apiSettings.ttlockApiUrl || undefined,
          clientId: apiSettings.ttlockClientId || undefined,
          clientSecret: apiSettings.ttlockClientSecret || undefined,
          username: apiSettings.ttlockUsername || undefined,
          password: apiSettings.ttlockPassword || undefined, // Wird MD5-gehasht im Backend
          passcodeType: apiSettings.ttlockPasscodeType || 'auto'
        },
        sire: {
          ...currentSettings.sire,
          apiUrl: apiSettings.sireApiUrl || undefined,
          apiKey: apiSettings.sireApiKey || undefined,
          apiSecret: apiSettings.sireApiSecret || undefined,
          enabled: apiSettings.sireEnabled,
          autoRegisterOnCheckIn: apiSettings.sireAutoRegisterOnCheckIn,
          propertyCode: apiSettings.sirePropertyCode || undefined
        },
        boldPayment: {
          ...currentSettings.boldPayment,
          apiKey: apiSettings.boldPaymentApiKey || undefined,
          merchantId: apiSettings.boldPaymentMerchantId || undefined,
          environment: apiSettings.boldPaymentEnvironment
        },
        whatsapp: {
          ...currentSettings.whatsapp,
          provider: apiSettings.whatsappProvider,
          apiKey: apiSettings.whatsappApiKey || undefined,
          apiSecret: apiSettings.whatsappApiSecret || undefined,
          phoneNumberId: apiSettings.whatsappPhoneNumberId || undefined
        }
      };

      await organizationService.updateOrganization({
        settings: settings
      });
      
      showMessage(t('organization.api.saveSuccess'), 'success');
      if (onSave) {
        onSave();
      }
    } catch (error: any) {
      console.error('Error saving API settings:', error);
      
      // Detaillierte Fehlermeldung
      let errorMessage = t('organization.api.saveError');
      
      if (error.response?.data) {
        const data = error.response.data;
        
        // Spezifische Fehlermeldung vom Backend
        if (data.message) {
          errorMessage = data.message;
        }
        
        // Validierungsfehler anzeigen
        if (data.errors && Array.isArray(data.errors)) {
          const validationErrors = data.errors
            .map((err: any) => `${err.path?.join('.') || ''}: ${err.message || ''}`)
            .filter((msg: string) => msg)
            .join(', ');
          
          if (validationErrors) {
            errorMessage += ` (${validationErrors})`;
          }
          
          // URL-Fehler anzeigen (wenn errors Strings sind)
          if (data.errors.length > 0 && typeof data.errors[0] === 'string') {
            errorMessage = data.errors.join(', ');
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showMessage(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const SecretInput: React.FC<{
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    label: string;
    required?: boolean;
  }> = ({ name, value, onChange, placeholder, label, required = false }) => {
    const showSecret = showSecrets[name] || false;
    
    return (
      <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <input
            type={showSecret ? 'text' : 'password'}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder || '••••••••'}
            required={required}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 pr-10"
          />
          <button
            type="button"
            onClick={() => toggleShowSecret(name)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            {showSecret ? (
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
      </div>
    );
  };

  // ✅ BERECHTIGUNGSPRÜFUNG
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">{t('common.loadingPermissions')}</span>
      </div>
    );
  }

  if (!canManageOrganization()) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">{t('organization.api.noPermission')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <KeyIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('organization.api.title')}
        </h3>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {t('organization.api.description')}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* LobbyPMS */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            {t('organization.api.lobbyPms.title')}
          </h4>
          
          <div className="space-y-4">
            <SecretInput
              name="lobbyPmsApiKey"
              value={apiSettings.lobbyPmsApiKey}
              onChange={handleChange}
              label={t('organization.api.lobbyPms.apiKey')}
              placeholder="API Token"
            />

            <div>
              <label htmlFor="lobbyPmsPropertyId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('organization.api.lobbyPms.propertyId')}
              </label>
              <input
                type="text"
                id="lobbyPmsPropertyId"
                name="lobbyPmsPropertyId"
                value={apiSettings.lobbyPmsPropertyId}
                onChange={handleChange}
                placeholder="Property ID"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="lobbyPmsSyncEnabled"
                  checked={apiSettings.lobbyPmsSyncEnabled}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {t('organization.api.lobbyPms.syncEnabled')}
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="lobbyPmsAutoCreateTasks"
                  checked={apiSettings.lobbyPmsAutoCreateTasks}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {t('organization.api.lobbyPms.autoCreateTasks')}
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="lobbyPmsAutoSendReservationInvitation"
                  checked={apiSettings.lobbyPmsAutoSendReservationInvitation}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {t('organization.api.lobbyPms.autoSendReservationInvitation', 'Automatisch Einladung bei Reservation-Erstellung senden')}
                </span>
              </label>
            </div>

            <div>
              <label htmlFor="lobbyPmsLateCheckInThreshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('organization.api.lobbyPms.lateCheckInThreshold')}
              </label>
              <input
                type="time"
                id="lobbyPmsLateCheckInThreshold"
                name="lobbyPmsLateCheckInThreshold"
                value={apiSettings.lobbyPmsLateCheckInThreshold}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* TTLock */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            {t('organization.api.ttlock.title')}
          </h4>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="ttlockApiUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('organization.api.ttlock.apiUrl')}
              </label>
              <input
                type="text"
                id="ttlockApiUrl"
                name="ttlockApiUrl"
                value={apiSettings.ttlockApiUrl}
                onChange={handleChange}
                placeholder="https://open.ttlock.com"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="ttlockClientId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('organization.api.ttlock.clientId')}
              </label>
              <input
                type="text"
                id="ttlockClientId"
                name="ttlockClientId"
                value={apiSettings.ttlockClientId}
                onChange={handleChange}
                placeholder="Client ID"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
              />
            </div>

            <SecretInput
              name="ttlockClientSecret"
              value={apiSettings.ttlockClientSecret}
              onChange={handleChange}
              label={t('organization.api.ttlock.clientSecret')}
              placeholder="Client Secret"
            />

            <div>
              <label htmlFor="ttlockUsername" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('organization.api.ttlock.username')}
              </label>
              <input
                type="text"
                id="ttlockUsername"
                name="ttlockUsername"
                value={apiSettings.ttlockUsername}
                onChange={handleChange}
                placeholder="TTLock App Username (z.B. +573024498991)"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('organization.api.ttlock.usernameHint')}
              </p>
            </div>

            <SecretInput
              name="ttlockPassword"
              value={apiSettings.ttlockPassword}
              onChange={handleChange}
              label={t('organization.api.ttlock.password')}
              placeholder="TTLock App Password"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
              {t('organization.api.ttlock.passwordHint')}
            </p>

            <div>
              <label htmlFor="ttlockPasscodeType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('organization.api.ttlock.passcodeType')}
              </label>
              <select
                id="ttlockPasscodeType"
                name="ttlockPasscodeType"
                value={apiSettings.ttlockPasscodeType}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
              >
                <option value="auto">{t('organization.api.ttlock.passcodeTypeAuto')}</option>
                <option value="custom">{t('organization.api.ttlock.passcodeTypeCustom')}</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('organization.api.ttlock.passcodeTypeHint')}
              </p>
            </div>
          </div>
        </div>

        {/* SIRE */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            {t('organization.api.sire.title')}
          </h4>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="sireApiUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('organization.api.sire.apiUrl')}
              </label>
              <input
                type="text"
                id="sireApiUrl"
                name="sireApiUrl"
                value={apiSettings.sireApiUrl}
                onChange={handleChange}
                placeholder="https://api.sire.gov.co"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
              />
            </div>

            <SecretInput
              name="sireApiKey"
              value={apiSettings.sireApiKey}
              onChange={handleChange}
              label={t('organization.api.sire.apiKey')}
              placeholder="API Key"
            />

            <SecretInput
              name="sireApiSecret"
              value={apiSettings.sireApiSecret}
              onChange={handleChange}
              label={t('organization.api.sire.apiSecret')}
              placeholder="API Secret"
            />

            <div>
              <label htmlFor="sirePropertyCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('organization.api.sire.propertyCode')}
              </label>
              <input
                type="text"
                id="sirePropertyCode"
                name="sirePropertyCode"
                value={apiSettings.sirePropertyCode}
                onChange={handleChange}
                placeholder="Property Code"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="sireEnabled"
                  checked={apiSettings.sireEnabled}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {t('organization.api.sire.enabled')}
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="sireAutoRegisterOnCheckIn"
                  checked={apiSettings.sireAutoRegisterOnCheckIn}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {t('organization.api.sire.autoRegisterOnCheckIn')}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Bold Payment */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            {t('organization.api.boldPayment.title')}
          </h4>
          
          <div className="space-y-4">
            <SecretInput
              name="boldPaymentApiKey"
              value={apiSettings.boldPaymentApiKey}
              onChange={handleChange}
              label={t('organization.api.boldPayment.apiKey')}
              placeholder="API Key"
            />

            <div>
              <label htmlFor="boldPaymentMerchantId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('organization.api.boldPayment.merchantId')}
              </label>
              <input
                type="text"
                id="boldPaymentMerchantId"
                name="boldPaymentMerchantId"
                value={apiSettings.boldPaymentMerchantId}
                onChange={handleChange}
                placeholder="Merchant ID"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="boldPaymentEnvironment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('organization.api.boldPayment.environment')}
              </label>
              <select
                id="boldPaymentEnvironment"
                name="boldPaymentEnvironment"
                value={apiSettings.boldPaymentEnvironment}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
              >
                <option value="sandbox">{t('organization.api.boldPayment.sandbox')}</option>
                <option value="production">{t('organization.api.boldPayment.production')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            {t('organization.api.whatsapp.title')}
          </h4>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="whatsappProvider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('organization.api.whatsapp.provider')}
              </label>
              <select
                id="whatsappProvider"
                name="whatsappProvider"
                value={apiSettings.whatsappProvider}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
              >
                <option value="twilio">{t('organization.api.whatsapp.providerTwilio')}</option>
                <option value="whatsapp-business-api">{t('organization.api.whatsapp.providerBusinessApi')}</option>
              </select>
            </div>

            <SecretInput
              name="whatsappApiKey"
              value={apiSettings.whatsappApiKey}
              onChange={handleChange}
              label={t('organization.api.whatsapp.apiKey')}
              placeholder="API Key / Access Token"
            />

            <SecretInput
              name="whatsappApiSecret"
              value={apiSettings.whatsappApiSecret}
              onChange={handleChange}
              label={t('organization.api.whatsapp.apiSecret')}
              placeholder="API Secret (optional)"
            />

            <div>
              <label htmlFor="whatsappPhoneNumberId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('organization.api.whatsapp.phoneNumberId')}
              </label>
              <input
                type="text"
                id="whatsappPhoneNumberId"
                name="whatsappPhoneNumberId"
                value={apiSettings.whatsappPhoneNumberId}
                onChange={handleChange}
                placeholder="Phone Number ID"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={handleClear}
            className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            title={t('organization.api.clear')}
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
          <button
            type="submit"
            disabled={loading}
            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            title={loading ? t('organization.saving') : t('common.save')}
          >
            {loading ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <CheckIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ApiConfigurationTab;

