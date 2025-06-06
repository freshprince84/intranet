import { Router } from 'express';
import { 
  getAllOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationStats
} from '../controllers/organizationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Alle Routen benötigen Authentifizierung
router.use(authMiddleware);

// GET /api/organizations - Alle Organisationen abrufen
router.get('/', getAllOrganizations);

// GET /api/organizations/:id - Organisation nach ID abrufen
router.get('/:id', getOrganizationById);

// GET /api/organizations/:id/stats - Organisation-Statistiken abrufen
router.get('/:id/stats', getOrganizationStats);

// POST /api/organizations - Neue Organisation erstellen
router.post('/', createOrganization);

// PUT /api/organizations/:id - Organisation aktualisieren
router.put('/:id', updateOrganization);

// DELETE /api/organizations/:id - Organisation löschen
router.delete('/:id', deleteOrganization);

export default router; 