import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../config/axios.ts';
import { Dialog } from '@headlessui/react';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../../config/api.ts';
import { useSidepane } from '../../contexts/SidepaneContext.tsx';
import { format, startOfWeek, endOfWeek } from 'date-fns';

interface Role {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
}

interface GenerateShiftPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanGenerated: () => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
}

interface GenerationResult {
  shifts: any[];
  summary: {
    total: number;
    assigned: number;
    unassigned: number;
    conflicts: number;
  };
  conflicts: Array<{
    date: string;
    roleId: number;
    templateId: number;
    reason: string;
  }>;
}

const GenerateShiftPlanModal = ({ 
  isOpen, 
  onClose, 
  onPlanGenerated,
  initialStartDate,
  initialEndDate
}: GenerateShiftPlanModalProps) => {
  const { t } = useTranslation();
  const { openSidepane, closeSidepane } = useSidepane();
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  
  // Formular-Felder
  const [startDate, setStartDate] = useState(
    initialStartDate 
      ? format(initialStartDate, 'yyyy-MM-dd')
      : format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(
    initialEndDate
      ? format(initialEndDate, 'yyyy-MM-dd')
      : format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  );
  const [branchId, setBranchId] = useState<number | ''>('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  
  // Daten
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Ergebnis
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [showResult, setShowResult] = useState(false);

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
      setResult(null);
      setShowResult(false);
    } else {
      closeSidepane();
    }
    
    return () => {
      closeSidepane();
    };
  }, [isOpen, openSidepane, closeSidepane]);

  // Lade Rollen, wenn Branch geändert wird
  useEffect(() => {
    if (isOpen && branchId) {
      fetchRoles();
    } else {
      setRoles([]);
      setSelectedRoleIds([]);
    }
  }, [isOpen, branchId]);

  // Setze erste Branch, wenn geladen
  useEffect(() => {
    if (branches.length > 0 && branchId === '') {
      setBranchId(branches[0].id);
    }
  }, [branches, branchId]);

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

      const response = await axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE);
      setBranches(response.data || []);
    } catch (err: any) {
      console.error('Fehler beim Laden der Branches:', err);
      setError(err.response?.data?.message || err.message || t('teamWorktime.shifts.generate.errors.loadBranchesError'));
    } finally {
      setLoadingData(false);
    }
  };

  const fetchRoles = async () => {
    if (!branchId) return;

    try {
      setError(null);
      // Lade alle Rollen - das Backend filtert dann basierend auf Branch
      const response = await axiosInstance.get(API_ENDPOINTS.ROLES.BASE);
      const allRoles = response.data || [];
      
      // Filtere Rollen, die für diese Branch verfügbar sind
      // (Das Backend sollte das eigentlich machen, aber wir filtern hier zusätzlich)
      setRoles(allRoles);
    } catch (err: any) {
      console.error('Fehler beim Laden der Rollen:', err);
      setError(err.response?.data?.message || err.message || t('teamWorktime.shifts.generate.errors.loadRolesError'));
    }
  };

  const handleRoleToggle = (roleId: number) => {
    setSelectedRoleIds(prev => 
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSelectAllRoles = () => {
    if (selectedRoleIds.length === roles.length) {
      setSelectedRoleIds([]);
    } else {
      setSelectedRoleIds(roles.map(r => r.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGenerating(true);
    setResult(null);
    setShowResult(false);

    try {
      if (!startDate || !endDate || !branchId) {
        setError(t('teamWorktime.shifts.generate.errors.fillRequiredFields'));
        setGenerating(false);
        return;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        setError(t('teamWorktime.shifts.generate.errors.invalidDates'));
        setGenerating(false);
        return;
      }

      if (start >= end) {
        setError(t('teamWorktime.shifts.generate.errors.startDateAfterEndDate'));
        setGenerating(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Nicht authentifiziert');
        setGenerating(false);
        return;
      }

      const requestData: any = {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        branchId: Number(branchId)
      };

      // Nur roleIds hinzufügen, wenn welche ausgewählt wurden
      if (selectedRoleIds.length > 0) {
        requestData.roleIds = selectedRoleIds;
      }

      const response = await axiosInstance.post(API_ENDPOINTS.SHIFTS.GENERATE, requestData);
      
      const resultData = response.data.data || response.data;
      setResult(resultData);
      setShowResult(true);
      
      // Rufe Callback auf, damit Daten neu geladen werden
      onPlanGenerated();
    } catch (err: any) {
      console.error('Fehler beim Generieren des Schichtplans:', err);
      const errorMessage = err.response?.data?.message || err.message || t('teamWorktime.shifts.generate.errors.generateError');
      setError(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setResult(null);
    setShowResult(false);
    setSelectedRoleIds([]);
    onClose();
  };

  const renderForm = () => (
    <div className="space-y-4">
      {/* Start Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.generate.form.startDate')} *
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* End Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.generate.form.endDate')} *
        </label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Branch */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('teamWorktime.shifts.generate.form.branch')} *
        </label>
        <select
          value={branchId}
          onChange={(e) => {
            setBranchId(Number(e.target.value));
            setSelectedRoleIds([]); // Reset Rollen bei Branch-Änderung
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">{t('teamWorktime.shifts.generate.form.selectBranch')}</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      {/* Roles (Multi-Select) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('teamWorktime.shifts.generate.form.roles')}
          </label>
          {roles.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAllRoles}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {selectedRoleIds.length === roles.length 
                ? t('teamWorktime.shifts.generate.form.deselectAll')
                : t('teamWorktime.shifts.generate.form.selectAll')
              }
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {t('teamWorktime.shifts.generate.form.rolesHint')}
        </p>
        {!branchId ? (
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-500 dark:text-gray-400">
            {t('teamWorktime.shifts.generate.form.selectBranchFirst')}
          </div>
        ) : roles.length === 0 ? (
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-500 dark:text-gray-400">
            {t('teamWorktime.shifts.generate.form.noRolesAvailable')}
          </div>
        ) : (
          <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 space-y-2">
            {roles.map((role) => (
              <label key={role.id} className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded">
                <input
                  type="checkbox"
                  checked={selectedRoleIds.includes(role.id)}
                  onChange={() => handleRoleToggle(role.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {role.name}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderResult = () => {
    if (!result) return null;

    return (
      <div className="space-y-4">
        {/* Zusammenfassung */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3">
            {t('teamWorktime.shifts.generate.result.summary')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-blue-700 dark:text-blue-400">{t('teamWorktime.shifts.generate.result.total')}</div>
              <div className="text-lg font-semibold text-blue-900 dark:text-blue-300">{result.summary.total}</div>
            </div>
            <div>
              <div className="text-xs text-green-700 dark:text-green-400">{t('teamWorktime.shifts.generate.result.assigned')}</div>
              <div className="text-lg font-semibold text-green-900 dark:text-green-300">{result.summary.assigned}</div>
            </div>
            <div>
              <div className="text-xs text-orange-700 dark:text-orange-400">{t('teamWorktime.shifts.generate.result.unassigned')}</div>
              <div className="text-lg font-semibold text-orange-900 dark:text-orange-300">{result.summary.unassigned}</div>
            </div>
            <div>
              <div className="text-xs text-red-700 dark:text-red-400">{t('teamWorktime.shifts.generate.result.conflicts')}</div>
              <div className="text-lg font-semibold text-red-900 dark:text-red-300">{result.summary.conflicts}</div>
            </div>
          </div>
        </div>

        {/* Konflikte */}
        {result.conflicts && result.conflicts.length > 0 && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <div className="flex items-start gap-2 mb-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300">
                {t('teamWorktime.shifts.generate.result.conflictsTitle')} ({result.conflicts.length})
              </h3>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {result.conflicts.map((conflict, index) => (
                <div key={index} className="text-xs text-yellow-800 dark:text-yellow-400">
                  {format(new Date(conflict.date), 'dd.MM.yyyy')}: {conflict.reason}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Erfolg */}
        {result.summary.conflicts === 0 && result.summary.unassigned === 0 && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-900 dark:text-green-300">
                {t('teamWorktime.shifts.generate.result.success')}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

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
                  {t('teamWorktime.shifts.generate.title')}
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

                {showResult && result ? (
                  renderResult()
                ) : loadingData ? (
                  <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                    {t('common.loading')}
                  </div>
                ) : (
                  renderForm()
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t dark:border-gray-700 flex-shrink-0 flex justify-end gap-2">
                {showResult ? (
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      title={t('common.close')}
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                      {t('common.close')}
                    </div>
                  </div>
                ) : (
                  <>
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
                        disabled={generating || loadingData}
                        className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title={generating ? t('teamWorktime.shifts.generate.generating') : t('teamWorktime.shifts.generate.generate')}
                      >
                        {generating ? (
                          <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        ) : (
                          <CheckIcon className="h-5 w-5" />
                        )}
                      </button>
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                        {generating ? t('teamWorktime.shifts.generate.generating') : t('teamWorktime.shifts.generate.generate')}
                      </div>
                    </div>
                  </>
                )}
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
            {t('teamWorktime.shifts.generate.title')}
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

            {showResult && result ? (
              renderResult()
            ) : loadingData ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                {t('common.loading')}
              </div>
            ) : (
              renderForm()
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t dark:border-gray-700 flex-shrink-0 flex justify-end gap-2">
            {showResult ? (
              <div className="relative group">
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  title={t('common.close')}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                  {t('common.close')}
                </div>
              </div>
            ) : (
              <>
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
                    disabled={generating || loadingData}
                    className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={generating ? t('teamWorktime.shifts.generate.generating') : t('teamWorktime.shifts.generate.generate')}
                  >
                    {generating ? (
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    ) : (
                      <CheckIcon className="h-5 w-5" />
                    )}
                  </button>
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                    {generating ? t('teamWorktime.shifts.generate.generating') : t('teamWorktime.shifts.generate.generate')}
                  </div>
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </>
  );
};

export default GenerateShiftPlanModal;

