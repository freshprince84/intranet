/**
 * Worktime-Screen
 * Ermöglicht die Zeiterfassung und -verwaltung
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { Button, Card, FAB, Dialog, TextInput, Portal, Modal, Menu, Divider, Chip, Icon, Switch } from 'react-native-paper';
import { format, differenceInSeconds, intervalToDuration, formatDuration } from 'date-fns';
import { de } from 'date-fns/locale';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { worktimeApi, branchApi, taskApi, savedFilterApi } from '../api/apiClient';
import { Branch, MobileWorkTime, Task, TaskStatus, ModalMode } from '../types';
import { 
  formatDateTime, 
  calculateDuration, 
  utcToLocalDate, 
  localToUTCString,
  formatDate,
  formatTime
} from '../utils/dateUtils';
import NetInfo from '@react-native-community/netinfo';
import WorktimeListModal from '../components/WorktimeListModal';
import TimeTrackerBox from '../components/TimeTrackerBox';
import TaskList from '../components/TaskList';
import TaskFilterModal from '../components/TaskFilterModal';
import TableSettingsModal from '../components/TableSettingsModal';
import TaskDetailModal from '../components/TaskDetailModal';

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
  const [showWorkTimeListModal, setShowWorkTimeListModal] = useState(false);

  // State für Todo-Funktionalität
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  
  // <<< NEUE STATES FÜR MODAL >>>
  const [modalTaskId, setModalTaskId] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(ModalMode.CREATE);
  // <<< ENDE NEUE STATES >>>

  /**
   * Aktualisiert nur die Timer-Dauer ohne Server-Anfrage
   */
  const updateTimerDuration = () => {
    if (currentWorkTime && isTimerRunning) {
      // Löse einen Re-Render aus, ohne die Daten neu zu laden
      setCurrentWorkTime(prev => {
        if (!prev) return prev;
        return { ...prev };
      });
    }
  };

  // Daten laden, wenn Komponente gemountet wird
  useEffect(() => {
    setupScreen();
    loadTasks();
    createStandardFilters();
    
    // Polling alle 10 Sekunden für Timer-Status
    const statusInterval = setInterval(async () => {
      if (!isOffline) {
        try {
          await checkRunningTimer();
        } catch (error) {
          console.error('Fehler beim Aktualisieren des Timer-Status:', error);
        }
      }
    }, 10000);
    
    // Timer-Dauer alle 5 Sekunden aktualisieren
    const timerDurationInterval = setInterval(updateTimerDuration, 5000);
    
    // Vollständige Aktualisierung alle 5 Minuten
    const fullRefreshInterval = setInterval(setupScreen, 300000);
    
    // NetInfo-Listener für Netzwerkänderungen
    const unsubscribe = NetInfo.addEventListener(state => {
      const newOfflineState = !state.isConnected;
      if (isOffline !== newOfflineState) {
        setIsOffline(newOfflineState);
        if (!newOfflineState) {
          // Wenn wieder online, komplette Aktualisierung durchführen
          setupScreen();
        }
      }
    });
    
    return () => {
      clearInterval(statusInterval);
      clearInterval(timerDurationInterval);
      clearInterval(fullRefreshInterval);
      unsubscribe();
    };
  }, []);
  
  // Tasks vom Backend laden
  const loadTasks = async () => {
    setTasksLoading(true);
    setTasksError(null);
    
    try {
      // Prüfe Internetverbindung
      if (await isOfflineCheck()) {
        setTasksError('Keine Internetverbindung. Aufgaben können nicht geladen werden.');
        setTasksLoading(false);
        return;
      }
      
      // Lade Tasks vom Server - stelle sicher, dass nur Tasks geladen werden, keine Requests
      const response = await taskApi.getAll(); // GET /api/tasks endpoint
      console.log('Geladene Tasks:', response);
      
      // Stelle sicher, dass nur Task-Objekte in der Liste sind und keine Requests
      const filteredTasks = response.filter(item => 
        // Prüfe ob es sich wirklich um Tasks handelt und nicht um Requests
        item.hasOwnProperty('status') && 
        typeof item.status === 'string' && 
        ['open', 'in_progress', 'improval', 'quality_control', 'done'].includes(item.status)
      );
      
      setTasks(filteredTasks);
    } catch (error) {
      console.error('Fehler beim Laden der Tasks:', error);
      setTasksError('Die Aufgaben konnten nicht geladen werden.');
    } finally {
      setTasksLoading(false);
    }
  };
  
  /**
   * Erstellt die Standardfilter "Alle" und "Archiv" in der Datenbank, falls noch nicht vorhanden
   * Analog zum Frontend, wo die Filter ebenfalls als echte Filter in der Datenbank gespeichert werden
   */
  const createStandardFilters = async () => {
    try {
      // Prüfe Internetverbindung
      if (await isOfflineCheck()) {
        console.log('Keine Internetverbindung. Standardfilter können nicht erstellt werden.');
        return;
      }
      
      // Lade vorhandene Filter vom Server
      console.log('Prüfe existierende Filter...');
      const existingFilters = await savedFilterApi.getByTable('worktracker-todos');
      console.log('Existierende Filter:', existingFilters);
      
      // Prüfe, ob die Standardfilter bereits existieren
      const alleFilterExists = existingFilters.some(filter => filter.name === 'Alle');
      const archivFilterExists = existingFilters.some(filter => filter.name === 'Archiv');
      
      // Erstelle "Alle"-Filter, wenn noch nicht vorhanden
      if (!alleFilterExists) {
        console.log('Erstelle "Alle"-Filter...');
        const alleFilter = {
          tableId: 'worktracker-todos',
          name: 'Alle',
          conditions: [
            { column: 'status', operator: 'equals', value: 'open' },
            { column: 'status', operator: 'equals', value: 'in_progress' },
            { column: 'status', operator: 'equals', value: 'improval' },
            { column: 'status', operator: 'equals', value: 'quality_control' }
          ],
          operators: ['OR', 'OR', 'OR']
        };
        
        await savedFilterApi.create(alleFilter);
        console.log('Alle-Filter erstellt');
      }
      
      // Erstelle "Archiv"-Filter, wenn noch nicht vorhanden
      if (!archivFilterExists) {
        console.log('Erstelle "Archiv"-Filter...');
        const archivFilter = {
          tableId: 'worktracker-todos',
          name: 'Archiv',
          conditions: [
            { column: 'status', operator: 'equals', value: 'done' }
          ],
          operators: []
        };
        
        await savedFilterApi.create(archivFilter);
        console.log('Archiv-Filter erstellt');
      }
    } catch (error) {
      console.error('Fehler beim Erstellen der Standardfilter:', error);
    }
  };
  
  // Task-Status aktualisieren
  const handleTaskStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    try {
      if (await isOfflineCheck()) {
        Alert.alert('Fehler', 'Keine Internetverbindung. Statusänderungen erfordern eine aktive Verbindung.');
        return;
      }
      
      await taskApi.updateStatus(taskId, newStatus);
      
      // Aktualisiere lokalen Task-Status
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, status: newStatus } 
            : task
        )
      );
      
      // Schließe das Modal
      setShowTaskDetailModal(false);
      
      // Erfolgsbenachrichtigung
      Alert.alert('Erfolg', 'Status wurde aktualisiert');
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Status:', error);
      Alert.alert('Fehler', 'Der Status konnte nicht aktualisiert werden.');
    }
  };
  
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
  
  // --- Handler für Timer-Aktionen --- 
  const handleStartTimerAction = async () => {
    if (!selectedBranch) {
      Alert.alert(
        "Fehler", 
        "Keine Niederlassung verfügbar oder geladen. Bitte sicherstellen, dass Niederlassungen zugewiesen sind und die App eine Verbindung hat."
      );
      return;
    }
    await startTimer(selectedBranch); 
  };

  const handleStopTimerAction = () => {
    stopTimer();
  };

  // Funktion zum Starten des Timers (akzeptiert jetzt wieder die Branch, verwendet aber die aus dem State)
  const startTimer = async (branchToStart: Branch) => { 
    const branchToUse = selectedBranch; 
    if (!branchToUse) { 
       Alert.alert('Fehler', 'Keine ausgewählte Niederlassung im State gefunden.');
       return;
    }

    setStartLoading(true);
    try {
      const isOfflineMode = await isOfflineCheck();
      setIsOffline(isOfflineMode);

      if (!isOfflineMode) {
        try {
          const branchId = branchToUse.id.toString(); 
          const response = await worktimeApi.start(branchId);
          
          const startTime = typeof response.startTime === 'string'
            ? new Date(response.startTime)
            : response.startTime;

          const activeWorktime = {
            ...response,
            startTime,
            branch: branchToUse // Verwende State-Branch
          };
          
          await AsyncStorage.setItem('@IntranetApp:currentTimer', JSON.stringify(activeWorktime));
          setCurrentWorkTime(activeWorktime);
          setIsTimerRunning(true);
        } catch (error) {
           console.error('Fehler beim Starten des Timers:', error);
           const currentBranch = branchToUse; 
           
           // Definition von isNetworkError muss *vor* der Verwendung stehen
           const isNetworkError = error instanceof Error && 
             (error.message?.includes('Network Error') || 
              error.message?.includes('timeout') || 
              error.message?.includes('connection') ||
              await isOfflineCheck());

            if (isNetworkError) {
              Alert.alert('Offline-Modus', 'Timer wird im Offline-Modus gestartet.');
              setIsOffline(true);
              await createOfflineTimer(currentBranch); 
            } else {
              Alert.alert('Fehler', `Der Timer konnte nicht gestartet werden. ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
            }
        }
      } else {
         const currentBranch = branchToUse;
         await createOfflineTimer(currentBranch); 
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
  const createOfflineTimer = async (branchForOffline: Branch) => {
    const newWorkTime: MobileWorkTime = {
      id: Date.now(), // Temporäre ID für Offline-Einträge
      startTime: new Date(),
      branchId: branchForOffline.id,
      userId: user?.id || 0,
      offlineId: Date.now().toString(), // Offline-Identifier statt offline: true
      branch: branchForOffline
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
  
  // Handler für Task-Auswahl (nimmt jetzt taskId)
  const handleTaskPress = (taskId: number) => {
    // Finde den Task im State
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      console.error(`[WorktimeScreen] Task with ID ${taskId} not found in state!`);
      Alert.alert("Fehler", "Ausgewählte Aufgabe nicht gefunden.");
      return;
    }
    console.log(`[WorktimeScreen] Task pressed: ID=${task.id}, Title=${task.title}`);
    // Modal States setzen
    setModalTaskId(task.id);
    setModalMode(ModalMode.EDIT);
    setShowTaskDetailModal(true);
  };
  
  // Handler für Task-Aktualisierung
  const handleTaskUpdated = () => {
    console.log('[WorktimeScreen] Task updated, reloading tasks...');
    setShowTaskDetailModal(false); // Modal schließen
    loadTasks(); // Taskliste neu laden
  };
  
  // Alle Aufgaben anzeigen (unabhängig vom Toggle)
  const handleShowAllTasks = () => {
    // Hier könnte in Zukunft eine Navigation zum vollständigen TaskScreen erfolgen
    Alert.alert('Info', 'Die vollständige Aufgabenliste wird in einem späteren Schritt implementiert.');
  };
  
  // Neuen Task erstellen
  const handleAddTask = () => {
    console.log('[WorktimeScreen] Add task button pressed');
    // <<< MODAL STATES SETZEN >>>
    setModalTaskId(null);
    setModalMode(ModalMode.CREATE);
    setShowTaskDetailModal(true);
    // <<< ENDE MODAL STATES SETZEN >>>
  };
  
  if (isLoading && !currentWorkTime) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>{loadingMessage || 'Wird geladen...'}</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Hauptbereich mit Content, der scrollbar ist */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          {error && (
            <Card style={[styles.card, styles.errorCard]}>
              <Card.Content>
                <Text style={styles.error}>{error}</Text>
              </Card.Content>
            </Card>
          )}
          
          {/* Todo-Sektion */}
          <Card style={styles.card}>
            <Card.Content>              
              {tasksLoading ? (
                <View style={styles.taskLoadingContainer}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text style={styles.taskLoadingText}>Aufgaben werden geladen...</Text>
                </View>
              ) : tasksError ? (
                <View style={styles.taskErrorContainer}>
                  <Text style={styles.taskErrorText}>{tasksError}</Text>
                  <Button mode="contained" onPress={loadTasks} style={styles.retryButton}>
                    Erneut versuchen
                  </Button>
                </View>
              ) : (
                <View>
                  <TaskList
                    tasks={tasks}
                    isLoading={tasksLoading}
                    error={tasksError}
                    onRefresh={loadTasks}
                    isRefreshing={isRefreshing}
                    onTaskPress={handleTaskPress}
                    showFilters={true}
                    onAddPress={handleAddTask}
                  />

                  {tasks.length > 3 && (
                    <Button 
                      mode="text" 
                      onPress={handleShowAllTasks}
                      style={styles.showMoreButton}
                    >
                      Alle {tasks.length} Aufgaben anzeigen
                    </Button>
                  )}
                </View>
              )}
            </Card.Content>
          </Card>
        </ScrollView>

        {/* Die Zeiterfassungsbox wird am unteren Bildschirmrand fixiert */}
        <TimeTrackerBox 
          currentWorkTime={currentWorkTime}
          branches={branches}
          onStartTimer={handleStartTimerAction}
          onStopTimer={handleStopTimerAction}
          onShowWorkTimeList={() => setShowWorkTimeListModal(true)}
          isLoading={isLoading}
          startLoading={startLoading}
          stopLoading={stopLoading}
        />

        <Portal>
          {/* TaskDetailModal einbinden */}
          <TaskDetailModal
            visible={showTaskDetailModal}
            onDismiss={() => setShowTaskDetailModal(false)}
            taskId={modalTaskId}
            mode={modalMode}
            onTaskUpdated={handleTaskUpdated}
          />
        </Portal>

        {/* WorktimeListModal */}
        <WorktimeListModal
          visible={showWorkTimeListModal}
          onDismiss={() => setShowWorkTimeListModal(false)}
          workTimes={workTimes}
          isRefreshing={isRefreshing}
          onRefresh={onRefresh}
        />

        {/* FAB für Synchronisierung im Offline-Modus */}
        {isOffline && (
          <FAB
            icon="sync"
            style={styles.fab}
            onPress={syncOfflineData}
            label="Synchronisieren"
          />
        )}

        {/* FAB hier einfügen, außerhalb der TaskList */}
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => {
            setModalMode(ModalMode.CREATE);
            setModalTaskId(null);
            setShowTaskDetailModal(true);
          }}
          accessibilityLabel="Neue Aufgabe erstellen"
          color="#FFFFFF"
          mode="elevated"
          customSize={56}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB', // Hellgrau Hintergrund aus Design Standards
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB', // Hellgrau Hintergrund aus Design Standards
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 0, // Wir brauchen keinen Padding unten, da die Zeiterfassungsbox dort ist
  },
  contentContainer: {
    paddingBottom: 100, // Extra Platz für die fixierte Zeiterfassungsbox
  },
  card: {
    marginBottom: 16,
    borderRadius: 12, // Größerer Radius für moderneres Aussehen
    elevation: 2, // Subtiler Schatten für Android
    shadowColor: '#000', // Schatten für iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    backgroundColor: '#FFFFFF', // Weiß für die Karten
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorCard: {
    backgroundColor: '#FEF2F2', // Helleres Rot für Fehler aus Design Standards
  },
  title: {
    fontSize: 18,
    fontWeight: '600', // SemiBold statt Bold für moderneren Look
    color: '#111827', // Dunkelgrau/fast schwarz für Titel
  },
  error: {
    color: '#DC2626', // Rot aus Design Standards
    fontSize: 14,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12, // Größerer Radius für moderneres Aussehen
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111827',
  },
  branchButton: {
    marginVertical: 4,
    borderRadius: 8,
  },
  notesInput: {
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  stopButton: {
    marginTop: 12,
    borderRadius: 8,
  },
  taskLoadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  taskLoadingText: {
    marginTop: 8,
    color: '#6B7280', // Mittelgrau für sekundären Text
  },
  taskErrorContainer: {
    padding: 16,
    backgroundColor: '#FEF2F2', // Helleres Rot
    borderRadius: 8,
    marginTop: 8,
  },
  taskErrorText: {
    color: '#DC2626', // Rot aus Design Standards
    marginBottom: 8,
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: '#DC2626', // Rot aus Design Standards
    borderRadius: 8,
  },
  emptyText: {
    textAlign: 'center',
    padding: 16,
    color: '#6B7280', // Mittelgrau für sekundären Text
    fontSize: 14,
  },
  taskList: {
    marginTop: 8,
  },
  showMoreButton: {
    marginTop: 12,
    marginBottom: 4,
  },
  statusSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontWeight: '600', // SemiBold statt Bold
    marginTop: 16,
    marginBottom: 8,
    color: '#111827', // Dunkelgrau/fast schwarz
    fontSize: 15,
  },
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8, // Gleichmäßige Abstände zwischen Buttons
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 180, // Position angepasst auf 180px
    backgroundColor: '#3B82F6',
    zIndex: 1000,
    borderRadius: 28,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB', // Konsistenter Hintergrund
  },
  loadingText: {
    marginTop: 12,
    color: '#3B82F6', // Blau als Primärfarbe
    fontSize: 14,
  },
});

export default WorktimeScreen; 