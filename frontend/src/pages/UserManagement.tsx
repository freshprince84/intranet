import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../hooks/usePermissions.ts';
import { UserGroupIcon, UserIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import UserManagementTab from '../components/UserManagementTab.tsx';
import RoleManagementTab from '../components/RoleManagementTab.tsx';
import useMessage from '../hooks/useMessage.ts';
import OrganizationSettings from '../components/organization/OrganizationSettings.tsx';
import JoinRequestsList from '../components/organization/JoinRequestsList.tsx';

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  // Tab-Zustand für Navigation zwischen Benutzer-, Rollen- und Organisationsverwaltung
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'organization'>('users');
  
  // Gemeinsame States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showMessage } = useMessage();

  const { isAdmin } = usePermissions();

  // Tab-Wechsel Handler - Fehler beim Wechsel zurücksetzen
  const handleTabChange = (tab: 'users' | 'roles' | 'organization') => {
    setActiveTab(tab);
    setError(null);
  };

  // Gemeinsame Fehlerbehandlung
  const handleError = (err: any) => {
    let message = t('errors.unknownError');
    if (err.response?.data?.message) {
      message = err.response.data.message;
    } else if (err instanceof Error) {
      message = err.message;
    }
    setError(message);
    showMessage(message, 'error');
  };

  if (!isAdmin()) {
    return <div className="p-4 text-red-600 dark:text-red-400">{t('userManagement.noPermission')}</div>;
  }

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <div className="container mx-auto py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
          {/* Header mit Icon */}
          <div className="flex items-center mb-6">
            <UserGroupIcon className="h-6 w-6 mr-2 dark:text-white" />
            <h2 className="text-xl font-semibold dark:text-white">{t('userManagement.title')}</h2>
          </div>

          {/* Tabs für Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                className={`${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                onClick={() => handleTabChange('users')}
              >
                <UserIcon className="h-5 w-5 mr-2" />
                {t('userManagement.tabs.users')}
              </button>
              <button
                className={`${
                  activeTab === 'roles'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                onClick={() => handleTabChange('roles')}
              >
                <ShieldCheckIcon className="h-5 w-5 mr-2" />
                {t('userManagement.tabs.roles')}
              </button>
              {/* Organisation Tab nur für Benutzer mit entsprechenden Berechtigungen */}
              {isAdmin() && (
                <button
                  className={`${
                    activeTab === 'organization'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                  onClick={() => handleTabChange('organization')}
                >
                  <UserGroupIcon className="h-5 w-5 mr-2" />
                  {t('userManagement.tabs.organization')}
                </button>
              )}
            </nav>
          </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
              <p className="font-bold">{t('userManagement.error')}</p>
              <p>{error}</p>
            </div>
          )}

          {loading && <div className="p-4 dark:text-gray-300">{t('userManagement.loading')}</div>}

          {/* Tab Inhalte */}
          <div className="mt-6">
            {activeTab === 'users' ? (
              <UserManagementTab onError={handleError} />
            ) : activeTab === 'roles' ? (
              <RoleManagementTab onError={handleError} />
            ) : activeTab === 'organization' && isAdmin() ? (
              <div className="space-y-6">
                <OrganizationSettings />
                <JoinRequestsList />
              </div>
            ) : (
              <div className="p-4 text-red-600 dark:text-red-400">
                {t('userManagement.noPermissionForPage')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement; 