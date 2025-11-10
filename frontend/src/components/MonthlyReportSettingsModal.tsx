import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { MonthlyReportSettings } from '../types/monthlyConsultationReport.ts';
import { toast } from 'react-toastify';

interface MonthlyReportSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (settings: MonthlyReportSettings) => Promise<void>;
    currentSettings: MonthlyReportSettings;
}

const MonthlyReportSettingsModal: React.FC<MonthlyReportSettingsModalProps> = ({
    isOpen,
    onClose,
    onSave,
    currentSettings
}) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState<MonthlyReportSettings>({
        monthlyReportEnabled: true, // Wird aktiviert
        monthlyReportDay: currentSettings.monthlyReportDay || 25,
        monthlyReportRecipient: currentSettings.monthlyReportRecipient || ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        
        if (!formData.monthlyReportRecipient.trim()) {
            newErrors.monthlyReportRecipient = 'Rechnungsempfänger ist erforderlich';
        }
        
        if (formData.monthlyReportDay < 1 || formData.monthlyReportDay > 28) {
            newErrors.monthlyReportDay = 'Abrechnungstag muss zwischen 1 und 28 liegen';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        
        try {
            setIsSaving(true);
            await onSave(formData);
            toast.success('Monatsabrechnungs-Einstellungen gespeichert');
            onClose();
        } catch (error) {
            toast.error('Fehler beim Speichern der Einstellungen');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset form data
        setFormData({
            monthlyReportEnabled: true,
            monthlyReportDay: currentSettings.monthlyReportDay || 25,
            monthlyReportRecipient: currentSettings.monthlyReportRecipient || ''
        });
        setErrors({});
        onClose();
    };

    const handleChange = (field: keyof MonthlyReportSettings, value: boolean | number | string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Fehler für dieses Feld löschen
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    return (
        <Dialog open={isOpen} onClose={handleCancel} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                    <div className="p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                                Automatische Monatsabrechnung einrichten
                            </Dialog.Title>
                            <button
                                onClick={handleCancel}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Info-Text */}
                        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                Konfigurieren Sie die automatische Generierung von monatlichen Beratungsabrechnungen. 
                                Diese werden automatisch am gewählten Tag des Monats erstellt und an den angegebenen Empfänger adressiert.
                            </p>
                        </div>

                        {/* Form */}
                        <div className="space-y-4">
                            {/* Abrechnungstag */}
                            <div>
                                <label htmlFor="monthlyReportDay" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Abrechnungstag im Monat
                                </label>
                                <select
                                    id="monthlyReportDay"
                                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                                        errors.monthlyReportDay 
                                            ? 'border-red-300 dark:border-red-600' 
                                            : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    value={formData.monthlyReportDay}
                                    onChange={(e) => handleChange('monthlyReportDay', parseInt(e.target.value))}
                                >
                                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                                        <option key={day} value={day}>{day}.</option>
                                    ))}
                                </select>
                                {errors.monthlyReportDay && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.monthlyReportDay}</p>
                                )}
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Tag im Monat, an dem die Abrechnung automatisch erstellt wird (1-28)
                                </p>
                            </div>

                            {/* Rechnungsempfänger */}
                            <div>
                                <label htmlFor="monthlyReportRecipient" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Rechnungsempfänger *
                                </label>
                                <textarea
                                    id="monthlyReportRecipient"
                                    rows={3}
                                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                                        errors.monthlyReportRecipient 
                                            ? 'border-red-300 dark:border-red-600' 
                                            : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                    value={formData.monthlyReportRecipient}
                                    onChange={(e) => handleChange('monthlyReportRecipient', e.target.value)}
                                    placeholder={t('monthlyReport.exampleAddress')}
                                />
                                {errors.monthlyReportRecipient && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.monthlyReportRecipient}</p>
                                )}
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {t('monthlyReport.recipientDescription')}
                                </p>
                            </div>
                        </div>

                        {/* Vorschau */}
                        {formData.monthlyReportRecipient.trim() && (
                            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t('monthlyReport.preview')}</h4>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    <p>
                                        📅 <strong>{t('monthlyReport.billingPeriod')}</strong> {formData.monthlyReportDay}. des Vormonats bis {formData.monthlyReportDay - 1}. des aktuellen Monats
                                    </p>
                                    <p className="mt-1">
                                        📧 <strong>{t('monthlyReport.recipient')}:</strong>
                                    </p>
                                    <div className="ml-4 mt-1 font-mono text-xs bg-white dark:bg-gray-800 p-2 rounded border">
                                        {formData.monthlyReportRecipient.split('\n').map((line, index) => (
                                            <div key={index}>{line}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="mt-6 flex items-center justify-end space-x-3">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                                title={t('common.cancel')}
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !formData.monthlyReportRecipient.trim()}
                                className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={isSaving ? 'Speichere...' : 'Aktivieren'}
                            >
                                {isSaving ? (
                                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                ) : (
                                    <CheckIcon className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default MonthlyReportSettingsModal; 