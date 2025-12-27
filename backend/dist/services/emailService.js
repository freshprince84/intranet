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
exports.generateEmailTemplate = exports.getOrganizationBranding = exports.sendPasswordResetEmail = exports.sendEmail = exports.sendRegistrationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const axios_1 = __importDefault(require("axios"));
const encryption_1 = require("../utils/encryption");
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
// SMTP-Konfiguration aus Umgebungsvariablen, Branch-Settings oder Organisation-Settings
const createTransporter = (organizationId, branchId) => __awaiter(void 0, void 0, void 0, function* () {
    let smtpHost;
    let smtpPort = 587;
    let smtpUser;
    let smtpPass;
    // 1. Versuche Branch Settings zu laden (wenn branchId gesetzt)
    if (branchId) {
        try {
            const branch = yield prisma_1.prisma.branch.findUnique({
                where: { id: branchId },
                select: {
                    emailSettings: true,
                    organizationId: true
                }
            });
            if (branch === null || branch === void 0 ? void 0 : branch.emailSettings) {
                try {
                    const settings = (0, encryption_1.decryptBranchApiSettings)(branch.emailSettings);
                    const emailSettings = (settings === null || settings === void 0 ? void 0 : settings.email) || settings;
                    if ((emailSettings === null || emailSettings === void 0 ? void 0 : emailSettings.smtpHost) && (emailSettings === null || emailSettings === void 0 ? void 0 : emailSettings.smtpUser) && (emailSettings === null || emailSettings === void 0 ? void 0 : emailSettings.smtpPass)) {
                        smtpHost = emailSettings.smtpHost;
                        const portValue = emailSettings.smtpPort;
                        smtpPort = typeof portValue === 'number' ? portValue : (portValue ? parseInt(String(portValue)) : 587);
                        smtpUser = emailSettings.smtpUser;
                        smtpPass = emailSettings.smtpPass; // Bereits entschlüsselt
                        logger_1.logger.log(`📧 Nutze Branch-spezifische SMTP-Einstellungen für Branch ${branchId}`);
                        // Weiter zu Transporter-Erstellung
                    }
                }
                catch (error) {
                    logger_1.logger.warn(`[EMAIL] Fehler beim Laden der Branch Settings:`, error);
                    // Fallback auf Organisation Settings
                }
                // Fallback: Lade Organization Settings
                if (!smtpHost && branch.organizationId) {
                    organizationId = branch.organizationId;
                }
            }
            else if (branch === null || branch === void 0 ? void 0 : branch.organizationId) {
                // Branch hat keine Settings, aber Organization ID
                organizationId = branch.organizationId;
            }
        }
        catch (error) {
            logger_1.logger.warn(`[EMAIL] Fehler beim Laden der Branch Settings:`, error);
            // Fallback auf Organisation Settings
        }
    }
    // 2. Wenn organizationId vorhanden, versuche Organisation-spezifische SMTP-Einstellungen zu laden
    if (organizationId && (!smtpHost || !smtpUser || !smtpPass)) {
        try {
            const organization = yield prisma_1.prisma.organization.findUnique({
                where: { id: organizationId },
                select: { settings: true }
            });
            if ((organization === null || organization === void 0 ? void 0 : organization.settings) && typeof organization.settings === 'object') {
                const orgSettings = organization.settings;
                logger_1.logger.log(`[EMAIL] Org ${organizationId} Settings gefunden:`, JSON.stringify(orgSettings, null, 2));
                if (orgSettings.smtpHost && orgSettings.smtpUser && orgSettings.smtpPass) {
                    smtpHost = orgSettings.smtpHost;
                    // Port kann als String oder Number gespeichert sein
                    const portValue = orgSettings.smtpPort;
                    smtpPort = typeof portValue === 'number' ? portValue : (portValue ? parseInt(String(portValue)) : 587);
                    smtpUser = orgSettings.smtpUser;
                    smtpPass = orgSettings.smtpPass;
                    logger_1.logger.log(`📧 Nutze Organisation-spezifische SMTP-Einstellungen für Org ${organizationId}`);
                    logger_1.logger.log(`📧 SMTP Host: ${smtpHost}, Port: ${smtpPort}, User: ${smtpUser}`);
                    // Speichere auch From-Einstellungen für späteren Gebrauch
                    if (orgSettings.smtpFromEmail || orgSettings.smtpFromName) {
                        logger_1.logger.log(`📧 Org ${organizationId} hat From-Einstellungen: ${orgSettings.smtpFromEmail || 'nicht gesetzt'}, ${orgSettings.smtpFromName || 'nicht gesetzt'}`);
                    }
                }
                else {
                    logger_1.logger.log(`⚠️ Org ${organizationId} hat SMTP-Einstellungen, aber nicht alle erforderlichen Felder sind gesetzt:`);
                    logger_1.logger.log(`   smtpHost: ${orgSettings.smtpHost ? '✅' : '❌'}`);
                    logger_1.logger.log(`   smtpUser: ${orgSettings.smtpUser ? '✅' : '❌'}`);
                    logger_1.logger.log(`   smtpPass: ${orgSettings.smtpPass ? '✅' : '❌'}`);
                }
            }
            else {
                logger_1.logger.log(`⚠️ Org ${organizationId} hat keine Settings oder Settings sind kein Objekt`);
            }
        }
        catch (error) {
            logger_1.logger.warn('⚠️ Fehler beim Laden der Organisation-SMTP-Einstellungen:', error);
        }
    }
    // Fallback zu globalen Umgebungsvariablen
    if (!smtpHost || !smtpUser || !smtpPass) {
        smtpHost = process.env.SMTP_HOST;
        smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
        smtpUser = process.env.SMTP_USER;
        smtpPass = process.env.SMTP_PASS;
    }
    // Wenn immer noch keine SMTP-Konfiguration vorhanden, gibt es keinen Transporter
    if (!smtpHost || !smtpUser || !smtpPass) {
        logger_1.logger.warn('⚠️ SMTP-Konfiguration fehlt. E-Mails können nicht versendet werden.');
        return null;
    }
    return nodemailer_1.default.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true für 465, false für andere Ports
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
        connectionTimeout: 10000, // 10 Sekunden
        greetingTimeout: 10000, // 10 Sekunden
        socketTimeout: 10000, // 10 Sekunden
    });
});
/**
 * Sendet E-Mail über Mailtrap API (falls konfiguriert)
 */
const sendViaMailtrapAPI = (email, username, password) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const mailtrapApiToken = process.env.MAILTRAP_API_TOKEN;
    const mailtrapTestInboxId = process.env.MAILTRAP_TEST_INBOX_ID;
    if (!mailtrapApiToken || !mailtrapTestInboxId) {
        return false; // API nicht konfiguriert
    }
    try {
        const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #2563eb;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f9fafb;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
            border-radius: 0 0 8px 8px;
          }
          .credentials {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #2563eb;
          }
          .credential-item {
            margin: 10px 0;
            padding: 10px;
            background-color: #f3f4f6;
            border-radius: 4px;
          }
          .credential-label {
            font-weight: bold;
            color: #374151;
          }
          .credential-value {
            font-family: monospace;
            color: #1f2937;
            margin-left: 10px;
          }
          .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #6b7280;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Willkommen im Intranet!</h1>
        </div>
        <div class="content">
          <p>Hallo,</p>
          <p>Ihr Benutzerkonto wurde erfolgreich erstellt. Hier sind Ihre Anmeldeinformationen:</p>
          
          <div class="credentials">
            <div class="credential-item">
              <span class="credential-label">Benutzername:</span>
              <span class="credential-value">${username}</span>
            </div>
            <div class="credential-item">
              <span class="credential-label">E-Mail:</span>
              <span class="credential-value">${email}</span>
            </div>
            <div class="credential-item">
              <span class="credential-label">Passwort:</span>
              <span class="credential-value">${password}</span>
            </div>
          </div>

          <div class="warning">
            <strong>⚠️ Wichtig:</strong> Bitte ändern Sie Ihr Passwort nach dem ersten Login aus Sicherheitsgründen.
          </div>

          <p>Sie können sich jetzt mit diesen Anmeldeinformationen anmelden.</p>
          
          <p>Nach der Anmeldung können Sie:</p>
          <ul>
            <li>Einer bestehenden Organisation beitreten</li>
            <li>Eine eigene Organisation erstellen</li>
          </ul>

          <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        </div>
        <div class="footer">
          <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.</p>
        </div>
      </body>
      </html>
    `;
        const textContent = `
Willkommen im Intranet!

Ihr Benutzerkonto wurde erfolgreich erstellt. Hier sind Ihre Anmeldeinformationen:

Benutzername: ${username}
E-Mail: ${email}
Passwort: ${password}

WICHTIG: Bitte ändern Sie Ihr Passwort nach dem ersten Login aus Sicherheitsgründen.

Sie können sich jetzt mit diesen Anmeldeinformationen anmelden.

Nach der Anmeldung können Sie:
- Einer bestehenden Organisation beitreten
- Eine eigene Organisation erstellen

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.
    `;
        // Versuche zuerst Transactional Email API (versendet echte E-Mails)
        // Falls Transactional Email Token vorhanden ist, nutze das
        const mailtrapTransactionalToken = process.env.MAILTRAP_TRANSACTIONAL_TOKEN || mailtrapApiToken;
        // Versuche Transactional Email API (versendet an echte E-Mail-Adressen)
        let response;
        try {
            response = yield axios_1.default.post('https://send.api.mailtrap.io/api/send', {
                from: { email: 'noreply@intranet.local', name: 'Intranet' },
                to: [{ email }],
                subject: 'Willkommen im Intranet - Ihre Anmeldeinformationen',
                html: htmlContent,
                text: textContent,
                category: 'Registration'
            }, {
                headers: {
                    'Authorization': `Bearer ${mailtrapTransactionalToken}`,
                    'Content-Type': 'application/json'
                }
            });
        }
        catch (transactionalError) {
            // Falls Transactional Email nicht funktioniert, nutze Sandbox (nur für Tests)
            if (((_a = transactionalError.response) === null || _a === void 0 ? void 0 : _a.status) === 401 || ((_b = transactionalError.response) === null || _b === void 0 ? void 0 : _b.status) === 403) {
                response = yield axios_1.default.post(`https://sandbox.api.mailtrap.io/api/send/${mailtrapTestInboxId}`, {
                    from: { email: 'noreply@intranet.local', name: 'Intranet' },
                    to: [{ email }],
                    subject: 'Willkommen im Intranet - Ihre Anmeldeinformationen',
                    html: htmlContent,
                    text: textContent,
                    category: 'Registration'
                }, {
                    headers: {
                        'Authorization': `Bearer ${mailtrapApiToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
            else {
                throw transactionalError;
            }
        }
        return true;
    }
    catch (error) {
        logger_1.logger.error('❌ Fehler beim Versenden über Mailtrap API:', error);
        return false;
    }
});
/**
 * Sendet eine Willkommens-E-Mail mit Anmeldeinformationen nach der Registrierung
 * @param email E-Mail-Adresse des neuen Benutzers
 * @param username Benutzername
 * @param password Passwort (wird nur in der E-Mail angezeigt)
 * @param organizationId Optional: ID der Organisation (für org-spezifische SMTP-Einstellungen)
 */
const sendRegistrationEmail = (email, username, password, // Das Original-Passwort (wird nur in der E-Mail angezeigt)
organizationId // Optional: für org-spezifische SMTP-Einstellungen
) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Versuche zuerst Mailtrap API (falls konfiguriert)
    const apiSuccess = yield sendViaMailtrapAPI(email, username, password);
    if (apiSuccess) {
        return true;
    }
    // Fallback zu SMTP
    try {
        const transporter = yield createTransporter(organizationId);
        if (!transporter) {
            logger_1.logger.warn('⚠️ E-Mail-Transporter nicht verfügbar. E-Mail wurde nicht versendet.');
            return false;
        }
        // Lade Logo + Branding (nutzt gespeichertes Branding, keine API-Calls)
        const { logo, branding } = yield (0, exports.getOrganizationBranding)(organizationId);
        // Lade Organisationsname für Header
        let organizationName = 'Intranet';
        if (organizationId) {
            const organization = yield prisma_1.prisma.organization.findUnique({
                where: { id: organizationId },
                select: { displayName: true, name: true }
            });
            if (organization === null || organization === void 0 ? void 0 : organization.displayName) {
                organizationName = organization.displayName;
            }
            else if (organization === null || organization === void 0 ? void 0 : organization.name) {
                organizationName = organization.name;
            }
        }
        // Generiere Content mit Template
        const primaryColor = ((_a = branding === null || branding === void 0 ? void 0 : branding.colors) === null || _a === void 0 ? void 0 : _a.primary) || '#2563eb';
        const content = `
      <p>Hallo,</p>
      <p>Ihr Benutzerkonto wurde erfolgreich erstellt. Hier sind Ihre Anmeldeinformationen:</p>
      
      <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${primaryColor};">
        <div style="margin: 10px 0; padding: 10px; background-color: #f3f4f6; border-radius: 4px;">
          <span style="font-weight: bold; color: #374151;">Benutzername:</span>
          <span style="font-family: monospace; color: #1f2937; margin-left: 10px;">${username}</span>
        </div>
        <div style="margin: 10px 0; padding: 10px; background-color: #f3f4f6; border-radius: 4px;">
          <span style="font-weight: bold; color: #374151;">E-Mail:</span>
          <span style="font-family: monospace; color: #1f2937; margin-left: 10px;">${email}</span>
        </div>
        <div style="margin: 10px 0; padding: 10px; background-color: #f3f4f6; border-radius: 4px;">
          <span style="font-weight: bold; color: #374151;">Passwort:</span>
          <span style="font-family: monospace; color: #1f2937; margin-left: 10px;">${password}</span>
        </div>
      </div>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <strong>⚠️ Wichtig:</strong> Bitte ändern Sie Ihr Passwort nach dem ersten Login aus Sicherheitsgründen.
      </div>

      <p>Sie können sich jetzt mit diesen Anmeldeinformationen anmelden.</p>
      
      <p>Nach der Anmeldung können Sie:</p>
      <ul>
        <li>Einer bestehenden Organisation beitreten</li>
        <li>Eine eigene Organisation erstellen</li>
      </ul>

      <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
    `;
        const html = (0, exports.generateEmailTemplate)({
            logo,
            branding,
            headerTitle: organizationName,
            content,
            language: 'de'
        });
        const text = `
Willkommen im Intranet!

Ihr Benutzerkonto wurde erfolgreich erstellt. Hier sind Ihre Anmeldeinformationen:

Benutzername: ${username}
E-Mail: ${email}
Passwort: ${password}

WICHTIG: Bitte ändern Sie Ihr Passwort nach dem ersten Login aus Sicherheitsgründen.

Sie können sich jetzt mit diesen Anmeldeinformationen anmelden.

Nach der Anmeldung können Sie:
- Einer bestehenden Organisation beitreten
- Eine eigene Organisation erstellen

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.
    `;
        const mailOptions = {
            from: process.env.SMTP_USER || 'noreply@intranet.local',
            to: email,
            subject: 'Willkommen im Intranet - Ihre Anmeldeinformationen',
            html: html,
            text: text,
        };
        const info = yield transporter.sendMail(mailOptions);
        logger_1.logger.log('✅ Registrierungs-E-Mail versendet:', info.messageId);
        return true;
    }
    catch (error) {
        logger_1.logger.error('❌ Fehler beim Versenden der Registrierungs-E-Mail:', error);
        return false;
    }
});
exports.sendRegistrationEmail = sendRegistrationEmail;
/**
 * Sendet eine Passwort-Reset-E-Mail mit Reset-Link
 * @param email E-Mail-Adresse des Benutzers
 * @param username Benutzername
 * @param resetLink URL zum Zurücksetzen des Passworts (mit Token)
 * @param organizationId Optional: ID der Organisation (für org-spezifische SMTP-Einstellungen)
 */
/**
 * Generische Funktion zum Versenden von E-Mails
 * @param email E-Mail-Adresse des Empfängers
 * @param subject Betreff der E-Mail
 * @param html HTML-Inhalt der E-Mail
 * @param text Text-Inhalt der E-Mail (optional)
 * @param organizationId Optional: ID der Organisation (für org-spezifische SMTP-Einstellungen)
 * @param branchId Optional: ID des Branches (für branch-spezifische SMTP-Einstellungen)
 */
const sendEmail = (email, subject, html, text, organizationId, branchId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const transporter = yield createTransporter(organizationId, branchId);
        if (!transporter) {
            logger_1.logger.warn('⚠️ E-Mail-Transporter nicht verfügbar. E-Mail wurde nicht versendet.');
            return false;
        }
        // Lade From-Einstellungen aus Branch oder Organisation-Settings (falls vorhanden)
        let fromEmail = process.env.SMTP_USER || 'noreply@intranet.local';
        let fromName = 'Intranet';
        // 1. Versuche Branch Settings zu laden
        if (branchId) {
            try {
                const branch = yield prisma_1.prisma.branch.findUnique({
                    where: { id: branchId },
                    select: {
                        emailSettings: true,
                        organizationId: true,
                        organization: {
                            select: { displayName: true }
                        }
                    }
                });
                if (branch === null || branch === void 0 ? void 0 : branch.emailSettings) {
                    try {
                        const settings = (0, encryption_1.decryptBranchApiSettings)(branch.emailSettings);
                        const emailSettings = (settings === null || settings === void 0 ? void 0 : settings.email) || settings;
                        if (emailSettings === null || emailSettings === void 0 ? void 0 : emailSettings.smtpFromEmail) {
                            fromEmail = emailSettings.smtpFromEmail;
                        }
                        if (emailSettings === null || emailSettings === void 0 ? void 0 : emailSettings.smtpFromName) {
                            fromName = emailSettings.smtpFromName;
                        }
                        else if ((_a = branch.organization) === null || _a === void 0 ? void 0 : _a.displayName) {
                            fromName = branch.organization.displayName;
                        }
                    }
                    catch (error) {
                        logger_1.logger.warn('⚠️ Fehler beim Laden der Branch-From-Einstellungen:', error);
                        // Fallback auf Organisation
                        if (branch.organizationId) {
                            organizationId = branch.organizationId;
                        }
                    }
                }
                else if (branch === null || branch === void 0 ? void 0 : branch.organizationId) {
                    organizationId = branch.organizationId;
                }
            }
            catch (error) {
                logger_1.logger.warn('⚠️ Fehler beim Laden der Branch-From-Einstellungen:', error);
            }
        }
        // 2. Fallback: Lade From-Einstellungen aus Organisation-Settings
        if (organizationId) {
            try {
                const organization = yield prisma_1.prisma.organization.findUnique({
                    where: { id: organizationId },
                    select: { settings: true, displayName: true }
                });
                if ((organization === null || organization === void 0 ? void 0 : organization.settings) && typeof organization.settings === 'object') {
                    const orgSettings = organization.settings;
                    if (orgSettings.smtpFromEmail) {
                        fromEmail = orgSettings.smtpFromEmail;
                    }
                    if (orgSettings.smtpFromName) {
                        fromName = orgSettings.smtpFromName;
                    }
                    else if (organization.displayName) {
                        fromName = organization.displayName;
                    }
                }
            }
            catch (error) {
                logger_1.logger.warn('⚠️ Fehler beim Laden der Organisation-From-Einstellungen:', error);
            }
        }
        const mailOptions = {
            from: `${fromName} <${fromEmail}>`,
            to: email,
            subject: subject,
            html: html,
            text: text || html.replace(/<[^>]*>/g, ''), // Fallback: HTML ohne Tags
        };
        const info = yield transporter.sendMail(mailOptions);
        logger_1.logger.log('✅ E-Mail versendet:', info.messageId);
        return true;
    }
    catch (error) {
        logger_1.logger.error('❌ Fehler beim Versenden der E-Mail:', error);
        return false;
    }
});
exports.sendEmail = sendEmail;
const sendPasswordResetEmail = (email, username, resetLink, organizationId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    logger_1.logger.log(`[EMAIL] Starte Versand der Passwort-Reset-E-Mail für: ${username} (${email})`);
    if (organizationId) {
        logger_1.logger.log(`[EMAIL] Verwende Organisation-ID: ${organizationId}`);
    }
    // Versuche zuerst Mailtrap API (falls konfiguriert)
    const apiSuccess = yield sendPasswordResetViaMailtrapAPI(email, username, resetLink, organizationId);
    if (apiSuccess) {
        logger_1.logger.log(`[EMAIL] E-Mail erfolgreich über Mailtrap API versendet`);
        return true;
    }
    logger_1.logger.log(`[EMAIL] Mailtrap API nicht verfügbar oder fehlgeschlagen, versuche SMTP...`);
    // Fallback zu SMTP
    try {
        const transporter = yield createTransporter(organizationId);
        if (!transporter) {
            logger_1.logger.warn('⚠️ E-Mail-Transporter nicht verfügbar. E-Mail wurde nicht versendet.');
            return false;
        }
        // Lade From-Einstellungen aus Organisation-Settings (falls vorhanden)
        let fromEmail = process.env.SMTP_USER || 'noreply@intranet.local';
        let fromName = 'Intranet';
        if (organizationId) {
            try {
                const organization = yield prisma_1.prisma.organization.findUnique({
                    where: { id: organizationId },
                    select: { settings: true, displayName: true }
                });
                if ((organization === null || organization === void 0 ? void 0 : organization.settings) && typeof organization.settings === 'object') {
                    const orgSettings = organization.settings;
                    if (orgSettings.smtpFromEmail) {
                        fromEmail = orgSettings.smtpFromEmail;
                    }
                    if (orgSettings.smtpFromName) {
                        fromName = orgSettings.smtpFromName;
                    }
                    else if (organization.displayName) {
                        fromName = organization.displayName;
                    }
                }
            }
            catch (error) {
                logger_1.logger.warn('⚠️ Fehler beim Laden der From-Einstellungen:', error);
            }
        }
        // Formatiere From-String für nodemailer
        const fromString = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
        logger_1.logger.log(`[EMAIL] 📧 Versende E-Mail von: ${fromString} an: ${email}`);
        // Lade Logo + Branding (nutzt gespeichertes Branding, keine API-Calls)
        const { logo, branding } = yield (0, exports.getOrganizationBranding)(organizationId);
        // Generiere Content mit Template
        const buttonColor = ((_a = branding === null || branding === void 0 ? void 0 : branding.colors) === null || _a === void 0 ? void 0 : _a.primary) || '#2563eb';
        const content = `
      <p>Hallo ${username},</p>
      <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
      
      <p>Klicken Sie auf den folgenden Button, um ein neues Passwort festzulegen:</p>
      
      <div style="text-align: center; margin: 20px 0;">
        <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: ${buttonColor}; color: white; text-decoration: none; border-radius: 6px;">Passwort zurücksetzen</a>
      </div>
      
      <p>Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:</p>
      <p style="word-break: break-all; color: ${buttonColor};">${resetLink}</p>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <strong>⚠️ Wichtig:</strong>
        <ul>
          <li>Dieser Link ist nur 1 Stunde gültig</li>
          <li>Der Link kann nur einmal verwendet werden</li>
          <li>Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail</li>
        </ul>
      </div>

      <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
    `;
        const html = (0, exports.generateEmailTemplate)({
            logo,
            branding,
            headerTitle: fromName,
            content,
            language: 'de'
        });
        const text = `
Passwort zurücksetzen - Intranet

Hallo ${username},

Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.

Klicken Sie auf den folgenden Link, um ein neues Passwort festzulegen:

${resetLink}

WICHTIG:
- Dieser Link ist nur 1 Stunde gültig
- Der Link kann nur einmal verwendet werden
- Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.
    `;
        const mailOptions = {
            from: fromString,
            to: email,
            subject: 'Passwort zurücksetzen - Intranet',
            html: html,
            text: text,
        };
        logger_1.logger.log(`[EMAIL] Sende E-Mail über SMTP...`);
        const info = yield transporter.sendMail(mailOptions);
        logger_1.logger.log('✅ Passwort-Reset-E-Mail erfolgreich über SMTP versendet!');
        logger_1.logger.log(`[EMAIL] Message ID: ${info.messageId}`);
        logger_1.logger.log(`[EMAIL] E-Mail gesendet an: ${email}`);
        logger_1.logger.log(`[EMAIL] Von: ${fromString}`);
        return true;
    }
    catch (error) {
        logger_1.logger.error('❌ Fehler beim Versenden der Passwort-Reset-E-Mail über SMTP:');
        logger_1.logger.error(`[EMAIL] Fehler-Typ: ${error.constructor.name}`);
        if (error.response) {
            logger_1.logger.error(`[EMAIL] SMTP Fehler-Response: ${error.response.status}`, error.response.data);
        }
        if (error.code) {
            logger_1.logger.error(`[EMAIL] SMTP Fehler-Code: ${error.code}`);
        }
        if (error.message) {
            logger_1.logger.error(`[EMAIL] SMTP Fehler-Message: ${error.message}`);
        }
        if (error.command) {
            logger_1.logger.error(`[EMAIL] SMTP Fehler-Command: ${error.command}`);
        }
        if (error.responseCode) {
            logger_1.logger.error(`[EMAIL] SMTP Response-Code: ${error.responseCode}`);
        }
        logger_1.logger.error(`[EMAIL] Vollständiger Fehler:`, error);
        return false;
    }
});
exports.sendPasswordResetEmail = sendPasswordResetEmail;
/**
 * Sendet Passwort-Reset-E-Mail über Mailtrap API (falls konfiguriert)
 */
const sendPasswordResetViaMailtrapAPI = (email, username, resetLink, organizationId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const mailtrapApiToken = process.env.MAILTRAP_API_TOKEN;
    const mailtrapTestInboxId = process.env.MAILTRAP_TEST_INBOX_ID;
    if (!mailtrapApiToken || !mailtrapTestInboxId) {
        logger_1.logger.log('[EMAIL] Mailtrap API nicht konfiguriert (Token oder Inbox-ID fehlt), versuche SMTP');
        return false; // API nicht konfiguriert
    }
    // Wenn Organisation-ID vorhanden ist, sollte SMTP verwendet werden, nicht Mailtrap
    if (organizationId) {
        logger_1.logger.log(`[EMAIL] Organisation-ID vorhanden (${organizationId}), überspringe Mailtrap API und verwende SMTP`);
        return false;
    }
    logger_1.logger.log(`[EMAIL] Versuche Passwort-Reset-E-Mail über Mailtrap API zu senden an: ${email}`);
    // Lade From-Einstellungen aus Organisation-Settings (falls vorhanden)
    let fromEmail = 'noreply@intranet.local';
    let fromName = 'Intranet';
    if (organizationId) {
        try {
            const organization = yield prisma_1.prisma.organization.findUnique({
                where: { id: organizationId },
                select: { settings: true, displayName: true }
            });
            if ((organization === null || organization === void 0 ? void 0 : organization.settings) && typeof organization.settings === 'object') {
                const orgSettings = organization.settings;
                if (orgSettings.smtpFromEmail) {
                    fromEmail = orgSettings.smtpFromEmail;
                }
                if (orgSettings.smtpFromName) {
                    fromName = orgSettings.smtpFromName;
                }
                else if (organization.displayName) {
                    fromName = organization.displayName;
                }
            }
        }
        catch (error) {
            logger_1.logger.warn('⚠️ Fehler beim Laden der From-Einstellungen für Mailtrap:', error);
        }
    }
    try {
        const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #2563eb;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f9fafb;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
            border-radius: 0 0 8px 8px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #6b7280;
            font-size: 12px;
          }
          .link-fallback {
            word-break: break-all;
            color: #2563eb;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Passwort zurücksetzen</h1>
        </div>
        <div class="content">
          <p>Hallo ${username},</p>
          <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
          
          <p>Klicken Sie auf den folgenden Button, um ein neues Passwort festzulegen:</p>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Passwort zurücksetzen</a>
          </div>
          
          <p>Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:</p>
          <p class="link-fallback">${resetLink}</p>

          <div class="warning">
            <strong>⚠️ Wichtig:</strong>
            <ul>
              <li>Dieser Link ist nur 1 Stunde gültig</li>
              <li>Der Link kann nur einmal verwendet werden</li>
              <li>Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail</li>
            </ul>
          </div>

          <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
        </div>
        <div class="footer">
          <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.</p>
        </div>
      </body>
      </html>
    `;
        const textContent = `
Passwort zurücksetzen - Intranet

Hallo ${username},

Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.

Klicken Sie auf den folgenden Link, um ein neues Passwort festzulegen:

${resetLink}

WICHTIG:
- Dieser Link ist nur 1 Stunde gültig
- Der Link kann nur einmal verwendet werden
- Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.
    `;
        // Versuche Transactional Email API (versendet echte E-Mails)
        const mailtrapTransactionalToken = process.env.MAILTRAP_TRANSACTIONAL_TOKEN || mailtrapApiToken;
        let response;
        try {
            response = yield axios_1.default.post('https://send.api.mailtrap.io/api/send', {
                from: { email: fromEmail, name: fromName },
                to: [{ email }],
                subject: 'Passwort zurücksetzen - Intranet',
                html: htmlContent,
                text: textContent,
                category: 'PasswordReset'
            }, {
                headers: {
                    'Authorization': `Bearer ${mailtrapTransactionalToken}`,
                    'Content-Type': 'application/json'
                }
            });
        }
        catch (transactionalError) {
            // Falls Transactional Email nicht funktioniert, nutze Sandbox (nur für Tests)
            if (((_a = transactionalError.response) === null || _a === void 0 ? void 0 : _a.status) === 401 || ((_b = transactionalError.response) === null || _b === void 0 ? void 0 : _b.status) === 403) {
                response = yield axios_1.default.post(`https://sandbox.api.mailtrap.io/api/send/${mailtrapTestInboxId}`, {
                    from: { email: fromEmail, name: fromName },
                    to: [{ email }],
                    subject: 'Passwort zurücksetzen - Intranet',
                    html: htmlContent,
                    text: textContent,
                    category: 'PasswordReset'
                }, {
                    headers: {
                        'Authorization': `Bearer ${mailtrapApiToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
            else {
                throw transactionalError;
            }
        }
        return true;
    }
    catch (error) {
        logger_1.logger.error('❌ Fehler beim Versenden über Mailtrap API:', error);
        return false;
    }
});
/**
 * Lädt Organisationslogo und gespeichertes Branding aus Datenbank
 * WICHTIG: Keine Branding-Extraktion hier - nur Laden aus Datenbank!
 * @param organizationId - ID der Organisation
 * @param branchId - Optional: ID des Branches (für Branch-spezifische Logos)
 * @returns Logo (Base64-Data-URL) und gespeicherte Branding-Informationen
 */
const getOrganizationBranding = (organizationId, branchId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!organizationId) {
        return { logo: null, branding: null };
    }
    try {
        let logo = null;
        let branding = null;
        // Prüfe zuerst Branch (falls vorhanden)
        if (branchId) {
            const branch = yield prisma_1.prisma.branch.findUnique({
                where: { id: branchId },
                select: {
                    organizationId: true,
                    organization: {
                        select: {
                            logo: true,
                            settings: true
                        }
                    }
                }
            });
            if (branch === null || branch === void 0 ? void 0 : branch.organization) {
                logo = branch.organization.logo && branch.organization.logo.trim() !== ''
                    ? branch.organization.logo
                    : null;
                // Lade Branding aus Settings
                if (branch.organization.settings && typeof branch.organization.settings === 'object') {
                    const settings = branch.organization.settings;
                    branding = settings.branding || null;
                }
            }
        }
        // Fallback: Lade Organisation direkt
        if (!logo || !branding) {
            const organization = yield prisma_1.prisma.organization.findUnique({
                where: { id: organizationId },
                select: {
                    logo: true,
                    settings: true
                }
            });
            if (organization) {
                logo = organization.logo && organization.logo.trim() !== ''
                    ? organization.logo
                    : null;
                // Lade Branding aus Settings
                if (organization.settings && typeof organization.settings === 'object') {
                    const settings = organization.settings;
                    branding = settings.branding || null;
                }
            }
        }
        return { logo, branding };
    }
    catch (error) {
        logger_1.logger.warn('⚠️ Fehler beim Laden des Organisationslogos/Brandings:', error);
        return { logo: null, branding: null };
    }
});
exports.getOrganizationBranding = getOrganizationBranding;
/**
 * Generiert einheitliches E-Mail-Template mit Logo und Corporate Identity
 * Nutzt Branding-Informationen für organisationsspezifische Farben
 */
const generateEmailTemplate = (options) => {
    var _a, _b, _c, _d;
    const { logo, branding, headerTitle = 'Intranet', content, footer, language = 'de' } = options;
    const defaultFooter = {
        de: 'Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.',
        en: 'This email was automatically generated. Please do not reply to this email.',
        es: 'Este correo electrónico fue generado automáticamente. Por favor, no responda a este correo electrónico.'
    };
    const footerText = footer || defaultFooter[language];
    // Verwende Branding-Farben oder Fallbacks
    const primaryColor = ((_a = branding === null || branding === void 0 ? void 0 : branding.colors) === null || _a === void 0 ? void 0 : _a.primary) || '#2563eb';
    const secondaryColor = ((_b = branding === null || branding === void 0 ? void 0 : branding.colors) === null || _b === void 0 ? void 0 : _b.secondary) || ((_c = branding === null || branding === void 0 ? void 0 : branding.colors) === null || _c === void 0 ? void 0 : _c.accent);
    const buttonColor = primaryColor || '#007bff';
    // Verwende Branding-Schriftart oder Fallback
    const fontFamily = ((_d = branding === null || branding === void 0 ? void 0 : branding.fonts) === null || _d === void 0 ? void 0 : _d.primary)
        ? `${branding.fonts.primary}, Arial, sans-serif`
        : 'Arial, sans-serif';
    // Logo-HTML (falls vorhanden) - Größe wie im Frontend (h-10 = 40px)
    const logoHtml = logo
        ? `<img src="${logo}" alt="${headerTitle}" style="height: 40px; width: auto; display: block;" />`
        : '';
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: ${fontFamily};
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .email-wrapper {
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 20px;
      background-color: transparent;
      border-bottom: 1px solid #e5e7eb;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: ${primaryColor};
    }
    .logo-container {
      display: flex;
      align-items: center;
    }
    .logo-container img {
      height: 40px;
      width: auto;
      display: block;
      object-fit: contain;
    }
    .content {
      padding: 30px;
      background-color: #ffffff;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: ${buttonColor};
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin: 10px 5px;
    }
    .button:hover {
      opacity: 0.9;
    }
    .footer {
      text-align: center;
      padding: 20px;
      background-color: #f9fafb;
      color: #6b7280;
      font-size: 12px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      ${headerTitle ? `<h1>${headerTitle}</h1>` : ''}
      ${logoHtml ? `<div class="logo-container">${logoHtml}</div>` : ''}
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>${footerText}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
};
exports.generateEmailTemplate = generateEmailTemplate;
//# sourceMappingURL=emailService.js.map