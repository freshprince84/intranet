import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { format, parseISO } from 'date-fns';
import { formatDate, formatTime, calculateDuration, isWorktimeRelevantForSelectedDate } from '../utils/dateUtils.ts';

// Schnittstelle für das WorktimeModal
export interface WorktimeModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate?: string; // Optional - wenn nicht angegeben, wird das heutige Datum verwendet
}

export const WorktimeModal: React.FC<WorktimeModalProps> = ({ isOpen, onClose, selectedDate: initialSelectedDate }) => {
    // Initialisiere das selectedDate mit dem übergebenen Datum oder dem heutigen Datum
    const today = new Date();
    const defaultDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    
    const [worktimes, setWorktimes] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(initialSelectedDate || defaultDate);
    const [loading, setLoading] = useState(true);
    const [totalDuration, setTotalDuration] = useState<string>('0h 0m');
    const [activeWorktime, setActiveWorktime] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Prüfe, ob die aktive Zeiterfassung am ausgewählten Tag begonnen hat
    const isActiveWorktimeRelevant = (): boolean => {
        if (!activeWorktime) return false;
        
        try {
            // Extrahiere nur den Datumsteil (YYYY-MM-DD) aus dem startTime ISO-String
            const dateOnly = activeWorktime.startTime.split('T')[0];
            
            // Vergleiche mit selectedDate
            return dateOnly === selectedDate;
        } catch (error) {
            console.error("Fehler beim Prüfen der Relevanz der aktiven Zeiterfassung:", error);
            return false;
        }
    };

    const fetchWorktimes = async () => {
        try {
            setError(null);
            setLoading(true);
            
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Nicht authentifiziert');
                setLoading(false);
                return;
            }
            
            const formattedDate = selectedDate;
            
            // Verwende die korrekte API_ENDPOINTS-Struktur
            console.log(`Versuche Arbeitszeiten zu laden für Datum: ${formattedDate}`);
            console.log(`API-Endpunkt: ${API_ENDPOINTS.WORKTIME.BASE}?date=${formattedDate}`);
            
            const response = await axiosInstance.get(API_ENDPOINTS.WORKTIME.BASE, {
                params: {
                    date: formattedDate
                }
            });
            
            const sortedWorktimes = [...response.data].sort((a, b) => {
                return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
            });
            
            setWorktimes(sortedWorktimes);
            
            // Auch die aktive Zeiterfassung abrufen
            const activeResponse = await axiosInstance.get(API_ENDPOINTS.WORKTIME.ACTIVE);
            
            if (activeResponse.data && Object.keys(activeResponse.data).length > 0) {
                setActiveWorktime(activeResponse.data);
            } else {
                setActiveWorktime(null);
            }
            
            setLoading(false);
        } catch (error) {
            console.error('Fehler beim Laden der Zeiterfassungen:', error);
            let errorMessage = 'Fehler beim Laden der Zeiterfassungen';
            
            // Spezifischere Fehlermeldung je nach Art des Fehlers
            if (error.code === 'ERR_NETWORK') {
                errorMessage = 'Netzwerkfehler: Server nicht erreichbar';
            } else if (error.response && error.response.status) {
                errorMessage = `Serverfehler: ${error.response.status} - ${error.response.data?.message || 'Unbekannter Fehler'}`;
            }
            
            setError(errorMessage);
            setLoading(false);
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
        
        // Filtere die relevanten Einträge für das ausgewählte Datum
        const relevantWorktimes = worktimes.filter(worktime => isWorktimeRelevantForSelectedDate(worktime, selectedDate));
        
        // Berechne die Dauer der abgeschlossenen Zeiteinträge
        relevantWorktimes.forEach((worktime) => {
            if (worktime.endTime) {
                try {
                    const start = new Date(worktime.startTime);
                    const end = new Date(worktime.endTime);
                    const diff = end.getTime() - start.getTime();
                    
                    if (diff > 0) {
                        const minutes = Math.floor(diff / (1000 * 60));
                        totalMinutes += minutes;
                    }
                } catch (error) {
                    console.error('Fehler bei der Berechnung:', error);
                }
            }
        });
        
        // Füge die aktive Zeiterfassung hinzu, wenn sie für den ausgewählten Tag relevant ist
        if (activeWorktime && isActiveWorktimeRelevant()) {
            try {
                const activeStart = new Date(`${activeWorktime.startTime.split('Z')[0]}`);
                const now = new Date();
                const diff = now.getTime() - activeStart.getTime();
                
                if (diff > 0) {
                    const minutes = Math.floor(diff / (1000 * 60));
                    totalMinutes += minutes;
                }
            } catch (error) {
                console.error("Fehler bei der Berechnung der aktiven Zeiterfassung:", error);
            }
        }
        
        // Formatiere die Gesamtdauer
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const formattedDuration = `${hours}h ${minutes}m`;
        setTotalDuration(formattedDuration);
    }, [worktimes, activeWorktime, selectedDate]);

    if (!isOpen) return null;
    
    // Berechne die relevanten Einträge für das ausgewählte Datum
    const relevantWorktimes = worktimes.filter(worktime => isWorktimeRelevantForSelectedDate(worktime, selectedDate));

    // Berechne die Dauer der aktiven Zeiterfassung
    const calculateActiveDuration = (): string => {
        if (!activeWorktime) return '-';
        
        // Erstelle ein Date-Objekt ohne Zeitzonenumrechnung
        // Entferne das 'Z' am Ende des Strings, damit JS den Zeitstempel nicht als UTC interpretiert
        const startISOString = activeWorktime.startTime.endsWith('Z') 
            ? activeWorktime.startTime.substring(0, activeWorktime.startTime.length - 1)
            : activeWorktime.startTime;
        
        const start = new Date(startISOString);
        const now = new Date();
        
        // Berechnung mit Millisekunden
        const diff = now.getTime() - start.getTime();
        
        // Umrechnung in Stunden und Minuten
        const totalMinutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        return `${hours}h ${minutes}m (läuft)`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="text-xl font-semibold">
                        Zeiteinträge für {formatDate(selectedDate)}
                    </h2>
                    <div className="flex items-center space-x-2">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
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
                    ) : worktimes.filter(worktime => isWorktimeRelevantForSelectedDate(worktime, selectedDate) && (worktime.endTime !== null || isActiveWorktimeRelevant())).length === 0 ? (
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
                                {relevantWorktimes
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