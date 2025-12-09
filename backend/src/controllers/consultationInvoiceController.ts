import { Request, Response } from 'express';
import { generateInvoicePDF } from '../services/invoicePdfGenerator';
import { getDataIsolationFilter } from '../middleware/organization';
import path from 'path';
import fs from 'fs';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

// Rechnung aus gefilterten Beratungen erstellen
export const createInvoiceFromConsultations = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { 
      consultationIds, 
      clientId, 
      issueDate, 
      dueDate, 
      hourlyRate, 
      vatRate, 
      notes 
    } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Validierung
    if (!consultationIds || consultationIds.length === 0) {
      return res.status(400).json({ message: 'Keine Beratungen ausgewählt' });
    }

    if (!clientId || !hourlyRate) {
      return res.status(400).json({ message: 'Client und Stundensatz sind erforderlich' });
    }

    // Prüfe, ob alle Beratungen dem User gehören und abgeschlossen sind
    const consultations = await prisma.workTime.findMany({
      where: {
        id: { in: consultationIds.map((id: string) => Number(id)) },
        userId: Number(userId),
        clientId: Number(clientId),
        endTime: { not: null }
      },
      include: {
        client: true,
        branch: true,
        invoiceItems: true
      }
    });

    if (consultations.length !== consultationIds.length) {
      return res.status(400).json({ message: 'Einige Beratungen sind ungültig oder nicht abgeschlossen' });
    }

    // Prüfe auf bereits abgerechnete Beratungen
    const alreadyInvoiced = consultations.filter(c => c.invoiceItems.length > 0);
    if (alreadyInvoiced.length > 0) {
      return res.status(400).json({ 
        message: `Einige Beratungen wurden bereits abgerechnet: ${alreadyInvoiced.map(c => 
          `${new Date(c.startTime).toLocaleDateString()} - ${c.client?.name}`
        ).join(', ')}`
      });
    }

    // Hole Invoice Settings für Rechnungsnummer
    let invoiceSettings = await prisma.invoiceSettings.findUnique({
      where: { userId: Number(userId) }
    });

    if (!invoiceSettings) {
      // Erstelle Default-Settings wenn noch keine vorhanden
      invoiceSettings = await prisma.invoiceSettings.create({
        data: {
          userId: Number(userId),
          companyName: 'Meine Firma',
          companyAddress: 'Musterstraße 1',
          companyZip: '8000',
          companyCity: 'Zürich',
          companyCountry: 'CH',
          iban: 'CH0000000000000000000',
          defaultHourlyRate: 120.00,
          defaultVatRate: 7.7,
          invoicePrefix: 'INV',
          nextInvoiceNumber: 1
        }
      });
    }

    // Generiere Rechnungsnummer
    const nextNumber = invoiceSettings.nextInvoiceNumber;
    const invoiceNumber = `${invoiceSettings.invoicePrefix}${nextNumber.toString().padStart(4, '0')}`;

    // Berechne Totale
    let subtotal = 0;
    const invoiceItems = consultations.map(consultation => {
      const startTime = new Date(consultation.startTime);
      const endTime = new Date(consultation.endTime!);
      const durationMs = endTime.getTime() - startTime.getTime();
      const hours = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100; // Runde auf 2 Dezimalstellen
      const amount = hours * parseFloat(hourlyRate);
      subtotal += amount;

      return {
        workTimeId: consultation.id,
        description: `Beratung vom ${startTime.toLocaleDateString('de-CH')} (${startTime.toLocaleTimeString('de-CH', {hour: '2-digit', minute: '2-digit'})} - ${endTime.toLocaleTimeString('de-CH', {hour: '2-digit', minute: '2-digit'})})`,
        quantity: hours,
        unitPrice: parseFloat(hourlyRate),
        amount
      };
    });

    const vatAmount = vatRate ? (subtotal * parseFloat(vatRate)) / 100 : 0;
    const total = subtotal + vatAmount;

    // Erstelle QR-Referenz (vereinfacht)
    const qrReference = `${invoiceNumber}${Date.now()}`.replace(/[^0-9]/g, '').substring(0, 27);

    // Erstelle Rechnung in Transaktion
    const invoice = await prisma.$transaction(async (tx) => {
      // Erstelle Rechnung
      const newInvoice = await tx.consultationInvoice.create({
        data: {
          invoiceNumber,
          clientId: Number(clientId),
          userId: Number(userId),
          issueDate: new Date(issueDate || Date.now()),
          dueDate: new Date(dueDate || Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Tage Standard
          subtotal,
          vatRate: vatRate ? parseFloat(vatRate) : null,
          vatAmount: vatAmount || null,
          total,
          qrReference,
          notes: notes || null,
          organizationId: req.organizationId || null
        },
        include: {
          client: true,
          user: true
        }
      });

      // Erstelle Invoice Items
      await tx.consultationInvoiceItem.createMany({
        data: invoiceItems.map(item => ({
          invoiceId: newInvoice.id,
          ...item
        }))
      });

      // Inkrementiere Rechnungsnummer
      await tx.invoiceSettings.update({
        where: { userId: Number(userId) },
        data: { nextInvoiceNumber: nextNumber + 1 }
      });

      return newInvoice;
    });

    // Lade vollständige Rechnung mit Items
    const fullInvoice = await prisma.consultationInvoice.findUnique({
      where: { id: invoice.id },
      include: {
        client: true,
        user: true,
        items: {
          include: {
            workTime: {
              include: {
                branch: true
              }
            }
          }
        }
      }
    });

    res.status(201).json(fullInvoice);
  } catch (error) {
    logger.error('Fehler beim Erstellen der Rechnung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Alle Rechnungen abrufen
export const getInvoices = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { status, clientId, from, to } = req.query;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // NEU: Verwende getDataIsolationFilter für organisations-spezifische Filterung
    const invoiceFilter = getDataIsolationFilter(req as any, 'invoice');
    
    let whereClause: any = {
      ...invoiceFilter
    };

    if (status) {
      whereClause.status = status;
    }

    if (clientId) {
      whereClause.clientId = Number(clientId);
    }

    if (from || to) {
      whereClause.issueDate = {};
      if (from) whereClause.issueDate.gte = new Date(from as string);
      if (to) whereClause.issueDate.lte = new Date(to as string);
    }

    const invoices = await prisma.consultationInvoice.findMany({
      where: whereClause,
      include: {
        client: true,
        user: true,
        items: true,
        payments: true
      },
      orderBy: {
        issueDate: 'desc'
      }
    });

    res.json(invoices);
  } catch (error) {
    logger.error('Fehler beim Abrufen der Rechnungen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Einzelne Rechnung abrufen
export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    const invoice = await prisma.consultationInvoice.findFirst({
      where: {
        id: Number(id),
        userId: Number(userId)
      },
      include: {
        client: true,
        user: true,
        items: {
          include: {
            workTime: {
              include: {
                branch: true
              }
            }
          }
        },
        payments: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Rechnung nicht gefunden' });
    }

    res.json(invoice);
  } catch (error) {
    logger.error('Fehler beim Abrufen der Rechnung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Rechnungsstatus aktualisieren
export const updateInvoiceStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (!['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ message: 'Ungültiger Status' });
    }

    const invoice = await prisma.consultationInvoice.update({
      where: { 
        id: Number(id),
        userId: Number(userId)
      },
      data: { status },
      include: {
        client: true,
        user: true
      }
    });

    res.json(invoice);
  } catch (error) {
    logger.error('Fehler beim Aktualisieren des Status:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// PDF generieren
export const generateInvoicePDFEndpoint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Lade vollständige Rechnung
    const invoice = await prisma.consultationInvoice.findFirst({
      where: {
        id: Number(id),
        userId: Number(userId)
      },
      include: {
        client: true,
        user: true,
        items: {
          include: {
            workTime: {
              include: {
                branch: true
              }
            }
          }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Rechnung nicht gefunden' });
    }

    // Lade Invoice Settings
    const settings = await prisma.invoiceSettings.findUnique({
      where: { userId: Number(userId) }
    });

    if (!settings) {
      return res.status(400).json({ message: 'Invoice Settings nicht konfiguriert' });
    }

    // Generiere PDF
    const pdfBuffer = await generateInvoicePDF(invoice, settings);

    // Speichere PDF-Pfad
    const pdfFileName = `invoice_${invoice.invoiceNumber}.pdf`;
    const pdfPath = path.join('uploads', 'invoices', pdfFileName);
    const fullPdfPath = path.join(process.cwd(), 'public', pdfPath);

    // Erstelle Verzeichnis falls nicht vorhanden
    const pdfDir = path.dirname(fullPdfPath);
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    // Speichere PDF
    fs.writeFileSync(fullPdfPath, pdfBuffer);

    // Aktualisiere PDF-Pfad in Datenbank
    await prisma.consultationInvoice.update({
      where: { id: Number(id) },
      data: { pdfPath }
    });

    // Sende PDF als Download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`);
    res.send(pdfBuffer);

  } catch (error) {
    logger.error('Fehler beim Generieren des PDFs:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Zahlung erfassen
export const markAsPaid = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, paymentDate, paymentMethod, reference, notes } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (!amount || !paymentMethod) {
      return res.status(400).json({ message: 'Betrag und Zahlungsmethode sind erforderlich' });
    }

    // Prüfe ob Rechnung existiert
    const invoice = await prisma.consultationInvoice.findFirst({
      where: {
        id: Number(id),
        userId: Number(userId)
      },
      include: {
        payments: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Rechnung nicht gefunden' });
    }

    // Berechne bereits bezahlten Betrag
    const paidAmount = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const newTotalPaid = paidAmount + parseFloat(amount);

    await prisma.$transaction(async (tx) => {
      // Erfasse Zahlung
      await tx.invoicePayment.create({
        data: {
          invoiceId: Number(id),
          amount: parseFloat(amount),
          paymentDate: new Date(paymentDate || Date.now()),
          paymentMethod,
          reference,
          notes
        }
      });

      // Aktualisiere Status falls vollständig bezahlt
      const newStatus = newTotalPaid >= Number(invoice.total) ? 'PAID' : 'SENT';
      await tx.consultationInvoice.update({
        where: { id: Number(id) },
        data: { status: newStatus }
      });
    });

    // Lade aktualisierte Rechnung
    const updatedInvoice = await prisma.consultationInvoice.findUnique({
      where: { id: Number(id) },
      include: {
        client: true,
        payments: true
      }
    });

    res.json(updatedInvoice);
  } catch (error) {
    logger.error('Fehler beim Erfassen der Zahlung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Rechnung stornieren
export const cancelInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    const invoice = await prisma.consultationInvoice.findFirst({
      where: {
        id: Number(id),
        userId: Number(userId)
      },
      include: {
        payments: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Rechnung nicht gefunden' });
    }

    if (invoice.payments.length > 0) {
      return res.status(400).json({ message: 'Rechnung kann nicht storniert werden - bereits Zahlungen erhalten' });
    }

    const cancelledInvoice = await prisma.consultationInvoice.update({
      where: { id: Number(id) },
      data: { status: 'CANCELLED' },
      include: {
        client: true
      }
    });

    res.json(cancelledInvoice);
  } catch (error) {
    logger.error('Fehler beim Stornieren der Rechnung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
}; 