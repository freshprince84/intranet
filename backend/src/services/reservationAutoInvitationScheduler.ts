import { ReservationNotificationService } from './reservationNotificationService';
import { toZonedTime } from 'date-fns-tz';
import { getTimezoneForCountry } from '../utils/timeUtils';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Scheduler für automatische Reservierungs-Einladungen
 * 
 * Sendet Check-in-Einladungen automatisch 1 Tag vor Check-in-Date um 08:00 Uhr
 * in der Zeitzone der Organisation (nicht Server-Zeit!)
 */
export class ReservationAutoInvitationScheduler {
  private static checkInterval: NodeJS.Timeout | null = null;
  private static lastCheckDate: string = '';

  /**
   * Startet den Scheduler
   * 
   * Prüft alle 10 Minuten, ob es 08:00 Uhr in der Zeitzone der Organisation ist
   */
  static start(): void {
    logger.log('[ReservationAutoInvitationScheduler] Scheduler gestartet');

    // Prüfe alle 10 Minuten
    const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 Minuten

    this.checkInterval = setInterval(async () => {
      try {
        await this.checkAndSendInvitations();
      } catch (error) {
        logger.error('[ReservationAutoInvitationScheduler] Fehler beim Prüfen:', error);
      }
    }, CHECK_INTERVAL_MS);
  }

  /**
   * Stoppt den Scheduler
   */
  static stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.log('[ReservationAutoInvitationScheduler] Scheduler gestoppt');
    }
  }

  /**
   * Prüft alle Organisationen und sendet Einladungen für Reservations mit Check-in morgen
   */
  private static async checkAndSendInvitations(): Promise<void> {
    const now = new Date(); // UTC
    
    // Hole alle Branches mit autoSendReservationInvitation = true
    const branches = await prisma.branch.findMany({
      where: {
        autoSendReservationInvitation: true
      },
      include: {
        organization: {
          select: {
            id: true,
            country: true
          }
        }
      }
    });

    if (branches.length === 0) {
      return; // Keine Branches mit aktiviertem automatischen Versand
    }

    // Gruppiere Branches nach Organisation (für Zeitzone-Prüfung)
    const branchesByOrg = new Map<number, typeof branches>();
    for (const branch of branches) {
      if (!branch.organizationId) continue;
      
      if (!branchesByOrg.has(branch.organizationId)) {
        branchesByOrg.set(branch.organizationId, []);
      }
      branchesByOrg.get(branch.organizationId)!.push(branch);
    }

    // Prüfe für jede Organisation, ob es 08:00 Uhr in ihrer Zeitzone ist
    for (const [organizationId, orgBranches] of branchesByOrg.entries()) {
      const organization = orgBranches[0]?.organization;
      if (!organization?.country) {
        logger.warn(`[ReservationAutoInvitationScheduler] Organisation ${organizationId} hat kein country - überspringe`);
        continue;
      }

      // Bestimme Zeitzone der Organisation
      const timezone = getTimezoneForCountry(organization.country);
      
      // Prüfe aktuelle Zeit in Zeitzone der Organisation
      const nowInTimezone = toZonedTime(now, timezone);
      const currentHour = nowInTimezone.getHours();
      const currentDate = nowInTimezone.toDateString();

      // Prüfe ob es 08:00 Uhr ist (und heute noch nicht gesendet)
      if (currentHour === 8 && this.lastCheckDate !== currentDate) {
        logger.log(`[ReservationAutoInvitationScheduler] Es ist 08:00 Uhr in Zeitzone ${timezone} für Organisation ${organizationId} - starte Versand...`);
        this.lastCheckDate = currentDate;

        try {
          await this.sendInvitationsForTomorrow(orgBranches, organizationId);
          logger.log(`[ReservationAutoInvitationScheduler] Versand abgeschlossen für Organisation ${organizationId}`);
        } catch (error) {
          logger.error(`[ReservationAutoInvitationScheduler] Fehler beim Versand für Organisation ${organizationId}:`, error);
        }
      }
    }
  }

  /**
   * Sendet Einladungen für Reservations mit Check-in morgen
   */
  private static async sendInvitationsForTomorrow(
    branches: Array<{ id: number; organizationId: number | null }>,
    organizationId: number
  ): Promise<void> {
    // Berechne morgen in UTC (für Datenbank-Query)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    logger.log(`[ReservationAutoInvitationScheduler] Suche Reservations mit Check-in morgen (${tomorrow.toISOString()} - ${tomorrowEnd.toISOString()})...`);

    // Hole Reservations mit Check-in morgen UND noch nicht versendet
    const reservations = await prisma.reservation.findMany({
      where: {
        branchId: {
          in: branches.map(b => b.id)
        },
        checkInDate: {
          gte: tomorrow,
          lte: tomorrowEnd
        },
        invitationSentAt: null // Noch nicht versendet
      },
      include: {
        organization: {
          select: {
            id: true,
            country: true
          }
        }
      }
    });

    logger.log(`[ReservationAutoInvitationScheduler] Gefunden: ${reservations.length} Reservations`);

    for (const reservation of reservations) {
      try {
        // Prüfe ob Kontaktdaten vorhanden
        if (!reservation.guestEmail && !reservation.guestPhone) {
          logger.warn(`[ReservationAutoInvitationScheduler] Reservation ${reservation.id} hat keine Kontaktdaten - überspringe`);
          continue;
        }

        logger.log(`[ReservationAutoInvitationScheduler] Versende Einladung für Reservation ${reservation.id}...`);

        // Versende Einladung (je nach verfügbaren Kontaktdaten)
        const options: any = {};
        if (reservation.guestEmail) {
          options.guestEmail = reservation.guestEmail;
        }
        if (reservation.guestPhone) {
          options.guestPhone = reservation.guestPhone;
        }

        const result = await ReservationNotificationService.sendReservationInvitation(
          reservation.id,
          options
        );

        if (result.success) {
          // Markiere als versendet
          await prisma.reservation.update({
            where: { id: reservation.id },
            data: { invitationSentAt: new Date() }
          });
          logger.log(`[ReservationAutoInvitationScheduler] ✅ Einladung versendet für Reservation ${reservation.id}`);
        } else {
          logger.warn(`[ReservationAutoInvitationScheduler] ⚠️ Einladung fehlgeschlagen für Reservation ${reservation.id}: ${result.error}`);
        }
      } catch (error) {
        logger.error(`[ReservationAutoInvitationScheduler] Fehler bei Reservation ${reservation.id}:`, error);
        // Weiter mit nächster Reservation
      }
    }
  }

  /**
   * Führt manuell den Versand aus (für Tests)
   */
  static async triggerManually(): Promise<void> {
    logger.log('[ReservationAutoInvitationScheduler] Manueller Trigger...');
    try {
      await this.checkAndSendInvitations();
      logger.log('[ReservationAutoInvitationScheduler] Manueller Versand erfolgreich');
    } catch (error) {
      logger.error('[ReservationAutoInvitationScheduler] Fehler beim manuellen Versand:', error);
      throw error;
    }
  }
}
