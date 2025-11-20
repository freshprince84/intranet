import { Request, Response } from 'express';
import { ReservationStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { WhatsAppService } from '../services/whatsappService';
import { BoldPaymentService } from '../services/boldPaymentService';
import { TTLockService } from '../services/ttlockService';
import { ReservationNotificationService } from '../services/reservationNotificationService';
import { reservationQueue, updateGuestContactQueue, checkQueueHealth } from '../services/queueService';
import { generateLobbyPmsCheckInLink } from '../utils/checkInLinkUtils';
import { checkUserPermission } from '../middleware/permissionMiddleware';

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
        branch: {
          select: {
            id: true,
            name: true,
            doorSystemSettings: true,
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
        const boldPaymentService = updatedReservation.branchId
          ? await BoldPaymentService.createForBranch(updatedReservation.branchId)
          : new BoldPaymentService(reservation.organizationId);
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
          const ttlockService = updatedReservation.branchId
            ? await TTLockService.createForBranch(updatedReservation.branchId)
            : new TTLockService(reservation.organizationId);
          
          // Lade Settings aus Branch oder Organisation
          const { decryptApiSettings, decryptBranchApiSettings } = await import('../utils/encryption');
          let doorSystemSettings: any = null;
          
          if (updatedReservation.branchId && updatedReservation.branch?.doorSystemSettings) {
            const branchSettings = decryptBranchApiSettings(updatedReservation.branch.doorSystemSettings as any);
            doorSystemSettings = branchSettings?.doorSystem || branchSettings;
          } else {
            const settings = decryptApiSettings(reservation.organization.settings as any);
            doorSystemSettings = settings?.doorSystem;
          }

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
        const whatsappService = updatedReservation.branchId
          ? new WhatsAppService(undefined, updatedReservation.branchId)
          : new WhatsAppService(reservation.organizationId);
        // Basis-Template-Name (wird in sendMessageWithFallback basierend auf Sprache angepasst)
        // Spanisch: reservation_checkin_invitation, Englisch: reservation_checkin_invitation_
        const templateName = process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_checkin_invitation';
        // Template-Parameter: {{1}} = Gast-Name, {{2}} = Check-in-Link, {{3}} = Payment-Link
        // Erstelle LobbyPMS Check-in-Link
        const checkInLink = generateLobbyPmsCheckInLink(updatedReservation);
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

    // Prüfe Einstellung: Automatischer Versand aktiviert?
    const organization = reservation.organization;
    const settings = organization.settings as any;
    const autoSend = settings?.lobbyPms?.autoSendReservationInvitation !== false; // Default: true (Rückwärtskompatibilität)

    // NEU: Queue-basierte Verarbeitung (wenn aktiviert UND autoSend = true)
    const queueEnabled = process.env.QUEUE_ENABLED === 'true';
    const isQueueHealthy = queueEnabled ? await checkQueueHealth() : false;

    if (autoSend && queueEnabled && isQueueHealthy && contactType === 'phone' && reservation.guestPhone) {
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

    // Wenn autoSend = false, überspringe automatischen Versand
    if (!autoSend) {
      console.log(`[Reservation] Automatischer Versand ist deaktiviert für Organisation ${reservation.organizationId}`);
      // Hole aktuelle Reservierung
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

      return res.status(201).json({
        success: true,
        data: finalReservation || reservation,
        message: 'Reservierung erstellt. Benachrichtigung kann manuell versendet werden.',
      });
    }

    // FALLBACK: Synchrone Logik (wenn Queue deaktiviert oder Fehler)
    // Verwende neue Service-Methode sendReservationInvitation()
    if (contactType === 'phone' && reservation.guestPhone) {
      try {
        const result = await ReservationNotificationService.sendReservationInvitation(
          reservation.id,
          {
            amount,
            currency
          }
        );

        if (result.success) {
          console.log(`[Reservation] ✅ Reservierung ${reservation.id} erstellt und WhatsApp-Nachricht erfolgreich versendet`);
        } else {
          console.warn(`[Reservation] ⚠️ Reservierung ${reservation.id} erstellt, aber WhatsApp-Nachricht fehlgeschlagen: ${result.error}`);
        }
      } catch (error) {
        console.error('[Reservation] ❌ Fehler beim Versenden der WhatsApp-Nachricht:', error);
        // Fehler nicht weiterwerfen, Reservierung wurde bereits erstellt
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
 * Holt alle Reservierungen für die aktuelle Organisation (mit Branch-Filter basierend auf Berechtigungen)
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

    const userId = parseInt(req.userId, 10);
    const roleId = parseInt(req.roleId, 10);

    if (isNaN(userId) || isNaN(roleId)) {
      return res.status(401).json({
        success: false,
        message: 'Nicht authentifiziert'
      });
    }

    // Prüfe Berechtigungen
    const hasAllBranchesPermission = await checkUserPermission(
      userId,
      roleId,
      'reservations_all_branches',
      'read',
      'table'
    );
    
    const hasOwnBranchPermission = await checkUserPermission(
      userId,
      roleId,
      'reservations_own_branch',
      'read',
      'table'
    );

    // Wenn keine der beiden Berechtigungen vorhanden, prüfe Fallback auf alte Berechtigung
    let hasReservationsPermission = false;
    if (!hasAllBranchesPermission && !hasOwnBranchPermission) {
      hasReservationsPermission = await checkUserPermission(
        userId,
        roleId,
        'reservations',
        'read',
        'table'
      );
    }

    // Wenn keine Berechtigung vorhanden, verweigere Zugriff
    if (!hasAllBranchesPermission && !hasOwnBranchPermission && !hasReservationsPermission) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Anzeigen von Reservierungen'
      });
    }

    // Baue Where-Clause auf
    const whereClause: any = {
      organizationId: req.organizationId
    };

    // Wenn nur "own_branch" Berechtigung: Filtere nach Branch
    if (hasOwnBranchPermission && !hasAllBranchesPermission) {
      // Hole branchId aus UsersBranches (falls vorhanden)
      const userBranch = await prisma.usersBranches.findFirst({
        where: {
          userId: userId,
          branch: {
            organizationId: req.organizationId
          }
        },
        select: {
          branchId: true
        }
      });

      if (userBranch?.branchId) {
        whereClause.branchId = userBranch.branchId;
        console.log(`[Reservation] Filtere nach Branch ${userBranch.branchId} (own_branch Berechtigung)`);
      } else {
        // User hat keine aktive Branch → keine Reservierungen
        console.log(`[Reservation] User hat keine aktive Branch, gebe leeres Array zurück`);
        return res.json({
          success: true,
          data: []
        });
      }
    }
    // Wenn "all_branches" Berechtigung: Kein Branch-Filter (alle Reservierungen)

    const reservations = await prisma.reservation.findMany({
      where: whereClause,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true
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
 * POST /api/reservations/:id/send-invitation
 * Sendet Reservation-Einladung manuell (mit optionalen Parametern)
 */
export const sendReservationInvitation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reservationId = parseInt(id, 10);
    const organizationId = req.organizationId;
    const { guestPhone, guestEmail, customMessage, amount, currency } = req.body;

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

    console.log(`[Reservation] Sende Einladung für Reservierung ${reservationId}`);
    console.log(`[Reservation] Organization ID: ${organizationId}`);
    console.log(`[Reservation] Optionale Parameter:`, { guestPhone, guestEmail, customMessage, amount, currency });

    // Rufe Service-Methode auf
    try {
      const result = await ReservationNotificationService.sendReservationInvitation(
        reservationId,
        {
          guestPhone,
          guestEmail,
          customMessage,
          amount,
          currency
        }
      );

      if (result.success) {
        console.log(`[Reservation] ✅ Einladung erfolgreich versendet für Reservierung ${reservationId}`);
        return res.json({
          success: true,
          data: {
            reservationId,
            paymentLink: result.paymentLink,
            checkInLink: result.checkInLink,
            messageSent: result.messageSent,
            sentAt: result.sentAt
          },
          message: 'Einladung erfolgreich versendet'
        });
      } else {
        console.warn(`[Reservation] ⚠️ Einladung teilweise fehlgeschlagen für Reservierung ${reservationId}: ${result.error}`);
        return res.status(207).json({ // 207 Multi-Status für teilweise erfolgreich
          success: false,
          data: {
            reservationId,
            paymentLink: result.paymentLink,
            checkInLink: result.checkInLink,
            messageSent: result.messageSent,
            sentAt: result.sentAt,
            error: result.error
          },
          message: result.error || 'Einladung konnte nicht vollständig versendet werden'
        });
      }
    } catch (error) {
      console.error(`[Reservation] ❌ Fehler bei Einladung für Reservierung ${reservationId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      return res.status(500).json({
        success: false,
        message: `Fehler beim Versenden der Einladung: ${errorMessage}`
      });
    }
  } catch (error) {
    console.error('[Reservation] Fehler in sendReservationInvitation:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Versenden der Einladung'
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
 * GET /api/reservations/:id/notification-logs
 * Holt Log-Historie für eine Reservation
 */
export const getReservationNotificationLogs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        message: 'Organisation nicht gefunden'
      });
    }

    const reservationId = parseInt(id, 10);
    if (isNaN(reservationId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Reservierungs-ID'
      });
    }

    // Prüfe ob Reservation existiert und zur Organisation gehört
    const reservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        organizationId: organizationId
      }
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservierung nicht gefunden'
      });
    }

    // Lade Notification-Logs
    const logs = await prisma.reservationNotificationLog.findMany({
      where: {
        reservationId: reservationId
      },
      orderBy: {
        sentAt: 'desc' // Neueste zuerst
      }
    });

    return res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('[Reservation] Fehler beim Laden der Notification-Logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Notification-Logs'
    });
  }
};

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

