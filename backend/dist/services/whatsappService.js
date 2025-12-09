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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const axios_1 = __importDefault(require("axios"));
const encryption_1 = require("../utils/encryption");
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
/**
 * WhatsApp Service für Versand von WhatsApp-Nachrichten
 *
 * Unterstützt:
 * - Twilio WhatsApp API
 * - WhatsApp Business API
 */
class WhatsAppService {
    /**
     * Constructor: Akzeptiert entweder organizationId ODER branchId
     * @param organizationId - Organisation ID (für Rückwärtskompatibilität)
     * @param branchId - Branch ID (neu)
     */
    constructor(organizationId, branchId) {
        if (!organizationId && !branchId) {
            throw new Error('Entweder organizationId oder branchId muss angegeben werden');
        }
        this.organizationId = organizationId;
        this.branchId = branchId;
    }
    /**
     * Lädt WhatsApp Settings aus Branch oder Organisation (mit Fallback)
     */
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            // 1. Versuche Branch Settings zu laden (wenn branchId gesetzt)
            if (this.branchId) {
                logger_1.logger.log(`[WhatsApp Service] Lade Settings für Branch ${this.branchId}`);
                const branch = yield prisma_1.prisma.branch.findUnique({
                    where: { id: this.branchId },
                    select: {
                        whatsappSettings: true,
                        organizationId: true
                    }
                });
                if (branch === null || branch === void 0 ? void 0 : branch.whatsappSettings) {
                    // Branch hat eigene WhatsApp Settings
                    logger_1.logger.log(`[WhatsApp Service] Branch hat eigene WhatsApp Settings`);
                    try {
                        // branch.whatsappSettings enthält direkt die WhatsApp Settings (kann verschachtelt sein)
                        // Verwende decryptBranchApiSettings für Branch Settings (entschlüsselt verschachtelte Settings)
                        const decrypted = (0, encryption_1.decryptBranchApiSettings)(branch.whatsappSettings);
                        // WhatsApp Settings können direkt im Root sein oder verschachtelt in whatsapp
                        let whatsappSettings = (decrypted === null || decrypted === void 0 ? void 0 : decrypted.whatsapp) || decrypted;
                        // Falls immer noch verschachtelt, extrahiere whatsapp
                        if (whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.whatsapp) {
                            whatsappSettings = whatsappSettings.whatsapp;
                        }
                        if (whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.apiKey) {
                            this.provider = whatsappSettings.provider || 'twilio';
                            this.apiKey = whatsappSettings.apiKey;
                            this.apiSecret = whatsappSettings.apiSecret;
                            this.phoneNumberId = whatsappSettings.phoneNumberId;
                            this.businessAccountId = whatsappSettings.businessAccountId;
                            logger_1.logger.log(`[WhatsApp Service] Branch Settings geladen:`, {
                                provider: this.provider,
                                hasApiKey: !!this.apiKey,
                                phoneNumberId: this.phoneNumberId
                            });
                            this.axiosInstance = this.createAxiosInstance();
                            return; // Erfolgreich geladen
                        }
                        else {
                            logger_1.logger.warn(`[WhatsApp Service] Branch Settings gefunden, aber kein API Key vorhanden`);
                        }
                    }
                    catch (error) {
                        logger_1.logger.warn(`[WhatsApp Service] Fehler beim Laden der Branch Settings:`, error);
                        // Fallback auf Organization Settings
                    }
                    // Fallback: Lade Organization Settings
                    if (branch.organizationId) {
                        logger_1.logger.log(`[WhatsApp Service] Fallback: Lade Organization Settings für Organisation ${branch.organizationId}`);
                        this.organizationId = branch.organizationId;
                    }
                }
                else if (branch === null || branch === void 0 ? void 0 : branch.organizationId) {
                    // Branch hat keine Settings, aber Organization ID
                    logger_1.logger.log(`[WhatsApp Service] Branch hat keine WhatsApp Settings, verwende Organization ${branch.organizationId}`);
                    this.organizationId = branch.organizationId;
                }
            }
            // 2. Lade Organization Settings (Fallback oder wenn nur organizationId)
            if (this.organizationId) {
                logger_1.logger.log(`[WhatsApp Service] Lade Settings für Organisation ${this.organizationId}`);
                const organization = yield prisma_1.prisma.organization.findUnique({
                    where: { id: this.organizationId },
                    select: { settings: true }
                });
                if (!(organization === null || organization === void 0 ? void 0 : organization.settings)) {
                    logger_1.logger.error(`[WhatsApp Service] Keine Settings für Organisation ${this.organizationId} gefunden`);
                    throw new Error(`WhatsApp ist nicht für Organisation ${this.organizationId} konfiguriert`);
                }
                // Prüfe ENCRYPTION_KEY
                const encryptionKey = process.env.ENCRYPTION_KEY;
                if (!encryptionKey) {
                    logger_1.logger.warn('[WhatsApp Service] ⚠️ ENCRYPTION_KEY nicht gesetzt - versuche Settings ohne Entschlüsselung zu laden');
                }
                else {
                    logger_1.logger.log(`[WhatsApp Service] ENCRYPTION_KEY ist gesetzt (Länge: ${encryptionKey.length})`);
                }
                try {
                    const settings = (0, encryption_1.decryptApiSettings)(organization.settings);
                    const whatsappSettings = settings === null || settings === void 0 ? void 0 : settings.whatsapp;
                    logger_1.logger.log(`[WhatsApp Service] WhatsApp Settings geladen:`, {
                        provider: whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.provider,
                        hasApiKey: !!(whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.apiKey),
                        apiKeyLength: ((_a = whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.apiKey) === null || _a === void 0 ? void 0 : _a.length) || 0,
                        apiKeyContainsColon: ((_b = whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.apiKey) === null || _b === void 0 ? void 0 : _b.includes(':')) || false,
                        apiKeyStart: ((_c = whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.apiKey) === null || _c === void 0 ? void 0 : _c.substring(0, 30)) || 'N/A',
                        hasPhoneNumberId: !!(whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.phoneNumberId),
                        phoneNumberId: whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.phoneNumberId
                    });
                    if (!(whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.apiKey)) {
                        logger_1.logger.error(`[WhatsApp Service] WhatsApp API Key fehlt für Organisation ${this.organizationId}`);
                        throw new Error(`WhatsApp API Key ist nicht für Organisation ${this.organizationId} konfiguriert`);
                    }
                    this.provider = whatsappSettings.provider || 'twilio';
                    this.apiKey = whatsappSettings.apiKey;
                    this.apiSecret = whatsappSettings.apiSecret;
                    this.phoneNumberId = whatsappSettings.phoneNumberId;
                    this.businessAccountId = whatsappSettings.businessAccountId;
                    logger_1.logger.log(`[WhatsApp Service] Provider: ${this.provider}, Phone Number ID: ${this.phoneNumberId}`);
                    // Erstelle Axios-Instanz basierend auf Provider
                    this.axiosInstance = this.createAxiosInstance();
                    return; // Erfolgreich geladen
                }
                catch (error) {
                    logger_1.logger.error('[WhatsApp Service] Fehler beim Laden der Settings:', error);
                    if (error instanceof Error) {
                        logger_1.logger.error('[WhatsApp Service] Fehlermeldung:', error.message);
                        logger_1.logger.error('[WhatsApp Service] Stack:', error.stack);
                    }
                    throw error;
                }
            }
            // Falls wir hier ankommen, wurde nichts gefunden
            throw new Error('WhatsApp Settings nicht gefunden (weder Branch noch Organization)');
        });
    }
    /**
     * Erstellt eine konfigurierte Axios-Instanz für WhatsApp API-Requests
     */
    createAxiosInstance() {
        if (this.provider === 'twilio') {
            // Twilio WhatsApp API
            return axios_1.default.create({
                baseURL: 'https://api.twilio.com/2010-04-01',
                timeout: 30000,
                auth: {
                    username: this.apiKey || '',
                    password: this.apiSecret || ''
                }
            });
        }
        else if (this.provider === 'whatsapp-business-api') {
            // WhatsApp Business API
            return axios_1.default.create({
                baseURL: `https://graph.facebook.com/v18.0/${this.phoneNumberId}`,
                timeout: 30000,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
        }
        else {
            throw new Error(`Unbekannter WhatsApp Provider: ${this.provider}`);
        }
    }
    /**
     * Sendet eine WhatsApp-Nachricht
     *
     * @param to - Telefonnummer des Empfängers (mit Ländercode, z.B. +573001234567) oder Group ID (z.B. 120363123456789012@g.us)
     * @param message - Nachrichtentext
     * @param template - Optional: Template-Name (für WhatsApp Business API)
     * @param groupId - Optional: Group ID für Gruppen-Nachrichten (falls to bereits Group ID ist, wird dieser Parameter ignoriert)
     * @returns true wenn erfolgreich
     */
    sendMessage(to, message, template, groupId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logger_1.logger.log(`[WhatsApp Service] sendMessage aufgerufen für: ${to}`);
                yield this.loadSettings();
                if (!this.axiosInstance) {
                    logger_1.logger.error('[WhatsApp Service] Axios-Instanz nicht initialisiert');
                    throw new Error('WhatsApp Service nicht initialisiert');
                }
                if (!this.apiKey) {
                    logger_1.logger.error('[WhatsApp Service] API Key nicht gesetzt');
                    throw new Error('WhatsApp API Key nicht gesetzt');
                }
                logger_1.logger.log(`[WhatsApp Service] Sende Nachricht via ${this.provider}...`);
                // Prüfe ob es eine Gruppen-Nachricht ist
                const isGroupMessage = groupId || (to.includes('@g.us'));
                const targetGroupId = groupId || (isGroupMessage ? to : null);
                if (isGroupMessage && targetGroupId) {
                    // Gruppen-Nachricht
                    logger_1.logger.log(`[WhatsApp Service] Sende Gruppen-Nachricht an: ${targetGroupId}`);
                    if (this.provider === 'whatsapp-business-api') {
                        return yield this.sendViaWhatsAppBusiness(targetGroupId, message, template, undefined, undefined, true);
                    }
                    else {
                        throw new Error('Gruppen-Nachrichten werden nur mit WhatsApp Business API unterstützt');
                    }
                }
                else {
                    // Einzel-Chat
                    // Normalisiere Telefonnummer (entferne Leerzeichen, füge + hinzu falls fehlt)
                    const normalizedPhone = this.normalizePhoneNumber(to);
                    if (this.provider === 'twilio') {
                        return yield this.sendViaTwilio(normalizedPhone, message);
                    }
                    else if (this.provider === 'whatsapp-business-api') {
                        return yield this.sendViaWhatsAppBusiness(normalizedPhone, message, template);
                    }
                    else {
                        throw new Error(`Unbekannter Provider: ${this.provider}`);
                    }
                }
            }
            catch (error) {
                logger_1.logger.error('[WhatsApp] Fehler beim Versenden:', error);
                throw error;
            }
        });
    }
    /**
     * Sendet ein Bild via WhatsApp
     */
    sendImage(to, imageUrl, caption) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logger_1.logger.log(`[WhatsApp Service] sendImage aufgerufen für: ${to}, Bild: ${imageUrl}`);
                yield this.loadSettings();
                if (!this.axiosInstance) {
                    logger_1.logger.error('[WhatsApp Service] Axios-Instanz nicht initialisiert');
                    throw new Error('WhatsApp Service nicht initialisiert');
                }
                if (!this.apiKey) {
                    logger_1.logger.error('[WhatsApp Service] API Key nicht gesetzt');
                    throw new Error('WhatsApp API Key nicht gesetzt');
                }
                logger_1.logger.log(`[WhatsApp Service] Sende Bild via ${this.provider}...`);
                // Normalisiere Telefonnummer
                const normalizedPhone = this.normalizePhoneNumber(to);
                if (this.provider === 'twilio') {
                    // Twilio unterstützt Media Messages
                    return yield this.sendImageViaTwilio(normalizedPhone, imageUrl, caption);
                }
                else if (this.provider === 'whatsapp-business-api') {
                    return yield this.sendImageViaWhatsAppBusiness(normalizedPhone, imageUrl, caption);
                }
                else {
                    throw new Error(`Unbekannter Provider: ${this.provider}`);
                }
            }
            catch (error) {
                logger_1.logger.error('[WhatsApp] Fehler beim Versenden des Bildes:', error);
                throw error;
            }
        });
    }
    /**
     * Sendet Bild über Twilio
     */
    sendImageViaTwilio(to, imageUrl, caption) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (!this.axiosInstance) {
                throw new Error('Twilio Service nicht initialisiert');
            }
            const accountSid = this.apiKey;
            const fromNumber = this.phoneNumberId || process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
            try {
                const params = {
                    From: fromNumber,
                    To: `whatsapp:${to}`,
                    MediaUrl: imageUrl
                };
                if (caption) {
                    params.Body = caption;
                }
                const response = yield this.axiosInstance.post(`/Accounts/${accountSid}/Messages.json`, new URLSearchParams(params), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                return response.status === 201;
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    logger_1.logger.error('[WhatsApp Twilio] API Fehler:', (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.data);
                    throw new Error(`Twilio API Fehler: ${JSON.stringify((_b = axiosError.response) === null || _b === void 0 ? void 0 : _b.data)}`);
                }
                throw error;
            }
        });
    }
    /**
     * Sendet Bild über WhatsApp Business API
     */
    sendImageViaWhatsAppBusiness(to, imageUrl, caption) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            if (!this.axiosInstance) {
                throw new Error('WhatsApp Business Service nicht initialisiert');
            }
            if (!this.phoneNumberId) {
                logger_1.logger.error('[WhatsApp Business] Phone Number ID fehlt!');
                throw new Error('WhatsApp Phone Number ID ist nicht konfiguriert');
            }
            try {
                // WhatsApp Business API unterstützt Media Messages via URL
                // Die URL muss öffentlich erreichbar sein (HTTPS)
                const payload = {
                    messaging_product: 'whatsapp',
                    to: to,
                    type: 'image',
                    image: {
                        link: imageUrl // URL muss HTTPS sein und öffentlich erreichbar
                    }
                };
                if (caption) {
                    payload.image.caption = caption;
                }
                logger_1.logger.log(`[WhatsApp Business] Sende Bild an ${to} via Phone Number ID ${this.phoneNumberId}`);
                logger_1.logger.log(`[WhatsApp Business] Payload:`, JSON.stringify(payload, null, 2));
                const response = yield this.axiosInstance.post('/messages', payload);
                logger_1.logger.log(`[WhatsApp Business] Response Status: ${response.status}`);
                logger_1.logger.log(`[WhatsApp Business] Response Data:`, JSON.stringify(response.data, null, 2));
                if ((_a = response.data) === null || _a === void 0 ? void 0 : _a.error) {
                    const errorData = response.data.error;
                    logger_1.logger.error(`[WhatsApp Business] ⚠️ Fehler in Response-Daten:`, errorData);
                    throw new Error(`WhatsApp Business API Fehler: ${JSON.stringify(errorData)}`);
                }
                const returnedMessageId = (_d = (_c = (_b = response.data) === null || _b === void 0 ? void 0 : _b.messages) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.id;
                if (returnedMessageId) {
                    logger_1.logger.log(`[WhatsApp Business] ✅ Bild gesendet, Message-ID: ${returnedMessageId}`);
                }
                return true;
            }
            catch (error) {
                logger_1.logger.error('[WhatsApp Business] Fehler beim Senden des Bildes:', error);
                throw error;
            }
        });
    }
    /**
     * Sendet Nachricht über Twilio
     */
    sendViaTwilio(to, message) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (!this.axiosInstance) {
                throw new Error('Twilio Service nicht initialisiert');
            }
            // Twilio Account SID ist der API Key
            const accountSid = this.apiKey;
            const fromNumber = this.phoneNumberId || process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
            try {
                const response = yield this.axiosInstance.post(`/Accounts/${accountSid}/Messages.json`, new URLSearchParams({
                    From: fromNumber,
                    To: `whatsapp:${to}`,
                    Body: message
                }), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                return response.status === 201;
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    logger_1.logger.error('[WhatsApp Twilio] API Fehler:', (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.data);
                    throw new Error(`Twilio API Fehler: ${JSON.stringify((_b = axiosError.response) === null || _b === void 0 ? void 0 : _b.data)}`);
                }
                throw error;
            }
        });
    }
    /**
     * Sendet Nachricht über WhatsApp Business API
     * @param templateParams - Optional: Template-Parameter (für Template Messages)
     * @param templateLanguage - Optional: Template-Sprache (Standard: 'en' oder aus Environment)
     * @param isGroup - Optional: true wenn es eine Gruppen-Nachricht ist
     */
    sendViaWhatsAppBusiness(to, message, template, templateParams, templateLanguage, isGroup) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
            if (!this.axiosInstance) {
                throw new Error('WhatsApp Business Service nicht initialisiert');
            }
            if (!this.phoneNumberId) {
                logger_1.logger.error('[WhatsApp Business] Phone Number ID fehlt!');
                throw new Error('WhatsApp Phone Number ID ist nicht konfiguriert');
            }
            try {
                let payload;
                // Wenn Template angegeben, verwende Template-Nachricht
                if (template) {
                    // Template-Sprache: Parameter > Environment-Variable > Standard (Standard: Spanisch, da Templates auf Spanisch sind)
                    const languageCode = templateLanguage || process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
                    payload = {
                        messaging_product: 'whatsapp',
                        to: to,
                        type: 'template',
                        template: {
                            name: template,
                            language: { code: languageCode }
                        }
                    };
                    // Füge Template-Parameter hinzu, falls vorhanden
                    if (templateParams && templateParams.length > 0) {
                        payload.template.components = [
                            {
                                type: 'body',
                                parameters: templateParams
                            }
                        ];
                    }
                }
                else {
                    // Normale Text-Nachricht (Session Message)
                    payload = {
                        messaging_product: 'whatsapp',
                        to: to,
                        type: 'text',
                        text: {
                            body: message
                        }
                    };
                }
                logger_1.logger.log(`[WhatsApp Business] Sende Nachricht an ${to} via Phone Number ID ${this.phoneNumberId}`);
                logger_1.logger.log(`[WhatsApp Business] Payload:`, JSON.stringify(payload, null, 2));
                logger_1.logger.log(`[WhatsApp Business] Base URL:`, this.axiosInstance.defaults.baseURL);
                const authHeader = (_a = this.axiosInstance.defaults.headers) === null || _a === void 0 ? void 0 : _a['Authorization'];
                if (authHeader) {
                    logger_1.logger.log(`[WhatsApp Business] Authorization Header Länge: ${authHeader.length}`);
                    logger_1.logger.log(`[WhatsApp Business] Authorization Header Vorschau: ${authHeader.substring(0, 50)}...`);
                    logger_1.logger.log(`[WhatsApp Business] Token Start: ${authHeader.substring(7, 30)}...`);
                    logger_1.logger.log(`[WhatsApp Business] Token Ende: ...${authHeader.substring(authHeader.length - 20)}`);
                }
                else {
                    logger_1.logger.error(`[WhatsApp Business] ⚠️ Authorization Header fehlt!`);
                }
                const response = yield this.axiosInstance.post('/messages', payload);
                logger_1.logger.log(`[WhatsApp Business] Response Status: ${response.status}`);
                logger_1.logger.log(`[WhatsApp Business] Response Headers:`, JSON.stringify(response.headers, null, 2));
                logger_1.logger.log(`[WhatsApp Business] Response Data:`, JSON.stringify(response.data, null, 2));
                // WICHTIG: Prüfe Response-Daten auch bei Status 200
                // Die API kann Status 200 zurückgeben, aber trotzdem Fehler in response.data enthalten
                if ((_b = response.data) === null || _b === void 0 ? void 0 : _b.error) {
                    const errorData = response.data.error;
                    const errorCode = errorData.code;
                    const errorMessage = (errorData.message || '').toLowerCase();
                    const errorSubcode = errorData.error_subcode;
                    logger_1.logger.error(`[WhatsApp Business] ⚠️ Fehler in Response-Daten (trotz Status 200):`, errorData);
                    // Prüfe ob es ein 24h-Fenster-Fehler ist
                    const is24HourWindowError = errorCode === 131047 ||
                        errorCode === 131026 ||
                        errorSubcode === 131047 ||
                        errorMessage.includes('24 hour') ||
                        errorMessage.includes('outside window') ||
                        errorMessage.includes('template required') ||
                        errorMessage.includes('outside the 24 hour');
                    if (is24HourWindowError) {
                        logger_1.logger.log(`[WhatsApp Business] ⚠️ 24h-Fenster-Fehler erkannt in Response-Daten`);
                    }
                    // Werfe Error, damit Template-Fallback ausgelöst wird
                    throw new Error(`WhatsApp Business API Fehler: ${JSON.stringify(errorData)}`);
                }
                // Prüfe ob Message-ID zurückgegeben wurde
                const returnedMessageId = (_e = (_d = (_c = response.data) === null || _c === void 0 ? void 0 : _c.messages) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.id;
                if (returnedMessageId) {
                    logger_1.logger.log(`[WhatsApp Business] ✅ Message-ID: ${returnedMessageId}`);
                    logger_1.logger.log(`[WhatsApp Business] ⚠️ WICHTIG: Status 200 bedeutet nur, dass die API die Nachricht akzeptiert hat.`);
                    logger_1.logger.log(`[WhatsApp Business] ⚠️ Die tatsächliche Zustellung kann über Webhook-Status-Updates verfolgt werden.`);
                    // Speichere ausgehende Nachricht in Datenbank
                    try {
                        const normalizedPhone = this.normalizePhoneNumber(to);
                        // Hole branchId (sollte bereits gesetzt sein, wenn Service mit branchId erstellt wurde)
                        let branchId = this.branchId;
                        if (!branchId && this.organizationId) {
                            // Fallback: Suche ersten Branch der Organisation
                            const branch = yield prisma_1.prisma.branch.findFirst({
                                where: { organizationId: this.organizationId },
                                select: { id: true }
                            });
                            branchId = branch === null || branch === void 0 ? void 0 : branch.id;
                        }
                        if (branchId) {
                            yield prisma_1.prisma.whatsAppMessage.create({
                                data: {
                                    direction: 'outgoing',
                                    phoneNumber: normalizedPhone,
                                    message: message,
                                    messageId: returnedMessageId,
                                    status: 'sent',
                                    branchId: branchId,
                                    sentAt: new Date()
                                }
                            });
                            logger_1.logger.log(`[WhatsApp Business] ✅ Ausgehende Nachricht in Datenbank gespeichert`);
                        }
                        else {
                            logger_1.logger.warn(`[WhatsApp Business] ⚠️ BranchId nicht verfügbar - Nachricht nicht in DB gespeichert`);
                        }
                    }
                    catch (dbError) {
                        logger_1.logger.error(`[WhatsApp Business] ⚠️ Fehler beim Speichern der ausgehenden Nachricht:`, dbError);
                        // Weiter mit Verarbeitung, auch wenn Speichern fehlschlägt
                    }
                    // Prüfe ob es Warnungen gibt (können auf mögliche Probleme hinweisen)
                    if (((_f = response.data) === null || _f === void 0 ? void 0 : _f.warnings) && Array.isArray(response.data.warnings) && response.data.warnings.length > 0) {
                        logger_1.logger.warn(`[WhatsApp Business] ⚠️ Warnungen in Response:`, JSON.stringify(response.data.warnings, null, 2));
                        // Prüfe ob Warnungen auf 24h-Fenster-Problem hinweisen
                        const warningsText = JSON.stringify(response.data.warnings).toLowerCase();
                        if (warningsText.includes('24 hour') || warningsText.includes('outside window') || warningsText.includes('template')) {
                            logger_1.logger.warn(`[WhatsApp Business] ⚠️ Warnungen deuten auf mögliches 24h-Fenster-Problem hin - Template-Fallback wird empfohlen`);
                            // Wir werfen hier keinen Error, weil die API die Nachricht akzeptiert hat
                            // Aber wir loggen es, damit der Template-Fallback später ausgelöst werden kann
                        }
                    }
                }
                else {
                    // Keine Message-ID zurückgegeben - könnte ein Problem sein
                    logger_1.logger.error(`[WhatsApp Business] ❌ Keine Message-ID in Response zurückgegeben - möglicherweise wurde die Nachricht nicht akzeptiert`);
                    logger_1.logger.error(`[WhatsApp Business] Response-Daten:`, JSON.stringify(response.data, null, 2));
                    // Prüfe ob es Warnungen gibt
                    if ((_g = response.data) === null || _g === void 0 ? void 0 : _g.warnings) {
                        logger_1.logger.warn(`[WhatsApp Business] ⚠️ Warnungen in Response:`, response.data.warnings);
                    }
                    // Prüfe ob response.data leer ist oder unerwartete Struktur hat
                    if (!response.data || Object.keys(response.data).length === 0) {
                        logger_1.logger.error(`[WhatsApp Business] ❌ Response-Daten sind leer - möglicherweise wurde die Nachricht nicht akzeptiert`);
                        throw new Error('WhatsApp Business API: Response-Daten sind leer - Nachricht wurde möglicherweise nicht akzeptiert');
                    }
                    // Wenn Template verwendet wird, ist Message-ID optional (kann später kommen)
                    // Aber bei Session Messages sollte eine Message-ID vorhanden sein
                    if (!template) {
                        logger_1.logger.error(`[WhatsApp Business] ❌ Session Message: Keine Message-ID zurückgegeben - Nachricht wurde möglicherweise nicht akzeptiert`);
                        throw new Error('WhatsApp Business API: Session Message - Keine Message-ID zurückgegeben - Nachricht wurde möglicherweise nicht akzeptiert');
                    }
                    else {
                        logger_1.logger.warn(`[WhatsApp Business] ⚠️ Template Message: Keine Message-ID zurückgegeben (kann normal sein, wird später über Webhook bestätigt)`);
                    }
                }
                return response.status === 200;
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    logger_1.logger.error('[WhatsApp Business] API Fehler Details:');
                    logger_1.logger.error('  Status:', (_h = axiosError.response) === null || _h === void 0 ? void 0 : _h.status);
                    logger_1.logger.error('  Status Text:', (_j = axiosError.response) === null || _j === void 0 ? void 0 : _j.statusText);
                    logger_1.logger.error('  Response Data:', JSON.stringify((_k = axiosError.response) === null || _k === void 0 ? void 0 : _k.data, null, 2));
                    logger_1.logger.error('  Request URL:', (_l = axiosError.config) === null || _l === void 0 ? void 0 : _l.url);
                    logger_1.logger.error('  Request Method:', (_m = axiosError.config) === null || _m === void 0 ? void 0 : _m.method);
                    logger_1.logger.error('  Request Headers:', JSON.stringify((_o = axiosError.config) === null || _o === void 0 ? void 0 : _o.headers, null, 2));
                    throw new Error(`WhatsApp Business API Fehler: ${JSON.stringify((_p = axiosError.response) === null || _p === void 0 ? void 0 : _p.data)}`);
                }
                logger_1.logger.error('[WhatsApp Business] Unbekannter Fehler:', error);
                throw error;
            }
        });
    }
    /**
     * Prüft ob ein Fehler auf "outside 24-hour window" hinweist
     */
    isOutside24HourWindowError(error) {
        var _a, _b, _c, _d;
        if (axios_1.default.isAxiosError(error)) {
            const errorData = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data;
            const errorCode = (_b = errorData === null || errorData === void 0 ? void 0 : errorData.error) === null || _b === void 0 ? void 0 : _b.code;
            const errorMessage = (((_c = errorData === null || errorData === void 0 ? void 0 : errorData.error) === null || _c === void 0 ? void 0 : _c.message) || '').toLowerCase();
            const errorSubcode = (_d = errorData === null || errorData === void 0 ? void 0 : errorData.error) === null || _d === void 0 ? void 0 : _d.error_subcode;
            // WhatsApp Business API Fehlercodes für 24h-Fenster
            // 131047 = Message outside 24-hour window
            // 131026 = Template required (auch bei 24h-Fenster)
            return (errorCode === 131047 ||
                errorCode === 131026 ||
                errorSubcode === 131047 ||
                errorMessage.includes('24 hour') ||
                errorMessage.includes('outside window') ||
                errorMessage.includes('template required') ||
                errorMessage.includes('outside the 24 hour'));
        }
        return false;
    }
    /**
     * Sendet Nachricht mit Fallback auf Template Message
     * Versucht zuerst Session Message (24h-Fenster), bei Fehler: Template Message
     *
     * @param to - Telefonnummer des Empfängers
     * @param message - Nachrichtentext (für Session Message)
     * @param templateName - Template-Name (für Fallback)
     * @param templateParams - Template-Parameter (Array von Text-Parametern)
     * @returns true wenn erfolgreich
     */
    sendMessageWithFallback(to, message, templateName, templateParams, reservation // NEU: Für Sprache-Erkennung
    ) {
        return __awaiter(this, void 0, void 0, function* () {
            // Prüfe ob 24h-Fenster aktiv ist (durch Datenbank-Prüfung auf eingehende Nachrichten)
            // Das 24h-Fenster wird durch eingehende Nachrichten aktiviert (wenn der Empfänger uns schreibt)
            if (templateName) {
                try {
                    const { prisma } = yield Promise.resolve().then(() => __importStar(require('../utils/prisma')));
                    const normalizedPhone = this.normalizePhoneNumber(to);
                    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    // Prüfe, ob es eine eingehende Nachricht von dieser Nummer in den letzten 24h gibt
                    const lastIncomingMessage = yield prisma.whatsAppMessage.findFirst({
                        where: {
                            phoneNumber: normalizedPhone,
                            direction: 'incoming',
                            sentAt: { gte: twentyFourHoursAgo }
                        },
                        orderBy: {
                            sentAt: 'desc'
                        }
                    });
                    if (!lastIncomingMessage) {
                        logger_1.logger.log(`[WhatsApp Service] ⚠️ Keine eingehende WhatsApp-Nachricht von ${to} in den letzten 24h gefunden - 24h-Fenster nicht aktiv - verwende direkt Template Message`);
                        // Überspringe Session Message und verwende direkt Template
                        yield this.loadSettings();
                        if (!this.axiosInstance || !this.phoneNumberId) {
                            throw new Error('WhatsApp Service nicht initialisiert');
                        }
                        const normalizedPhone2 = this.normalizePhoneNumber(to);
                        const formattedParams = (templateParams === null || templateParams === void 0 ? void 0 : templateParams.map(text => ({
                            type: 'text',
                            text: text
                        }))) || [];
                        // Template-Sprache: Reservation > Environment-Variable > Fallback
                        let languageCode;
                        if (reservation) {
                            const { CountryLanguageService } = require('./countryLanguageService');
                            languageCode = CountryLanguageService.getLanguageForReservation(reservation);
                        }
                        else {
                            languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
                        }
                        const adjustedTemplateName = this.getTemplateNameForLanguage(templateName, languageCode);
                        const templateResult = yield this.sendViaWhatsAppBusiness(normalizedPhone2, message, adjustedTemplateName, formattedParams, languageCode);
                        if (templateResult) {
                            logger_1.logger.log(`[WhatsApp Service] ✅ Template Message erfolgreich gesendet an ${to} (direkt, da 24h-Fenster nicht aktiv)`);
                            return true;
                        }
                        else {
                            throw new Error('Template Message gab false zurück');
                        }
                    }
                    else {
                        const hoursAgo = Math.round((Date.now() - lastIncomingMessage.sentAt.getTime()) / (60 * 60 * 1000));
                        logger_1.logger.log(`[WhatsApp Service] ✅ Eingehende WhatsApp-Nachricht von ${to} vor ${hoursAgo} Stunden gefunden - 24h-Fenster ist aktiv - versuche Session Message`);
                    }
                }
                catch (dbError) {
                    logger_1.logger.warn(`[WhatsApp Service] ⚠️ Fehler bei Datenbank-Prüfung für 24h-Fenster:`, dbError);
                    // Bei Fehler: Versuche trotzdem Session Message
                }
            }
            try {
                // Versuche zuerst Session Message (24h-Fenster)
                logger_1.logger.log(`[WhatsApp Service] Versuche Session Message (24h-Fenster) für ${to}...`);
                const sessionResult = yield this.sendMessage(to, message);
                if (sessionResult) {
                    logger_1.logger.log(`[WhatsApp Service] ✅ Session Message erfolgreich gesendet an ${to}`);
                    return true;
                }
                else {
                    logger_1.logger.warn(`[WhatsApp Service] ⚠️ Session Message gab false zurück für ${to}`);
                    throw new Error('Session Message gab false zurück');
                }
            }
            catch (error) {
                // Detailliertes Logging des Fehlers
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger_1.logger.error(`[WhatsApp Service] Fehler bei Session Message für ${to}:`, errorMessage);
                // Prüfe ob Fehler "outside 24h window" ist
                const is24HourWindowError = this.isOutside24HourWindowError(error);
                if (is24HourWindowError) {
                    logger_1.logger.log(`[WhatsApp Service] ⚠️ 24h-Fenster abgelaufen, verwende Template Message...`);
                }
                else {
                    logger_1.logger.log(`[WhatsApp Service] ⚠️ Session Message fehlgeschlagen (${errorMessage}), versuche Template Message als Fallback...`);
                }
                // Template-Fallback versuchen (wenn Template-Name vorhanden)
                // WICHTIG: Template-Fallback wird jetzt bei ALLEN Fehlern versucht, nicht nur bei 24h-Fenster-Fehlern
                // Das macht Sinn, weil Templates auch bei anderen Fehlern funktionieren können (z.B. OAuth-Fehler, etc.)
                if (!templateName) {
                    logger_1.logger.error('[WhatsApp Service] Template-Name fehlt für Fallback!');
                    if (is24HourWindowError) {
                        throw new Error('Template Message erforderlich (24h-Fenster abgelaufen), aber kein Template-Name angegeben');
                    }
                    else {
                        // Bei anderen Fehlern ist Template optional, aber empfohlen
                        logger_1.logger.warn('[WhatsApp Service] ⚠️ Template-Name fehlt - Session Message fehlgeschlagen, aber kein Fallback möglich');
                        throw error;
                    }
                }
                // Fallback: Template Message
                try {
                    logger_1.logger.log(`[WhatsApp Service] Lade Settings für Template Message...`);
                    yield this.loadSettings();
                    if (!this.axiosInstance || !this.phoneNumberId) {
                        throw new Error('WhatsApp Service nicht initialisiert');
                    }
                    const normalizedPhone = this.normalizePhoneNumber(to);
                    logger_1.logger.log(`[WhatsApp Service] Normalisierte Telefonnummer: ${normalizedPhone}`);
                    // Formatiere Template-Parameter
                    const formattedParams = (templateParams === null || templateParams === void 0 ? void 0 : templateParams.map(text => ({
                        type: 'text',
                        text: text
                    }))) || [];
                    logger_1.logger.log(`[WhatsApp Service] Template-Parameter: ${JSON.stringify(formattedParams)}`);
                    // Template-Sprache: Reservation > Environment-Variable > Fallback
                    let languageCode;
                    if (reservation) {
                        const { CountryLanguageService } = require('./countryLanguageService');
                        languageCode = CountryLanguageService.getLanguageForReservation(reservation);
                        logger_1.logger.log(`[WhatsApp Service] Template-Sprache: ${languageCode} (basierend auf Reservation)`);
                    }
                    else {
                        languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
                        logger_1.logger.log(`[WhatsApp Service] Template-Sprache: ${languageCode} (aus Environment-Variable)`);
                    }
                    // Passe Template-Namen basierend auf Sprache an
                    // Englische Templates haben einen Unterstrich am Ende: reservation_checkin_invitation_
                    // Spanische Templates haben keinen Unterstrich: reservation_checkin_invitation
                    const adjustedTemplateName = this.getTemplateNameForLanguage(templateName, languageCode);
                    logger_1.logger.log(`[WhatsApp Service] Template-Name (angepasst für Sprache ${languageCode}): ${adjustedTemplateName}`);
                    const templateResult = yield this.sendViaWhatsAppBusiness(normalizedPhone, message, adjustedTemplateName, formattedParams, languageCode);
                    if (templateResult) {
                        logger_1.logger.log(`[WhatsApp Service] ✅ Template Message erfolgreich gesendet an ${to} (Fallback nach Session Message Fehler)`);
                        return true;
                    }
                    else {
                        logger_1.logger.error(`[WhatsApp Service] ❌ Template Message gab false zurück für ${to}`);
                        throw new Error('Template Message gab false zurück');
                    }
                }
                catch (templateError) {
                    logger_1.logger.error('[WhatsApp Service] ❌ Fehler bei Template Message:', templateError);
                    const templateErrorMessage = templateError instanceof Error ? templateError.message : String(templateError);
                    logger_1.logger.error('[WhatsApp Service] Template Error Details:', templateErrorMessage);
                    // Wenn Template auch fehlschlägt, werfe den ursprünglichen Fehler (Session Message Fehler)
                    // Das gibt mehr Kontext über das ursprüngliche Problem
                    throw new Error(`Session Message fehlgeschlagen: ${errorMessage}. Template-Fallback auch fehlgeschlagen: ${templateErrorMessage}`);
                }
            }
        });
    }
    /**
     * Normalisiert Telefonnummer (entfernt Leerzeichen, fügt + hinzu)
     */
    normalizePhoneNumber(phone) {
        // Entferne alle Leerzeichen und Bindestriche
        let normalized = phone.replace(/[\s-]/g, '');
        // Füge + hinzu falls nicht vorhanden
        if (!normalized.startsWith('+')) {
            normalized = '+' + normalized;
        }
        return normalized;
    }
    /**
     * Gibt den Template-Namen basierend auf der Sprache zurück
     *
     * WhatsApp erlaubt Templates mit gleichem Namen in verschiedenen Sprachen.
     * Einige Templates haben einen Unterstrich am Ende für Englisch (z.B. reservation_checkin_invitation_),
     * andere haben den gleichen Namen für beide Sprachen (z.B. reservation_checkin_completed).
     *
     * @param baseTemplateName - Basis-Template-Name (z.B. 'reservation_checkin_invitation')
     * @param languageCode - Sprache-Code ('en' oder 'es')
     * @returns Template-Name mit sprachspezifischem Suffix (wenn nötig)
     */
    getTemplateNameForLanguage(baseTemplateName, languageCode) {
        // Templates mit gleichem Namen für beide Sprachen (kein Unterstrich)
        const sameNameTemplates = ['reservation_checkin_completed'];
        if (sameNameTemplates.includes(baseTemplateName)) {
            // Gleicher Name für beide Sprachen
            return baseTemplateName;
        }
        // Englische Templates haben einen Unterstrich am Ende (für alte Templates)
        if (languageCode === 'en') {
            return `${baseTemplateName}_`;
        }
        // Spanische Templates haben keinen Unterstrich
        return baseTemplateName;
    }
    /**
     * Sendet direkt eine Template Message (ohne Session Message zu versuchen)
     *
     * WICHTIG: Diese Methode verwendet NUR Template Messages, keine Session Messages.
     * Verwendung für Reservation-Einladungen, wo das 24h-Fenster meist nicht aktiv ist.
     *
     * @param to - Telefonnummer des Empfängers
     * @param templateName - Template-Name (Basis, wird basierend auf Sprache angepasst)
     * @param templateParams - Template-Parameter (Array von Strings)
     * @param message - Nachrichtentext (wird ignoriert, da Template verwendet wird)
     * @param reservation - Optional: Reservation mit guestNationality und/oder guestPhone für Sprache-Erkennung
     * @returns true wenn erfolgreich
     */
    sendTemplateMessageDirectly(to, templateName, templateParams, message, // Wird ignoriert, nur für Kompatibilität
    reservation // NEU: Für Sprache-Erkennung
    ) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logger_1.logger.log(`[WhatsApp Service] Sende DIREKT Template Message an ${to} (kein Session Message Fallback)`);
                yield this.loadSettings();
                if (!this.axiosInstance || !this.phoneNumberId) {
                    throw new Error('WhatsApp Service nicht initialisiert');
                }
                const normalizedPhone = this.normalizePhoneNumber(to);
                logger_1.logger.log(`[WhatsApp Service] Normalisierte Telefonnummer: ${normalizedPhone}`);
                // Formatiere Template-Parameter
                const formattedParams = templateParams.map(text => ({
                    type: 'text',
                    text: String(text)
                }));
                logger_1.logger.log(`[WhatsApp Service] Template-Parameter: ${JSON.stringify(formattedParams)}`);
                // Template-Sprache: Reservation > Environment-Variable > Fallback
                let languageCode;
                if (reservation) {
                    const { CountryLanguageService } = require('./countryLanguageService');
                    languageCode = CountryLanguageService.getLanguageForReservation(reservation);
                    logger_1.logger.log(`[WhatsApp Service] Template-Sprache: ${languageCode} (basierend auf Reservation)`);
                }
                else {
                    languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
                    logger_1.logger.log(`[WhatsApp Service] Template-Sprache: ${languageCode} (aus Environment-Variable)`);
                }
                // Passe Template-Namen basierend auf Sprache an
                const adjustedTemplateName = this.getTemplateNameForLanguage(templateName, languageCode);
                logger_1.logger.log(`[WhatsApp Service] Template-Name (angepasst für Sprache ${languageCode}): ${adjustedTemplateName}`);
                const templateResult = yield this.sendViaWhatsAppBusiness(normalizedPhone, message || '', // Wird ignoriert, da Template verwendet wird
                adjustedTemplateName, formattedParams, languageCode);
                if (templateResult) {
                    logger_1.logger.log(`[WhatsApp Service] ✅ Template Message erfolgreich gesendet an ${to}`);
                    return true;
                }
                else {
                    logger_1.logger.error(`[WhatsApp Service] ❌ Template Message gab false zurück für ${to}`);
                    throw new Error('Template Message gab false zurück');
                }
            }
            catch (error) {
                logger_1.logger.error('[WhatsApp Service] ❌ Fehler bei Template Message:', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger_1.logger.error('[WhatsApp Service] Template Error Details:', errorMessage);
                throw error;
            }
        });
    }
    /**
     * Sendet Check-in-Einladung per WhatsApp
     * Verwendet Hybrid-Ansatz: Session Message mit Fallback auf Template
     *
     * @param guestName - Name des Gastes
     * @param guestPhone - Telefonnummer des Gastes
     * @param checkInLink - Link zum Online-Check-in
     * @param paymentLink - Link zur Zahlung (Bold Payment)
     * @returns true wenn erfolgreich
     */
    sendCheckInInvitation(guestName, guestPhone, checkInLink, paymentLink) {
        return __awaiter(this, void 0, void 0, function* () {
            const message = `Hola ${guestName},

¡Nos complace darte la bienvenida a La Familia Hostel! 🎊

En caso de que llegues después de las 18:00 o antes de las 09:00, nuestra recepción 🛎️ estará cerrada.

Te pedimos amablemente que completes el check-in y el pago en línea con anticipación:

Check-In:

${checkInLink}

Por favor, realiza el pago por adelantado:

${paymentLink}

Por favor, escríbenos brevemente una vez que hayas completado tanto el check-in como el pago, para que podamos enviarte tu código PIN 🔑 para la puerta de entrada.

¡Gracias!

¡Esperamos verte pronto!`;
            // Template-Name aus Environment oder Settings (Standard: reservation_checkin_invitation)
            // Hinweis: Der tatsächliche Template-Name wird in sendMessageWithFallback basierend auf Sprache angepasst
            const baseTemplateName = process.env.WHATSAPP_TEMPLATE_CHECKIN_INVITATION || 'reservation_checkin_invitation';
            // Template-Parameter (müssen in der Reihenfolge der {{1}}, {{2}}, {{3}} im Template sein)
            const templateParams = [guestName, checkInLink, paymentLink];
            return yield this.sendMessageWithFallback(guestPhone, message, baseTemplateName, templateParams);
        });
    }
    /**
     * Sendet Check-in-Bestätigung per WhatsApp
     * Verwendet Hybrid-Ansatz: Session Message mit Fallback auf Template
     *
     * @param guestName - Name des Gastes
     * @param guestPhone - Telefonnummer des Gastes
     * @param roomNumber - Zimmernummer
     * @param roomDescription - Zimmerbeschreibung
     * @param doorPin - PIN für Türsystem
     * @param doorAppName - App-Name (z.B. "TTLock")
     * @param reservation - Optional: Reservation für Sprache-Erkennung
     * @returns true wenn erfolgreich
     */
    sendCheckInConfirmation(guestName, guestPhone, roomNumber, roomDescription, doorPin, doorAppName, reservation) {
        return __awaiter(this, void 0, void 0, function* () {
            // Erkenne Sprache für Template
            let languageCode;
            if (reservation) {
                const { CountryLanguageService } = require('./countryLanguageService');
                languageCode = CountryLanguageService.getLanguageForReservation(reservation);
            }
            else {
                languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
            }
            // Baue Variablen für Template auf
            // {{1}} = Name mit Begrüßung
            const greeting = languageCode === 'en' ? `Hello ${guestName},` : `Hola ${guestName},`;
            // {{2}} = Kompletter Text mit Zimmerinfo und PIN
            let contentText;
            if (languageCode === 'en') {
                contentText = `Your check-in has been completed successfully!

Your room information:
- Room: ${roomNumber}
- Description: ${roomDescription}

Access:
- Door PIN: ${doorPin}
- App: ${doorAppName}`;
            }
            else {
                contentText = `¡Tu check-in se ha completado exitosamente!

Información de tu habitación:
- Habitación: ${roomNumber}
- Descripción: ${roomDescription}

Acceso:
- PIN de la puerta: ${doorPin}
- App: ${doorAppName}`;
            }
            // Session Message (Fallback)
            const message = languageCode === 'en'
                ? `${greeting}\n\n${contentText}\n\nWe wish you a pleasant stay!`
                : `${greeting}\n\n${contentText}\n\n¡Te deseamos una estancia agradable!`;
            // Template-Name aus Environment oder Settings (Standard: reservation_checkin_completed)
            const templateName = process.env.WHATSAPP_TEMPLATE_CHECKIN_CONFIRMATION || 'reservation_checkin_completed';
            // Template-Parameter (müssen in der Reihenfolge der {{1}}, {{2}} im Template sein)
            // Format: Name mit Begrüßung, Kompletter Text mit Zimmerinfo und PIN
            const templateParams = [greeting, contentText];
            return yield this.sendMessageWithFallback(guestPhone, message, templateName, templateParams, reservation);
        });
    }
    /**
     * Statische Methode: Erstellt Service für Branch
     * @param branchId - Branch ID
     * @returns WhatsAppService-Instanz
     */
    static getServiceForBranch(branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            const service = new WhatsAppService(undefined, branchId);
            yield service.loadSettings();
            return service;
        });
    }
    /**
     * Statische Methode: Erstellt Service für Organization (Rückwärtskompatibel)
     * @param organizationId - Organization ID
     * @returns WhatsAppService-Instanz
     */
    static getServiceForOrganization(organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            const service = new WhatsAppService(organizationId);
            yield service.loadSettings();
            return service;
        });
    }
    /**
     * Lädt Media von der WhatsApp Business API herunter
     * @param mediaId - Media ID von WhatsApp
     * @returns Buffer mit den Mediendaten und MIME-Type
     */
    downloadMedia(mediaId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                yield this.loadSettings();
                if (this.provider !== 'whatsapp-business-api') {
                    throw new Error('Media-Download nur für WhatsApp Business API unterstützt');
                }
                if (!this.axiosInstance || !this.apiKey) {
                    throw new Error('WhatsApp Service nicht initialisiert');
                }
                logger_1.logger.log(`[WhatsApp Service] Lade Media ${mediaId} herunter...`);
                // Schritt 1: Hole Media-URL
                // WhatsApp Business API Endpoint: GET https://graph.facebook.com/v18.0/{media-id}
                // Erstelle separate Axios-Instanz für Media-Download (baseURL enthält phoneNumberId, was hier nicht benötigt wird)
                const mediaApiClient = axios_1.default.create({
                    baseURL: 'https://graph.facebook.com/v18.0',
                    timeout: 30000,
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                });
                const mediaInfoResponse = yield mediaApiClient.get(`/${mediaId}`);
                const mediaUrl = mediaInfoResponse.data.url;
                const mimeType = mediaInfoResponse.data.mime_type || 'image/jpeg';
                const fileName = mediaInfoResponse.data.filename || `whatsapp-media-${mediaId}.${this.getFileExtension(mimeType)}`;
                logger_1.logger.log(`[WhatsApp Service] Media-URL erhalten: ${mediaUrl.substring(0, 50)}...`);
                // Schritt 2: Lade die tatsächliche Datei herunter
                const mediaResponse = yield axios_1.default.get(mediaUrl, {
                    responseType: 'arraybuffer',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                });
                const buffer = Buffer.from(mediaResponse.data);
                logger_1.logger.log(`[WhatsApp Service] Media heruntergeladen: ${buffer.length} bytes, Type: ${mimeType}`);
                return {
                    buffer,
                    mimeType,
                    fileName
                };
            }
            catch (error) {
                logger_1.logger.error('[WhatsApp Service] Fehler beim Herunterladen von Media:', error);
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    logger_1.logger.error('[WhatsApp Service] API Fehler:', (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.data);
                    throw new Error(`WhatsApp Media Download Fehler: ${JSON.stringify((_b = axiosError.response) === null || _b === void 0 ? void 0 : _b.data)}`);
                }
                throw error;
            }
        });
    }
    /**
     * Hilfsmethode: Ermittelt Dateiendung aus MIME-Type
     */
    getFileExtension(mimeType) {
        const mimeToExt = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'application/pdf': 'pdf',
            'video/mp4': 'mp4',
            'video/webm': 'webm',
            'audio/mpeg': 'mp3',
            'audio/ogg': 'ogg'
        };
        return mimeToExt[mimeType] || 'bin';
    }
}
exports.WhatsAppService = WhatsAppService;
//# sourceMappingURL=whatsappService.js.map