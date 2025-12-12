import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  userId?: string;
  roleId?: string;
}

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
      logger.error('Fehler beim Abrufen der Preisregeln:', error);
      res.status(500).json({ 
        message: 'Fehler beim Abrufen der Preisregeln',
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

      if (isNaN(ruleId)) {
        return res.status(400).json({ 
          message: 'Ungültige Regel-ID' 
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
          message: 'Preisregel nicht gefunden' 
        });
      }

      res.json(rule);
    } catch (error: any) {
      logger.error('Fehler beim Abrufen der Preisregel:', error);
      res.status(500).json({ 
        message: 'Fehler beim Abrufen der Preisregel',
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

      if (!branchId || !name || !conditions || !action) {
        return res.status(400).json({ 
          message: 'branchId, name, conditions und action sind erforderlich' 
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

      res.status(201).json(rule);
    } catch (error: any) {
      logger.error('Fehler beim Erstellen der Preisregel:', error);
      res.status(500).json({ 
        message: 'Fehler beim Erstellen der Preisregel',
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

      if (isNaN(ruleId)) {
        return res.status(400).json({ 
          message: 'Ungültige Regel-ID' 
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

      res.json(rule);
    } catch (error: any) {
      logger.error('Fehler beim Aktualisieren der Preisregel:', error);
      res.status(500).json({ 
        message: 'Fehler beim Aktualisieren der Preisregel',
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

      if (isNaN(ruleId)) {
        return res.status(400).json({ 
          message: 'Ungültige Regel-ID' 
        });
      }

      await prisma.pricingRule.delete({
        where: {
          id: ruleId
        }
      });

      res.json({
        success: true,
        message: 'Preisregel wurde gelöscht'
      });
    } catch (error: any) {
      logger.error('Fehler beim Löschen der Preisregel:', error);
      res.status(500).json({ 
        message: 'Fehler beim Löschen der Preisregel',
        error: error.message 
      });
    }
  }
};

