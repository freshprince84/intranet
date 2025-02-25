import express from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  startWorktime,
  stopWorktime,
  getWorktimes,
  updateWorktime,
  deleteWorktime,
  getWorktimeStats,
  exportWorktimes,
  getActiveWorktime
} from '../controllers/worktimeController';

const router = express.Router();

// Alle Routen erfordern Authentifizierung
router.use(authMiddleware);

// Spezifische Routen zuerst definieren
router.post('/start', startWorktime);
router.post('/stop', stopWorktime);
router.get('/stats', getWorktimeStats);
router.get('/export', exportWorktimes);
router.get('/active', getActiveWorktime);

// Dann die allgemeinen und parametrisierten Routen
router.get('/', getWorktimes);
router.put('/:id', updateWorktime);
router.delete('/:id', deleteWorktime);

export default router; 