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
exports.TourWhatsAppService = void 0;
const prisma_1 = require("../utils/prisma");
const whatsappService_1 = require("./whatsappService");
/**
 * Service für Tour-WhatsApp-Automatisierung
 */
class TourWhatsAppService {
    /**
     * Sendet Buchungsanfrage an externen Tour-Anbieter
     */
    static sendBookingRequestToProvider(bookingId, organizationId, branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const booking = yield prisma_1.prisma.tourBooking.findUnique({
                    where: { id: bookingId },
                    include: {
                        tour: {
                            include: {
                                externalProvider: true
                            }
                        }
                    }
                });
                if (!booking || !booking.tour || booking.tour.type !== 'external' || !booking.tour.externalProvider) {
                    console.log('[TourWhatsApp] Kein externer Anbieter für Buchung', bookingId);
                    return false;
                }
                const provider = booking.tour.externalProvider;
                if (!provider.phone) {
                    console.log('[TourWhatsApp] Keine Telefonnummer für Anbieter', provider.id);
                    return false;
                }
                // Erstelle WhatsApp-Service
                const whatsappService = branchId
                    ? new whatsappService_1.WhatsAppService(undefined, branchId)
                    : new whatsappService_1.WhatsAppService(organizationId);
                // Erstelle Nachricht
                const message = `Neue Tour-Buchungsanfrage:\n\n` +
                    `Tour: ${booking.tour.title}\n` +
                    `Kunde: ${booking.customerName}\n` +
                    `Telefon: ${booking.customerPhone || 'N/A'}\n` +
                    `E-Mail: ${booking.customerEmail || 'N/A'}\n` +
                    `Tour-Datum: ${new Date(booking.tourDate).toLocaleDateString('de-DE')}\n` +
                    `Teilnehmer: ${booking.numberOfParticipants}\n` +
                    `Preis: ${Number(booking.totalPrice).toLocaleString()} ${booking.currency}\n` +
                    (booking.customerNotes ? `Notizen: ${booking.customerNotes}\n` : '') +
                    `\nBitte bestätigen Sie die Verfügbarkeit.`;
                // Sende Nachricht
                const success = yield whatsappService.sendMessage(provider.phone, message);
                if (success) {
                    // Speichere Nachricht in Datenbank
                    yield prisma_1.prisma.tourWhatsAppMessage.create({
                        data: {
                            bookingId,
                            direction: 'outgoing',
                            status: 'sent',
                            phoneNumber: provider.phone,
                            message
                        }
                    });
                    console.log(`[TourWhatsApp] ✅ Buchungsanfrage gesendet an Anbieter ${provider.phone}`);
                }
                return success;
            }
            catch (error) {
                console.error('[TourWhatsApp] Fehler beim Senden der Buchungsanfrage:', error);
                return false;
            }
        });
    }
    /**
     * Verarbeitet Antwort vom Anbieter und sendet Bestätigung/Absage an Kunde
     */
    static processProviderResponse(bookingId, providerMessage, organizationId, branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const booking = yield prisma_1.prisma.tourBooking.findUnique({
                    where: { id: bookingId },
                    include: {
                        tour: {
                            include: {
                                externalProvider: true
                            }
                        }
                    }
                });
                if (!booking || !booking.customerPhone) {
                    console.log('[TourWhatsApp] Keine Kunden-Telefonnummer für Buchung', bookingId);
                    return;
                }
                // Speichere eingehende Nachricht
                yield prisma_1.prisma.tourWhatsAppMessage.create({
                    data: {
                        bookingId,
                        direction: 'incoming',
                        status: 'delivered',
                        phoneNumber: ((_b = (_a = booking.tour) === null || _a === void 0 ? void 0 : _a.externalProvider) === null || _b === void 0 ? void 0 : _b.phone) || '',
                        message: providerMessage
                    }
                });
                // Analysiere Nachricht (einfache Keyword-Erkennung)
                const messageLower = providerMessage.toLowerCase();
                const isConfirmed = messageLower.includes('bestätigt') ||
                    messageLower.includes('verfügbar') ||
                    messageLower.includes('ok') ||
                    messageLower.includes('ja');
                const isCancelled = messageLower.includes('nicht verfügbar') ||
                    messageLower.includes('ausgebucht') ||
                    messageLower.includes('storniert') ||
                    messageLower.includes('nein');
                const whatsappService = branchId
                    ? new whatsappService_1.WhatsAppService(undefined, branchId)
                    : new whatsappService_1.WhatsAppService(organizationId);
                if (isConfirmed) {
                    // Bestätigung: Aktualisiere Status und sende Bestätigung + Zahlungslink
                    yield prisma_1.prisma.tourBooking.update({
                        where: { id: bookingId },
                        data: {
                            status: 'confirmed',
                            externalStatus: 'confirmed'
                        }
                    });
                    // Generiere Zahlungslink (falls noch nicht vorhanden)
                    let paymentLink = booking.paymentLink;
                    if (!paymentLink && booking.totalPrice) {
                        // TODO: Integriere BoldPaymentService für Zahlungslink-Generierung
                        // const { BoldPaymentService } = await import('./boldPaymentService');
                        // paymentLink = await BoldPaymentService.generatePaymentLink(...);
                    }
                    const confirmationMessage = `Ihre Tour "${((_c = booking.tour) === null || _c === void 0 ? void 0 : _c.title) || 'Tour'}" wurde bestätigt!\n\n` +
                        `Datum: ${new Date(booking.tourDate).toLocaleDateString('de-DE')}\n` +
                        `Teilnehmer: ${booking.numberOfParticipants}\n` +
                        `Preis: ${Number(booking.totalPrice).toLocaleString()} ${booking.currency}\n` +
                        (paymentLink ? `\nZahlungslink: ${paymentLink}` : '') +
                        `\n\nWir freuen uns auf Sie!`;
                    yield whatsappService.sendMessage(booking.customerPhone, confirmationMessage);
                    // Speichere ausgehende Nachricht
                    yield prisma_1.prisma.tourWhatsAppMessage.create({
                        data: {
                            bookingId,
                            direction: 'outgoing',
                            status: 'sent',
                            phoneNumber: booking.customerPhone || '',
                            message: confirmationMessage
                        }
                    });
                    console.log(`[TourWhatsApp] ✅ Bestätigung an Kunde gesendet`);
                }
                else if (isCancelled) {
                    // Absage: Aktualisiere Status und sende Absage
                    yield prisma_1.prisma.tourBooking.update({
                        where: { id: bookingId },
                        data: {
                            status: 'cancelled',
                            externalStatus: 'cancelled',
                            cancelledBy: 'provider'
                        }
                    });
                    const cancellationMessage = `Leider ist die Tour "${((_d = booking.tour) === null || _d === void 0 ? void 0 : _d.title) || 'Tour'}" für den gewünschten Termin nicht verfügbar.\n\n` +
                        `Wir können Ihnen gerne alternative Termine oder Touren vorschlagen. Bitte kontaktieren Sie uns.`;
                    yield whatsappService.sendMessage(booking.customerPhone, cancellationMessage);
                    // Speichere ausgehende Nachricht
                    yield prisma_1.prisma.tourWhatsAppMessage.create({
                        data: {
                            bookingId,
                            direction: 'outgoing',
                            status: 'sent',
                            phoneNumber: booking.customerPhone || '',
                            message: cancellationMessage
                        }
                    });
                    console.log(`[TourWhatsApp] ✅ Absage an Kunde gesendet`);
                }
                else {
                    // Unklare Antwort: Manuelle Bearbeitung erforderlich
                    console.log(`[TourWhatsApp] ⚠️ Unklare Antwort vom Anbieter, manuelle Bearbeitung erforderlich`);
                    // TODO: Notification an definierte Rolle senden
                }
            }
            catch (error) {
                console.error('[TourWhatsApp] Fehler beim Verarbeiten der Anbieter-Antwort:', error);
            }
        });
    }
    /**
     * Sendet Stornierungs-Benachrichtigung an Kunde
     */
    /**
     * Sendet Bestätigung an Kunden nach erfolgreicher Zahlung
     */
    static sendConfirmationToCustomer(bookingId, organizationId, branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const booking = yield prisma_1.prisma.tourBooking.findUnique({
                    where: { id: bookingId },
                    include: {
                        tour: true
                    }
                });
                if (!booking || !booking.customerPhone) {
                    return false;
                }
                const whatsappService = branchId
                    ? new whatsappService_1.WhatsAppService(undefined, branchId)
                    : new whatsappService_1.WhatsAppService(organizationId);
                const tourDate = new Date(booking.tourDate).toLocaleDateString('de-DE', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const message = `✅ Ihre Tour-Buchung wurde bestätigt!\n\n` +
                    `Tour: ${((_a = booking.tour) === null || _a === void 0 ? void 0 : _a.title) || 'Tour'}\n` +
                    `Datum: ${tourDate}\n` +
                    `Teilnehmer: ${booking.numberOfParticipants}\n` +
                    `Preis: ${Number(booking.totalPrice).toLocaleString()} ${booking.currency}\n\n` +
                    `Vielen Dank für Ihre Buchung! Wir freuen uns auf Sie.`;
                const success = yield whatsappService.sendMessage(booking.customerPhone, message);
                if (success) {
                    yield prisma_1.prisma.tourWhatsAppMessage.create({
                        data: {
                            bookingId,
                            direction: 'outgoing',
                            status: 'sent',
                            phoneNumber: booking.customerPhone || '',
                            message
                        }
                    });
                    console.log(`[TourWhatsApp] ✅ Bestätigung gesendet an Kunden für Buchung ${bookingId}`);
                }
                return success;
            }
            catch (error) {
                console.error('[TourWhatsApp] Fehler beim Senden der Bestätigung:', error);
                return false;
            }
        });
    }
    static sendCancellationToCustomer(bookingId, organizationId, branchId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const booking = yield prisma_1.prisma.tourBooking.findUnique({
                    where: { id: bookingId },
                    include: {
                        tour: true
                    }
                });
                if (!booking || !booking.customerPhone) {
                    return false;
                }
                const whatsappService = branchId
                    ? new whatsappService_1.WhatsAppService(undefined, branchId)
                    : new whatsappService_1.WhatsAppService(organizationId);
                const message = `Ihre Tour "${((_a = booking.tour) === null || _a === void 0 ? void 0 : _a.title) || 'Tour'}" wurde storniert.\n\n` +
                    (reason ? `Grund: ${reason}\n\n` : '') +
                    `Bei Fragen kontaktieren Sie uns bitte.`;
                const success = yield whatsappService.sendMessage(booking.customerPhone, message);
                if (success) {
                    yield prisma_1.prisma.tourWhatsAppMessage.create({
                        data: {
                            bookingId,
                            direction: 'outgoing',
                            status: 'sent',
                            phoneNumber: booking.customerPhone || '',
                            message
                        }
                    });
                }
                return success;
            }
            catch (error) {
                console.error('[TourWhatsApp] Fehler beim Senden der Stornierungs-Benachrichtigung:', error);
                return false;
            }
        });
    }
}
exports.TourWhatsAppService = TourWhatsAppService;
//# sourceMappingURL=tourWhatsAppService.js.map