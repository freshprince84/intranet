import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions.ts';
import useMessage from '../../hooks/useMessage.ts';
import { useError } from '../../contexts/ErrorContext.tsx';
import { useBranch } from '../../contexts/BranchContext.tsx';
import { API_ENDPOINTS } from '../../config/api.ts';
import axiosInstance from '../../config/axios.ts';

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
    const { currentBranch } = useBranch();
    
    const handleError = errorContext?.handleError || ((err: any) => {
        console.error('Fehler:', err);
        const errorMessage = err?.response?.data?.message || err?.message || 'Ein Fehler ist aufgetreten';
        showMessage(errorMessage, 'error');
    });

    const [recommendations, setRecommendations] = useState<PriceRecommendation[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    const [generating, setGenerating] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (currentBranch) {
            loadRecommendations();
        }
        
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [currentBranch, statusFilter]);

    const loadRecommendations = async () => {
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
    };

    const handleGenerateRecommendations = async () => {
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
    };

    const handleApprove = async (recommendationId: number) => {
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
    };

    const handleReject = async (recommendationId: number) => {
        if (!hasPermission('price_analysis_apply_recommendation', 'write', 'button')) {
            showMessage(t('common.noPermission'), 'error');
            return;
        }

        const reason = window.prompt(t('priceAnalysis.recommendations.rejectReason', 'Grund für Ablehnung (optional):'));
        if (reason === null) return; // User cancelled

        try {
            await axiosInstance.post(API_ENDPOINTS.PRICE_ANALYSIS.RECOMMENDATIONS.REJECT(recommendationId), {
                reason: reason || undefined
            });
            showMessage(t('priceAnalysis.recommendations.rejected', 'Empfehlung abgelehnt'), 'success');
            loadRecommendations();
        } catch (error: any) {
            handleError(error);
        }
    };

    const handleApply = async (recommendationId: number) => {
        if (!hasPermission('price_analysis_apply_recommendation', 'write', 'button')) {
            showMessage(t('common.noPermission'), 'error');
            return;
        }

        if (!window.confirm(t('priceAnalysis.recommendations.applyConfirm', 'Empfehlung wirklich anwenden?'))) {
            return;
        }

        try {
            await axiosInstance.post(API_ENDPOINTS.PRICE_ANALYSIS.RECOMMENDATIONS.APPLY(recommendationId));
            showMessage(t('priceAnalysis.recommendations.applied', 'Empfehlung angewendet'), 'success');
            loadRecommendations();
        } catch (error: any) {
            handleError(error);
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
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(1)}%`;
    };

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'pending': return '#ffc107';
            case 'approved': return '#28a745';
            case 'applied': return '#17a2b8';
            case 'rejected': return '#dc3545';
            default: return '#6c757d';
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
        return <div>{t('priceAnalysis.loading')}</div>;
    }

    return (
        <div>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                    onClick={handleGenerateRecommendations}
                    disabled={generating || !hasPermission('price_analysis', 'write', 'page')}
                    style={{
                        padding: '8px 16px',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: generating ? 'not-allowed' : 'pointer'
                    }}
                >
                    {generating ? t('priceAnalysis.loading') : t('priceAnalysis.recommendations.generate', 'Empfehlungen generieren')}
                </button>
                
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ padding: '8px' }}
                >
                    <option value="">{t('priceAnalysis.recommendations.allStatuses', 'Alle Status')}</option>
                    <option value="pending">{t('priceAnalysis.recommendations.status.pending', 'Ausstehend')}</option>
                    <option value="approved">{t('priceAnalysis.recommendations.status.approved', 'Genehmigt')}</option>
                    <option value="applied">{t('priceAnalysis.recommendations.status.applied', 'Angewendet')}</option>
                    <option value="rejected">{t('priceAnalysis.recommendations.status.rejected', 'Abgelehnt')}</option>
                </select>
            </div>

            {recommendations.length === 0 ? (
                <div>{t('priceAnalysis.recommendations.noRecommendations', 'Keine Preisempfehlungen gefunden')}</div>
            ) : (
                <div>
                    <h3>{t('priceAnalysis.recommendations.title', 'Preisempfehlungen')}</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f5f5f5' }}>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{t('priceAnalysis.recommendations.date', 'Datum')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{t('priceAnalysis.recommendations.categoryId', 'Kategorie')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{t('priceAnalysis.recommendations.roomType', 'Zimmerart')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{t('priceAnalysis.recommendations.currentPrice', 'Aktueller Preis')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{t('priceAnalysis.recommendations.recommendedPrice', 'Empfohlener Preis')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{t('priceAnalysis.recommendations.change', 'Änderung')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{t('priceAnalysis.recommendations.reasoning', 'Begründung')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{t('priceAnalysis.recommendations.status', 'Status')}</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{t('common.actions', 'Aktionen')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recommendations.map((recommendation) => (
                                    <tr key={recommendation.id}>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatDate(recommendation.date)}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{recommendation.categoryId || '-'}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{recommendation.roomType === 'dorm' ? t('priceAnalysis.roomType.dorm', 'Dorm') : t('priceAnalysis.roomType.private', 'Privat')}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{formatPrice(recommendation.currentPrice)}</td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{formatPrice(recommendation.recommendedPrice)}</td>
                                        <td style={{ 
                                            border: '1px solid #ddd', 
                                            padding: '8px', 
                                            textAlign: 'right',
                                            color: (recommendation.priceChangePercent || 0) >= 0 ? '#28a745' : '#dc3545'
                                        }}>
                                            {formatPercent(recommendation.priceChangePercent)}
                                        </td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px', maxWidth: '300px' }}>
                                            <div style={{ 
                                                whiteSpace: 'nowrap', 
                                                overflow: 'hidden', 
                                                textOverflow: 'ellipsis',
                                                title: recommendation.reasoning || ''
                                            }}>
                                                {recommendation.reasoning || '-'}
                                            </div>
                                        </td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                background: getStatusColor(recommendation.status),
                                                color: 'white',
                                                fontSize: '12px'
                                            }}>
                                                {getStatusText(recommendation.status)}
                                            </span>
                                        </td>
                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                                {recommendation.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(recommendation.id)}
                                                            disabled={!hasPermission('price_analysis_apply_recommendation', 'write', 'button')}
                                                            style={{
                                                                padding: '4px 8px',
                                                                background: '#28a745',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                fontSize: '12px'
                                                            }}
                                                        >
                                                            {t('priceAnalysis.recommendations.approve', 'Genehmigen')}
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(recommendation.id)}
                                                            disabled={!hasPermission('price_analysis_apply_recommendation', 'write', 'button')}
                                                            style={{
                                                                padding: '4px 8px',
                                                                background: '#dc3545',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                fontSize: '12px'
                                                            }}
                                                        >
                                                            {t('priceAnalysis.recommendations.reject', 'Ablehnen')}
                                                        </button>
                                                    </>
                                                )}
                                                {recommendation.status === 'approved' && (
                                                    <button
                                                        onClick={() => handleApply(recommendation.id)}
                                                        disabled={!hasPermission('price_analysis_apply_recommendation', 'write', 'button')}
                                                        style={{
                                                            padding: '4px 8px',
                                                            background: '#17a2b8',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        {t('priceAnalysis.recommendations.apply', 'Anwenden')}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
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

export default PriceRecommendationsTab;

