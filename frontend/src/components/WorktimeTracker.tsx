import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { ClockIcon, ListBulletIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api.ts';

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
                    
                    // Startzeit setzen und Timer initialisieren
                    const startTimeDate = new Date(data.startTime);
                    setStartTime(startTimeDate);
                    
                    // Initial berechnete Zeit anzeigen
                    const now = new Date();
                    const diff = now.getTime() - startTimeDate.getTime();
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    
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
        let intervalId: NodeJS.Timeout;

        if (isTracking && startTime) {
            intervalId = setInterval(() => {
                const now = new Date();
                const diff = now.getTime() - startTime.getTime();
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

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
    const [worktimes, setWorktimes] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);

    const fetchWorktimes = useCallback(async () => {
        try {
            setLoading(true);
            
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Kein Authentifizierungstoken gefunden');
                return;
            }
            
            // Verwende Axios mit explizitem Authorization Header
            const response = await axios.get(API_ENDPOINTS.WORKTIME.BASE, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setWorktimes(response.data);
        } catch (error) {
            console.error('Fehler:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchWorktimes();
        }
    }, [isOpen, fetchWorktimes]);

    const formatTime = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    };

    const calculateDuration = (startTime: string, endTime: string | null): string => {
        if (!endTime) return '-';
        
        const start = new Date(startTime);
        const end = new Date(endTime);
        const diff = end.getTime() - start.getTime();
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours}h ${minutes}m`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Zeiteinträge</h2>
                    <div className="flex items-center space-x-2">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
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
                    ) : worktimes.length === 0 ? (
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
                                {worktimes.map((worktime) => (
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
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorktimeTracker; 