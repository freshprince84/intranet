import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { organizationMiddleware } from '../middleware/organization';
import * as emailReservationController from '../controllers/emailReservationController';

const router = express.Router();

// Alle Routen erfordern Authentifizierung und Organisation
router.use(authMiddleware);
router.use(organizationMiddleware);

/**
 * POST /api/email-reservations/check
 * Manueller Email-Check (für Tests)
 */
router.post('/check', emailReservationController.checkEmails);

/**
 * GET /api/email-reservations/status
 * Status der Email-Integration
 */
router.get('/status', emailReservationController.getStatus);

/**
 * POST /api/email-reservations/parse
 * Test-Parsing einer Email (Body: emailContent)
 */
router.post('/parse', emailReservationController.parseEmail);

/**
 * POST /api/email-reservations/trigger-scheduler
 * Triggert manuell den Scheduler (für Tests)
 */
router.post('/trigger-scheduler', emailReservationController.triggerScheduler);

export default router;

