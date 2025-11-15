"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const organization_1 = require("../middleware/organization");
const reservationController_1 = require("../controllers/reservationController");
const router = express_1.default.Router();
// Alle Routen erfordern Authentifizierung und Organisation
router.use(auth_1.authMiddleware);
router.use(organization_1.organizationMiddleware);
// Reservierungen
// WICHTIG: GET / muss VOR GET /:id kommen, sonst wird / als :id interpretiert!
router.get('/', (req, res, next) => {
    console.log('[Reservations Route] GET / aufgerufen');
    console.log('[Reservations Route] organizationId:', req.organizationId);
    (0, reservationController_1.getAllReservations)(req, res).catch(next);
});
router.post('/', (req, res, next) => {
    console.log('[Reservations Route] POST / aufgerufen');
    console.log('[Reservations Route] organizationId:', req.organizationId);
    console.log('[Reservations Route] Body:', req.body);
    (0, reservationController_1.createReservation)(req, res).catch(next);
});
router.get('/:id', reservationController_1.getReservationById);
router.put('/:id/guest-contact', reservationController_1.updateGuestContact);
exports.default = router;
//# sourceMappingURL=reservations.js.map