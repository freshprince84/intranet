import { Request, Response } from 'express';
import { Prisma, PaymentStatus, TourBookingStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { BoldPaymentService } from '../services/boldPaymentService';
import { calculateCommission } from '../services/commissionService';
import { convertFilterConditionsToPrismaWhere } from '../utils/filterToPrisma';
import { filterCache } from '../services/filterCache';
import { checkUserPermission } from '../middleware/permissionMiddleware';
// TODO: import { TourWhatsAppService } from '../services/tourWhatsAppService';
// TODO: import { createNotificationIfEnabled } from './notificationController';

interface AuthenticatedRequest extends Request {
  userId: string;
}

const userSelect = {
  id: true,
  username: true,
  firstName: true,
  lastName: true
} as const;

// GET /api/tour-bookings - Alle Buchungen (mit Filtern)
export const getAllTourBookings = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.userId as string, 10);
    const organizationId = (req as any).organizationId;
    const branchId = (req as any).branchId;

    // Filter-Parameter
    const filterId = req.query.filterId as string | undefined;
    const filterConditions = req.query.filterConditions 
      ? JSON.parse(req.query.filterConditions as string) 
      : undefined;
    const limit = req.query.limit 
      ? parseInt(req.query.limit as string, 10) 
      : 50;
    const tourId = req.query.tourId 
      ? parseInt(req.query.tourId as string, 10) 
      : undefined;
    const status = req.query.status as TourBookingStatus | undefined;
    const paymentStatus = req.query.paymentStatus as PaymentStatus | undefined;
    const bookedById = req.query.bookedById 
      ? parseInt(req.query.bookedById as string, 10) 
      : undefined;
    const bookingDateFrom = req.query.bookingDateFrom as string | undefined;
    const bookingDateTo = req.query.bookingDateTo as string | undefined;
    const tourDateFrom = req.query.tourDateFrom as string | undefined;
    const tourDateTo = req.query.tourDateTo as string | undefined;
    const search = req.query.search as string | undefined;

    // Filter-Bedingungen konvertieren
    let filterWhereClause: any = {};
    if (filterId) {
      try {
        const filterData = await filterCache.get(parseInt(filterId, 10));
        if (filterData) {
          const conditions = JSON.parse(filterData.conditions);
          const operators = JSON.parse(filterData.operators);
          filterWhereClause = convertFilterConditionsToPrismaWhere(
            conditions,
            operators,
            'tour_booking'
          );
        }
      } catch (filterError) {
        console.error(`[getAllTourBookings] Fehler beim Laden von Filter ${filterId}:`, filterError);
      }
    } else if (filterConditions) {
      filterWhereClause = convertFilterConditionsToPrismaWhere(
        filterConditions.conditions || filterConditions,
        filterConditions.operators || [],
        'tour_booking'
      );
    }

    // Basis-WHERE-Bedingungen
    const baseWhereConditions: any[] = [];

    if (organizationId) {
      baseWhereConditions.push({ organizationId });
    }
    if (branchId) {
      baseWhereConditions.push({ branchId });
    }
    if (tourId) {
      baseWhereConditions.push({ tourId });
    }
    if (status) {
      baseWhereConditions.push({ status });
    }
    if (paymentStatus) {
      baseWhereConditions.push({ paymentStatus });
    }
    if (bookedById) {
      baseWhereConditions.push({ bookedById });
    }
    if (bookingDateFrom || bookingDateTo) {
      baseWhereConditions.push({
        bookingDate: {
          ...(bookingDateFrom ? { gte: new Date(bookingDateFrom) } : {}),
          ...(bookingDateTo ? { lte: new Date(bookingDateTo) } : {})
        }
      });
    }
    if (tourDateFrom || tourDateTo) {
      baseWhereConditions.push({
        tourDate: {
          ...(tourDateFrom ? { gte: new Date(tourDateFrom) } : {}),
          ...(tourDateTo ? { lte: new Date(tourDateTo) } : {})
        }
      });
    }
    if (search) {
      baseWhereConditions.push({
        OR: [
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerEmail: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    if (Object.keys(filterWhereClause).length > 0) {
      baseWhereConditions.push(filterWhereClause);
    }

    const whereClause: Prisma.TourBookingWhereInput = baseWhereConditions.length === 1
      ? baseWhereConditions[0]
      : { AND: baseWhereConditions };

    const bookings = await prisma.tourBooking.findMany({
      where: whereClause,
      take: limit,
      include: {
        tour: {
          select: {
            id: true,
            title: true,
            type: true
          }
        },
        bookedBy: {
          select: userSelect
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        bookingDate: 'desc'
      }
    });

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('[getAllTourBookings] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Buchungen'
    });
  }
};

// GET /api/tour-bookings/:id - Einzelne Buchung
export const getTourBookingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bookingId = parseInt(id, 10);

    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Buchungs-ID'
      });
    }

    const booking = await prisma.tourBooking.findUnique({
      where: { id: bookingId },
      include: {
        tour: {
          include: {
            externalProvider: true
          }
        },
        bookedBy: {
          select: userSelect
        },
        reservations: {
          include: {
            reservation: {
              select: {
                id: true,
                guestName: true,
                checkInDate: true,
                checkOutDate: true
              }
            }
          }
        },
        whatsappMessages: {
          orderBy: {
            sentAt: 'desc'
          },
          take: 10
        }
      }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Buchung nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('[getTourBookingById] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Buchung'
    });
  }
};

// POST /api/tour-bookings - Neue Buchung erstellen
export const createTourBooking = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Berechtigung prüfen
    const hasPermission = await checkUserPermission(
      parseInt(req.userId),
      'tour_booking_create',
      'button'
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Erstellen von Buchungen'
      });
    }

    const userId = parseInt(req.userId, 10);
    const organizationId = (req as any).organizationId;
    const branchId = (req as any).branchId;

    const {
      tourId,
      tourDate,
      numberOfParticipants,
      customerName,
      customerEmail,
      customerPhone,
      customerNotes,
      bookedById
    } = req.body;

    // Validierung
    if (!tourId || isNaN(parseInt(tourId, 10))) {
      return res.status(400).json({
        success: false,
        message: 'Tour-ID ist erforderlich'
      });
    }

    if (!tourDate) {
      return res.status(400).json({
        success: false,
        message: 'Tour-Datum ist erforderlich'
      });
    }

    const tourDateObj = new Date(tourDate);
    if (tourDateObj < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Tour-Datum muss in der Zukunft sein'
      });
    }

    if (!numberOfParticipants || numberOfParticipants < 1) {
      return res.status(400).json({
        success: false,
        message: 'Anzahl Teilnehmer muss >= 1 sein'
      });
    }

    if (!customerName || customerName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Kundenname muss mindestens 2 Zeichen lang sein'
      });
    }

    if (!customerPhone && !customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Mindestens eine Kontaktinformation (Telefon oder E-Mail) ist erforderlich'
      });
    }

    // Lade Tour
    const tour = await prisma.tour.findUnique({
      where: { id: parseInt(tourId, 10) },
      include: {
        externalProvider: true
      }
    });

    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour nicht gefunden'
      });
    }

    if (!tour.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Tour ist nicht aktiv'
      });
    }

    // Validierung: Anzahl Teilnehmer
    if (tour.minParticipants && numberOfParticipants < tour.minParticipants) {
      return res.status(400).json({
        success: false,
        message: `Mindestens ${tour.minParticipants} Teilnehmer erforderlich`
      });
    }
    if (tour.maxParticipants && numberOfParticipants > tour.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: `Maximal ${tour.maxParticipants} Teilnehmer erlaubt`
      });
    }

    // Berechne Gesamtpreis
    const totalPrice = tour.price 
      ? Number(tour.price) * numberOfParticipants 
      : 0;

    // Erstelle Buchung
    const booking = await prisma.tourBooking.create({
      data: {
        tourId: tour.id,
        tourDate: tourDateObj,
        numberOfParticipants,
        totalPrice,
        currency: tour.currency || 'COP',
        customerName: customerName.trim(),
        customerEmail: customerEmail?.trim() || null,
        customerPhone: customerPhone?.trim() || null,
        customerNotes: customerNotes?.trim() || null,
        bookedById: bookedById || userId,
        organizationId,
        branchId: branchId || null,
        isExternal: tour.type === 'external',
        amountPending: totalPrice
      },
      include: {
        tour: {
          include: {
            externalProvider: true
          }
        },
        bookedBy: {
          select: userSelect
        }
      }
    });

    // Berechne Kommission
    try {
      await calculateCommission(booking.id);
    } catch (commissionError) {
      console.error('[createTourBooking] Fehler bei Kommissions-Berechnung:', commissionError);
      // Nicht abbrechen, nur loggen
    }

    // Generiere Payment Link (analog zu Reservations)
    let paymentLink: string | null = null;
    if (totalPrice > 0 && (customerPhone || customerEmail)) {
      try {
        // Erstelle "Dummy"-Reservation für Payment Link (Bold Payment erwartet Reservation)
        // TODO: Eigentlich sollte BoldPaymentService auch TourBookings unterstützen
        // Für jetzt: Verwende Reservation als Workaround
        const dummyReservation = await prisma.reservation.create({
          data: {
            guestName: customerName,
            guestPhone: customerPhone || null,
            guestEmail: customerEmail || null,
            checkInDate: tourDateObj,
            checkOutDate: new Date(tourDateObj.getTime() + 24 * 60 * 60 * 1000), // +1 Tag
            status: 'confirmed',
            paymentStatus: 'pending',
            amount: totalPrice,
            currency: tour.currency || 'COP',
            organizationId,
            branchId: branchId || null
          }
        });

        const boldPaymentService = branchId
          ? await BoldPaymentService.createForBranch(branchId)
          : new BoldPaymentService(organizationId);

        paymentLink = await boldPaymentService.createPaymentLink(
          dummyReservation,
          totalPrice,
          tour.currency || 'COP',
          `Zahlung für Tour-Buchung: ${tour.title}`
        );

        // Aktualisiere Buchung mit Payment Link
        await prisma.tourBooking.update({
          where: { id: booking.id },
          data: { paymentLink }
        });

        // Lösche Dummy-Reservation wieder (oder behalte sie für Tracking?)
        // await prisma.reservation.delete({ where: { id: dummyReservation.id } });
      } catch (paymentError) {
        console.error('[createTourBooking] Fehler beim Erstellen des Payment-Links:', paymentError);
        // Nicht abbrechen, nur loggen
      }
    }

    // Bei externer Tour: WhatsApp-Nachricht an Anbieter senden
    if (tour.type === 'external' && tour.externalProvider?.phone) {
      // TODO: Implementiere TourWhatsAppService.sendBookingRequestToProvider()
      console.log(`[createTourBooking] TODO: WhatsApp-Nachricht an Anbieter senden: ${tour.externalProvider.phone}`);
    }

    // TODO: Notifications erstellen
    // - Tour gebucht (an alle in org)
    // - Tour angefragt (an definierte Rolle in branch in org) - nur bei externer Tour

    // Lade vollständige Buchung
    const fullBooking = await prisma.tourBooking.findUnique({
      where: { id: booking.id },
      include: {
        tour: {
          include: {
            externalProvider: true
          }
        },
        bookedBy: {
          select: userSelect
        }
      }
    });

    res.status(201).json({
      success: true,
      data: fullBooking
    });
  } catch (error) {
    console.error('[createTourBooking] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Buchung'
    });
  }
};

// PUT /api/tour-bookings/:id - Buchung aktualisieren
export const updateTourBooking = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Berechtigung prüfen
    const hasPermission = await checkUserPermission(
      parseInt(req.userId),
      'tour_booking_edit',
      'button'
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Bearbeiten von Buchungen'
      });
    }

    const { id } = req.params;
    const bookingId = parseInt(id, 10);

    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Buchungs-ID'
      });
    }

    const existingBooking = await prisma.tourBooking.findUnique({
      where: { id: bookingId },
      include: { tour: true }
    });

    if (!existingBooking) {
      return res.status(404).json({
        success: false,
        message: 'Buchung nicht gefunden'
      });
    }

    const {
      tourDate,
      numberOfParticipants,
      customerName,
      customerEmail,
      customerPhone,
      customerNotes
    } = req.body;

    const updateData: any = {};

    if (tourDate !== undefined) {
      const tourDateObj = new Date(tourDate);
      if (tourDateObj < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Tour-Datum muss in der Zukunft sein'
        });
      }
      updateData.tourDate = tourDateObj;
    }

    if (numberOfParticipants !== undefined) {
      if (numberOfParticipants < 1) {
        return res.status(400).json({
          success: false,
          message: 'Anzahl Teilnehmer muss >= 1 sein'
        });
      }

      // Validierung: Anzahl Teilnehmer
      if (existingBooking.tour.minParticipants && numberOfParticipants < existingBooking.tour.minParticipants) {
        return res.status(400).json({
          success: false,
          message: `Mindestens ${existingBooking.tour.minParticipants} Teilnehmer erforderlich`
        });
      }
      if (existingBooking.tour.maxParticipants && numberOfParticipants > existingBooking.tour.maxParticipants) {
        return res.status(400).json({
          success: false,
          message: `Maximal ${existingBooking.tour.maxParticipants} Teilnehmer erlaubt`
        });
      }

      // Neuberechnung des Gesamtpreises
      const newTotalPrice = existingBooking.tour.price 
        ? Number(existingBooking.tour.price) * numberOfParticipants 
        : 0;
      updateData.numberOfParticipants = numberOfParticipants;
      updateData.totalPrice = newTotalPrice;
      
      // Neuberechnung von amountPending
      const currentAmountPaid = existingBooking.amountPaid ? Number(existingBooking.amountPaid) : 0;
      updateData.amountPending = newTotalPrice - currentAmountPaid;

      // Neuberechnung der Kommission
      try {
        await calculateCommission(bookingId);
      } catch (commissionError) {
        console.error('[updateTourBooking] Fehler bei Kommissions-Berechnung:', commissionError);
      }
    }

    if (customerName !== undefined) {
      if (customerName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Kundenname muss mindestens 2 Zeichen lang sein'
        });
      }
      updateData.customerName = customerName.trim();
    }
    if (customerEmail !== undefined) updateData.customerEmail = customerEmail?.trim() || null;
    if (customerPhone !== undefined) updateData.customerPhone = customerPhone?.trim() || null;
    if (customerNotes !== undefined) updateData.customerNotes = customerNotes?.trim() || null;

    const booking = await prisma.tourBooking.update({
      where: { id: bookingId },
      data: updateData,
      include: {
        tour: {
          include: {
            externalProvider: true
          }
        },
        bookedBy: {
          select: userSelect
        }
      }
    });

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('[updateTourBooking] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Buchung'
    });
  }
};

// DELETE /api/tour-bookings/:id - Buchung löschen
export const deleteTourBooking = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Berechtigung prüfen
    const hasPermission = await checkUserPermission(
      parseInt(req.userId),
      'tour_booking_edit',
      'button'
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung zum Löschen von Buchungen'
      });
    }

    const { id } = req.params;
    const bookingId = parseInt(id, 10);

    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Buchungs-ID'
      });
    }

    // Prüfe ob Reservations verknüpft sind
    const reservations = await prisma.tourReservation.findMany({
      where: { bookingId }
    });

    if (reservations.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Buchung kann nicht gelöscht werden, da Reservations verknüpft sind'
      });
    }

    await prisma.tourBooking.delete({
      where: { id: bookingId }
    });

    res.json({
      success: true,
      message: 'Buchung gelöscht'
    });
  } catch (error) {
    console.error('[deleteTourBooking] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Buchung'
    });
  }
};

// POST /api/tour-bookings/:id/cancel - Buchung stornieren
export const cancelTourBooking = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const bookingId = parseInt(id, 10);
    const { reason, cancelledBy } = req.body;

    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Buchungs-ID'
      });
    }

    if (!cancelledBy || !['customer', 'provider'].includes(cancelledBy)) {
      return res.status(400).json({
        success: false,
        message: 'cancelledBy muss "customer" oder "provider" sein'
      });
    }

    const booking = await prisma.tourBooking.update({
      where: { id: bookingId },
      data: {
        status: 'cancelled',
        cancelledBy,
        cancelledAt: new Date(),
        cancelledReason: reason?.trim() || null
      },
      include: {
        tour: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    // TODO: TourWhatsAppService.sendCancellationToCustomer()
    // TODO: Notification erstellen (Tour gecancelt von kunde/anbieter)

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('[cancelTourBooking] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Stornieren der Buchung'
    });
  }
};

// POST /api/tour-bookings/:id/complete - Buchung als abgeschlossen markieren
export const completeTourBooking = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const bookingId = parseInt(id, 10);

    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Buchungs-ID'
      });
    }

    const booking = await prisma.tourBooking.update({
      where: { id: bookingId },
      data: {
        status: 'completed'
      },
      include: {
        tour: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('[completeTourBooking] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Markieren der Buchung als abgeschlossen'
    });
  }
};

// GET /api/tour-bookings/user/:userId - Buchungen eines Mitarbeiters
export const getUserTourBookings = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userIdNum = parseInt(userId, 10);
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string) 
      : undefined;
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate as string) 
      : undefined;
    const status = req.query.status as TourBookingStatus | undefined;

    if (isNaN(userIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige User-ID'
      });
    }

    const whereClause: Prisma.TourBookingWhereInput = {
      bookedById: userIdNum
    };

    if (startDate || endDate) {
      whereClause.bookingDate = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {})
      };
    }
    if (status) {
      whereClause.status = status;
    }

    const bookings = await prisma.tourBooking.findMany({
      where: whereClause,
      include: {
        tour: {
          select: {
            id: true,
            title: true,
            type: true
          }
        }
      },
      orderBy: {
        bookingDate: 'desc'
      }
    });

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('[getUserTourBookings] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Buchungen'
    });
  }
};

// GET /api/tour-bookings/user/:userId/commissions - Kommissionen eines Mitarbeiters
export const getUserCommissions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userIdNum = parseInt(userId, 10);
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string) 
      : new Date(new Date().getFullYear(), 0, 1); // Anfang des Jahres
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate as string) 
      : new Date();

    if (isNaN(userIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige User-ID'
      });
    }

    const { getUserCommissionStats } = await import('../services/commissionService');
    const stats = await getUserCommissionStats(userIdNum, startDate, endDate);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[getUserCommissions] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Kommissionen'
    });
  }
};


