import { Worker, Job } from 'bullmq';
import { BoldPaymentService } from '../../services/boldPaymentService';
import { WhatsAppService } from '../../services/whatsappService';
import { PrismaClient, ReservationStatus } from '@prisma/client';

const prisma = new PrismaClient();

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

      let paymentLink: string | null = null;
      let sentMessage: string | null = null;
      let sentMessageAt: Date | null = null;

      // Prüfe ob Reservierung existiert
      const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              displayName: true,
              settings: true,
            },
          },
        },
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

      // Schritt 1: Payment-Link erstellen (wenn Telefonnummer vorhanden)
      if (contactType === 'phone' && guestPhone) {
        try {
          console.log(`[Reservation Worker] Erstelle Payment-Link für Reservierung ${reservationId}...`);
          const boldPaymentService = new BoldPaymentService(organizationId);
          paymentLink = await boldPaymentService.createPaymentLink(
            reservation,
            amount,
            currency,
            `Zahlung für Reservierung ${guestName}`
          );

          console.log(`[Reservation Worker] ✅ Payment-Link erstellt: ${paymentLink}`);
        } catch (error) {
          console.error(`[Reservation Worker] ❌ Fehler beim Erstellen des Payment-Links:`, error);
          throw error; // Wird von BullMQ automatisch retried
        }
      }

      // Schritt 2: WhatsApp-Nachricht senden (wenn Telefonnummer vorhanden)
      if (contactType === 'phone' && guestPhone && paymentLink) {
        try {
          console.log(`[Reservation Worker] Sende WhatsApp-Nachricht für Reservierung ${reservationId}...`);
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          const checkInLink = `${frontendUrl}/check-in/${reservationId}`;

          sentMessage = `Hola ${guestName},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada.
Cargos: ${amount} ${currency}

Puedes realizar el check-in en línea ahora:
${checkInLink}

Por favor, realiza el pago:
${paymentLink}

¡Te esperamos!`;

          const whatsappService = new WhatsAppService(organizationId);
          const templateName =
            process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_checkin_invitation';
          const templateParams = [guestName, checkInLink, paymentLink];

          console.log(`[Reservation Worker] Template Name: ${templateName}`);
          console.log(`[Reservation Worker] Template Params: ${JSON.stringify(templateParams)}`);

          const whatsappSuccess = await whatsappService.sendMessageWithFallback(
            guestPhone,
            sentMessage,
            templateName,
            templateParams
          );

          if (!whatsappSuccess) {
            throw new Error('WhatsApp-Nachricht konnte nicht versendet werden (sendMessageWithFallback gab false zurück)');
          }

          sentMessageAt = new Date();
          console.log(`[Reservation Worker] ✅ WhatsApp-Nachricht erfolgreich versendet`);
        } catch (error) {
          console.error(`[Reservation Worker] ❌ Fehler beim Versenden der WhatsApp-Nachricht:`, error);
          if (error instanceof Error) {
            console.error(`[Reservation Worker] Fehlermeldung: ${error.message}`);
          }
          throw error; // Wird von BullMQ automatisch retried
        }
      }

      // Schritt 3: Reservierung aktualisieren
      try {
        const updateData: any = {
          paymentLink: paymentLink || undefined,
        };

        if (sentMessage) {
          updateData.sentMessage = sentMessage;
          updateData.sentMessageAt = sentMessageAt;
          updateData.status = 'notification_sent' as ReservationStatus;
        }

        await prisma.reservation.update({
          where: { id: reservationId },
          data: updateData,
        });

        console.log(`[Reservation Worker] ✅ Reservierung ${reservationId} erfolgreich aktualisiert`);
      } catch (error) {
        console.error(`[Reservation Worker] ❌ Fehler beim Aktualisieren der Reservierung:`, error);
        throw error;
      }

      return {
        success: true,
        paymentLink,
        messageSent: !!sentMessage,
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

