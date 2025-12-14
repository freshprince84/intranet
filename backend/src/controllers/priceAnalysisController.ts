import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { PriceAnalysisService } from '../services/priceAnalysisService';
import { PriceRecommendationService } from '../services/priceRecommendationService';
import { createNotificationIfEnabled } from './notificationController';
import { NotificationType } from '@prisma/client';
import { getPriceAnalysisNotificationText, getPriceAnalysisErrorText, getUserLanguage } from '../utils/translations';
import { logger } from '../utils/logger';

/**
 * Controller für Preisanalyse
 */
export const priceAnalysisController = {
  /**
   * Führt eine Preisanalyse durch
   * POST /api/price-analysis/analyze
   */
  analyze: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { branchId, startDate, endDate } = req.body;

      if (!branchId || !startDate || !endDate) {
        const userId = req.userId ? parseInt(req.userId, 10) : undefined;
        const language = userId ? await getUserLanguage(userId) : 'de';
        return res.status(400).json({ 
          message: getPriceAnalysisErrorText(language, 'requiredFieldsMissing')
        });
      }

      const analysisCount = await PriceAnalysisService.analyzePrices(
        branchId,
        new Date(startDate),
        new Date(endDate)
      );

      // Notification erstellen
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      if (userId) {
        try {
          const language = await getUserLanguage(userId);
          const notificationText = getPriceAnalysisNotificationText(
            language,
            'analysisCompleted',
            analysisCount
          );
          
          await createNotificationIfEnabled({
            userId,
            title: notificationText.title,
            message: notificationText.message,
            type: NotificationType.system,
            relatedEntityId: branchId,
            relatedEntityType: 'analyzed'
          });
        } catch (error) {
          logger.error('Error creating notification:', error);
        }
      }

      res.json({
        success: true,
        analysisCount
      });
    } catch (error: any) {
      logger.error('Error analyzing prices:', error);
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      const language = userId ? await getUserLanguage(userId) : 'de';
      res.status(500).json({ 
        message: getPriceAnalysisErrorText(language, 'errorAnalyzing'),
        error: error.message 
      });
    }
  },

  /**
   * Ruft Preisanalysen ab
   * GET /api/price-analysis
   */
  getAnalyses: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const branchId = req.query.branchId 
        ? parseInt(req.query.branchId as string, 10) 
        : undefined;
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

      const analyses = await PriceAnalysisService.getAnalyses(
        branchId,
        startDate,
        endDate
      );

      res.json(analyses);
    } catch (error: any) {
      logger.error('Error fetching price analyses:', error);
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      const language = userId ? await getUserLanguage(userId) : 'de';
      res.status(500).json({ 
        message: getPriceAnalysisErrorText(language, 'errorFetchingAnalyses'),
        error: error.message 
      });
    }
  },

  /**
   * Ruft eine einzelne Preisanalyse ab
   * GET /api/price-analysis/:id
   */
  getAnalysisById: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const analysisId = parseInt(req.params.id, 10);

      if (isNaN(analysisId)) {
        const userId = req.userId ? parseInt(req.userId, 10) : undefined;
        const language = userId ? await getUserLanguage(userId) : 'de';
        return res.status(400).json({ 
          message: getPriceAnalysisErrorText(language, 'invalidAnalysisId')
        });
      }

      const analysis = await PriceAnalysisService.getAnalysisById(analysisId);

      res.json(analysis);
    } catch (error: any) {
      logger.error('Error fetching price analysis:', error);
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      const language = userId ? await getUserLanguage(userId) : 'de';
      res.status(500).json({ 
        message: getPriceAnalysisErrorText(language, 'errorFetchingAnalysis'),
        error: error.message 
      });
    }
  },

  /**
   * Generiert Preisempfehlungen
   * POST /api/price-analysis/recommendations/generate
   */
  generateRecommendations: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { branchId, startDate, endDate } = req.body;

      if (!branchId || !startDate || !endDate) {
        const userId = req.userId ? parseInt(req.userId, 10) : undefined;
        const language = userId ? await getUserLanguage(userId) : 'de';
        return res.status(400).json({ 
          message: getPriceAnalysisErrorText(language, 'requiredAnalysisFieldsMissing')
        });
      }

      const recommendationCount = await PriceRecommendationService.generateRecommendations(
        branchId,
        new Date(startDate),
        new Date(endDate)
      );

      // Notification erstellen
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      if (userId && recommendationCount > 0) {
        try {
          const language = await getUserLanguage(userId);
          const notificationText = getPriceAnalysisNotificationText(
            language,
            'recommendationsGenerated',
            recommendationCount
          );
          
          await createNotificationIfEnabled({
            userId,
            title: notificationText.title,
            message: notificationText.message,
            type: NotificationType.system,
            relatedEntityId: branchId,
            relatedEntityType: 'generated'
          });
        } catch (error) {
          logger.error('Error creating notification:', error);
        }
      }

      res.json({
        success: true,
        recommendationCount
      });
    } catch (error: any) {
      logger.error('Error generating price recommendations:', error);
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      const language = userId ? await getUserLanguage(userId) : 'de';
      res.status(500).json({ 
        message: getPriceAnalysisErrorText(language, 'errorGeneratingRecommendations'),
        error: error.message 
      });
    }
  }
};

