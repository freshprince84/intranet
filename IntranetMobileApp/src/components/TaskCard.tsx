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
      <Card.Content style={styles.cardContent}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {isColumnVisible('title') && (
            <Text style={styles.title} numberOfLines={1}>{task.title}</Text>
          )}
          
          {isColumnVisible('status') && (
            <Chip
              style={[styles.chip, { backgroundColor: getStatusColor(task.status) }]}
              textStyle={{ color: 'white', fontWeight: '600', fontSize: 12 }}
            >
              {getStatusText(task.status)}
            </Chip>
          )}
        </View>
        
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
    width: '100%',
    marginVertical: 2,
    marginHorizontal: 0,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  cardContent: {
    padding: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  chip: {
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  description: {
    marginTop: 4,
    marginBottom: 6,
    color: '#4B5563',
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    marginVertical: 6,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    gap: 6,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    marginRight: 12,
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