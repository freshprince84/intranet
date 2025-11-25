import { prisma } from '../utils/prisma';
import { WhatsAppService } from './whatsappService';
import { TourBooking, TourBookingStatus } from '@prisma/client';

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
        console.log('[TourWhatsApp] Kein externer Anbieter für Buchung', bookingId);
        return false;
      }

      const provider = booking.tour.externalProvider;
      if (!provider.phone) {
        console.log('[TourWhatsApp] Keine Telefonnummer für Anbieter', provider.id);
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
        console.log(`[TourWhatsApp] ✅ Buchungsanfrage gesendet an Anbieter ${provider.phone}`);
      }

      return success;
    } catch (error) {
      console.error('[TourWhatsApp] Fehler beim Senden der Buchungsanfrage:', error);
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
        console.log('[TourWhatsApp] Keine Kunden-Telefonnummer für Buchung', bookingId);
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

        console.log(`[TourWhatsApp] ✅ Bestätigung an Kunde gesendet`);
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

        console.log(`[TourWhatsApp] ✅ Absage an Kunde gesendet`);
      } else {
        // Unklare Antwort: Manuelle Bearbeitung erforderlich
        console.log(`[TourWhatsApp] ⚠️ Unklare Antwort vom Anbieter, manuelle Bearbeitung erforderlich`);
        // TODO: Notification an definierte Rolle senden
      }
    } catch (error) {
      console.error('[TourWhatsApp] Fehler beim Verarbeiten der Anbieter-Antwort:', error);
    }
  }

  /**
   * Sendet Stornierungs-Benachrichtigung an Kunde
   */
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
      console.error('[TourWhatsApp] Fehler beim Senden der Stornierungs-Benachrichtigung:', error);
      return false;
    }
  }
}

