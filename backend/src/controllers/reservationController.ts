import { Request, Response } from 'express';
import { PrismaClient, ReservationStatus, PaymentStatus } from '@prisma/client';
import { WhatsAppService } from '../services/whatsappService';
import { BoldPaymentService } from '../services/boldPaymentService';
import { TTLockService } from '../services/ttlockService';
import { ReservationNotificationService } from '../services/reservationNotificationService';

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
      data: updateData
    });

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
                ttlLockPassword: ttlockCode
              }
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

        // Sende WhatsApp-Nachricht
        const whatsappService = new WhatsAppService(reservation.organizationId);
        await whatsappService.sendMessage(updatedReservation.guestPhone, sentMessage);

        sentMessageAt = new Date();

        // Speichere versendete Nachricht in Reservierung
        await prisma.reservation.update({
          where: { id: reservationId },
          data: {
            sentMessage,
            sentMessageAt,
            paymentLink
          }
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
        sentMessageAt
      }
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
    const reservationData: any = {
      guestName: guestName.trim(),
      checkInDate: new Date(), // Placeholder - wird nicht abgefragt
      checkOutDate: new Date(), // Placeholder - wird nicht abgefragt
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

        // Sende WhatsApp-Nachricht
        const whatsappService = new WhatsAppService(reservation.organizationId);
        await whatsappService.sendMessage(reservation.guestPhone, sentMessage);

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

        console.log(`[Reservation] Reservierung ${reservation.id} erstellt und WhatsApp-Nachricht versendet`);
      } catch (error) {
        console.error('[Reservation] Fehler beim Versenden der WhatsApp-Nachricht:', error);
        console.error('[Reservation] Error Details:', JSON.stringify(error, null, 2));
        
        // Prüfe ob es ein WhatsApp-Token-Problem ist
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('access token') || errorMessage.includes('OAuthException') || errorMessage.includes('Session has expired')) {
          console.error('[Reservation] ⚠️ WhatsApp Access Token ist abgelaufen! Bitte neuen Token in den Organisationseinstellungen eintragen.');
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

