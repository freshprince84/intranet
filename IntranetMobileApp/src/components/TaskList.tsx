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

// Speicherkeys für AsyncStorage
const RECENT_SEARCHES_KEY = '@IntranetApp:recentSearches';
const TASK_TABLE_SETTINGS_KEY = '@IntranetApp:tableSettings_tasks';

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
  // State für Suche
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  
  // State für Filter und Einstellungen
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showTableSettingsModal, setShowTableSettingsModal] = useState(false);
  const [tableSettings, setTableSettings] = useState<TableSettings>({
    tableId: 'tasks',
    columns: ['title', 'status', 'description', 'dueDate']
  });
  
  // Verwenden des FilterContexts
  const { 
    savedFilters, 
    activeFilter, 
    activeFilters, 
    searchQuery, 
    setSearchQuery, 
    handleFilterSelect, 
    isLoading: filtersLoading 
  } = useFilter();
  
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
    // Statt activeFilters direkt zu setzen, übergeben wir die Werte an den Context
    setSearchQuery(filters.searchTerm);
    
    // Zurücksetzen des aktiven Filters im Context, wenn wir manuelle Filter anwenden
    if (activeFilter) {
      // TODO: Das sollte durch den Context übernommen werden
    }
  };
  
  // Anwenden der Tabelleneinstellungen
  const applyTableSettings = (settings: TableSettings) => {
    setTableSettings(settings);
  };
  
  // Filtere Tasks basierend auf Suchbegriff und aktiven Filtern
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];
    
    // Filtere nach Suchbegriff (aus der Suchleiste oder dem Filter)
    const query = debouncedSearchQuery.toLowerCase() || activeFilters.searchTerm.toLowerCase();
    if (query) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(query) || 
        (task.description && task.description.toLowerCase().includes(query))
      );
    }
    
    // Filtere nach Status
    if (activeFilters.status.length > 0) {
      filtered = filtered.filter(task => activeFilters.status.includes(task.status));
    }
    
    return filtered;
  }, [tasks, debouncedSearchQuery, activeFilters]);
  
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
  
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={onRefresh}>
          Erneut versuchen
        </Button>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Suchleiste */}
      <Searchbar
        placeholder="Suchen..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        onFocus={() => setShowSearchHistory(true)}
        icon={() => (
          <IconButton
            icon="magnify"
            size={20}
            onPress={() => {}}
          />
        )}
        clearIcon={() => (
          searchQuery ? (
            <IconButton
              icon="close"
              size={20}
              onPress={() => setSearchQuery('')}
            />
          ) : null
        )}
      />
      
      {/* Suchverlauf */}
      {showSearchHistory && recentSearches.length > 0 && (
        <View style={styles.searchHistoryContainer}>
          <Text style={styles.searchHistoryTitle}>Letzte Suchanfragen</Text>
          {recentSearches.map((search, index) => (
            <Pressable
              key={index}
              style={styles.searchHistoryItem}
              onPress={() => applySearch(search)}
            >
              <Text>{search}</Text>
            </Pressable>
          ))}
          <Button
            mode="text"
            onPress={() => setShowSearchHistory(false)}
            style={styles.closeHistoryButton}
          >
            Schließen
          </Button>
        </View>
      )}
      
      {/* Filter und Einstellungen */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          {/* Filter-Chips anzeigen */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollContent}
          >
            {/* Gespeicherte Filter anzeigen */}
            {savedFilters.map((filter) => (
              <Chip
                key={filter.id}
                selected={activeFilter === filter.id}
                onPress={() => handleFilterSelect(filter.id)}
                style={[
                  styles.filterChip,
                  activeFilter === filter.id ? styles.activeFilterChip : null
                ]}
                textStyle={activeFilter === filter.id ? styles.activeFilterChipText : null}
              >
                {filter.name}
              </Chip>
            ))}
          </ScrollView>
          
          {/* Filter- und Einstellungs-Buttons */}
          <View style={styles.filterButtonsContainer}>
            <IconButton
              icon="filter-variant"
              mode="contained"
              size={20}
              onPress={() => setShowFilterModal(true)}
              style={styles.filterButton}
            />
            <IconButton
              icon="cog"
              mode="contained"
              size={20}
              onPress={() => setShowTableSettingsModal(true)}
              style={styles.settingsButton}
            />
          </View>
        </View>
      )}
      
      {/* Task-Liste */}
      {filteredTasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Keine Aufgaben gefunden</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          renderItem={({ item }) => renderTaskWithColumns(item)}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <Divider style={styles.divider} />}
          onRefresh={onRefresh}
          refreshing={isRefreshing}
        />
      )}
      
      {/* Neuer Task Button (nur anzeigen, wenn onAddPress verfügbar ist) */}
      {onAddPress && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={onAddPress}
        />
      )}
      
      {/* Filter-Modal */}
      <TaskFilterModal
        visible={showFilterModal}
        onDismiss={() => setShowFilterModal(false)}
        onApplyFilters={applyFilters}
        currentSearchTerm={searchQuery}
      />
      
      {/* Spalteneinstellungen Modal */}
      <TableSettingsModal
        visible={showTableSettingsModal}
        onDismiss={() => setShowTableSettingsModal(false)}
        onApplySettings={applyTableSettings}
        tableId="tasks"
      />
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
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  errorText: {
    marginBottom: 16,
    color: '#DC2626',
    textAlign: 'center',
  },
  searchBar: {
    margin: 8,
    elevation: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  searchHistoryContainer: {
    backgroundColor: '#FFFFFF',
    margin: 8,
    marginTop: 0,
    padding: 12,
    borderRadius: 12,
    elevation: 2,
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  searchHistoryTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#4B5563',
  },
  searchHistoryItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeHistoryButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  filtersScrollContent: {
    paddingRight: 70, // Platz für die Buttons
    paddingLeft: 8,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  activeFilterChip: {
    backgroundColor: '#3B82F6',
  },
  activeFilterChipText: {
    color: '#FFFFFF',
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    position: 'absolute',
    right: 8,
    backgroundColor: '#FFFFFF',
  },
  filterButton: {
    marginRight: 4,
    backgroundColor: '#F3F4F6',
  },
  settingsButton: {
    backgroundColor: '#F3F4F6',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  divider: {
    marginVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#3B82F6',
  },
});

export default TaskList; 