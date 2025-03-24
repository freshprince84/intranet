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

// Screens importieren
import LoginScreen from '../screens/LoginScreen';
import WorktimeScreen from '../screens/WorktimeScreen';

// Platzhalter-Screens für noch nicht implementierte Seiten
const DashboardScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#0000ff" />
  </View>
);

const ProfileScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#0000ff" />
  </View>
);

const SettingsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#0000ff" />
  </View>
);

// Stack-Navigatoren definieren
const AppStack = createStackNavigator();
const AuthStack = createStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Tab-Navigation für authentifizierte Benutzer
 */
const TabNavigator = () => (
  <Tab.Navigator>
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
      component={ProfileScreen} 
      options={{
        title: 'Profil',
      }}
    />
    <Tab.Screen 
      name="Settings" 
      component={SettingsScreen}
      options={{
        title: 'Einstellungen',
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
    <NavigationContainer>
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