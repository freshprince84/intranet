import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, CheckIcon, UserIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { passwordManagerApi, PasswordEntryPermission, UpdatePermissionsData } from '../services/passwordManagerApi.ts';
import { toast } from 'react-toastify';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';

interface PasswordEntryPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryId: number;
  onPermissionsUpdated: () => void;
}

interface Role {
  id: number;
  name: string;
}

interface User {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

const PasswordEntryPermissionsModal: React.FC<PasswordEntryPermissionsModalProps> = ({
  isOpen,
  onClose,
  entryId,
  onPermissionsUpdated
}) => {
  const { t } = useTranslation();
  const [rolePermissions, setRolePermissions] = useState<PasswordEntryPermission[]>([]);
  const [userPermissions, setUserPermissions] = useState<PasswordEntryPermission[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');

  // Lade Berechtigungen und verfügbare Rollen/User
  useEffect(() => {
    if (isOpen && entryId) {
      loadData();
    }
  }, [isOpen, entryId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [permissions, rolesResponse, usersResponse] = await Promise.all([
        passwordManagerApi.getPermissions(entryId),
        axiosInstance.get(API_ENDPOINTS.ROLES.BASE),
        axiosInstance.get(API_ENDPOINTS.USERS.BASE)
      ]);

      setRolePermissions(permissions.rolePermissions);
      setUserPermissions(permissions.userPermissions);
      setAvailableRoles(rolesResponse.data || []);
      setAvailableUsers(usersResponse.data || []);
    } catch (error: any) {
      console.error('Error loading permissions:', error);
      toast.error(t('passwordManager.errorLoadingPermissions') || 'Fehler beim Laden der Berechtigungen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRolePermission = () => {
    if (!selectedRoleId || rolePermissions.find(rp => rp.roleId === selectedRoleId)) {
      return;
    }

    const role = availableRoles.find(r => r.id === selectedRoleId);
    if (!role) return;

    setRolePermissions([
      ...rolePermissions,
      {
        id: 0,
        passwordEntryId: entryId,
        roleId: selectedRoleId as number,
        canView: false,
        canEdit: false,
        canDelete: false,
        role: { id: role.id, name: role.name }
      }
    ]);
    setSelectedRoleId('');
  };

  const handleAddUserPermission = () => {
    if (!selectedUserId || userPermissions.find(up => up.userId === selectedUserId)) {
      return;
    }

    const user = availableUsers.find(u => u.id === selectedUserId);
    if (!user) return;

    setUserPermissions([
      ...userPermissions,
      {
        id: 0,
        passwordEntryId: entryId,
        userId: selectedUserId as number,
        canView: false,
        canEdit: false,
        canDelete: false,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        }
      }
    ]);
    setSelectedUserId('');
  };

  const handleRemoveRolePermission = (roleId: number) => {
    setRolePermissions(rolePermissions.filter(rp => rp.roleId !== roleId));
  };

  const handleRemoveUserPermission = (userId: number) => {
    setUserPermissions(userPermissions.filter(up => up.userId !== userId));
  };

  const handleTogglePermission = (
    type: 'role' | 'user',
    id: number,
    permission: 'canView' | 'canEdit' | 'canDelete'
  ) => {
    if (type === 'role') {
      setRolePermissions(
        rolePermissions.map(rp =>
          rp.roleId === id ? { ...rp, [permission]: !rp[permission] } : rp
        )
      );
    } else {
      setUserPermissions(
        userPermissions.map(up =>
          up.userId === id ? { ...up, [permission]: !up[permission] } : up
        )
      );
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const data: UpdatePermissionsData = {
        rolePermissions: rolePermissions.map(rp => ({
          roleId: rp.roleId!,
          canView: rp.canView,
          canEdit: rp.canEdit,
          canDelete: rp.canDelete
        })),
        userPermissions: userPermissions.map(up => ({
          userId: up.userId!,
          canView: up.canView,
          canEdit: up.canEdit,
          canDelete: up.canDelete
        }))
      };

      await passwordManagerApi.updatePermissions(entryId, data);
      toast.success(t('passwordManager.permissionsUpdated') || 'Berechtigungen erfolgreich aktualisiert');
      onPermissionsUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      toast.error(t('passwordManager.errorSavingPermissions') || 'Fehler beim Speichern der Berechtigungen');
    } finally {
      setIsSaving(false);
    }
  };

  const availableRolesToAdd = availableRoles.filter(
    r => !rolePermissions.find(rp => rp.roleId === r.id)
  );
  const availableUsersToAdd = availableUsers.filter(
    u => !userPermissions.find(up => up.userId === u.id)
  );

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
            <Dialog.Title className="text-lg font-semibold dark:text-white">
              {t('passwordManager.managePermissions')}
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
            ) : (
              <div className="space-y-6">
                {/* Rollen-Berechtigungen */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-md font-semibold dark:text-white flex items-center gap-2">
                      <UserGroupIcon className="h-5 w-5" />
                      {t('passwordManager.rolePermissions')}
                    </h3>
                    {availableRolesToAdd.length > 0 && (
                      <div className="flex gap-2">
                        <select
                          value={selectedRoleId}
                          onChange={(e) => setSelectedRoleId(Number(e.target.value) || '')}
                          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">{t('passwordManager.selectRole')}</option>
                          {availableRolesToAdd.map(role => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleAddRolePermission}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          {t('common.add')}
                        </button>
                      </div>
                    )}
                  </div>

                  {rolePermissions.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('passwordManager.noRolePermissions')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {rolePermissions.map(rp => (
                        <div
                          key={rp.roleId}
                          className="p-3 border border-gray-200 dark:border-gray-700 rounded-md"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium dark:text-white">
                              {rp.role?.name || `Rolle ${rp.roleId}`}
                            </span>
                            <button
                              onClick={() => handleRemoveRolePermission(rp.roleId!)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 text-sm"
                            >
                              {t('common.remove')}
                            </button>
                          </div>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={rp.canView}
                                onChange={() => handleTogglePermission('role', rp.roleId!, 'canView')}
                                className="rounded"
                              />
                              <span className="text-sm dark:text-gray-300">{t('passwordManager.canView')}</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={rp.canEdit}
                                onChange={() => handleTogglePermission('role', rp.roleId!, 'canEdit')}
                                className="rounded"
                              />
                              <span className="text-sm dark:text-gray-300">{t('passwordManager.canEdit')}</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={rp.canDelete}
                                onChange={() => handleTogglePermission('role', rp.roleId!, 'canDelete')}
                                className="rounded"
                              />
                              <span className="text-sm dark:text-gray-300">{t('passwordManager.canDelete')}</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* User-Berechtigungen */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-md font-semibold dark:text-white flex items-center gap-2">
                      <UserIcon className="h-5 w-5" />
                      {t('passwordManager.userPermissions')}
                    </h3>
                    {availableUsersToAdd.length > 0 && (
                      <div className="flex gap-2">
                        <select
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(Number(e.target.value) || '')}
                          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">{t('passwordManager.selectUser')}</option>
                          {availableUsersToAdd.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.firstName} {user.lastName} ({user.email})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleAddUserPermission}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          {t('common.add')}
                        </button>
                      </div>
                    )}
                  </div>

                  {userPermissions.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('passwordManager.noUserPermissions')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {userPermissions.map(up => (
                        <div
                          key={up.userId}
                          className="p-3 border border-gray-200 dark:border-gray-700 rounded-md"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium dark:text-white">
                              {up.user?.firstName} {up.user?.lastName} ({up.user?.email})
                            </span>
                            <button
                              onClick={() => handleRemoveUserPermission(up.userId!)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 text-sm"
                            >
                              {t('common.remove')}
                            </button>
                          </div>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={up.canView}
                                onChange={() => handleTogglePermission('user', up.userId!, 'canView')}
                                className="rounded"
                              />
                              <span className="text-sm dark:text-gray-300">{t('passwordManager.canView')}</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={up.canEdit}
                                onChange={() => handleTogglePermission('user', up.userId!, 'canEdit')}
                                className="rounded"
                              />
                              <span className="text-sm dark:text-gray-300">{t('passwordManager.canEdit')}</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={up.canDelete}
                                onChange={() => handleTogglePermission('user', up.userId!, 'canDelete')}
                                className="rounded"
                              />
                              <span className="text-sm dark:text-gray-300">{t('passwordManager.canDelete')}</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 p-4 border-t dark:border-gray-700 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              <CheckIcon className="h-5 w-5" />
              {t('common.save')}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default PasswordEntryPermissionsModal;

