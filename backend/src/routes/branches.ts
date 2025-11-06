import { Router } from 'express';
import { getTest, getAllBranches } from '../controllers/branchController';
import { authMiddleware } from '../middleware/auth';
import { organizationMiddleware } from '../middleware/organization';

const router = Router();

// Debug-Route ohne Auth
router.get('/debug', (_req, res) => {
    res.json({ message: 'Die Route /api/branches/debug funktioniert!' });
});

// Test-Route ohne Auth mit Controller
router.get('/test', getTest);

// Alle Routen erfordern Authentifizierung und Organisation-Kontext
router.use(authMiddleware);
router.use(organizationMiddleware);

// Alle Niederlassungen abrufen - nur für authentifizierte User der Organisation
router.get('/', getAllBranches);

export default router; 