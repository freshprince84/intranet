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
exports.createImageGenerationWorker = createImageGenerationWorker;
const bullmq_1 = require("bullmq");
const geminiImageService_1 = require("../../services/geminiImageService");
const tourImageUploadService_1 = require("../../services/tourImageUploadService");
const organizationBrandingService_1 = require("../../services/organizationBrandingService");
const prisma_1 = require("../../utils/prisma");
const logger_1 = require("../../utils/logger");
const fs_1 = __importDefault(require("fs"));
/**
 * Erstellt einen Worker für Image-Generation-Jobs
 * Verarbeitet Bildgenerierung im Hintergrund
 *
 * @param connection - Redis-Connection für BullMQ
 * @returns Worker-Instanz
 */
function createImageGenerationWorker(connection) {
    return new bullmq_1.Worker('image-generation', (job) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const { tourId, organizationId, userId } = job.data;
        logger_1.logger.log(`[Image Generation Worker] Starte Bildgenerierung für Tour ${tourId} (Job ID: ${job.id})`);
        let generatedImages = null;
        try {
            // Aktualisiere Job-Status: processing
            yield job.updateProgress(10);
            // Lade Tour-Daten mit Organisation
            const tour = yield prisma_1.prisma.tour.findUnique({
                where: { id: tourId },
                include: {
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
                throw new Error(`Tour ${tourId} nicht gefunden`);
            }
            // Prüfe Organization-Isolation
            if (tour.organizationId !== organizationId) {
                throw new Error(`Tour ${tourId} gehört nicht zur Organisation ${organizationId}`);
            }
            yield job.updateProgress(20);
            // Extrahiere Branding aus Logo (falls vorhanden)
            let branding = undefined;
            if ((_a = tour.organization) === null || _a === void 0 ? void 0 : _a.logo) {
                try {
                    logger_1.logger.log(`[Image Generation Worker] Extrahiere Branding aus Logo für Organisation ${tour.organization.displayName}`);
                    branding = yield organizationBrandingService_1.OrganizationBrandingService.extractBrandingFromLogo(tour.organization.logo);
                    logger_1.logger.log(`[Image Generation Worker] Branding extrahiert:`, {
                        hasColors: !!branding.colors.primary,
                        hasFonts: !!branding.fonts,
                        hasStyle: !!branding.style
                    });
                }
                catch (error) {
                    logger_1.logger.warn(`[Image Generation Worker] Fehler bei Branding-Extraktion, verwende Standard:`, error.message);
                    // Fehler ist nicht kritisch, verwende Standard-Branding (undefined)
                }
            }
            else {
                logger_1.logger.log(`[Image Generation Worker] Kein Logo vorhanden für Organisation ${((_b = tour.organization) === null || _b === void 0 ? void 0 : _b.displayName) || organizationId}`);
            }
            yield job.updateProgress(30);
            // Generiere Bilder
            logger_1.logger.log(`[Image Generation Worker] Generiere Bilder für Tour: ${tour.title}`);
            generatedImages = yield geminiImageService_1.GeminiImageService.generateTourImages(tour.id, tour.title, tour.description || '', process.env.GEMINI_API_KEY, branding, ((_c = tour.organization) === null || _c === void 0 ? void 0 : _c.logo) || undefined);
            yield job.updateProgress(50);
            // Lade Flyer als Hauptbild hoch (direkt, ohne HTTP)
            // WICHTIG: Der Flyer wird als imageUrl gespeichert (ist das Hauptbild)
            if (generatedImages.flyer && fs_1.default.existsSync(generatedImages.flyer)) {
                yield tourImageUploadService_1.TourImageUploadService.uploadImageDirectly(tourId, generatedImages.flyer);
                logger_1.logger.log(`[Image Generation Worker] Flyer als Hauptbild hochgeladen: ${generatedImages.flyer}`);
            }
            yield job.updateProgress(60);
            // Lade Galerie-Bilder hoch (direkt, ohne HTTP)
            for (let i = 0; i < generatedImages.galleryImages.length; i++) {
                const galleryImage = generatedImages.galleryImages[i];
                if (fs_1.default.existsSync(galleryImage)) {
                    yield tourImageUploadService_1.TourImageUploadService.uploadGalleryImageDirectly(tourId, galleryImage);
                    logger_1.logger.log(`[Image Generation Worker] Galerie-Bild ${i} hochgeladen: ${galleryImage}`);
                }
                yield job.updateProgress(60 + (i + 1) * 5); // 60-75%
            }
            yield job.updateProgress(80);
            // ✅ CLEANUP: Temporäre Dateien löschen
            cleanupTemporaryFiles(generatedImages);
            generatedImages = null; // Verhindert doppeltes Cleanup
            yield job.updateProgress(100);
            logger_1.logger.log(`[Image Generation Worker] ✅ Bildgenerierung für Tour ${tourId} erfolgreich abgeschlossen`);
            return {
                success: true,
                tourId,
                message: 'Bilder erfolgreich generiert und hochgeladen'
            };
        }
        catch (error) {
            logger_1.logger.error(`[Image Generation Worker] ❌ Fehler bei Bildgenerierung für Tour ${tourId}:`, error);
            // ✅ CLEANUP: Temporäre Dateien auch bei Fehler löschen
            if (generatedImages) {
                cleanupTemporaryFiles(generatedImages);
            }
            throw error;
        }
    }), {
        connection,
        concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '2'), // 2 Jobs parallel (Bildgenerierung ist CPU-intensiv)
        limiter: {
            max: 2, // Max. 2 Jobs gleichzeitig
            duration: 1000
        }
    });
}
/**
 * Bereinigt temporäre Dateien
 * Wird bei Erfolg UND Fehler aufgerufen
 */
function cleanupTemporaryFiles(images) {
    try {
        // Lösche Galerie-Bilder (werden bereits hochgeladen)
        images.galleryImages.forEach((img) => {
            if (fs_1.default.existsSync(img)) {
                fs_1.default.unlinkSync(img);
                logger_1.logger.log(`[Image Generation Worker] Temporäre Datei gelöscht: ${img}`);
            }
        });
        // Flyer wird NICHT gelöscht, da er bereits als imageUrl hochgeladen wurde
        // Die Datei bleibt im uploads-Verzeichnis und wird von der Tour referenziert
    }
    catch (cleanupError) {
        logger_1.logger.error('[Image Generation Worker] Fehler beim Cleanup temporärer Dateien:', cleanupError);
        // Fehler beim Cleanup ist nicht kritisch, nur loggen
    }
}
//# sourceMappingURL=imageGenerationWorker.js.map