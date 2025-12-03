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
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConnection = exports.handleWebhook = exports.checkInReservation = exports.syncReservations = exports.getReservationById = exports.getReservations = void 0;
const lobbyPmsService_1 = require("../services/lobbyPmsService");
const reservationTaskService_1 = require("../services/reservationTaskService");
const reservationNotificationService_1 = require("../services/reservationNotificationService");
const prisma_1 = require("../utils/prisma");
/**
 * GET /api/lobby-pms/reservations
 * Ruft Reservierungen ab (mit optionalen Filtern)
 */
const getReservations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { startDate, endDate, status } = req.query;
        const organizationId = req.organizationId;
        // Prüfe ob LobbyPMS für diese Organisation konfiguriert ist
        const organization = yield prisma_1.prisma.organization.findUnique({
            where: { id: organizationId },
            select: { settings: true }
        });
        if (!(organization === null || organization === void 0 ? void 0 : organization.settings)) {
            return res.status(400).json({
                message: 'LobbyPMS ist nicht für diese Organisation konfiguriert'
            });
        }
        const settings = organization.settings;
        if (!((_a = settings.lobbyPms) === null || _a === void 0 ? void 0 : _a.syncEnabled)) {
            return res.status(400).json({
                message: 'LobbyPMS Synchronisation ist nicht aktiviert'
            });
        }
        const service = new lobbyPmsService_1.LobbyPmsService(organizationId);
        let reservations;
        if (startDate && endDate) {
            // Zeitraum-basierte Abfrage
            const start = new Date(startDate);
            const end = new Date(endDate);
            reservations = yield service.fetchReservations(start, end);
        }
        else {
            // Standard: Nächste 7 Tage
            const start = new Date();
            const end = new Date();
            end.setDate(end.getDate() + 7);
            reservations = yield service.fetchReservations(start, end);
        }
        // Filtere nach Status wenn angegeben
        if (status) {
            reservations = reservations.filter(r => { var _a; return ((_a = r.status) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === status.toLowerCase(); });
        }
        // Hole lokale Reservierungen für Vergleich
        const localReservations = yield prisma_1.prisma.reservation.findMany({
            where: {
                organizationId,
                lobbyReservationId: {
                    in: reservations.map(r => r.id)
                }
            }
        });
        // Kombiniere Daten
        const combinedReservations = reservations.map(lobbyRes => {
            const localRes = localReservations.find(lr => lr.lobbyReservationId === lobbyRes.id);
            return Object.assign(Object.assign({}, lobbyRes), { localId: localRes === null || localRes === void 0 ? void 0 : localRes.id, synced: !!localRes, localStatus: localRes === null || localRes === void 0 ? void 0 : localRes.status, localPaymentStatus: localRes === null || localRes === void 0 ? void 0 : localRes.paymentStatus });
        });
        res.json({
            success: true,
            data: combinedReservations,
            count: combinedReservations.length
        });
    }
    catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Reservierungen'
        });
    }
});
exports.getReservations = getReservations;
/**
 * GET /api/lobby-pms/reservations/:id
 * Ruft Details einer spezifischen Reservierung ab
 */
const getReservationById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const organizationId = req.organizationId;
        const service = new lobbyPmsService_1.LobbyPmsService(organizationId);
        const lobbyReservation = yield service.fetchReservationById(id);
        // Hole lokale Reservierung falls vorhanden
        const localReservation = yield prisma_1.prisma.reservation.findUnique({
            where: { lobbyReservationId: id },
            include: {
                task: true,
                syncHistory: {
                    orderBy: { syncedAt: 'desc' },
                    take: 10
                }
            }
        });
        res.json({
            success: true,
            data: {
                lobby: lobbyReservation,
                local: localReservation,
                synced: !!localReservation
            }
        });
    }
    catch (error) {
        console.error('Error fetching reservation:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Reservierung'
        });
    }
});
exports.getReservationById = getReservationById;
/**
 * POST /api/lobby-pms/sync
 * Manuelle Synchronisation von Reservierungen
 *
 * Sync alle Branches der Organisation (wie automatischer Scheduler)
 * Mit Fallback auf Organisation-Settings
 */
const syncReservations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { startDate, endDate, reservationIds } = req.body;
        const organizationId = req.organizationId;
        // Wenn spezifische Reservierungen: Finde Branch über property_id
        if (reservationIds && Array.isArray(reservationIds)) {
            const { findBranchByPropertyId } = yield Promise.resolve().then(() => __importStar(require('../services/lobbyPmsService')));
            let syncedCount = 0;
            let errors = [];
            // Erstelle temporären Service für fetchReservationById (ohne branchId)
            const tempService = new lobbyPmsService_1.LobbyPmsService(organizationId);
            // Lade Settings, damit apiKey verfügbar ist
            yield tempService.loadSettings();
            for (const reservationId of reservationIds) {
                try {
                    const lobbyReservation = yield tempService.fetchReservationById(reservationId);
                    // Finde Branch über property_id UND apiKey (für eindeutige Zuordnung)
                    // WICHTIG: Da beide Branches die gleiche propertyId haben können, muss auch der apiKey geprüft werden
                    const branchId = lobbyReservation.property_id
                        ? yield findBranchByPropertyId(lobbyReservation.property_id, tempService.apiKey, // API Key aus Service
                        organizationId)
                        : null;
                    if (!branchId) {
                        errors.push(`Reservierung ${reservationId}: Keine Branch gefunden für property_id ${lobbyReservation.property_id}`);
                        continue;
                    }
                    // Erstelle Service mit branchId
                    const service = yield lobbyPmsService_1.LobbyPmsService.createForBranch(branchId);
                    yield service.syncReservation(lobbyReservation);
                    syncedCount++;
                }
                catch (error) {
                    errors.push(`Reservierung ${reservationId}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
                }
            }
            return res.json({
                success: true,
                syncedCount,
                errors: errors.length > 0 ? errors : undefined
            });
        }
        // NEU: Sync alle Branches der Organisation (wie automatischer Scheduler)
        const { LobbyPmsReservationSyncService } = yield Promise.resolve().then(() => __importStar(require('../services/lobbyPmsReservationSyncService')));
        // Hole alle Branches der Organisation
        const branches = yield prisma_1.prisma.branch.findMany({
            where: {
                organizationId: organizationId
            },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        settings: true
                    }
                }
            }
        });
        let totalSynced = 0;
        const branchResults = [];
        // Sync jede Branch (wie im automatischen Scheduler)
        for (const branch of branches) {
            try {
                // Prüfe ob LobbyPMS Sync aktiviert ist (gleiche Logik wie Scheduler)
                const branchSettings = branch.lobbyPmsSettings;
                const orgSettings = (_a = branch.organization) === null || _a === void 0 ? void 0 : _a.settings;
                const { decryptBranchApiSettings, decryptApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                const decryptedBranchSettings = branchSettings ? decryptBranchApiSettings(branchSettings) : null;
                const decryptedOrgSettings = orgSettings ? decryptApiSettings(orgSettings) : null;
                const lobbyPmsSettings = decryptedBranchSettings || (decryptedOrgSettings === null || decryptedOrgSettings === void 0 ? void 0 : decryptedOrgSettings.lobbyPms);
                if (!(lobbyPmsSettings === null || lobbyPmsSettings === void 0 ? void 0 : lobbyPmsSettings.apiKey)) {
                    branchResults.push({
                        branchId: branch.id,
                        branchName: branch.name,
                        syncedCount: 0,
                        error: 'Kein LobbyPMS API Key konfiguriert'
                    });
                    continue; // Kein API Key konfiguriert
                }
                if (lobbyPmsSettings.syncEnabled === false) {
                    branchResults.push({
                        branchId: branch.id,
                        branchName: branch.name,
                        syncedCount: 0,
                        error: 'LobbyPMS Sync ist deaktiviert'
                    });
                    continue; // Sync deaktiviert
                }
                // Synchronisiere Reservierungen für diesen Branch
                const syncStartDate = startDate ? new Date(startDate) : undefined;
                const syncEndDate = endDate ? new Date(endDate) : undefined;
                const syncedCount = yield LobbyPmsReservationSyncService.syncReservationsForBranch(branch.id, syncStartDate, syncEndDate);
                totalSynced += syncedCount;
                branchResults.push({
                    branchId: branch.id,
                    branchName: branch.name,
                    syncedCount: syncedCount
                });
            }
            catch (error) {
                branchResults.push({
                    branchId: branch.id,
                    branchName: branch.name,
                    syncedCount: 0,
                    error: error instanceof Error ? error.message : 'Unbekannter Fehler'
                });
                // Weiter mit nächster Branch
            }
        }
        res.json({
            success: true,
            syncedCount: totalSynced,
            branchResults: branchResults,
            errors: branchResults.filter(r => r.error).map(r => `${r.branchName}: ${r.error}`)
        });
    }
    catch (error) {
        console.error('Error syncing reservations:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Synchronisieren der Reservierungen'
        });
    }
});
exports.syncReservations = syncReservations;
/**
 * PUT /api/lobby-pms/reservations/:id/check-in
 * Führt Check-in durch (aktualisiert Status in LobbyPMS und lokal)
 */
const checkInReservation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const organizationId = req.organizationId;
        // Hole lokale Reservierung
        const localReservation = yield prisma_1.prisma.reservation.findUnique({
            where: { lobbyReservationId: id },
            include: { task: true, branch: true }
        });
        if (!localReservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservierung nicht gefunden'
            });
        }
        // Aktualisiere Status in LobbyPMS
        const service = localReservation.branchId
            ? yield lobbyPmsService_1.LobbyPmsService.createForBranch(localReservation.branchId)
            : new lobbyPmsService_1.LobbyPmsService(organizationId);
        try {
            yield service.updateReservationStatus(id, 'checked_in');
        }
        catch (error) {
            console.error('Fehler beim Aktualisieren des Status in LobbyPMS:', error);
            // Weiter mit lokaler Aktualisierung, auch wenn LobbyPMS-Update fehlschlägt
        }
        // WICHTIG: Setze Status direkt auf checked_in in lokaler DB
        // Unabhängig davon, was LobbyPMS zurückgibt, da wir den Check-in durchgeführt haben
        yield prisma_1.prisma.reservation.update({
            where: { id: localReservation.id },
            data: {
                status: 'checked_in',
                onlineCheckInCompleted: true,
                onlineCheckInCompletedAt: new Date()
            }
        });
        // Hole aktualisierte Reservierung
        const updatedReservation = yield prisma_1.prisma.reservation.findUnique({
            where: { id: localReservation.id },
            include: { branch: true }
        });
        if (!updatedReservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservierung nicht gefunden'
            });
        }
        // Versuche zusätzlich zu synchronisieren (optional, für Konsistenz mit LobbyPMS)
        // Aber Status ist bereits korrekt gesetzt, auch wenn Sync fehlschlägt
        try {
            const lobbyReservation = yield service.fetchReservationById(id);
            yield service.syncReservation(lobbyReservation);
        }
        catch (syncError) {
            // Ignoriere Sync-Fehler, da Status bereits korrekt gesetzt ist
            console.log('Hinweis: Synchronisation mit LobbyPMS fehlgeschlagen, aber Status ist bereits korrekt gesetzt:', syncError);
        }
        // Aktualisiere verknüpften Task falls vorhanden
        const userId = parseInt(req.userId);
        yield reservationTaskService_1.ReservationTaskService.completeTaskOnCheckIn(localReservation.id, userId);
        // Sende Check-in-Bestätigung
        try {
            yield reservationNotificationService_1.ReservationNotificationService.sendCheckInConfirmation(localReservation.id);
        }
        catch (error) {
            console.error('Fehler beim Versenden der Check-in-Bestätigung:', error);
            // Fehler nicht weiterwerfen, da Bestätigung optional ist
        }
        res.json({
            success: true,
            data: updatedReservation
        });
    }
    catch (error) {
        console.error('Error checking in reservation:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Check-in'
        });
    }
});
exports.checkInReservation = checkInReservation;
/**
 * POST /api/lobby-pms/webhook
 * Empfängt Webhooks von LobbyPMS
 *
 * Webhook-Events können sein:
 * - reservation.created
 * - reservation.updated
 * - reservation.status_changed
 * - reservation.cancelled
 */
const handleWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { event, data } = req.body;
        // Validiere Webhook-Secret (falls konfiguriert)
        // TODO: Implementiere Webhook-Secret-Validierung
        console.log(`[LobbyPMS Webhook] Event: ${event}`, data);
        // Bestimme Organisation aus Webhook-Daten
        // TODO: Wie identifizieren wir die Organisation aus dem Webhook?
        // Mögliche Ansätze:
        // 1. Property ID im Webhook
        // 2. Webhook-Secret pro Organisation
        // 3. Custom Header
        // Für jetzt: Suche nach Organisation mit passender Property ID
        const propertyId = data === null || data === void 0 ? void 0 : data.property_id;
        if (!propertyId) {
            return res.status(400).json({
                success: false,
                message: 'Property ID fehlt im Webhook'
            });
        }
        const organization = yield prisma_1.prisma.organization.findFirst({
            where: {
                settings: {
                    path: ['lobbyPms', 'propertyId'],
                    equals: propertyId
                }
            }
        });
        if (!organization) {
            console.warn(`[LobbyPMS Webhook] Organisation nicht gefunden für Property ID: ${propertyId}`);
            return res.status(404).json({
                success: false,
                message: 'Organisation nicht gefunden'
            });
        }
        // Finde Branch über property_id UND apiKey (für eindeutige Zuordnung)
        // WICHTIG: Da beide Branches die gleiche propertyId haben können, muss auch der apiKey geprüft werden
        const { findBranchByPropertyId } = yield Promise.resolve().then(() => __importStar(require('../services/lobbyPmsService')));
        const tempService = new lobbyPmsService_1.LobbyPmsService(organization.id);
        // Lade Settings, damit apiKey verfügbar ist
        yield tempService.loadSettings();
        const branchId = yield findBranchByPropertyId(propertyId, tempService.apiKey, // API Key aus Service
        organization.id);
        if (!branchId) {
            console.warn(`[LobbyPMS Webhook] Keine Branch gefunden für Property ID: ${propertyId}`);
            return res.status(404).json({
                success: false,
                message: 'Branch nicht gefunden'
            });
        }
        // Erstelle Service mit branchId
        const service = yield lobbyPmsService_1.LobbyPmsService.createForBranch(branchId);
        // Verarbeite Webhook-Event
        switch (event) {
            case 'reservation.created':
            case 'reservation.updated':
                if (data === null || data === void 0 ? void 0 : data.id) {
                    yield service.syncReservation(data);
                }
                break;
            case 'reservation.status_changed':
            case 'reservation.checked_in':
                if (data === null || data === void 0 ? void 0 : data.id) {
                    yield service.updateReservationStatus(data.id, data.status || 'checked_in');
                    // Aktualisiere lokale Reservierung
                    const localReservation = yield prisma_1.prisma.reservation.findUnique({
                        where: { lobbyReservationId: data.id }
                    });
                    if (localReservation) {
                        yield prisma_1.prisma.reservation.update({
                            where: { id: localReservation.id },
                            data: {
                                status: data.status === 'checked_in' ? 'checked_in' : localReservation.status,
                                onlineCheckInCompleted: data.status === 'checked_in',
                                onlineCheckInCompletedAt: data.status === 'checked_in' ? new Date() : null
                            }
                        });
                    }
                }
                break;
            default:
                console.log(`[LobbyPMS Webhook] Unbekanntes Event: ${event}`);
        }
        // Bestätige Webhook-Empfang
        res.json({ success: true, message: 'Webhook verarbeitet' });
    }
    catch (error) {
        console.error('Error handling webhook:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Verarbeiten des Webhooks'
        });
    }
});
exports.handleWebhook = handleWebhook;
/**
 * GET /api/lobby-pms/validate
 * Validiert die LobbyPMS API-Verbindung
 */
const validateConnection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const organizationId = req.organizationId;
        const service = new lobbyPmsService_1.LobbyPmsService(organizationId);
        const isValid = yield service.validateConnection();
        res.json({
            success: isValid,
            message: isValid ? 'Verbindung erfolgreich' : 'Verbindung fehlgeschlagen'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler bei der Validierung'
        });
    }
});
exports.validateConnection = validateConnection;
//# sourceMappingURL=lobbyPmsController.js.map