import React, { useState, useEffect, useMemo, useRef, useLayoutEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, ChevronDownIcon, PencilIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';
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
  const { t } = useTranslation();
  
  // Übersetze Filter-Namen beim Anzeigen
  const translateFilterName = (name: string): string => {
    // Standard-Filter übersetzen (auch wenn als Übersetzungsschlüssel gespeichert)
    if (name === 'Archiv' || name === 'tasks.filters.archive' || name === 'requests.filters.archiv') {
      return tableId === 'worktracker-todos' ? t('tasks.filters.archive') : t('requests.filters.archiv');
    }
    if (name === 'Aktuell' || name === 'tasks.filters.current' || name === 'requests.filters.aktuell') {
      return tableId === 'worktracker-todos' ? t('tasks.filters.current') : t('requests.filters.aktuell');
    }
    if (name === 'Heute') return t('common.today', 'Heute');
    if (name === 'Woche') return t('common.week', 'Woche');
    if (name === 'Aktive') return t('common.active', 'Aktive');
    if (name === 'Alle') return t('common.all', 'Alle');
    // Für alle anderen Namen, gib sie unverändert zurück (z.B. Client-Namen)
    return name;
  };
  
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([]);
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
  
  // Drag & Drop States
  const [draggedFilterId, setDraggedFilterId] = useState<number | null>(null);
  const [dragOverFilterId, setDragOverFilterId] = useState<number | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<number | 'new-group' | null>(null);
  
  // Gruppen-Dropdown States (pro Gruppe)
  const [openGroupDropdowns, setOpenGroupDropdowns] = useState<Set<number>>(new Set());
  
  // Gruppen-Umbenennung States
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string>('');

  // Refresh Filter-Liste und Gruppen (für external updates) - MUSS vor cleanupExcessiveClientFilters sein!
  const refreshFilters = useCallback(async () => {
    try {
      const [filtersResponse, groupsResponse] = await Promise.all([
        axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)),
        axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.GROUPS.BY_TABLE(tableId))
      ]);
      
      const filters = Array.isArray(filtersResponse.data) ? filtersResponse.data.filter(f => f != null) : [];
      const groups = Array.isArray(groupsResponse.data) ? groupsResponse.data.filter(g => g != null) : [];
      
      setSavedFilters(filters);
      setFilterGroups(groups);
    } catch (error) {
      console.error('Fehler beim Neuladen der Filter:', error);
    }
  }, [tableId]);

  // Bereinigungsfunktion für überschüssige Client-Filter
  const cleanupExcessiveClientFilters = useCallback(async (currentClientNames: string[]) => {
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
        await refreshFilters();
      }
    } catch (error) {
      console.error('Fehler beim Bereinigen der Client-Filter:', error);
    }
  }, [tableId, refreshFilters]);

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
  }, [tableId, cleanupExcessiveClientFilters]);

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

  // Lade gespeicherte Filter und Gruppen beim ersten Render
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('Nicht authentifiziert');
          return;
        }
        
        // Lade Filter und Gruppen parallel
        const [filtersResponse, groupsResponse] = await Promise.all([
          axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)),
          axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.GROUPS.BY_TABLE(tableId))
        ]);
        
        // Sicherstellen, dass response.data ein Array ist
        const filters = Array.isArray(filtersResponse.data) ? filtersResponse.data.filter(f => f != null) : [];
        const groups = Array.isArray(groupsResponse.data) ? groupsResponse.data.filter(g => g != null) : [];
        
        setSavedFilters(filters);
        setFilterGroups(groups);

        // Nur Default-Filter anwenden wenn es eine uncontrolled component ist (legacy)
        if (!onFilterChange && defaultFilterName && !activeFilterName) {
          const defaultFilter = filters.find((filter: SavedFilter) => filter != null && filter.name === defaultFilterName);
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
    
    fetchData();
  }, [tableId]);

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
      toast.error(t('filter.cannotDeleteStandard'));
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
    // Erkenne auch Übersetzungsschlüssel
    const standardFilterNames = [
      'Archiv', 'Aktuell', 'Aktive', 'Alle', 'Heute', 'Woche',
      'tasks.filters.archive', 'tasks.filters.current',
      'requests.filters.archiv', 'requests.filters.aktuell'
    ];
    
    if (standardFilterNames.includes(filterName)) {
      return true;
    }
    
    if (tableId === 'consultations-table') {
      if (filterName === 'Archiv' || filterName === 'Heute' || filterName === 'Woche') {
        return true;
      }
      if (recentClientNames.includes(filterName)) {
        return true;
      }
    }
    
    return false;
  };

  // Sortiere Filter nach gewünschter Reihenfolge (nur nicht-gruppierte Filter)
  const sortedFilters = useMemo(() => {
    // Filtere nur nicht-gruppierte Filter heraus
    const ungroupedFilters = savedFilters.filter(f => f != null && !f.groupId);
    
    // Sortierung für Consultations
    if (tableId === 'consultations-table') {
      console.log('🔧 SavedFilterTags: Sorting filters...');
      console.log('📋 SavedFilterTags: recentClientNames:', recentClientNames);
      console.log('🗂️ SavedFilterTags: savedFilters:', ungroupedFilters.map(f => f.name));

      const heute = ungroupedFilters.find(f => f != null && f.name === 'Heute');
      const woche = ungroupedFilters.find(f => f != null && f.name === 'Woche');
      const archiv = ungroupedFilters.find(f => f != null && f.name === 'Archiv');
      
      // Recent Client Filter in der exakten Reihenfolge der Recent Clients API sortieren
      const sortedRecentClientFilters = recentClientNames
        .map(clientName => ungroupedFilters.find(f => f != null && f.name === clientName))
        .filter(filter => filter != null) as SavedFilter[];
      
      console.log('✅ SavedFilterTags: sortedRecentClientFilters:', sortedRecentClientFilters.map(f => f.name));
      
      const customFilters = ungroupedFilters.filter(f => 
        f != null && 
        !['Heute', 'Woche', 'Archiv'].includes(f.name) && 
        !recentClientNames.includes(f.name)
      );
      
      console.log('🔧 SavedFilterTags: customFilters:', customFilters.map(f => f.name));

      const orderedFilters: SavedFilter[] = [];
      
      if (heute) orderedFilters.push(heute);
      if (woche) orderedFilters.push(woche);
      orderedFilters.push(...sortedRecentClientFilters);
      orderedFilters.push(...customFilters);
      if (archiv) orderedFilters.push(archiv);
      
      console.log('🎯 SavedFilterTags: Final filter order:', orderedFilters.map(f => f.name));
      
      return orderedFilters;
    }

    // Sortierung für Requests/Tasks - Aktuell zuerst, dann Archiv
    if (tableId === 'requests-table' || tableId === 'worktracker-todos') {
      const aktuell = ungroupedFilters.find(f => f != null && f.name === 'Aktuell');
      const archiv = ungroupedFilters.find(f => f != null && f.name === 'Archiv');
      
      // Rest der Filter (außer Aktuell und Archiv)
      const customFilters = ungroupedFilters.filter(f => 
        f != null && f.name !== 'Aktuell' && f.name !== 'Archiv'
      );
      
      const orderedFilters: SavedFilter[] = [];
      
      // Aktuell immer zuerst
      if (aktuell) orderedFilters.push(aktuell);
      // Dann custom Filters
      orderedFilters.push(...customFilters);
      // Archiv immer zuletzt
      if (archiv) orderedFilters.push(archiv);
      
      return orderedFilters;
    }

    // Für alle anderen Tabellen: Keine Sortierung
    return ungroupedFilters;
  }, [savedFilters, recentClientNames, tableId]);

  // Optimistische Filter-Anzeige für bessere UX (MOVED BEFORE EARLY RETURNS)
  const showOptimisticFilters = savedFilters.length === 0 && loading;
  
  const optimisticFilters = useMemo(() => {
    if (!showOptimisticFilters) return [];
    return Array(3).fill(null).map((_, i) => ({
      id: `placeholder-${i}`,
      name: i === 0 ? 'Heute' : i === 1 ? 'Woche' : '████████',
      isPlaceholder: true,
      tableId,
      conditions: [],
      operators: []
    }));
  }, [showOptimisticFilters, tableId]);

  const displayFilters = showOptimisticFilters ? optimisticFilters : sortedFilters.filter(f => f != null);
  const currentVisibleCount = showOptimisticFilters ? optimisticFilters.length : visibleTagCount;

  // Optimierte Tag-Breiten-Berechnung mit useMemo
  const averageTagWidth = useMemo(() => {
    if (sortedFilters.length === 0) return 75; // Mittelwert zwischen 70 und 80
    
    return sortedFilters
      .filter(filter => filter != null)
      .reduce((sum, filter) => {
        // Ausgewogene Schätzung: ~6.5px pro Zeichen + 28px Padding + optional Delete-Button
        const deleteButtonWidth = !isStandardFilter(filter.name) ? 18 : 0;
        return sum + (filter.name.length * 6.5 + 28 + deleteButtonWidth);
      }, 0) / sortedFilters.filter(filter => filter != null).length;
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

  // Sortiere Gruppen nach order (MUSS vor frühen Returns sein!)
  const sortedGroups = useMemo(() => {
    return [...filterGroups].sort((a, b) => a.order - b.order);
  }, [filterGroups]);

  // Drag & Drop Handler
  const handleDragStart = (e: React.DragEvent, filterId: number) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedFilterId(filterId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: number | 'new-group', type: 'filter' | 'group') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (type === 'filter') {
      setDragOverFilterId(targetId as number);
    } else {
      setDragOverGroupId(targetId);
    }
  };

  const handleDragEnd = () => {
    setDraggedFilterId(null);
    setDragOverFilterId(null);
    setDragOverGroupId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: number | 'new-group', type: 'filter' | 'group') => {
    e.preventDefault();
    
    if (!draggedFilterId) return;
    
    // Verhindere, dass ein Filter auf sich selbst gezogen wird
    if (type === 'filter' && draggedFilterId === targetId) {
      handleDragEnd();
      return;
    }
    
    try {
      if (type === 'group') {
        // Filter auf Gruppe gezogen -> Zu Gruppe hinzufügen
        await axiosInstance.post(API_ENDPOINTS.SAVED_FILTERS.GROUPS.ADD_FILTER(draggedFilterId, targetId as number));
        toast.success('Filter zur Gruppe hinzugefügt');
      } else {
        // Filter auf Filter gezogen -> Zu bestehender Gruppe hinzufügen oder neue erstellen
        const targetFilter = savedFilters.find(f => f.id === targetId as number);
        if (!targetFilter) {
          handleDragEnd();
          return;
        }
        
        if (targetFilter.groupId) {
          // Füge zu bestehender Gruppe hinzu
          await axiosInstance.post(API_ENDPOINTS.SAVED_FILTERS.GROUPS.ADD_FILTER(draggedFilterId, targetFilter.groupId));
          toast.success('Filter zur Gruppe hinzugefügt');
        } else {
          // Erstelle neue Gruppe mit beiden Filtern
          const groupName = `Gruppe ${filterGroups.length + 1}`;
          const groupResponse = await axiosInstance.post(API_ENDPOINTS.SAVED_FILTERS.GROUPS.CREATE, {
            tableId,
            name: groupName
          });
          
          const newGroup = groupResponse.data;
          
          await Promise.all([
            axiosInstance.post(API_ENDPOINTS.SAVED_FILTERS.GROUPS.ADD_FILTER(draggedFilterId, newGroup.id)),
            axiosInstance.post(API_ENDPOINTS.SAVED_FILTERS.GROUPS.ADD_FILTER(targetFilter.id, newGroup.id))
          ]);
          
          toast.success('Gruppe erstellt');
        }
      }
      
      // Refresh Filter-Liste
      await refreshFilters();
    } catch (err) {
      console.error('Fehler beim Gruppieren der Filter:', err);
      toast.error('Fehler beim Gruppieren der Filter');
    } finally {
      handleDragEnd();
    }
  };

  // Gruppen-Management
  const toggleGroupDropdown = (groupId: number) => {
    setOpenGroupDropdowns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleUngroupFilters = async (groupId: number) => {
    try {
      await axiosInstance.delete(API_ENDPOINTS.SAVED_FILTERS.GROUPS.DELETE(groupId));
      toast.success('Gruppe aufgelöst');
      await refreshFilters();
      setOpenGroupDropdowns(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    } catch (err) {
      console.error('Fehler beim Auflösen der Gruppe:', err);
      toast.error('Fehler beim Auflösen der Gruppe');
    }
  };

  const handleStartEditGroup = (group: FilterGroup) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  };

  const handleCancelEditGroup = () => {
    setEditingGroupId(null);
    setEditingGroupName('');
  };

  const handleSaveGroupName = async (groupId: number) => {
    if (!editingGroupName.trim()) {
      toast.error('Gruppenname darf nicht leer sein');
      return;
    }

    try {
      await axiosInstance.put(API_ENDPOINTS.SAVED_FILTERS.GROUPS.UPDATE(groupId), {
        name: editingGroupName.trim()
      });
      toast.success('Gruppe umbenannt');
      await refreshFilters();
      setEditingGroupId(null);
      setEditingGroupName('');
    } catch (err: any) {
      console.error('Fehler beim Umbenennen der Gruppe:', err);
      const errorMessage = err.response?.data?.message || 'Fehler beim Umbenennen der Gruppe';
      toast.error(errorMessage);
    }
  };

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
    return <div className="flex justify-center items-center py-2">{t('common.loadingFilters')}</div>;
  }
  
  if (error) {
    return <div className="text-red-500 py-2">{error}</div>;
  }
  
  if (savedFilters.length === 0 && filterGroups.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className="flex items-center gap-2 mb-3 mt-1">
      {/* Dynamische Anzahl Filter inline anzeigen mit optimistischer Anzeige */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Gruppen-Dropdowns */}
        {sortedGroups.map(group => {
          // Prüfe, ob ein Filter aus dieser Gruppe aktiv ist
          const activeFilterInGroup = group.filters.find(f => getActiveFilterId() === f.id);
          const displayName = activeFilterInGroup 
            ? translateFilterName(activeFilterInGroup.name)
            : `${group.name} (${group.filters.length})`;
          
          return (
          <div key={group.id} className="relative flex-shrink-0">
            <button
              onClick={() => toggleGroupDropdown(group.id)}
              onDragOver={(e) => handleDragOver(e, group.id, 'group')}
              onDrop={(e) => handleDrop(e, group.id, 'group')}
              className={`flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors ${
                dragOverGroupId === group.id ? 'ring-2 ring-purple-500' : ''
              } ${activeFilterInGroup ? 'ring-2 ring-purple-500' : ''}`}
              title={activeFilterInGroup ? displayName : `${group.name} (${group.filters.length})`}
            >
              <span className="truncate max-w-[100px]">
                {displayName}
              </span>
              <ChevronDownIcon className={`h-4 w-4 ml-1 transition-transform ${openGroupDropdowns.has(group.id) ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Gruppen-Dropdown */}
            {openGroupDropdowns.has(group.id) && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[200px]">
                {group.filters.map(filter => (
                  <div
                    key={filter.id}
                    onClick={() => {
                      handleSelectFilter(filter);
                      toggleGroupDropdown(group.id);
                    }}
                    className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors ${
                      getActiveFilterId() === filter.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } ${isStandardFilter(filter.name) ? 'font-bold' : ''}`}
                    title={translateFilterName(filter.name)}
                  >
                    <span className="truncate flex-1">{translateFilterName(filter.name)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
                  {editingGroupId === group.id ? (
                    <div className="px-3 py-2">
                      <input
                        type="text"
                        value={editingGroupName}
                        onChange={(e) => setEditingGroupName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveGroupName(group.id);
                          } else if (e.key === 'Escape') {
                            handleCancelEditGroup();
                          }
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex gap-2 mt-2 justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveGroupName(group.id);
                          }}
                          className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          title="Speichern"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEditGroup();
                          }}
                          className="p-2 rounded-md bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                          title="Abbrechen"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditGroup(group);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left transition-colors"
                        title="Gruppe umbenennen"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUngroupFilters(group.id);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left transition-colors"
                        title={t('filter.ungroup')}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          );
        })}
        
        {/* Einzelne Filter-Tags */}
        {displayFilters.slice(0, currentVisibleCount).map(filter => (
          <div
            key={filter.id}
            draggable={true}
            onDragStart={(e) => handleDragStart(e, filter.id)}
            onDragOver={(e) => handleDragOver(e, filter.id, 'filter')}
            onDrop={(e) => handleDrop(e, filter.id, 'filter')}
            onDragEnd={handleDragEnd}
            onClick={() => !filter.isPlaceholder && handleSelectFilter(filter)}
            className={`flex items-center px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors flex-shrink-0 ${
              filter.isPlaceholder
                ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 animate-pulse cursor-default'
                : draggedFilterId === filter.id
                  ? 'opacity-50'
                  : dragOverFilterId === filter.id
                    ? 'ring-2 ring-blue-500'
                    : getActiveFilterId() === filter.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
            } ${!filter.isPlaceholder && isStandardFilter(filter.name) ? 'font-bold' : ''}`}
            title={filter.isPlaceholder ? t('common.loading') : translateFilterName(filter.name)}
          >
            <span className="truncate max-w-[100px]">
              {filter.isPlaceholder && filter.name === '████████' ? (
                <span className="inline-block w-16 h-4 bg-gray-300 dark:bg-gray-500 rounded animate-pulse"></span>
              ) : (
                translateFilterName(filter.name)
              )}
            </span>
            {!filter.isPlaceholder && !isStandardFilter(filter.name) && (
              <button
                onClick={(e) => handleDeleteFilter(e, filter.id)}
                className="ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                title={t('filter.delete')}
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
                    title={translateFilterName(filter.name)}
                  >
                    <span className="truncate flex-1">{translateFilterName(filter.name)}</span>
                    {!isStandardFilter(filter.name) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFilter(e, filter.id);
                          setIsDropdownOpen(false);
                        }}
                        className="ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none flex-shrink-0"
                        title={t('filter.delete')}
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