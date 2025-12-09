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
exports.LobbyPmsService = void 0;
exports.findBranchByPropertyId = findBranchByPropertyId;
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const encryption_1 = require("../utils/encryption");
const taskAutomationService_1 = require("./taskAutomationService");
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
/**
 * Findet Branch-ID über LobbyPMS property_id UND apiKey
 * WICHTIG: Da mehrere Branches die gleiche propertyId haben können, muss auch der apiKey geprüft werden!
 * @param propertyId - LobbyPMS Property ID
 * @param apiKey - LobbyPMS API Key (optional, aber empfohlen für eindeutige Zuordnung)
 * @param organizationId - Organisation ID (optional, für bessere Performance)
 * @returns Branch-ID oder null
 */
function findBranchByPropertyId(propertyId, apiKey, organizationId) {
    return __awaiter(this, void 0, void 0, function* () {
        const branches = yield prisma_1.prisma.branch.findMany({
            where: organizationId ? { organizationId } : undefined,
            select: { id: true, lobbyPmsSettings: true }
        });
        // Wenn apiKey vorhanden, prüfe auch diesen für eindeutige Zuordnung
        if (apiKey) {
            for (const branch of branches) {
                if (branch.lobbyPmsSettings) {
                    try {
                        const settings = (0, encryption_1.decryptBranchApiSettings)(branch.lobbyPmsSettings);
                        const lobbyPmsSettings = (settings === null || settings === void 0 ? void 0 : settings.lobbyPms) || settings;
                        const propertyIdMatch = (lobbyPmsSettings === null || lobbyPmsSettings === void 0 ? void 0 : lobbyPmsSettings.propertyId) === propertyId || String(lobbyPmsSettings === null || lobbyPmsSettings === void 0 ? void 0 : lobbyPmsSettings.propertyId) === String(propertyId);
                        const apiKeyMatch = (lobbyPmsSettings === null || lobbyPmsSettings === void 0 ? void 0 : lobbyPmsSettings.apiKey) === apiKey;
                        if (propertyIdMatch && apiKeyMatch) {
                            return branch.id;
                        }
                    }
                    catch (error) {
                        // Ignoriere Entschlüsselungsfehler
                    }
                }
            }
        }
        // Fallback: Nur propertyId prüfen (sollte jetzt eindeutig sein)
        for (const branch of branches) {
            if (branch.lobbyPmsSettings) {
                try {
                    const settings = (0, encryption_1.decryptBranchApiSettings)(branch.lobbyPmsSettings);
                    const lobbyPmsSettings = (settings === null || settings === void 0 ? void 0 : settings.lobbyPms) || settings;
                    if ((lobbyPmsSettings === null || lobbyPmsSettings === void 0 ? void 0 : lobbyPmsSettings.propertyId) === propertyId || String(lobbyPmsSettings === null || lobbyPmsSettings === void 0 ? void 0 : lobbyPmsSettings.propertyId) === String(propertyId)) {
                        return branch.id;
                    }
                }
                catch (error) {
                    // Ignoriere Entschlüsselungsfehler
                }
            }
        }
        return null;
    });
}
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
            baseURL: 'https://api.lobbypms.com', // Placeholder, wird in loadSettings überschrieben
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
                            logger_1.logger.log(`[LobbyPMS] Verwende Branch-spezifische Settings für Branch ${this.branchId}`);
                            return; // Erfolgreich geladen
                        }
                    }
                    catch (error) {
                        logger_1.logger.warn(`[LobbyPMS] Fehler beim Laden der Branch Settings:`, error);
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
            logger_1.logger.log(`[LobbyPMS] ${(_a = config.method) === null || _a === void 0 ? void 0 : _a.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
            logger_1.logger.error('[LobbyPMS] Request Error:', error);
            return Promise.reject(error);
        });
        // Response Interceptor für Error Handling
        instance.interceptors.response.use((response) => response, (error) => {
            var _a, _b, _c, _d;
            logger_1.logger.error('[LobbyPMS] API Error:', {
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
     * Formatiert Datum als YYYY-MM-DD
     */
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    /**
     * Prüft Zimmerverfügbarkeit für einen Zeitraum
     *
     * @param startDate - Check-in Datum (inklusive)
     * @param endDate - Check-out Datum (inklusive)
     * @returns Array von verfügbaren Zimmern mit Preisen
     */
    checkAvailability(startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            // Lade Settings falls noch nicht geladen
            if (!this.apiKey) {
                yield this.loadSettings();
            }
            try {
                // Parameter basierend auf Test-Ergebnissen
                // WICHTIG: start_date UND end_date sind ERFORDERLICH!
                const params = {
                    start_date: this.formatDate(startDate), // Format: "YYYY-MM-DD"
                    end_date: this.formatDate(endDate) // Format: "YYYY-MM-DD"
                };
                if (this.propertyId) {
                    params.property_id = this.propertyId; // Optional
                }
                // WICHTIG: room_type Parameter wird ignoriert (aus Tests bekannt)
                // Stattdessen: Filtere nach category_id oder name
                const response = yield this.axiosInstance.get('/api/v2/available-rooms', { params });
                // Response-Struktur basierend auf Test-Ergebnissen
                // Struktur: { data: [{ date: "...", categories: [...] }] }
                const responseData = response.data.data || [];
                // Flache alle Kategorien für alle Daten
                const allCategories = [];
                for (const dateEntry of responseData) {
                    const date = dateEntry.date;
                    const categories = dateEntry.categories || [];
                    // Debug: Logge alle Kategorien für diesen Tag
                    logger_1.logger.log(`[LobbyPMS] Datum ${date}: ${categories.length} Kategorien gefunden`);
                    for (const cat of categories) {
                        logger_1.logger.log(`[LobbyPMS]   - ${cat.category_id}: ${cat.name}, available_rooms: ${cat.available_rooms || 0}`);
                    }
                    for (const category of categories) {
                        // Hole Preis für 1 Person (Standard)
                        const priceForOnePerson = (_c = (_b = (_a = category.plans) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.prices) === null || _c === void 0 ? void 0 : _c.find((p) => p.people === 1);
                        const price = (priceForOnePerson === null || priceForOnePerson === void 0 ? void 0 : priceForOnePerson.value) || 0;
                        // Bestimme room_type aus Namen oder category_id
                        // Heuristik: Namen mit "Dorm", "Compartida" = compartida, sonst privada
                        const name = ((_d = category.name) === null || _d === void 0 ? void 0 : _d.toLowerCase()) || '';
                        let roomType = 'privada';
                        // Compartida: category_id 34280 (El primo aventurero), 34281 (La tia artista), 34282 (El abuelo viajero)
                        if (name.includes('dorm') || name.includes('compartida') ||
                            category.category_id === 34280 || category.category_id === 34281 || category.category_id === 34282) {
                            roomType = 'compartida';
                        }
                        // WICHTIG: Füge ALLE Kategorien hinzu, auch wenn available_rooms = 0 (für Debugging)
                        allCategories.push({
                            categoryId: category.category_id,
                            roomName: category.name,
                            roomType: roomType,
                            availableRooms: category.available_rooms || 0,
                            pricePerNight: price,
                            currency: 'COP', // Standard aus Tests
                            date: date,
                            prices: ((_f = (_e = category.plans) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.prices) || [] // Alle Preise (verschiedene Personenanzahl)
                        });
                        // Debug: Spezifisch für "apartamento doble" und "primo deportista"
                        if (name.includes('apartamento doble') || name.includes('primo deportista')) {
                            logger_1.logger.log(`[LobbyPMS] ⚠️ Apartamento doble / Primo deportista: category_id=${category.category_id}, name=${category.name}, roomType=${roomType}, available_rooms=${category.available_rooms || 0}, date=${date}`);
                        }
                    }
                }
                return allCategories;
            }
            catch (error) {
                // Fehlerbehandlung basierend auf Test-Ergebnissen
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    throw new Error(((_h = (_g = axiosError.response) === null || _g === void 0 ? void 0 : _g.data) === null || _h === void 0 ? void 0 : _h.error) ||
                        ((_k = (_j = axiosError.response) === null || _j === void 0 ? void 0 : _j.data) === null || _k === void 0 ? void 0 : _k.message) ||
                        `LobbyPMS API Fehler: ${axiosError.message}`);
                }
                throw error;
            }
        });
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
                // PROBLEM: creation_date_from Filter funktioniert nicht korrekt in der API
                // Die API gibt nicht alle Reservierungen zurück, die nach creation_date_from erstellt wurden
                // LÖSUNG: Hole alle Reservierungen mit Pagination OHNE creation_date_from Filter und filtere client-seitig
                const params = {
                    per_page: 100, // Maximal 100 pro Seite
                };
                if (this.propertyId) {
                    params.property_id = this.propertyId;
                }
                // OPTIMIERUNG: Hole Seiten mit Pagination und stoppe früher wenn keine neuen Reservierungen mehr kommen
                // Da die API keine Filter-Parameter unterstützt, filtern wir inline und stoppen nach X Seiten ohne neue Reservierungen
                let allReservations = [];
                let page = 1;
                let hasMore = true;
                const maxPages = 5; // ✅ MEMORY: Reduziert von 200 auf 5 (für regelmäßigen Sync reichen max. 5 Seiten)
                let knownTotalPages = undefined; // Speichere totalPages aus erster Response
                let consecutiveOldPages = 0; // Zähler für aufeinanderfolgende "alte" Seiten
                const MAX_CONSECUTIVE_OLD_PAGES = 1; // ✅ MEMORY: Reduziert von 3 auf 1 (API ist nach creation_date DESC sortiert, 1 Seite reicht)
                while (hasMore && page <= maxPages) {
                    const response = yield this.axiosInstance.get('/api/v1/bookings', {
                        params: Object.assign(Object.assign({}, params), { page }),
                        validateStatus: (status) => status < 500 // Akzeptiere 4xx als gültige Antwort
                    });
                    // Prüfe ob Response HTML ist (404-Seite)
                    const responseData = response.data;
                    if (typeof responseData === 'string' && responseData.includes('<!DOCTYPE')) {
                        throw new Error('LobbyPMS API Endpoint nicht gefunden. Bitte prüfe die API-Dokumentation für den korrekten Endpoint.');
                    }
                    // LobbyPMS gibt { data: [...], meta: {...} } zurück
                    let pageReservations = [];
                    if (responseData && typeof responseData === 'object' && responseData.data && Array.isArray(responseData.data)) {
                        pageReservations = responseData.data;
                    }
                    else if (Array.isArray(responseData)) {
                        pageReservations = responseData;
                    }
                    else if (responseData && typeof responseData === 'object' && responseData.success && responseData.data) {
                        pageReservations = responseData.data;
                    }
                    else {
                        // Debug: Zeige Response-Struktur (nur wenn nicht HTML)
                        if (typeof responseData !== 'string') {
                            logger_1.logger.error('[LobbyPMS] Unerwartete Response-Struktur:', JSON.stringify(responseData, null, 2));
                        }
                        throw new Error((responseData && typeof responseData === 'object' && responseData.error) ||
                            (responseData && typeof responseData === 'object' && responseData.message) ||
                            'Unbekannter Fehler beim Abrufen der Reservierungen');
                    }
                    // OPTIMIERUNG: Filtere sofort nach creation_date (statt erst am Ende)
                    const recentReservations = pageReservations.filter((reservation) => {
                        if (!reservation.creation_date) {
                            return false;
                        }
                        const creationDate = new Date(reservation.creation_date);
                        const afterStartDate = creationDate >= startDate;
                        const beforeEndDate = !endDate || creationDate <= endDate;
                        return afterStartDate && beforeEndDate;
                    });
                    // Prüfe ob neue Reservierungen gefunden wurden
                    if (recentReservations.length > 0) {
                        // Neue Reservierungen gefunden - füge hinzu
                        allReservations = allReservations.concat(recentReservations);
                        consecutiveOldPages = 0; // Reset Counter
                        logger_1.logger.log(`[LobbyPMS] Seite ${page}: ${recentReservations.length} neue Reservierungen (von ${pageReservations.length} insgesamt)`);
                    }
                    else {
                        // Keine neuen Reservierungen auf dieser Seite
                        consecutiveOldPages++;
                        logger_1.logger.log(`[LobbyPMS] Seite ${page}: 0 neue Reservierungen (${consecutiveOldPages}/${MAX_CONSECUTIVE_OLD_PAGES} aufeinanderfolgende "alte" Seiten)`);
                        // OPTIMIERUNG: Stoppe nach X Seiten ohne neue Reservierungen
                        if (consecutiveOldPages >= MAX_CONSECUTIVE_OLD_PAGES) {
                            logger_1.logger.log(`[LobbyPMS] Stoppe Pagination: ${MAX_CONSECUTIVE_OLD_PAGES} aufeinanderfolgende Seiten ohne neue Reservierungen`);
                            hasMore = false;
                            break;
                        }
                    }
                    // Prüfe ob es weitere Seiten gibt
                    const meta = responseData.meta || {};
                    const totalPages = meta.total_pages;
                    const currentPage = meta.current_page || page;
                    const perPage = meta.per_page || params.per_page || 100;
                    // Speichere totalPages aus erster Response (falls vorhanden)
                    if (totalPages !== undefined && knownTotalPages === undefined) {
                        knownTotalPages = totalPages;
                    }
                    // Verwende bekannte totalPages falls in aktueller Response nicht vorhanden
                    const effectiveTotalPages = totalPages !== undefined ? totalPages : knownTotalPages;
                    // Stoppe wenn:
                    // 1. Keine Reservierungen auf dieser Seite (leere Seite = Ende)
                    // 2. Weniger Reservierungen als per_page (letzte Seite)
                    // 3. totalPages ist bekannt UND page >= totalPages (NACH dem Erhöhen von page)
                    if (pageReservations.length === 0) {
                        hasMore = false;
                    }
                    else if (pageReservations.length < perPage) {
                        // Weniger als per_page = letzte Seite
                        hasMore = false;
                    }
                    else if (effectiveTotalPages !== undefined && page >= effectiveTotalPages) {
                        // WICHTIG: Prüfe VOR dem Erhöhen, ob nächste Seite noch existiert
                        hasMore = false;
                    }
                    else {
                        page++;
                        // Prüfe NACH dem Erhöhen, ob wir die letzte Seite erreicht haben
                        if (effectiveTotalPages !== undefined && page > effectiveTotalPages) {
                            hasMore = false;
                        }
                    }
                    // Debug-Log für Pagination (bei ersten 5 Seiten oder wenn totalPages erreicht)
                    if (page <= 5 || (effectiveTotalPages !== undefined && page >= effectiveTotalPages)) {
                        logger_1.logger.log(`[LobbyPMS] Seite ${page - 1}: ${pageReservations.length} Reservierungen, totalPages: ${effectiveTotalPages || 'N/A'}, hasMore: ${hasMore}`);
                    }
                }
                // Reservierungen sind bereits gefiltert (inline)
                return allReservations;
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
     * Ruft Reservierungen nach check_out_date ab (für ersten Sync)
     *
     * Lädt alle Reservierungen mit check_out_date >= yesterday
     * Durchsucht alle Seiten bis 3 aufeinanderfolgende Seiten ohne passende Reservierungen gefunden werden
     *
     * @param yesterday - Gestern (Anfang des Tages)
     * @returns Array von Reservierungen mit check_out_date >= yesterday
     */
    fetchReservationsByCheckoutDate(yesterday) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            // Lade Settings falls noch nicht geladen
            if (!this.apiKey) {
                yield this.loadSettings();
            }
            try {
                // PROBLEM: API unterstützt keine Filter-Parameter für check_out_date
                // LÖSUNG: Hole alle Reservierungen mit Pagination und filtere client-seitig nach check_out_date
                const params = {
                    per_page: 100, // Maximal 100 pro Seite
                };
                if (this.propertyId) {
                    params.property_id = this.propertyId;
                }
                // OPTIMIERUNG: Hole Seiten mit Pagination
                // WICHTIG: Für vollständigen Sync müssen ALLE Seiten durchsucht werden, auch wenn dazwischen Seiten ohne passende Reservierungen sind
                let allReservations = [];
                let page = 1;
                let hasMore = true;
                const maxPages = 200; // Sicherheitslimit (20.000 Reservierungen max) - für ersten Sync müssen alle Seiten durchsucht werden
                let knownTotalPages = undefined;
                while (hasMore && page <= maxPages) {
                    const response = yield this.axiosInstance.get('/api/v1/bookings', {
                        params: Object.assign(Object.assign({}, params), { page }),
                        validateStatus: (status) => status < 500
                    });
                    // Prüfe ob Response HTML ist (404-Seite)
                    const responseData = response.data;
                    if (typeof responseData === 'string' && responseData.includes('<!DOCTYPE')) {
                        throw new Error('LobbyPMS API Endpoint nicht gefunden. Bitte prüfe die API-Dokumentation für den korrekten Endpoint.');
                    }
                    // LobbyPMS gibt { data: [...], meta: {...} } zurück
                    let pageReservations = [];
                    if (responseData && typeof responseData === 'object' && responseData.data && Array.isArray(responseData.data)) {
                        pageReservations = responseData.data;
                    }
                    else if (Array.isArray(responseData)) {
                        pageReservations = responseData;
                    }
                    else if (responseData && typeof responseData === 'object' && responseData.success && responseData.data) {
                        pageReservations = responseData.data;
                    }
                    else {
                        if (typeof responseData !== 'string') {
                            logger_1.logger.error('[LobbyPMS] Unerwartete Response-Struktur:', JSON.stringify(responseData, null, 2));
                        }
                        throw new Error((responseData && typeof responseData === 'object' && responseData.error) ||
                            (responseData && typeof responseData === 'object' && responseData.message) ||
                            'Unbekannter Fehler beim Abrufen der Reservierungen');
                    }
                    // OPTIMIERUNG: Filtere sofort nach check_out_date (statt erst am Ende)
                    // WICHTIG: API gibt end_date zurück, nicht check_out_date - verwende Fallback
                    const recentReservations = pageReservations.filter((reservation) => {
                        // Verwende check_out_date oder end_date (API gibt end_date zurück)
                        const checkOutDateString = reservation.check_out_date || reservation.end_date;
                        if (!checkOutDateString) {
                            return false; // Kein checkout_date/end_date = ignoriere
                        }
                        const checkOutDate = new Date(checkOutDateString);
                        // Nur Reservierungen mit checkout >= gestern
                        return checkOutDate >= yesterday;
                    });
                    // Prüfe ob passende Reservierungen gefunden wurden
                    if (recentReservations.length > 0) {
                        // Passende Reservierungen gefunden - füge hinzu
                        allReservations = allReservations.concat(recentReservations);
                        logger_1.logger.log(`[LobbyPMS] Seite ${page}: ${recentReservations.length} Reservierungen mit check_out_date >= gestern (von ${pageReservations.length} insgesamt)`);
                    }
                    else {
                        // Keine passenden Reservierungen auf dieser Seite
                        logger_1.logger.log(`[LobbyPMS] Seite ${page}: 0 Reservierungen mit check_out_date >= gestern (von ${pageReservations.length} insgesamt)`);
                        // WICHTIG: Stoppe NICHT hier - Reservierungen können auf späteren Seiten sein!
                        // Die API sortiert nicht nach check_out_date, daher können passende Reservierungen überall sein
                    }
                    // Prüfe ob es weitere Seiten gibt
                    const meta = responseData.meta || {};
                    const totalPages = meta.total_pages;
                    const currentPage = meta.current_page || page;
                    const perPage = meta.per_page || params.per_page || 100;
                    // Speichere totalPages aus erster Response (falls vorhanden)
                    if (totalPages !== undefined && knownTotalPages === undefined) {
                        knownTotalPages = totalPages;
                    }
                    // Verwende bekannte totalPages falls in aktueller Response nicht vorhanden
                    const effectiveTotalPages = totalPages !== undefined ? totalPages : knownTotalPages;
                    // Stoppe wenn:
                    // 1. Keine Reservierungen auf dieser Seite (leere Seite = Ende)
                    // 2. Weniger Reservierungen als per_page (letzte Seite)
                    // 3. totalPages ist bekannt UND page >= totalPages
                    if (pageReservations.length === 0) {
                        hasMore = false;
                    }
                    else if (pageReservations.length < perPage) {
                        hasMore = false;
                    }
                    else if (effectiveTotalPages !== undefined && page >= effectiveTotalPages) {
                        hasMore = false;
                    }
                    else {
                        page++;
                        if (effectiveTotalPages !== undefined && page > effectiveTotalPages) {
                            hasMore = false;
                        }
                    }
                    // Debug-Log für Pagination (bei ersten 5 Seiten oder wenn totalPages erreicht)
                    if (page <= 5 || (effectiveTotalPages !== undefined && page >= effectiveTotalPages)) {
                        logger_1.logger.log(`[LobbyPMS] Seite ${page - 1}: ${pageReservations.length} Reservierungen, totalPages: ${effectiveTotalPages || 'N/A'}, hasMore: ${hasMore}`);
                    }
                }
                // Reservierungen sind bereits gefiltert (inline)
                return allReservations;
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
     * Erstellt eine neue Reservierung in LobbyPMS
     *
     * @param categoryId - Category ID des Zimmers (erforderlich)
     * @param checkInDate - Check-in Datum
     * @param checkOutDate - Check-out Datum
     * @param guestName - Name des Gastes
     * @param guestEmail - E-Mail des Gastes (optional)
     * @param guestPhone - Telefonnummer des Gastes (optional)
     * @param guests - Anzahl Personen (optional, default: 1)
     * @returns LobbyPMS Booking ID
     */
    createBooking(categoryId_1, checkInDate_1, checkOutDate_1, guestName_1, guestEmail_1, guestPhone_1) {
        return __awaiter(this, arguments, void 0, function* (categoryId, checkInDate, checkOutDate, guestName, guestEmail, guestPhone, guests = 1) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            // Lade Settings falls noch nicht geladen
            if (!this.apiKey) {
                yield this.loadSettings();
            }
            try {
                // Payload basierend auf Test-Ergebnissen
                // WICHTIG: total_adults und holder_name sind ERFORDERLICH!
                const payload = {
                    category_id: categoryId,
                    start_date: this.formatDate(checkInDate), // Format: "YYYY-MM-DD"
                    end_date: this.formatDate(checkOutDate), // Format: "YYYY-MM-DD"
                    holder_name: guestName.trim(), // ERFORDERLICH: holder_name (nicht guest_name!)
                    total_adults: guests > 0 ? guests : 1 // ERFORDERLICH: Standard 1, falls nicht angegeben
                };
                // Optionale Felder
                if (guestEmail) {
                    payload.guest_email = guestEmail.trim();
                }
                if (guestPhone) {
                    payload.guest_phone = guestPhone.trim();
                }
                logger_1.logger.log(`[LobbyPMS] Erstelle Reservierung: category_id=${categoryId}, checkIn=${this.formatDate(checkInDate)}, checkOut=${this.formatDate(checkOutDate)}, guest=${guestName}`);
                const response = yield this.axiosInstance.post('/api/v1/bookings', payload);
                // Response-Struktur (aus Tests bekannt):
                // { booking: { booking_id: 18251865, room_id: 807372 } }
                let bookingId;
                // Prüfe verschiedene Response-Formate
                if ((_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.booking) === null || _b === void 0 ? void 0 : _b.booking_id) {
                    // Standard Response-Format: { booking: { booking_id: ..., room_id: ... } }
                    bookingId = String(response.data.booking.booking_id);
                }
                else if ((_c = response.data) === null || _c === void 0 ? void 0 : _c.booking_id) {
                    // Direktes booking_id im Root
                    bookingId = String(response.data.booking_id);
                }
                else if ((_e = (_d = response.data) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.booking_id) {
                    // Verschachteltes Format: { data: { booking_id: ... } }
                    bookingId = String(response.data.data.booking_id);
                }
                else if (response.data.id) {
                    // Fallback: id statt booking_id
                    bookingId = String(response.data.id);
                }
                if (!bookingId) {
                    logger_1.logger.error('[LobbyPMS] Unerwartete Response-Struktur:', JSON.stringify(response.data, null, 2));
                    throw new Error('LobbyPMS API hat keine booking_id zurückgegeben');
                }
                logger_1.logger.log(`[LobbyPMS] Reservierung erfolgreich erstellt: booking_id=${bookingId}`);
                return String(bookingId);
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    const axiosError = error;
                    const errorMessage = ((_g = (_f = axiosError.response) === null || _f === void 0 ? void 0 : _f.data) === null || _g === void 0 ? void 0 : _g.error) ||
                        (Array.isArray((_h = axiosError.response) === null || _h === void 0 ? void 0 : _h.data) ? ((_j = axiosError.response) === null || _j === void 0 ? void 0 : _j.data).join(', ') : undefined) ||
                        ((_l = (_k = axiosError.response) === null || _k === void 0 ? void 0 : _k.data) === null || _l === void 0 ? void 0 : _l.message) ||
                        `LobbyPMS API Fehler: ${axiosError.message}`;
                    logger_1.logger.error('[LobbyPMS] Fehler beim Erstellen der Reservierung:', errorMessage);
                    throw new Error(errorMessage);
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
     * Parst ein Datum als lokales Datum (ohne Zeitzone)
     * Verhindert UTC-Konvertierung bei Datumsstrings im Format YYYY-MM-DD
     *
     * @param dateString - Datumsstring (z.B. "2025-01-20" oder "2025-01-20T00:00:00Z")
     * @returns Date-Objekt als lokales Datum
     */
    parseLocalDate(dateString) {
        if (!dateString) {
            throw new Error('Datum-String ist leer');
        }
        // Wenn das Datum im Format YYYY-MM-DD ist (ohne Zeit), parse es als lokales Datum
        // Dies verhindert UTC-Konvertierung, die zu einem Tag-Versatz führt
        const dateOnlyMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
        if (dateOnlyMatch) {
            const [, year, month, day] = dateOnlyMatch;
            // new Date(year, monthIndex, day) erstellt ein lokales Datum (keine UTC-Konvertierung)
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        // Fallback: Normales Parsing für andere Formate
        return new Date(dateString);
    }
    /**
     * Synchronisiert eine LobbyPMS-Reservierung in die lokale Datenbank
     *
     * @param lobbyReservation - Reservierungsdaten von LobbyPMS
     * @returns Lokale Reservation
     */
    syncReservation(lobbyReservation) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // Mappe LobbyPMS Status zu unserem ReservationStatus
            // Unterstützt sowohl englische als auch spanische Status-Strings
            const mapStatus = (status) => {
                switch (status === null || status === void 0 ? void 0 : status.toLowerCase()) {
                    // Englische Status
                    case 'checked_in':
                        return client_1.ReservationStatus.checked_in;
                    case 'checked_out':
                        return client_1.ReservationStatus.checked_out;
                    case 'cancelled':
                        return client_1.ReservationStatus.cancelled;
                    case 'no_show':
                        return client_1.ReservationStatus.no_show;
                    // Spanische Status (LobbyPMS ist auf Spanisch)
                    case 'ingresado':
                    case 'check-in':
                        return client_1.ReservationStatus.checked_in;
                    case 'salido':
                    case 'check-out':
                        return client_1.ReservationStatus.checked_out;
                    case 'cancelado':
                        return client_1.ReservationStatus.cancelled;
                    case 'no_aparecio':
                    case 'no apareció':
                        return client_1.ReservationStatus.no_show;
                    case 'confirmado':
                        return client_1.ReservationStatus.confirmed;
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
            // Land aus holder.country extrahieren (für Sprache-basierte WhatsApp-Nachrichten)
            // WICHTIG: LobbyPMS verwendet 'country', nicht 'pais'!
            const guestNationality = holder.country || holder.pais || null;
            // Prüfe ob Gast Check-in-Link abgeschlossen hat (Dokumente hochgeladen)
            // Indikatoren:
            // 1. checkin_online = true (sicherster Indikator)
            // 2. holder.type_document + holder.document gefüllt (sehr wahrscheinlich)
            // WICHTIG: Stelle sicher, dass immer ein Boolean zurückgegeben wird
            const hasCompletedCheckInLink = Boolean(lobbyReservation.checkin_online === true ||
                (holder.type_document && holder.type_document !== '' &&
                    holder.document && holder.document !== ''));
            // Datum-Felder: API gibt start_date/end_date zurück
            // WICHTIG: Verwende parseLocalDate, um UTC-Konvertierung zu vermeiden
            // Die API gibt Datum als "YYYY-MM-DD" zurück, was als UTC interpretiert wird
            // und dann in der lokalen Zeitzone einen Tag zu früh angezeigt wird
            const checkInDateString = lobbyReservation.start_date || lobbyReservation.check_in_date;
            const checkOutDateString = lobbyReservation.end_date || lobbyReservation.check_out_date;
            if (!checkInDateString || !checkOutDateString) {
                throw new Error('Check-in oder Check-out Datum fehlt in der LobbyPMS-Reservierung');
            }
            const checkInDate = this.parseLocalDate(checkInDateString);
            const checkOutDate = this.parseLocalDate(checkOutDateString);
            // Zimmer-Daten aus assigned_room-Objekt
            // WICHTIG: Für Dorms (compartida) enthält assigned_room.name nur die Bettnummer,
            // der Zimmername steht in category.name. Für Privatzimmer (privada) steht der
            // Zimmername direkt in assigned_room.name.
            const assignedRoom = lobbyReservation.assigned_room;
            const isDorm = (assignedRoom === null || assignedRoom === void 0 ? void 0 : assignedRoom.type) === 'compartida';
            let roomNumber = null;
            let roomDescription = null;
            // Extrahiere categoryId für Zimmer-Beschreibungen
            const categoryId = ((_a = lobbyReservation.category) === null || _a === void 0 ? void 0 : _a.category_id) || null;
            if (isDorm) {
                // Für Dorms: category.name = Zimmername, assigned_room.name = Bettnummer
                const dormName = ((_b = lobbyReservation.category) === null || _b === void 0 ? void 0 : _b.name) || null;
                const bedNumber = (assignedRoom === null || assignedRoom === void 0 ? void 0 : assignedRoom.name) || null;
                // Für Dorms: roomNumber = Bettnummer, roomDescription = Zimmername
                roomNumber = bedNumber;
                roomDescription = dormName;
            }
            else {
                // Für Privatzimmer: assigned_room.name = Zimmername
                // roomNumber bleibt leer (nur bei Dorms gefüllt)
                roomNumber = null;
                // roomDescription = Zimmername
                roomDescription = (assignedRoom === null || assignedRoom === void 0 ? void 0 : assignedRoom.name) || lobbyReservation.room_number || null;
            }
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
            // Setze amount aus totalToPay (für Payment-Link-Erstellung)
            const amount = totalToPay > 0 ? totalToPay : null;
            // Setze currency (Standard: COP, könnte auch aus API kommen)
            const currency = lobbyReservation.currency || 'COP';
            // Hole Branch-ID: Verwende this.branchId (MUSS gesetzt sein!)
            // KEIN Fallback mehr, da dies zu falschen Branch-Zuordnungen führt
            if (!this.branchId) {
                throw new Error(`LobbyPmsService.syncReservation: branchId ist nicht gesetzt! Service muss mit createForBranch() erstellt werden.`);
            }
            const branchId = this.branchId;
            // Hole existierende Reservation um checkInDataUploaded-Status zu prüfen
            const existingReservation = yield prisma_1.prisma.reservation.findUnique({
                where: { lobbyReservationId: bookingId }
            });
            // Prüfe ob checkInDataUploaded bereits gesetzt war
            const wasAlreadyUploaded = (existingReservation === null || existingReservation === void 0 ? void 0 : existingReservation.checkInDataUploaded) || false;
            const isNowUploaded = hasCompletedCheckInLink;
            const checkInDataUploadedChanged = !wasAlreadyUploaded && isNowUploaded;
            const reservationData = {
                lobbyReservationId: bookingId,
                guestName: guestName,
                guestEmail: guestEmail,
                guestPhone: guestPhone,
                checkInDate: checkInDate,
                checkOutDate: checkOutDate,
                arrivalTime: lobbyReservation.arrival_time ? new Date(lobbyReservation.arrival_time) : null,
                roomNumber: roomNumber,
                roomDescription: roomDescription,
                categoryId: categoryId, // LobbyPMS category_id (für Zimmer-Beschreibungen)
                status: status,
                paymentStatus: paymentStatus,
                amount: amount,
                currency: currency,
                guestNationality: guestNationality, // Land für Sprache-basierte WhatsApp-Nachrichten
                checkInDataUploaded: isNowUploaded, // Setze wenn Check-in-Link abgeschlossen
                checkInDataUploadedAt: isNowUploaded && !wasAlreadyUploaded ? new Date() : (existingReservation === null || existingReservation === void 0 ? void 0 : existingReservation.checkInDataUploadedAt) || null,
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
                logger_1.logger.error(`[LobbyPMS] Fehler beim Erstellen des Tasks für Reservierung ${reservation.id}:`, error);
                // Fehler nicht weiterwerfen, da Task-Erstellung optional ist
            }
            // PIN-Versand: Wenn Check-in-Link abgeschlossen UND bezahlt → versende PIN
            if (checkInDataUploadedChanged && paymentStatus === client_1.PaymentStatus.paid && !reservation.doorPin) {
                try {
                    logger_1.logger.log(`[LobbyPMS] Check-in-Link abgeschlossen und bezahlt → versende PIN für Reservierung ${reservation.id}`);
                    const { ReservationNotificationService } = yield Promise.resolve().then(() => __importStar(require('./reservationNotificationService')));
                    yield ReservationNotificationService.generatePinAndSendNotification(reservation.id);
                }
                catch (error) {
                    logger_1.logger.error(`[LobbyPMS] Fehler beim Versenden der PIN für Reservierung ${reservation.id}:`, error);
                    // Fehler nicht weiterwerfen, da PIN-Versand optional ist
                }
            }
            return reservation;
        });
    }
    /**
     * Synchronisiert Reservierungen nach check_out_date (für ersten Sync)
     *
     * Lädt alle Reservierungen mit check_out_date >= gestern
     * Wird für manuellen ersten Sync verwendet
     *
     * @returns Anzahl synchronisierter Reservierungen
     */
    syncReservationsByCheckoutDate() {
        return __awaiter(this, void 0, void 0, function* () {
            // Lade Settings falls noch nicht geladen
            if (!this.apiKey) {
                yield this.loadSettings();
            }
            // Filter nach check_out_date >= gestern
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            logger_1.logger.log(`[LobbyPMS] Starte vollständigen Sync nach check_out_date >= ${yesterday.toISOString()}`);
            // Rufe fetchReservationsByCheckoutDate auf
            const lobbyReservations = yield this.fetchReservationsByCheckoutDate(yesterday);
            let syncedCount = 0;
            for (const lobbyReservation of lobbyReservations) {
                try {
                    yield this.syncReservation(lobbyReservation);
                    syncedCount++;
                }
                catch (error) {
                    const bookingId = String(lobbyReservation.booking_id || lobbyReservation.id || 'unknown');
                    logger_1.logger.error(`[LobbyPMS] Fehler beim Synchronisieren der Reservierung ${bookingId}:`, error);
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
            logger_1.logger.log(`[LobbyPMS] Vollständiger Sync abgeschlossen: ${syncedCount} Reservierungen synchronisiert`);
            return syncedCount;
        });
    }
    /**
     * Synchronisiert alle Reservierungen für einen Zeitraum
     *
     * @param startDate - Startdatum (creation_date_from)
     * @param endDate - Wird nicht mehr verwendet (nur für Kompatibilität)
     * @returns Anzahl synchronisierter Reservierungen
     */
    syncReservations(startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            // Lade Settings falls noch nicht geladen
            if (!this.apiKey) {
                yield this.loadSettings();
            }
            // WICHTIG: fetchReservations filtert jetzt nach creation_date, nicht nach Check-in!
            const lobbyReservations = yield this.fetchReservations(startDate, endDate || new Date());
            let syncedCount = 0;
            for (const lobbyReservation of lobbyReservations) {
                try {
                    yield this.syncReservation(lobbyReservation);
                    syncedCount++;
                }
                catch (error) {
                    const bookingId = String(lobbyReservation.booking_id || lobbyReservation.id || 'unknown');
                    logger_1.logger.error(`[LobbyPMS] Fehler beim Synchronisieren der Reservierung ${bookingId}:`, error);
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