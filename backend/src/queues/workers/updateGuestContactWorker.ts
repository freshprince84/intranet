import { Worker, Job } from 'bullmq';
import { BoldPaymentService } from '../../services/boldPaymentService';
import { WhatsAppService } from '../../services/whatsappService';
import { TTLockService } from '../../services/ttlockService';
import { generateLobbyPmsCheckInLink } from '../../utils/checkInLinkUtils';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';

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

      logger.log(`[UpdateGuestContact Worker] Starte Verarbeitung für Reservierung ${reservationId} (Job ID: ${job.id})`);

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
          branch: {
            select: {
              id: true,
              name: true,
              doorSystemSettings: true,
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
          logger.log(`[UpdateGuestContact Worker] Erstelle Payment-Link für Reservierung ${reservationId}...`);
          const boldPaymentService = reservation.branchId
            ? await BoldPaymentService.createForBranch(reservation.branchId)
            : new BoldPaymentService(organizationId);
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

          logger.log(`[UpdateGuestContact Worker] ✅ Payment-Link erstellt: ${paymentLink}`);

          // Schritt 2: TTLock Passcode erstellen (wenn konfiguriert)
          try {
            const ttlockService = reservation.branchId
              ? await TTLockService.createForBranch(reservation.branchId)
              : new TTLockService(organizationId);
            
            // Lade Settings aus Branch oder Organisation
            const { decryptApiSettings, decryptBranchApiSettings } = await import('../../utils/encryption');
            let doorSystemSettings: any = null;
            
            if (reservation.branchId && reservation.branch?.doorSystemSettings) {
              const branchSettings = decryptBranchApiSettings(reservation.branch.doorSystemSettings as any);
              doorSystemSettings = branchSettings?.doorSystem || branchSettings;
            } else {
              const settings = decryptApiSettings(reservation.organization.settings as any);
              doorSystemSettings = settings?.doorSystem;
            }

            if (doorSystemSettings?.lockIds && doorSystemSettings.lockIds.length > 0) {
              const lockId = doorSystemSettings.lockIds[0];
              logger.log(`[UpdateGuestContact Worker] Erstelle TTLock Passcode für Lock ID: ${lockId}...`);

              ttlockCode = await ttlockService.createTemporaryPasscode(
                lockId,
                reservation.checkInDate,
                reservation.checkOutDate,
                `Guest: ${guestName}`
              );

              logger.log(`[UpdateGuestContact Worker] ✅ TTLock Passcode erstellt: ${ttlockCode}`);

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
            logger.error(`[UpdateGuestContact Worker] ❌ Fehler beim Erstellen des TTLock Passcodes:`, ttlockError);
            // Weiter ohne TTLock Code (wie in alter Logik)
          }

          // Schritt 3: WhatsApp-Nachricht senden
          logger.log(`[UpdateGuestContact Worker] Sende WhatsApp-Nachricht für Reservierung ${reservationId}...`);
          
          // Erstelle Nachrichtentext basierend auf Sprache
          const { CountryLanguageService } = require('../services/countryLanguageService');
          const languageCode = CountryLanguageService.getLanguageForReservation({
            guestNationality: reservation.guestNationality,
            guestPhone: reservation.guestPhone
          });

          // Datum-Formatierung basierend auf Sprache
          const dateLocale = languageCode === 'en' ? 'en-US' : 'es-ES';
          const checkInDateStr = reservation.checkInDate.toLocaleDateString(dateLocale);
          const checkOutDateStr = reservation.checkOutDate.toLocaleDateString(dateLocale);

          // Generiere Nachricht basierend auf Sprache
          if (languageCode === 'en') {
            // Englische Version
            sentMessage = `Hello ${guestName},

Welcome to La Familia Hostel!

Your reservation has been confirmed:
- Check-in: ${checkInDateStr}
- Check-out: ${checkOutDateStr}

Please make the payment:
${paymentLink}

${ttlockCode ? `Your TTLock access code:
${ttlockCode}

` : ''}We look forward to seeing you!`;
          } else {
            // Spanische Version
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
          }

          const whatsappService = reservation.branchId
            ? new WhatsAppService(undefined, reservation.branchId)
            : new WhatsAppService(organizationId);
          // Basis-Template-Name (wird in sendMessageWithFallback basierend auf Sprache angepasst)
          // Spanisch: reservation_checkin_invitation, Englisch: reservation_checkin_invitation_
          const templateName =
            process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_checkin_invitation';
          // WICHTIG: Check-in-Link IMMER mit der ursprünglich importierten E-Mail generieren
          // Die Reservation wurde bereits aktualisiert (mit geänderter E-Mail), daher muss
          // die Original-E-Mail aus der Sync-History geholt werden
          let originalGuestEmail = reservation.guestEmail || '';
          try {
            // Hole erste Sync-History (beim Import erstellt) für Original-E-Mail
            const firstSyncHistory = await prisma.reservationSyncHistory.findFirst({
              where: { reservationId: reservationId },
              orderBy: { syncedAt: 'asc' }
            });
            if (firstSyncHistory?.syncData && typeof firstSyncHistory.syncData === 'object') {
              const syncData = firstSyncHistory.syncData as any;
              // Versuche Original-E-Mail aus syncData zu holen (aus holder.email oder guest_email)
              const originalEmail = syncData.holder?.email || syncData.guest_email || null;
              if (originalEmail) {
                originalGuestEmail = originalEmail;
                logger.log(`[UpdateGuestContact Worker] Verwende Original-E-Mail aus Sync-History: ${originalGuestEmail}`);
              }
            }
          } catch (historyError) {
            logger.warn(`[UpdateGuestContact Worker] ⚠️ Konnte Original-E-Mail aus Sync-History nicht laden, verwende aktuelle:`, historyError);
            // Fallback: Verwende aktuelle E-Mail (könnte bereits geändert sein)
          }
          // Erstelle LobbyPMS Check-in-Link mit Original-E-Mail
          // WICHTIG: Verwende lobbyReservationId (LobbyPMS booking_id) als codigo, nicht die interne ID
          const reservationForCheckInLink = {
            id: reservation.id,
            lobbyReservationId: reservation.lobbyReservationId,
            guestEmail: originalGuestEmail
          };
          const checkInLink = generateLobbyPmsCheckInLink(reservationForCheckInLink);
          const templateParams = [guestName, checkInLink, paymentLink];

          logger.log(`[UpdateGuestContact Worker] Template Name (Basis): ${templateName}`);
          logger.log(`[UpdateGuestContact Worker] Template Params: ${JSON.stringify(templateParams)}`);

          await whatsappService.sendMessageWithFallback(
            guestPhone,
            sentMessage,
            templateName,
            templateParams,
            {
              guestNationality: reservation.guestNationality,
              guestPhone: reservation.guestPhone
            }
          );

          sentMessageAt = new Date();
          logger.log(`[UpdateGuestContact Worker] ✅ WhatsApp-Nachricht erfolgreich versendet`);
        } catch (error) {
          logger.error(`[UpdateGuestContact Worker] ❌ Fehler beim Versenden:`, error);
          if (error instanceof Error) {
            logger.error(`[UpdateGuestContact Worker] Fehlermeldung: ${error.message}`);
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

        logger.log(`[UpdateGuestContact Worker] ✅ Reservierung ${reservationId} erfolgreich aktualisiert`);
      } catch (error) {
        logger.error(`[UpdateGuestContact Worker] ❌ Fehler beim Aktualisieren der Reservierung:`, error);
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

