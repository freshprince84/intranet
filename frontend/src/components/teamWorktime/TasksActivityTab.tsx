import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DateRangeSelector } from '../analytics/DateRangeSelector.tsx';
import { useActivityData } from '../../hooks/useActivityData.ts';
import { useDateRange } from '../../hooks/useDateRange.ts';
import { format } from 'date-fns';
import { ClockIcon, TrashIcon, UserIcon } from '@heroicons/react/24/outline';

const TasksActivityTab: React.FC = () => {
    const { t } = useTranslation();
    const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);
    const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined);
    const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
    
    const { period, setPeriod, startDate, setStartDate, endDate, setEndDate, dateRange } = useDateRange();
    
    const { data, loading, error } = useActivityData({
        type: 'tasks',
        period: period,
        startDate: dateRange.start,
        endDate: dateRange.end,
        userId: selectedUserId,
        branchId: selectedBranchId
    });
    
    const toggleTaskExpand = (taskId: number) => {
        setExpandedTasks(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) {
                next.delete(taskId);
            } else {
                next.add(taskId);
            }
            return next;
        });
    };
    
    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold mb-4">
                {t('analytics.taskActivity.title', { defaultValue: 'Task Aktivität' })}
            </h2>
            
            <DateRangeSelector
                period={period}
                setPeriod={setPeriod}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
            />
            
            {loading && <div className="text-center py-8">{t('common.loading', { defaultValue: 'Laden...' })}</div>}
            {error && <div className="text-red-600 py-4">{error}</div>}
            
            {data && data.data && (
                <div className="space-y-4">
                    {data.data.map((task: any) => (
                        <div key={task.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold">{task.title}</h3>
                                <button
                                    onClick={() => toggleTaskExpand(task.id)}
                                    className="text-blue-600 hover:text-blue-800"
                                >
                                    {expandedTasks.has(task.id) ? 'Weniger' : 'Mehr'}
                                </button>
                            </div>
                            
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {t('analytics.taskActivity.createdBy', { defaultValue: 'Erstellt von' })}: {task.createdBy?.firstName} {task.createdBy?.lastName} - {format(new Date(task.createdAt), 'dd.MM.yyyy HH:mm')}
                            </div>
                            
                            {task.deletedAt && (
                                <div className="text-sm text-red-600 mb-2 flex items-center gap-2">
                                    <TrashIcon className="h-4 w-4" />
                                    {t('analytics.taskActivity.deletedBy', { defaultValue: 'Gelöscht von' })}: {task.deletedBy?.firstName} {task.deletedBy?.lastName} - {format(new Date(task.deletedAt), 'dd.MM.yyyy HH:mm')}
                                </div>
                            )}
                            
                            {expandedTasks.has(task.id) && task.statusHistory && task.statusHistory.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-medium mb-2 flex items-center gap-2">
                                        <ClockIcon className="h-4 w-4" />
                                        {t('analytics.taskActivity.statusHistory', { defaultValue: 'Status-Historie' })}
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1">
                                        {task.statusHistory.map((change: any, idx: number) => (
                                            <li key={idx}>
                                                {change.oldStatus || 'null'} → {change.newStatus} - {change.user?.firstName} {change.user?.lastName} - {format(new Date(change.changedAt), 'dd.MM.yyyy HH:mm')}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TasksActivityTab;

