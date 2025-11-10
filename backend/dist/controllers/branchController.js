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
// Alle Niederlassungen abrufen
const getAllBranches = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Datenisolation: Zeigt alle Branches der Organisation oder nur eigene (wenn standalone)
        const branchFilter = (0, organization_1.getDataIsolationFilter)(req, 'branch');
        const branches = yield prisma.branch.findMany({
            where: branchFilter,
            select: {
                id: true,
                name: true
            },
            orderBy: { name: 'asc' }
        });
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
        const { name } = req.body;
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
        // Aktualisiere Branch
        const updatedBranch = yield prisma.branch.update({
            where: { id: branchId },
            data: {
                name: name.trim()
            }
        });
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