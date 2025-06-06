import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation Schemas
const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  displayName: z.string().min(1, 'Anzeigename ist erforderlich'),
  maxUsers: z.number().min(1, 'Maximale Benutzeranzahl muss mindestens 1 sein'),
  subscriptionPlan: z.enum(['basic', 'pro', 'enterprise', 'trial'])
});

const updateOrganizationSchema = z.object({
  displayName: z.string().min(1).optional(),
  maxUsers: z.number().min(1).optional(),
  subscriptionPlan: z.enum(['basic', 'pro', 'enterprise', 'trial']).optional(),
  isActive: z.boolean().optional()
});

// Alle Organisationen abrufen
export const getAllOrganizations = async (_req: Request, res: Response) => {
  try {
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        isActive: true,
        maxUsers: true,
        subscriptionPlan: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            roles: true,
            joinRequests: true,
            invitations: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(organizations);
  } catch (error) {
    console.error('Error in getAllOrganizations:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Organisationen', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
};

// Organisation nach ID abrufen
export const getOrganizationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = parseInt(id);

    if (isNaN(organizationId)) {
      return res.status(400).json({ message: 'Ungültige Organisations-ID' });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        roles: {
          select: {
            id: true,
            name: true,
            description: true,
            _count: {
              select: { users: true }
            }
          }
        },
        joinRequests: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            requester: {
              select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        invitations: {
          select: {
            id: true,
            email: true,
            expiresAt: true,
            acceptedAt: true,
            createdAt: true,
            role: {
              select: {
                id: true,
                name: true
              }
            },
            inviter: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!organization) {
      return res.status(404).json({ message: 'Organisation nicht gefunden' });
    }

    res.json(organization);
  } catch (error) {
    console.error('Error in getOrganizationById:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Organisation', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
};

// Neue Organisation erstellen
export const createOrganization = async (req: Request, res: Response) => {
  try {
    const validatedData = createOrganizationSchema.parse(req.body);

    // Prüfe ob Name bereits existiert
    const existingOrg = await prisma.organization.findUnique({
      where: { name: validatedData.name }
    });

    if (existingOrg) {
      return res.status(400).json({ message: 'Organisation mit diesem Namen existiert bereits' });
    }

    const organization = await prisma.organization.create({
      data: {
        name: validatedData.name,
        displayName: validatedData.displayName,
        maxUsers: validatedData.maxUsers,
        subscriptionPlan: validatedData.subscriptionPlan,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        isActive: true,
        maxUsers: true,
        subscriptionPlan: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json(organization);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validierungsfehler', 
        errors: error.errors 
      });
    }

    console.error('Error in createOrganization:', error);
    res.status(500).json({ 
      message: 'Fehler beim Erstellen der Organisation', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
};

// Organisation aktualisieren
export const updateOrganization = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = parseInt(id);

    if (isNaN(organizationId)) {
      return res.status(400).json({ message: 'Ungültige Organisations-ID' });
    }

    const validatedData = updateOrganizationSchema.parse(req.body);

    // Prüfe ob Organisation existiert
    const existingOrg = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!existingOrg) {
      return res.status(404).json({ message: 'Organisation nicht gefunden' });
    }

    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: validatedData,
      select: {
        id: true,
        name: true,
        displayName: true,
        isActive: true,
        maxUsers: true,
        subscriptionPlan: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(organization);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validierungsfehler', 
        errors: error.errors 
      });
    }

    console.error('Error in updateOrganization:', error);
    res.status(500).json({ 
      message: 'Fehler beim Aktualisieren der Organisation', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
};

// Organisation löschen
export const deleteOrganization = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = parseInt(id);

    if (isNaN(organizationId)) {
      return res.status(400).json({ message: 'Ungültige Organisations-ID' });
    }

    // Prüfe ob es die Standard-Organisation ist
    if (organizationId === 1) {
      return res.status(400).json({ message: 'Standard-Organisation kann nicht gelöscht werden' });
    }

    // Prüfe ob Organisation existiert
    const existingOrg = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            roles: true,
            joinRequests: true,
            invitations: true
          }
        }
      }
    });

    if (!existingOrg) {
      return res.status(404).json({ message: 'Organisation nicht gefunden' });
    }

    // Prüfe ob Organisation noch Abhängigkeiten hat
    if (existingOrg._count.roles > 0) {
      return res.status(400).json({ 
        message: 'Organisation kann nicht gelöscht werden - noch Rollen vorhanden' 
      });
    }

    // Lösche zuerst abhängige Datensätze
    await prisma.$transaction(async (tx) => {
      // Lösche Join Requests
      await tx.organizationJoinRequest.deleteMany({
        where: { organizationId }
      });

      // Lösche Invitations
      await tx.organizationInvitation.deleteMany({
        where: { organizationId }
      });

      // Lösche Organisation
      await tx.organization.delete({
        where: { id: organizationId }
      });
    });

    res.json({ message: 'Organisation erfolgreich gelöscht' });
  } catch (error) {
    console.error('Error in deleteOrganization:', error);
    res.status(500).json({ 
      message: 'Fehler beim Löschen der Organisation', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
};

// Organisation-Statistiken abrufen
export const getOrganizationStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = parseInt(id);

    if (isNaN(organizationId)) {
      return res.status(400).json({ message: 'Ungültige Organisations-ID' });
    }

    const stats = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        displayName: true,
        maxUsers: true,
        _count: {
          select: {
            roles: true,
            joinRequests: true,
            invitations: true
          }
        }
      }
    });

    if (!stats) {
      return res.status(404).json({ message: 'Organisation nicht gefunden' });
    }

    // Berechne aktuelle Benutzeranzahl über Rollen
    const userCount = await prisma.userRole.count({
      where: {
        role: {
          organizationId: organizationId
        }
      }
    });

    const response = {
      ...stats,
      currentUsers: userCount,
      availableSlots: stats.maxUsers - userCount,
      utilizationPercent: Math.round((userCount / stats.maxUsers) * 100)
    };

    res.json(response);
  } catch (error) {
    console.error('Error in getOrganizationStats:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Organisations-Statistiken', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
}; 