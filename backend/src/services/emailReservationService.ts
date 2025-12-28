import { ReservationStatus, PaymentStatus } from '@prisma/client';
import { ParsedReservationEmail } from './emailReservationParser';
import { WhatsAppService } from './whatsappService';
import { BoldPaymentService } from './boldPaymentService';
import { EmailReadingService, EmailMessage } from './emailReadingService';
import { EmailReservationParser } from './emailReservationParser';
import { generateLobbyPmsCheckInLink } from '../utils/checkInLinkUtils';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

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
   * @param branchId - Optional: Explizite Branch-ID (wird verwendet wenn angegeben)
   * @returns Erstellte Reservation
   */
  static async createReservationFromEmail(
    parsedEmail: ParsedReservationEmail,
    organizationId: number,
    emailMessage?: EmailMessage,
    branchId?: number
  ) {
    try {
      // Prüfe auf Duplikate (via lobbyReservationId)
      const existingReservation = await prisma.reservation.findUnique({
        where: { lobbyReservationId: parsedEmail.reservationCode }
      });

      if (existingReservation) {
        logger.log(`[EmailReservation] Reservation ${parsedEmail.reservationCode} existiert bereits (ID: ${existingReservation.id})`);
        return existingReservation;
      }

      // Verwende explizite branchId wenn angegeben, sonst erste Branch der Organisation als Fallback
      let finalBranchId = branchId;
      if (!finalBranchId) {
        const branch = await prisma.branch.findFirst({
          where: { organizationId },
          orderBy: { id: 'asc' }
        });
        finalBranchId = branch?.id || null;
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
        organizationId: organizationId,
        branchId: finalBranchId
      };

      // Setze Kontaktinformationen
      if (parsedEmail.guestEmail) {
        reservationData.guestEmail = parsedEmail.guestEmail.trim();
      }
      if (parsedEmail.guestPhone) {
        reservationData.guestPhone = parsedEmail.guestPhone.trim();
      }
      // Setze Nationalität (für Sprache-basierte WhatsApp-Nachrichten)
      if (parsedEmail.nationality) {
        reservationData.guestNationality = parsedEmail.nationality.trim();
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

      logger.log(`[EmailReservation] Reservation ${reservation.id} erstellt aus Email (Code: ${parsedEmail.reservationCode})`);

      // NEU: Sofort-Versendung wenn Check-in-Date heute oder in Vergangenheit
      // UND autoSendReservationInvitation aktiviert
      if (reservation.checkInDate) {
        const checkInDate = new Date(reservation.checkInDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        checkInDate.setHours(0, 0, 0, 0);
        
        const isTodayOrPast = checkInDate <= today;
        
        // Prüfe Branch Settings: autoSendReservationInvitation
        const branch = reservation.branchId ? await prisma.branch.findUnique({
          where: { id: reservation.branchId },
          select: { autoSendReservationInvitation: true }
        }) : null;
        
        const autoSend = branch?.autoSendReservationInvitation ?? false;
        
        if (isTodayOrPast && autoSend) {
          try {
            logger.log(`[EmailReservation] Check-in-Date heute/vergangen → versende sofort für Reservierung ${reservation.id}`);
            const { ReservationNotificationService } = await import('./reservationNotificationService');
            
            // Versende je nach verfügbaren Kontaktdaten
            const options: any = {
              amount: parsedEmail.amount,
              currency: parsedEmail.currency || 'COP'
            };
            
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
              logger.log(`[EmailReservation] ✅ Sofort-Versendung erfolgreich für Reservierung ${reservation.id}`);
            } else {
              logger.warn(`[EmailReservation] ⚠️ Sofort-Versendung fehlgeschlagen für Reservierung ${reservation.id}: ${result.error}`);
            }
          } catch (error) {
            logger.error(`[EmailReservation] Fehler beim sofortigen Versenden für Reservierung ${reservation.id}:`, error);
            // Fehler nicht weiterwerfen, da Reservation erfolgreich erstellt wurde
          }
        } else {
          // Check-in-Date ist in der Zukunft → Scheduler wird versenden
          logger.log(`[EmailReservation] Check-in-Date ist in der Zukunft (${checkInDate.toISOString()}) → Scheduler wird versenden`);
        }
      }

      // ⚠️ SICHERHEIT: WhatsApp-Versand beim Erstellen aus Emails ist DEAKTIVIERT
      // Um zu verhindern, dass während Tests Nachrichten an echte Empfänger versendet werden
      // Aktivierung nur nach expliziter Freigabe!
      // HINWEIS: Die Sofort-Versendung oben verwendet bereits sendReservationInvitation,
      // die sowohl Email als auch WhatsApp versendet (je nach Kontaktdaten)
      const EMAIL_RESERVATION_WHATSAPP_ENABLED = process.env.EMAIL_RESERVATION_WHATSAPP_ENABLED === 'true';
      
      if (!EMAIL_RESERVATION_WHATSAPP_ENABLED) {
        logger.log(`[EmailReservation] ⚠️ WhatsApp-Versand ist DEAKTIVIERT (Test-Modus)`);
        logger.log(`[EmailReservation] Um zu aktivieren: Setze EMAIL_RESERVATION_WHATSAPP_ENABLED=true in .env`);
      }

      // Automatisch WhatsApp-Nachricht senden (wenn Telefonnummer vorhanden UND aktiviert)
      // NUR wenn nicht bereits durch Sofort-Versendung oben versendet wurde
      if (EMAIL_RESERVATION_WHATSAPP_ENABLED && reservation.guestPhone && !reservation.invitationSentAt) {
        try {
          // Verwende neue Service-Methode sendReservationInvitation()
          const { ReservationNotificationService } = await import('./reservationNotificationService');
          const result = await ReservationNotificationService.sendReservationInvitation(
            reservation.id,
            {
              guestPhone: reservation.guestPhone,
              amount: parsedEmail.amount,
              currency: parsedEmail.currency || 'COP'
            }
          );

          if (result.success) {
            // Markiere als versendet
            await prisma.reservation.update({
              where: { id: reservation.id },
              data: { invitationSentAt: new Date() }
            });
            logger.log(`[EmailReservation] ✅ WhatsApp-Nachricht erfolgreich versendet für Reservation ${reservation.id}`);
          } else {
            logger.warn(`[EmailReservation] ⚠️ WhatsApp-Nachricht konnte nicht versendet werden für Reservation ${reservation.id}: ${result.error}`);
          }
        } catch (whatsappError) {
          logger.error(`[EmailReservation] ❌ Fehler beim Versenden der WhatsApp-Nachricht:`, whatsappError);
          // Fehler nicht weiterwerfen, Reservation wurde bereits erstellt
        }
      } else {
        if (!reservation.guestPhone) {
        logger.log(`[EmailReservation] Keine Telefonnummer vorhanden, WhatsApp-Nachricht wird nicht versendet`);
        }
        if (reservation.invitationSentAt) {
          logger.log(`[EmailReservation] Einladung bereits versendet (durch Sofort-Versendung)`);
        }
      }

      return reservation;
    } catch (error) {
      logger.error('[EmailReservation] Fehler beim Erstellen der Reservation:', error);
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
        logger.log(`[EmailReservation] Email ${emailMessage.messageId} konnte nicht als Reservation geparst werden`);
        return null;
      }

      logger.log(`[EmailReservation] Email ${emailMessage.messageId} erfolgreich geparst:`, {
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
      logger.error(`[EmailReservation] Fehler beim Verarbeiten der Email ${emailMessage.messageId}:`, error);
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
        logger.log(`[EmailReservation] Keine Email-Konfiguration für Organisation ${organizationId}`);
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
          logger.log(`[EmailReservation] Keine neuen Emails für Organisation ${organizationId}`);
          return 0;
        }

        logger.log(`[EmailReservation] ${emails.length} neue Email(s) gefunden für Organisation ${organizationId}`);

        let processedCount = 0;

        // Verarbeite jede Email
        for (const email of emails) {
          try {
            const reservation = await this.processEmail(email, organizationId);

            if (reservation) {
              // WICHTIG: Email wird NICHT verschoben oder markiert - nur ausgelesen und in Ruhe gelassen!
              // Keine markAsRead() oder moveToFolder() Aufrufe mehr!
              
              processedCount++;
              logger.log(`[EmailReservation] ✅ Email ${email.messageId} erfolgreich verarbeitet (Reservation ID: ${reservation.id})`);
            } else {
              logger.log(`[EmailReservation] Email ${email.messageId} konnte nicht als Reservation erkannt werden`);
            }
          } catch (error) {
            logger.error(`[EmailReservation] Fehler beim Verarbeiten der Email ${email.messageId}:`, error);
            // Weiter mit nächster Email
          }
        }

        logger.log(`[EmailReservation] ${processedCount} von ${emails.length} Email(s) erfolgreich verarbeitet`);
        return processedCount;
      } finally {
        // Trenne Verbindung
        emailService.disconnect();
      }
    } catch (error) {
      logger.error(`[EmailReservation] Fehler beim Email-Check für Organisation ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Prüft auf neue Reservation-Emails für eine bestimmte Branch
   * 
   * @param branchId - Branch-ID
   * @returns Anzahl verarbeiteter Emails
   */
  static async checkForNewReservationEmailsForBranch(branchId: number): Promise<number> {
    try {
      // Lade Email-Konfiguration aus Branch Settings
      const emailConfig = await EmailReadingService.loadConfigFromBranch(branchId);
      if (!emailConfig) {
        logger.log(`[EmailReservation] Keine Email-Konfiguration für Branch ${branchId}`);
        return 0;
      }

      // Hole Branch mit Organization
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { organizationId: true }
      });

      if (!branch) {
        logger.log(`[EmailReservation] Branch ${branchId} nicht gefunden`);
        return 0;
      }

      // Lade Filter aus Branch oder Organization Settings
      const branchData = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { emailSettings: true }
      });

      let filters: any = {};
      
      // Prüfe Branch Settings
      if (branchData?.emailSettings) {
        const { decryptBranchApiSettings } = await import('../utils/encryption');
        const branchSettings = decryptBranchApiSettings(branchData.emailSettings as any);
        const emailSettings = branchSettings?.email || branchSettings;
        filters = emailSettings?.filters || {};
      }
      
      // Fallback: Organization Settings
      if (!filters || Object.keys(filters).length === 0) {
        const organization = await prisma.organization.findUnique({
          where: { id: branch.organizationId },
          select: { settings: true }
        });
        const orgSettings = organization?.settings as any;
        const emailReading = orgSettings?.emailReading;
        filters = emailReading?.filters || {};
      }

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
          logger.log(`[EmailReservation] Keine neuen Emails für Branch ${branchId}`);
          return 0;
        }

        logger.log(`[EmailReservation] ${emails.length} neue Email(s) gefunden für Branch ${branchId}`);

        let processedCount = 0;

        // Verarbeite jede Email
        for (const email of emails) {
          try {
            // WICHTIG: Übergebe branchId, damit Reservation der richtigen Branch zugeordnet wird
            const reservation = await this.processEmailForBranch(email, branch.organizationId, branchId);

            if (reservation) {
              processedCount++;
              logger.log(`[EmailReservation] ✅ Email ${email.messageId} erfolgreich verarbeitet (Reservation ID: ${reservation.id})`);
            } else {
              logger.log(`[EmailReservation] Email ${email.messageId} konnte nicht als Reservation erkannt werden`);
            }
          } catch (error) {
            logger.error(`[EmailReservation] Fehler beim Verarbeiten der Email ${email.messageId}:`, error);
            // Weiter mit nächster Email
          }
        }

        logger.log(`[EmailReservation] ${processedCount} von ${emails.length} Email(s) erfolgreich verarbeitet`);
        return processedCount;
      } finally {
        // Trenne Verbindung
        emailService.disconnect();
      }
    } catch (error) {
      logger.error(`[EmailReservation] Fehler beim Email-Check für Branch ${branchId}:`, error);
      throw error;
    }
  }

  /**
   * Verarbeitet eine Email und erstellt Reservation für eine bestimmte Branch
   */
  static async processEmailForBranch(
    emailMessage: EmailMessage,
    organizationId: number,
    branchId: number
  ) {
    try {
      // Parse Email (Text bevorzugen, da meist besser strukturiert)
      const parsedEmail = EmailReservationParser.parseReservationEmail(
        emailMessage.text || emailMessage.html || '',
        emailMessage.html
      );

      if (!parsedEmail) {
        logger.log(`[EmailReservation] Email ${emailMessage.messageId} konnte nicht als Reservation geparst werden`);
        return null;
      }

      logger.log(`[EmailReservation] Email ${emailMessage.messageId} erfolgreich geparst:`, {
        reservationCode: parsedEmail.reservationCode,
        guestName: parsedEmail.guestName,
        checkInDate: parsedEmail.checkInDate,
        checkOutDate: parsedEmail.checkOutDate,
        amount: parsedEmail.amount,
        currency: parsedEmail.currency
      });

      // Erstelle Reservation mit branchId
      const reservation = await this.createReservationFromEmail(
        parsedEmail,
        organizationId,
        emailMessage,
        branchId // Explizite branchId übergeben
      );

      return reservation;
    } catch (error) {
      logger.error(`[EmailReservation] Fehler beim Verarbeiten der Email ${emailMessage.messageId}:`, error);
      throw error;
    }
  }
}

