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
const boldPaymentService_1 = require("../../services/boldPaymentService");
const whatsappService_1 = require("../../services/whatsappService");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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
        let paymentLink = null;
        let sentMessage = null;
        let sentMessageAt = null;
        // Prüfe ob Reservierung existiert
        const reservation = yield prisma.reservation.findUnique({
            where: { id: reservationId },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true,
                        settings: true,
                    },
                },
            },
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
        // Schritt 1: Payment-Link erstellen (wenn Telefonnummer vorhanden)
        if (contactType === 'phone' && guestPhone) {
            try {
                console.log(`[Reservation Worker] Erstelle Payment-Link für Reservierung ${reservationId}...`);
                const boldPaymentService = new boldPaymentService_1.BoldPaymentService(organizationId);
                paymentLink = yield boldPaymentService.createPaymentLink(reservation, amount, currency, `Zahlung für Reservierung ${guestName}`);
                console.log(`[Reservation Worker] ✅ Payment-Link erstellt: ${paymentLink}`);
            }
            catch (error) {
                console.error(`[Reservation Worker] ❌ Fehler beim Erstellen des Payment-Links:`, error);
                throw error; // Wird von BullMQ automatisch retried
            }
        }
        // Schritt 2: WhatsApp-Nachricht senden (wenn Telefonnummer vorhanden)
        if (contactType === 'phone' && guestPhone && paymentLink) {
            try {
                console.log(`[Reservation Worker] Sende WhatsApp-Nachricht für Reservierung ${reservationId}...`);
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                const checkInLink = `${frontendUrl}/check-in/${reservationId}`;
                sentMessage = `Hola ${guestName},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada.
Cargos: ${amount} ${currency}

Puedes realizar el check-in en línea ahora:
${checkInLink}

Por favor, realiza el pago:
${paymentLink}

¡Te esperamos!`;
                const whatsappService = new whatsappService_1.WhatsAppService(organizationId);
                const templateName = process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_checkin_invitation';
                const templateParams = [guestName, checkInLink, paymentLink];
                console.log(`[Reservation Worker] Template Name: ${templateName}`);
                console.log(`[Reservation Worker] Template Params: ${JSON.stringify(templateParams)}`);
                const whatsappSuccess = yield whatsappService.sendMessageWithFallback(guestPhone, sentMessage, templateName, templateParams);
                if (!whatsappSuccess) {
                    throw new Error('WhatsApp-Nachricht konnte nicht versendet werden (sendMessageWithFallback gab false zurück)');
                }
                sentMessageAt = new Date();
                console.log(`[Reservation Worker] ✅ WhatsApp-Nachricht erfolgreich versendet`);
            }
            catch (error) {
                console.error(`[Reservation Worker] ❌ Fehler beim Versenden der WhatsApp-Nachricht:`, error);
                if (error instanceof Error) {
                    console.error(`[Reservation Worker] Fehlermeldung: ${error.message}`);
                }
                throw error; // Wird von BullMQ automatisch retried
            }
        }
        // Schritt 3: Reservierung aktualisieren
        try {
            const updateData = {
                paymentLink: paymentLink || undefined,
            };
            if (sentMessage) {
                updateData.sentMessage = sentMessage;
                updateData.sentMessageAt = sentMessageAt;
                updateData.status = 'notification_sent';
            }
            yield prisma.reservation.update({
                where: { id: reservationId },
                data: updateData,
            });
            console.log(`[Reservation Worker] ✅ Reservierung ${reservationId} erfolgreich aktualisiert`);
        }
        catch (error) {
            console.error(`[Reservation Worker] ❌ Fehler beim Aktualisieren der Reservierung:`, error);
            throw error;
        }
        return {
            success: true,
            paymentLink,
            messageSent: !!sentMessage,
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