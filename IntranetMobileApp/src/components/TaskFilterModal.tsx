/**
 * TaskFilterModal Komponente
 * Ermöglicht das Filtern von Tasks und Speichern von Filter-Einstellungen
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Modal, Portal, Text, Button, Chip, TextInput, Divider } from 'react-native-paper';
import { TaskStatus } from '../types';
import { useFilter } from '../contexts/FilterContext';

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
  // Verwende den FilterContext
  const {
    savedFilters,
    activeFilters,
    searchQuery,
    setSearchQuery,
    saveFilter,
    deleteFilter,
    handleFilterSelect,
    resetFilters
  } = useFilter();
  
  // Lokale Filter-Status
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState(currentSearchTerm);
  const [newFilterName, setNewFilterName] = useState('');
  const [showSaveFilterSection, setShowSaveFilterSection] = useState(false);
  
  // Aktualisiere lokale Filter-Status, wenn sich activeFilters ändert oder das Modal geöffnet wird
  useEffect(() => {
    if (visible) {
      setSelectedStatus(activeFilters.status);
      setSearchTerm(searchQuery);
    }
  }, [visible, activeFilters, searchQuery]);
  
  // Eigene Reset-Funktion für lokale Filter-Zustände
  const handleResetFilters = () => {
    setSelectedStatus([]);
    setSearchTerm('');
  };
  
  // Wechsele den Status eines Filters
  const toggleStatus = (status: TaskStatus) => {
    setSelectedStatus(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };
  
  // Wende einen gespeicherten Filter an
  const applyFilter = (filterId: string) => {
    const filter = savedFilters.find(f => f.id === filterId);
    if (filter) {
      setSelectedStatus(filter.status);
      setSearchTerm(filter.searchTerm);
    }
  };
  
  // Speichere einen neuen Filter
  const handleSaveFilter = async () => {
    try {
      if (!newFilterName.trim()) {
        Alert.alert('Fehler', 'Bitte geben Sie einen Namen für den Filter ein.');
        return;
      }
      
      const success = await saveFilter(
        newFilterName.trim(),
        selectedStatus,
        searchTerm
      );
      
      if (success) {
        setNewFilterName('');
        setShowSaveFilterSection(false);
        Alert.alert('Erfolg', 'Filter wurde gespeichert.');
      } else {
        Alert.alert('Fehler', 'Der Filter konnte nicht gespeichert werden.');
      }
    } catch (error) {
      console.error('Fehler beim Speichern des Filters:', error);
      Alert.alert('Fehler', 'Der Filter konnte nicht gespeichert werden.');
    }
  };
  
  // Wende Filter an und wähle ihn aus
  const applySelectedFilter = () => {
    // Speichere den aktiven Filter temporär in den App-Status
    // und wende ihn als Filter auf die Aufgabenliste an
    onApplyFilters({
      status: selectedStatus,
      searchTerm: searchTerm
    });
    
    // Wichtig: Wir aktualisieren auch den Context, um die Filter-Status zu synchronisieren
    setSearchQuery(searchTerm);
    
    // Schließe den Modal
    onDismiss();
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
                    onPress={() => applyFilter(filter.id)}
                    onClose={() => deleteFilter(filter.id)}
                    style={styles.savedFilterChip}
                  >
                    {filter.name}
                  </Chip>
                ))}
              </ScrollView>
            </View>
          )}
          
          {/* Textsuche */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Textsuche</Text>
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
                  onPress={handleSaveFilter}
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
            onPress={handleResetFilters}
            style={styles.resetButton}
          >
            Zurücksetzen
          </Button>
          <Button
            mode="contained"
            onPress={applySelectedFilter}
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