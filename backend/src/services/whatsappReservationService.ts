import { ReservationStatus, PaymentStatus } from '@prisma/client';
import { ParsedReservationMessage } from './whatsappMessageParser';
import { prisma } from '../utils/prisma';

/**
 * Service für automatische Reservierungserstellung aus WhatsApp-Nachrichten
 */
export class WhatsAppReservationService {
  /**
   * Erstellt eine Reservierung aus einer geparsten WhatsApp-Nachricht
   * 
   * @param parsedMessage - Geparste Nachricht
   * @returns Erstellte oder aktualisierte Reservierung
   */
  static async createReservationFromMessage(
    parsedMessage: ParsedReservationMessage
  ) {
    try {
      // ✅ Hardcodiert: Organisation ID = 1 (aktuell)
      const organizationId = 1;

      // Prüfe ob Reservierung bereits existiert
      const existingReservation = await prisma.reservation.findUnique({
        where: { lobbyReservationId: parsedMessage.reservationId }
      });

      if (existingReservation) {
        console.log(`[WhatsAppReservation] Reservierung ${parsedMessage.reservationId} existiert bereits`);
        return existingReservation;
      }

      // Hole erste Branch der Organisation als Fallback
      const branch = await prisma.branch.findFirst({
        where: { organizationId },
        orderBy: { id: 'asc' }
      });

      // Erstelle neue Reservierung
      const reservation = await prisma.reservation.create({
        data: {
          lobbyReservationId: parsedMessage.reservationId,
          guestName: parsedMessage.guestName,
          guestEmail: null, // Wird später eingetragen
          guestPhone: null, // Wird später eingetragen
          checkInDate: parsedMessage.checkInDate,
          checkOutDate: parsedMessage.checkOutDate,
          status: ReservationStatus.confirmed,
          paymentStatus: PaymentStatus.pending,
          organizationId: organizationId,
          branchId: branch?.id || null
        }
      });

      // Erstelle Sync-History-Eintrag
      await prisma.reservationSyncHistory.create({
        data: {
          reservationId: reservation.id,
          syncType: 'whatsapp_created',
          syncData: {
            propertyName: parsedMessage.propertyName,
            amount: parsedMessage.amount,
            currency: parsedMessage.currency,
            rooms: parsedMessage.rooms,
            guests: parsedMessage.guests
          } as any
        }
      });

      console.log(`[WhatsAppReservation] Reservierung ${reservation.id} erstellt aus WhatsApp-Nachricht`);
      return reservation;
    } catch (error) {
      console.error('[WhatsAppReservation] Fehler beim Erstellen der Reservierung:', error);
      throw error;
    }
  }
}

