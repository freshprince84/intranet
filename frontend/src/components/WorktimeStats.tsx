import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
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
    const [selectedWeek, setSelectedWeek] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        fetchStats();
    }, [selectedWeek]);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/worktime/stats?week=${selectedWeek}`, {
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
            const response = await fetch(`http://localhost:5000/api/worktime/export?week=${selectedWeek}`, {
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
            a.download = `arbeitszeiten_${selectedWeek}.xlsx`;
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
        if (!selectedWeek) return [];
        
        const start = startOfWeek(new Date(selectedWeek), { locale: de });
        const end = endOfWeek(new Date(selectedWeek), { locale: de });
        
        return eachDayOfInterval({ start, end }).map(day => format(day, 'EEEE', { locale: de }));
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
                        value={selectedWeek}
                        onChange={(e) => setSelectedWeek(e.target.value)}
                        className="border rounded-md px-3 py-2"
                    />
                    <button
                        onClick={handleExport}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                        Exportieren
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
                <div className="relative h-64">
                    <div className="absolute inset-0 flex items-end justify-between">
                        {stats.weeklyData.map((day, index) => (
                            <div key={index} className="flex flex-col items-center w-1/7">
                                <div 
                                    className="w-full bg-blue-500 rounded-t"
                                    style={{ 
                                        height: `${(day.hours / maxHours) * 100}%`,
                                        minHeight: day.hours > 0 ? '4px' : '0'
                                    }}
                                />
                                <div className="mt-2 text-sm text-gray-600">
                                    {weekDays[index]}
                                </div>
                                <div className="text-sm font-medium">
                                    {day.hours}h
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