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
const client_1 = require("@prisma/client");
const whatsappMessageParser_1 = require("../services/whatsappMessageParser");
const whatsappReservationService_1 = require("../services/whatsappReservationService");
const whatsappMessageHandler_1 = require("../services/whatsappMessageHandler");
const whatsappService_1 = require("../services/whatsappService");
const prisma = new client_1.PrismaClient();
/**
 * POST /api/whatsapp/webhook
 * Empfängt Webhooks von WhatsApp Business API
 *
 * Verarbeitet eingehende Nachrichten und erstellt automatisch Reservierungen
 * wenn es sich um LobbyPMS Reservierungsnachrichten handelt
 */
const handleWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    try {
        console.log('[WhatsApp Webhook] Webhook-Anfrage erhalten:', {
            method: req.method,
            path: req.path,
            headers: {
                'content-type': req.headers['content-type'],
                'user-agent': req.headers['user-agent']
            }
        });
        // WhatsApp Business API Webhook-Verifizierung (GET Request)
        if (req.method === 'GET') {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];
            console.log('[WhatsApp Webhook] GET Request - Verifizierung:', { mode, token: token ? '***' : 'fehlt', challenge });
            // TODO: Webhook-Verifizierungstoken aus Settings laden
            const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'your_verify_token';
            if (mode === 'subscribe' && token === verifyToken) {
                console.log('[WhatsApp Webhook] Webhook verifiziert');
                return res.status(200).send(challenge);
            }
            else {
                console.warn('[WhatsApp Webhook] Verifizierung fehlgeschlagen:', { mode, tokenMatch: token === verifyToken });
                return res.status(403).send('Forbidden');
            }
        }
        // POST Request: Eingehende Nachricht
        const body = req.body;
        console.log('[WhatsApp Webhook] POST Request Body:', JSON.stringify(body, null, 2));
        // WhatsApp Business API Format
        // https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
        if (body.object === 'whatsapp_business_account') {
            const entry = (_a = body.entry) === null || _a === void 0 ? void 0 : _a[0];
            const changes = (_b = entry === null || entry === void 0 ? void 0 : entry.changes) === null || _b === void 0 ? void 0 : _b[0];
            const value = changes === null || changes === void 0 ? void 0 : changes.value;
            const field = changes === null || changes === void 0 ? void 0 : changes.field;
            console.log('[WhatsApp Webhook] Webhook Field:', field);
            console.log('[WhatsApp Webhook] Has messages:', !!((_c = value === null || value === void 0 ? void 0 : value.messages) === null || _c === void 0 ? void 0 : _c[0]));
            console.log('[WhatsApp Webhook] Has statuses:', !!((_d = value === null || value === void 0 ? void 0 : value.statuses) === null || _d === void 0 ? void 0 : _d[0]));
            // Status-Update (loggen für Debugging)
            if ((_e = value === null || value === void 0 ? void 0 : value.statuses) === null || _e === void 0 ? void 0 : _e[0]) {
                const statusUpdate = value.statuses[0];
                const status = statusUpdate.status;
                const messageId = statusUpdate.id;
                const recipientId = statusUpdate.recipient_id;
                const timestamp = statusUpdate.timestamp;
                const errors = statusUpdate.errors;
                console.log('[WhatsApp Webhook] Status-Update empfangen:', {
                    status,
                    messageId,
                    recipientId,
                    timestamp,
                    errors: errors ? JSON.stringify(errors, null, 2) : 'keine'
                });
                // Bei Fehlern detailliert loggen
                if (status === 'failed' || errors) {
                    console.error('[WhatsApp Webhook] ❌ Nachricht-Zustellung fehlgeschlagen!', {
                        status,
                        messageId,
                        recipientId,
                        errors: errors ? JSON.stringify(errors, null, 2) : 'keine Fehlerdetails',
                        timestamp
                    });
                }
                else if (status === 'sent') {
                    console.log('[WhatsApp Webhook] ✅ Nachricht erfolgreich gesendet:', { messageId, recipientId });
                }
                else if (status === 'delivered') {
                    console.log('[WhatsApp Webhook] ✅ Nachricht erfolgreich zugestellt:', { messageId, recipientId });
                }
                else if (status === 'read') {
                    console.log('[WhatsApp Webhook] ✅ Nachricht gelesen:', { messageId, recipientId });
                }
                return res.status(200).json({ success: true, message: 'Status-Update empfangen' });
            }
            // Eingehende Nachricht
            if ((_f = value === null || value === void 0 ? void 0 : value.messages) === null || _f === void 0 ? void 0 : _f[0]) {
                const message = value.messages[0];
                const fromNumber = message.from; // Telefonnummer des Absenders
                const messageText = ((_g = message.text) === null || _g === void 0 ? void 0 : _g.body) || '';
                const mediaUrl = ((_h = message.image) === null || _h === void 0 ? void 0 : _h.id) || ((_j = message.document) === null || _j === void 0 ? void 0 : _j.id);
                const phoneNumberId = (_k = value.metadata) === null || _k === void 0 ? void 0 : _k.phone_number_id;
                console.log('[WhatsApp Webhook] Eingehende Nachricht:', {
                    from: fromNumber,
                    text: messageText,
                    phoneNumberId: phoneNumberId
                });
                // 1. Identifiziere Branch via Phone Number ID
                const branchId = yield identifyBranchFromPhoneNumberId(phoneNumberId);
                if (!branchId) {
                    console.error('[WhatsApp Webhook] Branch nicht gefunden für Phone Number ID:', phoneNumberId);
                    // Trotzdem 200 zurückgeben, damit WhatsApp nicht erneut sendet
                    return res.status(200).json({ success: false, error: 'Branch nicht gefunden' });
                }
                console.log('[WhatsApp Webhook] Branch identifiziert:', branchId);
                // 2. Prüfe ob es eine LobbyPMS Reservierungsnachricht ist (bestehende Funktionalität)
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
                // 3. Verarbeite Nachricht via Message Handler (neue Funktionalität)
                try {
                    console.log('[WhatsApp Webhook] Rufe Message Handler auf...');
                    const response = yield whatsappMessageHandler_1.WhatsAppMessageHandler.handleIncomingMessage(fromNumber, messageText, branchId, mediaUrl);
                    console.log('[WhatsApp Webhook] Antwort generiert:', response.substring(0, 100) + '...');
                    console.log('[WhatsApp Webhook] Vollständige Antwort:', response);
                    // 4. Sende Antwort
                    console.log('[WhatsApp Webhook] Erstelle WhatsApp Service für Branch', branchId);
                    const whatsappService = yield whatsappService_1.WhatsAppService.getServiceForBranch(branchId);
                    console.log('[WhatsApp Webhook] Sende Antwort an', fromNumber);
                    yield whatsappService.sendMessage(fromNumber, response);
                    console.log('[WhatsApp Webhook] ✅ Antwort erfolgreich gesendet');
                    return res.status(200).json({ success: true, message: 'Nachricht verarbeitet und Antwort gesendet' });
                }
                catch (error) {
                    console.error('[WhatsApp Webhook] ❌ Fehler bei Message Handler:', error);
                    if (error instanceof Error) {
                        console.error('[WhatsApp Webhook] Fehlermeldung:', error.message);
                        console.error('[WhatsApp Webhook] Stack:', error.stack);
                    }
                    // Trotzdem 200 zurückgeben, damit WhatsApp nicht erneut sendet
                    return res.status(200).json({
                        success: false,
                        error: error instanceof Error ? error.message : 'Fehler bei der Verarbeitung'
                    });
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
/**
 * Identifiziert Branch via Phone Number ID
 *
 * 1. Prüft Phone Number Mapping
 * 2. Fallback: Sucht Branch mit dieser phoneNumberId in Settings
 */
function identifyBranchFromPhoneNumberId(phoneNumberId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // 1. Prüfe Phone Number Mapping
            const mapping = yield prisma.whatsAppPhoneNumberMapping.findFirst({
                where: { phoneNumberId },
                select: { branchId: true }
            });
            if (mapping) {
                console.log('[WhatsApp Webhook] Branch via Mapping gefunden:', mapping.branchId);
                return mapping.branchId;
            }
            // 2. Fallback: Suche Branch mit dieser phoneNumberId in Settings
            // Prisma unterstützt JSONB-Pfad-Suche nicht direkt, daher manuell
            const branches = yield prisma.branch.findMany({
                where: {
                    whatsappSettings: { not: null }
                },
                select: {
                    id: true,
                    whatsappSettings: true
                }
            });
            for (const branch of branches) {
                if (branch.whatsappSettings) {
                    const settings = branch.whatsappSettings;
                    const whatsappSettings = (settings === null || settings === void 0 ? void 0 : settings.whatsapp) || settings;
                    if ((whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.phoneNumberId) === phoneNumberId) {
                        console.log('[WhatsApp Webhook] Branch via Settings gefunden:', branch.id);
                        return branch.id;
                    }
                }
            }
            console.warn('[WhatsApp Webhook] Kein Branch gefunden für Phone Number ID:', phoneNumberId);
            return null;
        }
        catch (error) {
            console.error('[WhatsApp Webhook] Fehler bei Branch-Identifikation:', error);
            return null;
        }
    });
}
//# sourceMappingURL=whatsappController.js.map