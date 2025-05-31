/**
 * TaskFilterModal Komponente
 * Ermöglicht das Filtern von Tasks und Speichern von Filter-Einstellungen
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Modal, Portal, Text, Button, Chip, TextInput, Divider, IconButton } from 'react-native-paper';
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
    saveFilter, 
    deleteFilter, 
    resetFilters,
    isLoading 
  } = useFilter();
  
  // Lokale States für das Modal, die mit den activeFilters synchronisiert werden
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState(currentSearchTerm);
  
  // State für Filtererstellung
  const [newFilterName, setNewFilterName] = useState('');
  const [showSaveFilterSection, setShowSaveFilterSection] = useState(false);
  
  // Synchronisiere lokale States mit activeFilters, wenn sich das Modal öffnet
  useEffect(() => {
    if (visible) {
      setSelectedStatus(activeFilters.status);
      setSearchTerm(activeFilters.searchTerm || currentSearchTerm);
    }
  }, [visible, activeFilters, currentSearchTerm]);
  
  // Umschalten des Status-Filters
  const toggleStatus = (status: TaskStatus) => {
    if (selectedStatus.includes(status)) {
      setSelectedStatus(selectedStatus.filter(s => s !== status));
    } else {
      setSelectedStatus([...selectedStatus, status]);
    }
  };
  
  // Filter zurücksetzen
  const handleResetFilters = () => {
    setSelectedStatus([]);
    setSearchTerm('');
  };
  
  // Filter anwenden
  const handleApplyFilters = () => {
    onApplyFilters({
      status: selectedStatus,
      searchTerm: searchTerm
    });
    onDismiss();
  };
  
  // Neuen Filter speichern
  const handleSaveFilter = async () => {
    if (!newFilterName.trim()) {
      Alert.alert('Fehler', 'Bitte geben Sie einen Namen für den Filter ein.');
      return;
    }
    
    try {
      // Speichere einen Filter mit dem aktuellen Status und Suchbegriff
      const success = await saveFilter(newFilterName.trim(), selectedStatus, searchTerm);
      
      if (success) {
        setNewFilterName('');
        setShowSaveFilterSection(false);
        Alert.alert('Erfolg', 'Filter wurde gespeichert.');
      } else {
        Alert.alert('Fehler', 'Der Filter konnte nicht gespeichert werden.');
      }
    } catch (error) {
      Alert.alert('Fehler', 'Der Filter konnte nicht gespeichert werden.');
      console.error('Fehler beim Speichern des Filters:', error);
    }
  };
  
  // Filter löschen
  const handleDeleteFilter = async (filterId: string) => {
    try {
      // Frage den Benutzer, ob er den Filter wirklich löschen möchte
      Alert.alert(
        'Filter löschen',
        'Möchten Sie diesen Filter wirklich löschen?',
        [
          {
            text: 'Abbrechen',
            style: 'cancel'
          },
          {
            text: 'Löschen',
            onPress: async () => {
              const success = await deleteFilter(filterId);
              if (success) {
                Alert.alert('Erfolg', 'Filter wurde gelöscht.');
              } else {
                Alert.alert('Fehler', 'Der Filter konnte nicht gelöscht werden.');
              }
            },
            style: 'destructive'
          }
        ]
      );
    } catch (error) {
      Alert.alert('Fehler', 'Der Filter konnte nicht gelöscht werden.');
      console.error('Fehler beim Löschen des Filters:', error);
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
              <View style={styles.savedFiltersContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {savedFilters.map((filter) => (
                    <View key={filter.id} style={styles.savedFilterContainer}>
                      <Chip
                        onPress={() => {
                          setSelectedStatus(filter.status);
                          setSearchTerm(filter.searchTerm);
                        }}
                        style={styles.savedFilterChip}
                      >
                        {filter.name}
                      </Chip>
                      <IconButton
                        icon="delete"
                        size={16}
                        onPress={() => handleDeleteFilter(filter.id)}
                        style={styles.deleteFilterButton}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
          
          {/* Suchbegriff */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suchbegriff</Text>
            <TextInput
              placeholder="Suchbegriff eingeben..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={styles.input}
            />
          </View>
          
          {/* Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.statusContainer}>
              {(Object.keys(statusLabels) as TaskStatus[]).map((status) => (
                <Chip
                  key={status}
                  selected={selectedStatus.includes(status)}
                  onPress={() => toggleStatus(status)}
                  style={[
                    styles.statusChip,
                    selectedStatus.includes(status) && { backgroundColor: statusColors[status] }
                  ]}
                >
                  {statusLabels[status]}
                </Chip>
              ))}
            </View>
          </View>
          
          {/* Filter speichern */}
          {!showSaveFilterSection ? (
            <Button
              mode="outlined"
              onPress={() => setShowSaveFilterSection(true)}
              icon="content-save"
              style={styles.saveFilterButton}
            >
              Filter speichern
            </Button>
          ) : (
            <View style={styles.saveFilterSection}>
              <Text style={styles.sectionTitle}>Filter speichern</Text>
              <TextInput
                placeholder="Name des Filters..."
                value={newFilterName}
                onChangeText={setNewFilterName}
                style={styles.input}
              />
              <Button
                mode="contained"
                onPress={handleSaveFilter}
                disabled={!newFilterName.trim()}
                style={styles.saveButton}
              >
                Speichern
              </Button>
              <Button
                mode="text"
                onPress={() => setShowSaveFilterSection(false)}
              >
                Abbrechen
              </Button>
            </View>
          )}
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
            onPress={handleApplyFilters}
            style={styles.applyButton}
          >
            Anwenden
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
  savedFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  savedFilterChip: {
    marginRight: 4,
    borderRadius: 16,
  },
  deleteFilterButton: {
    padding: 0,
    margin: 0,
    height: 24,
    width: 24,
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