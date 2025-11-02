import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { organizationMiddleware } from '../middleware/organization';
import { 
  getCurrentOrganization,
  createOrganization,
  updateOrganization,
  createJoinRequest,
  getJoinRequests,
  processJoinRequest,
  searchOrganizations,
  getOrganizationStats,
  getOrganizationLanguage,
  updateOrganizationLanguage
} from '../controllers/organizationController';

const router = express.Router();

// Alle Routen erfordern Authentifizierung
router.use(authMiddleware);
router.use(organizationMiddleware);

// Organisation-Routen
router.get('/current', getCurrentOrganization);
router.get('/current/stats', getOrganizationStats);
router.get('/current/language', getOrganizationLanguage);
router.put('/current/language', updateOrganizationLanguage);
router.post('/', createOrganization);
router.put('/current', updateOrganization);

// Join Request Routen
router.post('/join-request', createJoinRequest);
router.get('/join-requests', getJoinRequests);
router.patch('/join-requests/:id', processJoinRequest);

// Suche
router.get('/search', searchOrganizations);

export default router; 