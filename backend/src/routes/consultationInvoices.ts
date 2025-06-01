import express from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  createInvoiceFromConsultations,
  getInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  generateInvoicePDFEndpoint,
  markAsPaid,
  cancelInvoice
} from '../controllers/consultationInvoiceController';

const router = express.Router();

// Alle Routen erfordern Authentifizierung
router.use(authMiddleware);

// Consultation Invoice Routen
router.get('/', getInvoices);
router.post('/create-from-consultations', createInvoiceFromConsultations);
router.get('/:id', getInvoiceById);
router.patch('/:id/status', updateInvoiceStatus);
router.get('/:id/pdf', generateInvoicePDFEndpoint);
router.post('/:id/mark-paid', markAsPaid);
router.delete('/:id', cancelInvoice);

export default router; 