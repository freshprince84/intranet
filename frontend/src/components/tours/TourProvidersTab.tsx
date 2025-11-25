import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../../config/api.ts';
import axiosInstance from '../../config/axios.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { TourProvider } from '../../types/tour.ts';
import CreateTourProviderModal from './CreateTourProviderModal.tsx';
import EditTourProviderModal from './EditTourProviderModal.tsx';
import useMessage from '../../hooks/useMessage.ts';

interface TourProvidersTabProps {
    onError: (error: string) => void;
}

// ProviderCard-Komponente für mobile und Desktop-Ansicht
const ProviderCard: React.FC<{
    provider: TourProvider;
    onEdit: (provider: TourProvider) => void;
    onDelete: (providerId: number) => void;
    canEdit: boolean;
    canDelete: boolean;
}> = ({ provider, onEdit, onDelete, canEdit, canDelete }) => {
    const { t } = useTranslation();
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
            {/* Header mit Provider-Name und Aktionen */}
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{provider.name}</h3>
                
                <div className="flex space-x-2">
                    {canEdit && (
                        <div className="relative group">
                            <button
                                onClick={() => onEdit(provider)}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1"
                            >
                                <PencilIcon className="h-5 w-5" />
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                {t('common.edit', { defaultValue: 'Bearbeiten' })}
                            </div>
                        </div>
                    )}
                    
                    {canDelete && (
                        <div className="relative group">
                            <button
                                onClick={() => onDelete(provider.id)}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1"
                            >
                                <TrashIcon className="h-5 w-5" />
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                {t('common.delete', { defaultValue: 'Löschen' })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Details */}
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {provider.contactPerson && (
                    <p>
                        <span className="font-medium">{t('tours.providers.contactPerson', { defaultValue: 'Ansprechpartner' })}:</span>{' '}
                        {provider.contactPerson}
                    </p>
                )}
                {provider.phone && (
                    <p>
                        <span className="font-medium">{t('tours.providers.phone', { defaultValue: 'Telefon' })}:</span>{' '}
                        {provider.phone}
                    </p>
                )}
                {provider.email && (
                    <p>
                        <span className="font-medium">{t('tours.providers.email', { defaultValue: 'E-Mail' })}:</span>{' '}
                        {provider.email}
                    </p>
                )}
                {provider.notes && (
                    <p className="mt-2 text-xs">
                        <span className="font-medium">{t('tours.providers.notes', { defaultValue: 'Notizen' })}:</span>{' '}
                        {provider.notes}
                    </p>
                )}
            </div>
        </div>
    );
};

const TourProvidersTab: React.FC<TourProvidersTabProps> = ({ onError }) => {
    const { t } = useTranslation();
    const { showMessage } = useMessage();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProvider, setEditingProvider] = useState<TourProvider | null>(null);
    const [providers, setProviders] = useState<TourProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { hasPermission } = usePermissions();

    // Berechtigungen prüfen
    const canCreate = hasPermission('tour_providers', 'write', 'table');
    const canEdit = hasPermission('tour_providers', 'write', 'table');
    const canDelete = hasPermission('tour_providers', 'write', 'table');

    // Providers laden
    const fetchProviders = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get(API_ENDPOINTS.TOUR_PROVIDERS.BASE);
            const data = response.data?.data || response.data || [];
            setProviders(Array.isArray(data) ? data : []);
        } catch (error: any) {
            console.error('Fehler beim Laden der Tour-Provider:', error);
            const errorMessage = error.response?.data?.message || t('tours.providers.loadError', { defaultValue: 'Fehler beim Laden der Provider' });
            onError(errorMessage);
            showMessage(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    }, [onError, t, showMessage]);

    useEffect(() => {
        fetchProviders();
    }, [fetchProviders]);

    // Gefilterte Provider
    const filteredProviders = providers.filter(provider => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            provider.name.toLowerCase().includes(search) ||
            provider.contactPerson?.toLowerCase().includes(search) ||
            provider.phone?.toLowerCase().includes(search) ||
            provider.email?.toLowerCase().includes(search) ||
            provider.notes?.toLowerCase().includes(search)
        );
    });

    // Handler für Create
    const handleCreate = () => {
        setIsCreateModalOpen(true);
    };

    // Handler für Edit
    const handleEdit = (provider: TourProvider) => {
        setEditingProvider(provider);
        setIsEditModalOpen(true);
    };

    // Handler für Delete
    const handleDelete = async (providerId: number) => {
        if (!window.confirm(t('tours.providers.deleteConfirm', { defaultValue: 'Möchten Sie diesen Provider wirklich löschen?' }))) {
            return;
        }

        try {
            await axiosInstance.delete(API_ENDPOINTS.TOUR_PROVIDERS.BY_ID(providerId));
            showMessage(
                t('tours.providers.deleted', { defaultValue: 'Tour-Provider erfolgreich gelöscht' }),
                'success'
            );
            fetchProviders();
        } catch (error: any) {
            console.error('Fehler beim Löschen des Providers:', error);
            const errorMessage = error.response?.data?.message || t('errors.unknownError');
            onError(errorMessage);
            showMessage(errorMessage, 'error');
        }
    };

    // Handler für Provider erstellt
    const handleProviderCreated = (newProvider: TourProvider) => {
        fetchProviders();
    };

    // Handler für Provider aktualisiert
    const handleProviderUpdated = (updatedProvider: TourProvider) => {
        fetchProviders();
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="text-gray-500 dark:text-gray-400">{t('common.loading', { defaultValue: 'Lade...' })}</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header mit Suche und Create-Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1 w-full sm:max-w-md">
                    <input
                        type="text"
                        placeholder={t('tours.providers.search', { defaultValue: 'Provider suchen...' })}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                {canCreate && (
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                        <PlusIcon className="h-5 w-5" />
                        {t('tours.providers.create', { defaultValue: 'Neuer Provider' })}
                    </button>
                )}
            </div>

            {/* Provider-Liste */}
            {filteredProviders.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    {searchTerm
                        ? t('tours.providers.noResults', { defaultValue: 'Keine Provider gefunden' })
                        : t('tours.providers.empty', { defaultValue: 'Keine Tour-Provider vorhanden' })}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProviders.map(provider => (
                        <ProviderCard
                            key={provider.id}
                            provider={provider}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            canEdit={canEdit}
                            canDelete={canDelete}
                        />
                    ))}
                </div>
            )}

            {/* Modals */}
            <CreateTourProviderModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onProviderCreated={handleProviderCreated}
            />
            <EditTourProviderModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingProvider(null);
                }}
                provider={editingProvider}
                onProviderUpdated={handleProviderUpdated}
            />
        </div>
    );
};

export default TourProvidersTab;

