import { Router } from 'express';
import {
  createTourReservation,
  updateTourReservation,
  deleteTourReservation,
  getTourReservationsByReservation,
  getTourReservationsByBooking
} from '../controllers/tourReservationController';
import { authMiddleware } from '../middleware/auth';
import { organizationMiddleware } from '../middleware/organization';

const router = Router();

// Alle Routen mit Authentifizierung schützen
router.use(authMiddleware);
router.use(organizationMiddleware);

// Tour-Reservation-Routen
router.post('/', createTourReservation);
router.put('/:id', updateTourReservation);
router.delete('/:id', deleteTourReservation);
router.get('/reservation/:reservationId', getTourReservationsByReservation);
router.get('/booking/:bookingId', getTourReservationsByBooking);

export default router;


