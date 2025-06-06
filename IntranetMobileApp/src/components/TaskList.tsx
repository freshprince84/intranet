/**
 * TaskList Komponente
 * Zeigt eine Liste von Tasks an
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Text, ScrollView, TextInput, Pressable } from 'react-native';
import { Button, Divider, Searchbar, IconButton, Menu, Chip, FAB } from 'react-native-paper';
import { Task, TaskStatus } from '../types';
import TaskCard from './TaskCard';
import TaskFilterModal from './TaskFilterModal';
import TableSettingsModal from './TableSettingsModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from 'lodash';
import Svg, { Path } from 'react-native-svg';
import { savedFilterApi } from '../api/apiClient';
import { useFilter } from '../contexts/FilterContext';

// Interface für Filteroptionen
interface FilterOptions {
  status: TaskStatus[];
  searchTerm: string;
  dateRange?: {
    from: string | null;
    to: string | null;
  };
}

// Interface für Tabelleneinstellungen
interface TableSettings {
  tableId: string;
  columns: string[];
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  itemsPerPage?: number;
}

// Interface für gespeicherte Filter
interface SavedFilter {
  id: string;
  name: string;
  status: TaskStatus[];
  searchTerm: string;
  dateRange?: {
    from: string | null;
    to: string | null;
  };
}

// Speicherkeys für AsyncStorage
const RECENT_SEARCHES_KEY = '@IntranetApp:recentSearches';
const TASK_TABLE_SETTINGS_KEY = '@IntranetApp:tableSettings_tasks';
const SAVED_FILTERS_KEY = '@IntranetApp:savedFilters';

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  onTaskPress: (taskId: number) => void;
  showFilters?: boolean;
  onFilterPress?: () => void;
  onAddPress?: () => void;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  isLoading,
  error,
  onRefresh,
  isRefreshing,
  onTaskPress,
  showFilters = true,
  onFilterPress,
  onAddPress
}) => {
  // Verwende den FilterContext statt lokaler States
  const {
    savedFilters,
    activeFilter,
    activeFilters,
    searchQuery,
    setSearchQuery,
    handleFilterSelect,
    resetFilters,
    isLoading: filtersLoading
  } = useFilter();

  // State für Suche und Filter
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  
  // State für Filter und Einstellungen
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showTableSettingsModal, setShowTableSettingsModal] = useState(false);
  const [tableSettings, setTableSettings] = useState<TableSettings>({
    tableId: 'worktracker-todos',
    columns: ['title', 'status', 'description', 'dueDate']
  });
  
  // Suche mit Debounce
  const debouncedSetSearchQuery = useMemo(
    () => debounce((query: string) => {
      setDebouncedSearchQuery(query);
    }, 300),
    []
  );
  
  // Aktualisiere Suche mit Debounce
  useEffect(() => {
    debouncedSetSearchQuery(searchQuery);
    return () => {
      debouncedSetSearchQuery.cancel();
    };
  }, [searchQuery, debouncedSetSearchQuery]);
  
  // Lade kürzlich verwendete Suchanfragen und Tabelleneinstellungen
  useEffect(() => {
    loadRecentSearches();
    loadTableSettings();
  }, []);
  
  // Lade gespeicherte Suchanfragen
  const loadRecentSearches = async () => {
    try {
      const searchesJson = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (searchesJson) {
        const searches = JSON.parse(searchesJson);
        setRecentSearches(searches);
      }
    } catch (error) {
      console.error('Fehler beim Laden der kürzlich verwendeten Suchanfragen:', error);
    }
  };
  
  // Lade Tabelleneinstellungen
  const loadTableSettings = async () => {
    try {
      const settingsJson = await AsyncStorage.getItem(TASK_TABLE_SETTINGS_KEY);
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        setTableSettings(settings);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Tabelleneinstellungen:', error);
    }
  };
  
  // Speichere eine Suchanfrage
  const saveSearch = async (query: string) => {
    if (!query.trim()) return;
    
    try {
      // Aktuelle Suchanfragen ohne die neue Anfrage
      let updatedSearches = recentSearches.filter(s => s !== query);
      
      // Neue Anfrage am Anfang hinzufügen
      updatedSearches = [query, ...updatedSearches];
      
      // Auf maximal 5 Suchanfragen beschränken
      updatedSearches = updatedSearches.slice(0, 5);
      
      // Speichern
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedSearches));
      setRecentSearches(updatedSearches);
    } catch (error) {
      console.error('Fehler beim Speichern der Suchanfrage:', error);
    }
  };
  
  // Wende eine Suchanfrage an
  const applySearch = (query: string) => {
    setSearchQuery(query);
    saveSearch(query);
    setShowSearchHistory(false);
  };
  
  // Wende Filter an
  const applyFilters = (filters: FilterOptions) => {
    // Diese Funktion wird nur noch im TaskFilterModal verwendet,
    // die eigentliche Logik ist jetzt im FilterContext
    setSearchQuery(filters.searchTerm);
    setShowFilterModal(false);
  };
  
  // Anwenden der Tabelleneinstellungen
  const applyTableSettings = (settings: TableSettings) => {
    setTableSettings(settings);
  };
  
  // Filtere Tasks basierend auf activeFilters aus dem Context
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];
    
    // Filtere nach Suchbegriff (aus der Suchleiste oder dem Filter)
    if (activeFilters.searchTerm) {
      const query = activeFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(query) || 
        (task.description && task.description.toLowerCase().includes(query))
      );
    }
    
    // Filtere nach Status (für "equals"-Bedingungen)
    if (activeFilters.status.length > 0) {
      filtered = filtered.filter(task => activeFilters.status.includes(task.status));
    }
    
    // Filtere nach ausgeschlossenen Status (für "notEquals"-Bedingungen)
    if (activeFilters.excludedStatus && activeFilters.excludedStatus.length > 0) {
      filtered = filtered.filter(task => !activeFilters.excludedStatus?.includes(task.status));
    }
    
    return filtered;
  }, [tasks, activeFilters]);
  
  // Rendere einen Task mit den konfigurierten Spalten
  const renderTaskWithColumns = (task: Task) => {
    return (
      <TaskCard 
        key={task.id}
        task={task} 
        onPress={() => onTaskPress(task.id)}
        visibleColumns={tableSettings.columns}
      />
    );
  };
  
  if (isLoading && tasks.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Aufgaben werden geladen...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header mit Icons und Suchfeld */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>To-Do-Liste</Text>
        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Suchen..."
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.rightButtons}>
          <Pressable onPress={() => setShowFilterModal(true)} style={styles.iconButton}>
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <Path
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V20l-4 2v-7.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                fill="#111827"
                stroke="#111827"
                strokeWidth="0.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
          <Pressable onPress={() => setShowTableSettingsModal(true)} style={styles.iconButton}>
            <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <Path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z" fill="#111827" clipRule="evenodd" />
            </Svg>
          </Pressable>
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      >
        {savedFilters.map((filter) => (
          <Chip
            key={filter.id}
            selected={activeFilter === filter.id}
            onPress={() => handleFilterSelect(filter.id)}
            style={[
              styles.filterChip,
              activeFilter === filter.id && styles.activeFilterChip
            ]}
          >
            {filter.name}
          </Chip>
        ))}
        {activeFilter !== null && activeFilter !== '' && (
          <Chip
            icon="close"
            onPress={resetFilters}
            style={styles.resetFilterChip}
          >
            Zurücksetzen
          </Chip>
        )}
      </ScrollView>
      
      {/* Fehlermeldung */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <IconButton
            icon="refresh"
            mode="contained"
            onPress={onRefresh}
            style={styles.retryButton}
            size={24}
            iconColor="#FFFFFF"
            containerColor="#D32F2F"
          />
        </View>
      )}
      
      {/* Task-Liste */}
      <FlatList
        data={filteredTasks}
        renderItem={({ item }) => renderTaskWithColumns(item)}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {(activeFilters.searchTerm || activeFilters.status.length > 0)
                ? 'Keine Aufgaben gefunden, die Ihren Filterkriterien entsprechen.' 
                : 'Keine Aufgaben vorhanden.'
              }
            </Text>
          </View>
        }
      />
      
      {/* Filter Modal */}
      <TaskFilterModal
        visible={showFilterModal}
        onDismiss={() => setShowFilterModal(false)}
        onApplyFilters={applyFilters}
        currentSearchTerm={searchQuery}
      />
      
      {/* TableSettings Modal */}
      <TableSettingsModal
        visible={showTableSettingsModal}
        onDismiss={() => setShowTableSettingsModal(false)}
        tableSettings={tableSettings}
        onApplySettings={applyTableSettings}
        tableId="worktracker-todos"
      />
      
      {/* FAB zum Erstellen einer neuen Aufgabe */}
      {onAddPress && (
        <FAB
          icon="plus"
          style={{
            position: 'absolute',
            margin: 16,
            right: 0,
            bottom: 0,
            backgroundColor: '#3B82F6',
          }}
          onPress={onAddPress}
          color="#FFFFFF"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  leftButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 48, // Breite eines IconButtons
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 96, // Breite von zwei IconButtons
  },
  searchContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    elevation: 0,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    height: 40,
  },
  iconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentSearches: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
    marginBottom: 8,
    padding: 8,
    elevation: 2,
  },
  recentSearchesTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
  },
  recentSearchButton: {
    justifyContent: 'flex-start',
    paddingHorizontal: 0,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 4,
    margin: 8,
  },
  activeFiltersText: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  activeFiltersList: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  activeFilter: {
    backgroundColor: '#BBDEFB',
    padding: 4,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
    fontSize: 12,
  },
  listContent: {
    padding: 0,
    width: '100%',
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FFEBEE',
    margin: 16,
    borderRadius: 4,
  },
  errorText: {
    color: '#D32F2F',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#D32F2F',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#F3F4F6',
  },
  activeFilterChip: {
    backgroundColor: '#3B82F6',
  },
  resetFilterChip: {
    backgroundColor: '#EF4444',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    minWidth: 100,
  },
});

export default TaskList; 