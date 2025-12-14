import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions.ts';
import useMessage from '../../hooks/useMessage.ts';
import { useError } from '../../contexts/ErrorContext.tsx';
import { useBranch } from '../../contexts/BranchContext.tsx';
import { API_ENDPOINTS } from '../../config/api.ts';
import axios from 'axios';

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
    const { currentBranch } = useBranch();
    
    const handleError = errorContext?.handleError || ((err: any) => {
        console.error('Fehler:', err);
        const errorMessage = err?.response?.data?.message || err?.message || 'Ein Fehler ist aufgetreten';
        showMessage(errorMessage, 'error');
    });

    const [analyses, setAnalyses] = useState<PriceAnalysis[]>([]);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        if (currentBranch) {
            loadAnalyses();
        }
    }, [currentBranch]);

    const loadAnalyses = async () => {
        if (!currentBranch) return;

        setLoading(true);
        try {
            const response = await axios.get(API_ENDPOINTS.PRICE_ANALYSIS.ANALYSES, {
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
    };

    const handleAnalyze = async () => {
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

            await axios.post(API_ENDPOINTS.PRICE_ANALYSIS.ANALYZE, {
                branchId: currentBranch.id,
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            });

            showMessage(t('priceAnalysis.analysis.started', 'Preisanalyse gestartet'), 'success');
            
            // Lade Analysen nach kurzer Verzögerung neu
            setTimeout(() => {
                loadAnalyses();
            }, 2000);
        } catch (error: any) {
            handleError(error);
        } finally {
            setAnalyzing(false);
        }
    };

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
        return `${value.toFixed(1)}%`;
    };

    if (loading) {
        return <div>{t('priceAnalysis.loading')}</div>;
    }

    return (
        <div>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                    onClick={handleAnalyze}
                    disabled={analyzing || !hasPermission('price_analysis', 'write', 'page')}
                    style={{
                        padding: '8px 16px',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: analyzing ? 'not-allowed' : 'pointer'
                    }}
                >
                    {analyzing ? t('priceAnalysis.loading') : t('priceAnalysis.analysis.run', 'Preisanalyse starten')}
                </button>
            </div>

            {analyses.length === 0 ? (
                <div>{t('priceAnalysis.noAnalyses', 'Keine Preisanalysen gefunden')}</div>
            ) : (
                <div>
                    <h3>{t('priceAnalysis.analysis.title', 'Preisanalysen')}</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f5f5f5' }}>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{t('priceAnalysis.analysis.date', 'Datum')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{t('priceAnalysis.analysis.categoryId', 'Kategorie')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{t('priceAnalysis.analysis.roomType', 'Zimmerart')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{t('priceAnalysis.analysis.currentPrice', 'Aktueller Preis')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{t('priceAnalysis.analysis.averagePrice', 'Ø Preis')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{t('priceAnalysis.analysis.minPrice', 'Min')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{t('priceAnalysis.analysis.maxPrice', 'Max')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{t('priceAnalysis.analysis.occupancyRate', 'Belegung')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{t('priceAnalysis.analysis.availableRooms', 'Verfügbar')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{t('priceAnalysis.analysis.competitorPrice', 'Konkurrenz')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{t('priceAnalysis.analysis.pricePosition', 'Position')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{t('priceAnalysis.analysis.recommendations', 'Empfehlungen')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analyses.map((analysis) => (
                                    <tr key={analysis.id}>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatDate(analysis.analysisDate)}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{analysis.categoryId || '-'}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{analysis.roomType === 'dorm' ? t('priceAnalysis.roomType.dorm', 'Dorm') : t('priceAnalysis.roomType.private', 'Privat')}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{formatPrice(analysis.currentPrice)}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{formatPrice(analysis.averagePrice)}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{formatPrice(analysis.minPrice)}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{formatPrice(analysis.maxPrice)}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{formatPercent(analysis.occupancyRate)}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{analysis.availableRooms ?? '-'}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{formatPrice(analysis.competitorAvgPrice)}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                            {analysis.pricePosition === 'above' && '↑ ' + t('priceAnalysis.pricePosition.above', 'Über')}
                                            {analysis.pricePosition === 'below' && '↓ ' + t('priceAnalysis.pricePosition.below', 'Unter')}
                                            {analysis.pricePosition === 'equal' && '= ' + t('priceAnalysis.pricePosition.equal', 'Gleich')}
                                            {!analysis.pricePosition && '-'}
                                        </td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{analysis.recommendations?.length || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalysisTab;

