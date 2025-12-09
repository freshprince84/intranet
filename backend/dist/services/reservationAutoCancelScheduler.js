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
exports.ReservationAutoCancelScheduler = void 0;
const prisma_1 = require("../utils/prisma");
const client_1 = require("@prisma/client");
const lobbyPmsService_1 = require("./lobbyPmsService");
const logger_1 = require("../utils/logger");
/**
 * Scheduler für automatische Stornierung von nicht bezahlten Reservierungen
 */
class ReservationAutoCancelScheduler {
    /**
     * Startet den Scheduler
     */
    static start() {
        if (this.checkInterval) {
            logger_1.logger.log('[ReservationAutoCancel] Scheduler läuft bereits');
            return;
        }
        logger_1.logger.log('[ReservationAutoCancel] Starte Scheduler...');
        // Sofortige Prüfung beim Start
        this.checkAndCancelReservations();
        // Regelmäßige Prüfung
        this.checkInterval = setInterval(() => {
            this.checkAndCancelReservations();
        }, this.CHECK_INTERVAL);
        logger_1.logger.log('[ReservationAutoCancel] Scheduler gestartet (alle 5 Minuten)');
    }
    /**
     * Stoppt den Scheduler
     */
    static stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            logger_1.logger.log('[ReservationAutoCancel] Scheduler gestoppt');
        }
    }
    /**
     * Prüft und storniert Reservierungen, die nicht bezahlt wurden
     */
    static checkAndCancelReservations() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const now = new Date();
                // Finde Reservierungen, die:
                // 1. Status "confirmed" haben
                // 2. Payment-Status "pending" haben
                // 3. Payment-Deadline überschritten ist
                // 4. Auto-Cancel aktiviert ist
                // 5. Noch nicht storniert wurden
                const expiredReservations = yield prisma_1.prisma.reservation.findMany({
                    where: {
                        status: client_1.ReservationStatus.confirmed,
                        paymentStatus: client_1.PaymentStatus.pending,
                        paymentDeadline: {
                            lte: now // Deadline überschritten
                        },
                        autoCancelEnabled: true,
                        cancelledAt: null // Noch nicht storniert
                    },
                    include: {
                        branch: {
                            select: {
                                id: true,
                                lobbyPmsSettings: true
                            }
                        }
                    }
                });
                if (expiredReservations.length === 0) {
                    return; // Keine abgelaufenen Reservierungen
                }
                logger_1.logger.log(`[ReservationAutoCancel] ${expiredReservations.length} Reservierungen gefunden, die storniert werden müssen`);
                for (const reservation of expiredReservations) {
                    try {
                        yield this.cancelReservation(reservation);
                    }
                    catch (error) {
                        logger_1.logger.error(`[ReservationAutoCancel] Fehler beim Stornieren der Reservierung ${reservation.id}:`, error);
                        // Weiter mit nächster Reservierung
                    }
                }
            }
            catch (error) {
                logger_1.logger.error('[ReservationAutoCancel] Fehler beim Prüfen der Reservierungen:', error);
            }
        });
    }
    /**
     * Storniert eine Reservierung
     */
    static cancelReservation(reservation) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            logger_1.logger.log(`[ReservationAutoCancel] Storniere Reservierung ${reservation.id} (Gast: ${reservation.guestName})`);
            // 1. Storniere in LobbyPMS (falls lobbyReservationId vorhanden)
            if (reservation.lobbyReservationId && reservation.branchId && ((_a = reservation.branch) === null || _a === void 0 ? void 0 : _a.lobbyPmsSettings)) {
                try {
                    const service = yield lobbyPmsService_1.LobbyPmsService.createForBranch(reservation.branchId);
                    yield service.updateReservationStatus(reservation.lobbyReservationId, 'cancelled');
                    logger_1.logger.log(`[ReservationAutoCancel] Reservierung ${reservation.id} in LobbyPMS storniert`);
                }
                catch (error) {
                    logger_1.logger.error(`[ReservationAutoCancel] Fehler beim Stornieren in LobbyPMS:`, error);
                    // Weiter mit lokaler Stornierung
                }
            }
            // 2. Aktualisiere lokale Reservierung
            yield prisma_1.prisma.reservation.update({
                where: { id: reservation.id },
                data: {
                    status: client_1.ReservationStatus.cancelled,
                    cancelledAt: new Date(),
                    cancelledBy: 'system',
                    cancellationReason: 'Zahlung nicht innerhalb der Frist erfolgt'
                }
            });
            logger_1.logger.log(`[ReservationAutoCancel] Reservierung ${reservation.id} erfolgreich storniert`);
            // 3. Optional: Benachrichtigung an Gast senden (wenn gewünscht)
            // TODO: Implementieren wenn gewünscht
        });
    }
}
exports.ReservationAutoCancelScheduler = ReservationAutoCancelScheduler;
ReservationAutoCancelScheduler.checkInterval = null;
ReservationAutoCancelScheduler.CHECK_INTERVAL = 5 * 60 * 1000; // Alle 5 Minuten prüfen
//# sourceMappingURL=reservationAutoCancelScheduler.js.map