/**
 * Worktime-Screen
 * Ermöglicht die Zeiterfassung und -verwaltung
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Button, Card, Divider, Chip, ActivityIndicator, FAB } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { worktimeApi } from '../api/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Offline-Daten-Key
const OFFLINE_WORKTIME_KEY = '@IntranetApp:offlineWorktime';

// Typen für die Arbeitszeitdaten
interface WorkTime {
  id?: number;
  startTime: Date;
  endTime?: Date | null;
  userId?: number;
  branchId: number;
  offline?: boolean;
}

interface Branch {
  id: number;
  name: string;
}

const WorktimeScreen = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentWorkTime, setCurrentWorkTime] = useState<WorkTime | null>(null);
  const [workTimes, setWorkTimes] = useState<WorkTime[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  
  // Demo-Branches (sollten später vom API geladen werden)
  useEffect(() => {
    // Mock-Daten für Demo
    setBranches([
      { id: 1, name: 'Hauptsitz' },
      { id: 2, name: 'Filiale A' },
      { id: 3, name: 'Filiale B' },
    ]);
    
    setSelectedBranch({ id: 1, name: 'Hauptsitz' });
    
    // Daten laden
    loadWorkTimes();
    
    // Prüfen, ob ein Timer läuft
    checkRunningTimer();
  }, []);
  
  /**
   * Lädt Arbeitszeitdaten vom Backend
   */
  const loadWorkTimes = async () => {
    setIsLoading(true);
    try {
      // Vom Backend laden
      const response = await worktimeApi.getAll();
      setWorkTimes(response.data);
      
      // Offline-Daten laden und zusammenführen
      const offlineData = await loadOfflineWorkTimes();
      if (offlineData && offlineData.length > 0) {
        setWorkTimes(prevTimes => [...prevTimes, ...offlineData]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Arbeitszeiten:', error);
      // Bei Netzwerkfehler nur Offline-Daten laden
      const offlineData = await loadOfflineWorkTimes();
      if (offlineData) {
        setWorkTimes(offlineData);
        setIsOffline(true);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Prüft, ob aktuell ein Timer läuft
   */
  const checkRunningTimer = async () => {
    try {
      // Zuerst lokalen Speicher prüfen
      const storedTimer = await AsyncStorage.getItem('@IntranetApp:currentTimer');
      if (storedTimer) {
        const timer = JSON.parse(storedTimer);
        setCurrentWorkTime(timer);
        setIsTimerRunning(true);
        return;
      }
      
      // Dann Backend prüfen
      // Hier würde API-Logik implementiert
    } catch (error) {
      console.error('Fehler beim Prüfen des laufenden Timers:', error);
    }
  };
  
  /**
   * Lädt Offline-Arbeitszeitdaten
   */
  const loadOfflineWorkTimes = async (): Promise<WorkTime[]> => {
    try {
      const offlineData = await AsyncStorage.getItem(OFFLINE_WORKTIME_KEY);
      return offlineData ? JSON.parse(offlineData) : [];
    } catch (error) {
      console.error('Fehler beim Laden der Offline-Daten:', error);
      return [];
    }
  };
  
  /**
   * Speichert Offline-Arbeitszeitdaten
   */
  const saveOfflineWorkTimes = async (data: WorkTime[]) => {
    try {
      await AsyncStorage.setItem(OFFLINE_WORKTIME_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Fehler beim Speichern der Offline-Daten:', error);
    }
  };
  
  /**
   * Startet Timer für Zeiterfassung
   */
  const startTimer = async () => {
    if (!selectedBranch) {
      Alert.alert('Fehler', 'Bitte wähle eine Niederlassung aus.');
      return;
    }
    
    setIsLoading(true);
    try {
      // Neuen Zeiteintrag erstellen
      const newWorkTime: WorkTime = {
        startTime: new Date(),
        branchId: selectedBranch.id,
        userId: user?.id,
      };
      
      // Online/Offline-Handling
      if (isOffline) {
        // Offline-Speicherung
        newWorkTime.offline = true;
        setCurrentWorkTime(newWorkTime);
        
        // In AsyncStorage speichern
        await AsyncStorage.setItem('@IntranetApp:currentTimer', JSON.stringify(newWorkTime));
        
        // Statusaktualisierung
        setIsTimerRunning(true);
      } else {
        // Online an API senden
        try {
          const response = await worktimeApi.start(selectedBranch.id);
          const serverWorkTime = response.data;
          setCurrentWorkTime(serverWorkTime);
          
          // Zusätzlich lokal speichern für Offline-Fallback
          await AsyncStorage.setItem('@IntranetApp:currentTimer', JSON.stringify(serverWorkTime));
          
          // Statusaktualisierung
          setIsTimerRunning(true);
        } catch (error) {
          // Bei API-Fehler: Fallback auf Offline-Modus
          console.error('API-Fehler beim Starten des Timers:', error);
          newWorkTime.offline = true;
          setCurrentWorkTime(newWorkTime);
          
          await AsyncStorage.setItem('@IntranetApp:currentTimer', JSON.stringify(newWorkTime));
          setIsTimerRunning(true);
          setIsOffline(true);
        }
      }
    } catch (error) {
      console.error('Fehler beim Starten des Timers:', error);
      Alert.alert('Fehler', 'Der Timer konnte nicht gestartet werden.');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Stoppt laufenden Timer
   */
  const stopTimer = async () => {
    if (!currentWorkTime) {
      Alert.alert('Fehler', 'Kein laufender Timer gefunden.');
      return;
    }
    
    setIsLoading(true);
    try {
      // Timer mit Endzeit aktualisieren
      const endedWorkTime = {
        ...currentWorkTime,
        endTime: new Date(),
      };
      
      if (isOffline || currentWorkTime.offline) {
        // Offline-Modus: Lokal speichern für spätere Synchronisierung
        const offlineWorkTimes = await loadOfflineWorkTimes();
        offlineWorkTimes.push(endedWorkTime);
        await saveOfflineWorkTimes(offlineWorkTimes);
        
        // UI aktualisieren
        setWorkTimes(prevTimes => [...prevTimes, endedWorkTime]);
      } else {
        // Online an API senden
        try {
          if (currentWorkTime.id) {
            await worktimeApi.stop(currentWorkTime.id);
            // Zeitliste neu laden
            await loadWorkTimes();
          }
        } catch (error) {
          // Bei API-Fehler: Fallback auf Offline-Modus
          console.error('API-Fehler beim Stoppen des Timers:', error);
          
          const offlineWorkTimes = await loadOfflineWorkTimes();
          offlineWorkTimes.push(endedWorkTime);
          await saveOfflineWorkTimes(offlineWorkTimes);
          
          setWorkTimes(prevTimes => [...prevTimes, endedWorkTime]);
          setIsOffline(true);
        }
      }
      
      // Timer-Status zurücksetzen
      await AsyncStorage.removeItem('@IntranetApp:currentTimer');
      setCurrentWorkTime(null);
      setIsTimerRunning(false);
    } catch (error) {
      console.error('Fehler beim Stoppen des Timers:', error);
      Alert.alert('Fehler', 'Der Timer konnte nicht gestoppt werden.');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Formatiert Datum für die Anzeige
   */
  const formatDate = (date: Date | string) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  };
  
  /**
   * Berechnet Dauer zwischen Start- und Endzeit
   */
  const calculateDuration = (start: Date | string, end: Date | string | null | undefined) => {
    if (!end) return '';
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}min`;
  };
  
  /**
   * Rendert einen Arbeitszeitdatensatz
   */
  const renderWorkTimeItem = ({ item }: { item: WorkTime }) => (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{formatDate(item.startTime)}</Text>
          {item.offline && <Chip icon="cloud-off-outline">Offline</Chip>}
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.workTimeDetails}>
          <View>
            <Text variant="labelSmall">Start</Text>
            <Text>{formatDate(item.startTime)}</Text>
          </View>
          
          <View>
            <Text variant="labelSmall">Ende</Text>
            <Text>{item.endTime ? formatDate(item.endTime) : '-'}</Text>
          </View>
          
          <View>
            <Text variant="labelSmall">Dauer</Text>
            <Text>{calculateDuration(item.startTime, item.endTime)}</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
  
  return (
    <View style={styles.container}>
      {/* Status-Bereich */}
      <Card style={styles.statusCard}>
        <Card.Content>
          <Text variant="titleLarge">Zeiterfassung</Text>
          {isOffline && (
            <Chip 
              icon="cloud-off-outline" 
              style={styles.offlineChip}
            >
              Offline-Modus
            </Chip>
          )}
          
          <View style={styles.timerStatus}>
            {isTimerRunning ? (
              <>
                <Text variant="labelSmall">Laufende Zeit seit:</Text>
                <Text variant="titleMedium">{formatDate(currentWorkTime?.startTime || new Date())}</Text>
                <Text variant="bodyMedium">
                  Niederlassung: {branches.find(b => b.id === currentWorkTime?.branchId)?.name || 'Unbekannt'}
                </Text>
              </>
            ) : (
              <Text variant="bodyMedium">Kein aktiver Timer</Text>
            )}
          </View>
          
          <Button 
            mode={isTimerRunning ? "outlined" : "contained"}
            onPress={isTimerRunning ? stopTimer : startTimer}
            loading={isLoading}
            disabled={isLoading}
            icon={isTimerRunning ? "stop-circle" : "play-circle"}
            style={styles.actionButton}
          >
            {isTimerRunning ? "Zeiterfassung stoppen" : "Zeiterfassung starten"}
          </Button>
        </Card.Content>
      </Card>
      
      {/* Arbeitszeitliste */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text variant="titleMedium">Letzte Einträge</Text>
          {isLoading && <ActivityIndicator size="small" />}
        </View>
        
        <FlatList
          data={workTimes}
          renderItem={renderWorkTimeItem}
          keyExtractor={(item, index) => `worktime-${item.id || index}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text>Keine Einträge gefunden</Text>
            </View>
          }
        />
      </View>
      
      {/* FAB für Synchronisierung im Offline-Modus */}
      {isOffline && (
        <FAB
          icon="sync"
          style={styles.fab}
          onPress={() => loadWorkTimes()}
          label="Synchronisieren"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  statusCard: {
    marginBottom: 16,
  },
  timerStatus: {
    marginVertical: 16,
  },
  actionButton: {
    marginTop: 8,
  },
  listContainer: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 16,
  },
  card: {
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 8,
  },
  workTimeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyList: {
    padding: 16,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  offlineChip: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
});

export default WorktimeScreen; 