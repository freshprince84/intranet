import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { useSidepane } from '../contexts/SidepaneContext.tsx';
import useMessage from '../hooks/useMessage.ts';

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  createdAt: string;
}

interface OffboardingCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOffboardingCompleted: () => void;
  userId: number;
  userName: string;
  offboardingTasks: Task[];
}

const OffboardingCompleteModal: React.FC<OffboardingCompleteModalProps> = ({
  isOpen,
  onClose,
  onOffboardingCompleted,
  userId,
  userName,
  offboardingTasks
}) => {
  const { t } = useTranslation();
  const { openSidepane, closeSidepane } = useSidepane();
  const { showMessage } = useMessage();
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  
  // Prüfe, ob alle Tasks abgeschlossen sind
  const completedTasks = offboardingTasks.filter(task => task.status === 'done');
  const allTasksCompleted = offboardingTasks.length > 0 && completedTasks.length === offboardingTasks.length;
  const requiredConfirmText = userName.trim().toLowerCase();
  
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
      // Reset form on open
      setConfirmText('');
      setError(null);
    } else {
      closeSidepane();
    }
    
    return () => {
      closeSidepane();
    };
  }, [isOpen, openSidepane, closeSidepane]);
  
  const validateForm = () => {
    if (confirmText.trim().toLowerCase() !== requiredConfirmText) {
      setError(t('lifecycle.offboarding.complete.confirmTextMismatch') || 'Bestätigungstext stimmt nicht überein');
      return false;
    }
    return true;
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
        status: 'archived'
      });
      
      showMessage(
        t('lifecycle.offboarding.complete.success') || 'Offboarding erfolgreich abgeschlossen',
        'success'
      );
      
      onOffboardingCompleted();
      onClose();
    } catch (err: any) {
      console.error('Fehler beim Abschließen des Offboarding:', err);
      const errorMessage = err.response?.data?.message || 
        t('lifecycle.offboarding.complete.error') || 
        'Fehler beim Abschließen des Offboarding';
      setError(errorMessage);
      showMessage(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* User Info */}
      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md flex items-center space-x-3">
        <CheckCircleIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('lifecycle.offboarding.complete.user') || 'Mitarbeiter'}: {userName}
        </span>
      </div>
      
      {/* Tasks Status */}
      {offboardingTasks.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('lifecycle.offboarding.complete.tasksStatus') || 'Status der Offboarding-Aufgaben'}
          </h4>
          <div className="space-y-2">
            {offboardingTasks.map((task) => {
                  const isCompleted = task.status === 'done';
              return (
                <div
                  key={task.id}
                  className={`flex items-center space-x-2 text-sm ${
                    isCompleted
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-orange-700 dark:text-orange-300'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span>{task.title}</span>
                  <span className="ml-auto text-xs">
                    {isCompleted
                      ? `(${t('common.done') || 'Abgeschlossen'})`
                      : `(${t('common.open') || 'Offen'})`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Warning wenn nicht alle Tasks abgeschlossen */}
      {!allTasksCompleted && offboardingTasks.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-orange-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-orange-800 dark:text-orange-300">
                {t('lifecycle.offboarding.complete.warningTitle') || 'Nicht alle Aufgaben abgeschlossen'}
              </h3>
              <div className="mt-2 text-sm text-orange-700 dark:text-orange-200">
                <p>
                  {t('lifecycle.offboarding.complete.warningText') || 
                    'Es sind noch nicht alle Offboarding-Aufgaben abgeschlossen. Sie können das Offboarding trotzdem abschließen, aber es wird empfohlen, alle Aufgaben zuerst zu erledigen.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Info wenn alle Tasks abgeschlossen */}
      {allTasksCompleted && (
        <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                {t('lifecycle.offboarding.complete.allTasksCompleted') || 'Alle Aufgaben abgeschlossen'}
              </h3>
              <div className="mt-2 text-sm text-green-700 dark:text-green-200">
                <p>
                  {t('lifecycle.offboarding.complete.allTasksCompletedText') || 
                    'Alle Offboarding-Aufgaben sind abgeschlossen. Sie können das Offboarding jetzt abschließen.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Confirm Text Input */}
      <div>
        <label htmlFor="confirmText" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('lifecycle.offboarding.complete.confirmLabel', { userName }) || 
            `Bestätigen Sie durch Eingabe des Namens: "${userName}"`} *
        </label>
        <input
          type="text"
          id="confirmText"
          value={confirmText}
          onChange={(e) => {
            setConfirmText(e.target.value);
            setError(null);
          }}
          className={`w-full px-3 py-2 border ${
            error && error.includes('Bestätigung') ? 'border-red-500' : 'border-gray-300'
          } dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
          placeholder={userName}
          required
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('lifecycle.offboarding.complete.confirmHint') || 
            'Geben Sie den vollständigen Namen des Mitarbeiters ein, um das Offboarding abzuschließen'}
        </p>
      </div>
      
      {/* Final Warning */}
      <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
              {t('lifecycle.offboarding.complete.finalWarningTitle') || 'Wichtiger Hinweis'}
            </h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-200">
              <p>
                {t('lifecycle.offboarding.complete.finalWarningText') || 
                  'Durch das Abschließen des Offboarding wird der Mitarbeiter archiviert. Dieser Vorgang kann nicht rückgängig gemacht werden.'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Submit Button */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={loading}
        >
          {t('common.cancel') || 'Abbrechen'}
        </button>
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || confirmText.trim().toLowerCase() !== requiredConfirmText}
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('common.saving') || 'Speichern...'}
            </span>
          ) : (
            t('lifecycle.offboarding.complete.button') || 'Offboarding abschließen'
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
            {/* Header */}
            <div className="px-6 py-4 border-b dark:border-gray-700">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-lg font-semibold dark:text-white">
                  {t('lifecycle.offboarding.complete.title') || 'Offboarding abschließen'}
                </Dialog.Title>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {/* Form */}
            <div className="p-6">
              {error && (
                <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
                  {error}
                </div>
              )}
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
        className={`fixed top-16 bottom-0 right-0 max-w-sm w-full bg-white dark:bg-gray-800 shadow-xl sidepane-panel sidepane-panel-container transform z-50 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
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
            {t('lifecycle.offboarding.complete.title') || 'Offboarding abschließen'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {error && (
            <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
              {error}
            </div>
          )}
          {renderForm()}
        </div>
      </div>
    </>
  );
};

export default OffboardingCompleteModal;

