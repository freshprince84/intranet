import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// API-URLs direkt definieren
const API_BASE_URL = 'http://localhost:5000';
const API_URL = `${API_BASE_URL}/api`;
const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_URL}/auth/login`,
    REGISTER: `${API_URL}/auth/register`,
    LOGOUT: `${API_URL}/auth/logout`,
    USER: `${API_URL}/auth/user`,
  }
};

interface Role {
    id: number;
    name: string;
    permissions: Array<{
        id: number;
        page: string;
        accessLevel: string;
    }>;
}

interface UserRole {
    role: Role;
    lastUsed: boolean;
}

interface User {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: UserRole[];
    settings?: {
        id: number;
        darkMode: boolean;
        sidebarCollapsed: boolean;
    };
}

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isLoading: boolean;
    switchRole: (roleId: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchCurrentUser();
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchCurrentUser = async () => {
        try {
            console.log('Rufe Benutzerprofil ab...');
            const response = await axios.get(`${API_URL}/users/profile`);
            console.log('Benutzerprofil erhalten:', response.data);
            
            // Überprüfen, ob Rollen vorhanden sind
            if (response.data && response.data.roles) {
                console.log('Anzahl der Rollen:', response.data.roles.length);
                
                // Prüfen, ob es eine aktive Rolle gibt
                const activeRole = response.data.roles.find((r: UserRole) => r.lastUsed);
                console.log('Aktive Rolle gefunden:', activeRole ? 
                    `ID: ${activeRole.role.id}, Name: ${activeRole.role.name}` : 'Keine');
                
                // Wenn keine aktive Rolle gefunden wurde, die erste Rolle als aktiv markieren
                if (!activeRole && response.data.roles.length > 0) {
                    console.log('Keine aktive Rolle gefunden, setze die erste Rolle als aktiv');
                    const modifiedUser = {
                        ...response.data,
                        roles: response.data.roles.map((r: UserRole, index: number) => ({
                            ...r,
                            lastUsed: index === 0 // Die erste Rolle als aktiv markieren
                        }))
                    };
                    console.log('Modifizierter Benutzer:', modifiedUser);
                    setUser(modifiedUser);
                    return;
                }
                
                // Prüfen, ob Berechtigungen in der aktiven Rolle vorhanden sind
                if (activeRole && activeRole.role.permissions) {
                    console.log('Anzahl der Berechtigungen in der aktiven Rolle:', 
                                activeRole.role.permissions.length);
                }
            } else {
                console.warn('Keine Rollen in den Benutzerdaten gefunden!');
            }
            
            setUser(response.data);
        } catch (error) {
            console.error('Error fetching current user:', error);
            if (axios.isAxiosError(error)) {
                console.error('Status:', error.response?.status);
                console.error('Fehler-Nachricht:', error.response?.data);
            }
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (username: string, password: string) => {
        try {
            const response = await axios.post(`${API_ENDPOINTS.AUTH.LOGIN}`, { username, password });
            const { token, user } = response.data;
            
            // Überprüfe, ob alle erforderlichen Felder vorhanden sind
            if (!user || !user.id || !user.username || !user.firstName || !user.lastName || !user.roles) {
                throw new Error('Unvollständige Benutzerdaten vom Server');
            }
            
            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            console.log('Login erfolgreich, Token gespeichert. User:', user);
            console.log('Ursprüngliche User-Rollen:', JSON.stringify(user.roles));
            
            // Aktive Rolle finden oder die erste Rolle als aktiv markieren
            const hasActiveRole = user.roles.some((r: any) => r.lastUsed === true);
            
            if (!hasActiveRole && user.roles.length > 0) {
                console.log('Keine aktive Rolle gefunden, setze die erste Rolle als aktiv');
                // Modifiziere das User-Objekt, um die erste Rolle als aktiv zu markieren
                const modifiedUser = {
                    ...user,
                    roles: user.roles.map((r: any, index: number) => ({
                        ...r,
                        lastUsed: index === 0 // Die erste Rolle als aktiv markieren
                    }))
                };
                console.log('Modifizierter Benutzer:', modifiedUser);
                setUser(modifiedUser);
            } else {
                console.log('Aktive Rolle:', user.roles.find((r: any) => r.lastUsed) || 'Keine');
                setUser(user);
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            // Verwende die lokale API_ENDPOINTS-Definition
            await axios.post(API_ENDPOINTS.AUTH.LOGOUT);
            console.log('Logout erfolgreich');
        } catch (error) {
            console.error('Logout error:', error);
            // Auch bei einem Fehler den Benutzer lokal abmelden
        } finally {
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            setUser(null);
        }
    };

    const switchRole = async (roleId: number) => {
        try {
            console.log(`Wechsle zu Rolle mit ID: ${roleId}`);
            // URL und Header für die Anfrage ausgeben
            console.log(`API-URL: ${API_URL}/users/switch-role`);
            console.log('Authorization Header vorhanden:', !!axios.defaults.headers.common['Authorization']);
            
            const response = await axios.put(`${API_URL}/users/switch-role`, { roleId });
            
            console.log('Antwort vom Server:', response.data);
            
            if (response.data) {
                setUser(response.data);
                console.log('Benutzer mit neuer Rolle aktualisiert:', response.data);
                return response.data;
            } else {
                console.error('Keine Benutzerdaten in der Antwort erhalten');
                throw new Error('Keine Benutzerdaten in der Antwort erhalten');
            }
        } catch (error) {
            console.error('Fehler beim Wechseln der Rolle:', error);
            if (axios.isAxiosError(error)) {
                console.error('Status:', error.response?.status);
                console.error('Fehler-Nachricht:', error.response?.data);
            }
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading, switchRole }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default useAuth; 