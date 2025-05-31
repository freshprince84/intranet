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
  defaultFilterName?: string;
}

const SavedFilterTags: React.FC<SavedFilterTagsProps> = ({ 
  tableId, 
  onSelectFilter, 
  onReset,
  defaultFilterName = 'Aktuell'
}) => {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultFilterApplied, setDefaultFilterApplied] = useState(false);
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

        // Wende den Standard-Filter an, wenn vorhanden und noch nicht angewendet
        if (defaultFilterName && !defaultFilterApplied) {
          const defaultFilter = response.data.find((filter: SavedFilter) => filter.name === defaultFilterName);
          if (defaultFilter) {
            setSelectedFilterId(defaultFilter.id);
            onSelectFilter(defaultFilter.conditions, defaultFilter.operators);
            setDefaultFilterApplied(true);
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
  }, [tableId, defaultFilterName, onSelectFilter, defaultFilterApplied]);
  
  // Wähle einen gespeicherten Filter aus
  const handleSelectFilter = (filter: SavedFilter) => {
    setSelectedFilterId(filter.id);
    onSelectFilter(filter.conditions, filter.operators);
  };
  
  // Lösche einen gespeicherten Filter
  const handleDeleteFilter = async (e: React.MouseEvent, filterId: number) => {
    e.stopPropagation(); // Verhindere, dass der Filter ausgewählt wird
    
    // Prüfe, ob der zu löschende Filter einer der Standard-Filter ist
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
      
      // Entferne den gelöschten Filter aus dem State
      setSavedFilters(savedFilters.filter(filter => filter.id !== filterId));
      
      // Wenn der aktuell ausgewählte Filter gelöscht wurde, setze die Auswahl zurück
      if (selectedFilterId === filterId) {
        setSelectedFilterId(null);
        onReset();
      }
      
      toast.success('Filter erfolgreich gelöscht');
    } catch (err) {
      console.error('Fehler beim Löschen des Filters:', err);
      toast.error('Fehler beim Löschen des Filters');
    }
  };
  
  // Prüfen, ob ein Filter ein Standard-Filter ist
  const isStandardFilter = (filterName: string) => {
    // Basis Standard-Filter
    const baseStandardFilters = ['Archiv', 'Aktuell', 'Aktive', 'Alle', 'Heute', 'Diese Woche'];
    
    // Wenn es einer der Basis-Filter ist
    if (baseStandardFilters.includes(filterName)) {
      return true;
    }
    
    // Für Consultation-Tabelle: Recent Client-Namen sind auch Standard-Filter (nicht löschbar)
    if (tableId === 'consultations-table') {
      // Hauptfilter sind nicht löschbar
      if (filterName === 'Archiv' || filterName === 'Heute' || filterName === 'Diese Woche') {
        return true;
      }
      // Recent Client-Filter sind ebenfalls nicht löschbar
      if (recentClientNames.includes(filterName)) {
        return true;
      }
    }
    
    return false;
  };

  // Sortiere Filter nach gewünschter Reihenfolge
  const sortedFilters = useMemo(() => {
    if (tableId !== 'consultations-table') {
      return savedFilters; // Für andere Tabellen keine spezielle Sortierung
    }

    const heute = savedFilters.find(f => f.name === 'Heute');
    const dieseWoche = savedFilters.find(f => f.name === 'Diese Woche');
    const archiv = savedFilters.find(f => f.name === 'Archiv');
    
    // Recent Client-Filter (in der Reihenfolge wie sie vom Backend kommen)
    const recentClientFilters = savedFilters.filter(f => recentClientNames.includes(f.name));
    
    // Benutzerdefinierte Filter (alle anderen, außer den Standard-Filtern)
    const customFilters = savedFilters.filter(f => 
      !['Heute', 'Diese Woche', 'Archiv'].includes(f.name) && 
      !recentClientNames.includes(f.name)
    );

    // Zusammenfügen in gewünschter Reihenfolge
    const orderedFilters: SavedFilter[] = [];
    
    // 1. Heute
    if (heute) orderedFilters.push(heute);
    
    // 2. Diese Woche  
    if (dieseWoche) orderedFilters.push(dieseWoche);
    
    // 3. Recent Client-Filter
    orderedFilters.push(...recentClientFilters);
    
    // 4. Benutzerdefinierte Filter
    orderedFilters.push(...customFilters);
    
    // 5. Archiv (immer als letzter)
    if (archiv) orderedFilters.push(archiv);
    
    return orderedFilters;
  }, [savedFilters, recentClientNames, tableId]);
  
  if (loading) {
    return <div className="flex justify-center items-center py-2">Lade Filter...</div>;
  }
  
  if (error) {
    return <div className="text-red-500 py-2">{error}</div>;
  }
  
  if (savedFilters.length === 0) {
    return null; // Zeige nichts an, wenn keine Filter vorhanden sind
  }
  
  return (
    <div className="flex flex-wrap gap-2 mb-3 mt-1">
      {sortedFilters.map(filter => (
        <div
          key={filter.id}
          onClick={() => handleSelectFilter(filter)}
          className={`flex items-center px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors ${
            selectedFilterId === filter.id
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
          } ${isStandardFilter(filter.name) ? 'font-bold' : ''}`}
        >
          <span>{filter.name}</span>
          {/* Zeige den Lösch-Button nur für Filter an, die keine Standard-Filter sind */}
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