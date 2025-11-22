import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../../config/api.ts';
import { useAuth } from '../../hooks/useAuth.tsx';
import { useSidepane } from '../../contexts/SidepaneContext.tsx';
import { format } from 'date-fns';

interface Shift {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'swapped';
  shiftTemplate?: {
    id: number;
    name: string;
    startTime: string;
    endTime: string;
  };
  branch?: {
    id: number;
    name: string;
  };
  role?: {
    id: number;
    name: string;
  };
  user?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface SwapRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwapRequestCreated: () => void;
  originalShift: Shift;
}

const SwapRequestModal = ({ 
  isOpen, 
  onClose, 
  onSwapRequestCreated,
  originalShift
}: SwapRequestModalProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { openSidepane, closeSidepane } = useSidepane();
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  const [targetShiftId, setTargetShiftId] = useState<number | ''>('');
  const [message, setMessage] = useState('');
  const [availableShifts, setAvailableShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsLargeScreen(window.innerWidth > 1070);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      openSidepane();
      fetchAvailableShifts();
    } else {
      closeSidepane();
      setTargetShiftId('');
      setMessage('');
      setError(null);
    }
    
    return () => {
      closeSidepane();
    };
  }, [isOpen, openSidepane, closeSidepane, originalShift]);

  const fetchAvailableShifts = async () => {
    if (!originalShift) return;
    
    setLoadingShifts(true);
    setError(null);
    
    try {
      // Lade alle Schichten der aktuellen Woche
      const weekStart = new Date(originalShift.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Montag
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // Sonntag
      
      const response = await axiosInstance.get(API_ENDPOINTS.SHIFTS.BASE, {
        params: {
          startDate: format(weekStart, 'yyyy-MM-dd'),
          endDate: format(weekEnd, 'yyyy-MM-dd')
        }
      });
      
      const allShifts = response.data?.data || response.data || [];
      
      // Filtere verfügbare Schichten:
      // - Muss einen User haben
      // - Nicht die eigene Schicht
      // - Gleiche Rolle und Branch (optional, aber sinnvoll)
      // - Status nicht cancelled oder swapped
      const filtered = allShifts.filter((shift: Shift) => {
        return shift.id !== originalShift.id &&
               shift.userId !== null &&
               shift.status !== 'cancelled' &&
               shift.status !== 'swapped' &&
               shift.roleId === originalShift.roleId &&
               shift.branchId === originalShift.branchId;
      });
      
      setAvailableShifts(filtered);
    } catch (err: any) {
      console.error('Fehler beim Laden der verfügbaren Schichten:', err);
      setError(err.response?.data?.message || err.message || t('teamWorktime.shifts.swap.errors.loadShiftsError'));
    } finally {
      setLoadingShifts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (!targetShiftId) {
        setError(t('teamWorktime.shifts.swap.errors.selectTargetShift'));
        setSubmitting(false);
        return;
      }

      const response = await axiosInstance.post(API_ENDPOINTS.SHIFTS.SWAPS.BASE, {
        originalShiftId: originalShift.id,
        targetShiftId: Number(targetShiftId),
        message: message.trim() || null
      });

      if (response.data && response.data.success !== false) {
        onSwapRequestCreated();
        onClose();
      } else {
        const errorMsg = response.data?.message || t('teamWorktime.shifts.swap.errors.createError');
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error('Fehler beim Erstellen der Tausch-Anfrage:', err);
      const errorMessage = err.response?.data?.message || err.message || t('teamWorktime.shifts.swap.errors.createError');
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setTargetShiftId('');
    setMessage('');
    onClose();
  };

  const renderForm = () => (
    <div className="space-y-4">
      {/* Original-Schicht Info */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
          {t('teamWorktime.shifts.swap.form.yourShift')}
        </h3>
        <div className="text-sm text-blue-800 dark:text-blue-400">
          <div>{originalShift.shiftTemplate?.name || t('teamWorktime.shifts.swap.form.shift')}</div>
          <div>{format(new Date(originalShift.date), 'dd.MM.yyyy')}</div>
          <div>
            {format(new Date(originalShift.startTime), 'HH:mm')} - {format(new Date(originalShift.endTime), 'HH:mm')}
          </div>
          {originalShift.branch && (
            <div>{originalShift.branch.name}</div>
          )}
          {originalShift.role && (
            <div>{originalShift.role.name}</div>
          )}
        </div>
      </div>

      {/* Ziel-Schicht auswählen */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.swap.form.targetShift')} *
        </label>
        {loadingShifts ? (
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-500 dark:text-gray-400">
            {t('common.loading')}
          </div>
        ) : availableShifts.length === 0 ? (
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-500 dark:text-gray-400">
            {t('teamWorktime.shifts.swap.form.noShiftsAvailable')}
          </div>
        ) : (
          <select
            value={targetShiftId}
            onChange={(e) => setTargetShiftId(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">{t('teamWorktime.shifts.swap.form.selectTargetShift')}</option>
            {availableShifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {format(new Date(shift.date), 'dd.MM.yyyy')} - {format(new Date(shift.startTime), 'HH:mm')} - {format(new Date(shift.endTime), 'HH:mm')} 
                {shift.user && ` (${shift.user.firstName} ${shift.user.lastName})`}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Nachricht (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.swap.form.message')}
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t('teamWorktime.shifts.swap.form.messagePlaceholder')}
        />
      </div>
    </div>
  );

  // Mobile (unter 640px) - Modal
  if (isMobile) {
    return (
      <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-lg font-semibold dark:text-white">
                  {t('teamWorktime.shifts.swap.title')}
                </Dialog.Title>
                <button
                  onClick={handleClose}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 overflow-y-auto flex-1 min-h-0">
                {error && (
                  <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
                    {error}
                  </div>
                )}

                {renderForm()}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t dark:border-gray-700 flex-shrink-0 flex justify-end gap-2">
                <div className="relative group">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                    title={t('common.cancel')}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                    {t('common.cancel')}
                  </div>
                </div>
                <div className="relative group">
                  <button
                    type="submit"
                    disabled={submitting || loadingShifts || !targetShiftId}
                    className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={submitting ? t('teamWorktime.shifts.swap.submitting') : t('teamWorktime.shifts.swap.submit')}
                  >
                    {submitting ? (
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    ) : (
                      <CheckIcon className="h-5 w-5" />
                    )}
                  </button>
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                    {submitting ? t('teamWorktime.shifts.swap.submitting') : t('teamWorktime.shifts.swap.submit')}
                  </div>
                </div>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  }

  // Desktop (ab 640px) - Sidepane
  return (
    <>
      {/* Backdrop - nur wenn offen und <= 1070px */}
      {isOpen && !isLargeScreen && (
        <div 
          className="fixed inset-0 bg-black/10 transition-opacity sidepane-overlay sidepane-backdrop z-40" 
          aria-hidden="true" 
          onClick={handleClose}
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
            {t('teamWorktime.shifts.swap.title')}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 overflow-y-auto flex-1 min-h-0">
            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
                {error}
              </div>
            )}

            {renderForm()}
          </div>

          {/* Footer */}
          <div className="p-4 border-t dark:border-gray-700 flex-shrink-0 flex justify-end gap-2">
            <div className="relative group">
              <button
                type="button"
                onClick={handleClose}
                className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title={t('common.cancel')}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                {t('common.cancel')}
              </div>
            </div>
            <div className="relative group">
              <button
                type="submit"
                disabled={submitting || loadingShifts || !targetShiftId}
                className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={submitting ? t('teamWorktime.shifts.swap.submitting') : t('teamWorktime.shifts.swap.submit')}
              >
                {submitting ? (
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckIcon className="h-5 w-5" />
                )}
              </button>
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                {submitting ? t('teamWorktime.shifts.swap.submitting') : t('teamWorktime.shifts.swap.submit')}
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default SwapRequestModal;

