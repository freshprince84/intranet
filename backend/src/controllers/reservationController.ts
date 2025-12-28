import { Request, Response } from 'express';
import { ReservationStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { WhatsAppService } from '../services/whatsappService';
import { BoldPaymentService } from '../services/boldPaymentService';
import { TTLockService } from '../services/ttlockService';
import { ReservationNotificationService } from '../services/reservationNotificationService';
import { reservationQueue, checkQueueHealth } from '../services/queueService';
import { generateLobbyPmsCheckInLink } from '../utils/checkInLinkUtils';
import { checkUserPermission } from '../middleware/permissionMiddleware';
import { logger } from '../utils/logger';
import { convertFilterConditionsToPrismaWhere, validateFilterAgainstIsolation } from '../utils/filterToPrisma';
import { isAdminOrOwner } from '../middleware/organization';
import { filterCache } from '../services/filterCache';

/**
 * POST /api/reservations
 * Erstellt eine neue Reservierung manuell
 */
export const createReservation = async (req: Request, res: Response) => {
  try {
    logger.log('[Reservation] createReservation aufgerufen');
    logger.log('[Reservation] organizationId:', req.organizationId);
    logger.log('[Reservation] Body:', req.body);
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
    
    // Hole Branch-ID aus Request (falls vorhanden) oder erste Branch der Organisation
    let branchId: number | null = req.branchId || null;
    if (!branchId) {
      const branch = await prisma.branch.findFirst({
        where: { organizationId: req.organizationId },
        orderBy: { id: 'asc' }
      });
      branchId = branch?.id || null;
    }

    const reservationData: any = {
      guestName: guestName.trim(),
      checkInDate: checkInDate,
      checkOutDate: checkOutDate, // Mindestens 1 Tag nach checkInDate
      status: ReservationStatus.confirmed,
      paymentStatus: PaymentStatus.pending,
      amount: amount,
      currency: currency,
      organizationId: req.organizationId,
      branchId: branchId
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

        logger.log(`[Reservation] ✅ Job zur Queue hinzugefügt für Reservierung ${reservation.id}`);

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
        logger.error('[Reservation] Fehler beim Hinzufügen zur Queue, verwende Fallback:', queueError);
        // Fallback auf synchrone Logik
      }
    }

    // Wenn autoSend = false, überspringe automatischen Versand
    if (!autoSend) {
      logger.log(`[Reservation] Automatischer Versand ist deaktiviert für Organisation ${reservation.organizationId}`);
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
          logger.log(`[Reservation] ✅ Reservierung ${reservation.id} erstellt und WhatsApp-Nachricht erfolgreich versendet`);
        } else {
          logger.warn(`[Reservation] ⚠️ Reservierung ${reservation.id} erstellt, aber WhatsApp-Nachricht fehlgeschlagen: ${result.error}`);
        }
      } catch (error) {
        logger.error('[Reservation] ❌ Fehler beim Versenden der WhatsApp-Nachricht:', error);
        // Fehler nicht weiterwerfen, Reservierung wurde bereits erstellt
      }
    } else if (contactType === 'email' && reservation.guestEmail) {
      // NEU: Email-Versendung für contactType === 'email'
      try {
        const result = await ReservationNotificationService.sendReservationInvitation(
          reservation.id,
          {
            guestEmail: reservation.guestEmail,
            amount,
            currency
          }
        );

        if (result.success) {
          logger.log(`[Reservation] ✅ Reservierung ${reservation.id} erstellt und Email erfolgreich versendet`);
        } else {
          logger.warn(`[Reservation] ⚠️ Reservierung ${reservation.id} erstellt, aber Email fehlgeschlagen: ${result.error}`);
        }
      } catch (error) {
        logger.error('[Reservation] ❌ Fehler beim Versenden der Email:', error);
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
    logger.error('[Reservation] Fehler beim Erstellen der Reservierung:', error);
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
    logger.log('[Reservation] getAllReservations aufgerufen, organizationId:', req.organizationId);
    
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

    // Filter-Parameter aus Query lesen
    const filterId = req.query.filterId as string | undefined;
    const filterConditions = req.query.filterConditions 
        ? JSON.parse(req.query.filterConditions as string) 
        : undefined;
    // ✅ PAGINATION: limit/offset Parameter wieder einführen
    const limit = req.query.limit 
        ? parseInt(req.query.limit as string, 10) 
        : 20; // Standard: 20 Items
    const offset = req.query.offset 
        ? parseInt(req.query.offset as string, 10) 
        : 0; // Standard: 0
    // ✅ BRANCH-FILTER: branchId Query-Parameter unterstützen
    const queryBranchId = req.query.branchId 
        ? parseInt(req.query.branchId as string, 10) 
        : undefined;

    // ✅ SORTIERUNG: Sortier-Parameter aus Query lesen
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc';

    // ✅ SORTIERUNG: Mapping von Frontend-Feldern zu Backend-Feldern
    let prismaSortBy = sortBy;
    if (sortBy === 'branch') {
      prismaSortBy = 'branch.name';
    }

    // ✅ ROLLEN-ISOLATION: Baue Where-Clause basierend auf Rolle
    const whereClause: any = {
      organizationId: req.organizationId
    };

    // ✅ BRANCH-FILTER: Wenn branchId als Query-Parameter übergeben wurde, verwende diesen (hat Priorität)
    if (queryBranchId && !isNaN(queryBranchId)) {
      whereClause.branchId = queryBranchId;
      logger.log(`[Reservation] Filtere nach Branch ${queryBranchId} (Query-Parameter)`);
    }
    // Admin/Owner: Alle Reservations der Organisation (kein Branch-Filter, außer Query-Parameter)
    else if (isAdminOrOwner(req)) {
      // Kein Branch-Filter für Admin/Owner (wenn kein Query-Parameter)
      logger.log(`[Reservation] Admin/Owner: Zeige alle Reservations der Organisation`);
    } else {
      // User/Andere Rollen: Nur Reservations der eigenen Branch
      // OPTIMIERUNG: Verwende branchId aus Request-Kontext statt zusätzlicher Query
      // Wenn nur "own_branch" Berechtigung: Filtere nach Branch
      if (hasOwnBranchPermission && !hasAllBranchesPermission) {
        // Hole branchId aus Request-Kontext (wird in organization-Middleware gesetzt)
        const branchId = (req as any).branchId;
        
        if (branchId) {
          whereClause.branchId = branchId;
          logger.log(`[Reservation] Filtere nach Branch ${branchId} (own_branch Berechtigung)`);
        } else {
          // Fallback: Hole branchId aus UsersBranches (falls nicht im Request-Kontext)
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
            logger.log(`[Reservation] Filtere nach Branch ${userBranch.branchId} (own_branch Berechtigung, aus DB)`);
          } else {
            // User hat keine aktive Branch → keine Reservierungen
            logger.log(`[Reservation] User hat keine aktive Branch, gebe leeres Array zurück`);
            return res.json({
              success: true,
              data: [],
              totalCount: 0,
              hasMore: false
            });
          }
        }
      } else if (hasAllBranchesPermission) {
        // Wenn "all_branches" Berechtigung: Kein Branch-Filter (alle Reservierungen)
        logger.log(`[Reservation] User hat all_branches Berechtigung, zeige alle Reservations`);
      } else if (hasReservationsPermission) {
        // ✅ FIX: Alte "reservations" Berechtigung → Zeige alle Reservierungen der Organisation
        logger.log(`[Reservation] User hat alte 'reservations' Berechtigung, zeige alle Reservations der Organisation`);
      } else {
        // Keine Berechtigung → keine Reservierungen
        logger.log(`[Reservation] User hat keine Berechtigung, gebe leeres Array zurück`);
        return res.json({
          success: true,
          data: [],
          totalCount: 0,
          hasMore: false
        });
      }
    }

    // Filter-Bedingungen konvertieren (falls vorhanden)
    let filterWhereClause: any = {};
    if (filterId) {
        // OPTIMIERUNG: Lade Filter aus Cache (vermeidet DB-Query)
        const filterData = await filterCache.get(parseInt(filterId, 10));
        if (filterData) {
            const conditions = JSON.parse(filterData.conditions);
            const operators = JSON.parse(filterData.operators);
            filterWhereClause = convertFilterConditionsToPrismaWhere(
                conditions,
                operators,
                'reservation',
                req
            );
            // ✅ SICHERHEIT: Validiere Filter gegen Datenisolation
            filterWhereClause = validateFilterAgainstIsolation(filterWhereClause, req, 'reservation');
        }
    } else if (filterConditions) {
        // Direkte Filter-Bedingungen
        filterWhereClause = convertFilterConditionsToPrismaWhere(
            filterConditions.conditions || filterConditions,
            filterConditions.operators || [],
            'reservation',
            req
        );
        // ✅ SICHERHEIT: Validiere Filter gegen Datenisolation
        filterWhereClause = validateFilterAgainstIsolation(filterWhereClause, req, 'reservation');
    }

    // Kombiniere alle Filter-Bedingungen
    const baseWhereConditions: any[] = [whereClause];
    if (Object.keys(filterWhereClause).length > 0) {
        baseWhereConditions.push(filterWhereClause);
    }
    
    const finalWhereClause = baseWhereConditions.length === 1
        ? baseWhereConditions[0]
        : { AND: baseWhereConditions };

    // ✅ PAGINATION: totalCount für Infinite Scroll
    const totalCount = await prisma.reservation.count({
        where: finalWhereClause
    });

    const reservations = await prisma.reservation.findMany({
      where: finalWhereClause,
      // ✅ PAGINATION: Nur limit Items laden, offset überspringen
      take: limit,
      skip: offset,
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
      orderBy: prismaSortBy ? [
        prismaSortBy.includes('.') ? {
            [prismaSortBy.split('.')[0]]: {
                [prismaSortBy.split('.')[1]]: sortOrder
            }
        } : {
            [prismaSortBy]: sortOrder
        },
        { id: 'asc' } // ✅ STABILE SORTIERUNG: Fallback auf ID für Infinite Scroll
      ] : [
        { createdAt: 'desc' },
        { id: 'desc' }
      ]
    });

    // ✅ PAGINATION: Response mit totalCount für Infinite Scroll
    res.json({
      success: true,
      data: reservations,
      totalCount: totalCount,
      limit: limit,
      offset: offset,
      hasMore: offset + reservations.length < totalCount
    });
  } catch (error) {
    logger.error('[Reservation] Fehler beim Abrufen der Reservierungen:', error);
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

    logger.log(`[Reservation] Sende Einladung für Reservierung ${reservationId}`);
    logger.log(`[Reservation] Organization ID: ${organizationId}`);
    logger.log(`[Reservation] Optionale Parameter:`, { guestPhone, guestEmail, customMessage, amount, currency });

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
        logger.log(`[Reservation] ✅ Einladung erfolgreich versendet für Reservierung ${reservationId}`);
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
        logger.warn(`[Reservation] ⚠️ Einladung teilweise fehlgeschlagen für Reservierung ${reservationId}: ${result.error}`);
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
      logger.error(`[Reservation] ❌ Fehler bei Einladung für Reservierung ${reservationId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      return res.status(500).json({
        success: false,
        message: `Fehler beim Versenden der Einladung: ${errorMessage}`
      });
    }
  } catch (error) {
    logger.error('[Reservation] Fehler in sendReservationInvitation:', error);
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

    logger.log(`[Reservation] Generiere PIN und sende Mitteilung für Reservierung ${reservationId}`);
    logger.log(`[Reservation] Organization ID: ${organizationId}`);

    // Rufe Service-Methode auf, die unabhängig vom Check-in-Status funktioniert
    try {
    await ReservationNotificationService.generatePinAndSendNotification(reservationId);
      logger.log(`[Reservation] ✅ PIN-Generierung abgeschlossen für Reservierung ${reservationId}`);
    } catch (error) {
      logger.error(`[Reservation] ❌ Fehler bei PIN-Generierung für Reservierung ${reservationId}:`, error);
      if (error instanceof Error) {
        logger.error(`[Reservation] Fehlermeldung: ${error.message}`);
        logger.error(`[Reservation] Stack: ${error.stack}`);
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
    logger.error('[Reservation] Fehler beim Generieren des PIN-Codes und Versenden der Mitteilung:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Generieren des PIN-Codes und Versenden der Mitteilung'
    });
  }
};

/**
 * POST /api/reservations/:id/send-passcode
 * Sendet TTLock Passcode mit anpassbaren Kontaktdaten
 */
export const sendPasscode = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reservationId = parseInt(id, 10);
    const organizationId = req.organizationId;
    const { guestPhone, guestEmail, customMessage } = req.body;

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
      },
      include: {
        organization: true,
        branch: true
      }
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservierung nicht gefunden oder gehört nicht zur Organisation'
      });
    }

    // Validierung: Mindestens eine Kontaktinfo muss vorhanden sein
    const finalGuestPhone = guestPhone || reservation.guestPhone;
    const finalGuestEmail = guestEmail || reservation.guestEmail;

    if (!finalGuestPhone && !finalGuestEmail) {
      return res.status(400).json({
        success: false,
        message: 'Mindestens eine Telefonnummer oder E-Mail-Adresse ist erforderlich'
      });
    }

    logger.log(`[Reservation] Sende Passcode für Reservierung ${reservationId}`);
    logger.log(`[Reservation] Guest Phone: ${finalGuestPhone || 'N/A'}`);
    logger.log(`[Reservation] Guest Email: ${finalGuestEmail || 'N/A'}`);

    // Rufe Service-Methode auf
    try {
      await ReservationNotificationService.sendPasscodeNotification(
        reservationId,
        {
          guestPhone: finalGuestPhone || undefined,
          guestEmail: finalGuestEmail || undefined,
          customMessage: customMessage || undefined
        }
      );
      logger.log(`[Reservation] ✅ Passcode-Versendung abgeschlossen für Reservierung ${reservationId}`);
    } catch (error) {
      logger.error(`[Reservation] ❌ Fehler bei Passcode-Versendung für Reservierung ${reservationId}:`, error);
      if (error instanceof Error) {
        logger.error(`[Reservation] Fehlermeldung: ${error.message}`);
        logger.error(`[Reservation] Stack: ${error.stack}`);
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
        ? 'Passcode generiert und Mitteilung versendet'
        : 'Mitteilung versendet, aber Passcode konnte nicht generiert werden (TTLock Fehler)'
    });
  } catch (error) {
    logger.error('[Reservation] Fehler beim Versenden des Passcodes:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Versenden des Passcodes'
    });
  }
};

/**
 * GET /api/reservations/:id/notification-logs
 * Gibt Notification-Logs UND WhatsApp-Nachrichten zurück
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

    // Lade WhatsApp-Nachrichten (eingehend und ausgehend)
    const whatsappMessages = await prisma.whatsAppMessage.findMany({
      where: {
        reservationId: reservationId
      },
      orderBy: {
        sentAt: 'desc' // Neueste zuerst
      }
    });

    return res.json({
      success: true,
      data: {
        notificationLogs: logs,
        whatsappMessages: whatsappMessages
      }
    });
  } catch (error) {
    logger.error('[Reservation] Fehler beim Laden der Notification-Logs:', error);
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

    logger.log('[Reservation] getReservationById - Status:', reservation.status);
    logger.log('[Reservation] getReservationById - PaymentStatus:', reservation.paymentStatus);

    res.json({
      success: true,
      data: reservation
    });
  } catch (error) {
    logger.error('[Reservation] Fehler beim Abrufen der Reservierung:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Reservierung'
    });
  }
};

