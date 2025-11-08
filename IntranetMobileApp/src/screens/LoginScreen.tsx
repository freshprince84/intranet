/**
 * Login-Screen
 * Ermöglicht die Benutzeranmeldung
 */

import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { TextInput, Button, Text, Surface } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';

// Logo-Import sollte später hinzugefügt werden
// import Logo from '../assets/logo.png';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  /**
   * Login-Handler
   */
  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Eingabe erforderlich', 'Bitte gib Benutzername und Passwort ein.');
      return;
    }

    setIsLoading(true);
    try {
      await signIn({ username, password });
      // Bei erfolgreicher Anmeldung wird die Navigation automatisch umgestellt
    } catch (error) {
      Alert.alert(
        'Anmeldefehler',
        'Die Anmeldung ist fehlgeschlagen. Bitte überprüfe deine Zugangsdaten.'
      );
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.surface}>
        <View style={styles.logoContainer}>
          {/* Logo später hinzufügen */}
          {/* <Image source={Logo} style={styles.logo} resizeMode="contain" /> */}
          <Text style={styles.title}>Intranet Login</Text>
        </View>

        <TextInput
          label="Benutzername oder E-Mail"
          value={username}
          onChangeText={setUsername}
          style={styles.input}
          mode="outlined"
          autoCapitalize="none"
          disabled={isLoading}
        />

        <TextInput
          label="Passwort"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          mode="outlined"
          disabled={isLoading}
        />

        <Button
          mode="contained"
          onPress={handleLogin}
          style={styles.button}
          loading={isLoading}
          disabled={isLoading}
        >
          Anmelden
        </Button>

        <TouchableOpacity style={styles.helpLink}>
          <Text style={styles.helpText}>Passwort vergessen?</Text>
        </TouchableOpacity>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  surface: {
    padding: 20,
    borderRadius: 10,
    elevation: 4,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 8,
  },
  helpLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  helpText: {
    color: '#1976D2',
  },
});

export default LoginScreen; 