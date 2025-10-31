import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { organizationService } from '../../services/organizationService.ts';
import { OrganizationJoinRequest, ProcessJoinRequestRequest } from '../../types/organization.ts';
import { roleApi } from '../../api/apiClient.ts';
import { Role } from '../../types/interfaces.ts';
import useMessage from '../../hooks/useMessage.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  joinRequest: OrganizationJoinRequest | null;
  onSuccess: () => void;
}

const ProcessJoinRequestModal: React.FC<Props> = ({ isOpen, onClose, joinRequest, onSuccess }) => {
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [roleId, setRoleId] = useState<number | null>(null);
  const [response, setResponse] = useState<string>('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const { showMessage } = useMessage();

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  useEffect(() => {
    if (isOpen && joinRequest) {
      // Reset form when modal opens
      setAction('approve');
      setRoleId(null);
      setResponse('');
      setErrors({});
      
      // Load roles for the organization
      if (joinRequest.organizationId) {
        fetchRoles();
      }
    }
  }, [isOpen, joinRequest]);

  const fetchRoles = async () => {
    try {
      setLoadingRoles(true);
      const response = await roleApi.getAll();
      if (response.data && Array.isArray(response.data)) {
        setRoles(response.data);
      }
    } catch (err: any) {
      console.error('Fehler beim Laden der Rollen:', err);
      showMessage('Fehler beim Laden der Rollen', 'error');
    } finally {
      setLoadingRoles(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (action === 'approve' && !roleId) {
      newErrors.roleId = 'Bitte wählen Sie eine Rolle aus';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showMessage('Bitte füllen Sie alle erforderlichen Felder aus', 'error');
      return;
    }
    
    if (!joinRequest) {
      return;
    }
    
    try {
      setSaving(true);
      const data: ProcessJoinRequestRequest = {
        action,
        response: response.trim() || undefined,
        roleId: action === 'approve' ? roleId || undefined : undefined
      };
      
      await organizationService.processJoinRequest(joinRequest.id, data);
      showMessage(
        action === 'approve' ? 'Beitrittsanfrage erfolgreich genehmigt' : 'Beitrittsanfrage erfolgreich abgelehnt',
        'success'
      );
      
      // Reset form
      setAction('approve');
      setRoleId(null);
      setResponse('');
      setErrors({});
      
      onClose();
      onSuccess();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Fehler beim Bearbeiten der Beitrittsanfrage';
      showMessage(errorMessage, 'error');
      setErrors({ submit: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setAction('approve');
    setRoleId(null);
    setResponse('');
    setErrors({});
    onClose();
  };

  if (!joinRequest) {
    return null;
  }

  // Für Mobile (unter 640px) - klassisches Modal
  if (isMobile) {
    return (
      <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <Dialog.Title className="text-lg font-semibold dark:text-white">
                Beitrittsanfrage bearbeiten
              </Dialog.Title>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              {errors.submit && (
                <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
                  {errors.submit}
                </div>
              )}

              <div className="space-y-4">
                {/* Antragsteller Info */}
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Antragsteller:</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {joinRequest.requester.firstName} {joinRequest.requester.lastName}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{joinRequest.requester.email}</p>
                  {joinRequest.message && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nachricht:</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{joinRequest.message}</p>
                    </div>
                  )}
                </div>

                {/* Aktion (Genehmigen/Ablehnen) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Aktion *
                  </label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="approve"
                        checked={action === 'approve'}
                        onChange={(e) => {
                          setAction(e.target.value as 'approve' | 'reject');
                          setErrors({});
                        }}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Genehmigen</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="reject"
                        checked={action === 'reject'}
                        onChange={(e) => {
                          setAction(e.target.value as 'approve' | 'reject');
                          setErrors({});
                        }}
                        className="mr-2 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Ablehnen</span>
                    </label>
                  </div>
                </div>

                {/* Rollenauswahl (nur bei Genehmigung) */}
                {action === 'approve' && (
                  <div>
                    <label 
                      htmlFor="roleId" 
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Rolle zuweisen *
                    </label>
                    {loadingRoles ? (
                      <div className="flex items-center py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Lade Rollen...</span>
                      </div>
                    ) : (
                      <select
                        id="roleId"
                        value={roleId || ''}
                        onChange={(e) => {
                          setRoleId(Number(e.target.value) || null);
                          if (errors.roleId) {
                            setErrors(prev => ({ ...prev, roleId: '' }));
                          }
                        }}
                        className={`mt-1 block w-full rounded-md border shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 ${
                          errors.roleId 
                            ? 'border-red-300 dark:border-red-600' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <option value="">-- Rolle auswählen --</option>
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>
                            {role.name} {role.description ? `- ${role.description}` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    {errors.roleId && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.roleId}</p>
                    )}
                  </div>
                )}

                {/* Antwort-Message */}
                <div>
                  <label 
                    htmlFor="response" 
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Antwort (optional)
                  </label>
                  <textarea
                    id="response"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    rows={3}
                    placeholder={`Optional: ${action === 'approve' ? 'Willkommensnachricht' : 'Ablehnungsgrund'} hinzufügen...`}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${
                    action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 focus:ring-green-500'
                      : 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 focus:ring-red-500'
                  }`}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {action === 'approve' ? 'Genehmige...' : 'Lehne ab...'}
                    </>
                  ) : (
                    action === 'approve' ? 'Genehmigen' : 'Ablehnen'
                  )}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  }

  // Für Desktop (ab 640px) - Sidepane
  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div 
        className="fixed inset-0 bg-black/10 transition-opacity" 
        aria-hidden="true" 
        onClick={handleClose}
      />
      
      <div 
        className={`fixed inset-y-0 right-0 max-w-sm w-full bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <Dialog.Title className="text-lg font-semibold dark:text-white">
            Beitrittsanfrage bearbeiten
          </Dialog.Title>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto h-full">
          {errors.submit && (
            <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Antragsteller Info */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Antragsteller:</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {joinRequest.requester.firstName} {joinRequest.requester.lastName}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{joinRequest.requester.email}</p>
              {joinRequest.message && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nachricht:</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{joinRequest.message}</p>
                </div>
              )}
            </div>

            {/* Aktion (Genehmigen/Ablehnen) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Aktion *
              </label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="approve"
                    checked={action === 'approve'}
                    onChange={(e) => {
                      setAction(e.target.value as 'approve' | 'reject');
                      setErrors({});
                    }}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Genehmigen</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="reject"
                    checked={action === 'reject'}
                    onChange={(e) => {
                      setAction(e.target.value as 'approve' | 'reject');
                      setErrors({});
                    }}
                    className="mr-2 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Ablehnen</span>
                </label>
              </div>
            </div>

            {/* Rollenauswahl (nur bei Genehmigung) */}
            {action === 'approve' && (
              <div>
                <label 
                  htmlFor="roleId" 
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Rolle zuweisen *
                </label>
                {loadingRoles ? (
                  <div className="flex items-center py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Lade Rollen...</span>
                  </div>
                ) : (
                  <select
                    id="roleId"
                    value={roleId || ''}
                    onChange={(e) => {
                      setRoleId(Number(e.target.value) || null);
                      if (errors.roleId) {
                        setErrors(prev => ({ ...prev, roleId: '' }));
                      }
                    }}
                    className={`mt-1 block w-full rounded-md border shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2 ${
                      errors.roleId 
                        ? 'border-red-300 dark:border-red-600' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="">-- Rolle auswählen --</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name} {role.description ? `- ${role.description}` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {errors.roleId && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.roleId}</p>
                )}
              </div>
            )}

            {/* Antwort-Message */}
            <div>
              <label 
                htmlFor="response" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Antwort (optional)
              </label>
              <textarea
                id="response"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={3}
                placeholder={`Optional: ${action === 'approve' ? 'Willkommensnachricht' : 'Ablehnungsgrund'} hinzufügen...`}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
              />
            </div>

            <div className="flex justify-end pt-4 gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${
                  action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 focus:ring-green-500'
                    : 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 focus:ring-red-500'
                }`}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {action === 'approve' ? 'Genehmige...' : 'Lehne ab...'}
                  </>
                ) : (
                  action === 'approve' ? 'Genehmigen' : 'Ablehnen'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};

export default ProcessJoinRequestModal;

