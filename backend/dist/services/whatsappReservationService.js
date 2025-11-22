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
exports.WhatsAppReservationService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../utils/prisma");
/**
 * Service für automatische Reservierungserstellung aus WhatsApp-Nachrichten
 */
class WhatsAppReservationService {
    /**
     * Erstellt eine Reservierung aus einer geparsten WhatsApp-Nachricht
     *
     * @param parsedMessage - Geparste Nachricht
     * @returns Erstellte oder aktualisierte Reservierung
     */
    static createReservationFromMessage(parsedMessage) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // ✅ Hardcodiert: Organisation ID = 1 (aktuell)
                const organizationId = 1;
                // Prüfe ob Reservierung bereits existiert
                const existingReservation = yield prisma_1.prisma.reservation.findUnique({
                    where: { lobbyReservationId: parsedMessage.reservationId }
                });
                if (existingReservation) {
                    console.log(`[WhatsAppReservation] Reservierung ${parsedMessage.reservationId} existiert bereits`);
                    return existingReservation;
                }
                // Hole erste Branch der Organisation als Fallback
                const branch = yield prisma_1.prisma.branch.findFirst({
                    where: { organizationId },
                    orderBy: { id: 'asc' }
                });
                // Erstelle neue Reservierung
                const reservation = yield prisma_1.prisma.reservation.create({
                    data: {
                        lobbyReservationId: parsedMessage.reservationId,
                        guestName: parsedMessage.guestName,
                        guestEmail: null, // Wird später eingetragen
                        guestPhone: null, // Wird später eingetragen
                        checkInDate: parsedMessage.checkInDate,
                        checkOutDate: parsedMessage.checkOutDate,
                        status: client_1.ReservationStatus.confirmed,
                        paymentStatus: client_1.PaymentStatus.pending,
                        organizationId: organizationId,
                        branchId: (branch === null || branch === void 0 ? void 0 : branch.id) || null
                    }
                });
                // Erstelle Sync-History-Eintrag
                yield prisma_1.prisma.reservationSyncHistory.create({
                    data: {
                        reservationId: reservation.id,
                        syncType: 'whatsapp_created',
                        syncData: {
                            propertyName: parsedMessage.propertyName,
                            amount: parsedMessage.amount,
                            currency: parsedMessage.currency,
                            rooms: parsedMessage.rooms,
                            guests: parsedMessage.guests
                        }
                    }
                });
                console.log(`[WhatsAppReservation] Reservierung ${reservation.id} erstellt aus WhatsApp-Nachricht`);
                return reservation;
            }
            catch (error) {
                console.error('[WhatsAppReservation] Fehler beim Erstellen der Reservierung:', error);
                throw error;
            }
        });
    }
}
exports.WhatsAppReservationService = WhatsAppReservationService;
//# sourceMappingURL=whatsappReservationService.js.map