/**
 * Worktime-Screen
 * Ermöglicht die Zeiterfassung und -verwaltung
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, ScrollView, Platform } from 'react-native';
import { Button, Card, FAB, Dialog, TextInput, Portal, Modal, Menu, Divider, Chip } from 'react-native-paper';
import { format, differenceInSeconds, intervalToDuration, formatDuration } from 'date-fns';
import { de } from 'date-fns/locale';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { worktimeApi, branchApi } from '../api/apiClient';
import { Branch, MobileWorkTime } from '../types';
import { 
  formatDateTime, 
  calculateDuration, 
  utcToLocalDate, 
  localToUTCString,
  formatDate,
  formatTime
} from '../utils/dateUtils';
import NetInfo from '@react-native-community/netinfo';

// Offline-Daten-Key
const OFFLINE_WORKTIME_KEY = '@IntranetApp:offlineWorktime';

const isOfflineCheck = async () => {
  const state = await NetInfo.fetch();
  return !state.isConnected;
};

const WorktimeScreen = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentWorkTime, setCurrentWorkTime] = useState<MobileWorkTime | null>(null);
  const [workTimes, setWorkTimes] = useState<MobileWorkTime[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [startLoading, setStartLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Daten laden, wenn Komponente gemountet wird
  useEffect(() => {
    setupScreen();
    
    // Polling alle 10 Sekunden für aktivere Synchronisierung des Timer-Status
    const statusInterval = setInterval(async () => {
      if (!isOffline) {
        try {
          // Nur den Timer-Status abfragen, ohne den ganzen Screen neu zu laden
          console.log('Timer-Status vom Backend prüfen...');
          await checkRunningTimer();
        } catch (error) {
          console.error('Fehler beim Aktualisieren des Timer-Status:', error);
        }
      }
    }, 10000); // Alle 10 Sekunden prüfen
    
    // Komplettes Neuladen alle 30 Sekunden
    const fullRefreshInterval = setInterval(setupScreen, 30000);
    
    return () => {
      clearInterval(statusInterval);
      clearInterval(fullRefreshInterval);
    };
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
      // Arbeitszeitdaten laden
      await loadWorkTimes();
      
      // Branches laden, falls nötig
      if (branches.length === 0) {
        await loadBranches();
      }
      
      // Timer-Status mit forcierter Server-Prüfung aktualisieren
      await checkRunningTimer(true);
      
      setIsOffline(false);
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error);
      setIsOffline(await isOfflineCheck());
    } finally {
      setIsRefreshing(false);
    }
  }, [branches.length]);
  
  /**
   * Lädt die verfügbaren Niederlassungen
   */
  const loadBranches = async () => {
    try {
      const branchData = await branchApi.getAll();
      console.log('Geladene Niederlassungen:', branchData);
      
      setBranches(branchData);
      
      if (branchData.length > 0 && !selectedBranch) {
        setSelectedBranch(branchData[0]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Niederlassungen:', error);
      
      // Fallback auf Mock-Daten mit isActive
      const mockBranches: Branch[] = [
        { id: 1, name: 'Hauptsitz', isActive: true },
        { id: 2, name: 'Filiale A', isActive: true },
        { id: 3, name: 'Filiale B', isActive: true },
      ];
      
      setBranches(mockBranches);
      
      if (!selectedBranch) {
        setSelectedBranch(mockBranches[0]);
      }
      
      throw error;
    }
  };
  
  /**
   * Lädt Arbeitszeitdaten vom Backend
   */
  const loadWorkTimes = async () => {
    setLoadingMessage('Arbeitszeiten werden geladen...');
    try {
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      
      const response = await worktimeApi.getByDate(formattedDate);
      
      const processedTimes = response.map((worktime: MobileWorkTime) => ({
        ...worktime,
        startTime: typeof worktime.startTime === 'string' 
          ? utcToLocalDate(worktime.startTime)
          : worktime.startTime,
        endTime: worktime.endTime && typeof worktime.endTime === 'string'
          ? utcToLocalDate(worktime.endTime)
          : worktime.endTime
      }));
      
      setWorkTimes(processedTimes);
      
      const offlineData = await loadOfflineWorkTimes();
      if (offlineData && offlineData.length > 0) {
        setWorkTimes(prevTimes => [...prevTimes, ...offlineData]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Arbeitszeiten:', error);
      const offlineData = await loadOfflineWorkTimes();
      if (offlineData) {
        setWorkTimes(offlineData);
        setIsOffline(true);
      }
      throw error;
    }
  };
  
  /**
   * Prüft, ob aktuell ein Timer läuft
   * @param forceServerCheck Wenn true, wird der Server-Status immer geprüft, auch wenn ein lokaler Timer existiert
   */
  const checkRunningTimer = async (forceServerCheck: boolean = false) => {
    setLoadingMessage('Aktiver Timer wird geprüft...');
    try {
      // Lokalen Timer laden
      const storedTimer = await AsyncStorage.getItem('@IntranetApp:currentTimer');
      let localTimer = null;
      
      if (storedTimer) {
        localTimer = JSON.parse(storedTimer);
        if (typeof localTimer.startTime === 'string') {
          localTimer.startTime = new Date(localTimer.startTime);
        }
        if (localTimer.endTime && typeof localTimer.endTime === 'string') {
          localTimer.endTime = new Date(localTimer.endTime);
        }
        
        // Prüfen, ob der lokale Timer bereits gestoppt wurde
        if (localTimer.endTime) {
          console.log('Gespeicherter Timer ist bereits gestoppt:', localTimer);
          setCurrentWorkTime(null);
          setIsTimerRunning(false);
          // Timer entfernen
          await AsyncStorage.removeItem('@IntranetApp:currentTimer');
          localTimer = null;
        }
      }

      // Server-Status prüfen, wenn wir online sind und entweder
      // 1. Kein lokaler Timer existiert, oder
      // 2. forcierte Prüfung angefordert wurde, oder
      // 3. Der lokale Timer kein Offline-Timer ist
      if (!isOffline && (!localTimer || forceServerCheck || !localTimer.offlineId)) {
        try {
          console.log('Prüfe aktive Zeiterfassung auf dem Server');
          const response = await worktimeApi.getActive();
          console.log('Active worktime response:', response);
          
          if (response && response.active && response.startTime) {
            console.log('Aktive Zeiterfassung gefunden:', response);
            
            // Stelle sicher, dass startTime ein Date-Objekt ist
            const startTimeDate = utcToLocalDate(response.startTime);
            
            // Hole Branches, falls nicht bereits geladen
            if (branches.length === 0) {
              await loadBranches();
            }
            
            // Finde die Branch des aktiven WorkTime
            const branchId = (response as any).branchId || selectedBranch?.id || 1;
            const branch = branches.find(b => b.id === branchId) || 
                          { id: branchId, name: 'Niederlassung', isActive: true };
            
            const activeWorktime: MobileWorkTime = {
              id: (response as any).id || 0,
              startTime: startTimeDate,
              branchId: branchId,
              userId: user?.id || 0,
              branch: branch,
              active: true
            };
            
            console.log('Speichere aktiven Timer vom Server:', activeWorktime);
            setCurrentWorkTime(activeWorktime);
            setIsTimerRunning(true);
            await AsyncStorage.setItem('@IntranetApp:currentTimer', JSON.stringify(activeWorktime));
          } else {
            // Keine aktive Zeiterfassung auf dem Server gefunden
            console.log('Keine aktive Zeiterfassung auf dem Server gefunden');
            
            // Falls wir einen lokalen Timer hatten, aber der Server keinen hat,
            // wurde die Zeiterfassung wahrscheinlich über das Frontend gestoppt
            if (localTimer && !localTimer.offlineId) {
              console.log('Lokaler Timer existiert, aber Server hat keine aktive Zeiterfassung: Timer wird gestoppt');
              setCurrentWorkTime(null);
              setIsTimerRunning(false);
              await AsyncStorage.removeItem('@IntranetApp:currentTimer');
            } else if (localTimer && localTimer.offlineId) {
              // Offline-Timer behalten
              console.log('Offline-Timer wird beibehalten:', localTimer);
              setCurrentWorkTime(localTimer);
              setIsTimerRunning(true);
            } else {
              // Kein Timer aktiv
              setCurrentWorkTime(null);
              setIsTimerRunning(false);
              await AsyncStorage.removeItem('@IntranetApp:currentTimer');
            }
          }
        } catch (error) {
          console.error('Fehler beim Prüfen des aktiven Timers auf dem Server:', error);
          
          // Bei Server-Fehlern behalten wir den lokalen Timer bei, falls vorhanden
          if (localTimer) {
            console.log('Lokaler Timer wird nach Server-Fehler beibehalten:', localTimer);
            setCurrentWorkTime(localTimer);
            setIsTimerRunning(true);
          }
        }
      } else if (localTimer) {
        // Wenn wir offline sind oder wir nicht zum Server verbinden konnten,
        // verwenden wir den lokalen Timer
        console.log('Verwende lokalen Timer:', localTimer);
        setCurrentWorkTime(localTimer);
        setIsTimerRunning(true);
      }
    } catch (error) {
      console.error('Fehler beim Prüfen des laufenden Timers:', error);
      throw error;
    }
  };
  
  /**
   * Lädt Offline-Arbeitszeitdaten
   */
  const loadOfflineWorkTimes = async (): Promise<MobileWorkTime[]> => {
    try {
      const offlineData = await AsyncStorage.getItem(OFFLINE_WORKTIME_KEY);
      if (!offlineData) return [];
      
      const parsedData = JSON.parse(offlineData);
      
      // Date-Strings in Date-Objekte umwandeln
      return parsedData.map((item: MobileWorkTime) => ({
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
  const saveOfflineWorkTimes = async (data: MobileWorkTime[]) => {
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
      // Prüfe Verbindungsstatus vor API-Call
      const isOfflineMode = await isOfflineCheck();
      setIsOffline(isOfflineMode);

      // Online-Modus: starte Timer auf dem Server
      if (!isOfflineMode) {
        try {
          const branchId = selectedBranch.id.toString();
          const response = await worktimeApi.start(branchId);
          
          // Speichere auch lokal für Offline-Zugriff
          // Konvertiere String zu Date für lokale Speicherung
          const startTime = typeof response.startTime === 'string'
            ? new Date(response.startTime)
            : response.startTime;

          const activeWorktime = {
            ...response,
            startTime,
            branch: selectedBranch
          };
          
          await AsyncStorage.setItem('@IntranetApp:currentTimer', JSON.stringify(activeWorktime));
          setCurrentWorkTime(activeWorktime);
          setIsTimerRunning(true);
        } catch (error) {
          console.error('Fehler beim Starten des Timers:', error);
          
          // Prüfe ob es wirklich ein Offline-Problem ist
          const isNetworkError = error instanceof Error && 
            (error.message?.includes('Network Error') || 
             error.message?.includes('timeout') || 
             error.message?.includes('connection') ||
             await isOfflineCheck());
          
          if (isNetworkError) {
            Alert.alert('Offline-Modus', 'Timer wird im Offline-Modus gestartet.');
            setIsOffline(true);
            await createOfflineTimer();
          } else {
            Alert.alert('Fehler', `Der Timer konnte nicht gestartet werden. ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
          }
        }
      } else {
        // Offline-Modus: lokalen Timer erstellen
        await createOfflineTimer();
      }
    } catch (error) {
      console.error('Fehler beim Starten des Timers:', error);
      Alert.alert('Fehler', `Der Timer konnte nicht gestartet werden. ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setStartLoading(false);
    }
  };
  
  /**
   * Erstellt einen Offline-Timer
   */
  const createOfflineTimer = async () => {
    const newWorkTime: MobileWorkTime = {
      id: Date.now(), // Temporäre ID für Offline-Einträge
      startTime: new Date(),
      branchId: selectedBranch?.id || 1,
      userId: user?.id || 0,
      offlineId: Date.now().toString(), // Offline-Identifier statt offline: true
      branch: selectedBranch || { id: 1, name: 'Hauptsitz', isActive: true }
    };
    
    setCurrentWorkTime(newWorkTime);
    await AsyncStorage.setItem('@IntranetApp:currentTimer', JSON.stringify(newWorkTime));
    setIsTimerRunning(true);
    setIsOffline(true);
    
    Alert.alert('Hinweis', 'Zeiterfassung im Offline-Modus gestartet. Die Daten werden synchronisiert, sobald eine Verbindung verfügbar ist.');
  };
  
  /**
   * Stoppt Timer für Zeiterfassung
   */
  const stopTimer = async (notes: string = '') => {
    if (!currentWorkTime) return;
    
    setStopLoading(true);
    try {
      // Prüfe Verbindungsstatus vor API-Call
      const isOfflineMode = await isOfflineCheck();
      setIsOffline(isOfflineMode);

      // Aktuelle Zeit als Endzeit - OHNE Zeitzonenkorrektur, da das Backend diese vornimmt
      const endTime = new Date();
      console.log('Stoppe Timer mit Endzeit:', endTime.toISOString());
      
      // Online-Modus und Timer nicht von offline: stoppt auf dem Server
      if (!isOfflineMode && !currentWorkTime.offlineId) {
        try {
          console.log('Stoppe Online-Timer:', currentWorkTime);
          const response = await worktimeApi.stop(endTime);
          console.log('Timer stop response:', response);
          
          // Entferne den lokalen Timer
          await AsyncStorage.removeItem('@IntranetApp:currentTimer');
          
          // Aktualisiere Anzeige
          setCurrentWorkTime(null);
          setIsTimerRunning(false);
          
          // Lade Arbeitszeiten neu
          await loadWorkTimes();
          
          // Explizit den Timer-Status vom Server neu laden mit forcierter Prüfung
          await checkRunningTimer(true);
        } catch (error: any) {
          console.error('Fehler beim Stoppen des Timers:', error);
          
          // Fehlerdetails anzeigen
          if (error.response) {
            console.error('Server-Antwort:', error.response.data);
            console.error('Status:', error.response.status);
          }
          
          // Prüfe ob es wirklich ein Offline-Problem ist
          const isNetworkError = error instanceof Error && 
            (error.message?.includes('Network Error') || 
             error.message?.includes('timeout') || 
             error.message?.includes('connection') ||
             await isOfflineCheck());
          
          if (isNetworkError) {
            Alert.alert('Offline-Modus', 'Timer wird im Offline-Modus gestoppt und später synchronisiert.');
            setIsOffline(true);
            
            // Im Offline-Fall als beendet markieren und offline speichern
            const endedWorkTime: MobileWorkTime = {
              ...currentWorkTime,
              endTime,
              notes,
              synced: false,
              offlineId: Date.now().toString()
            };
            
            await handleOfflineStop(endedWorkTime);
          } else {
            // Bei Server-Fehlern versuchen wir den Status vom Server neu zu laden
            try {
              await checkRunningTimer();
              Alert.alert('Fehler', `Der Timer konnte nicht gestoppt werden: ${error.response?.data?.message || error.message || 'Unbekannter Fehler'}`);
            } catch (refreshError) {
              Alert.alert('Fehler', `Der Timer konnte nicht gestoppt werden und der Status konnte nicht aktualisiert werden. Bitte starten Sie die App neu.`);
            }
          }
        }
      } else {
        // Offline-Modus oder lokaler Timer von offline
        const endedWorkTime: MobileWorkTime = {
          ...currentWorkTime,
          endTime,
          notes,
          synced: false,
          offlineId: currentWorkTime.offlineId || Date.now().toString()
        };
        
        await handleOfflineStop(endedWorkTime);
      }
    } catch (error) {
      console.error('Fehler beim Stoppen des Timers:', error);
      Alert.alert('Fehler', `Der Timer konnte nicht gestoppt werden. ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setStopLoading(false);
    }
  };
  
  /**
   * Behandelt das Stoppen eines Timers im Offline-Modus
   */
  const handleOfflineStop = async (endedWorkTime: MobileWorkTime) => {
    try {
      console.log('Handling offline stop of timer:', endedWorkTime);
      
      // Offline-Daten laden
      const offlineWorkTimes = await loadOfflineWorkTimes();
      
      // Stelle sicher, dass die Zeiten im korrekten Format gespeichert werden
      const formattedWorkTime: MobileWorkTime = {
        ...endedWorkTime,
        startTime: endedWorkTime.startTime instanceof Date 
          ? endedWorkTime.startTime 
          : new Date(endedWorkTime.startTime),
        endTime: endedWorkTime.endTime instanceof Date 
          ? endedWorkTime.endTime 
          : endedWorkTime.endTime ? new Date(endedWorkTime.endTime as string) : null,
        synced: false,
        offlineId: endedWorkTime.offlineId || Date.now().toString()
      };
      
      console.log('Formatted offline worktime:', formattedWorkTime);
      
      // Füge den beendeten Timer zu den Offline-Daten hinzu
      offlineWorkTimes.push(formattedWorkTime);
      
      // Offline-Daten speichern
      await saveOfflineWorkTimes(offlineWorkTimes);
      
      // UI aktualisieren - füge den neuen Eintrag zu den Arbeitszeiten hinzu
      setWorkTimes(prevTimes => [formattedWorkTime, ...prevTimes]);
      setIsOffline(true);
      
      // Timer-Status zurücksetzen
      setCurrentWorkTime(null);
      setIsTimerRunning(false);
      await AsyncStorage.removeItem('@IntranetApp:currentTimer');
      
      // Hinweis anzeigen
      Alert.alert('Hinweis', 'Zeiterfassung im Offline-Modus gestoppt. Die Daten werden synchronisiert, sobald eine Verbindung verfügbar ist.');
    } catch (error) {
      console.error('Fehler beim Offline-Stopp:', error);
      Alert.alert('Fehler', `Die Zeiterfassung konnte nicht im Offline-Modus gespeichert werden. ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
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
      // Prüfe Verbindungsstatus vor API-Call
      const isOfflineMode = await isOfflineCheck();
      if (isOfflineMode) {
        Alert.alert('Fehler', 'Keine Internetverbindung verfügbar. Bitte später erneut versuchen.');
        setIsLoading(false);
        setLoadingMessage('');
        return;
      }

      console.log('Syncing offline data:', offlineData);

      // Offline-Daten für API vorbereiten
      const apiEntries = offlineData.map(entry => {
        // Stellen wir sicher, dass startTime und endTime Strings sind
        let startTimeStr = '';
        if (entry.startTime instanceof Date) {
          startTimeStr = entry.startTime.toISOString();
        } else if (typeof entry.startTime === 'string') {
          // Wenn es bereits ein String ist, aber im falschen Format, konvertieren wir es
          startTimeStr = new Date(entry.startTime).toISOString();
        }

        let endTimeStr = null;
        if (entry.endTime) {
          if (entry.endTime instanceof Date) {
            endTimeStr = entry.endTime.toISOString();
          } else if (typeof entry.endTime === 'string') {
            endTimeStr = new Date(entry.endTime).toISOString();
          }
        }

        return {
          ...entry,
          startTime: startTimeStr,
          endTime: endTimeStr,
          // Entferne Felder, die das Backend nicht erwartet
          offlineId: undefined,
          synced: undefined
        };
      });
      
      console.log('Prepared API entries:', apiEntries);
      
      // Sende alle Offline-Einträge zur Synchronisierung
      const result = await worktimeApi.syncOfflineEntries(apiEntries);
      console.log('Sync result:', result);
      
      // Lösche die synchronisierten Daten aus dem Offline-Speicher
      await AsyncStorage.setItem(OFFLINE_WORKTIME_KEY, JSON.stringify([]));
      
      // Lade die aktuellen Daten neu
      await loadWorkTimes();
      
      // Setze Offline-Status zurück
      setIsOffline(false);
      
      Alert.alert('Erfolg', 'Offline-Daten wurden erfolgreich synchronisiert.');
    } catch (error) {
      console.error('Fehler bei der Synchronisierung:', error);
      Alert.alert('Fehler', `Die Synchronisierung ist fehlgeschlagen. ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };
  
  /**
   * Rendert einen Arbeitszeitdatensatz
   */
  const renderWorkTimeItem = ({ item }: { item: MobileWorkTime }) => (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text>{formatDateTime(item.startTime)}</Text>
          {item.offlineId && <Chip icon="cloud-off-outline">Offline</Chip>}
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.workTimeDetails}>
          <View>
            <Text>Start</Text>
            <Text>{formatDateTime(item.startTime)}</Text>
          </View>
          
          <View>
            <Text>Ende</Text>
            <Text>{item.endTime ? formatDateTime(item.endTime) : '-'}</Text>
          </View>
          
          <View>
            <Text>Dauer</Text>
            <Text>{calculateDuration(item.startTime, item.endTime || null)}</Text>
          </View>
        </View>
        
        {item.branch && (
          <Text style={styles.branchText}>
            Niederlassung: {item.branch.name}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
  
  return (
    <View style={styles.container}>
      <ScrollView>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>Zeiterfassung</Text>
            
            {error && (
              <Text style={styles.error}>{error}</Text>
            )}

            {currentWorkTime ? (
              <View style={styles.activeTimer}>
                <Text>Laufender Timer:</Text>
                <Text>Branch: {branches.find(b => b.id === currentWorkTime?.branchId)?.name || 'Unbekannt'}</Text>
                <Text>Start: {formatTime(currentWorkTime.startTime)}</Text>
                <Text>Dauer: {calculateDuration(currentWorkTime.startTime, new Date().toISOString())}</Text>
                <Button mode="contained" onPress={() => setShowNotesModal(true)}>
                  Timer stoppen
                </Button>
              </View>
            ) : (
              <View style={styles.startTimer}>
                <Button mode="contained" onPress={() => setShowBranchModal(true)}>
                  Timer starten
                </Button>
              </View>
            )}

            <Text style={styles.sectionTitle}>Letzte Einträge</Text>
            {isLoading && <ActivityIndicator size="small" />}
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
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        <Modal
          visible={showBranchModal}
          onDismiss={() => setShowBranchModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>Branch auswählen</Text>
          {branches.map((branch) => (
            <Button
              key={branch.id}
              mode="outlined"
              onPress={() => {
                setSelectedBranch(branch);
                setShowBranchModal(false);
                startTimer();
              }}
            >
              {branch.name}
            </Button>
          ))}
        </Modal>

        <Modal
          visible={showNotesModal}
          onDismiss={() => setShowNotesModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>Notizen</Text>
          <TextInput
            label="Notizen"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />
          <Button mode="contained" onPress={() => {
            stopTimer(notes);
            setShowNotesModal(false);
          }}>
            Timer stoppen
          </Button>
        </Modal>
      </Portal>

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
  card: {
    marginBottom: 16,
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
  activeTimer: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  startTimer: {
    marginVertical: 16,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
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
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
});

export default WorktimeScreen; 