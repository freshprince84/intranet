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
exports.createUpdateGuestContactWorker = createUpdateGuestContactWorker;
const bullmq_1 = require("bullmq");
const boldPaymentService_1 = require("../../services/boldPaymentService");
const whatsappService_1 = require("../../services/whatsappService");
const ttlockService_1 = require("../../services/ttlockService");
const client_1 = require("@prisma/client");
const checkInLinkUtils_1 = require("../../utils/checkInLinkUtils");
const prisma = new client_1.PrismaClient();
/**
 * Erstellt einen Worker für Guest Contact Update Jobs
 * Verarbeitet Payment-Link, TTLock Passcode und WhatsApp-Versand im Hintergrund
 *
 * @param connection - Redis-Connection für BullMQ
 * @returns Worker-Instanz
 */
function createUpdateGuestContactWorker(connection) {
    return new bullmq_1.Worker('update-guest-contact', (job) => __awaiter(this, void 0, void 0, function* () {
        const { reservationId, organizationId, contact, contactType, guestPhone, guestEmail, guestName, } = job.data;
        console.log(`[UpdateGuestContact Worker] Starte Verarbeitung für Reservierung ${reservationId} (Job ID: ${job.id})`);
        // Hole aktuelle Reservierung
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
        let sentMessage = null;
        let sentMessageAt = null;
        let paymentLink = null;
        let ttlockCode = null;
        // Nur wenn Telefonnummer vorhanden
        if (contactType === 'phone' && guestPhone) {
            try {
                // Schritt 1: Payment-Link erstellen
                console.log(`[UpdateGuestContact Worker] Erstelle Payment-Link für Reservierung ${reservationId}...`);
                const boldPaymentService = new boldPaymentService_1.BoldPaymentService(organizationId);
                // Konvertiere amount von Decimal zu number (Prisma Decimal hat toNumber() Methode)
                let amount = 360000; // Default Placeholder
                if (reservation.amount) {
                    if (typeof reservation.amount === 'object' && 'toNumber' in reservation.amount) {
                        // Prisma Decimal
                        amount = reservation.amount.toNumber();
                    }
                    else if (typeof reservation.amount === 'number') {
                        amount = reservation.amount;
                    }
                    else {
                        amount = parseFloat(String(reservation.amount));
                    }
                }
                paymentLink = yield boldPaymentService.createPaymentLink(reservation, amount, reservation.currency || 'COP', `Zahlung für Reservierung ${guestName}`);
                console.log(`[UpdateGuestContact Worker] ✅ Payment-Link erstellt: ${paymentLink}`);
                // Schritt 2: TTLock Passcode erstellen (wenn konfiguriert)
                try {
                    const ttlockService = new ttlockService_1.TTLockService(organizationId);
                    const settings = reservation.organization.settings;
                    const doorSystemSettings = settings === null || settings === void 0 ? void 0 : settings.doorSystem;
                    if ((doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds) && doorSystemSettings.lockIds.length > 0) {
                        const lockId = doorSystemSettings.lockIds[0];
                        console.log(`[UpdateGuestContact Worker] Erstelle TTLock Passcode für Lock ID: ${lockId}...`);
                        ttlockCode = yield ttlockService.createTemporaryPasscode(lockId, reservation.checkInDate, reservation.checkOutDate, `Guest: ${guestName}`);
                        console.log(`[UpdateGuestContact Worker] ✅ TTLock Passcode erstellt: ${ttlockCode}`);
                        // Speichere TTLock Code in Reservierung
                        yield prisma.reservation.update({
                            where: { id: reservationId },
                            data: {
                                doorPin: ttlockCode,
                                doorAppName: 'TTLock',
                                ttlLockId: lockId,
                                ttlLockPassword: ttlockCode,
                            },
                        });
                    }
                }
                catch (ttlockError) {
                    console.error(`[UpdateGuestContact Worker] ❌ Fehler beim Erstellen des TTLock Passcodes:`, ttlockError);
                    // Weiter ohne TTLock Code (wie in alter Logik)
                }
                // Schritt 3: WhatsApp-Nachricht senden
                console.log(`[UpdateGuestContact Worker] Sende WhatsApp-Nachricht für Reservierung ${reservationId}...`);
                const checkInDateStr = reservation.checkInDate.toLocaleDateString('es-ES');
                const checkOutDateStr = reservation.checkOutDate.toLocaleDateString('es-ES');
                sentMessage = `Hola ${guestName},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada:
- Entrada: ${checkInDateStr}
- Salida: ${checkOutDateStr}

Por favor, realiza el pago:
${paymentLink}

${ttlockCode ? `Tu código de acceso TTLock:
${ttlockCode}

` : ''}¡Te esperamos!`;
                const whatsappService = new whatsappService_1.WhatsAppService(organizationId);
                // Basis-Template-Name (wird in sendMessageWithFallback basierend auf Sprache angepasst)
                // Spanisch: reservation_checkin_invitation, Englisch: reservation_checkin_invitation_
                const templateName = process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_checkin_invitation';
                // Erstelle LobbyPMS Check-in-Link
                const checkInLink = (0, checkInLinkUtils_1.generateLobbyPmsCheckInLink)(reservation);
                const templateParams = [guestName, checkInLink, paymentLink];
                console.log(`[UpdateGuestContact Worker] Template Name (Basis): ${templateName}`);
                console.log(`[UpdateGuestContact Worker] Template Params: ${JSON.stringify(templateParams)}`);
                yield whatsappService.sendMessageWithFallback(guestPhone, sentMessage, templateName, templateParams);
                sentMessageAt = new Date();
                console.log(`[UpdateGuestContact Worker] ✅ WhatsApp-Nachricht erfolgreich versendet`);
            }
            catch (error) {
                console.error(`[UpdateGuestContact Worker] ❌ Fehler beim Versenden:`, error);
                if (error instanceof Error) {
                    console.error(`[UpdateGuestContact Worker] Fehlermeldung: ${error.message}`);
                }
                throw error; // Wird von BullMQ automatisch retried
            }
        }
        // Schritt 4: Reservierung aktualisieren
        try {
            const updateData = {
                paymentLink: paymentLink || undefined,
            };
            if (sentMessage) {
                updateData.sentMessage = sentMessage;
                updateData.sentMessageAt = sentMessageAt;
            }
            yield prisma.reservation.update({
                where: { id: reservationId },
                data: updateData,
            });
            console.log(`[UpdateGuestContact Worker] ✅ Reservierung ${reservationId} erfolgreich aktualisiert`);
        }
        catch (error) {
            console.error(`[UpdateGuestContact Worker] ❌ Fehler beim Aktualisieren der Reservierung:`, error);
            throw error;
        }
        return {
            success: true,
            paymentLink,
            sentMessage: !!sentMessage,
            ttlockCode: !!ttlockCode,
            reservationId,
        };
    }), {
        connection,
        concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5'),
        limiter: {
            max: 10, // Max 10 Jobs pro Sekunde
            duration: 1000,
        },
    });
}
//# sourceMappingURL=updateGuestContactWorker.js.map