import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { organizationMiddleware } from '../middleware/organization';
import {
  getReservations,
  getReservationById,
  syncReservations,
  syncFullReservations,
  handleWebhook,
  validateConnection,
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

// Synchronisation
router.post('/sync', syncReservations);
router.post('/sync-full', syncFullReservations); // ✅ MEMORY: Vollständiger Sync nach check_out_date (für manuellen ersten Sync)

// Validierung
router.get('/validate', validateConnection);

export default router;

