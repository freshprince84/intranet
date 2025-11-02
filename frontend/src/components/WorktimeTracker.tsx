import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.tsx';
import { ClockIcon, ListBulletIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { useWorktime } from '../contexts/WorktimeContext.tsx';
import { useBranch } from '../contexts/BranchContext.tsx';
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
    /* CLAUDE-ANCHOR: a7c238f1-9d6a-42e5-8af1-6d8b2e9a4f18 - WORKTIME_TRACKER_COMPONENT */
    const { t } = useTranslation();
    const [isTracking, setIsTracking] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
    const [activeWorktime, setActiveWorktime] = useState<WorkTime | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showWorkTimeModal, setShowWorkTimeModal] = useState(false);
    const [statusError, setStatusError] = useState<string | null>(null);
    const { user } = useAuth();
    const { updateTrackingStatus } = useWorktime();
    const { branches, selectedBranch, setSelectedBranch } = useBranch();

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
                setStatusError(t('worktime.tracker.notAuthenticated'));
                setIsLoading(false);
                return;
            }
            
            try {
                // Verwende axiosInstance statt direktem axios
                const response = await axiosInstance.get(API_ENDPOINTS.WORKTIME.ACTIVE);
                
                console.log('API-Antwort Status:', response.status);
                
                const data = response.data;
                console.log('Aktive Zeiterfassung Daten:', data);
                
                if (data && data.active === true) {
                    console.log('Aktive Zeiterfassung gefunden:', data.id);
                    // Startzeit setzen und Timer initialisieren
                    // Entferne das 'Z' am Ende des Strings, damit JS den Zeitstempel nicht als UTC interpretiert
                    const startISOString = data.startTime.endsWith('Z') 
                        ? data.startTime.substring(0, data.startTime.length - 1)
                        : data.startTime;
                    
                    const startTimeDate = new Date(startISOString);
                    
                    // Initial berechnete Zeit anzeigen
                    const now = new Date();
                    const diff = now.getTime() - startTimeDate.getTime();
                    const totalSeconds = Math.floor(diff / 1000);
                    const hours = Math.floor(totalSeconds / 3600);
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    const seconds = totalSeconds % 60;
                    
                    // Alle State-Updates in einem Batch zusammenfassen, um nur einen Re-Render zu verursachen
                    setActiveWorktime(data);
                    setStartTime(startTimeDate);
                    setElapsedTime(
                        `${hours.toString().padStart(2, '0')}:${minutes
                            .toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                    );
                    setIsTracking(true);
                    
                    // Nur Branch setzen, wenn es sich geändert hat (vermeidet unnötigen Re-Render)
                    if (selectedBranch !== data.branchId) {
                        setSelectedBranch(data.branchId);
                    }
                    
                    // Aktualisiere den globalen Tracking-Status
                    updateTrackingStatus(true);
                } else {
                    console.log('Keine aktive Zeiterfassung vorhanden');
                    // Alle State-Updates in einem Batch zusammenfassen
                    setIsTracking(false);
                    setActiveWorktime(null);
                    setStartTime(null);
                    setElapsedTime('00:00:00');
                    
                    // Aktualisiere den globalen Tracking-Status
                    updateTrackingStatus(false);
                }
            } catch (error) {
                console.error('Fehler beim Abrufen der aktiven Zeiterfassung:', error);
                
                // Einfachere Fehlerbehandlung ohne axios-Import
                const axiosError = error as any;
                if (axiosError.code === 'ERR_NETWORK') {
                    setStatusError(t('worktime.tracker.connectionError'));
                } else {
                    setStatusError(`${t('worktime.tracker.errorFetch')}: ${axiosError.response?.data?.message || axiosError.message}`);
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, updateTrackingStatus, selectedBranch]);
    
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

    const handleToggleTracking = async () => {
        if (isTracking) {
            await handleStopTracking();
        } else {
            await handleStartTracking();
        }
    };

    const handleStartTracking = async () => {
        if (!selectedBranch) {
            alert(t('worktime.tracker.selectBranch'));
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Kein Authentifizierungstoken gefunden');
                alert(t('worktime.tracker.notAuthenticatedMessage'));
                return;
            }
            
            // Verwende axiosInstance statt direktem axios
            const response = await axiosInstance.post(
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
            
            // Erstelle ein Date-Objekt ohne Zeitzonenumrechnung
            // Entferne das 'Z' am Ende des Strings, damit JS den Zeitstempel nicht als UTC interpretiert
            const startISOString = data.startTime.endsWith('Z') 
                ? data.startTime.substring(0, data.startTime.length - 1)
                : data.startTime;
            
            const startTimeDate = new Date(startISOString);
            
            // Initial berechnete Zeit anzeigen (0:00:00 beim Start)
            // Alle State-Updates in einem Batch zusammenfassen, um nur einen Re-Render zu verursachen
            setActiveWorktime(data);
            setStartTime(startTimeDate);
            setElapsedTime('00:00:00');
            setIsTracking(true);
            
            // Aktualisiere den globalen Tracking-Status
            updateTrackingStatus(true);
        } catch (error) {
            console.error('Fehler:', error);
            
            // Detaillierte Fehlerbehandlung
            let errorMessage = t('worktime.tracker.errorStart');
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
                alert(t('worktime.tracker.notAuthenticatedMessage'));
                return;
            }
            
            // Verwende axiosInstance statt direktem axios
            const response = await axiosInstance.post(
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

            // Alle State-Updates in einem Batch zusammenfassen, um nur einen Re-Render zu verursachen
            setIsTracking(false);
            setActiveWorktime(null);
            setStartTime(null);
            setElapsedTime('00:00:00');
            
            // Aktualisiere den globalen Tracking-Status
            updateTrackingStatus(false);
        } catch (error) {
            console.error('Fehler:', error);
            
            // Detaillierte Fehlerbehandlung
            let errorMessage = t('worktime.tracker.errorStop');
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

    // Branch-Name memoized berechnen (vermeidet unnötige Re-Berechnungen)
    const branchName = useMemo(() => {
        if (!activeWorktime) return null;
        return branches.find(b => b.id === activeWorktime.branchId)?.name || t('worktime.tracker.unknown');
    }, [branches, activeWorktime]);

    // Manuelle Statusaktualisierung
    const handleRefreshStatus = () => {
        checkActiveWorktime();
    };

    // Manuelle Zeiterfassung forciert stoppen (für Notfälle)
    const handleForceStop = async () => {
        if (!window.confirm(t('worktime.tracker.forceStopConfirm'))) {
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Kein Authentifizierungstoken gefunden');
                alert(t('worktime.tracker.notAuthenticatedMessage'));
                return;
            }
            
            // Verwende axiosInstance statt direktem axios
            const response = await axiosInstance.post(
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
            alert(t('worktime.tracker.forceStopSuccess'));
            
            // Aktualisiere den globalen Tracking-Status
            updateTrackingStatus(false);
        } catch (error) {
            console.error('Fehler:', error);
            setStatusError(`Fehler beim Stoppen: ${error.response?.status || 'Netzwerkfehler'}`);
            alert(t('worktime.tracker.forceStopError'));
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
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 mb-6">
                <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-300"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6 sm:mb-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center dark:text-white">
                    <ClockIcon className="h-6 w-6 mr-2" />
                    {t('worktime.tracker.title')}
                </h2>
            </div>
            
            {statusError && (
                <div className="mb-4 p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-700 rounded-md flex justify-between items-center">
                    <span>{statusError}</span>
                    {statusError !== t('worktime.tracker.noActiveTracking') && (
                        <button 
                            onClick={handleForceStop}
                            className="text-sm bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-800 dark:hover:bg-red-700 dark:text-red-300 px-2 py-1 rounded-md"
                        >
                            {t('worktime.tracker.stop')} {t('common.force', 'Erzwingen')}
                        </button>
                    )}
                </div>
            )}
            
            {/* Ein-/Ausschalter für die Zeiterfassung - verkleinert */}
            <div className="flex items-start justify-center mb-4">
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
                                ? 'bg-green-500 shadow-lg shadow-green-200 dark:shadow-green-900/20' 
                                : 'bg-gray-300 dark:bg-gray-600'
                            }
                            before:content-[''] before:absolute before:top-0 before:left-0 before:bottom-0 before:right-0 
                            peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-700
                            peer-checked:after:translate-x-10
                            after:content-[''] after:absolute after:top-1 after:left-1
                            after:bg-white dark:after:bg-gray-200 after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full
                            after:h-8 after:w-8 after:transition-all after:duration-300 ease-in-out
                            transition-colors duration-300`}>
                        </div>
                    </label>
                    <span className="mt-2 text-sm font-medium">
                        {isTracking 
                            ? <span className="text-green-600 dark:text-green-400 font-bold">{t('worktime.tracker.running')}</span> 
                            : <span className="text-gray-600 dark:text-gray-400">{t('worktime.tracker.start')}</span>
                        }
                    </span>
                </div>

                {/* Icon-Button zum Öffnen des Modals */}
                <button 
                    onClick={openWorkTimeModal}
                    className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-blue-700 shadow-sm flex items-center justify-center ml-8 mt-1"
                    title={t('worktime.tracker.showTimes')}
                >
                    <ListBulletIcon className="h-6 w-6" />
                </button>
            </div>

            {/* Informationen zur aktiven Zeiterfassung oder Platzhalter */}
            <div className={`p-2 my-2 rounded-md text-sm ${isTracking && activeWorktime ? 'bg-green-50 dark:bg-green-900/20 dark:text-green-200' : 'bg-gray-50 dark:bg-gray-700 dark:text-gray-300'}`}>
                {isTracking && activeWorktime ? (
                    <>
                        <p><strong>{t('worktime.tracker.activeTracking')}</strong> {elapsedTime}</p>
                        <p><strong>{t('worktime.tracker.started')}</strong> {formatStartDate(startTime || Date.now())}</p>
                        <p><strong>{t('worktime.tracker.selectBranchLabel')}:</strong> {branchName || t('worktime.tracker.unknown')}</p>
                    </>
                ) : (
                    <>
                        <p>&nbsp;</p>
                        <p>&nbsp;</p>
                        <p>&nbsp;</p>
                    </>
                )}
            </div>

            {/* WorkTime Modal */}
            {showWorkTimeModal && (
                <WorktimeModal isOpen={showWorkTimeModal} onClose={closeWorkTimeModal} />
            )}
        </div>
    );
};

export default WorktimeTracker; 