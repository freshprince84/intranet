/**
 * TaskCard-Komponente
 * Zeigt eine einzelne Aufgabe in einer Karte an
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Chip, Divider } from 'react-native-paper';
import { Task } from '../types';
import { formatDate } from '../utils/dateUtils';

export interface TaskCardProps {
  task: Task;
  onPress?: (task: Task) => void;
  visibleColumns?: string[];
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onPress, visibleColumns = ['title', 'status', 'dueDate', 'responsible'] }) => {
  // Hilfsfunktion, um zu prüfen ob eine Spalte sichtbar sein soll
  const isColumnVisible = (columnName: string): boolean => {
    return visibleColumns.includes(columnName);
  };
  
  // Statusfarbe basierend auf dem Status
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'open':
        return '#3B82F6'; // Blau
      case 'in_progress':
        return '#EAB308'; // Gelb
      case 'done':
        return '#10B981'; // Grün
      default:
        return '#9CA3AF'; // Grau
    }
  };
  
  // Statustext basierend auf dem Status
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'open':
        return 'Offen';
      case 'in_progress':
        return 'In Bearbeitung';
      case 'improval':
        return 'Nachbesserung';
      case 'quality_control':
        return 'Qualitätskontrolle';
      case 'done':
        return 'Erledigt';
      default:
        return 'Unbekannt';
    }
  };
  
  return (
    <Card
      style={styles.card}
      onPress={() => onPress && onPress(task)}
      mode="outlined"
    >
      <Card.Content style={styles.content}>
        {isColumnVisible('title') && (
          <Text style={styles.title} numberOfLines={1}>{task.title}</Text>
        )}
        
        {isColumnVisible('status') && (
          <Chip
            style={[styles.statusChip, { backgroundColor: getStatusColor(task.status) }]}
            textStyle={{ color: 'white', fontWeight: '600', fontSize: 12 }}
          >
            {getStatusText(task.status)}
          </Chip>
        )}
        
        {isColumnVisible('description') && task.description && (
          <Text style={styles.description} numberOfLines={2}>
            {task.description}
          </Text>
        )}
        
        <Divider style={styles.divider} />
        
        <View style={styles.footer}>
          {isColumnVisible('dueDate') && task.dueDate && (
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Fällig:</Text>
              <Text style={styles.footerValue}>{formatDate(new Date(task.dueDate))}</Text>
            </View>
          )}
          
          {isColumnVisible('responsible') && task.responsible && (
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Verantw.:</Text>
              <Text style={styles.footerValue}>
                {task.responsible.firstName} {task.responsible.lastName}
              </Text>
            </View>
          )}
          
          {isColumnVisible('branch') && task.branch && (
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Branch:</Text>
              <Text style={styles.footerValue}>{task.branch.name}</Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
    marginHorizontal: 0,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  description: {
    marginTop: 8,
    marginBottom: 10,
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    marginVertical: 10,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  footerItem: {
    flexDirection: 'row',
    marginRight: 12,
    marginBottom: 4,
  },
  footerLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginRight: 4,
  },
  footerValue: {
    fontSize: 12,
    fontWeight: '400',
    color: '#1F2937',
  },
});

export default TaskCard; 