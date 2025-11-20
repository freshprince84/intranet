"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.branchEmailSettingsSchema = exports.branchDoorSystemSettingsSchema = exports.branchBoldPaymentSettingsSchema = exports.branchLobbyPmsSettingsSchema = void 0;
const zod_1 = require("zod");
/**
 * Zod-Schemas für Branch-Settings Validierung
 */
exports.branchLobbyPmsSettingsSchema = zod_1.z.object({
    apiUrl: zod_1.z.string().url().optional(),
    apiKey: zod_1.z.string().min(1, 'API Key ist erforderlich'),
    propertyId: zod_1.z.string().optional(),
    syncEnabled: zod_1.z.boolean().default(true),
    autoCreateTasks: zod_1.z.boolean().default(true),
    lateCheckInThreshold: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    notificationChannels: zod_1.z.array(zod_1.z.enum(['email', 'whatsapp'])).default(['email']),
    autoSendReservationInvitation: zod_1.z.boolean().default(true)
});
exports.branchBoldPaymentSettingsSchema = zod_1.z.object({
    apiKey: zod_1.z.string().min(1, 'API Key ist erforderlich'),
    merchantId: zod_1.z.string().min(1, 'Merchant ID ist erforderlich'),
    environment: zod_1.z.enum(['sandbox', 'production']).default('sandbox')
});
exports.branchDoorSystemSettingsSchema = zod_1.z.object({
    clientId: zod_1.z.string().min(1, 'Client ID ist erforderlich'),
    clientSecret: zod_1.z.string().min(1, 'Client Secret ist erforderlich'),
    username: zod_1.z.string().min(1, 'Username ist erforderlich'),
    password: zod_1.z.string().min(1, 'Password ist erforderlich'),
    lockIds: zod_1.z.array(zod_1.z.number()).min(1, 'Mindestens eine Lock ID ist erforderlich'),
    appName: zod_1.z.string().default('TTLock')
});
exports.branchEmailSettingsSchema = zod_1.z.object({
    smtpHost: zod_1.z.string().min(1, 'SMTP Host ist erforderlich'),
    smtpPort: zod_1.z.number().min(1).max(65535),
    smtpUser: zod_1.z.string().email('SMTP User muss eine gültige E-Mail sein'),
    smtpPass: zod_1.z.string().min(1, 'SMTP Passwort ist erforderlich'),
    smtpFromEmail: zod_1.z.string().email().optional(),
    smtpFromName: zod_1.z.string().optional(),
    imap: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        host: zod_1.z.string().min(1).optional(),
        port: zod_1.z.number().min(1).max(65535).optional(),
        secure: zod_1.z.boolean().default(true),
        user: zod_1.z.string().email().optional(),
        password: zod_1.z.string().optional(),
        folder: zod_1.z.string().default('INBOX'),
        processedFolder: zod_1.z.string().optional()
    }).optional()
}).refine((data) => { var _a; return !((_a = data.imap) === null || _a === void 0 ? void 0 : _a.enabled) || (data.imap.host && data.imap.user && data.imap.password); }, {
    message: 'IMAP Host, User und Password sind erforderlich wenn IMAP aktiviert ist',
    path: ['imap']
});
//# sourceMappingURL=branchSettingsSchema.js.map