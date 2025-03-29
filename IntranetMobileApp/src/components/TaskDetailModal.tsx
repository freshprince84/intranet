import React, { useEffect, useReducer } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Modal, Portal, Button, Text, TextInput, Chip, IconButton, Divider, Menu, ActivityIndicator } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Task, TaskStatus, User, Branch, ModalMode } from '../types';
import { taskApi, userApi, branchApi } from '../api/apiClient';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { taskFormReducer, initialFormState } from '../reducers/taskFormReducer';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  // Reset des Formulars beim Schließen
  useEffect(() => {
    if (!visible) {
      dispatch({ type: 'RESET_FORM' });
      setMode(initialMode);
    }
  }, [visible, initialMode]);

  // Initialisierung beim Öffnen des Modals
  useEffect(() => {
    if (visible) {
      const initializeModal = async () => {
        try {
          dispatch({ type: 'SET_LOADING', value: true });
          
          // Lade Benutzer und Branches zuerst
          await loadUsersAndBranches();
          
          console.log('Modal initialisieren mit mode:', mode, 'und taskId:', taskId);
          
          if (mode === ModalMode.CREATE) {
            await initializeNewTask();
          } else if (taskId) {
            await loadTask();
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten';
          console.error('Fehler bei der Modal-Initialisierung:', errorMessage);
          dispatch({ type: 'SET_ERROR', error: errorMessage });
        } finally {
          dispatch({ type: 'SET_LOADING', value: false });
        }
      };
      
      initializeModal();
    }
  }, [visible, mode, taskId]);  // Mode wieder als Abhängigkeit hinzufügen

  // Hilfsfunktion für Standarddatum (wie im Frontend)
  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  };

  const loadTask = async () => {
    if (!taskId) {
      throw new Error('Keine Task-ID vorhanden');
    }
    
    console.log(`Lade Task mit ID ${taskId} für Modus ${mode}`);
    
    try {
      // Task laden
      const taskData = await taskApi.getById(taskId);
      
      if (!taskData || !taskData.id) {
        throw new Error('Die Aufgabe konnte nicht gefunden werden oder hat ungültige Daten');
      }
      
      console.log('Geladene Task-Daten:', taskData);
      
      // Task-Daten in den State laden
      dispatch({ type: 'LOAD_TASK', task: taskData });
      
      // Verantwortlichen Benutzer und Branch direkt setzen
      if (taskData.responsible) {
        dispatch({ type: 'SET_SELECTED_USER', user: taskData.responsible });
      } else if (taskData.responsibleId) {
        const user = formState.data.users.find(u => u.id === taskData.responsibleId);
        if (user) {
          dispatch({ type: 'SET_SELECTED_USER', user });
        }
      }
      
      if (taskData.branch) {
        dispatch({ type: 'SET_SELECTED_BRANCH', branch: taskData.branch });
      } else if (taskData.branchId) {
        const branch = formState.data.branches.find(b => b.id === taskData.branchId);
        if (branch) {
          dispatch({ type: 'SET_SELECTED_BRANCH', branch });
        }
      }
      
      dispatch({ type: 'VALIDATE_FORM' });
    } catch (error) {
      console.error('Fehler beim Laden der Aufgabe:', error);
      throw new Error('Die Aufgabe konnte nicht geladen werden: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'));
    }
  };

  const loadUsersAndBranches = async () => {
    try {
      const [usersData, branchesData] = await Promise.all([
        userApi.getAllUsers(),
        branchApi.getAllBranches()
      ]);
      
      if (!Array.isArray(usersData) || !Array.isArray(branchesData)) {
        throw new Error('Ungültiges Datenformat von der API');
      }
      
      dispatch({ type: 'SET_USERS', users: usersData });
      dispatch({ type: 'SET_BRANCHES', branches: branchesData });
    } catch (error) {
      console.error('Fehler beim Laden von Benutzern und Branches:', error);
      throw new Error('Benutzer und Branches konnten nicht geladen werden');
    }
  };

  const initializeNewTask = async () => {
    // Formular zurücksetzen
    dispatch({ type: 'RESET_FORM' });
    
    try {
      // Standardwerte setzen (wie im Frontend)
      dispatch({ type: 'SET_FIELD', field: 'dueDate', value: getDefaultDueDate() });
      
      // Zuletzt verwendete Branch laden, falls vorhanden
      const lastBranchId = await AsyncStorage.getItem('lastSelectedBranchId');
      if (lastBranchId) {
        const branch = formState.data.branches.find(b => b.id === parseInt(lastBranchId));
        if (branch) {
          dispatch({ type: 'SET_SELECTED_BRANCH', branch });
        }
      }
      
      // Formular validieren
      dispatch({ type: 'VALIDATE_FORM' });
    } catch (error) {
      console.error('Fehler beim Initialisieren eines neuen Tasks:', error);
      // Kein throw, da dies nicht kritisch ist
    }
  };

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

  const prepareTaskData = () => {
    console.log('Bereite Task-Daten vor:', formState);
    
    const taskData = {
      title: formState.title.trim(),
      description: formState.description.trim(),
      status: formState.status,
      dueDate: formState.dueDate ? formState.dueDate.toISOString() : null,
      responsibleId: formState.data.selectedUser?.id || null,
      branchId: formState.data.selectedBranch?.id || null,
    };
    
    console.log('Vorbereitete Task-Daten:', taskData);

    // Validiere die Pflichtfelder
    if (!taskData.title) {
      throw new Error('Bitte geben Sie einen Titel ein.');
    }
    if (!taskData.branchId) {
      throw new Error('Bitte wählen Sie eine Branch aus.');
    }

    return taskData;
  };

  const handleSave = async () => {
    dispatch({ type: 'VALIDATE_FORM' });
    if (formState.formError) {
      Alert.alert('Validierungsfehler', formState.formError);
      return;
    }
    
    dispatch({ type: 'SET_UPDATING', value: true });
    
    try {
      const taskData = prepareTaskData();
      let successMessage = '';
      let savedTask = null;
      
      console.log(`Speichere Task im Modus ${mode}${taskId ? ' mit ID ' + taskId : ''}`);
      
      if (mode === ModalMode.EDIT && taskId) {
        savedTask = await taskApi.update(taskId, taskData);
        successMessage = 'Die Aufgabe wurde erfolgreich aktualisiert.';
      } else if (mode === ModalMode.CREATE) {
        savedTask = await taskApi.create(taskData);
        successMessage = 'Die Aufgabe wurde erfolgreich erstellt.';
        
        // Speichere die letzte ausgewählte Branch
        if (taskData.branchId) {
          await AsyncStorage.setItem('lastSelectedBranchId', taskData.branchId.toString());
        }
      } else {
        throw new Error('Ungültiger Modus für Speichern');
      }
      
      console.log('Gespeicherte Task:', savedTask);
      
      if (!savedTask || !savedTask.id) {
        throw new Error('Ungültige Antwort vom Server');
      }
      
      // Aktualisiere den Cache mit den gespeicherten Task-Daten
      dispatch({ type: 'LOAD_TASK', task: savedTask });
      
      if (onTaskUpdated) {
        onTaskUpdated();
      }
      
      Alert.alert('Erfolg', successMessage);
      onDismiss();
    } catch (error) {
      console.error('Fehler beim Speichern der Aufgabe:', error);
      
      let errorMessage = 'Die Aufgabe konnte nicht gespeichert werden.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if ((error as any)?.response?.data?.message) {
        errorMessage = (error as any).response.data.message;
      }
      
      dispatch({ type: 'SET_FORM_ERROR', error: errorMessage });
      Alert.alert('Fehler', errorMessage);
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
      case 'done':
        return 'Erledigt';
      default:
        return 'Unbekannt';
    }
  };

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
          <Button mode="contained" onPress={loadTask} style={styles.retryButton}>
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
          value={formState.description}
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
          onDismiss={() => dispatch({ type: 'SET_UI', key: 'showUserMenu', value: false })}
          anchor={
            <Button
              mode="outlined"
              onPress={() => dispatch({ type: 'SET_UI', key: 'showUserMenu', value: true })}
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
                dispatch({ type: 'SET_UI', key: 'showUserMenu', value: false });
              }}
              title={`${user.firstName} ${user.lastName}`}
            />
          ))}
        </Menu>
        
        <Text style={styles.sectionLabel}>Branch:</Text>
        <Menu
          visible={formState.ui.showBranchMenu}
          onDismiss={() => dispatch({ type: 'SET_UI', key: 'showBranchMenu', value: false })}
          anchor={
            <Button
              mode="outlined"
              onPress={() => dispatch({ type: 'SET_UI', key: 'showBranchMenu', value: true })}
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
                dispatch({ type: 'SET_UI', key: 'showBranchMenu', value: false });
              }}
              title={branch.name}
            />
          ))}
        </Menu>
        
        {formState.formError && (
          <Text style={styles.formError}>{formState.formError}</Text>
        )}
        
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => {
              if (mode === ModalMode.EDIT) {
                dispatch({ type: 'RESET_FORM' });
                loadTask();
              } else {
                onDismiss();
              }
            }}
            style={styles.button}
            disabled={formState.isUpdating}
          >
            Abbrechen
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.button}
            loading={formState.isUpdating}
            disabled={formState.isUpdating || !formState.title.trim()}
          >
            {mode === ModalMode.CREATE ? 'Erstellen' : 'Speichern'}
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
        contentContainerStyle={styles.modal}
        dismissable={!formState.isUpdating}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === ModalMode.CREATE ? 'Neue Aufgabe' : 
             mode === ModalMode.EDIT ? 'Aufgabe bearbeiten' : 
             'Aufgabendetails'}
          </Text>
          
          {mode === ModalMode.VIEW && taskId && (
            <View style={styles.actionButtons}>
              <IconButton
                icon="pencil"
                size={20}
                onPress={() => setMode(ModalMode.EDIT)}
              />
              <IconButton
                icon="delete"
                size={20}
                onPress={() => dispatch({ type: 'SET_UI', key: 'showConfirmationDialog', value: true })}
                iconColor="#EF4444"
              />
            </View>
          )}
        </View>
        
        <Divider style={styles.divider} />
        
        {formState.isLoading ? (
          <ActivityIndicator size="large" />
        ) : (
          <>
            <ScrollView>
              {renderContent()}
            </ScrollView>
            
            <Portal>
              <Modal
                visible={formState.ui.showConfirmationDialog}
                onDismiss={() => dispatch({ type: 'SET_UI', key: 'showConfirmationDialog', value: false })}
                contentContainerStyle={styles.confirmationDialog}
              >
                <Text style={styles.confirmationTitle}>Aufgabe löschen</Text>
                <Text style={styles.confirmationText}>
                  Möchten Sie diese Aufgabe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                </Text>
                <View style={styles.confirmationButtons}>
                  <Button
                    mode="outlined"
                    onPress={() => dispatch({ type: 'SET_UI', key: 'showConfirmationDialog', value: false })}
                    style={styles.confirmationButton}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleDelete}
                    style={[styles.confirmationButton, styles.deleteButton]}
                    loading={formState.isUpdating}
                  >
                    Löschen
                  </Button>
                </View>
              </Modal>
            </Portal>
          </>
        )}
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'white',
    margin: 20,
    padding: 0,
    borderRadius: 8,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    marginBottom: 8,
  },
  content: {
    padding: 16,
    paddingTop: 0,
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
});

export default TaskDetailModal; 