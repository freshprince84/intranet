import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { PriceRecommendationService } from '../services/priceRecommendationService';
import { createNotificationIfEnabled } from './notificationController';
import { NotificationType } from '@prisma/client';
import { getPriceAnalysisNotificationText, getPriceAnalysisErrorText, getUserLanguage } from '../utils/translations';
import { logger } from '../utils/logger';

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
        const userId = req.userId ? parseInt(req.userId, 10) : undefined;
        const language = userId ? await getUserLanguage(userId) : 'de';
        return res.status(400).json({ 
          message: getPriceAnalysisErrorText(language, 'branchIdRequired')
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
      logger.error('Error fetching price recommendations:', error);
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      const language = userId ? await getUserLanguage(userId) : 'de';
      res.status(500).json({ 
        message: getPriceAnalysisErrorText(language, 'errorFetchingRecommendations'),
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
      const language = userId ? await getUserLanguage(userId) : 'de';

      if (isNaN(recommendationId)) {
        return res.status(400).json({ 
          message: getPriceAnalysisErrorText(language, 'invalidRecommendationId')
        });
      }

      if (!userId) {
        return res.status(401).json({ 
          message: getPriceAnalysisErrorText(language, 'notAuthenticated')
        });
      }

      const success = await PriceRecommendationService.applyRecommendation(
        recommendationId,
        userId
      );

      // Notification erstellen
      if (success) {
        try {
          const recommendation = await PriceRecommendationService.getRecommendationById(recommendationId);
          
          const notificationText = getPriceAnalysisNotificationText(
            language,
            'recommendationApplied',
            `Kategorie ${recommendation.categoryId || 'Unbekannt'}`,
            new Date(recommendation.date).toISOString().split('T')[0]
          );
          
          await createNotificationIfEnabled({
            userId,
            title: notificationText.title,
            message: notificationText.message,
            type: NotificationType.system,
            relatedEntityId: recommendationId,
            relatedEntityType: 'applied'
          });
        } catch (error) {
          logger.error('Error creating notification:', error);
        }
      }

      res.json({
        success,
        message: getPriceAnalysisErrorText(language, 'recommendationApplied')
      });
    } catch (error: any) {
      logger.error('Error applying price recommendation:', error);
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      const language = userId ? await getUserLanguage(userId) : 'de';
      res.status(500).json({ 
        message: getPriceAnalysisErrorText(language, 'errorApplyingRecommendation'),
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
      const language = userId ? await getUserLanguage(userId) : 'de';

      if (isNaN(recommendationId)) {
        return res.status(400).json({ 
          message: getPriceAnalysisErrorText(language, 'invalidRecommendationId')
        });
      }

      if (!userId) {
        return res.status(401).json({ 
          message: getPriceAnalysisErrorText(language, 'notAuthenticated')
        });
      }

      const success = await PriceRecommendationService.approveRecommendation(
        recommendationId,
        userId
      );

      res.json({
        success,
        message: getPriceAnalysisErrorText(language, 'recommendationApproved')
      });
    } catch (error: any) {
      logger.error('Error approving price recommendation:', error);
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      const language = userId ? await getUserLanguage(userId) : 'de';
      res.status(500).json({ 
        message: getPriceAnalysisErrorText(language, 'errorApprovingRecommendation'),
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
      const reason = req.body.reason as string | undefined;
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      const language = userId ? await getUserLanguage(userId) : 'de';

      if (isNaN(recommendationId)) {
        return res.status(400).json({ 
          message: getPriceAnalysisErrorText(language, 'invalidRecommendationId')
        });
      }

      const success = await PriceRecommendationService.rejectRecommendation(
        recommendationId,
        reason
      );

      res.json({
        success,
        message: getPriceAnalysisErrorText(language, 'recommendationRejected')
      });
    } catch (error: any) {
      logger.error('Error rejecting price recommendation:', error);
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      const language = userId ? await getUserLanguage(userId) : 'de';
      res.status(500).json({ 
        message: getPriceAnalysisErrorText(language, 'errorRejectingRecommendation'),
        error: error.message 
      });
    }
  }
};

