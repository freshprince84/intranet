import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, TrashIcon, ArrowsRightLeftIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../../config/api.ts';
import { useAuth } from '../../hooks/useAuth.tsx';
import { useSidepane } from '../../contexts/SidepaneContext.tsx';
import { format } from 'date-fns';
import SwapRequestModal from './SwapRequestModal.tsx';

interface Shift {
  id: number;
  shiftTemplateId: number;
  branchId: number;
  roleId: number;
  userId: number | null;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'swapped';
  notes?: string;
  shiftTemplate?: {
    id: number;
    name: string;
    startTime: string;
    endTime: string;
  };
  branch?: {
    id: number;
    name: string;
  };
  role?: {
    id: number;
    name: string;
  };
  user?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface ShiftTemplate {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  branchId: number;
  roleId: number;
  isActive: boolean;
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

interface EditShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShiftUpdated: (updatedShift: Shift) => void;
  onShiftDeleted: (shiftId: number) => void;
  shift: Shift;
}

const EditShiftModal: React.FC<EditShiftModalProps> = ({ 
  isOpen, 
  onClose, 
  onShiftUpdated,
  onShiftDeleted,
  shift 
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { openSidepane, closeSidepane } = useSidepane();
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  const [shiftTemplateId, setShiftTemplateId] = useState<number>(shift.shiftTemplateId);
  const [branchId, setBranchId] = useState<number>(shift.branchId);
  const [roleId, setRoleId] = useState<number>(shift.roleId);
  const [userId, setUserId] = useState<number | ''>(shift.userId || '');
  const [date, setDate] = useState(format(new Date(shift.date), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState(shift.notes || '');
  const [status, setStatus] = useState<Shift['status']>(shift.status);
  
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);

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
      // Setze initiale Werte
      setShiftTemplateId(shift.shiftTemplateId);
      setBranchId(shift.branchId);
      setRoleId(shift.roleId);
      setUserId(shift.userId || '');
      setDate(format(new Date(shift.date), 'yyyy-MM-dd'));
      setNotes(shift.notes || '');
      setStatus(shift.status);
      setError(null);
      fetchData();
    } else {
      closeSidepane();
      setShowDeleteConfirm(false);
    }
    
    return () => {
      closeSidepane();
    };
  }, [isOpen, shift, openSidepane, closeSidepane]);

  // Lade Templates neu, wenn Branch oder Rolle geändert wird
  useEffect(() => {
    if (isOpen && branchId && roleId) {
      fetchTemplates();
    }
  }, [isOpen, branchId, roleId]);

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

      // Lade Templates für aktuelle Branch/Role
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
          includeInactive: true // Erlaube auch inaktive Templates für bestehende Schichten
        }
      });

      const templatesData = response.data.data || response.data || [];
      setTemplates(templatesData);
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

      const updateData: any = {
        userId: userId ? Number(userId) : null,
        date: date,
        notes: notes || null,
        status: status
      };

      const response = await axiosInstance.put(API_ENDPOINTS.SHIFTS.BY_ID(shift.id), updateData);

      console.log('Schicht erfolgreich aktualisiert:', response.data);
      onShiftUpdated(response.data.data || response.data);
      handleClose();
    } catch (err: any) {
      console.error('Fehler beim Aktualisieren der Schicht:', err);
      const errorMessage = err.response?.data?.message || err.message || t('teamWorktime.shifts.modal.errors.updateError');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Nicht authentifiziert');
        setLoading(false);
        return;
      }

      await axiosInstance.delete(API_ENDPOINTS.SHIFTS.BY_ID(shift.id));

      console.log('Schicht erfolgreich gelöscht');
      onShiftDeleted(shift.id);
      handleClose();
    } catch (err: any) {
      console.error('Fehler beim Löschen der Schicht:', err);
      const errorMessage = err.response?.data?.message || err.message || t('teamWorktime.shifts.modal.errors.deleteError');
      setError(errorMessage);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setShowDeleteConfirm(false);
    onClose();
  };

  const renderForm = () => (
    <div className="space-y-4">
      {/* Branch (read-only, da nicht änderbar) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.modal.edit.branch')}
        </label>
        <input
          type="text"
          value={branches.find(b => b.id === branchId)?.name || ''}
          disabled
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
        />
      </div>

      {/* Role (read-only, da nicht änderbar) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.modal.edit.role')}
        </label>
        <input
          type="text"
          value={roles.find(r => r.id === roleId)?.name || ''}
          disabled
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
        />
      </div>

      {/* Template (read-only, da nicht änderbar) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.modal.edit.template')}
        </label>
        <input
          type="text"
          value={shift.shiftTemplate?.name || ''}
          disabled
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
        />
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.modal.edit.date')} *
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* User */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.modal.edit.user')}
        </label>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value ? Number(e.target.value) : '')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('teamWorktime.shifts.modal.edit.selectUser')}</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.firstName} {user.lastName}
            </option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.modal.edit.status')} *
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Shift['status'])}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="scheduled">{t('teamWorktime.shifts.status.scheduled')}</option>
          <option value="confirmed">{t('teamWorktime.shifts.status.confirmed')}</option>
          <option value="cancelled">{t('teamWorktime.shifts.status.cancelled')}</option>
          <option value="swapped">{t('teamWorktime.shifts.status.swapped')}</option>
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.modal.edit.notes')}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t('teamWorktime.shifts.modal.edit.notesPlaceholder')}
        />
      </div>

      {/* Swap Button - nur wenn Schicht dem aktuellen User gehört */}
      {shift.userId === user?.id && shift.status !== 'cancelled' && shift.status !== 'swapped' && (
        <div className="pt-4 border-t dark:border-gray-700">
          <button
            type="button"
            onClick={() => setIsSwapModalOpen(true)}
            className="w-full px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2"
          >
            <ArrowsRightLeftIcon className="h-5 w-5" />
            {t('teamWorktime.shifts.actions.swap')}
          </button>
        </div>
      )}

      {/* Delete Button */}
      <div className="pt-4 border-t dark:border-gray-700">
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center justify-center gap-2"
        >
          <TrashIcon className="h-5 w-5" />
          {t('teamWorktime.shifts.modal.edit.delete')}
        </button>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-700 dark:text-red-400 mb-3">
            {t('teamWorktime.shifts.modal.edit.deleteConfirm')}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {t('common.yes')}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              {t('common.no')}
            </button>
          </div>
        </div>
      )}
    </div>
  );

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
                  {t('teamWorktime.shifts.modal.edit.title')}
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
                  renderForm()
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t dark:border-gray-700 flex-shrink-0 flex justify-end gap-2">
                <div className="relative group">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                    title={t('common.cancel')}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                    {t('common.cancel')}
                  </div>
                </div>
                <div className="relative group">
                  <button
                    type="submit"
                    disabled={loading || loadingData}
                    className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={loading ? t('common.saving') : t('common.save')}
                  >
                    {loading ? (
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    ) : (
                      <CheckIcon className="h-5 w-5" />
                    )}
                  </button>
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                    {loading ? t('common.saving') : t('common.save')}
                  </div>
                </div>
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
            {t('teamWorktime.shifts.modal.edit.title')}
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
              renderForm()
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t dark:border-gray-700 flex-shrink-0 flex justify-end gap-2">
            <div className="relative group">
              <button
                type="button"
                onClick={handleClose}
                className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title={t('common.cancel')}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                {t('common.cancel')}
              </div>
            </div>
            <div className="relative group">
              <button
                type="submit"
                disabled={loading || loadingData}
                className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={loading ? t('common.saving') : t('common.save')}
              >
                {loading ? (
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckIcon className="h-5 w-5" />
                )}
              </button>
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                {loading ? t('common.saving') : t('common.save')}
              </div>
            </div>
          </div>
        </form>
      </div>
      
      {/* Swap Request Modal */}
      {shift.userId === user?.id && (
        <SwapRequestModal
          isOpen={isSwapModalOpen}
          onClose={() => setIsSwapModalOpen(false)}
          onSwapRequestCreated={() => {
            setIsSwapModalOpen(false);
            onShiftUpdated(shift); // Aktualisiere Schicht (Status könnte sich geändert haben)
          }}
          originalShift={shift}
        />
      )}
    </>
  );
};

export default EditShiftModal;

