import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { checkUserPermission } from '../middleware/permissionMiddleware';

interface AuthenticatedRequest extends Request {
  userId: string;
}

// POST /api/tour-reservations - Tour mit Reservation verknüpfen
export const createTourReservation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      tourId,
      bookingId,
      reservationId,
      tourPrice,
      accommodationPrice,
      currency = 'COP'
    } = req.body;

    // Validierung
    if (!tourId || !bookingId || !reservationId) {
      return res.status(400).json({
        success: false,
        message: 'tourId, bookingId und reservationId sind erforderlich'
      });
    }

    if (tourPrice === undefined || accommodationPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'tourPrice und accommodationPrice sind erforderlich'
      });
    }

    const tourPriceNum = parseFloat(tourPrice);
    const accommodationPriceNum = parseFloat(accommodationPrice);

    if (tourPriceNum < 0 || accommodationPriceNum < 0) {
      return res.status(400).json({
        success: false,
        message: 'Preise müssen >= 0 sein'
      });
    }

    // Lade Reservation
    const reservation = await prisma.reservation.findUnique({
      where: { id: parseInt(reservationId, 10) }
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation nicht gefunden'
      });
    }

    // Validierung: tourPrice + accommodationPrice <= reservation.amount
    const totalPrice = tourPriceNum + accommodationPriceNum;
    const reservationAmount = reservation.amount ? Number(reservation.amount) : 0;

    if (totalPrice > reservationAmount) {
      return res.status(400).json({
        success: false,
        message: `Gesamtpreis (${totalPrice}) darf nicht größer sein als Reservationsbetrag (${reservationAmount})`
      });
    }

    // Prüfe ob Verknüpfung bereits existiert
    const existing = await prisma.tourReservation.findUnique({
      where: {
        reservationId_bookingId: {
          reservationId: parseInt(reservationId, 10),
          bookingId: parseInt(bookingId, 10)
        }
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Verknüpfung existiert bereits'
      });
    }

    // Erstelle Verknüpfung
    const tourReservation = await prisma.tourReservation.create({
      data: {
        tourId: parseInt(tourId, 10),
        bookingId: parseInt(bookingId, 10),
        reservationId: parseInt(reservationId, 10),
        tourPrice: tourPriceNum,
        accommodationPrice: accommodationPriceNum,
        currency,
        tourPricePending: tourPriceNum,
        accommodationPending: accommodationPriceNum
      },
      include: {
        tour: {
          select: {
            id: true,
            title: true
          }
        },
        booking: {
          select: {
            id: true,
            customerName: true
          }
        },
        reservation: {
          select: {
            id: true,
            guestName: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: tourReservation
    });
  } catch (error) {
    console.error('[createTourReservation] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Verknüpfung'
    });
  }
};

// PUT /api/tour-reservations/:id - Verknüpfung aktualisieren
export const updateTourReservation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tourReservationId = parseInt(id, 10);

    if (isNaN(tourReservationId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Verknüpfungs-ID'
      });
    }

    const existing = await prisma.tourReservation.findUnique({
      where: { id: tourReservationId },
      include: {
        reservation: true
      }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Verknüpfung nicht gefunden'
      });
    }

    const {
      tourPrice,
      accommodationPrice,
      tourPricePaid,
      accommodationPaid
    } = req.body;

    const updateData: any = {};

    if (tourPrice !== undefined) {
      const tourPriceNum = parseFloat(tourPrice);
      if (tourPriceNum < 0) {
        return res.status(400).json({
          success: false,
          message: 'tourPrice muss >= 0 sein'
        });
      }
      updateData.tourPrice = tourPriceNum;
    }

    if (accommodationPrice !== undefined) {
      const accommodationPriceNum = parseFloat(accommodationPrice);
      if (accommodationPriceNum < 0) {
        return res.status(400).json({
          success: false,
          message: 'accommodationPrice muss >= 0 sein'
        });
      }
      updateData.accommodationPrice = accommodationPriceNum;
    }

    if (tourPricePaid !== undefined) {
      updateData.tourPricePaid = tourPricePaid ? parseFloat(tourPricePaid) : null;
    }

    if (accommodationPaid !== undefined) {
      updateData.accommodationPaid = accommodationPaid ? parseFloat(accommodationPaid) : null;
    }

    // Berechne Pending-Werte
    const finalTourPrice = updateData.tourPrice !== undefined ? updateData.tourPrice : Number(existing.tourPrice);
    const finalAccommodationPrice = updateData.accommodationPrice !== undefined ? updateData.accommodationPrice : Number(existing.accommodationPrice);
    const finalTourPricePaid = updateData.tourPricePaid !== undefined ? (updateData.tourPricePaid || 0) : (existing.tourPricePaid ? Number(existing.tourPricePaid) : 0);
    const finalAccommodationPaid = updateData.accommodationPaid !== undefined ? (updateData.accommodationPaid || 0) : (existing.accommodationPaid ? Number(existing.accommodationPaid) : 0);

    updateData.tourPricePending = finalTourPrice - finalTourPricePaid;
    updateData.accommodationPending = finalAccommodationPrice - finalAccommodationPaid;

    // Validierung: Gesamtpreis <= reservation.amount
    const totalPrice = finalTourPrice + finalAccommodationPrice;
    const reservationAmount = existing.reservation.amount ? Number(existing.reservation.amount) : 0;

    if (totalPrice > reservationAmount) {
      return res.status(400).json({
        success: false,
        message: `Gesamtpreis (${totalPrice}) darf nicht größer sein als Reservationsbetrag (${reservationAmount})`
      });
    }

    const tourReservation = await prisma.tourReservation.update({
      where: { id: tourReservationId },
      data: updateData,
      include: {
        tour: {
          select: {
            id: true,
            title: true
          }
        },
        booking: {
          select: {
            id: true,
            customerName: true
          }
        },
        reservation: {
          select: {
            id: true,
            guestName: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: tourReservation
    });
  } catch (error) {
    console.error('[updateTourReservation] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Verknüpfung'
    });
  }
};

// DELETE /api/tour-reservations/:id - Verknüpfung löschen
export const deleteTourReservation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tourReservationId = parseInt(id, 10);

    if (isNaN(tourReservationId)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Verknüpfungs-ID'
      });
    }

    await prisma.tourReservation.delete({
      where: { id: tourReservationId }
    });

    res.json({
      success: true,
      message: 'Verknüpfung gelöscht'
    });
  } catch (error) {
    console.error('[deleteTourReservation] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Verknüpfung'
    });
  }
};

// GET /api/tour-reservations/reservation/:reservationId - Verknüpfungen einer Reservation
export const getTourReservationsByReservation = async (req: Request, res: Response) => {
  try {
    const { reservationId } = req.params;
    const reservationIdNum = parseInt(reservationId, 10);

    if (isNaN(reservationIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Reservation-ID'
      });
    }

    const tourReservations = await prisma.tourReservation.findMany({
      where: { reservationId: reservationIdNum },
      include: {
        tour: {
          select: {
            id: true,
            title: true,
            type: true
          }
        },
        booking: {
          select: {
            id: true,
            customerName: true,
            tourDate: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: tourReservations
    });
  } catch (error) {
    console.error('[getTourReservationsByReservation] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Verknüpfungen'
    });
  }
};

// GET /api/tour-reservations/booking/:bookingId - Verknüpfungen einer Buchung
export const getTourReservationsByBooking = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params;
    const bookingIdNum = parseInt(bookingId, 10);

    if (isNaN(bookingIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Buchungs-ID'
      });
    }

    const tourReservations = await prisma.tourReservation.findMany({
      where: { bookingId: bookingIdNum },
      include: {
        tour: {
          select: {
            id: true,
            title: true,
            type: true
          }
        },
        reservation: {
          select: {
            id: true,
            guestName: true,
            checkInDate: true,
            checkOutDate: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: tourReservations
    });
  } catch (error) {
    console.error('[getTourReservationsByBooking] Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Verknüpfungen'
    });
  }
};


