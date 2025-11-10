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
        this.apiUrl = 'https://open.ttlock.com';
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
            this.clientId = doorSystemSettings.clientId;
            this.clientSecret = doorSystemSettings.clientSecret;
            this.apiUrl = doorSystemSettings.apiUrl || 'https://open.ttlock.com';
            this.accessToken = doorSystemSettings.accessToken;
            // Re-initialisiere Axios-Instanz mit korrekten Settings
            this.axiosInstance = this.createAxiosInstance();
        });
    }
    /**
     * Erstellt eine konfigurierte Axios-Instanz für TTLock API-Requests
     */
    createAxiosInstance() {
        const instance = axios_1.default.create({
            baseURL: this.apiUrl,
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
            var _a, _b;
            // Lade Settings falls noch nicht geladen
            if (!this.clientId || !this.clientSecret) {
                yield this.loadSettings();
            }
            // Prüfe ob Token noch gültig ist
            if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
                return this.accessToken;
            }
            try {
                const response = yield this.axiosInstance.post('/oauth2/token', new URLSearchParams({
                    client_id: this.clientId || '',
                    client_secret: this.clientSecret || '',
                    grant_type: 'client_credentials'
                }));
                if (response.data.errcode === 0 && response.data.data) {
                    this.accessToken = response.data.data.access_token;
                    const expiresIn = response.data.data.expires_in || 7200; // Standard: 2 Stunden
                    this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
                    // Speichere Token in Organisation Settings
                    yield this.saveAccessToken(this.accessToken);
                    return this.accessToken;
                }
                throw new Error(response.data.errmsg || 'Fehler beim Abrufen des Access Tokens');
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
            var _a, _b;
            try {
                const accessToken = yield this.getAccessToken();
                const payload = new URLSearchParams({
                    clientId: this.clientId || '',
                    accessToken: accessToken,
                    lockId: lockId,
                    keyboardPwdName: passcodeName || 'Guest Passcode',
                    startDate: Math.floor(startDate.getTime() / 1000).toString(), // Unix timestamp
                    endDate: Math.floor(endDate.getTime() / 1000).toString(),
                    keyboardPwdType: '2', // Temporärer Passcode
                    date: Math.floor(Date.now() / 1000).toString()
                });
                const response = yield this.axiosInstance.post('/v3/keyboardPwd/add', payload);
                if (response.data.errcode === 0 && response.data.data) {
                    return response.data.data.passcode;
                }
                throw new Error(response.data.errmsg || 'Fehler beim Erstellen des Passcodes');
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
                const payload = new URLSearchParams({
                    clientId: this.clientId || '',
                    accessToken: accessToken,
                    lockId: lockId,
                    keyboardPwdId: passcodeId,
                    date: Math.floor(Date.now() / 1000).toString()
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
                const response = yield this.axiosInstance.post('/v3/lock/list', new URLSearchParams({
                    clientId: this.clientId || '',
                    accessToken: accessToken,
                    pageNo: '1',
                    pageSize: '100',
                    date: Math.floor(Date.now() / 1000).toString()
                }));
                if (response.data.errcode === 0 && response.data.data) {
                    return response.data.data.map(lock => lock.lockId);
                }
                throw new Error(response.data.errmsg || 'Fehler beim Abrufen der Locks');
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