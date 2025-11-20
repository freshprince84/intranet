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
exports.deleteAvailability = exports.updateAvailability = exports.createAvailability = exports.getAvailabilityById = exports.getAllAvailabilities = void 0;
const client_1 = require("@prisma/client");
const permissionMiddleware_1 = require("../middleware/permissionMiddleware");
const prisma = new client_1.PrismaClient();
/**
 * GET /api/shifts/availabilities
 * Holt alle Verfügbarkeiten (optional gefiltert nach userId, branchId, roleId)
 */
const getAllAvailabilities = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = req.query.userId ? parseInt(req.query.userId, 10) : null;
        const branchId = req.query.branchId ? parseInt(req.query.branchId, 10) : null;
        const roleId = req.query.roleId ? parseInt(req.query.roleId, 10) : null;
        // Wenn kein userId angegeben, verwende den eingeloggten User
        const finalUserId = userId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        if (!finalUserId) {
            return res.status(401).json({
                success: false,
                message: 'Nicht authentifiziert'
            });
        }
        const currentUserId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
        const currentRoleId = req.roleId ? parseInt(req.roleId, 10) : null;
        // Prüfe, ob User alle Verfügbarkeiten sehen darf (Permission)
        let canViewAll = false;
        if (currentRoleId && currentUserId) {
            canViewAll = yield (0, permissionMiddleware_1.checkUserPermission)(currentUserId, currentRoleId, 'availability_management', 'read', 'page');
        }
        const where = {};
        // Wenn User Permission hat und kein userId angegeben → zeige alle
        if (canViewAll && !userId) {
            // Kein Filter auf userId - zeige alle Verfügbarkeiten
        }
        else {
            // Normaler User: nur eigene Verfügbarkeiten
            where.userId = finalUserId;
        }
        if (branchId && !isNaN(branchId)) {
            where.branchId = branchId;
        }
        if (roleId && !isNaN(roleId)) {
            where.roleId = roleId;
        }
        // Nur aktive Verfügbarkeiten, wenn nicht anders angegeben
        if (req.query.includeInactive !== 'true') {
            where.isActive = true;
        }
        const availabilities = yield prisma.userAvailability.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                branch: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                role: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                }
            },
            orderBy: [
                { dayOfWeek: 'asc' },
                { startTime: 'asc' }
            ]
        });
        res.json({
            success: true,
            data: availabilities
        });
    }
    catch (error) {
        console.error('[UserAvailability] Fehler beim Abrufen der Verfügbarkeiten:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Verfügbarkeiten'
        });
    }
});
exports.getAllAvailabilities = getAllAvailabilities;
/**
 * GET /api/shifts/availabilities/:id
 * Holt eine Verfügbarkeit nach ID
 */
const getAvailabilityById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const availabilityId = parseInt(id, 10);
        if (isNaN(availabilityId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Verfügbarkeits-ID'
            });
        }
        const availability = yield prisma.userAvailability.findUnique({
            where: { id: availabilityId },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                branch: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                role: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                }
            }
        });
        if (!availability) {
            return res.status(404).json({
                success: false,
                message: 'Verfügbarkeit nicht gefunden'
            });
        }
        // Prüfe, ob User Zugriff hat (nur eigene Verfügbarkeiten oder Permission)
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const currentRoleId = req.roleId ? parseInt(req.roleId, 10) : null;
        if (availability.userId !== currentUserId) {
            if (!currentRoleId || !currentUserId) {
                return res.status(401).json({
                    success: false,
                    message: 'Nicht authentifiziert'
                });
            }
            const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(currentUserId, currentRoleId, 'availability_management', 'read', 'page');
            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: 'Keine Berechtigung'
                });
            }
        }
        res.json({
            success: true,
            data: availability
        });
    }
    catch (error) {
        console.error('[UserAvailability] Fehler beim Abrufen der Verfügbarkeit:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Verfügbarkeit'
        });
    }
});
exports.getAvailabilityById = getAvailabilityById;
/**
 * POST /api/shifts/availabilities
 * Erstellt eine neue Verfügbarkeit
 */
const createAvailability = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { userId, branchId, roleId, dayOfWeek, startTime, endTime, startDate, endDate, type, priority, notes, isActive } = req.body;
        // Wenn kein userId angegeben, verwende den eingeloggten User
        const finalUserId = userId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        if (!finalUserId) {
            return res.status(401).json({
                success: false,
                message: 'Nicht authentifiziert'
            });
        }
        // Prüfe, ob User Zugriff hat (nur eigene Verfügbarkeiten oder Permission)
        const currentUserId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
        const currentRoleId = req.roleId ? parseInt(req.roleId, 10) : null;
        if (finalUserId !== currentUserId) {
            // User versucht Verfügbarkeit für anderen User zu erstellen
            if (!currentRoleId || !currentUserId) {
                return res.status(401).json({
                    success: false,
                    message: 'Nicht authentifiziert'
                });
            }
            // Prüfe Permission
            const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(currentUserId, currentRoleId, 'availability_management', 'write', 'page');
            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: 'Keine Berechtigung, Verfügbarkeiten für andere User zu erstellen'
                });
            }
        }
        // Validierung
        if (dayOfWeek !== null && dayOfWeek !== undefined) {
            if (typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6) {
                return res.status(400).json({
                    success: false,
                    message: 'dayOfWeek muss eine Zahl zwischen 0 (Sonntag) und 6 (Samstag) sein'
                });
            }
        }
        if (startTime && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(startTime)) {
            return res.status(400).json({
                success: false,
                message: 'startTime muss im Format HH:mm sein'
            });
        }
        if (endTime && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(endTime)) {
            return res.status(400).json({
                success: false,
                message: 'endTime muss im Format HH:mm sein'
            });
        }
        if (startTime && endTime) {
            const [startHour, startMin] = startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            if (startMinutes >= endMinutes) {
                return res.status(400).json({
                    success: false,
                    message: 'startTime muss vor endTime liegen'
                });
            }
        }
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (start >= end) {
                return res.status(400).json({
                    success: false,
                    message: 'startDate muss vor endDate liegen'
                });
            }
        }
        if (type && !Object.values(client_1.AvailabilityType).includes(type)) {
            return res.status(400).json({
                success: false,
                message: `type muss einer der folgenden Werte sein: ${Object.values(client_1.AvailabilityType).join(', ')}`
            });
        }
        if (priority !== undefined && (typeof priority !== 'number' || priority < 1 || priority > 10)) {
            return res.status(400).json({
                success: false,
                message: 'priority muss eine Zahl zwischen 1 und 10 sein'
            });
        }
        // Prüfe, ob User existiert
        const user = yield prisma.user.findUnique({ where: { id: finalUserId } });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User nicht gefunden'
            });
        }
        // Prüfe, ob Branch existiert (wenn angegeben)
        if (branchId) {
            const branch = yield prisma.branch.findUnique({ where: { id: branchId } });
            if (!branch) {
                return res.status(404).json({
                    success: false,
                    message: 'Branch nicht gefunden'
                });
            }
        }
        // Prüfe, ob Rolle existiert (wenn angegeben)
        if (roleId) {
            const role = yield prisma.role.findUnique({ where: { id: roleId } });
            if (!role) {
                return res.status(404).json({
                    success: false,
                    message: 'Rolle nicht gefunden'
                });
            }
        }
        // Erstelle Verfügbarkeit
        const availability = yield prisma.userAvailability.create({
            data: {
                userId: finalUserId,
                branchId: branchId || null,
                roleId: roleId || null,
                dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : null,
                startTime: startTime || null,
                endTime: endTime || null,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                type: type || client_1.AvailabilityType.available,
                priority: priority || 5,
                notes: notes || null,
                isActive: isActive !== undefined ? isActive : true
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                branch: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                role: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                }
            }
        });
        res.status(201).json({
            success: true,
            data: availability
        });
    }
    catch (error) {
        console.error('[UserAvailability] Fehler beim Erstellen der Verfügbarkeit:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Erstellen der Verfügbarkeit'
        });
    }
});
exports.createAvailability = createAvailability;
/**
 * PUT /api/shifts/availabilities/:id
 * Aktualisiert eine Verfügbarkeit
 */
const updateAvailability = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const availabilityId = parseInt(id, 10);
        if (isNaN(availabilityId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Verfügbarkeits-ID'
            });
        }
        // Prüfe, ob Verfügbarkeit existiert
        const existing = yield prisma.userAvailability.findUnique({
            where: { id: availabilityId }
        });
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Verfügbarkeit nicht gefunden'
            });
        }
        // Prüfe, ob User Zugriff hat (nur eigene Verfügbarkeiten oder Permission)
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const currentRoleId = req.roleId ? parseInt(req.roleId, 10) : null;
        if (existing.userId !== currentUserId) {
            if (!currentRoleId || !currentUserId) {
                return res.status(401).json({
                    success: false,
                    message: 'Nicht authentifiziert'
                });
            }
            const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(currentUserId, currentRoleId, 'availability_management', 'write', 'page');
            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: 'Keine Berechtigung'
                });
            }
        }
        const { dayOfWeek, startTime, endTime, startDate, endDate, type, priority, notes, isActive } = req.body;
        const updateData = {};
        // Validierung (nur wenn Felder gesetzt sind)
        if (dayOfWeek !== undefined) {
            if (dayOfWeek !== null && (typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6)) {
                return res.status(400).json({
                    success: false,
                    message: 'dayOfWeek muss eine Zahl zwischen 0 (Sonntag) und 6 (Samstag) sein oder null'
                });
            }
            updateData.dayOfWeek = dayOfWeek;
        }
        if (startTime !== undefined) {
            if (startTime && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(startTime)) {
                return res.status(400).json({
                    success: false,
                    message: 'startTime muss im Format HH:mm sein'
                });
            }
            updateData.startTime = startTime || null;
        }
        if (endTime !== undefined) {
            if (endTime && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(endTime)) {
                return res.status(400).json({
                    success: false,
                    message: 'endTime muss im Format HH:mm sein'
                });
            }
            updateData.endTime = endTime || null;
        }
        // Prüfe Zeitfenster-Konsistenz
        const finalStartTime = updateData.startTime !== undefined ? updateData.startTime : existing.startTime;
        const finalEndTime = updateData.endTime !== undefined ? updateData.endTime : existing.endTime;
        if (finalStartTime && finalEndTime) {
            const [startHour, startMin] = finalStartTime.split(':').map(Number);
            const [endHour, endMin] = finalEndTime.split(':').map(Number);
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            if (startMinutes >= endMinutes) {
                return res.status(400).json({
                    success: false,
                    message: 'startTime muss vor endTime liegen'
                });
            }
        }
        if (startDate !== undefined) {
            updateData.startDate = startDate ? new Date(startDate) : null;
        }
        if (endDate !== undefined) {
            updateData.endDate = endDate ? new Date(endDate) : null;
        }
        // Prüfe Datumsbereich-Konsistenz
        const finalStartDate = updateData.startDate !== undefined ? updateData.startDate : existing.startDate;
        const finalEndDate = updateData.endDate !== undefined ? updateData.endDate : existing.endDate;
        if (finalStartDate && finalEndDate) {
            const start = new Date(finalStartDate);
            const end = new Date(finalEndDate);
            if (start >= end) {
                return res.status(400).json({
                    success: false,
                    message: 'startDate muss vor endDate liegen'
                });
            }
        }
        if (type !== undefined) {
            if (!Object.values(client_1.AvailabilityType).includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: `type muss einer der folgenden Werte sein: ${Object.values(client_1.AvailabilityType).join(', ')}`
                });
            }
            updateData.type = type;
        }
        if (priority !== undefined) {
            if (typeof priority !== 'number' || priority < 1 || priority > 10) {
                return res.status(400).json({
                    success: false,
                    message: 'priority muss eine Zahl zwischen 1 und 10 sein'
                });
            }
            updateData.priority = priority;
        }
        if (notes !== undefined) {
            updateData.notes = notes || null;
        }
        if (isActive !== undefined) {
            updateData.isActive = isActive;
        }
        const availability = yield prisma.userAvailability.update({
            where: { id: availabilityId },
            data: updateData,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                branch: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                role: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                }
            }
        });
        res.json({
            success: true,
            data: availability
        });
    }
    catch (error) {
        console.error('[UserAvailability] Fehler beim Aktualisieren der Verfügbarkeit:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Verfügbarkeit'
        });
    }
});
exports.updateAvailability = updateAvailability;
/**
 * DELETE /api/shifts/availabilities/:id
 * Löscht eine Verfügbarkeit
 */
const deleteAvailability = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const availabilityId = parseInt(id, 10);
        if (isNaN(availabilityId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Verfügbarkeits-ID'
            });
        }
        // Prüfe, ob Verfügbarkeit existiert
        const existing = yield prisma.userAvailability.findUnique({
            where: { id: availabilityId }
        });
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Verfügbarkeit nicht gefunden'
            });
        }
        // Prüfe, ob User Zugriff hat (nur eigene Verfügbarkeiten oder Permission)
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const currentRoleId = req.roleId ? parseInt(req.roleId, 10) : null;
        if (existing.userId !== currentUserId) {
            if (!currentRoleId || !currentUserId) {
                return res.status(401).json({
                    success: false,
                    message: 'Nicht authentifiziert'
                });
            }
            const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(currentUserId, currentRoleId, 'availability_management', 'write', 'page');
            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: 'Keine Berechtigung'
                });
            }
        }
        yield prisma.userAvailability.delete({
            where: { id: availabilityId }
        });
        res.json({
            success: true,
            message: 'Verfügbarkeit erfolgreich gelöscht'
        });
    }
    catch (error) {
        console.error('[UserAvailability] Fehler beim Löschen der Verfügbarkeit:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Löschen der Verfügbarkeit'
        });
    }
});
exports.deleteAvailability = deleteAvailability;
//# sourceMappingURL=userAvailabilityController.js.map