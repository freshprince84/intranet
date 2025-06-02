import express from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getMonthlyReports,
  getMonthlyReportById,
  generateMonthlyReport,
  generateAutomaticMonthlyReport,
  updateReportStatus,
  deleteMonthlyReport,
  checkUnbilledConsultations,
  generateMonthlyReportPDF
} from '../controllers/monthlyConsultationReportController';

const router = express.Router();

// Alle Routen erfordern Authentifizierung
router.use(authMiddleware);

// Monthly Report Routen
router.get('/', getMonthlyReports);
router.get('/check-unbilled', checkUnbilledConsultations);
router.get('/:id', getMonthlyReportById);
router.get('/:id/pdf', generateMonthlyReportPDF);
router.post('/generate', generateMonthlyReport);
router.post('/generate-automatic', generateAutomaticMonthlyReport);
router.patch('/:id/status', updateReportStatus);
router.delete('/:id', deleteMonthlyReport);

export default router; 