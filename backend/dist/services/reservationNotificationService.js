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
exports.ReservationNotificationService = void 0;
const client_1 = require("@prisma/client");
const lobbyPmsService_1 = require("./lobbyPmsService");
const whatsappService_1 = require("./whatsappService");
const boldPaymentService_1 = require("./boldPaymentService");
const ttlockService_1 = require("./ttlockService");
const emailService_1 = require("./emailService");
const prisma = new client_1.PrismaClient();
/**
 * Service für automatische Benachrichtigungen zu Reservierungen
 *
 * Orchestriert E-Mail/WhatsApp-Versand, Zahlungslinks und Türsystem-PINs
 */
class ReservationNotificationService {
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
                                // Erstelle Check-in-Link
                                const checkInLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/check-in/${reservation.id}`;
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
                                ttlLockId: lockId,
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