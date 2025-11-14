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
exports.handleWebhook = void 0;
const whatsappMessageParser_1 = require("../services/whatsappMessageParser");
const whatsappReservationService_1 = require("../services/whatsappReservationService");
/**
 * POST /api/whatsapp/webhook
 * Empfängt Webhooks von WhatsApp Business API
 *
 * Verarbeitet eingehende Nachrichten und erstellt automatisch Reservierungen
 * wenn es sich um LobbyPMS Reservierungsnachrichten handelt
 */
const handleWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        // WhatsApp Business API Webhook-Verifizierung (GET Request)
        if (req.method === 'GET') {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];
            // TODO: Webhook-Verifizierungstoken aus Settings laden
            const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'your_verify_token';
            if (mode === 'subscribe' && token === verifyToken) {
                console.log('[WhatsApp Webhook] Webhook verifiziert');
                return res.status(200).send(challenge);
            }
            else {
                return res.status(403).send('Forbidden');
            }
        }
        // POST Request: Eingehende Nachricht
        const body = req.body;
        // WhatsApp Business API Format
        // https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
        if (body.object === 'whatsapp_business_account') {
            const entry = (_a = body.entry) === null || _a === void 0 ? void 0 : _a[0];
            const changes = (_b = entry === null || entry === void 0 ? void 0 : entry.changes) === null || _b === void 0 ? void 0 : _b[0];
            const value = changes === null || changes === void 0 ? void 0 : changes.value;
            // Eingehende Nachricht
            if ((_c = value === null || value === void 0 ? void 0 : value.messages) === null || _c === void 0 ? void 0 : _c[0]) {
                const message = value.messages[0];
                const messageText = ((_d = message.text) === null || _d === void 0 ? void 0 : _d.body) || '';
                console.log('[WhatsApp Webhook] Eingehende Nachricht:', messageText);
                // Prüfe ob es eine LobbyPMS Reservierungsnachricht ist
                const parsedMessage = whatsappMessageParser_1.WhatsAppMessageParser.parseReservationMessage(messageText);
                if (parsedMessage) {
                    console.log('[WhatsApp Webhook] LobbyPMS Reservierungsnachricht erkannt:', parsedMessage);
                    // Erstelle Reservierung
                    try {
                        const reservation = yield whatsappReservationService_1.WhatsAppReservationService.createReservationFromMessage(parsedMessage);
                        console.log('[WhatsApp Webhook] Reservierung erstellt:', reservation.id);
                        // Bestätige Webhook-Empfang
                        return res.status(200).json({ success: true, reservationId: reservation.id });
                    }
                    catch (error) {
                        console.error('[WhatsApp Webhook] Fehler beim Erstellen der Reservierung:', error);
                        // Trotzdem 200 zurückgeben, damit WhatsApp nicht erneut sendet
                        return res.status(200).json({ success: false, error: 'Fehler beim Erstellen der Reservierung' });
                    }
                }
                else {
                    console.log('[WhatsApp Webhook] Keine LobbyPMS Reservierungsnachricht erkannt');
                    // Normale Nachricht, nicht verarbeiten
                    return res.status(200).json({ success: true, message: 'Nachricht nicht verarbeitet' });
                }
            }
        }
        // Unbekanntes Format
        console.log('[WhatsApp Webhook] Unbekanntes Webhook-Format:', JSON.stringify(body, null, 2));
        return res.status(200).json({ success: true, message: 'Webhook empfangen, aber nicht verarbeitet' });
    }
    catch (error) {
        console.error('[WhatsApp Webhook] Fehler beim Verarbeiten:', error);
        // Trotzdem 200 zurückgeben, damit WhatsApp nicht erneut sendet
        return res.status(200).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.handleWebhook = handleWebhook;
//# sourceMappingURL=whatsappController.js.map