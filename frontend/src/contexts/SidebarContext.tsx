import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth.tsx';

interface SidebarContextType {
    isCollapsed: boolean;
    toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(() => {
        // Zuerst aus localStorage laden als sofortige Rückfalllösung
        const savedState = localStorage.getItem('sidebar_collapsed');
        return savedState ? JSON.parse(savedState) : false;
    });

    // Wenn Benutzer lädt, Einstellungen vom Server übernehmen
    useEffect(() => {
        if (user?.settings?.sidebarCollapsed !== undefined) {
            setIsCollapsed(user.settings.sidebarCollapsed);
        }
    }, [user]);

    const toggleCollapsed = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        
        // Im localStorage speichern für schnellen Zugriff
        localStorage.setItem('sidebar_collapsed', JSON.stringify(newState));
        
        // An den Server senden, wenn der Benutzer eingeloggt ist
        if (user) {
            axios.put(`http://localhost:5000/api/users/settings`, {
                sidebarCollapsed: newState
            }).catch(error => {
                console.error('Fehler beim Speichern der Seitenleisteneinstellung:', error);
            });
        }
    };

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggleCollapsed }}>
            {children}
        </SidebarContext.Provider>
    );
};

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar muss innerhalb eines SidebarProviders verwendet werden');
    }
    return context;
}; 