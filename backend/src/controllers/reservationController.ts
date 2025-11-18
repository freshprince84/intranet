import { Request, Response } from 'express';
import { PrismaClient, ReservationStatus, PaymentStatus } from '@prisma/client';
import { WhatsAppService } from '../services/whatsappService';
import { BoldPaymentService } from '../services/boldPaymentService';
import { TTLockService } from '../services/ttlockService';
import { ReservationNotificationService } from '../services/reservationNotificationService';
import { reservationQueue, updateGuestContactQueue, checkQueueHealth } from '../services/queueService';

const prisma = new PrismaClient();

/**
 * Utility: Erkennt ob ein String eine Telefonnummer oder Email ist
 */
function detectContactType(value: string): 'phone' | 'email' {
  // Email-Format: enthält @ und .
  if (value.includes('@') && value.includes('.')) {
    return 'email';
  }
  // Telefonnummer: enthält nur Ziffern, +, Leerzeichen, Bindestriche
  return 'phone';
}

/**
 * PUT /api/reservations/:id/guest-contact
 * Aktualisiert Telefonnummer/Email des Gastes und sendet WhatsApp-Nachricht
 */
export const updateGuestContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { contact } = req.body; // Ein Feld: automatische Erkennung

    if (!contact || typeof contact !== 'string' || contact.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Kontaktinformation (Telefonnummer oder Email) ist erforderlich'
      });
    }

    const reservationId = parseInt(id, 10);
    if (isNaN(reservationId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Reservierungs-ID'
      });
    }

    // Hole Reservierung
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { organization: true }
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservierung nicht gefunden'
      });
    }

    // Erkenne ob es Telefonnummer oder Email ist
    const contactType = detectContactType(contact.trim());
    const updateData: any = {
      status: 'notification_sent' as ReservationStatus
    };

    if (contactType === 'phone') {
      updateData.guestPhone = contact.trim();
    } else {
      updateData.guestEmail = contact.trim();
    }

    // Aktualisiere Reservierung
    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: updateData,
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

    // NEU: Queue-basierte Verarbeitung (wenn aktiviert)
    const queueEnabled = process.env.QUEUE_ENABLED === 'true';
    const isQueueHealthy = queueEnabled ? await checkQueueHealth() : false;

    if (queueEnabled && isQueueHealthy && contactType === 'phone' && updatedReservation.guestPhone) {
      // Füge Job zur Queue hinzu
      try {
        await updateGuestContactQueue.add(
          'update-guest-contact',
          {
            reservationId: updatedReservation.id,
            organizationId: reservation.organizationId,
            contact: contact.trim(),
            contactType: contactType,
            guestPhone: updatedReservation.guestPhone,
            guestName: updatedReservation.guestName,
          },
          {
            priority: 1, // Hohe Priorität für manuelle Updates
            jobId: `update-guest-contact-${updatedReservation.id}`, // Eindeutige ID für Idempotenz
          }
        );

        console.log(`[Reservation] ✅ Job zur Queue hinzugefügt für Guest Contact Update ${updatedReservation.id}`);

        // Sofortige Antwort - Job läuft im Hintergrund
        // Frontend lädt Reservierung neu (onSuccess), daher sind sentMessage/sentMessageAt null ok
        return res.json({
          success: true,
          data: {
            ...updatedReservation,
            sentMessage: null, // Wird im Hintergrund gesetzt
            sentMessageAt: null, // Wird im Hintergrund gesetzt
          },
          message: 'Kontaktinformation aktualisiert. Benachrichtigung wird im Hintergrund versendet.',
        });
      } catch (queueError) {
        console.error('[Reservation] Fehler beim Hinzufügen zur Queue, verwende Fallback:', queueError);
        // Fallback auf synchrone Logik
      }
    }

    // FALLBACK: Alte synchrone Logik (wenn Queue deaktiviert oder Fehler)
    // Sende WhatsApp-Nachricht (wenn Telefonnummer vorhanden)
    let sentMessage: string | null = null;
    let sentMessageAt: Date | null = null;

    if (contactType === 'phone' && updatedReservation.guestPhone) {
      try {
        // Erstelle Zahlungslink
        const boldPaymentService = new BoldPaymentService(reservation.organizationId);
        // TODO: Hole Betrag aus Reservierung (aus syncHistory oder extra Feld)
        const amount = 360000; // Placeholder - sollte aus Reservierung kommen
        const paymentLink = await boldPaymentService.createPaymentLink(
          updatedReservation,
          amount,
          'COP',
          `Zahlung für Reservierung ${updatedReservation.guestName}`
        );

        // Erstelle TTLock Passcode (wenn konfiguriert)
        let ttlockCode: string | null = null;
        try {
          const ttlockService = new TTLockService(reservation.organizationId);
          const settings = reservation.organization.settings as any;
          const doorSystemSettings = settings?.doorSystem;

          if (doorSystemSettings?.lockIds && doorSystemSettings.lockIds.length > 0) {
            const lockId = doorSystemSettings.lockIds[0];
            ttlockCode = await ttlockService.createTemporaryPasscode(
              lockId,
              updatedReservation.checkInDate,
              updatedReservation.checkOutDate,
              `Guest: ${updatedReservation.guestName}`
            );

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
          console.error('[Reservation] Fehler beim Erstellen des TTLock Passcodes:', ttlockError);
          // Weiter ohne TTLock Code
        }

        // Erstelle Nachrichtentext
        const checkInDateStr = updatedReservation.checkInDate.toLocaleDateString('es-ES');
        const checkOutDateStr = updatedReservation.checkOutDate.toLocaleDateString('es-ES');

        sentMessage = `Hola ${updatedReservation.guestName},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada:
- Entrada: ${checkInDateStr}
- Salida: ${checkOutDateStr}

Por favor, realiza el pago:
${paymentLink}

${ttlockCode ? `Tu código de acceso TTLock:
${ttlockCode}

` : ''}¡Te esperamos!`;

        // Sende WhatsApp-Nachricht (mit Fallback auf Template)
        const whatsappService = new WhatsAppService(reservation.organizationId);
        // Verwende existierendes Template: reservation_checkin_invitation
        const templateName = process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_checkin_invitation';
        // Template-Parameter: {{1}} = Gast-Name, {{2}} = Check-in-Link, {{3}} = Payment-Link
        // Erstelle Check-in-Link für Template
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const checkInLink = `${frontendUrl}/check-in/${updatedReservation.id}`;
        const templateParams = [updatedReservation.guestName, checkInLink, paymentLink];
        await whatsappService.sendMessageWithFallback(
          updatedReservation.guestPhone,
          sentMessage,
          templateName,
          templateParams
        );

        sentMessageAt = new Date();

        // Speichere versendete Nachricht in Reservierung
        await prisma.reservation.update({
          where: { id: reservationId },
          data: {
            sentMessage,
            sentMessageAt,
            paymentLink,
          },
        });

        console.log(`[Reservation] WhatsApp-Nachricht versendet für Reservierung ${reservationId}`);
      } catch (whatsappError) {
        console.error('[Reservation] Fehler beim Versenden der WhatsApp-Nachricht:', whatsappError);
        // Fehler nicht weiterwerfen, Status wurde bereits aktualisiert
      }
    }

    res.json({
      success: true,
      data: {
        ...updatedReservation,
        sentMessage,
        sentMessageAt,
      },
    });
  } catch (error) {
    console.error('[Reservation] Fehler beim Aktualisieren der Kontaktinformation:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Kontaktinformation'
    });
  }
};

/**
 * POST /api/reservations
 * Erstellt eine neue Reservierung manuell
 */
export const createReservation = async (req: Request, res: Response) => {
  try {
    console.log('[Reservation] createReservation aufgerufen');
    console.log('[Reservation] organizationId:', req.organizationId);
    console.log('[Reservation] Body:', req.body);
    const { guestName, contact, amount, currency = 'COP' } = req.body;

    // Validierung
    if (!guestName || typeof guestName !== 'string' || guestName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Gast-Name ist erforderlich'
      });
    }

    if (!contact || typeof contact !== 'string' || contact.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Kontaktinformation (Telefonnummer oder Email) ist erforderlich'
      });
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Betrag muss eine positive Zahl sein'
      });
    }

    if (!req.organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organisation-ID fehlt'
      });
    }

    // Erkenne ob es Telefonnummer oder Email ist
    const contactType = detectContactType(contact.trim());
    
    // WICHTIG: checkOutDate muss nach checkInDate liegen (mindestens 1 Tag später)
    // Beim funktionierenden Code 7149923045 waren die Daten unterschiedlich
    const checkInDate = new Date();
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + 1); // +1 Tag
    
    const reservationData: any = {
      guestName: guestName.trim(),
      checkInDate: checkInDate,
      checkOutDate: checkOutDate, // Mindestens 1 Tag nach checkInDate
      status: ReservationStatus.confirmed,
      paymentStatus: PaymentStatus.pending,
      amount: amount,
      currency: currency,
      organizationId: req.organizationId
    };

    if (contactType === 'phone') {
      reservationData.guestPhone = contact.trim();
    } else {
      reservationData.guestEmail = contact.trim();
    }

    // Erstelle Reservierung
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

    // NEU: Queue-basierte Verarbeitung (wenn aktiviert)
    const queueEnabled = process.env.QUEUE_ENABLED === 'true';
    const isQueueHealthy = queueEnabled ? await checkQueueHealth() : false;

    if (queueEnabled && isQueueHealthy && contactType === 'phone' && reservation.guestPhone) {
      // Füge Job zur Queue hinzu
      try {
        await reservationQueue.add(
          'process-reservation',
          {
            reservationId: reservation.id,
            organizationId: reservation.organizationId,
            amount: amount,
            currency: currency,
            contactType: contactType,
            guestPhone: reservation.guestPhone,
            guestName: reservation.guestName,
          },
          {
            priority: 1, // Hohe Priorität für manuelle Reservierungen
            jobId: `reservation-${reservation.id}`, // Eindeutige ID für Idempotenz
          }
        );

        console.log(`[Reservation] ✅ Job zur Queue hinzugefügt für Reservierung ${reservation.id}`);

        // Hole aktuelle Reservierung (ohne Updates)
        const finalReservation = await prisma.reservation.findUnique({
          where: { id: reservation.id },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                displayName: true,
                settings: true
              }
            },
            task: true
          }
        });

        // Sofortige Antwort - Job läuft im Hintergrund
        return res.status(201).json({
          success: true,
          data: finalReservation || reservation,
          message: 'Reservierung erstellt. Benachrichtigung wird im Hintergrund versendet.',
        });
      } catch (queueError) {
        console.error('[Reservation] Fehler beim Hinzufügen zur Queue, verwende Fallback:', queueError);
        // Fallback auf synchrone Logik
      }
    }

    // FALLBACK: Alte synchrone Logik (wenn Queue deaktiviert oder Fehler)
    // Nach Erstellung: Automatisch WhatsApp-Nachricht senden (wenn Telefonnummer vorhanden)
    let sentMessage: string | null = null;
    let sentMessageAt: Date | null = null;
    let paymentLink: string | null = null;

    if (contactType === 'phone' && reservation.guestPhone) {
      try {
        // Erstelle Zahlungslink (ERFORDERLICH - Reservierung wird nicht als notification_sent markiert, wenn fehlschlägt)
        const boldPaymentService = new BoldPaymentService(reservation.organizationId);
        paymentLink = await boldPaymentService.createPaymentLink(
          reservation,
          amount,
          currency,
          `Zahlung für Reservierung ${reservation.guestName}`
        );
        console.log(`[Reservation] Payment-Link erstellt: ${paymentLink}`);

        // Erstelle Check-in-Link
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const checkInLink = `${frontendUrl}/check-in/${reservation.id}`;

        // Erstelle Nachrichtentext (mit Zahlungslink und Check-in-Aufforderung)
        sentMessage = `Hola ${reservation.guestName},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada.
Cargos: ${amount} ${currency}

Puedes realizar el check-in en línea ahora:
${checkInLink}

Por favor, realiza el pago:
${paymentLink}

¡Te esperamos!`;

        // Sende WhatsApp-Nachricht (mit Fallback auf Template)
        console.log(`[Reservation] Initialisiere WhatsApp Service für Organisation ${reservation.organizationId}...`);
        const whatsappService = new WhatsAppService(reservation.organizationId);
        // Verwende existierendes Template: reservation_checkin_invitation
        const templateName = process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_checkin_invitation';
        // Template-Parameter: {{1}} = Gast-Name, {{2}} = Check-in-Link, {{3}} = Payment-Link
        const templateParams = [
          reservation.guestName,
          checkInLink,
          paymentLink
        ];
        
        console.log(`[Reservation] Versuche WhatsApp-Nachricht zu senden an ${reservation.guestPhone}...`);
        console.log(`[Reservation] Template Name: ${templateName}`);
        console.log(`[Reservation] Template Params: ${JSON.stringify(templateParams)}`);
        
        const whatsappSuccess = await whatsappService.sendMessageWithFallback(
          reservation.guestPhone,
          sentMessage,
          templateName,
          templateParams
        );

        if (!whatsappSuccess) {
          throw new Error('WhatsApp-Nachricht konnte nicht versendet werden (sendMessageWithFallback gab false zurück)');
        }

        sentMessageAt = new Date();

        // Speichere versendete Nachricht und Payment Link in Reservierung
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: {
            sentMessage,
            sentMessageAt,
            paymentLink,
            status: 'notification_sent' as ReservationStatus
          }
        });

        console.log(`[Reservation] ✅ Reservierung ${reservation.id} erstellt und WhatsApp-Nachricht erfolgreich versendet`);
      } catch (error) {
        console.error('[Reservation] ❌ Fehler beim Versenden der WhatsApp-Nachricht:', error);
        console.error('[Reservation] Error Details:', JSON.stringify(error, null, 2));
        
        // Detaillierte Fehleranalyse
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        console.error('[Reservation] Fehlermeldung:', errorMessage);
        if (errorStack) {
          console.error('[Reservation] Stack Trace:', errorStack);
        }
        
        // Prüfe spezifische Fehlertypen
        if (errorMessage.includes('access token') || errorMessage.includes('OAuthException') || errorMessage.includes('Session has expired')) {
          console.error('[Reservation] ⚠️ WhatsApp Access Token ist abgelaufen! Bitte neuen Token in den Organisationseinstellungen eintragen.');
        } else if (errorMessage.includes('API Key') || errorMessage.includes('nicht konfiguriert')) {
          console.error('[Reservation] ⚠️ WhatsApp API Key fehlt oder ist nicht korrekt konfiguriert!');
        } else if (errorMessage.includes('Phone Number ID')) {
          console.error('[Reservation] ⚠️ WhatsApp Phone Number ID fehlt oder ist nicht korrekt konfiguriert!');
        } else if (errorMessage.includes('Settings nicht gefunden')) {
          console.error('[Reservation] ⚠️ WhatsApp Settings nicht gefunden für Organisation!');
        } else if (errorMessage.includes('ENCRYPTION_KEY')) {
          console.error('[Reservation] ⚠️ ENCRYPTION_KEY fehlt in den Environment-Variablen!');
        }
        
        // Fehler nicht weiterwerfen, Reservierung wurde bereits erstellt
        // Status bleibt auf 'confirmed', da Nachricht nicht versendet wurde
        // Payment Link wurde möglicherweise erstellt, speichere ihn trotzdem
        if (paymentLink) {
          await prisma.reservation.update({
            where: { id: reservation.id },
            data: { paymentLink }
          });
        }
      }
    }

    // Hole die aktuelle Reservierung mit allen Feldern (inkl. Updates wie sentMessage, status, etc.)
    const finalReservation = await prisma.reservation.findUnique({
      where: { id: reservation.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true,
            settings: true
          }
        },
        task: true
      }
    });

    res.status(201).json({
      success: true,
      data: finalReservation || reservation
    });
  } catch (error) {
    console.error('[Reservation] Fehler beim Erstellen der Reservierung:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Erstellen der Reservierung'
    });
  }
};

/**
 * GET /api/reservations
 * Holt alle Reservierungen für die aktuelle Organisation
 */
export const getAllReservations = async (req: Request, res: Response) => {
  try {
    console.log('[Reservation] getAllReservations aufgerufen, organizationId:', req.organizationId);
    
    if (!req.organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organisation-ID fehlt'
      });
    }

    const reservations = await prisma.reservation.findMany({
      where: {
        organizationId: req.organizationId
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        },
        task: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: reservations
    });
  } catch (error) {
    console.error('[Reservation] Fehler beim Abrufen der Reservierungen:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Reservierungen'
    });
  }
};

/**
 * POST /api/reservations/:id/generate-pin-and-send
 * Generiert PIN-Code und sendet Mitteilung (unabhängig von Zahlungsstatus/Check-in-Status)
 */
export const generatePinAndSendNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reservationId = parseInt(id, 10);
    const organizationId = req.organizationId;

    if (isNaN(reservationId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Reservierungs-ID'
      });
    }

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organisation-ID fehlt'
      });
    }

    // Prüfe ob Reservierung existiert und zur Organisation gehört
    const reservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        organizationId: organizationId
      }
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservierung nicht gefunden oder gehört nicht zur Organisation'
      });
    }

    console.log(`[Reservation] Generiere PIN und sende Mitteilung für Reservierung ${reservationId}`);
    console.log(`[Reservation] Organization ID: ${organizationId}`);

    // Rufe Service-Methode auf, die unabhängig vom Check-in-Status funktioniert
    try {
    await ReservationNotificationService.generatePinAndSendNotification(reservationId);
      console.log(`[Reservation] ✅ PIN-Generierung abgeschlossen für Reservierung ${reservationId}`);
    } catch (error) {
      console.error(`[Reservation] ❌ Fehler bei PIN-Generierung für Reservierung ${reservationId}:`, error);
      if (error instanceof Error) {
        console.error(`[Reservation] Fehlermeldung: ${error.message}`);
        console.error(`[Reservation] Stack: ${error.stack}`);
      }
      throw error;
    }

    // Hole aktualisierte Reservierung
    const updatedReservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      }
    });

    // Prüfe ob PIN tatsächlich generiert wurde
    const pinGenerated = updatedReservation?.doorPin !== null && updatedReservation?.doorPin !== undefined;

    res.json({
      success: true,
      data: updatedReservation,
      message: pinGenerated 
        ? 'PIN-Code generiert und Mitteilung versendet'
        : 'Mitteilung versendet, aber PIN-Code konnte nicht generiert werden (TTLock Fehler)'
    });
  } catch (error) {
    console.error('[Reservation] Fehler beim Generieren des PIN-Codes und Versenden der Mitteilung:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Generieren des PIN-Codes und Versenden der Mitteilung'
    });
  }
};

/**
 * GET /api/reservations/:id
 * Holt eine Reservierung nach ID
 */
export const getReservationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reservationId = parseInt(id, 10);

    if (isNaN(reservationId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Reservierungs-ID'
      });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservierung nicht gefunden'
      });
    }

    console.log('[Reservation] getReservationById - Status:', reservation.status);
    console.log('[Reservation] getReservationById - PaymentStatus:', reservation.paymentStatus);

    res.json({
      success: true,
      data: reservation
    });
  } catch (error) {
    console.error('[Reservation] Fehler beim Abrufen der Reservierung:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Reservierung'
    });
  }
};

