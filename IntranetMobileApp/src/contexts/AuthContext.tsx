/**
 * AuthContext für die mobile App
 * Verwaltet den Authentifizierungsstatus und -prozess
 */

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/apiClient';

// Konstanten für AsyncStorage-Schlüssel
const TOKEN_STORAGE_KEY = '@IntranetApp:token';
const USER_STORAGE_KEY = '@IntranetApp:user';
const REFRESH_TOKEN_KEY = '@IntranetApp:refreshToken';

// Typen für den Auth-Context
interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  roles?: any[];
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (credentials: { username: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Auth-Context erstellen
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

/**
 * Auth-Provider-Komponente
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Beim Laden der App: Gespeicherte Benutzerdaten abrufen
  useEffect(() => {
    async function loadStoredData() {
      setLoading(true);
      try {
        const [storedUser, storedToken] = await Promise.all([
          AsyncStorage.getItem(USER_STORAGE_KEY),
          AsyncStorage.getItem(TOKEN_STORAGE_KEY)
        ]);

        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Fehler beim Laden der gespeicherten Daten:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStoredData();
  }, []);

  /**
   * Anmeldung mit Benutzername und Passwort
   */
  const signIn = async (credentials: { username: string; password: string }) => {
    try {
      setLoading(true);
      // Die login-Methode erwartet ein LoginCredentials-Objekt
      const response = await authApi.login({
        username: credentials.username,
        password: credentials.password
      });
      
      // Backend gibt direkt token, refreshToken und user zurück
      const { token, refreshToken, user } = response;

      // Daten im AsyncStorage speichern
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
      if (refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

      setUser(user);
    } catch (error) {
      console.error('Login-Fehler:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Benutzer abmelden
   */
  const signOut = async () => {
    try {
      setLoading(true);
      await authApi.logout();
    } catch (error) {
      console.error('Logout-API-Fehler (ignoriert):', error);
    } finally {
      // Lokale Daten immer löschen, auch wenn API-Fehler
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
      await AsyncStorage.removeItem('@IntranetApp:currentTimer');
      await AsyncStorage.removeItem('@IntranetApp:offlineWorktime');
      
      setUser(null);
      setLoading(false);
    }
  };

  /**
   * Benutzerdaten aktualisieren
   */
  const updateUser = async (data: Partial<User>) => {
    if (!user) return;

    try {
      setLoading(true);
      const updatedUser = { ...user, ...data };
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Benutzers:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        signIn,
        signOut,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook für den Zugriff auf den Auth-Context
 */
export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth muss innerhalb eines AuthProviders verwendet werden');
  }

  return context;
} 