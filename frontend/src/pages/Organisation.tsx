import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../hooks/usePermissions.ts';
import { UserGroupIcon, UserIcon, ShieldCheckIcon, MapPinIcon, TruckIcon } from '@heroicons/react/24/outline';
import UserManagementTab from '../components/UserManagementTab.tsx';
import RoleManagementTab from '../components/RoleManagementTab.tsx';
import BranchManagementTab from '../components/BranchManagementTab.tsx';
import TourProvidersTab from '../components/tours/TourProvidersTab.tsx';
import ToursTab from '../components/tours/ToursTab.tsx';
import useMessage from '../hooks/useMessage.ts';
import OrganizationSettings from '../components/organization/OrganizationSettings.tsx';
import JoinRequestsList from '../components/organization/JoinRequestsList.tsx';

const Organisation: React.FC = () => {
  const { t } = useTranslation();
  // Gemeinsame States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showMessage } = useMessage();

  const { 
    isAdmin, 
    hasPermission, 
    canViewOrganization,
    loading: permissionsLoading
  } = usePermissions();

  // Berechtigungen prüfen
  const canViewOrganisation = hasPermission('organization_management', 'read', 'page');
  const canViewUsers = hasPermission('users', 'read', 'table');
  const canViewRoles = hasPermission('roles', 'read', 'table');
  const canViewBranches = hasPermission('branches', 'read', 'table');
  const canViewProviders = hasPermission('tour_providers', 'read', 'table');
  const canViewOrg = canViewOrganization();

  const [activeTabState, setActiveTabState] = useState<'users' | 'roles' | 'branches' | 'providers' | 'organization'>('users');
  const [providersViewMode, setProvidersViewMode] = useState<'tours' | 'providers'>('tours');
  const isInitialized = useRef(false);

  // Tab beim ersten Laden basierend auf Berechtigungen setzen (nur wenn Berechtigungen geladen sind)
  // Reihenfolge: users -> roles -> branches -> providers -> organization
  useEffect(() => {
    if (!permissionsLoading && !isInitialized.current) {
      let defaultTab: 'users' | 'roles' | 'branches' | 'providers' | 'organization' = 'organization'; // Fallback
      
      if (canViewUsers) {
        defaultTab = 'users';
      } else if (canViewRoles) {
        defaultTab = 'roles';
      } else if (canViewBranches) {
        defaultTab = 'branches';
      } else if (canViewProviders) {
        defaultTab = 'providers';
      } else if (canViewOrg) {
        defaultTab = 'organization';
      }
      
      setActiveTabState(defaultTab);
      isInitialized.current = true;
    }
  }, [permissionsLoading, canViewUsers, canViewRoles, canViewBranches, canViewProviders, canViewOrg]);

  // Tab-Wechsel Handler - Fehler beim Wechsel zurücksetzen
  const handleTabChange = (tab: 'users' | 'roles' | 'branches' | 'providers' | 'organization') => {
    // Prüfe Berechtigung für den Tab
    if (tab === 'users' && !canViewUsers) {
      return; // Tab nicht aktivierbar
    }
    if (tab === 'roles' && !canViewRoles) {
      return; // Tab nicht aktivierbar
    }
    if (tab === 'branches' && !canViewBranches) {
      return; // Tab nicht aktivierbar
    }
    if (tab === 'providers' && !canViewProviders) {
      return; // Tab nicht aktivierbar
    }
    if (tab === 'organization' && !canViewOrg) {
      return; // Tab nicht aktivierbar
    }
    setActiveTabState(tab);
    setError(null);
  };

  // Gemeinsame Fehlerbehandlung entfernt - ErrorContext wird jetzt verwendet

  // Keine Berechtigung für die Seite
  if (!canViewOrganisation) {
    return <div className="p-4 text-red-600 dark:text-red-400">{t('organisation.noPermission')}</div>;
  }

  return (
    <div className="min-h-screen dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
          {/* Header mit Icon */}
          <div className="flex items-center mb-6">
            <UserGroupIcon className="h-6 w-6 mr-2 dark:text-white" />
            <h2 className="text-xl font-semibold dark:text-white">{t('organisation.title')}</h2>
          </div>

          {/* Tabs für Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto overflow-y-hidden">
              {/* Users Tab - immer sichtbar, aber mit Pro-Badge wenn nicht berechtigt */}
              <button
                className={`${
                  activeTabState === 'users' && canViewUsers
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : !canViewUsers
                    ? 'border-transparent text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                } whitespace-nowrap py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center relative flex-shrink-0`}
                onClick={() => canViewUsers && handleTabChange('users')}
                disabled={!canViewUsers}
              >
                <UserIcon className="h-3 w-3 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                {t('organisation.tabs.users')}
                {!canViewUsers && (
                  <span className="ml-1 sm:ml-2 px-1 sm:px-2 py-0.5 text-[0.625rem] sm:text-xs font-semibold bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
                    PRO
                  </span>
                )}
              </button>

              {/* Roles Tab - immer sichtbar, aber mit Pro-Badge wenn nicht berechtigt */}
              <button
                className={`${
                  activeTabState === 'roles' && canViewRoles
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : !canViewRoles
                    ? 'border-transparent text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                } whitespace-nowrap py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center relative flex-shrink-0`}
                onClick={() => canViewRoles && handleTabChange('roles')}
                disabled={!canViewRoles}
              >
                <ShieldCheckIcon className="h-3 w-3 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                {t('organisation.tabs.roles')}
                {!canViewRoles && (
                  <span className="ml-1 sm:ml-2 px-1 sm:px-2 py-0.5 text-[0.625rem] sm:text-xs font-semibold bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
                    PRO
                  </span>
                )}
              </button>

              {/* Branches Tab - immer sichtbar, aber mit Pro-Badge wenn nicht berechtigt */}
              <button
                className={`${
                  activeTabState === 'branches' && canViewBranches
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : !canViewBranches
                    ? 'border-transparent text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                } whitespace-nowrap py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center relative flex-shrink-0`}
                onClick={() => canViewBranches && handleTabChange('branches')}
                disabled={!canViewBranches}
              >
                <MapPinIcon className="h-3 w-3 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                {t('organisation.tabs.branches', { defaultValue: 'Niederlassungen' })}
                {!canViewBranches && (
                  <span className="ml-1 sm:ml-2 px-1 sm:px-2 py-0.5 text-[0.625rem] sm:text-xs font-semibold bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
                    PRO
                  </span>
                )}
              </button>

              {/* Providers Tab - immer sichtbar, aber mit Pro-Badge wenn nicht berechtigt */}
              <button
                className={`${
                  activeTabState === 'providers' && canViewProviders
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : !canViewProviders
                    ? 'border-transparent text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                } whitespace-nowrap py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center relative flex-shrink-0`}
                onClick={() => canViewProviders && handleTabChange('providers')}
                disabled={!canViewProviders}
              >
                <TruckIcon className="h-3 w-3 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                {t('organisation.tabs.providers', { defaultValue: 'Proveedores' })}
                {!canViewProviders && (
                  <span className="ml-1 sm:ml-2 px-1 sm:px-2 py-0.5 text-[0.625rem] sm:text-xs font-semibold bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
                    PRO
                  </span>
                )}
              </button>

              {/* Organization Tab - sichtbar wenn berechtigt */}
              {canViewOrg && (
                <button
                  className={`${
                    activeTabState === 'organization'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  } whitespace-nowrap py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center flex-shrink-0`}
                  onClick={() => handleTabChange('organization')}
                >
                  <UserGroupIcon className="h-3 w-3 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                  {t('organisation.tabs.organization')}
                </button>
              )}
            </nav>
          </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
              <p className="font-bold">{t('organisation.error')}</p>
              <p>{error}</p>
            </div>
          )}

          {loading && <div className="p-4 dark:text-gray-300">{t('organisation.loading')}</div>}

          {/* Tab Inhalte */}
          <div className="mt-6">
            {activeTabState === 'users' ? (
              canViewUsers ? (
                <UserManagementTab />
              ) : (
                <div className="p-8 text-center">
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                    <span className="inline-block px-3 py-1 text-sm font-semibold bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded mb-4">
                      PRO
                    </span>
                    <p className="text-gray-700 dark:text-gray-300 mt-4">
                      {t('organisation.proFeature.users')}
                    </p>
                  </div>
                </div>
              )
            ) : activeTabState === 'roles' ? (
              canViewRoles ? (
                <RoleManagementTab onError={handleError} />
              ) : (
                <div className="p-8 text-center">
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                    <span className="inline-block px-3 py-1 text-sm font-semibold bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded mb-4">
                      PRO
                    </span>
                    <p className="text-gray-700 dark:text-gray-300 mt-4">
                      {t('organisation.proFeature.roles')}
                    </p>
                  </div>
                </div>
              )
            ) : activeTabState === 'branches' ? (
              canViewBranches ? (
                <BranchManagementTab />
              ) : (
                <div className="p-8 text-center">
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                    <span className="inline-block px-3 py-1 text-sm font-semibold bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded mb-4">
                      PRO
                    </span>
                    <p className="text-gray-700 dark:text-gray-300 mt-4">
                      {t('organisation.proFeature.branches', { defaultValue: 'Niederlassungs-Verwaltung ist eine PRO-Funktion' })}
                    </p>
                  </div>
                </div>
              )
            ) : activeTabState === 'providers' ? (
              canViewProviders ? (
                <div className="space-y-4">
                  {/* Switch für Tours/Providers */}
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setProvidersViewMode('tours')}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        providersViewMode === 'tours'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                      }`}
                    >
                      {t('tours.title', 'Touren')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProvidersViewMode('providers')}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        providersViewMode === 'providers'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                      }`}
                    >
                      {t('organisation.tabs.providers', { defaultValue: 'Proveedores' })}
                    </button>
                  </div>
                  
                  {/* Bedingtes Rendering */}
                  {providersViewMode === 'tours' ? (
                    <ToursTab />
                  ) : (
                    <TourProvidersTab />
                  )}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                    <span className="inline-block px-3 py-1 text-sm font-semibold bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded mb-4">
                      PRO
                    </span>
                    <p className="text-gray-700 dark:text-gray-300 mt-4">
                      {t('organisation.proFeature.providers', { defaultValue: 'Tour-Provider-Verwaltung ist eine PRO-Funktion' })}
                    </p>
                  </div>
                </div>
              )
            ) : activeTabState === 'organization' && canViewOrg ? (
              <div className="space-y-6">
                <OrganizationSettings />
                <JoinRequestsList />
              </div>
            ) : (
              <div className="p-4 text-red-600 dark:text-red-400">
                {t('organisation.noPermissionForPage')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Organisation;


