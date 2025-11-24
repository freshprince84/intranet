import { Router } from 'express';
import {
  getAllTourBookings,
  getTourBookingById,
  createTourBooking,
  updateTourBooking,
  deleteTourBooking,
  cancelTourBooking,
  completeTourBooking,
  getUserTourBookings,
  getUserCommissions
} from '../controllers/tourBookingController';
import { authMiddleware } from '../middleware/auth';
import { organizationMiddleware } from '../middleware/organization';

const router = Router();

// Alle Routen mit Authentifizierung schützen
router.use(authMiddleware);
router.use(organizationMiddleware);

// Tour-Booking-Routen
router.get('/', getAllTourBookings);
router.get('/:id', getTourBookingById);
router.post('/', createTourBooking);
router.put('/:id', updateTourBooking);
router.delete('/:id', deleteTourBooking);
router.post('/:id/cancel', cancelTourBooking);
router.post('/:id/complete', completeTourBooking);
router.get('/user/:userId', getUserTourBookings);
router.get('/user/:userId/commissions', getUserCommissions);

export default router;

