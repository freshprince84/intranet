import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../../config/api.ts';
import { useAuth } from '../../hooks/useAuth.tsx';
import { Tour, TourBooking, TourBookingStatus } from '../../types/tour.ts';
import useMessage from '../../hooks/useMessage.ts';

interface CreateTourBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBookingCreated: (newBooking: TourBooking) => void;
    tour?: Tour | null;
}

const CreateTourBookingModal = ({ isOpen, onClose, onBookingCreated, tour: preselectedTour }: CreateTourBookingModalProps) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { showMessage } = useMessage();
    
    const [tourId, setTourId] = useState<number | ''>(preselectedTour?.id || '');
    const [tourDate, setTourDate] = useState('');
    const [numberOfParticipants, setNumberOfParticipants] = useState<number | ''>(1);
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerNotes, setCustomerNotes] = useState('');
    
    const [tours, setTours] = useState<Tour[]>([]);
    const [selectedTour, setSelectedTour] = useState<Tour | null>(preselectedTour || null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);

    // Lade Touren
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoadingData(true);
                const response = await axiosInstance.get(API_ENDPOINTS.TOURS.BASE, {
                    params: { isActive: true }
                });
                const toursData = response.data?.data || response.data || [];
                setTours(Array.isArray(toursData) ? toursData : []);
            } catch (err: any) {
                console.error('Fehler beim Laden der Touren:', err);
                showMessage(t('errors.loadError'), 'error');
            } finally {
                setLoadingData(false);
            }
        };
        
        if (isOpen) {
            loadData();
        }
    }, [isOpen, t, showMessage]);

    // Setze preselectedTour wenn vorhanden
    useEffect(() => {
        if (preselectedTour) {
            setTourId(preselectedTour.id);
            setSelectedTour(preselectedTour);
        }
    }, [preselectedTour]);

    // Update selectedTour when tourId changes
    useEffect(() => {
        if (tourId) {
            const tour = tours.find(t => t.id === Number(tourId));
            setSelectedTour(tour || null);
        } else {
            setSelectedTour(null);
        }
    }, [tourId, tours]);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            if (!preselectedTour) {
                setTourId('');
            }
            setTourDate('');
            setNumberOfParticipants(1);
            setCustomerName('');
            setCustomerEmail('');
            setCustomerPhone('');
            setCustomerNotes('');
            setError(null);
        }
    }, [isOpen, preselectedTour]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validierungen
        if (!tourId) {
            setError(t('tourBookings.validation.tourRequired', { defaultValue: 'Tour ist erforderlich' }));
            return;
        }

        if (!tourDate) {
            setError(t('tourBookings.validation.tourDateRequired', { defaultValue: 'Tour-Datum ist erforderlich' }));
            return;
        }

        const tourDateObj = new Date(tourDate);
        if (tourDateObj < new Date()) {
            setError(t('tours.validation.tourDateFuture', { defaultValue: 'Tour-Datum muss in der Zukunft liegen' }));
            return;
        }

        if (!numberOfParticipants || Number(numberOfParticipants) < 1) {
            setError(t('tourBookings.validation.numberOfParticipantsMin', { defaultValue: 'Anzahl Teilnehmer muss >= 1 sein' }));
            return;
        }

        if (!customerName.trim() || customerName.trim().length < 2) {
            setError(t('tourBookings.validation.customerNameMinLength', { defaultValue: 'Kundenname muss mindestens 2 Zeichen lang sein' }));
            return;
        }

        if (!customerPhone.trim() && !customerEmail.trim()) {
            setError(t('tourBookings.validation.contactRequired', { defaultValue: 'Mindestens eine Kontaktinformation (Telefon oder E-Mail) ist erforderlich' }));
            return;
        }

        // Validierung: Anzahl Teilnehmer zwischen min/max
        if (selectedTour) {
            const numPart = Number(numberOfParticipants);
            if (selectedTour.minParticipants && numPart < selectedTour.minParticipants) {
                setError(t('tours.validation.numberOfParticipantsRange', { 
                    defaultValue: 'Anzahl der Teilnehmer muss zwischen {min} und {max} sein',
                    min: selectedTour.minParticipants,
                    max: selectedTour.maxParticipants || '∞'
                }));
                return;
            }
            if (selectedTour.maxParticipants && numPart > selectedTour.maxParticipants) {
                setError(t('tours.validation.numberOfParticipantsRange', { 
                    defaultValue: 'Anzahl der Teilnehmer muss zwischen {min} und {max} sein',
                    min: selectedTour.minParticipants || 1,
                    max: selectedTour.maxParticipants
                }));
                return;
            }
        }

        setLoading(true);
        try {
            const response = await axiosInstance.post(API_ENDPOINTS.TOUR_BOOKINGS.BASE, {
                tourId: Number(tourId),
                tourDate,
                numberOfParticipants: Number(numberOfParticipants),
                customerName: customerName.trim(),
                customerEmail: customerEmail.trim() || null,
                customerPhone: customerPhone.trim() || null,
                customerNotes: customerNotes.trim() || null
            });

            if (response.data?.success && response.data?.data) {
                showMessage(
                    t('tourBookings.created', { defaultValue: 'Tour-Buchung erfolgreich erstellt' }),
                    'success'
                );
                onBookingCreated(response.data.data);
                onClose();
            } else {
                throw new Error(response.data?.message || 'Fehler beim Erstellen der Buchung');
            }
        } catch (err: any) {
            console.error('Fehler beim Erstellen der Buchung:', err);
            const errorMessage = err.response?.data?.message || err.message || t('errors.unknownError');
            setError(errorMessage);
            showMessage(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                            {t('tourBookings.create', { defaultValue: 'Neue Tour-Buchung' })}
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
                                {t('tourBookings.tour', { defaultValue: 'Tour' })} *
                            </label>
                            <select
                                value={tourId}
                                onChange={(e) => setTourId(e.target.value ? Number(e.target.value) : '')}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                disabled={loading || loadingData || !!preselectedTour}
                            >
                                <option value="">{t('common.select', { defaultValue: 'Bitte wählen' })}</option>
                                {tours.filter(t => t.isActive).map(tour => (
                                    <option key={tour.id} value={tour.id}>
                                        {tour.title}
                                    </option>
                                ))}
                            </select>
                            {selectedTour && (
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {selectedTour.minParticipants && selectedTour.maxParticipants
                                        ? t('tourBookings.participantsRange', { 
                                            defaultValue: 'Teilnehmer: {min} - {max}',
                                            min: selectedTour.minParticipants,
                                            max: selectedTour.maxParticipants
                                        })
                                        : selectedTour.minParticipants
                                        ? t('tourBookings.participantsMin', { 
                                            defaultValue: 'Min. Teilnehmer: {min}',
                                            min: selectedTour.minParticipants
                                        })
                                        : selectedTour.maxParticipants
                                        ? t('tourBookings.participantsMax', { 
                                            defaultValue: 'Max. Teilnehmer: {max}',
                                            max: selectedTour.maxParticipants
                                        })
                                        : null}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('tourBookings.tourDate', { defaultValue: 'Tour-Datum' })} *
                            </label>
                            <input
                                type="datetime-local"
                                value={tourDate}
                                onChange={(e) => setTourDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                disabled={loading || loadingData}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('tourBookings.numberOfParticipants', { defaultValue: 'Anzahl Teilnehmer' })} *
                            </label>
                            <input
                                type="number"
                                min={selectedTour?.minParticipants || 1}
                                max={selectedTour?.maxParticipants || undefined}
                                value={numberOfParticipants}
                                onChange={(e) => setNumberOfParticipants(e.target.value ? Number(e.target.value) : '')}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                disabled={loading || loadingData}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('tourBookings.customerName', { defaultValue: 'Kundenname' })} *
                            </label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                                disabled={loading || loadingData}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('tourBookings.customerPhone', { defaultValue: 'Telefon' })}
                            </label>
                            <input
                                type="tel"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={loading || loadingData}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('tourBookings.customerEmail', { defaultValue: 'E-Mail' })}
                            </label>
                            <input
                                type="email"
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={loading || loadingData}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('tourBookings.customerNotes', { defaultValue: 'Notizen' })}
                            </label>
                            <textarea
                                value={customerNotes}
                                onChange={(e) => setCustomerNotes(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={loading || loadingData}
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                disabled={loading}
                            >
                                {t('common.cancel', { defaultValue: 'Abbrechen' })}
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading || loadingData}
                            >
                                {loading
                                    ? t('common.creating', { defaultValue: 'Erstelle...' })
                                    : t('common.create', { defaultValue: 'Erstellen' })}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default CreateTourBookingModal;

