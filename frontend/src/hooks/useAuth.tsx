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
        page: string;
        accessLevel: string;
    }>;
}

interface User {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: Role[];
}

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isLoading: boolean;
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
            const response = await axios.get(API_ENDPOINTS.AUTH.USER);
            if (response.data.user) {
                setUser(response.data.user);
            }
        } catch (error) {
            console.error('Error fetching current user:', error);
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
            setUser(user);
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await axios.post(API_ENDPOINTS.AUTH.LOGOUT);
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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