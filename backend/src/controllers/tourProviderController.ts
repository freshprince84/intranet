import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { checkUserPermission } from '../middleware/permissionMiddleware';

interface AuthenticatedRequest extends Request {
  userId: string;
  roleId: string;
}

// GET /api/tour-providers - Alle Anbieter (mit Filtern)
export const getAllTourProviders = async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const branchId = (req as any).branchId;
    const search = req.query.search as string | undefined;

    const whereClause: Prisma.TourProviderWhereInput = {};

    if (organizationId) {
      whereClause.organizationId = organizationId;
    }
    if (branchId) {
      whereClause.branchId = branchId;
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    const providers = await prisma.tourProvider.findMany({
      where: whereClause,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        tours: {
          select: {
            id: true,
            title: true
          },
          take: 5
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    console.error('[getAllTourProviders] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Anbieter'
    });
  }
};

// GET /api/tour-providers/:id - Einzelner Anbieter
export const getTourProviderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const providerId = parseInt(id, 10);

    if (isNaN(providerId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Anbieter-ID'
      });
    }

    const provider = await prisma.tourProvider.findUnique({
      where: { id: providerId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        tours: {
          include: {
            bookings: {
              take: 5,
              orderBy: {
                bookingDate: 'desc'
              }
            }
          }
        }
      }
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Anbieter nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: provider
    });
  } catch (error) {
    console.error('[getTourProviderById] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Anbieters'
    });
  }
};

// POST /api/tour-providers - Neuen Anbieter erstellen
export const createTourProvider = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Berechtigung prüfen
    const hasPermission = await checkUserPermission(
      parseInt(req.userId),
      parseInt(req.roleId),
      'tour_provider_create',
      'write',
      'button'
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Erstellen von Anbietern'
      });
    }

    const organizationId = (req as any).organizationId;
    const branchId = (req as any).branchId;

    const {
      name,
      phone,
      email,
      contactPerson,
      notes
    } = req.body;

    // Validierung
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name muss mindestens 2 Zeichen lang sein'
      });
    }

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organisation ist erforderlich'
      });
    }

    const provider = await prisma.tourProvider.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        contactPerson: contactPerson?.trim() || null,
        notes: notes?.trim() || null,
        organizationId,
        branchId: branchId || null
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: provider
    });
  } catch (error) {
    console.error('[createTourProvider] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Anbieters'
    });
  }
};

// PUT /api/tour-providers/:id - Anbieter aktualisieren
export const updateTourProvider = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Berechtigung prüfen
    const hasPermission = await checkUserPermission(
      parseInt(req.userId),
      parseInt(req.roleId),
      'tour_provider_edit',
      'write',
      'button'
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Bearbeiten von Anbietern'
      });
    }

    const { id } = req.params;
    const providerId = parseInt(id, 10);

    if (isNaN(providerId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Anbieter-ID'
      });
    }

    const existing = await prisma.tourProvider.findUnique({
      where: { id: providerId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Anbieter nicht gefunden'
      });
    }

    const {
      name,
      phone,
      email,
      contactPerson,
      notes
    } = req.body;

    const updateData: any = {};
    if (name !== undefined) {
      if (name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Name muss mindestens 2 Zeichen lang sein'
        });
      }
      updateData.name = name.trim();
    }
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    const provider = await prisma.tourProvider.update({
      where: { id: providerId },
      data: updateData,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: provider
    });
  } catch (error) {
    console.error('[updateTourProvider] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Anbieters'
    });
  }
};

// DELETE /api/tour-providers/:id - Anbieter löschen
export const deleteTourProvider = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Berechtigung prüfen
    const hasPermission = await checkUserPermission(
      parseInt(req.userId),
      parseInt(req.roleId),
      'tour_provider_delete',
      'write',
      'button'
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Löschen von Anbietern'
      });
    }

    const { id } = req.params;
    const providerId = parseInt(id, 10);

    if (isNaN(providerId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Anbieter-ID'
      });
    }

    // Prüfe ob Touren verknüpft sind
    const tours = await prisma.tour.findMany({
      where: { externalProviderId: providerId }
    });

    if (tours.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Anbieter kann nicht gelöscht werden, da ${tours.length} Tour(s) verknüpft sind`
      });
    }

    await prisma.tourProvider.delete({
      where: { id: providerId }
    });

    res.json({
      success: true,
      message: 'Anbieter gelöscht'
    });
  } catch (error) {
    console.error('[deleteTourProvider] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Anbieters'
    });
  }
};


