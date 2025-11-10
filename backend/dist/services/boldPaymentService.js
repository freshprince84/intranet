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
exports.BoldPaymentService = void 0;
const axios_1 = __importDefault(require("axios"));
const client_1 = require("@prisma/client");
const encryption_1 = require("../utils/encryption");
const prisma = new client_1.PrismaClient();
/**
 * Service für Bold Payment Integration
 *
 * Bietet Funktionen zum Erstellen von Zahlungslinks und Status-Abfragen
 */
class BoldPaymentService {
    /**
     * Erstellt eine neue Bold Payment Service-Instanz
     *
     * @param organizationId - ID der Organisation
     * @throws Error wenn Bold Payment nicht konfiguriert ist
     */
    constructor(organizationId) {
        this.environment = 'sandbox';
        this.organizationId = organizationId;
        // Settings werden beim ersten API-Call geladen (lazy loading)
        this.axiosInstance = axios_1.default.create({
            baseURL: 'https://sandbox.bold.co', // Placeholder, wird in loadSettings überschrieben
            timeout: 30000
        });
    }
    /**
     * Lädt Bold Payment Settings aus der Organisation
     * Muss vor jedem API-Call aufgerufen werden
     */
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            const organization = yield prisma.organization.findUnique({
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
            // Bestimme API URL basierend auf Environment
            if (this.environment === 'production') {
                this.apiUrl = 'https://api.bold.co';
            }
            else {
                this.apiUrl = 'https://sandbox.bold.co';
            }
            // Re-initialisiere Axios-Instanz mit korrekten Settings
            this.axiosInstance = this.createAxiosInstance();
        });
    }
    /**
     * Erstellt eine konfigurierte Axios-Instanz für Bold Payment API-Requests
     */
    createAxiosInstance() {
        const instance = axios_1.default.create({
            baseURL: this.apiUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                // Alternative: 'X-API-Key': this.apiKey (je nach Bold Payment API)
            }
        });
        // Request Interceptor für Logging
        instance.interceptors.request.use((config) => {
            var _a;
            console.log(`[Bold Payment] ${(_a = config.method) === null || _a === void 0 ? void 0 : _a.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
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
     * @param reservation - Reservierung
     * @param amount - Betrag (in der Währung der Reservierung)
     * @param currency - Währung (z.B. "COP" für Kolumbien)
     * @param description - Beschreibung der Zahlung
     * @returns Payment Link URL
     */
    createPaymentLink(reservation_1, amount_1) {
        return __awaiter(this, arguments, void 0, function* (reservation, amount, currency = 'COP', description) {
            var _a, _b, _c, _d;
            // Lade Settings falls noch nicht geladen
            if (!this.apiKey) {
                yield this.loadSettings();
            }
            try {
                const paymentDescription = description ||
                    `Zahlung für Reservierung ${reservation.guestName} - Check-in: ${reservation.checkInDate.toLocaleDateString()}`;
                const payload = {
                    merchant_id: this.merchantId,
                    amount: amount,
                    currency: currency,
                    description: paymentDescription,
                    reference: `RES-${reservation.id}`,
                    customer: {
                        name: reservation.guestName,
                        email: reservation.guestEmail || undefined,
                        phone: reservation.guestPhone || undefined
                    },
                    callback_url: `${process.env.APP_URL || 'http://localhost:5000'}/api/bold-payment/webhook`,
                    success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reservations/${reservation.id}/payment-success`,
                    cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reservations/${reservation.id}/payment-cancel`,
                    metadata: {
                        reservation_id: reservation.id.toString(),
                        organization_id: reservation.organizationId.toString()
                    }
                };
                const response = yield this.axiosInstance.post('/payment-links', payload);
                if (response.data.success && response.data.data) {
                    // Speichere Payment Link in Reservierung
                    yield prisma.reservation.update({
                        where: { id: reservation.id },
                        data: { paymentLink: response.data.data.url }
                    });
                    return response.data.data.url;
                }
                // Fallback: Direktes Objekt
                if (response.data && !response.data.success && response.data.url) {
                    const paymentLink = response.data.url;
                    yield prisma.reservation.update({
                        where: { id: reservation.id },
                        data: { paymentLink }
                    });
                    return paymentLink;
                }
                throw new Error(response.data.error || response.data.message || 'Fehler beim Erstellen des Zahlungslinks');
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    throw new Error(((_b = (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) ||
                        ((_d = (_c = axiosError.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) ||
                        `Bold Payment API Fehler: ${axiosError.message}`);
                }
                throw error;
            }
        });
    }
    /**
     * Ruft den Status einer Zahlung ab
     *
     * @param paymentId - Payment ID oder Payment Link ID
     * @returns Payment Status
     */
    getPaymentStatus(paymentId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            // Lade Settings falls noch nicht geladen
            if (!this.apiKey) {
                yield this.loadSettings();
            }
            try {
                const response = yield this.axiosInstance.get(`/payments/${paymentId}`);
                if (response.data.success && response.data.data) {
                    return response.data.data;
                }
                // Fallback: Direktes Objekt
                if (response.data && !response.data.success && response.data.id) {
                    return response.data;
                }
                throw new Error(response.data.error || response.data.message || 'Zahlung nicht gefunden');
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    if (((_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.status) === 404) {
                        throw new Error('Zahlung nicht gefunden');
                    }
                    throw new Error(((_c = (_b = axiosError.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) ||
                        ((_e = (_d = axiosError.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.message) ||
                        `Bold Payment API Fehler: ${axiosError.message}`);
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
            var _a;
            try {
                const { event, data } = payload;
                console.log(`[Bold Payment Webhook] Event: ${event}`, data);
                // Finde Reservierung basierend auf Metadata oder Reference
                const reservationId = ((_a = data.metadata) === null || _a === void 0 ? void 0 : _a.reservation_id) ||
                    (data.reference ? parseInt(data.reference.replace('RES-', '')) : null);
                if (!reservationId) {
                    console.warn('[Bold Payment Webhook] Reservierungs-ID nicht gefunden im Webhook');
                    return;
                }
                const reservation = yield prisma.reservation.findUnique({
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
                        yield prisma.reservation.update({
                            where: { id: reservation.id },
                            data: { paymentStatus: 'paid' }
                        });
                        break;
                    case 'payment.partially_paid':
                        yield prisma.reservation.update({
                            where: { id: reservation.id },
                            data: { paymentStatus: 'partially_paid' }
                        });
                        break;
                    case 'payment.refunded':
                        yield prisma.reservation.update({
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