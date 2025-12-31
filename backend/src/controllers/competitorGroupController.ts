import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { AIPriceSearchService, CompetitorDiscoveryResult } from '../services/aiPriceSearchService';

/**
 * Controller für CompetitorGroup-Verwaltung
 */
export const competitorGroupController = {
  /**
   * GET /api/competitor-groups
   * Liste aller CompetitorGroups für einen Branch
   */
  async getCompetitorGroups(req: Request, res: Response) {
    try {
      const { branchId } = req.query;

      if (!branchId) {
        return res.status(400).json({ error: 'branchId ist erforderlich' });
      }

      const competitorGroups = await prisma.competitorGroup.findMany({
        where: {
          branchId: Number(branchId),
          isActive: true
        },
        include: {
          competitors: {
            where: { isActive: true },
            orderBy: { name: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(competitorGroups);
    } catch (error) {
      logger.error('[CompetitorGroupController] Fehler beim Abrufen der CompetitorGroups:', error);
      res.status(500).json({ error: 'Fehler beim Abrufen der CompetitorGroups' });
    }
  },

  /**
   * GET /api/competitor-groups/:id
   * Einzelne CompetitorGroup abrufen
   */
  async getCompetitorGroupById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const competitorGroup = await prisma.competitorGroup.findUnique({
        where: { id: Number(id) },
        include: {
          competitors: {
            orderBy: { name: 'asc' }
          }
        }
      });

      if (!competitorGroup) {
        return res.status(404).json({ error: 'CompetitorGroup nicht gefunden' });
      }

      res.json(competitorGroup);
    } catch (error) {
      logger.error('[CompetitorGroupController] Fehler beim Abrufen der CompetitorGroup:', error);
      res.status(500).json({ error: 'Fehler beim Abrufen der CompetitorGroup' });
    }
  },

  /**
   * POST /api/competitor-groups
   * Neue CompetitorGroup erstellen
   */
  async createCompetitorGroup(req: Request, res: Response) {
    try {
      const { branchId, name, description, city, country } = req.body;

      if (!branchId || !name || !city) {
        return res.status(400).json({ error: 'branchId, name und city sind erforderlich' });
      }

      const competitorGroup = await prisma.competitorGroup.create({
        data: {
          branchId: Number(branchId),
          name,
          description,
          city,
          country
        },
        include: {
          competitors: true
        }
      });

      res.status(201).json(competitorGroup);
    } catch (error) {
      logger.error('[CompetitorGroupController] Fehler beim Erstellen der CompetitorGroup:', error);
      res.status(500).json({ error: 'Fehler beim Erstellen der CompetitorGroup' });
    }
  },

  /**
   * PUT /api/competitor-groups/:id
   * CompetitorGroup aktualisieren
   */
  async updateCompetitorGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, city, country, isActive } = req.body;

      const competitorGroup = await prisma.competitorGroup.update({
        where: { id: Number(id) },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(city && { city }),
          ...(country !== undefined && { country }),
          ...(isActive !== undefined && { isActive })
        },
        include: {
          competitors: true
        }
      });

      res.json(competitorGroup);
    } catch (error) {
      logger.error('[CompetitorGroupController] Fehler beim Aktualisieren der CompetitorGroup:', error);
      res.status(500).json({ error: 'Fehler beim Aktualisieren der CompetitorGroup' });
    }
  },

  /**
   * DELETE /api/competitor-groups/:id
   * CompetitorGroup löschen
   */
  async deleteCompetitorGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.competitorGroup.delete({
        where: { id: Number(id) }
      });

      res.json({ message: 'CompetitorGroup gelöscht' });
    } catch (error) {
      logger.error('[CompetitorGroupController] Fehler beim Löschen der CompetitorGroup:', error);
      res.status(500).json({ error: 'Fehler beim Löschen der CompetitorGroup' });
    }
  },

  /**
   * POST /api/branches/:branchId/discover-competitors
   * 🔍 KI-basierte Competitor-Discovery
   */
  async discoverCompetitors(req: Request, res: Response) {
    try {
      const { branchId } = req.params;
      const { roomType, maxCompetitors } = req.body;

      if (!branchId) {
        return res.status(400).json({ error: 'branchId ist erforderlich' });
      }

      if (!roomType || (roomType !== 'private' && roomType !== 'dorm')) {
        return res.status(400).json({ error: 'roomType muss "private" oder "dorm" sein' });
      }

      logger.info(`[CompetitorGroupController] Starte Competitor-Discovery für Branch ${branchId}, RoomType: ${roomType}`);

      // Rufe KI-Service auf
      const competitors = await AIPriceSearchService.discoverCompetitors(
        Number(branchId),
        roomType,
        maxCompetitors || 10
      );

      logger.info(`[CompetitorGroupController] Competitor-Discovery abgeschlossen: ${competitors.length} Competitors gefunden`);

      res.json({
        competitors,
        count: competitors.length
      });
    } catch (error: any) {
      logger.error('[CompetitorGroupController] Fehler bei Competitor-Discovery:', error);
      
      // Detaillierte Fehlerbehandlung
      let errorMessage = 'Fehler bei Competitor-Discovery';
      let statusCode = 500;

      if (error instanceof Error) {
        // OpenAI API-Fehler
        if (error.message.includes('OPENAI_API_KEY')) {
          errorMessage = 'OpenAI API Key nicht konfiguriert';
          statusCode = 500;
        } else if (error.message.includes('Branch') && error.message.includes('nicht gefunden')) {
          errorMessage = `Branch ${req.params.branchId} nicht gefunden`;
          statusCode = 404;
        } else if (error.message.includes('Stadt-Information')) {
          errorMessage = 'Branch hat keine Stadt-Information';
          statusCode = 400;
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'OpenAI API Key ungültig';
          statusCode = 500;
        } else if (error.message.includes('429') || error.message.includes('Rate limit')) {
          errorMessage = 'OpenAI API Rate Limit erreicht. Bitte später erneut versuchen.';
          statusCode = 429;
        } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
          errorMessage = 'OpenAI API Timeout. Bitte später erneut versuchen.';
          statusCode = 504;
        } else {
          errorMessage = error.message || errorMessage;
        }
      }

      // Logge zusätzliche Details für Debugging
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        logger.error('[CompetitorGroupController] OpenAI API Response:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data
        });
      }

      res.status(statusCode).json({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
      });
    }
  },

  /**
   * POST /api/competitor-groups/:id/competitors
   * Competitor zu einer CompetitorGroup hinzufügen
   */
  async addCompetitor(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, searchName, bookingComUrl, hostelworldUrl, otherUrls } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'name ist erforderlich' });
      }

      const competitor = await prisma.competitor.create({
        data: {
          competitorGroupId: Number(id),
          name,
          searchName,
          bookingComUrl,
          hostelworldUrl,
          otherUrls: otherUrls ? JSON.parse(JSON.stringify(otherUrls)) : null
        }
      });

      res.status(201).json(competitor);
    } catch (error) {
      logger.error('[CompetitorGroupController] Fehler beim Hinzufügen des Competitors:', error);
      res.status(500).json({ error: 'Fehler beim Hinzufügen des Competitors' });
    }
  },

  /**
   * PUT /api/competitors/:id
   * Competitor aktualisieren
   */
  async updateCompetitor(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, searchName, bookingComUrl, hostelworldUrl, otherUrls, isActive } = req.body;

      const competitor = await prisma.competitor.update({
        where: { id: Number(id) },
        data: {
          ...(name && { name }),
          ...(searchName !== undefined && { searchName }),
          ...(bookingComUrl !== undefined && { bookingComUrl }),
          ...(hostelworldUrl !== undefined && { hostelworldUrl }),
          ...(otherUrls !== undefined && { otherUrls: otherUrls ? JSON.parse(JSON.stringify(otherUrls)) : null }),
          ...(isActive !== undefined && { isActive })
        }
      });

      res.json(competitor);
    } catch (error) {
      logger.error('[CompetitorGroupController] Fehler beim Aktualisieren des Competitors:', error);
      res.status(500).json({ error: 'Fehler beim Aktualisieren des Competitors' });
    }
  },

  /**
   * DELETE /api/competitors/:id
   * Competitor löschen
   */
  async deleteCompetitor(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.competitor.delete({
        where: { id: Number(id) }
      });

      res.json({ message: 'Competitor gelöscht' });
    } catch (error) {
      logger.error('[CompetitorGroupController] Fehler beim Löschen des Competitors:', error);
      res.status(500).json({ error: 'Fehler beim Löschen des Competitors' });
    }
  },

  /**
   * POST /api/competitor-groups/:id/search-prices
   * Preissuche für eine CompetitorGroup starten
   */
  async searchPrices(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { startDate, endDate, roomType } = req.body;

      if (!startDate || !endDate || !roomType) {
        return res.status(400).json({ error: 'startDate, endDate und roomType sind erforderlich' });
      }

      if (roomType !== 'private' && roomType !== 'dorm') {
        return res.status(400).json({ error: 'roomType muss "private" oder "dorm" sein' });
      }

      logger.info(`[CompetitorGroupController] Starte Preissuche für CompetitorGroup ${id}`);

      // Starte Preissuche asynchron (nicht blockieren)
      AIPriceSearchService.searchPrices(
        Number(id),
        new Date(startDate),
        new Date(endDate),
        roomType
      ).catch(error => {
        logger.error(`[CompetitorGroupController] Fehler bei Preissuche für CompetitorGroup ${id}:`, error);
      });

      res.json({
        message: 'Preissuche gestartet',
        competitorGroupId: Number(id)
      });
    } catch (error) {
      logger.error('[CompetitorGroupController] Fehler beim Starten der Preissuche:', error);
      res.status(500).json({ error: 'Fehler beim Starten der Preissuche' });
    }
  }
};


