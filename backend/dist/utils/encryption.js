"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptBranchApiSettings = exports.encryptBranchApiSettings = exports.decryptApiSettings = exports.encryptApiSettings = exports.decryptSecret = exports.encryptSecret = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("./logger");
/**
 * Verschlüsselungs-Utility für sensitive Daten (API-Keys, Secrets)
 *
 * Verwendet AES-256-GCM für sichere Verschlüsselung mit Authentifizierung
 *
 * WICHTIG: ENCRYPTION_KEY muss in .env gesetzt sein:
 * ENCRYPTION_KEY=<64 hex characters> (32 bytes = 256 bits)
 *
 * Generierung: node -e "logger.log(crypto.randomBytes(32).toString('hex'))"
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes für AES
const AUTH_TAG_LENGTH = 16; // 16 bytes für GCM
/**
 * Verschlüsselt einen String
 *
 * @param text - Der zu verschlüsselnde Text
 * @returns Verschlüsselter String im Format: iv:authTag:encrypted
 * @throws Error wenn ENCRYPTION_KEY nicht gesetzt ist
 */
const encryptSecret = (text) => {
    if (!text) {
        return text; // Leere Strings nicht verschlüsseln
    }
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    // Validiere Key-Länge (64 hex characters = 32 bytes)
    if (encryptionKey.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    try {
        const key = Buffer.from(encryptionKey, 'hex');
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        // Format: iv:authTag:encrypted
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }
    catch (error) {
        logger_1.logger.error('Error encrypting secret:', error);
        throw new Error('Failed to encrypt secret');
    }
};
exports.encryptSecret = encryptSecret;
/**
 * Entschlüsselt einen verschlüsselten String
 *
 * @param encryptedText - Verschlüsselter String im Format: iv:authTag:encrypted
 * @returns Entschlüsselter Text
 * @throws Error wenn ENCRYPTION_KEY nicht gesetzt ist oder Entschlüsselung fehlschlägt
 */
const decryptSecret = (encryptedText) => {
    if (!encryptedText) {
        return encryptedText; // Leere Strings nicht entschlüsseln
    }
    // Prüfe ob bereits verschlüsselt (Format: iv:authTag:encrypted)
    if (!encryptedText.includes(':')) {
        // Nicht verschlüsselt (für Migration bestehender Daten)
        return encryptedText;
    }
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    // Validiere Key-Länge
    if (encryptionKey.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted text format');
        }
        const [ivHex, authTagHex, encrypted] = parts;
        const key = Buffer.from(encryptionKey, 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        logger_1.logger.error('Error decrypting secret:', error);
        throw new Error('Failed to decrypt secret - invalid key or corrupted data');
    }
};
exports.decryptSecret = decryptSecret;
/**
 * Verschlüsselt alle API-Keys in OrganizationSettings
 *
 * @param settings - OrganizationSettings Objekt
 * @returns Settings mit verschlüsselten API-Keys
 */
const encryptApiSettings = (settings) => {
    var _a, _b, _c, _d, _e;
    if (!settings || typeof settings !== 'object') {
        return settings;
    }
    const encrypted = Object.assign({}, settings);
    // LobbyPMS API Key
    if ((_a = encrypted.lobbyPms) === null || _a === void 0 ? void 0 : _a.apiKey) {
        // ✅ PERFORMANCE: Prüfe ob bereits verschlüsselt (Format: iv:authTag:encrypted)
        // Verhindert mehrfache Verschlüsselung (die zu 63 MB führen kann!)
        const apiKey = encrypted.lobbyPms.apiKey;
        const isAlreadyEncrypted = typeof apiKey === 'string' &&
            apiKey.includes(':') &&
            apiKey.split(':').length >= 3;
        if (!isAlreadyEncrypted) {
            // Nur verschlüsseln wenn noch nicht verschlüsselt
            encrypted.lobbyPms = Object.assign(Object.assign({}, encrypted.lobbyPms), { apiKey: (0, exports.encryptSecret)(apiKey) });
        }
        // Wenn bereits verschlüsselt: unverändert lassen
    }
    // TTLock Client Secret
    if ((_b = encrypted.doorSystem) === null || _b === void 0 ? void 0 : _b.clientSecret) {
        // ✅ PERFORMANCE: Prüfe ob bereits verschlüsselt
        const clientSecret = encrypted.doorSystem.clientSecret;
        const isAlreadyEncrypted = typeof clientSecret === 'string' &&
            clientSecret.includes(':') &&
            clientSecret.split(':').length >= 3;
        if (!isAlreadyEncrypted) {
            encrypted.doorSystem = Object.assign(Object.assign({}, encrypted.doorSystem), { clientSecret: (0, exports.encryptSecret)(clientSecret) });
        }
    }
    // Bold Payment API Key
    if ((_c = encrypted.boldPayment) === null || _c === void 0 ? void 0 : _c.apiKey) {
        // ✅ PERFORMANCE: Prüfe ob bereits verschlüsselt
        const apiKey = encrypted.boldPayment.apiKey;
        const isAlreadyEncrypted = typeof apiKey === 'string' &&
            apiKey.includes(':') &&
            apiKey.split(':').length >= 3;
        if (!isAlreadyEncrypted) {
            encrypted.boldPayment = Object.assign(Object.assign({}, encrypted.boldPayment), { apiKey: (0, exports.encryptSecret)(apiKey) });
        }
    }
    // WhatsApp API Key & Secret
    if ((_d = encrypted.whatsapp) === null || _d === void 0 ? void 0 : _d.apiKey) {
        // ✅ PERFORMANCE: Prüfe ob bereits verschlüsselt
        const apiKey = encrypted.whatsapp.apiKey;
        const isAlreadyEncrypted = typeof apiKey === 'string' &&
            apiKey.includes(':') &&
            apiKey.split(':').length >= 3;
        if (!isAlreadyEncrypted) {
            encrypted.whatsapp = Object.assign(Object.assign({}, encrypted.whatsapp), { apiKey: (0, exports.encryptSecret)(apiKey) });
        }
    }
    if ((_e = encrypted.whatsapp) === null || _e === void 0 ? void 0 : _e.apiSecret) {
        // ✅ PERFORMANCE: Prüfe ob bereits verschlüsselt
        const apiSecret = encrypted.whatsapp.apiSecret;
        const isAlreadyEncrypted = typeof apiSecret === 'string' &&
            apiSecret.includes(':') &&
            apiSecret.split(':').length >= 3;
        if (!isAlreadyEncrypted) {
            encrypted.whatsapp = Object.assign(Object.assign({}, encrypted.whatsapp), { apiSecret: (0, exports.encryptSecret)(apiSecret) });
        }
    }
    return encrypted;
};
exports.encryptApiSettings = encryptApiSettings;
/**
 * Entschlüsselt alle API-Keys in OrganizationSettings
 *
 * @param settings - OrganizationSettings Objekt mit verschlüsselten Keys
 * @returns Settings mit entschlüsselten API-Keys
 */
const decryptApiSettings = (settings) => {
    var _a, _b, _c, _d, _e, _f;
    if (!settings || typeof settings !== 'object') {
        return settings;
    }
    const decrypted = Object.assign({}, settings);
    // LobbyPMS API Key
    if ((_a = decrypted.lobbyPms) === null || _a === void 0 ? void 0 : _a.apiKey) {
        try {
            // Prüfe ob Key verschlüsselt ist (Format: iv:authTag:encrypted)
            if (decrypted.lobbyPms.apiKey.includes(':')) {
                // Verschlüsselt - versuche zu entschlüsseln
                decrypted.lobbyPms = Object.assign(Object.assign({}, decrypted.lobbyPms), { apiKey: (0, exports.decryptSecret)(decrypted.lobbyPms.apiKey) });
            }
            // Wenn nicht verschlüsselt, bleibt der Key unverändert (für Migration)
        }
        catch (error) {
            logger_1.logger.error('Error decrypting LobbyPMS API key:', error);
            // Bei Fehler: Key bleibt wie er ist (verschlüsselt oder unverschlüsselt)
        }
    }
    // TTLock Client ID
    if ((_b = decrypted.doorSystem) === null || _b === void 0 ? void 0 : _b.clientId) {
        try {
            if (decrypted.doorSystem.clientId.includes(':')) {
                decrypted.doorSystem = Object.assign(Object.assign({}, decrypted.doorSystem), { clientId: (0, exports.decryptSecret)(decrypted.doorSystem.clientId) });
            }
        }
        catch (error) {
            logger_1.logger.error('Error decrypting TTLock client ID:', error);
        }
    }
    // TTLock Client Secret
    if ((_c = decrypted.doorSystem) === null || _c === void 0 ? void 0 : _c.clientSecret) {
        try {
            if (decrypted.doorSystem.clientSecret.includes(':')) {
                decrypted.doorSystem = Object.assign(Object.assign({}, decrypted.doorSystem), { clientSecret: (0, exports.decryptSecret)(decrypted.doorSystem.clientSecret) });
            }
        }
        catch (error) {
            logger_1.logger.error('Error decrypting TTLock client secret:', error);
        }
    }
    // Bold Payment API Key
    if ((_d = decrypted.boldPayment) === null || _d === void 0 ? void 0 : _d.apiKey) {
        try {
            decrypted.boldPayment = Object.assign(Object.assign({}, decrypted.boldPayment), { apiKey: (0, exports.decryptSecret)(decrypted.boldPayment.apiKey) });
        }
        catch (error) {
            logger_1.logger.error('Error decrypting Bold Payment API key:', error);
        }
    }
    // WhatsApp API Key & Secret
    if ((_e = decrypted.whatsapp) === null || _e === void 0 ? void 0 : _e.apiKey) {
        try {
            // Versuche immer zu entschlüsseln, wenn der String ein ':' enthält (verschlüsseltes Format)
            if (decrypted.whatsapp.apiKey.includes(':')) {
                const encryptedLength = decrypted.whatsapp.apiKey.length;
                const decryptedKey = (0, exports.decryptSecret)(decrypted.whatsapp.apiKey);
                logger_1.logger.log('[WhatsApp Token Debug] Entschlüsselung:', {
                    encryptedLength,
                    decryptedLength: decryptedKey.length,
                    decryptedStart: decryptedKey.substring(0, 30),
                    decryptedEnd: decryptedKey.substring(decryptedKey.length - 30),
                    containsColon: decryptedKey.includes(':'),
                    isValidFormat: /^[A-Za-z0-9]+$/.test(decryptedKey)
                });
                decrypted.whatsapp = Object.assign(Object.assign({}, decrypted.whatsapp), { apiKey: decryptedKey });
            }
            else {
                logger_1.logger.log('[WhatsApp Token Debug] Token ist bereits unverschlüsselt:', {
                    length: decrypted.whatsapp.apiKey.length,
                    start: decrypted.whatsapp.apiKey.substring(0, 30)
                });
            }
            // Wenn kein ':' vorhanden ist, ist der Token bereits unverschlüsselt (für Migration)
        }
        catch (error) {
            logger_1.logger.error('Error decrypting WhatsApp API key:', error);
            // Bei Fehler: Token ist möglicherweise bereits unverschlüsselt
            logger_1.logger.log('Token wird als unverschlüsselt behandelt');
            logger_1.logger.log('[WhatsApp Token Debug] Fehler beim Entschlüsseln - verwende Token wie er ist:', {
                length: decrypted.whatsapp.apiKey.length,
                start: decrypted.whatsapp.apiKey.substring(0, 50)
            });
        }
    }
    if ((_f = decrypted.whatsapp) === null || _f === void 0 ? void 0 : _f.apiSecret) {
        try {
            if (decrypted.whatsapp.apiSecret.includes(':')) {
                decrypted.whatsapp = Object.assign(Object.assign({}, decrypted.whatsapp), { apiSecret: (0, exports.decryptSecret)(decrypted.whatsapp.apiSecret) });
            }
        }
        catch (error) {
            logger_1.logger.error('Error decrypting WhatsApp API secret:', error);
        }
    }
    return decrypted;
};
exports.decryptApiSettings = decryptApiSettings;
/**
 * Verschlüsselt alle API-Keys in BranchSettings
 *
 * @param settings - BranchSettings Objekt (z.B. boldPaymentSettings, doorSystemSettings, etc.)
 * @returns Settings mit verschlüsselten API-Keys
 */
const encryptBranchApiSettings = (settings) => {
    var _a;
    if (!settings || typeof settings !== 'object') {
        return settings;
    }
    const encrypted = Object.assign({}, settings);
    // Bold Payment
    if (encrypted.apiKey && typeof encrypted.apiKey === 'string' && !encrypted.apiKey.includes(':')) {
        encrypted.apiKey = (0, exports.encryptSecret)(encrypted.apiKey);
    }
    if (encrypted.merchantId && typeof encrypted.merchantId === 'string' && !encrypted.merchantId.includes(':')) {
        encrypted.merchantId = (0, exports.encryptSecret)(encrypted.merchantId);
    }
    // TTLock
    if (encrypted.clientId && typeof encrypted.clientId === 'string' && !encrypted.clientId.includes(':')) {
        encrypted.clientId = (0, exports.encryptSecret)(encrypted.clientId);
    }
    if (encrypted.clientSecret && typeof encrypted.clientSecret === 'string' && !encrypted.clientSecret.includes(':')) {
        encrypted.clientSecret = (0, exports.encryptSecret)(encrypted.clientSecret);
    }
    if (encrypted.username && typeof encrypted.username === 'string' && !encrypted.username.includes(':')) {
        encrypted.username = (0, exports.encryptSecret)(encrypted.username);
    }
    if (encrypted.password && typeof encrypted.password === 'string' && !encrypted.password.includes(':')) {
        encrypted.password = (0, exports.encryptSecret)(encrypted.password);
    }
    // SIRE
    if (encrypted.apiKey && typeof encrypted.apiKey === 'string' && !encrypted.apiKey.includes(':')) {
        encrypted.apiKey = (0, exports.encryptSecret)(encrypted.apiKey);
    }
    if (encrypted.apiSecret && typeof encrypted.apiSecret === 'string' && !encrypted.apiSecret.includes(':')) {
        encrypted.apiSecret = (0, exports.encryptSecret)(encrypted.apiSecret);
    }
    // LobbyPMS
    if (encrypted.apiKey && typeof encrypted.apiKey === 'string' && !encrypted.apiKey.includes(':')) {
        encrypted.apiKey = (0, exports.encryptSecret)(encrypted.apiKey);
    }
    // WhatsApp (bereits in Branch.whatsappSettings)
    if (encrypted.apiKey && typeof encrypted.apiKey === 'string' && !encrypted.apiKey.includes(':')) {
        encrypted.apiKey = (0, exports.encryptSecret)(encrypted.apiKey);
    }
    if (encrypted.apiSecret && typeof encrypted.apiSecret === 'string' && !encrypted.apiSecret.includes(':')) {
        encrypted.apiSecret = (0, exports.encryptSecret)(encrypted.apiSecret);
    }
    // Email SMTP
    if (encrypted.smtpPass && typeof encrypted.smtpPass === 'string' && !encrypted.smtpPass.includes(':')) {
        encrypted.smtpPass = (0, exports.encryptSecret)(encrypted.smtpPass);
    }
    // Email IMAP (verschachtelt)
    if (((_a = encrypted.imap) === null || _a === void 0 ? void 0 : _a.password) && typeof encrypted.imap.password === 'string' && !encrypted.imap.password.includes(':')) {
        encrypted.imap = Object.assign(Object.assign({}, encrypted.imap), { password: (0, exports.encryptSecret)(encrypted.imap.password) });
    }
    return encrypted;
};
exports.encryptBranchApiSettings = encryptBranchApiSettings;
/**
 * Entschlüsselt alle API-Keys in BranchSettings
 *
 * @param settings - BranchSettings Objekt mit verschlüsselten Keys
 * @returns Settings mit entschlüsselten API-Keys
 */
const decryptBranchApiSettings = (settings) => {
    var _a;
    if (!settings || typeof settings !== 'object') {
        return settings;
    }
    const decrypted = Object.assign({}, settings);
    // Versuche alle möglichen verschlüsselten Felder zu entschlüsseln
    const encryptedFields = ['apiKey', 'apiSecret', 'merchantId', 'clientId', 'clientSecret', 'username', 'password', 'smtpPass'];
    for (const field of encryptedFields) {
        if (decrypted[field] && typeof decrypted[field] === 'string' && decrypted[field].includes(':')) {
            try {
                decrypted[field] = (0, exports.decryptSecret)(decrypted[field]);
            }
            catch (error) {
                logger_1.logger.error(`Error decrypting ${field}:`, error);
                // Bei Fehler: Feld bleibt wie es ist (verschlüsselter String bleibt erhalten)
                // WICHTIG: Der verschlüsselte Wert wird zurückgegeben, damit Frontend ihn anzeigen kann
            }
        }
    }
    // 2. NEU: Verschachtelte Settings entschlüsseln
    // Bold Payment - direkt auf oberster Ebene (nicht verschachtelt in boldPayment)
    // Die Felder sind direkt in decrypted: apiKey, merchantId, environment
    // (keine verschachtelte Struktur wie bei anderen Settings)
    // LobbyPMS
    if (decrypted.lobbyPms && typeof decrypted.lobbyPms === 'object') {
        if (decrypted.lobbyPms.apiKey && typeof decrypted.lobbyPms.apiKey === 'string' && decrypted.lobbyPms.apiKey.includes(':')) {
            try {
                decrypted.lobbyPms = Object.assign(Object.assign({}, decrypted.lobbyPms), { apiKey: (0, exports.decryptSecret)(decrypted.lobbyPms.apiKey) });
            }
            catch (error) {
                logger_1.logger.error('Error decrypting lobbyPms.apiKey:', error);
            }
        }
    }
    // TTLock/Door System
    if (decrypted.doorSystem && typeof decrypted.doorSystem === 'object') {
        const doorSystemFields = ['clientId', 'clientSecret', 'username', 'password'];
        for (const field of doorSystemFields) {
            if (decrypted.doorSystem[field] && typeof decrypted.doorSystem[field] === 'string' && decrypted.doorSystem[field].includes(':')) {
                try {
                    decrypted.doorSystem = Object.assign(Object.assign({}, decrypted.doorSystem), { [field]: (0, exports.decryptSecret)(decrypted.doorSystem[field]) });
                }
                catch (error) {
                    logger_1.logger.error(`Error decrypting doorSystem.${field}:`, error);
                }
            }
        }
    }
    // SIRE
    if (decrypted.sire && typeof decrypted.sire === 'object') {
        if (decrypted.sire.apiKey && typeof decrypted.sire.apiKey === 'string' && decrypted.sire.apiKey.includes(':')) {
            try {
                decrypted.sire = Object.assign(Object.assign({}, decrypted.sire), { apiKey: (0, exports.decryptSecret)(decrypted.sire.apiKey) });
            }
            catch (error) {
                logger_1.logger.error('Error decrypting sire.apiKey:', error);
            }
        }
        if (decrypted.sire.apiSecret && typeof decrypted.sire.apiSecret === 'string' && decrypted.sire.apiSecret.includes(':')) {
            try {
                decrypted.sire = Object.assign(Object.assign({}, decrypted.sire), { apiSecret: (0, exports.decryptSecret)(decrypted.sire.apiSecret) });
            }
            catch (error) {
                logger_1.logger.error('Error decrypting sire.apiSecret:', error);
            }
        }
    }
    // WhatsApp (verschachtelt in whatsappSettings)
    if (decrypted.whatsapp && typeof decrypted.whatsapp === 'object') {
        const whatsappUpdates = {};
        if (decrypted.whatsapp.apiKey && typeof decrypted.whatsapp.apiKey === 'string' && decrypted.whatsapp.apiKey.includes(':')) {
            try {
                const encryptedLength = decrypted.whatsapp.apiKey.length;
                const decryptedKey = (0, exports.decryptSecret)(decrypted.whatsapp.apiKey);
                logger_1.logger.log('[WhatsApp Token Debug] Branch Settings Entschlüsselung:', {
                    encryptedLength,
                    decryptedLength: decryptedKey.length,
                    decryptedStart: decryptedKey.substring(0, 30),
                    decryptedEnd: decryptedKey.substring(decryptedKey.length - 30),
                    containsColon: decryptedKey.includes(':'),
                    isValidFormat: /^[A-Za-z0-9]+$/.test(decryptedKey)
                });
                whatsappUpdates.apiKey = decryptedKey;
            }
            catch (error) {
                logger_1.logger.error('Error decrypting whatsapp.apiKey:', error);
            }
        }
        if (decrypted.whatsapp.apiSecret && typeof decrypted.whatsapp.apiSecret === 'string' && decrypted.whatsapp.apiSecret.includes(':')) {
            try {
                whatsappUpdates.apiSecret = (0, exports.decryptSecret)(decrypted.whatsapp.apiSecret);
            }
            catch (error) {
                logger_1.logger.error('Error decrypting whatsapp.apiSecret:', error);
            }
        }
        if (Object.keys(whatsappUpdates).length > 0) {
            decrypted.whatsapp = Object.assign(Object.assign({}, decrypted.whatsapp), whatsappUpdates);
        }
    }
    // Email Settings (verschachtelt in emailSettings)
    if (decrypted.email && typeof decrypted.email === 'object') {
        const emailUpdates = {};
        if (decrypted.email.smtpPass && typeof decrypted.email.smtpPass === 'string' && decrypted.email.smtpPass.includes(':')) {
            try {
                emailUpdates.smtpPass = (0, exports.decryptSecret)(decrypted.email.smtpPass);
            }
            catch (error) {
                logger_1.logger.error('Error decrypting email.smtpPass:', error);
            }
        }
        if (Object.keys(emailUpdates).length > 0) {
            decrypted.email = Object.assign(Object.assign({}, decrypted.email), emailUpdates);
        }
    }
    // Email IMAP Password (verschachtelt)
    if (((_a = decrypted.imap) === null || _a === void 0 ? void 0 : _a.password) && typeof decrypted.imap.password === 'string' && decrypted.imap.password.includes(':')) {
        try {
            decrypted.imap = Object.assign(Object.assign({}, decrypted.imap), { password: (0, exports.decryptSecret)(decrypted.imap.password) });
        }
        catch (error) {
            logger_1.logger.error('Error decrypting imap.password:', error);
        }
    }
    return decrypted;
};
exports.decryptBranchApiSettings = decryptBranchApiSettings;
//# sourceMappingURL=encryption.js.map