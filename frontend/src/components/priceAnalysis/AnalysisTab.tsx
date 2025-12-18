import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions.ts';
import useMessage from '../../hooks/useMessage.ts';
import { useError } from '../../contexts/ErrorContext.tsx';
import { useBranch } from '../../contexts/BranchContext.tsx';
import { API_ENDPOINTS } from '../../config/api.ts';
import axiosInstance from '../../config/axios.ts';
import { PlayIcon } from '@heroicons/react/24/outline';

interface PriceAnalysis {
    id: number;
    branchId: number;
    analysisDate: string;
    startDate: string;
    endDate: string;
    categoryId: number | null;
    roomType: string;
    currentPrice: number | null;
    averagePrice: number | null;
    minPrice: number | null;
    maxPrice: number | null;
    occupancyRate: number | null;
    availableRooms: number | null;
    competitorAvgPrice: number | null;
    pricePosition: string | null;
    createdAt: string;
    updatedAt: string;
    recommendations: any[];
}

const AnalysisTab: React.FC = () => {
    const { t } = useTranslation();
    const { hasPermission } = usePermissions();
    const { showMessage } = useMessage();
    const errorContext = useError();
    const { branches, selectedBranch } = useBranch();
    const currentBranch = branches.find(b => b.id === selectedBranch) || null;
    
    const handleError = errorContext?.handleError || ((err: any) => {
        console.error(t('common.error', 'Fehler'), err);
        const errorMessage = err?.response?.data?.message || err?.message || t('common.errorOccurred', 'Ein Fehler ist aufgetreten');
        showMessage(errorMessage, 'error');
    });

    const [analyses, setAnalyses] = useState<PriceAnalysis[]>([]);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const loadAnalyses = useCallback(async () => {
        if (!currentBranch) return;

        setLoading(true);
        try {
            const response = await axiosInstance.get(API_ENDPOINTS.PRICE_ANALYSIS.ANALYSES, {
                params: {
                    branchId: currentBranch.id
                }
            });
            setAnalyses(response.data);
        } catch (error: any) {
            handleError(error);
        } finally {
            setLoading(false);
        }
    }, [currentBranch, handleError]);

    useEffect(() => {
        if (currentBranch) {
            loadAnalyses();
        }
        
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [currentBranch, loadAnalyses]);

    const handleAnalyze = useCallback(async () => {
        if (!currentBranch) return;

        if (!hasPermission('price_analysis', 'write', 'page')) {
            showMessage(t('common.noPermission'), 'error');
            return;
        }

        setAnalyzing(true);
        try {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 3);

            await axiosInstance.post(API_ENDPOINTS.PRICE_ANALYSIS.ANALYZE, {
                branchId: currentBranch.id,
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            });

            showMessage(t('priceAnalysis.analysis.started', 'Preisanalyse gestartet'), 'success');
            
            // Lade Analysen nach kurzer Verzögerung neu
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                loadAnalyses();
            }, 2000);
        } catch (error: any) {
            handleError(error);
        } finally {
            setAnalyzing(false);
        }
    }, [currentBranch, hasPermission, showMessage, t, handleError, loadAnalyses]);

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

    const formatPercent = (value: number | null | string | undefined): string => {
        if (value === null || value === undefined) return '-';
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(numValue)) return '-';
        return `${numValue.toFixed(1)}%`;
    };

    if (loading) {
        return (
            <div className="text-center py-4">
                {t('priceAnalysis.loading')}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6">
            <div className="mb-4">
                <div className="relative group">
                    <button
                        onClick={handleAnalyze}
                        disabled={analyzing || !hasPermission('price_analysis', 'write', 'page')}
                        className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={t('priceAnalysis.analysis.run', 'Preisanalyse starten')}
                    >
                        <PlayIcon className={`h-5 w-5 ${analyzing ? 'animate-pulse' : ''}`} />
                    </button>
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                        {t('priceAnalysis.analysis.run', 'Preisanalyse starten')}
                    </div>
                </div>
            </div>

            {analyses.length === 0 ? (
                <div className="text-center py-4 text-gray-600 dark:text-gray-400">
                    {t('priceAnalysis.noAnalyses', 'Keine Preisanalysen gefunden')}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    {t('priceAnalysis.analysis.date', 'Datum')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    {t('priceAnalysis.analysis.categoryId', 'Kategorie')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    {t('priceAnalysis.analysis.roomType', 'Zimmerart')}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    {t('priceAnalysis.analysis.currentPrice', 'Aktueller Preis')}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    {t('priceAnalysis.analysis.averagePrice', 'Ø Preis')}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    {t('priceAnalysis.analysis.minPrice', 'Min')}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    {t('priceAnalysis.analysis.maxPrice', 'Max')}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    {t('priceAnalysis.analysis.occupancyRate', 'Belegung')}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    {t('priceAnalysis.analysis.availableRooms', 'Verfügbar')}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    {t('priceAnalysis.analysis.competitorPrice', 'Konkurrenz')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    {t('priceAnalysis.analysis.pricePosition', 'Position')}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    {t('priceAnalysis.analysis.recommendations', 'Empfehlungen')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {analyses.map((analysis) => (
                                <tr key={analysis.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {formatDate(analysis.analysisDate)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {analysis.categoryId || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {analysis.roomType === 'dorm' ? t('priceAnalysis.roomType.dorm', 'Dorm') : t('priceAnalysis.roomType.private', 'Privat')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                                        {formatPrice(analysis.currentPrice)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                                        {formatPrice(analysis.averagePrice)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                                        {formatPrice(analysis.minPrice)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                                        {formatPrice(analysis.maxPrice)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                                        {formatPercent(analysis.occupancyRate)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                                        {analysis.availableRooms ?? '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                                        {formatPrice(analysis.competitorAvgPrice)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {analysis.pricePosition === 'above' && '↑ ' + t('priceAnalysis.pricePosition.above', 'Über')}
                                        {analysis.pricePosition === 'below' && '↓ ' + t('priceAnalysis.pricePosition.below', 'Unter')}
                                        {analysis.pricePosition === 'equal' && '= ' + t('priceAnalysis.pricePosition.equal', 'Gleich')}
                                        {!analysis.pricePosition && '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                                        {analysis.recommendations?.length || 0}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AnalysisTab;
