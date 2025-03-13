import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, getWeek, getYear, parse, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChartBarIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import WorktimeList from './WorktimeList.tsx';
import axios from 'axios';
import { WorktimeModal } from './WorktimeModal.tsx';
import { convertWeekToDate, getWeekDays } from '../utils/dateUtils.ts';
import axiosInstance from '../config/axios.ts';
import { Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale
} from 'chart.js';

// Registriere die benötigten ChartJS-Komponenten
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale);

// Neue Schnittstelle für das WorktimeModal mit selectedDate
interface WorktimeModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: string; // Im Kontext von WorktimeStats ist selectedDate immer erforderlich
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

// Definiere Interface für Pie Chart Daten
interface PieChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        backgroundColor: string[];
        borderColor: string[];
        borderWidth: number;
    }[];
}

const WorktimeStats: React.FC = () => {
    const [stats, setStats] = useState<WorktimeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [maxHours, setMaxHours] = useState<number>(8); // Standard 8 Stunden
    const [pieChartData, setPieChartData] = useState<PieChartData | null>(null);
    const [exporting, setExporting] = useState<boolean>(false);
    
    // Aktuelle Woche im Format YYYY-Www für das Input-Element
    const today = new Date();
    console.log(`Initialisierung - heute: ${today.toISOString()}`);
    
    const currentWeekInput = `${getYear(today)}-W${String(getWeek(today, { locale: de })).padStart(2, '0')}`;
    console.log(`Initialisierung - currentWeekInput: ${currentWeekInput}`);
    
    const [selectedWeekInput, setSelectedWeekInput] = useState<string>(currentWeekInput);
    
    // Berechne das Datum des Montags der aktuellen Woche
    const currentMonday = startOfWeek(today, { weekStartsOn: 1 });
    console.log(`Initialisierung - currentMonday: ${currentMonday} (${format(currentMonday, 'yyyy-MM-dd')})`);
    
    const [selectedWeekDate, setSelectedWeekDate] = useState<string>(format(currentMonday, 'yyyy-MM-dd'));
    console.log(`Initialisierung - selectedWeekDate: ${selectedWeekDate}`);
    
    // State für das WorktimeModal
    const [showWorkTimeModal, setShowWorkTimeModal] = useState(false);
    const [selectedDateForModal, setSelectedDateForModal] = useState<string>('');

    // useEffect-Hook für das Laden der Statistikdaten
    useEffect(() => {
        fetchStats();
    }, [selectedWeekDate]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Nicht authentifiziert');
                setLoading(false);
                return;
            }
            
            const dateToSend = selectedWeekDate;
            console.log(`SENDE AN API: week=${dateToSend}`);
            
            // Verwende axiosInstance statt fetch für konsistentes Verhalten
            console.log(`API-Endpunkt: ${API_ENDPOINTS.WORKTIME.BASE}/stats?week=${dateToSend}`);
            
            const response = await axiosInstance.get(`${API_ENDPOINTS.WORKTIME.BASE}/stats`, {
                params: {
                    week: dateToSend
                }
            });
            
            const data = response.data;
            setStats(data);
            
            // Generiere den Kuchengrafik-Datensatz, wenn Daten vorhanden sind
            if (data && data.weeklyData) {
                setPieChartData({
                    labels: data.weeklyData.map((day: any) => day.day),
                    datasets: [
                        {
                            label: 'Stunden',
                            data: data.weeklyData.map((day: any) => day.hours),
                            backgroundColor: [
                                'rgba(54, 162, 235, 0.2)',
                                'rgba(255, 99, 132, 0.2)',
                                'rgba(255, 206, 86, 0.2)',
                                'rgba(75, 192, 192, 0.2)',
                                'rgba(153, 102, 255, 0.2)',
                                'rgba(255, 159, 64, 0.2)',
                                'rgba(255, 99, 132, 0.2)'
                            ],
                            borderColor: [
                                'rgba(54, 162, 235, 1)',
                                'rgba(255, 99, 132, 1)',
                                'rgba(255, 206, 86, 1)',
                                'rgba(75, 192, 192, 1)',
                                'rgba(153, 102, 255, 1)',
                                'rgba(255, 159, 64, 1)',
                                'rgba(255, 99, 132, 1)'
                            ],
                            borderWidth: 1,
                        }
                    ]
                });
            }
            
            setLoading(false);
        } catch (error) {
            console.error('Fehler beim Laden der Statistiken:', error);
            let errorMessage = 'Fehler beim Laden der Statistiken';
            
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

    const handleExport = async () => {
        try {
            setExporting(true);
            
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Nicht authentifiziert');
                setExporting(false);
                return;
            }
            
            console.log(`API-Endpunkt für Export: ${API_ENDPOINTS.WORKTIME.BASE}/export?week=${selectedWeekDate}`);
            
            // Verwende axiosInstance mit responseType 'blob'
            const response = await axiosInstance.get(`${API_ENDPOINTS.WORKTIME.BASE}/export`, {
                params: {
                    week: selectedWeekDate
                },
                responseType: 'blob'
            });
            
            // Erstelle einen Blob und einen Download-Link
            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Arbeitszeitstatistik_${selectedWeekDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            
            setExporting(false);
        } catch (error) {
            console.error('Fehler beim Exportieren der Zeiterfassung:', error);
            let errorMessage = 'Fehler beim Exportieren';
            
            // Spezifischere Fehlermeldung je nach Art des Fehlers
            if (error.code === 'ERR_NETWORK') {
                errorMessage = 'Netzwerkfehler: Server nicht erreichbar';
            } else if (error.response && error.response.status) {
                errorMessage = `Serverfehler: ${error.response.status} - ${error.response.data?.message || 'Unbekannter Fehler'}`;
            }
            
            setError(errorMessage);
            setExporting(false);
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

    // Funktion zum Öffnen des Modals für den ausgewählten Tag
    const openWorkTimeModal = (date: string) => {
        // Sicherheitsprüfung: Falls date undefined ist, nichts tun
        if (!date) {
            console.error('Kein Datum für Modal angegeben');
            return;
        }
        
        // Klare Debug-Ausgabe ohne unnötige Komplexität
        console.log(`Modal wird geöffnet mit Datum: ${date}`);
        
        // Einfache Sicherheitsüberprüfung: Stelle sicher, dass ein gültiges Datumsformat verwendet wird
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            console.error(`Ungültiges Datum für Modal: ${date}`);
            return;
        }
        
        // Keine weitere Manipulationen am Datum - nutze direkt den übergebenen Wert
        setSelectedDateForModal(date);
        setShowWorkTimeModal(true);
    };

    // Funktion zum Schließen des Modals
    const closeWorkTimeModal = () => {
        setShowWorkTimeModal(false);
    };

    useEffect(() => {
        if (!loading && stats && stats.weeklyData) {
            // Finde den höchsten Stundenwert für die Skalierung
            const maxHours = stats.weeklyData.reduce((max, day) => {
                const hours = typeof day.hours === 'number' ? day.hours : parseFloat(day.hours);
                return hours > max ? hours : max;
            }, 0);
            
            setMaxHours(maxHours);
        }
    }, [loading, stats]);

    if (loading) return <div className="p-4">Lädt...</div>;
    if (error) return <div className="p-4 text-red-600">{error}</div>;
    if (!stats) return null;

    const weekDays = getWeekDays(selectedWeekDate);
    
    // Finde den höchsten Stundenwert für die Skalierung
    // Der scaleMax-Wert wird aus dem State-maxHours berechnet
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
                    <h3 className="text-lg font-medium text-blue-900 mb-2 whitespace-nowrap text-sm sm:text-base md:text-lg text-center">Gesamtstunden</h3>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600 whitespace-nowrap text-center">{stats.totalHours}h</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-green-900 mb-2 whitespace-nowrap text-sm sm:text-base md:text-lg text-center">Durchschnitt/Tag</h3>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600 whitespace-nowrap text-center">{stats.averageHoursPerDay}h</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-purple-900 mb-2 whitespace-nowrap text-sm sm:text-base md:text-lg text-center">Arbeitstage</h3>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-600 whitespace-nowrap text-center">{stats.daysWorked}</p>
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
                                
                                // Verwende das bereits berechnete Datum aus weeklyData - keine weitere Berechnung notwendig!
                                const formattedDate = dayData.date;
                                
                                console.log(`Balken ${index} - Tag: ${dayData.day}, Datum aus weeklyData: ${formattedDate}`);
                                
                                return (
                                    <div key={index} className="flex flex-col items-center" style={{ width: '13%' }}>
                                        <div 
                                            className="relative w-5/12 h-full flex flex-col justify-end cursor-pointer" 
                                            onClick={() => openWorkTimeModal(formattedDate)}
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
                                    {dayData.day.substring(0, 2)}
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

// Hilfsfunktion zum Inkrementieren eines Datums im String-Format 'YYYY-MM-DD'
const incrementDateString = (dateString: string, daysToAdd: number): string => {
    // Zerlege das Datum
    const [year, month, day] = dateString.split('-').map(num => parseInt(num));
    
    // Erstelle ein Date-Objekt für diese Berechnung, aber mit Mittag als Uhrzeit
    // um Zeitzonenprobleme zu vermeiden
    const date = new Date(year, month - 1, day, 12, 0, 0);
    
    // Füge die Tage hinzu
    date.setDate(date.getDate() + daysToAdd);
    
    // Formatiere das Datum zurück als 'YYYY-MM-DD'
    return format(date, 'yyyy-MM-dd');
};

export default WorktimeStats; 