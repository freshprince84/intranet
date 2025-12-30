import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../hooks/usePermissions.ts';
import OTAListingsTab from '../components/priceAnalysis/OTAListingsTab.tsx';
import AnalysisTab from '../components/priceAnalysis/AnalysisTab.tsx';
import PriceRecommendationsTab from '../components/priceAnalysis/PriceRecommendationsTab.tsx';
import PricingRulesTab from '../components/priceAnalysis/PricingRulesTab.tsx';
import CompetitorGroupsTab from '../components/priceAnalysis/CompetitorGroupsTab.tsx';

const PriceAnalysis: React.FC = () => {
    const { t } = useTranslation();
    const { hasPermission, loading: permissionsLoading } = usePermissions();

    const [activeTab, setActiveTab] = useState<'listings' | 'analysis' | 'recommendations' | 'rules' | 'competitors'>('listings');

    // Prüfe Berechtigung
    if (permissionsLoading) {
        return (
            <div className="p-6 text-center">
                {t('common.loading', { defaultValue: 'Lädt...' })}
            </div>
        );
    }

    if (!hasPermission('price_analysis', 'read', 'page')) {
        return (
            <div className="p-6 text-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {t('common.error')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                    {t('common.noPermission')}
                </p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                {t('priceAnalysis.title')}
            </h1>
            
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-2 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => setActiveTab('listings')}
                        className={`py-2 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                            activeTab === 'listings'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    >
                        {t('priceAnalysis.listings')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('analysis')}
                        className={`py-2 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                            activeTab === 'analysis'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    >
                        {t('priceAnalysis.tabAnalysis')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('recommendations')}
                        className={`py-2 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                            activeTab === 'recommendations'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    >
                        {t('priceAnalysis.tabRecommendations')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('rules')}
                        className={`py-2 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                            activeTab === 'rules'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    >
                        {t('priceAnalysis.tabRules')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('competitors')}
                        className={`py-2 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                            activeTab === 'competitors'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    >
                        {t('priceAnalysis.tabCompetitors', 'Konkurrenten')}
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'listings' && <OTAListingsTab />}
            {activeTab === 'analysis' && <AnalysisTab />}
            {activeTab === 'recommendations' && <PriceRecommendationsTab />}
            {activeTab === 'rules' && <PricingRulesTab />}
            {activeTab === 'competitors' && <CompetitorGroupsTab />}
        </div>
    );
};

export default PriceAnalysis;
