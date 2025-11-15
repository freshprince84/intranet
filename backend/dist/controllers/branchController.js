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
const client_1 = require("@prisma/client");
const organization_1 = require("../middleware/organization");
const prisma = new client_1.PrismaClient();
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
                whatsappSettings: true
            };
        }
        let branches = yield prisma.branch.findMany(queryOptions);
        // Entschlüssele WhatsApp Settings für alle Branches
        // Branch-Settings sind flach strukturiert (apiKey direkt), nicht verschachtelt (whatsapp.apiKey)
        const { decryptSecret } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
        branches = branches.map((branch) => {
            if (branch.whatsappSettings) {
                try {
                    const settings = branch.whatsappSettings;
                    // Prüfe ob Settings verschlüsselt sind (Format: iv:authTag:encrypted)
                    if (settings.apiKey && typeof settings.apiKey === 'string' && settings.apiKey.includes(':')) {
                        settings.apiKey = decryptSecret(settings.apiKey);
                    }
                    if (settings.apiSecret && typeof settings.apiSecret === 'string' && settings.apiSecret.includes(':')) {
                        settings.apiSecret = decryptSecret(settings.apiSecret);
                    }
                    branch.whatsappSettings = settings;
                }
                catch (error) {
                    console.warn(`[Branch Controller] Fehler beim Entschlüsseln der WhatsApp Settings für Branch ${branch.id}:`, error);
                    // Bei Fehler: Settings bleiben verschlüsselt (für Migration)
                }
            }
            return branch;
        });
        // Wenn roleId angegeben, filtere Branches nach Verfügbarkeit für diese Rolle
        if (roleId && !isNaN(roleId)) {
            // Hole die Rolle, um allBranches zu prüfen
            const role = yield prisma.role.findUnique({
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
            // Entferne das 'roles' Feld aus der Antwort, behalte aber whatsappSettings
            branches = branches.map(branch => ({
                id: branch.id,
                name: branch.name,
                whatsappSettings: branch.whatsappSettings
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
        // Datenisolation: Zeigt nur Branches der Organisation
        const branchFilter = (0, organization_1.getDataIsolationFilter)(req, 'branch');
        // Lade alle Branches des Users mit lastUsed-Flag
        const userBranches = yield prisma.usersBranches.findMany({
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
        // Transformiere zu einfachem Format mit lastUsed-Flag
        const branches = userBranches.map(ub => ({
            id: ub.branch.id,
            name: ub.branch.name,
            lastUsed: ub.lastUsed
        }));
        res.json(branches);
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
        const userBranch = yield prisma.usersBranches.findFirst({
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
        const branch = yield prisma.branch.findFirst({
            where: Object.assign({ id: branchId }, branchFilter)
        });
        if (!branch) {
            return res.status(403).json({
                message: 'Zugriff auf diese Niederlassung verweigert'
            });
        }
        // Prüfe, ob die aktive Rolle für die neue Branch verfügbar ist
        const activeRole = yield prisma.userRole.findFirst({
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
        yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
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
        const updatedUserBranches = yield prisma.usersBranches.findMany({
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
        const existingBranch = yield prisma.branch.findUnique({
            where: { name: name.trim() }
        });
        if (existingBranch) {
            return res.status(400).json({
                message: 'Eine Niederlassung mit diesem Namen existiert bereits'
            });
        }
        // Erstelle Branch
        const branch = yield prisma.branch.create({
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
        const { name, whatsappSettings } = req.body;
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
        const existingBranch = yield prisma.branch.findFirst({
            where: Object.assign({ id: branchId }, branchFilter)
        });
        if (!existingBranch) {
            return res.status(404).json({ message: 'Niederlassung nicht gefunden' });
        }
        // Prüfe ob Branch mit neuem Namen bereits existiert (außer dem aktuellen)
        const duplicateBranch = yield prisma.branch.findFirst({
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
        // Verschlüssele WhatsApp Settings falls vorhanden
        let encryptedWhatsAppSettings = whatsappSettings;
        if (whatsappSettings) {
            try {
                const { encryptApiSettings } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                encryptedWhatsAppSettings = encryptApiSettings(whatsappSettings);
                console.log('[Branch Controller] WhatsApp Settings verschlüsselt und bereit zum Speichern');
            }
            catch (error) {
                console.warn('[Branch Controller] WhatsApp Settings Verschlüsselung fehlgeschlagen, speichere unverschlüsselt:', error);
                // Falls Verschlüsselung fehlschlägt, speichere unverschlüsselt (nur für Development)
            }
        }
        // Aktualisiere Branch
        const updateData = {
            name: name.trim()
        };
        if (whatsappSettings !== undefined) {
            updateData.whatsappSettings = encryptedWhatsAppSettings;
            console.log('[Branch Controller] WhatsApp Settings werden gespeichert:', {
                hasProvider: !!(whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.provider),
                hasApiKey: !!(whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.apiKey),
                hasPhoneNumberId: !!(whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.phoneNumberId)
            });
        }
        else {
            console.log('[Branch Controller] Keine WhatsApp Settings im Request');
        }
        const updatedBranch = yield prisma.branch.update({
            where: { id: branchId },
            data: updateData,
            select: {
                id: true,
                name: true,
                whatsappSettings: true
            }
        });
        // Entschlüssele WhatsApp Settings für Response (Frontend braucht entschlüsselte Werte)
        // Branch-Settings sind flach strukturiert (apiKey direkt), nicht verschachtelt (whatsapp.apiKey)
        if (updatedBranch.whatsappSettings) {
            try {
                const { decryptSecret } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
                const settings = updatedBranch.whatsappSettings;
                // Prüfe ob Settings verschlüsselt sind (Format: iv:authTag:encrypted)
                if (settings.apiKey && typeof settings.apiKey === 'string' && settings.apiKey.includes(':')) {
                    settings.apiKey = decryptSecret(settings.apiKey);
                }
                if (settings.apiSecret && typeof settings.apiSecret === 'string' && settings.apiSecret.includes(':')) {
                    settings.apiSecret = decryptSecret(settings.apiSecret);
                }
                updatedBranch.whatsappSettings = settings;
            }
            catch (error) {
                console.warn('[Branch Controller] Fehler beim Entschlüsseln der WhatsApp Settings:', error);
                // Bei Fehler: Settings bleiben verschlüsselt (für Migration)
            }
        }
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
        const branch = yield prisma.branch.findFirst({
            where: Object.assign({ id: branchId }, branchFilter)
        });
        if (!branch) {
            return res.status(404).json({ message: 'Niederlassung nicht gefunden' });
        }
        // Prüfe ob Branch verwendet wird
        const [workTimes, tasks, requests, userBranches] = yield Promise.all([
            prisma.workTime.count({
                where: { branchId }
            }),
            prisma.task.count({
                where: { branchId }
            }),
            prisma.request.count({
                where: { branchId }
            }),
            prisma.usersBranches.count({
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
        yield prisma.branch.delete({
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