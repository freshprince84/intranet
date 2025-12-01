import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  sortDirections?: SortDirection[];
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
  
  // ✅ PERFORMANCE: Lade Filter für eine tableId
  const loadFilters = useCallback(async (tableId: string) => {
    // Wenn bereits geladen, nicht nochmal laden
    if (loadedTablesRef.current.has(tableId)) {
      return;
    }
    
    // Wenn bereits am Laden, nicht nochmal starten
    if (loading[tableId]) {
      return;
    }
    
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
      loadedTablesRef.current.add(tableId);
    } catch (error) {
      console.error(`[FilterContext] Fehler beim Laden der Filter für ${tableId}:`, error);
      setErrors(prev => ({ ...prev, [tableId]: 'Fehler beim Laden der Filter' }));
    } finally {
      setLoading(prev => ({ ...prev, [tableId]: false }));
    }
  }, [loading]);
  
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
    } catch (error) {
      console.error(`[FilterContext] Fehler beim Aktualisieren der Filter für ${tableId}:`, error);
      setErrors(prev => ({ ...prev, [tableId]: 'Fehler beim Aktualisieren der Filter' }));
    } finally {
      setLoading(prev => ({ ...prev, [tableId]: false }));
    }
  }, []);
  
  // Helper-Funktionen
  const getFilters = useCallback((tableId: string): SavedFilter[] => {
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
  
  const value: FilterContextType = {
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
  };
  
  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};

