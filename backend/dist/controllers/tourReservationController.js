"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTourReservationsByBooking = exports.getTourReservationsByReservation = exports.deleteTourReservation = exports.updateTourReservation = exports.createTourReservation = void 0;
const prisma_1 = require("../utils/prisma");
// POST /api/tour-reservations - Tour mit Reservation verknüpfen
const createTourReservation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tourId, bookingId, reservationId, tourPrice, accommodationPrice, currency = 'COP' } = req.body;
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
        const reservation = yield prisma_1.prisma.reservation.findUnique({
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
        const existing = yield prisma_1.prisma.tourReservation.findUnique({
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
        const tourReservation = yield prisma_1.prisma.tourReservation.create({
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
    }
    catch (error) {
        console.error('[createTourReservation] Fehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Erstellen der Verknüpfung'
        });
    }
});
exports.createTourReservation = createTourReservation;
// PUT /api/tour-reservations/:id - Verknüpfung aktualisieren
const updateTourReservation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const tourReservationId = parseInt(id, 10);
        if (isNaN(tourReservationId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Verknüpfungs-ID'
            });
        }
        const existing = yield prisma_1.prisma.tourReservation.findUnique({
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
        const { tourPrice, accommodationPrice, tourPricePaid, accommodationPaid } = req.body;
        const updateData = {};
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
        const tourReservation = yield prisma_1.prisma.tourReservation.update({
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
    }
    catch (error) {
        console.error('[updateTourReservation] Fehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Aktualisieren der Verknüpfung'
        });
    }
});
exports.updateTourReservation = updateTourReservation;
// DELETE /api/tour-reservations/:id - Verknüpfung löschen
const deleteTourReservation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const tourReservationId = parseInt(id, 10);
        if (isNaN(tourReservationId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Verknüpfungs-ID'
            });
        }
        yield prisma_1.prisma.tourReservation.delete({
            where: { id: tourReservationId }
        });
        res.json({
            success: true,
            message: 'Verknüpfung gelöscht'
        });
    }
    catch (error) {
        console.error('[deleteTourReservation] Fehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Löschen der Verknüpfung'
        });
    }
});
exports.deleteTourReservation = deleteTourReservation;
// GET /api/tour-reservations/reservation/:reservationId - Verknüpfungen einer Reservation
const getTourReservationsByReservation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { reservationId } = req.params;
        const reservationIdNum = parseInt(reservationId, 10);
        if (isNaN(reservationIdNum)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Reservation-ID'
            });
        }
        const tourReservations = yield prisma_1.prisma.tourReservation.findMany({
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
    }
    catch (error) {
        console.error('[getTourReservationsByReservation] Fehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Laden der Verknüpfungen'
        });
    }
});
exports.getTourReservationsByReservation = getTourReservationsByReservation;
// GET /api/tour-reservations/booking/:bookingId - Verknüpfungen einer Buchung
const getTourReservationsByBooking = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bookingId } = req.params;
        const bookingIdNum = parseInt(bookingId, 10);
        if (isNaN(bookingIdNum)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Buchungs-ID'
            });
        }
        const tourReservations = yield prisma_1.prisma.tourReservation.findMany({
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
    }
    catch (error) {
        console.error('[getTourReservationsByBooking] Fehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Laden der Verknüpfungen'
        });
    }
});
exports.getTourReservationsByBooking = getTourReservationsByBooking;
//# sourceMappingURL=tourReservationController.js.map