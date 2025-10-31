import React, { useState, useEffect, useCallback } from 'react';
import { BuildingOfficeIcon, PlusIcon, UserPlusIcon, UserGroupIcon, ShieldCheckIcon, EnvelopeIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { organizationService } from '../../services/organizationService.ts';
import { Organization, UpdateOrganizationRequest } from '../../types/organization.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import useMessage from '../../hooks/useMessage.ts';
import CreateOrganizationModal from './CreateOrganizationModal.tsx';
import JoinOrganizationModal from './JoinOrganizationModal.tsx';

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
  const [formData, setFormData] = useState<UpdateOrganizationRequest>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState<boolean>(false);
  const { canViewOrganization, canManageOrganization, loading: permissionsLoading } = usePermissions();
  const { showMessage } = useMessage();

  const fetchOrganization = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const org = await organizationService.getCurrentOrganization();
      setOrganization(org);
      setFormData({
        displayName: org.displayName || '',
        domain: org.domain || '',
        logo: org.logo || '',
        settings: org.settings
      });
      
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
      const errorMessage = err.response?.data?.message || 'Fehler beim Laden der Organisation';
      setError(errorMessage);
      showMessage(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    // Warte bis Berechtigungen geladen sind
    if (permissionsLoading) {
      return;
    }

    if (canViewOrganization()) {
      fetchOrganization();
    } else {
      setError('Keine Berechtigung zum Anzeigen der Organisation');
      setLoading(false);
    }
  }, [canViewOrganization, permissionsLoading, fetchOrganization]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Fehler beim Ändern löschen
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canManageOrganization()) {
      const errorMessage = 'Keine Berechtigung zum Bearbeiten der Organisation';
      setError(errorMessage);
      showMessage(errorMessage, 'error');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      const updatedOrg = await organizationService.updateOrganization(formData);
      setOrganization(updatedOrg);
      showMessage('Organisation erfolgreich aktualisiert', 'success');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Fehler beim Aktualisieren der Organisation';
      setError(errorMessage);
      showMessage(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (permissionsLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow p-6 mb-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-700 dark:text-gray-300">Lade Berechtigungen...</span>
        </div>
      </div>
    );
  }

  if (!canViewOrganization()) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow p-6 mb-6">
        <div className="p-4 text-red-600 dark:text-red-400">
          Keine Berechtigung zum Anzeigen der Organisationseinstellungen.
        </div>
      </div>
    );
  }

  const handleCreateSuccess = () => {
    fetchOrganization();
  };

  const handleJoinSuccess = () => {
    // Nach Beitritt: Organisation neu laden
    fetchOrganization();
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow p-6 sm:p-6 mb-6">
        {/* Titelzeile mit Icon und Action-Buttons */}
        <div className="flex items-center justify-between mb-4 sm:mb-4">
          <h2 className="text-xl sm:text-xl font-semibold flex items-center dark:text-white">
            <BuildingOfficeIcon className="h-6 w-6 sm:h-6 sm:w-6 mr-2 sm:mr-2" />
            Organisationseinstellungen
          </h2>
          
          <div className="flex items-center gap-2">
            {/* Button: Organisation beitreten */}
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md dark:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
              title="Organisation beitreten"
            >
              <UserPlusIcon className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Beitreten</span>
            </button>
            
            {/* Button: Neue Organisation erstellen */}
            {canManageOrganization() && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md dark:bg-green-700 dark:hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center"
                title="Neue Organisation erstellen"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Neu</span>
              </button>
            )}
          </div>
        </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-700 dark:text-gray-300">Lade Organisation...</span>
        </div>
      ) : (
        <>
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded">
              {error}
            </div>
          )}

          {/* Formular */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label 
                htmlFor="displayName" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Anzeigename
              </label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName || ''}
                onChange={handleChange}
                disabled={!canManageOrganization() || saving}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label 
                htmlFor="domain" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Domain
              </label>
              <input
                type="text"
                id="domain"
                name="domain"
                value={formData.domain || ''}
                onChange={handleChange}
                disabled={!canManageOrganization() || saving}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label 
                htmlFor="logo" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Logo URL
              </label>
              <input
                type="text"
                id="logo"
                name="logo"
                value={formData.logo || ''}
                onChange={handleChange}
                disabled={!canManageOrganization() || saving}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            </div>

            {canManageOrganization() && (
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md dark:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Speichern...
                    </>
                  ) : (
                    'Speichern'
                  )}
                </button>
              </div>
            )}
          </form>

          {/* Statistik-Cards */}
          {stats && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statistiken</h3>
              {loadingStats ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Lade Statistiken...</span>
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
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Benutzer</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                          {stats.currentUsers} / {stats.maxUsers}
                        </p>
                        {stats.utilizationPercent !== undefined && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {stats.utilizationPercent}% Auslastung
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
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rollen</p>
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
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Beitrittsanfragen</p>
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
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Einladungen</p>
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
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Auslastung</p>
                          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {stats.utilizationPercent}%
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {stats.availableSlots} Plätze verfügbar
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Info-Bereich */}
          {organization && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Organisationsname:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">{organization.name}</span>
                </div>
                {organization.subscriptionPlan && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Abonnement-Plan:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white capitalize">
                      {organization.subscriptionPlan}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
      </div>

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
    </>
  );
};

export default OrganizationSettings; 