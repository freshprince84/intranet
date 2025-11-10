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
exports.SireService = void 0;
const axios_1 = __importDefault(require("axios"));
const client_1 = require("@prisma/client");
const encryption_1 = require("../utils/encryption");
const prisma = new client_1.PrismaClient();
/**
 * Service für SIRE Integration (Plataforma de la migración, Kolumbien)
 *
 * Bietet Funktionen zur automatischen Gästeregistrierung bei SIRE
 */
class SireService {
    /**
     * Erstellt eine neue SIRE Service-Instanz
     *
     * @param organizationId - ID der Organisation
     * @throws Error wenn SIRE nicht konfiguriert ist
     */
    constructor(organizationId) {
        this.enabled = false;
        this.autoRegisterOnCheckIn = false;
        this.organizationId = organizationId;
        // Settings werden beim ersten API-Call geladen (lazy loading)
    }
    /**
     * Lädt SIRE Settings aus der Organisation
     * Muss vor jedem API-Call aufgerufen werden
     */
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            const organization = yield prisma.organization.findUnique({
                where: { id: this.organizationId },
                select: { settings: true }
            });
            if (!(organization === null || organization === void 0 ? void 0 : organization.settings)) {
                throw new Error(`SIRE ist nicht für Organisation ${this.organizationId} konfiguriert`);
            }
            const settings = (0, encryption_1.decryptApiSettings)(organization.settings);
            const sireSettings = settings === null || settings === void 0 ? void 0 : settings.sire;
            if (!sireSettings) {
                throw new Error(`SIRE Settings sind nicht für Organisation ${this.organizationId} konfiguriert`);
            }
            this.enabled = sireSettings.enabled || false;
            this.autoRegisterOnCheckIn = sireSettings.autoRegisterOnCheckIn || false;
            this.apiUrl = sireSettings.apiUrl;
            this.apiKey = sireSettings.apiKey;
            this.apiSecret = sireSettings.apiSecret;
            this.propertyCode = sireSettings.propertyCode;
            if (this.enabled && (!this.apiUrl || !this.apiKey)) {
                throw new Error(`SIRE API URL oder API Key fehlt für Organisation ${this.organizationId}`);
            }
            // Erstelle Axios-Instanz wenn aktiviert
            if (this.enabled) {
                this.axiosInstance = this.createAxiosInstance();
            }
        });
    }
    /**
     * Erstellt eine konfigurierte Axios-Instanz für SIRE API-Requests
     */
    createAxiosInstance() {
        if (!this.apiUrl || !this.apiKey) {
            throw new Error('SIRE API URL oder API Key fehlt');
        }
        const instance = axios_1.default.create({
            baseURL: this.apiUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                // Alternative: 'X-API-Key': this.apiKey (je nach SIRE API)
            }
        });
        // Request Interceptor für Logging
        instance.interceptors.request.use((config) => {
            var _a;
            console.log(`[SIRE] ${(_a = config.method) === null || _a === void 0 ? void 0 : _a.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
            console.error('[SIRE] Request Error:', error);
            return Promise.reject(error);
        });
        // Response Interceptor für Error Handling
        instance.interceptors.response.use((response) => response, (error) => {
            var _a, _b, _c, _d;
            console.error('[SIRE] API Error:', {
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
     * Validiert, ob alle erforderlichen Daten für SIRE-Registrierung vorhanden sind
     */
    validateReservationData(reservation) {
        const missingFields = [];
        if (!reservation.guestName) {
            missingFields.push('guestName');
        }
        if (!reservation.guestNationality) {
            missingFields.push('guestNationality');
        }
        if (!reservation.guestPassportNumber) {
            missingFields.push('guestPassportNumber');
        }
        if (!reservation.guestBirthDate) {
            missingFields.push('guestBirthDate');
        }
        if (!reservation.checkInDate) {
            missingFields.push('checkInDate');
        }
        if (!reservation.checkOutDate) {
            missingFields.push('checkOutDate');
        }
        if (!reservation.roomNumber) {
            missingFields.push('roomNumber');
        }
        return {
            valid: missingFields.length === 0,
            missingFields
        };
    }
    /**
     * Registriert einen Gast bei SIRE
     * Wird automatisch beim Check-in aufgerufen (wenn aktiviert)
     *
     * @param reservation - Reservierung mit Gästedaten
     * @returns Registrierungsergebnis
     */
    registerGuest(reservation) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            // Lade Settings falls noch nicht geladen
            if (!this.apiKey && !this.apiUrl) {
                yield this.loadSettings();
            }
            try {
                if (!this.enabled) {
                    return {
                        success: false,
                        error: 'SIRE ist für diese Organisation nicht aktiviert'
                    };
                }
                if (!this.axiosInstance) {
                    return {
                        success: false,
                        error: 'SIRE Service nicht initialisiert'
                    };
                }
                // Validiere erforderliche Daten
                const validation = this.validateReservationData(reservation);
                if (!validation.valid) {
                    return {
                        success: false,
                        error: `Fehlende erforderliche Daten: ${validation.missingFields.join(', ')}`
                    };
                }
                // Erstelle SIRE-Registrierungsanfrage
                const registrationData = {
                    property_code: this.propertyCode,
                    guest: {
                        name: reservation.guestName,
                        nationality: reservation.guestNationality,
                        passport_number: reservation.guestPassportNumber,
                        birth_date: (_a = reservation.guestBirthDate) === null || _a === void 0 ? void 0 : _a.toISOString().split('T')[0], // YYYY-MM-DD
                        email: reservation.guestEmail || undefined,
                        phone: reservation.guestPhone || undefined
                    },
                    stay: {
                        check_in_date: reservation.checkInDate.toISOString().split('T')[0], // YYYY-MM-DD
                        check_out_date: reservation.checkOutDate.toISOString().split('T')[0],
                        room_number: reservation.roomNumber
                    }
                };
                // Sende an SIRE API
                const response = yield this.axiosInstance.post('/registrations', registrationData);
                if (response.data.success && response.data.registrationId) {
                    // Speichere Registrierungs-ID in Reservierung
                    yield prisma.reservation.update({
                        where: { id: reservation.id },
                        data: {
                            sireRegistered: true,
                            sireRegistrationId: response.data.registrationId,
                            sireRegisteredAt: new Date(),
                            sireRegistrationError: null
                        }
                    });
                    console.log(`[SIRE] Gast ${reservation.guestName} erfolgreich registriert: ${response.data.registrationId}`);
                    return {
                        success: true,
                        registrationId: response.data.registrationId
                    };
                }
                // Fallback: Prüfe ob Registration ID direkt im Response ist
                if (response.data.registrationId) {
                    const registrationId = response.data.registrationId;
                    yield prisma.reservation.update({
                        where: { id: reservation.id },
                        data: {
                            sireRegistered: true,
                            sireRegistrationId: registrationId,
                            sireRegisteredAt: new Date(),
                            sireRegistrationError: null
                        }
                    });
                    return {
                        success: true,
                        registrationId
                    };
                }
                const errorMessage = response.data.error || response.data.message || 'Unbekannter Fehler bei SIRE-Registrierung';
                // Speichere Fehler in Reservierung
                yield prisma.reservation.update({
                    where: { id: reservation.id },
                    data: {
                        sireRegistered: false,
                        sireRegistrationError: errorMessage
                    }
                });
                return {
                    success: false,
                    error: errorMessage
                };
            }
            catch (error) {
                const errorMessage = axios_1.default.isAxiosError(error)
                    ? ((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) ||
                        ((_e = (_d = error.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.message) ||
                        `SIRE API Fehler: ${error.message}`
                    : error instanceof Error
                        ? error.message
                        : 'Unbekannter Fehler';
                // Speichere Fehler in Reservierung
                yield prisma.reservation.update({
                    where: { id: reservation.id },
                    data: {
                        sireRegistered: false,
                        sireRegistrationError: errorMessage
                    }
                });
                console.error(`[SIRE] Fehler bei Registrierung für Reservierung ${reservation.id}:`, errorMessage);
                return {
                    success: false,
                    error: errorMessage
                };
            }
        });
    }
    /**
     * Aktualisiert eine bestehende SIRE-Registrierung
     *
     * @param registrationId - SIRE Registrierungs-ID
     * @param reservation - Aktualisierte Reservierungsdaten
     * @returns true wenn erfolgreich
     */
    updateRegistration(registrationId, reservation) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Lade Settings falls noch nicht geladen
            if (!this.apiKey && !this.apiUrl) {
                yield this.loadSettings();
            }
            try {
                if (!this.enabled || !this.axiosInstance) {
                    throw new Error('SIRE Service nicht aktiviert oder nicht initialisiert');
                }
                const registrationData = {
                    property_code: this.propertyCode,
                    guest: {
                        name: reservation.guestName,
                        nationality: reservation.guestNationality,
                        passport_number: reservation.guestPassportNumber,
                        birth_date: (_a = reservation.guestBirthDate) === null || _a === void 0 ? void 0 : _a.toISOString().split('T')[0],
                        email: reservation.guestEmail || undefined,
                        phone: reservation.guestPhone || undefined
                    },
                    stay: {
                        check_in_date: reservation.checkInDate.toISOString().split('T')[0],
                        check_out_date: reservation.checkOutDate.toISOString().split('T')[0],
                        room_number: reservation.roomNumber
                    }
                };
                const response = yield this.axiosInstance.put(`/registrations/${registrationId}`, registrationData);
                if (response.data.success) {
                    yield prisma.reservation.update({
                        where: { id: reservation.id },
                        data: {
                            sireRegisteredAt: new Date(),
                            sireRegistrationError: null
                        }
                    });
                    return true;
                }
                throw new Error(response.data.error || response.data.message || 'Fehler beim Aktualisieren der Registrierung');
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
                console.error(`[SIRE] Fehler beim Aktualisieren der Registrierung ${registrationId}:`, errorMessage);
                yield prisma.reservation.update({
                    where: { id: reservation.id },
                    data: {
                        sireRegistrationError: errorMessage
                    }
                });
                return false;
            }
        });
    }
    /**
     * Meldet einen Gast bei SIRE ab (bei Check-out)
     *
     * @param registrationId - SIRE Registrierungs-ID
     * @returns true wenn erfolgreich
     */
    unregisterGuest(registrationId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Lade Settings falls noch nicht geladen
            if (!this.apiKey && !this.apiUrl) {
                yield this.loadSettings();
            }
            try {
                if (!this.enabled || !this.axiosInstance) {
                    throw new Error('SIRE Service nicht aktiviert oder nicht initialisiert');
                }
                const response = yield this.axiosInstance.delete(`/registrations/${registrationId}`);
                if (response.data.success) {
                    // Finde Reservierung und aktualisiere Status
                    const reservation = yield prisma.reservation.findFirst({
                        where: { sireRegistrationId: registrationId }
                    });
                    if (reservation) {
                        yield prisma.reservation.update({
                            where: { id: reservation.id },
                            data: {
                                sireRegistered: false,
                                sireRegistrationId: null
                            }
                        });
                    }
                    return true;
                }
                throw new Error(response.data.error || response.data.message || 'Fehler beim Abmelden');
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
                console.error(`[SIRE] Fehler beim Abmelden der Registrierung ${registrationId}:`, errorMessage);
                return false;
            }
        });
    }
    /**
     * Prüft den Status einer Registrierung
     *
     * @param registrationId - SIRE Registrierungs-ID
     * @returns Registrierungsstatus
     */
    getRegistrationStatus(registrationId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Lade Settings falls noch nicht geladen
            if (!this.apiKey && !this.apiUrl) {
                yield this.loadSettings();
            }
            try {
                if (!this.enabled || !this.axiosInstance) {
                    throw new Error('SIRE Service nicht aktiviert oder nicht initialisiert');
                }
                const response = yield this.axiosInstance.get(`/registrations/${registrationId}/status`);
                if (response.data.success) {
                    return {
                        status: 'registered',
                        lastUpdated: new Date(),
                        registrationId
                    };
                }
                return {
                    status: 'error',
                    lastUpdated: new Date(),
                    registrationId,
                    error: response.data.error || response.data.message
                };
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
                console.error(`[SIRE] Fehler beim Abrufen des Status für ${registrationId}:`, errorMessage);
                return {
                    status: 'error',
                    lastUpdated: new Date(),
                    registrationId,
                    error: errorMessage
                };
            }
        });
    }
}
exports.SireService = SireService;
//# sourceMappingURL=sireService.js.map