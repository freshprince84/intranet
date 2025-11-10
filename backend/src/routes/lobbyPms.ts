import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { organizationMiddleware } from '../middleware/organization';
import {
  getReservations,
  getReservationById,
  syncReservations,
  checkInReservation,
  handleWebhook,
  validateConnection,
  registerSire,
  getSireStatus
} from '../controllers/lobbyPmsController';

const router = express.Router();

// Webhook-Route benötigt KEIN authMiddleware (wird von LobbyPMS aufgerufen)
// Aber sollte durch Webhook-Secret geschützt werden
router.post('/webhook', handleWebhook);

// Alle anderen Routen erfordern Authentifizierung und Organisation
router.use(authMiddleware);
router.use(organizationMiddleware);

// Reservierungen
router.get('/reservations', getReservations);
router.get('/reservations/:id', getReservationById);
router.put('/reservations/:id/check-in', checkInReservation);

// SIRE-Registrierung
router.post('/reservations/:id/register-sire', registerSire);
router.get('/reservations/:id/sire-status', getSireStatus);

// Synchronisation
router.post('/sync', syncReservations);

// Validierung
router.get('/validate', validateConnection);

export default router;

