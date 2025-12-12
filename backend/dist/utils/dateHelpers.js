"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDateRange = void 0;
const date_fns_1 = require("date-fns");
/**
 * Berechnet Datumsbereich basierend auf Periode
 *
 * @param period - Periode: 'today', 'week', 'month', 'year', 'custom'
 * @param startDate - Start-Datum (für 'custom')
 * @param endDate - End-Datum (für 'custom')
 * @returns DateRange mit start und end Date-Objekten
 */
const getDateRange = (period, startDate, endDate) => {
    const now = new Date();
    switch (period) {
        case 'today':
            return {
                start: (0, date_fns_1.startOfDay)(now),
                end: (0, date_fns_1.endOfDay)(now)
            };
        case 'week':
            return {
                start: (0, date_fns_1.startOfWeek)(now, { weekStartsOn: 1 }),
                end: (0, date_fns_1.endOfWeek)(now, { weekStartsOn: 1 })
            };
        case 'month':
            return {
                start: (0, date_fns_1.startOfMonth)(now),
                end: (0, date_fns_1.endOfMonth)(now)
            };
        case 'year':
            return {
                start: (0, date_fns_1.startOfYear)(now),
                end: (0, date_fns_1.endOfYear)(now)
            };
        case 'custom':
            if (!startDate || !endDate) {
                throw new Error('startDate und endDate erforderlich für custom period');
            }
            return {
                start: (0, date_fns_1.startOfDay)((0, date_fns_1.parseISO)(startDate)),
                end: (0, date_fns_1.endOfDay)((0, date_fns_1.parseISO)(endDate))
            };
        default:
            throw new Error(`Unbekannte Periode: ${period}`);
    }
};
exports.getDateRange = getDateRange;
//# sourceMappingURL=dateHelpers.js.map