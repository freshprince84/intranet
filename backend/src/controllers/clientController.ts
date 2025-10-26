import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Alle Clients abrufen
export const getClients = async (req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(clients);
  } catch (error) {
    console.error('Fehler beim Abrufen der Clients:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Einzelnen Client abrufen
export const getClientById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id: Number(id) },
      include: {
        workTimes: {
          include: {
            user: true,
            branch: true
          },
          orderBy: { startTime: 'desc' },
          take: 10
        }
      }
    });
    
    if (!client) {
      return res.status(404).json({ message: 'Client nicht gefunden' });
    }
    
    res.json(client);
  } catch (error) {
    console.error('Fehler beim Abrufen des Clients:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Neuen Client erstellen
export const createClient = async (req: Request, res: Response) => {
  try {
    const { name, company, email, phone, address, notes } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Name ist erforderlich' });
    }
    
    const client = await prisma.client.create({
      data: {
        name,
        company,
        email,
        phone,
        address,
        notes
      }
    });
    
    res.status(201).json(client);
  } catch (error) {
    console.error('Fehler beim Erstellen des Clients:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Client aktualisieren
export const updateClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, company, email, phone, address, notes, isActive } = req.body;
    
    const client = await prisma.client.update({
      where: { id: Number(id) },
      data: {
        name,
        company,
        email,
        phone,
        address,
        notes,
        isActive
      }
    });
    
    res.json(client);
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Clients:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Client löschen
export const deleteClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clientId = Number(id);
    
    // 1. Prüfe ob Client existiert
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });
    
    if (!client) {
      return res.status(404).json({ message: 'Client nicht gefunden' });
    }
    
    // 2. Prüfe Verknüpfungen
    const [workTimes, consultationInvoices, monthlyReportItems] = await Promise.all([
      prisma.workTime.findMany({ where: { clientId } }),
      prisma.consultationInvoice.findMany({ where: { clientId } }),
      prisma.monthlyConsultationReportItem.findMany({ where: { clientId } })
    ]);
    
    const hasWorkTimes = workTimes.length > 0;
    const hasInvoices = consultationInvoices.length > 0;
    const hasReportItems = monthlyReportItems.length > 0;
    
    // 3. Wenn Verknüpfungen existieren, blockieren
    if (hasWorkTimes || hasInvoices || hasReportItems) {
      const reasons = [];
      if (hasWorkTimes) reasons.push(`${workTimes.length} Zeiteinträge`);
      if (hasInvoices) reasons.push(`${consultationInvoices.length} Rechnungen`);
      if (hasReportItems) reasons.push(`${monthlyReportItems.length} Monatsberichte`);
      
      return res.status(409).json({
        message: 'Client kann nicht gelöscht werden',
        reason: 'Es existieren Verknüpfungen mit anderen Datensätzen',
        details: {
          workTimes: workTimes.length,
          consultationInvoices: consultationInvoices.length,
          monthlyReportItems: monthlyReportItems.length
        },
        suggestion: 'Sie können den Client deaktivieren statt ihn zu löschen'
      });
    }
    
    // 4. Client löschen wenn keine Verknüpfungen bestehen
    await prisma.client.delete({
      where: { id: clientId }
    });
    
    res.json({ message: 'Client erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Clients:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Zuletzt beratene Clients abrufen
export const getRecentClients = async (req: Request, res: Response) => {
  try {
    console.log('🚀 DEBUG: getRecentClients wurde aufgerufen');
    console.log('🚀 DEBUG: req.userId:', req.userId);
    console.log('🚀 DEBUG: headers:', req.headers.authorization?.substring(0, 20) + '...');
    
    const userId = req.userId;
    
    if (!userId) {
      console.log('❌ DEBUG: Nicht authentifiziert');
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }
    
    console.log('✅ DEBUG: Benutzer authentifiziert, userId:', userId);
    
    // ✅ TIMEZONE-FIX: Verwende gleiche Logik wie Frontend (getTimezoneOffset)
    // Das Frontend verwendet: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
    // Backend muss dasselbe verwenden für konsistente Zeitvergleiche
    const localNow = new Date();
    const now = new Date(localNow.getTime() - localNow.getTimezoneOffset() * 60000);
    
    console.log('🕒 DEBUG: Timezone-korrigierte Zeit:', now.toISOString());
    
    // Hole vergangene Beratungen (startTime < jetzt) - diese sind "zuletzt beraten"
    const pastConsultations = await prisma.workTime.findMany({
      where: {
        userId: Number(userId),
        clientId: { not: null },
        startTime: { lt: now }
      },
      select: {
        clientId: true,
        client: true,
        startTime: true
      },
      orderBy: { startTime: 'desc' },
      distinct: ['clientId'],
      take: 10
    });
    
    // Hole geplante Beratungen (startTime >= jetzt)
    const plannedConsultations = await prisma.workTime.findMany({
      where: {
        userId: Number(userId),
        clientId: { not: null },
        startTime: { gte: now }
      },
      select: {
        clientId: true,
        client: true,
        startTime: true
      },
      orderBy: { startTime: 'asc' }, // Geplante chronologisch sortiert
      distinct: ['clientId'],
      take: 5
    });
    
    // Sammle alle Client-IDs aus vergangenen Beratungen
    const pastClientIds = new Set(pastConsultations.map(c => c.clientId));
    
    // Filtere geplante Beratungen: nur Clients die noch nicht in vergangenen enthalten sind
    const uniquePlannedConsultations = plannedConsultations.filter(
      c => !pastClientIds.has(c.clientId)
    );
    
    // Kombiniere: Vergangene Beratungen zuerst, dann geplante
    const combinedConsultations = [
      ...pastConsultations,
      ...uniquePlannedConsultations
    ];
    
    // Limitiere auf 10 Clients insgesamt
    const limitedConsultations = combinedConsultations.slice(0, 10);
    
    // Erweiterte Antwort mit Status und Startzeit
    const recentClientsWithStatus = limitedConsultations
      .filter(c => c.client !== null)
      .map(consultation => ({
        ...consultation.client,
        lastConsultationDate: consultation.startTime,
        status: consultation.startTime < now ? 'past' : 'planned'
      }));
    
    // DEBUG: Log die Sortierreihenfolge mit Timezone-Infos
    console.log('=== RECENT CLIENTS DEBUG (TIMEZONE-FIXED) ===');
    console.log('User ID:', userId);
    console.log('Local now (raw):', localNow.toISOString());
    console.log('Corrected now (with timezone offset):', now.toISOString());
    console.log('Timezone offset minutes:', localNow.getTimezoneOffset());
    console.log('Past consultations:', pastConsultations.length);
    pastConsultations.forEach((consultation, index) => {
      const isPast = consultation.startTime < now;
      console.log(`  Past ${index + 1}. Client: ${consultation.client?.name}, StartTime: ${consultation.startTime.toISOString()}, isPast: ${isPast}`);
    });
    console.log('Planned consultations:', plannedConsultations.length);
    plannedConsultations.forEach((consultation, index) => {
      const isPlanned = consultation.startTime >= now;
      console.log(`  Planned ${index + 1}. Client: ${consultation.client?.name}, StartTime: ${consultation.startTime.toISOString()}, isPlanned: ${isPlanned}`);
    });
    console.log('Unique planned (after filtering):', uniquePlannedConsultations.length);
    uniquePlannedConsultations.forEach((consultation, index) => {
      console.log(`  Unique Planned ${index + 1}. Client: ${consultation.client?.name}, StartTime: ${consultation.startTime.toISOString()}`);
    });
    console.log('Final clients order with status:', recentClientsWithStatus.map(c => `${c.name} (${c.status})`));
    console.log('=== END DEBUG ===');
    
    res.json(recentClientsWithStatus);
  } catch (error) {
    console.error('Fehler beim Abrufen der zuletzt beratenen Clients:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
}; 