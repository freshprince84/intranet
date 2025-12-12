import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions';
import { useMessage } from '../../contexts/MessageContext';
import { useError } from '../../contexts/ErrorContext';
import { useBranch } from '../../contexts/BranchContext';
import { API_ENDPOINTS } from '../../config/api';
import axios from 'axios';

interface OTAListing {
    id: number;
    branchId: number;
    platform: string;
    listingId: string;
    listingUrl: string | null;
    categoryId: number | null;
    roomType: string;
    roomName: string | null;
    isActive: boolean;
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

interface RateShoppingJob {
    id: number;
    branchId: number;
    platform: string;
    status: string;
    startDate: string;
    endDate: string;
    listingsFound: number;
    pricesCollected: number;
    errors: any;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
}

const OTAListingsTab: React.FC = () => {
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

    const [listings, setListings] = useState<OTAListing[]>([]);
    const [loading, setLoading] = useState(false);
    const [rateShoppingLoading, setRateShoppingLoading] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<string>('booking.com');

    useEffect(() => {
        if (currentBranch) {
            loadListings();
        }
    }, [currentBranch]);

    const loadListings = async () => {
        if (!currentBranch) return;

        setLoading(true);
        try {
            const response = await axios.get(API_ENDPOINTS.PRICE_ANALYSIS.OTA.LISTINGS, {
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
    };

    const handleRunRateShopping = async () => {
        if (!currentBranch) return;

        if (!hasPermission('price_analysis_run_rate_shopping', 'write', 'button')) {
            showMessage(t('common.noPermission'), 'error');
            return;
        }

        setRateShoppingLoading(true);
        try {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 3);

            await axios.post(API_ENDPOINTS.PRICE_ANALYSIS.OTA.RATE_SHOPPING, {
                branchId: currentBranch.id,
                platform: selectedPlatform,
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            });

            showMessage(t('priceAnalysis.rateShopping.started', 'Rate Shopping gestartet'), 'success');
            
            // Lade Listings nach kurzer Verzögerung neu
            setTimeout(() => {
                loadListings();
            }, 2000);
        } catch (error: any) {
            handleError(error);
        } finally {
            setRateShoppingLoading(false);
        }
    };

    if (loading) {
        return <div>{t('priceAnalysis.loading')}</div>;
    }

    return (
        <div>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    style={{ padding: '8px' }}
                >
                    <option value="booking.com">Booking.com</option>
                    <option value="hostelworld.com">Hostelworld</option>
                </select>
                <button
                    onClick={handleRunRateShopping}
                    disabled={rateShoppingLoading || !hasPermission('price_analysis_run_rate_shopping', 'write', 'button')}
                    style={{
                        padding: '8px 16px',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: rateShoppingLoading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {rateShoppingLoading ? t('priceAnalysis.loading') : t('priceAnalysis.rateShopping.run', 'Rate Shopping starten')}
                </button>
            </div>

            {listings.length === 0 ? (
                <div>{t('priceAnalysis.noListings')}</div>
            ) : (
                <div>
                    <h3>{t('priceAnalysis.listings')}</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>{t('priceAnalysis.platform')}</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>{t('priceAnalysis.roomType')}</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>{t('priceAnalysis.roomName')}</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>{t('priceAnalysis.listingUrl')}</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>{t('priceAnalysis.status')}</th>
                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>{t('priceAnalysis.lastScraped')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {listings.map((listing) => (
                                <tr key={listing.id}>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{listing.platform}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{listing.roomType}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{listing.roomName || '-'}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                        {listing.listingUrl ? (
                                            <a href={listing.listingUrl} target="_blank" rel="noopener noreferrer">
                                                {t('common.view')}
                                            </a>
                                        ) : '-'}
                                    </td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                        {listing.isActive ? t('priceAnalysis.active') : t('priceAnalysis.inactive')}
                                    </td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                        {listing.priceData.length > 0
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

