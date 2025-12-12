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
exports.TourImageUploadService = void 0;
const prisma_1 = require("../utils/prisma");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
/**
 * Service für direkten Tour-Bild-Upload (ohne HTTP)
 * Wird vom Worker verwendet, um Bilder direkt hochzuladen
 */
class TourImageUploadService {
    /**
     * Lädt Hauptbild direkt hoch (ohne HTTP)
     */
    static uploadImageDirectly(tourId, imagePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Altes Bild löschen (falls vorhanden)
                const tour = yield prisma_1.prisma.tour.findUnique({
                    where: { id: tourId },
                    select: { imageUrl: true }
                });
                if (tour === null || tour === void 0 ? void 0 : tour.imageUrl) {
                    const oldImagePath = path_1.default.join(__dirname, '../../uploads/tours', path_1.default.basename(tour.imageUrl));
                    if (fs_1.default.existsSync(oldImagePath)) {
                        fs_1.default.unlinkSync(oldImagePath);
                        logger_1.logger.log(`[TourImageUploadService] Altes Bild gelöscht: ${oldImagePath}`);
                    }
                }
                // Kopiere Bild in uploads-Verzeichnis
                const filename = `tour-${tourId}-main-${Date.now()}.png`;
                const destPath = path_1.default.join(__dirname, '../../uploads/tours', filename);
                fs_1.default.copyFileSync(imagePath, destPath);
                // Aktualisiere Tour
                const imageUrl = `/uploads/tours/${filename}`;
                yield prisma_1.prisma.tour.update({
                    where: { id: tourId },
                    data: { imageUrl }
                });
                logger_1.logger.log(`[TourImageUploadService] Hauptbild hochgeladen: ${imageUrl}`);
            }
            catch (error) {
                logger_1.logger.error(`[TourImageUploadService] Fehler beim Upload des Hauptbildes:`, error);
                throw error;
            }
        });
    }
    /**
     * Lädt Galerie-Bild direkt hoch (ohne HTTP)
     */
    static uploadGalleryImageDirectly(tourId, imagePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Lade aktuelle Galerie-URLs
                const tour = yield prisma_1.prisma.tour.findUnique({
                    where: { id: tourId },
                    select: { galleryUrls: true }
                });
                const currentUrls = (tour === null || tour === void 0 ? void 0 : tour.galleryUrls) || [];
                // Kopiere Bild in uploads-Verzeichnis
                const filename = `tour-${tourId}-gallery-${Date.now()}.png`;
                const destPath = path_1.default.join(__dirname, '../../uploads/tours', filename);
                fs_1.default.copyFileSync(imagePath, destPath);
                // Füge neue URL hinzu
                const newUrl = `/uploads/tours/${filename}`;
                const updatedUrls = [...currentUrls, newUrl];
                // Aktualisiere Tour
                yield prisma_1.prisma.tour.update({
                    where: { id: tourId },
                    data: { galleryUrls: updatedUrls }
                });
                logger_1.logger.log(`[TourImageUploadService] Galerie-Bild hochgeladen: ${newUrl}`);
            }
            catch (error) {
                logger_1.logger.error(`[TourImageUploadService] Fehler beim Upload des Galerie-Bildes:`, error);
                throw error;
            }
        });
    }
}
exports.TourImageUploadService = TourImageUploadService;
//# sourceMappingURL=tourImageUploadService.js.map