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
const prisma = new client_1.PrismaClient();
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
                yield prisma.reservationNotificationLog.create({
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
                const organizations = yield prisma.organization.findMany({
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
                        const lobbyPmsService = new lobbyPmsService_1.LobbyPmsService(organization.id);
                        const tomorrowReservations = yield lobbyPmsService.fetchTomorrowReservations(lateCheckInThreshold);
                        console.log(`[ReservationNotification] Gefunden: ${tomorrowReservations.length} Reservierungen`);
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
                                const boldPaymentService = new boldPaymentService_1.BoldPaymentService(organization.id);
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
                                    const whatsappService = new whatsappService_1.WhatsAppService(organization.id);
                                    yield whatsappService.sendCheckInInvitation(reservation.guestName, reservation.guestPhone, checkInLink, paymentLink);
                                }
                                // Markiere als versendet
                                yield prisma.reservation.update({
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
                const reservation = yield prisma.reservation.findUnique({
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
                // Schritt 1: Payment-Link erstellen oder bestehenden verwenden (wenn Telefonnummer vorhanden)
                if (guestPhone) {
                    // Verwende bestehenden Payment-Link, falls vorhanden
                    if (reservation.paymentLink) {
                        paymentLink = reservation.paymentLink;
                        console.log(`[ReservationNotification] ✅ Verwende bestehenden Payment-Link: ${paymentLink}`);
                    }
                    else {
                        // Erstelle neuen Payment-Link nur wenn keiner existiert
                        try {
                            console.log(`[ReservationNotification] Erstelle Payment-Link für Reservierung ${reservationId}...`);
                            const boldPaymentService = new boldPaymentService_1.BoldPaymentService(reservation.organizationId);
                            // Konvertiere amount zu number (falls Decimal)
                            const amountNumber = typeof amount === 'number' ? amount : Number(amount);
                            paymentLink = yield boldPaymentService.createPaymentLink(reservation, amountNumber, currency, `Zahlung für Reservierung ${reservation.guestName}`);
                            console.log(`[ReservationNotification] ✅ Payment-Link erstellt: ${paymentLink}`);
                        }
                        catch (error) {
                            console.error(`[ReservationNotification] ❌ Fehler beim Erstellen des Payment-Links:`, error);
                            errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim Erstellen des Payment-Links';
                            // Payment-Link-Fehler ist kritisch - wir können ohne Payment-Link nicht weitermachen
                            throw new Error(`Payment-Link konnte nicht erstellt werden: ${errorMessage}`);
                        }
                    }
                }
                // Schritt 2: Check-in-Link erstellen
                try {
                    // Erstelle temporäre Reservation mit guestEmail für Check-in-Link-Generierung
                    const reservationForCheckInLink = {
                        id: reservation.id,
                        guestEmail: guestEmail || reservation.guestEmail || ''
                    };
                    checkInLink = (0, checkInLinkUtils_1.generateLobbyPmsCheckInLink)(reservationForCheckInLink) ||
                        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/check-in/${reservation.id}`;
                    console.log(`[ReservationNotification] ✅ Check-in-Link erstellt: ${checkInLink}`);
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
                        const whatsappService = new whatsappService_1.WhatsAppService(reservation.organizationId);
                        // Basis-Template-Name (wird in sendMessageWithFallback basierend auf Sprache angepasst)
                        // Spanisch: reservation_checkin_invitation, Englisch: reservation_checkin_invitation_
                        const templateName = process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_checkin_invitation';
                        const templateParams = [
                            reservation.guestName,
                            checkInLink,
                            paymentLink
                        ];
                        console.log(`[ReservationNotification] Template Name (Basis): ${templateName}`);
                        console.log(`[ReservationNotification] Template Params: ${JSON.stringify(templateParams)}`);
                        const whatsappSuccess = yield whatsappService.sendMessageWithFallback(guestPhone, sentMessage, templateName, templateParams);
                        if (!whatsappSuccess) {
                            throw new Error('WhatsApp-Nachricht konnte nicht versendet werden (sendMessageWithFallback gab false zurück)');
                        }
                        sentMessageAt = new Date();
                        success = true;
                        console.log(`[ReservationNotification] ✅ WhatsApp-Nachricht erfolgreich versendet`);
                        // Log erfolgreiche Notification
                        yield this.logNotification(reservationId, 'invitation', 'whatsapp', true, {
                            sentTo: guestPhone,
                            message: sentMessage,
                            paymentLink: paymentLink,
                            checkInLink: checkInLink
                        });
                    }
                    catch (error) {
                        console.error(`[ReservationNotification] ❌ Fehler beim Versenden der WhatsApp-Nachricht:`, error);
                        errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim Versenden der WhatsApp-Nachricht';
                        // WhatsApp-Fehler ist nicht kritisch - Links wurden bereits erstellt
                        // Wir speichern die Links trotzdem, aber Status bleibt auf 'confirmed'
                        // Log fehlgeschlagene Notification
                        yield this.logNotification(reservationId, 'invitation', 'whatsapp', false, {
                            sentTo: guestPhone,
                            message: sentMessage || undefined,
                            paymentLink: paymentLink || undefined,
                            checkInLink: checkInLink || undefined,
                            errorMessage: errorMessage
                        });
                    }
                }
                // Schritt 4: Reservation aktualisieren
                try {
                    const updateData = {
                        paymentLink: paymentLink || undefined,
                    };
                    // Nur Status auf 'notification_sent' setzen, wenn WhatsApp erfolgreich war
                    if (success && sentMessage) {
                        updateData.sentMessage = sentMessage;
                        updateData.sentMessageAt = sentMessageAt;
                        updateData.status = 'notification_sent';
                    }
                    else if (paymentLink) {
                        // Payment-Link wurde erstellt, aber WhatsApp fehlgeschlagen
                        // Status bleibt auf 'confirmed', aber Payment-Link wird gespeichert
                        console.log(`[ReservationNotification] ⚠️ Payment-Link gespeichert, aber WhatsApp fehlgeschlagen - Status bleibt auf 'confirmed'`);
                    }
                    yield prisma.reservation.update({
                        where: { id: reservationId },
                        data: updateData,
                    });
                    console.log(`[ReservationNotification] ✅ Reservierung ${reservationId} erfolgreich aktualisiert`);
                }
                catch (error) {
                    console.error(`[ReservationNotification] ❌ Fehler beim Aktualisieren der Reservierung:`, error);
                    // Fehler beim Update ist kritisch
                    throw error;
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
            var _a, _b, _c, _d;
            try {
                const reservation = yield prisma.reservation.findUnique({
                    where: { id: reservationId },
                    include: { organization: true }
                });
                if (!reservation) {
                    throw new Error(`Reservierung ${reservationId} nicht gefunden`);
                }
                // Entschlüssele Settings
                const { decryptApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                console.log(`[ReservationNotification] Entschlüssele Settings für Reservation ${reservationId}...`);
                const decryptedSettings = decryptApiSettings(reservation.organization.settings);
                const notificationChannels = ((_a = decryptedSettings === null || decryptedSettings === void 0 ? void 0 : decryptedSettings.lobbyPms) === null || _a === void 0 ? void 0 : _a.notificationChannels) || ['email'];
                console.log(`[ReservationNotification] Notification Channels:`, notificationChannels);
                console.log(`[ReservationNotification] Guest Phone: ${reservation.guestPhone || 'N/A'}`);
                console.log(`[ReservationNotification] Settings entschlüsselt:`, {
                    hasDoorSystem: !!(decryptedSettings === null || decryptedSettings === void 0 ? void 0 : decryptedSettings.doorSystem),
                    doorSystemProvider: (_b = decryptedSettings === null || decryptedSettings === void 0 ? void 0 : decryptedSettings.doorSystem) === null || _b === void 0 ? void 0 : _b.provider,
                    doorSystemLockIds: (_c = decryptedSettings === null || decryptedSettings === void 0 ? void 0 : decryptedSettings.doorSystem) === null || _c === void 0 ? void 0 : _c.lockIds
                });
                // Erstelle TTLock Passcode
                let doorPin = null;
                let doorAppName = null;
                console.log(`[ReservationNotification] Starte PIN-Generierung für Reservation ${reservationId}...`);
                try {
                    const ttlockService = new ttlockService_1.TTLockService(reservation.organizationId);
                    const doorSystemSettings = decryptedSettings === null || decryptedSettings === void 0 ? void 0 : decryptedSettings.doorSystem;
                    console.log(`[ReservationNotification] Door System Settings:`, {
                        hasDoorSystem: !!doorSystemSettings,
                        hasLockIds: !!(doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds),
                        lockIds: doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds,
                        lockIdsLength: ((_d = doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds) === null || _d === void 0 ? void 0 : _d.length) || 0
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
                        yield prisma.reservation.update({
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
                if (notificationChannels.includes('email') && reservation.guestEmail) {
                    try {
                        yield this.sendCheckInConfirmationEmail(reservation, doorPin, doorAppName);
                    }
                    catch (error) {
                        console.error(`[ReservationNotification] Fehler beim Versenden der E-Mail:`, error);
                        // Weiter ohne E-Mail
                    }
                }
                if (notificationChannels.includes('whatsapp') && reservation.guestPhone) {
                    try {
                        const whatsappService = new whatsappService_1.WhatsAppService(reservation.organizationId);
                        const whatsappSuccess = yield whatsappService.sendCheckInConfirmation(reservation.guestName, reservation.guestPhone, reservation.roomNumber || 'N/A', reservation.roomDescription || 'N/A', doorPin || 'N/A', doorAppName || 'TTLock');
                        if (whatsappSuccess) {
                            console.log(`[ReservationNotification] ✅ WhatsApp-Nachricht erfolgreich versendet für Reservierung ${reservationId}`);
                        }
                        else {
                            console.warn(`[ReservationNotification] ⚠️ WhatsApp-Nachricht konnte nicht versendet werden für Reservierung ${reservationId}`);
                        }
                    }
                    catch (error) {
                        console.error(`[ReservationNotification] ❌ Fehler beim Versenden der WhatsApp-Nachricht:`, error);
                        if (error instanceof Error) {
                            console.error(`[ReservationNotification] Fehlermeldung: ${error.message}`);
                        }
                        // Weiter ohne WhatsApp - PIN wurde bereits generiert (oder versucht)
                    }
                }
                else {
                    if (!notificationChannels.includes('whatsapp')) {
                        console.log(`[ReservationNotification] WhatsApp nicht in Notification Channels für Reservierung ${reservationId}`);
                    }
                    if (!reservation.guestPhone) {
                        console.log(`[ReservationNotification] Keine Guest Phone für Reservierung ${reservationId}`);
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
     * Sendet Check-in-Bestätigung nach erfolgreichem Check-in
     *
     * @param reservationId - ID der Reservierung
     */
    static sendCheckInConfirmation(reservationId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const reservation = yield prisma.reservation.findUnique({
                    where: { id: reservationId },
                    include: { organization: true }
                });
                if (!reservation) {
                    throw new Error(`Reservierung ${reservationId} nicht gefunden`);
                }
                if (reservation.status !== client_1.ReservationStatus.checked_in) {
                    throw new Error(`Reservierung ${reservationId} ist nicht eingecheckt`);
                }
                const settings = reservation.organization.settings;
                const notificationChannels = ((_a = settings === null || settings === void 0 ? void 0 : settings.lobbyPms) === null || _a === void 0 ? void 0 : _a.notificationChannels) || ['email'];
                // Erstelle TTLock Passcode
                let doorPin = null;
                let doorAppName = null;
                try {
                    const ttlockService = new ttlockService_1.TTLockService(reservation.organizationId);
                    const doorSystemSettings = settings === null || settings === void 0 ? void 0 : settings.doorSystem;
                    if ((doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds) && doorSystemSettings.lockIds.length > 0) {
                        const lockId = doorSystemSettings.lockIds[0]; // Verwende ersten Lock
                        doorAppName = 'TTLock'; // Oder aus Settings: doorSystemSettings.appName
                        // Erstelle Passcode für Check-in bis Check-out
                        doorPin = yield ttlockService.createTemporaryPasscode(lockId, reservation.checkInDate, reservation.checkOutDate, `Guest: ${reservation.guestName}`);
                        // Speichere in Reservierung
                        yield prisma.reservation.update({
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
                if (notificationChannels.includes('whatsapp') && reservation.guestPhone) {
                    const whatsappService = new whatsappService_1.WhatsAppService(reservation.organizationId);
                    yield whatsappService.sendCheckInConfirmation(reservation.guestName, reservation.guestPhone, reservation.roomNumber || 'N/A', reservation.roomDescription || 'N/A', doorPin || 'N/A', doorAppName || 'TTLock');
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
            const subject = 'Willkommen bei La Familia Hostel - Online Check-in';
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
          <p>¡Nos complace darte la bienvenida a La Familia Hostel!</p>
          <p>Como llegarás después de las 22:00, puedes realizar el check-in en línea ahora:</p>
          <p><a href="${checkInLink}" class="button">Online Check-in</a></p>
          <p>Por favor, realiza el pago por adelantado:</p>
          <p><a href="${paymentLink}" class="button">Zahlung durchführen</a></p>
          <p>¡Te esperamos mañana!</p>
        </div>
      </body>
      </html>
    `;
            const text = `
Hola ${reservation.guestName},

¡Nos complace darte la bienvenida a La Familia Hostel!

Como llegarás después de las 22:00, puedes realizar el check-in en línea ahora:
${checkInLink}

Por favor, realiza el pago por adelantado:
${paymentLink}

¡Te esperamos mañana!
    `;
            yield (0, emailService_1.sendEmail)(reservation.guestEmail, subject, html, text, reservation.organizationId);
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
            yield (0, emailService_1.sendEmail)(reservation.guestEmail, subject, html, text, reservation.organizationId);
        });
    }
}
exports.ReservationNotificationService = ReservationNotificationService;
//# sourceMappingURL=reservationNotificationService.js.map