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
exports.ReservationNotificationService = void 0;
const client_1 = require("@prisma/client");
const lobbyPmsService_1 = require("./lobbyPmsService");
const whatsappService_1 = require("./whatsappService");
const boldPaymentService_1 = require("./boldPaymentService");
const ttlockService_1 = require("./ttlockService");
const emailService_1 = require("./emailService");
const checkInLinkUtils_1 = require("../utils/checkInLinkUtils");
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
/**
 * Default-Templates für Mitteilungen (Fallback wenn keine Branch Settings vorhanden)
 */
const DEFAULT_CHECKIN_INVITATION_TEMPLATES = {
    en: {
        whatsappTemplateName: 'reservation_checkin_invitation_en',
        whatsappTemplateParams: ['{{1}}', '{{2}}', '{{3}}'],
        emailSubject: 'Welcome to La Familia Hostel - Online Check-in',
        emailContent: `Hello {{guestName}},

We are pleased to welcome you to La Familia Hostel! 🎊

In case that you arrive after 18:00 or before 09:00, our recepcion 🛎️ will be closed.

We would then kindly ask you to complete check-in & payment online in advance:

Check-In:
{{checkInLink}}

Please make the payment in advance:
{{paymentLink}}

Please write us briefly once you have completed both the check-in and the payment, so we can send you your pin code 🔑 for the entrance door.

Thank you!

We look forward to seeing you soon!`
    },
    es: {
        whatsappTemplateName: 'reservation_checkin_invitation',
        whatsappTemplateParams: ['{{1}}', '{{2}}', '{{3}}'],
        emailSubject: 'Bienvenido a La Familia Hostel - Check-in en línea',
        emailContent: `Hola {{guestName}},

¡Nos complace darte la bienvenida a La Familia Hostel! 🎊

En caso de que llegues después de las 18:00 o antes de las 09:00, nuestra recepción 🛎️ estará cerrada.

Te pedimos amablemente que completes el check-in y el pago en línea con anticipación:

Check-In:
{{checkInLink}}

Por favor, realiza el pago por adelantado:
{{paymentLink}}

Por favor, escríbenos brevemente una vez que hayas completado tanto el check-in como el pago, para que podamos enviarte tu código PIN 🔑 para la puerta de entrada.

¡Gracias!

¡Esperamos verte pronto!`
    },
    de: {
        whatsappTemplateName: 'reservation_checkin_invitation_de',
        whatsappTemplateParams: ['{{1}}', '{{2}}', '{{3}}'],
        emailSubject: 'Willkommen im La Familia Hostel - Online Check-in',
        emailContent: `Hallo {{guestName}},

wir freuen uns, Sie im La Familia Hostel willkommen zu heißen! 🎊

Falls Sie nach 18:00 Uhr oder vor 09:00 Uhr ankommen, ist unsere Rezeption 🛎️ geschlossen.

Wir bitten Sie freundlich, den Check-in und die Zahlung im Voraus online abzuschließen:

Check-In:
{{checkInLink}}

Bitte zahlen Sie im Voraus:
{{paymentLink}}

Bitte schreiben Sie uns kurz, sobald Sie sowohl den Check-in als auch die Zahlung abgeschlossen haben, damit wir Ihnen Ihren PIN-Code 🔑 für die Eingangstür senden können.

Vielen Dank!

Wir freuen uns darauf, Sie bald zu sehen!`
    }
};
const DEFAULT_CHECKIN_CONFIRMATION_TEMPLATES = {
    en: {
        whatsappTemplateName: 'reservation_checkin_completed_en',
        whatsappTemplateParams: ['{{1}}', '{{2}}'],
        emailSubject: 'Your check-in is completed - Room information',
        emailContent: `Hello {{guestName}},

Your check-in has been completed successfully!

Your room information:
- Room: {{roomDisplay}}
{{roomDescription}}

Access:
- Door PIN: {{doorPin}}

We wish you a pleasant stay!`
    },
    es: {
        whatsappTemplateName: 'reservation_checkin_completed',
        whatsappTemplateParams: ['{{1}}', '{{2}}'],
        emailSubject: 'Tu check-in está completado - Información de habitación',
        emailContent: `Hola {{guestName}},

¡Tu check-in se ha completado exitosamente!

Información de tu habitación:
- Habitación: {{roomDisplay}}
{{roomDescription}}

Acceso:
- PIN de la puerta: {{doorPin}}

¡Te deseamos una estancia agradable!`
    },
    de: {
        whatsappTemplateName: 'reservation_checkin_completed_de',
        whatsappTemplateParams: ['{{1}}', '{{2}}'],
        emailSubject: 'Ihr Check-in ist abgeschlossen - Zimmerinformationen',
        emailContent: `Hallo {{guestName}},

Ihr Check-in wurde erfolgreich abgeschlossen!

Ihre Zimmerinformationen:
- Zimmer: {{roomDisplay}}
{{roomDescription}}

Zugang:
- Tür-PIN: {{doorPin}}

Wir wünschen Ihnen einen angenehmen Aufenthalt!`
    }
};
/**
 * Service für automatische Benachrichtigungen zu Reservierungen
 *
 * Orchestriert E-Mail/WhatsApp-Versand, Zahlungslinks und Türsystem-PINs
 */
class ReservationNotificationService {
    /**
     * Lädt Message Template aus Branch Settings (mit Fallback auf Defaults)
     *
     * @param branchId - Branch ID (optional)
     * @param organizationId - Organization ID
     * @param templateType - Typ des Templates ('checkInInvitation' | 'checkInConfirmation')
     * @param language - Sprache ('en' | 'es' | 'de')
     * @returns Template oder null
     */
    static getMessageTemplate(branchId, organizationId, templateType, language) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // 1. Versuche Branch Settings zu laden (falls branchId vorhanden)
                if (branchId) {
                    const branch = yield prisma_1.prisma.branch.findUnique({
                        where: { id: branchId },
                        select: { messageTemplates: true }
                    });
                    if (branch === null || branch === void 0 ? void 0 : branch.messageTemplates) {
                        const { decryptBranchApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                        try {
                            const decryptedTemplates = decryptBranchApiSettings(branch.messageTemplates);
                            const templates = decryptedTemplates;
                            if ((_a = templates === null || templates === void 0 ? void 0 : templates[templateType]) === null || _a === void 0 ? void 0 : _a[language]) {
                                return templates[templateType][language];
                            }
                        }
                        catch (error) {
                            logger_1.logger.warn(`[ReservationNotification] Fehler beim Entschlüsseln der Message Templates für Branch ${branchId}:`, error);
                        }
                    }
                }
                // 2. Fallback auf Organization Settings (falls vorhanden)
                const organization = yield prisma_1.prisma.organization.findUnique({
                    where: { id: organizationId },
                    select: { settings: true }
                });
                if (organization === null || organization === void 0 ? void 0 : organization.settings) {
                    const { decryptApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                    try {
                        const decryptedSettings = decryptApiSettings(organization.settings);
                        const templates = decryptedSettings === null || decryptedSettings === void 0 ? void 0 : decryptedSettings.messageTemplates;
                        if ((_b = templates === null || templates === void 0 ? void 0 : templates[templateType]) === null || _b === void 0 ? void 0 : _b[language]) {
                            return templates[templateType][language];
                        }
                    }
                    catch (error) {
                        logger_1.logger.warn(`[ReservationNotification] Fehler beim Entschlüsseln der Message Templates für Organization ${organizationId}:`, error);
                    }
                }
                // 3. Fallback auf Hardcoded Defaults
                if (templateType === 'checkInInvitation') {
                    return DEFAULT_CHECKIN_INVITATION_TEMPLATES[language];
                }
                else {
                    return DEFAULT_CHECKIN_CONFIRMATION_TEMPLATES[language];
                }
            }
            catch (error) {
                logger_1.logger.error(`[ReservationNotification] Fehler beim Laden des Message Templates:`, error);
                // Fallback auf Defaults bei Fehler
                if (templateType === 'checkInInvitation') {
                    return DEFAULT_CHECKIN_INVITATION_TEMPLATES[language];
                }
                else {
                    return DEFAULT_CHECKIN_CONFIRMATION_TEMPLATES[language];
                }
            }
        });
    }
    /**
     * Ersetzt Variablen in Template-Text
     *
     * @param templateText - Template-Text mit Variablen (z.B. "Hello {{guestName}}")
     * @param variables - Objekt mit Variablen-Werten
     * @returns Text mit ersetzten Variablen
     */
    static replaceTemplateVariables(templateText, variables) {
        let result = templateText;
        for (const [key, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        }
        return result;
    }
    /**
     * Lädt roomDescription aus Branch-Settings (falls categoryId vorhanden)
     *
     * @param reservation - Reservation mit optionalem categoryId
     * @param languageCode - Sprache für Labels ('en' | 'es' | 'de')
     * @returns Formatierte roomDescription oder Fallback auf reservation.roomDescription
     */
    static loadRoomDescriptionFromBranchSettings(reservation, languageCode) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Fallback auf reservation.roomDescription
            let roomDescription = reservation.roomDescription || 'N/A';
            // Prüfe ob categoryId und branchId vorhanden
            const categoryId = reservation.categoryId;
            if (categoryId == null || !reservation.branchId) {
                return roomDescription;
            }
            try {
                // Lade Branch mit nur lobbyPmsSettings (Performance: nur benötigtes Feld)
                const branch = yield prisma_1.prisma.branch.findUnique({
                    where: { id: reservation.branchId },
                    select: { lobbyPmsSettings: true }
                });
                if (branch === null || branch === void 0 ? void 0 : branch.lobbyPmsSettings) {
                    const { decryptBranchApiSettings } = require('../utils/encryption');
                    const decryptedSettings = decryptBranchApiSettings(branch.lobbyPmsSettings);
                    const lobbyPmsSettings = (decryptedSettings === null || decryptedSettings === void 0 ? void 0 : decryptedSettings.lobbyPms) || decryptedSettings;
                    const roomDesc = (_a = lobbyPmsSettings === null || lobbyPmsSettings === void 0 ? void 0 : lobbyPmsSettings.roomDescriptions) === null || _a === void 0 ? void 0 : _a[categoryId];
                    if (roomDesc) {
                        // Übersetzungen für Bild/Video Labels
                        const imageLabel = languageCode === 'en' ? 'Image' : languageCode === 'es' ? 'Imagen' : 'Bild';
                        const videoLabel = languageCode === 'en' ? 'Video' : languageCode === 'es' ? 'Video' : 'Video';
                        // Formatiere Beschreibung: Text + Bild-Link + Video-Link
                        const parts = [];
                        if (roomDesc.text) {
                            parts.push(roomDesc.text);
                        }
                        if (roomDesc.imageUrl) {
                            parts.push(`${imageLabel}: ${roomDesc.imageUrl}`);
                        }
                        if (roomDesc.videoUrl) {
                            parts.push(`${videoLabel}: ${roomDesc.videoUrl}`);
                        }
                        roomDescription = parts.length > 0 ? parts.join('\n') : reservation.roomDescription || 'N/A';
                    }
                }
            }
            catch (error) {
                logger_1.logger.warn(`[ReservationNotification] Fehler beim Laden der Zimmer-Beschreibung aus Branch-Settings:`, error);
                // Fallback auf reservation.roomDescription
                roomDescription = reservation.roomDescription || 'N/A';
            }
            return roomDescription;
        });
    }
    /**
     * Loggt eine Notification in die Datenbank
     *
     * @param reservationId - ID der Reservierung
     * @param notificationType - Typ der Notification ('invitation', 'pin', 'checkin_confirmation')
     * @param channel - Kanal ('whatsapp', 'email', 'both')
     * @param success - Erfolg (true/false)
     * @param data - Zusätzliche Daten (sentTo, message, paymentLink, checkInLink, errorMessage)
     */
    static logNotification(reservationId, notificationType, channel, success, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma_1.prisma.reservationNotificationLog.create({
                    data: {
                        reservationId,
                        notificationType,
                        channel,
                        success,
                        sentAt: new Date(),
                        sentTo: (data === null || data === void 0 ? void 0 : data.sentTo) || null,
                        message: (data === null || data === void 0 ? void 0 : data.message) || null,
                        paymentLink: (data === null || data === void 0 ? void 0 : data.paymentLink) || null,
                        checkInLink: (data === null || data === void 0 ? void 0 : data.checkInLink) || null,
                        errorMessage: (data === null || data === void 0 ? void 0 : data.errorMessage) || null
                    }
                });
                logger_1.logger.log(`[ReservationNotification] ✅ Log-Eintrag erstellt für Reservation ${reservationId}, Type: ${notificationType}, Success: ${success}`);
            }
            catch (error) {
                // Log-Fehler sollten nicht die Hauptfunktionalität beeinträchtigen
                logger_1.logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags:`, error);
            }
        });
    }
    /**
     * Sendet Check-in-Einladungen an Gäste mit späten Ankünften
     *
     * Wird täglich um 20:00 Uhr ausgeführt
     * Sendet an Gäste mit Ankunft am nächsten Tag nach 18:00 Uhr
     */
    static sendLateCheckInInvitations() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.log('[ReservationNotification] Starte Versand von Check-in-Einladungen...');
            try {
                // Hole alle Organisationen mit aktivierter LobbyPMS-Synchronisation
                const organizations = yield prisma_1.prisma.organization.findMany({
                    where: {
                        settings: {
                            path: ['lobbyPms', 'syncEnabled'],
                            equals: true
                        }
                    }
                });
                for (const organization of organizations) {
                    try {
                        const settings = organization.settings;
                        const lobbyPmsSettings = settings === null || settings === void 0 ? void 0 : settings.lobbyPms;
                        if (!(lobbyPmsSettings === null || lobbyPmsSettings === void 0 ? void 0 : lobbyPmsSettings.syncEnabled)) {
                            continue;
                        }
                        const lateCheckInThreshold = lobbyPmsSettings.lateCheckInThreshold || '18:00';
                        const notificationChannels = lobbyPmsSettings.notificationChannels || ['email'];
                        logger_1.logger.log(`[ReservationNotification] Verarbeite Organisation ${organization.id}...`);
                        // Hole Reservierungen für morgen mit Ankunft nach Threshold
                        // WICHTIG: Iteriere über alle Branches, da fetchTomorrowReservations branch-spezifisch ist
                        const branches = yield prisma_1.prisma.branch.findMany({
                            where: { organizationId: organization.id },
                            select: { id: true, lobbyPmsSettings: true }
                        });
                        let totalReservations = 0;
                        for (const branch of branches) {
                            try {
                                // Prüfe ob Branch LobbyPMS aktiviert hat
                                if (!branch.lobbyPmsSettings)
                                    continue;
                                const { decryptBranchApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                                const settings = decryptBranchApiSettings(branch.lobbyPmsSettings);
                                const lobbyPmsSettings = (settings === null || settings === void 0 ? void 0 : settings.lobbyPms) || settings;
                                if (!(lobbyPmsSettings === null || lobbyPmsSettings === void 0 ? void 0 : lobbyPmsSettings.apiKey) || !(lobbyPmsSettings === null || lobbyPmsSettings === void 0 ? void 0 : lobbyPmsSettings.syncEnabled))
                                    continue;
                                // Erstelle Service für Branch
                                const lobbyPmsService = yield lobbyPmsService_1.LobbyPmsService.createForBranch(branch.id);
                                const tomorrowReservations = yield lobbyPmsService.fetchTomorrowReservations(lateCheckInThreshold);
                                totalReservations += tomorrowReservations.length;
                                for (const lobbyReservation of tomorrowReservations) {
                                    try {
                                        // Synchronisiere Reservierung in lokale DB
                                        // (Task wird automatisch in syncReservation erstellt)
                                        const reservation = yield lobbyPmsService.syncReservation(lobbyReservation);
                                        // Prüfe ob bereits Einladung versendet wurde
                                        if (reservation.invitationSentAt) {
                                            logger_1.logger.log(`[ReservationNotification] Einladung bereits versendet für Reservierung ${reservation.id}`);
                                            continue;
                                        }
                                        // Erstelle Zahlungslink
                                        const boldPaymentService = reservation.branchId
                                            ? yield boldPaymentService_1.BoldPaymentService.createForBranch(reservation.branchId)
                                            : new boldPaymentService_1.BoldPaymentService(organization.id);
                                        // TODO: Hole tatsächlichen Betrag aus LobbyPMS
                                        const amount = 100000; // Placeholder: 100.000 COP
                                        const paymentLink = yield boldPaymentService.createPaymentLink(reservation, amount, 'COP', `Zahlung für Reservierung ${reservation.guestName}`);
                                        // Erstelle LobbyPMS Check-in-Link
                                        const checkInLink = (0, checkInLinkUtils_1.generateLobbyPmsCheckInLink)(reservation);
                                        // Versende Benachrichtigungen
                                        if (notificationChannels.includes('email') && reservation.guestEmail) {
                                            yield this.sendCheckInInvitationEmail(reservation, checkInLink, paymentLink);
                                        }
                                        if (notificationChannels.includes('whatsapp') && reservation.guestPhone) {
                                            const whatsappService = reservation.branchId
                                                ? new whatsappService_1.WhatsAppService(undefined, reservation.branchId)
                                                : new whatsappService_1.WhatsAppService(organization.id);
                                            yield whatsappService.sendCheckInInvitation(reservation.guestName, reservation.guestPhone, checkInLink, paymentLink);
                                        }
                                        // Markiere als versendet
                                        yield prisma_1.prisma.reservation.update({
                                            where: { id: reservation.id },
                                            data: { invitationSentAt: new Date() }
                                        });
                                        logger_1.logger.log(`[ReservationNotification] Einladung versendet für Reservierung ${reservation.id}`);
                                    }
                                    catch (error) {
                                        logger_1.logger.error(`[ReservationNotification] Fehler bei Reservierung ${lobbyReservation.id}:`, error);
                                        // Weiter mit nächster Reservierung
                                    }
                                }
                            }
                            catch (error) {
                                logger_1.logger.error(`[ReservationNotification] Fehler bei Branch ${branch.id}:`, error);
                                // Weiter mit nächstem Branch
                            }
                        }
                        logger_1.logger.log(`[ReservationNotification] Organisation ${organization.id}: ${totalReservations} Reservierungen verarbeitet`);
                    }
                    catch (error) {
                        logger_1.logger.error(`[ReservationNotification] Fehler bei Organisation ${organization.id}:`, error);
                        // Weiter mit nächster Organisation
                    }
                }
                logger_1.logger.log('[ReservationNotification] Versand abgeschlossen');
            }
            catch (error) {
                logger_1.logger.error('[ReservationNotification] Fehler beim Versand:', error);
                throw error;
            }
        });
    }
    /**
     * Sendet Reservation-Einladung (Payment-Link + Check-in-Link + WhatsApp)
     *
     * @param reservationId - ID der Reservierung
     * @param options - Optionale Parameter (Kontaktinfo, Nachricht, Betrag)
     * @returns Ergebnis mit Details über Erfolg/Fehler
     */
    static sendReservationInvitation(reservationId, options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // Lade Reservation mit Organization
                const reservation = yield prisma_1.prisma.reservation.findUnique({
                    where: { id: reservationId },
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
                if (!reservation) {
                    throw new Error(`Reservierung ${reservationId} nicht gefunden`);
                }
                // Verwende optionale Kontaktinfo oder Reservation-Daten
                const guestPhone = (options === null || options === void 0 ? void 0 : options.guestPhone) || reservation.guestPhone;
                const guestEmail = (options === null || options === void 0 ? void 0 : options.guestEmail) || reservation.guestEmail;
                const amount = (options === null || options === void 0 ? void 0 : options.amount) || reservation.amount || 0;
                const currency = (options === null || options === void 0 ? void 0 : options.currency) || reservation.currency || 'COP';
                // Prüfe ob Kontaktinfo vorhanden ist
                if (!guestPhone && !guestEmail) {
                    throw new Error('Keine Kontaktinformation (Telefonnummer oder E-Mail) vorhanden');
                }
                let paymentLink = null;
                let checkInLink = null;
                let sentMessage = null;
                let sentMessageAt = null;
                let success = false;
                let errorMessage = null;
                let whatsappSuccess = false;
                let emailSuccess = false;
                // Schritt 1: Payment-Link IMMER erstellen (wenn Telefonnummer ODER Email vorhanden)
                if (guestPhone || guestEmail) {
                    // Verwende bestehenden Payment-Link, falls vorhanden
                    if (reservation.paymentLink) {
                        paymentLink = reservation.paymentLink;
                        logger_1.logger.log(`[ReservationNotification] ✅ Verwende bestehenden Payment-Link: ${paymentLink}`);
                    }
                    else {
                        // Erstelle neuen Payment-Link nur wenn keiner existiert
                        try {
                            logger_1.logger.log(`[ReservationNotification] Erstelle Payment-Link für Reservierung ${reservationId}...`);
                            const boldPaymentService = reservation.branchId
                                ? yield boldPaymentService_1.BoldPaymentService.createForBranch(reservation.branchId)
                                : new boldPaymentService_1.BoldPaymentService(reservation.organizationId);
                            // Konvertiere amount zu number (falls Decimal)
                            const amountNumber = typeof amount === 'number' ? amount : Number(amount);
                            paymentLink = yield boldPaymentService.createPaymentLink(reservation, amountNumber, currency, `Zahlung für Reservierung ${reservation.guestName}`);
                            logger_1.logger.log(`[ReservationNotification] ✅ Payment-Link erstellt: ${paymentLink}`);
                        }
                        catch (error) {
                            logger_1.logger.error(`[ReservationNotification] ❌ Fehler beim Erstellen des Payment-Links:`, error);
                            errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim Erstellen des Payment-Links';
                            // Payment-Link-Fehler: Log erstellen, aber nicht abbrechen
                            // Wir versuchen trotzdem weiterzumachen (z.B. für E-Mail-Versand)
                            try {
                                yield this.logNotification(reservationId, 'invitation', (guestPhone && guestEmail) ? 'both' : (guestPhone ? 'whatsapp' : (guestEmail ? 'email' : 'both')), false, {
                                    sentTo: guestPhone || guestEmail || undefined,
                                    errorMessage: `Payment-Link konnte nicht erstellt werden: ${errorMessage}`
                                });
                            }
                            catch (logError) {
                                logger_1.logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für Payment-Link-Fehler:`, logError);
                            }
                            // Payment-Link-Fehler ist kritisch - ohne Payment-Link können wir keine Notifications versenden
                            throw new Error(`Payment-Link konnte nicht erstellt werden: ${errorMessage}`);
                        }
                    }
                }
                // Schritt 2: Check-in-Link erstellen
                try {
                    // WICHTIG: Check-in-Link IMMER mit der ursprünglich importierten E-Mail generieren
                    // (reservation.guestEmail), nicht mit der geänderten E-Mail aus options
                    // Der Check-in-Link muss immer die Original-E-Mail verwenden, die beim Import verwendet wurde
                    // WICHTIG: Verwende lobbyReservationId (LobbyPMS booking_id) als codigo, nicht die interne ID
                    const reservationForCheckInLink = {
                        id: reservation.id,
                        lobbyReservationId: reservation.lobbyReservationId,
                        guestEmail: reservation.guestEmail || ''
                    };
                    checkInLink = (0, checkInLinkUtils_1.generateLobbyPmsCheckInLink)(reservationForCheckInLink) ||
                        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/check-in/${reservation.id}`;
                    logger_1.logger.log(`[ReservationNotification] ✅ Check-in-Link erstellt (mit Original-E-Mail): ${checkInLink}`);
                }
                catch (error) {
                    logger_1.logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Check-in-Links:`, error);
                    // Check-in-Link-Fehler ist nicht kritisch - verwende Fallback
                    checkInLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/check-in/${reservation.id}`;
                }
                // Schritt 3: WhatsApp-Nachricht senden (wenn Telefonnummer vorhanden)
                if (guestPhone && paymentLink) {
                    try {
                        logger_1.logger.log(`[ReservationNotification] Sende WhatsApp-Nachricht für Reservierung ${reservationId}...`);
                        // Verwende Custom Message oder Standard-Nachricht
                        if (options === null || options === void 0 ? void 0 : options.customMessage) {
                            sentMessage = options.customMessage;
                            // Ersetze Variablen in Custom Message
                            sentMessage = sentMessage
                                .replace(/\{\{guestName\}\}/g, reservation.guestName)
                                .replace(/\{\{checkInLink\}\}/g, checkInLink)
                                .replace(/\{\{paymentLink\}\}/g, paymentLink);
                        }
                        else {
                            // NEU: Lade Template aus Branch Settings (mit Fallback auf Defaults)
                            const { CountryLanguageService } = require('./countryLanguageService');
                            const languageCode = CountryLanguageService.getLanguageForReservation({
                                guestNationality: reservation.guestNationality,
                                guestPhone: reservation.guestPhone
                            });
                            const template = yield this.getMessageTemplate(reservation.branchId, reservation.organizationId, 'checkInInvitation', languageCode);
                            if (template) {
                                // Ersetze Variablen im Template
                                sentMessage = this.replaceTemplateVariables(template.emailContent, {
                                    guestName: reservation.guestName,
                                    checkInLink: checkInLink,
                                    paymentLink: paymentLink
                                });
                            }
                            else {
                                // Fallback auf alte hardcodierte Nachricht (sollte nicht passieren)
                                logger_1.logger.warn(`[ReservationNotification] Kein Template gefunden, verwende Fallback`);
                                if (languageCode === 'en') {
                                    sentMessage = `Hello ${reservation.guestName},

We are pleased to welcome you to La Familia Hostel!

As you will arrive after 18:00, you can complete the online check-in now:
${checkInLink}

Please make the payment in advance:
${paymentLink}

Please write us briefly once you have completed both the check-in and payment. Thank you!

We look forward to seeing you tomorrow!`;
                                }
                                else {
                                    sentMessage = `Hola ${reservation.guestName},

¡Nos complace darte la bienvenida a La Familia Hostel!

Como llegarás después de las 18:00, puedes realizar el check-in en línea ahora:
${checkInLink}

Por favor, realiza el pago por adelantado:
${paymentLink}

Por favor, escríbenos brevemente una vez que hayas completado tanto el check-in como el pago. ¡Gracias!

¡Te esperamos mañana!`;
                                }
                            }
                        }
                        const whatsappService = reservation.branchId
                            ? new whatsappService_1.WhatsAppService(undefined, reservation.branchId)
                            : new whatsappService_1.WhatsAppService(reservation.organizationId);
                        // WICHTIG: Versuche zuerst Session Message (24h-Fenster), bei Fehler: Template Message
                        // Grund: Session Messages sind günstiger, Template Messages funktionieren immer
                        // NEU: Lade Template-Name und Parameter aus Branch Settings
                        const { CountryLanguageService: CLS2 } = require('./countryLanguageService');
                        const whatsappLanguageCode = CLS2.getLanguageForReservation({
                            guestNationality: reservation.guestNationality,
                            guestPhone: reservation.guestPhone
                        });
                        const whatsappTemplate = yield this.getMessageTemplate(reservation.branchId, reservation.organizationId, 'checkInInvitation', whatsappLanguageCode);
                        // Basis-Template-Name aus Settings (mit Fallback)
                        const baseTemplateName = (whatsappTemplate === null || whatsappTemplate === void 0 ? void 0 : whatsappTemplate.whatsappTemplateName) ||
                            process.env.WHATSAPP_TEMPLATE_CHECKIN_INVITATION ||
                            'reservation_checkin_invitation';
                        // Template-Parameter aus Settings (mit Fallback)
                        // WICHTIG: Template-Parameter müssen die tatsächlichen Werte enthalten, nicht die Platzhalter
                        const templateParams = ((_a = whatsappTemplate === null || whatsappTemplate === void 0 ? void 0 : whatsappTemplate.whatsappTemplateParams) === null || _a === void 0 ? void 0 : _a.length) > 0
                            ? whatsappTemplate.whatsappTemplateParams.map((param) => {
                                // Ersetze Variablen-Platzhalter in Template-Parametern durch tatsächliche Werte
                                return param
                                    .replace(/\{\{1\}\}/g, reservation.guestName)
                                    .replace(/\{\{2\}\}/g, checkInLink)
                                    .replace(/\{\{3\}\}/g, paymentLink)
                                    .replace(/\{\{guestName\}\}/g, reservation.guestName)
                                    .replace(/\{\{checkInLink\}\}/g, checkInLink)
                                    .replace(/\{\{paymentLink\}\}/g, paymentLink);
                            })
                            : [
                                reservation.guestName,
                                checkInLink,
                                paymentLink
                            ];
                        logger_1.logger.log(`[ReservationNotification] Versuche Session Message (24h-Fenster), bei Fehler: Template Message`);
                        logger_1.logger.log(`[ReservationNotification] Template Name (Basis): ${baseTemplateName}`);
                        logger_1.logger.log(`[ReservationNotification] Template Params: ${JSON.stringify(templateParams)}`);
                        // Versuche zuerst Session Message (wenn 24h-Fenster aktiv), bei Fehler: Template Message
                        const whatsappSuccessResult = yield whatsappService.sendMessageWithFallback(guestPhone, sentMessage, // Wird jetzt verwendet (Session Message oder Fallback)
                        baseTemplateName, templateParams, {
                            guestNationality: reservation.guestNationality,
                            guestPhone: reservation.guestPhone
                        });
                        if (!whatsappSuccessResult) {
                            throw new Error('WhatsApp-Nachricht konnte nicht versendet werden');
                        }
                        sentMessageAt = new Date();
                        whatsappSuccess = whatsappSuccessResult;
                        logger_1.logger.log(`[ReservationNotification] ✅ WhatsApp-Nachricht erfolgreich versendet`);
                        // Log erfolgreiche WhatsApp-Notification
                        try {
                            yield this.logNotification(reservationId, 'invitation', 'whatsapp', true, {
                                sentTo: guestPhone,
                                message: sentMessage,
                                paymentLink: paymentLink,
                                checkInLink: checkInLink
                            });
                        }
                        catch (logError) {
                            logger_1.logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche Notification:`, logError);
                            // Log-Fehler sollte nicht die Hauptfunktionalität beeinträchtigen
                        }
                    }
                    catch (error) {
                        logger_1.logger.error(`[ReservationNotification] ❌ Fehler beim Versenden der WhatsApp-Nachricht:`, error);
                        errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim Versenden der WhatsApp-Nachricht';
                        // WhatsApp-Fehler ist nicht kritisch - Links wurden bereits erstellt
                        // Wir speichern die Links trotzdem, aber Status bleibt auf 'confirmed'
                        // Log fehlgeschlagene Notification - IMMER versuchen, auch bei Fehlern
                        try {
                            yield this.logNotification(reservationId, 'invitation', 'whatsapp', false, {
                                sentTo: guestPhone,
                                message: sentMessage || undefined,
                                paymentLink: paymentLink || undefined,
                                checkInLink: checkInLink || undefined,
                                errorMessage: errorMessage
                            });
                        }
                        catch (logError) {
                            logger_1.logger.error(`[ReservationNotification] ⚠️ KRITISCH: Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene Notification:`, logError);
                            // Selbst wenn das Log fehlschlägt, sollten wir weitermachen
                        }
                    }
                }
                else if (guestPhone && !paymentLink) {
                    // Telefonnummer vorhanden, aber Payment-Link fehlt - Log erstellen
                    try {
                        yield this.logNotification(reservationId, 'invitation', 'whatsapp', false, {
                            sentTo: guestPhone,
                            errorMessage: 'Payment-Link fehlt - WhatsApp-Nachricht konnte nicht versendet werden'
                        });
                    }
                    catch (logError) {
                        logger_1.logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags (kein Payment-Link):`, logError);
                    }
                }
                // Schritt 3b: Email senden (wenn Email-Adresse vorhanden)
                if (guestEmail && checkInLink && paymentLink) {
                    let emailMessage = '';
                    try {
                        logger_1.logger.log(`[ReservationNotification] Sende Email für Reservierung ${reservationId}...`);
                        // Verwende Custom Message oder Standard-Nachricht (gleicher Text wie WhatsApp)
                        if (options === null || options === void 0 ? void 0 : options.customMessage) {
                            emailMessage = options.customMessage;
                            // Ersetze Variablen in Custom Message
                            emailMessage = emailMessage
                                .replace(/\{\{guestName\}\}/g, reservation.guestName)
                                .replace(/\{\{checkInLink\}\}/g, checkInLink)
                                .replace(/\{\{paymentLink\}\}/g, paymentLink);
                            // Setze auch sentMessage für Reservation-Update
                            sentMessage = emailMessage;
                        }
                        else {
                            // NEU: Lade Template aus Branch Settings (mit Fallback auf Defaults)
                            const { CountryLanguageService } = require('./countryLanguageService');
                            const languageCode = CountryLanguageService.getLanguageForReservation({
                                guestNationality: reservation.guestNationality,
                                guestPhone: reservation.guestPhone
                            });
                            const template = yield this.getMessageTemplate(reservation.branchId, reservation.organizationId, 'checkInInvitation', languageCode);
                            if (template) {
                                // Ersetze Variablen im Template
                                emailMessage = this.replaceTemplateVariables(template.emailContent, {
                                    guestName: reservation.guestName,
                                    checkInLink: checkInLink,
                                    paymentLink: paymentLink
                                });
                            }
                            else {
                                // Fallback auf alte hardcodierte Nachricht (sollte nicht passieren)
                                logger_1.logger.warn(`[ReservationNotification] Kein Template gefunden für Email, verwende Fallback`);
                                if (languageCode === 'en') {
                                    emailMessage = `Hello ${reservation.guestName},

We are pleased to welcome you to La Familia Hostel!

As you will arrive after 18:00, you can complete the online check-in now:
${checkInLink}

Please make the payment in advance:
${paymentLink}

Please write us briefly once you have completed both the check-in and payment. Thank you!

We look forward to seeing you tomorrow!`;
                                }
                                else {
                                    emailMessage = `Hola ${reservation.guestName},

¡Nos complace darte la bienvenida a La Familia Hostel!

Como llegarás después de las 18:00, puedes realizar el check-in en línea ahora:
${checkInLink}

Por favor, realiza el pago por adelantado:
${paymentLink}

Por favor, escríbenos brevemente una vez que hayas completado tanto el check-in como el pago. ¡Gracias!

¡Te esperamos mañana!`;
                                }
                            }
                            // Setze auch sentMessage für Reservation-Update
                            sentMessage = emailMessage;
                        }
                        // Konvertiere Plain-Text zu HTML (ähnlich wie sendCheckInInvitationEmail)
                        // Lade Logo + Branding (nutzt gespeichertes Branding, keine API-Calls)
                        const { logo, branding } = yield (0, emailService_1.getOrganizationBranding)(reservation.organizationId, reservation.branchId || undefined);
                        // Lade Organisationsname für Header
                        let organizationName = 'La Familia Hostel';
                        if (reservation.organizationId) {
                            const organization = yield prisma_1.prisma.organization.findUnique({
                                where: { id: reservation.organizationId },
                                select: { displayName: true, name: true }
                            });
                            if (organization === null || organization === void 0 ? void 0 : organization.displayName) {
                                organizationName = organization.displayName;
                            }
                            else if (organization === null || organization === void 0 ? void 0 : organization.name) {
                                organizationName = organization.name;
                            }
                        }
                        // NEU: Lade Email-Sprache vor Link-Labels
                        const { CountryLanguageService: CLS } = require('./countryLanguageService');
                        const emailLanguageCode = CLS.getLanguageForReservation({
                            guestNationality: reservation.guestNationality,
                            guestPhone: reservation.guestPhone
                        });
                        // Ersetze Links im Text durch formattierte Linktexte
                        const buttonColor = ((_b = branding === null || branding === void 0 ? void 0 : branding.colors) === null || _b === void 0 ? void 0 : _b.primary) || '#007bff';
                        const checkInLabel = emailLanguageCode === 'en' ? 'Online Check-in' :
                            emailLanguageCode === 'es' ? 'Check-in en línea' :
                                'Online Check-in';
                        const paymentLabel = emailLanguageCode === 'en' ? 'Make Payment' :
                            emailLanguageCode === 'es' ? 'Realizar pago' :
                                'Zahlung durchführen';
                        let emailHtmlContent = emailMessage
                            .replace(/\n/g, '<br>')
                            .replace(new RegExp(checkInLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `<a href="${checkInLink}" style="color: ${buttonColor}; text-decoration: none; font-weight: 600;">${checkInLabel}</a>`)
                            .replace(new RegExp(paymentLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `<a href="${paymentLink}" style="color: ${buttonColor}; text-decoration: none; font-weight: 600;">${paymentLabel}</a>`);
                        const emailTemplate = yield this.getMessageTemplate(reservation.branchId, reservation.organizationId, 'checkInInvitation', emailLanguageCode);
                        const emailSubject = (emailTemplate === null || emailTemplate === void 0 ? void 0 : emailTemplate.emailSubject) || 'Tu reserva ha sido confirmada - La Familia Hostel';
                        // Generiere E-Mail mit Template
                        const emailHtml = (0, emailService_1.generateEmailTemplate)({
                            logo,
                            branding,
                            headerTitle: organizationName,
                            content: emailHtmlContent,
                            language: emailLanguageCode
                        });
                        // Versende Email
                        const emailSent = yield (0, emailService_1.sendEmail)(guestEmail, emailSubject, emailHtml, emailMessage, reservation.organizationId, reservation.branchId || undefined);
                        if (emailSent) {
                            emailSuccess = true;
                            logger_1.logger.log(`[ReservationNotification] ✅ Email erfolgreich versendet`);
                            // Setze sentMessageAt auch bei Email-Versand
                            if (!sentMessageAt) {
                                sentMessageAt = new Date();
                            }
                            // Log erfolgreiche Email-Notification
                            try {
                                yield this.logNotification(reservationId, 'invitation', 'email', true, {
                                    sentTo: guestEmail,
                                    message: emailMessage,
                                    paymentLink: paymentLink,
                                    checkInLink: checkInLink
                                });
                            }
                            catch (logError) {
                                logger_1.logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche Email-Notification:`, logError);
                            }
                        }
                        else {
                            throw new Error('Email konnte nicht versendet werden');
                        }
                    }
                    catch (error) {
                        logger_1.logger.error(`[ReservationNotification] ❌ Fehler beim Versenden der Email:`, error);
                        const emailErrorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler beim Versenden der Email';
                        // Log fehlgeschlagene Email-Notification
                        try {
                            yield this.logNotification(reservationId, 'invitation', 'email', false, {
                                sentTo: guestEmail,
                                message: emailMessage || undefined,
                                paymentLink: paymentLink || undefined,
                                checkInLink: checkInLink || undefined,
                                errorMessage: emailErrorMsg
                            });
                        }
                        catch (logError) {
                            logger_1.logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene Email-Notification:`, logError);
                        }
                    }
                }
                else if (guestEmail && (!checkInLink || !paymentLink)) {
                    // Email vorhanden, aber Links fehlen - Log erstellen
                    try {
                        yield this.logNotification(reservationId, 'invitation', 'email', false, {
                            sentTo: guestEmail,
                            errorMessage: 'Check-in-Link oder Payment-Link fehlt - Email konnte nicht versendet werden'
                        });
                    }
                    catch (logError) {
                        logger_1.logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags (Email ohne Links):`, logError);
                    }
                }
                // Setze success = true wenn mindestens eine Notification erfolgreich war
                success = whatsappSuccess || emailSuccess;
                // Schritt 4: Reservation aktualisieren
                try {
                    const updateData = {
                        paymentLink: paymentLink || undefined,
                    };
                    // Status auf 'notification_sent' setzen, wenn mindestens eine Notification erfolgreich war
                    // sentMessage wird jetzt auch bei Email-Versand gesetzt (Zeile 470, 488)
                    if (success && sentMessage) {
                        updateData.sentMessage = sentMessage;
                        updateData.sentMessageAt = sentMessageAt;
                        updateData.status = 'notification_sent';
                    }
                    else if (paymentLink && !success) {
                        // Payment-Link wurde erstellt, aber alle Notifications fehlgeschlagen
                        // Status bleibt auf 'confirmed', aber Payment-Link wird gespeichert
                        logger_1.logger.log(`[ReservationNotification] ⚠️ Payment-Link gespeichert, aber alle Notifications fehlgeschlagen - Status bleibt auf 'confirmed'`);
                    }
                    yield prisma_1.prisma.reservation.update({
                        where: { id: reservationId },
                        data: updateData,
                    });
                    logger_1.logger.log(`[ReservationNotification] ✅ Reservierung ${reservationId} erfolgreich aktualisiert`);
                }
                catch (error) {
                    logger_1.logger.error(`[ReservationNotification] ❌ Fehler beim Aktualisieren der Reservierung:`, error);
                    const updateErrorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler beim Aktualisieren der Reservierung';
                    // Log auch bei Reservation-Update-Fehler erstellen
                    try {
                        yield this.logNotification(reservationId, 'invitation', guestPhone ? 'whatsapp' : (guestEmail ? 'email' : 'both'), false, {
                            sentTo: guestPhone || guestEmail || undefined,
                            paymentLink: paymentLink || undefined,
                            checkInLink: checkInLink || undefined,
                            errorMessage: `Reservation-Update fehlgeschlagen: ${updateErrorMsg}`
                        });
                    }
                    catch (logError) {
                        logger_1.logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für Reservation-Update-Fehler:`, logError);
                    }
                    // Fehler beim Update ist kritisch, aber wir werfen den Fehler nicht, damit der Log erstellt werden kann
                    // Stattdessen geben wir den Fehler im Return-Value zurück
                    errorMessage = errorMessage || updateErrorMsg;
                }
                return {
                    success,
                    paymentLink: paymentLink || undefined,
                    checkInLink: checkInLink || undefined,
                    messageSent: success,
                    sentAt: sentMessageAt || undefined,
                    error: errorMessage || undefined
                };
            }
            catch (error) {
                logger_1.logger.error(`[ReservationNotification] Fehler beim Senden der Reservation-Einladung:`, error);
                const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler';
                // Log kritischen Fehler (wenn Reservation nicht gefunden wurde, etc.)
                try {
                    yield this.logNotification(reservationId, 'invitation', 'whatsapp', // Default, könnte auch 'both' sein
                    false, {
                        errorMessage: errorMsg
                    });
                }
                catch (logError) {
                    // Ignoriere Log-Fehler
                    logger_1.logger.error(`[ReservationNotification] Fehler beim Loggen des kritischen Fehlers:`, logError);
                }
                return {
                    success: false,
                    messageSent: false,
                    error: errorMsg
                };
            }
        });
    }
    /**
     * Generiert PIN-Code und sendet Mitteilung (unabhängig von Check-in-Status)
     *
     * @param reservationId - ID der Reservierung
     */
    static generatePinAndSendNotification(reservationId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const reservation = yield prisma_1.prisma.reservation.findUnique({
                    where: { id: reservationId },
                    include: { organization: true, branch: true }
                });
                if (!reservation) {
                    throw new Error(`Reservierung ${reservationId} nicht gefunden`);
                }
                // Entschlüssele Settings (aus Branch oder Organisation)
                const { decryptApiSettings, decryptBranchApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                logger_1.logger.log(`[ReservationNotification] Entschlüssele Settings für Reservation ${reservationId}...`);
                let decryptedSettings = null;
                let doorSystemSettings = null;
                // Lade Settings aus Branch oder Organisation
                if (reservation.branchId && ((_a = reservation.branch) === null || _a === void 0 ? void 0 : _a.doorSystemSettings)) {
                    const branchSettings = decryptBranchApiSettings(reservation.branch.doorSystemSettings);
                    doorSystemSettings = (branchSettings === null || branchSettings === void 0 ? void 0 : branchSettings.doorSystem) || branchSettings;
                    // Für notificationChannels: Fallback auf Organisation
                    const orgSettings = decryptApiSettings(reservation.organization.settings);
                    decryptedSettings = orgSettings;
                }
                else {
                    decryptedSettings = decryptApiSettings(reservation.organization.settings);
                    doorSystemSettings = decryptedSettings === null || decryptedSettings === void 0 ? void 0 : decryptedSettings.doorSystem;
                }
                const notificationChannels = ((_b = decryptedSettings === null || decryptedSettings === void 0 ? void 0 : decryptedSettings.lobbyPms) === null || _b === void 0 ? void 0 : _b.notificationChannels) || ['email'];
                logger_1.logger.log(`[ReservationNotification] Notification Channels:`, notificationChannels);
                logger_1.logger.log(`[ReservationNotification] Guest Phone: ${reservation.guestPhone || 'N/A'}`);
                logger_1.logger.log(`[ReservationNotification] Settings entschlüsselt:`, {
                    hasDoorSystem: !!doorSystemSettings,
                    doorSystemProvider: doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.provider,
                    doorSystemLockIds: doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds
                });
                // Erstelle TTLock Passcode
                let doorPin = null;
                let doorAppName = null;
                logger_1.logger.log(`[ReservationNotification] Starte PIN-Generierung für Reservation ${reservationId}...`);
                try {
                    const ttlockService = reservation.branchId
                        ? yield ttlockService_1.TTLockService.createForBranch(reservation.branchId)
                        : new ttlockService_1.TTLockService(reservation.organizationId);
                    logger_1.logger.log(`[ReservationNotification] Door System Settings:`, {
                        hasDoorSystem: !!doorSystemSettings,
                        hasLockIds: !!(doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds),
                        lockIds: doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds,
                        lockIdsLength: ((_c = doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds) === null || _c === void 0 ? void 0 : _c.length) || 0
                    });
                    if ((doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds) && doorSystemSettings.lockIds.length > 0) {
                        const lockId = doorSystemSettings.lockIds[0]; // Verwende ersten Lock
                        doorAppName = 'TTLock'; // Oder aus Settings: doorSystemSettings.appName
                        logger_1.logger.log(`[ReservationNotification] Erstelle TTLock Passcode für Lock ID: ${lockId}`);
                        logger_1.logger.log(`[ReservationNotification] Check-in Date: ${reservation.checkInDate}`);
                        logger_1.logger.log(`[ReservationNotification] Check-out Date: ${reservation.checkOutDate}`);
                        // WICHTIG: checkOutDate muss nach checkInDate liegen (mindestens 1 Tag später)
                        // Falls beide identisch sind (z.B. bei manuell erstellten Reservierungen), korrigiere
                        let actualCheckInDate = reservation.checkInDate;
                        let actualCheckOutDate = reservation.checkOutDate;
                        // Prüfe ob beide Daten identisch oder checkOutDate vor checkInDate liegt
                        if (actualCheckOutDate.getTime() <= actualCheckInDate.getTime()) {
                            logger_1.logger.warn(`[ReservationNotification] ⚠️ checkOutDate ist identisch oder vor checkInDate - korrigiere auf checkInDate + 1 Tag`);
                            actualCheckOutDate = new Date(actualCheckInDate);
                            actualCheckOutDate.setDate(actualCheckOutDate.getDate() + 1); // +1 Tag
                            logger_1.logger.log(`[ReservationNotification] Korrigierte Check-out Date: ${actualCheckOutDate}`);
                        }
                        // Erstelle Passcode für Check-in bis Check-out
                        doorPin = yield ttlockService.createTemporaryPasscode(lockId, actualCheckInDate, actualCheckOutDate, `Guest: ${reservation.guestName}`);
                        logger_1.logger.log(`[ReservationNotification] ✅ TTLock Passcode erfolgreich generiert: ${doorPin}`);
                        // Speichere in Reservierung
                        yield prisma_1.prisma.reservation.update({
                            where: { id: reservation.id },
                            data: {
                                doorPin,
                                doorAppName,
                                ttlLockId: String(lockId), // Konvertiere zu String für Prisma
                                ttlLockPassword: doorPin
                            }
                        });
                        logger_1.logger.log(`[ReservationNotification] ✅ PIN in DB gespeichert für Reservation ${reservationId}`);
                    }
                    else {
                        logger_1.logger.warn(`[ReservationNotification] ⚠️ Keine Lock IDs konfiguriert für Reservation ${reservationId}`);
                    }
                }
                catch (error) {
                    logger_1.logger.error(`[ReservationNotification] ❌ Fehler beim Erstellen des TTLock Passcodes:`, error);
                    if (error instanceof Error) {
                        logger_1.logger.error(`[ReservationNotification] Fehlermeldung: ${error.message}`);
                        logger_1.logger.error(`[ReservationNotification] Stack: ${error.stack}`);
                    }
                    // Weiter ohne PIN
                }
                // Versende Benachrichtigungen
                let emailSuccess = false;
                let whatsappSuccess = false;
                let emailError = null;
                let whatsappError = null;
                const messageText = doorPin
                    ? `Hola ${reservation.guestName},\n\n¡Bienvenido a La Familia Hostel!\n\nTu código de acceso TTLock:\n${doorPin}\n\n¡Te esperamos!`
                    : null;
                if (notificationChannels.includes('email') && reservation.guestEmail) {
                    try {
                        yield this.sendCheckInConfirmationEmail(reservation, doorPin, doorAppName);
                        emailSuccess = true;
                        logger_1.logger.log(`[ReservationNotification] ✅ E-Mail erfolgreich versendet für Reservierung ${reservationId}`);
                        // Log erfolgreiche Email-Notification
                        try {
                            yield this.logNotification(reservationId, 'pin', 'email', true, {
                                sentTo: reservation.guestEmail,
                                message: messageText || undefined
                            });
                        }
                        catch (logError) {
                            logger_1.logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche Email-Notification:`, logError);
                        }
                    }
                    catch (error) {
                        logger_1.logger.error(`[ReservationNotification] Fehler beim Versenden der E-Mail:`, error);
                        emailError = error instanceof Error ? error.message : 'Unbekannter Fehler beim Versenden der E-Mail';
                        // Log fehlgeschlagene Email-Notification
                        try {
                            yield this.logNotification(reservationId, 'pin', 'email', false, {
                                sentTo: reservation.guestEmail,
                                message: messageText || undefined,
                                errorMessage: emailError
                            });
                        }
                        catch (logError) {
                            logger_1.logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene Email-Notification:`, logError);
                        }
                    }
                }
                // ⚠️ TEMPORÄR DEAKTIVIERT: WhatsApp-Versendung nach TTLock-Webhook
                // TTLock-Code wird weiterhin erstellt und im Frontend angezeigt, aber nicht versendet
                if (notificationChannels.includes('whatsapp') && reservation.guestPhone) {
                    logger_1.logger.log(`[ReservationNotification] ⚠️ WhatsApp-Versendung temporär deaktiviert - TTLock-Code ${doorPin ? `(${doorPin})` : ''} wird nur im Frontend angezeigt`);
                    // TODO: Wieder aktivieren, wenn gewünscht
                    /*
                    try {
                      const whatsappService = reservation.branchId
                        ? new WhatsAppService(undefined, reservation.branchId)
                        : new WhatsAppService(reservation.organizationId);
                      
                      // Ermittle Sprache für roomDescription
                      const { CountryLanguageService } = require('./countryLanguageService');
                      const languageCode = CountryLanguageService.getLanguageForReservation({
                        guestNationality: reservation.guestNationality,
                        guestPhone: reservation.guestPhone
                      }) as 'en' | 'es' | 'de';
                      
                      // Lade roomDescription aus Branch-Settings
                      const roomDescription = await this.loadRoomDescriptionFromBranchSettings(
                        reservation,
                        languageCode
                      );
                      
                      // Formatiere Zimmer-Anzeige: Dorm = roomNumber (bereits "Zimmername (Bettnummer)"), Private = roomDescription
                      const isDorm = reservation.roomNumber !== null && reservation.roomNumber.trim() !== '';
                      const roomDisplay = isDorm
                        ? reservation.roomNumber?.trim() || 'N/A'
                        : reservation.roomDescription?.trim() || 'N/A';
                      
                      const whatsappSuccessResult = await whatsappService.sendCheckInConfirmation(
                        reservation.guestName,
                        reservation.guestPhone,
                        roomDisplay, // Formatierte Zimmer-Anzeige
                        roomDescription, // roomDescription aus Branch-Settings
                        doorPin || 'N/A',
                        doorAppName || 'TTLock',
                        {
                          guestNationality: reservation.guestNationality,
                          guestPhone: reservation.guestPhone
                        }
                      );
                      whatsappSuccess = whatsappSuccessResult;
                      
                      if (whatsappSuccess) {
                        logger.log(`[ReservationNotification] ✅ WhatsApp-Nachricht erfolgreich versendet für Reservierung ${reservationId}`);
                        
                        // Log erfolgreiche WhatsApp-Notification
                        try {
                          await this.logNotification(
                            reservationId,
                            'pin',
                            'whatsapp',
                            true,
                            {
                              sentTo: reservation.guestPhone,
                              message: messageText || undefined
                            }
                          );
                        } catch (logError) {
                          logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche WhatsApp-Notification:`, logError);
                        }
                      } else {
                        logger.warn(`[ReservationNotification] ⚠️ WhatsApp-Nachricht konnte nicht versendet werden für Reservierung ${reservationId}`);
                        whatsappError = 'WhatsApp-Nachricht konnte nicht versendet werden';
                        
                        // Log fehlgeschlagene WhatsApp-Notification
                        try {
                          await this.logNotification(
                            reservationId,
                            'pin',
                            'whatsapp',
                            false,
                            {
                              sentTo: reservation.guestPhone,
                              message: messageText || undefined,
                              errorMessage: whatsappError
                            }
                          );
                        } catch (logError) {
                          logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene WhatsApp-Notification:`, logError);
                        }
                      }
                    } catch (error) {
                      logger.error(`[ReservationNotification] ❌ Fehler beim Versenden der WhatsApp-Nachricht:`, error);
                      whatsappError = error instanceof Error ? error.message : 'Unbekannter Fehler beim Versenden der WhatsApp-Nachricht';
                    }
                    */
                }
                else {
                    if (!notificationChannels.includes('whatsapp')) {
                        logger_1.logger.log(`[ReservationNotification] WhatsApp nicht in Notification Channels für Reservierung ${reservationId}`);
                    }
                    if (!reservation.guestPhone) {
                        logger_1.logger.log(`[ReservationNotification] Keine Guest Phone für Reservierung ${reservationId}`);
                    }
                }
                // Log auch wenn PIN nicht generiert werden konnte
                if (!doorPin) {
                    logger_1.logger.warn(`[ReservationNotification] ⚠️ PIN konnte nicht generiert werden für Reservierung ${reservationId}`);
                    try {
                        yield this.logNotification(reservationId, 'pin', reservation.guestPhone && reservation.guestEmail ? 'both' : (reservation.guestPhone ? 'whatsapp' : (reservation.guestEmail ? 'email' : 'whatsapp')), false, {
                            sentTo: reservation.guestPhone || reservation.guestEmail || undefined,
                            errorMessage: 'PIN konnte nicht generiert werden - keine Lock IDs konfiguriert oder Fehler beim Erstellen'
                        });
                    }
                    catch (logError) {
                        logger_1.logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags (kein PIN):`, logError);
                    }
                }
                // Prüfe ob PIN tatsächlich generiert wurde
                if (doorPin) {
                    logger_1.logger.log(`[ReservationNotification] ✅ PIN generiert und Mitteilung versendet für Reservierung ${reservationId}`);
                }
                else {
                    logger_1.logger.warn(`[ReservationNotification] ⚠️ PIN konnte nicht generiert werden, aber Mitteilung versendet für Reservierung ${reservationId}`);
                }
            }
            catch (error) {
                logger_1.logger.error(`[ReservationNotification] Fehler beim Generieren des PIN-Codes und Versenden der Mitteilung:`, error);
                throw error;
            }
        });
    }
    /**
     * Sendet TTLock Passcode mit anpassbaren Kontaktdaten
     *
     * @param reservationId - ID der Reservierung
     * @param options - Optionale Parameter (guestPhone, guestEmail, customMessage)
     */
    static sendPasscodeNotification(reservationId, options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            try {
                const reservation = yield prisma_1.prisma.reservation.findUnique({
                    where: { id: reservationId },
                    include: { organization: true, branch: true }
                });
                if (!reservation) {
                    throw new Error(`Reservierung ${reservationId} nicht gefunden`);
                }
                // Verwende übergebene Kontaktdaten oder Fallback auf Reservierungsdaten
                const finalGuestPhone = (options === null || options === void 0 ? void 0 : options.guestPhone) || reservation.guestPhone;
                const finalGuestEmail = (options === null || options === void 0 ? void 0 : options.guestEmail) || reservation.guestEmail;
                if (!finalGuestPhone && !finalGuestEmail) {
                    throw new Error('Mindestens eine Telefonnummer oder E-Mail-Adresse ist erforderlich');
                }
                // Entschlüssele Settings (aus Branch oder Organisation)
                const { decryptApiSettings, decryptBranchApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                logger_1.logger.log(`[ReservationNotification] Entschlüssele Settings für Reservation ${reservationId}...`);
                let decryptedSettings = null;
                let doorSystemSettings = null;
                // Lade Settings aus Branch oder Organisation
                if (reservation.branchId && ((_a = reservation.branch) === null || _a === void 0 ? void 0 : _a.doorSystemSettings)) {
                    const branchSettings = decryptBranchApiSettings(reservation.branch.doorSystemSettings);
                    doorSystemSettings = (branchSettings === null || branchSettings === void 0 ? void 0 : branchSettings.doorSystem) || branchSettings;
                    // Für notificationChannels: Fallback auf Organisation
                    const orgSettings = decryptApiSettings(reservation.organization.settings);
                    decryptedSettings = orgSettings;
                }
                else {
                    decryptedSettings = decryptApiSettings(reservation.organization.settings);
                    doorSystemSettings = decryptedSettings === null || decryptedSettings === void 0 ? void 0 : decryptedSettings.doorSystem;
                }
                const notificationChannels = ((_b = decryptedSettings === null || decryptedSettings === void 0 ? void 0 : decryptedSettings.lobbyPms) === null || _b === void 0 ? void 0 : _b.notificationChannels) || ['email'];
                logger_1.logger.log(`[ReservationNotification] Notification Channels:`, notificationChannels);
                logger_1.logger.log(`[ReservationNotification] Guest Phone: ${finalGuestPhone || 'N/A'}`);
                logger_1.logger.log(`[ReservationNotification] Guest Email: ${finalGuestEmail || 'N/A'}`);
                logger_1.logger.log(`[ReservationNotification] Settings entschlüsselt:`, {
                    hasDoorSystem: !!doorSystemSettings,
                    doorSystemProvider: doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.provider,
                    doorSystemLockIds: doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds
                });
                // Erstelle TTLock Passcode
                let doorPin = null;
                let doorAppName = null;
                logger_1.logger.log(`[ReservationNotification] Starte Passcode-Generierung für Reservation ${reservationId}...`);
                try {
                    const ttlockService = reservation.branchId
                        ? yield ttlockService_1.TTLockService.createForBranch(reservation.branchId)
                        : new ttlockService_1.TTLockService(reservation.organizationId);
                    logger_1.logger.log(`[ReservationNotification] Door System Settings:`, {
                        hasDoorSystem: !!doorSystemSettings,
                        hasLockIds: !!(doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds),
                        lockIds: doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds,
                        lockIdsLength: ((_c = doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds) === null || _c === void 0 ? void 0 : _c.length) || 0
                    });
                    if ((doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds) && doorSystemSettings.lockIds.length > 0) {
                        const lockId = doorSystemSettings.lockIds[0]; // Verwende ersten Lock
                        doorAppName = 'TTLock'; // Oder aus Settings: doorSystemSettings.appName
                        logger_1.logger.log(`[ReservationNotification] Erstelle TTLock Passcode für Lock ID: ${lockId}`);
                        logger_1.logger.log(`[ReservationNotification] Check-in Date: ${reservation.checkInDate}`);
                        logger_1.logger.log(`[ReservationNotification] Check-out Date: ${reservation.checkOutDate}`);
                        // WICHTIG: checkOutDate muss nach checkInDate liegen (mindestens 1 Tag später)
                        // Falls beide identisch sind (z.B. bei manuell erstellten Reservierungen), korrigiere
                        let actualCheckInDate = reservation.checkInDate;
                        let actualCheckOutDate = reservation.checkOutDate;
                        // Prüfe ob beide Daten identisch oder checkOutDate vor checkInDate liegt
                        if (actualCheckOutDate.getTime() <= actualCheckInDate.getTime()) {
                            logger_1.logger.warn(`[ReservationNotification] ⚠️ checkOutDate ist identisch oder vor checkInDate - korrigiere auf checkInDate + 1 Tag`);
                            actualCheckOutDate = new Date(actualCheckInDate);
                            actualCheckOutDate.setDate(actualCheckOutDate.getDate() + 1); // +1 Tag
                            logger_1.logger.log(`[ReservationNotification] Korrigierte Check-out Date: ${actualCheckOutDate}`);
                        }
                        // Erstelle Passcode für Check-in bis Check-out
                        doorPin = yield ttlockService.createTemporaryPasscode(lockId, actualCheckInDate, actualCheckOutDate, `Guest: ${reservation.guestName}`);
                        logger_1.logger.log(`[ReservationNotification] ✅ TTLock Passcode erfolgreich generiert: ${doorPin}`);
                        // Speichere in Reservierung
                        yield prisma_1.prisma.reservation.update({
                            where: { id: reservation.id },
                            data: {
                                doorPin,
                                doorAppName,
                                ttlLockId: String(lockId), // Konvertiere zu String für Prisma
                                ttlLockPassword: doorPin
                            }
                        });
                        logger_1.logger.log(`[ReservationNotification] ✅ PIN in DB gespeichert für Reservation ${reservationId}`);
                    }
                    else {
                        logger_1.logger.warn(`[ReservationNotification] ⚠️ Keine Lock IDs konfiguriert für Reservation ${reservationId}`);
                    }
                }
                catch (error) {
                    logger_1.logger.error(`[ReservationNotification] ❌ Fehler beim Erstellen des TTLock Passcodes:`, error);
                    if (error instanceof Error) {
                        logger_1.logger.error(`[ReservationNotification] Fehlermeldung: ${error.message}`);
                        logger_1.logger.error(`[ReservationNotification] Stack: ${error.stack}`);
                    }
                    // Weiter ohne PIN
                }
                // Erstelle Nachrichtentext (mit oder ohne customMessage)
                let messageText;
                if ((options === null || options === void 0 ? void 0 : options.customMessage) && doorPin) {
                    // Verwende customMessage und ersetze Variablen
                    messageText = options.customMessage
                        .replace(/\{\{guestName\}\}/g, reservation.guestName)
                        .replace(/\{\{passcode\}\}/g, doorPin);
                }
                else {
                    // NEU: Lade Template aus Branch Settings (mit Fallback auf Defaults)
                    const { CountryLanguageService } = require('./countryLanguageService');
                    const languageCode = CountryLanguageService.getLanguageForReservation({
                        guestNationality: reservation.guestNationality,
                        guestPhone: reservation.guestPhone
                    });
                    // Formatiere Zimmer-Anzeige: Dorm = roomNumber (bereits "Zimmername (Bettnummer)"), Private = roomDescription
                    const isDorm = reservation.roomNumber !== null && reservation.roomNumber.trim() !== '';
                    const roomDisplay = isDorm
                        ? ((_d = reservation.roomNumber) === null || _d === void 0 ? void 0 : _d.trim()) || 'N/A'
                        : ((_e = reservation.roomDescription) === null || _e === void 0 ? void 0 : _e.trim()) || 'N/A';
                    const template = yield this.getMessageTemplate(reservation.branchId, reservation.organizationId, 'checkInConfirmation', languageCode);
                    // Lade roomDescription aus Branch-Settings
                    const roomDescription = yield this.loadRoomDescriptionFromBranchSettings(reservation, languageCode);
                    if (template) {
                        // Formatiere roomDescription für Template (nur wenn vorhanden)
                        const descriptionLabel = languageCode === 'en' ? 'Description' : languageCode === 'es' ? 'Descripción' : 'Beschreibung';
                        const formattedRoomDescription = roomDescription && roomDescription !== 'N/A'
                            ? `- ${descriptionLabel}: ${roomDescription}`
                            : '';
                        // Ersetze Variablen im Template
                        // WICHTIG: Ersetze auch {{doorAppName}} durch leeren String (falls in Datenbank-Template vorhanden)
                        messageText = this.replaceTemplateVariables(template.emailContent, {
                            guestName: reservation.guestName,
                            roomDisplay: roomDisplay,
                            roomDescription: formattedRoomDescription,
                            doorPin: doorPin || 'N/A',
                            doorAppName: '' // Entferne {{doorAppName}} komplett
                        });
                    }
                    else {
                        // Fallback auf alte hardcodierte Nachricht (sollte nicht passieren)
                        logger_1.logger.warn(`[ReservationNotification] Kein Template gefunden für sendPasscodeNotification, verwende Fallback`);
                        // Formatiere roomDescription für Fallback (nur wenn vorhanden)
                        const descriptionLabel = languageCode === 'en' ? 'Description' : languageCode === 'es' ? 'Descripción' : 'Beschreibung';
                        const roomDescriptionText = roomDescription && roomDescription !== 'N/A'
                            ? `\n- ${descriptionLabel}: ${roomDescription}`
                            : '';
                        if (languageCode === 'en') {
                            const greeting = `Hello ${reservation.guestName},`;
                            const contentText = `Your check-in has been completed successfully! Your room information: - Room: ${roomDisplay}${roomDescriptionText} Access: - Door PIN: ${doorPin || 'N/A'}`;
                            messageText = `Welcome,

${greeting}

${contentText}

We wish you a pleasant stay!`;
                        }
                        else {
                            const greeting = `Hola ${reservation.guestName},`;
                            const contentText = `¡Tu check-in se ha completado exitosamente! Información de tu habitación: - Habitación: ${roomDisplay}${roomDescriptionText} Acceso: - PIN de la puerta: ${doorPin || 'N/A'}`;
                            messageText = `Bienvenido,

${greeting}

${contentText}

¡Te deseamos una estancia agradable!`;
                        }
                    }
                }
                // Versende Benachrichtigungen
                let whatsappSuccess = false;
                let emailSuccess = false;
                let emailError = null;
                let whatsappError = null;
                if (notificationChannels.includes('email') && finalGuestEmail) {
                    try {
                        // Erstelle temporäre Reservierung mit angepassten Kontaktdaten für E-Mail
                        const emailReservation = Object.assign(Object.assign({}, reservation), { guestEmail: finalGuestEmail, doorPin: doorPin || null, doorAppName: doorAppName || null });
                        yield this.sendCheckInConfirmationEmail(emailReservation, doorPin, doorAppName);
                        emailSuccess = true;
                        logger_1.logger.log(`[ReservationNotification] ✅ E-Mail erfolgreich versendet für Reservierung ${reservationId}`);
                        // Log erfolgreiche Email-Notification
                        try {
                            yield this.logNotification(reservationId, 'pin', 'email', true, {
                                sentTo: finalGuestEmail,
                                message: messageText || undefined
                            });
                        }
                        catch (logError) {
                            logger_1.logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche Email-Notification:`, logError);
                        }
                    }
                    catch (error) {
                        logger_1.logger.error(`[ReservationNotification] Fehler beim Versenden der E-Mail:`, error);
                        emailError = error instanceof Error ? error.message : 'Unbekannter Fehler beim Versenden der E-Mail';
                        // Log fehlgeschlagene Email-Notification
                        try {
                            yield this.logNotification(reservationId, 'pin', 'email', false, {
                                sentTo: finalGuestEmail,
                                message: messageText || undefined,
                                errorMessage: emailError
                            });
                        }
                        catch (logError) {
                            logger_1.logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene Email-Notification:`, logError);
                        }
                    }
                }
                // WhatsApp-Versendung mit TTLock-Code
                if (notificationChannels.includes('whatsapp') && finalGuestPhone) {
                    try {
                        const whatsappService = reservation.branchId
                            ? new whatsappService_1.WhatsAppService(undefined, reservation.branchId)
                            : new whatsappService_1.WhatsAppService(reservation.organizationId);
                        // Verwende customMessage wenn vorhanden, sonst Standard
                        if ((options === null || options === void 0 ? void 0 : options.customMessage) && doorPin) {
                            // Versuche zuerst Session Message (24h-Fenster), bei Fehler: Template Message
                            // Template-Name für reservation_checkin_completed
                            const templateName = process.env.WHATSAPP_TEMPLATE_CHECKIN_CONFIRMATION || 'reservation_checkin_completed';
                            // Template-Parameter für reservation_checkin_completed:
                            // {{1}} = Begrüßung mit Name (z.B. "Hola Juan,")
                            // {{2}} = Kompletter Text mit Zimmerinfo und PIN
                            // Erkenne Sprache für Template
                            let languageCode;
                            if (reservation.guestNationality) {
                                const { CountryLanguageService } = require('./countryLanguageService');
                                languageCode = CountryLanguageService.getLanguageForReservation({
                                    guestNationality: reservation.guestNationality,
                                    guestPhone: reservation.guestPhone
                                });
                            }
                            else {
                                languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
                            }
                            const greeting = languageCode === 'en'
                                ? `Hello ${reservation.guestName},`
                                : `Hola ${reservation.guestName},`;
                            // Lade roomDescription aus Branch-Settings
                            const roomDescription = yield this.loadRoomDescriptionFromBranchSettings(reservation, languageCode);
                            // Formatiere Zimmer-Anzeige: Dorm = roomNumber (bereits "Zimmername (Bettnummer)"), Private = roomDescription
                            const isDorm = reservation.roomNumber !== null && reservation.roomNumber.trim() !== '';
                            const roomDisplay = isDorm
                                ? ((_f = reservation.roomNumber) === null || _f === void 0 ? void 0 : _f.trim()) || 'N/A'
                                : ((_g = reservation.roomDescription) === null || _g === void 0 ? void 0 : _g.trim()) || 'N/A';
                            let contentText;
                            if (languageCode === 'en') {
                                const roomInfo = roomDescription && roomDescription !== 'N/A'
                                    ? `- Room: ${roomDisplay}\n- Description: ${roomDescription}`
                                    : `- Room: ${roomDisplay}`;
                                contentText = `Your check-in has been completed successfully!\n\nYour room information:\n${roomInfo}\n\nAccess:\n- Door PIN: ${doorPin}`;
                            }
                            else {
                                const roomInfo = roomDescription && roomDescription !== 'N/A'
                                    ? `- Habitación: ${roomDisplay}\n- Descripción: ${roomDescription}`
                                    : `- Habitación: ${roomDisplay}`;
                                contentText = `¡Tu check-in se ha completado exitosamente!\n\nInformación de tu habitación:\n${roomInfo}\n\nAcceso:\n- PIN de la puerta: ${doorPin}`;
                            }
                            // WICHTIG: Ersetze Platzhalter im contentText, falls das WhatsApp-Template diese enthält
                            const contentTextWithReplacements = contentText
                                .replace(/\{\{roomNumber\}\}/g, roomDisplay)
                                .replace(/\{\{roomDisplay\}\}/g, roomDisplay)
                                .replace(/\{\{roomDescription\}\}/g, roomDescription && roomDescription !== 'N/A' ? roomDescription : '')
                                .replace(/\{\{doorPin\}\}/g, doorPin || 'N/A')
                                .replace(/\{\{guestName\}\}/g, reservation.guestName);
                            const templateParams = [greeting, contentTextWithReplacements];
                            logger_1.logger.log(`[ReservationNotification] Versuche Session Message (24h-Fenster) mit customMessage, bei Fehler: Template Message`);
                            logger_1.logger.log(`[ReservationNotification] Template Name: ${templateName}`);
                            logger_1.logger.log(`[ReservationNotification] Template Params: ${JSON.stringify(templateParams)}`);
                            whatsappSuccess = yield whatsappService.sendMessageWithFallback(finalGuestPhone, messageText, // customMessage wird verwendet
                            templateName, templateParams, // Template-Parameter für Fallback
                            {
                                guestNationality: reservation.guestNationality,
                                guestPhone: reservation.guestPhone
                            });
                        }
                        else {
                            // Verwende Standard-Template
                            // Lade roomDescription aus Branch-Settings
                            const { CountryLanguageService } = require('./countryLanguageService');
                            const languageCode = CountryLanguageService.getLanguageForReservation({
                                guestNationality: reservation.guestNationality,
                                guestPhone: reservation.guestPhone
                            });
                            const roomDescription = yield this.loadRoomDescriptionFromBranchSettings(reservation, languageCode);
                            // Formatiere Zimmer-Anzeige: Dorm = roomNumber (bereits "Zimmername (Bettnummer)"), Private = roomDescription
                            const isDorm = reservation.roomNumber !== null && reservation.roomNumber.trim() !== '';
                            const roomDisplay = isDorm
                                ? ((_h = reservation.roomNumber) === null || _h === void 0 ? void 0 : _h.trim()) || 'N/A'
                                : ((_j = reservation.roomDescription) === null || _j === void 0 ? void 0 : _j.trim()) || 'N/A';
                            // Lade WhatsApp-Template
                            const whatsappTemplate = yield this.getMessageTemplate(reservation.branchId, reservation.organizationId, 'checkInConfirmation', languageCode);
                            const greeting = languageCode === 'en'
                                ? `Hello ${reservation.guestName},`
                                : `Hola ${reservation.guestName},`;
                            // Formatiere roomDescription für Nachricht (nur wenn vorhanden)
                            let contentText;
                            if (languageCode === 'en') {
                                const roomInfo = roomDescription && roomDescription !== 'N/A'
                                    ? `- Room: ${roomDisplay}\n- Description: ${roomDescription}`
                                    : `- Room: ${roomDisplay}`;
                                contentText = `Your check-in has been completed successfully!\n\nYour room information:\n${roomInfo}\n\nAccess:\n- Door PIN: ${doorPin || 'N/A'}`;
                            }
                            else {
                                const roomInfo = roomDescription && roomDescription !== 'N/A'
                                    ? `- Habitación: ${roomDisplay}\n- Descripción: ${roomDescription}`
                                    : `- Habitación: ${roomDisplay}`;
                                contentText = `¡Tu check-in se ha completado exitosamente!\n\nInformación de tu habitación:\n${roomInfo}\n\nAcceso:\n- PIN de la puerta: ${doorPin || 'N/A'}`;
                            }
                            // Template-Name aus Settings oder Fallback
                            const templateName = (whatsappTemplate === null || whatsappTemplate === void 0 ? void 0 : whatsappTemplate.whatsappTemplateName) ||
                                process.env.WHATSAPP_TEMPLATE_CHECKIN_CONFIRMATION ||
                                'reservation_checkin_completed';
                            // Template-Parameter: Ersetze Platzhalter in Template-Parametern durch tatsächliche Werte
                            // WICHTIG: Ersetze auch Platzhalter im contentText selbst, falls das WhatsApp-Template diese enthält
                            const contentTextWithReplacements = contentText
                                .replace(/\{\{roomNumber\}\}/g, roomDisplay)
                                .replace(/\{\{roomDisplay\}\}/g, roomDisplay)
                                .replace(/\{\{roomDescription\}\}/g, roomDescription && roomDescription !== 'N/A' ? roomDescription : '')
                                .replace(/\{\{doorPin\}\}/g, doorPin || 'N/A')
                                .replace(/\{\{guestName\}\}/g, reservation.guestName);
                            const templateParams = ((_k = whatsappTemplate === null || whatsappTemplate === void 0 ? void 0 : whatsappTemplate.whatsappTemplateParams) === null || _k === void 0 ? void 0 : _k.length) > 0
                                ? whatsappTemplate.whatsappTemplateParams.map((param) => {
                                    return param
                                        .replace(/\{\{1\}\}/g, greeting)
                                        .replace(/\{\{2\}\}/g, contentTextWithReplacements)
                                        .replace(/\{\{guestName\}\}/g, reservation.guestName)
                                        .replace(/\{\{roomDisplay\}\}/g, roomDisplay)
                                        .replace(/\{\{roomNumber\}\}/g, roomDisplay)
                                        .replace(/\{\{roomDescription\}\}/g, roomDescription && roomDescription !== 'N/A' ? roomDescription : '')
                                        .replace(/\{\{doorPin\}\}/g, doorPin || 'N/A');
                                })
                                : [greeting, contentTextWithReplacements];
                            const messageText = `${greeting}\n\n${contentTextWithReplacements}\n\n${languageCode === 'en' ? 'We wish you a pleasant stay!' : '¡Te deseamos una estancia agradable!'}`;
                            whatsappSuccess = yield whatsappService.sendMessageWithFallback(finalGuestPhone, messageText, templateName, templateParams, {
                                guestNationality: reservation.guestNationality,
                                guestPhone: reservation.guestPhone
                            });
                        }
                        if (whatsappSuccess) {
                            logger_1.logger.log(`[ReservationNotification] ✅ WhatsApp-Nachricht erfolgreich versendet für Reservierung ${reservationId}`);
                            // Log erfolgreiche WhatsApp-Notification
                            try {
                                yield this.logNotification(reservationId, 'pin', 'whatsapp', true, {
                                    sentTo: finalGuestPhone,
                                    message: messageText || undefined
                                });
                            }
                            catch (logError) {
                                logger_1.logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche WhatsApp-Notification:`, logError);
                            }
                        }
                        else {
                            logger_1.logger.warn(`[ReservationNotification] ⚠️ WhatsApp-Nachricht konnte nicht versendet werden für Reservierung ${reservationId}`);
                            whatsappError = 'WhatsApp-Nachricht konnte nicht versendet werden';
                            // Log fehlgeschlagene WhatsApp-Notification
                            try {
                                yield this.logNotification(reservationId, 'pin', 'whatsapp', false, {
                                    sentTo: finalGuestPhone,
                                    message: messageText || undefined,
                                    errorMessage: whatsappError
                                });
                            }
                            catch (logError) {
                                logger_1.logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene WhatsApp-Notification:`, logError);
                            }
                        }
                    }
                    catch (error) {
                        logger_1.logger.error(`[ReservationNotification] ❌ Fehler beim Versenden der WhatsApp-Nachricht:`, error);
                        whatsappError = error instanceof Error ? error.message : 'Unbekannter Fehler beim Versenden der WhatsApp-Nachricht';
                        // Log fehlgeschlagene WhatsApp-Notification
                        try {
                            yield this.logNotification(reservationId, 'pin', 'whatsapp', false, {
                                sentTo: finalGuestPhone,
                                message: messageText || undefined,
                                errorMessage: whatsappError
                            });
                        }
                        catch (logError) {
                            logger_1.logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene WhatsApp-Notification:`, logError);
                        }
                    }
                }
                else {
                    if (!notificationChannels.includes('whatsapp')) {
                        logger_1.logger.log(`[ReservationNotification] WhatsApp nicht in Notification Channels für Reservierung ${reservationId}`);
                    }
                    if (!finalGuestPhone) {
                        logger_1.logger.log(`[ReservationNotification] Keine Guest Phone für Reservierung ${reservationId}`);
                    }
                }
                // Log auch wenn PIN nicht generiert werden konnte
                if (!doorPin) {
                    logger_1.logger.warn(`[ReservationNotification] ⚠️ PIN konnte nicht generiert werden für Reservierung ${reservationId}`);
                    try {
                        yield this.logNotification(reservationId, 'pin', finalGuestPhone && finalGuestEmail ? 'both' : (finalGuestPhone ? 'whatsapp' : (finalGuestEmail ? 'email' : 'whatsapp')), false, {
                            sentTo: finalGuestPhone || finalGuestEmail || undefined,
                            errorMessage: 'PIN konnte nicht generiert werden - keine Lock IDs konfiguriert oder Fehler beim Erstellen'
                        });
                    }
                    catch (logError) {
                        logger_1.logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags (kein PIN):`, logError);
                    }
                }
                // Speichere versendete Nachricht in Reservierung
                if (whatsappSuccess || emailSuccess) {
                    yield prisma_1.prisma.reservation.update({
                        where: { id: reservationId },
                        data: {
                            sentMessage: messageText,
                            sentMessageAt: new Date()
                        }
                    });
                }
                // Prüfe ob PIN tatsächlich generiert wurde
                if (doorPin) {
                    logger_1.logger.log(`[ReservationNotification] ✅ Passcode generiert und Mitteilung versendet für Reservierung ${reservationId}`);
                }
                else {
                    logger_1.logger.warn(`[ReservationNotification] ⚠️ Passcode konnte nicht generiert werden, aber Mitteilung versendet für Reservierung ${reservationId}`);
                }
            }
            catch (error) {
                logger_1.logger.error(`[ReservationNotification] Fehler beim Versenden des Passcodes:`, error);
                throw error;
            }
        });
    }
    /**
     * Sendet Check-in-Bestätigung nach erfolgreichem Check-in
     *
     * @param reservationId - ID der Reservierung
     */
    static sendCheckInConfirmation(reservationId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const reservation = yield prisma_1.prisma.reservation.findUnique({
                    where: { id: reservationId },
                    include: { organization: true, branch: true }
                });
                if (!reservation) {
                    throw new Error(`Reservierung ${reservationId} nicht gefunden`);
                }
                if (reservation.status !== client_1.ReservationStatus.checked_in) {
                    throw new Error(`Reservierung ${reservationId} ist nicht eingecheckt`);
                }
                // Lade Settings aus Branch oder Organisation
                const { decryptApiSettings, decryptBranchApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                let doorSystemSettings = null;
                let settings = null;
                if (reservation.branchId && ((_a = reservation.branch) === null || _a === void 0 ? void 0 : _a.doorSystemSettings)) {
                    const branchSettings = decryptBranchApiSettings(reservation.branch.doorSystemSettings);
                    doorSystemSettings = (branchSettings === null || branchSettings === void 0 ? void 0 : branchSettings.doorSystem) || branchSettings;
                    // Für notificationChannels: Fallback auf Organisation
                    settings = decryptApiSettings(reservation.organization.settings);
                }
                else {
                    settings = decryptApiSettings(reservation.organization.settings);
                    doorSystemSettings = settings === null || settings === void 0 ? void 0 : settings.doorSystem;
                }
                const notificationChannels = ((_b = settings === null || settings === void 0 ? void 0 : settings.lobbyPms) === null || _b === void 0 ? void 0 : _b.notificationChannels) || ['email'];
                // Erstelle TTLock Passcode
                let doorPin = null;
                let doorAppName = null;
                try {
                    const ttlockService = reservation.branchId
                        ? yield ttlockService_1.TTLockService.createForBranch(reservation.branchId)
                        : new ttlockService_1.TTLockService(reservation.organizationId);
                    if ((doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds) && doorSystemSettings.lockIds.length > 0) {
                        const lockId = doorSystemSettings.lockIds[0]; // Verwende ersten Lock
                        doorAppName = 'TTLock'; // Oder aus Settings: doorSystemSettings.appName
                        // Erstelle Passcode für Check-in bis Check-out
                        doorPin = yield ttlockService.createTemporaryPasscode(lockId, reservation.checkInDate, reservation.checkOutDate, `Guest: ${reservation.guestName}`);
                        // Speichere in Reservierung
                        yield prisma_1.prisma.reservation.update({
                            where: { id: reservation.id },
                            data: {
                                doorPin,
                                doorAppName,
                                ttlLockId: String(lockId), // Konvertiere zu String für Prisma
                                ttlLockPassword: doorPin
                            }
                        });
                    }
                }
                catch (error) {
                    logger_1.logger.error(`[ReservationNotification] Fehler beim Erstellen des TTLock Passcodes:`, error);
                    // Weiter ohne PIN
                }
                // Versende Benachrichtigungen
                if (notificationChannels.includes('email') && reservation.guestEmail) {
                    yield this.sendCheckInConfirmationEmail(reservation, doorPin, doorAppName);
                }
                // ⚠️ TEMPORÄR DEAKTIVIERT: WhatsApp-Versendung nach TTLock-Webhook
                // TTLock-Code wird weiterhin erstellt und im Frontend angezeigt, aber nicht versendet
                if (notificationChannels.includes('whatsapp') && reservation.guestPhone) {
                    logger_1.logger.log(`[ReservationNotification] ⚠️ WhatsApp-Versendung temporär deaktiviert - TTLock-Code ${doorPin ? `(${doorPin})` : ''} wird nur im Frontend angezeigt`);
                    // TODO: Wieder aktivieren, wenn gewünscht
                    /*
                    const whatsappService = reservation.branchId
                      ? new WhatsAppService(undefined, reservation.branchId)
                      : new WhatsAppService(reservation.organizationId);
                    
                    // Ermittle Sprache für roomDescription
                    const { CountryLanguageService } = require('./countryLanguageService');
                    const languageCode = CountryLanguageService.getLanguageForReservation({
                      guestNationality: reservation.guestNationality,
                      guestPhone: reservation.guestPhone
                    }) as 'en' | 'es' | 'de';
                    
                    // Lade roomDescription aus Branch-Settings
                    const roomDescription = await this.loadRoomDescriptionFromBranchSettings(
                      reservation,
                      languageCode
                    );
                    
                    await whatsappService.sendCheckInConfirmation(
                      reservation.guestName,
                      reservation.guestPhone,
                      reservation.roomNumber || 'N/A',
                      roomDescription,
                      doorPin || 'N/A',
                      doorAppName || 'TTLock'
                    );
                    */
                }
                logger_1.logger.log(`[ReservationNotification] Check-in-Bestätigung versendet für Reservierung ${reservationId}`);
            }
            catch (error) {
                logger_1.logger.error(`[ReservationNotification] Fehler beim Versand der Check-in-Bestätigung:`, error);
                throw error;
            }
        });
    }
    /**
     * Sendet Check-in-Einladung per E-Mail
     */
    static sendCheckInInvitationEmail(reservation, checkInLink, paymentLink) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Bestimme Sprache basierend auf Gast-Nationalität (Standard: Spanisch)
            const { CountryLanguageService } = require('./countryLanguageService');
            const languageCode = CountryLanguageService.getLanguageForReservation({
                guestNationality: reservation.guestNationality,
                guestPhone: reservation.guestPhone
            });
            const isEnglish = languageCode === 'en';
            // Lade Logo + Branding (nutzt gespeichertes Branding, keine API-Calls)
            const { logo, branding } = yield (0, emailService_1.getOrganizationBranding)(reservation.organizationId, reservation.branchId || undefined);
            // Lade Organisationsname für Header
            let organizationName = 'La Familia Hostel';
            if (reservation.organizationId) {
                const organization = yield prisma_1.prisma.organization.findUnique({
                    where: { id: reservation.organizationId },
                    select: { displayName: true, name: true }
                });
                if (organization === null || organization === void 0 ? void 0 : organization.displayName) {
                    organizationName = organization.displayName;
                }
                else if (organization === null || organization === void 0 ? void 0 : organization.name) {
                    organizationName = organization.name;
                }
            }
            const linkColor = ((_a = branding === null || branding === void 0 ? void 0 : branding.colors) === null || _a === void 0 ? void 0 : _a.primary) || '#2563eb';
            let subject;
            let content;
            let text;
            if (isEnglish) {
                // Englische Version
                subject = 'Welcome to La Familia Hostel - Online Check-in';
                content = `
        <p>Hello ${reservation.guestName},</p>
        <p>We are pleased to welcome you to La Familia Hostel! 🎊</p>
        <p>In case that you arrive after 18:00 or before 09:00, our recepcion 🛎️ will be closed.</p>
        <p>We would then kindly ask you to complete check-in & payment online in advance:</p>
        <p><strong>Check-In:</strong> <a href="${checkInLink}" style="color: ${linkColor}; text-decoration: none; font-weight: 600;">Online Check-in</a></p>
        <p><strong>Please make the payment in advance:</strong> <a href="${paymentLink}" style="color: ${linkColor}; text-decoration: none; font-weight: 600;">Make Payment</a></p>
        <p>Please write us briefly once you have completed both the check-in and the payment, so we can send you your pin code 🔑 for the entrance door.</p>
        <p>Thank you!</p>
        <p>We look forward to seeing you soon!</p>
      `;
                text = `
Hello ${reservation.guestName},

We are pleased to welcome you to La Familia Hostel! 🎊

In case that you arrive after 18:00 or before 09:00, our recepcion 🛎️ will be closed.

We would then kindly ask you to complete check-in & payment online in advance:

Check-In:

${checkInLink}

Please make the payment in advance:

${paymentLink}

Please write us briefly once you have completed both the check-in and the payment, so we can send you your pin code 🔑 for the entrance door.

Thank you!

We look forward to seeing you soon!
      `;
            }
            else {
                // Spanische Version
                subject = 'Bienvenido a La Familia Hostel - Check-in en línea';
                content = `
        <p>Hola ${reservation.guestName},</p>
        <p>¡Nos complace darte la bienvenida a La Familia Hostel! 🎊</p>
        <p>En caso de que llegues después de las 18:00 o antes de las 09:00, nuestra recepción 🛎️ estará cerrada.</p>
        <p>Te pedimos amablemente que completes el check-in y el pago en línea con anticipación:</p>
        <p><strong>Check-In:</strong> <a href="${checkInLink}" style="color: ${linkColor}; text-decoration: none; font-weight: 600;">Check-in en línea</a></p>
        <p><strong>Por favor, realiza el pago por adelantado:</strong> <a href="${paymentLink}" style="color: ${linkColor}; text-decoration: none; font-weight: 600;">Realizar pago</a></p>
        <p>Por favor, escríbenos brevemente una vez que hayas completado tanto el check-in como el pago, para que podamos enviarte tu código PIN 🔑 para la puerta de entrada.</p>
        <p>¡Gracias!</p>
        <p>¡Esperamos verte pronto!</p>
      `;
                text = `
Hola ${reservation.guestName},

¡Nos complace darte la bienvenida a La Familia Hostel! 🎊

En caso de que llegues después de las 18:00 o antes de las 09:00, nuestra recepción 🛎️ estará cerrada.

Te pedimos amablemente que completes el check-in y el pago en línea con anticipación:

Check-In:

${checkInLink}

Por favor, realiza el pago por adelantado:

${paymentLink}

Por favor, escríbenos brevemente una vez que hayas completado tanto el check-in como el pago, para que podamos enviarte tu código PIN 🔑 para la puerta de entrada.

¡Gracias!

¡Esperamos verte pronto!
      `;
            }
            const html = (0, emailService_1.generateEmailTemplate)({
                logo,
                branding,
                headerTitle: organizationName,
                content,
                language: languageCode
            });
            yield (0, emailService_1.sendEmail)(reservation.guestEmail, subject, html, text, reservation.organizationId, reservation.branchId || undefined);
        });
    }
    /**
     * Sendet Check-in-Bestätigung per E-Mail
     */
    static sendCheckInConfirmationEmail(reservation, doorPin, doorAppName) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // Ermittle Sprache für Übersetzungen
            const { CountryLanguageService } = require('./countryLanguageService');
            const languageCode = CountryLanguageService.getLanguageForReservation({
                guestNationality: reservation.guestNationality,
                guestPhone: reservation.guestPhone
            });
            // Lade roomDescription aus Branch-Settings (falls categoryId vorhanden)
            const roomDescription = yield this.loadRoomDescriptionFromBranchSettings(reservation, languageCode);
            // NEU: Lade Template aus Branch Settings
            const template = yield this.getMessageTemplate(reservation.branchId, reservation.organizationId, 'checkInConfirmation', languageCode);
            // Formatiere roomDisplay: Dorm = roomNumber (bereits "Zimmername (Bettnummer)"), Private = roomDescription
            const isDorm = reservation.roomNumber !== null && reservation.roomNumber.trim() !== '';
            const roomDisplay = isDorm
                ? ((_a = reservation.roomNumber) === null || _a === void 0 ? void 0 : _a.trim()) || 'N/A'
                : ((_b = reservation.roomDescription) === null || _b === void 0 ? void 0 : _b.trim()) || 'N/A';
            // Formatiere roomDescription für Template (nur wenn vorhanden)
            const descriptionLabel = languageCode === 'en' ? 'Description' : languageCode === 'es' ? 'Descripción' : 'Beschreibung';
            const formattedRoomDescription = roomDescription && roomDescription !== 'N/A'
                ? `- ${descriptionLabel}: ${roomDescription}`
                : '';
            // Ersetze Variablen im Template
            // WICHTIG: Ersetze auch {{doorAppName}} durch leeren String (falls in Datenbank-Template vorhanden)
            let emailContent = template
                ? this.replaceTemplateVariables(template.emailContent, {
                    guestName: reservation.guestName,
                    roomDisplay: roomDisplay,
                    roomDescription: formattedRoomDescription,
                    doorPin: doorPin || 'N/A',
                    doorAppName: '' // Entferne {{doorAppName}} komplett
                })
                : null;
            // Falls Template kein {{roomDescription}} enthält, füge es hinzu
            if (emailContent && formattedRoomDescription && !emailContent.includes(formattedRoomDescription)) {
                // Suche nach roomDisplay-Zeile und füge roomDescription danach ein
                if (languageCode === 'en') {
                    emailContent = emailContent.replace(/(- Room: [^\n]+)/g, `$1\n${formattedRoomDescription}`);
                }
                else if (languageCode === 'es') {
                    emailContent = emailContent.replace(/(- Habitación: [^\n]+)/g, `$1\n${formattedRoomDescription}`);
                }
                else {
                    emailContent = emailContent.replace(/(- Zimmer: [^\n]+)/g, `$1\n${formattedRoomDescription}`);
                }
            }
            // Finale Ersetzung: Falls emailContent noch null ist, verwende Fallback
            if (!emailContent) {
                emailContent = `Hola ${reservation.guestName},

¡Tu check-in se ha completado exitosamente!

Información de tu habitación:
- Habitación: ${roomDisplay}

${doorPin ? `Acceso:
- PIN de la puerta: ${doorPin}
` : ''}

¡Te deseamos una estancia agradable!`;
            }
            const subject = (template === null || template === void 0 ? void 0 : template.emailSubject) || 'Ihr Check-in ist abgeschlossen - Zimmerinformationen';
            // Lade Logo + Branding (nutzt gespeichertes Branding, keine API-Calls)
            const { logo, branding } = yield (0, emailService_1.getOrganizationBranding)(reservation.organizationId, reservation.branchId || undefined);
            // Lade Organisationsname für Header
            let organizationName = 'La Familia Hostel';
            if (reservation.organizationId) {
                const organization = yield prisma_1.prisma.organization.findUnique({
                    where: { id: reservation.organizationId },
                    select: { displayName: true, name: true }
                });
                if (organization === null || organization === void 0 ? void 0 : organization.displayName) {
                    organizationName = organization.displayName;
                }
                else if (organization === null || organization === void 0 ? void 0 : organization.name) {
                    organizationName = organization.name;
                }
            }
            // Konvertiere Plain-Text zu HTML
            const emailHtmlContent = emailContent
                .replace(/\n/g, '<br>');
            const html = (0, emailService_1.generateEmailTemplate)({
                logo,
                branding,
                headerTitle: organizationName,
                content: emailHtmlContent,
                language: languageCode
            });
            yield (0, emailService_1.sendEmail)(reservation.guestEmail, subject, html, emailContent, reservation.organizationId, reservation.branchId || undefined);
        });
    }
}
exports.ReservationNotificationService = ReservationNotificationService;
//# sourceMappingURL=reservationNotificationService.js.map