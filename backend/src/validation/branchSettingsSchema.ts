import { z } from 'zod';

/**
 * Zod-Schemas für Branch-Settings Validierung
 */

export const branchLobbyPmsSettingsSchema = z.object({
  apiUrl: z.string().url().optional(),
  apiKey: z.string().min(1, 'API Key ist erforderlich'),
  propertyId: z.string().optional(),
  syncEnabled: z.boolean().default(true),
  autoCreateTasks: z.boolean().default(true),
  lateCheckInThreshold: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  autoSendReservationInvitation: z.boolean().default(true)
});

export const branchBoldPaymentSettingsSchema = z.object({
  apiKey: z.string().min(1, 'API Key ist erforderlich'),
  merchantId: z.string().min(1, 'Merchant ID ist erforderlich'),
  environment: z.enum(['sandbox', 'production']).default('sandbox')
});

export const branchDoorSystemSettingsSchema = z.object({
  clientId: z.string().min(1, 'Client ID ist erforderlich'),
  clientSecret: z.string().min(1, 'Client Secret ist erforderlich'),
  username: z.string().min(1, 'Username ist erforderlich'),
  password: z.string().min(1, 'Password ist erforderlich'),
  lockIds: z.array(z.number()).min(1, 'Mindestens eine Lock ID ist erforderlich'),
  appName: z.string().default('TTLock')
});

export const branchEmailSettingsSchema = z.object({
  smtpHost: z.string().min(1, 'SMTP Host ist erforderlich'),
  smtpPort: z.number().min(1).max(65535),
  smtpUser: z.string().email('SMTP User muss eine gültige E-Mail sein'),
  smtpPass: z.string().min(1, 'SMTP Passwort ist erforderlich'),
  smtpFromEmail: z.string().email().optional(),
  smtpFromName: z.string().optional(),
  imap: z.object({
    enabled: z.boolean().default(false),
    host: z.string().min(1).optional(),
    port: z.number().min(1).max(65535).optional(),
    secure: z.boolean().default(true),
    user: z.string().email().optional(),
    password: z.string().optional(),
    folder: z.string().default('INBOX'),
    processedFolder: z.string().optional()
  }).optional()
}).refine(
  (data) => !data.imap?.enabled || (data.imap.host && data.imap.user && data.imap.password),
  {
    message: 'IMAP Host, User und Password sind erforderlich wenn IMAP aktiviert ist',
    path: ['imap']
  }
);

// NEU: Schema für Message Templates
const messageTemplateLanguageSchema = z.object({
  whatsappTemplateName: z.string().min(1, 'WhatsApp Template Name ist erforderlich'),
  whatsappTemplateParams: z.array(z.string()).default([]),
  emailSubject: z.string().min(1, 'Email Betreff ist erforderlich'),
  emailContent: z.string().min(1, 'Email Inhalt ist erforderlich')
});

export const messageTemplatesSchema = z.object({
  checkInInvitation: z.object({
    en: messageTemplateLanguageSchema,
    es: messageTemplateLanguageSchema,
    de: messageTemplateLanguageSchema
  }),
  checkInConfirmation: z.object({
    en: messageTemplateLanguageSchema,
    es: messageTemplateLanguageSchema,
    de: messageTemplateLanguageSchema
  })
});

// Haupt-Schema für Branch Settings
export const branchSettingsSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  whatsappSettings: z.any().optional(),
  lobbyPmsSettings: branchLobbyPmsSettingsSchema.optional(),
  boldPaymentSettings: branchBoldPaymentSettingsSchema.optional(),
  doorSystemSettings: branchDoorSystemSettingsSchema.optional(),
  emailSettings: branchEmailSettingsSchema.optional(),
  messageTemplates: messageTemplatesSchema.optional(),
  autoSendReservationInvitation: z.boolean().optional()
});

