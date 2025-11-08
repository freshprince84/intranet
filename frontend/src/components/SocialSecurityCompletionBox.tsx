import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import useMessage from '../hooks/useMessage.ts';

interface Task {
  id: number;
  title: string;
  description: string | null;
  responsibleId: number | null;
  [key: string]: any;
}

interface SocialSecurityCompletionBoxProps {
  task: Task;
  onComplete?: () => void;
}

const SocialSecurityCompletionBox: React.FC<SocialSecurityCompletionBoxProps> = ({
  task,
  onComplete
}) => {
  const { t } = useTranslation();
  const { showMessage } = useMessage();
  const [formData, setFormData] = useState({
    registrationNumber: '',
    provider: '',
    registrationDate: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  // Prüfe ob Task ein Lebenszyklus-Task ist
  const isLifecycleTask = task.title?.includes('ARL') || 
                          task.title?.includes('EPS') || 
                          task.title?.includes('Pension') || 
                          task.title?.includes('Caja') ||
                          task.description?.includes('lifecycle');

  // Bestimme Typ der Sozialversicherung aus Task-Titel
  const getSocialSecurityType = (): string | null => {
    if (task.title?.includes('ARL')) return 'arl';
    if (task.title?.includes('EPS')) return 'eps';
    if (task.title?.includes('Pension')) return 'pension';
    if (task.title?.includes('Caja')) return 'caja';
    return null;
  };

  // Zeige Box nur wenn es ein Lebenszyklus-Task ist
  if (!isLifecycleTask) {
    return null;
  }

  const socialSecurityType = getSocialSecurityType();

  // Extrahiere userId aus task (muss aus task.responsibleId oder task.description kommen)
  // TODO: Backend sollte userId in task-Metadaten bereitstellen
  const extractUserId = (): number | null => {
    // Versuche userId aus description zu extrahieren
    if (task.description) {
      const userIdMatch = task.description.match(/userId[:\s]+(\d+)/i);
      if (userIdMatch) {
        return parseInt(userIdMatch[1], 10);
      }
    }
    // Fallback: verwende responsibleId (wenn es der User selbst ist)
    return task.responsibleId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const userId = extractUserId();
      if (!userId || !socialSecurityType) {
        showMessage(
          t('lifecycle.missingData') || 'Benutzer-ID oder Sozialversicherungs-Typ fehlt',
          'error'
        );
        return;
      }

      // API-Call zum Abschließen der Anmeldung
      await axiosInstance.put(
        API_ENDPOINTS.LIFECYCLE.SOCIAL_SECURITY(userId, socialSecurityType),
        {
          status: 'registered',
          registrationNumber: formData.registrationNumber,
          provider: formData.provider,
          registrationDate: formData.registrationDate,
          notes: formData.notes,
          completedAt: new Date().toISOString()
        }
      );

      showMessage(
        t('lifecycle.registrationCompleted') || 'Anmeldung erfolgreich abgeschlossen',
        'success'
      );

      // Formular zurücksetzen
      setFormData({
        registrationNumber: '',
        provider: '',
        registrationDate: '',
        notes: ''
      });

      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error('Fehler beim Abschließen der Anmeldung:', error);
      showMessage(
        error.response?.data?.message || t('lifecycle.registrationError') || 'Fehler beim Abschließen der Anmeldung',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 mb-4">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">
        {t('lifecycle.completeRegistration') || 'Anmeldung abschließen'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('lifecycle.registrationNumber') || 'Registrierungsnummer'} *
          </label>
          <input
            type="text"
            value={formData.registrationNumber}
            onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            placeholder={t('lifecycle.registrationNumberPlaceholder') || 'z.B. 123456789'}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('lifecycle.provider') || 'Anbieter'} *
          </label>
          <input
            type="text"
            value={formData.provider}
            onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            placeholder={t('lifecycle.providerPlaceholder') || 'z.B. ARL Sura, EPS Sanitas'}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('lifecycle.registrationDate') || 'Anmeldedatum'} *
          </label>
          <input
            type="date"
            value={formData.registrationDate}
            onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('lifecycle.notes') || 'Notizen'}
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder={t('lifecycle.notesPlaceholder') || 'Zusätzliche Informationen...'}
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                {t('common.saving') || 'Speichere...'}
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4 mr-2" />
                {t('lifecycle.complete') || 'Abschließen'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SocialSecurityCompletionBox;

