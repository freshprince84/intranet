import express from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  resetTable,
  getResetableTables,
  getDatabaseLogs,
  deleteDemoClients
} from '../controllers/databaseController';

const router = express.Router();

// Alle Routen erfordern Authentifizierung
router.use(authMiddleware);

// Database Management Routes
router.get('/tables', getResetableTables);
router.post('/reset-table', resetTable);
router.post('/delete-demo-clients', deleteDemoClients);
router.get('/logs', getDatabaseLogs);

export default router; 