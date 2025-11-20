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
exports.generateShiftPlan = exports.deleteShift = exports.updateShift = exports.createShift = exports.getShiftById = exports.getAllShifts = void 0;
const client_1 = require("@prisma/client");
const notificationController_1 = require("./notificationController");
const date_fns_1 = require("date-fns");
const prisma_1 = require("../utils/prisma");
/**
 * Hilfsfunktion: Prüft, ob zwei Zeitfenster sich überschneiden
 */
function isTimeOverlap(start1, end1, start2, end2) {
    const [start1Hour, start1Min] = start1.split(':').map(Number);
    const [end1Hour, end1Min] = end1.split(':').map(Number);
    const [start2Hour, start2Min] = start2.split(':').map(Number);
    const [end2Hour, end2Min] = end2.split(':').map(Number);
    const start1Minutes = start1Hour * 60 + start1Min;
    const end1Minutes = end1Hour * 60 + end1Min;
    const start2Minutes = start2Hour * 60 + start2Min;
    const end2Minutes = end2Hour * 60 + end2Min;
    // Überschneidung: start1 < end2 && start2 < end1
    return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
}
/**
 * Berechnet Ziel-Stunden pro Woche basierend auf Vertragstyp
 */
function getTargetWeeklyHours(contractType) {
    if (!contractType) {
        return 45; // Standard: tiempo_completo
    }
    switch (contractType) {
        case 'tiempo_completo':
            return 45; // 9h/Tag × 5 Tage
        case 'tiempo_parcial_7':
            return 10.5; // 1.5h/Tag × 7 Tage
        case 'tiempo_parcial_14':
            return 21; // 1.5h/Tag × 14 Tage
        case 'tiempo_parcial_21':
            return 31.5; // 1.5h/Tag × 21 Tage
        case 'servicios_externos':
            return 0; // Stundenbasiert, kein Ziel
        default:
            return 45; // Standard
    }
}
/**
 * Berechnet Stunden zwischen zwei DateTime-Objekten
 */
function getHoursBetween(start, end) {
    const diffMs = end.getTime() - start.getTime();
    return diffMs / (1000 * 60 * 60); // Millisekunden zu Stunden
}
/**
 * Hilfsfunktion: Findet verfügbare User für eine Schicht
 */
function findAvailableUsers(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const { branchId, roleId, date, dayOfWeek, startTime, endTime, fallbackToAllUsers = true } = params;
        // Hole Verfügbarkeits-Regeln
        const availabilities = yield prisma_1.prisma.userAvailability.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            { branchId: null }, // Branch-übergreifend
                            { branchId }
                        ]
                    },
                    {
                        OR: [
                            { roleId: null }, // Rolle-übergreifend
                            { roleId }
                        ]
                    },
                    {
                        OR: [
                            { dayOfWeek: null }, // Alle Tage
                            { dayOfWeek }
                        ]
                    },
                    {
                        OR: [
                            { startDate: null, endDate: null }, // Keine Datumsbeschränkung
                            {
                                AND: [
                                    { startDate: { lte: date } },
                                    { endDate: { gte: date } }
                                ]
                            }
                        ]
                    }
                ],
                type: { in: ['available', 'preferred'] },
                isActive: true
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        contractType: true // NEU: Für Vertragstyp-Berechnung
                    }
                }
            }
        });
        // Filtere nach Zeitfenster und dedupliziere
        const userMap = new Map();
        for (const av of availabilities) {
            // Prüfe ob Zeitfenster passt
            if (av.startTime && av.endTime) {
                if (!isTimeOverlap(av.startTime, av.endTime, startTime, endTime)) {
                    continue; // Zeitfenster passt nicht
                }
            }
            // Kein Zeitfenster = ganzer Tag verfügbar
            const userId = av.user.id;
            const priority = av.type === 'preferred' ? av.priority + 5 : av.priority; // Preferred bekommt +5 Bonus
            // Wenn User bereits vorhanden, nimm höhere Priorität
            if (!userMap.has(userId) || userMap.get(userId).priority < priority) {
                userMap.set(userId, {
                    user: av.user,
                    priority
                });
            }
        }
        // NEU: Wenn keine Verfügbarkeiten gefunden und Fallback aktiviert
        if (userMap.size === 0 && fallbackToAllUsers) {
            // Hole alle User mit passender Rolle und Branch
            const usersWithRole = yield prisma_1.prisma.user.findMany({
                where: {
                    active: true,
                    roles: {
                        some: {
                            roleId: roleId
                        }
                    },
                    branches: {
                        some: {
                            branchId: branchId
                        }
                    }
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    contractType: true // Für Vertragstyp-Berechnung
                }
            });
            // Konvertiere zu verfügbaren Usern mit niedriger Priorität
            for (const user of usersWithRole) {
                userMap.set(user.id, {
                    user: user,
                    priority: 1 // Niedrige Priorität für User ohne Verfügbarkeiten
                });
            }
        }
        return Array.from(userMap.values());
    });
}
/**
 * Hilfsfunktion: Prüft, ob User bereits eine Schicht zur gleichen Zeit hat
 */
function checkOverlap(userId, date, startTime, endTime) {
    return __awaiter(this, void 0, void 0, function* () {
        const existingShifts = yield prisma_1.prisma.shift.findMany({
            where: {
                userId,
                date: {
                    gte: (0, date_fns_1.startOfDay)(date),
                    lt: (0, date_fns_1.startOfDay)((0, date_fns_1.addDays)(date, 1))
                },
                status: {
                    not: 'cancelled'
                }
            }
        });
        for (const shift of existingShifts) {
            // Prüfe Überschneidung
            if ((startTime >= shift.startTime && startTime < shift.endTime) ||
                (endTime > shift.startTime && endTime <= shift.endTime) ||
                (startTime <= shift.startTime && endTime >= shift.endTime)) {
                return true; // Überschneidung gefunden
            }
        }
        return false; // Keine Überschneidung
    });
}
/**
 * GET /api/shifts
 * Holt alle Schichten (mit Filtern)
 */
const getAllShifts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('[getAllShifts] 🚀 Controller aufgerufen');
    console.log('[getAllShifts] Query:', req.query);
    console.log('[getAllShifts] organizationId:', req.organizationId);
    try {
        const branchId = req.query.branchId ? parseInt(req.query.branchId, 10) : null;
        const roleId = req.query.roleId ? parseInt(req.query.roleId, 10) : null;
        const userId = req.query.userId ? parseInt(req.query.userId, 10) : null;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
        const status = req.query.status;
        console.log('[getAllShifts] Filter:', { branchId, roleId, userId, startDate, endDate, status });
        const where = {};
        if (branchId && !isNaN(branchId)) {
            where.branchId = branchId;
        }
        if (roleId && !isNaN(roleId)) {
            where.roleId = roleId;
        }
        if (userId && !isNaN(userId)) {
            where.userId = userId;
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate) {
                where.date.gte = (0, date_fns_1.startOfDay)(startDate);
            }
            if (endDate) {
                where.date.lte = (0, date_fns_1.startOfDay)((0, date_fns_1.addDays)(endDate, 1));
            }
        }
        if (status) {
            where.status = status;
        }
        console.log('[getAllShifts] 🔍 Führe Prisma-Query aus...');
        const shifts = yield prisma_1.prisma.shift.findMany({
            where,
            include: {
                shiftTemplate: {
                    select: {
                        id: true,
                        name: true,
                        startTime: true,
                        endTime: true
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
                },
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                confirmer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: [
                { date: 'asc' },
                { startTime: 'asc' }
            ]
        });
        console.log('[getAllShifts] ✅ Gefunden:', shifts.length, 'Schichten');
        res.json({
            success: true,
            data: shifts
        });
        console.log('[getAllShifts] ✅ Response gesendet');
    }
    catch (error) {
        console.error('[Shift] Fehler beim Abrufen der Schichten:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Schichten'
        });
    }
});
exports.getAllShifts = getAllShifts;
/**
 * GET /api/shifts/:id
 * Holt eine Schicht nach ID
 */
const getShiftById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const shiftId = parseInt(id, 10);
        if (isNaN(shiftId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Schicht-ID'
            });
        }
        const shift = yield prisma_1.prisma.shift.findUnique({
            where: { id: shiftId },
            include: {
                shiftTemplate: {
                    select: {
                        id: true,
                        name: true,
                        startTime: true,
                        endTime: true
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
                },
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                confirmer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
        if (!shift) {
            return res.status(404).json({
                success: false,
                message: 'Schicht nicht gefunden'
            });
        }
        res.json({
            success: true,
            data: shift
        });
    }
    catch (error) {
        console.error('[Shift] Fehler beim Abrufen der Schicht:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Schicht'
        });
    }
});
exports.getShiftById = getShiftById;
/**
 * POST /api/shifts
 * Erstellt eine neue Schicht
 */
const createShift = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { shiftTemplateId, branchId, roleId, userId, date, notes } = req.body;
        // Validierung
        if (!shiftTemplateId || typeof shiftTemplateId !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'shiftTemplateId ist erforderlich'
            });
        }
        if (!branchId || typeof branchId !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'branchId ist erforderlich'
            });
        }
        if (!roleId || typeof roleId !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'roleId ist erforderlich'
            });
        }
        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'date ist erforderlich'
            });
        }
        const shiftDate = new Date(date);
        if (isNaN(shiftDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Ungültiges Datum'
            });
        }
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!currentUserId) {
            return res.status(401).json({
                success: false,
                message: 'Nicht authentifiziert'
            });
        }
        // Hole Template
        const template = yield prisma_1.prisma.shiftTemplate.findUnique({
            where: { id: shiftTemplateId }
        });
        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'ShiftTemplate nicht gefunden'
            });
        }
        // Erstelle DateTime-Objekte für Start- und Endzeit
        const [startHour, startMin] = template.startTime.split(':').map(Number);
        const [endHour, endMin] = template.endTime.split(':').map(Number);
        const startDateTime = new Date(shiftDate);
        startDateTime.setHours(startHour, startMin, 0, 0);
        const endDateTime = new Date(shiftDate);
        endDateTime.setHours(endHour, endMin, 0, 0);
        // Wenn Endzeit vor Startzeit liegt, ist es eine Nachtschicht (über Mitternacht)
        if (endDateTime <= startDateTime) {
            endDateTime.setDate(endDateTime.getDate() + 1);
        }
        // Prüfe Überschneidung, wenn User zugewiesen
        if (userId) {
            const hasOverlap = yield checkOverlap(userId, shiftDate, startDateTime, endDateTime);
            if (hasOverlap) {
                return res.status(400).json({
                    success: false,
                    message: 'User hat bereits eine Schicht zur gleichen Zeit'
                });
            }
        }
        // Erstelle Schicht
        const shift = yield prisma_1.prisma.shift.create({
            data: {
                shiftTemplateId,
                branchId,
                roleId,
                userId: userId || null,
                date: (0, date_fns_1.startOfDay)(shiftDate),
                startTime: startDateTime,
                endTime: endDateTime,
                status: client_1.ShiftStatus.scheduled,
                notes: notes || null,
                createdBy: currentUserId
            },
            include: {
                shiftTemplate: {
                    select: {
                        id: true,
                        name: true,
                        startTime: true,
                        endTime: true
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
                },
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
        // Benachrichtigung senden, wenn User zugewiesen
        if (userId) {
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId,
                title: 'Neue Schicht zugewiesen',
                message: `Ihnen wurde eine neue Schicht zugewiesen: ${template.name} am ${(0, date_fns_1.format)(shiftDate, 'dd.MM.yyyy')}`,
                type: 'shift',
                relatedEntityId: shift.id,
                relatedEntityType: 'assigned'
            });
        }
        res.status(201).json({
            success: true,
            data: shift
        });
    }
    catch (error) {
        console.error('[Shift] Fehler beim Erstellen der Schicht:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Erstellen der Schicht'
        });
    }
});
exports.createShift = createShift;
/**
 * PUT /api/shifts/:id
 * Aktualisiert eine Schicht
 */
const updateShift = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const shiftId = parseInt(id, 10);
        if (isNaN(shiftId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Schicht-ID'
            });
        }
        const existing = yield prisma_1.prisma.shift.findUnique({
            where: { id: shiftId }
        });
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Schicht nicht gefunden'
            });
        }
        const { userId, date, notes, status } = req.body;
        const updateData = {};
        // Wenn User geändert wird, prüfe Überschneidung
        if (userId !== undefined) {
            const finalUserId = userId || null;
            const finalDate = date ? new Date(date) : existing.date;
            if (finalUserId) {
                // Hole Template für Start-/Endzeit
                const template = yield prisma_1.prisma.shiftTemplate.findUnique({
                    where: { id: existing.shiftTemplateId }
                });
                if (template) {
                    const [startHour, startMin] = template.startTime.split(':').map(Number);
                    const [endHour, endMin] = template.endTime.split(':').map(Number);
                    const startDateTime = new Date(finalDate);
                    startDateTime.setHours(startHour, startMin, 0, 0);
                    const endDateTime = new Date(finalDate);
                    endDateTime.setHours(endHour, endMin, 0, 0);
                    if (endDateTime <= startDateTime) {
                        endDateTime.setDate(endDateTime.getDate() + 1);
                    }
                    const hasOverlap = yield checkOverlap(finalUserId, finalDate, startDateTime, endDateTime);
                    if (hasOverlap && finalUserId !== existing.userId) {
                        return res.status(400).json({
                            success: false,
                            message: 'User hat bereits eine Schicht zur gleichen Zeit'
                        });
                    }
                }
            }
            updateData.userId = finalUserId;
            // Benachrichtigung senden, wenn User geändert wurde
            if (finalUserId && finalUserId !== existing.userId) {
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: finalUserId,
                    title: 'Schicht zugewiesen',
                    message: `Ihnen wurde eine Schicht zugewiesen: ${(0, date_fns_1.format)(existing.date, 'dd.MM.yyyy')}`,
                    type: 'shift',
                    relatedEntityId: shiftId,
                    relatedEntityType: 'assigned'
                });
            }
        }
        if (date !== undefined) {
            const shiftDate = new Date(date);
            if (isNaN(shiftDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Ungültiges Datum'
                });
            }
            // Aktualisiere auch startTime und endTime basierend auf Template
            const template = yield prisma_1.prisma.shiftTemplate.findUnique({
                where: { id: existing.shiftTemplateId }
            });
            if (template) {
                const [startHour, startMin] = template.startTime.split(':').map(Number);
                const [endHour, endMin] = template.endTime.split(':').map(Number);
                const startDateTime = new Date(shiftDate);
                startDateTime.setHours(startHour, startMin, 0, 0);
                const endDateTime = new Date(shiftDate);
                endDateTime.setHours(endHour, endMin, 0, 0);
                if (endDateTime <= startDateTime) {
                    endDateTime.setDate(endDateTime.getDate() + 1);
                }
                updateData.date = (0, date_fns_1.startOfDay)(shiftDate);
                updateData.startTime = startDateTime;
                updateData.endTime = endDateTime;
            }
            else {
                updateData.date = (0, date_fns_1.startOfDay)(shiftDate);
            }
            // Benachrichtigung senden, wenn Datum geändert wurde
            if (existing.userId) {
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: existing.userId,
                    title: 'Schicht geändert',
                    message: `Ihre Schicht wurde auf ${(0, date_fns_1.format)(shiftDate, 'dd.MM.yyyy')} verschoben`,
                    type: 'shift',
                    relatedEntityId: shiftId,
                    relatedEntityType: 'updated'
                });
            }
        }
        if (notes !== undefined) {
            updateData.notes = notes;
        }
        if (status !== undefined) {
            if (!Object.values(client_1.ShiftStatus).includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `status muss einer der folgenden Werte sein: ${Object.values(client_1.ShiftStatus).join(', ')}`
                });
            }
            updateData.status = status;
            // Wenn bestätigt, setze confirmedAt und confirmedBy
            if (status === 'confirmed' && !existing.confirmedAt) {
                const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                updateData.confirmedAt = new Date();
                updateData.confirmedBy = currentUserId || null;
            }
        }
        const shift = yield prisma_1.prisma.shift.update({
            where: { id: shiftId },
            data: updateData,
            include: {
                shiftTemplate: {
                    select: {
                        id: true,
                        name: true,
                        startTime: true,
                        endTime: true
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
                },
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                confirmer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
        res.json({
            success: true,
            data: shift
        });
    }
    catch (error) {
        console.error('[Shift] Fehler beim Aktualisieren der Schicht:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Schicht'
        });
    }
});
exports.updateShift = updateShift;
/**
 * DELETE /api/shifts/:id
 * Löscht eine Schicht
 */
const deleteShift = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const shiftId = parseInt(id, 10);
        if (isNaN(shiftId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Schicht-ID'
            });
        }
        const existing = yield prisma_1.prisma.shift.findUnique({
            where: { id: shiftId }
        });
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Schicht nicht gefunden'
            });
        }
        // Benachrichtigung senden, wenn User zugewiesen
        if (existing.userId) {
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: existing.userId,
                title: 'Schicht abgesagt',
                message: `Ihre Schicht am ${(0, date_fns_1.format)(existing.date, 'dd.MM.yyyy')} wurde abgesagt`,
                type: 'shift',
                relatedEntityId: shiftId,
                relatedEntityType: 'cancelled'
            });
        }
        yield prisma_1.prisma.shift.delete({
            where: { id: shiftId }
        });
        res.json({
            success: true,
            message: 'Schicht erfolgreich gelöscht'
        });
    }
    catch (error) {
        console.error('[Shift] Fehler beim Löschen der Schicht:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Löschen der Schicht'
        });
    }
});
exports.deleteShift = deleteShift;
/**
 * POST /api/shifts/generate
 * Generiert automatisch einen Schichtplan
 */
const generateShiftPlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { startDate, endDate, branchId, roleIds } = req.body;
        // Validierung
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate und endDate sind erforderlich'
            });
        }
        if (!branchId || typeof branchId !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'branchId ist erforderlich'
            });
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Datumsangaben'
            });
        }
        if (start >= end) {
            return res.status(400).json({
                success: false,
                message: 'startDate muss vor endDate liegen'
            });
        }
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!currentUserId) {
            return res.status(401).json({
                success: false,
                message: 'Nicht authentifiziert'
            });
        }
        // Hole Rollen
        const roles = roleIds && roleIds.length > 0
            ? yield prisma_1.prisma.role.findMany({
                where: { id: { in: roleIds } }
            })
            : yield prisma_1.prisma.role.findMany({
                where: {
                    branches: {
                        some: { branchId }
                    }
                }
            });
        if (roles.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Keine Rollen für diese Branch gefunden'
            });
        }
        const shifts = [];
        const userWorkload = new Map();
        const conflicts = [];
        // Iteriere über alle Tage
        for (let date = new Date(start); date <= end; date = (0, date_fns_1.addDays)(date, 1)) {
            const dayOfWeek = date.getDay();
            // Iteriere über alle Rollen
            for (const role of roles) {
                // Hole ShiftTemplates für diese Rolle
                const templates = yield prisma_1.prisma.shiftTemplate.findMany({
                    where: {
                        roleId: role.id,
                        branchId,
                        isActive: true
                    }
                });
                for (const template of templates) {
                    // Finde verfügbare User
                    const availableUsers = yield findAvailableUsers({
                        branchId,
                        roleId: role.id,
                        date,
                        dayOfWeek,
                        startTime: template.startTime,
                        endTime: template.endTime,
                        fallbackToAllUsers: true // Fallback aktivieren
                    });
                    if (availableUsers.length === 0) {
                        // Keine Verfügbarkeit -> Schicht ohne User erstellen
                        const [startHour, startMin] = template.startTime.split(':').map(Number);
                        const [endHour, endMin] = template.endTime.split(':').map(Number);
                        const startDateTime = new Date(date);
                        startDateTime.setHours(startHour, startMin, 0, 0);
                        const endDateTime = new Date(date);
                        endDateTime.setHours(endHour, endMin, 0, 0);
                        if (endDateTime <= startDateTime) {
                            endDateTime.setDate(endDateTime.getDate() + 1);
                        }
                        shifts.push({
                            shiftTemplateId: template.id,
                            branchId,
                            roleId: role.id,
                            userId: null,
                            date: (0, date_fns_1.startOfDay)(date),
                            startTime: startDateTime,
                            endTime: endDateTime,
                            status: client_1.ShiftStatus.scheduled,
                            createdBy: currentUserId
                        });
                        conflicts.push({
                            date,
                            roleId: role.id,
                            templateId: template.id,
                            reason: 'Keine verfügbaren User'
                        });
                        continue;
                    }
                    // Sortiere nach Priorität und Stunden-Defizit
                    const sortedUsers = availableUsers
                        .map(av => {
                        // Initialisiere userWorkload beim ersten Auftreten
                        if (!userWorkload.has(av.user.id)) {
                            userWorkload.set(av.user.id, {
                                count: 0,
                                hours: 0,
                                targetHours: getTargetWeeklyHours(av.user.contractType)
                            });
                        }
                        const workload = userWorkload.get(av.user.id);
                        const deficit = workload.targetHours - workload.hours; // Defizit = Ziel - Aktuell
                        return {
                            user: av.user,
                            priority: av.priority,
                            workload: workload,
                            deficit: deficit // NEU: Stunden-Defizit
                        };
                    })
                        .sort((a, b) => {
                        // Erst nach Priorität (höher = besser)
                        if (b.priority !== a.priority) {
                            return b.priority - a.priority;
                        }
                        // Dann nach Stunden-Defizit (größer = besser) - User mit größtem Defizit bekommen Vorrang
                        return b.deficit - a.deficit;
                    });
                    // Versuche User zuzuweisen
                    let assigned = false;
                    for (const candidate of sortedUsers) {
                        const [startHour, startMin] = template.startTime.split(':').map(Number);
                        const [endHour, endMin] = template.endTime.split(':').map(Number);
                        const startDateTime = new Date(date);
                        startDateTime.setHours(startHour, startMin, 0, 0);
                        const endDateTime = new Date(date);
                        endDateTime.setHours(endHour, endMin, 0, 0);
                        if (endDateTime <= startDateTime) {
                            endDateTime.setDate(endDateTime.getDate() + 1);
                        }
                        // Prüfe Überschneidung
                        const hasOverlap = yield checkOverlap(candidate.user.id, date, startDateTime, endDateTime);
                        if (!hasOverlap) {
                            // Berechne Schicht-Dauer in Stunden
                            const shiftHours = getHoursBetween(startDateTime, endDateTime);
                            // Hole aktuelles Workload
                            const currentWorkload = userWorkload.get(candidate.user.id) || {
                                count: 0,
                                hours: 0,
                                targetHours: getTargetWeeklyHours(candidate.user.contractType)
                            };
                            // Prüfe, ob User bereits Ziel-Stunden erreicht hat (nur für tiempo_completo und tiempo_parcial)
                            if (currentWorkload.targetHours > 0 && currentWorkload.hours >= currentWorkload.targetHours) {
                                // User hat bereits Ziel-Stunden erreicht, überspringe
                                continue;
                            }
                            // User zuweisen
                            shifts.push({
                                shiftTemplateId: template.id,
                                branchId,
                                roleId: role.id,
                                userId: candidate.user.id,
                                date: (0, date_fns_1.startOfDay)(date),
                                startTime: startDateTime,
                                endTime: endDateTime,
                                status: client_1.ShiftStatus.scheduled,
                                createdBy: currentUserId
                            });
                            // Aktualisiere userWorkload (Stunden statt Anzahl)
                            userWorkload.set(candidate.user.id, {
                                count: currentWorkload.count + 1,
                                hours: currentWorkload.hours + shiftHours,
                                targetHours: currentWorkload.targetHours
                            });
                            assigned = true;
                            break;
                        }
                    }
                    if (!assigned) {
                        // Kein User konnte zugewiesen werden (alle haben Überschneidungen)
                        const [startHour, startMin] = template.startTime.split(':').map(Number);
                        const [endHour, endMin] = template.endTime.split(':').map(Number);
                        const startDateTime = new Date(date);
                        startDateTime.setHours(startHour, startMin, 0, 0);
                        const endDateTime = new Date(date);
                        endDateTime.setHours(endHour, endMin, 0, 0);
                        if (endDateTime <= startDateTime) {
                            endDateTime.setDate(endDateTime.getDate() + 1);
                        }
                        shifts.push({
                            shiftTemplateId: template.id,
                            branchId,
                            roleId: role.id,
                            userId: null,
                            date: (0, date_fns_1.startOfDay)(date),
                            startTime: startDateTime,
                            endTime: endDateTime,
                            status: client_1.ShiftStatus.scheduled,
                            createdBy: currentUserId
                        });
                        conflicts.push({
                            date,
                            roleId: role.id,
                            templateId: template.id,
                            reason: 'Alle verfügbaren User haben Überschneidungen'
                        });
                    }
                }
            }
        }
        // Erstelle Schichten in der Datenbank
        const createdShifts = yield prisma_1.prisma.shift.createMany({
            data: shifts
        });
        // Hole erstellte Schichten mit Relations
        const shiftsWithRelations = yield prisma_1.prisma.shift.findMany({
            where: {
                branchId,
                date: {
                    gte: (0, date_fns_1.startOfDay)(start),
                    lte: (0, date_fns_1.startOfDay)((0, date_fns_1.addDays)(end, 1))
                }
            },
            include: {
                shiftTemplate: true,
                branch: true,
                role: true,
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            },
            orderBy: [
                { date: 'asc' },
                { startTime: 'asc' }
            ]
        });
        // Benachrichtigungen senden
        for (const shift of shiftsWithRelations) {
            if (shift.userId) {
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: shift.userId,
                    title: 'Neue Schicht zugewiesen',
                    message: `Ihnen wurde eine neue Schicht zugewiesen: ${shift.shiftTemplate.name} am ${(0, date_fns_1.format)(shift.date, 'dd.MM.yyyy')}`,
                    type: 'shift',
                    relatedEntityId: shift.id,
                    relatedEntityType: 'assigned'
                });
            }
        }
        res.status(201).json({
            success: true,
            data: {
                shifts: shiftsWithRelations,
                summary: {
                    total: shifts.length,
                    assigned: shifts.filter(s => s.userId !== null).length,
                    unassigned: shifts.filter(s => s.userId === null).length,
                    conflicts: conflicts.length
                },
                conflicts
            }
        });
    }
    catch (error) {
        console.error('[Shift] Fehler beim Generieren des Schichtplans:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Generieren des Schichtplans'
        });
    }
});
exports.generateShiftPlan = generateShiftPlan;
//# sourceMappingURL=shiftController.js.map