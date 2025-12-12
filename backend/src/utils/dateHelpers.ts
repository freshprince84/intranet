import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from 'date-fns';

export type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
    start: Date;
    end: Date;
}

/**
 * Berechnet Datumsbereich basierend auf Periode
 * 
 * @param period - Periode: 'today', 'week', 'month', 'year', 'custom'
 * @param startDate - Start-Datum (für 'custom')
 * @param endDate - End-Datum (für 'custom')
 * @returns DateRange mit start und end Date-Objekten
 */
export const getDateRange = (
    period: Period,
    startDate?: string,
    endDate?: string
): DateRange => {
    const now = new Date();
    
    switch (period) {
        case 'today':
            return {
                start: startOfDay(now),
                end: endOfDay(now)
            };
        case 'week':
            return {
                start: startOfWeek(now, { weekStartsOn: 1 }),
                end: endOfWeek(now, { weekStartsOn: 1 })
            };
        case 'month':
            return {
                start: startOfMonth(now),
                end: endOfMonth(now)
            };
        case 'year':
            return {
                start: startOfYear(now),
                end: endOfYear(now)
            };
        case 'custom':
            if (!startDate || !endDate) {
                throw new Error('startDate und endDate erforderlich für custom period');
            }
            return {
                start: startOfDay(parseISO(startDate)),
                end: endOfDay(parseISO(endDate))
            };
        default:
            throw new Error(`Unbekannte Periode: ${period}`);
    }
};

