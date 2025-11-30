"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.getUserCommissions = exports.getUserTourBookings = exports.completeTourBooking = exports.cancelTourBooking = exports.deleteTourBooking = exports.updateTourBooking = exports.createTourBooking = exports.getTourBookingById = exports.getAllTourBookings = void 0;
const prisma_1 = require("../utils/prisma");
const boldPaymentService_1 = require("../services/boldPaymentService");
const commissionService_1 = require("../services/commissionService");
const filterToPrisma_1 = require("../utils/filterToPrisma");
const filterCache_1 = require("../services/filterCache");
const permissionMiddleware_1 = require("../middleware/permissionMiddleware");
const organization_1 = require("../middleware/organization");
const userSelect = {
    id: true,
    username: true,
    firstName: true,
    lastName: true
};
// GET /api/tour-bookings - Alle Buchungen (mit Filtern)
const getAllTourBookings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const organizationId = req.organizationId;
        const branchId = req.branchId;
        // Filter-Parameter
        const filterId = req.query.filterId;
        const filterConditions = req.query.filterConditions
            ? JSON.parse(req.query.filterConditions)
            : undefined;
        // ✅ PAGINATION: limit/offset Parameter wieder einführen
        const limit = req.query.limit
            ? parseInt(req.query.limit, 10)
            : 20; // Standard: 20 Items
        const offset = req.query.offset
            ? parseInt(req.query.offset, 10)
            : 0; // Standard: 0
        const tourId = req.query.tourId
            ? parseInt(req.query.tourId, 10)
            : undefined;
        const status = req.query.status;
        const paymentStatus = req.query.paymentStatus;
        const bookedById = req.query.bookedById
            ? parseInt(req.query.bookedById, 10)
            : undefined;
        const bookingDateFrom = req.query.bookingDateFrom;
        const bookingDateTo = req.query.bookingDateTo;
        const tourDateFrom = req.query.tourDateFrom;
        const tourDateTo = req.query.tourDateTo;
        const search = req.query.search;
        // Filter-Bedingungen konvertieren
        let filterWhereClause = {};
        if (filterId) {
            try {
                const filterData = yield filterCache_1.filterCache.get(parseInt(filterId, 10));
                if (filterData) {
                    const conditions = JSON.parse(filterData.conditions);
                    const operators = JSON.parse(filterData.operators);
                    filterWhereClause = (0, filterToPrisma_1.convertFilterConditionsToPrismaWhere)(conditions, operators, 'tour_booking');
                    // ✅ SICHERHEIT: Validiere Filter gegen Datenisolation
                    filterWhereClause = (0, filterToPrisma_1.validateFilterAgainstIsolation)(filterWhereClause, req, 'tour_booking');
                }
            }
            catch (filterError) {
                console.error(`[getAllTourBookings] Fehler beim Laden von Filter ${filterId}:`, filterError);
            }
        }
        else if (filterConditions) {
            filterWhereClause = (0, filterToPrisma_1.convertFilterConditionsToPrismaWhere)(filterConditions.conditions || filterConditions, filterConditions.operators || [], 'tour_booking');
            // ✅ SICHERHEIT: Validiere Filter gegen Datenisolation
            filterWhereClause = (0, filterToPrisma_1.validateFilterAgainstIsolation)(filterWhereClause, req, 'tour_booking');
        }
        // ✅ ROLLEN-ISOLATION: Basis-WHERE-Bedingungen basierend auf Rolle
        const baseWhereConditions = [];
        if (organizationId) {
            if ((0, organization_1.isAdminOrOwner)(req)) {
                // Admin/Owner: Alle Tour Bookings der Organisation
                baseWhereConditions.push({ organizationId });
            }
            else {
                // User/Andere Rollen: Nur Tour Bookings der eigenen Branch
                const userBranchId = req.branchId;
                if (userBranchId) {
                    baseWhereConditions.push({ organizationId, branchId: userBranchId });
                }
                else {
                    // Fallback: Keine Tour Bookings (wenn keine Branch)
                    return res.json({
                        success: true,
                        data: [],
                        totalCount: 0,
                        hasMore: false
                    });
                }
            }
        }
        // branchId aus Query-Parameter: Nur für Admin/Owner oder wenn es die eigene Branch ist
        if (branchId) {
            if ((0, organization_1.isAdminOrOwner)(req)) {
                // Admin kann nach beliebiger Branch filtern
                baseWhereConditions.push({ branchId });
            }
            else {
                // User: Nur wenn es die eigene Branch ist
                const userBranchId = req.branchId;
                if (branchId === userBranchId) {
                    baseWhereConditions.push({ branchId });
                }
                // Sonst ignorieren (Sicherheit - wird bereits oben durch userBranchId gefiltert)
            }
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
                bookingDate: Object.assign(Object.assign({}, (bookingDateFrom ? { gte: new Date(bookingDateFrom) } : {})), (bookingDateTo ? { lte: new Date(bookingDateTo) } : {}))
            });
        }
        if (tourDateFrom || tourDateTo) {
            baseWhereConditions.push({
                tourDate: Object.assign(Object.assign({}, (tourDateFrom ? { gte: new Date(tourDateFrom) } : {})), (tourDateTo ? { lte: new Date(tourDateTo) } : {}))
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
        const whereClause = baseWhereConditions.length === 1
            ? baseWhereConditions[0]
            : { AND: baseWhereConditions };
        // ✅ PAGINATION: totalCount für Infinite Scroll
        const totalCount = yield prisma_1.prisma.tourBooking.count({
            where: whereClause
        });
        const bookings = yield prisma_1.prisma.tourBooking.findMany({
            where: whereClause,
            // ✅ PAGINATION: Nur limit Items laden, offset überspringen
            take: limit,
            skip: offset,
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
        // ✅ PAGINATION: Response mit totalCount für Infinite Scroll
        res.json({
            success: true,
            data: bookings,
            totalCount: totalCount,
            limit: limit,
            offset: offset,
            hasMore: offset + bookings.length < totalCount
        });
    }
    catch (error) {
        console.error('[getAllTourBookings] Fehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Laden der Buchungen'
        });
    }
});
exports.getAllTourBookings = getAllTourBookings;
// GET /api/tour-bookings/:id - Einzelne Buchung
const getTourBookingById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const bookingId = parseInt(id, 10);
        if (isNaN(bookingId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Buchungs-ID'
            });
        }
        const booking = yield prisma_1.prisma.tourBooking.findUnique({
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
    }
    catch (error) {
        console.error('[getTourBookingById] Fehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Laden der Buchung'
        });
    }
});
exports.getTourBookingById = getTourBookingById;
// POST /api/tour-bookings - Neue Buchung erstellen
const createTourBooking = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Berechtigung prüfen
        const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(parseInt(req.userId), parseInt(req.roleId), 'tour_booking_create', 'write', 'button');
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Keine Berechtigung zum Erstellen von Buchungen'
            });
        }
        const userId = parseInt(req.userId, 10);
        const organizationId = req.organizationId;
        const branchId = req.branchId;
        const { tourId, tourDate, numberOfParticipants, customerName, customerEmail, customerPhone, customerNotes, bookedById } = req.body;
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
        const tour = yield prisma_1.prisma.tour.findUnique({
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
        const booking = yield prisma_1.prisma.tourBooking.create({
            data: {
                tourId: tour.id,
                tourDate: tourDateObj,
                numberOfParticipants,
                totalPrice,
                currency: tour.currency || 'COP',
                customerName: customerName.trim(),
                customerEmail: (customerEmail === null || customerEmail === void 0 ? void 0 : customerEmail.trim()) || null,
                customerPhone: (customerPhone === null || customerPhone === void 0 ? void 0 : customerPhone.trim()) || null,
                customerNotes: (customerNotes === null || customerNotes === void 0 ? void 0 : customerNotes.trim()) || null,
                bookedById: bookedById || userId,
                organizationId,
                branchId: branchId || null,
                isExternal: tour.type === 'external',
                amountPending: totalPrice,
                // Automatische Stornierung
                paymentDeadline: new Date(Date.now() + 60 * 60 * 1000), // 1 Stunde
                autoCancelEnabled: true,
                reservedUntil: new Date(Date.now() + 60 * 60 * 1000) // 1 Stunde
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
            yield (0, commissionService_1.calculateCommission)(booking.id);
        }
        catch (commissionError) {
            console.error('[createTourBooking] Fehler bei Kommissions-Berechnung:', commissionError);
            // Nicht abbrechen, nur loggen
        }
        // Generiere Payment Link (analog zu Reservations)
        let paymentLink = null;
        if (totalPrice > 0 && (customerPhone || customerEmail)) {
            try {
                // Erstelle "Dummy"-Reservation für Payment Link (Bold Payment erwartet Reservation)
                // TODO: Eigentlich sollte BoldPaymentService auch TourBookings unterstützen
                // Für jetzt: Verwende Reservation als Workaround
                const dummyReservation = yield prisma_1.prisma.reservation.create({
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
                    ? yield boldPaymentService_1.BoldPaymentService.createForBranch(branchId)
                    : new boldPaymentService_1.BoldPaymentService(organizationId);
                paymentLink = yield boldPaymentService.createPaymentLink(dummyReservation, totalPrice, tour.currency || 'COP', `Zahlung für Tour-Buchung: ${tour.title}`);
                // Aktualisiere Buchung mit Payment Link
                yield prisma_1.prisma.tourBooking.update({
                    where: { id: booking.id },
                    data: { paymentLink }
                });
                // Lösche Dummy-Reservation wieder (oder behalte sie für Tracking?)
                // await prisma.reservation.delete({ where: { id: dummyReservation.id } });
            }
            catch (paymentError) {
                console.error('[createTourBooking] Fehler beim Erstellen des Payment-Links:', paymentError);
                // Nicht abbrechen, nur loggen
            }
        }
        // Bei externer Tour: WhatsApp-Nachricht an Anbieter senden
        if (tour.type === 'external' && ((_a = tour.externalProvider) === null || _a === void 0 ? void 0 : _a.phone)) {
            try {
                const { TourWhatsAppService } = yield Promise.resolve().then(() => __importStar(require('../services/tourWhatsAppService')));
                yield TourWhatsAppService.sendBookingRequestToProvider(booking.id, organizationId, branchId);
            }
            catch (whatsappError) {
                console.error('[createTourBooking] Fehler beim Senden der WhatsApp-Nachricht:', whatsappError);
                // Nicht abbrechen, nur loggen
            }
        }
        // Notifications erstellen
        const { TourNotificationService } = yield Promise.resolve().then(() => __importStar(require('../services/tourNotificationService')));
        yield TourNotificationService.notifyTourBooked(booking.id, tourId, organizationId, userId);
        if (tour.type === 'external') {
            yield TourNotificationService.notifyTourRequested(booking.id, tourId, organizationId, branchId, userId);
        }
        // Lade vollständige Buchung
        const fullBooking = yield prisma_1.prisma.tourBooking.findUnique({
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
    }
    catch (error) {
        console.error('[createTourBooking] Fehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Erstellen der Buchung'
        });
    }
});
exports.createTourBooking = createTourBooking;
// PUT /api/tour-bookings/:id - Buchung aktualisieren
const updateTourBooking = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Berechtigung prüfen
        const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(parseInt(req.userId), parseInt(req.roleId), 'tour_booking_edit', 'write', 'button');
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
        const existingBooking = yield prisma_1.prisma.tourBooking.findUnique({
            where: { id: bookingId },
            include: { tour: true }
        });
        if (!existingBooking) {
            return res.status(404).json({
                success: false,
                message: 'Buchung nicht gefunden'
            });
        }
        const { tourDate, numberOfParticipants, customerName, customerEmail, customerPhone, customerNotes } = req.body;
        const updateData = {};
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
                yield (0, commissionService_1.calculateCommission)(bookingId);
            }
            catch (commissionError) {
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
        if (customerEmail !== undefined)
            updateData.customerEmail = (customerEmail === null || customerEmail === void 0 ? void 0 : customerEmail.trim()) || null;
        if (customerPhone !== undefined)
            updateData.customerPhone = (customerPhone === null || customerPhone === void 0 ? void 0 : customerPhone.trim()) || null;
        if (customerNotes !== undefined)
            updateData.customerNotes = (customerNotes === null || customerNotes === void 0 ? void 0 : customerNotes.trim()) || null;
        const booking = yield prisma_1.prisma.tourBooking.update({
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
    }
    catch (error) {
        console.error('[updateTourBooking] Fehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Aktualisieren der Buchung'
        });
    }
});
exports.updateTourBooking = updateTourBooking;
// DELETE /api/tour-bookings/:id - Buchung löschen
const deleteTourBooking = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Berechtigung prüfen
        const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(parseInt(req.userId), parseInt(req.roleId), 'tour_booking_edit', 'write', 'button');
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
        const reservations = yield prisma_1.prisma.tourReservation.findMany({
            where: { bookingId }
        });
        if (reservations.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Buchung kann nicht gelöscht werden, da Reservations verknüpft sind'
            });
        }
        yield prisma_1.prisma.tourBooking.delete({
            where: { id: bookingId }
        });
        res.json({
            success: true,
            message: 'Buchung gelöscht'
        });
    }
    catch (error) {
        console.error('[deleteTourBooking] Fehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Löschen der Buchung'
        });
    }
});
exports.deleteTourBooking = deleteTourBooking;
// POST /api/tour-bookings/:id/cancel - Buchung stornieren
const cancelTourBooking = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const booking = yield prisma_1.prisma.tourBooking.update({
            where: { id: bookingId },
            data: {
                status: 'cancelled',
                cancelledBy,
                cancelledAt: new Date(),
                cancelledReason: (reason === null || reason === void 0 ? void 0 : reason.trim()) || null
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
        // Notifications senden
        const { TourNotificationService } = yield Promise.resolve().then(() => __importStar(require('../services/tourNotificationService')));
        const bookingForNotification = yield prisma_1.prisma.tourBooking.findUnique({
            where: { id: bookingId },
            include: {
                tour: {
                    select: {
                        id: true,
                        title: true,
                        organizationId: true
                    }
                },
                bookedBy: {
                    select: {
                        id: true
                    }
                }
            }
        });
        if (bookingForNotification) {
            if (cancelledBy === 'customer') {
                yield TourNotificationService.notifyTourCancelledByCustomer(bookingId, bookingForNotification.tour.id, bookingForNotification.tour.organizationId, bookingForNotification.bookedById);
            }
            else if (cancelledBy === 'provider') {
                yield TourNotificationService.notifyTourCancelledByProvider(bookingId, bookingForNotification.tour.id, bookingForNotification.tour.organizationId, bookingForNotification.bookedById);
            }
        }
        // WhatsApp-Benachrichtigung an Kunde senden
        if (bookingForNotification === null || bookingForNotification === void 0 ? void 0 : bookingForNotification.customerPhone) {
            try {
                const { TourWhatsAppService } = yield Promise.resolve().then(() => __importStar(require('../services/tourWhatsAppService')));
                yield TourWhatsAppService.sendCancellationToCustomer(bookingId, bookingForNotification.tour.organizationId, bookingForNotification.branchId || null, (reason === null || reason === void 0 ? void 0 : reason.trim()) || undefined);
            }
            catch (whatsappError) {
                console.error('[cancelTourBooking] Fehler beim Senden der WhatsApp-Nachricht:', whatsappError);
                // Nicht abbrechen, nur loggen
            }
        }
        res.json({
            success: true,
            data: booking
        });
    }
    catch (error) {
        console.error('[cancelTourBooking] Fehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Stornieren der Buchung'
        });
    }
});
exports.cancelTourBooking = cancelTourBooking;
// POST /api/tour-bookings/:id/complete - Buchung als abgeschlossen markieren
const completeTourBooking = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const bookingId = parseInt(id, 10);
        if (isNaN(bookingId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Buchungs-ID'
            });
        }
        const booking = yield prisma_1.prisma.tourBooking.update({
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
    }
    catch (error) {
        console.error('[completeTourBooking] Fehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Markieren der Buchung als abgeschlossen'
        });
    }
});
exports.completeTourBooking = completeTourBooking;
// GET /api/tour-bookings/user/:userId - Buchungen eines Mitarbeiters
const getUserTourBookings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const userIdNum = parseInt(userId, 10);
        const startDate = req.query.startDate
            ? new Date(req.query.startDate)
            : undefined;
        const endDate = req.query.endDate
            ? new Date(req.query.endDate)
            : undefined;
        const status = req.query.status;
        if (isNaN(userIdNum)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige User-ID'
            });
        }
        const whereClause = {
            bookedById: userIdNum
        };
        if (startDate || endDate) {
            whereClause.bookingDate = Object.assign(Object.assign({}, (startDate ? { gte: startDate } : {})), (endDate ? { lte: endDate } : {}));
        }
        if (status) {
            whereClause.status = status;
        }
        const bookings = yield prisma_1.prisma.tourBooking.findMany({
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
    }
    catch (error) {
        console.error('[getUserTourBookings] Fehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Laden der Buchungen'
        });
    }
});
exports.getUserTourBookings = getUserTourBookings;
// GET /api/tour-bookings/user/:userId/commissions - Kommissionen eines Mitarbeiters
const getUserCommissions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const userIdNum = parseInt(userId, 10);
        const startDate = req.query.startDate
            ? new Date(req.query.startDate)
            : new Date(new Date().getFullYear(), 0, 1); // Anfang des Jahres
        const endDate = req.query.endDate
            ? new Date(req.query.endDate)
            : new Date();
        if (isNaN(userIdNum)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige User-ID'
            });
        }
        const { getUserCommissionStats } = yield Promise.resolve().then(() => __importStar(require('../services/commissionService')));
        const stats = yield getUserCommissionStats(userIdNum, startDate, endDate);
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('[getUserCommissions] Fehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Laden der Kommissionen'
        });
    }
});
exports.getUserCommissions = getUserCommissions;
//# sourceMappingURL=tourBookingController.js.map