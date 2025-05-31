import express from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getRecentClients
} from '../controllers/clientController';

const router = express.Router();

// Alle Routen erfordern Authentifizierung
router.use(authMiddleware);

// Client-Routen
router.get('/', getClients);
router.get('/recent', getRecentClients);
router.get('/:id', getClientById);
router.post('/', createClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

export default router; 