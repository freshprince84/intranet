import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DateRangeSelector } from '../analytics/DateRangeSelector.tsx';
import { useActivityData } from '../../hooks/useActivityData.ts';
import { useDateRange } from '../../hooks/useDateRange.ts';
import { format } from 'date-fns';
import { ClockIcon, TrashIcon, UserIcon } from '@heroicons/react/24/outline';

const RequestsActivityTab: React.FC = () => {
    const { t } = useTranslation();
    const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);
    const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined);
    const [expandedRequests, setExpandedRequests] = useState<Set<number>>(new Set());
    
    const { period, setPeriod, startDate, setStartDate, endDate, setEndDate, dateRange } = useDateRange();
    
    const { data, loading, error } = useActivityData({
        type: 'requests',
        period: period,
        startDate: dateRange.start,
        endDate: dateRange.end,
        userId: selectedUserId,
        branchId: selectedBranchId
    });
    
    const toggleRequestExpand = (requestId: number) => {
        setExpandedRequests(prev => {
            const next = new Set(prev);
            if (next.has(requestId)) {
                next.delete(requestId);
            } else {
                next.add(requestId);
            }
            return next;
        });
    };
    
    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold mb-4">
                {t('analytics.requestActivity.title', { defaultValue: 'Request Aktivität' })}
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
                    {data.data.map((request: any) => (
                        <div key={request.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold">{request.title}</h3>
                                <button
                                    onClick={() => toggleRequestExpand(request.id)}
                                    className="text-blue-600 hover:text-blue-800"
                                >
                                    {expandedRequests.has(request.id) ? 'Weniger' : 'Mehr'}
                                </button>
                            </div>
                            
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {t('analytics.requestActivity.createdBy', { defaultValue: 'Erstellt von' })}: {request.requester?.firstName} {request.requester?.lastName} - {format(new Date(request.createdAt), 'dd.MM.yyyy HH:mm')}
                            </div>
                            
                            {request.deletedAt && (
                                <div className="text-sm text-red-600 mb-2 flex items-center gap-2">
                                    <TrashIcon className="h-4 w-4" />
                                    {t('analytics.requestActivity.deletedBy', { defaultValue: 'Gelöscht von' })}: {request.deletedBy?.firstName} {request.deletedBy?.lastName} - {format(new Date(request.deletedAt), 'dd.MM.yyyy HH:mm')}
                                </div>
                            )}
                            
                            {expandedRequests.has(request.id) && request.statusHistory && request.statusHistory.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="font-medium mb-2 flex items-center gap-2">
                                        <ClockIcon className="h-4 w-4" />
                                        {t('analytics.requestActivity.statusHistory', { defaultValue: 'Status-Historie' })}
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1">
                                        {request.statusHistory.map((change: any, idx: number) => (
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

export default RequestsActivityTab;

