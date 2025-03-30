/**
 * TimeTrackerBox Komponente
 * Stellt die Zeiterfassungsbox dar, die am unteren Bildschirmrand fixiert ist
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { Branch, MobileWorkTime } from '../types';
import { formatTime, calculateDuration } from '../utils/dateUtils';
import SlideToConfirm from './SlideToConfirm';

interface TimeTrackerBoxProps {
  currentWorkTime: MobileWorkTime | null;
  branches: Branch[];
  onSlideConfirm: () => void;
  onShowWorkTimeList: () => void;
  isLoading: boolean;
  startLoading?: boolean;
  stopLoading?: boolean;
}

const TimeTrackerBox: React.FC<TimeTrackerBoxProps> = ({
  currentWorkTime,
  branches,
  onSlideConfirm,
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
        const startTimeDate = currentWorkTime.startTime instanceof Date
          ? currentWorkTime.startTime
          : new Date(currentWorkTime.startTime);

        if (isNaN(startTimeDate.getTime())) {
          console.error("Ungültiges startTime in TimeTrackerBox:", currentWorkTime.startTime);
          setElapsedTime('Error');
          return;
        }

        const diff = now.getTime() - startTimeDate.getTime();
        
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
          <View style={styles.sliderButtonRow}>
            <View style={styles.sliderWrapper}>
              <SlideToConfirm
                onConfirm={onSlideConfirm}
                isTimerRunning={true}
              />
            </View>
            <Button
              mode="outlined"
              icon="history"
              onPress={onShowWorkTimeList}
              disabled={isLoading}
              style={styles.listButton}
              contentStyle={styles.listButtonContent}
              labelStyle={styles.listButtonLabel}
            >
              Zeiten
            </Button>
          </View>
        </View>
      ) : (
        <View style={styles.startTimer}>
          <View style={styles.sliderButtonRow}>
            <View style={styles.sliderWrapper}>
              <SlideToConfirm
                onConfirm={onSlideConfirm}
                isTimerRunning={false}
              />
            </View>
            <Button
              mode="outlined"
              icon="history"
              onPress={onShowWorkTimeList}
              disabled={isLoading}
              style={styles.listButton}
              contentStyle={styles.listButtonContent}
              labelStyle={styles.listButtonLabel}
            >
              Zeiten
            </Button>
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
    gap: 12,
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
  startTimer: {
    flexDirection: 'column',
    gap: 12,
  },
  sliderButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderWrapper: {
    flex: 1,
  },
  listButton: {
    borderColor: '#3B82F6',
    borderWidth: 1.5,
    borderRadius: 20,
  },
  listButtonContent: {
    height: 40,
    paddingHorizontal: 8,
  },
  listButtonLabel: {
    fontSize: 12,
    marginHorizontal: 0,
    marginLeft: 0,
  }
});

export default TimeTrackerBox; 