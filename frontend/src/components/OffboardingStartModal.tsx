import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon, CalendarIcon, ArrowPathIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { useSidepane } from '../contexts/SidepaneContext.tsx';
import useMessage from '../hooks/useMessage.ts';

interface OffboardingStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOffboardingStarted: () => void;
  userId: number;
  userName: string;
}

const OffboardingStartModal: React.FC<OffboardingStartModalProps> = ({
  isOpen,
  onClose,
  onOffboardingStarted,
  userId,
  userName
}) => {
  const { t } = useTranslation();
  const { openSidepane, closeSidepane } = useSidepane();
  const { showMessage } = useMessage();
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form-Daten
  const [exitDate, setExitDate] = useState('');
  const [exitReason, setExitReason] = useState('');
  
  // Validierung
  const [validationErrors, setValidationErrors] = useState<{
    exitDate?: string;
    exitReason?: string;
  }>({});

  // Responsive Erkennung
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsLargeScreen(window.innerWidth > 1070);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sidepane-Status verwalten
  useEffect(() => {
    if (isOpen) {
      openSidepane();
      // Setze Standard-Datum auf heute
      const today = new Date().toISOString().split('T')[0];
      setExitDate(today);
      setExitReason('');
      setError(null);
      setValidationErrors({});
    } else {
      closeSidepane();
    }
    
    return () => {
      closeSidepane();
    };
  }, [isOpen, openSidepane, closeSidepane]);

  const validateForm = (): boolean => {
    const errors: { exitDate?: string; exitReason?: string } = {};

    // Validierung: exitDate
    if (!exitDate) {
      errors.exitDate = t('lifecycle.offboarding.exitDateRequired', { defaultValue: 'Austrittsdatum ist erforderlich' });
    } else {
      const selectedDate = new Date(exitDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // exitDate darf in der Vergangenheit liegen (rückwirkende Erfassung erlaubt)
      // Aber nicht zu weit in der Zukunft (max. 1 Jahr)
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      
      if (selectedDate > maxDate) {
        errors.exitDate = t('lifecycle.offboarding.exitDateTooFar', { defaultValue: 'Austrittsdatum darf nicht mehr als 1 Jahr in der Zukunft liegen' });
      }
    }

    // Validierung: exitReason
    if (!exitReason || exitReason.trim().length === 0) {
      errors.exitReason = t('lifecycle.offboarding.exitReasonRequired', { defaultValue: 'Austrittsgrund ist erforderlich' });
    } else if (exitReason.trim().length < 10) {
      errors.exitReason = t('lifecycle.offboarding.exitReasonTooShort', { defaultValue: 'Austrittsgrund muss mindestens 10 Zeichen lang sein' });
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await axiosInstance.put(API_ENDPOINTS.LIFECYCLE.STATUS(userId), {
        status: 'offboarding',
        exitDate: exitDate,
        exitReason: exitReason.trim()
      });

      showMessage(
        t('lifecycle.offboarding.started', { defaultValue: 'Offboarding erfolgreich gestartet' }),
        'success'
      );
      
      onOffboardingStarted();
      onClose();
    } catch (err: any) {
      console.error('Fehler beim Starten des Offboarding:', err);
      const errorMessage = err.response?.data?.message || 
        t('lifecycle.offboarding.startError', { defaultValue: 'Fehler beim Starten des Offboarding' });
      setError(errorMessage);
      showMessage(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Warnung */}
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-orange-800 dark:text-orange-200">
            <p className="font-medium mb-1">
              {t('lifecycle.offboarding.warningTitle', { defaultValue: 'Wichtiger Hinweis' })}
            </p>
            <p>
              {t('lifecycle.offboarding.warningText', { defaultValue: 'Durch das Starten des Offboarding-Prozesses werden automatisch Tasks erstellt. Dieser Vorgang kann nicht rückgängig gemacht werden.' })}
            </p>
          </div>
        </div>
      </div>

      {/* User-Info */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          {t('lifecycle.offboarding.user', { defaultValue: 'Mitarbeiter' })}
        </p>
        <p className="font-medium dark:text-white">{userName}</p>
      </div>

      {/* exitDate */}
      <div>
        <label htmlFor="exitDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('lifecycle.offboarding.exitDate', { defaultValue: 'Austrittsdatum' })} *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <CalendarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="date"
            id="exitDate"
            value={exitDate}
            onChange={(e) => {
              setExitDate(e.target.value);
              if (validationErrors.exitDate) {
                setValidationErrors(prev => ({ ...prev, exitDate: undefined }));
              }
            }}
            className={`block w-full pl-10 pr-3 py-2 border rounded-md dark:bg-gray-700 dark:text-white ${
              validationErrors.exitDate
                ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
            }`}
            required
          />
        </div>
        {validationErrors.exitDate && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.exitDate}</p>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('lifecycle.offboarding.exitDateHint', { defaultValue: 'Das Datum, an dem der Mitarbeiter die Organisation verlässt' })}
        </p>
      </div>

      {/* exitReason */}
      <div>
        <label htmlFor="exitReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('lifecycle.offboarding.exitReason', { defaultValue: 'Austrittsgrund' })} *
        </label>
        <textarea
          id="exitReason"
          value={exitReason}
          onChange={(e) => {
            setExitReason(e.target.value);
            if (validationErrors.exitReason) {
              setValidationErrors(prev => ({ ...prev, exitReason: undefined }));
            }
          }}
          rows={4}
          className={`block w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:text-white ${
            validationErrors.exitReason
              ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
          }`}
          placeholder={t('lifecycle.offboarding.exitReasonPlaceholder', { defaultValue: 'z.B. Kündigung, Vertragsende, etc.' })}
          required
        />
        {validationErrors.exitReason && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.exitReason}</p>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('lifecycle.offboarding.exitReasonHint', { defaultValue: 'Mindestens 10 Zeichen. Beschreiben Sie den Grund für den Austritt.' })}
        </p>
      </div>

      {/* Error-Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          title={t('common.cancel', { defaultValue: 'Abbrechen' })}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
        <button
          type="submit"
          disabled={loading}
          className="p-2 bg-orange-600 dark:bg-orange-700 text-white rounded-md hover:bg-orange-700 dark:hover:bg-orange-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          title={loading ? t('common.saving', { defaultValue: 'Speichern...' }) : t('lifecycle.offboarding.startButton', { defaultValue: 'Offboarding starten' })}
        >
          {loading ? (
            <ArrowPathIcon className="h-5 w-5 animate-spin" />
          ) : (
            <ArrowRightIcon className="h-5 w-5" />
          )}
        </button>
      </div>
    </form>
  );

  if (!isOpen) return null;

  // Für Mobile (unter 640px) - klassisches Modal
  if (isMobile) {
    return (
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <Dialog.Title className="text-lg font-semibold dark:text-white">
                {t('lifecycle.offboarding.startTitle', { defaultValue: 'Offboarding starten' })}
              </Dialog.Title>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4">
              {renderForm()}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
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
          onClick={onClose}
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
            {t('lifecycle.offboarding.startTitle', { defaultValue: 'Offboarding starten' })}
          </h2>
          <button
            onClick={onClose}
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
};

export default OffboardingStartModal;

