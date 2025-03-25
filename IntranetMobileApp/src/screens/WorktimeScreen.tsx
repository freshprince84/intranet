/**
 * Worktime-Screen
 * Ermöglicht die Zeiterfassung und -verwaltung
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { Button, Card, FAB, Dialog, TextInput, Portal, Modal, Menu, Divider, Chip } from 'react-native-paper';
import { format, differenceInSeconds, intervalToDuration, formatDuration } from 'date-fns';
import { de } from 'date-fns/locale';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { worktimeApi, branchApi } from '../api/apiClient';
import { Branch, WorkTime } from '../types';
import NoDataPlaceholder from '../components/NoDataPlaceholder';
import LoadingOverlay from '../components/LoadingOverlay';
import { 
  formatDateTime, 
  calculateDuration, 
  utcToLocalDate, 
  localToUTCString
} from '../utils/dateUtils';

// Offline-Daten-Key
const OFFLINE_WORKTIME_KEY = '@IntranetApp:offlineWorktime';

const WorktimeScreen = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentWorkTime, setCurrentWorkTime] = useState<WorkTime | null>(null);
  const [workTimes, setWorkTimes] = useState<WorkTime[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [startLoading, setStartLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);
  
  // Daten laden, wenn Komponente gemountet wird
  useEffect(() => {
    setupScreen();
  }, []);
  
  // Hauptinitialisierungsfunktion
  const setupScreen = async () => {
    setIsLoading(true);
    setLoadingMessage('Daten werden geladen...');
    
    try {
      // Branches laden
      await loadBranches();
      
      // Arbeitszeitdaten laden
      await loadWorkTimes();
      
      // Prüfen, ob ein Timer läuft
      await checkRunningTimer();
      
      setIsOffline(false);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      setIsOffline(true);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };
  
  // Pull-to-Refresh Funktion
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await setupScreen();
    } finally {
      setIsRefreshing(false);
    }
  }, []);
  
  /**
   * Lädt die verfügbaren Niederlassungen
   */
  const loadBranches = async () => {
    try {
      const response = await branchApi.getAll();
      const branchData = response.data;
      console.log('Geladene Niederlassungen:', branchData);
      
      setBranches(branchData);
      
      // Standard-Niederlassung auswählen, falls noch keine ausgewählt ist
      if (branchData.length > 0 && !selectedBranch) {
        setSelectedBranch(branchData[0]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Niederlassungen:', error);
      
      // Fallback auf Mock-Daten
      const mockBranches = [
        { id: 1, name: 'Hauptsitz' },
        { id: 2, name: 'Filiale A' },
        { id: 3, name: 'Filiale B' },
      ];
      
      setBranches(mockBranches);
      
      if (!selectedBranch) {
        setSelectedBranch(mockBranches[0]);
      }
      
      throw error; // Weitergeben für übergeordnete Fehlerbehandlung
    }
  };
  
  /**
   * Lädt Arbeitszeitdaten vom Backend
   */
  const loadWorkTimes = async () => {
    setLoadingMessage('Arbeitszeiten werden geladen...');
    try {
      // Vom Backend laden
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const response = await worktimeApi.getByDate(formattedDate);
      console.log('Arbeitszeiten vom Server:', response);
      
      // Zeiten in lokales Format konvertieren
      const processedTimes = response.map((worktime: WorkTime) => ({
        ...worktime,
        // Zeitzonenkonversion durchführen (nur wenn es ein String ist)
        startTime: typeof worktime.startTime === 'string' 
          ? utcToLocalDate(worktime.startTime)
          : worktime.startTime,
        endTime: worktime.endTime && typeof worktime.endTime === 'string'
          ? utcToLocalDate(worktime.endTime)
          : worktime.endTime
      }));
      
      setWorkTimes(processedTimes);
      
      // Offline-Daten laden und zusammenführen
      const offlineData = await loadOfflineWorkTimes();
      if (offlineData && offlineData.length > 0) {
        console.log('Offline-Arbeitszeiten:', offlineData);
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
      
      throw error; // Weitergeben für übergeordnete Fehlerbehandlung
    }
  };
  
  /**
   * Prüft, ob aktuell ein Timer läuft
   */
  const checkRunningTimer = async () => {
    setLoadingMessage('Aktiver Timer wird geprüft...');
    try {
      // Zuerst lokalen Speicher prüfen
      const storedTimer = await AsyncStorage.getItem('@IntranetApp:currentTimer');
      if (storedTimer) {
        const timer = JSON.parse(storedTimer);
        
        // Wenn der Timer aus dem Speicher kommt, in Date umwandeln
        if (typeof timer.startTime === 'string') {
          timer.startTime = new Date(timer.startTime);
        }
        if (timer.endTime && typeof timer.endTime === 'string') {
          timer.endTime = new Date(timer.endTime);
        }
        
        setCurrentWorkTime(timer);
        setIsTimerRunning(true);
        return;
      }
      
      // Dann Backend prüfen
      if (!isOffline) {
        try {
          const response = await worktimeApi.getActive();
          console.log('Aktiver Timer vom Server:', response);
          
          // Wenn ein aktiver Timer gefunden wurde und 'active' ist true
          if (response && response.active) {
            // Zeitzone korrigieren
            const activeWorktime = {
              ...response,
              // Nach lokal konvertieren
              startTime: utcToLocalDate(response.startTime)
            };
            
            setCurrentWorkTime(activeWorktime);
            setIsTimerRunning(true);
            
            // Speichere auch lokal für Offline-Zugriff
            await AsyncStorage.setItem('@IntranetApp:currentTimer', JSON.stringify(activeWorktime));
          }
        } catch (error) {
          console.error('Fehler beim Prüfen des aktiven Timers:', error);
        }
      }
    } catch (error) {
      console.error('Fehler beim Prüfen des laufenden Timers:', error);
      throw error; // Weitergeben für übergeordnete Fehlerbehandlung
    }
  };
  
  /**
   * Lädt Offline-Arbeitszeitdaten
   */
  const loadOfflineWorkTimes = async (): Promise<WorkTime[]> => {
    try {
      const offlineData = await AsyncStorage.getItem(OFFLINE_WORKTIME_KEY);
      if (!offlineData) return [];
      
      const parsedData = JSON.parse(offlineData);
      
      // Date-Strings in Date-Objekte umwandeln
      return parsedData.map((item: WorkTime) => ({
        ...item,
        startTime: new Date(item.startTime),
        endTime: item.endTime ? new Date(item.endTime) : null
      }));
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
      Alert.alert('Fehler', 'Die Offline-Daten konnten nicht gespeichert werden.');
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
    
    setStartLoading(true);
    try {
      // Online-Modus: starte Timer auf dem Server
      if (!isOffline) {
        try {
          const response = await worktimeApi.start(selectedBranch.id);
          console.log('Timer gestartet:', response);
          
          // Speichere auch lokal für Offline-Zugriff
          const activeWorktime = {
            ...response,
            startTime: utcToLocalDate(response.startTime)
          };
          
          await AsyncStorage.setItem('@IntranetApp:currentTimer', JSON.stringify(activeWorktime));
          setCurrentWorkTime(activeWorktime);
          setIsTimerRunning(true);
        } catch (error) {
          console.error('Fehler beim Starten des Timers:', error);
          Alert.alert('Fehler', 'Der Timer konnte nicht gestartet werden. Versuche es im Offline-Modus.');
          setIsOffline(true);
          // Im Fehlerfall Offline-Timer erstellen
          await createOfflineTimer();
        }
      } else {
        // Offline-Modus: lokalen Timer erstellen
        await createOfflineTimer();
      }
    } catch (error) {
      console.error('Fehler beim Starten des Timers:', error);
      Alert.alert('Fehler', 'Der Timer konnte nicht gestartet werden.');
    } finally {
      setStartLoading(false);
    }
  };
  
  /**
   * Erstellt einen Offline-Timer
   */
  const createOfflineTimer = async () => {
    // Neuen Zeiteintrag erstellen mit aktueller lokaler Zeit
    const newWorkTime: WorkTime = {
      startTime: new Date(),
      branchId: selectedBranch?.id || 1,
      userId: user?.id,
      offline: true
    };
    
    // In lokalen Speicher schreiben
    setCurrentWorkTime(newWorkTime);
    await AsyncStorage.setItem('@IntranetApp:currentTimer', JSON.stringify(newWorkTime));
    
    // UI aktualisieren
    setIsTimerRunning(true);
    setIsOffline(true);
    
    // Erfolgsmeldung
    Alert.alert('Hinweis', 'Zeiterfassung im Offline-Modus gestartet. Die Daten werden synchronisiert, sobald eine Verbindung verfügbar ist.');
  };
  
  /**
   * Stoppt Timer für Zeiterfassung
   */
  const stopTimer = async (notes: string = '') => {
    if (!currentWorkTime) return;
    
    setStopLoading(true);
    try {
      // Aktuelle Zeit als Endzeit
      const endTime = new Date();
      
      // Online-Modus und Timer hat eine ID: stoppt auf dem Server
      if (!isOffline && currentWorkTime.id) {
        try {
          const response = await worktimeApi.stop(currentWorkTime.id, notes);
          console.log('Timer gestoppt:', response);
          
          // Entferne den lokalen Timer
          await AsyncStorage.removeItem('@IntranetApp:currentTimer');
          
          // Aktualisiere Anzeige
          setCurrentWorkTime(null);
          setIsTimerRunning(false);
          
          // Lade Arbeitszeiten neu
          await loadWorkTimes();
        } catch (error) {
          console.error('Fehler beim Stoppen des Timers:', error);
          Alert.alert('Fehler', 'Der Timer konnte nicht gestoppt werden. Wird offline gespeichert.');
          
          // Im Fehlerfall als beendet markieren und offline speichern
          const endedWorkTime = {
            ...currentWorkTime,
            endTime,
            notes,
            synced: false
          };
          
          await handleOfflineStop(endedWorkTime);
        }
      } else {
        // Offline-Modus oder lokaler Timer ohne ID
        const endedWorkTime = {
          ...currentWorkTime,
          endTime,
          notes,
          synced: false
        };
        
        await handleOfflineStop(endedWorkTime);
      }
    } catch (error) {
      console.error('Fehler beim Stoppen des Timers:', error);
      Alert.alert('Fehler', 'Der Timer konnte nicht gestoppt werden.');
    } finally {
      setStopLoading(false);
    }
  };
  
  /**
   * Behandelt das Stoppen eines Timers im Offline-Modus
   */
  const handleOfflineStop = async (endedWorkTime: WorkTime) => {
    // Offline-Daten laden
    const offlineWorkTimes = await loadOfflineWorkTimes();
    
    // Beendeten Timer hinzufügen
    offlineWorkTimes.push(endedWorkTime);
    
    // Offline-Daten speichern
    await saveOfflineWorkTimes(offlineWorkTimes);
    
    // UI aktualisieren
    setWorkTimes(prevTimes => [...prevTimes, endedWorkTime]);
    setIsOffline(true);
    
    // Hinweis anzeigen
    Alert.alert('Hinweis', 'Zeiterfassung im Offline-Modus gestoppt. Die Daten werden synchronisiert, sobald eine Verbindung verfügbar ist.');
  };
  
  /**
   * Synchronisiert Offline-Daten mit dem Server
   */
  const syncOfflineData = async () => {
    // Offline-Daten laden
    const offlineData = await loadOfflineWorkTimes();
    
    if (offlineData.length === 0) {
      Alert.alert('Info', 'Keine Offline-Daten zum Synchronisieren vorhanden.');
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage('Offline-Daten werden synchronisiert...');
    
    try {
      // Offline-Daten für API vorbereiten
      const apiEntries = offlineData.map(entry => ({
        ...entry,
        // Lokale Zeit zu UTC ISO-String umwandeln
        startTime: localToUTCString(new Date(entry.startTime)),
        endTime: entry.endTime ? localToUTCString(new Date(entry.endTime)) : null
      }));
      
      // Sende alle Offline-Einträge zur Synchronisierung
      await worktimeApi.syncOfflineEntries(apiEntries);
      
      // Lösche die synchronisierten Daten aus dem Offline-Speicher
      await AsyncStorage.setItem(OFFLINE_WORKTIME_KEY, JSON.stringify([]));
      
      // Lade die aktuellen Daten neu
      await loadWorkTimes();
      
      // Setze Offline-Status zurück
      setIsOffline(false);
      
      Alert.alert('Erfolg', 'Offline-Daten wurden erfolgreich synchronisiert.');
    } catch (error) {
      console.error('Fehler bei der Synchronisierung:', error);
      Alert.alert('Fehler', 'Die Synchronisierung ist fehlgeschlagen. Bitte versuche es später erneut.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };
  
  /**
   * Rendert einen Arbeitszeitdatensatz
   */
  const renderWorkTimeItem = ({ item }: { item: WorkTime }) => (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{formatDateTime(item.startTime)}</Text>
          {item.offline && <Chip icon="cloud-off-outline">Offline</Chip>}
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.workTimeDetails}>
          <View>
            <Text variant="labelSmall">Start</Text>
            <Text>{formatDateTime(item.startTime)}</Text>
          </View>
          
          <View>
            <Text variant="labelSmall">Ende</Text>
            <Text>{item.endTime ? formatDateTime(item.endTime) : '-'}</Text>
          </View>
          
          <View>
            <Text variant="labelSmall">Dauer</Text>
            <Text>{calculateDuration(item.startTime, item.endTime)}</Text>
          </View>
        </View>
        
        {item.branch && (
          <Text variant="bodySmall" style={styles.branchText}>
            Niederlassung: {item.branch.name}
          </Text>
        )}
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
                <Text variant="titleMedium">{formatDateTime(currentWorkTime?.startTime || new Date())}</Text>
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
            onPress={isTimerRunning ? () => stopTimer() : startTimer}
            loading={startLoading || stopLoading}
            disabled={startLoading || stopLoading}
            icon={isTimerRunning ? "stop-circle" : "play-circle"}
            style={styles.actionButton}
          >
            {isTimerRunning ? 'Timer stoppen' : 'Timer starten'}
          </Button>
        </Card.Content>
      </Card>
      
      {/* Arbeitszeitliste */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text variant="titleMedium">Letzte Einträge</Text>
          {isLoading && <ActivityIndicator size="small" />}
        </View>
        
        {/* Lade-Status */}
        {loadingMessage ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>{loadingMessage}</Text>
          </View>
        ) : (
          <FlatList
            data={workTimes}
            renderItem={renderWorkTimeItem}
            keyExtractor={(item, index) => `worktime-${item.id || index}`}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={['#3B82F6']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Text>Keine Einträge gefunden</Text>
              </View>
            }
          />
        )}
      </View>
      
      {/* FAB für Synchronisierung im Offline-Modus */}
      {isOffline && (
        <FAB
          icon="sync"
          style={styles.fab}
          onPress={syncOfflineData}
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
  branchText: {
    marginTop: 8,
    color: '#666',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#3B82F6',
  },
});

export default WorktimeScreen; 