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
import { checkPermission } from '../middleware/permissionMiddleware';
import { logger } from '../utils/logger';

const router = Router();

// Test-Endpunkt (vor Middleware, um zu prüfen, ob Route erreichbar ist)
router.get('/test', (req, res) => {
  logger.log('[Shifts Route] /test Endpunkt aufgerufen!');
  res.json({ message: 'Shift-Route ist erreichbar!', timestamp: new Date().toISOString() });
});

// Alle Routen mit Authentifizierung schützen
router.use((req, res, next) => {
  logger.log('[Shifts Route] 🔐 Vor authMiddleware, Path:', req.path);
  next();
}, authMiddleware);
router.use((req, res, next) => {
  logger.log('[Shifts Route] 🔐 Nach authMiddleware, Path:', req.path, 'userId:', req.userId);
  next();
});
router.use((req, res, next) => {
  logger.log('[Shifts Route] 🏢 Vor organizationMiddleware, Path:', req.path, 'userId:', req.userId);
  next();
}, organizationMiddleware);
router.use((req, res, next) => {
  logger.log('[Shifts Route] 🏢 Nach organizationMiddleware, Path:', req.path, 'organizationId:', req.organizationId);
  next();
});

// ShiftTemplate-Routen mit Permission-Checks
router.get('/templates', checkPermission('shift_planning', 'read', 'tab'), getAllShiftTemplates);
router.get('/templates/:id', checkPermission('shift_planning', 'read', 'tab'), getShiftTemplateById);
router.post('/templates', checkPermission('shift_create', 'write', 'button'), createShiftTemplate);
router.put('/templates/:id', checkPermission('shift_edit', 'write', 'button'), updateShiftTemplate);
router.delete('/templates/:id', checkPermission('shift_delete', 'write', 'button'), deleteShiftTemplate);

// UserAvailability-Routen mit Permission-Checks
router.get('/availabilities', checkPermission('shift_planning', 'read', 'tab'), getAllAvailabilities);
router.get('/availabilities/:id', checkPermission('shift_planning', 'read', 'tab'), getAvailabilityById);
router.post('/availabilities', checkPermission('shift_create', 'write', 'button'), createAvailability);
router.put('/availabilities/:id', checkPermission('shift_edit', 'write', 'button'), updateAvailability);
router.delete('/availabilities/:id', checkPermission('shift_delete', 'write', 'button'), deleteAvailability);

// Shift-Routen mit Permission-Checks
// WICHTIG: GET / muss VOR GET /:id kommen, sonst wird / als :id interpretiert!
router.get('/', checkPermission('shift_planning', 'read', 'tab'), async (req, res) => {
  logger.log('[Shifts Route] 📥 GET / aufgerufen');
  logger.log('[Shifts Route] Query:', req.query);
  logger.log('[Shifts Route] OrganizationId:', req.organizationId);
  logger.log('[Shifts Route] Rufe getAllShifts auf...');
  try {
    await getAllShifts(req, res);
    logger.log('[Shifts Route] ✅ getAllShifts erfolgreich');
  } catch (error) {
    logger.error('[Shifts Route] ❌ Fehler in getAllShifts:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Schichten' });
  }
});
router.get('/generate', checkPermission('shift_planning', 'read', 'tab'), generateShiftPlan); // Muss vor /:id stehen!
router.post('/generate', checkPermission('shift_create', 'write', 'button'), generateShiftPlan);
router.get('/:id', checkPermission('shift_planning', 'read', 'tab'), getShiftById);
router.post('/', checkPermission('shift_create', 'write', 'button'), createShift);
router.put('/:id', checkPermission('shift_edit', 'write', 'button'), updateShift);
router.delete('/:id', checkPermission('shift_delete', 'write', 'button'), deleteShift);

// ShiftSwap-Routen mit Permission-Checks
router.get('/swaps', checkPermission('shift_planning', 'read', 'tab'), getAllSwapRequests);
router.get('/swaps/:id', checkPermission('shift_planning', 'read', 'tab'), getSwapRequestById);
router.post('/swaps', checkPermission('shift_swap_request', 'write', 'button'), createSwapRequest);
router.put('/swaps/:id/approve', approveSwapRequest);
router.put('/swaps/:id/reject', rejectSwapRequest);

export default router;

