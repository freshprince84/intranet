import React from 'react';
import { useTranslation } from 'react-i18next';
import ReservationList from '../components/reservations/ReservationList.tsx';

const ReservationsPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('reservations.title', 'Reservierungen')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('reservations.description', 'Verwalten Sie alle Reservierungen und Check-ins')}
        </p>
      </div>

      <ReservationList />
    </div>
  );
};

export default ReservationsPage;

