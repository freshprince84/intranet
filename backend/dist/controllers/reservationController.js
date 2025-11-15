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
exports.getReservationById = exports.getAllReservations = exports.createReservation = exports.updateGuestContact = void 0;
const client_1 = require("@prisma/client");
const whatsappService_1 = require("../services/whatsappService");
const boldPaymentService_1 = require("../services/boldPaymentService");
const ttlockService_1 = require("../services/ttlockService");
const prisma = new client_1.PrismaClient();
/**
 * Utility: Erkennt ob ein String eine Telefonnummer oder Email ist
 */
function detectContactType(value) {
    // Email-Format: enthält @ und .
    if (value.includes('@') && value.includes('.')) {
        return 'email';
    }
    // Telefonnummer: enthält nur Ziffern, +, Leerzeichen, Bindestriche
    return 'phone';
}
/**
 * PUT /api/reservations/:id/guest-contact
 * Aktualisiert Telefonnummer/Email des Gastes und sendet WhatsApp-Nachricht
 */
const updateGuestContact = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { contact } = req.body; // Ein Feld: automatische Erkennung
        if (!contact || typeof contact !== 'string' || contact.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Kontaktinformation (Telefonnummer oder Email) ist erforderlich'
            });
        }
        const reservationId = parseInt(id, 10);
        if (isNaN(reservationId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Reservierungs-ID'
            });
        }
        // Hole Reservierung
        const reservation = yield prisma.reservation.findUnique({
            where: { id: reservationId },
            include: { organization: true }
        });
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservierung nicht gefunden'
            });
        }
        // Erkenne ob es Telefonnummer oder Email ist
        const contactType = detectContactType(contact.trim());
        const updateData = {
            status: 'notification_sent'
        };
        if (contactType === 'phone') {
            updateData.guestPhone = contact.trim();
        }
        else {
            updateData.guestEmail = contact.trim();
        }
        // Aktualisiere Reservierung
        const updatedReservation = yield prisma.reservation.update({
            where: { id: reservationId },
            data: updateData
        });
        // Sende WhatsApp-Nachricht (wenn Telefonnummer vorhanden)
        let sentMessage = null;
        let sentMessageAt = null;
        if (contactType === 'phone' && updatedReservation.guestPhone) {
            try {
                // Erstelle Zahlungslink
                const boldPaymentService = new boldPaymentService_1.BoldPaymentService(reservation.organizationId);
                // TODO: Hole Betrag aus Reservierung (aus syncHistory oder extra Feld)
                const amount = 360000; // Placeholder - sollte aus Reservierung kommen
                const paymentLink = yield boldPaymentService.createPaymentLink(updatedReservation, amount, 'COP', `Zahlung für Reservierung ${updatedReservation.guestName}`);
                // Erstelle TTLock Passcode (wenn konfiguriert)
                let ttlockCode = null;
                try {
                    const ttlockService = new ttlockService_1.TTLockService(reservation.organizationId);
                    const settings = reservation.organization.settings;
                    const doorSystemSettings = settings === null || settings === void 0 ? void 0 : settings.doorSystem;
                    if ((doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds) && doorSystemSettings.lockIds.length > 0) {
                        const lockId = doorSystemSettings.lockIds[0];
                        ttlockCode = yield ttlockService.createTemporaryPasscode(lockId, updatedReservation.checkInDate, updatedReservation.checkOutDate, `Guest: ${updatedReservation.guestName}`);
                        // Speichere TTLock Code in Reservierung
                        yield prisma.reservation.update({
                            where: { id: reservationId },
                            data: {
                                doorPin: ttlockCode,
                                doorAppName: 'TTLock',
                                ttlLockId: lockId,
                                ttlLockPassword: ttlockCode
                            }
                        });
                    }
                }
                catch (ttlockError) {
                    console.error('[Reservation] Fehler beim Erstellen des TTLock Passcodes:', ttlockError);
                    // Weiter ohne TTLock Code
                }
                // Erstelle Nachrichtentext
                const checkInDateStr = updatedReservation.checkInDate.toLocaleDateString('es-ES');
                const checkOutDateStr = updatedReservation.checkOutDate.toLocaleDateString('es-ES');
                sentMessage = `Hola ${updatedReservation.guestName},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada:
- Entrada: ${checkInDateStr}
- Salida: ${checkOutDateStr}

Por favor, realiza el pago:
${paymentLink}

${ttlockCode ? `Tu código de acceso TTLock:
${ttlockCode}

` : ''}¡Te esperamos!`;
                // Sende WhatsApp-Nachricht (mit Fallback auf Template)
                const whatsappService = new whatsappService_1.WhatsAppService(reservation.organizationId);
                const templateName = process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_confirmation';
                const templateParams = [
                    updatedReservation.guestName,
                    checkInDateStr,
                    checkOutDateStr,
                    paymentLink
                ];
                yield whatsappService.sendMessageWithFallback(updatedReservation.guestPhone, sentMessage, templateName, templateParams);
                sentMessageAt = new Date();
                // Speichere versendete Nachricht in Reservierung
                yield prisma.reservation.update({
                    where: { id: reservationId },
                    data: {
                        sentMessage,
                        sentMessageAt,
                        paymentLink
                    }
                });
                console.log(`[Reservation] WhatsApp-Nachricht versendet für Reservierung ${reservationId}`);
            }
            catch (whatsappError) {
                console.error('[Reservation] Fehler beim Versenden der WhatsApp-Nachricht:', whatsappError);
                // Fehler nicht weiterwerfen, Status wurde bereits aktualisiert
            }
        }
        res.json({
            success: true,
            data: Object.assign(Object.assign({}, updatedReservation), { sentMessage,
                sentMessageAt })
        });
    }
    catch (error) {
        console.error('[Reservation] Fehler beim Aktualisieren der Kontaktinformation:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Kontaktinformation'
        });
    }
});
exports.updateGuestContact = updateGuestContact;
/**
 * POST /api/reservations
 * Erstellt eine neue Reservierung manuell
 */
const createReservation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('[Reservation] createReservation aufgerufen');
        console.log('[Reservation] organizationId:', req.organizationId);
        console.log('[Reservation] Body:', req.body);
        const { guestName, contact, amount, currency = 'COP' } = req.body;
        // Validierung
        if (!guestName || typeof guestName !== 'string' || guestName.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Gast-Name ist erforderlich'
            });
        }
        if (!contact || typeof contact !== 'string' || contact.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Kontaktinformation (Telefonnummer oder Email) ist erforderlich'
            });
        }
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Betrag muss eine positive Zahl sein'
            });
        }
        if (!req.organizationId) {
            return res.status(400).json({
                success: false,
                message: 'Organisation-ID fehlt'
            });
        }
        // Erkenne ob es Telefonnummer oder Email ist
        const contactType = detectContactType(contact.trim());
        const reservationData = {
            guestName: guestName.trim(),
            checkInDate: new Date(), // Placeholder - wird nicht abgefragt
            checkOutDate: new Date(), // Placeholder - wird nicht abgefragt
            status: client_1.ReservationStatus.confirmed,
            paymentStatus: client_1.PaymentStatus.pending,
            amount: amount,
            currency: currency,
            organizationId: req.organizationId
        };
        if (contactType === 'phone') {
            reservationData.guestPhone = contact.trim();
        }
        else {
            reservationData.guestEmail = contact.trim();
        }
        // Erstelle Reservierung
        let reservation = yield prisma.reservation.create({
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
        // Nach Erstellung: Automatisch WhatsApp-Nachricht senden (wenn Telefonnummer vorhanden)
        let sentMessage = null;
        let sentMessageAt = null;
        let paymentLink = null;
        if (contactType === 'phone' && reservation.guestPhone) {
            try {
                // Erstelle Zahlungslink (ERFORDERLICH - Reservierung wird nicht als notification_sent markiert, wenn fehlschlägt)
                const boldPaymentService = new boldPaymentService_1.BoldPaymentService(reservation.organizationId);
                paymentLink = yield boldPaymentService.createPaymentLink(reservation, amount, currency, `Zahlung für Reservierung ${reservation.guestName}`);
                console.log(`[Reservation] Payment-Link erstellt: ${paymentLink}`);
                // Erstelle Check-in-Link
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                const checkInLink = `${frontendUrl}/check-in/${reservation.id}`;
                // Erstelle Nachrichtentext (mit Zahlungslink und Check-in-Aufforderung)
                sentMessage = `Hola ${reservation.guestName},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada.
Cargos: ${amount} ${currency}

Puedes realizar el check-in en línea ahora:
${checkInLink}

Por favor, realiza el pago:
${paymentLink}

¡Te esperamos!`;
                // Sende WhatsApp-Nachricht (mit Fallback auf Template)
                const whatsappService = new whatsappService_1.WhatsAppService(reservation.organizationId);
                const templateName = process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_confirmation';
                const templateParams = [
                    reservation.guestName,
                    `${amount} ${currency}`,
                    checkInLink,
                    paymentLink
                ];
                yield whatsappService.sendMessageWithFallback(reservation.guestPhone, sentMessage, templateName, templateParams);
                sentMessageAt = new Date();
                // Speichere versendete Nachricht und Payment Link in Reservierung
                yield prisma.reservation.update({
                    where: { id: reservation.id },
                    data: {
                        sentMessage,
                        sentMessageAt,
                        paymentLink,
                        status: 'notification_sent'
                    }
                });
                console.log(`[Reservation] Reservierung ${reservation.id} erstellt und WhatsApp-Nachricht versendet`);
            }
            catch (error) {
                console.error('[Reservation] Fehler beim Versenden der WhatsApp-Nachricht:', error);
                console.error('[Reservation] Error Details:', JSON.stringify(error, null, 2));
                // Prüfe ob es ein WhatsApp-Token-Problem ist
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (errorMessage.includes('access token') || errorMessage.includes('OAuthException') || errorMessage.includes('Session has expired')) {
                    console.error('[Reservation] ⚠️ WhatsApp Access Token ist abgelaufen! Bitte neuen Token in den Organisationseinstellungen eintragen.');
                }
                // Fehler nicht weiterwerfen, Reservierung wurde bereits erstellt
                // Status bleibt auf 'confirmed', da Nachricht nicht versendet wurde
                // Payment Link wurde möglicherweise erstellt, speichere ihn trotzdem
                if (paymentLink) {
                    yield prisma.reservation.update({
                        where: { id: reservation.id },
                        data: { paymentLink }
                    });
                }
            }
        }
        // Hole die aktuelle Reservierung mit allen Feldern (inkl. Updates wie sentMessage, status, etc.)
        const finalReservation = yield prisma.reservation.findUnique({
            where: { id: reservation.id },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true,
                        settings: true
                    }
                },
                task: true
            }
        });
        res.status(201).json({
            success: true,
            data: finalReservation || reservation
        });
    }
    catch (error) {
        console.error('[Reservation] Fehler beim Erstellen der Reservierung:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Erstellen der Reservierung'
        });
    }
});
exports.createReservation = createReservation;
/**
 * GET /api/reservations
 * Holt alle Reservierungen für die aktuelle Organisation
 */
const getAllReservations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('[Reservation] getAllReservations aufgerufen, organizationId:', req.organizationId);
        if (!req.organizationId) {
            return res.status(400).json({
                success: false,
                message: 'Organisation-ID fehlt'
            });
        }
        const reservations = yield prisma.reservation.findMany({
            where: {
                organizationId: req.organizationId
            },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                },
                task: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            success: true,
            data: reservations
        });
    }
    catch (error) {
        console.error('[Reservation] Fehler beim Abrufen der Reservierungen:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Reservierungen'
        });
    }
});
exports.getAllReservations = getAllReservations;
/**
 * GET /api/reservations/:id
 * Holt eine Reservierung nach ID
 */
const getReservationById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const reservationId = parseInt(id, 10);
        if (isNaN(reservationId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Reservierungs-ID'
            });
        }
        const reservation = yield prisma.reservation.findUnique({
            where: { id: reservationId },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                        status: true
                    }
                }
            }
        });
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservierung nicht gefunden'
            });
        }
        console.log('[Reservation] getReservationById - Status:', reservation.status);
        console.log('[Reservation] getReservationById - PaymentStatus:', reservation.paymentStatus);
        res.json({
            success: true,
            data: reservation
        });
    }
    catch (error) {
        console.error('[Reservation] Fehler beim Abrufen der Reservierung:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Reservierung'
        });
    }
});
exports.getReservationById = getReservationById;
//# sourceMappingURL=reservationController.js.map