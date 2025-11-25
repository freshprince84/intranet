"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tourReservationController_1 = require("../controllers/tourReservationController");
const auth_1 = require("../middleware/auth");
const organization_1 = require("../middleware/organization");
const router = (0, express_1.Router)();
// Alle Routen mit Authentifizierung schützen
router.use(auth_1.authMiddleware);
router.use(organization_1.organizationMiddleware);
// Tour-Reservation-Routen
router.post('/', tourReservationController_1.createTourReservation);
router.put('/:id', tourReservationController_1.updateTourReservation);
router.delete('/:id', tourReservationController_1.deleteTourReservation);
router.get('/reservation/:reservationId', tourReservationController_1.getTourReservationsByReservation);
router.get('/booking/:bookingId', tourReservationController_1.getTourReservationsByBooking);
exports.default = router;
//# sourceMappingURL=tourReservations.js.map