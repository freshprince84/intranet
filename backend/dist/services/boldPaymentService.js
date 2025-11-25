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
exports.BoldPaymentService = void 0;
const axios_1 = __importDefault(require("axios"));
const encryption_1 = require("../utils/encryption");
const ttlockService_1 = require("./ttlockService");
const prisma_1 = require("../utils/prisma");
/**
 * Service für Bold Payment Integration
 *
 * Bietet Funktionen zum Erstellen von Zahlungslinks und Status-Abfragen
 */
class BoldPaymentService {
    /**
     * Erstellt eine neue Bold Payment Service-Instanz
     *
     * @param organizationId - ID der Organisation (optional, wenn branchId gesetzt)
     * @param branchId - ID des Branches (optional, wenn organizationId gesetzt)
     * @throws Error wenn weder organizationId noch branchId angegeben ist
     */
    constructor(organizationId, branchId) {
        this.environment = 'sandbox';
        if (!organizationId && !branchId) {
            throw new Error('Entweder organizationId oder branchId muss angegeben werden');
        }
        this.organizationId = organizationId;
        this.branchId = branchId;
        // Settings werden beim ersten API-Call geladen (lazy loading)
        this.axiosInstance = axios_1.default.create({
            baseURL: 'https://sandbox.bold.co', // Placeholder, wird in loadSettings überschrieben
            timeout: 30000
        });
    }
    /**
     * Lädt Bold Payment Settings aus Branch oder Organisation (mit Fallback)
     * Muss vor jedem API-Call aufgerufen werden
     */
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Versuche Branch Settings zu laden (wenn branchId gesetzt)
            if (this.branchId) {
                const branch = yield prisma_1.prisma.branch.findUnique({
                    where: { id: this.branchId },
                    select: {
                        boldPaymentSettings: true,
                        organizationId: true
                    }
                });
                if (branch === null || branch === void 0 ? void 0 : branch.boldPaymentSettings) {
                    try {
                        const settings = (0, encryption_1.decryptBranchApiSettings)(branch.boldPaymentSettings);
                        const boldPaymentSettings = (settings === null || settings === void 0 ? void 0 : settings.boldPayment) || settings;
                        if (boldPaymentSettings === null || boldPaymentSettings === void 0 ? void 0 : boldPaymentSettings.apiKey) {
                            this.apiKey = boldPaymentSettings.apiKey;
                            this.merchantId = boldPaymentSettings.merchantId;
                            this.environment = boldPaymentSettings.environment || 'sandbox';
                            this.apiUrl = 'https://integrations.api.bold.co';
                            this.axiosInstance = this.createAxiosInstance();
                            console.log(`[BoldPayment] Verwende Branch-spezifische Settings für Branch ${this.branchId}`);
                            return; // Erfolgreich geladen
                        }
                    }
                    catch (error) {
                        console.warn(`[BoldPayment] Fehler beim Laden der Branch Settings:`, error);
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
                    throw new Error(`Bold Payment ist nicht für Organisation ${this.organizationId} konfiguriert`);
                }
                const settings = (0, encryption_1.decryptApiSettings)(organization.settings);
                const boldPaymentSettings = settings === null || settings === void 0 ? void 0 : settings.boldPayment;
                if (!(boldPaymentSettings === null || boldPaymentSettings === void 0 ? void 0 : boldPaymentSettings.apiKey)) {
                    throw new Error(`Bold Payment API Key ist nicht für Organisation ${this.organizationId} konfiguriert`);
                }
                this.apiKey = boldPaymentSettings.apiKey;
                this.merchantId = boldPaymentSettings.merchantId;
                this.environment = boldPaymentSettings.environment || 'sandbox';
                this.apiUrl = 'https://integrations.api.bold.co';
                this.axiosInstance = this.createAxiosInstance();
                return;
            }
            throw new Error('Bold Payment Settings nicht gefunden (weder Branch noch Organization)');
        });
    }
    /**
     * Statische Factory-Methode: Erstellt Service für Branch
     *
     * @param branchId - ID des Branches
     * @returns BoldPaymentService-Instanz
     */
    static createForBranch(branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            const service = new BoldPaymentService(undefined, branchId);
            yield service.loadSettings();
            return service;
        });
    }
    /**
     * Erstellt eine konfigurierte Axios-Instanz für Bold Payment API-Requests
     *
     * Bold Payment "API Link de pagos" (Botón de pagos) verwendet einfache API-Key-Authentifizierung:
     * - Authorization: x-api-key <llave_de_identidad>
     * - Die Llave de identidad (Identity Key / Merchant ID) wird direkt im Authorization Header verwendet
     * Quelle: https://developers.bold.co/pagos-en-linea/api-link-de-pagos
     */
    createAxiosInstance() {
        const instance = axios_1.default.create({
            baseURL: this.apiUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            }
        });
        // Request Interceptor für API-Key-Authentifizierung
        instance.interceptors.request.use((config) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Lade Settings falls noch nicht geladen
            if (!this.merchantId) {
                yield this.loadSettings();
            }
            // Bold Payment "API Link de pagos" verwendet:
            // Authorization Header mit Wert: x-api-key <llave_de_identidad>
            // Quelle: https://developers.bold.co/pagos-en-linea/api-link-de-pagos
            if (!this.merchantId) {
                throw new Error('Bold Payment Merchant ID (Llave de identidad) fehlt');
            }
            config.headers.set('Authorization', `x-api-key ${this.merchantId}`);
            console.log(`[Bold Payment] ${(_a = config.method) === null || _a === void 0 ? void 0 : _a.toUpperCase()} ${config.url}`);
            return config;
        }), (error) => {
            console.error('[Bold Payment] Request Error:', error);
            return Promise.reject(error);
        });
        // Response Interceptor für Error Handling
        instance.interceptors.response.use((response) => response, (error) => {
            var _a, _b, _c, _d;
            console.error('[Bold Payment] API Error:', {
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
     * Erstellt einen Zahlungslink für eine Reservierung
     *
     * Verwendet die "API Link de pagos" (Botón de pagos) von Bold Payment.
     * Quelle: https://developers.bold.co/pagos-en-linea/api-link-de-pagos
     *
     * @param reservation - Reservierung
     * @param amount - Betrag (in der Währung der Reservierung)
     * @param currency - Währung (z.B. "COP" für Kolumbien)
     * @param description - Beschreibung der Zahlung
     * @returns Payment Link URL
     */
    createPaymentLink(reservation_1, amount_1) {
        return __awaiter(this, arguments, void 0, function* (reservation, amount, currency = 'COP', description) {
            var _a, _b, _c, _d, _e;
            // Lade Settings falls noch nicht geladen
            if (!this.merchantId) {
                yield this.loadSettings();
            }
            try {
                // Mindestbeträge je nach Währung (basierend auf typischen Payment-Provider-Anforderungen)
                const MIN_AMOUNTS = {
                    'COP': 10000, // Kolumbien: Mindestens 10.000 COP (ca. 2-3 USD)
                    'USD': 1, // USA: Mindestens 1 USD
                    'EUR': 1, // Europa: Mindestens 1 EUR
                };
                const minAmount = MIN_AMOUNTS[currency] || 1;
                if (amount < minAmount) {
                    throw new Error(`Betrag zu niedrig: ${amount} ${currency}. Mindestbetrag: ${minAmount} ${currency}`);
                }
                // Beschreibung: min 2, max 100 Zeichen
                const paymentDescription = (description ||
                    `Reservierung ${reservation.guestName}`).substring(0, 100);
                if (paymentDescription.length < 2) {
                    throw new Error('Beschreibung muss mindestens 2 Zeichen lang sein');
                }
                // Reference: max 60 Zeichen, alphanumerisch, Unterstriche, Bindestriche
                // Empfehlung: Timestamp hinzufügen um Duplikate zu vermeiden
                const timestamp = Date.now();
                const reference = `RES-${reservation.id}-${timestamp}`.substring(0, 60);
                // Payload gemäß API Link de pagos Dokumentation
                const payload = {
                    amount_type: 'CLOSE', // Geschlossener Betrag (vom Merchant festgelegt)
                    amount: {
                        currency: currency,
                        total_amount: amount,
                        subtotal: amount, // TODO: Berechnung mit Steuern wenn nötig
                        taxes: [], // TODO: Steuern hinzufügen wenn nötig
                        tip_amount: 0
                    },
                    reference: reference,
                    description: paymentDescription,
                    // payment_methods: optional - Array von Methoden (z.B. ["PSE", "CREDIT_CARD"])
                };
                // callback_url ist optional, aber wenn gesetzt muss es https:// sein
                // Die API akzeptiert keine http:// URLs (insbesondere nicht localhost)
                const appUrl = process.env.APP_URL;
                if (appUrl && appUrl.startsWith('https://')) {
                    payload.callback_url = `${appUrl}/api/bold-payment/webhook`;
                }
                // Für Sandbox/Development ohne https:// URL wird callback_url weggelassen
                // Logge Payload für Debugging
                console.log('[Bold Payment] Payload:', JSON.stringify(payload, null, 2));
                // Endpoint: POST /online/link/v1
                const response = yield this.axiosInstance.post('/online/link/v1', payload);
                // Response-Struktur: { payload: { payment_link: "LNK_...", url: "https://..." }, errors: [] }
                const paymentLinkUrl = (_a = response.data.payload) === null || _a === void 0 ? void 0 : _a.url;
                const paymentLinkId = (_b = response.data.payload) === null || _b === void 0 ? void 0 : _b.payment_link;
                if (paymentLinkUrl) {
                    // Speichere Payment Link in Reservierung
                    yield prisma_1.prisma.reservation.update({
                        where: { id: reservation.id },
                        data: {
                            paymentLink: paymentLinkUrl,
                            // Optional: paymentLinkId speichern falls Feld existiert
                        }
                    });
                    return paymentLinkUrl;
                }
                // Fehlerbehandlung
                if (response.data.errors && response.data.errors.length > 0) {
                    const errorMessages = response.data.errors.map((e) => e.message || JSON.stringify(e)).join(', ');
                    throw new Error(`Bold Payment Fehler: ${errorMessages}`);
                }
                throw new Error('Ungültige Antwort von Bold Payment API');
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    const status = (_c = axiosError.response) === null || _c === void 0 ? void 0 : _c.status;
                    const responseData = (_d = axiosError.response) === null || _d === void 0 ? void 0 : _d.data;
                    // Detailliertes Logging
                    console.error('[Bold Payment] API Error Details:');
                    console.error('  Status:', status);
                    console.error('  Status Text:', (_e = axiosError.response) === null || _e === void 0 ? void 0 : _e.statusText);
                    console.error('  Response Data:', JSON.stringify(responseData, null, 2));
                    // Extrahiere Fehlermeldungen
                    let errorMessage = 'Unbekannter Fehler';
                    if ((responseData === null || responseData === void 0 ? void 0 : responseData.errors) && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
                        const errors = responseData.errors.map((e) => {
                            if (typeof e === 'string')
                                return e;
                            if (e.message)
                                return e.message;
                            if (e.code)
                                return `Code ${e.code}: ${e.message || JSON.stringify(e)}`;
                            return JSON.stringify(e);
                        });
                        errorMessage = errors.join('; ');
                        console.error('  Errors:', errors);
                    }
                    else if (responseData === null || responseData === void 0 ? void 0 : responseData.message) {
                        errorMessage = responseData.message;
                    }
                    else if (axiosError.message) {
                        errorMessage = axiosError.message;
                    }
                    // Spezifische Fehlermeldung für 403 Forbidden
                    if (status === 403) {
                        throw new Error(`Bold Payment API Fehler (403 Forbidden): ${errorMessage}\n` +
                            `Bitte prüfen Sie im Bold Payment Dashboard:\n` +
                            `1. Ist die "API Link de pagos" aktiviert?\n` +
                            `2. Haben die Keys (Llave de identidad) die richtigen Berechtigungen?\n` +
                            `3. Sind die Keys für die richtige Umgebung (Sandbox/Production) aktiviert?\n` +
                            `4. Wird die "Llave de identidad" (Identity Key) korrekt verwendet?`);
                    }
                    // Spezifische Fehlermeldung für 400 Bad Request
                    if (status === 400) {
                        throw new Error(`Bold Payment API Fehler (400 Bad Request): ${errorMessage}\n` +
                            `Bitte prüfen Sie:\n` +
                            `1. Sind alle erforderlichen Felder im Payload vorhanden?\n` +
                            `2. Ist das Betragsformat korrekt?\n` +
                            `3. Ist die Währung gültig?\n` +
                            `4. Ist die Referenz eindeutig?\n` +
                            `5. Details: ${JSON.stringify(responseData, null, 2)}`);
                    }
                    throw new Error(`Bold Payment API Fehler (${status}): ${errorMessage}`);
                }
                throw error;
            }
        });
    }
    /**
     * Ruft den Status eines Zahlungslinks ab
     *
     * Verwendet die "API Link de pagos" (Botón de pagos) von Bold Payment.
     * Endpoint: GET /online/link/v1/{payment_link}
     *
     * @param paymentLinkId - Payment Link ID (z.B. "LNK_H7S4xxx")
     * @returns Payment Link Status und Daten
     */
    getPaymentStatus(paymentLinkId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            // Lade Settings falls noch nicht geladen
            if (!this.merchantId) {
                yield this.loadSettings();
            }
            try {
                // Endpoint: GET /online/link/v1/{payment_link}
                const response = yield this.axiosInstance.get(`/online/link/v1/${paymentLinkId}`);
                return response.data;
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    if (((_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.status) === 404) {
                        throw new Error('Zahlungslink nicht gefunden');
                    }
                    const errorMessage = ((_e = (_d = (_c = (_b = axiosError.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.errors) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.message) ||
                        ((_g = (_f = axiosError.response) === null || _f === void 0 ? void 0 : _f.data) === null || _g === void 0 ? void 0 : _g.message) ||
                        axiosError.message;
                    throw new Error(`Bold Payment API Fehler: ${errorMessage}`);
                }
                throw error;
            }
        });
    }
    /**
     * Verarbeitet einen Webhook von Bold Payment
     *
     * @param payload - Webhook-Payload
     */
    handleWebhook(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { event, data } = payload;
                console.log(`[Bold Payment Webhook] Event: ${event}`, data);
                // Finde Reservierung basierend auf Metadata oder Reference
                // Reference-Format: "RES-{id}-{timestamp}" → extrahiere nur die ID
                let reservationId = null;
                if ((_a = data.metadata) === null || _a === void 0 ? void 0 : _a.reservation_id) {
                    reservationId = parseInt(String(data.metadata.reservation_id), 10);
                }
                else if (data.reference) {
                    // Reference-Format: "RES-123-1704067200000" → extrahiere "123"
                    const match = String(data.reference).match(/^RES-(\d+)-/);
                    if (match && match[1]) {
                        reservationId = parseInt(match[1], 10);
                    }
                }
                if (!reservationId) {
                    console.warn('[Bold Payment Webhook] Reservierungs-ID nicht gefunden im Webhook');
                    return;
                }
                const reservation = yield prisma_1.prisma.reservation.findUnique({
                    where: { id: reservationId }
                });
                if (!reservation) {
                    console.warn(`[Bold Payment Webhook] Reservierung ${reservationId} nicht gefunden`);
                    return;
                }
                // Aktualisiere Payment Status basierend auf Event
                switch (event) {
                    case 'payment.paid':
                    case 'payment.completed':
                        // Aktualisiere Payment Status
                        yield prisma_1.prisma.reservation.update({
                            where: { id: reservation.id },
                            data: { paymentStatus: 'paid' }
                        });
                        // Prüfe ob Gast bereits eingecheckt ist
                        const isAlreadyCheckedIn = reservation.status === 'checked_in';
                        // Wenn bereits eingecheckt, aktualisiere Status nicht erneut
                        // Aber sende trotzdem TTLock-Code wenn noch nicht vorhanden
                        // Nach Zahlung: Erstelle TTLock Code und sende WhatsApp-Nachricht
                        try {
                            // Hole aktualisierte Reservierung mit Organisation und Branch
                            const updatedReservation = yield prisma_1.prisma.reservation.findUnique({
                                where: { id: reservation.id },
                                include: { organization: true, branch: true }
                            });
                            if (!updatedReservation) {
                                console.warn(`[Bold Payment Webhook] Reservierung ${reservation.id} nicht gefunden nach Update`);
                                break;
                            }
                            // Wenn noch nicht eingecheckt und Check-in-Datum erreicht/überschritten, setze Status auf checked_in
                            const shouldAutoCheckIn = !isAlreadyCheckedIn &&
                                updatedReservation.checkInDate &&
                                new Date(updatedReservation.checkInDate) <= new Date();
                            if (shouldAutoCheckIn) {
                                yield prisma_1.prisma.reservation.update({
                                    where: { id: reservation.id },
                                    data: {
                                        status: 'checked_in',
                                        onlineCheckInCompleted: true,
                                        onlineCheckInCompletedAt: new Date()
                                    }
                                });
                                console.log(`[Bold Payment Webhook] ✅ Auto-Check-in durchgeführt für Reservierung ${reservation.id} (Zahlung erhalten)`);
                            }
                            // Erstelle TTLock Passcode (wenn konfiguriert und Kontaktinfo vorhanden)
                            // TTLock-Code sollte auch erstellt werden, wenn nur Email vorhanden ist
                            if (updatedReservation.guestPhone || updatedReservation.guestEmail) {
                                let ttlockCode = null;
                                try {
                                    const ttlockService = updatedReservation.branchId
                                        ? yield ttlockService_1.TTLockService.createForBranch(updatedReservation.branchId)
                                        : new ttlockService_1.TTLockService(updatedReservation.organizationId);
                                    // Lade Settings aus Branch oder Organisation (WICHTIG: Entschlüsseln!)
                                    let doorSystemSettings = null;
                                    if (updatedReservation.branchId && ((_b = updatedReservation.branch) === null || _b === void 0 ? void 0 : _b.doorSystemSettings)) {
                                        const { decryptBranchApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                                        const branchSettings = decryptBranchApiSettings(updatedReservation.branch.doorSystemSettings);
                                        doorSystemSettings = (branchSettings === null || branchSettings === void 0 ? void 0 : branchSettings.doorSystem) || branchSettings;
                                    }
                                    else {
                                        const { decryptApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                                        const settings = decryptApiSettings(updatedReservation.organization.settings);
                                        doorSystemSettings = settings === null || settings === void 0 ? void 0 : settings.doorSystem;
                                    }
                                    if ((doorSystemSettings === null || doorSystemSettings === void 0 ? void 0 : doorSystemSettings.lockIds) && doorSystemSettings.lockIds.length > 0) {
                                        const lockId = doorSystemSettings.lockIds[0];
                                        // Erstelle temporären Passcode (30 Tage gültig)
                                        const startDate = new Date();
                                        const endDate = new Date();
                                        endDate.setDate(endDate.getDate() + 30);
                                        ttlockCode = yield ttlockService.createTemporaryPasscode(lockId, startDate, endDate, `Guest: ${updatedReservation.guestName}`);
                                        // Speichere TTLock Code in Reservierung
                                        yield prisma_1.prisma.reservation.update({
                                            where: { id: reservation.id },
                                            data: {
                                                doorPin: ttlockCode,
                                                doorAppName: 'TTLock',
                                                ttlLockId: lockId,
                                                ttlLockPassword: ttlockCode
                                            }
                                        });
                                        console.log(`[Bold Payment Webhook] TTLock Code erstellt für Reservierung ${reservation.id}`);
                                        // Log erfolgreiche TTLock-Code-Erstellung
                                        try {
                                            yield prisma_1.prisma.reservationNotificationLog.create({
                                                data: {
                                                    reservationId: reservation.id,
                                                    notificationType: 'pin',
                                                    channel: updatedReservation.guestPhone && updatedReservation.guestEmail ? 'both' : (updatedReservation.guestPhone ? 'whatsapp' : 'email'),
                                                    success: true,
                                                    sentAt: new Date(),
                                                    message: `TTLock Code erstellt: ${ttlockCode}`
                                                }
                                            });
                                        }
                                        catch (logError) {
                                            console.error('[Bold Payment Webhook] ⚠️ Fehler beim Erstellen des Log-Eintrags für TTLock-Code:', logError);
                                        }
                                    }
                                    else {
                                        // Log: Keine Lock IDs konfiguriert
                                        try {
                                            yield prisma_1.prisma.reservationNotificationLog.create({
                                                data: {
                                                    reservationId: reservation.id,
                                                    notificationType: 'pin',
                                                    channel: updatedReservation.guestPhone && updatedReservation.guestEmail ? 'both' : (updatedReservation.guestPhone ? 'whatsapp' : 'email'),
                                                    success: false,
                                                    sentAt: new Date(),
                                                    errorMessage: 'TTLock Code konnte nicht erstellt werden - keine Lock IDs konfiguriert'
                                                }
                                            });
                                        }
                                        catch (logError) {
                                            console.error('[Bold Payment Webhook] ⚠️ Fehler beim Erstellen des Log-Eintrags (keine Lock IDs):', logError);
                                        }
                                    }
                                }
                                catch (ttlockError) {
                                    console.error('[Bold Payment Webhook] Fehler beim Erstellen des TTLock Passcodes:', ttlockError);
                                    const errorMessage = ttlockError instanceof Error ? ttlockError.message : 'Unbekannter Fehler beim Erstellen des TTLock Passcodes';
                                    // Log fehlgeschlagene TTLock-Code-Erstellung
                                    try {
                                        yield prisma_1.prisma.reservationNotificationLog.create({
                                            data: {
                                                reservationId: reservation.id,
                                                notificationType: 'pin',
                                                channel: updatedReservation.guestPhone && updatedReservation.guestEmail ? 'both' : (updatedReservation.guestPhone ? 'whatsapp' : 'email'),
                                                success: false,
                                                sentAt: new Date(),
                                                errorMessage: `TTLock Code konnte nicht erstellt werden: ${errorMessage}`
                                            }
                                        });
                                    }
                                    catch (logError) {
                                        console.error('[Bold Payment Webhook] ⚠️ Fehler beim Erstellen des Log-Eintrags für TTLock-Fehler:', logError);
                                    }
                                    // Weiter ohne TTLock Code
                                }
                                // ⚠️ TEMPORÄR DEAKTIVIERT: WhatsApp-Versendung nach TTLock-Webhook
                                // TTLock-Code wird weiterhin erstellt und im Frontend angezeigt, aber nicht versendet
                                console.log(`[Bold Payment Webhook] ⚠️ WhatsApp-Versendung temporär deaktiviert - TTLock-Code ${ttlockCode ? `(${ttlockCode})` : ''} wird nur im Frontend angezeigt`);
                                // Log: Versendung deaktiviert
                                try {
                                    yield prisma_1.prisma.reservationNotificationLog.create({
                                        data: {
                                            reservationId: reservation.id,
                                            notificationType: 'pin',
                                            channel: 'whatsapp',
                                            success: false,
                                            sentAt: new Date(),
                                            sentTo: updatedReservation.guestPhone || null,
                                            errorMessage: 'WhatsApp-Versendung temporär deaktiviert - Code wird nur im Frontend angezeigt'
                                        }
                                    });
                                }
                                catch (logError) {
                                    console.error('[Bold Payment Webhook] ⚠️ Fehler beim Erstellen des Log-Eintrags:', logError);
                                }
                                // ⚠️ TEMPORÄR AUSKOMMENTIERT - WhatsApp-Versendung nach TTLock-Webhook
                                // TODO: Wieder aktivieren, wenn gewünscht
                                /*
                                // Sende WhatsApp-Nachricht mit TTLock Code
                                try {
                                  const whatsappService = updatedReservation.branchId
                                    ? new WhatsAppService(undefined, updatedReservation.branchId)
                                    : new WhatsAppService(updatedReservation.organizationId);
                                  
                                  // Wenn TTLock Code vorhanden, verwende sendCheckInConfirmation (mit Template-Fallback)
                                  if (ttlockCode) {
                                    const roomNumber = updatedReservation.roomNumber || 'N/A';
                                    const roomDescription = updatedReservation.roomDescription || 'N/A';
                                    
                                    console.log(`[Bold Payment Webhook] Versende Check-in-Bestätigung mit PIN für Reservierung ${reservation.id}...`);
                                    const whatsappSuccess = await whatsappService.sendCheckInConfirmation(
                                      updatedReservation.guestName,
                                      updatedReservation.guestPhone,
                                      roomNumber,
                                      roomDescription,
                                      ttlockCode,
                                      'TTLock',
                                      {
                                        guestNationality: updatedReservation.guestNationality,
                                        guestPhone: updatedReservation.guestPhone
                                      }
                                    );
                                    
                                    const message = `Hola ${updatedReservation.guestName},
                  
                  ¡Gracias por tu pago!
                  
                  Tu código de acceso TTLock:
                  ${ttlockCode}
                  
                  ¡Te esperamos!`;
                  
                                    if (whatsappSuccess) {
                                      // Speichere versendete Nachricht
                                      await prisma.reservation.update({
                                        where: { id: reservation.id },
                                        data: {
                                          sentMessage: message,
                                          sentMessageAt: new Date()
                                        }
                                      });
                  
                                      console.log(`[Bold Payment Webhook] ✅ WhatsApp-Nachricht mit TTLock Code erfolgreich versendet für Reservierung ${reservation.id}`);
                                      
                                      // Log erfolgreiche WhatsApp-Notification
                                      try {
                                        await prisma.reservationNotificationLog.create({
                                          data: {
                                            reservationId: reservation.id,
                                            notificationType: 'pin',
                                            channel: 'whatsapp',
                                            success: true,
                                            sentAt: new Date(),
                                            sentTo: updatedReservation.guestPhone,
                                            message: message
                                          }
                                        });
                                      } catch (logError) {
                                        console.error('[Bold Payment Webhook] ⚠️ Fehler beim Erstellen des Log-Eintrags für WhatsApp:', logError);
                                      }
                                    } else {
                                      console.error(`[Bold Payment Webhook] ❌ WhatsApp-Nachricht konnte nicht versendet werden (sendCheckInConfirmation gab false zurück)`);
                                      
                                      // Log fehlgeschlagene WhatsApp-Notification
                                      try {
                                        await prisma.reservationNotificationLog.create({
                                          data: {
                                            reservationId: reservation.id,
                                            notificationType: 'pin',
                                            channel: 'whatsapp',
                                            success: false,
                                            sentAt: new Date(),
                                            sentTo: updatedReservation.guestPhone,
                                            message: message,
                                            errorMessage: 'WhatsApp-Nachricht konnte nicht versendet werden (sendCheckInConfirmation gab false zurück)'
                                          }
                                        });
                                      } catch (logError) {
                                        console.error('[Bold Payment Webhook] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene WhatsApp:', logError);
                                      }
                                    }
                                  } else {
                                    // Kein TTLock Code - sende einfache Bestätigung
                                    const message = `Hola ${updatedReservation.guestName},
                  
                  ¡Gracias por tu pago!
                  
                  ¡Te esperamos!`;
                  
                                    console.log(`[Bold Payment Webhook] Versende einfache Zahlungsbestätigung (ohne PIN) für Reservierung ${reservation.id}...`);
                                    // Basis-Template-Name (wird in sendMessageWithFallback basierend auf Sprache angepasst)
                                    // Spanisch: reservation_checkin_invitation, Englisch: reservation_checkin_invitation_
                                    const templateName = process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_checkin_invitation';
                                    const templateParams = [updatedReservation.guestName];
                                    
                                    const whatsappSuccess = await whatsappService.sendMessageWithFallback(
                                      updatedReservation.guestPhone,
                                      message,
                                      templateName,
                                      templateParams,
                                      {
                                        guestNationality: updatedReservation.guestNationality,
                                        guestPhone: updatedReservation.guestPhone
                                      }
                                    );
                  
                                    if (whatsappSuccess) {
                                      // Speichere versendete Nachricht
                                      await prisma.reservation.update({
                                        where: { id: reservation.id },
                                        data: {
                                          sentMessage: message,
                                          sentMessageAt: new Date()
                                        }
                                      });
                                      
                                      console.log(`[Bold Payment Webhook] ✅ WhatsApp-Nachricht erfolgreich versendet für Reservierung ${reservation.id}`);
                                      
                                      // Log erfolgreiche WhatsApp-Notification (ohne PIN)
                                      try {
                                        await prisma.reservationNotificationLog.create({
                                          data: {
                                            reservationId: reservation.id,
                                            notificationType: 'pin',
                                            channel: 'whatsapp',
                                            success: true,
                                            sentAt: new Date(),
                                            sentTo: updatedReservation.guestPhone,
                                            message: message
                                          }
                                        });
                                      } catch (logError) {
                                        console.error('[Bold Payment Webhook] ⚠️ Fehler beim Erstellen des Log-Eintrags für WhatsApp:', logError);
                                      }
                                    } else {
                                      console.error(`[Bold Payment Webhook] ❌ WhatsApp-Nachricht konnte nicht versendet werden (sendMessageWithFallback gab false zurück)`);
                                      
                                      // Log fehlgeschlagene WhatsApp-Notification
                                      try {
                                        await prisma.reservationNotificationLog.create({
                                          data: {
                                            reservationId: reservation.id,
                                            notificationType: 'pin',
                                            channel: 'whatsapp',
                                            success: false,
                                            sentAt: new Date(),
                                            sentTo: updatedReservation.guestPhone,
                                            message: message,
                                            errorMessage: 'WhatsApp-Nachricht konnte nicht versendet werden (sendMessageWithFallback gab false zurück)'
                                          }
                                        });
                                      } catch (logError) {
                                        console.error('[Bold Payment Webhook] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene WhatsApp:', logError);
                                      }
                                    }
                                  }
                                } catch (whatsappError) {
                                  console.error('[Bold Payment Webhook] ❌ Fehler beim Versenden der WhatsApp-Nachricht:', whatsappError);
                                  const errorMessage = whatsappError instanceof Error ? whatsappError.message : 'Unbekannter Fehler beim Versenden der WhatsApp-Nachricht';
                                  if (whatsappError instanceof Error) {
                                    console.error('[Bold Payment Webhook] Fehlermeldung:', whatsappError.message);
                                    console.error('[Bold Payment Webhook] Stack:', whatsappError.stack);
                                  }
                                  
                                  // Log fehlgeschlagene WhatsApp-Notification
                                  try {
                                    await prisma.reservationNotificationLog.create({
                                      data: {
                                        reservationId: reservation.id,
                                        notificationType: 'pin',
                                        channel: 'whatsapp',
                                        success: false,
                                        sentAt: new Date(),
                                        sentTo: updatedReservation.guestPhone || null,
                                        errorMessage: errorMessage
                                      }
                                    });
                                  } catch (logError) {
                                    console.error('[Bold Payment Webhook] ⚠️ Fehler beim Erstellen des Log-Eintrags für WhatsApp-Fehler:', logError);
                                  }
                                  // Fehler nicht weiterwerfen
                                }
                                */
                            }
                            else {
                                // Keine Kontaktinfo vorhanden - Log erstellen
                                try {
                                    yield prisma_1.prisma.reservationNotificationLog.create({
                                        data: {
                                            reservationId: reservation.id,
                                            notificationType: 'pin',
                                            channel: 'whatsapp',
                                            success: false,
                                            sentAt: new Date(),
                                            errorMessage: 'Keine Kontaktinformation (Telefonnummer oder E-Mail) vorhanden - TTLock-Code konnte nicht versendet werden'
                                        }
                                    });
                                }
                                catch (logError) {
                                    console.error('[Bold Payment Webhook] ⚠️ Fehler beim Erstellen des Log-Eintrags (keine Kontaktinfo):', logError);
                                }
                            }
                        }
                        catch (error) {
                            console.error('[Bold Payment Webhook] Fehler beim Verarbeiten der Zahlung (TTLock/WhatsApp):', error);
                            // Fehler nicht weiterwerfen, Payment Status wurde bereits aktualisiert
                        }
                        break;
                    case 'payment.partially_paid':
                        yield prisma_1.prisma.reservation.update({
                            where: { id: reservation.id },
                            data: { paymentStatus: 'partially_paid' }
                        });
                        break;
                    case 'payment.refunded':
                        yield prisma_1.prisma.reservation.update({
                            where: { id: reservation.id },
                            data: { paymentStatus: 'refunded' }
                        });
                        break;
                    case 'payment.failed':
                    case 'payment.cancelled':
                        // Status bleibt "pending"
                        break;
                    default:
                        console.log(`[Bold Payment Webhook] Unbekanntes Event: ${event}`);
                }
            }
            catch (error) {
                console.error('[Bold Payment Webhook] Fehler beim Verarbeiten:', error);
                throw error;
            }
        });
    }
}
exports.BoldPaymentService = BoldPaymentService;
//# sourceMappingURL=boldPaymentService.js.map