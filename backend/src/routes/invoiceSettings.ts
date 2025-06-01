import express from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getInvoiceSettings,
  createOrUpdateInvoiceSettings,
  getNextInvoiceNumber
} from '../controllers/invoiceSettingsController';

const router = express.Router();

// Alle Routen erfordern Authentifizierung
router.use(authMiddleware);

// Invoice Settings Routen
router.get('/', getInvoiceSettings);
router.post('/', createOrUpdateInvoiceSettings);
router.put('/', createOrUpdateInvoiceSettings);
router.get('/next-number', getNextInvoiceNumber);

export default router; 