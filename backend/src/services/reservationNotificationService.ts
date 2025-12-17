import { Reservation, ReservationStatus } from '@prisma/client';
import { LobbyPmsService } from './lobbyPmsService';
import { WhatsAppService } from './whatsappService';
import { BoldPaymentService } from './boldPaymentService';
import { TTLockService } from './ttlockService';
import { sendEmail, getOrganizationBranding, generateEmailTemplate } from './emailService';
import { TaskAutomationService } from './taskAutomationService';
import { generateLobbyPmsCheckInLink } from '../utils/checkInLinkUtils';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Default-Templates für Mitteilungen (Fallback wenn keine Branch Settings vorhanden)
 */
const DEFAULT_CHECKIN_INVITATION_TEMPLATES = {
  en: {
    whatsappTemplateName: 'reservation_checkin_invitation_en',
    whatsappTemplateParams: ['{{1}}', '{{2}}', '{{3}}'],
    emailSubject: 'Welcome to La Familia Hostel - Online Check-in',
    emailContent: `Hello {{guestName}},

We are pleased to welcome you to La Familia Hostel! 🎊

In case that you arrive after 18:00 or before 09:00, our recepcion 🛎️ will be closed.

We would then kindly ask you to complete check-in & payment online in advance:

Check-In:
{{checkInLink}}

Please make the payment in advance:
{{paymentLink}}

Please write us briefly once you have completed both the check-in and the payment, so we can send you your pin code 🔑 for the entrance door.

Thank you!

We look forward to seeing you soon!`
  },
  es: {
    whatsappTemplateName: 'reservation_checkin_invitation',
    whatsappTemplateParams: ['{{1}}', '{{2}}', '{{3}}'],
    emailSubject: 'Bienvenido a La Familia Hostel - Check-in en línea',
    emailContent: `Hola {{guestName}},

¡Nos complace darte la bienvenida a La Familia Hostel! 🎊

En caso de que llegues después de las 18:00 o antes de las 09:00, nuestra recepción 🛎️ estará cerrada.

Te pedimos amablemente que completes el check-in y el pago en línea con anticipación:

Check-In:
{{checkInLink}}

Por favor, realiza el pago por adelantado:
{{paymentLink}}

Por favor, escríbenos brevemente una vez que hayas completado tanto el check-in como el pago, para que podamos enviarte tu código PIN 🔑 para la puerta de entrada.

¡Gracias!

¡Esperamos verte pronto!`
  },
  de: {
    whatsappTemplateName: 'reservation_checkin_invitation_de',
    whatsappTemplateParams: ['{{1}}', '{{2}}', '{{3}}'],
    emailSubject: 'Willkommen im La Familia Hostel - Online Check-in',
    emailContent: `Hallo {{guestName}},

wir freuen uns, Sie im La Familia Hostel willkommen zu heißen! 🎊

Falls Sie nach 18:00 Uhr oder vor 09:00 Uhr ankommen, ist unsere Rezeption 🛎️ geschlossen.

Wir bitten Sie freundlich, den Check-in und die Zahlung im Voraus online abzuschließen:

Check-In:
{{checkInLink}}

Bitte zahlen Sie im Voraus:
{{paymentLink}}

Bitte schreiben Sie uns kurz, sobald Sie sowohl den Check-in als auch die Zahlung abgeschlossen haben, damit wir Ihnen Ihren PIN-Code 🔑 für die Eingangstür senden können.

Vielen Dank!

Wir freuen uns darauf, Sie bald zu sehen!`
  }
};

const DEFAULT_CHECKIN_CONFIRMATION_TEMPLATES = {
  en: {
    whatsappTemplateName: 'reservation_checkin_completed_en',
    whatsappTemplateParams: ['{{1}}', '{{2}}'],
    emailSubject: 'Your check-in is completed - Room information',
    emailContent: `Hello {{guestName}},

Your check-in has been completed successfully!

Your room information:
- Room: {{roomDisplay}}
{{roomDescription}}

Access:
- Door PIN: {{doorPin}}

We wish you a pleasant stay!`
  },
  es: {
    whatsappTemplateName: 'reservation_checkin_completed',
    whatsappTemplateParams: ['{{1}}', '{{2}}'],
    emailSubject: 'Tu check-in está completado - Información de habitación',
    emailContent: `Hola {{guestName}},

¡Tu check-in se ha completado exitosamente!

Información de tu habitación:
- Habitación: {{roomDisplay}}
{{roomDescription}}

Acceso:
- PIN de la puerta: {{doorPin}}

¡Te deseamos una estancia agradable!`
  },
  de: {
    whatsappTemplateName: 'reservation_checkin_completed_de',
    whatsappTemplateParams: ['{{1}}', '{{2}}'],
    emailSubject: 'Ihr Check-in ist abgeschlossen - Zimmerinformationen',
    emailContent: `Hallo {{guestName}},

Ihr Check-in wurde erfolgreich abgeschlossen!

Ihre Zimmerinformationen:
- Zimmer: {{roomDisplay}}
{{roomDescription}}

Zugang:
- Tür-PIN: {{doorPin}}

Wir wünschen Ihnen einen angenehmen Aufenthalt!`
  }
};

/**
 * Service für automatische Benachrichtigungen zu Reservierungen
 * 
 * Orchestriert E-Mail/WhatsApp-Versand, Zahlungslinks und Türsystem-PINs
 */
export class ReservationNotificationService {
  /**
   * Lädt Message Template aus Branch Settings (mit Fallback auf Defaults)
   * 
   * @param branchId - Branch ID (optional)
   * @param organizationId - Organization ID
   * @param templateType - Typ des Templates ('checkInInvitation' | 'checkInConfirmation')
   * @param language - Sprache ('en' | 'es' | 'de')
   * @returns Template oder null
   */
  private static async getMessageTemplate(
    branchId: number | null,
    organizationId: number,
    templateType: 'checkInInvitation' | 'checkInConfirmation',
    language: 'en' | 'es' | 'de'
  ): Promise<typeof DEFAULT_CHECKIN_INVITATION_TEMPLATES.en | null> {
    try {
      // 1. Versuche Branch Settings zu laden (falls branchId vorhanden)
      if (branchId) {
        const branch = await prisma.branch.findUnique({
          where: { id: branchId },
          select: { messageTemplates: true }
        });

        if (branch?.messageTemplates) {
          const { decryptBranchApiSettings } = await import('../utils/encryption');
          try {
            const decryptedTemplates = decryptBranchApiSettings(branch.messageTemplates as any);
            const templates = decryptedTemplates as any;
            
            if (templates?.[templateType]?.[language]) {
              return templates[templateType][language];
            }
          } catch (error) {
            logger.warn(`[ReservationNotification] Fehler beim Entschlüsseln der Message Templates für Branch ${branchId}:`, error);
          }
        }
      }

      // 2. Fallback auf Organization Settings (falls vorhanden)
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true }
      });

      if (organization?.settings) {
        const { decryptApiSettings } = await import('../utils/encryption');
        try {
          const decryptedSettings = decryptApiSettings(organization.settings as any);
          const templates = decryptedSettings?.messageTemplates as any;
          
          if (templates?.[templateType]?.[language]) {
            return templates[templateType][language];
          }
        } catch (error) {
          logger.warn(`[ReservationNotification] Fehler beim Entschlüsseln der Message Templates für Organization ${organizationId}:`, error);
        }
      }

      // 3. Fallback auf Hardcoded Defaults
      if (templateType === 'checkInInvitation') {
        return DEFAULT_CHECKIN_INVITATION_TEMPLATES[language];
      } else {
        return DEFAULT_CHECKIN_CONFIRMATION_TEMPLATES[language];
      }
    } catch (error) {
      logger.error(`[ReservationNotification] Fehler beim Laden des Message Templates:`, error);
      // Fallback auf Defaults bei Fehler
      if (templateType === 'checkInInvitation') {
        return DEFAULT_CHECKIN_INVITATION_TEMPLATES[language];
      } else {
        return DEFAULT_CHECKIN_CONFIRMATION_TEMPLATES[language];
      }
    }
  }

  /**
   * Ersetzt Variablen in Template-Text
   * 
   * @param templateText - Template-Text mit Variablen (z.B. "Hello {{guestName}}")
   * @param variables - Objekt mit Variablen-Werten
   * @returns Text mit ersetzten Variablen
   */
  private static replaceTemplateVariables(templateText: string, variables: Record<string, string>): string {
    let result = templateText;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
  }

  /**
   * Lädt roomDescription aus Branch-Settings (falls categoryId vorhanden)
   * 
   * @param reservation - Reservation mit optionalem categoryId
   * @param languageCode - Sprache für Labels ('en' | 'es' | 'de')
   * @returns Formatierte roomDescription oder Fallback auf reservation.roomDescription
   */
  public static async loadRoomDescriptionFromBranchSettings(
    reservation: Reservation & { categoryId?: number },
    languageCode: 'en' | 'es' | 'de'
  ): Promise<string> {
    // Fallback auf reservation.roomDescription
    let roomDescription: string = reservation.roomDescription || 'N/A';
    
    // Prüfe ob categoryId und branchId vorhanden
    const categoryId = (reservation as any).categoryId;
    if (categoryId == null || !reservation.branchId) {
      return roomDescription;
    }

    try {
      // Lade Branch mit nur lobbyPmsSettings (Performance: nur benötigtes Feld)
      const branch = await prisma.branch.findUnique({
        where: { id: reservation.branchId },
        select: { lobbyPmsSettings: true }
      });
      
      if (branch?.lobbyPmsSettings) {
        const { decryptBranchApiSettings } = require('../utils/encryption');
        const decryptedSettings = decryptBranchApiSettings(branch.lobbyPmsSettings as any);
        const lobbyPmsSettings = decryptedSettings?.lobbyPms || decryptedSettings;
        const roomDesc = lobbyPmsSettings?.roomDescriptions?.[categoryId];
        
        if (roomDesc) {
          // Übersetzungen für Bild/Video Labels
          const imageLabel = languageCode === 'en' ? 'Image' : languageCode === 'es' ? 'Imagen' : 'Bild';
          const videoLabel = languageCode === 'en' ? 'Video' : languageCode === 'es' ? 'Video' : 'Video';
          
          // Formatiere Beschreibung: Text + Bild-Link + Video-Link
          const parts: string[] = [];
          if (roomDesc.text) {
            parts.push(roomDesc.text);
          }
          if (roomDesc.imageUrl) {
            parts.push(`${imageLabel}: ${roomDesc.imageUrl}`);
          }
          if (roomDesc.videoUrl) {
            parts.push(`${videoLabel}: ${roomDesc.videoUrl}`);
          }
          roomDescription = parts.length > 0 ? parts.join('\n') : reservation.roomDescription || 'N/A';
        }
      }
    } catch (error) {
      logger.warn(`[ReservationNotification] Fehler beim Laden der Zimmer-Beschreibung aus Branch-Settings:`, error);
      // Fallback auf reservation.roomDescription
      roomDescription = reservation.roomDescription || 'N/A';
    }

    return roomDescription;
  }

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
      logger.log(`[ReservationNotification] ✅ Log-Eintrag erstellt für Reservation ${reservationId}, Type: ${notificationType}, Success: ${success}`);
    } catch (error) {
      // Log-Fehler sollten nicht die Hauptfunktionalität beeinträchtigen
      logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags:`, error);
    }
  }
  /**
   * Sendet Check-in-Einladungen an Gäste mit späten Ankünften
   * 
   * Wird täglich um 20:00 Uhr ausgeführt
   * Sendet an Gäste mit Ankunft am nächsten Tag nach 18:00 Uhr
   */
  static async sendLateCheckInInvitations(): Promise<void> {
    logger.log('[ReservationNotification] Starte Versand von Check-in-Einladungen...');

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

          const lateCheckInThreshold = lobbyPmsSettings.lateCheckInThreshold || '18:00';
          const notificationChannels = lobbyPmsSettings.notificationChannels || ['email'];

          logger.log(`[ReservationNotification] Verarbeite Organisation ${organization.id}...`);

          // Hole Reservierungen für morgen mit Ankunft nach Threshold
          // WICHTIG: Iteriere über alle Branches, da fetchTomorrowReservations branch-spezifisch ist
          const branches = await prisma.branch.findMany({
            where: { organizationId: organization.id },
            select: { id: true, lobbyPmsSettings: true }
          });

          let totalReservations = 0;
          for (const branch of branches) {
            try {
              // Prüfe ob Branch LobbyPMS aktiviert hat
              if (!branch.lobbyPmsSettings) continue;
              
              const { decryptBranchApiSettings } = await import('../utils/encryption');
              const settings = decryptBranchApiSettings(branch.lobbyPmsSettings as any);
              const lobbyPmsSettings = settings?.lobbyPms || settings;
              if (!lobbyPmsSettings?.apiKey || !lobbyPmsSettings?.syncEnabled) continue;

              // Erstelle Service für Branch
              const lobbyPmsService = await LobbyPmsService.createForBranch(branch.id);
              const tomorrowReservations = await lobbyPmsService.fetchTomorrowReservations(lateCheckInThreshold);
              totalReservations += tomorrowReservations.length;

              for (const lobbyReservation of tomorrowReservations) {
                try {
                  // Synchronisiere Reservierung in lokale DB
                  // (Task wird automatisch in syncReservation erstellt)
                  const reservation = await lobbyPmsService.syncReservation(lobbyReservation);

                  // Prüfe ob bereits Einladung versendet wurde
                  if (reservation.invitationSentAt) {
                    logger.log(`[ReservationNotification] Einladung bereits versendet für Reservierung ${reservation.id}`);
                    continue;
                  }

                  // Erstelle Zahlungslink
                  const boldPaymentService = reservation.branchId
                    ? await BoldPaymentService.createForBranch(reservation.branchId)
                    : new BoldPaymentService(organization.id);
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
                    const whatsappService = reservation.branchId
                      ? new WhatsAppService(undefined, reservation.branchId)
                      : new WhatsAppService(organization.id);
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

                  logger.log(`[ReservationNotification] Einladung versendet für Reservierung ${reservation.id}`);
                } catch (error) {
                  logger.error(`[ReservationNotification] Fehler bei Reservierung ${lobbyReservation.id}:`, error);
                  // Weiter mit nächster Reservierung
                }
              }
            } catch (error) {
              logger.error(`[ReservationNotification] Fehler bei Branch ${branch.id}:`, error);
              // Weiter mit nächstem Branch
            }
          }

          logger.log(`[ReservationNotification] Organisation ${organization.id}: ${totalReservations} Reservierungen verarbeitet`);
        } catch (error) {
          logger.error(`[ReservationNotification] Fehler bei Organisation ${organization.id}:`, error);
          // Weiter mit nächster Organisation
        }
      }

      logger.log('[ReservationNotification] Versand abgeschlossen');
    } catch (error) {
      logger.error('[ReservationNotification] Fehler beim Versand:', error);
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
          logger.log(`[ReservationNotification] ✅ Verwende bestehenden Payment-Link: ${paymentLink}`);
        } else {
          // Erstelle neuen Payment-Link nur wenn keiner existiert
          try {
            logger.log(`[ReservationNotification] Erstelle Payment-Link für Reservierung ${reservationId}...`);
            const boldPaymentService = reservation.branchId
              ? await BoldPaymentService.createForBranch(reservation.branchId)
              : new BoldPaymentService(reservation.organizationId);
            // Konvertiere amount zu number (falls Decimal)
            const amountNumber = typeof amount === 'number' ? amount : Number(amount);
            paymentLink = await boldPaymentService.createPaymentLink(
              reservation,
              amountNumber,
              currency,
              `Zahlung für Reservierung ${reservation.guestName}`
            );
            logger.log(`[ReservationNotification] ✅ Payment-Link erstellt: ${paymentLink}`);
          } catch (error) {
            logger.error(`[ReservationNotification] ❌ Fehler beim Erstellen des Payment-Links:`, error);
            errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim Erstellen des Payment-Links';
            // Payment-Link-Fehler: Log erstellen, aber nicht abbrechen
            // Wir versuchen trotzdem weiterzumachen (z.B. für E-Mail-Versand)
            try {
              await this.logNotification(
                reservationId,
                'invitation',
                (guestPhone && guestEmail) ? 'both' : (guestPhone ? 'whatsapp' : (guestEmail ? 'email' : 'both')),
                false,
                {
                  sentTo: guestPhone || guestEmail || undefined,
                  errorMessage: `Payment-Link konnte nicht erstellt werden: ${errorMessage}`
                }
              );
            } catch (logError) {
              logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für Payment-Link-Fehler:`, logError);
            }
            // Payment-Link-Fehler ist kritisch - ohne Payment-Link können wir keine Notifications versenden
            throw new Error(`Payment-Link konnte nicht erstellt werden: ${errorMessage}`);
          }
        }
      }

      // Schritt 2: Check-in-Link erstellen
      try {
        // WICHTIG: Check-in-Link IMMER mit der ursprünglich importierten E-Mail generieren
        // (reservation.guestEmail), nicht mit der geänderten E-Mail aus options
        // Der Check-in-Link muss immer die Original-E-Mail verwenden, die beim Import verwendet wurde
        // WICHTIG: Verwende lobbyReservationId (LobbyPMS booking_id) als codigo, nicht die interne ID
        const reservationForCheckInLink = {
          id: reservation.id,
          lobbyReservationId: reservation.lobbyReservationId,
          guestEmail: reservation.guestEmail || ''
        };
        
        checkInLink = generateLobbyPmsCheckInLink(reservationForCheckInLink) || 
          `${process.env.FRONTEND_URL || 'http://localhost:3000'}/check-in/${reservation.id}`;
        logger.log(`[ReservationNotification] ✅ Check-in-Link erstellt (mit Original-E-Mail): ${checkInLink}`);
      } catch (error) {
        logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Check-in-Links:`, error);
        // Check-in-Link-Fehler ist nicht kritisch - verwende Fallback
        checkInLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/check-in/${reservation.id}`;
      }

      // Schritt 3: WhatsApp-Nachricht senden (wenn Telefonnummer vorhanden)
      if (guestPhone && paymentLink) {
        try {
          logger.log(`[ReservationNotification] Sende WhatsApp-Nachricht für Reservierung ${reservationId}...`);
          
          // Verwende Custom Message oder Standard-Nachricht
          if (options?.customMessage) {
            sentMessage = options.customMessage;
            // Ersetze Variablen in Custom Message
            sentMessage = sentMessage
              .replace(/\{\{guestName\}\}/g, reservation.guestName)
              .replace(/\{\{checkInLink\}\}/g, checkInLink)
              .replace(/\{\{paymentLink\}\}/g, paymentLink);
          } else {
            // NEU: Lade Template aus Branch Settings (mit Fallback auf Defaults)
            const { CountryLanguageService } = require('./countryLanguageService');
            const languageCode = CountryLanguageService.getLanguageForReservation({
              guestNationality: reservation.guestNationality,
              guestPhone: reservation.guestPhone
            }) as 'en' | 'es' | 'de';

            const template = await this.getMessageTemplate(
              reservation.branchId,
              reservation.organizationId,
              'checkInInvitation',
              languageCode
            );

            if (template) {
              // Ersetze Variablen im Template
              sentMessage = this.replaceTemplateVariables(template.emailContent, {
                guestName: reservation.guestName,
                checkInLink: checkInLink,
                paymentLink: paymentLink
              });
            } else {
              // Fallback auf alte hardcodierte Nachricht (sollte nicht passieren)
              logger.warn(`[ReservationNotification] Kein Template gefunden, verwende Fallback`);
            if (languageCode === 'en') {
              sentMessage = `Hello ${reservation.guestName},

We are pleased to welcome you to La Familia Hostel!

As you will arrive after 18:00, you can complete the online check-in now:
${checkInLink}

Please make the payment in advance:
${paymentLink}

Please write us briefly once you have completed both the check-in and payment. Thank you!

We look forward to seeing you tomorrow!`;
            } else {
              sentMessage = `Hola ${reservation.guestName},

¡Nos complace darte la bienvenida a La Familia Hostel!

Como llegarás después de las 18:00, puedes realizar el check-in en línea ahora:
${checkInLink}

Por favor, realiza el pago por adelantado:
${paymentLink}

Por favor, escríbenos brevemente una vez que hayas completado tanto el check-in como el pago. ¡Gracias!

¡Te esperamos mañana!`;
              }
            }
          }

          const whatsappService = reservation.branchId
            ? new WhatsAppService(undefined, reservation.branchId)
            : new WhatsAppService(reservation.organizationId);
          // WICHTIG: Versuche zuerst Session Message (24h-Fenster), bei Fehler: Template Message
          // Grund: Session Messages sind günstiger, Template Messages funktionieren immer
          
          // NEU: Lade Template-Name und Parameter aus Branch Settings
          const { CountryLanguageService: CLS2 } = require('./countryLanguageService');
          const whatsappLanguageCode = CLS2.getLanguageForReservation({
            guestNationality: reservation.guestNationality,
            guestPhone: reservation.guestPhone
          }) as 'en' | 'es' | 'de';
          
          const whatsappTemplate = await this.getMessageTemplate(
            reservation.branchId,
            reservation.organizationId,
            'checkInInvitation',
            whatsappLanguageCode
          );
          
          // Basis-Template-Name aus Settings (mit Fallback)
          const baseTemplateName = whatsappTemplate?.whatsappTemplateName || 
            process.env.WHATSAPP_TEMPLATE_CHECKIN_INVITATION || 
            'reservation_checkin_invitation';
          
          // Template-Parameter aus Settings (mit Fallback)
          // WICHTIG: Template-Parameter müssen die tatsächlichen Werte enthalten, nicht die Platzhalter
          const templateParams = whatsappTemplate?.whatsappTemplateParams?.length > 0
            ? whatsappTemplate.whatsappTemplateParams.map((param: string) => {
                // Ersetze Variablen-Platzhalter in Template-Parametern durch tatsächliche Werte
                return param
                  .replace(/\{\{1\}\}/g, reservation.guestName)
                  .replace(/\{\{2\}\}/g, checkInLink)
                  .replace(/\{\{3\}\}/g, paymentLink)
                  .replace(/\{\{guestName\}\}/g, reservation.guestName)
                  .replace(/\{\{checkInLink\}\}/g, checkInLink)
                  .replace(/\{\{paymentLink\}\}/g, paymentLink);
              })
            : [
            reservation.guestName,
            checkInLink,
            paymentLink
          ];

          logger.log(`[ReservationNotification] Versuche Session Message (24h-Fenster), bei Fehler: Template Message`);
          logger.log(`[ReservationNotification] Template Name (Basis): ${baseTemplateName}`);
          logger.log(`[ReservationNotification] Template Params: ${JSON.stringify(templateParams)}`);

          // Versuche zuerst Session Message (wenn 24h-Fenster aktiv), bei Fehler: Template Message
          const whatsappSuccessResult = await whatsappService.sendMessageWithFallback(
            guestPhone,
            sentMessage, // Wird jetzt verwendet (Session Message oder Fallback)
            baseTemplateName,
            templateParams,
            {
              guestNationality: reservation.guestNationality,
              guestPhone: reservation.guestPhone
            }
          );

          if (!whatsappSuccessResult) {
            throw new Error('WhatsApp-Nachricht konnte nicht versendet werden');
          }

          sentMessageAt = new Date();
          whatsappSuccess = whatsappSuccessResult;
          logger.log(`[ReservationNotification] ✅ WhatsApp-Nachricht erfolgreich versendet`);
          
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
            logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche Notification:`, logError);
            // Log-Fehler sollte nicht die Hauptfunktionalität beeinträchtigen
          }
        } catch (error) {
          logger.error(`[ReservationNotification] ❌ Fehler beim Versenden der WhatsApp-Nachricht:`, error);
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
            logger.error(`[ReservationNotification] ⚠️ KRITISCH: Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene Notification:`, logError);
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
          logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags (kein Payment-Link):`, logError);
        }
      }

      // Schritt 3b: Email senden (wenn Email-Adresse vorhanden)
      if (guestEmail && checkInLink && paymentLink) {
        let emailMessage: string = '';
        try {
          logger.log(`[ReservationNotification] Sende Email für Reservierung ${reservationId}...`);
          
          // Verwende Custom Message oder Standard-Nachricht (gleicher Text wie WhatsApp)
          if (options?.customMessage) {
            emailMessage = options.customMessage;
            // Ersetze Variablen in Custom Message
            emailMessage = emailMessage
              .replace(/\{\{guestName\}\}/g, reservation.guestName)
              .replace(/\{\{checkInLink\}\}/g, checkInLink)
              .replace(/\{\{paymentLink\}\}/g, paymentLink);
            // Setze auch sentMessage für Reservation-Update
            sentMessage = emailMessage;
          } else {
            // NEU: Lade Template aus Branch Settings (mit Fallback auf Defaults)
            const { CountryLanguageService } = require('./countryLanguageService');
            const languageCode = CountryLanguageService.getLanguageForReservation({
              guestNationality: reservation.guestNationality,
              guestPhone: reservation.guestPhone
            }) as 'en' | 'es' | 'de';

            const template = await this.getMessageTemplate(
              reservation.branchId,
              reservation.organizationId,
              'checkInInvitation',
              languageCode
            );

            if (template) {
              // Ersetze Variablen im Template
              emailMessage = this.replaceTemplateVariables(template.emailContent, {
                guestName: reservation.guestName,
                checkInLink: checkInLink,
                paymentLink: paymentLink
              });
            } else {
              // Fallback auf alte hardcodierte Nachricht (sollte nicht passieren)
              logger.warn(`[ReservationNotification] Kein Template gefunden für Email, verwende Fallback`);
            if (languageCode === 'en') {
              emailMessage = `Hello ${reservation.guestName},

We are pleased to welcome you to La Familia Hostel!

As you will arrive after 18:00, you can complete the online check-in now:
${checkInLink}

Please make the payment in advance:
${paymentLink}

Please write us briefly once you have completed both the check-in and payment. Thank you!

We look forward to seeing you tomorrow!`;
            } else {
              emailMessage = `Hola ${reservation.guestName},

¡Nos complace darte la bienvenida a La Familia Hostel!

Como llegarás después de las 18:00, puedes realizar el check-in en línea ahora:
${checkInLink}

Por favor, realiza el pago por adelantado:
${paymentLink}

Por favor, escríbenos brevemente una vez que hayas completado tanto el check-in como el pago. ¡Gracias!

¡Te esperamos mañana!`;
              }
            }
            // Setze auch sentMessage für Reservation-Update
            sentMessage = emailMessage;
          }

          // Konvertiere Plain-Text zu HTML (ähnlich wie sendCheckInInvitationEmail)
          // Lade Logo + Branding (nutzt gespeichertes Branding, keine API-Calls)
          const { logo, branding } = await getOrganizationBranding(
            reservation.organizationId,
            reservation.branchId || undefined
          );

          // Lade Organisationsname für Header
          let organizationName = 'La Familia Hostel';
          if (reservation.organizationId) {
            const organization = await prisma.organization.findUnique({
              where: { id: reservation.organizationId },
              select: { displayName: true, name: true }
            });
            if (organization?.displayName) {
              organizationName = organization.displayName;
            } else if (organization?.name) {
              organizationName = organization.name;
            }
          }

          // Ersetze Links im Text durch formattierte Linktexte
          const buttonColor = branding?.colors?.primary || '#007bff';
          const checkInLabel =
            emailLanguageCode === 'en' ? 'Online Check-in' :
            emailLanguageCode === 'es' ? 'Check-in en línea' :
            'Online Check-in';
          const paymentLabel =
            emailLanguageCode === 'en' ? 'Make Payment' :
            emailLanguageCode === 'es' ? 'Realizar pago' :
            'Zahlung durchführen';

          let emailHtmlContent = emailMessage
            .replace(/\n/g, '<br>')
            .replace(new RegExp(checkInLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
              `<a href="${checkInLink}" style="color: ${buttonColor}; text-decoration: none; font-weight: 600;">${checkInLabel}</a>`)
            .replace(new RegExp(paymentLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
              `<a href="${paymentLink}" style="color: ${buttonColor}; text-decoration: none; font-weight: 600;">${paymentLabel}</a>`);

          // NEU: Lade Email-Betreff aus Template
          const { CountryLanguageService: CLS } = require('./countryLanguageService');
          const emailLanguageCode = CLS.getLanguageForReservation({
            guestNationality: reservation.guestNationality,
            guestPhone: reservation.guestPhone
          }) as 'en' | 'es' | 'de';
          
          const emailTemplate = await this.getMessageTemplate(
            reservation.branchId,
            reservation.organizationId,
            'checkInInvitation',
            emailLanguageCode
          );
          
          const emailSubject = emailTemplate?.emailSubject || 'Tu reserva ha sido confirmada - La Familia Hostel';

          // Generiere E-Mail mit Template
          const emailHtml = generateEmailTemplate({
            logo,
            branding,
            headerTitle: organizationName,
            content: emailHtmlContent,
            language: emailLanguageCode
          });

          // Versende Email
          const emailSent = await sendEmail(
            guestEmail,
            emailSubject,
            emailHtml,
            emailMessage,
            reservation.organizationId,
            reservation.branchId || undefined
          );

          if (emailSent) {
            emailSuccess = true;
            logger.log(`[ReservationNotification] ✅ Email erfolgreich versendet`);
            
            // Setze sentMessageAt auch bei Email-Versand
            if (!sentMessageAt) {
              sentMessageAt = new Date();
            }
            
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
              logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche Email-Notification:`, logError);
            }
          } else {
            throw new Error('Email konnte nicht versendet werden');
          }
        } catch (error) {
          logger.error(`[ReservationNotification] ❌ Fehler beim Versenden der Email:`, error);
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
            logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene Email-Notification:`, logError);
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
          logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags (Email ohne Links):`, logError);
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
        // sentMessage wird jetzt auch bei Email-Versand gesetzt (Zeile 470, 488)
        if (success && sentMessage) {
          updateData.sentMessage = sentMessage;
          updateData.sentMessageAt = sentMessageAt;
          updateData.status = 'notification_sent' as ReservationStatus;
        } else if (paymentLink && !success) {
          // Payment-Link wurde erstellt, aber alle Notifications fehlgeschlagen
          // Status bleibt auf 'confirmed', aber Payment-Link wird gespeichert
          logger.log(`[ReservationNotification] ⚠️ Payment-Link gespeichert, aber alle Notifications fehlgeschlagen - Status bleibt auf 'confirmed'`);
        }

        await prisma.reservation.update({
          where: { id: reservationId },
          data: updateData,
        });

        logger.log(`[ReservationNotification] ✅ Reservierung ${reservationId} erfolgreich aktualisiert`);
      } catch (error) {
        logger.error(`[ReservationNotification] ❌ Fehler beim Aktualisieren der Reservierung:`, error);
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
          logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für Reservation-Update-Fehler:`, logError);
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
      logger.error(`[ReservationNotification] Fehler beim Senden der Reservation-Einladung:`, error);
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
        logger.error(`[ReservationNotification] Fehler beim Loggen des kritischen Fehlers:`, logError);
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
        include: { organization: true, branch: true }
      });

      if (!reservation) {
        throw new Error(`Reservierung ${reservationId} nicht gefunden`);
      }

      // Entschlüssele Settings (aus Branch oder Organisation)
      const { decryptApiSettings, decryptBranchApiSettings } = await import('../utils/encryption');
      logger.log(`[ReservationNotification] Entschlüssele Settings für Reservation ${reservationId}...`);
      
      let decryptedSettings: any = null;
      let doorSystemSettings: any = null;
      
      // Lade Settings aus Branch oder Organisation
      if (reservation.branchId && reservation.branch?.doorSystemSettings) {
        const branchSettings = decryptBranchApiSettings(reservation.branch.doorSystemSettings as any);
        doorSystemSettings = branchSettings?.doorSystem || branchSettings;
        // Für notificationChannels: Fallback auf Organisation
        const orgSettings = decryptApiSettings(reservation.organization.settings as any);
        decryptedSettings = orgSettings;
      } else {
        decryptedSettings = decryptApiSettings(reservation.organization.settings as any);
        doorSystemSettings = decryptedSettings?.doorSystem;
      }
      
      const notificationChannels = decryptedSettings?.lobbyPms?.notificationChannels || ['email'];

      logger.log(`[ReservationNotification] Notification Channels:`, notificationChannels);
      logger.log(`[ReservationNotification] Guest Phone: ${reservation.guestPhone || 'N/A'}`);
      logger.log(`[ReservationNotification] Settings entschlüsselt:`, {
        hasDoorSystem: !!doorSystemSettings,
        doorSystemProvider: doorSystemSettings?.provider,
        doorSystemLockIds: doorSystemSettings?.lockIds
      });

      // Erstelle TTLock Passcode
      let doorPin: string | null = null;
      let doorAppName: string | null = null;

      logger.log(`[ReservationNotification] Starte PIN-Generierung für Reservation ${reservationId}...`);

      try {
        const ttlockService = reservation.branchId
          ? await TTLockService.createForBranch(reservation.branchId)
          : new TTLockService(reservation.organizationId);

        logger.log(`[ReservationNotification] Door System Settings:`, {
          hasDoorSystem: !!doorSystemSettings,
          hasLockIds: !!doorSystemSettings?.lockIds,
          lockIds: doorSystemSettings?.lockIds,
          lockIdsLength: doorSystemSettings?.lockIds?.length || 0
        });

        if (doorSystemSettings?.lockIds && doorSystemSettings.lockIds.length > 0) {
          const lockId = doorSystemSettings.lockIds[0]; // Verwende ersten Lock
          doorAppName = 'TTLock'; // Oder aus Settings: doorSystemSettings.appName

          logger.log(`[ReservationNotification] Erstelle TTLock Passcode für Lock ID: ${lockId}`);
          logger.log(`[ReservationNotification] Check-in Date: ${reservation.checkInDate}`);
          logger.log(`[ReservationNotification] Check-out Date: ${reservation.checkOutDate}`);

          // WICHTIG: checkOutDate muss nach checkInDate liegen (mindestens 1 Tag später)
          // Falls beide identisch sind (z.B. bei manuell erstellten Reservierungen), korrigiere
          let actualCheckInDate = reservation.checkInDate;
          let actualCheckOutDate = reservation.checkOutDate;
          
          // Prüfe ob beide Daten identisch oder checkOutDate vor checkInDate liegt
          if (actualCheckOutDate.getTime() <= actualCheckInDate.getTime()) {
            logger.warn(`[ReservationNotification] ⚠️ checkOutDate ist identisch oder vor checkInDate - korrigiere auf checkInDate + 1 Tag`);
            actualCheckOutDate = new Date(actualCheckInDate);
            actualCheckOutDate.setDate(actualCheckOutDate.getDate() + 1); // +1 Tag
            logger.log(`[ReservationNotification] Korrigierte Check-out Date: ${actualCheckOutDate}`);
          }

          // Erstelle Passcode für Check-in bis Check-out
          doorPin = await ttlockService.createTemporaryPasscode(
            lockId,
            actualCheckInDate,
            actualCheckOutDate,
            `Guest: ${reservation.guestName}`
          );

          logger.log(`[ReservationNotification] ✅ TTLock Passcode erfolgreich generiert: ${doorPin}`);

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

          logger.log(`[ReservationNotification] ✅ PIN in DB gespeichert für Reservation ${reservationId}`);
        } else {
          logger.warn(`[ReservationNotification] ⚠️ Keine Lock IDs konfiguriert für Reservation ${reservationId}`);
        }
      } catch (error) {
        logger.error(`[ReservationNotification] ❌ Fehler beim Erstellen des TTLock Passcodes:`, error);
        if (error instanceof Error) {
          logger.error(`[ReservationNotification] Fehlermeldung: ${error.message}`);
          logger.error(`[ReservationNotification] Stack: ${error.stack}`);
        }
        // Weiter ohne PIN
      }

      // Versende Benachrichtigungen
      let emailSuccess = false;
      let whatsappSuccess = false;
      let emailError: string | null = null;
      let whatsappError: string | null = null;
      const messageText = doorPin 
        ? `Hola ${reservation.guestName},\n\n¡Bienvenido a La Familia Hostel!\n\nTu código de acceso TTLock:\n${doorPin}\n\n¡Te esperamos!`
        : null;

      if (notificationChannels.includes('email') && reservation.guestEmail) {
        try {
          await this.sendCheckInConfirmationEmail(
            reservation,
            doorPin,
            doorAppName
          );
          emailSuccess = true;
          logger.log(`[ReservationNotification] ✅ E-Mail erfolgreich versendet für Reservierung ${reservationId}`);
          
          // Log erfolgreiche Email-Notification
          try {
            await this.logNotification(
              reservationId,
              'pin',
              'email',
              true,
              {
                sentTo: reservation.guestEmail,
                message: messageText || undefined
              }
            );
          } catch (logError) {
            logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche Email-Notification:`, logError);
          }
        } catch (error) {
          logger.error(`[ReservationNotification] Fehler beim Versenden der E-Mail:`, error);
          emailError = error instanceof Error ? error.message : 'Unbekannter Fehler beim Versenden der E-Mail';
          
          // Log fehlgeschlagene Email-Notification
          try {
            await this.logNotification(
              reservationId,
              'pin',
              'email',
              false,
              {
                sentTo: reservation.guestEmail,
                message: messageText || undefined,
                errorMessage: emailError
              }
            );
          } catch (logError) {
            logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene Email-Notification:`, logError);
          }
        }
      }

      // ⚠️ TEMPORÄR DEAKTIVIERT: WhatsApp-Versendung nach TTLock-Webhook
      // TTLock-Code wird weiterhin erstellt und im Frontend angezeigt, aber nicht versendet
      if (notificationChannels.includes('whatsapp') && reservation.guestPhone) {
        logger.log(`[ReservationNotification] ⚠️ WhatsApp-Versendung temporär deaktiviert - TTLock-Code ${doorPin ? `(${doorPin})` : ''} wird nur im Frontend angezeigt`);
        // TODO: Wieder aktivieren, wenn gewünscht
        /*
        try {
          const whatsappService = reservation.branchId
            ? new WhatsAppService(undefined, reservation.branchId)
            : new WhatsAppService(reservation.organizationId);
          
          // Ermittle Sprache für roomDescription
          const { CountryLanguageService } = require('./countryLanguageService');
          const languageCode = CountryLanguageService.getLanguageForReservation({
            guestNationality: reservation.guestNationality,
            guestPhone: reservation.guestPhone
          }) as 'en' | 'es' | 'de';
          
          // Lade roomDescription aus Branch-Settings
          const roomDescription = await this.loadRoomDescriptionFromBranchSettings(
            reservation,
            languageCode
          );
          
          // Formatiere Zimmer-Anzeige: Dorm = "Zimmername (Bettnummer)", Private = "Zimmername"
          const isDorm = reservation.roomNumber !== null && reservation.roomNumber.trim() !== '';
          let roomDisplay: string;
          if (isDorm) {
            // Dorm: "Zimmername (Bettnummer)"
            const roomName = reservation.roomDescription?.trim() || '';
            const bedNumber = reservation.roomNumber?.trim() || '';
            roomDisplay = roomName && bedNumber ? `${roomName} (${bedNumber})` : (roomName || bedNumber || 'N/A');
          } else {
            // Private: "Zimmername"
            roomDisplay = reservation.roomDescription?.trim() || 'N/A';
          }
          
          const whatsappSuccessResult = await whatsappService.sendCheckInConfirmation(
            reservation.guestName,
            reservation.guestPhone,
            roomDisplay, // Formatierte Zimmer-Anzeige
            roomDescription, // roomDescription aus Branch-Settings
            doorPin || 'N/A',
            doorAppName || 'TTLock',
            {
              guestNationality: reservation.guestNationality,
              guestPhone: reservation.guestPhone
            }
          );
          whatsappSuccess = whatsappSuccessResult;
          
          if (whatsappSuccess) {
            logger.log(`[ReservationNotification] ✅ WhatsApp-Nachricht erfolgreich versendet für Reservierung ${reservationId}`);
            
            // Log erfolgreiche WhatsApp-Notification
            try {
              await this.logNotification(
                reservationId,
                'pin',
                'whatsapp',
                true,
                {
                  sentTo: reservation.guestPhone,
                  message: messageText || undefined
                }
              );
            } catch (logError) {
              logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche WhatsApp-Notification:`, logError);
            }
          } else {
            logger.warn(`[ReservationNotification] ⚠️ WhatsApp-Nachricht konnte nicht versendet werden für Reservierung ${reservationId}`);
            whatsappError = 'WhatsApp-Nachricht konnte nicht versendet werden';
            
            // Log fehlgeschlagene WhatsApp-Notification
            try {
              await this.logNotification(
                reservationId,
                'pin',
                'whatsapp',
                false,
                {
                  sentTo: reservation.guestPhone,
                  message: messageText || undefined,
                  errorMessage: whatsappError
                }
              );
            } catch (logError) {
              logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene WhatsApp-Notification:`, logError);
            }
          }
        } catch (error) {
          logger.error(`[ReservationNotification] ❌ Fehler beim Versenden der WhatsApp-Nachricht:`, error);
          whatsappError = error instanceof Error ? error.message : 'Unbekannter Fehler beim Versenden der WhatsApp-Nachricht';
        }
        */
      } else {
        if (!notificationChannels.includes('whatsapp')) {
          logger.log(`[ReservationNotification] WhatsApp nicht in Notification Channels für Reservierung ${reservationId}`);
        }
        if (!reservation.guestPhone) {
          logger.log(`[ReservationNotification] Keine Guest Phone für Reservierung ${reservationId}`);
        }
      }

      // Log auch wenn PIN nicht generiert werden konnte
      if (!doorPin) {
        logger.warn(`[ReservationNotification] ⚠️ PIN konnte nicht generiert werden für Reservierung ${reservationId}`);
        try {
          await this.logNotification(
            reservationId,
            'pin',
            reservation.guestPhone && reservation.guestEmail ? 'both' : (reservation.guestPhone ? 'whatsapp' : (reservation.guestEmail ? 'email' : 'whatsapp')),
            false,
            {
              sentTo: reservation.guestPhone || reservation.guestEmail || undefined,
              errorMessage: 'PIN konnte nicht generiert werden - keine Lock IDs konfiguriert oder Fehler beim Erstellen'
            }
          );
        } catch (logError) {
          logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags (kein PIN):`, logError);
        }
      }

      // Prüfe ob PIN tatsächlich generiert wurde
      if (doorPin) {
        logger.log(`[ReservationNotification] ✅ PIN generiert und Mitteilung versendet für Reservierung ${reservationId}`);
      } else {
        logger.warn(`[ReservationNotification] ⚠️ PIN konnte nicht generiert werden, aber Mitteilung versendet für Reservierung ${reservationId}`);
      }
    } catch (error) {
      logger.error(`[ReservationNotification] Fehler beim Generieren des PIN-Codes und Versenden der Mitteilung:`, error);
      throw error;
    }
  }

  /**
   * Sendet TTLock Passcode mit anpassbaren Kontaktdaten
   * 
   * @param reservationId - ID der Reservierung
   * @param options - Optionale Parameter (guestPhone, guestEmail, customMessage)
   */
  static async sendPasscodeNotification(
    reservationId: number,
    options?: {
      guestPhone?: string;
      guestEmail?: string;
      customMessage?: string;
    }
  ): Promise<void> {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId },
        include: { organization: true, branch: true }
      });

      if (!reservation) {
        throw new Error(`Reservierung ${reservationId} nicht gefunden`);
      }

      // Verwende übergebene Kontaktdaten oder Fallback auf Reservierungsdaten
      const finalGuestPhone = options?.guestPhone || reservation.guestPhone;
      const finalGuestEmail = options?.guestEmail || reservation.guestEmail;

      if (!finalGuestPhone && !finalGuestEmail) {
        throw new Error('Mindestens eine Telefonnummer oder E-Mail-Adresse ist erforderlich');
      }

      // Entschlüssele Settings (aus Branch oder Organisation)
      const { decryptApiSettings, decryptBranchApiSettings } = await import('../utils/encryption');
      logger.log(`[ReservationNotification] Entschlüssele Settings für Reservation ${reservationId}...`);
      
      let decryptedSettings: any = null;
      let doorSystemSettings: any = null;
      
      // Lade Settings aus Branch oder Organisation
      if (reservation.branchId && reservation.branch?.doorSystemSettings) {
        const branchSettings = decryptBranchApiSettings(reservation.branch.doorSystemSettings as any);
        doorSystemSettings = branchSettings?.doorSystem || branchSettings;
        // Für notificationChannels: Fallback auf Organisation
        const orgSettings = decryptApiSettings(reservation.organization.settings as any);
        decryptedSettings = orgSettings;
      } else {
        decryptedSettings = decryptApiSettings(reservation.organization.settings as any);
        doorSystemSettings = decryptedSettings?.doorSystem;
      }
      
      const notificationChannels = decryptedSettings?.lobbyPms?.notificationChannels || ['email'];

      logger.log(`[ReservationNotification] Notification Channels:`, notificationChannels);
      logger.log(`[ReservationNotification] Guest Phone: ${finalGuestPhone || 'N/A'}`);
      logger.log(`[ReservationNotification] Guest Email: ${finalGuestEmail || 'N/A'}`);
      logger.log(`[ReservationNotification] Settings entschlüsselt:`, {
        hasDoorSystem: !!doorSystemSettings,
        doorSystemProvider: doorSystemSettings?.provider,
        doorSystemLockIds: doorSystemSettings?.lockIds
      });

      // Erstelle TTLock Passcode
      let doorPin: string | null = null;
      let doorAppName: string | null = null;

      logger.log(`[ReservationNotification] Starte Passcode-Generierung für Reservation ${reservationId}...`);

      try {
        const ttlockService = reservation.branchId
          ? await TTLockService.createForBranch(reservation.branchId)
          : new TTLockService(reservation.organizationId);

        logger.log(`[ReservationNotification] Door System Settings:`, {
          hasDoorSystem: !!doorSystemSettings,
          hasLockIds: !!doorSystemSettings?.lockIds,
          lockIds: doorSystemSettings?.lockIds,
          lockIdsLength: doorSystemSettings?.lockIds?.length || 0
        });

        if (doorSystemSettings?.lockIds && doorSystemSettings.lockIds.length > 0) {
          const lockId = doorSystemSettings.lockIds[0]; // Verwende ersten Lock
          doorAppName = 'TTLock'; // Oder aus Settings: doorSystemSettings.appName

          logger.log(`[ReservationNotification] Erstelle TTLock Passcode für Lock ID: ${lockId}`);
          logger.log(`[ReservationNotification] Check-in Date: ${reservation.checkInDate}`);
          logger.log(`[ReservationNotification] Check-out Date: ${reservation.checkOutDate}`);

          // WICHTIG: checkOutDate muss nach checkInDate liegen (mindestens 1 Tag später)
          // Falls beide identisch sind (z.B. bei manuell erstellten Reservierungen), korrigiere
          let actualCheckInDate = reservation.checkInDate;
          let actualCheckOutDate = reservation.checkOutDate;
          
          // Prüfe ob beide Daten identisch oder checkOutDate vor checkInDate liegt
          if (actualCheckOutDate.getTime() <= actualCheckInDate.getTime()) {
            logger.warn(`[ReservationNotification] ⚠️ checkOutDate ist identisch oder vor checkInDate - korrigiere auf checkInDate + 1 Tag`);
            actualCheckOutDate = new Date(actualCheckInDate);
            actualCheckOutDate.setDate(actualCheckOutDate.getDate() + 1); // +1 Tag
            logger.log(`[ReservationNotification] Korrigierte Check-out Date: ${actualCheckOutDate}`);
          }

          // Erstelle Passcode für Check-in bis Check-out
          doorPin = await ttlockService.createTemporaryPasscode(
            lockId,
            actualCheckInDate,
            actualCheckOutDate,
            `Guest: ${reservation.guestName}`
          );

          logger.log(`[ReservationNotification] ✅ TTLock Passcode erfolgreich generiert: ${doorPin}`);

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

          logger.log(`[ReservationNotification] ✅ PIN in DB gespeichert für Reservation ${reservationId}`);
        } else {
          logger.warn(`[ReservationNotification] ⚠️ Keine Lock IDs konfiguriert für Reservation ${reservationId}`);
        }
      } catch (error) {
        logger.error(`[ReservationNotification] ❌ Fehler beim Erstellen des TTLock Passcodes:`, error);
        if (error instanceof Error) {
          logger.error(`[ReservationNotification] Fehlermeldung: ${error.message}`);
          logger.error(`[ReservationNotification] Stack: ${error.stack}`);
        }
        // Weiter ohne PIN
      }

      // Erstelle Nachrichtentext (mit oder ohne customMessage)
      let messageText: string;
      if (options?.customMessage && doorPin) {
        // Verwende customMessage und ersetze Variablen
        messageText = options.customMessage
          .replace(/\{\{guestName\}\}/g, reservation.guestName)
          .replace(/\{\{passcode\}\}/g, doorPin);
      } else {
        // NEU: Lade Template aus Branch Settings (mit Fallback auf Defaults)
        const { CountryLanguageService } = require('./countryLanguageService');
        const languageCode = CountryLanguageService.getLanguageForReservation({
          guestNationality: reservation.guestNationality,
          guestPhone: reservation.guestPhone
        }) as 'en' | 'es' | 'de';

        // Formatiere Zimmer-Anzeige: Dorm = "Zimmername (Bettnummer)", Private = "Zimmername"
        const isDorm = reservation.roomNumber !== null && reservation.roomNumber.trim() !== '';
        let roomDisplay: string;
        if (isDorm) {
          // Dorm: "Zimmername (Bettnummer)"
          const roomName = reservation.roomDescription?.trim() || '';
          const bedNumber = reservation.roomNumber?.trim() || '';
          roomDisplay = roomName && bedNumber ? `${roomName} (${bedNumber})` : (roomName || bedNumber || 'N/A');
        } else {
          // Private: "Zimmername"
          roomDisplay = reservation.roomDescription?.trim() || 'N/A';
        }

        const template = await this.getMessageTemplate(
          reservation.branchId,
          reservation.organizationId,
          'checkInConfirmation',
          languageCode
        );

        // Lade roomDescription aus Branch-Settings
        const roomDescription = await this.loadRoomDescriptionFromBranchSettings(
          reservation,
          languageCode
        );

        if (template) {
          // Formatiere roomDescription für Template (nur wenn vorhanden)
          const descriptionLabel = languageCode === 'en' ? 'Description' : languageCode === 'es' ? 'Descripción' : 'Beschreibung';
          const formattedRoomDescription = roomDescription && roomDescription !== 'N/A' 
            ? `- ${descriptionLabel}: ${roomDescription}` 
            : '';
          
          // Ersetze Variablen im Template
          // WICHTIG: Ersetze auch {{doorAppName}} durch leeren String (falls in Datenbank-Template vorhanden)
          messageText = this.replaceTemplateVariables(template.emailContent, {
            guestName: reservation.guestName,
            roomDisplay: roomDisplay,
            roomDescription: formattedRoomDescription,
            doorPin: doorPin || 'N/A',
            doorAppName: '' // Entferne {{doorAppName}} komplett
          });
        } else {
          // Fallback auf alte hardcodierte Nachricht (sollte nicht passieren)
          logger.warn(`[ReservationNotification] Kein Template gefunden für sendPasscodeNotification, verwende Fallback`);
          
          // Formatiere roomDescription für Fallback (nur wenn vorhanden)
          const descriptionLabel = languageCode === 'en' ? 'Description' : languageCode === 'es' ? 'Descripción' : 'Beschreibung';
          const roomDescriptionText = roomDescription && roomDescription !== 'N/A' 
            ? `\n- ${descriptionLabel}: ${roomDescription}` 
            : '';
          
          if (languageCode === 'en') {
            const greeting = `Hello ${reservation.guestName},`;
            const contentText = `Your check-in has been completed successfully! Your room information: - Room: ${roomDisplay}${roomDescriptionText} Access: - Door PIN: ${doorPin || 'N/A'}`;
            
            messageText = `Welcome,

${greeting}

${contentText}

We wish you a pleasant stay!`;
          } else {
            const greeting = `Hola ${reservation.guestName},`;
            const contentText = `¡Tu check-in se ha completado exitosamente! Información de tu habitación: - Habitación: ${roomDisplay}${roomDescriptionText} Acceso: - PIN de la puerta: ${doorPin || 'N/A'}`;
            
            messageText = `Bienvenido,

${greeting}

${contentText}

¡Te deseamos una estancia agradable!`;
          }
        }
      }

      // Versende Benachrichtigungen
      let whatsappSuccess = false;
      let emailSuccess = false;
      let emailError: string | null = null;
      let whatsappError: string | null = null;

      if (notificationChannels.includes('email') && finalGuestEmail) {
        try {
          // Erstelle temporäre Reservierung mit angepassten Kontaktdaten für E-Mail
          const emailReservation = {
            ...reservation,
            guestEmail: finalGuestEmail,
            doorPin: doorPin || null,
            doorAppName: doorAppName || null
          };
          
          await this.sendCheckInConfirmationEmail(
            emailReservation as any,
            doorPin,
            doorAppName
          );
          emailSuccess = true;
          logger.log(`[ReservationNotification] ✅ E-Mail erfolgreich versendet für Reservierung ${reservationId}`);
          
          // Log erfolgreiche Email-Notification
          try {
            await this.logNotification(
              reservationId,
              'pin',
              'email',
              true,
              {
                sentTo: finalGuestEmail,
                message: messageText || undefined
              }
            );
          } catch (logError) {
            logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche Email-Notification:`, logError);
          }
        } catch (error) {
          logger.error(`[ReservationNotification] Fehler beim Versenden der E-Mail:`, error);
          emailError = error instanceof Error ? error.message : 'Unbekannter Fehler beim Versenden der E-Mail';
          
          // Log fehlgeschlagene Email-Notification
          try {
            await this.logNotification(
              reservationId,
              'pin',
              'email',
              false,
              {
                sentTo: finalGuestEmail,
                message: messageText || undefined,
                errorMessage: emailError
              }
            );
          } catch (logError) {
            logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene Email-Notification:`, logError);
          }
        }
      }

      // WhatsApp-Versendung mit TTLock-Code
      if (notificationChannels.includes('whatsapp') && finalGuestPhone) {
        try {
          const whatsappService = reservation.branchId
            ? new WhatsAppService(undefined, reservation.branchId)
            : new WhatsAppService(reservation.organizationId);
          
          // Verwende customMessage wenn vorhanden, sonst Standard
          if (options?.customMessage && doorPin) {
            // Versuche zuerst Session Message (24h-Fenster), bei Fehler: Template Message
            // Template-Name für reservation_checkin_completed
            const templateName = process.env.WHATSAPP_TEMPLATE_CHECKIN_CONFIRMATION || 'reservation_checkin_completed';
            
            // Template-Parameter für reservation_checkin_completed:
            // {{1}} = Begrüßung mit Name (z.B. "Hola Juan,")
            // {{2}} = Kompletter Text mit Zimmerinfo und PIN
            // Erkenne Sprache für Template
            let languageCode: string;
            if (reservation.guestNationality) {
              const { CountryLanguageService } = require('./countryLanguageService');
              languageCode = CountryLanguageService.getLanguageForReservation({
                guestNationality: reservation.guestNationality,
                guestPhone: reservation.guestPhone
              });
            } else {
              languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
            }
            
            const greeting = languageCode === 'en' 
              ? `Hello ${reservation.guestName},`
              : `Hola ${reservation.guestName},`;
            
            // Lade roomDescription aus Branch-Settings
            const roomDescription = await this.loadRoomDescriptionFromBranchSettings(
              reservation,
              languageCode as 'en' | 'es' | 'de'
            );
            
            // Formatiere Zimmer-Anzeige: Dorm = "Zimmername (Bettnummer)", Private = "Zimmername"
            const isDorm = reservation.roomNumber !== null && reservation.roomNumber.trim() !== '';
            let roomDisplay: string;
            if (isDorm) {
              // Dorm: "Zimmername (Bettnummer)"
              const roomName = reservation.roomDescription?.trim() || '';
              const bedNumber = reservation.roomNumber?.trim() || '';
              roomDisplay = roomName && bedNumber ? `${roomName} (${bedNumber})` : (roomName || bedNumber || 'N/A');
            } else {
              // Private: "Zimmername"
              roomDisplay = reservation.roomDescription?.trim() || 'N/A';
            }
            
            let contentText: string;
            if (languageCode === 'en') {
              const roomInfo = roomDescription && roomDescription !== 'N/A' 
                ? `- Room: ${roomDisplay}\n- Description: ${roomDescription}`
                : `- Room: ${roomDisplay}`;
              contentText = `Your check-in has been completed successfully!\n\nYour room information:\n${roomInfo}\n\nAccess:\n- Door PIN: ${doorPin}`;
            } else {
              const roomInfo = roomDescription && roomDescription !== 'N/A'
                ? `- Habitación: ${roomDisplay}\n- Descripción: ${roomDescription}`
                : `- Habitación: ${roomDisplay}`;
              contentText = `¡Tu check-in se ha completado exitosamente!\n\nInformación de tu habitación:\n${roomInfo}\n\nAcceso:\n- PIN de la puerta: ${doorPin}`;
            }
            
            // WICHTIG: Ersetze Platzhalter im contentText, falls das WhatsApp-Template diese enthält
            const contentTextWithReplacements = contentText
              .replace(/\{\{roomNumber\}\}/g, roomDisplay)
              .replace(/\{\{roomDisplay\}\}/g, roomDisplay)
              .replace(/\{\{roomDescription\}\}/g, roomDescription && roomDescription !== 'N/A' ? roomDescription : '')
              .replace(/\{\{doorPin\}\}/g, doorPin || 'N/A')
              .replace(/\{\{guestName\}\}/g, reservation.guestName);
            
            const templateParams = [greeting, contentTextWithReplacements];
            
            logger.log(`[ReservationNotification] Versuche Session Message (24h-Fenster) mit customMessage, bei Fehler: Template Message`);
            logger.log(`[ReservationNotification] Template Name: ${templateName}`);
            logger.log(`[ReservationNotification] Template Params: ${JSON.stringify(templateParams)}`);
            
            whatsappSuccess = await whatsappService.sendMessageWithFallback(
              finalGuestPhone,
              messageText, // customMessage wird verwendet
              templateName,
              templateParams, // Template-Parameter für Fallback
              {
                guestNationality: reservation.guestNationality,
                guestPhone: reservation.guestPhone
              }
            );
          } else {
            // Verwende Standard-Template
            // Lade roomDescription aus Branch-Settings
            const { CountryLanguageService } = require('./countryLanguageService');
            const languageCode = CountryLanguageService.getLanguageForReservation({
              guestNationality: reservation.guestNationality,
              guestPhone: reservation.guestPhone
            }) as 'en' | 'es' | 'de';
            
            const roomDescription = await this.loadRoomDescriptionFromBranchSettings(
              reservation,
              languageCode
            );
            
            // Formatiere Zimmer-Anzeige: Dorm = "Zimmername (Bettnummer)", Private = "Zimmername"
            const isDorm = reservation.roomNumber !== null && reservation.roomNumber.trim() !== '';
            let roomDisplay: string;
            if (isDorm) {
              const roomName = reservation.roomDescription?.trim() || '';
              const bedNumber = reservation.roomNumber?.trim() || '';
              roomDisplay = roomName && bedNumber ? `${roomName} (${bedNumber})` : (roomName || bedNumber || 'N/A');
            } else {
              roomDisplay = reservation.roomDescription?.trim() || 'N/A';
            }
            
            // Lade WhatsApp-Template
            const whatsappTemplate = await this.getMessageTemplate(
              reservation.branchId,
              reservation.organizationId,
              'checkInConfirmation',
              languageCode
            );
            
            const greeting = languageCode === 'en' 
              ? `Hello ${reservation.guestName},`
              : `Hola ${reservation.guestName},`;
            
            // Formatiere roomDescription für Nachricht (nur wenn vorhanden)
            let contentText: string;
            if (languageCode === 'en') {
              const roomInfo = roomDescription && roomDescription !== 'N/A' 
                ? `- Room: ${roomDisplay}\n- Description: ${roomDescription}`
                : `- Room: ${roomDisplay}`;
              contentText = `Your check-in has been completed successfully!\n\nYour room information:\n${roomInfo}\n\nAccess:\n- Door PIN: ${doorPin || 'N/A'}`;
            } else {
              const roomInfo = roomDescription && roomDescription !== 'N/A'
                ? `- Habitación: ${roomDisplay}\n- Descripción: ${roomDescription}`
                : `- Habitación: ${roomDisplay}`;
              contentText = `¡Tu check-in se ha completado exitosamente!\n\nInformación de tu habitación:\n${roomInfo}\n\nAcceso:\n- PIN de la puerta: ${doorPin || 'N/A'}`;
            }
            
            // Template-Name aus Settings oder Fallback
            const templateName = whatsappTemplate?.whatsappTemplateName || 
              process.env.WHATSAPP_TEMPLATE_CHECKIN_CONFIRMATION || 
              'reservation_checkin_completed';
            
            // Template-Parameter: Ersetze Platzhalter in Template-Parametern durch tatsächliche Werte
            // WICHTIG: Ersetze auch Platzhalter im contentText selbst, falls das WhatsApp-Template diese enthält
            const contentTextWithReplacements = contentText
              .replace(/\{\{roomNumber\}\}/g, roomDisplay)
              .replace(/\{\{roomDisplay\}\}/g, roomDisplay)
              .replace(/\{\{roomDescription\}\}/g, roomDescription && roomDescription !== 'N/A' ? roomDescription : '')
              .replace(/\{\{doorPin\}\}/g, doorPin || 'N/A')
              .replace(/\{\{guestName\}\}/g, reservation.guestName);
            
            const templateParams = whatsappTemplate?.whatsappTemplateParams?.length > 0
              ? whatsappTemplate.whatsappTemplateParams.map((param: string) => {
                  return param
                    .replace(/\{\{1\}\}/g, greeting)
                    .replace(/\{\{2\}\}/g, contentTextWithReplacements)
                    .replace(/\{\{guestName\}\}/g, reservation.guestName)
                    .replace(/\{\{roomDisplay\}\}/g, roomDisplay)
                    .replace(/\{\{roomNumber\}\}/g, roomDisplay)
                    .replace(/\{\{roomDescription\}\}/g, roomDescription && roomDescription !== 'N/A' ? roomDescription : '')
                    .replace(/\{\{doorPin\}\}/g, doorPin || 'N/A');
                })
              : [greeting, contentTextWithReplacements];
            
            const messageText = `${greeting}\n\n${contentTextWithReplacements}\n\n${languageCode === 'en' ? 'We wish you a pleasant stay!' : '¡Te deseamos una estancia agradable!'}`;
            
            whatsappSuccess = await whatsappService.sendMessageWithFallback(
              finalGuestPhone,
              messageText,
              templateName,
              templateParams,
              {
                guestNationality: reservation.guestNationality,
                guestPhone: reservation.guestPhone
              }
            );
          }
          
          if (whatsappSuccess) {
            logger.log(`[ReservationNotification] ✅ WhatsApp-Nachricht erfolgreich versendet für Reservierung ${reservationId}`);
            
            // Log erfolgreiche WhatsApp-Notification
            try {
              await this.logNotification(
                reservationId,
                'pin',
                'whatsapp',
                true,
                {
                  sentTo: finalGuestPhone,
                  message: messageText || undefined
                }
              );
            } catch (logError) {
              logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für erfolgreiche WhatsApp-Notification:`, logError);
            }
          } else {
            logger.warn(`[ReservationNotification] ⚠️ WhatsApp-Nachricht konnte nicht versendet werden für Reservierung ${reservationId}`);
            whatsappError = 'WhatsApp-Nachricht konnte nicht versendet werden';
            
            // Log fehlgeschlagene WhatsApp-Notification
            try {
              await this.logNotification(
                reservationId,
                'pin',
                'whatsapp',
                false,
                {
                  sentTo: finalGuestPhone,
                  message: messageText || undefined,
                  errorMessage: whatsappError
                }
              );
            } catch (logError) {
              logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene WhatsApp-Notification:`, logError);
            }
          }
        } catch (error) {
          logger.error(`[ReservationNotification] ❌ Fehler beim Versenden der WhatsApp-Nachricht:`, error);
          whatsappError = error instanceof Error ? error.message : 'Unbekannter Fehler beim Versenden der WhatsApp-Nachricht';
          
          // Log fehlgeschlagene WhatsApp-Notification
          try {
            await this.logNotification(
              reservationId,
              'pin',
              'whatsapp',
              false,
              {
                sentTo: finalGuestPhone,
                message: messageText || undefined,
                errorMessage: whatsappError
              }
            );
          } catch (logError) {
            logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene WhatsApp-Notification:`, logError);
          }
        }
      } else {
        if (!notificationChannels.includes('whatsapp')) {
          logger.log(`[ReservationNotification] WhatsApp nicht in Notification Channels für Reservierung ${reservationId}`);
        }
        if (!finalGuestPhone) {
          logger.log(`[ReservationNotification] Keine Guest Phone für Reservierung ${reservationId}`);
        }
      }

      // Log auch wenn PIN nicht generiert werden konnte
      if (!doorPin) {
        logger.warn(`[ReservationNotification] ⚠️ PIN konnte nicht generiert werden für Reservierung ${reservationId}`);
        try {
          await this.logNotification(
            reservationId,
            'pin',
            finalGuestPhone && finalGuestEmail ? 'both' : (finalGuestPhone ? 'whatsapp' : (finalGuestEmail ? 'email' : 'whatsapp')),
            false,
            {
              sentTo: finalGuestPhone || finalGuestEmail || undefined,
              errorMessage: 'PIN konnte nicht generiert werden - keine Lock IDs konfiguriert oder Fehler beim Erstellen'
            }
          );
        } catch (logError) {
          logger.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags (kein PIN):`, logError);
        }
      }

      // Speichere versendete Nachricht in Reservierung
      if (whatsappSuccess || emailSuccess) {
        await prisma.reservation.update({
          where: { id: reservationId },
          data: {
            sentMessage: messageText,
            sentMessageAt: new Date()
          }
        });
      }

      // Prüfe ob PIN tatsächlich generiert wurde
      if (doorPin) {
        logger.log(`[ReservationNotification] ✅ Passcode generiert und Mitteilung versendet für Reservierung ${reservationId}`);
      } else {
        logger.warn(`[ReservationNotification] ⚠️ Passcode konnte nicht generiert werden, aber Mitteilung versendet für Reservierung ${reservationId}`);
      }
    } catch (error) {
      logger.error(`[ReservationNotification] Fehler beim Versenden des Passcodes:`, error);
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
        include: { organization: true, branch: true }
      });

      if (!reservation) {
        throw new Error(`Reservierung ${reservationId} nicht gefunden`);
      }

      if (reservation.status !== ReservationStatus.checked_in) {
        throw new Error(`Reservierung ${reservationId} ist nicht eingecheckt`);
      }

      // Lade Settings aus Branch oder Organisation
      const { decryptApiSettings, decryptBranchApiSettings } = await import('../utils/encryption');
      let doorSystemSettings: any = null;
      let settings: any = null;
      
      if (reservation.branchId && reservation.branch?.doorSystemSettings) {
        const branchSettings = decryptBranchApiSettings(reservation.branch.doorSystemSettings as any);
        doorSystemSettings = branchSettings?.doorSystem || branchSettings;
        // Für notificationChannels: Fallback auf Organisation
        settings = decryptApiSettings(reservation.organization.settings as any);
      } else {
        settings = decryptApiSettings(reservation.organization.settings as any);
        doorSystemSettings = settings?.doorSystem;
      }
      
      const notificationChannels = settings?.lobbyPms?.notificationChannels || ['email'];

      // Erstelle TTLock Passcode
      let doorPin: string | null = null;
      let doorAppName: string | null = null;

      try {
        const ttlockService = reservation.branchId
          ? await TTLockService.createForBranch(reservation.branchId)
          : new TTLockService(reservation.organizationId);

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
        logger.error(`[ReservationNotification] Fehler beim Erstellen des TTLock Passcodes:`, error);
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

      // ⚠️ TEMPORÄR DEAKTIVIERT: WhatsApp-Versendung nach TTLock-Webhook
      // TTLock-Code wird weiterhin erstellt und im Frontend angezeigt, aber nicht versendet
      if (notificationChannels.includes('whatsapp') && reservation.guestPhone) {
        logger.log(`[ReservationNotification] ⚠️ WhatsApp-Versendung temporär deaktiviert - TTLock-Code ${doorPin ? `(${doorPin})` : ''} wird nur im Frontend angezeigt`);
        // TODO: Wieder aktivieren, wenn gewünscht
        /*
        const whatsappService = reservation.branchId
          ? new WhatsAppService(undefined, reservation.branchId)
          : new WhatsAppService(reservation.organizationId);
        
        // Ermittle Sprache für roomDescription
        const { CountryLanguageService } = require('./countryLanguageService');
        const languageCode = CountryLanguageService.getLanguageForReservation({
          guestNationality: reservation.guestNationality,
          guestPhone: reservation.guestPhone
        }) as 'en' | 'es' | 'de';
        
        // Lade roomDescription aus Branch-Settings
        const roomDescription = await this.loadRoomDescriptionFromBranchSettings(
          reservation,
          languageCode
        );
        
        await whatsappService.sendCheckInConfirmation(
          reservation.guestName,
          reservation.guestPhone,
          reservation.roomNumber || 'N/A',
          roomDescription,
          doorPin || 'N/A',
          doorAppName || 'TTLock'
        );
        */
      }

      logger.log(`[ReservationNotification] Check-in-Bestätigung versendet für Reservierung ${reservationId}`);
    } catch (error) {
      logger.error(`[ReservationNotification] Fehler beim Versand der Check-in-Bestätigung:`, error);
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
    // Bestimme Sprache basierend auf Gast-Nationalität (Standard: Spanisch)
    const { CountryLanguageService } = require('./countryLanguageService');
    const languageCode = CountryLanguageService.getLanguageForReservation({
      guestNationality: reservation.guestNationality,
      guestPhone: reservation.guestPhone
    });
    const isEnglish = languageCode === 'en';
    
    // Lade Logo + Branding (nutzt gespeichertes Branding, keine API-Calls)
    const { logo, branding } = await getOrganizationBranding(
      reservation.organizationId,
      reservation.branchId || undefined
    );

    // Lade Organisationsname für Header
    let organizationName = 'La Familia Hostel';
    if (reservation.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: reservation.organizationId },
        select: { displayName: true, name: true }
      });
      if (organization?.displayName) {
        organizationName = organization.displayName;
      } else if (organization?.name) {
        organizationName = organization.name;
      }
    }

    const linkColor = branding?.colors?.primary || '#2563eb';
    let subject: string;
    let content: string;
    let text: string;

    if (isEnglish) {
      // Englische Version
      subject = 'Welcome to La Familia Hostel - Online Check-in';
      content = `
        <p>Hello ${reservation.guestName},</p>
        <p>We are pleased to welcome you to La Familia Hostel! 🎊</p>
        <p>In case that you arrive after 18:00 or before 09:00, our recepcion 🛎️ will be closed.</p>
        <p>We would then kindly ask you to complete check-in & payment online in advance:</p>
        <p><strong>Check-In:</strong> <a href="${checkInLink}" style="color: ${linkColor}; text-decoration: none; font-weight: 600;">Online Check-in</a></p>
        <p><strong>Please make the payment in advance:</strong> <a href="${paymentLink}" style="color: ${linkColor}; text-decoration: none; font-weight: 600;">Make Payment</a></p>
        <p>Please write us briefly once you have completed both the check-in and the payment, so we can send you your pin code 🔑 for the entrance door.</p>
        <p>Thank you!</p>
        <p>We look forward to seeing you soon!</p>
      `;

      text = `
Hello ${reservation.guestName},

We are pleased to welcome you to La Familia Hostel! 🎊

In case that you arrive after 18:00 or before 09:00, our recepcion 🛎️ will be closed.

We would then kindly ask you to complete check-in & payment online in advance:

Check-In:

${checkInLink}

Please make the payment in advance:

${paymentLink}

Please write us briefly once you have completed both the check-in and the payment, so we can send you your pin code 🔑 for the entrance door.

Thank you!

We look forward to seeing you soon!
      `;
    } else {
      // Spanische Version
      subject = 'Bienvenido a La Familia Hostel - Check-in en línea';
      content = `
        <p>Hola ${reservation.guestName},</p>
        <p>¡Nos complace darte la bienvenida a La Familia Hostel! 🎊</p>
        <p>En caso de que llegues después de las 18:00 o antes de las 09:00, nuestra recepción 🛎️ estará cerrada.</p>
        <p>Te pedimos amablemente que completes el check-in y el pago en línea con anticipación:</p>
        <p><strong>Check-In:</strong> <a href="${checkInLink}" style="color: ${linkColor}; text-decoration: none; font-weight: 600;">Check-in en línea</a></p>
        <p><strong>Por favor, realiza el pago por adelantado:</strong> <a href="${paymentLink}" style="color: ${linkColor}; text-decoration: none; font-weight: 600;">Realizar pago</a></p>
        <p>Por favor, escríbenos brevemente una vez que hayas completado tanto el check-in como el pago, para que podamos enviarte tu código PIN 🔑 para la puerta de entrada.</p>
        <p>¡Gracias!</p>
        <p>¡Esperamos verte pronto!</p>
      `;

      text = `
Hola ${reservation.guestName},

¡Nos complace darte la bienvenida a La Familia Hostel! 🎊

En caso de que llegues después de las 18:00 o antes de las 09:00, nuestra recepción 🛎️ estará cerrada.

Te pedimos amablemente que completes el check-in y el pago en línea con anticipación:

Check-In:

${checkInLink}

Por favor, realiza el pago por adelantado:

${paymentLink}

Por favor, escríbenos brevemente una vez que hayas completado tanto el check-in como el pago, para que podamos enviarte tu código PIN 🔑 para la puerta de entrada.

¡Gracias!

¡Esperamos verte pronto!
      `;
    }

    const html = generateEmailTemplate({
      logo,
      branding,
      headerTitle: organizationName,
      content,
      language: languageCode as 'de' | 'en' | 'es'
    });

    await sendEmail(
      reservation.guestEmail!,
      subject,
      html,
      text,
      reservation.organizationId,
      reservation.branchId || undefined
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
    // Ermittle Sprache für Übersetzungen
    const { CountryLanguageService } = require('./countryLanguageService');
    const languageCode = CountryLanguageService.getLanguageForReservation({
      guestNationality: reservation.guestNationality,
      guestPhone: reservation.guestPhone
    }) as 'en' | 'es' | 'de';

    // Lade roomDescription aus Branch-Settings (falls categoryId vorhanden)
    const roomDescription = await this.loadRoomDescriptionFromBranchSettings(
      reservation,
      languageCode
    );

    // NEU: Lade Template aus Branch Settings

    const template = await this.getMessageTemplate(
      reservation.branchId,
      reservation.organizationId,
      'checkInConfirmation',
      languageCode
    );

    // Formatiere roomDisplay (wie in generatePinAndSendNotification)
    const isDorm = reservation.roomNumber !== null && reservation.roomNumber.trim() !== '';
    let roomDisplay: string;
    if (isDorm) {
      const roomName = reservation.roomDescription?.trim() || '';
      const bedNumber = reservation.roomNumber?.trim() || '';
      roomDisplay = roomName && bedNumber ? `${roomName} (${bedNumber})` : (roomName || bedNumber || 'N/A');
    } else {
      roomDisplay = reservation.roomDescription?.trim() || 'N/A';
    }

    // Formatiere roomDescription für Template (nur wenn vorhanden)
    const descriptionLabel = languageCode === 'en' ? 'Description' : languageCode === 'es' ? 'Descripción' : 'Beschreibung';
    const formattedRoomDescription = roomDescription && roomDescription !== 'N/A' 
      ? `- ${descriptionLabel}: ${roomDescription}` 
      : '';
    
    // Ersetze Variablen im Template
    // WICHTIG: Ersetze auch {{doorAppName}} durch leeren String (falls in Datenbank-Template vorhanden)
    let emailContent = template 
      ? this.replaceTemplateVariables(template.emailContent, {
          guestName: reservation.guestName,
          roomDisplay: roomDisplay,
          roomDescription: formattedRoomDescription,
          doorPin: doorPin || 'N/A',
          doorAppName: '' // Entferne {{doorAppName}} komplett
        })
      : null;
    
    // Falls Template kein {{roomDescription}} enthält, füge es hinzu
    if (emailContent && formattedRoomDescription && !emailContent.includes(formattedRoomDescription)) {
      // Suche nach roomDisplay-Zeile und füge roomDescription danach ein
      if (languageCode === 'en') {
        emailContent = emailContent.replace(
          /(- Room: [^\n]+)/g,
          `$1\n${formattedRoomDescription}`
        );
      } else if (languageCode === 'es') {
        emailContent = emailContent.replace(
          /(- Habitación: [^\n]+)/g,
          `$1\n${formattedRoomDescription}`
        );
      } else {
        emailContent = emailContent.replace(
          /(- Zimmer: [^\n]+)/g,
          `$1\n${formattedRoomDescription}`
        );
      }
    }
    
    // Finale Ersetzung: Falls emailContent noch null ist, verwende Fallback
    if (!emailContent) {
      emailContent = `Hola ${reservation.guestName},

¡Tu check-in se ha completado exitosamente!

Información de tu habitación:
- Habitación: ${roomDisplay}

${doorPin ? `Acceso:
- PIN de la puerta: ${doorPin}
` : ''}

¡Te deseamos una estancia agradable!`;
    }

    const subject = template?.emailSubject || 'Ihr Check-in ist abgeschlossen - Zimmerinformationen';

    // Lade Logo + Branding (nutzt gespeichertes Branding, keine API-Calls)
    const { logo, branding } = await getOrganizationBranding(
      reservation.organizationId,
      reservation.branchId || undefined
    );

    // Lade Organisationsname für Header
    let organizationName = 'La Familia Hostel';
    if (reservation.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: reservation.organizationId },
        select: { displayName: true, name: true }
      });
      if (organization?.displayName) {
        organizationName = organization.displayName;
      } else if (organization?.name) {
        organizationName = organization.name;
      }
    }

    // Konvertiere Plain-Text zu HTML
    const emailHtmlContent = emailContent
      .replace(/\n/g, '<br>');

    const html = generateEmailTemplate({
      logo,
      branding,
      headerTitle: organizationName,
      content: emailHtmlContent,
      language: languageCode
    });

    await sendEmail(
      reservation.guestEmail!,
      subject,
      html,
      emailContent,
      reservation.organizationId,
      reservation.branchId || undefined
    );
  }
}

