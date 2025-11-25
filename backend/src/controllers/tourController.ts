import { Request, Response } from 'express';
import { Prisma, TourType } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { convertFilterConditionsToPrismaWhere } from '../utils/filterToPrisma';
import { filterCache } from '../services/filterCache';
import { checkUserPermission } from '../middleware/permissionMiddleware';

interface AuthenticatedRequest extends Request {
  userId: string;
}

const userSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true
} as const;

const branchSelect = {
  id: true,
  name: true
} as const;

// GET /api/tours - Alle Touren (mit Filtern)
export const getAllTours = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.userId as string, 10);
    const organizationId = (req as any).organizationId;
    const branchId = (req as any).branchId;

    // Filter-Parameter aus Query lesen
    const filterId = req.query.filterId as string | undefined;
    const filterConditions = req.query.filterConditions 
      ? JSON.parse(req.query.filterConditions as string) 
      : undefined;
    const limit = req.query.limit 
      ? parseInt(req.query.limit as string, 10) 
      : 50;
    const type = req.query.type as TourType | undefined;
    const isActive = req.query.isActive !== undefined 
      ? req.query.isActive === 'true' 
      : undefined;
    const search = req.query.search as string | undefined;

    // Filter-Bedingungen konvertieren (falls vorhanden)
    let filterWhereClause: any = {};
    if (filterId) {
      try {
        const filterData = await filterCache.get(parseInt(filterId, 10));
        if (filterData) {
          const conditions = JSON.parse(filterData.conditions);
          const operators = JSON.parse(filterData.operators);
          filterWhereClause = convertFilterConditionsToPrismaWhere(
            conditions,
            operators,
            'tour'
          );
        }
      } catch (filterError) {
        console.error(`[getAllTours] Fehler beim Laden von Filter ${filterId}:`, filterError);
      }
    } else if (filterConditions) {
      filterWhereClause = convertFilterConditionsToPrismaWhere(
        filterConditions.conditions || filterConditions,
        filterConditions.operators || [],
        'tour'
      );
    }

    // Basis-WHERE-Bedingungen
    const baseWhereConditions: any[] = [];

    // Isolation-Filter: organizationId
    if (organizationId) {
      baseWhereConditions.push({ organizationId });
    }

    // Branch-Filter (optional)
    if (branchId) {
      baseWhereConditions.push({ branchId });
    }

    // Typ-Filter
    if (type) {
      baseWhereConditions.push({ type });
    }

    // isActive-Filter (Standard: nur aktive)
    if (isActive !== undefined) {
      baseWhereConditions.push({ isActive });
    } else {
      // Standard: nur aktive Touren
      baseWhereConditions.push({ isActive: true });
    }

    // Suche nach Titel
    if (search) {
      baseWhereConditions.push({
        title: {
          contains: search,
          mode: 'insensitive'
        }
      });
    }

    // Füge Filter-Bedingungen hinzu (falls vorhanden)
    if (Object.keys(filterWhereClause).length > 0) {
      baseWhereConditions.push(filterWhereClause);
    }

    // Kombiniere alle Filter
    const whereClause: Prisma.TourWhereInput = baseWhereConditions.length === 1
      ? baseWhereConditions[0]
      : { AND: baseWhereConditions };

    const tours = await prisma.tour.findMany({
      where: whereClause,
      take: limit,
      include: {
        createdBy: {
          select: userSelect
        },
        branch: {
          select: branchSelect
        },
        externalProvider: true,
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: tours
    });
  } catch (error) {
    console.error('[getAllTours] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Touren'
    });
  }
};

// GET /api/tours/:id - Einzelne Tour
export const getTourById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tourId = parseInt(id, 10);

    if (isNaN(tourId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Tour-ID'
      });
    }

    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      include: {
        createdBy: {
          select: userSelect
        },
        branch: {
          select: branchSelect
        },
        externalProvider: true,
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        },
        bookings: {
          take: 10,
          orderBy: {
            bookingDate: 'desc'
          },
          include: {
            bookedBy: {
              select: userSelect
            }
          }
        }
      }
    });

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: tour
    });
  } catch (error) {
    console.error('[getTourById] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Tour'
    });
  }
};

// POST /api/tours - Neue Tour erstellen
export const createTour = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Berechtigung prüfen
    const hasPermission = await checkUserPermission(
      parseInt(req.userId),
      'tour_create',
      'button'
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Erstellen von Touren'
      });
    }

    const userId = parseInt(req.userId, 10);
    const organizationId = (req as any).organizationId;
    const branchId = (req as any).branchId;

    const {
      title,
      description,
      type = 'own',
      isActive = true,
      duration,
      maxParticipants,
      minParticipants,
      price,
      currency = 'COP',
      location,
      meetingPoint,
      includes,
      excludes,
      requirements,
      totalCommission,
      totalCommissionPercent,
      sellerCommissionPercent,
      sellerCommissionFixed,
      externalProviderId,
      externalBookingUrl,
      availableFrom,
      availableTo,
      recurringSchedule
    } = req.body;

    // Validierung
    if (!title || title.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Titel muss mindestens 3 Zeichen lang sein'
      });
    }

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organisation ist erforderlich'
      });
    }

    // Validierung: maxParticipants >= minParticipants
    if (maxParticipants && minParticipants && maxParticipants < minParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Maximale Teilnehmeranzahl muss >= minimale Teilnehmeranzahl sein'
      });
    }

    // Validierung: availableFrom <= availableTo
    if (availableFrom && availableTo && new Date(availableFrom) > new Date(availableTo)) {
      return res.status(400).json({
        success: false,
        message: 'Verfügbar ab muss <= verfügbar bis sein'
      });
    }

    // Validierung: externalProviderId wenn type = external
    if (type === 'external' && !externalProviderId) {
      return res.status(400).json({
        success: false,
        message: 'Externer Anbieter ist bei externen Touren erforderlich'
      });
    }

    const tour = await prisma.tour.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        type: type as TourType,
        isActive,
        duration: duration || null,
        maxParticipants: maxParticipants || null,
        minParticipants: minParticipants || null,
        price: price ? parseFloat(price) : null,
        currency: currency || 'COP',
        location: location?.trim() || null,
        meetingPoint: meetingPoint?.trim() || null,
        includes: includes?.trim() || null,
        excludes: excludes?.trim() || null,
        requirements: requirements?.trim() || null,
        totalCommission: totalCommission ? parseFloat(totalCommission) : null,
        totalCommissionPercent: totalCommissionPercent ? parseFloat(totalCommissionPercent) : null,
        sellerCommissionPercent: sellerCommissionPercent ? parseFloat(sellerCommissionPercent) : null,
        sellerCommissionFixed: sellerCommissionFixed ? parseFloat(sellerCommissionFixed) : null,
        externalProviderId: externalProviderId || null,
        externalBookingUrl: externalBookingUrl?.trim() || null,
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        availableTo: availableTo ? new Date(availableTo) : null,
        recurringSchedule: recurringSchedule || null,
        organizationId,
        branchId: branchId || null,
        createdById: userId
      },
      include: {
        createdBy: {
          select: userSelect
        },
        branch: {
          select: branchSelect
        },
        externalProvider: true
      }
    });

    // TODO: Notification erstellen (Tour gebucht - an alle in org)

    res.status(201).json({
      success: true,
      data: tour
    });
  } catch (error) {
    console.error('[createTour] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Tour'
    });
  }
};

// PUT /api/tours/:id - Tour aktualisieren
export const updateTour = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Berechtigung prüfen
    const hasPermission = await checkUserPermission(
      parseInt(req.userId),
      'tour_edit',
      'button'
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Bearbeiten von Touren'
      });
    }

    const { id } = req.params;
    const tourId = parseInt(id, 10);

    if (isNaN(tourId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Tour-ID'
      });
    }

    // Prüfe ob Tour existiert
    const existingTour = await prisma.tour.findUnique({
      where: { id: tourId }
    });

    if (!existingTour) {
      return res.status(404).json({
        success: false,
        message: 'Tour nicht gefunden'
      });
    }

    const {
      title,
      description,
      type,
      isActive,
      duration,
      maxParticipants,
      minParticipants,
      price,
      currency,
      location,
      meetingPoint,
      includes,
      excludes,
      requirements,
      totalCommission,
      totalCommissionPercent,
      sellerCommissionPercent,
      sellerCommissionFixed,
      externalProviderId,
      externalBookingUrl,
      availableFrom,
      availableTo,
      recurringSchedule
    } = req.body;

    // Validierung: maxParticipants >= minParticipants
    if (maxParticipants !== undefined && minParticipants !== undefined && maxParticipants < minParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Maximale Teilnehmeranzahl muss >= minimale Teilnehmeranzahl sein'
      });
    }

    // Validierung: availableFrom <= availableTo
    if (availableFrom && availableTo && new Date(availableFrom) > new Date(availableTo)) {
      return res.status(400).json({
        success: false,
        message: 'Verfügbar ab muss <= verfügbar bis sein'
      });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (type !== undefined) updateData.type = type;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (duration !== undefined) updateData.duration = duration || null;
    if (maxParticipants !== undefined) updateData.maxParticipants = maxParticipants || null;
    if (minParticipants !== undefined) updateData.minParticipants = minParticipants || null;
    if (price !== undefined) updateData.price = price ? parseFloat(price) : null;
    if (currency !== undefined) updateData.currency = currency;
    if (location !== undefined) updateData.location = location?.trim() || null;
    if (meetingPoint !== undefined) updateData.meetingPoint = meetingPoint?.trim() || null;
    if (includes !== undefined) updateData.includes = includes?.trim() || null;
    if (excludes !== undefined) updateData.excludes = excludes?.trim() || null;
    if (requirements !== undefined) updateData.requirements = requirements?.trim() || null;
    if (totalCommission !== undefined) updateData.totalCommission = totalCommission ? parseFloat(totalCommission) : null;
    if (totalCommissionPercent !== undefined) updateData.totalCommissionPercent = totalCommissionPercent ? parseFloat(totalCommissionPercent) : null;
    if (sellerCommissionPercent !== undefined) updateData.sellerCommissionPercent = sellerCommissionPercent ? parseFloat(sellerCommissionPercent) : null;
    if (sellerCommissionFixed !== undefined) updateData.sellerCommissionFixed = sellerCommissionFixed ? parseFloat(sellerCommissionFixed) : null;
    if (externalProviderId !== undefined) updateData.externalProviderId = externalProviderId || null;
    if (externalBookingUrl !== undefined) updateData.externalBookingUrl = externalBookingUrl?.trim() || null;
    if (availableFrom !== undefined) updateData.availableFrom = availableFrom ? new Date(availableFrom) : null;
    if (availableTo !== undefined) updateData.availableTo = availableTo ? new Date(availableTo) : null;
    if (recurringSchedule !== undefined) updateData.recurringSchedule = recurringSchedule || null;

    const tour = await prisma.tour.update({
      where: { id: tourId },
      data: updateData,
      include: {
        createdBy: {
          select: userSelect
        },
        branch: {
          select: branchSelect
        },
        externalProvider: true
      }
    });

    res.json({
      success: true,
      data: tour
    });
  } catch (error) {
    console.error('[updateTour] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Tour'
    });
  }
};

// PUT /api/tours/:id/toggle-active - Tour aktiv/inaktiv setzen (Soft Delete)
export const toggleTourActive = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Berechtigung prüfen
    const hasPermission = await checkUserPermission(
      parseInt(req.userId),
      'tour_delete',
      'button'
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Löschen von Touren'
      });
    }

    const { id } = req.params;
    const tourId = parseInt(id, 10);
    const { isActive } = req.body;

    if (isNaN(tourId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Tour-ID'
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive muss ein Boolean sein'
      });
    }

    const tour = await prisma.tour.update({
      where: { id: tourId },
      data: { isActive },
      include: {
        createdBy: {
          select: userSelect
        },
        branch: {
          select: branchSelect
        },
        externalProvider: true
      }
    });

    res.json({
      success: true,
      data: tour
    });
  } catch (error) {
    console.error('[toggleTourActive] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Tour'
    });
  }
};

// GET /api/tours/:id/bookings - Buchungen einer Tour
export const getTourBookings = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tourId = parseInt(id, 10);

    if (isNaN(tourId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Tour-ID'
      });
    }

    const status = req.query.status as string | undefined;
    const paymentStatus = req.query.paymentStatus as string | undefined;
    const bookedById = req.query.bookedById 
      ? parseInt(req.query.bookedById as string, 10) 
      : undefined;

    const whereClause: Prisma.TourBookingWhereInput = {
      tourId
    };

    if (status) {
      whereClause.status = status as any;
    }
    if (paymentStatus) {
      whereClause.paymentStatus = paymentStatus as any;
    }
    if (bookedById) {
      whereClause.bookedById = bookedById;
    }

    const bookings = await prisma.tourBooking.findMany({
      where: whereClause,
      include: {
        bookedBy: {
          select: userSelect
        },
        tour: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        bookingDate: 'desc'
      }
    });

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('[getTourBookings] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Buchungen'
    });
  }
};

// GET /api/tours/export - Export für Website/Soziale Medien
export const exportTours = async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const branchId = (req as any).branchId;
    const type = req.query.type as TourType | undefined;
    const isActive = req.query.isActive !== undefined 
      ? req.query.isActive === 'true' 
      : true; // Standard: nur aktive
    const fieldsParam = req.query.fields as string | undefined;

    // Standard-Felder (ohne Kommissionen)
    const defaultFields = [
      'id', 'title', 'description', 'type', 'price', 'currency', 'duration',
      'maxParticipants', 'minParticipants', 'location', 'meetingPoint',
      'includes', 'excludes', 'requirements', 'imageUrl', 'galleryUrls',
      'availableFrom', 'availableTo'
    ];

    const requestedFields = fieldsParam 
      ? fieldsParam.split(',').map(f => f.trim())
      : defaultFields;

    const whereClause: Prisma.TourWhereInput = {
      isActive
    };

    if (organizationId) {
      whereClause.organizationId = organizationId;
    }
    if (branchId) {
      whereClause.branchId = branchId;
    }
    if (type) {
      whereClause.type = type;
    }

    const tours = await prisma.tour.findMany({
      where: whereClause,
      select: {
        id: requestedFields.includes('id'),
        title: requestedFields.includes('title'),
        description: requestedFields.includes('description'),
        type: requestedFields.includes('type'),
        price: requestedFields.includes('price'),
        currency: requestedFields.includes('currency'),
        duration: requestedFields.includes('duration'),
        maxParticipants: requestedFields.includes('maxParticipants'),
        minParticipants: requestedFields.includes('minParticipants'),
        location: requestedFields.includes('location'),
        meetingPoint: requestedFields.includes('meetingPoint'),
        includes: requestedFields.includes('includes'),
        excludes: requestedFields.includes('excludes'),
        requirements: requestedFields.includes('requirements'),
        imageUrl: requestedFields.includes('imageUrl'),
        galleryUrls: requestedFields.includes('galleryUrls'),
        availableFrom: requestedFields.includes('availableFrom'),
        availableTo: requestedFields.includes('availableTo')
      }
    });

    res.json({
      success: true,
      tours
    });
  } catch (error) {
    console.error('[exportTours] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Exportieren der Touren'
    });
  }
};


