import React, { useState, useEffect, useMemo } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
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

  // Lade Recent Clients für Consultation-Tabelle
  useEffect(() => {
    const loadRecentClients = async () => {
      if (tableId === 'consultations-table') {
        try {
          const response = await axiosInstance.get('/api/clients/recent');
          const clientNames = response.data.map((client: any) => client.name);
          setRecentClientNames(clientNames);
        } catch (error) {
          // Stille Behandlung - normale Situation wenn noch keine Clients beraten wurden
        }
      }
    };

    loadRecentClients();
  }, [tableId]);

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

    const heute = savedFilters.find(f => f.name === 'Heute');
    const dieseWoche = savedFilters.find(f => f.name === 'Diese Woche');
    const archiv = savedFilters.find(f => f.name === 'Archiv');
    
    const recentClientFilters = savedFilters.filter(f => recentClientNames.includes(f.name));
    
    const customFilters = savedFilters.filter(f => 
      !['Heute', 'Diese Woche', 'Archiv'].includes(f.name) && 
      !recentClientNames.includes(f.name)
    );

    const orderedFilters: SavedFilter[] = [];
    
    if (heute) orderedFilters.push(heute);
    if (dieseWoche) orderedFilters.push(dieseWoche);
    orderedFilters.push(...recentClientFilters);
    orderedFilters.push(...customFilters);
    if (archiv) orderedFilters.push(archiv);
    
    return orderedFilters;
  }, [savedFilters, recentClientNames, tableId]);

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
    <div className="flex flex-wrap gap-2 mb-3 mt-1">
      {sortedFilters.map(filter => (
        <div
          key={filter.id}
          onClick={() => handleSelectFilter(filter)}
          className={`flex items-center px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors ${
            getActiveFilterId() === filter.id
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
          } ${isStandardFilter(filter.name) ? 'font-bold' : ''}`}
        >
          <span>{filter.name}</span>
          {!isStandardFilter(filter.name) && (
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
    </div>
  );
};

export default SavedFilterTags; 