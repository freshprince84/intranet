"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const organization_1 = require("../middleware/organization");
const permissionMiddleware_1 = require("../middleware/permissionMiddleware");
const reservationController_1 = require("../controllers/reservationController");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
// Alle Routen erfordern Authentifizierung und Organisation
router.use(auth_1.authMiddleware);
router.use(organization_1.organizationMiddleware);
// Reservierungen mit Permission-Checks
// GET prüft 'reservations' Tab mit Lesezugriff
// POST prüft 'reservation_create' Button mit Schreibzugriff
// PUT prüft 'reservation_edit' Button mit Schreibzugriff
router.get('/', (0, permissionMiddleware_1.checkPermission)('reservations', 'read', 'tab'), (req, res, next) => {
    logger_1.logger.log('[Reservations Route] GET / aufgerufen');
    logger_1.logger.log('[Reservations Route] organizationId:', req.organizationId);
    (0, reservationController_1.getAllReservations)(req, res).catch(next);
});
router.post('/', (0, permissionMiddleware_1.checkPermission)('reservation_create', 'write', 'button'), (req, res, next) => {
    logger_1.logger.log('[Reservations Route] POST / aufgerufen');
    logger_1.logger.log('[Reservations Route] organizationId:', req.organizationId);
    logger_1.logger.log('[Reservations Route] Body:', req.body);
    (0, reservationController_1.createReservation)(req, res).catch(next);
});
// WICHTIG: Spezifischere Routen ZUERST, sonst werden sie als /:id interpretiert!
router.post('/:id/send-invitation', (0, permissionMiddleware_1.checkPermission)('reservation_send_invitation', 'write', 'button'), (req, res, next) => {
    logger_1.logger.log('[Reservations Route] POST /:id/send-invitation aufgerufen');
    logger_1.logger.log('[Reservations Route] Reservation ID:', req.params.id);
    (0, reservationController_1.sendReservationInvitation)(req, res).catch(next);
});
router.post('/:id/generate-pin-and-send', (0, permissionMiddleware_1.checkPermission)('reservation_send_passcode', 'write', 'button'), (req, res, next) => {
    logger_1.logger.log('[Reservations Route] POST /:id/generate-pin-and-send aufgerufen');
    logger_1.logger.log('[Reservations Route] Reservation ID:', req.params.id);
    (0, reservationController_1.generatePinAndSendNotification)(req, res).catch(next);
});
router.post('/:id/send-passcode', (0, permissionMiddleware_1.checkPermission)('reservation_send_passcode', 'write', 'button'), (req, res, next) => {
    logger_1.logger.log('[Reservations Route] POST /:id/send-passcode aufgerufen');
    logger_1.logger.log('[Reservations Route] Reservation ID:', req.params.id);
    (0, reservationController_1.sendPasscode)(req, res).catch(next);
});
router.get('/:id/notification-logs', (0, permissionMiddleware_1.checkPermission)('reservations', 'read', 'tab'), (req, res, next) => {
    logger_1.logger.log('[Reservations Route] GET /:id/notification-logs aufgerufen');
    logger_1.logger.log('[Reservations Route] Reservation ID:', req.params.id);
    (0, reservationController_1.getReservationNotificationLogs)(req, res).catch(next);
});
router.put('/:id/guest-contact', (0, permissionMiddleware_1.checkPermission)('reservation_edit', 'write', 'button'), reservationController_1.updateGuestContact);
router.get('/:id', (0, permissionMiddleware_1.checkPermission)('reservations', 'read', 'tab'), reservationController_1.getReservationById);
exports.default = router;
//# sourceMappingURL=reservations.js.map