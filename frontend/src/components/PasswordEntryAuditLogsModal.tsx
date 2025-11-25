import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';
import { passwordManagerApi, PasswordEntryAuditLog } from '../services/passwordManagerApi.ts';
import { toast } from 'react-toastify';

interface PasswordEntryAuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryId: number;
}

const PasswordEntryAuditLogsModal: React.FC<PasswordEntryAuditLogsModalProps> = ({
  isOpen,
  onClose,
  entryId
}) => {
  const { t } = useTranslation();
  const [auditLogs, setAuditLogs] = useState<PasswordEntryAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && entryId) {
      loadAuditLogs();
    }
  }, [isOpen, entryId]);

  const loadAuditLogs = async () => {
    try {
      setIsLoading(true);
      const logs = await passwordManagerApi.getAuditLogs(entryId);
      setAuditLogs(logs);
    } catch (error: any) {
      console.error('Error loading audit logs:', error);
      toast.error(t('passwordManager.errorLoadingAuditLogs') || 'Fehler beim Laden der Audit-Logs');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      view: t('passwordManager.auditLogActionView') || 'Anzeigen',
      view_password: t('passwordManager.auditLogActionViewPassword') || 'Passwort anzeigen',
      copy_password: t('passwordManager.auditLogActionCopyPassword') || 'Passwort kopieren',
      create: t('passwordManager.auditLogActionCreate') || 'Erstellen',
      update: t('passwordManager.auditLogActionUpdate') || 'Aktualisieren',
      delete: t('passwordManager.auditLogActionDelete') || 'Löschen'
    };
    return labels[action] || action;
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-3xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
            <Dialog.Title className="text-lg font-semibold dark:text-white flex items-center gap-2">
              <ClockIcon className="h-5 w-5" />
              {t('passwordManager.auditLogs')}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 min-h-0">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">
                  {t('passwordManager.noAuditLogs')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-md"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold dark:text-white">
                            {getActionLabel(log.action)}
                          </span>
                          {log.user && (
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              von {log.user.firstName} {log.user.lastName}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          <ClockIcon className="h-4 w-4" />
                          {formatDate(log.createdAt)}
                        </div>
                      </div>
                    </div>

                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-sm">
                        <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}

                    {(log.ipAddress || log.userAgent) && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {log.ipAddress && <div>IP: {log.ipAddress}</div>}
                        {log.userAgent && <div>User-Agent: {log.userAgent}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end p-4 border-t dark:border-gray-700 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {t('common.close')}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default PasswordEntryAuditLogsModal;

