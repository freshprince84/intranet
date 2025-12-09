import { prisma } from '../utils/prisma';
import { WhatsAppService } from './whatsappService';
import { TourBooking, TourBookingStatus } from '@prisma/client';
import { logger } from '../utils/logger';

/**
 * Service für Tour-WhatsApp-Automatisierung
 */
export class TourWhatsAppService {
  /**
   * Sendet Buchungsanfrage an externen Tour-Anbieter
   */
  static async sendBookingRequestToProvider(
    bookingId: number,
    organizationId: number,
    branchId: number | null
  ): Promise<boolean> {
    try {
      const booking = await prisma.tourBooking.findUnique({
        where: { id: bookingId },
        include: {
          tour: {
            include: {
              externalProvider: true
            }
          }
        }
      });

      if (!booking || !booking.tour || booking.tour.type !== 'external' || !booking.tour.externalProvider) {
        logger.log('[TourWhatsApp] Kein externer Anbieter für Buchung', bookingId);
        return false;
      }

      const provider = booking.tour.externalProvider;
      if (!provider.phone) {
        logger.log('[TourWhatsApp] Keine Telefonnummer für Anbieter', provider.id);
        return false;
      }

      // Erstelle WhatsApp-Service
      const whatsappService = branchId
        ? new WhatsAppService(undefined, branchId)
        : new WhatsAppService(organizationId);

      // Erstelle Nachricht
      const message = `Neue Tour-Buchungsanfrage:\n\n` +
        `Tour: ${booking.tour.title}\n` +
        `Kunde: ${booking.customerName}\n` +
        `Telefon: ${booking.customerPhone || 'N/A'}\n` +
        `E-Mail: ${booking.customerEmail || 'N/A'}\n` +
        `Tour-Datum: ${new Date(booking.tourDate).toLocaleDateString('de-DE')}\n` +
        `Teilnehmer: ${booking.numberOfParticipants}\n` +
        `Preis: ${Number(booking.totalPrice).toLocaleString()} ${booking.currency}\n` +
        (booking.customerNotes ? `Notizen: ${booking.customerNotes}\n` : '') +
        `\nBitte bestätigen Sie die Verfügbarkeit.`;

      // Sende Nachricht
      const success = await whatsappService.sendMessage(provider.phone, message);

      if (success) {
        // Speichere Nachricht in Datenbank
        await prisma.tourWhatsAppMessage.create({
          data: {
            bookingId,
            direction: 'outgoing',
            status: 'sent',
            phoneNumber: provider.phone,
            message
          }
        });
        logger.log(`[TourWhatsApp] ✅ Buchungsanfrage gesendet an Anbieter ${provider.phone}`);
      }

      return success;
    } catch (error) {
      logger.error('[TourWhatsApp] Fehler beim Senden der Buchungsanfrage:', error);
      return false;
    }
  }

  /**
   * Verarbeitet Antwort vom Anbieter und sendet Bestätigung/Absage an Kunde
   */
  static async processProviderResponse(
    bookingId: number,
    providerMessage: string,
    organizationId: number,
    branchId: number | null
  ): Promise<void> {
    try {
      const booking = await prisma.tourBooking.findUnique({
        where: { id: bookingId },
        include: {
          tour: {
            include: {
              externalProvider: true
            }
          }
        }
      });

      if (!booking || !booking.customerPhone) {
        logger.log('[TourWhatsApp] Keine Kunden-Telefonnummer für Buchung', bookingId);
        return;
      }

      // Speichere eingehende Nachricht
      await prisma.tourWhatsAppMessage.create({
        data: {
          bookingId,
          direction: 'incoming',
          status: 'delivered',
          phoneNumber: booking.tour?.externalProvider?.phone || '',
          message: providerMessage
        }
      });

      // Analysiere Nachricht (einfache Keyword-Erkennung)
      const messageLower = providerMessage.toLowerCase();
      const isConfirmed = messageLower.includes('bestätigt') || 
                         messageLower.includes('verfügbar') || 
                         messageLower.includes('ok') ||
                         messageLower.includes('ja');
      const isCancelled = messageLower.includes('nicht verfügbar') || 
                         messageLower.includes('ausgebucht') ||
                         messageLower.includes('storniert') ||
                         messageLower.includes('nein');

      const whatsappService = branchId
        ? new WhatsAppService(undefined, branchId)
        : new WhatsAppService(organizationId);

      if (isConfirmed) {
        // Bestätigung: Aktualisiere Status und sende Bestätigung + Zahlungslink
        await prisma.tourBooking.update({
          where: { id: bookingId },
          data: {
            status: 'confirmed',
            externalStatus: 'confirmed'
          }
        });

        // Generiere Zahlungslink (falls noch nicht vorhanden)
        let paymentLink = booking.paymentLink;
        if (!paymentLink && booking.totalPrice) {
          // TODO: Integriere BoldPaymentService für Zahlungslink-Generierung
          // const { BoldPaymentService } = await import('./boldPaymentService');
          // paymentLink = await BoldPaymentService.generatePaymentLink(...);
        }

        const confirmationMessage = `Ihre Tour "${booking.tour?.title || 'Tour'}" wurde bestätigt!\n\n` +
          `Datum: ${new Date(booking.tourDate).toLocaleDateString('de-DE')}\n` +
          `Teilnehmer: ${booking.numberOfParticipants}\n` +
          `Preis: ${Number(booking.totalPrice).toLocaleString()} ${booking.currency}\n` +
          (paymentLink ? `\nZahlungslink: ${paymentLink}` : '') +
          `\n\nWir freuen uns auf Sie!`;

        await whatsappService.sendMessage(booking.customerPhone, confirmationMessage);

        // Speichere ausgehende Nachricht
        await prisma.tourWhatsAppMessage.create({
          data: {
            bookingId,
            direction: 'outgoing',
            status: 'sent',
            phoneNumber: booking.customerPhone || '',
            message: confirmationMessage
          }
        });

        logger.log(`[TourWhatsApp] ✅ Bestätigung an Kunde gesendet`);
      } else if (isCancelled) {
        // Absage: Aktualisiere Status und sende Absage
        await prisma.tourBooking.update({
          where: { id: bookingId },
          data: {
            status: 'cancelled',
            externalStatus: 'cancelled',
            cancelledBy: 'provider'
          }
        });

        const cancellationMessage = `Leider ist die Tour "${booking.tour?.title || 'Tour'}" für den gewünschten Termin nicht verfügbar.\n\n` +
          `Wir können Ihnen gerne alternative Termine oder Touren vorschlagen. Bitte kontaktieren Sie uns.`;

        await whatsappService.sendMessage(booking.customerPhone, cancellationMessage);

        // Speichere ausgehende Nachricht
        await prisma.tourWhatsAppMessage.create({
          data: {
            bookingId,
            direction: 'outgoing',
            status: 'sent',
            phoneNumber: booking.customerPhone || '',
            message: cancellationMessage
          }
        });

        logger.log(`[TourWhatsApp] ✅ Absage an Kunde gesendet`);
      } else {
        // Unklare Antwort: Manuelle Bearbeitung erforderlich
        logger.log(`[TourWhatsApp] ⚠️ Unklare Antwort vom Anbieter, manuelle Bearbeitung erforderlich`);
        // TODO: Notification an definierte Rolle senden
      }
    } catch (error) {
      logger.error('[TourWhatsApp] Fehler beim Verarbeiten der Anbieter-Antwort:', error);
    }
  }

  /**
   * Sendet Stornierungs-Benachrichtigung an Kunde
   */
  /**
   * Sendet Tour-Buchungsbestätigung an Kunden mit Payment Link
   */
  static async sendBookingConfirmationToCustomer(
    bookingId: number,
    organizationId: number,
    branchId: number | null,
    paymentLink: string,
    amount: number,
    currency: string = 'COP'
  ): Promise<boolean> {
    try {
      const booking = await prisma.tourBooking.findUnique({
        where: { id: bookingId },
        include: {
          tour: true
        }
      });

      if (!booking || !booking.customerPhone) {
        logger.log('[TourWhatsApp] Keine Kunden-Telefonnummer für Buchung', bookingId);
        return false;
      }

      const whatsappService = branchId
        ? new WhatsAppService(undefined, branchId)
        : new WhatsAppService(organizationId);

      // Erkenne Sprache basierend auf Telefonnummer
      const { LanguageDetectionService } = await import('./languageDetectionService');
      const language = LanguageDetectionService.detectLanguageFromPhoneNumber(booking.customerPhone);

      // Formatiere Datum
      const tourDate = new Date(booking.tourDate).toLocaleDateString(
        language === 'de' ? 'de-DE' : language === 'en' ? 'en-US' : 'es-ES',
        {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }
      );

      // Erstelle Nachricht basierend auf Sprache
      let message: string;
      if (language === 'de') {
        message = `Hallo ${booking.customerName}!\n\n` +
          `Ihre Reservierung für die Tour "${booking.tour?.title || 'Tour'}" wurde bestätigt.\n\n` +
          `📅 Datum: ${tourDate}\n` +
          `👥 Teilnehmer: ${booking.numberOfParticipants}\n` +
          `💰 Preis: ${Number(amount).toLocaleString('de-DE')} ${currency}\n\n` +
          `Sie können online bezahlen:\n${paymentLink}\n\n` +
          `💡 Sie können die Tour auch in Bar an der Rezeption zwischen 09:00 und 17:30 bezahlen.\n\n` +
          `Wir freuen uns auf Sie!`;
      } else if (language === 'en') {
        message = `Hello ${booking.customerName}!\n\n` +
          `Your reservation for the tour "${booking.tour?.title || 'Tour'}" has been confirmed.\n\n` +
          `📅 Date: ${tourDate}\n` +
          `👥 Participants: ${booking.numberOfParticipants}\n` +
          `💰 Price: ${Number(amount).toLocaleString('en-US')} ${currency}\n\n` +
          `You can pay online:\n${paymentLink}\n\n` +
          `💡 You can also pay in cash at the reception between 09:00 and 17:30.\n\n` +
          `We look forward to seeing you!`;
      } else {
        // Spanisch (Standard)
        message = `¡Hola ${booking.customerName}!\n\n` +
          `Tu reserva para la tour "${booking.tour?.title || 'Tour'}" ha sido confirmada.\n\n` +
          `📅 Fecha: ${tourDate}\n` +
          `👥 Participantes: ${booking.numberOfParticipants}\n` +
          `💰 Precio: ${Number(amount).toLocaleString('es-ES')} ${currency}\n\n` +
          `Puedes realizar el pago en línea:\n${paymentLink}\n\n` +
          `💡 También puedes pagar en efectivo en la recepción entre las 09:00 y 17:30.\n\n` +
          `¡Te esperamos!`;
      }

      const success = await whatsappService.sendMessage(booking.customerPhone, message);

      if (success) {
        await prisma.tourWhatsAppMessage.create({
          data: {
            bookingId,
            direction: 'outgoing',
            status: 'sent',
            phoneNumber: booking.customerPhone || '',
            message
          }
        });
        logger.log(`[TourWhatsApp] ✅ Buchungsbestätigung mit Payment Link gesendet an Kunden für Buchung ${bookingId}`);
      }

      return success;
    } catch (error) {
      logger.error('[TourWhatsApp] Fehler beim Senden der Buchungsbestätigung:', error);
      return false;
    }
  }

  /**
   * Sendet Bestätigung an Kunden nach erfolgreicher Zahlung
   */
  static async sendConfirmationToCustomer(
    bookingId: number,
    organizationId: number,
    branchId: number | null
  ): Promise<boolean> {
    try {
      const booking = await prisma.tourBooking.findUnique({
        where: { id: bookingId },
        include: {
          tour: true
        }
      });

      if (!booking || !booking.customerPhone) {
        return false;
      }

      const whatsappService = branchId
        ? new WhatsAppService(undefined, branchId)
        : new WhatsAppService(organizationId);

      const tourDate = new Date(booking.tourDate).toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const message = `✅ Ihre Tour-Buchung wurde bestätigt!\n\n` +
        `Tour: ${booking.tour?.title || 'Tour'}\n` +
        `Datum: ${tourDate}\n` +
        `Teilnehmer: ${booking.numberOfParticipants}\n` +
        `Preis: ${Number(booking.totalPrice).toLocaleString()} ${booking.currency}\n\n` +
        `Vielen Dank für Ihre Buchung! Wir freuen uns auf Sie.`;

      const success = await whatsappService.sendMessage(booking.customerPhone, message);

      if (success) {
        await prisma.tourWhatsAppMessage.create({
          data: {
            bookingId,
            direction: 'outgoing',
            status: 'sent',
            phoneNumber: booking.customerPhone || '',
            message
          }
        });
        logger.log(`[TourWhatsApp] ✅ Bestätigung gesendet an Kunden für Buchung ${bookingId}`);
      }

      return success;
    } catch (error) {
      logger.error('[TourWhatsApp] Fehler beim Senden der Bestätigung:', error);
      return false;
    }
  }

  static async sendCancellationToCustomer(
    bookingId: number,
    organizationId: number,
    branchId: number | null,
    reason?: string
  ): Promise<boolean> {
    try {
      const booking = await prisma.tourBooking.findUnique({
        where: { id: bookingId },
        include: {
          tour: true
        }
      });

      if (!booking || !booking.customerPhone) {
        return false;
      }

      const whatsappService = branchId
        ? new WhatsAppService(undefined, branchId)
        : new WhatsAppService(organizationId);

      const message = `Ihre Tour "${booking.tour?.title || 'Tour'}" wurde storniert.\n\n` +
        (reason ? `Grund: ${reason}\n\n` : '') +
        `Bei Fragen kontaktieren Sie uns bitte.`;

      const success = await whatsappService.sendMessage(booking.customerPhone, message);

      if (success) {
        await prisma.tourWhatsAppMessage.create({
          data: {
            bookingId,
            direction: 'outgoing',
            status: 'sent',
            phoneNumber: booking.customerPhone || '',
            message
          }
        });
      }

      return success;
    } catch (error) {
      logger.error('[TourWhatsApp] Fehler beim Senden der Stornierungs-Benachrichtigung:', error);
      return false;
    }
  }
}

