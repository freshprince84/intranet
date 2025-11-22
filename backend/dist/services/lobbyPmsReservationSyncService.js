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
exports.LobbyPmsReservationSyncService = void 0;
const lobbyPmsService_1 = require("./lobbyPmsService");
const prisma_1 = require("../utils/prisma");
/**
 * Service für die Synchronisation von Reservierungen von LobbyPMS API pro Branch
 *
 * Ersetzt den Email-basierten Import durch API-basierten Import
 */
class LobbyPmsReservationSyncService {
    /**
     * Synchronisiert Reservierungen für einen Branch
     *
     * @param branchId - Branch-ID
     * @param startDate - Startdatum (optional, default: heute)
     * @param endDate - Enddatum (optional, default: +30 Tage)
     * @returns Anzahl synchronisierter Reservierungen
     */
    static syncReservationsForBranch(branchId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Lade Branch mit Organisation
                const branch = yield prisma_1.prisma.branch.findUnique({
                    where: { id: branchId },
                    include: {
                        organization: {
                            select: {
                                id: true,
                                settings: true
                            }
                        }
                    }
                });
                if (!branch) {
                    throw new Error(`Branch ${branchId} nicht gefunden`);
                }
                if (!branch.organizationId) {
                    throw new Error(`Branch ${branchId} hat keine Organisation`);
                }
                // Prüfe ob LobbyPMS für Branch konfiguriert ist
                const branchSettings = branch.lobbyPmsSettings;
                const orgSettings = (_a = branch.organization) === null || _a === void 0 ? void 0 : _a.settings;
                // Entschlüssele Settings falls nötig
                const { decryptBranchApiSettings, decryptApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                const decryptedBranchSettings = branchSettings ? decryptBranchApiSettings(branchSettings) : null;
                const decryptedOrgSettings = orgSettings ? decryptApiSettings(orgSettings) : null;
                const lobbyPmsSettings = decryptedBranchSettings || (decryptedOrgSettings === null || decryptedOrgSettings === void 0 ? void 0 : decryptedOrgSettings.lobbyPms);
                if (!(lobbyPmsSettings === null || lobbyPmsSettings === void 0 ? void 0 : lobbyPmsSettings.apiKey)) {
                    console.log(`[LobbyPmsSync] Branch ${branchId} hat keinen LobbyPMS API Key konfiguriert`);
                    return 0;
                }
                if (lobbyPmsSettings.syncEnabled === false) {
                    console.log(`[LobbyPmsSync] LobbyPMS Sync ist für Branch ${branchId} deaktiviert`);
                    return 0;
                }
                // Erstelle LobbyPMS Service für Branch
                const lobbyPmsService = yield lobbyPmsService_1.LobbyPmsService.createForBranch(branchId);
                // Datum-Bereich bestimmen
                // Standard: Letzte 24 Stunden bis +30 Tage (für neue und zukünftige Reservierungen)
                const syncStartDate = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // -24 Stunden
                const syncEndDate = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 Tage
                // Hole Reservierungen von LobbyPMS und synchronisiere sie
                const syncedCount = yield lobbyPmsService.syncReservations(syncStartDate, syncEndDate);
                console.log(`[LobbyPmsSync] Branch ${branchId}: ${syncedCount} Reservierungen synchronisiert`);
                return syncedCount;
            }
            catch (error) {
                console.error(`[LobbyPmsSync] Fehler beim Synchronisieren für Branch ${branchId}:`, error);
                throw error;
            }
        });
    }
}
exports.LobbyPmsReservationSyncService = LobbyPmsReservationSyncService;
//# sourceMappingURL=lobbyPmsReservationSyncService.js.map