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
exports.createReservationWorker = createReservationWorker;
const bullmq_1 = require("bullmq");
const reservationNotificationService_1 = require("../../services/reservationNotificationService");
const prisma_1 = require("../../utils/prisma");
/**
 * Erstellt einen Worker für Reservation-Jobs
 * Verarbeitet Payment-Link-Erstellung und WhatsApp-Versand im Hintergrund
 *
 * @param connection - Redis-Connection für BullMQ
 * @returns Worker-Instanz
 */
function createReservationWorker(connection) {
    return new bullmq_1.Worker('reservation', (job) => __awaiter(this, void 0, void 0, function* () {
        const { reservationId, organizationId, amount, currency, contactType, guestPhone, guestEmail, guestName, } = job.data;
        console.log(`[Reservation Worker] Starte Verarbeitung für Reservierung ${reservationId} (Job ID: ${job.id})`);
        // Prüfe ob Reservierung existiert
        const reservation = yield prisma_1.prisma.reservation.findUnique({
            where: { id: reservationId }
        });
        if (!reservation) {
            throw new Error(`Reservierung ${reservationId} nicht gefunden`);
        }
        // Prüfe ob bereits verarbeitet (Idempotenz)
        if (reservation.sentMessage && reservation.paymentLink) {
            console.log(`[Reservation Worker] Reservierung ${reservationId} wurde bereits verarbeitet, überspringe`);
            return {
                success: true,
                skipped: true,
                paymentLink: reservation.paymentLink,
                messageSent: !!reservation.sentMessage,
            };
        }
        // Verwende neue Service-Methode sendReservationInvitation()
        if (contactType === 'phone' && guestPhone) {
            try {
                const result = yield reservationNotificationService_1.ReservationNotificationService.sendReservationInvitation(reservationId, {
                    guestPhone,
                    guestEmail,
                    amount,
                    currency
                });
                if (result.success) {
                    console.log(`[Reservation Worker] ✅ Einladung erfolgreich versendet für Reservierung ${reservationId}`);
                }
                else {
                    console.warn(`[Reservation Worker] ⚠️ Einladung teilweise fehlgeschlagen für Reservierung ${reservationId}: ${result.error}`);
                    // Bei teilweisem Fehler: Fehler weiterwerfen, damit BullMQ retried
                    throw new Error(result.error || 'Einladung konnte nicht vollständig versendet werden');
                }
                return {
                    success: true,
                    paymentLink: result.paymentLink,
                    messageSent: result.messageSent,
                    reservationId,
                };
            }
            catch (error) {
                console.error(`[Reservation Worker] ❌ Fehler beim Versenden der Einladung:`, error);
                throw error; // Wird von BullMQ automatisch retried
            }
        }
        // Wenn keine Telefonnummer vorhanden, überspringe
        console.log(`[Reservation Worker] Keine Telefonnummer vorhanden, überspringe Einladung`);
        return {
            success: true,
            skipped: true,
            reservationId,
        };
    }), {
        connection,
        concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5'),
        limiter: {
            max: 10, // Max 10 Jobs pro Sekunde (Rate Limiting für externe APIs)
            duration: 1000,
        },
    });
}
//# sourceMappingURL=reservationWorker.js.map