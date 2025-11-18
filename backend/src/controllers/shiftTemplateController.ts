import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getDataIsolationFilter } from '../middleware/organization';

const prisma = new PrismaClient();

/**
 * GET /api/shifts/templates
 * Holt alle ShiftTemplates (optional gefiltert nach branchId, roleId)
 */
export const getAllShiftTemplates = async (req: Request, res: Response) => {
  try {
    const branchId = req.query.branchId ? parseInt(req.query.branchId as string, 10) : null;
    const roleId = req.query.roleId ? parseInt(req.query.roleId as string, 10) : null;

    const where: any = {};

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

    const templates = await prisma.shiftTemplate.findMany({
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
  } catch (error) {
    console.error('[ShiftTemplate] Fehler beim Abrufen der Templates:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Templates'
    });
  }
};

/**
 * GET /api/shifts/templates/:id
 * Holt ein ShiftTemplate nach ID
 */
export const getShiftTemplateById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const templateId = parseInt(id, 10);

    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Template-ID'
      });
    }

    const template = await prisma.shiftTemplate.findUnique({
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
  } catch (error) {
    console.error('[ShiftTemplate] Fehler beim Abrufen des Templates:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Abrufen des Templates'
    });
  }
};

/**
 * POST /api/shifts/templates
 * Erstellt ein neues ShiftTemplate
 */
export const createShiftTemplate = async (req: Request, res: Response) => {
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

    // Prüfe, ob Startzeit vor Endzeit liegt
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

    // Prüfe, ob Template mit diesem Namen bereits existiert
    const existing = await prisma.shiftTemplate.findUnique({
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
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Rolle nicht gefunden'
      });
    }

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch nicht gefunden'
      });
    }

    // Erstelle Template
    const template = await prisma.shiftTemplate.create({
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
  } catch (error) {
    console.error('[ShiftTemplate] Fehler beim Erstellen des Templates:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Erstellen des Templates'
    });
  }
};

/**
 * PUT /api/shifts/templates/:id
 * Aktualisiert ein ShiftTemplate
 */
export const updateShiftTemplate = async (req: Request, res: Response) => {
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
    const existing = await prisma.shiftTemplate.findUnique({
      where: { id: templateId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Template nicht gefunden'
      });
    }

    // Validierung (nur wenn Felder gesetzt sind)
    const updateData: any = {};

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
        const duplicate = await prisma.shiftTemplate.findUnique({
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

      // Prüfe, ob Startzeit vor Endzeit liegt
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

      if (startTime) updateData.startTime = startTime;
      if (endTime) updateData.endTime = endTime;
    }

    if (duration !== undefined) {
      updateData.duration = duration;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const template = await prisma.shiftTemplate.update({
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
  } catch (error) {
    console.error('[ShiftTemplate] Fehler beim Aktualisieren des Templates:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Aktualisieren des Templates'
    });
  }
};

/**
 * DELETE /api/shifts/templates/:id
 * Löscht ein ShiftTemplate
 */
export const deleteShiftTemplate = async (req: Request, res: Response) => {
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
    const existing = await prisma.shiftTemplate.findUnique({
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

    await prisma.shiftTemplate.delete({
      where: { id: templateId }
    });

    res.json({
      success: true,
      message: 'Template erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('[ShiftTemplate] Fehler beim Löschen des Templates:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Löschen des Templates'
    });
  }
};

