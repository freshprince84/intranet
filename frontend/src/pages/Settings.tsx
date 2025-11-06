import React, { useState, useEffect, useRef } from 'react';
import { CogIcon, UserIcon, BellIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useLanguage } from '../hooks/useLanguage.ts';
import useMessage from '../hooks/useMessage.ts';
import { MonthlyReportSettings } from '../types/monthlyConsultationReport.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { toast } from 'react-toastify';
import { useTheme } from '../contexts/ThemeContext.tsx';
import { Cog6ToothIcon, UserCircleIcon, ComputerDesktopIcon, DocumentArrowUpIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import NotificationSettingsComponent from '../components/NotificationSettings.tsx';
import MonthlyReportSettingsModal from '../components/MonthlyReportSettingsModal.tsx';
import DatabaseManagement from '../components/DatabaseManagement.tsx';
import { API_URL } from '../config/api.ts';

const Settings: React.FC = () => {
    const { user } = useAuth();
    const { isAdmin } = usePermissions();
    const { isDarkMode, toggleDarkMode } = useTheme();
    const { showMessage } = useMessage();
    const { t } = useTranslation();
    const { activeLanguage, organizationLanguage, setUserLanguage, isLoading: languageLoading } = useLanguage();
    const [selectedLanguage, setSelectedLanguage] = useState<string>('');
    const [savingLanguage, setSavingLanguage] = useState<boolean>(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    // Tab-Zustand für Navigation zwischen den Einstellungen
    const [activeTab, setActiveTab] = useState<'personal' | 'notifications' | 'system'>('personal');
    
    // Monatsabrechnungs-Einstellungen
    const [monthlyReportSettings, setMonthlyReportSettings] = useState<MonthlyReportSettings>({
        monthlyReportEnabled: false,
        monthlyReportDay: 25,
        monthlyReportRecipient: ''
    });
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [isMonthlyReportModalOpen, setIsMonthlyReportModalOpen] = useState(false);

    // Debug-Ausgaben
    useEffect(() => {
        console.log('User:', user);
        console.log('Is Admin:', isAdmin());
        console.log('User Roles:', user?.roles);
    }, [user, isAdmin]);

    // Monatsabrechnungs-Einstellungen laden
    useEffect(() => {
        const loadMonthlyReportSettings = async () => {
            if (!user?.invoiceSettings) {
                setIsLoadingSettings(false);
                return;
            }

            try {
                setMonthlyReportSettings({
                    monthlyReportEnabled: user.invoiceSettings.monthlyReportEnabled || false,
                    monthlyReportDay: user.invoiceSettings.monthlyReportDay || 25,
                    monthlyReportRecipient: user.invoiceSettings.monthlyReportRecipient || ''
                });
            } catch (error) {
                console.error('Fehler beim Laden der Monatsabrechnungs-Einstellungen:', error);
                showMessage(t('errors.loadSettingsError'), 'error');
            } finally {
                setIsLoadingSettings(false);
            }
        };

        loadMonthlyReportSettings();
    }, [user, showMessage]);

    // Toggle für Monthly Report - öffnet Modal bei Aktivierung
    const handleMonthlyReportToggle = (enabled: boolean) => {
        if (enabled) {
            // Aktivierung: Modal öffnen
            setIsMonthlyReportModalOpen(true);
        } else {
            // Deaktivierung: Direkt speichern
            updateMonthlyReportSettings({
                monthlyReportEnabled: false,
                monthlyReportDay: monthlyReportSettings.monthlyReportDay,
                monthlyReportRecipient: monthlyReportSettings.monthlyReportRecipient
            });
        }
    };

    // Alle Monthly Report Settings auf einmal speichern
    const updateMonthlyReportSettings = async (settings: MonthlyReportSettings) => {
        try {
            // Alle Felder auf einmal senden
            await axiosInstance.put(API_ENDPOINTS.USERS.INVOICE_SETTINGS, {
                monthlyReportEnabled: settings.monthlyReportEnabled,
                monthlyReportDay: settings.monthlyReportDay,
                monthlyReportRecipient: settings.monthlyReportRecipient
            });
            
            // Lokalen State aktualisieren
            setMonthlyReportSettings(settings);
            
            // Erfolg-Toast (nur bei Deaktivierung, bei Aktivierung macht das Modal den Toast)
            if (!settings.monthlyReportEnabled) {
                toast.success(t('settings.monthlyReportDisabled'));
            }
            } catch (error) {
                console.error('Fehler beim Speichern der Monatsabrechnungs-Einstellungen:', error);
                toast.error(t('errors.saveMonthlyReportSettingsError'));
            throw error; // Für Modal error handling
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
                setError(t('settings.fileUploadError'));
                showMessage(t('settings.fileUploadError'), 'error');
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB
                setError(t('settings.fileSizeError'));
                showMessage(t('settings.fileSizeError'), 'error');
                return;
            }
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setError(null);
            
            // Automatisch nach Auswahl hochladen
            uploadFile(file);
        }
    };
    
    // Separate uploadFile Funktion für bessere Übersichtlichkeit
    const uploadFile = async (file: File) => {
        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('logo', file);

        try {
            console.log('Starting upload...');
            console.log('Selected file:', file);
            const token = localStorage.getItem('token');
            console.log('Token verfügbar:', !!token);

            // Headers für die Authentifizierung, aber kein Content-Type
            const headers: HeadersInit = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_URL}/settings/logo`, {
                method: 'POST',
                body: formData,
                headers
                // 'credentials: include' entfernt, um CORS-Probleme zu vermeiden
            });

            console.log('Response Status:', response.status);
            const responseText = await response.text();
            console.log('Response Text:', responseText);

            if (!response.ok) {
                throw new Error(responseText || t('errors.uploadFailed'));
            }

            try {
                const responseData = JSON.parse(responseText);
                console.log('Response Data:', responseData);
                showMessage(t('settings.logoUploadSuccess'), 'success');
                
                // Favicon nach Upload aktualisieren
                const faviconLink = document.getElementById('favicon') as HTMLLinkElement;
                if (faviconLink) {
                    // Füge einen Zeitstempel hinzu, um das Caching zu verhindern
                    const timestamp = new Date().getTime();
                    try {
                        const base64Response = await fetch(`${API_URL}/settings/logo/base64`);
                        if (base64Response.ok) {
                            const data = await base64Response.json();
                            faviconLink.href = data.logo;
                        }
                    } catch (error) {
                        console.error('Favicon konnte nicht aktualisiert werden:', error);
                    }
                }
            } catch (parseError) {
                console.error('Fehler beim Parsen der Antwort:', parseError);
                throw new Error(t('errors.invalidResponseFormat'));
            }
            
            // Preview zurücksetzen
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (err) {
            console.error('Upload error:', err);
                const errorMessage = t('settings.logoUploadError') + ': ' + (err instanceof Error ? err.message : t('errors.unknownError'));
                setError(errorMessage);
                showMessage(errorMessage, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    // Tab-Wechsel Handler - Fehler beim Wechsel zurücksetzen
    const handleTabChange = (tab: 'personal' | 'notifications' | 'system') => {
        setActiveTab(tab);
        setError(null);
    };

    // Wenn kein Benutzer oder Berechtigungen geladen werden
    if (!user) {
        return <div>{t('common.loading')}</div>;
    }

    return (
        <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
                {/* Header mit Icon */}
                <div className="flex items-center mb-6">
                    <Cog6ToothIcon className="h-6 w-6 mr-2" />
                    <h2 className="text-xl font-semibold">{t('settings.title')}</h2>
                </div>
                
                {/* Tabs für Navigation */}
                <div className="border-b border-gray-200 dark:border-gray-700 -mx-6 px-6 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            className={`${
                                activeTab === 'personal'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                            onClick={() => handleTabChange('personal')}
                        >
                            <UserCircleIcon className="h-4 w-4 mr-2" />
                            {t('settings.personal')}
                        </button>
                        <button
                            className={`${
                                activeTab === 'notifications'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                            onClick={() => handleTabChange('notifications')}
                        >
                            <BellIcon className="h-4 w-4 mr-2" />
                            {t('settings.notifications')}
                        </button>
                        <button
                            className={`${
                                activeTab === 'system'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                            onClick={() => handleTabChange('system')}
                        >
                            <ComputerDesktopIcon className="h-4 w-4 mr-2" />
                            {t('settings.system')}
                        </button>
                    </nav>
                </div>

                {/* Tab-Inhalte */}
                {activeTab === 'personal' && (
                    <div className="space-y-6">
                        {/* Sprache */}
                        <div className="flex items-center justify-between border-b pb-6">
                            <div className="flex-1">
                                <h3 className="text-lg font-medium dark:text-white">{t('settings.language')}</h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                                    {t('settings.userLanguage')}
                                    {organizationLanguage && (
                                        <span className="block mt-1 text-xs">
                                            {t('settings.organizationLanguage')}: {organizationLanguage === 'de' ? t('worktime.language.german') : organizationLanguage === 'es' ? t('worktime.language.spanish') : t('worktime.language.english')}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <select
                                value={selectedLanguage || activeLanguage || (user?.language || '') || ''}
                                onChange={async (e) => {
                                    const newLanguage = e.target.value;
                                    setSelectedLanguage(newLanguage);
                                    if (newLanguage && newLanguage !== activeLanguage) {
                                        setSavingLanguage(true);
                                        try {
                                            await setUserLanguage(newLanguage);
                                            showMessage(t('common.save'), 'success');
                                        } catch (error) {
                                            console.error('Fehler beim Speichern der Sprache:', error);
                                            showMessage(t('errors.saveLanguageError'), 'error');
                                        } finally {
                                            setSavingLanguage(false);
                                        }
                                    }
                                }}
                                disabled={savingLanguage || languageLoading}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white ml-4"
                            >
                                <option value="">{t('settings.useOrganizationLanguage')}</option>
                                <option value="de">{t('worktime.language.german')}</option>
                                <option value="es">{t('worktime.language.spanish')}</option>
                                <option value="en">{t('worktime.language.english')}</option>
                            </select>
                        </div>

                        {/* Dark Mode */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-medium dark:text-white">{t('settings.darkMode')}</h3>
                                <p className="text-gray-600 dark:text-gray-400">{t('settings.darkModeDescription')}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isDarkMode}
                                    onChange={toggleDarkMode}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {/* Monatsabrechnungs-Einstellungen */}
                        <div className="border-t pt-6">
                            {isLoadingSettings ? (
                                <div className="text-gray-500 dark:text-gray-400">{t('settings.loadingSettings')}</div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Toggle für Monthly Report (wie Dark Mode) */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-medium dark:text-white">{t('settings.monthlyReport')}</h3>
                                            <p className="text-gray-600 dark:text-gray-400">
                                                {t('settings.monthlyReportDescription')}
                                                {monthlyReportSettings.monthlyReportEnabled && monthlyReportSettings.monthlyReportRecipient && (
                                                    <span className="block text-sm text-green-600 dark:text-green-400 mt-1">
                                                        ✓ {t('settings.monthlyReportEnabled')} {monthlyReportSettings.monthlyReportRecipient.split('\n')[0]}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={monthlyReportSettings.monthlyReportEnabled}
                                                onChange={(e) => handleMonthlyReportToggle(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="space-y-4">
                        <div className="p-0 -mt-4">
                            <NotificationSettingsComponent />
                        </div>
                    </div>
                )}

                {activeTab === 'system' && (
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-medium mb-2 dark:text-white">{t('settings.logoUpload')}</h3>
                                <p className="text-gray-600 dark:text-gray-400">{t('settings.logoUploadDescription')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    disabled={isUploading}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title={isUploading ? t('settings.logoUploading') : t('settings.logoUploadButton')}
                                >
                                    {isUploading ? (
                                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <DocumentArrowUpIcon className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-600 dark:text-red-400 text-sm mt-2">
                                {error}
                            </div>
                        )}

                        {previewUrl && (
                            <div className="mt-4">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('settings.logoPreview')}</p>
                                <img
                                    src={previewUrl}
                                    alt="Logo Vorschau"
                                    className="max-w-xs h-auto rounded-lg shadow-sm"
                                />
                            </div>
                        )}

                        <div className="border-t pt-6">
                            <h3 className="text-lg font-medium mb-4 dark:text-white">{t('settings.uploadDirectories')}</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="taskAttachmentsPath" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('settings.taskAttachmentsPath')}
                                    </label>
                                    <input
                                        type="text"
                                        id="taskAttachmentsPath"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                        defaultValue="uploads/task-attachments"
                                        placeholder={t('settings.taskAttachmentsPathPlaceholder')}
                                    />
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        {t('settings.taskAttachmentsPathDescription')}
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="requestAttachmentsPath" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t('settings.requestAttachmentsPath')}
                                    </label>
                                    <input
                                        type="text"
                                        id="requestAttachmentsPath"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                        defaultValue="uploads/request-attachments"
                                        placeholder={t('settings.requestAttachmentsPathPlaceholder')}
                                    />
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        {t('settings.requestAttachmentsPathDescription')}
                                    </p>
                                </div>

                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            setIsSaving(true);
                                            try {
                                                const taskPath = (document.getElementById('taskAttachmentsPath') as HTMLInputElement)?.value;
                                                const requestPath = (document.getElementById('requestAttachmentsPath') as HTMLInputElement)?.value;
                                                
                                                // TODO: API-Call zum Speichern der Pfade implementieren
                                                await new Promise(resolve => setTimeout(resolve, 500)); // Placeholder
                                                
                                                toast.success(t('settings.saveDirectoriesSuccess'));
                                            } catch (error) {
                                                console.error('Fehler beim Speichern der Upload-Verzeichnisse:', error);
                                                toast.error(t('errors.saveUploadDirectoriesError'));
                                            } finally {
                                                setIsSaving(false);
                                            }
                                        }}
                                        disabled={isSaving}
                                        className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        title={isSaving ? t('settings.savingDirectories') : t('settings.saveDirectories')}
                                    >
                                        {isSaving ? (
                                            <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <CheckIcon className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Database Management Section */}
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-medium mb-4 dark:text-white">{t('settings.databaseManagement')}</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                {t('settings.databaseManagementDescription')}
                            </p>
                            <DatabaseManagement />
                        </div>
                    </div>
                )}
            </div>

            {/* Monthly Report Settings Modal */}
            <MonthlyReportSettingsModal
                isOpen={isMonthlyReportModalOpen}
                onClose={() => setIsMonthlyReportModalOpen(false)}
                onSave={updateMonthlyReportSettings}
                currentSettings={monthlyReportSettings}
            />
        </div>
    );
};

export default Settings; 