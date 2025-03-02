import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, getWeek, getYear } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChartBarIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { API_URL } from '../config/api.ts';
import WorktimeList from './WorktimeList.tsx';
import axios from 'axios';

// Neue Schnittstelle für das WorktimeModal mit selectedDate
interface WorktimeModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: string;
}

interface WorktimeStats {
    totalHours: number;
    averageHoursPerDay: number;
    daysWorked: number;
    weeklyData: {
        day: string;
        hours: number;
        date: string; // Datum im Format YYYY-MM-DD
    }[];
}

const WorktimeStats: React.FC = () => {
    const [stats, setStats] = useState<WorktimeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Aktuelle Woche im Format YYYY-Www für das Input-Element
    const today = new Date();
    const currentWeekInput = `${getYear(today)}-W${String(getWeek(today, { locale: de })).padStart(2, '0')}`;
    const [selectedWeekInput, setSelectedWeekInput] = useState<string>(currentWeekInput);
    
    // Datum für die API im Format YYYY-MM-DD
    const [selectedWeekDate, setSelectedWeekDate] = useState<string>(format(today, 'yyyy-MM-dd'));
    
    // State für das WorktimeModal
    const [showWorkTimeModal, setShowWorkTimeModal] = useState(false);
    const [selectedDateForModal, setSelectedDateForModal] = useState<string>('');

    useEffect(() => {
        fetchStats();
    }, [selectedWeekDate]);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/worktime/stats?week=${selectedWeekDate}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Fehler beim Laden der Statistiken');
            }

            const data = await response.json();
            
            // Datum für jeden Tag in weeklyData hinzufügen
            const start = startOfWeek(new Date(selectedWeekDate), { weekStartsOn: 1, locale: de });
            const enrichedData = {
                ...data,
                weeklyData: data.weeklyData.map((dayData: any, index: number) => {
                    const date = new Date(start);
                    date.setDate(start.getDate() + index);
                    return {
                        ...dayData,
                        date: format(date, 'yyyy-MM-dd')
                    };
                })
            };
            
            setStats(enrichedData);
            setError(null);
        } catch (error) {
            console.error('Fehler beim Laden der Statistiken:', error);
            setError('Die Statistiken konnten nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/worktime/export?week=${selectedWeekDate}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Fehler beim Exportieren der Statistiken');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Arbeitszeitstatistik_KW${selectedWeekInput.split('W')[1]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Fehler beim Exportieren:', error);
            setError('Die Statistiken konnten nicht exportiert werden.');
        }
    };

    const getWeekDays = () => {
        if (!selectedWeekDate) return [];
        
        const start = startOfWeek(new Date(selectedWeekDate), { weekStartsOn: 1, locale: de });
        const end = endOfWeek(new Date(selectedWeekDate), { weekStartsOn: 1, locale: de });
        
        return eachDayOfInterval({ start, end }).map(day => format(day, 'EEEE', { locale: de }));
    };

    // Konvertiert das Wochenformat (YYYY-Www) in ein Datum (YYYY-MM-DD)
    const convertWeekToDate = (weekString: string): string => {
        try {
            // Format: YYYY-Www
            const year = parseInt(weekString.substring(0, 4));
            const week = parseInt(weekString.substring(6));
            
            // Berechne das Datum des ersten Tags der Woche
            const firstDayOfYear = new Date(year, 0, 1);
            const dayOffset = 1 + (week - 1) * 7; // Erster Tag der Woche
            const weekDate = new Date(year, 0, dayOffset);
            
            // Stelle sicher, dass wir den Montag der Woche bekommen
            const monday = startOfWeek(weekDate, { weekStartsOn: 1 });
            
            return format(monday, 'yyyy-MM-dd');
        } catch (error) {
            console.error('Fehler beim Konvertieren des Wochendatums:', error);
            return format(new Date(), 'yyyy-MM-dd');
        }
    };

    const handleWeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newWeekInput = e.target.value;
        if (!newWeekInput) return;
        
        setSelectedWeekInput(newWeekInput);
        
        // Konvertiere das Wochenformat in ein Datum für die API
        const newWeekDate = convertWeekToDate(newWeekInput);
        setSelectedWeekDate(newWeekDate);
    };

    // Neue Funktion zum Öffnen des Modals mit dem ausgewählten Datum
    const openWorkTimeModal = (date: string) => {
        setSelectedDateForModal(date);
        setShowWorkTimeModal(true);
    };

    // Funktion zum Schließen des Modals
    const closeWorkTimeModal = () => {
        setShowWorkTimeModal(false);
    };

    if (loading) return <div className="p-4">Lädt...</div>;
    if (error) return <div className="p-4 text-red-600">{error}</div>;
    if (!stats) return null;

    const weekDays = getWeekDays();
    
    // Finde den höchsten Stundenwert für die Skalierung
    const maxHours = stats.weeklyData.reduce((max, day) => {
        const hours = typeof day.hours === 'number' ? day.hours : parseFloat(day.hours);
        return hours > max ? hours : max;
    }, 0);
    
    // Feste Skala auf den höchsten Wert + 10% Puffer, mindestens aber 8 Stunden
    const scaleMax = Math.max(8, Math.ceil(maxHours * 1.1));
    
    // Konstante für die Sollarbeitszeit (7,6 Stunden)
    const targetWorkHours = 7.6;

    return (
        <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <ChartBarIcon className="h-6 w-6 mr-2" />
                    <h2 className="text-xl font-semibold">Arbeitszeitstatistik</h2>
                </div>
                <div className="flex items-center space-x-4">
                    <input
                        type="week"
                        value={selectedWeekInput}
                        onChange={handleWeekChange}
                        max={currentWeekInput}
                        className="border rounded-md px-3 py-2 h-10"
                    />
                    <button
                        onClick={handleExport}
                        className="bg-white text-blue-600 p-1.5 rounded-full hover:bg-blue-50 border border-blue-200 shadow-sm flex items-center justify-center min-w-8 min-h-8 w-8 h-8"
                        title="Exportieren"
                        aria-label="Arbeitszeiten exportieren"
                        style={{ marginTop: '1px', marginBottom: '1px' }}
                    >
                        <DocumentArrowDownIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="flex flex-row gap-2 mb-8 overflow-x-auto">
                <div className="bg-blue-50 p-4 rounded-lg flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-blue-900 mb-2 whitespace-nowrap text-sm sm:text-base md:text-lg">Gesamtstunden</h3>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600 whitespace-nowrap">{stats.totalHours}h</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-green-900 mb-2 whitespace-nowrap text-sm sm:text-base md:text-lg">Durchschnitt/Tag</h3>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600 whitespace-nowrap">{stats.averageHoursPerDay}h</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-purple-900 mb-2 whitespace-nowrap text-sm sm:text-base md:text-lg">Arbeitstage</h3>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600 whitespace-nowrap">{stats.daysWorked}</p>
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Wochenverlauf</h3>
                
                {/* Chart Container */}
                <div className="relative" style={{ height: '200px' }}>
                    {/* Y-Achse Beschriftungen */}
                    <div className="absolute right-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-1">
                        <span>{scaleMax}h</span>
                        <span>{Math.round(scaleMax * 0.75)}h</span>
                        <span>{Math.round(scaleMax * 0.5)}h</span>
                        <span>{Math.round(scaleMax * 0.25)}h</span>
                        <span>0h</span>
                    </div>
                    
                    {/* Horizontale Hilfslinien */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-8">
                        <div className="w-full border-t border-gray-200"></div>
                        <div className="w-full border-t border-gray-200"></div>
                        <div className="w-full border-t border-gray-200"></div>
                        <div className="w-full border-t border-gray-200"></div>
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    
                    {/* Sollarbeitszeit-Linie */}
                    <div 
                        className="absolute w-full border-t-2 border-red-600 z-10 pr-8"
                        style={{ 
                            bottom: `${(targetWorkHours / scaleMax) * 100}%`,
                            borderStyle: 'dashed'
                        }}
                    >
                        <span className="absolute -top-3 right-8 text-xs text-red-600 font-medium">
                            Soll: {targetWorkHours}h
                        </span>
                    </div>
                    
                    {/* Legende */}
                    <div className="absolute top-0 left-0 text-xs flex items-center gap-2">
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-100 border-2 border-blue-600 rounded-sm mr-1"></div>
                            <span className="text-blue-600">≤ {targetWorkHours}h</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-3 h-3 bg-red-100 border-2 border-red-600 rounded-sm mr-1"></div>
                            <span className="text-red-600">{'>'} {targetWorkHours}h</span>
                        </div>
                    </div>
                    
                    {/* Balken */}
                    <div className="absolute inset-0 pr-8 flex items-end">
                        <div className="w-full h-full flex justify-between">
                            {stats.weeklyData.map((dayData, index) => {
                                // Stellen Sie sicher, dass hours eine Zahl ist
                                const hours = typeof dayData.hours === 'number' ? dayData.hours : parseFloat(dayData.hours);
                                
                                // Berechnung der Höhe für den Teil über der Sollarbeitszeit
                                const overTargetHeight = hours > targetWorkHours 
                                    ? ((hours - targetWorkHours) / scaleMax) * 100 
                                    : 0;
                                
                                // Berechnung der Höhe für den Teil unter der Sollarbeitszeit
                                const normalHeight = Math.min(hours, targetWorkHours) / scaleMax * 100;
                                
                                return (
                                    <div key={index} className="flex flex-col items-center" style={{ width: '13%' }}>
                                        <div 
                                            className="relative w-5/12 h-full flex flex-col justify-end cursor-pointer" 
                                            onClick={() => openWorkTimeModal(dayData.date)}
                                            title="Klicken, um Zeiteinträge für diesen Tag anzuzeigen"
                                        >
                                            {/* Teil über der Sollarbeitszeit (rot) */}
                                            {overTargetHeight > 0 && (
                                                <div 
                                                    className="w-full bg-red-100 border-2 border-red-600 hover:bg-red-200"
                                                    style={{ 
                                                        height: `${overTargetHeight}%`,
                                                        minHeight: '2px',
                                                        borderTopLeftRadius: '8px',
                                                        borderTopRightRadius: '8px',
                                                        borderBottomWidth: overTargetHeight > 0 && normalHeight > 0 ? '0' : '2px'
                                                    }}
                                                />
                                            )}
                                            {/* Teil unter der Sollarbeitszeit (blau) */}
                                            {normalHeight > 0 && (
                                                <div 
                                                    className="w-full bg-blue-100 border-2 border-blue-600 hover:bg-blue-200"
                                                    style={{ 
                                                        height: `${normalHeight}%`,
                                                        minHeight: hours > 0 ? '4px' : '0',
                                                        borderTopLeftRadius: overTargetHeight > 0 ? '0' : '8px',
                                                        borderTopRightRadius: overTargetHeight > 0 ? '0' : '8px',
                                                        borderBottomLeftRadius: '4px',
                                                        borderBottomRightRadius: '4px',
                                                        borderTopWidth: overTargetHeight > 0 ? '0' : '2px'
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* X-Achse Beschriftungen */}
                    <div className="absolute bottom-0 left-0 right-8 pt-8 flex justify-between">
                        {stats.weeklyData.map((dayData, index) => (
                            <div key={index} className="flex flex-col items-center" style={{ width: '13%' }}>
                                <div className="text-sm text-gray-600">
                                    {weekDays[index]?.substring(0, 2) || dayData.day.substring(0, 2)}
                                </div>
                                <div className="text-sm font-medium">
                                    {dayData.hours.toFixed(1)}h
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* WorktimeModal */}
            {showWorkTimeModal && (
                <WorktimeModal 
                    isOpen={showWorkTimeModal}
                    onClose={closeWorkTimeModal}
                    selectedDate={selectedDateForModal}
                />
            )}
        </div>
    );
};

// WorktimeModal Komponente, angepasst von WorktimeTracker
const WorktimeModal: React.FC<WorktimeModalProps> = ({ isOpen, onClose, selectedDate }) => {
    const [worktimes, setWorktimes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
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
            const date = new Date(dateString);
            
            // Formatiere die Zeit manuell, um Zeitzonen-Probleme zu vermeiden
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            
            return `${hours}:${minutes}`;
        } catch (error) {
            console.error(`Fehler beim Formatieren der Zeit für ${dateString}:`, error);
            return '-';
        }
    };

    // Prüfe, ob ein Worktime-Eintrag für den ausgewählten Tag relevant ist
    const isWorktimeRelevantForSelectedDate = (worktime: any): boolean => {
        try {
            const startDate = new Date(worktime.startTime);
            const utcDateStr = `${startDate.getUTCFullYear()}-${(startDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${startDate.getUTCDate().toString().padStart(2, '0')}`;
            
            return utcDateStr === selectedDate;
        } catch (error) {
            console.error("Fehler beim Prüfen der Relevanz eines Worktime-Eintrags:", error);
            return false;
        }
    };

    // Berechne die Dauer eines Zeiteintrags
    const calculateDuration = (startTime: string, endTime: string | null): string => {
        if (!startTime || !endTime) return '-';
        
        try {
            const start = new Date(startTime);
            const end = new Date(endTime);
            
            const durationMs = end.getTime() - start.getTime();
            const durationMinutes = Math.floor(durationMs / (1000 * 60));
            
            const hours = Math.floor(durationMinutes / 60);
            const minutes = durationMinutes % 60;
            
            return `${hours}h ${minutes}m`;
        } catch (error) {
            console.error('Fehler bei der Dauerberechnung:', error);
            return '-';
        }
    };

    const fetchWorktimes = async () => {
        try {
            setLoading(true);
            
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('Kein Authentifizierungstoken gefunden');
                return;
            }
            
            const response = await axios.get(`${API_URL}/worktime`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            // Filtern der Einträge nach dem ausgewählten Datum
            const relevantWorktimes = response.data.filter(isWorktimeRelevantForSelectedDate);
            
            setWorktimes(relevantWorktimes);
            
            // Berechne die Gesamtdauer aller Zeiteinträge für den Tag
            let totalMinutes = 0;
            
            relevantWorktimes.forEach(worktime => {
                if (worktime.startTime && worktime.endTime) {
                    const start = new Date(worktime.startTime);
                    const end = new Date(worktime.endTime);
                    const durationMs = end.getTime() - start.getTime();
                    const durationMinutes = Math.floor(durationMs / (1000 * 60));
                    totalMinutes += durationMinutes;
                }
            });
            
            const totalHours = Math.floor(totalMinutes / 60);
            const remainingMinutes = totalMinutes % 60;
            setTotalDuration(`${totalHours}h ${remainingMinutes}m`);
            
        } catch (error) {
            console.error('Fehler beim Laden der Zeiteinträge:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchWorktimes();
        }
    }, [isOpen, selectedDate]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">
                        Zeiteinträge für {formatDate(selectedDate)}
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ×
                    </button>
                </div>
                
                {loading ? (
                    <div className="py-12 text-center">Lade Zeiteinträge...</div>
                ) : worktimes.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">
                        Keine Zeiteinträge für diesen Tag gefunden.
                    </div>
                ) : (
                    <>
                        <div className="mb-4 text-right text-lg">
                            <span className="font-medium">Gesamtzeit:</span> {totalDuration}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Beginn
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
                                        <tr key={worktime.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {formatTime(worktime.startTime)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {worktime.endTime ? formatTime(worktime.endTime) : 'Aktiv'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {worktime.endTime ? calculateDuration(worktime.startTime, worktime.endTime) : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {worktime.branch?.name || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default WorktimeStats; 