import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { API_ENDPOINTS } from '../../config/api.ts';
import { roleApi } from '../../api/apiClient.ts';
import { Role } from '../../types/interfaces.ts';
import useMessage from '../../hooks/useMessage.ts';
import { CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface Organization {
  id: number;
  displayName?: string;
  name?: string;
  settings?: any;
}

interface RoleConfigurationTabProps {
  organization: Organization | null;
  onSave?: () => void;
}

const RoleConfigurationTab: React.FC<RoleConfigurationTabProps> = ({
  organization,
  onSave
}) => {
  const { t } = useTranslation();
  const { showMessage } = useMessage();
  const [roles, setRoles] = useState<Role[]>([]);
  const [lifecycleRoles, setLifecycleRoles] = useState<{
    adminRoleId?: number | null;
    hrRoleId?: number | null;
    legalRoleId?: number | null;
    employeeRoleIds?: number[];
  }>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

  useEffect(() => {
    if (organization) {
      loadRoles();
      loadLifecycleRoles();
    }
  }, [organization]);

  const loadRoles = async () => {
    setLoadingRoles(true);
    try {
      const response = await roleApi.getAll();
      if (response.data && Array.isArray(response.data)) {
        setRoles(response.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Rollen:', error);
      showMessage(
        t('lifecycle.loadRolesError') || 'Fehler beim Laden der Rollen',
        'error'
      );
    } finally {
      setLoadingRoles(false);
    }
  };

  const loadLifecycleRoles = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.ORGANIZATION_LIFECYCLE.LIFECYCLE_ROLES);
      setLifecycleRoles(response.data.lifecycleRoles || {});
    } catch (error: any) {
      console.error('Fehler beim Laden der Lebenszyklus-Rollen:', error);
      // Wenn 404, dann gibt es noch keine Konfiguration - das ist OK
      if (error.response?.status !== 404) {
        showMessage(
          error.response?.data?.message || t('lifecycle.loadLifecycleRolesError') || 'Fehler beim Laden der Konfiguration',
          'error'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosInstance.put(API_ENDPOINTS.ORGANIZATION_LIFECYCLE.LIFECYCLE_ROLES, {
        adminRoleId: lifecycleRoles.adminRoleId || null,
        hrRoleId: lifecycleRoles.hrRoleId || null,
        legalRoleId: lifecycleRoles.legalRoleId || null,
        employeeRoleIds: lifecycleRoles.employeeRoleIds || []
      });
      showMessage(
        t('lifecycle.rolesSaved') || 'Rollen-Konfiguration erfolgreich gespeichert',
        'success'
      );
      if (onSave) {
        onSave();
      }
    } catch (error: any) {
      console.error('Fehler beim Speichern:', error);
      showMessage(
        error.response?.data?.message || t('lifecycle.saveError') || 'Fehler beim Speichern',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAssignStandardRoles = () => {
    // Finde Standard-Rollen
    const adminRole = roles.find(r => r.name.toLowerCase().includes('admin') || r.name.toLowerCase().includes('administrator'));
    const hrRole = roles.find(r => r.name.toLowerCase().includes('hr') || r.name.toLowerCase().includes('human'));
    const legalRole = roles.find(r => r.name.toLowerCase() === 'derecho' || r.name.toLowerCase().includes('legal'));

    setLifecycleRoles({
      ...lifecycleRoles,
      adminRoleId: adminRole?.id || null,
      hrRoleId: hrRole?.id || null,
      legalRoleId: legalRole?.id || null
    });

    showMessage(
      t('lifecycle.standardRolesAssigned') || 'Standard-Rollen zugewiesen',
      'success'
    );
  };

  if (loading && !lifecycleRoles) {
    return (
      <div className="flex items-center justify-center py-8">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold dark:text-white">
            {t('organization.lifecycleRoles.title') || 'Lebenszyklus-Rollen'}
          </h3>
          <button
            onClick={handleAssignStandardRoles}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            {t('lifecycle.assignStandardRoles') || 'Standard-Rollen zuweisen'}
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('organization.lifecycleRoles.admin') || 'Admin-Rolle'}
            </label>
            <select
              value={lifecycleRoles.adminRoleId || ''}
              onChange={(e) => setLifecycleRoles({ 
                ...lifecycleRoles, 
                adminRoleId: e.target.value ? parseInt(e.target.value, 10) : null 
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingRoles}
            >
              <option value="">{t('common.select') || 'Bitte wählen...'}</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('organization.lifecycleRoles.hr') || 'HR-Rolle'}
            </label>
            <select
              value={lifecycleRoles.hrRoleId || ''}
              onChange={(e) => setLifecycleRoles({ 
                ...lifecycleRoles, 
                hrRoleId: e.target.value ? parseInt(e.target.value, 10) : null 
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingRoles}
            >
              <option value="">{t('common.select') || 'Bitte wählen...'}</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('organization.lifecycleRoles.legal') || 'Legal-Rolle'}
            </label>
            <select
              value={lifecycleRoles.legalRoleId || ''}
              onChange={(e) => setLifecycleRoles({ 
                ...lifecycleRoles, 
                legalRoleId: e.target.value ? parseInt(e.target.value, 10) : null 
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingRoles}
            >
              <option value="">{t('common.select') || 'Bitte wählen...'}</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || loadingRoles}
            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={saving ? (t('common.saving') || 'Speichere...') : (t('common.save') || 'Speichern')}
          >
            {saving ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <CheckIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleConfigurationTab;

