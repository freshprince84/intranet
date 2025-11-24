import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { useAuth } from '../hooks/useAuth.tsx';

interface SidebarContextType {
    isCollapsed: boolean;
    toggleCollapsed: () => void;
    setCollapsedTemporary: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

// Breakpoints für automatische Anpassung
const BREAKPOINT_SMALL = 768; // Unter dieser Breite: Mobile-Footer (keine automatische Anpassung)
const BREAKPOINT_LARGE = 1070; // Ab dieser Breite: automatisch ausklappen

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(() => {
        // Zuerst aus localStorage laden als sofortige Rückfalllösung
        const savedState = localStorage.getItem('sidebar_collapsed');
        return savedState ? JSON.parse(savedState) : false;
    });
    
    // Ref um zu tracken, ob der Benutzer die Sidebar manuell getoggelt hat
    // true = Benutzer hat aktiv eingeklappt, false = Benutzer hat aktiv ausgeklappt, null = keine manuelle Präferenz
    const userPreferenceRef = useRef<boolean | null>(null);
    
    // Ref um zu verhindern, dass der resize-Handler direkt nach einem manuellen Toggle ausgelöst wird
    const isManualToggleRef = useRef<boolean>(false);
    
    // Ref um den aktuellen isCollapsed-Wert im resize-Handler zu verwenden (verhindert Closure-Probleme)
    const isCollapsedRef = useRef<boolean>(isCollapsed);

    // Synchronisiere Ref mit State
    useEffect(() => {
        isCollapsedRef.current = isCollapsed;
    }, [isCollapsed]);

    // Wenn Benutzer lädt, Einstellungen vom Server übernehmen
    useEffect(() => {
        if (user?.settings?.sidebarCollapsed !== undefined) {
            const savedPreference = user.settings.sidebarCollapsed;
            setIsCollapsed(savedPreference);
            isCollapsedRef.current = savedPreference;
            // Beim Laden setzen wir keine manuelle Präferenz, damit die automatische Anpassung funktioniert
            // Die gespeicherte Präferenz wird als Ausgangszustand verwendet
        }
    }, [user]);

    // Funktion zum Speichern des Sidebar-Status (lokal und auf Server)
    const saveSidebarState = useCallback((newState: boolean) => {
        // Im localStorage speichern für schnellen Zugriff
        localStorage.setItem('sidebar_collapsed', JSON.stringify(newState));
        
        // An den Server senden, wenn der Benutzer eingeloggt ist
        if (user) {
            axiosInstance.put(`${API_ENDPOINTS.USERS.BASE}/settings`, {
                sidebarCollapsed: newState
            }).catch(error => {
                console.error('Fehler beim Speichern der Seitenleisteneinstellung:', error);
            });
        }
    }, [user]);

    // Automatische Anpassung basierend auf Bildschirmgröße
    useEffect(() => {
        const handleResize = () => {
            // Kurze Verzögerung, um zu verhindern dass direkt nach manuellem Toggle angepasst wird
            if (isManualToggleRef.current) {
                isManualToggleRef.current = false;
                return;
            }
            
            const width = window.innerWidth;
            const currentCollapsed = isCollapsedRef.current;
            
            // Nur bei Desktop (>= 768px) automatische Anpassung, bei Mobile ist Footer
            if (width >= BREAKPOINT_SMALL) {
                // Bei kleineren Bildschirmen (768-1069px): automatisch einklappen
                if (width < BREAKPOINT_LARGE) {
                    // Nur einklappen, wenn Benutzer nicht aktiv ausgeklappt hat
                    // Wenn userPreferenceRef.current === false, hat Benutzer aktiv ausgeklappt -> nicht einklappen
                    if (userPreferenceRef.current !== false) {
                        if (!currentCollapsed) {
                            setIsCollapsed(true);
                            saveSidebarState(true);
                        }
                    }
                } 
                // Bei größeren Bildschirmen (>= 1070px): automatisch ausklappen
                else {
                    // Nur ausklappen, wenn Benutzer nicht aktiv eingeklappt hat
                    // Wenn userPreferenceRef.current === true, hat Benutzer aktiv eingeklappt -> nicht ausklappen
                    if (userPreferenceRef.current !== true) {
                        if (currentCollapsed) {
                            setIsCollapsed(false);
                            saveSidebarState(false);
                        }
                    }
                }
            }
        };

        // Debounce für bessere Performance
        let timeoutId: NodeJS.Timeout;
        const debouncedResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(handleResize, 150);
        };

        window.addEventListener('resize', debouncedResize);
        handleResize(); // Initial ausführen
        return () => {
            window.removeEventListener('resize', debouncedResize);
            clearTimeout(timeoutId);
        };
    }, [user, saveSidebarState]); // saveSidebarState mit useCallback memoisiert

    const toggleCollapsed = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        
        // Markiere dass dies ein manueller Toggle ist
        isManualToggleRef.current = true;
        
        // Benutzerpräferenz setzen - Benutzer hat aktiv getoggelt
        // true = Benutzer hat aktiv eingeklappt, false = Benutzer hat aktiv ausgeklappt
        userPreferenceRef.current = newState;
        
        // Status speichern
        saveSidebarState(newState);
    };

    // Funktion zum temporären Setzen des Collapsed-Status (ohne Benutzerpräferenz zu ändern)
    // Wird z.B. verwendet, wenn Sidepane öffnet und Sidebar automatisch collapsed werden soll
    const setCollapsedTemporary = useCallback((collapsed: boolean) => {
        setIsCollapsed(collapsed);
        isCollapsedRef.current = collapsed;
        // WICHTIG: userPreferenceRef und isManualToggleRef NICHT ändern,
        // damit die automatische Anpassung weiterhin funktioniert
    }, []);

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggleCollapsed, setCollapsedTemporary }}>
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