import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions.ts';
import useMessage from '../../hooks/useMessage.ts';
import { useError } from '../../contexts/ErrorContext.tsx';
import { useBranch } from '../../contexts/BranchContext.tsx';
import { API_ENDPOINTS } from '../../config/api.ts';
import axiosInstance from '../../config/axios.ts';
import { PlusIcon, MagnifyingGlassIcon, TrashIcon, PencilIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Competitor {
    id: number;
    name: string;
    searchName?: string;
    bookingComUrl?: string;
    hostelworldUrl?: string;
    isActive: boolean;
    lastSearchedAt?: string;
    lastPriceFoundAt?: string;
}

interface CompetitorGroup {
    id: number;
    branchId: number;
    name: string;
    description?: string;
    city: string;
    country?: string;
    isActive: boolean;
    competitors: Competitor[];
    createdAt: string;
    updatedAt: string;
}

const CompetitorGroupsTab: React.FC = () => {
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

    const [competitorGroups, setCompetitorGroups] = useState<CompetitorGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [discovering, setDiscovering] = useState(false);
    const [searchingPrices, setSearchingPrices] = useState<number | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddCompetitorModal, setShowAddCompetitorModal] = useState<number | null>(null);
    const [editingGroup, setEditingGroup] = useState<CompetitorGroup | null>(null);
    const [editingCompetitor, setEditingCompetitor] = useState<{ groupId: number; competitor: Competitor } | null>(null);

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        city: '',
        country: ''
    });
    const [competitorFormData, setCompetitorFormData] = useState({
        name: '',
        searchName: '',
        bookingComUrl: '',
        hostelworldUrl: ''
    });
    const [roomType, setRoomType] = useState<'private' | 'dorm'>('private');

    const loadCompetitorGroups = useCallback(async () => {
        if (!currentBranch) return;

        setLoading(true);
        try {
            const response = await axiosInstance.get(API_ENDPOINTS.PRICE_ANALYSIS.COMPETITOR_GROUPS.BASE, {
                params: {
                    branchId: currentBranch.id
                }
            });
            setCompetitorGroups(response.data);
        } catch (error: any) {
            handleError(error);
        } finally {
            setLoading(false);
        }
    }, [currentBranch, handleError]);

    useEffect(() => {
        if (currentBranch) {
            loadCompetitorGroups();
        }
    }, [currentBranch, loadCompetitorGroups]);

    const handleDiscoverCompetitors = useCallback(async () => {
        if (!currentBranch) {
            return;
        }

        if (!hasPermission('price_analysis', 'write', 'page')) {
            showMessage(t('common.noPermission'), 'error');
            return;
        }

        setDiscovering(true);
        try {
            const response = await axiosInstance.post(
                API_ENDPOINTS.PRICE_ANALYSIS.BRANCHES.DISCOVER_COMPETITORS(currentBranch.id),
                {
                    roomType,
                    maxCompetitors: 10
                }
            );

            const discoveredCompetitors = response.data.competitors || [];
            
            if (discoveredCompetitors.length === 0) {
                showMessage(t('priceAnalysis.competitors.noneFound', 'Keine Konkurrenten gefunden'), 'info');
                return;
            }

            // Zeige Modal zum Erstellen einer neuen Gruppe mit den gefundenen Competitors
            setFormData({
                name: `${currentBranch.city || 'Konkurrenten'} - ${roomType === 'private' ? 'Privatzimmer' : 'Schlafsaal'}`,
                description: `${discoveredCompetitors.length} Konkurrenten gefunden`,
                city: currentBranch.city || '',
                country: currentBranch.country || ''
            });
            setShowCreateModal(true);
            // Speichere discoveredCompetitors temporär für später
            (window as any).__discoveredCompetitors = discoveredCompetitors;
            
            showMessage(
                t('priceAnalysis.competitors.discovered', { count: discoveredCompetitors.length }, `{{count}} Konkurrenten gefunden`),
                'success'
            );
        } catch (error: any) {
            handleError(error);
        } finally {
            setDiscovering(false);
        }
    }, [currentBranch, roomType, hasPermission, showMessage, t, handleError]);

    const handleCreateGroup = useCallback(async () => {
        if (!currentBranch || !formData.name || !formData.city) {
            showMessage(t('priceAnalysis.competitors.fillRequired', 'Bitte alle Pflichtfelder ausfüllen'), 'error');
            return;
        }

        try {
            const response = await axiosInstance.post(API_ENDPOINTS.PRICE_ANALYSIS.COMPETITOR_GROUPS.BASE, {
                branchId: currentBranch.id,
                ...formData
            });

            const newGroup = response.data;
            
            // Füge discovered Competitors hinzu, falls vorhanden
            const discoveredCompetitors = (window as any).__discoveredCompetitors || [];
            if (discoveredCompetitors.length > 0) {
                for (const competitor of discoveredCompetitors) {
                    try {
                        await axiosInstance.post(
                            API_ENDPOINTS.PRICE_ANALYSIS.COMPETITOR_GROUPS.COMPETITORS(newGroup.id),
                            {
                                name: competitor.name,
                                searchName: competitor.searchName,
                                bookingComUrl: competitor.bookingComUrl,
                                hostelworldUrl: competitor.hostelworldUrl
                            }
                        );
                    } catch (error) {
                        console.error('Fehler beim Hinzufügen von Competitor:', error);
                    }
                }
                delete (window as any).__discoveredCompetitors;
            }

            showMessage(t('priceAnalysis.competitors.groupCreated', 'Konkurrenzgruppe erstellt'), 'success');
            setShowCreateModal(false);
            setFormData({ name: '', description: '', city: '', country: '' });
            loadCompetitorGroups();
        } catch (error: any) {
            handleError(error);
        }
    }, [currentBranch, formData, showMessage, t, handleError, loadCompetitorGroups]);

    const handleAddCompetitor = useCallback(async (groupId: number) => {
        if (!competitorFormData.name) {
            showMessage(t('priceAnalysis.competitors.nameRequired', 'Name ist erforderlich'), 'error');
            return;
        }

        try {
            await axiosInstance.post(
                API_ENDPOINTS.PRICE_ANALYSIS.COMPETITOR_GROUPS.COMPETITORS(groupId),
                competitorFormData
            );

            showMessage(t('priceAnalysis.competitors.competitorAdded', 'Konkurrent hinzugefügt'), 'success');
            setShowAddCompetitorModal(null);
            setCompetitorFormData({ name: '', searchName: '', bookingComUrl: '', hostelworldUrl: '' });
            loadCompetitorGroups();
        } catch (error: any) {
            handleError(error);
        }
    }, [competitorFormData, showMessage, t, handleError, loadCompetitorGroups]);

    const handleSearchPrices = useCallback(async (groupId: number) => {
        if (!hasPermission('price_analysis', 'write', 'page')) {
            showMessage(t('common.noPermission'), 'error');
            return;
        }

        setSearchingPrices(groupId);
        try {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 3);

            await axiosInstance.post(
                API_ENDPOINTS.PRICE_ANALYSIS.COMPETITOR_GROUPS.SEARCH_PRICES(groupId),
                {
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    roomType
                }
            );

            showMessage(t('priceAnalysis.competitors.searchStarted', 'Preissuche gestartet'), 'success');
        } catch (error: any) {
            handleError(error);
        } finally {
            setSearchingPrices(null);
        }
    }, [roomType, hasPermission, showMessage, t, handleError]);

    const handleDeleteGroup = useCallback(async (groupId: number) => {
        if (!window.confirm(t('priceAnalysis.competitors.deleteConfirm', 'Wirklich löschen?'))) {
            return;
        }

        try {
            await axiosInstance.delete(API_ENDPOINTS.PRICE_ANALYSIS.COMPETITOR_GROUPS.BY_ID(groupId));
            showMessage(t('priceAnalysis.competitors.groupDeleted', 'Gruppe gelöscht'), 'success');
            loadCompetitorGroups();
        } catch (error: any) {
            handleError(error);
        }
    }, [showMessage, t, handleError, loadCompetitorGroups]);

    const handleDeleteCompetitor = useCallback(async (competitorId: number) => {
        if (!window.confirm(t('priceAnalysis.competitors.deleteCompetitorConfirm', 'Konkurrent wirklich löschen?'))) {
            return;
        }

        try {
            await axiosInstance.delete(API_ENDPOINTS.PRICE_ANALYSIS.COMPETITORS.BY_ID(competitorId));
            showMessage(t('priceAnalysis.competitors.competitorDeleted', 'Konkurrent gelöscht'), 'success');
            loadCompetitorGroups();
        } catch (error: any) {
            handleError(error);
        }
    }, [showMessage, t, handleError, loadCompetitorGroups]);

    if (loading) {
        return (
            <div className="text-center py-4">
                {t('priceAnalysis.loading', 'Lädt...')}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header mit Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
                <div className="mb-4 flex items-center gap-2">
                    {hasPermission('price_analysis', 'write', 'page') && (
                        <div className="relative group">
                            <button
                                onClick={() => {
                                    setFormData({
                                        name: '',
                                        description: '',
                                        city: currentBranch?.city || '',
                                        country: currentBranch?.country || ''
                                    });
                                    setShowCreateModal(true);
                                }}
                                className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm flex items-center justify-center"
                                style={{ width: '30.19px', height: '30.19px' }}
                                aria-label={t('priceAnalysis.competitors.createGroup', 'Neue Gruppe')}
                            >
                                <PlusIcon className="h-4 w-4" />
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                {t('priceAnalysis.competitors.createGroup', 'Neue Gruppe')}
                            </div>
                        </div>
                    )}
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {t('priceAnalysis.competitors.title', 'Konkurrenzgruppen')}
                    </h2>
                    <div className="flex items-center gap-2 ml-auto">
                        <select
                            value={roomType}
                            onChange={(e) => setRoomType(e.target.value as 'private' | 'dorm')}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        >
                            <option value="private">{t('priceAnalysis.roomType.private', 'Privatzimmer')}</option>
                            <option value="dorm">{t('priceAnalysis.roomType.dorm', 'Schlafsaal')}</option>
                        </select>
                        <div className="relative group">
                            <button
                                onClick={handleDiscoverCompetitors}
                                disabled={discovering || !currentBranch || !hasPermission('price_analysis', 'write', 'page')}
                                className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={t('priceAnalysis.competitors.discover', 'KI: Konkurrenten finden')}
                            >
                                <SparklesIcon className={`h-5 w-5 ${discovering ? 'animate-pulse' : ''}`} />
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                {t('priceAnalysis.competitors.discover', 'KI: Konkurrenten finden')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Competitor Groups List */}
            {competitorGroups.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 text-center text-gray-500 dark:text-gray-400">
                    {t('priceAnalysis.competitors.noGroups', 'Keine Konkurrenzgruppen gefunden')}
                </div>
            ) : (
                <div className="space-y-4">
                    {competitorGroups.map((group) => (
                        <div
                            key={group.id}
                            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {group.name}
                                    </h3>
                                    {group.description && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            {group.description}
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                        {group.city}{group.country ? `, ${group.country}` : ''} • {group.competitors.length} {t('priceAnalysis.competitors.competitors', 'Konkurrenten')}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative group">
                                        <button
                                            onClick={() => handleSearchPrices(group.id)}
                                            disabled={searchingPrices === group.id}
                                            className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            title={t('priceAnalysis.competitors.searchPrices', 'Preise suchen')}
                                        >
                                            <MagnifyingGlassIcon className={`h-5 w-5 ${searchingPrices === group.id ? 'animate-pulse' : ''}`} />
                                        </button>
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                            {searchingPrices === group.id
                                                ? t('priceAnalysis.competitors.searching', 'Suche...')
                                                : t('priceAnalysis.competitors.searchPrices', 'Preise suchen')
                                            }
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteGroup(group.id)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                        title={t('priceAnalysis.competitors.deleteConfirm', 'Wirklich löschen?')}
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Competitors List */}
                            <div className="mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t('priceAnalysis.competitors.competitors', 'Konkurrenten')}
                                    </h4>
                                    <div className="relative group">
                                        <button
                                            onClick={() => setShowAddCompetitorModal(group.id)}
                                            className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                            title={t('priceAnalysis.competitors.add', 'Hinzufügen')}
                                        >
                                            <PlusIcon className="h-5 w-5" />
                                        </button>
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                            {t('priceAnalysis.competitors.add', 'Hinzufügen')}
                                        </div>
                                    </div>
                                </div>
                                {group.competitors.length === 0 ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('priceAnalysis.competitors.noCompetitors', 'Keine Konkurrenten')}
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {group.competitors.map((competitor) => (
                                            <div
                                                key={competitor.id}
                                                className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
                                            >
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {competitor.name}
                                                    </p>
                                                    {competitor.searchName && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {competitor.searchName}
                                                        </p>
                                                    )}
                                                    {competitor.lastPriceFoundAt && (
                                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                                            {t('priceAnalysis.competitors.lastPriceFound', 'Letzter Preis')}: {new Date(competitor.lastPriceFoundAt).toLocaleDateString('de-DE')}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteCompetitor(competitor.id)}
                                                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Group Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">
                            {t('priceAnalysis.competitors.createGroup', 'Neue Konkurrenzgruppe')}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {t('priceAnalysis.competitors.name', 'Name')} *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {t('priceAnalysis.competitors.description', 'Beschreibung')}
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {t('priceAnalysis.competitors.city', 'Stadt')} *
                                </label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {t('priceAnalysis.competitors.country', 'Land')}
                                </label>
                                <input
                                    type="text"
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <div className="relative group">
                                <button
                                    onClick={handleCreateGroup}
                                    className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                    title={t('common.create', 'Erstellen')}
                                >
                                    <PlusIcon className="h-5 w-5" />
                                </button>
                                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                    {t('common.create', 'Erstellen')}
                                </div>
                            </div>
                            <div className="relative group">
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setFormData({ name: '', description: '', city: '', country: '' });
                                    }}
                                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                    title={t('common.cancel', 'Abbrechen')}
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                    {t('common.cancel', 'Abbrechen')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Competitor Modal */}
            {showAddCompetitorModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">
                            {t('priceAnalysis.competitors.addCompetitor', 'Konkurrent hinzufügen')}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {t('priceAnalysis.competitors.name', 'Name')} *
                                </label>
                                <input
                                    type="text"
                                    value={competitorFormData.name}
                                    onChange={(e) => setCompetitorFormData({ ...competitorFormData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {t('priceAnalysis.competitors.searchName', 'Suchname')}
                                </label>
                                <input
                                    type="text"
                                    value={competitorFormData.searchName}
                                    onChange={(e) => setCompetitorFormData({ ...competitorFormData, searchName: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {t('priceAnalysis.competitors.bookingComUrl', 'Booking.com URL')}
                                </label>
                                <input
                                    type="url"
                                    value={competitorFormData.bookingComUrl}
                                    onChange={(e) => setCompetitorFormData({ ...competitorFormData, bookingComUrl: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {t('priceAnalysis.competitors.hostelworldUrl', 'Hostelworld URL')}
                                </label>
                                <input
                                    type="url"
                                    value={competitorFormData.hostelworldUrl}
                                    onChange={(e) => setCompetitorFormData({ ...competitorFormData, hostelworldUrl: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <div className="relative group">
                                <button
                                    onClick={() => handleAddCompetitor(showAddCompetitorModal)}
                                    className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                    title={t('common.add', 'Hinzufügen')}
                                >
                                    <PlusIcon className="h-5 w-5" />
                                </button>
                                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                    {t('common.add', 'Hinzufügen')}
                                </div>
                            </div>
                            <div className="relative group">
                                <button
                                    onClick={() => {
                                        setShowAddCompetitorModal(null);
                                        setCompetitorFormData({ name: '', searchName: '', bookingComUrl: '', hostelworldUrl: '' });
                                    }}
                                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                    title={t('common.cancel', 'Abbrechen')}
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                    {t('common.cancel', 'Abbrechen')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompetitorGroupsTab;

