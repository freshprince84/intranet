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
exports.deleteBranch = exports.updateBranch = exports.createBranch = exports.switchUserBranch = exports.getUserBranches = exports.getAllBranches = exports.getTest = void 0;
const organization_1 = require("../middleware/organization");
const prisma_1 = require("../utils/prisma");
const branchCache_1 = require("../services/branchCache");
// Debug-Funktion ohne DB-Zugriff
const getTest = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const testBranches = [
        { id: 1, name: "Test-Niederlassung 1" },
        { id: 2, name: "Test-Niederlassung 2" }
    ];
    res.json(testBranches);
});
exports.getTest = getTest;
// Alle Niederlassungen abrufen (optional gefiltert nach roleId)
const getAllBranches = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Datenisolation: Zeigt alle Branches der Organisation oder nur eigene (wenn standalone)
        const branchFilter = (0, organization_1.getDataIsolationFilter)(req, 'branch');
        // Optional: Filter nach roleId (aus Query-Parameter)
        const roleId = req.query.roleId ? parseInt(req.query.roleId, 10) : null;
        // Prisma Query vorbereiten
        const queryOptions = {
            where: branchFilter,
            orderBy: { name: 'asc' }
        };
        // Wenn roleId vorhanden, füge roles Relation hinzu
        if (roleId && !isNaN(roleId)) {
            queryOptions.select = {
                id: true,
                name: true,
                whatsappSettings: true,
                lobbyPmsSettings: true,
                boldPaymentSettings: true,
                doorSystemSettings: true,
                emailSettings: true,
                roles: {
                    where: { roleId: roleId },
                    select: { id: true }
                }
            };
        }
        else {
            queryOptions.select = {
                id: true,
                name: true,
                whatsappSettings: true,
                lobbyPmsSettings: true,
                boldPaymentSettings: true,
                doorSystemSettings: true,
                emailSettings: true
            };
        }
        // ✅ MONITORING: Timing-Log für DB-Query
        const queryStartTime = Date.now();
        let branches = yield prisma_1.prisma.branch.findMany(queryOptions);
        const queryDuration = Date.now() - queryStartTime;
        console.log(`[getAllBranches] ⏱️ Query: ${queryDuration}ms | Branches: ${branches.length}`);
        // Entschlüssele alle Settings für alle Branches
        // Branch-Settings sind flach strukturiert (apiKey direkt), nicht verschachtelt (whatsapp.apiKey)
        const { decryptBranchApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
        branches = branches.map((branch) => {
            // Entschlüssele WhatsApp Settings
            if (branch.whatsappSettings) {
                try {
                    branch.whatsappSettings = decryptBranchApiSettings(branch.whatsappSettings);
                }
                catch (error) {
                    console.warn(`[Branch Controller] Fehler beim Entschlüsseln der WhatsApp Settings für Branch ${branch.id}:`, error);
                }
            }
            // Entschlüssele LobbyPMS Settings
            if (branch.lobbyPmsSettings) {
                try {
                    branch.lobbyPmsSettings = decryptBranchApiSettings(branch.lobbyPmsSettings);
                }
                catch (error) {
                    console.warn(`[Branch Controller] Fehler beim Entschlüsseln der LobbyPMS Settings für Branch ${branch.id}:`, error);
                }
            }
            // Entschlüssele Bold Payment Settings
            if (branch.boldPaymentSettings) {
                try {
                    branch.boldPaymentSettings = decryptBranchApiSettings(branch.boldPaymentSettings);
                }
                catch (error) {
                    console.warn(`[Branch Controller] Fehler beim Entschlüsseln der Bold Payment Settings für Branch ${branch.id}:`, error);
                }
            }
            // Entschlüssele Door System Settings
            if (branch.doorSystemSettings) {
                try {
                    branch.doorSystemSettings = decryptBranchApiSettings(branch.doorSystemSettings);
                }
                catch (error) {
                    console.warn(`[Branch Controller] Fehler beim Entschlüsseln der Door System Settings für Branch ${branch.id}:`, error);
                }
            }
            // Entschlüssele Email Settings
            if (branch.emailSettings) {
                try {
                    branch.emailSettings = decryptBranchApiSettings(branch.emailSettings);
                }
                catch (error) {
                    console.warn(`[Branch Controller] Fehler beim Entschlüsseln der Email Settings für Branch ${branch.id}:`, error);
                }
            }
            return branch;
        });
        // Wenn roleId angegeben, filtere Branches nach Verfügbarkeit für diese Rolle
        if (roleId && !isNaN(roleId)) {
            // Hole die Rolle, um allBranches zu prüfen
            const role = yield prisma_1.prisma.role.findUnique({
                where: { id: roleId },
                select: {
                    allBranches: true
                }
            });
            if (role) {
                // Wenn allBranches = true, sind alle Branches verfügbar
                // Wenn allBranches = false, nur Branches mit RoleBranch Eintrag
                if (!role.allBranches) {
                    branches = branches.filter(branch => {
                        // TypeScript-Hack: branches hat jetzt ein 'roles' Feld wenn roleId vorhanden
                        const branchWithRoles = branch;
                        return branchWithRoles.roles && branchWithRoles.roles.length > 0;
                    });
                }
            }
            else {
                // Rolle nicht gefunden, keine Branches zurückgeben
                branches = [];
            }
            // Entferne das 'roles' Feld aus der Antwort, behalte aber alle Settings
            branches = branches.map(branch => ({
                id: branch.id,
                name: branch.name,
                whatsappSettings: branch.whatsappSettings,
                lobbyPmsSettings: branch.lobbyPmsSettings,
                boldPaymentSettings: branch.boldPaymentSettings,
                doorSystemSettings: branch.doorSystemSettings,
                emailSettings: branch.emailSettings
            }));
        }
        res.json(branches);
    }
    catch (error) {
        console.error('Error in getAllBranches:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Niederlassungen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getAllBranches = getAllBranches;
// Branches eines Benutzers mit lastUsed-Flag abrufen
const getUserBranches = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        if (!userId || isNaN(userId) || userId <= 0) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }
        // ✅ PERFORMANCE: Verwende BranchCache statt DB-Query
        // ✅ SICHERHEIT: BranchCache berücksichtigt getDataIsolationFilter
        // ✅ MONITORING: Timing-Log für Cache-Operation
        const cacheStartTime = Date.now();
        const cachedBranches = yield branchCache_1.branchCache.get(userId, req);
        const cacheDuration = Date.now() - cacheStartTime;
        if (cachedBranches) {
            console.log(`[getUserBranches] ⏱️ Cache-Hit: ${cacheDuration}ms | Branches: ${cachedBranches.length}`);
        }
        else {
            console.log(`[getUserBranches] ⏱️ Cache-Miss: ${cacheDuration}ms`);
        }
        if (cachedBranches) {
            return res.json(cachedBranches);
        }
        // Fallback: DB-Query (sollte nicht nötig sein, da Cache immer Daten liefert oder null)
        return res.status(500).json({
            message: 'Fehler beim Laden der Branches',
            error: 'Cache-Fehler'
        });
    }
    catch (error) {
        console.error('Error in getUserBranches:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Benutzer-Niederlassungen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getUserBranches = getUserBranches;
// Aktiven Branch eines Benutzers wechseln
const switchUserBranch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const { branchId } = req.body;
        if (!userId || isNaN(userId) || userId <= 0) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }
        if (!branchId || isNaN(branchId) || branchId <= 0) {
            return res.status(400).json({ message: 'Ungültige Niederlassungs-ID' });
        }
        // Prüfen, ob die Niederlassung dem Benutzer zugewiesen ist
        const userBranch = yield prisma_1.prisma.usersBranches.findFirst({
            where: {
                userId,
                branchId
            }
        });
        if (!userBranch) {
            return res.status(404).json({
                message: 'Diese Niederlassung ist dem Benutzer nicht zugewiesen'
            });
        }
        // Prüfen, ob Branch zur Organisation gehört (Datenisolation)
        const branchFilter = (0, organization_1.getDataIsolationFilter)(req, 'branch');
        const branch = yield prisma_1.prisma.branch.findFirst({
            where: Object.assign({ id: branchId }, branchFilter)
        });
        if (!branch) {
            return res.status(403).json({
                message: 'Zugriff auf diese Niederlassung verweigert'
            });
        }
        // Prüfe, ob die aktive Rolle für die neue Branch verfügbar ist
        const activeRole = yield prisma_1.prisma.userRole.findFirst({
            where: {
                userId,
                lastUsed: true
            },
            select: {
                roleId: true
            }
        });
        if (activeRole) {
            // Importiere die Hilfsfunktion dynamisch, um Zirkelimporte zu vermeiden
            const { isRoleAvailableForBranch } = yield Promise.resolve().then(() => __importStar(require('./roleController')));
            const isAvailable = yield isRoleAvailableForBranch(activeRole.roleId, branchId);
            if (!isAvailable) {
                return res.status(400).json({
                    message: 'Die aktive Rolle ist für diese Branch nicht verfügbar. Bitte wechseln Sie zuerst zu einer verfügbaren Rolle.'
                });
            }
        }
        // Transaktion starten
        yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Alle Branches des Benutzers auf lastUsed=false setzen
            yield tx.usersBranches.updateMany({
                where: { userId },
                data: { lastUsed: false }
            });
            // Die ausgewählte Branch auf lastUsed=true setzen
            yield tx.usersBranches.update({
                where: { id: userBranch.id },
                data: { lastUsed: true }
            });
        }));
        // Aktualisierte Branches zurückgeben
        const updatedUserBranches = yield prisma_1.prisma.usersBranches.findMany({
            where: {
                userId: userId,
                branch: branchFilter
            },
            include: {
                branch: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                branch: {
                    name: 'asc'
                }
            }
        });
        const branches = updatedUserBranches.map(ub => ({
            id: ub.branch.id,
            name: ub.branch.name,
            lastUsed: ub.lastUsed
        }));
        // ✅ PERFORMANCE: Cache invalidieren nach Branch-Wechsel
        const organizationId = req.organizationId;
        const roleId = req.roleId;
        branchCache_1.branchCache.invalidate(userId, organizationId, roleId);
        return res.json({
            success: true,
            branches,
            selectedBranch: branchId
        });
    }
    catch (error) {
        console.error('Error in switchUserBranch:', error);
        res.status(500).json({
            message: 'Fehler beim Wechseln der Niederlassung',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.switchUserBranch = switchUserBranch;
// Branch erstellen
const createBranch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({
                message: 'Fehler beim Erstellen der Niederlassung: Name ist erforderlich'
            });
        }
        // Prüfe ob User eine Organisation hat
        const organizationId = req.organizationId;
        if (!organizationId) {
            return res.status(400).json({
                message: 'Fehler beim Erstellen der Niederlassung: Sie müssen Mitglied einer Organisation sein, um Niederlassungen zu erstellen'
            });
        }
        // Prüfe ob Branch mit diesem Namen bereits existiert (global unique)
        const existingBranch = yield prisma_1.prisma.branch.findUnique({
            where: { name: name.trim() }
        });
        if (existingBranch) {
            return res.status(400).json({
                message: 'Eine Niederlassung mit diesem Namen existiert bereits'
            });
        }
        // Erstelle Branch
        const branch = yield prisma_1.prisma.branch.create({
            data: {
                name: name.trim(),
                organizationId: organizationId
            }
        });
        res.status(201).json(branch);
    }
    catch (error) {
        console.error('Error in createBranch:', error);
        if (error instanceof Error && error.message.includes('Unique constraint')) {
            return res.status(400).json({
                message: 'Eine Niederlassung mit diesem Namen existiert bereits'
            });
        }
        res.status(500).json({
            message: 'Fehler beim Erstellen der Niederlassung',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.createBranch = createBranch;
// Branch aktualisieren
const updateBranch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const branchId = parseInt(req.params.id, 10);
        const { name, whatsappSettings, lobbyPmsSettings, boldPaymentSettings, doorSystemSettings, emailSettings } = req.body;
        if (isNaN(branchId)) {
            return res.status(400).json({ message: 'Ungültige Niederlassungs-ID' });
        }
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({
                message: 'Fehler beim Aktualisieren der Niederlassung: Name ist erforderlich'
            });
        }
        // Prüfe ob Branch zur Organisation gehört
        const branchFilter = (0, organization_1.getDataIsolationFilter)(req, 'branch');
        const existingBranch = yield prisma_1.prisma.branch.findFirst({
            where: Object.assign({ id: branchId }, branchFilter)
        });
        if (!existingBranch) {
            return res.status(404).json({ message: 'Niederlassung nicht gefunden' });
        }
        // Prüfe ob Branch mit neuem Namen bereits existiert (außer dem aktuellen)
        const duplicateBranch = yield prisma_1.prisma.branch.findFirst({
            where: {
                name: name.trim(),
                NOT: { id: branchId }
            }
        });
        if (duplicateBranch) {
            return res.status(400).json({
                message: 'Eine Niederlassung mit diesem Namen existiert bereits'
            });
        }
        // Verschlüssele alle Settings falls vorhanden
        const { encryptBranchApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
        let encryptedWhatsAppSettings = whatsappSettings;
        if (whatsappSettings) {
            try {
                encryptedWhatsAppSettings = encryptBranchApiSettings(whatsappSettings);
                console.log('[Branch Controller] WhatsApp Settings verschlüsselt');
            }
            catch (error) {
                console.warn('[Branch Controller] WhatsApp Settings Verschlüsselung fehlgeschlagen, speichere unverschlüsselt:', error);
            }
        }
        let encryptedLobbyPmsSettings = lobbyPmsSettings;
        if (lobbyPmsSettings) {
            try {
                encryptedLobbyPmsSettings = encryptBranchApiSettings(lobbyPmsSettings);
                console.log('[Branch Controller] LobbyPMS Settings verschlüsselt');
            }
            catch (error) {
                console.warn('[Branch Controller] LobbyPMS Settings Verschlüsselung fehlgeschlagen, speichere unverschlüsselt:', error);
            }
        }
        let encryptedBoldPaymentSettings = boldPaymentSettings;
        if (boldPaymentSettings) {
            try {
                encryptedBoldPaymentSettings = encryptBranchApiSettings(boldPaymentSettings);
                console.log('[Branch Controller] Bold Payment Settings verschlüsselt');
            }
            catch (error) {
                console.warn('[Branch Controller] Bold Payment Settings Verschlüsselung fehlgeschlagen, speichere unverschlüsselt:', error);
            }
        }
        let encryptedDoorSystemSettings = doorSystemSettings;
        if (doorSystemSettings) {
            try {
                encryptedDoorSystemSettings = encryptBranchApiSettings(doorSystemSettings);
                console.log('[Branch Controller] Door System Settings verschlüsselt');
            }
            catch (error) {
                console.warn('[Branch Controller] Door System Settings Verschlüsselung fehlgeschlagen, speichere unverschlüsselt:', error);
            }
        }
        let encryptedEmailSettings = emailSettings;
        if (emailSettings) {
            try {
                encryptedEmailSettings = encryptBranchApiSettings(emailSettings);
                console.log('[Branch Controller] Email Settings verschlüsselt');
            }
            catch (error) {
                console.warn('[Branch Controller] Email Settings Verschlüsselung fehlgeschlagen, speichere unverschlüsselt:', error);
            }
        }
        // Aktualisiere Branch
        const updateData = {
            name: name.trim()
        };
        if (whatsappSettings !== undefined) {
            updateData.whatsappSettings = encryptedWhatsAppSettings;
        }
        if (lobbyPmsSettings !== undefined) {
            updateData.lobbyPmsSettings = encryptedLobbyPmsSettings;
        }
        if (boldPaymentSettings !== undefined) {
            updateData.boldPaymentSettings = encryptedBoldPaymentSettings;
        }
        if (doorSystemSettings !== undefined) {
            updateData.doorSystemSettings = encryptedDoorSystemSettings;
        }
        if (emailSettings !== undefined) {
            updateData.emailSettings = encryptedEmailSettings;
        }
        const updatedBranch = yield prisma_1.prisma.branch.update({
            where: { id: branchId },
            data: updateData,
            select: {
                id: true,
                name: true,
                whatsappSettings: true,
                lobbyPmsSettings: true,
                boldPaymentSettings: true,
                doorSystemSettings: true,
                emailSettings: true
            }
        });
        // Entschlüssele alle Settings für Response (Frontend braucht entschlüsselte Werte)
        const { decryptBranchApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
        if (updatedBranch.whatsappSettings) {
            try {
                updatedBranch.whatsappSettings = decryptBranchApiSettings(updatedBranch.whatsappSettings);
            }
            catch (error) {
                console.warn('[Branch Controller] Fehler beim Entschlüsseln der WhatsApp Settings:', error);
            }
        }
        if (updatedBranch.lobbyPmsSettings) {
            try {
                updatedBranch.lobbyPmsSettings = decryptBranchApiSettings(updatedBranch.lobbyPmsSettings);
            }
            catch (error) {
                console.warn('[Branch Controller] Fehler beim Entschlüsseln der LobbyPMS Settings:', error);
            }
        }
        if (updatedBranch.boldPaymentSettings) {
            try {
                updatedBranch.boldPaymentSettings = decryptBranchApiSettings(updatedBranch.boldPaymentSettings);
            }
            catch (error) {
                console.warn('[Branch Controller] Fehler beim Entschlüsseln der Bold Payment Settings:', error);
            }
        }
        if (updatedBranch.doorSystemSettings) {
            try {
                updatedBranch.doorSystemSettings = decryptBranchApiSettings(updatedBranch.doorSystemSettings);
            }
            catch (error) {
                console.warn('[Branch Controller] Fehler beim Entschlüsseln der Door System Settings:', error);
            }
        }
        if (updatedBranch.emailSettings) {
            try {
                updatedBranch.emailSettings = decryptBranchApiSettings(updatedBranch.emailSettings);
            }
            catch (error) {
                console.warn('[Branch Controller] Fehler beim Entschlüsseln der Email Settings:', error);
            }
        }
        // ✅ PERFORMANCE: Cache leeren nach Branch-Update (alle User betroffen)
        branchCache_1.branchCache.clear();
        res.json(updatedBranch);
    }
    catch (error) {
        console.error('Error in updateBranch:', error);
        if (error instanceof Error && error.message.includes('Unique constraint')) {
            return res.status(400).json({
                message: 'Eine Niederlassung mit diesem Namen existiert bereits'
            });
        }
        res.status(500).json({
            message: 'Fehler beim Aktualisieren der Niederlassung',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateBranch = updateBranch;
// Branch löschen
const deleteBranch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const branchId = parseInt(req.params.id, 10);
        if (isNaN(branchId)) {
            return res.status(400).json({ message: 'Ungültige Niederlassungs-ID' });
        }
        // Prüfe ob Branch zur Organisation gehört
        const branchFilter = (0, organization_1.getDataIsolationFilter)(req, 'branch');
        const branch = yield prisma_1.prisma.branch.findFirst({
            where: Object.assign({ id: branchId }, branchFilter)
        });
        if (!branch) {
            return res.status(404).json({ message: 'Niederlassung nicht gefunden' });
        }
        // Prüfe ob Branch verwendet wird
        const [workTimes, tasks, requests, userBranches] = yield Promise.all([
            prisma_1.prisma.workTime.count({
                where: { branchId }
            }),
            prisma_1.prisma.task.count({
                where: { branchId }
            }),
            prisma_1.prisma.request.count({
                where: { branchId }
            }),
            prisma_1.prisma.usersBranches.count({
                where: { branchId }
            })
        ]);
        if (workTimes > 0 || tasks > 0 || requests > 0 || userBranches > 0) {
            const usageDetails = [];
            if (workTimes > 0)
                usageDetails.push(`${workTimes} Zeiterfassung(en)`);
            if (tasks > 0)
                usageDetails.push(`${tasks} Aufgabe(n)`);
            if (requests > 0)
                usageDetails.push(`${requests} Antrag/Anträge`);
            if (userBranches > 0)
                usageDetails.push(`${userBranches} Benutzerzuweisung(en)`);
            return res.status(400).json({
                message: `Die Niederlassung kann nicht gelöscht werden, da sie noch verwendet wird: ${usageDetails.join(', ')}`
            });
        }
        // Lösche Branch
        yield prisma_1.prisma.branch.delete({
            where: { id: branchId }
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error in deleteBranch:', error);
        res.status(500).json({
            message: 'Fehler beim Löschen der Niederlassung',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.deleteBranch = deleteBranch;
//# sourceMappingURL=branchController.js.map