import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../../config/api.ts';
import { useAuth } from '../../hooks/useAuth.tsx';
import { TourProvider } from '../../types/tour.ts';
import useMessage from '../../hooks/useMessage.ts';

interface Branch {
    id: number;
    name: string;
}

interface EditTourProviderModalProps {
    isOpen: boolean;
    onClose: () => void;
    provider: TourProvider | null;
    onProviderUpdated: (updatedProvider: TourProvider) => void;
}

const EditTourProviderModal = ({ isOpen, onClose, provider, onProviderUpdated }: EditTourProviderModalProps) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { showMessage } = useMessage();
    
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [notes, setNotes] = useState('');
    const [branchId, setBranchId] = useState<number | ''>('');
    
    const [branches, setBranches] = useState<Branch[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);

    // Lade Branches und setze Form-Daten
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoadingData(true);
                const branchesRes = await axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE);
                setBranches(branchesRes.data?.data || branchesRes.data || []);
            } catch (err: any) {
                console.error('Fehler beim Laden der Daten:', err);
                showMessage(t('errors.loadError'), 'error');
            } finally {
                setLoadingData(false);
            }
        };
        
        if (isOpen) {
            loadData();
        }
    }, [isOpen, t, showMessage]);

    // Setze Form-Daten wenn Provider geladen wird
    useEffect(() => {
        if (provider) {
            setName(provider.name || '');
            setPhone(provider.phone || '');
            setEmail(provider.email || '');
            setContactPerson(provider.contactPerson || '');
            setNotes(provider.notes || '');
            setBranchId(provider.branchId || '');
        } else {
            setName('');
            setPhone('');
            setEmail('');
            setContactPerson('');
            setNotes('');
            setBranchId('');
        }
        setError(null);
    }, [provider, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!provider) return;
        setError(null);

        // Validierung
        if (!name.trim()) {
            setError(t('tours.providers.validation.nameRequired', { defaultValue: 'Name ist erforderlich' }));
            return;
        }

        setLoading(true);
        try {
            const response = await axiosInstance.put(API_ENDPOINTS.TOUR_PROVIDERS.BY_ID(provider.id), {
                name: name.trim(),
                phone: phone.trim() || null,
                email: email.trim() || null,
                contactPerson: contactPerson.trim() || null,
                notes: notes.trim() || null,
                branchId: branchId ? Number(branchId) : null
            });

            if (response.data?.success && response.data?.data) {
                showMessage(
                    t('tours.providers.updated', { defaultValue: 'Tour-Provider erfolgreich aktualisiert' }),
                    'success'
                );
                onProviderUpdated(response.data.data);
                onClose();
            } else {
                throw new Error(response.data?.message || 'Fehler beim Aktualisieren des Providers');
            }
        } catch (err: any) {
            console.error('Fehler beim Aktualisieren des Providers:', err);
            const errorMessage = err.response?.data?.message || err.message || t('errors.unknownError');
            setError(errorMessage);
            showMessage(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!provider) return null;

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                            {t('tours.providers.edit', { defaultValue: 'Tour-Provider bearbeiten' })}
                        </Dialog.Title>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('tours.providers.name', { defaultValue: 'Name' })} *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                disabled={loading || loadingData}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('tours.providers.contactPerson', { defaultValue: 'Ansprechpartner' })}
                            </label>
                            <input
                                type="text"
                                value={contactPerson}
                                onChange={(e) => setContactPerson(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={loading || loadingData}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('tours.providers.phone', { defaultValue: 'Telefon' })}
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={loading || loadingData}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('tours.providers.email', { defaultValue: 'E-Mail' })}
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={loading || loadingData}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('tours.providers.branch', { defaultValue: 'Niederlassung' })}
                            </label>
                            <select
                                value={branchId}
                                onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : '')}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={loading || loadingData}
                            >
                                <option value="">{t('common.all', { defaultValue: 'Alle' })}</option>
                                {branches.map(branch => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('tours.providers.notes', { defaultValue: 'Notizen' })}
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={loading || loadingData}
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                                title={t('common.cancel', 'Abbrechen')}
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                            <button
                                type="submit"
                                disabled={loading || loadingData}
                                className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
                                title={loading ? t('common.saving', 'Speichere...') : t('common.save', 'Speichern')}
                            >
                                <CheckIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default EditTourProviderModal;

