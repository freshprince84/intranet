"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shiftTemplateController_1 = require("../controllers/shiftTemplateController");
const userAvailabilityController_1 = require("../controllers/userAvailabilityController");
const shiftController_1 = require("../controllers/shiftController");
const shiftSwapController_1 = require("../controllers/shiftSwapController");
const auth_1 = require("../middleware/auth");
const organization_1 = require("../middleware/organization");
const permissionMiddleware_1 = require("../middleware/permissionMiddleware");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// Test-Endpunkt (vor Middleware, um zu prüfen, ob Route erreichbar ist)
router.get('/test', (req, res) => {
    logger_1.logger.log('[Shifts Route] /test Endpunkt aufgerufen!');
    res.json({ message: 'Shift-Route ist erreichbar!', timestamp: new Date().toISOString() });
});
// Alle Routen mit Authentifizierung schützen
router.use((req, res, next) => {
    logger_1.logger.log('[Shifts Route] 🔐 Vor authMiddleware, Path:', req.path);
    next();
}, auth_1.authMiddleware);
router.use((req, res, next) => {
    logger_1.logger.log('[Shifts Route] 🔐 Nach authMiddleware, Path:', req.path, 'userId:', req.userId);
    next();
});
router.use((req, res, next) => {
    logger_1.logger.log('[Shifts Route] 🏢 Vor organizationMiddleware, Path:', req.path, 'userId:', req.userId);
    next();
}, organization_1.organizationMiddleware);
router.use((req, res, next) => {
    logger_1.logger.log('[Shifts Route] 🏢 Nach organizationMiddleware, Path:', req.path, 'organizationId:', req.organizationId);
    next();
});
// ShiftTemplate-Routen mit Permission-Checks
router.get('/templates', (0, permissionMiddleware_1.checkPermission)('shift_planning', 'read', 'tab'), shiftTemplateController_1.getAllShiftTemplates);
router.get('/templates/:id', (0, permissionMiddleware_1.checkPermission)('shift_planning', 'read', 'tab'), shiftTemplateController_1.getShiftTemplateById);
router.post('/templates', (0, permissionMiddleware_1.checkPermission)('shift_create', 'write', 'button'), shiftTemplateController_1.createShiftTemplate);
router.put('/templates/:id', (0, permissionMiddleware_1.checkPermission)('shift_edit', 'write', 'button'), shiftTemplateController_1.updateShiftTemplate);
router.delete('/templates/:id', (0, permissionMiddleware_1.checkPermission)('shift_delete', 'write', 'button'), shiftTemplateController_1.deleteShiftTemplate);
// UserAvailability-Routen mit Permission-Checks
router.get('/availabilities', (0, permissionMiddleware_1.checkPermission)('shift_planning', 'read', 'tab'), userAvailabilityController_1.getAllAvailabilities);
router.get('/availabilities/:id', (0, permissionMiddleware_1.checkPermission)('shift_planning', 'read', 'tab'), userAvailabilityController_1.getAvailabilityById);
router.post('/availabilities', (0, permissionMiddleware_1.checkPermission)('shift_create', 'write', 'button'), userAvailabilityController_1.createAvailability);
router.put('/availabilities/:id', (0, permissionMiddleware_1.checkPermission)('shift_edit', 'write', 'button'), userAvailabilityController_1.updateAvailability);
router.delete('/availabilities/:id', (0, permissionMiddleware_1.checkPermission)('shift_delete', 'write', 'button'), userAvailabilityController_1.deleteAvailability);
// Shift-Routen mit Permission-Checks
// WICHTIG: GET / muss VOR GET /:id kommen, sonst wird / als :id interpretiert!
router.get('/', (0, permissionMiddleware_1.checkPermission)('shift_planning', 'read', 'tab'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.logger.log('[Shifts Route] 📥 GET / aufgerufen');
    logger_1.logger.log('[Shifts Route] Query:', req.query);
    logger_1.logger.log('[Shifts Route] OrganizationId:', req.organizationId);
    logger_1.logger.log('[Shifts Route] Rufe getAllShifts auf...');
    try {
        yield (0, shiftController_1.getAllShifts)(req, res);
        logger_1.logger.log('[Shifts Route] ✅ getAllShifts erfolgreich');
    }
    catch (error) {
        logger_1.logger.error('[Shifts Route] ❌ Fehler in getAllShifts:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Schichten' });
    }
}));
router.get('/generate', (0, permissionMiddleware_1.checkPermission)('shift_planning', 'read', 'tab'), shiftController_1.generateShiftPlan); // Muss vor /:id stehen!
router.post('/generate', (0, permissionMiddleware_1.checkPermission)('shift_create', 'write', 'button'), shiftController_1.generateShiftPlan);
router.get('/:id', (0, permissionMiddleware_1.checkPermission)('shift_planning', 'read', 'tab'), shiftController_1.getShiftById);
router.post('/', (0, permissionMiddleware_1.checkPermission)('shift_create', 'write', 'button'), shiftController_1.createShift);
router.put('/:id', (0, permissionMiddleware_1.checkPermission)('shift_edit', 'write', 'button'), shiftController_1.updateShift);
router.delete('/:id', (0, permissionMiddleware_1.checkPermission)('shift_delete', 'write', 'button'), shiftController_1.deleteShift);
// ShiftSwap-Routen mit Permission-Checks
router.get('/swaps', (0, permissionMiddleware_1.checkPermission)('shift_planning', 'read', 'tab'), shiftSwapController_1.getAllSwapRequests);
router.get('/swaps/:id', (0, permissionMiddleware_1.checkPermission)('shift_planning', 'read', 'tab'), shiftSwapController_1.getSwapRequestById);
router.post('/swaps', (0, permissionMiddleware_1.checkPermission)('shift_swap_request', 'write', 'button'), shiftSwapController_1.createSwapRequest);
router.put('/swaps/:id/approve', shiftSwapController_1.approveSwapRequest);
router.put('/swaps/:id/reject', shiftSwapController_1.rejectSwapRequest);
exports.default = router;
//# sourceMappingURL=shifts.js.map