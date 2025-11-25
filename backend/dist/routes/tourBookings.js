"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tourBookingController_1 = require("../controllers/tourBookingController");
const auth_1 = require("../middleware/auth");
const organization_1 = require("../middleware/organization");
const router = (0, express_1.Router)();
// Alle Routen mit Authentifizierung schützen
router.use(auth_1.authMiddleware);
router.use(organization_1.organizationMiddleware);
// Tour-Booking-Routen
router.get('/', tourBookingController_1.getAllTourBookings);
router.get('/:id', tourBookingController_1.getTourBookingById);
router.post('/', tourBookingController_1.createTourBooking);
router.put('/:id', tourBookingController_1.updateTourBooking);
router.delete('/:id', tourBookingController_1.deleteTourBooking);
router.post('/:id/cancel', tourBookingController_1.cancelTourBooking);
router.post('/:id/complete', tourBookingController_1.completeTourBooking);
router.get('/user/:userId', tourBookingController_1.getUserTourBookings);
router.get('/user/:userId/commissions', tourBookingController_1.getUserCommissions);
exports.default = router;
//# sourceMappingURL=tourBookings.js.map