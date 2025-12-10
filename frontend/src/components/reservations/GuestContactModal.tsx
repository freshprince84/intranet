import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { reservationService } from '../../services/reservationService.ts';
import useMessage from '../../hooks/useMessage.ts';
import { Reservation } from '../../types/reservation.ts';

interface GuestContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation;
  onSuccess: () => void;
}

const GuestContactModal: React.FC<GuestContactModalProps> = ({
  isOpen,
  onClose,
  reservation,
  onSuccess
}) => {
  const { t } = useTranslation();
  const { showMessage } = useMessage();
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [contactType, setContactType] = useState<'phone' | 'email' | null>(null);

  useEffect(() => {
    if (isOpen) {
      setContact('');
      setContactType(null);
    }
  }, [isOpen]);

  // Erkenne automatisch ob es Telefonnummer oder Email ist
  const detectContactType = (value: string): 'phone' | 'email' | null => {
    if (!value || value.trim().length === 0) {
      return null;
    }
    // Email-Format: enthält @ und .
    if (value.includes('@') && value.includes('.')) {
      return 'email';
    }
    // Telefonnummer: enthält nur Ziffern, +, Leerzeichen, Bindestriche
    return 'phone';
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setContact(value);
    setContactType(detectContactType(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contact || contact.trim().length === 0) {
      showMessage(t('reservations.contactRequired', 'Kontaktinformation ist erforderlich'), 'error');
      return;
    }

    try {
      setLoading(true);
      await reservationService.updateGuestContact(reservation.id, contact.trim());
      showMessage(
        t('reservations.contactUpdated', 'Kontaktinformation aktualisiert und Nachricht versendet'),
        'success'
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Fehler beim Aktualisieren der Kontaktinformation:', error);
      showMessage(
        error.response?.data?.message || t('reservations.contactUpdateError', 'Fehler beim Aktualisieren'),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('reservations.guestContact.title', 'Gast-Kontaktinformation')}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="contact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('reservations.guestContact.label', 'Telefonnummer oder Email')}
                </label>
                <input
                  type="text"
                  id="contact"
                  value={contact}
                  onChange={handleContactChange}
                  placeholder={t('reservations.guestContact.placeholder', 'z.B. +573001234567 oder email@example.com')}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                  required
                />
                {contactType && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {contactType === 'email' 
                      ? t('reservations.guestContact.detectedEmail', 'Email erkannt')
                      : t('reservations.guestContact.detectedPhone', 'Telefonnummer erkannt')
                    }
                  </p>
                )}
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {t('reservations.guestContact.hint', 'Nach dem Speichern wird automatisch eine WhatsApp-Nachricht mit Zahlungslink und TTLock Code versendet.')}
                </p>
              </div>

              <div className="flex justify-end space-x-3">
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
                  disabled={loading || !contact || contact.trim().length === 0}
                  className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
                  title={loading ? t('common.saving', 'Wird gespeichert...') : t('common.save', 'Speichern')}
                >
                  <CheckIcon className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestContactModal;

