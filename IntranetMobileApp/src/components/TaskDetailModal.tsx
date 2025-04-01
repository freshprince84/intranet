import React, { useEffect, useReducer, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Modal, Portal, Button, Text, TextInput, Chip, IconButton, Divider, Menu, ActivityIndicator, HelperText, MD2Colors } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Task, TaskStatus, User, Branch, ModalMode } from '../types';
import { taskApi, userApi, branchApi } from '../api/apiClient';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { taskFormReducer, initialFormState } from '../reducers/taskFormReducer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

interface TaskDetailModalProps {
  visible: boolean;
  onDismiss: () => void;
  taskId?: number | null;
  onTaskUpdated?: () => void;
  mode: ModalMode;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ 
  visible, 
  onDismiss, 
  taskId,
  onTaskUpdated,
  mode: initialMode
}) => {
  const [mode, setMode] = React.useState(initialMode);
  const [formState, dispatch] = useReducer(taskFormReducer, initialFormState);
  const auth = useAuth();
  const taskFormStateRef = useRef(formState);

  useEffect(() => {
    taskFormStateRef.current = formState;
  }, [formState]);

  // Reset des Formulars beim Schließen
  useEffect(() => {
    if (!visible) {
      dispatch({ type: 'RESET_FORM' });
      setMode(initialMode);
    }
  }, [visible, initialMode]);

  // Hilfsfunktion für Standarddatum (wie im Frontend)
  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  };

  // Laden von Benutzern und Branches - vereinfacht und mit Rückgabe der Daten
  const loadUsersAndBranches = async (): Promise<{users: User[], branches: Branch[]}> => {
    try {
      // Lade Benutzer und Branches parallel für bessere Performance
      const [usersResponse, branchesResponse] = await Promise.all([
        userApi.getAllUsers(),
        branchApi.getAllBranches()
      ]);
      
      const users = Array.isArray(usersResponse) ? usersResponse : [];
      const branches = Array.isArray(branchesResponse) ? branchesResponse : [];
      
      // Überprüfe, ob Daten erfolgreich geladen wurden
      if (users.length === 0) {
        throw new Error('Keine Benutzer gefunden. Bitte versuchen Sie es später erneut.');
      }
      
      if (branches.length === 0) {
        throw new Error('Keine Branches gefunden. Bitte versuchen Sie es später erneut.');
      }
      
      // Setze die Daten in den State
      dispatch({ type: 'SET_USERS', users });
      dispatch({ type: 'SET_BRANCHES', branches });
      
      // Gib die geladenen Daten zurück, damit sie direkt verwendet werden können
      return { users, branches };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Laden von Benutzern und Branches';
      dispatch({ type: 'SET_ERROR', error: errorMessage });
      throw error;
    }
  };

  // Initialisierung beim Öffnen des Modals
  useEffect(() => {
    if (visible) {
      console.log(`[TaskDetailModal] MODAL OPENED - Initial Props: mode=${initialMode}, taskId=${taskId}`);
      console.log(`[TaskDetailModal] Initializing - Mode: ${initialMode}, TaskId: ${taskId}`);
      const initializeModal = async () => {
        dispatch({ type: 'RESET_FORM' });
        dispatch({ type: 'SET_LOADING', value: true });

        try {
          // Immer Benutzer und Branches laden
          const [users, branches] = await Promise.all([
            userApi.getAll(),
            branchApi.getAll()
          ]);
          dispatch({ type: 'SET_USERS', users: users || [] });
          dispatch({ type: 'SET_BRANCHES', branches: branches || [] });
          console.log('[TaskDetailModal] Users and Branches loaded.');

          // Modus-spezifische Initialisierung
          if (initialMode === ModalMode.CREATE) {
            setMode(ModalMode.CREATE);
            console.log('[TaskDetailModal] Initializing for CREATE mode (Simplified).');
            // Standardwerte setzen
            dispatch({ type: 'SET_FIELD', field: 'status', value: 'open' });
            dispatch({ type: 'SET_FIELD', field: 'dueDate', value: getDefaultDueDate() });

            // Aktuellen Benutzer setzen (aus bereits geladener Liste)
            if (auth?.user?.id) {
              const currentAuthUser = auth.user;
              const currentUserFromList = users.find(u => u.id === currentAuthUser.id);
              
              if (currentUserFromList) {
                dispatch({ type: 'SET_SELECTED_USER', user: currentUserFromList });
                console.log(`[TaskDetailModal] CREATE Mode: Dispatched SET_SELECTED_USER with user from list: ID=${currentUserFromList.id}`);
                
                // Branch setzen (aus auth.user Kontext oder Fallback)
                // VERSUCH 1: Direkte Branch-ID aus auth.user (falls vorhanden)
                // Annahme: auth.user könnte { ..., branchId: number } oder { ..., branch: { id: number } } enthalten
                const authBranchId = currentAuthUser.branchId ?? currentAuthUser.branch?.id; 
                let branchSet = false;
                
                if (typeof authBranchId === 'number' && authBranchId > 0) {
                    console.log(`[TaskDetailModal] Attempting to set branch from auth context, branchId: ${authBranchId}`);
                    const authBranch = branches.find(b => b.id === authBranchId);
                    if (authBranch) {
                        dispatch({ type: 'SET_SELECTED_BRANCH', branch: authBranch });
                        console.log(`[TaskDetailModal] Branch set from auth context: ${authBranch.name}`);
                        branchSet = true;
                    } else {
                         console.warn(`[TaskDetailModal] Branch ID ${authBranchId} from auth context not found in loaded branches list.`);
                    }
                }

                // VERSUCH 2: Fallback (wenn nicht über auth.user gesetzt)
                if (!branchSet) {
                    console.log('[TaskDetailModal] Branch not set from auth context, attempting fallback.');
                    const lastBranchIdStr = await AsyncStorage.getItem('lastSelectedBranchId');
                    const lastBranchId = lastBranchIdStr ? parseInt(lastBranchIdStr, 10) : null;
                    const lastBranch = lastBranchId ? branches.find(b => b.id === lastBranchId) : null;

                    if (lastBranch) {
                        dispatch({ type: 'SET_SELECTED_BRANCH', branch: lastBranch });
                        console.log(`[TaskDetailModal] Fallback: Set last used branch: ${lastBranch.name}`);
                    } else if (branches.length > 0) {
                        dispatch({ type: 'SET_SELECTED_BRANCH', branch: branches[0] });
                        console.log(`[TaskDetailModal] Fallback: Set first branch: ${branches[0].name}`);
                    } else {
                        console.error('[TaskDetailModal] No branches available for fallback.');
                        dispatch({ type: 'SET_FORM_ERROR', error: 'Keine Filialen verfügbar.' });
                    }
                }
              } else {
                 console.warn(`[TaskDetailModal] CREATE Mode: Authenticated user ID ${currentAuthUser.id} not found in loaded users list. Cannot set default user.`);
                 // Trotzdem Branch-Fallback versuchen
                 console.log('[TaskDetailModal] Branch fallback (user not found in list).');
                 const lastBranchIdStr = await AsyncStorage.getItem('lastSelectedBranchId');
                 const lastBranchId = lastBranchIdStr ? parseInt(lastBranchIdStr, 10) : null;
                 const lastBranch = lastBranchId ? branches.find(b => b.id === lastBranchId) : null;
                    if (lastBranch) {
                        dispatch({ type: 'SET_SELECTED_BRANCH', branch: lastBranch });
                        console.log(`[TaskDetailModal] Fallback: Set last used branch: ${lastBranch.name}`);
                    } else if (branches.length > 0) {
                        dispatch({ type: 'SET_SELECTED_BRANCH', branch: branches[0] });
                        console.log(`[TaskDetailModal] Fallback: Set first branch: ${branches[0].name}`);
                    } else {
                        console.error('[TaskDetailModal] No branches available for fallback.');
                        dispatch({ type: 'SET_FORM_ERROR', error: 'Keine Filialen verfügbar.' });
                    }
              }
            } else {
               console.warn('[TaskDetailModal] No authenticated user found for CREATE mode defaults.');
               // Nur Branch-Fallback
               console.log('[TaskDetailModal] Branch fallback (no authenticated user).');
               const lastBranchIdStr = await AsyncStorage.getItem('lastSelectedBranchId');
               const lastBranchId = lastBranchIdStr ? parseInt(lastBranchIdStr, 10) : null;
               const lastBranch = lastBranchId ? branches.find(b => b.id === lastBranchId) : null;
                  if (lastBranch) {
                     dispatch({ type: 'SET_SELECTED_BRANCH', branch: lastBranch });
                     console.log(`[TaskDetailModal] Fallback: Set last used branch: ${lastBranch.name}`);
                  } else if (branches.length > 0) {
                     dispatch({ type: 'SET_SELECTED_BRANCH', branch: branches[0] });
                     console.log(`[TaskDetailModal] Fallback: Set first branch: ${branches[0].name}`);
                  } else {
                       console.error('[TaskDetailModal] No branches available for fallback.');
                       dispatch({ type: 'SET_FORM_ERROR', error: 'Keine Filialen verfügbar.' });
                  }
            }

          } else if (taskId && (initialMode === ModalMode.EDIT || initialMode === ModalMode.VIEW)) {
            setMode(initialMode); // Setze Modus VIEW oder EDIT
            console.log(`[TaskDetailModal] Initializing for ${initialMode} mode with Task ID: ${taskId}.`);
            try {
              // Task Daten abrufen
              const task = await taskApi.getById(taskId);
              if (!task) {
                throw new Error(`Task mit ID ${taskId} nicht gefunden.`);
              }
              console.log('[TaskDetailModal] Task data loaded:', task);
              dispatch({ type: 'LOAD_TASK', task });
            } catch (taskLoadError) {
              console.error('[TaskDetailModal] Error loading task:', taskLoadError);
              dispatch({ type: 'SET_ERROR', error: 'Aufgabe konnte nicht geladen werden.' });
              onDismiss(); // Modal schließen bei Fehler
            }
          } else {
            // Ungültige Kombination (z.B. EDIT ohne ID)
            console.warn(`[TaskDetailModal] Invalid combination or missing data - Mode: ${initialMode}, TaskId: ${taskId}. Switching to CREATE.`);
            setMode(ModalMode.CREATE); // Wechsel zu CREATE
            // Initialisierungslogik für CREATE (ggf. vereinfacht ohne userApi.getById, nur Fallbacks)
             dispatch({ type: 'SET_FIELD', field: 'status', value: 'open' });
             dispatch({ type: 'SET_FIELD', field: 'dueDate', value: getDefaultDueDate() });
             if (auth?.user?.id) { // Zusätzliche Prüfung
                 const currentAuthUser = auth.user;
                 const currentUser = users.find(u => u.id === currentAuthUser.id); 
                 if (currentUser) {
                    dispatch({ type: 'SET_SELECTED_USER', user: currentUser });
                    console.log(`[TaskDetailModal] Fallback CREATE: Set SET_SELECTED_USER.`);
                 } else {
                   console.warn(`[TaskDetailModal] Fallback CREATE: User ${currentAuthUser.id} not found in loaded user list.`);
                 }
             }
             const lastBranchIdStr = await AsyncStorage.getItem('lastSelectedBranchId');
             const lastBranchId = lastBranchIdStr ? parseInt(lastBranchIdStr, 10) : null;
             const lastBranch = lastBranchId ? branches.find(b => b.id === lastBranchId) : null;
             if (lastBranch) {
                 dispatch({ type: 'SET_SELECTED_BRANCH', branch: lastBranch });
                 console.log(`[TaskDetailModal] Fallback CREATE: Set last used branch: ${lastBranch.name}`);
             } else if (branches.length > 0) {
                 dispatch({ type: 'SET_SELECTED_BRANCH', branch: branches[0] });
                 console.log(`[TaskDetailModal] Fallback CREATE: Set first branch: ${branches[0].name}`);
             }
          }

        } catch (error) {
          console.error('[TaskDetailModal] General initialization error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten';
          dispatch({ type: 'SET_ERROR', error: errorMessage });
        } finally {
          dispatch({ type: 'SET_LOADING', value: false });
        }
      };

      initializeModal(); // Nur noch aufrufen

    }
  // Abhängigkeiten: visible, taskId, initialMode, auth?.user?.id bleiben
  }, [visible, taskId, initialMode, auth?.user?.id]);

  // Separate useEffect für mode-Änderungen
  useEffect(() => {
    if (visible && mode !== initialMode) {
      setMode(initialMode);
    }
  }, [initialMode, visible]);

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (formState.isUpdating || mode === ModalMode.CREATE) return;
    
    dispatch({ type: 'SET_UPDATING', value: true });
    
    try {
      if (taskId) {
        await taskApi.updateStatus(taskId, newStatus);
        dispatch({ type: 'SET_FIELD', field: 'status', value: newStatus });
        
        if (onTaskUpdated) {
          onTaskUpdated();
        }
        
        Alert.alert('Erfolg', 'Der Status wurde erfolgreich aktualisiert.');
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Status:', error);
      Alert.alert('Fehler', 'Der Status konnte nicht aktualisiert werden.');
    } finally {
      dispatch({ type: 'SET_UPDATING', value: false });
    }
  };

  // Helper function to prepare data for API
  const prepareTaskData = (): Partial<Task> => {
    // Sicherstellen, dass IDs wirklich Zahlen sind
    const responsibleIdNum = typeof formState.responsibleId === 'number' 
        ? formState.responsibleId 
        : (formState.responsibleId ? parseInt(String(formState.responsibleId), 10) : null);
        
    const branchIdNum = typeof formState.branchId === 'number' 
        ? formState.branchId 
        : (formState.branchId ? parseInt(String(formState.branchId), 10) : null);
        
    // Überprüfen, ob die Konvertierung erfolgreich war und > 0 ist
    if (!responsibleIdNum || responsibleIdNum <= 0) {
        console.error('[TaskDetailModal] prepareTaskData: Invalid responsibleId after parsing:', responsibleIdNum);
        // Optional: Hier einen Fehler werfen oder null setzen, je nach Backend-Erwartung
        // throw new Error("Ungültige Verantwortlichen-ID."); 
    }
    if (!branchIdNum || branchIdNum <= 0) {
        console.error('[TaskDetailModal] prepareTaskData: Invalid branchId after parsing:', branchIdNum);
        // Optional: Hier einen Fehler werfen oder null setzen
        // throw new Error("Ungültige Filialen-ID.");
    }

    const dataToSave: Partial<Task> = {
      title: formState.title.trim(),
      description: formState.description?.trim() || null,
      status: formState.status,
      dueDate: formState.dueDate ? new Date(formState.dueDate).toISOString() : null,
      responsibleId: responsibleIdNum, // Verwende die geparste Nummer
      branchId: branchIdNum,         // Verwende die geparste Nummer
      qualityControlId: formState.qualityControlId,
    };
    
    console.log('[TaskDetailModal] Data prepared for API (with explicit ID parsing):', dataToSave);
    return dataToSave;
  };

  const handleSave = async () => {
    // 1. Explizite Validierung auslösen
    dispatch({ type: 'VALIDATE_FORM' });
    
    // 2. KURZ warten, damit der State (formError) sich aktualisieren kann (Workaround)
    await new Promise(resolve => setTimeout(resolve, 50)); 

    // 3. **NACH** dem Timeout den aktuellen formError prüfen
    // Zugriff auf den *korrekt platzierten und aktualisierten* Ref
    const currentFormError = taskFormStateRef.current.formError;
    if (currentFormError) {
      console.log('[TaskDetailModal] Validation failed before API call:', currentFormError);
      Alert.alert('Validierungsfehler', currentFormError);
      return;
    }
    
    // 4. Zusätzliche explizite Prüfungen für IDs (Sicherheitsnetz)
    // Verwende den aktuellen State direkt oder aus dem Ref
    if (typeof taskFormStateRef.current.responsibleId !== 'number' || taskFormStateRef.current.responsibleId <= 0) {
        const errorMsg = 'Kein gültiger Verantwortlicher ausgewählt.';
        dispatch({ type: 'SET_FORM_ERROR', error: errorMsg });
        Alert.alert('Validierungsfehler', errorMsg);
        return;
    }
    if (typeof taskFormStateRef.current.branchId !== 'number' || taskFormStateRef.current.branchId <= 0) {
        const errorMsg = 'Keine gültige Filiale ausgewählt.';
        dispatch({ type: 'SET_FORM_ERROR', error: errorMsg });
        Alert.alert('Validierungsfehler', errorMsg);
        return;
    }

    // 5. Wenn alles ok ist -> Speichern
    dispatch({ type: 'SET_UPDATING', value: true });
    
    try {
      // Datenaufbereitung NACH der Validierung
      const taskData = prepareTaskData();
      let successMessage = '';
      let savedTask: Task | null = null;

      if (mode === ModalMode.EDIT && taskId) {
        console.log(`[TaskDetailModal] Sending UPDATE request for task ${taskId}`);
        savedTask = await taskApi.update(taskId, taskData);
        successMessage = 'Die Aufgabe wurde erfolgreich aktualisiert.';
      } else if (mode === ModalMode.CREATE) {
        console.log('[TaskDetailModal] Sending CREATE request');
        savedTask = await taskApi.create(taskData);
        successMessage = 'Die Aufgabe wurde erfolgreich erstellt.';

        // Speichere die letzte ausgewählte Branch nur bei erfolgreicher Erstellung
        if (savedTask && taskData.branchId) {
          await AsyncStorage.setItem('lastSelectedBranchId', taskData.branchId.toString());
        }
      } else {
        throw new Error('Ungültiger Modus für Speichern');
      }

      // Validiere Antwort
      if (!savedTask || !savedTask.id) {
        throw new Error('Ungültige Antwort vom Server nach dem Speichern');
      }

      // Task Liste aktualisieren
      if (onTaskUpdated) {
        onTaskUpdated();
      }

      Alert.alert('Erfolg', successMessage);
      onDismiss(); // Modal schließen

    } catch (error) {
      console.error('[TaskDetailModal] Fehler beim Speichern der Aufgabe:', error);
      const axiosError = error as any; // Type assertion
      let errorMessage = 'Die Aufgabe konnte nicht gespeichert werden.';

      if (axiosError.response) {
        // Backend hat geantwortet, aber mit Fehlerstatus
        console.error('Backend Error Response:', axiosError.response.data);
        errorMessage = axiosError.response.data?.message || `Serverfehler ${axiosError.response.status}`;
      } else if (axiosError.request) {
        // Request wurde gesendet, aber keine Antwort erhalten
        console.error('No response received:', axiosError.request);
        errorMessage = 'Keine Antwort vom Server erhalten.';
      } else {
        // Fehler beim Setup des Requests
        console.error('Error setting up request:', axiosError.message);
        errorMessage = `Fehler: ${axiosError.message}`;
      }
       // Setze den Fehler im Formular-State
      dispatch({ type: 'SET_FORM_ERROR', error: errorMessage });
      // Zeige den Fehler auch als Alert an
      Alert.alert('Speicherfehler', errorMessage);
    } finally {
      dispatch({ type: 'SET_UPDATING', value: false });
    }
  };

  const handleDelete = async () => {
    if (!taskId) return;
    
    dispatch({ type: 'SET_UPDATING', value: true });
    
    try {
      await taskApi.delete(taskId);
      Alert.alert('Erfolg', 'Die Aufgabe wurde erfolgreich gelöscht.');
      
      if (onTaskUpdated) {
        onTaskUpdated();
      }
      
      onDismiss();
    } catch (error) {
      console.error('Fehler beim Löschen der Aufgabe:', error);
      Alert.alert('Fehler', 'Die Aufgabe konnte nicht gelöscht werden.');
    } finally {
      dispatch({ type: 'SET_UPDATING', value: false });
      dispatch({ type: 'SET_UI', key: 'showConfirmationDialog', value: false });
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    dispatch({ type: 'SET_UI', key: 'showDatePicker', value: false });
    
    if (selectedDate) {
      dispatch({ type: 'SET_FIELD', field: 'dueDate', value: selectedDate });
    }
  };

  // Statustext und Farbe basierend auf dem Status
  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case 'open':
        return '#3B82F6'; // Blau
      case 'in_progress':
        return '#EAB308'; // Gelb
      case 'improval':
        return '#EF4444'; // Rot
      case 'quality_control':
        return '#8B5CF6'; // Lila
      case 'done':
        return '#10B981'; // Grün
      default:
        return '#9CA3AF'; // Grau
    }
  };

  const getStatusText = (status: TaskStatus): string => {
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

  // Korrektur Titelanzeige
  const getModalTitle = () => {
    switch (mode) { // Verwende den lokalen 'mode' State
      case ModalMode.CREATE:
        return 'Neue Aufgabe';
      case ModalMode.EDIT:
        return 'Aufgabe bearbeiten';
      case ModalMode.VIEW:
        return 'Aufgabendetails';
      default:
        return 'Aufgabe';
    }
  };

  // === Hilfsfunktion für QC Button Titel (korrekt platziert) ===
  const getQcButtonTitle = (): string => { // Garantiert string
    const qcUserId = formState.qualityControlId;
    if (!qcUserId) return 'Qualitätskontrolle auswählen *';
    const qcUser = formState.data.users.find(u => u.id === qcUserId);
    return qcUser ? `${qcUser.firstName} ${qcUser.lastName}` : 'ID nicht gefunden - Auswählen *'; 
  };
  const qcButtonTitle = getQcButtonTitle();

  // === UI Rendering ===
  const renderContent = () => {
    if (formState.isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Aufgabe wird geladen...</Text>
        </View>
      );
    }

    if (formState.error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{formState.error}</Text>
          <Button 
            mode="contained" 
            onPress={() => {
              // Versuche, die Initialisierung erneut durchzuführen
              if (visible) {
                dispatch({ type: 'SET_LOADING', value: true });
                dispatch({ type: 'SET_ERROR', error: null });
                
                // Lade alle Daten neu
                loadUsersAndBranches().then(() => {
                  if (taskId) {
                    // Erneuter Versuch, die Task zu laden
                    taskApi.getById(taskId)
                      .then(task => {
                        dispatch({ type: 'LOAD_TASK', task });
                        dispatch({ type: 'SET_LOADING', value: false });
                      })
                      .catch(error => {
                        const errorMessage = error instanceof Error ? error.message : 'Fehler beim Laden der Aufgabe';
                        dispatch({ type: 'SET_ERROR', error: errorMessage });
                        dispatch({ type: 'SET_LOADING', value: false });
                      });
                  } else {
                    // Bei neuen Tasks keine weiteren Aktionen notwendig
                    dispatch({ type: 'SET_LOADING', value: false });
                  }
                }).catch(() => {
                  dispatch({ type: 'SET_LOADING', value: false });
                });
              }
            }} 
            style={styles.retryButton}
          >
            Erneut versuchen
          </Button>
          <Button mode="outlined" onPress={onDismiss} style={styles.closeButton}>
            Schließen
          </Button>
        </View>
      );
    }

    if (mode === ModalMode.VIEW) {
      return (
        <ScrollView>
          <Text style={styles.detailTitle}>{formState.title}</Text>
          
          <Chip 
            style={[styles.statusChip, { backgroundColor: getStatusColor(formState.status) }]}
            textStyle={{ color: 'white' }}
          >
            {getStatusText(formState.status)}
          </Chip>
          
          <Text style={styles.sectionLabel}>Status:</Text>
          <View style={styles.statusButtons}>
            <Button
              mode={formState.status === 'open' ? 'contained' : 'outlined'}
              onPress={() => handleStatusChange('open')}
              style={[styles.statusButton, { borderColor: '#3B82F6' }]}
              textColor={formState.status === 'open' ? 'white' : '#3B82F6'}
              disabled={formState.isUpdating || formState.status === 'open'}
            >
              Offen
            </Button>
            <Button
              mode={formState.status === 'in_progress' ? 'contained' : 'outlined'}
              onPress={() => handleStatusChange('in_progress')}
              style={[styles.statusButton, { borderColor: '#EAB308' }]}
              textColor={formState.status === 'in_progress' ? 'white' : '#EAB308'}
              disabled={formState.isUpdating || formState.status === 'in_progress'}
            >
              In Bearbeitung
            </Button>
            <Button
              mode={formState.status === 'improval' ? 'contained' : 'outlined'}
              onPress={() => handleStatusChange('improval')}
              style={[styles.statusButton, { borderColor: '#EF4444' }]}
              textColor={formState.status === 'improval' ? 'white' : '#EF4444'}
              disabled={formState.isUpdating || formState.status === 'improval'}
            >
              Nachbesserung
            </Button>
          </View>
          <View style={styles.statusButtons}>
            <Button
              mode={formState.status === 'quality_control' ? 'contained' : 'outlined'}
              onPress={() => handleStatusChange('quality_control')}
              style={[styles.statusButton, { borderColor: '#8B5CF6' }]}
              textColor={formState.status === 'quality_control' ? 'white' : '#8B5CF6'}
              disabled={formState.isUpdating || formState.status === 'quality_control'}
            >
              Qualitätskontrolle
            </Button>
            <Button
              mode={formState.status === 'done' ? 'contained' : 'outlined'}
              onPress={() => handleStatusChange('done')}
              style={[styles.statusButton, { borderColor: '#10B981' }]}
              textColor={formState.status === 'done' ? 'white' : '#10B981'}
              disabled={formState.isUpdating || formState.status === 'done'}
            >
              Erledigt
            </Button>
          </View>
          
          <Text style={styles.sectionLabel}>Beschreibung:</Text>
          <Text style={styles.description}>
            {formState.description || 'Keine Beschreibung vorhanden'}
          </Text>
          
          <Divider style={styles.divider} />
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fälligkeitsdatum:</Text>
            <Text style={styles.detailValue}>
              {formState.dueDate ? formatDate(formState.dueDate) : 'Nicht gesetzt'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Verantwortlich:</Text>
            <Text style={styles.detailValue}>
              {formState.data.selectedUser ? 
                `${formState.data.selectedUser.firstName} ${formState.data.selectedUser.lastName}` : 
                'Nicht zugewiesen'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Branch:</Text>
            <Text style={styles.detailValue}>
              {formState.data.selectedBranch?.name || 'Nicht zugewiesen'}
            </Text>
          </View>
          
          <Button
            mode="outlined"
            onPress={onDismiss}
            style={styles.closeButtonSingle}
          >
            Schließen
          </Button>
        </ScrollView>
      );
    }

    return (
      <ScrollView>
        <TextInput
          label="Titel"
          value={formState.title}
          onChangeText={(value) => dispatch({ type: 'SET_FIELD', field: 'title', value })}
          style={styles.input}
          disabled={formState.isUpdating}
        />
        
        <TextInput
          label="Beschreibung"
          value={formState.description ?? ''}
          onChangeText={(value) => dispatch({ type: 'SET_FIELD', field: 'description', value })}
          multiline
          numberOfLines={4}
          style={styles.input}
          disabled={formState.isUpdating}
        />
        
        <Text style={styles.sectionLabel}>Status:</Text>
        <View style={styles.statusButtons}>
          <Button
            mode={formState.status === 'open' ? 'contained' : 'outlined'}
            onPress={() => dispatch({ type: 'SET_FIELD', field: 'status', value: 'open' })}
            style={[styles.statusButton, { borderColor: '#3B82F6' }]}
            textColor={formState.status === 'open' ? 'white' : '#3B82F6'}
            disabled={formState.isUpdating}
          >
            Offen
          </Button>
          <Button
            mode={formState.status === 'in_progress' ? 'contained' : 'outlined'}
            onPress={() => dispatch({ type: 'SET_FIELD', field: 'status', value: 'in_progress' })}
            style={[styles.statusButton, { borderColor: '#EAB308' }]}
            textColor={formState.status === 'in_progress' ? 'white' : '#EAB308'}
            disabled={formState.isUpdating}
          >
            In Bearbeitung
          </Button>
          <Button
            mode={formState.status === 'improval' ? 'contained' : 'outlined'}
            onPress={() => dispatch({ type: 'SET_FIELD', field: 'status', value: 'improval' })}
            style={[styles.statusButton, { borderColor: '#EF4444' }]}
            textColor={formState.status === 'improval' ? 'white' : '#EF4444'}
            disabled={formState.isUpdating}
          >
            Nachbesserung
          </Button>
        </View>
        <View style={styles.statusButtons}>
          <Button
            mode={formState.status === 'quality_control' ? 'contained' : 'outlined'}
            onPress={() => dispatch({ type: 'SET_FIELD', field: 'status', value: 'quality_control' })}
            style={[styles.statusButton, { borderColor: '#8B5CF6' }]}
            textColor={formState.status === 'quality_control' ? 'white' : '#8B5CF6'}
            disabled={formState.isUpdating}
          >
            Qualitätskontrolle
          </Button>
          <Button
            mode={formState.status === 'done' ? 'contained' : 'outlined'}
            onPress={() => dispatch({ type: 'SET_FIELD', field: 'status', value: 'done' })}
            style={[styles.statusButton, { borderColor: '#10B981' }]}
            textColor={formState.status === 'done' ? 'white' : '#10B981'}
            disabled={formState.isUpdating}
          >
            Erledigt
          </Button>
        </View>
        
        <Text style={styles.sectionLabel}>Fälligkeitsdatum:</Text>
        <View style={styles.dateContainer}>
          <Button
            mode="outlined"
            onPress={() => dispatch({ type: 'SET_UI', key: 'showDatePicker', value: true })}
            icon="calendar"
            style={styles.dateButton}
            disabled={formState.isUpdating}
          >
            {formState.dueDate ? formatDate(formState.dueDate) : 'Datum auswählen'}
          </Button>
          
          {formState.dueDate && (
            <IconButton
              icon="close"
              size={20}
              onPress={() => dispatch({ type: 'SET_FIELD', field: 'dueDate', value: null })}
              disabled={formState.isUpdating}
            />
          )}
        </View>
        
        {formState.ui.showDatePicker && (
          <DateTimePicker
            value={formState.dueDate || new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
        
        <Text style={styles.sectionLabel}>Verantwortlich:</Text>
        <Menu
          visible={formState.ui.showUserMenu}
          onDismiss={() => dispatch({ type: 'TOGGLE_UI', key: 'showUserMenu' })}
          anchor={
            <Button
              mode="outlined"
              onPress={() => dispatch({ type: 'TOGGLE_UI', key: 'showUserMenu' })}
              icon="account"
              style={styles.selectButton}
              disabled={formState.isUpdating}
            >
              {formState.data.selectedUser ? 
                `${formState.data.selectedUser.firstName} ${formState.data.selectedUser.lastName}` : 
                'Benutzer auswählen'}
            </Button>
          }
        >
          {formState.data.users.map((user) => (
            <Menu.Item
              key={user.id}
              onPress={() => {
                dispatch({ type: 'SET_SELECTED_USER', user });
                dispatch({ type: 'SET_FIELD', field: 'responsibleId', value: user.id });
                dispatch({ type: 'TOGGLE_UI', key: 'showUserMenu' });
              }}
              title={`${user.firstName} ${user.lastName}`}
            />
          ))}
        </Menu>
        
        <Text style={styles.sectionLabel}>Branch:</Text>
        <Menu
          visible={formState.ui.showBranchMenu}
          onDismiss={() => dispatch({ type: 'TOGGLE_UI', key: 'showBranchMenu' })}
          anchor={
            <Button
              mode="outlined"
              onPress={() => dispatch({ type: 'TOGGLE_UI', key: 'showBranchMenu' })}
              icon="source-branch"
              style={styles.selectButton}
              disabled={formState.isUpdating}
            >
              {formState.data.selectedBranch?.name || 'Branch auswählen'}
            </Button>
          }
        >
          {formState.data.branches.map((branch) => (
            <Menu.Item
              key={branch.id}
              onPress={() => {
                dispatch({ type: 'SET_SELECTED_BRANCH', branch });
                dispatch({ type: 'SET_FIELD', field: 'branchId', value: branch.id });
                dispatch({ type: 'TOGGLE_UI', key: 'showBranchMenu' });
              }}
              title={branch.name}
            />
          ))}
        </Menu>
        
        <Text style={styles.sectionLabel}>Qualitätskontrolle:</Text>
        <Menu
          visible={formState.ui.showQcMenu}
          onDismiss={() => dispatch({ type: 'TOGGLE_UI', key: 'showQcMenu' })}
          anchor={
            <Button
              mode="outlined"
              onPress={() => dispatch({ type: 'TOGGLE_UI', key: 'showQcMenu' })}
              icon="account-check-outline"
              style={styles.dropdownButton}
              disabled={formState.isLoading}
            >
              {qcButtonTitle}
            </Button>
          }
          style={styles.menuContainer}
        >
          {formState.data.users.map((user) => (
            <Menu.Item
              key={`qc-${user.id}`}
              onPress={() => {
                dispatch({ type: 'SET_FIELD', field: 'qualityControlId', value: user.id });
                dispatch({ type: 'TOGGLE_UI', key: 'showQcMenu' });
              }}
              title={`${user.firstName} ${user.lastName}`}
            />
          ))}
          <Divider />
          <Menu.Item
            onPress={() => {
              dispatch({ type: 'SET_FIELD', field: 'qualityControlId', value: null });
              dispatch({ type: 'TOGGLE_UI', key: 'showQcMenu' });
            }}
            title="Keine Qualitätskontrolle"
          />
        </Menu>
        
        {formState.formError && (
          <HelperText type="error" visible={true}>{formState.formError}</HelperText>
        )}
        
        <View style={styles.buttonContainer}>
          {(mode === ModalMode.EDIT || mode === ModalMode.CREATE) && (
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.button}
              disabled={formState.isUpdating || formState.isLoading}
              loading={formState.isUpdating}
            >
              {mode === ModalMode.CREATE ? 'Erstellen' : 'Speichern'}
            </Button>
          )}
          {mode === ModalMode.EDIT && (
            <Button
              mode="outlined"
              onPress={() => dispatch({ type: 'TOGGLE_UI', key: 'showConfirmationDialog'})}
              style={styles.button}
              color={MD2Colors.red500}
              disabled={formState.isUpdating || formState.isLoading}
            >
              Löschen
            </Button>
          )}
          <Button
            mode="text"
            onPress={onDismiss}
            style={styles.button}
            disabled={formState.isUpdating}
          >
            Abbrechen
          </Button>
        </View>
      </ScrollView>
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{getModalTitle()}</Text>
          <IconButton icon="close" size={24} onPress={onDismiss} />
        </View>
        
        <ScrollView style={styles.scrollView}>
          {renderContent()}
        </ScrollView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 0,
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  scrollView: {
    padding: 16,
  },
  divider: {
    marginVertical: 8,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#f9fafb',
  },
  sectionLabel: {
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginVertical: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateButton: {
    flex: 1,
    marginRight: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  button: {
    marginLeft: 8,
    minWidth: 100,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  formError: {
    color: '#EF4444',
    marginTop: 8,
    marginBottom: 16,
  },
  retryButton: {
    marginBottom: 8,
    backgroundColor: '#3B82F6',
  },
  closeButton: {
    marginTop: 8,
  },
  closeButtonSingle: {
    marginTop: 24,
    alignSelf: 'center',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  detailLabel: {
    width: 140,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  detailValue: {
    flex: 1,
    color: '#1F2937',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  confirmationDialog: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 8,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  confirmationText: {
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  confirmationButton: {
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  selectButton: {
    marginVertical: 8,
  },
  dropdownButton: {
    marginVertical: 8,
  },
  menuContainer: {
    maxHeight: 200,
  },
});

export default TaskDetailModal; 