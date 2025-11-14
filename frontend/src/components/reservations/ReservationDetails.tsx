import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../config/axios.ts';
import { API_ENDPOINTS } from '../../config/api.ts';
import { Reservation, ReservationStatus, PaymentStatus } from '../../types/reservation.ts';
import useMessage from '../../hooks/useMessage.ts';
import CheckInForm from './CheckInForm.tsx';
import GuestContactModal from './GuestContactModal.tsx';
import {
  ArrowLeftIcon,
  CalendarIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  HomeIcon,
  CreditCardIcon,
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { de, es, enUS } from 'date-fns/locale';

const ReservationDetails: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { showMessage } = useMessage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [showGuestContactModal, setShowGuestContactModal] = useState(false);

  const getLocale = () => {
    switch (i18n.language) {
      case 'de': return de;
      case 'es': return es;
      default: return enUS;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: getLocale() });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: getLocale() });
    } catch {
      return dateString;
    }
  };

  const loadReservation = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get(API_ENDPOINTS.RESERVATION.BY_ID(parseInt(id)));
      const reservationData = response.data?.data || response.data;
      console.log('[ReservationDetails] Geladene Reservierung:', reservationData);
      console.log('[ReservationDetails] Status:', reservationData?.status);
      console.log('[ReservationDetails] PaymentStatus:', reservationData?.paymentStatus);
      setReservation(reservationData);
    } catch (err: any) {
      console.error('Fehler beim Laden der Reservierung:', err);
      setError(err.response?.data?.message || t('reservations.loadError', 'Fehler beim Laden der Reservierung'));
      showMessage(err.response?.data?.message || t('reservations.loadError', 'Fehler beim Laden der Reservierung'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservation();
  }, [id]);

  const handleCheckInSuccess = () => {
    setShowCheckInForm(false);
    loadReservation();
    showMessage(t('reservations.checkInSuccess', 'Check-in erfolgreich durchgeführt'), 'success');
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">
            {error || t('reservations.notFound', 'Reservierung nicht gefunden')}
          </p>
          <button
            onClick={() => navigate('/reservations')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {t('common.back', 'Zurück')}
          </button>
        </div>
      </div>
    );
  }

  const canCheckIn = reservation.status === ReservationStatus.CONFIRMED;
  
  // Prüfe ob Modal angezeigt werden soll (bei Status-Shift wenn guestPhone/Email fehlt)
  // Modal soll erscheinen wenn:
  // - Status ist confirmed oder notification_sent
  // - guestPhone UND guestEmail fehlen
  const shouldShowGuestContactModal = 
    reservation && 
    (reservation.status === ReservationStatus.CONFIRMED || reservation.status === ReservationStatus.NOTIFICATION_SENT) &&
    !reservation.guestPhone && 
    !reservation.guestEmail;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/reservations')}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          {t('common.back', 'Zurück')}
        </button>

        <div className="flex items-center gap-2">
          {shouldShowGuestContactModal && (
            <button
              onClick={() => setShowGuestContactModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('reservations.addContact', 'Kontakt hinzufügen')}
            </button>
          )}
          {canCheckIn && (
            <button
              onClick={() => setShowCheckInForm(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {t('reservations.checkIn', 'Check-in durchführen')}
            </button>
          )}
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {reservation.guestName}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gast-Informationen */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('reservations.guestInfo', 'Gast-Informationen')}
            </h3>

            <div className="space-y-3">
              {reservation.guestEmail && (
                <div className="flex items-center">
                  <EnvelopeIcon className="h-5 w-5 mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('reservations.email', 'E-Mail')}</p>
                    <p className="text-gray-900 dark:text-white">{reservation.guestEmail}</p>
                  </div>
                </div>
              )}

              {reservation.guestPhone && (
                <div className="flex items-center">
                  <PhoneIcon className="h-5 w-5 mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('reservations.phone', 'Telefon')}</p>
                    <p className="text-gray-900 dark:text-white">{reservation.guestPhone}</p>
                  </div>
                </div>
              )}

              {reservation.guestNationality && (
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('reservations.nationality', 'Nationalität')}</p>
                    <p className="text-gray-900 dark:text-white">{reservation.guestNationality}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reservierungs-Informationen */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('reservations.reservationInfo', 'Reservierungs-Informationen')}
            </h3>

            <div className="space-y-3">
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 mr-3 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('reservations.checkIn', 'Check-in')}</p>
                  <p className="text-gray-900 dark:text-white">{formatDate(reservation.checkInDate)}</p>
                </div>
              </div>

              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 mr-3 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('reservations.checkOut', 'Check-out')}</p>
                  <p className="text-gray-900 dark:text-white">{formatDate(reservation.checkOutDate)}</p>
                </div>
              </div>

              {reservation.roomNumber && (
                <div className="flex items-center">
                  <HomeIcon className="h-5 w-5 mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('reservations.room', 'Zimmer')}</p>
                    <p className="text-gray-900 dark:text-white">
                      {reservation.roomNumber}
                      {reservation.roomDescription && ` - ${reservation.roomDescription}`}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <ClockIcon className="h-5 w-5 mr-3 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('reservations.status', 'Status')}</p>
                  <p className="text-gray-900 dark:text-white">
                    {t(`reservations.status.${reservation.status}`, reservation.status)}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <CreditCardIcon className="h-5 w-5 mr-3 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('reservations.paymentStatus', 'Zahlungsstatus')}</p>
                  <p className="text-gray-900 dark:text-white">
                    {t(`reservations.paymentStatus.${reservation.paymentStatus}`, reservation.paymentStatus)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Zusätzliche Informationen */}
        {(reservation.doorPin || reservation.paymentLink || reservation.sireRegistered) && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('reservations.additionalInfo', 'Zusätzliche Informationen')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reservation.doorPin && (
                <div className="flex items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <KeyIcon className="h-5 w-5 mr-3 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('reservations.doorPin', 'Tür-PIN')}</p>
                    <p className="text-lg font-mono font-bold text-purple-900 dark:text-purple-100">
                      {reservation.doorPin}
                    </p>
                    {reservation.doorAppName && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('reservations.app', 'App')}: {reservation.doorAppName}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {reservation.paymentLink && (
                <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <CreditCardIcon className="h-5 w-5 mr-3 text-blue-600 dark:text-blue-400" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('reservations.paymentLink', 'Zahlungslink')}</p>
                    <a
                      href={reservation.paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm break-all"
                    >
                      {t('reservations.openPaymentLink', 'Link öffnen')}
                    </a>
                  </div>
                </div>
              )}

              {reservation.sireRegistered && (
                <div className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircleIcon className="h-5 w-5 mr-3 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('reservations.sireStatus', 'SIRE-Status')}</p>
                    <p className="text-green-900 dark:text-green-100 font-medium">
                      {t('reservations.sireRegistered', 'Registriert')}
                    </p>
                    {reservation.sireRegisteredAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDateTime(reservation.sireRegisteredAt)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Check-in Form Modal */}
      {showCheckInForm && (
        <CheckInForm
          reservation={reservation}
          onSuccess={handleCheckInSuccess}
          onCancel={() => setShowCheckInForm(false)}
        />
      )}

      {/* Guest Contact Modal */}
      {showGuestContactModal && reservation && (
        <GuestContactModal
          isOpen={showGuestContactModal}
          onClose={() => setShowGuestContactModal(false)}
          reservation={reservation}
          onSuccess={() => {
            loadReservation();
            setShowGuestContactModal(false);
          }}
        />
      )}

      {/* Versendete Nachricht anzeigen */}
      {reservation.sentMessage && (
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('reservations.sentMessage', 'Versendete Nachricht')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {reservation.sentMessage}
          </p>
          {reservation.sentMessageAt && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {t('reservations.sentAt', 'Versendet am')}: {formatDateTime(reservation.sentMessageAt)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ReservationDetails;

