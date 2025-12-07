import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { FilterCondition } from '../components/FilterRow.tsx';

interface SortDirection {
  column: string;
  direction: 'asc' | 'desc';
  priority: number;
  conditionIndex: number;
}

interface SavedFilter {
  id: number;
  name: string;
  tableId: string;
  conditions: FilterCondition[];
  operators: ('AND' | 'OR')[];
  groupId?: number | null;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface FilterGroup {
  id: number;
  name: string;
  tableId: string;
  order: number;
  filters: SavedFilter[];
  createdAt: string;
  updatedAt: string;
}

interface FilterContextType {
  // Filter-Listen pro tableId
  filters: Record<string, SavedFilter[]>;
  filterGroups: Record<string, FilterGroup[]>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  
  // Funktionen
  loadFilters: (tableId: string) => Promise<void>;
  refreshFilters: (tableId: string) => Promise<void>;
  getFilters: (tableId: string) => SavedFilter[];
  getFilterGroups: (tableId: string) => FilterGroup[];
  isLoading: (tableId: string) => boolean;
  getError: (tableId: string) => string | null;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const useFilterContext = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilterContext must be used within FilterProvider');
  }
  return context;
};

interface FilterProviderProps {
  children: React.ReactNode;
}

export const FilterProvider: React.FC<FilterProviderProps> = ({ children }) => {
  const [filters, setFilters] = useState<Record<string, SavedFilter[]>>({});
  const [filterGroups, setFilterGroups] = useState<Record<string, FilterGroup[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  
  // Cache für bereits geladene Filter (verhindert doppelte Ladung)
  const loadedTablesRef = useRef<Set<string>>(new Set());
  
  // ✅ MEMORY: TTL und Limits für Filter-Cache
  const FILTER_CACHE_TTL_MS = 60 * 60 * 1000; // 60 Minuten (erhöht von 10 auf 60 Minuten, damit Filter nicht verschwinden)
  const MAX_FILTERS_PER_TABLE = 50; // Max 50 Filter pro Tabelle
  const MAX_TABLES_IN_CACHE = 20; // Max 20 Tabellen im Cache
  
  // Cache-Timestamps für TTL
  const filterCacheTimestamps = useRef<Record<string, number>>({});
  
  // ✅ FIX: Refs für aktuelle Werte (verhindert Re-Creation von loadFilters)
  const filtersRef = useRef(filters);
  const loadingRef = useRef(loading);
  
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);
  
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
  
  // ✅ PERFORMANCE: Lade Filter für eine tableId
  const loadFilters = useCallback(async (tableId: string) => {
    // ✅ FIX: Prüfe nur auf Filter im State (Source of Truth)
    // loadedTablesRef wird nur während des Ladens verwendet
    if (filtersRef.current[tableId]) {
      return; // Filter bereits im State
    }
    
    // Wenn bereits am Laden, nicht nochmal starten
    if (loadingRef.current[tableId] || loadedTablesRef.current.has(tableId)) {
      return; // Wird bereits geladen
    }
    
    try {
      loadedTablesRef.current.add(tableId); // ✅ Setze Flag: Wird geladen
      setLoading(prev => ({ ...prev, [tableId]: true }));
      setErrors(prev => ({ ...prev, [tableId]: null }));
      
      const token = localStorage.getItem('token');
      if (!token) {
        setErrors(prev => ({ ...prev, [tableId]: 'Nicht authentifiziert' }));
        loadedTablesRef.current.delete(tableId); // ✅ Entferne Flag bei Fehler
        return;
      }
      
      // Lade Filter und Gruppen parallel
      const [filtersResponse, groupsResponse] = await Promise.all([
        axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)),
        axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.GROUPS.BY_TABLE(tableId))
      ]);
      
      const filtersData = Array.isArray(filtersResponse.data) 
        ? filtersResponse.data.filter(f => f != null) 
        : [];
      const groupsData = Array.isArray(groupsResponse.data) 
        ? groupsResponse.data.filter(g => g != null) 
        : [];
      
      setFilters(prev => ({ ...prev, [tableId]: filtersData }));
      setFilterGroups(prev => ({ ...prev, [tableId]: groupsData }));
      // ✅ MEMORY: Timestamp für TTL setzen
      filterCacheTimestamps.current[tableId] = Date.now();
      // ✅ WICHTIG: loadedTablesRef NICHT hier setzen (nur während Laden)
      // Filter im State sind Source of Truth
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      console.error(`[FilterContext] Fehler beim Laden der Filter für ${tableId}:`, error);
      }
      setErrors(prev => ({ ...prev, [tableId]: 'Fehler beim Laden der Filter' }));
    } finally {
      loadedTablesRef.current.delete(tableId); // ✅ Entferne Flag: Laden abgeschlossen
      setLoading(prev => ({ ...prev, [tableId]: false }));
    }
  }, []); // ✅ FIX: Keine Dependencies mehr - verwendet Refs
  
  // ✅ MEMORY: Cleanup-Funktion für alte Filter
  const cleanupOldFilters = useCallback(() => {
    const now = Date.now();
    const tablesToCleanup: string[] = [];
    
    // Finde Tabellen, deren TTL abgelaufen ist
    Object.entries(filterCacheTimestamps.current).forEach(([tableId, timestamp]) => {
      if (now - timestamp > FILTER_CACHE_TTL_MS) {
        tablesToCleanup.push(tableId);
      }
    });
    
    // Lösche alte Filter-Arrays
    if (tablesToCleanup.length > 0) {
      setFilters(prev => {
        const newFilters = { ...prev };
        tablesToCleanup.forEach(tableId => {
          delete newFilters[tableId];
          delete filterCacheTimestamps.current[tableId];
          // ✅ FIX: loadedTablesRef NICHT löschen (wird nur während Laden verwendet)
          // Wenn Filter gelöscht werden, wird loadedTablesRef automatisch beim nächsten loadFilters gesetzt
        });
        return newFilters;
      });
      
      setFilterGroups(prev => {
        const newFilterGroups = { ...prev };
        tablesToCleanup.forEach(tableId => {
          delete newFilterGroups[tableId];
        });
        return newFilterGroups;
      });
    }
    
    // Begrenze Anzahl Tabellen im Cache
    setFilters(prev => {
      const allTables = Object.keys(prev);
      if (allTables.length > MAX_TABLES_IN_CACHE) {
        // Lösche älteste Tabellen (nach Timestamp)
        const sortedTables = allTables
          .map(tableId => ({
            tableId,
            timestamp: filterCacheTimestamps.current[tableId] || 0
          }))
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(0, allTables.length - MAX_TABLES_IN_CACHE);
        
        const newFilters = { ...prev };
        sortedTables.forEach(({ tableId }) => {
          delete newFilters[tableId];
          delete filterCacheTimestamps.current[tableId];
          // ✅ FIX: loadedTablesRef NICHT löschen (wird nur während Laden verwendet)
          // Wenn Filter gelöscht werden, wird loadedTablesRef automatisch beim nächsten loadFilters gesetzt
        });
        
        setFilterGroups(prevGroups => {
          const newFilterGroups = { ...prevGroups };
          sortedTables.forEach(({ tableId }) => {
            delete newFilterGroups[tableId];
          });
          return newFilterGroups;
        });
        
        return newFilters;
      }
      return prev;
    });
    
    // Begrenze Anzahl Filter pro Tabelle
    setFilters(prev => {
      const newFilters = { ...prev };
      Object.entries(prev).forEach(([tableId, tableFilters]) => {
        if (tableFilters.length > MAX_FILTERS_PER_TABLE) {
          // Behalte nur die neuesten Filter (nach createdAt)
          const sortedFilters = [...tableFilters]
            .sort((a, b) => {
              const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return bTime - aTime; // Neueste zuerst
            })
            .slice(0, MAX_FILTERS_PER_TABLE);
          
          newFilters[tableId] = sortedFilters;
        }
      });
      return newFilters;
    });
  }, []);
  
  // ✅ MEMORY: Cleanup-Timer für alte Filter
  useEffect(() => {
    // Cleanup alle 5 Minuten
    const cleanupInterval = setInterval(() => {
      cleanupOldFilters();
    }, 5 * 60 * 1000); // 5 Minuten
    
    return () => {
      clearInterval(cleanupInterval);
    };
  }, [cleanupOldFilters]);
  
  // ✅ PERFORMANCE: Aktualisiere Filter für eine tableId (z.B. nach Create/Update/Delete)
  const refreshFilters = useCallback(async (tableId: string) => {
    try {
      setLoading(prev => ({ ...prev, [tableId]: true }));
      setErrors(prev => ({ ...prev, [tableId]: null }));
      
      const token = localStorage.getItem('token');
      if (!token) {
        setErrors(prev => ({ ...prev, [tableId]: 'Nicht authentifiziert' }));
        return;
      }
      
      // Lade Filter und Gruppen parallel
      const [filtersResponse, groupsResponse] = await Promise.all([
        axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)),
        axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.GROUPS.BY_TABLE(tableId))
      ]);
      
      const filtersData = Array.isArray(filtersResponse.data) 
        ? filtersResponse.data.filter(f => f != null) 
        : [];
      const groupsData = Array.isArray(groupsResponse.data) 
        ? groupsResponse.data.filter(g => g != null) 
        : [];
      
      setFilters(prev => ({ ...prev, [tableId]: filtersData }));
      setFilterGroups(prev => ({ ...prev, [tableId]: groupsData }));
      // ✅ MEMORY: Timestamp für TTL aktualisieren
      filterCacheTimestamps.current[tableId] = Date.now();
      // ✅ Cache zurücksetzen, damit Filter neu geladen werden können
      loadedTablesRef.current.delete(tableId);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      console.error(`[FilterContext] Fehler beim Aktualisieren der Filter für ${tableId}:`, error);
      }
      setErrors(prev => ({ ...prev, [tableId]: 'Fehler beim Aktualisieren der Filter' }));
    } finally {
      setLoading(prev => ({ ...prev, [tableId]: false }));
    }
  }, []);
  
  // Helper-Funktionen
  const getFilters = useCallback((tableId: string): SavedFilter[] => {
    // ✅ FIX: Vereinfacht - filters[tableId] ist Source of Truth
    // loadedTablesRef wird nur während Laden verwendet, nicht als Cache
    return filters[tableId] || [];
  }, [filters]);
  
  const getFilterGroups = useCallback((tableId: string): FilterGroup[] => {
    return filterGroups[tableId] || [];
  }, [filterGroups]);
  
  const isLoading = useCallback((tableId: string): boolean => {
    return loading[tableId] || false;
  }, [loading]);
  
  const getError = useCallback((tableId: string): string | null => {
    return errors[tableId] || null;
  }, [errors]);
  
  // ✅ FIX: value mit useMemo stabilisieren (verhindert Re-Creation bei jedem Render)
  const value = useMemo<FilterContextType>(() => ({
    filters,
    filterGroups,
    loading,
    errors,
    loadFilters,
    refreshFilters,
    getFilters,
    getFilterGroups,
    isLoading,
    getError
  }), [filters, filterGroups, loading, errors, loadFilters, refreshFilters, getFilters, getFilterGroups, isLoading, getError]);
  
  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};

