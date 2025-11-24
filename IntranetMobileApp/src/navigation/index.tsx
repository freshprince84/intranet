/**
 * Navigation für die mobile App
 * Enthält die Hauptnavigationsstruktur und -konfiguration
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Screens importieren
import LoginScreen from '../screens/LoginScreen';
import WorktimeScreen from '../screens/WorktimeScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Neue Screens importieren
import NotificationsScreen from '../screens/NotificationsScreen';

// Stack-Navigatoren definieren
const AppStack = createStackNavigator();
const AuthStack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Stack für Profil und Einstellungen
const ProfileStack = createStackNavigator();
const ProfileStackNavigator = () => (
  <ProfileStack.Navigator>
    <ProfileStack.Screen
      name="ProfileMain"
      component={ProfileScreen}
      options={{ title: 'Profil' }}
    />
    <ProfileStack.Screen
      name="Settings"
      component={SettingsScreen}
      options={{ title: 'Einstellungen' }}
    />
    <ProfileStack.Screen
      name="Notifications"
      component={NotificationsScreen}
      options={{ title: 'Benachrichtigungen' }}
    />
  </ProfileStack.Navigator>
);

/**
 * Tab-Navigation für authentifizierte Benutzer
 */
const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        let iconName = 'help-circle'; // Fallback-Icon

        if (route.name === 'Dashboard') {
          iconName = 'view-dashboard';
        } else if (route.name === 'Worktime') {
          iconName = 'clock-outline';
        } else if (route.name === 'Profile') {
          iconName = 'account';
        }

        return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#3B82F6',
      tabBarInactiveTintColor: 'gray',
      headerShown: false, // Header in den Stack-Navigatoren zeigen, nicht in Tabs
    })}
  >
    <Tab.Screen 
      name="Dashboard" 
      component={DashboardScreen} 
      options={{
        title: 'Dashboard',
      }}
    />
    <Tab.Screen 
      name="Worktime" 
      component={WorktimeScreen} 
      options={{
        title: 'Zeiterfassung',
      }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileStackNavigator} 
      options={{
        title: 'Profil',
      }}
    />
  </Tab.Navigator>
);

/**
 * Auth-Navigation für nicht-authentifizierte Benutzer
 */
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
  </AuthStack.Navigator>
);

/**
 * Haupt-Navigation
 * Wechselt basierend auf dem Auth-Status
 */
export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  // Lade-Indikator anzeigen, während der Auth-Status geprüft wird
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          primary: '#3B82F6',
          background: '#FFFFFF',
          card: '#FFFFFF',
          text: '#111827',
          border: '#E5E7EB',
          notification: '#EF4444',
        },
      }}
    >
      {isAuthenticated ? (
        <AppStack.Navigator screenOptions={{ headerShown: false }}>
          <AppStack.Screen name="Main" component={TabNavigator} />
        </AppStack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
} 