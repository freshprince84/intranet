import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../../config/axios.ts';
import { API_ENDPOINTS } from '../../config/api.ts';
import useMessage from '../../hooks/useMessage.ts';

interface TourExportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    tourCount: number;
}

const TourExportDialog = ({ isOpen, onClose, tourCount }: TourExportDialogProps) => {
    const { t } = useTranslation();
    const { showMessage } = useMessage();
    
    const [selectedFields, setSelectedFields] = useState<string[]>([
        'id', 'title', 'description', 'type', 'price', 'currency', 'duration',
        'maxParticipants', 'minParticipants', 'location', 'meetingPoint',
        'imageUrl', 'galleryUrls', 'availableFrom', 'availableTo'
    ]);
    const [exporting, setExporting] = useState(false);
    const [format, setFormat] = useState<'json' | 'csv'>('json');

    const availableFields = [
        { id: 'id', label: t('tours.columns.title', 'Titel') },
        { id: 'title', label: t('tours.name', 'Titel') },
        { id: 'description', label: t('tours.description', 'Beschreibung') },
        { id: 'type', label: t('tours.type', 'Typ') },
        { id: 'price', label: t('tours.price', 'Preis') },
        { id: 'currency', label: t('tours.currency', 'Währung') },
        { id: 'duration', label: t('tours.duration', 'Dauer') },
        { id: 'maxParticipants', label: t('tours.maxParticipants', 'Max. Teilnehmer') },
        { id: 'minParticipants', label: t('tours.minParticipants', 'Min. Teilnehmer') },
        { id: 'location', label: t('tours.location', 'Ort') },
        { id: 'meetingPoint', label: t('tours.meetingPoint', 'Treffpunkt') },
        { id: 'includes', label: t('tours.includes', 'Enthält') },
        { id: 'excludes', label: t('tours.excludes', 'Nicht enthalten') },
        { id: 'requirements', label: t('tours.requirements', 'Anforderungen') },
        { id: 'imageUrl', label: t('tours.mainImage', 'Hauptbild') },
        { id: 'galleryUrls', label: t('tours.gallery', 'Galerie') },
        { id: 'availableFrom', label: t('tours.availableFrom', 'Verfügbar ab') },
        { id: 'availableTo', label: t('tours.availableTo', 'Verfügbar bis') },
        { id: 'externalBookingUrl', label: t('tours.externalBookingUrl', 'Externe Buchungs-URL') },
        { id: 'branch', label: t('tours.branch', 'Niederlassung') },
        { id: 'externalProvider', label: t('tours.externalProvider', 'Externer Anbieter') }
    ];

    const toggleField = (fieldId: string) => {
        setSelectedFields(prev =>
            prev.includes(fieldId)
                ? prev.filter(f => f !== fieldId)
                : [...prev, fieldId]
        );
    };

    const selectAll = () => {
        setSelectedFields(availableFields.map(f => f.id));
    };

    const deselectAll = () => {
        setSelectedFields([]);
    };

    const handleExport = async () => {
        if (selectedFields.length === 0) {
            showMessage(t('tours.export.noFieldsSelected', 'Bitte wählen Sie mindestens ein Feld aus'), 'error');
            return;
        }

        setExporting(true);
        try {
            const fieldsParam = selectedFields.join(',');
            const response = await axiosInstance.get(API_ENDPOINTS.TOURS.EXPORT, {
                params: { fields: fieldsParam }
            });

            const tours = response.data.tours || response.data;

            if (format === 'json') {
                // JSON-Export
                const blob = new Blob([JSON.stringify(tours, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tours-export-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } else {
                // CSV-Export
                if (!Array.isArray(tours) || tours.length === 0) {
                    showMessage(t('tours.export.noData', 'Keine Daten zum Exportieren'), 'warning');
                    return;
                }

                // CSV-Header
                const headers = selectedFields.map(fieldId => {
                    const field = availableFields.find(f => f.id === fieldId);
                    return field?.label || fieldId;
                });

                // CSV-Rows
                const rows = tours.map((tour: any) => {
                    return selectedFields.map(fieldId => {
                        let value = tour[fieldId];
                        if (value === null || value === undefined) return '';
                        if (typeof value === 'object') {
                            if (fieldId === 'branch') return value?.name || '';
                            if (fieldId === 'externalProvider') return value?.name || '';
                            if (fieldId === 'galleryUrls' && Array.isArray(value)) return value.join('; ');
                            return JSON.stringify(value);
                        }
                        if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
                        return String(value);
                    });
                });

                // CSV-String erstellen
                const csvContent = [
                    headers.join(','),
                    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                ].join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tours-export-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }

            showMessage(t('tours.export.success', 'Export erfolgreich'), 'success');
            onClose();
        } catch (err: any) {
            console.error('Fehler beim Exportieren:', err);
            showMessage(err.response?.data?.message || t('tours.export.error', 'Fehler beim Exportieren'), 'error');
        } finally {
            setExporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                            {t('tours.export.title', 'Touren exportieren')} ({tourCount})
                        </Dialog.Title>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Format-Auswahl */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('tours.export.format', 'Export-Format')}
                            </label>
                            <div className="flex gap-4">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="json"
                                        checked={format === 'json'}
                                        onChange={(e) => setFormat(e.target.value as 'json' | 'csv')}
                                        className="mr-2"
                                    />
                                    JSON
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        value="csv"
                                        checked={format === 'csv'}
                                        onChange={(e) => setFormat(e.target.value as 'json' | 'csv')}
                                        className="mr-2"
                                    />
                                    CSV
                                </label>
                            </div>
                        </div>

                        {/* Feldauswahl */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('tours.export.selectFields', 'Felder auswählen')}
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={selectAll}
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        {t('common.selectAll', 'Alle auswählen')}
                                    </button>
                                    <span className="text-gray-400">|</span>
                                    <button
                                        type="button"
                                        onClick={deselectAll}
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        {t('common.deselectAll', 'Alle abwählen')}
                                    </button>
                                </div>
                            </div>
                            <div className="border border-gray-300 dark:border-gray-600 rounded-md p-4 max-h-96 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-2">
                                    {availableFields.map(field => (
                                        <label key={field.id} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedFields.includes(field.id)}
                                                onChange={() => toggleField(field.id)}
                                                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                {field.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                            {t('common.cancel', 'Abbrechen')}
                        </button>
                        <button
                            type="button"
                            onClick={handleExport}
                            disabled={exporting || selectedFields.length === 0}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            {exporting ? t('common.exporting', 'Exportiere...') : t('common.export', 'Exportieren')}
                        </button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default TourExportDialog;

