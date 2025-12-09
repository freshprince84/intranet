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
const encryption_1 = require("../utils/encryption");
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
/**
 * Service für TTLock Integration (Türsystem)
 *
 * Bietet Funktionen zum Erstellen und Verwalten von temporären Passcodes
 */
class TTLockService {
    /**
     * Erstellt eine neue TTLock Service-Instanz
     *
     * @param organizationId - ID der Organisation (optional, wenn branchId gesetzt)
     * @param branchId - ID des Branches (optional, wenn organizationId gesetzt)
     * @throws Error wenn weder organizationId noch branchId angegeben ist
     */
    constructor(organizationId, branchId) {
        this.apiUrl = 'https://euopen.ttlock.com';
        this.passcodeType = 'auto'; // 'auto' = 10-stellig, 'custom' = 4-stellig
        if (!organizationId && !branchId) {
            throw new Error('Entweder organizationId oder branchId muss angegeben werden');
        }
        this.organizationId = organizationId;
        this.branchId = branchId;
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
     * Lädt TTLock Settings aus Branch oder Organisation (mit Fallback)
     * Muss vor jedem API-Call aufgerufen werden
     */
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Versuche Branch Settings zu laden (wenn branchId gesetzt)
            if (this.branchId) {
                const branch = yield prisma_1.prisma.branch.findUnique({
                    where: { id: this.branchId },
                    select: {
                        doorSystemSettings: true,
                        organizationId: true
                    }
                });
                if (branch === null || branch === void 0 ? void 0 : branch.doorSystemSettings) {
                    try {
                        const settings = (0, encryption_1.decryptBranchApiSettings)(branch.doorSystemSettings);
                        const doorSystemSettings = (settings === null || settings === void 0 ? void 0 : settings.doorSystem) || settings;
                        if ((doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.clientId) && (doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.clientSecret) &&
                            (doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.username) && (doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.password)) {
                            // Prüfe ob Client Secret verschlüsselt ist und entschlüssele es
                            let clientSecret = doorSystemSettings.clientSecret;
                            if (clientSecret && clientSecret.includes(':')) {
                                const { decryptSecret } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                                try {
                                    clientSecret = decryptSecret(clientSecret);
                                    logger_1.logger.log('[TTLock] Client Secret erfolgreich entschlüsselt');
                                }
                                catch (error) {
                                    logger_1.logger.error('[TTLock] Fehler beim Entschlüsseln des Client Secrets:', error);
                                    throw new Error('Client Secret konnte nicht entschlüsselt werden');
                                }
                            }
                            this.clientId = doorSystemSettings.clientId;
                            this.clientSecret = clientSecret;
                            this.username = doorSystemSettings.username;
                            this.password = doorSystemSettings.password;
                            this.apiUrl = doorSystemSettings.apiUrl || 'https://euopen.ttlock.com';
                            this.accessToken = doorSystemSettings.accessToken;
                            this.passcodeType = doorSystemSettings.passcodeType || 'auto';
                            this.axiosInstance = this.createAxiosInstance();
                            logger_1.logger.log(`[TTLock] Verwende Branch-spezifische Settings für Branch ${this.branchId}`);
                            return; // Erfolgreich geladen
                        }
                    }
                    catch (error) {
                        logger_1.logger.warn(`[TTLock] Fehler beim Laden der Branch Settings:`, error);
                        // Fallback auf Organization Settings
                    }
                    // Fallback: Lade Organization Settings
                    if (branch.organizationId) {
                        this.organizationId = branch.organizationId;
                    }
                }
                else if (branch === null || branch === void 0 ? void 0 : branch.organizationId) {
                    // Branch hat keine Settings, aber Organization ID
                    this.organizationId = branch.organizationId;
                }
            }
            // 2. Lade Organization Settings (Fallback oder wenn nur organizationId)
            if (this.organizationId) {
                const organization = yield prisma_1.prisma.organization.findUnique({
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
                        logger_1.logger.log('[TTLock] Client Secret erfolgreich entschlüsselt');
                    }
                    catch (error) {
                        logger_1.logger.error('[TTLock] Fehler beim Entschlüsseln des Client Secrets:', error);
                        throw new Error('Client Secret konnte nicht entschlüsselt werden');
                    }
                }
                this.clientId = doorSystemSettings.clientId;
                this.clientSecret = clientSecret;
                this.username = doorSystemSettings.username;
                this.password = doorSystemSettings.password; // Already MD5-hashed
                this.apiUrl = doorSystemSettings.apiUrl || 'https://euopen.ttlock.com';
                this.accessToken = doorSystemSettings.accessToken;
                this.passcodeType = doorSystemSettings.passcodeType || 'auto';
                this.axiosInstance = this.createAxiosInstance();
                return;
            }
            throw new Error('TTLock Settings nicht gefunden (weder Branch noch Organization)');
        });
    }
    /**
     * Statische Factory-Methode: Erstellt Service für Branch
     *
     * @param branchId - ID des Branches
     * @returns TTLockService-Instanz
     */
    static createForBranch(branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            const service = new TTLockService(undefined, branchId);
            yield service.loadSettings();
            return service;
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
            logger_1.logger.log(`[TTLock] ${(_a = config.method) === null || _a === void 0 ? void 0 : _a.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
            logger_1.logger.error('[TTLock] Request Error:', error);
            return Promise.reject(error);
        });
        // Response Interceptor für Error Handling
        instance.interceptors.response.use((response) => response, (error) => {
            var _a, _b, _c, _d;
            logger_1.logger.error('[TTLock] API Error:', {
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
            // WICHTIG: loadSettings() muss IMMER aufgerufen werden, um createAxiosInstance() aufzurufen
            // Auch wenn clientId bereits gesetzt ist, muss die Axios-Instance mit Interceptor erstellt werden
            if (!this.clientId || !this.clientSecret || !this.username || !this.password || !this.apiUrl || this.apiUrl === 'https://euopen.ttlock.com') {
                yield this.loadSettings();
            }
            // KRITISCH: Stelle sicher, dass axiosInstance den Interceptor hat
            // Prüfe ob axiosInstance bereits den Interceptor hat (durch createAxiosInstance erstellt)
            // Wenn nicht, erstelle sie neu
            if (!this.axiosInstance || !this.apiUrl || this.apiUrl === 'https://euopen.ttlock.com') {
                // Axios-Instance wurde noch nicht mit Interceptor erstellt
                // Lade Settings erneut, um createAxiosInstance() aufzurufen
                yield this.loadSettings();
            }
            // Prüfe ob Token vorhanden ist
            // WICHTIG: TTLock Access Token ist unbefristet (hat kein Ablaufdatum)
            // Wenn Token vorhanden ist, verwende ihn, auch wenn tokenExpiresAt fehlt
            if (this.accessToken) {
                // Wenn tokenExpiresAt gesetzt ist und noch gültig, verwende Token
                if (this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
                    return this.accessToken;
                }
                // Wenn tokenExpiresAt fehlt (z.B. nach Service-Restart), verwende Token trotzdem
                // Der Token ist unbefristet, daher ist keine Expiration-Prüfung nötig
                if (!this.tokenExpiresAt) {
                    logger_1.logger.log('[TTLock] Verwende gespeicherten Access Token (unbefristet, tokenExpiresAt fehlt)');
                    return this.accessToken;
                }
                // Wenn tokenExpiresAt gesetzt ist, aber abgelaufen, generiere neuen Token
                logger_1.logger.log('[TTLock] Access Token abgelaufen, generiere neuen Token...');
            }
            try {
                // TTLock OAuth-Endpunkt: /oauth2/token
                // Verwendet Resource Owner Password Credentials Grant
                // OAuth-Endpunkt ist auf api.sciener.com, nicht auf euopen.ttlock.com
                const oauthUrl = this.apiUrl.includes('euopen.ttlock.com')
                    ? 'https://api.sciener.com'
                    : this.apiUrl;
                logger_1.logger.log('[TTLock] OAuth Request Details:', {
                    oauthUrl: `${oauthUrl}/oauth2/token`,
                    hasClientId: !!this.clientId,
                    clientIdLength: ((_a = this.clientId) === null || _a === void 0 ? void 0 : _a.length) || 0,
                    hasClientSecret: !!this.clientSecret,
                    clientSecretLength: ((_b = this.clientSecret) === null || _b === void 0 ? void 0 : _b.length) || 0,
                    hasUsername: !!this.username,
                    hasPassword: !!this.password,
                    passwordLength: ((_c = this.password) === null || _c === void 0 ? void 0 : _c.length) || 0
                });
                // KRITISCH: Verwende this.axiosInstance statt axios.post() direkt!
                // axios.post() verwendet die globale Instanz ohne Interceptor
                // this.axiosInstance verwendet die konfigurierte Instanz mit Interceptor
                // ABER: OAuth-Endpunkt ist auf api.sciener.com, nicht auf euapi.ttlock.com
                // Daher müssen wir eine temporäre Instanz für OAuth erstellen
                const oauthInstance = axios_1.default.create({
                    baseURL: oauthUrl,
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                const response = yield oauthInstance.post('/oauth2/token', new URLSearchParams({
                    client_id: this.clientId || '',
                    client_secret: this.clientSecret || '',
                    username: this.username || '',
                    password: this.password || '' // Already MD5-hashed
                }));
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
                    logger_1.logger.error('[TTLock] OAuth Error:', {
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
                    logger_1.logger.error('[TTLock] OAuth Request Error:', {
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
            const organization = yield prisma_1.prisma.organization.findUnique({
                where: { id: this.organizationId },
                select: { settings: true }
            });
            if (organization === null || organization === void 0 ? void 0 : organization.settings) {
                const settings = organization.settings;
                if (settings.doorSystem) {
                    settings.doorSystem.accessToken = token;
                    yield prisma_1.prisma.organization.update({
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
            var _a, _b;
            try {
                const accessToken = yield this.getAccessToken();
                // ✅ FUNKTIONIERENDE LÖSUNG (GETESTET AM 18.11.2025, Code: 1462371)
                // WICHTIG: Verwende /v3/keyboardPwd/get für automatisch generierte Passcodes
                // Diese Methode funktioniert OHNE Gateway und OHNE App-Synchronisation!
                // date muss die aktuelle Unix-Zeit in Millisekunden sein (innerhalb von 5 Minuten)
                // Wichtig: date muss direkt vor dem Request gesetzt werden, um Zeitabweichungen zu vermeiden
                const currentTimestamp = Date.now(); // Millisekunden
                // WICHTIG: startDate muss in der Vergangenheit liegen, damit der Code sofort aktiv ist!
                // Setze startDate IMMER auf heute 00:00:00 (Mitternacht), unabhängig vom checkInDate!
                // Die API akzeptiert kein startDate, das früher als heute ist!
                let actualStartDate = new Date(); // ✅ IMMER heute (nicht checkInDate!)
                actualStartDate.setHours(0, 0, 0, 0); // Heute 00:00:00
                // WICHTIG: endDate muss mindestens 1 Tag nach startDate liegen
                let actualEndDate = new Date(endDate);
                if (actualEndDate.getTime() <= actualStartDate.getTime()) {
                    actualEndDate = new Date(actualStartDate);
                    actualEndDate.setDate(actualEndDate.getDate() + 1); // +1 Tag
                }
                logger_1.logger.log('[TTLock] ✅ Verwende FUNKTIONIERENDE LÖSUNG: /v3/keyboardPwd/get (getestet am 18.11.2025)');
                logger_1.logger.log('[TTLock] Passcode Creation Payload:', {
                    endpoint: '/v3/keyboardPwd/get',
                    clientId: this.clientId,
                    lockId: lockId,
                    keyboardPwdName: passcodeName || 'Guest Passcode',
                    keyboardPwdType: '3 (period)',
                    startDate: actualStartDate.toISOString(),
                    endDate: actualEndDate.toISOString(),
                    addType: '1 (via phone bluetooth)',
                    keyboardPwd: 'NICHT gesetzt (API generiert automatisch!)',
                    date: currentTimestamp
                });
                // ✅ FUNKTIONIERENDE KONFIGURATION (EXAKT WIE GETESTET):
                // Endpunkt: /v3/keyboardPwd/get (NICHT /v3/keyboardPwd/add!)
                // keyboardPwd: NICHT setzen (API generiert automatisch!)
                // keyboardPwdType: 3 (period/temporär, NICHT 2 permanent!)
                // startDate: Heute 00:00:00 (in Millisekunden)
                // endDate: Mindestens 1 Tag später (in Millisekunden)
                // addType: 1 (via phone bluetooth)
                // date: Aktueller Timestamp in Millisekunden
                const payload = new URLSearchParams();
                payload.append('clientId', this.clientId || '');
                payload.append('accessToken', accessToken);
                payload.append('lockId', lockId.toString());
                // WICHTIG: keyboardPwd NICHT setzen - API generiert automatisch!
                payload.append('keyboardPwdName', passcodeName || 'Guest Passcode');
                payload.append('keyboardPwdType', '3'); // 3 = period (temporärer Passcode)
                payload.append('startDate', actualStartDate.getTime().toString()); // Millisekunden
                payload.append('endDate', actualEndDate.getTime().toString()); // Millisekunden
                payload.append('addType', '1'); // 1 = via phone bluetooth (ohne Gateway)
                payload.append('date', currentTimestamp.toString()); // Millisekunden
                // Debug: Zeige vollständigen Request
                logger_1.logger.log('[TTLock] Request URL:', `${this.axiosInstance.defaults.baseURL}/v3/keyboardPwd/get`);
                logger_1.logger.log('[TTLock] Request Payload (stringified):', payload.toString());
                logger_1.logger.log('[TTLock] Request Payload (as object):', Object.fromEntries(payload));
                // ✅ WICHTIG: Verwende /v3/keyboardPwd/get (NICHT /v3/keyboardPwd/add!)
                const response = yield this.axiosInstance.post('/v3/keyboardPwd/get', payload, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                const responseData = response.data;
                // Passcode aus Response extrahieren
                const generatedPasscode = responseData.keyboardPwd || responseData.passcode;
                const keyboardPwdId = responseData.keyboardPwdId;
                if (generatedPasscode) {
                    // ✅ Erfolg - Passcode wurde automatisch generiert!
                    const passcode = generatedPasscode.toString();
                    logger_1.logger.log('[TTLock] ✅ Passcode erfolgreich erstellt! Passcode:', passcode);
                    logger_1.logger.log('[TTLock] Passcode-Länge:', passcode.length, 'Ziffern');
                    logger_1.logger.log('[TTLock] Passcode ID:', keyboardPwdId || 'N/A');
                    logger_1.logger.log('[TTLock] ✅ Dieser Code funktioniert OHNE Gateway und OHNE App-Sync!');
                    return passcode;
                }
                else if (responseData.errcode === 0 || keyboardPwdId) {
                    // Erfolg aber kein Passcode zurückgegeben
                    logger_1.logger.warn('[TTLock] ⚠️ API hat Erfolg gemeldet, aber keinen Passcode zurückgegeben!');
                    logger_1.logger.warn('[TTLock] Response:', responseData);
                    throw new Error('API hat keinen Passcode zurückgegeben (erwartet für auto-generierte Codes)');
                }
                // Fehlerfall
                const errorMsg = responseData.errmsg || `Unknown error (errcode: ${responseData.errcode})`;
                logger_1.logger.error('[TTLock] Passcode Creation Error:', {
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
                    throw new Error(((_b = (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.errmsg) ||
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
     * Löscht einen Passcode anhand des doorPin (findet Passcode via /v3/keyboardPwd/list)
     *
     * @param lockId - TTLock Lock ID
     * @param doorPin - Der Passcode (PIN), der gelöscht werden soll
     * @returns true wenn erfolgreich gelöscht, false wenn nicht gefunden
     */
    deletePasscodeByPin(lockId, doorPin) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const accessToken = yield this.getAccessToken();
                const currentTimestamp = Date.now();
                // 1. Liste alle Passcodes für den Lock ab
                const listPayload = new URLSearchParams({
                    clientId: this.clientId || '',
                    accessToken: accessToken,
                    lockId: lockId,
                    pageNo: '1',
                    pageSize: '100',
                    date: currentTimestamp.toString()
                });
                const listResponse = yield this.axiosInstance.post('/v3/keyboardPwd/list', listPayload);
                const listData = listResponse.data;
                if (listData.errcode !== 0) {
                    throw new Error(listData.errmsg || 'Fehler beim Abrufen der Passcodes');
                }
                const passcodes = listData.list || [];
                // 2. Finde Passcode mit matching doorPin
                const matchingPasscode = passcodes.find((code) => {
                    const codePin = code.keyboardPwd || code.passcode;
                    return codePin && codePin.toString() === doorPin.toString();
                });
                if (!matchingPasscode) {
                    logger_1.logger.log(`[TTLock] Passcode ${doorPin} nicht gefunden in Lock ${lockId}`);
                    return false;
                }
                const keyboardPwdId = matchingPasscode.keyboardPwdId;
                if (!keyboardPwdId) {
                    logger_1.logger.warn(`[TTLock] Passcode ${doorPin} gefunden, aber keine keyboardPwdId vorhanden`);
                    return false;
                }
                // 3. Lösche Passcode mit keyboardPwdId
                yield this.deleteTemporaryPasscode(lockId, keyboardPwdId.toString());
                logger_1.logger.log(`[TTLock] ✅ Passcode ${doorPin} (keyboardPwdId: ${keyboardPwdId}) erfolgreich gelöscht`);
                return true;
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
                logger_1.logger.log(`[TTLock] Date Timestamp (Sekunden): ${currentTimestampSeconds}`);
                logger_1.logger.log(`[TTLock] Date Timestamp (Millisekunden): ${currentTimestampMillis}`);
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
                    logger_1.logger.log('[TTLock] Lock List Response:', JSON.stringify(responseData, null, 2));
                    const lockIds = responseData.list.map((lock) => {
                        // Lock ID kann in verschiedenen Feldern sein: lockId, id, etc.
                        const id = lock.lockId || lock.id || lock.lock_id || Object.values(lock)[0];
                        // Konvertiere zu String (TTLock API gibt Zahlen zurück)
                        return id ? String(id) : null;
                    }).filter((id) => id); // Filtere undefined/null
                    logger_1.logger.log('[TTLock] Extracted Lock IDs:', lockIds);
                    return lockIds;
                }
                // Fehlerfall
                const errorMsg = responseData.errmsg || `Unknown error (errcode: ${responseData.errcode})`;
                logger_1.logger.error('[TTLock] Lock List Error:', {
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