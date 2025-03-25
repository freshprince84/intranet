import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, Switch, Divider, Text, Card, Button, Dialog, Portal } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const SettingsScreen = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [locationTracking, setLocationTracking] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const toggleDarkMode = () => setDarkMode(!darkMode);
  const toggleNotifications = () => setNotifications(!notifications);
  const toggleLocationTracking = () => setLocationTracking(!locationTracking);

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Darstellung</Text>
          <List.Item
            title="Dark Mode"
            description="Dunkles Farbschema aktivieren"
            left={props => <MaterialCommunityIcons {...props} name="theme-light-dark" size={24} color="#3B82F6" />}
            right={props => <Switch value={darkMode} onValueChange={toggleDarkMode} color="#3B82F6" />}
          />
          <Divider />
          <List.Item
            title="Text-Größe"
            description="Standardgröße"
            left={props => <MaterialCommunityIcons {...props} name="format-size" size={24} color="#3B82F6" />}
            right={props => <MaterialCommunityIcons {...props} name="chevron-right" size={24} color="#6B7280" />}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Benachrichtigungen</Text>
          <List.Item
            title="Push-Benachrichtigungen"
            description="Erhalte Echtzeit-Updates"
            left={props => <MaterialCommunityIcons {...props} name="bell" size={24} color="#3B82F6" />}
            right={props => <Switch value={notifications} onValueChange={toggleNotifications} color="#3B82F6" />}
          />
          <Divider />
          <List.Item
            title="E-Mail-Benachrichtigungen"
            description="Tägliche Zusammenfassung"
            left={props => <MaterialCommunityIcons {...props} name="email" size={24} color="#3B82F6" />}
            right={props => <MaterialCommunityIcons {...props} name="chevron-right" size={24} color="#6B7280" />}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Datenschutz</Text>
          <List.Item
            title="Standortverfolgung"
            description="Ermöglicht automatische Zeiterfassung bei Ankunft am Arbeitsplatz"
            left={props => <MaterialCommunityIcons {...props} name="map-marker" size={24} color="#3B82F6" />}
            right={props => <Switch value={locationTracking} onValueChange={toggleLocationTracking} color="#3B82F6" />}
          />
          <Divider />
          <List.Item
            title="Datenspeicherung"
            description="Verwalte lokal gespeicherte Daten"
            left={props => <MaterialCommunityIcons {...props} name="database" size={24} color="#3B82F6" />}
            right={props => <MaterialCommunityIcons {...props} name="chevron-right" size={24} color="#6B7280" />}
          />
          <Divider />
          <List.Item
            title="Protokolle löschen"
            description="Entferne alle App-Protokolle"
            left={props => <MaterialCommunityIcons {...props} name="delete" size={24} color="#EF4444" />}
            onPress={() => setShowDialog(true)}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Über</Text>
          <List.Item
            title="App-Version"
            description="1.0.0"
            left={props => <MaterialCommunityIcons {...props} name="information" size={24} color="#3B82F6" />}
          />
          <Divider />
          <List.Item
            title="Nutzungsbedingungen"
            left={props => <MaterialCommunityIcons {...props} name="file-document" size={24} color="#3B82F6" />}
            right={props => <MaterialCommunityIcons {...props} name="chevron-right" size={24} color="#6B7280" />}
          />
          <Divider />
          <List.Item
            title="Datenschutzrichtlinie"
            left={props => <MaterialCommunityIcons {...props} name="shield" size={24} color="#3B82F6" />}
            right={props => <MaterialCommunityIcons {...props} name="chevron-right" size={24} color="#6B7280" />}
          />
        </Card.Content>
      </Card>

      <Portal>
        <Dialog visible={showDialog} onDismiss={() => setShowDialog(false)}>
          <Dialog.Title>Protokolle löschen</Dialog.Title>
          <Dialog.Content>
            <Text>Möchten Sie wirklich alle App-Protokolle löschen?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDialog(false)}>Abbrechen</Button>
            <Button onPress={() => setShowDialog(false)}>Löschen</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});

export default SettingsScreen; 