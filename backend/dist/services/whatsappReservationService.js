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
const prisma = new client_1.PrismaClient();
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
                const existingReservation = yield prisma.reservation.findUnique({
                    where: { lobbyReservationId: parsedMessage.reservationId }
                });
                if (existingReservation) {
                    console.log(`[WhatsAppReservation] Reservierung ${parsedMessage.reservationId} existiert bereits`);
                    return existingReservation;
                }
                // Erstelle neue Reservierung
                const reservation = yield prisma.reservation.create({
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
                        // Speichere zusätzliche Daten in syncHistory
                    }
                });
                // Erstelle Sync-History-Eintrag
                yield prisma.reservationSyncHistory.create({
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