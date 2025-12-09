import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Tour Booking Scheduler
 * 
 * Prüft abgelaufene Tour-Buchungen und storniert sie automatisch,
 * wenn die Zahlungsfrist abgelaufen ist und noch nicht bezahlt wurde.
 */
export class TourBookingScheduler {
  /**
   * Prüft abgelaufene Reservierungen und storniert sie automatisch
   */
  static async checkExpiredBookings(): Promise<void> {
    try {
      const now = new Date();
      
      // Finde abgelaufene Buchungen
      const expiredBookings = await prisma.tourBooking.findMany({
        where: {
          autoCancelEnabled: true,
          paymentDeadline: {
            lt: now // paymentDeadline < jetzt
          },
          paymentStatus: 'pending', // Noch nicht bezahlt
          status: {
            not: 'cancelled' // Noch nicht storniert
          }
        },
        include: {
          tour: {
            select: {
              id: true,
              title: true,
              organizationId: true
            }
          },
          branch: {
            select: {
              id: true
            }
          }
        }
      });
      
      logger.log(`[TourBookingScheduler] Gefunden ${expiredBookings.length} abgelaufene Buchungen`);
      
      for (const booking of expiredBookings) {
        try {
          // Storniere Buchung
          await prisma.tourBooking.update({
            where: { id: booking.id },
            data: {
              status: 'cancelled',
              cancelledBy: 'system',
              cancelledAt: now,
              cancelledReason: 'Automatische Stornierung: Zahlung nicht innerhalb der Frist erhalten'
            }
          });
          
          // Sende WhatsApp-Nachricht an Kunden (falls Telefonnummer vorhanden)
          if (booking.customerPhone && booking.tour) {
            try {
              const { TourWhatsAppService } = await import('./tourWhatsAppService');
              await TourWhatsAppService.sendCancellationToCustomer(
                booking.id,
                booking.tour.organizationId,
                booking.branchId || null,
                'Automatische Stornierung: Zahlung nicht innerhalb der Frist erhalten'
              );
            } catch (whatsappError) {
              logger.error(`[TourBookingScheduler] Fehler beim Senden der WhatsApp-Nachricht für Buchung ${booking.id}:`, whatsappError);
            }
          }
          
          logger.log(`[TourBookingScheduler] ✅ Buchung ${booking.id} automatisch storniert`);
        } catch (error) {
          logger.error(`[TourBookingScheduler] Fehler beim Stornieren der Buchung ${booking.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('[TourBookingScheduler] Fehler:', error);
    }
  }
}

