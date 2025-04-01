/**
 * TimeTrackerBox Komponente
 * Stellt die Zeiterfassungsbox dar, die am unteren Bildschirmrand fixiert ist
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button, IconButton } from 'react-native-paper';
import { Branch, MobileWorkTime } from '../types';
import { formatTime, calculateDuration } from '../utils/dateUtils';
import SwipeButton from './SwipeButton';

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
  // State für die lokale Timer-Anzeige
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

  // Timer-Aktualisierung
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (currentWorkTime?.startTime) {
      // Initial die Zeit berechnen
      const updateElapsedTime = () => {
        const now = new Date();
        const startTime = new Date(currentWorkTime.startTime);
        const diff = now.getTime() - startTime.getTime();
        
        // Berechnung mit Millisekunden
        const totalSeconds = Math.floor(diff / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      };

      // Initial ausführen
      updateElapsedTime();
      
      // Timer starten
      intervalId = setInterval(updateElapsedTime, 1000);
    } else {
      setElapsedTime('00:00:00');
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentWorkTime]);

  // Handler für Slider-Confirmation
  const handleSliderConfirm = () => {
    if (currentWorkTime) {
      onStopTimer();
    } else {
      onStartTimer();
    }
  };

  return (
    <View style={styles.container}>
      {currentWorkTime ? (
        <View style={styles.activeTimer}>
          <View style={styles.timerInfo}>
            <Text style={styles.timerText}>Timer läuft seit {formatTime(currentWorkTime.startTime)}</Text>
            <Text style={styles.durationText}>{elapsedTime}</Text>
            <Text style={styles.branchText}>
              {currentWorkTime.branch?.name || 'Unbekannte Niederlassung'}
            </Text>
          </View>
          
          <View style={styles.controlsContainer}>
            <SwipeButton 
              onSwipeComplete={handleSliderConfirm}
              isTimerRunning={!!currentWorkTime}
              text={currentWorkTime ? "Zum Stoppen ziehen" : "Zum Starten ziehen"}
              disabled={isLoading || startLoading || stopLoading || branches.length === 0}
            />
            
            <IconButton
              icon="history"
              size={24}
              onPress={onShowWorkTimeList}
              disabled={isLoading}
              accessibilityLabel="Zeiteinträge anzeigen"
              style={styles.historyButton}
            />
          </View>
        </View>
      ) : (
        <View style={styles.startTimer}>
          <View style={styles.controlsContainer}>
            <SwipeButton 
              onSwipeComplete={handleSliderConfirm}
              isTimerRunning={!!currentWorkTime}
              text={currentWorkTime ? "Zum Stoppen ziehen" : "Zum Starten ziehen"}
              disabled={isLoading || startLoading || stopLoading || branches.length === 0}
            />
            
            <IconButton
              icon="history"
              size={24}
              onPress={onShowWorkTimeList}
              disabled={isLoading}
              accessibilityLabel="Zeiteinträge anzeigen"
              style={styles.historyButton}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  activeTimer: {
    flexDirection: 'column',
    gap: 12,
  },
  timerInfo: {
    flexDirection: 'column',
    gap: 4,
  },
  timerText: {
    fontSize: 14,
    color: '#4B5563',
  },
  durationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  branchText: {
    fontSize: 14,
    color: '#6B7280',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  startTimer: {
    flexDirection: 'column',
    gap: 12,
  },
  historyButton: {
    marginLeft: 4,
  }
});

export default TimeTrackerBox; 