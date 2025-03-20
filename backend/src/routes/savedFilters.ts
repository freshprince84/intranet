import express from 'express';
import { getUserSavedFilters, saveFilter, deleteFilter } from '../controllers/savedFilterController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Middleware für die Authentifizierung
router.use(authMiddleware);

// Routen für gespeicherte Filter
router.get('/:tableId', getUserSavedFilters);
router.post('/', saveFilter);
router.delete('/:id', deleteFilter);

export default router; 