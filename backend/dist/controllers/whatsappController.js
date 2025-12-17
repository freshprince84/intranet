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
const whatsappMessageHandler_1 = require("../services/whatsappMessageHandler");
const whatsappService_1 = require("../services/whatsappService");
const whatsappAiService_1 = require("../services/whatsappAiService");
const languageDetectionService_1 = require("../services/languageDetectionService");
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
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
        logger_1.logger.log('[WhatsApp Webhook] Webhook-Anfrage erhalten:', {
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
            logger_1.logger.log('[WhatsApp Webhook] GET Request - Verifizierung:', { mode, token: token ? '***' : 'fehlt', challenge });
            // TODO: Webhook-Verifizierungstoken aus Settings laden
            const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'your_verify_token';
            if (mode === 'subscribe' && token === verifyToken) {
                logger_1.logger.log('[WhatsApp Webhook] Webhook verifiziert');
                return res.status(200).send(challenge);
            }
            else {
                logger_1.logger.warn('[WhatsApp Webhook] Verifizierung fehlgeschlagen:', { mode, tokenMatch: token === verifyToken });
                return res.status(403).send('Forbidden');
            }
        }
        // POST Request: Eingehende Nachricht
        const body = req.body;
        logger_1.logger.log('[WhatsApp Webhook] POST Request Body:', JSON.stringify(body, null, 2));
        // WhatsApp Business API Format
        // https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
        if (body.object === 'whatsapp_business_account') {
            const entry = (_a = body.entry) === null || _a === void 0 ? void 0 : _a[0];
            const changes = (_b = entry === null || entry === void 0 ? void 0 : entry.changes) === null || _b === void 0 ? void 0 : _b[0];
            const value = changes === null || changes === void 0 ? void 0 : changes.value;
            const field = changes === null || changes === void 0 ? void 0 : changes.field;
            logger_1.logger.log('[WhatsApp Webhook] Webhook Field:', field);
            logger_1.logger.log('[WhatsApp Webhook] Has messages:', !!((_c = value === null || value === void 0 ? void 0 : value.messages) === null || _c === void 0 ? void 0 : _c[0]));
            logger_1.logger.log('[WhatsApp Webhook] Has statuses:', !!((_d = value === null || value === void 0 ? void 0 : value.statuses) === null || _d === void 0 ? void 0 : _d[0]));
            // Status-Update (loggen für Debugging)
            if ((_e = value === null || value === void 0 ? void 0 : value.statuses) === null || _e === void 0 ? void 0 : _e[0]) {
                const statusUpdate = value.statuses[0];
                const status = statusUpdate.status;
                const messageId = statusUpdate.id;
                const recipientId = statusUpdate.recipient_id;
                const timestamp = statusUpdate.timestamp;
                const errors = statusUpdate.errors;
                logger_1.logger.log('[WhatsApp Webhook] Status-Update empfangen:', {
                    status,
                    messageId,
                    recipientId,
                    timestamp,
                    errors: errors ? JSON.stringify(errors, null, 2) : 'keine'
                });
                // Bei Fehlern detailliert loggen
                if (status === 'failed' || errors) {
                    logger_1.logger.error('[WhatsApp Webhook] ❌ Nachricht-Zustellung fehlgeschlagen!', {
                        status,
                        messageId,
                        recipientId,
                        errors: errors ? JSON.stringify(errors, null, 2) : 'keine Fehlerdetails',
                        timestamp
                    });
                }
                else if (status === 'sent') {
                    logger_1.logger.log('[WhatsApp Webhook] ✅ Nachricht erfolgreich gesendet:', { messageId, recipientId });
                }
                else if (status === 'delivered') {
                    logger_1.logger.log('[WhatsApp Webhook] ✅ Nachricht erfolgreich zugestellt:', { messageId, recipientId });
                }
                else if (status === 'read') {
                    logger_1.logger.log('[WhatsApp Webhook] ✅ Nachricht gelesen:', { messageId, recipientId });
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
                // Gruppen-Erkennung: Prüfe ob Nachricht aus Gruppe kommt
                const context = message.context;
                const groupId = (context === null || context === void 0 ? void 0 : context.group_id) || null;
                const isGroupMessage = !!groupId;
                logger_1.logger.log('[WhatsApp Webhook] Eingehende Nachricht:', {
                    from: fromNumber,
                    text: messageText,
                    phoneNumberId: phoneNumberId,
                    isGroupMessage: isGroupMessage,
                    groupId: groupId
                });
                // 1. Identifiziere Branch via Phone Number ID
                const branchId = yield identifyBranchFromPhoneNumberId(phoneNumberId);
                if (!branchId) {
                    logger_1.logger.error('[WhatsApp Webhook] Branch nicht gefunden für Phone Number ID:', phoneNumberId);
                    // Trotzdem 200 zurückgeben, damit WhatsApp nicht erneut sendet
                    return res.status(200).json({ success: false, error: 'Branch nicht gefunden' });
                }
                logger_1.logger.log('[WhatsApp Webhook] Branch identifiziert:', branchId);
                // 1.5. Speichere eingehende Nachricht in Datenbank
                try {
                    const { LanguageDetectionService } = require('../services/languageDetectionService');
                    const normalizedPhone = LanguageDetectionService.normalizePhoneNumber(fromNumber);
                    const messageId = message.id;
                    // Hole oder erstelle Conversation für conversationId
                    let conversationId = null;
                    try {
                        const conversation = yield prisma_1.prisma.whatsAppConversation.findUnique({
                            where: {
                                phoneNumber_branchId: {
                                    phoneNumber: normalizedPhone,
                                    branchId: branchId
                                }
                            },
                            select: { id: true }
                        });
                        conversationId = (conversation === null || conversation === void 0 ? void 0 : conversation.id) || null;
                    }
                    catch (convError) {
                        logger_1.logger.error('[WhatsApp Webhook] Fehler beim Laden der Conversation:', convError);
                    }
                    // Prüfe ob es eine Reservation zu dieser Telefonnummer gibt
                    const reservation = yield prisma_1.prisma.reservation.findFirst({
                        where: {
                            guestPhone: normalizedPhone,
                            branchId: branchId
                        },
                        orderBy: {
                            checkInDate: 'desc'
                        }
                    });
                    // Speichere Nachricht
                    yield prisma_1.prisma.whatsAppMessage.create({
                        data: {
                            direction: 'incoming',
                            phoneNumber: normalizedPhone,
                            message: messageText,
                            messageId: messageId,
                            branchId: branchId,
                            conversationId: conversationId,
                            reservationId: (reservation === null || reservation === void 0 ? void 0 : reservation.id) || null,
                            sentAt: new Date(parseInt(message.timestamp) * 1000) // WhatsApp timestamp ist in Sekunden
                        }
                    });
                    logger_1.logger.log('[WhatsApp Webhook] ✅ Eingehende Nachricht in Datenbank gespeichert', { conversationId });
                }
                catch (dbError) {
                    logger_1.logger.error('[WhatsApp Webhook] ⚠️ Fehler beim Speichern der eingehenden Nachricht:', dbError);
                    // Weiter mit Verarbeitung, auch wenn Speichern fehlschlägt
                }
                // 2. Prüfe ob es eine LobbyPMS Reservierungsnachricht ist (bestehende Funktionalität)
                const parsedMessage = whatsappMessageParser_1.WhatsAppMessageParser.parseReservationMessage(messageText);
                if (parsedMessage) {
                    logger_1.logger.log('[WhatsApp Webhook] LobbyPMS Reservierungsnachricht erkannt:', parsedMessage);
                    // Erstelle Reservierung
                    try {
                        const reservation = yield whatsappReservationService_1.WhatsAppReservationService.createReservationFromMessage(parsedMessage);
                        logger_1.logger.log('[WhatsApp Webhook] Reservierung erstellt:', reservation.id);
                        // Bestätige Webhook-Empfang
                        return res.status(200).json({ success: true, reservationId: reservation.id });
                    }
                    catch (error) {
                        logger_1.logger.error('[WhatsApp Webhook] Fehler beim Erstellen der Reservierung:', error);
                        // Trotzdem 200 zurückgeben, damit WhatsApp nicht erneut sendet
                        return res.status(200).json({ success: false, error: 'Fehler beim Erstellen der Reservierung' });
                    }
                }
                // 3. Verarbeite Nachricht via Message Handler (neue Funktionalität)
                try {
                    logger_1.logger.log('[WhatsApp Webhook] Rufe Message Handler auf...');
                    const response = yield whatsappMessageHandler_1.WhatsAppMessageHandler.handleIncomingMessage(fromNumber, messageText, branchId, mediaUrl, groupId || undefined);
                    logger_1.logger.log('[WhatsApp Webhook] Antwort generiert:', response.substring(0, 100) + '...');
                    logger_1.logger.log('[WhatsApp Webhook] Vollständige Antwort:', response);
                    logger_1.logger.log('[WhatsApp Webhook] Antwort-Länge:', response.length);
                    logger_1.logger.log('[WhatsApp Webhook] User-Nachricht:', messageText);
                    // 4. Sende Antwort
                    logger_1.logger.log('[WhatsApp Webhook] Erstelle WhatsApp Service für Branch', branchId);
                    const whatsappService = yield whatsappService_1.WhatsAppService.getServiceForBranch(branchId);
                    logger_1.logger.log('[WhatsApp Webhook] Sende Antwort an', fromNumber, isGroupMessage ? `(Gruppe: ${groupId})` : '');
                    // Extrahiere Bildreferenzen aus AI-Antwort (Markdown-Format: ![alt](url))
                    const imageMatches = Array.from(response.matchAll(/!\[(.*?)\]\((.*?)\)/g));
                    logger_1.logger.log(`[WhatsApp Webhook] Bildreferenzen gefunden: ${imageMatches.length}`, imageMatches.map(m => ({ alt: m[1], url: m[2] })));
                    if (imageMatches.length > 0) {
                        logger_1.logger.log(`[WhatsApp Webhook] ${imageMatches.length} Bildreferenzen gefunden, sende nur Bilder + Standard-Text`);
                        // Wenn Bilder vorhanden sind, ignoriere ALLEN Text von der AI und sende nur Bilder + Standard-Text
                        const baseUrl = process.env.SERVER_URL || process.env.API_URL || 'https://65.109.228.106.nip.io';
                        // Sprache erkennen: Priorität 1 = User-Nachricht, Priorität 2 = Telefonnummer
                        // WICHTIG: Prüfe auch die AI-Antwort, falls User-Nachricht nicht eindeutig ist
                        let detectedLanguage = messageText
                            ? whatsappAiService_1.WhatsAppAiService.detectLanguageFromMessage(messageText)
                            : null;
                        // Fallback: Wenn keine Sprache aus User-Nachricht erkannt, prüfe AI-Antwort
                        if (!detectedLanguage && response) {
                            detectedLanguage = whatsappAiService_1.WhatsAppAiService.detectLanguageFromMessage(response);
                        }
                        const phoneLanguage = languageDetectionService_1.LanguageDetectionService.detectLanguageFromPhoneNumber(fromNumber);
                        const language = detectedLanguage || phoneLanguage;
                        logger_1.logger.log(`[WhatsApp Webhook] Sprache erkannt: ${language} (aus User-Nachricht: ${messageText ? whatsappAiService_1.WhatsAppAiService.detectLanguageFromMessage(messageText) : 'keine'}, aus AI-Antwort: ${response ? whatsappAiService_1.WhatsAppAiService.detectLanguageFromMessage(response) : 'keine'}, aus Telefonnummer: ${phoneLanguage})`);
                        // Sende ALLE Bilder zuerst SEQUENZIELL (ohne Caption, um Text zu vermeiden)
                        // WICHTIG: Sequenziell senden, damit sie in der richtigen Reihenfolge ankommen
                        for (const match of imageMatches) {
                            const imageUrl = match[2]; // URL aus Markdown
                            // Konvertiere relative URLs zu absoluten HTTPS-URLs
                            let publicImageUrl = imageUrl;
                            if (imageUrl.startsWith('/uploads/tours/')) {
                                // Konvertiere /uploads/tours/tour-1-main-xxx.png zu /api/tours/{id}/image
                                const filename = imageUrl.split('/').pop() || '';
                                const tourIdMatch = filename.match(/tour-(\d+)-main-/);
                                if (tourIdMatch) {
                                    const tourId = tourIdMatch[1];
                                    publicImageUrl = `${baseUrl}/api/tours/${tourId}/image`;
                                }
                                else {
                                    // Fallback: direkte URL
                                    publicImageUrl = `${baseUrl}${imageUrl}`;
                                }
                            }
                            else if (imageUrl.startsWith('/api/tours/')) {
                                // Bereits API-URL, füge nur Base-URL hinzu
                                publicImageUrl = `${baseUrl}${imageUrl}`;
                            }
                            else if (!imageUrl.startsWith('http')) {
                                // Relative URL ohne /uploads
                                publicImageUrl = `${baseUrl}${imageUrl}`;
                            }
                            try {
                                logger_1.logger.log(`[WhatsApp Webhook] Sende Bild ${imageMatches.indexOf(match) + 1}/${imageMatches.length}: ${publicImageUrl}`);
                                // KEINE Caption, um Text zu vermeiden
                                yield whatsappService.sendImage(fromNumber, publicImageUrl);
                                // Längere Pause zwischen Bildern, damit WhatsApp sie in der richtigen Reihenfolge verarbeitet
                                // WICHTIG: Mindestens 1 Sekunde, damit WhatsApp die Nachrichten in der richtigen Reihenfolge anzeigt
                                yield new Promise(resolve => setTimeout(resolve, 1000));
                            }
                            catch (imageError) {
                                logger_1.logger.error(`[WhatsApp Webhook] Fehler beim Senden des Bildes:`, imageError);
                                // Weiter mit nächstem Bild
                            }
                        }
                        // Zusätzliche Pause nach ALLEN Bildern, bevor Text gesendet wird
                        // WICHTIG: Sicherstellen, dass alle Bilder verarbeitet sind
                        // Längere Pause (2 Sekunden), damit WhatsApp alle Bilder verarbeitet hat
                        logger_1.logger.log(`[WhatsApp Webhook] Alle ${imageMatches.length} Bilder gesendet, warte 2 Sekunden, dann sende Text`);
                        yield new Promise(resolve => setTimeout(resolve, 2000));
                        // Nach ALLEN Bildern: Sende IMMER nur den Standard-Text (ignoriere AI-Text komplett)
                        const standardTexts = {
                            es: 'Si estás interesado en alguna de estas tours, ¡házmelo saber!',
                            de: 'Wenn du an einer dieser Touren interessiert bist, lass es mich bitte wissen!',
                            en: 'If you are interested in any of these tours, please let me know!'
                        };
                        const finalTextMessage = standardTexts[language] || standardTexts['es'];
                        logger_1.logger.log(`[WhatsApp Webhook] Sende Text-Nachricht (${language}): ${finalTextMessage}`);
                        if (isGroupMessage && groupId) {
                            yield whatsappService.sendMessage(fromNumber, finalTextMessage, undefined, groupId);
                        }
                        else {
                            yield whatsappService.sendMessage(fromNumber, finalTextMessage);
                        }
                        logger_1.logger.log(`[WhatsApp Webhook] ✅ Text-Nachricht gesendet`);
                    }
                    else {
                        // Keine Bilder, sende nur Text
                        if (isGroupMessage && groupId) {
                            yield whatsappService.sendMessage(fromNumber, response, undefined, groupId);
                        }
                        else {
                            yield whatsappService.sendMessage(fromNumber, response);
                        }
                    }
                    logger_1.logger.log('[WhatsApp Webhook] ✅ Antwort erfolgreich gesendet');
                    return res.status(200).json({ success: true, message: 'Nachricht verarbeitet und Antwort gesendet' });
                }
                catch (error) {
                    logger_1.logger.error('[WhatsApp Webhook] ❌ Fehler bei Message Handler:', error);
                    if (error instanceof Error) {
                        logger_1.logger.error('[WhatsApp Webhook] Fehlermeldung:', error.message);
                        logger_1.logger.error('[WhatsApp Webhook] Stack:', error.stack);
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
        logger_1.logger.log('[WhatsApp Webhook] Unbekanntes Webhook-Format:', JSON.stringify(body, null, 2));
        return res.status(200).json({ success: true, message: 'Webhook empfangen, aber nicht verarbeitet' });
    }
    catch (error) {
        logger_1.logger.error('[WhatsApp Webhook] Fehler beim Verarbeiten:', error);
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
            const mapping = yield prisma_1.prisma.whatsAppPhoneNumberMapping.findFirst({
                where: { phoneNumberId },
                select: { branchId: true }
            });
            if (mapping) {
                logger_1.logger.log('[WhatsApp Webhook] Branch via Mapping gefunden:', mapping.branchId);
                return mapping.branchId;
            }
            // 2. Fallback: Suche Branch mit dieser phoneNumberId in Settings
            // Prisma unterstützt JSONB-Pfad-Suche nicht direkt, daher manuell
            const branches = yield prisma_1.prisma.branch.findMany({
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
                        logger_1.logger.log('[WhatsApp Webhook] Branch via Settings gefunden:', branch.id);
                        return branch.id;
                    }
                }
            }
            logger_1.logger.warn('[WhatsApp Webhook] Kein Branch gefunden für Phone Number ID:', phoneNumberId);
            return null;
        }
        catch (error) {
            logger_1.logger.error('[WhatsApp Webhook] Fehler bei Branch-Identifikation:', error);
            return null;
        }
    });
}
//# sourceMappingURL=whatsappController.js.map