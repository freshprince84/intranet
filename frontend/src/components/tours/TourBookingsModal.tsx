import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../../config/api.ts';
import { TourBooking, TourBookingStatus } from '../../types/tour.ts';
import useMessage from '../../hooks/useMessage.ts';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface TourBookingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tourId: number;
}

const TourBookingsModal = ({ isOpen, onClose, tourId }: TourBookingsModalProps) => {
    const { t } = useTranslation();
    const { showMessage } = useMessage();
    const [bookings, setBookings] = useState<TourBooking[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && tourId) {
            loadBookings();
        }
    }, [isOpen, tourId]);

    const loadBookings = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axiosInstance.get(API_ENDPOINTS.TOURS.BOOKINGS(tourId));
            if (response.data.success) {
                setBookings(response.data.data || []);
            } else {
                setError(response.data.message || t('errors.loadError'));
            }
        } catch (err: unknown) {
            console.error('Fehler beim Laden der Buchungen:', err);
            const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t('errors.loadError');
            setError(errorMessage);
            showMessage(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: TourBookingStatus) => {
        switch (status) {
            case TourBookingStatus.CONFIRMED:
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case TourBookingStatus.CANCELLED:
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            case TourBookingStatus.COMPLETED:
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case TourBookingStatus.NO_SHOW:
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
        }
    };

    const getPaymentStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'partially_paid':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'pending':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
            case 'refunded':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-6xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                            {t('tours.bookings', 'Buchungen')} ({bookings.length})
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
                        ) : bookings.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                {t('tourBookings.noBookings', 'Keine Buchungen vorhanden')}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                {t('tourBookings.customerName', 'Kunde')}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                {t('tourBookings.tourDate', 'Tour-Datum')}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                {t('tourBookings.numberOfParticipants', 'Teilnehmer')}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                {t('tourBookings.totalPrice', 'Gesamtpreis')}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                {t('tourBookings.paymentStatus', 'Zahlungsstatus')}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                {t('tourBookings.status', 'Status')}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                {t('tourBookings.bookedBy', 'Gebucht von')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {bookings.map((booking) => (
                                            <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 dark:text-white">
                                                        {booking.customerName}
                                                    </div>
                                                    {booking.customerEmail && (
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            {booking.customerEmail}
                                                        </div>
                                                    )}
                                                    {booking.customerPhone && (
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            {booking.customerPhone}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 dark:text-white">
                                                        {format(new Date(booking.tourDate), 'dd.MM.yyyy', { locale: de })}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {t('tourBookings.bookingDate', 'Gebucht')}: {format(new Date(booking.bookingDate), 'dd.MM.yyyy', { locale: de })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 dark:text-white">
                                                        {booking.numberOfParticipants}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 dark:text-white font-semibold">
                                                        {Number(booking.totalPrice).toLocaleString()} {booking.currency}
                                                    </div>
                                                    {booking.amountPaid && booking.amountPending && (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            {t('tourBookings.amountPaid', 'Bezahlt')}: {Number(booking.amountPaid).toLocaleString()} {booking.currency}
                                                            <br />
                                                            {t('tourBookings.amountPending', 'Ausstehend')}: {Number(booking.amountPending).toLocaleString()} {booking.currency}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs rounded-full ${getPaymentStatusColor(booking.paymentStatus)}`}>
                                                        {t(`tourBookings.paymentStatus.${booking.paymentStatus}`, booking.paymentStatus)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                                                        {t(`tourBookings.status.${booking.status}`, booking.status)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {booking.bookedBy ? (
                                                        <div className="text-sm text-gray-900 dark:text-white">
                                                            {booking.bookedBy.firstName} {booking.bookedBy.lastName}
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            -
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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

export default TourBookingsModal;

