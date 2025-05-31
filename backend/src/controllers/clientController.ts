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
    
    await prisma.client.delete({
      where: { id: Number(id) }
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
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }
    
    // Hole die letzten 10 unterschiedlichen Clients, die der User beraten hat
    const recentConsultations = await prisma.workTime.findMany({
      where: {
        userId: Number(userId),
        clientId: { not: null }
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
    
    const recentClients = recentConsultations
      .filter(c => c.client !== null)
      .map(c => c.client);
    
    res.json(recentClients);
  } catch (error) {
    console.error('Fehler beim Abrufen der zuletzt beratenen Clients:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
}; 