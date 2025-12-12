import { prisma } from '../utils/prisma';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

/**
 * Service für direkten Tour-Bild-Upload (ohne HTTP)
 * Wird vom Worker verwendet, um Bilder direkt hochzuladen
 */
export class TourImageUploadService {
  /**
   * Lädt Hauptbild direkt hoch (ohne HTTP)
   */
  static async uploadImageDirectly(tourId: number, imagePath: string): Promise<void> {
    try {
      // Altes Bild löschen (falls vorhanden)
      const tour = await prisma.tour.findUnique({
        where: { id: tourId },
        select: { imageUrl: true }
      });

      if (tour?.imageUrl) {
        const oldImagePath = path.join(__dirname, '../../uploads/tours', path.basename(tour.imageUrl));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          logger.log(`[TourImageUploadService] Altes Bild gelöscht: ${oldImagePath}`);
        }
      }

      // Kopiere Bild in uploads-Verzeichnis
      const filename = `tour-${tourId}-main-${Date.now()}.png`;
      const destPath = path.join(__dirname, '../../uploads/tours', filename);
      fs.copyFileSync(imagePath, destPath);

      // Aktualisiere Tour
      const imageUrl = `/uploads/tours/${filename}`;
      await prisma.tour.update({
        where: { id: tourId },
        data: { imageUrl }
      });

      logger.log(`[TourImageUploadService] Hauptbild hochgeladen: ${imageUrl}`);
    } catch (error: any) {
      logger.error(`[TourImageUploadService] Fehler beim Upload des Hauptbildes:`, error);
      throw error;
    }
  }

  /**
   * Lädt Galerie-Bild direkt hoch (ohne HTTP)
   */
  static async uploadGalleryImageDirectly(tourId: number, imagePath: string): Promise<void> {
    try {
      // Lade aktuelle Galerie-URLs
      const tour = await prisma.tour.findUnique({
        where: { id: tourId },
        select: { galleryUrls: true }
      });

      const currentUrls = (tour?.galleryUrls as string[]) || [];

      // Kopiere Bild in uploads-Verzeichnis
      const filename = `tour-${tourId}-gallery-${Date.now()}.png`;
      const destPath = path.join(__dirname, '../../uploads/tours', filename);
      fs.copyFileSync(imagePath, destPath);

      // Füge neue URL hinzu
      const newUrl = `/uploads/tours/${filename}`;
      const updatedUrls = [...currentUrls, newUrl];

      // Aktualisiere Tour
      await prisma.tour.update({
        where: { id: tourId },
        data: { galleryUrls: updatedUrls }
      });

      logger.log(`[TourImageUploadService] Galerie-Bild hochgeladen: ${newUrl}`);
    } catch (error: any) {
      logger.error(`[TourImageUploadService] Fehler beim Upload des Galerie-Bildes:`, error);
      throw error;
    }
  }
}

