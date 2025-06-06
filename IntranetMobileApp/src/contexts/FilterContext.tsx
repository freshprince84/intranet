import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { savedFilterApi } from '../api/apiClient';
import { TaskStatus } from '../types';
import { useNetInfo } from '@react-native-community/netinfo';

// Interface für gespeicherte Filter
export interface SavedFilter {
  id: string;
  name: string;
  status: TaskStatus[];
  excludedStatus?: TaskStatus[];
  searchTerm: string;
  dateRange?: {
    from: string | null;
    to: string | null;
  };
}

// Context Interface
interface FilterContextType {
  savedFilters: SavedFilter[];
  activeFilter: string | null;
  activeFilters: {
    status: TaskStatus[];
    excludedStatus?: TaskStatus[];
    searchTerm: string;
    dateRange?: {
      from: string | null;
      to: string | null;
    };
  };
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loadSavedFilters: () => Promise<void>;
  handleFilterSelect: (filterId: string) => void;
  resetFilters: () => void;
  saveFilter: (name: string, status: TaskStatus[], searchTerm: string) => Promise<boolean>;
  deleteFilter: (filterId: string) => Promise<boolean>;
  isLoading: boolean;
}

// Speicherkey für AsyncStorage
const SAVED_FILTERS_KEY = '@IntranetApp:savedFilters';

// Context erstellen
const FilterContext = createContext<FilterContextType | undefined>(undefined);

// Provider-Komponente
export const FilterProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<{
    status: TaskStatus[];
    excludedStatus?: TaskStatus[];
    searchTerm: string;
    dateRange?: {
      from: string | null;
      to: string | null;
    };
  }>({
    status: [],
    excludedStatus: [],
    searchTerm: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const netInfo = useNetInfo();
  
  // Lade gespeicherte Filter
  const loadSavedFilters = async () => {
    setIsLoading(true);
    try {
      // Versuche zuerst, Filter vom API zu laden
      if (netInfo.isConnected) {
        try {
          console.log('FilterContext: Lade Filter vom Backend');
          const backendFilters = await savedFilterApi.getByTable('worktracker-todos');
          console.log('FilterContext: Backend-Filter geladen:', backendFilters);
          
          if (backendFilters && backendFilters.length > 0) {
            // Konvertiere die Backend-Filter in das für die App benötigte Format
            const formattedFilters = backendFilters.map((filter: any) => {
              // Extrahiere Status-Bedingungen aus den Filter-Conditions
              const statusConditions = filter.conditions
                .filter((condition: any) => condition.column === 'status' && 
                  (condition.operator === 'equals' || condition.operator === 'notEquals'))
                .map((condition: any) => ({
                  value: condition.value as TaskStatus,
                  operator: condition.operator
                }));
                
              // Extrahiere Suchbegriff-Bedingungen
              const searchTermCondition = filter.conditions.find(
                (condition: any) => (condition.column === 'title' || condition.column === 'description') && 
                             condition.operator === 'contains'
              );

              // Extrahiere die Status-Werte anhand der Operatoren
              const statusValues = statusConditions
                .filter((condition: {operator: string}) => condition.operator === 'equals')
                .map((condition: {value: TaskStatus}) => condition.value);

              // Extrahiere die ausgeschlossenen Status-Werte
              const excludedStatusValues = statusConditions
                .filter((condition: {operator: string}) => condition.operator === 'notEquals')
                .map((condition: {value: TaskStatus}) => condition.value);
              
              return {
                id: filter.id.toString(),
                name: filter.name,
                status: statusValues,
                excludedStatus: excludedStatusValues,
                searchTerm: searchTermCondition ? (searchTermCondition.value as string) : ''
              };
            });
            
            console.log('FilterContext: Formatierte Filter:', formattedFilters);
            setSavedFilters(formattedFilters);
            
            // Aktiviere standardmäßig den "Aktuell"-Filter
            const aktuellFilter = formattedFilters.find(filter => filter.name === 'Aktuell');
            if (aktuellFilter) {
              console.log('FilterContext: Aktiviere Aktuell-Filter:', aktuellFilter);
              handleFilterSelect(aktuellFilter.id);
            } else if (!activeFilter) {
              // Fallback auf Alle-Filter, wenn Aktuell nicht existiert
              const alleFilter = formattedFilters.find(filter => filter.name === 'Alle');
              if (alleFilter) {
                handleFilterSelect(alleFilter.id);
              }
            }
            
            // Speichere die formatierten Filter auch im AsyncStorage für Offline-Zugriff
            await AsyncStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(formattedFilters));
            return;
          }
        } catch (apiError) {
          console.error('FilterContext: Fehler beim Laden der Filter vom Backend:', apiError);
          // Bei API-Fehler fallback auf AsyncStorage
        }
      }
      
      // Fallback: Lade Filter aus dem AsyncStorage
      const filtersJson = await AsyncStorage.getItem(SAVED_FILTERS_KEY);
      if (filtersJson) {
        const filters = JSON.parse(filtersJson);
        setSavedFilters(filters);
        
        // Aktiviere standardmäßig den "Aktuell"-Filter
        const aktuellFilter = filters.find((filter: SavedFilter) => filter.name === 'Aktuell');
        if (aktuellFilter) {
          handleFilterSelect(aktuellFilter.id);
        } else if (!activeFilter) {
          // Fallback auf Alle-Filter, wenn Aktuell nicht existiert
          const alleFilter = filters.find((filter: SavedFilter) => filter.name === 'Alle');
          if (alleFilter) {
            handleFilterSelect(alleFilter.id);
          }
        }
      }
    } catch (error) {
      console.error('FilterContext: Fehler beim Laden der gespeicherten Filter:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter auswählen
  const handleFilterSelect = (filterId: string) => {
    setActiveFilter(filterId);
    
    // Anwendung des Filters über die savedFilters-Liste
    const filter: SavedFilter | undefined = savedFilters.find((f: SavedFilter) => f.id === filterId);
    if (filter) {
      setActiveFilters({
        status: filter.status,
        excludedStatus: filter.excludedStatus || [],
        searchTerm: filter.searchTerm
      });
      
      // Aktualisiere die Suchleiste, wenn der Filter einen Suchbegriff enthält
      if (filter.searchTerm) {
        setSearchQuery(filter.searchTerm);
      }
    }
  };
  
  // Filter zurücksetzen
  const resetFilters = () => {
    setActiveFilter(null);
    setActiveFilters({
      status: [],
      excludedStatus: [],
      searchTerm: ''
    });
    setSearchQuery('');
  };
  
  // Neuen Filter speichern
  const saveFilter = async (name: string, status: TaskStatus[], searchTerm: string): Promise<boolean> => {
    try {
      if (!netInfo.isConnected) {
        console.error('FilterContext: Keine Internetverbindung. Filter kann nicht gespeichert werden.');
        return false;
      }
      
      // Erstelle Filter-Conditions aus den Filter-Eigenschaften
      const conditions = [];
      
      // Status-Bedingungen
      if (status && status.length > 0) {
        for (const statusValue of status) {
          conditions.push({
            column: 'status',
            operator: 'equals',
            value: statusValue
          });
        }
      }
      
      // Suchbegriff-Bedingung
      if (searchTerm) {
        conditions.push({
          column: 'title',
          operator: 'contains',
          value: searchTerm
        });
      }
      
      // Erstelle Filter-Operatoren (OR zwischen Status-Bedingungen)
      const operators = status && status.length > 1 
        ? Array(status.length - 1).fill('OR') 
        : [];
      
      // Erstelle Backend-Filter
      const backendFilter = {
        tableId: 'worktracker-todos',
        name: name,
        conditions: conditions,
        operators: operators
      };
      
      // Speichere Filter im Backend
      const savedFilter = await savedFilterApi.create(backendFilter);
      
      // Lade aktualisierte Filter
      await loadSavedFilters();
      
      return true;
    } catch (error) {
      console.error('FilterContext: Fehler beim Speichern des Filters:', error);
      return false;
    }
  };
  
  // Filter löschen
  const deleteFilter = async (filterId: string): Promise<boolean> => {
    try {
      if (!netInfo.isConnected) {
        console.error('FilterContext: Keine Internetverbindung. Filter kann nicht gelöscht werden.');
        return false;
      }
      
      // Lösche Filter im Backend
      await savedFilterApi.deleteFilter(parseInt(filterId));
      
      // Wenn der gelöschte Filter aktiv war, setze den Filter zurück
      if (activeFilter === filterId) {
        resetFilters();
      }
      
      // Lade aktualisierte Filter
      await loadSavedFilters();
      
      return true;
    } catch (error) {
      console.error('FilterContext: Fehler beim Löschen des Filters:', error);
      return false;
    }
  };
  
  // Lade Filter beim ersten Rendern
  useEffect(() => {
    loadSavedFilters();
  }, []);
  
  return (
    <FilterContext.Provider value={{
      savedFilters,
      activeFilter,
      activeFilters,
      searchQuery,
      setSearchQuery,
      loadSavedFilters,
      handleFilterSelect,
      resetFilters,
      saveFilter,
      deleteFilter,
      isLoading
    }}>
      {children}
    </FilterContext.Provider>
  );
};

// Custom Hook für einfachen Zugriff auf den Context
export const useFilter = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter muss innerhalb eines FilterProviders verwendet werden');
  }
  return context;
}; 