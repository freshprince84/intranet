import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { createNotificationIfEnabled } from './notificationController';
import { NotificationType } from '@prisma/client';
import { getPriceAnalysisNotificationText, getPriceAnalysisErrorText, getUserLanguage } from '../utils/translations';
import { logger } from '../utils/logger';

/**
 * Controller für Preisregeln
 */
export const pricingRuleController = {
  /**
   * Ruft Preisregeln ab
   * GET /api/pricing-rules
   */
  getRules: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const branchId = req.query.branchId 
        ? parseInt(req.query.branchId as string, 10) 
        : undefined;
      const isActive = req.query.isActive !== undefined 
        ? req.query.isActive === 'true' 
        : undefined;

      const where: any = {};
      if (branchId) {
        where.branchId = branchId;
      }
      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const rules = await prisma.pricingRule.findMany({
        where,
        orderBy: {
          priority: 'desc'
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true
            }
          }
        }
      });

      res.json(rules);
    } catch (error: any) {
      logger.error('Error fetching pricing rules:', error);
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      const language = userId ? await getUserLanguage(userId) : 'de';
      res.status(500).json({ 
        message: getPriceAnalysisErrorText(language, 'errorFetchingRules'),
        error: error.message 
      });
    }
  },

  /**
   * Ruft eine einzelne Preisregel ab
   * GET /api/pricing-rules/:id
   */
  getRuleById: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ruleId = parseInt(req.params.id, 10);
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      const language = userId ? await getUserLanguage(userId) : 'de';

      if (isNaN(ruleId)) {
        return res.status(400).json({ 
          message: getPriceAnalysisErrorText(language, 'invalidRuleId')
        });
      }

      const rule = await prisma.pricingRule.findUnique({
        where: {
          id: ruleId
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true
            }
          }
        }
      });

      if (!rule) {
        return res.status(404).json({ 
          message: getPriceAnalysisErrorText(language, 'ruleNotFound')
        });
      }

      res.json(rule);
    } catch (error: any) {
      logger.error('Error fetching pricing rule:', error);
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      const language = userId ? await getUserLanguage(userId) : 'de';
      res.status(500).json({ 
        message: getPriceAnalysisErrorText(language, 'errorFetchingRule'),
        error: error.message 
      });
    }
  },

  /**
   * Erstellt eine neue Preisregel
   * POST /api/pricing-rules
   */
  createRule: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { branchId, name, description, conditions, action, roomTypes, categoryIds, priority, isActive } = req.body;
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      const language = userId ? await getUserLanguage(userId) : 'de';

      if (!branchId || !name || !conditions || !action) {
        return res.status(400).json({ 
          message: getPriceAnalysisErrorText(language, 'requiredFieldsMissing')
        });
      }

      const rule = await prisma.pricingRule.create({
        data: {
          branchId,
          name,
          description,
          conditions,
          action,
          roomTypes: roomTypes || null,
          categoryIds: categoryIds || null,
          priority: priority || 0,
          isActive: isActive !== undefined ? isActive : true,
          createdBy: userId
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true
            }
          }
        }
      });

      // Notification erstellen
      if (userId) {
        try {
          const notificationText = getPriceAnalysisNotificationText(
            language,
            'ruleCreated',
            rule.name
          );
          
          await createNotificationIfEnabled({
            userId,
            title: notificationText.title,
            message: notificationText.message,
            type: NotificationType.system,
            relatedEntityId: rule.id,
            relatedEntityType: 'created'
          });
        } catch (error) {
          logger.error('Error creating notification:', error);
        }
      }

      res.status(201).json(rule);
    } catch (error: any) {
      logger.error('Error creating pricing rule:', error);
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      const language = userId ? await getUserLanguage(userId) : 'de';
      res.status(500).json({ 
        message: getPriceAnalysisErrorText(language, 'errorCreatingRule'),
        error: error.message 
      });
    }
  },

  /**
   * Aktualisiert eine Preisregel
   * PUT /api/pricing-rules/:id
   */
  updateRule: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ruleId = parseInt(req.params.id, 10);
      const { name, description, conditions, action, roomTypes, categoryIds, priority, isActive } = req.body;
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      const language = userId ? await getUserLanguage(userId) : 'de';

      if (isNaN(ruleId)) {
        return res.status(400).json({ 
          message: getPriceAnalysisErrorText(language, 'invalidRuleId')
        });
      }

      const rule = await prisma.pricingRule.update({
        where: {
          id: ruleId
        },
        data: {
          name,
          description,
          conditions,
          action,
          roomTypes: roomTypes !== undefined ? roomTypes : undefined,
          categoryIds: categoryIds !== undefined ? categoryIds : undefined,
          priority,
          isActive
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true
            }
          }
        }
      });

      // Notification erstellen
      if (userId) {
        try {
          const notificationText = getPriceAnalysisNotificationText(
            language,
            'ruleUpdated',
            rule.name
          );
          
          await createNotificationIfEnabled({
            userId,
            title: notificationText.title,
            message: notificationText.message,
            type: NotificationType.system,
            relatedEntityId: rule.id,
            relatedEntityType: 'updated'
          });
        } catch (error) {
          logger.error('Error creating notification:', error);
        }
      }

      res.json(rule);
    } catch (error: any) {
      logger.error('Error updating pricing rule:', error);
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      const language = userId ? await getUserLanguage(userId) : 'de';
      res.status(500).json({ 
        message: getPriceAnalysisErrorText(language, 'errorUpdatingRule'),
        error: error.message 
      });
    }
  },

  /**
   * Löscht eine Preisregel
   * DELETE /api/pricing-rules/:id
   */
  deleteRule: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ruleId = parseInt(req.params.id, 10);
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      const language = userId ? await getUserLanguage(userId) : 'de';

      if (isNaN(ruleId)) {
        return res.status(400).json({ 
          message: getPriceAnalysisErrorText(language, 'invalidRuleId')
        });
      }

      // Regel vor dem Löschen abrufen für Notification
      const rule = await prisma.pricingRule.findUnique({
        where: {
          id: ruleId
        }
      });

      await prisma.pricingRule.delete({
        where: {
          id: ruleId
        }
      });

      // Notification erstellen
      if (userId && rule) {
        try {
          const notificationText = getPriceAnalysisNotificationText(
            language,
            'ruleDeleted',
            rule.name
          );
          
          await createNotificationIfEnabled({
            userId,
            title: notificationText.title,
            message: notificationText.message,
            type: NotificationType.system,
            relatedEntityId: ruleId,
            relatedEntityType: 'deleted'
          });
        } catch (error) {
          logger.error('Error creating notification:', error);
        }
      }

      res.json({
        success: true,
        message: getPriceAnalysisErrorText(language, 'ruleDeleted')
      });
    } catch (error: any) {
      logger.error('Error deleting pricing rule:', error);
      const userId = req.userId ? parseInt(req.userId, 10) : undefined;
      const language = userId ? await getUserLanguage(userId) : 'de';
      res.status(500).json({ 
        message: getPriceAnalysisErrorText(language, 'errorDeletingRule'),
        error: error.message 
      });
    }
  }
};

