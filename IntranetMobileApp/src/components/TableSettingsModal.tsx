/**
 * TableSettingsModal Komponente
 * Ermöglicht die Konfiguration von angezeigten Spalten und Tabelleneinstellungen
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Modal, Portal, Text, Button, Checkbox, Divider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Speicherkey für Tabelleneinstellungen im AsyncStorage
const TABLE_SETTINGS_KEY = '@IntranetApp:tableSettings';

// Verfügbare Spalten für Tasks
const availableColumns = [
  { id: 'title', label: 'Titel', required: true },
  { id: 'status', label: 'Status', required: true },
  { id: 'description', label: 'Beschreibung', required: false },
  { id: 'responsible', label: 'Verantwortlich', required: false },
  { id: 'branch', label: 'Niederlassung', required: false },
  { id: 'dueDate', label: 'Fälligkeitsdatum', required: false },
  { id: 'role', label: 'Rolle', required: false },
  { id: 'qualityControl', label: 'Qualitätskontrolle', required: false }
];

// Interface für Tabelleneinstellungen
interface TableSettings {
  tableId: string;
  columns: string[];
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  itemsPerPage?: number;
}

// Props für die TableSettingsModal-Komponente
interface TableSettingsModalProps {
  visible: boolean;
  onDismiss: () => void;
  onApplySettings: (settings: TableSettings) => void;
  tableId: string;
  tableSettings?: TableSettings;
}

const TableSettingsModal: React.FC<TableSettingsModalProps> = ({
  visible,
  onDismiss,
  onApplySettings,
  tableId,
  tableSettings: initialTableSettings
}) => {
  // State für ausgewählte Spalten
  const [selectedColumns, setSelectedColumns] = useState<string[]>(['title', 'status', 'description']);
  const [settings, setSettings] = useState<TableSettings>({
    tableId,
    columns: ['title', 'status', 'description'],
    sortBy: 'dueDate',
    sortDirection: 'asc',
    itemsPerPage: 10
  });
  
  // Lade Einstellungen beim Öffnen des Modals oder wenn sich tableSettings ändert
  useEffect(() => {
    if (visible) {
      if (initialTableSettings) {
        // Verwende übergebene tableSettings, falls vorhanden
        setSettings(initialTableSettings);
        setSelectedColumns(initialTableSettings.columns);
      } else {
        // Sonst lade aus AsyncStorage
        loadSettings();
      }
    }
  }, [visible, tableId, initialTableSettings]);
  
  // Lade gespeicherte Einstellungen aus dem AsyncStorage
  const loadSettings = async () => {
    try {
      const settingsJson = await AsyncStorage.getItem(`${TABLE_SETTINGS_KEY}_${tableId}`);
      if (settingsJson) {
        const parsedSettings = JSON.parse(settingsJson);
        setSettings(parsedSettings);
        setSelectedColumns(parsedSettings.columns);
      } else {
        // Standardeinstellungen, wenn nichts gespeichert ist
        const defaultColumns = availableColumns
          .filter(col => col.required || ['title', 'status', 'description'].includes(col.id))
          .map(col => col.id);
        
        setSelectedColumns(defaultColumns);
        setSettings({
          tableId,
          columns: defaultColumns,
          sortBy: 'dueDate',
          sortDirection: 'asc',
          itemsPerPage: 10
        });
      }
    } catch (error) {
      console.error('Fehler beim Laden der Tabelleneinstellungen:', error);
    }
  };
  
  // Speichere Einstellungen
  const saveSettings = async () => {
    try {
      // Stelle sicher, dass erforderliche Spalten enthalten sind
      const requiredColumns = availableColumns
        .filter(col => col.required)
        .map(col => col.id);
      
      const updatedColumns = [...new Set([...requiredColumns, ...selectedColumns])];
      
      const updatedSettings: TableSettings = {
        ...settings,
        columns: updatedColumns
      };
      
      // Im AsyncStorage speichern
      await AsyncStorage.setItem(`${TABLE_SETTINGS_KEY}_${tableId}`, JSON.stringify(updatedSettings));
      
      // State aktualisieren
      setSettings(updatedSettings);
      
      // Anwenden der Einstellungen
      onApplySettings(updatedSettings);
      
      Alert.alert('Erfolg', 'Einstellungen wurden gespeichert.');
      onDismiss();
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      Alert.alert('Fehler', 'Die Einstellungen konnten nicht gespeichert werden.');
    }
  };
  
  // Zurücksetzen auf Standardeinstellungen
  const resetToDefault = () => {
    const defaultColumns = availableColumns
      .filter(col => col.required || ['title', 'status', 'description'].includes(col.id))
      .map(col => col.id);
    
    setSelectedColumns(defaultColumns);
  };
  
  // Umschalten einer Spalte
  const toggleColumn = (columnId: string) => {
    // Prüfe, ob es eine erforderliche Spalte ist
    const column = availableColumns.find(col => col.id === columnId);
    if (column?.required) {
      Alert.alert('Hinweis', 'Diese Spalte ist erforderlich und kann nicht deaktiviert werden.');
      return;
    }
    
    // Umschalten der Spalte
    if (selectedColumns.includes(columnId)) {
      setSelectedColumns(selectedColumns.filter(id => id !== columnId));
    } else {
      setSelectedColumns([...selectedColumns, columnId]);
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
          <Text style={styles.modalTitle}>Spalten konfigurieren</Text>
          <Button onPress={onDismiss}>Schließen</Button>
        </View>
        
        <ScrollView style={styles.scrollView}>
          <Text style={styles.description}>
            Wählen Sie die Spalten aus, die in der Aufgabenliste angezeigt werden sollen.
          </Text>
          
          <Divider style={styles.divider} />
          
          {/* Spaltenliste */}
          <View style={styles.columnList}>
            {availableColumns.map(column => (
              <View key={column.id} style={styles.columnItem}>
                <Checkbox
                  status={selectedColumns.includes(column.id) ? 'checked' : 'unchecked'}
                  onPress={() => toggleColumn(column.id)}
                  disabled={column.required}
                />
                <Text style={styles.columnLabel}>
                  {column.label}
                  {column.required && <Text style={styles.requiredText}> (erforderlich)</Text>}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
        
        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={resetToDefault}
            style={styles.resetButton}
          >
            Standard
          </Button>
          <View style={styles.rightButtons}>
            <Button
              mode="outlined"
              onPress={onDismiss}
              style={styles.cancelButton}
            >
              Abbrechen
            </Button>
            <Button
              mode="contained"
              onPress={saveSettings}
              style={styles.saveButton}
            >
              Speichern
            </Button>
          </View>
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
  description: {
    marginBottom: 16,
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 20,
  },
  scrollView: {
    marginBottom: 16,
  },
  divider: {
    marginBottom: 16,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  columnList: {
    marginBottom: 16,
  },
  columnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  columnLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },
  requiredText: {
    fontStyle: 'italic',
    color: '#9CA3AF',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  rightButtons: {
    flexDirection: 'row',
  },
  resetButton: {
    marginRight: 8,
  },
  cancelButton: {
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
  },
});

export default TableSettingsModal; 