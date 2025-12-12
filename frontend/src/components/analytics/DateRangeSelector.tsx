import React from 'react';
import { useTranslation } from 'react-i18next';
import { Period } from '../../hooks/useDateRange.ts';

interface DateRangeSelectorProps {
    period: Period;
    setPeriod: (period: Period) => void;
    startDate: string;
    setStartDate: (date: string) => void;
    endDate: string;
    setEndDate: (date: string) => void;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
    period,
    setPeriod,
    startDate,
    setStartDate,
    endDate,
    setEndDate
}) => {
    const { t } = useTranslation();
    
    return (
        <div className="flex items-center gap-4 mb-4">
            <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as Period)}
                className="px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
                <option value="today">{t('analytics.period.today', { defaultValue: 'Heute' })}</option>
                <option value="week">{t('analytics.period.week', { defaultValue: 'Diese Woche' })}</option>
                <option value="month">{t('analytics.period.month', { defaultValue: 'Diesen Monat' })}</option>
                <option value="year">{t('analytics.period.year', { defaultValue: 'Dieses Jahr' })}</option>
                <option value="custom">{t('analytics.period.custom', { defaultValue: 'Benutzerdefiniert' })}</option>
            </select>
            
            {period === 'custom' && (
                <>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                    <span className="text-gray-600 dark:text-gray-400">{t('common.to', { defaultValue: 'bis' }) || 'bis'}</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                </>
            )}
        </div>
    );
};

