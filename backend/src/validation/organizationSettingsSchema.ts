import { z } from 'zod';

/**
 * Zod-Schema für OrganizationSettings
 * 
 * Validiert die Struktur der Organization.settings JSONB-Feld
 */

// LobbyPMS Settings Schema
const lobbyPmsSchema = z.object({
  apiUrl: z.string().url('Ungültige URL').optional(),
  apiKey: z.string().min(1, 'API-Key ist erforderlich').optional(),
  propertyId: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
  syncEnabled: z.boolean().optional(),
  autoCreateTasks: z.boolean().optional(),
  lateCheckInThreshold: z.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Ungültiges Zeitformat (erwartet: HH:MM)')
    .optional(),
  notificationChannels: z.array(z.enum(['email', 'whatsapp'])).optional(),
  autoSendReservationInvitation: z.boolean().optional(), // Default: true (Rückwärtskompatibilität)
}).optional();

// Door System Settings Schema (TTLock)
const doorSystemSchema = z.object({
  provider: z.enum(['ttlock']).optional(),
  apiUrl: z.string().url('Ungültige URL').optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(), // MD5-hashed password
  accessToken: z.string().optional(),
  lockIds: z.array(z.union([z.string(), z.number()])).transform((val) => 
    val.map(id => String(id))
  ).optional(),
  passcodeType: z.enum(['auto', 'custom']).optional(), // 'auto' = 10-stellig (ohne Sync), 'custom' = 4-stellig (mit Sync)
}).optional();

// Bold Payment Settings Schema
const boldPaymentSchema = z.object({
  apiKey: z.string().optional(),
  merchantId: z.string().optional(),
  environment: z.enum(['sandbox', 'production']).optional(),
}).optional();

// WhatsApp Settings Schema
const whatsappSchema = z.object({
  provider: z.enum(['twilio', 'whatsapp-business-api']).optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  phoneNumberId: z.string().optional(),
  businessAccountId: z.string().optional(),
}).optional();

// Haupt-Schema für OrganizationSettings
export const organizationSettingsSchema = z.object({
  // Bestehende SMTP Settings
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpFromEmail: z.string().email('Ungültige E-Mail-Adresse').optional(),
  smtpFromName: z.string().optional(),
  
  // API Settings
  lobbyPms: lobbyPmsSchema,
  doorSystem: doorSystemSchema,
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
export const validateOrganizationSettings = (settings: any) => {
  return organizationSettingsSchema.parse(settings);
};

/**
 * Validiert nur die API-Settings (für Update-Operationen)
 */
export const apiSettingsSchema = z.object({
  lobbyPms: lobbyPmsSchema,
  doorSystem: doorSystemSchema,
  boldPayment: boldPaymentSchema,
  whatsapp: whatsappSchema,
}).passthrough();

export const validateApiSettings = (settings: any) => {
  return apiSettingsSchema.parse(settings);
};

