import { Request, Response } from 'express';
import { PrismaClient, ShiftStatus } from '@prisma/client';
import { createNotificationIfEnabled } from './notificationController';
import { addDays, startOfDay, format } from 'date-fns';

const prisma = new PrismaClient();

/**
 * Hilfsfunktion: Prüft, ob zwei Zeitfenster sich überschneiden
 */
function isTimeOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
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
 * Hilfsfunktion: Findet verfügbare User für eine Schicht
 */
async function findAvailableUsers(params: {
  branchId: number;
  roleId: number;
  date: Date;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}): Promise<Array<{ user: any; priority: number }>> {
  const { branchId, roleId, date, dayOfWeek, startTime, endTime } = params;

  // Hole Verfügbarkeits-Regeln
  const availabilities = await prisma.userAvailability.findMany({
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
          email: true
        }
      }
    }
  });

  // Filtere nach Zeitfenster und dedupliziere
  const userMap = new Map<number, { user: any; priority: number }>();

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
    if (!userMap.has(userId) || userMap.get(userId)!.priority < priority) {
      userMap.set(userId, {
        user: av.user,
        priority
      });
    }
  }

  return Array.from(userMap.values());
}

/**
 * Hilfsfunktion: Prüft, ob User bereits eine Schicht zur gleichen Zeit hat
 */
async function checkOverlap(
  userId: number,
  date: Date,
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  const existingShifts = await prisma.shift.findMany({
    where: {
      userId,
      date: {
        gte: startOfDay(date),
        lt: startOfDay(addDays(date, 1))
      },
      status: {
        not: 'cancelled'
      }
    }
  });

  for (const shift of existingShifts) {
    // Prüfe Überschneidung
    if (
      (startTime >= shift.startTime && startTime < shift.endTime) ||
      (endTime > shift.startTime && endTime <= shift.endTime) ||
      (startTime <= shift.startTime && endTime >= shift.endTime)
    ) {
      return true; // Überschneidung gefunden
    }
  }

  return false; // Keine Überschneidung
}

/**
 * GET /api/shifts
 * Holt alle Schichten (mit Filtern)
 */
export const getAllShifts = async (req: Request, res: Response) => {
  try {
    const branchId = req.query.branchId ? parseInt(req.query.branchId as string, 10) : null;
    const roleId = req.query.roleId ? parseInt(req.query.roleId as string, 10) : null;
    const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : null;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;
    const status = req.query.status as ShiftStatus | undefined;

    const where: any = {};

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
        where.date.gte = startOfDay(startDate);
      }
      if (endDate) {
        where.date.lte = startOfDay(addDays(endDate, 1));
      }
    }

    if (status) {
      where.status = status;
    }

    const shifts = await prisma.shift.findMany({
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

    res.json({
      success: true,
      data: shifts
    });
  } catch (error) {
    console.error('[Shift] Fehler beim Abrufen der Schichten:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Schichten'
    });
  }
};

/**
 * GET /api/shifts/:id
 * Holt eine Schicht nach ID
 */
export const getShiftById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const shiftId = parseInt(id, 10);

    if (isNaN(shiftId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Schicht-ID'
      });
    }

    const shift = await prisma.shift.findUnique({
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
  } catch (error) {
    console.error('[Shift] Fehler beim Abrufen der Schicht:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Schicht'
    });
  }
};

/**
 * POST /api/shifts
 * Erstellt eine neue Schicht
 */
export const createShift = async (req: Request, res: Response) => {
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

    const currentUserId = req.user?.id as number | undefined;
    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'Nicht authentifiziert'
      });
    }

    // Hole Template
    const template = await prisma.shiftTemplate.findUnique({
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
      const hasOverlap = await checkOverlap(userId, shiftDate, startDateTime, endDateTime);
      if (hasOverlap) {
        return res.status(400).json({
          success: false,
          message: 'User hat bereits eine Schicht zur gleichen Zeit'
        });
      }
    }

    // Erstelle Schicht
    const shift = await prisma.shift.create({
      data: {
        shiftTemplateId,
        branchId,
        roleId,
        userId: userId || null,
        date: startOfDay(shiftDate),
        startTime: startDateTime,
        endTime: endDateTime,
        status: ShiftStatus.scheduled,
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
      await createNotificationIfEnabled({
        userId,
        title: 'Neue Schicht zugewiesen',
        message: `Ihnen wurde eine neue Schicht zugewiesen: ${template.name} am ${format(shiftDate, 'dd.MM.yyyy')}`,
        type: 'shift',
        relatedEntityId: shift.id,
        relatedEntityType: 'assigned'
      });
    }

    res.status(201).json({
      success: true,
      data: shift
    });
  } catch (error) {
    console.error('[Shift] Fehler beim Erstellen der Schicht:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Erstellen der Schicht'
    });
  }
};

/**
 * PUT /api/shifts/:id
 * Aktualisiert eine Schicht
 */
export const updateShift = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const shiftId = parseInt(id, 10);

    if (isNaN(shiftId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Schicht-ID'
      });
    }

    const existing = await prisma.shift.findUnique({
      where: { id: shiftId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Schicht nicht gefunden'
      });
    }

    const { userId, date, notes, status } = req.body;
    const updateData: any = {};

    // Wenn User geändert wird, prüfe Überschneidung
    if (userId !== undefined) {
      const finalUserId = userId || null;
      const finalDate = date ? new Date(date) : existing.date;

      if (finalUserId) {
        // Hole Template für Start-/Endzeit
        const template = await prisma.shiftTemplate.findUnique({
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

          const hasOverlap = await checkOverlap(finalUserId, finalDate, startDateTime, endDateTime);
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
        await createNotificationIfEnabled({
          userId: finalUserId,
          title: 'Schicht zugewiesen',
          message: `Ihnen wurde eine Schicht zugewiesen: ${format(existing.date, 'dd.MM.yyyy')}`,
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
      const template = await prisma.shiftTemplate.findUnique({
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

        updateData.date = startOfDay(shiftDate);
        updateData.startTime = startDateTime;
        updateData.endTime = endDateTime;
      } else {
        updateData.date = startOfDay(shiftDate);
      }

      // Benachrichtigung senden, wenn Datum geändert wurde
      if (existing.userId) {
        await createNotificationIfEnabled({
          userId: existing.userId,
          title: 'Schicht geändert',
          message: `Ihre Schicht wurde auf ${format(shiftDate, 'dd.MM.yyyy')} verschoben`,
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
      if (!Object.values(ShiftStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          message: `status muss einer der folgenden Werte sein: ${Object.values(ShiftStatus).join(', ')}`
        });
      }
      updateData.status = status;

      // Wenn bestätigt, setze confirmedAt und confirmedBy
      if (status === 'confirmed' && !existing.confirmedAt) {
        const currentUserId = req.user?.id as number | undefined;
        updateData.confirmedAt = new Date();
        updateData.confirmedBy = currentUserId || null;
      }
    }

    const shift = await prisma.shift.update({
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
  } catch (error) {
    console.error('[Shift] Fehler beim Aktualisieren der Schicht:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Schicht'
    });
  }
};

/**
 * DELETE /api/shifts/:id
 * Löscht eine Schicht
 */
export const deleteShift = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const shiftId = parseInt(id, 10);

    if (isNaN(shiftId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Schicht-ID'
      });
    }

    const existing = await prisma.shift.findUnique({
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
      await createNotificationIfEnabled({
        userId: existing.userId,
        title: 'Schicht abgesagt',
        message: `Ihre Schicht am ${format(existing.date, 'dd.MM.yyyy')} wurde abgesagt`,
        type: 'shift',
        relatedEntityId: shiftId,
        relatedEntityType: 'cancelled'
      });
    }

    await prisma.shift.delete({
      where: { id: shiftId }
    });

    res.json({
      success: true,
      message: 'Schicht erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('[Shift] Fehler beim Löschen der Schicht:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Löschen der Schicht'
    });
  }
};

/**
 * POST /api/shifts/generate
 * Generiert automatisch einen Schichtplan
 */
export const generateShiftPlan = async (req: Request, res: Response) => {
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

    const currentUserId = req.user?.id as number | undefined;
    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'Nicht authentifiziert'
      });
    }

    // Hole Rollen
    const roles = roleIds && roleIds.length > 0
      ? await prisma.role.findMany({
          where: { id: { in: roleIds } }
        })
      : await prisma.role.findMany({
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

    const shifts: any[] = [];
    const userWorkload: Map<number, number> = new Map();
    const conflicts: Array<{ date: Date; roleId: number; templateId: number; reason: string }> = [];

    // Iteriere über alle Tage
    for (let date = new Date(start); date <= end; date = addDays(date, 1)) {
      const dayOfWeek = date.getDay();

      // Iteriere über alle Rollen
      for (const role of roles) {
        // Hole ShiftTemplates für diese Rolle
        const templates = await prisma.shiftTemplate.findMany({
          where: {
            roleId: role.id,
            branchId,
            isActive: true
          }
        });

        for (const template of templates) {
          // Finde verfügbare User
          const availableUsers = await findAvailableUsers({
            branchId,
            roleId: role.id,
            date,
            dayOfWeek,
            startTime: template.startTime,
            endTime: template.endTime
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
              date: startOfDay(date),
              startTime: startDateTime,
              endTime: endDateTime,
              status: ShiftStatus.scheduled,
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

          // Sortiere nach Priorität und Arbeitslast
          const sortedUsers = availableUsers
            .map(av => ({
              user: av.user,
              priority: av.priority,
              workload: userWorkload.get(av.user.id) || 0
            }))
            .sort((a, b) => {
              // Erst nach Priorität (höher = besser)
              if (b.priority !== a.priority) {
                return b.priority - a.priority;
              }
              // Dann nach Arbeitslast (niedriger = besser)
              return a.workload - b.workload;
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
            const hasOverlap = await checkOverlap(
              candidate.user.id,
              date,
              startDateTime,
              endDateTime
            );

            if (!hasOverlap) {
              // User zuweisen
              shifts.push({
                shiftTemplateId: template.id,
                branchId,
                roleId: role.id,
                userId: candidate.user.id,
                date: startOfDay(date),
                startTime: startDateTime,
                endTime: endDateTime,
                status: ShiftStatus.scheduled,
                createdBy: currentUserId
              });

              userWorkload.set(
                candidate.user.id,
                (userWorkload.get(candidate.user.id) || 0) + 1
              );

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
              date: startOfDay(date),
              startTime: startDateTime,
              endTime: endDateTime,
              status: ShiftStatus.scheduled,
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
    const createdShifts = await prisma.shift.createMany({
      data: shifts
    });

    // Hole erstellte Schichten mit Relations
    const shiftsWithRelations = await prisma.shift.findMany({
      where: {
        branchId,
        date: {
          gte: startOfDay(start),
          lte: startOfDay(addDays(end, 1))
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
        await createNotificationIfEnabled({
          userId: shift.userId,
          title: 'Neue Schicht zugewiesen',
          message: `Ihnen wurde eine neue Schicht zugewiesen: ${shift.shiftTemplate.name} am ${format(shift.date, 'dd.MM.yyyy')}`,
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
  } catch (error) {
    console.error('[Shift] Fehler beim Generieren des Schichtplans:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Generieren des Schichtplans'
    });
  }
};

