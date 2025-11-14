import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { reservationService, CreateReservationData } from '../../services/reservationService.ts';
import { Reservation } from '../../types/reservation.ts';
import useMessage from '../../hooks/useMessage.ts';
import { useSidepane } from '../../contexts/SidepaneContext.tsx';

interface CreateReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReservationCreated: (newReservation: Reservation) => void;
}

const CreateReservationModal: React.FC<CreateReservationModalProps> = ({
  isOpen,
  onClose,
  onReservationCreated
}) => {
  const { t } = useTranslation();
  const { showMessage } = useMessage();
  const { openSidepane, closeSidepane } = useSidepane();

  const [guestName, setGuestName] = useState('');
  const [contact, setContact] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [contactType, setContactType] = useState<'phone' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Erlaube nur Zahlen und Dezimalpunkt
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  // Sidepane-Status verwalten
  useEffect(() => {
    if (isOpen) {
      openSidepane();
    } else {
      closeSidepane();
    }

    return () => {
      closeSidepane();
    };
  }, [isOpen, openSidepane, closeSidepane]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setGuestName('');
      setContact('');
      setAmount('');
      setCurrency('COP');
      setContactType(null);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validierung
    if (!guestName || guestName.trim().length === 0) {
      setError(t('reservations.createReservation.errors.guestNameRequired', 'Gast-Name ist erforderlich'));
      return;
    }

    if (!contact || contact.trim().length === 0) {
      setError(t('reservations.createReservation.errors.contactRequired', 'Kontaktinformation ist erforderlich'));
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError(t('reservations.createReservation.errors.amountRequired', 'Betrag muss eine positive Zahl sein'));
      return;
    }

    try {
      setLoading(true);

      const data: CreateReservationData = {
        guestName: guestName.trim(),
        contact: contact.trim(),
        amount: parseFloat(amount),
        currency: currency
      };

      console.log('[CreateReservationModal] Sende Daten:', data);
      console.log('[CreateReservationModal] API Endpoint:', '/api/reservations');
      const newReservation = await reservationService.create(data);
      console.log('[CreateReservationModal] Reservierung erstellt:', newReservation);
      
      showMessage(
        t('reservations.createReservation.success', 'Reservierung erfolgreich erstellt'),
        'success'
      );

      onReservationCreated(newReservation);
      onClose();
    } catch (err: any) {
      console.error('[CreateReservationModal] Fehler beim Erstellen der Reservierung:', err);
      console.error('[CreateReservationModal] Error Response:', err.response);
      console.error('[CreateReservationModal] Error Status:', err.response?.status);
      console.error('[CreateReservationModal] Error Data:', err.response?.data);
      const errorMessage = err.response?.data?.message || err.message ||
        t('reservations.createReservation.errors.createError', 'Fehler beim Erstellen der Reservierung');
      setError(errorMessage);
      showMessage(errorMessage, 'error');
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
                {t('reservations.createReservation.title', 'Neue Reservierung')}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Gast-Name */}
              <div className="mb-4">
                <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('reservations.createReservation.guestName', 'Gast-Name')} *
                </label>
                <input
                  type="text"
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              {/* Kontakt */}
              <div className="mb-4">
                <label htmlFor="contact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('reservations.createReservation.contact', 'Telefonnummer oder Email')} *
                </label>
                <input
                  type="text"
                  id="contact"
                  value={contact}
                  onChange={handleContactChange}
                  placeholder={t('reservations.createReservation.contactPlaceholder', 'z.B. +573001234567 oder email@example.com')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  required
                />
                {contactType && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {contactType === 'email'
                      ? t('reservations.createReservation.detectedEmail', 'Email erkannt')
                      : t('reservations.createReservation.detectedPhone', 'Telefonnummer erkannt')
                    }
                  </p>
                )}
              </div>

              {/* Betrag & Währung */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('reservations.createReservation.amount', 'Betrag')} *
                  </label>
                  <input
                    type="text"
                    id="amount"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('reservations.createReservation.currency', 'Währung')}
                  </label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  >
                    <option value="COP">COP</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                {t('reservations.createReservation.hint', 'Nach der Erstellung wird automatisch eine WhatsApp-Nachricht mit Zahlungslink versendet (wenn Telefonnummer angegeben).')}
              </p>

              {/* Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common.cancel', 'Abbrechen')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? t('common.creating', 'Wird erstellt...')
                    : t('common.create', 'Erstellen')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateReservationModal;

