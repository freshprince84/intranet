import { EmailReservationService } from './emailReservationService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
      console.log('[EmailReservationScheduler] Scheduler läuft bereits');
      return;
    }

    console.log('[EmailReservationScheduler] Scheduler gestartet');

    // Prüfe alle 10 Minuten
    const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 Minuten

    this.checkInterval = setInterval(async () => {
      await this.checkAllOrganizations();
    }, CHECK_INTERVAL_MS);

    // Führe sofort einen Check aus beim Start
    this.checkAllOrganizations();

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
      console.log('[EmailReservationScheduler] Scheduler gestoppt');
    }
  }

  /**
   * Prüft alle Organisationen auf neue Reservation-Emails
   */
  private static async checkAllOrganizations(): Promise<void> {
    try {
      console.log('[EmailReservationScheduler] Starte Email-Check für alle Organisationen...');

      // Hole alle Organisationen
      const organizations = await prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          settings: true
        }
      });

      let totalProcessed = 0;

      // Prüfe jede Organisation
      for (const org of organizations) {
        try {
          // Prüfe ob Email-Reading aktiviert ist
          if (!org.settings || typeof org.settings !== 'object') {
            continue;
          }

          const orgSettings = org.settings as any;
          const emailReading = orgSettings.emailReading;

          // ⚠️ WICHTIG: Email-Reading für Organisation 1 (La Familia Hostel) ist STANDARDMÄSSIG aktiviert
          // Das Seed-Script stellt sicher, dass Email-Reading für Organisation 1 immer aktiviert ist
          if (!emailReading || !emailReading.enabled) {
            // Für Organisation 1: Warnung, wenn Email-Reading deaktiviert ist
            if (org.id === 1) {
              console.warn(`[EmailReservationScheduler] ⚠️ Email-Reading für Organisation 1 ist deaktiviert - sollte standardmäßig aktiviert sein!`);
            }
            continue;
          }

          console.log(`[EmailReservationScheduler] Prüfe Organisation ${org.id} (${org.name})...`);

          // Prüfe auf neue Emails
          const processedCount = await EmailReservationService.checkForNewReservationEmails(org.id);
          totalProcessed += processedCount;

          if (processedCount > 0) {
            console.log(`[EmailReservationScheduler] ✅ Organisation ${org.id}: ${processedCount} Reservation(s) erstellt`);
          }
        } catch (error) {
          console.error(`[EmailReservationScheduler] Fehler bei Organisation ${org.id}:`, error);
          // Weiter mit nächster Organisation
        }
      }

      if (totalProcessed > 0) {
        console.log(`[EmailReservationScheduler] ✅ Insgesamt ${totalProcessed} Reservation(s) aus Emails erstellt`);
      } else {
        console.log('[EmailReservationScheduler] Keine neuen Reservation-Emails gefunden');
      }
    } catch (error) {
      console.error('[EmailReservationScheduler] Fehler beim Email-Check:', error);
    }
  }

  /**
   * Führt manuell einen Email-Check für eine bestimmte Organisation aus (für Tests)
   */
  static async triggerManually(organizationId?: number): Promise<number> {
    console.log('[EmailReservationScheduler] Manueller Trigger...');

    if (organizationId) {
      // Prüfe nur eine Organisation
      try {
        const processedCount = await EmailReservationService.checkForNewReservationEmails(organizationId);
        console.log(`[EmailReservationScheduler] Manueller Check für Organisation ${organizationId}: ${processedCount} Reservation(s) erstellt`);
        return processedCount;
      } catch (error) {
        console.error(`[EmailReservationScheduler] Fehler beim manuellen Check für Organisation ${organizationId}:`, error);
        throw error;
      }
    } else {
      // Prüfe alle Organisationen
      await this.checkAllOrganizations();
      return 0; // Anzahl wird in checkAllOrganizations geloggt
    }
  }
}

