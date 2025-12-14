import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { logger } from '../utils/logger';
import { PriceAnalysisService } from './priceAnalysisService';

const prisma = new PrismaClient();

/**
 * Interface für Regel-Bedingungen
 */
interface RuleConditions {
  operator?: 'AND' | 'OR';
  conditions?: RuleConditions[];
  occupancyRate?: { operator: '>' | '<' | '>=' | '<=' | '==' | '!='; value: number };
  dayOfWeek?: number[];
  competitorPriceDiff?: { operator: '>' | '<' | '>=' | '<='; value: number };
  currentPrice?: { operator: '>' | '<' | '>=' | '<='; value: number };
  date?: { operator: 'before' | 'after' | 'between'; value: string | string[] };
}

/**
 * Interface für Regel-Aktion
 */
interface RuleAction {
  type: 'increase' | 'decrease' | 'set';
  value: number;
  maxChange?: number;
  minPrice?: number;
  maxPrice?: number;
  cumulative?: boolean;
}

/**
 * Interface für angewendete Regel
 */
interface AppliedRule {
  ruleId: number;
  ruleName: string;
  action: string;
  value: number;
  priceChange: number;
}

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
   * Prüft, ob eine Regel anwendbar ist
   * 
   * @param rule - Regel
   * @param analysis - Preisanalyse
   * @param currentPrice - Aktueller Preis
   * @returns true wenn Regel anwendbar
   */
  private static evaluateRule(
    rule: any,
    analysis: any,
    currentPrice: number
  ): boolean {
    try {
      const conditions = rule.conditions as RuleConditions;
      
      // Prüfe Scope (roomTypes, categoryIds)
      if (rule.roomTypes) {
        const roomTypes = rule.roomTypes as string[];
        const analysisRoomType = analysis.roomType === 'dorm' ? 'dorm' : 'private';
        if (!roomTypes.includes(analysisRoomType)) {
          return false;
        }
      }

      if (rule.categoryIds) {
        const categoryIds = rule.categoryIds as number[];
        if (analysis.categoryId && !categoryIds.includes(analysis.categoryId)) {
          return false;
        }
      }

      // Prüfe Bedingungen
      return this.evaluateConditions(conditions, analysis, currentPrice);
    } catch (error) {
      logger.error(`Fehler beim Evaluieren der Regel ${rule.id}:`, error);
      return false;
    }
  }

  /**
   * Prüft Bedingungen rekursiv (unterstützt AND/OR)
   * 
   * @param conditions - Bedingungen
   * @param analysis - Preisanalyse
   * @param currentPrice - Aktueller Preis
   * @returns true wenn Bedingungen erfüllt
   */
  private static evaluateConditions(
    conditions: RuleConditions,
    analysis: any,
    currentPrice: number
  ): boolean {
    // Wenn conditions Array vorhanden (AND/OR)
    if (conditions.conditions && Array.isArray(conditions.conditions)) {
      const operator = conditions.operator || 'AND';
      const results = conditions.conditions.map(c => 
        this.evaluateConditions(c, analysis, currentPrice)
      );

      if (operator === 'AND') {
        return results.every(r => r === true);
      } else {
        return results.some(r => r === true);
      }
    }

    // Einzelne Bedingungen prüfen
    if (conditions.occupancyRate) {
      const occupancyRate = Number(analysis.occupancyRate) || 0;
      const { operator, value } = conditions.occupancyRate;
      if (!this.compareValues(occupancyRate, operator, value)) {
        return false;
      }
    }

    if (conditions.dayOfWeek) {
      const dayOfWeek = new Date(analysis.analysisDate).getDay();
      if (!conditions.dayOfWeek.includes(dayOfWeek)) {
        return false;
      }
    }

    if (conditions.competitorPriceDiff) {
      if (!analysis.competitorAvgPrice) {
        return false;
      }
      const competitorPrice = Number(analysis.competitorAvgPrice);
      const priceDiff = ((currentPrice - competitorPrice) / competitorPrice) * 100;
      const { operator, value } = conditions.competitorPriceDiff;
      if (!this.compareValues(priceDiff, operator, value)) {
        return false;
      }
    }

    if (conditions.currentPrice) {
      const { operator, value } = conditions.currentPrice;
      if (!this.compareValues(currentPrice, operator, value)) {
        return false;
      }
    }

    if (conditions.date) {
      const analysisDate = new Date(analysis.analysisDate);
      const { operator, value } = conditions.date;
      
      if (operator === 'before') {
        const beforeDate = new Date(value as string);
        if (analysisDate >= beforeDate) {
          return false;
        }
      } else if (operator === 'after') {
        const afterDate = new Date(value as string);
        if (analysisDate <= afterDate) {
          return false;
        }
      } else if (operator === 'between' && Array.isArray(value)) {
        const startDate = new Date(value[0]);
        const endDate = new Date(value[1]);
        if (analysisDate < startDate || analysisDate > endDate) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Vergleicht zwei Werte mit einem Operator
   */
  private static compareValues(
    actual: number,
    operator: string,
    expected: number
  ): boolean {
    switch (operator) {
      case '>': return actual > expected;
      case '<': return actual < expected;
      case '>=': return actual >= expected;
      case '<=': return actual <= expected;
      case '==': return Math.abs(actual - expected) < 0.01;
      case '!=': return Math.abs(actual - expected) >= 0.01;
      default: return false;
    }
  }

  /**
   * Wendet eine Regel-Aktion an
   * 
   * @param action - Aktion
   * @param currentPrice - Aktueller Preis (kann bereits angepasst sein)
   * @param originalPrice - Ursprünglicher Preis
   * @returns Neuer Preis
   */
  private static applyAction(
    action: RuleAction,
    currentPrice: number,
    originalPrice: number
  ): number {
    const basePrice = action.cumulative ? currentPrice : originalPrice;
    let newPrice: number;

    if (action.type === 'increase') {
      newPrice = basePrice * (1 + action.value / 100);
    } else if (action.type === 'decrease') {
      newPrice = basePrice * (1 - action.value / 100);
    } else if (action.type === 'set') {
      newPrice = action.value;
    } else {
      return currentPrice;
    }

    // Validierung: Max-Änderung
    if (action.maxChange !== undefined) {
      const maxChange = originalPrice * (action.maxChange / 100);
      const actualChange = Math.abs(newPrice - originalPrice);
      if (actualChange > maxChange) {
        if (newPrice > originalPrice) {
          newPrice = originalPrice + maxChange;
        } else {
          newPrice = originalPrice - maxChange;
        }
      }
    }

    // Validierung: Min/Max-Preis
    if (action.minPrice !== undefined && newPrice < action.minPrice) {
      newPrice = action.minPrice;
    }
    if (action.maxPrice !== undefined && newPrice > action.maxPrice) {
      newPrice = action.maxPrice;
    }

    return newPrice;
  }

  /**
   * Generiert Reasoning-Text für eine Empfehlung
   * 
   * @param appliedRules - Angewendete Regeln
   * @param analysis - Preisanalyse
   * @returns Reasoning-Text
   */
  private static generateReasoning(
    appliedRules: AppliedRule[],
    analysis: any
  ): string {
    if (appliedRules.length === 0) {
      return 'Keine Regeln anwendbar';
    }

    const reasons: string[] = [];

    for (const rule of appliedRules) {
      const actionText = rule.action === 'increase' ? 'erhöht' : rule.action === 'decrease' ? 'gesenkt' : 'gesetzt';
      reasons.push(`${rule.ruleName}: Preis um ${rule.value}% ${actionText}`);
    }

    // Zusätzliche Kontext-Informationen
    if (analysis.occupancyRate) {
      reasons.push(`Belegungsrate: ${Number(analysis.occupancyRate).toFixed(1)}%`);
    }
    if (analysis.competitorAvgPrice) {
      const diff = ((Number(analysis.currentPrice) - Number(analysis.competitorAvgPrice)) / Number(analysis.competitorAvgPrice)) * 100;
      reasons.push(`Konkurrenz: ${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`);
    }

    return reasons.join(' | ');
  }
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
        if (!analysis.currentPrice) {
          continue;
        }

        const originalPrice = Number(analysis.currentPrice);
        let currentPrice = originalPrice;
        const appliedRules: AppliedRule[] = [];

        // Wende alle Regeln an (sortiert nach Priorität)
        for (const rule of rules) {
          // Prüfe ob Regel anwendbar ist
          if (this.evaluateRule(rule, analysis, currentPrice)) {
            const action = rule.action as unknown as RuleAction;
            const oldPrice = currentPrice;
            currentPrice = this.applyAction(action, currentPrice, originalPrice);

            // Speichere angewendete Regel
            appliedRules.push({
              ruleId: rule.id,
              ruleName: rule.name,
              action: action.type,
              value: action.value,
              priceChange: currentPrice - oldPrice
            });

            logger.log(`[PriceRecommendation] Regel ${rule.id} (${rule.name}) angewendet: ${oldPrice} → ${currentPrice}`);
          }
        }

        // Wenn sich der Preis geändert hat, erstelle Empfehlung
        if (Math.abs(currentPrice - originalPrice) > 0.01) {
          const priceChange = currentPrice - originalPrice;
          const priceChangePercent = originalPrice > 0 
            ? (priceChange / originalPrice) * 100 
            : 0;

          // Generiere Reasoning
          const reasoning = this.generateReasoning(appliedRules, analysis);

          // Speichere Empfehlung
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
              recommendedPrice: currentPrice,
              currentPrice: analysis.currentPrice,
              priceChange,
              priceChangePercent,
              appliedRules: appliedRules as any,
              reasoning,
              status: 'pending',
              updatedAt: new Date()
            },
            create: {
              branchId,
              analysisId: analysis.id,
              date: analysis.analysisDate,
              categoryId: analysis.categoryId,
              roomType: analysis.roomType,
              recommendedPrice: currentPrice,
              currentPrice: analysis.currentPrice,
              priceChange,
              priceChangePercent,
              appliedRules: appliedRules as any,
              reasoning,
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
   * @param reason - Grund für Ablehnung (optional)
   * @returns Erfolg
   */
  static async rejectRecommendation(
    recommendationId: number,
    reason?: string
  ): Promise<boolean> {
    try {
      await prisma.priceRecommendation.update({
        where: {
          id: recommendationId
        },
        data: {
          status: 'rejected',
          reasoning: reason ? `${reason} (Abgelehnt)` : undefined
        }
      });

      logger.log(`Preisempfehlung ${recommendationId} wurde abgelehnt${reason ? `: ${reason}` : ''}`);

      return true;
    } catch (error) {
      logger.error('Fehler beim Ablehnen der Preisempfehlung:', error);
      throw error;
    }
  }
}

