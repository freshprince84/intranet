import nodemailer from 'nodemailer';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// SMTP-Konfiguration aus Umgebungsvariablen oder Organisation-Settings
const createTransporter = async (organizationId?: number) => {
  let smtpHost: string | undefined;
  let smtpPort: number = 587;
  let smtpUser: string | undefined;
  let smtpPass: string | undefined;

  // Wenn organizationId vorhanden, versuche Organisation-spezifische SMTP-Einstellungen zu laden
  if (organizationId) {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true }
      });

      if (organization?.settings && typeof organization.settings === 'object') {
        const orgSettings = organization.settings as any;
        console.log(`[EMAIL] Org ${organizationId} Settings gefunden:`, JSON.stringify(orgSettings, null, 2));
        if (orgSettings.smtpHost && orgSettings.smtpUser && orgSettings.smtpPass) {
          smtpHost = orgSettings.smtpHost;
          // Port kann als String oder Number gespeichert sein
          const portValue = orgSettings.smtpPort;
          smtpPort = typeof portValue === 'number' ? portValue : (portValue ? parseInt(String(portValue)) : 587);
          smtpUser = orgSettings.smtpUser;
          smtpPass = orgSettings.smtpPass;
          console.log(`📧 Nutze Organisation-spezifische SMTP-Einstellungen für Org ${organizationId}`);
          console.log(`📧 SMTP Host: ${smtpHost}, Port: ${smtpPort}, User: ${smtpUser}`);
          // Speichere auch From-Einstellungen für späteren Gebrauch
          if (orgSettings.smtpFromEmail || orgSettings.smtpFromName) {
            console.log(`📧 Org ${organizationId} hat From-Einstellungen: ${orgSettings.smtpFromEmail || 'nicht gesetzt'}, ${orgSettings.smtpFromName || 'nicht gesetzt'}`);
          }
        } else {
          console.log(`⚠️ Org ${organizationId} hat SMTP-Einstellungen, aber nicht alle erforderlichen Felder sind gesetzt:`);
          console.log(`   smtpHost: ${orgSettings.smtpHost ? '✅' : '❌'}`);
          console.log(`   smtpUser: ${orgSettings.smtpUser ? '✅' : '❌'}`);
          console.log(`   smtpPass: ${orgSettings.smtpPass ? '✅' : '❌'}`);
        }
      } else {
        console.log(`⚠️ Org ${organizationId} hat keine Settings oder Settings sind kein Objekt`);
      }
    } catch (error) {
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

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true für 465, false für andere Ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
};

/**
 * Sendet E-Mail über Mailtrap API (falls konfiguriert)
 */
const sendViaMailtrapAPI = async (
  email: string,
  username: string,
  password: string
): Promise<boolean> => {
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
      response = await axios.post(
        'https://send.api.mailtrap.io/api/send',
        {
          from: { email: 'noreply@intranet.local', name: 'Intranet' },
          to: [{ email }],
          subject: 'Willkommen im Intranet - Ihre Anmeldeinformationen',
          html: htmlContent,
          text: textContent,
          category: 'Registration'
        },
        {
          headers: {
            'Authorization': `Bearer ${mailtrapTransactionalToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (transactionalError: any) {
      // Falls Transactional Email nicht funktioniert, nutze Sandbox (nur für Tests)
      if (transactionalError.response?.status === 401 || transactionalError.response?.status === 403) {
        response = await axios.post(
          `https://sandbox.api.mailtrap.io/api/send/${mailtrapTestInboxId}`,
          {
            from: { email: 'noreply@intranet.local', name: 'Intranet' },
            to: [{ email }],
            subject: 'Willkommen im Intranet - Ihre Anmeldeinformationen',
            html: htmlContent,
            text: textContent,
            category: 'Registration'
          },
          {
            headers: {
              'Authorization': `Bearer ${mailtrapApiToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } else {
        throw transactionalError;
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Fehler beim Versenden über Mailtrap API:', error);
    return false;
  }
};

/**
 * Sendet eine Willkommens-E-Mail mit Anmeldeinformationen nach der Registrierung
 * @param email E-Mail-Adresse des neuen Benutzers
 * @param username Benutzername
 * @param password Passwort (wird nur in der E-Mail angezeigt)
 * @param organizationId Optional: ID der Organisation (für org-spezifische SMTP-Einstellungen)
 */
export const sendRegistrationEmail = async (
  email: string,
  username: string,
  password: string, // Das Original-Passwort (wird nur in der E-Mail angezeigt)
  organizationId?: number // Optional: für org-spezifische SMTP-Einstellungen
): Promise<boolean> => {
  // Versuche zuerst Mailtrap API (falls konfiguriert)
  const apiSuccess = await sendViaMailtrapAPI(email, username, password);
  if (apiSuccess) {
    return true;
  }

  // Fallback zu SMTP
  try {
    const transporter = await createTransporter(organizationId);
    
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

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Registrierungs-E-Mail versendet:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Versenden der Registrierungs-E-Mail:', error);
    return false;
  }
};

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
 */
export const sendEmail = async (
  email: string,
  subject: string,
  html: string,
  text?: string,
  organizationId?: number
): Promise<boolean> => {
  try {
    const transporter = await createTransporter(organizationId);
    
    if (!transporter) {
      console.warn('⚠️ E-Mail-Transporter nicht verfügbar. E-Mail wurde nicht versendet.');
      return false;
    }

    // Lade From-Einstellungen aus Organisation-Settings (falls vorhanden)
    let fromEmail = process.env.SMTP_USER || 'noreply@intranet.local';
    let fromName = 'Intranet';
    
    if (organizationId) {
      try {
        const organization = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { settings: true, displayName: true }
        });
        
        if (organization?.settings && typeof organization.settings === 'object') {
          const orgSettings = organization.settings as any;
          if (orgSettings.smtpFromEmail) {
            fromEmail = orgSettings.smtpFromEmail;
          }
          if (orgSettings.smtpFromName) {
            fromName = orgSettings.smtpFromName;
          } else if (organization.displayName) {
            fromName = organization.displayName;
          }
        }
      } catch (error) {
        console.warn('⚠️ Fehler beim Laden der Organisation-From-Einstellungen:', error);
      }
    }

    const mailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: subject,
      html: html,
      text: text || html.replace(/<[^>]*>/g, ''), // Fallback: HTML ohne Tags
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ E-Mail versendet:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Versenden der E-Mail:', error);
    return false;
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  username: string,
  resetLink: string,
  organizationId?: number
): Promise<boolean> => {
  console.log(`[EMAIL] Starte Versand der Passwort-Reset-E-Mail für: ${username} (${email})`);
  if (organizationId) {
    console.log(`[EMAIL] Verwende Organisation-ID: ${organizationId}`);
  }
  
  // Versuche zuerst Mailtrap API (falls konfiguriert)
  const apiSuccess = await sendPasswordResetViaMailtrapAPI(email, username, resetLink, organizationId);
  if (apiSuccess) {
    console.log(`[EMAIL] E-Mail erfolgreich über Mailtrap API versendet`);
    return true;
  }
  
  console.log(`[EMAIL] Mailtrap API nicht verfügbar oder fehlgeschlagen, versuche SMTP...`);

  // Fallback zu SMTP
  try {
    const transporter = await createTransporter(organizationId);
    
    if (!transporter) {
      console.warn('⚠️ E-Mail-Transporter nicht verfügbar. E-Mail wurde nicht versendet.');
      return false;
    }

    // Lade From-Einstellungen aus Organisation-Settings (falls vorhanden)
    let fromEmail = process.env.SMTP_USER || 'noreply@intranet.local';
    let fromName = 'Intranet';
    
    if (organizationId) {
      try {
        const organization = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { settings: true, displayName: true }
        });
        
        if (organization?.settings && typeof organization.settings === 'object') {
          const orgSettings = organization.settings as any;
          if (orgSettings.smtpFromEmail) {
            fromEmail = orgSettings.smtpFromEmail;
          }
          if (orgSettings.smtpFromName) {
            fromName = orgSettings.smtpFromName;
          } else if (organization.displayName) {
            fromName = organization.displayName;
          }
        }
      } catch (error) {
        console.warn('⚠️ Fehler beim Laden der From-Einstellungen:', error);
      }
    }

    // Formatiere From-String für nodemailer
    const fromString = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
    
    console.log(`[EMAIL] 📧 Versende E-Mail von: ${fromString} an: ${email}`);

    const mailOptions = {
      from: fromString,
      to: email,
      subject: 'Passwort zurücksetzen - Intranet',
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
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #1d4ed8;
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
      `,
      text: `
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
      `,
    };

    console.log(`[EMAIL] Sende E-Mail über SMTP...`);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Passwort-Reset-E-Mail erfolgreich über SMTP versendet!');
    console.log(`[EMAIL] Message ID: ${info.messageId}`);
    console.log(`[EMAIL] E-Mail gesendet an: ${email}`);
    console.log(`[EMAIL] Von: ${fromString}`);
    return true;
  } catch (error: any) {
    console.error('❌ Fehler beim Versenden der Passwort-Reset-E-Mail über SMTP:');
    console.error(`[EMAIL] Fehler-Typ: ${error.constructor.name}`);
    if (error.response) {
      console.error(`[EMAIL] SMTP Fehler-Response: ${error.response.status}`, error.response.data);
    }
    if (error.code) {
      console.error(`[EMAIL] SMTP Fehler-Code: ${error.code}`);
    }
    if (error.message) {
      console.error(`[EMAIL] SMTP Fehler-Message: ${error.message}`);
    }
    if (error.command) {
      console.error(`[EMAIL] SMTP Fehler-Command: ${error.command}`);
    }
    if (error.responseCode) {
      console.error(`[EMAIL] SMTP Response-Code: ${error.responseCode}`);
    }
    console.error(`[EMAIL] Vollständiger Fehler:`, error);
    return false;
  }
};

/**
 * Sendet Passwort-Reset-E-Mail über Mailtrap API (falls konfiguriert)
 */
const sendPasswordResetViaMailtrapAPI = async (
  email: string,
  username: string,
  resetLink: string,
  organizationId?: number
): Promise<boolean> => {
  const mailtrapApiToken = process.env.MAILTRAP_API_TOKEN;
  const mailtrapTestInboxId = process.env.MAILTRAP_TEST_INBOX_ID;

  if (!mailtrapApiToken || !mailtrapTestInboxId) {
    console.log('[EMAIL] Mailtrap API nicht konfiguriert (Token oder Inbox-ID fehlt), versuche SMTP');
    return false; // API nicht konfiguriert
  }

  // Wenn Organisation-ID vorhanden ist, sollte SMTP verwendet werden, nicht Mailtrap
  if (organizationId) {
    console.log(`[EMAIL] Organisation-ID vorhanden (${organizationId}), überspringe Mailtrap API und verwende SMTP`);
    return false;
  }

  console.log(`[EMAIL] Versuche Passwort-Reset-E-Mail über Mailtrap API zu senden an: ${email}`);

  // Lade From-Einstellungen aus Organisation-Settings (falls vorhanden)
  let fromEmail = 'noreply@intranet.local';
  let fromName = 'Intranet';
  
  if (organizationId) {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true, displayName: true }
      });
      
      if (organization?.settings && typeof organization.settings === 'object') {
        const orgSettings = organization.settings as any;
        if (orgSettings.smtpFromEmail) {
          fromEmail = orgSettings.smtpFromEmail;
        }
        if (orgSettings.smtpFromName) {
          fromName = orgSettings.smtpFromName;
        } else if (organization.displayName) {
          fromName = organization.displayName;
        }
      }
    } catch (error) {
      console.warn('⚠️ Fehler beim Laden der From-Einstellungen für Mailtrap:', error);
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
      response = await axios.post(
        'https://send.api.mailtrap.io/api/send',
        {
          from: { email: fromEmail, name: fromName },
          to: [{ email }],
          subject: 'Passwort zurücksetzen - Intranet',
          html: htmlContent,
          text: textContent,
          category: 'PasswordReset'
        },
        {
          headers: {
            'Authorization': `Bearer ${mailtrapTransactionalToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (transactionalError: any) {
      // Falls Transactional Email nicht funktioniert, nutze Sandbox (nur für Tests)
      if (transactionalError.response?.status === 401 || transactionalError.response?.status === 403) {
        response = await axios.post(
          `https://sandbox.api.mailtrap.io/api/send/${mailtrapTestInboxId}`,
          {
            from: { email: fromEmail, name: fromName },
            to: [{ email }],
            subject: 'Passwort zurücksetzen - Intranet',
            html: htmlContent,
            text: textContent,
            category: 'PasswordReset'
          },
          {
            headers: {
              'Authorization': `Bearer ${mailtrapApiToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } else {
        throw transactionalError;
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Fehler beim Versenden über Mailtrap API:', error);
    return false;
  }
};

