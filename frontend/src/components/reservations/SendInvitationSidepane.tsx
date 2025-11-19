import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { reservationService } from '../../services/reservationService.ts';
import { Reservation } from '../../types/reservation.ts';
import useMessage from '../../hooks/useMessage.ts';
import { useSidepane } from '../../contexts/SidepaneContext.tsx';

interface SendInvitationSidepaneProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation;
  onSuccess: () => void;
}

const SendInvitationSidepane: React.FC<SendInvitationSidepaneProps> = ({
  isOpen,
  onClose,
  reservation,
  onSuccess
}) => {
  const { t } = useTranslation();
  const { showMessage } = useMessage();
  const { openSidepane, closeSidepane } = useSidepane();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);

  // Formular-Felder
  const [guestPhone, setGuestPhone] = useState(reservation.guestPhone || '');
  const [guestEmail, setGuestEmail] = useState(reservation.guestEmail || '');
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMessage, setPreviewMessage] = useState('');

  // Standard-Nachricht generieren
  const generateStandardMessage = () => {
    const amount = reservation.amount || 0;
    const currency = reservation.currency || 'COP';
    return `Hola {{guestName}},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada.
Cargos: ${amount} ${currency}

Puedes realizar el check-in en línea ahora:
{{checkInLink}}

Por favor, realiza el pago:
{{paymentLink}}

¡Te esperamos!`;
  };

  // Initialisiere Standard-Nachricht beim Öffnen
  useEffect(() => {
    if (isOpen && !customMessage) {
      setCustomMessage(generateStandardMessage());
    }
  }, [isOpen, reservation]);

  // Preview-Nachricht generieren (mit echten Links)
  useEffect(() => {
    if (customMessage) {
      // Generiere LobbyPMS Check-in-Link (analog zu Backend generateLobbyPmsCheckInLink)
      // Format: https://app.lobbypms.com/checkinonline/confirmar?codigo={id}&email={email}&lg={language}
      const email = guestEmail || reservation.guestEmail || '';
      let checkInLink = '[Check-in-Link wird generiert]';
      if (email) {
        const codigo = reservation.id.toString();
        const baseUrl = 'https://app.lobbypms.com/checkinonline/confirmar';
        const params = new URLSearchParams();
        params.append('codigo', codigo);
        params.append('email', email);
        params.append('lg', 'GB'); // Standard: Englisch
        checkInLink = `${baseUrl}?${params.toString()}`;
      }
      
      // Verwende bestehenden Payment-Link oder Fallback
      const paymentLink = reservation.paymentLink || '[Zahlungslink wird erstellt]';
      
      let preview = customMessage
        .replace(/\{\{guestName\}\}/g, reservation.guestName)
        .replace(/\{\{checkInLink\}\}/g, checkInLink)
        .replace(/\{\{paymentLink\}\}/g, paymentLink);
      setPreviewMessage(preview);
    }
  }, [customMessage, reservation.guestName, reservation.paymentLink, reservation.id, reservation.guestEmail, guestEmail]);

  // Responsive-Verhalten
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsLargeScreen(window.innerWidth > 1070);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Sidepane-Status verwalten
  useEffect(() => {
    if (isOpen && !isMobile) {
      openSidepane();
    } else {
      closeSidepane();
    }

    return () => {
      closeSidepane();
    };
  }, [isOpen, isMobile, openSidepane, closeSidepane]);

  // Reset form when sidepane closes
  useEffect(() => {
    if (!isOpen) {
      setGuestPhone(reservation.guestPhone || '');
      setGuestEmail(reservation.guestEmail || '');
      setCustomMessage('');
      setError(null);
      setPreviewMessage('');
    }
  }, [isOpen, reservation]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validierung: Mindestens eine Kontaktinfo muss vorhanden sein
    if (!guestPhone && !guestEmail) {
      setError(t('reservations.sendInvitation.noContact', 'Bitte geben Sie mindestens eine Telefonnummer oder E-Mail-Adresse an.'));
      return;
    }

    try {
      setLoading(true);

      await reservationService.sendInvitation(reservation.id, {
        guestPhone: guestPhone || undefined,
        guestEmail: guestEmail || undefined,
        customMessage: customMessage || undefined
      });

      showMessage(
        t('reservations.sendInvitation.success', 'Einladung erfolgreich versendet'),
        'success'
      );
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Fehler beim Versenden der Einladung:', err);
      const errorMessage = err.response?.data?.message || 
        t('reservations.sendInvitation.error', 'Fehler beim Versenden der Einladung');
      setError(errorMessage);
      showMessage(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Warnung anzeigen, wenn bereits versendet wurde
  const alreadySent = reservation.sentMessageAt;

  // Für Mobile (< 640px) - Dialog (Modal)
  if (isMobile) {
    return (
      <div
        className={`fixed inset-0 z-50 overflow-y-auto ${isOpen ? '' : 'hidden'}`}
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex min-h-screen items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={handleClose}
          />

          <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold dark:text-white">
                {t('reservations.sendInvitation.title', 'Einladung senden')}
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
              {renderForm()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Für Desktop (ab 640px) - Sidepane
  return (
    <>
      {/* Backdrop - nur wenn offen und <= 1070px */}
      {isOpen && !isLargeScreen && (
        <div 
          className="fixed inset-0 bg-black/10 transition-opacity sidepane-overlay sidepane-backdrop z-40" 
          aria-hidden="true" 
          style={{
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 300ms ease-out'
          }}
        />
      )}
      
      {/* Sidepane - IMMER gerendert, Position wird via Transform geändert */}
      <div 
        className={`fixed top-16 bottom-0 right-0 max-w-sm w-full bg-white dark:bg-gray-800 shadow-xl sidepane-panel sidepane-panel-container transform z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          transition: 'transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
        aria-hidden={!isOpen}
        role="dialog"
        aria-modal={isOpen}
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold dark:text-white">
            {t('reservations.sendInvitation.title', 'Einladung senden')}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {renderForm()}
        </div>
      </div>
    </>
  );

  function renderForm() {
    return (
      <>
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded">
            {error}
          </div>
        )}

        {alreadySent && (
          <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-200 rounded">
            <p className="text-sm">
              {t('reservations.sendInvitation.alreadySent', 'Bereits versendet am')}: {new Date(reservation.sentMessageAt!).toLocaleString()}
            </p>
            <p className="text-xs mt-1">
              {t('reservations.sendInvitation.canResend', 'Sie können die Einladung erneut senden.')}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Kontaktinfo */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {t('reservations.sendInvitation.contactInfo', 'Kontaktinformationen')}
            </h3>

            <div className="space-y-3">
              {/* Telefonnummer */}
              <div>
                <label htmlFor="guestPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('reservations.phone', 'Telefonnummer')}
                </label>
                <input
                  type="tel"
                  id="guestPhone"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="+573001234567"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* E-Mail */}
              <div>
                <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('reservations.email', 'E-Mail')}
                </label>
                <input
                  type="email"
                  id="guestEmail"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Nachricht */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {t('reservations.sendInvitation.message', 'Nachricht')}
            </h3>

            <div className="space-y-3">
              {/* Textarea für Nachricht */}
              <div>
                <label htmlFor="customMessage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('reservations.sendInvitation.messageLabel', 'Nachricht (editierbar)')}
                </label>
                <textarea
                  id="customMessage"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white font-mono text-xs"
                  placeholder={generateStandardMessage()}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('reservations.sendInvitation.messageVariables', 'Verfügbare Variablen: {{guestName}}, {{checkInLink}}, {{paymentLink}}')}
                </p>
              </div>

              {/* Preview */}
              {previewMessage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('reservations.sendInvitation.preview', 'Vorschau')}
                  </label>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {previewMessage}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('common.cancel', 'Abbrechen')}
            </button>
            <button
              type="submit"
              disabled={loading || (!guestPhone && !guestEmail)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? t('reservations.sendInvitation.sending', 'Wird gesendet...')
                : t('reservations.sendInvitation.send', 'Senden')
              }
            </button>
          </div>
        </form>
      </>
    );
  }
};

export default SendInvitationSidepane;

