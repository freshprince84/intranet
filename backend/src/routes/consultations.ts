import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { organizationMiddleware } from '../middleware/organization';
import {
  startConsultation,
  stopConsultation,
  getConsultations,
  linkTaskToConsultation,
  createTaskForConsultation,
  updateConsultationNotes,
  deleteConsultation
} from '../controllers/consultationController';

const router = express.Router();

// Alle Routen erfordern Authentifizierung
router.use(authMiddleware);
router.use(organizationMiddleware);

// Consultation-Routen
router.post('/start', startConsultation);
router.post('/stop', stopConsultation);
router.get('/', getConsultations);
router.post('/:id/link-task', linkTaskToConsultation);
router.post('/:id/create-task', createTaskForConsultation);
router.patch('/:id/notes', updateConsultationNotes);
router.delete('/:id', deleteConsultation);

export default router; 