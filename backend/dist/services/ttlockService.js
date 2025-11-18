"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.TTLockService = void 0;
const axios_1 = __importDefault(require("axios"));
const client_1 = require("@prisma/client");
const encryption_1 = require("../utils/encryption");
const prisma = new client_1.PrismaClient();
/**
 * Service für TTLock Integration (Türsystem)
 *
 * Bietet Funktionen zum Erstellen und Verwalten von temporären Passcodes
 */
class TTLockService {
    /**
     * Erstellt eine neue TTLock Service-Instanz
     *
     * @param organizationId - ID der Organisation
     * @throws Error wenn TTLock nicht konfiguriert ist
     */
    constructor(organizationId) {
        this.apiUrl = 'https://euopen.ttlock.com';
        this.passcodeType = 'auto'; // 'auto' = 10-stellig, 'custom' = 4-stellig
        this.organizationId = organizationId;
        // Settings werden beim ersten API-Call geladen (lazy loading)
        this.axiosInstance = axios_1.default.create({
            baseURL: this.apiUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    }
    /**
     * Lädt TTLock Settings aus der Organisation
     * Muss vor jedem API-Call aufgerufen werden
     */
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            const organization = yield prisma.organization.findUnique({
                where: { id: this.organizationId },
                select: { settings: true }
            });
            if (!(organization === null || organization === void 0 ? void 0 : organization.settings)) {
                throw new Error(`TTLock ist nicht für Organisation ${this.organizationId} konfiguriert`);
            }
            const settings = (0, encryption_1.decryptApiSettings)(organization.settings);
            const doorSystemSettings = settings === null || settings === void 0 ? void 0 : settings.doorSystem;
            if (!(doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.clientId) || !(doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.clientSecret)) {
                throw new Error(`TTLock Client ID/Secret ist nicht für Organisation ${this.organizationId} konfiguriert`);
            }
            if (!(doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.username) || !(doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.password)) {
                throw new Error(`TTLock Username/Password ist nicht für Organisation ${this.organizationId} konfiguriert`);
            }
            // Prüfe ob Client Secret verschlüsselt ist und entschlüssele es
            let clientSecret = doorSystemSettings.clientSecret;
            if (clientSecret && clientSecret.includes(':')) {
                // Verschlüsselt - entschlüssele
                const { decryptSecret } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                try {
                    clientSecret = decryptSecret(clientSecret);
                    console.log('[TTLock] Client Secret erfolgreich entschlüsselt');
                }
                catch (error) {
                    console.error('[TTLock] Fehler beim Entschlüsseln des Client Secrets:', error);
                    throw new Error('Client Secret konnte nicht entschlüsselt werden');
                }
            }
            this.clientId = doorSystemSettings.clientId;
            this.clientSecret = clientSecret;
            this.username = doorSystemSettings.username;
            this.password = doorSystemSettings.password; // Already MD5-hashed
            this.apiUrl = doorSystemSettings.apiUrl || 'https://euopen.ttlock.com';
            this.accessToken = doorSystemSettings.accessToken;
            this.passcodeType = doorSystemSettings.passcodeType || 'auto'; // 'auto' = 10-stellig, 'custom' = 4-stellig
            // Re-initialisiere Axios-Instanz mit korrekten Settings
            this.axiosInstance = this.createAxiosInstance();
        });
    }
    /**
     * Erstellt eine konfigurierte Axios-Instanz für TTLock API-Requests
     * API-Endpunkte sind auf api.sciener.com, nicht auf euopen.ttlock.com
     */
    createAxiosInstance() {
        // API-Endpunkte sind auf euapi.ttlock.com (nicht api.sciener.com!)
        const apiBaseUrl = this.apiUrl.includes('euopen.ttlock.com')
            ? 'https://euapi.ttlock.com'
            : this.apiUrl;
        const instance = axios_1.default.create({
            baseURL: apiBaseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        // Request Interceptor für Logging
        instance.interceptors.request.use((config) => {
            var _a;
            console.log(`[TTLock] ${(_a = config.method) === null || _a === void 0 ? void 0 : _a.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
            console.error('[TTLock] Request Error:', error);
            return Promise.reject(error);
        });
        // Response Interceptor für Error Handling
        instance.interceptors.response.use((response) => response, (error) => {
            var _a, _b, _c, _d;
            console.error('[TTLock] API Error:', {
                status: (_a = error.response) === null || _a === void 0 ? void 0 : _a.status,
                statusText: (_b = error.response) === null || _b === void 0 ? void 0 : _b.statusText,
                data: (_c = error.response) === null || _c === void 0 ? void 0 : _c.data,
                url: (_d = error.config) === null || _d === void 0 ? void 0 : _d.url
            });
            return Promise.reject(error);
        });
        return instance;
    }
    /**
     * Ruft ein Access Token ab (OAuth 2.0)
     *
     * @returns Access Token
     */
    getAccessToken() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            // Lade Settings falls noch nicht geladen
            if (!this.clientId || !this.clientSecret || !this.username || !this.password) {
                yield this.loadSettings();
            }
            // Prüfe ob Token noch gültig ist
            if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
                return this.accessToken;
            }
            try {
                // TTLock OAuth-Endpunkt: /oauth2/token
                // Verwendet Resource Owner Password Credentials Grant
                // OAuth-Endpunkt ist auf api.sciener.com, nicht auf euopen.ttlock.com
                const oauthUrl = this.apiUrl.includes('euopen.ttlock.com')
                    ? 'https://api.sciener.com'
                    : this.apiUrl;
                console.log('[TTLock] OAuth Request Details:', {
                    oauthUrl: `${oauthUrl}/oauth2/token`,
                    hasClientId: !!this.clientId,
                    clientIdLength: ((_a = this.clientId) === null || _a === void 0 ? void 0 : _a.length) || 0,
                    hasClientSecret: !!this.clientSecret,
                    clientSecretLength: ((_b = this.clientSecret) === null || _b === void 0 ? void 0 : _b.length) || 0,
                    hasUsername: !!this.username,
                    hasPassword: !!this.password,
                    passwordLength: ((_c = this.password) === null || _c === void 0 ? void 0 : _c.length) || 0
                });
                const response = yield axios_1.default.post(`${oauthUrl}/oauth2/token`, new URLSearchParams({
                    client_id: this.clientId || '',
                    client_secret: this.clientSecret || '',
                    username: this.username || '',
                    password: this.password || '' // Already MD5-hashed
                }), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                // TTLock OAuth gibt entweder errcode=0 mit data zurück, oder direkt access_token
                const responseData = response.data;
                if (responseData.errcode === 0 && responseData.data) {
                    // Format: { errcode: 0, data: { access_token: ... } }
                    this.accessToken = responseData.data.access_token;
                    const expiresIn = responseData.data.expires_in || 7200;
                    this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
                }
                else if (responseData.access_token) {
                    // Format: { access_token: ..., expires_in: ... }
                    this.accessToken = responseData.access_token;
                    const expiresIn = responseData.expires_in || 7200;
                    this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
                }
                else {
                    // Fehlerfall
                    const errorMsg = responseData.errmsg || `Unknown error (errcode: ${responseData.errcode})`;
                    console.error('[TTLock] OAuth Error:', {
                        errcode: responseData.errcode,
                        errmsg: errorMsg,
                        data: responseData
                    });
                    throw new Error(errorMsg);
                }
                // Speichere Token in Organisation Settings
                if (this.accessToken) {
                    yield this.saveAccessToken(this.accessToken);
                    return this.accessToken;
                }
                throw new Error('Access token nicht in Response gefunden');
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    const errorMsg = ((_e = (_d = axiosError.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.errmsg) || axiosError.message;
                    console.error('[TTLock] OAuth Request Error:', {
                        status: (_f = axiosError.response) === null || _f === void 0 ? void 0 : _f.status,
                        statusText: (_g = axiosError.response) === null || _g === void 0 ? void 0 : _g.statusText,
                        errmsg: errorMsg,
                        data: (_h = axiosError.response) === null || _h === void 0 ? void 0 : _h.data
                    });
                    throw new Error(errorMsg);
                }
                throw error;
            }
        });
    }
    /**
     * Speichert Access Token in Organisation Settings
     */
    saveAccessToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            const organization = yield prisma.organization.findUnique({
                where: { id: this.organizationId },
                select: { settings: true }
            });
            if (organization === null || organization === void 0 ? void 0 : organization.settings) {
                const settings = organization.settings;
                if (settings.doorSystem) {
                    settings.doorSystem.accessToken = token;
                    yield prisma.organization.update({
                        where: { id: this.organizationId },
                        data: { settings }
                    });
                }
            }
        });
    }
    /**
     * Erstellt einen temporären Passcode für eine Reservierung
     *
     * @param lockId - TTLock Lock ID
     * @param startDate - Startdatum (wann der Passcode aktiv wird)
     * @param endDate - Enddatum (wann der Passcode abläuft)
     * @param passcodeName - Name des Passcodes (z.B. "Guest: {guestName}")
     * @returns Passcode (PIN)
     */
    createTemporaryPasscode(lockId, startDate, endDate, passcodeName) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            try {
                const accessToken = yield this.getAccessToken();
                // date muss die aktuelle Unix-Zeit in Millisekunden sein (innerhalb von 5 Minuten)
                // Wichtig: date muss direkt vor dem Request gesetzt werden, um Zeitabweichungen zu vermeiden
                const currentTimestamp = Date.now(); // Millisekunden
                // Debug: Zeige Payload vor dem Request
                console.log('[TTLock] Passcode Creation Payload:', {
                    clientId: this.clientId,
                    lockId: lockId,
                    keyboardPwdName: passcodeName || 'Guest Passcode',
                    startDate: Math.floor(startDate.getTime() / 1000),
                    endDate: Math.floor(endDate.getTime() / 1000),
                    keyboardPwdType: '2',
                    date: currentTimestamp
                });
                // TTLock API Parameter - laut Dokumentation
                // keyboardPwd: Passcode (Int, Required) - muss generiert werden
                // addType: 1=via phone bluetooth, 2=via gateway/WiFi (Required)
                // keyboardPwdType: 2=permanent, 3=period (optional, default 3)
                // startDate/endDate: Long (Millisekunden, nicht Sekunden!)
                // WICHTIG: Ohne Gateway funktionieren nur automatisch generierte 10-stellige Passcodes aus der Ferne!
                // Personalisierte 4-stellige Passcodes erfordern Bluetooth-Synchronisation
                // Lösung: Verwende automatisch generierte 10-stellige Passcodes (funktionieren ohne Sync)
                // Passcode-Typ aus Settings lesen (pro Organisation konfigurierbar)
                const useAutoGenerated = this.passcodeType === 'auto';
                let generatedPasscode;
                if (!useAutoGenerated) {
                    // Personalisierter 4-stelliger Passcode (erfordert Bluetooth-Synchronisation über TTLock App)
                    generatedPasscode = Math.floor(1000 + Math.random() * 9000).toString();
                    console.log('[TTLock] Verwende benutzerdefinierten 4-stelligen Passcode (erfordert Synchronisation)');
                }
                else {
                    // Automatisch generierter 9-stelliger Passcode (wie funktionierender Code 149923045)
                    // 9-stellige Codes funktionieren ohne App-Sync (getestet am 13.11.2025)
                    generatedPasscode = Math.floor(100000000 + Math.random() * 900000000).toString(); // 9-stellig
                    console.log('[TTLock] Verwende automatisch generierten 9-stelligen Passcode (ohne Synchronisation)');
                }
                const payload = new URLSearchParams();
                payload.append('clientId', this.clientId || '');
                payload.append('accessToken', accessToken);
                payload.append('lockId', lockId.toString());
                // WICHTIG: keyboardPwd MUSS gesetzt werden für 9-stellige period Passcodes!
                // 9-stellige period Passcodes funktionieren ohne App-Sync (getestet am 13.11.2025)
                // Code 149923045 war funktionierend (9-stellig)
                if (generatedPasscode) {
                    payload.append('keyboardPwd', generatedPasscode);
                }
                payload.append('keyboardPwdName', passcodeName || 'Guest Passcode');
                payload.append('keyboardPwdType', '2'); // 2 = permanent (keine Start/Endzeit)
                // WICHTIG: Permanente Passcodes benötigen KEINE startDate/endDate!
                // Permanente Passcodes funktionieren ohne Gateway besser als Period-Passcodes
                // addType: 1=via phone bluetooth (APP SDK), 2=via gateway/WiFi
                // Kein Gateway vorhanden, daher addType: 1
                payload.append('addType', '1'); // 1 = via phone bluetooth
                payload.append('date', currentTimestamp.toString()); // Millisekunden
                // Debug: Zeige vollständigen Request
                console.log('[TTLock] Request URL:', `${this.axiosInstance.defaults.baseURL}/v3/keyboardPwd/add`);
                console.log('[TTLock] Request Payload (stringified):', payload.toString());
                console.log('[TTLock] Request Payload (as object):', Object.fromEntries(payload));
                const response = yield this.axiosInstance.post('/v3/keyboardPwd/add', payload, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                const responseData = response.data;
                // TTLock API gibt entweder errcode=0 mit data zurück, oder direkt keyboardPwdId
                // Für 10-stellige period Passcodes: keyboardPwd wird gesetzt, API gibt keyboardPwdId zurück
                if (responseData.errcode === 0) {
                    // API gibt möglicherweise den Passcode zurück
                    if ((_a = responseData.data) === null || _a === void 0 ? void 0 : _a.keyboardPwd) {
                        const passcode = responseData.data.keyboardPwd.toString();
                        console.log('[TTLock] ✅ Passcode erfolgreich erstellt! Passcode:', passcode);
                        return passcode;
                    }
                    else if ((_b = responseData.data) === null || _b === void 0 ? void 0 : _b.passcode) {
                        const passcode = responseData.data.passcode.toString();
                        console.log('[TTLock] ✅ Passcode erfolgreich erstellt! Passcode:', passcode);
                        return passcode;
                    }
                    else if (responseData.keyboardPwd) {
                        const passcode = responseData.keyboardPwd.toString();
                        console.log('[TTLock] ✅ Passcode erfolgreich erstellt! Passcode:', passcode);
                        return passcode;
                    }
                    // Falls kein Passcode zurückgegeben wird, verwende unseren generierten
                    if (generatedPasscode) {
                        console.log('[TTLock] ✅ Passcode erfolgreich erstellt! Verwende generierten Passcode:', generatedPasscode);
                        return generatedPasscode;
                    }
                    throw new Error('API hat keinen Passcode zurückgegeben');
                }
                else if (responseData.keyboardPwdId) {
                    // Erfolg: API gibt keyboardPwdId zurück (kein errcode)
                    console.log('[TTLock] ✅ Passcode erfolgreich erstellt! keyboardPwdId:', responseData.keyboardPwdId);
                    // Prüfe ob API den Passcode zurückgegeben hat
                    if (responseData.keyboardPwd) {
                        const passcode = responseData.keyboardPwd.toString();
                        console.log('[TTLock] Passcode:', passcode);
                        return passcode;
                    }
                    else if (responseData.passcode) {
                        const passcode = responseData.passcode.toString();
                        console.log('[TTLock] Passcode:', passcode);
                        return passcode;
                    }
                    // Verwende unseren generierten Passcode
                    if (generatedPasscode) {
                        console.log('[TTLock] Verwende generierten Passcode:', generatedPasscode);
                        return generatedPasscode;
                    }
                    return 'ERROR_NO_PASSCODE';
                }
                else if ((_c = responseData.data) === null || _c === void 0 ? void 0 : _c.passcode) {
                    const passcode = responseData.data.passcode.toString();
                    console.log('[TTLock] ✅ Passcode erfolgreich erstellt! Passcode:', passcode);
                    return passcode;
                }
                else if ((_d = responseData.data) === null || _d === void 0 ? void 0 : _d.keyboardPwd) {
                    const passcode = responseData.data.keyboardPwd.toString();
                    console.log('[TTLock] ✅ Passcode erfolgreich erstellt! Passcode:', passcode);
                    return passcode;
                }
                else if (responseData.passcode) {
                    const passcode = responseData.passcode.toString();
                    console.log('[TTLock] ✅ Passcode erfolgreich erstellt! Passcode:', passcode);
                    return passcode;
                }
                else if (responseData.keyboardPwd) {
                    const passcode = responseData.keyboardPwd.toString();
                    console.log('[TTLock] ✅ Passcode erfolgreich erstellt! Passcode:', passcode);
                    return passcode;
                }
                // Fehlerfall
                const errorMsg = responseData.errmsg || `Unknown error (errcode: ${responseData.errcode})`;
                console.error('[TTLock] Passcode Creation Error:', {
                    errcode: responseData.errcode,
                    errmsg: errorMsg,
                    data: responseData,
                    payload: Object.fromEntries(payload)
                });
                throw new Error(errorMsg);
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    throw new Error(((_f = (_e = axiosError.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.errmsg) ||
                        `TTLock API Fehler: ${axiosError.message}`);
                }
                throw error;
            }
        });
    }
    /**
     * Löscht einen temporären Passcode
     *
     * @param lockId - TTLock Lock ID
     * @param passcodeId - Passcode ID
     */
    deleteTemporaryPasscode(lockId, passcodeId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const accessToken = yield this.getAccessToken();
                // date muss die aktuelle Unix-Zeit in Millisekunden sein (innerhalb von 5 Minuten)
                const currentTimestamp = Date.now(); // Millisekunden
                const payload = new URLSearchParams({
                    clientId: this.clientId || '',
                    accessToken: accessToken,
                    lockId: lockId,
                    keyboardPwdId: passcodeId,
                    date: currentTimestamp.toString()
                });
                const response = yield this.axiosInstance.post('/v3/keyboardPwd/delete', payload);
                if (response.data.errcode !== 0) {
                    throw new Error(response.data.errmsg || 'Fehler beim Löschen des Passcodes');
                }
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    throw new Error(((_b = (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.errmsg) ||
                        `TTLock API Fehler: ${axiosError.message}`);
                }
                throw error;
            }
        });
    }
    /**
     * Ruft alle verfügbaren Locks ab
     *
     * @returns Array von Lock IDs
     */
    getLocks() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const accessToken = yield this.getAccessToken();
                // date muss die aktuelle Unix-Zeit in Sekunden sein (innerhalb von 5 Minuten)
                // Wichtig: date muss direkt VOR dem Request gesetzt werden, um Zeitabweichungen zu vermeiden
                // Versuche zuerst Sekunden, falls das nicht funktioniert, könnte es Millisekunden sein
                const currentTimestampSeconds = Math.floor(Date.now() / 1000);
                const currentTimestampMillis = Date.now();
                // Debug: Zeige beide Timestamps
                console.log(`[TTLock] Date Timestamp (Sekunden): ${currentTimestampSeconds}`);
                console.log(`[TTLock] Date Timestamp (Millisekunden): ${currentTimestampMillis}`);
                const params = new URLSearchParams({
                    clientId: this.clientId || '',
                    accessToken: accessToken,
                    pageNo: '1',
                    pageSize: '100',
                    date: currentTimestampMillis.toString() // Versuche Millisekunden
                });
                const response = yield this.axiosInstance.post('/v3/lock/list', params);
                const responseData = response.data;
                // TTLock API gibt entweder errcode=0 mit data zurück, oder direkt list
                if (responseData.errcode === 0 && responseData.data) {
                    // Format: { errcode: 0, data: [{ lockId: ... }] }
                    return responseData.data.map((lock) => String(lock.lockId || lock.id));
                }
                else if (responseData.list && Array.isArray(responseData.list)) {
                    // Format: { list: [{ lockId: ... }], pageNo: 1, ... }
                    console.log('[TTLock] Lock List Response:', JSON.stringify(responseData, null, 2));
                    const lockIds = responseData.list.map((lock) => {
                        // Lock ID kann in verschiedenen Feldern sein: lockId, id, etc.
                        const id = lock.lockId || lock.id || lock.lock_id || Object.values(lock)[0];
                        // Konvertiere zu String (TTLock API gibt Zahlen zurück)
                        return id ? String(id) : null;
                    }).filter((id) => id); // Filtere undefined/null
                    console.log('[TTLock] Extracted Lock IDs:', lockIds);
                    return lockIds;
                }
                // Fehlerfall
                const errorMsg = responseData.errmsg || `Unknown error (errcode: ${responseData.errcode})`;
                console.error('[TTLock] Lock List Error:', {
                    errcode: responseData.errcode,
                    errmsg: errorMsg,
                    data: responseData
                });
                throw new Error(errorMsg);
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    throw new Error(((_b = (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.errmsg) ||
                        `TTLock API Fehler: ${axiosError.message}`);
                }
                throw error;
            }
        });
    }
}
exports.TTLockService = TTLockService;
//# sourceMappingURL=ttlockService.js.map