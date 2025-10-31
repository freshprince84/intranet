import nodemailer from 'nodemailer';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// SMTP-Konfiguration aus Umgebungsvariablen
const createTransporter = () => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  // Wenn keine SMTP-Konfiguration vorhanden, gibt es keinen Transporter
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

    const response = await axios.post(
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

    console.log('✅ Registrierungs-E-Mail über Mailtrap API versendet:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Fehler beim Versenden über Mailtrap API:', error);
    return false;
  }
};

/**
 * Sendet eine Willkommens-E-Mail mit Anmeldeinformationen nach der Registrierung
 */
export const sendRegistrationEmail = async (
  email: string,
  username: string,
  password: string // Das Original-Passwort (wird nur in der E-Mail angezeigt)
): Promise<boolean> => {
  // Versuche zuerst Mailtrap API (falls konfiguriert)
  const apiSuccess = await sendViaMailtrapAPI(email, username, password);
  if (apiSuccess) {
    return true;
  }

  // Fallback zu SMTP
  try {
    const transporter = createTransporter();
    
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

