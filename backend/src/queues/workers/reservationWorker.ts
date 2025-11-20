import { Worker, Job } from 'bullmq';
import { ReservationNotificationService } from '../../services/reservationNotificationService';
import { prisma } from '../../utils/prisma';

/**
 * Job-Daten für Reservation-Verarbeitung
 */
export interface ReservationJobData {
  reservationId: number;
  organizationId: number;
  amount: number;
  currency: string;
  contactType: 'phone' | 'email';
  guestPhone?: string;
  guestEmail?: string;
  guestName: string;
}

/**
 * Erstellt einen Worker für Reservation-Jobs
 * Verarbeitet Payment-Link-Erstellung und WhatsApp-Versand im Hintergrund
 * 
 * @param connection - Redis-Connection für BullMQ
 * @returns Worker-Instanz
 */
export function createReservationWorker(connection: any): Worker {
  return new Worker<ReservationJobData>(
    'reservation',
    async (job: Job<ReservationJobData>) => {
      const {
        reservationId,
        organizationId,
        amount,
        currency,
        contactType,
        guestPhone,
        guestEmail,
        guestName,
      } = job.data;

      console.log(`[Reservation Worker] Starte Verarbeitung für Reservierung ${reservationId} (Job ID: ${job.id})`);

      // Prüfe ob Reservierung existiert
      const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId }
      });

      if (!reservation) {
        throw new Error(`Reservierung ${reservationId} nicht gefunden`);
      }

      // Prüfe ob bereits verarbeitet (Idempotenz)
      if (reservation.sentMessage && reservation.paymentLink) {
        console.log(`[Reservation Worker] Reservierung ${reservationId} wurde bereits verarbeitet, überspringe`);
        return {
          success: true,
          skipped: true,
          paymentLink: reservation.paymentLink,
          messageSent: !!reservation.sentMessage,
        };
      }

      // Verwende neue Service-Methode sendReservationInvitation()
      if (contactType === 'phone' && guestPhone) {
        try {
          const result = await ReservationNotificationService.sendReservationInvitation(
            reservationId,
            {
              guestPhone,
              guestEmail,
              amount,
              currency
            }
          );

          if (result.success) {
            console.log(`[Reservation Worker] ✅ Einladung erfolgreich versendet für Reservierung ${reservationId}`);
          } else {
            console.warn(`[Reservation Worker] ⚠️ Einladung teilweise fehlgeschlagen für Reservierung ${reservationId}: ${result.error}`);
            // Bei teilweisem Fehler: Fehler weiterwerfen, damit BullMQ retried
            throw new Error(result.error || 'Einladung konnte nicht vollständig versendet werden');
          }

          return {
            success: true,
            paymentLink: result.paymentLink,
            messageSent: result.messageSent,
            reservationId,
          };
        } catch (error) {
          console.error(`[Reservation Worker] ❌ Fehler beim Versenden der Einladung:`, error);
          throw error; // Wird von BullMQ automatisch retried
        }
      }

      // Wenn keine Telefonnummer vorhanden, überspringe
      console.log(`[Reservation Worker] Keine Telefonnummer vorhanden, überspringe Einladung`);
      return {
        success: true,
        skipped: true,
        reservationId,
      };
    },
    {
      connection,
      concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5'),
      limiter: {
        max: 10, // Max 10 Jobs pro Sekunde (Rate Limiting für externe APIs)
        duration: 1000,
      },
    }
  );
}

