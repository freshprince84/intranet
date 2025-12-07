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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);

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

      logger.log('[CreateReservationModal] Sende Daten:', data);
      logger.log('[CreateReservationModal] API Endpoint:', '/api/reservations');
      const newReservation = await reservationService.create(data);
      logger.log('[CreateReservationModal] Reservierung erstellt:', newReservation);
      
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

  const handleClose = () => {
    onClose();
  };

  // Für Mobile (< 640px) - Modal
  if (isMobile) {
    return (
      <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                  {t('reservations.createReservation.title', 'Neue Reservierung')}
                </Dialog.Title>
                <button
                  onClick={handleClose}
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
        </Dialog.Panel>
      </div>
    </Dialog>
    );
  }

  // Für Desktop (ab 640px) - Sidepane
  // WICHTIG: Sidepane muss IMMER gerendert bleiben für Transition
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
            {t('reservations.createReservation.title', 'Neue Reservierung')}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0">
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
                onClick={handleClose}
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
    </>
  );
};

export default CreateReservationModal;

