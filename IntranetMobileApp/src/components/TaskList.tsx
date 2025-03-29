/**
 * TaskList Komponente
 * Zeigt eine Liste von Tasks an
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Button, Divider, Searchbar, IconButton, Menu } from 'react-native-paper';
import { Task, TaskStatus } from '../types';
import TaskCard from './TaskCard';
import TaskFilterModal from './TaskFilterModal';
import TableSettingsModal from './TableSettingsModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from 'lodash';

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
  // State für Suche und Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  
  // State für Filter und Einstellungen
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({
    status: [],
    searchTerm: ''
  });
  const [tableSettings, setTableSettings] = useState<TableSettings>({
    tableId: 'tasks',
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
  
  // Lade kürzlich verwendete Suchanfragen
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
    setActiveFilters(filters);
    
    // Aktualisiere die Suche, wenn sie Teil der Filter ist
    if (filters.searchTerm !== searchQuery) {
      setSearchQuery(filters.searchTerm);
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
    
    // Filtere nach Status, wenn Status-Filter aktiv sind
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

  return (
    <View style={styles.container}>
      {/* Suchleiste mit Optionen */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBarWrapper}>
          <Searchbar
            placeholder="Aufgaben suchen"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            onFocus={() => setShowSearchHistory(true)}
            onSubmitEditing={() => {
              saveSearch(searchQuery);
              setShowSearchHistory(false);
            }}
          />
          
          {searchQuery.length > 0 && (
            <IconButton
              icon="close"
              size={20}
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            />
          )}
        </View>
        
        {/* Kürzlich verwendete Suchen */}
        {showSearchHistory && recentSearches.length > 0 && (
          <View style={styles.recentSearches}>
            <Text style={styles.recentSearchesTitle}>Letzte Suchen</Text>
            <Divider style={styles.divider} />
            {recentSearches.map((search, index) => (
              <Button
                key={index}
                icon="history"
                mode="text"
                onPress={() => applySearch(search)}
                style={styles.recentSearchButton}
                labelStyle={styles.recentSearchButtonLabel}
              >
                {search}
              </Button>
            ))}
          </View>
        )}
        
        <View style={styles.actionButtons}>
          {showFilters && (
            <Button
              icon="filter"
              mode="outlined"
              onPress={() => setShowFilterModal(true)}
              style={styles.filterButton}
              compact
            >
              Filter
            </Button>
          )}
          
          <Button
            icon="cog-outline"
            mode="outlined"
            onPress={() => setShowSettingsModal(true)}
            style={styles.settingsButton}
            compact
          >
            Spalten
          </Button>
          
          {onAddPress && (
            <Button
              icon="plus"
              mode="contained"
              onPress={onAddPress}
              style={styles.addButton}
              compact
            >
              Neu
            </Button>
          )}
        </View>
      </View>
      
      <Divider style={styles.divider} />
      
      {/* Aktive Filter anzeigen */}
      {(activeFilters.status.length > 0 ||
        activeFilters.searchTerm) && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersText}>Aktive Filter:</Text>
          <View style={styles.activeFiltersList}>
            {activeFilters.status.length > 0 && (
              <Text style={styles.activeFilter}>
                Status: {activeFilters.status.length} ausgewählt
              </Text>
            )}
            {activeFilters.searchTerm && (
              <Text style={styles.activeFilter}>
                Suche: {activeFilters.searchTerm}
              </Text>
            )}
          </View>
          <Button
            icon="close"
            mode="text"
            onPress={() => {
              setActiveFilters({
                status: [],
                searchTerm: ''
              });
              setSearchQuery('');
            }}
            compact
          >
            Zurücksetzen
          </Button>
        </View>
      )}
      
      {/* Fehlermeldung */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={onRefresh} style={styles.retryButton}>
            Erneut versuchen
          </Button>
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
              {(debouncedSearchQuery || activeFilters.searchTerm || activeFilters.status.length > 0)
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
      
      {/* Spalteneinstellungen Modal */}
      <TableSettingsModal
        visible={showSettingsModal}
        onDismiss={() => setShowSettingsModal(false)}
        onApplySettings={applyTableSettings}
        tableId="tasks"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  searchBar: {
    flex: 1,
    marginBottom: 8,
    elevation: 0,
    backgroundColor: '#f0f0f0',
  },
  clearSearchButton: {
    position: 'absolute',
    right: 0,
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
  recentSearchButtonLabel: {
    color: '#3B82F6',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterButton: {
    flex: 1,
    marginRight: 4,
  },
  settingsButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  addButton: {
    flex: 1,
    marginLeft: 4,
    backgroundColor: '#3B82F6',
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
    padding: 16,
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
});

export default TaskList; 