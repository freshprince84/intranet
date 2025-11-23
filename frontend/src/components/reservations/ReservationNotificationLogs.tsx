import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { reservationService, ReservationNotificationLog } from '../../services/reservationService.ts';
import { format } from 'date-fns';
import { de, es, enUS } from 'date-fns/locale';
import {
  CheckCircleIcon,
  XCircleIcon,
  PaperAirplaneIcon,
  EnvelopeIcon,
  PhoneIcon,
  KeyIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface ReservationNotificationLogsProps {
  reservationId: number;
  refreshKey?: number; // Optional: Wird erhöht, wenn Logs neu geladen werden sollen
}

const ReservationNotificationLogs: React.FC<ReservationNotificationLogsProps> = ({
  reservationId,
  refreshKey
}) => {
  const { t, i18n } = useTranslation();
  const [logs, setLogs] = useState<ReservationNotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getLocale = () => {
    switch (i18n.language) {
      case 'de': return de;
      case 'es': return es;
      default: return enUS;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: getLocale() });
    } catch {
      return dateString;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'invitation':
        return t('reservations.notificationLogs.type.invitation', 'Einladung');
      case 'pin':
        return t('reservations.notificationLogs.type.pin', 'PIN-Code');
      case 'checkin_confirmation':
        return t('reservations.notificationLogs.type.checkinConfirmation', 'Check-in-Bestätigung');
      default:
        return type;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return <PhoneIcon className="h-4 w-4" />;
      case 'email':
        return <EnvelopeIcon className="h-4 w-4" />;
      case 'both':
        return (
          <div className="flex items-center space-x-1">
            <PhoneIcon className="h-4 w-4" />
            <EnvelopeIcon className="h-4 w-4" />
          </div>
        );
      default:
        return <PaperAirplaneIcon className="h-4 w-4" />;
    }
  };

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case 'pin':
        return <KeyIcon className="h-4 w-4" />;
      case 'invitation':
        return <PaperAirplaneIcon className="h-4 w-4" />;
      case 'checkin_confirmation':
        return <CheckCircleIcon className="h-4 w-4" />;
      default:
        return <PaperAirplaneIcon className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        const logsData = await reservationService.getNotificationLogs(reservationId);
        setLogs(logsData);
      } catch (err: any) {
        console.error('Fehler beim Laden der Notification-Logs:', err);
        setError(err.response?.data?.message || t('reservations.notificationLogs.loadError', 'Fehler beim Laden der Logs'));
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [reservationId, t, refreshKey]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-4">
        <div className="text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('reservations.notificationLogs.title', 'Benachrichtigungs-Historie')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('reservations.notificationLogs.noLogs', 'Keine Logs vorhanden')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t('reservations.notificationLogs.title', 'Benachrichtigungs-Historie')}
      </h3>
      
      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className={`border rounded-lg p-3 ${
              log.success
                ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                {log.success ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                <div className="flex items-center space-x-2">
                  {getNotificationTypeIcon(log.notificationType)}
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {getNotificationTypeLabel(log.notificationType)}
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                  {getChannelIcon(log.channel)}
                </div>
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                <ClockIcon className="h-4 w-4" />
                <span>{formatDateTime(log.sentAt)}</span>
              </div>
            </div>

            {log.sentTo && (
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                <span className="font-medium">{t('reservations.notificationLogs.sentTo', 'Gesendet an')}:</span> {log.sentTo}
              </div>
            )}

            {log.message && (
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-2 mt-2 p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                <div className="font-medium mb-1">{t('reservations.notificationLogs.message', 'Nachricht')}:</div>
                <div className="whitespace-pre-wrap break-words">{log.message}</div>
              </div>
            )}

            {(log.paymentLink || log.checkInLink) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {log.paymentLink && (
                  <a
                    href={log.paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t('reservations.notificationLogs.paymentLink', 'Zahlungslink')}
                  </a>
                )}
                {log.checkInLink && (
                  <a
                    href={log.checkInLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t('reservations.notificationLogs.checkInLink', 'Check-in-Link')}
                  </a>
                )}
              </div>
            )}

            {log.errorMessage && (
              <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
                <div className="font-medium mb-1">{t('reservations.notificationLogs.error', 'Fehler')}:</div>
                <div>{log.errorMessage}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReservationNotificationLogs;

