import React, { useState, useEffect } from 'react';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface WorkTime {
    id: number;
    startTime: string;
    endTime: string | null;
    branch: {
        id: number;
        name: string;
    };
    user: {
        id: number;
        firstName: string;
        lastName: string;
    };
}

interface SortConfig {
    key: keyof WorkTime | 'branch.name' | 'duration';
    direction: 'asc' | 'desc';
}

const WorktimeList: React.FC = () => {
    const [worktimes, setWorktimes] = useState<WorkTime[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'startTime', direction: 'desc' });
    const [dateFilter, setDateFilter] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        fetchWorktimes();
    }, [dateFilter]);

    const fetchWorktimes = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/worktime?date=${dateFilter}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Fehler beim Laden der Zeiteinträge');
            }

            const data = await response.json();
            setWorktimes(data);
            setError(null);
        } catch (error) {
            console.error('Fehler:', error);
            setError('Fehler beim Laden der Zeiteinträge');
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key: SortConfig['key']) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
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

    const handleDelete = async (id: number) => {
        if (!window.confirm('Möchten Sie diesen Zeiteintrag wirklich löschen?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/worktime/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Fehler beim Löschen des Zeiteintrags');
            }

            await fetchWorktimes();
        } catch (error) {
            console.error('Fehler:', error);
            alert('Fehler beim Löschen des Zeiteintrags');
        }
    };

    const sortedWorktimes = [...worktimes].sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof WorkTime];
        let bValue: any = b[sortConfig.key as keyof WorkTime];

        if (sortConfig.key === 'branch.name') {
            aValue = a.branch.name;
            bValue = b.branch.name;
        } else if (sortConfig.key === 'duration') {
            aValue = calculateDuration(a.startTime, a.endTime);
            bValue = calculateDuration(b.startTime, b.endTime);
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    if (loading) return <div className="p-4">Lädt...</div>;
    if (error) return <div className="p-4 text-red-600">{error}</div>;

    return (
        <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700">
            <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Zeiteinträge</h2>
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="border rounded-md px-3 py-2"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                onClick={() => handleSort('startTime')}
                            >
                                Start {sortConfig.key === 'startTime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                onClick={() => handleSort('endTime')}
                            >
                                Ende {sortConfig.key === 'endTime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                onClick={() => handleSort('duration')}
                            >
                                Dauer {sortConfig.key === 'duration' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                onClick={() => handleSort('branch.name')}
                            >
                                Niederlassung {sortConfig.key === 'branch.name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Aktionen
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedWorktimes.map((worktime) => (
                            <tr key={worktime.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {format(new Date(worktime.startTime), 'HH:mm', { locale: de })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {worktime.endTime 
                                        ? format(new Date(worktime.endTime), 'HH:mm', { locale: de })
                                        : '-'
                                    }
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {calculateDuration(worktime.startTime, worktime.endTime)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {worktime.branch.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end space-x-2">
                                        <button
                                            onClick={() => {/* TODO: Implement edit */}}
                                            className="text-gray-600 hover:text-gray-900"
                                        >
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(worktime.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default WorktimeList; 