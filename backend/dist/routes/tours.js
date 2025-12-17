"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tourController_1 = require("../controllers/tourController");
const auth_1 = require("../middleware/auth");
const organization_1 = require("../middleware/organization");
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
// Tour-Routen
router.get('/', tourController_1.getAllTours);
router.get('/:id', tourController_1.getTourById);
router.post('/', tourController_1.createTour);
router.put('/:id', tourController_1.updateTour);
router.put('/:id/toggle-active', tourController_1.toggleTourActive);
router.get('/:id/bookings', tourController_1.getTourBookings);
// Bildgenerierungs-Routen (GET vor POST)
router.get('/:id/generate-images/status', tourController_1.getTourImageGenerationStatus);
router.post('/:id/generate-images', tourController_1.generateTourImages);
// Bild-Upload-Routen
router.post('/:id/image', tourController_1.tourImageUpload.single('image'), tourController_1.uploadTourImage);
router.delete('/:id/image', tourController_1.deleteTourImage);
router.post('/:id/gallery', tourController_1.tourImageUpload.single('image'), tourController_1.uploadTourGalleryImage);
router.delete('/:id/gallery/:imageIndex', tourController_1.deleteTourGalleryImage);
exports.default = router;
//# sourceMappingURL=tours.js.map