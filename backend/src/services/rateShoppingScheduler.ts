import { OTARateShoppingService } from './otaRateShoppingService';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Scheduler für automatisches Rate Shopping
 * 
 * Führt täglich um 2:00 Uhr Rate Shopping für alle aktiven Branches durch
 * Sammelt Preise für die nächsten 3 Monate
 */
export class RateShoppingScheduler {
  private static checkInterval: NodeJS.Timeout | null = null;
  public static isRunning = false;

  /**
   * Startet den Scheduler
   * 
   * Prüft täglich um 2:00 Uhr auf neue Preise für alle Branches
   */
  static start(): void {
    if (this.isRunning) {
      logger.log('[RateShoppingScheduler] Scheduler läuft bereits');
      return;
    }

    logger.log('[RateShoppingScheduler] Scheduler gestartet');

    // Prüfe täglich um 2:00 Uhr
    const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 Stunden

    // Berechne Zeit bis zur nächsten 2:00 Uhr
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(2, 0, 0, 0);
    
    // Wenn es bereits nach 2:00 Uhr ist, setze auf morgen
    if (now.getTime() >= nextRun.getTime()) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const msUntilNextRun = nextRun.getTime() - now.getTime();

    logger.log(`[RateShoppingScheduler] Nächster Lauf: ${nextRun.toISOString()} (in ${Math.round(msUntilNextRun / 1000 / 60)} Minuten)`);

    // Warte bis zur nächsten 2:00 Uhr, dann starte Intervall
    setTimeout(() => {
      // Führe sofort einen Check aus
      this.checkAllBranches();

      // Dann alle 24 Stunden
      this.checkInterval = setInterval(async () => {
        await this.checkAllBranches();
      }, CHECK_INTERVAL_MS);
    }, msUntilNextRun);

    this.isRunning = true;
  }

  /**
   * Stoppt den Scheduler
   */
  static stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    logger.log('[RateShoppingScheduler] Scheduler gestoppt');
  }

  /**
   * Prüft alle Branches und startet Rate Shopping
   */
  private static async checkAllBranches(): Promise<void> {
    try {
      logger.log('[RateShoppingScheduler] Starte Rate Shopping für alle Branches');

      // Hole alle Branches
      const branches = await prisma.branch.findMany();

      if (branches.length === 0) {
        logger.log('[RateShoppingScheduler] Keine Branches gefunden');
        return;
      }

      // Berechne Datum für nächste 3 Monate
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);

      // Unterstützte Plattformen
      const platforms = ['booking.com', 'hostelworld.com'];

      // Für jeden Branch
      for (const branch of branches) {
        // Prüfe, ob es aktive Listings für diesen Branch gibt
        const listings = await prisma.oTAListing.findMany({
          where: {
            branchId: branch.id,
            isActive: true
          },
          select: {
            platform: true
          },
          distinct: ['platform']
        });

        if (listings.length === 0) {
          logger.log(`[RateShoppingScheduler] Keine aktiven Listings für Branch ${branch.id} (${branch.name})`);
          continue;
        }

        // Für jede Plattform mit Listings
        for (const listing of listings) {
          try {
            logger.log(`[RateShoppingScheduler] Starte Rate Shopping für Branch ${branch.id} (${branch.name}), Platform: ${listing.platform}`);
            
            await OTARateShoppingService.runRateShopping(
              branch.id,
              listing.platform,
              startDate,
              endDate
            );

            // Rate-Limiting: Warte 5 Sekunden zwischen Branches/Plattformen
            await new Promise(resolve => setTimeout(resolve, 5000));
          } catch (error) {
            logger.error(`[RateShoppingScheduler] Fehler beim Rate Shopping für Branch ${branch.id}, Platform ${listing.platform}:`, error);
          }
        }
      }

      logger.log('[RateShoppingScheduler] Rate Shopping für alle Branches abgeschlossen');
    } catch (error) {
      logger.error('[RateShoppingScheduler] Fehler beim Prüfen aller Branches:', error);
    }
  }
}

