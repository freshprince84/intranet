/**
 * TaskFilterModal Komponente
 * Ermöglicht das Filtern von Tasks und Speichern von Filter-Einstellungen
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Modal, Portal, Text, Button, Chip, TextInput, Divider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TaskStatus } from '../types';
import { useNetInfo } from '@react-native-community/netinfo';

// Status-Farben und Labels (gleiche Werte wie in TaskCard)
const statusColors = {
  open: '#3B82F6', // Blau
  in_progress: '#EAB308', // Gelb
  improval: '#EF4444', // Rot
  quality_control: '#8B5CF6', // Lila
  done: '#10B981' // Grün
};

const statusLabels = {
  open: 'Offen',
  in_progress: 'In Bearbeitung',
  improval: 'Nachbesserung',
  quality_control: 'Qualitätskontrolle',
  done: 'Erledigt'
};

// Speicherkey für Filter im AsyncStorage
const SAVED_FILTERS_KEY = '@IntranetApp:savedTaskFilters';

// Interface für gespeicherte Filter
interface SavedFilter {
  id: string;
  name: string;
  status: TaskStatus[];
  searchTerm: string;
  dateRange?: {
    from: string | null;
    to: string | null;
  };
}

// Props für die TaskFilterModal-Komponente
interface TaskFilterModalProps {
  visible: boolean;
  onDismiss: () => void;
  onApplyFilters: (filters: {
    status: TaskStatus[];
    searchTerm: string;
    dateRange?: {
      from: string | null;
      to: string | null;
    };
  }) => void;
  currentSearchTerm?: string;
}

const TaskFilterModal: React.FC<TaskFilterModalProps> = ({
  visible,
  onDismiss,
  onApplyFilters,
  currentSearchTerm = ''
}) => {
  const netInfo = useNetInfo();
  
  // Filter-Status
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState(currentSearchTerm);
  
  // Gespeicherte Filter
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [newFilterName, setNewFilterName] = useState('');
  const [showSaveFilterSection, setShowSaveFilterSection] = useState(false);
  
  // Lade gespeicherte Filter beim Öffnen des Modals
  useEffect(() => {
    if (visible) {
      loadSavedFilters();
    }
  }, [visible]);
  
  // Lade gespeicherte Filter aus dem AsyncStorage
  const loadSavedFilters = async () => {
    try {
      const savedFiltersJson = await AsyncStorage.getItem(SAVED_FILTERS_KEY);
      if (savedFiltersJson) {
        const parsedFilters = JSON.parse(savedFiltersJson);
        setSavedFilters(parsedFilters);
      }
    } catch (error) {
      console.error('Fehler beim Laden der gespeicherten Filter:', error);
    }
  };
  
  // Speichere einen neuen Filter
  const saveFilter = async () => {
    try {
      if (!newFilterName.trim()) {
        Alert.alert('Fehler', 'Bitte geben Sie einen Namen für den Filter ein.');
        return;
      }
      
      // Neuen Filter erstellen
      const newFilter: SavedFilter = {
        id: Date.now().toString(),
        name: newFilterName.trim(),
        status: selectedStatus,
        searchTerm: searchTerm
      };
      
      // Zu den bestehenden Filtern hinzufügen
      const updatedFilters = [...savedFilters, newFilter];
      
      // Im AsyncStorage speichern
      await AsyncStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updatedFilters));
      
      // State aktualisieren
      setSavedFilters(updatedFilters);
      setNewFilterName('');
      setShowSaveFilterSection(false);
      
      Alert.alert('Erfolg', 'Filter wurde gespeichert.');
    } catch (error) {
      console.error('Fehler beim Speichern des Filters:', error);
      Alert.alert('Fehler', 'Der Filter konnte nicht gespeichert werden.');
    }
  };
  
  // Lösche einen gespeicherten Filter
  const deleteFilter = async (filterId: string) => {
    try {
      // Filter aus der Liste entfernen
      const updatedFilters = savedFilters.filter(filter => filter.id !== filterId);
      
      // Im AsyncStorage speichern
      await AsyncStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updatedFilters));
      
      // State aktualisieren
      setSavedFilters(updatedFilters);
      
      Alert.alert('Erfolg', 'Filter wurde gelöscht.');
    } catch (error) {
      console.error('Fehler beim Löschen des Filters:', error);
      Alert.alert('Fehler', 'Der Filter konnte nicht gelöscht werden.');
    }
  };
  
  // Wende einen gespeicherten Filter an
  const applyFilter = (filter: SavedFilter) => {
    setSelectedStatus(filter.status);
    setSearchTerm(filter.searchTerm);
  };
  
  // Zurücksetzen der Filter
  const resetFilters = () => {
    setSelectedStatus([]);
    setSearchTerm('');
  };
  
  // Umschalten des Status-Filters
  const toggleStatus = (status: TaskStatus) => {
    if (selectedStatus.includes(status)) {
      setSelectedStatus(selectedStatus.filter(s => s !== status));
    } else {
      setSelectedStatus([...selectedStatus, status]);
    }
  };
  
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Aufgaben filtern</Text>
          <Button onPress={onDismiss}>Schließen</Button>
        </View>
        
        <ScrollView style={styles.scrollView}>
          {/* Gespeicherte Filter */}
          {savedFilters.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Gespeicherte Filter</Text>
              <ScrollView horizontal style={styles.savedFiltersContainer}>
                {savedFilters.map(filter => (
                  <Chip
                    key={filter.id}
                    style={styles.savedFilterChip}
                    onPress={() => applyFilter(filter)}
                    onClose={() => deleteFilter(filter.id)}
                  >
                    {filter.name}
                  </Chip>
                ))}
              </ScrollView>
            </View>
          )}
          
          {/* Suchbegriff */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suchbegriff</Text>
            <TextInput
              style={styles.input}
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Nach Text suchen..."
              mode="outlined"
            />
          </View>
          
          {/* Status-Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.statusContainer}>
              {Object.entries(statusLabels).map(([status, label]) => (
                <Chip
                  key={status}
                  selected={selectedStatus.includes(status as TaskStatus)}
                  onPress={() => toggleStatus(status as TaskStatus)}
                  style={[
                    styles.statusChip,
                    { backgroundColor: selectedStatus.includes(status as TaskStatus) ? statusColors[status as TaskStatus] : '#E5E7EB' }
                  ]}
                  textStyle={{ color: selectedStatus.includes(status as TaskStatus) ? 'white' : '#374151' }}
                >
                  {label}
                </Chip>
              ))}
            </View>
          </View>
          
          {/* Filter speichern */}
          <View style={styles.section}>
            <Button
              mode="text"
              onPress={() => setShowSaveFilterSection(!showSaveFilterSection)}
              style={styles.saveFilterButton}
            >
              {showSaveFilterSection ? 'Abbrechen' : 'Filter speichern'}
            </Button>
            
            {showSaveFilterSection && (
              <View style={styles.saveFilterSection}>
                <TextInput
                  style={styles.input}
                  value={newFilterName}
                  onChangeText={setNewFilterName}
                  placeholder="Filter-Name eingeben..."
                  mode="outlined"
                />
                <Button
                  mode="contained"
                  onPress={saveFilter}
                  style={styles.saveButton}
                >
                  Speichern
                </Button>
              </View>
            )}
          </View>
        </ScrollView>
        
        <View style={styles.modalFooter}>
          <Button
            mode="outlined"
            onPress={resetFilters}
            style={styles.resetButton}
          >
            Zurücksetzen
          </Button>
          <Button
            mode="contained"
            onPress={() => {
              onApplyFilters({
                status: selectedStatus,
                searchTerm: searchTerm
              });
              onDismiss();
            }}
            style={styles.applyButton}
          >
            Filter anwenden
          </Button>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 20,
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
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  scrollView: {
    maxHeight: '70%',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#374151',
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#f8f9fa',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 16,
  },
  savedFiltersContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  savedFilterChip: {
    marginRight: 8,
    borderRadius: 16,
  },
  saveFilterButton: {
    marginBottom: 10,
  },
  saveFilterSection: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  saveButton: {
    marginTop: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  resetButton: {
    flex: 1,
    marginRight: 8,
  },
  applyButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#3B82F6',
  },
});

export default TaskFilterModal; 