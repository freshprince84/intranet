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
const client_1 = require("@prisma/client");
const encryption_1 = require("../utils/encryption");
const prisma = new client_1.PrismaClient();
/**
 * WhatsApp Service für Versand von WhatsApp-Nachrichten
 *
 * Unterstützt:
 * - Twilio WhatsApp API
 * - WhatsApp Business API
 */
class WhatsAppService {
    constructor(organizationId) {
        this.organizationId = organizationId;
    }
    /**
     * Lädt WhatsApp Settings aus der Organisation
     */
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            const organization = yield prisma.organization.findUnique({
                where: { id: this.organizationId },
                select: { settings: true }
            });
            if (!(organization === null || organization === void 0 ? void 0 : organization.settings)) {
                throw new Error(`WhatsApp ist nicht für Organisation ${this.organizationId} konfiguriert`);
            }
            const settings = (0, encryption_1.decryptApiSettings)(organization.settings);
            const whatsappSettings = settings === null || settings === void 0 ? void 0 : settings.whatsapp;
            if (!(whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.apiKey)) {
                throw new Error(`WhatsApp API Key ist nicht für Organisation ${this.organizationId} konfiguriert`);
            }
            this.provider = whatsappSettings.provider || 'twilio';
            this.apiKey = whatsappSettings.apiKey;
            this.apiSecret = whatsappSettings.apiSecret;
            this.phoneNumberId = whatsappSettings.phoneNumberId;
            this.businessAccountId = whatsappSettings.businessAccountId;
            // Erstelle Axios-Instanz basierend auf Provider
            this.axiosInstance = this.createAxiosInstance();
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
     * @param to - Telefonnummer des Empfängers (mit Ländercode, z.B. +573001234567)
     * @param message - Nachrichtentext
     * @param template - Optional: Template-Name (für WhatsApp Business API)
     * @returns true wenn erfolgreich
     */
    sendMessage(to, message, template) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.loadSettings();
                if (!this.axiosInstance) {
                    throw new Error('WhatsApp Service nicht initialisiert');
                }
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
     */
    sendViaWhatsAppBusiness(to, message, template) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (!this.axiosInstance) {
                throw new Error('WhatsApp Business Service nicht initialisiert');
            }
            try {
                const payload = {
                    messaging_product: 'whatsapp',
                    to: to,
                    type: 'text',
                    text: {
                        body: message
                    }
                };
                // Wenn Template angegeben, verwende Template-Nachricht
                if (template) {
                    payload.type = 'template';
                    payload.template = {
                        name: template,
                        language: { code: 'es' } // Standard: Spanisch
                    };
                }
                const response = yield this.axiosInstance.post('/messages', payload);
                return response.status === 200;
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    console.error('[WhatsApp Business] API Fehler:', (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.data);
                    throw new Error(`WhatsApp Business API Fehler: ${JSON.stringify((_b = axiosError.response) === null || _b === void 0 ? void 0 : _b.data)}`);
                }
                throw error;
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
     * Sendet Check-in-Einladung per WhatsApp
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

¡Nos complace darte la bienvenida a La Familia Hostel!

Como llegarás después de las 22:00, puedes realizar el check-in en línea ahora:

${checkInLink}

Por favor, realiza el pago por adelantado:
${paymentLink}

¡Te esperamos mañana!`;
            return yield this.sendMessage(guestPhone, message);
        });
    }
    /**
     * Sendet Check-in-Bestätigung per WhatsApp
     *
     * @param guestName - Name des Gastes
     * @param guestPhone - Telefonnummer des Gastes
     * @param roomNumber - Zimmernummer
     * @param roomDescription - Zimmerbeschreibung
     * @param doorPin - PIN für Türsystem
     * @param doorAppName - App-Name (z.B. "TTLock")
     * @returns true wenn erfolgreich
     */
    sendCheckInConfirmation(guestName, guestPhone, roomNumber, roomDescription, doorPin, doorAppName) {
        return __awaiter(this, void 0, void 0, function* () {
            const message = `Hola ${guestName},

¡Tu check-in se ha completado exitosamente!

Información de tu habitación:
- Habitación: ${roomNumber}
- Descripción: ${roomDescription}

Acceso:
- PIN de la puerta: ${doorPin}
- App: ${doorAppName}

¡Te deseamos una estancia agradable!`;
            return yield this.sendMessage(guestPhone, message);
        });
    }
}
exports.WhatsAppService = WhatsAppService;
//# sourceMappingURL=whatsappService.js.map