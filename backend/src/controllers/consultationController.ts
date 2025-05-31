import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Beratung starten (erweiterte Version von worktime/start)
export const startConsultation = async (req: Request, res: Response) => {
  try {
    const { branchId, clientId, startTime, notes } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (!clientId) {
      return res.status(400).json({ message: 'Client ist erforderlich' });
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

    const now = startTime ? new Date(startTime) : new Date();
    
    const consultation = await prisma.workTime.create({
      data: {
        startTime: now,
        userId: Number(userId),
        branchId: Number(branchId),
        clientId: Number(clientId),
        notes: notes || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      include: {
        branch: true,
        client: true
      }
    });

    res.status(201).json(consultation);
  } catch (error) {
    console.error('Fehler beim Starten der Beratung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Beratung beenden
export const stopConsultation = async (req: Request, res: Response) => {
  try {
    const { endTime, notes } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Finde die aktive Beratung für den Benutzer
    const activeConsultation = await prisma.workTime.findFirst({
      where: {
        userId: Number(userId),
        endTime: null,
        clientId: { not: null }
      }
    });

    if (!activeConsultation) {
      return res.status(404).json({ message: 'Keine aktive Beratung gefunden' });
    }

    const now = endTime ? new Date(endTime) : new Date();
    
    const consultation = await prisma.workTime.update({
      where: { id: activeConsultation.id },
      data: { 
        endTime: now,
        notes: notes || activeConsultation.notes
      },
      include: {
        branch: true,
        client: true,
        user: true
      }
    });

    res.json(consultation);
  } catch (error) {
    console.error('Fehler beim Beenden der Beratung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Alle Beratungen abrufen
export const getConsultations = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { clientId, from, to } = req.query;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    let whereClause: any = {
      userId: Number(userId),
      clientId: { not: null }
    };

    if (clientId) {
      whereClause.clientId = Number(clientId);
    }

    if (from || to) {
      whereClause.startTime = {};
      if (from) whereClause.startTime.gte = new Date(from as string);
      if (to) whereClause.startTime.lte = new Date(to as string);
    }

    const consultations = await prisma.workTime.findMany({
      where: whereClause,
      include: {
        branch: true,
        client: true,
        taskLinks: {
          include: {
            task: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    res.json(consultations);
  } catch (error) {
    console.error('Fehler beim Abrufen der Beratungen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Task mit Beratung verknüpfen
export const linkTaskToConsultation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { taskId } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Prüfe ob die Beratung dem User gehört
    const consultation = await prisma.workTime.findFirst({
      where: {
        id: Number(id),
        userId: Number(userId)
      }
    });

    if (!consultation) {
      return res.status(404).json({ message: 'Beratung nicht gefunden' });
    }

    const link = await prisma.workTimeTask.create({
      data: {
        workTimeId: Number(id),
        taskId: Number(taskId)
      },
      include: {
        task: true,
        workTime: {
          include: {
            client: true
          }
        }
      }
    });

    res.status(201).json(link);
  } catch (error) {
    console.error('Fehler beim Verknüpfen von Task mit Beratung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Neuen Task für Beratung erstellen
export const createTaskForConsultation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, branchId, qualityControlId } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Prüfe ob die Beratung dem User gehört
    const consultation = await prisma.workTime.findFirst({
      where: {
        id: Number(id),
        userId: Number(userId)
      },
      include: {
        client: true
      }
    });

    if (!consultation) {
      return res.status(404).json({ message: 'Beratung nicht gefunden' });
    }

    // Erstelle Task und verknüpfe ihn direkt
    const result = await prisma.$transaction(async (tx) => {
      // Task erstellen
      const task = await tx.task.create({
        data: {
          title: title || `Notizen zu Beratung mit ${consultation.client?.name || 'Unbekannt'}`,
          description,
          responsibleId: Number(userId),
          qualityControlId: Number(qualityControlId || userId),
          branchId: Number(branchId || consultation.branchId),
          dueDate: dueDate ? new Date(dueDate) : null,
          status: 'open'
        }
      });

      // Verknüpfung erstellen
      const link = await tx.workTimeTask.create({
        data: {
          workTimeId: Number(id),
          taskId: task.id
        }
      });

      return { task, link };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Fehler beim Erstellen von Task für Beratung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Notizen einer Beratung aktualisieren
export const updateConsultationNotes = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    const consultation = await prisma.workTime.update({
      where: { 
        id: Number(id),
        userId: Number(userId)
      },
      data: { notes },
      include: {
        client: true,
        branch: true
      }
    });

    res.json(consultation);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Notizen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Beratung löschen
export const deleteConsultation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Prüfe ob die Beratung dem User gehört
    const consultation = await prisma.workTime.findFirst({
      where: {
        id: Number(id),
        userId: Number(userId),
        clientId: { not: null } // Nur Beratungen, nicht normale Arbeitszeiten
      }
    });

    if (!consultation) {
      return res.status(404).json({ message: 'Beratung nicht gefunden oder keine Berechtigung' });
    }

    // Prüfe ob die Beratung noch aktiv ist (ohne Endzeit)
    if (!consultation.endTime) {
      return res.status(400).json({ message: 'Aktive Beratungen können nicht gelöscht werden. Bitte beenden Sie die Beratung zuerst.' });
    }

    // Lösche zuerst alle Task-Verknüpfungen
    await prisma.workTimeTask.deleteMany({
      where: {
        workTimeId: Number(id)
      }
    });

    // Lösche die Beratung
    await prisma.workTime.delete({
      where: {
        id: Number(id)
      }
    });

    res.json({ message: 'Beratung erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen der Beratung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
}; 