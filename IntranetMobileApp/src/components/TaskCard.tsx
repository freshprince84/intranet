/**
 * TaskCard Komponente
 * Stellt einen einzelnen Task dar
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip, IconButton } from 'react-native-paper';
import { Task, TaskStatus } from '../types';

// Status-Farben basierend auf dem Frontend
const statusColors = {
  open: '#3B82F6', // Blau
  in_progress: '#EAB308', // Gelb
  improval: '#EF4444', // Rot
  quality_control: '#8B5CF6', // Lila
  done: '#10B981' // Grün
};

// Status-Icons basierend auf dem Frontend
const statusIcons = {
  open: 'folder-open-outline',
  in_progress: 'progress-clock',
  improval: 'alert-circle-outline',
  quality_control: 'checkbox-marked-circle-outline',
  done: 'check-circle-outline'
};

// Status-Labels auf Deutsch
const statusLabels = {
  open: 'Offen',
  in_progress: 'In Bearbeitung',
  improval: 'Nachbesserung',
  quality_control: 'Qualitätskontrolle',
  done: 'Erledigt'
};

interface TaskCardProps {
  task: Task;
  onPress: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onPress }) => {
  return (
    <Card style={styles.card} onPress={() => onPress(task)}>
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleMedium" numberOfLines={1} style={styles.title}>
            {task.title}
          </Text>
          <Chip 
            icon={statusIcons[task.status]} 
            style={[styles.statusChip, { backgroundColor: `${statusColors[task.status]}20` }]}
            textStyle={{ color: statusColors[task.status] }}
          >
            {statusLabels[task.status]}
          </Chip>
        </View>
        
        <Text variant="bodyMedium" numberOfLines={2} style={styles.description}>
          {task.description || 'Keine Beschreibung'}
        </Text>
        
        <View style={styles.details}>
          {task.branch && (
            <Text variant="bodySmall" style={styles.detail}>
              Branch: {task.branch.name}
            </Text>
          )}
          
          {task.dueDate && (
            <Text variant="bodySmall" style={styles.detail}>
              Fällig: {new Date(task.dueDate).toLocaleDateString('de-DE')}
            </Text>
          )}
          
          {task.responsible && (
            <Text variant="bodySmall" style={styles.detail}>
              Verantwortlich: {task.responsible.firstName} {task.responsible.lastName}
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontWeight: 'bold',
    marginRight: 8,
  },
  statusChip: {
    height: 28,
  },
  description: {
    marginBottom: 12,
  },
  details: {
    marginTop: 8,
  },
  detail: {
    color: '#666',
    marginTop: 4,
  },
});

export default TaskCard; 