import { Router } from 'express';
import {
  getAllTours,
  getTourById,
  createTour,
  updateTour,
  toggleTourActive,
  getTourBookings,
  exportTours,
  tourImageUpload,
  uploadTourImage,
  uploadTourGalleryImage,
  deleteTourGalleryImage,
  deleteTourImage,
  getTourImage,
  getTourGalleryImage,
  generateTourImages,
  getTourImageGenerationStatus
} from '../controllers/tourController';
import { authMiddleware } from '../middleware/auth';
import { organizationMiddleware } from '../middleware/organization';
import { checkPermission } from '../middleware/permissionMiddleware';

const router = Router();

// Öffentliche Route für Export (ohne Auth, für Website/Soziale Medien)
router.get('/export', exportTours);

// Öffentliche Routen für Bildabrufe ohne Authentifizierung (wie bei Requests/Tasks)
// WICHTIG: Muss VOR authMiddleware stehen, damit <img> Tags ohne Auth funktionieren
router.get('/:id/image', getTourImage);
router.get('/:id/gallery/:index', getTourGalleryImage);

// Alle anderen Routen mit Authentifizierung schützen
router.use(authMiddleware);
router.use(organizationMiddleware);

// Tour-Routen mit Permission-Checks
router.get('/', checkPermission('tour_management', 'read', 'page'), getAllTours);
router.get('/:id', checkPermission('tour_management', 'read', 'page'), getTourById);
router.post('/', checkPermission('tour_create', 'write', 'button'), createTour);
router.put('/:id', checkPermission('tour_edit', 'write', 'button'), updateTour);
router.put('/:id/toggle-active', checkPermission('tour_edit', 'write', 'button'), toggleTourActive);
router.get('/:id/bookings', checkPermission('tour_bookings', 'read', 'tab'), getTourBookings);

// Bildgenerierungs-Routen (GET vor POST)
router.get('/:id/generate-images/status', checkPermission('tour_management', 'read', 'page'), getTourImageGenerationStatus);
router.post('/:id/generate-images', checkPermission('tour_edit', 'write', 'button'), generateTourImages);

// Bild-Upload-Routen
router.post('/:id/image', checkPermission('tour_edit', 'write', 'button'), tourImageUpload.single('image'), uploadTourImage);
router.delete('/:id/image', checkPermission('tour_edit', 'write', 'button'), deleteTourImage);
router.post('/:id/gallery', checkPermission('tour_edit', 'write', 'button'), tourImageUpload.single('image'), uploadTourGalleryImage);
router.delete('/:id/gallery/:imageIndex', checkPermission('tour_edit', 'write', 'button'), deleteTourGalleryImage);

export default router;


