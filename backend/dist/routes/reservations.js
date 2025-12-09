"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const organization_1 = require("../middleware/organization");
const reservationController_1 = require("../controllers/reservationController");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
// Alle Routen erfordern Authentifizierung und Organisation
router.use(auth_1.authMiddleware);
router.use(organization_1.organizationMiddleware);
// Reservierungen
// WICHTIG: GET / muss VOR GET /:id kommen, sonst wird / als :id interpretiert!
router.get('/', (req, res, next) => {
    logger_1.logger.log('[Reservations Route] GET / aufgerufen');
    logger_1.logger.log('[Reservations Route] organizationId:', req.organizationId);
    (0, reservationController_1.getAllReservations)(req, res).catch(next);
});
router.post('/', (req, res, next) => {
    logger_1.logger.log('[Reservations Route] POST / aufgerufen');
    logger_1.logger.log('[Reservations Route] organizationId:', req.organizationId);
    logger_1.logger.log('[Reservations Route] Body:', req.body);
    (0, reservationController_1.createReservation)(req, res).catch(next);
});
// WICHTIG: Spezifischere Routen ZUERST, sonst werden sie als /:id interpretiert!
router.post('/:id/send-invitation', (req, res, next) => {
    logger_1.logger.log('[Reservations Route] POST /:id/send-invitation aufgerufen');
    logger_1.logger.log('[Reservations Route] Reservation ID:', req.params.id);
    (0, reservationController_1.sendReservationInvitation)(req, res).catch(next);
});
router.post('/:id/generate-pin-and-send', (req, res, next) => {
    logger_1.logger.log('[Reservations Route] POST /:id/generate-pin-and-send aufgerufen');
    logger_1.logger.log('[Reservations Route] Reservation ID:', req.params.id);
    (0, reservationController_1.generatePinAndSendNotification)(req, res).catch(next);
});
router.post('/:id/send-passcode', (req, res, next) => {
    logger_1.logger.log('[Reservations Route] POST /:id/send-passcode aufgerufen');
    logger_1.logger.log('[Reservations Route] Reservation ID:', req.params.id);
    (0, reservationController_1.sendPasscode)(req, res).catch(next);
});
router.get('/:id/notification-logs', (req, res, next) => {
    logger_1.logger.log('[Reservations Route] GET /:id/notification-logs aufgerufen');
    logger_1.logger.log('[Reservations Route] Reservation ID:', req.params.id);
    (0, reservationController_1.getReservationNotificationLogs)(req, res).catch(next);
});
router.put('/:id/guest-contact', reservationController_1.updateGuestContact);
router.get('/:id', reservationController_1.getReservationById);
exports.default = router;
//# sourceMappingURL=reservations.js.map