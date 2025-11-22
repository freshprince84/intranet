import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, PencilIcon, TrashIcon, PlusIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../../config/api.ts';
import { useAuth } from '../../hooks/useAuth.tsx';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { useSidepane } from '../../contexts/SidepaneContext.tsx';
import { format } from 'date-fns';

interface UserAvailability {
  id: number;
  userId: number;
  branchId: number | null;
  roleId: number | null;
  dayOfWeek: number | null; // 0=Sonntag, 6=Samstag, null=alle Tage
  startTime: string | null;
  endTime: string | null;
  startDate: string | null;
  endDate: string | null;
  type: 'available' | 'preferred' | 'unavailable';
  priority: number;
  notes: string | null;
  isActive: boolean;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  branch?: {
    id: number;
    name: string;
  };
  role?: {
    id: number;
    name: string;
  };
}

interface Role {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
}

interface AvailabilityManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
}

const AvailabilityManagement = ({ isOpen, onClose }: AvailabilityManagementProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { openSidepane, closeSidepane } = useSidepane();
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  // Prüfe, ob User Verfügbarkeiten für andere User verwalten darf
  const canManageAllAvailabilities = hasPermission('availability_management', 'write', 'page');
  
  const [availabilities, setAvailabilities] = useState<UserAvailability[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<UserAvailability | null>(null);
  const [formData, setFormData] = useState({
    userId: null as number | null,
    branchId: '' as number | '',
    roleId: '' as number | '',
    dayOfWeek: '' as number | '' | null,
    startTime: '',
    endTime: '',
    startDate: '',
    endDate: '',
    type: 'available' as 'available' | 'preferred' | 'unavailable',
    priority: 5,
    notes: '',
    isActive: true
  });

  const dayOfWeekOptions = [
    { value: '', label: t('teamWorktime.shifts.availabilities.form.allDays') },
    { value: 0, label: t('teamWorktime.shifts.availabilities.form.sunday') },
    { value: 1, label: t('teamWorktime.shifts.availabilities.form.monday') },
    { value: 2, label: t('teamWorktime.shifts.availabilities.form.tuesday') },
    { value: 3, label: t('teamWorktime.shifts.availabilities.form.wednesday') },
    { value: 4, label: t('teamWorktime.shifts.availabilities.form.thursday') },
    { value: 5, label: t('teamWorktime.shifts.availabilities.form.friday') },
    { value: 6, label: t('teamWorktime.shifts.availabilities.form.saturday') }
  ];

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
      setIsFormOpen(false);
      setEditingAvailability(null);
      resetForm();
      setSelectedUserId(null);
    }
    
    return () => {
      closeSidepane();
    };
  }, [isOpen, openSidepane, closeSidepane, selectedUserId, canManageAllAvailabilities]);

  const fetchData = async () => {
    setLoadingData(true);
    setError(null);
    
    try {
      // Lade User (wenn Permission vorhanden)
      if (canManageAllAvailabilities) {
        try {
          const usersRes = await axiosInstance.get(API_ENDPOINTS.USERS.DROPDOWN);
          setAllUsers(usersRes.data || []);
        } catch (err) {
          console.error('Fehler beim Laden der User:', err);
        }
      }

      // Bestimme userId für API-Request
      const params: any = { includeInactive: true };
      if (canManageAllAvailabilities && selectedUserId) {
        // Admin hat User ausgewählt
        params.userId = selectedUserId;
      } else if (canManageAllAvailabilities && !selectedUserId) {
        // Admin, aber kein User ausgewählt → zeige alle (kein userId Parameter)
        // params bleibt ohne userId
      } else if (user?.id) {
        // Normaler User: nur eigene Verfügbarkeiten
        params.userId = user.id;
      }

      const [availabilitiesRes, rolesRes, branchesRes] = await Promise.all([
        axiosInstance.get(API_ENDPOINTS.SHIFTS.AVAILABILITIES.BASE, { params }),
        axiosInstance.get(API_ENDPOINTS.ROLES.BASE),
        axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE)
      ]);
      
      setAvailabilities(availabilitiesRes.data?.data || availabilitiesRes.data || []);
      setRoles(rolesRes.data || []);
      setBranches(branchesRes.data || []);
    } catch (err: any) {
      console.error('Fehler beim Laden der Daten:', err);
      setError(err.response?.data?.message || err.message || t('teamWorktime.shifts.availabilities.errors.loadError'));
    } finally {
      setLoadingData(false);
    }
  };

  const resetForm = () => {
    setFormData({
      userId: null,
      branchId: '',
      roleId: '',
      dayOfWeek: '',
      startTime: '',
      endTime: '',
      startDate: '',
      endDate: '',
      type: 'available',
      priority: 5,
      notes: '',
      isActive: true
    });
    setEditingAvailability(null);
  };

  const handleEdit = (availability: UserAvailability) => {
    setEditingAvailability(availability);
    setFormData({
      userId: availability.userId, // Beim Bearbeiten: userId setzen (read-only)
      branchId: availability.branchId || '',
      roleId: availability.roleId || '',
      dayOfWeek: availability.dayOfWeek !== null ? availability.dayOfWeek : '',
      startTime: availability.startTime || '',
      endTime: availability.endTime || '',
      startDate: availability.startDate ? format(new Date(availability.startDate), 'yyyy-MM-dd') : '',
      endDate: availability.endDate ? format(new Date(availability.endDate), 'yyyy-MM-dd') : '',
      type: availability.type,
      priority: availability.priority,
      notes: availability.notes || '',
      isActive: availability.isActive
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (availabilityId: number) => {
    if (!window.confirm(t('teamWorktime.shifts.availabilities.deleteConfirm'))) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await axiosInstance.delete(API_ENDPOINTS.SHIFTS.AVAILABILITIES.BY_ID(availabilityId));
      await fetchData();
    } catch (err: any) {
      console.error('Fehler beim Löschen der Verfügbarkeit:', err);
      setError(err.response?.data?.message || err.message || t('teamWorktime.shifts.availabilities.errors.deleteError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const availabilityData: any = {
        branchId: formData.branchId ? Number(formData.branchId) : null,
        roleId: formData.roleId ? Number(formData.roleId) : null,
        dayOfWeek: formData.dayOfWeek === '' ? null : (formData.dayOfWeek === null ? null : Number(formData.dayOfWeek)),
        startTime: formData.startTime || null,
        endTime: formData.endTime || null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        type: formData.type,
        priority: formData.priority,
        notes: formData.notes.trim() || null,
        isActive: formData.isActive
      };

      // Nur userId senden, wenn Permission vorhanden und User ausgewählt
      if (canManageAllAvailabilities && formData.userId) {
        availabilityData.userId = formData.userId;
      }

      if (editingAvailability) {
        await axiosInstance.put(API_ENDPOINTS.SHIFTS.AVAILABILITIES.BY_ID(editingAvailability.id), availabilityData);
      } else {
        await axiosInstance.post(API_ENDPOINTS.SHIFTS.AVAILABILITIES.BASE, availabilityData);
      }

      await fetchData();
      setIsFormOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Fehler beim Speichern der Verfügbarkeit:', err);
      setError(err.response?.data?.message || err.message || t('teamWorktime.shifts.availabilities.errors.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const getDayOfWeekLabel = (dayOfWeek: number | null) => {
    if (dayOfWeek === null) return t('teamWorktime.shifts.availabilities.form.allDays');
    const days = [
      t('teamWorktime.shifts.availabilities.form.sunday'),
      t('teamWorktime.shifts.availabilities.form.monday'),
      t('teamWorktime.shifts.availabilities.form.tuesday'),
      t('teamWorktime.shifts.availabilities.form.wednesday'),
      t('teamWorktime.shifts.availabilities.form.thursday'),
      t('teamWorktime.shifts.availabilities.form.friday'),
      t('teamWorktime.shifts.availabilities.form.saturday')
    ];
    return days[dayOfWeek];
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'available':
        return t('teamWorktime.shifts.availabilities.type.available');
      case 'preferred':
        return t('teamWorktime.shifts.availabilities.type.preferred');
      case 'unavailable':
        return t('teamWorktime.shifts.availabilities.type.unavailable');
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'available':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'preferred':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'unavailable':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* User (nur für Admins) */}
      {canManageAllAvailabilities && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('teamWorktime.shifts.availabilities.form.user')}
          </label>
          <select
            value={formData.userId || ''}
            onChange={(e) => setFormData({ ...formData, userId: e.target.value ? Number(e.target.value) : null })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!!editingAvailability} // Read-only beim Bearbeiten
          >
            <option value="">{t('teamWorktime.shifts.availabilities.form.selectUser')}</option>
            {allUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
          {editingAvailability && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('teamWorktime.shifts.availabilities.form.userReadOnly')}
            </p>
          )}
        </div>
      )}

      {/* Branch (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.availabilities.form.branch')}
        </label>
        <select
          value={formData.branchId}
          onChange={(e) => setFormData({ ...formData, branchId: e.target.value ? Number(e.target.value) : '' })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('teamWorktime.shifts.availabilities.form.selectBranch')}</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      {/* Role (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.availabilities.form.role')}
        </label>
        <select
          value={formData.roleId}
          onChange={(e) => setFormData({ ...formData, roleId: e.target.value ? Number(e.target.value) : '' })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('teamWorktime.shifts.availabilities.form.selectRole')}</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      {/* Day of Week */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.availabilities.form.dayOfWeek')}
        </label>
        <select
          value={formData.dayOfWeek === null ? '' : formData.dayOfWeek}
          onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value === '' ? null : Number(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {dayOfWeekOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Start Time (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.availabilities.form.startTime')}
        </label>
        <input
          type="time"
          value={formData.startTime}
          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {t('teamWorktime.shifts.availabilities.form.startTimeHint')}
        </p>
      </div>

      {/* End Time (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.availabilities.form.endTime')}
        </label>
        <input
          type="time"
          value={formData.endTime}
          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {t('teamWorktime.shifts.availabilities.form.endTimeHint')}
        </p>
      </div>

      {/* Start Date (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.availabilities.form.startDate')}
        </label>
        <input
          type="date"
          value={formData.startDate}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {t('teamWorktime.shifts.availabilities.form.startDateHint')}
        </p>
      </div>

      {/* End Date (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.availabilities.form.endDate')}
        </label>
        <input
          type="date"
          value={formData.endDate}
          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {t('teamWorktime.shifts.availabilities.form.endDateHint')}
        </p>
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.availabilities.form.type')}
        </label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as 'available' | 'preferred' | 'unavailable' })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="available">{t('teamWorktime.shifts.availabilities.type.available')}</option>
          <option value="preferred">{t('teamWorktime.shifts.availabilities.type.preferred')}</option>
          <option value="unavailable">{t('teamWorktime.shifts.availabilities.type.unavailable')}</option>
        </select>
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.availabilities.form.priority')} (1-10)
        </label>
        <input
          type="number"
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          min="1"
          max="10"
        />
      </div>

      {/* Notes (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.availabilities.form.notes')}
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t('teamWorktime.shifts.availabilities.form.notesPlaceholder')}
        />
      </div>

      {/* Is Active */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="isActive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
          {t('teamWorktime.shifts.availabilities.form.isActive')}
        </label>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-4">
        <div className="relative group">
          <button
            type="button"
            onClick={() => {
              setIsFormOpen(false);
              resetForm();
            }}
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
            disabled={loading}
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
  );

  const renderContent = () => (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 rounded">
          {error}
        </div>
      )}

      {/* User-Filter (nur für Admins) */}
      {canManageAllAvailabilities && !isFormOpen && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('teamWorktime.shifts.availabilities.filter.user')}
          </label>
          <select
            value={selectedUserId || ''}
            onChange={(e) => {
              const userId = e.target.value ? parseInt(e.target.value, 10) : null;
              setSelectedUserId(userId);
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('teamWorktime.shifts.availabilities.filter.allUsers')}</option>
            {allUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
        </div>
      )}

      {isFormOpen ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold dark:text-white">
              {editingAvailability ? t('teamWorktime.shifts.availabilities.editTitle') : t('teamWorktime.shifts.availabilities.createTitle')}
            </h3>
            <button
              onClick={() => {
                setIsFormOpen(false);
                resetForm();
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          {renderForm()}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold dark:text-white">
              {t('teamWorktime.shifts.availabilities.title')}
            </h3>
            <button
              onClick={() => setIsFormOpen(true)}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>

          {loadingData ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              {t('common.loading')}
            </div>
          ) : availabilities.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {t('teamWorktime.shifts.availabilities.noAvailabilities')}
            </div>
          ) : (
            <div className="space-y-2">
              {availabilities.map((availability) => (
                <div
                  key={availability.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(availability.type)}`}>
                          {getTypeLabel(availability.type)}
                        </span>
                        {!availability.isActive && (
                          <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                            {t('teamWorktime.shifts.availabilities.inactive')}
                          </span>
                        )}
                        {availability.priority && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t('teamWorktime.shifts.availabilities.priority')}: {availability.priority}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                        {availability.user && canManageAllAvailabilities && (
                          <div>
                            <span className="font-medium">{t('teamWorktime.shifts.availabilities.userLabel')}:</span> {availability.user.firstName} {availability.user.lastName}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">{t('teamWorktime.shifts.availabilities.form.dayOfWeek')}:</span> {getDayOfWeekLabel(availability.dayOfWeek)}
                        </div>
                        {availability.startTime && availability.endTime && (
                          <div>
                            <span className="font-medium">{t('teamWorktime.shifts.availabilities.form.startTime')} - {t('teamWorktime.shifts.availabilities.form.endTime')}:</span> {availability.startTime} - {availability.endTime}
                          </div>
                        )}
                        {availability.startDate && availability.endDate && (
                          <div>
                            <span className="font-medium">{t('teamWorktime.shifts.availabilities.form.startDate')} - {t('teamWorktime.shifts.availabilities.form.endDate')}:</span> {format(new Date(availability.startDate), 'dd.MM.yyyy')} - {format(new Date(availability.endDate), 'dd.MM.yyyy')}
                          </div>
                        )}
                        {availability.branch && (
                          <div>
                            <span className="font-medium">{t('teamWorktime.shifts.availabilities.form.branch')}:</span> {availability.branch.name}
                          </div>
                        )}
                        {availability.role && (
                          <div>
                            <span className="font-medium">{t('teamWorktime.shifts.availabilities.form.role')}:</span> {availability.role.name}
                          </div>
                        )}
                        {availability.notes && (
                          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                            {availability.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(availability)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(availability.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  // Mobile (unter 640px) - Modal
  if (isMobile) {
    return (
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-lg font-semibold dark:text-white">
                  {t('teamWorktime.shifts.availabilities.title')}
                </Dialog.Title>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              {renderContent()}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  }

  // Desktop (ab 640px) - Sidepane
  return (
    <>
      {isOpen && !isLargeScreen && (
        <div 
          className="fixed inset-0 bg-black/10 transition-opacity sidepane-overlay sidepane-backdrop z-40" 
          aria-hidden="true" 
          onClick={onClose}
          style={{
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 300ms ease-out'
          }}
        />
      )}
      
      <div 
        className={`fixed top-16 bottom-0 right-0 max-w-2xl w-full bg-white dark:bg-gray-800 shadow-xl sidepane-panel sidepane-panel-container transform z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
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
            {t('teamWorktime.shifts.availabilities.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {renderContent()}
        </div>
      </div>
    </>
  );
};

export default AvailabilityManagement;

