import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import axiosInstance from '../config/axios.ts';
import { API_BASE_URL, API_URL, API_ENDPOINTS } from '../config/api.ts';
import { User } from '../types/interfaces.ts';

// API-Endpunkte aus der zentralen Konfiguration verwenden
const AUTH_ENDPOINTS = API_ENDPOINTS.AUTH;

interface Role {
    id: number;
    name: string;
    permissions: Array<{
        id: number;
        entity: string;
        entityType: string;
        accessLevel: string;
    }>;
}

interface UserRole {
    role: Role;
    lastUsed: boolean;
}

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isLoading: boolean;
    switchRole: (roleId: number) => Promise<void>;
    fetchCurrentUser: (signal?: AbortSignal) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const abortController = new AbortController();
        const token = localStorage.getItem('token');
        
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchCurrentUser(abortController.signal);
        } else {
            setIsLoading(false);
        }
        
        return () => {
            abortController.abort();
        };
    }, []);

    // Event-Listener für automatische Logout-Weiterleitung bei 401-Fehlern
    useEffect(() => {
        const handleAuthLogout = () => {
            setUser(null);
            setIsLoading(false);
        };
        
        window.addEventListener('auth:logout', handleAuthLogout);
        
        return () => {
            window.removeEventListener('auth:logout', handleAuthLogout);
        };
    }, []);

    const fetchCurrentUser = async (signal?: AbortSignal) => {
        try {
            // ✅ PERFORMANCE: Beim initialen Laden nur notwendige Daten laden
            // Settings, invoiceSettings, documents werden nicht benötigt für initiales Laden
            const response = await axiosInstance.get('/users/profile', {
                signal,
                params: {
                    includeSettings: 'false',
                    includeInvoiceSettings: 'false',
                    includeDocuments: 'false'
                }
            });
            
            // Prüfe ob Request abgebrochen wurde
            if (signal?.aborted) {
                return;
            }
            
            if (response.data && response.data.roles) {
                const activeRole = response.data.roles.find((r: UserRole) => r.lastUsed);
                
                if (!activeRole && response.data.roles.length > 0) {
                    const modifiedUser = {
                        ...response.data,
                        roles: response.data.roles.map((r: UserRole, index: number) => ({
                            ...r,
                            lastUsed: index === 0
                        }))
                    };
                    setUser(modifiedUser);
                    return;
                }
            }
            
            setUser(response.data);
        } catch (error: any) {
            // Ignoriere Abort-Errors
            if (error.name === 'AbortError' || error.name === 'CanceledError') {
                return;
            }
            
            // Prüfe ob Request abgebrochen wurde
            if (signal?.aborted) {
                return;
            }
            
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            delete axiosInstance.defaults.headers.common['Authorization'];
        } finally {
            // Nur isLoading setzen wenn nicht abgebrochen
            if (!signal?.aborted) {
                setIsLoading(false);
            }
        }
    };

    const login = async (username: string, password: string) => {
        try {
            const response = await axiosInstance.post('/auth/login', { username, password });
            const { token, user } = response.data;
            
            if (!token) {
                console.error('[FRONTEND LOGIN] Kein Token in Response');
                throw new Error('Kein Token erhalten');
            }
            
            if (!user) {
                console.error('[FRONTEND LOGIN] Kein User in Response');
                throw new Error('Keine Benutzerdaten erhalten');
            }
            
            if (!user.id || !user.username || !user.roles) {
                console.error('[FRONTEND LOGIN] Unvollständige Benutzerdaten:', user);
                throw new Error('Unvollständige Benutzerdaten vom Server');
            }
            
            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            const hasActiveRole = user.roles.some((r: any) => r.lastUsed === true);
            
            if (!hasActiveRole && user.roles.length > 0) {
                const modifiedUser = {
                    ...user,
                    roles: user.roles.map((r: any, index: number) => ({
                        ...r,
                        lastUsed: index === 0
                    }))
                };
                setUser(modifiedUser);
            } else {
                setUser(user);
            }
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        try {
            await axiosInstance.post('/auth/logout');
        } catch (error) {
            // Fehler beim Logout ignorieren
        } finally {
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            delete axiosInstance.defaults.headers.common['Authorization'];
            setUser(null);
        }
    };

    const switchRole = async (roleId: number) => {
        try {
            const response = await axiosInstance.put('/users/switch-role', { roleId });
            
            if (response.data) {
                setUser(response.data);
                return response.data;
            } else {
                throw new Error('Keine Benutzerdaten in der Antwort erhalten');
            }
        } catch (error) {
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading, switchRole, fetchCurrentUser }}>
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