import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { prisma } from '../utils/prisma';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean; // TLS/SSL
  user: string;
  password: string;
  folder: string; // z.B. "INBOX"
  processedFolder?: string; // z.B. "Processed"
}

export interface EmailMessage {
  messageId: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  date: Date;
  rawContent: string;
}

/**
 * Service für das Lesen von Emails via IMAP
 */
export class EmailReadingService {
  private imap: Imap | null = null;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  /**
   * Verbindet zum IMAP-Server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap = new Imap({
        user: this.config.user,
        password: this.config.password,
        host: this.config.host,
        port: this.config.port,
        tls: this.config.secure,
        tlsOptions: { rejectUnauthorized: false } // Für selbst-signierte Zertifikate
      });

      this.imap.once('ready', () => {
        console.log('[EmailReading] IMAP-Verbindung erfolgreich');
        resolve();
      });

      this.imap.once('error', (err: Error) => {
        console.error('[EmailReading] IMAP-Fehler:', err);
        reject(err);
      });

      this.imap.connect();
    });
  }

  /**
   * Trennt die IMAP-Verbindung
   */
  disconnect(): void {
    if (this.imap) {
      this.imap.end();
      this.imap = null;
      console.log('[EmailReading] IMAP-Verbindung getrennt');
    }
  }

  /**
   * Holt ungelesene Emails aus dem konfigurierten Ordner
   * 
   * @param filters - Optionale Filter (z.B. from, subject)
   * @returns Array von Email-Nachrichten
   */
  async fetchUnreadEmails(filters?: {
    from?: string[];
    subject?: string[];
  }): Promise<EmailMessage[]> {
    if (!this.imap) {
      throw new Error('IMAP-Verbindung nicht hergestellt. Bitte zuerst connect() aufrufen.');
    }

    return new Promise((resolve, reject) => {
      const emails: EmailMessage[] = [];

      this.imap!.openBox(this.config.folder, false, (err, box) => {
        if (err) {
          reject(err);
          return;
        }

        // Suche nach Emails (auch gelesene) - WICHTIG: Es muss egal sein, ob Email gelesen ist oder nicht
        // Prüfe nur Emails der letzten 24 Stunden, um Performance zu gewährleisten
        const searchDate = new Date();
        searchDate.setHours(searchDate.getHours() - 24);
        // IMAP SINCE: node-imap erwartet Format [['SINCE', Date]] - verschachtelt als Array-Element
        // Siehe README: imap.search([ 'UNSEEN', ['SINCE', 'May 20, 2010'] ], ...)
        // WICHTIG: Kein UNSEEN, damit auch gelesene Emails gefunden werden
        const searchCriteria: any[] = [['SINCE', searchDate]];

        // Filter nach Absender
        if (filters?.from && filters.from.length > 0) {
          searchCriteria.push(['FROM', filters.from]);
        }

        // Filter nach Betreff
        // IMAP OR benötigt genau 2 Argumente, daher müssen wir verschachteln
        if (filters?.subject && filters.subject.length > 0) {
          const subjectCriteria = filters.subject.map(subj => ['SUBJECT', subj] as any);
          if (subjectCriteria.length === 1) {
            searchCriteria.push(subjectCriteria[0]);
          } else if (subjectCriteria.length === 2) {
            searchCriteria.push(['OR', subjectCriteria[0], subjectCriteria[1]]);
          } else {
            // Für mehr als 2: verschachtelte OR-Statements
            let combined: any = ['OR', subjectCriteria[0], subjectCriteria[1]];
            for (let i = 2; i < subjectCriteria.length; i++) {
              combined = ['OR', combined, subjectCriteria[i]];
            }
            searchCriteria.push(combined);
          }
        }

        this.imap!.search(searchCriteria, (err, results) => {
          if (err) {
            reject(err);
            return;
          }

          if (!results || results.length === 0) {
            console.log('[EmailReading] Keine neuen Emails gefunden');
            resolve([]);
            return;
          }

          console.log(`[EmailReading] ${results.length} ungelesene Email(s) gefunden`);

          const fetch = this.imap!.fetch(results, {
            bodies: '',
            struct: true
          });

          fetch.on('message', (msg, seqno) => {
            let emailData: ParsedMail | null = null;
            const chunks: Buffer[] = [];

            msg.on('body', (stream, info) => {
              stream.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
              });
            });

            msg.once('end', async () => {
              try {
                // Kombiniere alle Chunks zu einem Buffer
                const emailBuffer = Buffer.concat(chunks);
                
                // Parse Email mit Promise-Version
                emailData = await simpleParser(emailBuffer);

                if (emailData) {
                  const emailMessage: EmailMessage = {
                    messageId: emailData.messageId || `email-${seqno}-${Date.now()}`,
                    from: emailData.from?.text || emailData.from?.value?.[0]?.address || 'unknown',
                    subject: emailData.subject || '',
                    text: emailData.text || '',
                    html: emailData.html || undefined,
                    date: emailData.date || new Date(),
                    rawContent: emailData.text || emailData.html || ''
                  };

                  emails.push(emailMessage);
                }
              } catch (err) {
                console.error(`[EmailReading] Fehler beim Parsen der Email ${seqno}:`, err);
              }
            });
          });

          fetch.once('error', (err) => {
            reject(err);
          });

          fetch.once('end', () => {
            console.log(`[EmailReading] ${emails.length} Email(s) erfolgreich geladen`);
            resolve(emails);
          });
        });
      });
    });
  }

  /**
   * Markiert Email als gelesen
   */
  async markAsRead(messageId: string): Promise<void> {
    if (!this.imap) {
      throw new Error('IMAP-Verbindung nicht hergestellt');
    }

    return new Promise((resolve, reject) => {
      this.imap!.openBox(this.config.folder, false, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Suche nach Email mit dieser Message-ID
        // IMAP erwartet HEADER mit zwei separaten Argumenten
        this.imap!.search([['HEADER', 'MESSAGE-ID', messageId]], (err, results) => {
          if (err) {
            reject(err);
            return;
          }

          if (!results || results.length === 0) {
            console.warn(`[EmailReading] Email mit Message-ID ${messageId} nicht gefunden`);
            resolve();
            return;
          }

          // Markiere als gelesen
          this.imap!.addFlags(results, '\\Seen', (err) => {
            if (err) {
              reject(err);
              return;
            }

            console.log(`[EmailReading] Email ${messageId} als gelesen markiert`);
            resolve();
          });
        });
      });
    });
  }

  /**
   * Verschiebt Email in einen anderen Ordner
   */
  async moveToFolder(messageId: string, targetFolder: string): Promise<void> {
    if (!this.config.processedFolder) {
      console.warn('[EmailReading] processedFolder nicht konfiguriert, Email wird nicht verschoben');
      return;
    }

    if (!this.imap) {
      throw new Error('IMAP-Verbindung nicht hergestellt');
    }

    return new Promise((resolve, reject) => {
      this.imap!.openBox(this.config.folder, false, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Suche nach Email mit dieser Message-ID
        // IMAP erwartet HEADER mit zwei separaten Argumenten
        this.imap!.search([['HEADER', 'MESSAGE-ID', messageId]], (err, results) => {
          if (err) {
            reject(err);
            return;
          }

          if (!results || results.length === 0) {
            console.warn(`[EmailReading] Email mit Message-ID ${messageId} nicht gefunden`);
            resolve();
            return;
          }

          // Stelle sicher, dass Ordner-Name mit INBOX. beginnt (falls nicht bereits)
          const fullFolderName = targetFolder.startsWith('INBOX.') || targetFolder === 'INBOX' 
            ? targetFolder 
            : `INBOX.${targetFolder}`;

          // Verschiebe Email
          this.imap!.move(results, fullFolderName, (err) => {
            if (err) {
              // Falls Ordner nicht existiert, erstelle ihn
              this.imap!.addBox(fullFolderName, (addErr) => {
                if (addErr && !addErr.message.includes('already exists')) {
                  // Fehler beim Erstellen des Ordners - ignoriere und markiere nur als gelesen
                  console.warn(`[EmailReading] Konnte Ordner ${fullFolderName} nicht erstellen, Email wird nur als gelesen markiert`);
                  resolve();
                  return;
                }

                // Versuche erneut zu verschieben
                this.imap!.move(results, fullFolderName, (moveErr) => {
                  if (moveErr) {
                    // Fehler beim Verschieben - ignoriere und markiere nur als gelesen
                    console.warn(`[EmailReading] Konnte Email nicht nach ${fullFolderName} verschieben, Email wird nur als gelesen markiert`);
                    resolve();
                    return;
                  }

                  console.log(`[EmailReading] Email ${messageId} nach ${fullFolderName} verschoben`);
                  resolve();
                });
              });
              return;
            }

            console.log(`[EmailReading] Email ${messageId} nach ${fullFolderName} verschoben`);
            resolve();
          });
        });
      });
    });
  }

  /**
   * Lädt Email-Konfiguration aus Organisation-Settings
   */
  static async loadConfigFromOrganization(organizationId: number): Promise<EmailConfig | null> {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true }
      });

      if (!organization?.settings || typeof organization.settings !== 'object') {
        return null;
      }

      const orgSettings = organization.settings as any;
      const emailReading = orgSettings.emailReading;

      if (!emailReading || !emailReading.enabled || !emailReading.imap) {
        return null;
      }

      const imapConfig = emailReading.imap;

      // Validiere erforderliche Felder
      if (!imapConfig.host || !imapConfig.user || !imapConfig.password) {
        console.warn(`[EmailReading] Unvollständige IMAP-Konfiguration für Organisation ${organizationId}`);
        return null;
      }

      return {
        host: imapConfig.host,
        port: imapConfig.port || (imapConfig.secure ? 993 : 143),
        secure: imapConfig.secure !== false, // Default: true
        user: imapConfig.user,
        password: imapConfig.password, // Sollte bereits entschlüsselt sein
        folder: imapConfig.folder || 'INBOX',
        processedFolder: imapConfig.processedFolder
      };
    } catch (error) {
      console.error(`[EmailReading] Fehler beim Laden der Konfiguration für Organisation ${organizationId}:`, error);
      return null;
    }
  }
}

