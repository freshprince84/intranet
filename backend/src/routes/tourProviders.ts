import { Router } from 'express';
import {
  getAllTourProviders,
  getTourProviderById,
  createTourProvider,
  updateTourProvider,
  deleteTourProvider
} from '../controllers/tourProviderController';
import { authMiddleware } from '../middleware/auth';
import { organizationMiddleware } from '../middleware/organization';

const router = Router();

// Alle Routen mit Authentifizierung schützen
router.use(authMiddleware);
router.use(organizationMiddleware);

// Tour-Provider-Routen
router.get('/', getAllTourProviders);
router.get('/:id', getTourProviderById);
router.post('/', createTourProvider);
router.put('/:id', updateTourProvider);
router.delete('/:id', deleteTourProvider);

export default router;

