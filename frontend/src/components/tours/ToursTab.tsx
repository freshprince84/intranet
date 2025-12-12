import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PencilIcon, PlusIcon, ArrowsUpDownIcon, FunnelIcon, InformationCircleIcon, Squares2X2Icon, TableCellsIcon, ArrowDownTrayIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS, API_URL } from '../../config/api.ts';
import axiosInstance from '../../config/axios.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { useTableSettings } from '../../hooks/useTableSettings.ts';
import useMessage from '../../hooks/useMessage.ts';
import { useError } from '../../contexts/ErrorContext.tsx';
import TableColumnConfig from '../TableColumnConfig.tsx';
import FilterPane from '../FilterPane.tsx';
import SavedFilterTags from '../SavedFilterTags.tsx';
import { useFilterContext } from '../../contexts/FilterContext.tsx';
import CreateTourModal from './CreateTourModal.tsx';
import EditTourModal from './EditTourModal.tsx';
import TourDetailsModal from './TourDetailsModal.tsx';
import TourExportDialog from './TourExportDialog.tsx';
import { Tour, TourType } from '../../types/tour.ts';
import { FilterCondition } from '../FilterRow.tsx';
import { applyFilters, evaluateUserRoleCondition } from '../../utils/filterLogic.ts';

interface ToursTabProps {
}

interface TourSortConfig {
    key: 'title' | 'type' | 'price' | 'location' | 'duration' | 'branch' | 'createdBy' | 'isActive';
    direction: 'asc' | 'desc';
}

const TOURS_TABLE_ID = 'worktracker-tours';

const defaultTourColumnOrder = ['title', 'type', 'price', 'location', 'duration', 'branch', 'isActive', 'actions'];

// ❌ ENTFERNT: defaultTourCardSortDirections
// Hauptsortierung wird jetzt aus Settings geladen (pro Benutzer gespeichert)

const tourCardToTableMapping: Record<string, string> = {
    'title': 'title',
    'type': 'type',
    'price': 'price',
    'location': 'location',
    'duration': 'duration',
    'branch': 'branch',
    'createdBy': 'createdBy',
    'isActive': 'isActive'
};

const getTourCardMetadataFromColumnOrder = (columnOrder: string[]): string[] => {
    const cardMetadata: string[] = [];
    columnOrder.forEach(tableCol => {
        const cardMeta = tourCardToTableMapping[tableCol] || [];
        if (cardMeta && typeof cardMeta === 'string') {
            cardMetadata.push(cardMeta);
        }
    });
    return cardMetadata;
};

const getTourHiddenCardMetadata = (hiddenTableColumns: string[]): Set<string> => {
    const hiddenCardMetadata = new Set<string>();
    hiddenTableColumns.forEach(tableCol => {
        const cardMeta = tourCardToTableMapping[tableCol];
        if (cardMeta) {
            hiddenCardMetadata.add(cardMeta);
        }
    });
    return hiddenCardMetadata;
};

const ToursTab: React.FC<ToursTabProps> = () => {
    const { t } = useTranslation();
    const { hasPermission } = usePermissions();
    const { showMessage } = useMessage();
    
    // Fehlerbehandlung mit Fallback
    const errorContext = useError();
    const handleErrorContext = errorContext?.handleError || ((err: any, context?: Record<string, any>) => {
        console.error('Fehler:', err, context);
        const errorMessage = err?.response?.data?.message || err?.message || 'Ein Fehler ist aufgetreten';
        showMessage(errorMessage, 'error');
    });
    
    // Tour-States
    const [tours, setTours] = useState<Tour[]>([]);
    const [toursLoading, setToursLoading] = useState(false);
    const [toursError, setToursError] = useState<string | null>(null);
    const [tourSearchTerm, setTourSearchTerm] = useState('');
    const [tourFilterConditions, setTourFilterConditions] = useState<FilterCondition[]>([]);
    const [tourFilterLogicalOperators, setTourFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
    const [tourActiveFilterName, setTourActiveFilterName] = useState<string>(t('tours.filters.current', 'Aktuell'));
    const [tourSelectedFilterId, setTourSelectedFilterId] = useState<number | null>(null);
    
    // ✅ PERFORMANCE: Ref-Pattern für tourFilterLogicalOperators (verhindert Re-Creation von loadTours)
    const tourFilterLogicalOperatorsRef = useRef(tourFilterLogicalOperators);
    
    useEffect(() => {
        tourFilterLogicalOperatorsRef.current = tourFilterLogicalOperators;
    }, [tourFilterLogicalOperators]);
    const [isCreateTourModalOpen, setIsCreateTourModalOpen] = useState(false);
    const [isEditTourModalOpen, setIsEditTourModalOpen] = useState(false);
    const [isTourDetailsModalOpen, setIsTourDetailsModalOpen] = useState(false);
    const [isTourExportDialogOpen, setIsTourExportDialogOpen] = useState(false);
    const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
    const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
    const [displayLimit, setDisplayLimit] = useState<number>(10);
    const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    
    // Bildgenerierung States
    const [generatingImages, setGeneratingImages] = useState<Record<number, boolean>>({});
    const [imageGenerationJobs, setImageGenerationJobs] = useState<Record<number, string | null>>({});
    
    // Tabellen-Einstellungen
    const {
        settings,
        isLoading: isLoadingSettings,
        updateColumnOrder,
        updateHiddenColumns,
        toggleColumnVisibility,
        isColumnVisible,
        updateViewMode,
        updateSortConfig
    } = useTableSettings(TOURS_TABLE_ID, {
        defaultColumnOrder: defaultTourColumnOrder,
        defaultHiddenColumns: [],
        defaultViewMode: 'cards'
    });
    
    // Hauptsortierung aus Settings laden (für Table & Cards synchron)
    const tourTableSortConfig: TourSortConfig = settings?.sortConfig || { key: 'title', direction: 'asc' };
    
    // Hauptsortierung Handler (für Table & Cards synchron)
    const handleMainSortChange = (key: string, direction: 'asc' | 'desc') => {
        updateSortConfig({ key: key as TourSortConfig['key'], direction });
    };
    
    // Tours-Spalten
    const availableTourColumns = useMemo(() => [
        { id: 'title', label: t('tours.columns.title', 'Titel'), shortLabel: t('tours.columns.title', 'Titel').substring(0, 4) },
        { id: 'type', label: t('tours.columns.type', 'Typ'), shortLabel: t('tours.columns.type', 'Typ').substring(0, 3) },
        { id: 'price', label: t('tours.columns.price', 'Preis'), shortLabel: t('tours.columns.price', 'Preis').substring(0, 3) },
        { id: 'location', label: t('tours.columns.location', 'Ort'), shortLabel: t('tours.columns.location', 'Ort').substring(0, 3) },
        { id: 'duration', label: t('tours.columns.duration', 'Dauer'), shortLabel: t('tours.columns.duration', 'Dauer').substring(0, 3) },
        { id: 'branch', label: t('tours.columns.branch', 'Niederlassung'), shortLabel: t('tours.columns.branch', 'Niederlassung').substring(0, 5) },
        { id: 'createdBy', label: t('tours.columns.createdBy', 'Erstellt von'), shortLabel: t('tours.columns.createdBy', 'Erstellt von').substring(0, 5) },
        { id: 'isActive', label: t('tours.columns.status', 'Status'), shortLabel: t('tours.columns.status', 'Status').substring(0, 3) },
        { id: 'actions', label: t('tours.columns.actions', 'Aktionen'), shortLabel: t('common.actions').substring(0, 3) },
    ], [t]);
    
    const tourFilterOnlyColumns = useMemo(() => [
        { id: 'description', label: t('tours.columns.description', 'Beschreibung'), shortLabel: t('tours.columns.description', 'Beschreibung').substring(0, 3) },
        { id: 'maxParticipants', label: t('tours.columns.maxParticipants', 'Max. Teilnehmer'), shortLabel: t('tours.columns.maxParticipants', 'Max. Teilnehmer').substring(0, 3) },
        { id: 'minParticipants', label: t('tours.columns.minParticipants', 'Min. Teilnehmer'), shortLabel: t('tours.columns.minParticipants', 'Min. Teilnehmer').substring(0, 3) },
    ], [t]);
    
    // ❌ ENTFERNT: tourCardSortDirections und handleTourCardSortDirectionChange
    // Hauptsortierung wird jetzt aus Settings geladen (pro Benutzer gespeichert)
    
    const viewMode = settings?.viewMode || 'cards';
    
    // Card-Metadaten-Reihenfolge aus columnOrder ableiten
    const cardMetadataOrder = useMemo(() => {
        return getTourCardMetadataFromColumnOrder(settings?.columnOrder || defaultTourColumnOrder);
    }, [settings?.columnOrder]);
    
    // Versteckte Card-Metadaten aus hiddenColumns ableiten
    const hiddenCardMetadata = useMemo(() => {
        return getTourHiddenCardMetadata(settings?.hiddenColumns || []);
    }, [settings?.hiddenColumns]);
    
    // Sichtbare Card-Metadaten
    const visibleCardMetadata = useMemo(() => {
        return new Set(cardMetadataOrder.filter(meta => !hiddenCardMetadata.has(meta)));
    }, [cardMetadataOrder, hiddenCardMetadata]);
    
    // Funktion zum Laden der Tours
    // ✅ PERFORMANCE: Ref-Pattern verwendet (tourFilterLogicalOperatorsRef) statt State als Dependency
    const loadTours = useCallback(async (filterId?: number, filterConditions?: any[], background = false) => {
        try {
            if (!background) {
                setToursLoading(true);
                setToursError(null);
            }
            
            const params: any = {};
            if (filterId) {
                params.filterId = filterId;
            } else if (filterConditions && filterConditions.length > 0) {
                params.filterConditions = JSON.stringify({
                    conditions: filterConditions,
                    operators: tourFilterLogicalOperatorsRef.current  // ✅ Ref verwenden statt State
                });
            }
            
            const response = await axiosInstance.get(API_ENDPOINTS.TOURS.BASE, { params });
            if (response.data.success) {
                const rawData = response.data.data || [];
                const toursData = Array.isArray(rawData) 
                    ? rawData.filter((tour: Tour | null) => 
                        tour != null && 
                        typeof tour === 'object' && 
                        tour.title != null && 
                        typeof tour.title === 'string'
                    )
                    : [];
                if (!background) {
                    setTours(toursData);
                }
            } else {
                const errorMessage = response.data.message || t('errors.loadError');
                if (!background) {
                    setToursError(errorMessage);
                    showMessage(errorMessage, 'error');
                }
            }
        } catch (err: any) {
            console.error('Fehler beim Laden der Touren:', err);
            const errorMessage = err.response?.data?.message || t('errors.loadError');
            if (!background) {
                setToursError(errorMessage);
                showMessage(errorMessage, 'error');
            }
        } finally {
            if (!background) {
                setToursLoading(false);
            }
        }
    }, [t, showMessage]);  // ✅ tourFilterLogicalOperators entfernt (Ref verwendet)
    
    // Handler für Bildgenerierung
    const handleGenerateImages = useCallback(async (tourId: number) => {
        try {
            setGeneratingImages(prev => ({ ...prev, [tourId]: true }));
            
            const response = await axiosInstance.post(API_ENDPOINTS.TOURS.GENERATE_IMAGES(tourId));
            
            if (response.data.success) {
                if (response.data.mode === 'synchronous') {
                    // Synchroner Modus: Fertig
                    showMessage(
                        t('tours.imagesGenerated', { defaultValue: 'Bilder erfolgreich generiert' }),
                        'success'
                    );
                    setGeneratingImages(prev => ({ ...prev, [tourId]: false }));
                    await loadTours();
                } else {
                    // Asynchroner Modus: Polling starten
                    const jobId = response.data.jobId;
                    setImageGenerationJobs(prev => ({ ...prev, [tourId]: jobId }));
                    showMessage(
                        t('tours.imageGenerationStarted', { defaultValue: 'Bildgenerierung gestartet' }),
                        'info'
                    );
                }
            } else {
                throw new Error(response.data.message || 'Fehler beim Starten der Bildgenerierung');
            }
        } catch (err: any) {
            console.error('Fehler beim Starten der Bildgenerierung:', err);
            showMessage(
                err.response?.data?.message || t('tours.imageGenerationFailed', { defaultValue: 'Fehler bei Bildgenerierung' }),
                'error'
            );
            setGeneratingImages(prev => ({ ...prev, [tourId]: false }));
        }
    }, [t, showMessage, loadTours]);
    
    // Polling für Bildgenerierungs-Status
    useEffect(() => {
        const pollingIntervals: Record<number, NodeJS.Timeout> = {};
        const pollingTimeouts: Record<number, NodeJS.Timeout> = {};
        
        Object.entries(imageGenerationJobs).forEach(([tourIdStr, jobId]) => {
            if (!jobId) return;
            
            const tourId = parseInt(tourIdStr, 10);
            let pollCount = 0;
            const maxPolls = 30; // Max. 60 Sekunden (30 * 2 Sekunden)
            
            // Polling-Intervall
            pollingIntervals[tourId] = setInterval(async () => {
                try {
                    pollCount++;
                    
                    // Timeout nach 60 Sekunden
                    if (pollCount > maxPolls) {
                        clearInterval(pollingIntervals[tourId]);
                        delete pollingIntervals[tourId];
                        setGeneratingImages(prev => ({ ...prev, [tourId]: false }));
                        setImageGenerationJobs(prev => {
                            const newJobs = { ...prev };
                            delete newJobs[tourId];
                            return newJobs;
                        });
                        showMessage(
                            t('tours.imageGenerationTimeout', { defaultValue: 'Bildgenerierung hat zu lange gedauert' }),
                            'warning'
                        );
                        return;
                    }
                    
                    const response = await axiosInstance.get(
                        API_ENDPOINTS.TOURS.GENERATE_IMAGES_STATUS(tourId),
                        { params: { jobId } }
                    );
                    
                    if (response.data.success) {
                        const status = response.data.status;
                        const progress = response.data.progress || 0;
                        
                        if (status === 'completed') {
                            // Erfolg: Polling stoppen
                            clearInterval(pollingIntervals[tourId]);
                            delete pollingIntervals[tourId];
                            setGeneratingImages(prev => ({ ...prev, [tourId]: false }));
                            setImageGenerationJobs(prev => {
                                const newJobs = { ...prev };
                                delete newJobs[tourId];
                                return newJobs;
                            });
                            showMessage(
                                t('tours.imagesGenerated', { defaultValue: 'Bilder erfolgreich generiert' }),
                                'success'
                            );
                            await loadTours();
                        } else if (status === 'failed') {
                            // Fehler: Polling stoppen
                            clearInterval(pollingIntervals[tourId]);
                            delete pollingIntervals[tourId];
                            setGeneratingImages(prev => ({ ...prev, [tourId]: false }));
                            setImageGenerationJobs(prev => {
                                const newJobs = { ...prev };
                                delete newJobs[tourId];
                                return newJobs;
                            });
                            showMessage(
                                t('tours.imageGenerationFailed', { defaultValue: 'Fehler bei Bildgenerierung' }),
                                'error'
                            );
                        }
                        // 'waiting' oder 'active': Weiter pollen
                    }
                } catch (err: any) {
                    console.error('Fehler beim Polling:', err);
                    // Fehler beim Polling: Weiter versuchen (nicht stoppen)
                }
            }, 2000); // Alle 2 Sekunden
        });
        
        // ✅ MEMORY LEAK PREVENTION: Cleanup-Funktion
        return () => {
            Object.values(pollingIntervals).forEach(interval => clearInterval(interval));
            Object.values(pollingTimeouts).forEach(timeout => clearTimeout(timeout));
        };
    }, [imageGenerationJobs, t, showMessage, loadTours]);
    
    // ✅ MEMORY: Cleanup - Alle großen Arrays beim Unmount löschen
    useEffect(() => {
        return () => {
            setTours([]);
            setTourFilterConditions([]);
        };
    }, []); // Nur beim Unmount ausführen
    
    // ✅ ENTFERNT: Lade Tours beim Mount - wird jetzt durch Standard-Pattern gemacht
    
    // Tour-Filter-Funktionen
    // ✅ PERFORMANCE: Mit useCallback stabilisiert (verhindert Endlosschleife in useEffect)
    const applyTourFilterConditions = useCallback((conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
        setTourFilterConditions(conditions);
        setTourFilterLogicalOperators(operators);
        loadTours(undefined, conditions, false);
    }, [loadTours]);
    
    // ✅ PERFORMANCE: Mit useCallback stabilisiert
    const resetTourFilterConditions = useCallback(() => {
        setTourFilterConditions([]);
        setTourFilterLogicalOperators([]);
        setTourActiveFilterName(t('tours.filters.current', 'Aktuell'));
        setTourSelectedFilterId(null);
        loadTours();
    }, [loadTours, t]);
    
    // ✅ PERFORMANCE: Mit useCallback stabilisiert (verhindert Endlosschleife in useEffect)
    const handleTourFilterChange = useCallback(async (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
        setTourSelectedFilterId(id);
        setTourActiveFilterName(name);
        if (id) {
            await loadTours(id);
        } else {
            await applyTourFilterConditions(conditions, operators);
        }
    }, [loadTours, applyTourFilterConditions]);
    
    // ✅ STANDARD: Filter-Laden und Default-Filter-Anwendung
    const filterContext = useFilterContext();
    const { loadFilters } = filterContext;
    
    // ✅ PERFORMANCE: Ref verhindert mehrfache Anwendung des Default-Filters (Endlosschleife)
    const initialLoadAttemptedRef = useRef(false);
    
    // ✅ STANDARD: Filter-Laden und Default-Filter-Anwendung mit leeren Dependencies (wie in Requests.tsx)
    useEffect(() => {
        // ✅ PERFORMANCE: Verhindere mehrfache Ausführung
        if (initialLoadAttemptedRef.current) {
            return;
        }
        
        const initialize = async () => {
            // ✅ PERFORMANCE: Markiere als versucht, BEVOR async Operation startet
            initialLoadAttemptedRef.current = true;
            
            try {
                if (!hasPermission('tours', 'read', 'table')) {
                    return;
                }
                
                // 1. Filter laden (wartet auf State-Update)
                const filters = await loadFilters(TOURS_TABLE_ID);
                
                // 2. Default-Filter anwenden (IMMER vorhanden!)
                const defaultFilter = filters.find(f => f.name === 'Aktuell');
                if (defaultFilter) {
                    await handleTourFilterChange(
                        defaultFilter.name,
                        defaultFilter.id,
                        defaultFilter.conditions,
                        defaultFilter.operators
                    );
                    return; // Daten werden durch handleTourFilterChange geladen
                }
                
                // 3. Fallback: Daten ohne Filter laden (sollte nie passieren)
                await loadTours();
            } catch (error) {
                // ✅ PERFORMANCE: Bei Fehler Ref zurücksetzen, damit Retry möglich ist
                initialLoadAttemptedRef.current = false;
                if (process.env.NODE_ENV === 'development') {
                    console.error('[ToursTab] Fehler beim Initialisieren:', error);
                }
            }
        };
        
        initialize();
    }, []); // ✅ STANDARD: Leere Dependencies wie im Standard-Pattern (Requests.tsx:760)
    
    const handleTourSort = (key: TourSortConfig['key']) => {
        // Table-Header-Sortierung: Aktualisiert Hauptsortierung direkt (synchron für Table & Cards)
        const newDirection = tourTableSortConfig.key === key && tourTableSortConfig.direction === 'asc' ? 'desc' : 'asc';
        updateSortConfig({ key, direction: newDirection });
    };
    
    // Drag & Drop Handler
    const handleDragStart = (columnId: string) => {
        setDraggedColumn(columnId);
    };
    
    const handleDragOver = (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
        if (draggedColumn && draggedColumn !== columnId) {
            setDragOverColumn(columnId);
        }
    };
    
    const handleDrop = (e: React.DragEvent, columnId: string) => {
        e.preventDefault();
            if (draggedColumn && draggedColumn !== columnId) {
                const columnOrder = settings?.columnOrder || defaultTourColumnOrder;
                const dragIndex = columnOrder.indexOf(draggedColumn);
                const hoverIndex = columnOrder.indexOf(columnId);

                if (dragIndex > -1 && hoverIndex > -1) {
                    const newColumnOrder = [...columnOrder];
                const draggedColumn_ = newColumnOrder[dragIndex];
                newColumnOrder.splice(dragIndex, 1);
                newColumnOrder.splice(hoverIndex, 0, draggedColumn_);
                updateColumnOrder(newColumnOrder);
            }
        }
        setDraggedColumn(null);
        setDragOverColumn(null);
    };
    
    const handleDragEnd = () => {
        setDraggedColumn(null);
        setDragOverColumn(null);
    };
    
    // Filtern und sortieren der Spalten gemäß den Benutzereinstellungen
    const completeColumnOrder = useMemo(() => {
        const currentOrder = settings?.columnOrder || [];
        const validOrder = currentOrder.filter(id => id != null && typeof id === 'string');
        const missingColumns = defaultTourColumnOrder.filter(id => !validOrder.includes(id));
        return [...validOrder, ...missingColumns];
    }, [settings?.columnOrder]);
    
    const visibleColumnIds = completeColumnOrder.filter(id => id != null && typeof id === 'string' && isColumnVisible(id));
    
    const getActiveFilterCount = () => {
        return tourFilterConditions.length;
    };
    
    // Filter- und Sortierlogik für Tours
    const filteredAndSortedTours = useMemo(() => {
        // Sicherstellen, dass tours ein Array ist
        if (!Array.isArray(tours)) {
            return [];
        }
        
        const validTours = tours.filter(tour => tour != null && tour.title != null && typeof tour.title === 'string');
        
        let filtered = validTours.filter(tour => {
            // Such-Filter
            if (tourSearchTerm) {
                const searchLower = tourSearchTerm.toLowerCase();
                
                // ✅ OPTIMIERUNG: Frühes Beenden bei Match
                if (tour.title && tour.title.toLowerCase().includes(searchLower)) return true;
                if (tour.location && tour.location.toLowerCase().includes(searchLower)) return true;
                if (tour.description && tour.description.toLowerCase().includes(searchLower)) return true;
                
                return false; // Kein Match gefunden
            }
            
            return true;
        });

        // Erweiterte Filterbedingungen anwenden
        if (tourFilterConditions.length > 0) {
            const columnEvaluators: any = {
                'title': (tour: Tour, cond: FilterCondition) => {
                    if (!tour || !tour.title) return false;
                    const value = (cond.value as string || '').toLowerCase();
                    const title = (tour.title || '').toLowerCase();
                    if (cond.operator === 'equals') return tour.title === cond.value;
                    if (cond.operator === 'contains') return title.includes(value);
                    if (cond.operator === 'startsWith') return title.startsWith(value);
                    if (cond.operator === 'endsWith') return title.endsWith(value);
                    return null;
                },
                'type': (tour: Tour, cond: FilterCondition) => {
                    if (!tour || !tour.type) return false;
                    if (cond.operator === 'equals') return tour.type === cond.value;
                    if (cond.operator === 'notEquals') return tour.type !== cond.value;
                    return null;
                },
                'isActive': (tour: Tour, cond: FilterCondition) => {
                    const value = cond.value === 'true' || cond.value === true || cond.value === '1';
                    if (cond.operator === 'equals') return tour.isActive === value;
                    if (cond.operator === 'notEquals') return tour.isActive !== value;
                    return null;
                },
                'price': (tour: Tour, cond: FilterCondition) => {
                    const price = typeof tour.price === 'string' ? parseFloat(tour.price) : (tour.price || 0);
                    const compareValue = typeof cond.value === 'string' ? parseFloat(cond.value) : (cond.value || 0);
                    if (isNaN(price) || isNaN(compareValue)) return false;
                    if (cond.operator === 'equals') return Math.abs(price - compareValue) < 0.01;
                    if (cond.operator === 'greaterThan') return price > compareValue;
                    if (cond.operator === 'lessThan') return price < compareValue;
                    return null;
                },
                'location': (tour: Tour, cond: FilterCondition) => {
                    const value = (cond.value as string || '').toLowerCase();
                    const location = (tour.location || '').toLowerCase();
                    if (cond.operator === 'equals') return tour.location === cond.value;
                    if (cond.operator === 'contains') return location.includes(value);
                    if (cond.operator === 'startsWith') return location.startsWith(value);
                    if (cond.operator === 'endsWith') return location.endsWith(value);
                    return null;
                },
                'branch': (tour: Tour, cond: FilterCondition) => {
                    const branchName = (tour.branch?.name || '').toLowerCase();
                    const value = (cond.value as string || '').toLowerCase();
                    if (cond.operator === 'equals') return branchName === value;
                    if (cond.operator === 'contains') return branchName.includes(value);
                    return null;
                },
                'createdBy': (tour: Tour, cond: FilterCondition) => {
                    const createdByName = tour.createdBy
                        ? `${tour.createdBy.firstName} ${tour.createdBy.lastName}`
                        : '';
                    return evaluateUserRoleCondition(
                        tour.createdById || null,
                        null,
                        cond,
                        createdByName
                    );
                }
            };

            const getFieldValue = (tour: Tour | null, columnId: string): any => {
                if (!tour) return '';
                switch (columnId) {
                    case 'title': return tour.title || '';
                    case 'type': return tour.type || '';
                    case 'price': return typeof tour.price === 'string' ? parseFloat(tour.price) : (tour.price || 0);
                    case 'location': return tour.location || '';
                    case 'duration': return tour.duration || 0;
                    case 'branch': return tour.branch?.name || '';
                    case 'createdBy': return tour.createdBy ? `${tour.createdBy.firstName} ${tour.createdBy.lastName}` : '';
                    case 'isActive': return tour.isActive;
                    default: return '';
                }
            };

            filtered = applyFilters(
                filtered,
                tourFilterConditions,
                tourFilterLogicalOperators,
                getFieldValue,
                columnEvaluators
            );
        }
        
        // Hilfsfunktion zum Extrahieren von Werten für Sortierung
        const getTourSortValue = (tour: Tour | null, columnId: string): any => {
            if (!tour) return '';
            switch (columnId) {
                case 'title':
                    return (tour.title || '').toLowerCase();
                case 'type':
                    return (tour.type || '').toLowerCase();
                case 'price':
                    return typeof tour.price === 'string' ? parseFloat(tour.price) : (tour.price || 0);
                case 'location':
                    return (tour.location || '').toLowerCase();
                case 'duration':
                    return tour.duration || 0;
                case 'branch':
                    return (tour.branch?.name || '').toLowerCase();
                case 'createdBy':
                    return tour.createdBy ? `${tour.createdBy.firstName} ${tour.createdBy.lastName}`.toLowerCase() : '';
                case 'isActive':
                    return tour.isActive ? 1 : 0;
                default:
                    return '';
            }
        };
        
        // Sortierung basierend auf Prioritäten
        const sorted = filtered.sort((a, b) => {
            // Null-Check für a und b
            if (!a || !b) {
                if (!a && !b) return 0;
                if (!a) return 1;
                if (!b) return -1;
            }
            
            // 2. Priorität: Table-Header-Sortierung (temporäre Überschreibung, auch wenn Filter aktiv)
            if (viewMode === 'table' && tourTableSortConfig.key) {
                const valueA = getTourSortValue(a, tourTableSortConfig.key);
                const valueB = getTourSortValue(b, tourTableSortConfig.key);
                
                let comparison = 0;
                if (typeof valueA === 'number' && typeof valueB === 'number') {
                    comparison = valueA - valueB;
                } else {
                    // ✅ OPTIMIERUNG: Vermeide String() Konvertierung wenn bereits String
                    const strA = typeof valueA === 'string' ? valueA : String(valueA);
                    const strB = typeof valueB === 'string' ? valueB : String(valueB);
                    comparison = strA.localeCompare(strB);
                }
                
                if (comparison !== 0) {
                    return tourTableSortConfig.direction === 'asc' ? comparison : -comparison;
                }
            }
            
            // 3. Hauptsortierung (tourTableSortConfig) - für Table & Cards synchron
            // (wird bereits oben in Priorität 2 behandelt)
            
            // 4. Fallback: Titel (alphabetisch)
            // ✅ OPTIMIERUNG: toLowerCase() bereits in getTourSortValue, aber hier für Fallback
            const titleA = (a?.title || '').toLowerCase();
            const titleB = (b?.title || '').toLowerCase();
            return titleA.localeCompare(titleB);
        });
        
        return sorted;
    }, [tours, tourSearchTerm, tourFilterConditions, tourFilterLogicalOperators, viewMode, tourTableSortConfig]);

    return (
        <div className="space-y-4">
            {/* Header mit Suche, View-Toggle, Filter, Export, Create */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {/* Linke Seite: Suche */}
                <div className="flex-1 w-full sm:max-w-md">
                    <input
                        type="text"
                        placeholder={t('common.search') + '...'}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        value={tourSearchTerm}
                        onChange={(e) => setTourSearchTerm(e.target.value)}
                    />
                </div>
                
                {/* Rechte Seite: View-Toggle, Filter, Export, Create */}
                <div className="flex items-center gap-1.5">
                    {/* View-Mode Toggle */}
                    <div className="relative group">
                        <button
                            className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                viewMode === 'cards' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''
                            }`}
                            onClick={() => updateViewMode(viewMode === 'table' ? 'cards' : 'table')}
                        >
                            {viewMode === 'table' ? (
                                <Squares2X2Icon className="h-5 w-5" />
                            ) : (
                                <TableCellsIcon className="h-5 w-5" />
                            )}
                        </button>
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                            {viewMode === 'table' ? t('common.viewAsCards') : t('common.viewAsTable')}
                        </div>
                    </div>
                    
                    {/* Filter-Button */}
                    <div className="relative group ml-1">
                        <button
                            className={`p-2 rounded-md ${getActiveFilterCount() > 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} relative`}
                            onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
                        >
                            <FunnelIcon className="h-5 w-5" />
                            {getActiveFilterCount() > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
                                    {getActiveFilterCount()}
                                </span>
                            )}
                        </button>
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                            {t('common.filter')}
                        </div>
                    </div>
                    
                    {/* Export-Button */}
                    {hasPermission('tour_edit', 'write', 'button') && (
                        <div className="relative group">
                            <button
                                onClick={() => setIsTourExportDialogOpen(true)}
                                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <ArrowDownTrayIcon className="h-5 w-5" />
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                {t('tours.export', 'Exportieren')}
                            </div>
                        </div>
                    )}
                    
                    {/* Spalten-Konfiguration */}
                    <div className="ml-1">
                        <TableColumnConfig
                            columns={viewMode === 'cards'
                                ? [
                                    { id: 'title', label: t('tours.columns.title', 'Titel') },
                                    { id: 'type', label: t('tours.columns.type', 'Typ') },
                                    { id: 'price', label: t('tours.columns.price', 'Preis') },
                                    { id: 'location', label: t('tours.columns.location', 'Ort') },
                                    { id: 'duration', label: t('tours.columns.duration', 'Dauer') },
                                    { id: 'branch', label: t('tours.columns.branch', 'Niederlassung') },
                                    { id: 'createdBy', label: t('tours.columns.createdBy', 'Erstellt von') },
                                    { id: 'isActive', label: t('tours.columns.status', 'Status') }
                                ]
                                : availableTourColumns}
                            visibleColumns={viewMode === 'cards'
                                ? Array.from(visibleCardMetadata)
                                : visibleColumnIds}
                            columnOrder={viewMode === 'cards'
                                ? cardMetadataOrder
                                : settings.columnOrder}
                            onToggleColumnVisibility={(columnId) => {
                                if (viewMode === 'cards') {
                                    const tableColumn = tourCardToTableMapping[columnId];
                                    if (tableColumn) {
                                        toggleColumnVisibility(tableColumn);
                                    }
                                } else {
                                    toggleColumnVisibility(columnId);
                                }
                            }}
                            onColumnOrderChange={(newOrder) => {
                                if (viewMode === 'cards') {
                                    const newTableOrder = newOrder.map(cardMeta => tourCardToTableMapping[cardMeta] || cardMeta).filter(Boolean);
                                    updateColumnOrder(newTableOrder);
                                } else {
                                    updateColumnOrder(newOrder);
                                }
                            }}
                            modalTitle={viewMode === 'cards' ? t('tableColumn.sortAndDisplay') : t('tableColumn.configure')}
                            mainSortConfig={tourTableSortConfig}
                            onMainSortChange={handleMainSortChange}
                            showMainSort={true}
                        />
                    </div>
                    
                    {/* Create-Button */}
                    {hasPermission('tour_create', 'write', 'button') && (
                        <div className="relative group">
                            <button
                                onClick={() => setIsCreateTourModalOpen(true)}
                                className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm flex items-center justify-center"
                                style={{ width: '30.19px', height: '30.19px' }}
                                aria-label={t('tours.create', 'Neue Tour erstellen')}
                            >
                                <PlusIcon className="h-4 w-4" />
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                {t('tours.create', 'Neue Tour erstellen')}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Filter-Pane */}
            {isFilterModalOpen && (
                <div className="px-3 sm:px-4 md:px-6">
                    <FilterPane
                        columns={[...availableTourColumns, ...tourFilterOnlyColumns]}
                        onApply={applyTourFilterConditions}
                        onReset={resetTourFilterConditions}
                        savedConditions={tourFilterConditions}
                        savedOperators={tourFilterLogicalOperators}
                        tableId={TOURS_TABLE_ID}
                    />
                </div>
            )}

            {/* Gespeicherte Filter als Tags */}
            <SavedFilterTags
                tableId={TOURS_TABLE_ID}
                onSelectFilter={applyTourFilterConditions}
                onReset={resetTourFilterConditions}
                activeFilterName={tourActiveFilterName}
                selectedFilterId={tourSelectedFilterId}
                onFilterChange={handleTourFilterChange}
                defaultFilterName="Aktuell" // ✅ FIX: Hardcodiert (konsistent mit DB)
            />

            {/* Table View */}
            {viewMode === 'table' && (
                <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                {visibleColumnIds.map(columnId => {
                                    const column = availableTourColumns.find(col => col.id === columnId);
                                    if (!column) return null;
                                    
                                    return (
                                        <th
                                            key={columnId}
                                            scope="col"
                                            className={`px-3 sm:px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${columnId === dragOverColumn ? 'bg-blue-100 dark:bg-blue-800' : ''}`}
                                            draggable={true}
                                            onDragStart={() => handleDragStart(columnId)}
                                            onDragOver={(e) => handleDragOver(e, columnId)}
                                            onDrop={(e) => handleDrop(e, columnId)}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <div className="flex items-center">
                                                {window.innerWidth <= 640 ? column.shortLabel : column.label}
                                                {columnId !== 'actions' && (
                                                    <button 
                                                        onClick={() => handleTourSort(columnId as TourSortConfig['key'])}
                                                        className="ml-1 focus:outline-none"
                                                    >
                                                        <ArrowsUpDownIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {toursLoading ? (
                                <tr>
                                    <td colSpan={visibleColumnIds.length} className="px-3 sm:px-4 md:px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        {t('common.loading')}
                                    </td>
                                </tr>
                            ) : toursError ? (
                                <tr>
                                    <td colSpan={visibleColumnIds.length} className="px-3 sm:px-4 md:px-6 py-8 text-center text-red-500 dark:text-red-400">
                                        {toursError}
                                    </td>
                                </tr>
                            ) : filteredAndSortedTours.length === 0 ? (
                                <tr>
                                    <td colSpan={visibleColumnIds.length} className="px-3 sm:px-4 md:px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        {t('tours.noTours')}
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {filteredAndSortedTours.slice(0, displayLimit).filter(tour => tour != null && tour.title != null).map(tour => (
                                        <tr 
                                            key={tour.id} 
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            {visibleColumnIds.map(columnId => {
                                                switch (columnId) {
                                                    case 'title':
                                                        return (
                                                            <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4">
                                                                <div className="text-sm text-gray-900 dark:text-gray-200 break-words">
                                                                    {tour?.title || '-'}
                                                                </div>
                                                            </td>
                                                        );
                                                    case 'type':
                                                        return (
                                                            <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                    {tour.type === TourType.OWN ? t('tours.typeOwn') : t('tours.typeExternal')}
                                                                </div>
                                                            </td>
                                                        );
                                                    case 'price':
                                                        return (
                                                            <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                    {tour.price ? `${Number(tour.price).toLocaleString()} ${tour.currency || 'COP'}` : '-'}
                                                                </div>
                                                            </td>
                                                        );
                                                    case 'location':
                                                        return (
                                                            <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                    {tour.location || '-'}
                                                                </div>
                                                            </td>
                                                        );
                                                    case 'duration':
                                                        return (
                                                            <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                    {tour.duration ? `${tour.duration} ${t('common.hours', 'h')}` : '-'}
                                                                </div>
                                                            </td>
                                                        );
                                                    case 'branch':
                                                        return (
                                                            <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                    {tour.branch?.name || '-'}
                                                                </div>
                                                            </td>
                                                        );
                                                    case 'createdBy':
                                                        return (
                                                            <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900 dark:text-gray-200">
                                                                    {tour.createdBy ? `${tour.createdBy.firstName} ${tour.createdBy.lastName}` : '-'}
                                                                </div>
                                                            </td>
                                                        );
                                                    case 'isActive':
                                                        return (
                                                            <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                {hasPermission('tour_edit', 'write', 'button') ? (
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            try {
                                                                                await axiosInstance.put(API_ENDPOINTS.TOURS.TOGGLE_ACTIVE(tour.id));
                                                                                showMessage(
                                                                                    tour.isActive 
                                                                                        ? t('tours.deactivated', { defaultValue: 'Tour deaktiviert' })
                                                                                        : t('tours.activated', { defaultValue: 'Tour aktiviert' }),
                                                                                    'success'
                                                                                );
                                                                                await loadTours();
                                                                            } catch (err: any) {
                                                                                console.error('Fehler beim Toggle der Tour:', err);
                                                                                showMessage(
                                                                                    err.response?.data?.message || t('errors.unknownError'),
                                                                                    'error'
                                                                                );
                                                                            }
                                                                        }}
                                                                        className={`px-2 py-1 text-xs rounded transition-colors ${
                                                                            tour.isActive 
                                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800' 
                                                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                                        }`}
                                                                    >
                                                                        {tour.isActive ? t('tours.statusActive') : t('tours.statusInactive')}
                                                                    </button>
                                                                ) : (
                                                                    <span className={`px-2 py-1 text-xs rounded ${
                                                                        tour.isActive 
                                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                                                    }`}>
                                                                        {tour.isActive ? t('tours.statusActive') : t('tours.statusInactive')}
                                                                    </span>
                                                                )}
                                                            </td>
                                                        );
                                                    case 'actions':
                                                        return (
                                                            <td key={columnId} className="px-3 sm:px-4 md:px-6 py-4 whitespace-nowrap">
                                                                <div className="flex space-x-2 action-buttons">
                                                                    <div className="relative group">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedTourId(tour.id);
                                                                                setIsTourDetailsModalOpen(true);
                                                                            }}
                                                                            className="p-1.5 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                                                                        >
                                                                            <InformationCircleIcon className="h-4 w-4" />
                                                                        </button>
                                                                        <div className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                            {t('common.viewDetails', 'Details anzeigen')}
                                                                        </div>
                                                                    </div>
                                                                    {hasPermission('tour_edit', 'write', 'button') && (
                                                                        <>
                                                                            <div className="relative group">
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleGenerateImages(tour.id);
                                                                                    }}
                                                                                    disabled={generatingImages[tour.id] || false}
                                                                                    className={`p-1.5 transition-colors ${
                                                                                        generatingImages[tour.id]
                                                                                            ? 'text-gray-400 cursor-not-allowed'
                                                                                            : 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
                                                                                    }`}
                                                                                >
                                                                                    <PhotoIcon className="h-4 w-4" />
                                                                                </button>
                                                                                <div className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                                    {generatingImages[tour.id]
                                                                                        ? t('tours.generatingImages', { defaultValue: 'Bilder werden generiert...' })
                                                                                        : t('tours.generateImages', { defaultValue: 'Bilder generieren' })}
                                                                                </div>
                                                                            </div>
                                                                            <div className="relative group">
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setSelectedTour(tour);
                                                                                        setIsEditTourModalOpen(true);
                                                                                    }}
                                                                                    className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                                                >
                                                                                    <PencilIcon className="h-4 w-4" />
                                                                                </button>
                                                                                <div className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                                                    {t('tours.edit', 'Bearbeiten')}
                                                                                </div>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        );
                                                    default:
                                                        return null;
                                                }
                                            })}
                                        </tr>
                                    ))}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Card View */}
            {viewMode === 'cards' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {toursLoading ? (
                        <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                            {t('common.loading')}
                        </div>
                    ) : toursError ? (
                        <div className="col-span-full text-center py-8 text-red-500 dark:text-red-400">
                            {toursError}
                        </div>
                    ) : filteredAndSortedTours.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                            {t('tours.noTours')}
                        </div>
                    ) : (
                        filteredAndSortedTours.slice(0, displayLimit).filter(tour => tour != null && tour.title != null).map((tour) => (
                            <div
                                key={tour.id}
                                className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4 hover:shadow-md transition-shadow"
                            >
                                {/* Bild-Anzeige */}
                                {tour.imageUrl && (
                                    <img 
                                        src={`${API_URL}${tour.imageUrl}`}
                                        alt={tour.title || 'Tour Bild'}
                                        className="w-full h-48 object-cover rounded-lg mb-2"
                                        loading="lazy"
                                    />
                                )}
                                
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className="text-lg font-semibold dark:text-white">{tour?.title || '-'}</h4>
                                    {hasPermission('tour_edit', 'write', 'button') ? (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await axiosInstance.put(API_ENDPOINTS.TOURS.TOGGLE_ACTIVE(tour.id));
                                                    showMessage(
                                                        tour.isActive 
                                                            ? t('tours.deactivated', { defaultValue: 'Tour deaktiviert' })
                                                            : t('tours.activated', { defaultValue: 'Tour aktiviert' }),
                                                        'success'
                                                    );
                                                    await loadTours();
                                                } catch (err: any) {
                                                    console.error('Fehler beim Toggle der Tour:', err);
                                                    showMessage(
                                                        err.response?.data?.message || t('errors.unknownError'),
                                                        'error'
                                                    );
                                                }
                                            }}
                                            className={`px-2 py-1 text-xs rounded transition-colors ${
                                                tour.isActive 
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800' 
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            {tour.isActive ? t('tours.statusActive') : t('tours.statusInactive')}
                                        </button>
                                    ) : (
                                        <span className={`px-2 py-1 text-xs rounded ${
                                            tour.isActive 
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                        }`}>
                                            {tour.isActive ? t('tours.statusActive') : t('tours.statusInactive')}
                                        </span>
                                    )}
                                </div>
                                
                                {tour.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                        {tour.description}
                                    </p>
                                )}

                                <div className="flex items-center justify-between mt-4">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        <span className="font-medium">{t('tours.type')}:</span>{' '}
                                        {tour.type === TourType.OWN ? t('tours.typeOwn') : t('tours.typeExternal')}
                                    </div>
                                    {tour.price && (
                                        <div className="text-sm font-semibold dark:text-white">
                                            {Number(tour.price).toLocaleString()} {tour.currency || 'COP'}
                                        </div>
                                    )}
                                </div>
                                
                                {hasPermission('tour_edit', 'write', 'button') && (
                                    <div className="mt-4 flex justify-end gap-2">
                                        {/* Bildgenerierungs-Button */}
                                        <div className="relative group">
                                            <button
                                                onClick={() => handleGenerateImages(tour.id)}
                                                disabled={generatingImages[tour.id] || false}
                                                className={`p-1.5 rounded transition-colors ${
                                                    generatingImages[tour.id]
                                                        ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 cursor-not-allowed'
                                                        : 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                                                }`}
                                            >
                                                <PhotoIcon className="h-4 w-4" />
                                            </button>
                                            <div className="absolute right-full mr-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                                {generatingImages[tour.id]
                                                    ? t('tours.generatingImages', { defaultValue: 'Bilder werden generiert...' })
                                                    : t('tours.generateImages', { defaultValue: 'Bilder generieren' })}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedTour(tour);
                                                setIsEditTourModalOpen(true);
                                            }}
                                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                                        >
                                            {t('tours.edit', 'Bearbeiten')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* "Mehr anzeigen" Button */}
            {filteredAndSortedTours.length > displayLimit && (
                <div className="mt-4 flex justify-center">
                    <button
                        className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 border border-blue-300 dark:border-gray-600 rounded-md hover:bg-blue-50 dark:hover:bg-gray-600"
                        onClick={() => setDisplayLimit(prevLimit => prevLimit + 10)}
                    >
                        {t('common.showMore')} ({filteredAndSortedTours.length - displayLimit} {t('common.remaining')})
                    </button>
                </div>
            )}

            {/* Modals */}
            <CreateTourModal
                isOpen={isCreateTourModalOpen}
                onClose={() => setIsCreateTourModalOpen(false)}
                onTourCreated={async () => {
                    await loadTours();
                }}
            />
            
            {selectedTour && (
                <EditTourModal
                    isOpen={isEditTourModalOpen}
                    onClose={() => {
                        setIsEditTourModalOpen(false);
                        setSelectedTour(null);
                    }}
                    onTourUpdated={async () => {
                        await loadTours();
                        setIsEditTourModalOpen(false);
                        setSelectedTour(null);
                    }}
                    tour={selectedTour}
                />
            )}
            
            {selectedTourId && (
                <TourDetailsModal
                    isOpen={isTourDetailsModalOpen}
                    onClose={() => {
                        setIsTourDetailsModalOpen(false);
                        setSelectedTourId(null);
                    }}
                    tourId={selectedTourId}
                    onTourUpdated={async () => {
                        await loadTours();
                    }}
                />
            )}
            
            <TourExportDialog
                isOpen={isTourExportDialogOpen}
                onClose={() => setIsTourExportDialogOpen(false)}
                tourCount={filteredAndSortedTours.length}
            />
        </div>
    );
};

export default ToursTab;

