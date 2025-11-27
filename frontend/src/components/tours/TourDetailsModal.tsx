import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, MapPinIcon, ClockIcon, UsersIcon, CurrencyDollarIcon, BuildingOfficeIcon, UserIcon, PlusIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../../config/api.ts';
import { Tour, TourType, TourBooking } from '../../types/tour.ts';
import useMessage from '../../hooks/useMessage.ts';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import CreateTourBookingModal from './CreateTourBookingModal.tsx';
import { usePermissions } from '../../hooks/usePermissions.ts';

interface TourDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tourId: number;
    onTourUpdated?: (updatedTour: Tour) => void;
}

const TourDetailsModal = ({ isOpen, onClose, tourId, onTourUpdated }: TourDetailsModalProps) => {
    const { t } = useTranslation();
    const { showMessage } = useMessage();
    const [tour, setTour] = useState<Tour | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && tourId) {
            loadTour();
        }
    }, [isOpen, tourId]);

    const loadTour = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axiosInstance.get(API_ENDPOINTS.TOURS.BY_ID(tourId));
            if (response.data.success) {
                setTour(response.data.data);
            } else {
                setError(response.data.message || t('errors.loadError'));
            }
        } catch (err: any) {
            console.error('Fehler beim Laden der Tour:', err);
            const errorMessage = err.response?.data?.message || t('errors.loadError');
            setError(errorMessage);
            showMessage(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                            {t('tours.details', 'Tour-Details')}
                        </Dialog.Title>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="p-6">
                        {loading ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                {t('common.loading')}
                            </div>
                        ) : error ? (
                            <div className="text-center py-8 text-red-500 dark:text-red-400">
                                {error}
                            </div>
                        ) : !tour ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                {t('tours.notFound', 'Tour nicht gefunden')}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Header */}
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                        {tour.title}
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 text-sm rounded-full ${
                                            tour.type === TourType.OWN
                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                        }`}>
                                            {tour.type === TourType.OWN ? t('tours.typeOwn') : t('tours.typeExternal')}
                                        </span>
                                        <span className={`px-3 py-1 text-sm rounded-full ${
                                            tour.isActive
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                        }`}>
                                            {tour.isActive ? t('tours.statusActive') : t('tours.statusInactive')}
                                        </span>
                                    </div>
                                </div>

                                {/* Beschreibung */}
                                {tour.description && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                            {t('tours.description')}
                                        </h3>
                                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                            {tour.description}
                                        </p>
                                    </div>
                                )}

                                {/* Tour-Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Linke Spalte */}
                                    <div className="space-y-4">
                                        {tour.duration && (
                                            <div className="flex items-start gap-3">
                                                <ClockIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t('tours.duration')}
                                                    </div>
                                                    <div className="text-gray-900 dark:text-white">
                                                        {tour.duration} {t('common.hours', 'h')}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {(tour.minParticipants || tour.maxParticipants) && (
                                            <div className="flex items-start gap-3">
                                                <UsersIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t('tours.participants', 'Teilnehmer')}
                                                    </div>
                                                    <div className="text-gray-900 dark:text-white">
                                                        {tour.minParticipants && tour.maxParticipants
                                                            ? `${tour.minParticipants} - ${tour.maxParticipants}`
                                                            : tour.minParticipants
                                                            ? `${tour.minParticipants}+`
                                                            : tour.maxParticipants
                                                            ? `bis ${tour.maxParticipants}`
                                                            : '-'}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {tour.price && (
                                            <div className="flex items-start gap-3">
                                                <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t('tours.price')}
                                                    </div>
                                                    <div className="text-gray-900 dark:text-white font-semibold">
                                                        {Number(tour.price).toLocaleString()} {tour.currency || 'COP'}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {tour.location && (
                                            <div className="flex items-start gap-3">
                                                <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t('tours.location')}
                                                    </div>
                                                    <div className="text-gray-900 dark:text-white">
                                                        {tour.location}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {tour.meetingPoint && (
                                            <div className="flex items-start gap-3">
                                                <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t('tours.meetingPoint')}
                                                    </div>
                                                    <div className="text-gray-900 dark:text-white">
                                                        {tour.meetingPoint}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Rechte Spalte */}
                                    <div className="space-y-4">
                                        {tour.branch && (
                                            <div className="flex items-start gap-3">
                                                <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t('tours.branch')}
                                                    </div>
                                                    <div className="text-gray-900 dark:text-white">
                                                        {tour.branch.name}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {tour.createdBy && (
                                            <div className="flex items-start gap-3">
                                                <UserIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t('tours.columns.createdBy')}
                                                    </div>
                                                    <div className="text-gray-900 dark:text-white">
                                                        {tour.createdBy.firstName} {tour.createdBy.lastName}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {tour.createdAt && (
                                            <div>
                                                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {t('common.createdAt', 'Erstellt am')}
                                                </div>
                                                <div className="text-gray-900 dark:text-white">
                                                    {format(new Date(tour.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                                                </div>
                                            </div>
                                        )}

                                        {tour.externalProvider && (
                                            <div>
                                                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {t('tours.externalProvider')}
                                                </div>
                                                <div className="text-gray-900 dark:text-white">
                                                    {tour.externalProvider.name}
                                                </div>
                                            </div>
                                        )}

                                        {tour.externalBookingUrl && (
                                            <div>
                                                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    {t('tours.externalBookingUrl')}
                                                </div>
                                                <a
                                                    href={tour.externalBookingUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                                >
                                                    {tour.externalBookingUrl}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Kommissionen */}
                                {(tour.totalCommission || tour.totalCommissionPercent || tour.sellerCommissionPercent || tour.sellerCommissionFixed) && (
                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                            {t('tours.commissions')}
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {tour.totalCommission && (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t('tours.totalCommission')}
                                                    </div>
                                                    <div className="text-gray-900 dark:text-white">
                                                        {Number(tour.totalCommission).toLocaleString()} {tour.currency || 'COP'}
                                                    </div>
                                                </div>
                                            )}
                                            {tour.totalCommissionPercent && (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t('tours.totalCommissionPercent')}
                                                    </div>
                                                    <div className="text-gray-900 dark:text-white">
                                                        {Number(tour.totalCommissionPercent)}%
                                                    </div>
                                                </div>
                                            )}
                                            {tour.sellerCommissionPercent && (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t('tours.sellerCommissionPercent')}
                                                    </div>
                                                    <div className="text-gray-900 dark:text-white">
                                                        {Number(tour.sellerCommissionPercent)}%
                                                    </div>
                                                </div>
                                            )}
                                            {tour.sellerCommissionFixed && (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t('tours.sellerCommissionFixed')}
                                                    </div>
                                                    <div className="text-gray-900 dark:text-white">
                                                        {Number(tour.sellerCommissionFixed).toLocaleString()} {tour.currency || 'COP'}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Zusätzliche Informationen */}
                                {(tour.includes || tour.excludes || tour.requirements) && (
                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                            {t('tours.additionalInfo')}
                                        </h3>
                                        <div className="space-y-4">
                                            {tour.includes && (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                        {t('tours.includes')}
                                                    </div>
                                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                        {tour.includes}
                                                    </p>
                                                </div>
                                            )}
                                            {tour.excludes && (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                        {t('tours.excludes')}
                                                    </div>
                                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                        {tour.excludes}
                                                    </p>
                                                </div>
                                            )}
                                            {tour.requirements && (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                        {t('tours.requirements')}
                                                    </div>
                                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                        {tour.requirements}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Verfügbarkeit */}
                                {(tour.availableFrom || tour.availableTo) && (
                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                            {t('tours.availability', 'Verfügbarkeit')}
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {tour.availableFrom && (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t('tours.availableFrom', 'Verfügbar ab')}
                                                    </div>
                                                    <div className="text-gray-900 dark:text-white">
                                                        {format(new Date(tour.availableFrom), 'dd.MM.yyyy', { locale: de })}
                                                    </div>
                                                </div>
                                            )}
                                            {tour.availableTo && (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {t('tours.availableTo', 'Verfügbar bis')}
                                                    </div>
                                                    <div className="text-gray-900 dark:text-white">
                                                        {format(new Date(tour.availableTo), 'dd.MM.yyyy', { locale: de })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                            {t('common.close', 'Schließen')}
                        </button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default TourDetailsModal;

