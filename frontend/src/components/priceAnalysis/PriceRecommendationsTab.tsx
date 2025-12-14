import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    SparklesIcon, 
    CheckIcon, 
    XMarkIcon, 
    ArrowRightIcon 
} from '@heroicons/react/24/outline';

interface PriceRecommendation {
    id: number;
    branchId: number;
    analysisId: number | null;
    date: string;
    categoryId: number | null;
    roomType: string;
    recommendedPrice: number;
    currentPrice: number | null;
    priceChange: number | null;
    priceChangePercent: number | null;
    appliedRules: any;
    reasoning: string | null;
    status: 'pending' | 'approved' | 'applied' | 'rejected';
    appliedAt: string | null;
    appliedBy: number | null;
    approvedAt: string | null;
    approvedBy: number | null;
    createdAt: string;
    updatedAt: string;
}

const PriceRecommendationsTab: React.FC = () => {
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

    const [recommendations, setRecommendations] = useState<PriceRecommendation[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    const [generating, setGenerating] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Modal/Sidepane states
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [applyModalOpen, setApplyModalOpen] = useState(false);
    const [selectedRecommendationId, setSelectedRecommendationId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');
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
        if (rejectModalOpen || applyModalOpen) {
            openSidepane();
        } else {
            closeSidepane();
        }
        return () => {
            closeSidepane();
        };
    }, [rejectModalOpen, applyModalOpen, openSidepane, closeSidepane]);

    const loadRecommendations = useCallback(async () => {
        if (!currentBranch) return;

        setLoading(true);
        try {
            const response = await axiosInstance.get(API_ENDPOINTS.PRICE_ANALYSIS.RECOMMENDATIONS.BASE, {
                params: {
                    branchId: currentBranch.id,
                    status: statusFilter || undefined
                }
            });
            setRecommendations(response.data);
        } catch (error: any) {
            handleError(error);
        } finally {
            setLoading(false);
        }
    }, [currentBranch, statusFilter, handleError]);

    useEffect(() => {
        if (currentBranch) {
            loadRecommendations();
        }
        
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [currentBranch, statusFilter, loadRecommendations]);

    const handleGenerateRecommendations = useCallback(async () => {
        if (!currentBranch) return;

        if (!hasPermission('price_analysis', 'write', 'page')) {
            showMessage(t('common.noPermission'), 'error');
            return;
        }

        setGenerating(true);
        try {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 3);

            await axiosInstance.post(API_ENDPOINTS.PRICE_ANALYSIS.RECOMMENDATIONS.GENERATE, {
                branchId: currentBranch.id,
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            });

            showMessage(t('priceAnalysis.recommendations.generated', 'Preisempfehlungen generiert'), 'success');
            
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                loadRecommendations();
            }, 2000);
        } catch (error: any) {
            handleError(error);
        } finally {
            setGenerating(false);
        }
    }, [currentBranch, hasPermission, showMessage, t, handleError, loadRecommendations]);

    const handleApprove = useCallback(async (recommendationId: number) => {
        if (!hasPermission('price_analysis_apply_recommendation', 'write', 'button')) {
            showMessage(t('common.noPermission'), 'error');
            return;
        }

        try {
            await axiosInstance.post(API_ENDPOINTS.PRICE_ANALYSIS.RECOMMENDATIONS.APPROVE(recommendationId));
            showMessage(t('priceAnalysis.recommendations.approved', 'Empfehlung genehmigt'), 'success');
            loadRecommendations();
        } catch (error: any) {
            handleError(error);
        }
    }, [hasPermission, showMessage, t, handleError, loadRecommendations]);

    const openRejectModal = useCallback((recommendationId: number) => {
        if (!hasPermission('price_analysis_apply_recommendation', 'write', 'button')) {
            showMessage(t('common.noPermission'), 'error');
            return;
        }
        setSelectedRecommendationId(recommendationId);
        setRejectReason('');
        setRejectModalOpen(true);
    }, [hasPermission, showMessage, t]);

    const handleReject = useCallback(async () => {
        if (!selectedRecommendationId) return;

        try {
            await axiosInstance.post(API_ENDPOINTS.PRICE_ANALYSIS.RECOMMENDATIONS.REJECT(selectedRecommendationId), {
                reason: rejectReason || undefined
            });
            showMessage(t('priceAnalysis.recommendations.rejected', 'Empfehlung abgelehnt'), 'success');
            setRejectModalOpen(false);
            setSelectedRecommendationId(null);
            setRejectReason('');
            loadRecommendations();
        } catch (error: any) {
            handleError(error);
        }
    }, [selectedRecommendationId, rejectReason, showMessage, t, handleError, loadRecommendations]);

    const openApplyModal = useCallback((recommendationId: number) => {
        if (!hasPermission('price_analysis_apply_recommendation', 'write', 'button')) {
            showMessage(t('common.noPermission'), 'error');
            return;
        }
        setSelectedRecommendationId(recommendationId);
        setApplyModalOpen(true);
    }, [hasPermission, showMessage, t]);

    const handleApply = useCallback(async () => {
        if (!selectedRecommendationId) return;

        try {
            await axiosInstance.post(API_ENDPOINTS.PRICE_ANALYSIS.RECOMMENDATIONS.APPLY(selectedRecommendationId));
            showMessage(t('priceAnalysis.recommendations.applied', 'Empfehlung angewendet'), 'success');
            setApplyModalOpen(false);
            setSelectedRecommendationId(null);
            loadRecommendations();
        } catch (error: any) {
            handleError(error);
        }
    }, [selectedRecommendationId, showMessage, t, handleError, loadRecommendations]);

    const formatPrice = (price: number | null): string => {
        if (price === null) return '-';
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('de-DE');
    };

    const formatPercent = (value: number | null): string => {
        if (value === null) return '-';
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(1)}%`;
    };

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'applied': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const getStatusText = (status: string): string => {
        switch (status) {
            case 'pending': return t('priceAnalysis.recommendations.status.pending', 'Ausstehend');
            case 'approved': return t('priceAnalysis.recommendations.status.approved', 'Genehmigt');
            case 'applied': return t('priceAnalysis.recommendations.status.applied', 'Angewendet');
            case 'rejected': return t('priceAnalysis.recommendations.status.rejected', 'Abgelehnt');
            default: return status;
        }
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
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                    <div className="relative group">
                        <button
                            onClick={handleGenerateRecommendations}
                            disabled={generating || !hasPermission('price_analysis', 'write', 'page')}
                            className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t('priceAnalysis.recommendations.generate', 'Empfehlungen generieren')}
                        >
                            <SparklesIcon className={`h-5 w-5 ${generating ? 'animate-pulse' : ''}`} />
                        </button>
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                            {t('priceAnalysis.recommendations.generate', 'Empfehlungen generieren')}
                        </div>
                    </div>
                    
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    >
                        <option value="">{t('priceAnalysis.recommendations.allStatuses', 'Alle Status')}</option>
                        <option value="pending">{t('priceAnalysis.recommendations.status.pending', 'Ausstehend')}</option>
                        <option value="approved">{t('priceAnalysis.recommendations.status.approved', 'Genehmigt')}</option>
                        <option value="applied">{t('priceAnalysis.recommendations.status.applied', 'Angewendet')}</option>
                        <option value="rejected">{t('priceAnalysis.recommendations.status.rejected', 'Abgelehnt')}</option>
                    </select>
                </div>

                {recommendations.length === 0 ? (
                    <div className="text-center py-4 text-gray-600 dark:text-gray-400">
                        {t('priceAnalysis.recommendations.noRecommendations', 'Keine Preisempfehlungen gefunden')}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                        {t('priceAnalysis.recommendations.date', 'Datum')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                        {t('priceAnalysis.recommendations.categoryId', 'Kategorie')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                        {t('priceAnalysis.recommendations.roomType', 'Zimmerart')}
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                        {t('priceAnalysis.recommendations.currentPrice', 'Aktueller Preis')}
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                        {t('priceAnalysis.recommendations.recommendedPrice', 'Empfohlener Preis')}
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                        {t('priceAnalysis.recommendations.change', 'Änderung')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                        {t('priceAnalysis.recommendations.reasoning', 'Begründung')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                        {t('priceAnalysis.recommendations.status', 'Status')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                        {t('common.actions', 'Aktionen')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {recommendations.map((recommendation) => (
                                    <tr key={recommendation.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {formatDate(recommendation.date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {recommendation.categoryId || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {recommendation.roomType === 'dorm' ? t('priceAnalysis.roomType.dorm', 'Dorm') : t('priceAnalysis.roomType.private', 'Privat')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                                            {formatPrice(recommendation.currentPrice)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white text-right">
                                            {formatPrice(recommendation.recommendedPrice)}
                                        </td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                                            (recommendation.priceChangePercent || 0) >= 0 
                                                ? 'text-green-600 dark:text-green-400' 
                                                : 'text-red-600 dark:text-red-400'
                                        }`}>
                                            {formatPercent(recommendation.priceChangePercent)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs">
                                            <div className="truncate" title={recommendation.reasoning || ''}>
                                                {recommendation.reasoning || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(recommendation.status)}`}>
                                                {getStatusText(recommendation.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex items-center gap-2">
                                                {recommendation.status === 'pending' && (
                                                    <>
                                                        <div className="relative group">
                                                            <button
                                                                onClick={() => handleApprove(recommendation.id)}
                                                                disabled={!hasPermission('price_analysis_apply_recommendation', 'write', 'button')}
                                                                className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title={t('priceAnalysis.recommendations.approve', 'Genehmigen')}
                                                            >
                                                                <CheckIcon className="h-4 w-4" />
                                                            </button>
                                                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                {t('priceAnalysis.recommendations.approve', 'Genehmigen')}
                                                            </div>
                                                        </div>
                                                        <div className="relative group">
                                                            <button
                                                                onClick={() => openRejectModal(recommendation.id)}
                                                                disabled={!hasPermission('price_analysis_apply_recommendation', 'write', 'button')}
                                                                className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title={t('priceAnalysis.recommendations.reject', 'Ablehnen')}
                                                            >
                                                                <XMarkIcon className="h-4 w-4" />
                                                            </button>
                                                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                {t('priceAnalysis.recommendations.reject', 'Ablehnen')}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                                {recommendation.status === 'approved' && (
                                                    <div className="relative group">
                                                        <button
                                                            onClick={() => openApplyModal(recommendation.id)}
                                                            disabled={!hasPermission('price_analysis_apply_recommendation', 'write', 'button')}
                                                            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title={t('priceAnalysis.recommendations.apply', 'Anwenden')}
                                                        >
                                                            <ArrowRightIcon className="h-4 w-4" />
                                                        </button>
                                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                            {t('priceAnalysis.recommendations.apply', 'Anwenden')}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Reject Modal/Sidepane */}
            {rejectModalOpen && (
                <>
                    {isMobile ? (
                        <Dialog open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} className="relative z-50">
                            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                            <div className="fixed inset-0 flex items-center justify-center p-4">
                                <Dialog.Panel className="mx-auto max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {t('priceAnalysis.recommendations.reject', 'Empfehlung ablehnen')}
                                        </Dialog.Title>
                                        <button
                                            onClick={() => setRejectModalOpen(false)}
                                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                                        >
                                            <XMarkIcon className="h-6 w-6" />
                                        </button>
                                    </div>
                                    <div className="p-6">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('priceAnalysis.recommendations.rejectReason', 'Grund für Ablehnung (optional):')}
                                        </label>
                                        <textarea
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            rows={4}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder={t('priceAnalysis.recommendations.rejectReasonPlaceholder', 'Grund eingeben...')}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-700">
                                        <div className="relative group">
                                            <button
                                                onClick={() => setRejectModalOpen(false)}
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
                                                onClick={handleReject}
                                                className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                                title={t('priceAnalysis.recommendations.reject', 'Ablehnen')}
                                            >
                                                <XMarkIcon className="h-5 w-5" />
                                            </button>
                                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                {t('priceAnalysis.recommendations.reject', 'Ablehnen')}
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
                                transform: rejectModalOpen ? 'translateX(0)' : 'translateX(100%)',
                                pointerEvents: rejectModalOpen ? 'auto' : 'none'
                            }}
                        >
                            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
                                <h2 className="text-lg font-semibold dark:text-white">
                                    {t('priceAnalysis.recommendations.reject', 'Empfehlung ablehnen')}
                                </h2>
                                <button
                                    onClick={() => setRejectModalOpen(false)}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                >
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto flex-1 min-h-0">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t('priceAnalysis.recommendations.rejectReason', 'Grund für Ablehnung (optional):')}
                                </label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder={t('priceAnalysis.recommendations.rejectReasonPlaceholder', 'Grund eingeben...')}
                                />
                            </div>
                            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="relative group">
                                    <button
                                        onClick={() => setRejectModalOpen(false)}
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
                                        onClick={handleReject}
                                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                        title={t('priceAnalysis.recommendations.reject', 'Ablehnen')}
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                        {t('priceAnalysis.recommendations.reject', 'Ablehnen')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Apply Modal/Sidepane */}
            {applyModalOpen && (
                <>
                    {isMobile ? (
                        <Dialog open={applyModalOpen} onClose={() => setApplyModalOpen(false)} className="relative z-50">
                            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                            <div className="fixed inset-0 flex items-center justify-center p-4">
                                <Dialog.Panel className="mx-auto max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {t('priceAnalysis.recommendations.applyConfirm', 'Empfehlung anwenden')}
                                        </Dialog.Title>
                                        <button
                                            onClick={() => setApplyModalOpen(false)}
                                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                                        >
                                            <XMarkIcon className="h-6 w-6" />
                                        </button>
                                    </div>
                                    <div className="p-6">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {t('priceAnalysis.recommendations.applyConfirmText', 'Möchten Sie diese Empfehlung wirklich anwenden?')}
                                        </p>
                                    </div>
                                    <div className="flex justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-700">
                                        <div className="relative group">
                                            <button
                                                onClick={() => setApplyModalOpen(false)}
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
                                                onClick={handleApply}
                                                className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                                title={t('priceAnalysis.recommendations.apply', 'Anwenden')}
                                            >
                                                <CheckIcon className="h-5 w-5" />
                                            </button>
                                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                {t('priceAnalysis.recommendations.apply', 'Anwenden')}
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
                                transform: applyModalOpen ? 'translateX(0)' : 'translateX(100%)',
                                pointerEvents: applyModalOpen ? 'auto' : 'none'
                            }}
                        >
                            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
                                <h2 className="text-lg font-semibold dark:text-white">
                                    {t('priceAnalysis.recommendations.applyConfirm', 'Empfehlung anwenden')}
                                </h2>
                                <button
                                    onClick={() => setApplyModalOpen(false)}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                >
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto flex-1 min-h-0">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('priceAnalysis.recommendations.applyConfirmText', 'Möchten Sie diese Empfehlung wirklich anwenden?')}
                                </p>
                            </div>
                            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="relative group">
                                    <button
                                        onClick={() => setApplyModalOpen(false)}
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
                                        onClick={handleApply}
                                        className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                        title={t('priceAnalysis.recommendations.apply', 'Anwenden')}
                                    >
                                        <CheckIcon className="h-5 w-5" />
                                    </button>
                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                        {t('priceAnalysis.recommendations.apply', 'Anwenden')}
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

export default PriceRecommendationsTab;
