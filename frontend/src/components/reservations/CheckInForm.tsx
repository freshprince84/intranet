import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { API_ENDPOINTS } from '../../config/api.ts';
import { Reservation } from '../../types/reservation.ts';
import useMessage from '../../hooks/useMessage.ts';
import {
  XMarkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface CheckInFormProps {
  reservation: Reservation;
  onSuccess: () => void;
  onCancel: () => void;
}

const CheckInForm: React.FC<CheckInFormProps> = ({ reservation, onSuccess, onCancel }) => {
  const { t } = useTranslation();
  const { showMessage } = useMessage();

  const [loading, setLoading] = useState(false);
  const [roomNumber, setRoomNumber] = useState(reservation.roomNumber || '');
  const [roomDescription, setRoomDescription] = useState(reservation.roomDescription || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomNumber.trim()) {
      showMessage(t('reservations.roomNumberRequired', 'Zimmernummer ist erforderlich'), 'error');
      return;
    }

    try {
      setLoading(true);
      await axiosInstance.put(API_ENDPOINTS.RESERVATIONS.CHECK_IN(reservation.id), {
        roomNumber: roomNumber.trim(),
        roomDescription: roomDescription.trim() || undefined
      });
      onSuccess();
    } catch (err: any) {
      console.error('Fehler beim Check-in:', err);
      showMessage(
        err.response?.data?.message || t('reservations.checkInError', 'Fehler beim Check-in'),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('reservations.checkIn', 'Check-in durchführen')}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {t('reservations.guest', 'Gast')}: <strong>{reservation.guestName}</strong>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('reservations.checkInDate', 'Check-in Datum')}: {new Date(reservation.checkInDate).toLocaleDateString()}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('reservations.roomNumber', 'Zimmernummer')} *
            </label>
            <input
              type="text"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('reservations.roomNumberPlaceholder', 'z.B. 101')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('reservations.roomDescription', 'Zimmerbeschreibung')}
            </label>
            <textarea
              value={roomDescription}
              onChange={(e) => setRoomDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('reservations.roomDescriptionPlaceholder', 'Optionale Beschreibung des Zimmers')}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {t('common.cancel', 'Abbrechen')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <span>{t('common.processing', 'Wird verarbeitet...')}</span>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  {t('reservations.checkIn', 'Check-in durchführen')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckInForm;

