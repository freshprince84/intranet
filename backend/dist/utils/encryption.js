"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptApiSettings = exports.encryptApiSettings = exports.decryptSecret = exports.encryptSecret = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Verschlüsselungs-Utility für sensitive Daten (API-Keys, Secrets)
 *
 * Verwendet AES-256-GCM für sichere Verschlüsselung mit Authentifizierung
 *
 * WICHTIG: ENCRYPTION_KEY muss in .env gesetzt sein:
 * ENCRYPTION_KEY=<64 hex characters> (32 bytes = 256 bits)
 *
 * Generierung: node -e "console.log(crypto.randomBytes(32).toString('hex'))"
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
        console.error('Error encrypting secret:', error);
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
        console.error('Error decrypting secret:', error);
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
    var _a, _b, _c, _d, _e, _f, _g;
    if (!settings || typeof settings !== 'object') {
        return settings;
    }
    const encrypted = Object.assign({}, settings);
    // LobbyPMS API Key
    if ((_a = encrypted.lobbyPms) === null || _a === void 0 ? void 0 : _a.apiKey) {
        encrypted.lobbyPms = Object.assign(Object.assign({}, encrypted.lobbyPms), { apiKey: (0, exports.encryptSecret)(encrypted.lobbyPms.apiKey) });
    }
    // TTLock Client Secret
    if ((_b = encrypted.doorSystem) === null || _b === void 0 ? void 0 : _b.clientSecret) {
        encrypted.doorSystem = Object.assign(Object.assign({}, encrypted.doorSystem), { clientSecret: (0, exports.encryptSecret)(encrypted.doorSystem.clientSecret) });
    }
    // SIRE API Key & Secret
    if ((_c = encrypted.sire) === null || _c === void 0 ? void 0 : _c.apiKey) {
        encrypted.sire = Object.assign(Object.assign({}, encrypted.sire), { apiKey: (0, exports.encryptSecret)(encrypted.sire.apiKey) });
    }
    if ((_d = encrypted.sire) === null || _d === void 0 ? void 0 : _d.apiSecret) {
        encrypted.sire = Object.assign(Object.assign({}, encrypted.sire), { apiSecret: (0, exports.encryptSecret)(encrypted.sire.apiSecret) });
    }
    // Bold Payment API Key
    if ((_e = encrypted.boldPayment) === null || _e === void 0 ? void 0 : _e.apiKey) {
        encrypted.boldPayment = Object.assign(Object.assign({}, encrypted.boldPayment), { apiKey: (0, exports.encryptSecret)(encrypted.boldPayment.apiKey) });
    }
    // WhatsApp API Key & Secret
    if ((_f = encrypted.whatsapp) === null || _f === void 0 ? void 0 : _f.apiKey) {
        encrypted.whatsapp = Object.assign(Object.assign({}, encrypted.whatsapp), { apiKey: (0, exports.encryptSecret)(encrypted.whatsapp.apiKey) });
    }
    if ((_g = encrypted.whatsapp) === null || _g === void 0 ? void 0 : _g.apiSecret) {
        encrypted.whatsapp = Object.assign(Object.assign({}, encrypted.whatsapp), { apiSecret: (0, exports.encryptSecret)(encrypted.whatsapp.apiSecret) });
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
    var _a, _b, _c, _d, _e, _f, _g, _h;
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
            console.error('Error decrypting LobbyPMS API key:', error);
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
            console.error('Error decrypting TTLock client ID:', error);
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
            console.error('Error decrypting TTLock client secret:', error);
        }
    }
    // SIRE API Key & Secret
    if ((_d = decrypted.sire) === null || _d === void 0 ? void 0 : _d.apiKey) {
        try {
            decrypted.sire = Object.assign(Object.assign({}, decrypted.sire), { apiKey: (0, exports.decryptSecret)(decrypted.sire.apiKey) });
        }
        catch (error) {
            console.error('Error decrypting SIRE API key:', error);
        }
    }
    if ((_e = decrypted.sire) === null || _e === void 0 ? void 0 : _e.apiSecret) {
        try {
            decrypted.sire = Object.assign(Object.assign({}, decrypted.sire), { apiSecret: (0, exports.decryptSecret)(decrypted.sire.apiSecret) });
        }
        catch (error) {
            console.error('Error decrypting SIRE API secret:', error);
        }
    }
    // Bold Payment API Key
    if ((_f = decrypted.boldPayment) === null || _f === void 0 ? void 0 : _f.apiKey) {
        try {
            decrypted.boldPayment = Object.assign(Object.assign({}, decrypted.boldPayment), { apiKey: (0, exports.decryptSecret)(decrypted.boldPayment.apiKey) });
        }
        catch (error) {
            console.error('Error decrypting Bold Payment API key:', error);
        }
    }
    // WhatsApp API Key & Secret
    if ((_g = decrypted.whatsapp) === null || _g === void 0 ? void 0 : _g.apiKey) {
        try {
            // Versuche immer zu entschlüsseln, wenn der String ein ':' enthält (verschlüsseltes Format)
            if (decrypted.whatsapp.apiKey.includes(':')) {
                decrypted.whatsapp = Object.assign(Object.assign({}, decrypted.whatsapp), { apiKey: (0, exports.decryptSecret)(decrypted.whatsapp.apiKey) });
            }
            // Wenn kein ':' vorhanden ist, ist der Token bereits unverschlüsselt (für Migration)
        }
        catch (error) {
            console.error('Error decrypting WhatsApp API key:', error);
            // Bei Fehler: Token ist möglicherweise bereits unverschlüsselt
            console.log('Token wird als unverschlüsselt behandelt');
        }
    }
    if ((_h = decrypted.whatsapp) === null || _h === void 0 ? void 0 : _h.apiSecret) {
        try {
            if (decrypted.whatsapp.apiSecret.includes(':')) {
                decrypted.whatsapp = Object.assign(Object.assign({}, decrypted.whatsapp), { apiSecret: (0, exports.decryptSecret)(decrypted.whatsapp.apiSecret) });
            }
        }
        catch (error) {
            console.error('Error decrypting WhatsApp API secret:', error);
        }
    }
    return decrypted;
};
exports.decryptApiSettings = decryptApiSettings;
//# sourceMappingURL=encryption.js.map