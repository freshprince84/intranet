import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { usePermissions } from '../../hooks/usePermissions.ts';
import useMessage from '../../hooks/useMessage.ts';
import { useError } from '../../contexts/ErrorContext.tsx';
import { useBranch } from '../../contexts/BranchContext.tsx';
import { useSidepane } from '../../contexts/SidepaneContext.tsx';
import { API_ENDPOINTS } from '../../config/api.ts';
import axiosInstance from '../../config/axios.ts';
import { 
    PlusIcon, 
    PencilIcon, 
    TrashIcon, 
    XMarkIcon, 
    CheckIcon 
} from '@heroicons/react/24/outline';

interface PricingRule {
    id: number;
    branchId: number;
    name: string;
    description: string | null;
    conditions: any;
    action: any;
    roomTypes: any;
    categoryIds: any;
    priority: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: number | null;
    createdByUser: {
        id: number;
        firstName: string | null;
        lastName: string | null;
        username: string;
    } | null;
}

const PricingRulesTab: React.FC = () => {
    const { t } = useTranslation();
    const { hasPermission } = usePermissions();
    const { showMessage } = useMessage();
    const errorContext = useError();
    const { branches, selectedBranch } = useBranch();
    const currentBranch = branches.find(b => b.id === selectedBranch) || null;
    const { openSidepane, closeSidepane } = useSidepane();
    
    const handleError = errorContext?.handleError || ((err: any) => {
        console.error(t('common.error', 'Fehler'), err);
        const errorMessage = err?.response?.data?.message || err?.message || t('common.errorOccurred', 'Ein Fehler ist aufgetreten');
        showMessage(errorMessage, 'error');
    });

    const [rules, setRules] = useState<PricingRule[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 640);

    // Überwache Bildschirmgröße
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 640);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Sidepane öffnen/schließen basierend auf Modal-Status
    useEffect(() => {
        if (isModalOpen || deleteModalOpen) {
            openSidepane();
        } else {
            closeSidepane();
        }
        return () => {
            closeSidepane();
        };
    }, [isModalOpen, deleteModalOpen, openSidepane, closeSidepane]);
    const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
    const [ruleToDelete, setRuleToDelete] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        priority: 0,
        isActive: true,
        conditions: JSON.stringify({ occupancyRate: { operator: '>', value: 80 } }, null, 2),
        action: JSON.stringify({ type: 'increase', value: 15, maxChange: 30, minPrice: 40000, maxPrice: 80000, cumulative: true }, null, 2),
        roomTypes: '',
        categoryIds: ''
    });

    const loadRules = useCallback(async () => {
        if (!currentBranch) return;

        setLoading(true);
        try {
            const response = await axiosInstance.get(API_ENDPOINTS.PRICE_ANALYSIS.RULES.BASE, {
                params: {
                    branchId: currentBranch.id
                }
            });
            setRules(response.data);
        } catch (error: any) {
            handleError(error);
        } finally {
            setLoading(false);
        }
    }, [currentBranch, handleError]);

    useEffect(() => {
        if (currentBranch) {
            loadRules();
        }
    }, [currentBranch, loadRules]);

    const handleCreate = useCallback(() => {
        setEditingRule(null);
        setFormData({
            name: '',
            description: '',
            priority: 0,
            isActive: true,
            conditions: JSON.stringify({ occupancyRate: { operator: '>', value: 80 } }, null, 2),
            action: JSON.stringify({ type: 'increase', value: 15, maxChange: 30, minPrice: 40000, maxPrice: 80000, cumulative: true }, null, 2),
            roomTypes: '',
            categoryIds: ''
        });
        setIsModalOpen(true);
    }, []);

    const handleEdit = useCallback((rule: PricingRule) => {
        setEditingRule(rule);
        setFormData({
            name: rule.name,
            description: rule.description || '',
            priority: rule.priority,
            isActive: rule.isActive,
            conditions: JSON.stringify(rule.conditions, null, 2),
            action: JSON.stringify(rule.action, null, 2),
            roomTypes: rule.roomTypes ? JSON.stringify(rule.roomTypes) : '',
            categoryIds: rule.categoryIds ? JSON.stringify(rule.categoryIds) : ''
        });
        setIsModalOpen(true);
    }, []);

    const openDeleteModal = useCallback((ruleId: number) => {
        if (!hasPermission('price_analysis_delete_rule', 'write', 'button')) {
            showMessage(t('common.noPermission'), 'error');
            return;
        }
        setRuleToDelete(ruleId);
        setDeleteModalOpen(true);
    }, [hasPermission, showMessage, t]);

    const handleDelete = useCallback(async () => {
        if (!ruleToDelete) return;

        try {
            await axiosInstance.delete(API_ENDPOINTS.PRICE_ANALYSIS.RULES.BY_ID(ruleToDelete));
            showMessage(t('priceAnalysis.rules.deleted', 'Regel gelöscht'), 'success');
            setDeleteModalOpen(false);
            setRuleToDelete(null);
            loadRules();
        } catch (error: any) {
            handleError(error);
        }
    }, [ruleToDelete, showMessage, t, handleError, loadRules]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentBranch) return;

        try {
            let conditions, action, roomTypes, categoryIds;

            // Parse JSON
            try {
                conditions = JSON.parse(formData.conditions);
                action = JSON.parse(formData.action);
                roomTypes = formData.roomTypes ? JSON.parse(formData.roomTypes) : null;
                categoryIds = formData.categoryIds ? JSON.parse(formData.categoryIds) : null;
            } catch (error) {
                showMessage(t('priceAnalysis.rules.invalidJson', 'Ungültiges JSON-Format'), 'error');
                return;
            }

            const payload = {
                branchId: currentBranch.id,
                name: formData.name,
                description: formData.description || null,
                conditions,
                action,
                roomTypes,
                categoryIds,
                priority: formData.priority,
                isActive: formData.isActive
            };

            if (editingRule) {
                await axiosInstance.put(API_ENDPOINTS.PRICE_ANALYSIS.RULES.BY_ID(editingRule.id), payload);
                showMessage(t('priceAnalysis.rules.updated', 'Regel aktualisiert'), 'success');
            } else {
                await axiosInstance.post(API_ENDPOINTS.PRICE_ANALYSIS.RULES.BASE, payload);
                showMessage(t('priceAnalysis.rules.created', 'Regel erstellt'), 'success');
            }

            setIsModalOpen(false);
            loadRules();
        } catch (error: any) {
            handleError(error);
        }
    }, [currentBranch, formData, editingRule, showMessage, t, handleError, loadRules]);

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('de-DE');
    };

    if (loading) {
        return (
            <div className="text-center py-4">
                {t('priceAnalysis.loading')}
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6">
                <div className="mb-4">
                    <div className="relative group">
                        <button
                            onClick={handleCreate}
                            disabled={!hasPermission('price_analysis_create_rule', 'write', 'button')}
                            className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t('priceAnalysis.rules.create', 'Neue Regel erstellen')}
                        >
                            <PlusIcon className="h-5 w-5" />
                        </button>
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                            {t('priceAnalysis.rules.create', 'Neue Regel erstellen')}
                        </div>
                    </div>
                </div>

                {rules.length === 0 ? (
                    <div className="text-center py-4 text-gray-600 dark:text-gray-400">
                        {t('priceAnalysis.rules.noRules', 'Keine Preisregeln gefunden')}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                        {t('priceAnalysis.rules.name', 'Name')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                        {t('priceAnalysis.rules.description', 'Beschreibung')}
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                        {t('priceAnalysis.rules.priority', 'Priorität')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                        {t('priceAnalysis.rules.status', 'Status')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                        {t('priceAnalysis.rules.createdBy', 'Erstellt von')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                        {t('priceAnalysis.rules.createdAt', 'Erstellt am')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                        {t('common.actions', 'Aktionen')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {rules.map((rule) => (
                                    <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {rule.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                            {rule.description || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                                            {rule.priority}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                rule.isActive 
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                            }`}>
                                                {rule.isActive ? t('priceAnalysis.active', 'Aktiv') : t('priceAnalysis.inactive', 'Inaktiv')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {rule.createdByUser 
                                                ? `${rule.createdByUser.firstName || ''} ${rule.createdByUser.lastName || ''}`.trim() || rule.createdByUser.username
                                                : '-'
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {formatDate(rule.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="relative group">
                                                    <button
                                                        onClick={() => handleEdit(rule)}
                                                        disabled={!hasPermission('price_analysis_edit_rule', 'write', 'button')}
                                                        className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title={t('common.edit', 'Bearbeiten')}
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </button>
                                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                        {t('common.edit', 'Bearbeiten')}
                                                    </div>
                                                </div>
                                                <div className="relative group">
                                                    <button
                                                        onClick={() => openDeleteModal(rule.id)}
                                                        disabled={!hasPermission('price_analysis_delete_rule', 'write', 'button')}
                                                        className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title={t('common.delete', 'Löschen')}
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                        {t('common.delete', 'Löschen')}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal/Sidepane */}
            {isModalOpen && (
                <>
                    {isMobile ? (
                        <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-50">
                            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                            <div className="fixed inset-0 flex items-center justify-center p-4">
                                <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                                {editingRule ? t('priceAnalysis.rules.edit', 'Regel bearbeiten') : t('priceAnalysis.rules.create', 'Neue Regel erstellen')}
                            </Dialog.Title>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('priceAnalysis.rules.name', 'Name')} *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('priceAnalysis.rules.description', 'Beschreibung')}
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[60px]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('priceAnalysis.rules.priority', 'Priorität')}
                                </label>
                                <input
                                    type="number"
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('priceAnalysis.rules.isActive', 'Aktiv')}
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('priceAnalysis.rules.conditions', 'Bedingungen')} (JSON) *
                                </label>
                                <textarea
                                    value={formData.conditions}
                                    onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono min-h-[100px]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('priceAnalysis.rules.action', 'Aktion')} (JSON) *
                                </label>
                                <textarea
                                    value={formData.action}
                                    onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono min-h-[100px]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('priceAnalysis.rules.roomTypes', 'Zimmerarten')} (JSON, optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.roomTypes}
                                    onChange={(e) => setFormData({ ...formData, roomTypes: e.target.value })}
                                    placeholder='["dorm", "private"] oder leer für alle'
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('priceAnalysis.rules.categoryIds', 'Kategorie-IDs')} (JSON, optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.categoryIds}
                                    onChange={(e) => setFormData({ ...formData, categoryIds: e.target.value })}
                                    placeholder='[34280, 34281] oder leer für alle'
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="relative group">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                        title={t('common.cancel', 'Abbrechen')}
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                        {t('common.cancel', 'Abbrechen')}
                                    </div>
                                </div>
                                <div className="relative group">
                                    <button
                                        type="submit"
                                        className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                        title={t('common.save', 'Speichern')}
                                    >
                                        <CheckIcon className="h-5 w-5" />
                                    </button>
                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                        {t('common.save', 'Speichern')}
                                    </div>
                                </div>
                            </div>
                                </form>
                            </Dialog.Panel>
                        </div>
                    </Dialog>
                    ) : (
                        <div className="fixed top-16 bottom-0 right-0 max-w-4xl w-full bg-white dark:bg-gray-800 shadow-xl transform z-50 flex flex-col"
                            style={{
                                transition: 'transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                transform: isModalOpen ? 'translateX(0)' : 'translateX(100%)',
                                pointerEvents: isModalOpen ? 'auto' : 'none'
                            }}
                        >
                            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
                                <h2 className="text-lg font-semibold dark:text-white">
                                    {editingRule ? t('priceAnalysis.rules.edit', 'Regel bearbeiten') : t('priceAnalysis.rules.create', 'Neue Regel erstellen')}
                                </h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                >
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                                <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('priceAnalysis.rules.name', 'Name')} *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('priceAnalysis.rules.description', 'Beschreibung')}
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[60px]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('priceAnalysis.rules.priority', 'Priorität')}
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('priceAnalysis.rules.isActive', 'Aktiv')}
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('priceAnalysis.rules.conditions', 'Bedingungen')} (JSON) *
                                        </label>
                                        <textarea
                                            value={formData.conditions}
                                            onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono min-h-[100px]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('priceAnalysis.rules.action', 'Aktion')} (JSON) *
                                        </label>
                                        <textarea
                                            value={formData.action}
                                            onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono min-h-[100px]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('priceAnalysis.rules.roomTypes', 'Zimmerarten')} (JSON, optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.roomTypes}
                                            onChange={(e) => setFormData({ ...formData, roomTypes: e.target.value })}
                                            placeholder='["dorm", "private"] oder leer für alle'
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('priceAnalysis.rules.categoryIds', 'Kategorie-IDs')} (JSON, optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.categoryIds}
                                            onChange={(e) => setFormData({ ...formData, categoryIds: e.target.value })}
                                            placeholder='[34280, 34281] oder leer für alle'
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
                                    <div className="relative group">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                            title={t('common.cancel', 'Abbrechen')}
                                        >
                                            <XMarkIcon className="h-5 w-5" />
                                        </button>
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                            {t('common.cancel', 'Abbrechen')}
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <button
                                            type="submit"
                                            className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                            title={t('common.save', 'Speichern')}
                                        >
                                            <CheckIcon className="h-5 w-5" />
                                        </button>
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                            {t('common.save', 'Speichern')}
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}
                </>
            )}

            {/* Delete Confirmation Modal/Sidepane */}
            {deleteModalOpen && (
                <>
                    {isMobile ? (
                        <Dialog open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} className="relative z-50">
                            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                            <div className="fixed inset-0 flex items-center justify-center p-4">
                                <Dialog.Panel className="mx-auto max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                                {t('priceAnalysis.rules.deleteConfirm', 'Regel löschen')}
                            </Dialog.Title>
                            <button
                                onClick={() => setDeleteModalOpen(false)}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {t('priceAnalysis.rules.deleteConfirmText', 'Möchten Sie diese Regel wirklich löschen?')}
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-700">
                            <div className="relative group">
                                <button
                                    onClick={() => setDeleteModalOpen(false)}
                                    className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                    title={t('common.cancel', 'Abbrechen')}
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                    {t('common.cancel', 'Abbrechen')}
                                </div>
                            </div>
                            <div className="relative group">
                                <button
                                    onClick={handleDelete}
                                    className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                    title={t('common.delete', 'Löschen')}
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                    {t('common.delete', 'Löschen')}
                                </div>
                            </div>
                                </div>
                            </Dialog.Panel>
                        </div>
                    </Dialog>
                    ) : (
                        <div className="fixed top-16 bottom-0 right-0 max-w-md w-full bg-white dark:bg-gray-800 shadow-xl transform z-50 flex flex-col"
                            style={{
                                transition: 'transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                transform: deleteModalOpen ? 'translateX(0)' : 'translateX(100%)',
                                pointerEvents: deleteModalOpen ? 'auto' : 'none'
                            }}
                        >
                            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
                                <h2 className="text-lg font-semibold dark:text-white">
                                    {t('priceAnalysis.rules.deleteConfirm', 'Regel löschen')}
                                </h2>
                                <button
                                    onClick={() => setDeleteModalOpen(false)}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                >
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto flex-1 min-h-0">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('priceAnalysis.rules.deleteConfirmText', 'Möchten Sie diese Regel wirklich löschen?')}
                                </p>
                            </div>
                            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="relative group">
                                    <button
                                        onClick={() => setDeleteModalOpen(false)}
                                        className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                        title={t('common.cancel', 'Abbrechen')}
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                        {t('common.cancel', 'Abbrechen')}
                                    </div>
                                </div>
                                <div className="relative group">
                                    <button
                                        onClick={handleDelete}
                                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                        title={t('common.delete', 'Löschen')}
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                        {t('common.delete', 'Löschen')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    );
};

export default PricingRulesTab;
