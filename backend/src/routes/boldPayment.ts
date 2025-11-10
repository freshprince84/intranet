import express from 'express';
import { handleWebhook } from '../controllers/boldPaymentController';

const router = express.Router();

/**
 * Bold Payment Webhook Route
 * 
 * WICHTIG: Kein authMiddleware, da von Bold Payment aufgerufen
 * Aber sollte durch Webhook-Secret geschützt werden
 */
router.post('/webhook', handleWebhook);

export default router;

