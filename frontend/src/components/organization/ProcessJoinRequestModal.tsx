import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, CheckIcon, ArrowPathIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { organizationService } from '../../services/organizationService.ts';
import { OrganizationJoinRequest, ProcessJoinRequestRequest } from '../../types/organization.ts';
import { roleApi } from '../../api/apiClient.ts';
import { Role } from '../../types/interfaces.ts';
import useMessage from '../../hooks/useMessage.ts';
import { useSidepane } from '../../contexts/SidepaneContext.tsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  joinRequest: OrganizationJoinRequest | null;
  onSuccess: () => void;
}

const ProcessJoinRequestModal: React.FC<Props> = ({ isOpen, onClose, joinRequest, onSuccess }) => {
  const { t } = useTranslation();
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [roleId, setRoleId] = useState<number | null>(null);
  const [response, setResponse] = useState<string>('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  const { openSidepane, closeSidepane } = useSidepane();
  const { showMessage } = useMessage();

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

  // Sidepane-Status verwalten
  useEffect(() => {
    if (isOpen) {
      openSidepane();
    } else {
      closeSidepane();
    }
    
    return () => {
      closeSidepane();
    };
  }, [isOpen, openSidepane, closeSidepane]);

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
      showMessage(t('joinRequest.loadRolesError'), 'error');
    } finally {
      setLoadingRoles(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (action === 'approve' && !roleId) {
      newErrors.roleId = t('joinRequest.selectRoleError');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showMessage(t('joinRequest.fillRequired'), 'error');
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
        action === 'approve' ? t('joinRequest.approveSuccess') : t('joinRequest.rejectSuccess'),
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
      const errorMessage = err.response?.data?.message || t('joinRequest.processError');
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
                {t('joinRequest.title')}
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
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('joinRequest.applicant')}:</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {joinRequest.requester.firstName} {joinRequest.requester.lastName}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{joinRequest.requester.email}</p>
                  {joinRequest.message && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('joinRequest.message')}:</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{joinRequest.message}</p>
                    </div>
                  )}
                </div>

                {/* Aktion (Genehmigen/Ablehnen) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('joinRequest.actionRequired')}
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
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t('joinRequest.approve')}</span>
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
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t('joinRequest.reject')}</span>
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
                      {t('joinRequest.assignRole')}
                    </label>
                    {loadingRoles ? (
                      <div className="flex items-center py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('joinRequest.loadingRoles')}</span>
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
                        <option value="">{t('joinRequest.selectRole')}</option>
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
                    {t('joinRequest.response')}
                  </label>
                  <textarea
                    id="response"
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    rows={3}
                    placeholder={t('joinRequest.addOptional', { type: action === 'approve' ? t('joinRequest.welcomeMessage') : t('joinRequest.rejectionReason') })}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  title={t('joinRequest.cancel')}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`p-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 focus:ring-green-500'
                      : 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 focus:ring-red-500'
                  }`}
                  title={saving ? (action === 'approve' ? t('joinRequest.approving') : t('joinRequest.rejecting')) : (action === 'approve' ? t('joinRequest.approve') : t('joinRequest.reject'))}
                >
                  {saving ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  ) : action === 'approve' ? (
                    <CheckIcon className="h-5 w-5" />
                  ) : (
                    <XCircleIcon className="h-5 w-5" />
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
  // WICHTIG: Sidepane muss IMMER gerendert bleiben für Transition
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
            {t('joinRequest.title')}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {errors.submit && (
            <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Antragsteller Info */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('joinRequest.applicant')}:</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {joinRequest.requester.firstName} {joinRequest.requester.lastName}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{joinRequest.requester.email}</p>
              {joinRequest.message && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('joinRequest.message')}:</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{joinRequest.message}</p>
                </div>
              )}
            </div>

            {/* Aktion (Genehmigen/Ablehnen) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('joinRequest.actionRequired')}
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
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('joinRequest.approve')}</span>
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
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('joinRequest.reject')}</span>
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
                  {t('joinRequest.assignRole')}
                </label>
                {loadingRoles ? (
                  <div className="flex items-center py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('joinRequest.loadingRoles')}</span>
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
                    <option value="">{t('joinRequest.selectRole')}</option>
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
                {t('joinRequest.response')}
              </label>
              <textarea
                id="response"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={3}
                placeholder={t('joinRequest.addOptional', { type: action === 'approve' ? t('joinRequest.welcomeMessage') : t('joinRequest.rejectionReason') })}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
              />
            </div>

            <div className="flex justify-end pt-4 gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                title="Abbrechen"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`p-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 focus:ring-green-500'
                    : 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 focus:ring-red-500'
                }`}
                title={saving ? (action === 'approve' ? 'Genehmige...' : 'Lehne ab...') : (action === 'approve' ? 'Genehmigen' : 'Ablehnen')}
              >
                {saving ? (
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                ) : action === 'approve' ? (
                  <CheckIcon className="h-5 w-5" />
                ) : (
                  <XCircleIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ProcessJoinRequestModal;

