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
exports.LobbyPmsService = void 0;
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const encryption_1 = require("../utils/encryption");
const taskAutomationService_1 = require("./taskAutomationService");
const prisma_1 = require("../utils/prisma");
/**
 * Service für LobbyPMS API-Integration
 *
 * Bietet Funktionen zum Abrufen und Synchronisieren von Reservierungen
 */
class LobbyPmsService {
    /**
     * Erstellt eine neue LobbyPMS Service-Instanz
     *
     * @param organizationId - ID der Organisation (optional, wenn branchId gesetzt)
     * @param branchId - ID des Branches (optional, wenn organizationId gesetzt)
     * @throws Error wenn weder organizationId noch branchId angegeben ist
     */
    constructor(organizationId, branchId) {
        if (!organizationId && !branchId) {
            throw new Error('Entweder organizationId oder branchId muss angegeben werden');
        }
        this.organizationId = organizationId;
        this.branchId = branchId;
        // Settings werden beim ersten API-Call geladen (lazy loading)
        this.axiosInstance = axios_1.default.create({
            baseURL: 'https://app.lobbypms.com/api', // Placeholder, wird in loadSettings überschrieben
            timeout: 30000
        });
    }
    /**
     * Lädt LobbyPMS Settings aus Branch oder Organisation (mit Fallback)
     * Muss vor jedem API-Call aufgerufen werden
     */
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Versuche Branch Settings zu laden (wenn branchId gesetzt)
            if (this.branchId) {
                const branch = yield prisma_1.prisma.branch.findUnique({
                    where: { id: this.branchId },
                    select: {
                        lobbyPmsSettings: true,
                        organizationId: true
                    }
                });
                if (branch === null || branch === void 0 ? void 0 : branch.lobbyPmsSettings) {
                    try {
                        const settings = (0, encryption_1.decryptBranchApiSettings)(branch.lobbyPmsSettings);
                        const lobbyPmsSettings = (settings === null || settings === void 0 ? void 0 : settings.lobbyPms) || settings;
                        if (lobbyPmsSettings === null || lobbyPmsSettings === void 0 ? void 0 : lobbyPmsSettings.apiKey) {
                            let apiUrl = lobbyPmsSettings.apiUrl || 'https://api.lobbypms.com';
                            // Korrigiere app.lobbypms.com zu api.lobbypms.com
                            if (apiUrl.includes('app.lobbypms.com')) {
                                apiUrl = apiUrl.replace('app.lobbypms.com', 'api.lobbypms.com');
                            }
                            // Stelle sicher, dass apiUrl NICHT mit /api endet (wird im Endpoint hinzugefügt)
                            if (apiUrl.endsWith('/api')) {
                                apiUrl = apiUrl.replace(/\/api$/, '');
                            }
                            this.apiUrl = apiUrl;
                            this.apiKey = lobbyPmsSettings.apiKey;
                            this.propertyId = lobbyPmsSettings.propertyId;
                            this.axiosInstance = this.createAxiosInstance();
                            // WICHTIG: Setze organizationId aus Branch (wird für syncReservation benötigt)
                            if (branch.organizationId) {
                                this.organizationId = branch.organizationId;
                            }
                            console.log(`[LobbyPMS] Verwende Branch-spezifische Settings für Branch ${this.branchId}`);
                            return; // Erfolgreich geladen
                        }
                    }
                    catch (error) {
                        console.warn(`[LobbyPMS] Fehler beim Laden der Branch Settings:`, error);
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
                    throw new Error(`LobbyPMS ist nicht für Organisation ${this.organizationId} konfiguriert`);
                }
                const settings = (0, encryption_1.decryptApiSettings)(organization.settings);
                const lobbyPmsSettings = settings === null || settings === void 0 ? void 0 : settings.lobbyPms;
                if (!(lobbyPmsSettings === null || lobbyPmsSettings === void 0 ? void 0 : lobbyPmsSettings.apiKey)) {
                    throw new Error(`LobbyPMS API Key ist nicht für Organisation ${this.organizationId} konfiguriert`);
                }
                if (!(lobbyPmsSettings === null || lobbyPmsSettings === void 0 ? void 0 : lobbyPmsSettings.apiUrl)) {
                    throw new Error(`LobbyPMS API URL ist nicht für Organisation ${this.organizationId} konfiguriert`);
                }
                let apiUrl = lobbyPmsSettings.apiUrl;
                if (!apiUrl) {
                    apiUrl = 'https://api.lobbypms.com';
                }
                // Korrigiere app.lobbypms.com zu api.lobbypms.com
                if (apiUrl.includes('app.lobbypms.com')) {
                    apiUrl = apiUrl.replace('app.lobbypms.com', 'api.lobbypms.com');
                }
                // Stelle sicher, dass apiUrl NICHT mit /api endet (wird im Endpoint hinzugefügt)
                if (apiUrl.endsWith('/api')) {
                    apiUrl = apiUrl.replace(/\/api$/, '');
                }
                this.apiUrl = apiUrl;
                this.apiKey = lobbyPmsSettings.apiKey;
                this.propertyId = lobbyPmsSettings.propertyId;
                // Erstelle Axios-Instanz mit korrekten Settings
                this.axiosInstance = this.createAxiosInstance();
                return;
            }
            throw new Error('LobbyPMS Settings nicht gefunden (weder Branch noch Organization)');
        });
    }
    /**
     * Statische Factory-Methode: Erstellt Service für Branch
     *
     * @param branchId - ID des Branches
     * @returns LobbyPmsService-Instanz
     */
    static createForBranch(branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Hole organizationId direkt aus Branch (wie in Dokumentation beschrieben)
            const branch = yield prisma_1.prisma.branch.findUnique({
                where: { id: branchId },
                select: { organizationId: true }
            });
            if (!(branch === null || branch === void 0 ? void 0 : branch.organizationId)) {
                throw new Error(`Branch ${branchId} hat keine organizationId`);
            }
            const service = new LobbyPmsService(branch.organizationId, branchId);
            yield service.loadSettings();
            return service;
        });
    }
    /**
     * Erstellt eine konfigurierte Axios-Instanz für LobbyPMS API-Requests
     */
    createAxiosInstance() {
        const instance = axios_1.default.create({
            baseURL: this.apiUrl,
            timeout: 30000, // 30 Sekunden Timeout
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                // LobbyPMS API verwendet Bearer Token Authentifizierung
                // Alternative Methoden werden bei Bedarf unterstützt
            }
        });
        // Request Interceptor für Logging
        instance.interceptors.request.use((config) => {
            var _a;
            console.log(`[LobbyPMS] ${(_a = config.method) === null || _a === void 0 ? void 0 : _a.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
            console.error('[LobbyPMS] Request Error:', error);
            return Promise.reject(error);
        });
        // Response Interceptor für Error Handling
        instance.interceptors.response.use((response) => response, (error) => {
            var _a, _b, _c, _d;
            console.error('[LobbyPMS] API Error:', {
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
     * Ruft alle Reservierungen für einen Zeitraum ab
     *
     * @param startDate - Startdatum (inklusive)
     * @param endDate - Enddatum (inklusive)
     * @returns Array von Reservierungen
     */
    fetchReservations(startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            // Lade Settings falls noch nicht geladen
            if (!this.apiKey) {
                yield this.loadSettings();
            }
            try {
                const params = {
                    start_date: startDate.toISOString().split('T')[0], // YYYY-MM-DD
                    end_date: endDate.toISOString().split('T')[0],
                };
                if (this.propertyId) {
                    params.property_id = this.propertyId;
                }
                const response = yield this.axiosInstance.get('/api/v1/bookings', {
                    params,
                    validateStatus: (status) => status < 500 // Akzeptiere 4xx als gültige Antwort
                });
                // Prüfe ob Response HTML ist (404-Seite)
                const responseData = response.data;
                if (typeof responseData === 'string' && responseData.includes('<!DOCTYPE')) {
                    throw new Error('LobbyPMS API Endpoint nicht gefunden. Bitte prüfe die API-Dokumentation für den korrekten Endpoint.');
                }
                // LobbyPMS gibt { data: [...], meta: {...} } zurück
                if (responseData && typeof responseData === 'object' && responseData.data && Array.isArray(responseData.data)) {
                    return responseData.data;
                }
                // Fallback: Direktes Array (wenn API direkt Array zurückgibt)
                if (Array.isArray(responseData)) {
                    return responseData;
                }
                // Fallback: success-Format
                if (responseData && typeof responseData === 'object' && responseData.success && responseData.data) {
                    return responseData.data;
                }
                // Debug: Zeige Response-Struktur (nur wenn nicht HTML)
                if (typeof responseData !== 'string') {
                    console.error('[LobbyPMS] Unerwartete Response-Struktur:', JSON.stringify(responseData, null, 2));
                }
                throw new Error((responseData && typeof responseData === 'object' && responseData.error) ||
                    (responseData && typeof responseData === 'object' && responseData.message) ||
                    'Unbekannter Fehler beim Abrufen der Reservierungen');
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    throw new Error(((_b = (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) ||
                        ((_d = (_c = axiosError.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) ||
                        `LobbyPMS API Fehler: ${axiosError.message}`);
                }
                throw error;
            }
        });
    }
    /**
     * Ruft Reservierungen mit Ankunft am nächsten Tag ab
     *
     * @param arrivalTimeThreshold - Optional: Nur Reservierungen nach dieser Uhrzeit (z.B. "22:00")
     * @returns Array von Reservierungen
     */
    fetchTomorrowReservations(arrivalTimeThreshold) {
        return __awaiter(this, void 0, void 0, function* () {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
            const reservations = yield this.fetchReservations(tomorrow, dayAfterTomorrow);
            // Filtere nach arrivalTimeThreshold wenn angegeben
            if (arrivalTimeThreshold) {
                const [hours, minutes] = arrivalTimeThreshold.split(':').map(Number);
                const thresholdTime = new Date(tomorrow);
                thresholdTime.setHours(hours, minutes, 0, 0);
                return reservations.filter(reservation => {
                    if (!reservation.arrival_time) {
                        return false; // Keine Ankunftszeit = nicht inkludieren
                    }
                    const arrivalTime = new Date(reservation.arrival_time);
                    return arrivalTime >= thresholdTime;
                });
            }
            return reservations;
        });
    }
    /**
     * Ruft Details einer spezifischen Reservierung ab
     *
     * @param reservationId - LobbyPMS Reservierungs-ID
     * @returns Reservierungsdetails
     */
    fetchReservationById(reservationId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            // Lade Settings falls noch nicht geladen
            if (!this.apiKey) {
                yield this.loadSettings();
            }
            try {
                const response = yield this.axiosInstance.get(`/reservations/${reservationId}`);
                if (response.data.success && response.data.data) {
                    return response.data.data;
                }
                // Fallback: Direktes Objekt (wenn API direkt Reservation zurückgibt)
                if (response.data && !response.data.success && response.data.id) {
                    return response.data;
                }
                throw new Error(response.data.error || response.data.message || 'Reservierung nicht gefunden');
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    if (((_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.status) === 404) {
                        throw new Error('Reservierung nicht gefunden');
                    }
                    throw new Error(((_c = (_b = axiosError.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) ||
                        ((_e = (_d = axiosError.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.message) ||
                        `LobbyPMS API Fehler: ${axiosError.message}`);
                }
                throw error;
            }
        });
    }
    /**
     * Aktualisiert den Check-in-Status einer Reservierung in LobbyPMS
     *
     * @param reservationId - LobbyPMS Reservierungs-ID
     * @param status - Neuer Status ('checked_in', 'checked_out', etc.)
     */
    updateReservationStatus(reservationId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            // Lade Settings falls noch nicht geladen
            if (!this.apiKey) {
                yield this.loadSettings();
            }
            try {
                const response = yield this.axiosInstance.put(`/reservations/${reservationId}/status`, { status });
                if (!response.data.success) {
                    throw new Error(response.data.error || response.data.message || 'Fehler beim Aktualisieren des Status');
                }
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    throw new Error(((_b = (_a = axiosError.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) ||
                        ((_d = (_c = axiosError.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) ||
                        `LobbyPMS API Fehler: ${axiosError.message}`);
                }
                throw error;
            }
        });
    }
    /**
     * Synchronisiert eine LobbyPMS-Reservierung in die lokale Datenbank
     *
     * @param lobbyReservation - Reservierungsdaten von LobbyPMS
     * @returns Lokale Reservation
     */
    syncReservation(lobbyReservation) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            // Mappe LobbyPMS Status zu unserem ReservationStatus
            const mapStatus = (status) => {
                switch (status === null || status === void 0 ? void 0 : status.toLowerCase()) {
                    case 'checked_in':
                        return client_1.ReservationStatus.checked_in;
                    case 'checked_out':
                        return client_1.ReservationStatus.checked_out;
                    case 'cancelled':
                        return client_1.ReservationStatus.cancelled;
                    case 'no_show':
                        return client_1.ReservationStatus.no_show;
                    default:
                        return client_1.ReservationStatus.confirmed;
                }
            };
            // Mappe LobbyPMS Payment Status zu unserem PaymentStatus
            const mapPaymentStatus = (status) => {
                switch (status === null || status === void 0 ? void 0 : status.toLowerCase()) {
                    case 'paid':
                        return client_1.PaymentStatus.paid;
                    case 'partially_paid':
                        return client_1.PaymentStatus.partially_paid;
                    case 'refunded':
                        return client_1.PaymentStatus.refunded;
                    default:
                        return client_1.PaymentStatus.pending;
                }
            };
            // API gibt booking_id zurück, nicht id
            const bookingId = String(lobbyReservation.booking_id || lobbyReservation.id);
            // Gastdaten aus holder-Objekt extrahieren (falls vorhanden)
            const holder = lobbyReservation.holder || {};
            const guestName = (holder.name && holder.surname)
                ? `${holder.name} ${holder.surname}${holder.second_surname ? ' ' + holder.second_surname : ''}`.trim()
                : (lobbyReservation.guest_name || 'Unbekannt');
            const guestEmail = holder.email || lobbyReservation.guest_email || null;
            const guestPhone = holder.phone || lobbyReservation.guest_phone || null;
            // Datum-Felder: API gibt start_date/end_date zurück
            const checkInDate = lobbyReservation.start_date || lobbyReservation.check_in_date;
            const checkOutDate = lobbyReservation.end_date || lobbyReservation.check_out_date;
            // Zimmer-Daten aus assigned_room-Objekt
            const roomNumber = ((_a = lobbyReservation.assigned_room) === null || _a === void 0 ? void 0 : _a.name) || lobbyReservation.room_number || null;
            const roomDescription = ((_b = lobbyReservation.assigned_room) === null || _b === void 0 ? void 0 : _b.type) || lobbyReservation.room_description || ((_c = lobbyReservation.category) === null || _c === void 0 ? void 0 : _c.name) || null;
            // Status: API gibt checked_in/checked_out Booleans zurück
            let status = client_1.ReservationStatus.confirmed;
            if (lobbyReservation.checked_out) {
                status = client_1.ReservationStatus.checked_out;
            }
            else if (lobbyReservation.checked_in) {
                status = client_1.ReservationStatus.checked_in;
            }
            else if (lobbyReservation.status) {
                status = mapStatus(lobbyReservation.status);
            }
            // Payment Status: API gibt paid_out und total_to_pay zurück
            let paymentStatus = client_1.PaymentStatus.pending;
            const paidOut = parseFloat(lobbyReservation.paid_out || '0');
            const totalToPay = parseFloat(lobbyReservation.total_to_pay || lobbyReservation.total_to_pay_accommodation || '0');
            if (paidOut >= totalToPay && totalToPay > 0) {
                paymentStatus = client_1.PaymentStatus.paid;
            }
            else if (paidOut > 0) {
                paymentStatus = client_1.PaymentStatus.partially_paid;
            }
            else if (lobbyReservation.payment_status) {
                paymentStatus = mapPaymentStatus(lobbyReservation.payment_status);
            }
            // Hole Branch-ID: Verwende this.branchId (MUSS gesetzt sein!)
            // KEIN Fallback mehr, da dies zu falschen Branch-Zuordnungen führt
            if (!this.branchId) {
                throw new Error(`LobbyPmsService.syncReservation: branchId ist nicht gesetzt! Service muss mit createForBranch() erstellt werden.`);
            }
            const branchId = this.branchId;
            const reservationData = {
                lobbyReservationId: bookingId,
                guestName: guestName,
                guestEmail: guestEmail,
                guestPhone: guestPhone,
                checkInDate: new Date(checkInDate),
                checkOutDate: new Date(checkOutDate),
                arrivalTime: lobbyReservation.arrival_time ? new Date(lobbyReservation.arrival_time) : null,
                roomNumber: roomNumber,
                roomDescription: roomDescription,
                status: status,
                paymentStatus: paymentStatus,
                organizationId: this.organizationId,
                branchId: branchId,
            };
            // Upsert: Erstelle oder aktualisiere Reservierung
            const reservation = yield prisma_1.prisma.reservation.upsert({
                where: {
                    lobbyReservationId: bookingId
                },
                create: reservationData,
                update: reservationData
            });
            // Erstelle Sync-History-Eintrag
            yield prisma_1.prisma.reservationSyncHistory.create({
                data: {
                    reservationId: reservation.id,
                    syncType: 'updated',
                    syncData: lobbyReservation,
                }
            });
            // Erstelle automatisch Task wenn aktiviert
            try {
                yield taskAutomationService_1.TaskAutomationService.createReservationTask(reservation, this.organizationId);
            }
            catch (error) {
                console.error(`[LobbyPMS] Fehler beim Erstellen des Tasks für Reservierung ${reservation.id}:`, error);
                // Fehler nicht weiterwerfen, da Task-Erstellung optional ist
            }
            return reservation;
        });
    }
    /**
     * Synchronisiert alle Reservierungen für einen Zeitraum
     *
     * @param startDate - Startdatum
     * @param endDate - Enddatum
     * @returns Anzahl synchronisierter Reservierungen
     */
    syncReservations(startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            // Lade Settings falls noch nicht geladen
            if (!this.apiKey) {
                yield this.loadSettings();
            }
            const lobbyReservations = yield this.fetchReservations(startDate, endDate);
            let syncedCount = 0;
            for (const lobbyReservation of lobbyReservations) {
                try {
                    yield this.syncReservation(lobbyReservation);
                    syncedCount++;
                }
                catch (error) {
                    const bookingId = String(lobbyReservation.booking_id || lobbyReservation.id || 'unknown');
                    console.error(`[LobbyPMS] Fehler beim Synchronisieren der Reservierung ${bookingId}:`, error);
                    // Erstelle Sync-History mit Fehler
                    const existingReservation = yield prisma_1.prisma.reservation.findUnique({
                        where: { lobbyReservationId: bookingId }
                    });
                    if (existingReservation) {
                        yield prisma_1.prisma.reservationSyncHistory.create({
                            data: {
                                reservationId: existingReservation.id,
                                syncType: 'error',
                                syncData: lobbyReservation,
                                errorMessage: error instanceof Error ? error.message : 'Unbekannter Fehler'
                            }
                        });
                    }
                }
            }
            return syncedCount;
        });
    }
    /**
     * Validiert die LobbyPMS API-Verbindung
     *
     * @returns true wenn Verbindung erfolgreich
     */
    validateConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            // Lade Settings falls noch nicht geladen
            if (!this.apiKey) {
                yield this.loadSettings();
            }
            try {
                // Versuche eine einfache API-Anfrage (z.B. Health Check oder Properties)
                yield this.axiosInstance.get('/health');
                return true;
            }
            catch (error) {
                // Wenn /health nicht existiert, versuche /properties
                try {
                    yield this.axiosInstance.get('/properties');
                    return true;
                }
                catch (_a) {
                    return false;
                }
            }
        });
    }
}
exports.LobbyPmsService = LobbyPmsService;
//# sourceMappingURL=lobbyPmsService.js.map