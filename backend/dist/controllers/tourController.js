"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTourImageGenerationStatus = exports.generateTourImages = exports.exportTours = exports.getTourBookings = exports.toggleTourActive = exports.updateTour = exports.deleteTourImage = exports.deleteTourGalleryImage = exports.getTourGalleryImage = exports.getTourImage = exports.uploadTourGalleryImage = exports.uploadTourImage = exports.createTour = exports.getTourById = exports.getAllTours = exports.tourImageUpload = void 0;
const prisma_1 = require("../utils/prisma");
const filterToPrisma_1 = require("../utils/filterToPrisma");
const filterCache_1 = require("../services/filterCache");
const permissionMiddleware_1 = require("../middleware/permissionMiddleware");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const logger_1 = require("../utils/logger");
const queueService_1 = require("../services/queueService");
const geminiImageService_1 = require("../services/geminiImageService");
const tourImageUploadService_1 = require("../services/tourImageUploadService");
const organizationBrandingService_1 = require("../services/organizationBrandingService");
const translations_1 = require("../utils/translations");
const userSelect = {
    id: true,
    username: true,
    firstName: true,
    lastName: true
};
const branchSelect = {
    id: true,
    name: true
};
// Multer-Konfiguration für Tour-Bilder
const TOURS_UPLOAD_DIR = path_1.default.join(__dirname, '../../uploads/tours');
if (!fs_1.default.existsSync(TOURS_UPLOAD_DIR)) {
    fs_1.default.mkdirSync(TOURS_UPLOAD_DIR, { recursive: true });
}
const tourImageStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, TOURS_UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `tour-${uniqueSuffix}${ext}`);
    }
});
const tourImageFileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Only image files (JPEG, PNG, GIF, WEBP) are allowed'));
    }
};
exports.tourImageUpload = (0, multer_1.default)({
    storage: tourImageStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: tourImageFileFilter
});
// GET /api/tours - Alle Touren (mit Filtern)
const getAllTours = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const organizationId = req.organizationId;
        const branchId = req.branchId;
        // Filter-Parameter aus Query lesen
        const filterId = req.query.filterId;
        const filterConditions = req.query.filterConditions
            ? JSON.parse(req.query.filterConditions)
            : undefined;
        const limit = req.query.limit
            ? parseInt(req.query.limit, 10)
            : undefined; // Kein Limit wenn nicht angegeben - alle Tours werden zurückgegeben
        const type = req.query.type;
        const isActive = req.query.isActive !== undefined
            ? req.query.isActive === 'true'
            : undefined;
        const search = req.query.search;
        // Filter-Bedingungen konvertieren (falls vorhanden)
        let filterWhereClause = {};
        if (filterId) {
            try {
                const filterData = yield filterCache_1.filterCache.get(parseInt(filterId, 10));
                if (filterData) {
                    const conditions = JSON.parse(filterData.conditions);
                    const operators = JSON.parse(filterData.operators);
                    filterWhereClause = (0, filterToPrisma_1.convertFilterConditionsToPrismaWhere)(conditions, operators, 'tour', req);
                    // ✅ SICHERHEIT: Validiere Filter gegen Datenisolation
                    filterWhereClause = (0, filterToPrisma_1.validateFilterAgainstIsolation)(filterWhereClause, req, 'tour');
                }
            }
            catch (filterError) {
                logger_1.logger.error(`[getAllTours] Fehler beim Laden von Filter ${filterId}:`, filterError);
            }
        }
        else if (filterConditions) {
            filterWhereClause = (0, filterToPrisma_1.convertFilterConditionsToPrismaWhere)(filterConditions.conditions || filterConditions, filterConditions.operators || [], 'tour', req);
            // ✅ SICHERHEIT: Validiere Filter gegen Datenisolation
            filterWhereClause = (0, filterToPrisma_1.validateFilterAgainstIsolation)(filterWhereClause, req, 'tour');
        }
        // Basis-WHERE-Bedingungen
        const baseWhereConditions = [];
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
        }
        else {
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
        const whereClause = baseWhereConditions.length === 1
            ? baseWhereConditions[0]
            : { AND: baseWhereConditions };
        const tours = yield prisma_1.prisma.tour.findMany(Object.assign(Object.assign({ where: whereClause }, (limit ? { take: limit } : {})), { include: {
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
            }, orderBy: {
                createdAt: 'desc'
            } }));
        res.json({
            success: true,
            data: tours
        });
    }
    catch (error) {
        logger_1.logger.error('[getAllTours] Fehler:', error);
        if (error instanceof Error) {
            logger_1.logger.error('[getAllTours] Fehlermeldung:', error.message);
            logger_1.logger.error('[getAllTours] Stack:', error.stack);
        }
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : (0, translations_1.getTourErrorText)('de', 'loadError')
        });
    }
});
exports.getAllTours = getAllTours;
// GET /api/tours/:id - Einzelne Tour
const getTourById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const language = yield (0, translations_1.getUserLanguage)(userId);
        const { id } = req.params;
        const tourId = parseInt(id, 10);
        if (isNaN(tourId)) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'invalidTourId')
            });
        }
        const tour = yield prisma_1.prisma.tour.findUnique({
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
                message: (0, translations_1.getTourErrorText)(language, 'tourNotFound')
            });
        }
        res.json({
            success: true,
            data: tour
        });
    }
    catch (error) {
        logger_1.logger.error('[getTourById] Fehler:', error);
        const userId = parseInt(req.userId, 10);
        const language = yield (0, translations_1.getUserLanguage)(userId);
        res.status(500).json({
            success: false,
            message: (0, translations_1.getTourErrorText)(language, 'loadTourError')
        });
    }
});
exports.getTourById = getTourById;
// POST /api/tours - Neue Tour erstellen
const createTour = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const language = yield (0, translations_1.getUserLanguage)(userId);
        // Berechtigung prüfen
        const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(userId, parseInt(req.roleId), 'tour_create', 'write', 'button');
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'noPermissionCreate')
            });
        }
        const organizationId = req.organizationId;
        const branchId = req.branchId;
        const { title, description, type = 'own', isActive = true, duration, maxParticipants, minParticipants, price, currency = 'COP', location, meetingPoint, includes, excludes, requirements, totalCommission, totalCommissionPercent, sellerCommissionPercent, sellerCommissionFixed, externalProviderId, externalBookingUrl, availableFrom, availableTo, recurringSchedule } = req.body;
        // Validierung
        if (!title || title.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'titleMinLength')
            });
        }
        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'organizationRequired')
            });
        }
        // Validierung: maxParticipants >= minParticipants
        if (maxParticipants && minParticipants && maxParticipants < minParticipants) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'maxParticipantsMin')
            });
        }
        // Validierung: availableFrom <= availableTo
        if (availableFrom && availableTo && new Date(availableFrom) > new Date(availableTo)) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'availableFromTo')
            });
        }
        // Validierung: externalProviderId wenn type = external
        if (type === 'external' && !externalProviderId) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'externalProviderRequired')
            });
        }
        const tour = yield prisma_1.prisma.tour.create({
            data: {
                title: title.trim(),
                description: (description === null || description === void 0 ? void 0 : description.trim()) || null,
                type: type,
                isActive,
                duration: duration || null,
                maxParticipants: maxParticipants || null,
                minParticipants: minParticipants || null,
                price: price ? parseFloat(price) : null,
                currency: currency || 'COP',
                location: (location === null || location === void 0 ? void 0 : location.trim()) || null,
                meetingPoint: (meetingPoint === null || meetingPoint === void 0 ? void 0 : meetingPoint.trim()) || null,
                includes: (includes === null || includes === void 0 ? void 0 : includes.trim()) || null,
                excludes: (excludes === null || excludes === void 0 ? void 0 : excludes.trim()) || null,
                requirements: (requirements === null || requirements === void 0 ? void 0 : requirements.trim()) || null,
                totalCommission: totalCommission ? parseFloat(totalCommission) : null,
                totalCommissionPercent: totalCommissionPercent ? parseFloat(totalCommissionPercent) : null,
                sellerCommissionPercent: sellerCommissionPercent ? parseFloat(sellerCommissionPercent) : null,
                sellerCommissionFixed: sellerCommissionFixed ? parseFloat(sellerCommissionFixed) : null,
                externalProviderId: externalProviderId || null,
                externalBookingUrl: (externalBookingUrl === null || externalBookingUrl === void 0 ? void 0 : externalBookingUrl.trim()) || null,
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
    }
    catch (error) {
        logger_1.logger.error('[createTour] Fehler:', error);
        const userId = parseInt(req.userId, 10);
        const language = yield (0, translations_1.getUserLanguage)(userId);
        res.status(500).json({
            success: false,
            message: (0, translations_1.getTourErrorText)(language, 'createError')
        });
    }
});
exports.createTour = createTour;
// POST /api/tours/:id/image - Hauptbild hochladen
const uploadTourImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const language = yield (0, translations_1.getUserLanguage)(userId);
        const { id } = req.params;
        const tourId = parseInt(id, 10);
        if (isNaN(tourId)) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'invalidTourId')
            });
        }
        // Berechtigung prüfen
        const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(userId, parseInt(req.roleId), 'tour_edit', 'write', 'button');
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'noPermissionEdit')
            });
        }
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'noFileUploaded')
            });
        }
        // Altes Bild löschen (falls vorhanden)
        const tour = yield prisma_1.prisma.tour.findUnique({
            where: { id: tourId },
            select: { imageUrl: true }
        });
        if (tour === null || tour === void 0 ? void 0 : tour.imageUrl) {
            const oldImagePath = path_1.default.join(__dirname, '../../uploads/tours', path_1.default.basename(tour.imageUrl));
            if (fs_1.default.existsSync(oldImagePath)) {
                fs_1.default.unlinkSync(oldImagePath);
            }
        }
        // Bild-URL speichern (relativ zum uploads-Verzeichnis)
        const imageUrl = `/uploads/tours/${req.file.filename}`;
        const updatedTour = yield prisma_1.prisma.tour.update({
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
    }
    catch (error) {
        logger_1.logger.error('[uploadTourImage] Fehler:', error);
        const userId = parseInt(req.userId, 10);
        const language = yield (0, translations_1.getUserLanguage)(userId);
        res.status(500).json({
            success: false,
            message: (0, translations_1.getTourErrorText)(language, 'imageUploadError')
        });
    }
});
exports.uploadTourImage = uploadTourImage;
// POST /api/tours/:id/gallery - Galerie-Bild hinzufügen
const uploadTourGalleryImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const language = yield (0, translations_1.getUserLanguage)(userId);
        const { id } = req.params;
        const tourId = parseInt(id, 10);
        if (isNaN(tourId)) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'invalidTourId')
            });
        }
        // Berechtigung prüfen
        const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(userId, parseInt(req.roleId), 'tour_edit', 'write', 'button');
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'noPermissionEdit')
            });
        }
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'noFileUploaded')
            });
        }
        // Aktuelle Galerie laden
        const tour = yield prisma_1.prisma.tour.findUnique({
            where: { id: tourId },
            select: { galleryUrls: true }
        });
        const currentGallery = (tour === null || tour === void 0 ? void 0 : tour.galleryUrls) || [];
        const newImageUrl = `/uploads/tours/${req.file.filename}`;
        const updatedGallery = [...currentGallery, newImageUrl];
        const updatedTour = yield prisma_1.prisma.tour.update({
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
    }
    catch (error) {
        logger_1.logger.error('[uploadTourGalleryImage] Fehler:', error);
        const userId = parseInt(req.userId, 10);
        const language = yield (0, translations_1.getUserLanguage)(userId);
        res.status(500).json({
            success: false,
            message: (0, translations_1.getTourErrorText)(language, 'galleryUploadError')
        });
    }
});
exports.uploadTourGalleryImage = uploadTourGalleryImage;
// GET /api/tours/:id/image - Hauptbild abrufen
const getTourImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId || '0', 10);
        const language = userId > 0 ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
        const { id } = req.params;
        const tourId = parseInt(id, 10);
        if (isNaN(tourId)) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'invalidTourId')
            });
        }
        const tour = yield prisma_1.prisma.tour.findUnique({
            where: { id: tourId },
            select: { imageUrl: true }
        });
        if (!tour || !tour.imageUrl) {
            return res.status(404).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'imageNotFound')
            });
        }
        // Extrahiere Dateinamen aus URL (z.B. /uploads/tours/tour-123.jpg -> tour-123.jpg)
        const filename = path_1.default.basename(tour.imageUrl);
        const imagePath = path_1.default.join(TOURS_UPLOAD_DIR, filename);
        // Prüfe ob Datei existiert
        if (!fs_1.default.existsSync(imagePath)) {
            return res.status(404).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'imageFileNotFound')
            });
        }
        // Setze Content-Type basierend auf Dateiendung
        const ext = path_1.default.extname(filename).toLowerCase();
        const contentTypeMap = {
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
    }
    catch (error) {
        logger_1.logger.error('[getTourImage] Fehler:', error);
        const userId = parseInt(req.userId || '0', 10);
        const language = userId > 0 ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
        res.status(500).json({
            success: false,
            message: (0, translations_1.getTourErrorText)(language, 'loadImageError')
        });
    }
});
exports.getTourImage = getTourImage;
// GET /api/tours/:id/gallery/:index - Galerie-Bild abrufen
const getTourGalleryImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId || '0', 10);
        const language = userId > 0 ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
        const { id, index } = req.params;
        const tourId = parseInt(id, 10);
        const imageIndex = parseInt(index, 10);
        if (isNaN(tourId) || isNaN(imageIndex)) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'invalidTourIdOrImageIndex')
            });
        }
        const tour = yield prisma_1.prisma.tour.findUnique({
            where: { id: tourId },
            select: { galleryUrls: true }
        });
        if (!tour || !tour.galleryUrls) {
            return res.status(404).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'galleryNotFound')
            });
        }
        const galleryUrls = tour.galleryUrls;
        if (imageIndex < 0 || imageIndex >= galleryUrls.length) {
            return res.status(404).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'imageIndexOutOfRange')
            });
        }
        const imageUrl = galleryUrls[imageIndex];
        const filename = path_1.default.basename(imageUrl);
        const imagePath = path_1.default.join(TOURS_UPLOAD_DIR, filename);
        // Prüfe ob Datei existiert
        if (!fs_1.default.existsSync(imagePath)) {
            return res.status(404).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'imageFileNotFound')
            });
        }
        // Setze Content-Type basierend auf Dateiendung
        const ext = path_1.default.extname(filename).toLowerCase();
        const contentTypeMap = {
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
    }
    catch (error) {
        logger_1.logger.error('[getTourGalleryImage] Fehler:', error);
        const userId = parseInt(req.userId || '0', 10);
        const language = userId > 0 ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
        res.status(500).json({
            success: false,
            message: (0, translations_1.getTourErrorText)(language, 'loadGalleryImageError')
        });
    }
});
exports.getTourGalleryImage = getTourGalleryImage;
// DELETE /api/tours/:id/gallery/:imageIndex - Galerie-Bild löschen
const deleteTourGalleryImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const language = yield (0, translations_1.getUserLanguage)(userId);
        const { id, imageIndex } = req.params;
        const tourId = parseInt(id, 10);
        const index = parseInt(imageIndex, 10);
        if (isNaN(tourId) || isNaN(index)) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'invalidParameters')
            });
        }
        // Berechtigung prüfen
        const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(userId, parseInt(req.roleId), 'tour_edit', 'write', 'button');
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'noPermissionEdit')
            });
        }
        // Prüfe Organization-Isolation
        const organizationId = req.organizationId;
        // Aktuelle Galerie laden
        const tour = yield prisma_1.prisma.tour.findUnique({
            where: { id: tourId },
            select: { galleryUrls: true, organizationId: true }
        });
        if (!tour) {
            return res.status(404).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'tourNotFound')
            });
        }
        // Prüfe Organization-Isolation
        if (tour.organizationId !== organizationId) {
            return res.status(403).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'noPermissionEdit')
            });
        }
        const currentGallery = tour.galleryUrls || [];
        if (index < 0 || index >= currentGallery.length) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'imageIndexOutOfRange')
            });
        }
        // Bild löschen
        const imageUrl = currentGallery[index];
        const imagePath = path_1.default.join(__dirname, '../../uploads/tours', path_1.default.basename(imageUrl));
        if (fs_1.default.existsSync(imagePath)) {
            fs_1.default.unlinkSync(imagePath);
        }
        // Aus Galerie entfernen
        const updatedGallery = currentGallery.filter((_, i) => i !== index);
        const updatedTour = yield prisma_1.prisma.tour.update({
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
    }
    catch (error) {
        logger_1.logger.error('[deleteTourGalleryImage] Fehler:', error);
        const userId = parseInt(req.userId, 10);
        const language = yield (0, translations_1.getUserLanguage)(userId);
        res.status(500).json({
            success: false,
            message: (0, translations_1.getTourErrorText)(language, 'deleteError')
        });
    }
});
exports.deleteTourGalleryImage = deleteTourGalleryImage;
// DELETE /api/tours/:id/image - Hauptbild löschen
const deleteTourImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const language = yield (0, translations_1.getUserLanguage)(userId);
        const { id } = req.params;
        const tourId = parseInt(id, 10);
        if (isNaN(tourId)) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'invalidTourId')
            });
        }
        // Berechtigung prüfen
        const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(userId, parseInt(req.roleId), 'tour_edit', 'write', 'button');
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'noPermissionEdit')
            });
        }
        // Lade Tour mit imageUrl
        const tour = yield prisma_1.prisma.tour.findUnique({
            where: { id: tourId },
            select: { imageUrl: true, organizationId: true }
        });
        if (!tour) {
            return res.status(404).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'tourNotFound')
            });
        }
        // Prüfe Organization-Isolation
        const organizationId = req.organizationId;
        if (tour.organizationId !== organizationId) {
            return res.status(403).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'noPermissionForTour')
            });
        }
        // Lösche Bilddatei (falls vorhanden)
        if (tour.imageUrl) {
            const filename = path_1.default.basename(tour.imageUrl);
            const imagePath = path_1.default.join(TOURS_UPLOAD_DIR, filename);
            if (fs_1.default.existsSync(imagePath)) {
                fs_1.default.unlinkSync(imagePath);
                logger_1.logger.log(`[deleteTourImage] Bilddatei gelöscht: ${imagePath}`);
            }
        }
        // Setze imageUrl auf null
        yield prisma_1.prisma.tour.update({
            where: { id: tourId },
            data: { imageUrl: null }
        });
        res.json({
            success: true,
            message: (0, translations_1.getTourErrorText)(language, 'imageDeleted')
        });
    }
    catch (error) {
        logger_1.logger.error('[deleteTourImage] Fehler:', error);
        const userId = parseInt(req.userId, 10);
        const language = yield (0, translations_1.getUserLanguage)(userId);
        res.status(500).json({
            success: false,
            message: (0, translations_1.getTourErrorText)(language, 'deleteError')
        });
    }
});
exports.deleteTourImage = deleteTourImage;
// PUT /api/tours/:id - Tour aktualisieren
const updateTour = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const language = yield (0, translations_1.getUserLanguage)(userId);
        // Berechtigung prüfen
        const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(userId, parseInt(req.roleId), 'tour_edit', 'write', 'button');
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'noPermissionEdit')
            });
        }
        const { id } = req.params;
        const tourId = parseInt(id, 10);
        if (isNaN(tourId)) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'invalidTourId')
            });
        }
        // Prüfe ob Tour existiert
        const existingTour = yield prisma_1.prisma.tour.findUnique({
            where: { id: tourId }
        });
        if (!existingTour) {
            return res.status(404).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'tourNotFound')
            });
        }
        const { title, description, type, isActive, duration, maxParticipants, minParticipants, price, currency, location, meetingPoint, includes, excludes, requirements, totalCommission, totalCommissionPercent, sellerCommissionPercent, sellerCommissionFixed, externalProviderId, externalBookingUrl, availableFrom, availableTo, recurringSchedule } = req.body;
        // Validierung: maxParticipants >= minParticipants
        if (maxParticipants !== undefined && minParticipants !== undefined && maxParticipants < minParticipants) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'maxParticipantsMin')
            });
        }
        // Validierung: availableFrom <= availableTo
        if (availableFrom && availableTo && new Date(availableFrom) > new Date(availableTo)) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'availableFromTo')
            });
        }
        const updateData = {};
        if (title !== undefined)
            updateData.title = title.trim();
        if (description !== undefined)
            updateData.description = (description === null || description === void 0 ? void 0 : description.trim()) || null;
        if (type !== undefined)
            updateData.type = type;
        if (isActive !== undefined)
            updateData.isActive = isActive;
        if (duration !== undefined)
            updateData.duration = duration || null;
        if (maxParticipants !== undefined)
            updateData.maxParticipants = maxParticipants || null;
        if (minParticipants !== undefined)
            updateData.minParticipants = minParticipants || null;
        if (price !== undefined)
            updateData.price = price ? parseFloat(price) : null;
        if (currency !== undefined)
            updateData.currency = currency;
        if (location !== undefined)
            updateData.location = (location === null || location === void 0 ? void 0 : location.trim()) || null;
        if (meetingPoint !== undefined)
            updateData.meetingPoint = (meetingPoint === null || meetingPoint === void 0 ? void 0 : meetingPoint.trim()) || null;
        if (includes !== undefined)
            updateData.includes = (includes === null || includes === void 0 ? void 0 : includes.trim()) || null;
        if (excludes !== undefined)
            updateData.excludes = (excludes === null || excludes === void 0 ? void 0 : excludes.trim()) || null;
        if (requirements !== undefined)
            updateData.requirements = (requirements === null || requirements === void 0 ? void 0 : requirements.trim()) || null;
        if (totalCommission !== undefined)
            updateData.totalCommission = totalCommission ? parseFloat(totalCommission) : null;
        if (totalCommissionPercent !== undefined)
            updateData.totalCommissionPercent = totalCommissionPercent ? parseFloat(totalCommissionPercent) : null;
        if (sellerCommissionPercent !== undefined)
            updateData.sellerCommissionPercent = sellerCommissionPercent ? parseFloat(sellerCommissionPercent) : null;
        if (sellerCommissionFixed !== undefined)
            updateData.sellerCommissionFixed = sellerCommissionFixed ? parseFloat(sellerCommissionFixed) : null;
        if (externalProviderId !== undefined)
            updateData.externalProviderId = externalProviderId || null;
        if (externalBookingUrl !== undefined)
            updateData.externalBookingUrl = (externalBookingUrl === null || externalBookingUrl === void 0 ? void 0 : externalBookingUrl.trim()) || null;
        if (availableFrom !== undefined)
            updateData.availableFrom = availableFrom ? new Date(availableFrom) : null;
        if (availableTo !== undefined)
            updateData.availableTo = availableTo ? new Date(availableTo) : null;
        if (recurringSchedule !== undefined)
            updateData.recurringSchedule = recurringSchedule || null;
        const tour = yield prisma_1.prisma.tour.update({
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
    }
    catch (error) {
        logger_1.logger.error('[updateTour] Fehler:', error);
        const userId = parseInt(req.userId, 10);
        const language = yield (0, translations_1.getUserLanguage)(userId);
        res.status(500).json({
            success: false,
            message: (0, translations_1.getTourErrorText)(language, 'updateError')
        });
    }
});
exports.updateTour = updateTour;
// PUT /api/tours/:id/toggle-active - Tour aktiv/inaktiv setzen (Soft Delete)
const toggleTourActive = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const language = yield (0, translations_1.getUserLanguage)(userId);
        // Berechtigung prüfen
        const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(userId, parseInt(req.roleId), 'tour_delete', 'write', 'button');
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'noPermissionDelete')
            });
        }
        const { id } = req.params;
        const tourId = parseInt(id, 10);
        const { isActive } = req.body;
        if (isNaN(tourId)) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'invalidTourId')
            });
        }
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'isActiveMustBeBoolean')
            });
        }
        const tour = yield prisma_1.prisma.tour.update({
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
    }
    catch (error) {
        logger_1.logger.error('[toggleTourActive] Fehler:', error);
        const userId = parseInt(req.userId, 10);
        const language = yield (0, translations_1.getUserLanguage)(userId);
        res.status(500).json({
            success: false,
            message: (0, translations_1.getTourErrorText)(language, 'updateError')
        });
    }
});
exports.toggleTourActive = toggleTourActive;
// GET /api/tours/:id/bookings - Buchungen einer Tour
const getTourBookings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId || '0', 10);
        const language = userId > 0 ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
        const { id } = req.params;
        const tourId = parseInt(id, 10);
        if (isNaN(tourId)) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'invalidTourId')
            });
        }
        const status = req.query.status;
        const paymentStatus = req.query.paymentStatus;
        const bookedById = req.query.bookedById
            ? parseInt(req.query.bookedById, 10)
            : undefined;
        const whereClause = {
            tourId
        };
        if (status) {
            whereClause.status = status;
        }
        if (paymentStatus) {
            whereClause.paymentStatus = paymentStatus;
        }
        if (bookedById) {
            whereClause.bookedById = bookedById;
        }
        const bookings = yield prisma_1.prisma.tourBooking.findMany({
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
    }
    catch (error) {
        logger_1.logger.error('[getTourBookings] Fehler:', error);
        const userId = parseInt(req.userId || '0', 10);
        const language = userId > 0 ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
        res.status(500).json({
            success: false,
            message: (0, translations_1.getTourBookingErrorText)(language, 'loadError')
        });
    }
});
exports.getTourBookings = getTourBookings;
// GET /api/tours/export - Export für Website/Soziale Medien
const exportTours = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const organizationId = req.organizationId;
        const branchId = req.branchId;
        const type = req.query.type;
        const isActive = req.query.isActive !== undefined
            ? req.query.isActive === 'true'
            : true; // Standard: nur aktive
        const fieldsParam = req.query.fields;
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
        const whereClause = {
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
        const tours = yield prisma_1.prisma.tour.findMany({
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
    }
    catch (error) {
        logger_1.logger.error('[exportTours] Fehler:', error);
        const userId = parseInt(req.userId || '0', 10);
        const language = userId > 0 ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
        res.status(500).json({
            success: false,
            message: (0, translations_1.getTourErrorText)(language, 'loadError')
        });
    }
});
exports.exportTours = exportTours;
// POST /api/tours/:id/generate-images - Startet Bildgenerierung
const generateTourImages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const userId = parseInt(req.userId, 10);
        const language = yield (0, translations_1.getUserLanguage)(userId);
        const { id } = req.params;
        const tourId = parseInt(id, 10);
        if (isNaN(tourId)) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'invalidTourId')
            });
        }
        // Berechtigung prüfen
        const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(userId, parseInt(req.roleId), 'tour_edit', 'write', 'button');
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'noPermissionEdit')
            });
        }
        // Prüfe Organization-Isolation
        const organizationId = req.organizationId;
        // Prüfe ob Tour existiert und lade Organisation mit Logo
        const tour = yield prisma_1.prisma.tour.findUnique({
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
                message: (0, translations_1.getTourErrorText)(language, 'tourNotFound')
            });
        }
        if (tour.organizationId !== organizationId) {
            return res.status(403).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'noPermissionForTour')
            });
        }
        // Prüfe ob Queue verfügbar ist
        const queueAvailable = yield (0, queueService_1.checkQueueHealth)();
        const queueEnabled = process.env.QUEUE_ENABLED === 'true';
        // Fallback: Synchroner Modus wenn Queue nicht verfügbar
        if (!queueAvailable || !queueEnabled) {
            logger_1.logger.warn(`[generateTourImages] Queue nicht verfügbar, verwende synchronen Modus für Tour ${tourId}`);
            try {
                // Extrahiere Branding aus Logo (falls vorhanden)
                let branding = undefined;
                if ((_a = tour.organization) === null || _a === void 0 ? void 0 : _a.logo) {
                    try {
                        logger_1.logger.log(`[generateTourImages] Extrahiere Branding aus Logo für Organisation ${tour.organization.displayName}`);
                        branding = yield organizationBrandingService_1.OrganizationBrandingService.extractBrandingFromLogo(tour.organization.logo);
                        logger_1.logger.log(`[generateTourImages] Branding extrahiert:`, {
                            hasColors: !!branding.colors.primary,
                            hasFonts: !!branding.fonts,
                            hasStyle: !!branding.style
                        });
                    }
                    catch (error) {
                        logger_1.logger.warn(`[generateTourImages] Fehler bei Branding-Extraktion, verwende Standard:`, error instanceof Error ? error.message : String(error));
                        // Fehler ist nicht kritisch, verwende Standard-Branding (undefined)
                    }
                }
                else {
                    logger_1.logger.log(`[generateTourImages] Kein Logo vorhanden für Organisation ${((_b = tour.organization) === null || _b === void 0 ? void 0 : _b.displayName) || organizationId}`);
                }
                // Synchroner Modus: Direkt generieren und hochladen
                const generatedImages = yield geminiImageService_1.GeminiImageService.generateTourImages(tour.id, tour.title || '', tour.description || '', process.env.GEMINI_API_KEY, branding, ((_c = tour.organization) === null || _c === void 0 ? void 0 : _c.logo) || undefined);
                // Lade Flyer als Hauptbild hoch (der Flyer ist das Hauptbild)
                if (generatedImages.flyer && fs_1.default.existsSync(generatedImages.flyer)) {
                    yield tourImageUploadService_1.TourImageUploadService.uploadImageDirectly(tourId, generatedImages.flyer);
                    logger_1.logger.log(`[generateTourImages] Flyer als Hauptbild hochgeladen: ${generatedImages.flyer}`);
                }
                // Lade Galerie-Bilder hoch
                for (const galleryImage of generatedImages.galleryImages) {
                    if (fs_1.default.existsSync(galleryImage)) {
                        yield tourImageUploadService_1.TourImageUploadService.uploadGalleryImageDirectly(tourId, galleryImage);
                    }
                }
                // Cleanup temporäre Dateien (Galerie-Bilder, Flyer bleibt als imageUrl)
                cleanupTemporaryFiles(generatedImages);
                return res.json({
                    success: true,
                    mode: 'synchronous',
                    message: (0, translations_1.getTourErrorText)(language, 'imagesGeneratedSuccess')
                });
            }
            catch (error) {
                logger_1.logger.error(`[generateTourImages] Fehler im synchronen Modus:`, error);
                return res.status(500).json({
                    success: false,
                    message: (error instanceof Error ? error.message : undefined) || (0, translations_1.getTourErrorText)(language, 'imageGenerationError')
                });
            }
        }
        // Asynchroner Modus: Job zur Queue hinzufügen
        const queue = (0, queueService_1.getImageGenerationQueue)();
        const job = yield queue.add('generate-tour-images', {
            tourId: tour.id,
            organizationId,
            userId: parseInt(req.userId)
        }, {
            jobId: `tour-${tourId}-${Date.now()}` // Eindeutige Job-ID
        });
        logger_1.logger.log(`[generateTourImages] Job zur Queue hinzugefügt: ${job.id} für Tour ${tourId}`);
        res.json({
            success: true,
            mode: 'asynchronous',
            jobId: job.id,
            message: (0, translations_1.getTourErrorText)(language, 'imageGenerationStarted')
        });
    }
    catch (error) {
        logger_1.logger.error('[generateTourImages] Fehler:', error);
        // Language im catch-Block holen, falls nicht im try-Block definiert
        const userId = parseInt(req.userId, 10);
        const language = yield (0, translations_1.getUserLanguage)(userId);
        res.status(500).json({
            success: false,
            message: (error instanceof Error ? error.message : undefined) || (0, translations_1.getTourErrorText)(language, 'imageGenerationError')
        });
    }
});
exports.generateTourImages = generateTourImages;
// GET /api/tours/:id/generate-images/status - Prüft Status der Bildgenerierung
const getTourImageGenerationStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const language = yield (0, translations_1.getUserLanguage)(userId);
        const { id } = req.params;
        const tourId = parseInt(id, 10);
        if (isNaN(tourId)) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'invalidTourId')
            });
        }
        const jobId = req.query.jobId;
        if (!jobId) {
            return res.status(400).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'jobIdRequired')
            });
        }
        const queue = (0, queueService_1.getImageGenerationQueue)();
        const job = yield queue.getJob(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: (0, translations_1.getTourErrorText)(language, 'jobNotFound')
            });
        }
        const state = yield job.getState();
        const progress = job.progress || 0;
        let status = 'waiting';
        if (state === 'completed') {
            status = 'completed';
        }
        else if (state === 'failed') {
            status = 'failed';
        }
        else if (state === 'active') {
            status = 'active';
        }
        res.json({
            success: true,
            status,
            progress,
            jobId: job.id
        });
    }
    catch (error) {
        logger_1.logger.error('[getTourImageGenerationStatus] Fehler:', error);
        // Language im catch-Block holen, falls nicht im try-Block definiert
        const userId = parseInt(req.userId, 10);
        const language = yield (0, translations_1.getUserLanguage)(userId);
        res.status(500).json({
            success: false,
            message: (error instanceof Error ? error.message : undefined) || (0, translations_1.getTourErrorText)(language, 'statusError')
        });
    }
});
exports.getTourImageGenerationStatus = getTourImageGenerationStatus;
// Hilfsfunktion: Bereinigt temporäre Dateien
function cleanupTemporaryFiles(images) {
    try {
        // Lösche Galerie-Bilder (werden bereits hochgeladen)
        images.galleryImages.forEach((img) => {
            if (fs_1.default.existsSync(img)) {
                fs_1.default.unlinkSync(img);
                logger_1.logger.log(`[cleanupTemporaryFiles] Temporäre Datei gelöscht: ${img}`);
            }
        });
        // Flyer wird NICHT gelöscht, da er bereits als imageUrl hochgeladen wurde
        // Die Datei bleibt im uploads-Verzeichnis und wird von der Tour referenziert
    }
    catch (error) {
        logger_1.logger.error('[cleanupTemporaryFiles] Fehler:', error);
    }
}
//# sourceMappingURL=tourController.js.map