import { Worker, Job } from 'bullmq';
import { BoldPaymentService } from '../../services/boldPaymentService';
import { WhatsAppService } from '../../services/whatsappService';
import { TTLockService } from '../../services/ttlockService';
import { PrismaClient } from '@prisma/client';
import { generateLobbyPmsCheckInLink } from '../../utils/checkInLinkUtils';

const prisma = new PrismaClient();

/**
 * Job-Daten für Guest Contact Update
 */
export interface UpdateGuestContactJobData {
  reservationId: number;
  organizationId: number;
  contact: string;
  contactType: 'phone' | 'email';
  guestPhone?: string;
  guestEmail?: string;
  guestName: string;
}

/**
 * Erstellt einen Worker für Guest Contact Update Jobs
 * Verarbeitet Payment-Link, TTLock Passcode und WhatsApp-Versand im Hintergrund
 * 
 * @param connection - Redis-Connection für BullMQ
 * @returns Worker-Instanz
 */
export function createUpdateGuestContactWorker(connection: any): Worker {
  return new Worker<UpdateGuestContactJobData>(
    'update-guest-contact',
    async (job: Job<UpdateGuestContactJobData>) => {
      const {
        reservationId,
        organizationId,
        contact,
        contactType,
        guestPhone,
        guestEmail,
        guestName,
      } = job.data;

      console.log(`[UpdateGuestContact Worker] Starte Verarbeitung für Reservierung ${reservationId} (Job ID: ${job.id})`);

      // Hole aktuelle Reservierung
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

      let sentMessage: string | null = null;
      let sentMessageAt: Date | null = null;
      let paymentLink: string | null = null;
      let ttlockCode: string | null = null;

      // Nur wenn Telefonnummer vorhanden
      if (contactType === 'phone' && guestPhone) {
        try {
          // Schritt 1: Payment-Link erstellen
          console.log(`[UpdateGuestContact Worker] Erstelle Payment-Link für Reservierung ${reservationId}...`);
          const boldPaymentService = new BoldPaymentService(organizationId);
          // Konvertiere amount von Decimal zu number (Prisma Decimal hat toNumber() Methode)
          let amount: number = 360000; // Default Placeholder
          if (reservation.amount) {
            if (typeof reservation.amount === 'object' && 'toNumber' in reservation.amount) {
              // Prisma Decimal
              amount = (reservation.amount as any).toNumber();
            } else if (typeof reservation.amount === 'number') {
              amount = reservation.amount;
            } else {
              amount = parseFloat(String(reservation.amount));
            }
          }
          paymentLink = await boldPaymentService.createPaymentLink(
            reservation,
            amount,
            reservation.currency || 'COP',
            `Zahlung für Reservierung ${guestName}`
          );

          console.log(`[UpdateGuestContact Worker] ✅ Payment-Link erstellt: ${paymentLink}`);

          // Schritt 2: TTLock Passcode erstellen (wenn konfiguriert)
          try {
            const ttlockService = new TTLockService(organizationId);
            const settings = reservation.organization.settings as any;
            const doorSystemSettings = settings?.doorSystem;

            if (doorSystemSettings?.lockIds && doorSystemSettings.lockIds.length > 0) {
              const lockId = doorSystemSettings.lockIds[0];
              console.log(`[UpdateGuestContact Worker] Erstelle TTLock Passcode für Lock ID: ${lockId}...`);

              ttlockCode = await ttlockService.createTemporaryPasscode(
                lockId,
                reservation.checkInDate,
                reservation.checkOutDate,
                `Guest: ${guestName}`
              );

              console.log(`[UpdateGuestContact Worker] ✅ TTLock Passcode erstellt: ${ttlockCode}`);

              // Speichere TTLock Code in Reservierung
              await prisma.reservation.update({
                where: { id: reservationId },
                data: {
                  doorPin: ttlockCode,
                  doorAppName: 'TTLock',
                  ttlLockId: lockId,
                  ttlLockPassword: ttlockCode,
                },
              });
            }
          } catch (ttlockError) {
            console.error(`[UpdateGuestContact Worker] ❌ Fehler beim Erstellen des TTLock Passcodes:`, ttlockError);
            // Weiter ohne TTLock Code (wie in alter Logik)
          }

          // Schritt 3: WhatsApp-Nachricht senden
          console.log(`[UpdateGuestContact Worker] Sende WhatsApp-Nachricht für Reservierung ${reservationId}...`);
          const checkInDateStr = reservation.checkInDate.toLocaleDateString('es-ES');
          const checkOutDateStr = reservation.checkOutDate.toLocaleDateString('es-ES');

          sentMessage = `Hola ${guestName},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada:
- Entrada: ${checkInDateStr}
- Salida: ${checkOutDateStr}

Por favor, realiza el pago:
${paymentLink}

${ttlockCode ? `Tu código de acceso TTLock:
${ttlockCode}

` : ''}¡Te esperamos!`;

          const whatsappService = new WhatsAppService(organizationId);
          // Basis-Template-Name (wird in sendMessageWithFallback basierend auf Sprache angepasst)
          // Spanisch: reservation_checkin_invitation, Englisch: reservation_checkin_invitation_
          const templateName =
            process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_checkin_invitation';
          // Erstelle LobbyPMS Check-in-Link
          const checkInLink = generateLobbyPmsCheckInLink(reservation);
          const templateParams = [guestName, checkInLink, paymentLink];

          console.log(`[UpdateGuestContact Worker] Template Name (Basis): ${templateName}`);
          console.log(`[UpdateGuestContact Worker] Template Params: ${JSON.stringify(templateParams)}`);

          await whatsappService.sendMessageWithFallback(
            guestPhone,
            sentMessage,
            templateName,
            templateParams
          );

          sentMessageAt = new Date();
          console.log(`[UpdateGuestContact Worker] ✅ WhatsApp-Nachricht erfolgreich versendet`);
        } catch (error) {
          console.error(`[UpdateGuestContact Worker] ❌ Fehler beim Versenden:`, error);
          if (error instanceof Error) {
            console.error(`[UpdateGuestContact Worker] Fehlermeldung: ${error.message}`);
          }
          throw error; // Wird von BullMQ automatisch retried
        }
      }

      // Schritt 4: Reservierung aktualisieren
      try {
        const updateData: any = {
          paymentLink: paymentLink || undefined,
        };

        if (sentMessage) {
          updateData.sentMessage = sentMessage;
          updateData.sentMessageAt = sentMessageAt;
        }

        await prisma.reservation.update({
          where: { id: reservationId },
          data: updateData,
        });

        console.log(`[UpdateGuestContact Worker] ✅ Reservierung ${reservationId} erfolgreich aktualisiert`);
      } catch (error) {
        console.error(`[UpdateGuestContact Worker] ❌ Fehler beim Aktualisieren der Reservierung:`, error);
        throw error;
      }

      return {
        success: true,
        paymentLink,
        sentMessage: !!sentMessage,
        ttlockCode: !!ttlockCode,
        reservationId,
      };
    },
    {
      connection,
      concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5'),
      limiter: {
        max: 10, // Max 10 Jobs pro Sekunde
        duration: 1000,
      },
    }
  );
}

