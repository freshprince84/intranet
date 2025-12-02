import React, { useState, useEffect, useMemo, useRef, useLayoutEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, ChevronDownIcon, PencilIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';
import { FilterCondition } from './FilterRow.tsx';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import useMessage from '../hooks/useMessage.ts';
import { useFilterContext } from '../contexts/FilterContext.tsx';

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

interface SavedFilterTagsProps {
  tableId: string;
  onSelectFilter: (conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: SortDirection[]) => void;
  onReset: () => void;
  activeFilterName?: string;
  selectedFilterId?: number | null;
  onFilterChange?: (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[], sortDirections?: SortDirection[]) => void;
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
  const { showMessage } = useMessage();
  const filterContext = useFilterContext();
  
  // Übersetze Filter-Namen beim Anzeigen
  const translateFilterName = (name: string): string => {
    // Standard-Filter übersetzen (auch wenn als Übersetzungsschlüssel gespeichert)
    if (name === 'Archiv' || name === 'tasks.filters.archive' || name === 'requests.filters.archiv') {
      return tableId === 'worktracker-todos' ? t('tasks.filters.archive') : t('requests.filters.archiv');
    }
    if (name === 'Aktuell' || name === 'tasks.filters.current' || name === 'requests.filters.aktuell') {
      return tableId === 'worktracker-todos' ? t('tasks.filters.current') : t('requests.filters.aktuell');
    }
    if (name === 'Heute' || name === 'Hoy') return t('common.today', 'Heute');
    if (name === 'Woche') return t('common.week', 'Woche');
    if (name === 'Aktive') return t('common.active', 'Aktive');
    if (name === 'Alle') return t('common.all', 'Alle');
    // Für alle anderen Namen, gib sie unverändert zurück (z.B. Client-Namen)
    return name;
  };
  
  // Übersetze Filtergruppen-Namen beim Anzeigen
  const translateGroupName = (groupName: string): string => {
    // Standard-Filtergruppen übersetzen
    if (groupName === 'Roles' || groupName === 'Rollen') {
      return t('filter.row.groups.roles', 'Rollen');
    }
    if (groupName === 'Users' || groupName === 'Benutzer' || groupName === 'Usuarios') {
      return t('filter.row.groups.users', 'Benutzer');
    }
    // Für alle anderen Gruppennamen, gib sie unverändert zurück
    return groupName;
  };
  
  // ✅ PERFORMANCE: Verwende Filter-Context statt lokaler State
  // Filter werden zentral geladen und für alle Komponenten bereitgestellt
  const savedFilters = filterContext.getFilters(tableId);
  const filterGroups = filterContext.getFilterGroups(tableId);
  const loading = filterContext.isLoading(tableId);
  const error = filterContext.getError(tableId);
  const [recentClientNames, setRecentClientNames] = useState<string[]>([]);
  
  // ✅ KRITISCH: Ref verhindert mehrfache Anwendung des Default-Filters (Endlosschleife)
  const defaultFilterAppliedRef = useRef<boolean>(false);
  
  // ✅ FIX: Zustandsmaschine für Filter-Load-Prozess
  type FilterLoadState = 'idle' | 'loading' | 'loaded' | 'error';
  const [filterLoadState, setFilterLoadState] = useState<FilterLoadState>('idle');
  
  // Responsive Tag-Display States (optimiert)
  const containerRef = useRef<HTMLDivElement>(null);
  const grandParentRef = useRef<HTMLElement | null>(null); // ✅ FIX: Ref für Großeltern-Container
  const tagRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [visibleTagCount, setVisibleTagCount] = useState(4); // Fallback für SSR
  const [containerWidth, setContainerWidth] = useState(0);
  const [measuredTagWidths, setMeasuredTagWidths] = useState<Map<number, number>>(new Map());
  const [isMeasuring, setIsMeasuring] = useState(true); // Initial alle Tags rendern für Messung
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

  // ✅ PERFORMANCE: Verwende Filter-Context refreshFilters statt lokaler Implementierung
  const refreshFilters = useCallback(async () => {
    await filterContext.refreshFilters(tableId);
  }, [tableId, filterContext]);

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
      if (process.env.NODE_ENV === 'development') {
        console.error('Fehler beim Bereinigen der Client-Filter:', error);
      }
    }
  }, [tableId, refreshFilters]);

  // Recent Clients laden (mit useCallback für stabilen Event-Listener)
  const loadRecentClients = useCallback(async () => {
    if (tableId === 'consultations-table') {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 SavedFilterTags: Loading recent clients...');
        }
        const response = await axiosInstance.get(API_ENDPOINTS.CLIENTS.RECENT);
        // Verwende die Reihenfolge der API-Antwort direkt (Backend sortiert bereits richtig)
        const clientNames = response.data.map((client: any) => client.name);
        if (process.env.NODE_ENV === 'development') {
          console.log('📋 SavedFilterTags: Recent client names:', clientNames);
        }
        setRecentClientNames(clientNames);
        
        // Auto-Bereinigung: Lösche überschüssige Recent Client Filter (LRU-basiert)
        await cleanupExcessiveClientFilters(clientNames);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ SavedFilterTags: Error loading recent clients:', error);
        }
        // Stille Behandlung - normale Situation wenn noch keine Clients beraten wurden
      }
    }
  }, [tableId, cleanupExcessiveClientFilters]);

  // Event-Listener für Consultation-Änderungen (z.B. neue Beratung gestartet)
  useEffect(() => {
    const handleConsultationChanged = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔔 SavedFilterTags: Received consultationChanged event');
      }
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

  // ✅ PERFORMANCE: Lade Filter über Filter-Context (verhindert doppelte Ladung)
  // ✅ KRITISCH: Ref verhindert mehrfache Anwendung des Default-Filters (Endlosschleife)
  useEffect(() => {
    // ✅ Reset Ref und State wenn tableId sich ändert
    defaultFilterAppliedRef.current = false;
    setFilterLoadState('idle');
    
    // Lade Filter über Filter-Context
    filterContext.loadFilters(tableId);
  }, [tableId, filterContext]);
  
  // ✅ FIX: Überwache Filter-Load-Status
  useEffect(() => {
    if (loading) {
      setFilterLoadState('loading');
    } else if (error) {
      setFilterLoadState('error');
    } else {
      // ✅ FIX: Wenn nicht mehr am Laden und kein Fehler, dann ist es geladen
      // (auch wenn savedFilters.length === 0, weil Filter geladen wurden, aber leer sind)
      setFilterLoadState('loaded');
    }
  }, [loading, error]);

  // ✅ KRITISCH: Default-Filter nur EINMAL anwenden (verhindert Endlosschleife)
  // ✅ FIX: Default-Filter nur anwenden, wenn Filter geladen wurden
  useEffect(() => {
    // Nur ausführen, wenn:
    // 1. Default-Filter definiert ist
    // 2. Noch nicht angewendet wurde
    // 3. Filter geladen wurden (nicht während Laden)
    if (defaultFilterName && !defaultFilterAppliedRef.current && filterLoadState === 'loaded') {
      // ✅ FIX: Wenn keine Filter geladen wurden, aber State ist "loaded"
      // → Filter existieren nicht in DB → Lade Daten ohne Filter (Fallback)
      if (savedFilters.length === 0) {
        // ✅ FIX: Wenn keine Filter existieren, lade Daten ohne Filter (Fallback)
        // Dies verhindert, dass keine Daten angezeigt werden, wenn keine Filter existieren
        defaultFilterAppliedRef.current = true;
        if (onFilterChange) {
          onFilterChange('', null, [], [], undefined);
        }
        return;
      }
      
      // ✅ Suche nach Default-Filter
      // ✅ DEBUG: Log verfügbare Filter (nur in Development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[SavedFilterTags] Suche Default-Filter "${defaultFilterName}". Verfügbare Filter:`, savedFilters.map(f => f?.name));
      }
      
      const defaultFilter = savedFilters.find((filter: SavedFilter) => {
        if (!filter || !filter.name) return false;
        // Exakte Übereinstimmung
        if (filter.name === defaultFilterName) return true;
        // Alternative Namen für "Aktuell"
        if (defaultFilterName === 'Aktuell' && (filter.name === 'tasks.filters.current' || filter.name === 'requests.filters.aktuell')) return true;
        // Alternative Namen für "Hoy"
        if (defaultFilterName === 'Hoy' && (filter.name === 'Heute' || filter.name === 'common.today')) return true;
        return false;
      });
      
      if (defaultFilter) {
        // ✅ DEBUG: Log gefundenen Filter (nur in Development)
        if (process.env.NODE_ENV === 'development') {
          console.log(`[SavedFilterTags] Default-Filter gefunden:`, defaultFilter.name, defaultFilter.id);
        }
        // ✅ Markiere als angewendet, BEVOR onFilterChange aufgerufen wird
        defaultFilterAppliedRef.current = true;
        
        // ✅ FIX: Einheitliches Format - immer Array (nicht undefined)
        const validSortDirections = Array.isArray(defaultFilter.sortDirections) ? defaultFilter.sortDirections : [];
        if (onFilterChange) {
          // Controlled Mode: Verwende onFilterChange
          onFilterChange(defaultFilter.name, defaultFilter.id, defaultFilter.conditions, defaultFilter.operators, validSortDirections);
        } else {
          // Uncontrolled Mode: Verwende onSelectFilter
          onSelectFilter(defaultFilter.conditions, defaultFilter.operators, validSortDirections);
        }
      } else if (defaultFilterName) {
        // ✅ FIX: Wenn Default-Filter nicht gefunden wurde, warnen und Fallback
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[SavedFilterTags] Default-Filter "${defaultFilterName}" nicht gefunden. Verfügbare Filter:`, savedFilters.map(f => f?.name));
        }
        // ✅ FIX: Fallback - wenn Default-Filter nicht existiert, lade Daten ohne Filter
        // Dies verhindert, dass keine Daten angezeigt werden, wenn Default-Filter fehlt
        defaultFilterAppliedRef.current = true;
        if (onFilterChange) {
          onFilterChange('', null, [], [], undefined);
        }
      }
    }
  }, [defaultFilterName, filterLoadState, savedFilters, onFilterChange, onSelectFilter]);

  // ✅ PERFORMANCE: Cleanup nicht mehr nötig - FilterContext verwaltet State zentral
  // Filter werden automatisch vom FilterContext verwaltet

  // Expose refresh function für Parent-Komponenten
  useEffect(() => {
    // Erstelle eine globale Referenz für externe Updates
    (window as any).refreshSavedFilters = refreshFilters;
    return () => {
      delete (window as any).refreshSavedFilters;
    };
  }, [refreshFilters]);

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
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 SavedFilterTags: handleSelectFilter called', {
        filterName: filter.name,
        filterId: filter.id,
        conditionsCount: filter.conditions?.length || 0,
        operatorsCount: filter.operators?.length || 0,
        sortDirectionsCount: filter.sortDirections?.length || 0,
        hasOnFilterChange: !!onFilterChange
      });
    }
    
    // ✅ FIX: Einheitliches Format - immer Array (nicht undefined)
    const validSortDirections = Array.isArray(filter.sortDirections) ? filter.sortDirections : [];
    
    if (onFilterChange) {
      // Controlled component
      if (process.env.NODE_ENV === 'development') {
        console.log('📋 SavedFilterTags: Calling onFilterChange (controlled)');
      }
      onFilterChange(filter.name, filter.id, filter.conditions, filter.operators, validSortDirections);
    } else {
      // Backward compatibility - uncontrolled component
      if (process.env.NODE_ENV === 'development') {
        console.log('📋 SavedFilterTags: Calling onSelectFilter (uncontrolled)');
      }
      onSelectFilter(filter.conditions, filter.operators, validSortDirections);
    }
  };
  
  // Lösche einen gespeicherten Filter
  const handleDeleteFilter = async (e: React.MouseEvent, filterId: number) => {
    e.stopPropagation();
    
    const filterToDelete = savedFilters.find(filter => filter.id === filterId);
    if (filterToDelete && isStandardFilter(filterToDelete.name)) {
      showMessage(t('filter.cannotDeleteStandard', { defaultValue: 'Standard-Filter können nicht gelöscht werden' }), 'error');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        showMessage(t('filter.notAuthenticated', { defaultValue: 'Nicht authentifiziert' }), 'error');
        return;
      }
      
      await axiosInstance.delete(API_ENDPOINTS.SAVED_FILTERS.BY_ID(filterId));
      
      // ✅ PERFORMANCE: Aktualisiere Filter über Filter-Context
      await filterContext.refreshFilters(tableId);
      
      // Wenn der aktuell ausgewählte Filter gelöscht wurde
      if (selectedFilterId === filterId || (!onFilterChange && filterId)) {
        if (onFilterChange) {
          // Controlled: Parent entscheidet was passiert
          onFilterChange('', null, [], [], []);
        } else {
          // Uncontrolled: Reset
          onReset();
        }
      }
      
      showMessage(t('filter.deleteSuccess', { defaultValue: 'Filter erfolgreich gelöscht' }), 'success');
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Fehler beim Löschen des Filters:', err);
      }
      showMessage(t('filter.deleteError', { defaultValue: 'Fehler beim Löschen des Filters' }), 'error');
    }
  };
  
  // Prüfen, ob ein Filter ein Standard-Filter ist
  const isStandardFilter = (filterName: string) => {
    // Erkenne auch Übersetzungsschlüssel
    const standardFilterNames = [
      'Archiv', 'Aktuell', 'Aktive', 'Alle', 'Heute', 'Woche', 'Hoy',
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
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 SavedFilterTags: Sorting filters...');
        console.log('📋 SavedFilterTags: recentClientNames:', recentClientNames);
        console.log('🗂️ SavedFilterTags: savedFilters:', ungroupedFilters.map(f => f.name));
      }

      const heute = ungroupedFilters.find(f => f != null && f.name === 'Heute');
      const woche = ungroupedFilters.find(f => f != null && f.name === 'Woche');
      const archiv = ungroupedFilters.find(f => f != null && f.name === 'Archiv');
      
      // Recent Client Filter in der exakten Reihenfolge der Recent Clients API sortieren
      const sortedRecentClientFilters = recentClientNames
        .map(clientName => ungroupedFilters.find(f => f != null && f.name === clientName))
        .filter(filter => filter != null) as SavedFilter[];
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ SavedFilterTags: sortedRecentClientFilters:', sortedRecentClientFilters.map(f => f.name));
      }
      
      const customFilters = ungroupedFilters.filter(f => 
        f != null && 
        !['Heute', 'Woche', 'Archiv'].includes(f.name) && 
        !recentClientNames.includes(f.name)
      );
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 SavedFilterTags: customFilters:', customFilters.map(f => f.name));
      }

      const orderedFilters: SavedFilter[] = [];
      
      if (heute) orderedFilters.push(heute);
      if (woche) orderedFilters.push(woche);
      orderedFilters.push(...sortedRecentClientFilters);
      orderedFilters.push(...customFilters);
      if (archiv) orderedFilters.push(archiv);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 SavedFilterTags: Final filter order:', orderedFilters.map(f => f.name));
      }
      
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
  // Beim Messen: Alle Tags rendern, sonst nur sichtbare
  const currentVisibleCount = showOptimisticFilters 
    ? optimisticFilters.length 
    : (isMeasuring ? sortedFilters.length : visibleTagCount);

  // Tag-Breiten-Berechnung: Verwende gemessene Breiten wenn verfügbar, sonst aggressive Schätzung
  const averageTagWidth = useMemo(() => {
    if (sortedFilters.length === 0) return 75;
    
    // Wenn wir gemessene Breiten haben, verwende diese
    if (measuredTagWidths.size > 0) {
      const widths = Array.from(measuredTagWidths.values());
      return widths.reduce((sum, width) => sum + width, 0) / widths.length;
    }
    
    // Fallback: Aggressivere Schätzung (4.5px pro Zeichen - optimistischer für große Bildschirme)
    return sortedFilters
      .filter(filter => filter != null)
      .reduce((sum, filter) => {
        // Aggressivere Schätzung: ~4.5px pro Zeichen + 24px Padding + optional Delete-Button
        const deleteButtonWidth = !isStandardFilter(filter.name) ? 18 : 0;
        return sum + (filter.name.length * 4.5 + 24 + deleteButtonWidth);
      }, 0) / sortedFilters.filter(filter => filter != null).length;
  }, [sortedFilters, measuredTagWidths]);

  // ✅ FIX: Berechne tatsächlich verfügbare Breite unter Berücksichtigung von negativen Margins
  // Vereinfachte Lösung: Verwende grandParentRef wenn vorhanden, sonst Container-Breite
  const getAvailableWidth = useCallback(() => {
    if (!containerRef.current) return 0;
    
    // Wenn wir einen Großeltern-Container-Ref haben (bei negativen Margins), verwende dessen Breite
    if (grandParentRef.current) {
      return grandParentRef.current.clientWidth;
    }
    
    // Fallback: Verwende Container-Breite (wenn keine negativen Margins vorhanden)
    return containerRef.current.clientWidth;
  }, []);

  // Optimierte Sichtbarkeits-Berechnung mit useCallback
  const calculateVisibleTags = useCallback(() => {
    if (!containerRef.current || sortedFilters.length === 0) return;
    // Nicht berechnen während Messung
    if (isMeasuring) return;

    const currentWidth = getAvailableWidth();

    // Nur neu berechnen wenn sich die Breite signifikant geändert hat (>= 10px)
    if (Math.abs(currentWidth - containerWidth) < 10 && containerWidth > 0) return;

    setContainerWidth(currentWidth);

    // Reduzierte, realistischere UI-Element-Breiten
    const DROPDOWN_BUTTON_WIDTH = 60; // Reduziert von 70
    const GAP_BETWEEN_TAGS = 6; // gap-1.5 = 6px
    const BUFFER = 4; // Minimaler Puffer

    const availableWidth = currentWidth - BUFFER;

    // Verwende gemessene Breiten wenn verfügbar, sonst Durchschnitt
    let totalWidth = 0;
    let measuredCount = 0;

    // Berechne Gesamtbreite der Tags mit gemessenen Breiten
    sortedFilters.forEach((filter) => {
      const measuredWidth = measuredTagWidths.get(filter.id);
      if (measuredWidth) {
        totalWidth += measuredWidth + GAP_BETWEEN_TAGS;
        measuredCount++;
      }
    });

    // Wenn wir gemessene Breiten für alle Tags haben, verwende diese
    if (measuredCount === sortedFilters.length && totalWidth > 0) {
      const totalWidthWithoutLastGap = totalWidth - GAP_BETWEEN_TAGS;

      // Prüfe ob alle Tags ohne Dropdown passen
      if (totalWidthWithoutLastGap <= availableWidth) {
        setVisibleTagCount(sortedFilters.length);
        return;
      }

      // Prüfe ob alle Tags mit Dropdown passen
      const availableWithDropdown = availableWidth - DROPDOWN_BUTTON_WIDTH - GAP_BETWEEN_TAGS;
      if (totalWidthWithoutLastGap <= availableWithDropdown) {
        setVisibleTagCount(sortedFilters.length);
        return;
      }

      // Berechne wie viele Tags mit Dropdown passen
      let cumulativeWidth = 0;
      let visibleCount = 0;
      for (const filter of sortedFilters) {
        const width = measuredTagWidths.get(filter.id) || averageTagWidth;
        if (cumulativeWidth + width + GAP_BETWEEN_TAGS <= availableWithDropdown) {
          cumulativeWidth += width + GAP_BETWEEN_TAGS;
          visibleCount++;
        } else {
          break;
        }
      }
      setVisibleTagCount(Math.max(1, visibleCount));
      return;
    }

    // Fallback: Verwende Durchschnittsbreite
    const maxPossibleTags = Math.max(1, Math.floor(availableWidth / (averageTagWidth + GAP_BETWEEN_TAGS)));

    if (maxPossibleTags >= sortedFilters.length) {
      // Alle Tags passen rein - zeige alle
      setVisibleTagCount(sortedFilters.length);
    } else {
      // Prüfe ob alle Tags mit Dropdown passen würden
      const availableWithDropdown = availableWidth - DROPDOWN_BUTTON_WIDTH - GAP_BETWEEN_TAGS;
      const maxTagsWithDropdown = Math.max(1, Math.floor(availableWithDropdown / (averageTagWidth + GAP_BETWEEN_TAGS)));

      if (maxTagsWithDropdown >= sortedFilters.length) {
        // Alle Tags passen mit Dropdown - zeige alle
        setVisibleTagCount(sortedFilters.length);
      } else {
        // Zeige berechnete Anzahl
        setVisibleTagCount(Math.max(1, maxTagsWithDropdown));
      }
    }
  }, [sortedFilters, averageTagWidth, containerWidth, isMeasuring, measuredTagWidths, getAvailableWidth]);

  // Debounced ResizeObserver für bessere Performance
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      calculateVisibleTags();
    }, 100); // 100ms Debounce für Filter-Tags (schneller als Client-Tags)
  }, [calculateVisibleTags]);

  // ✅ FIX: Initialisiere grandParentRef und setze ResizeObserver auf beide Container
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const parentElement = container.parentElement;
    
    // Prüfe ob Parent negative Margins hat und setze grandParentRef
    if (parentElement) {
      const parentStyles = window.getComputedStyle(parentElement);
      const parentMarginLeft = parseFloat(parentStyles.marginLeft) || 0;
      const parentMarginRight = parseFloat(parentStyles.marginRight) || 0;
      
      if (parentMarginLeft < 0 || parentMarginRight < 0) {
        const grandParent = parentElement.parentElement;
        if (grandParent) {
          grandParentRef.current = grandParent;
        }
      }
    }

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    
    // ✅ FIX: Beobachte auch den Großeltern-Container, wenn vorhanden
    if (grandParentRef.current) {
      resizeObserver.observe(grandParentRef.current);
    }
    
    // Auch Window-Resize überwachen für bessere Abdeckung
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      grandParentRef.current = null; // Cleanup
    };
  }, [handleResize]);

  // Messung der tatsächlichen Tag-Breiten nach Render
  useLayoutEffect(() => {
    if (sortedFilters.length === 0) return;

    const widths = new Map<number, number>();
    let hasMeasurements = false;

    // Beim ersten Messen: Alle Tags messen (wenn isMeasuring true)
    // Später: Nur die sichtbaren + ein paar mehr messen
    const tagsToMeasure = isMeasuring
      ? sortedFilters.length
      : Math.min(visibleTagCount + 5, sortedFilters.length);

    sortedFilters.slice(0, tagsToMeasure).forEach((filter) => {
      const tagElement = tagRefs.current.get(filter.id);
      if (tagElement) {
        const width = tagElement.offsetWidth;
        if (width > 0) {
          widths.set(filter.id, width);
          hasMeasurements = true;
        }
      }
    });

    if (hasMeasurements) {
      // State-Updates verzögern um React Error #185 zu vermeiden
      const shouldEndMeasuring = isMeasuring;
      setTimeout(() => {
        setMeasuredTagWidths(widths);
        // Nach erfolgreicher Messung: Messmodus beenden und neu berechnen
        if (shouldEndMeasuring) {
          setIsMeasuring(false);
          // Trigger Neuberechnung durch setTimeout (nach State-Update)
          setTimeout(() => {
            if (containerRef.current) {
              calculateVisibleTags();
            }
          }, 0);
        }
      }, 0);
    }
  }, [sortedFilters, visibleTagCount, isMeasuring, calculateVisibleTags]);

  // ✅ FIX: Initial calculation mit Verzögerung, damit Container ihre finale Größe haben
  useLayoutEffect(() => {
    if (!isMeasuring) {
      // Verzögerung, damit Container ihre finale Größe haben (besonders wichtig bei negativen Margins)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          calculateVisibleTags();
        });
      });
    }
  }, [calculateVisibleTags, isMeasuring]);
  
  // Reset Messmodus wenn sich Filter ändern
  useEffect(() => {
    if (sortedFilters.length > 0) {
      setIsMeasuring(true);
      setMeasuredTagWidths(new Map());
    }
  }, [sortedFilters.length]);

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
        showMessage(t('filter.addToGroupSuccess', { defaultValue: 'Filter zur Gruppe hinzugefügt' }), 'success');
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
          showMessage(t('filter.addToGroupSuccess', { defaultValue: 'Filter zur Gruppe hinzugefügt' }), 'success');
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
          
          showMessage(t('filter.createGroupSuccess', { defaultValue: 'Gruppe erstellt' }), 'success');
        }
      }
      
      // Refresh Filter-Liste
      await refreshFilters();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Fehler beim Gruppieren der Filter:', err);
      }
      showMessage(t('filter.groupError', { defaultValue: 'Fehler beim Gruppieren der Filter' }), 'error');
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
      showMessage(t('filter.ungroupSuccess', { defaultValue: 'Gruppe aufgelöst' }), 'success');
      await refreshFilters();
      setOpenGroupDropdowns(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Fehler beim Auflösen der Gruppe:', err);
      }
      showMessage(t('filter.ungroupError', { defaultValue: 'Fehler beim Auflösen der Gruppe' }), 'error');
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
      showMessage(t('filter.groupNameRequired', { defaultValue: 'Gruppenname darf nicht leer sein' }), 'error');
      return;
    }

    try {
      await axiosInstance.put(API_ENDPOINTS.SAVED_FILTERS.GROUPS.UPDATE(groupId), {
        name: editingGroupName.trim()
      });
      showMessage(t('filter.renameGroupSuccess', { defaultValue: 'Gruppe umbenannt' }), 'success');
      await refreshFilters();
      setEditingGroupId(null);
      setEditingGroupName('');
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Fehler beim Umbenennen der Gruppe:', err);
      }
      const errorMessage = err.response?.data?.message || 'Fehler beim Umbenennen der Gruppe';
      showMessage(errorMessage, 'error');
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
    <div ref={containerRef} className="flex items-center gap-1.5 sm:gap-2 mb-3 mt-1 overflow-x-auto overflow-y-hidden">
      {/* Dynamische Anzahl Filter inline anzeigen mit optimistischer Anzeige */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 flex-nowrap">
        {/* Gruppen-Dropdowns */}
        {sortedGroups.map(group => {
          // Prüfe, ob ein Filter aus dieser Gruppe aktiv ist
          const activeFilterInGroup = group.filters.find(f => getActiveFilterId() === f.id);
          const translatedGroupName = translateGroupName(group.name);
          const displayName = activeFilterInGroup 
            ? translateFilterName(activeFilterInGroup.name)
            : `${translatedGroupName} (${group.filters.length})`;
          
          return (
          <div key={group.id} className="relative flex-shrink-0">
            <div className="relative group">
              <button
                onClick={() => toggleGroupDropdown(group.id)}
                onDragOver={(e) => handleDragOver(e, group.id, 'group')}
                onDrop={(e) => handleDrop(e, group.id, 'group')}
                className={`flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors ${
                  dragOverGroupId === group.id ? 'ring-2 ring-purple-500' : ''
                } ${activeFilterInGroup ? 'ring-2 ring-purple-500' : ''}`}
              >
                <span className="truncate max-w-[4rem] sm:max-w-[100px]">
                  {displayName}
                </span>
                <ChevronDownIcon className={`h-3 w-3 sm:h-4 sm:w-4 ml-0.5 sm:ml-1 transition-transform ${openGroupDropdowns.has(group.id) ? 'rotate-180' : ''}`} />
              </button>
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                {activeFilterInGroup ? displayName : `${translatedGroupName} (${group.filters.length})`}
              </div>
            </div>
            
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
                        <div className="relative group">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveGroupName(group.id);
                            }}
                            className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                            Speichern
                          </div>
                        </div>
                        <div className="relative group">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEditGroup();
                            }}
                            className="p-2 rounded-md bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                            Abbrechen
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="relative group">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditGroup(group);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                          Gruppe umbenennen
                        </div>
                      </div>
                      <div className="relative group">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUngroupFilters(group.id);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                          {t('filter.ungroup')}
                        </div>
                      </div>
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
            ref={(el) => {
              if (el && !filter.isPlaceholder) {
                tagRefs.current.set(filter.id, el);
              } else if (!el) {
                tagRefs.current.delete(filter.id);
              }
            }}
            draggable={true}
            onDragStart={(e) => handleDragStart(e, filter.id)}
            onDragOver={(e) => handleDragOver(e, filter.id, 'filter')}
            onDrop={(e) => handleDrop(e, filter.id, 'filter')}
            onDragEnd={handleDragEnd}
            onClick={() => !filter.isPlaceholder && handleSelectFilter(filter)}
            className={`relative group flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium cursor-pointer transition-colors flex-shrink-0 ${
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
          >
            <span className="truncate max-w-[4rem] sm:max-w-[100px]">
              {filter.isPlaceholder && filter.name === '████████' ? (
                <span className="inline-block w-16 h-4 bg-gray-300 dark:bg-gray-500 rounded animate-pulse"></span>
              ) : (
                translateFilterName(filter.name)
              )}
            </span>
            {!filter.isPlaceholder && !isStandardFilter(filter.name) && (
                <button
                  onClick={(e) => handleDeleteFilter(e, filter.id)}
                className="ml-1 sm:ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                >
                  <XMarkIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
            )}
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
              {filter.isPlaceholder ? t('common.loading') : translateFilterName(filter.name)}
            </div>
          </div>
        ))}
        
        {/* Dropdown nur bei echten Filtern und tatsächlichem Platzmangel */}
        {!showOptimisticFilters && sortedFilters.length > visibleTagCount && (
          <div className="relative flex-shrink-0">
            <div className="relative group">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600"
              >
                <span>+{sortedFilters.length - visibleTagCount}</span>
                <ChevronDownIcon className={`h-3 w-3 sm:h-4 sm:w-4 ml-0.5 sm:ml-1 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                Weitere Filter anzeigen
              </div>
            </div>
            
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
                  >
                    <span className="truncate flex-1">{translateFilterName(filter.name)}</span>
                    {!isStandardFilter(filter.name) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFilter(e, filter.id);
                            setIsDropdownOpen(false);
                          }}
                        className="ml-2 flex-shrink-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
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