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
exports.LobbyPmsReservationScheduler = void 0;
const lobbyPmsReservationSyncService_1 = require("./lobbyPmsReservationSyncService");
const prisma_1 = require("../utils/prisma");
/**
 * Scheduler für automatische LobbyPMS-Reservation-Synchronisation
 *
 * Prüft regelmäßig auf neue Reservierungen für alle Branches mit aktivierter LobbyPMS-Sync
 * Ersetzt den Email-basierten Import durch API-basierten Import
 */
class LobbyPmsReservationScheduler {
    /**
     * Startet den Scheduler
     *
     * Prüft alle 10 Minuten auf neue Reservierungen für alle Branches mit aktivierter LobbyPMS-Sync
     */
    static start() {
        if (this.isRunning) {
            console.log('[LobbyPmsReservationScheduler] Scheduler läuft bereits');
            return;
        }
        console.log('[LobbyPmsReservationScheduler] Scheduler gestartet');
        // Prüfe alle 10 Minuten
        const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 Minuten
        this.checkInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            yield this.checkAllBranches();
        }), CHECK_INTERVAL_MS);
        // Führe sofort einen Check aus beim Start
        this.checkAllBranches();
        this.isRunning = true;
    }
    /**
     * Stoppt den Scheduler
     */
    static stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            this.isRunning = false;
            console.log('[LobbyPmsReservationScheduler] Scheduler gestoppt');
        }
    }
    /**
     * Prüft alle Branches auf neue Reservierungen
     *
     * WICHTIG: Synchronisiert nur eingerichtete Branches von Organisation 1:
     * - Branch 3 (Manila)
     * - Branch 4 (Parque Poblado)
     */
    static checkAllBranches() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                console.log('[LobbyPmsReservationScheduler] Starte Sync für eingerichtete Branches...');
                // Hole nur eingerichtete Branches von Organisation 1 (Manila und Parque Poblado)
                const branches = yield prisma_1.prisma.branch.findMany({
                    where: {
                        organizationId: 1,
                        id: { in: [3, 4] } // Nur Manila (3) und Parque Poblado (4)
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
                let totalProcessed = 0;
                // Prüfe jede Branch
                for (const branch of branches) {
                    try {
                        // Prüfe ob LobbyPMS Sync aktiviert ist
                        const branchSettings = branch.lobbyPmsSettings;
                        const orgSettings = (_a = branch.organization) === null || _a === void 0 ? void 0 : _a.settings;
                        // Entschlüssele Settings falls nötig
                        const { decryptBranchApiSettings, decryptApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                        const decryptedBranchSettings = branchSettings ? decryptBranchApiSettings(branchSettings) : null;
                        const decryptedOrgSettings = orgSettings ? decryptApiSettings(orgSettings) : null;
                        const lobbyPmsSettings = decryptedBranchSettings || (decryptedOrgSettings === null || decryptedOrgSettings === void 0 ? void 0 : decryptedOrgSettings.lobbyPms);
                        if (!(lobbyPmsSettings === null || lobbyPmsSettings === void 0 ? void 0 : lobbyPmsSettings.apiKey)) {
                            continue; // Kein API Key konfiguriert
                        }
                        if (lobbyPmsSettings.syncEnabled === false) {
                            continue; // Sync deaktiviert
                        }
                        console.log(`[LobbyPmsReservationScheduler] Prüfe Branch ${branch.id} (${branch.name})...`);
                        // Synchronisiere Reservierungen für diesen Branch
                        const syncedCount = yield lobbyPmsReservationSyncService_1.LobbyPmsReservationSyncService.syncReservationsForBranch(branch.id);
                        totalProcessed += syncedCount;
                        if (syncedCount > 0) {
                            console.log(`[LobbyPmsReservationScheduler] ✅ Branch ${branch.id}: ${syncedCount} Reservation(s) synchronisiert`);
                        }
                    }
                    catch (error) {
                        console.error(`[LobbyPmsReservationScheduler] Fehler bei Branch ${branch.id}:`, error);
                        // Weiter mit nächster Branch
                    }
                }
                if (totalProcessed > 0) {
                    console.log(`[LobbyPmsReservationScheduler] ✅ Insgesamt ${totalProcessed} Reservation(s) synchronisiert`);
                }
                else {
                    console.log('[LobbyPmsReservationScheduler] Keine neuen Reservierungen gefunden');
                }
            }
            catch (error) {
                console.error('[LobbyPmsReservationScheduler] Fehler beim Branch-Check:', error);
            }
        });
    }
    /**
     * Führt manuell einen Sync für eine bestimmte Branch aus (für Tests)
     */
    static triggerManually(branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('[LobbyPmsReservationScheduler] Manueller Trigger...');
            if (branchId) {
                // Prüfe nur eine Branch
                try {
                    const syncedCount = yield lobbyPmsReservationSyncService_1.LobbyPmsReservationSyncService.syncReservationsForBranch(branchId);
                    console.log(`[LobbyPmsReservationScheduler] Manueller Sync für Branch ${branchId}: ${syncedCount} Reservation(s) synchronisiert`);
                    return syncedCount;
                }
                catch (error) {
                    console.error(`[LobbyPmsReservationScheduler] Fehler beim manuellen Sync für Branch ${branchId}:`, error);
                    throw error;
                }
            }
            else {
                // Prüfe alle Branches
                yield this.checkAllBranches();
                return 0; // Anzahl wird in checkAllBranches geloggt
            }
        });
    }
}
exports.LobbyPmsReservationScheduler = LobbyPmsReservationScheduler;
LobbyPmsReservationScheduler.checkInterval = null;
LobbyPmsReservationScheduler.isRunning = false;
//# sourceMappingURL=lobbyPmsReservationScheduler.js.map