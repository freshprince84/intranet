import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../../config/api.ts';
import { useAuth } from '../../hooks/useAuth.tsx';
import { useSidepane } from '../../contexts/SidepaneContext.tsx';
import { format } from 'date-fns';

interface ShiftTemplate {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  branchId: number;
  roleId: number;
  isActive: boolean;
  branch?: {
    id: number;
    name: string;
  };
  role?: {
    id: number;
    name: string;
  };
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
}

interface Role {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
}

interface CreateShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShiftCreated: (newShift: any) => void;
  initialDate?: Date;
  initialBranchId?: number;
  initialRoleId?: number;
}

const CreateShiftModal = ({ 
  isOpen, 
  onClose, 
  onShiftCreated,
  initialDate,
  initialBranchId,
  initialRoleId
}: CreateShiftModalProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { openSidepane, closeSidepane } = useSidepane();
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  const [shiftTemplateId, setShiftTemplateId] = useState<number | ''>('');
  const [branchId, setBranchId] = useState<number | ''>(initialBranchId || '');
  const [roleId, setRoleId] = useState<number | ''>(initialRoleId || '');
  const [userId, setUserId] = useState<number | ''>('');
  const [date, setDate] = useState(initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

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

  useEffect(() => {
    if (isOpen) {
      openSidepane();
      fetchData();
    } else {
      closeSidepane();
    }
    
    return () => {
      closeSidepane();
    };
  }, [isOpen, openSidepane, closeSidepane]);

  // Lade Templates neu, wenn Branch oder Rolle geändert wird
  useEffect(() => {
    if (isOpen && branchId && roleId) {
      fetchTemplates();
    }
  }, [isOpen, branchId, roleId]);

  // Setze erste Branch/Role, wenn geladen
  useEffect(() => {
    if (branches.length > 0 && branchId === '') {
      const defaultBranch = initialBranchId 
        ? branches.find(b => b.id === initialBranchId) || branches[0]
        : branches[0];
      setBranchId(defaultBranch.id);
    }
  }, [branches, branchId, initialBranchId]);

  useEffect(() => {
    if (roles.length > 0 && roleId === '') {
      const defaultRole = initialRoleId
        ? roles.find(r => r.id === initialRoleId) || roles[0]
        : roles[0];
      setRoleId(defaultRole.id);
    }
  }, [roles, roleId, initialRoleId]);

  const fetchData = async () => {
    setLoadingData(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Nicht authentifiziert');
        setLoadingData(false);
        return;
      }

      const [branchesResponse, rolesResponse, usersResponse] = await Promise.all([
        axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE),
        axiosInstance.get(API_ENDPOINTS.ROLES.BASE),
        axiosInstance.get(API_ENDPOINTS.USERS.DROPDOWN)
      ]);

      setBranches(branchesResponse.data || []);
      setRoles(rolesResponse.data || []);
      setUsers(usersResponse.data || []);

      // Lade Templates, wenn Branch und Role bereits gesetzt sind
      if (branchId && roleId) {
        await fetchTemplates();
      }
    } catch (err: any) {
      console.error('Fehler beim Laden der Daten:', err);
      setError(err.response?.data?.message || err.message || t('teamWorktime.shifts.modal.errors.loadDataError'));
    } finally {
      setLoadingData(false);
    }
  };

  const fetchTemplates = async () => {
    if (!branchId || !roleId) return;

    try {
      setError(null);
      const response = await axiosInstance.get(API_ENDPOINTS.SHIFTS.TEMPLATES.BASE, {
        params: {
          branchId: Number(branchId),
          roleId: Number(roleId),
          includeInactive: false
        }
      });

      const templatesData = response.data.data || response.data || [];
      setTemplates(templatesData);

      // Setze erstes Template, wenn nur eins vorhanden
      if (templatesData.length === 1 && !shiftTemplateId) {
        setShiftTemplateId(templatesData[0].id);
      }
    } catch (err: any) {
      console.error('Fehler beim Laden der Templates:', err);
      setError(err.response?.data?.message || err.message || t('teamWorktime.shifts.modal.errors.loadTemplatesError'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validierung
      if (!shiftTemplateId || !branchId || !roleId || !date) {
        setError(t('teamWorktime.shifts.modal.errors.fillRequiredFields'));
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Nicht authentifiziert');
        setLoading(false);
        return;
      }

      const shiftData: any = {
        shiftTemplateId: Number(shiftTemplateId),
        branchId: Number(branchId),
        roleId: Number(roleId),
        date: date,
        notes: notes || null
      };

      // User optional hinzufügen
      if (userId) {
        shiftData.userId = Number(userId);
      }

      const response = await axiosInstance.post(API_ENDPOINTS.SHIFTS.BASE, shiftData);

      console.log('Schicht erfolgreich erstellt:', response.data);
      onShiftCreated(response.data.data || response.data);
      handleClose();
    } catch (err: any) {
      console.error('Fehler beim Erstellen der Schicht:', err);
      const errorMessage = err.response?.data?.message || err.message || t('teamWorktime.shifts.modal.errors.createError');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setShiftTemplateId('');
    setBranchId(initialBranchId || '');
    setRoleId(initialRoleId || '');
    setUserId('');
    setDate(initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setNotes('');
    onClose();
  };

  const selectedTemplate = templates.find(t => t.id === Number(shiftTemplateId));

  // Mobile (unter 640px) - Modal
  if (isMobile) {
    return (
      <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-lg font-semibold dark:text-white">
                  {t('teamWorktime.shifts.modal.create.title')}
                </Dialog.Title>
                <button
                  onClick={handleClose}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 overflow-y-auto flex-1 min-h-0">
                {error && (
                  <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
                    {error}
                  </div>
                )}

                {loadingData ? (
                  <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                    {t('common.loading')}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Branch */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('teamWorktime.shifts.modal.create.branch')} *
                      </label>
                      <select
                        value={branchId}
                        onChange={(e) => {
                          setBranchId(Number(e.target.value));
                          setShiftTemplateId(''); // Reset Template bei Branch-Änderung
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">{t('teamWorktime.shifts.modal.create.selectBranch')}</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Role */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('teamWorktime.shifts.modal.create.role')} *
                      </label>
                      <select
                        value={roleId}
                        onChange={(e) => {
                          setRoleId(Number(e.target.value));
                          setShiftTemplateId(''); // Reset Template bei Role-Änderung
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">{t('teamWorktime.shifts.modal.create.selectRole')}</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Template */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('teamWorktime.shifts.modal.create.template')} *
                      </label>
                      <select
                        value={shiftTemplateId}
                        onChange={(e) => setShiftTemplateId(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={!branchId || !roleId}
                      >
                        <option value="">{t('teamWorktime.shifts.modal.create.selectTemplate')}</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name} ({template.startTime} - {template.endTime})
                          </option>
                        ))}
                      </select>
                      {(!branchId || !roleId) && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {t('teamWorktime.shifts.modal.create.selectBranchRoleFirst')}
                        </p>
                      )}
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('teamWorktime.shifts.modal.create.date')} *
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    {/* User (optional) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('teamWorktime.shifts.modal.create.user')}
                      </label>
                      <select
                        value={userId}
                        onChange={(e) => setUserId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">{t('teamWorktime.shifts.modal.create.selectUser')}</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('teamWorktime.shifts.modal.create.notes')}
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t('teamWorktime.shifts.modal.create.notesPlaceholder')}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t dark:border-gray-700 flex-shrink-0 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading || loadingData}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  }

  // Desktop (ab 640px) - Sidepane
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
            {t('teamWorktime.shifts.modal.create.title')}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 overflow-y-auto flex-1 min-h-0">
            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
                {error}
              </div>
            )}

            {loadingData ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                {t('common.loading')}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Branch */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('teamWorktime.shifts.modal.create.branch')} *
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => {
                      setBranchId(Number(e.target.value));
                      setShiftTemplateId(''); // Reset Template bei Branch-Änderung
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">{t('teamWorktime.shifts.modal.create.selectBranch')}</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('teamWorktime.shifts.modal.create.role')} *
                  </label>
                  <select
                    value={roleId}
                    onChange={(e) => {
                      setRoleId(Number(e.target.value));
                      setShiftTemplateId(''); // Reset Template bei Role-Änderung
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">{t('teamWorktime.shifts.modal.create.selectRole')}</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Template */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('teamWorktime.shifts.modal.create.template')} *
                  </label>
                  <select
                    value={shiftTemplateId}
                    onChange={(e) => setShiftTemplateId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={!branchId || !roleId}
                  >
                    <option value="">{t('teamWorktime.shifts.modal.create.selectTemplate')}</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.startTime} - {template.endTime})
                      </option>
                    ))}
                  </select>
                  {(!branchId || !roleId) && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t('teamWorktime.shifts.modal.create.selectBranchRoleFirst')}
                    </p>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('teamWorktime.shifts.modal.create.date')} *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* User (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('teamWorktime.shifts.modal.create.user')}
                  </label>
                  <select
                    value={userId}
                    onChange={(e) => setUserId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('teamWorktime.shifts.modal.create.selectUser')}</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('teamWorktime.shifts.modal.create.notes')}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('teamWorktime.shifts.modal.create.notesPlaceholder')}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t dark:border-gray-700 flex-shrink-0 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || loadingData}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CreateShiftModal;

