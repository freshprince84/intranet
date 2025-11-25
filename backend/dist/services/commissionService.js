"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCommission = calculateCommission;
exports.getUserCommissions = getUserCommissions;
exports.getUserCommissionStats = getUserCommissionStats;
const prisma_1 = require("../utils/prisma");
/**
 * Berechnet Kommission für eine Tour-Buchung
 *
 * Logik:
 * - Liest tour.totalCommission oder tour.totalCommissionPercent
 * - Liest tour.sellerCommissionPercent oder tour.sellerCommissionFixed
 * - Berechnet: sellerCommission = (totalCommission * sellerCommissionPercent / 100) ODER sellerCommission = sellerCommissionFixed
 * - Speichert in booking.commissionAmount
 */
function calculateCommission(bookingId) {
    return __awaiter(this, void 0, void 0, function* () {
        const booking = yield prisma_1.prisma.tourBooking.findUnique({
            where: { id: bookingId },
            include: {
                tour: true
            }
        });
        if (!booking) {
            throw new Error(`Buchung ${bookingId} nicht gefunden`);
        }
        const tour = booking.tour;
        let totalCommission = 0;
        // Berechne Gesamtkommission
        if (tour.totalCommission) {
            // Fixe Zahl
            totalCommission = Number(tour.totalCommission);
        }
        else if (tour.totalCommissionPercent && booking.totalPrice) {
            // Prozent vom Gesamtpreis
            totalCommission = Number(booking.totalPrice) * Number(tour.totalCommissionPercent) / 100;
        }
        // Berechne Verkäufer-Kommission
        let sellerCommission = 0;
        if (tour.sellerCommissionFixed) {
            // Fixe Zahl
            sellerCommission = Number(tour.sellerCommissionFixed);
        }
        else if (tour.sellerCommissionPercent && totalCommission > 0) {
            // Prozent von Gesamtkommission
            sellerCommission = totalCommission * Number(tour.sellerCommissionPercent) / 100;
        }
        // Speichere Kommission
        yield prisma_1.prisma.tourBooking.update({
            where: { id: bookingId },
            data: {
                commissionAmount: sellerCommission,
                commissionCalculatedAt: new Date()
            }
        });
        return sellerCommission;
    });
}
/**
 * Holt Kommissionen eines Mitarbeiters
 */
function getUserCommissions(userId, startDate, endDate) {
    return __awaiter(this, void 0, void 0, function* () {
        const bookings = yield prisma_1.prisma.tourBooking.findMany({
            where: {
                bookedById: userId,
                bookingDate: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                tour: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            },
            orderBy: {
                bookingDate: 'desc'
            }
        });
        const totalCommissions = bookings.reduce((sum, booking) => {
            return sum + (booking.commissionAmount ? Number(booking.commissionAmount) : 0);
        }, 0);
        return {
            totalCommissions,
            bookings: bookings.map(booking => ({
                id: booking.id,
                tourTitle: booking.tour.title,
                commissionAmount: booking.commissionAmount ? Number(booking.commissionAmount) : 0,
                bookingDate: booking.bookingDate
            }))
        };
    });
}
/**
 * Statistiken für Mitarbeiter
 */
function getUserCommissionStats(userId, startDate, endDate) {
    return __awaiter(this, void 0, void 0, function* () {
        const bookings = yield prisma_1.prisma.tourBooking.findMany({
            where: {
                bookedById: userId,
                bookingDate: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                tour: {
                    select: {
                        id: true,
                        title: true,
                        type: true
                    }
                }
            }
        });
        const totalCommissions = bookings.reduce((sum, booking) => {
            return sum + (booking.commissionAmount ? Number(booking.commissionAmount) : 0);
        }, 0);
        const totalBookings = bookings.length;
        const averageCommission = totalBookings > 0 ? totalCommissions / totalBookings : 0;
        // Nach Tour-Typ gruppieren
        const byTourType = {
            own: 0,
            external: 0
        };
        bookings.forEach(booking => {
            const commission = booking.commissionAmount ? Number(booking.commissionAmount) : 0;
            if (booking.tour.type === 'own') {
                byTourType.own += commission;
            }
            else {
                byTourType.external += commission;
            }
        });
        // Welche Tour wurde von wem wie oft verkauft
        const tourSalesMap = new Map();
        bookings.forEach(booking => {
            const tourId = booking.tour.id;
            const existing = tourSalesMap.get(tourId);
            const commission = booking.commissionAmount ? Number(booking.commissionAmount) : 0;
            if (existing) {
                existing.salesCount++;
                existing.totalCommission += commission;
            }
            else {
                tourSalesMap.set(tourId, {
                    tourId,
                    tourTitle: booking.tour.title,
                    salesCount: 1,
                    totalCommission: commission
                });
            }
        });
        const tourSales = Array.from(tourSalesMap.values()).sort((a, b) => b.salesCount - a.salesCount);
        return {
            totalCommissions,
            totalBookings,
            averageCommission,
            byTourType,
            tourSales
        };
    });
}
//# sourceMappingURL=commissionService.js.map