import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DateRangeSelector } from '../analytics/DateRangeSelector.tsx';
import { useActivityData } from '../../hooks/useActivityData.ts';
import { useDateRange } from '../../hooks/useDateRange.ts';
import { format } from 'date-fns';
import { UserIcon, ClockIcon, TrashIcon } from '@heroicons/react/24/outline';

const UserTasksActivityTab: React.FC = () => {
    const { t } = useTranslation();
    const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);
    const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined);
    
    // DateRange State
    const { period, setPeriod, startDate, setStartDate, endDate, setEndDate, dateRange } = useDateRange();
    
    const { data, loading, error } = useActivityData({
        type: 'user-tasks',
        period: period,
        startDate: dateRange.start,
        endDate: dateRange.end,
        userId: selectedUserId,
        branchId: selectedBranchId
    });
    
    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold mb-4">
                {t('analytics.userActivity.tasks.title', { defaultValue: 'User Tasks Aktivität' })}
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
                    {data.data.map((userActivity: any) => (
                        <div key={userActivity.user.id} className="border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <UserIcon className="h-5 w-5" />
                                <h3 className="font-semibold">
                                    {userActivity.user.firstName} {userActivity.user.lastName}
                                </h3>
                            </div>
                            
                            {userActivity.tasksCreated.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="font-medium mb-2">
                                        {t('analytics.userActivity.tasksCreated', { defaultValue: 'Tasks erstellt' })} ({userActivity.tasksCreated.length})
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1">
                                        {userActivity.tasksCreated.map((task: any) => (
                                            <li key={task.id}>
                                                {task.title} - {format(new Date(task.createdAt), 'dd.MM.yyyy HH:mm')}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            {userActivity.tasksDeleted.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="font-medium mb-2 flex items-center gap-2">
                                        <TrashIcon className="h-4 w-4" />
                                        {t('analytics.userActivity.tasksDeleted', { defaultValue: 'Tasks gelöscht' })} ({userActivity.tasksDeleted.length})
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1">
                                        {userActivity.tasksDeleted.map((task: any) => (
                                            <li key={task.id}>
                                                {task.title} - {format(new Date(task.deletedAt), 'dd.MM.yyyy HH:mm')}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            {userActivity.statusChanges.length > 0 && (
                                <div>
                                    <h4 className="font-medium mb-2 flex items-center gap-2">
                                        <ClockIcon className="h-4 w-4" />
                                        {t('analytics.userActivity.statusChanges', { defaultValue: 'Status-Änderungen' })} ({userActivity.statusChanges.length})
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1">
                                        {userActivity.statusChanges.map((change: any, idx: number) => (
                                            <li key={idx}>
                                                {change.oldStatus || 'null'} → {change.newStatus} - {format(new Date(change.changedAt), 'dd.MM.yyyy HH:mm')}
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

export default UserTasksActivityTab;

