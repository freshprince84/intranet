import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { organizationMiddleware } from '../middleware/organization';
import { checkPermission } from '../middleware/permissionMiddleware';
import { getAllReservations, createReservation, updateGuestContact, getReservationById, generatePinAndSendNotification, sendReservationInvitation, getReservationNotificationLogs, sendPasscode } from '../controllers/reservationController';
import { logger } from '../utils/logger';

const router = express.Router();

// Alle Routen erfordern Authentifizierung und Organisation
router.use(authMiddleware);
router.use(organizationMiddleware);

// Reservierungen mit Permission-Checks
// GET prüft 'reservations' Tab mit Lesezugriff
// POST prüft 'reservation_create' Button mit Schreibzugriff
// PUT prüft 'reservation_edit' Button mit Schreibzugriff
router.get('/', checkPermission('reservations', 'read', 'tab'), (req, res, next) => {
  logger.log('[Reservations Route] GET / aufgerufen');
  logger.log('[Reservations Route] organizationId:', req.organizationId);
  getAllReservations(req, res).catch(next);
});
router.post('/', checkPermission('reservation_create', 'write', 'button'), (req, res, next) => {
  logger.log('[Reservations Route] POST / aufgerufen');
  logger.log('[Reservations Route] organizationId:', req.organizationId);
  logger.log('[Reservations Route] Body:', req.body);
  createReservation(req, res).catch(next);
});
// WICHTIG: Spezifischere Routen ZUERST, sonst werden sie als /:id interpretiert!
router.post('/:id/send-invitation', checkPermission('reservation_send_invitation', 'write', 'button'), (req, res, next) => {
  logger.log('[Reservations Route] POST /:id/send-invitation aufgerufen');
  logger.log('[Reservations Route] Reservation ID:', req.params.id);
  sendReservationInvitation(req, res).catch(next);
});
router.post('/:id/generate-pin-and-send', checkPermission('reservation_send_passcode', 'write', 'button'), (req, res, next) => {
  logger.log('[Reservations Route] POST /:id/generate-pin-and-send aufgerufen');
  logger.log('[Reservations Route] Reservation ID:', req.params.id);
  generatePinAndSendNotification(req, res).catch(next);
});
router.post('/:id/send-passcode', checkPermission('reservation_send_passcode', 'write', 'button'), (req, res, next) => {
  logger.log('[Reservations Route] POST /:id/send-passcode aufgerufen');
  logger.log('[Reservations Route] Reservation ID:', req.params.id);
  sendPasscode(req, res).catch(next);
});
router.get('/:id/notification-logs', checkPermission('reservations', 'read', 'tab'), (req, res, next) => {
  logger.log('[Reservations Route] GET /:id/notification-logs aufgerufen');
  logger.log('[Reservations Route] Reservation ID:', req.params.id);
  getReservationNotificationLogs(req, res).catch(next);
});
router.put('/:id/guest-contact', checkPermission('reservation_edit', 'write', 'button'), updateGuestContact);
router.get('/:id', checkPermission('reservations', 'read', 'tab'), getReservationById);

export default router;

