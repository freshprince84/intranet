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
exports.createUpdateGuestContactWorker = createUpdateGuestContactWorker;
const bullmq_1 = require("bullmq");
const boldPaymentService_1 = require("../../services/boldPaymentService");
const whatsappService_1 = require("../../services/whatsappService");
const ttlockService_1 = require("../../services/ttlockService");
const checkInLinkUtils_1 = require("../../utils/checkInLinkUtils");
const prisma_1 = require("../../utils/prisma");
/**
 * Erstellt einen Worker für Guest Contact Update Jobs
 * Verarbeitet Payment-Link, TTLock Passcode und WhatsApp-Versand im Hintergrund
 *
 * @param connection - Redis-Connection für BullMQ
 * @returns Worker-Instanz
 */
function createUpdateGuestContactWorker(connection) {
    return new bullmq_1.Worker('update-guest-contact', (job) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { reservationId, organizationId, contact, contactType, guestPhone, guestEmail, guestName, } = job.data;
        console.log(`[UpdateGuestContact Worker] Starte Verarbeitung für Reservierung ${reservationId} (Job ID: ${job.id})`);
        // Hole aktuelle Reservierung
        const reservation = yield prisma_1.prisma.reservation.findUnique({
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
                branch: {
                    select: {
                        id: true,
                        name: true,
                        doorSystemSettings: true,
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
                const boldPaymentService = reservation.branchId
                    ? yield boldPaymentService_1.BoldPaymentService.createForBranch(reservation.branchId)
                    : new boldPaymentService_1.BoldPaymentService(organizationId);
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
                    const ttlockService = reservation.branchId
                        ? yield ttlockService_1.TTLockService.createForBranch(reservation.branchId)
                        : new ttlockService_1.TTLockService(organizationId);
                    // Lade Settings aus Branch oder Organisation
                    const { decryptApiSettings, decryptBranchApiSettings } = yield Promise.resolve().then(() => __importStar(require('../../utils/encryption')));
                    let doorSystemSettings = null;
                    if (reservation.branchId && ((_a = reservation.branch) === null || _a === void 0 ? void 0 : _a.doorSystemSettings)) {
                        const branchSettings = decryptBranchApiSettings(reservation.branch.doorSystemSettings);
                        doorSystemSettings = (branchSettings === null || branchSettings === void 0 ? void 0 : branchSettings.doorSystem) || branchSettings;
                    }
                    else {
                        const settings = decryptApiSettings(reservation.organization.settings);
                        doorSystemSettings = settings === null || settings === void 0 ? void 0 : settings.doorSystem;
                    }
                    if ((doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds) && doorSystemSettings.lockIds.length > 0) {
                        const lockId = doorSystemSettings.lockIds[0];
                        console.log(`[UpdateGuestContact Worker] Erstelle TTLock Passcode für Lock ID: ${lockId}...`);
                        ttlockCode = yield ttlockService.createTemporaryPasscode(lockId, reservation.checkInDate, reservation.checkOutDate, `Guest: ${guestName}`);
                        console.log(`[UpdateGuestContact Worker] ✅ TTLock Passcode erstellt: ${ttlockCode}`);
                        // Speichere TTLock Code in Reservierung
                        yield prisma_1.prisma.reservation.update({
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
                const whatsappService = reservation.branchId
                    ? new whatsappService_1.WhatsAppService(undefined, reservation.branchId)
                    : new whatsappService_1.WhatsAppService(organizationId);
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
            yield prisma_1.prisma.reservation.update({
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