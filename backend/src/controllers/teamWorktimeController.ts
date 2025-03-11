import { Request, Response } from 'express';
import { PrismaClient, Prisma, NotificationType } from '@prisma/client';
import { createNotificationIfEnabled } from './notificationController';

const prisma = new PrismaClient();

/**
 * Ruft alle Benutzer mit aktiver Zeiterfassung ab
 */
export const getActiveTeamWorktimes = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { teamId } = req.query;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Basisabfrage für aktive Zeiterfassungen
    let activeWorktimesQuery: Prisma.WorkTimeWhereInput = {
      endTime: null
    };

    // Wenn eine Team-ID angegeben ist, filtere nach Benutzern in diesem Team
    if (teamId) {
      // Hier könnte eine Teamfilterung implementiert werden, wenn Teams existieren
      // Aktuell verwenden wir Branches als "Teams"
      activeWorktimesQuery = {
        ...activeWorktimesQuery,
        branchId: Number(teamId)
      };
    }

    // Hole alle aktiven Zeiterfassungen mit Benutzer- und Branch-Informationen
    const activeWorktimes = await prisma.workTime.findMany({
      where: activeWorktimesQuery,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            normalWorkingHours: true,
            approvedOvertimeHours: true
          }
        },
        branch: true
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    res.json(activeWorktimes);
  } catch (error) {
    console.error('Fehler beim Abrufen der aktiven Team-Zeiterfassungen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

/**
 * Stoppt die Zeiterfassung eines bestimmten Benutzers
 */
export const stopUserWorktime = async (req: Request, res: Response) => {
  try {
    const managerId = req.userId;
    const { userId, endTime } = req.body;

    if (!managerId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (!userId) {
      return res.status(400).json({ message: 'Benutzer-ID ist erforderlich' });
    }

    // Finde die aktive Zeiterfassung des Benutzers
    const activeWorktime = await prisma.workTime.findFirst({
      where: {
        userId: Number(userId),
        endTime: null
      },
      include: {
        user: true,
        branch: true
      }
    });

    if (!activeWorktime) {
      return res.status(404).json({ message: 'Keine aktive Zeiterfassung für diesen Benutzer gefunden' });
    }

    // Verwende die übergebene Endzeit oder die aktuelle Zeit
    const now = endTime ? new Date(endTime) : new Date();

    // Aktualisiere die Zeiterfassung
    const worktime = await prisma.workTime.update({
      where: { id: activeWorktime.id },
      data: { 
        endTime: now,
        // Wenn bisher keine Zeitzone gespeichert ist, aktualisiere sie
        ...(activeWorktime.timezone ? {} : { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
      },
      include: {
        branch: true,
        user: true
      }
    });

    // Erstelle eine Benachrichtigung für den Benutzer
    await createNotificationIfEnabled({
      userId: Number(userId),
      title: 'Zeiterfassung durch Vorgesetzten beendet',
      message: `Ihre Zeiterfassung für ${worktime.branch.name} wurde von einem Vorgesetzten beendet.`,
      type: NotificationType.worktime_manager_stop,
      relatedEntityId: worktime.id,
      relatedEntityType: 'worktime_manager_stop'
    });

    res.json(worktime);
  } catch (error) {
    console.error('Fehler beim Stoppen der Benutzer-Zeiterfassung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

/**
 * Ruft die Zeiterfassungen eines Benutzers für einen bestimmten Tag ab
 */
export const getUserWorktimesByDay = async (req: Request, res: Response) => {
  try {
    const managerId = req.userId;
    const { userId, date } = req.query;

    if (!managerId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (!userId || !date) {
      return res.status(400).json({ message: 'Benutzer-ID und Datum sind erforderlich' });
    }

    // Datum parsen
    const queryDateStr = date as string;
    
    // Wir erstellen das Datum für den Anfang des Tages
    const dateParts = queryDateStr.split('-');
    if (dateParts.length !== 3) {
      return res.status(400).json({ message: 'Ungültiges Datumsformat' });
    }
    
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // Monate sind 0-basiert in JavaScript
    const day = parseInt(dateParts[2]);
    
    // Erstelle lokales Datum für den Anfang des Tages
    const localStartOfDay = new Date(year, month, day, 0, 0, 0);
    const localEndOfDay = new Date(year, month, day, 23, 59, 59, 999);
    
    // Zeitzonenversatz berechnen
    const startOffsetMinutes = localStartOfDay.getTimezoneOffset();
    const endOffsetMinutes = localEndOfDay.getTimezoneOffset();
    
    // Kompensierte Zeiten erstellen für korrekte UTC-Darstellung
    const dayStart = new Date(localStartOfDay.getTime() - startOffsetMinutes * 60000);
    const dayEnd = new Date(localEndOfDay.getTime() - endOffsetMinutes * 60000);

    // Hole alle Zeiterfassungen des Benutzers für den angegebenen Tag
    const worktimes = await prisma.workTime.findMany({
      where: {
        userId: Number(userId),
        startTime: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      include: {
        branch: true
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // Hole auch den Benutzer mit seinen Arbeitszeiteinstellungen
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        normalWorkingHours: true,
        approvedOvertimeHours: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    // Berechne die gesamte Arbeitszeit für den Tag
    let totalWorkTimeMs = 0;
    
    for (const worktime of worktimes) {
      if (worktime.endTime) {
        const workTimeMs = worktime.endTime.getTime() - worktime.startTime.getTime();
        totalWorkTimeMs += workTimeMs;
      }
    }
    
    // Konvertiere Millisekunden in Stunden
    const totalWorkTimeHours = totalWorkTimeMs / (1000 * 60 * 60);

    res.json({
      user,
      worktimes,
      totalWorkTimeHours,
      date: queryDateStr
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Benutzer-Zeiterfassungen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

/**
 * Aktualisiert eine Zeiterfassung
 */
export const updateUserWorktime = async (req: Request, res: Response) => {
  try {
    const managerId = req.userId;
    const { id, startTime, endTime } = req.body;

    if (!managerId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (!id) {
      return res.status(400).json({ message: 'Zeiterfassungs-ID ist erforderlich' });
    }

    // Finde die Zeiterfassung
    const worktime = await prisma.workTime.findUnique({
      where: { id: Number(id) },
      include: {
        user: true,
        branch: true
      }
    });

    if (!worktime) {
      return res.status(404).json({ message: 'Zeiterfassung nicht gefunden' });
    }

    // Aktualisiere die Zeiterfassung
    const updatedWorktime = await prisma.workTime.update({
      where: { id: Number(id) },
      data: {
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined
      },
      include: {
        branch: true,
        user: true
      }
    });

    // Erstelle eine Benachrichtigung für den Benutzer
    await createNotificationIfEnabled({
      userId: worktime.userId,
      title: 'Zeiterfassung aktualisiert',
      message: `Ihre Zeiterfassung für ${worktime.branch.name} wurde von einem Vorgesetzten aktualisiert.`,
      type: NotificationType.worktime_manager_stop,
      relatedEntityId: worktime.id,
      relatedEntityType: 'worktime_update'
    });

    res.json(updatedWorktime);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Zeiterfassung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

/**
 * Aktualisiert die bewilligten Überstunden eines Benutzers
 */
export const updateApprovedOvertimeHours = async (req: Request, res: Response) => {
  try {
    const managerId = req.userId;
    const { userId, approvedOvertimeHours } = req.body;

    if (!managerId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (!userId) {
      return res.status(400).json({ message: 'Benutzer-ID ist erforderlich' });
    }

    if (approvedOvertimeHours === undefined || approvedOvertimeHours < 0) {
      return res.status(400).json({ message: 'Gültige bewilligte Überstunden sind erforderlich' });
    }

    // Aktualisiere die bewilligten Überstunden des Benutzers
    const user = await prisma.user.update({
      where: { id: Number(userId) },
      data: {
        approvedOvertimeHours: Number(approvedOvertimeHours)
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        normalWorkingHours: true,
        approvedOvertimeHours: true
      }
    });

    // Erstelle eine Benachrichtigung für den Benutzer
    await createNotificationIfEnabled({
      userId: Number(userId),
      title: 'Bewilligte Überstunden aktualisiert',
      message: `Ihre bewilligten Überstunden wurden auf ${approvedOvertimeHours} Stunden aktualisiert.`,
      type: NotificationType.worktime,
      relatedEntityId: user.id,
      relatedEntityType: 'overtime_update'
    });

    res.json(user);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der bewilligten Überstunden:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
}; 