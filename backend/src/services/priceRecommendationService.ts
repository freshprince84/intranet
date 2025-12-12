import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { PriceAnalysisService } from './priceAnalysisService';

const prisma = new PrismaClient();

/**
 * Service für Preisempfehlungen
 * 
 * Zuständig für:
 * - Generierung von Preisempfehlungen basierend auf Regeln
 * - Anwendung des Multi-Faktor-Algorithmus
 * - Validierung von Empfehlungen
 */
export class PriceRecommendationService {
  /**
   * Generiert Preisempfehlungen für einen Branch
   * 
   * @param branchId - Branch-ID
   * @param startDate - Startdatum
   * @param endDate - Enddatum
   * @returns Anzahl generierter Empfehlungen
   */
  static async generateRecommendations(
    branchId: number,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      logger.log(`Starte Generierung von Preisempfehlungen für Branch ${branchId}`);

      // Aktive Regeln laden
      const rules = await prisma.pricingRule.findMany({
        where: {
          branchId,
          isActive: true
        },
        orderBy: {
          priority: 'desc'
        }
      });

      if (rules.length === 0) {
        logger.log(`Keine aktiven Regeln für Branch ${branchId} gefunden`);
        return 0;
      }

      // Preisanalysen abrufen
      const analyses = await PriceAnalysisService.getAnalyses(branchId, startDate, endDate);

      let recommendationCount = 0;

      // Für jede Analyse
      for (const analysis of analyses) {
        // TODO: Vollständige Berechnung implementieren
        // - Multi-Faktor-Algorithmus anwenden
        // - Regeln prüfen und anwenden
        // - Validierung durchführen
        // - Empfehlung speichern

        // Placeholder: Einfache Empfehlung erstellen
        if (analysis.currentPrice) {
          const currentPriceNum = Number(analysis.currentPrice);
          const recommendedPrice = currentPriceNum; // TODO: Berechnung implementieren
          const priceChange = recommendedPrice - currentPriceNum;
          const priceChangePercent = currentPriceNum > 0 
            ? (priceChange / currentPriceNum) * 100 
            : 0;

          await prisma.priceRecommendation.upsert({
            where: {
              branchId_date_categoryId_roomType: {
                branchId,
                date: analysis.analysisDate,
                categoryId: analysis.categoryId || 0,
                roomType: analysis.roomType
              }
            },
            update: {
              recommendedPrice,
              currentPrice: analysis.currentPrice,
              priceChange,
              priceChangePercent,
              status: 'pending',
              updatedAt: new Date()
            },
            create: {
              branchId,
              analysisId: analysis.id,
              date: analysis.analysisDate,
              categoryId: analysis.categoryId,
              roomType: analysis.roomType,
              recommendedPrice,
              currentPrice: analysis.currentPrice,
              priceChange,
              priceChangePercent,
              status: 'pending'
            }
          });

          recommendationCount++;
        }
      }

      logger.log(`Preisempfehlungen generiert: ${recommendationCount} Empfehlungen erstellt`);

      return recommendationCount;
    } catch (error) {
      logger.error('Fehler bei der Generierung von Preisempfehlungen:', error);
      throw error;
    }
  }

  /**
   * Ruft eine einzelne Preisempfehlung ab
   * 
   * @param recommendationId - Empfehlungs-ID
   * @returns Preisempfehlung
   */
  static async getRecommendationById(recommendationId: number) {
    try {
      const recommendation = await prisma.priceRecommendation.findUnique({
        where: {
          id: recommendationId
        }
      });

      if (!recommendation) {
        throw new Error(`Preisempfehlung mit ID ${recommendationId} nicht gefunden`);
      }

      return recommendation;
    } catch (error) {
      logger.error('Fehler beim Abrufen der Preisempfehlung:', error);
      throw error;
    }
  }

  /**
   * Ruft Preisempfehlungen für einen Branch ab
   * 
   * @param branchId - Branch-ID
   * @param status - Status-Filter (optional)
   * @param startDate - Startdatum (optional)
   * @param endDate - Enddatum (optional)
   * @returns Array von Preisempfehlungen
   */
  static async getRecommendations(
    branchId: number,
    status?: string,
    startDate?: Date,
    endDate?: Date
  ) {
    try {
      const where: any = {
        branchId
      };

      if (status) {
        where.status = status;
      }

      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = startDate;
        }
        if (endDate) {
          where.date.lte = endDate;
        }
      }

      const recommendations = await prisma.priceRecommendation.findMany({
        where,
        orderBy: {
          date: 'asc'
        }
      });

      return recommendations;
    } catch (error) {
      logger.error('Fehler beim Abrufen der Preisempfehlungen:', error);
      throw error;
    }
  }

  /**
   * Wendet eine Preisempfehlung an
   * 
   * @param recommendationId - Empfehlungs-ID
   * @param userId - User-ID, der die Empfehlung anwendet
   * @returns Erfolg
   */
  static async applyRecommendation(
    recommendationId: number,
    userId: number
  ): Promise<boolean> {
    try {
      const recommendation = await prisma.priceRecommendation.findUnique({
        where: {
          id: recommendationId
        }
      });

      if (!recommendation) {
        throw new Error(`Preisempfehlung mit ID ${recommendationId} nicht gefunden`);
      }

      if (recommendation.status !== 'pending' && recommendation.status !== 'approved') {
        throw new Error(`Preisempfehlung kann nicht angewendet werden. Status: ${recommendation.status}`);
      }

      // TODO: Preis ins LobbyPMS einspielen
      // - LobbyPMSPriceUpdateService verwenden
      // - Preis aktualisieren

      // Status aktualisieren
      await prisma.priceRecommendation.update({
        where: {
          id: recommendationId
        },
        data: {
          status: 'applied',
          appliedAt: new Date(),
          appliedBy: userId
        }
      });

      logger.log(`Preisempfehlung ${recommendationId} wurde angewendet`);

      return true;
    } catch (error) {
      logger.error('Fehler beim Anwenden der Preisempfehlung:', error);
      throw error;
    }
  }

  /**
   * Genehmigt eine Preisempfehlung
   * 
   * @param recommendationId - Empfehlungs-ID
   * @param userId - User-ID, der die Empfehlung genehmigt
   * @returns Erfolg
   */
  static async approveRecommendation(
    recommendationId: number,
    userId: number
  ): Promise<boolean> {
    try {
      await prisma.priceRecommendation.update({
        where: {
          id: recommendationId
        },
        data: {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: userId
        }
      });

      logger.log(`Preisempfehlung ${recommendationId} wurde genehmigt`);

      return true;
    } catch (error) {
      logger.error('Fehler beim Genehmigen der Preisempfehlung:', error);
      throw error;
    }
  }

  /**
   * Lehnt eine Preisempfehlung ab
   * 
   * @param recommendationId - Empfehlungs-ID
   * @returns Erfolg
   */
  static async rejectRecommendation(
    recommendationId: number
  ): Promise<boolean> {
    try {
      await prisma.priceRecommendation.update({
        where: {
          id: recommendationId
        },
        data: {
          status: 'rejected'
        }
      });

      logger.log(`Preisempfehlung ${recommendationId} wurde abgelehnt`);

      return true;
    } catch (error) {
      logger.error('Fehler beim Ablehnen der Preisempfehlung:', error);
      throw error;
    }
  }
}

