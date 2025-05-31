/**
 * Hauptanwendung mit Navigation und Auth-Provider
 */
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { FilterProvider } from './src/contexts/FilterContext';
import AppNavigator from './src/navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <FilterProvider>
          <AppNavigator />
        </FilterProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
