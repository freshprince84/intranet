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
exports.sendRegistrationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const axios_1 = __importDefault(require("axios"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// SMTP-Konfiguration aus Umgebungsvariablen oder Organisation-Settings
const createTransporter = (organizationId) => __awaiter(void 0, void 0, void 0, function* () {
    let smtpHost;
    let smtpPort = 587;
    let smtpUser;
    let smtpPass;
    // Wenn organizationId vorhanden, versuche Organisation-spezifische SMTP-Einstellungen zu laden
    if (organizationId) {
        try {
            const organization = yield prisma.organization.findUnique({
                where: { id: organizationId },
                select: { settings: true }
            });
            if ((organization === null || organization === void 0 ? void 0 : organization.settings) && typeof organization.settings === 'object') {
                const orgSettings = organization.settings;
                if (orgSettings.smtpHost && orgSettings.smtpUser && orgSettings.smtpPass) {
                    smtpHost = orgSettings.smtpHost;
                    smtpPort = orgSettings.smtpPort ? parseInt(orgSettings.smtpPort) : 587;
                    smtpUser = orgSettings.smtpUser;
                    smtpPass = orgSettings.smtpPass;
                    console.log(`📧 Nutze Organisation-spezifische SMTP-Einstellungen für Org ${organizationId}`);
                }
            }
        }
        catch (error) {
            console.warn('⚠️ Fehler beim Laden der Organisation-SMTP-Einstellungen:', error);
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
        console.warn('⚠️ SMTP-Konfiguration fehlt. E-Mails können nicht versendet werden.');
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
        console.error('❌ Fehler beim Versenden über Mailtrap API:', error);
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
    // Versuche zuerst Mailtrap API (falls konfiguriert)
    const apiSuccess = yield sendViaMailtrapAPI(email, username, password);
    if (apiSuccess) {
        return true;
    }
    // Fallback zu SMTP
    try {
        const transporter = yield createTransporter(organizationId);
        if (!transporter) {
            console.warn('⚠️ E-Mail-Transporter nicht verfügbar. E-Mail wurde nicht versendet.');
            return false;
        }
        const mailOptions = {
            from: process.env.SMTP_USER || 'noreply@intranet.local',
            to: email,
            subject: 'Willkommen im Intranet - Ihre Anmeldeinformationen',
            html: `
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
      `,
            text: `
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
      `,
        };
        const info = yield transporter.sendMail(mailOptions);
        console.log('✅ Registrierungs-E-Mail versendet:', info.messageId);
        return true;
    }
    catch (error) {
        console.error('❌ Fehler beim Versenden der Registrierungs-E-Mail:', error);
        return false;
    }
});
exports.sendRegistrationEmail = sendRegistrationEmail;
//# sourceMappingURL=emailService.js.map