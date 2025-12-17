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
exports.getRoomDescription = exports.updateRoomDescriptions = exports.getRoomDescriptions = exports.deleteBranch = exports.updateBranch = exports.createBranch = exports.switchUserBranch = exports.getUserBranches = exports.getAllBranches = exports.getTest = void 0;
const organization_1 = require("../middleware/organization");
const prisma_1 = require("../utils/prisma");
const branchCache_1 = require("../services/branchCache");
const logger_1 = require("../utils/logger");
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
                address: true,
                city: true,
                country: true,
                whatsappSettings: true,
                lobbyPmsSettings: true,
                boldPaymentSettings: true,
                doorSystemSettings: true,
                emailSettings: true,
                messageTemplates: true,
                autoSendReservationInvitation: true,
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
                address: true,
                city: true,
                country: true,
                whatsappSettings: true,
                lobbyPmsSettings: true,
                boldPaymentSettings: true,
                doorSystemSettings: true,
                emailSettings: true,
                messageTemplates: true,
                autoSendReservationInvitation: true
            };
        }
        // ✅ MONITORING: Timing-Log für DB-Query
        const queryStartTime = Date.now();
        let branches = yield prisma_1.prisma.branch.findMany(queryOptions);
        const queryDuration = Date.now() - queryStartTime;
        logger_1.logger.log(`[getAllBranches] ⏱️ Query: ${queryDuration}ms | Branches: ${branches.length}`);
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
                    logger_1.logger.warn(`[Branch Controller] Fehler beim Entschlüsseln der WhatsApp Settings für Branch ${branch.id}:`, error);
                }
            }
            // Entschlüssele LobbyPMS Settings
            if (branch.lobbyPmsSettings) {
                try {
                    branch.lobbyPmsSettings = decryptBranchApiSettings(branch.lobbyPmsSettings);
                }
                catch (error) {
                    logger_1.logger.warn(`[Branch Controller] Fehler beim Entschlüsseln der LobbyPMS Settings für Branch ${branch.id}:`, error);
                }
            }
            // Entschlüssele Bold Payment Settings
            if (branch.boldPaymentSettings) {
                try {
                    const decrypted = decryptBranchApiSettings(branch.boldPaymentSettings);
                    // Stelle sicher, dass das Objekt nicht null/undefined wird, auch wenn Entschlüsselung fehlschlägt
                    if (decrypted && typeof decrypted === 'object') {
                        branch.boldPaymentSettings = decrypted;
                        // Log für Debugging: Prüfe ob Werte vorhanden sind (auch verschlüsselt)
                        // Wenn Entschlüsselung fehlgeschlagen ist, bleiben verschlüsselte Werte erhalten (mit ':')
                        const hasApiKey = decrypted.apiKey && typeof decrypted.apiKey === 'string';
                        const hasMerchantId = decrypted.merchantId && typeof decrypted.merchantId === 'string';
                        if (!hasApiKey && !hasMerchantId) {
                            logger_1.logger.warn(`[Branch Controller] Bold Payment Settings für Branch ${branch.id} hat keine apiKey/merchantId Werte (auch nicht verschlüsselt)`);
                        }
                        else if ((hasApiKey && decrypted.apiKey.includes(':')) || (hasMerchantId && decrypted.merchantId.includes(':'))) {
                            logger_1.logger.info(`[Branch Controller] Bold Payment Settings für Branch ${branch.id} enthält verschlüsselte Werte (Entschlüsselung fehlgeschlagen)`);
                        }
                    }
                    else {
                        // Falls Entschlüsselung komplett fehlschlägt, behalte Original
                        logger_1.logger.warn(`[Branch Controller] Entschlüsselung von Bold Payment Settings für Branch ${branch.id} fehlgeschlagen, behalte Original`);
                    }
                }
                catch (error) {
                    logger_1.logger.warn(`[Branch Controller] Fehler beim Entschlüsseln der Bold Payment Settings für Branch ${branch.id}:`, error);
                    // Bei Fehler: behalte Original-Settings (verschlüsselt)
                }
            }
            // Entschlüssele Door System Settings
            if (branch.doorSystemSettings) {
                try {
                    branch.doorSystemSettings = decryptBranchApiSettings(branch.doorSystemSettings);
                }
                catch (error) {
                    logger_1.logger.warn(`[Branch Controller] Fehler beim Entschlüsseln der Door System Settings für Branch ${branch.id}:`, error);
                }
            }
            // Entschlüssele Email Settings
            if (branch.emailSettings) {
                try {
                    branch.emailSettings = decryptBranchApiSettings(branch.emailSettings);
                }
                catch (error) {
                    logger_1.logger.warn(`[Branch Controller] Fehler beim Entschlüsseln der Email Settings für Branch ${branch.id}:`, error);
                }
            }
            // Entschlüssele Message Templates
            if (branch.messageTemplates) {
                try {
                    branch.messageTemplates = decryptBranchApiSettings(branch.messageTemplates);
                }
                catch (error) {
                    logger_1.logger.warn(`[Branch Controller] Fehler beim Entschlüsseln der Message Templates für Branch ${branch.id}:`, error);
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
                emailSettings: branch.emailSettings,
                messageTemplates: branch.messageTemplates,
                autoSendReservationInvitation: branch.autoSendReservationInvitation
            }));
        }
        res.json(branches);
    }
    catch (error) {
        logger_1.logger.error('Error in getAllBranches:', error);
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
            logger_1.logger.log(`[getUserBranches] ⏱️ Cache-Hit: ${cacheDuration}ms | Branches: ${cachedBranches.length}`);
        }
        else {
            logger_1.logger.log(`[getUserBranches] ⏱️ Cache-Miss: ${cacheDuration}ms`);
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
        logger_1.logger.error('Error in getUserBranches:', error);
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
        // ✅ FIX: OrganizationCache invalidieren (branchId hat sich geändert)
        const { organizationCache } = yield Promise.resolve().then(() => __importStar(require('../utils/organizationCache')));
        organizationCache.invalidate(userId);
        return res.json({
            success: true,
            branches,
            selectedBranch: branchId
        });
    }
    catch (error) {
        logger_1.logger.error('Error in switchUserBranch:', error);
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
        logger_1.logger.error('Error in createBranch:', error);
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
        const { name, address, city, country, whatsappSettings, lobbyPmsSettings, boldPaymentSettings, doorSystemSettings, emailSettings, messageTemplates, autoSendReservationInvitation } = req.body;
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
            where: Object.assign({ id: branchId }, branchFilter),
            select: {
                id: true,
                lobbyPmsSettings: true
            }
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
                logger_1.logger.log('[Branch Controller] WhatsApp Settings verschlüsselt');
            }
            catch (error) {
                logger_1.logger.warn('[Branch Controller] WhatsApp Settings Verschlüsselung fehlgeschlagen, speichere unverschlüsselt:', error);
            }
        }
        let encryptedLobbyPmsSettings = lobbyPmsSettings;
        if (lobbyPmsSettings !== undefined) {
            try {
                // WICHTIG: Behalte bestehende roomDescriptions, falls vorhanden
                if (existingBranch.lobbyPmsSettings) {
                    try {
                        const { decryptBranchApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                        const existingDecrypted = decryptBranchApiSettings(existingBranch.lobbyPmsSettings);
                        const existingLobbyPms = (existingDecrypted === null || existingDecrypted === void 0 ? void 0 : existingDecrypted.lobbyPms) || existingDecrypted;
                        const existingRoomDescriptions = existingLobbyPms === null || existingLobbyPms === void 0 ? void 0 : existingLobbyPms.roomDescriptions;
                        // Wenn roomDescriptions vorhanden sind, füge sie zu den neuen Settings hinzu
                        if (existingRoomDescriptions) {
                            if (lobbyPmsSettings === null || lobbyPmsSettings === void 0 ? void 0 : lobbyPmsSettings.lobbyPms) {
                                // Struktur ist { lobbyPms: { ... } }
                                lobbyPmsSettings.lobbyPms.roomDescriptions = existingRoomDescriptions;
                            }
                            else {
                                // Struktur ist direkt { ... }
                                lobbyPmsSettings.roomDescriptions = existingRoomDescriptions;
                            }
                        }
                    }
                    catch (error) {
                        logger_1.logger.warn('[Branch Controller] Fehler beim Laden bestehender roomDescriptions:', error);
                    }
                }
                encryptedLobbyPmsSettings = encryptBranchApiSettings(lobbyPmsSettings);
                logger_1.logger.log('[Branch Controller] LobbyPMS Settings verschlüsselt');
            }
            catch (error) {
                logger_1.logger.warn('[Branch Controller] LobbyPMS Settings Verschlüsselung fehlgeschlagen, speichere unverschlüsselt:', error);
            }
        }
        let encryptedBoldPaymentSettings = boldPaymentSettings;
        if (boldPaymentSettings) {
            try {
                encryptedBoldPaymentSettings = encryptBranchApiSettings(boldPaymentSettings);
                logger_1.logger.log('[Branch Controller] Bold Payment Settings verschlüsselt');
            }
            catch (error) {
                logger_1.logger.warn('[Branch Controller] Bold Payment Settings Verschlüsselung fehlgeschlagen, speichere unverschlüsselt:', error);
            }
        }
        let encryptedDoorSystemSettings = doorSystemSettings;
        if (doorSystemSettings) {
            try {
                encryptedDoorSystemSettings = encryptBranchApiSettings(doorSystemSettings);
                logger_1.logger.log('[Branch Controller] Door System Settings verschlüsselt');
            }
            catch (error) {
                logger_1.logger.warn('[Branch Controller] Door System Settings Verschlüsselung fehlgeschlagen, speichere unverschlüsselt:', error);
            }
        }
        let encryptedEmailSettings = emailSettings;
        if (emailSettings) {
            try {
                encryptedEmailSettings = encryptBranchApiSettings(emailSettings);
                logger_1.logger.log('[Branch Controller] Email Settings verschlüsselt');
            }
            catch (error) {
                logger_1.logger.warn('[Branch Controller] Email Settings Verschlüsselung fehlgeschlagen, speichere unverschlüsselt:', error);
            }
        }
        let encryptedMessageTemplates = messageTemplates;
        if (messageTemplates) {
            try {
                encryptedMessageTemplates = encryptBranchApiSettings(messageTemplates);
                logger_1.logger.log('[Branch Controller] Message Templates verschlüsselt');
            }
            catch (error) {
                logger_1.logger.warn('[Branch Controller] Message Templates Verschlüsselung fehlgeschlagen, speichere unverschlüsselt:', error);
            }
        }
        // Aktualisiere Branch
        const updateData = {
            name: name.trim()
        };
        // Adress-Felder
        if (address !== undefined) {
            updateData.address = address && address.trim() ? address.trim() : null;
        }
        if (city !== undefined) {
            updateData.city = city && city.trim() ? city.trim() : null;
        }
        if (country !== undefined) {
            updateData.country = country && country.trim() ? country.trim() : null;
        }
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
        if (messageTemplates !== undefined) {
            updateData.messageTemplates = encryptedMessageTemplates;
        }
        if (autoSendReservationInvitation !== undefined) {
            updateData.autoSendReservationInvitation = autoSendReservationInvitation;
        }
        const updatedBranch = yield prisma_1.prisma.branch.update({
            where: { id: branchId },
            data: updateData,
            select: {
                id: true,
                name: true,
                address: true,
                city: true,
                country: true,
                whatsappSettings: true,
                lobbyPmsSettings: true,
                boldPaymentSettings: true,
                doorSystemSettings: true,
                emailSettings: true,
                messageTemplates: true,
                autoSendReservationInvitation: true
            }
        });
        // Entschlüssele alle Settings für Response (Frontend braucht entschlüsselte Werte)
        const { decryptBranchApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
        if (updatedBranch.whatsappSettings) {
            try {
                updatedBranch.whatsappSettings = decryptBranchApiSettings(updatedBranch.whatsappSettings);
            }
            catch (error) {
                logger_1.logger.warn('[Branch Controller] Fehler beim Entschlüsseln der WhatsApp Settings:', error);
            }
        }
        if (updatedBranch.lobbyPmsSettings) {
            try {
                updatedBranch.lobbyPmsSettings = decryptBranchApiSettings(updatedBranch.lobbyPmsSettings);
            }
            catch (error) {
                logger_1.logger.warn('[Branch Controller] Fehler beim Entschlüsseln der LobbyPMS Settings:', error);
            }
        }
        if (updatedBranch.boldPaymentSettings) {
            try {
                updatedBranch.boldPaymentSettings = decryptBranchApiSettings(updatedBranch.boldPaymentSettings);
            }
            catch (error) {
                logger_1.logger.warn('[Branch Controller] Fehler beim Entschlüsseln der Bold Payment Settings:', error);
            }
        }
        if (updatedBranch.doorSystemSettings) {
            try {
                updatedBranch.doorSystemSettings = decryptBranchApiSettings(updatedBranch.doorSystemSettings);
            }
            catch (error) {
                logger_1.logger.warn('[Branch Controller] Fehler beim Entschlüsseln der Door System Settings:', error);
            }
        }
        if (updatedBranch.emailSettings) {
            try {
                updatedBranch.emailSettings = decryptBranchApiSettings(updatedBranch.emailSettings);
            }
            catch (error) {
                logger_1.logger.warn('[Branch Controller] Fehler beim Entschlüsseln der Email Settings:', error);
            }
        }
        if (updatedBranch.messageTemplates) {
            try {
                updatedBranch.messageTemplates = decryptBranchApiSettings(updatedBranch.messageTemplates);
            }
            catch (error) {
                logger_1.logger.warn('[Branch Controller] Fehler beim Entschlüsseln der Message Templates:', error);
            }
        }
        // ✅ PERFORMANCE: Cache leeren nach Branch-Update (alle User betroffen)
        branchCache_1.branchCache.clear();
        res.json(updatedBranch);
    }
    catch (error) {
        logger_1.logger.error('Error in updateBranch:', error);
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
        logger_1.logger.error('Error in deleteBranch:', error);
        res.status(500).json({
            message: 'Fehler beim Löschen der Niederlassung',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.deleteBranch = deleteBranch;
/**
 * GET /api/branches/:id/room-descriptions
 * Lädt alle Zimmer-Beschreibungen für einen Branch
 */
const getRoomDescriptions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const branchId = parseInt(req.params.id, 10);
        const organizationId = req.organizationId;
        if (isNaN(branchId)) {
            return res.status(400).json({ message: 'Ungültige Branch-ID' });
        }
        // Prüfe ob Branch zur Organisation gehört
        const branchFilter = (0, organization_1.getDataIsolationFilter)(req, 'branch');
        const branch = yield prisma_1.prisma.branch.findFirst({
            where: Object.assign({ id: branchId }, branchFilter),
            select: {
                id: true,
                lobbyPmsSettings: true
            }
        });
        if (!branch) {
            return res.status(404).json({ message: 'Branch nicht gefunden' });
        }
        // Lade und entschlüssele lobbyPmsSettings
        let roomDescriptions = {};
        if (branch.lobbyPmsSettings) {
            try {
                const { decryptBranchApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                const decryptedSettings = decryptBranchApiSettings(branch.lobbyPmsSettings);
                const lobbyPmsSettings = (decryptedSettings === null || decryptedSettings === void 0 ? void 0 : decryptedSettings.lobbyPms) || decryptedSettings;
                roomDescriptions = (lobbyPmsSettings === null || lobbyPmsSettings === void 0 ? void 0 : lobbyPmsSettings.roomDescriptions) || {};
            }
            catch (error) {
                logger_1.logger.warn('[Branch Controller] Fehler beim Entschlüsseln der LobbyPMS Settings:', error);
            }
        }
        res.json(roomDescriptions);
    }
    catch (error) {
        logger_1.logger.error('Error in getRoomDescriptions:', error);
        res.status(500).json({
            message: 'Fehler beim Laden der Zimmer-Beschreibungen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getRoomDescriptions = getRoomDescriptions;
/**
 * PUT /api/branches/:id/room-descriptions
 * Speichert Zimmer-Beschreibungen für einen Branch
 */
const updateRoomDescriptions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const branchId = parseInt(req.params.id, 10);
        const { roomDescriptions } = req.body;
        if (isNaN(branchId)) {
            return res.status(400).json({ message: 'Ungültige Branch-ID' });
        }
        if (!roomDescriptions || typeof roomDescriptions !== 'object') {
            return res.status(400).json({ message: 'roomDescriptions muss ein Objekt sein' });
        }
        // Prüfe ob Branch zur Organisation gehört
        const branchFilter = (0, organization_1.getDataIsolationFilter)(req, 'branch');
        const branch = yield prisma_1.prisma.branch.findFirst({
            where: Object.assign({ id: branchId }, branchFilter),
            select: {
                id: true,
                lobbyPmsSettings: true
            }
        });
        if (!branch) {
            return res.status(404).json({ message: 'Branch nicht gefunden' });
        }
        // Lade bestehende lobbyPmsSettings
        let decryptedSettings = {};
        if (branch.lobbyPmsSettings) {
            try {
                const { decryptBranchApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                decryptedSettings = decryptBranchApiSettings(branch.lobbyPmsSettings);
            }
            catch (error) {
                logger_1.logger.warn('[Branch Controller] Fehler beim Entschlüsseln der LobbyPMS Settings:', error);
                decryptedSettings = {};
            }
        }
        // Verschlüssele und speichere - behalte die ursprüngliche Struktur bei
        const { encryptBranchApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
        let encryptedSettings;
        if (decryptedSettings === null || decryptedSettings === void 0 ? void 0 : decryptedSettings.lobbyPms) {
            // Struktur ist { lobbyPms: { ... } }, behalte sie bei
            const updatedDecryptedSettings = Object.assign(Object.assign({}, decryptedSettings), { lobbyPms: Object.assign(Object.assign({}, decryptedSettings.lobbyPms), { roomDescriptions }) });
            encryptedSettings = encryptBranchApiSettings(updatedDecryptedSettings);
        }
        else {
            // Struktur ist direkt { ... } oder leer
            const updatedSettings = Object.assign(Object.assign({}, decryptedSettings), { roomDescriptions });
            encryptedSettings = encryptBranchApiSettings(updatedSettings);
        }
        yield prisma_1.prisma.branch.update({
            where: { id: branchId },
            data: {
                lobbyPmsSettings: encryptedSettings
            }
        });
        // Cache leeren
        branchCache_1.branchCache.clear();
        res.json({ success: true, roomDescriptions });
    }
    catch (error) {
        logger_1.logger.error('Error in updateRoomDescriptions:', error);
        res.status(500).json({
            message: 'Fehler beim Speichern der Zimmer-Beschreibungen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateRoomDescriptions = updateRoomDescriptions;
/**
 * GET /api/branches/:id/room-descriptions/:categoryId
 * Lädt Beschreibung für ein spezifisches Zimmer
 */
const getRoomDescription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const branchId = parseInt(req.params.id, 10);
        const categoryId = parseInt(req.params.categoryId, 10);
        if (isNaN(branchId) || isNaN(categoryId)) {
            return res.status(400).json({ message: 'Ungültige Branch-ID oder Category-ID' });
        }
        // Prüfe ob Branch zur Organisation gehört
        const branchFilter = (0, organization_1.getDataIsolationFilter)(req, 'branch');
        const branch = yield prisma_1.prisma.branch.findFirst({
            where: Object.assign({ id: branchId }, branchFilter),
            select: {
                id: true,
                lobbyPmsSettings: true
            }
        });
        if (!branch) {
            return res.status(404).json({ message: 'Branch nicht gefunden' });
        }
        // Lade roomDescriptions
        let roomDescription = null;
        if (branch.lobbyPmsSettings) {
            try {
                const { decryptBranchApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                const decryptedSettings = decryptBranchApiSettings(branch.lobbyPmsSettings);
                const lobbyPmsSettings = (decryptedSettings === null || decryptedSettings === void 0 ? void 0 : decryptedSettings.lobbyPms) || decryptedSettings;
                roomDescription = ((_a = lobbyPmsSettings === null || lobbyPmsSettings === void 0 ? void 0 : lobbyPmsSettings.roomDescriptions) === null || _a === void 0 ? void 0 : _a[categoryId]) || null;
            }
            catch (error) {
                logger_1.logger.warn('[Branch Controller] Fehler beim Entschlüsseln der LobbyPMS Settings:', error);
            }
        }
        res.json(roomDescription || {});
    }
    catch (error) {
        logger_1.logger.error('Error in getRoomDescription:', error);
        res.status(500).json({
            message: 'Fehler beim Laden der Zimmer-Beschreibung',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getRoomDescription = getRoomDescription;
//# sourceMappingURL=branchController.js.map