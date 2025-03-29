/**
 * TaskScreen
 * Screen für die Anzeige und Verwaltung von Aufgaben (Tasks)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Portal, Modal, Text, TextInput, Button } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { Task, ModalMode } from '../types';
import TaskList from '../components/TaskList';
import TaskDetailModal from '../components/TaskDetailModal';
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
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showTaskDetailsModal, setShowTaskDetailsModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(ModalMode.VIEW);
  
  // Lade Tasks beim Mounten der Komponente
  useEffect(() => {
    loadTasks();
  }, []);
  
  const loadTasks = async () => {
    if (!netInfo.isConnected) {
      setError('Keine Internetverbindung verfügbar');
      setIsLoading(false);
      return;
    }
    
    try {
      const tasksData = await taskApi.getAllTasks();
      setTasks(tasksData);
      setError(null);
    } catch (error) {
      console.error('Fehler beim Laden der Tasks:', error);
      setError('Die Aufgaben konnten nicht geladen werden');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTasks();
    setIsRefreshing(false);
  };
  
  const handleTaskPress = (taskId: number) => {
    setSelectedTaskId(taskId);
    setModalMode(ModalMode.VIEW);
    setShowTaskDetailsModal(true);
  };
  
  const handleAddTask = () => {
    setSelectedTaskId(null);
    setModalMode(ModalMode.CREATE);
    setShowTaskDetailsModal(true);
  };
  
  const handleTaskUpdated = () => {
    loadTasks();
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
        onAddPress={handleAddTask}
      />
      
      <TaskDetailModal
        visible={showTaskDetailsModal}
        onDismiss={() => setShowTaskDetailsModal(false)}
        taskId={selectedTaskId}
        onTaskUpdated={handleTaskUpdated}
        mode={modalMode}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  }
});

export default TaskScreen; 