import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../config/axios.ts';
import { API_ENDPOINTS } from '../../config/api.ts';
import { Reservation, ReservationStatus, PaymentStatus } from '../../types/reservation.ts';
import ReservationCard from './ReservationCard.tsx';
import CreateReservationModal from './CreateReservationModal.tsx';
import useMessage from '../../hooks/useMessage.ts';
import {
  CalendarIcon,
  ArrowPathIcon,
  FunnelIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const ReservationList: React.FC = () => {
  const { t } = useTranslation();
  const { showMessage } = useMessage();
  const navigate = useNavigate();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ReservationStatus | 'all'>('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<PaymentStatus | 'all'>('all');
  const [filterBranchId, setFilterBranchId] = useState<number | 'all'>('all');
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadReservations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get(API_ENDPOINTS.RESERVATION.BASE);
      const reservations = response.data?.data || response.data || [];
      console.log('[ReservationList] Geladene Reservierungen:', reservations);
      if (reservations.length > 0) {
        console.log('[ReservationList] Erste Reservierung Status:', reservations[0]?.status);
        console.log('[ReservationList] Erste Reservierung PaymentStatus:', reservations[0]?.paymentStatus);
      }
      setReservations(reservations);
    } catch (err: any) {
      console.error('Fehler beim Laden der Reservierungen:', err);
      setError(err.response?.data?.message || t('reservations.loadError', 'Fehler beim Laden der Reservierungen'));
      showMessage(err.response?.data?.message || t('reservations.loadError', 'Fehler beim Laden der Reservierungen'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await axiosInstance.post(API_ENDPOINTS.RESERVATIONS.SYNC);
      showMessage(t('reservations.syncSuccess', 'Reservierungen erfolgreich synchronisiert'), 'success');
      await loadReservations();
    } catch (err: any) {
      console.error('Fehler beim Synchronisieren:', err);
      showMessage(
        err.response?.data?.message || t('reservations.syncError', 'Fehler beim Synchronisieren'),
        'error'
      );
    } finally {
      setSyncing(false);
    }
  };

  const loadBranches = async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE);
      setBranches(response.data || []);
    } catch (err: any) {
      console.error('Fehler beim Laden der Branches:', err);
    }
  };

  useEffect(() => {
    loadReservations();
    loadBranches();
  }, []);

  // Filtere Reservierungen
  const filteredReservations = reservations.filter((reservation) => {
    // Status-Filter
    if (filterStatus !== 'all' && reservation.status !== filterStatus) {
      return false;
    }

    // Payment-Status-Filter
    if (filterPaymentStatus !== 'all' && reservation.paymentStatus !== filterPaymentStatus) {
      return false;
    }

    // Branch-Filter
    if (filterBranchId !== 'all' && reservation.branchId !== filterBranchId) {
      return false;
    }

    // Such-Filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        reservation.guestName.toLowerCase().includes(searchLower) ||
        reservation.guestEmail?.toLowerCase().includes(searchLower) ||
        reservation.guestPhone?.toLowerCase().includes(searchLower) ||
        reservation.roomNumber?.toLowerCase().includes(searchLower) ||
        reservation.lobbyReservationId?.toLowerCase().includes(searchLower) ||
        reservation.branch?.name.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Sortiere nach Check-in-Datum (neueste zuerst)
  const sortedReservations = [...filteredReservations].sort((a, b) => {
    return new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime();
  });

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error && reservations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={loadReservations}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {t('common.retry', 'Erneut versuchen')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Suche */}
          <div className="flex-1 w-full sm:w-auto">
            <input
              type="text"
              placeholder={t('reservations.searchPlaceholder', 'Suche nach Gast, E-Mail, Telefon...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter & Sync & Create Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              {t('reservations.createReservation.button', 'Neue Reservierung')}
            </button>

            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                isFilterOpen || filterStatus !== 'all' || filterPaymentStatus !== 'all' || filterBranchId !== 'all'
                  ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              <FunnelIcon className="h-5 w-5 inline-block mr-2" />
              {t('common.filter', 'Filter')}
            </button>

            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <ArrowPathIcon className={`h-5 w-5 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? t('reservations.syncing', 'Synchronisiere...') : t('reservations.sync', 'Synchronisieren')}
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {isFilterOpen && (
          <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('reservations.status', 'Status')}
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as ReservationStatus | 'all')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">{t('common.all', 'Alle')}</option>
                  <option value={ReservationStatus.CONFIRMED}>{t('reservations.status.confirmed', 'Bestätigt')}</option>
                  <option value={ReservationStatus.CHECKED_IN}>{t('reservations.status.checkedIn', 'Eingecheckt')}</option>
                  <option value={ReservationStatus.CHECKED_OUT}>{t('reservations.status.checkedOut', 'Ausgecheckt')}</option>
                  <option value={ReservationStatus.CANCELLED}>{t('reservations.status.cancelled', 'Storniert')}</option>
                  <option value={ReservationStatus.NO_SHOW}>{t('reservations.status.noShow', 'Nicht erschienen')}</option>
                </select>
              </div>

              {/* Payment Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('reservations.paymentStatus', 'Zahlungsstatus')}
                </label>
                <select
                  value={filterPaymentStatus}
                  onChange={(e) => setFilterPaymentStatus(e.target.value as PaymentStatus | 'all')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">{t('common.all', 'Alle')}</option>
                  <option value={PaymentStatus.PENDING}>{t('reservations.paymentStatus.pending', 'Ausstehend')}</option>
                  <option value={PaymentStatus.PAID}>{t('reservations.paymentStatus.paid', 'Bezahlt')}</option>
                  <option value={PaymentStatus.PARTIALLY_PAID}>{t('reservations.paymentStatus.partiallyPaid', 'Teilweise bezahlt')}</option>
                  <option value={PaymentStatus.REFUNDED}>{t('reservations.paymentStatus.refunded', 'Erstattet')}</option>
                </select>
              </div>

              {/* Branch Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('branches.name', 'Branch')}
                </label>
                <select
                  value={filterBranchId}
                  onChange={(e) => setFilterBranchId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">{t('common.all', 'Alle')}</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            {(filterStatus !== 'all' || filterPaymentStatus !== 'all' || filterBranchId !== 'all') && (
              <div className="mt-4">
                <button
                  onClick={() => {
                    setFilterStatus('all');
                    setFilterPaymentStatus('all');
                    setFilterBranchId('all');
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t('common.clearFilters', 'Filter zurücksetzen')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reservierungen Liste */}
      {sortedReservations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 text-center">
          <CalendarIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm || filterStatus !== 'all' || filterPaymentStatus !== 'all'
              ? t('reservations.noResults', 'Keine Reservierungen gefunden')
              : t('reservations.noReservations', 'Keine Reservierungen vorhanden')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedReservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              onClick={() => navigate(`/reservations/${reservation.id}`)}
              onUpdate={loadReservations}
            />
          ))}
        </div>
      )}

      {/* Ergebnis-Zähler */}
      {sortedReservations.length > 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
          {t('reservations.resultCount', `${sortedReservations.length} von ${reservations.length} Reservierungen`, {
            count: sortedReservations.length,
            total: reservations.length
          })}
        </div>
      )}

      {/* Create Reservation Modal */}
      <CreateReservationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onReservationCreated={async (newReservation) => {
          // Lade Reservierungen neu, um den aktualisierten Status (notification_sent) zu erhalten
          await loadReservations();
          // Navigiere zur Detailansicht
          navigate(`/reservations/${newReservation.id}`);
        }}
      />
    </div>
  );
};

export default ReservationList;

