import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../../config/api.ts';
import { useAuth } from '../../hooks/useAuth.tsx';
import { Tour, TourBooking, TourBookingStatus } from '../../types/tour.ts';
import useMessage from '../../hooks/useMessage.ts';

interface EditTourBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: TourBooking | null;
    onBookingUpdated: (updatedBooking: TourBooking) => void;
}

const EditTourBookingModal = ({ isOpen, onClose, booking, onBookingUpdated }: EditTourBookingModalProps) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { showMessage } = useMessage();
    
    const [tourDate, setTourDate] = useState('');
    const [numberOfParticipants, setNumberOfParticipants] = useState<number | ''>(1);
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerNotes, setCustomerNotes] = useState('');
    
    const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);

    // Lade Tour-Details
    useEffect(() => {
        const loadTour = async () => {
            if (booking?.tourId) {
                try {
                    setLoadingData(true);
                    const response = await axiosInstance.get(API_ENDPOINTS.TOURS.BY_ID(booking.tourId));
                    if (response.data?.success) {
                        setSelectedTour(response.data.data);
                    }
                } catch (err: any) {
                    console.error('Fehler beim Laden der Tour:', err);
                } finally {
                    setLoadingData(false);
                }
            }
        };
        
        if (isOpen && booking) {
            loadTour();
        }
    }, [isOpen, booking]);

    // Setze Form-Daten wenn Booking geladen wird
    useEffect(() => {
        if (booking) {
            // Format datetime-local: YYYY-MM-DDTHH:mm
            const tourDateObj = new Date(booking.tourDate);
            const year = tourDateObj.getFullYear();
            const month = String(tourDateObj.getMonth() + 1).padStart(2, '0');
            const day = String(tourDateObj.getDate()).padStart(2, '0');
            const hours = String(tourDateObj.getHours()).padStart(2, '0');
            const minutes = String(tourDateObj.getMinutes()).padStart(2, '0');
            setTourDate(`${year}-${month}-${day}T${hours}:${minutes}`);
            
            setNumberOfParticipants(booking.numberOfParticipants);
            setCustomerName(booking.customerName || '');
            setCustomerEmail(booking.customerEmail || '');
            setCustomerPhone(booking.customerPhone || '');
            setCustomerNotes(booking.customerNotes || '');
        } else {
            setTourDate('');
            setNumberOfParticipants(1);
            setCustomerName('');
            setCustomerEmail('');
            setCustomerPhone('');
            setCustomerNotes('');
        }
        setError(null);
    }, [booking, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!booking) return;
        setError(null);

        // Validierungen
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
            const response = await axiosInstance.put(API_ENDPOINTS.TOUR_BOOKINGS.BY_ID(booking.id), {
                tourDate,
                numberOfParticipants: Number(numberOfParticipants),
                customerName: customerName.trim(),
                customerEmail: customerEmail.trim() || null,
                customerPhone: customerPhone.trim() || null,
                customerNotes: customerNotes.trim() || null
            });

            if (response.data?.success && response.data?.data) {
                showMessage(
                    t('tourBookings.updated', { defaultValue: 'Tour-Buchung erfolgreich aktualisiert' }),
                    'success'
                );
                onBookingUpdated(response.data.data);
                onClose();
            } else {
                throw new Error(response.data?.message || 'Fehler beim Aktualisieren der Buchung');
            }
        } catch (err: any) {
            console.error('Fehler beim Aktualisieren der Buchung:', err);
            const errorMessage = err.response?.data?.message || err.message || t('errors.unknownError');
            setError(errorMessage);
            showMessage(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!booking) return null;

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                            {t('tourBookings.edit', { defaultValue: 'Tour-Buchung bearbeiten' })}
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

                        {/* Tour-Info (nur Anzeige) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('tourBookings.tour', { defaultValue: 'Tour' })}
                            </label>
                            <input
                                type="text"
                                value={booking.tour?.title || ''}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                                disabled
                            />
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

export default EditTourBookingModal;

