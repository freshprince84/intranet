import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { 
  getCurrentOrganization,
  createOrganization,
  updateOrganization,
  createJoinRequest,
  getJoinRequests,
  processJoinRequest,
  searchOrganizations
} from '../controllers/organizationController';

const router = express.Router();

// Alle Routen erfordern Authentifizierung
router.use(authMiddleware);

// Organisation-Routen
router.get('/current', getCurrentOrganization);
router.post('/', createOrganization);
router.put('/current', updateOrganization);

// Join Request Routen
router.post('/join-request', createJoinRequest);
router.get('/join-requests', getJoinRequests);
router.patch('/join-requests/:id', processJoinRequest);

// Suche
router.get('/search', searchOrganizations);

export default router; 