import { Request, Response } from 'express';
import { Prisma, TourType, TourBookingStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { convertFilterConditionsToPrismaWhere, validateFilterAgainstIsolation } from '../utils/filterToPrisma';
import { filterCache } from '../services/filterCache';
import { checkUserPermission } from '../middleware/permissionMiddleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';
import { getImageGenerationQueue, checkQueueHealth } from '../services/queueService';
import { GeminiImageService } from '../services/geminiImageService';
import { TourImageUploadService } from '../services/tourImageUploadService';
import { OrganizationBrandingService } from '../services/organizationBrandingService';
import { getUserLanguage, getTourErrorText, getTourBookingErrorText } from '../utils/translations';

interface AuthenticatedRequest extends Request {
  userId: string;
  roleId: string;
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

// Multer-Konfiguration für Tour-Bilder
const TOURS_UPLOAD_DIR = path.join(__dirname, '../../uploads/tours');
if (!fs.existsSync(TOURS_UPLOAD_DIR)) {
  fs.mkdirSync(TOURS_UPLOAD_DIR, { recursive: true });
}

const tourImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TOURS_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `tour-${uniqueSuffix}${ext}`);
  }
});

const tourImageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WEBP) are allowed'));
  }
};

export const tourImageUpload = multer({
  storage: tourImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: tourImageFileFilter
});

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
      : undefined; // Kein Limit wenn nicht angegeben - alle Tours werden zurückgegeben
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
            'tour',
            req
          );
          // ✅ SICHERHEIT: Validiere Filter gegen Datenisolation
          filterWhereClause = validateFilterAgainstIsolation(filterWhereClause, req, 'tour');
        }
      } catch (filterError) {
        logger.error(`[getAllTours] Fehler beim Laden von Filter ${filterId}:`, filterError);
      }
    } else if (filterConditions) {
      filterWhereClause = convertFilterConditionsToPrismaWhere(
        filterConditions.conditions || filterConditions,
        filterConditions.operators || [],
        'tour',
        req
      );
      // ✅ SICHERHEIT: Validiere Filter gegen Datenisolation
      filterWhereClause = validateFilterAgainstIsolation(filterWhereClause, req, 'tour');
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
      ...(limit ? { take: limit } : {}), // Nur Limit wenn angegeben
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
    logger.error('[getAllTours] Fehler:', error);
    if (error instanceof Error) {
      logger.error('[getAllTours] Fehlermeldung:', error.message);
      logger.error('[getAllTours] Stack:', error.stack);
    }
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : getTourErrorText('de', 'loadError')
    });
  }
};

// GET /api/tours/:id - Einzelne Tour
export const getTourById = async (req: Request, res: Response) => {
  try {
    const userId = parseInt((req as AuthenticatedRequest).userId, 10);
    const language = await getUserLanguage(userId);
    const { id } = req.params;
    const tourId = parseInt(id, 10);

    if (isNaN(tourId)) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'invalidTourId')
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
        message: getTourErrorText(language, 'tourNotFound')
      });
    }

    res.json({
      success: true,
      data: tour
    });
  } catch (error) {
    logger.error('[getTourById] Fehler:', error);
    const userId = parseInt((req as AuthenticatedRequest).userId, 10);
    const language = await getUserLanguage(userId);
    res.status(500).json({
      success: false,
      message: getTourErrorText(language, 'loadTourError')
    });
  }
};

// POST /api/tours - Neue Tour erstellen
export const createTour = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const language = await getUserLanguage(userId);
    // Berechtigung prüfen
    const hasPermission = await checkUserPermission(
      userId,
      parseInt(req.roleId),
      'tour_create',
      'write',
      'button'
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: getTourErrorText(language, 'noPermissionCreate')
      });
    }
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
        message: getTourErrorText(language, 'titleMinLength')
      });
    }

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'organizationRequired')
      });
    }

    // Validierung: maxParticipants >= minParticipants
    if (maxParticipants && minParticipants && maxParticipants < minParticipants) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'maxParticipantsMin')
      });
    }

    // Validierung: availableFrom <= availableTo
    if (availableFrom && availableTo && new Date(availableFrom) > new Date(availableTo)) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'availableFromTo')
      });
    }

    // Validierung: externalProviderId wenn type = external
    if (type === 'external' && !externalProviderId) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'externalProviderRequired')
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
    logger.error('[createTour] Fehler:', error);
    const userId = parseInt((req as AuthenticatedRequest).userId, 10);
    const language = await getUserLanguage(userId);
    res.status(500).json({
      success: false,
      message: getTourErrorText(language, 'createError')
    });
  }
};

// POST /api/tours/:id/image - Hauptbild hochladen
export const uploadTourImage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const language = await getUserLanguage(userId);
    const { id } = req.params;
    const tourId = parseInt(id, 10);

    if (isNaN(tourId)) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'invalidTourId')
      });
    }

    // Berechtigung prüfen
    const hasPermission = await checkUserPermission(
      userId,
      parseInt(req.roleId),
      'tour_edit',
      'write',
      'button'
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: getTourErrorText(language, 'noPermissionEdit')
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'noFileUploaded')
      });
    }

    // Altes Bild löschen (falls vorhanden)
    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      select: { imageUrl: true }
    });

    if (tour?.imageUrl) {
      const oldImagePath = path.join(__dirname, '../../uploads/tours', path.basename(tour.imageUrl));
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Bild-URL speichern (relativ zum uploads-Verzeichnis)
    const imageUrl = `/uploads/tours/${req.file.filename}`;

    const updatedTour = await prisma.tour.update({
      where: { id: tourId },
      data: { imageUrl },
      include: {
        createdBy: { select: userSelect },
        branch: { select: branchSelect },
        externalProvider: true
      }
    });

    res.json({
      success: true,
      data: updatedTour
    });
  } catch (error) {
    logger.error('[uploadTourImage] Fehler:', error);
    const userId = parseInt((req as AuthenticatedRequest).userId, 10);
    const language = await getUserLanguage(userId);
    res.status(500).json({
      success: false,
      message: getTourErrorText(language, 'imageUploadError')
    });
  }
};

// POST /api/tours/:id/gallery - Galerie-Bild hinzufügen
export const uploadTourGalleryImage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const language = await getUserLanguage(userId);
    const { id } = req.params;
    const tourId = parseInt(id, 10);

    if (isNaN(tourId)) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'invalidTourId')
      });
    }

    // Berechtigung prüfen
    const hasPermission = await checkUserPermission(
      userId,
      parseInt(req.roleId),
      'tour_edit',
      'write',
      'button'
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: getTourErrorText(language, 'noPermissionEdit')
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'noFileUploaded')
      });
    }

    // Aktuelle Galerie laden
    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      select: { galleryUrls: true }
    });

    const currentGallery = (tour?.galleryUrls as string[]) || [];
    const newImageUrl = `/uploads/tours/${req.file.filename}`;
    const updatedGallery = [...currentGallery, newImageUrl];

    const updatedTour = await prisma.tour.update({
      where: { id: tourId },
      data: { galleryUrls: updatedGallery },
      include: {
        createdBy: { select: userSelect },
        branch: { select: branchSelect },
        externalProvider: true
      }
    });

    res.json({
      success: true,
      data: updatedTour
    });
  } catch (error) {
    logger.error('[uploadTourGalleryImage] Fehler:', error);
    const userId = parseInt((req as AuthenticatedRequest).userId, 10);
    const language = await getUserLanguage(userId);
    res.status(500).json({
      success: false,
      message: getTourErrorText(language, 'galleryUploadError')
    });
  }
};

// GET /api/tours/:id/image - Hauptbild abrufen
export const getTourImage = async (req: Request, res: Response) => {
  try {
    const userId = parseInt((req as AuthenticatedRequest).userId || '0', 10);
    const language = userId > 0 ? await getUserLanguage(userId) : 'de';
    const { id } = req.params;
    const tourId = parseInt(id, 10);

    if (isNaN(tourId)) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'invalidTourId')
      });
    }

    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      select: { imageUrl: true }
    });

    if (!tour || !tour.imageUrl) {
      return res.status(404).json({
        success: false,
        message: getTourErrorText(language, 'imageNotFound')
      });
    }

    // Extrahiere Dateinamen aus URL (z.B. /uploads/tours/tour-123.jpg -> tour-123.jpg)
    const filename = path.basename(tour.imageUrl);
    const imagePath = path.join(TOURS_UPLOAD_DIR, filename);

    // Prüfe ob Datei existiert
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        success: false,
        message: getTourErrorText(language, 'imageFileNotFound')
      });
    }

    // Setze Content-Type basierend auf Dateiendung
    const ext = path.extname(filename).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    const contentType = contentTypeMap[ext] || 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 Jahr Cache
    res.sendFile(imagePath);
  } catch (error) {
    logger.error('[getTourImage] Fehler:', error);
    const userId = parseInt((req as AuthenticatedRequest).userId || '0', 10);
    const language = userId > 0 ? await getUserLanguage(userId) : 'de';
    res.status(500).json({
      success: false,
      message: getTourErrorText(language, 'loadImageError')
    });
  }
};

// GET /api/tours/:id/gallery/:index - Galerie-Bild abrufen
export const getTourGalleryImage = async (req: Request, res: Response) => {
  try {
    const userId = parseInt((req as AuthenticatedRequest).userId || '0', 10);
    const language = userId > 0 ? await getUserLanguage(userId) : 'de';
    const { id, index } = req.params;
    const tourId = parseInt(id, 10);
    const imageIndex = parseInt(index, 10);

    if (isNaN(tourId) || isNaN(imageIndex)) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'invalidTourIdOrImageIndex')
      });
    }

    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      select: { galleryUrls: true }
    });

    if (!tour || !tour.galleryUrls) {
      return res.status(404).json({
        success: false,
        message: getTourErrorText(language, 'galleryNotFound')
      });
    }

    const galleryUrls = tour.galleryUrls as string[];
    if (imageIndex < 0 || imageIndex >= galleryUrls.length) {
      return res.status(404).json({
        success: false,
        message: getTourErrorText(language, 'imageIndexOutOfRange')
      });
    }

    const imageUrl = galleryUrls[imageIndex];
    const filename = path.basename(imageUrl);
    const imagePath = path.join(TOURS_UPLOAD_DIR, filename);

    // Prüfe ob Datei existiert
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        success: false,
        message: getTourErrorText(language, 'imageFileNotFound')
      });
    }

    // Setze Content-Type basierend auf Dateiendung
    const ext = path.extname(filename).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    const contentType = contentTypeMap[ext] || 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 Jahr Cache
    res.sendFile(imagePath);
  } catch (error) {
    logger.error('[getTourGalleryImage] Fehler:', error);
    const userId = parseInt((req as AuthenticatedRequest).userId || '0', 10);
    const language = userId > 0 ? await getUserLanguage(userId) : 'de';
    res.status(500).json({
      success: false,
      message: getTourErrorText(language, 'loadGalleryImageError')
    });
  }
};

// DELETE /api/tours/:id/gallery/:imageIndex - Galerie-Bild löschen
export const deleteTourGalleryImage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const language = await getUserLanguage(userId);
    const { id, imageIndex } = req.params;
    const tourId = parseInt(id, 10);
    const index = parseInt(imageIndex, 10);

    if (isNaN(tourId) || isNaN(index)) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'invalidParameters')
      });
    }

    // Berechtigung prüfen
    const hasPermission = await checkUserPermission(
      userId,
      parseInt(req.roleId),
      'tour_edit',
      'write',
      'button'
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: getTourErrorText(language, 'noPermissionEdit')
      });
    }

    // Prüfe Organization-Isolation
    const organizationId = (req as any).organizationId;
    
    // Aktuelle Galerie laden
    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      select: { galleryUrls: true, organizationId: true }
    });

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: getTourErrorText(language, 'tourNotFound')
      });
    }

    // Prüfe Organization-Isolation
    if (tour.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        message: getTourErrorText(language, 'noPermissionEdit')
      });
    }

    const currentGallery = (tour.galleryUrls as string[]) || [];
    if (index < 0 || index >= currentGallery.length) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'imageIndexOutOfRange')
      });
    }

    // Bild löschen
    const imageUrl = currentGallery[index];
    const imagePath = path.join(__dirname, '../../uploads/tours', path.basename(imageUrl));
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Aus Galerie entfernen
    const updatedGallery = currentGallery.filter((_, i) => i !== index);

    const updatedTour = await prisma.tour.update({
      where: { id: tourId },
      data: { galleryUrls: updatedGallery },
      include: {
        createdBy: { select: userSelect },
        branch: { select: branchSelect },
        externalProvider: true
      }
    });

    res.json({
      success: true,
      data: updatedTour
    });
  } catch (error) {
    logger.error('[deleteTourGalleryImage] Fehler:', error);
    const userId = parseInt((req as AuthenticatedRequest).userId, 10);
    const language = await getUserLanguage(userId);
    res.status(500).json({
      success: false,
      message: getTourErrorText(language, 'deleteError')
    });
  }
};

// DELETE /api/tours/:id/image - Hauptbild löschen
export const deleteTourImage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const language = await getUserLanguage(userId);
    const { id } = req.params;
    const tourId = parseInt(id, 10);

    if (isNaN(tourId)) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'invalidTourId')
      });
    }

    // Berechtigung prüfen
    const hasPermission = await checkUserPermission(
      userId,
      parseInt(req.roleId),
      'tour_edit',
      'write',
      'button'
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: getTourErrorText(language, 'noPermissionEdit')
      });
    }

    // Lade Tour mit imageUrl
    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      select: { imageUrl: true, organizationId: true }
    });

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: getTourErrorText(language, 'tourNotFound')
      });
    }

    // Prüfe Organization-Isolation
    const organizationId = (req as any).organizationId;
    if (tour.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        message: getTourErrorText(language, 'noPermissionForTour')
      });
    }

    // Lösche Bilddatei (falls vorhanden)
    if (tour.imageUrl) {
      const filename = path.basename(tour.imageUrl);
      const imagePath = path.join(TOURS_UPLOAD_DIR, filename);
      
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        logger.log(`[deleteTourImage] Bilddatei gelöscht: ${imagePath}`);
      }
    }

    // Setze imageUrl auf null
    await prisma.tour.update({
      where: { id: tourId },
      data: { imageUrl: null }
    });

    res.json({
      success: true,
      message: getTourErrorText(language, 'imageDeleted')
    });
  } catch (error) {
    logger.error('[deleteTourImage] Fehler:', error);
    const userId = parseInt((req as AuthenticatedRequest).userId, 10);
    const language = await getUserLanguage(userId);
    res.status(500).json({
      success: false,
      message: getTourErrorText(language, 'deleteError')
    });
  }
};

// PUT /api/tours/:id - Tour aktualisieren
export const updateTour = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const language = await getUserLanguage(userId);
    // Berechtigung prüfen
    const hasPermission = await checkUserPermission(
      userId,
      parseInt(req.roleId),
      'tour_edit',
      'write',
      'button'
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: getTourErrorText(language, 'noPermissionEdit')
      });
    }

    const { id } = req.params;
    const tourId = parseInt(id, 10);

    if (isNaN(tourId)) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'invalidTourId')
      });
    }

    // Prüfe ob Tour existiert
    const existingTour = await prisma.tour.findUnique({
      where: { id: tourId }
    });

    if (!existingTour) {
      return res.status(404).json({
        success: false,
        message: getTourErrorText(language, 'tourNotFound')
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
        message: getTourErrorText(language, 'maxParticipantsMin')
      });
    }

    // Validierung: availableFrom <= availableTo
    if (availableFrom && availableTo && new Date(availableFrom) > new Date(availableTo)) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'availableFromTo')
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
    logger.error('[updateTour] Fehler:', error);
    const userId = parseInt((req as AuthenticatedRequest).userId, 10);
    const language = await getUserLanguage(userId);
    res.status(500).json({
      success: false,
      message: getTourErrorText(language, 'updateError')
    });
  }
};

// PUT /api/tours/:id/toggle-active - Tour aktiv/inaktiv setzen (Soft Delete)
export const toggleTourActive = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const language = await getUserLanguage(userId);
    // Berechtigung prüfen
    const hasPermission = await checkUserPermission(
      userId,
      parseInt(req.roleId),
      'tour_delete',
      'write',
      'button'
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: getTourErrorText(language, 'noPermissionDelete')
      });
    }

    const { id } = req.params;
    const tourId = parseInt(id, 10);
    const { isActive } = req.body;

    if (isNaN(tourId)) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'invalidTourId')
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'isActiveMustBeBoolean')
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
    logger.error('[toggleTourActive] Fehler:', error);
    const userId = parseInt((req as AuthenticatedRequest).userId, 10);
    const language = await getUserLanguage(userId);
    res.status(500).json({
      success: false,
      message: getTourErrorText(language, 'updateError')
    });
  }
};

// GET /api/tours/:id/bookings - Buchungen einer Tour
export const getTourBookings = async (req: Request, res: Response) => {
  try {
    const userId = parseInt((req as AuthenticatedRequest).userId || '0', 10);
    const language = userId > 0 ? await getUserLanguage(userId) : 'de';
    const { id } = req.params;
    const tourId = parseInt(id, 10);

    if (isNaN(tourId)) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'invalidTourId')
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
    logger.error('[getTourBookings] Fehler:', error);
    const userId = parseInt((req as AuthenticatedRequest).userId || '0', 10);
    const language = userId > 0 ? await getUserLanguage(userId) : 'de';
    res.status(500).json({
      success: false,
      message: getTourBookingErrorText(language, 'loadError')
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
        availableTo: requestedFields.includes('availableTo'),
        externalBookingUrl: requestedFields.includes('externalBookingUrl'),
        branch: requestedFields.includes('branch') ? {
          select: branchSelect
        } : false,
        externalProvider: requestedFields.includes('externalProvider') ? {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        } : false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      tours
    });
  } catch (error) {
    logger.error('[exportTours] Fehler:', error);
    const userId = parseInt((req as AuthenticatedRequest).userId || '0', 10);
    const language = userId > 0 ? await getUserLanguage(userId) : 'de';
    res.status(500).json({
      success: false,
      message: getTourErrorText(language, 'loadError')
    });
  }
};

// POST /api/tours/:id/generate-images - Startet Bildgenerierung
export const generateTourImages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const language = await getUserLanguage(userId);
    const { id } = req.params;
    const tourId = parseInt(id, 10);

    if (isNaN(tourId)) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'invalidTourId')
      });
    }

    // Berechtigung prüfen
    const hasPermission = await checkUserPermission(
      userId,
      parseInt(req.roleId),
      'tour_edit',
      'write',
      'button'
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: getTourErrorText(language, 'noPermissionEdit')
      });
    }

    // Prüfe Organization-Isolation
    const organizationId = (req as any).organizationId;

    // Prüfe ob Tour existiert und lade Organisation mit Logo
    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      select: { 
        id: true, 
        title: true, 
        description: true, 
        organizationId: true,
        organization: {
          select: {
            id: true,
            logo: true,
            displayName: true
          }
        }
      }
    });

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: getTourErrorText(language, 'tourNotFound')
      });
    }

    if (tour.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        message: getTourErrorText(language, 'noPermissionForTour')
      });
    }

    // Prüfe ob Queue verfügbar ist
    const queueAvailable = await checkQueueHealth();
    const queueEnabled = process.env.QUEUE_ENABLED === 'true';

    // Fallback: Synchroner Modus wenn Queue nicht verfügbar
    if (!queueAvailable || !queueEnabled) {
      logger.warn(`[generateTourImages] Queue nicht verfügbar, verwende synchronen Modus für Tour ${tourId}`);
      
      try {
        // Extrahiere Branding aus Logo (falls vorhanden)
        let branding = undefined;
        if (tour.organization?.logo) {
          try {
            logger.log(`[generateTourImages] Extrahiere Branding aus Logo für Organisation ${tour.organization.displayName}`);
            branding = await OrganizationBrandingService.extractBrandingFromLogo(tour.organization.logo);
            logger.log(`[generateTourImages] Branding extrahiert:`, {
              hasColors: !!branding.colors.primary,
              hasFonts: !!branding.fonts,
              hasStyle: !!branding.style
            });
          } catch (error: unknown) {
            logger.warn(`[generateTourImages] Fehler bei Branding-Extraktion, verwende Standard:`, error instanceof Error ? error.message : String(error));
            // Fehler ist nicht kritisch, verwende Standard-Branding (undefined)
          }
        } else {
          logger.log(`[generateTourImages] Kein Logo vorhanden für Organisation ${tour.organization?.displayName || organizationId}`);
        }

        // Synchroner Modus: Direkt generieren und hochladen
        const generatedImages = await GeminiImageService.generateTourImages(
          tour.id,
          tour.title || '',
          tour.description || '',
          process.env.GEMINI_API_KEY,
          branding,
          tour.organization?.logo || undefined
        );

        // Lade Flyer als Hauptbild hoch (der Flyer ist das Hauptbild)
        if (generatedImages.flyer && fs.existsSync(generatedImages.flyer)) {
          await TourImageUploadService.uploadImageDirectly(tourId, generatedImages.flyer);
          logger.log(`[generateTourImages] Flyer als Hauptbild hochgeladen: ${generatedImages.flyer}`);
        }

        // Lade Galerie-Bilder hoch
        for (const galleryImage of generatedImages.galleryImages) {
          if (fs.existsSync(galleryImage)) {
            await TourImageUploadService.uploadGalleryImageDirectly(tourId, galleryImage);
          }
        }

        // Cleanup temporäre Dateien (Galerie-Bilder, Flyer bleibt als imageUrl)
        cleanupTemporaryFiles(generatedImages);

        return res.json({
          success: true,
          mode: 'synchronous',
          message: getTourErrorText(language, 'imagesGeneratedSuccess')
        });
      } catch (error: unknown) {
        logger.error(`[generateTourImages] Fehler im synchronen Modus:`, error);
        return res.status(500).json({
          success: false,
          message: (error instanceof Error ? error.message : undefined) || getTourErrorText(language, 'imageGenerationError')
        });
      }
    }

    // Asynchroner Modus: Job zur Queue hinzufügen
    const queue = getImageGenerationQueue();
    const job = await queue.add(
      'generate-tour-images',
      {
        tourId: tour.id,
        organizationId,
        userId: parseInt(req.userId)
      },
      {
        jobId: `tour-${tourId}-${Date.now()}` // Eindeutige Job-ID
      }
    );

    logger.log(`[generateTourImages] Job zur Queue hinzugefügt: ${job.id} für Tour ${tourId}`);

    res.json({
      success: true,
      mode: 'asynchronous',
      jobId: job.id,
      message: getTourErrorText(language, 'imageGenerationStarted')
    });
  } catch (error: unknown) {
    logger.error('[generateTourImages] Fehler:', error);
    // Language im catch-Block holen, falls nicht im try-Block definiert
    const userId = parseInt((req as AuthenticatedRequest).userId, 10);
    const language = await getUserLanguage(userId);
    res.status(500).json({
      success: false,
      message: (error instanceof Error ? error.message : undefined) || getTourErrorText(language, 'imageGenerationError')
    });
  }
};

// GET /api/tours/:id/generate-images/status - Prüft Status der Bildgenerierung
export const getTourImageGenerationStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.userId, 10);
    const language = await getUserLanguage(userId);
    const { id } = req.params;
    const tourId = parseInt(id, 10);

    if (isNaN(tourId)) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'invalidTourId')
      });
    }

    const jobId = req.query.jobId as string;
    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: getTourErrorText(language, 'jobIdRequired')
      });
    }

    const queue = getImageGenerationQueue();
    const job = await queue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: getTourErrorText(language, 'jobNotFound')
      });
    }

    const state = await job.getState();
    const progress = job.progress as number || 0;

    let status: 'waiting' | 'active' | 'completed' | 'failed' = 'waiting';
    if (state === 'completed') {
      status = 'completed';
    } else if (state === 'failed') {
      status = 'failed';
    } else if (state === 'active') {
      status = 'active';
    }

    res.json({
      success: true,
      status,
      progress,
      jobId: job.id
    });
  } catch (error: unknown) {
    logger.error('[getTourImageGenerationStatus] Fehler:', error);
    // Language im catch-Block holen, falls nicht im try-Block definiert
    const userId = parseInt((req as AuthenticatedRequest).userId, 10);
    const language = await getUserLanguage(userId);
    res.status(500).json({
      success: false,
      message: (error instanceof Error ? error.message : undefined) || getTourErrorText(language, 'statusError')
    });
  }
};


// Hilfsfunktion: Bereinigt temporäre Dateien
function cleanupTemporaryFiles(images: { flyer: string; galleryImages: string[] }): void {
  try {
    // Lösche Galerie-Bilder (werden bereits hochgeladen)
    images.galleryImages.forEach((img) => {
      if (fs.existsSync(img)) {
        fs.unlinkSync(img);
        logger.log(`[cleanupTemporaryFiles] Temporäre Datei gelöscht: ${img}`);
      }
    });

    // Flyer wird NICHT gelöscht, da er bereits als imageUrl hochgeladen wurde
    // Die Datei bleibt im uploads-Verzeichnis und wird von der Tour referenziert
  } catch (error: unknown) {
    logger.error('[cleanupTemporaryFiles] Fehler:', error);
  }
}


