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
exports.EmailReservationService = void 0;
const client_1 = require("@prisma/client");
const emailReadingService_1 = require("./emailReadingService");
const emailReservationParser_1 = require("./emailReservationParser");
const prisma_1 = require("../utils/prisma");
/**
 * Service für die Erstellung von Reservationen aus Emails
 */
class EmailReservationService {
    /**
     * Erstellt eine Reservation aus einer geparsten Email
     *
     * @param parsedEmail - Geparste Email-Daten
     * @param organizationId - Organisation-ID
     * @param emailMessage - Original Email-Message (für Tracking)
     * @returns Erstellte Reservation
     */
    static createReservationFromEmail(parsedEmail, organizationId, emailMessage) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Prüfe auf Duplikate (via lobbyReservationId)
                const existingReservation = yield prisma_1.prisma.reservation.findUnique({
                    where: { lobbyReservationId: parsedEmail.reservationCode }
                });
                if (existingReservation) {
                    console.log(`[EmailReservation] Reservation ${parsedEmail.reservationCode} existiert bereits (ID: ${existingReservation.id})`);
                    return existingReservation;
                }
                // Hole erste Branch der Organisation als Fallback
                const branch = yield prisma_1.prisma.branch.findFirst({
                    where: { organizationId },
                    orderBy: { id: 'asc' }
                });
                // Erstelle Reservation-Daten
                const reservationData = {
                    lobbyReservationId: parsedEmail.reservationCode,
                    guestName: parsedEmail.guestName.trim(),
                    checkInDate: parsedEmail.checkInDate,
                    checkOutDate: parsedEmail.checkOutDate,
                    status: client_1.ReservationStatus.confirmed,
                    paymentStatus: client_1.PaymentStatus.pending,
                    amount: parsedEmail.amount,
                    currency: parsedEmail.currency || 'COP',
                    organizationId: organizationId,
                    branchId: (branch === null || branch === void 0 ? void 0 : branch.id) || null
                };
                // Setze Kontaktinformationen
                if (parsedEmail.guestEmail) {
                    reservationData.guestEmail = parsedEmail.guestEmail.trim();
                }
                if (parsedEmail.guestPhone) {
                    reservationData.guestPhone = parsedEmail.guestPhone.trim();
                }
                // Erstelle Reservation
                let reservation = yield prisma_1.prisma.reservation.create({
                    data: reservationData,
                    include: {
                        organization: {
                            select: {
                                id: true,
                                name: true,
                                displayName: true,
                                settings: true
                            }
                        }
                    }
                });
                console.log(`[EmailReservation] Reservation ${reservation.id} erstellt aus Email (Code: ${parsedEmail.reservationCode})`);
                // ⚠️ SICHERHEIT: WhatsApp-Versand beim Erstellen aus Emails ist DEAKTIVIERT
                // Um zu verhindern, dass während Tests Nachrichten an echte Empfänger versendet werden
                // Aktivierung nur nach expliziter Freigabe!
                const EMAIL_RESERVATION_WHATSAPP_ENABLED = process.env.EMAIL_RESERVATION_WHATSAPP_ENABLED === 'true';
                if (!EMAIL_RESERVATION_WHATSAPP_ENABLED) {
                    console.log(`[EmailReservation] ⚠️ WhatsApp-Versand ist DEAKTIVIERT (Test-Modus)`);
                    console.log(`[EmailReservation] Um zu aktivieren: Setze EMAIL_RESERVATION_WHATSAPP_ENABLED=true in .env`);
                }
                // Automatisch WhatsApp-Nachricht senden (wenn Telefonnummer vorhanden UND aktiviert)
                if (EMAIL_RESERVATION_WHATSAPP_ENABLED && reservation.guestPhone) {
                    try {
                        // Verwende neue Service-Methode sendReservationInvitation()
                        const { ReservationNotificationService } = yield Promise.resolve().then(() => __importStar(require('./reservationNotificationService')));
                        const result = yield ReservationNotificationService.sendReservationInvitation(reservation.id, {
                            amount: parsedEmail.amount,
                            currency: parsedEmail.currency || 'COP'
                        });
                        if (result.success) {
                            console.log(`[EmailReservation] ✅ WhatsApp-Nachricht erfolgreich versendet für Reservation ${reservation.id}`);
                        }
                        else {
                            console.warn(`[EmailReservation] ⚠️ WhatsApp-Nachricht konnte nicht versendet werden für Reservation ${reservation.id}: ${result.error}`);
                        }
                    }
                    catch (whatsappError) {
                        console.error(`[EmailReservation] ❌ Fehler beim Versenden der WhatsApp-Nachricht:`, whatsappError);
                        // Fehler nicht weiterwerfen, Reservation wurde bereits erstellt
                    }
                }
                else {
                    console.log(`[EmailReservation] Keine Telefonnummer vorhanden, WhatsApp-Nachricht wird nicht versendet`);
                }
                return reservation;
            }
            catch (error) {
                console.error('[EmailReservation] Fehler beim Erstellen der Reservation:', error);
                throw error;
            }
        });
    }
    /**
     * Verarbeitet eine Email und erstellt ggf. eine Reservation
     *
     * @param emailMessage - Email-Nachricht
     * @param organizationId - Organisation-ID
     * @returns Erstellte Reservation oder null
     */
    static processEmail(emailMessage, organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Parse Email (Text bevorzugen, da meist besser strukturiert)
                const parsedEmail = emailReservationParser_1.EmailReservationParser.parseReservationEmail(emailMessage.text || emailMessage.html || '', emailMessage.html);
                if (!parsedEmail) {
                    console.log(`[EmailReservation] Email ${emailMessage.messageId} konnte nicht als Reservation geparst werden`);
                    return null;
                }
                console.log(`[EmailReservation] Email ${emailMessage.messageId} erfolgreich geparst:`, {
                    reservationCode: parsedEmail.reservationCode,
                    guestName: parsedEmail.guestName,
                    checkInDate: parsedEmail.checkInDate,
                    checkOutDate: parsedEmail.checkOutDate,
                    amount: parsedEmail.amount,
                    currency: parsedEmail.currency
                });
                // Erstelle Reservation
                const reservation = yield this.createReservationFromEmail(parsedEmail, organizationId, emailMessage);
                return reservation;
            }
            catch (error) {
                console.error(`[EmailReservation] Fehler beim Verarbeiten der Email ${emailMessage.messageId}:`, error);
                throw error;
            }
        });
    }
    /**
     * Prüft auf neue Reservation-Emails und verarbeitet sie
     *
     * @param organizationId - Organisation-ID
     * @returns Anzahl verarbeiteter Emails
     */
    static checkForNewReservationEmails(organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Lade Email-Konfiguration
                const emailConfig = yield emailReadingService_1.EmailReadingService.loadConfigFromOrganization(organizationId);
                if (!emailConfig) {
                    console.log(`[EmailReservation] Keine Email-Konfiguration für Organisation ${organizationId}`);
                    return 0;
                }
                // Lade Filter aus Organisation-Settings
                const organization = yield prisma_1.prisma.organization.findUnique({
                    where: { id: organizationId },
                    select: { settings: true }
                });
                const orgSettings = organization === null || organization === void 0 ? void 0 : organization.settings;
                const emailReading = orgSettings === null || orgSettings === void 0 ? void 0 : orgSettings.emailReading;
                const filters = (emailReading === null || emailReading === void 0 ? void 0 : emailReading.filters) || {};
                // Verbinde zu Email-Server
                const emailService = new emailReadingService_1.EmailReadingService(emailConfig);
                yield emailService.connect();
                try {
                    // Hole ungelesene Emails
                    const emails = yield emailService.fetchUnreadEmails({
                        from: filters.from,
                        subject: filters.subject
                    });
                    if (emails.length === 0) {
                        console.log(`[EmailReservation] Keine neuen Emails für Organisation ${organizationId}`);
                        return 0;
                    }
                    console.log(`[EmailReservation] ${emails.length} neue Email(s) gefunden für Organisation ${organizationId}`);
                    let processedCount = 0;
                    // Verarbeite jede Email
                    for (const email of emails) {
                        try {
                            const reservation = yield this.processEmail(email, organizationId);
                            if (reservation) {
                                // WICHTIG: Email wird NICHT verschoben oder markiert - nur ausgelesen und in Ruhe gelassen!
                                // Keine markAsRead() oder moveToFolder() Aufrufe mehr!
                                processedCount++;
                                console.log(`[EmailReservation] ✅ Email ${email.messageId} erfolgreich verarbeitet (Reservation ID: ${reservation.id})`);
                            }
                            else {
                                console.log(`[EmailReservation] Email ${email.messageId} konnte nicht als Reservation erkannt werden`);
                            }
                        }
                        catch (error) {
                            console.error(`[EmailReservation] Fehler beim Verarbeiten der Email ${email.messageId}:`, error);
                            // Weiter mit nächster Email
                        }
                    }
                    console.log(`[EmailReservation] ${processedCount} von ${emails.length} Email(s) erfolgreich verarbeitet`);
                    return processedCount;
                }
                finally {
                    // Trenne Verbindung
                    emailService.disconnect();
                }
            }
            catch (error) {
                console.error(`[EmailReservation] Fehler beim Email-Check für Organisation ${organizationId}:`, error);
                throw error;
            }
        });
    }
}
exports.EmailReservationService = EmailReservationService;
//# sourceMappingURL=emailReservationService.js.map