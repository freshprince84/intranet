import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { de } from 'date-fns/locale';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  userId: string;
}

// Alle Monatsberichte des Benutzers abrufen
export const getMonthlyReports = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    
    if (isNaN(userId)) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    const reports = await prisma.monthlyConsultationReport.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            client: true
          }
        }
      },
      orderBy: { periodStart: 'desc' }
    });

    res.json(reports);
  } catch (error) {
    console.error('Fehler beim Abrufen der Monatsberichte:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Einzelnen Monatsbericht abrufen
export const getMonthlyReportById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const reportId = parseInt(req.params.id, 10);
    
    if (isNaN(userId) || isNaN(reportId)) {
      return res.status(400).json({ message: 'Ungültige Parameter' });
    }

    const report = await prisma.monthlyConsultationReport.findFirst({
      where: { 
        id: reportId,
        userId 
      },
      include: {
        items: {
          include: {
            client: true
          }
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!report) {
      return res.status(404).json({ message: 'Monatsbericht nicht gefunden' });
    }

    res.json(report);
  } catch (error) {
    console.error('Fehler beim Abrufen des Monatsberichts:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Monatsbericht für einen bestimmten Zeitraum generieren
export const generateMonthlyReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const { periodStart, periodEnd, recipient } = req.body;
    
    if (isNaN(userId)) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (!periodStart || !periodEnd || !recipient) {
      return res.status(400).json({ 
        message: 'Zeitraum (periodStart, periodEnd) und Empfänger sind erforderlich' 
      });
    }

    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    // Hole alle bestehenden Monthly Reports um deren Zeiträume zu ermitteln
    const existingReports = await prisma.monthlyConsultationReport.findMany({
      where: {
        userId
      },
      select: {
        periodStart: true,
        periodEnd: true
      }
    });

    // Hole alle nicht-abgerechneten Beratungen im Zeitraum
    const consultations = await prisma.workTime.findMany({
      where: {
        userId,
        clientId: { not: null },
        startTime: {
          gte: startDate,
          lte: endDate
        },
        AND: [
          // Nur Beratungen, die noch nicht in einer Rechnung sind
          { invoiceItems: { none: {} } },
          // Und noch nicht in einem Monatsbericht sind
          { monthlyReportId: null }
        ]
      },
      include: {
        client: true
      }
    });

    if (consultations.length === 0) {
      return res.status(400).json({ 
        message: 'Keine nicht-abgerechneten Beratungen im angegebenen Zeitraum gefunden' 
      });
    }

    // Gruppiere nach Client und berechne Summen
    const clientGroups = new Map<number, {
      client: any;
      totalHours: number;
      consultationCount: number;
    }>();

    consultations.forEach(consultation => {
      if (!consultation.client || !consultation.endTime) return;

      const clientId = consultation.client.id;
      const duration = (new Date(consultation.endTime).getTime() - new Date(consultation.startTime).getTime()) / (1000 * 60 * 60);

      if (clientGroups.has(clientId)) {
        const group = clientGroups.get(clientId)!;
        group.totalHours += duration;
        group.consultationCount += 1;
      } else {
        clientGroups.set(clientId, {
          client: consultation.client,
          totalHours: duration,
          consultationCount: 1
        });
      }
    });

    // Berechne Gesamtstunden
    const totalHours = Array.from(clientGroups.values())
      .reduce((sum, group) => sum + group.totalHours, 0);

    // Generiere Berichtsnummer
    const reportNumber = `MR-${format(new Date(), 'yyyyMM')}-${userId.toString().padStart(3, '0')}`;

    // Erstelle Monatsbericht in Transaktion
    const report = await prisma.$transaction(async (tx) => {
      const newReport = await tx.monthlyConsultationReport.create({
        data: {
          userId,
          reportNumber,
          periodStart: startDate,
          periodEnd: endDate,
          recipient,
          totalHours,
          currency: 'CHF',
          status: 'GENERATED'
        }
      });

      // Erstelle Report Items
      const reportItems = Array.from(clientGroups.entries()).map(([clientId, group]) => ({
        reportId: newReport.id,
        clientId,
        clientName: group.client.name,
        totalHours: group.totalHours,
        consultationCount: group.consultationCount
      }));

      await tx.monthlyConsultationReportItem.createMany({
        data: reportItems
      });

      // Verknüpfe alle WorkTime-Einträge mit dem Report
      await tx.workTime.updateMany({
        where: {
          id: { in: consultations.map(c => c.id) }
        },
        data: {
          monthlyReportId: newReport.id
        }
      });

      return newReport;
    });

    // Lade den vollständigen Bericht mit Items
    const fullReport = await prisma.monthlyConsultationReport.findUnique({
      where: { id: report.id },
      include: {
        items: {
          include: {
            client: true
          }
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.status(201).json(fullReport);
  } catch (error) {
    console.error('Fehler beim Generieren des Monatsberichts:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Automatische Monatsbericht-Generierung basierend auf User-Einstellungen
export const generateAutomaticMonthlyReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    
    if (isNaN(userId)) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Hole User-Einstellungen
    const invoiceSettings = await prisma.invoiceSettings.findUnique({
      where: { userId }
    });

    if (!invoiceSettings?.monthlyReportEnabled) {
      return res.status(400).json({ 
        message: 'Automatische Monatsabrechnung ist nicht aktiviert' 
      });
    }

    if (!invoiceSettings.monthlyReportRecipient) {
      return res.status(400).json({ 
        message: 'Kein Rechnungsempfänger konfiguriert' 
      });
    }

    const reportDay = invoiceSettings.monthlyReportDay;
    const today = new Date();
    
    // Berechne Zeitraum basierend auf dem konfigurierten Tag
    let periodEnd: Date;
    let periodStart: Date;

    if (today.getDate() >= reportDay) {
      // Aktueller Monat: vom reportDay des Vormonats bis reportDay-1 des aktuellen Monats
      periodEnd = new Date(today.getFullYear(), today.getMonth(), reportDay - 1, 23, 59, 59);
      periodStart = new Date(today.getFullYear(), today.getMonth() - 1, reportDay);
    } else {
      // Vormonat: vom reportDay des Vor-Vormonats bis reportDay-1 des Vormonats
      periodEnd = new Date(today.getFullYear(), today.getMonth() - 1, reportDay - 1, 23, 59, 59);
      periodStart = new Date(today.getFullYear(), today.getMonth() - 2, reportDay);
    }

    // Prüfe, ob bereits ein Bericht für diesen Zeitraum existiert
    const existingReport = await prisma.monthlyConsultationReport.findFirst({
      where: {
        userId,
        periodStart: {
          gte: periodStart,
          lt: new Date(periodStart.getTime() + 24 * 60 * 60 * 1000) // +1 Tag
        }
      }
    });

    if (existingReport) {
      return res.status(400).json({ 
        message: 'Für diesen Zeitraum existiert bereits ein Monatsbericht' 
      });
    }

    // Generiere Bericht mit den berechneten Daten
    const generateRequest = {
      ...req,
      body: {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        recipient: invoiceSettings.monthlyReportRecipient
      }
    };

    return generateMonthlyReport(generateRequest as AuthenticatedRequest, res);
  } catch (error) {
    console.error('Fehler beim automatischen Generieren des Monatsberichts:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Monatsbericht-Status aktualisieren
export const updateReportStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const reportId = parseInt(req.params.id, 10);
    const { status } = req.body;
    
    if (isNaN(userId) || isNaN(reportId)) {
      return res.status(400).json({ message: 'Ungültige Parameter' });
    }

    if (!['GENERATED', 'SENT', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ message: 'Ungültiger Status' });
    }

    const report = await prisma.monthlyConsultationReport.updateMany({
      where: { 
        id: reportId,
        userId 
      },
      data: { status }
    });

    if (report.count === 0) {
      return res.status(404).json({ message: 'Monatsbericht nicht gefunden' });
    }

    res.json({ message: 'Status erfolgreich aktualisiert' });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Report-Status:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Monatsbericht löschen
export const deleteMonthlyReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const reportId = parseInt(req.params.id, 10);
    
    if (isNaN(userId) || isNaN(reportId)) {
      return res.status(400).json({ message: 'Ungültige Parameter' });
    }

    const report = await prisma.monthlyConsultationReport.deleteMany({
      where: { 
        id: reportId,
        userId 
      }
    });

    if (report.count === 0) {
      return res.status(404).json({ message: 'Monatsbericht nicht gefunden' });
    }

    res.json({ message: 'Monatsbericht erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Monatsberichts:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Prüfe, ob nicht-abgerechnete Beratungen vorhanden sind
export const checkUnbilledConsultations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const { periodStart, periodEnd } = req.query;
    
    if (isNaN(userId)) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    let whereClause: any = {
      userId,
      clientId: { not: null },
      endTime: { not: null },
      AND: [
        // Nicht in einer Rechnung abgerechnet
        { invoiceItems: { none: {} } },
        // Und nicht in einem Monatsbericht abgerechnet
        { monthlyReportId: null }
      ]
    };

    if (periodStart && periodEnd) {
      whereClause.startTime = {
        gte: new Date(periodStart as string),
        lte: new Date(periodEnd as string)
      };
    }

    const count = await prisma.workTime.count({
      where: whereClause
    });

    const consultations = await prisma.workTime.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            name: true
          }
        }
      },
      take: 10 // Nur die ersten 10 für Preview
    });

    res.json({
      count,
      hasUnbilledConsultations: count > 0,
      preview: consultations
    });
  } catch (error) {
    console.error('Fehler beim Prüfen nicht-abgerechneter Beratungen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// PDF für Monatsbericht generieren
export const generateMonthlyReportPDF = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    const report = await prisma.monthlyConsultationReport.findFirst({
      where: {
        id: Number(id),
        userId: Number(userId)
      },
      include: {
        user: true,
        items: {
          include: {
            client: true
          }
        }
      }
    });

    if (!report) {
      return res.status(404).json({ message: 'Monatsbericht nicht gefunden' });
    }

    // Hole User-Settings für PDF-Generierung
    const settings = await prisma.settings.findUnique({
      where: { userId: Number(userId) }
    });

    // Importiere den PDF Generator dynamisch
    const { generateMonthlyReportPDF: generatePDF } = await import('../services/monthlyReportPdfGenerator');
    
    // Generiere PDF (Konvertiere alle Decimal-Felder zu Number für PDF-Generator)
    const reportForPDF = {
      id: report.id,
      reportNumber: report.reportNumber,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      recipient: report.recipient,
      totalHours: Number(report.totalHours), // Decimal zu Number
      currency: report.currency,
      generatedAt: report.generatedAt,
      user: {
        firstName: report.user.firstName,
        lastName: report.user.lastName
      },
      items: report.items.map(item => ({
        clientName: item.clientName,
        totalHours: Number(item.totalHours), // Decimal zu Number
        consultationCount: item.consultationCount
      }))
    };
    
    const pdfBuffer = await generatePDF(reportForPDF, settings);
    
    // Speichere PDF-Pfad (optional)
    const pdfPath = `monthly-reports/${report.reportNumber}.pdf`;
    await prisma.monthlyConsultationReport.update({
      where: { id: report.id },
      data: { pdfPath }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.reportNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Fehler beim Generieren des PDFs:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
}; 