import express from 'express';
import { 
  getUserSavedFilters, 
  saveFilter, 
  deleteFilter,
  createFilterGroup,
  getFilterGroups,
  updateFilterGroup,
  deleteFilterGroup,
  addFilterToGroup,
  removeFilterFromGroup
} from '../controllers/savedFilterController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Middleware für die Authentifizierung
router.use(authMiddleware);

// Routen für gespeicherte Filter
router.get('/:tableId', getUserSavedFilters);
router.post('/', saveFilter);
router.delete('/:id', deleteFilter);

// Routen für Filter-Gruppen
router.post('/groups', createFilterGroup);
router.get('/groups/:tableId', getFilterGroups);
router.put('/groups/:id', updateFilterGroup);
router.delete('/groups/:id', deleteFilterGroup);

// Routen für Filter-zu-Gruppe-Zuordnung
router.post('/:filterId/group/:groupId', addFilterToGroup);
router.delete('/:filterId/group', removeFilterFromGroup);

export default router; 