/**
 * TimeTrackerBox Komponente
 * Stellt die Zeiterfassungsbox dar, die am unteren Bildschirmrand fixiert ist
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { Branch, MobileWorkTime } from '../types';
import { formatTime, calculateDuration } from '../utils/dateUtils';

interface TimeTrackerBoxProps {
  currentWorkTime: MobileWorkTime | null;
  branches: Branch[];
  onStartTimer: () => void;
  onStopTimer: () => void;
  onShowWorkTimeList: () => void;
  isLoading: boolean;
  startLoading: boolean;
  stopLoading: boolean;
}

const TimeTrackerBox: React.FC<TimeTrackerBoxProps> = ({
  currentWorkTime,
  branches,
  onStartTimer,
  onStopTimer,
  onShowWorkTimeList,
  isLoading,
  startLoading,
  stopLoading
}) => {
  return (
    <View style={styles.container}>
      {currentWorkTime ? (
        // Laufender Timer
        <View style={styles.activeTimer}>
          <Text style={styles.timerInfo}>Laufender Timer:</Text>
          <Text style={styles.timerDetails}>
            Niederlassung: {branches.find(b => b.id === currentWorkTime?.branchId)?.name || 'Unbekannt'}
          </Text>
          <Text style={styles.timerDetails}>
            Start: {formatTime(currentWorkTime.startTime)}
          </Text>
          <Text style={styles.timerDetails}>
            Dauer: {calculateDuration(currentWorkTime.startTime, new Date().toISOString())}
          </Text>
          
          <View style={styles.buttonGroup}>
            <Button 
              mode="contained" 
              onPress={onStopTimer}
              style={styles.actionButton}
              loading={stopLoading}
              disabled={isLoading || stopLoading}
            >
              Timer stoppen
            </Button>
            
            <Button 
              mode="outlined" 
              onPress={onShowWorkTimeList}
              style={styles.actionButton}
              icon="format-list-bulleted"
              disabled={isLoading}
            >
              Zeiteinträge
            </Button>
          </View>
        </View>
      ) : (
        // Kein laufender Timer
        <View style={styles.startTimer}>
          <View style={styles.buttonGroup}>
            <Button 
              mode="contained" 
              onPress={onStartTimer}
              style={styles.actionButton}
              loading={startLoading}
              disabled={isLoading || startLoading}
            >
              Timer starten
            </Button>
            
            <Button 
              mode="outlined" 
              onPress={onShowWorkTimeList}
              style={styles.actionButton}
              icon="format-list-bulleted"
              disabled={isLoading}
            >
              Zeiteinträge
            </Button>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activeTimer: {
    paddingVertical: 8,
  },
  startTimer: {
    paddingVertical: 8,
  },
  timerInfo: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  timerDetails: {
    marginBottom: 2,
    color: '#444',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default TimeTrackerBox; 