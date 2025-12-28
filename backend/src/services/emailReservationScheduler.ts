import { EmailReservationService } from './emailReservationService';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Scheduler für automatische Email-Reservation-Verarbeitung
 * 
 * Prüft regelmäßig auf neue Reservation-Emails und erstellt automatisch Reservationen
 */
export class EmailReservationScheduler {
  private static checkInterval: NodeJS.Timeout | null = null;
  public static isRunning = false;

  /**
   * Startet den Scheduler
   * 
   * Prüft alle 10 Minuten auf neue Emails für alle Organisationen mit aktivierter Email-Reading-Konfiguration
   */
  static start(): void {
    if (this.isRunning) {
      logger.log('[EmailReservationScheduler] Scheduler läuft bereits');
      return;
    }

    logger.log('[EmailReservationScheduler] Scheduler gestartet');

    // Prüfe alle 10 Minuten
    const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 Minuten

    this.checkInterval = setInterval(async () => {
      await this.checkAllBranches();
    }, CHECK_INTERVAL_MS);

    // Führe sofort einen Check aus beim Start
    this.checkAllBranches();

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
      logger.log('[EmailReservationScheduler] Scheduler gestoppt');
    }
  }

  /**
   * Prüft alle Branches auf neue Reservation-Emails
   */
  private static async checkAllBranches(): Promise<void> {
    try {
      logger.log('[EmailReservationScheduler] Starte Email-Check für alle Branches...');

      // Hole alle Branches
      const branches = await prisma.branch.findMany({
        where: {
          organizationId: { not: null }
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      let totalProcessed = 0;

      // Prüfe jede Branch
      for (const branch of branches) {
        try {
          // Prüfe ob Email-Reading aktiviert ist (Branch Settings)
          const { decryptBranchApiSettings } = await import('../utils/encryption');
          let emailReadingEnabled = false;
          
          if (branch.emailSettings) {
            const branchSettings = decryptBranchApiSettings(branch.emailSettings as any);
            const emailSettings = branchSettings?.email || branchSettings;
            emailReadingEnabled = emailSettings?.imap?.enabled === true;
          }
          
          // Fallback: Prüfe Organization Settings
          if (!emailReadingEnabled && branch.organizationId) {
            const organization = await prisma.organization.findUnique({
              where: { id: branch.organizationId },
              select: { settings: true }
            });
            
            if (organization?.settings && typeof organization.settings === 'object') {
              const orgSettings = organization.settings as any;
              const emailReading = orgSettings.emailReading;
              emailReadingEnabled = emailReading?.enabled === true;
            }
          }

          if (!emailReadingEnabled) {
            continue; // Email-Reading für diese Branch deaktiviert
          }

          logger.log(`[EmailReservationScheduler] Prüfe Branch ${branch.id} (${branch.name})...`);

          // Prüfe auf neue Emails für diese Branch
          const processedCount = await EmailReservationService.checkForNewReservationEmailsForBranch(branch.id);
          totalProcessed += processedCount;

          if (processedCount > 0) {
            logger.log(`[EmailReservationScheduler] ✅ Branch ${branch.id}: ${processedCount} Reservation(s) erstellt`);
          }
        } catch (error) {
          logger.error(`[EmailReservationScheduler] Fehler bei Branch ${branch.id}:`, error);
          // Weiter mit nächster Branch
        }
      }

      if (totalProcessed > 0) {
        logger.log(`[EmailReservationScheduler] ✅ Insgesamt ${totalProcessed} Reservation(s) aus Emails erstellt`);
      } else {
        logger.log('[EmailReservationScheduler] Keine neuen Reservation-Emails gefunden');
      }
    } catch (error) {
      logger.error('[EmailReservationScheduler] Fehler beim Email-Check:', error);
    }
  }

  /**
   * Prüft alle Organisationen auf neue Reservation-Emails (Legacy-Methode, wird durch checkAllBranches() ersetzt)
   * @deprecated Verwende checkAllBranches() stattdessen
   */
  private static async checkAllOrganizations(): Promise<void> {
    // Delegiere an checkAllBranches()
    await this.checkAllBranches();
  }

  /**
   * Führt manuell einen Email-Check für eine bestimmte Organisation aus (für Tests)
   */
  static async triggerManually(organizationId?: number): Promise<number> {
    logger.log('[EmailReservationScheduler] Manueller Trigger...');

    if (organizationId) {
      // Prüfe nur eine Organisation
      try {
        const processedCount = await EmailReservationService.checkForNewReservationEmails(organizationId);
        logger.log(`[EmailReservationScheduler] Manueller Check für Organisation ${organizationId}: ${processedCount} Reservation(s) erstellt`);
        return processedCount;
      } catch (error) {
        logger.error(`[EmailReservationScheduler] Fehler beim manuellen Check für Organisation ${organizationId}:`, error);
        throw error;
      }
    } else {
      // Prüfe alle Branches
      await this.checkAllBranches();
      return 0; // Anzahl wird in checkAllBranches geloggt
    }
  }
}

