/**
 * TaskScreen
 * Screen für die Anzeige und Verwaltung von Aufgaben (Tasks)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Portal, Modal, Text, TextInput, Button } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { Task } from '../types';
import TaskList from '../components/TaskList';
import { taskApi } from '../api/apiClient';
import { useNetInfo } from '@react-native-community/netinfo';

const TaskScreen = () => {
  const { user } = useAuth();
  const netInfo = useNetInfo();
  
  // State für Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State für Modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetailsModal, setShowTaskDetailsModal] = useState(false);
  
  // Lade Tasks beim Mounten der Komponente
  useEffect(() => {
    loadTasks();
  }, []);
  
  // Lade Tasks vom Backend
  const loadTasks = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      // Prüfe Internetverbindung
      if (!netInfo.isConnected) {
        setError('Keine Internetverbindung. Bitte stellen Sie eine Verbindung her und versuchen Sie es erneut.');
        setIsLoading(false);
        return;
      }
      
      // Lade Tasks vom Server
      const response = await taskApi.getAll();
      console.log('Geladene Tasks:', response);
      
      // Stelle sicher, dass nur Task-Objekte in der Liste sind und keine Requests
      const filteredTasks = response.filter(item => 
        // Prüfe ob es sich wirklich um Tasks handelt und nicht um Requests
        item.hasOwnProperty('status') && 
        typeof item.status === 'string' && 
        ['open', 'in_progress', 'improval', 'quality_control', 'done'].includes(item.status)
      );
      
      setTasks(filteredTasks);
    } catch (error) {
      console.error('Fehler beim Laden der Tasks:', error);
      setError('Die Aufgaben konnten nicht geladen werden. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsLoading(false);
    }
  }, [netInfo.isConnected]);
  
  // Handle Pull-to-Refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    
    try {
      await loadTasks();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadTasks]);
  
  // Öffne Task-Details
  const handleTaskPress = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetailsModal(true);
  };
  
  // Handle Task-Status Update
  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      if (!netInfo.isConnected) {
        Alert.alert('Fehler', 'Keine Internetverbindung. Statusänderungen erfordern eine aktive Verbindung.');
        return;
      }
      
      await taskApi.updateStatus(taskId, newStatus as any);
      
      // Aktualisiere lokalen Task-Status
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, status: newStatus as any } 
            : task
        )
      );
      
      Alert.alert('Erfolg', 'Status wurde aktualisiert');
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Status:', error);
      Alert.alert('Fehler', 'Der Status konnte nicht aktualisiert werden. Bitte versuchen Sie es später erneut.');
    }
  };
  
  return (
    <View style={styles.container}>
      <TaskList
        tasks={tasks}
        isLoading={isLoading}
        error={error}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onTaskPress={handleTaskPress}
        onFilterPress={() => {
          // Filter-Funktionalität wird in einem späteren Schritt implementiert
          Alert.alert('Info', 'Filter-Funktionalität wird in einem späteren Schritt implementiert.');
        }}
        onAddPress={() => {
          // Task-Erstellung wird in einem späteren Schritt implementiert
          Alert.alert('Info', 'Task-Erstellung wird in einem späteren Schritt implementiert.');
        }}
      />
      
      {/* Task-Details Modal */}
      <Portal>
        <Modal
          visible={showTaskDetailsModal}
          onDismiss={() => setShowTaskDetailsModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          {selectedTask && (
            <View>
              <Text style={styles.modalTitle}>{selectedTask.title}</Text>
              
              <View style={styles.statusSection}>
                <Text style={styles.sectionLabel}>Status:</Text>
                <View style={styles.statusButtons}>
                  <Button
                    mode={selectedTask.status === 'open' ? 'contained' : 'outlined'}
                    onPress={() => handleStatusChange(selectedTask.id, 'open')}
                    style={[styles.statusButton, { borderColor: '#3B82F6' }]}
                    textColor={selectedTask.status === 'open' ? 'white' : '#3B82F6'}
                    disabled={selectedTask.status === 'open'}
                  >
                    Offen
                  </Button>
                  <Button
                    mode={selectedTask.status === 'in_progress' ? 'contained' : 'outlined'}
                    onPress={() => handleStatusChange(selectedTask.id, 'in_progress')}
                    style={[styles.statusButton, { borderColor: '#EAB308' }]}
                    textColor={selectedTask.status === 'in_progress' ? 'white' : '#EAB308'}
                    disabled={selectedTask.status === 'in_progress'}
                  >
                    In Bearbeitung
                  </Button>
                  <Button
                    mode={selectedTask.status === 'done' ? 'contained' : 'outlined'}
                    onPress={() => handleStatusChange(selectedTask.id, 'done')}
                    style={[styles.statusButton, { borderColor: '#10B981' }]}
                    textColor={selectedTask.status === 'done' ? 'white' : '#10B981'}
                    disabled={selectedTask.status === 'done'}
                  >
                    Erledigt
                  </Button>
                </View>
              </View>
              
              <Text style={styles.sectionLabel}>Beschreibung:</Text>
              <Text style={styles.description}>{selectedTask.description || 'Keine Beschreibung vorhanden'}</Text>
              
              <View style={styles.detailsSection}>
                {selectedTask.branch && (
                  <Text style={styles.detailText}>Branch: {selectedTask.branch.name}</Text>
                )}
                
                {selectedTask.responsible && (
                  <Text style={styles.detailText}>
                    Verantwortlich: {selectedTask.responsible.firstName} {selectedTask.responsible.lastName}
                  </Text>
                )}
                
                {selectedTask.dueDate && (
                  <Text style={styles.detailText}>
                    Fällig am: {new Date(selectedTask.dueDate).toLocaleDateString('de-DE')}
                  </Text>
                )}
              </View>
              
              <Button
                mode="contained"
                onPress={() => setShowTaskDetailsModal(false)}
                style={styles.closeButton}
              >
                Schließen
              </Button>
            </View>
          )}
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionLabel: {
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  statusSection: {
    marginBottom: 16,
  },
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  statusButton: {
    marginVertical: 4,
    flex: 1,
    marginHorizontal: 4,
  },
  description: {
    marginBottom: 16,
  },
  detailsSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  detailText: {
    marginBottom: 8,
    color: '#666',
  },
  closeButton: {
    marginTop: 16,
  },
});

export default TaskScreen; 