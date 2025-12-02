import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';

interface WorktimeContextType {
    isTracking: boolean;
    updateTrackingStatus: (status: boolean) => void;
    checkTrackingStatus: () => Promise<void>;
}

const WorktimeContext = createContext<WorktimeContextType>({ 
    isTracking: false, 
    updateTrackingStatus: () => {}, 
    checkTrackingStatus: async () => {} 
});

export const WorktimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    /* CLAUDE-ANCHOR: 5f13e29c-4712-4dea-b8ac-eaf7d2e89b76 - WORKTIME_CONTEXT */
    const [isTracking, setIsTracking] = useState(false);

    // Funktion zum manuellen Setzen des Status
    const updateTrackingStatus = (status: boolean) => {
        setIsTracking(status);
    };

    // Funktion zum Abrufen des aktuellen Status vom Server
    const checkTrackingStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            const response = await axiosInstance.get(API_ENDPOINTS.WORKTIME.ACTIVE);
            
            const data = response.data;
            if (data && data.active === true) {
                setIsTracking(true);
            } else {
                setIsTracking(false);
            }
        } catch (error) {
            console.error('Fehler beim Abrufen des Zeiterfassungsstatus:', error);
            setIsTracking(false);
        }
    };

    // Prüfe den Tracking-Status beim Start
    useEffect(() => {
        // Initiale Prüfung
        checkTrackingStatus();

        // ✅ MEMORY: Polling nur wenn Seite sichtbar ist (Page Visibility API)
        let intervalId: ReturnType<typeof setInterval> | null = null;
        
        const startPolling = () => {
            if (intervalId) return; // Bereits gestartet
            intervalId = setInterval(() => {
                // Prüfe nochmal, ob Seite sichtbar ist
                if (!document.hidden) {
                    checkTrackingStatus();
                }
            }, 30000);
        };
        
        const stopPolling = () => {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };
        
        // Starte Polling wenn Seite sichtbar ist
        if (!document.hidden) {
            startPolling();
        }
        
        // Event-Listener für Page Visibility
        const handleVisibilityChange = () => {
            if (document.hidden) {
                stopPolling();
            } else {
                // Seite ist wieder sichtbar - sofort prüfen und Polling starten
                checkTrackingStatus();
                startPolling();
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []); // Leere Abhängigkeitsliste, da checkTrackingStatus im Komponentenkontext definiert ist

    return (
        <WorktimeContext.Provider value={{ isTracking, updateTrackingStatus, checkTrackingStatus }}>
            {children}
        </WorktimeContext.Provider>
    );
};

export const useWorktime = () => useContext(WorktimeContext); 