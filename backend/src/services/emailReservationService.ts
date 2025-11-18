import { PrismaClient, ReservationStatus, PaymentStatus } from '@prisma/client';
import { ParsedReservationEmail } from './emailReservationParser';
import { WhatsAppService } from './whatsappService';
import { BoldPaymentService } from './boldPaymentService';
import { EmailReadingService, EmailMessage } from './emailReadingService';
import { EmailReservationParser } from './emailReservationParser';

const prisma = new PrismaClient();

/**
 * Service für die Erstellung von Reservationen aus Emails
 */
export class EmailReservationService {
  /**
   * Erstellt eine Reservation aus einer geparsten Email
   * 
   * @param parsedEmail - Geparste Email-Daten
   * @param organizationId - Organisation-ID
   * @param emailMessage - Original Email-Message (für Tracking)
   * @returns Erstellte Reservation
   */
  static async createReservationFromEmail(
    parsedEmail: ParsedReservationEmail,
    organizationId: number,
    emailMessage?: EmailMessage
  ) {
    try {
      // Prüfe auf Duplikate (via lobbyReservationId)
      const existingReservation = await prisma.reservation.findUnique({
        where: { lobbyReservationId: parsedEmail.reservationCode }
      });

      if (existingReservation) {
        console.log(`[EmailReservation] Reservation ${parsedEmail.reservationCode} existiert bereits (ID: ${existingReservation.id})`);
        return existingReservation;
      }

      // Erstelle Reservation-Daten
      const reservationData: any = {
        lobbyReservationId: parsedEmail.reservationCode,
        guestName: parsedEmail.guestName.trim(),
        checkInDate: parsedEmail.checkInDate,
        checkOutDate: parsedEmail.checkOutDate,
        status: ReservationStatus.confirmed,
        paymentStatus: PaymentStatus.pending,
        amount: parsedEmail.amount,
        currency: parsedEmail.currency || 'COP',
        organizationId: organizationId
      };

      // Setze Kontaktinformationen
      if (parsedEmail.guestEmail) {
        reservationData.guestEmail = parsedEmail.guestEmail.trim();
      }
      if (parsedEmail.guestPhone) {
        reservationData.guestPhone = parsedEmail.guestPhone.trim();
      }

      // Erstelle Reservation
      let reservation = await prisma.reservation.create({
        data: reservationData,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              displayName: true,
              settings: true
            }
          }
        }
      });

      console.log(`[EmailReservation] Reservation ${reservation.id} erstellt aus Email (Code: ${parsedEmail.reservationCode})`);

      // ⚠️ SICHERHEIT: WhatsApp-Versand beim Erstellen aus Emails ist DEAKTIVIERT
      // Um zu verhindern, dass während Tests Nachrichten an echte Empfänger versendet werden
      // Aktivierung nur nach expliziter Freigabe!
      const EMAIL_RESERVATION_WHATSAPP_ENABLED = process.env.EMAIL_RESERVATION_WHATSAPP_ENABLED === 'true';
      
      if (!EMAIL_RESERVATION_WHATSAPP_ENABLED) {
        console.log(`[EmailReservation] ⚠️ WhatsApp-Versand ist DEAKTIVIERT (Test-Modus)`);
        console.log(`[EmailReservation] Um zu aktivieren: Setze EMAIL_RESERVATION_WHATSAPP_ENABLED=true in .env`);
      }

      // Automatisch WhatsApp-Nachricht senden (wenn Telefonnummer vorhanden UND aktiviert)
      if (EMAIL_RESERVATION_WHATSAPP_ENABLED && reservation.guestPhone) {
        try {
          // Erstelle Zahlungslink
          const boldPaymentService = new BoldPaymentService(reservation.organizationId);
          const paymentLink = await boldPaymentService.createPaymentLink(
            reservation,
            parsedEmail.amount,
            parsedEmail.currency || 'COP',
            `Zahlung für Reservierung ${reservation.guestName}`
          );
          console.log(`[EmailReservation] Payment-Link erstellt: ${paymentLink}`);

          // Erstelle Check-in-Link
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          const checkInLink = `${frontendUrl}/check-in/${reservation.id}`;

          // Erstelle Nachrichtentext
          const sentMessage = `Hola ${reservation.guestName},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada.
Cargos: ${parsedEmail.amount} ${parsedEmail.currency || 'COP'}

Puedes realizar el check-in en línea ahora:
${checkInLink}

Por favor, realiza el pago:
${paymentLink}

¡Te esperamos!`;

          // Sende WhatsApp-Nachricht
          const whatsappService = new WhatsAppService(reservation.organizationId);
          const templateName = process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_checkin_invitation';
          const templateParams = [
            reservation.guestName,
            checkInLink,
            paymentLink
          ];

          const whatsappSuccess = await whatsappService.sendMessageWithFallback(
            reservation.guestPhone,
            sentMessage,
            templateName,
            templateParams
          );

          if (whatsappSuccess) {
            // Speichere versendete Nachricht und Payment Link
            await prisma.reservation.update({
              where: { id: reservation.id },
              data: {
                sentMessage,
                sentMessageAt: new Date(),
                paymentLink,
                status: 'notification_sent' as ReservationStatus
              }
            });

            console.log(`[EmailReservation] ✅ WhatsApp-Nachricht erfolgreich versendet für Reservation ${reservation.id}`);
          } else {
            console.warn(`[EmailReservation] ⚠️ WhatsApp-Nachricht konnte nicht versendet werden für Reservation ${reservation.id}`);
            // Payment Link trotzdem speichern
            if (paymentLink) {
              await prisma.reservation.update({
                where: { id: reservation.id },
                data: { paymentLink }
              });
            }
          }
        } catch (whatsappError) {
          console.error(`[EmailReservation] ❌ Fehler beim Versenden der WhatsApp-Nachricht:`, whatsappError);
          // Fehler nicht weiterwerfen, Reservation wurde bereits erstellt
        }
      } else {
        console.log(`[EmailReservation] Keine Telefonnummer vorhanden, WhatsApp-Nachricht wird nicht versendet`);
      }

      return reservation;
    } catch (error) {
      console.error('[EmailReservation] Fehler beim Erstellen der Reservation:', error);
      throw error;
    }
  }

  /**
   * Verarbeitet eine Email und erstellt ggf. eine Reservation
   * 
   * @param emailMessage - Email-Nachricht
   * @param organizationId - Organisation-ID
   * @returns Erstellte Reservation oder null
   */
  static async processEmail(
    emailMessage: EmailMessage,
    organizationId: number
  ) {
    try {
      // Parse Email (Text bevorzugen, da meist besser strukturiert)
      const parsedEmail = EmailReservationParser.parseReservationEmail(
        emailMessage.text || emailMessage.html || '',
        emailMessage.html
      );

      if (!parsedEmail) {
        console.log(`[EmailReservation] Email ${emailMessage.messageId} konnte nicht als Reservation geparst werden`);
        return null;
      }

      console.log(`[EmailReservation] Email ${emailMessage.messageId} erfolgreich geparst:`, {
        reservationCode: parsedEmail.reservationCode,
        guestName: parsedEmail.guestName,
        checkInDate: parsedEmail.checkInDate,
        checkOutDate: parsedEmail.checkOutDate,
        amount: parsedEmail.amount,
        currency: parsedEmail.currency
      });

      // Erstelle Reservation
      const reservation = await this.createReservationFromEmail(
        parsedEmail,
        organizationId,
        emailMessage
      );

      return reservation;
    } catch (error) {
      console.error(`[EmailReservation] Fehler beim Verarbeiten der Email ${emailMessage.messageId}:`, error);
      throw error;
    }
  }

  /**
   * Prüft auf neue Reservation-Emails und verarbeitet sie
   * 
   * @param organizationId - Organisation-ID
   * @returns Anzahl verarbeiteter Emails
   */
  static async checkForNewReservationEmails(organizationId: number): Promise<number> {
    try {
      // Lade Email-Konfiguration
      const emailConfig = await EmailReadingService.loadConfigFromOrganization(organizationId);
      if (!emailConfig) {
        console.log(`[EmailReservation] Keine Email-Konfiguration für Organisation ${organizationId}`);
        return 0;
      }

      // Lade Filter aus Organisation-Settings
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true }
      });

      const orgSettings = organization?.settings as any;
      const emailReading = orgSettings?.emailReading;
      const filters = emailReading?.filters || {};

      // Verbinde zu Email-Server
      const emailService = new EmailReadingService(emailConfig);
      await emailService.connect();

      try {
        // Hole ungelesene Emails
        const emails = await emailService.fetchUnreadEmails({
          from: filters.from,
          subject: filters.subject
        });

        if (emails.length === 0) {
          console.log(`[EmailReservation] Keine neuen Emails für Organisation ${organizationId}`);
          return 0;
        }

        console.log(`[EmailReservation] ${emails.length} neue Email(s) gefunden für Organisation ${organizationId}`);

        let processedCount = 0;

        // Verarbeite jede Email
        for (const email of emails) {
          try {
            const reservation = await this.processEmail(email, organizationId);

            if (reservation) {
              // Markiere Email als gelesen
              await emailService.markAsRead(email.messageId);

              // Verschiebe Email in Processed-Ordner (falls konfiguriert)
              if (emailConfig.processedFolder) {
                await emailService.moveToFolder(email.messageId, emailConfig.processedFolder);
              }

              processedCount++;
              console.log(`[EmailReservation] ✅ Email ${email.messageId} erfolgreich verarbeitet (Reservation ID: ${reservation.id})`);
            } else {
              console.log(`[EmailReservation] Email ${email.messageId} konnte nicht als Reservation erkannt werden`);
            }
          } catch (error) {
            console.error(`[EmailReservation] Fehler beim Verarbeiten der Email ${email.messageId}:`, error);
            // Weiter mit nächster Email
          }
        }

        console.log(`[EmailReservation] ${processedCount} von ${emails.length} Email(s) erfolgreich verarbeitet`);
        return processedCount;
      } finally {
        // Trenne Verbindung
        emailService.disconnect();
      }
    } catch (error) {
      console.error(`[EmailReservation] Fehler beim Email-Check für Organisation ${organizationId}:`, error);
      throw error;
    }
  }
}

