import { useState, useMemo } from 'react';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';

export type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
    start: string;
    end: string;
}

export const useDateRange = () => {
    const [period, setPeriod] = useState<Period>('today');
    const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    
    const dateRange = useMemo(() => {
        const now = new Date();
        
        switch (period) {
            case 'today':
                return {
                    start: format(startOfDay(now), 'yyyy-MM-dd'),
                    end: format(endOfDay(now), 'yyyy-MM-dd')
                };
            case 'week':
                return {
                    start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
                    end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
                };
            case 'month':
                return {
                    start: format(startOfMonth(now), 'yyyy-MM-dd'),
                    end: format(endOfMonth(now), 'yyyy-MM-dd')
                };
            case 'year':
                return {
                    start: format(startOfYear(now), 'yyyy-MM-dd'),
                    end: format(endOfYear(now), 'yyyy-MM-dd')
                };
            case 'custom':
                return {
                    start: startDate,
                    end: endDate
                };
        }
    }, [period, startDate, endDate]);
    
    return {
        period,
        setPeriod,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        dateRange
    };
};

