"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shiftTemplateController_1 = require("../controllers/shiftTemplateController");
const userAvailabilityController_1 = require("../controllers/userAvailabilityController");
const shiftController_1 = require("../controllers/shiftController");
const shiftSwapController_1 = require("../controllers/shiftSwapController");
const auth_1 = require("../middleware/auth");
const organization_1 = require("../middleware/organization");
const router = (0, express_1.Router)();
// Test-Endpunkt (vor Middleware, um zu prüfen, ob Route erreichbar ist)
router.get('/test', (req, res) => {
    res.json({ message: 'Shift-Route ist erreichbar!', timestamp: new Date().toISOString() });
});
// Alle Routen mit Authentifizierung schützen
router.use(auth_1.authMiddleware);
router.use((req, res, next) => {
    console.log('[Shifts Route] Vor organizationMiddleware');
    console.log('[Shifts Route] userId:', req.userId);
    next();
}, organization_1.organizationMiddleware);
router.use((req, res, next) => {
    console.log('[Shifts Route] Nach organizationMiddleware');
    console.log('[Shifts Route] organizationId:', req.organizationId);
    next();
});
// ShiftTemplate-Routen
router.get('/templates', shiftTemplateController_1.getAllShiftTemplates);
router.get('/templates/:id', shiftTemplateController_1.getShiftTemplateById);
router.post('/templates', shiftTemplateController_1.createShiftTemplate);
router.put('/templates/:id', shiftTemplateController_1.updateShiftTemplate);
router.delete('/templates/:id', shiftTemplateController_1.deleteShiftTemplate);
// UserAvailability-Routen
router.get('/availabilities', userAvailabilityController_1.getAllAvailabilities);
router.get('/availabilities/:id', userAvailabilityController_1.getAvailabilityById);
router.post('/availabilities', userAvailabilityController_1.createAvailability);
router.put('/availabilities/:id', userAvailabilityController_1.updateAvailability);
router.delete('/availabilities/:id', userAvailabilityController_1.deleteAvailability);
// Shift-Routen
// WICHTIG: GET / muss VOR GET /:id kommen, sonst wird / als :id interpretiert!
router.get('/', (req, res, next) => {
    console.log('[Shifts Route] GET / aufgerufen');
    console.log('[Shifts Route] Query:', req.query);
    console.log('[Shifts Route] OrganizationId:', req.organizationId);
    (0, shiftController_1.getAllShifts)(req, res).catch(next);
});
router.get('/generate', shiftController_1.generateShiftPlan); // Muss vor /:id stehen!
router.post('/generate', shiftController_1.generateShiftPlan);
router.get('/:id', shiftController_1.getShiftById);
router.post('/', shiftController_1.createShift);
router.put('/:id', shiftController_1.updateShift);
router.delete('/:id', shiftController_1.deleteShift);
// ShiftSwap-Routen
router.get('/swaps', shiftSwapController_1.getAllSwapRequests);
router.get('/swaps/:id', shiftSwapController_1.getSwapRequestById);
router.post('/swaps', shiftSwapController_1.createSwapRequest);
router.put('/swaps/:id/approve', shiftSwapController_1.approveSwapRequest);
router.put('/swaps/:id/reject', shiftSwapController_1.rejectSwapRequest);
exports.default = router;
//# sourceMappingURL=shifts.js.map