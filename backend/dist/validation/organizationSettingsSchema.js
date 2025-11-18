"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateApiSettings = exports.apiSettingsSchema = exports.validateOrganizationSettings = exports.organizationSettingsSchema = void 0;
const zod_1 = require("zod");
/**
 * Zod-Schema für OrganizationSettings
 *
 * Validiert die Struktur der Organization.settings JSONB-Feld
 */
// LobbyPMS Settings Schema
const lobbyPmsSchema = zod_1.z.object({
    apiUrl: zod_1.z.string().url('Ungültige URL').optional(),
    apiKey: zod_1.z.string().min(1, 'API-Key ist erforderlich').optional(),
    propertyId: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).transform(val => String(val)).optional(),
    syncEnabled: zod_1.z.boolean().optional(),
    autoCreateTasks: zod_1.z.boolean().optional(),
    lateCheckInThreshold: zod_1.z.string()
        .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Ungültiges Zeitformat (erwartet: HH:MM)')
        .optional(),
    notificationChannels: zod_1.z.array(zod_1.z.enum(['email', 'whatsapp'])).optional(),
    autoSendReservationInvitation: zod_1.z.boolean().optional(), // Default: true (Rückwärtskompatibilität)
}).optional();
// Door System Settings Schema (TTLock)
const doorSystemSchema = zod_1.z.object({
    provider: zod_1.z.enum(['ttlock']).optional(),
    apiUrl: zod_1.z.string().url('Ungültige URL').optional(),
    clientId: zod_1.z.string().optional(),
    clientSecret: zod_1.z.string().optional(),
    username: zod_1.z.string().optional(),
    password: zod_1.z.string().optional(), // MD5-hashed password
    accessToken: zod_1.z.string().optional(),
    lockIds: zod_1.z.array(zod_1.z.union([zod_1.z.string(), zod_1.z.number()])).transform((val) => val.map(id => String(id))).optional(),
    passcodeType: zod_1.z.enum(['auto', 'custom']).optional(), // 'auto' = 10-stellig (ohne Sync), 'custom' = 4-stellig (mit Sync)
}).optional();
// SIRE Settings Schema
const sireSchema = zod_1.z.object({
    apiUrl: zod_1.z.string().url('Ungültige URL').optional(),
    apiKey: zod_1.z.string().optional(),
    apiSecret: zod_1.z.string().optional(),
    enabled: zod_1.z.boolean().optional(),
    autoRegisterOnCheckIn: zod_1.z.boolean().optional(),
    propertyCode: zod_1.z.string().optional(),
}).optional();
// Bold Payment Settings Schema
const boldPaymentSchema = zod_1.z.object({
    apiKey: zod_1.z.string().optional(),
    merchantId: zod_1.z.string().optional(),
    environment: zod_1.z.enum(['sandbox', 'production']).optional(),
}).optional();
// WhatsApp Settings Schema
const whatsappSchema = zod_1.z.object({
    provider: zod_1.z.enum(['twilio', 'whatsapp-business-api']).optional(),
    apiKey: zod_1.z.string().optional(),
    apiSecret: zod_1.z.string().optional(),
    phoneNumberId: zod_1.z.string().optional(),
    businessAccountId: zod_1.z.string().optional(),
}).optional();
// Haupt-Schema für OrganizationSettings
exports.organizationSettingsSchema = zod_1.z.object({
    // Bestehende SMTP Settings
    smtpHost: zod_1.z.string().optional(),
    smtpPort: zod_1.z.number().int().min(1).max(65535).optional(),
    smtpUser: zod_1.z.string().optional(),
    smtpPass: zod_1.z.string().optional(),
    smtpFromEmail: zod_1.z.string().email('Ungültige E-Mail-Adresse').optional(),
    smtpFromName: zod_1.z.string().optional(),
    // API Settings
    lobbyPms: lobbyPmsSchema,
    doorSystem: doorSystemSchema,
    sire: sireSchema,
    boldPayment: boldPaymentSchema,
    whatsapp: whatsappSchema,
    // Weitere Settings können hier hinzugefügt werden
}).passthrough(); // Erlaubt zusätzliche Felder für Rückwärtskompatibilität
/**
 * Validiert OrganizationSettings
 *
 * @param settings - Das zu validierende Settings-Objekt
 * @returns Validierte Settings oder wirft ZodError
 */
const validateOrganizationSettings = (settings) => {
    return exports.organizationSettingsSchema.parse(settings);
};
exports.validateOrganizationSettings = validateOrganizationSettings;
/**
 * Validiert nur die API-Settings (für Update-Operationen)
 */
exports.apiSettingsSchema = zod_1.z.object({
    lobbyPms: lobbyPmsSchema,
    doorSystem: doorSystemSchema,
    sire: sireSchema,
    boldPayment: boldPaymentSchema,
    whatsapp: whatsappSchema,
}).passthrough();
const validateApiSettings = (settings) => {
    return exports.apiSettingsSchema.parse(settings);
};
exports.validateApiSettings = validateApiSettings;
//# sourceMappingURL=organizationSettingsSchema.js.map