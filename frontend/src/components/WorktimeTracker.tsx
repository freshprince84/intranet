import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { ClockIcon, ListBulletIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api.ts';
import { useWorktime } from '../contexts/WorktimeContext.tsx';

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
                    const startTimeDate = new Date(data.startTime);
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
                    startTime: new Date()
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
            setStartTime(new Date(data.startTime));
            
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
                    endTime: new Date()
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
                    endTime: new Date(),
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

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
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
                    <p><strong>Gestartet:</strong> {new Date(startTime || Date.now()).toLocaleString('de-DE')}</p>
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

// Neues WorktimeModal
const WorktimeModal: React.FC<WorktimeModalProps> = ({ isOpen, onClose }) => {
    // Initialisiere das selectedDate mit dem heutigen Datum in lokaler Zeit
    const today = new Date();
    const initialDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    console.log("Initialisiere selectedDate mit:", initialDate);
    console.log("Heute (lokal):", today.toLocaleString());
    console.log("Heute (ISO):", today.toISOString());
    
    const [worktimes, setWorktimes] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(initialDate);
    const [loading, setLoading] = useState(true);
    const [activeWorktime, setActiveWorktime] = useState<any | null>(null);
    const [totalDuration, setTotalDuration] = useState<string>('0h 0m');

    // Formatiere nur das Datum
    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        
        // Wir erstellen ein neues Date-Objekt und setzen die Uhrzeit auf 12:00 Mittag
        // um Probleme mit Zeitzonen zu vermeiden
        const dateParts = dateString.split('-');
        if (dateParts.length !== 3) return '-';
        
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Monate sind 0-basiert in JavaScript
        const day = parseInt(dateParts[2]);
        
        const date = new Date(year, month, day, 12, 0, 0);
        
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Formatiere nur die Uhrzeit
    const formatTime = (dateString: string) => {
        if (!dateString) return '-';
        
        try {
            // Wir erstellen ein neues Date-Objekt und behalten die originale Zeit bei
            const date = new Date(dateString);
            
            // Debugging
            console.log(`formatTime für ${dateString}:`);
            console.log(`  Date-Objekt: ${date}`);
            console.log(`  Stunden: ${date.getHours()}`);
            console.log(`  Minuten: ${date.getMinutes()}`);
            
            // Formatiere die Zeit manuell, um Zeitzonen-Probleme zu vermeiden
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            
            return `${hours}:${minutes}`;
        } catch (error) {
            console.error(`Fehler beim Formatieren der Zeit für ${dateString}:`, error);
            return '-';
        }
    };

    const fetchWorktimes = useCallback(async () => {
        try {
            setLoading(true);
            
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Kein Authentifizierungstoken gefunden');
                return;
            }
            
            console.log("Hole Zeiteinträge für Datum:", selectedDate);
            
            // WICHTIG: Wir holen ALLE Einträge und filtern selbst im Frontend
            const response = await axios.get(`${API_ENDPOINTS.WORKTIME.BASE}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            // Debugging: Zeige das gesendete Datum und die Antwort
            console.log("An Server gesendetes Datum:", selectedDate);
            const receivedWorktimes = response.data;
            console.log("Anzahl erhaltener Einträge vom Server:", receivedWorktimes.length);
            
            // AUSFÜHRLICHES DEBUGGING: Zeige jeden erhaltenen Eintrag im Detail
            receivedWorktimes.forEach((worktime: any, index: number) => {
                const startDate = new Date(worktime.startTime);
                console.log(`--- EINTRAG ${index + 1} (ID: ${worktime.id}) ---`);
                console.log(`Startzeit (ISO): ${startDate.toISOString()}`);
                console.log(`Startzeit (Lokal): ${startDate.toLocaleString()}`);
                console.log(`UTC Datum: ${startDate.getUTCFullYear()}-${(startDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${startDate.getUTCDate().toString().padStart(2, '0')}`);
                console.log(`Lokales Datum: ${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${startDate.getDate().toString().padStart(2, '0')}`);
            });
            
            // Setze zunächst alle Einträge (wir filtern später im UI)
            setWorktimes(receivedWorktimes);
            console.log("Alle Einträge wurden gesetzt, Anzahl:", receivedWorktimes.length);

            // Aktive Zeiterfassung abrufen
            const activeResponse = await axios.get(API_ENDPOINTS.WORKTIME.ACTIVE, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (activeResponse.data && activeResponse.data.active === true) {
                const activeData = activeResponse.data;
                setActiveWorktime(activeData);
                console.log("Aktive Zeiterfassung:", activeData);
                
                // Debug für aktive Zeiterfassung
                const activeStartDate = new Date(activeData.startTime);
                console.log("Aktive Zeiterfassung Datum (UTC):", 
                    `${activeStartDate.getUTCFullYear()}-${(activeStartDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${activeStartDate.getUTCDate().toString().padStart(2, '0')}`);
            } else {
                setActiveWorktime(null);
            }
        } catch (error) {
            console.error('Fehler:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    // Prüfe, ob ein Worktime-Eintrag für den ausgewählten Tag relevant ist
    const isWorktimeRelevantForSelectedDate = (worktime: any): boolean => {
        try {
            const startDate = new Date(worktime.startTime);
            const utcDateStr = `${startDate.getUTCFullYear()}-${(startDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${startDate.getUTCDate().toString().padStart(2, '0')}`;
            
            console.log(`Prüfe relevanten Eintrag (ID: ${worktime.id}):`);
            console.log(`  UTC-Datum des Eintrags: ${utcDateStr}`);
            console.log(`  Ausgewähltes Datum: ${selectedDate}`);
            console.log(`  Sind gleich? ${utcDateStr === selectedDate}`);
            
            return utcDateStr === selectedDate;
        } catch (error) {
            console.error("Fehler beim Prüfen der Relevanz eines Worktime-Eintrags:", error);
            return false;
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchWorktimes();
        }
    }, [isOpen, fetchWorktimes]);

    // Berechne die Gesamtdauer aller Zeiteinträge für den Tag
    useEffect(() => {
        let totalMinutes = 0;
        
        console.log("Berechne Gesamtdauer für Datum:", selectedDate);
        console.log("Worktimes für Berechnung (Gesamtanzahl):", worktimes.length);
        
        // Filtere die relevanten Einträge für das ausgewählte Datum
        const relevantWorktimes = worktimes.filter(worktime => isWorktimeRelevantForSelectedDate(worktime));
        console.log("Anzahl relevanter Einträge für das ausgewählte Datum:", relevantWorktimes.length);
        
        // Berechne die Dauer der abgeschlossenen Zeiteinträge
        relevantWorktimes.forEach((worktime, index) => {
            if (worktime.endTime) {
                try {
                    const start = new Date(worktime.startTime);
                    const end = new Date(worktime.endTime);
                    const diff = end.getTime() - start.getTime();
                    
                    console.log(`Eintrag ${index + 1}:`);
                    console.log(`  Start: ${start.toLocaleString()}`);
                    console.log(`  Ende: ${end.toLocaleString()}`);
                    console.log(`  Differenz: ${diff} ms`);
                    
                    if (diff > 0) {
                        const minutes = Math.floor(diff / (1000 * 60));
                        totalMinutes += minutes;
                        console.log(`  Minuten: ${minutes}`);
                        console.log(`  Zwischensumme: ${totalMinutes} Minuten`);
                    } else {
                        console.warn(`  Negative Zeitdifferenz erkannt: ${diff} ms`);
                    }
                } catch (error) {
                    console.error(`Fehler bei der Berechnung für Eintrag ${index + 1}:`, error);
                }
            }
        });
        
        // Prüfe, ob die aktive Zeiterfassung für den ausgewählten Tag relevant ist
        let isActiveRelevant = false;
        if (activeWorktime) {
            isActiveRelevant = isActiveWorktimeRelevant();
        }
        console.log("Ist aktive Zeiterfassung relevant?", isActiveRelevant);
        
        // Füge die aktive Zeiterfassung hinzu, wenn sie für den ausgewählten Tag relevant ist
        if (activeWorktime && isActiveRelevant) {
            try {
                const activeStart = new Date(activeWorktime.startTime);
                const now = new Date();
                const diff = now.getTime() - activeStart.getTime();
                
                console.log("Aktive Zeiterfassung:");
                console.log(`  Start: ${activeStart.toLocaleString()}`);
                console.log(`  Jetzt: ${now.toLocaleString()}`);
                console.log(`  Differenz: ${diff} ms`);
                
                if (diff > 0) {
                    const minutes = Math.floor(diff / (1000 * 60));
                    totalMinutes += minutes;
                    console.log(`  Minuten: ${minutes}`);
                    console.log(`  Neue Gesamtsumme: ${totalMinutes} Minuten`);
                } else {
                    console.warn(`  Negative Zeitdifferenz erkannt: ${diff} ms`);
                }
            } catch (error) {
                console.error("Fehler bei der Berechnung der aktiven Zeiterfassung:", error);
            }
        }
        
        // Formatiere die Gesamtdauer
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const formattedDuration = `${hours}h ${minutes}m`;
        console.log(`Gesamtdauer: ${formattedDuration}`);
        setTotalDuration(formattedDuration);
    }, [worktimes, activeWorktime, selectedDate]);

    const calculateDuration = (startTime: string, endTime: string | null): string => {
        if (!endTime) return '-';
        
        try {
            const start = new Date(startTime);
            const end = new Date(endTime);
            
            console.log("Berechne Dauer:");
            console.log(`  Start: ${start.toISOString()} (${start.getHours()}:${start.getMinutes()})`);
            console.log(`  Ende: ${end.toISOString()} (${end.getHours()}:${end.getMinutes()})`);
            
            // Berechnung mit Millisekunden
            const diff = end.getTime() - start.getTime();
            console.log(`  Differenz in ms: ${diff}`);
            
            if (diff < 0) {
                console.error('Negative Zeitdifferenz erkannt:', { startTime, endTime, diff });
                return 'Fehler: Negative Zeit';
            }
            
            // Umrechnung in Stunden und Minuten
            const totalMinutes = Math.floor(diff / (1000 * 60));
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            
            console.log(`  Berechnete Dauer: ${hours}h ${minutes}m`);
            return `${hours}h ${minutes}m`;
        } catch (error) {
            console.error("Fehler bei der Dauerberechnung:", error);
            return 'Fehler';
        }
    };

    // Berechne die Dauer der aktiven Zeiterfassung
    const calculateActiveDuration = (): string => {
        if (!activeWorktime) return '-';
        
        const start = new Date(activeWorktime.startTime);
        const now = new Date();
        
        // Berechnung mit Millisekunden
        const diff = now.getTime() - start.getTime();
        
        // Umrechnung in Stunden und Minuten
        const totalMinutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        return `${hours}h ${minutes}m (läuft)`;
    };

    // Prüfe, ob die aktive Zeiterfassung am ausgewählten Tag begonnen hat
    const isActiveWorktimeRelevant = (): boolean => {
        if (!activeWorktime) return false;
        
        try {
            console.log("Prüfe Relevanz der aktiven Zeiterfassung:");
            console.log(`  Aktive Startzeit: ${activeWorktime.startTime}`);
            console.log(`  Ausgewähltes Datum: ${selectedDate}`);
            
            // Konvertiere die UTC-Zeit aus der Datenbank in lokale Zeit
            const activeStartDate = new Date(activeWorktime.startTime);
            const utcYear = activeStartDate.getUTCFullYear();
            const utcMonth = (activeStartDate.getUTCMonth() + 1).toString().padStart(2, '0');
            const utcDay = activeStartDate.getUTCDate().toString().padStart(2, '0');
            
            // Erstelle den Datumsstring im Format YYYY-MM-DD aus UTC-Komponenten
            const activeStartDateStr = `${utcYear}-${utcMonth}-${utcDay}`;
            
            console.log(`  Aktive Startzeit (UTC): ${activeStartDate.toISOString()}`);
            console.log(`  Aktive Startzeit als String (UTC): ${activeStartDateStr}`);
            console.log(`  Selected Date: ${selectedDate}`);
            
            // Vergleiche die UTC-Datumsteile
            const isSameDay = activeStartDateStr === selectedDate;
            
            console.log(`  Ist gleicher Tag: ${isSameDay}`);
            return isSameDay;
        } catch (error) {
            console.error("Fehler beim Prüfen der Relevanz der aktiven Zeiterfassung:", error);
            return false;
        }
    };

    if (!isOpen) return null;

    // Berechne die relevanten Einträge für das ausgewählte Datum
    const relevantWorktimes = worktimes.filter(worktime => isWorktimeRelevantForSelectedDate(worktime));
    console.log(`Anzahl relevanter Einträge für ${selectedDate}: ${relevantWorktimes.length}`);
    relevantWorktimes.forEach((worktime, index) => {
        console.log(`Relevanter Eintrag ${index + 1} (ID: ${worktime.id}): ${new Date(worktime.startTime).toLocaleString()}`);
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="text-xl font-semibold">
                        Zeiteinträge für {formatDate(selectedDate)}
                    </h2>
                    <div className="flex items-center space-x-2">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => {
                                const newDate = e.target.value;
                                console.log("Neues Datum ausgewählt:", newDate);
                                
                                // Für Debugging: Zeige das neue Datum in verschiedenen Formaten
                                try {
                                    const dateParts = newDate.split('-');
                                    if (dateParts.length === 3) {
                                        const year = parseInt(dateParts[0]);
                                        const month = parseInt(dateParts[1]) - 1;
                                        const day = parseInt(dateParts[2]);
                                        
                                        const newDateObj = new Date(year, month, day, 12, 0, 0);
                                        console.log("Neues Datum als Objekt:", newDateObj);
                                        console.log("Neues Datum (lokale Zeit):", newDateObj.toLocaleString());
                                        console.log("Neues Datum (ISO):", newDateObj.toISOString());
                                    }
                                } catch (error) {
                                    console.error("Fehler beim Parsen des neuen Datums:", error);
                                }
                                
                                setSelectedDate(newDate);
                            }}
                            className="border rounded-md px-3 py-2"
                        />
                        <button 
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto flex-grow">
                    {loading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                        </div>
                    ) : worktimes.filter(worktime => isWorktimeRelevantForSelectedDate(worktime) && (worktime.endTime !== null || isActiveWorktimeRelevant())).length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            Keine Zeiteinträge für diesen Tag gefunden.
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Start
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ende
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Dauer
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Niederlassung
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {worktimes
                                  .filter(worktime => isWorktimeRelevantForSelectedDate(worktime))
                                  .filter(worktime => worktime.endTime !== null)
                                  // Sortiere nach Startzeit (frühester Eintrag zuerst)
                                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                                  .map((worktime) => (
                                    <tr key={worktime.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatTime(worktime.startTime)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {worktime.endTime ? formatTime(worktime.endTime) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {calculateDuration(worktime.startTime, worktime.endTime)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {worktime.branch.name}
                                        </td>
                                    </tr>
                                ))}
                                
                                {/* Aktive Zeiterfassung anzeigen, wenn sie für den ausgewählten Tag relevant ist */}
                                {isActiveWorktimeRelevant() && (
                                    <tr className="bg-green-50 hover:bg-green-100">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatTime(activeWorktime.startTime)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <span className="italic">Aktiv</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-green-600">
                                            {calculateActiveDuration()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {activeWorktime.branch?.name || 'Unbekannt'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            
                            {/* Gesamtdauer des Tages */}
                            <tfoot className="bg-gray-100">
                                <tr>
                                    <td colSpan={2} className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                                        Gesamtdauer des Tages:
                                    </td>
                                    <td className="px-6 py-3 text-left text-sm font-bold text-gray-900">
                                        {totalDuration}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorktimeTracker; 