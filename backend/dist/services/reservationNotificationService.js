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
/**
 * Service für automatische Benachrichtigungen zu Reservierungen
 *
 * Orchestriert E-Mail/WhatsApp-Versand, Zahlungslinks und Türsystem-PINs
 */
class ReservationNotificationService {
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
                console.log(`[ReservationNotification] ✅ Log-Eintrag erstellt für Reservation ${reservationId}, Type: ${notificationType}, Success: ${success}`);
            }
            catch (error) {
                // Log-Fehler sollten nicht die Hauptfunktionalität beeinträchtigen
                console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags:`, error);
            }
        });
    }
    /**
     * Sendet Check-in-Einladungen an Gäste mit späten Ankünften
     *
     * Wird täglich um 20:00 Uhr ausgeführt
     * Sendet an Gäste mit Ankunft am nächsten Tag nach 22:00 Uhr
     */
    static sendLateCheckInInvitations() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('[ReservationNotification] Starte Versand von Check-in-Einladungen...');
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
                        const lateCheckInThreshold = lobbyPmsSettings.lateCheckInThreshold || '22:00';
                        const notificationChannels = lobbyPmsSettings.notificationChannels || ['email'];
                        console.log(`[ReservationNotification] Verarbeite Organisation ${organization.id}...`);
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
                                            console.log(`[ReservationNotification] Einladung bereits versendet für Reservierung ${reservation.id}`);
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
                                        console.log(`[ReservationNotification] Einladung versendet für Reservierung ${reservation.id}`);
                                    }
                                    catch (error) {
                                        console.error(`[ReservationNotification] Fehler bei Reservierung ${lobbyReservation.id}:`, error);
                                        // Weiter mit nächster Reservierung
                                    }
                                }
                            }
                            catch (error) {
                                console.error(`[ReservationNotification] Fehler bei Branch ${branch.id}:`, error);
                                // Weiter mit nächstem Branch
                            }
                        }
                        console.log(`[ReservationNotification] Organisation ${organization.id}: ${totalReservations} Reservierungen verarbeitet`);
                    }
                    catch (error) {
                        console.error(`[ReservationNotification] Fehler bei Organisation ${organization.id}:`, error);
                        // Weiter mit nächster Organisation
                    }
                }
                console.log('[ReservationNotification] Versand abgeschlossen');
            }
            catch (error) {
                console.error('[ReservationNotification] Fehler beim Versand:', error);
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
                        console.log(`[ReservationNotification] ✅ Verwende bestehenden Payment-Link: ${paymentLink}`);
                    }
                    else {
                        // Erstelle neuen Payment-Link nur wenn keiner existiert
                        try {
                            console.log(`[ReservationNotification] Erstelle Payment-Link für Reservierung ${reservationId}...`);
                            const boldPaymentService = reservation.branchId
                                ? yield boldPaymentService_1.BoldPaymentService.createForBranch(reservation.branchId)
                                : new boldPaymentService_1.BoldPaymentService(reservation.organizationId);
                            // Konvertiere amount zu number (falls Decimal)
                            const amountNumber = typeof amount === 'number' ? amount : Number(amount);
                            paymentLink = yield boldPaymentService.createPaymentLink(reservation, amountNumber, currency, `Zahlung für Reservierung ${reservation.guestName}`);
                            console.log(`[ReservationNotification] ✅ Payment-Link erstellt: ${paymentLink}`);
                        }
                        catch (error) {
                            console.error(`[ReservationNotification] ❌ Fehler beim Erstellen des Payment-Links:`, error);
                            errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim Erstellen des Payment-Links';
                            // Payment-Link-Fehler: Log erstellen, aber nicht abbrechen
                            // Wir versuchen trotzdem weiterzumachen (z.B. für E-Mail-Versand)
                            try {
                                yield this.logNotification(reservationId, 'invitation', guestPhone ? 'whatsapp' : (guestEmail ? 'email' : 'both'), false, {
                                    sentTo: guestPhone || guestEmail || undefined,
                                    errorMessage: `Payment-Link konnte nicht erstellt werden: ${errorMessage}`
                                });
                            }
                            catch (logError) {
                                console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für Payment-Link-Fehler:`, logError);
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
                    console.log(`[ReservationNotification] ✅ Check-in-Link erstellt (mit Original-E-Mail): ${checkInLink}`);
                }
                catch (error) {
                    console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Check-in-Links:`, error);
                    // Check-in-Link-Fehler ist nicht kritisch - verwende Fallback
                    checkInLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/check-in/${reservation.id}`;
                }
                // Schritt 3: WhatsApp-Nachricht senden (wenn Telefonnummer vorhanden)
                if (guestPhone && paymentLink) {
                    try {
                        console.log(`[ReservationNotification] Sende WhatsApp-Nachricht für Reservierung ${reservationId}...`);
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
                            // Standard-Nachricht
                            sentMessage = `Hola ${reservation.guestName},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada.
Cargos: ${amount} ${currency}

Puedes realizar el check-in en línea ahora:
${checkInLink}

Por favor, realiza el pago:
${paymentLink}

¡Te esperamos!`;
                        }
                        const whatsappService = reservation.branchId
                            ? new whatsappService_1.WhatsAppService(undefined, reservation.branchId)
                            : new whatsappService_1.WhatsAppService(reservation.organizationId);
                        // WICHTIG: Für Reservation-Einladungen verwenden wir DIREKT Template Messages
                        // Grund: Das 24h-Fenster ist bei neuen Reservierungen meist nicht aktiv
                        // Template Messages funktionieren immer, unabhängig vom 24h-Fenster
                        // Basis-Template-Name (wird basierend auf Sprache angepasst)
                        // Spanisch: reservation_checkin_invitation, Englisch: reservation_checkin_invitation_
                        const baseTemplateName = process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_checkin_invitation';
                        const templateParams = [
                            reservation.guestName,
                            checkInLink,
                            paymentLink
                        ];
                        console.log(`[ReservationNotification] Verwende DIREKT Template Message (kein Session Message Fallback)`);
                        console.log(`[ReservationNotification] Template Name (Basis): ${baseTemplateName}`);
                        console.log(`[ReservationNotification] Template Params: ${JSON.stringify(templateParams)}`);
                        // Sende direkt als Template Message (ohne Session Message zu versuchen)
                        const templateResult = yield whatsappService.sendTemplateMessageDirectly(guestPhone, baseTemplateName, templateParams, sentMessage, // Wird ignoriert, nur für Kompatibilität
                        {
                            guestNationality: reservation.guestNationality,
                            guestPhone: reservation.guestPhone
                        });
                        if (!templateResult) {
                            throw new Error('Template Message konnte nicht versendet werden');
                        }
                        sentMessageAt = new Date();
                        whatsappSuccess = true;
                        console.log(`[ReservationNotification] ✅ WhatsApp-Nachricht erfolgreich versendet`);
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
                            console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche Notification:`, logError);
                            // Log-Fehler sollte nicht die Hauptfunktionalität beeinträchtigen
                        }
                    }
                    catch (error) {
                        console.error(`[ReservationNotification] ❌ Fehler beim Versenden der WhatsApp-Nachricht:`, error);
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
                            console.error(`[ReservationNotification] ⚠️ KRITISCH: Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene Notification:`, logError);
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
                        console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags (kein Payment-Link):`, logError);
                    }
                }
                // Schritt 3b: Email senden (wenn Email-Adresse vorhanden)
                if (guestEmail && checkInLink && paymentLink) {
                    let emailMessage = '';
                    try {
                        console.log(`[ReservationNotification] Sende Email für Reservierung ${reservationId}...`);
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
                            // Standard-Nachricht (gleicher Text wie WhatsApp)
                            emailMessage = `Hola ${reservation.guestName},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada.
Cargos: ${amount} ${currency}

Puedes realizar el check-in en línea ahora:
${checkInLink}

Por favor, realiza el pago:
${paymentLink}

¡Te esperamos!`;
                            // Setze auch sentMessage für Reservation-Update
                            sentMessage = emailMessage;
                        }
                        // Konvertiere Plain-Text zu HTML (ähnlich wie sendCheckInInvitationEmail)
                        // Ersetze Links im Text durch HTML-Links
                        let emailHtmlContent = emailMessage
                            .replace(/\n/g, '<br>')
                            .replace(new RegExp(checkInLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `<a href="${checkInLink}" style="color: #007bff; text-decoration: none; font-weight: bold;">${checkInLink}</a>`)
                            .replace(new RegExp(paymentLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `<a href="${paymentLink}" style="color: #007bff; text-decoration: none; font-weight: bold;">${paymentLink}</a>`);
                        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .container {
                  background-color: #f9fafb;
                  padding: 30px;
                  border-radius: 8px;
                  border: 1px solid #e5e7eb;
                }
                .button {
                  display: inline-block;
                  padding: 12px 24px;
                  background-color: #007bff;
                  color: white;
                  text-decoration: none;
                  border-radius: 4px;
                  margin: 10px 5px;
                }
                .button:hover {
                  background-color: #0056b3;
                }
                .button-container {
                  text-align: center;
                  margin: 20px 0;
                }
                .footer {
                  text-align: center;
                  margin-top: 30px;
                  color: #6b7280;
                  font-size: 12px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                ${emailHtmlContent}
                <div class="button-container">
                  <a href="${checkInLink}" class="button">Online Check-in</a>
                  <a href="${paymentLink}" class="button">Zahlung durchführen</a>
                </div>
              </div>
              <div class="footer">
                <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.</p>
              </div>
            </body>
            </html>
          `;
                        // Versende Email
                        const emailSent = yield (0, emailService_1.sendEmail)(guestEmail, 'Tu reserva ha sido confirmada - La Familia Hostel', emailHtml, emailMessage, reservation.organizationId, reservation.branchId || undefined);
                        if (emailSent) {
                            emailSuccess = true;
                            console.log(`[ReservationNotification] ✅ Email erfolgreich versendet`);
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
                                console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche Email-Notification:`, logError);
                            }
                        }
                        else {
                            throw new Error('Email konnte nicht versendet werden');
                        }
                    }
                    catch (error) {
                        console.error(`[ReservationNotification] ❌ Fehler beim Versenden der Email:`, error);
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
                            console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene Email-Notification:`, logError);
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
                        console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags (Email ohne Links):`, logError);
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
                        console.log(`[ReservationNotification] ⚠️ Payment-Link gespeichert, aber alle Notifications fehlgeschlagen - Status bleibt auf 'confirmed'`);
                    }
                    yield prisma_1.prisma.reservation.update({
                        where: { id: reservationId },
                        data: updateData,
                    });
                    console.log(`[ReservationNotification] ✅ Reservierung ${reservationId} erfolgreich aktualisiert`);
                }
                catch (error) {
                    console.error(`[ReservationNotification] ❌ Fehler beim Aktualisieren der Reservierung:`, error);
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
                        console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für Reservation-Update-Fehler:`, logError);
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
                console.error(`[ReservationNotification] Fehler beim Senden der Reservation-Einladung:`, error);
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
                    console.error(`[ReservationNotification] Fehler beim Loggen des kritischen Fehlers:`, logError);
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
                console.log(`[ReservationNotification] Entschlüssele Settings für Reservation ${reservationId}...`);
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
                console.log(`[ReservationNotification] Notification Channels:`, notificationChannels);
                console.log(`[ReservationNotification] Guest Phone: ${reservation.guestPhone || 'N/A'}`);
                console.log(`[ReservationNotification] Settings entschlüsselt:`, {
                    hasDoorSystem: !!doorSystemSettings,
                    doorSystemProvider: doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.provider,
                    doorSystemLockIds: doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds
                });
                // Erstelle TTLock Passcode
                let doorPin = null;
                let doorAppName = null;
                console.log(`[ReservationNotification] Starte PIN-Generierung für Reservation ${reservationId}...`);
                try {
                    const ttlockService = reservation.branchId
                        ? yield ttlockService_1.TTLockService.createForBranch(reservation.branchId)
                        : new ttlockService_1.TTLockService(reservation.organizationId);
                    console.log(`[ReservationNotification] Door System Settings:`, {
                        hasDoorSystem: !!doorSystemSettings,
                        hasLockIds: !!(doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds),
                        lockIds: doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds,
                        lockIdsLength: ((_c = doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds) === null || _c === void 0 ? void 0 : _c.length) || 0
                    });
                    if ((doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds) && doorSystemSettings.lockIds.length > 0) {
                        const lockId = doorSystemSettings.lockIds[0]; // Verwende ersten Lock
                        doorAppName = 'TTLock'; // Oder aus Settings: doorSystemSettings.appName
                        console.log(`[ReservationNotification] Erstelle TTLock Passcode für Lock ID: ${lockId}`);
                        console.log(`[ReservationNotification] Check-in Date: ${reservation.checkInDate}`);
                        console.log(`[ReservationNotification] Check-out Date: ${reservation.checkOutDate}`);
                        // WICHTIG: checkOutDate muss nach checkInDate liegen (mindestens 1 Tag später)
                        // Falls beide identisch sind (z.B. bei manuell erstellten Reservierungen), korrigiere
                        let actualCheckInDate = reservation.checkInDate;
                        let actualCheckOutDate = reservation.checkOutDate;
                        // Prüfe ob beide Daten identisch oder checkOutDate vor checkInDate liegt
                        if (actualCheckOutDate.getTime() <= actualCheckInDate.getTime()) {
                            console.warn(`[ReservationNotification] ⚠️ checkOutDate ist identisch oder vor checkInDate - korrigiere auf checkInDate + 1 Tag`);
                            actualCheckOutDate = new Date(actualCheckInDate);
                            actualCheckOutDate.setDate(actualCheckOutDate.getDate() + 1); // +1 Tag
                            console.log(`[ReservationNotification] Korrigierte Check-out Date: ${actualCheckOutDate}`);
                        }
                        // Erstelle Passcode für Check-in bis Check-out
                        doorPin = yield ttlockService.createTemporaryPasscode(lockId, actualCheckInDate, actualCheckOutDate, `Guest: ${reservation.guestName}`);
                        console.log(`[ReservationNotification] ✅ TTLock Passcode erfolgreich generiert: ${doorPin}`);
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
                        console.log(`[ReservationNotification] ✅ PIN in DB gespeichert für Reservation ${reservationId}`);
                    }
                    else {
                        console.warn(`[ReservationNotification] ⚠️ Keine Lock IDs konfiguriert für Reservation ${reservationId}`);
                    }
                }
                catch (error) {
                    console.error(`[ReservationNotification] ❌ Fehler beim Erstellen des TTLock Passcodes:`, error);
                    if (error instanceof Error) {
                        console.error(`[ReservationNotification] Fehlermeldung: ${error.message}`);
                        console.error(`[ReservationNotification] Stack: ${error.stack}`);
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
                        console.log(`[ReservationNotification] ✅ E-Mail erfolgreich versendet für Reservierung ${reservationId}`);
                        // Log erfolgreiche Email-Notification
                        try {
                            yield this.logNotification(reservationId, 'pin', 'email', true, {
                                sentTo: reservation.guestEmail,
                                message: messageText || undefined
                            });
                        }
                        catch (logError) {
                            console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche Email-Notification:`, logError);
                        }
                    }
                    catch (error) {
                        console.error(`[ReservationNotification] Fehler beim Versenden der E-Mail:`, error);
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
                            console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene Email-Notification:`, logError);
                        }
                    }
                }
                // ⚠️ TEMPORÄR DEAKTIVIERT: WhatsApp-Versendung nach TTLock-Webhook
                // TTLock-Code wird weiterhin erstellt und im Frontend angezeigt, aber nicht versendet
                if (notificationChannels.includes('whatsapp') && reservation.guestPhone) {
                    console.log(`[ReservationNotification] ⚠️ WhatsApp-Versendung temporär deaktiviert - TTLock-Code ${doorPin ? `(${doorPin})` : ''} wird nur im Frontend angezeigt`);
                    // TODO: Wieder aktivieren, wenn gewünscht
                    /*
                    try {
                      const whatsappService = reservation.branchId
                        ? new WhatsAppService(undefined, reservation.branchId)
                        : new WhatsAppService(reservation.organizationId);
                      const whatsappSuccessResult = await whatsappService.sendCheckInConfirmation(
                        reservation.guestName,
                        reservation.guestPhone,
                        reservation.roomNumber || 'N/A',
                        reservation.roomDescription || 'N/A',
                        doorPin || 'N/A',
                        doorAppName || 'TTLock',
                        {
                          guestNationality: reservation.guestNationality,
                          guestPhone: reservation.guestPhone
                        }
                      );
                      whatsappSuccess = whatsappSuccessResult;
                      
                      if (whatsappSuccess) {
                        console.log(`[ReservationNotification] ✅ WhatsApp-Nachricht erfolgreich versendet für Reservierung ${reservationId}`);
                        
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
                          console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche WhatsApp-Notification:`, logError);
                        }
                      } else {
                        console.warn(`[ReservationNotification] ⚠️ WhatsApp-Nachricht konnte nicht versendet werden für Reservierung ${reservationId}`);
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
                          console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene WhatsApp-Notification:`, logError);
                        }
                      }
                    } catch (error) {
                      console.error(`[ReservationNotification] ❌ Fehler beim Versenden der WhatsApp-Nachricht:`, error);
                      whatsappError = error instanceof Error ? error.message : 'Unbekannter Fehler beim Versenden der WhatsApp-Nachricht';
                    }
                    */
                }
                else {
                    if (!notificationChannels.includes('whatsapp')) {
                        console.log(`[ReservationNotification] WhatsApp nicht in Notification Channels für Reservierung ${reservationId}`);
                    }
                    if (!reservation.guestPhone) {
                        console.log(`[ReservationNotification] Keine Guest Phone für Reservierung ${reservationId}`);
                    }
                }
                // Log auch wenn PIN nicht generiert werden konnte
                if (!doorPin) {
                    console.warn(`[ReservationNotification] ⚠️ PIN konnte nicht generiert werden für Reservierung ${reservationId}`);
                    try {
                        yield this.logNotification(reservationId, 'pin', reservation.guestPhone && reservation.guestEmail ? 'both' : (reservation.guestPhone ? 'whatsapp' : (reservation.guestEmail ? 'email' : 'whatsapp')), false, {
                            sentTo: reservation.guestPhone || reservation.guestEmail || undefined,
                            errorMessage: 'PIN konnte nicht generiert werden - keine Lock IDs konfiguriert oder Fehler beim Erstellen'
                        });
                    }
                    catch (logError) {
                        console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags (kein PIN):`, logError);
                    }
                }
                // Prüfe ob PIN tatsächlich generiert wurde
                if (doorPin) {
                    console.log(`[ReservationNotification] ✅ PIN generiert und Mitteilung versendet für Reservierung ${reservationId}`);
                }
                else {
                    console.warn(`[ReservationNotification] ⚠️ PIN konnte nicht generiert werden, aber Mitteilung versendet für Reservierung ${reservationId}`);
                }
            }
            catch (error) {
                console.error(`[ReservationNotification] Fehler beim Generieren des PIN-Codes und Versenden der Mitteilung:`, error);
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
            var _a, _b, _c;
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
                console.log(`[ReservationNotification] Entschlüssele Settings für Reservation ${reservationId}...`);
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
                console.log(`[ReservationNotification] Notification Channels:`, notificationChannels);
                console.log(`[ReservationNotification] Guest Phone: ${finalGuestPhone || 'N/A'}`);
                console.log(`[ReservationNotification] Guest Email: ${finalGuestEmail || 'N/A'}`);
                console.log(`[ReservationNotification] Settings entschlüsselt:`, {
                    hasDoorSystem: !!doorSystemSettings,
                    doorSystemProvider: doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.provider,
                    doorSystemLockIds: doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds
                });
                // Erstelle TTLock Passcode
                let doorPin = null;
                let doorAppName = null;
                console.log(`[ReservationNotification] Starte Passcode-Generierung für Reservation ${reservationId}...`);
                try {
                    const ttlockService = reservation.branchId
                        ? yield ttlockService_1.TTLockService.createForBranch(reservation.branchId)
                        : new ttlockService_1.TTLockService(reservation.organizationId);
                    console.log(`[ReservationNotification] Door System Settings:`, {
                        hasDoorSystem: !!doorSystemSettings,
                        hasLockIds: !!(doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds),
                        lockIds: doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds,
                        lockIdsLength: ((_c = doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds) === null || _c === void 0 ? void 0 : _c.length) || 0
                    });
                    if ((doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds) && doorSystemSettings.lockIds.length > 0) {
                        const lockId = doorSystemSettings.lockIds[0]; // Verwende ersten Lock
                        doorAppName = 'TTLock'; // Oder aus Settings: doorSystemSettings.appName
                        console.log(`[ReservationNotification] Erstelle TTLock Passcode für Lock ID: ${lockId}`);
                        console.log(`[ReservationNotification] Check-in Date: ${reservation.checkInDate}`);
                        console.log(`[ReservationNotification] Check-out Date: ${reservation.checkOutDate}`);
                        // WICHTIG: checkOutDate muss nach checkInDate liegen (mindestens 1 Tag später)
                        // Falls beide identisch sind (z.B. bei manuell erstellten Reservierungen), korrigiere
                        let actualCheckInDate = reservation.checkInDate;
                        let actualCheckOutDate = reservation.checkOutDate;
                        // Prüfe ob beide Daten identisch oder checkOutDate vor checkInDate liegt
                        if (actualCheckOutDate.getTime() <= actualCheckInDate.getTime()) {
                            console.warn(`[ReservationNotification] ⚠️ checkOutDate ist identisch oder vor checkInDate - korrigiere auf checkInDate + 1 Tag`);
                            actualCheckOutDate = new Date(actualCheckInDate);
                            actualCheckOutDate.setDate(actualCheckOutDate.getDate() + 1); // +1 Tag
                            console.log(`[ReservationNotification] Korrigierte Check-out Date: ${actualCheckOutDate}`);
                        }
                        // Erstelle Passcode für Check-in bis Check-out
                        doorPin = yield ttlockService.createTemporaryPasscode(lockId, actualCheckInDate, actualCheckOutDate, `Guest: ${reservation.guestName}`);
                        console.log(`[ReservationNotification] ✅ TTLock Passcode erfolgreich generiert: ${doorPin}`);
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
                        console.log(`[ReservationNotification] ✅ PIN in DB gespeichert für Reservation ${reservationId}`);
                    }
                    else {
                        console.warn(`[ReservationNotification] ⚠️ Keine Lock IDs konfiguriert für Reservation ${reservationId}`);
                    }
                }
                catch (error) {
                    console.error(`[ReservationNotification] ❌ Fehler beim Erstellen des TTLock Passcodes:`, error);
                    if (error instanceof Error) {
                        console.error(`[ReservationNotification] Fehlermeldung: ${error.message}`);
                        console.error(`[ReservationNotification] Stack: ${error.stack}`);
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
                    // Standard-Nachricht
                    messageText = `Hola ${reservation.guestName},

¡Bienvenido a La Familia Hostel!

Tu código de acceso TTLock:
${doorPin || 'N/A'}

¡Te esperamos!`;
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
                        console.log(`[ReservationNotification] ✅ E-Mail erfolgreich versendet für Reservierung ${reservationId}`);
                        // Log erfolgreiche Email-Notification
                        try {
                            yield this.logNotification(reservationId, 'pin', 'email', true, {
                                sentTo: finalGuestEmail,
                                message: messageText || undefined
                            });
                        }
                        catch (logError) {
                            console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche Email-Notification:`, logError);
                        }
                    }
                    catch (error) {
                        console.error(`[ReservationNotification] Fehler beim Versenden der E-Mail:`, error);
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
                            console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene Email-Notification:`, logError);
                        }
                    }
                }
                // ⚠️ TEMPORÄR DEAKTIVIERT: WhatsApp-Versendung nach TTLock-Webhook
                // TTLock-Code wird weiterhin erstellt und im Frontend angezeigt, aber nicht versendet
                if (notificationChannels.includes('whatsapp') && finalGuestPhone) {
                    console.log(`[ReservationNotification] ⚠️ WhatsApp-Versendung temporär deaktiviert - TTLock-Code ${doorPin ? `(${doorPin})` : ''} wird nur im Frontend angezeigt`);
                    // TODO: Wieder aktivieren, wenn gewünscht
                    /*
                    try {
                      const whatsappService = reservation.branchId
                        ? new WhatsAppService(undefined, reservation.branchId)
                        : new WhatsAppService(reservation.organizationId);
                      
                      // Verwende customMessage wenn vorhanden, sonst Standard
                      if (options?.customMessage && doorPin) {
                        // Sende customMessage direkt
                        await whatsappService.sendMessageWithFallback(
                          finalGuestPhone,
                          messageText,
                          undefined, // Kein Template
                          undefined, // Keine Template-Parameter
                          {
                            guestNationality: reservation.guestNationality,
                            guestPhone: reservation.guestPhone
                          }
                        );
                        whatsappSuccess = true; // Erfolg annehmen, wenn keine Exception geworfen wurde
                      } else {
                        // Verwende Standard-Template
                        const whatsappSuccessResult = await whatsappService.sendCheckInConfirmation(
                          reservation.guestName,
                          finalGuestPhone,
                          reservation.roomNumber || 'N/A',
                          reservation.roomDescription || 'N/A',
                          doorPin || 'N/A',
                          doorAppName || 'TTLock'
                        );
                        whatsappSuccess = whatsappSuccessResult;
                      }
                      
                      if (whatsappSuccess) {
                        console.log(`[ReservationNotification] ✅ WhatsApp-Nachricht erfolgreich versendet für Reservierung ${reservationId}`);
                        
                        // Log erfolgreiche WhatsApp-Notification
                        try {
                          await this.logNotification(
                            reservationId,
                            'pin',
                            'whatsapp',
                            true,
                            {
                              sentTo: finalGuestPhone,
                              message: messageText || undefined
                            }
                          );
                        } catch (logError) {
                          console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche WhatsApp-Notification:`, logError);
                        }
                      } else {
                        console.warn(`[ReservationNotification] ⚠️ WhatsApp-Nachricht konnte nicht versendet werden für Reservierung ${reservationId}`);
                        whatsappError = 'WhatsApp-Nachricht konnte nicht versendet werden';
                        
                        // Log fehlgeschlagene WhatsApp-Notification
                        try {
                          await this.logNotification(
                            reservationId,
                            'pin',
                            'whatsapp',
                            false,
                            {
                              sentTo: finalGuestPhone,
                              message: messageText || undefined,
                              errorMessage: whatsappError
                            }
                          );
                        } catch (logError) {
                          console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene WhatsApp-Notification:`, logError);
                        }
                      }
                    } catch (error) {
                      console.error(`[ReservationNotification] ❌ Fehler beim Versenden der WhatsApp-Nachricht:`, error);
                      whatsappError = error instanceof Error ? error.message : 'Unbekannter Fehler beim Versenden der WhatsApp-Nachricht';
                      
                      // Log fehlgeschlagene WhatsApp-Notification
                      try {
                        await this.logNotification(
                          reservationId,
                          'pin',
                          'whatsapp',
                          false,
                          {
                            sentTo: finalGuestPhone,
                            message: messageText || undefined,
                            errorMessage: whatsappError
                          }
                        );
                      } catch (logError) {
                        console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene WhatsApp-Notification:`, logError);
                      }
                    }
                    */
                }
                else {
                    if (!notificationChannels.includes('whatsapp')) {
                        console.log(`[ReservationNotification] WhatsApp nicht in Notification Channels für Reservierung ${reservationId}`);
                    }
                    if (!finalGuestPhone) {
                        console.log(`[ReservationNotification] Keine Guest Phone für Reservierung ${reservationId}`);
                    }
                }
                // Log auch wenn PIN nicht generiert werden konnte
                if (!doorPin) {
                    console.warn(`[ReservationNotification] ⚠️ PIN konnte nicht generiert werden für Reservierung ${reservationId}`);
                    try {
                        yield this.logNotification(reservationId, 'pin', finalGuestPhone && finalGuestEmail ? 'both' : (finalGuestPhone ? 'whatsapp' : (finalGuestEmail ? 'email' : 'whatsapp')), false, {
                            sentTo: finalGuestPhone || finalGuestEmail || undefined,
                            errorMessage: 'PIN konnte nicht generiert werden - keine Lock IDs konfiguriert oder Fehler beim Erstellen'
                        });
                    }
                    catch (logError) {
                        console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags (kein PIN):`, logError);
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
                    console.log(`[ReservationNotification] ✅ Passcode generiert und Mitteilung versendet für Reservierung ${reservationId}`);
                }
                else {
                    console.warn(`[ReservationNotification] ⚠️ Passcode konnte nicht generiert werden, aber Mitteilung versendet für Reservierung ${reservationId}`);
                }
            }
            catch (error) {
                console.error(`[ReservationNotification] Fehler beim Versenden des Passcodes:`, error);
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
                    console.error(`[ReservationNotification] Fehler beim Erstellen des TTLock Passcodes:`, error);
                    // Weiter ohne PIN
                }
                // Versende Benachrichtigungen
                if (notificationChannels.includes('email') && reservation.guestEmail) {
                    yield this.sendCheckInConfirmationEmail(reservation, doorPin, doorAppName);
                }
                // ⚠️ TEMPORÄR DEAKTIVIERT: WhatsApp-Versendung nach TTLock-Webhook
                // TTLock-Code wird weiterhin erstellt und im Frontend angezeigt, aber nicht versendet
                if (notificationChannels.includes('whatsapp') && reservation.guestPhone) {
                    console.log(`[ReservationNotification] ⚠️ WhatsApp-Versendung temporär deaktiviert - TTLock-Code ${doorPin ? `(${doorPin})` : ''} wird nur im Frontend angezeigt`);
                    // TODO: Wieder aktivieren, wenn gewünscht
                    /*
                    const whatsappService = reservation.branchId
                      ? new WhatsAppService(undefined, reservation.branchId)
                      : new WhatsAppService(reservation.organizationId);
                    await whatsappService.sendCheckInConfirmation(
                      reservation.guestName,
                      reservation.guestPhone,
                      reservation.roomNumber || 'N/A',
                      reservation.roomDescription || 'N/A',
                      doorPin || 'N/A',
                      doorAppName || 'TTLock'
                    );
                    */
                }
                console.log(`[ReservationNotification] Check-in-Bestätigung versendet für Reservierung ${reservationId}`);
            }
            catch (error) {
                console.error(`[ReservationNotification] Fehler beim Versand der Check-in-Bestätigung:`, error);
                throw error;
            }
        });
    }
    /**
     * Sendet Check-in-Einladung per E-Mail
     */
    static sendCheckInInvitationEmail(reservation, checkInLink, paymentLink) {
        return __awaiter(this, void 0, void 0, function* () {
            // Bestimme Sprache basierend auf Gast-Nationalität (Standard: Spanisch)
            const isEnglish = reservation.guestNationality &&
                ['US', 'GB', 'UK', 'CA', 'AU', 'NZ', 'IE', 'ZA'].includes(reservation.guestNationality.toUpperCase());
            let subject;
            let html;
            let text;
            if (isEnglish) {
                // Englische Version
                subject = 'Welcome to La Familia Hostel - Online Check-in';
                html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin: 10px 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Hello ${reservation.guestName},</h1>
          <p>We are pleased to welcome you to La Familia Hostel! 🎊</p>
          <p>In case that you arrive after 18:00 or before 09:00, our recepcion 🛎️ will be closed.</p>
          <p>We would then kindly ask you to complete check-in & payment online in advance:</p>
          <p><strong>Check-In:</strong></p>
          <p><a href="${checkInLink}" class="button">Online Check-in</a></p>
          <p><strong>Please make the payment in advance:</strong></p>
          <p><a href="${paymentLink}" class="button">Make Payment</a></p>
          <p>Please write us briefly once you have completed both the check-in and the payment, so we can send you your pin code 🔑 for the entrance door.</p>
          <p>Thank you!</p>
          <p>We look forward to seeing you soon!</p>
        </div>
      </body>
      </html>
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
                subject = 'Willkommen bei La Familia Hostel - Online Check-in';
                html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin: 10px 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Hola ${reservation.guestName},</h1>
          <p>¡Nos complace darte la bienvenida a La Familia Hostel! 🎊</p>
          <p>En caso de que llegues después de las 18:00 o antes de las 09:00, nuestra recepción 🛎️ estará cerrada.</p>
          <p>Te pedimos amablemente que completes el check-in y el pago en línea con anticipación:</p>
          <p><strong>Check-In:</strong></p>
          <p><a href="${checkInLink}" class="button">Online Check-in</a></p>
          <p><strong>Por favor, realiza el pago por adelantado:</strong></p>
          <p><a href="${paymentLink}" class="button">Zahlung durchführen</a></p>
          <p>Por favor, escríbenos brevemente una vez que hayas completado tanto el check-in como el pago, para que podamos enviarte tu código PIN 🔑 para la puerta de entrada.</p>
          <p>¡Gracias!</p>
          <p>¡Esperamos verte pronto!</p>
        </div>
      </body>
      </html>
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
            yield (0, emailService_1.sendEmail)(reservation.guestEmail, subject, html, text, reservation.organizationId, reservation.branchId || undefined);
        });
    }
    /**
     * Sendet Check-in-Bestätigung per E-Mail
     */
    static sendCheckInConfirmationEmail(reservation, doorPin, doorAppName) {
        return __awaiter(this, void 0, void 0, function* () {
            const subject = 'Ihr Check-in ist abgeschlossen - Zimmerinformationen';
            const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .info-box {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Hola ${reservation.guestName},</h1>
          <p>¡Tu check-in se ha completado exitosamente!</p>
          <div class="info-box">
            <h3>Información de tu habitación:</h3>
            <p><strong>Habitación:</strong> ${reservation.roomNumber || 'N/A'}</p>
            <p><strong>Descripción:</strong> ${reservation.roomDescription || 'N/A'}</p>
          </div>
          ${doorPin ? `
          <div class="info-box">
            <h3>Acceso:</h3>
            <p><strong>PIN de la puerta:</strong> ${doorPin}</p>
            <p><strong>App:</strong> ${doorAppName || 'TTLock'}</p>
          </div>
          ` : ''}
          <p>¡Te deseamos una estancia agradable!</p>
        </div>
      </body>
      </html>
    `;
            const text = `
Hola ${reservation.guestName},

¡Tu check-in se ha completado exitosamente!

Información de tu habitación:
- Habitación: ${reservation.roomNumber || 'N/A'}
- Descripción: ${reservation.roomDescription || 'N/A'}

${doorPin ? `Acceso:
- PIN de la puerta: ${doorPin}
- App: ${doorAppName || 'TTLock'}
` : ''}

¡Te deseamos una estancia agradable!
    `;
            yield (0, emailService_1.sendEmail)(reservation.guestEmail, subject, html, text, reservation.organizationId, reservation.branchId || undefined);
        });
    }
}
exports.ReservationNotificationService = ReservationNotificationService;
//# sourceMappingURL=reservationNotificationService.js.map