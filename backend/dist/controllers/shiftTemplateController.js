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
exports.deleteShiftTemplate = exports.updateShiftTemplate = exports.createShiftTemplate = exports.getShiftTemplateById = exports.getAllShiftTemplates = void 0;
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
/**
 * GET /api/shifts/templates
 * Holt alle ShiftTemplates (optional gefiltert nach branchId, roleId)
 */
const getAllShiftTemplates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const branchId = req.query.branchId ? parseInt(req.query.branchId, 10) : null;
        const roleId = req.query.roleId ? parseInt(req.query.roleId, 10) : null;
        const where = {};
        if (branchId && !isNaN(branchId)) {
            where.branchId = branchId;
        }
        if (roleId && !isNaN(roleId)) {
            where.roleId = roleId;
        }
        // Nur aktive Templates, wenn nicht anders angegeben
        if (req.query.includeInactive !== 'true') {
            where.isActive = true;
        }
        const templates = yield prisma_1.prisma.shiftTemplate.findMany({
            where,
            include: {
                role: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                },
                branch: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: [
                { branchId: 'asc' },
                { roleId: 'asc' },
                { startTime: 'asc' }
            ]
        });
        res.json({
            success: true,
            data: templates
        });
    }
    catch (error) {
        logger_1.logger.error('[ShiftTemplate] Fehler beim Abrufen der Templates:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Templates'
        });
    }
});
exports.getAllShiftTemplates = getAllShiftTemplates;
/**
 * GET /api/shifts/templates/:id
 * Holt ein ShiftTemplate nach ID
 */
const getShiftTemplateById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const templateId = parseInt(id, 10);
        if (isNaN(templateId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Template-ID'
            });
        }
        const template = yield prisma_1.prisma.shiftTemplate.findUnique({
            where: { id: templateId },
            include: {
                role: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                },
                branch: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template nicht gefunden'
            });
        }
        res.json({
            success: true,
            data: template
        });
    }
    catch (error) {
        logger_1.logger.error('[ShiftTemplate] Fehler beim Abrufen des Templates:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Abrufen des Templates'
        });
    }
});
exports.getShiftTemplateById = getShiftTemplateById;
/**
 * POST /api/shifts/templates
 * Erstellt ein neues ShiftTemplate
 */
const createShiftTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { roleId, branchId, name, startTime, endTime, duration, isActive } = req.body;
        // Validierung
        if (!roleId || typeof roleId !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'roleId ist erforderlich und muss eine Zahl sein'
            });
        }
        if (!branchId || typeof branchId !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'branchId ist erforderlich und muss eine Zahl sein'
            });
        }
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Name ist erforderlich'
            });
        }
        if (!startTime || typeof startTime !== 'string' || !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(startTime)) {
            return res.status(400).json({
                success: false,
                message: 'startTime ist erforderlich und muss im Format HH:mm sein'
            });
        }
        if (!endTime || typeof endTime !== 'string' || !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(endTime)) {
            return res.status(400).json({
                success: false,
                message: 'endTime ist erforderlich und muss im Format HH:mm sein'
            });
        }
        // Validierung: Beide Zeiten müssen gültig sein
        // Nachtschichten über Mitternacht sind erlaubt (z.B. 22:00 - 06:00)
        // In diesem Fall wird bei der Schicht-Erstellung automatisch ein Tag addiert
        // Keine weitere Validierung nötig, da beide Fälle gültig sind:
        // - Normale Schicht: startTime < endTime (z.B. 08:00 - 16:00)
        // - Nachtschicht: startTime > endTime (z.B. 22:00 - 06:00)
        // Prüfe, ob Template mit diesem Namen bereits existiert
        const existing = yield prisma_1.prisma.shiftTemplate.findUnique({
            where: {
                roleId_branchId_name: {
                    roleId,
                    branchId,
                    name: name.trim()
                }
            }
        });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Ein Template mit diesem Namen existiert bereits für diese Rolle und Branch'
            });
        }
        // Prüfe, ob Rolle und Branch existieren
        const role = yield prisma_1.prisma.role.findUnique({ where: { id: roleId } });
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Rolle nicht gefunden'
            });
        }
        const branch = yield prisma_1.prisma.branch.findUnique({ where: { id: branchId } });
        if (!branch) {
            return res.status(404).json({
                success: false,
                message: 'Branch nicht gefunden'
            });
        }
        // Erstelle Template
        const template = yield prisma_1.prisma.shiftTemplate.create({
            data: {
                roleId,
                branchId,
                name: name.trim(),
                startTime,
                endTime,
                duration: duration || null,
                isActive: isActive !== undefined ? isActive : true
            },
            include: {
                role: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                },
                branch: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        res.status(201).json({
            success: true,
            data: template
        });
    }
    catch (error) {
        logger_1.logger.error('[ShiftTemplate] Fehler beim Erstellen des Templates:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Erstellen des Templates'
        });
    }
});
exports.createShiftTemplate = createShiftTemplate;
/**
 * PUT /api/shifts/templates/:id
 * Aktualisiert ein ShiftTemplate
 */
const updateShiftTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const templateId = parseInt(id, 10);
        if (isNaN(templateId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Template-ID'
            });
        }
        const { name, startTime, endTime, duration, isActive } = req.body;
        // Prüfe, ob Template existiert
        const existing = yield prisma_1.prisma.shiftTemplate.findUnique({
            where: { id: templateId }
        });
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Template nicht gefunden'
            });
        }
        // Validierung (nur wenn Felder gesetzt sind)
        const updateData = {};
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Name darf nicht leer sein'
                });
            }
            updateData.name = name.trim();
            // Prüfe, ob neuer Name bereits existiert (nur wenn sich Name geändert hat)
            if (name.trim() !== existing.name) {
                const duplicate = yield prisma_1.prisma.shiftTemplate.findUnique({
                    where: {
                        roleId_branchId_name: {
                            roleId: existing.roleId,
                            branchId: existing.branchId,
                            name: name.trim()
                        }
                    }
                });
                if (duplicate) {
                    return res.status(400).json({
                        success: false,
                        message: 'Ein Template mit diesem Namen existiert bereits für diese Rolle und Branch'
                    });
                }
            }
        }
        if (startTime !== undefined || endTime !== undefined) {
            const finalStartTime = startTime || existing.startTime;
            const finalEndTime = endTime || existing.endTime;
            if (startTime && (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(startTime))) {
                return res.status(400).json({
                    success: false,
                    message: 'startTime muss im Format HH:mm sein'
                });
            }
            if (endTime && (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(endTime))) {
                return res.status(400).json({
                    success: false,
                    message: 'endTime muss im Format HH:mm sein'
                });
            }
            // Validierung: Beide Zeiten müssen gültig sein
            // Nachtschichten über Mitternacht sind erlaubt (z.B. 22:00 - 06:00)
            // In diesem Fall wird bei der Schicht-Erstellung automatisch ein Tag addiert
            // Keine weitere Validierung nötig, da beide Fälle gültig sind:
            // - Normale Schicht: startTime < endTime (z.B. 08:00 - 16:00)
            // - Nachtschicht: startTime > endTime (z.B. 22:00 - 06:00)
            if (startTime)
                updateData.startTime = startTime;
            if (endTime)
                updateData.endTime = endTime;
        }
        if (duration !== undefined) {
            updateData.duration = duration;
        }
        if (isActive !== undefined) {
            updateData.isActive = isActive;
        }
        const template = yield prisma_1.prisma.shiftTemplate.update({
            where: { id: templateId },
            data: updateData,
            include: {
                role: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                },
                branch: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        res.json({
            success: true,
            data: template
        });
    }
    catch (error) {
        logger_1.logger.error('[ShiftTemplate] Fehler beim Aktualisieren des Templates:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Aktualisieren des Templates'
        });
    }
});
exports.updateShiftTemplate = updateShiftTemplate;
/**
 * DELETE /api/shifts/templates/:id
 * Löscht ein ShiftTemplate
 */
const deleteShiftTemplate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const templateId = parseInt(id, 10);
        if (isNaN(templateId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Template-ID'
            });
        }
        // Prüfe, ob Template existiert
        const existing = yield prisma_1.prisma.shiftTemplate.findUnique({
            where: { id: templateId },
            include: {
                shifts: {
                    take: 1 // Nur prüfen, ob es Schichten gibt
                }
            }
        });
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Template nicht gefunden'
            });
        }
        // Prüfe, ob es bereits Schichten mit diesem Template gibt
        if (existing.shifts.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Template kann nicht gelöscht werden, da bereits Schichten damit erstellt wurden'
            });
        }
        yield prisma_1.prisma.shiftTemplate.delete({
            where: { id: templateId }
        });
        res.json({
            success: true,
            message: 'Template erfolgreich gelöscht'
        });
    }
    catch (error) {
        logger_1.logger.error('[ShiftTemplate] Fehler beim Löschen des Templates:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Löschen des Templates'
        });
    }
});
exports.deleteShiftTemplate = deleteShiftTemplate;
//# sourceMappingURL=shiftTemplateController.js.map