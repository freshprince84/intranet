import { PrismaClient, Reservation, ReservationStatus } from '@prisma/client';
import { LobbyPmsService } from './lobbyPmsService';
import { WhatsAppService } from './whatsappService';
import { BoldPaymentService } from './boldPaymentService';
import { TTLockService } from './ttlockService';
import { sendEmail } from './emailService';
import { TaskAutomationService } from './taskAutomationService';

const prisma = new PrismaClient();

/**
 * Service für automatische Benachrichtigungen zu Reservierungen
 * 
 * Orchestriert E-Mail/WhatsApp-Versand, Zahlungslinks und Türsystem-PINs
 */
export class ReservationNotificationService {
  /**
   * Sendet Check-in-Einladungen an Gäste mit späten Ankünften
   * 
   * Wird täglich um 20:00 Uhr ausgeführt
   * Sendet an Gäste mit Ankunft am nächsten Tag nach 22:00 Uhr
   */
  static async sendLateCheckInInvitations(): Promise<void> {
    console.log('[ReservationNotification] Starte Versand von Check-in-Einladungen...');

    try {
      // Hole alle Organisationen mit aktivierter LobbyPMS-Synchronisation
      const organizations = await prisma.organization.findMany({
        where: {
          settings: {
            path: ['lobbyPms', 'syncEnabled'],
            equals: true
          }
        }
      });

      for (const organization of organizations) {
        try {
          const settings = organization.settings as any;
          const lobbyPmsSettings = settings?.lobbyPms;

          if (!lobbyPmsSettings?.syncEnabled) {
            continue;
          }

          const lateCheckInThreshold = lobbyPmsSettings.lateCheckInThreshold || '22:00';
          const notificationChannels = lobbyPmsSettings.notificationChannels || ['email'];

          console.log(`[ReservationNotification] Verarbeite Organisation ${organization.id}...`);

          // Hole Reservierungen für morgen mit Ankunft nach Threshold
          const lobbyPmsService = new LobbyPmsService(organization.id);
          const tomorrowReservations = await lobbyPmsService.fetchTomorrowReservations(lateCheckInThreshold);

          console.log(`[ReservationNotification] Gefunden: ${tomorrowReservations.length} Reservierungen`);

          for (const lobbyReservation of tomorrowReservations) {
            try {
              // Synchronisiere Reservierung in lokale DB
              // (Task wird automatisch in syncReservation erstellt)
              const reservation = await lobbyPmsService.syncReservation(lobbyReservation);

              // Prüfe ob bereits Einladung versendet wurde
              if (reservation.invitationSentAt) {
                console.log(`[ReservationNotification] Einladung bereits versendet für Reservierung ${reservation.id}`);
                continue;
              }

              // Erstelle Zahlungslink
              const boldPaymentService = new BoldPaymentService(organization.id);
              // TODO: Hole tatsächlichen Betrag aus LobbyPMS
              const amount = 100000; // Placeholder: 100.000 COP
              const paymentLink = await boldPaymentService.createPaymentLink(
                reservation,
                amount,
                'COP',
                `Zahlung für Reservierung ${reservation.guestName}`
              );

              // Erstelle Check-in-Link
              const checkInLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/check-in/${reservation.id}`;

              // Versende Benachrichtigungen
              if (notificationChannels.includes('email') && reservation.guestEmail) {
                await this.sendCheckInInvitationEmail(
                  reservation,
                  checkInLink,
                  paymentLink
                );
              }

              if (notificationChannels.includes('whatsapp') && reservation.guestPhone) {
                const whatsappService = new WhatsAppService(organization.id);
                await whatsappService.sendCheckInInvitation(
                  reservation.guestName,
                  reservation.guestPhone,
                  checkInLink,
                  paymentLink
                );
              }

              // Markiere als versendet
              await prisma.reservation.update({
                where: { id: reservation.id },
                data: { invitationSentAt: new Date() }
              });

              console.log(`[ReservationNotification] Einladung versendet für Reservierung ${reservation.id}`);
            } catch (error) {
              console.error(`[ReservationNotification] Fehler bei Reservierung ${lobbyReservation.id}:`, error);
              // Weiter mit nächster Reservierung
            }
          }
        } catch (error) {
          console.error(`[ReservationNotification] Fehler bei Organisation ${organization.id}:`, error);
          // Weiter mit nächster Organisation
        }
      }

      console.log('[ReservationNotification] Versand abgeschlossen');
    } catch (error) {
      console.error('[ReservationNotification] Fehler beim Versand:', error);
      throw error;
    }
  }

  /**
   * Generiert PIN-Code und sendet Mitteilung (unabhängig von Check-in-Status)
   * 
   * @param reservationId - ID der Reservierung
   */
  static async generatePinAndSendNotification(reservationId: number): Promise<void> {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
        include: { organization: true }
      });

      if (!reservation) {
        throw new Error(`Reservierung ${reservationId} nicht gefunden`);
      }

      // Entschlüssele Settings
      const { decryptApiSettings } = await import('../utils/encryption');
      const decryptedSettings = decryptApiSettings(reservation.organization.settings as any);
      const notificationChannels = decryptedSettings?.lobbyPms?.notificationChannels || ['email'];

      // Erstelle TTLock Passcode
      let doorPin: string | null = null;
      let doorAppName: string | null = null;

      console.log(`[ReservationNotification] Starte PIN-Generierung für Reservation ${reservationId}...`);
      
      try {
        const ttlockService = new TTLockService(reservation.organizationId);
        const doorSystemSettings = decryptedSettings?.doorSystem;

        console.log(`[ReservationNotification] Door System Settings:`, {
          hasDoorSystem: !!doorSystemSettings,
          hasLockIds: !!doorSystemSettings?.lockIds,
          lockIds: doorSystemSettings?.lockIds,
          lockIdsLength: doorSystemSettings?.lockIds?.length || 0
        });

        if (doorSystemSettings?.lockIds && doorSystemSettings.lockIds.length > 0) {
          const lockId = doorSystemSettings.lockIds[0]; // Verwende ersten Lock
          doorAppName = 'TTLock'; // Oder aus Settings: doorSystemSettings.appName

          console.log(`[ReservationNotification] Erstelle TTLock Passcode für Lock ID: ${lockId}`);
          console.log(`[ReservationNotification] Check-in Date: ${reservation.checkInDate}`);
          console.log(`[ReservationNotification] Check-out Date: ${reservation.checkOutDate}`);

          // Erstelle Passcode für Check-in bis Check-out
          doorPin = await ttlockService.createTemporaryPasscode(
            lockId,
            reservation.checkInDate,
            reservation.checkOutDate,
            `Guest: ${reservation.guestName}`
          );

          console.log(`[ReservationNotification] ✅ TTLock Passcode erfolgreich generiert: ${doorPin}`);

          // Speichere in Reservierung
          await prisma.reservation.update({
            where: { id: reservation.id },
            data: {
              doorPin,
              doorAppName,
              ttlLockId: lockId,
              ttlLockPassword: doorPin
            }
          });

          console.log(`[ReservationNotification] ✅ PIN in DB gespeichert für Reservation ${reservationId}`);
        } else {
          console.warn(`[ReservationNotification] ⚠️ Keine Lock IDs konfiguriert für Reservation ${reservationId}`);
        }
      } catch (error) {
        console.error(`[ReservationNotification] ❌ Fehler beim Erstellen des TTLock Passcodes:`, error);
        if (error instanceof Error) {
          console.error(`[ReservationNotification] Fehlermeldung: ${error.message}`);
          console.error(`[ReservationNotification] Stack: ${error.stack}`);
        }
        // Weiter ohne PIN
      }

      // Versende Benachrichtigungen
      if (notificationChannels.includes('email') && reservation.guestEmail) {
        try {
          await this.sendCheckInConfirmationEmail(
            reservation,
            doorPin,
            doorAppName
          );
        } catch (error) {
          console.error(`[ReservationNotification] Fehler beim Versenden der E-Mail:`, error);
          // Weiter ohne E-Mail
        }
      }

      if (notificationChannels.includes('whatsapp') && reservation.guestPhone) {
        try {
          const whatsappService = new WhatsAppService(reservation.organizationId);
          await whatsappService.sendCheckInConfirmation(
            reservation.guestName,
            reservation.guestPhone,
            reservation.roomNumber || 'N/A',
            reservation.roomDescription || 'N/A',
            doorPin || 'N/A',
            doorAppName || 'TTLock'
          );
        } catch (error) {
          console.error(`[ReservationNotification] Fehler beim Versenden der WhatsApp-Nachricht:`, error);
          // Weiter ohne WhatsApp - PIN wurde bereits generiert
        }
      }

      console.log(`[ReservationNotification] PIN generiert und Mitteilung versendet für Reservierung ${reservationId}`);
    } catch (error) {
      console.error(`[ReservationNotification] Fehler beim Generieren des PIN-Codes und Versenden der Mitteilung:`, error);
      throw error;
    }
  }

  /**
   * Sendet Check-in-Bestätigung nach erfolgreichem Check-in
   * 
   * @param reservationId - ID der Reservierung
   */
  static async sendCheckInConfirmation(reservationId: number): Promise<void> {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
        include: { organization: true }
      });

      if (!reservation) {
        throw new Error(`Reservierung ${reservationId} nicht gefunden`);
      }

      if (reservation.status !== ReservationStatus.checked_in) {
        throw new Error(`Reservierung ${reservationId} ist nicht eingecheckt`);
      }

      const settings = reservation.organization.settings as any;
      const notificationChannels = settings?.lobbyPms?.notificationChannels || ['email'];

      // Erstelle TTLock Passcode
      let doorPin: string | null = null;
      let doorAppName: string | null = null;

      try {
        const ttlockService = new TTLockService(reservation.organizationId);
        const doorSystemSettings = settings?.doorSystem;

        if (doorSystemSettings?.lockIds && doorSystemSettings.lockIds.length > 0) {
          const lockId = doorSystemSettings.lockIds[0]; // Verwende ersten Lock
          doorAppName = 'TTLock'; // Oder aus Settings: doorSystemSettings.appName

          // Erstelle Passcode für Check-in bis Check-out
          doorPin = await ttlockService.createTemporaryPasscode(
            lockId,
            reservation.checkInDate,
            reservation.checkOutDate,
            `Guest: ${reservation.guestName}`
          );

          // Speichere in Reservierung
          await prisma.reservation.update({
            where: { id: reservation.id },
            data: {
              doorPin,
              doorAppName,
              ttlLockId: lockId,
              ttlLockPassword: doorPin
            }
          });
        }
      } catch (error) {
        console.error(`[ReservationNotification] Fehler beim Erstellen des TTLock Passcodes:`, error);
        // Weiter ohne PIN
      }

      // Versende Benachrichtigungen
      if (notificationChannels.includes('email') && reservation.guestEmail) {
        await this.sendCheckInConfirmationEmail(
          reservation,
          doorPin,
          doorAppName
        );
      }

      if (notificationChannels.includes('whatsapp') && reservation.guestPhone) {
        const whatsappService = new WhatsAppService(reservation.organizationId);
        await whatsappService.sendCheckInConfirmation(
          reservation.guestName,
          reservation.guestPhone,
          reservation.roomNumber || 'N/A',
          reservation.roomDescription || 'N/A',
          doorPin || 'N/A',
          doorAppName || 'TTLock'
        );
      }

      console.log(`[ReservationNotification] Check-in-Bestätigung versendet für Reservierung ${reservationId}`);
    } catch (error) {
      console.error(`[ReservationNotification] Fehler beim Versand der Check-in-Bestätigung:`, error);
      throw error;
    }
  }

  /**
   * Sendet Check-in-Einladung per E-Mail
   */
  private static async sendCheckInInvitationEmail(
    reservation: Reservation,
    checkInLink: string,
    paymentLink: string
  ): Promise<void> {
    const subject = 'Willkommen bei La Familia Hostel - Online Check-in';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin: 10px 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Hola ${reservation.guestName},</h1>
          <p>¡Nos complace darte la bienvenida a La Familia Hostel!</p>
          <p>Como llegarás después de las 22:00, puedes realizar el check-in en línea ahora:</p>
          <p><a href="${checkInLink}" class="button">Online Check-in</a></p>
          <p>Por favor, realiza el pago por adelantado:</p>
          <p><a href="${paymentLink}" class="button">Zahlung durchführen</a></p>
          <p>¡Te esperamos mañana!</p>
        </div>
      </body>
      </html>
    `;

    const text = `
Hola ${reservation.guestName},

¡Nos complace darte la bienvenida a La Familia Hostel!

Como llegarás después de las 22:00, puedes realizar el check-in en línea ahora:
${checkInLink}

Por favor, realiza el pago por adelantado:
${paymentLink}

¡Te esperamos mañana!
    `;

    await sendEmail(
      reservation.guestEmail!,
      subject,
      html,
      text,
      reservation.organizationId
    );
  }

  /**
   * Sendet Check-in-Bestätigung per E-Mail
   */
  private static async sendCheckInConfirmationEmail(
    reservation: Reservation,
    doorPin: string | null,
    doorAppName: string | null
  ): Promise<void> {
    const subject = 'Ihr Check-in ist abgeschlossen - Zimmerinformationen';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .info-box {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Hola ${reservation.guestName},</h1>
          <p>¡Tu check-in se ha completado exitosamente!</p>
          <div class="info-box">
            <h3>Información de tu habitación:</h3>
            <p><strong>Habitación:</strong> ${reservation.roomNumber || 'N/A'}</p>
            <p><strong>Descripción:</strong> ${reservation.roomDescription || 'N/A'}</p>
          </div>
          ${doorPin ? `
          <div class="info-box">
            <h3>Acceso:</h3>
            <p><strong>PIN de la puerta:</strong> ${doorPin}</p>
            <p><strong>App:</strong> ${doorAppName || 'TTLock'}</p>
          </div>
          ` : ''}
          <p>¡Te deseamos una estancia agradable!</p>
        </div>
      </body>
      </html>
    `;

    const text = `
Hola ${reservation.guestName},

¡Tu check-in se ha completado exitosamente!

Información de tu habitación:
- Habitación: ${reservation.roomNumber || 'N/A'}
- Descripción: ${reservation.roomDescription || 'N/A'}

${doorPin ? `Acceso:
- PIN de la puerta: ${doorPin}
- App: ${doorAppName || 'TTLock'}
` : ''}

¡Te deseamos una estancia agradable!
    `;

    await sendEmail(
      reservation.guestEmail!,
      subject,
      html,
      text,
      reservation.organizationId
    );
  }
}

