"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tourController_1 = require("../controllers/tourController");
const auth_1 = require("../middleware/auth");
const organization_1 = require("../middleware/organization");
const permissionMiddleware_1 = require("../middleware/permissionMiddleware");
const router = (0, express_1.Router)();
// Öffentliche Route für Export (ohne Auth, für Website/Soziale Medien)
router.get('/export', tourController_1.exportTours);
// Öffentliche Routen für Bildabrufe ohne Authentifizierung (wie bei Requests/Tasks)
// WICHTIG: Muss VOR authMiddleware stehen, damit <img> Tags ohne Auth funktionieren
router.get('/:id/image', tourController_1.getTourImage);
router.get('/:id/gallery/:index', tourController_1.getTourGalleryImage);
// Alle anderen Routen mit Authentifizierung schützen
router.use(auth_1.authMiddleware);
router.use(organization_1.organizationMiddleware);
// Tour-Routen mit Permission-Checks
router.get('/', (0, permissionMiddleware_1.checkPermission)('tour_management', 'read', 'page'), tourController_1.getAllTours);
router.get('/:id', (0, permissionMiddleware_1.checkPermission)('tour_management', 'read', 'page'), tourController_1.getTourById);
router.post('/', (0, permissionMiddleware_1.checkPermission)('tour_create', 'write', 'button'), tourController_1.createTour);
router.put('/:id', (0, permissionMiddleware_1.checkPermission)('tour_edit', 'write', 'button'), tourController_1.updateTour);
router.put('/:id/toggle-active', (0, permissionMiddleware_1.checkPermission)('tour_edit', 'write', 'button'), tourController_1.toggleTourActive);
router.get('/:id/bookings', (0, permissionMiddleware_1.checkPermission)('tour_bookings', 'read', 'tab'), tourController_1.getTourBookings);
// Bildgenerierungs-Routen (GET vor POST)
router.get('/:id/generate-images/status', (0, permissionMiddleware_1.checkPermission)('tour_management', 'read', 'page'), tourController_1.getTourImageGenerationStatus);
router.post('/:id/generate-images', (0, permissionMiddleware_1.checkPermission)('tour_edit', 'write', 'button'), tourController_1.generateTourImages);
// Bild-Upload-Routen
router.post('/:id/image', (0, permissionMiddleware_1.checkPermission)('tour_edit', 'write', 'button'), tourController_1.tourImageUpload.single('image'), tourController_1.uploadTourImage);
router.delete('/:id/image', (0, permissionMiddleware_1.checkPermission)('tour_edit', 'write', 'button'), tourController_1.deleteTourImage);
router.post('/:id/gallery', (0, permissionMiddleware_1.checkPermission)('tour_edit', 'write', 'button'), tourController_1.tourImageUpload.single('image'), tourController_1.uploadTourGalleryImage);
router.delete('/:id/gallery/:imageIndex', (0, permissionMiddleware_1.checkPermission)('tour_edit', 'write', 'button'), tourController_1.deleteTourGalleryImage);
exports.default = router;
//# sourceMappingURL=tours.js.map