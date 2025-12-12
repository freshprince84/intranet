import { Worker, Job } from 'bullmq';
import { GeminiImageService } from '../../services/geminiImageService';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';

/**
 * Job-Daten für Tour-Bildgenerierung
 */
export interface TourImageGenerationJobData {
  tourId: number;
  organizationId: number;
  userId: number;
}

/**
 * Erstellt einen Worker für Image-Generation-Jobs
 * Verarbeitet Bildgenerierung im Hintergrund
 * 
 * @param connection - Redis-Connection für BullMQ
 * @returns Worker-Instanz
 */
export function createImageGenerationWorker(connection: any): Worker {
  return new Worker<TourImageGenerationJobData>(
    'image-generation',
    async (job: Job<TourImageGenerationJobData>) => {
      const { tourId, organizationId, userId } = job.data;

      logger.log(`[Image Generation Worker] Starte Bildgenerierung für Tour ${tourId} (Job ID: ${job.id})`);

      let generatedImages: { mainImage: string; galleryImages: string[]; flyer: string } | null = null;

      try {
        // Aktualisiere Job-Status: processing
        await job.updateProgress(10);

        // Lade Tour-Daten
        const tour = await prisma.tour.findUnique({
          where: { id: tourId }
        });

        if (!tour) {
          throw new Error(`Tour ${tourId} nicht gefunden`);
        }

        // Prüfe Organization-Isolation
        if (tour.organizationId !== organizationId) {
          throw new Error(`Tour ${tourId} gehört nicht zur Organisation ${organizationId}`);
        }

        await job.updateProgress(20);

        // Generiere Bilder
        logger.log(`[Image Generation Worker] Generiere Bilder für Tour: ${tour.title}`);
        generatedImages = await GeminiImageService.generateTourImages(
          tour.id,
          tour.title,
          tour.description || '',
          process.env.GEMINI_API_KEY
        );

        await job.updateProgress(60);

        // Lade Hauptbild hoch
        if (generatedImages.mainImage && fs.existsSync(generatedImages.mainImage)) {
          await uploadTourImage(tourId, generatedImages.mainImage, 'main');
          logger.log(`[Image Generation Worker] Hauptbild hochgeladen: ${generatedImages.mainImage}`);
        }

        await job.updateProgress(70);

        // Lade Galerie-Bilder hoch
        for (let i = 0; i < generatedImages.galleryImages.length; i++) {
          const galleryImage = generatedImages.galleryImages[i];
          if (fs.existsSync(galleryImage)) {
            await uploadTourGalleryImage(tourId, galleryImage);
            logger.log(`[Image Generation Worker] Galerie-Bild ${i} hochgeladen: ${galleryImage}`);
          }
          await job.updateProgress(70 + (i + 1) * 5); // 70-85%
        }

        await job.updateProgress(90);

        // ✅ CLEANUP: Temporäre Dateien löschen
        cleanupTemporaryFiles(generatedImages);
        generatedImages = null; // Verhindert doppeltes Cleanup

        await job.updateProgress(100);

        logger.log(`[Image Generation Worker] ✅ Bildgenerierung für Tour ${tourId} erfolgreich abgeschlossen`);

        return {
          success: true,
          tourId,
          message: 'Bilder erfolgreich generiert und hochgeladen'
        };
      } catch (error: any) {
        logger.error(`[Image Generation Worker] ❌ Fehler bei Bildgenerierung für Tour ${tourId}:`, error);

        // ✅ CLEANUP: Temporäre Dateien auch bei Fehler löschen
        if (generatedImages) {
          cleanupTemporaryFiles(generatedImages);
        }

        throw error;
      }
    },
    {
      connection,
      concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '2'), // 2 Jobs parallel (Bildgenerierung ist CPU-intensiv)
    }
  );
}

/**
 * Lädt ein Bild für eine Tour hoch (Hauptbild)
 */
async function uploadTourImage(tourId: number, imagePath: string, type: 'main'): Promise<void> {
  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath), {
      filename: path.basename(imagePath),
      contentType: 'image/png'
    });

    // Verwende interne API (localhost) für Upload
    const apiUrl = process.env.API_URL || 'http://localhost:5000';
    const response = await axios.post(
      `${apiUrl}/api/tours/${tourId}/image`,
      formData,
      {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    if (!response.data.success) {
      throw new Error(`Upload fehlgeschlagen: ${response.data.message}`);
    }
  } catch (error: any) {
    logger.error(`[Image Generation Worker] Fehler beim Upload des Hauptbildes:`, error);
    throw error;
  }
}

/**
 * Lädt ein Galerie-Bild für eine Tour hoch
 */
async function uploadTourGalleryImage(tourId: number, imagePath: string): Promise<void> {
  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath), {
      filename: path.basename(imagePath),
      contentType: 'image/png'
    });

    // Verwende interne API (localhost) für Upload
    const apiUrl = process.env.API_URL || 'http://localhost:5000';
    const response = await axios.post(
      `${apiUrl}/api/tours/${tourId}/gallery`,
      formData,
      {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    if (!response.data.success) {
      throw new Error(`Upload fehlgeschlagen: ${response.data.message}`);
    }
  } catch (error: any) {
    logger.error(`[Image Generation Worker] Fehler beim Upload des Galerie-Bildes:`, error);
    throw error;
  }
}

/**
 * Bereinigt temporäre Dateien
 * Wird bei Erfolg UND Fehler aufgerufen
 */
function cleanupTemporaryFiles(images: { mainImage: string; galleryImages: string[]; flyer: string }): void {
  try {
    // Lösche Hauptbild
    if (images.mainImage && fs.existsSync(images.mainImage)) {
      fs.unlinkSync(images.mainImage);
      logger.log(`[Image Generation Worker] Temporäre Datei gelöscht: ${images.mainImage}`);
    }

    // Lösche Galerie-Bilder
    images.galleryImages.forEach((img) => {
      if (fs.existsSync(img)) {
        fs.unlinkSync(img);
        logger.log(`[Image Generation Worker] Temporäre Datei gelöscht: ${img}`);
      }
    });

    // Lösche Flyer
    if (images.flyer && fs.existsSync(images.flyer)) {
      fs.unlinkSync(images.flyer);
      logger.log(`[Image Generation Worker] Temporäre Datei gelöscht: ${images.flyer}`);
    }
  } catch (cleanupError: any) {
    logger.error('[Image Generation Worker] Fehler beim Cleanup temporärer Dateien:', cleanupError);
    // Fehler beim Cleanup ist nicht kritisch, nur loggen
  }
}

