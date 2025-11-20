import { PrismaClient, Reservation, ReservationStatus } from '@prisma/client';
import { LobbyPmsService } from './lobbyPmsService';
import { WhatsAppService } from './whatsappService';
import { BoldPaymentService } from './boldPaymentService';
import { TTLockService } from './ttlockService';
import { sendEmail } from './emailService';
import { TaskAutomationService } from './taskAutomationService';
import { generateLobbyPmsCheckInLink } from '../utils/checkInLinkUtils';

const prisma = new PrismaClient();

/**
 * Service für automatische Benachrichtigungen zu Reservierungen
 * 
 * Orchestriert E-Mail/WhatsApp-Versand, Zahlungslinks und Türsystem-PINs
 */
export class ReservationNotificationService {
  /**
   * Loggt eine Notification in die Datenbank
   * 
   * @param reservationId - ID der Reservierung
   * @param notificationType - Typ der Notification ('invitation', 'pin', 'checkin_confirmation')
   * @param channel - Kanal ('whatsapp', 'email', 'both')
   * @param success - Erfolg (true/false)
   * @param data - Zusätzliche Daten (sentTo, message, paymentLink, checkInLink, errorMessage)
   */
  private static async logNotification(
    reservationId: number,
    notificationType: 'invitation' | 'pin' | 'checkin_confirmation',
    channel: 'whatsapp' | 'email' | 'both',
    success: boolean,
    data?: {
      sentTo?: string;
      message?: string;
      paymentLink?: string;
      checkInLink?: string;
      errorMessage?: string;
    }
  ): Promise<void> {
    try {
      await prisma.reservationNotificationLog.create({
        data: {
          reservationId,
          notificationType,
          channel,
          success,
          sentAt: new Date(),
          sentTo: data?.sentTo || null,
          message: data?.message || null,
          paymentLink: data?.paymentLink || null,
          checkInLink: data?.checkInLink || null,
          errorMessage: data?.errorMessage || null
        }
      });
      console.log(`[ReservationNotification] ✅ Log-Eintrag erstellt für Reservation ${reservationId}, Type: ${notificationType}, Success: ${success}`);
    } catch (error) {
      // Log-Fehler sollten nicht die Hauptfunktionalität beeinträchtigen
      console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags:`, error);
    }
  }
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

              // Erstelle LobbyPMS Check-in-Link
              const checkInLink = generateLobbyPmsCheckInLink(reservation);

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
   * Sendet Reservation-Einladung (Payment-Link + Check-in-Link + WhatsApp)
   * 
   * @param reservationId - ID der Reservierung
   * @param options - Optionale Parameter (Kontaktinfo, Nachricht, Betrag)
   * @returns Ergebnis mit Details über Erfolg/Fehler
   */
  static async sendReservationInvitation(
    reservationId: number,
    options?: {
      guestPhone?: string;
      guestEmail?: string;
      customMessage?: string;
      amount?: number;
      currency?: string;
    }
  ): Promise<{
    success: boolean;
    paymentLink?: string;
    checkInLink?: string;
    messageSent: boolean;
    sentAt?: Date;
    error?: string;
  }> {
    try {
      // Lade Reservation mit Organization
      const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
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

      if (!reservation) {
        throw new Error(`Reservierung ${reservationId} nicht gefunden`);
      }

      // Verwende optionale Kontaktinfo oder Reservation-Daten
      const guestPhone = options?.guestPhone || reservation.guestPhone;
      const guestEmail = options?.guestEmail || reservation.guestEmail;
      const amount = options?.amount || reservation.amount || 0;
      const currency = options?.currency || reservation.currency || 'COP';

      // Prüfe ob Kontaktinfo vorhanden ist
      if (!guestPhone && !guestEmail) {
        throw new Error('Keine Kontaktinformation (Telefonnummer oder E-Mail) vorhanden');
      }

      let paymentLink: string | null = null;
      let checkInLink: string | null = null;
      let sentMessage: string | null = null;
      let sentMessageAt: Date | null = null;
      let success = false;
      let errorMessage: string | null = null;
      let whatsappSuccess = false;
      let emailSuccess = false;

      // Schritt 1: Payment-Link IMMER erstellen (wenn Telefonnummer ODER Email vorhanden)
      if (guestPhone || guestEmail) {
        // Verwende bestehenden Payment-Link, falls vorhanden
        if (reservation.paymentLink) {
          paymentLink = reservation.paymentLink;
          console.log(`[ReservationNotification] ✅ Verwende bestehenden Payment-Link: ${paymentLink}`);
        } else {
          // Erstelle neuen Payment-Link nur wenn keiner existiert
          try {
            console.log(`[ReservationNotification] Erstelle Payment-Link für Reservierung ${reservationId}...`);
            const boldPaymentService = new BoldPaymentService(reservation.organizationId);
            // Konvertiere amount zu number (falls Decimal)
            const amountNumber = typeof amount === 'number' ? amount : Number(amount);
            paymentLink = await boldPaymentService.createPaymentLink(
              reservation,
              amountNumber,
              currency,
              `Zahlung für Reservierung ${reservation.guestName}`
            );
            console.log(`[ReservationNotification] ✅ Payment-Link erstellt: ${paymentLink}`);
          } catch (error) {
            console.error(`[ReservationNotification] ❌ Fehler beim Erstellen des Payment-Links:`, error);
            errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim Erstellen des Payment-Links';
            // Payment-Link-Fehler: Log erstellen, aber nicht abbrechen
            // Wir versuchen trotzdem weiterzumachen (z.B. für E-Mail-Versand)
            try {
              await this.logNotification(
                reservationId,
                'invitation',
                guestPhone ? 'whatsapp' : (guestEmail ? 'email' : 'both'),
                false,
                {
                  sentTo: guestPhone || guestEmail || undefined,
                  errorMessage: `Payment-Link konnte nicht erstellt werden: ${errorMessage}`
                }
              );
            } catch (logError) {
              console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für Payment-Link-Fehler:`, logError);
            }
            // Payment-Link-Fehler ist kritisch - ohne Payment-Link können wir keine Notifications versenden
            throw new Error(`Payment-Link konnte nicht erstellt werden: ${errorMessage}`);
          }
        }
      }

      // Schritt 2: Check-in-Link erstellen
      try {
        // Erstelle temporäre Reservation mit guestEmail für Check-in-Link-Generierung
        const reservationForCheckInLink = {
          id: reservation.id,
          guestEmail: guestEmail || reservation.guestEmail || ''
        };
        
        checkInLink = generateLobbyPmsCheckInLink(reservationForCheckInLink) || 
          `${process.env.FRONTEND_URL || 'http://localhost:3000'}/check-in/${reservation.id}`;
        console.log(`[ReservationNotification] ✅ Check-in-Link erstellt: ${checkInLink}`);
      } catch (error) {
        console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Check-in-Links:`, error);
        // Check-in-Link-Fehler ist nicht kritisch - verwende Fallback
        checkInLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/check-in/${reservation.id}`;
      }

      // Schritt 3: WhatsApp-Nachricht senden (wenn Telefonnummer vorhanden)
      if (guestPhone && paymentLink) {
        try {
          console.log(`[ReservationNotification] Sende WhatsApp-Nachricht für Reservierung ${reservationId}...`);
          
          // Verwende Custom Message oder Standard-Nachricht
          if (options?.customMessage) {
            sentMessage = options.customMessage;
            // Ersetze Variablen in Custom Message
            sentMessage = sentMessage
              .replace(/\{\{guestName\}\}/g, reservation.guestName)
              .replace(/\{\{checkInLink\}\}/g, checkInLink)
              .replace(/\{\{paymentLink\}\}/g, paymentLink);
          } else {
            // Standard-Nachricht
            sentMessage = `Hola ${reservation.guestName},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada.
Cargos: ${amount} ${currency}

Puedes realizar el check-in en línea ahora:
${checkInLink}

Por favor, realiza el pago:
${paymentLink}

¡Te esperamos!`;
          }

          const whatsappService = new WhatsAppService(reservation.organizationId);
          // WICHTIG: Für Reservation-Einladungen verwenden wir DIREKT Template Messages
          // Grund: Das 24h-Fenster ist bei neuen Reservierungen meist nicht aktiv
          // Template Messages funktionieren immer, unabhängig vom 24h-Fenster
          
          // Basis-Template-Name (wird basierend auf Sprache angepasst)
          // Spanisch: reservation_checkin_invitation, Englisch: reservation_checkin_invitation_
          const baseTemplateName = process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_checkin_invitation';
          const templateParams = [
            reservation.guestName,
            checkInLink,
            paymentLink
          ];

          console.log(`[ReservationNotification] Verwende DIREKT Template Message (kein Session Message Fallback)`);
          console.log(`[ReservationNotification] Template Name (Basis): ${baseTemplateName}`);
          console.log(`[ReservationNotification] Template Params: ${JSON.stringify(templateParams)}`);

          // Sende direkt als Template Message (ohne Session Message zu versuchen)
          const templateResult = await whatsappService.sendTemplateMessageDirectly(
            guestPhone,
            baseTemplateName,
            templateParams,
            sentMessage // Wird ignoriert, nur für Kompatibilität
          );

          if (!templateResult) {
            throw new Error('Template Message konnte nicht versendet werden');
          }

          sentMessageAt = new Date();
          whatsappSuccess = true;
          console.log(`[ReservationNotification] ✅ WhatsApp-Nachricht erfolgreich versendet`);
          
          // Log erfolgreiche WhatsApp-Notification
          try {
            await this.logNotification(
              reservationId,
              'invitation',
              'whatsapp',
              true,
              {
                sentTo: guestPhone,
                message: sentMessage,
                paymentLink: paymentLink,
                checkInLink: checkInLink
              }
            );
          } catch (logError) {
            console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche Notification:`, logError);
            // Log-Fehler sollte nicht die Hauptfunktionalität beeinträchtigen
          }
        } catch (error) {
          console.error(`[ReservationNotification] ❌ Fehler beim Versenden der WhatsApp-Nachricht:`, error);
          errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim Versenden der WhatsApp-Nachricht';
          // WhatsApp-Fehler ist nicht kritisch - Links wurden bereits erstellt
          // Wir speichern die Links trotzdem, aber Status bleibt auf 'confirmed'
          
          // Log fehlgeschlagene Notification - IMMER versuchen, auch bei Fehlern
          try {
            await this.logNotification(
              reservationId,
              'invitation',
              'whatsapp',
              false,
              {
                sentTo: guestPhone,
                message: sentMessage || undefined,
                paymentLink: paymentLink || undefined,
                checkInLink: checkInLink || undefined,
                errorMessage: errorMessage
              }
            );
          } catch (logError) {
            console.error(`[ReservationNotification] ⚠️ KRITISCH: Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene Notification:`, logError);
            // Selbst wenn das Log fehlschlägt, sollten wir weitermachen
          }
        }
      } else if (guestPhone && !paymentLink) {
        // Telefonnummer vorhanden, aber Payment-Link fehlt - Log erstellen
        try {
          await this.logNotification(
            reservationId,
            'invitation',
            'whatsapp',
            false,
            {
              sentTo: guestPhone,
              errorMessage: 'Payment-Link fehlt - WhatsApp-Nachricht konnte nicht versendet werden'
            }
          );
        } catch (logError) {
          console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags (kein Payment-Link):`, logError);
        }
      }

      // Schritt 3b: Email senden (wenn Email-Adresse vorhanden)
      if (guestEmail && checkInLink && paymentLink) {
        let emailMessage: string = '';
        try {
          console.log(`[ReservationNotification] Sende Email für Reservierung ${reservationId}...`);
          
          // Verwende Custom Message oder Standard-Nachricht (gleicher Text wie WhatsApp)
          if (options?.customMessage) {
            emailMessage = options.customMessage;
            // Ersetze Variablen in Custom Message
            emailMessage = emailMessage
              .replace(/\{\{guestName\}\}/g, reservation.guestName)
              .replace(/\{\{checkInLink\}\}/g, checkInLink)
              .replace(/\{\{paymentLink\}\}/g, paymentLink);
          } else {
            // Standard-Nachricht (gleicher Text wie WhatsApp)
            emailMessage = `Hola ${reservation.guestName},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada.
Cargos: ${amount} ${currency}

Puedes realizar el check-in en línea ahora:
${checkInLink}

Por favor, realiza el pago:
${paymentLink}

¡Te esperamos!`;
          }

          // Konvertiere Plain-Text zu HTML (ähnlich wie sendCheckInInvitationEmail)
          // Ersetze Links im Text durch HTML-Links
          let emailHtmlContent = emailMessage
            .replace(/\n/g, '<br>')
            .replace(new RegExp(checkInLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
              `<a href="${checkInLink}" style="color: #007bff; text-decoration: none; font-weight: bold;">${checkInLink}</a>`)
            .replace(new RegExp(paymentLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
              `<a href="${paymentLink}" style="color: #007bff; text-decoration: none; font-weight: bold;">${paymentLink}</a>`);

          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .container {
                  background-color: #f9fafb;
                  padding: 30px;
                  border-radius: 8px;
                  border: 1px solid #e5e7eb;
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
                .button:hover {
                  background-color: #0056b3;
                }
                .button-container {
                  text-align: center;
                  margin: 20px 0;
                }
                .footer {
                  text-align: center;
                  margin-top: 30px;
                  color: #6b7280;
                  font-size: 12px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                ${emailHtmlContent}
                <div class="button-container">
                  <a href="${checkInLink}" class="button">Online Check-in</a>
                  <a href="${paymentLink}" class="button">Zahlung durchführen</a>
                </div>
              </div>
              <div class="footer">
                <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.</p>
              </div>
            </body>
            </html>
          `;

          // Versende Email
          const emailSent = await sendEmail(
            guestEmail,
            'Tu reserva ha sido confirmada - La Familia Hostel',
            emailHtml,
            emailMessage,
            reservation.organizationId
          );

          if (emailSent) {
            emailSuccess = true;
            console.log(`[ReservationNotification] ✅ Email erfolgreich versendet`);
            
            // Log erfolgreiche Email-Notification
            try {
              await this.logNotification(
                reservationId,
                'invitation',
                'email',
                true,
                {
                  sentTo: guestEmail,
                  message: emailMessage,
                  paymentLink: paymentLink,
                  checkInLink: checkInLink
                }
              );
            } catch (logError) {
              console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche Email-Notification:`, logError);
            }
          } else {
            throw new Error('Email konnte nicht versendet werden');
          }
        } catch (error) {
          console.error(`[ReservationNotification] ❌ Fehler beim Versenden der Email:`, error);
          const emailErrorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler beim Versenden der Email';
          
          // Log fehlgeschlagene Email-Notification
          try {
            await this.logNotification(
              reservationId,
              'invitation',
              'email',
              false,
              {
                sentTo: guestEmail,
                message: emailMessage || undefined,
                paymentLink: paymentLink || undefined,
                checkInLink: checkInLink || undefined,
                errorMessage: emailErrorMsg
              }
            );
          } catch (logError) {
            console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene Email-Notification:`, logError);
          }
        }
      } else if (guestEmail && (!checkInLink || !paymentLink)) {
        // Email vorhanden, aber Links fehlen - Log erstellen
        try {
          await this.logNotification(
            reservationId,
            'invitation',
            'email',
            false,
            {
              sentTo: guestEmail,
              errorMessage: 'Check-in-Link oder Payment-Link fehlt - Email konnte nicht versendet werden'
            }
          );
        } catch (logError) {
          console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags (Email ohne Links):`, logError);
        }
      }

      // Setze success = true wenn mindestens eine Notification erfolgreich war
      success = whatsappSuccess || emailSuccess;

      // Schritt 4: Reservation aktualisieren
      try {
        const updateData: any = {
          paymentLink: paymentLink || undefined,
        };

        // Status auf 'notification_sent' setzen, wenn mindestens eine Notification erfolgreich war
        if (success && sentMessage) {
          updateData.sentMessage = sentMessage;
          updateData.sentMessageAt = sentMessageAt;
          updateData.status = 'notification_sent' as ReservationStatus;
        } else if (paymentLink && !success) {
          // Payment-Link wurde erstellt, aber alle Notifications fehlgeschlagen
          // Status bleibt auf 'confirmed', aber Payment-Link wird gespeichert
          console.log(`[ReservationNotification] ⚠️ Payment-Link gespeichert, aber alle Notifications fehlgeschlagen - Status bleibt auf 'confirmed'`);
        }

        await prisma.reservation.update({
          where: { id: reservationId },
          data: updateData,
        });

        console.log(`[ReservationNotification] ✅ Reservierung ${reservationId} erfolgreich aktualisiert`);
      } catch (error) {
        console.error(`[ReservationNotification] ❌ Fehler beim Aktualisieren der Reservierung:`, error);
        const updateErrorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler beim Aktualisieren der Reservierung';
        
        // Log auch bei Reservation-Update-Fehler erstellen
        try {
          await this.logNotification(
            reservationId,
            'invitation',
            guestPhone ? 'whatsapp' : (guestEmail ? 'email' : 'both'),
            false,
            {
              sentTo: guestPhone || guestEmail || undefined,
              paymentLink: paymentLink || undefined,
              checkInLink: checkInLink || undefined,
              errorMessage: `Reservation-Update fehlgeschlagen: ${updateErrorMsg}`
            }
          );
        } catch (logError) {
          console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für Reservation-Update-Fehler:`, logError);
        }
        
        // Fehler beim Update ist kritisch, aber wir werfen den Fehler nicht, damit der Log erstellt werden kann
        // Stattdessen geben wir den Fehler im Return-Value zurück
        errorMessage = errorMessage || updateErrorMsg;
      }

      return {
        success,
        paymentLink: paymentLink || undefined,
        checkInLink: checkInLink || undefined,
        messageSent: success,
        sentAt: sentMessageAt || undefined,
        error: errorMessage || undefined
      };
    } catch (error) {
      console.error(`[ReservationNotification] Fehler beim Senden der Reservation-Einladung:`, error);
      const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler';
      
      // Log kritischen Fehler (wenn Reservation nicht gefunden wurde, etc.)
      try {
        await this.logNotification(
          reservationId,
          'invitation',
          'whatsapp', // Default, könnte auch 'both' sein
          false,
          {
            errorMessage: errorMsg
          }
        );
      } catch (logError) {
        // Ignoriere Log-Fehler
        console.error(`[ReservationNotification] Fehler beim Loggen des kritischen Fehlers:`, logError);
      }
      
      return {
        success: false,
        messageSent: false,
        error: errorMsg
      };
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
      console.log(`[ReservationNotification] Entschlüssele Settings für Reservation ${reservationId}...`);
      const decryptedSettings = decryptApiSettings(reservation.organization.settings as any);
      const notificationChannels = decryptedSettings?.lobbyPms?.notificationChannels || ['email'];

      console.log(`[ReservationNotification] Notification Channels:`, notificationChannels);
      console.log(`[ReservationNotification] Guest Phone: ${reservation.guestPhone || 'N/A'}`);
      console.log(`[ReservationNotification] Settings entschlüsselt:`, {
        hasDoorSystem: !!decryptedSettings?.doorSystem,
        doorSystemProvider: decryptedSettings?.doorSystem?.provider,
        doorSystemLockIds: decryptedSettings?.doorSystem?.lockIds
      });

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

          // WICHTIG: checkOutDate muss nach checkInDate liegen (mindestens 1 Tag später)
          // Falls beide identisch sind (z.B. bei manuell erstellten Reservierungen), korrigiere
          let actualCheckInDate = reservation.checkInDate;
          let actualCheckOutDate = reservation.checkOutDate;
          
          // Prüfe ob beide Daten identisch oder checkOutDate vor checkInDate liegt
          if (actualCheckOutDate.getTime() <= actualCheckInDate.getTime()) {
            console.warn(`[ReservationNotification] ⚠️ checkOutDate ist identisch oder vor checkInDate - korrigiere auf checkInDate + 1 Tag`);
            actualCheckOutDate = new Date(actualCheckInDate);
            actualCheckOutDate.setDate(actualCheckOutDate.getDate() + 1); // +1 Tag
            console.log(`[ReservationNotification] Korrigierte Check-out Date: ${actualCheckOutDate}`);
          }

          // Erstelle Passcode für Check-in bis Check-out
          doorPin = await ttlockService.createTemporaryPasscode(
            lockId,
            actualCheckInDate,
            actualCheckOutDate,
            `Guest: ${reservation.guestName}`
          );

          console.log(`[ReservationNotification] ✅ TTLock Passcode erfolgreich generiert: ${doorPin}`);

          // Speichere in Reservierung
          await prisma.reservation.update({
            where: { id: reservation.id },
            data: {
              doorPin,
              doorAppName,
              ttlLockId: String(lockId), // Konvertiere zu String für Prisma
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
          const whatsappSuccess = await whatsappService.sendCheckInConfirmation(
            reservation.guestName,
            reservation.guestPhone,
            reservation.roomNumber || 'N/A',
            reservation.roomDescription || 'N/A',
            doorPin || 'N/A',
            doorAppName || 'TTLock'
          );
          if (whatsappSuccess) {
            console.log(`[ReservationNotification] ✅ WhatsApp-Nachricht erfolgreich versendet für Reservierung ${reservationId}`);
          } else {
            console.warn(`[ReservationNotification] ⚠️ WhatsApp-Nachricht konnte nicht versendet werden für Reservierung ${reservationId}`);
          }
        } catch (error) {
          console.error(`[ReservationNotification] ❌ Fehler beim Versenden der WhatsApp-Nachricht:`, error);
          if (error instanceof Error) {
            console.error(`[ReservationNotification] Fehlermeldung: ${error.message}`);
          }
          // Weiter ohne WhatsApp - PIN wurde bereits generiert (oder versucht)
        }
      } else {
        if (!notificationChannels.includes('whatsapp')) {
          console.log(`[ReservationNotification] WhatsApp nicht in Notification Channels für Reservierung ${reservationId}`);
        }
        if (!reservation.guestPhone) {
          console.log(`[ReservationNotification] Keine Guest Phone für Reservierung ${reservationId}`);
        }
      }

      // Prüfe ob PIN tatsächlich generiert wurde
      if (doorPin) {
        console.log(`[ReservationNotification] ✅ PIN generiert und Mitteilung versendet für Reservierung ${reservationId}`);
      } else {
        console.warn(`[ReservationNotification] ⚠️ PIN konnte nicht generiert werden, aber Mitteilung versendet für Reservierung ${reservationId}`);
      }
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
              ttlLockId: String(lockId), // Konvertiere zu String für Prisma
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

