import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../../config/api.ts';
import { useSidepane } from '../../contexts/SidepaneContext.tsx';

interface ShiftTemplate {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  duration: number | null;
  isActive: boolean;
  roleId: number;
  branchId: number;
  role?: {
    id: number;
    name: string;
  };
  branch?: {
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

interface ShiftTemplateManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShiftTemplateManagement = ({ isOpen, onClose }: ShiftTemplateManagementProps) => {
  const { t } = useTranslation();
  const { openSidepane, closeSidepane } = useSidepane();
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    roleId: '' as number | '',
    branchId: '' as number | '',
    startTime: '',
    endTime: '',
    duration: '' as number | '',
    isActive: true
  });

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
      setEditingTemplate(null);
      resetForm();
    }
    
    return () => {
      closeSidepane();
    };
  }, [isOpen, openSidepane, closeSidepane]);

  const fetchData = async () => {
    setLoadingData(true);
    setError(null);
    
    try {
      const [templatesRes, rolesRes, branchesRes] = await Promise.all([
        axiosInstance.get(API_ENDPOINTS.SHIFTS.TEMPLATES.BASE, {
          params: { includeInactive: true }
        }),
        axiosInstance.get(API_ENDPOINTS.ROLES.BASE),
        axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE)
      ]);
      
      setTemplates(templatesRes.data?.data || templatesRes.data || []);
      setRoles(rolesRes.data || []);
      setBranches(branchesRes.data || []);
    } catch (err: any) {
      console.error('Fehler beim Laden der Daten:', err);
      setError(err.response?.data?.message || err.message || t('teamWorktime.shifts.templates.errors.loadError'));
    } finally {
      setLoadingData(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      roleId: '',
      branchId: '',
      startTime: '',
      endTime: '',
      duration: '',
      isActive: true
    });
    setEditingTemplate(null);
  };

  const handleEdit = (template: ShiftTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      roleId: template.roleId,
      branchId: template.branchId,
      startTime: template.startTime,
      endTime: template.endTime,
      duration: template.duration || '',
      isActive: template.isActive
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (templateId: number) => {
    if (!window.confirm(t('teamWorktime.shifts.templates.deleteConfirm'))) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await axiosInstance.delete(API_ENDPOINTS.SHIFTS.TEMPLATES.BY_ID(templateId));
      await fetchData();
    } catch (err: any) {
      console.error('Fehler beim Löschen des Templates:', err);
      setError(err.response?.data?.message || err.message || t('teamWorktime.shifts.templates.errors.deleteError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.name || !formData.roleId || !formData.branchId || !formData.startTime || !formData.endTime) {
        setError(t('teamWorktime.shifts.templates.errors.fillRequiredFields'));
        setLoading(false);
        return;
      }

      const templateData: any = {
        name: formData.name.trim(),
        roleId: Number(formData.roleId),
        branchId: Number(formData.branchId),
        startTime: formData.startTime,
        endTime: formData.endTime,
        duration: formData.duration ? Number(formData.duration) : null,
        isActive: formData.isActive
      };

      if (editingTemplate) {
        await axiosInstance.put(API_ENDPOINTS.SHIFTS.TEMPLATES.BY_ID(editingTemplate.id), templateData);
      } else {
        await axiosInstance.post(API_ENDPOINTS.SHIFTS.TEMPLATES.BASE, templateData);
      }

      await fetchData();
      setIsFormOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Fehler beim Speichern des Templates:', err);
      setError(err.response?.data?.message || err.message || t('teamWorktime.shifts.templates.errors.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.templates.form.name')} *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Branch */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.templates.form.branch')} *
        </label>
        <select
          value={formData.branchId}
          onChange={(e) => setFormData({ ...formData, branchId: Number(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={!!editingTemplate}
        >
          <option value="">{t('teamWorktime.shifts.templates.form.selectBranch')}</option>
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
          {t('teamWorktime.shifts.templates.form.role')} *
        </label>
        <select
          value={formData.roleId}
          onChange={(e) => setFormData({ ...formData, roleId: Number(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={!!editingTemplate}
        >
          <option value="">{t('teamWorktime.shifts.templates.form.selectRole')}</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      {/* Start Time */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.templates.form.startTime')} *
        </label>
        <input
          type="time"
          value={formData.startTime}
          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* End Time */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.templates.form.endTime')} *
        </label>
        <input
          type="time"
          value={formData.endTime}
          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Duration (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.templates.form.duration')}
        </label>
        <input
          type="number"
          value={formData.duration}
          onChange={(e) => setFormData({ ...formData, duration: e.target.value ? Number(e.target.value) : '' })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t('teamWorktime.shifts.templates.form.durationPlaceholder')}
          min="0"
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
          {t('teamWorktime.shifts.templates.form.isActive')}
        </label>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-4">
        <button
          type="button"
          onClick={() => {
            setIsFormOpen(false);
            resetForm();
          }}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('common.saving') : t('common.save')}
        </button>
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

      {isFormOpen ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold dark:text-white">
              {editingTemplate ? t('teamWorktime.shifts.templates.editTitle') : t('teamWorktime.shifts.templates.createTitle')}
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
              {t('teamWorktime.shifts.templates.title')}
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
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {t('teamWorktime.shifts.templates.noTemplates')}
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">{template.name}</h4>
                      {!template.isActive && (
                        <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          {t('teamWorktime.shifts.templates.inactive')}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {template.branch?.name} - {template.role?.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      {template.startTime} - {template.endTime}
                      {template.duration && ` (${template.duration} ${t('teamWorktime.shifts.templates.minutes')})`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
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
                  {t('teamWorktime.shifts.templates.title')}
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
            {t('teamWorktime.shifts.templates.title')}
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

export default ShiftTemplateManagement;

