import { Request, Response } from 'express';
import { PrismaClient, Prisma, NotificationType } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { de } from 'date-fns/locale';
import { createNotificationIfEnabled } from './notificationController';

const prisma = new PrismaClient();

export const startWorktime = async (req: Request, res: Response) => {
  try {
    const { branchId, startTime } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Prüfe, ob bereits eine aktive Zeiterfassung existiert
    const activeWorktime = await prisma.workTime.findFirst({
      where: {
        userId: Number(userId),
        endTime: null
      }
    });

    if (activeWorktime) {
      return res.status(400).json({ message: 'Es läuft bereits eine Zeiterfassung' });
    }

    const worktime = await prisma.workTime.create({
      data: {
        userId: Number(userId),
        branchId: Number(branchId),
        startTime: new Date(startTime)
      },
      include: {
        branch: true
      }
    });

    // Erstelle Notification für Zeiterfassung Start
    await createNotificationIfEnabled({
      userId: Number(userId),
      title: 'Zeiterfassung gestartet',
      message: `Zeiterfassung wurde um ${format(new Date(startTime), 'HH:mm')} gestartet`,
      type: NotificationType.worktime,
      relatedEntityId: worktime.id,
      relatedEntityType: 'start'
    });

    res.json(worktime);
  } catch (error) {
    console.error('Fehler beim Starten der Zeiterfassung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

export const stopWorktime = async (req: Request, res: Response) => {
  try {
    const { endTime } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    const activeWorktime = await prisma.workTime.findFirst({
      where: {
        userId: Number(userId),
        endTime: null
      }
    });

    if (!activeWorktime) {
      return res.status(404).json({ message: 'Keine aktive Zeiterfassung gefunden' });
    }

    const worktime = await prisma.workTime.update({
      where: { id: activeWorktime.id },
      data: { endTime: new Date(endTime) },
      include: {
        branch: true
      }
    });

    // Erstelle Notification für Zeiterfassung Stop
    await createNotificationIfEnabled({
      userId: Number(userId),
      title: 'Zeiterfassung beendet',
      message: `Zeiterfassung wurde um ${format(new Date(endTime), 'HH:mm')} beendet`,
      type: NotificationType.worktime,
      relatedEntityId: worktime.id,
      relatedEntityType: 'stop'
    });

    res.json(worktime);
  } catch (error) {
    console.error('Fehler beim Stoppen der Zeiterfassung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

export const getWorktimes = async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    let whereClause: Prisma.WorkTimeWhereInput = {
      userId: Number(userId)
    };

    if (date) {
      const queryDateStr = date as string;
      console.log(`Filtere Zeiteinträge für Datum (String): ${queryDateStr}`);
      
      // Wir erstellen das Datum manuell, um Zeitzonenprobleme zu vermeiden
      const dateParts = queryDateStr.split('-');
      if (dateParts.length !== 3) {
        return res.status(400).json({ message: 'Ungültiges Datumsformat' });
      }
      
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // Monate sind 0-basiert in JavaScript
      const day = parseInt(dateParts[2]);
      
      // Wir setzen die Uhrzeit auf 00:00:00 und 23:59:59 in der lokalen Zeitzone
      const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
      
      console.log(`Zeitraum (lokal): ${startOfDay.toLocaleString()} bis ${endOfDay.toLocaleString()}`);
      console.log(`Zeitraum (ISO): ${startOfDay.toISOString()} bis ${endOfDay.toISOString()}`);
      
      // Suche nach Einträgen für diesen Tag
      whereClause = {
        userId: Number(userId),
        startTime: {
          gte: startOfDay,
          lt: endOfDay
        }
      };
    }

    const worktimes = await prisma.workTime.findMany({
      where: whereClause,
      include: {
        branch: true
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    console.log(`Gefundene Zeiteinträge: ${worktimes.length}`);
    
    // Für Debugging: Zeige die Start- und Endzeiten der gefundenen Einträge
    worktimes.forEach((worktime, index) => {
      const startLocal = new Date(worktime.startTime).toLocaleString();
      const endLocal = worktime.endTime ? new Date(worktime.endTime).toLocaleString() : 'aktiv';
      console.log(`Eintrag ${index + 1}:`);
      console.log(`  Start (lokal): ${startLocal}`);
      console.log(`  Ende (lokal): ${endLocal}`);
      console.log(`  Start (ISO): ${worktime.startTime.toISOString()}`);
      if (worktime.endTime) {
        console.log(`  Ende (ISO): ${worktime.endTime.toISOString()}`);
      }
    });
    
    res.json(worktimes);
  } catch (error) {
    console.error('Fehler beim Abrufen der Zeiterfassungen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

export const deleteWorktime = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    const worktime = await prisma.workTime.findUnique({
      where: { id: Number(id) }
    });

    if (!worktime) {
      return res.status(404).json({ message: 'Zeiterfassung nicht gefunden' });
    }

    if (worktime.userId !== Number(userId)) {
      return res.status(403).json({ message: 'Keine Berechtigung' });
    }

    await prisma.workTime.delete({
      where: { id: Number(id) }
    });

    res.json({ message: 'Zeiterfassung erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen der Zeiterfassung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

export const updateWorktime = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, branchId } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    const worktime = await prisma.workTime.findUnique({
      where: { id: Number(id) }
    });

    if (!worktime) {
      return res.status(404).json({ message: 'Zeiterfassung nicht gefunden' });
    }

    if (worktime.userId !== Number(userId)) {
      return res.status(403).json({ message: 'Keine Berechtigung' });
    }

    const updatedWorktime = await prisma.workTime.update({
      where: { id: Number(id) },
      data: {
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        branchId: branchId ? Number(branchId) : undefined
      },
      include: {
        branch: true
      }
    });

    res.json(updatedWorktime);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Zeiterfassung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

export const getWorktimeStats = async (req: Request, res: Response) => {
  try {
    const { week } = req.query;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    const weekDate = week ? new Date(week as string) : new Date();
    const start = startOfWeek(weekDate, { weekStartsOn: 1 });
    const end = endOfWeek(weekDate, { weekStartsOn: 1 });

    // Wir suchen nach Einträgen, die in dieser Woche begonnen oder geendet haben
    // oder die über diese Woche gehen (Start vor der Woche, Ende nach der Woche)
    const worktimes = await prisma.workTime.findMany({
      where: {
        userId: Number(userId),
        endTime: {
          not: null
        },
        OR: [
          {
            // Einträge, die in dieser Woche begonnen haben
            startTime: {
              gte: start,
              lte: end
            }
          },
          {
            // Einträge, die in dieser Woche geendet haben
            endTime: {
              gte: start,
              lte: end
            }
          },
          {
            // Einträge, die über diese Woche gehen
            startTime: {
              lt: start
            },
            endTime: {
              gt: end
            }
          }
        ]
      }
    });

    // Wir erstellen ein Map für jeden Tag der Woche
    const dailyStats = new Map();
    const weekDays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    weekDays.forEach(day => dailyStats.set(day, 0));

    let totalHours = 0;
    let daysWorked = 0;

    // Für jeden Zeiteintrag berechnen wir die Arbeitszeit pro Tag
    worktimes.forEach(worktime => {
      if (worktime.endTime) {
        // Berechnung mit Millisekunden, um negative Werte zu vermeiden
        const diff = worktime.endTime.getTime() - worktime.startTime.getTime();
        const hours = diff / (1000 * 60 * 60);
        
        if (hours > 0) {
          totalHours += hours;

          const day = format(worktime.startTime, 'EEEE', { locale: de });
          const currentDayHours = dailyStats.get(day) || 0;
          dailyStats.set(day, currentDayHours + hours);

          if (currentDayHours === 0) daysWorked++;
        }
      }
    });

    const weeklyData = weekDays.map(day => ({
      day,
      hours: Math.round((dailyStats.get(day) || 0) * 100) / 100
    }));

    res.json({
      totalHours: Math.round(totalHours * 100) / 100,
      averageHoursPerDay: daysWorked > 0 ? Math.round((totalHours / daysWorked) * 100) / 100 : 0,
      daysWorked,
      weeklyData
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Statistiken:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

export const exportWorktimes = async (req: Request, res: Response) => {
  try {
    const { week } = req.query;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    const weekDate = week ? new Date(week as string) : new Date();
    const start = startOfWeek(weekDate, { weekStartsOn: 1 });
    const end = endOfWeek(weekDate, { weekStartsOn: 1 });

    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      include: { branches: { include: { branch: true } } }
    });

    const worktimes = await prisma.workTime.findMany({
      where: {
        userId: Number(userId),
        startTime: {
          gte: start,
          lte: end
        }
      },
      include: {
        branch: true
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Arbeitszeiten');

    worksheet.columns = [
      { header: 'Datum', key: 'date', width: 12 },
      { header: 'Start', key: 'start', width: 10 },
      { header: 'Ende', key: 'end', width: 10 },
      { header: 'Stunden', key: 'hours', width: 10 },
      { header: 'Niederlassung', key: 'branch', width: 15 }
    ];

    worktimes.forEach(worktime => {
      const hours = worktime.endTime
        ? (worktime.endTime.getTime() - worktime.startTime.getTime()) / (1000 * 60 * 60)
        : 0;

      worksheet.addRow({
        date: format(worktime.startTime, 'dd.MM.yyyy'),
        start: format(worktime.startTime, 'HH:mm'),
        end: worktime.endTime ? format(worktime.endTime, 'HH:mm') : '-',
        hours: Math.round(hours * 100) / 100,
        branch: worktime.branch.name
      });
    });

    const fileName = `arbeitszeiten_${format(start, 'yyyy-MM-dd')}_${format(end, 'yyyy-MM-dd')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Fehler beim Exportieren der Zeiterfassungen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

export const getActiveWorktime = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    console.log(`Suche aktive Zeiterfassung für Benutzer ${userId}...`);

    const activeWorktime = await prisma.workTime.findFirst({
      where: {
        userId: Number(userId),
        endTime: null
      },
      include: {
        branch: true
      }
    });

    if (!activeWorktime) {
      console.log(`Keine aktive Zeiterfassung für Benutzer ${userId} gefunden.`);
      // Statt 404 senden wir einen leeren Erfolg mit active: false
      return res.status(200).json({ 
        active: false,
        message: 'Keine aktive Zeiterfassung gefunden' 
      });
    }

    console.log(`Aktive Zeiterfassung gefunden: ${activeWorktime.id}`);
    // Wir fügen ein active: true Flag hinzu
    res.json({
      ...activeWorktime,
      active: true
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der aktiven Zeiterfassung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
}; 