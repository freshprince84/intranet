import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BuildingOfficeIcon, PlusIcon, UserPlusIcon, UserGroupIcon, ShieldCheckIcon, EnvelopeIcon, ChartBarIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { organizationService } from '../../services/organizationService.ts';
import { Organization } from '../../types/organization.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import useMessage from '../../hooks/useMessage.ts';
import { useOrganization } from '../../contexts/OrganizationContext.tsx';
import { useAuth } from '../../hooks/useAuth.tsx';
import CreateOrganizationModal from './CreateOrganizationModal.tsx';
import JoinOrganizationModal from './JoinOrganizationModal.tsx';
import EditOrganizationModal from './EditOrganizationModal.tsx';
import MyJoinRequestsList from './MyJoinRequestsList.tsx';

interface OrganizationStats {
  currentUsers: number;
  maxUsers: number;
  availableSlots: number;
  utilizationPercent: number;
  _count: {
    roles: number;
    joinRequests: number;
    invitations: number;
  };
}

const OrganizationSettings: React.FC = () => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const { canViewOrganization, canManageOrganization, loading: permissionsLoading } = usePermissions();
  const { showMessage } = useMessage();
  const { t } = useTranslation();
  const { refreshOrganization } = useOrganization();
  const { fetchCurrentUser } = useAuth();

  const fetchOrganization = useCallback(async (includeSettings = false) => {
    try {
      setLoading(true);
      setError(null);
      // ✅ PERFORMANCE: Settings nur laden wenn wirklich benötigt (beim Bearbeiten)
      const org = await organizationService.getCurrentOrganization(undefined, includeSettings);
      setOrganization(org);
      
      // Statistiken laden
      try {
        setLoadingStats(true);
        const statsData = await organizationService.getOrganizationStats();
        setStats(statsData);
      } catch (statsErr: any) {
        console.error('Fehler beim Laden der Statistiken:', statsErr);
        // Statistiken-Fehler nicht kritisch, keine Error-Message
      } finally {
        setLoadingStats(false);
      }
    } catch (err: any) {
      // Prüfe ob es ein 404-Fehler ist (keine Organisation gefunden)
      if (err.response?.status === 404 && err.response?.data?.hasOrganization === false) {
        // Benutzer hat keine Organisation - das ist OK, setze Error aber nicht kritisch
        // Verwende IMMER die Übersetzung, nicht die Backend-Nachricht
        setError(t('organization.notFound'));
        setOrganization(null);
        // Zeige Info-Message statt Error
        showMessage(t('organization.notFound'), 'info');
      } else {
        // Andere Fehler - kritisch
        const errorMessage = err.response?.data?.message || t('organization.loadError');
        setError(errorMessage);
        showMessage(errorMessage, 'error');
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasInitialLoadRef = useRef(false);

  useEffect(() => {
    // Warte bis Berechtigungen geladen sind
    if (permissionsLoading) {
      return;
    }

    // Nur einmal beim initialen Load ausführen
    if (hasInitialLoadRef.current) {
      return;
    }

    const hasPermission = canViewOrganization();
    if (hasPermission) {
    hasInitialLoadRef.current = true;
    // ✅ PERFORMANCE: Initial OHNE Settings laden (nur beim Bearbeiten)
    fetchOrganization(false);
    } else {
      setError(t('organization.noPermission'));
      setLoading(false);
      hasInitialLoadRef.current = true;
    }
    
    // ✅ MEMORY: Cleanup - Settings aus State entfernen beim Unmount
    return () => {
      setOrganization(null);
      setStats(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsLoading]);

  const handleEditSuccess = () => {
    // ✅ PERFORMANCE: Nach Bearbeiten Settings laden (für Anzeige)
    fetchOrganization(true);
    // Aktualisiere auch den OrganizationContext
    refreshOrganization();
  };

  // ✅ MEMORY: Settings beim Schließen des Modals löschen
  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    // Settings aus State entfernen (nur Settings, nicht die gesamte Organization)
    if (organization?.settings) {
      setOrganization({
        ...organization,
        settings: undefined
      });
    }
  };

  if (permissionsLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow p-6 mb-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-700 dark:text-gray-300">{t('common.loadingPermissions')}</span>
        </div>
      </div>
    );
  }

  if (!canViewOrganization()) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow p-6 mb-6">
          <div className="p-4 text-red-600 dark:text-red-400">
          {t('organization.noPermission')}
        </div>
      </div>
    );
  }

  const handleCreateSuccess = () => {
    // ✅ PERFORMANCE: Nach Erstellen OHNE Settings laden (nicht benötigt)
    fetchOrganization(false);
  };

  const handleJoinSuccess = async () => {
    // Nach Beitritt: Organisation neu laden (OHNE Settings, nicht benötigt)
    fetchOrganization(false);
    // WICHTIG: User-Rollen neu laden, damit neue Rolle sichtbar wird
    // OnboardingContext erkennt dann automatisch die neue Rolle
    await fetchCurrentUser();
  };

  return (
    <>
      <div className="space-y-4">
        {/* Titelzeile mit Action-Buttons */}
        <div className="flex items-center mb-4 sm:mb-4">
          {/* Linke Seite: Action-Buttons */}
          <div className="flex items-center gap-1.5" data-onboarding="organization-buttons">
            {/* Button: Neue Organisation erstellen - immer sichtbar (nicht nur für Admins) */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              data-onboarding="create-organization-button"
              className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-700 border border-blue-200 dark:border-gray-700 shadow-sm flex items-center justify-center"
              style={{ width: '30.19px', height: '30.19px' }}
              title={t('organization.createOrganization')}
              aria-label={t('organization.createOrganization')}
            >
              <PlusIcon className="h-4 w-4" />
            </button>
            
            {/* Button: Organisation beitreten - immer sichtbar */}
            <button
              onClick={() => setIsJoinModalOpen(true)}
              data-onboarding="join-organization-button"
              className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-700 border border-blue-200 dark:border-gray-700 shadow-sm flex items-center justify-center"
              style={{ width: '30.19px', height: '30.19px' }}
              title={t('organization.joinOrganization')}
              aria-label={t('organization.joinOrganization')}
            >
              <UserPlusIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-700 dark:text-gray-300">{t('common.loadingOrganization')}</span>
        </div>
      ) : (
        <>
          {/* Error/Info Display */}
          {error && (
            <div className={`mb-4 p-4 border rounded ${
              !organization 
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                : 'bg-red-100 dark:bg-red-900 border-red-400 dark:border-red-700 text-red-700 dark:text-red-300'
            }`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {!organization ? (
                    <UserGroupIcon className="h-5 w-5" />
                  ) : (
                    <span className="text-red-600 dark:text-red-400">⚠️</span>
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <p className="font-medium">{error}</p>
                  {!organization && (
                    <p className="mt-2 text-sm">{t('organization.createOrJoinHint')}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Card-Ansicht - nur anzeigen wenn Organisation existiert */}
          {organization ? (
            <>
            {/* Card mit Organisations-Infos */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
            <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                        <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                        {organization.displayName || organization.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {organization.domain || t('organization.noDomain')}
                      </p>
            </div>
                    {canManageOrganization() && (
                      <button
                        onClick={() => {
                          // ✅ PERFORMANCE: Modal öffnet sofort - Settings werden im Modal geladen wenn benötigt
                          setIsEditModalOpen(true);
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1"
                        title={t('organization.edit.title')}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                    )}
            </div>

                  {/* Organisations-Infos */}
                  <div className="space-y-3">
                    {organization.subscriptionPlan && (
            <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('organization.subscriptionPlan')}:</span>
                        <span className="ml-2 text-sm text-gray-900 dark:text-white capitalize">{organization.subscriptionPlan}</span>
              </div>
            )}
              </div>

                  {/* Statistiken direkt in der Card */}
          {stats && (
                    <>
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('organization.statistics')}</h3>
              {loadingStats ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('common.loadingStatistics')}</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Benutzer Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow hover:shadow-md transition-shadow">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3">
                        <UserGroupIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('organization.users')}</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {stats.currentUsers} / {stats.maxUsers}
                        </p>
                            {stats.utilizationPercent !== undefined && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {stats.utilizationPercent}% {t('organization.utilizationPercent')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rollen Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow hover:shadow-md transition-shadow">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-purple-100 dark:bg-purple-900/30 rounded-lg p-3">
                        <ShieldCheckIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('organization.roles')}</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {stats._count.roles}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Beitrittsanfragen Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow hover:shadow-md transition-shadow">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-3">
                        <EnvelopeIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('organization.joinRequests')}</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {stats._count.joinRequests}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Einladungen Card */}
                  {stats._count.invitations !== undefined && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow hover:shadow-md transition-shadow">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-green-100 dark:bg-green-900/30 rounded-lg p-3">
                          <EnvelopeIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('organization.invitations')}</p>
                          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {stats._count.invitations}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Auslastung Card */}
                  {stats.utilizationPercent !== undefined && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow hover:shadow-md transition-shadow">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg p-3">
                          <ChartBarIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('organization.utilization')}</p>
                          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {stats.utilizationPercent}%
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {stats.availableSlots} {t('organization.availableSlots')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            </>
          ) : (
            /* Keine Organisation - zeige Hinweis */
            <div className="text-center py-8">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t('organization.notFound')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('organization.createOrJoinHint')}
            </p>
          </div>
        )}
        </>
      )}
      </div>

      {/* Meine Beitrittsanfragen - immer anzeigen */}
      <MyJoinRequestsList />

      {/* Modals */}
      <CreateOrganizationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <JoinOrganizationModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onSuccess={handleJoinSuccess}
      />

      <EditOrganizationModal
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        onSuccess={handleEditSuccess}
        organization={organization}
      />
    </>
  );
};

export default OrganizationSettings; 