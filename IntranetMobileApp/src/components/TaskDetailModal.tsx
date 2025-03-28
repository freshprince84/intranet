import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Modal, Portal, Button, Text, TextInput, Chip, IconButton, Divider, Switch, Checkbox, ActivityIndicator, Menu } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Task, TaskStatus, User, Branch } from '../types';
import { taskApi, userApi, branchApi } from '../api/apiClient';
import { formatDate, formatDateTime } from '../utils/dateUtils';

interface TaskDetailModalProps {
  visible: boolean;
  onDismiss: () => void;
  taskId?: number | null;
  onTaskUpdated?: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ 
  visible, 
  onDismiss, 
  taskId,
  onTaskUpdated 
}) => {
  // Zustandsvariablen für Aufgabendetails
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  
  // Zustandsvariablen für bearbeitbare Felder
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('open');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Zustandsvariablen für Benutzer und Branchen
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  
  // Modalzustand
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  
  // Aufgabe laden, wenn die Komponente gemountet wird oder sich taskId ändert
  useEffect(() => {
    if (visible && taskId) {
      loadTask();
    } else if (visible && !taskId) {
      // Neuer Task-Modus
      resetForm();
      setEditMode(true);
      // Benutzer und Branches für neue Aufgabe laden
      loadUsersAndBranches();
    }
  }, [visible, taskId]);
  
  const loadTask = async () => {
    if (!taskId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const taskData = await taskApi.getById(taskId);
      setTask(taskData);
      
      // Formularfelder mit Aufgabendaten füllen
      setTitle(taskData.title);
      setDescription(taskData.description || '');
      setStatus(taskData.status);
      setDueDate(taskData.dueDate ? new Date(taskData.dueDate) : null);
      setSelectedUser(taskData.responsible || null);
      setSelectedBranch(taskData.branch || null);
      
      // Benutzer und Branches für Bearbeitung laden
      loadUsersAndBranches();
    } catch (error) {
      console.error('Fehler beim Laden der Aufgabe:', error);
      setError('Die Aufgabe konnte nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadUsersAndBranches = async () => {
    try {
      const [usersData, branchesData] = await Promise.all([
        userApi.getAllUsers(),
        branchApi.getAllBranches()
      ]);
      
      setUsers(usersData);
      setBranches(branchesData);
    } catch (error) {
      console.error('Fehler beim Laden von Benutzern und Branches:', error);
      // Kein kritischer Fehler, daher kein Alert
    }
  };
  
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus('open');
    setDueDate(null);
    setSelectedUser(null);
    setSelectedBranch(null);
    setEditMode(false);
    setError(null);
  };
  
  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Fehler', 'Bitte geben Sie einen Titel ein.');
      return;
    }
    
    setIsUpdating(true);
    
    try {
      const taskData = {
        title,
        description,
        status,
        dueDate: dueDate ? dueDate.toISOString() : null,
        responsibleId: selectedUser?.id,
        branchId: selectedBranch?.id,
      };
      
      if (taskId) {
        // Vorhandene Aufgabe aktualisieren
        await taskApi.update(taskId, taskData);
        Alert.alert('Erfolg', 'Die Aufgabe wurde erfolgreich aktualisiert.');
      } else {
        // Neue Aufgabe erstellen
        await taskApi.create(taskData);
        Alert.alert('Erfolg', 'Die Aufgabe wurde erfolgreich erstellt.');
      }
      
      if (onTaskUpdated) {
        onTaskUpdated();
      }
      
      setEditMode(false);
      
      // Nach dem Speichern einer neuen Aufgabe das Modal schließen
      if (!taskId) {
        onDismiss();
      } else {
        // Vorhandene Aufgabe neu laden, um die aktualisierten Daten anzuzeigen
        loadTask();
      }
    } catch (error) {
      console.error('Fehler beim Speichern der Aufgabe:', error);
      Alert.alert('Fehler', 'Die Aufgabe konnte nicht gespeichert werden.');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleDelete = async () => {
    if (!taskId) return;
    
    setIsUpdating(true);
    
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
      setIsUpdating(false);
      setShowConfirmationDialog(false);
    }
  };
  
  const handleStatusChange = async (newStatus: TaskStatus) => {
    setStatus(newStatus);
    
    if (!editMode && taskId) {
      // Im Anzeigemodus direkt den Status aktualisieren
      setIsUpdating(true);
      
      try {
        await taskApi.updateStatus(taskId, newStatus);
        
        // Aktualisiere die lokale Aufgabe
        if (task) {
          setTask({ ...task, status: newStatus });
        }
        
        if (onTaskUpdated) {
          onTaskUpdated();
        }
      } catch (error) {
        console.error('Fehler beim Aktualisieren des Status:', error);
        Alert.alert('Fehler', 'Der Status konnte nicht aktualisiert werden.');
        
        // Status auf den vorherigen Wert zurücksetzen
        if (task) {
          setStatus(task.status);
        }
      } finally {
        setIsUpdating(false);
      }
    }
  };
  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    
    if (selectedDate) {
      setDueDate(selectedDate);
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
  
  // Rendere Benutzermenü für die Verantwortlichkeit
  const renderUserMenu = () => (
    <Menu
      visible={showUserMenu}
      onDismiss={() => setShowUserMenu(false)}
      anchor={
        <Button 
          mode="outlined" 
          onPress={() => setShowUserMenu(true)}
          style={styles.selectButton}
          icon="account"
        >
          {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : 'Verantwortlichen auswählen'}
        </Button>
      }
      style={styles.menu}
    >
      {users.map((user) => (
        <Menu.Item
          key={user.id}
          onPress={() => {
            setSelectedUser(user);
            setShowUserMenu(false);
          }}
          title={`${user.firstName} ${user.lastName}`}
        />
      ))}
      {selectedUser && (
        <Menu.Item
          onPress={() => {
            setSelectedUser(null);
            setShowUserMenu(false);
          }}
          title="Keiner"
          leadingIcon="account-off"
        />
      )}
    </Menu>
  );
  
  // Rendere Branchmenü für die Zuordnung
  const renderBranchMenu = () => (
    <Menu
      visible={showBranchMenu}
      onDismiss={() => setShowBranchMenu(false)}
      anchor={
        <Button 
          mode="outlined" 
          onPress={() => setShowBranchMenu(true)}
          style={styles.selectButton}
          icon="source-branch"
        >
          {selectedBranch ? selectedBranch.name : 'Branch auswählen'}
        </Button>
      }
      style={styles.menu}
    >
      {branches.map((branch) => (
        <Menu.Item
          key={branch.id}
          onPress={() => {
            setSelectedBranch(branch);
            setShowBranchMenu(false);
          }}
          title={branch.name}
        />
      ))}
      {selectedBranch && (
        <Menu.Item
          onPress={() => {
            setSelectedBranch(null);
            setShowBranchMenu(false);
          }}
          title="Keiner"
          leadingIcon="source-branch-check"
        />
      )}
    </Menu>
  );
  
  // Rendere Löschbestätigungsdialog
  const renderConfirmationDialog = () => (
    <Portal>
      <Modal
        visible={showConfirmationDialog}
        onDismiss={() => setShowConfirmationDialog(false)}
        contentContainerStyle={styles.confirmationModal}
      >
        <Text style={styles.confirmationTitle}>Aufgabe löschen?</Text>
        <Text style={styles.confirmationText}>
          Möchten Sie diese Aufgabe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
        </Text>
        <View style={styles.confirmationButtons}>
          <Button 
            mode="outlined" 
            onPress={() => setShowConfirmationDialog(false)}
            style={styles.cancelButton}
          >
            Abbrechen
          </Button>
          <Button 
            mode="contained" 
            onPress={handleDelete}
            style={styles.deleteButton}
            loading={isUpdating}
            disabled={isUpdating}
          >
            Löschen
          </Button>
        </View>
      </Modal>
    </Portal>
  );
  
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
        dismissable={!isUpdating}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Aufgabe wird geladen...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Button mode="contained" onPress={loadTask} style={styles.retryButton}>
              Erneut versuchen
            </Button>
            <Button mode="outlined" onPress={onDismiss} style={styles.closeButton}>
              Schließen
            </Button>
          </View>
        ) : (
          <ScrollView>
            <View style={styles.header}>
              <Text style={styles.title}>
                {taskId ? (editMode ? 'Aufgabe bearbeiten' : 'Aufgabendetails') : 'Neue Aufgabe'}
              </Text>
              
              {taskId && !editMode && (
                <View style={styles.actionButtons}>
                  <IconButton
                    icon="pencil"
                    size={20}
                    onPress={() => setEditMode(true)}
                  />
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => setShowConfirmationDialog(true)}
                    iconColor="#EF4444"
                  />
                </View>
              )}
            </View>
            
            <Divider style={styles.divider} />
            
            {/* Aufgabendetails */}
            <View style={styles.content}>
              {editMode ? (
                <>
                  <TextInput
                    label="Titel"
                    value={title}
                    onChangeText={setTitle}
                    style={styles.input}
                    disabled={isUpdating}
                  />
                  
                  <TextInput
                    label="Beschreibung"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    style={styles.input}
                    disabled={isUpdating}
                  />
                  
                  <Text style={styles.sectionLabel}>Status:</Text>
                  <View style={styles.statusButtons}>
                    <Button
                      mode={status === 'open' ? 'contained' : 'outlined'}
                      onPress={() => setStatus('open')}
                      style={[styles.statusButton, { borderColor: '#3B82F6' }]}
                      textColor={status === 'open' ? 'white' : '#3B82F6'}
                      disabled={isUpdating}
                    >
                      Offen
                    </Button>
                    <Button
                      mode={status === 'in_progress' ? 'contained' : 'outlined'}
                      onPress={() => setStatus('in_progress')}
                      style={[styles.statusButton, { borderColor: '#EAB308' }]}
                      textColor={status === 'in_progress' ? 'white' : '#EAB308'}
                      disabled={isUpdating}
                    >
                      In Bearbeitung
                    </Button>
                    <Button
                      mode={status === 'done' ? 'contained' : 'outlined'}
                      onPress={() => setStatus('done')}
                      style={[styles.statusButton, { borderColor: '#10B981' }]}
                      textColor={status === 'done' ? 'white' : '#10B981'}
                      disabled={isUpdating}
                    >
                      Erledigt
                    </Button>
                  </View>
                  
                  <Text style={styles.sectionLabel}>Fälligkeitsdatum:</Text>
                  <View style={styles.dateContainer}>
                    <Button
                      mode="outlined"
                      onPress={() => setShowDatePicker(true)}
                      icon="calendar"
                      style={styles.dateButton}
                      disabled={isUpdating}
                    >
                      {dueDate ? formatDate(dueDate) : 'Datum auswählen'}
                    </Button>
                    
                    {dueDate && (
                      <IconButton
                        icon="close"
                        size={20}
                        onPress={() => setDueDate(null)}
                        disabled={isUpdating}
                      />
                    )}
                  </View>
                  
                  {showDatePicker && (
                    <DateTimePicker
                      value={dueDate || new Date()}
                      mode="date"
                      display="default"
                      onChange={handleDateChange}
                    />
                  )}
                  
                  <Text style={styles.sectionLabel}>Verantwortlich:</Text>
                  {renderUserMenu()}
                  
                  <Text style={styles.sectionLabel}>Branch:</Text>
                  {renderBranchMenu()}
                  
                  <View style={styles.buttonContainer}>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        if (taskId) {
                          setEditMode(false);
                          loadTask(); // Daten neu laden, um Änderungen zu verwerfen
                        } else {
                          onDismiss();
                        }
                      }}
                      style={styles.button}
                      disabled={isUpdating}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      mode="contained"
                      onPress={handleSave}
                      style={styles.button}
                      loading={isUpdating}
                      disabled={isUpdating || !title.trim()}
                    >
                      Speichern
                    </Button>
                  </View>
                </>
              ) : (
                // Anzeigemodus
                <>
                  <Text style={styles.detailTitle}>{title}</Text>
                  
                  <Chip 
                    style={[styles.statusChip, { backgroundColor: getStatusColor(status) }]}
                    textStyle={{ color: 'white' }}
                  >
                    {getStatusText(status)}
                  </Chip>
                  
                  <Text style={styles.sectionLabel}>Status:</Text>
                  <View style={styles.statusButtons}>
                    <Button
                      mode={status === 'open' ? 'contained' : 'outlined'}
                      onPress={() => handleStatusChange('open')}
                      style={[styles.statusButton, { borderColor: '#3B82F6' }]}
                      textColor={status === 'open' ? 'white' : '#3B82F6'}
                      disabled={isUpdating || status === 'open'}
                    >
                      Offen
                    </Button>
                    <Button
                      mode={status === 'in_progress' ? 'contained' : 'outlined'}
                      onPress={() => handleStatusChange('in_progress')}
                      style={[styles.statusButton, { borderColor: '#EAB308' }]}
                      textColor={status === 'in_progress' ? 'white' : '#EAB308'}
                      disabled={isUpdating || status === 'in_progress'}
                    >
                      In Bearbeitung
                    </Button>
                    <Button
                      mode={status === 'done' ? 'contained' : 'outlined'}
                      onPress={() => handleStatusChange('done')}
                      style={[styles.statusButton, { borderColor: '#10B981' }]}
                      textColor={status === 'done' ? 'white' : '#10B981'}
                      disabled={isUpdating || status === 'done'}
                    >
                      Erledigt
                    </Button>
                  </View>
                  
                  <Text style={styles.sectionLabel}>Beschreibung:</Text>
                  <Text style={styles.description}>
                    {description || 'Keine Beschreibung vorhanden'}
                  </Text>
                  
                  <Divider style={styles.divider} />
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fälligkeitsdatum:</Text>
                    <Text style={styles.detailValue}>
                      {dueDate ? formatDate(dueDate) : 'Nicht gesetzt'}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Verantwortlich:</Text>
                    <Text style={styles.detailValue}>
                      {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : 'Nicht zugewiesen'}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Branch:</Text>
                    <Text style={styles.detailValue}>
                      {selectedBranch ? selectedBranch.name : 'Nicht zugewiesen'}
                    </Text>
                  </View>
                  
                  {task?.createdAt && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Erstellt am:</Text>
                      <Text style={styles.detailValue}>
                        {formatDateTime(new Date(task.createdAt))}
                      </Text>
                    </View>
                  )}
                  
                  {task?.updatedAt && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Zuletzt aktualisiert:</Text>
                      <Text style={styles.detailValue}>
                        {formatDateTime(new Date(task.updatedAt))}
                      </Text>
                    </View>
                  )}
                  
                  <Button
                    mode="outlined"
                    onPress={onDismiss}
                    style={styles.closeButtonSingle}
                  >
                    Schließen
                  </Button>
                </>
              )}
            </View>
          </ScrollView>
        )}
        
        {renderConfirmationDialog()}
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
  confirmationModal: {
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
  cancelButton: {
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  selectButton: {
    marginVertical: 8,
  },
  menu: {
    maxHeight: 300,
  },
});

export default TaskDetailModal; 