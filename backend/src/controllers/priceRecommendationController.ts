import { Request, Response } from 'express';
import { PriceRecommendationService } from '../services/priceRecommendationService';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  userId?: string;
  roleId?: string;
}

/**
 * Controller für Preisempfehlungen
 */
export const priceRecommendationController = {
  /**
   * Ruft Preisempfehlungen ab
   * GET /api/price-recommendations
   */
  getRecommendations: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const branchId = req.query.branchId 
        ? parseInt(req.query.branchId as string, 10) 
        : undefined;
      const status = req.query.status as string | undefined;
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string) 
        : undefined;
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string) 
        : undefined;

      if (!branchId) {
        return res.status(400).json({ 
          message: 'branchId ist erforderlich' 
        });
      }

      const recommendations = await PriceRecommendationService.getRecommendations(
        branchId,
        status,
        startDate,
        endDate
      );

      res.json(recommendations);
    } catch (error: any) {
      logger.error('Fehler beim Abrufen der Preisempfehlungen:', error);
      res.status(500).json({ 
        message: 'Fehler beim Abrufen der Preisempfehlungen',
        error: error.message 
      });
    }
  },

  /**
   * Wendet eine Preisempfehlung an
   * POST /api/price-recommendations/:id/apply
   */
  applyRecommendation: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const recommendationId = parseInt(req.params.id, 10);
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;

      if (isNaN(recommendationId)) {
        return res.status(400).json({ 
          message: 'Ungültige Empfehlungs-ID' 
        });
      }

      if (!userId) {
        return res.status(401).json({ 
          message: 'Nicht authentifiziert' 
        });
      }

      const success = await PriceRecommendationService.applyRecommendation(
        recommendationId,
        userId
      );

      res.json({
        success,
        message: 'Preisempfehlung wurde angewendet'
      });
    } catch (error: any) {
      logger.error('Fehler beim Anwenden der Preisempfehlung:', error);
      res.status(500).json({ 
        message: 'Fehler beim Anwenden der Preisempfehlung',
        error: error.message 
      });
    }
  },

  /**
   * Genehmigt eine Preisempfehlung
   * POST /api/price-recommendations/:id/approve
   */
  approveRecommendation: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const recommendationId = parseInt(req.params.id, 10);
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;

      if (isNaN(recommendationId)) {
        return res.status(400).json({ 
          message: 'Ungültige Empfehlungs-ID' 
        });
      }

      if (!userId) {
        return res.status(401).json({ 
          message: 'Nicht authentifiziert' 
        });
      }

      const success = await PriceRecommendationService.approveRecommendation(
        recommendationId,
        userId
      );

      res.json({
        success,
        message: 'Preisempfehlung wurde genehmigt'
      });
    } catch (error: any) {
      logger.error('Fehler beim Genehmigen der Preisempfehlung:', error);
      res.status(500).json({ 
        message: 'Fehler beim Genehmigen der Preisempfehlung',
        error: error.message 
      });
    }
  },

  /**
   * Lehnt eine Preisempfehlung ab
   * POST /api/price-recommendations/:id/reject
   */
  rejectRecommendation: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const recommendationId = parseInt(req.params.id, 10);

      if (isNaN(recommendationId)) {
        return res.status(400).json({ 
          message: 'Ungültige Empfehlungs-ID' 
        });
      }

      const success = await PriceRecommendationService.rejectRecommendation(
        recommendationId
      );

      res.json({
        success,
        message: 'Preisempfehlung wurde abgelehnt'
      });
    } catch (error: any) {
      logger.error('Fehler beim Ablehnen der Preisempfehlung:', error);
      res.status(500).json({ 
        message: 'Fehler beim Ablehnen der Preisempfehlung',
        error: error.message 
      });
    }
  }
};

