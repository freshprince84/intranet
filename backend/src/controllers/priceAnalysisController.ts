import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { PriceAnalysisService } from '../services/priceAnalysisService';
import { PriceRecommendationService } from '../services/priceRecommendationService';
import { createNotificationIfEnabled } from './notificationController';
import { NotificationType } from '@prisma/client';
import { getPriceAnalysisNotificationText, getUserLanguage } from '../utils/translations';
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
        return res.status(400).json({ 
          message: 'branchId, startDate und endDate sind erforderlich' 
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
            'recommendationCreated',
            'Alle Kategorien',
            new Date(startDate).toISOString().split('T')[0]
          );
          
          await createNotificationIfEnabled({
            userId,
            title: notificationText.title,
            message: `Preisanalyse für ${analysisCount} Kategorien abgeschlossen.`,
            type: NotificationType.system,
            relatedEntityId: branchId,
            relatedEntityType: 'analyzed'
          });
        } catch (error) {
          logger.error('Fehler beim Erstellen der Notification:', error);
        }
      }

      res.json({
        success: true,
        analysisCount
      });
    } catch (error: any) {
      logger.error('Fehler bei der Preisanalyse:', error);
      res.status(500).json({ 
        message: 'Fehler bei der Preisanalyse',
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
        return res.status(400).json({ 
          message: 'branchId ist erforderlich' 
        });
      }

      const analyses = await PriceAnalysisService.getAnalyses(
        branchId,
        startDate,
        endDate
      );

      res.json(analyses);
    } catch (error: any) {
      logger.error('Fehler beim Abrufen der Preisanalysen:', error);
      res.status(500).json({ 
        message: 'Fehler beim Abrufen der Preisanalysen',
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
        return res.status(400).json({ 
          message: 'Ungültige Analyse-ID' 
        });
      }

      const analysis = await PriceAnalysisService.getAnalysisById(analysisId);

      res.json(analysis);
    } catch (error: any) {
      logger.error('Fehler beim Abrufen der Preisanalyse:', error);
      res.status(500).json({ 
        message: 'Fehler beim Abrufen der Preisanalyse',
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
        return res.status(400).json({ 
          message: 'branchId, startDate und endDate sind erforderlich' 
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
            'recommendationCreated',
            'Alle Kategorien',
            new Date(startDate).toISOString().split('T')[0]
          );
          
          await createNotificationIfEnabled({
            userId,
            title: notificationText.title,
            message: `${recommendationCount} Preisvorschläge wurden generiert.`,
            type: NotificationType.system,
            relatedEntityId: branchId,
            relatedEntityType: 'generated'
          });
        } catch (error) {
          logger.error('Fehler beim Erstellen der Notification:', error);
        }
      }

      res.json({
        success: true,
        recommendationCount
      });
    } catch (error: any) {
      logger.error('Fehler bei der Generierung von Preisempfehlungen:', error);
      res.status(500).json({ 
        message: 'Fehler bei der Generierung von Preisempfehlungen',
        error: error.message 
      });
    }
  }
};

