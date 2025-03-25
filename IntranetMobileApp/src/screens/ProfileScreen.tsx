import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Avatar, Text, Card, Button, Divider, List } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const ProfileScreen = () => {
  const { user, signOut } = useAuth();

  const userInfo = {
    firstName: user?.firstName || 'Max',
    lastName: user?.lastName || 'Mustermann',
    email: user?.email || 'max.mustermann@example.com',
    role: 'Administrator',
    department: 'IT-Abteilung',
    joinDate: '01.06.2020'
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Fehler beim Abmelden:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar.Text 
          size={80} 
          label={`${userInfo.firstName.charAt(0)}${userInfo.lastName.charAt(0)}`} 
          color="#FFFFFF"
          style={{ backgroundColor: "#3B82F6" }}
        />
        <Text style={styles.name}>{userInfo.firstName} {userInfo.lastName}</Text>
        <Text style={styles.role}>{userInfo.role}</Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <List.Item 
            title="E-Mail"
            description={userInfo.email}
            left={props => <MaterialCommunityIcons {...props} name="email" size={24} color="#3B82F6" />}
          />
          <Divider />
          <List.Item 
            title="Abteilung"
            description={userInfo.department}
            left={props => <MaterialCommunityIcons {...props} name="domain" size={24} color="#3B82F6" />}
          />
          <Divider />
          <List.Item 
            title="Angestellt seit"
            description={userInfo.joinDate}
            left={props => <MaterialCommunityIcons {...props} name="calendar" size={24} color="#3B82F6" />}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <List.Item 
            title="Persönliche Einstellungen"
            left={props => <MaterialCommunityIcons {...props} name="account-cog" size={24} color="#3B82F6" />}
            right={props => <MaterialCommunityIcons {...props} name="chevron-right" size={24} color="#6B7280" />}
          />
          <Divider />
          <List.Item 
            title="Benachrichtigungen"
            left={props => <MaterialCommunityIcons {...props} name="bell" size={24} color="#3B82F6" />}
            right={props => <MaterialCommunityIcons {...props} name="chevron-right" size={24} color="#6B7280" />}
          />
          <Divider />
          <List.Item 
            title="Sicherheit & Datenschutz"
            left={props => <MaterialCommunityIcons {...props} name="shield-account" size={24} color="#3B82F6" />}
            right={props => <MaterialCommunityIcons {...props} name="chevron-right" size={24} color="#6B7280" />}
          />
        </Card.Content>
      </Card>

      <Button 
        mode="outlined" 
        style={styles.logoutButton}
        icon={({ size, color }) => (
          <MaterialCommunityIcons name="logout" size={size} color={color} />
        )}
        onPress={handleLogout}
      >
        Abmelden
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginVertical: 24,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  role: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  card: {
    marginBottom: 16,
  },
  logoutButton: {
    marginTop: 8,
    marginBottom: 24,
    borderColor: '#EF4444',
    borderWidth: 1,
  },
});

export default ProfileScreen; 