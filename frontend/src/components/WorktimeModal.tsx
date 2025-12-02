import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
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

    const fetchWorktimes = useCallback(async () => {
        try {
            setError(null);
            setLoading(true);
            
            const token = localStorage.getItem('token');
            if (!token) {
                setError(t('worktime.tracker.notAuthenticated'));
                setLoading(false);
                return;
            }
            
            const formattedDate = selectedDate;
            
            const response = await axiosInstance.get(`${API_ENDPOINTS.WORKTIME.BASE}?date=${formattedDate}`);
            
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
            setError(t('worktime.list.loadError'));
            setLoading(false);
        }
    }, [selectedDate, t]);

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
                // KORREKT: Wie im WorktimeTracker - direkte UTC-Differenz berechnen
                // Die Differenz zwischen zwei UTC-Zeiten ist immer korrekt, unabhängig von der Zeitzone
                const startISOString = activeWorktime.startTime.endsWith('Z') 
                    ? activeWorktime.startTime.substring(0, activeWorktime.startTime.length - 1)
                    : activeWorktime.startTime;
                const startTimeDate = new Date(startISOString);
                const now = new Date();
                const diff = now.getTime() - startTimeDate.getTime();
                
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
        
        // KORREKT: Wie im WorktimeTracker - direkte UTC-Differenz berechnen
        // Die Differenz zwischen zwei UTC-Zeiten ist immer korrekt, unabhängig von der Zeitzone
        const startISOString = activeWorktime.startTime.endsWith('Z') 
            ? activeWorktime.startTime.substring(0, activeWorktime.startTime.length - 1)
            : activeWorktime.startTime;
        const startTimeDate = new Date(startISOString);
        const now = new Date();
        const diff = now.getTime() - startTimeDate.getTime();
        
        // Umrechnung in Stunden und Minuten
        const totalMinutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        return `${hours}h ${minutes}m (${t('worktime.modal.running')})`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-xl font-semibold dark:text-white">
                        {t('worktime.modal.title', { date: formatDate(selectedDate) })}
                    </h2>
                    <div className="flex items-center space-x-2">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                            }}
                            className="border dark:border-gray-600 rounded-md px-3 py-2 dark:bg-gray-700 dark:text-white"
                        />
                        <button 
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto flex-grow">
                    {loading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-300"></div>
                        </div>
                    ) : worktimes.filter(worktime => isWorktimeRelevantForSelectedDate(worktime, selectedDate) && (worktime.endTime !== null || isActiveWorktimeRelevant())).length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            {t('worktime.modal.noEntries')}
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        {t('worktime.list.columns.start')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        {t('worktime.list.columns.end')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        {t('worktime.list.columns.duration')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        {t('worktime.list.columns.branch')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {relevantWorktimes
                                  .filter(worktime => worktime.endTime !== null)
                                  // Sortiere nach Startzeit (frühester Eintrag zuerst)
                                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                                  .map((worktime) => (
                                    <tr key={worktime.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                            {formatTime(worktime.startTime)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                            {worktime.endTime ? formatTime(worktime.endTime) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                            {calculateDuration(worktime.startTime, worktime.endTime)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                            {worktime.branch.name}
                                        </td>
                                    </tr>
                                ))}
                                
                                {/* Aktive Zeiterfassung anzeigen, wenn sie für den ausgewählten Tag relevant ist */}
                                {isActiveWorktimeRelevant() && (
                                    <tr className="bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                            {formatTime(activeWorktime.startTime)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                            <span className="italic">{t('worktime.active')}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 font-medium text-green-600 dark:text-green-400">
                                            {calculateActiveDuration()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                            {activeWorktime.branch?.name || t('common.unknown')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            
                            {/* Gesamtdauer des Tages */}
                            <tfoot className="bg-gray-100 dark:bg-gray-700">
                                <tr>
                                    <td colSpan={2} className="px-6 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t('worktime.modal.totalDuration')}:
                                    </td>
                                    <td className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">
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