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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const axios_1 = __importDefault(require("axios"));
const encryption_1 = require("../utils/encryption");
const prisma_1 = require("../utils/prisma");
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
                console.log(`[WhatsApp Service] Lade Settings für Branch ${this.branchId}`);
                const branch = yield prisma_1.prisma.branch.findUnique({
                    where: { id: this.branchId },
                    select: {
                        whatsappSettings: true,
                        organizationId: true
                    }
                });
                if (branch === null || branch === void 0 ? void 0 : branch.whatsappSettings) {
                    // Branch hat eigene WhatsApp Settings
                    console.log(`[WhatsApp Service] Branch hat eigene WhatsApp Settings`);
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
                            console.log(`[WhatsApp Service] Branch Settings geladen:`, {
                                provider: this.provider,
                                hasApiKey: !!this.apiKey,
                                phoneNumberId: this.phoneNumberId
                            });
                            this.axiosInstance = this.createAxiosInstance();
                            return; // Erfolgreich geladen
                        }
                        else {
                            console.warn(`[WhatsApp Service] Branch Settings gefunden, aber kein API Key vorhanden`);
                        }
                    }
                    catch (error) {
                        console.warn(`[WhatsApp Service] Fehler beim Laden der Branch Settings:`, error);
                        // Fallback auf Organization Settings
                    }
                    // Fallback: Lade Organization Settings
                    if (branch.organizationId) {
                        console.log(`[WhatsApp Service] Fallback: Lade Organization Settings für Organisation ${branch.organizationId}`);
                        this.organizationId = branch.organizationId;
                    }
                }
                else if (branch === null || branch === void 0 ? void 0 : branch.organizationId) {
                    // Branch hat keine Settings, aber Organization ID
                    console.log(`[WhatsApp Service] Branch hat keine WhatsApp Settings, verwende Organization ${branch.organizationId}`);
                    this.organizationId = branch.organizationId;
                }
            }
            // 2. Lade Organization Settings (Fallback oder wenn nur organizationId)
            if (this.organizationId) {
                console.log(`[WhatsApp Service] Lade Settings für Organisation ${this.organizationId}`);
                const organization = yield prisma_1.prisma.organization.findUnique({
                    where: { id: this.organizationId },
                    select: { settings: true }
                });
                if (!(organization === null || organization === void 0 ? void 0 : organization.settings)) {
                    console.error(`[WhatsApp Service] Keine Settings für Organisation ${this.organizationId} gefunden`);
                    throw new Error(`WhatsApp ist nicht für Organisation ${this.organizationId} konfiguriert`);
                }
                // Prüfe ENCRYPTION_KEY
                const encryptionKey = process.env.ENCRYPTION_KEY;
                if (!encryptionKey) {
                    console.warn('[WhatsApp Service] ⚠️ ENCRYPTION_KEY nicht gesetzt - versuche Settings ohne Entschlüsselung zu laden');
                }
                else {
                    console.log(`[WhatsApp Service] ENCRYPTION_KEY ist gesetzt (Länge: ${encryptionKey.length})`);
                }
                try {
                    const settings = (0, encryption_1.decryptApiSettings)(organization.settings);
                    const whatsappSettings = settings === null || settings === void 0 ? void 0 : settings.whatsapp;
                    console.log(`[WhatsApp Service] WhatsApp Settings geladen:`, {
                        provider: whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.provider,
                        hasApiKey: !!(whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.apiKey),
                        apiKeyLength: ((_a = whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.apiKey) === null || _a === void 0 ? void 0 : _a.length) || 0,
                        apiKeyContainsColon: ((_b = whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.apiKey) === null || _b === void 0 ? void 0 : _b.includes(':')) || false,
                        apiKeyStart: ((_c = whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.apiKey) === null || _c === void 0 ? void 0 : _c.substring(0, 30)) || 'N/A',
                        hasPhoneNumberId: !!(whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.phoneNumberId),
                        phoneNumberId: whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.phoneNumberId
                    });
                    if (!(whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.apiKey)) {
                        console.error(`[WhatsApp Service] WhatsApp API Key fehlt für Organisation ${this.organizationId}`);
                        throw new Error(`WhatsApp API Key ist nicht für Organisation ${this.organizationId} konfiguriert`);
                    }
                    this.provider = whatsappSettings.provider || 'twilio';
                    this.apiKey = whatsappSettings.apiKey;
                    this.apiSecret = whatsappSettings.apiSecret;
                    this.phoneNumberId = whatsappSettings.phoneNumberId;
                    this.businessAccountId = whatsappSettings.businessAccountId;
                    console.log(`[WhatsApp Service] Provider: ${this.provider}, Phone Number ID: ${this.phoneNumberId}`);
                    // Erstelle Axios-Instanz basierend auf Provider
                    this.axiosInstance = this.createAxiosInstance();
                    return; // Erfolgreich geladen
                }
                catch (error) {
                    console.error('[WhatsApp Service] Fehler beim Laden der Settings:', error);
                    if (error instanceof Error) {
                        console.error('[WhatsApp Service] Fehlermeldung:', error.message);
                        console.error('[WhatsApp Service] Stack:', error.stack);
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
                console.log(`[WhatsApp Service] sendMessage aufgerufen für: ${to}`);
                yield this.loadSettings();
                if (!this.axiosInstance) {
                    console.error('[WhatsApp Service] Axios-Instanz nicht initialisiert');
                    throw new Error('WhatsApp Service nicht initialisiert');
                }
                if (!this.apiKey) {
                    console.error('[WhatsApp Service] API Key nicht gesetzt');
                    throw new Error('WhatsApp API Key nicht gesetzt');
                }
                console.log(`[WhatsApp Service] Sende Nachricht via ${this.provider}...`);
                // Prüfe ob es eine Gruppen-Nachricht ist
                const isGroupMessage = groupId || (to.includes('@g.us'));
                const targetGroupId = groupId || (isGroupMessage ? to : null);
                if (isGroupMessage && targetGroupId) {
                    // Gruppen-Nachricht
                    console.log(`[WhatsApp Service] Sende Gruppen-Nachricht an: ${targetGroupId}`);
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
                console.error('[WhatsApp] Fehler beim Versenden:', error);
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
                    console.error('[WhatsApp Twilio] API Fehler:', (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.data);
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
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
            if (!this.axiosInstance) {
                throw new Error('WhatsApp Business Service nicht initialisiert');
            }
            if (!this.phoneNumberId) {
                console.error('[WhatsApp Business] Phone Number ID fehlt!');
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
                console.log(`[WhatsApp Business] Sende Nachricht an ${to} via Phone Number ID ${this.phoneNumberId}`);
                console.log(`[WhatsApp Business] Payload:`, JSON.stringify(payload, null, 2));
                console.log(`[WhatsApp Business] Base URL:`, this.axiosInstance.defaults.baseURL);
                const authHeader = (_a = this.axiosInstance.defaults.headers) === null || _a === void 0 ? void 0 : _a['Authorization'];
                if (authHeader) {
                    console.log(`[WhatsApp Business] Authorization Header Länge: ${authHeader.length}`);
                    console.log(`[WhatsApp Business] Authorization Header Vorschau: ${authHeader.substring(0, 50)}...`);
                    console.log(`[WhatsApp Business] Token Start: ${authHeader.substring(7, 30)}...`);
                    console.log(`[WhatsApp Business] Token Ende: ...${authHeader.substring(authHeader.length - 20)}`);
                }
                else {
                    console.error(`[WhatsApp Business] ⚠️ Authorization Header fehlt!`);
                }
                const response = yield this.axiosInstance.post('/messages', payload);
                console.log(`[WhatsApp Business] ✅ Nachricht erfolgreich gesendet. Status: ${response.status}`);
                console.log(`[WhatsApp Business] Response:`, JSON.stringify(response.data, null, 2));
                // WICHTIG: Prüfe Response-Daten auch bei Status 200
                // Die API kann Status 200 zurückgeben, aber trotzdem Fehler in response.data enthalten
                if ((_b = response.data) === null || _b === void 0 ? void 0 : _b.error) {
                    const errorData = response.data.error;
                    const errorCode = errorData.code;
                    const errorMessage = (errorData.message || '').toLowerCase();
                    const errorSubcode = errorData.error_subcode;
                    console.error(`[WhatsApp Business] ⚠️ Fehler in Response-Daten (trotz Status 200):`, errorData);
                    // Prüfe ob es ein 24h-Fenster-Fehler ist
                    const is24HourWindowError = errorCode === 131047 ||
                        errorCode === 131026 ||
                        errorSubcode === 131047 ||
                        errorMessage.includes('24 hour') ||
                        errorMessage.includes('outside window') ||
                        errorMessage.includes('template required') ||
                        errorMessage.includes('outside the 24 hour');
                    if (is24HourWindowError) {
                        console.log(`[WhatsApp Business] ⚠️ 24h-Fenster-Fehler erkannt in Response-Daten`);
                    }
                    // Werfe Error, damit Template-Fallback ausgelöst wird
                    throw new Error(`WhatsApp Business API Fehler: ${JSON.stringify(errorData)}`);
                }
                // Prüfe ob Message-ID zurückgegeben wurde
                if ((_e = (_d = (_c = response.data) === null || _c === void 0 ? void 0 : _c.messages) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.id) {
                    const messageId = response.data.messages[0].id;
                    console.log(`[WhatsApp Business] Message-ID: ${messageId}`);
                    console.log(`[WhatsApp Business] ⚠️ WICHTIG: Status 200 bedeutet nur, dass die API die Nachricht akzeptiert hat.`);
                    console.log(`[WhatsApp Business] ⚠️ Die tatsächliche Zustellung kann über Webhook-Status-Updates verfolgt werden.`);
                }
                else {
                    // Keine Message-ID zurückgegeben - könnte ein Problem sein
                    console.warn(`[WhatsApp Business] ⚠️ Keine Message-ID in Response zurückgegeben`);
                    // Prüfe ob es Warnungen gibt
                    if ((_f = response.data) === null || _f === void 0 ? void 0 : _f.warnings) {
                        console.warn(`[WhatsApp Business] ⚠️ Warnungen in Response:`, response.data.warnings);
                    }
                }
                return response.status === 200;
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    console.error('[WhatsApp Business] API Fehler Details:');
                    console.error('  Status:', (_g = axiosError.response) === null || _g === void 0 ? void 0 : _g.status);
                    console.error('  Status Text:', (_h = axiosError.response) === null || _h === void 0 ? void 0 : _h.statusText);
                    console.error('  Response Data:', JSON.stringify((_j = axiosError.response) === null || _j === void 0 ? void 0 : _j.data, null, 2));
                    console.error('  Request URL:', (_k = axiosError.config) === null || _k === void 0 ? void 0 : _k.url);
                    console.error('  Request Method:', (_l = axiosError.config) === null || _l === void 0 ? void 0 : _l.method);
                    console.error('  Request Headers:', JSON.stringify((_m = axiosError.config) === null || _m === void 0 ? void 0 : _m.headers, null, 2));
                    throw new Error(`WhatsApp Business API Fehler: ${JSON.stringify((_o = axiosError.response) === null || _o === void 0 ? void 0 : _o.data)}`);
                }
                console.error('[WhatsApp Business] Unbekannter Fehler:', error);
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
            try {
                // Versuche zuerst Session Message (24h-Fenster)
                console.log(`[WhatsApp Service] Versuche Session Message (24h-Fenster) für ${to}...`);
                const sessionResult = yield this.sendMessage(to, message);
                if (sessionResult) {
                    console.log(`[WhatsApp Service] ✅ Session Message erfolgreich gesendet an ${to}`);
                    return true;
                }
                else {
                    console.warn(`[WhatsApp Service] ⚠️ Session Message gab false zurück für ${to}`);
                    throw new Error('Session Message gab false zurück');
                }
            }
            catch (error) {
                // Detailliertes Logging des Fehlers
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`[WhatsApp Service] Fehler bei Session Message für ${to}:`, errorMessage);
                // Prüfe ob Fehler "outside 24h window" ist
                const is24HourWindowError = this.isOutside24HourWindowError(error);
                if (is24HourWindowError) {
                    console.log(`[WhatsApp Service] ⚠️ 24h-Fenster abgelaufen, verwende Template Message...`);
                }
                else {
                    console.log(`[WhatsApp Service] ⚠️ Session Message fehlgeschlagen (${errorMessage}), versuche Template Message als Fallback...`);
                }
                // Template-Fallback versuchen (wenn Template-Name vorhanden)
                // WICHTIG: Template-Fallback wird jetzt bei ALLEN Fehlern versucht, nicht nur bei 24h-Fenster-Fehlern
                // Das macht Sinn, weil Templates auch bei anderen Fehlern funktionieren können (z.B. OAuth-Fehler, etc.)
                if (!templateName) {
                    console.error('[WhatsApp Service] Template-Name fehlt für Fallback!');
                    if (is24HourWindowError) {
                        throw new Error('Template Message erforderlich (24h-Fenster abgelaufen), aber kein Template-Name angegeben');
                    }
                    else {
                        // Bei anderen Fehlern ist Template optional, aber empfohlen
                        console.warn('[WhatsApp Service] ⚠️ Template-Name fehlt - Session Message fehlgeschlagen, aber kein Fallback möglich');
                        throw error;
                    }
                }
                // Fallback: Template Message
                try {
                    console.log(`[WhatsApp Service] Lade Settings für Template Message...`);
                    yield this.loadSettings();
                    if (!this.axiosInstance || !this.phoneNumberId) {
                        throw new Error('WhatsApp Service nicht initialisiert');
                    }
                    const normalizedPhone = this.normalizePhoneNumber(to);
                    console.log(`[WhatsApp Service] Normalisierte Telefonnummer: ${normalizedPhone}`);
                    // Formatiere Template-Parameter
                    const formattedParams = (templateParams === null || templateParams === void 0 ? void 0 : templateParams.map(text => ({
                        type: 'text',
                        text: text
                    }))) || [];
                    console.log(`[WhatsApp Service] Template-Parameter: ${JSON.stringify(formattedParams)}`);
                    // Template-Sprache: Reservation > Environment-Variable > Fallback
                    let languageCode;
                    if (reservation) {
                        const { CountryLanguageService } = require('./countryLanguageService');
                        languageCode = CountryLanguageService.getLanguageForReservation(reservation);
                        console.log(`[WhatsApp Service] Template-Sprache: ${languageCode} (basierend auf Reservation)`);
                    }
                    else {
                        languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
                        console.log(`[WhatsApp Service] Template-Sprache: ${languageCode} (aus Environment-Variable)`);
                    }
                    // Passe Template-Namen basierend auf Sprache an
                    // Englische Templates haben einen Unterstrich am Ende: reservation_checkin_invitation_
                    // Spanische Templates haben keinen Unterstrich: reservation_checkin_invitation
                    const adjustedTemplateName = this.getTemplateNameForLanguage(templateName, languageCode);
                    console.log(`[WhatsApp Service] Template-Name (angepasst für Sprache ${languageCode}): ${adjustedTemplateName}`);
                    const templateResult = yield this.sendViaWhatsAppBusiness(normalizedPhone, message, adjustedTemplateName, formattedParams, languageCode);
                    if (templateResult) {
                        console.log(`[WhatsApp Service] ✅ Template Message erfolgreich gesendet an ${to} (Fallback nach Session Message Fehler)`);
                        return true;
                    }
                    else {
                        console.error(`[WhatsApp Service] ❌ Template Message gab false zurück für ${to}`);
                        throw new Error('Template Message gab false zurück');
                    }
                }
                catch (templateError) {
                    console.error('[WhatsApp Service] ❌ Fehler bei Template Message:', templateError);
                    const templateErrorMessage = templateError instanceof Error ? templateError.message : String(templateError);
                    console.error('[WhatsApp Service] Template Error Details:', templateErrorMessage);
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
                console.log(`[WhatsApp Service] Sende DIREKT Template Message an ${to} (kein Session Message Fallback)`);
                yield this.loadSettings();
                if (!this.axiosInstance || !this.phoneNumberId) {
                    throw new Error('WhatsApp Service nicht initialisiert');
                }
                const normalizedPhone = this.normalizePhoneNumber(to);
                console.log(`[WhatsApp Service] Normalisierte Telefonnummer: ${normalizedPhone}`);
                // Formatiere Template-Parameter
                const formattedParams = templateParams.map(text => ({
                    type: 'text',
                    text: String(text)
                }));
                console.log(`[WhatsApp Service] Template-Parameter: ${JSON.stringify(formattedParams)}`);
                // Template-Sprache: Reservation > Environment-Variable > Fallback
                let languageCode;
                if (reservation) {
                    const { CountryLanguageService } = require('./countryLanguageService');
                    languageCode = CountryLanguageService.getLanguageForReservation(reservation);
                    console.log(`[WhatsApp Service] Template-Sprache: ${languageCode} (basierend auf Reservation)`);
                }
                else {
                    languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
                    console.log(`[WhatsApp Service] Template-Sprache: ${languageCode} (aus Environment-Variable)`);
                }
                // Passe Template-Namen basierend auf Sprache an
                const adjustedTemplateName = this.getTemplateNameForLanguage(templateName, languageCode);
                console.log(`[WhatsApp Service] Template-Name (angepasst für Sprache ${languageCode}): ${adjustedTemplateName}`);
                const templateResult = yield this.sendViaWhatsAppBusiness(normalizedPhone, message || '', // Wird ignoriert, da Template verwendet wird
                adjustedTemplateName, formattedParams, languageCode);
                if (templateResult) {
                    console.log(`[WhatsApp Service] ✅ Template Message erfolgreich gesendet an ${to}`);
                    return true;
                }
                else {
                    console.error(`[WhatsApp Service] ❌ Template Message gab false zurück für ${to}`);
                    throw new Error('Template Message gab false zurück');
                }
            }
            catch (error) {
                console.error('[WhatsApp Service] ❌ Fehler bei Template Message:', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('[WhatsApp Service] Template Error Details:', errorMessage);
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
                console.log(`[WhatsApp Service] Lade Media ${mediaId} herunter...`);
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
                console.log(`[WhatsApp Service] Media-URL erhalten: ${mediaUrl.substring(0, 50)}...`);
                // Schritt 2: Lade die tatsächliche Datei herunter
                const mediaResponse = yield axios_1.default.get(mediaUrl, {
                    responseType: 'arraybuffer',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                });
                const buffer = Buffer.from(mediaResponse.data);
                console.log(`[WhatsApp Service] Media heruntergeladen: ${buffer.length} bytes, Type: ${mimeType}`);
                return {
                    buffer,
                    mimeType,
                    fileName
                };
            }
            catch (error) {
                console.error('[WhatsApp Service] Fehler beim Herunterladen von Media:', error);
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    console.error('[WhatsApp Service] API Fehler:', (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.data);
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