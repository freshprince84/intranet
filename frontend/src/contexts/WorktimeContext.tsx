import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
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
            
            const response = await axios.get(API_ENDPOINTS.WORKTIME.ACTIVE, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
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
        checkTrackingStatus();

        // Polling für regelmäßige Statusprüfung alle 30 Sekunden
        const intervalId = setInterval(checkTrackingStatus, 30000);
        
        return () => clearInterval(intervalId);
    }, []);

    return (
        <WorktimeContext.Provider value={{ isTracking, updateTrackingStatus, checkTrackingStatus }}>
            {children}
        </WorktimeContext.Provider>
    );
};

export const useWorktime = () => useContext(WorktimeContext); 