import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { PencilIcon, TrashIcon, PlusIcon, XMarkIcon, CheckIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { usePermissions } from '../hooks/usePermissions.ts';
import FilterPane from '../components/FilterPane.tsx';
import SavedFilterTags from '../components/SavedFilterTags.tsx';
import { FilterCondition } from '../components/FilterRow.tsx';
import { useSidepane } from '../contexts/SidepaneContext.tsx';

interface Branch {
    id: number;
    name: string;
}

interface BranchManagementTabProps {
    onError: (error: string) => void;
}

// BranchCard-Komponente für mobile und Desktop-Ansicht
const BranchCard: React.FC<{
    branch: Branch;
    onEdit: (branch: Branch) => void;
    onDelete: (branchId: number) => void;
    canEdit: boolean;
    canDelete: boolean;
}> = ({ branch, onEdit, onDelete, canEdit, canDelete }) => {
    const { t } = useTranslation();
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 mb-4">
            {/* Header mit Branchname und Aktionen */}
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{branch.name}</h3>
                
                <div className="flex space-x-2">
                    {canEdit && (
                        <button
                            onClick={() => onEdit(branch)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1"
                            title={t('common.edit', { defaultValue: 'Bearbeiten' })}
                        >
                            <PencilIcon className="h-5 w-5" />
                        </button>
                    )}
                    
                    {canDelete && (
                        <button
                            onClick={() => onDelete(branch.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1"
                            title={t('common.delete', { defaultValue: 'Löschen' })}
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// TableID für gespeicherte Filter
const BRANCHES_TABLE_ID = 'branches-table';

const BranchManagementTab: React.FC<BranchManagementTabProps> = ({ onError }) => {
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({ name: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
    const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
    const [activeFilterName, setActiveFilterName] = useState<string>('');
    const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);
    const [displayLimit, setDisplayLimit] = useState(10);
    const { hasPermission } = usePermissions();
    const { openSidepane, closeSidepane } = useSidepane();

    // Berechtigungen prüfen
    const canCreate = hasPermission('branches', 'write', 'table');
    const canEdit = hasPermission('branches', 'write', 'table');
    const canDelete = hasPermission('branches', 'write', 'table');

    // Branches laden
    const fetchBranches = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get(API_ENDPOINTS.BRANCHES.BASE);
            setBranches(response.data);
        } catch (error: any) {
            console.error('Fehler beim Laden der Niederlassungen:', error);
            const errorMessage = error.response?.data?.message || t('branches.loadError');
            onError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [onError]);

    useEffect(() => {
        fetchBranches();
    }, [fetchBranches]);

    // Sidepane öffnen/schließen basierend auf Modal-Status
    useEffect(() => {
        if (isModalOpen) {
            openSidepane();
        } else {
            closeSidepane();
        }
        
        return () => {
            closeSidepane();
        };
    }, [isModalOpen, openSidepane, closeSidepane]);

    // Formular zurücksetzen
    const resetForm = () => {
        setFormData({ name: '' });
        setEditingBranch(null);
    };

    // Modal öffnen für neue Branch
    const handleCreate = () => {
        resetForm();
        setIsModalOpen(true);
    };

    // Modal öffnen für Bearbeitung
    const handleEdit = (branch: Branch) => {
        setEditingBranch(branch);
        setFormData({ name: branch.name });
        setIsModalOpen(true);
    };

    // Modal schließen
    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    // Formular absenden
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            onError(t('branches.nameRequired'));
            return;
        }

        try {
            if (editingBranch) {
                // Branch aktualisieren
                await axiosInstance.put(API_ENDPOINTS.BRANCHES.UPDATE(editingBranch.id), {
                    name: formData.name.trim()
                });
            } else {
                // Neue Branch erstellen
                await axiosInstance.post(API_ENDPOINTS.BRANCHES.CREATE, {
                    name: formData.name.trim()
                });
            }
            
            await fetchBranches();
            handleCloseModal();
        } catch (error: any) {
            console.error('Fehler beim Speichern der Niederlassung:', error);
            const errorMessage = error.response?.data?.message || t('branches.saveError');
            onError(errorMessage);
        }
    };

    // Branch löschen
    const handleDelete = async (branchId: number) => {
        if (!window.confirm(t('branches.deleteConfirm', { defaultValue: 'Möchten Sie diese Niederlassung wirklich löschen?' }))) {
            return;
        }

        try {
            await axiosInstance.delete(API_ENDPOINTS.BRANCHES.DELETE(branchId));
            await fetchBranches();
        } catch (error: any) {
            console.error('Fehler beim Löschen der Niederlassung:', error);
            const errorMessage = error.response?.data?.message || t('branches.deleteError');
            onError(errorMessage);
        }
    };

    // Funktion zum Zählen der aktiven Filter
    const getActiveFilterCount = () => {
        return filterConditions.length;
    };

    // Filtern und sortieren der Branches
    const filteredAndSortedBranches = useMemo(() => {
        return branches
            .filter(branch => {
                // Globale Suche
                if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    const matchesSearch = branch.name.toLowerCase().includes(searchLower);
                    
                    if (!matchesSearch) return false;
                }
                
                // Prüfe erweiterte Filterbedingungen, wenn vorhanden
                if (filterConditions.length > 0) {
                    let result = filterConditions.length > 0;
                    
                    for (let i = 0; i < filterConditions.length; i++) {
                        const condition = filterConditions[i];
                        let conditionMet = false;
                        
                        switch (condition.column) {
                            case 'name':
                                if (condition.operator === 'equals') {
                                    conditionMet = branch.name.toLowerCase() === (condition.value as string || '').toLowerCase();
                                } else if (condition.operator === 'contains') {
                                    conditionMet = branch.name.toLowerCase().includes((condition.value as string || '').toLowerCase());
                                } else if (condition.operator === 'startsWith') {
                                    conditionMet = branch.name.toLowerCase().startsWith((condition.value as string || '').toLowerCase());
                                }
                                break;
                        }
                        
                        // Verknüpfe das Ergebnis dieser Bedingung mit dem Gesamtergebnis
                        if (i === 0) {
                            result = conditionMet;
                        } else {
                            const operator = filterLogicalOperators[i - 1];
                            result = operator === 'AND' ? (result && conditionMet) : (result || conditionMet);
                        }
                    }
                    
                    if (!result) return false;
                }
                
                return true;
            })
            .sort((a, b) => {
                return a.name.localeCompare(b.name);
            });
    }, [branches, searchTerm, filterConditions, filterLogicalOperators]);

    // Funktion zum Anwenden von Filterbedingungen
    const applyFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
        setFilterConditions(conditions);
        setFilterLogicalOperators(operators);
    };
    
    // Funktion zum Zurücksetzen der Filter
    const resetFilterConditions = () => {
        setFilterConditions([]);
        setFilterLogicalOperators([]);
        setActiveFilterName('');
        setSelectedFilterId(null);
    };
    
    // Filter Change Handler (Controlled Mode)
    const handleFilterChange = (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
        setActiveFilterName(name);
        setSelectedFilterId(id);
        applyFilterConditions(conditions, operators);
    };

    // Standard-Filter erstellen und speichern
    useEffect(() => {
        const createStandardFilters = async () => {
            try {
                const token = localStorage.getItem('token');
                
                if (!token) {
                    console.error(t('common.notAuthenticated'));
                    return;
                }

                // Prüfen, ob die Standard-Filter bereits existieren
                const existingFiltersResponse = await axiosInstance.get(
                    API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(BRANCHES_TABLE_ID)
                );

                const existingFilters = existingFiltersResponse.data || [];
                const alleFilterExists = existingFilters.some((filter: any) => filter.name === 'Alle');

                // Erstelle "Alle"-Filter, wenn er noch nicht existiert
                if (!alleFilterExists) {
                    const alleFilter = {
                        tableId: BRANCHES_TABLE_ID,
                        name: 'Alle',
                        conditions: [],
                        operators: []
                    };

                    await axiosInstance.post(
                        API_ENDPOINTS.SAVED_FILTERS.BASE,
                        alleFilter
                    );
                    console.log(t('branches.filterCreated'));
                }
            } catch (error) {
                console.error(t('branches.createStandardFiltersError'), error);
            }
        };

        createStandardFilters();
    }, []);

    // Initialer Default-Filter setzen (Controlled Mode)
    useEffect(() => {
        const setInitialFilter = async () => {
            try {
                const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(BRANCHES_TABLE_ID));
                const filters = response.data;
                
                const alleFilter = filters.find((filter: any) => filter.name === 'Alle');
                if (alleFilter) {
                    setActiveFilterName('Alle');
                    setSelectedFilterId(alleFilter.id);
                    applyFilterConditions(alleFilter.conditions, alleFilter.operators);
                }
            } catch (error) {
                console.error(t('branches.setInitialFilterError'), error);
            }
        };

        setInitialFilter();
    }, []);

    // Branches rendern
    const renderBranches = () => {
        if (filteredAndSortedBranches.length === 0) {
            return (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded text-center">
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('branches.noBranches', { defaultValue: 'Keine Niederlassungen gefunden. Erstellen Sie eine neue Niederlassung mit dem Button oben.' })}
                    </p>
                </div>
            );
        }
        
        // Card-Ansicht
        return (
            <>
                <div className="space-y-4">
                    {filteredAndSortedBranches.slice(0, displayLimit).map((branch) => (
                        <BranchCard 
                            key={branch.id} 
                            branch={branch} 
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            canEdit={canEdit}
                            canDelete={canDelete}
                        />
                    ))}
                </div>
                
                {/* "Mehr anzeigen" Button */}
                {filteredAndSortedBranches.length > displayLimit && (
                    <div className="mt-4 flex justify-center">
                        <button
                            className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:border-gray-700 dark:hover:bg-gray-700"
                            onClick={() => setDisplayLimit(prevLimit => prevLimit + 10)}
                        >
                            {t('common.showMore', { defaultValue: 'Mehr anzeigen' })} ({filteredAndSortedBranches.length - displayLimit} {t('common.remaining', { defaultValue: 'verbleibend' })})
                        </button>
                    </div>
                )}
            </>
        );
    };

    // Mobile-Erkennung
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
    
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 640);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div>
            {/* Spaltenanzeige und Suche */}
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                    {/* Linke Seite: "Neue Niederlassung erstellen"-Button */}
                    <div className="flex items-center">
                        {canCreate && (
                            <button
                                onClick={handleCreate}
                                className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-700 border border-blue-200 dark:border-gray-700 shadow-sm flex items-center justify-center"
                                style={{ width: '30.19px', height: '30.19px' }}
                                title={t('branches.create', { defaultValue: 'Neue Niederlassung' })}
                                aria-label={t('branches.create', { defaultValue: 'Neue Niederlassung' })}
                            >
                                <PlusIcon className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    
                    {/* Mitte: Titel - Kein Titel in der Mitte notwendig bei dieser Komponente, da der Tab-Header bereits den Titel zeigt */}
                    <div></div>
                    
                    {/* Rechte Seite: Suchfeld, Filter-Button */}
                    <div className="flex items-center gap-1.5">
                        <input
                            type="text"
                            placeholder={t('common.search', { defaultValue: 'Suchen...' })}
                            className="w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button
                            className={`p-2 rounded-md ${getActiveFilterCount() > 0 ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'} ml-1 relative`}
                            onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
                            title={t('common.filter', { defaultValue: 'Filter' })}
                        >
                            <FunnelIcon className="w-5 h-5" />
                            {getActiveFilterCount() > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
                                    {getActiveFilterCount()}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Filter-Modal */}
                {isFilterModalOpen && (
                    <FilterPane
                        columns={[
                            { id: 'name', label: t('branches.name', { defaultValue: 'Name' }) }
                        ]}
                        onApply={applyFilterConditions}
                        onReset={resetFilterConditions}
                        savedConditions={filterConditions}
                        savedOperators={filterLogicalOperators}
                        tableId={BRANCHES_TABLE_ID}
                    />
                )}
                
                {/* Gespeicherte Filter als Tags anzeigen */}
                <SavedFilterTags
                    tableId={BRANCHES_TABLE_ID}
                    onSelectFilter={applyFilterConditions}
                    onReset={resetFilterConditions}
                    activeFilterName={activeFilterName}
                    selectedFilterId={selectedFilterId}
                    onFilterChange={handleFilterChange}
                    defaultFilterName="Alle"
                />

                {loading ? (
                    <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    renderBranches()
                )}
            </div>

            {/* Modal/Sidepane für Branch-Erstellung/Bearbeitung */}
            {isModalOpen && (
                <>
                    {/* Mobile (unter 640px) - Modal */}
                    {isMobile ? (
                        <Dialog open={isModalOpen} onClose={handleCloseModal} className="relative z-50">
                            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                            
                            <div className="fixed inset-0 flex items-center justify-center p-4">
                                <Dialog.Panel className="mx-auto max-w-sm w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                                    {/* Header */}
                                    <div className="px-6 py-4 border-b dark:border-gray-700 flex-shrink-0">
                                        <div className="flex items-center justify-between">
                                            <Dialog.Title className="text-lg font-semibold dark:text-white">
                                                {editingBranch 
                                                    ? t('branches.edit', { defaultValue: 'Niederlassung bearbeiten' })
                                                    : t('branches.create', { defaultValue: 'Neue Niederlassung' })
                                                }
                                            </Dialog.Title>
                                            <button
                                                onClick={handleCloseModal}
                                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                            >
                                                <XMarkIcon className="h-6 w-6" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Form */}
                                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                {t('branches.name', { defaultValue: 'Name' })}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                required
                                                autoFocus
                                            />
                                        </div>

                                        {/* Buttons */}
                                        <div className="flex justify-end pt-4 gap-2">
                                            <button
                                                type="button"
                                                onClick={handleCloseModal}
                                                className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                                title={t('common.cancel', { defaultValue: 'Abbrechen' })}
                                            >
                                                <XMarkIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                type="submit"
                                                className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                                                title={editingBranch ? t('common.update', { defaultValue: 'Aktualisieren' }) : t('common.create', { defaultValue: 'Erstellen' })}
                                            >
                                                <CheckIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </div>
                        </Dialog>
                    ) : (
                        // Desktop - Sidepane
                        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col">
                            {/* Header */}
                            <div className="px-6 py-4 border-b dark:border-gray-700 flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold dark:text-white">
                                        {editingBranch 
                                            ? t('branches.edit', { defaultValue: 'Niederlassung bearbeiten' })
                                            : t('branches.create', { defaultValue: 'Neue Niederlassung' })
                                        }
                                    </h2>
                                    <button
                                        onClick={handleCloseModal}
                                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Form */}
                            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                                <div className="flex-1 overflow-y-auto min-h-0">
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                {t('branches.name', { defaultValue: 'Name' })}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white px-3 py-2"
                                                required
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="flex justify-end pt-4 gap-2 px-6 pb-6 border-t dark:border-gray-700">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                        title={t('common.cancel', { defaultValue: 'Abbrechen' })}
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                        type="submit"
                                        className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                                        title={editingBranch ? t('common.update', { defaultValue: 'Aktualisieren' }) : t('common.create', { defaultValue: 'Erstellen' })}
                                    >
                                        <CheckIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default BranchManagementTab;
