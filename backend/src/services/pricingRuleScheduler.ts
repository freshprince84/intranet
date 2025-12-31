import { PriceAnalysisService } from './priceAnalysisService';
import { PriceRecommendationService } from './priceRecommendationService';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Scheduler für automatische Preisregel-Ausführung
 * 
 * Führt regelmäßig Preisanalysen durch, generiert Empfehlungen basierend auf aktiven Regeln
 * und wendet diese automatisch an (falls konfiguriert) für die nächsten 3-6 Monate
 */
export class PricingRuleScheduler {
  private static checkInterval: NodeJS.Timeout | null = null;
  public static isRunning = false;

  /**
   * Startet den Scheduler
   * 
   * Prüft alle 6 Stunden auf neue Preisempfehlungen für alle Branches mit aktiven Regeln
   */
  static start(): void {
    if (this.isRunning) {
      logger.log('[PricingRuleScheduler] Scheduler läuft bereits');
      return;
    }

    logger.log('[PricingRuleScheduler] Scheduler gestartet');

    // Prüfe alle 6 Stunden
    const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 Stunden

    // ⚠️ ENTWICKLUNG: Sofortiger Check beim Start deaktiviert (verhindert Fehler bei fehlender Branch-Tabelle)
    // this.checkAllBranches();

    // Dann alle 6 Stunden
    this.checkInterval = setInterval(async () => {
      await this.checkAllBranches();
    }, CHECK_INTERVAL_MS);

    this.isRunning = true;
  }

  /**
   * Stoppt den Scheduler
   */
  static stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      this.isRunning = false;
      logger.log('[PricingRuleScheduler] Scheduler gestoppt');
    }
  }

  /**
   * Prüft alle Branches mit aktiven Preisregeln
   */
  private static async checkAllBranches(): Promise<void> {
    try {
      logger.log('[PricingRuleScheduler] Starte Preisregel-Prüfung für alle Branches');

      // Prüfe ob Branch-Tabelle existiert (P2021 = Tabelle existiert nicht)
      let branches;
      try {
        branches = await prisma.branch.findMany({
        where: {
          pricingRules: {
            some: {
              isActive: true
            }
          }
        },
        select: {
          id: true,
          name: true
        }
      });
      } catch (error: any) {
        // Prisma Fehler P2021 = Tabelle existiert nicht
        if (error?.code === 'P2021') {
          logger.log('[PricingRuleScheduler] Branch-Tabelle existiert nicht in der Datenbank. Überspringe Preisregel-Prüfung.');
          return;
        }
        throw error;
      }

      if (branches.length === 0) {
        logger.log('[PricingRuleScheduler] Keine Branches mit aktiven Preisregeln gefunden');
        return;
      }

      logger.log(`[PricingRuleScheduler] Gefunden: ${branches.length} Branch(es) mit aktiven Regeln`);

      // Für jeden Branch: Führe Preisanalyse und Empfehlungsgenerierung durch
      for (const branch of branches) {
        try {
          logger.log(`[PricingRuleScheduler] Prüfe Branch ${branch.id} (${branch.name})...`);

          // Zeitraum: Nächste 3-6 Monate (180 Tage)
          const startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 180); // 6 Monate
          endDate.setHours(23, 59, 59, 999);

          // 1. Führe Preisanalyse durch
          logger.log(`[PricingRuleScheduler] Branch ${branch.id}: Starte Preisanalyse für Zeitraum ${startDate.toISOString()} - ${endDate.toISOString()}`);
          const analysisCount = await PriceAnalysisService.analyzePrices(
            branch.id,
            startDate,
            endDate
          );
          logger.log(`[PricingRuleScheduler] Branch ${branch.id}: ${analysisCount} Preisanalysen erstellt`);

          // 2. Generiere Empfehlungen basierend auf Regeln
          logger.log(`[PricingRuleScheduler] Branch ${branch.id}: Generiere Preisempfehlungen...`);
          const recommendationCount = await PriceRecommendationService.generateRecommendations(
            branch.id,
            startDate,
            endDate
          );
          logger.log(`[PricingRuleScheduler] Branch ${branch.id}: ${recommendationCount} Preisempfehlungen generiert`);

        } catch (error) {
          logger.error(`[PricingRuleScheduler] Fehler bei Branch ${branch.id}:`, error);
        }
      }

      logger.log('[PricingRuleScheduler] Preisregel-Prüfung für alle Branches abgeschlossen');
    } catch (error) {
      logger.error('[PricingRuleScheduler] Fehler beim Prüfen aller Branches:', error);
    }
  }

  /**
   * Manueller Trigger für einen spezifischen Branch
   * 
   * @param branchId - Branch-ID
   */
  static async triggerManually(branchId: number): Promise<void> {
    logger.log(`[PricingRuleScheduler] Manueller Trigger für Branch ${branchId}...`);

    try {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true, name: true }
      });

      if (!branch) {
        throw new Error(`Branch ${branchId} nicht gefunden`);
      }

      // Zeitraum: Nächste 3-6 Monate (180 Tage)
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 180);
      endDate.setHours(23, 59, 59, 999);

      // 1. Führe Preisanalyse durch
      const analysisCount = await PriceAnalysisService.analyzePrices(
        branch.id,
        startDate,
        endDate
      );
      logger.log(`[PricingRuleScheduler] Branch ${branch.id}: ${analysisCount} Preisanalysen erstellt`);

      // 2. Generiere Empfehlungen
      const recommendationCount = await PriceRecommendationService.generateRecommendations(
        branch.id,
        startDate,
        endDate
      );
      logger.log(`[PricingRuleScheduler] Branch ${branch.id}: ${recommendationCount} Preisempfehlungen generiert`);

    } catch (error) {
      logger.error(`[PricingRuleScheduler] Fehler beim manuellen Trigger für Branch ${branchId}:`, error);
      throw error;
    }
  }
}

