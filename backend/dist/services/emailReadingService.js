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
exports.EmailReadingService = void 0;
const imap_1 = __importDefault(require("imap"));
const mailparser_1 = require("mailparser");
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
/**
 * Service für das Lesen von Emails via IMAP
 */
class EmailReadingService {
    constructor(config) {
        this.imap = null;
        this.config = config;
    }
    /**
     * Verbindet zum IMAP-Server
     */
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.imap = new imap_1.default({
                    user: this.config.user,
                    password: this.config.password,
                    host: this.config.host,
                    port: this.config.port,
                    tls: this.config.secure,
                    tlsOptions: { rejectUnauthorized: false } // Für selbst-signierte Zertifikate
                });
                this.imap.once('ready', () => {
                    logger_1.logger.log('[EmailReading] IMAP-Verbindung erfolgreich');
                    resolve();
                });
                this.imap.once('error', (err) => {
                    logger_1.logger.error('[EmailReading] IMAP-Fehler:', err);
                    reject(err);
                });
                this.imap.connect();
            });
        });
    }
    /**
     * Trennt die IMAP-Verbindung
     */
    disconnect() {
        if (this.imap) {
            this.imap.end();
            this.imap = null;
            logger_1.logger.log('[EmailReading] IMAP-Verbindung getrennt');
        }
    }
    /**
     * Holt ungelesene Emails aus dem konfigurierten Ordner
     *
     * @param filters - Optionale Filter (z.B. from, subject)
     * @returns Array von Email-Nachrichten
     */
    fetchUnreadEmails(filters) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.imap) {
                throw new Error('IMAP-Verbindung nicht hergestellt. Bitte zuerst connect() aufrufen.');
            }
            return new Promise((resolve, reject) => {
                const emails = [];
                this.imap.openBox(this.config.folder, false, (err, box) => {
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
                    const searchCriteria = [['SINCE', searchDate]];
                    // Filter nach Absender
                    if ((filters === null || filters === void 0 ? void 0 : filters.from) && filters.from.length > 0) {
                        searchCriteria.push(['FROM', filters.from]);
                    }
                    // Filter nach Betreff
                    // IMAP OR benötigt genau 2 Argumente, daher müssen wir verschachteln
                    if ((filters === null || filters === void 0 ? void 0 : filters.subject) && filters.subject.length > 0) {
                        const subjectCriteria = filters.subject.map(subj => ['SUBJECT', subj]);
                        if (subjectCriteria.length === 1) {
                            searchCriteria.push(subjectCriteria[0]);
                        }
                        else if (subjectCriteria.length === 2) {
                            searchCriteria.push(['OR', subjectCriteria[0], subjectCriteria[1]]);
                        }
                        else {
                            // Für mehr als 2: verschachtelte OR-Statements
                            let combined = ['OR', subjectCriteria[0], subjectCriteria[1]];
                            for (let i = 2; i < subjectCriteria.length; i++) {
                                combined = ['OR', combined, subjectCriteria[i]];
                            }
                            searchCriteria.push(combined);
                        }
                    }
                    this.imap.search(searchCriteria, (err, results) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        if (!results || results.length === 0) {
                            logger_1.logger.log('[EmailReading] Keine neuen Emails gefunden');
                            resolve([]);
                            return;
                        }
                        logger_1.logger.log(`[EmailReading] ${results.length} ungelesene Email(s) gefunden`);
                        const fetch = this.imap.fetch(results, {
                            bodies: '',
                            struct: true
                        });
                        fetch.on('message', (msg, seqno) => {
                            let emailData = null;
                            const chunks = [];
                            msg.on('body', (stream, info) => {
                                stream.on('data', (chunk) => {
                                    chunks.push(chunk);
                                });
                            });
                            msg.once('end', () => __awaiter(this, void 0, void 0, function* () {
                                var _a, _b, _c, _d;
                                try {
                                    // Kombiniere alle Chunks zu einem Buffer
                                    const emailBuffer = Buffer.concat(chunks);
                                    // Parse Email mit Promise-Version
                                    emailData = yield (0, mailparser_1.simpleParser)(emailBuffer);
                                    if (emailData) {
                                        const emailMessage = {
                                            messageId: emailData.messageId || `email-${seqno}-${Date.now()}`,
                                            from: ((_a = emailData.from) === null || _a === void 0 ? void 0 : _a.text) || ((_d = (_c = (_b = emailData.from) === null || _b === void 0 ? void 0 : _b.value) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.address) || 'unknown',
                                            subject: emailData.subject || '',
                                            text: emailData.text || '',
                                            html: emailData.html || undefined,
                                            date: emailData.date || new Date(),
                                            rawContent: emailData.text || emailData.html || ''
                                        };
                                        emails.push(emailMessage);
                                    }
                                }
                                catch (err) {
                                    logger_1.logger.error(`[EmailReading] Fehler beim Parsen der Email ${seqno}:`, err);
                                }
                            }));
                        });
                        fetch.once('error', (err) => {
                            reject(err);
                        });
                        fetch.once('end', () => {
                            logger_1.logger.log(`[EmailReading] ${emails.length} Email(s) erfolgreich geladen`);
                            resolve(emails);
                        });
                    });
                });
            });
        });
    }
    /**
     * Markiert Email als gelesen
     */
    markAsRead(messageId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.imap) {
                throw new Error('IMAP-Verbindung nicht hergestellt');
            }
            return new Promise((resolve, reject) => {
                this.imap.openBox(this.config.folder, false, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    // Suche nach Email mit dieser Message-ID
                    // IMAP erwartet HEADER mit zwei separaten Argumenten
                    this.imap.search([['HEADER', 'MESSAGE-ID', messageId]], (err, results) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        if (!results || results.length === 0) {
                            logger_1.logger.warn(`[EmailReading] Email mit Message-ID ${messageId} nicht gefunden`);
                            resolve();
                            return;
                        }
                        // Markiere als gelesen
                        this.imap.addFlags(results, '\\Seen', (err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            logger_1.logger.log(`[EmailReading] Email ${messageId} als gelesen markiert`);
                            resolve();
                        });
                    });
                });
            });
        });
    }
    /**
     * Verschiebt Email in einen anderen Ordner
     */
    moveToFolder(messageId, targetFolder) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.config.processedFolder) {
                logger_1.logger.warn('[EmailReading] processedFolder nicht konfiguriert, Email wird nicht verschoben');
                return;
            }
            if (!this.imap) {
                throw new Error('IMAP-Verbindung nicht hergestellt');
            }
            return new Promise((resolve, reject) => {
                this.imap.openBox(this.config.folder, false, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    // Suche nach Email mit dieser Message-ID
                    // IMAP erwartet HEADER mit zwei separaten Argumenten
                    this.imap.search([['HEADER', 'MESSAGE-ID', messageId]], (err, results) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        if (!results || results.length === 0) {
                            logger_1.logger.warn(`[EmailReading] Email mit Message-ID ${messageId} nicht gefunden`);
                            resolve();
                            return;
                        }
                        // Stelle sicher, dass Ordner-Name mit INBOX. beginnt (falls nicht bereits)
                        const fullFolderName = targetFolder.startsWith('INBOX.') || targetFolder === 'INBOX'
                            ? targetFolder
                            : `INBOX.${targetFolder}`;
                        // Verschiebe Email
                        this.imap.move(results, fullFolderName, (err) => {
                            if (err) {
                                // Falls Ordner nicht existiert, erstelle ihn
                                this.imap.addBox(fullFolderName, (addErr) => {
                                    if (addErr && !addErr.message.includes('already exists')) {
                                        // Fehler beim Erstellen des Ordners - ignoriere und markiere nur als gelesen
                                        logger_1.logger.warn(`[EmailReading] Konnte Ordner ${fullFolderName} nicht erstellen, Email wird nur als gelesen markiert`);
                                        resolve();
                                        return;
                                    }
                                    // Versuche erneut zu verschieben
                                    this.imap.move(results, fullFolderName, (moveErr) => {
                                        if (moveErr) {
                                            // Fehler beim Verschieben - ignoriere und markiere nur als gelesen
                                            logger_1.logger.warn(`[EmailReading] Konnte Email nicht nach ${fullFolderName} verschieben, Email wird nur als gelesen markiert`);
                                            resolve();
                                            return;
                                        }
                                        logger_1.logger.log(`[EmailReading] Email ${messageId} nach ${fullFolderName} verschoben`);
                                        resolve();
                                    });
                                });
                                return;
                            }
                            logger_1.logger.log(`[EmailReading] Email ${messageId} nach ${fullFolderName} verschoben`);
                            resolve();
                        });
                    });
                });
            });
        });
    }
    /**
     * Lädt Email-Konfiguration aus Organisation-Settings
     */
    static loadConfigFromOrganization(organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const organization = yield prisma_1.prisma.organization.findUnique({
                    where: { id: organizationId },
                    select: { settings: true }
                });
                if (!(organization === null || organization === void 0 ? void 0 : organization.settings) || typeof organization.settings !== 'object') {
                    return null;
                }
                const orgSettings = organization.settings;
                const emailReading = orgSettings.emailReading;
                if (!emailReading || !emailReading.enabled || !emailReading.imap) {
                    return null;
                }
                const imapConfig = emailReading.imap;
                // Validiere erforderliche Felder
                if (!imapConfig.host || !imapConfig.user || !imapConfig.password) {
                    logger_1.logger.warn(`[EmailReading] Unvollständige IMAP-Konfiguration für Organisation ${organizationId}`);
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
            }
            catch (error) {
                logger_1.logger.error(`[EmailReading] Fehler beim Laden der Konfiguration für Organisation ${organizationId}:`, error);
                return null;
            }
        });
    }
}
exports.EmailReadingService = EmailReadingService;
//# sourceMappingURL=emailReadingService.js.map