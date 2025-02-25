import { Router } from 'express';
import { getTest, getAllBranches } from '../controllers/branchController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Debug-Route ohne Auth
router.get('/debug', (_req, res) => {
    res.json({ message: 'Die Route /api/branches/debug funktioniert!' });
});

// Test-Route ohne Auth mit Controller
router.get('/test', getTest);

// Alle Niederlassungen abrufen - ohne Auth zum Testen
router.get('/', getAllBranches);

export default router; 