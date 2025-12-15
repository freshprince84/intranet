import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions.ts';
import useMessage from '../../hooks/useMessage.ts';
import { useError } from '../../contexts/ErrorContext.tsx';
import { useBranch } from '../../contexts/BranchContext.tsx';
import { API_ENDPOINTS } from '../../config/api.ts';
import axiosInstance from '../../config/axios.ts';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface OTAListing {
    id: number;
    branchId: number | null;
    platform: string;
    listingId: string;
    listingUrl: string | null;
    city: string;
    country: string | null;
    roomType: string;
    roomName: string | null;
    isActive: boolean;
    discoveredAt: string;
    lastScrapedAt: string | null;
    createdAt: string;
    updatedAt: string;
    priceData: OTAPriceData[];
}

interface OTAPriceData {
    id: number;
    listingId: number;
    date: string;
    price: number;
    currency: string;
    available: boolean;
    availableRooms: number | null;
    scrapedAt: string;
    source: string | null;
}

const OTAListingsTab: React.FC = () => {
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

    const [listings, setListings] = useState<OTAListing[]>([]);
    const [loading, setLoading] = useState(false);
    const [rateShoppingLoading, setRateShoppingLoading] = useState(false);
    const [discovering, setDiscovering] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<string>('booking.com');
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const loadListings = useCallback(async () => {
        if (!currentBranch) return;

        setLoading(true);
        try {
            const response = await axiosInstance.get(API_ENDPOINTS.PRICE_ANALYSIS.OTA.LISTINGS, {
                params: {
                    branchId: currentBranch.id
                }
            });
            setListings(response.data);
        } catch (error: any) {
            handleError(error);
        } finally {
            setLoading(false);
        }
    }, [currentBranch, handleError]);

    useEffect(() => {
        if (currentBranch) {
            loadListings();
        }
        
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [currentBranch, loadListings]);

    const handleRunRateShopping = useCallback(async () => {
        if (!currentBranch) {
            return;
        }

        if (!hasPermission('price_analysis_run_rate_shopping', 'write', 'button')) {
            showMessage(t('common.noPermission'), 'error');
            return;
        }

        setRateShoppingLoading(true);
        try {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 3);

            const requestData = {
                branchId: currentBranch.id,
                platform: selectedPlatform,
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            };

            const response = await axiosInstance.post(API_ENDPOINTS.PRICE_ANALYSIS.OTA.RATE_SHOPPING, requestData);

            if (response.data?.success) {
                showMessage(t('priceAnalysis.rateShopping.started', 'Rate Shopping gestartet'), 'success');
            } else {
                showMessage(response.data?.message || t('priceAnalysis.rateShopping.started', 'Rate Shopping gestartet'), 'success');
            }
            
            // Lade Listings nach kurzer Verzögerung neu
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                loadListings();
            }, 2000);
        } catch (error: any) {
            handleError(error);
        } finally {
            setRateShoppingLoading(false);
        }
    }, [currentBranch, selectedPlatform, hasPermission, showMessage, t, handleError, loadListings]);

    const handleDiscoverListings = useCallback(async () => {
        if (!currentBranch) {
            return;
        }

        if (!hasPermission('price_analysis_run_rate_shopping', 'write', 'button')) {
            showMessage(t('common.noPermission'), 'error');
            return;
        }

        setDiscovering(true);
        try {
            const response = await axiosInstance.post(API_ENDPOINTS.PRICE_ANALYSIS.OTA.DISCOVER, {
                branchId: currentBranch.id,
                platform: selectedPlatform
            });

            if (response.data?.success) {
                showMessage(
                    t('priceAnalysis.discovery.completed', { 
                        count: response.data.listingsFound || 0,
                        defaultValue: `${response.data.listingsFound || 0} Listings gefunden` 
                    }), 
                    'success'
                );
                // Lade Listings neu
                await loadListings();
            } else {
                showMessage(response.data?.message || t('priceAnalysis.discovery.error'), 'error');
            }
        } catch (error: any) {
            handleError(error);
        } finally {
            setDiscovering(false);
        }
    }, [currentBranch, selectedPlatform, hasPermission, showMessage, t, handleError, loadListings]);

    if (loading) {
        return (
            <div className="text-center py-4">
                {t('priceAnalysis.loading')}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6">
            <div className="mb-4 flex items-center gap-2">
                <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                    <option value="booking.com">Booking.com</option>
                    <option value="hostelworld.com">Hostelworld</option>
                </select>
                <div className="relative group">
                    <button
                        onClick={handleDiscoverListings}
                        disabled={discovering || !hasPermission('price_analysis_run_rate_shopping', 'write', 'button')}
                        className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={t('priceAnalysis.discovery.discover', 'Listings finden')}
                    >
                        <ArrowPathIcon className={`h-5 w-5 ${discovering ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                        {t('priceAnalysis.discovery.discover', 'Listings finden')}
                    </div>
                </div>
                <div className="relative group">
                    <button
                        onClick={handleRunRateShopping}
                        disabled={rateShoppingLoading || !hasPermission('price_analysis_run_rate_shopping', 'write', 'button')}
                        className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={t('priceAnalysis.rateShopping.run', 'Rate Shopping starten')}
                    >
                        <ArrowPathIcon className={`h-5 w-5 ${rateShoppingLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                        {t('priceAnalysis.rateShopping.run', 'Rate Shopping starten')}
                    </div>
                </div>
            </div>

            {listings.length === 0 ? (
                <div className="text-center py-4 text-gray-600 dark:text-gray-400">
                    {t('priceAnalysis.noListings')}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    {t('priceAnalysis.platform')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    {t('branches.city')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    {t('priceAnalysis.roomType')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    {t('priceAnalysis.roomName')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    {t('priceAnalysis.listingUrl')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    {t('priceAnalysis.status')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                                    {t('priceAnalysis.lastScraped')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {listings.map((listing) => (
                                <tr key={listing.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {listing.platform}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {listing.city}{listing.country ? `, ${listing.country}` : ''}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {listing.roomType === 'dorm' ? t('priceAnalysis.dorm', 'Dorm') : t('priceAnalysis.private', 'Privatzimmer')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {listing.roomName || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {listing.listingUrl ? (
                                            <a 
                                                href={listing.listingUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                            >
                                                {t('common.view')}
                                            </a>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            listing.isActive 
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                        }`}>
                                            {listing.isActive ? t('priceAnalysis.active') : t('priceAnalysis.inactive')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {listing.lastScrapedAt
                                            ? new Date(listing.lastScrapedAt).toLocaleDateString()
                                            : listing.priceData.length > 0
                                            ? new Date(listing.priceData[0].scrapedAt).toLocaleDateString()
                                            : '-'}
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

export default OTAListingsTab;
