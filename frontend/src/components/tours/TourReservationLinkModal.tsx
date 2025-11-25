import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, LinkIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../../config/axios.ts';
import { API_ENDPOINTS } from '../../config/api.ts';
import useMessage from '../../hooks/useMessage.ts';
import { TourBooking, TourReservation } from '../../types/tour.ts';

interface TourReservationLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: TourBooking | null;
    onLinked: () => void;
}

const TourReservationLinkModal = ({ isOpen, onClose, booking, onLinked }: TourReservationLinkModalProps) => {
    const { t } = useTranslation();
    const { showMessage } = useMessage();
    
    const [reservations, setReservations] = useState<any[]>([]);
    const [selectedReservationId, setSelectedReservationId] = useState<number | ''>('');
    const [tourPrice, setTourPrice] = useState<number | ''>('');
    const [accommodationPrice, setAccommodationPrice] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);
    const [loadingReservations, setLoadingReservations] = useState(false);
    const [existingLinks, setExistingLinks] = useState<TourReservation[]>([]);

    useEffect(() => {
        if (isOpen && booking) {
            loadReservations();
            loadExistingLinks();
            // Setze Tour-Preis als Standard
            if (booking.totalPrice) {
                setTourPrice(typeof booking.totalPrice === 'string' ? parseFloat(booking.totalPrice) : booking.totalPrice);
            }
        }
    }, [isOpen, booking]);

    const loadReservations = async () => {
        try {
            setLoadingReservations(true);
            const response = await axiosInstance.get(API_ENDPOINTS.RESERVATION.BASE);
            if (response.data.success || Array.isArray(response.data)) {
                const data = response.data.success ? response.data.data : response.data;
                setReservations(Array.isArray(data) ? data : []);
            }
        } catch (err: any) {
            console.error('Fehler beim Laden der Reservations:', err);
            showMessage(t('errors.loadError'), 'error');
        } finally {
            setLoadingReservations(false);
        }
    };

    const loadExistingLinks = async () => {
        if (!booking) return;
        try {
            const response = await axiosInstance.get(API_ENDPOINTS.TOUR_RESERVATIONS.BY_BOOKING(booking.id));
            if (response.data.success) {
                setExistingLinks(response.data.data || []);
            }
        } catch (err: any) {
            console.error('Fehler beim Laden der Verknüpfungen:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!booking || !selectedReservationId || !tourPrice || !accommodationPrice) {
            showMessage(t('tours.reservationLink.fillAllFields', 'Bitte füllen Sie alle Felder aus'), 'error');
            return;
        }

        setLoading(true);
        try {
            const response = await axiosInstance.post(API_ENDPOINTS.TOUR_RESERVATIONS.BASE, {
                tourId: booking.tourId,
                bookingId: booking.id,
                reservationId: selectedReservationId,
                tourPrice: Number(tourPrice),
                accommodationPrice: Number(accommodationPrice),
                currency: booking.currency || 'COP'
            });

            if (response.data.success) {
                showMessage(t('tours.reservationLink.success', 'Verknüpfung erfolgreich erstellt'), 'success');
                onLinked();
                onClose();
            } else {
                showMessage(response.data.message || t('errors.saveError'), 'error');
            }
        } catch (err: any) {
            console.error('Fehler beim Erstellen der Verknüpfung:', err);
            showMessage(err.response?.data?.message || t('errors.saveError'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteLink = async (linkId: number) => {
        if (!confirm(t('tours.reservationLink.confirmDelete', 'Möchten Sie diese Verknüpfung wirklich löschen?'))) {
            return;
        }

        try {
            const response = await axiosInstance.delete(API_ENDPOINTS.TOUR_RESERVATIONS.BY_ID(linkId));
            if (response.data.success) {
                showMessage(t('tours.reservationLink.deleted', 'Verknüpfung gelöscht'), 'success');
                loadExistingLinks();
                onLinked();
            } else {
                showMessage(response.data.message || t('errors.deleteError'), 'error');
            }
        } catch (err: any) {
            console.error('Fehler beim Löschen der Verknüpfung:', err);
            showMessage(err.response?.data?.message || t('errors.deleteError'), 'error');
        }
    };

    if (!isOpen || !booking) return null;

    const selectedReservation = reservations.find(r => r.id === Number(selectedReservationId));
    const reservationAmount = selectedReservation?.amount ? Number(selectedReservation.amount) : 0;
    const totalPrice = (Number(tourPrice) || 0) + (Number(accommodationPrice) || 0);
    const isValid = totalPrice <= reservationAmount && totalPrice > 0;

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <LinkIcon className="h-6 w-6" />
                            {t('tours.reservationLink.title', 'Tour mit Reservation verknüpfen')}
                        </Dialog.Title>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('tours.reservationLink.reservation', 'Reservation')} *
                            </label>
                            <select
                                value={selectedReservationId}
                                onChange={(e) => {
                                    setSelectedReservationId(e.target.value ? Number(e.target.value) : '');
                                    const res = reservations.find(r => r.id === Number(e.target.value));
                                    if (res?.amount) {
                                        const resAmount = Number(res.amount);
                                        const currentTourPrice = Number(tourPrice) || 0;
                                        setAccommodationPrice(resAmount - currentTourPrice);
                                    }
                                }}
                                required
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                disabled={loadingReservations}
                            >
                                <option value="">{t('common.select', 'Auswählen')}</option>
                                {reservations.map(reservation => (
                                    <option key={reservation.id} value={reservation.id}>
                                        {reservation.guestName} - {reservation.checkInDate} bis {reservation.checkOutDate} ({Number(reservation.amount || 0).toLocaleString()} {reservation.currency || 'COP'})
                                    </option>
                                ))}
                            </select>
                            {selectedReservation && (
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {t('tours.reservationLink.reservationAmount', 'Reservationsbetrag')}: {reservationAmount.toLocaleString()} {selectedReservation.currency || 'COP'}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('tours.reservationLink.tourPrice', 'Tour-Preis')} *
                                </label>
                                <input
                                    type="number"
                                    value={tourPrice}
                                    onChange={(e) => setTourPrice(e.target.value ? Number(e.target.value) : '')}
                                    min="0"
                                    step="0.01"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('tours.reservationLink.accommodationPrice', 'Betten-Preis')} *
                                </label>
                                <input
                                    type="number"
                                    value={accommodationPrice}
                                    onChange={(e) => setAccommodationPrice(e.target.value ? Number(e.target.value) : '')}
                                    min="0"
                                    step="0.01"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        {selectedReservation && (
                            <div className={`p-3 rounded-md ${isValid ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                                <p className={`text-sm ${isValid ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                                    {t('tours.reservationLink.totalPrice', 'Gesamtpreis')}: {totalPrice.toLocaleString()} {booking.currency || 'COP'}
                                    {!isValid && totalPrice > reservationAmount && (
                                        <span className="block mt-1">
                                            {t('tours.reservationLink.exceedsAmount', 'Überschreitet Reservationsbetrag')}
                                        </span>
                                    )}
                                </p>
                            </div>
                        )}

                        {/* Bestehende Verknüpfungen */}
                        {existingLinks.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('tours.reservationLink.existingLinks', 'Bestehende Verknüpfungen')}
                                </h3>
                                <div className="space-y-2">
                                    {existingLinks.map(link => (
                                        <div key={link.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                                            <div>
                                                <p className="text-sm font-medium dark:text-white">
                                                    {link.reservation?.guestName || `Reservation #${link.reservationId}`}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Tour: {Number(link.tourPrice || 0).toLocaleString()} {link.currency} | 
                                                    Betten: {Number(link.accommodationPrice || 0).toLocaleString()} {link.currency}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteLink(link.id)}
                                                className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md"
                                            >
                                                {t('common.delete', 'Löschen')}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                                {t('common.cancel', 'Abbrechen')}
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !isValid || !selectedReservationId}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? t('common.saving', 'Wird gespeichert...') : t('common.save', 'Speichern')}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default TourReservationLinkModal;

