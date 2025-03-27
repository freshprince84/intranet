/**
 * TaskList Komponente
 * Zeigt eine Liste von Tasks an
 */

import React from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Button, Divider, Searchbar } from 'react-native-paper';
import { Task } from '../types';
import TaskCard from './TaskCard';

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  onTaskPress: (task: Task) => void;
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
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredTasks = React.useMemo(() => {
    if (!searchQuery) return tasks;
    
    const query = searchQuery.toLowerCase();
    return tasks.filter(task => 
      task.title.toLowerCase().includes(query) || 
      (task.description && task.description.toLowerCase().includes(query))
    );
  }, [tasks, searchQuery]);

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
      {/* Suchleiste und Filter-Buttons */}
      <View style={styles.searchBarContainer}>
        <Searchbar
          placeholder="Aufgaben suchen"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        
        <View style={styles.actionButtons}>
          {showFilters && onFilterPress && (
            <Button
              icon="filter"
              mode="outlined"
              onPress={onFilterPress}
              style={styles.filterButton}
              compact
            >
              Filter
            </Button>
          )}
          
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
        renderItem={({ item }) => (
          <TaskCard task={item} onPress={onTaskPress} />
        )}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery 
                ? 'Keine Aufgaben gefunden, die Ihrer Suche entsprechen.' 
                : 'Keine Aufgaben vorhanden.'
              }
            </Text>
          </View>
        }
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
  searchBar: {
    marginBottom: 8,
    elevation: 0,
    backgroundColor: '#f0f0f0',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterButton: {
    marginRight: 8,
  },
  addButton: {
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
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