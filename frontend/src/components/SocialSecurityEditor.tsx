import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PencilIcon,
  EnvelopeIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
// Social Security Editor Component
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { usePermissions } from '../hooks/usePermissions.ts';
import useMessage from '../hooks/useMessage.ts';

interface SocialSecurityRegistration {
  id: number;
  registrationType: string;
  registrationNumber: string | null;
  provider: string | null;
  registrationDate: string | null;
  status: string;
  notes: string | null;
  completedAt: string | null;
}

interface SocialSecurityEditorProps {
  userId: number;
  lifecycleId: number;
  onUpdate?: () => void;
}

type SocialSecurityType = 'arl' | 'eps' | 'pension' | 'caja';

const SocialSecurityEditor: React.FC<SocialSecurityEditorProps> = ({
  userId,
  lifecycleId,
  onUpdate
}) => {
  const { t } = useTranslation();
  const { isLegal, isAdmin } = usePermissions();
  const { showMessage } = useMessage();
  
  const [registrations, setRegistrations] = useState<Record<SocialSecurityType, SocialSecurityRegistration | null>>({
    arl: null,
    eps: null,
    pension: null,
    caja: null
  });
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState<SocialSecurityType | null>(null);
  const [formData, setFormData] = useState({
    status: 'pending' as string,
    registrationNumber: '',
    provider: '',
    registrationDate: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Prüfe Berechtigung und lade nur einmal pro userId/lifecycleId
    const hasPermission = isLegal() || isAdmin();
    if (!hasPermission || !userId || !lifecycleId) {
      setLoading(false);
      return;
    }

    // Verhindere mehrfaches gleichzeitiges Laden
    if (loadingRef.current) {
      return;
    }

    // Breche vorherige Requests ab
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Erstelle neuen AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const loadRegistrations = async () => {
      loadingRef.current = true;
      setLoading(true);
      try {
        const types: SocialSecurityType[] = ['arl', 'eps', 'pension', 'caja'];
        const registrationPromises = types.map(async (type) => {
          // Prüfe ob Request abgebrochen wurde
          if (abortController.signal.aborted) {
            return { type, registration: null };
          }

          try {
            const response = await axiosInstance.get(
              API_ENDPOINTS.LIFECYCLE.SOCIAL_SECURITY(userId, type),
              {
                timeout: 5000, // 5 Sekunden Timeout
                signal: abortController.signal
              }
            );
            return { type, registration: response.data };
          } catch (error: any) {
            // Ignoriere Abort-Errors (AbortError oder CanceledError von Axios)
            if (error.name === 'AbortError' || error.name === 'CanceledError' || abortController.signal.aborted) {
              return { type, registration: null };
            }
            // Behandle 404 als "nicht vorhanden" (normal)
            if (error.response?.status === 404) {
              return { type, registration: null };
            }
            // Behandle Network Errors und Timeouts
            if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
              console.warn(`Network error loading ${type}, treating as not found`);
              return { type, registration: null };
            }
            console.error(`Error loading ${type}:`, error);
            return { type, registration: null };
          }
        });

        const results = await Promise.all(registrationPromises);
        
        // Prüfe erneut ob Request abgebrochen wurde
        if (abortController.signal.aborted) {
          return;
        }

        const newRegistrations: Record<SocialSecurityType, SocialSecurityRegistration | null> = {
          arl: null,
          eps: null,
          pension: null,
          caja: null
        };

        results.forEach(({ type, registration }) => {
          if (registration) {
            newRegistrations[type as SocialSecurityType] = {
              id: registration.id || 0,
              registrationType: type,
              registrationNumber: registration.registrationNumber || null,
              provider: registration.provider || null,
              registrationDate: registration.registrationDate || null,
              status: registration.status || 'pending',
              notes: registration.notes || null,
              completedAt: registration.completedAt || null
            };
          }
        });

        setRegistrations(newRegistrations);
      } catch (error: any) {
        // Ignoriere Abort-Errors (AbortError oder CanceledError von Axios)
        if (error.name === 'AbortError' || error.name === 'CanceledError' || abortController.signal.aborted) {
          return;
        }
        console.error('Error loading registrations:', error);
        showMessage('Fehler beim Laden der Sozialversicherungen', 'error');
      } finally {
        // Setze loading immer auf false, auch bei Abbruch
        setLoading(false);
        loadingRef.current = false;
      }
    };

    loadRegistrations();

    // Cleanup: Breche Request ab wenn Component unmountet oder Dependencies sich ändern
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      loadingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, lifecycleId]); // isLegal und isAdmin sind Funktionen, nicht als Dependencies

  const handleEdit = (type: SocialSecurityType) => {
    const registration = registrations[type];
    if (registration) {
      setFormData({
        status: registration.status,
        registrationNumber: registration.registrationNumber || '',
        provider: registration.provider || '',
        registrationDate: registration.registrationDate 
          ? new Date(registration.registrationDate).toISOString().split('T')[0]
          : '',
        notes: registration.notes || ''
      });
    } else {
      setFormData({
        status: 'pending',
        registrationNumber: '',
        provider: '',
        registrationDate: '',
        notes: ''
      });
    }
    setEditingType(type);
  };

  const handleCancel = () => {
    setEditingType(null);
    setFormData({
      status: 'pending',
      registrationNumber: '',
      provider: '',
      registrationDate: '',
      notes: ''
    });
  };

  const handleSave = async () => {
    if (!editingType) return;

    setSaving(true);
    try {
      await axiosInstance.put(
        API_ENDPOINTS.LIFECYCLE.SOCIAL_SECURITY(userId, editingType),
        {
          status: formData.status,
          number: formData.registrationNumber || undefined,
          provider: formData.provider || undefined,
          registrationDate: formData.registrationDate 
            ? new Date(formData.registrationDate).toISOString()
            : undefined,
          notes: formData.notes || undefined
        }
      );

      showMessage('Sozialversicherung erfolgreich aktualisiert', 'success');
      setEditingType(null);
      // Lade Registrierungen neu nach Update
      await loadRegistrations();
      // onUpdate nur aufrufen, wenn es eine Funktion ist (verhindert Re-Render-Loops)
      if (onUpdate && typeof onUpdate === 'function') {
        onUpdate();
      }
    } catch (error: any) {
      console.error('Error updating social security:', error);
      showMessage(
        error.response?.data?.message || 'Fehler beim Aktualisieren der Sozialversicherung',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'registered':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'not_required':
        return <CheckCircleIcon className="h-5 w-5 text-gray-400" />;
      case 'deregistered':
        return <XCircleIcon className="h-5 w-5 text-gray-400" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labelKey = `lifecycle.socialSecurityStatus.${status}`;
    return t(labelKey) || status;
  };

  const getTypeLabel = (type: SocialSecurityType) => {
    const labels: Record<SocialSecurityType, string> = {
      arl: 'ARL (Risiko-Arbeit)',
      eps: 'EPS (Gesundheit)',
      pension: 'Pension',
      caja: 'Caja de Compensación'
    };
    return labels[type];
  };

  if (!isLegal() && !isAdmin()) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const types: SocialSecurityType[] = ['arl', 'eps', 'pension', 'caja'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold dark:text-white flex items-center">
          <DocumentTextIcon className="h-5 w-5 mr-2" />
          {t('lifecycle.socialSecurity') || 'Sozialversicherungen'}
        </h3>
      </div>

      <div className="space-y-4">
        {types.map((type) => {
          const registration = registrations[type];
          const isEditing = editingType === type;

          return (
            <div
              key={type}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              {!isEditing ? (
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getStatusIcon(registration?.status || 'pending')}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium dark:text-white uppercase">
                          {getTypeLabel(type)}
                        </h4>
                        <span className="text-sm font-medium dark:text-white">
                          {getStatusLabel(registration?.status || 'pending')}
                        </span>
                      </div>
                      {registration && (
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          {registration.provider && (
                            <div>
                              <span className="font-medium">Anbieter:</span> {registration.provider}
                            </div>
                          )}
                          {registration.registrationNumber && (
                            <div>
                              <span className="font-medium">Nummer:</span> {registration.registrationNumber}
                            </div>
                          )}
                          {registration.registrationDate && (
                            <div>
                              <span className="font-medium">Anmeldedatum:</span>{' '}
                              {new Date(registration.registrationDate).toLocaleDateString('de-DE')}
                            </div>
                          )}
                          {registration.notes && (
                            <div className="mt-2">
                              <span className="font-medium">Notizen:</span>
                              <p className="text-gray-500 dark:text-gray-400 mt-1">
                                {registration.notes}
                              </p>
                            </div>
                          )}
                          {registration.completedAt && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              Abgeschlossen am:{' '}
                              {new Date(registration.completedAt).toLocaleDateString('de-DE')}
                            </div>
                          )}
                        </div>
                      )}
                      {!registration && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Noch nicht registriert
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleEdit(type)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition ml-4"
                    title={t('lifecycle.edit') || 'Bearbeiten'}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-medium dark:text-white uppercase mb-3">
                    {getTypeLabel(type)} bearbeiten
                  </h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    >
                      <option value="not_required">Nicht erforderlich</option>
                      <option value="pending">Ausstehend</option>
                      <option value="registered">Registriert</option>
                      <option value="failed">Fehlgeschlagen</option>
                      <option value="deregistered">Abgemeldet</option>
                    </select>
                  </div>

                  {formData.status === 'registered' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Registrierungsnummer
                        </label>
                        <input
                          type="text"
                          value={formData.registrationNumber}
                          onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                          placeholder="z.B. 123456789"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Anbieter
                        </label>
                        <input
                          type="text"
                          value={formData.provider}
                          onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                          placeholder="z.B. ARL Sura, EPS Sanitas"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Anmeldedatum
                        </label>
                        <input
                          type="date"
                          value={formData.registrationDate}
                          onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notizen
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      rows={3}
                      placeholder={t('socialSecurity.additionalInfoPlaceholder')}
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3">
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Speichere...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="h-4 w-4" />
                          <span>Speichern</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SocialSecurityEditor;

