import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { ClockIcon, ListBulletIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api.ts';
import { useWorktime } from '../contexts/WorktimeContext.tsx';
import { WorktimeModal } from './WorktimeModal.tsx';

// Wir entfernen die benutzerdefinierten API-URL-Definitionen und verwenden die direkte URL,
// um Konflikte mit der globalen Axios-Konfiguration zu vermeiden
// const API_BASE_URL = 'http://localhost:5000';
// const API_URL = `${API_BASE_URL}/api`;

interface Branch {
    id: number;
    name: string;
}

interface WorkTime {
    id: number;
    startTime: Date;
    endTime: Date | null;
    branchId: number;
    userId: number;
    branch: {
        id: number;
        name: string;
    };
}

interface WorktimeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WorktimeTracker: React.FC = () => {
    const [isTracking, setIsTracking] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
    const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [activeWorktime, setActiveWorktime] = useState<WorkTime | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showWorkTimeModal, setShowWorkTimeModal] = useState(false);
    const [statusError, setStatusError] = useState<string | null>(null);
    const { user } = useAuth();
    const { updateTrackingStatus } = useWorktime();

    // Funktion zum Abrufen des aktiven Worktime-Status
    const checkActiveWorktime = useCallback(async () => {
        try {
            setIsLoading(true);
            setStatusError(null);
            
            console.log('Prüfe aktive Zeiterfassung...');
            console.log('Benutzer geladen:', user?.id);
            
            const token = localStorage.getItem('token');
            console.log('Token vorhanden:', token ? 'Ja' : 'Nein');
            
            if (!token) {
                console.error('Kein Authentifizierungstoken gefunden');
                setStatusError('Nicht authentifiziert');
                setIsLoading(false);
                return;
            }
            
            try {
                // Verwende axios mit explizitem Authorization Header
                const response = await axios.get(API_ENDPOINTS.WORKTIME.ACTIVE, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                console.log('API-Antwort Status:', response.status);
                
                const data = response.data;
                console.log('Aktive Zeiterfassung Daten:', data);
                
                if (data && data.active === true) {
                    console.log('Aktive Zeiterfassung gefunden:', data.id);
                    setActiveWorktime(data);
                    setIsTracking(true);
                    setSelectedBranch(data.branchId);
                    
                    // Aktualisiere den globalen Tracking-Status
                    updateTrackingStatus(true);
                    
                    // Startzeit setzen und Timer initialisieren
                    // Entferne das 'Z' am Ende des Strings, damit JS den Zeitstempel nicht als UTC interpretiert
                    const startISOString = data.startTime.endsWith('Z') 
                        ? data.startTime.substring(0, data.startTime.length - 1)
                        : data.startTime;
                    
                    const startTimeDate = new Date(startISOString);
                    setStartTime(startTimeDate);
                    
                    // Initial berechnete Zeit anzeigen
                    const now = new Date();
                    const diff = now.getTime() - startTimeDate.getTime();
                    
                    // Berechnung mit Millisekunden, um negative Werte zu vermeiden
                    const totalSeconds = Math.floor(diff / 1000);
                    const hours = Math.floor(totalSeconds / 3600);
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    const seconds = totalSeconds % 60;
                    
                    setElapsedTime(
                        `${hours.toString().padStart(2, '0')}:${minutes
                            .toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                    );
                } else {
                    console.log('Keine aktive Zeiterfassung vorhanden');
                    setIsTracking(false);
                    setActiveWorktime(null);
                    setStartTime(null);
                    setElapsedTime('00:00:00');
                    
                    // Aktualisiere den globalen Tracking-Status
                    updateTrackingStatus(false);
                }
            } catch (error) {
                console.error('Fehler beim Abrufen der aktiven Zeiterfassung:', error);
                
                if (axios.isAxiosError(error)) {
                    if (error.code === 'ERR_NETWORK') {
                        setStatusError('Verbindung zum Server konnte nicht hergestellt werden. Bitte stellen Sie sicher, dass der Server läuft.');
                    } else {
                        setStatusError(`Fehler beim Abrufen der aktiven Zeiterfassung: ${error.response?.data?.message || error.message}`);
                    }
                } else {
                    setStatusError('Ein unerwarteter Fehler ist aufgetreten');
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);
    
    // Initiale Prüfung, ob bereits eine aktive Zeiterfassung läuft
    useEffect(() => {
        if (user) {
            console.log('Benutzer geladen, prüfe aktive Zeiterfassung für Benutzer-ID:', user.id);
            checkActiveWorktime();
        } else {
            console.log('Warte auf Benutzer-Daten vor dem Prüfen der Zeiterfassung...');
            setIsLoading(false);
        }
    }, [user, checkActiveWorktime]);

    // Timer-Logik
    useEffect(() => {
        let intervalId: number;

        if (isTracking && startTime) {
            intervalId = window.setInterval(() => {
                const now = new Date();
                const diff = now.getTime() - startTime.getTime();
                
                // Berechnung mit Millisekunden, um negative Werte zu vermeiden
                const totalSeconds = Math.floor(diff / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;

                setElapsedTime(
                    `${hours.toString().padStart(2, '0')}:${minutes
                        .toString()
                        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                );
            }, 1000);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isTracking, startTime]);

    // Lade Niederlassungen
    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    console.error('Kein Authentifizierungstoken gefunden');
                    return;
                }
                
                // Verwende Axios mit explizitem Authorization Header
                const response = await axios.get(API_ENDPOINTS.BRANCHES.BASE, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = response.data;
                setBranches(data);
                
                // Setze die erste Niederlassung als Standard, falls keine ausgewählt und keine aktive Zeiterfassung besteht
                if (data.length > 0 && !selectedBranch && !activeWorktime) {
                    setSelectedBranch(data[0].id);
                }
            } catch (error) {
                console.error('Fehler beim Laden der Niederlassungen:', error);
            }
        };

        fetchBranches();
    }, [activeWorktime, selectedBranch]);

    const handleToggleTracking = async () => {
        if (isTracking) {
            await handleStopTracking();
        } else {
            await handleStartTracking();
        }
    };

    const handleStartTracking = async () => {
        if (!selectedBranch) {
            alert('Bitte wählen Sie eine Niederlassung aus');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Kein Authentifizierungstoken gefunden');
                alert('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
                return;
            }
            
            // Verwende Axios mit explizitem Authorization Header
            const response = await axios.post(
                API_ENDPOINTS.WORKTIME.START,
                {
                    branchId: selectedBranch,
                    // Die aktuelle Zeit mit Berücksichtigung der Zeitzonenverschiebung senden
                    // Da die Datenbank in UTC speichert, müssen wir die lokale Zeit so senden,
                    // dass sie nach der automatischen UTC-Umwandlung korrekt ist
                    startTime: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const data = response.data;
            setActiveWorktime(data);
            setIsTracking(true);
            
            // Erstelle ein Date-Objekt ohne Zeitzonenumrechnung
            // Entferne das 'Z' am Ende des Strings, damit JS den Zeitstempel nicht als UTC interpretiert
            const startISOString = data.startTime.endsWith('Z') 
                ? data.startTime.substring(0, data.startTime.length - 1)
                : data.startTime;
            
            const startTimeDate = new Date(startISOString);
            setStartTime(startTimeDate);
            
            // Aktualisiere den globalen Tracking-Status
            updateTrackingStatus(true);
        } catch (error) {
            console.error('Fehler:', error);
            
            // Detaillierte Fehlerbehandlung
            let errorMessage = 'Fehler beim Starten der Zeiterfassung';
            if (error.response) {
                errorMessage = error.response.data?.message || `Fehler (Status: ${error.response.status})`;
            }
            
            alert(errorMessage);
        }
    };

    const handleStopTracking = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Kein Authentifizierungstoken gefunden');
                alert('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
                return;
            }
            
            // Verwende Axios mit explizitem Authorization Header
            const response = await axios.post(
                API_ENDPOINTS.WORKTIME.STOP,
                {
                    // Die aktuelle Zeit mit Berücksichtigung der Zeitzonenverschiebung senden
                    endTime: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            setIsTracking(false);
            setStartTime(null);
            setElapsedTime('00:00:00');
            setActiveWorktime(null);
            
            // Aktualisiere den globalen Tracking-Status
            updateTrackingStatus(false);
        } catch (error) {
            console.error('Fehler:', error);
            
            // Detaillierte Fehlerbehandlung
            let errorMessage = 'Fehler beim Stoppen der Zeiterfassung';
            if (error.response) {
                errorMessage = error.response.data?.message || `Fehler (Status: ${error.response.status})`;
            }
            
            alert(errorMessage);
        }
    };

    const openWorkTimeModal = () => {
        setShowWorkTimeModal(true);
    };

    const closeWorkTimeModal = () => {
        setShowWorkTimeModal(false);
    };

    // Manuelle Statusaktualisierung
    const handleRefreshStatus = () => {
        checkActiveWorktime();
    };

    // Manuelle Zeiterfassung forciert stoppen (für Notfälle)
    const handleForceStop = async () => {
        if (!window.confirm('Möchten Sie die Zeiterfassung wirklich erzwungen stoppen?')) {
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Kein Authentifizierungstoken gefunden');
                alert('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
                return;
            }
            
            // Verwende Axios mit explizitem Authorization Header
            const response = await axios.post(
                API_ENDPOINTS.WORKTIME.STOP,
                {
                    // Die aktuelle Zeit mit Berücksichtigung der Zeitzonenverschiebung senden
                    endTime: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000),
                    force: true
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            setIsTracking(false);
            setStartTime(null);
            setElapsedTime('00:00:00');
            setActiveWorktime(null);
            setStatusError(null);
            alert('Zeiterfassung wurde erfolgreich gestoppt.');
            
            // Aktualisiere den globalen Tracking-Status
            updateTrackingStatus(false);
        } catch (error) {
            console.error('Fehler:', error);
            setStatusError(`Fehler beim Stoppen: ${error.response?.status || 'Netzwerkfehler'}`);
            alert('Fehler beim Stoppen der Zeiterfassung.');
        }
    };

    // Formatiere das Startdatum für die lokale Anzeige
    const formatStartDate = (dateString: string | number | Date) => {
        // Entferne das 'Z' am Ende des Strings, damit JS den Zeitstempel nicht als UTC interpretiert
        if (typeof dateString === 'string' && dateString.endsWith('Z')) {
            dateString = dateString.substring(0, dateString.length - 1);
        }
        
        const date = new Date(dateString);
        
        // Tag, Monat und Jahr aus lokaler Zeit extrahieren
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        // Stunden, Minuten und Sekunden aus lokaler Zeit extrahieren
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        
        // Im deutschen Format zurückgeben
        return `${day}.${month}.${year}, ${hours}:${minutes}:${seconds}`;
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6 mb-6">
                <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                    <ClockIcon className="h-6 w-6 mr-2" />
                    Zeiterfassung
                </h2>
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={handleRefreshStatus} 
                        className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-md transition-colors duration-200"
                        title="Status aktualisieren"
                    >
                        <ArrowPathIcon className="h-5 w-5" />
                    </button>
                    <select
                        className="border rounded-md px-3 py-2"
                        value={selectedBranch || ''}
                        onChange={(e) => setSelectedBranch(Number(e.target.value))}
                        disabled={isTracking}
                    >
                        <option value="">Niederlassung wählen</option>
                        {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                                {branch.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            
            {statusError && (
                <div className="mb-4 p-2 bg-red-50 text-red-600 border border-red-200 rounded-md flex justify-between items-center">
                    <span>{statusError}</span>
                    {statusError !== 'Keine aktive Zeiterfassung gefunden' && (
                        <button 
                            onClick={handleForceStop}
                            className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded-md"
                        >
                            Zeiterfassung forciert stoppen
                        </button>
                    )}
                </div>
            )}
            
            {/* Ein-/Ausschalter für die Zeiterfassung - verkleinert */}
            <div className="flex items-start justify-center space-x-8">
                <div className="flex flex-col items-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={isTracking}
                            onChange={handleToggleTracking}
                            disabled={!selectedBranch && !isTracking}
                        />
                        <div className={`w-20 h-10 rounded-full 
                            ${isTracking 
                                ? 'bg-green-500 shadow-lg shadow-green-200' 
                                : 'bg-gray-300'
                            }
                            before:content-[''] before:absolute before:top-0 before:left-0 before:bottom-0 before:right-0 
                            peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 
                            peer-checked:after:translate-x-10
                            after:content-[''] after:absolute after:top-1 after:left-1
                            after:bg-white after:border-gray-300 after:border after:rounded-full
                            after:h-8 after:w-8 after:transition-all after:duration-300 ease-in-out
                            transition-colors duration-300`}>
                        </div>
                    </label>
                    <span className="mt-2 text-sm font-medium">
                        {isTracking 
                            ? <span className="text-green-600 font-bold">Läuft</span> 
                            : <span className="text-gray-600">Start</span>
                        }
                    </span>
                </div>

                {/* Icon-Button zum Öffnen des Modals */}
                <button 
                    onClick={openWorkTimeModal}
                    className="flex items-center justify-center bg-blue-100 hover:bg-blue-200 text-blue-600 p-2 rounded-full transition-colors duration-200 mt-1"
                    title="Zeiten anzeigen"
                >
                    <ListBulletIcon className="h-6 w-6" />
                </button>
            </div>

            {/* Informationen zur aktiven Zeiterfassung */}
            {isTracking && activeWorktime && (
                <div className="mt-6 p-3 bg-green-50 rounded-md text-sm">
                    <p><strong>Aktive Zeiterfassung:</strong> {elapsedTime}</p>
                    <p><strong>Gestartet:</strong> {formatStartDate(startTime || Date.now())}</p>
                    <p><strong>Niederlassung:</strong> {branches.find(b => b.id === activeWorktime.branchId)?.name || 'Unbekannt'}</p>
                </div>
            )}

            {/* WorkTime Modal */}
            {showWorkTimeModal && (
                <WorktimeModal isOpen={showWorkTimeModal} onClose={closeWorkTimeModal} />
            )}
        </div>
    );
};

export default WorktimeTracker; 