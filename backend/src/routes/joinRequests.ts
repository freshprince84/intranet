import { Router } from 'express';
import { 
  createJoinRequest,
  getJoinRequestsForOrganization,
  processJoinRequest
} from '../controllers/joinRequestController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Alle Routen benötigen Authentifizierung
router.use(authMiddleware);

// POST /api/join-requests - Neue Beitrittsanfrage erstellen
router.post('/', createJoinRequest);

// GET /api/join-requests - Beitrittsanfragen für aktuelle Organisation abrufen
router.get('/', getJoinRequestsForOrganization);

// PUT /api/join-requests/:id/process - Beitrittsanfrage bearbeiten (genehmigen/ablehnen)
router.put('/:id/process', processJoinRequest);

export default router; 