"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.TourBookingScheduler = void 0;
const prisma_1 = require("../utils/prisma");
/**
 * Tour Booking Scheduler
 *
 * Prüft abgelaufene Tour-Buchungen und storniert sie automatisch,
 * wenn die Zahlungsfrist abgelaufen ist und noch nicht bezahlt wurde.
 */
class TourBookingScheduler {
    /**
     * Prüft abgelaufene Reservierungen und storniert sie automatisch
     */
    static checkExpiredBookings() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const now = new Date();
                // Finde abgelaufene Buchungen
                const expiredBookings = yield prisma_1.prisma.tourBooking.findMany({
                    where: {
                        autoCancelEnabled: true,
                        paymentDeadline: {
                            lt: now // paymentDeadline < jetzt
                        },
                        paymentStatus: 'pending', // Noch nicht bezahlt
                        status: {
                            not: 'cancelled' // Noch nicht storniert
                        }
                    },
                    include: {
                        tour: {
                            select: {
                                id: true,
                                title: true,
                                organizationId: true
                            }
                        },
                        branch: {
                            select: {
                                id: true
                            }
                        }
                    }
                });
                console.log(`[TourBookingScheduler] Gefunden ${expiredBookings.length} abgelaufene Buchungen`);
                for (const booking of expiredBookings) {
                    try {
                        // Storniere Buchung
                        yield prisma_1.prisma.tourBooking.update({
                            where: { id: booking.id },
                            data: {
                                status: 'cancelled',
                                cancelledBy: 'system',
                                cancelledAt: now,
                                cancelledReason: 'Automatische Stornierung: Zahlung nicht innerhalb der Frist erhalten'
                            }
                        });
                        // Sende WhatsApp-Nachricht an Kunden (falls Telefonnummer vorhanden)
                        if (booking.customerPhone && booking.tour) {
                            try {
                                const { TourWhatsAppService } = yield Promise.resolve().then(() => __importStar(require('./tourWhatsAppService')));
                                yield TourWhatsAppService.sendCancellationToCustomer(booking.id, booking.tour.organizationId, booking.branchId || null, 'Automatische Stornierung: Zahlung nicht innerhalb der Frist erhalten');
                            }
                            catch (whatsappError) {
                                console.error(`[TourBookingScheduler] Fehler beim Senden der WhatsApp-Nachricht für Buchung ${booking.id}:`, whatsappError);
                            }
                        }
                        console.log(`[TourBookingScheduler] ✅ Buchung ${booking.id} automatisch storniert`);
                    }
                    catch (error) {
                        console.error(`[TourBookingScheduler] Fehler beim Stornieren der Buchung ${booking.id}:`, error);
                    }
                }
            }
            catch (error) {
                console.error('[TourBookingScheduler] Fehler:', error);
            }
        });
    }
}
exports.TourBookingScheduler = TourBookingScheduler;
//# sourceMappingURL=tourBookingScheduler.js.map