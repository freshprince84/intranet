import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { OTARateShoppingService } from '../services/otaRateShoppingService';
import { createNotificationIfEnabled } from './notificationController';
import { NotificationType } from '@prisma/client';
import { getPriceAnalysisNotificationText, getUserLanguage } from '../utils/translations';
import { logger } from '../utils/logger';

/**
 * Controller für OTA Rate Shopping
 */
export const otaController = {
  /**
   * Ruft OTA-Listings ab
   * GET /api/ota/listings
   */
  getListings: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const branchId = req.query.branchId 
        ? parseInt(req.query.branchId as string, 10) 
        : undefined;

      if (!branchId) {
        return res.status(400).json({ 
          message: 'branchId ist erforderlich' 
        });
      }

      const listings = await OTARateShoppingService.getListings(branchId);

      res.json(listings);
    } catch (error: any) {
      logger.error('Fehler beim Abrufen der OTA-Listings:', error);
      res.status(500).json({ 
        message: 'Fehler beim Abrufen der OTA-Listings',
        error: error.message 
      });
    }
  },

  /**
   * Führt Rate Shopping durch
   * POST /api/ota/rate-shopping
   */
  runRateShopping: async (req: AuthenticatedRequest, res: Response) => {
    logger.warn('[OTA Controller] ⚡ runRateShopping aufgerufen');
    try {
      const { branchId, platform, startDate, endDate } = req.body;
      logger.warn(`[OTA Controller] 📋 Request Body:`, JSON.stringify({ branchId, platform, startDate, endDate }));

      if (!branchId || !platform || !startDate || !endDate) {
        logger.warn('[OTA Controller] ❌ Fehlende Parameter:', JSON.stringify({ branchId, platform, startDate, endDate }));
        return res.status(400).json({ 
          message: 'branchId, platform, startDate und endDate sind erforderlich' 
        });
      }

      logger.warn(`[OTA Controller] 🔄 Rufe OTARateShoppingService.runRateShopping auf...`);
      const jobId = await OTARateShoppingService.runRateShopping(
        branchId,
        platform,
        new Date(startDate),
        new Date(endDate)
      );
      logger.warn(`[OTA Controller] ✅ Job erstellt mit ID: ${jobId}`);

      // Notification erstellen (wird später bei Job-Abschluss aktualisiert)
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      if (userId) {
        try {
          const language = await getUserLanguage(userId);
          const notificationText = getPriceAnalysisNotificationText(
            language,
            'rateShoppingCompleted',
            platform
          );
          
          // Notification wird später bei Job-Abschluss/Fehler aktualisiert
          // Hier nur als Info-Notification
          await createNotificationIfEnabled({
            userId,
            title: 'Rate Shopping gestartet',
            message: `Rate Shopping für ${platform} wurde gestartet.`,
            type: NotificationType.system,
            relatedEntityId: jobId,
            relatedEntityType: 'started'
          });
        } catch (error) {
          logger.error('Fehler beim Erstellen der Notification:', error);
        }
      }

      res.json({
        success: true,
        jobId,
        message: 'Rate Shopping Job wurde erstellt'
      });
    } catch (error: any) {
      logger.error('Fehler beim Erstellen des Rate Shopping Jobs:', error);
      res.status(500).json({ 
        message: 'Fehler beim Erstellen des Rate Shopping Jobs',
        error: error.message 
      });
    }
  }
};

