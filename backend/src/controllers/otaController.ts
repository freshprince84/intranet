import { Request, Response } from 'express';
import { OTARateShoppingService } from '../services/otaRateShoppingService';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  userId?: string;
  roleId?: string;
}

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
    try {
      const { branchId, platform, startDate, endDate } = req.body;

      if (!branchId || !platform || !startDate || !endDate) {
        return res.status(400).json({ 
          message: 'branchId, platform, startDate und endDate sind erforderlich' 
        });
      }

      const jobId = await OTARateShoppingService.runRateShopping(
        branchId,
        platform,
        new Date(startDate),
        new Date(endDate)
      );

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

