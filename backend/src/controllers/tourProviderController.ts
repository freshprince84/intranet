import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { checkUserPermission } from '../middleware/permissionMiddleware';
import { logger } from '../utils/logger';
import { getUserLanguage, getTourProviderErrorText } from '../utils/translations';

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
    logger.error('[getAllTourProviders] Fehler:', error);
    const userId = parseInt((req as AuthenticatedRequest).userId || '0', 10);
    const language = userId > 0 ? await getUserLanguage(userId) : 'de';
    res.status(500).json({
      success: false,
      message: getTourProviderErrorText(language, 'loadError')
    });
  }
};

// GET /api/tour-providers/:id - Einzelner Anbieter
export const getTourProviderById = async (req: Request, res: Response) => {
  try {
    const userId = parseInt((req as AuthenticatedRequest).userId || '0', 10);
    const language = userId > 0 ? await getUserLanguage(userId) : 'de';
    const { id } = req.params;
    const providerId = parseInt(id, 10);

    if (isNaN(providerId)) {
      return res.status(400).json({
        success: false,
        message: getTourProviderErrorText(language, 'invalidProviderId')
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
        message: getTourProviderErrorText(language, 'providerNotFound')
      });
    }

    res.json({
      success: true,
      data: provider
    });
  } catch (error) {
    logger.error('[getTourProviderById] Fehler:', error);
    const userId = parseInt((req as AuthenticatedRequest).userId || '0', 10);
    const language = userId > 0 ? await getUserLanguage(userId) : 'de';
    res.status(500).json({
      success: false,
      message: getTourProviderErrorText(language, 'loadProviderError')
    });
  }
};

// POST /api/tour-providers - Neuen Anbieter erstellen
export const createTourProvider = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const language = await getUserLanguage(userId);
    // Berechtigung prüfen
    const hasPermission = await checkUserPermission(
      userId,
      parseInt(req.roleId),
      'tour_provider_create',
      'write',
      'button'
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: getTourProviderErrorText(language, 'noPermissionCreate')
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
        message: getTourProviderErrorText(language, 'nameMinLength')
      });
    }

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: getTourProviderErrorText(language, 'organizationRequired')
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
    logger.error('[createTourProvider] Fehler:', error);
    const userId = parseInt((req as AuthenticatedRequest).userId, 10);
    const language = await getUserLanguage(userId);
    res.status(500).json({
      success: false,
      message: getTourProviderErrorText(language, 'createError')
    });
  }
};

// PUT /api/tour-providers/:id - Anbieter aktualisieren
export const updateTourProvider = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const language = await getUserLanguage(userId);
    // Berechtigung prüfen
    const hasPermission = await checkUserPermission(
      userId,
      parseInt(req.roleId),
      'tour_provider_edit',
      'write',
      'button'
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: getTourProviderErrorText(language, 'noPermissionEdit')
      });
    }

    const { id } = req.params;
    const providerId = parseInt(id, 10);

    if (isNaN(providerId)) {
      return res.status(400).json({
        success: false,
        message: getTourProviderErrorText(language, 'invalidProviderId')
      });
    }

    const existing = await prisma.tourProvider.findUnique({
      where: { id: providerId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: getTourProviderErrorText(language, 'providerNotFound')
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
          message: getTourProviderErrorText(language, 'nameMinLength')
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
    logger.error('[updateTourProvider] Fehler:', error);
    const userId = parseInt((req as AuthenticatedRequest).userId, 10);
    const language = await getUserLanguage(userId);
    res.status(500).json({
      success: false,
      message: getTourProviderErrorText(language, 'updateError')
    });
  }
};

// DELETE /api/tour-providers/:id - Anbieter löschen
export const deleteTourProvider = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const language = await getUserLanguage(userId);
    // Berechtigung prüfen
    const hasPermission = await checkUserPermission(
      userId,
      parseInt(req.roleId),
      'tour_provider_delete',
      'write',
      'button'
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: getTourProviderErrorText(language, 'noPermissionDelete')
      });
    }

    const { id } = req.params;
    const providerId = parseInt(id, 10);

    if (isNaN(providerId)) {
      return res.status(400).json({
        success: false,
        message: getTourProviderErrorText(language, 'invalidProviderId')
      });
    }

    // Prüfe ob Touren verknüpft sind
    const tours = await prisma.tour.findMany({
      where: { externalProviderId: providerId }
    });

    if (tours.length > 0) {
      const errorText = getTourProviderErrorText(language, 'cannotDeleteWithTours');
      return res.status(400).json({
        success: false,
        message: errorText.replace('{count}', tours.length.toString())
      });
    }

    await prisma.tourProvider.delete({
      where: { id: providerId }
    });

    res.json({
      success: true,
      message: getTourProviderErrorText(language, 'providerDeleted')
    });
  } catch (error) {
    logger.error('[deleteTourProvider] Fehler:', error);
    const userId = parseInt((req as AuthenticatedRequest).userId, 10);
    const language = await getUserLanguage(userId);
    res.status(500).json({
      success: false,
      message: getTourProviderErrorText(language, 'deleteError')
    });
  }
};


