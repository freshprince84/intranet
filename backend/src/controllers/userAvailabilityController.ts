import { Request, Response } from 'express';
import { PrismaClient, AvailabilityType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/shifts/availabilities
 * Holt alle Verfügbarkeiten (optional gefiltert nach userId, branchId, roleId)
 */
export const getAllAvailabilities = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : null;
    const branchId = req.query.branchId ? parseInt(req.query.branchId as string, 10) : null;
    const roleId = req.query.roleId ? parseInt(req.query.roleId as string, 10) : null;

    // Wenn kein userId angegeben, verwende den eingeloggten User
    const finalUserId = userId || (req.user?.id as number | undefined);

    if (!finalUserId) {
      return res.status(401).json({
        success: false,
        message: 'Nicht authentifiziert'
      });
    }

    const where: any = {
      userId: finalUserId
    };

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

    const availabilities = await prisma.userAvailability.findMany({
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
  } catch (error) {
    console.error('[UserAvailability] Fehler beim Abrufen der Verfügbarkeiten:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Verfügbarkeiten'
    });
  }
};

/**
 * GET /api/shifts/availabilities/:id
 * Holt eine Verfügbarkeit nach ID
 */
export const getAvailabilityById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const availabilityId = parseInt(id, 10);

    if (isNaN(availabilityId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Verfügbarkeits-ID'
      });
    }

    const availability = await prisma.userAvailability.findUnique({
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

    // Prüfe, ob User Zugriff hat (nur eigene Verfügbarkeiten oder Admin)
    const currentUserId = req.user?.id as number | undefined;
    if (availability.userId !== currentUserId && !req.user?.roles?.some((r: any) => r.name === 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
    }

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('[UserAvailability] Fehler beim Abrufen der Verfügbarkeit:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Verfügbarkeit'
    });
  }
};

/**
 * POST /api/shifts/availabilities
 * Erstellt eine neue Verfügbarkeit
 */
export const createAvailability = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      branchId,
      roleId,
      dayOfWeek,
      startTime,
      endTime,
      startDate,
      endDate,
      type,
      priority,
      notes,
      isActive
    } = req.body;

    // Wenn kein userId angegeben, verwende den eingeloggten User
    const finalUserId = userId || (req.user?.id as number | undefined);

    if (!finalUserId) {
      return res.status(401).json({
        success: false,
        message: 'Nicht authentifiziert'
      });
    }

    // Prüfe, ob User Zugriff hat (nur eigene Verfügbarkeiten oder Admin)
    const currentUserId = req.user?.id as number | undefined;
    if (finalUserId !== currentUserId && !req.user?.roles?.some((r: any) => r.name === 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung, Verfügbarkeiten für andere User zu erstellen'
      });
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

    if (type && !Object.values(AvailabilityType).includes(type)) {
      return res.status(400).json({
        success: false,
        message: `type muss einer der folgenden Werte sein: ${Object.values(AvailabilityType).join(', ')}`
      });
    }

    if (priority !== undefined && (typeof priority !== 'number' || priority < 1 || priority > 10)) {
      return res.status(400).json({
        success: false,
        message: 'priority muss eine Zahl zwischen 1 und 10 sein'
      });
    }

    // Prüfe, ob User existiert
    const user = await prisma.user.findUnique({ where: { id: finalUserId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User nicht gefunden'
      });
    }

    // Prüfe, ob Branch existiert (wenn angegeben)
    if (branchId) {
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch) {
        return res.status(404).json({
          success: false,
          message: 'Branch nicht gefunden'
        });
      }
    }

    // Prüfe, ob Rolle existiert (wenn angegeben)
    if (roleId) {
      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Rolle nicht gefunden'
        });
      }
    }

    // Erstelle Verfügbarkeit
    const availability = await prisma.userAvailability.create({
      data: {
        userId: finalUserId,
        branchId: branchId || null,
        roleId: roleId || null,
        dayOfWeek: dayOfWeek !== undefined ? dayOfWeek : null,
        startTime: startTime || null,
        endTime: endTime || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        type: (type as AvailabilityType) || AvailabilityType.available,
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
  } catch (error) {
    console.error('[UserAvailability] Fehler beim Erstellen der Verfügbarkeit:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Erstellen der Verfügbarkeit'
    });
  }
};

/**
 * PUT /api/shifts/availabilities/:id
 * Aktualisiert eine Verfügbarkeit
 */
export const updateAvailability = async (req: Request, res: Response) => {
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
    const existing = await prisma.userAvailability.findUnique({
      where: { id: availabilityId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Verfügbarkeit nicht gefunden'
      });
    }

    // Prüfe, ob User Zugriff hat
    const currentUserId = req.user?.id as number | undefined;
    if (existing.userId !== currentUserId && !req.user?.roles?.some((r: any) => r.name === 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
    }

    const {
      dayOfWeek,
      startTime,
      endTime,
      startDate,
      endDate,
      type,
      priority,
      notes,
      isActive
    } = req.body;

    const updateData: any = {};

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
      if (!Object.values(AvailabilityType).includes(type)) {
        return res.status(400).json({
          success: false,
          message: `type muss einer der folgenden Werte sein: ${Object.values(AvailabilityType).join(', ')}`
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

    const availability = await prisma.userAvailability.update({
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
  } catch (error) {
    console.error('[UserAvailability] Fehler beim Aktualisieren der Verfügbarkeit:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Verfügbarkeit'
    });
  }
};

/**
 * DELETE /api/shifts/availabilities/:id
 * Löscht eine Verfügbarkeit
 */
export const deleteAvailability = async (req: Request, res: Response) => {
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
    const existing = await prisma.userAvailability.findUnique({
      where: { id: availabilityId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Verfügbarkeit nicht gefunden'
      });
    }

    // Prüfe, ob User Zugriff hat
    const currentUserId = req.user?.id as number | undefined;
    if (existing.userId !== currentUserId && !req.user?.roles?.some((r: any) => r.name === 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
    }

    await prisma.userAvailability.delete({
      where: { id: availabilityId }
    });

    res.json({
      success: true,
      message: 'Verfügbarkeit erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('[UserAvailability] Fehler beim Löschen der Verfügbarkeit:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Löschen der Verfügbarkeit'
    });
  }
};

