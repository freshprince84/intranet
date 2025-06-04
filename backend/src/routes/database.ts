import express from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  resetTable,
  getResetableTables,
  getDatabaseLogs
} from '../controllers/databaseController';

const router = express.Router();

// Alle Routen erfordern Authentifizierung
router.use(authMiddleware);

// Database Management Routes
router.get('/tables', getResetableTables);
router.post('/reset-table', resetTable);
router.get('/logs', getDatabaseLogs);

export default router; 