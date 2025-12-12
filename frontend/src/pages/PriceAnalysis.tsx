import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../hooks/usePermissions.ts';
import useMessage from '../hooks/useMessage.ts';
import { useError } from '../contexts/ErrorContext.tsx';
import OTAListingsTab from '../components/priceAnalysis/OTAListingsTab.tsx';

const PriceAnalysis: React.FC = () => {
    const { t } = useTranslation();
    const { hasPermission, loading: permissionsLoading } = usePermissions();
    const { showMessage } = useMessage();
    const errorContext = useError();
    const handleError = errorContext?.handleError || ((err: any) => {
        console.error('Fehler:', err);
        const errorMessage = err?.response?.data?.message || err?.message || 'Ein Fehler ist aufgetreten';
        showMessage(errorMessage, 'error');
    });

    const [activeTab, setActiveTab] = useState<'listings' | 'analysis' | 'recommendations' | 'rules'>('listings');

    // Prüfe Berechtigung
    if (permissionsLoading) {
        return <div>Lädt...</div>;
    }

    if (!hasPermission('price_analysis', 'read', 'page')) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2>{t('common.error')}</h2>
                <p>{t('common.noPermission')}</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
                <h1>{t('priceAnalysis.title')}</h1>
                
                {/* Tabs */}
                <div style={{ 
                    borderBottom: '1px solid #ddd', 
                    marginBottom: '20px',
                    display: 'flex',
                    gap: '20px'
                }}>
                    <button
                        onClick={() => setActiveTab('listings')}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            background: activeTab === 'listings' ? '#007bff' : 'transparent',
                            color: activeTab === 'listings' ? 'white' : '#333',
                            cursor: 'pointer',
                            borderBottom: activeTab === 'listings' ? '2px solid #007bff' : '2px solid transparent'
                        }}
                    >
                        {t('priceAnalysis.listings')}
                    </button>
                    <button
                        onClick={() => setActiveTab('analysis')}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            background: activeTab === 'analysis' ? '#007bff' : 'transparent',
                            color: activeTab === 'analysis' ? 'white' : '#333',
                            cursor: 'pointer',
                            borderBottom: activeTab === 'analysis' ? '2px solid #007bff' : '2px solid transparent'
                        }}
                    >
                        {t('priceAnalysis.analysis')}
                    </button>
                    <button
                        onClick={() => setActiveTab('recommendations')}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            background: activeTab === 'recommendations' ? '#007bff' : 'transparent',
                            color: activeTab === 'recommendations' ? 'white' : '#333',
                            cursor: 'pointer',
                            borderBottom: activeTab === 'recommendations' ? '2px solid #007bff' : '2px solid transparent'
                        }}
                    >
                        {t('priceAnalysis.recommendations')}
                    </button>
                    <button
                        onClick={() => setActiveTab('rules')}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            background: activeTab === 'rules' ? '#007bff' : 'transparent',
                            color: activeTab === 'rules' ? 'white' : '#333',
                            cursor: 'pointer',
                            borderBottom: activeTab === 'rules' ? '2px solid #007bff' : '2px solid transparent'
                        }}
                    >
                        {t('priceAnalysis.rules')}
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'listings' && <OTAListingsTab />}
                {activeTab === 'analysis' && <div>{t('priceAnalysis.analysis')} - Coming soon</div>}
                {activeTab === 'recommendations' && <div>{t('priceAnalysis.recommendations')} - Coming soon</div>}
                {activeTab === 'rules' && <div>{t('priceAnalysis.rules')} - Coming soon</div>}
            </div>
    );
};

export default PriceAnalysis;

