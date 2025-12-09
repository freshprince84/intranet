import { prisma } from '../utils/prisma';
import { ReservationStatus, PaymentStatus } from '@prisma/client';
import { LobbyPmsService } from './lobbyPmsService';
import { logger } from '../utils/logger';

/**
 * Scheduler für automatische Stornierung von nicht bezahlten Reservierungen
 */
export class ReservationAutoCancelScheduler {
  private static checkInterval: NodeJS.Timeout | null = null;
  private static readonly CHECK_INTERVAL = 5 * 60 * 1000; // Alle 5 Minuten prüfen

  /**
   * Startet den Scheduler
   */
  static start(): void {
    if (this.checkInterval) {
      logger.log('[ReservationAutoCancel] Scheduler läuft bereits');
      return;
    }

    logger.log('[ReservationAutoCancel] Starte Scheduler...');
    
    // Sofortige Prüfung beim Start
    this.checkAndCancelReservations();

    // Regelmäßige Prüfung
    this.checkInterval = setInterval(() => {
      this.checkAndCancelReservations();
    }, this.CHECK_INTERVAL);

    logger.log('[ReservationAutoCancel] Scheduler gestartet (alle 5 Minuten)');
  }

  /**
   * Stoppt den Scheduler
   */
  static stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.log('[ReservationAutoCancel] Scheduler gestoppt');
    }
  }

  /**
   * Prüft und storniert Reservierungen, die nicht bezahlt wurden
   */
  private static async checkAndCancelReservations(): Promise<void> {
    try {
      const now = new Date();

      // Finde Reservierungen, die:
      // 1. Status "confirmed" haben
      // 2. Payment-Status "pending" haben
      // 3. Payment-Deadline überschritten ist
      // 4. Auto-Cancel aktiviert ist
      // 5. Noch nicht storniert wurden
      const expiredReservations = await prisma.reservation.findMany({
        where: {
          status: ReservationStatus.confirmed,
          paymentStatus: PaymentStatus.pending,
          paymentDeadline: {
            lte: now // Deadline überschritten
          },
          autoCancelEnabled: true,
          cancelledAt: null // Noch nicht storniert
        },
        include: {
          branch: {
            select: {
              id: true,
              lobbyPmsSettings: true
            }
          }
        }
      });

      if (expiredReservations.length === 0) {
        return; // Keine abgelaufenen Reservierungen
      }

      logger.log(`[ReservationAutoCancel] ${expiredReservations.length} Reservierungen gefunden, die storniert werden müssen`);

      for (const reservation of expiredReservations) {
        try {
          await this.cancelReservation(reservation);
        } catch (error) {
          logger.error(`[ReservationAutoCancel] Fehler beim Stornieren der Reservierung ${reservation.id}:`, error);
          // Weiter mit nächster Reservierung
        }
      }
    } catch (error) {
      logger.error('[ReservationAutoCancel] Fehler beim Prüfen der Reservierungen:', error);
    }
  }

  /**
   * Storniert eine Reservierung
   */
  private static async cancelReservation(reservation: any): Promise<void> {
    logger.log(`[ReservationAutoCancel] Storniere Reservierung ${reservation.id} (Gast: ${reservation.guestName})`);

    // 1. Storniere in LobbyPMS (falls lobbyReservationId vorhanden)
    if (reservation.lobbyReservationId && reservation.branchId && reservation.branch?.lobbyPmsSettings) {
      try {
        const service = await LobbyPmsService.createForBranch(reservation.branchId);
        await service.updateReservationStatus(
          reservation.lobbyReservationId,
          'cancelled'
        );
        logger.log(`[ReservationAutoCancel] Reservierung ${reservation.id} in LobbyPMS storniert`);
      } catch (error) {
        logger.error(`[ReservationAutoCancel] Fehler beim Stornieren in LobbyPMS:`, error);
        // Weiter mit lokaler Stornierung
      }
    }

    // 2. Aktualisiere lokale Reservierung
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: ReservationStatus.cancelled,
        cancelledAt: new Date(),
        cancelledBy: 'system',
        cancellationReason: 'Zahlung nicht innerhalb der Frist erfolgt'
      }
    });

    logger.log(`[ReservationAutoCancel] Reservierung ${reservation.id} erfolgreich storniert`);

    // 3. Optional: Benachrichtigung an Gast senden (wenn gewünscht)
    // TODO: Implementieren wenn gewünscht
  }
}

