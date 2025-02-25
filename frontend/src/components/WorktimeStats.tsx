import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, getWeek, getYear } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChartBarIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

interface WorktimeStats {
    totalHours: number;
    averageHoursPerDay: number;
    daysWorked: number;
    weeklyData: {
        date: string;
        hours: number;
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

    useEffect(() => {
        fetchStats();
    }, [selectedWeekDate]);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/worktime/stats?week=${selectedWeekDate}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Fehler beim Laden der Statistiken');
            }

            const data = await response.json();
            setStats(data);
            setError(null);
        } catch (error) {
            console.error('Fehler:', error);
            setError('Fehler beim Laden der Statistiken');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/worktime/export?week=${selectedWeekDate}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Fehler beim Exportieren der Daten');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `arbeitszeiten_${selectedWeekDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Fehler:', error);
            alert('Fehler beim Exportieren der Daten');
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

    if (loading) return <div className="p-4">Lädt...</div>;
    if (error) return <div className="p-4 text-red-600">{error}</div>;
    if (!stats) return null;

    const weekDays = getWeekDays();
    const maxHours = Math.max(...stats.weeklyData.map(d => d.hours));

    return (
        <div className="bg-white rounded-lg shadow p-6">
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
                        className="border rounded-md px-3 py-2"
                    />
                    <button
                        onClick={handleExport}
                        className="flex items-center justify-center p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        title="Exportieren"
                    >
                        <DocumentArrowDownIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">Gesamtstunden</h3>
                    <p className="text-3xl font-bold text-blue-600">{stats.totalHours}h</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-green-900 mb-2">Durchschnitt/Tag</h3>
                    <p className="text-3xl font-bold text-green-600">{stats.averageHoursPerDay}h</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-purple-900 mb-2">Arbeitstage</h3>
                    <p className="text-3xl font-bold text-purple-600">{stats.daysWorked}</p>
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Wochenverlauf</h3>
                <div className="relative h-36">
                    <div className="flex items-end justify-between w-full h-full">
                        {stats.weeklyData.map((day, index) => (
                            <div key={index} className="flex flex-col items-center w-1/7">
                                <div 
                                    className="w-full bg-blue-500 rounded-t"
                                    style={{ 
                                        height: `${maxHours > 0 ? (day.hours / maxHours) * 100 : 0}%`,
                                        minHeight: day.hours > 0 ? '4px' : '0'
                                    }}
                                />
                                <div className="mt-2 text-sm text-gray-600">
                                    {weekDays[index]}
                                </div>
                                <div className="text-sm font-medium">
                                    {day.hours.toFixed(1)}h
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorktimeStats; 