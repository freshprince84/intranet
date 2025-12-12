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
const prisma_1 = require("../../utils/prisma");
const logger_1 = require("../../utils/logger");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const form_data_1 = __importDefault(require("form-data"));
const axios_1 = __importDefault(require("axios"));
/**
 * Erstellt einen Worker für Image-Generation-Jobs
 * Verarbeitet Bildgenerierung im Hintergrund
 *
 * @param connection - Redis-Connection für BullMQ
 * @returns Worker-Instanz
 */
function createImageGenerationWorker(connection) {
    return new bullmq_1.Worker('image-generation', (job) => __awaiter(this, void 0, void 0, function* () {
        const { tourId, organizationId, userId } = job.data;
        logger_1.logger.log(`[Image Generation Worker] Starte Bildgenerierung für Tour ${tourId} (Job ID: ${job.id})`);
        let generatedImages = null;
        try {
            // Aktualisiere Job-Status: processing
            yield job.updateProgress(10);
            // Lade Tour-Daten
            const tour = yield prisma_1.prisma.tour.findUnique({
                where: { id: tourId }
            });
            if (!tour) {
                throw new Error(`Tour ${tourId} nicht gefunden`);
            }
            // Prüfe Organization-Isolation
            if (tour.organizationId !== organizationId) {
                throw new Error(`Tour ${tourId} gehört nicht zur Organisation ${organizationId}`);
            }
            yield job.updateProgress(20);
            // Generiere Bilder
            logger_1.logger.log(`[Image Generation Worker] Generiere Bilder für Tour: ${tour.title}`);
            generatedImages = yield geminiImageService_1.GeminiImageService.generateTourImages(tour.id, tour.title, tour.description || '', process.env.GEMINI_API_KEY);
            yield job.updateProgress(60);
            // Lade Hauptbild hoch
            if (generatedImages.mainImage && fs_1.default.existsSync(generatedImages.mainImage)) {
                yield uploadTourImage(tourId, generatedImages.mainImage, 'main');
                logger_1.logger.log(`[Image Generation Worker] Hauptbild hochgeladen: ${generatedImages.mainImage}`);
            }
            yield job.updateProgress(70);
            // Lade Galerie-Bilder hoch
            for (let i = 0; i < generatedImages.galleryImages.length; i++) {
                const galleryImage = generatedImages.galleryImages[i];
                if (fs_1.default.existsSync(galleryImage)) {
                    yield uploadTourGalleryImage(tourId, galleryImage);
                    logger_1.logger.log(`[Image Generation Worker] Galerie-Bild ${i} hochgeladen: ${galleryImage}`);
                }
                yield job.updateProgress(70 + (i + 1) * 5); // 70-85%
            }
            yield job.updateProgress(90);
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
    });
}
/**
 * Lädt ein Bild für eine Tour hoch (Hauptbild)
 */
function uploadTourImage(tourId, imagePath, type) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const formData = new form_data_1.default();
            formData.append('image', fs_1.default.createReadStream(imagePath), {
                filename: path_1.default.basename(imagePath),
                contentType: 'image/png'
            });
            // Verwende interne API (localhost) für Upload
            const apiUrl = process.env.API_URL || 'http://localhost:5000';
            const response = yield axios_1.default.post(`${apiUrl}/api/tours/${tourId}/image`, formData, {
                headers: formData.getHeaders(),
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
            });
            if (!response.data.success) {
                throw new Error(`Upload fehlgeschlagen: ${response.data.message}`);
            }
        }
        catch (error) {
            logger_1.logger.error(`[Image Generation Worker] Fehler beim Upload des Hauptbildes:`, error);
            throw error;
        }
    });
}
/**
 * Lädt ein Galerie-Bild für eine Tour hoch
 */
function uploadTourGalleryImage(tourId, imagePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const formData = new form_data_1.default();
            formData.append('image', fs_1.default.createReadStream(imagePath), {
                filename: path_1.default.basename(imagePath),
                contentType: 'image/png'
            });
            // Verwende interne API (localhost) für Upload
            const apiUrl = process.env.API_URL || 'http://localhost:5000';
            const response = yield axios_1.default.post(`${apiUrl}/api/tours/${tourId}/gallery`, formData, {
                headers: formData.getHeaders(),
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
            });
            if (!response.data.success) {
                throw new Error(`Upload fehlgeschlagen: ${response.data.message}`);
            }
        }
        catch (error) {
            logger_1.logger.error(`[Image Generation Worker] Fehler beim Upload des Galerie-Bildes:`, error);
            throw error;
        }
    });
}
/**
 * Bereinigt temporäre Dateien
 * Wird bei Erfolg UND Fehler aufgerufen
 */
function cleanupTemporaryFiles(images) {
    try {
        // Lösche Hauptbild
        if (images.mainImage && fs_1.default.existsSync(images.mainImage)) {
            fs_1.default.unlinkSync(images.mainImage);
            logger_1.logger.log(`[Image Generation Worker] Temporäre Datei gelöscht: ${images.mainImage}`);
        }
        // Lösche Galerie-Bilder
        images.galleryImages.forEach((img) => {
            if (fs_1.default.existsSync(img)) {
                fs_1.default.unlinkSync(img);
                logger_1.logger.log(`[Image Generation Worker] Temporäre Datei gelöscht: ${img}`);
            }
        });
        // Lösche Flyer
        if (images.flyer && fs_1.default.existsSync(images.flyer)) {
            fs_1.default.unlinkSync(images.flyer);
            logger_1.logger.log(`[Image Generation Worker] Temporäre Datei gelöscht: ${images.flyer}`);
        }
    }
    catch (cleanupError) {
        logger_1.logger.error('[Image Generation Worker] Fehler beim Cleanup temporärer Dateien:', cleanupError);
        // Fehler beim Cleanup ist nicht kritisch, nur loggen
    }
}
//# sourceMappingURL=imageGenerationWorker.js.map