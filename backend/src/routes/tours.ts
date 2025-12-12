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
  getTourImage,
  getTourGalleryImage,
  generateTourImages,
  getTourImageGenerationStatus
} from '../controllers/tourController';
import { authMiddleware } from '../middleware/auth';
import { organizationMiddleware } from '../middleware/organization';

const router = Router();

// Öffentliche Route für Export (ohne Auth, für Website/Soziale Medien)
router.get('/export', exportTours);

// Alle anderen Routen mit Authentifizierung schützen
router.use(authMiddleware);
router.use(organizationMiddleware);

// Tour-Routen
router.get('/', getAllTours);
router.get('/:id', getTourById);
router.post('/', createTour);
router.put('/:id', updateTour);
router.put('/:id/toggle-active', toggleTourActive);
router.get('/:id/bookings', getTourBookings);

// Bild-Routen (GET vor POST, damit :id nicht mit /image kollidiert)
router.get('/:id/image', getTourImage);
router.get('/:id/gallery/:index', getTourGalleryImage);

// Bildgenerierungs-Routen (GET vor POST)
router.get('/:id/generate-images/status', getTourImageGenerationStatus);
router.post('/:id/generate-images', generateTourImages);

// Bild-Upload-Routen
router.post('/:id/image', tourImageUpload.single('image'), uploadTourImage);
router.post('/:id/gallery', tourImageUpload.single('image'), uploadTourGalleryImage);
router.delete('/:id/gallery/:imageIndex', deleteTourGalleryImage);

export default router;


