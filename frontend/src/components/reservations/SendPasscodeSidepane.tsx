import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { reservationService } from '../../services/reservationService.ts';
import { Reservation } from '../../types/reservation.ts';
import useMessage from '../../hooks/useMessage.ts';
import { useSidepane } from '../../contexts/SidepaneContext.tsx';
import { CountryLanguageService } from '../../services/countryLanguageService.ts';
import axiosInstance from '../../config/axios.ts';
import { API_ENDPOINTS } from '../../config/api.ts';

interface SendPasscodeSidepaneProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation;
  onSuccess: () => void;
}

const SendPasscodeSidepane: React.FC<SendPasscodeSidepaneProps> = ({
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
  const [formattedRoomDescription, setFormattedRoomDescription] = useState<string | null>(null);

  // Standard-Nachricht generieren (entspricht Meta Business Template: reservation_checkin_completed)
  // Template verwendet 2 Variablen: {{1}} = Begrüßung, {{2}} = Kompletter Text mit Zimmerinfo und PIN
  // Für die Vorschau kombinieren wir beide zu einem vollständigen Text
  // Sprache basierend auf reservation.guestNationality bestimmen
  const generateStandardMessage = () => {
    const languageCode = CountryLanguageService.getLanguageForReservation({
      guestNationality: reservation.guestNationality
    });

    // Template-Format: {{1}} = Begrüßung, {{2}} = Kompletter Text
    // Für Vorschau im Sidepane verwenden wir Platzhalter, die dann ersetzt werden
    if (languageCode === 'en') {
      // Englische Version
      return `Welcome,

Hello {{guestName}},

Your check-in has been completed successfully!

Your room information:
- Room: {{roomNumber}}
- Description: {{roomDescription}}

Access:
- Door PIN: {{passcode}}

We wish you a pleasant stay!`;
    }

    // Spanische Version
    return `Bienvenido,

Hola {{guestName}},

¡Tu check-in se ha completado exitosamente!

Información de tu habitación:
- Habitación: {{roomNumber}}
- Descripción: {{roomDescription}}

Acceso:
- PIN de la puerta: {{passcode}}

¡Te deseamos una estancia agradable!`;
  };

  // Lade formatierte roomDescription aus Branch-Settings (falls categoryId vorhanden)
  useEffect(() => {
    let isMounted = true;

    const loadFormattedRoomDescription = async () => {
      if (!reservation.categoryId || !reservation.branchId) {
        if (isMounted) {
          setFormattedRoomDescription(null);
        }
        return;
      }

      try {
        // Lade roomDescription aus Branch-Settings
        const response = await axiosInstance.get(
          API_ENDPOINTS.BRANCHES.ROOM_DESCRIPTION(reservation.branchId!, reservation.categoryId)
        );
        
        if (!isMounted) return;
        
        const roomDesc = response.data;
        if (roomDesc) {
          // Ermittle Sprache für Labels
          const languageCode = CountryLanguageService.getLanguageForReservation({
            guestNationality: reservation.guestNationality
          });
          
          // Übersetzungen für Bild/Video Labels
          const imageLabel = languageCode === 'en' ? 'Image' : languageCode === 'es' ? 'Imagen' : 'Bild';
          const videoLabel = languageCode === 'en' ? 'Video' : languageCode === 'es' ? 'Video' : 'Video';
          
          // Formatiere Beschreibung: Text + Bild-Link + Video-Link
          const parts: string[] = [];
          if (roomDesc.text) {
            parts.push(roomDesc.text);
          }
          if (roomDesc.imageUrl) {
            parts.push(`${imageLabel}: ${roomDesc.imageUrl}`);
          }
          if (roomDesc.videoUrl) {
            parts.push(`${videoLabel}: ${roomDesc.videoUrl}`);
          }
          
          if (isMounted) {
            setFormattedRoomDescription(parts.length > 0 ? parts.join('\n') : null);
          }
        } else {
          if (isMounted) {
            setFormattedRoomDescription(null);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.warn('Fehler beim Laden der Zimmer-Beschreibung aus Branch-Settings:', error);
          setFormattedRoomDescription(null);
        }
      }
    };

    if (isOpen) {
      loadFormattedRoomDescription();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, reservation.categoryId, reservation.branchId, reservation.guestNationality]);

  // Initialisiere Standard-Nachricht beim Öffnen
  useEffect(() => {
    if (isOpen && !customMessage) {
      setCustomMessage(generateStandardMessage());
    }
  }, [isOpen, reservation]);

  // Preview-Nachricht generieren (mit Passcode-Platzhalter)
  useEffect(() => {
    if (customMessage) {
      // Verwende bestehenden Passcode oder Platzhalter
      const passcode = reservation.doorPin || reservation.ttlLockPassword || '[Passcode wird generiert]';
      // roomNumber: Bei Dorms = Bettnummer, bei Privates = null
      // roomDescription: Verwende formatierte roomDescription aus Branch-Settings, falls vorhanden, sonst reservation.roomDescription
      const roomNumber = reservation.roomNumber || '[Bettnummer]';
      const roomDescription = formattedRoomDescription || reservation.roomDescription || '[Zimmername]';
      const doorAppName = reservation.doorAppName || 'TTLock';
      
      // Ersetze Variablen in der Nachricht
      // Unterstützt sowohl Template-Format ({{1}}, {{2}}) als auch einzelne Variablen ({{guestName}}, etc.)
      let preview = customMessage
        .replace(/\{\{guestName\}\}/g, reservation.guestName)
        .replace(/\{\{passcode\}\}/g, passcode)
        .replace(/\{\{roomNumber\}\}/g, roomNumber)
        .replace(/\{\{roomDescription\}\}/g, roomDescription)
        .replace(/\{\{doorAppName\}\}/g, doorAppName);
      setPreviewMessage(preview);
    }
  }, [customMessage, reservation.guestName, reservation.doorPin, reservation.ttlLockPassword, reservation.roomNumber, reservation.roomDescription, reservation.doorAppName, reservation.guestNationality, formattedRoomDescription]);

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
      setFormattedRoomDescription(null);
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
      setError(t('reservations.sendPasscode.noContact', 'Bitte geben Sie mindestens eine Telefonnummer oder E-Mail-Adresse an.'));
      return;
    }

    try {
      setLoading(true);

      await reservationService.sendPasscode(reservation.id, {
        guestPhone: guestPhone || undefined,
        guestEmail: guestEmail || undefined,
        customMessage: customMessage || undefined
      });

      showMessage(
        t('reservations.sendPasscode.success', 'Passcode erfolgreich versendet'),
        'success'
      );
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Fehler beim Versenden des Passcodes:', err);
      const errorMessage = err.response?.data?.message || 
        t('reservations.sendPasscode.error', 'Fehler beim Versenden des Passcodes');
      setError(errorMessage);
      showMessage(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

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
                {t('reservations.sendPasscode.title', 'Passcode senden')}
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
            {t('reservations.sendPasscode.title', 'Passcode senden')}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Kontaktinfo */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {t('reservations.sendPasscode.contactInfo', 'Kontaktinformationen')}
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
              {t('reservations.sendPasscode.message', 'Nachricht')}
            </h3>

            <div className="space-y-3">
              {/* Textarea für Nachricht */}
              <div>
                <label htmlFor="customMessage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('reservations.sendPasscode.messageLabel', 'Nachricht (editierbar)')}
                </label>
                <textarea
                  id="customMessage"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white font-mono text-xs"
                  placeholder={generateStandardMessage()}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('reservations.sendPasscode.messageVariables', 'Verfügbare Variablen: {{guestName}}, {{passcode}}, {{roomNumber}}, {{roomDescription}}')}
                </p>
              </div>

              {/* Preview */}
              {previewMessage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('reservations.sendPasscode.preview', 'Vorschau')}
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
              className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              title={t('common.cancel', 'Abbrechen')}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <button
              type="submit"
              disabled={loading || (!guestPhone && !guestEmail)}
              className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
              title={loading ? t('reservations.sendPasscode.sending', 'Wird gesendet...') : t('reservations.sendPasscode.send', 'Senden')}
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </div>
        </form>
      </>
    );
  }
};

export default SendPasscodeSidepane;

