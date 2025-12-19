import React from 'react';
import { useTranslation } from 'react-i18next';
import { Reservation, ReservationStatus, PaymentStatus } from '../../types/reservation.ts';
import {
  CalendarIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  HomeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CreditCardIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { de, es, enUS } from 'date-fns/locale';

interface ReservationCardProps {
  reservation: Reservation;
  onClick?: () => void;
  onUpdate?: () => void;
}

const ReservationCard: React.FC<ReservationCardProps> = ({ reservation, onClick, onUpdate }) => {
  const { t, i18n } = useTranslation();

  const getLocale = () => {
    switch (i18n.language) {
      case 'de': return de;
      case 'es': return es;
      default: return enUS;
    }
  };

  const getStatusColor = (status: ReservationStatus) => {
    switch (status) {
      case ReservationStatus.CONFIRMED:
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case ReservationStatus.NOTIFICATION_SENT:
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      case ReservationStatus.CHECKED_IN:
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case ReservationStatus.CHECKED_OUT:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      case ReservationStatus.CANCELLED:
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      case ReservationStatus.NO_SHOW:
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID:
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case PaymentStatus.PARTIALLY_PAID:
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case PaymentStatus.REFUNDED:
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      case PaymentStatus.PENDING:
      default:
        return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Extrahiere nur den Datumsteil (YYYY-MM-DD) und parse als lokales Datum
      // Dies verhindert Zeitzone-Konvertierung, die zu einem Tag-Versatz führt
      const date = new Date(dateString);
      // Verwende UTC-Methoden, um nur den Datumsteil zu extrahieren (ohne Zeitzone)
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();
      // Erstelle lokales Datum aus den UTC-Werten
      const localDate = new Date(year, month, day);
      return format(localDate, 'dd.MM.yyyy', { locale: getLocale() });
    } catch {
      return dateString;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow cursor-pointer ${
        reservation.status === ReservationStatus.CHECKED_IN ? 'ring-2 ring-green-500' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {reservation.guestName}
          </h3>
          {reservation.lobbyReservationId && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ID: {reservation.lobbyReservationId}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(reservation.status)}`}>
            {t(`reservations.status.${reservation.status}`, reservation.status)}
          </span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${getPaymentStatusColor(reservation.paymentStatus)}`}>
            {t(`reservations.paymentStatus.${reservation.paymentStatus}`, reservation.paymentStatus)}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        {/* Check-in/Check-out */}
        <div className="flex items-center text-gray-600 dark:text-gray-400">
          <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>
            {formatDate(reservation.checkInDate)} - {formatDate(reservation.checkOutDate)}
          </span>
        </div>

        {/* Zimmer - Dorms: roomNumber kann "Zimmername (Bettnummer)" ODER nur Bettnummer sein, Privates zeigen roomDescription */}
        {(() => {
          const isDorm = reservation.roomNumber !== null && reservation.roomNumber.trim() !== '';
          let roomDisplayText: string | null = null;
          
          if (isDorm) {
            const roomNumber = reservation.roomNumber?.trim() || '';
            const roomName = reservation.roomDescription?.trim() || '';
            // Prüfe ob roomNumber bereits "Zimmername (Bettnummer)" enthält (enthält "(")
            if (roomNumber.includes('(')) {
              // Bereits kombiniert: "Zimmername (Bettnummer)"
              roomDisplayText = roomNumber;
            } else if (roomName && roomNumber) {
              // Nur Bettnummer vorhanden, mit roomDescription kombinieren
              roomDisplayText = `${roomName} (${roomNumber})`;
            } else {
              roomDisplayText = roomNumber || roomName || null;
            }
          } else {
            // Private: Zeige nur Zimmername (aus roomDescription)
            roomDisplayText = reservation.roomDescription?.trim() || null;
          }
          
          return roomDisplayText ? (
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <HomeIcon className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>
                {t('reservations.room', 'Zimmer')} {roomDisplayText}
              </span>
            </div>
          ) : null;
        })()}

        {/* E-Mail */}
        {reservation.guestEmail && (
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <EnvelopeIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">{reservation.guestEmail}</span>
          </div>
        )}

        {/* Telefon */}
        {reservation.guestPhone && (
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <PhoneIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{reservation.guestPhone}</span>
          </div>
        )}

        {/* Check-in Link */}
        {reservation.checkInLink && (
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <LinkIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <a 
              href={reservation.checkInLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t('reservations.checkInLink', 'Check-in Link')}
            </a>
          </div>
        )}

        {/* Branch */}
        {reservation.branch && (
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <HomeIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>
              {t('branches.name', 'Branch')}: {reservation.branch.name}
            </span>
          </div>
        )}

        {/* Icons für Status */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          {reservation.onlineCheckInCompleted && (
            <div className="flex items-center text-green-600 dark:text-green-400" title={t('reservations.onlineCheckInCompleted', 'Online Check-in abgeschlossen')}>
              <CheckCircleIcon className="h-4 w-4 mr-1" />
              <span className="text-xs">{t('reservations.onlineCheckIn', 'Online')}</span>
            </div>
          )}
          {reservation.sireRegistered && (
            <div className="flex items-center text-blue-600 dark:text-blue-400" title={t('reservations.sireRegistered', 'SIRE registriert')}>
              <CheckCircleIcon className="h-4 w-4 mr-1" />
              <span className="text-xs">SIRE</span>
            </div>
          )}
          {reservation.doorPin && (
            <div className="flex items-center text-purple-600 dark:text-purple-400" title={t('reservations.doorPin', 'Tür-PIN')}>
              <CreditCardIcon className="h-4 w-4 mr-1" />
              <span className="text-xs">{t('reservations.pin', 'PIN')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReservationCard;

