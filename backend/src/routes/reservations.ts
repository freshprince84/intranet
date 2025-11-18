import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { organizationMiddleware } from '../middleware/organization';
import { getAllReservations, createReservation, updateGuestContact, getReservationById, generatePinAndSendNotification, sendReservationInvitation, getReservationNotificationLogs } from '../controllers/reservationController';

const router = express.Router();

// Alle Routen erfordern Authentifizierung und Organisation
router.use(authMiddleware);
router.use(organizationMiddleware);

// Reservierungen
// WICHTIG: GET / muss VOR GET /:id kommen, sonst wird / als :id interpretiert!
router.get('/', (req, res, next) => {
  console.log('[Reservations Route] GET / aufgerufen');
  console.log('[Reservations Route] organizationId:', req.organizationId);
  getAllReservations(req, res).catch(next);
});
router.post('/', (req, res, next) => {
  console.log('[Reservations Route] POST / aufgerufen');
  console.log('[Reservations Route] organizationId:', req.organizationId);
  console.log('[Reservations Route] Body:', req.body);
  createReservation(req, res).catch(next);
});
// WICHTIG: Spezifischere Routen ZUERST, sonst werden sie als /:id interpretiert!
router.post('/:id/send-invitation', (req, res, next) => {
  console.log('[Reservations Route] POST /:id/send-invitation aufgerufen');
  console.log('[Reservations Route] Reservation ID:', req.params.id);
  sendReservationInvitation(req, res).catch(next);
});
router.post('/:id/generate-pin-and-send', (req, res, next) => {
  console.log('[Reservations Route] POST /:id/generate-pin-and-send aufgerufen');
  console.log('[Reservations Route] Reservation ID:', req.params.id);
  generatePinAndSendNotification(req, res).catch(next);
});
router.get('/:id/notification-logs', (req, res, next) => {
  console.log('[Reservations Route] GET /:id/notification-logs aufgerufen');
  console.log('[Reservations Route] Reservation ID:', req.params.id);
  getReservationNotificationLogs(req, res).catch(next);
});
router.put('/:id/guest-contact', updateGuestContact);
router.get('/:id', getReservationById);

export default router;

