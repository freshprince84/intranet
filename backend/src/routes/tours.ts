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
  deleteTourGalleryImage
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

// Bild-Upload-Routen
router.post('/:id/image', tourImageUpload.single('image'), uploadTourImage);
router.post('/:id/gallery', tourImageUpload.single('image'), uploadTourGalleryImage);
router.delete('/:id/gallery/:imageIndex', deleteTourGalleryImage);

export default router;


