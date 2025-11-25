"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tourController_1 = require("../controllers/tourController");
const auth_1 = require("../middleware/auth");
const organization_1 = require("../middleware/organization");
const router = (0, express_1.Router)();
// Öffentliche Route für Export (ohne Auth, für Website/Soziale Medien)
router.get('/export', tourController_1.exportTours);
// Alle anderen Routen mit Authentifizierung schützen
router.use(auth_1.authMiddleware);
router.use(organization_1.organizationMiddleware);
// Tour-Routen
router.get('/', tourController_1.getAllTours);
router.get('/:id', tourController_1.getTourById);
router.post('/', tourController_1.createTour);
router.put('/:id', tourController_1.updateTour);
router.put('/:id/toggle-active', tourController_1.toggleTourActive);
router.get('/:id/bookings', tourController_1.getTourBookings);
exports.default = router;
//# sourceMappingURL=tours.js.map