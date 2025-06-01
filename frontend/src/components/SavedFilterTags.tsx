import React, { useState, useEffect, useMemo, useRef, useLayoutEffect, useCallback } from 'react';
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { FilterCondition } from './FilterRow.tsx';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { toast } from 'react-toastify';

interface SavedFilter {
  id: number;
  name: string;
  tableId: string;
  conditions: FilterCondition[];
  operators: ('AND' | 'OR')[];
}

interface SavedFilterTagsProps {
  tableId: string;
  onSelectFilter: (conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => void;
  onReset: () => void;
  activeFilterName?: string;
  selectedFilterId?: number | null;
  onFilterChange?: (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => void;
  defaultFilterName?: string;
}

const SavedFilterTags: React.FC<SavedFilterTagsProps> = ({ 
  tableId, 
  onSelectFilter, 
  onReset,
  activeFilterName,
  selectedFilterId,
  onFilterChange,
  defaultFilterName = 'Heute'
}) => {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentClientNames, setRecentClientNames] = useState<string[]>([]);
  
  // Responsive Tag-Display States (optimiert)
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleTagCount, setVisibleTagCount] = useState(4); // Fallback für SSR
  const [containerWidth, setContainerWidth] = useState(0);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Dropdown State für überlaufende Tags
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Bereinigungsfunktion für überschüssige Client-Filter
  const cleanupExcessiveClientFilters = async (currentClientNames: string[]) => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId));
      const existingFilters = response.data;
      
      // Finde alle Client-Filter (Filter deren Name in recentClientNames ist)
      const clientFilters = existingFilters.filter((filter: SavedFilter) => 
        currentClientNames.includes(filter.name)
      );
      
      // Wenn mehr als 5 Client-Filter vorhanden sind, lösche die ältesten
      if (clientFilters.length > 5) {
        const filtersToDelete = clientFilters
          .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .slice(0, clientFilters.length - 5);
        
        for (const filterToDelete of filtersToDelete) {
          await axiosInstance.delete(API_ENDPOINTS.SAVED_FILTERS.BY_ID(filterToDelete.id));
        }
        
        // Refresh die Filter-Liste
        refreshFilters();
      }
    } catch (error) {
      console.error('Fehler beim Bereinigen der Client-Filter:', error);
    }
  };

  // Recent Clients laden (mit useCallback für stabilen Event-Listener)
  const loadRecentClients = useCallback(async () => {
    if (tableId === 'consultations-table') {
      try {
        console.log('🔄 SavedFilterTags: Loading recent clients...');
        const response = await axiosInstance.get(API_ENDPOINTS.CLIENTS.RECENT);
        // Verwende die Reihenfolge der API-Antwort direkt (Backend sortiert bereits richtig)
        const clientNames = response.data.map((client: any) => client.name);
        console.log('📋 SavedFilterTags: Recent client names:', clientNames);
        setRecentClientNames(clientNames);
        
        // Auto-Bereinigung: Lösche überschüssige Recent Client Filter (LRU-basiert)
        await cleanupExcessiveClientFilters(clientNames);
      } catch (error) {
        console.error('❌ SavedFilterTags: Error loading recent clients:', error);
        // Stille Behandlung - normale Situation wenn noch keine Clients beraten wurden
      }
    }
  }, [tableId]);

  // Event-Listener für Consultation-Änderungen (z.B. neue Beratung gestartet)
  useEffect(() => {
    const handleConsultationChanged = () => {
      console.log('🔔 SavedFilterTags: Received consultationChanged event');
      loadRecentClients();
    };

    window.addEventListener('consultationChanged', handleConsultationChanged);
    
    return () => {
      window.removeEventListener('consultationChanged', handleConsultationChanged);
    };
  }, [loadRecentClients]);

  // Lade Recent Clients für Consultation-Tabelle beim ersten Render
  useEffect(() => {
    loadRecentClients();
  }, [loadRecentClients]);

  // Lade gespeicherte Filter beim ersten Render
  useEffect(() => {
    const fetchSavedFilters = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('Nicht authentifiziert');
          return;
        }
        
        const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId));
        setSavedFilters(response.data);

        // Nur Default-Filter anwenden wenn es eine uncontrolled component ist (legacy)
        if (!onFilterChange && defaultFilterName && !activeFilterName) {
          const defaultFilter = response.data.find((filter: SavedFilter) => filter.name === defaultFilterName);
          if (defaultFilter) {
            onSelectFilter(defaultFilter.conditions, defaultFilter.operators);
          }
        }
      } catch (err) {
        console.error('Fehler beim Laden der gespeicherten Filter:', err);
        setError('Fehler beim Laden der gespeicherten Filter');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSavedFilters();
  }, [tableId]);

  // Refresh Filter-Liste (für external updates)
  const refreshFilters = async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId));
      setSavedFilters(response.data);
    } catch (error) {
      console.error('Fehler beim Neuladen der Filter:', error);
    }
  };

  // Expose refresh function für Parent-Komponenten
  useEffect(() => {
    // Erstelle eine globale Referenz für externe Updates
    (window as any).refreshSavedFilters = refreshFilters;
    return () => {
      delete (window as any).refreshSavedFilters;
    };
  }, []);

  // Dropdown schließen bei Klick außerhalb
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDropdownOpen && !(event.target as Element).closest('.relative')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);
  
  // Wähle einen gespeicherten Filter aus
  const handleSelectFilter = (filter: SavedFilter) => {
    if (onFilterChange) {
      // Controlled component
      onFilterChange(filter.name, filter.id, filter.conditions, filter.operators);
    } else {
      // Backward compatibility - uncontrolled component
      onSelectFilter(filter.conditions, filter.operators);
    }
  };
  
  // Lösche einen gespeicherten Filter
  const handleDeleteFilter = async (e: React.MouseEvent, filterId: number) => {
    e.stopPropagation();
    
    const filterToDelete = savedFilters.find(filter => filter.id === filterId);
    if (filterToDelete && isStandardFilter(filterToDelete.name)) {
      toast.error('Standard-Filter können nicht gelöscht werden');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Nicht authentifiziert');
        return;
      }
      
      await axiosInstance.delete(API_ENDPOINTS.SAVED_FILTERS.BY_ID(filterId));
      
      setSavedFilters(savedFilters.filter(filter => filter.id !== filterId));
      
      // Wenn der aktuell ausgewählte Filter gelöscht wurde
      if (selectedFilterId === filterId || (!onFilterChange && filterId)) {
        if (onFilterChange) {
          // Controlled: Parent entscheidet was passiert
          onFilterChange('', null, [], []);
        } else {
          // Uncontrolled: Reset
          onReset();
        }
      }
      
      toast.success('Filter erfolgreich gelöscht');
    } catch (err) {
      console.error('Fehler beim Löschen des Filters:', err);
      toast.error('Fehler beim Löschen des Filters');
    }
  };
  
  // Prüfen, ob ein Filter ein Standard-Filter ist
  const isStandardFilter = (filterName: string) => {
    const baseStandardFilters = ['Archiv', 'Aktuell', 'Aktive', 'Alle', 'Heute', 'Diese Woche'];
    
    if (baseStandardFilters.includes(filterName)) {
      return true;
    }
    
    if (tableId === 'consultations-table') {
      if (filterName === 'Archiv' || filterName === 'Heute' || filterName === 'Diese Woche') {
        return true;
      }
      if (recentClientNames.includes(filterName)) {
        return true;
      }
    }
    
    return false;
  };

  // Sortiere Filter nach gewünschter Reihenfolge
  const sortedFilters = useMemo(() => {
    if (tableId !== 'consultations-table') {
      return savedFilters;
    }

    console.log('🔧 SavedFilterTags: Sorting filters...');
    console.log('📋 SavedFilterTags: recentClientNames:', recentClientNames);
    console.log('🗂️ SavedFilterTags: savedFilters:', savedFilters.map(f => f.name));

    const heute = savedFilters.find(f => f.name === 'Heute');
    const dieseWoche = savedFilters.find(f => f.name === 'Diese Woche');
    const archiv = savedFilters.find(f => f.name === 'Archiv');
    
    // Recent Client Filter in der exakten Reihenfolge der Recent Clients API sortieren
    const sortedRecentClientFilters = recentClientNames
      .map(clientName => savedFilters.find(f => f.name === clientName))
      .filter(filter => filter !== undefined) as SavedFilter[];
    
    console.log('✅ SavedFilterTags: sortedRecentClientFilters:', sortedRecentClientFilters.map(f => f.name));
    
    const customFilters = savedFilters.filter(f => 
      !['Heute', 'Diese Woche', 'Archiv'].includes(f.name) && 
      !recentClientNames.includes(f.name)
    );
    
    console.log('🔧 SavedFilterTags: customFilters:', customFilters.map(f => f.name));

    const orderedFilters: SavedFilter[] = [];
    
    if (heute) orderedFilters.push(heute);
    if (dieseWoche) orderedFilters.push(dieseWoche);
    orderedFilters.push(...sortedRecentClientFilters);
    orderedFilters.push(...customFilters);
    if (archiv) orderedFilters.push(archiv);
    
    console.log('🎯 SavedFilterTags: Final filter order:', orderedFilters.map(f => f.name));
    
    return orderedFilters;
  }, [savedFilters, recentClientNames, tableId]);

  // Optimistische Filter-Anzeige für bessere UX (MOVED BEFORE EARLY RETURNS)
  const showOptimisticFilters = savedFilters.length === 0 && loading;
  const optimisticFilters = useMemo(() => {
    if (!showOptimisticFilters) return [];
    return Array(3).fill(null).map((_, i) => ({
      id: `placeholder-${i}`,
      name: i === 0 ? 'Heute' : i === 1 ? 'Diese Woche' : '████████',
      isPlaceholder: true,
      tableId,
      conditions: [],
      operators: []
    }));
  }, [showOptimisticFilters, tableId]);

  const displayFilters = showOptimisticFilters ? optimisticFilters : sortedFilters;
  const currentVisibleCount = showOptimisticFilters ? optimisticFilters.length : visibleTagCount;

  // Optimierte Tag-Breiten-Berechnung mit useMemo
  const averageTagWidth = useMemo(() => {
    if (sortedFilters.length === 0) return 75; // Mittelwert zwischen 70 und 80
    
    return sortedFilters.reduce((sum, filter) => {
      // Ausgewogene Schätzung: ~6.5px pro Zeichen + 28px Padding + optional Delete-Button
      const deleteButtonWidth = !isStandardFilter(filter.name) ? 18 : 0;
      return sum + (filter.name.length * 6.5 + 28 + deleteButtonWidth);
    }, 0) / sortedFilters.length;
  }, [sortedFilters]);

  // Optimierte Sichtbarkeits-Berechnung mit useCallback
  const calculateVisibleTags = useCallback(() => {
    if (!containerRef.current || sortedFilters.length === 0) return;

    const container = containerRef.current;
    const currentWidth = container.clientWidth;
    
    // Nur neu berechnen wenn sich die Breite signifikant geändert hat (>= 45px)
    if (Math.abs(currentWidth - containerWidth) < 45) return;
    
    setContainerWidth(currentWidth);
    
    // Ausgewogene UI-Element-Breiten für sichere aber effiziente Tag-Anzeige
    const DROPDOWN_BUTTON_WIDTH = 70; // Mittelwert zwischen 60 und 80
    const GAPS_AND_MARGINS = 14; // Mittelwert zwischen 12 und 16
    const BUFFER = 15; // Mittelwert zwischen 10 und 20
    
    const availableWidth = currentWidth - GAPS_AND_MARGINS - BUFFER;
    
    // Berechne maximal mögliche Tags ohne Dropdown
    const maxPossibleTags = Math.max(1, Math.floor(availableWidth / averageTagWidth));
    
    if (maxPossibleTags >= sortedFilters.length) {
      // Alle Tags passen rein - zeige alle
      setVisibleTagCount(sortedFilters.length);
    } else {
      // Reserviere angemessenen Platz für Dropdown, moderate Tag-Anzeige
      const availableWithDropdown = availableWidth - DROPDOWN_BUTTON_WIDTH;
      const tagsWithDropdown = Math.max(1, Math.floor(availableWithDropdown / averageTagWidth));
      
      // Moderate Strategie: Zeige berechnete Anzahl ohne zusätzliche Risiken
      setVisibleTagCount(Math.min(tagsWithDropdown, sortedFilters.length - 1));
    }
  }, [sortedFilters, averageTagWidth, containerWidth, isStandardFilter]);

  // Debounced ResizeObserver für bessere Performance
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      calculateVisibleTags();
    }, 100); // 100ms Debounce für Filter-Tags (schneller als Client-Tags)
  }, [calculateVisibleTags]);

  // Optimierter ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);
    
    // Auch Window-Resize überwachen für bessere Abdeckung
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [handleResize]);

  // Initial calculation nach Filter-Änderungen
  useLayoutEffect(() => {
    calculateVisibleTags();
  }, [calculateVisibleTags]);

  // Bestimme welcher Filter aktiv ist
  const getActiveFilterId = () => {
    if (onFilterChange) {
      // Controlled component - verwende selectedFilterId prop
      return selectedFilterId;
    } else {
      // Uncontrolled - fallback auf internen State (legacy)
      return null; // In legacy mode nicht visuell hervorheben
    }
  };
  
  if (loading) {
    return <div className="flex justify-center items-center py-2">Lade Filter...</div>;
  }
  
  if (error) {
    return <div className="text-red-500 py-2">{error}</div>;
  }
  
  if (savedFilters.length === 0) {
    return null;
  }
  
  return (
    <div ref={containerRef} className="flex items-center gap-2 mb-3 mt-1">
      {/* Dynamische Anzahl Filter inline anzeigen mit optimistischer Anzeige */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {displayFilters.slice(0, currentVisibleCount).map(filter => (
          <div
            key={filter.id}
            onClick={() => !filter.isPlaceholder && handleSelectFilter(filter)}
            className={`flex items-center px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors flex-shrink-0 ${
              filter.isPlaceholder
                ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 animate-pulse cursor-default'
                : getActiveFilterId() === filter.id
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
            } ${!filter.isPlaceholder && isStandardFilter(filter.name) ? 'font-bold' : ''}`}
            title={filter.isPlaceholder ? 'Lädt...' : filter.name}
          >
            <span className="truncate max-w-[100px]">
              {filter.isPlaceholder && filter.name === '████████' ? (
                <span className="inline-block w-16 h-4 bg-gray-300 dark:bg-gray-500 rounded animate-pulse"></span>
              ) : (
                filter.name
              )}
            </span>
            {!filter.isPlaceholder && !isStandardFilter(filter.name) && (
              <button
                onClick={(e) => handleDeleteFilter(e, filter.id)}
                className="ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                title="Filter löschen"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        
        {/* Dropdown nur bei echten Filtern und Platzmangel */}
        {!showOptimisticFilters && sortedFilters.length > visibleTagCount && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600"
              title="Weitere Filter anzeigen"
            >
              <span>+{sortedFilters.length - visibleTagCount}</span>
              <ChevronDownIcon className={`h-4 w-4 ml-1 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Dropdown-Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[200px] max-w-[300px]">
                {sortedFilters.slice(visibleTagCount).map(filter => (
                  <div
                    key={filter.id}
                    onClick={() => {
                      handleSelectFilter(filter);
                      setIsDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors ${
                      getActiveFilterId() === filter.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } ${isStandardFilter(filter.name) ? 'font-bold' : ''}`}
                    title={filter.name}
                  >
                    <span className="truncate flex-1">{filter.name}</span>
                    {!isStandardFilter(filter.name) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFilter(e, filter.id);
                          setIsDropdownOpen(false);
                        }}
                        className="ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none flex-shrink-0"
                        title="Filter löschen"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedFilterTags; 