import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation Schemas
const createJoinRequestSchema = z.object({
  organizationName: z.string().min(1, 'Organisationsname ist erforderlich'),
  message: z.string().optional()
});

const processJoinRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
  response: z.string().optional(),
  roleId: z.number().optional()
});

// Beitrittsanfrage erstellen
export const createJoinRequest = async (req: Request, res: Response) => {
  try {
    const { organizationName, message } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (!organizationName) {
      return res.status(400).json({ message: 'Organisationsname ist erforderlich' });
    }

    // Finde Organisation
    const organization = await prisma.organization.findUnique({
      where: { name: organizationName.toLowerCase() }
    });

    if (!organization) {
      return res.status(404).json({ message: 'Organisation nicht gefunden' });
    }

    if (!organization.isActive) {
      return res.status(400).json({ message: 'Organisation ist nicht aktiv' });
    }

    // Prüfe ob bereits Anfrage existiert
    const existingRequest = await prisma.organizationJoinRequest.findUnique({
      where: {
        organizationId_requesterId: {
          organizationId: organization.id,
          requesterId: Number(userId)
        }
      }
    });

    if (existingRequest && existingRequest.status === 'pending') {
      return res.status(409).json({ message: 'Beitrittsanfrage bereits gestellt' });
    }

    const joinRequest = await prisma.organizationJoinRequest.create({
      data: {
        organizationId: organization.id,
        requesterId: Number(userId),
        message: message || null,
        status: 'pending'
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        },
        requester: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.status(201).json(joinRequest);
  } catch (error) {
    console.error('Error in createJoinRequest:', error);
    res.status(500).json({ 
      message: 'Fehler beim Erstellen der Beitrittsanfrage', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
};

// Beitrittsanfragen für Organisation abrufen
export const getJoinRequestsForOrganization = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Hole aktuelle Organisation des Users
    const userRole = await prisma.userRole.findFirst({
      where: { 
        userId: Number(userId),
        lastUsed: true 
      },
      include: {
        role: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!userRole) {
      return res.status(404).json({ message: 'Keine aktive Rolle gefunden' });
    }

    const joinRequests = await prisma.organizationJoinRequest.findMany({
      where: { organizationId: userRole.role.organizationId },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        processor: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(joinRequests);
  } catch (error) {
    console.error('Error in getJoinRequestsForOrganization:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Beitrittsanfragen', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
};

// Eigene Beitrittsanfragen abrufen
export const getMyJoinRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    const joinRequests = await prisma.organizationJoinRequest.findMany({
      where: { requesterId: Number(userId) },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        },
        processor: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(joinRequests);
  } catch (error) {
    console.error('Error in getMyJoinRequests:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der eigenen Beitrittsanfragen', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
};

// Beitrittsanfrage bearbeiten
export const processJoinRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, response, roleId } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Ungültige Aktion' });
    }

    const requestId = parseInt(id);
    if (isNaN(requestId)) {
      return res.status(400).json({ message: 'Ungültige Anfrage-ID' });
    }

    // Hole Beitrittsanfrage
    const joinRequest = await prisma.organizationJoinRequest.findUnique({
      where: { id: requestId },
      include: {
        organization: true,
        requester: true
      }
    });

    if (!joinRequest) {
      return res.status(404).json({ message: 'Beitrittsanfrage nicht gefunden' });
    }

    if (joinRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Anfrage bereits bearbeitet' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Aktualisiere Beitrittsanfrage
      const updatedRequest = await tx.organizationJoinRequest.update({
        where: { id: requestId },
        data: {
          status: action === 'approve' ? 'approved' : 'rejected',
          response: response || null,
          processedBy: Number(userId),
          processedAt: new Date()
        }
      });

      // Bei Genehmigung: User zur Organisation hinzufügen
      if (action === 'approve') {
        let targetRoleId = roleId;

        // Falls keine Rolle angegeben, verwende Standard-User-Rolle
        if (!targetRoleId) {
          const defaultRole = await tx.role.findFirst({
            where: {
              organizationId: joinRequest.organizationId,
              name: 'User'
            }
          });

          if (defaultRole) {
            targetRoleId = defaultRole.id;
          }
        }

        if (targetRoleId) {
          await tx.userRole.create({
            data: {
              userId: joinRequest.requesterId,
              roleId: targetRoleId,
              lastUsed: false
            }
          });
        }
      }

      return updatedRequest;
    });

    res.json(result);
  } catch (error) {
    console.error('Error in processJoinRequest:', error);
    res.status(500).json({ 
      message: 'Fehler beim Bearbeiten der Beitrittsanfrage', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
};

// Beitrittsanfrage zurückziehen
export const withdrawJoinRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    const requestId = parseInt(id);
    if (isNaN(requestId)) {
      return res.status(400).json({ message: 'Ungültige Anfrage-ID' });
    }

    // Hole Beitrittsanfrage
    const joinRequest = await prisma.organizationJoinRequest.findUnique({
      where: { id: requestId }
    });

    if (!joinRequest) {
      return res.status(404).json({ message: 'Beitrittsanfrage nicht gefunden' });
    }

    // Prüfe ob User der Ersteller ist
    if (joinRequest.requesterId !== Number(userId)) {
      return res.status(403).json({ message: 'Keine Berechtigung' });
    }

    if (joinRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Nur ausstehende Anfragen können zurückgezogen werden' });
    }

    const updatedRequest = await prisma.organizationJoinRequest.update({
      where: { id: requestId },
      data: {
        status: 'withdrawn',
        processedAt: new Date()
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      }
    });

    res.json(updatedRequest);
  } catch (error) {
    console.error('Error in withdrawJoinRequest:', error);
    res.status(500).json({ 
      message: 'Fehler beim Zurückziehen der Beitrittsanfrage', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
}; 