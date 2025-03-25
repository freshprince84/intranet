/**
 * Hauptanwendung mit Navigation und Auth-Provider
 */
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './contexts/AuthContext';
import AppNavigator from './navigation';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import DynamicAppIcon from './components/DynamicAppIcon';

// Thema definieren basierend auf den Design-Standards
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#3B82F6', // Blau
    accent: '#10B981',  // Grün
    error: '#EF4444',   // Rot
    background: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#111827',
    disabled: '#E5E7EB',
    placeholder: '#6B7280',
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <DynamicAppIcon />
          <AppNavigator />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
} 