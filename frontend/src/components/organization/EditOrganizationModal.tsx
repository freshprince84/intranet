import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { organizationService } from '../../services/organizationService.ts';
import { UpdateOrganizationRequest, Organization } from '../../types/organization.ts';
import useMessage from '../../hooks/useMessage.ts';
import { useSidepane } from '../../contexts/SidepaneContext.tsx';
import { useLanguage } from '../../hooks/useLanguage.ts';
import { useAuth } from '../../hooks/useAuth.tsx';
import RoleConfigurationTab from './RoleConfigurationTab.tsx';
import DocumentConfigurationTab from './DocumentConfigurationTab.tsx';
import SMTPConfigurationTab from './SMTPConfigurationTab.tsx';
import ApiConfigurationTab from './ApiConfigurationTab.tsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  organization: Organization | null;
}

const EditOrganizationModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, organization }) => {
  const { t } = useTranslation();
  const { fetchCurrentUser } = useAuth();
  const [formData, setFormData] = useState<UpdateOrganizationRequest>({
    displayName: '',
    domain: '',
    logo: '',
    country: null,
    nit: null,
    settings: {}
  });
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [nit, setNit] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  const { openSidepane, closeSidepane } = useSidepane();
  const { showMessage } = useMessage();
  const { organizationLanguage, setOrganizationLanguage } = useLanguage();
  const [selectedOrgLanguage, setSelectedOrgLanguage] = useState<string>('');
  const [savingOrgLanguage, setSavingOrgLanguage] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'general' | 'roles' | 'documents' | 'smtp' | 'api'>('general');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Länder-Liste
  const COUNTRIES = [
    { code: 'CO', name: t('countries.CO') },
    { code: 'CH', name: t('countries.CH') },
    { code: 'DE', name: t('countries.DE') },
    { code: 'AT', name: t('countries.AT') }
  ];

  // Lade Organisations-Daten wenn Modal geöffnet wird
  useEffect(() => {
    if (isOpen && organization) {
      const orgSettings = organization.settings || {};
      setFormData({
        displayName: organization.displayName || '',
        domain: organization.domain || '',
        logo: organization.logo || '',
        country: organization.country || null,
        nit: organization.nit || null,
        settings: orgSettings
      });
      
      // Setze Land direkt aus organization (statt aus settings)
      setSelectedCountry(organization.country || '');
      setNit(organization.nit || '');
      
      // Setze Logo-Preview wenn Logo vorhanden
      if (organization.logo) {
        setLogoPreview(organization.logo);
      } else {
        setLogoPreview(null);
      }
      setLogoFile(null);
      
      // Lade Organisation-Sprache
      const loadOrgLanguage = async () => {
        try {
          const langResponse = await organizationService.getOrganizationLanguage();
          setSelectedOrgLanguage(langResponse.language || '');
        } catch (langError) {
          console.error(t('organization.loadLanguageError'), langError);
          setSelectedOrgLanguage('');
        }
      };
      
      loadOrgLanguage();
    }
  }, [isOpen, organization, t]);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsLargeScreen(window.innerWidth > 1070);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // Sidepane-Status verwalten
  useEffect(() => {
    if (isOpen) {
      openSidepane();
    } else {
      closeSidepane();
    }
    
    return () => {
      closeSidepane();
    };
  }, [isOpen, openSidepane, closeSidepane]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'country') {
      setSelectedCountry(value);
      setFormData(prev => ({
        ...prev,
        country: value || null
      }));
      // Wenn Country nicht "CO" ist, NIT zurücksetzen
      if (value !== 'CO') {
        setNit('');
        setFormData(prev => ({
          ...prev,
          nit: null
        }));
      }
    } else if (name === 'nit') {
      setNit(value);
      setFormData(prev => ({
        ...prev,
        nit: value || null
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    // Fehler für dieses Feld löschen
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Prüfe Dateityp
    if (!file.type.match('image/(png|jpeg|jpg)')) {
      showMessage(t('organization.logoInvalidType') || 'Nur PNG und JPEG Dateien sind erlaubt', 'error');
      return;
    }

    // Prüfe Dateigröße (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage(t('organization.logoTooLarge') || 'Logo darf maximal 5MB groß sein', 'error');
      return;
    }

    setLogoFile(file);

    // Erstelle Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setLogoPreview(base64String);
      setFormData(prev => ({ ...prev, logo: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setErrors({});
      await organizationService.updateOrganization(formData);
      showMessage(t('organization.updateSuccess'), 'success');
      
      // User-Daten neu laden, damit das Logo im Header aktualisiert wird
      try {
        await fetchCurrentUser();
      } catch (error) {
        console.error('Fehler beim Neuladen der User-Daten:', error);
      }
      
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || t('organization.updateError');
      showMessage(errorMessage, 'error');
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Formular zurücksetzen
    if (organization) {
      const orgSettings = organization.settings || {};
      setFormData({
        displayName: organization.displayName || '',
        domain: organization.domain || '',
        logo: organization.logo || '',
        country: organization.country || null,
        nit: organization.nit || null,
        settings: orgSettings
      });
      setSelectedCountry(organization.country || '');
      setNit(organization.nit || '');
    }
    setErrors({});
    onClose();
  };

  // Für Mobile (unter 640px) - klassisches Modal
  if (isMobile) {
    return (
      <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <Dialog.Title className="text-lg font-semibold dark:text-white">
                {t('organization.edit.title')}
              </Dialog.Title>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              {errors.submit && (
                <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
                  {errors.submit}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label 
                    htmlFor="displayName" 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {t('organization.displayName')}
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    name="displayName"
                    value={formData.displayName || ''}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 ${
                      errors.displayName 
                        ? 'border-red-300 dark:border-red-600' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.displayName && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.displayName}</p>
                  )}
                </div>

                <div>
                  <label 
                    htmlFor="domain" 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {t('organization.domain')}
                  </label>
                  <input
                    type="text"
                    id="domain"
                    name="domain"
                    value={formData.domain || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                  />
                </div>

                <div>
                  <label 
                    htmlFor="logo-mobile" 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {t('organization.logo') || 'Logo'}
                  </label>
                  <input
                    type="file"
                    id="logo-mobile"
                    name="logo"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleLogoFileChange}
                    className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      dark:file:bg-blue-900 dark:file:text-blue-300
                      dark:hover:file:bg-blue-800"
                  />
                  {logoPreview && (
                    <div className="mt-2">
                      <img 
                        src={logoPreview} 
                        alt="Logo Preview" 
                        className="h-20 w-auto border border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>
                  )}
                  {formData.logo && !logoPreview && (
                    <div className="mt-2">
                      <img 
                        src={formData.logo} 
                        alt="Current Logo" 
                        className="h-20 w-auto border border-gray-300 dark:border-gray-600 rounded"
                      />
                    </div>
                  )}
                </div>

                {/* Land */}
                <div className="border-t pt-4">
                  <label 
                    htmlFor="country" 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {t('organization.country')}
                  </label>
                  <select
                    id="country"
                    name="country"
                    value={selectedCountry}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                  >
                    <option value="">{t('organization.selectCountry')}</option>
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Organisation-Sprache */}
                <div className="border-t pt-4">
                  <label 
                    htmlFor="organizationLanguage" 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {t('organization.language')}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {t('organization.languageDescription')}
                  </p>
                  <select
                    id="organizationLanguage"
                    value={selectedOrgLanguage || organizationLanguage || ''}
                    onChange={async (e) => {
                      const newLanguage = e.target.value;
                      setSelectedOrgLanguage(newLanguage);
                      if (newLanguage && newLanguage !== organizationLanguage) {
                        setSavingOrgLanguage(true);
                        try {
                          await setOrganizationLanguage(newLanguage);
                          showMessage(t('common.save'), 'success');
                        } catch (error) {
                          console.error(t('organization.saveLanguageError'), error);
                          showMessage(t('worktime.messages.orgLanguageError'), 'error');
                        } finally {
                          setSavingOrgLanguage(false);
                        }
                      }
                    }}
                    disabled={savingOrgLanguage || loading}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                  >
                    <option value="">{t('settings.useOrganizationLanguage')} ({t('worktime.language.fallback')}: {t('worktime.language.german')})</option>
                    <option value="de">{t('worktime.language.german')}</option>
                    <option value="es">{t('worktime.language.spanish')}</option>
                    <option value="en">{t('worktime.language.english')}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4 gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  title={t('common.cancel')}
                >
                  <XMarkIcon className="h-5 w-5" />
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
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  }

  // Für Desktop (ab 640px) - Sidepane
  // WICHTIG: Sidepane muss IMMER gerendert bleiben für Transition
  return (
    <>
      {/* Backdrop - nur wenn offen und <= 1070px */}
      {isOpen && !isLargeScreen && (
        <div 
          className="fixed inset-0 bg-black/10 transition-opacity sidepane-overlay sidepane-backdrop z-40" 
          aria-hidden="true" 
          onClick={handleClose}
          style={{
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 300ms ease-out'
          }}
        />
      )}
      
      {/* Sidepane - IMMER gerendert, Position wird via Transform geändert */}
      <div 
        className={`fixed top-16 bottom-0 right-0 max-w-sm w-full bg-white dark:bg-gray-800 shadow-xl sidepane-panel sidepane-panel-container transform z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          transition: 'transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
        aria-hidden={!isOpen}
        role="dialog"
        aria-modal={isOpen}
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold dark:text-white">
            {t('organization.edit.title')}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-4 px-4" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`${
                activeTab === 'general'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              {t('organization.tabs.general')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`${
                activeTab === 'roles'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              {t('organization.tabs.roles')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              {t('organization.tabs.documents')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('smtp')}
              className={`${
                activeTab === 'smtp'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              {t('organization.tabs.smtp')}
            </button>
            {selectedCountry === 'CO' && (
              <button
                type="button"
                onClick={() => setActiveTab('api')}
                className={`${
                  activeTab === 'api'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
              >
                {t('organization.tabs.api')}
              </button>
            )}
          </nav>
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {errors.submit && (
            <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
              {errors.submit}
            </div>
          )}

          {activeTab === 'general' && (
            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label 
                htmlFor="displayName" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('organization.displayName')}
              </label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName || ''}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 ${
                  errors.displayName 
                    ? 'border-red-300 dark:border-red-600' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.displayName && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.displayName}</p>
              )}
            </div>

            <div>
              <label 
                htmlFor="domain" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('organization.domain')}
              </label>
              <input
                type="text"
                id="domain"
                name="domain"
                value={formData.domain || ''}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
              />
            </div>

            <div>
              <label 
                htmlFor="logo" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('organization.logo') || 'Logo'}
              </label>
              <input
                type="file"
                id="logo"
                name="logo"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleLogoFileChange}
                className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  dark:file:bg-blue-900 dark:file:text-blue-300
                  dark:hover:file:bg-blue-800"
              />
              {logoPreview && (
                <div className="mt-2">
                  <img 
                    src={logoPreview} 
                    alt="Logo Preview" 
                    className="h-20 w-auto border border-gray-300 dark:border-gray-600 rounded"
                  />
                </div>
              )}
              {formData.logo && !logoPreview && (
                <div className="mt-2">
                  <img 
                    src={formData.logo} 
                    alt="Current Logo" 
                    className="h-20 w-auto border border-gray-300 dark:border-gray-600 rounded"
                  />
                </div>
              )}
            </div>

            {/* Land */}
            <div className="border-t pt-4">
              <label 
                htmlFor="country" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('organization.country')}
              </label>
              <select
                id="country"
                name="country"
                value={selectedCountry}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
              >
                <option value="">{t('organization.selectCountry')}</option>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            {/* NIT (nur für Kolumbien) */}
            {selectedCountry === 'CO' && (
              <div>
                <label 
                  htmlFor="nit" 
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {t('organization.nit')}
                </label>
                <input
                  type="text"
                  id="nit"
                  name="nit"
                  value={nit}
                  onChange={handleChange}
                  placeholder={t('organization.nitDescription')}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('organization.nitDescription')}
                </p>
              </div>
            )}

            {/* Organisation-Sprache */}
            <div className="border-t pt-4">
              <label 
                htmlFor="organizationLanguage" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('organization.language')}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {t('organization.languageDescription')}
              </p>
              <select
                id="organizationLanguage"
                value={selectedOrgLanguage || organizationLanguage || ''}
                onChange={async (e) => {
                  const newLanguage = e.target.value;
                  setSelectedOrgLanguage(newLanguage);
                  if (newLanguage && newLanguage !== organizationLanguage) {
                    setSavingOrgLanguage(true);
                    try {
                      await setOrganizationLanguage(newLanguage);
                      showMessage(t('common.save'), 'success');
                    } catch (error) {
                      console.error('Fehler beim Speichern der Organisation-Sprache:', error);
                      showMessage(t('worktime.messages.orgLanguageError'), 'error');
                    } finally {
                      setSavingOrgLanguage(false);
                    }
                  }
                }}
                disabled={savingOrgLanguage || loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              >
                <option value="">{t('settings.useOrganizationLanguage')} ({t('worktime.language.fallback')}: {t('worktime.language.german')})</option>
                <option value="de">{t('worktime.language.german')}</option>
                <option value="es">{t('worktime.language.spanish')}</option>
                <option value="en">{t('worktime.language.english')}</option>
              </select>
            </div>

              <div className="flex justify-end pt-4 gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  title={t('common.cancel')}
                >
                  <XMarkIcon className="h-5 w-5" />
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
          )}

          {activeTab === 'roles' && (
            <RoleConfigurationTab 
              organization={organization}
              onSave={() => {
                if (onSuccess) {
                  onSuccess();
                }
              }}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentConfigurationTab 
              organization={organization}
              onSave={() => {
                if (onSuccess) {
                  onSuccess();
                }
              }}
            />
          )}

          {activeTab === 'smtp' && (
            <SMTPConfigurationTab 
              organization={organization}
              onSave={() => {
                if (onSuccess) {
                  onSuccess();
                }
              }}
            />
          )}

          {activeTab === 'api' && selectedCountry === 'CO' && (
            <ApiConfigurationTab 
              organization={organization}
              onSave={() => {
                if (onSuccess) {
                  onSuccess();
                }
              }}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default EditOrganizationModal;

