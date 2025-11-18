import { Router } from 'express';
import {
  getAllShiftTemplates,
  getShiftTemplateById,
  createShiftTemplate,
  updateShiftTemplate,
  deleteShiftTemplate
} from '../controllers/shiftTemplateController';
import {
  getAllAvailabilities,
  getAvailabilityById,
  createAvailability,
  updateAvailability,
  deleteAvailability
} from '../controllers/userAvailabilityController';
import {
  getAllShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
  generateShiftPlan
} from '../controllers/shiftController';
import {
  getAllSwapRequests,
  getSwapRequestById,
  createSwapRequest,
  approveSwapRequest,
  rejectSwapRequest
} from '../controllers/shiftSwapController';
import { authMiddleware } from '../middleware/auth';
import { organizationMiddleware } from '../middleware/organization';

const router = Router();

// Test-Endpunkt (vor Middleware, um zu prüfen, ob Route erreichbar ist)
router.get('/test', (req, res) => {
  res.json({ message: 'Shift-Route ist erreichbar!', timestamp: new Date().toISOString() });
});

// Alle Routen mit Authentifizierung schützen
router.use(authMiddleware);
router.use(organizationMiddleware);

// ShiftTemplate-Routen
router.get('/templates', getAllShiftTemplates);
router.get('/templates/:id', getShiftTemplateById);
router.post('/templates', createShiftTemplate);
router.put('/templates/:id', updateShiftTemplate);
router.delete('/templates/:id', deleteShiftTemplate);

// UserAvailability-Routen
router.get('/availabilities', getAllAvailabilities);
router.get('/availabilities/:id', getAvailabilityById);
router.post('/availabilities', createAvailability);
router.put('/availabilities/:id', updateAvailability);
router.delete('/availabilities/:id', deleteAvailability);

// Shift-Routen
// WICHTIG: GET / muss VOR GET /:id kommen, sonst wird / als :id interpretiert!
router.get('/', (req, res, next) => {
  console.log('[Shifts Route] GET / aufgerufen');
  console.log('[Shifts Route] Query:', req.query);
  console.log('[Shifts Route] OrganizationId:', req.organizationId);
  getAllShifts(req, res).catch(next);
});
router.get('/generate', generateShiftPlan); // Muss vor /:id stehen!
router.post('/generate', generateShiftPlan);
router.get('/:id', getShiftById);
router.post('/', createShift);
router.put('/:id', updateShift);
router.delete('/:id', deleteShift);

// ShiftSwap-Routen
router.get('/swaps', getAllSwapRequests);
router.get('/swaps/:id', getSwapRequestById);
router.post('/swaps', createSwapRequest);
router.put('/swaps/:id/approve', approveSwapRequest);
router.put('/swaps/:id/reject', rejectSwapRequest);

export default router;

